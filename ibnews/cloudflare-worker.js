// ============================================================
// THE DAILY DISPATCH — Cloudflare Worker
// Deploy at: https://dash.cloudflare.com → Workers & Pages
//
// Environment variables to set in the Worker dashboard:
//   ANTHROPIC_API_KEY  →  your sk-ant-... key
//   ALLOWED_ORIGIN     →  https://unisam.nz
// ============================================================

export default {
  async fetch(request, env) {

    // ── CORS preflight ──
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204, env.ALLOWED_ORIGIN);
    }

    // ── Origin check ──
    const origin = request.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGIN || 'https://unisam.nz';

    // Allow both www and non-www, and localhost for local dev
    const isAllowed =
      origin === allowed ||
      origin === allowed.replace('https://', 'https://www.') ||
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1');

    if (!isAllowed) {
      return corsResponse({ error: 'Forbidden' }, 403, allowed);
    }

    // ── Only accept POST ──
    if (request.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405, allowed);
    }

    // ── Parse request body ──
    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse({ error: 'Invalid JSON' }, 400, allowed);
    }

    // ── Forward to Anthropic ──
    try {
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });

      const data = await anthropicRes.json();

      if (!anthropicRes.ok) {
        return corsResponse(data, anthropicRes.status, allowed);
      }

      return corsResponse(data, 200, allowed);

    } catch (err) {
      return corsResponse({ error: 'Upstream error', detail: err.message }, 502, allowed);
    }
  }
};

function corsResponse(body, status, origin) {
  const headers = {
    'Access-Control-Allow-Origin': origin || 'https://unisam.nz',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  return new Response(
    body !== null ? JSON.stringify(body) : null,
    { status, headers }
  );
}
