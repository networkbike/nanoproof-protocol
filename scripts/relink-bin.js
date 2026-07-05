// relink-bin.js — walk node_modules and recreate every package's bin symlink
// under node_modules/.bin. Run as: node relink-bin.js
const fs = require('fs');
const path = require('path');

const BIN_DIR = path.join(process.cwd(), 'node_modules', '.bin');
fs.rmSync(BIN_DIR, { recursive: true, force: true });
fs.mkdirSync(BIN_DIR, { recursive: true });

const seen = new Set();
let count = 0, errors = 0;

function linkBins(pkgDir) {
  if (!pkgDir || seen.has(pkgDir)) return;
  seen.add(pkgDir);
  const pkgJson = path.join(pkgDir, 'package.json');
  let pkg;
  try { pkg = JSON.parse(fs.readFileSync(pkgJson, 'utf8')); }
  catch { return; }
  if (pkg.bin) {
    const entries = typeof pkg.bin === 'string'
      ? { [pkg.name.split('/').pop()]: pkg.bin }
      : pkg.bin;
    for (const [name, rel] of Object.entries(entries)) {
      try {
        const src = path.join(pkgDir, rel);
        if (!fs.existsSync(src)) continue;
        const dst = path.join(BIN_DIR, name);
        if (fs.existsSync(dst)) continue;
        fs.symlinkSync(path.relative(path.dirname(dst), src), dst);
        count++;
      } catch (e) {
        errors++;
      }
    }
  }
  let entries;
  try { entries = fs.readdirSync(pkgDir, { withFileTypes: true }); }
  catch { return; }
  for (const e of entries) {
    if (e.isDirectory() && e.name !== 'node_modules' && e.name !== '.bin' && !e.name.startsWith('.')) {
      linkBins(path.join(pkgDir, e.name));
    }
  }
}

const NM = path.join(process.cwd(), 'node_modules');
if (!fs.existsSync(NM)) {
  console.error('node_modules does not exist — run npm install first');
  process.exit(1);
}
linkBins(NM);
console.log(`relinked ${count} binaries (${errors} errors)`);
