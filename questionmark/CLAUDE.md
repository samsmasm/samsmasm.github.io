# **CLAUDE.md — Question Mark**  
## **Project Purpose**  
**Question Mark** is an automated system that generates curriculum-relevant business and economics case studies from real-world corporate events. Output is a student-facing website that accumulates cases over time. Primary audience: IB Business Management and IB Economics students.  
The name comes from the BCG Matrix quadrant -- products with uncertain futures and high potential. It reflects the editorial philosophy: we don't give students answers, we give them better questions.  
The goal is not to summarise business news. It is to produce educationally rich narratives that connect real corporate events to IB curriculum concepts, and provoke genuine student inquiry.  
## **Architecture**  
This project follows the same pattern as the existing econnews project. Refer to that repository for deployment conventions, GitHub Actions structure, and GitHub Pages setup. Do not deviate from that pattern without a good reason.  
**Trigger:** GitHub Actions, running once per week.  
**Pipeline (in order):**  
1. Ingest RSS feeds from financial journalism sources  
2. Score and select the 2–4 most educationally valuable stories  
3. For each selected story, optionally enrich with EDGAR annual report data  
4. Generate structured case studies via Claude API  
5. Publish to GitHub Pages as a blog-style accumulating archive  
**Output format:** Blog-style HTML. Most recent case study prominent at top. Older cases accumulate below. Each case study is a standalone page. Student-facing: clear, engaging, no jargon without explanation.  
## **RSS Feed Sources (starting point)**  
Free RSS feeds with good corporate/financial coverage:  
- Yahoo Finance: https://finance.yahoo.com/rss/  
- Reuters Business: https://feeds.reuters.com/reuters/businessNews  
- MarketWatch: https://feeds.marketwatch.com/marketwatch/topstories/  
- Seeking Alpha (earnings): https://seekingalpha.com/feed.xml  
- Financial Times (free tier): check current availability  
Expand this list as better sources are identified. Prioritise sources with genuine editorial judgment over aggregators.  
## **Story Selection: Editorial Criteria**  
This is the heart of the system. When scoring candidate stories, apply these three criteria:  
1. **Significant** — Is this a major real-world development? (Large company, large market movement, major strategic decision, macro event)  
2. **Curriculum-linked** — Does this connect clearly to IB Business Management or IB Economics concepts? (See concept list below)  
3. **Weird** — Is this surprising, counterintuitive, or genuinely unusual in a way students would find interesting?  
**Selection rule: a story scoring high on any 2 of these 3 criteria should be selected.**  
A story that is significant AND curriculum-linked does not need to be weird. A story that is weird AND curriculum-linked does not need to be significant. This keeps the output fresh and prevents the site from becoming a parade of Apple and Tesla earnings reports.  
Aim for 2–4 case studies per week. Quality over quantity.  
## **IB Curriculum Concept Reference**  
When tagging stories and generating case studies, map to these concept areas where relevant:  
**IB Business Management:**  
- Business organisation and environment  
- Human resource management  
- Finance and accounts  
- Marketing  
- Operations management  
- Strategic management (HL)  
**IB Economics:**  
- Microeconomics (supply/demand, elasticity, market structures, market failure)  
- Macroeconomics (GDP, unemployment, inflation, fiscal/monetary policy)  
- International economics (trade, exchange rates, globalisation)  
- Development economics  
Do not force a curriculum tag. If a story is selected for being weird, it is acceptable for the curriculum link to be loose.  
## **EDGAR Enrichment (optional per story)**  
When a specific company has been identified as the subject of a case study, the system may optionally fetch that company's most recent 10-K annual report from EDGAR.  
EDGAR free API base URL: https://data.sec.gov/  
Useful sections to extract from 10-K filings:  
- **Item 1A: Risk Factors** — rich material for critical analysis  
- **Item 7: MD&A** (Management Discussion and Analysis) — company's own narrative on performance  
This enrichment step is optional. Run it when a company is clearly identified and the annual report would meaningfully add depth. Do not run it for macro stories with no single company subject.  
## **Case Study Structure**  
Each generated case study should follow this structure:  
### **1. Hook (1–2 sentences)**  
Journalistic, punchy. Something a student would actually want to read.  
### **2. Background (short paragraph)**  
Who is this company or what is this situation? Assume the student knows nothing.  
### **3. What Happened (bullet points or short paragraphs)**  
The key developments. Factual, clear, no editorialising.  
### **4. Data Snapshot (if available)**  
Key numbers. Revenue, growth rate, margins, market share, whatever is relevant. Presented simply.  
### **5. The Tension**  
What is the core business or economic problem here? What competing pressures or interests are at play? This is the analytical heart of the case study.  
### **6. Outside View (if available)**  
How are journalists, analysts, or competitors interpreting this differently from how the company frames it?  
### **7. Reflection Questions (4–6 questions)**  
On a second page or clearly separated section. Questions should:  
- Require analysis, not just recall  
- Connect to IB concepts where natural  
- Include at least one "what would you need to know to decide?" style question  
- Include at least one genuinely open evaluative question  
### **8. Extension (optional)**  
One suggested task for students who want to go further. Research, debate, data interpretation, or comparison with another company.  
## **Tone and Register**  
- Written for 16–18 year old students  
- Engaging but not condescending  
- Assume intelligence, not prior business knowledge  
- Avoid jargon without explanation  
- No bullet-point overload in the main case text — use prose  
- Questions section can use a numbered list  
## **Company Watchlist (seed list — expand over time)**  
Always monitor news about these companies as a baseline:  
Apple, Microsoft, Alphabet (Google), Amazon, Meta, Tesla, Nike, Unilever, LVMH, McDonald's, Coca-Cola, Nestlé, Toyota, Samsung, TSMC, Spotify, Netflix, Airbnb, OpenAI (when public information available), Patagonia  
This watchlist guarantees baseline output. The broader RSS scan should surface stories beyond this list when they meet the 2-of-3 selection criteria.  
## **What Is Not In Scope (yet)**  
- Student personalisation or company tracking features  
- Teacher controls or filtering interface  
- Vietnam/Asia-Pacific company coverage (add later)  
- Direct scraping of non-RSS sources (add later)  
- LMS integration  
- PDF output  
## **First Task for Claude Code**  
**Do not build the whole system at once.**  
Start here:  
Build the news ingestion and story selection step only. It should: pull from the RSS feeds listed above, parse stories from the last 7 days, score each story against the three editorial criteria (significant, curriculum-linked, weird), and output a ranked JSON list of candidate stories with scores and brief justifications. No case study generation yet.  
Get this working, inspectable, and testable before moving to generation.  
   
