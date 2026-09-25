// Checkin - one off test: its runs, and starting it again for a new group.
//
// A run is a batch of people. Starting the test again copies the questions into
// a fresh run with a fresh code, so the group that sat it last period cannot
// turn up in this period's results.

import {
  requireUser, qp, esc, fail, fmtDate, getClass, listSets, getKey, getResponses,
  startRun, renameCheck, deleteCheck, deleteRun, isOneOff, addShellLinks, answeredCount
} from './core.js?v=735195a-1914';

const checkId = qp('k');
const justMade = qp('new');
let me = null, check = null, runs = [];

(async function start() {
  me = await requireUser();
  try {
    check = await getClass(checkId);
  } catch (err) { return fail('Loading the test', err); }

  if (!isOneOff(check)) { location.replace('teach.html?c=' + encodeURIComponent(checkId)); return; }
  if (check.ownerUid !== me.uid) { location.replace('checks.html'); return; }

  document.title = check.name + ' - Checkin';
  addShellLinks([{ label: check.name, href: 'check.html?k=' + encodeURIComponent(checkId),
                   icon: 'clock', match: p => p === 'check.html' }], 'This one off');
  document.getElementById('check-name').textContent = check.name;
  document.getElementById('rename').value = check.name;

  document.getElementById('run-again').addEventListener('click', again);
  document.getElementById('rename-go').addEventListener('click', rename);
  document.getElementById('delete-go').addEventListener('click', remove);

  await paint();
})();

async function paint() {
  try {
    runs = await listSets(checkId);
  } catch (err) { return fail('Loading the runs', err); }

  const questions = (runs[0] && runs[0].questions || []).length;
  document.getElementById('check-sub').textContent =
    [questions + (questions === 1 ? ' question' : ' questions'),
     runs.length + (runs.length === 1 ? ' run' : ' runs')].join(' · ');

  await paintCurrent();
  await paintRuns();
}

/* ---------------- the run people are sitting now ---------------- */

// Whatever is open, or the one just made, gets the big treatment: the code in
// type you can read from the back of the room.
async function paintCurrent() {
  const box = document.getElementById('current');
  const live = runs.find(r => r.status === 'open')
    || (justMade && runs.find(r => r.id === justMade))
    || null;

  if (!live) {
    box.innerHTML = runs.length
      ? '<div class="panel"><p>Nothing running. Start it again when the next group is in front ' +
        'of you and they will get a new code.</p></div>'
      : '<div class="panel"><p>No runs yet.</p></div>';
    return;
  }

  const link = 'results.html?c=' + encodeURIComponent(checkId) + '&s=' + live.id;
  const qrLink = 'qr.html?c=' + encodeURIComponent(checkId) + '&s=' + live.id;
  const go = location.origin + location.pathname.replace(/check\.html$/, 'go.html');

  box.innerHTML =
    '<div class="panel">' +
      '<span class="label">' + esc(live.runLabel || 'This run') + ' &middot; ' +
        (live.status === 'open' ? 'open now' : live.status === 'draft' ? 'not open yet' : 'closed') +
      '</span>' +
      '<div class="row">' +
        '<span class="joincode">' + esc(live.runCode || '------') + '</span>' +
        '<a class="btn btn-go" target="_blank" href="' + qrLink + '">Show the QR code</a>' +
        '<a class="btn" href="' + link + '">Responses and marking</a>' +
        '<a class="btn btn-quiet" href="set.html?c=' + encodeURIComponent(checkId) + '&s=' + live.id +
          '">Edit the questions</a>' +
      '</div>' +
      '<p class="tiny mt">Tell them to go to <b>' + esc(go.replace(/^https?:\/\//, '')) +
        '</b> and put in that code, or just show the QR code. They will be asked for a name, ' +
        'nothing else.</p>' +
      (live.status === 'draft'
        ? '<p class="tiny">It is not open yet. Open it from the responses page when you are ready.</p>'
        : '') +
    '</div>';
}

/* ---------------- every run ---------------- */

async function paintRuns() {
  const box = document.getElementById('runs');
  if (!runs.length) {
    box.innerHTML = '<p class="tiny">No runs yet.</p>';
    return;
  }

  const rows = await Promise.all(runs.map(async run => {
    let responses = [];
    try { responses = await getResponses(checkId, run.id); } catch { /* ignore */ }
    const sat = responses.filter(r => answeredCount(run, r) > 0).length;

    const meta = [
      '<span class="state state-' + run.status + '">' +
        (run.status === 'open' ? 'open' : run.status === 'draft' ? 'not opened' : 'closed') +
      '</span>',
      sat + (sat === 1 ? ' person' : ' people'),
      run.runCode ? '<span class="mono">' + esc(run.runCode) + '</span>' : '',
      fmtDate(run.createdAt)
    ].filter(Boolean);

    return '<div class="index-row">' +
      '<span class="grow">' +
        '<a class="index-name" href="results.html?c=' + encodeURIComponent(checkId) +
          '&s=' + run.id + '">' + esc(run.runLabel || 'A run') + '</a>' +
        '<br><span class="index-desc">' + (run.questions || []).length + ' questions</span>' +
      '</span>' +
      '<span class="index-meta">' + meta.join('<br>') + '</span>' +
      '<button class="btn-quiet" data-drop="' + run.id + '">Delete run</button>' +
    '</div>';
  }));

  box.innerHTML = rows.join('');
  box.querySelectorAll('[data-drop]').forEach(btn =>
    btn.addEventListener('click', () => dropRun(btn.dataset.drop, btn)));
}

async function dropRun(runId, btn) {
  const run = runs.find(r => r.id === runId);
  if (!run) return;
  if (btn.dataset.sure !== '1') {
    btn.dataset.sure = '1';
    btn.className = 'btn-warn';
    btn.textContent = 'Really delete it?';
    return;
  }
  btn.disabled = true;
  try {
    await deleteRun(checkId, run);
    await paint();
  } catch (err) { fail('Deleting the run', err); }
}

/* ---------------- starting it again ---------------- */

async function again() {
  const btn = document.getElementById('run-again');
  btn.disabled = true;
  try {
    const source = runs[0] || null;
    const key = source ? await getKey(checkId, source.id).catch(() => ({})) : {};
    const run = await startRun(check, me, source
      ? { questions: source.questions || [], key, mode: source.mode, reveal: source.reveal }
      : null);
    location.href = 'check.html?k=' + encodeURIComponent(checkId) + '&new=' + run.id;
  } catch (err) {
    fail('Starting another run', err);
    btn.disabled = false;
  }
}

/* ---------------- settings ---------------- */

async function rename() {
  const name = document.getElementById('rename').value.trim();
  const note = document.getElementById('rename-note');
  if (!name) { note.textContent = 'It needs a name.'; return; }
  try {
    await renameCheck(me, checkId, name);
    check.name = name;
    document.getElementById('check-name').textContent = name;
    note.textContent = 'Saved.';
  } catch (err) { fail('Renaming it', err); }
}

async function remove() {
  const btn = document.getElementById('delete-go');
  const note = document.getElementById('delete-note');
  if (btn.dataset.sure !== '1') {
    btn.dataset.sure = '1';
    btn.textContent = 'Really delete it and every run?';
    note.textContent = 'Press again to delete. Anything else on the page cancels it.';
    return;
  }
  btn.disabled = true;
  try {
    await deleteCheck(me, checkId);
    location.replace('checks.html');
  } catch (err) { fail('Deleting the test', err); }
}
