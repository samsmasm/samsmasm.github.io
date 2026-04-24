import { db } from './firebase.js';
import { initAuthOverlay } from './auth.js';
import {
  ref, onValue, update
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

const params = new URLSearchParams(window.location.search);
const pin = params.get('pin');
if (!pin) { window.location.href = 'teacher.html'; }

document.getElementById('pin-display').textContent = pin;
document.getElementById('pv-progress').textContent = `PIN: ${pin}`;

let session = null;
let unsub = null;

// ── Auth ──
initAuthOverlay(() => {
  document.getElementById('main-content').classList.remove('hidden');
  listen();
});

// ── Realtime listener ──
function listen() {
  unsub = onValue(ref(db, `uq/sessions/${pin}`), snap => {
    if (!snap.exists()) {
      alert('Session not found.');
      window.location.href = 'teacher.html';
      return;
    }
    session = snap.val();
    render(session);
  }, () => {
    alert('Lost connection to session.');
    window.location.href = 'teacher.html';
  });
}

// ── Render ──
function render(s) {
  const questions = toArr(s.questions);
  const qi        = s.currentQuestionIndex;
  const showAnswer = s.showAnswer;
  const responses  = s.responses || {};
  const waiting    = qi === -1;
  const ended      = qi === -2;
  const active     = qi >= 0;
  const q          = active ? normaliseQuestion(questions[qi]) : null;

  const raw = active ? (responses[qi] || {}) : {};
  const counts = { A: raw.A||0, B: raw.B||0, C: raw.C||0, D: raw.D||0 };
  const total  = counts.A + counts.B + counts.C + counts.D;

  document.getElementById('sess-progress').textContent = waiting
    ? 'Waiting to start…'
    : ended ? 'Session ended'
    : `Question ${qi + 1} of ${questions.length}`;

  document.getElementById('resp-count').textContent = total;

  hide('waiting-card', !waiting);
  hide('q-card',       !active);
  hide('ended-card',   !ended);

  if (active && q) {
    document.getElementById('q-progress-lbl').textContent = `Q${qi + 1} / ${questions.length}`;
    document.getElementById('q-text').textContent = q.text;
    renderBars(counts, total, q.correctAnswer, showAnswer);
  }

  setH('start-btn',    !waiting);
  setH('show-ans-btn', !active || showAnswer);
  setH('next-btn',     !active || !showAnswer);

  renderPresent(s, questions, q, counts, total);
}

function renderBars(counts, total, correct, showAnswer) {
  const container = document.getElementById('result-bars');
  const colorClass = { A:'answer-a', B:'answer-b', C:'answer-c', D:'answer-d' };

  container.innerHTML = ['A','B','C','D'].map(opt => {
    const n = counts[opt];
    const pct = total > 0 ? Math.round(n / total * 100) : 0;
    const tick = showAnswer && opt === correct ? '✓' : '';
    return `
      <div class="result-bar ${colorClass[opt]}">
        <div class="result-bar-row">
          <div class="result-bar-lbl">${opt}</div>
          <div class="result-bar-track">
            <div class="result-bar-fill" style="width:${pct}%">${pct > 12 ? pct+'%' : ''}</div>
          </div>
          <div class="result-bar-count">${n}</div>
          <div class="result-bar-tick">${tick}</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderPresent(s, questions, q, counts, total) {
  const qi         = s.currentQuestionIndex;
  const showAnswer = s.showAnswer;
  const waiting    = qi === -1;

  if (waiting || !q) {
    document.getElementById('pv-question').textContent = 'Waiting for host to start…';
    ['a','b','c','d'].forEach(l => {
      document.getElementById(`pv-text-${l}`).textContent = '';
      document.getElementById(`pv-cnt-${l}`).textContent = '0';
      document.getElementById(`pv-bar-${l}`).style.width = '0';
      document.getElementById(`pv-opt-${l}`).classList.remove('reveal-correct','reveal-dim');
    });
    document.getElementById('pv-progress').textContent = `PIN: ${pin}`;
    setH('pv-start-btn', false);
    setH('pv-show-btn',  true);
    setH('pv-next-btn',  true);
    return;
  }

  document.getElementById('pv-question').textContent = q.text;

  const letterMap = ['a','b','c','d'];
  q.options.forEach((opt, i) => {
    const l = letterMap[i];
    const n = counts[opt.id] || 0;
    const pct = total > 0 ? (n / total * 100).toFixed(1) : 0;
    document.getElementById(`pv-text-${l}`).textContent = opt.text;
    document.getElementById(`pv-cnt-${l}`).textContent = n;
    document.getElementById(`pv-bar-${l}`).style.width = `${pct}%`;

    const optEl = document.getElementById(`pv-opt-${l}`);
    if (showAnswer) {
      optEl.classList.toggle('reveal-correct', opt.id === q.correctAnswer);
      optEl.classList.toggle('reveal-dim',     opt.id !== q.correctAnswer);
    } else {
      optEl.classList.remove('reveal-correct','reveal-dim');
    }
  });

  document.getElementById('pv-progress').textContent =
    `Q${qi+1}/${questions.length} · PIN: ${pin} · ${total} response${total !== 1 ? 's' : ''}`;

  setH('pv-start-btn', true);
  setH('pv-show-btn',  showAnswer);
  setH('pv-next-btn',  !showAnswer);
}

// ── Actions ──
async function act(action) {
  if (!session) return;
  const questions = toArr(session.questions);
  const qi = session.currentQuestionIndex;
  const sessRef = ref(db, `uq/sessions/${pin}`);

  if (action === 'start') {
    await update(sessRef, { currentQuestionIndex: 0 });
  } else if (action === 'show') {
    await update(sessRef, { showAnswer: true });
  } else if (action === 'next') {
    const next = qi + 1;
    await update(sessRef, next >= questions.length
      ? { currentQuestionIndex: -2 }
      : { currentQuestionIndex: next, showAnswer: false }
    );
  }
}

document.getElementById('start-btn').addEventListener('click',    () => act('start'));
document.getElementById('show-ans-btn').addEventListener('click', () => act('show'));
document.getElementById('next-btn').addEventListener('click',     () => act('next'));
document.getElementById('pv-start-btn').addEventListener('click', () => act('start'));
document.getElementById('pv-show-btn').addEventListener('click',  () => act('show'));
document.getElementById('pv-next-btn').addEventListener('click',  () => act('next'));

document.getElementById('end-btn').addEventListener('click', async () => {
  if (!confirm('End this session for all students?')) return;
  if (unsub) unsub();
  await update(ref(db, `uq/sessions/${pin}`), { currentQuestionIndex: -2 });
  window.location.href = 'teacher.html';
});

// ── Fullscreen ──
const presentView = document.getElementById('present-view');

document.getElementById('present-btn').addEventListener('click', () => {
  presentView.classList.add('active');
  document.documentElement.requestFullscreen?.().catch?.(() => {});
});

document.getElementById('pv-exit-btn').addEventListener('click', exitPresent);
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) exitPresent(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && presentView.classList.contains('active')) exitPresent(); });

function exitPresent() {
  presentView.classList.remove('active');
  if (document.fullscreenElement) document.exitFullscreen?.().catch?.(() => {});
}

// ── Helpers ──
function hide(id, hidden)  { document.getElementById(id).classList.toggle('hidden', hidden); }
function setH(id, hidden)  { document.getElementById(id).classList.toggle('hidden', hidden); }

function toArr(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return Object.keys(val).sort((a, b) => Number(a) - Number(b)).map(k => val[k]);
}

function normaliseQuestion(q) {
  if (!q) return null;
  return { ...q, options: toArr(q.options) };
}
