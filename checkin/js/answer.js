// Checkin - one question set for a student: answer it if it is open,
// read it back if it is closed.

import {
  requireUser, qp, esc, fail, fmtDate, getClass, getSet, getResponse, watchSet,
  computeMarks, totalAwarded, maxScore, answeredCount, studentsMaySeeKey,
  amMember, joinClass
} from './core.js';
import { mountSet } from './answering.js';

const classId = qp('c');
const setId = qp('s');
const focusQid = qp('q');      // set by a QR code pointing at one question
const joinCode = qp('j');      // carried by a QR code so a new student gets in
let me = null, cls = null, set = null, view = null;

(async function start() {
  me = await requireUser();
  document.getElementById('back').href = 'class.html?c=' + encodeURIComponent(classId);

  let response = null;
  try {
    await ensureIn();
    cls = await getClass(classId);
    set = await getSet(classId, setId);
    response = await getResponse(classId, setId, me.uid);
  } catch (err) {
    if (err && err.code === 'permission-denied') return notInClass();
    return fail('Loading the questions', err);
  }

  if (set.status === 'draft') {
    document.getElementById('set-view').innerHTML =
      '<p class="tiny">This set is not open yet.</p>';
    return;
  }

  document.title = (set.title || 'Questions') + ' - Checkin';
  document.getElementById('set-title').textContent = set.title || 'Questions';

  const marks = computeMarks(set, response, set.key || {});
  const done = answeredCount(set, response);
  const bits = [cls.name];
  bits.push(set.status === 'open' ? 'open now' : 'closed ' + fmtDate(set.closedAt || set.openedAt));
  if (done && studentsMaySeeKey(set)) {
    bits.push(totalAwarded(set, marks) + ' out of ' + maxScore(set));
  } else if (done && set.reveal === 'release' && !set.resultsReleased) {
    bits.push('marks not released yet');
  }
  document.getElementById('set-sub').textContent = bits.join(' · ');

  view = mountSet({
    el: document.getElementById('set-view'),
    classId, user: me, set, response, focusQid
  });

  if (set.status === 'open') {
    watchSet(classId, setId, next => {
      if (next.status !== 'open') { location.reload(); return; }
      view.update(next);
    }, err => console.error(err));
  }
})();

// A student who scans a QR code before joining is let in by the code riding
// along in the link, so scanning just works on the first day.
async function ensureIn() {
  if (!joinCode) return;
  const member = await amMember(classId, me.uid).catch(() => false);
  if (!member) await joinClass(me, joinCode);
}

function notInClass() {
  document.getElementById('set-title').textContent = 'Not your class';
  document.getElementById('set-view').innerHTML =
    '<div class="panel panel-rose"><p>You are not in this class, so you cannot open ' +
    'these questions. Ask your teacher for the join code.</p>' +
    '<p class="mt"><a class="btn" href="home.html">Go to my classes</a></p></div>';
}
