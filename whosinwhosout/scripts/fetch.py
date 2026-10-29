#!/usr/bin/env python3
"""Fetch raw wikitext for each source page once and cache it in data/raw/.

Re-run with --force to refresh. Never touches data/manual/.
"""
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

RAW = Path(__file__).resolve().parent.parent / "data" / "raw"
UA = "WhosInWhosOut/1.0 (https://unisam.nz/whosinwhosout; samgetsstuffdone@gmail.com)"

PAGES = {
    "polls": "Opinion polling for the 2026 New Zealand general election",
    "results2023": "Results of the 2023 New Zealand general election",
    "lists2026": "Party lists in the 2026 New Zealand general election",
    "candidates2026": "Candidates in the 2026 New Zealand general election by electorate",
    "election2023": "2023 New Zealand general election",
    "portwaikato": "2023 Port Waikato by-election",
    "election2026": "2026 New Zealand general election",
}


def fetch(title):
    q = urllib.parse.urlencode({
        "action": "parse", "page": title, "prop": "wikitext",
        "format": "json", "formatversion": 2, "redirects": 1,
    })
    req = urllib.request.Request("https://en.wikipedia.org/w/api.php?" + q, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)["parse"]["wikitext"]


def main():
    force = "--force" in sys.argv
    names = [a for a in sys.argv[1:] if not a.startswith("--")] or list(PAGES)
    for name in names:
        out = RAW / f"{name}.wikitext"
        if out.exists() and not force:
            print("cached", out.name)
            continue
        try:
            out.write_text(fetch(PAGES[name]))
            print("fetched", out.name, out.stat().st_size)
        except Exception as e:
            print("FAILED", name, e)


if __name__ == "__main__":
    main()
