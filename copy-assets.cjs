const fs = require('fs');
const path = require('path');

const srcJs = path.join(__dirname, 'assets', 'js');
const destJs = path.join(__dirname, 'dist', 'assets', 'js');

const srcImg = path.join(__dirname, 'assets', 'image');
const destImg = path.join(__dirname, 'dist', 'assets', 'image');

if (fs.existsSync(srcJs)) {
  fs.cpSync(srcJs, destJs, { recursive: true, force: true });
  console.log('Copied assets/js to dist/assets/js');
}

if (fs.existsSync(srcImg)) {
  fs.cpSync(srcImg, destImg, { recursive: true, force: true });
  console.log('Copied assets/image to dist/assets/image');
}
