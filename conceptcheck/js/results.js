// Concept Check - teacher view of one set: live controls, scores, and marking
// the written answers.

import {
  requireUser, qp, esc, fail, debounce, LETTERS,
  getClass, getSet, saveSet, getKey, syncKeyVisibility, listMembers,
  saveMarks, computeMarks, totalAwarded, maxScore, answeredCount, needsMarking,
  onSnapshot, collection, db
} from './core.js';

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

  document.title = (set.title || 'Responses') + ' - Concept Check';
  document.getElementById('set-title').textContent = set.title || 'Untitled set';
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
    '</div>' +
    '<p class="tiny">' +
      (set.reveal === 'now'
        ? 'Multiple choice marks itself in front of students as they answer. '
        : 'Students see nothing until you release results. ') +
      answered.length + ' of ' + members.length + ' students have answered something' +
      (toMark ? ', and ' + toMark + ' have written answers waiting for a mark' : '') + '.' +
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
      await saveSet(classId, setId, { resultsReleased: false });
      await syncKeyVisibility(classId, set);
      delete set.key;
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
      const m = marks[q.id];
      if (!m || m.awarded === undefined || m.awarded === null || m.awarded === '') {
        return '<td class="num cell-none" title="not marked yet">?</td>';
      }
      const full = Number(q.maxMark) || 1;
      const got = Number(m.awarded) || 0;
      const cls = got >= full ? 'cell-right' : got === 0 ? 'cell-wrong' : '';
      return '<td class="num ' + cls + '">' + (full === 1 ? (got >= 1 ? 'right' : 'wrong') : got) + '</td>';
    }).join('');
    const total = r ? totalAwarded(set, marks) : 0;
    return '<tr><td>' + esc(row.name) +
      (r && needsMarking(set, r) ? ' <span class="state state-todo">to mark</span>' : '') +
      '</td>' + cells +
      '<td class="num"><b>' + (r ? total : '') + '</b></td>' +
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
    '</div>';
  }).join('');

  document.getElementById('body').innerHTML =
    '<div class="scroller"><table><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
    '<p class="tiny mt">A dot means no answer. A question mark means a written answer still needs a mark from you.</p>' +
    '<p class="rule-label">Question by question</p>' + perQuestion;
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
        (q.type === 'mcq' ? 'multiple choice' : 'short text, out of ' + (Number(q.maxMark) || 1)) + '</p>' +
      '<p class="prompt prompt-small">' + esc(q.prompt) + '</p>' + modelLine + answers +
    '</div>';
  }).join('');

  document.getElementById('body').innerHTML = html;
  wireMarking();
}

function wireMarking() {
  const saveNow = async (scope, patchMark) => {
    const uid = scope.dataset.uid;
    const qid = scope.dataset.qid;
    const note = scope.querySelector('[data-note]');
    const r = responses.get(uid) || { uid, marks: {} };
    const marks = { ...(r.marks || {}) };
    marks[qid] = { ...(marks[qid] || {}), ...patchMark, auto: false };
    if (marks[qid].awarded === '' || marks[qid].awarded === null) delete marks[qid].awarded;
    r.marks = marks;
    responses.set(uid, r);
    const score = totalAwarded(set, marks);
    r.score = score;
    note.className = 'tiny';
    note.textContent = 'Saving.';
    try {
      await saveMarks(classId, setId, uid, { marks, score, maxScore: maxScore(set) });
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
