#!/bin/bash
# =============================================================================
# install-fly-termux.sh — Fly CLI install for Termux (Android/aarch64)
#
# Termux-specific issues this script handles:
#   1. The official Fly install script sometimes picks the wrong binary
#      (x86_64 instead of ARM64), causing "flyctl has unexpected e_type: 2"
#   2. /tmp can be permission-restricted; we use $HOME/tmp-fly instead
#   3. tar ownership issues — we extract with --no-same-owner
#   4. Old broken binaries in ~/.fly/bin/ get wiped first
#
# Usage:
#   bash scripts/install-fly-termux.sh
# =============================================================================

set -e

FLY_VERSION="${FLY_VERSION:-0.4.63}"
FLY_DIR="$HOME/.fly"
BIN_DIR="$FLY_DIR/bin"
WORK_DIR="$HOME/tmp-fly"

echo "==> Step 1: wipe old (possibly broken) fly install"
rm -rf "$FLY_DIR"
echo "    done"

echo ""
echo "==> Step 2: make a writable working dir"
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"
rm -f flyctl.tar.gz flyctl
echo "    working in: $WORK_DIR"

echo ""
echo "==> Step 3: download ARM64 binary from GitHub"
curl -fL -o flyctl.tar.gz \
  "https://github.com/superfly/flyctl/releases/download/v${FLY_VERSION}/flyctl_${FLY_VERSION}_Linux_arm64.tar.gz"
echo "    downloaded $(ls -lh flyctl.tar.gz | awk '{print $5}')"

echo ""
echo "==> Step 4: extract"
tar -xzf flyctl.tar.gz --no-same-owner
echo "    extracted: $(ls -lh flyctl | awk '{print $5}')"

echo ""
echo "==> Step 5: verify binary architecture"
FILE_TYPE=$(file flyctl 2>&1 || echo "file command not available")
echo "    $FILE_TYPE"
if echo "$FILE_TYPE" | grep -q "aarch64\|ARM"; then
  echo "    ✓ ARM64 binary confirmed"
elif echo "$FILE_TYPE" | grep -q "x86_64"; then
  echo "    ✗ Wrong architecture (x86_64). Re-download."
  exit 1
fi

echo ""
echo "==> Step 6: install"
mkdir -p "$BIN_DIR"
mv flyctl "$BIN_DIR/flyctl"
chmod +x "$BIN_DIR/flyctl"
echo "    installed at: $BIN_DIR/flyctl"

echo ""
echo "==> Step 7: add to PATH"
export PATH="$BIN_DIR:$PATH"
if ! grep -q 'fly/bin' ~/.bashrc 2>/dev/null; then
  echo 'export PATH="$HOME/.fly/bin:$PATH"' >> ~/.bashrc
fi
echo "    added to ~/.bashrc"

echo ""
echo "==> Step 8: verify"
"$BIN_DIR/flyctl" version
echo ""
echo "🎉 flyctl is installed correctly!"
echo ""
echo "==> Next steps:"
echo "    1. fly auth login   # browser opens, sign in with GitHub"
echo "    2. cd ~/nanoproof-protocol"
echo "    3. bash scripts/deploy-fly.sh"
echo ""
echo "(If 'fly version' above showed an error, restart your shell or run:"
echo "    export PATH=\"\$HOME/.fly/bin:\$PATH\""
echo ")"
echo ""
echo "==> Cleanup"
cd "$HOME"
rm -rf "$WORK_DIR"
echo "    removed $WORK_DIR"