/**
 * fnl auth gate — Cloudflare Worker.
 *
 * Route: unisam.nz/fnl/*  (zone must be proxied / orange-cloud).
 * Secrets (set via `wrangler secret` or the dashboard, NOT in this file):
 *   SITE_PASSWORD  - the shared password the FNL admin types.
 *   AUTH_SECRET    - random string used to sign the session cookie.
 *
 * Same pattern as wc26/cloudflare-worker.js: once a visitor enters the right
 * password we set a signed, HttpOnly cookie and pass the request through to
 * the origin (GitHub Pages). Unauthenticated requests never reach the origin.
 */

const COOKIE = 'fnlauth';
const MAX_AGE = 60 * 60 * 24 * 90; // 90 days

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
<meta name="robots" content="noindex, nofollow"><title>FNL Scheduler</title>
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
  background:linear-gradient(135deg,#101a2b,#3d5a80)}
.card{background:#fff;border-radius:12px;padding:30px 28px;width:100%;max-width:340px;
  text-align:center;box-shadow:0 18px 50px rgba(0,0,0,.35)}
.badge{background:#1b2a41;color:#fff;font-weight:900;font-size:16px;width:58px;height:58px;
  border-radius:10px;display:grid;place-items:center;margin:0 auto 14px}
h2{margin:0 0 18px;color:#1b2a41;font-size:19px;font-weight:800}
label{display:block;font-weight:700;color:#1c1f24;margin-bottom:8px}
input{width:100%;padding:12px 14px;font-size:16px;border:2px solid #dde3ea;border-radius:8px;outline:none}
input:focus{border-color:#3d5a80}
button{margin-top:14px;width:100%;background:#3d5a80;color:#fff;border:0;font-weight:800;
  font-size:15px;padding:12px;border-radius:8px;cursor:pointer}
button:hover{background:#1b2a41}
.err{color:#b5451b;font-weight:700;font-size:13px;margin:12px 0 0}
</style></head><body>
<form class="card" method="POST" action="/fnl/login" autocomplete="off">
  <div class="badge">FNL</div>
  <h2>Friday Night Live Scheduler</h2>
  <label for="p">Password</label>
  <input id="p" name="password" type="password" autofocus autocomplete="off">
  <button type="submit">Enter</button>
  ${message ? `<p class="err">${message}</p>` : ''}
</form></body></html>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'no-store' } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/fnl/login') {
      const form = await request.formData();
      const pw = String(form.get('password') || '');
      if (env.SITE_PASSWORD && timingEq(pw, env.SITE_PASSWORD)) {
        const cookie = await makeCookie(env.AUTH_SECRET);
        return new Response(null, {
          status: 303,
          headers: {
            'Location': '/fnl/',
            'Set-Cookie': `${COOKIE}=${cookie}; Path=/fnl; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`,
          },
        });
      }
      return loginPage('Wrong password, try again.', 401);
    }

    const cookies = parseCookies(request.headers.get('Cookie') || '');
    if (await verifyCookie(cookies[COOKIE], env.AUTH_SECRET)) {
      return fetch(request); // authenticated -> origin (GitHub Pages)
    }
    return loginPage('', 401);
  },
};
