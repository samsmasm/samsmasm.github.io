// Checkin - the student's question view, shared by the class page and the
// single set page. One question at a time, large, with dots to move between them.

import { esc, debounce, saveAnswer, markFinished, LETTERS, studentsMaySeeKey } from './core.js';

function isAnswered(v) {
  return v !== undefined && v !== null && String(v).trim() !== '';
}

function firstUnanswered(set, answers) {
  const qs = set.questions || [];
  const i = qs.findIndex(q => !isAnswered(answers[q.id]));
  return i === -1 ? 0 : i;
}

export function mountSet({ el, classId, user, set, key, response, onChange, focusQid }) {
  let answers = { ...((response && response.answers) || {}) };
  let marks = { ...((response && response.marks) || {}) };
  let submitted = !!(response && response.submittedAt);
  const focusIndex = focusQid
    ? (set.questions || []).findIndex(q => q.id === focusQid)
    : -1;
  const focused = focusIndex >= 0;
  let idx = focused
    ? focusIndex
    : (set.mode === 'live' ? (Number(set.liveIndex) || 0) : firstUnanswered(set, answers));
  let lastLive = Number(set.liveIndex) || 0;
  const savers = {};

  function editable() {
    return set.status === 'open';
  }

  function visibleLimit() {
    // In live mode a student can look back, but not ahead of the teacher. A QR
    // code is the teacher pointing at one question, so it ignores that limit.
    if (focused) return (set.questions || []).length - 1;
    return set.mode === 'live'
      ? Math.min(Number(set.liveIndex) || 0, (set.questions || []).length - 1)
      : (set.questions || []).length - 1;
  }

  function markFor(q) {
    return marks[q.id];
  }

  function feedbackFor(q, showKey) {
    const m = showKey ? markFor(q) : null;
    const bits = [];
    if (m && m.awarded !== undefined && m.awarded !== null && m.awarded !== '') {
      bits.push('<b>' + esc(String(m.awarded)) + ' out of ' + (Number(q.maxMark) || 1) + '</b>');
    } else if (m && m.correct !== undefined) {
      bits.push('<b>' + (m.correct ? 'Correct' : 'Not right') + '</b>');
    }
    if (showKey && set.key[q.id]) {
      bits.push(q.type === 'mcq'
        ? 'Correct answer: ' + esc(String(set.key[q.id]).toUpperCase())
        : 'Model answer: ' + esc(set.key[q.id]));
    }
    if (m && m.comment) bits.push(esc(m.comment));
    return bits.length ? '<p class="feedback">' + bits.join(' &middot; ') + '</p>' : '';
  }

  function render() {
    const qs = set.questions || [];
    if (!qs.length) {
      el.innerHTML = '<p class="tiny">This set has no questions yet.</p>';
      return;
    }
    const limit = visibleLimit();
    if (focused) idx = focusIndex;
    else if (idx > limit) idx = Math.max(0, limit);
    const q = qs[idx];
    const given = answers[q.id];
    // The answer is only shown once they have committed to one, or once the set
    // is shut, so an instant-marking set does not hand out the answer up front.
    const showKey = studentsMaySeeKey(set) && set.key &&
      (isAnswered(given) || set.status !== 'open');
    const keyLetter = showKey && q.type === 'mcq' ? String(set.key[q.id] || '').toUpperCase() : '';

    const kicker = (set.mode === 'live' ? 'Live' : 'Question') + ' ' + (idx + 1) + ' of ' + qs.length +
      (set.status === 'closed' ? ' &middot; this set is closed' : '') +
      ((Number(q.maxMark) || 1) > 1 ? ' &middot; ' + q.maxMark + ' marks' : '');

    let body;
    if (q.type === 'mcq') {
      body = '<div class="choices">' + (q.options || []).map((opt, n) => {
        const letter = LETTERS[n];
        const picked = String(given || '').toUpperCase() === letter;
        let cls = 'choice';
        if (keyLetter) {
          if (letter === keyLetter) cls += ' right';
          else if (picked) cls += ' wrong';
        } else if (picked) cls += ' picked';
        return '<button class="' + cls + '" data-letter="' + letter + '"' +
          (editable() ? '' : ' disabled') + '>' +
          '<span class="choice-letter">' + letter + '</span>' +
          '<span>' + esc(opt) + '</span></button>';
      }).join('') + '</div>';
    } else if (editable()) {
      body = '<textarea data-answer rows="5" placeholder="Type your answer">' + esc(given || '') + '</textarea>' +
        '<p class="tiny" data-savenote>Saves as you type. You can change it until the set closes.</p>';
    } else {
      body = isAnswered(given)
        ? '<div class="answer-given">' + esc(given) + '</div>'
        : '<p class="tiny">You did not answer this one.</p>';
    }

    const dots = focused ? '' : qs.map((item, n) =>
      '<button class="dot' + (isAnswered(answers[item.id]) ? ' done' : '') + (n === idx ? ' here' : '') + '"' +
        (n > limit ? ' disabled' : '') + ' data-go="' + n + '" title="Question ' + (n + 1) + '">' + (n + 1) + '</button>'
    ).join('');

    const nav = focused
      ? '<p class="tiny mt">This link is just for this question. ' +
        '<a href="answer.html?c=' + encodeURIComponent(classId) + '&s=' + set.id + '">' +
        'See the whole set</a></p>'
      : '<div class="row mt">' +
        '<button data-step="-1"' + (idx === 0 ? ' disabled' : '') + '>Back</button>' +
        '<button data-step="1"' + (idx >= limit ? ' disabled' : '') + ' class="btn-go">Next question</button>' +
        (set.mode === 'live' && idx >= limit && set.status === 'open'
          ? '<span class="tiny">Waiting for your teacher to move on.</span>' : '') +
        '</div>';

    const answeredAll = qs.every(item => isAnswered(answers[item.id]));
    const finish = (!focused && set.mode !== 'live' && editable())
      ? '<div class="row mt">' +
          (submitted
            ? '<span class="saved">Handed in. You can still change your answers until the set closes.</span>'
            : '<button data-finish class="' + (answeredAll ? 'btn-go' : 'btn-quiet') + '">' +
              (answeredAll ? 'Hand in' : 'Hand in anyway') + '</button>' +
              '<span class="tiny">' + qs.filter(item => isAnswered(answers[item.id])).length +
              ' of ' + qs.length + ' answered</span>') +
        '</div>'
      : '';

    el.innerHTML =
      '<div class="now">' +
        '<div class="now-kicker">' + kicker + '</div>' +
        '<p class="prompt">' + esc(q.prompt) + '</p>' +
        body +
        feedbackFor(q, showKey) +
        nav +
        (dots ? '<div class="dots">' + dots + '</div>' : '') +
        finish +
      '</div>';

    wire(q);
  }

  function wire(q) {
    el.querySelectorAll('[data-letter]').forEach(btn =>
      btn.addEventListener('click', () => choose(q, btn.dataset.letter)));

    const area = el.querySelector('[data-answer]');
    if (area) {
      if (!savers[q.id]) {
        savers[q.id] = debounce(async value => {
          const note = el.querySelector('[data-savenote]');
          try {
            await saveAnswer(classId, set.id, user, q.id, value);
            if (note) { note.className = 'saved'; note.textContent = 'Saved.'; }
            if (onChange) onChange();
          } catch (err) {
            console.error(err);
            if (note) { note.className = 'savefail'; note.textContent = 'Could not save. Check your connection.'; }
          }
        }, 700);
      }
      area.addEventListener('input', () => {
        answers[q.id] = area.value;
        const note = el.querySelector('[data-savenote]');
        if (note) { note.className = 'tiny'; note.textContent = 'Saving.'; }
        savers[q.id](area.value);
      });
    }

    el.querySelectorAll('[data-go]').forEach(btn =>
      btn.addEventListener('click', () => { idx = Number(btn.dataset.go); render(); }));
    el.querySelectorAll('[data-step]').forEach(btn =>
      btn.addEventListener('click', () => {
        idx = Math.max(0, Math.min(visibleLimit(), idx + Number(btn.dataset.step)));
        render();
      }));

    const hand = el.querySelector('[data-finish]');
    if (hand) hand.addEventListener('click', async () => {
      hand.disabled = true;
      try {
        await markFinished(classId, set.id, user);
        submitted = true;
        render();
        if (onChange) onChange();
      } catch (err) { console.error(err); hand.disabled = false; }
    });
  }

  async function choose(q, letter) {
    if (!editable()) return;
    answers[q.id] = letter;
    render();
    try {
      await saveAnswer(classId, set.id, user, q.id, letter);
      if (onChange) onChange();
    } catch (err) {
      console.error(err);
      delete answers[q.id];
      render();
    }
  }

  render();

  return {
    // Called when the set document changes, which is how live mode advances.
    update(nextSet) {
      const signature = s => [s.status, s.liveIndex, s.resultsReleased, s.reveal,
        !!s.key, (s.questions || []).length].join('|');
      if (signature(nextSet) === signature(set)) return;
      const wasLive = lastLive;
      set = nextSet;
      lastLive = Number(set.liveIndex) || 0;
      if (!focused && set.mode === 'live' && lastLive !== wasLive) idx = lastLive;
      render();
    },
    refresh(nextResponse) {
      marks = { ...((nextResponse && nextResponse.marks) || {}) };
      answers = { ...((nextResponse && nextResponse.answers) || {}) };
      submitted = !!(nextResponse && nextResponse.submittedAt);
      render();
    }
  };
}
