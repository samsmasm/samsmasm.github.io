/**
 * typeit — pages -> text. Cloudflare Worker.
 *
 * Route: unisam.nz/typeit/*  (zone must be proxied / orange-cloud).
 *
 * Does two jobs:
 *   1. Password gate. A signed, HttpOnly cookie unlocks /typeit/*. Mirrors the
 *      wc26 worker: unauthenticated requests never reach the GitHub Pages
 *      origin, they get the login page instead.
 *   2. Gemini proxy. POST /typeit/api/transcribe accepts one page (base64
 *      image or PDF), calls Gemini server-side with the secret key, and
 *      returns the transcribed text. The key never touches the browser.
 *
 * Secrets (set via `wrangler secret put ...`, NOT in this file):
 *   SITE_PASSWORD   - the shared password.
 *   AUTH_SECRET     - random string used to sign the session cookie.
 *   GEMINI_API_KEY  - your Google AI Studio / Gemini API key.
 */

const COOKIE = 'typeitauth';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const MODEL = 'gemini-3-flash-preview';
const MAX_BYTES = 25 * 1024 * 1024; // 25MB per page, after base64 decode

// --- prompts --------------------------------------------------------------
// Three source types, because handwriting and print want opposite things.
// Handwriting: preserve the line breaks, they carry meaning. Print: the line
// breaks are an artefact of the column width, so reflow them and keep the
// visible structure (headings, lists, tables) as Markdown instead.

// Fidelity rules that apply whatever the source is.
const COMMON_RULES = [
  'Reproduce the wording, spelling, punctuation and capitalisation exactly.',
  'Do not correct, paraphrase, summarise, translate, or add anything.',
  'For any word or character you genuinely cannot read, write [?] in its place.',
  'If a whole passage is illegible, write [illegible].',
  'If the page contains no text at all, output exactly: [no text on this page]',
  'Output ONLY the transcription. No commentary, no preamble, no markdown code fences.',
].join(' ');

// Shared by the two printed-layout prompts.
const LAYOUT_RULES = [
  'Read the page in natural reading order. If the layout has multiple columns,',
  'transcribe each column in full before moving to the next; never interleave them.',
  'Rejoin lines that the layout wrapped into flowing paragraphs, and repair words',
  'split by a hyphen at a line break. Keep genuine paragraph breaks as blank lines.',
  'Use Markdown for structure that is visibly present on the page: headings, bold and',
  'italic, bulleted and numbered lists, block quotes, and tables.',
  'Ignore running heads, footers and page numbers.',
].join(' ');

const PROMPTS = {
  handwriting: [
    'You are transcribing handwritten notes for a careful archivist.',
    'Transcribe the text in this image or document VERBATIM.',
    'Preserve the paragraph and line breaks exactly as written.',
    'Use plain text only, no Markdown formatting.',
    COMMON_RULES,
  ].join(' '),

  printed: [
    'You are transcribing a printed or typed document.',
    LAYOUT_RULES,
    'Put any footnotes at the end, under a "Notes" heading.',
    COMMON_RULES,
  ].join(' '),

  mixed: [
    'You are transcribing a page that contains both printed and handwritten text,',
    'such as a completed form or an annotated handout.',
    LAYOUT_RULES,
    'Transcribe handwriting in the place it appears on the page, so that written answers',
    'stay with the printed questions they belong to.',
    COMMON_RULES,
  ].join(' '),
};

// One optional modifier per source type, appended when the client sends
// { option: true }. The UI shows exactly one checkbox, relabelled per source.
const MODIFIERS = {
  handwriting:
    'IMPORTANT: If most of the text on the page is handwritten, transcribe ONLY the handwriting '
    + 'and ignore any typed or printed text (such as letterhead, form labels, or printed questions).',
  printed:
    'IMPORTANT: Ignore anything added by hand, such as handwritten notes, marginalia, underlining, '
    + 'highlighting, ticks and crosses. Transcribe only the printed or typed text.',
  mixed:
    'IMPORTANT: Mark every handwritten passage by wrapping it as [hw: ...] so that printed and '
    + 'handwritten content can be told apart. Leave printed text unmarked.',
};

function buildPrompt(source, option) {
  const base = PROMPTS[source] || PROMPTS.handwriting;
  return option ? `${base} ${MODIFIERS[source] || MODIFIERS.handwriting}` : base;
}

// --- auth helpers (shared shape with the wc26 worker) ---------------------
const enc = s => new TextEncoder().encode(s);
function b64url(bytes) {
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function sign(value, secret) {
  const key = await crypto.subtle.importKey('raw', enc(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc(value));
  return b64url(new Uint8Array(sig));
}
function timingEq(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
async function makeCookie(secret) {
  const payload = `v1.${Date.now() + MAX_AGE * 1000}`;
  return `${payload}.${await sign(payload, secret)}`;
}
async function verifyCookie(cookie, secret) {
  if (!cookie) return false;
  const i = cookie.lastIndexOf('.');
  if (i < 0) return false;
  const payload = cookie.slice(0, i), sig = cookie.slice(i + 1);
  if (!timingEq(sig, await sign(payload, secret))) return false;
  const exp = parseInt(payload.split('.')[1], 10);
  return Number.isFinite(exp) && Date.now() < exp;
}
function parseCookies(header) {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

function loginPage(message, status) {
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>typeit</title>
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
  background:#f4f1f8;color:#1d1430}
.card{background:#fff;border:1px solid #e4ddef;border-radius:14px;padding:32px 28px;
  width:100%;max-width:340px;text-align:center}
.mark{font-family:Georgia,serif;font-weight:700;font-size:26px;color:#4a1a7a;margin:0 0 4px}
.sub{margin:0 0 22px;color:#6b5f80;font-size:13px}
label{display:block;font-weight:600;color:#2a2040;margin-bottom:8px;text-align:left;font-size:14px}
input{width:100%;padding:12px 14px;font-size:16px;border:2px solid #e0d8ee;border-radius:10px;outline:none}
input:focus{border-color:#4a1a7a}
button{margin-top:16px;width:100%;background:#4a1a7a;color:#fff;border:0;font-weight:700;
  font-size:15px;padding:12px;border-radius:10px;cursor:pointer}
button:hover{background:#3a1361}
.err{color:#c62a30;font-weight:600;font-size:13px;margin:14px 0 0}
</style></head><body>
<form class="card" method="POST" action="/typeit/login" autocomplete="off">
  <p class="mark">typeit</p>
  <p class="sub">Pages to text</p>
  <label for="p">Password</label>
  <input id="p" name="password" type="password" autofocus autocomplete="off">
  <button type="submit">Enter</button>
  ${message ? `<p class="err">${message}</p>` : ''}
</form></body></html>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'no-store' } });
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// --- Gemini call ----------------------------------------------------------
const sleep = ms => new Promise(r => setTimeout(r, ms));
// 524/408 = timeout, 429 = rate limit, 5xx = transient server errors. Worth a retry.
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504, 524]);

// Gemini can answer 200 with a candidate that carries no text at all. Returning
// '' for that case made the page print "[no text on this page]", which reads as
// "the page was blank" when the real cause is a refusal or a truncation. Name it
// instead. finishReason values are from the v1beta discovery spec.
function noTextReason(data, cand) {
  const blocked = data?.promptFeedback?.blockReason;
  if (blocked) return `Gemini blocked the request (${blocked}).`;
  switch (cand?.finishReason) {
    case 'SAFETY':
      return 'Blocked by Gemini safety filters.';
    case 'RECITATION':
      return 'Gemini withheld the text because it matched published material (RECITATION). '
        + 'Common on book and article pages.';
    case 'MAX_TOKENS':
      return 'Hit the output token limit before producing any text (MAX_TOKENS).';
    case 'PROHIBITED_CONTENT':
    case 'BLOCKLIST':
    case 'SPII':
    case 'LANGUAGE':
      return `Gemini refused this page (${cand.finishReason}).`;
    default:
      return `Gemini returned no text (finishReason: ${cand?.finishReason || 'none'}).`;
  }
}

async function transcribe(env, mimeType, dataB64, source, option) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const prompt = buildPrompt(source, option);
  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType, data: dataB64 } },
      ],
    }],
    // temperature 0 for fidelity; low thinking keeps OCR fast and avoids timeouts.
    generationConfig: { temperature: 0, thinkingConfig: { thinkingLevel: 'low' } },
  };

  let lastErr = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await sleep(800 * attempt); // 0.8s, 1.6s backoff
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      const cand = data?.candidates?.[0];
      // `thought` parts are the model's reasoning, not the transcription.
      const text = (cand?.content?.parts || [])
        .filter(p => !p.thought)
        .map(p => p.text || '')
        .join('')
        .trim();
      if (text) return text;
      throw new Error(noTextReason(data, cand));
    }
    let detail = '';
    try { detail = (await res.json())?.error?.message || ''; } catch { /* non-JSON body */ }
    lastErr = `Gemini ${res.status}${detail ? ': ' + detail : ''}`;
    if (!RETRYABLE.has(res.status)) break; // permanent error -> stop retrying
  }
  throw new Error(lastErr || 'Gemini request failed');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Login
    if (request.method === 'POST' && url.pathname === '/typeit/login') {
      const form = await request.formData();
      const pw = String(form.get('password') || '');
      if (env.SITE_PASSWORD && timingEq(pw, env.SITE_PASSWORD)) {
        const cookie = await makeCookie(env.AUTH_SECRET);
        return new Response(null, {
          status: 303,
          headers: {
            'Location': '/typeit/',
            'Set-Cookie': `${COOKIE}=${cookie}; Path=/typeit; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`,
          },
        });
      }
      return loginPage('Nope, try again.', 401);
    }

    const cookies = parseCookies(request.headers.get('Cookie') || '');
    const authed = await verifyCookie(cookies[COOKIE], env.AUTH_SECRET);

    // 2. Transcribe API (auth required)
    if (url.pathname === '/typeit/api/transcribe') {
      if (request.method !== 'POST') return json({ error: 'POST only' }, 405);
      if (!authed) return json({ error: 'Not authorised' }, 401);
      if (!env.GEMINI_API_KEY) return json({ error: 'Server is missing GEMINI_API_KEY' }, 500);
      let payload;
      try { payload = await request.json(); } catch { return json({ error: 'Bad JSON' }, 400); }
      const { mimeType, data, source, option, ignoreTyped } = payload || {};
      if (!mimeType || !data) return json({ error: 'mimeType and data are required' }, 400);
      if (!/^(image\/|application\/pdf)/.test(mimeType)) return json({ error: 'Unsupported file type' }, 415);
      // base64 length ~ 4/3 of byte length; cheap size guard
      if (data.length * 3 / 4 > MAX_BYTES) return json({ error: 'Page too large (max 25MB)' }, 413);
      // `ignoreTyped` is the pre-source-selector field name; still honoured so an
      // old cached page keeps working.
      const src = Object.hasOwn(PROMPTS, source) ? source : 'handwriting';
      try {
        const text = await transcribe(env, mimeType, data, src, option === true || ignoreTyped === true);
        return json({ text });
      } catch (e) {
        return json({ error: String(e.message || e) }, 502);
      }
    }

    // 3. Everything else: gate, then pass through to the GitHub Pages origin.
    if (authed) return fetch(request);
    return loginPage('', 401);
  },
};
