# CLAUDE.md — BusiNews

## Project Purpose
**BusiNews** is an automated system that generates curriculum-relevant IB Business Management case studies from real-world corporate events. Output is a student-facing website that accumulates cases over time. Primary audience: IB Business Management students (16-18 years old).

The name comes from the BCG Matrix quadrant -- products with uncertain futures and high potential. It reflects the editorial philosophy: we don't give students answers, we give them better questions.

The goal is not to summarise business news. It is to produce educationally rich narratives that connect real corporate events to IB Business Management concepts, and provoke genuine student inquiry.

**Scope: IB Business Management only.** Not IB Economics. Stories must be about specific companies making decisions or experiencing events -- not general economic trends, government policy, or macro movements with no named company at the centre.

## Architecture
This project follows the same pattern as the existing econnews project. Refer to that repository for deployment conventions, GitHub Actions structure, and GitHub Pages setup. Do not deviate from that pattern without a good reason.

**Trigger:** GitHub Actions, running once per week (Sundays 08:00 UTC).

**Pipeline (in order):**
1. Ingest RSS feeds from 15 financial journalism sources -- DONE
2. Pre-filter to IB BM-relevant corporate stories using keyword matching -- DONE
3. Score filtered stories against three editorial criteria via Claude Haiku -- DONE
4. Select the single best story of the week -- DONE
5. Generate a structured case study via Claude Sonnet -- DONE
6. Publish to GitHub Pages as a blog-style accumulating archive -- NOT YET BUILT

**Scripts:**
- `businews_scripts/score_stories.py` -- steps 1-4, outputs `businews/candidate_stories.json`
- `businews_scripts/generate_cases.py` -- step 5, outputs `businews/case_study.json`

**Output format:** Blog-style HTML. Most recent case study prominent at top. Older cases accumulate below. Each case study is a standalone page. Student-facing: clear, engaging, no jargon without explanation.

## RSS Feed Sources
All feeds confirmed live as of May 2026:
- https://finance.yahoo.com/rss/
- https://feeds.marketwatch.com/marketwatch/topstories/
- http://www.cnbc.com/id/10001147/device/rss/rss.html
- http://www.theguardian.com/business/rss
- https://www.ft.com/rss/home
- https://rss.dw.com/atom/rss-en-bus
- https://rsshub.rss3.workers.dev/apnews/topics/economy
- https://rsshub.rss3.workers.dev/apnews/topics/business
- https://rsshub.rss3.workers.dev/nikkei/asia
- https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/business/economy/rss.xml
- https://www.euronews.com/rss?level=vertical&name=business
- https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6936
- https://e.vnexpress.net/rss/business.rss
- https://www.africanews.com/feed/rss?themes=business
- https://www.koreaherald.com/rss/kh_Business

Reuters feed is dead -- do not add it back.

## Story Selection: Editorial Criteria
One story is selected per week. Scoring uses three criteria:

1. **Significant** -- Does this involve a well-known company making a major decision or experiencing a major event? (Acquisition, mass layoffs, bankruptcy, major product launch, CEO departure, etc.) A story with no specific named company at its centre scores false.
2. **Curriculum-linked** -- Does this clearly connect to IB Business Management concepts? (HRM, finance and accounts, marketing, operations management, business organisation, growth and evolution)
3. **Weird** -- Is this surprising, counterintuitive, or genuinely unusual in a way students would find interesting?

**Selection rule:** Score the single story with the highest total (out of 3). Minimum score of 2 required. Weird is used as a tiebreaker -- a weird story beats a dry-but-significant one.

## IB Business Management Concept Reference
When tagging stories and generating case studies, map to these unit areas:
- Unit 1: Business organisation and environment
- Unit 2: Human resource management
- Unit 3: Finance and accounts
- Unit 4: Marketing
- Unit 5: Operations management

Do not force a curriculum tag. If a story is selected for being weird, a loose link is acceptable.

## Case Study Structure
Each generated case study follows this structure:

### 1. Hook (1-2 sentences)
Journalistic, punchy. Something a student would actually want to read.

### 2. Background (short paragraph)
Who is this company and what do they do? Assume the student knows nothing.

### 3. What Happened (bullet points)
The key developments. Factual, clear, no editorialising.

### 4. Data Snapshot (if available)
Key numbers -- revenue, growth rate, margins, market share, job cuts, whatever is relevant. Presented simply with context.

### 5. The Tension
2-3 paragraphs of prose. What is the core business problem here? What competing pressures or interests are at play? This is the analytical heart. Name the IB BM concepts at work.

### 6. Outside View (if available)
One paragraph. How are journalists, analysts, or competitors interpreting this differently from how the company frames it?

### 7. Reflection Questions (exactly 5)
- Require analysis or evaluation, not recall
- Connect to IB BM concepts where natural
- At least one "what would you need to know to decide?" question
- At least one genuinely open evaluative question with no obvious right answer

### 8. Extension (optional)
One suggested task for students who want to go further. Research, debate, data interpretation, or comparison with a rival company.

## Tone and Register
- Written for 16-18 year old students
- Engaging but not condescending
- Assume intelligence, not prior business knowledge
- Explain any business jargon the first time it appears
- No bullet-point overload in the main case text -- use prose
- Questions section uses a numbered list
- Never use em dashes

## Company Watchlist (seed list -- expand over time)
Apple, Microsoft, Alphabet (Google), Amazon, Meta, Tesla, Nike, Unilever, LVMH, McDonald's, Coca-Cola, Nestlé, Toyota, Samsung, TSMC, Spotify, Netflix, Airbnb, OpenAI, Patagonia

The watchlist appears in the keyword pre-filter in `score_stories.py`. Any story mentioning these companies by name passes the filter automatically.

## EDGAR Enrichment (not yet built)
Optional future step: when a specific company is the subject, fetch their most recent 10-K from EDGAR to add financial depth.
- EDGAR free API base URL: https://data.sec.gov/
- Useful sections: Item 1A (Risk Factors), Item 7 (MD&A)
- Skip for stories with no single named company subject

## What Is Not In Scope (yet)
- HTML publishing step (next to build)
- EDGAR enrichment
- Student personalisation or company tracking features
- Teacher controls or filtering interface
- Vietnam/Asia-Pacific company coverage
- Direct scraping of non-RSS sources
- LMS integration
- PDF output
