#!/bin/bash
# =============================================================================
# deploy-fly.sh — One-shot Fly.io deploy for NanoProof Protocol
#
# Prerequisites (one-time):
#   1. Install fly CLI: curl -L https://fly.io/install.sh | sh
#   2. Sign in: fly auth login  (browser opens, sign in with GitHub)
#   3. Add to PATH: export PATH="$HOME/.fly/bin:$PATH"
#
# Usage:
#   cd nanoproof-protocol
#   bash scripts/deploy-fly.sh
#
# This script will:
#   1. Create nanoproof-db (Postgres, 1GB free)
#   2. Launch nanoproof-api (Dockerfile build, port 4000)
#   3. Set DATABASE_URL on api (auto-attached to nanoproof-db)
#   4. Set CORS_ORIGINS on api (pointing to web URL)
#   5. Launch nanoproof-web (Dockerfile build, port 3000)
#   6. Set NEXT_PUBLIC_API_URL on web (pointing to api URL)
#   7. Deploy both
#   8. Print final URLs + verification commands
#
# All Fly operations are idempotent — safe to re-run.
# =============================================================================

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No color

step() { echo -e "\n${BLUE}==>${NC} ${1}"; }
ok() { echo -e "${GREEN}✓${NC} ${1}"; }
warn() { echo -e "${YELLOW}⚠${NC} ${1}"; }
err() { echo -e "${RED}✗${NC} ${1}"; exit 1; }

# -----------------------------------------------------------------------------
# Preflight
# -----------------------------------------------------------------------------
step "Preflight checks"

command -v fly >/dev/null 2>&1 || err "fly CLI not found. Install: curl -L https://fly.io/install.sh | sh"
ok "fly CLI installed: $(fly version)"

# Check auth (will fail if not signed in)
fly auth whoami >/dev/null 2>&1 || err "Not signed in. Run: fly auth login"
ok "Signed in as $(fly auth whoami)"

# Confirm we're in the repo root
[ -f "fly.api.toml" ] || err "fly.api.toml not found. cd into the nanoproof-protocol repo root."
[ -f "fly.web.toml" ] || err "fly.web.toml not found."
[ -f "apps/api/Dockerfile" ] || err "apps/api/Dockerfile not found."
[ -f "apps/web/Dockerfile" ] || err "apps/web/Dockerfile not found."
ok "Repo structure verified"

# -----------------------------------------------------------------------------
# Step 1: Postgres database
# -----------------------------------------------------------------------------
step "Step 1: Create nanoproof-db (Postgres)"
DB_EXISTS=$(fly postgres list --json 2>/dev/null | python3 -c "
import sys, json
try:
    dbs = json.load(sys.stdin)
    print('1' if any(db.get('Name') == 'nanoproof-db' for db in dbs) else '0')
except:
    print('0')
" 2>/dev/null || echo "0")

if [ "$DB_EXISTS" = "1" ]; then
  ok "nanoproof-db already exists, skipping create"
else
  fly postgres create --name nanoproof-db --region iad --vm-size shared-cpu-1x --volume-size 1
  ok "nanoproof-db created"
fi

# Get the connection string for later use
step "Attaching nanoproof-db to nanoproof-api (sets DATABASE_URL)"

# Create the api app first if it doesn't exist (so attach has a target)
APP_EXISTS=$(fly apps list --json 2>/dev/null | python3 -c "
import sys, json
try:
    apps = json.load(sys.stdin)
    print('1' if any(a.get('Name') == 'nanoproof-api' for a in apps) else '0')
except:
    print('0')
" 2>/dev/null || echo "0")

if [ "$APP_EXISTS" = "0" ]; then
  step "Creating nanoproof-api app"
  fly apps create nanoproof-api
  ok "nanoproof-api app created"
fi

# Attach (idempotent — Fly handles re-attach gracefully)
fly postgres attach nanoproof-db --app nanoproof-api 2>&1 | grep -E "(Created|already|Attached)" || true
ok "DATABASE_URL set on nanoproof-api"

# -----------------------------------------------------------------------------
# Step 2: Deploy API
# -----------------------------------------------------------------------------
step "Step 2: Deploy nanoproof-api"
fly deploy --config fly.api.toml --dockerfile apps/api/Dockerfile --strategy rolling

ok "nanoproof-api deployed"

# Set the CORS_ORIGINS to point to the web URL
WEB_URL="https://nanoproof-web.fly.dev"
step "Setting CORS_ORIGINS=$WEB_URL on nanoproof-api"
fly secrets set --app nanoproof-api CORS_ORIGINS="$WEB_URL"
ok "CORS_ORIGINS set"

# -----------------------------------------------------------------------------
# Step 3: Deploy Web
# -----------------------------------------------------------------------------
step "Step 3: Deploy nanoproof-web"

# Create web app if it doesn't exist
WEB_EXISTS=$(fly apps list --json 2>/dev/null | python3 -c "
import sys, json
try:
    apps = json.load(sys.stdin)
    print('1' if any(a.get('Name') == 'nanoproof-web' for a in apps) else '0')
except:
    print('0')
" 2>/dev/null || echo "0")

if [ "$WEB_EXISTS" = "0" ]; then
  fly apps create nanoproof-web
  ok "nanoproof-web app created"
fi

fly deploy --config fly.web.toml --dockerfile apps/web/Dockerfile --strategy rolling
ok "nanoproof-web deployed"

# Set NEXT_PUBLIC_API_URL
API_URL="https://nanoproof-api.fly.dev"
step "Setting NEXT_PUBLIC_API_URL=$API_URL on nanoproof-web"
fly secrets set --app nanoproof-web NEXT_PUBLIC_API_URL="$API_URL"
ok "NEXT_PUBLIC_API_URL set"

# -----------------------------------------------------------------------------
# Step 4: Verify
# -----------------------------------------------------------------------------
step "Step 4: Verification"

echo ""
echo "Waiting 30s for services to fully start..."
sleep 30

echo ""
echo "API health check:"
curl -sS -m 30 https://nanoproof-api.fly.dev/health || warn "API not responding yet (cold start can take 30-60s)"

echo ""
echo ""
echo "Web homepage status:"
curl -sSI -m 30 https://nanoproof-web.fly.dev 2>&1 | head -3 || warn "Web not responding yet"

# -----------------------------------------------------------------------------
# Final summary
# -----------------------------------------------------------------------------
step "🎉 Deploy complete!"
cat <<EOF

Public URLs:
  API:      $API_URL
  API docs: $API_URL/docs
  Health:   $API_URL/health
  Web:      $WEB_URL
  Dash:     $WEB_URL/dashboard
  Research: $WEB_URL/research
  Simulator: $WEB_URL/simulator

Next steps:
  1. Open https://nanoproof-web.fly.dev/dashboard
  2. Click "Load demo dataset" in the sidebar
  3. Verify the KPI strip populates (100c / 500s / 1000cit / 1000pay)
  4. Check API health: curl $API_URL/health

If something didn't work:
  - fly logs --app nanoproof-api   # API logs
  - fly logs --app nanoproof-web   # Web logs
  - fly ssh console --app nanoproof-api   # SSH into the api container
EOF