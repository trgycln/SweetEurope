import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function updateFavicons() {
  const logoPath = path.join(process.cwd(), 'public', 'logo.png');
  const srcAppDir = path.join(process.cwd(), 'src', 'app');
  const publicDir = path.join(process.cwd(), 'public');

  if (!fs.existsSync(logoPath)) {
    console.error('public/logo.png not found!');
    return;
  }

  console.log('Generating new favicons from logo.png...');

  // Create icon.png (used by modern browsers and Next.js)
  await sharp(logoPath)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toFile(path.join(srcAppDir, 'icon.png'));

  // Create apple-icon.png
  await sharp(logoPath)
    .resize(180, 180, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 } // Apple icons usually don't support transparency
    })
    .toFile(path.join(srcAppDir, 'apple-icon.png'));

  console.log('Successfully generated src/app/icon.png and src/app/apple-icon.png');

  // Remove old vercel favicons
  const filesToDelete = [
    path.join(publicDir, 'favicon.ico'),
    path.join(publicDir, 'favicon.png'),
    path.join(publicDir, 'apple-touch-icon.png')
  ];

  for (const file of filesToDelete) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`Deleted ${file}`);
    }
  }
}

updateFavicons().catch(console.error);
