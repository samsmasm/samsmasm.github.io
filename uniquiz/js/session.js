import { db } from './firebase.js';
import { initAuthOverlay } from './auth.js';
import {
  doc, onSnapshot, updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

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

// ── Firestore listener ──
function listen() {
  const ref = doc(db, 'sessions', pin);
  unsub = onSnapshot(ref, snap => {
    if (!snap.exists()) {
      alert('Session not found.');
      window.location.href = 'teacher.html';
      return;
    }
    session = snap.data();
    render(session);
  }, () => {
    alert('Lost connection to session.');
    window.location.href = 'teacher.html';
  });
}

// ── Render ──
function render(s) {
  const { questions, currentQuestionIndex: qi, showAnswer, responses } = s;
  const waiting = qi === -1;
  const ended   = qi === -2;
  const active  = qi >= 0;
  const q       = active ? questions[qi] : null;

  const rawCounts = active ? (responses[String(qi)] || {}) : {};
  const counts = {
    A: rawCounts.A || 0,
    B: rawCounts.B || 0,
    C: rawCounts.C || 0,
    D: rawCounts.D || 0
  };
  const total = counts.A + counts.B + counts.C + counts.D;

  // Progress text
  document.getElementById('sess-progress').textContent = waiting
    ? 'Waiting to start…'
    : ended ? 'Session ended'
    : `Question ${qi + 1} of ${questions.length}`;

  document.getElementById('resp-count').textContent = total;

  // Cards visibility
  set('waiting-card', waiting);
  set('q-card', active);
  set('ended-card', ended);

  // Question card content
  if (active && q) {
    document.getElementById('q-progress-lbl').textContent = `Q${qi + 1} / ${questions.length}`;
    document.getElementById('q-text').textContent = q.text;
    renderBars(counts, total, q.correctAnswer, showAnswer);
  }

  // Control buttons
  setHidden('start-btn',    !waiting);
  setHidden('show-ans-btn', !active || showAnswer);
  setHidden('next-btn',     !active || !showAnswer);

  // Present view
  renderPresent(s, q, counts, total);
}

function renderBars(counts, total, correct, showAnswer) {
  const container = document.getElementById('result-bars');
  const opts = ['A','B','C','D'];
  const colorClass = { A:'answer-a', B:'answer-b', C:'answer-c', D:'answer-d' };

  container.innerHTML = opts.map(opt => {
    const n = counts[opt];
    const pct = total > 0 ? Math.round(n / total * 100) : 0;
    const isCorrect = showAnswer && opt === correct;
    return `
      <div class="result-bar ${colorClass[opt]}">
        <div class="result-bar-row">
          <div class="result-bar-lbl">${opt}</div>
          <div class="result-bar-track">
            <div class="result-bar-fill" style="width:${pct}%">${pct > 12 ? pct + '%' : ''}</div>
          </div>
          <div class="result-bar-count">${n}</div>
          <div class="result-bar-tick">${isCorrect ? '✓' : ''}</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderPresent(s, q, counts, total) {
  const { questions, currentQuestionIndex: qi, showAnswer } = s;
  const waiting = qi === -1;

  if (waiting || !q) {
    document.getElementById('pv-question').textContent = 'Waiting for host to start…';
    const letters = ['a','b','c','d'];
    letters.forEach(l => {
      document.getElementById(`pv-text-${l}`).textContent = '';
      document.getElementById(`pv-cnt-${l}`).textContent = '0';
      document.getElementById(`pv-bar-${l}`).style.width = '0';
      document.getElementById(`pv-opt-${l}`).classList.remove('reveal-correct','reveal-dim');
    });
    document.getElementById('pv-progress').textContent = `PIN: ${pin}`;
    setHidden('pv-start-btn', false);
    setHidden('pv-show-btn',  true);
    setHidden('pv-next-btn',  true);
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
    `Q${qi + 1}/${questions.length} · PIN: ${pin} · ${total} response${total !== 1 ? 's' : ''}`;

  setHidden('pv-start-btn', true);
  setHidden('pv-show-btn',  showAnswer);
  setHidden('pv-next-btn',  !showAnswer);
}

// ── Actions ──
async function act(action) {
  if (!session) return;
  const { questions, currentQuestionIndex: qi } = session;
  const ref = doc(db, 'sessions', pin);

  if (action === 'start') {
    await updateDoc(ref, { currentQuestionIndex: 0 });
  } else if (action === 'show') {
    await updateDoc(ref, { showAnswer: true });
  } else if (action === 'next') {
    const next = qi + 1;
    await updateDoc(ref, next >= questions.length
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
  await updateDoc(doc(db, 'sessions', pin), { currentQuestionIndex: -2 });
  window.location.href = 'teacher.html';
});

// ── Fullscreen / Present ──
const presentView = document.getElementById('present-view');

document.getElementById('present-btn').addEventListener('click', () => {
  presentView.classList.add('active');
  document.documentElement.requestFullscreen?.().catch?.(() => {});
});

document.getElementById('pv-exit-btn').addEventListener('click', exitPresent);

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) exitPresent();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && presentView.classList.contains('active')) exitPresent();
});

function exitPresent() {
  presentView.classList.remove('active');
  if (document.fullscreenElement) document.exitFullscreen?.().catch?.(() => {});
}

// ── Helpers ──
function set(id, show) { document.getElementById(id).classList.toggle('hidden', !show); }
function setHidden(id, hidden) { document.getElementById(id).classList.toggle('hidden', hidden); }
