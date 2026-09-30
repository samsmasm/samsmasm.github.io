// aiorus - the class screen. One spectrum per card, stacked. Each student is a
// faint dot, the class average is a big dark-rimmed marker, and each row is
// coloured by how much the class disagrees about that card.

import { CARDS, LEFT_END, RIGHT_END } from './cards.js';
import {
  teacherFirebase, ROOMS, doc, getDoc, setDoc, getDocs, deleteDoc, collection, query, where,
  onSnapshot, writeBatch, serverTimestamp, Timestamp
} from './firebase.js';

const $ = id => document.getElementById(id);
const fb = teacherFirebase();
const db = fb.db;

const DAY = 24 * 60 * 60 * 1000;
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O, which look like 1 and 0

// How spread out the class is, as the standard deviation of placements on the
// 0 to 100 line. Everyone at one point is 0; half at each end is 50; dots spread
// evenly along the whole line come to about 29.
const LEVELS = [
  { max: 8,        colour: '#7b3fc4', label: 'Agreed' },
  { max: 14,       colour: '#2e9e44', label: 'Mostly agreed' },
  { max: 20,       colour: '#e8c20c', label: 'Mixed' },
  { max: 26,       colour: '#ef7d1a', label: 'Divided' },
  { max: Infinity, colour: '#d32f2f', label: 'Split' }
];
const WAITING = { colour: '#bbbbbb', label: 'Waiting for more students' };

let user = null;
let room = null;          // code of the open room
let stopListening = null;
let docs = [];            // [{ id, now, before }]
let view = 'now';
let order = 'list';
let showNotes = false;
const rows = new Map();   // card id -> row elements

$('leftEnd').textContent = '← ' + LEFT_END;
$('rightEnd').textContent = RIGHT_END + ' →';

/* ---------- screens ---------- */

function show(id) {
  for (const s of ['loading', 'signInView', 'homeView', 'roomView']) $(s).classList.toggle('hidden', s !== id);
}

fb.onAuth(u => {
  user = u && !u.isAnonymous ? u : null;
  $('signedBox').classList.toggle('hidden', !user);
  if (!user) { closeRoom(); show('signInView'); return; }
  $('whoami').textContent = user.displayName || user.email || '';
  const fromLink = new URLSearchParams(location.search).get('room');
  if (fromLink && !room) openRoom(fromLink.toUpperCase());
  else if (!room) goHome();
});

$('signInBtn').addEventListener('click', async () => {
  try { await fb.signIn(); }
  catch (e) { $('signInMsg').textContent = 'Sign in did not work: ' + (e.code || e.message); }
});
$('signOutBtn').addEventListener('click', () => fb.signOut());

/* ---------- sessions ---------- */

function fmt(ts) {
  return ts ? ts.toDate().toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : '';
}

async function goHome() {
  closeRoom();
  history.replaceState(null, '', location.pathname);
  show('homeView');
  const list = $('sessionList');
  list.innerHTML = '<li>Loading...</li>';
  try {
    const snap = await getDocs(query(collection(db, ROOMS), where('ownerUid', '==', user.uid)));
    const all = snap.docs.map(d => ({ code: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
    list.innerHTML = '';
    if (!all.length) list.innerHTML = '<li>No sessions yet.</li>';
    for (const r of all) {
      const li = document.createElement('li');
      const open = r.expireAt.toMillis() > Date.now();
      li.innerHTML = '<span class="code"></span><span class="when"></span>';
      li.querySelector('.code').textContent = r.code;
      li.querySelector('.when').textContent = 'Started ' + fmt(r.createdAt) +
        (open ? '. Open until ' + fmt(r.expireAt) + '.' : '. Closed to students.');
      const openBtn = document.createElement('button');
      openBtn.textContent = 'Open';
      openBtn.addEventListener('click', () => openRoom(r.code));
      const delBtn = document.createElement('button');
      delBtn.className = 'danger';
      delBtn.textContent = 'Delete';
      armable(delBtn, 'Tap again to delete', async () => { await deleteRoom(r.code); goHome(); });
      li.append(openBtn, delBtn);
      list.appendChild(li);
    }
  } catch (e) {
    console.error(e);
    list.innerHTML = '<li>Could not load your sessions (' + (e.code || e.message) + ').</li>';
  }
}

$('newBtn').addEventListener('click', async () => {
  $('newBtn').disabled = true;
  $('homeMsg').textContent = '';
  try {
    for (let tries = 0; tries < 8; tries++) {
      let code = '';
      for (let i = 0; i < 4; i++) code += LETTERS[Math.floor(Math.random() * LETTERS.length)];
      const ref = doc(db, ROOMS, code);
      if ((await getDoc(ref)).exists()) continue;
      await setDoc(ref, {
        ownerUid: user.uid,
        createdAt: serverTimestamp(),
        expireAt: Timestamp.fromMillis(Date.now() + DAY)
      });
      openRoom(code);
      return;
    }
    $('homeMsg').textContent = 'Could not find a free code. Try again.';
  } catch (e) {
    console.error(e);
    $('homeMsg').textContent = 'Could not start a session (' + (e.code || e.message) + ').';
  } finally {
    $('newBtn').disabled = false;
  }
});

// A button that needs a second tap within a few seconds before it acts.
function armable(btn, armedText, action) {
  const text = btn.textContent;
  let timer = null;
  btn.addEventListener('click', async () => {
    if (!btn.classList.contains('armed')) {
      btn.classList.add('armed');
      btn.textContent = armedText;
      timer = setTimeout(() => { btn.classList.remove('armed'); btn.textContent = text; }, 4000);
      return;
    }
    clearTimeout(timer);
    btn.disabled = true;
    btn.textContent = 'Deleting...';
    try { await action(); }
    catch (e) { console.error(e); btn.textContent = 'Could not delete'; }
    btn.disabled = false;
    btn.classList.remove('armed');
  });
}

async function deleteRoom(code) {
  const snap = await getDocs(collection(db, ROOMS, code, 'placements'));
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  await deleteDoc(doc(db, ROOMS, code));
}

/* ---------- a room ---------- */

function closeRoom() {
  if (stopListening) stopListening();
  stopListening = null;
  room = null;
  docs = [];
}

async function openRoom(code) {
  closeRoom();
  show('loading');
  const snap = await getDoc(doc(db, ROOMS, code)).catch(() => null);
  if (!snap || !snap.exists() || snap.data().ownerUid !== user.uid) { goHome(); return; }
  room = code;
  history.replaceState(null, '', '?room=' + code);

  const joinUrl = new URL('./?room=' + code, location.href).href;
  const shortUrl = new URL('./', location.href);
  $('joinUrl').textContent = shortUrl.host + shortUrl.pathname.replace(/\/$/, '');
  $('roomCode').textContent = code;
  $('qr').innerHTML = qrSvg(joinUrl);
  $('qrBig').innerHTML = '<div class="qrsvg">' + qrSvg(joinUrl) + '</div><div class="roomcode">' + code + '</div>';

  show('roomView');
  drawLegend();
  buildRows();
  draw();
  stopListening = onSnapshot(collection(db, ROOMS, code, 'placements'), s => {
    docs = s.docs.map(d => ({ id: d.id, now: d.data().now || {}, before: d.data().before || null }));
    draw();
  }, e => {
    console.error(e);
    $('counts').textContent = 'Lost connection to the session (' + (e.code || e.message) + ').';
  });
}

$('backBtn').addEventListener('click', () => goHome());
armable($('endBtn'), 'Tap again: this deletes every placement', async () => {
  const code = room;
  closeRoom();
  await deleteRoom(code);
  goHome();
});

$('qr').addEventListener('click', () => $('qrBig').classList.remove('hidden'));
$('qrBig').addEventListener('click', () => $('qrBig').classList.add('hidden'));
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('qrBig').classList.add('hidden'); });

function qrSvg(text) {
  const code = qrcode(0, 'M');
  code.addData(text);
  code.make();
  const n = code.getModuleCount();
  const size = n + 4;
  let path = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) if (code.isDark(r, c)) path += 'M' + (c + 2) + ' ' + (r + 2) + 'h1v1h-1z';
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" width="100%" height="100%" ' +
    'shape-rendering="crispEdges" role="img" aria-label="QR code to join"><rect width="' + size + '" height="' + size +
    '" fill="#fff"/><path d="' + path + '" fill="#14141f"/></svg>';
}

/* ---------- controls ---------- */

function segment(id, attr, set) {
  const seg = $(id);
  seg.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    seg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    set(b.dataset[attr]);
    draw();
  });
}
segment('viewSeg', 'v', v => { view = v; });
segment('orderSeg', 'o', o => { order = o; });

$('notesBtn').addEventListener('click', () => {
  showNotes = !showNotes;
  $('notesBtn').setAttribute('aria-pressed', showNotes);
  $('notesBtn').textContent = showNotes ? 'Hide notes' : 'Show notes';
  draw();
});

const HELP = {
  now: 'Where everyone has the cards right now. Faint dots are students. The big dot is the class average. The shaded bar shows how spread out the class is.',
  before: 'Where everyone put the cards before they tapped Reveal: their first instinct.',
  shift: 'The dashed circle is the class average before Reveal. The solid dot is the average now. Only students who have tapped Reveal are counted.'
};

function drawLegend() {
  $('legend').innerHTML = '';
  for (const l of [...LEVELS, WAITING]) {
    const s = document.createElement('span');
    s.innerHTML = '<span class="sw"></span>';
    s.querySelector('.sw').style.background = l.colour;
    s.append(l.label);
    $('legend').appendChild(s);
  }
}

/* ---------- the stacked spectrums ---------- */

function buildRows() {
  rows.forEach(r => r.row.remove());
  rows.clear();
  for (const card of CARDS) {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML =
      '<div class="meta"><div class="name"><span class="era"></span><span class="txt"></span></div>' +
      '<div class="stat"><span class="sw"></span><span class="lvl"></span></div></div>' +
      '<div class="track"><div class="line"></div><div class="band"></div>' +
      '<div class="arrow"></div><div class="was"></div><div class="avg"></div><div class="none"></div></div>' +
      '<div class="note box info hidden"></div>';
    row.querySelector('.era').textContent = card.era === 'then' ? 'Then' : 'Now';
    row.querySelector('.txt').textContent = card.text;
    row.querySelector('.note').textContent = card.note;
    const track = row.querySelector('.track');
    for (const t of [0, 25, 50, 75, 100]) {
      const tick = document.createElement('div');
      tick.className = 'tick';
      tick.style.left = t + '%';
      track.insertBefore(tick, track.querySelector('.band'));
    }
    $('grid').appendChild(row);
    rows.set(card.id, { row, track, dots: new Map() });
  }
}

function stats(values) {
  const n = values.length;
  if (!n) return { n };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / n);
  return { n, mean, sd };
}

function level(s) {
  if (!s.n || s.n < 2) return WAITING;
  return LEVELS.find(l => s.sd < l.max);
}

// A steady up-and-down offset for each student's dot, so dots that land in the
// same place spread out a little and do not jump about between updates.
function jitter(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000 * 2 - 1;
}

function place(el, left) { el.style.left = left + '%'; }

function draw() {
  if (!room) return;
  const placedAny = docs.filter(d => Object.keys(d.now).length);
  const revealed = docs.filter(d => d.before);
  $('counts').textContent = placedAny.length + (placedAny.length === 1 ? ' student' : ' students') +
    ' sorting. ' + revealed.length + ' tapped Reveal.';
  $('viewHelp').textContent = HELP[view];

  const results = CARDS.map(card => {
    let dotsFrom, current, earlier = null;
    if (view === 'before') {
      dotsFrom = revealed.filter(d => d.before[card.id] != null).map(d => [d.id, d.before[card.id]]);
    } else if (view === 'shift') {
      const both = revealed.filter(d => d.before[card.id] != null && d.now[card.id] != null);
      dotsFrom = both.map(d => [d.id, d.now[card.id]]);
      earlier = stats(both.map(d => d.before[card.id]));
    } else {
      dotsFrom = docs.filter(d => d.now[card.id] != null).map(d => [d.id, d.now[card.id]]);
    }
    current = stats(dotsFrom.map(p => p[1]));
    return { card, dotsFrom, current, earlier, lvl: level(current) };
  });

  if (order === 'split') {
    results.sort((a, b) => (b.current.n >= 2 ? b.current.sd : -1) - (a.current.n >= 2 ? a.current.sd : -1));
  }

  for (const r of results) {
    const { row, track, dots } = rows.get(r.card.id);
    $('grid').appendChild(row); // re-appending puts rows in the new order

    row.style.borderLeftColor = r.lvl.colour;
    row.querySelector('.stat .sw').style.background = r.lvl.colour;
    let stat = r.lvl.label;
    if (r.current.n) stat += '. ' + r.current.n + (r.current.n === 1 ? ' student' : ' students');
    if (r.earlier && r.earlier.n) {
      const moved = Math.round(r.current.mean - r.earlier.mean);
      stat += moved === 0 ? '. No overall shift' : '. Moved ' + Math.abs(moved) + ' toward ' + (moved > 0 ? 'humans' : 'machines');
    }
    row.querySelector('.lvl').textContent = stat;
    row.querySelector('.note').classList.toggle('hidden', !showNotes);

    // Student dots, kept between updates so they glide to new places.
    const seen = new Set();
    for (const [uid, pos] of r.dotsFrom) {
      seen.add(uid);
      let dot = dots.get(uid);
      if (!dot) {
        dot = document.createElement('div');
        dot.className = 'dot';
        dot.style.top = (50 + jitter(uid + r.card.id) * 30) + '%';
        track.appendChild(dot);
        dots.set(uid, dot);
      }
      place(dot, pos);
    }
    for (const [uid, dot] of dots) if (!seen.has(uid)) { dot.remove(); dots.delete(uid); }

    const band = track.querySelector('.band');
    const avg = track.querySelector('.avg');
    const was = track.querySelector('.was');
    const arrow = track.querySelector('.arrow');
    const none = track.querySelector('.none');
    const has = r.current.n > 0;
    avg.classList.toggle('hidden', !has);
    band.classList.toggle('hidden', !has || r.current.n < 2);
    none.textContent = has ? '' : view === 'now' ? 'Nobody has placed this card yet' : 'Nobody has tapped Reveal yet';
    if (has) {
      place(avg, r.current.mean);
      avg.style.background = r.lvl.colour;
      avg.title = 'Class average: ' + Math.round(r.current.mean);
      band.style.left = Math.max(0, r.current.mean - r.current.sd) + '%';
      band.style.width = (Math.min(100, r.current.mean + r.current.sd) - Math.max(0, r.current.mean - r.current.sd)) + '%';
      band.style.background = r.lvl.colour;
    }
    const shift = view === 'shift' && has && r.earlier && r.earlier.n;
    was.classList.toggle('hidden', !shift);
    arrow.classList.toggle('hidden', !shift);
    if (shift) {
      place(was, r.earlier.mean);
      const a = Math.min(r.earlier.mean, r.current.mean), b = Math.max(r.earlier.mean, r.current.mean);
      arrow.style.left = a + '%';
      arrow.style.width = (b - a) + '%';
    }
  }
}
