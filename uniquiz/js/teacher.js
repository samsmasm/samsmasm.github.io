import { db } from './firebase.js';
import { initAuthOverlay, teacherLogout } from './auth.js';
import {
  collection, getDocs, doc, deleteDoc, setDoc, getDoc,
  query, orderBy, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

document.getElementById('logout-btn').addEventListener('click', teacherLogout);

initAuthOverlay(async () => {
  document.getElementById('main-content').classList.remove('hidden');
  await loadQuizzes();
});

async function loadQuizzes() {
  const listEl = document.getElementById('quiz-list');
  const emptyEl = document.getElementById('no-quizzes');

  try {
    const snap = await getDocs(query(collection(db, 'quizzes'), orderBy('createdAt', 'desc')));
    const now = Date.now();
    const quizzes = [];

    snap.forEach(d => {
      const data = d.data();
      if (data.deleteAfter && data.deleteAfter.toMillis() < now) return;
      quizzes.push({ id: d.id, ...data });
    });

    listEl.innerHTML = '';

    if (quizzes.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }

    emptyEl.classList.add('hidden');
    quizzes.forEach(q => listEl.appendChild(buildQuizCard(q)));
  } catch (err) {
    listEl.innerHTML = `<p class="msg msg-error">Failed to load quizzes: ${esc(err.message)}</p>`;
  }
}

function buildQuizCard(quiz) {
  const el = document.createElement('div');
  el.className = 'quiz-card';

  const created = quiz.createdAt
    ? new Date(quiz.createdAt.toMillis()).toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' })
    : '';
  const expiry = quiz.deleteAfter
    ? `Auto-deletes ${new Date(quiz.deleteAfter.toMillis()).toLocaleDateString(undefined, { day:'numeric', month:'short' })}`
    : 'Kept forever';

  el.innerHTML = `
    <div class="quiz-info">
      <div class="quiz-title">${esc(quiz.title)}</div>
      <div class="quiz-meta">${quiz.questions.length} question${quiz.questions.length !== 1 ? 's' : ''} · ${created} · ${expiry}</div>
    </div>
    <div class="quiz-actions">
      <button class="btn btn-success btn-sm js-start">▶ Start</button>
      <button class="btn btn-danger btn-sm js-delete">Delete</button>
    </div>
  `;

  el.querySelector('.js-start').addEventListener('click', () => startSession(quiz, el.querySelector('.js-start')));
  el.querySelector('.js-delete').addEventListener('click', () => deleteQuiz(quiz.id, el));
  return el;
}

async function startSession(quiz, btn) {
  btn.disabled = true;
  btn.textContent = 'Starting…';
  try {
    const pin = await generatePin();
    await setDoc(doc(db, 'sessions', pin), {
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
    const snap = await getDoc(doc(db, 'sessions', pin));
    if (!snap.exists()) return pin;
  }
}

async function deleteQuiz(id, el) {
  if (!confirm('Delete this quiz? This cannot be undone.')) return;
  await deleteDoc(doc(db, 'quizzes', id));
  el.remove();
  if (!document.querySelector('#quiz-list .quiz-card')) {
    document.getElementById('no-quizzes').classList.remove('hidden');
  }
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
