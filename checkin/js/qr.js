// Checkin - a QR code big enough to scan from the back of the room. Each code
// points at one question, so scanning lands a student on that question alone.

import { requireUser, qp, esc, fail, getClass, getSet, addShellLinks
} from './core.js?v=4baf2dd-2128';
import { svgFor } from './qrsvg.js?v=4baf2dd-2128';

const classId = qp('c');
const setId = qp('s');
let me = null, cls = null, set = null;
let target = qp('q') || '';   // a question id, or empty for the whole set

(async function start() {
  me = await requireUser();
  try {
    cls = await getClass(classId);
    set = await getSet(classId, setId);
  } catch (err) { return fail('Loading the question', err); }

  if (!target) {
    // Default to whatever the class is on now, which is the usual thing to show.
    const qs = set.questions || [];
    const live = set.mode === 'live' ? qs[Number(set.liveIndex) || 0] : null;
    if (live) target = live.id;
  }

  document.title = (set.title || 'QR code') + ' - Checkin';
  addShellLinks([
    { label: cls.name, href: 'teach.html?c=' + encodeURIComponent(classId), icon: 'stack' },
    { label: set.title || 'This set', icon: 'qr',
      href: 'results.html?c=' + encodeURIComponent(classId) + '&s=' + setId }
  ]);
  document.addEventListener('keydown', onKey);
  paint();
})();

function linkFor(qid) {
  const base = location.origin + location.pathname.replace(/qr\.html$/, 'answer.html');
  const params = new URLSearchParams({ c: classId, s: setId });
  if (qid) params.set('q', qid);
  // The join code rides along so a student who has not joined yet still gets
  // through. It is on the screen next to the code anyway.
  if (cls.joinCode) params.set('j', cls.joinCode);
  return base + '?' + params.toString();
}

function paint() {
  const qs = set.questions || [];
  const i = qs.findIndex(q => q.id === target);
  const q = i >= 0 ? qs[i] : null;
  const url = linkFor(q ? q.id : '');

  document.getElementById('kicker').innerHTML = q
    ? 'Question ' + (i + 1) + ' of ' + qs.length + ' &middot; ' + esc(set.title || '') +
      ((Number(q.maxMark) || 1) > 1 ? ' &middot; ' + q.maxMark + ' marks' : '')
    : esc(set.title || '') + ' &middot; the whole set, ' + qs.length + ' questions';

  document.getElementById('question').textContent = q
    ? q.prompt
    : (set.title || 'Question set');

  try {
    document.getElementById('code').innerHTML = svgFor(url);
  } catch (err) {
    console.error(err);
    document.getElementById('code').innerHTML =
      '<p class="tiny" style="padding:2rem">The QR code library did not load. Check the ' +
      'connection, or read the link below out to the class.</p>';
  }
  document.getElementById('url').textContent = url.replace(/^https?:\/\//, '');

  const shut = set.status !== 'open'
    ? '<p class="tiny">This set is ' + (set.status === 'draft' ? 'still a draft' : 'closed') +
      ', so anyone scanning can read it but not answer.</p>'
    : '';

  document.getElementById('controls').innerHTML =
    '<div class="row" style="justify-content:center">' +
      '<button data-step="-1"' + (i <= 0 ? ' disabled' : '') + '>Previous</button>' +
      '<button data-step="1"' + (i < 0 || i >= qs.length - 1 ? ' disabled' : '') + '>Next</button>' +
      '<button data-whole class="' + (q ? 'btn-quiet' : 'btn-on') + '">Whole set</button>' +
      '<button data-present class="btn-go">Present</button>' +
      '<a class="btn btn-quiet" href="results.html?c=' + encodeURIComponent(classId) + '&s=' + setId + '">Responses</a>' +
    '</div>' + shut +
    '<p class="tiny">Press P to present, arrow keys to move between questions, Escape to come back.</p>';

  document.getElementById('picker').innerHTML =
    '<div class="qr-picker">' + qs.map((item, n) =>
      '<button class="dot' + (item.id === target ? ' here' : '') + '" data-go="' + item.id + '">' +
        (n + 1) + '</button>').join('') + '</div>';

  document.querySelectorAll('[data-step]').forEach(btn =>
    btn.addEventListener('click', () => step(Number(btn.dataset.step))));
  document.querySelectorAll('[data-go]').forEach(btn =>
    btn.addEventListener('click', () => { target = btn.dataset.go; paint(); }));
  document.querySelector('[data-whole]').addEventListener('click', () => { target = ''; paint(); });
  document.querySelector('[data-present]').addEventListener('click', present);
}

function step(by) {
  const qs = set.questions || [];
  const i = qs.findIndex(q => q.id === target);
  const next = qs[Math.max(0, Math.min(qs.length - 1, (i < 0 ? 0 : i) + by))];
  if (next) { target = next.id; paint(); }
}

function present() {
  document.body.classList.add('presenting');
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => { /* fullscreen is a bonus */ });
  }
}

function onKey(e) {
  if (e.key === 'ArrowRight') step(1);
  else if (e.key === 'ArrowLeft') step(-1);
  else if (e.key === 'p' || e.key === 'P') present();
  else if (e.key === 'Escape') {
    document.body.classList.remove('presenting');
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
  }
}
