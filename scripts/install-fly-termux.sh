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
# Add to both ~/.bashrc AND ~/.profile (Termux uses profile, not bashrc)
for rc in ~/.bashrc ~/.profile; do
  if [ -f "$rc" ] && ! grep -q 'fly/bin' "$rc" 2>/dev/null; then
    echo 'export PATH="$HOME/.fly/bin:$PATH"' >> "$rc"
    echo "    added to $rc"
  fi
done
# Also create a symlink in /data/data/com.termux/files/usr/bin (always on PATH)
if [ -d /data/data/com.termux/files/usr/bin ]; then
  ln -sf "$BIN_DIR/flyctl" /data/data/com.termux/files/usr/bin/fly 2>/dev/null && \
    echo "    symlinked: /data/data/com.termux/files/usr/bin/fly -> $BIN_DIR/flyctl"
fi

echo ""
echo "==> Step 8: verify"
# Run the binary via explicit absolute path to avoid any PATH conflict.
# Also unset any shell alias that might shadow 'fly'.
unalias fly 2>/dev/null || true
"$BIN_DIR/flyctl" version
echo ""
echo "🎉 flyctl is installed correctly!"
echo ""
echo "==> IMPORTANT — please run this in EVERY new shell:"
echo "    export PATH=\"\$HOME/.fly/bin:\$PATH\""
echo "    (or just open a new terminal — it's in ~/.bashrc)"
echo ""
echo "==> Next steps:"
echo "    1. hash -r  (clear shell's cached binary paths)"
echo "    2. which fly  (should now show \$HOME/.fly/bin/fly)"
echo "    3. fly auth login   # browser opens, sign in with GitHub"
echo "    4. cd ~/nanoproof-protocol"
echo "    5. bash scripts/deploy-fly.sh"
echo ""
echo "==> Cleanup"
cd "$HOME"
rm -rf "$WORK_DIR"
echo "    removed $WORK_DIR"