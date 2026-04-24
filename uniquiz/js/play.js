import { db } from './firebase.js';
import {
  ref, get, onValue, runTransaction
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

let myAnswers = {};

const STATES = ['loading','notfound','waiting','question','ended'];

function show(id) {
  STATES.forEach(s => {
    const el = document.getElementById(`s-${s}`);
    if (el) el.style.display = s === id ? 'flex' : 'none';
  });
}

async function init() {
  // Re-hydrate answers from previous page load so the lock state is restored
  try {
    const ansSnap = await get(ref(db, `uq/sessions/${pin}/studentAnswers/${studentId}`));
    if (ansSnap.exists()) {
      const raw = ansSnap.val();
      // RTDB stores numeric-keyed objects; convert keys to numbers to match qi
      Object.entries(raw).forEach(([k, v]) => { myAnswers[Number(k)] = v; });
    }
  } catch {
    // Non-fatal — transaction will prevent duplicates on submit
  }

  const unsubscribe = onValue(ref(db, `uq/sessions/${pin}`), snap => {
    if (!snap.exists()) { show('notfound'); return; }

    const s = snap.val();
    const questions = toArr(s.questions);
    const qi = s.currentQuestionIndex;

    if (qi === -2) { show('ended'); unsubscribe(); return; }
    if (qi === -1) { document.getElementById('w-title').textContent = s.title || ''; show('waiting'); return; }

    const q = normaliseQuestion(questions[qi]);
    if (!q) return;

    document.getElementById('q-text').textContent = q.text;
    renderButtons(q, qi, s.showAnswer);
    renderStatus(q, qi, s.showAnswer);
    show('question');

  }, () => show('notfound'));
}

function renderButtons(q, qi, showAnswer) {
  const container = document.getElementById('ans-grid');
  const myAns = myAnswers[qi];
  const submitted = myAns !== undefined;
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
  const el = document.getElementById('play-status');
  const myAns = myAnswers[qi];
  el.className = 'play-status';

  if (myAns === undefined)  { el.textContent = ''; return; }
  if (!showAnswer)          { el.textContent = 'Answer submitted — waiting for host…'; return; }

  if (myAns === q.correctAnswer) {
    el.textContent = '✓ Correct!';
    el.className = 'play-status bold text-success';
  } else {
    el.textContent = `✗ The correct answer was ${q.correctAnswer}`;
    el.className = 'play-status bold text-danger';
  }
}

async function submit(option, q, qi) {
  // Optimistic lock
  myAnswers[qi] = option;
  renderButtons(q, qi, false);
  document.getElementById('play-status').textContent = 'Submitting…';

  try {
    // Step 1: atomically claim the answer slot (aborts if already answered)
    const answerRef = ref(db, `uq/sessions/${pin}/studentAnswers/${studentId}/${qi}`);
    const result = await runTransaction(answerRef, current => {
      if (current !== null) return; // abort
      return option;
    });

    if (!result.committed) {
      throw new Error('already-answered');
    }

    // Step 2: increment response count
    const countRef = ref(db, `uq/sessions/${pin}/responses/${qi}/${option}`);
    await runTransaction(countRef, current => (current ?? 0) + 1);

    document.getElementById('play-status').textContent = 'Answer submitted — waiting for host…';
  } catch (err) {
    if (err.message !== 'already-answered') {
      delete myAnswers[qi];
      document.getElementById('play-status').textContent = 'Submit failed — please tap again.';
      document.getElementById('play-status').className = 'play-status text-danger';
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

// Also update index.js to use RTDB path
show('loading');
init();
