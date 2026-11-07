// unisam-tote Worker. Every route needs the Firebase ID token of ALLOWED_EMAIL.
//
//   GET    /tote/api/meta               { meta: {salt, check} | null }
//   PUT    /tote/api/meta               set it (first use only; 409 if already set)
//   DELETE /tote/api/all                wipe every note and the meta ("forgot passphrase")
//   GET    /tote/api/notes              { notes: [{id, iv, ct, expires}] }
//   PUT    /tote/api/notes/:id          {iv, ct}: save, and reset expiry to 96h
//   POST   /tote/api/notes/:id/renew    reset expiry to 96h
//   DELETE /tote/api/notes/:id
//
// Notes are AES-GCM encrypted in the browser with a key made from Sam's passphrase,
// so nothing stored here is readable. KV deletes each note itself at 96h (expirationTtl).

const TTL = 96 * 60 * 60;
const MAX_NOTE = 4_000_000; // base64 ciphertext, about 3 MB of text
const ID_RE = /^[A-Za-z0-9_-]{8,40}$/;
const B64_RE = /^[A-Za-z0-9+/=]+$/;
const ALLOWED_ORIGINS = ['https://unisam.nz', 'https://www.unisam.nz', 'http://127.0.0.1:8000', 'http://localhost:8000'];
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request.headers.get('Origin') || '');
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const path = url.pathname.replace(/^\/tote\/api/, '').replace(/\/+$/, '');
    const m = request.method;
    try {
      if (!(await verifyIdToken(bearer(request), env))) return json({ error: 'unauthorised' }, 401, cors);
      const kv = env.TOTE_KV;

      if (path === '/meta' && m === 'GET') {
        const meta = await kv.get('meta', 'json');
        return json({ meta: meta || null }, 200, cors);
      }
      if (path === '/meta' && m === 'PUT') {
        if (await kv.get('meta')) return json({ error: 'already set' }, 409, cors);
        const body = await readJson(request, 10_000);
        if (!body || typeof body.salt !== 'string' || !B64_RE.test(body.salt) || body.salt.length > 64 || !isBox(body.check, 1000))
          return json({ error: 'bad meta' }, 400, cors);
        await kv.put('meta', JSON.stringify({ salt: body.salt, check: { iv: body.check.iv, ct: body.check.ct } }));
        return json({ ok: true }, 200, cors);
      }
      if (path === '/all' && m === 'DELETE') {
        const keys = await listKeys(kv, 'n:');
        await Promise.all(keys.map(k => kv.delete(k.name)));
        await kv.delete('meta');
        return json({ ok: true, deleted: keys.length }, 200, cors);
      }
      if (path === '/notes' && m === 'GET') {
        const keys = await listKeys(kv, 'n:');
        const notes = (await Promise.all(keys.map(async k => {
          const v = await kv.get(k.name, 'json');
          if (!v) return null; // deleted since the (eventually consistent) list
          return { id: k.name.slice(2), iv: v.iv, ct: v.ct, expires: k.expiration ? k.expiration * 1000 : null };
        }))).filter(Boolean);
        return json({ notes }, 200, cors);
      }

      const nm = path.match(/^\/notes\/([^/]+)(\/renew)?$/);
      if (nm && ID_RE.test(nm[1])) {
        const key = 'n:' + nm[1];
        if (!nm[2] && m === 'PUT') {
          const body = await readJson(request, MAX_NOTE + 1000);
          if (!isBox(body, MAX_NOTE)) return json({ error: 'bad note' }, 400, cors);
          await kv.put(key, JSON.stringify({ iv: body.iv, ct: body.ct }), { expirationTtl: TTL });
          return json({ expires: Date.now() + TTL * 1000 }, 200, cors);
        }
        if (nm[2] && m === 'POST') {
          const v = await kv.get(key);
          if (!v) return json({ error: 'not found' }, 404, cors);
          await kv.put(key, v, { expirationTtl: TTL });
          return json({ expires: Date.now() + TTL * 1000 }, 200, cors);
        }
        if (!nm[2] && m === 'DELETE') {
          await kv.delete(key);
          return json({ ok: true }, 200, cors);
        }
      }
      return json({ error: 'not found' }, 404, cors);
    } catch (e) {
      console.error('tote error', e && e.stack || e); // never logs note content: it is ciphertext anyway
      return json({ error: 'server error' }, 500, cors);
    }
  },
};

function isBox(b, max) {
  return !!b && typeof b.iv === 'string' && typeof b.ct === 'string' && b.iv.length <= 24 && b.ct.length <= max &&
    B64_RE.test(b.iv) && B64_RE.test(b.ct);
}

async function readJson(request, max) {
  const text = await request.text();
  if (text.length > max) return null;
  try { return JSON.parse(text); } catch (e) { return null; }
}

async function listKeys(kv, prefix) {
  const out = [];
  let cursor;
  do {
    const page = await kv.list({ prefix, cursor });
    out.push(...page.keys);
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  return out;
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

// ---- Firebase ID token verification (same as tracker/worker) ----

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
