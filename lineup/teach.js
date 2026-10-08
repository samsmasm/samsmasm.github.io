// Lineup - the teacher page: your decks, making one with AI, editing,
// sharing, starter decks, and your running sessions.
//
// Screens are picked by the address, so a link or a reload lands in the same
// place: teach.html (home), ?new=1, ?edit=DECKID, ?copy=DECKID (a shared deck).

import {
  teacherFirebase, ROOMS, DECKS, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  collection, query, where, serverTimestamp
} from './firebase.js?v=20261008-193745';
import {
  MIN_CARDS, MAX_CARDS, FIELDS, blankDeck, normaliseDeck, checkDeck, nextCardId,
  playable, buildPrompt, buildRevisePrompt, parseReply
} from './deck.js?v=20261008-193745';
import { STARTERS } from './starters.js?v=20261008-193745';
import { fmt, createRoom, deleteRoom, armable } from './teacher.js?v=20261008-193745';

const $ = id => document.getElementById(id);
const fb = teacherFirebase();
const db = fb.db;

let user = null;
let deckId = null;     // the deck open in the editor, or null when it is not saved yet
let deck = null;       // what the editor holds
let dirty = false;
let shared = false;

/* ---------- screens ---------- */

const VIEWS = ['loading', 'signInView', 'homeView', 'newView', 'editView', 'copyView'];
function show(id) {
  for (const v of VIEWS) $(v).classList.toggle('hidden', v !== id);
  window.scrollTo(0, 0);
}

function go(search) {
  history.pushState(null, '', location.pathname + search);
  route();
}
window.addEventListener('popstate', () => { if (user) route(); });

function route() {
  const p = new URLSearchParams(location.search);
  if (p.get('edit')) openDeck(p.get('edit'));
  else if (p.get('copy')) openShared(p.get('copy'));
  else if (p.get('new')) openNew();
  else goHome();
}

document.querySelectorAll('[data-home]').forEach(b => b.addEventListener('click', () => {
  if (dirty && !confirmLeave()) return;
  go('');
}));

// A gentle guard instead of a browser dialog: the first tap warns, the second leaves.
let leaveArmed = 0;
function confirmLeave() {
  if (Date.now() - leaveArmed < 5000) { dirty = false; return true; }
  leaveArmed = Date.now();
  setSaveState('Unsaved changes. Tap Back again to leave without saving.', true);
  return false;
}
window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

fb.onAuth(u => {
  user = u && !u.isAnonymous ? u : null;
  $('signedBox').classList.toggle('hidden', !user);
  if (!user) { show('signInView'); return; }
  $('whoami').textContent = user.displayName || user.email || '';
  route();
});

$('signInBtn').addEventListener('click', async () => {
  try { await fb.signIn(); }
  catch (e) { $('signInMsg').textContent = 'Sign in did not work: ' + (e.code || e.message); }
});
$('signOutBtn').addEventListener('click', () => fb.signOut());

/* ---------- home ---------- */

function li(name, sub) {
  const item = document.createElement('li');
  item.innerHTML = '<div class="what"><div class="name"></div><div class="sub"></div></div>';
  item.querySelector('.name').textContent = name;
  item.querySelector('.sub').textContent = sub || '';
  return item;
}

function btn(text, onClick, cls) {
  const b = document.createElement('button');
  b.textContent = text;
  if (cls) b.className = cls;
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

async function goHome() {
  show('homeView');
  $('homeMsg').textContent = '';
  loadSessions();
  loadDecks();
  renderStarters();
}

async function loadSessions() {
  const list = $('sessionList');
  list.innerHTML = '<li>Loading...</li>';
  try {
    const snap = await getDocs(query(collection(db, ROOMS), where('ownerUid', '==', user.uid)));
    const all = snap.docs.map(d => ({ code: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
    list.innerHTML = '';
    if (!all.length) list.innerHTML = '<li class="sub">None yet. Start one from a deck below.</li>';
    for (const r of all) {
      const open = r.expireAt.toMillis() > Date.now();
      const item = li((r.deck && r.deck.title) || 'Untitled deck',
        'Started ' + fmt(r.createdAt) + (open ? '. Open to students until ' + fmt(r.expireAt) + '.' : '. Closed to students.'));
      const code = document.createElement('span');
      code.className = 'code';
      code.textContent = r.code;
      item.prepend(code);
      item.append(btn('Open class screen', () => { location.href = 'class.html?room=' + r.code; }));
      const del = btn('Delete', null, 'danger');
      armable(del, 'Tap again to delete', async () => { await deleteRoom(db, r.code); item.remove(); });
      item.append(del);
      list.appendChild(item);
    }
  } catch (e) {
    console.error(e);
    list.innerHTML = '<li>Could not load your sessions (' + (e.code || e.message) + ').</li>';
  }
}

async function loadDecks() {
  const list = $('deckList');
  list.innerHTML = '<li>Loading...</li>';
  try {
    const snap = await getDocs(query(collection(db, DECKS), where('ownerUid', '==', user.uid)));
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
    list.innerHTML = '';
    if (!all.length) list.innerHTML = '<li class="sub">No decks yet. Make one, or add a starter deck.</li>';
    for (const d of all) {
      const n = (d.cards || []).length;
      const item = li(d.title || 'Untitled deck', n + ' cards. ' + (d.question || ''));
      if (d.shared) {
        const b = document.createElement('span');
        b.className = 'badge';
        b.textContent = 'Shared';
        item.querySelector('.name').append(b);
      }
      const start = btn('Start a session', async () => {
        start.disabled = true;
        try { await startSession(d.id, normaliseDeck(d)); }
        catch (e) { console.error(e); $('homeMsg').textContent = 'Could not start a session (' + (e.code || e.message) + ').'; start.disabled = false; }
      });
      item.append(start, btn('Edit', () => go('?edit=' + d.id), 'quiet'));
      const del = btn('Delete', null, 'danger');
      armable(del, 'Tap again to delete', async () => { await deleteDoc(doc(db, DECKS, d.id)); item.remove(); });
      item.append(del);
      list.appendChild(item);
    }
  } catch (e) {
    console.error(e);
    list.innerHTML = '<li>Could not load your decks (' + (e.code || e.message) + ').</li>';
  }
}

function renderStarters() {
  const list = $('starterList');
  list.innerHTML = '';
  for (const s of STARTERS) {
    const item = li(s.title, s.cards.length + ' cards. ' + s.question);
    item.append(btn('Preview', () => preview(s), 'quiet'));
    const add = btn('Add to my decks', async () => {
      add.disabled = true;
      try { const id = await saveNew(normaliseDeck(s)); go('?edit=' + id); }
      catch (e) { console.error(e); $('homeMsg').textContent = 'Could not add it (' + (e.code || e.message) + ').'; add.disabled = false; }
    });
    item.append(add);
    list.appendChild(item);
  }
}

async function startSession(id, d) {
  const code = await createRoom(db, user.uid, id, d);
  location.href = 'class.html?room=' + code;
}

$('newBtn').addEventListener('click', () => go('?new=1'));

/* ---------- saving ---------- */

function record(d) {
  return { ...playable(d), ownerUid: user.uid, ownerName: user.displayName || '', updatedAt: serverTimestamp() };
}

async function saveNew(d) {
  const ref = await addDoc(collection(db, DECKS), { ...record(d), shared: false, createdAt: serverTimestamp() });
  return ref.id;
}

/* ---------- making a deck with AI ---------- */

const NEW_FIELDS = { nSubject: 'subject', nLevel: 'level', nTopic: 'topic', nQuestion: 'question', nCount: 'count', nNotes: 'notes' };

for (let n = 6; n <= 12; n++) {
  const o = document.createElement('option');
  o.value = n;
  o.textContent = n;
  $('nCount').appendChild(o);
}
$('nCount').value = '10';

// The details are remembered on this device, for the next deck.
try {
  const saved = JSON.parse(localStorage.getItem('lineup:new') || '{}');
  for (const [id, key] of Object.entries(NEW_FIELDS)) if (saved[key]) $(id).value = saved[key];
  $('nTags').checked = !!saved.tags;
} catch (e) {}

function details() {
  const d = { tags: $('nTags').checked };
  for (const [id, key] of Object.entries(NEW_FIELDS)) d[key] = $(id).value.trim();
  return d;
}

function refreshPrompt() {
  const d = details();
  $('promptBox').value = buildPrompt(d);
  try { localStorage.setItem('lineup:new', JSON.stringify(d)); } catch (e) {}
}
for (const id of [...Object.keys(NEW_FIELDS), 'nTags']) $(id).addEventListener('input', refreshPrompt);

function openNew() {
  show('newView');
  refreshPrompt();
  $('replyMsg').textContent = '';
  $('copyMsg').textContent = '';
}

async function copyText(text, msgEl) {
  try {
    await navigator.clipboard.writeText(text);
    msgEl.textContent = 'Copied. Now paste it into the chatbot.';
  } catch (e) {
    msgEl.textContent = 'Could not copy automatically. Open "See the prompt", select it all and copy it.';
  }
}

$('copyPromptBtn').addEventListener('click', () => {
  refreshPrompt();
  if (!$('nTopic').value.trim() && !$('nQuestion').value.trim()) {
    $('copyMsg').textContent = 'Fill in at least the topic or the compelling question first.';
    return;
  }
  copyText($('promptBox').value, $('copyMsg'));
});

$('checkReplyBtn').addEventListener('click', () => {
  $('replyMsg').textContent = '';
  let d;
  try { d = parseReply($('replyBox').value); }
  catch (e) { $('replyMsg').textContent = e.message; return; }
  if (!d.cards.length) { $('replyMsg').textContent = 'That reply has no cards in it. Ask the chatbot to send the whole JSON again.'; return; }
  $('replyBox').value = '';
  history.pushState(null, '', location.pathname + '?new=1&draft=1');
  openEditor(null, d, { fromAI: true });
});

$('blankBtn').addEventListener('click', () => {
  const d = blankDeck();
  for (let i = 0; i < MIN_CARDS; i++) d.cards.push({ id: 'c' + (i + 1), text: '', note: '' });
  history.pushState(null, '', location.pathname + '?new=1&draft=1');
  openEditor(null, d, {});
});

/* ---------- the editor ---------- */

async function openDeck(id) {
  show('loading');
  try {
    const snap = await getDoc(doc(db, DECKS, id));
    if (!snap.exists() || snap.data().ownerUid !== user.uid) { openShared(id); return; }
    shared = !!snap.data().shared;
    openEditor(id, normaliseDeck(snap.data()), {});
  } catch (e) {
    console.error(e);
    $('loading').innerHTML = '<p>Could not open that deck (' + (e.code || e.message) + '). <a href="teach.html">Back to your decks</a></p>';
  }
}

function openEditor(id, d, { fromAI }) {
  deckId = id;
  deck = d;
  if (!id) shared = false;
  dirty = !id;
  show('editView');
  $('aiWarn').classList.toggle('hidden', !fromAI);
  $('editHead').textContent = id ? 'Edit deck' : 'Your new deck';
  for (const el of document.querySelectorAll('#editView [data-field]')) el.value = deck[el.dataset.field] || '';
  $('problems').classList.add('hidden');
  $('reviseMsg').textContent = '';
  $('reviseCopyMsg').textContent = '';
  renderCards();
  renderShare();
  $('deleteDeckBtn').classList.toggle('hidden', !id);
  setSaveState(id ? 'Saved.' : 'Not saved yet.', !id);
}

function setSaveState(text, warn) {
  $('saveState').textContent = text;
  $('saveState').classList.toggle('dirty', !!warn);
}

function markDirty() {
  dirty = true;
  setSaveState('Unsaved changes.', true);
}

for (const el of document.querySelectorAll('#editView [data-field]')) {
  el.addEventListener('input', () => { deck[el.dataset.field] = el.value; markDirty(); });
}

function renderCards() {
  const box = $('cardsBox');
  box.innerHTML = '';
  deck.cards.forEach((card, i) => {
    const f = document.createElement('div');
    f.className = 'cardedit';
    f.innerHTML =
      '<div class="head"><span class="num"></span></div>' +
      '<div class="cardline"><div><label class="f">Card text</label><input type="text" data-k="text"></div>' +
      '<div><label class="f">Tag <span class="hint">(optional)</span></label><input type="text" data-k="tag" maxlength="16"></div></div>' +
      '<label class="f">Reveal note</label><textarea data-k="note"></textarea>';
    f.querySelector('.num').textContent = 'Card ' + (i + 1);
    const head = f.querySelector('.head');
    const up = btn('Move up', () => move(i, -1), 'quiet');
    const down = btn('Move down', () => move(i, 1), 'quiet');
    const rm = btn('Remove', () => { deck.cards.splice(i, 1); markDirty(); renderCards(); }, 'danger');
    up.disabled = i === 0;
    down.disabled = i === deck.cards.length - 1;
    rm.disabled = deck.cards.length <= MIN_CARDS;
    head.append(up, down, rm);
    f.querySelectorAll('[data-k]').forEach((el, k) => {
      const key = el.dataset.k;
      const uid = 'card' + i + key;
      el.id = uid;
      el.previousElementSibling.htmlFor = uid;
      el.value = card[key] || '';
      el.addEventListener('input', () => {
        if (key === 'tag' && !el.value.trim()) delete card.tag; else card[key] = el.value;
        markDirty();
      });
    });
    box.appendChild(f);
  });
  $('addCardBtn').disabled = deck.cards.length >= MAX_CARDS;
  $('addCardBtn').textContent = deck.cards.length >= MAX_CARDS ? MAX_CARDS + ' cards is the most a deck can have' : 'Add a card';
}

function move(i, dir) {
  const j = i + dir;
  [deck.cards[i], deck.cards[j]] = [deck.cards[j], deck.cards[i]];
  markDirty();
  renderCards();
}

$('addCardBtn').addEventListener('click', () => {
  deck.cards.push({ id: nextCardId(deck.cards), text: '', note: '' });
  markDirty();
  renderCards();
  const inputs = $('cardsBox').querySelectorAll('[data-k="text"]');
  inputs[inputs.length - 1].focus();
});

function showProblems(list) {
  const box = $('problems');
  box.classList.toggle('hidden', !list.length);
  if (!list.length) return;
  box.innerHTML = '<strong>Fix these first:</strong><ul></ul>';
  for (const p of list) {
    const item = document.createElement('li');
    item.textContent = p;
    box.querySelector('ul').appendChild(item);
  }
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function save() {
  const d = normaliseDeck(deck);
  const problems = checkDeck(d);
  showProblems(problems);
  if (problems.length) return false;
  setSaveState('Saving...');
  try {
    if (deckId) {
      await updateDoc(doc(db, DECKS, deckId), record(d));
    } else {
      deckId = await saveNew(d);
      history.replaceState(null, '', location.pathname + '?edit=' + deckId);
      $('editHead').textContent = 'Edit deck';
      $('deleteDeckBtn').classList.remove('hidden');
      renderShare();
    }
    deck = d;
    dirty = false;
    setSaveState('Saved.');
    return true;
  } catch (e) {
    console.error(e);
    setSaveState('Could not save (' + (e.code || e.message) + ').', true);
    return false;
  }
}

$('saveBtn').addEventListener('click', save);

$('startBtn').addEventListener('click', async () => {
  $('startBtn').disabled = true;
  try {
    if (dirty || !deckId) { if (!(await save())) return; }
    setSaveState('Starting a session...');
    await startSession(deckId, deck);
  } catch (e) {
    console.error(e);
    setSaveState('Could not start a session (' + (e.code || e.message) + ').', true);
  } finally {
    $('startBtn').disabled = false;
  }
});

function preview(d) {
  try { localStorage.setItem('lineup:preview-deck', JSON.stringify(playable(d))); } catch (e) {}
  window.open('./?preview=1', '_blank');
}
$('previewBtn').addEventListener('click', () => preview(deck));

armable($('deleteDeckBtn'), 'Tap again: this deletes the deck', async () => {
  await deleteDoc(doc(db, DECKS, deckId));
  dirty = false;
  go('');
});

/* ---------- changing a deck with AI ---------- */

$('copyReviseBtn').addEventListener('click', () => {
  copyText(buildRevisePrompt(normaliseDeck(deck), $('reviseWhat').value.trim()), $('reviseCopyMsg'));
});

$('applyReviseBtn').addEventListener('click', () => {
  $('reviseMsg').textContent = '';
  let d;
  try { d = parseReply($('reviseReply').value, { keepIds: true }); }
  catch (e) { $('reviseMsg').textContent = e.message; return; }
  if (!d.cards.length) { $('reviseMsg').textContent = 'That reply has no cards in it.'; return; }
  $('reviseReply').value = '';
  $('reviseBox').open = false;
  openEditor(deckId, d, { fromAI: true });
  markDirty();
});

/* ---------- sharing ---------- */

function renderShare() {
  $('shareBox').classList.toggle('hidden', !deckId);
  if (!deckId) return;
  $('shareToggle').checked = shared;
  $('shareLinks').classList.toggle('hidden', !shared);
  $('teacherLink').value = new URL('teach.html?copy=' + deckId, location.href).href;
  $('studentLink').value = new URL('./?deck=' + deckId, location.href).href;
}

$('shareToggle').addEventListener('change', async () => {
  const want = $('shareToggle').checked;
  $('shareToggle').disabled = true;
  try {
    await updateDoc(doc(db, DECKS, deckId), { shared: want, updatedAt: serverTimestamp() });
    shared = want;
  } catch (e) {
    console.error(e);
    setSaveState('Could not change sharing (' + (e.code || e.message) + ').', true);
  }
  $('shareToggle').disabled = false;
  renderShare();
});

document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
  const input = $(b.dataset.copy);
  try { await navigator.clipboard.writeText(input.value); b.textContent = 'Copied'; }
  catch (e) { input.select(); b.textContent = 'Select and copy'; }
  setTimeout(() => { b.textContent = 'Copy'; }, 2500);
}));

/* ---------- a deck someone shared ---------- */

async function openShared(id) {
  show('copyView');
  const body = $('copyBody');
  body.innerHTML = '<p>Loading...</p>';
  let d, by;
  try {
    const snap = await getDoc(doc(db, DECKS, id));
    if (!snap.exists()) throw new Error('missing');
    if (snap.data().ownerUid === user.uid) { go('?edit=' + id); return; }
    d = normaliseDeck(snap.data());
    by = snap.data().ownerName || '';
  } catch (e) {
    console.error(e);
    body.innerHTML = '<div class="box big"><p>That deck is not shared any more, or the link is wrong.</p></div>';
    return;
  }
  body.innerHTML =
    '<h2></h2><p class="by sub"></p>' +
    '<div class="box task"><p class="q" style="font-weight:700;font-size:1.2rem;margin:0"></p></div>' +
    '<div class="ends-preview"><span class="l"></span><span class="r"></span></div>' +
    '<ul class="preview-cards"></ul>' +
    '<div class="box big"><p class="refl"></p></div>' +
    '<div class="row-btns"><button id="addSharedBtn">Add a copy to my decks</button>' +
    '<button class="quiet" id="previewSharedBtn">Preview as a student</button></div>' +
    '<p class="msg" id="sharedMsg"></p>';
  body.querySelector('h2').textContent = d.title;
  body.querySelector('.by').textContent = (by ? 'Shared by ' + by + '. ' : '') + d.cards.length + ' cards. Your copy is yours to change.';
  body.querySelector('.q').textContent = d.question;
  body.querySelector('.l').textContent = '← ' + d.left;
  body.querySelector('.r').textContent = d.right + ' →';
  body.querySelector('.refl').textContent = d.reflection;
  for (const c of d.cards) {
    const item = document.createElement('li');
    item.innerHTML = '<div class="t"></div><div class="n"></div>';
    item.querySelector('.t').textContent = (c.tag ? c.tag + ': ' : '') + c.text;
    item.querySelector('.n').textContent = c.note;
    body.querySelector('.preview-cards').appendChild(item);
  }
  $('previewSharedBtn').addEventListener('click', () => preview(d));
  $('addSharedBtn').addEventListener('click', async () => {
    $('addSharedBtn').disabled = true;
    try { const newId = await saveNew(d); go('?edit=' + newId); }
    catch (e) { console.error(e); $('sharedMsg').textContent = 'Could not add it (' + (e.code || e.message) + ').'; $('addSharedBtn').disabled = false; }
  });
}
