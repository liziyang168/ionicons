import path from 'node:path';
import fs from 'fs-extra';
import { watch } from 'node:fs';
import { spawn } from 'node:child_process';

const rootDir = path.join(__dirname, '..');
const srcTestDir = path.join(rootDir, 'src', 'tests');
const srcIndexPath = path.join(rootDir, 'src', 'index.html');
const wwwTestDir = path.join(rootDir, 'www', 'tests');
const wwwIndexPath = path.join(rootDir, 'www', 'index.html');

async function copyFiles() {
  try {
    await Promise.all([
      fs.copy(srcTestDir, wwwTestDir, { overwrite: true, filter: (src) => !src.endsWith('cheatsheet.html') }),
      fs.copyFile(srcIndexPath, wwwIndexPath, fs.constants.COPYFILE_FICLONE),
    ]);
  } catch (e) {
    console.error('Error copying files:', e);
  }
}

async function regenerateCheatsheet() {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn('npm', ['run', 'build.files'], {
      cwd: rootDir,
      stdio: 'inherit',
    });
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`build.files exited with code ${code}`));
      }
    });
  });
}

// Initial copy
copyFiles();

// Watch for changes
const watcher = watch(srcTestDir, { recursive: true }, (eventType, filename) => {
  if (filename === 'cheatsheet.html' || filename?.endsWith('cheatsheet.html')) {
    regenerateCheatsheet().catch((e) => console.error('Error regenerating cheatsheet:', e));
  } else {
    copyFiles();
  }
});

watch(srcIndexPath, () => {
  copyFiles();
});

process.on('SIGINT', () => {
  watcher.close();
  process.exit(0);
});
