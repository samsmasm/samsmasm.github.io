#!/usr/bin/env bash
# Drives every riddle in headless Chrome. puppeteer-core lives in ~/.cache/sw-test (shared with graphs/ and dilemma/).
# Pass a folder to save screenshots: test/run.sh /some/folder
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
MODS="$HOME/.cache/sw-test/node_modules"
if [ ! -d "$MODS/puppeteer-core" ]; then
  mkdir -p "$HOME/.cache/sw-test"
  (cd "$HOME/.cache/sw-test" && npm init -y -q >/dev/null && PUPPETEER_SKIP_DOWNLOAD=1 npm i -q puppeteer-core)
fi
PORT=$((9100 + RANDOM % 200))
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER' EXIT
sleep 0.6
MODS="$MODS" URL="http://127.0.0.1:$PORT/riddles/" SHOTS="${1:-}" node "$HERE/browser.mjs"
