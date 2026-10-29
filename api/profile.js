import fs from 'fs';
import path from 'path';
import https from 'https';

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // Max 30 requests per minute per IP

export default async function handler(req, res) {
  // Simple Rate Limiting per Vercel instance
  const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  let rateData = rateLimitMap.get(ip);

  if (!rateData || now - rateData.startTime > RATE_LIMIT_WINDOW_MS) {
    rateData = { count: 1, startTime: now };
  } else {
    rateData.count++;
  }
  rateLimitMap.set(ip, rateData);

  if (rateData.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).send("Too Many Requests - Please try again later");
  }
  const handle = req.query.handle;
  if (!handle) {
    return res.status(400).send("No handle provided");
  }

  try {
    // 1. Read the original HTML file
    const htmlPath = path.join(process.cwd(), 'profile.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    // 2. Fetch User UID from handle
    const usernameRes = await new Promise((resolve, reject) => {
      https.get(`https://firestore.googleapis.com/v1/projects/syntiox-services/databases/(default)/documents/usernames/${encodeURIComponent(handle.toLowerCase())}`, (response) => {
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

    // 3. Fetch User Data
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
      
      // Check if user has explicitly enabled/disabled metadata photo
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

      // 4. Inject Meta Tags
      const metaTags = `
  <title>${title}</title>
  <meta name="description" content="${bio}">
  
  <!-- Open Graph / WhatsApp / Facebook -->
  <meta property="og:type" content="profile">
  <meta property="og:url" content="https://syntiox.top/u/${handle}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${bio}">
  <meta property="og:image" content="${photoURL}">

  <!-- Twitter -->
  <meta name="twitter:card" content="${cardType}">
  <meta name="twitter:url" content="https://syntiox.top/u/${handle}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${bio}">
  <meta name="twitter:image" content="${photoURL}">
`;

      // Clean existing tags so we don't have duplicates
      html = html.replace(/<title>.*?<\/title>/gi, '');
      html = html.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');
      html = html.replace(/<meta\s+(?:property|name)=["'](?:og|twitter):[^"']*["'][^>]*>/gi, '');
      
      // Inject before </head>
      html = html.replace('</head>', `${metaTags}\n</head>`);
    }

    // 5. Send modified HTML
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
