import { db } from './firebase.js';
import {
  ref, get, set, onValue, runTransaction
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

const params = new URLSearchParams(window.location.search);
const pin = params.get('pin');
if (!pin) { window.location.href = 'index.html'; }

document.getElementById('hdr-pin').textContent = `PIN: ${pin}`;

let studentId = localStorage.getItem('uq_sid');
if (!studentId) {
  studentId = crypto.randomUUID();
  localStorage.setItem('uq_sid', studentId);
}

let playerName         = '';
let myAnswers          = {};
let playerTimerInterval = null;
let nameEntrySetup     = false;

const STATES = ['loading','notfound','waiting','question','rankings','ended'];

function show(id) {
  STATES.forEach(s => {
    const el = document.getElementById(`s-${s}`);
    if (el) el.style.display = s === id ? 'flex' : 'none';
  });
}

// ── Name entry ──
function setupNameEntry() {
  const stored = localStorage.getItem('uq_name') || '';
  if (stored) document.getElementById('player-name').value = stored;

  document.getElementById('name-submit').addEventListener('click', submitName);
  document.getElementById('player-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') submitName();
  });
}

function submitName() {
  const name = document.getElementById('player-name').value.trim();
  if (!name) return;
  playerName = name;
  localStorage.setItem('uq_name', name);
  document.getElementById('name-form').style.display = 'none';
  document.getElementById('name-set').style.display  = 'flex';
  document.getElementById('name-display').textContent = `Playing as: ${name}`;
  registerStudent(name);
}

async function registerStudent(name) {
  try {
    await set(ref(db, `uq/sessions/${pin}/students/${studentId}`), { name, joinedAt: Date.now() });
  } catch { /* non-fatal */ }
}

// ── Init ──
async function init() {
  try {
    const ansSnap = await get(ref(db, `uq/sessions/${pin}/studentAnswers/${studentId}`));
    if (ansSnap.exists()) {
      const raw = ansSnap.val();
      Object.entries(raw).forEach(([k, v]) => {
        myAnswers[Number(k)] = typeof v === 'object' ? v.answer : v;
      });
    }
  } catch { /* non-fatal */ }

  const unsubscribe = onValue(ref(db, `uq/sessions/${pin}`), snap => {
    if (!snap.exists()) { show('notfound'); return; }

    const s         = snap.val();
    const questions = toArr(s.questions);
    const qi        = s.currentQuestionIndex;

    if (qi === -2) { show('ended'); unsubscribe(); return; }

    if (qi === -1) {
      document.getElementById('w-title').textContent = s.title || '';
      if (!nameEntrySetup) {
        nameEntrySetup = true;
        setupNameEntry();
      }
      show('waiting');
      return;
    }

    // Active question — show rankings if host triggered them
    if (s.showRankings) {
      stopPlayerTimer();
      renderPlayerRankings(s.scores || {});
      show('rankings');
      return;
    }

    const q = normaliseQuestion(questions[qi]);
    if (!q) return;

    // Timer
    if (s.timerEndsAt && !s.showAnswer) {
      startPlayerTimer(s.timerEndsAt);
    } else {
      stopPlayerTimer();
    }

    document.getElementById('q-text').textContent = q.text;
    renderButtons(q, qi, s.showAnswer);
    renderStatus(q, qi, s.showAnswer);
    show('question');

  }, () => show('notfound'));
}

// ── Timer (player side) ──
function startPlayerTimer(timerEndsAt) {
  if (playerTimerInterval) clearInterval(playerTimerInterval);
  const timerEl = document.getElementById('play-timer');
  if (!timerEl) return;

  function tick() {
    const secs = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
    timerEl.textContent = secs + 's';
    timerEl.className   = 'timer-display text-center' + (secs <= 5 ? ' urgent' : '');
    timerEl.classList.remove('hidden');
    if (secs <= 0) { clearInterval(playerTimerInterval); playerTimerInterval = null; }
  }
  tick();
  playerTimerInterval = setInterval(tick, 200);
}

function stopPlayerTimer() {
  if (playerTimerInterval) { clearInterval(playerTimerInterval); playerTimerInterval = null; }
  document.getElementById('play-timer')?.classList.add('hidden');
}

// ── Rankings (player view) ──
function renderPlayerRankings(scores) {
  const sorted  = Object.entries(scores).sort(([,a],[,b]) => b.total - a.total);
  const myIdx   = sorted.findIndex(([sid]) => sid === studentId);
  const myRank  = myIdx + 1;
  const myScore = scores[studentId];

  document.getElementById('my-rank-pos').textContent   = myRank ? `#${myRank}` : '—';
  document.getElementById('my-rank-score').textContent = myScore ? `${myScore.total} pts` : '0 pts';
  document.getElementById('my-rank-delta').textContent = myScore?.lastPoints > 0
    ? `+${myScore.lastPoints} this round` : '';

  document.getElementById('rankings-list-player').innerHTML = sorted.slice(0, 10).map(([sid, s], i) => `
    <div class="rank-item ${sid === studentId ? 'rank-item-me' : ''}">
      <div class="rank-pos">${i + 1}</div>
      <div class="rank-name">${esc(s.name)}</div>
      <div class="rank-score">${s.total}</div>
      ${s.lastPoints > 0 ? `<div class="rank-delta">+${s.lastPoints}</div>` : '<div class="rank-delta"></div>'}
    </div>
  `).join('');
}

// ── Answer buttons ──
function renderButtons(q, qi, showAnswer) {
  const container  = document.getElementById('ans-grid');
  const myAns      = myAnswers[qi];
  const submitted  = myAns !== undefined;
  const colorClass = { A:'answer-a', B:'answer-b', C:'answer-c', D:'answer-d' };

  container.innerHTML = q.options.map(opt => {
    let extra = '';
    if (submitted) {
      if (showAnswer) {
        if (opt.id === q.correctAnswer)  extra = 'correct';
        else if (opt.id === myAns)       extra = 'wrong-sel dimmed';
        else                             extra = 'dimmed';
      } else {
        extra = opt.id === myAns ? 'selected' : 'dimmed';
      }
    }
    return `
      <button class="answer-btn ${colorClass[opt.id]} ${extra}"
              data-opt="${opt.id}" ${submitted ? 'disabled' : ''}>
        <span class="opt-lbl">${opt.id}</span>
        <span>${esc(opt.text)}</span>
      </button>
    `;
  }).join('');

  if (!submitted) {
    container.querySelectorAll('.answer-btn').forEach(btn => {
      btn.addEventListener('click', () => submit(btn.dataset.opt, q, qi));
    });
  }
}

function renderStatus(q, qi, showAnswer) {
  const el    = document.getElementById('play-status');
  const myAns = myAnswers[qi];
  el.className = 'play-status';

  if (myAns === undefined)  { el.textContent = ''; return; }
  if (!showAnswer)          { el.textContent = 'Answer submitted — waiting for host…'; return; }

  if (myAns === q.correctAnswer) {
    el.textContent = '✓ Correct!';
    el.className   = 'play-status bold text-success';
  } else {
    el.textContent = `✗ The correct answer was ${q.correctAnswer}`;
    el.className   = 'play-status bold text-danger';
  }
}

async function submit(option, q, qi) {
  myAnswers[qi] = option;
  renderButtons(q, qi, false);
  document.getElementById('play-status').textContent = 'Submitting…';

  try {
    const answerRef = ref(db, `uq/sessions/${pin}/studentAnswers/${studentId}/${qi}`);
    const result = await runTransaction(answerRef, current => {
      if (current !== null) return; // abort — already answered
      return { answer: option, answeredAt: Date.now() };
    });

    if (!result.committed) throw new Error('already-answered');

    const countRef = ref(db, `uq/sessions/${pin}/responses/${qi}/${option}`);
    await runTransaction(countRef, current => (current ?? 0) + 1);

    document.getElementById('play-status').textContent = 'Answer submitted — waiting for host…';
  } catch (err) {
    if (err.message !== 'already-answered') {
      delete myAnswers[qi];
      document.getElementById('play-status').textContent = 'Submit failed — please tap again.';
      document.getElementById('play-status').className   = 'play-status text-danger';
      renderButtons(q, qi, false);
    }
  }
}

function toArr(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return Object.keys(val).sort((a, b) => Number(a) - Number(b)).map(k => val[k]);
}

function normaliseQuestion(q) {
  if (!q) return null;
  return { ...q, options: toArr(q.options) };
}

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

show('loading');
init();
