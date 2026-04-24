import { db } from './firebase.js';
import {
  doc, getDoc, onSnapshot, runTransaction, increment
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const params = new URLSearchParams(window.location.search);
const pin = params.get('pin');
if (!pin) { window.location.href = 'index.html'; }

document.getElementById('hdr-pin').textContent = `PIN: ${pin}`;

// Persistent student ID across page loads in the same browser
let studentId = localStorage.getItem('uq_sid');
if (!studentId) {
  studentId = crypto.randomUUID();
  localStorage.setItem('uq_sid', studentId);
}

// Local answer memory (question index → option) — re-populated from Firestore on load
let myAnswers = {};

const STATES = ['loading','notfound','waiting','question','ended'];

function show(id) {
  STATES.forEach(s => {
    const el = document.getElementById(`s-${s}`);
    if (el) el.style.display = s === id ? 'flex' : 'none';
  });
}

async function init() {
  // Re-hydrate answer history so students can't double-submit after a reload
  try {
    const ansSnap = await getDoc(doc(db, 'sessions', pin, 'studentAnswers', studentId));
    if (ansSnap.exists()) {
      myAnswers = { ...ansSnap.data() };
    }
  } catch {
    // Non-fatal — we'll just start with empty answers; transaction will catch duplicates
  }

  const sessionRef = doc(db, 'sessions', pin);

  const unsubscribe = onSnapshot(sessionRef, snap => {
    if (!snap.exists()) { show('notfound'); return; }

    const s = snap.data();
    const { questions, currentQuestionIndex: qi, showAnswer } = s;

    if (qi === -2)  { show('ended'); unsubscribe(); return; }
    if (qi === -1)  { document.getElementById('w-title').textContent = s.title || ''; show('waiting'); return; }

    // Active question
    const q = questions[qi];
    if (!q) return;

    document.getElementById('q-text').textContent = q.text;
    renderButtons(q, qi, showAnswer);
    renderStatus(q, qi, showAnswer);
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
        if (opt.id === q.correctAnswer)          extra = 'correct';
        else if (opt.id === myAns)               extra = 'wrong-sel dimmed';
        else                                     extra = 'dimmed';
      } else {
        extra = opt.id === myAns ? 'selected' : 'dimmed';
      }
    }

    return `
      <button
        class="answer-btn ${colorClass[opt.id]} ${extra}"
        data-opt="${opt.id}"
        ${submitted ? 'disabled' : ''}
      >
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

  if (myAns === undefined) {
    el.textContent = '';
    return;
  }

  if (!showAnswer) {
    el.textContent = 'Answer submitted — waiting for host…';
    return;
  }

  if (myAns === q.correctAnswer) {
    el.textContent = '✓ Correct!';
    el.className = 'play-status bold text-success';
  } else {
    el.textContent = `✗ The correct answer was ${q.correctAnswer}`;
    el.className = 'play-status bold text-danger';
  }
}

async function submit(option, q, qi) {
  const sessionRef  = doc(db, 'sessions', pin);
  const answerRef   = doc(db, 'sessions', pin, 'studentAnswers', studentId);

  // Optimistic UI: lock buttons immediately
  myAnswers[qi] = option;
  renderButtons(q, qi, false);
  document.getElementById('play-status').textContent = 'Submitting…';

  try {
    await runTransaction(db, async tx => {
      const snap = await tx.get(answerRef);
      if (snap.exists() && snap.data()[qi] !== undefined) {
        throw new Error('already-answered');
      }
      tx.set(answerRef,  { [qi]: option }, { merge: true });
      tx.update(sessionRef, { [`responses.${qi}.${option}`]: increment(1) });
    });

    document.getElementById('play-status').textContent = 'Answer submitted — waiting for host…';
  } catch (err) {
    if (err.message !== 'already-answered') {
      // Transaction failed — roll back optimistic state
      delete myAnswers[qi];
      document.getElementById('play-status').textContent = 'Submit failed — please tap again.';
      document.getElementById('play-status').className = 'play-status text-danger';
      // Re-enable buttons by re-rendering
      const sessionSnap = await getDoc(sessionRef).catch(() => null);
      if (sessionSnap?.exists()) {
        const s = sessionSnap.data();
        renderButtons(s.questions[qi], qi, s.showAnswer);
      }
    }
    // If already-answered: answers already populated from init() re-hydration, UI is correct
  }
}

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Start
show('loading');
init();
