#!/usr/bin/env python3
"""Inline engine.js into app.html and write out/Stock_Shock_JIT_vs_JIC.html and index.html."""
from pathlib import Path

here = Path(__file__).resolve().parent
html = (here / 'app.html').read_text(encoding='utf-8')
engine = (here / 'engine.js').read_text(encoding='utf-8')
if '/*ENGINE*/' not in html:
    raise SystemExit('placeholder /*ENGINE*/ not found in app.html')
out = here / 'out'
out.mkdir(exist_ok=True)
dest = out / 'Stock_Shock_JIT_vs_JIC.html'
built = html.replace('/*ENGINE*/', engine, 1)
dest.write_text(built, encoding='utf-8')
# Same file served on the site at unisam.nz/stockshock/
(here / 'index.html').write_text(built, encoding='utf-8')
print('wrote', dest.relative_to(here), 'and index.html')
