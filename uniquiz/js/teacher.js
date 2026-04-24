import { db } from './firebase.js';
import { initAuthOverlay, teacherLogout } from './auth.js';
import {
  ref, get, set, remove, push, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

document.getElementById('logout-btn').addEventListener('click', teacherLogout);

initAuthOverlay(async () => {
  document.getElementById('main-content').classList.remove('hidden');
  await loadQuizzes();
});

async function loadQuizzes() {
  const listEl  = document.getElementById('quiz-list');
  const emptyEl = document.getElementById('no-quizzes');

  try {
    const snap = await get(ref(db, 'uq/quizzes'));
    const now = Date.now();
    const quizzes = [];

    if (snap.exists()) {
      snap.forEach(child => {
        const data = child.val();
        if (data.deleteAfter && data.deleteAfter < now) return;
        quizzes.push({ id: child.key, ...data });
      });
    }

    quizzes.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    listEl.innerHTML = '';

    if (quizzes.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }

    emptyEl.classList.add('hidden');
    quizzes.forEach(q => listEl.appendChild(buildCard(q)));
  } catch (err) {
    listEl.innerHTML = `<p class="msg msg-error">Failed to load quizzes: ${esc(err.message)}</p>`;
  }
}

function buildCard(quiz) {
  const questions = toArr(quiz.questions);
  const el = document.createElement('div');
  el.className = 'quiz-card';

  const created = quiz.createdAt
    ? new Date(quiz.createdAt).toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' })
    : '';
  const expiry = quiz.deleteAfter
    ? `Auto-deletes ${new Date(quiz.deleteAfter).toLocaleDateString(undefined, { day:'numeric', month:'short' })}`
    : 'Kept forever';

  el.innerHTML = `
    <div class="quiz-info">
      <div class="quiz-title">${esc(quiz.title)}</div>
      <div class="quiz-meta">${questions.length} question${questions.length !== 1 ? 's' : ''} · ${created} · ${expiry}</div>
    </div>
    <div class="quiz-actions">
      <button class="btn btn-success btn-sm js-start">▶ Start</button>
      <button class="btn btn-danger btn-sm js-delete">Delete</button>
    </div>
  `;

  el.querySelector('.js-start').addEventListener('click', e => startSession(quiz, e.target));
  el.querySelector('.js-delete').addEventListener('click', () => deleteQuiz(quiz.id, el));
  return el;
}

async function startSession(quiz, btn) {
  btn.disabled = true;
  btn.textContent = 'Starting…';
  try {
    const pin = await generatePin();
    await set(ref(db, `uq/sessions/${pin}`), {
      quizId: quiz.id,
      title: quiz.title,
      questions: quiz.questions,
      currentQuestionIndex: -1,
      showAnswer: false,
      responses: {},
      startedAt: serverTimestamp()
    });
    window.location.href = `session.html?pin=${pin}`;
  } catch (err) {
    alert('Failed to start session: ' + err.message);
    btn.disabled = false;
    btn.textContent = '▶ Start';
  }
}

async function generatePin() {
  for (;;) {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const snap = await get(ref(db, `uq/sessions/${pin}`));
    if (!snap.exists()) return pin;
  }
}

async function deleteQuiz(id, el) {
  if (!confirm('Delete this quiz? This cannot be undone.')) return;
  await remove(ref(db, `uq/quizzes/${id}`));
  el.remove();
  if (!document.querySelector('#quiz-list .quiz-card')) {
    document.getElementById('no-quizzes').classList.remove('hidden');
  }
}

// Firebase RTDB stores arrays as objects with numeric string keys.
// This converts them back to arrays.
function toArr(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return Object.keys(val).sort((a, b) => Number(a) - Number(b)).map(k => val[k]);
}

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
