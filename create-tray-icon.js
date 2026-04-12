const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function createTrayIcon() {
  const size = 22;

  // Pen with a scribble/squiggle line underneath
  // Using black (#000000) for macOS template image compatibility
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 22 22">
    <g fill="none" stroke="#000000" stroke-linecap="round" stroke-linejoin="round">
      <!-- Pen body (tilted) -->
      <path d="M12.5 2.5l4 4-9 9H4v-3.5z" stroke-width="1.5"/>
      <!-- Pen tip line -->
      <path d="M10.5 4.5l4 4" stroke-width="1.2"/>
      <!-- Scribble/squiggle underneath -->
      <path d="M3 19.5c1.5-1.5 2.5 1 4 0s2.5 1 4 0s2.5 1 4 0" stroke-width="1.4"/>
    </g>
  </svg>`;

  const outputDir = path.join(__dirname, 'build');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Create regular tray icon
  await sharp(Buffer.from(svg))
    .resize(22, 22)
    .png()
    .toFile(path.join(outputDir, 'trayIcon.png'));

  // Create @2x version for Retina displays
  const svg2x = svg.replace(`width="${size}"`, `width="${size * 2}"`).replace(`height="${size}"`, `height="${size * 2}"`);
  await sharp(Buffer.from(svg2x))
    .resize(44, 44)
    .png()
    .toFile(path.join(outputDir, 'trayIcon@2x.png'));

  console.log('✓ Tray icons created: build/trayIcon.png, build/trayIcon@2x.png');
}

createTrayIcon().catch(console.error);
