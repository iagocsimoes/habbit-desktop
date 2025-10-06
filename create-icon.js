const fs = require('fs');
const path = require('path');

// Create a simple 256x256 PNG icon (white H on blue background)
const canvas = `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
  <rect width="256" height="256" fill="#5865F2"/>
  <text x="128" y="190" font-family="Arial" font-size="180" font-weight="bold" text-anchor="middle" fill="white">H</text>
</svg>`;

const outputPath = path.join(__dirname, 'build', 'icon.svg');
fs.writeFileSync(outputPath, canvas);
console.log('✓ SVG icon created: build/icon.svg');
console.log('  Convert to PNG using online tool or ImageMagick');
console.log('  Recommended size: 256x256 or 512x512');
