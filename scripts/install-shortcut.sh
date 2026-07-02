#!/usr/bin/env bash
# Creates a J.A.R.V.I.S. desktop shortcut on macOS or Linux.
# Usage:  bash scripts/install-shortcut.sh
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Resolve the user's Desktop directory (fall back to $HOME).
DESKTOP="$HOME/Desktop"
if command -v xdg-user-dir >/dev/null 2>&1; then
  DESKTOP="$(xdg-user-dir DESKTOP 2>/dev/null || echo "$HOME/Desktop")"
fi
[ -d "$DESKTOP" ] || DESKTOP="$HOME"

OS="$(uname -s)"

chmod +x "$ROOT/launch.sh" "$ROOT/scripts/launch.mjs" 2>/dev/null || true

if [ "$OS" = "Darwin" ]; then
  # macOS: a double-clickable .command file that opens in Terminal.
  SHORTCUT="$DESKTOP/JARVIS.command"
  cat > "$SHORTCUT" <<EOF
#!/usr/bin/env bash
cd "$ROOT"
exec ./launch.sh
EOF
  chmod +x "$SHORTCUT"
  echo "Created desktop shortcut: $SHORTCUT"
  echo "Double-click 'JARVIS' on your Desktop to launch."
else
  # Linux: a freedesktop .desktop launcher.
  SHORTCUT="$DESKTOP/JARVIS.desktop"
  cat > "$SHORTCUT" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=J.A.R.V.I.S.
GenericName=AI Assistant
Comment=Voice-driven personal AI assistant with a Tony Stark HUD
Exec=$ROOT/launch.sh
Icon=$ROOT/assets/jarvis.svg
Terminal=true
Categories=Utility;AudioVideo;
EOF
  chmod +x "$SHORTCUT"

  # Mark trusted so double-click works without a warning (GNOME).
  if command -v gio >/dev/null 2>&1; then
    gio set "$SHORTCUT" "metadata::trusted" true 2>/dev/null || true
  fi

  # Also register it in the application menu.
  APPS_DIR="$HOME/.local/share/applications"
  mkdir -p "$APPS_DIR"
  cp "$SHORTCUT" "$APPS_DIR/jarvis.desktop"
  if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$APPS_DIR" 2>/dev/null || true
  fi

  echo "Created desktop shortcut: $SHORTCUT"
  echo "It also appears in your application menu as 'J.A.R.V.I.S.'."
  echo "If double-click asks, choose 'Trust and Launch' / 'Allow Launching'."
fi
