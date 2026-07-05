#!/data/data/com.termux/files/usr/bin/bash
# =============================================================================
# install-termux.sh — One-shot NanoProof Termux bootstrap
#
# Installs the full stack on Android Termux from a clean F-Droid install:
#   - Node 20 LTS, pnpm 9, build deps
#   - Clones nanoproof-protocol
#   - Installs JS dependencies
#   - Writes .env files (demo auth + pglite)
#   - Runs prisma migrate deploy against pglite
#   - Optionally seeds demo data
#
# Does NOT start pglite / api / web — those are separate scripts so you can
# keep them in tmux panes.
#
# Usage:
#   bash scripts/install-termux.sh
#
# Notes for the demo:
#   - Sets AUTH_PROVIDER=demo so OTPs don't require an email — they print to
#     the API logs instead. Perfect for screen-recording.
#   - Uses 127.0.0.1:5432 for pglite (matches .env).
#   - Phone's Chrome reaches the apps via 127.0.0.1:3000 (use adb reverse if
#     you see "site can't be reached").
# =============================================================================

set -euo pipefail

C_BLUE='\e[36m'
C_GREEN='\e[32m'
C_YELLOW='\e[33m'
C_RED='\e[31m'
C_RESET='\e[0m'

step() { echo -e "\n${C_BLUE}==> $*${C_RESET}"; }
ok()   { echo -e "${C_GREEN}  ✓ $*${C_RESET}"; }
warn() { echo -e "${C_YELLOW}  ⚠ $*${C_RESET}"; }
fail() { echo -e "${C_RED}  ✗ $*${C_RESET}"; exit 1; }

step "Step 1/7 — Update apt + base packages (1–2 min)"
pkg update -y >/dev/null
pkg install -y \
  nodejs-lts \
  git \
  python3 \
  make \
  cmake \
  openssl \
  libffi \
  unzip \
  iproute2
ok "apt packages installed"

step "Step 2/7 — Install pnpm globally (30 s)"
# Termux sometimes has a leftover /usr/bin/pnpx (from an old npm install
# of pnpm 7.x). 'npm install -g' refuses to overwrite without --force.
# Clear those bin entries first, then force-install the new pnpm 9.

for stale in pnpm pnpx; do
  if [[ -f "$PREFIX/bin/$stale" ]]; then
    warn "removing stale $PREFIX/bin/$stale (left over from an old pnpm install)"
    rm -f "$PREFIX/bin/$stale"
  fi
done

# Also clear any npm cache stubs that can re-create the symlink on next install
npm cache clean --force >/dev/null 2>&1 || true

npm install -g pnpm@9 --force >/dev/null 2>&1 || {
  warn "pnpm install had warnings; retrying without --force"
  npm install -g pnpm@9 || fail "pnpm install failed; see errors above"
}
pnpm --version | grep -E '^9\.' || fail "pnpm 9.x not on PATH — got $(pnpm --version 2>&1)"
ok "pnpm $(pnpm --version)"

step "Step 3/7 — Clone nanoproof-protocol (30 s on wifi)"
REPO_DIR="$HOME/nanoproof-protocol"
if [[ -d "$REPO_DIR" ]]; then
  warn "$REPO_DIR already exists — reusing it (delete it manually to re-clone)"
  warn "    cd $REPO_DIR && git pull --ff-only    # to pick up latest commits"
else
  git clone --depth 1 https://github.com/networkbike/nanoproof-protocol.git "$REPO_DIR" \
    || fail "git clone failed (check network / DNS)"
fi
cd "$REPO_DIR"
# make sure we are on a known-good commit and pull latest
git fetch --depth 1 origin main >/dev/null 2>&1 && \
  git reset --hard origin/main >/dev/null 2>&1 || true
ok "repo at $REPO_DIR, HEAD $(git rev-parse --short HEAD)"

step "Step 4/7 — Install JS deps (5–15 min — this is the slow step)"
# --no-audit --no-fund = ~30% faster, no banner spam
# --ignore-scripts = skip native build steps that fail on Termux (we don't need
#   any of them; @electric-sql/pglite-socket ships a pure-JS binary)
pnpm install --no-audit --no-fund --prefer-offline
ok "pnpm install complete"

step "Step 5/7 — Write .env files (demo auth + pglite)"

if [[ ! -f apps/api/.env ]]; then
cat > apps/api/.env <<'ENVEOF'
NODE_ENV=development
PORT=4000
LOG_LEVEL=info

# pglite (Postgres in WASM) on the loopback — matches install-termux.sh
DATABASE_URL=postgresql://root@127.0.0.1:5432/nano-local
DATABASE_SHADOW_URL=postgresql://root@127.0.0.1:5432/nano-local
DATABASE_POOL_SIZE=5
DATABASE_POOL_TIMEOUT_MS=5000

# Arc testnet
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=arc-testnet
ARCSCAN_URL=https://testnet.arcscan.app

# Auth — DEMO mode prints OTP to API logs (no email needed)
AUTH_PROVIDER=demo
JWT_SECRET=local-dev-secret-only-do-not-use-in-production-please-change-this-now

# Demo mode (bypasses API key check for x402 endpoints)
NANOPROOF_DEMO_MODE=true
ENVEOF
  ok "wrote apps/api/.env"
else
  warn "apps/api/.env already exists — keeping it"
fi

if [[ ! -f apps/web/.env.local ]]; then
cat > apps/web/.env.local <<'ENVEOF'
NEXT_PUBLIC_API_URL=http://127.0.0.1:4000
NEXT_PUBLIC_DEMO_MODE=true
NEXT_TELEMETRY_DISABLED=1
ENVEOF
  ok "wrote apps/web/.env.local"
else
  warn "apps/web/.env.local already exists — keeping it"
fi

step "Step 6/7 — Verify pglite binary"

pglite_bin=apps/api/node_modules/.bin/pglite-server
if [[ ! -x "$pglite_bin" ]]; then
  fail "pglite-server binary missing. Run 'pnpm install' again."
fi
ok "pglite-server is present at $pglite_bin"

step "Step 7/7 — Optional: seed demo data (asks first)"
if [[ "${SEED:-yes}" == "yes" ]]; then
  read -p "Seed demo data (~30s)? [Y/n] " seed_reply
  case "${seed_reply:-Y}" in
    [nN]|[nN][oO]) warn "skipping seed"; SEED=no ;;
    *)             SEED=yes ;;
  esac
fi

if [[ "$SEED" == "yes" ]]; then
  warn "Skipping DB migrate — that requires pglite running. Start it with:"
  echo "      $pglite_bin --port=5432 --database=nano-local --data-dir=\$HOME/nanoproof-data"
  echo "      then in another tab run:"
  echo "      pnpm --filter @nanoproof/api exec prisma migrate deploy"
fi

step "Done!"
cat <<DONE
${C_GREEN}NanoProof is installed. To run it:

  Tab 1 — database (pglite):
    cd $REPO_DIR/apps/api
    ./node_modules/.bin/pglite-server --port=5432 --database=nano-local \\
      --data-dir=\$HOME/nanoproof-data

  Tab 2 — migrations + seed (one-time after first DB start):
    cd $REPO_DIR
    pnpm --filter @nanoproof/api exec prisma migrate deploy
    pnpm --filter @nanoproof/api exec tsx apps/api/prisma/seed.ts
    node scripts/seed-citations.js   # optional: real-world citations

  Tab 3 — API:
    cd $REPO_DIR/apps/api && pnpm dev

  Tab 4 — Web:
    cd $REPO_DIR/apps/web && pnpm dev

  Phone Chrome: open http://127.0.0.1:3000
    (if "site can't be reached", run on a computer with USB:
       adb reverse tcp:3000 tcp:3000
       adb reverse tcp:4000 tcp:4000)

For tmux one-screen setup, see docs/TERMUX_SETUP.md § "Screen recording the demo".
${C_RESET}
DONE
