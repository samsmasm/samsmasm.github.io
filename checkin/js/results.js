// Checkin - teacher view of one set: live controls, scores, and marking
// the written answers.

import { loadClassHistory, sparkline } from './history.js?v=290b6c8-1909';
import { wireMarkInput } from './marking.js?v=290b6c8-1909';
import {
  requireUser, qp, esc, fail, debounce, LETTERS,
  getClass, getSet, saveSet, getKey, syncKeyVisibility, listMembers, isOneOff,
  saveOneMark, clearOneMark, computeMarks, totalAwarded, maxScore, answeredCount, needsMarking,
  onSnapshot, collection, db, addShellLinks
} from './core.js?v=290b6c8-1909';

const classId = qp('c');
const setId = qp('s');

let me = null, cls = null, set = null, key = {}, members = [];
let responses = new Map();      // uid -> response
let view = 'scores';
let repaintQueued = false;
let trendByStudent = null;   // filled in after the page is already usable

(async function start() {
  me = await requireUser();
  document.getElementById('back').href = 'teach.html?c=' + encodeURIComponent(classId);
  // Fixed up once the container is known: a one off test has no class page.
  document.getElementById('edit-link').href = 'set.html?c=' + encodeURIComponent(classId) + '&s=' + setId;

  try {
    cls = await getClass(classId);
    if (cls.ownerUid !== me.uid) { location.replace('class.html?c=' + encodeURIComponent(classId)); return; }
    set = await getSet(classId, setId);
    key = await getKey(classId, setId);
    // A one off test has no roll. Whoever turns up and types a name is the roll,
    // so it is built from the responses instead.
    members = isOneOff(cls) ? [] : await listMembers(classId);
  } catch (err) { return fail('Loading the set', err); }

  document.title = (set.title || 'Responses') + ' - Checkin';
  document.getElementById('set-title').textContent = set.title || 'Untitled set';
  const home = isOneOff(cls)
    ? 'check.html?k=' + encodeURIComponent(classId)
    : 'teach.html?c=' + encodeURIComponent(classId);
  document.getElementById('back').href = home;
  addShellLinks([
    { label: cls.name, href: home, icon: isOneOff(cls) ? 'clock' : 'stack' },
    { label: (isOneOff(cls) ? set.runLabel : set.title) || 'This set', icon: 'people',
      href: 'results.html?c=' + encodeURIComponent(classId) + '&s=' + setId,
      match: p => p === 'results.html' }
  ], isOneOff(cls) ? 'This one off' : 'This class');
  document.getElementById('set-sub').textContent = [
    cls.name,
    isOneOff(cls) ? (set.runLabel || 'a run') : null,
    (set.questions || []).length + ' questions',
    'out of ' + maxScore(set)
  ].filter(Boolean).join(' · ');

  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
    view = tab.dataset.view;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
    paintBody();
  }));
  document.getElementById('export').addEventListener('click', exportCSV);

  watchResponses();
  paintControls();

  // The rest of the class history is only needed for the little trend lines, so
  // it loads after the page is up rather than holding it back.
  loadClassHistory(classId)
    .then(history => { trendByStudent = history.byStudent; paintBody(); })
    .catch(err => console.error('trend history', err));
})();

function studentLink(uid) {
  return 'student.html?c=' + encodeURIComponent(classId) + '&u=' + encodeURIComponent(uid);
}

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

// Repainting while a mark is being typed would throw away what was typed, so a
// repaint is owed rather than done. Tabbing from one mark box to the next must
// not trigger it either: the rebuild would destroy the box being tabbed into and
// focus would vanish mid-run. So it waits until focus leaves marking altogether.
function marking() {
  const active = document.activeElement;
  return !!(active && active.closest && active.closest('[data-mark-scope]'));
}

function safePaint() {
  if (marking()) { repaintQueued = true; return; }
  repaintQueued = false;
  paintBody();
}

document.addEventListener('focusout', () => {
  // Let focus land on whatever comes next before deciding.
  setTimeout(() => { if (repaintQueued && !marking()) safePaint(); }, 0);
});

/* ---------------- multiple choice marks itself ---------------- */

let autoMarkRunning = false;

// Fills in the multiple choice marks, one question at a time, and only where
// what is stored disagrees with the key. It deliberately never touches a written
// answer's mark, and it re-reads each response as it goes rather than trusting
// the snapshot it started with, because a snapshot arriving mid-run replaces the
// whole map underneath it.
async function autoMark() {
  if (autoMarkRunning) return;
  autoMarkRunning = true;
  try {
    for (const uid of [...responses.keys()]) {
      for (const q of set.questions || []) {
        if (q.type !== 'mcq') continue;
        const current = responses.get(uid);
        if (!current) break;
        const fresh = computeMarks(set, current, key)[q.id];
        const stored = (current.marks || {})[q.id];
        if (!fresh) continue;
        if (stored && String(stored.awarded ?? '') === String(fresh.awarded ?? '') &&
            String(stored.correct ?? '') === String(fresh.correct ?? '')) continue;
        current.marks = { ...(current.marks || {}), [q.id]: fresh };
        await saveOneMark(classId, setId, uid, q.id, fresh);
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
        '<span class="tiny">' + onThis + (isOneOff(cls) ? '' : ' of ' + members.length) +
          ' have answered this one</span>' +
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
      (isOneOff(cls)
        ? answered.length + (answered.length === 1 ? ' person has' : ' people have') + ' answered something'
        : answered.length + ' of ' + members.length + ' students have answered something') +
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
  // A one off test has no roll to be missing from: the people who answered are
  // the whole list, in the order they gave their names.
  if (isOneOff(cls)) {
    return [...responses.values()]
      .map(r => ({ uid: r.uid, name: r.name || 'No name', email: '', response: r }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }
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

  const head = '<tr><th>Student</th><th class="num">Before</th>' +
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
        return '<td class="num cell-peek ' + cls + '"' + where + '>' + label + '</td>';
      }

      // Written answers are marked here, in the cell, without leaving the grid.
      const awarded = (m.awarded === undefined || m.awarded === null) ? '' : m.awarded;
      const cls = awarded === '' ? 'cell-todo' : Number(awarded) >= full ? 'cell-right'
        : Number(awarded) === 0 ? 'cell-wrong' : '';
      return '<td class="num cell-peek cell-mark ' + cls + '" data-mark-scope' + where + '>' +
        '<input type="number" data-gridmark min="0" max="' + full + '" step="1" ' +
          'aria-label="Mark out of ' + full + '" value="' + awarded + '">' +
        '</td>';
    }).join('');
    const total = r ? totalAwarded(set, marks) : 0;
    // Everything this student did before this set, as a rough shape.
    const earlier = (trendByStudent && trendByStudent.get(row.uid) || [])
      .filter(p => p.setId !== setId);
    const trend = trendByStudent
      ? '<td class="num spark-cell">' + sparkline(earlier, { width: 54, height: 18 }) + '</td>'
      : '<td class="num cell-none">.</td>';

    return '<tr><td><a href="' + studentLink(row.uid) + '">' + esc(row.name) + '</a>' +
      (r && needsMarking(set, r) ? ' <span class="state state-todo">to mark</span>' : '') +
      '</td>' + trend + cells +
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
    'A dot means no answer, an empty box means a written answer still waiting on you. ' +
    'Before is how that student went on earlier sets, oldest on the left. ' +
    'Tab moves between written answers only. Each one starts on full marks, so ' +
    'tabbing straight through awards full marks and you type only where it is not.</p>' +
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
        return '<div class="index-row"><span class="grow"><a class="index-desc" href="' +
          studentLink(row.uid) + '">' + esc(row.name) +
          '</a></span><span class="index-meta cell-none">no answer</span></div>';
      }
      const m = (r.marks && r.marks[q.id]) || {};
      const full = Number(q.maxMark) || 1;

      if (q.type === 'mcq') {
        const letter = String(given).toUpperCase();
        const n = LETTERS.indexOf(letter);
        const text = (q.options || [])[n] || '';
        const right = m.correct === true;
        return '<div class="index-row">' +
          '<span class="grow"><a class="index-desc" href="' + studentLink(row.uid) + '">' +
            esc(row.name) + '</a></span>' +
          '<span class="grow ' + (m.correct === undefined ? '' : right ? 'cell-right' : 'cell-wrong') + '">' +
            esc(letter) + '. ' + esc(text) + '</span>' +
          '<span class="index-meta">' + (m.correct === undefined ? '' : right ? 'correct' : 'wrong') + '</span>' +
        '</div>';
      }

      const awarded = (m.awarded === undefined || m.awarded === null) ? '' : m.awarded;
      const marker = full === 1
        ? '<button data-set-mark="' + full + '" class="' + (awarded === full ? 'btn-on' : '') + '">Right</button>' +
          '<button data-set-mark="0" class="' + (awarded === 0 ? 'btn-warn' : '') + '">Wrong</button>'
        : '<input type="number" data-mark min="0" max="' + full + '" step="1" value="' + awarded + '">' +
          '<span class="tiny">of ' + full + '</span>' +
          '<button data-set-mark="' + full + '" class="btn-quiet">Full</button>' +
          '<button data-set-mark="0" class="btn-quiet">Zero</button>';

      return '<div class="qblock" data-mark-scope data-uid="' + row.uid + '" data-qid="' + q.id + '" data-max="' + full + '">' +
        '<div class="spread"><a class="label" style="margin:0" href="' + studentLink(row.uid) + '">' +
          esc(row.name) + '</a>' +
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
  try { wireMarkingInner(); }
  catch (err) { fail('Setting up marking', err); }
}

// Kept separate so the guard above catches anything that goes wrong here. A
// throw in this wiring used to leave mark boxes looking normal but connected to
// nothing, which reads as marks that quietly refuse to save.
function wireMarkingInner() {
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
    quickButtons.forEach(btn => {
      // Keep focus where it is. Letting the mark box blur here fired the owed
      // repaint, which rebuilt this panel and destroyed the button before its
      // click could land, so the button appeared to do nothing at all.
      btn.addEventListener('mousedown', e => e.preventDefault());
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
      });
    });

    const numberInput = scope.querySelector('[data-mark]');
    if (numberInput) {
      wireMarkInput(numberInput, max,
        value => saveNow(scope, { awarded: value, correct: value !== '' && value >= max }),
        fn => debounce(fn, 500));
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
  const mark = { ...(marks[qid] || {}), ...patch, auto: false };
  const blank = mark.awarded === '' || mark.awarded === null || mark.awarded === undefined;

  if (blank && !mark.comment) {
    delete marks[qid];
    r.marks = marks;
    responses.set(uid, r);
    await clearOneMark(classId, setId, uid, qid).catch(() => {});
    return totalAwarded(set, marks);
  }

  if (blank) { delete mark.awarded; delete mark.correct; }
  marks[qid] = mark;
  r.marks = marks;
  responses.set(uid, r);
  // Only this question is written. No score field: every view works the total
  // out from the marks, so storing it only created something to go stale.
  await saveOneMark(classId, setId, uid, qid, mark);
  return totalAwarded(set, marks);
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
  try { wireGridInner(); }
  catch (err) { fail('Setting up the marking grid', err); }
}

function wireGridInner() {
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

    const save = async value => {
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
    };

    wireMarkInput(input, max, save, fn => debounce(fn, 500));
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
