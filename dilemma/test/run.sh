#!/usr/bin/env bash
# Runs every test: the engine and builder in Node, then the pages in headless Chrome.
# puppeteer-core lives outside the repo (~/.cache/sw-test), shared with graphs/.
# Pass a folder to save screenshots: test/run.sh /tmp/shots
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
node "$HERE/engine.test.js"
node "$HERE/builder.test.js"
MODS="$HOME/.cache/sw-test/node_modules"
if [ ! -d "$MODS/puppeteer-core" ]; then
  mkdir -p "$HOME/.cache/sw-test"
  (cd "$HOME/.cache/sw-test" && npm init -y -q >/dev/null && PUPPETEER_SKIP_DOWNLOAD=1 npm i -q puppeteer-core)
fi
PORT=$((8900 + RANDOM % 200))
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT/.." >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER' EXIT
sleep 0.6
MODS="$MODS" URL="http://127.0.0.1:$PORT/dilemma/" SHOTS="${1:-}" node "$HERE/browser.js"
