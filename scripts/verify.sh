#!/usr/bin/env bash
# Full verification in scratch homes. Never touches the real ~/.claude.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
SCRATCH="$(mktemp -d)"
export HOME="$SCRATCH" USERPROFILE="$SCRATCH" DEMONBAR_SKIP_NPM=1
trap 'rm -rf "$SCRATCH"' EXIT
step() { printf '\n== %s\n' "$*"; }

step "claude plugin validate (marketplace + both plugins)"
claude plugin validate "$ROOT"
claude plugin validate "$ROOT/plugins/demonbar"
claude plugin validate "$ROOT/plugins/demonbar-skins"

step "claude plugin test"
claude plugin test "$ROOT/plugins/demonbar"
claude plugin test "$ROOT/plugins/demonbar-skins"

step "CLI tests"
node --test "$ROOT/tests/cli.test.js"

step "install -> use -> status -> revert in a scratch home ($SCRATCH)"
mkdir -p "$SCRATCH/.claude"; printf '{"theme":"dark"}\n' > "$SCRATCH/.claude/settings.json"
sha_before="$(sha256sum "$SCRATCH/.claude/settings.json" | cut -d' ' -f1)"
node "$ROOT/bin/demonbar.js" install --profile Demon
node "$ROOT/bin/demonbar.js" use Demonad
node "$ROOT/bin/demonbar.js" status
node "$ROOT/bin/demonbar.js" revert
[ "$sha_before" = "$(sha256sum "$SCRATCH/.claude/settings.json" | cut -d' ' -f1)" ] && echo "settings.json restored byte for byte"

step "dispatcher renders sample-input.json"
node "$ROOT/bin/demonbar.js" install >/dev/null
now="$(date +%s)"
sed "s/4102444800/$((now + 9000))/g" "$ROOT/scripts/sample-input.json" | STATUSLINE_COLS=160 bash "$HOME/.claude/demonbar/plugins/demonbar/bin/statusline-switch.sh"; echo

step "secret scan"
bash "$ROOT/scripts/secret-scan.sh"
echo; echo "verify: OK"
