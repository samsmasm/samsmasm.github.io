// Lineup - the class screen. One spectrum per card, stacked. Each student is a
// faint dot, the class average is a big dark-rimmed marker, and each row is
// coloured by how much the class disagrees about that card.

// The deck comes from the room, which got its own copy when the session started.

import { teacherFirebase, ROOMS, doc, getDoc, collection, onSnapshot } from './firebase.js?v=20261008-193745';
import { normaliseDeck } from './deck.js?v=20261008-193745';
import { deleteRoom, armable } from './teacher.js?v=20261008-193745';

const $ = id => document.getElementById(id);
const fb = teacherFirebase();
const db = fb.db;

// How much the class disagrees, as the interquartile range: the width of the
// box, where the middle half of the class put the card, on the 0 to 100 line.
// Dots spread evenly along the whole line give an IQR of about 50.
const LEVELS = [
  { max: 15,       colour: '#2e9e44', label: 'Agreed' },
  { max: 25,       colour: '#e8c20c', label: 'Mixed' },
  { max: 35,       colour: '#ef7d1a', label: 'Divided' },
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
let D = null;             // the room's deck
let CARDS = [];

function goHome() { location.href = 'teach.html'; }

/* ---------- screens ---------- */

function show(id) {
  for (const s of ['loading', 'signInView', 'roomView']) $(s).classList.toggle('hidden', s !== id);
}

fb.onAuth(u => {
  user = u && !u.isAnonymous ? u : null;
  $('signedBox').classList.toggle('hidden', !user);
  if (!user) { closeRoom(); show('signInView'); return; }
  $('whoami').textContent = user.displayName || user.email || '';
  const fromLink = new URLSearchParams(location.search).get('room');
  if (!fromLink) goHome();
  else if (!room) openRoom(fromLink.toUpperCase());
});

$('signInBtn').addEventListener('click', async () => {
  try { await fb.signIn(); }
  catch (e) { $('signInMsg').textContent = 'Sign in did not work: ' + (e.code || e.message); }
});
$('signOutBtn').addEventListener('click', () => fb.signOut());

/* ---------- a room ---------- */

function closeRoom() {
  document.body.classList.remove('display');
  if (stopListening) stopListening();
  stopListening = null;
  room = null;
  docs = [];
}

async function openRoom(code) {
  closeRoom();
  show('loading');
  const snap = await getDoc(doc(db, ROOMS, code)).catch(() => null);
  if (!snap || !snap.exists() || snap.data().ownerUid !== user.uid) {
    $('loading').innerHTML = '<p>That session is not one of yours, or it has been deleted. <a href="teach.html">Back to your decks</a></p>';
    return;
  }
  room = code;
  D = normaliseDeck(snap.data().deck);
  CARDS = D.cards;
  document.title = D.title + ' · Lineup class screen';
  $('deckTitle').textContent = D.title;
  $('cq').textContent = D.question;
  $('leftEnd').textContent = '← ' + D.left;
  $('rightEnd').textContent = D.right + ' →';
  history.replaceState(null, '', '?room=' + code);

  const joinUrl = new URL('./?room=' + code, location.href).href;
  const shortUrl = new URL('./', location.href);
  $('joinUrl').textContent = shortUrl.host + shortUrl.pathname.replace(/\/$/, '');
  $('roomCode').textContent = code;
  $('qr').innerHTML = qrSvg(joinUrl);
  $('joinScreen').innerHTML = '<div class="qrsvg">' + qrSvg(joinUrl) + '</div>' +
    '<div class="side"><div class="go">Scan the code, or go to<br><b></b><br>and type</div>' +
    '<div class="roomcode">' + code + '</div><div class="counts" id="joinCounts"></div>' +
    '<div class="close">Click anywhere to close</div></div>';
  $('joinScreen').querySelector('.go b').textContent = $('joinUrl').textContent;
  $('miniCode').innerHTML = code + ' <span></span>';

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
  await deleteRoom(db, code);
  goHome();
});

const joinScreen = $('joinScreen');
$('qr').addEventListener('click', () => joinScreen.classList.remove('hidden'));
$('joinScreenBtn').addEventListener('click', () => joinScreen.classList.remove('hidden'));
joinScreen.addEventListener('click', () => joinScreen.classList.add('hidden'));
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!joinScreen.classList.contains('hidden')) joinScreen.classList.add('hidden');
  else setDisplay(false);
});

// Display mode: everything fits one screen, full screen where the browser allows.
function setDisplay(on) {
  document.body.classList.toggle('display', on);
  if (on && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
  if (!on && document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
}
$('displayBtn').addEventListener('click', () => setDisplay(true));
$('exitDisplayBtn').addEventListener('click', () => setDisplay(false));
// Leaving full screen (Esc in most browsers) leaves display mode too.
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) document.body.classList.remove('display');
});

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
  now: 'Where everyone has the cards right now. Faint dots are students. The box holds the middle half of the class, with a line at the median. The whiskers reach the furthest students. The big dot is the class average. A wider box means more disagreement.',
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
      '<div class="track"><div class="line"></div>' +
      '<div class="bp"><div class="whisker"></div><div class="cap lo"></div><div class="cap hi"></div>' +
      '<div class="iqr"></div><div class="median"></div></div>' +
      '<div class="arrow"></div><div class="was"></div><div class="avg"></div><div class="none"></div></div>' +
      '<div class="note box info hidden"></div>';
    row.querySelector('.era').textContent = card.tag || '';
    row.querySelector('.txt').textContent = card.text;
    row.querySelector('.note').textContent = card.note;
    const track = row.querySelector('.track');
    for (const t of [0, 25, 50, 75, 100]) {
      const tick = document.createElement('div');
      tick.className = 'tick';
      tick.style.left = t + '%';
      track.insertBefore(tick, track.querySelector('.bp'));
    }
    $('grid').appendChild(row);
    rows.set(card.id, { row, track, dots: new Map() });
  }
}

function stats(values) {
  const n = values.length;
  if (!n) return { n };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const v = [...values].sort((x, y) => x - y);
  // Quartiles by linear interpolation between the sorted values.
  const q = p => {
    const i = (n - 1) * p, lo = Math.floor(i);
    return v[lo] + (v[Math.min(lo + 1, n - 1)] - v[lo]) * (i - lo);
  };
  const q1 = q(0.25), q3 = q(0.75);
  return { n, mean, min: v[0], q1, median: q(0.5), q3, max: v[n - 1], iqr: q3 - q1 };
}

function level(s) {
  if (!s.n || s.n < 2) return WAITING;
  return LEVELS.find(l => s.iqr < l.max);
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
  const joined = placedAny.length + (placedAny.length === 1 ? ' student has joined' : ' students have joined');
  if ($('joinCounts')) $('joinCounts').textContent = joined;
  const mini = $('miniCode').querySelector('span');
  if (mini) mini.textContent = placedAny.length + ' sorting, ' + revealed.length + ' revealed';
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
    results.sort((a, b) => (b.current.n >= 2 ? b.current.iqr : -1) - (a.current.n >= 2 ? a.current.iqr : -1));
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
      stat += moved === 0 ? '. No overall shift' : '. Moved ' + Math.abs(moved) + ' toward ' + (moved > 0 ? D.rightShort : D.leftShort);
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

    const bp = track.querySelector('.bp');
    const avg = track.querySelector('.avg');
    const was = track.querySelector('.was');
    const arrow = track.querySelector('.arrow');
    const none = track.querySelector('.none');
    const has = r.current.n > 0;
    avg.classList.toggle('hidden', !has);
    bp.classList.toggle('hidden', !has || r.current.n < 2);
    none.textContent = has ? '' : view === 'now' ? 'Nobody has placed this card yet' : 'Nobody has tapped Reveal yet';
    if (has) {
      place(avg, r.current.mean);
      avg.style.background = r.lvl.colour;
      avg.title = 'Class average: ' + Math.round(r.current.mean);
      const c = r.current;
      const span = (el, from, to) => { el.style.left = from + '%'; el.style.width = (to - from) + '%'; };
      span(bp.querySelector('.whisker'), c.min, c.max);
      span(bp.querySelector('.iqr'), c.q1, c.q3);
      place(bp.querySelector('.cap.lo'), c.min);
      place(bp.querySelector('.cap.hi'), c.max);
      place(bp.querySelector('.median'), c.median);
      bp.querySelector('.iqr').style.background = r.lvl.colour;
      bp.querySelector('.whisker').style.background = r.lvl.colour;
      bp.title = 'Median ' + Math.round(c.median) + ', middle half from ' + Math.round(c.q1) + ' to ' + Math.round(c.q3) +
        ' (IQR ' + Math.round(c.iqr) + ')';
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
