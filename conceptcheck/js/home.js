// Concept Check - home page: the classes you teach, the classes you are in.

import { requireUser, myClasses, createClass, joinClass, esc, fail } from './core.js';

let me = null;

(async function start() {
  me = await requireUser();
  await paint();

  document.getElementById('new-class-go').addEventListener('click', onCreate);
  document.getElementById('new-class-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') onCreate();
  });
  document.getElementById('join-go').addEventListener('click', onJoin);
  document.getElementById('join-code').addEventListener('keydown', e => {
    if (e.key === 'Enter') onJoin();
  });
})();

async function paint() {
  try {
    const classes = await myClasses(me.uid);
    render('teaching', classes.filter(c => c.role === 'teacher'), 'teach.html',
      'No classes yet. Make one below.');
    render('learning', classes.filter(c => c.role !== 'teacher'), 'class.html',
      'You have not joined a class yet.');
  } catch (err) {
    fail('Loading your classes', err);
  }
}

function render(slot, list, page, emptyText) {
  const box = document.getElementById(slot);
  if (!list.length) {
    box.innerHTML = '<p class="tiny">' + esc(emptyText) + '</p>';
    return;
  }
  box.innerHTML = list.map(c =>
    '<div class="index-row">' +
      '<a class="index-name" href="' + page + '?c=' + encodeURIComponent(c.id) + '">' + esc(c.name) + '</a>' +
      '<span class="index-meta">' + (c.role === 'teacher' ? 'you teach this' : 'student') + '</span>' +
    '</div>'
  ).join('');
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
