#!/usr/bin/env bash
# Checkin - run the browser tests. Needs google-chrome and python3.
#
#   ./test/run.sh
#
# Each page drives the real app modules against the fake Firestore in test/fake/
# and prints what would actually have been written. Run it before committing a
# change to marking, the roll, or anything in js/.
set -u
cd "$(dirname "$0")/.."

PORT=${PORT:-8732}
python3 -m http.server "$PORT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
sleep 1

fails=0
for page in marking class-trends student-detail; do
  echo "=== $page ==="
  output=$(google-chrome --headless=new --disable-gpu --no-sandbox \
    --virtual-time-budget=15000 --dump-dom \
    "http://localhost:$PORT/test/$page.html" 2>/dev/null |
    sed -n '/<pre id="RESULTS">/,/<\/pre>/p' |
    sed 's/<[^>]*>//g; s/&lt;/</g; s/&gt;/>/g; s/&quot;/"/g; s/&amp;/\&/g')
  echo "$output"
  echo "$output" | grep -q "DONE" || { echo "!! the page never finished"; fails=1; }
  echo "$output" | grep -q "^FAIL" && fails=1
  echo
done

echo "=== undefined calls ==="
python3 test/undefined-calls.py || fails=1

exit $fails
