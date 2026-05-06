const CORS = {
  'Access-Control-Allow-Origin': '*', // Replace * with 'https://samsmasm.github.io' in production
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method === 'GET') {
      const key = env.CASEGEN_KEY || '';
      const probe = await fetch('https://httpbin.org/get', { headers: { 'X-Test': 'ok' } });
      return new Response(JSON.stringify({
        keyLength: key.length,
        keyPrefix: key.substring(0, 10),
        probeStatus: probe.status,
      }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: CORS });
    }

    try {
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
          status: 400,
          headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }

      const payload = {
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        system: body.systemInstruction,
        messages: [{ role: 'user', content: body.prompt }],
      };

      const upstream = await fetch('https://gateway.ai.cloudflare.com/v1/5f1a884e9b49e3269e8b789e3c40b49b/casegen/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.CASEGEN_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(payload),
      });

      const data = await upstream.json();
      data._status = upstream.status;

      return new Response(JSON.stringify(data), {
        status: upstream.status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
  },
};
