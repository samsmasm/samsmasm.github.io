#!/usr/bin/env python3
"""Stamp a version onto every local script, stylesheet and import URL.

unisam.nz sends cache-control: max-age=14400, so a browser can keep a four hour
old copy of a script, and new HTML against old JS breaks in odd ways. Changing
the URL is the only reliable fix, so run this before committing any change:

    python3 stamp.py

It rewrites the ?v= stamp on src="js/x.js" and href="style.css" in every page,
and on every relative import ('./x.js', './js/x.js') in the pages and JS files.
CDN URLs are left alone. Tests import without stamps, which also works.
"""

import pathlib
import re
import time

HERE = pathlib.Path(__file__).parent
V = time.strftime('%Y%m%d-%H%M%S')

ATTR = re.compile(r'((?:src|href)="(?:js/)?[A-Za-z0-9_\-]+\.(?:js|css))(\?v=[^"]*)?"')
IMPORT = re.compile(r"(['\"]\./(?:js/)?[A-Za-z0-9_\-]+\.js)(\?v=[^'\"]*)?(['\"])")


def stamp_imports(text):
    return IMPORT.sub(lambda m: m.group(1) + '?v=' + V + m.group(3), text)


for page in HERE.glob('*.html'):
    text = page.read_text()
    text = ATTR.sub(lambda m: m.group(1) + '?v=' + V + '"', text)
    page.write_text(stamp_imports(text))

for js in (HERE / 'js').glob('*.js'):
    js.write_text(stamp_imports(js.read_text()))

print('stamped', V)
