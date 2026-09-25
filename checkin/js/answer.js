// Checkin - one question set for a student: answer it if it is open,
// read it back if it is closed.

import {
  requireUser, qp, esc, fail, fmtDate, getClass, getSet, getResponse, watchSet,
  computeMarks, totalAwarded, maxScore, answeredCount, studentsMaySeeKey,
  amMember, joinClass, practiceAllowed, newAttemptId, startPractice, savePracticeAnswer
} from './core.js?v=772c2f2-0736';
import { mountSet } from './answering.js?v=772c2f2-0736';

const classId = qp('c');
const setId = qp('s');
const focusQid = qp('q');            // set by a QR code pointing at one question
const joinCode = qp('j');            // carried by a QR code so a new student gets in
const practice = qp('practice') === '1';   // a private run at a set already done
let me = null, cls = null, set = null, view = null, attemptId = null;

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

  if (practice && !practiceAllowed(set)) {
    document.getElementById('set-title').textContent = set.title || 'Questions';
    document.getElementById('set-view').innerHTML =
      '<div class="panel"><p>This set is not open for practice at the moment. ' +
      'Your teacher decides when a set can be redone.</p>' +
      '<p class="mt"><a class="btn" href="class.html?c=' + encodeURIComponent(classId) +
      '">Back to the class</a></p></div>';
    return;
  }

  document.title = (practice ? 'Practice: ' : '') + (set.title || 'Questions') + ' - Checkin';
  document.getElementById('set-title').textContent = set.title || 'Questions';

  const marks = computeMarks(set, response, set.key || {});
  const done = answeredCount(set, response);
  const bits = [cls.name];
  if (practice) {
    bits.push('practice run');
  } else {
    bits.push(set.status === 'open' ? 'open now' : 'closed ' + fmtDate(set.closedAt || set.openedAt));
    if (done && studentsMaySeeKey(set)) {
      bits.push(totalAwarded(set, marks) + ' out of ' + maxScore(set));
    } else if (done && set.reveal === 'release' && !set.resultsReleased) {
      bits.push('marks not released yet');
    }
  }
  document.getElementById('set-sub').textContent = bits.join(' · ');

  if (practice) {
    attemptId = newAttemptId();
    try {
      await startPractice(classId, setId, me.uid, attemptId);
    } catch (err) { return fail('Starting a practice run', err); }
    const banner = document.createElement('div');
    banner.className = 'panel panel-green';
    banner.innerHTML = '<p>Practice run. Your answers here are yours alone: they do not ' +
      'change your marked work and your teacher does not see them. Multiple choice tells ' +
      'you straight away whether you are right.</p>';
    const host = document.getElementById('set-view');
    host.parentNode.insertBefore(banner, host);
  }

  view = mountSet({
    el: document.getElementById('set-view'),
    classId, user: me, set,
    response: practice ? null : response,
    focusQid, practice,
    finishLinks: finishLinks(),
    onSaveAnswer: practice
      ? (qid, value) => savePracticeAnswer(classId, setId, me.uid, attemptId, qid, value)
      : null,
    onRestart: practice ? () => location.reload() : null
  });

  if (!practice && set.status === 'open') {
    watchSet(classId, setId, next => {
      if (next.status !== 'open') { location.reload(); return; }
      view.update(next);
    }, err => console.error(err));
  }
})();

// Where to go once it is handed in. The same three places the class page offers,
// so the end of a set reads the same wherever it was started from.
function finishLinks() {
  const c = encodeURIComponent(classId);
  const links = [{ label: 'Back to my class', href: 'class.html?c=' + c, primary: true }];
  if (practiceAllowed(set)) {
    links.push({ label: 'Try it again for practice',
                 href: 'answer.html?c=' + c + '&s=' + setId + '&practice=1' });
  }
  links.push({ label: 'See my earlier questions', href: 'class.html?c=' + c + '&prev=1' });
  return links;
}

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
