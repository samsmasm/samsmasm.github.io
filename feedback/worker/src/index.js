// unisam-feedback Worker.
//
//   POST   /feedback/api/report          public: submit a report (rate limited)
//   GET    /feedback/api/reports         admin: list reports, newest first
//   GET    /feedback/api/report/:id      admin: one report, with image and diagram
//   POST   /feedback/api/report/:id/done admin: toggle done
//   DELETE /feedback/api/report/:id      admin: delete report and image
//
// Admin calls need `Authorization: Bearer <ADMIN_KEY>`.
//
// KV layout:
//   r:<invTs>:<id>  full report JSON; KV metadata holds the list-view summary,
//                   so listing needs no extra reads. invTs makes newest sort first.
//   img:<id>        screenshot data URL (only when the person opted in)
//   rl:<ip>:<hour>  submission counter for rate limiting

const ALLOWED_ORIGINS = [
  'https://unisam.nz', 'https://www.unisam.nz', 'https://samsmasm.github.io',
  'http://127.0.0.1:8787', 'http://localhost:8787',
];
const MAX_BODY = 2_500_000;        // bytes, whole request
const MAX_IMAGE = 2_000_000;       // chars of data URL
const MAX_DIAGRAM = 300_000;       // chars of save code / diagram JSON
const MAX_MESSAGE = 4000;
const RATE_PER_HOUR = 12;
const REPORT_TTL = 60 * 60 * 24 * 365; // reports expire after a year

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const path = url.pathname.replace(/^\/feedback\/api/, '').replace(/\/+$/, '');
    try {
      if (path === '/report' && request.method === 'POST') return await submit(request, env, cors);

      if (!isAdmin(request, env)) return json({ error: 'unauthorised' }, 401, cors);
      if (path === '/reports' && request.method === 'GET') return await list(url, env, cors);
      const m = path.match(/^\/report\/([a-z0-9]+)(\/done)?$/);
      if (m && request.method === 'GET' && !m[2]) return await getOne(m[1], env, cors);
      if (m && request.method === 'POST' && m[2]) return await toggleDone(m[1], env, cors);
      if (m && request.method === 'DELETE' && !m[2]) return await remove(m[1], env, cors);
      return json({ error: 'not found' }, 404, cors);
    } catch (e) {
      console.error('feedback error', e && e.stack || e);
      return json({ error: 'server error' }, 500, cors);
    }
  },
};

function corsHeaders(origin, url) {
  const h = {
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
  if (ALLOWED_ORIGINS.includes(origin) || origin === url.origin) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function isAdmin(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const key = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!env.ADMIN_KEY || !key || key.length !== env.ADMIN_KEY.length) return false;
  // Constant-time compare.
  let diff = 0;
  for (let i = 0; i < key.length; i++) diff |= key.charCodeAt(i) ^ env.ADMIN_KEY.charCodeAt(i);
  return diff === 0;
}

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

async function submit(request, env, cors) {
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > MAX_BODY) return json({ error: 'too large' }, 413, cors);
  const text = await request.text();
  if (text.length > MAX_BODY) return json({ error: 'too large' }, 413, cors);
  let body;
  try { body = JSON.parse(text); } catch (e) { return json({ error: 'bad json' }, 400, cors); }

  // Honeypot: a hidden field only bots fill in. Pretend success.
  if (body.website) return json({ ok: true }, 200, cors);

  const message = str(body.message, MAX_MESSAGE).trim();
  if (!message) return json({ error: 'empty message' }, 400, cors);

  // Rate limit per IP per hour. KV is eventually consistent, so this is a soft
  // limit, which is fine for a spam backstop.
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const hour = Math.floor(Date.now() / 3_600_000);
  const rlKey = `rl:${ip}:${hour}`;
  const count = Number(await env.FEEDBACK_KV.get(rlKey)) || 0;
  if (count >= RATE_PER_HOUR) return json({ error: 'rate limited' }, 429, cors);
  await env.FEEDBACK_KV.put(rlKey, String(count + 1), { expirationTtl: 7200 });

  const image = typeof body.image === 'string' && /^data:image\/(jpeg|png);base64,/.test(body.image)
    && body.image.length <= MAX_IMAGE ? body.image : null;
  const diagram = str(body.diagram, MAX_DIAGRAM) || null;

  const now = Date.now();
  const id = now.toString(36) + crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  const report = {
    id, ts: new Date(now).toISOString(),
    app: str(body.app, 40) || 'unknown',
    type: ['bug', 'idea', 'other'].includes(body.type) ? body.type : 'other',
    message,
    email: str(body.email, 200).trim() || null,
    meta: sanitiseMeta(body.meta),
    country: (request.cf && request.cf.country) || null,
    diagram,
    hasImage: !!image,
    done: false,
  };
  const key = reportKey(now, id);
  await env.FEEDBACK_KV.put(key, JSON.stringify(report), { metadata: summary(report), expirationTtl: REPORT_TTL });
  if (image) await env.FEEDBACK_KV.put(`img:${id}`, image, { expirationTtl: REPORT_TTL });
  return json({ ok: true, id }, 200, cors);
}

// Only flat string/number/boolean values, size-capped, from the client's meta.
function sanitiseMeta(meta) {
  const out = {};
  if (!meta || typeof meta !== 'object') return out;
  for (const [k, v] of Object.entries(meta).slice(0, 30)) {
    if (typeof v === 'number' || typeof v === 'boolean') out[k.slice(0, 40)] = v;
    else if (typeof v === 'string') out[k.slice(0, 40)] = v.slice(0, 1500);
  }
  return out;
}

function reportKey(ts, id) {
  const inv = (9_999_999_999_999 - ts).toString().padStart(13, '0');
  return `r:${inv}:${id}`;
}

function summary(r) {
  return {
    id: r.id, ts: r.ts, app: r.app, type: r.type, done: r.done,
    hasImage: r.hasImage, hasDiagram: !!r.diagram,
    excerpt: r.message.slice(0, 160),
  };
}

async function list(url, env, cors) {
  const res = await env.FEEDBACK_KV.list({ prefix: 'r:', limit: 100, cursor: url.searchParams.get('cursor') || undefined });
  const app = url.searchParams.get('app');
  const reports = res.keys.map(k => ({ key: k.name, ...(k.metadata || {}) }))
    .filter(r => !app || r.app === app);
  return json({ reports, cursor: res.list_complete ? null : res.cursor }, 200, cors);
}

async function findKey(id, env) {
  // The id starts with the base-36 timestamp, which gives the exact key.
  const ts = parseInt(id.slice(0, 8), 36);
  const key = reportKey(ts, id);
  return (await env.FEEDBACK_KV.get(key)) !== null ? key : null;
}

async function getOne(id, env, cors) {
  const key = await findKey(id, env);
  if (!key) return json({ error: 'not found' }, 404, cors);
  const report = JSON.parse(await env.FEEDBACK_KV.get(key));
  report.image = report.hasImage ? await env.FEEDBACK_KV.get(`img:${id}`) : null;
  return json(report, 200, cors);
}

async function toggleDone(id, env, cors) {
  const key = await findKey(id, env);
  if (!key) return json({ error: 'not found' }, 404, cors);
  const report = JSON.parse(await env.FEEDBACK_KV.get(key));
  report.done = !report.done;
  await env.FEEDBACK_KV.put(key, JSON.stringify(report), { metadata: summary(report), expirationTtl: REPORT_TTL });
  return json({ ok: true, done: report.done }, 200, cors);
}

async function remove(id, env, cors) {
  const key = await findKey(id, env);
  if (!key) return json({ error: 'not found' }, 404, cors);
  await env.FEEDBACK_KV.delete(key);
  await env.FEEDBACK_KV.delete(`img:${id}`);
  return json({ ok: true }, 200, cors);
}
