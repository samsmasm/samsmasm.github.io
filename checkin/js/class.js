// Checkin - a student's class page. The current question is waiting, large,
// with everything older tucked behind Previous questions.

import {
  requireUser, qp, esc, fail, fmtDate, getClass, listSets, amMember, getResponse,
  watchSet, computeMarks, studentScore, answeredCount, studentsMaySeeKey,
  practiceAllowed, myClasses, forgetClass, doc, db, addShellLinks
} from './core.js?v=2aeb1e7-1921';
import { mountSet } from './answering.js?v=2aeb1e7-1921';
import { updateDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const classId = qp('c');
let me = null, cls = null, view = null, stopWatch = null;

(async function start() {
  me = await requireUser();
  try {
    cls = await getClass(classId);
  } catch (err) { return fail('Loading the class', err); }

  const owner = cls.ownerUid === me.uid;
  if (!owner) {
    const member = await amMember(classId, me.uid).catch(() => false);
    if (!member) {
      document.getElementById('class-name').textContent = cls.name;
      document.getElementById('current').innerHTML =
        '<div class="panel panel-rose"><p>You are not in this class any more. ' +
        'Ask your teacher for the code if that is a mistake.</p>' +
        '<p class="mt"><a class="btn" href="home.html">Back to my classes</a></p></div>';
      await forgetClass(me.uid, classId).catch(() => {});
      return;
    }
  } else {
    const banner = document.getElementById('teacher-banner');
    banner.classList.remove('hidden');
    banner.innerHTML = 'You teach this class, so this is a preview of what students see. ' +
      '<a href="teach.html?c=' + encodeURIComponent(classId) + '">Go to the teacher view</a>.';
  }

  document.title = cls.name + ' - Checkin';
  addShellLinks([{ label: cls.name, href: 'class.html?c=' + encodeURIComponent(classId),
                   icon: 'stack', match: p => p === 'class.html' }]);
  document.getElementById('class-name').textContent = cls.name;
  document.getElementById('class-sub').textContent = cls.ownerName ? 'Set by ' + cls.ownerName : '';
  await healCachedName();

  const togglePrev = open => {
    const box = document.getElementById('previous');
    box.classList.toggle('hidden', !open);
    document.getElementById('prev-toggle').textContent =
      open ? 'Hide previous questions' : 'Previous questions';
  };
  document.getElementById('prev-toggle').addEventListener('click', () => {
    togglePrev(document.getElementById('previous').classList.contains('hidden'));
  });

  await paint();

  // Arriving from "See my earlier questions" should land on them, not on a
  // closed panel the student has to find and open.
  if (qp('prev') === '1') {
    togglePrev(true);
    const wrap = document.getElementById('previous-wrap');
    if (wrap && !wrap.classList.contains('hidden')) wrap.scrollIntoView({ block: 'start' });
  }
})();

// The class name is cached on the student's own user document for the home page.
// If the teacher renamed the class, quietly bring the cache up to date.
async function healCachedName() {
  try {
    const mine = await myClasses(me.uid);
    const row = mine.find(c => c.id === classId);
    if (row && row.name !== cls.name) {
      await updateDoc(doc(db, 'users', me.uid), {
        ['classes.' + classId]: { name: cls.name, role: row.role }
      });
    }
  } catch { /* the cache is a convenience, not worth surfacing */ }
}

async function paint() {
  let sets;
  try {
    sets = (await listSets(classId)).filter(s => s.status !== 'draft');
  } catch (err) { return fail('Loading the questions', err); }

  if (!sets.length) {
    document.getElementById('current').innerHTML =
      '<div class="panel"><p>Nothing to answer yet. Your teacher has not opened a question set.</p></div>';
    return;
  }

  const open = sets.filter(s => s.status === 'open').sort((a, b) => {
    const when = s => (s.openedAt && s.openedAt.seconds) || (s.createdAt && s.createdAt.seconds) || 0;
    return when(b) - when(a);
  });
  const current = open[0] || null;
  const rest = sets.filter(s => !current || s.id !== current.id);

  const box = document.getElementById('current');
  if (current) {
    let response = null;
    try { response = await getResponse(classId, current.id, me.uid); }
    catch (err) { return fail('Loading your answers', err); }

    box.innerHTML = '<p class="label">' + esc(current.title) + '</p><div id="set-view"></div>';
    view = mountSet({
      el: document.getElementById('set-view'),
      classId, user: me, set: current, response,
      finishLinks: finishLinks(current),
      onChange: () => { /* answers are saved as they go */ }
    });
    if (stopWatch) stopWatch();
    stopWatch = watchSet(classId, current.id, next => {
      if (next.status !== 'open') { location.reload(); return; }
      view.update(next);
    }, err => console.error(err));
  } else {
    box.innerHTML = '<div class="panel"><p>Nothing open right now. Your previous questions are below.</p></div>';
  }

  await paintPrevious(rest);
}

// Where a student can go once they have handed in. The class first, because that
// is where everything else about this class is.
function finishLinks(set) {
  const c = encodeURIComponent(classId);
  const links = [{ label: 'Back to my class', href: 'class.html?c=' + c, primary: true }];
  if (practiceAllowed(set)) {
    links.push({ label: 'Try it again for practice',
                 href: 'answer.html?c=' + c + '&s=' + set.id + '&practice=1' });
  }
  links.push({ label: 'See my earlier questions', href: 'class.html?c=' + c + '&prev=1' });
  return links;
}

async function paintPrevious(sets) {
  const wrap = document.getElementById('previous-wrap');
  if (!sets.length) return;
  wrap.classList.remove('hidden');

  const rows = await Promise.all(sets.map(async set => {
    let response = null;
    try { response = await getResponse(classId, set.id, me.uid); } catch { /* ignore */ }
    const done = answeredCount(set, response);
    const total = (set.questions || []).length;
    const marks = computeMarks(set, response, set.key || {});
    const showScore = studentsMaySeeKey(set) && done > 0;

    const meta = [];
    if (!done) meta.push('<span class="state state-todo">not answered</span>');
    else if (done < total) meta.push(done + ' of ' + total + ' answered');
    else meta.push('all answered');
    if (showScore) {
      const tally = studentScore(set, response, marks);
      if (tally.text) meta.push('<b>' + tally.text + '</b>');
      if (tally.waiting) {
        meta.push('<span class="tiny">' + tally.waitingPoints +
          (tally.waitingPoints === 1 ? ' mark' : ' marks') + ' still with your teacher</span>');
      }
    } else if (done && set.reveal === 'release') meta.push('marks not released yet');

    const link = 'answer.html?c=' + encodeURIComponent(classId) + '&s=' + set.id;
    const actions = [];
    if (done) {
      actions.push('<a class="btn btn-quiet" href="' + link + '">Review marked answers</a>');
    } else {
      actions.push('<a class="btn" href="' + link + '">' +
        (set.status === 'open' ? 'Answer these' : 'See the questions') + '</a>');
    }
    if (practiceAllowed(set)) {
      actions.push('<a class="btn" href="' + link + '&practice=1">Try again</a>');
    }

    return '<div class="index-row">' +
      '<span class="grow">' +
        '<a class="index-name" href="' + link + '">' + esc(set.title || 'Untitled') + '</a>' +
        ' <span class="state state-' + set.status + '">' + (set.status === 'open' ? 'still open' : 'closed') + '</span>' +
        '<br><span class="index-desc">' + total + (total === 1 ? ' question' : ' questions') + '</span>' +
      '</span>' +
      '<span class="index-meta">' + meta.join('<br>') + '<br>' + fmtDate(set.openedAt || set.createdAt) + '</span>' +
      '<span class="row" style="flex-basis:100%">' + actions.join('') + '</span>' +
    '</div>';
  }));

  document.getElementById('previous').innerHTML = rows.join('');
}
