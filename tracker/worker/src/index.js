// unisam-tracker Worker.
//
//   GET /tracker/api/projects   Firebase ID token of ALLOWED_EMAIL: the project list
//   POST /tracker/api/projects  ID token: add one project {project}
//   DELETE /tracker/api/projects ID token: delete one project {name}
//   GET /tracker/api/changes    ADMIN_KEY: web adds/deletes not yet in projects.md
//   PUT /tracker/api/projects   ADMIN_KEY: replace the list (from tracker/publish.py);
//                               `applied` lists change ids now in projects.md
//   GET /tracker/api/board?key= DEVICE_KEY: plain names-only page for the e-paper board
//
// Sign-in is Google via Firebase Auth (project FIREBASE_PROJECT). The ID token is
// verified here against Google's public keys, so nothing in Firebase itself
// stores or guards the data.

const ALLOWED_ORIGINS = ['https://unisam.nz', 'https://www.unisam.nz', 'http://127.0.0.1:8000', 'http://localhost:8000'];
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const MAX_BODY = 500_000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request.headers.get('Origin') || '');
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const path = url.pathname.replace(/^\/tracker\/api/, '').replace(/\/+$/, '');
    try {
      if (path === '/projects' && request.method === 'GET') {
        const who = await verifyIdToken(bearer(request), env);
        if (!who) return json({ error: 'unauthorised' }, 401, cors);
        const data = await env.TRACKER_KV.get('projects');
        return new Response(data || '{"projects":[]}', { headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
      }
      if (path === '/projects' && request.method === 'PUT') {
        if (!sameSecret(bearer(request), env.ADMIN_KEY)) return json({ error: 'unauthorised' }, 401, cors);
        const text = await request.text();
        if (text.length > MAX_BODY) return json({ error: 'too large' }, 413, cors);
        let body;
        try { body = JSON.parse(text); } catch (e) { return json({ error: 'bad json' }, 400, cors); }
        if (!Array.isArray(body.projects)) return json({ error: 'need projects array' }, 400, cors);
        // publish.py has written these web changes into projects.md: drop them from the log.
        const applied = new Set(Array.isArray(body.applied) ? body.applied : []);
        delete body.applied;
        await env.TRACKER_KV.put('projects', JSON.stringify(body));
        if (applied.size) {
          const log = await readJson(env, 'changes', []);
          await env.TRACKER_KV.put('changes', JSON.stringify(log.filter(c => !applied.has(c.id))));
        }
        return json({ ok: true, count: body.projects.length }, 200, cors);
      }
      if (path === '/changes' && request.method === 'GET') {
        if (!sameSecret(bearer(request), env.ADMIN_KEY)) return json({ error: 'unauthorised' }, 401, cors);
        return json({ changes: await readJson(env, 'changes', []) }, 200, cors);
      }
      // Adding and deleting from the page. The list is changed straight away and the
      // change is logged, so the next publish.py run writes it into projects.md.
      if (path === '/projects' && (request.method === 'POST' || request.method === 'DELETE')) {
        const who = await verifyIdToken(bearer(request), env);
        if (!who) return json({ error: 'unauthorised' }, 401, cors);
        const text = await request.text();
        if (text.length > 20_000) return json({ error: 'too large' }, 413, cors);
        let body;
        try { body = JSON.parse(text); } catch (e) { return json({ error: 'bad json' }, 400, cors); }
        const data = await readJson(env, 'projects', { projects: [] });
        const log = await readJson(env, 'changes', []);
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        let result;
        if (request.method === 'POST') {
          result = addProject(data, body.project);
          if (result.error) return json(result, 400, cors);
          log.push({ id, op: 'add', project: result.project });
        } else {
          result = deleteProject(data, body.name);
          if (result.error) return json(result, 404, cors);
          log.push({ id, op: 'delete', name: result.name });
        }
        await env.TRACKER_KV.put('projects', JSON.stringify(data));
        await env.TRACKER_KV.put('changes', JSON.stringify(log));
        return json({ ok: true, projects: data.projects }, 200, cors);
      }
      if (path === '/board' && request.method === 'GET') {
        if (!sameSecret(url.searchParams.get('key') || '', env.DEVICE_KEY)) return new Response('unauthorised', { status: 401 });
        const data = JSON.parse((await env.TRACKER_KV.get('projects')) || '{"projects":[]}');
        return new Response(boardPage(data), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
      }
      return json({ error: 'not found' }, 404, cors);
    } catch (e) {
      console.error('tracker error', e && e.stack || e);
      return json({ error: 'server error' }, 500, cors);
    }
  },
};

async function readJson(env, key, fallback) {
  const raw = await env.TRACKER_KV.get(key);
  return raw ? JSON.parse(raw) : fallback;
}

// ---- Adding and deleting (pure, tested in test/edit.test.mjs) ----

export const STATUSES = ['needs-work', 'works', 'check', 'idea'];
// Every value ends up as one `- key: value` line in projects.md, so no newlines.
const line = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export function addProject(data, raw) {
  if (!raw || typeof raw !== 'object') return { error: 'need project' };
  const name = line(raw.name, 80).replace(/^#+\s*/, '');
  if (!name) return { error: 'need a name' };
  if (!STATUSES.includes(raw.status)) return { error: 'bad status' };
  if (data.projects.some(p => p.name.toLowerCase() === name.toLowerCase())) return { error: 'name already used' };
  const p = { name, status: raw.status };
  for (const k of ['url', 'summary', 'last', 'functional']) {
    const v = line(raw[k], k === 'url' ? 300 : 600);
    if (v) p[k] = v;
  }
  const feats = (Array.isArray(raw.features) ? raw.features : String(raw.features || '').split(/[\n;]/))
    .map(f => line(f, 200).replace(/;/g, ',')).filter(Boolean).slice(0, 30);
  if (feats.length) p.features = feats;
  p.added = new Date().toISOString().slice(0, 10);
  p.touched = p.added;
  data.projects.push(p);
  return { project: p };
}

export function deleteProject(data, name) {
  const i = data.projects.findIndex(p => p.name === name);
  if (i < 0) return { error: 'no such project' };
  data.projects.splice(i, 1);
  return { name };
}

function corsHeaders(origin) {
  const h = {
    'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
  if (ALLOWED_ORIGINS.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function bearer(request) {
  const a = request.headers.get('Authorization') || '';
  return a.startsWith('Bearer ') ? a.slice(7) : '';
}

function sameSecret(given, secret) {
  if (!secret || !given || given.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}

// ---- Firebase ID token verification ----

function b64urlBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const b64urlJson = s => JSON.parse(new TextDecoder().decode(b64urlBytes(s)));

let jwksCache = { keys: null, until: 0 };
async function googleKeys() {
  if (jwksCache.keys && Date.now() < jwksCache.until) return jwksCache.keys;
  const res = await fetch(JWKS_URL, { cf: { cacheTtl: 3600 } });
  if (!res.ok) throw new Error('jwks fetch ' + res.status);
  const body = await res.json();
  jwksCache = { keys: body.keys || [], until: Date.now() + 3_600_000 };
  return jwksCache.keys;
}

// Returns the token's payload if it is a valid, current token for ALLOWED_EMAIL, else null.
export async function verifyIdToken(token, env, now = Date.now() / 1000, keys = null) {
  const parts = (token || '').split('.');
  if (parts.length !== 3) return null;
  let header, payload;
  try { header = b64urlJson(parts[0]); payload = b64urlJson(parts[1]); } catch (e) { return null; }
  if (header.alg !== 'RS256' || !header.kid) return null;
  const project = env.FIREBASE_PROJECT;
  if (payload.aud !== project || payload.iss !== `https://securetoken.google.com/${project}`) return null;
  if (!(payload.exp > now) || !(payload.iat <= now + 300)) return null;
  if (!payload.sub || payload.email_verified !== true) return null;
  if (String(payload.email || '').toLowerCase() !== String(env.ALLOWED_EMAIL).toLowerCase()) return null;
  const jwk = (keys || await googleKeys()).find(k => k.kid === header.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlBytes(parts[2]),
    new TextEncoder().encode(parts[0] + '.' + parts[1]));
  return ok ? payload : null;
}

// ---- E-paper board page: names only, black on white, no scripts ----

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function boardPage(data) {
  const cells = (data.projects || []).map(p => {
    const days = p.touched ? Math.max(0, Math.floor((Date.now() - Date.parse(p.touched)) / 86_400_000)) : null;
    return `<div class="p"><b>${esc(p.name)}</b>${days != null ? `<i>${days}d</i>` : ''}</div>`;
  }).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Projects</title>
<style>body{margin:0;padding:12px;background:#fff;color:#000;font:20px/1.2 sans-serif}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}
.p{border:2px solid #000;padding:10px;min-height:60px;display:flex;flex-direction:column;justify-content:space-between}
i{font-style:normal;font-size:14px;align-self:flex-end}</style></head>
<body><div class="g">${cells}</div></body></html>`;
}
