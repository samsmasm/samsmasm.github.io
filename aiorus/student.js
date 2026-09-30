// aiorus - the student page: sort the cards, reveal, reflect.
//
// Everything is saved on the device first (localStorage), so a reload or a
// dropped connection loses nothing. In a room, placements are also sent to
// Firestore under an anonymous account: card ids and numbers from 0 to 100,
// nothing else. The written reflection never leaves the device.

import { CARDS, LEFT_END, RIGHT_END, REFLECTION } from './cards.js';

const $ = id => document.getElementById(id);
const board = $('board');
const guides = $('guides');
const tray = $('tray');

const LINE_Y = 26;      // where the line sits inside the board
const CARD_TOP = 50;    // first row of cards, below the line
const GAP = 8;          // space between stacked cards

let state = null;       // { key, room, placed, before, reflection }
let selected = null;    // card id picked by a tap
let drag = null;
let fb = null;          // { db, user, api, expireAt } once in a room

$('leftEnd').textContent = '← ' + LEFT_END;
$('rightEnd').textContent = RIGHT_END + ' →';
$('reflectQ').textContent = REFLECTION;

/* ---------- saving on the device ---------- */

function load(key) {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('aiorus:' + key)); } catch (e) {}
  const s = { key, placed: {}, before: null, reflection: '' };
  if (saved) Object.assign(s, saved);
  // Drop anything for a card that has since been removed from cards.js.
  const ids = new Set(CARDS.map(c => c.id));
  for (const id of Object.keys(s.placed)) if (!ids.has(id)) delete s.placed[id];
  return s;
}

function save() {
  try {
    localStorage.setItem('aiorus:' + state.key, JSON.stringify({
      placed: state.placed, before: state.before, reflection: state.reflection
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
$('soloBtn').addEventListener('click', () => start('solo', null));

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
    const api = await import('./firebase.js');
    if (!fb || !fb.db) {
      const { db, ready } = api.studentFirebase();
      const user = await ready;
      fb = { db, user, api };
    }
    const snap = await api.getDoc(api.doc(fb.db, api.ROOMS, code));
    if (!snap.exists()) { joinMsg('No class has that code. Check the board and try again.'); return; }
    const expireAt = snap.data().expireAt;
    if (expireAt.toMillis() < Date.now()) { joinMsg('That session has ended.'); return; }
    fb.expireAt = expireAt;
    history.replaceState(null, '', '?room=' + code);
    start('room-' + code, code);
    push();
  } catch (e) {
    console.error(e);
    joinMsg('Could not reach the class screen. You can still sort on your own below.');
  } finally {
    $('joinBtn').disabled = false;
  }
}

function start(key, room) {
  state = load(key);
  state.room = room;
  $('joinView').classList.add('hidden');
  $('sortView').classList.remove('hidden');
  $('reflectA').value = state.reflection;
  $('syncMsg').textContent = room ? 'Room ' + room + '.' : 'Sorting on your own. Nothing is sent anywhere.';
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
  el.className = 'card ' + card.era + (selected === card.id ? ' selected' : '');
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.dataset.id = card.id;
  const era = document.createElement('span');
  era.className = 'era';
  era.textContent = card.era === 'then' ? 'Then' : 'Now';
  el.append(era, document.createTextNode(card.text));
  const pos = state.placed[card.id];
  el.setAttribute('aria-label', card.text + (pos == null
    ? '. Not placed yet. Press the arrow keys to place it.'
    : '. ' + pos + ' out of 100 toward "' + RIGHT_END + '". Arrow keys move it, Delete sends it back.'));
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

/* ---------- reveal and reflect ---------- */

$('revealBtn').addEventListener('click', () => {
  state.before = { ...state.placed };
  selected = null;
  save();
  push();
  render();
  $('afterReveal').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

$('reflectA').addEventListener('input', e => {
  state.reflection = e.target.value;
  save();
});

$('copyBtn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(REFLECTION + '\n\n' + state.reflection);
    $('copyMsg').textContent = 'Copied.';
  } catch (e) {
    $('copyMsg').textContent = 'Could not copy. Select the text and copy it yourself.';
  }
});

let resizeTimer = null;
window.addEventListener('resize', () => {
  if (!state || drag) return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(render, 120);
});

/* ---------- start ---------- */

const fromLink = new URLSearchParams(location.search).get('room');
if (fromLink) {
  codeInput.value = fromLink.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  join();
}
