// Lineup - the student page: sort the cards, reveal, reflect.
//
// Everything is saved on the device first (localStorage), so a reload or a
// dropped connection loses nothing. In a room, placements are also sent to
// Firestore under an anonymous account: card ids and numbers from 0 to 100,
// nothing else. Students write their reflection in their notebooks.
//
// The deck comes from one of three places:
//   ?room=CODE   a class session: the deck copied onto the room when it started
//   ?deck=ID     a deck its teacher has shared: sort on your own, nothing sent
//   ?preview=1   the teacher's editor, through localStorage: nothing saved

import { normaliseDeck } from './deck.js?v=20261008-193745';

const $ = id => document.getElementById(id);
const board = $('board');
const guides = $('guides');
const tray = $('tray');

const LINE_Y = 26;      // where the line sits inside the board
const CARD_TOP = 50;    // first row of cards, below the line
const GAP = 8;          // space between stacked cards

let state = null;       // { key, room, placed, before }
let selected = null;    // card id picked by a tap
let drag = null;
let fb = null;          // { db, user, api, expireAt } once in a room
let D = null;           // the deck
let CARDS = [];

function setDeck(raw) {
  D = normaliseDeck(raw);
  CARDS = D.cards;
  document.title = D.title ? D.title + ' · Lineup' : 'Lineup';
  $('leftEnd').textContent = '← ' + D.left;
  $('rightEnd').textContent = D.right + ' →';
  $('reflectQ').textContent = D.reflection;
  document.querySelectorAll('.question').forEach(h => { h.textContent = D.question; });
  $('introText').textContent = D.intro;
  $('intro').classList.toggle('hidden', !D.intro);
  $('instructions').textContent = D.instructions;
  $('instructions').classList.toggle('hidden', !D.instructions);
  $('notes').innerHTML = '';
}

/* ---------- saving on the device ---------- */

function load(key) {
  let saved = null;
  if (key !== 'preview') try { saved = JSON.parse(localStorage.getItem('lineup:' + key)); } catch (e) {}
  const s = { key, placed: {}, before: null };
  if (saved) Object.assign(s, saved);
  // Drop anything for a card that is no longer in the deck.
  const ids = new Set(CARDS.map(c => c.id));
  for (const id of Object.keys(s.placed)) if (!ids.has(id)) delete s.placed[id];
  return s;
}

function save() {
  if (state.key === 'preview') return;
  try {
    localStorage.setItem('lineup:' + state.key, JSON.stringify({
      placed: state.placed, before: state.before
    }));
  } catch (e) {}
}

/* ---------- joining ---------- */

const codeInput = $('codeInput');
codeInput.addEventListener('input', () => {
  codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z]/g, '');
});
codeInput.addEventListener('keydown', e => { if (e.key === 'Enter') join(); });
$('joinBtn').addEventListener('click', () => join());

function joinMsg(text) {
  $('joinMsg').textContent = text;
  $('joinMsg').className = 'msg' + (text ? ' bad' : '');
}

async function join() {
  const code = codeInput.value.trim();
  if (code.length !== 4) { joinMsg('The room code has 4 letters.'); return; }
  $('joinBtn').disabled = true;
  $('joinMsg').textContent = 'Joining...';
  $('joinMsg').className = 'msg';
  try {
    await connect();
    const { api } = fb;
    const snap = await api.getDoc(api.doc(fb.db, api.ROOMS, code));
    if (!snap.exists()) { joinMsg('No class has that code. Check the board and try again.'); return; }
    const expireAt = snap.data().expireAt;
    if (expireAt.toMillis() < Date.now()) { joinMsg('That session has ended.'); return; }
    fb.expireAt = expireAt;
    setDeck(snap.data().deck);
    history.replaceState(null, '', '?room=' + code);
    start('room-' + code, code);
    push();
  } catch (e) {
    console.error(e);
    joinMsg('Could not reach the class screen. Check the internet connection and try again.');
  } finally {
    $('joinBtn').disabled = false;
  }
}

async function connect() {
  if (fb && fb.db) return;
  const api = await import('./firebase.js?v=20261008-193745');
  const { db, ready } = api.studentFirebase();
  const user = await ready;
  fb = { db, user, api };
}

// A shared deck, sorted alone. Nothing is sent anywhere.
async function openShared(id) {
  $('joinMsg').textContent = 'Loading...';
  $('joinMsg').className = 'msg';
  try {
    await connect();
    const snap = await fb.api.getDoc(fb.api.doc(fb.db, fb.api.DECKS, id));
    if (!snap.exists()) throw new Error('missing');
    setDeck(snap.data());
    start('deck-' + id, null);
  } catch (e) {
    console.error(e);
    joinMsg('That link does not work any more. Its teacher may have stopped sharing it. You can still join a class with a room code.');
  }
}

function start(key, room) {
  state = load(key);
  state.room = room;
  $('joinView').classList.add('hidden');
  $('sortView').classList.remove('hidden');
  $('syncMsg').textContent = room ? 'Room ' + room + '.' : key === 'preview' ? '' : 'Sorting on your own. Nothing is sent anywhere.';
  render();
}

/* ---------- sending to the class screen ---------- */

let pushTimer = null;
function schedulePush() {
  if (!state.room) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, 700);
}

async function push() {
  if (!state.room || !fb) return;
  clearTimeout(pushTimer);
  const { api, db, user } = fb;
  const data = { now: state.placed, updatedAt: api.serverTimestamp(), expireAt: fb.expireAt };
  if (state.before) data.before = state.before;
  try {
    await api.setDoc(api.doc(db, api.ROOMS, state.room, 'placements', user.uid), data);
    const n = Object.keys(state.placed).length;
    $('syncMsg').textContent = n
      ? 'Room ' + state.room + '. Your cards are showing on the class screen.'
      : 'Room ' + state.room + '. Your cards will show on the class screen as you place them.';
  } catch (e) {
    console.error(e);
    $('syncMsg').textContent = e.code === 'permission-denied'
      ? 'This class session has ended. Your sort is still saved on this device.'
      : 'Could not reach the class screen. Your sort is saved on this device, so keep going.';
  }
}

/* ---------- changing placements ---------- */

function changed() {
  save();
  schedulePush();
  render();
}

function place(id, pos) {
  state.placed[id] = Math.round(Math.max(0, Math.min(100, pos)));
  selected = null;
  changed();
}

function unplace(id) {
  delete state.placed[id];
  changed();
}

/* ---------- drawing ---------- */

function cardEl(card) {
  const el = document.createElement('div');
  el.className = 'card' + (selected === card.id ? ' selected' : '');
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.dataset.id = card.id;
  if (card.tag) {
    const tag = document.createElement('span');
    tag.className = 'era';
    tag.textContent = card.tag;
    el.append(tag);
  }
  el.append(document.createTextNode(card.text));
  const pos = state.placed[card.id];
  el.setAttribute('aria-label', card.text + (pos == null
    ? '. Not placed yet. Press the arrow keys to place it.'
    : '. ' + pos + ' out of 100 toward "' + D.right + '". Arrow keys move it, Delete sends it back.'));
  el.addEventListener('pointerdown', e => dragStart(e, card.id, el));
  el.addEventListener('keydown', e => onKey(e, card.id));
  return el;
}

function geometry() {
  const W = board.clientWidth;
  const cardW = Math.round(Math.max(130, Math.min(200, W * 0.19)));
  const pad = 22; // the line runs nearly edge to edge; cards are kept inside the board
  return { W, cardW, pad, x: pos => pad + (pos / 100) * (W - 2 * pad) };
}

function render() {
  const focusedId = document.activeElement && document.activeElement.dataset
    ? document.activeElement.dataset.id : null;

  board.querySelectorAll('.card, .empty, .ghost').forEach(n => n.remove());
  tray.innerHTML = '';

  const g = geometry();
  const onBoard = CARDS.filter(c => state.placed[c.id] != null)
    .sort((a, b) => state.placed[a.id] - state.placed[b.id]);

  // Place cards, measure them, then stack them so none overlap.
  const boxes = [];
  for (const card of onBoard) {
    const el = cardEl(card);
    el.style.width = g.cardW + 'px';
    el.style.left = '0px';
    el.style.top = '0px';
    board.appendChild(el);
    const h = el.offsetHeight;
    const cx = g.x(state.placed[card.id]);
    const x0 = Math.max(0, Math.min(g.W - g.cardW, cx - g.cardW / 2)), x1 = x0 + g.cardW;
    const side = boxes.filter(b => b.x0 < x1 + GAP && b.x1 > x0 - GAP);
    const tries = [0, ...side.map(b => b.y1 + GAP)].sort((a, b) => a - b);
    const y = tries.find(t => side.every(b => t >= b.y1 + GAP || t + h + GAP <= b.y0));
    boxes.push({ el, cx, x0, x1, y0: y, y1: y + h });
    el.style.left = x0 + 'px';
    el.style.top = (CARD_TOP + y) + 'px';
  }

  const bottom = boxes.reduce((m, b) => Math.max(m, b.y1), 0);
  const H = Math.max(180, CARD_TOP + bottom + 20);
  board.style.height = H + 'px';

  if (!onBoard.length) {
    const hint = document.createElement('div');
    hint.className = 'empty';
    hint.textContent = 'Drop cards anywhere along the line';
    board.appendChild(hint);
  }

  // The line, its tick marks, and a stem from the line to each card.
  const blue = '#1a4fa0';
  let svg = '<line x1="' + g.pad + '" y1="' + LINE_Y + '" x2="' + (g.W - g.pad) + '" y2="' + LINE_Y +
    '" stroke="#14141f" stroke-width="5" stroke-linecap="round"/>';
  for (const t of [0, 25, 50, 75, 100]) {
    const x = g.x(t);
    svg += '<line x1="' + x + '" y1="' + (LINE_Y - 12) + '" x2="' + x + '" y2="' + (LINE_Y + 12) +
      '" stroke="#14141f" stroke-width="' + (t === 50 ? 4 : 3) + '"/>';
  }
  for (const b of boxes) {
    svg += '<line x1="' + b.cx + '" y1="' + LINE_Y + '" x2="' + b.cx + '" y2="' + (CARD_TOP + b.y0) +
      '" stroke="' + blue + '" stroke-opacity="0.45" stroke-width="3"/>';
    svg += '<circle cx="' + b.cx + '" cy="' + LINE_Y + '" r="8" fill="' + blue + '"/>';
  }
  guides.innerHTML = svg;

  // The tray.
  const inTray = CARDS.filter(c => state.placed[c.id] == null);
  for (const card of inTray) tray.appendChild(cardEl(card));
  if (!inTray.length) {
    const done = document.createElement('span');
    done.className = 'tray-done';
    done.textContent = 'All cards placed. Drag a card here to take it off the line.';
    tray.appendChild(done);
  }

  // Reveal button and what comes after it.
  const revealed = !!state.before;
  $('revealBtn').classList.toggle('hidden', revealed);
  $('revealBtn').disabled = inTray.length > 0;
  $('leftCount').textContent = revealed ? '' : inTray.length
    ? inTray.length + (inTray.length === 1 ? ' card' : ' cards') + ' still to place.'
    : 'Happy with your sort? Tap Reveal.';
  $('afterReveal').classList.toggle('hidden', !revealed);
  $('trayLabel').textContent = inTray.length ? 'Cards to place' : 'Tray';
  if (revealed) renderNotes();
  renderTapNote();

  if (focusedId) {
    const again = document.querySelector('.card[data-id="' + focusedId + '"]');
    if (again) again.focus({ preventScroll: true });
  }
}

function renderNotes() {
  const box = $('notes');
  if (box.childElementCount) {
    box.querySelectorAll('.box').forEach(n => n.classList.toggle('lit', n.dataset.id === selected));
    return;
  }
  for (const card of CARDS) {
    const n = document.createElement('div');
    n.className = 'box info';
    n.dataset.id = card.id;
    const h = document.createElement('h3');
    h.textContent = card.text;
    const p = document.createElement('p');
    p.textContent = card.note;
    n.append(h, p);
    box.appendChild(n);
  }
  renderNotes();
}

function renderTapNote() {
  const box = $('tapNote');
  const card = state.before && selected && CARDS.find(c => c.id === selected);
  box.classList.toggle('hidden', !card);
  if (card) {
    box.innerHTML = '';
    const b = document.createElement('strong');
    b.textContent = card.text + ': ';
    box.append(b, document.createTextNode(card.note));
  }
}

/* ---------- dragging, tapping and keys ---------- */

function overBoard(clientY) {
  const r = board.getBoundingClientRect();
  return clientY >= r.top - 90 && clientY <= r.bottom + 10;
}

function posAt(clientX) {
  const r = board.getBoundingClientRect();
  const g = geometry();
  return ((clientX - r.left - g.pad) / (g.W - 2 * g.pad)) * 100;
}

function showGhost(clientX) {
  let ghost = board.querySelector('.ghost');
  if (!ghost) {
    ghost = document.createElement('div');
    ghost.className = 'ghost';
    board.appendChild(ghost);
  }
  const g = geometry();
  ghost.style.left = g.x(Math.max(0, Math.min(100, posAt(clientX)))) + 'px';
}

function dragStart(e, id, el) {
  if (e.button > 0 || drag) return;
  if (e.pointerType === 'mouse') e.preventDefault(); // stops a mouse drag selecting text
  el.setPointerCapture(e.pointerId);
  drag = { id, el, x: e.clientX, y: e.clientY, moved: false };
  el.addEventListener('pointermove', dragMove);
  el.addEventListener('pointerup', dragEnd);
  el.addEventListener('pointercancel', dragCancel);
}

function dragMove(e) {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) < 8) return;
  drag.moved = true;
  drag.el.classList.add('dragging');
  drag.el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  const ghost = board.querySelector('.ghost');
  if (overBoard(e.clientY)) showGhost(e.clientX);
  else if (ghost) ghost.remove();
  // Scroll the page when a finger drags near the top or bottom edge.
  if (e.clientY < 70) window.scrollBy(0, -14);
  else if (e.clientY > window.innerHeight - 70) window.scrollBy(0, 14);
}

function dragEnd(e) {
  if (!drag) return;
  const { id, moved } = drag;
  drag = null;
  if (!moved) {
    selected = selected === id ? null : id;
    render();
  } else if (overBoard(e.clientY)) {
    place(id, posAt(e.clientX));
  } else if (state.placed[id] != null) {
    unplace(id);
  } else {
    render();
  }
}

function dragCancel() {
  drag = null;
  render();
}

// Tap a card, then tap the line.
board.addEventListener('click', e => {
  if (e.target.closest('.card') || !selected) return;
  place(selected, posAt(e.clientX));
});

// Tap the tray with a card selected to take it back off the line.
tray.addEventListener('click', e => {
  if (e.target.closest('.card') || !selected) return;
  if (state.placed[selected] != null) { const id = selected; selected = null; unplace(id); }
});

function onKey(e, id) {
  const pos = state.placed[id];
  const step = e.shiftKey ? 1 : 5;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    const dir = e.key === 'ArrowLeft' ? -1 : 1;
    state.placed[id] = pos == null ? 50 : Math.max(0, Math.min(100, pos + dir * step));
    changed();
  } else if ((e.key === 'Delete' || e.key === 'Backspace') && pos != null) {
    e.preventDefault();
    unplace(id);
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    selected = selected === id ? null : id;
    render();
  }
}

/* ---------- reveal ---------- */

$('revealBtn').addEventListener('click', () => {
  state.before = { ...state.placed };
  selected = null;
  save();
  push();
  render();
  $('afterReveal').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

let resizeTimer = null;
window.addEventListener('resize', () => {
  if (!state || drag) return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(render, 120);
});

/* ---------- start ---------- */

const params = new URLSearchParams(location.search);
if (params.get('room')) {
  codeInput.value = params.get('room').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  join();
} else if (params.get('deck')) {
  openShared(params.get('deck'));
} else if (params.get('preview')) {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem('lineup:preview-deck')); } catch (e) {}
  if (raw) {
    setDeck(raw);
    $('previewNote').classList.remove('hidden');
    start('preview', null);
  }
}
