/**
 * Plainspeak — classic text modernizer. Cloudflare Worker.
 *
 * Route: unisam.nz/moderntranslation/*  (zone must be proxied / orange-cloud).
 *
 * Does three jobs (mirrors the typeit worker's gate + proxy shape):
 *   1. Password gate. A signed, HttpOnly cookie unlocks /moderntranslation/*.
 *      Unauthenticated requests never reach the GitHub Pages origin, they get
 *      the login page instead.
 *   2. Claude proxy. POST /moderntranslation/api/translate forwards a fully
 *      constructed prompt to the Anthropic API server-side and returns the raw
 *      response. The frontend builds the prompt; the worker stays a thin
 *      pass-through so prompt iteration needs no redeploy.
 *   3. Gemini proxy. POST /moderntranslation/api/verify forwards an original +
 *      translation pair to Gemini for a meaning-only fidelity check.
 *
 * Secrets (set via `wrangler secret put ...`, NOT in this file):
 *   SITE_PASSWORD     - the shared password.
 *   AUTH_SECRET       - random string used to sign the session cookie.
 *   ANTHROPIC_API_KEY - Claude API key.
 *   GEMINI_API_KEY    - Google AI Studio / Gemini API key.
 */

const COOKIE = 'mtauth';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const CLAUDE_MODEL = 'claude-sonnet-4-6';
const CLAUDE_MAX_TOKENS = 8000;
const GEMINI_MODEL = 'gemini-3-flash-preview';

// --- auth helpers (shared shape with the wc26 / typeit workers) ------------
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
<meta name="robots" content="noindex, nofollow"><title>Plainspeak</title>
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
  background:#f5f0ff;color:#1d1430}
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
<form class="card" method="POST" action="/moderntranslation/login" autocomplete="off">
  <p class="mark">Plainspeak</p>
  <p class="sub">Classic texts in plain modern English</p>
  <label for="p">Password</label>
  <input id="p" name="password" type="password" autofocus autocomplete="off">
  <button type="submit">Enter</button>
  ${message ? `<p class="err">${message}</p>` : ''}
</form></body></html>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'no-store' } });
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// --- upstream call helpers -------------------------------------------------
const sleep = ms => new Promise(r => setTimeout(r, ms));
// 408 = timeout, 429 = rate limit, 5xx = transient. Worth a retry.
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504, 529]);

// Claude: the frontend sends { system, user, max_tokens }. We forward verbatim.
async function callClaude(env, system, user, maxTokens) {
  const body = {
    model: CLAUDE_MODEL,
    max_tokens: maxTokens || CLAUDE_MAX_TOKENS,
    ...(system ? { system } : {}),
    messages: [{ role: 'user', content: user }],
  };
  let lastErr = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await sleep(800 * attempt);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
      return text;
    }
    let detail = '';
    try { detail = (await res.json())?.error?.message || ''; } catch { /* non-JSON */ }
    lastErr = `Claude ${res.status}${detail ? ': ' + detail : ''}`;
    if (!RETRYABLE.has(res.status)) break;
  }
  throw new Error(lastErr || 'Claude request failed');
}

// Gemini: the frontend sends { prompt }. We forward verbatim, low thinking for speed.
async function callGemini(env, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0, thinkingConfig: { thinkingLevel: 'low' } },
  };
  let lastErr = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await sleep(800 * attempt);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      const cand = data?.candidates?.[0];
      if (cand?.finishReason === 'SAFETY') throw new Error('Blocked by Gemini safety filters.');
      return (cand?.content?.parts || []).map(p => p.text || '').join('').trim();
    }
    let detail = '';
    try { detail = (await res.json())?.error?.message || ''; } catch { /* non-JSON */ }
    lastErr = `Gemini ${res.status}${detail ? ': ' + detail : ''}`;
    if (!RETRYABLE.has(res.status)) break;
  }
  throw new Error(lastErr || 'Gemini request failed');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Login
    if (request.method === 'POST' && url.pathname === '/moderntranslation/login') {
      const form = await request.formData();
      const pw = String(form.get('password') || '');
      if (env.SITE_PASSWORD && timingEq(pw, env.SITE_PASSWORD)) {
        const cookie = await makeCookie(env.AUTH_SECRET);
        return new Response(null, {
          status: 303,
          headers: {
            'Location': '/moderntranslation/',
            'Set-Cookie': `${COOKIE}=${cookie}; Path=/moderntranslation; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`,
          },
        });
      }
      return loginPage('Nope, try again.', 401);
    }

    const cookies = parseCookies(request.headers.get('Cookie') || '');
    const authed = await verifyCookie(cookies[COOKIE], env.AUTH_SECRET);

    // 2. Translate API (auth required)
    if (url.pathname === '/moderntranslation/api/translate') {
      if (request.method !== 'POST') return json({ error: 'POST only' }, 405);
      if (!authed) return json({ error: 'Not authorised' }, 401);
      if (!env.ANTHROPIC_API_KEY) return json({ error: 'Server is missing ANTHROPIC_API_KEY' }, 500);
      let payload;
      try { payload = await request.json(); } catch { return json({ error: 'Bad JSON' }, 400); }
      const { system, user, max_tokens } = payload || {};
      if (!user) return json({ error: 'user is required' }, 400);
      try {
        const text = await callClaude(env, system, user, max_tokens);
        return json({ text });
      } catch (e) {
        return json({ error: String(e.message || e) }, 502);
      }
    }

    // 3. Verify API (auth required)
    if (url.pathname === '/moderntranslation/api/verify') {
      if (request.method !== 'POST') return json({ error: 'POST only' }, 405);
      if (!authed) return json({ error: 'Not authorised' }, 401);
      if (!env.GEMINI_API_KEY) return json({ error: 'Server is missing GEMINI_API_KEY' }, 500);
      let payload;
      try { payload = await request.json(); } catch { return json({ error: 'Bad JSON' }, 400); }
      const { prompt } = payload || {};
      if (!prompt) return json({ error: 'prompt is required' }, 400);
      try {
        const text = await callGemini(env, prompt);
        return json({ text });
      } catch (e) {
        return json({ error: String(e.message || e) }, 502);
      }
    }

    // 4. Everything else: gate, then pass through to the GitHub Pages origin.
    if (authed) return fetch(request);
    return loginPage('', 401);
  },
};
