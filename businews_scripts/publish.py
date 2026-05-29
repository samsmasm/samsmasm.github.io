#!/usr/bin/env python3
"""BusiNews step 3: render case_study.json to HTML and update cases.json."""

import json
import os
import sys
from datetime import datetime

BASE = os.environ.get("GITHUB_WORKSPACE", "/home/sam/samsmasm.github.io")
CASE_STUDY_PATH = os.path.join(BASE, "businews", "case_study.json")
CASES_DIR = os.path.join(BASE, "businews", "cases")
CASES_JSON = os.path.join(BASE, "businews", "cases.json")


def format_date_long(date_str):
    d = datetime.strptime(date_str, "%Y-%m-%d")
    return d.strftime("%-d %B %Y")


def render_html(case):
    date_str = case["generated_date"]
    long_date = format_date_long(date_str)

    tags_html = " ".join(
        f'<span class="curriculum-tag">{link}</span>'
        for link in case.get("curriculum_links", [])
    )

    what_happened_html = "\n".join(
        f"<li>{item}</li>" for item in case.get("what_happened", [])
    )

    data_snapshot_html = ""
    if case.get("data_snapshot"):
        items = "\n".join(f"<li>{item}</li>" for item in case["data_snapshot"])
        data_snapshot_html = f"""
      <section class="case-section data-snapshot">
        <h2>Data Snapshot</h2>
        <ul class="snapshot-list">{items}</ul>
      </section>"""

    tension_paragraphs = case.get("the_tension", "").split("\n\n")
    tension_html = "\n        ".join(
        f"<p>{p.strip()}</p>" for p in tension_paragraphs if p.strip()
    )

    outside_view_html = ""
    if case.get("outside_view"):
        outside_view_html = f"""
      <section class="case-section outside-view">
        <h2>Outside View</h2>
        <p>{case["outside_view"]}</p>
      </section>"""

    questions_html = "\n".join(
        f"<li>{q}</li>" for q in case.get("reflection_questions", [])
    )

    extension_html = ""
    if case.get("extension"):
        extension_html = f"""
        <div class="extension">
          <h3>Extension</h3>
          <p>{case["extension"]}</p>
        </div>"""

    source_domain = case.get("source", "")
    src_url = case.get("source_url", "#")
    src_title = case.get("source_title", "Original article")

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{case["title"]} — BusiNews</title>
  <link rel="icon" type="image/jpeg" href="/unisamicon.jpg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../style.css">
</head>
<body>
  <div class="container">
    <a href="../index.html" class="back-link">← BusiNews</a>

    <header class="case-header">
      <div class="case-meta-bar">
        <span class="case-date">{long_date}</span>
        <div class="curriculum-tags">{tags_html}</div>
      </div>
      <h1>{case["title"]}</h1>
      <p class="hook">{case["hook"]}</p>
      <a href="{case["source_url"]}" class="source-link" target="_blank" rel="noopener">Source: {source_domain} →</a>
    </header>

    <main>
      <section class="case-section">
        <h2>Background</h2>
        <p>{case["background"]}</p>
      </section>

      <section class="case-section">
        <h2>What Happened</h2>
        <ul class="what-happened-list">{what_happened_html}</ul>
      </section>
{data_snapshot_html}
      <section class="case-section the-tension">
        <h2>The Tension</h2>
        {tension_html}
      </section>
{outside_view_html}
      <section class="questions-section">
        <h2>Reflection Questions</h2>
        <ol class="reflection-list">{questions_html}</ol>
{extension_html}
      </section>

      <section class="sources-section">
        <h2>Source</h2>
        <p><a href="{src_url}" target="_blank" rel="noopener">{src_title}</a> ({source_domain})</p>
      </section>
    </main>

    <footer>unisam.nz</footer>
  </div>
</body>
</html>"""


def update_cases_json(case, filename):
    if os.path.exists(CASES_JSON):
        with open(CASES_JSON, encoding="utf-8") as f:
            cases = json.load(f)
    else:
        cases = []

    date = case["generated_date"]
    if any(c["date"] == date for c in cases):
        print(f"  {date} already in cases.json, skipping.", file=sys.stderr)
        return

    cases.insert(0, {
        "date": date,
        "filename": filename,
        "title": case["title"],
        "hook": case["hook"],
        "background": case.get("background", ""),
        "curriculum_links": case.get("curriculum_links", []),
    })

    with open(CASES_JSON, "w", encoding="utf-8") as f:
        json.dump(cases, f, indent=2, ensure_ascii=False)
    print(f"  Updated cases.json ({len(cases)} entries)", file=sys.stderr)


def main():
    if not os.path.exists(CASE_STUDY_PATH):
        print(f"ERROR: {CASE_STUDY_PATH} not found.", file=sys.stderr)
        sys.exit(1)

    with open(CASE_STUDY_PATH, encoding="utf-8") as f:
        case = json.load(f)

    os.makedirs(CASES_DIR, exist_ok=True)

    date = case["generated_date"]
    filename = f"{date}.html"
    out_path = os.path.join(CASES_DIR, filename)

    html = render_html(case)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Wrote {out_path}", file=sys.stderr)

    update_cases_json(case, filename)
    print(f"Done: {case['title']}", file=sys.stderr)


if __name__ == "__main__":
    main()
