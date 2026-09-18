import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
const svgPath = path.join(publicDir, 'icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generate() {
  console.log('Generating PNG icons from icon.svg...');

  // 1. Standard 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // 2. Standard 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // 3. Apple Touch Icon 180x180
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 4. Favicon 64x64 PNG
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  // 5. Maskable 512x512:
  // Android crops maskable icons to circles or squircles with 10-15% safe zone.
  // We place a solid/gradient emerald background, and composite the resized icon (80% = 410px) centered inside.
  const innerSize = Math.round(512 * 0.80);
  const innerOffset = Math.round((512 - innerSize) / 2);

  const innerBuffer = await sharp(svgBuffer)
    .resize(innerSize, innerSize)
    .toBuffer();

  const background = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 16, g: 185, b: 129, alpha: 1 } // #10b981
    }
  }).png().toBuffer();

  await sharp(background)
    .composite([
      {
        input: innerBuffer,
        top: innerOffset,
        left: innerOffset
      }
    ])
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  console.log('All icons generated successfully!');
}

generate().catch(err => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
