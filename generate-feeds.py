#!/usr/bin/env python3
"""
Generate feed.json for econnews and questionmark sub-sites.
Run from the repo root: python3 generate-feeds.py
"""

import json
import os
from bs4 import BeautifulSoup

REPO = os.path.dirname(os.path.abspath(__file__))


def generate_econnews_feed():
    posts_path = os.path.join(REPO, "econnews", "posts.json")
    with open(posts_path) as f:
        posts = json.load(f)

    # Most recent first; pull articles from up to 3 issues
    posts_sorted = sorted(posts, key=lambda p: p["date"], reverse=True)
    items = []

    for post in posts_sorted[:3]:
        html_path = os.path.join(REPO, "econnews", "posts", post["filename"])
        if not os.path.exists(html_path):
            continue
        with open(html_path) as f:
            soup = BeautifulSoup(f.read(), "html.parser")
        for card in soup.select(".article-card"):
            a = card.select_one("h2 a")
            p = card.select_one("p")
            if not a:
                continue
            items.append({
                "title": a.get_text(strip=True),
                "excerpt": p.get_text(strip=True) if p else "",
                "date": post["date"],
                "url": "/econnews/posts/" + post["filename"],
                "source": "econnews",
            })

    out_path = os.path.join(REPO, "econnews", "feed.json")
    with open(out_path, "w") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
    print(f"econnews/feed.json — {len(items)} items")


def generate_questionmark_feed():
    cases_path = os.path.join(REPO, "questionmark", "cases.json")
    with open(cases_path) as f:
        cases = json.load(f)

    items = []
    for case in sorted(cases, key=lambda c: c["date"], reverse=True):
        items.append({
            "title": case["title"],
            "excerpt": case.get("hook", ""),
            "date": case["date"],
            "url": "/questionmark/cases/" + case["filename"],
            "source": "questionmark",
        })

    out_path = os.path.join(REPO, "questionmark", "feed.json")
    with open(out_path, "w") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
    print(f"questionmark/feed.json — {len(items)} items")


if __name__ == "__main__":
    generate_econnews_feed()
    generate_questionmark_feed()
