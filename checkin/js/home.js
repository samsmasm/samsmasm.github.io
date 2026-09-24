// Checkin - home page. What it leads with depends on whether this person said
// they teach or study. Both can do both: the role only decides the order and
// the prominence, never what is allowed.

import {
  requireUser, myClasses, createClass, joinClass, esc, fail, qp, myRole, setMyRole,
  addShellLinks
} from './core.js?v=641cfbd-2036';

let me = null, classes = [];

(async function start() {
  me = await requireUser();
  try {
    classes = await myClasses(me.uid);
  } catch (err) { return fail('Loading your classes', err); }

  if (!myRole()) askRole(); else showClasses();
})();

/* ---------------- the one-time question ---------------- */

function askRole() {
  document.getElementById('ask-role').classList.remove('hidden');
  const teacherBtn = document.getElementById('pick-teacher');
  const studentBtn = document.getElementById('pick-student');

  const choose = async role => {
    const picked = role === 'teacher' ? teacherBtn : studentBtn;
    const label = picked.textContent;
    teacherBtn.disabled = true;
    studentBtn.disabled = true;
    picked.textContent = 'Saving.';
    try {
      await setMyRole(me.uid, role);
      // Swap straight to the class lists rather than reloading. A reload here
      // would depend on the page not being served from cache, and if it were,
      // this question would simply reappear and look like a dead button.
      document.getElementById('ask-role').classList.add('hidden');
      addShellLinks([]);          // rebuilds the sidebar, now with the other route on it
      showClasses();
    } catch (err) {
      teacherBtn.disabled = false;
      studentBtn.disabled = false;
      picked.textContent = label;
      fail('Saving that', err);
    }
  };
  teacherBtn.addEventListener('click', () => choose('teacher'));
  studentBtn.addEventListener('click', () => choose('student'));
}

/* ---------------- the class lists ---------------- */

function showClasses() {
  const role = myRole();
  const teaching = classes.filter(c => c.role === 'teacher');
  const learning = classes.filter(c => c.role !== 'teacher');

  document.getElementById('classes').classList.remove('hidden');
  document.getElementById('home-sub').textContent = role === 'teacher'
    ? 'Classes you teach.'
    : 'Classes you are in.';

  const teachBlock = lead => block({
    lead,
    label: 'Teaching',
    list: teaching,
    page: 'teach.html',
    empty: 'No classes yet.',
    action: 'start',
    quietText: 'Teaching a class too? Start one',
    panel:
      '<span class="label">Start a new class</span>' +
      '<div class="row">' +
        '<input type="text" id="new-class-name" class="grow" placeholder="Write your class name here" maxlength="80">' +
        '<button id="new-class-go" class="btn-go">Create class</button>' +
      '</div>'
  });

  const learnBlock = lead => block({
    lead,
    label: 'Classes you are in',
    list: learning,
    page: 'class.html',
    empty: 'You have not joined a class yet.',
    action: 'join',
    quietText: 'In someone else\'s class? Join with a code',
    panel:
      '<span class="label">Join a class</span>' +
      '<div class="row">' +
        '<input type="text" id="join-code" class="code-input" placeholder="ABC234" maxlength="6" autocomplete="off">' +
        '<button id="join-go" class="btn-go">Join</button>' +
      '</div>' +
      '<p class="tiny mt" id="join-note">Your teacher will give you a six character code.</p>'
  });

  const teacherFirst = role === 'teacher';
  document.getElementById('primary').innerHTML = teacherFirst ? teachBlock(true) : learnBlock(true);
  document.getElementById('secondary').innerHTML = teacherFirst ? learnBlock(false) : teachBlock(false);

  document.getElementById('role-switch').innerHTML =
    'Set up as ' + (teacherFirst ? 'a teacher' : 'a student') + '. ' +
    '<button class="linkish" id="swap-role">Show me the ' +
    (teacherFirst ? 'student' : 'teacher') + ' side instead</button>';

  wire();
}

// A block is a heading, the classes in it, and its action. The action is a full
// panel when this is what you mostly do, and a quiet line when it is not.
function block({ lead, label, list, page, empty, action, quietText, panel }) {
  const rows = list.length
    ? list.map(c =>
        '<div class="index-row">' +
          '<a class="index-name" href="' + page + '?c=' + encodeURIComponent(c.id) + '">' + esc(c.name) + '</a>' +
          '<span class="index-meta">' + (page === 'teach.html' ? 'you teach this' : 'student') + '</span>' +
        '</div>').join('')
    : (lead ? '<p class="tiny">' + esc(empty) + '</p>' : '');

  if (lead) {
    return '<p class="rule-label">' + esc(label) + '</p>' + rows +
      '<div class="panel mt">' + panel + '</div>';
  }
  // Secondary: the list still shows if there is anything in it, but the way to
  // add more is a single quiet line.
  return (list.length ? '<p class="rule-label">' + esc(label) + '</p>' + rows : '') +
    '<p class="tiny mt2"><button class="linkish" data-reveal="' + action + '">' + esc(quietText) + '</button></p>' +
    '<div class="panel mt hidden" data-panel="' + action + '">' + panel + '</div>';
}

/* ---------------- wiring ---------------- */

function wire() {
  document.querySelectorAll('[data-reveal]').forEach(btn =>
    btn.addEventListener('click', () => reveal(btn.dataset.reveal)));

  // Arriving from the header menu opens the right panel straight away.
  if (qp('join') === '1') reveal('join');
  if (qp('start') === '1') reveal('start');

  const nameBox = document.getElementById('new-class-name');
  if (nameBox) {
    document.getElementById('new-class-go').addEventListener('click', onCreate);
    nameBox.addEventListener('keydown', e => { if (e.key === 'Enter') onCreate(); });
  }
  const codeBox = document.getElementById('join-code');
  if (codeBox) {
    document.getElementById('join-go').addEventListener('click', onJoin);
    codeBox.addEventListener('keydown', e => { if (e.key === 'Enter') onJoin(); });
  }

  document.getElementById('swap-role').addEventListener('click', async () => {
    const btn = document.getElementById('swap-role');
    btn.disabled = true;
    try {
      await setMyRole(me.uid, myRole() === 'teacher' ? 'student' : 'teacher');
      addShellLinks([]);
      showClasses();
    } catch (err) {
      btn.disabled = false;
      fail('Changing that', err);
    }
  });
}

function reveal(which) {
  const panel = document.querySelector('[data-panel="' + which + '"]');
  if (!panel) return;                       // already the prominent one
  panel.classList.remove('hidden');
  const line = document.querySelector('[data-reveal="' + which + '"]');
  if (line) line.parentNode.classList.add('hidden');
  const first = panel.querySelector('input');
  if (first) first.focus();
}

async function onCreate() {
  const input = document.getElementById('new-class-name');
  const name = input.value.trim();
  if (!name) { input.focus(); return; }
  const btn = document.getElementById('new-class-go');
  btn.disabled = true;
  try {
    const id = await createClass(me, name);
    location.href = 'teach.html?c=' + encodeURIComponent(id);
  } catch (err) {
    btn.disabled = false;
    fail('Creating the class', err);
  }
}

async function onJoin() {
  const input = document.getElementById('join-code');
  const note = document.getElementById('join-note');
  const code = input.value.trim().toUpperCase();
  if (code.length < 4) { input.focus(); return; }
  const btn = document.getElementById('join-go');
  btn.disabled = true;
  note.textContent = 'Checking the code.';
  try {
    const found = await joinClass(me, code);
    location.href = 'class.html?c=' + encodeURIComponent(found.classId);
  } catch (err) {
    btn.disabled = false;
    if (err && err.code === 'permission-denied') {
      note.className = 'savefail mt';
      note.textContent = 'That class will not let you in. Your teacher may have removed you.';
    } else if (err && /No class/.test(err.message || '')) {
      note.className = 'savefail mt';
      note.textContent = 'No class with that code. Check it with your teacher.';
    } else {
      note.className = 'tiny mt';
      fail('Joining the class', err);
    }
  }
}
