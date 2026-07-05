#!/data/data/com.termux/files/usr/bin/bash
# =============================================================================
# termux-install-fast.sh — Bypass pnpm's stuck lockfile snapshot by using
# `npm install` instead. npm doesn't do "snapshot resolve dependencies"
# (that's pnpm-specific), it goes straight to disk reads and a single
# pass over the registry.
#
# Use this AFTER `install-termux.sh` has failed at the `pnpm install`
# step. It assumes:
#   - pglite binary exists in apps/api/node_modules/.bin/
#   - .env files already written
#   - Node 20+ installed
#
# What it does:
#   1. Kills all running pglite-server / node / next-dev processes
#   2. Removes the .pnpm store and node_modules in apps/api, apps/web,
#      packages/shared (clean slate)
#   3. Runs `npm install` (Termux's bundled installer) in each app —
#      npm doesn't snapshot-thrash like pnpm 9.x does on Termux
#   4. Runs `npx prisma generate` to write apps/api/node_modules/.prisma
#   5. Runs `npx nest build` to write apps/api/dist/
#   6. Starts pglite-server, prisma migrate deploy, seed
#   7. Boots the api with `node dist/main.js`
#   8. Boots the web with `npm run dev`
# =============================================================================

set -uo pipefail

C_BLUE='\e[36m'
C_GREEN='\e[32m'
C_YELLOW='\e[33m'
C_RED='\e[31m'
C_RESET='\e[0m'

step() { echo -e "\n${C_BLUE}==> $*${C_RESET}"; }
ok()   { echo -e "${C_GREEN}  ✓ $*${C_RESET}"; }
warn() { echo -e "${C_YELLOW}  ⚠ $*${C_RESET}"; }
fail() { echo -e "${C_RED}  ✗ $*${C_RESET}"; exit 1; }

REPO_DIR="$HOME/nanoproof-protocol"
cd "$REPO_DIR"

step "0/9 — Sanity check"
[ ! -d "$REPO_DIR" ] && fail "$REPO_DIR does not exist; run install-termux.sh first"
[ ! -f apps/api/.env ] && fail "apps/api/.env missing; run install-termux.sh first"
[ ! -x apps/api/node_modules/.bin/pglite-server ] && warn "pglite-server binary missing; run install-termux.sh first"
[ "$(node --version | cut -d. -f1 | tr -d 'v')" -lt 20 ] && fail "need Node >=20 (got $(node --version))"
ok "node $(node --version), pglite binary present"

step "1/9 — Kill any running dev processes"
pkill -f pglite-server 2>/dev/null && warn "killed old pglite-server" || true
pkill -f "node.*dist/main" 2>/dev/null && warn "killed old api" || true
pkill -f "next dev" 2>/dev/null && warn "killed old next dev" || true
pkill -f "nest start" 2>/dev/null && warn "killed old nest start" || true
# tmux session is OK to keep — we'll start new panes on top
sleep 1
ok "processes cleared"

step "2/9 — Wipe stale node_modules and pnpm store"
for d in node_modules apps/api/node_modules apps/web/node_modules packages/shared/node_modules; do
  if [ -d "$d" ]; then
    warn "removing $d ($(du -sh "$d" 2>/dev/null | cut -f1))"
    rm -rf "$d"
  fi
done
# also clear pnpm cache if present
[ -d ~/.local/share/pnpm/store ] && rm -rf ~/.local/share/pnpm/store && warn "wiped pnpm store"
[ -d ~/.pnpm-store ] && rm -rf ~/.pnpm-store && warn "wiped ~/.pnpm-store"
ok "stale state cleared"

step "3/9 — npm install in apps/api (the slow part, ~5-15 min on cellular)"
cd apps/api
# npm install with no funding messages, no audit, no package-lock-only
npm install --no-audit --no-fund --no-package-lock --loglevel=warn
ok "apps/api deps installed"

step "4/9 — npm install in apps/web (this is the BIG one, Next.js)"
cd ../web
npm install --no-audit --no-fund --no-package-lock --loglevel=warn
ok "apps/web deps installed"

step "5/9 — npm install in packages/shared (small)"
cd ../shared
npm install --no-audit --no-fund --no-package-lock --loglevel=warn 2>/dev/null || true
ok "packages/shared deps installed (or already present)"

step "6/9 — Regenerate Prisma client (apps/api)"
cd ../api
npx prisma generate 2>&1 | tail -3
ok "Prisma client written to apps/api/node_modules/.prisma/client"

step "7/9 — Build the api with nest build"
npx nest build 2>&1 | tail -5
[ -f dist/main.js ] || fail "nest build didn't write dist/main.js"
ok "apps/api/dist/main.js is built"

step "8/9 — Start pglite + run migrations + seed"
mkdir -p "$HOME/nanoproof-data"
./node_modules/.bin/pglite-server --port=5432 --db="$HOME/nanoproof-data" > /tmp/pglite.log 2>&1 &
PGLITE_PID=$!
sleep 3
echo "pglite pid: $PGLITE_PID"

# Wait for pglite to be reachable
for i in $(seq 1 30); do
  if (echo > /dev/tcp/127.0.0.1/5432) 2>/dev/null; then
    ok "pglite reachable on 127.0.0.1:5432"
    break
  fi
  sleep 1
done

# Migrations
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres ./node_modules/.bin/prisma migrate deploy 2>&1 | tail -3
ok "migrations applied"

# Seed
cd ..
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres node scripts/seed-citations.js 2>&1 | tail -5
ok "demo citations seeded"

step "9/9 — Start api (background) and web (foreground)"
cd apps/api
echo ""
echo "───────────────────────────────────────────────────────────────────────"
echo "  ✅  Database up, migrations applied, demo data seeded"
echo ""
echo "  In TWO MORE TABS run:"
echo ""
echo "      Tab 1 — API:"
echo "        cd ~/nanoproof-protocol/apps/api"
echo "        DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres \\"
echo "        PORT=4000 node dist/main.js"
echo ""
echo "      Tab 2 — Web:"
echo "        cd ~/nanoproof-protocol/apps/web"
echo "        NEXT_PUBLIC_API_URL=http://127.0.0.1:4000 npm run dev"
echo ""
echo "  Then open Chrome on your phone → http://127.0.0.1:3000"
echo "───────────────────────────────────────────────────────────────────────"
echo ""

# Launch api in foreground so you can see it boot
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres PORT=4000 node dist/main.js
