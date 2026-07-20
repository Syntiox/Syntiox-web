import fs from 'fs';
import path from 'path';
import https from 'https';

export default async function handler(req, res) {
  const handle = req.query.handle;
  if (!handle) {
    return res.status(400).send("No handle provided");
  }

  try {
    // 1. Read the original HTML file
    // In Vercel, static files are available in the root
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
      // Get values, handling potential nulls
      const name = f.displayName ? f.displayName.stringValue : (f.name ? f.name.stringValue : 'User');
      const bio = f.bio ? f.bio.stringValue : 'Syntiox Profile';
      
      // Check if user has explicitly disabled metadata photo
      let showPhoto = true;
      if (f.appearance && f.appearance.mapValue && f.appearance.mapValue.fields && f.appearance.mapValue.fields.showMetadataPhoto) {
        showPhoto = f.appearance.mapValue.fields.showMetadataPhoto.booleanValue !== false;
      }
      
      const photoURL = (showPhoto && f.photoURL) 
        ? f.photoURL.stringValue 
        : 'https://syntiox.top/assets/logo-IcotzT0R.png';
      
      const title = `${name} | Syntiox`;

      // 4. Inject Meta Tags
      const metaTags = `
    <title>${title}</title>
    <meta name="description" content="${bio}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://syntiox.top/u/${handle}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${bio}">
    <meta property="og:image" content="${photoURL}">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="https://syntiox.top/u/${handle}">
    <meta property="twitter:title" content="${title}">
    <meta property="twitter:description" content="${bio}">
    <meta property="twitter:image" content="${photoURL}">
    `;

      // Replace the existing title/meta tags (or just inject into head)
      // Remove existing title if possible
      html = html.replace(/<title>.*?<\/title>/gi, '');
      html = html.replace(/<meta\s+name="description".*?>/gi, '');
      
      // Inject before </head>
      html = html.replace('</head>', `${metaTags}\n</head>`);
    }

    // 5. Send modified HTML
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate'); // cache on CDN for 60 seconds
    return res.status(200).send(html);

  } catch (error) {
    console.error('Error generating dynamic OG tags:', error);
    // On error, try to send the raw file, or a 500
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
