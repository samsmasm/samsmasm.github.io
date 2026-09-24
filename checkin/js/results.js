// Checkin - teacher view of one set: live controls, scores, and marking
// the written answers.

import {
  requireUser, qp, esc, fail, debounce, LETTERS,
  getClass, getSet, saveSet, getKey, syncKeyVisibility, listMembers,
  saveMarks, computeMarks, totalAwarded, maxScore, answeredCount, needsMarking,
  onSnapshot, collection, db, addShellLinks
} from './core.js?v=5b36f56-2014';

const classId = qp('c');
const setId = qp('s');

let me = null, cls = null, set = null, key = {}, members = [];
let responses = new Map();      // uid -> response
let view = 'scores';
let repaintQueued = false;

(async function start() {
  me = await requireUser();
  document.getElementById('back').href = 'teach.html?c=' + encodeURIComponent(classId);
  document.getElementById('edit-link').href = 'set.html?c=' + encodeURIComponent(classId) + '&s=' + setId;

  try {
    cls = await getClass(classId);
    if (cls.ownerUid !== me.uid) { location.replace('class.html?c=' + encodeURIComponent(classId)); return; }
    set = await getSet(classId, setId);
    key = await getKey(classId, setId);
    members = await listMembers(classId);
  } catch (err) { return fail('Loading the set', err); }

  document.title = (set.title || 'Responses') + ' - Checkin';
  document.getElementById('set-title').textContent = set.title || 'Untitled set';
  addShellLinks([
    { label: cls.name, href: 'teach.html?c=' + encodeURIComponent(classId), icon: 'stack' },
    { label: set.title || 'This set', icon: 'people',
      href: 'results.html?c=' + encodeURIComponent(classId) + '&s=' + setId,
      match: p => p === 'results.html' }
  ]);
  document.getElementById('set-sub').textContent = cls.name + ' · ' +
    (set.questions || []).length + ' questions · out of ' + maxScore(set);

  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
    view = tab.dataset.view;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
    paintBody();
  }));
  document.getElementById('export').addEventListener('click', exportCSV);

  watchResponses();
  paintControls();
})();

function qrLink(qid) {
  return 'qr.html?c=' + encodeURIComponent(classId) + '&s=' + encodeURIComponent(setId) +
    (qid ? '&q=' + encodeURIComponent(qid) : '');
}

/* ---------------- live response feed ---------------- */

function watchResponses() {
  onSnapshot(collection(db, 'classes', classId, 'sets', setId, 'responses'), snap => {
    responses = new Map(snap.docs.map(d => [d.id, { uid: d.id, ...d.data() }]));
    autoMark();
    paintControls();
    safePaint();
  }, err => fail('Watching responses', err));
}

// Repainting while the teacher is typing a mark would throw away what they typed,
// so hold off until the field loses focus.
function safePaint() {
  const active = document.activeElement;
  if (active && active.closest && active.closest('[data-mark-scope]')) {
    if (!repaintQueued) {
      repaintQueued = true;
      active.addEventListener('blur', () => { repaintQueued = false; paintBody(); }, { once: true });
    }
    return;
  }
  paintBody();
}

/* ---------------- multiple choice marks itself ---------------- */

// Firestore hands map fields back with their keys sorted, so comparing the two
// with JSON.stringify would report a difference every time and write forever.
function marksEqual(a, b) {
  const ids = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const id of ids) {
    const x = (a || {})[id] || {}, y = (b || {})[id] || {};
    for (const f of ['awarded', 'correct', 'comment']) {
      if (String(x[f] ?? '') !== String(y[f] ?? '')) return false;
    }
  }
  return true;
}

let autoMarkRunning = false;
async function autoMark() {
  if (autoMarkRunning) return;
  autoMarkRunning = true;
  try {
    for (const r of responses.values()) {
      const fresh = computeMarks(set, r, key);
      const score = totalAwarded(set, fresh);
      if (!marksEqual(r.marks, fresh) || r.score !== score) {
        r.marks = fresh;
        r.score = score;
        await saveMarks(classId, setId, r.uid, { marks: fresh, score, maxScore: maxScore(set) });
      }
    }
  } catch (err) {
    console.error('auto marking', err);
  }
  autoMarkRunning = false;
}

/* ---------------- controls ---------------- */

function paintControls() {
  const qs = set.questions || [];
  const answered = [...responses.values()].filter(r => answeredCount(set, r) > 0);
  const toMark = [...responses.values()].filter(r => needsMarking(set, r)).length;

  let live = '';
  if (set.mode === 'live') {
    const i = Number(set.liveIndex) || 0;
    const onThis = answered.filter(r => {
      const q = qs[i];
      const a = q && r.answers ? r.answers[q.id] : undefined;
      return a !== undefined && a !== null && String(a).trim() !== '';
    }).length;
    live =
      '<div class="row mt">' +
        '<span class="label" style="margin:0">Live</span>' +
        '<button data-act="prev"' + (i === 0 ? ' disabled' : '') + '>Previous question</button>' +
        '<span class="mono">' + (i + 1) + ' of ' + qs.length + '</span>' +
        '<button data-act="next" class="btn-go"' + (i >= qs.length - 1 ? ' disabled' : '') + '>Next question</button>' +
        '<span class="tiny">' + onThis + ' of ' + members.length + ' have answered this one</span>' +
      '</div>' +
      '<p class="tiny">Students see only the question you are on, and can look back at earlier ones.</p>';
  }

  document.getElementById('controls').innerHTML =
    '<div class="row">' +
      '<span class="label" style="margin:0">This set is ' +
        (set.status === 'open' ? 'open' : set.status === 'draft' ? 'a draft' : 'closed') + '</span>' +
      (set.status === 'open'
        ? '<button data-act="close">Close it</button>'
        : '<button data-act="open" class="btn-go">' + (set.status === 'draft' ? 'Open to the class' : 'Reopen') + '</button>') +
      (set.resultsReleased
        ? '<button data-act="hold" class="btn-on">Results released, hold them back</button>'
        : '<button data-act="release">Release results to students</button>') +
      '<a class="btn" target="_blank" href="' + qrLink() + '">Show QR code</a>' +
      // Practice only makes sense once results are out, because until then a
      // student's browser has no answer key and a retake could tell them nothing.
      (set.resultsReleased
        ? '<button data-act="retake" class="' + (set.allowRetake ? 'btn-on' : '') + '">' +
          (set.allowRetake ? 'Practice retakes on' : 'Allow practice retakes') + '</button>'
        : '') +
    '</div>' +
    '<p class="tiny">' +
      (set.reveal === 'now'
        ? 'Multiple choice marks itself in front of students as they answer. '
        : 'Students see nothing until you release results. ') +
      answered.length + ' of ' + members.length + ' students have answered something' +
      (toMark ? ', and ' + toMark + ' have written answers waiting for a mark' : '') + '.' +
      (set.allowRetake
        ? ' Students can redo this set for practice. Those runs are private to them, ' +
          'so they never reach you or change anything you have marked.'
        : '') +
    '</p>' +
    live;

  document.querySelectorAll('#controls [data-act]').forEach(btn =>
    btn.addEventListener('click', () => onControl(btn)));
}

async function onControl(btn) {
  const act = btn.dataset.act;
  btn.disabled = true;
  try {
    if (act === 'open') {
      const patch = { status: 'open', openedAt: new Date() };
      if (set.mode === 'live' && set.status === 'draft') patch.liveIndex = 0;
      Object.assign(set, patch);
      await saveSet(classId, setId, patch);
      await syncKeyVisibility(classId, set);
    } else if (act === 'close') {
      Object.assign(set, { status: 'closed', closedAt: new Date() });
      await saveSet(classId, setId, { status: 'closed', closedAt: new Date() });
    } else if (act === 'release') {
      await autoMark();
      set.resultsReleased = true;
      await saveSet(classId, setId, { resultsReleased: true });
      set.key = await syncKeyVisibility(classId, set);
    } else if (act === 'hold') {
      set.resultsReleased = false;
      set.allowRetake = false;
      await saveSet(classId, setId, { resultsReleased: false, allowRetake: false });
      await syncKeyVisibility(classId, set);
      delete set.key;
    } else if (act === 'retake') {
      set.allowRetake = !set.allowRetake;
      await saveSet(classId, setId, { allowRetake: set.allowRetake });
    } else if (act === 'next' || act === 'prev') {
      const i = Math.max(0, Math.min((set.questions || []).length - 1,
        (Number(set.liveIndex) || 0) + (act === 'next' ? 1 : -1)));
      set.liveIndex = i;
      await saveSet(classId, setId, { liveIndex: i });
    }
  } catch (err) { fail('Updating the set', err); }
  paintControls();
  paintBody();
}

/* ---------------- body: scores or answers ---------------- */

function paintBody() {
  if (view === 'scores') paintScores(); else paintAnswers();
}

function rosterRows() {
  // Everyone on the roll, plus anyone who answered and has since been removed.
  const rows = members.map(m => ({ ...m, response: responses.get(m.uid) || null }));
  const known = new Set(members.map(m => m.uid));
  for (const r of responses.values()) {
    if (!known.has(r.uid)) rows.push({ uid: r.uid, name: (r.name || 'Removed student') + ' (removed)', email: r.email || '', response: r });
  }
  return rows;
}

function paintScores() {
  const qs = set.questions || [];
  const rows = rosterRows();
  if (!rows.length) {
    document.getElementById('body').innerHTML = '<p class="tiny">Nobody has joined this class yet.</p>';
    return;
  }

  const head = '<tr><th>Student</th>' +
    qs.map((q, i) => '<th class="num" title="' + esc(q.prompt) + '">' +
      (i + 1) + (q.type === 'text' ? ' <span class="tiny">txt</span>' : '') + '</th>').join('') +
    '<th class="num">Total</th><th class="num">Out of</th></tr>';

  const body = rows.map(row => {
    const r = row.response;
    const marks = (r && r.marks) || {};
    const cells = qs.map(q => {
      const given = r && r.answers ? r.answers[q.id] : undefined;
      if (given === undefined || given === null || String(given).trim() === '') {
        return '<td class="num cell-none">.</td>';
      }
      const m = marks[q.id] || {};
      const full = Number(q.maxMark) || 1;
      const where = ' data-uid="' + row.uid + '" data-qid="' + q.id + '" data-max="' + full + '"';

      // Multiple choice marks itself, so the cell only reports. Hovering it
      // still shows which option they picked.
      if (q.type === 'mcq') {
        const known = m.correct !== undefined;
        const cls = !known ? 'cell-none' : m.correct ? 'cell-right' : 'cell-wrong';
        const label = !known ? '?' : full === 1 ? (m.correct ? 'right' : 'wrong') : (m.correct ? full : 0);
        return '<td class="num cell-peek ' + cls + '" tabindex="0"' + where + '>' + label + '</td>';
      }

      // Written answers are marked here, in the cell, without leaving the grid.
      const awarded = (m.awarded === undefined || m.awarded === null) ? '' : m.awarded;
      const cls = awarded === '' ? 'cell-todo' : Number(awarded) >= full ? 'cell-right'
        : Number(awarded) === 0 ? 'cell-wrong' : '';
      return '<td class="num cell-peek cell-mark ' + cls + '" data-mark-scope' + where + '>' +
        '<input type="number" data-gridmark min="0" max="' + full + '" step="0.5" ' +
          'aria-label="Mark out of ' + full + '" value="' + awarded + '">' +
        '</td>';
    }).join('');
    const total = r ? totalAwarded(set, marks) : 0;
    return '<tr><td>' + esc(row.name) +
      (r && needsMarking(set, r) ? ' <span class="state state-todo">to mark</span>' : '') +
      '</td>' + cells +
      '<td class="num"><b data-total="' + row.uid + '">' + (r ? total : '') + '</b></td>' +
      '<td class="num cell-none">' + maxScore(set) + '</td></tr>';
  }).join('');

  const perQuestion = qs.map((q, i) => {
    const attempts = rows.filter(row => {
      const a = row.response && row.response.answers ? row.response.answers[q.id] : undefined;
      return a !== undefined && a !== null && String(a).trim() !== '';
    });
    const right = attempts.filter(row => {
      const m = row.response.marks && row.response.marks[q.id];
      return m && Number(m.awarded) >= (Number(q.maxMark) || 1);
    }).length;
    return '<div class="index-row">' +
      '<span class="grow"><span class="index-desc"><b>' + (i + 1) + '.</b> ' + esc(q.prompt) + '</span></span>' +
      '<span class="index-meta">' + right + ' of ' + attempts.length + ' full marks</span>' +
      '<a class="btn btn-quiet" target="_blank" href="' + qrLink(q.id) + '">QR</a>' +
    '</div>';
  }).join('');

  document.getElementById('body').innerHTML =
    '<div class="scroller"><table><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
    '<p class="tiny mt">Hover or tap any answered cell to read what they put. ' +
    'Written answers can be marked straight into the grid, and save as you type. ' +
    'A dot means no answer, an empty box means a written answer still waiting on you.</p>' +
    '<p class="rule-label">Question by question</p>' + perQuestion;

  wireGrid();
}

function paintAnswers() {
  const qs = set.questions || [];
  const rows = rosterRows();
  if (!qs.length) {
    document.getElementById('body').innerHTML = '<p class="tiny">This set has no questions.</p>';
    return;
  }

  const html = qs.map((q, i) => {
    const model = key[q.id];
    const modelLine = model
      ? '<p class="tiny">' + (q.type === 'mcq'
          ? 'Correct answer: ' + esc(String(model).toUpperCase())
          : 'Model answer: ' + esc(model)) + '</p>'
      : '';

    const answers = rows.map(row => {
      const r = row.response;
      const given = r && r.answers ? r.answers[q.id] : undefined;
      const has = given !== undefined && given !== null && String(given).trim() !== '';
      if (!has) {
        return '<div class="index-row"><span class="grow"><span class="index-desc">' + esc(row.name) +
          '</span></span><span class="index-meta cell-none">no answer</span></div>';
      }
      const m = (r.marks && r.marks[q.id]) || {};
      const full = Number(q.maxMark) || 1;

      if (q.type === 'mcq') {
        const letter = String(given).toUpperCase();
        const n = LETTERS.indexOf(letter);
        const text = (q.options || [])[n] || '';
        const right = m.correct === true;
        return '<div class="index-row">' +
          '<span class="grow"><span class="index-desc">' + esc(row.name) + '</span></span>' +
          '<span class="grow ' + (m.correct === undefined ? '' : right ? 'cell-right' : 'cell-wrong') + '">' +
            esc(letter) + '. ' + esc(text) + '</span>' +
          '<span class="index-meta">' + (m.correct === undefined ? '' : right ? 'correct' : 'wrong') + '</span>' +
        '</div>';
      }

      const awarded = (m.awarded === undefined || m.awarded === null) ? '' : m.awarded;
      const marker = full === 1
        ? '<button data-set-mark="' + full + '" class="' + (awarded === full ? 'btn-on' : '') + '">Right</button>' +
          '<button data-set-mark="0" class="' + (awarded === 0 ? 'btn-warn' : '') + '">Wrong</button>'
        : '<input type="number" data-mark min="0" max="' + full + '" step="0.5" value="' + awarded + '">' +
          '<span class="tiny">of ' + full + '</span>' +
          '<button data-set-mark="' + full + '" class="btn-quiet">Full</button>' +
          '<button data-set-mark="0" class="btn-quiet">Zero</button>';

      return '<div class="qblock" data-mark-scope data-uid="' + row.uid + '" data-qid="' + q.id + '" data-max="' + full + '">' +
        '<div class="spread"><span class="label" style="margin:0">' + esc(row.name) + '</span>' +
          '<span class="tiny" data-note></span></div>' +
        '<div class="answer-given">' + esc(given) + '</div>' +
        '<div class="mark-row mt">' + marker +
          '<input type="text" data-comment placeholder="Comment for this student (optional)" value="' +
            esc(m.comment || '') + '">' +
        '</div>' +
      '</div>';
    }).join('');

    return '<div class="mt2">' +
      '<p class="rule-label" style="margin-top:0">Question ' + (i + 1) + ' &middot; ' +
        (q.type === 'mcq' ? 'multiple choice' : 'short text, out of ' + (Number(q.maxMark) || 1)) +
        ' &middot; <a target="_blank" href="' + qrLink(q.id) + '">QR code</a></p>' +
      '<p class="prompt prompt-small">' + esc(q.prompt) + '</p>' + modelLine + answers +
    '</div>';
  }).join('');

  document.getElementById('body').innerHTML = html;
  wireMarking();
}

function wireMarking() {
  const saveNow = async (scope, patchMark) => {
    const note = scope.querySelector('[data-note]');
    note.className = 'tiny';
    note.textContent = 'Saving.';
    try {
      await applyMark(scope.dataset.uid, scope.dataset.qid, patchMark);
      note.className = 'saved';
      note.textContent = 'Saved';
      paintControls();
    } catch (err) {
      note.className = 'savefail';
      note.textContent = 'Not saved';
      console.error(err);
    }
  };

  document.querySelectorAll('[data-mark-scope]').forEach(scope => {
    const max = Number(scope.dataset.max) || 1;

    const quickButtons = [...scope.querySelectorAll('[data-set-mark]')];
    quickButtons.forEach(btn =>
      btn.addEventListener('click', () => {
        const value = Number(btn.dataset.setMark);
        const numberInput = scope.querySelector('[data-mark]');
        if (numberInput) numberInput.value = value;
        if (max === 1) {
          // The two buttons are the whole answer, so show which one is chosen.
          quickButtons.forEach(b => { b.className = ''; });
          btn.className = value ? 'btn-on' : 'btn-warn';
        }
        saveNow(scope, { awarded: value, correct: value >= max });
      }));

    const numberInput = scope.querySelector('[data-mark]');
    if (numberInput) {
      const push = debounce(() => {
        let value = numberInput.value === '' ? '' : Number(numberInput.value);
        if (value !== '' && (!Number.isFinite(value) || value < 0)) value = 0;
        if (value !== '' && value > max) value = max;
        numberInput.value = value;
        saveNow(scope, { awarded: value, correct: value !== '' && value >= max });
      }, 500);
      numberInput.addEventListener('input', push);
    }

    const comment = scope.querySelector('[data-comment]');
    if (comment) {
      const push = debounce(() => saveNow(scope, { comment: comment.value.trim() }), 700);
      comment.addEventListener('input', push);
    }
  });
}

/* ---------------- marking, shared by the grid and the per-question view ---------------- */

// The one place a mark is written, so both views cannot drift apart.
async function applyMark(uid, qid, patch) {
  const r = responses.get(uid) || { uid, marks: {} };
  const marks = { ...(r.marks || {}) };
  marks[qid] = { ...(marks[qid] || {}), ...patch, auto: false };
  const blank = marks[qid].awarded === '' || marks[qid].awarded === null || marks[qid].awarded === undefined;
  if (blank) { delete marks[qid].awarded; delete marks[qid].correct; }
  r.marks = marks;
  responses.set(uid, r);
  const score = totalAwarded(set, marks);
  r.score = score;
  await saveMarks(classId, setId, uid, { marks, score, maxScore: maxScore(set) });
  return score;
}

/* ---------------- the hover panel that shows an answer ---------------- */

let peekBox = null;

function peekBody(cell) {
  const uid = cell.dataset.uid, qid = cell.dataset.qid;
  const r = responses.get(uid);
  const q = (set.questions || []).find(item => item.id === qid);
  if (!r || !q) return '';
  const given = (r.answers && r.answers[qid]) || '';
  const answer = q.type === 'mcq'
    ? (() => {
        const letter = String(given).toUpperCase();
        const text = (q.options || [])[LETTERS.indexOf(letter)] || '';
        return esc(letter) + '. ' + esc(text);
      })()
    : esc(given);
  const model = key[qid]
    ? '<p class="tiny mt">' + (q.type === 'mcq'
        ? 'Correct answer: ' + esc(String(key[qid]).toUpperCase())
        : 'Model answer: ' + esc(key[qid])) + '</p>'
    : '';
  return '<p class="label" style="margin-bottom:.35rem">' + esc(r.name || '') + '</p>' +
    '<p class="tiny" style="margin-bottom:.5rem">' + esc(q.prompt) + '</p>' +
    '<div class="peek-answer">' + answer + '</div>' + model;
}

function showPeek(cell) {
  const html = peekBody(cell);
  if (!html) return;
  if (!peekBox) {
    peekBox = document.createElement('div');
    peekBox.className = 'peek';
    document.body.appendChild(peekBox);
  }
  peekBox.innerHTML = html;
  peekBox.classList.add('on');

  const box = cell.getBoundingClientRect();
  const width = Math.min(360, window.innerWidth - 24);
  peekBox.style.width = width + 'px';
  peekBox.style.left = Math.max(12,
    Math.min(box.left + box.width / 2 - width / 2, window.innerWidth - width - 12)) + 'px';
  // Below the cell, unless that would run off the bottom.
  const below = box.bottom + 8;
  peekBox.style.top = below + 'px';
  if (below + peekBox.offsetHeight > window.innerHeight - 8) {
    peekBox.style.top = Math.max(8, box.top - peekBox.offsetHeight - 8) + 'px';
  }
}

function hidePeek() {
  if (peekBox) peekBox.classList.remove('on');
}

window.addEventListener('scroll', hidePeek, true);

/* ---------------- the grid ---------------- */

function wireGrid() {
  document.querySelectorAll('#body .cell-peek').forEach(cell => {
    cell.addEventListener('mouseenter', () => showPeek(cell));
    cell.addEventListener('mouseleave', hidePeek);
    cell.addEventListener('focusin', () => showPeek(cell));
    cell.addEventListener('focusout', hidePeek);
    // A tap has no hover, so tapping a cell reads it out and puts the cursor in
    // the mark box if there is one.
    cell.addEventListener('click', () => {
      const input = cell.querySelector('input');
      if (input) input.focus(); else showPeek(cell);
    });
  });

  document.querySelectorAll('#body [data-gridmark]').forEach(input => {
    const cell = input.closest('[data-uid]');
    const max = Number(cell.dataset.max) || 1;
    const push = debounce(async () => {
      let value = input.value === '' ? '' : Number(input.value);
      if (value !== '' && (!Number.isFinite(value) || value < 0)) value = 0;
      if (value !== '' && value > max) value = max;
      if (value !== '') input.value = value;
      try {
        const score = await applyMark(cell.dataset.uid, cell.dataset.qid, {
          awarded: value, correct: value !== '' && value >= max
        });
        const total = document.querySelector('[data-total="' + cell.dataset.uid + '"]');
        if (total) total.textContent = score;
        cell.classList.remove('cell-right', 'cell-wrong', 'cell-todo');
        cell.classList.add(value === '' ? 'cell-todo' : value >= max ? 'cell-right'
          : value === 0 ? 'cell-wrong' : 'cell-part');
        cell.classList.add('cell-saved');
        setTimeout(() => cell.classList.remove('cell-saved'), 900);
        paintControls();
      } catch (err) {
        fail('Saving a mark', err);
      }
    }, 500);
    input.addEventListener('input', push);
  });
}

/* ---------------- export ---------------- */

function exportCSV() {
  const qs = set.questions || [];
  const quote = c => '"' + String(c ?? '').replace(/"/g, '""') + '"';
  const head = ['Student', 'Email'];
  qs.forEach((q, i) => {
    head.push('Q' + (i + 1) + ' answer');
    head.push('Q' + (i + 1) + ' mark (of ' + (Number(q.maxMark) || 1) + ')');
  });
  head.push('Total', 'Out of');

  const lines = [head.map(quote).join(',')];
  for (const row of rosterRows()) {
    const r = row.response;
    const cells = [row.name, row.email];
    qs.forEach(q => {
      const given = r && r.answers ? r.answers[q.id] : '';
      const m = (r && r.marks && r.marks[q.id]) || {};
      cells.push(given ?? '');
      cells.push(m.awarded === undefined || m.awarded === null ? '' : m.awarded);
    });
    cells.push(r ? totalAwarded(set, (r.marks || {})) : '');
    cells.push(maxScore(set));
    lines.push(cells.map(quote).join(','));
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (set.title || 'responses').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
