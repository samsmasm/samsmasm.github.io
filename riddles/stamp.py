#!/usr/bin/env python3
"""Stamp a version onto the shared riddles.js and riddles.css links in every page.

unisam.nz sends cache-control: max-age=14400, so a browser can keep a four hour
old riddles.js while loading a new page that needs newer code (that left
"Their average is ." blank on Top of the class). Changing the URL is the only
reliable fix, so run this before committing any change:

    python3 riddles/stamp.py
"""

import pathlib
import re
import time

HERE = pathlib.Path(__file__).parent
V = time.strftime('%Y%m%d-%H%M%S')
LINK = re.compile(r'((?:src|href)="(?:\.\./)?riddles\.(?:js|css))(\?v=[^"]*)?"')

pages = [HERE / 'index.html'] + sorted(HERE.glob('*/index.html'))
for page in pages:
    text = page.read_text()
    new = LINK.sub(lambda m: m.group(1) + '?v=' + V + '"', text)
    if new != text:
        page.write_text(new)

print('stamped', V, 'on', len(pages), 'pages')
