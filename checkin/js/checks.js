// Checkin - the list of one off tests, and how a new one starts.
//
// A one off test is for a room that is not a class: a relief lesson, a workshop,
// a group of visitors. Nobody signs in. The teacher still gets everything else,
// because a run of a one off test is an ordinary question set underneath.

import {
  requireUser, esc, fail, fmtDate, myChecks, createCheck,
  listSets as listRuns, getKey, startRun, getResponses
} from './core.js?v=2aeb1e7-1921';
import { mountSetPicker } from './setpicker.js?v=2aeb1e7-1921';

let me = null;

(async function start() {
  me = await requireUser();
  document.getElementById('new-go').addEventListener('click', makeBlank);
  document.getElementById('new-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') makeBlank();
  });

  await paintList();

  // After the list, since it is the slower of the two.
  mountSetPicker(document.getElementById('copy-picker'), {
    uid: me.uid,
    skipOneOffs: true,
    actionLabel: 'Use these questions',
    empty: 'You have no question sets to copy yet. Write one in a class first.',
    onPick: makeFromSet
  });
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

async function makeFromSet(chosen, btn) {
  if (btn) btn.disabled = true;
  note('Copying it.');
  try {
    const key = await getKey(chosen.classId, chosen.set.id).catch(() => ({}));
    const typed = document.getElementById('new-name').value.trim();
    const name = typed || chosen.set.title || 'One off test';

    const checkId = await createCheck(me, name);
    const run = await startRun({ id: checkId, name }, me, {
      questions: chosen.set.questions || [], key,
      mode: chosen.set.mode, reveal: chosen.set.reveal
    });
    location.href = 'check.html?k=' + encodeURIComponent(checkId) + '&new=' + run.id;
  } catch (err) {
    fail('Copying the set', err);
    if (btn) btn.disabled = false;
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
