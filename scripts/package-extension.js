// scripts/package-extension.js - Clean packager for Chrome Web Store & GitHub Releases
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');
const ZIP_FILE = path.join(DIST_DIR, 'cal-1-v1.zip');

if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// Remove old zip if exists
if (fs.existsSync(ZIP_FILE)) {
  fs.unlinkSync(ZIP_FILE);
}

console.log('📦 Packaging cal-1 extension for distribution...\n');

// Clean mac extended attributes first
try {
  execSync('xattr -cr manifest.json popup background lib icons fonts 2>/dev/null', { cwd: ROOT_DIR });
} catch {}

const cmd = `zip -r "${ZIP_FILE}" manifest.json popup background lib icons fonts -x "*.DS_Store*"`;
execSync(cmd, { cwd: ROOT_DIR, stdio: 'inherit' });

const stats = fs.statSync(ZIP_FILE);
const sizeKb = (stats.size / 1024).toFixed(1);

console.log(`\n✅ Successfully generated clean release archive:`);
console.log(`   File: dist/cal-1-v1.zip (${sizeKb} KB)`);
console.log(`\n🚀 This ZIP is ready to:`);
console.log(`   1. Upload directly to the Chrome Web Store Developer Dashboard`);
console.log(`   2. Attach to a GitHub Release for direct ZIP download`);
