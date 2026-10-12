const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generate() {
  const svgPath = path.join(__dirname, '../public/icons/icon.svg');
  const iconsDir = path.join(__dirname, '../public/icons');

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const svgBuffer = fs.readFileSync(svgPath);

  // 192x192 PNG
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'icon-192.png'));
  console.log('Created icon-192.png');

  // 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-512.png'));
  console.log('Created icon-512.png');

  // 512x512 Maskable PNG (with padding)
  await sharp(svgBuffer)
    .resize(410, 410)
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: '#F5F8FB',
    })
    .png()
    .toFile(path.join(iconsDir, 'icon-maskable-512.png'));
  console.log('Created icon-maskable-512.png');

  // favicon.ico
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(__dirname, '../public/favicon.ico'));
  console.log('Created favicon.ico');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
