const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'windows');
const destDir = path.join(__dirname, 'dist', 'windows');

// Create dist/windows if it doesn't exist
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy all files
fs.cpSync(srcDir, destDir, { recursive: true });

// Copy icon to dist/build
const buildSrcDir = path.join(__dirname, 'build');
const buildDestDir = path.join(__dirname, 'dist', 'build');

if (fs.existsSync(buildSrcDir)) {
  if (!fs.existsSync(buildDestDir)) {
    fs.mkdirSync(buildDestDir, { recursive: true });
  }
  fs.cpSync(buildSrcDir, buildDestDir, { recursive: true });
}

console.log('✓ Windows files copied to dist');
