#!/usr/bin/env bash
# DemonBar for Claude Code cloud sessions (claude.ai/code containers, Codespaces, CI boxes).
# Use as the environment "setup script", or from a SessionStart hook. Idempotent, quiet when already installed.
#   DEMONBAR_PROFILE=Demon|Demonad   DEMONBAR_REF=main   DEMONBAR_OWNER=Demonad112
set -euo pipefail
OWNER="${DEMONBAR_OWNER:-Demonad112}"
REF="${DEMONBAR_REF:-main}"
PROFILE="${DEMONBAR_PROFILE:-Demon}"
KIT="$HOME/.claude/demonbar"

if [ -f "$KIT/state.json" ] && [ "${DEMONBAR_FORCE:-0}" != "1" ]; then
  echo "demonbar: already installed ($(node -p "require('$KIT/state.json').profile" 2>/dev/null || echo '?')); set DEMONBAR_FORCE=1 to reinstall"
  exit 0
fi
command -v node >/dev/null 2>&1 || { echo "demonbar: Node 18+ required" >&2; exit 1; }
npx -y "github:${OWNER}/DemonBar#${REF}" install --profile "$PROFILE"
