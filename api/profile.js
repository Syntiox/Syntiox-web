import fs from 'fs';
import path from 'path';
import https from 'https';

const REDIS_URL = process.env.REDIS_REST_URL;
const REDIS_TOKEN = process.env.REDIS_REST_TOKEN;
const RATE_LIMIT_WINDOW_SECS = 120; // 2 minutes
const MAX_REQUESTS_PER_WINDOW = 20; // Max 20 requests per 2 minutes per IP
const PROFILE_CACHE_TTL_SECS = 30 * 24 * 60 * 60; // 30 days sliding expiration

// Helper to convert Firestore REST values to plain JS objects
function parseFirestoreValue(val) {
  if (!val || typeof val !== 'object') return null;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(parseFirestoreValue);
  }
  if ('mapValue' in val) {
    const out = {};
    const fields = val.mapValue.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = parseFirestoreValue(v);
    }
    return out;
  }
  return null;
}

function parseFirestoreFields(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields || {})) {
    out[k] = parseFirestoreValue(v);
  }
  return out;
}

// Distributed rate limiting via Upstash Redis pipeline
async function isRateLimited(ip) {
  if (!REDIS_URL || !REDIS_TOKEN) return false;
  try {
    const key = `ratelimit:${ip}`;
    const res = await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, RATE_LIMIT_WINDOW_SECS, 'NX'],
      ]),
    });
    if (!res.ok) return false;
    const data = await res.json();
    const count = data[0]?.result || 1;
    return count > MAX_REQUESTS_PER_WINDOW;
  } catch {
    return false;
  }
}

// Fetch cached full profile from Upstash Redis and renew sliding 30-day TTL
async function getCachedProfile(cacheKey) {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  try {
    const res = await fetch(REDIS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', cacheKey]),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.result) return null;
    const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;

    // Detect and discard old metadata-only cache format
    if (parsed && !parsed.appearance && !parsed.links && !parsed.uid) {
      return null;
    }

    // Renew 30-day sliding TTL on access
    fetch(REDIS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['EXPIRE', cacheKey, PROFILE_CACHE_TTL_SECS]),
    }).catch(() => {});

    return parsed;
  } catch {
    return null;
  }
}

// Store full profile in Upstash Redis with 30-day TTL
async function setCachedProfile(cacheKey, profileData) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  try {
    fetch(REDIS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SET', cacheKey, JSON.stringify(profileData), 'EX', PROFILE_CACHE_TTL_SECS]),
    }).catch(() => {});
  } catch {}
}

function fetchHttpsJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Syntiox-Serverless/1.0' } }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        if (response.statusCode === 200) {
          try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
        } else {
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

export default async function handler(req, res) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection?.remoteAddress || 'unknown';

  // Atomic Redis Rate Limit
  if (await isRateLimited(ip)) {
    res.setHeader('Retry-After', '120');
    return res.status(429).send("Too Many Requests - Please try again later");
  }

  const handle = req.query.handle;
  if (!handle) {
    return res.status(400).send("No handle provided");
  }

  const cleanHandle = handle.toLowerCase().trim();
  const cacheKey = `profile:${cleanHandle}`;

  try {
    const htmlPath = path.join(process.cwd(), 'profile.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    // 1. Check Redis Cache First for Complete User Profile
    let userData = await getCachedProfile(cacheKey);

    // 2. Cache Miss: Fetch from Firestore REST API
    if (!userData) {
      const usernameDoc = await fetchHttpsJson(`https://firestore.googleapis.com/v1/projects/syntiox-services/databases/(default)/documents/usernames/${encodeURIComponent(cleanHandle)}`);

      if (!usernameDoc || !usernameDoc.fields || !usernameDoc.fields.uid) {
        // User not registered
        const errorState = { code: '404', msg: `@${cleanHandle} is not registered on Syntiox.` };
        const scriptInjection = `<script>window.__INITIAL_ERROR__ = ${JSON.stringify(errorState).replace(/</g, '\\u003c')};</script>`;
        html = html.replace('</head>', `${scriptInjection}\n</head>`);
        res.setHeader('Content-Type', 'text/html');
        return res.status(404).send(html);
      }

      const uid = usernameDoc.fields.uid.stringValue;
      const userDoc = await fetchHttpsJson(`https://firestore.googleapis.com/v1/projects/syntiox-services/databases/(default)/documents/users/${uid}`);

      if (userDoc && userDoc.fields) {
        userData = parseFirestoreFields(userDoc.fields);
        userData.uid = uid;

        // Check admin collection
        try {
          const adminDoc = await fetchHttpsJson(`https://firestore.googleapis.com/v1/projects/syntiox-services/databases/(default)/documents/admin/${uid}`);
          if (adminDoc && adminDoc.fields && adminDoc.fields.isAdmin && adminDoc.fields.isAdmin.booleanValue === true) {
            userData.isAdmin = true;
          }
        } catch (_) {}

        // Store Full Profile in Redis (30-day sliding TTL)
        await setCachedProfile(cacheKey, userData);
      }
    }

    // 3. Handle Private Profile (Prevent leaking private data in page source or meta tags)
    if (userData && userData.isPublic === false) {
      const errorState = { code: 'Private', msg: 'This profile has been set to private by its owner.' };
      const scriptInjection = `<script>window.__INITIAL_ERROR__ = ${JSON.stringify(errorState).replace(/</g, '\\u003c')};</script>`;
      const metaTags = `
  <title>Private Profile | Syntiox</title>
  <meta name="description" content="This profile has been set to private by its owner.">
  <meta property="og:type" content="profile">
  <meta property="og:url" content="https://syntiox.top/u/${cleanHandle}">
  <meta property="og:title" content="Private Profile | Syntiox">
  <meta property="og:description" content="This profile has been set to private by its owner.">
  <meta property="og:image" content="https://syntiox.top/assets/image/logo.png">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:url" content="https://syntiox.top/u/${cleanHandle}">
  <meta name="twitter:title" content="Private Profile | Syntiox">
  <meta name="twitter:description" content="This profile has been set to private by its owner.">
  <meta name="twitter:image" content="https://syntiox.top/assets/image/logo.png">
`;
      html = html.replace(/<title>.*?<\/title>/gi, '');
      html = html.replace(/<meta\\s+name=["']description["'][^>]*>/gi, '');
      html = html.replace(/<meta\\s+(?:property|name)=["'](?:og|twitter):[^"']*["'][^>]*>/gi, '');
      html = html.replace('</head>', `${metaTags}\n  ${scriptInjection}\n</head>`);

      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
      return res.status(200).send(html);
    }

    // 4. Inject Full Profile Data & Dynamic Meta Tags
    if (userData) {
      const name = userData.displayName || userData.name || userData.username || cleanHandle;
      const bio = userData.bio || `View ${name}'s profile on Syntiox.`;
      const title = `${name} | Syntiox`;

      const rawPhoto = userData.photoURL || userData.avatar || userData.avatarUrl || '';
      const showPhoto = userData.appearance?.showMetadataPhoto !== false;
      const ogPhoto = (showPhoto && rawPhoto) ? rawPhoto : 'https://syntiox.top/assets/image/logo.png';
      const cardType = (showPhoto && rawPhoto) ? 'summary_large_image' : 'summary';

      const metaTags = `
  <title>${title}</title>
  <meta name="description" content="${bio}">
  
  <!-- Open Graph / WhatsApp / Facebook -->
  <meta property="og:type" content="profile">
  <meta property="og:url" content="https://syntiox.top/u/${cleanHandle}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${bio}">
  <meta property="og:image" content="${ogPhoto}">

  <!-- Twitter -->
  <meta name="twitter:card" content="${cardType}">
  <meta name="twitter:url" content="https://syntiox.top/u/${cleanHandle}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${bio}">
  <meta name="twitter:image" content="${ogPhoto}">
`;

      const scriptInjection = `<script>window.__INITIAL_PROFILE__ = ${JSON.stringify(userData).replace(/</g, '\\u003c')};</script>`;

      html = html.replace(/<title>.*?<\/title>/gi, '');
      html = html.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');
      html = html.replace(/<meta\s+(?:property|name)=["'](?:og|twitter):[^"']*["'][^>]*>/gi, '');

      html = html.replace('</head>', `${metaTags}\n  ${scriptInjection}\n</head>`);
    }

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).send(html);

  } catch (error) {
    console.error('Error in profile handler:', error);
    try {
      const htmlPath = path.join(process.cwd(), 'profile.html');
      const html = fs.readFileSync(htmlPath, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    } catch (e) {
      return res.status(500).send('Internal Server Error');
    }
  }
}
