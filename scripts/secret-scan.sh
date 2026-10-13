#!/usr/bin/env bash
# Fails if the tracked tree contains likely secrets, personal paths, archives or build leftovers.
set -u
cd "$(dirname "$0")/.."
bad=0
pat='(sk-ant-[A-Za-z0-9_-]{10,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|AIza[0-9A-Za-z_-]{30,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.)'
if grep -rInE --exclude-dir=.git --exclude-dir=node_modules --exclude=secret-scan.sh "$pat" .; then echo "secret-scan: possible secret above" >&2; bad=1; fi
if grep -rInE --exclude-dir=.git --exclude-dir=node_modules --exclude=secret-scan.sh --exclude=RENAMES.md -e 'C:\\Users\\' -e '/Users/[A-Za-z]' -e 'Addy7' .; then echo "secret-scan: personal path above" >&2; bad=1; fi
if grep -rInE --exclude-dir=.git --exclude-dir=node_modules --exclude=secret-scan.sh -e '(password|passwd|api[_-]?key|secret|token)["'\'' ]*[:=]["'\'' ]*[A-Za-z0-9/+_-]{16,}' . ; then echo "secret-scan: credential-like assignment above" >&2; bad=1; fi
if find . -path ./.git -prune -o \( -name '*.zip' -o -name node_modules -o -name portable -o -name '*.tgz' \) -print | grep .; then echo "secret-scan: forbidden artefact above" >&2; bad=1; fi
[ "$bad" -eq 0 ] && echo "secret-scan: clean"
exit "$bad"
