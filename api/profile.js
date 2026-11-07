import fs from 'fs';
import path from 'path';
import https from 'https';

const REDIS_URL = process.env.REDIS_REST_URL;
const REDIS_TOKEN = process.env.REDIS_REST_TOKEN;
const RATE_LIMIT_WINDOW_SECS = 60; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // Max 60 requests per minute per IP
const PROFILE_CACHE_TTL_SECS = 30 * 24 * 60 * 60; // 30 days sliding expiration

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

// Fetch cached profile from Upstash Redis and renew sliding 30-day TTL
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

    // Renew 30-day sliding TTL on view
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

// Store profile in Upstash Redis with 30-day TTL
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

export default async function handler(req, res) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection?.remoteAddress || 'unknown';

  // Atomic Redis Rate Limit
  if (await isRateLimited(ip)) {
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

    // 1. Check Redis Cache First
    let profileMeta = await getCachedProfile(cacheKey);

    // 2. Cache Miss: Fetch from Firestore
    if (!profileMeta) {
      const usernameRes = await new Promise((resolve, reject) => {
        https.get(`https://firestore.googleapis.com/v1/projects/syntiox-services/databases/(default)/documents/usernames/${encodeURIComponent(cleanHandle)}`, (response) => {
          let data = '';
          response.on('data', chunk => data += chunk);
          response.on('end', () => {
            if (response.statusCode === 200) {
              resolve(JSON.parse(data));
            } else {
              resolve(null);
            }
          });
        }).on('error', reject);
      });

      if (!usernameRes || !usernameRes.fields || !usernameRes.fields.uid) {
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
      }

      const uid = usernameRes.fields.uid.stringValue;

      const userRes = await new Promise((resolve, reject) => {
        https.get(`https://firestore.googleapis.com/v1/projects/syntiox-services/databases/(default)/documents/users/${uid}`, (response) => {
          let data = '';
          response.on('data', chunk => data += chunk);
          response.on('end', () => {
            if (response.statusCode === 200) {
              resolve(JSON.parse(data));
            } else {
              resolve(null);
            }
          });
        }).on('error', reject);
      });

      if (userRes && userRes.fields) {
        const f = userRes.fields;
        const name = f.displayName ? f.displayName.stringValue : (f.name ? f.name.stringValue : handle);
        const bio = f.bio ? f.bio.stringValue : `View ${name}'s profile on Syntiox.`;

        let showPhoto = true;
        if (f.appearance && f.appearance.mapValue && f.appearance.mapValue.fields) {
          const appFields = f.appearance.mapValue.fields;
          if (appFields.showMetadataPhoto && appFields.showMetadataPhoto.booleanValue !== undefined) {
            showPhoto = appFields.showMetadataPhoto.booleanValue !== false;
          }
        }

        const rawUserPhoto = (f.photoURL && f.photoURL.stringValue)
          || (f.avatar && f.avatar.stringValue)
          || '';

        const photoURL = (showPhoto && rawUserPhoto)
          ? rawUserPhoto
          : 'https://syntiox.top/assets/image/logo.png';

        const cardType = (showPhoto && rawUserPhoto) ? 'summary_large_image' : 'summary';
        const title = `${name} | Syntiox`;

        profileMeta = { name, bio, photoURL, cardType, title };

        // Save to Redis Cache (30-day sliding TTL)
        await setCachedProfile(cacheKey, profileMeta);
      }
    }

    // 3. Inject Dynamic Meta Tags
    if (profileMeta) {
      const { name, bio, photoURL, cardType, title } = profileMeta;
      const metaTags = `
  <title>${title}</title>
  <meta name="description" content="${bio}">
  
  <!-- Open Graph / WhatsApp / Facebook -->
  <meta property="og:type" content="profile">
  <meta property="og:url" content="https://syntiox.top/u/${cleanHandle}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${bio}">
  <meta property="og:image" content="${photoURL}">

  <!-- Twitter -->
  <meta name="twitter:card" content="${cardType}">
  <meta name="twitter:url" content="https://syntiox.top/u/${cleanHandle}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${bio}">
  <meta name="twitter:image" content="${photoURL}">
`;

      html = html.replace(/<title>.*?<\/title>/gi, '');
      html = html.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');
      html = html.replace(/<meta\s+(?:property|name)=["'](?:og|twitter):[^"']*["'][^>]*>/gi, '');

      html = html.replace('</head>', `${metaTags}\n</head>`);
    }

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).send(html);

  } catch (error) {
    console.error('Error generating dynamic OG tags:', error);
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
