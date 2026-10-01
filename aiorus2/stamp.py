#!/usr/bin/env python3
"""Stamp a version onto every local script and stylesheet URL.

unisam.nz sends cache-control: max-age=14400, so a browser can keep a four hour
old copy of a script. New HTML running against old JS breaks in odd ways (on
30 Sep 2026 it stopped the cards appearing after a student joined). Changing the
URL is the only reliable fix, so run this before committing any change:

    python3 stamp.py

It rewrites the ?v= stamp on src="x.js" and href="x.css" in every page, and on
every relative import ('./x.js') inside the JS files. CDN URLs are left alone.
"""

import pathlib
import re
import time

HERE = pathlib.Path(__file__).parent
V = time.strftime('%Y%m%d-%H%M%S')

for page in HERE.glob('*.html'):
    text = page.read_text()
    text = re.sub(r'((?:src|href)="[A-Za-z0-9_\-]+\.(?:js|css))(\?v=[^"]*)?"',
                  lambda m: m.group(1) + '?v=' + V + '"', text)
    page.write_text(text)

for js in HERE.glob('*.js'):
    text = js.read_text()
    text = re.sub(r"(['\"]\./[A-Za-z0-9_\-]+\.js)(\?v=[^'\"]*)?(['\"])",
                  lambda m: m.group(1) + '?v=' + V + m.group(3), text)
    js.write_text(text)

print('stamped', V)
