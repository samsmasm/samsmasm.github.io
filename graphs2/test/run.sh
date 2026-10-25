#!/usr/bin/env bash
# Runs the ShiftWork v2 browser tests in headless Chrome.
# puppeteer-core lives outside the repo (~/.cache/sw-test) so nothing is committed.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
MODS="$HOME/.cache/sw-test/node_modules"
if [ ! -d "$MODS/puppeteer-core" ]; then
  mkdir -p "$HOME/.cache/sw-test"
  (cd "$HOME/.cache/sw-test" && npm init -y -q >/dev/null && PUPPETEER_SKIP_DOWNLOAD=1 npm i -q puppeteer-core)
fi
PORT=$((8700 + RANDOM % 200))
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER' EXIT
sleep 0.6
SW_MODS="$MODS" SW_URL="http://127.0.0.1:$PORT/graphs2/" node "$HERE/tests.js" "$@"
