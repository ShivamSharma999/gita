const fs = require('fs').promises;
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
console.log(projectRoot, distDir);

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function copyFile(src, dest) {
  await ensureDir(path.dirname(dest));
  await fs.copyFile(src, dest);
}

async function copyFolder(src, dest) {
  const entries = await fs.readdir(src, { withFileTypes: true });
  await ensureDir(dest);

  for (const entry of entries) {
    const sourcePath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyFolder(sourcePath, destPath);
    } else if (entry.isFile()) {
      await copyFile(sourcePath, destPath);
    }
  }
}

async function main() {
  try {
    await ensureDir(distDir);

    await copyFile(path.join(projectRoot, 'src', 'index.html'), path.join(distDir, 'index.html'));
    await copyFile(path.join(projectRoot, 'src', 'styles.css'), path.join(distDir, 'styles.css'));

    await copyFolder(path.join(projectRoot, 'src', 'data'), path.join(distDir, 'data'));
    await copyFolder(path.join(projectRoot, 'src', 'assets'), path.join(distDir, 'assets'));

    console.log('Copied index.html, styles.css, data/, assets/ to dist/');
  } catch (error) {
    console.error('copy-static failed:', error);
    process.exit(1);
  }
}

main();
