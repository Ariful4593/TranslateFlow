// Node script to bundle TranslateFlow into a clean Chrome Web Store production zip
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const manifestPath = path.join(rootDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const version = manifest.version || '1.0.0';

const distDir = path.join(rootDir, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const zipFileName = `TranslateFlow-v${version}.zip`;
const zipFilePath = path.join(distDir, zipFileName);

// Remove existing zip if any
if (fs.existsSync(zipFilePath)) {
  fs.unlinkSync(zipFilePath);
}

// Staging directory for clean release
const stageDir = path.join(distDir, 'stage');
if (fs.existsSync(stageDir)) {
  fs.rmSync(stageDir, { recursive: true, force: true });
}
fs.mkdirSync(stageDir, { recursive: true });

// Production items to bundle
const includeItems = [
  'manifest.json',
  'background',
  'content',
  'popup',
  'icons',
  'harness'
];

console.log(`Packaging TranslateFlow v${version}...`);

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

for (const item of includeItems) {
  const src = path.join(rootDir, item);
  const dest = path.join(stageDir, item);
  if (fs.existsSync(src)) {
    copyRecursive(src, dest);
    console.log(`  + Bundled ${item}`);
  } else {
    console.error(`  ! Missing required item: ${item}`);
    process.exit(1);
  }
}

// Create ZIP using PowerShell Compress-Archive on Windows
try {
  const psCmd = `powershell -NoProfile -Command "Compress-Archive -Path '${stageDir}/*' -DestinationPath '${zipFilePath}' -Force"`;
  execSync(psCmd, { stdio: 'inherit' });
  
  // Clean up stage folder
  fs.rmSync(stageDir, { recursive: true, force: true });

  const stats = fs.statSync(zipFilePath);
  const sizeKb = (stats.size / 1024).toFixed(1);

  console.log(`\nSUCCESS: Production zip created at:`);
  console.log(`  ${zipFilePath} (${sizeKb} KB)`);
  console.log(`Ready for upload to Chrome Web Store Developer Dashboard!`);
} catch (err) {
  console.error('Failed to create ZIP archive:', err);
  process.exit(1);
}
