// ibgrind app controller: home (presets), adjust, practice, history, about. Hash routes.
import { api, getSession, clearSession, store, initTheme, toggleTheme } from './api.js';
import { PRESETS, makeBuilder } from './builder.js';
import { esc, p1Stimulus, p3Stimulus, chunkHtml, disclaimer, markscheme } from './render.js';

initTheme();
const session = getSession();
if (!session) location.replace('index.html');

const view = document.getElementById('view');
const caseCache = new Map();
let catalog = null;
let timer = null;

// ---------- state ----------
const prefs = () => store.get('prefs', { level: 'SL', units: ['1', '2', '3', '4', '5'] });
const savePrefs = (p) => store.set('prefs', p);
const currentPlan = () => store.get('plan', null);
const savePlan = (p) => store.set('plan', p);
const history = () => store.get('history', []);
const ansKey = (caseId, qid) => `ans.${caseId}.${qid}`;

// ---------- boot ----------
document.getElementById('who').textContent = `${session?.name || ''} · ${session?.classLabel || ''}`;
document.getElementById('theme-btn').onclick = toggleTheme;
document.getElementById('out-btn').onclick = () => { clearSession(); location.replace('index.html'); };
document.getElementById('menu-btn').onclick = () => document.getElementById('sidebar').classList.toggle('open');
window.addEventListener('hashchange', route);

async function loadCatalog() {
  if (catalog) return catalog;
  try {
    catalog = await api.catalog();
  } catch (e) {
    handleError(e);
    throw e;
  }
  return catalog;
}

async function getCase(id) {
  if (caseCache.has(id)) return caseCache.get(id);
  const c = await api.caseById(id);
  caseCache.set(id, c);
  return c;
}

function handleError(e) {
  if (e.status === 401) { clearSession(); location.replace('index.html'); return; }
  const msg = e.status === 429 ? 'You have reached today’s limit for loading cases. Please come back tomorrow.'
    : 'Something went wrong loading the questions. Check your connection and try again.';
  view.innerHTML = `<div class="card"><p>${esc(msg)}</p></div>`;
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

function setNav(name) {
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === name));
  document.getElementById('sidebar').classList.remove('open');
}

async function route() {
  clearInterval(timer);
  document.body.classList.remove('print-ms');
  const [name, arg] = (location.hash.slice(1) || 'home').split('/');
  setNav(name === 'adjust' ? 'home' : name);
  try {
    await loadCatalog();
  } catch { return; }
  if (name === 'adjust') return renderAdjust(arg);
  if (name === 'practice') return renderPractice();
  if (name === 'history') return renderHistory();
  if (name === 'about') return renderAbout();
  return renderHome();
}

function builder() {
  const p = prefs();
  const recent = history().slice(0, 12).flatMap((h) => h.caseIds || []);
  return makeBuilder(catalog, { level: p.level, units: new Set(p.units), recent });
}

function startPlan(presetId, opts) {
  const plan = builder().build(presetId, opts);
  if (plan.error) { toast(plan.error); return false; }
  plan.id = `${Date.now()}`;
  savePlan(plan);
  const h = history();
  h.unshift({ id: plan.id, title: plan.title, created: plan.created, marks: plan.marks, caseIds: [...new Set(plan.parts.map((x) => x.caseId))], plan });
  store.set('history', h.slice(0, 40));
  location.hash = '#practice';
  return true;
}

// ---------- home ----------
function renderHome() {
  const p = prefs();
  const units = catalog.syllabus;
  view.innerHTML = `
    <div class="page-head"><h1>What do you want to practise?</h1>
      <p>Choose your level and the units you have covered, then pick a practice type.</p></div>
    <div class="card adjust">
      <div><label class="lbl">Level</label>
        <div class="seg" id="level">${['SL', 'HL'].map((l) => `<button data-l="${l}" class="${p.level === l ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div><label class="lbl">Units covered so far</label>
        <div class="row" id="units">${units.map((u) => `<label class="chip ${p.units.includes(u.id) ? 'on' : ''}"><input type="checkbox" value="${u.id}" ${p.units.includes(u.id) ? 'checked' : ''}>Unit ${u.id}: ${esc(u.name)}</label>`).join('')}</div></div>
    </div>
    <div class="section-title">Practice types</div>
    <div class="grid-presets">${PRESETS.filter((x) => !(x.hlOnly && p.level !== 'HL')).map((x) => `
      <button class="card preset" data-p="${x.id}"><h3>${esc(x.title)}</h3><p>${esc(x.blurb)}</p><span class="meta">${esc(x.meta)}</span></button>`).join('')}</div>`;
  view.querySelectorAll('#level button').forEach((b) => b.onclick = () => { savePrefs({ ...prefs(), level: b.dataset.l }); renderHome(); });
  view.querySelectorAll('#units input').forEach((i) => i.onchange = () => {
    const sel = [...view.querySelectorAll('#units input:checked')].map((x) => x.value);
    if (!sel.length) { i.checked = true; toast('Keep at least one unit selected.'); return; }
    savePrefs({ ...prefs(), units: sel });
    i.closest('.chip').classList.toggle('on', i.checked);
  });
  view.querySelectorAll('.preset').forEach((b) => b.onclick = () => {
    const pr = PRESETS.find((x) => x.id === b.dataset.p);
    if (pr.adjust) location.hash = `#adjust/${pr.id}`;
    else startPlan(pr.id, {});
  });
}

// ---------- adjust ----------
function renderAdjust(presetId) {
  const pr = PRESETS.find((x) => x.id === presetId) || PRESETS[1];
  const p = prefs();
  const saved = store.get(`adjust.${pr.id}`, { subtopics: [], marks: 20, reading: 'fewer' });
  const units = catalog.syllabus.filter((u) => p.units.includes(u.id));
  view.innerHTML = `
    <div class="page-head"><h1>${esc(pr.title)}</h1><p>${esc(pr.blurb)}</p></div>
    <div class="card adjust">
      ${pr.adjust.includes('topics') ? `<div><label class="lbl">Topics (leave all unticked for any topic in your units)</label>
        <div class="topics">${units.map((u) => `<details class="topic-unit" ${u.subtopics.some((s) => saved.subtopics.includes(s.id)) ? 'open' : ''}>
          <summary>Unit ${u.id}: ${esc(u.name)}</summary><div class="row">${u.subtopics.filter((s) => p.level === 'HL' || !s.hl).map((s) => `
            <label class="chip ${saved.subtopics.includes(s.id) ? 'on' : ''}"><input type="checkbox" value="${s.id}" ${saved.subtopics.includes(s.id) ? 'checked' : ''}>${s.id} ${esc(s.name)}${s.hl ? '<span class="hl-badge">HL</span>' : ''}</label>`).join('')}</div></details>`).join('')}</div></div>` : ''}
      ${pr.adjust.includes('marks') ? `<div><label class="lbl">Length: <span id="mk">${saved.marks}</span> marks (about <span id="mins">${Math.round(saved.marks * 2.2)}</span> minutes)</label>
        <input type="range" id="marks" min="10" max="40" step="2" value="${saved.marks}"></div>` : ''}
      ${pr.adjust.includes('reading') ? `<div><label class="lbl">Reading</label>
        <div class="seg" id="reading"><button data-r="fewer" class="${saved.reading !== 'exact' ? 'on' : ''}">Fewer cases to read</button><button data-r="exact" class="${saved.reading === 'exact' ? 'on' : ''}">Exact topic match</button></div>
        <p class="muted small" style="margin-top:6px">Fewer cases: questions come from as few cases as possible, so a few may be on nearby topics. Exact: every question is on your topics, but you may read more cases.</p></div>` : ''}
      <div class="row"><button class="btn btn-primary" id="go">Build my set</button><a class="btn btn-ghost" href="#home">Back</a></div>
    </div>`;
  const state = { ...saved };
  view.querySelectorAll('.topics input').forEach((i) => i.onchange = () => i.closest('.chip').classList.toggle('on', i.checked));
  const range = view.querySelector('#marks');
  if (range) range.oninput = () => { view.querySelector('#mk').textContent = range.value; view.querySelector('#mins').textContent = Math.round(range.value * 2.2); };
  view.querySelectorAll('#reading button').forEach((b) => b.onclick = () => {
    state.reading = b.dataset.r;
    view.querySelectorAll('#reading button').forEach((x) => x.classList.toggle('on', x === b));
  });
  view.querySelector('#go').onclick = () => {
    state.subtopics = [...view.querySelectorAll('.topics input:checked')].map((x) => x.value);
    if (range) state.marks = Number(range.value);
    store.set(`adjust.${pr.id}`, state);
    startPlan(pr.id, { subtopics: new Set(state.subtopics), marks: state.marks, reading: state.reading });
  };
}

// ---------- practice ----------
async function renderPractice() {
  const plan = currentPlan();
  if (!plan) {
    view.innerHTML = `<div class="page-head"><h1>No set yet</h1><p>Pick a practice type to start.</p></div><a class="btn btn-primary" href="#home">Choose practice</a>`;
    return;
  }
  view.innerHTML = '<div class="loading">Loading your questions…</div>';
  let cases;
  try {
    cases = new Map(await Promise.all([...new Set(plan.parts.map((x) => x.caseId))].map(async (id) => [id, await getCase(id)])));
  } catch (e) { handleError(e); return; }

  const examMode = store.get('examMode', false) && !plan.finished;
  let html = `<div class="toolbar no-print">
      <span class="timer" id="timer">${plan.minutes} min</span>
      <button class="btn btn-ghost btn-sm" id="t-start">${plan.timerEnds && !plan.finished ? 'Timer running' : 'Start timer'}</button>
      <label class="chip ${examMode ? 'on' : ''}" title="Hide markschemes until you finish"><input type="checkbox" id="exam" ${examMode ? 'checked' : ''}>Exam mode</label>
      <span class="spacer"></span>
      ${plan.finished ? '' : '<button class="btn btn-primary btn-sm" id="finish">Finish</button>'}
      <button class="btn btn-ghost btn-sm" id="print-paper">Print paper</button>
      <button class="btn btn-ghost btn-sm" id="print-ms">Print markscheme</button>
      <a class="btn btn-ghost btn-sm" href="#home">New set</a>
    </div>
    <div class="page-head"><div class="paper-title">${esc(plan.title)}</div>
      <p>${plan.level} · ${plan.marks} marks · about ${plan.minutes} minutes</p></div>`;

  let qn = 0;
  let lastCase = null;
  plan.parts.forEach((part, pi) => {
    const c = cases.get(part.caseId);
    const qs = part.questionIds.map((id) => c.questions.find((q) => q.id === id)).filter(Boolean);
    if (part.section === 'B' && (pi === 0 || plan.parts[pi - 1].section !== 'B')) {
      html += `<div class="section-label">Section B</div><p class="choose-note">${part.choose === 'part' ? 'Answer one of the cases in this section.' : 'Answer one question from this section.'}</p>`;
    } else if (part.section === 'A' && pi === 0 && plan.parts.some((x) => x.section === 'B')) {
      html += '<div class="section-label">Section A</div>';
    }
    html += `<div class="case-block">`;
    if (c.id !== lastCase || c.paper !== 'p1') html += `<div class="case-name">${esc(c.business.name)} (${esc(c.business.abbr)})</div>`;
    if (c.paper === 'p1') {
      if (c.id !== lastCase) html += p1Stimulus(c);
      for (const q of qs) html += questionHtml(c, q, `${++qn}.`, examMode, plan);
    } else if (c.paper === 'p3') {
      html += p3Stimulus(c);
      for (const q of qs) html += questionHtml(c, q, `${++qn}.`, examMode, plan);
    } else {
      // Paper 2: chunks with the parts placed after the chunk they follow; letters re-assigned per set
      const maxChunk = Math.max(...qs.map((q) => q.chunk || 1));
      const letters = 'abcdefghijklmnop';
      let li = 0;
      qn += 1;
      c.stimulus.chunks.slice(0, maxChunk).forEach((ch, ci) => {
        html += chunkHtml(ch);
        for (const q of qs.filter((x) => (x.chunk || 1) === ci + 1)) html += questionHtml(c, q, `${qn}(${letters[li++]})`, examMode, plan);
      });
      html += disclaimer();
    }
    html += `</div>`;
    lastCase = c.id;
  });
  view.innerHTML = html;
  wirePractice(plan, cases, examMode);
}

function questionHtml(c, q, label, examMode, plan) {
  const val = store.get(ansKey(c.id, q.id), '');
  const locked = plan.finished && plan.lockOnFinish;
  return `<div class="q" data-c="${c.id}" data-q="${q.id}">
    <div class="q-head"><div class="q-text"><span class="q-num">${esc(label)}</span>${esc(q.text)}</div><div class="q-marks">[${q.marks}]</div></div>
    <textarea placeholder="Your answer" ${locked ? 'readonly' : ''}>${esc(val)}</textarea>
    <div class="q-actions">
      <button class="btn btn-ghost ms-btn" ${examMode ? 'disabled title="Finish the set to see markschemes"' : ''}>Markscheme</button>
      ${plan.finished ? '' : '<button class="btn btn-ghost rr-btn" title="Swap for a similar question">Swap question</button>'}
      <button class="btn btn-ghost rep-btn" title="Tell your teacher about a problem with this question">Report a problem</button>
    </div>
    <div class="ms" hidden>${markscheme(q)}</div>
  </div>`;
}

function wirePractice(plan, cases, examMode) {
  // answers autosave on this device
  view.querySelectorAll('.q').forEach((el) => {
    const { c, q } = el.dataset;
    const ta = el.querySelector('textarea');
    let t;
    ta.oninput = () => { clearTimeout(t); t = setTimeout(() => store.set(ansKey(c, q), ta.value), 300); };
    el.querySelector('.ms-btn').onclick = () => { const ms = el.querySelector('.ms'); ms.hidden = !ms.hidden; };
    const rr = el.querySelector('.rr-btn');
    if (rr) rr.onclick = () => swapQuestion(plan, c, q);
    el.querySelector('.rep-btn').onclick = () => reportModal(c, q);
  });
  const exam = view.querySelector('#exam');
  exam.onchange = () => { store.set('examMode', exam.checked); renderPractice(); };
  const fin = view.querySelector('#finish');
  if (fin) fin.onclick = () => { plan.finished = true; plan.timerEnds = null; savePlan(plan); toast('Set finished. Markschemes are available.'); renderPractice(); };
  view.querySelector('#print-paper').onclick = () => { document.body.classList.remove('print-ms'); window.print(); };
  view.querySelector('#print-ms').onclick = () => { document.body.classList.add('print-ms'); window.print(); setTimeout(() => document.body.classList.remove('print-ms'), 500); };
  // timer: counts down from the suggested time; when it ends in exam mode the set finishes
  const tEl = view.querySelector('#timer');
  const startBtn = view.querySelector('#t-start');
  const tick = () => {
    if (!plan.timerEnds) return;
    const left = Math.max(0, plan.timerEnds - Date.now());
    const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
    tEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
    tEl.classList.toggle('low', left < 5 * 60000);
    if (left === 0) {
      clearInterval(timer);
      plan.timerEnds = null;
      if (store.get('examMode', false)) { plan.finished = true; plan.lockOnFinish = true; }
      savePlan(plan);
      toast('Time is up.');
      renderPractice();
    }
  };
  startBtn.onclick = () => {
    if (plan.finished) return;
    plan.timerEnds = Date.now() + plan.minutes * 60000;
    savePlan(plan);
    startBtn.textContent = 'Timer running';
    clearInterval(timer); timer = setInterval(tick, 1000); tick();
  };
  if (plan.timerEnds && !plan.finished) { clearInterval(timer); timer = setInterval(tick, 1000); tick(); }
}

function swapQuestion(plan, caseId, qid) {
  const r = builder().reroll(plan, caseId, qid);
  if (!r) { toast('No similar question is available to swap in.'); return; }
  const part = plan.parts.find((p) => p.caseId === caseId && p.questionIds.includes(qid));
  if (r.caseId === caseId) {
    part.questionIds = part.questionIds.map((id) => (id === qid ? r.questionId : id));
  } else {
    part.questionIds = part.questionIds.filter((id) => id !== qid);
    const idx = plan.parts.indexOf(part);
    plan.parts.splice(idx + 1, 0, { caseId: r.caseId, paper: part.paper, questionIds: [r.questionId], section: part.section === 'A' ? 'D' : part.section });
    if (!part.questionIds.length) plan.parts.splice(idx, 1);
  }
  savePlan(plan);
  renderPractice();
}

function reportModal(caseId, qid) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><h3>Report a problem</h3>
    <p class="muted small">Something wrong with this question or markscheme? Your teacher will see this.</p>
    <textarea id="rep" maxlength="1500" placeholder="What is the problem?"></textarea>
    <div class="row" style="margin-top:12px"><button class="btn btn-primary" id="send">Send</button><button class="btn btn-ghost" id="cancel">Cancel</button></div></div>`;
  document.body.appendChild(bg);
  const close = () => bg.remove();
  bg.querySelector('#cancel').onclick = close;
  bg.onclick = (e) => { if (e.target === bg) close(); };
  bg.querySelector('#send').onclick = async () => {
    const msg = bg.querySelector('#rep').value.trim();
    if (!msg) return;
    try { await api.report(caseId, qid, msg); close(); toast('Thanks, your report was sent.'); }
    catch { toast('Could not send the report. Try again later.'); }
  };
  bg.querySelector('#rep').focus();
}

// ---------- history and about ----------
function renderHistory() {
  const h = history();
  view.innerHTML = `<div class="page-head"><h1>History</h1><p>Your recent sets on this device.</p></div>
    <div class="card list">${h.length ? h.map((x) => `<div class="list-item"><div><b>${esc(x.title)}</b><div class="muted small">${new Date(x.created).toLocaleString()} · ${x.marks} marks</div></div>
      <button class="btn btn-ghost btn-sm" data-id="${x.id}">Open</button></div>`).join('') : '<p class="empty">No sets yet.</p>'}</div>`;
  view.querySelectorAll('[data-id]').forEach((b) => b.onclick = () => {
    const x = history().find((y) => y.id === b.dataset.id);
    if (x?.plan) { savePlan(x.plan); location.hash = '#practice'; }
  });
}

function renderAbout() {
  view.innerHTML = `<div class="page-head"><h1>About ibgrind</h1></div>
    <div class="card">
      <p>ibgrind gives you original practice cases in the style of the IB Business Management exams: Paper 1 case studies, Paper 2 data questions and extended responses, and Paper 3 social enterprise cases for HL.</p>
      <p style="margin-top:10px">Every case and question is newly written for practice. They are not IB past papers and are not endorsed by the IB. Markschemes show how answers are likely to be marked, but they are a guide, not an official judgement.</p>
      <p style="margin-top:10px">Your answers are saved in this browser only. Use “Report a problem” if a question or markscheme looks wrong.</p>
    </div>`;
}

void route();
