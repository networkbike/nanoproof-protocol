// relink-bin.js — walk node_modules and recreate every package's bin symlink
// under node_modules/.bin. Run as: node relink-bin.js
//
// Walk every directory under node_modules/.  For each dir that has a
// package.json with a "bin" field, symlink each bin entry into
// node_modules/.bin.
//
// This is npm's job normally (it runs `npm install` and creates the
// .bin/ symlinks), but on Termux with --no-package-lock or stale
// state the symlinks often don't get created. This script fixes that.

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const NM = path.join(root, 'node_modules');
const BIN_DIR = path.join(NM, '.bin');
// Symlinks under BIN_DIR are resolved relative to BIN_DIR's parent.
// Make sure that parent is `node_modules` so the relative target
// can be written like "@nestjs/cli/bin/nest.js" without a leading
// node_modules/ prefix.
const BIN_PARENT = NM;

if (!fs.existsSync(NM)) {
  console.error('node_modules does not exist — run `npm install` first.');
  process.exit(1);
}

fs.rmSync(BIN_DIR, { recursive: true, force: true });
fs.mkdirSync(BIN_DIR, { recursive: true });

let count = 0;
let errors = 0;
const seen = new Set();

function walk(pkgDir) {
  if (!pkgDir || seen.has(pkgDir)) return;
  seen.add(pkgDir);

  // Read package.json. If absent or unparseable, just skip the bin check.
  const pkgJson = path.join(pkgDir, 'package.json');
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgJson, 'utf8'));
  } catch {
    pkg = null;
  }

  if (pkg && pkg.bin) {
    const entries = typeof pkg.bin === 'string'
      ? { [pkg.name.split('/').pop()]: pkg.bin }
      : pkg.bin;
    for (const [name, relPath] of Object.entries(entries)) {
      try {
        const src = path.join(pkgDir, relPath);
        if (!fs.existsSync(src)) continue;
        // Symlink target is relative to .bin/ parent dir (node_modules)
        const dst = path.join(BIN_DIR, name);
        fs.symlinkSync(path.relative(BIN_PARENT, src), dst);
        count++;
      } catch (e) {
        errors++;
      }
    }
  }

  // Walk subdirs
  let entries;
  try {
    entries = fs.readdirSync(pkgDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isDirectory() && e.name !== '.bin' && !e.name.startsWith('.')) {
      walk(path.join(pkgDir, e.name));
    }
  }
}

// Important: start by walking node_modules itself so we descend into its
// subdirectories. Skip linkBins's pkg.bin check on node_modules itself
// (it has no package.json), but the recursion does the work.
walk(NM);

console.log(`relinked ${count} binaries (${errors} errors)`);
