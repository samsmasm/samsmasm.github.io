// Checkin - answering a one off test with no account at all.
//
// Three steps, each one only shown when it is needed: the code (skipped when a
// QR code carried it), a name (skipped when this browser has already given one
// for this run), then the questions. The question view is the same module the
// class pages use, so what a room of visitors sees is what a class sees.

import {
  requireAnyUser, qp, esc, fail, lookupRunCode, getSet, getResponse, watchSet,
  claimName, computeMarks, totalAwarded, maxScore, answeredCount, studentsMaySeeKey
} from './core.js?v=28ba446-0639';
import { mountSet } from './answering.js?v=28ba446-0639';

const focusQid = qp('q');            // set by a QR code pointing at one question
let me = null, run = null, set = null, view = null, who = '';

const show = step => {
  ['code', 'name', 'answer', 'shut'].forEach(s =>
    document.getElementById('step-' + s).classList.toggle('hidden', s !== step));
};

const remembered = key => { try { return localStorage.getItem(key) || ''; } catch { return ''; } };
const remember = (key, value) => { try { localStorage.setItem(key, value); } catch { /* private */ } };

(async function start() {
  try {
    me = await requireAnyUser();
  } catch (err) { return fail('Getting you in', err); }

  const code = (qp('code') || '').trim().toUpperCase();
  if (code) return enter(code);

  show('code');
  document.getElementById('code-go').addEventListener('click', fromBox);
  document.getElementById('code').addEventListener('keydown', e => {
    if (e.key === 'Enter') fromBox();
  });
  document.getElementById('code').focus();
})();

function fromBox() {
  const code = document.getElementById('code').value.trim().toUpperCase();
  if (code.length < 4) {
    document.getElementById('code-note').textContent = 'That code looks too short.';
    return;
  }
  enter(code);
}

async function enter(code) {
  const note = document.getElementById('code-note');
  note.textContent = 'Looking for it.';
  try {
    run = await lookupRunCode(code);
  } catch (err) { return fail('Looking up that code', err); }

  if (!run) {
    show('code');
    note.className = 'tiny savefail';
    note.textContent = 'No test with that code. Check it and try again.';
    return;
  }

  try {
    set = await getSet(run.classId, run.setId);
  } catch (err) { return fail('Opening the test', err); }

  document.title = (set.title || 'Questions') + ' - Checkin';

  if (set.status !== 'open') return shut();

  // A name given earlier on this device stands, so a reload does not ask again
  // and does not start a second answer sheet.
  const stored = remembered('checkin_name_' + run.setId);
  if (stored) {
    who = stored;
    return answering();
  }

  show('name');
  document.getElementById('name-title').textContent = set.title || 'What is your name?';
  document.getElementById('name-go').addEventListener('click', takeName);
  document.getElementById('name').addEventListener('keydown', e => {
    if (e.key === 'Enter') takeName();
  });
  document.getElementById('name').focus();
}

function shut() {
  show('shut');
  document.getElementById('shut-title').textContent = set.title || 'Not open';
  document.getElementById('shut-sub').textContent = set.status === 'closed'
    ? 'This one is closed now, so it cannot be answered any more.'
    : 'This one has not been opened yet. Your teacher will open it when everyone is ready.';
}

async function takeName() {
  const input = document.getElementById('name');
  const note = document.getElementById('name-note');
  const name = input.value.trim();
  if (name.length < 2) {
    note.className = 'tiny savefail';
    note.textContent = 'Put in your name so your teacher knows whose answers these are.';
    return;
  }

  note.className = 'tiny';
  note.textContent = 'Just a moment.';
  let claim;
  try {
    claim = await claimName(run.classId, run.setId, me.uid, name);
  } catch (err) { return fail('Taking that name', err); }

  if (!claim.ok) {
    note.className = 'tiny savefail';
    note.textContent = claim.reason === 'taken'
      ? 'Somebody in this room is already using that name. Add your last name or an initial.'
      : 'That name will not do. Try letters and numbers.';
    input.select();
    return;
  }

  who = name;
  remember('checkin_name_' + run.setId, name);
  answering();
}

async function answering() {
  document.getElementById('who').textContent = who;
  show('answer');
  document.getElementById('set-title').textContent = set.title || 'Questions';

  let response = null;
  try { response = await getResponse(run.classId, run.setId, me.uid); }
  catch (err) { return fail('Loading your answers', err); }

  subtitle(response);

  // A stand-in for the signed-in user the question view normally gets. The name
  // is the one they typed: there is no account behind any of this.
  const person = { uid: me.uid, displayName: who, email: '' };

  view = mountSet({
    el: document.getElementById('set-view'),
    classId: run.classId, user: person, set, response, focusQid,
    onChange: () => { /* answers save as they go */ }
  });

  watchSet(run.classId, run.setId, next => {
    const was = set.status;
    set = { id: run.setId, ...next };
    if (next.status !== 'open') {
      // Closed under them mid-answer. Say so rather than silently going dead.
      if (was === 'open') shut();
      return;
    }
    view.update(next);
  }, err => console.error(err));
}

function subtitle(response) {
  const bits = [];
  const done = answeredCount(set, response);
  const marks = computeMarks(set, response, set.key || {});
  if (done && studentsMaySeeKey(set)) {
    bits.push(totalAwarded(set, marks) + ' out of ' + maxScore(set));
  } else if (done && set.reveal === 'release') {
    bits.push('marks are not out yet');
  }
  bits.push(esc(run.title || ''));
  document.getElementById('set-sub').textContent = bits.filter(Boolean).join(' · ');
}
