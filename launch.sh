#!/usr/bin/env bash
# J.A.R.V.I.S. launcher for macOS / Linux.
# Double-click (via the desktop shortcut) or run: ./launch.sh
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to run JARVIS."
  echo "Install it from https://nodejs.org and try again."
  read -r -p "Press Enter to close…" _ || true
  exit 1
fi

exec node scripts/launch.mjs
