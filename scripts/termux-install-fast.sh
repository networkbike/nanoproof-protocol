#!/data/data/com.termux/files/usr/bin/bash
# =============================================================================
# termux-install-fast.sh — End-to-end NanoProof install on Termux.
#
# This is the SOLE script you should run for a fresh Termux install of
# NanoProof Protocol. It handles every quirk we discovered:
#
#   - pnpm's lockfile-snapshot thrashing on Node 24 + cellular
#     -> we use plain `npm install`
#   - pnpm workspace:* syntax that npm doesn't grok
#     -> package.json files use file: paths instead
#   - pnpm catalog: shorthand that npm rejects
#     -> real semver ranges are baked into package.json
#   - @nestjs/swagger@8 peer-dep mismatch with @nestjs/common@11
#     -> npm is told --legacy-peer-deps
#   - Prisma generate hanging forever on Termux (binaryTargets)
#     -> schema has NO binaryTargets; we use @prisma/adapter-pg only
#   - cross-package @nanoproof/shared symlinks broken under npm
#     -> after the api's npm install, we copy packages/shared into
#        apps/api/node_modules/@nanoproof/shared/ directly
#   - node_modules/.bin/ symlinks unreliable
#     -> we call binaries by full path: `node node_modules/.../bin/x.js`
#   - dist/main.js path mismatch (monorepo writes to dist/apps/api/src/main.js)
#     -> script uses the correct path consistently
#
# You should run this ONCE per phone. After it completes, just start
# the three Termux tabs (pglite, api, web) and Chrome will reach the
# server at http://127.0.0.1:3000.
#
# Usage:
#   bash scripts/termux-install-fast.sh
#
# Tests against a real Termux environment. Pull requests welcome for
# any additional edge case you discover.
# =============================================================================

set -uo pipefail

C_BLUE='\e[36m'; C_GREEN='\e[32m'; C_YELLOW='\e[33m'; C_RED='\e[31m'; C_RESET='\e[0m'
step() { echo -e "\n${C_BLUE}==> $*${C_RESET}"; }
ok()   { echo -e "${C_GREEN}  ✓ $*${C_RESET}"; }
warn() { echo -e "${C_YELLOW}  ⚠ $*${C_RESET}"; }
fail() { echo -e "${C_RED}  ✗ $*${C_RESET}"; exit 1; }

REPO_DIR="$HOME/nanoproof-protocol"
[ -d "$REPO_DIR" ] || fail "nanoproof-protocol not found at $REPO_DIR. Run install-termux.sh first."
cd "$REPO_DIR"

step "0/9 — Sanity checks"
[ "$(uname -m)" = "aarch64" ] || warn "Termux is meant for aarch64; saw $(uname -m). Most things will still work."
command -v node >/dev/null || fail "node missing: run 'pkg install nodejs-lts'"
command -v npm >/dev/null || fail "npm missing"
NODE_V=$(node --version | tr -d 'v')
NODE_MAJOR=$(echo "$NODE_V" | cut -d. -f1)
[[ "$NODE_MAJOR" -ge 20 ]] || fail "need Node 20+, got v$NODE_V"
ok "node v$NODE_V, npm $(npm --version), on $(uname -m)"

step "1/9 — Stop any leftover dev processes"
pkill -f pglite-server 2>/dev/null && warn "killed old pglite-server" || true
pkill -f "node.*dist/main" 2>/dev/null && warn "killed old api" || true
pkill -f "next dev" 2>/dev/null && warn "killed old next dev" || true
pkill -f "nest start" 2>/dev/null && warn "killed old nest start" || true
sleep 1
ok "old processes cleared"

step "2/9 — Wipe stale node_modules"
for d in node_modules apps/api/node_modules apps/web/node_modules packages/shared/node_modules packages/agent/node_modules; do
  [ -d "$d" ] && rm -rf "$d" && echo "  removed $d"
done
[ -d ~/.local/share/pnpm ] && rm -rf ~/.local/share/pnpm && warn "removed pnpm store"
ok "clean slate"

step "3/9 — Install packages/shared dependencies"
cd packages/shared
npm install --no-audit --no-fund --no-package-lock --legacy-peer-deps --loglevel=warn 2>&1 | tail -5
[ -d node_modules ] || fail "packages/shared/node_modules not created"
ok "shared deps installed"

step "4/9 — Build packages/shared (npm has no workspace linking; we pre-compile)"
# Wipe incremental build cache so we get a fresh emit every run
rm -rf dist tsconfig.tsbuildinfo .tsbuildinfo 2>/dev/null
npm run build 2>&1 | tail -5
[ -f dist/index.js ] || fail "packages/shared/dist/index.js not built"
ok "shared/dist built"

step "5/9 — Install apps/api dependencies"
cd ../../apps/api
npm install --no-audit --no-fund --no-package-lock --legacy-peer-deps --loglevel=warn 2>&1 | tail -5
[ -d node_modules/@nestjs ] || fail "apps/api/node_modules/@nestjs missing"
ok "apps/api deps installed"

# npm with file: creates a broken symlink for @nanoproof/shared. Replace
# it with a real directory copy because the runtime needs dist/ files.
step "6/9 — Copy packages/shared into apps/api (npm file: symlinks are broken for monorepos)"
rm -rf node_modules/@nanoproof/shared
mkdir -p node_modules/@nanoproof
cp -r ../../packages/shared node_modules/@nanoproof/
[ -f node_modules/@nanoproof/shared/dist/index.js ] || fail "shared copy failed"
ok "shared copied into apps/api/node_modules/@nanoproof/shared"

step "7/9 — Generate Prisma client"
# Call prisma via direct node path (no .bin/ symlink needed)
node node_modules/prisma/build/index.js generate 2>&1 | tail -5
[ -d node_modules/.prisma/client ] || fail ".prisma/client not written"
ok "Prisma client generated"

step "8/9 — Build apps/api (NestJS)"
# Wipe incremental build cache for a fresh emit
rm -rf dist tsconfig.tsbuildinfo 2>/dev/null
node node_modules/@nestjs/cli/bin/nest.js build 2>&1 | tail -10
[ -f dist/apps/api/src/main.js ] || fail "dist/apps/api/src/main.js not built"
ok "dist/apps/api/src/main.js built"

step "9/9 — Set up database and seed"
mkdir -p "$HOME/nanoproof-data" "$HOME/nano-logs"
# Make sure .env exists with the correct DATABASE_URL
if [ ! -f .env ]; then
  cat > .env <<'ENVEOF'
NODE_ENV=development
PORT=4000
LOG_LEVEL=info
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres
DATABASE_SHADOW_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres
DATABASE_POOL_SIZE=5
DATABASE_POOL_TIMEOUT_MS=5000
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=arc-testnet
ARCSCAN_URL=https://testnet.arcscan.app
AUTH_PROVIDER=demo
JWT_SECRET=local-dev-secret-only-do-not-use-in-production
NANOPROOF_DEMO_MODE=true
ENVEOF
  ok "wrote apps/api/.env"
fi

# Start pglite in background, run migrate, then stop it
# Try the bin symlink first, fall back to direct node path (Termux FUSE quirks)
PGLITE_CMD=""
if [ -x ./node_modules/.bin/pglite-server ]; then
  PGLITE_CMD="./node_modules/.bin/pglite-server"
elif [ -f node_modules/@electric-sql/pglite-socket/dist/scripts/server.js ]; then
  PGLITE_CMD="node node_modules/@electric-sql/pglite-socket/dist/scripts/server.js"
fi
[ -z "$PGLITE_CMD" ] && warn "could not find pglite-server binary; migrations will fail"
if [ -n "$PGLITE_CMD" ]; then
  $PGLITE_CMD --port=5432 --db="$HOME/nanoproof-data" > "$HOME/nano-logs/pglite-install.log" 2>&1 &
  PGLITE_PID=$!
  sleep 3
  for i in $(seq 1 20); do
    if (echo > /dev/tcp/127.0.0.1/5432) 2>/dev/null; then break; fi
    sleep 1
  done
  DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres node node_modules/prisma/build/index.js migrate deploy 2>&1 | tail -5
  ok "migrations applied"
  kill $PGLITE_PID 2>/dev/null
  sleep 1
fi

ok "ALL 9 STEPS COMPLETE"
echo ""
echo "============================================================"
echo "  ✅  API is installed and built."
echo "============================================================"
echo ""
echo "To run the full stack, open three more Termux tabs."
echo ""
echo "  Tab 1 (database) — paste this:"
echo "    cd $REPO_DIR/apps/api"
echo "    # If ./node_modules/.bin/pglite-server fails to start, use:"
echo "    #   node node_modules/@electric-sql/pglite-socket/dist/scripts/server.js --port=5432 --db=\$HOME/nanoproof-data"
echo "    ./node_modules/.bin/pglite-server --port=5432 --db=\$HOME/nanoproof-data 2>&1 | tee \$HOME/nano-logs/pglite.log"
echo "    # leave running; you should see: 'PGLiteSocketServer listening on {...port 5432...}'"
echo ""
echo "  Tab 2 (api) — paste this AFTER Tab 1 is up:"
echo "    cd $REPO_DIR/apps/api"
echo "    DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres \\"
echo "      PORT=4000 node dist/apps/api/src/main.js"
echo "    # leave running; you should see '🚀 API listening at http://127.0.0.1:4000'"
echo ""
echo "  Tab 3 (web) — paste this AFTER Tab 2 is up:"
echo "    cd $REPO_DIR/apps/web"
echo ""
echo "    npm install --no-audit --no-fund --no-package-lock --legacy-peer-deps --loglevel=warn"
echo "    cp .env.example .env.local"
echo "    cat > .env.local <<'NUXT_ENV'"
echo "    NEXT_PUBLIC_API_URL=http://127.0.0.1:4000"
echo "    NEXT_PUBLIC_DEMO_MODE=true"
echo "    NUXT_ENV"
echo ""
echo "    # Copy @nanoproof/shared into apps/web's node_modules too:"
echo "    cp -r ../api/node_modules/@nanoproof ." 2>/dev/null || true"
echo "    mkdir -p node_modules/@nanoproof"
echo "    cp -r ../../packages/shared node_modules/@nanoproof/"
echo "    cp -r ../../packages/agent   node_modules/@nanoproof/"
echo ""
echo "    npm run dev"
echo "    # leave running; you should see '▲ Next.js ... Local: http://127.0.0.1:3000'"
echo ""
echo "  Finally open Chrome on your phone and visit:"
echo "    http://127.0.0.1:3000"
echo ""
echo "If anything fails, screenshot the failing step and send it."
echo "We'll have you paste the next fix in minutes."
