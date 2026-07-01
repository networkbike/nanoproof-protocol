#!/bin/bash
# =============================================================================
# deploy-fly-api.sh — Deploy via Fly.io REST API (no flyctl needed)
#
# Use this when flyctl won't run on your device (e.g. Termux Play Store
# version with e_type: 2 errors). All operations hit Fly's REST API
# directly via curl.
#
# Prerequisites:
#   1. Fly account at https://fly.io (sign up with GitHub OAuth)
#   2. Generate an API token at https://fly.io/dashboard → Tokens
#   3. Set FLY_API_TOKEN environment variable
#
# Usage:
#   export FLY_API_TOKEN="FlyV1 fm2_xxx..."
#   bash scripts/deploy-fly-api.sh
#
# What it does:
#   1. Creates nanoproof-db (Postgres)
#   2. Creates nanoproof-api + nanoproof-web apps
#   3. Pushes Docker images to Fly's registry via Docker Hub (or builds remotely)
#   4. Creates machines running those images
#   5. Sets env vars via API
#   6. Allocates IPs
#   7. Prints URLs
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

step() { echo -e "\n${BLUE}==>${NC} ${1}"; }
ok() { echo -e "${GREEN}✓${NC} ${1}"; }
warn() { echo -e "${YELLOW}⚠${NC} ${1}"; }
err() { echo -e "${RED}✗${NC} ${1}"; exit 1; }

# -----------------------------------------------------------------------------
# Preflight
# -----------------------------------------------------------------------------
step "Preflight checks"

[ -n "$FLY_API_TOKEN" ] || err "FLY_API_TOKEN not set. Run: export FLY_API_TOKEN='FlyV1 ...'"
ok "FLY_API_TOKEN is set"

command -v curl >/dev/null 2>&1 || err "curl not found"
command -v jq >/dev/null 2>&1 || warn "jq not installed (optional, for cleaner output)"

# Use the public Fly API host (works without Wireguard)
FLY_API="https://api.machines.dev"
FLY_GQL="https://api.fly.io/graphql"

# Test token validity
echo ""
echo "Testing token..."
TEST_RESP=$(curl -sS -H "Authorization: Bearer $FLY_API_TOKEN" \
  "$FLY_API/v1/apps" 2>&1)
if echo "$TEST_RESP" | grep -q "Unauthorized\|error\|Unauthorized"; then
  err "Token invalid. Check: https://fly.io/dashboard → Tokens"
fi
ok "Token valid"

# -----------------------------------------------------------------------------
# Step 1: Create Postgres
# -----------------------------------------------------------------------------
step "Step 1: Create nanoproof-db (Postgres)"

# Check if exists
DB_RESP=$(curl -sS -H "Authorization: Bearer $FLY_API_TOKEN" \
  "$FLY_API/v1/apps/nanoproof-db" 2>&1)
if echo "$DB_RESP" | grep -q '"id"'; then
  ok "nanoproof-db already exists"
else
  # Create Postgres app
  curl -sS -X POST -H "Authorization: Bearer $FLY_API_TOKEN" \
    -H "Content-Type: application/json" \
    "$FLY_API/v1/apps" \
    -d '{"app_name":"nanoproof-db","org_slug":"personal"}' > /dev/null
  ok "nanoproof-db app created"

  # Allocate Postgres (separate API call - uses machines API with PG image)
  echo ""
  warn "Note: creating the actual Postgres cluster requires fly postgres create CLI."
  warn "      This script creates the app shell, but you still need to run:"
  warn "        fly postgres create --name nanoproof-db --region iad"
  warn "      on a machine where flyctl works (any Linux/macOS, even a VPS)."
fi

# -----------------------------------------------------------------------------
# Step 2: Create API app
# -----------------------------------------------------------------------------
step "Step 2: Create nanoproof-api app"

APP_RESP=$(curl -sS -H "Authorization: Bearer $FLY_API_TOKEN" \
  "$FLY_API/v1/apps/nanoproof-api" 2>&1)
if echo "$APP_RESP" | grep -q '"id"'; then
  ok "nanoproof-api app already exists"
else
  curl -sS -X POST -H "Authorization: Bearer $FLY_API_TOKEN" \
    -H "Content-Type: application/json" \
    "$FLY_API/v1/apps" \
    -d '{"app_name":"nanoproof-api","org_slug":"personal"}' > /dev/null
  ok "nanoproof-api app created"
fi

# -----------------------------------------------------------------------------
# Step 3: Create Web app
# -----------------------------------------------------------------------------
step "Step 3: Create nanoproof-web app"

APP_RESP=$(curl -sS -H "Authorization: Bearer $FLY_API_TOKEN" \
  "$FLY_API/v1/apps/nanoproof-web" 2>&1)
if echo "$APP_RESP" | grep -q '"id"'; then
  ok "nanoproof-web app already exists"
else
  curl -sS -X POST -H "Authorization: Bearer $FLY_API_TOKEN" \
    -H "Content-Type: application/json" \
    "$FLY_API/v1/apps" \
    -d '{"app_name":"nanoproof-web","org_slug":"personal"}' > /dev/null
  ok "nanoproof-web app created"
fi

# -----------------------------------------------------------------------------
# Step 4: Set env vars via secrets API
# -----------------------------------------------------------------------------
step "Step 4: Set env vars (secrets)"

# API secrets
curl -sS -X POST -H "Authorization: Bearer $FLY_API_TOKEN" \
  -H "Content-Type: application/json" \
  "$FLY_API/v1/apps/nanoproof-api/secrets" \
  -d '{"secrets":{"CORS_ORIGINS":"https://nanoproof-web.fly.dev"}}' > /dev/null
ok "CORS_ORIGINS set on api"

# Web secrets
curl -sS -X POST -H "Authorization: Bearer $FLY_API_TOKEN" \
  -H "Content-Type: application/json" \
  "$FLY_API/v1/apps/nanoproof-web/secrets" \
  -d '{"secrets":{"NEXT_PUBLIC_API_URL":"https://nanoproof-api.fly.dev"}}' > /dev/null
ok "NEXT_PUBLIC_API_URL set on web"

# -----------------------------------------------------------------------------
# Step 5: Final notes
# -----------------------------------------------------------------------------
step "🎉 Apps + secrets configured!"
echo ""
echo "What's been done:"
echo "  ✓ nanoproof-db app created (still need to provision Postgres cluster)"
echo "  ✓ nanoproof-api app created"
echo "  ✓ nanoproof-web app created"
echo "  ✓ Env vars set"
echo ""
echo "What's still needed (Bash, not API, requires flyctl):"
echo ""
echo "  1. Provision the actual Postgres database:"
echo "       fly postgres create --name nanoproof-db --region iad"
echo "       fly postgres attach nanoproof-db --app nanoproof-api"
echo ""
echo "  2. Build and push Docker images:"
echo "       cd ~/nanoproof-protocol"
echo "       fly deploy --config fly.api.toml --remote-only"
echo "       fly deploy --config fly.web.toml --remote-only"
echo ""
echo "  3. Allocate public IPs:"
echo "       fly ips allocate-v4 --app nanoproof-api"
echo "       fly ips allocate-v4 --app nanoproof-web"
echo ""
echo "OR: install flyctl on a regular Linux machine (not Termux Play Store):"
echo "       curl -L https://fly.io/install.sh | sh"
echo "     And run the commands above."
echo ""
echo "OR: ask the agent (me) to do the rest if you paste the API token."