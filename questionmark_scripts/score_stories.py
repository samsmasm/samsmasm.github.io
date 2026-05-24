#!/usr/bin/env python3
"""Question Mark step 1: ingest RSS feeds, filter to last 7 days, score stories."""

import json
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone, timedelta

import anthropic
import feedparser

RSS_FEEDS = [
    "https://finance.yahoo.com/rss/",
    "https://feeds.marketwatch.com/marketwatch/topstories/",
    "http://www.cnbc.com/id/10001147/device/rss/rss.html",
    "http://www.theguardian.com/business/rss",
    "https://www.ft.com/rss/home",
    "https://rss.dw.com/atom/rss-en-bus",
    "https://rsshub.rss3.workers.dev/apnews/topics/economy",
    "https://rsshub.rss3.workers.dev/apnews/topics/business",
    "https://rsshub.rss3.workers.dev/nikkei/asia",
    "https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/business/economy/rss.xml",
    "https://www.euronews.com/rss?level=vertical&name=business",
    "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6936",
    "https://e.vnexpress.net/rss/business.rss",
    "https://www.africanews.com/feed/rss?themes=business",
    "https://www.koreaherald.com/rss/kh_Business",
]

IBM_KEYWORDS = {
    # Unit 1: Business organisation and environment
    "merger", "acquisition", "takeover", "joint venture", "franchise", "franchisee",
    "stakeholder", "shareholder", "multinational", "conglomerate",
    "ipo", "listing", "public offering", "going public",
    "bankruptcy", "insolvency", "liquidation", "administration", "collapse",
    "nationalisation", "nationalization", "privatisation", "privatization",
    "restructuring", "reorganisation", "reorganization", "spinoff", "spin-off",
    "subsidiary", "corporate social responsibility", "csr",
    # Unit 2: Human resource management
    "layoff", "layoffs", "redundancy", "redundancies", "retrenchment",
    "strike", "industrial action", "walkout", "union",
    "ceo", "chief executive", "board of directors", "chairman",
    "workforce", "employees", "hiring", "fired", "dismissed",
    "collective bargaining", "remote work", "hybrid work",
    "diversity", "inclusion", "pay gap", "wages",
    # Unit 3: Finance and accounts
    "profit", "loss", "revenue", "earnings", "quarterly", "annual results",
    "debt", "loan", "bond", "dividend",
    "cash flow", "write-off", "writedown", "write-down",
    "bailout", "funding round", "valuation", "capital",
    # Unit 4: Marketing
    "rebrand", "rebranding", "product launch", "brand",
    "market share", "advertising campaign", "pricing",
    "product recall", "recall",
    # Unit 5: Operations management
    "supply chain", "factory", "manufacturing", "production",
    "shortage", "outsourcing", "automation",
    # Unit 6: Strategy (HL)
    "strategy", "strategic", "expansion", "market entry",
    "competitive advantage", "innovation", "patent",
}

IBM_WATCHLIST = {
    "apple", "microsoft", "alphabet", "google", "amazon", "meta", "tesla",
    "nike", "unilever", "lvmh", "mcdonald", "coca-cola", "coca cola",
    "nestle", "nestlé", "toyota", "samsung", "tsmc", "spotify", "netflix",
    "airbnb", "openai", "patagonia",
}


def is_ibm_relevant(article):
    text = (article["title"] + " " + article["summary"]).lower()
    return any(kw in text for kw in IBM_KEYWORDS | IBM_WATCHLIST)


SCORING_PROMPT = """\
You are an editorial assistant for a student-facing website connecting real corporate events to the IB Business Management curriculum.

Score each story below against THREE criteria:
1. significant - Is this a major real-world development? (large company, large market movement, major strategic decision)
2. curriculum_linked - Does this clearly connect to IB Business Management concepts? (HRM, finance, marketing, operations, business organisation, strategy)
3. weird - Is this surprising, counterintuitive, or genuinely unusual in a way students would find interesting?

For each story return an object with:
- "index": the number shown in square brackets
- "significant": true or false
- "curriculum_linked": true or false
- "weird": true or false
- "justification": one sentence explaining the scores

Stories:
{stories}

Return ONLY a JSON array of score objects, one per story. No markdown fences. No other text."""

BASE = os.environ.get("GITHUB_WORKSPACE", "/home/sam/samsmasm.github.io")
OUTPUT_PATH = os.path.join(BASE, "questionmark", "candidate_stories.json")


def fetch_feed(url):
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    try:
        feed = feedparser.parse(url)
        articles = []
        for entry in feed.entries[:20]:
            pub = entry.get("published_parsed") or entry.get("updated_parsed")
            pub_str = None
            if pub:
                pub_dt = datetime(*pub[:6], tzinfo=timezone.utc)
                if pub_dt < cutoff:
                    continue
                pub_str = pub_dt.strftime("%Y-%m-%d")
            title = entry.get("title", "").strip()
            link = entry.get("link", "").strip()
            # strip html tags from summary
            raw_summary = entry.get("summary", "")
            summary = re.sub(r"<[^>]+>", " ", raw_summary)
            summary = re.sub(r"\s+", " ", summary).strip()[:300]
            if title and link:
                source = url.split("/")[2].replace("www.", "").replace("feeds.", "")
                articles.append({
                    "title": title,
                    "url": link,
                    "source": source,
                    "published": pub_str,
                    "summary": summary,
                })
        print(f"  {len(articles)} recent articles from {url.split('/')[2]}", file=sys.stderr)
        return articles
    except Exception as e:
        print(f"  WARN: failed {url}: {e}", file=sys.stderr)
        return []


def fetch_all():
    print("Fetching RSS feeds...", file=sys.stderr)
    all_articles = []
    seen_urls = set()
    with ThreadPoolExecutor(max_workers=12) as ex:
        futures = {ex.submit(fetch_feed, url): url for url in RSS_FEEDS}
        for future in as_completed(futures):
            for article in future.result():
                if article["url"] not in seen_urls:
                    seen_urls.add(article["url"])
                    all_articles.append(article)
    before = len(all_articles)
    all_articles = [a for a in all_articles if is_ibm_relevant(a)]
    print(f"Total unique articles from last 7 days: {before}", file=sys.stderr)
    print(f"After IB BM keyword filter: {len(all_articles)} articles", file=sys.stderr)
    return all_articles


def score_batch(client, articles, offset):
    stories_text = "\n\n".join(
        f"[{offset + i}] Title: {a['title']}\nSource: {a['source']}\nSummary: {a['summary']}"
        for i, a in enumerate(articles)
    )
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=4000,
        messages=[{"role": "user", "content": SCORING_PROMPT.format(stories=stories_text)}],
    )
    raw = response.content[0].text.strip()
    cleaned = re.sub(r"```json\n?|```", "", raw).strip()
    return json.loads(cleaned)


def score_all(client, articles):
    print(f"Scoring {len(articles)} articles in batches...", file=sys.stderr)
    batch_size = 25
    all_scores = []
    for i in range(0, len(articles), batch_size):
        batch = articles[i:i + batch_size]
        scores = score_batch(client, batch, i)
        all_scores.extend(scores)
        print(f"  Scored {min(i + batch_size, len(articles))}/{len(articles)}", file=sys.stderr)
    return all_scores


def merge_and_rank(articles, scores):
    score_map = {s["index"]: s for s in scores}
    results = []
    for i, article in enumerate(articles):
        s = score_map.get(i, {})
        sig = bool(s.get("significant", False))
        curr = bool(s.get("curriculum_linked", False))
        weird = bool(s.get("weird", False))
        total = sum([sig, curr, weird])
        results.append({
            **article,
            "scores": {
                "significant": sig,
                "curriculum_linked": curr,
                "weird": weird,
            },
            "total": total,
            "selected": total >= 2,
            "justification": s.get("justification", ""),
        })
    results.sort(key=lambda x: x["total"], reverse=True)
    return results


def main():
    client = anthropic.Anthropic()
    articles = fetch_all()
    if not articles:
        print("No articles found in the last 7 days.", file=sys.stderr)
        sys.exit(1)

    scores = score_all(client, articles)
    ranked = merge_and_rank(articles, scores)

    selected = [r for r in ranked if r["selected"]]
    print(f"\n{len(selected)} stories selected (scored 2 or more of 3):", file=sys.stderr)
    for r in selected:
        flags = " + ".join(k for k, v in r["scores"].items() if v)
        print(f"  [{r['total']}/3] {r['title'][:70]} ({flags})", file=sys.stderr)

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(ranked, f, indent=2, ensure_ascii=False)
    print(f"\nWrote {OUTPUT_PATH}", file=sys.stderr)


if __name__ == "__main__":
    main()
