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

const presentView = document.getElementById('present-view');

let session = null;
let unsub   = null;
let timerInterval      = null;
let currentTimerEndsAt = null;
let revealInProgress   = false;
let prevQi             = null;
let prevShowRankings   = false;
let pvRankAnimating    = false;

// ── Audio ──
const questionAudio = new Audio('questions.mp3');
questionAudio.loop = true;
const rankingsAudio = new Audio('rankings.mp3');
rankingsAudio.loop = true;
let _audioState = 'none';

function fadeIn(audio, ms = 1000) {
  audio.volume = 0;
  audio.currentTime = 0;
  audio.play().catch(() => {});
  const t0 = Date.now();
  const id = setInterval(() => {
    const p = Math.min(1, (Date.now() - t0) / ms);
    audio.volume = p;
    if (p >= 1) clearInterval(id);
  }, 30);
}

function fadeOut(audio, ms = 1000) {
  const v0 = audio.volume;
  const t0 = Date.now();
  const id = setInterval(() => {
    const p = Math.min(1, (Date.now() - t0) / ms);
    audio.volume = Math.max(0, v0 * (1 - p));
    if (p >= 1) { clearInterval(id); audio.pause(); audio.volume = 1; }
  }, 30);
}

function setAudio(state) {
  if (state === _audioState) return;
  if (_audioState === 'question') fadeOut(questionAudio);
  else if (_audioState === 'rankings') fadeOut(rankingsAudio);
  _audioState = state;
  if (state === 'question') fadeIn(questionAudio);
  else if (state === 'rankings') fadeIn(rankingsAudio);
}

// ── Present view ──
function enterPresent() {
  presentView.classList.add('active');
  const el = presentView;
  (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.())?.catch?.(() => {});
}

function exitPresent() {
  presentView.classList.remove('active');
  if (document.fullscreenElement) document.exitFullscreen?.().catch?.(() => {});
}

// ── Auth ──
initAuthOverlay(() => {
  document.getElementById('main-content').classList.remove('hidden');
  listen();
  enterPresent(); // auto-show present overlay; fullscreen needs a user click
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
  const questions    = toArr(s.questions);
  const qi           = s.currentQuestionIndex;
  const showAnswer   = s.showAnswer;
  const showRankings = s.showRankings;
  const responses    = s.responses || {};
  const waiting      = qi === -1;
  const ended        = qi === -2;
  const active       = qi >= 0;
  const q            = active ? normaliseQuestion(questions[qi]) : null;

  if (qi !== prevQi) {
    prevQi = qi;
    revealInProgress = false;
    prevShowRankings = false;
    pvRankAnimating  = false;
  }

  const rankingsJustAppeared = showRankings && !prevShowRankings;
  prevShowRankings = showRankings;

  const raw    = active ? (responses[qi] || {}) : {};
  const counts = { A: raw.A||0, B: raw.B||0, C: raw.C||0, D: raw.D||0 };
  const total  = counts.A + counts.B + counts.C + counts.D;

  document.getElementById('sess-progress').textContent = waiting
    ? 'Waiting to start…'
    : ended ? 'Session ended'
    : `Question ${qi + 1} of ${questions.length}`;

  document.getElementById('resp-count').textContent = total;

  hide('waiting-card',  !waiting);
  hide('q-card',        !active || showRankings);
  hide('rankings-card', !active || !showRankings);
  hide('ended-card',    !ended);

  if (active && q) {
    document.getElementById('q-progress-lbl').textContent = `Q${qi + 1} / ${questions.length}`;
    document.getElementById('q-text').textContent = q.text;
    if (!showRankings) renderBars(counts, total, q.correctAnswer, showAnswer);
  }

  if (active && showRankings) {
    renderRankings(s.scores || {});
    renderAnswerChart(
      document.getElementById('rankings-chart'),
      responses[qi] || {},
      q?.correctAnswer
    );
  }

  // Timer
  if (active && s.timerEndsAt && !showAnswer) {
    ensureTimerRunning(s.timerEndsAt);
  } else {
    stopTimer();
  }

  // Auto-reveal when all students have answered
  const studentCount = Object.keys(s.students || {}).length;
  if (active && !showAnswer && studentCount > 0 && total >= studentCount && !revealInProgress) {
    revealInProgress = true;
    reveal();
  }

  setH('start-btn',    !waiting);
  setH('show-ans-btn', !active || showAnswer);
  setH('next-btn',     !active || !showAnswer);

  // Audio
  if (active && !showAnswer) {
    setAudio('question');
  } else if (active && showRankings) {
    setAudio('rankings');
  } else {
    setAudio('none');
  }

  // Trigger rankings animation once when rankings first appear
  if (rankingsJustAppeared) {
    animatePvRankings(s.scores || {}, responses[qi] || {}, q?.correctAnswer);
  }

  renderPresent(s, questions, q, counts, total);
}

function renderBars(counts, total, correct, showAnswer) {
  const container  = document.getElementById('result-bars');
  const colorClass = { A:'answer-a', B:'answer-b', C:'answer-c', D:'answer-d' };

  container.innerHTML = ['A','B','C','D'].map(opt => {
    const n   = counts[opt];
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

function renderRankings(scores) {
  const sorted = Object.entries(scores).sort(([,a],[,b]) => b.total - a.total);
  document.getElementById('rankings-list').innerHTML = sorted.slice(0, 10).map(([, s], i) => `
    <div class="rank-item">
      <div class="rank-pos">${i + 1}</div>
      <div class="rank-name">${esc(s.name)}</div>
      <div class="rank-score">${s.total}</div>
      ${s.lastPoints > 0 ? `<div class="rank-delta">+${s.lastPoints}</div>` : '<div class="rank-delta"></div>'}
    </div>
  `).join('');
}

function renderAnswerChart(container, responses, correctAnswer) {
  if (!container) return;
  const counts = { A: responses.A||0, B: responses.B||0, C: responses.C||0, D: responses.D||0 };
  const total  = counts.A + counts.B + counts.C + counts.D;
  const clr    = { A: 'var(--a)', B: 'var(--b)', C: 'var(--c)', D: 'var(--d)' };

  container.innerHTML = ['A','B','C','D'].map(opt => {
    const n   = counts[opt];
    const pct = total > 0 ? Math.round(n / total * 100) : 0;
    const ok  = opt === correctAnswer;
    return `
      <div class="ans-chart-row${ok ? ' ans-chart-correct' : ''}">
        <div class="ans-chart-lbl">${opt}${ok ? ' ✓' : ''}</div>
        <div class="ans-chart-track">
          <div class="ans-chart-fill" style="width:${pct}%;background:${clr[opt]}"></div>
        </div>
        <div class="ans-chart-count">${n}</div>
      </div>
    `;
  }).join('');
}

function renderPresent(s, questions, q, counts, total) {
  const qi           = s.currentQuestionIndex;
  const showAnswer   = s.showAnswer;
  const showRankings = s.showRankings;
  const waiting      = qi === -1;

  if (waiting || !q) {
    document.getElementById('pv-question').textContent = 'Waiting for host to start…';
    ['a','b','c','d'].forEach(l => {
      document.getElementById(`pv-text-${l}`).textContent = '';
      document.getElementById(`pv-cnt-${l}`).textContent  = '';
      document.getElementById(`pv-bar-${l}`).style.width  = '0';
      document.getElementById(`pv-opt-${l}`).classList.remove('reveal-correct','reveal-dim');
    });
    document.getElementById('pv-progress').textContent = `PIN: ${pin}`;
    setH('pv-start-btn', false);
    setH('pv-show-btn',  true);
    setH('pv-next-btn',  true);
    if (!pvRankAnimating) document.getElementById('pv-rankings').classList.remove('active');
    return;
  }

  document.getElementById('pv-question').textContent = q.text;

  const letterMap = ['a','b','c','d'];
  q.options.forEach((opt, i) => {
    const l   = letterMap[i];
    const n   = counts[opt.id] || 0;
    const pct = total > 0 ? (n / total * 100).toFixed(1) : 0;
    document.getElementById(`pv-text-${l}`).textContent = opt.text;
    // Hide live counts and bars until answer is revealed
    document.getElementById(`pv-cnt-${l}`).textContent  = showAnswer ? n : '';
    document.getElementById(`pv-bar-${l}`).style.width  = showAnswer ? `${pct}%` : '0';

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
  setH('pv-show-btn',  !!showAnswer);
  setH('pv-next-btn',  !showAnswer);

  // Rankings overlay: don't touch DOM during animation
  if (!pvRankAnimating) {
    document.getElementById('pv-rankings').classList.toggle('active', !!showRankings);
    if (showRankings) renderPvRankingsList(document.getElementById('pv-rank-list'), s.scores || {}, true);
  }
}

// ── Present view rankings ──
function renderPvRankings(scores) {
  renderPvRankingsList(document.getElementById('pv-rank-list'), scores, true);
}

function renderPvRankingsList(container, scores, showDeltas) {
  const sorted = Object.entries(scores).sort(([,a],[,b]) => b.total - a.total);
  container.innerHTML = sorted.slice(0, 5).map(([sid, s], i) => `
    <div class="pv-rank-item" data-sid="${esc(sid)}">
      <div class="pv-rank-pos">${i + 1}</div>
      <div class="pv-rank-name">${esc(s.name)}</div>
      <div class="pv-rank-score">${s.total}</div>
      ${showDeltas && s.lastPoints > 0 ? `<div class="pv-rank-delta">+${s.lastPoints}</div>` : ''}
    </div>
  `).join('');
}

async function animatePvRankings(scores, responses, correctAnswer) {
  pvRankAnimating = true;
  const pvRankings = document.getElementById('pv-rankings');
  const list       = document.getElementById('pv-rank-list');
  const chartEl    = document.getElementById('pv-chart');

  // Phase 1: show old rankings (scores before this round)
  const oldScores = {};
  Object.entries(scores).forEach(([sid, s]) => {
    oldScores[sid] = { ...s, total: s.total - (s.lastPoints || 0), lastPoints: 0 };
  });
  renderPvRankingsList(list, oldScores, false);
  renderAnswerChart(chartEl, responses, correctAnswer);
  pvRankings.classList.add('active');

  // Hold old state for 2s so teacher/students can see where they were
  await new Promise(r => setTimeout(r, 2000));

  // FLIP animation: First — record positions of existing items
  const oldItems = Array.from(list.children);
  const oldRects = new Map();
  oldItems.forEach(el => oldRects.set(el.dataset.sid, el.getBoundingClientRect()));

  // Last — re-render in new order with score deltas
  renderPvRankingsList(list, scores, true);

  // Invert — shift items back to where they visually were
  const newItems = Array.from(list.children);
  newItems.forEach(el => {
    const oldRect = oldRects.get(el.dataset.sid);
    el.style.transition = 'none';
    if (oldRect) {
      const newRect = el.getBoundingClientRect();
      el.style.transform = `translateY(${oldRect.top - newRect.top}px)`;
      el.style.opacity = '1';
    } else {
      el.style.transform = 'translateY(24px)';
      el.style.opacity = '0';
    }
  });

  list.offsetHeight; // force reflow before animating

  // Play — animate to final positions
  newItems.forEach(el => {
    el.style.transition = 'transform 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.45s';
    el.style.transform  = '';
    el.style.opacity    = '1';
  });

  await new Promise(r => setTimeout(r, 700));
  pvRankAnimating = false;
}

// ── Timer ──
function ensureTimerRunning(timerEndsAt) {
  if (timerEndsAt === currentTimerEndsAt && timerInterval) return;
  stopTimer();
  currentTimerEndsAt = timerEndsAt;
  updateTimerDisplays(Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000)));
  timerInterval = setInterval(() => {
    const remaining = Math.ceil((timerEndsAt - Date.now()) / 1000);
    updateTimerDisplays(Math.max(0, remaining));
    if (Date.now() >= timerEndsAt && session && !session.showAnswer && !revealInProgress) {
      revealInProgress = true;
      stopTimer();
      reveal();
    }
  }, 500);
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  currentTimerEndsAt = null;
  updateTimerDisplays(null);
}

function updateTimerDisplays(secs) {
  const timerCard    = document.getElementById('timer-card');
  const timerDisplay = document.getElementById('timer-display');
  const pvTimer      = document.getElementById('pv-timer');

  if (secs === null) {
    timerCard?.classList.add('hidden');
    pvTimer?.classList.add('hidden');
    return;
  }

  const urgent = secs <= 5;
  timerCard?.classList.remove('hidden');
  if (timerDisplay) {
    timerDisplay.textContent = secs;
    timerDisplay.className   = 'timer-display' + (urgent ? ' urgent' : '');
  }
  if (pvTimer) {
    pvTimer.textContent = secs;
    pvTimer.classList.remove('hidden');
    pvTimer.className = 'pv-timer' + (urgent ? ' urgent' : '');
  }
}

// ── Reveal + scoring ──
async function reveal() {
  try {
    await update(ref(db, `uq/sessions/${pin}`), { showAnswer: true });
    await calculateAndWriteScores();
  } catch (err) {
    console.error('reveal failed', err);
    revealInProgress = false;
  }
}

async function calculateAndWriteScores() {
  if (!session) return;
  const questions = toArr(session.questions);
  const qi        = session.currentQuestionIndex;
  if (qi < 0) return;
  const q = normaliseQuestion(questions[qi]);
  if (!q) return;

  const studentAnswers = session.studentAnswers || {};
  const updates = {};

  Object.entries(studentAnswers).forEach(([sid, answers]) => {
    const entry = answers[qi];
    if (entry === undefined || entry === null) return;
    const answer     = typeof entry === 'object' ? entry.answer    : entry;
    const answeredAt = typeof entry === 'object' ? entry.answeredAt : null;
    const name       = session.students?.[sid]?.name || 'Player';
    const existing   = session.scores?.[sid] || { total: 0 };

    let lastPoints = 0;
    if (answer === q.correctAnswer) {
      if (session.questionStartedAt && answeredAt) {
        const elapsed     = Math.max(0, answeredAt - session.questionStartedAt);
        const timeWindow  = session.timerEndsAt
          ? (session.timerEndsAt - session.questionStartedAt)
          : 30000;
        lastPoints = Math.round(Math.max(500, 1000 - 500 * elapsed / timeWindow));
      } else {
        lastPoints = 1000;
      }
    }

    updates[`scores/${sid}`] = { name, total: (existing.total || 0) + lastPoints, lastPoints };
  });

  if (Object.keys(updates).length) {
    await update(ref(db, `uq/sessions/${pin}`), updates);
  }
}

// ── Actions ──
async function act(action) {
  if (!session) return;
  const questions = toArr(session.questions);
  const qi        = session.currentQuestionIndex;
  const tl        = session.timeLimit || 0;
  const now       = Date.now();
  const sessRef   = ref(db, `uq/sessions/${pin}`);

  if (action === 'start') {
    await update(sessRef, {
      currentQuestionIndex: 0,
      showRankings: false,
      questionStartedAt: now,
      timerEndsAt: tl > 0 ? now + tl * 1000 : null
    });
  } else if (action === 'show') {
    await reveal();
  } else if (action === 'rankings') {
    await update(sessRef, { showRankings: true });
  } else if (action === 'next') {
    if (session.showAnswer && !session.showRankings) {
      await update(sessRef, { showRankings: true });
      return;
    }
    const next = qi + 1;
    if (next >= questions.length) {
      await update(sessRef, { currentQuestionIndex: -2 });
    } else {
      await update(sessRef, {
        currentQuestionIndex: next,
        showAnswer: false,
        showRankings: false,
        questionStartedAt: now,
        timerEndsAt: tl > 0 ? now + tl * 1000 : null
      });
    }
  }
}

document.getElementById('start-btn').addEventListener('click',    () => act('start'));
document.getElementById('show-ans-btn').addEventListener('click',  () => act('show'));
document.getElementById('next-btn').addEventListener('click',      () => act('next'));
document.getElementById('pv-start-btn').addEventListener('click',  () => act('start'));
document.getElementById('pv-show-btn').addEventListener('click',   () => act('show'));
document.getElementById('pv-next-btn').addEventListener('click',   () => act('next'));

document.getElementById('end-btn').addEventListener('click', async () => {
  if (!confirm('End this session for all students?')) return;
  if (unsub) unsub();
  stopTimer();
  await update(ref(db, `uq/sessions/${pin}`), { currentQuestionIndex: -2 });
  window.location.href = 'teacher.html';
});

document.getElementById('present-btn').addEventListener('click', enterPresent);
document.getElementById('pv-fullscreen-btn').addEventListener('click', () => {
  const el = document.documentElement;
  (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.())?.catch?.(() => {});
});
document.getElementById('pv-exit-btn').addEventListener('click', exitPresent);
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) exitPresent(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && presentView.classList.contains('active')) exitPresent(); });

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

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
