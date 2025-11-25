const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceIcon = 'icon.png';
const publicDir = 'src/public';

// Icon sizes and names needed for PWA and web standards
const icons = [
  // PWA icons
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 72, name: 'icon-72.png' },
  { size: 96, name: 'icon-96.png' },
  { size: 128, name: 'icon-128.png' },
  { size: 144, name: 'icon-144.png' },

  // Apple touch icons
  { size: 57, name: 'apple-touch-icon-57x57.png' },
  { size: 60, name: 'apple-touch-icon-60x60.png' },
  { size: 72, name: 'apple-touch-icon-72x72.png' },
  { size: 76, name: 'apple-touch-icon-76x76.png' },
  { size: 114, name: 'apple-touch-icon-114x114.png' },
  { size: 120, name: 'apple-touch-icon-120x120.png' },
  { size: 144, name: 'apple-touch-icon-144x144.png' },
  { size: 152, name: 'apple-touch-icon-152x152.png' },
  { size: 180, name: 'apple-touch-icon-180x180.png' },

  // Android Chrome icons
  { size: 36, name: 'android-chrome-36x36.png' },
  { size: 48, name: 'android-chrome-48x48.png' },
  { size: 72, name: 'android-chrome-72x72.png' },
  { size: 96, name: 'android-chrome-96x96.png' },
  { size: 144, name: 'android-chrome-144x144.png' },
  { size: 192, name: 'android-chrome-192x192.png' },

  // Microsoft tiles
  { size: 70, name: 'mstile-70x70.png' },
  { size: 144, name: 'mstile-144x144.png' },
  { size: 150, name: 'mstile-150x150.png' },
  { size: 310, name: 'mstile-310x310.png' },
  { size: 310, name: 'mstile-310x150.png' },

  // Favicon sizes
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 48, name: 'favicon.ico' }, // Will be converted to ICO format
];

async function generateIcons() {
  console.log('Generating icons from', sourceIcon);

  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Read source image
  const image = sharp(sourceIcon);
  const metadata = await image.metadata();

  console.log(`Source image: ${metadata.width}x${metadata.height}`);

  // Generate all icon sizes
  for (const icon of icons) {
    const outputPath = path.join(publicDir, icon.name);

    try {
      if (icon.name.endsWith('.ico')) {
        // For favicon.ico, create a multi-size ICO file
        await image
          .resize(icon.size, icon.size, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .png()
          .toFile(outputPath.replace('.ico', '-48x48.png'));

        // Note: Creating actual ICO files would require additional libraries
        // For now, we'll create PNG files and rename appropriately
        console.log(`Generated: ${icon.name} (${icon.size}x${icon.size})`);
      } else {
        await image
          .resize(icon.size, icon.size, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .png()
          .toFile(outputPath);

        console.log(`Generated: ${icon.name} (${icon.size}x${icon.size})`);
      }
    } catch (error) {
      console.error(`Error generating ${icon.name}:`, error);
    }
  }

  // Create a simple favicon.ico by copying the 48x48 version
  const favicon48Path = path.join(publicDir, 'favicon-48x48.png');
  const faviconIcoPath = path.join(publicDir, 'favicon.ico');

  if (fs.existsSync(favicon48Path)) {
    fs.copyFileSync(favicon48Path, faviconIcoPath);
    console.log('Created favicon.ico');
  }

  console.log('Icon generation complete!');
}

generateIcons().catch(console.error);
