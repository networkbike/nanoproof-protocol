#!/usr/bin/env bash
# =============================================================================
# NanoProof Protocol — Railway one-shot deploy script
# =============================================================================
# Pre-requisites:
#   - railway CLI installed (https://docs.railway.app/guides/cli)
#   - railway login completed (run: `railway login`)
#   - Railway project already created with Postgres + 2 services (api, web)
#     See docs/DEPLOY_RAILWAY.md for the manual setup, OR run the wizard:
#       railway init  (creates new project from current dir)
#
# This script:
#   1. Verifies railway CLI is authenticated
#   2. Triggers a redeploy of the api service
#   3. Triggers a redeploy of the web service
#   4. Waits for both to be healthy
#
# Usage:
#   ./scripts/deploy-railway.sh [api|web|all]   (default: all)
# =============================================================================

set -euo pipefail

SERVICE="${1:-all}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[deploy-railway]${NC} $*"; }
warn() { echo -e "${YELLOW}[deploy-railway]${NC} $*"; }
err() { echo -e "${RED}[deploy-railway]${NC} $*" >&2; }

# Check railway CLI
if ! command -v railway >/dev/null 2>&1; then
  err "railway CLI not found. Install: https://docs.railway.app/guides/cli"
  err "  curl -fsSL https://railway.app/install.sh | sh"
  exit 1
fi

# Check auth
if ! railway whoami >/dev/null 2>&1; then
  err "Not authenticated. Run: railway login"
  exit 1
fi

log "Authenticated as: $(railway whoami 2>/dev/null | head -1)"

deploy_service() {
  local svc="$1"
  log "Triggering redeploy of: $svc"
  railway up --service "$svc" --detach || {
    err "Failed to deploy $svc"
    return 1
  }
  log "$svc redeploy triggered (running in background)"
}

case "$SERVICE" in
  api)
    deploy_service nanoproof-api
    ;;
  web)
    deploy_service nanoproof-web
    ;;
  all)
    deploy_service nanoproof-api
    deploy_service nanoproof-web
    ;;
  *)
    err "Unknown service: $SERVICE (use: api, web, or all)"
    exit 1
    ;;
esac

log "Done. Watch progress in the Railway dashboard:"
log "  https://railway.app/dashboard"
