#!/usr/bin/env python3
"""Talkonomics quiz generation: fetch stories, select by type, generate quiz, publish slideshow."""

import html as html_lib
import json
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone, timedelta

import anthropic
import feedparser

BASE = os.environ.get("GITHUB_WORKSPACE", "/home/sam/samsmasm.github.io")
POSTS_DIR = os.path.join(BASE, "quiz", "posts")
INDEX_PATH = os.path.join(BASE, "quiz", "index.html")

RSS_FEEDS = [
    # Business / corporate
    "http://www.cnbc.com/id/10001147/device/rss/rss.html",
    "http://www.theguardian.com/business/rss",
    "https://feeds.marketwatch.com/marketwatch/topstories/",
    "https://rsshub.rss3.workers.dev/apnews/topics/business",
    "https://finance.yahoo.com/rss/",
    # Economics / macro
    "https://rss.dw.com/atom/rss-en-bus",
    "https://rsshub.rss3.workers.dev/apnews/topics/economy",
    "https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/business/economy/rss.xml",
    # International diversity
    "https://rsshub.rss3.workers.dev/nikkei/asia",
    "https://www.euronews.com/rss?level=vertical&name=business",
    "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6936",
    "https://e.vnexpress.net/rss/business.rss",
    "https://www.africanews.com/feed/rss?themes=business",
    "https://www.koreaherald.com/rss/kh_Business",
]

SELECTION_PROMPT = """\
You are selecting news stories for Talkonomics, a weekly economics and business quiz for students aged 14-18.

The quiz needs one story for each question type below. All stories must be from the last 14 days.

Types needed:
B1 — Company results: A company released earnings, subscriber numbers, or sales figures. Best if the result is counterintuitive.
B2 — Industry/sector story: A development affecting a whole industry or sector (regulation, labour dispute, technology shift, market trend). Not just one company.
B3 — Company strategic move: A company launched something, withdrew from a market, pivoted strategy, or made a major decision. Needs 1-2 sentences of context.
B4 — Quirky business (ESSENTIAL): Something genuinely surprising, amusing, or counterintuitive. Strange product, unexpected celebrity move, market behaving oddly.
E5 — Macroeconomic indicator: A key economic statistic released (inflation, GDP, unemployment, interest rates, housing). MUST include a specific number.
E6 — Government or central bank policy: A government or central bank acted — law, budget, tax change, interest rate decision, subsidy, ban.
E7 — International trade or geopolitics: Cross-border story — sanctions, trade deals, currency moves, commodity prices. Prefer non-US/UK countries.
E8 — Surprising economics fact (ESSENTIAL): A statistic or finding where the answer is more extreme than people expect. All three answer options must feel plausible.

Rules:
- B4 and E8 are ESSENTIAL — never omit them; if no perfect fit exists, choose the closest available story
- Maximum 4 US-centred stories across all 8 types
- At least 2 stories centred on countries outside the US and UK
- Every story must be from the last 14 days

From the articles below, select the single best story for each type. Return ONLY this JSON array, no other text:
[
  {{"type": "B1", "title": "...", "url": "...", "source": "...", "summary": "...", "region": "US/UK/Europe/Asia/Africa/LatAm/etc", "key_fact": "the specific number or finding that the question should feature"}}
]

If you genuinely cannot find a suitable story for a type, omit that entry from the array.

Articles:
{articles}
"""

GENERATION_PROMPT = """\
You are generating a new edition of Talkonomics, a weekly economics and business quiz. The tagline is "Graphs are boring. Econ isn't." This is a teaching resource — every question should leave the reader slightly more informed about the world, regardless of whether they got it right.

## Structure

Always exactly 10 questions in this order:
- Business Q1-Q4: one question per type (company results, industry story, company action, quirky). Order within Q1-Q4 can vary.
- Economics Q5-Q8: one question per type (macro indicator, government/CB policy, international trade, surprising fact).
- General knowledge Q9-Q10: Q9 geography superlative, Q10 economist or economic history fact.

Each question has exactly 3 options: a, b, c.

## Question types

Business Q1-4:
- Type B1 Company results: Set up context, ask which outcome occurred. Most interesting when counterintuitive.
- Type B2 Industry/sector: Name the sector, explain what is happening, ask a specific fact about it.
- Type B3 Company strategic move: 1-2 sentences context then ask what they did, why, or what resulted. Usually the longest business question (25-40 words).
- Type B4 Quirky (ESSENTIAL): Genuinely surprising, amusing, or counterintuitive. Creative answer options. Must make people smile.

Economics Q5-8:
- Type E5 Macro indicator: Include the specific number in the setup. Ask about cause, historical context, or effect. Define all economic terms in parentheses on first use.
- Type E6 Government/CB policy: Explain what they did, ask why or what effect it will have. "Which of these is NOT a risk?" is a useful stem.
- Type E7 International trade/geopolitics: Cross-border angle. Best slot for geographic diversity outside the US and UK.
- Type E8 Surprising fact (ESSENTIAL): The correct answer must be more extreme than people expect. All three options must feel plausible.

General knowledge Q9-10:
- Q9 Geography superlative: "Which country is the largest producer of X?" type. Economic angle. Actively seek a non-US/UK country.
- Q10 Economist/history/money fact: One of: (a) identify a historical economist, (b) historical economic superlative, or (c) money or economic history fact.

## Writing rules

Voice: Conversational, not academic. Pub trivia, not classroom exercise. Write as if explaining to a smart friend who does not read the Financial Times.

Jargon: Define ALL economic terms in parentheses on first use. Example: "inflation (an increasing price level)". Never assume economic literacy.

Recency: Every Q1-Q8 must include a recency signal: "recently", "last week", "this month", "just announced", "over the past fortnight". A question that could have been written six months ago is too evergreen.

Structure: 1-2 sentences of setup, then the question. Setup teaches; question tests.

Word count targets per question (question text only, not options):
- Simple "which X" questions: 10-20 words
- Context + question: 20-35 words
- Extended context + question (B3, E5): 30-45 words

## Answer options

Always exactly 3 options: a, b, c.

Two options must be genuinely plausible — a reasonably well-informed reader should be uncertain between them. One option should be amusing or absurd enough to raise a smile, but not so obviously wrong that it telegraphs itself. The joke option should never be impossible, just unlikely.

All three options within a question must be grammatically parallel and roughly similar in length. Never make the correct answer the longest or most detailed option.

Distribute correct answers roughly evenly across a, b, and c across the full 10 questions.

## Answer explanations

Format: Begin with the letter and answer, then explanation. Example: "b. The answer is X. [Explanation]."

Structure for each explanation:
1. State the answer clearly (1 sentence)
2. Explain why it is correct with the key supporting fact (1-2 sentences)
3. Zoom out to broader context — a specific number, comparison, or follow-on fact that rewards the reader (1-2 sentences)

Tone: Like a teacher who finds this genuinely interesting. Help the reader understand something about how the world works, not just confirm the answer.

## Geographic diversity

Maximum 4 questions centred on the US. At least 2 questions centred on countries outside the US and UK. Q9 and Q7 are the natural homes for international coverage.

## Stories to use for Q1-Q8

{stories}

For Q9 (geography superlative) and Q10 (economist or history fact), use your own general knowledge — these do not need to be from recent news.

## Output format

Return ONLY a valid JSON object. No markdown fences, no preamble, no other text. Use this exact structure:

{{"questions": [{{"number": 1, "category": "Business", "question": "Full question text including any setup.", "options": {{"a": "...", "b": "...", "c": "..."}}, "correct": "b", "explanation": "b. Answer stated. Explanation here."}}]}}
"""


def fetch_feed(url):
    cutoff = datetime.now(timezone.utc) - timedelta(days=14)
    try:
        feed = feedparser.parse(url)
        articles = []
        for entry in feed.entries[:20]:
            pub = entry.get("published_parsed") or entry.get("updated_parsed")
            if pub:
                pub_dt = datetime(*pub[:6], tzinfo=timezone.utc)
                if pub_dt < cutoff:
                    continue
            title = entry.get("title", "").strip()
            link = entry.get("link", "").strip()
            raw_summary = entry.get("summary", "")
            summary = re.sub(r"<[^>]+>", " ", raw_summary)
            summary = re.sub(r"\s+", " ", summary).strip()[:300]
            if title and link:
                source = url.split("/")[2].replace("www.", "").replace("feeds.", "")
                articles.append({
                    "title": title,
                    "url": link,
                    "source": source,
                    "summary": summary,
                })
        return articles
    except Exception as e:
        print(f"  WARN: failed {url}: {e}", file=sys.stderr)
        return []


def fetch_all_feeds():
    print("Fetching RSS feeds...", file=sys.stderr)
    all_articles = []
    seen_urls = set()
    with ThreadPoolExecutor(max_workers=14) as ex:
        futures = {ex.submit(fetch_feed, url): url for url in RSS_FEEDS}
        for future in as_completed(futures):
            for article in future.result():
                if article["url"] not in seen_urls:
                    seen_urls.add(article["url"])
                    all_articles.append(article)
    print(f"Total unique articles from last 14 days: {len(all_articles)}", file=sys.stderr)
    return all_articles


def select_stories(client, articles):
    print("Selecting stories by question type...", file=sys.stderr)
    articles_text = "\n\n".join(
        f"Title: {a['title']}\nSource: {a['source']}\nSummary: {a['summary']}"
        for a in articles
        if a["title"] and a["summary"]
    )
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2000,
        messages=[{"role": "user", "content": SELECTION_PROMPT.format(articles=articles_text)}],
    )
    raw = response.content[0].text.strip()
    cleaned = re.sub(r"```json\n?|```", "", raw).strip()
    stories = json.loads(cleaned)
    for s in stories:
        print(f"  {s['type']} [{s['region']}]: {s['title'][:60]}", file=sys.stderr)
    return stories


def generate_quiz(client, stories, date_str):
    print("Generating quiz...", file=sys.stderr)
    stories_text = "\n\n".join(
        f"{s['type']} ({s['type'][0]}{'usiness' if s['type'][0] == 'B' else 'conomics'} — "
        f"{'Company results' if s['type'] == 'B1' else 'Industry/sector' if s['type'] == 'B2' else 'Strategic move' if s['type'] == 'B3' else 'Quirky' if s['type'] == 'B4' else 'Macro indicator' if s['type'] == 'E5' else 'Government/CB policy' if s['type'] == 'E6' else 'International trade' if s['type'] == 'E7' else 'Surprising fact'}):\n"
        f"Title: {s['title']}\nSource: {s['source']}, Region: {s['region']}\n"
        f"Summary: {s['summary']}\nKey fact to feature: {s.get('key_fact', 'see summary')}"
        for s in stories
    )
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4000,
        messages=[{"role": "user", "content": GENERATION_PROMPT.format(stories=stories_text)}],
    )
    raw = response.content[0].text.strip()
    cleaned = re.sub(r"```json\n?|```", "", raw).strip()
    data = json.loads(cleaned)
    print(f"  Generated {len(data['questions'])} questions", file=sys.stderr)
    return data


# ── HTML construction ──────────────────────────────────────────────────────

CATEGORY_COLOURS = {
    "Business": ("#f0f5ff", "#1a3a7a", "#b6cff5"),
    "Economics": ("#f0faf4", "#145c34", "#b6e8cb"),
    "General Knowledge": ("#fff5f0", "#7a2d0a", "#f5c9b0"),
}

def _e(s):
    return html_lib.escape(str(s))


def slide_title(date_formatted):
    return f"""
  <div class="slide active" id="slide-0">
    <div class="slide-body title-body">
      <div class="title-wordmark">Talkonomics</div>
      <div class="title-tagline">Graphs are boring. Econ isn&#8217;t.</div>
      <div class="title-date">Weekly Quiz &mdash; {_e(date_formatted)}</div>
      <div class="title-meta">10 questions &nbsp;&middot;&nbsp; Business &nbsp;&middot;&nbsp; Economics &nbsp;&middot;&nbsp; General Knowledge</div>
      <div class="mode-buttons">
        <button class="btn-mode" onclick="selectMode('asgo')">
          <span class="btn-mode-title">Answers as we go</span>
          <span class="btn-mode-desc">Reveal each answer before moving on</span>
        </button>
        <button class="btn-mode" onclick="selectMode('atend')">
          <span class="btn-mode-title">Answers at the end</span>
          <span class="btn-mode-desc">All 10 questions first, then all answers</span>
        </button>
      </div>
    </div>
    <div class="slide-nav">
      <span></span>
      <span class="slide-counter">Talkonomics</span>
      <span></span>
    </div>
  </div>"""


def slide_question(q, total=10):
    n = q["number"]
    cat = q["category"]
    bg, fg, border = CATEGORY_COLOURS.get(cat, ("#fff", "#111", "#ddd"))
    options_html = ""
    for letter in ("a", "b", "c"):
        text = q["options"].get(letter, "")
        correct_class = " correct" if letter == q["correct"] else ""
        options_html += f"""
      <div class="option{correct_class}" data-letter="{letter}">
        <span class="option-letter">{letter}</span>
        <span class="option-text">{_e(text)}</span>
      </div>"""
    return f"""
  <div class="slide q-slide" id="slide-{n}" style="--cat-bg:{bg};--cat-fg:{fg};--cat-border:{border}">
    <div class="slide-top">
      <span class="category-badge">{_e(cat)}</span>
      <span class="q-counter">Q{n} / {total}</span>
    </div>
    <div class="slide-body question-body">
      <p class="question-text">{_e(q['question'])}</p>
      <div class="options">{options_html}
      </div>
      <div class="explanation">
        <p>{_e(q['explanation'])}</p>
      </div>
    </div>
    <div class="slide-nav">
      <button class="btn-nav" onclick="prevSlide()">&#8592; Back</button>
      <button class="btn-reveal" onclick="revealSlide(this)">Reveal Answer</button>
      <button class="btn-nav" onclick="nextSlide()">Next &#8594;</button>
    </div>
  </div>"""


def slide_answer(q, total=10):
    n = q["number"]
    cat = q["category"]
    bg, fg, border = CATEGORY_COLOURS.get(cat, ("#fff", "#111", "#ddd"))
    options_html = ""
    for letter in ("a", "b", "c"):
        text = q["options"].get(letter, "")
        correct_class = " correct" if letter == q["correct"] else ""
        options_html += f"""
      <div class="option{correct_class}" data-letter="{letter}">
        <span class="option-letter">{letter}</span>
        <span class="option-text">{_e(text)}</span>
      </div>"""
    return f"""
  <div class="slide a-slide revealed" id="slide-a{n}" style="--cat-bg:{bg};--cat-fg:{fg};--cat-border:{border}">
    <div class="slide-top">
      <span class="category-badge">{_e(cat)} &mdash; Answer</span>
      <span class="q-counter">A{n} / {total}</span>
    </div>
    <div class="slide-body question-body">
      <p class="question-text">{_e(q['question'])}</p>
      <div class="options">{options_html}
      </div>
      <div class="explanation">
        <p>{_e(q['explanation'])}</p>
      </div>
    </div>
    <div class="slide-nav">
      <button class="btn-nav" onclick="prevSlide()">&#8592; Back</button>
      <span class="slide-counter">A{n} / {total}</span>
      <button class="btn-nav" onclick="nextSlide()">Next &#8594;</button>
    </div>
  </div>"""


def slide_end(date_formatted):
    return f"""
  <div class="slide" id="slide-end">
    <div class="slide-body title-body">
      <div class="title-wordmark">Talkonomics</div>
      <div class="title-tagline">That&#8217;s all 10!</div>
      <div class="title-date">{_e(date_formatted)}</div>
      <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin-top:2rem">
        <button class="btn-primary" onclick="goTo(0)">&#8592; Start again</button>
        <a class="btn-primary" href="../index.html">All editions</a>
      </div>
    </div>
    <div class="slide-nav">
      <button class="btn-nav" onclick="prevSlide()">&#8592; Back</button>
      <span class="slide-counter">End</span>
      <span></span>
    </div>
  </div>"""


HTML_HEAD = """\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Talkonomics &mdash; {date}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;500;600;700&display=swap');
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
:root{{
  --bg:#fff;
  --surface:#fff;
  --border:#111;
  --text:#111;
  --muted:#4a4540;
  --light:#7a7268;
}}
html,body{{height:100%;overflow:hidden;background:var(--bg);font-family:'Inter',system-ui,sans-serif}}
/* Slides */
#slides{{height:100vh;position:relative}}
.slide{{
  position:absolute;inset:0;
  display:none;flex-direction:column;
  background:var(--bg);
}}
.slide.active{{display:flex}}
/* Category accent */
.slide-top{{
  background:var(--cat-bg,#f0f5ff);
  border-bottom:2px solid var(--cat-border,#b6cff5);
  padding:0.55rem 1.4rem;
  display:flex;align-items:center;justify-content:space-between;
  flex-shrink:0;
}}
.category-badge{{
  font-family:'Inter',sans-serif;
  font-size:0.62rem;font-weight:700;
  text-transform:uppercase;letter-spacing:0.18em;
  color:var(--cat-fg,#1a3a7a);
}}
.q-counter{{
  font-family:'Inter',sans-serif;
  font-size:0.7rem;font-weight:600;
  color:var(--cat-fg,#1a3a7a);
  opacity:0.7;
}}
/* Slide body */
.slide-body{{
  flex:1;overflow-y:auto;
  padding:2rem 2.5rem 1rem;
  display:flex;flex-direction:column;
  gap:1.4rem;
  max-width:900px;width:100%;margin:0 auto;
}}
/* Title slide */
.title-body{{
  align-items:center;justify-content:center;text-align:center;
  gap:1rem;
  background:
    radial-gradient(ellipse at 15% 50%, #ffd6e7 0%, transparent 50%),
    radial-gradient(ellipse at 35% 20%, #d6f0ff 0%, transparent 45%),
    radial-gradient(ellipse at 60% 80%, #e8d6ff 0%, transparent 40%),
    radial-gradient(ellipse at 80% 30%, #d6ffe8 0%, transparent 45%),
    radial-gradient(ellipse at 90% 70%, #fff3d6 0%, transparent 40%),
    #fff;
}}
.title-wordmark{{
  font-family:'Playfair Display',Georgia,serif;
  font-size:clamp(2.4rem,6vw,4.5rem);
  font-weight:900;
  color:var(--text);
  line-height:1;
}}
.title-tagline{{
  font-family:'Inter',sans-serif;
  font-size:clamp(0.85rem,2vw,1.1rem);
  font-weight:600;
  text-transform:uppercase;
  letter-spacing:0.18em;
  color:var(--light);
}}
.title-date{{
  font-family:'Playfair Display',Georgia,serif;
  font-size:clamp(1rem,2.5vw,1.5rem);
  color:var(--muted);
  font-style:italic;
}}
.title-meta{{
  font-family:'Inter',sans-serif;
  font-size:0.78rem;
  color:var(--light);
  letter-spacing:0.04em;
}}
/* Question */
.question-text{{
  font-family:'Playfair Display',Georgia,serif;
  font-size:clamp(1.1rem,2.8vw,1.55rem);
  line-height:1.45;
  color:var(--text);
  font-weight:700;
}}
/* Options */
.options{{display:flex;flex-direction:column;gap:0.65rem}}
.option{{
  display:flex;align-items:flex-start;gap:0.9rem;
  background:var(--surface);
  border:1.5px solid #ddd7cc;
  border-radius:6px;
  padding:0.75rem 1rem;
  transition:background 0.2s,border-color 0.2s,opacity 0.25s;
  cursor:default;
}}
.option-letter{{
  font-family:'Inter',sans-serif;
  font-size:0.78rem;font-weight:700;
  text-transform:uppercase;letter-spacing:0.06em;
  color:var(--light);
  flex-shrink:0;
  margin-top:0.1rem;
  min-width:1.1rem;
}}
.option-text{{
  font-family:'Inter',sans-serif;
  font-size:clamp(0.9rem,2vw,1.05rem);
  line-height:1.45;
  color:var(--text);
}}
/* Revealed state */
.slide.revealed .option.correct{{
  background:#d6f5e8;
  border-color:#145c34;
}}
.slide.revealed .option.correct .option-letter{{color:#145c34}}
.slide.revealed .option:not(.correct){{opacity:0.32}}
.slide.revealed .explanation{{display:block}}
.slide.revealed .btn-reveal{{display:none}}
/* Explanation */
.explanation{{
  display:none;
  background:#f0f5ff;
  border:1.5px solid #b6cff5;
  border-radius:6px;
  padding:0.9rem 1.1rem;
}}
.explanation p{{
  font-family:'Inter',sans-serif;
  font-size:clamp(0.82rem,1.8vw,0.95rem);
  line-height:1.6;
  color:#1a3a7a;
  font-style:italic;
}}
/* Nav bar */
.slide-nav{{
  flex-shrink:0;
  border-top:1px solid #ddd7cc;
  background:var(--surface);
  padding:0.65rem 1.4rem;
  display:flex;align-items:center;justify-content:space-between;
  gap:0.75rem;
}}
.slide-counter{{
  font-family:'Inter',sans-serif;
  font-size:0.65rem;font-weight:700;
  text-transform:uppercase;letter-spacing:0.15em;
  color:var(--light);
}}
/* Buttons */
.btn-nav{{
  font-family:'Inter',sans-serif;
  font-size:0.75rem;font-weight:600;
  color:#1a3a7a;
  background:none;border:1.5px solid #b6cff5;
  border-radius:4px;padding:0.4rem 0.9rem;
  cursor:pointer;letter-spacing:0.04em;
  transition:background 0.12s,border-color 0.12s;
}}
.btn-nav:hover{{background:#f0f5ff;border-color:#1a3a7a}}
.btn-reveal{{
  font-family:'Inter',sans-serif;
  font-size:0.78rem;font-weight:700;
  color:#fff;
  background:#1a3a7a;border:none;
  border-radius:4px;padding:0.45rem 1.2rem;
  cursor:pointer;letter-spacing:0.04em;
  transition:background 0.12s;
}}
.btn-reveal:hover{{background:#2a4a9a}}
.btn-primary{{
  font-family:'Inter',sans-serif;
  font-size:0.82rem;font-weight:700;
  color:#fff;
  background:#1a3a7a;
  border:none;border-radius:4px;
  padding:0.6rem 1.6rem;
  cursor:pointer;text-decoration:none;
  display:inline-block;
  letter-spacing:0.04em;
  transition:background 0.12s;
}}
.btn-primary:hover{{background:#2a4a9a}}
/* Mode buttons on title slide */
.mode-buttons{{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin-top:0.5rem}}
.btn-mode{{
  background:var(--surface);
  border:2px solid #b6cff5;border-radius:8px;
  padding:0.9rem 1.4rem;cursor:pointer;text-align:center;
  min-width:190px;transition:border-color 0.15s,background 0.15s;
}}
.btn-mode:hover{{border-color:#1a3a7a;background:#f0f5ff}}
.btn-mode-title{{display:block;font-family:'Inter',sans-serif;font-size:0.88rem;font-weight:700;color:#1a3a7a;margin-bottom:0.3rem}}
.btn-mode-desc{{display:block;font-family:'Inter',sans-serif;font-size:0.7rem;color:var(--light);line-height:1.4}}
/* Hide reveal button in at-end mode on question slides */
body[data-mode="atend"] .q-slide .btn-reveal{{display:none}}
/* Print */
@media print{{
  html,body{{overflow:visible;height:auto}}
  #slides{{height:auto;position:static}}
  .slide{{position:static;display:flex!important;page-break-before:always;min-height:100vh}}
  .slide:first-child{{page-break-before:avoid}}
  .slide-nav{{display:none}}
  .btn-reveal{{display:none!important}}
  .slide.revealed .option{{opacity:1!important}}
  .explanation{{display:block!important}}
}}
</style>
</head>
<body>
<div id="slides">
"""

HTML_FOOT = """
</div>
<script>
var TOTAL = document.querySelectorAll('.q-slide').length;
var pos = 0;
var SEQ = [];

function buildSeq(m) {
  var s = ['slide-0'];
  for (var i = 1; i <= TOTAL; i++) s.push('slide-' + i);
  if (m === 'atend') {
    for (var i = 1; i <= TOTAL; i++) s.push('slide-a' + i);
  }
  s.push('slide-end');
  return s;
}

function selectMode(m) {
  SEQ = buildSeq(m);
  document.body.setAttribute('data-mode', m);
  showAt(1);
}

function showAt(p) {
  pos = p;
  document.querySelectorAll('.slide').forEach(function(s) { s.classList.remove('active'); });
  var el = document.getElementById(SEQ[p]);
  if (el) { el.classList.add('active'); el.scrollTop = 0; }
}

function goTo(p) { showAt(p); }

function nextSlide() {
  if (pos < SEQ.length - 1) showAt(pos + 1);
}

function prevSlide() {
  if (pos > 0) showAt(pos - 1);
}

function revealSlide(btn) {
  var slide = btn.closest('.slide');
  slide.classList.add('revealed');
  var exp = slide.querySelector('.explanation');
  if (exp) exp.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { nextSlide(); e.preventDefault(); }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { prevSlide(); e.preventDefault(); }
  else if (e.key === ' ' || e.key === 'Enter') {
    var slide = document.querySelector('.slide.active');
    if (slide && !slide.classList.contains('revealed')) {
      var btn = slide.querySelector('.btn-reveal');
      if (btn) { revealSlide(btn); e.preventDefault(); return; }
    }
    nextSlide();
    e.preventDefault();
  }
});
</script>
</body>
</html>
"""


def build_slideshow(quiz_data, date_str):
    now = datetime.strptime(date_str, "%Y-%m-%d")
    date_formatted = now.strftime("%-d %B %Y")
    questions = quiz_data["questions"]
    total = len(questions)

    parts = [HTML_HEAD.format(date=html_lib.escape(date_formatted))]
    parts.append(slide_title(date_formatted))
    for q in questions:
        parts.append(slide_question(q, total))
    for q in questions:
        parts.append(slide_answer(q, total))
    parts.append(slide_end(date_formatted))
    parts.append(HTML_FOOT)
    return "".join(parts)


def update_index(posts_dir, index_path):
    """Rebuild the quiz index page from all posts in posts_dir."""
    post_files = sorted(
        [f for f in os.listdir(posts_dir) if re.match(r"\d{4}-\d{2}-\d{2}\.html$", f)],
        reverse=True,
    )

    editions_html = ""
    for fname in post_files:
        date_str = fname.replace(".html", "")
        try:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            label = dt.strftime("%-d %B %Y")
        except ValueError:
            label = date_str
        editions_html += f'      <li><a href="posts/{html_lib.escape(fname)}">{html_lib.escape(label)}</a></li>\n'

    latest = ""
    if post_files:
        fname = post_files[0]
        date_str = fname.replace(".html", "")
        try:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            label = dt.strftime("%-d %B %Y")
        except ValueError:
            label = date_str
        latest = f"""
    <section class="latest">
      <p class="section-label">Latest edition</p>
      <a class="edition-link featured" href="posts/{html_lib.escape(fname)}">
        <span class="edition-date">{html_lib.escape(label)}</span>
        <span class="edition-cta">Open slideshow &#8594;</span>
      </a>
    </section>"""

    index_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Talkonomics &mdash; Weekly Quiz</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;500;600;700&display=swap');
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
:root{{--bg:#f7f4ec;--surface:#fff;--border:#111;--text:#111;--muted:#4a4540;--light:#7a7268;--accent:#9b0000;--link:#1a2e55}}
body{{font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}}
.page{{max-width:720px;margin:0 auto;padding:32px 24px 80px}}
.back-link{{display:inline-block;font-size:0.68rem;font-weight:600;color:var(--light);text-decoration:none;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:20px}}
.back-link:hover{{color:var(--accent)}}
.masthead{{border-top:5px solid var(--border);padding-top:18px;margin-bottom:4px}}
.masthead-inner{{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:12px}}
.masthead-seal{{width:60px;height:60px;border-radius:10px;object-fit:cover;border:1px solid #bdb5a8}}
.masthead h1{{font-family:'Playfair Display',Georgia,serif;font-size:3rem;font-weight:900;letter-spacing:0.02em;line-height:1}}
.tagline-bar{{border-top:1px solid var(--border);border-bottom:3px solid var(--border);padding:5px 0;text-align:center;font-size:0.64rem;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:var(--muted);margin-bottom:28px}}
.section-label{{font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:var(--light);border-top:3px solid var(--border);padding-top:7px;margin-bottom:12px}}
.edition-link{{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--surface);border:1px solid #ddd7cc;padding:16px 20px;text-decoration:none;color:inherit;transition:background 0.12s}}
.edition-link:hover{{background:#f0ece3}}
.edition-date{{font-family:'Playfair Display',Georgia,serif;font-size:1rem;font-weight:700;color:var(--text)}}
.edition-cta{{font-size:0.72rem;font-weight:600;color:var(--link);white-space:nowrap}}
.featured{{border-top:3px solid var(--border)}}
.latest{{margin-bottom:32px}}
.archives{{margin-top:32px}}
.archives ul{{list-style:none;border-bottom:1px solid #ddd7cc}}
.archives li{{border-top:1px solid #ddd7cc}}
.archives li a{{display:flex;align-items:center;justify-content:space-between;padding:11px 0;font-size:0.85rem;color:var(--link);text-decoration:none}}
.archives li a:hover{{color:var(--accent)}}
.archives li a::after{{content:'&#8594;';font-size:0.75rem;color:var(--light)}}
footer{{margin-top:48px;padding-top:12px;border-top:1px solid #ddd7cc;font-size:0.68rem;color:var(--light);text-align:center;letter-spacing:0.03em}}
@media(max-width:560px){{.page{{padding:20px 16px 60px}}.masthead h1{{font-size:2.2rem}}}}
</style>
</head>
<body>
<div class="page">
  <a class="back-link" href="/index.html">&#8592; unisam.nz</a>
  <div class="masthead">
    <div class="masthead-inner">
      <img class="masthead-seal" src="/unisamsq.png" alt="UniSam">
      <h1>Talkonomics</h1>
      <img class="masthead-seal" src="/unisamsq.png" alt="UniSam">
    </div>
  </div>
  <div class="tagline-bar">Graphs are boring. Econ isn&#8217;t. &nbsp;&middot;&nbsp; Weekly quiz &nbsp;&middot;&nbsp; Economics &amp; Business</div>
  {latest}
  <section class="archives">
    <p class="section-label">All editions</p>
    <ul>
{editions_html}    </ul>
  </section>
  <footer>Built by Sam G &middot; SSIS Ho Chi Minh City &middot; <a href="mailto:samgetsstuffdone@gmail.com" style="color:inherit">found a problem? tell Sam</a></footer>
</div>
</body>
</html>"""

    with open(index_path, "w", encoding="utf-8") as f:
        f.write(index_html)
    print(f"Updated {index_path}", file=sys.stderr)


def main():
    client = anthropic.Anthropic()
    os.makedirs(POSTS_DIR, exist_ok=True)

    articles = fetch_all_feeds()
    if not articles:
        print("No articles fetched — aborting.", file=sys.stderr)
        sys.exit(1)

    stories = select_stories(client, articles)
    if not stories:
        print("No stories selected — aborting.", file=sys.stderr)
        sys.exit(1)

    date_str = datetime.now().strftime("%Y-%m-%d")
    quiz_data = generate_quiz(client, stories, date_str)

    html = build_slideshow(quiz_data, date_str)
    out_path = os.path.join(POSTS_DIR, f"{date_str}.html")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Wrote {out_path}", file=sys.stderr)

    update_index(POSTS_DIR, INDEX_PATH)


if __name__ == "__main__":
    main()
