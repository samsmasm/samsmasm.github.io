/**
 * Shared auth gate — Cloudflare Worker (worker name: wc26-auth).
 *
 * Routes: unisam.nz/wc26/*  AND  unisam.nz/fnl/*  (zone must be proxied / orange-cloud).
 * One shared password for all gated sections.
 * Secrets (set via `wrangler secret` or the API, NOT in this file):
 *   SITE_PASSWORD  - the shared password people type.
 *   AUTH_SECRET    - random string used to sign the session cookie.
 *
 * The worker derives the section ("wc26" or "fnl") from the request path, so the
 * login POST, redirect, and cookie scope are all per-section. Cookie names are
 * per-section too (wc26auth / fnlauth) so existing wc26 sessions keep working.
 *
 * Once a visitor enters the right password we set a signed, HttpOnly cookie
 * and then simply pass the request through to the origin (GitHub Pages). A
 * Worker's fetch() to its own zone goes to the origin, not back through the
 * Worker, so there is no loop. Unauthenticated requests never reach the origin.
 */

const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Per-section login page branding. Add a section here + a route in Cloudflare
// to gate another directory with the same password.
const SECTIONS = {
  wc26: { cookie: 'wc26auth', title: 'World Cup Predictions', badge: '2026', label: 'Gooooooooooo.....' },
  fnl:  { cookie: 'fnlauth',  title: 'Friday Night Live Scheduler', badge: 'FNL', label: 'Password' },
};

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

function loginPage(section, name, message, status) {
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>${section.title}</title>
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
  background:linear-gradient(135deg,#0a3d91,#1565d8)}
.card{background:#fff;border-radius:16px;padding:30px 28px;width:100%;max-width:340px;
  text-align:center;box-shadow:0 18px 50px rgba(0,0,0,.35)}
.badge{background:#0a3d91;color:#fff;font-weight:900;font-size:20px;width:58px;height:58px;
  border-radius:13px;display:grid;place-items:center;margin:0 auto 14px}
h2{margin:0 0 18px;color:#082a63;font-size:20px;font-weight:900}
label{display:block;font-weight:700;color:#13243f;margin-bottom:8px}
input{width:100%;padding:12px 14px;font-size:16px;border:2px solid #dbe6f5;border-radius:10px;outline:none}
input:focus{border-color:#1565d8}
button{margin-top:14px;width:100%;background:#1565d8;color:#fff;border:0;font-weight:800;
  font-size:15px;padding:12px;border-radius:10px;cursor:pointer}
button:hover{background:#0a3d91}
.err{color:#c62a30;font-weight:700;font-size:13px;margin:12px 0 0}
</style></head><body>
<form class="card" method="POST" action="/${name}/login" autocomplete="off">
  <div class="badge">${section.badge}</div>
  <h2>${section.title}</h2>
  <label for="p">${section.label}</label>
  <input id="p" name="password" type="password" autofocus autocomplete="off">
  <button type="submit">Enter</button>
  ${message ? `<p class="err">${message}</p>` : ''}
</form></body></html>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'no-store' } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const name = url.pathname.split('/')[1];
    const section = SECTIONS[name];
    if (!section) return fetch(request); // route not in our map: pass through

    if (request.method === 'POST' && url.pathname === `/${name}/login`) {
      const form = await request.formData();
      const pw = String(form.get('password') || '');
      if (env.SITE_PASSWORD && timingEq(pw, env.SITE_PASSWORD)) {
        const cookie = await makeCookie(env.AUTH_SECRET);
        return new Response(null, {
          status: 303,
          headers: {
            'Location': `/${name}/`,
            'Set-Cookie': `${section.cookie}=${cookie}; Path=/${name}; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`,
          },
        });
      }
      return loginPage(section, name, 'Nope, try again.', 401);
    }

    const cookies = parseCookies(request.headers.get('Cookie') || '');
    if (await verifyCookie(cookies[section.cookie], env.AUTH_SECRET)) {
      return fetch(request); // authenticated -> origin (GitHub Pages)
    }
    return loginPage(section, name, '', 401);
  },
};
