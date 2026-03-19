// ============================================================
// IB News Finder — Cloudflare Worker
//
// Environment variables (set in Worker dashboard as Secrets):
//   ANTHROPIC_API_KEY   →  your sk-ant-... key
//   GUARDIAN_API_KEY    →  your Guardian API key
//   NYT_API_KEY         →  your NYT Article Search key
//   NEWSAPI_KEY         →  your NewsAPI.org key
//   ALLOWED_ORIGIN      →  https://unisam.nz
// ============================================================

export default {
  async fetch(request, env) {

    // ── CORS preflight ──
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204, env);
    }

    // ── Origin check ──
    const origin = request.headers.get('Origin') || '';
    const isAllowed =
      origin.includes('unisam.nz') ||
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1');

    if (!isAllowed) {
      return corsResponse({ error: { message: `Forbidden — origin: ${origin}` } }, 403, env);
    }

    if (request.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405, env);
    }

    let params;
    try {
      params = await request.json();
    } catch {
      return corsResponse({ error: 'Invalid JSON' }, 400, env);
    }

    const { subject, subjectName, topicLabel, conceptLabel, paper, recency, focus } = params;

    try {
      // ── Build search query and date filter ──
      const query = buildQuery(topicLabel, subjectName, focus);
      const fromDate = getFromDate(recency);

      // ── Fetch from all three news APIs in parallel ──
      const [guardianResult, nytResult, newsApiResult] = await Promise.allSettled([
        fetchGuardian(query, fromDate, env.GUARDIAN_API_KEY),
        fetchNYT(query, fromDate, env.NYT_API_KEY),
        fetchNewsAPI(query, fromDate, env.NEWSAPI_KEY),
      ]);

      const guardianArticles = guardianResult.status === 'fulfilled' ? guardianResult.value : [];
      const nytArticles = nytResult.status === 'fulfilled' ? nytResult.value : [];
      const newsApiArticles = newsApiResult.status === 'fulfilled' ? newsApiResult.value : [];

      const debugInfo = {
        query,
        fromDate,
        guardian: guardianResult.status === 'rejected' ? guardianResult.reason?.message : `${guardianArticles.length} articles`,
        nyt: nytResult.status === 'rejected' ? nytResult.reason?.message : `${nytArticles.length} articles`,
        newsapi: newsApiResult.status === 'rejected' ? newsApiResult.reason?.message : `${newsApiArticles.length} articles`,
      };

      const articles = mergeArticles(guardianArticles, nytArticles, newsApiArticles);

      if (articles.length === 0) {
        return corsResponse({ error: { message: 'No articles found. Debug: ' + JSON.stringify(debugInfo) } }, 200, env);
      }

      // ── Call Claude for analysis only (no web search) ──
      const systemPrompt = buildSystemPrompt(subjectName, topicLabel, conceptLabel, paper, recency, focus);
      const userMessage = buildUserMessage(articles, topicLabel, subjectName);

      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 3000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });

      const claudeData = await anthropicRes.json();

      if (!anthropicRes.ok) {
        return corsResponse(claudeData, anthropicRes.status, env);
      }

      // ── Extract and parse the JSON from Claude's response ──
      const textBlock = claudeData.content?.find(b => b.type === 'text');
      if (!textBlock?.text) {
        return corsResponse({ error: { message: 'No response from Claude.' } }, 200, env);
      }

      const match = textBlock.text.match(/\{[\s\S]*\}/);
      if (!match) {
        return corsResponse({ error: { message: 'Unexpected response format from Claude.' } }, 200, env);
      }

      const parsed = JSON.parse(match[0]);
      return corsResponse(parsed, 200, env);

    } catch (err) {
      return corsResponse({ error: { message: err.message || 'Upstream error', stack: err.stack } }, 502, env);
    }
  }
};

// ── Helper: build search query from topic/subject/focus ──
function buildQuery(topicLabel, subjectName, focus) {
  // Strip numbering ("2.2 ") and "(HL)" from topic label
  const topic = (topicLabel || subjectName || '')
    .replace(/^\d+\.\d+\s+/, '')
    .replace(/\s*\(HL[^)]*\)/i, '')
    .trim();
  const parts = [topic];
  if (focus) parts.push(focus);
  return parts.join(' ');
}

// ── Helper: convert recency string to ISO date ──
function getFromDate(recency) {
  const daysMap = {
    'last week': 7,
    'last month': 30,
    'last 6 months': 180,
    'last year': 365,
  };
  const days = daysMap[recency];
  if (!days) return null;
  const d = new Date(Date.now() - days * 86400000);
  return d.toISOString().split('T')[0];
}

// ── Guardian API ──
async function fetchGuardian(query, fromDate, apiKey) {
  try {
    const params = new URLSearchParams({
      q: query,
      'api-key': apiKey,
      'show-fields': 'trailText',
      'page-size': '6',
      'order-by': 'relevance',
    });
    if (fromDate) params.set('from-date', fromDate);

    const res = await fetch(`https://content.guardianapis.com/search?${params}`);
    const data = await res.json();

    return (data.response?.results || []).map(a => ({
      headline: a.webTitle,
      publication: 'The Guardian',
      date: a.webPublicationDate?.split('T')[0] || '',
      url: a.webUrl,
      snippet: a.fields?.trailText || '',
    }));
  } catch {
    return [];
  }
}

// ── NYT Article Search API ──
async function fetchNYT(query, fromDate, apiKey) {
  try {
    const params = new URLSearchParams({
      q: query,
      'api-key': apiKey,
      sort: 'relevance',
    });
    if (fromDate) params.set('begin_date', fromDate.replace(/-/g, ''));

    const res = await fetch(`https://api.nytimes.com/svc/search/v2/articlesearch.json?${params}`);
    const data = await res.json();

    return (data.response?.docs || []).slice(0, 6).map(a => ({
      headline: a.headline?.default || '',
      publication: 'New York Times',
      date: a.pub_date?.split('T')[0] || '',
      url: a.web_url,
      snippet: a.abstract || a.snippet || '',
    }));
  } catch {
    return [];
  }
}

// ── NewsAPI ──
async function fetchNewsAPI(query, fromDate, apiKey) {
  try {
    const params = new URLSearchParams({
      q: query,
      apiKey: apiKey,
      language: 'en',
      sortBy: 'relevancy',
      pageSize: '6',
      sources: 'bbc-news,reuters,bloomberg,the-economist,financial-times,al-jazeera-english,abc-news',
    });
    if (fromDate) params.set('from', fromDate);

    const res = await fetch(`https://newsapi.org/v2/everything?${params}`);
    const data = await res.json();

    return (data.articles || []).map(a => ({
      headline: a.title,
      publication: a.source?.name || '',
      date: a.publishedAt?.split('T')[0] || '',
      url: a.url,
      snippet: a.description || '',
    }));
  } catch {
    return [];
  }
}

// ── Merge and deduplicate articles ──
function mergeArticles(guardian, nyt, newsApi) {
  const seen = new Set();
  return [...guardian, ...nyt, ...newsApi].filter(a => {
    if (!a.url || seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });
}

// ── System prompt for Claude ──
function buildSystemPrompt(subjectName, topicLabel, conceptLabel, paper, recency, focus) {
  return `You are a research assistant helping an IB teacher find news articles for classroom use. You will receive a list of real, recently published articles from The Guardian, New York Times, BBC, Reuters, and similar quality sources.

Your task: select the 2–3 best articles from the list and return structured analysis for classroom use.

SELECTION — prioritise articles that are:
1. Directly relevant to the IB syllabus topic (non-negotiable)
2. Genuinely interesting to 16–18 year old students — controversies, human angles, things that affect young people's lives
3. From the highest-quality sources in the list

CURRICULUM CONTEXT:
- Subject: ${subjectName}
- Topic: ${topicLabel || 'general'}
- Key Concept: ${conceptLabel && conceptLabel !== '— any concept —' ? conceptLabel : 'any'}
- Paper/Assessment: ${paper || 'any'}
- Focus: ${focus || 'none'}

Return ONLY this JSON — no preamble, no markdown fences:

{
  "searchContext": {
    "subject": "${subjectName}",
    "topic": "${topicLabel || 'General'}",
    "concept": "${conceptLabel || ''}",
    "recency": "${recency}"
  },
  "articles": [
    {
      "headline": "article headline",
      "publication": "publication name",
      "date": "YYYY-MM-DD",
      "url": "article URL",
      "isOpinion": false,
      "summary": "2 short paragraphs in plain student-friendly language — what happened, who is involved, why it matters. Include key figures or facts. Paragraphs separated by \\n. Write for a smart 17-year-old with no prior subject knowledge.",
      "syllabusPoints": ["Specific IB syllabus point", "Secondary point if applicable"],
      "curriculumConnections": "2 sentences max. Name the specific concept/model/theory and explain the direct link.",
      "crossTopicLinks": "1 sentence naming 1–2 other syllabus areas this connects to.",
      "iaRelevance": null,
      "questions": {
        "ib": [
          "IB command-term question (evaluate/examine/discuss/to what extent) referencing the article",
          "A second IB-style question"
        ],
        "discussion": [
          "Punchy discussion starter — no subject knowledge assumed",
          "A second discussion question"
        ],
        "hl": null
      }
    }
  ]
}

For iaRelevance: one specific sentence if the article could anchor an IB ${subjectName} IA. Otherwise null.`;
}

// ── User message: pass article list to Claude ──
function buildUserMessage(articles, topicLabel, subjectName) {
  const list = articles.map((a, i) =>
    `${i + 1}. ${a.headline}\n   Source: ${a.publication} | Date: ${a.date}\n   URL: ${a.url}\n   Snippet: ${a.snippet}`
  ).join('\n\n');

  return `Here are ${articles.length} recent articles from quality news sources. Select the 2–3 most relevant to "${topicLabel || subjectName}" and return the analysis JSON.\n\n${list}`;
}

// ── CORS helper ──
function corsResponse(body, status, env) {
  const allowed = env?.ALLOWED_ORIGIN || 'https://unisam.nz';
  const headers = {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  return new Response(
    body !== null ? JSON.stringify(body) : null,
    { status, headers }
  );
}
