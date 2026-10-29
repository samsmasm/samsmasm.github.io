#!/usr/bin/env python3
"""Fetch each 2023 electorate's Wikipedia article (for its 2023 candidate vote box)
and each new 2026 electorate article, caching wikitext in data/raw/electorates/.

The Electoral Commission results site blocks scripted access (403), so the
per-candidate 2023 electorate votes come from these articles instead.
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fetch import UA  # noqa: E402
import wiki  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = RAW / "electorates"


def api(params):
    q = urllib.parse.urlencode({**params, "format": "json", "formatversion": 2})
    req = urllib.request.Request("https://en.wikipedia.org/w/api.php?" + q, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def get(title):
    """Return wikitext of the first title that exists (following redirects), else None."""
    for t in (f"{title} (New Zealand electorate)", f"{title} (electorate)", title):
        d = api({"action": "parse", "page": t, "prop": "wikitext", "redirects": 1})
        if "parse" in d:
            text = d["parse"]["wikitext"]
            if "electorate" in text[:5000].lower():
                return d["parse"]["title"], text
        time.sleep(0.3)
    return None, None


def names():
    r23 = (RAW / "results2023.wikitext").read_text()
    old = [wiki.params(b)["electorate"] for b in wiki.templates(r23, "NZ electorate result hold")]
    old += [wiki.params(b)["electorate"] for b in wiki.templates(r23, "NZ electorate result change")]
    old.append("Port Waikato")
    c26 = (RAW / "candidates2026.wikitext").read_text()
    new = [m.strip() for m in re.findall(r"^===\s*([^=]+?)\s*===\s*$", c26, re.M)]
    return sorted(set(old) | set(new))


def main():
    OUT.mkdir(exist_ok=True)
    index_file = OUT / "_index.json"
    index = json.loads(index_file.read_text()) if index_file.exists() else {}
    for n in names():
        if n in index:
            continue
        title, text = get(n)
        if text is None:
            print("NOT FOUND", n)
            index[n] = None
        else:
            fn = wiki.norm(n).replace(" ", "_") + ".wikitext"
            (OUT / fn).write_text(text)
            index[n] = {"title": title, "file": fn}
            print("ok", n, "->", title)
        time.sleep(0.5)
    index_file.write_text(json.dumps(index, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
