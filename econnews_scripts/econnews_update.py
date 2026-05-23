#!/usr/bin/env python3
"""EconNews update: fetch RSS feeds, select articles, generate questions, publish."""

import json
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

import anthropic
import feedparser

RSS_FEEDS = [
    "http://www.cnbc.com/id/10001147/device/rss/rss.html",
    "http://www.theguardian.com/business/rss",
    "https://rss.dw.com/atom/rss-en-bus",
    "https://rsshub.rss3.workers.dev/apnews/topics/economy",
    "https://rsshub.rss3.workers.dev/nikkei/asia",
    "https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/business/economy/rss.xml",
    "https://www.euronews.com/rss?level=vertical&name=business",
    "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6936",
    "https://e.vnexpress.net/rss/business.rss",
    "https://www.africanews.com/feed/rss?themes=business",
    "https://www.koreaherald.com/rss/kh_Business",
    "https://rsshub.rss3.workers.dev/apnews/topics/business",
]

BASE = os.environ.get("GITHUB_WORKSPACE", "/home/sam/samsmasm.github.io")
POSTS_DIR = os.path.join(BASE, "econnews", "posts")

SELECTION_PROMPT = """\
You are an economics news editor. From the articles below, select exactly 6 for a student news digest.

Hard rules — all must be satisfied:
- Each article must be from a different publication. Never two from the same source.
- Each article must cover a different topic.
- Articles must span at least two different geographical regions.
- At least one must be a genuinely important global economics story.
- At least one must be surprising, fascinating or amusing — not necessarily world-breaking.
- Do not favour articles that appear earlier in the list.
- Avoid pure opinion pieces, business/corporate strategy, or political stories with no economics angle.

Aim for a mix of microeconomics and macroeconomics topics.

Here are the articles:
{articles}

Return ONLY a JSON array of exactly 6 selected articles with fields: title, url, summary. No other text."""

QUESTIONS_PROMPT = """\
For each of the following economics news articles, generate 2-3 discussion questions suitable for curious 16-18 year old students. Questions should spark genuine thinking and debate, not test recall. They can be provocative, hypothetical, or connect to students' own lives in Vietnam/Asia. Avoid questions that sound like exam questions.

Never use em dashes (—) in any questions. Use commas, colons, or rephrase instead.

{articles_json}

Return ONLY a JSON array of objects with fields: title, url, summary, questions (array of strings). No other text.

Important: You must return complete, valid JSON only. Do not truncate. No markdown fences, no ```json, just the raw JSON array."""

HTML_TEMPLATE = """\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Econ News &#8212; {title_date}</title>
  <link rel="stylesheet" href="../style.css">
</head>
<body>
  <div class="container">
    <a href="../index.html" class="back-link">&#8592; Econ News</a>
    <div class="masthead">
      <div class="masthead-inner">
        <img src="/unisamicon.jpg" alt="UniSam" class="masthead-seal">
        <h1>Econ News</h1>
        <img src="/unisamicon.jpg" alt="UniSam" class="masthead-seal">
      </div>
    </div>
    <div class="post-controls">
      <span class="post-date">{long_date}</span>
      <span class="font-size-controls">
        <button class="font-btn" onclick="changeArticleFont(-1)">A&#8722;</button>
        <button class="font-btn" onclick="changeArticleFont(1)">A+</button>
      </span>
    </div>
    <main>
      {articles_html}
    </main>
  </div>
  <script>
    let articleFontPx = 21;
    function changeArticleFont(delta) {{
      articleFontPx = Math.max(12, Math.min(28, articleFontPx + delta));
      document.querySelectorAll('.article-card').forEach(el => {{
        el.style.fontSize = articleFontPx + 'px';
      }});
    }}
  </script>
</body>
</html>"""

ARTICLE_CARD = """\
  <div class="article-card">
    <h2><a href="{url}" target="_blank">{title}</a></h2>
       <span class="article-source">{domain}</span>
    <p>{summary}</p>
    <ul class="questions-list">
      {questions}
    </ul>
  </div>"""


def fetch_feed(url):
    try:
        feed = feedparser.parse(url)
        articles = []
        for entry in feed.entries[:15]:
            articles.append({
                "title": entry.get("title", ""),
                "link": entry.get("link", ""),
                "contentSnippet": entry.get("summary", "")[:300],
            })
        print(f"  {len(articles)} articles from {url.split('/')[2]}")
        return articles
    except Exception as e:
        print(f"  WARN: failed {url}: {e}", file=sys.stderr)
        return []


def fetch_all_feeds():
    print("Fetching RSS feeds...")
    all_articles = []
    with ThreadPoolExecutor(max_workers=12) as ex:
        futures = {ex.submit(fetch_feed, url): url for url in RSS_FEEDS}
        for future in as_completed(futures):
            all_articles.extend(future.result())
    print(f"Total articles fetched: {len(all_articles)}")
    return all_articles


def select_articles(client, all_articles):
    print("Selecting 6 articles...")
    articles_text = "\n\n".join(
        f"Title: {a['title']}\nURL: {a['link']}\nSummary: {a['contentSnippet']}"
        for a in all_articles
        if a["title"] and a["link"]
    )
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1000,
        messages=[{"role": "user", "content": SELECTION_PROMPT.format(articles=articles_text)}],
    )
    raw = response.content[0].text.strip()
    cleaned = re.sub(r"```json\n?|```", "", raw).strip()
    return json.loads(cleaned)


def generate_questions(client, selected):
    print("Generating discussion questions...")
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2000,
        messages=[{"role": "user", "content": QUESTIONS_PROMPT.format(articles_json=json.dumps(selected))}],
    )
    raw = response.content[0].text.strip()
    cleaned = re.sub(r"```json\n?|```", "", raw).strip()
    return json.loads(cleaned)


def build_html(articles, date_str):
    now = datetime.strptime(date_str, "%Y-%m-%d")
    long_date = now.strftime("%A, %-d %B %Y")
    title_date = now.strftime("%-d %B %Y")

    cards = []
    for article in articles:
        domain = re.sub(r"^www\.", "", article["url"].split("/")[2])
        questions_html = "\n      ".join(f"<li>{q}</li>" for q in article["questions"])
        cards.append(ARTICLE_CARD.format(
            url=article["url"],
            title=article["title"],
            domain=domain,
            summary=article["summary"],
            questions=questions_html,
        ))

    return HTML_TEMPLATE.format(
        title_date=title_date,
        long_date=long_date,
        articles_html="\n\n".join(cards),
    )


def main():
    client = anthropic.Anthropic()

    all_articles = fetch_all_feeds()
    selected = select_articles(client, all_articles)
    with_questions = generate_questions(client, selected)

    date_str = datetime.now().strftime("%Y-%m-%d")
    html = build_html(with_questions, date_str)

    out_path = os.path.join(POSTS_DIR, f"{date_str}.html")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
