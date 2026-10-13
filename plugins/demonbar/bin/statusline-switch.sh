#!/bin/bash
# Status line dispatcher: picks the backend named in active-profile.txt.
#   custom        -> our bars, burn rate, ETA (statusline.js with Node; statusline.sh + jq only as a last resort)
#   demonbar      -> ccstatusline row backend with its config (~/.config/ccstatusline/settings.json); legacy value: ccstatusline
# Anything unknown, or a missing ccstatusline install, falls back to custom. Never prints errors.
# No user name or install path is assumed: npm and Node dirs are found through $APPDATA / $ProgramFiles.
PATH="/usr/bin:/bin:$PATH"

for d in "$HOME/.npm-global/bin" "$HOME/.local/bin" "$HOME/.bun/bin" /usr/local/bin /opt/homebrew/bin; do
  [ -d "$d" ] && PATH="$PATH:$d"
done

if command -v cygpath >/dev/null 2>&1; then
  addwin() {
    [ -n "$1" ] || return 0
    local u
    u=$(cygpath -u "$1" 2>/dev/null) && [ -d "$u" ] && PATH="$PATH:$u"
  }
  [ -n "$APPDATA" ] && addwin "$APPDATA/npm"
  [ -n "${ProgramFiles:-$PROGRAMFILES}" ] && addwin "${ProgramFiles:-$PROGRAMFILES}/nodejs"
  [ -n "$LOCALAPPDATA" ] && addwin "$LOCALAPPDATA/Programs/nodejs"
fi
export PATH

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
profile=$(tr -d '[:space:]' < "$DIR/active-profile.txt" 2>/dev/null)
input=$(cat)

if { [ "$profile" = "demonbar" ] || [ "$profile" = "ccstatusline" ]; } && command -v ccstatusline >/dev/null 2>&1; then
  printf '%s' "$input" | ccstatusline 2>/dev/null
  exit 0
fi

if command -v node >/dev/null 2>&1; then
  printf '%s' "$input" | node "$DIR/statusline.js" 2>/dev/null
else
  printf '%s' "$input" | bash "$DIR/statusline.sh"
fi
