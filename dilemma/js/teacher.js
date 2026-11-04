// The Long Game - the teacher page: rooms, strategies, running a tournament.

import { teacherApp } from './firebase.js?v=20261105-065547';
import { validate, parsePasted } from './validate.js?v=20261105-065547';
import { readback } from './readback.js?v=20261105-065547';
import { runTournament, FORMATS } from './tournament.js?v=20261105-065547';
import { renderResults } from './results.js?v=20261105-065547';
import { DEFAULTS } from './engine.js?v=20261105-065547';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fb = teacherApp();

let rooms = [];
let room = null;          // the room open now
let subs = [];            // its strategies, parsed and checked
let unwatch = null;

// ---------------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------------

$('#sign-in').onclick = () => fb.signIn().catch(e => {
  $('#sign-in-msg').textContent = 'Sign in did not work: ' + (e.code || e.message);
});
$('#sign-out').onclick = () => fb.signOut();

fb.onAuth(async user => {
  $('#signed-out').classList.toggle('hidden', !!user);
  $('#signed-in').classList.toggle('hidden', !user);
  if (unwatch) { unwatch(); unwatch = null; }
  if (!user) return;
  await loadRooms(localStorage.getItem('longgame.teacherRoom'));
});

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

async function loadRooms(select) {
  try {
    rooms = await fb.myRooms();
  } catch (e) {
    rooms = [];
    $('#room-pick').innerHTML = `<option>Could not load rooms (${esc(e.code || e.message)})</option>`;
    return;
  }
  const pick = $('#room-pick');
  pick.innerHTML = rooms.length
    ? rooms.map(r => `<option value="${r.code}">${esc(r.title || 'Untitled')} · ${r.code}</option>`).join('')
    : '<option value="">No rooms yet: make one below</option>';
  const code = rooms.find(r => r.code === select) ? select : rooms[0]?.code;
  if (code) { pick.value = code; openRoom(code); }
}

$('#room-pick').onchange = e => e.target.value && openRoom(e.target.value);

$('#room-new').onclick = async () => {
  const btn = $('#room-new');
  btn.disabled = true;
  try {
    const code = await fb.createRoom($('#room-title').value.trim());
    $('#room-title').value = '';
    await loadRooms(code);
  } catch (e) {
    alertBox('#room-state', 'Could not make a room: ' + (e.code || e.message));
  } finally { btn.disabled = false; }
};

function openRoom(code) {
  room = rooms.find(r => r.code === code);
  localStorage.setItem('longgame.teacherRoom', code);
  $('#room-panel').classList.remove('hidden');
  $('#subs-panel').classList.remove('hidden');
  $('#run-panel').classList.remove('hidden');
  $('#results').classList.add('hidden');
  $('#room-code').textContent = code;
  const link = new URL(`build.html?room=${code}`, location.href).href.replace(/^https?:\/\//, '');
  $('#room-link').textContent = link;
  paintOpen();
  if (!$('#t-seed').value) $('#t-seed').value = newSeed();
  if (unwatch) unwatch();
  unwatch = fb.watchStrategies(code, list => { subs = list.map(prepare); paintSubs(); },
    e => { $('#subs').innerHTML = `<p class="errors small">Could not load strategies: ${esc(e.code || e.message)}</p>`; });
  loadRuns();
}

function paintOpen() {
  $('#room-open').textContent = room.open ? 'Close to new strategies' : 'Open to new strategies';
  $('#room-state').textContent = room.open ? 'Open: students can send.' : 'Closed: nothing new can arrive.';
}
$('#room-open').onclick = async () => {
  try {
    await fb.setOpen(room.code, !room.open);
    room.open = !room.open;
    paintOpen();
  } catch (e) { alertBox('#room-state', 'Could not change it: ' + (e.code || e.message)); }
};

function alertBox(sel, text) { $(sel).textContent = text; }

// ---------------------------------------------------------------------------
// Strategies
// ---------------------------------------------------------------------------

// Every stored strategy is checked again here. Anything that fails is shown
// but left out of the tournament.
function prepare(d) {
  let strategy = null, errors = [];
  try {
    strategy = JSON.parse(d.json);
    const v = validate(strategy);
    if (!v.ok) errors = v.errors;
  } catch { errors = ['The stored JSON cannot be read.']; }
  return { id: d.id, handle: d.handle, name: d.name, strategy, errors, at: d.createdAt?.toDate?.() };
}

function paintSubs() {
  const ok = subs.filter(s => !s.errors.length);
  $('#subs-count').textContent = `${ok.length} ready${subs.length > ok.length ? `, ${subs.length - ok.length} with problems` : ''}`;
  $('#t-summary').textContent = ok.length < 2 ? 'Needs at least 2 strategies.' : `${ok.length} strategies`;
  $('#t-run').disabled = ok.length < 2;
  const sorted = [...subs].sort((a, b) => (b.at || 0) - (a.at || 0));
  $('#subs').innerHTML = sorted.length ? sorted.map(s => `<details class="item">
      <summary><span>${esc(s.name)}</span> <span class="muted small" style="font-weight:400">by ${esc(s.handle)}</span>${s.errors.length ? ' <span class="small" style="color:var(--bad)">has problems</span>' : ''}</summary>
      ${s.errors.length ? `<div class="errors small"><ul>${s.errors.map(e => `<li>${esc(e)}</li>`).join('')}</ul></div>` : readbackSmall(s.strategy)}
      <button class="btn quiet small" data-remove="${s.id}">Remove</button>
    </details>`).join('') : '<p class="muted small">Nothing yet. Give students the code.</p>';
  $('#subs').querySelectorAll('[data-remove]').forEach(b => b.onclick = () => {
    if (b.dataset.armed) {
      fb.removeStrategy(room.code, b.dataset.remove).catch(e => { b.textContent = 'Could not remove: ' + (e.code || e.message); });
      return;
    }
    b.dataset.armed = '1';
    b.textContent = 'Click again to remove for good';
  });
}

function readbackSmall(s) {
  const r = readback(s);
  return `<div class="small readback">${s.description ? `<p><em>${esc(s.description)}</em></p>` : ''}
    ${s.approximations ? `<p class="note">AI note: ${esc(s.approximations)}</p>` : ''}
    <p>${esc(r.first)}</p>${r.rules.length ? `<ol>${r.rules.map(x => `<li>${esc(x.text)}</li>`).join('')}</ol>` : ''}<p>${esc(r.fallback)}</p>
    ${r.extras.map(e => `<p>${esc(e)}</p>`).join('')}</div>`;
}

$('#add-btn').onclick = async () => {
  const msg = $('#add-msg');
  const p = parsePasted($('#add-json').value);
  if (p.error) { msg.innerHTML = `<span style="color:var(--bad)">${esc(p.error)}</span>`; return; }
  const v = validate(p.value);
  if (!v.ok) { msg.innerHTML = `<span style="color:var(--bad)">${v.errors.map(esc).join('<br>')}</span>`; return; }
  try {
    await fb.addStrategy(room.code, p.value, $('#add-handle').value);
    $('#add-json').value = '';
    msg.textContent = 'Added.';
  } catch (e) { msg.textContent = 'Could not add: ' + (e.code || e.message); }
};

// ---------------------------------------------------------------------------
// Running a tournament
// ---------------------------------------------------------------------------

$('#t-format').innerHTML = Object.entries(FORMATS).map(([k, f]) => `<option value="${k}" title="${esc(f.describe)}">${esc(f.label)}</option>`).join('');
$('#t-rounds').value = DEFAULTS.rounds;
$('#t-self').checked = DEFAULTS.selfPlay;

function newSeed() {
  const words = ['amber', 'river', 'falcon', 'maple', 'comet', 'harbor', 'cedar', 'lantern', 'quartz', 'willow'];
  return words[Math.floor(Math.random() * words.length)] + Math.floor(100 + Math.random() * 900);
}
$('#t-newseed').onclick = () => { $('#t-seed').value = newSeed(); };

function settings() {
  const rounds = Math.max(10, Math.min(1000, Math.round(+$('#t-rounds').value) || DEFAULTS.rounds));
  $('#t-rounds').value = rounds;
  const seed = $('#t-seed').value.trim() || newSeed();
  $('#t-seed').value = seed;
  return { rounds, seed, selfPlay: $('#t-self').checked, format: $('#t-format').value };
}

async function run(opts, onlyIds) {
  let pool = subs.filter(s => !s.errors.length);
  if (onlyIds) pool = pool.filter(s => onlyIds.includes(s.id));
  // Sorted by id, so who plays as side A never depends on arrival order and
  // a saved run replays exactly.
  const entries = pool.map(s => ({ id: s.id, name: s.name, handle: s.handle, strategy: s.strategy }))
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  if (entries.length < 2) { $('#t-summary').textContent = 'Needs at least 2 strategies.'; return; }

  $('#t-run').disabled = true;
  $('#t-progress').classList.remove('hidden');
  const bar = $('#t-progress .progress > div');
  const res = await runTournament(entries, opts, p => {
    bar.style.width = (100 * p.match / p.matches).toFixed(1) + '%';
    $('#t-progress-text').textContent = `Match ${p.match} of ${p.matches}, ${p.rounds} rounds each`;
  });
  $('#t-run').disabled = false;
  showResults(res);
  return res;
}

$('#t-run').onclick = async () => {
  const res = await run(settings());
  if (res) saveRunButton(res);
};

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

const panes = {};
document.querySelectorAll('[data-pane]').forEach(p => { panes[p.dataset.pane] = p; });
function showTab(name) {
  document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  Object.entries(panes).forEach(([k, p]) => p.classList.toggle('hidden', k !== name));
}
document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => showTab(b.dataset.tab));
panes.openReplay = (i, j) => { showTab('replay'); panes.replay.pick(i, j); };

function showResults(res) {
  $('#results').classList.remove('hidden');
  renderResults(res, panes);
  showTab('board');
  $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------------------------------------------------------------------------
// Saved runs: settings plus strategy ids reproduce a run exactly.
// ---------------------------------------------------------------------------

function saveRunButton(res) {
  const p = $('#t-progress-text');
  p.innerHTML = `Done. <button class="btn small" id="t-save">Save this run</button>`;
  $('#t-save').onclick = async () => {
    try {
      await fb.saveRun(room.code, {
        rounds: res.opts.rounds, seed: res.opts.seed, selfPlay: res.opts.selfPlay, format: res.opts.format,
        ids: res.entries.map(e => e.id),
        top: res.ranking.slice(0, 50).map(t => ({ name: t.name, handle: t.handle, total: t.total }))
      });
      p.textContent = 'Saved.';
      loadRuns();
    } catch (e) { p.textContent = 'Could not save: ' + (e.code || e.message); }
  };
}

async function loadRuns() {
  const box = $('#runs');
  let runs = [];
  try { runs = await fb.listRuns(room.code); } catch (e) { box.innerHTML = `<p class="small muted">Could not load saved runs (${esc(e.code || e.message)}).</p>`; return; }
  box.innerHTML = runs.length ? `<table class="small"><tbody>${runs.map(r => `<tr>
      <td>${r.createdAt?.toDate?.().toLocaleString() || ''}</td>
      <td>${r.ids.length} strategies, ${r.rounds} rounds, seed "${esc(r.seed)}"</td>
      <td>${r.top?.[0] ? `Winner: ${esc(r.top[0].name)}` : ''}</td>
      <td><button class="btn small" data-load="${r.id}">Load</button></td></tr>`).join('')}</tbody></table>`
    : '<p class="small muted">None yet. Run a tournament, then save it.</p>';
  box.querySelectorAll('[data-load]').forEach(b => b.onclick = async () => {
    const r = runs.find(x => x.id === b.dataset.load);
    $('#t-rounds').value = r.rounds; $('#t-seed').value = r.seed; $('#t-self').checked = r.selfPlay;
    const missing = r.ids.filter(id => !subs.some(s => s.id === id && !s.errors.length));
    await run({ rounds: r.rounds, seed: r.seed, selfPlay: r.selfPlay, format: r.format || 'roundRobin' }, r.ids);
    if (missing.length) $('#t-progress-text').textContent = `${missing.length} strategies from that run have since been removed, so the results differ.`;
  });
}
