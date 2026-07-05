#!/data/data/com.termux/files/usr/bin/bash
# =============================================================================
# termux-minimal.sh — Bare-minimum Termux bootstrap. No pnpm, no fancy
# scripts that can hang. One npm install per app, then we hand-control
# over to the user.
#
# Designed to be the LAST thing that fails. Each step is independent
# and self-reporting; if any step fails, the script stops with a clear
# error message.
# =============================================================================

set -e

C_BLUE='\e[36m'; C_GREEN='\e[32m'; C_YELLOW='\e[33m'; C_RED='\e[31m'; C_RESET='\e[0m'
step() { echo -e "\n${C_BLUE}==> $*${C_RESET}"; }
ok()   { echo -e "${C_GREEN}  ✓ $*${C_RESET}"; }
warn() { echo -e "${C_YELLOW}  ⚠ $*${C_RESET}"; }
fail() { echo -e "${C_RED}  ✗ $*${C_RESET}"; exit 1; }

# Absolute paths so we can call from anywhere
cd ~/nanoproof-protocol
REPO=$(pwd)
PREFIX="$PREFIX"

step "0. Confirm we're in the right place"
[ -d "$REPO/apps/api" ] || fail "not in nanoproof-protocol root"
[ -d "$REPO/apps/web" ] || fail "missing apps/web"
[ -d "$REPO/packages/shared" ] || fail "missing packages/shared"
ok "repo at $REPO"

step "1. Make sure pkg and node are present"
command -v node >/dev/null || fail "node missing — pkg install nodejs-lts"
command -v npm  >/dev/null || fail "npm missing"
NODE_V=$(node --version | tr -d 'v')
NODE_MAJOR=$(echo "$NODE_V" | cut -d. -f1)
[[ "$NODE_MAJOR" -ge 20 ]] || fail "need node 20+, got $NODE_V"
ok "node $NODE_V, npm $(npm --version)"

step "2. Wipe existing node_modules (avoid stale cache messes)"
for d in node_modules apps/api/node_modules apps/web/node_modules packages/shared/node_modules packages/agent/node_modules; do
  [ -d "$d" ] && rm -rf "$d" && echo "  removed $d"
done
[ -d "$HOME/.local/share/pnpm" ] && rm -rf "$HOME/.local/share/pnpm" && echo "  removed pnpm store"
ok "fresh slate"

step "3. Build the @nanoproof/shared package (so it's ready as a file dep)"
cd "$REPO/packages/shared"
[ -f package.json ] || fail "packages/shared/package.json missing"
# Build first if there's a build script
node -e "const p=require('./package.json'); if(p.scripts && p.scripts.build){require('child_process').execSync('npm install --no-audit --no-fund --no-package-lock',{stdio:'inherit'})} else { process.exit(0) }" || true
[ -d dist ] && ok "shared/dist present" || warn "shared/dist missing — that's OK if it's pure TS"

step "4. Build the @nanoproof/agent package"
cd "$REPO/packages/agent"
[ -f package.json ] || fail "packages/agent/package.json missing"
node -e "const p=require('./package.json'); if(p.scripts && p.scripts.build){require('child_process').execSync('npm install --no-audit --no-fund --no-package-lock',{stdio:'inherit'})} else { process.exit(0) }" || true
[ -d dist ] && ok "agent/dist present" || warn "agent/dist missing — that's OK"

step "5. Install apps/api deps (uses file:../packages/shared — should work)"
cd "$REPO/apps/api"
time npm install --no-audit --no-fund --no-package-lock --loglevel=warn 2>&1 | tail -10
[ -d node_modules/@nestjs ] || fail "apps/api/node_modules/@nestjs missing — install failed"
ok "apps/api has @nestjs/*"

# npm sometimes leaves node_modules/.bin/ without 'nest' symlinks
echo "  relinking node_modules/.bin/ ..."
rm -rf node_modules/.bin; mkdir -p node_modules/.bin
node -e "
const fs=require('fs'),path=require('path');
function linkBins(pkgDir,seen){
  if(seen.has(pkgDir))return;seen.add(pkgDir);
  try{const pkg=JSON.parse(fs.readFileSync(path.join(pkgDir,'package.json'),'utf8'));
    if(pkg.bin){const e=typeof pkg.bin==='string'?{[pkg.name.split('/').pop()]:pkg.bin}:pkg.bin;
      for(const[n,r] of Object.entries(e)){const s=path.join(pkgDir,r),d=path.join(pkgDir,'..','.bin',n);
        if(fs.existsSync(s)&&!fs.existsSync(d))try{fs.symlinkSync(path.relative(path.dirname(d),s),d);}catch(_){}}}
  }catch(_){}
  for(const x of fs.readdirSync(pkgDir,{withFileTypes:true}))if(x.isDirectory()&&x.name[0]!=='.'&&x.name!=='node_modules')linkBins(path.join(pkgDir,x.name),seen);
}
linkBins('node_modules',new Set());
"
[ -L node_modules/.bin/nest ] || [ -f node_modules/.bin/nest ] || fail "after relink, nest still missing"
ok "node_modules/.bin linked"

step "6. Generate Prisma client (this writes apps/api/node_modules/.prisma/client)"
time ./node_modules/.bin/prisma generate 2>&1 | tail -10
[ -d node_modules/.prisma/client ] || fail ".prisma/client not written — prisma generate failed"
ok "Prisma client written"

step "7. Build the API"
time ./node_modules/.bin/nest build 2>&1 | tail -10
[ -f dist/main.js ] || fail "dist/main.js not built"
ok "dist/main.js is built"

step "8. Install apps/web deps (the BIG one, takes 5-10 min on cellular)"
cd "$REPO/apps/web"
time npm install --no-audit --no-fund --no-package-lock --loglevel=warn 2>&1 | tail -10
[ -d node_modules/next ] || fail "apps/web/node_modules/next missing — install failed"
ok "apps/web has next"

step "9. Done. Return to repo root and announce what's next."
cd "$REPO"
echo ""
echo "============================================================"
echo "  ✅  ALL DEPS INSTALLED + API BUILT"
echo "============================================================"
echo ""
echo "Now start the servers in 3 separate Termux tabs:"
echo ""
echo "─── Tab 1: database ───"
echo "  cd ~/nanoproof-protocol/apps/api"
echo "  mkdir -p ~/nanoproof-data"
echo "  ./node_modules/.bin/pglite-server --port=5432 --db=\$HOME/nanoproof-data"
echo "  # leave this tab open — shows pglite logs"
echo ""
echo "─── Tab 2: api ───"
echo "  cd ~/nanoproof-protocol/apps/api"
echo "  DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres \\"
echo "    PORT=4000 node dist/main.js"
echo "  # wait for: 🚀 API listening at http://127.0.0.1:4000"
echo ""
echo "─── Tab 3: web ───"
echo "  cd ~/nanoproof-protocol/apps/web"
echo "  NEXT_PUBLIC_API_URL=http://127.0.0.1:4000 npm run dev"
echo "  # wait for: Local: http://127.0.0.1:3000"
echo ""
echo "─── Chrome on the phone ───"
echo "  http://127.0.0.1:3000"
echo ""
echo "─── One-time only, Tab 2 or 1 (after Tab 1 is up): ───"
echo "  cd ~/nanoproof-protocol/apps/api"
echo "  DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres \\"
echo "    ./node_modules/.bin/prisma migrate deploy"
echo "  DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres \\"
echo "    node ../scripts/seed-citations.js   # optional: real-world citations"
echo ""
