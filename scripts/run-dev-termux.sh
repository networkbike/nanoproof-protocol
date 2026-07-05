#!/data/data/com.termux/files/usr/bin/bash
# =============================================================================
# run-dev-termux.sh — One-tap launch for screen recording.
#
# After `bash scripts/install-termux.sh` has finished once, every subsequent
# recording session starts with:
#
#     bash scripts/run-dev-termux.sh
#
# What it does:
#   1. Kills any leftover pglite-server, nest, next dev processes from a
#      previous recording session.
#   2. Starts tmux with a 2x2 pane grid titled: db · migrate · api · web.
#   3. In each pane:
#        db      — pglite-server on 127.0.0.1:5432
#        migrate — runs prisma migrate deploy + seed + seed-citations
#        api     — npm run start:prod on :4000 (or pnpm dev for hot-reload)
#        web     — pnpm dev on :3000
#   4. Shows the URL Chrome should hit: http://127.0.0.1:3000
#
# After tmux is up, open http://127.0.0.1:3000 in your phone's Chrome
# (Chrome and Termux are both running on the same device, both can reach
# 127.0.0.1).
#
# To attach another tmux client (e.g. from Termux:Float), the session name is
# `nano`.
#
# To stop everything: Ctrl-b then ":kill-server" inside tmux.
# =============================================================================

set -euo pipefail

C_BLUE='\e[36m'
C_GREEN='\e[32m'
C_YELLOW='\e[33m'
C_RESET='\e[0m'

step() { echo -e "\n${C_BLUE}==> $*${C_RESET}"; }
ok()   { echo -e "${C_GREEN}  ✓ $*${C_RESET}"; }
warn() { echo -e "${C_YELLOW}  ⚠ $*${C_RESET}"; }

step "Step 1/4 — Kill any leftover dev processes"

# pglite
pkill -f pglite-server 2>/dev/null && warn "killed old pglite-server" || true
# nest api dev server
pkill -f "nest start" 2>/dev/null && warn "killed old nest start" || true
pkill -f "node.*dist/main" 2>/dev/null && warn "killed old api" || true
# next dev server
pkill -f "next dev" 2>/dev/null && warn "killed old next dev" || true

# Drop any half-open tmux sessions from earlier recordings
tmux has-session -t nano 2>/dev/null && {
  warn "killing existing tmux session 'nano'"
  tmux kill-session -t nano
} || true

# tiny settle wait so the ports free up cleanly
sleep 1
ok "processes cleaned"

step "Step 2/4 — Verify .env files exist"

REPO_DIR="$HOME/nanoproof-protocol"
if [[ ! -f "$REPO_DIR/apps/api/.env" || ! -f "$REPO_DIR/apps/web/.env.local" ]]; then
  warn ".env files missing — re-running install-termux.sh"
  bash "$REPO_DIR/scripts/install-termux.sh"
fi
ok "env files present"

step "Step 3/4 — Verify pglite-server + node_modules are installed"

if [[ ! -x "$REPO_DIR/apps/api/node_modules/.bin/pglite-server" ]]; then
  warn "node_modules missing in apps/api — running pnpm install"
  cd "$REPO_DIR"
  pnpm install --prefer-offline
fi
if [[ ! -d "$REPO_DIR/apps/api/dist" ]]; then
  warn "apps/api not built — running pnpm build for the api"
  cd "$REPO_DIR"
  pnpm --filter @nanoproof/api build
fi
ok "dependencies + build verified"

step "Step 4/4 — Start tmux with 2×2 pane grid"

DATA_DIR="$HOME/nanoproof-data"
mkdir -p "$DATA_DIR"

# Build the tmux session from scratch. Each pane runs a small helper snippet
# so you don't have to retype long commands every recording.
cd "$REPO_DIR"

# Pane 1: pglite database
PANE_DB='cd apps/api && ./node_modules/.bin/pglite-server --port=5432 --database=nano-local --data-dir=$HOME/nanoproof-data 2>&1 | tee /tmp/pglite.log'

# Pane 2: migrations + seed (waits for pglite to be ready)
PANE_MIGRATE='export DATABASE_URL=postgresql://root@127.0.0.1:5432/nano-local
cd apps/api
echo "==> waiting for pglite to come up…"
for i in $(seq 1 30); do
  if (echo > /dev/tcp/127.0.0.1/5432) 2>/dev/null; then break; fi
  sleep 1
done
echo "==> prisma migrate deploy"
./node_modules/.bin/prisma migrate deploy
echo ""
echo "==> seed (demo creators + wallets + sources)"
./node_modules/.bin/tsx prisma/seed.ts || true
echo ""
echo "==> seed-citations (real-world citations + Arc settlements)"
cd .. && DATABASE_URL=postgresql://root@127.0.0.1:5432/nano-local node scripts/seed-citations.js || true
echo ""
echo "✅ migrations + seed complete — keep this pane open to see logs."'

# Pane 3: API (background, no color so it reads well in a recording)
PANE_API='cd apps/api && DATABASE_URL=postgresql://root@127.0.0.1:5432/nano-local PORT=4000 node dist/main.js 2>&1 | tee /tmp/api.log'

# Pane 4: Web dashboard
PANE_WEB='cd apps/web && NEXT_PUBLIC_API_URL=http://127.0.0.1:4000 pnpm dev 2>&1 | tee /tmp/web.log'

# Start tmux session with pane 1, then split 3 times
tmux new-session -d -s nano -x 220 -y 50
tmux send-keys -t nano:0.0 "$PANE_DB" C-m
sleep 1
tmux split-window -t nano:0 -h
tmux send-keys -t nano:0.1 "$PANE_MIGRATE" C-m
sleep 1
tmux split-window -t nano:0 -v
tmux send-keys -t nano:0.2 "$PANE_API" C-m
sleep 1
tmux split-window -t nano:0 -v
tmux send-keys -t nano:0.3 "$PANE_WEB" C-m

# Make pane borders labeled
tmux select-pane -t nano:0.0 -T 'db · pglite'
tmux select-pane -t nano:0.1 -T 'migrate + seed'
tmux select-pane -t nano:0.2 -T 'api · :4000'
tmux select-pane -t nano:0.3 -T 'web · :3000'

# Reasonable status line at the bottom
tmux set -g status-bg black
tmux set -g status-fg white
tmux set -g pane-border-style fg=colour240
tmux set -g pane-active-border-style fg=colour46

tmux select-pane -t nano:0.3   # focus on web pane so it's the active one
tmux attach -t nano
