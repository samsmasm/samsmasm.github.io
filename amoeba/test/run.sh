#!/bin/bash
# Headless tests of amoeba/sim.js (about a minute).
exec node "$(dirname "$0")/run.js" "$@"
