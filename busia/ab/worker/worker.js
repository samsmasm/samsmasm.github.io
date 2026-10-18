/**
 * busia-ab: Cloudflare Worker for the BUSIA A/B test.
 *
 * Route: unisam.nz/busia-ab/*   (see SETUP.md next to this file)
 * Bindings:
 *   DB              D1 database (the worker creates its own table)
 * Secrets (set in the dashboard, never in this file):
 *   BUSIA_PASSWORD  the password for the results page
 *   AUTH_SECRET     random string that signs the login cookie
 *
 *   POST /busia-ab/log     records from /busia/ab/ab.js (public, validated, create-only)
 *   GET  /busia-ab/        login form, or the results page once logged in
 *   POST /busia-ab/login   password check
 *   GET  /busia-ab/csv     every record as CSV (logged in only)
 *   POST /busia-ab/exclude, /busia-ab/restore   hide or restore one anonymous student (logged in only)
 *   GET  /busia-ab/logout
 */

const COOKIE = 'busiaab';
const MAX_AGE = 60 * 60 * 24 * 60; // 60 days
const PAGES = ['index', 'start', 'rq', 'concept', 'docs', 'sketching', 'structure', 'analysis', 'conclusion', 'submit', 'check', 'examiners', 'sample', 'faq', 'team'];
const QUESTIONS = { ease: 'How hard or easy was this page to follow?', covered: 'How sure are you that this page told you what you need?', nextstep: 'How unclear or clear is your next step now?' };
const COLS = ['excluded', 'id', 'received_at', 'type', 'version_shown', 'version_assigned', 'anon_id', 'view_id', 'prompt_id', 'page', 'question_id', 'rating', 'trigger', 'seconds_on_page', 'scrolled', 'device', 'max_depth', 'scroll_backs', 'ts'];

let tableReady = false;
async function ensureTable(db) {
  if (tableReady) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    received_at TEXT NOT NULL,
    type TEXT NOT NULL,
    version_shown INTEGER, version_assigned INTEGER,
    anon_id TEXT, view_id TEXT, prompt_id TEXT,
    page TEXT, question_id TEXT, rating TEXT, trigger TEXT,
    seconds_on_page INTEGER, scrolled INTEGER, device TEXT,
    max_depth INTEGER, scroll_backs INTEGER, ts TEXT)`).run();
  await db.prepare('CREATE TABLE IF NOT EXISTS excluded (anon_id TEXT PRIMARY KEY, at TEXT NOT NULL)').run();
  tableReady = true;
}

// ---------- validation: anything unexpected is dropped ----------
const isId = v => typeof v === 'string' && /^[0-9a-f]{8,32}$/.test(v);
const isVer = v => v === 1 || v === 2;
const isInt = (v, max) => Number.isInteger(v) && v >= 0 && v <= max;
const isTs = v => typeof v === 'string' && v.length <= 30 && !isNaN(Date.parse(v));

function clean(r) {
  if (!r || typeof r !== 'object') return null;
  if (!isVer(r.version_shown) || !isVer(r.version_assigned) || !isId(r.anon_id)) return null;
  if (!PAGES.includes(r.page) || !isInt(r.seconds_on_page, 1200) || !isTs(r.ts)) return null;
  if (r.type === 'pageview') {
    const allowed = ['type', 'view_id', 'version_shown', 'version_assigned', 'anon_id', 'page', 'seconds_on_page', 'max_depth', 'scroll_backs', 'ts'];
    if (Object.keys(r).some(k => !allowed.includes(k))) return null;
    if (!isId(r.view_id) || !isInt(r.max_depth, 100) || !isInt(r.scroll_backs, 500)) return null;
    return { type: 'pageview', view_id: r.view_id, version_shown: r.version_shown, version_assigned: r.version_assigned, anon_id: r.anon_id,
             page: r.page, seconds_on_page: r.seconds_on_page, max_depth: r.max_depth, scroll_backs: r.scroll_backs, ts: r.ts };
  }
  if (r.type === 'rating') {
    const allowed = ['type', 'version_shown', 'version_assigned', 'anon_id', 'prompt_id', 'page', 'question_id', 'rating', 'trigger', 'seconds_on_page', 'scrolled', 'device', 'ts'];
    if (Object.keys(r).some(k => !allowed.includes(k))) return null;
    const skip = r.question_id === 'all' && r.rating === 'skip';
    const answer = Object.keys(QUESTIONS).includes(r.question_id) && Number.isInteger(r.rating) && r.rating >= 1 && r.rating <= 5;
    if (!skip && !answer) return null;
    if (!isId(r.prompt_id) || !['leave', 'timed'].includes(r.trigger) || typeof r.scrolled !== 'boolean' || !['phone', 'desktop'].includes(r.device)) return null;
    return { type: 'rating', version_shown: r.version_shown, version_assigned: r.version_assigned, anon_id: r.anon_id, prompt_id: r.prompt_id,
             page: r.page, question_id: r.question_id, rating: String(r.rating), trigger: r.trigger, seconds_on_page: r.seconds_on_page,
             scrolled: r.scrolled ? 1 : 0, device: r.device, ts: r.ts };
  }
  return null;
}

async function handleLog(request, env) {
  const ok = new Response(null, { status: 204 });
  try {
    const text = await request.text();
    if (text.length > 8000) return ok;
    const body = JSON.parse(text);
    const recs = (Array.isArray(body.records) ? body.records : []).slice(0, 5).map(clean).filter(Boolean);
    if (!recs.length) return ok;
    await ensureTable(env.DB);
    const now = new Date().toISOString();
    await env.DB.batch(recs.map(r => {
      const keys = ['received_at', ...Object.keys(r)];
      return env.DB.prepare(`INSERT INTO records (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`)
        .bind(now, ...Object.values(r));
    }));
  } catch (e) { /* fail silently: the page never waits on this */ }
  return ok;
}

// ---------- login (same signed-cookie pattern as wc26-auth) ----------
const enc = s => new TextEncoder().encode(s);
const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function sign(value, secret) {
  const key = await crypto.subtle.importKey('raw', enc(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc(value))));
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
async function loggedIn(request, env) {
  const m = (request.headers.get('Cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m || !env.AUTH_SECRET) return false;
  const c = m[1], i = c.lastIndexOf('.');
  if (i < 0) return false;
  if (!timingEq(c.slice(i + 1), await sign(c.slice(0, i), env.AUTH_SECRET))) return false;
  const exp = parseInt(c.slice(0, i).split('.')[1], 10);
  return Number.isFinite(exp) && Date.now() < exp;
}

// ---------- pages ----------
const STYLE = `<style>
*{box-sizing:border-box}
body{margin:0;background:#fff;color:#13243f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.55}
header{background:radial-gradient(ellipse at 12% 50%,#ffd6e7 0%,transparent 50%),radial-gradient(ellipse at 40% 20%,#d6e8ff 0%,transparent 45%),radial-gradient(ellipse at 70% 80%,#e8d6ff 0%,transparent 40%),radial-gradient(ellipse at 90% 40%,#fff3d6 0%,transparent 40%),#f0f5ff;padding:1rem}
header div{max-width:1000px;margin:0 auto;display:flex;align-items:center;gap:.8rem;font-family:Georgia,serif;color:#1a3a7a;font-size:1.1rem}
header img{width:48px;height:48px;border-radius:12px}
main{max-width:1000px;margin:0 auto;padding:1.25rem 1rem 3rem}
h1,h2{font-family:Georgia,serif;font-weight:normal;color:#1a3a7a}
h1{font-size:1.5rem;margin:.5rem 0}
h2{font-size:1.15rem;margin:2rem 0 .5rem;border-top:1px solid #f0e8ff;padding-top:1rem}
.note{color:#5a7298;font-size:.9rem}
.scroll{overflow-x:auto}
table{border-collapse:collapse;font-size:.85rem;margin:.5rem 0;min-width:100%}
th,td{border-bottom:1px solid #eef4ff;padding:.35rem .5rem;text-align:right;white-space:nowrap}
th{color:#1a3a7a;font-weight:600;background:#f0f5ff}
td:first-child,th:first-child{text-align:left}
a.btn,button{display:inline-block;background:#1a3a7a;color:#fff;border:0;border-radius:8px;padding:.6rem 1rem;font:inherit;font-weight:600;text-decoration:none;cursor:pointer}
input{font:inherit;padding:.6rem .7rem;border:1.5px solid #b6cff5;border-radius:8px;width:100%;margin:.4rem 0 .8rem}
.login{max-width:340px;margin:3rem auto}
.err{color:#b42318;font-weight:600}
</style>`;
const HEAD = (title) => `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${title}</title><link rel="icon" href="/unisamicon2.png">${STYLE}</head><body><header><div><img src="/geocornsmall.png" alt="">BUSIA A/B test</div></header>`;
const html = (body, status = 200) => new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'no-store' } });

function loginPage(msg) {
  return html(`${HEAD('BUSIA backend')}<main><form class="login" method="POST" action="/busia-ab/login" autocomplete="off">
<h1>Backend</h1><label for="p">Password</label><input id="p" name="password" type="password" autofocus>
<button type="submit">Enter</button>${msg ? `<p class="err">${msg}</p>` : ''}</form></main></body></html>`, msg ? 401 : 200);
}

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const sd = a => { if (a.length < 2) return null; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
const f1 = x => x == null ? '' : x.toFixed(2);
const VN = v => v === 1 ? 'Version 1 (long)' : 'Version 2 (short)';

async function resultsPage(env) {
  await ensureTable(env.DB);
  const { results: all } = await env.DB.prepare('SELECT * FROM records ORDER BY id').all();
  const { results: exRows } = await env.DB.prepare('SELECT anon_id, at FROM excluded ORDER BY at').all();
  const excluded = new Set(exRows.map(r => r.anon_id));
  const rows = all.filter(r => !excluded.has(r.anon_id));
  const ratings = rows.filter(r => r.type === 'rating' && r.rating !== 'skip').map(r => ({ ...r, n: parseInt(r.rating, 10) }));
  const prompts = rows.filter(r => r.type === 'rating');
  // Latest record per page visit (a visit can be re-sent with more seconds).
  const views = Object.values(rows.filter(r => r.type === 'pageview').reduce((acc, r) => {
    if (!acc[r.view_id] || r.seconds_on_page >= acc[r.view_id].seconds_on_page) acc[r.view_id] = r; return acc; }, {}));
  const mismatched = new Set(rows.filter(r => r.version_shown !== r.version_assigned).map(r => r.anon_id));

  let out = `${HEAD('BUSIA A/B results')}<main>
<h1>Results</h1>
<p class="note">You are logged in, so this browser is not counted from now on. Classroom-sized samples: these are counts and means only, not significance tests. Read differences of a few tenths of a point as noise unless they are consistent across questions and pages.</p>
<p><a class="btn" href="/busia-ab/csv">Download CSV</a> &nbsp; <a href="/busia-ab/logout">Log out</a></p>
<script>try{localStorage.setItem('busia-ab-ignore','1')}catch(e){}</script>`;

  // Students per version
  out += `<h2>Students</h2><div class="scroll"><table><tr><th></th><th>Students seen</th><th>Students who rated</th><th>Prompts answered</th><th>Prompts skipped</th></tr>`;
  for (const v of [1, 2]) {
    const seen = new Set(rows.filter(r => r.version_assigned === v).map(r => r.anon_id));
    const rated = new Set(ratings.filter(r => r.version_assigned === v).map(r => r.anon_id));
    const answered = new Set(ratings.filter(r => r.version_assigned === v).map(r => r.prompt_id));
    const skipped = prompts.filter(r => r.version_assigned === v && r.rating === 'skip').length;
    out += `<tr><td>${VN(v)}</td><td>${seen.size}</td><td>${rated.size}</td><td>${answered.size}</td><td>${skipped}</td></tr>`;
  }
  out += `</table></div>`;
  if (mismatched.size) out += `<p class="note">${mismatched.size} student(s) have records on a version they were not assigned. Filter them out in the CSV if needed (version_shown differs from version_assigned).</p>`;

  // Main analysis: one data point per student
  out += `<h2>Main comparison: one data point per student</h2><p class="note">Each student's answers to a question are averaged first, then those averages are compared. Grouped by assigned version.</p>
<div class="scroll"><table><tr><th>Question</th><th>Version</th><th>Students</th><th>Mean</th><th>SD</th></tr>`;
  for (const [q, text] of Object.entries(QUESTIONS)) {
    for (const v of [1, 2]) {
      const by = {};
      ratings.filter(r => r.question_id === q && r.version_assigned === v).forEach(r => (by[r.anon_id] ||= []).push(r.n));
      const per = Object.values(by).map(mean);
      out += `<tr><td>${v === 1 ? esc(text) : ''}</td><td>${VN(v)}</td><td>${per.length}</td><td>${f1(mean(per))}</td><td>${f1(sd(per))}</td></tr>`;
    }
  }
  out += `</table></div>`;

  // All responses with spread
  out += `<h2>All responses</h2><p class="note">Every answer counted, so students who answered more often weigh more. Use the table above for the main comparison.</p>
<div class="scroll"><table><tr><th>Question</th><th>Version</th><th>Responses</th><th>Mean</th><th>1s</th><th>2s</th><th>3s</th><th>4s</th><th>5s</th></tr>`;
  for (const [q, text] of Object.entries(QUESTIONS)) {
    for (const v of [1, 2]) {
      const a = ratings.filter(r => r.question_id === q && r.version_assigned === v).map(r => r.n);
      out += `<tr><td>${v === 1 ? esc(text) : ''}</td><td>${VN(v)}</td><td>${a.length}</td><td>${f1(mean(a))}</td>${[1, 2, 3, 4, 5].map(k => `<td>${a.filter(x => x === k).length}</td>`).join('')}</tr>`;
    }
  }
  out += `</table></div>`;

  // Page by page
  out += `<h2>Page by page</h2><p class="note">Mean rating (number of responses), by the version shown on that page.</p>
<div class="scroll"><table><tr><th>Page</th>${Object.keys(QUESTIONS).map(q => `<th>${q} v1</th><th>${q} v2</th>`).join('')}</tr>`;
  for (const p of PAGES) {
    const cells = Object.keys(QUESTIONS).map(q => [1, 2].map(v => {
      const a = ratings.filter(r => r.page === p && r.question_id === q && r.version_shown === v).map(r => r.n);
      return `<td>${a.length ? `${f1(mean(a))} (${a.length})` : ''}</td>`;
    }).join('')).join('');
    if (cells.replace(/<td><\/td>/g, '')) out += `<tr><td>${p}</td>${cells}</tr>`;
  }
  out += `</table></div>`;

  // Reading behaviour
  out += `<h2>Reading behaviour</h2><p class="note">From page visits. Active seconds count only while the tab is visible and the student has interacted in the last minute, capped at 20 minutes per visit. Depth is how far down the page they got. Scroll-backs are moves back up of more than half a screen.</p>
<div class="scroll"><table><tr><th>Page</th><th>Visits v1</th><th>Visits v2</th><th>Active s v1</th><th>Active s v2</th><th>Depth % v1</th><th>Depth % v2</th><th>Scroll-backs v1</th><th>Scroll-backs v2</th></tr>`;
  for (const p of PAGES) {
    const vs = [1, 2].map(v => views.filter(r => r.page === p && r.version_shown === v));
    if (!vs[0].length && !vs[1].length) continue;
    const m = (arr, k) => f1(mean(arr.map(r => r[k])));
    out += `<tr><td>${p}</td><td>${vs[0].length}</td><td>${vs[1].length}</td><td>${m(vs[0], 'seconds_on_page')}</td><td>${m(vs[1], 'seconds_on_page')}</td><td>${m(vs[0], 'max_depth')}</td><td>${m(vs[1], 'max_depth')}</td><td>${m(vs[0], 'scroll_backs')}</td><td>${m(vs[1], 'scroll_backs')}</td></tr>`;
  }
  out += `</table></div>`;
  const reach = v => {
    const by = {}; views.filter(r => r.version_assigned === v).forEach(r => (by[r.anon_id] ||= new Set()).add(r.page));
    return mean(Object.values(by).map(s => s.size));
  };
  out += `<p class="note">Average number of different pages visited per student: Version 1 ${f1(reach(1))}, Version 2 ${f1(reach(2))}.</p>`;

  // Per student (anonymous ids only)
  const students = {};
  for (const r of rows) {
    const s = (students[r.anon_id] ||= { id: r.anon_id, v: r.version_assigned, first: r.ts, pages: new Set(), visits: {}, prompts: new Set(), skips: 0, q: {}, mismatch: false });
    if (r.ts < s.first) s.first = r.ts;
    if (r.version_shown !== r.version_assigned) s.mismatch = true;
    if (r.type === 'pageview') { s.pages.add(r.page); s.visits[r.view_id] = Math.max(s.visits[r.view_id] || 0, r.seconds_on_page); }
    if (r.type === 'rating') {
      if (r.rating === 'skip') s.skips++;
      else { s.prompts.add(r.prompt_id); (s.q[r.question_id] ||= []).push(parseInt(r.rating, 10)); }
    }
  }
  const list = Object.values(students).sort((a, b) => a.v - b.v || a.first.localeCompare(b.first));
  out += `<h2>Students</h2><p class="note">One row per anonymous student (random id, first 8 characters shown). Exclude removes a student from every table above; the rows stay in the CSV, marked as excluded, and can be restored below.</p>
<div class="scroll"><table><tr><th>ID</th><th>Version</th><th>First seen</th><th>Pages</th><th>Visits</th><th>Active min</th><th>Prompts</th><th>Skips</th>${Object.keys(QUESTIONS).map(q => `<th>${q}</th>`).join('')}<th></th></tr>`;
  for (const s of list) {
    const secs = Object.values(s.visits).reduce((a, b) => a + b, 0);
    out += `<tr><td title="${esc(s.id)}">${esc(s.id.slice(0, 8))}${s.mismatch ? ' *' : ''}</td><td>${s.v}</td><td>${esc((s.first || '').slice(0, 16).replace('T', ' '))}</td><td>${s.pages.size}</td><td>${Object.keys(s.visits).length}</td><td>${(secs / 60).toFixed(1)}</td><td>${s.prompts.size}</td><td>${s.skips}</td>${Object.keys(QUESTIONS).map(q => `<td>${s.q[q] ? f1(mean(s.q[q])) : ''}</td>`).join('')}
<td><form method="POST" action="/busia-ab/exclude" onsubmit="return confirm('Exclude ${esc(s.id.slice(0, 8))} from the results? You can restore it later.')"><input type="hidden" name="anon_id" value="${esc(s.id)}"><button type="submit" style="padding:.25rem .6rem;font-size:.8rem">Exclude</button></form></td></tr>`;
  }
  out += `</table></div>`;
  if (list.some(s => s.mismatch)) out += `<p class="note">* has records on a version other than the one assigned.</p>`;
  if (exRows.length) {
    out += `<h2>Excluded</h2><div class="scroll"><table><tr><th>ID</th><th>Excluded at (UTC)</th><th></th></tr>`;
    for (const e of exRows) out += `<tr><td title="${esc(e.anon_id)}">${esc(e.anon_id.slice(0, 8))}</td><td>${esc(e.at.slice(0, 16).replace('T', ' '))}</td><td><form method="POST" action="/busia-ab/restore"><input type="hidden" name="anon_id" value="${esc(e.anon_id)}"><button type="submit" style="padding:.25rem .6rem;font-size:.8rem">Restore</button></form></td></tr>`;
    out += `</table></div>`;
  }

  out += `</main></body></html>`;
  return html(out);
}

async function csv(env) {
  await ensureTable(env.DB);
  const { results: recs } = await env.DB.prepare('SELECT * FROM records ORDER BY id').all();
  const { results: ex } = await env.DB.prepare('SELECT anon_id FROM excluded').all();
  const exSet = new Set(ex.map(r => r.anon_id));
  const results = recs.map(r => ({ ...r, excluded: exSet.has(r.anon_id) ? 1 : 0 }));
  const q = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const body = [COLS.join(','), ...results.map(r => COLS.map(c => q(r[c])).join(','))].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/csv; charset=UTF-8', 'Content-Disposition': `attachment; filename="busia-ab-${new Date().toISOString().slice(0, 10)}.csv"`, 'Cache-Control': 'no-store' } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (url.pathname === '/busia-ab') return Response.redirect(url.origin + '/busia-ab/', 301);

    if (path === '/busia-ab/log') {
      return request.method === 'POST' ? handleLog(request, env) : new Response('Method not allowed', { status: 405 });
    }
    if (path === '/busia-ab/login' && request.method === 'POST') {
      const form = await request.formData();
      const pw = String(form.get('password') || '');
      if (env.BUSIA_PASSWORD && env.AUTH_SECRET && timingEq(pw, env.BUSIA_PASSWORD)) {
        return new Response(null, { status: 303, headers: {
          'Location': '/busia-ab/',
          'Set-Cookie': `${COOKIE}=${await makeCookie(env.AUTH_SECRET)}; Path=/busia-ab; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}` } });
      }
      return loginPage('Wrong password.');
    }
    if (path === '/busia-ab/logout') {
      return new Response(null, { status: 303, headers: { 'Location': '/busia-ab/', 'Set-Cookie': `${COOKIE}=; Path=/busia-ab; HttpOnly; Secure; SameSite=Lax; Max-Age=0` } });
    }
    if (!(await loggedIn(request, env))) return loginPage('');
    if (path === '/busia-ab/csv') return csv(env);
    if ((path === '/busia-ab/exclude' || path === '/busia-ab/restore') && request.method === 'POST') {
      if (request.headers.get('Origin') !== url.origin) return new Response('Forbidden', { status: 403 });
      const id = String((await request.formData()).get('anon_id') || '');
      if (isId(id)) {
        await ensureTable(env.DB);
        if (path === '/busia-ab/exclude') await env.DB.prepare('INSERT OR IGNORE INTO excluded (anon_id, at) VALUES (?, ?)').bind(id, new Date().toISOString()).run();
        else await env.DB.prepare('DELETE FROM excluded WHERE anon_id = ?').bind(id).run();
      }
      return new Response(null, { status: 303, headers: { 'Location': '/busia-ab/' } });
    }
    return resultsPage(env);
  },
};
