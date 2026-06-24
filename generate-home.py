#!/usr/bin/env python3
"""Bake the latest econnews/businews content into newhome/index.html.

The homepage tiles are also populated client-side at runtime, but that causes
a brief flash of stale fallback text on load. Running this at publish time
writes the current latest case/issue straight into the static HTML, so the
page renders correct from first paint and the JS just confirms it.

Targets elements by id (bm-date, bm-title, bm-excerpt, bm-tags, bm-read,
econ-date, econ-title, econ-read). Replacement is done with scoped regex so
the rest of the hand-written file is left byte-for-byte intact.
"""

import json
import re
import html
import pathlib
from datetime import datetime

ROOT = pathlib.Path(__file__).parent
HOME = ROOT / "newhome" / "index.html"


def fmt_date(s):
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", s or "")
    if not m:
        return None
    d = datetime(int(m[1]), int(m[2]), int(m[3]))
    return f"{d.strftime('%b')} {d.day}, {d.year}"


def set_text(content, tag, elem_id, text):
    pattern = re.compile(
        r'(<' + tag + r'\b[^>]*\bid="' + re.escape(elem_id) + r'"[^>]*>)(.*?)(</' + tag + r'>)',
        re.DOTALL,
    )
    repl = lambda m: m.group(1) + html.escape(text, quote=False) + m.group(3)
    new, n = pattern.subn(repl, content, count=1)
    if n != 1:
        raise SystemExit(f"generate-home: could not find {tag}#{elem_id}")
    return new


def set_href(content, elem_id, href):
    pattern = re.compile(
        r'(<a\b[^>]*\bid="' + re.escape(elem_id) + r'"[^>]*\bhref=")[^"]*(")'
    )
    repl = lambda m: m.group(1) + html.escape(href, quote=True) + m.group(2)
    new, n = pattern.subn(repl, content, count=1)
    if n != 1:
        raise SystemExit(f"generate-home: could not find a#{elem_id} href")
    return new


def extract_lede(issue_html):
    m = re.search(r'class="issue-lede"[^>]*>(.*?)</', issue_html, re.DOTALL)
    if not m:
        return None
    text = re.sub(r"<[^>]+>", "", m.group(1))
    return html.unescape(text).strip() or None


def latest_businews():
    cases = json.loads((ROOT / "businews" / "cases.json").read_text(encoding="utf-8"))
    if not cases:
        return None
    c = cases[0]
    tags = []
    for s in c.get("curriculum_links") or []:
        m = re.search(r"Unit\s+\d+", s, re.I)
        tags.append((m.group(0) if m else s).lower())
    return {
        "date": fmt_date(c.get("date") or c.get("filename")),
        "title": c.get("title"),
        "excerpt": c.get("hook"),
        "tags": " · ".join(tags[:2]),
        "read": "/businews/cases/" + c["filename"] if c.get("filename") else None,
    }


def latest_econnews():
    posts = json.loads((ROOT / "econnews" / "posts.json").read_text(encoding="utf-8"))
    if not posts:
        return None
    p = posts[0]
    fn = p.get("filename")
    lede = None
    if fn:
        post_path = ROOT / "econnews" / "posts" / fn
        if post_path.exists():
            lede = extract_lede(post_path.read_text(encoding="utf-8", errors="ignore"))
    return {
        "date": fmt_date(p.get("date") or fn),
        "title": lede,  # may be None -> leave heading fallback in place
        "read": "/econnews/posts/" + fn if fn else None,
    }


def main():
    content = HOME.read_text(encoding="utf-8")

    bm = latest_businews()
    if bm:
        if bm["date"]:    content = set_text(content, "span", "bm-date", bm["date"])
        if bm["title"]:   content = set_text(content, "h2", "bm-title", bm["title"])
        if bm["excerpt"]: content = set_text(content, "p", "bm-excerpt", bm["excerpt"])
        if bm["tags"]:    content = set_text(content, "div", "bm-tags", bm["tags"])
        if bm["read"]:    content = set_href(content, "bm-read", bm["read"])

    econ = latest_econnews()
    if econ:
        if econ["date"]:  content = set_text(content, "span", "econ-date", econ["date"])
        if econ["title"]: content = set_text(content, "h2", "econ-title", econ["title"])
        if econ["read"]:  content = set_href(content, "econ-read", econ["read"])

    HOME.write_text(content, encoding="utf-8")
    print("generate-home: baked newhome/index.html")


if __name__ == "__main__":
    main()
