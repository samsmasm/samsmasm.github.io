// Checkin - the list of one off tests, and how a new one starts.
//
// A one off test is for a room that is not a class: a relief lesson, a workshop,
// a group of visitors. Nobody signs in. The teacher still gets everything else,
// because a run of a one off test is an ordinary question set underneath.

import {
  requireUser, esc, fail, fmtDate, myClasses, myChecks, createCheck, getClass,
  listSets, listSets as listRuns, getKey, startRun, getResponses
} from './core.js?v=28ba446-0639';

let me = null;

(async function start() {
  me = await requireUser();
  document.getElementById('new-go').addEventListener('click', makeBlank);
  document.getElementById('copy-go').addEventListener('click', makeFromSet);
  document.getElementById('new-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') makeBlank();
  });

  await paintList();
  fillSetPicker();       // after the list, since it is the slower of the two
})();

function note(text, bad) {
  const el = document.getElementById('new-note');
  el.className = bad ? 'tiny savefail' : 'tiny';
  el.textContent = text;
}

/* ---------------- making one ---------------- */

async function makeBlank() {
  const name = document.getElementById('new-name').value.trim();
  if (!name) return note('Give it a name first.', true);
  note('Making it.');
  try {
    const checkId = await createCheck(me, name);
    const check = { id: checkId, name };
    const run = await startRun(check, me, null);
    // Straight into the builder: a test with no questions is not worth looking at.
    location.href = 'set.html?c=' + encodeURIComponent(checkId) + '&s=' + run.id;
  } catch (err) { fail('Making the test', err); }
}

async function makeFromSet() {
  const picked = document.getElementById('copy-from').value;
  if (!picked) return note('Pick a set to copy first.', true);
  const [classId, setId] = picked.split('|');
  note('Copying it.');
  try {
    const sets = await listSets(classId);
    const source = sets.find(s => s.id === setId);
    if (!source) return note('That set has gone.', true);
    const key = await getKey(classId, setId).catch(() => ({}));

    const typed = document.getElementById('new-name').value.trim();
    const checkId = await createCheck(me, typed || source.title || 'One off test');
    const check = { id: checkId, name: typed || source.title || 'One off test' };
    const run = await startRun(check, me, {
      questions: source.questions || [], key, mode: source.mode, reveal: source.reveal
    });
    location.href = 'check.html?k=' + encodeURIComponent(checkId) + '&new=' + run.id;
  } catch (err) { fail('Copying the set', err); }
}

// Every set in every class the teacher owns, so a check can start from work
// already done rather than being typed out again.
async function fillSetPicker() {
  const picker = document.getElementById('copy-from');
  try {
    const mine = await myClasses(me.uid);
    const owned = [];
    for (const row of mine) {
      const cls = await getClass(row.id).catch(() => null);
      if (!cls || cls.ownerUid !== me.uid || cls.kind === 'oneoff') continue;
      const sets = await listSets(row.id).catch(() => []);
      for (const set of sets) {
        if (!(set.questions || []).length) continue;
        owned.push({ classId: row.id, className: cls.name, set });
      }
    }
    picker.innerHTML = owned.length
      ? '<option value="">Pick a question set</option>' + owned.map(o =>
          '<option value="' + o.classId + '|' + o.set.id + '">' +
          esc(o.className) + ' &middot; ' + esc(o.set.title || 'Untitled') + ' (' +
          (o.set.questions || []).length + ')</option>').join('')
      : '<option value="">You have no question sets to copy yet</option>';
  } catch {
    picker.innerHTML = '<option value="">Could not read your question sets</option>';
  }
}

/* ---------------- the list ---------------- */

async function paintList() {
  const box = document.getElementById('list');
  let checks;
  try {
    checks = await myChecks(me.uid);
  } catch (err) { return fail('Loading your one off tests', err); }

  if (!checks.length) {
    box.innerHTML = '<p class="tiny">None yet. Make one above and it will live here, ' +
      'ready to run again with the next group.</p>';
    return;
  }

  const rows = await Promise.all(checks.map(async row => {
    let runs = [];
    try { runs = await listRuns(row.id); } catch { /* deleted underneath us */ }
    const open = runs.filter(r => r.status === 'open');
    const latest = runs[0] || null;

    // How many answered the most recent run, which is the number worth seeing
    // at a glance the morning after.
    let answered = 0;
    if (latest) {
      try { answered = (await getResponses(row.id, latest.id)).length; } catch { /* ignore */ }
    }

    const meta = [];
    if (open.length) meta.push('<span class="state state-open">running now</span>');
    meta.push(runs.length + (runs.length === 1 ? ' run' : ' runs'));
    if (latest) {
      // "Last time" is wrong when the run in question is the one people are
      // sitting right now.
      meta.push(answered + (answered === 1 ? ' answer ' : ' answers ') +
        (latest.status === 'open' ? 'so far' : 'last time'));
    }
    if (latest && latest.createdAt) meta.push(fmtDate(latest.createdAt));

    return '<div class="index-row">' +
      '<span class="grow">' +
        '<a class="index-name" href="check.html?k=' + encodeURIComponent(row.id) + '">' +
          esc(row.name) + '</a>' +
        '<br><span class="index-desc">' +
          ((latest && (latest.questions || []).length) || 0) + ' questions' +
        '</span>' +
      '</span>' +
      '<span class="index-meta">' + meta.join('<br>') + '</span>' +
    '</div>';
  }));

  box.innerHTML = rows.join('');
}
