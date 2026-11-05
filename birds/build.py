"""Build index.html: embeds the three category banks into src/template.html.

Run from anywhere:  python3 build.py
"""
import json
from pathlib import Path

root = Path(__file__).resolve().parent
template = (root / "src" / "template.html").read_text(encoding="utf-8")

def bank(name):
    data = json.loads((root / "data" / name).read_text(encoding="utf-8"))
    out = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    assert "</script" not in out.lower(), name
    return out

html = (template
        .replace("__BM_JSON__", bank("bm_categories.json"))
        .replace("__ECON_JSON__", bank("econ_categories.json"))
        .replace("__KIDS_JSON__", bank("kids_categories.json")))
(root / "index.html").write_text(html, encoding="utf-8")
print("index.html", len(html), "bytes")
