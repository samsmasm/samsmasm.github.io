// ============================================================
// Generic Anthropic proxy — Taxation & Redistribution app
//
// Environment variables (set in Worker dashboard as Secrets):
//   ANTHROPIC_API_KEY   →  your sk-ant-... key
//   ALLOWED_ORIGIN      →  https://unisam.nz
// ============================================================

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204, env);
    }

    const origin = request.headers.get('Origin') || '';
    const isAllowed =
      origin.includes('unisam.nz') ||
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1');

    if (!isAllowed) {
      return corsResponse({ error: `Forbidden — origin: ${origin}` }, 403, env);
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

    const { system, message, max_tokens = 600 } = params;
    if (!message) {
      return corsResponse({ error: 'Missing message' }, 400, env);
    }

    try {
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens,
          ...(system ? { system } : {}),
          messages: [{ role: 'user', content: message }],
        }),
      });

      const data = await anthropicRes.json();

      if (!anthropicRes.ok) {
        return corsResponse({ error: 'Anthropic error: ' + JSON.stringify(data) }, 502, env);
      }

      const text = data.content?.find(b => b.type === 'text')?.text || '';
      return corsResponse({ text }, 200, env);

    } catch (err) {
      return corsResponse({ error: err.message || 'Upstream error' }, 502, env);
    }
  }
};

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
