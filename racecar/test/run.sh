#!/usr/bin/env bash
# Headless tests for racecar/sim.js. First run installs Planck 0.3.31 outside the repo.
set -e
CACHE="$HOME/.cache/racecar-test"
if [ ! -f "$CACHE/node_modules/planck-js/dist/planck.js" ]; then
    npm install --prefix "$CACHE" planck-js@0.3.31 --no-audit --no-fund >/dev/null
fi
node "$(dirname "$0")/run.js" "$@"
