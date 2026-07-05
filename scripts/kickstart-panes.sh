#!/data/data/com.termux/files/usr/bin/bash
# =============================================================================
# kickstart-panes.sh — Force a clean rebuild of api + web inside the tmux
# session 'nano', without restarting pglite. Run this from inside tmux when
# pane 3 (api) and pane 4 (web) appear stuck.
#
# Usage:
#   # From inside tmux pane 0 (db · pglite):
#   bash ~/nanoproof-protocol/scripts/kickstart-panes.sh
#
# What it does:
#   - Re-installs only the missing pieces in apps/api and apps/web
#     (prefer-offline, no fetch storm).
#   - Regenerates Prisma client.
#   - Rebuilds apps/api with nest build (so dist/main.js exists).
#   - Replaces pane 3 (api) with: DATABASE_URL=... node dist/main.js
#   - Replaces pane 4 (web) with: NEXT_PUBLIC_API_URL=... pnpm dev
#
# pglite is left alone.
# =============================================================================

set -uo pipefail

C_BLUE='\e[36m'
C_GREEN='\e[32m'
C_YELLOW='\e[33m'
C_RESET='\e[0m'

step() { echo -e "\n${C_BLUE}==> $*${C_RESET}"; }
ok()   { echo -e "${C_GREEN}  ✓ $*${C_RESET}"; }
warn() { echo -e "${C_YELLOW}  ⚠ $*${C_RESET}"; }

REPO_DIR="$HOME/nanoproof-protocol"
cd "$REPO_DIR"

step "Step 1/5 — Make sure pglite is still up"
if (echo > /dev/tcp/127.0.0.1/5432) 2>/dev/null; then
  ok "pglite on 127.0.0.1:5432 reachable"
else
  warn "pglite not reachable — start it manually first:"
  echo "    cd apps/api && ./node_modules/.bin/pglite-server --port=5432 --db=\$HOME/nanoproof-data"
  return 1 2>/dev/null || exit 1
fi

step "Step 2/5 — Re-install apps/api deps (prefer-offline, ~30 s)"
cd apps/api
pnpm install --prefer-offline --silent || warn "pnpm install had warnings"
ok "apps/api deps installed"

step "Step 3/5 — Generate Prisma client (writes apps/api/node_modules/.prisma/client)"
./node_modules/.bin/prisma generate 2>&1 | tail -3
ok "Prisma client generated"

step "Step 4/5 — Build apps/api (writes apps/api/dist/)"
# If turbo is misbehaving, build directly:
rm -rf dist
./node_modules/.bin/nest build 2>&1 | tail -3
if [[ ! -f dist/main.js ]]; then
  warn "nest build didn't produce dist/main.js; aborting"
  exit 1
fi
ok "dist/main.js exists — api is buildable"

step "Step 5/5 — Restart api pane (pane 3) and web pane (pane 4)"

# Replace pane 3 (api) — we'll send Ctrl-c first to kill any running command
tmux send-keys -t nano:0.2 C-c
sleep 1
tmux send-keys -t nano:0.2 "clear" C-m
tmux send-keys -t nano:0.2 "DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres PORT=4000 node dist/main.js 2>&1 | tee \$HOME/nano-logs/api.log" C-m

# Replace pane 4 (web) — same idea
tmux send-keys -t nano:0.3 C-c
sleep 1
tmux send-keys -t nano:0.3 "clear" C-m
tmux send-keys -t nano:0.3 "cd ../../apps/web && NEXT_PUBLIC_API_URL=http://127.0.0.1:4000 pnpm dev 2>&1 | tee \$HOME/nano-logs/web.log" C-m

ok "Panes 3 and 4 restarted. Switch to them and watch:"
echo "    Ctrl-b then o (cycle focus), or tap pane directly."
echo "    Look for \`\u{1F680} API listening at http://127.0.0.1:4000\` on pane 3."
echo "    Look for \`Local: http://127.0.0.1:3000\` on pane 4."
echo ""
echo "After both are up, open Chrome on the phone at http://127.0.0.1:3000"

return 0 2>/dev/null || true
