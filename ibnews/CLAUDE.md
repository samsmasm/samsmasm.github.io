# CLAUDE.md — IB News Finder

## What this is

**IB News Finder** lets IB students (Economics and Business Management) find real-world news articles relevant to their syllabus topic. The frontend (`index.html`) sends a topic + filters to a Cloudflare Worker, which queries three news APIs in parallel, then uses Claude to rank and return the best articles.

Live at: `unisam.nz/ibnews/`
Worker: deployed to Cloudflare Workers (URL stored in project memory)

---

## File structure

```
ibnews/
  index.html              ← frontend: topic selector, filters, results
  cloudflare-worker.js    ← the Worker source (deploy via Cloudflare dashboard)
  SETUP.md                ← deployment instructions
  *.pdf                   ← IB exam papers (reference docs, not served dynamically)
```

---

## Worker: cloudflare-worker.js

### Environment variables (set as Cloudflare Worker Secrets)

```
ANTHROPIC_API_KEY    ← Claude API key
GUARDIAN_API_KEY     ← The Guardian API
NYT_API_KEY          ← NYT Article Search API
NEWSAPI_KEY          ← NewsAPI.org
ALLOWED_ORIGIN       ← https://unisam.nz
```

### Request format (POST)

```json
{
  "subject": "econ" | "bm",
  "subjectName": "Economics" | "Business Management",
  "topicLabel": "Demand",
  "conceptLabel": "Law of Demand",
  "paper": "P1" | "P2" | "P3",
  "recency": "1m" | "3m" | "6m" | "1y",
  "focus": "examples" | "analysis" | "evaluation"
}
```

### Pipeline

1. Build a keyword search query from `topicLabel` + `subjectName` + `focus`
2. Compute `fromDate` from `recency`
3. Fetch from Guardian, NYT, and NewsAPI in parallel (`Promise.allSettled`)
4. Normalise to a flat array of `{ title, url, source, date, summary }` objects
5. Deduplicate by URL
6. Send to Claude with prompt asking it to rank top 5 by syllabus relevance
7. Return ranked articles + debug info

### CORS

Origin check: allows `unisam.nz` and `localhost`. All other origins get 403.

---

## Frontend: index.html

Single-page UI:
- Subject selector (Econ / BM) with topic dropdowns driven by a hardcoded syllabus map
- Filters: paper, recency, focus
- On submit: POST to Worker, render results as article cards
- Error states: no results, API failure, Worker rate limit

The topic/concept data is hardcoded in the frontend JS. To add a new topic, add it to the syllabus map in `index.html`.

---

## Key constraints

- The Worker must be deployed separately to Cloudflare — it is not served by GitHub Pages.
- The Worker URL is a Cloudflare Workers URL. Check `SETUP.md` for the current deploy URL.
- News API keys have rate limits. NewsAPI.org in particular has a free tier with a 100 req/day cap. The Worker handles partial failures (if one API is down, it still returns results from the other two).
- Claude is used only for ranking, not for generating content. The actual articles come from the news APIs.

---

## Current status

Working. Guardian, NYT, and NewsAPI queries running in parallel with Claude ranking.

**Known constraint:** NewsAPI.org free tier caps at 100 requests/day. Heavy classroom use can exhaust this. No known bugs.
