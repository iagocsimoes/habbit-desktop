const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convertLogo() {
  try {
    const inputPath = path.join(__dirname, 'c9a745ce773173ab8c151d71cd3259b3.jpg');
    const outputDir = path.join(__dirname, 'build');
    const outputPath = path.join(outputDir, 'icon.png');

    // Create build directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Convert JPG to PNG with proper sizing
    await sharp(inputPath)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(outputPath);

    console.log('✓ Logo converted successfully: build/icon.png (512x512)');
  } catch (error) {
    console.error('Error converting logo:', error);
    process.exit(1);
  }
}

convertLogo();
