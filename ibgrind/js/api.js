// ibgrind API client and local storage helpers. Shared by every page.
// The API lives at ./api/ on the same origin (a Cloudflare Worker route), so the site can move
// to another domain without code changes.

// On a local dev server, use the live API (the Worker allows localhost origins).
const API = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
  ? 'https://www.unisam.nz/ibgrind/api/'
  : new URL('api/', document.baseURI).href;
const SESSION_KEY = 'ibgrind.session';

export function getSession() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    return s && s.token && s.expires > Date.now() ? s : null;
  } catch { return null; }
}

export function setSession(s) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch { /* private mode: session lasts this page only */ }
}

export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

async function call(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (auth) {
    const s = getSession();
    if (!s) throw Object.assign(new Error('signed_out'), { status: 401 });
    headers.Authorization = `Bearer ${s.token}`;
  }
  const res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON error page */ }
  if (!res.ok) throw Object.assign(new Error(data?.error || `http_${res.status}`), { status: res.status });
  return data;
}

export const api = {
  session: (code, name) => call('session', { method: 'POST', body: { code, name }, auth: false }),
  catalog: () => call('catalog'),
  caseById: (id) => call(`case/${encodeURIComponent(id)}`),
  report: (caseId, questionId, message) => call('report', { method: 'POST', body: { caseId, questionId, message } }),
};

// small persistent store for per-device data (answers, preferences, history)
export const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('ibgrind.' + key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('ibgrind.' + key, JSON.stringify(value)); } catch { /* quota or private mode */ }
  },
};

export function initTheme() {
  const t = store.get('theme', null);
  if (t) document.documentElement.setAttribute('data-theme', t);
}

export function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme')
    || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  store.set('theme', next);
}
