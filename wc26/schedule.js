'use strict';
// Standalone schedule page. Reads window.WC_SCHEDULE (from data.js) and overlays
// live/finished scores from ESPN. Name handling and result orientation come
// from wc-core.js (window.WC) so this page and the leaderboard agree exactly.
// wc-core.js MUST be loaded before this script.
const { canon, esc, pairKey, orient } = WC;

// --- ESPN fetch (shares app.js's 3-min localStorage cache) ---
const BASE = 'https://site.api.espn.com/apis';
const DATE_WINDOWS = [
  '20260611-20260615', '20260616-20260620', '20260621-20260627',
  '20260628-20260703', '20260704-20260707', '20260709-20260711',
  '20260714-20260715', '20260717-20260719',
];
const CACHE_KEY = 'wc26-espn', CACHE_TTL = 3 * 60 * 1000;

async function getJSON(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(url + ' -> ' + r.status);
  return r.json();
}
async function fetchEvents() {
  const all = new Map();
  const results = await Promise.allSettled(
    DATE_WINDOWS.map(w => getJSON(`${BASE}/site/v2/sports/soccer/fifa.world/scoreboard?dates=${w}&limit=300`))
  );
  for (const res of results) {
    if (res.status !== 'fulfilled') continue;
    for (const ev of (res.value.events || [])) all.set(ev.id, ev);
  }
  return [...all.values()];
}
async function fetchStandings() {
  try { return await getJSON(`${BASE}/v2/sports/soccer/fifa.world/standings`); }
  catch { return null; }
}
// Returns { events, standings }, shared with app.js via the 'wc26-espn' cache.
async function getData() {
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { /* ignore */ }
  if (cached && cached.events && cached.standings && Date.now() - cached.ts < CACHE_TTL) {
    return { events: cached.events, standings: cached.standings };
  }
  const [events, standings] = await Promise.all([fetchEvents(), fetchStandings()]);
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ events, standings, ts: Date.now() })); }
  catch { /* quota */ }
  return { events, standings };
}
// Live or finished games carry a usable score.
const buildScores = events => WC.buildMatchMap(events, m => m.state === 'in' || m.state === 'post');

// --- formatting (Vietnam + US Eastern) ---
const VNZ = 'Asia/Ho_Chi_Minh', ETZ = 'America/New_York';
const fmtVNTime = ts => ts ? new Date(ts).toLocaleTimeString('en-GB', { timeZone: VNZ, hour: '2-digit', minute: '2-digit', hour12: false }) : 'TBC';
const fmtETTime = ts => ts ? new Date(ts).toLocaleTimeString('en-US', { timeZone: ETZ, hour: 'numeric', minute: '2-digit', hour12: true }) : '';
const fmtDay = ts => ts ? new Date(ts).toLocaleDateString('en-GB', { timeZone: VNZ, weekday: 'long', day: 'numeric', month: 'long' }) : 'Date to be confirmed';

let SCORES = new Map(), NOW = Date.now(), SCROLLED = false;

// Knockout slot resolution lives in wc-core.js (WC.makeBracket), shared with the
// "next games" box on the leaderboard so both resolve names identically.
let BRACKET = { resolveFixture: m => [null, null] };
const isSlot = WC.isSlot;

// Render one team: real name plus its slot code as a small tag; bare code if unresolved.
function teamLabel(code, name) {
  if (!isSlot(code)) return esc(code);
  if (name) return `${esc(name)} <span class="slot">${esc(code)}</span>`;
  return `<span class="slot solo">${esc(code)}</span>`;
}

function resultCell(m, a, b) {
  const t1 = a || m.t1, t2 = b || m.t2;
  // orient() guarantees a/b are in t1/t2 order regardless of ESPN's home/away.
  const o = orient(t1, t2, SCORES.get(pairKey(t1, t2)));
  if (o) {
    const live = o.state === 'in';
    return `<span class="r-score${live ? ' live' : ''}">${o.a}–${o.b}${live ? ' <em>LIVE</em>' : ''}</span>`;
  }
  if (m.ts && m.ts < NOW) return '<span class="r-tbd">·</span>'; // started, no score yet
  return '<span class="r-tbd">—</span>';
}

function render(viewAll) {
  const list = (window.WC_SCHEDULE || []).filter(m => viewAll || m.ours);
  let lastDay = '', html = '', firstUpcoming = '';
  for (const m of list) {
    const day = fmtDay(m.ts);
    if (day !== lastDay) { lastDay = day; html += `<tr class="day"><th colspan="4">${esc(day)}</th></tr>`; }
    const past = m.ts && m.ts < NOW;
    const id = `m${m.no}`;
    if (!past && !firstUpcoming) firstUpcoming = id;
    const [a, b] = BRACKET.resolveFixture(m);
    html += `<tr id="${id}" class="m${past ? ' past' : ''}${m.ours ? ' ours' : ''}">
        <td class="c-time"><b>${fmtVNTime(m.ts)}</b><span>${fmtETTime(m.ts)} ET</span></td>
        <td class="c-stage">${esc(m.stage)}</td>
        <td class="c-match">${teamLabel(m.t1, a)} <i>v</i> ${teamLabel(m.t2, b)}${m.ours && viewAll ? ' <span class="star" title="One of our games">★</span>' : ''}</td>
        <td class="c-result">${resultCell(m, a, b)}</td>
      </tr>`;
  }
  document.getElementById('sched-body').innerHTML = html || '<tr><td colspan="4" style="padding:18px;text-align:center;color:#7d8aa0;">No matches.</td></tr>';
  if (!SCROLLED && firstUpcoming) {
    SCROLLED = true;
    const el = document.getElementById(firstUpcoming);
    if (el) { const y = el.getBoundingClientRect().top + window.scrollY - 90; window.scrollTo({ top: Math.max(0, y) }); }
  }
}

function wire() {
  const ours = document.getElementById('t-ours'), all = document.getElementById('t-all');
  const KEY = 'wc26-sched-view';
  let viewAll = false;
  try { viewAll = localStorage.getItem(KEY) === 'all'; } catch { /* ignore */ }
  function apply(v) {
    viewAll = v;
    ours.classList.toggle('active', !v); all.classList.toggle('active', v);
    try { localStorage.setItem(KEY, v ? 'all' : 'ours'); } catch { /* ignore */ }
    SCROLLED = false; render(v);
  }
  ours.addEventListener('click', () => apply(false));
  all.addEventListener('click', () => apply(true));
  apply(viewAll);
}

async function main() {
  const status = document.getElementById('sched-status');
  wire(); // render immediately from schedule data (times always available)
  try {
    NOW = Date.now();
    const { events, standings } = await getData();
    SCORES = buildScores(events);
    BRACKET = WC.makeBracket(standings, events, window.WC_SCHEDULE);
    status.style.display = 'none';
    SCROLLED = false;
    render(document.getElementById('t-all').classList.contains('active'));
  } catch (e) {
    status.textContent = 'Schedule loaded. (Live scores unavailable: ' + e.message + ')';
  }
}
main();
