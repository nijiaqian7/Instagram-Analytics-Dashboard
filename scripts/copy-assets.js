const fs = require('fs');
const path = require('path');

function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach(element => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  });
}

const rootDir = path.resolve(__dirname, '..');
const standaloneDir = path.join(rootDir, '.next', 'standalone');

if (fs.existsSync(standaloneDir)) {
  console.log('Copying static assets to standalone build...');
  copyFolderSync(path.join(rootDir, '.next', 'static'), path.join(standaloneDir, '.next', 'static'));
  copyFolderSync(path.join(rootDir, 'public'), path.join(standaloneDir, 'public'));
  console.log('✅ Static assets copied successfully!');
} else {
  console.error('❌ .next/standalone folder not found. Please run `next build` first.');
  process.exit(1);
}
