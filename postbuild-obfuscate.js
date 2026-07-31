import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const API_PROTECT = "https://securecode-pro-api.onrender.com/api/v1/protect";
const API_STATUS = "https://securecode-pro-api.onrender.com/api/v1/status";
const API_DOWNLOAD = "https://securecode-pro-api.onrender.com/api/v1/download";

async function run() {
  console.log("[Obfuscator] Zipping dist folder...");
  try {
    // Zip only the contents of dist folder (excluding api and service workers)
    execSync('cd dist && zip -r ../source.zip . -x "api/*" "sw.js" "workbox-*.js"');
  } catch (err) {
    console.error("Failed to zip:", err.message);
    process.exit(1);
  }

  const settings = {
    fastMode: true,
    stringEncryption: "base64",
    controlFlow: 25,
    deadCode: 5,
    selfDefending: false,
    debugProtection: true,
    antiLLM: true,
    antiDeobfuscator: false,
    customStringCipher: true,
    customControlFlow: true,
    opaquePredicates: true,
    integrityGuard: false,
    llmContextFlood: true,
    enableCopyright: true,
    copyrightMessage: "Copyright (c) 2026 Shaluka Gimhan (sh4lu-z) <hello@shalukagimhan.com>. All rights reserved.\n\nThis source code is licensed under the MIT license found in the\nLICENSE file in the root directory of this source tree.",
    copyrightCount: 1
  };

  console.log("[Obfuscator] Uploading to API...");

  const fileBuffer = readFileSync('source.zip');
  const blob = new Blob([fileBuffer], { type: 'application/zip' });

  const formData = new FormData();
  formData.append('file', blob, 'source.zip');
  formData.append('settings', JSON.stringify(settings));

  let res;
  let retries = 3;
  while (retries > 0) {
    try {
      res = await fetch(API_PROTECT, { method: 'POST', body: formData });
      if (res.ok) break;
      console.log(`[Obfuscator] API returned status ${res.status}, retrying in 5s...`);
    } catch (e) {
      console.log(`[Obfuscator] Network error during upload (${e.message}), retrying in 5s...`);
    }
    retries--;
    if (retries === 0) {
      console.error("Upload failed after multiple attempts.");
      if (res && !res.ok) console.error("Last API Response:", await res.text());
      process.exit(1);
    }
    await new Promise(r => setTimeout(r, 5000));
  }

  const { jobId } = await res.json();
  console.log(`[Obfuscator] Job ID: ${jobId}, waiting for completion...`);

  while (true) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const statusRes = await fetch(`${API_STATUS}/${jobId}`);
      const statusData = await statusRes.json();

      if (statusData.status === 'completed') {
        console.log("[Obfuscator] Obfuscation complete. Downloading...");
        const downRes = await fetch(`${API_DOWNLOAD}/${jobId}`);
        if (!downRes.ok) {
          console.error("Download failed", await downRes.text());
          process.exit(1);
        }
        const arrayBuffer = await downRes.arrayBuffer();
        writeFileSync('protected.zip', Buffer.from(arrayBuffer));
        console.log("[Obfuscator] Extracting protected files...");
        // Extract directly into dist folder
        execSync('unzip -o protected.zip -d dist');
        console.log("[Obfuscator] Done! Files overwritten with obfuscated versions.");
        break;
      } else if (statusData.status === 'error') {
        console.error("[Obfuscator] Server error:", statusData.error);
        process.exit(1);
      } else {
        console.log("[Obfuscator] Still processing...");
      }
    } catch (e) {
      console.log(`[Obfuscator] Network error during status check (${e.message}), retrying...`);
    }
  }
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
