#!/usr/bin/env python3
"""Stamp a version onto every local script URL so browsers cannot serve stale code.

The host sends cache-control: max-age=14400, so a browser will happily keep a
four hour old copy of a module. That gives you new HTML running against old JS,
which fails in confusing ways. Changing the URL is the only reliable fix.

Run this before committing any change to the JS or the pages:

    python3 stamp.py

It rewrites the ?v= stamp on <script src="js/..."> in every page and on every
relative import inside js/. Imports from a CDN are left alone.
"""

import re
import subprocess
import pathlib
import time

HERE = pathlib.Path(__file__).parent


def version():
    try:
        out = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'],
                             cwd=HERE, capture_output=True, text=True, check=True)
        return out.stdout.strip() + '-' + time.strftime('%H%M')
    except Exception:
        return time.strftime('%Y%m%d-%H%M')


def stamp(text, v):
    # <script type="module" src="js/home.js"> and any existing stamp
    text = re.sub(r'(src="js/[A-Za-z0-9_\-]+\.js)(\?v=[^"]*)?"',
                  lambda m: m.group(1) + '?v=' + v + '"', text)
    # import ... from './core.js'  (relative only, never the CDN)
    text = re.sub(r"(from '\./[A-Za-z0-9_\-]+\.js)(\?v=[^']*)?'",
                  lambda m: m.group(1) + '?v=' + v + "'", text)
    return text


def main():
    v = version()
    touched = 0
    for path in sorted(list(HERE.glob('*.html')) + list(HERE.glob('js/*.js'))):
        before = path.read_text()
        after = stamp(before, v)
        if after != before:
            path.write_text(after)
            touched += 1
    print('stamped ' + str(touched) + ' files with v=' + v)


if __name__ == '__main__':
    main()
