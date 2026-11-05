// The Long Game - the build page: guided builder, AI route, review, test, send.

import { playMatch, DEFAULTS } from './engine.js?v=20261105-074708';
import { validate, parsePasted, LIMITS } from './validate.js?v=20261105-074708';
import { readback, chanceWord, actionPhrase } from './readback.js?v=20261105-074708';
import { QUESTIONS, SPECIAL_KINDS, INVERSE, defaultAnswers, compile, builderAnswersFor } from './builder.js?v=20261105-074708';
import { strategyPrompt, extendPrompt } from './prompt.js?v=20261105-074708';
import { TEST_OPPONENTS } from './opponents.js?v=20261105-074708';
import { mountReplay } from './replay.js?v=20261105-074708';
import { roomInfo, submitStrategy, publicRooms, cleanHandle, cleanCode } from './firebase.js?v=20261105-074708';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STORE = 'longgame.builder.v1';

let ans = loadAnswers();
let current = null;        // the strategy under review
let source = 'builder';    // where it came from: 'builder' or 'ai'

function loadAnswers() {
  const base = defaultAnswers();
  try {
    const saved = JSON.parse(localStorage.getItem(STORE));
    if (saved) for (const k of Object.keys(base)) if (k in saved) base[k] = saved[k];
  } catch { /* start fresh */ }
  return base;
}
const saveAnswers = () => localStorage.setItem(STORE, JSON.stringify(ans));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

function showRoute(name) {
  document.querySelectorAll('[data-route]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.route === name)));
  $('#route-builder').classList.toggle('hidden', name !== 'builder');
  $('#route-ai').classList.toggle('hidden', name !== 'ai');
  $('#review').classList.add('hidden');
  setStep(1);
}
document.querySelectorAll('[data-route]').forEach(b => b.onclick = () => showRoute(b.dataset.route));

// ---------------------------------------------------------------------------
// The builder form, drawn from QUESTIONS
// ---------------------------------------------------------------------------

function chanceControl(a, k) {
  const c = a.chance ?? 100;
  const always = c >= 100;
  const inv = INVERSE[a.do];
  if (!inv) return '';
  return `<div class="chance">
    <button class="choice small" aria-pressed="${always}" data-k="${k}-always" data-act="always">Always</button>
    <button class="choice small" aria-pressed="${!always}" data-k="${k}-some" data-act="some">Some of the time</button>
    ${always ? '' : `<input type="range" min="5" max="95" step="5" value="${c}" data-k="${k}-range" data-act="chance" aria-label="Chance">
      <span class="word"><strong>${chanceWord(c)}</strong> (${c}%), otherwise ${esc(actionPhrase(inv))}</span>`}
  </div>`;
}

function fieldHtml(q, f, a) {
  const k = `${q.id}-${f.key}`;
  const label = f.label ? `<div class="label" style="margin:10px 0 6px">${esc(f.label)}</div>` : '';
  switch (f.type) {
    case 'choice':
      return `${label}<div class="choices">${f.choices.map(c =>
        `<button class="choice" aria-pressed="${a[f.key] === c.value}" title="${esc(c.tip || '')}" data-k="${k}-${c.value}" data-act="pick" data-key="${f.key}" data-value="${c.value}">${esc(c.label)}</button>`
      ).join('')}</div>${f.chance ? chanceControl(a, k) : ''}`;
    case 'number':
      return `<label class="field sub" style="flex-direction:row;align-items:center;gap:10px">${esc(f.label)}
        <input type="number" min="${f.min}" max="${f.max}" value="${a[f.key]}" data-k="${k}" data-act="num" data-key="${f.key}"></label>`;
    case 'percent': {
      const max = f.max ?? 100;
      return `<div class="chance">${esc(f.label)}
        <input type="range" min="0" max="${max}" step="${max <= 20 ? 1 : 5}" value="${a[f.key]}" data-k="${k}" data-act="pct" data-key="${f.key}">
        <span class="word"><strong>${chanceWord(a[f.key])}</strong> (${a[f.key]}%)</span></div>`;
    }
    case 'moves':
      return `${label}<div class="moves-edit">${a[f.key].map((m, i) =>
        `<button class="mv ${m === 'defect' ? 'd' : 'c'}" title="Click to flip" data-k="${k}-${i}" data-act="flip" data-key="${f.key}" data-i="${i}">${m === 'defect' ? 'D' : 'C'}</button>`
      ).join('')}
        ${a[f.key].length < f.max ? `<button class="btn small" data-k="${k}-add" data-act="addmove" data-key="${f.key}">+ add</button>` : ''}
        ${a[f.key].length > 1 ? `<button class="btn small" data-k="${k}-del" data-act="delmove" data-key="${f.key}">remove last</button>` : ''}
      </div><p class="small muted" style="margin-top:6px">C = cooperate, D = defect. Click a move to flip it.</p>`;
    case 'special':
      return a.entries.map((e, i) => {
        const kind = SPECIAL_KINDS.find(s => s.value === e.kind);
        return `<div class="special-row">
          <select data-k="${k}-${i}-kind" data-act="sp" data-i="${i}" data-f="kind">${SPECIAL_KINDS.map(s => `<option value="${s.value}" ${s.value === e.kind ? 'selected' : ''}>${s.label}</option>`).join('')}</select>
          ${kind.nums.map(n => `<input type="number" min="1" max="1000" value="${e[n] ?? 1}" data-k="${k}-${i}-${n}" data-act="spnum" data-i="${i}" data-f="${n}" aria-label="round">`).join(kind.nums.length === 2 ? ' to ' : '')}
          <span>:</span>
          <select data-k="${k}-${i}-do" data-act="sp" data-i="${i}" data-f="do"><option value="defect" ${e.do === 'defect' ? 'selected' : ''}>defect</option><option value="cooperate" ${e.do === 'cooperate' ? 'selected' : ''}>cooperate</option></select>
          <input type="number" min="5" max="100" step="5" value="${e.chance ?? 100}" data-k="${k}-${i}-chance" data-act="spnum" data-i="${i}" data-f="chance" aria-label="percent of the time"><span class="small">% of the time</span>
          <button class="btn quiet small" data-k="${k}-${i}-x" data-act="spdel" data-i="${i}">remove</button>
        </div>`;
      }).join('') + (a.entries.length < f.max
        ? `<button class="btn small" style="margin-top:8px" data-k="${k}-spadd" data-act="spadd">+ add a round</button>`
        : '');
  }
  return '';
}

function questionHtml(q, n) {
  const a = ans[q.id];
  const visible = q.fields.filter(f => !f.showIf || f.showIf(a));
  let notes = '';
  if (q.id === 'grudge' && a.kind !== 'none' && ans.onDefect.do === 'cooperate') {
    notes += '<p class="note small" style="margin-top:10px">A grudge means defecting, so it overrides "Cooperate anyway".</p>';
  }
  if (q.id === 'grudge' && a.kind !== 'none' && (ans.onDefect.chance ?? 100) < 100) {
    notes += '<p class="note small" style="margin-top:10px">With a grudge you always hit back, so the chance on "When they defect" is not used.</p>';
  }
  if (q.id === 'forgive' && a.kind === 'coop' && !['2', 'n', 'forever'].includes(ans.grudge.kind)) {
    notes += `<p class="note small" style="margin-top:10px">${esc(q.needs)}</p>`;
  }
  if (q.id === 'pattern' && a.use === 'alone') {
    notes += '<p class="note small" style="margin-top:10px">Your answers to questions 1 to 4 are ignored while this is on.</p>';
  }
  if (q.id === 'fallback' && ans.pattern.on) {
    notes += '<p class="note small" style="margin-top:10px">Your pattern is your fallback while the Pattern twist is on.</p>';
  }
  return `<div class="q ${q.section === 'twist' ? 'twist' : ''}" data-q="${q.id}">
    ${q.section === 'twist' ? `<button class="btn quiet small remove" data-k="${q.id}-off" data-act="off">turn off</button>` : ''}
    <h3>${n ? `<span class="n">${n}</span>` : ''}${esc(q.title)}</h3>
    <p class="ask">${esc(q.ask)}</p>
    ${visible.map(f => fieldHtml(q, f, a)).join('')}
    ${q.hint ? `<p class="small muted" style="margin-top:8px">${esc(q.hint)}</p>` : ''}
    ${notes}
  </div>`;
}

function renderBuilder() {
  const focusKey = document.activeElement?.dataset?.k;
  const core = QUESTIONS.filter(q => q.section === 'core');
  const twists = QUESTIONS.filter(q => q.section === 'twist');
  $('#core').innerHTML = core.map((q, i) => questionHtml(q, i + 1)).join('');
  $('#twist-cards').innerHTML = twists.map(q =>
    `<button class="twist-card" aria-pressed="${!!ans[q.id].on}" data-k="card-${q.id}" data-act="toggle" data-q="${q.id}"><strong>${esc(q.title)}</strong><span>${esc(q.ask)}</span></button>`
  ).join('');
  $('#twists').innerHTML = twists.filter(q => ans[q.id].on).map(q => questionHtml(q)).join('');
  $('#finish').innerHTML = QUESTIONS.filter(q => q.section === 'finish').map(q => questionHtml(q)).join('');
  $('#b-name').value = ans.name;
  $('#b-desc').value = ans.description;
  if (focusKey) document.querySelector(`[data-k="${CSS.escape(focusKey)}"]`)?.focus();
  updateReadback();
}

function updateReadback() {
  saveAnswers();
  const s = compile(ans);
  const v = validate(s);
  const n = s.rules.length;
  const meter = $('#b-meter');
  meter.textContent = `${n} of ${LIMITS.rules} rules`;
  meter.classList.toggle('over', n > LIMITS.rules);
  $('#b-readback').innerHTML = readbackHtml(s);
  $('#b-errors').innerHTML = v.ok ? '' : `<div class="errors small"><strong>Not ready yet</strong><ul>${v.errors.map(e => `<li>${esc(e)}</li>`).join('')}</ul>${n > LIMITS.rules ? '<p style="margin:6px 0 0">Turn off a twist to get back under the limit.</p>' : ''}</div>`;
  $('#b-test').disabled = !v.ok;
  $('#b-next').disabled = !v.ok;
  $('#b-next').nextElementSibling.textContent = v.ok ? 'Then you can send it.' : 'Fix the problems shown beside "Your strategy" first.';
}

function readbackHtml(s) {
  const r = readback(s);
  return `<p>${esc(r.first)}</p>
    ${r.rules.length ? `<p class="small muted" style="margin:0">From round 2, the first rule that fits:</p>
    <ol>${r.rules.map(x => `<li>${x.label ? `<span class="tag">${esc(x.label)}</span>` : ''}${esc(x.text)}</li>`).join('')}</ol>` : ''}
    <p>${esc(r.fallback)}</p>
    ${r.extras.map(e => `<p class="small">${esc(e)}</p>`).join('')}`;
}

// One handler for every control in the builder.
function onBuilderEvent(e) {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const qEl = t.closest('[data-q]');
  const qid = t.dataset.q || qEl?.dataset.q;
  const a = ans[qid];
  const act = t.dataset.act;
  const isInput = e.type === 'input';
  if (isInput && !['chance', 'pct', 'num', 'spnum'].includes(act)) return;
  if (!isInput && e.type === 'click' && ['chance', 'pct', 'num', 'spnum', 'sp'].includes(act)) return;

  switch (act) {
    case 'pick': a[t.dataset.key] = t.dataset.value; break;
    case 'always': a.chance = 100; break;
    case 'some': if ((a.chance ?? 100) >= 100) a.chance = 80; break;
    case 'chance': a.chance = +t.value; break;
    case 'pct': a[t.dataset.key] = +t.value; break;
    case 'num': {
      const f = QUESTIONS.find(q => q.id === qid).fields.find(f => f.key === t.dataset.key);
      const v = Math.round(+t.value);
      if (!Number.isFinite(v)) return;
      a[t.dataset.key] = Math.max(f.min, Math.min(f.max, v));
      break;
    }
    case 'flip': a[t.dataset.key][+t.dataset.i] = a[t.dataset.key][+t.dataset.i] === 'defect' ? 'cooperate' : 'defect'; break;
    case 'addmove': a[t.dataset.key].push('cooperate'); break;
    case 'delmove': a[t.dataset.key].pop(); break;
    case 'toggle': ans[qid].on = !ans[qid].on; break;
    case 'off': ans[qid].on = false; break;
    case 'sp': a.entries[+t.dataset.i][t.dataset.f] = t.value; break;
    case 'spnum': {
      const v = Math.round(+t.value);
      if (!Number.isFinite(v) || v < 1) return;
      a.entries[+t.dataset.i][t.dataset.f] = t.dataset.f === 'chance' ? Math.min(100, v) : Math.min(1000, v);
      break;
    }
    case 'spadd': a.entries.push({ kind: 'round', a: 50, b: 60, do: 'defect', chance: 100 }); break;
    case 'spdel': a.entries.splice(+t.dataset.i, 1); break;
  }

  if (isInput) {
    // Keep the slider under the finger: update its words, not the whole form.
    const word = t.parentElement.querySelector('.word');
    if (word && act === 'chance') word.innerHTML = `<strong>${chanceWord(a.chance)}</strong> (${a.chance}%), otherwise ${esc(actionPhrase(INVERSE[a.do]))}`;
    if (word && act === 'pct') word.innerHTML = `<strong>${chanceWord(+t.value)}</strong> (${t.value}%)`;
    updateReadback();
  } else {
    renderBuilder();
  }
}
const builderEl = $('#route-builder');
builderEl.addEventListener('click', onBuilderEvent);
builderEl.addEventListener('input', onBuilderEvent);
builderEl.addEventListener('change', e => { if (e.target.dataset.act === 'sp') onBuilderEvent(e); });
$('#b-name').addEventListener('input', e => { ans.name = e.target.value; updateReadback(); });
$('#b-desc').addEventListener('input', e => { ans.description = e.target.value; updateReadback(); });

$('#b-reset').onclick = () => {
  if (!confirmReset()) return;
  ans = defaultAnswers();
  renderBuilder();
};
// A two-click reset instead of a browser dialog.
let resetArmed = false;
function confirmReset() {
  if (resetArmed) { resetArmed = false; $('#b-reset').textContent = 'Start again'; return true; }
  resetArmed = true;
  $('#b-reset').textContent = 'Click again to clear every answer';
  setTimeout(() => { resetArmed = false; $('#b-reset').textContent = 'Start again'; }, 4000);
  return false;
}

$('#b-test').onclick = () => {
  source = 'builder';
  openReview(compile(ans));
};

$('#b-extend').onclick = async () => {
  await copyText(extendPrompt(compile(ans)));
  $('#b-extend-msg').innerHTML = 'Copied. Paste it into an AI chat, then bring its JSON back to <a href="#" id="go-ai">Ask an AI</a>.';
  $('#go-ai').onclick = ev => { ev.preventDefault(); showRoute('ai'); };
};

// ---------------------------------------------------------------------------
// AI route
// ---------------------------------------------------------------------------

$('#ai-prompt').value = strategyPrompt();
$('#ai-copy').onclick = async () => {
  await copyText(strategyPrompt());
  $('#ai-copied').textContent = 'Copied. Now paste it into an AI chat.';
};
$('#ai-check').onclick = () => {
  const p = parsePasted($('#ai-paste').value);
  const box = $('#ai-errors');
  if (p.error) { box.innerHTML = `<div class="errors">${esc(p.error)}</div>`; return; }
  const v = validate(p.value);
  if (!v.ok) {
    box.innerHTML = `<div class="errors"><strong>Fix these, or paste the list back to the AI and ask it to fix them:</strong><ul>${v.errors.map(e => `<li>${esc(e)}</li>`).join('')}</ul></div>`;
    return;
  }
  box.innerHTML = '';
  source = 'ai';
  openReview(p.value);
};

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.append(ta); ta.select();
    document.execCommand('copy'); ta.remove();
  }
}

// ---------------------------------------------------------------------------
// Review: readback, test matches, send
// ---------------------------------------------------------------------------

function openReview(s) {
  current = s;
  $('#route-builder').classList.add('hidden');
  $('#route-ai').classList.add('hidden');
  $('#review').classList.remove('hidden');
  $('#r-name').textContent = s.name + (s.description ? ': ' + s.description : '');
  $('#r-approx').innerHTML = s.approximations
    ? `<div class="note" style="margin-bottom:12px"><strong>The AI could not build everything exactly.</strong> It says: ${esc(s.approximations)}</div>` : '';
  $('#r-readback').innerHTML = readbackHtml(s);

  const canEdit = source === 'builder' || builderAnswersFor(s);
  $('#r-edit').textContent = canEdit ? 'Change it in the builder' : 'Change it';
  $('#r-edit').onclick = () => {
    if (canEdit) {
      if (source === 'ai') { ans = { ...defaultAnswers(), ...builderAnswersFor(s) }; renderBuilder(); }
      showRoute('builder');
    } else {
      $('#ai-paste').value = JSON.stringify(s, null, 2);
      showRoute('ai');
    }
    window.scrollTo(0, 0);
  };
  if (source === 'ai' && !canEdit) {
    $('#r-edit').title = 'This strategy uses things the builder cannot show, so change it with the AI.';
  }

  const tests = $('#r-tests');
  tests.innerHTML = '';
  TEST_OPPONENTS.forEach((opp, i) => {
    const m = playMatch(s, opp, { rounds: DEFAULTS.rounds, seed: 'test', log: true });
    const card = document.createElement('div');
    card.className = 'panel';
    const verdict = m.scoreA < m.scoreB ? ['win', 'You got less time in jail']
      : m.scoreA > m.scoreB ? ['lose', `${opp.name} got less time in jail`]
      : ['', 'Same time in jail'];
    card.innerHTML = `<div class="label">vs ${esc(opp.name)}</div>
      <p class="small muted" style="margin:2px 0 8px">${esc(opp.description)}</p>
      <div class="vs-row"><span class="who">You</span><span class="yrs">${m.scoreA} <small>years</small></span></div>
      <div class="vs-row"><span class="who">${esc(opp.name)}</span><span class="yrs">${m.scoreB} <small>years</small></span></div>
      <p class="verdict ${verdict[0]}">${esc(verdict[1])}</p>
      <div class="label" style="margin-bottom:4px">Your moves</div>
      <div class="strip">${m.movesA.map(x => `<i class="${x === 'defect' ? 'd' : ''}"></i>`).join('')}</div>
      <button class="btn small" style="margin-top:10px">Watch it round by round</button>`;
    card.querySelector('button').onclick = () => showReplay(s, opp, m);
    tests.append(card);
    if (i === 0) showReplay(s, opp, m);
  });

  // Kept so the competitions page can offer "the one you last tested".
  localStorage.setItem('longgame.lastTested', JSON.stringify(s));

  $('#s-msg').innerHTML = '';
  setStep(2);
  window.scrollTo({ top: $('#review').offsetTop - 10, behavior: 'smooth' });
}

function setStep(n) {
  document.querySelectorAll('#stepbar li').forEach(li => {
    const k = +li.dataset.step;
    if (k === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    li.classList.toggle('done', k < n);
  });
}

function showReplay(s, opp, m) {
  $('#r-replay-title').textContent = `${s.name} vs ${opp.name}`;
  mountReplay($('#r-replay'), { a: s, b: opp, nameA: 'You', nameB: opp.name, match: m });
}

$('#r-copyjson').onclick = async () => {
  await copyText(JSON.stringify(current, null, 2));
  $('#r-copied').textContent = 'Copied';
};

// Room code and handle are remembered on this device.
const params = new URLSearchParams(location.search);
$('#s-code').value = cleanCode(params.get('room') || localStorage.getItem('longgame.room') || '');
$('#s-handle').value = localStorage.getItem('longgame.handle') || '';

// Class rooms and public competitions are the same kind of room; only how
// the student names it differs (a code, or a pick from the list).
async function send(code, btn, where) {
  const msg = $('#s-msg');
  const handle = cleanHandle($('#s-handle').value);
  $('#s-handle').value = handle;
  if (handle.length < 2) { msg.innerHTML = '<div class="errors">Pick a handle first: a nickname of 2 to 24 letters or numbers. Not your real name.</div>'; return; }
  const v = validate(current);
  if (!v.ok) { msg.innerHTML = '<div class="errors">This strategy has problems. Go back and fix them first.</div>'; return; }

  const label = btn.textContent;
  btn.disabled = true; btn.textContent = 'Sending...';
  try {
    const room = await roomInfo(code);
    if (!room) throw new Error(`There is no room ${code}. Check the code with your teacher.`);
    if (!room.open) throw new Error(where === 'class'
      ? 'This room is closed. Your teacher is not taking strategies right now.'
      : 'This competition is closed to new entries.');
    await submitStrategy(code, current, handle);
    if (where === 'class') localStorage.setItem('longgame.room', code);
    localStorage.setItem('longgame.handle', handle);
    setStep(3);
    msg.innerHTML = `<div class="good"><strong>Sent.</strong> "${esc(current.name)}" by ${esc(handle)} is in ${where === 'class' ? 'room ' + code : esc(room.title || 'the competition')}. Good luck.
      ${room.public ? `<br><a href="compete.html?c=${code}">See the competition</a>` : ''}</div>`;
  } catch (err) {
    const text = err.code === 'permission-denied'
      ? 'It would not accept it. It may be closed, or you may have sent the most allowed (5).'
      : (err.code ? 'Could not send: check your internet and try again.' : err.message);
    msg.innerHTML = `<div class="errors">${esc(text)}</div>`;
  } finally {
    btn.disabled = false; btn.textContent = label;
  }
}

$('#s-send').onclick = () => {
  const code = cleanCode($('#s-code').value);
  if (cleanHandle($('#s-handle').value).length < 2) return send(code, $('#s-send'), 'class');
  if (code.length < 4) { $('#s-msg').innerHTML = '<div class="errors">Type the room code your teacher gave you.</div>'; return; }
  send(code, $('#s-send'), 'class');
};
$('#s-send-public').onclick = () => {
  const code = $('#s-public').value;
  if (!code) { $('#s-msg').innerHTML = '<div class="errors">There is no public competition to send to yet.</div>'; return; }
  send(code, $('#s-send-public'), 'public');
};

async function loadPublicList() {
  const sel = $('#s-public');
  try {
    const list = (await publicRooms()).filter(r => r.open);
    sel.innerHTML = list.length
      ? list.map(r => `<option value="${r.code}">${esc(r.title || r.code)}</option>`).join('')
      : '<option value="">None open right now</option>';
    const wanted = params.get('c');
    if (wanted && list.some(r => r.code === wanted)) sel.value = wanted;
  } catch {
    sel.innerHTML = '<option value="">Could not load competitions</option>';
  }
}

$('#b-next').onclick = () => $('#b-test').click();

renderBuilder();
setStep(1);
if (params.get('route') === 'ai') showRoute('ai');
loadPublicList();
