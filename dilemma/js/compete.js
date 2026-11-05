// The Long Game - public competitions: standings, and running them yourself.
//
// Every run here is played in the browser with the competition's own
// settings (taken from its official standings), so anyone who runs the same
// thing gets the same result.

import { publicRooms, publicStrategies, publicStandings } from './firebase.js?v=20261105-092415';
import { fromStored, parsePasted, validate } from './validate.js?v=20261105-092415';
import { runTournament, toEntries } from './tournament.js?v=20261105-092415';
import { renderResults } from './results.js?v=20261105-092415';
import { DEFAULTS, makeRng } from './engine.js?v=20261105-092415';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const params = new URLSearchParams(location.search);

const YOU = '~you';      // sorts after every real id, so adding you never reorders the rest
let comps = [];
let comp = null;         // the competition open now
let pool = [];           // its strategies that pass the checks
let standings = null;
let mine = null;         // your strategy, if you added one
let running = false;

// ---------------------------------------------------------------------------
// The list
// ---------------------------------------------------------------------------

async function loadList() {
  try {
    comps = await publicRooms();
  } catch (e) {
    $('#comp-list').innerHTML = `<p class="errors small">Could not load competitions (${esc(e.code || e.message)}).</p>`;
    return;
  }
  if (!comps.length) {
    $('#comp-list').innerHTML = '<p class="muted small">No public competitions yet. A teacher can make one of their rooms public.</p>';
    return;
  }
  $('#comp-list').innerHTML = comps.map(c => `<button class="comp-item" data-code="${c.code}">
      <strong>${esc(c.title || 'Untitled')}</strong>
      <span class="small muted">${c.open ? 'Open for entries' : 'Closed for entries'}</span>
    </button>`).join('');
  $('#comp-list').querySelectorAll('[data-code]').forEach(b => b.onclick = () => openComp(b.dataset.code));
  const wanted = comps.find(c => c.code === params.get('c')) || comps[0];
  openComp(wanted.code);
}

async function openComp(code) {
  if (running) return;
  comp = comps.find(c => c.code === code);
  history.replaceState(null, '', `?c=${code}`);
  document.querySelectorAll('.comp-item').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.code === code)));
  $('#comp').classList.remove('hidden');
  $('#results').classList.add('hidden');
  $('#c-title').textContent = comp.title || 'Untitled';
  $('#c-enter').href = `build.html?c=${code}`;
  $('#c-enter').classList.toggle('hidden', !comp.open);
  $('#c-meta').textContent = 'Loading...';
  $('#c-standings').innerHTML = '';

  try {
    const [docs, st] = await Promise.all([publicStrategies(code), publicStandings(code)]);
    pool = docs.map(fromStored).filter(s => !s.errors.length);
    standings = st;
  } catch (e) {
    $('#c-meta').textContent = 'Could not load this competition: ' + (e.code || e.message);
    return;
  }
  $('#c-meta').textContent = `${pool.length} strategies${comp.open ? '' : ', closed for entries'}.`;
  paintStandings();
  paintRunNotes();
}

function paintStandings() {
  if (!standings) {
    $('#c-standings').innerHTML = '<p class="small muted">No official standings yet. The organiser publishes them after a full run.</p>';
    return;
  }
  const when = standings.updatedAt?.toDate?.().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const top = standings.ranking.slice(0, 20);
  $('#c-standings').innerHTML = `<h3 style="margin-top:12px">Official standings: top ${top.length}</h3>
    <div class="scroller"><table class="small">
      <thead><tr><th class="n">#</th><th>Strategy</th><th>By</th><th class="n">Years</th><th class="n">Per round</th></tr></thead>
      <tbody>${top.map((t, k) => `<tr><td class="n">${k + 1}</td><td><strong>${esc(t.name)}</strong></td><td>${esc(t.handle)}</td><td class="n">${t.total}</td><td class="n">${t.average.toFixed(2)}</td></tr>`).join('')}</tbody>
    </table></div>
    <p class="small muted" style="margin-top:6px">${standings.ranking.length} strategies, ${standings.rounds} rounds a match${when ? `, updated ${when}` : ''}. Fewest years wins.</p>`;
}

// The competition's settings: those of its official standings, so your runs
// can be compared with them.
function settings() {
  if (standings) return { rounds: standings.rounds, seed: standings.seed, selfPlay: standings.selfPlay, format: standings.format || 'roundRobin' };
  return { rounds: DEFAULTS.rounds, seed: comp.code, selfPlay: DEFAULTS.selfPlay, format: 'roundRobin' };
}

function topIds() {
  if (!standings) return [];
  const here = new Set(pool.map(s => s.id));
  return standings.ranking.map(t => t.id).filter(id => here.has(id)).slice(0, 20);
}

function paintRunNotes() {
  const o = settings();
  const extra = mine ? 1 : 0;
  $('#r-settings').textContent = `Every match: ${o.rounds} rounds, seed "${o.seed}"${standings ? ', the same as the official standings' : ''}.${mine ? ' Your strategy joins every run.' : ''}`;
  const n = pool.length + extra;
  const matches = n * (n + (o.selfPlay ? 1 : -1)) / 2;
  $('#run-all-note').textContent = `${n} strategies, ${matches.toLocaleString()} matches.${matches > 20000 ? ' This may take a while.' : ''}`;
  const top = topIds();
  $('#run-top').disabled = !top.length;
  $('#run-top-note').textContent = top.length
    ? `${mine ? 'You against' : 'Just'} the top ${top.length} from the official standings.`
    : 'Needs official standings first.';
  $('#run-sample').disabled = pool.length < 2;
}

// ---------------------------------------------------------------------------
// Your strategy
// ---------------------------------------------------------------------------

function setMine(s, note) {
  mine = s;
  $('#y-status').innerHTML = s ? `<span style="color:var(--ok)">Using "${esc(s.name)}"</span>` : (note || '');
  if (comp) paintRunNotes();
}

$('#y-source').onchange = () => {
  const v = $('#y-source').value;
  $('#y-paste-box').classList.toggle('hidden', v !== 'paste');
  if (v === 'none') return setMine(null);
  if (v === 'paste') return setMine(null, '<span class="muted">Paste it below.</span>');
  try {
    const s = JSON.parse(localStorage.getItem('longgame.lastTested'));
    if (s && validate(s).ok) return setMine(s);
  } catch { /* fall through */ }
  setMine(null, '<span style="color:var(--bad)">Nothing tested on this device yet. Build one and press "Next: test it".</span>');
};

$('#y-check').onclick = () => {
  const p = parsePasted($('#y-paste').value);
  if (p.error) return setMine(null, `<span style="color:var(--bad)">${esc(p.error)}</span>`);
  const v = validate(p.value);
  if (!v.ok) return setMine(null, `<span style="color:var(--bad)">${esc(v.errors[0])}${v.errors.length > 1 ? ` (and ${v.errors.length - 1} more)` : ''}</span>`);
  setMine(p.value);
};

// ---------------------------------------------------------------------------
// Running
// ---------------------------------------------------------------------------

function withMine(list) {
  return mine ? [...list, { id: YOU, name: mine.name, handle: 'you', strategy: mine }] : list;
}

async function run(list, title) {
  const entries = toEntries(withMine(list));
  if (entries.length < 2) return;
  running = true;
  document.querySelectorAll('.run-modes button').forEach(b => { b.disabled = true; });
  $('#progress').classList.remove('hidden');
  const bar = $('#progress .progress > div');
  const res = await runTournament(entries, settings(), p => {
    bar.style.width = (100 * p.match / p.matches).toFixed(1) + '%';
    $('#progress-text').textContent = `Match ${p.match.toLocaleString()} of ${p.matches.toLocaleString()}`;
  });
  running = false;
  paintRunNotes();
  document.querySelectorAll('.run-modes button').forEach(b => { if (b.id === 'run-all') b.disabled = false; });
  const me = res.table.find(t => t.id === YOU);
  $('#progress-text').textContent = me ? `Done. You came ${ordinal(me.rank)} of ${res.entries.length}.` : 'Done.';
  $('#results-title').textContent = title;
  $('#results').classList.remove('hidden');
  renderResults(res, panes, { mine: YOU });
  showTab('board');
  $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

$('#run-all').onclick = () => run(pool, `Everyone in ${comp.title || 'the competition'}`);
$('#run-top').onclick = () => {
  const ids = new Set(topIds());
  run(pool.filter(s => ids.has(s.id)), mine ? 'You against the top 20' : 'The top 20');
};

// A seeded shuffle, so a sample can be picked again exactly from its seed.
$('#run-sample').onclick = () => {
  const n = +$('#s-size').value;
  const seed = $('#s-seed').value.trim() || newSampleSeed();
  $('#s-seed').value = seed;
  const rng = makeRng('sample|' + seed);
  const list = toEntries(pool);
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  const pick = new Set(list.slice(0, n).map(e => e.id));
  run(pool.filter(s => pick.has(s.id)), `${mine ? 'You against ' : ''}a random ${Math.min(n, pool.length)} (sample "${seed}")`);
};

function newSampleSeed() { return Math.random().toString(36).slice(2, 7); }
$('#s-seed').value = newSampleSeed();
$('#s-new').onclick = () => { $('#s-seed').value = newSampleSeed(); };

// ---------------------------------------------------------------------------
// Results tabs
// ---------------------------------------------------------------------------

const panes = {};
document.querySelectorAll('[data-pane]').forEach(p => { panes[p.dataset.pane] = p; });
function showTab(name) {
  document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  document.querySelectorAll('[data-pane]').forEach(p => p.classList.toggle('hidden', p.dataset.pane !== name));
}
document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => showTab(b.dataset.tab));
panes.openReplay = (i, j) => { showTab('replay'); panes.replay.pick(i, j); };

loadList();
