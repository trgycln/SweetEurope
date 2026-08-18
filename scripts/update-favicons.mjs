import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateFavicons() {
  const rootDir = process.cwd();
  // Check for logo_arka_plansiz_hazir.png or fallback to logo.png
  let inputLogoPath = path.join(rootDir, 'public', 'logo_arka_plansiz_hazir.png');
  if (!fs.existsSync(inputLogoPath)) {
    inputLogoPath = path.join(rootDir, 'public', 'logo.png');
  }

  const publicDir = path.join(rootDir, 'public');
  const srcAppDir = path.join(rootDir, 'src', 'app');

  if (!fs.existsSync(inputLogoPath)) {
    console.error('Logo source image not found!');
    process.exit(1);
  }

  console.log(`Reading and trimming ${inputLogoPath}...`);
  // Trim transparent borders to get the tightest bounding box of the logo artwork
  const trimmedBuffer = await sharp(inputLogoPath).trim().toBuffer();
  const trimmedMeta = await sharp(trimmedBuffer).metadata();
  console.log(`Trimmed dimensions: ${trimmedMeta.width}x${trimmedMeta.height} (Aspect ratio: ${(trimmedMeta.width / trimmedMeta.height).toFixed(3)})`);

  // Helper function to create centered icon on transparent canvas
  async function createSquareIconBuffer(size, fillRatio = 0.92) {
    const targetWidth = Math.round(size * fillRatio);
    const targetHeight = Math.round(targetWidth / (trimmedMeta.width / trimmedMeta.height));

    const resizedLogo = await sharp(trimmedBuffer)
      .resize({
        width: targetWidth,
        height: targetHeight,
        fit: 'inside',
        withoutEnlargement: false,
      })
      .toBuffer();

    const actualResizedMeta = await sharp(resizedLogo).metadata();
    const left = Math.round((size - actualResizedMeta.width) / 2);
    const top = Math.round((size - actualResizedMeta.height) / 2);

    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: resizedLogo, left, top }])
      .png()
      .toBuffer();
  }

  console.log('Generating optimized icons...');

  // 1. 512x512 sizes
  const icon512 = await createSquareIconBuffer(512, 0.92);
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), icon512);
  fs.writeFileSync(path.join(publicDir, 'android-chrome-512x512.png'), icon512);
  fs.writeFileSync(path.join(publicDir, 'logo.png'), icon512);
  fs.writeFileSync(path.join(srcAppDir, 'icon.png'), icon512);
  console.log('✓ 512x512 icons generated (favicon.png, android-chrome-512x512.png, logo.png, src/app/icon.png)');

  // 2. 192x192 sizes
  const icon192 = await createSquareIconBuffer(192, 0.92);
  fs.writeFileSync(path.join(publicDir, 'android-chrome-192x192.png'), icon192);
  console.log('✓ 192x192 icon generated (android-chrome-192x192.png)');

  // 3. 180x180 sizes (Apple touch icon)
  const icon180 = await createSquareIconBuffer(180, 0.90);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), icon180);
  fs.writeFileSync(path.join(srcAppDir, 'apple-icon.png'), icon180);
  console.log('✓ 180x180 Apple touch icon generated (apple-touch-icon.png, src/app/apple-icon.png)');

  // 4. 48x48 size (Google search crawler standard)
  const icon48 = await createSquareIconBuffer(48, 0.92);
  fs.writeFileSync(path.join(publicDir, 'favicon-48x48.png'), icon48);
  console.log('✓ 48x48 icon generated (favicon-48x48.png)');

  // 5. 32x32 size
  const icon32 = await createSquareIconBuffer(32, 0.92);
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), icon32);
  console.log('✓ 32x32 icon generated (favicon-32x32.png)');

  // 6. 16x16 size
  const icon16 = await createSquareIconBuffer(16, 0.92);
  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), icon16);
  console.log('✓ 16x16 icon generated (favicon-16x16.png)');

  // 7. Multi-size / crisp favicon.ico for public and src/app
  const icoBuffer = await sharp(icon48).toFormat('png').toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(srcAppDir, 'favicon.ico'), icoBuffer);
  console.log('✓ favicon.ico created in public/ and src/app/');

  console.log('\nAll favicons generated successfully with transparent backgrounds and optimal filling!');
}

generateFavicons().catch((err) => {
  console.error('Error generating favicons:', err);
  process.exit(1);
});
