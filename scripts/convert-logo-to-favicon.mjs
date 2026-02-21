import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function convertLogoToFavicon() {
  const logoPath = path.join(process.cwd(), 'public', 'Logo.jpg');
  const faviconPath = path.join(process.cwd(), 'public', 'favicon.png');
  const faviconIcoPath = path.join(process.cwd(), 'public', 'favicon.ico');

  try {
    // Check if Logo.jpg exists
    if (!fs.existsSync(logoPath)) {
      console.error('Logo.jpg not found!');
      process.exit(1);
    }

    // Convert to PNG favicon (192x192)
    console.log('Converting Logo.jpg to favicon.png...');
    await sharp(logoPath)
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(faviconPath);
    console.log('✓ favicon.png created successfully');

    // Also create .ico format for better compatibility
    console.log('Converting Logo.jpg to favicon.ico...');
    await sharp(logoPath)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(faviconIcoPath);
    console.log('✓ favicon.ico created successfully');

    console.log('\n✓ Favicon conversion complete!');
    console.log('Google will refresh favicon cache within 24-48 hours.');
    
  } catch (error) {
    console.error('Error converting logo to favicon:', error);
    process.exit(1);
  }
}

convertLogoToFavicon();
