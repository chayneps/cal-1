// scripts/package-extension.js - Clean packager for Chrome Web Store & GitHub Releases
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');
const ZIP_FILE = path.join(DIST_DIR, 'cal-1-v1.zip');
const STAGING_DIR = path.join(DIST_DIR, 'staging');

if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// Remove old build artifacts
if (fs.existsSync(ZIP_FILE)) {
  fs.unlinkSync(ZIP_FILE);
}
if (fs.existsSync(STAGING_DIR)) {
  fs.rmSync(STAGING_DIR, { recursive: true, force: true });
}
fs.mkdirSync(STAGING_DIR, { recursive: true });

console.log('📦 Packaging cal-1 extension for distribution...\n');

// 1. Prepare clean manifest.json without "key" (Chrome Web Store rejects manifests with "key")
const manifestRaw = fs.readFileSync(path.join(ROOT_DIR, 'manifest.json'), 'utf8');
const manifest = JSON.parse(manifestRaw);
delete manifest.key;
fs.writeFileSync(path.join(STAGING_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

// 2. Copy source directories
const dirsToCopy = ['popup', 'background', 'lib', 'icons', 'fonts'];
for (const dir of dirsToCopy) {
  const src = path.join(ROOT_DIR, dir);
  const dest = path.join(STAGING_DIR, dir);
  if (fs.existsSync(src)) {
    execSync(`cp -R "${src}" "${dest}"`);
  }
}

// Clean macOS extended attributes
try {
  execSync('xattr -cr . 2>/dev/null', { cwd: STAGING_DIR });
} catch {}

const cmd = `cd "${STAGING_DIR}" && zip -r "${ZIP_FILE}" manifest.json popup background lib icons fonts -x "*.DS_Store*"`;
execSync(cmd, { stdio: 'inherit' });

// Clean staging dir
fs.rmSync(STAGING_DIR, { recursive: true, force: true });

const stats = fs.statSync(ZIP_FILE);
const sizeKb = (stats.size / 1024).toFixed(1);

console.log(`\n✅ Successfully generated clean release archive:`);
console.log(`   File: dist/cal-1-v1.zip (${sizeKb} KB)`);
console.log(`\n🚀 This ZIP is ready to:`);
console.log(`   1. Upload directly to the Chrome Web Store Developer Dashboard (No "key" field error)`);
console.log(`   2. Attach to a GitHub Release for direct ZIP download`);
