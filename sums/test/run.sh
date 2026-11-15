#!/usr/bin/env bash
# Sums tests: digit reader (node) then the page in headless Chrome.
# SUMS_SHOTS=<dir> saves screenshots.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
MODS="$HOME/.cache/sw-test/node_modules"
if [ ! -d "$MODS/puppeteer-core" ]; then
  mkdir -p "$HOME/.cache/sw-test"
  (cd "$HOME/.cache/sw-test" && npm init -y -q >/dev/null && PUPPETEER_SKIP_DOWNLOAD=1 npm i -q puppeteer-core)
fi
node "$HERE/run.js"
PORT=$((8900 + RANDOM % 200))
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER' EXIT
sleep 0.6
node "$HERE/browser.js" "http://127.0.0.1:$PORT/sums/" "${SUMS_SHOTS:-}"
