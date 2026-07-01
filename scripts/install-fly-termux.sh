#!/bin/bash
# =============================================================================
# install-fly-termux.sh — Fly CLI install for Termux (Android/aarch64)
#
# The official Fly install script uses uname -m which on Termux returns
# "aarch64" but Fly's installer sometimes picks the wrong binary, causing
# "flyctl has unexpected e_type: 2" errors. This script downloads the
# correct arm64 build directly.
# =============================================================================

set -e

FLY_VERSION="${FLY_VERSION:-0.4.63}"
FLY_DIR="$HOME/.fly"
BIN_DIR="$FLY_DIR/bin"

echo "==> Installing flyctl v${FLY_VERSION} for Linux/arm64 (Termux)"
mkdir -p "$BIN_DIR"

cd /tmp
curl -L -o flyctl.tar.gz \
  "https://github.com/superfly/flyctl/releases/download/v${FLY_VERSION}/flyctl_${FLY_VERSION}_Linux_arm64.tar.gz"
tar -xzf flyctl.tar.gz -C "$BIN_DIR"
chmod +x "$BIN_DIR/flyctl"

# Add to PATH for this session and future sessions
export PATH="$BIN_DIR:$PATH"
if ! grep -q 'fly/bin' ~/.bashrc 2>/dev/null; then
  echo 'export PATH="$HOME/.fly/bin:$PATH"' >> ~/.bashrc
fi

echo ""
echo "==> flyctl installed at: $BIN_DIR/flyctl"
"$BIN_DIR/flyctl" version
echo ""
echo "==> Next steps:"
echo "    1. fly auth login   (browser opens, sign in with GitHub)"
echo "    2. cd ~/nanoproof-protocol"
echo "    3. bash scripts/deploy-fly.sh"