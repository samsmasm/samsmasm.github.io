#!/usr/bin/env python3
"""
Generate feed.json for econnews and businews sub-sites.
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

    posts_sorted = sorted(posts, key=lambda p: p["date"], reverse=True)
    items = []

    for post in posts_sorted:
        html_path = os.path.join(REPO, "econnews", "posts", post["filename"])
        if not os.path.exists(html_path):
            continue
        with open(html_path) as f:
            soup = BeautifulSoup(f.read(), "html.parser")
        lede = soup.select_one(".issue-lede")
        if lede:
            excerpt = lede.get_text(strip=True)
        else:
            # Fallback for old posts without lede: join article titles
            titles = [a.get_text(strip=True) for a in soup.select(".article-card h2 a")]
            excerpt = "In this issue: " + " · ".join(titles) if titles else ""
        items.append({
            "title": "Econ News — " + post["date"],
            "excerpt": excerpt,
            "date": post["date"],
            "url": "/econnews/posts/" + post["filename"],
            "source": "econnews",
        })

    out_path = os.path.join(REPO, "econnews", "feed.json")
    with open(out_path, "w") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
    print(f"econnews/feed.json — {len(items)} items")


def generate_businews_feed():
    cases_path = os.path.join(REPO, "businews", "cases.json")
    with open(cases_path) as f:
        cases = json.load(f)

    items = []
    for case in sorted(cases, key=lambda c: c["date"], reverse=True):
        items.append({
            "title": case["title"],
            "excerpt": case.get("hook", ""),
            "date": case["date"],
            "url": "/businews/cases/" + case["filename"],
            "source": "businews",
        })

    out_path = os.path.join(REPO, "businews", "feed.json")
    with open(out_path, "w") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
    print(f"businews/feed.json — {len(items)} items")


if __name__ == "__main__":
    generate_econnews_feed()
    generate_businews_feed()
