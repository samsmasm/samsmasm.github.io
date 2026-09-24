// Checkin - shared helpers: auth guard, page chrome, data access, CSV.

import { db, auth, signIn, signOutNow, onAuth } from './firebase.js';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, getDocs,
  query, orderBy, onSnapshot, writeBatch, deleteField, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export { signIn, signOutNow, onAuth, auth, db, onSnapshot, doc, collection };

/* ---------------- small utilities ---------------- */

export function qp(name) {
  return new URLSearchParams(location.search).get(name) || '';
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function fmtDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });
}

export function fmtDateTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('en-NZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function newId(prefix = 'q') {
  return prefix + Math.random().toString(36).slice(2, 9);
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1
function randomCode(len = 6) {
  let out = '';
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return out;
}

export function debounce(fn, ms = 600) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ---------------- page chrome ---------------- */

let profile = null;

// What this person said they are, teacher or student. It decides which page is
// put in front of them and nothing else: both can make a class and both can join
// one, so this is never a permission.
export function myRole() {
  return (profile && profile.role) || null;
}

export async function setMyRole(uid, role) {
  await updateDoc(doc(db, 'users', uid), { role });
  if (profile) profile.role = role;
}

// Waits for Firebase auth, then either hands back the user or sends them to sign in.
export function requireUser() {
  return new Promise(resolve => {
    const stop = onAuth(async user => {
      stop();
      if (!user) {
        location.replace('index.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search));
        return;
      }
      profile = await ensureUserDoc(user);
      paintUserChip(user);
      resolve(user);
    });
  });
}

function paintUserChip(user) {
  const slot = document.getElementById('user-chip');
  if (!slot) return;
  // The thing this person does less of sits quietly up here rather than taking
  // up room on their home page.
  const role = myRole();
  const other = role === 'student' ? '<a href="home.html?start=1">Start a class</a> &middot; '
    : role === 'teacher' ? '<a href="home.html?join=1">Join a class</a> &middot; '
    : '';
  slot.innerHTML =
    esc(user.displayName || user.email) +
    '<br><a href="home.html">My classes</a> &middot; ' + other +
    '<button class="linkish" id="signout-btn">Sign out</button>';
  document.getElementById('signout-btn').addEventListener('click', async () => {
    await signOutNow();
    location.replace('index.html');
  });
}

export function fail(where, err) {
  console.error(where, err);
  const box = document.getElementById('page-error');
  const text = (err && err.code === 'permission-denied')
    ? 'Permission denied. You may have been removed from this class, or the Firestore rules are not in place yet.'
    : (err && err.message) || String(err);
  if (box) {
    box.className = 'msg msg-bad';
    box.textContent = where + ': ' + text;
  }
}

/* ---------------- users ---------------- */

export async function ensureUserDoc(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const fresh = {
      email: user.email,
      name: user.displayName || user.email,
      classes: {},
      role: null,            // asked for on their first visit to the home page
      createdAt: serverTimestamp()
    };
    await setDoc(ref, fresh);
    return fresh;
  }
  return snap.data();
}

// A user's class list lives on their own user doc, so the home page needs one read
// and no cross-collection query. Membership is still enforced by the member docs.
export async function myClasses(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  const map = (snap.exists() && snap.data().classes) || {};
  return Object.entries(map)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

async function rememberClass(uid, classId, name, role) {
  await updateDoc(doc(db, 'users', uid), { ['classes.' + classId]: { name, role } });
}

export async function forgetClass(uid, classId) {
  await updateDoc(doc(db, 'users', uid), { ['classes.' + classId]: deleteField() });
}

/* ---------------- classes ---------------- */

export async function createClass(user, name) {
  const ref = doc(collection(db, 'classes'));
  let code = randomCode();
  for (let tries = 0; tries < 8; tries++) {
    const taken = await getDoc(doc(db, 'joinCodes', code));
    if (!taken.exists()) break;
    code = randomCode();
  }
  const batch = writeBatch(db);
  batch.set(ref, {
    name,
    ownerUid: user.uid,
    ownerName: user.displayName || user.email,
    joinCode: code,
    createdAt: serverTimestamp()
  });
  batch.set(doc(db, 'joinCodes', code), {
    classId: ref.id,
    className: name,
    ownerUid: user.uid,
    ownerName: user.displayName || user.email
  });
  await batch.commit();
  await rememberClass(user.uid, ref.id, name, 'teacher');
  return ref.id;
}

export async function getClass(classId) {
  const snap = await getDoc(doc(db, 'classes', classId));
  if (!snap.exists()) throw new Error('Class not found');
  return { id: snap.id, ...snap.data() };
}

export async function newJoinCode(cls, user) {
  let code = randomCode();
  for (let tries = 0; tries < 8; tries++) {
    const taken = await getDoc(doc(db, 'joinCodes', code));
    if (!taken.exists()) break;
    code = randomCode();
  }
  const batch = writeBatch(db);
  batch.set(doc(db, 'joinCodes', code), {
    classId: cls.id, className: cls.name, ownerUid: user.uid, ownerName: cls.ownerName || ''
  });
  if (cls.joinCode) batch.delete(doc(db, 'joinCodes', cls.joinCode));
  batch.update(doc(db, 'classes', cls.id), { joinCode: code });
  await batch.commit();
  return code;
}

export async function renameClass(cls, name) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'classes', cls.id), { name });
  if (cls.joinCode) batch.update(doc(db, 'joinCodes', cls.joinCode), { className: name });
  await batch.commit();
}

export async function lookupCode(code) {
  const snap = await getDoc(doc(db, 'joinCodes', code.trim().toUpperCase()));
  return snap.exists() ? snap.data() : null;
}

export async function joinClass(user, code) {
  const found = await lookupCode(code);
  if (!found) throw new Error('No class with that code.');
  if (found.ownerUid === user.uid) {
    // Your own class, so just make sure it is on your list.
    await rememberClass(user.uid, found.classId, found.className, 'teacher');
    return found;
  }
  await setDoc(doc(db, 'classes', found.classId, 'members', user.uid), {
    name: user.displayName || user.email,
    email: user.email,
    role: 'student',
    joinedAt: serverTimestamp()
  });
  await rememberClass(user.uid, found.classId, found.className, 'student');
  return found;
}

export async function listMembers(classId) {
  const snap = await getDocs(collection(db, 'classes', classId, 'members'));
  return snap.docs
    .map(d => ({ uid: d.id, ...d.data() }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

export async function amMember(classId, uid) {
  const snap = await getDoc(doc(db, 'classes', classId, 'members', uid));
  return snap.exists();
}

// Removing also writes a block doc so the student cannot walk back in with the code.
export async function removeMember(classId, member) {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'classes', classId, 'members', member.uid));
  batch.set(doc(db, 'classes', classId, 'blocked', member.uid), {
    name: member.name || '', email: member.email || '', at: serverTimestamp()
  });
  await batch.commit();
}

export async function listBlocked(classId) {
  const snap = await getDocs(collection(db, 'classes', classId, 'blocked'));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

export async function unblock(classId, uid) {
  await deleteDoc(doc(db, 'classes', classId, 'blocked', uid));
}

/* ---------------- question sets ---------------- */

export const BLANK_SET = () => ({
  title: '',
  mode: 'self',        // 'self' = students work at their own pace, 'live' = teacher advances
  status: 'draft',     // draft, open, closed
  reveal: 'release',   // 'now' = mark multiple choice instantly, 'release' = hold until released
  resultsReleased: false,
  liveIndex: 0,
  questions: []
});

export async function listSets(classId) {
  const snap = await getDocs(query(collection(db, 'classes', classId, 'sets'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getSet(classId, setId) {
  const snap = await getDoc(doc(db, 'classes', classId, 'sets', setId));
  if (!snap.exists()) throw new Error('Question set not found');
  return { id: snap.id, ...snap.data() };
}

export function watchSet(classId, setId, cb, onErr) {
  return onSnapshot(doc(db, 'classes', classId, 'sets', setId),
    s => { if (s.exists()) cb({ id: s.id, ...s.data() }); },
    onErr);
}

export async function createSet(classId, data) {
  const ref = await addDoc(collection(db, 'classes', classId, 'sets'), {
    ...BLANK_SET(), ...data, createdAt: serverTimestamp()
  });
  return ref.id;
}

export async function saveSet(classId, setId, data) {
  await setDoc(doc(db, 'classes', classId, 'sets', setId), data, { merge: true });
}

export async function deleteSet(classId, setId) {
  const snap = await getDocs(collection(db, 'classes', classId, 'sets', setId, 'responses'));
  for (const d of snap.docs) await deleteDoc(d.ref);
  await deleteDoc(doc(db, 'classes', classId, 'sets', setId, 'keys', 'key')).catch(() => {});
  await deleteDoc(doc(db, 'classes', classId, 'sets', setId));
}

/* -------- the answer key --------
   Correct answers live in a subdocument only the teacher can read, so a student
   cannot dig them out of the page before answering. A copy is placed on the set
   document itself only when students are allowed to know: either the set marks
   multiple choice instantly, or results have been released.
-------------------------------- */

export async function saveKey(classId, setId, key) {
  await setDoc(doc(db, 'classes', classId, 'sets', setId, 'keys', 'key'), { key }, { merge: false });
}

export async function getKey(classId, setId) {
  const snap = await getDoc(doc(db, 'classes', classId, 'sets', setId, 'keys', 'key'));
  return (snap.exists() && snap.data().key) || {};
}

export function studentsMaySeeKey(set) {
  return set.resultsReleased === true || (set.reveal === 'now' && set.status !== 'draft');
}

export async function syncKeyVisibility(classId, set) {
  const should = studentsMaySeeKey(set);
  const has = !!set.key;
  if (should && !has) {
    const key = await getKey(classId, set.id);
    await saveSet(classId, set.id, { key });
    return key;
  }
  if (!should && has) {
    await updateDoc(doc(db, 'classes', classId, 'sets', set.id), { key: deleteField() });
  }
  return set.key || null;
}

/* ---------------- responses ---------------- */

export async function getResponse(classId, setId, uid) {
  const snap = await getDoc(doc(db, 'classes', classId, 'sets', setId, 'responses', uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
}

export async function getResponses(classId, setId) {
  const snap = await getDocs(collection(db, 'classes', classId, 'sets', setId, 'responses'));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

export async function saveAnswer(classId, setId, user, qid, value) {
  await setDoc(doc(db, 'classes', classId, 'sets', setId, 'responses', user.uid), {
    name: user.displayName || user.email,
    email: user.email,
    answers: { [qid]: value },
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function markFinished(classId, setId, user) {
  await setDoc(doc(db, 'classes', classId, 'sets', setId, 'responses', user.uid), {
    name: user.displayName || user.email,
    email: user.email,
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function saveMarks(classId, setId, uid, patch) {
  await setDoc(doc(db, 'classes', classId, 'sets', setId, 'responses', uid), patch, { merge: true });
}

/* ---------------- practice retakes ----------------
   A retake lives under the student's own response document and is readable only
   by them. It never touches the real attempt, so nothing the teacher has marked
   can be overwritten by a student revising later.
-------------------------------------------------- */

export function newAttemptId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function retakeRef(classId, setId, uid, attemptId) {
  return doc(db, 'classes', classId, 'sets', setId, 'responses', uid, 'retakes', attemptId);
}

export async function startPractice(classId, setId, uid, attemptId) {
  await setDoc(retakeRef(classId, setId, uid, attemptId), {
    startedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function savePracticeAnswer(classId, setId, uid, attemptId, qid, value) {
  await setDoc(retakeRef(classId, setId, uid, attemptId), {
    answers: { [qid]: value },
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export function practiceAllowed(set) {
  return set.allowRetake === true && studentsMaySeeKey(set);
}

/* ---------------- marking maths ---------------- */

export function maxScore(set) {
  return (set.questions || []).reduce((n, q) => n + (Number(q.maxMark) || 1), 0);
}

// Multiple choice marks itself. Short text keeps whatever the teacher awarded.
export function computeMarks(set, response, key) {
  const marks = { ...(response && response.marks || {}) };
  for (const q of set.questions || []) {
    const given = response && response.answers ? response.answers[q.id] : undefined;
    if (q.type !== 'mcq') continue;
    if (given === undefined || given === null || given === '') { delete marks[q.id]; continue; }
    const right = key && key[q.id] ? String(key[q.id]).trim().toUpperCase() === String(given).trim().toUpperCase() : null;
    if (right === null) continue;
    marks[q.id] = { correct: right, awarded: right ? (Number(q.maxMark) || 1) : 0, auto: true };
  }
  return marks;
}

export function totalAwarded(set, marks) {
  let total = 0;
  for (const q of set.questions || []) {
    const m = marks && marks[q.id];
    if (m && m.awarded !== undefined && m.awarded !== null && m.awarded !== '') total += Number(m.awarded) || 0;
  }
  return total;
}

export function needsMarking(set, response) {
  const marks = (response && response.marks) || {};
  for (const q of set.questions || []) {
    if (q.type !== 'text') continue;
    const given = response && response.answers ? response.answers[q.id] : undefined;
    if (given === undefined || given === null || String(given).trim() === '') continue;
    const m = marks[q.id];
    if (!m || m.awarded === undefined || m.awarded === null || m.awarded === '') return true;
  }
  return false;
}

export function answeredCount(set, response) {
  let n = 0;
  for (const q of set.questions || []) {
    const a = response && response.answers ? response.answers[q.id] : undefined;
    if (a !== undefined && a !== null && String(a).trim() !== '') n++;
  }
  return n;
}

/* ---------------- CSV ---------------- */

// Full parser: handles quoted fields, embedded commas, newlines and doubled quotes.
export function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', inQuotes = false;
  const src = String(text).replace(/\r\n?/g, '\n');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell); cell = '';
    } else if (ch === '\n') {
      row.push(cell); cell = '';
      if (row.some(c => c.trim() !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some(c => c.trim() !== '')) rows.push(row);
  return rows;
}

const COLUMN_ALIASES = {
  type: ['type', 'qtype', 'kind', 'questiontype'],
  prompt: ['question', 'prompt', 'q', 'text'],
  a: ['optiona', 'a', 'option1', '1', 'choicea'],
  b: ['optionb', 'b', 'option2', '2', 'choiceb'],
  c: ['optionc', 'c', 'option3', '3', 'choicec'],
  d: ['optiond', 'd', 'option4', '4', 'choiced'],
  answer: ['answer', 'correctanswer', 'correct', 'modelanswer', 'model', 'expected'],
  maxMark: ['maxmark', 'marks', 'mark', 'max', 'points', 'outof']
};

const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

// Maps columns by header name, so column order does not matter and extra columns
// are ignored. Returns { questions, key, errors }.
export function csvToQuestions(text) {
  const rows = parseCSV(text);
  const errors = [];
  if (!rows.length) return { questions: [], key: {}, errors: ['Nothing to import.'] };

  const header = rows[0].map(norm);
  const col = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const idx = header.findIndex(h => aliases.includes(h));
    if (idx >= 0) col[field] = idx;
  }
  let body = rows.slice(1);
  if (col.prompt === undefined) {
    // No recognisable header row, so fall back to the UniQuiz column order.
    col.type = undefined;
    col.prompt = 0; col.a = 1; col.b = 2; col.c = 3; col.d = 4; col.answer = 5; col.maxMark = 6;
    body = rows;
    errors.push('No header row recognised, so columns were read as question, A, B, C, D, answer, mark.');
  }

  const questions = [], key = {};
  body.forEach((r, i) => {
    const get = f => (col[f] === undefined ? '' : String(r[col[f]] ?? '').trim());
    const prompt = get('prompt');
    if (!prompt) return;
    const options = [get('a'), get('b'), get('c'), get('d')].filter(o => o !== '');
    const declared = norm(get('type'));
    let type = 'mcq';
    if (declared.startsWith('t') || declared.startsWith('s') || declared.startsWith('o')) type = 'text';
    else if (declared.startsWith('m') || declared.startsWith('c')) type = 'mcq';
    else type = options.length >= 2 ? 'mcq' : 'text';

    const answer = get('answer');
    const markRaw = get('maxMark');
    let maxMark = Number(markRaw);
    if (!Number.isFinite(maxMark) || maxMark <= 0) maxMark = 1;

    if (type === 'mcq') {
      if (options.length < 2) {
        errors.push('Row ' + (i + 2) + ': multiple choice needs at least two options, so it was imported as short text.');
        type = 'text';
      } else {
        const letter = answer.toUpperCase().replace(/[^A-D]/g, '').slice(0, 1);
        if (!letter) errors.push('Row ' + (i + 2) + ': no correct answer letter (A to D), so it is unmarked.');
        const q = { id: newId(), type: 'mcq', prompt, options, maxMark };
        questions.push(q);
        if (letter) key[q.id] = letter;
        return;
      }
    }
    const q = { id: newId(), type: 'text', prompt, maxMark };
    questions.push(q);
    if (answer) key[q.id] = answer;
  });

  if (!questions.length) errors.push('No questions found.');
  return { questions, key, errors };
}

export function questionsToCSV(set, key) {
  const head = ['type', 'question', 'optionA', 'optionB', 'optionC', 'optionD', 'answer', 'maxMark'];
  const q = c => '"' + String(c ?? '').replace(/"/g, '""') + '"';
  const lines = [head.join(',')];
  for (const item of set.questions || []) {
    const o = item.options || [];
    lines.push([
      item.type, item.prompt, o[0] || '', o[1] || '', o[2] || '', o[3] || '',
      (key && key[item.id]) || '', item.maxMark || 1
    ].map(q).join(','));
  }
  return lines.join('\n');
}

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
