// Trigger build with updated obfuscator engine
import { execSync } from 'child_process';
import fs, { readFileSync, writeFileSync } from 'fs';

const API_PROTECT = "https://shalukagimhan1-sh4lu-z-obfuscator.hf.space/api/v1/protect";
const API_STATUS = "https://shalukagimhan1-sh4lu-z-obfuscator.hf.space/api/v1/status";
const API_DOWNLOAD = "https://shalukagimhan1-sh4lu-z-obfuscator.hf.space/api/v1/download";

async function run() {
  console.log("[Obfuscator] Zipping dist folder (excluding third-party vendors)...");
  try {
    if (process.platform === 'win32') {
      execSync('powershell "Get-ChildItem -Path dist -Recurse -File | Where-Object { $_.Name -notmatch \'vendor|sw\\.js|workbox\' -and $_.FullName -notmatch \'\\\\api\\\\\' } | Compress-Archive -DestinationPath source.zip -Force"');
    } else {
      execSync('cd dist && zip -r ../source.zip . -x "api/*" "sw.js" "workbox-*.js" "assets/vendor-*.js" "*vendor*"');
    }
  } catch (err) {
    console.error("Failed to zip:", err.message);
    process.exit(1);
  }

  const settings = {
    fastMode: true,
    bytecodeVm: true,
    stringEncryption: "base64",
    customStringCipher: true,
    customControlFlow: true,
    controlFlow: 35,
    opaquePredicates: true,
    antiDeobfuscator: true,
    integrityGuard: true,
    llmContextFlood: true,
    antiLLM: true,
    enableCopyright: true,
    copyrightMessage: "Copyright (c) 2026 Shaluka Gimhan (Syntiox). All Rights Reserved.\nSPDX-License-Identifier: Proprietary\n\nUnauthorized copying, modification, distribution, or reverse engineering of this software is strictly prohibited."
  };

  console.log("[Obfuscator] Uploading to API...");
  
  const fileBuffer = readFileSync('source.zip');
  const blob = new Blob([fileBuffer], { type: 'application/zip' });
  
  const formData = new FormData();
  formData.append('file', blob, 'source.zip');
  formData.append('settings', JSON.stringify(settings));

  let res;
  let retries = 15;
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
         console.log("[Obfuscator] Extracting protected files into dist...");
         if (process.platform === 'win32') {
           execSync('powershell Expand-Archive -Path protected.zip -DestinationPath dist -Force');
         } else {
           execSync('unzip -o protected.zip -d dist');
         }

         try {
           if (fs.existsSync('source.zip')) fs.unlinkSync('source.zip');
           if (fs.existsSync('protected.zip')) fs.unlinkSync('protected.zip');
         } catch {}

         console.log("[Obfuscator] Done! Files overwritten with obfuscated versions in dist.");
         break;
      } else if (statusData.status === 'error') {
         console.error("[Obfuscator] Server error:", statusData.error);
         process.exit(1);
      } else {
         if (statusData.totalFiles) {
           console.log(`[Obfuscator] [${statusData.processedFiles}/${statusData.totalFiles}] (${statusData.percentage}%) Obfuscating: ${statusData.currentFile || 'preparing...'}`);
         } else {
           console.log("[Obfuscator] Still processing...");
         }
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
