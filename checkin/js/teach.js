// Checkin - teacher view of one class: its question sets and its students.

import {
  requireUser, qp, esc, fail, fmtDate, getClass, listSets, listMembers, listBlocked,
  removeMember, unblock, newJoinCode, renameClass, saveSet, deleteSet, getResponses,
  syncKeyVisibility, needsMarking, answeredCount, addShellLinks
} from './core.js?v=4baf2dd-2128';
import { loadClassHistory, latestPoint, averagePct, sparkline } from './history.js?v=4baf2dd-2128';

const classId = qp('c');
let me = null, cls = null;

(async function start() {
  me = await requireUser();
  try {
    cls = await getClass(classId);
  } catch (err) {
    return fail('Loading the class', err);
  }
  if (cls.ownerUid !== me.uid) {
    location.replace('class.html?c=' + encodeURIComponent(classId));
    return;
  }

  document.title = cls.name + ' - Checkin';
  addShellLinks([{ label: cls.name, href: 'teach.html?c=' + encodeURIComponent(classId),
                   icon: 'stack', match: p => p === 'teach.html' }]);
  document.getElementById('class-name').textContent = cls.name;
  document.getElementById('class-sub').textContent = 'You teach this class.';
  document.getElementById('new-set').href = 'set.html?c=' + encodeURIComponent(classId) + '&new=1';
  document.getElementById('code').textContent = cls.joinCode || '------';
  document.getElementById('rename').value = cls.name;

  wireTabs();
  wireStudents();
  wireSettings();
  paintSets();
  paintMembers();
})();

function wireTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
      ['sets', 'students', 'settings'].forEach(name => {
        document.getElementById('tab-' + name).classList.toggle('hidden', name !== tab.dataset.tab);
      });
    });
  });
}

/* ---------------- question sets ---------------- */

const STATE_WORD = { draft: 'Draft', open: 'Open', closed: 'Closed' };

async function paintSets() {
  const box = document.getElementById('sets');
  let sets;
  try {
    sets = await listSets(classId);
  } catch (err) { return fail('Loading question sets', err); }

  if (!sets.length) {
    box.innerHTML = '<p class="tiny">No question sets yet. Make one with the button above.</p>';
    return;
  }

  // Response counts, fetched in parallel. Drafts cannot have any.
  const counts = await Promise.all(sets.map(async set => {
    if (set.status === 'draft') return { n: 0, toMark: 0 };
    try {
      const responses = await getResponses(classId, set.id);
      return {
        n: responses.filter(r => answeredCount(set, r) > 0).length,
        toMark: responses.filter(r => needsMarking(set, r)).length
      };
    } catch { return { n: 0, toMark: 0 }; }
  }));

  box.innerHTML = sets.map((set, i) => {
    const c = counts[i];
    const qn = (set.questions || []).length;
    const bits = [
      qn + (qn === 1 ? ' question' : ' questions'),
      set.mode === 'live' ? 'live, you advance' : 'self paced',
      set.reveal === 'now' ? 'marks shown at once' : 'results held'
    ];
    const meta = [];
    if (set.status !== 'draft') meta.push(c.n + ' answered');
    if (c.toMark) meta.push('<span class="state state-todo">' + c.toMark + ' to mark</span>');
    if (set.resultsReleased) meta.push('results released');
    return '<div class="index-row" data-set="' + set.id + '">' +
      '<span class="grow">' +
        '<a class="index-name" href="results.html?c=' + encodeURIComponent(classId) + '&s=' + set.id + '">' +
          esc(set.title || 'Untitled set') + '</a>' +
        ' <span class="state state-' + set.status + '">' + STATE_WORD[set.status] + '</span>' +
        '<br><span class="index-desc">' + esc(bits.join(' · ')) + '</span>' +
      '</span>' +
      '<span class="index-meta">' + meta.join(' · ') + '<br>' + fmtDate(set.createdAt) + '</span>' +
      '<span class="row" style="flex-basis:100%">' +
        (set.status === 'open'
          ? '<button data-act="close">Close set</button>'
          : '<button data-act="open">' + (set.status === 'draft' ? 'Open to class' : 'Reopen') + '</button>') +
        '<a class="btn" href="results.html?c=' + encodeURIComponent(classId) + '&s=' + set.id + '">Responses</a>' +
        (set.status === 'draft' ? '' :
          '<a class="btn" target="_blank" href="qr.html?c=' + encodeURIComponent(classId) + '&s=' + set.id + '">QR code</a>') +
        '<a class="btn btn-quiet" href="set.html?c=' + encodeURIComponent(classId) + '&s=' + set.id + '">Edit questions</a>' +
        '<button class="btn-warn" data-act="del">Delete</button>' +
      '</span>' +
    '</div>';
  }).join('');

  box.querySelectorAll('[data-act]').forEach(btn => {
    btn.addEventListener('click', () => onSetAction(btn, sets));
  });
}

async function onSetAction(btn, sets) {
  const row = btn.closest('[data-set]');
  const set = sets.find(s => s.id === row.dataset.set);
  const act = btn.dataset.act;

  if (act === 'del') {
    if (btn.dataset.armed !== '1') {
      btn.dataset.armed = '1';
      btn.textContent = 'Really delete?';
      return;
    }
    btn.disabled = true;
    try { await deleteSet(classId, set.id); await paintSets(); }
    catch (err) { fail('Deleting the set', err); }
    return;
  }

  btn.disabled = true;
  try {
    if (act === 'open') {
      const patch = { status: 'open', openedAt: new Date() };
      if (set.mode === 'live' && set.status === 'draft') patch.liveIndex = 0;
      await saveSet(classId, set.id, patch);
      await syncKeyVisibility(classId, { ...set, ...patch });
    } else if (act === 'close') {
      await saveSet(classId, set.id, { status: 'closed', closedAt: new Date() });
    }
    await paintSets();
  } catch (err) {
    fail('Updating the set', err);
  }
}

/* ---------------- students ---------------- */

function wireStudents() {
  document.getElementById('copy-link').addEventListener('click', async () => {
    const link = location.origin + location.pathname.replace(/teach\.html$/, 'home.html');
    const text = 'Join my Checkin class: ' + link + '  code ' + (cls.joinCode || '');
    const note = document.getElementById('code-note');
    try {
      await navigator.clipboard.writeText(text);
      note.className = 'saved';
      note.textContent = 'Invite copied.';
    } catch {
      note.className = 'tiny';
      note.textContent = text;
    }
  });

  document.getElementById('rotate').addEventListener('click', async () => {
    const btn = document.getElementById('rotate');
    const note = document.getElementById('code-note');
    if (btn.dataset.armed !== '1') {
      btn.dataset.armed = '1';
      btn.textContent = 'Replace the old code?';
      note.className = 'tiny';
      note.textContent = 'The old code stops working. Students already in the class stay in.';
      return;
    }
    btn.disabled = true;
    try {
      const code = await newJoinCode(cls, me);
      cls.joinCode = code;
      document.getElementById('code').textContent = code;
      note.className = 'saved';
      note.textContent = 'New code set.';
    } catch (err) { fail('Making a new code', err); }
    btn.disabled = false;
    btn.dataset.armed = '';
    btn.textContent = 'New code';
  });
}

let history = null;

async function paintMembers() {
  let members = [], blocked = [];
  try {
    [members, blocked] = await Promise.all([listMembers(classId), listBlocked(classId)]);
  } catch (err) { return fail('Loading the roll', err); }

  paintRoll(members);
  paintRemoval(members, blocked);
}

// The roll, with how each student has been going. The history is a lot of reads,
// so the names appear first and the trends fill in behind them.
async function paintRoll(members) {
  const box = document.getElementById('members');
  if (!members.length) {
    box.innerHTML = '<p class="tiny">Nobody has joined yet. Share the code above.</p>';
    return;
  }

  const draw = () => {
    box.innerHTML = members.map(m => rollRow(m)).join('') +
      (history
        ? '<p class="tiny mt">The little line is that student across every set, oldest on the ' +
          'left. A percentage counts unmarked written answers as nothing, so it can rise once ' +
          'you finish marking.</p>'
        : '');
  };

  draw();
  if (!history) {
    history = await loadClassHistory(classId).catch(err => {
      console.error('history', err);
      return null;
    });
    if (history) draw();
  }
}

function rollRow(m) {
  const points = history ? (history.byStudent.get(m.uid) || []) : null;
  const last = points ? latestPoint(points) : null;
  const avg = points ? averagePct(points) : null;
  const link = 'student.html?c=' + encodeURIComponent(classId) + '&u=' + encodeURIComponent(m.uid);

  const recent = !points ? ''
    : last
      ? '<b>' + last.pct + '%</b><br><span class="index-desc">' + esc(last.title) + '</span>' +
        (last.provisional ? '<br><span class="state state-todo">still marking</span>' : '')
      : '<span class="state state-todo">nothing yet</span>';

  return '<div class="index-row" data-uid="' + m.uid + '">' +
    '<span class="grow">' +
      '<a class="index-name" href="' + link + '">' + esc(m.name) + '</a>' +
      '<br><span class="index-desc">' + esc(m.email) + '</span>' +
    '</span>' +
    (points ? '<span class="spark-cell">' + sparkline(points) + '</span>' : '') +
    '<span class="index-meta">' + recent + '</span>' +
    (points && avg !== null
      ? '<span class="index-meta">' + avg + '% average<br>' +
        points.filter(p => p.attempted).length + ' of ' + history.sets.length + ' done</span>'
      : '<span class="index-meta">joined ' + fmtDate(m.joinedAt) + '</span>') +
    '<a class="btn" href="' + link + '">All results</a>' +
  '</div>';
}

// Removing someone is a class setting, not something to trip over while looking
// at how the class is going.
function paintRemoval(members, blocked) {
  const box = document.getElementById('removal');
  box.innerHTML = members.length
    ? members.map(m =>
        '<div class="index-row" data-uid="' + m.uid + '">' +
          '<span class="grow"><span class="index-term">' + esc(m.name) + '</span>' +
          '<br><span class="index-desc">' + esc(m.email) + '</span></span>' +
          '<span class="index-meta">joined ' + fmtDate(m.joinedAt) + '</span>' +
          '<button class="btn-warn" data-act="remove">Remove</button>' +
        '</div>').join('')
    : '<p class="tiny">Nobody to remove yet.</p>';

  box.querySelectorAll('[data-act=remove]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const uid = btn.closest('[data-uid]').dataset.uid;
      const member = members.find(m => m.uid === uid);
      if (btn.dataset.armed !== '1') {
        btn.dataset.armed = '1';
        btn.textContent = 'Remove and block?';
        return;
      }
      btn.disabled = true;
      try { history = null; await removeMember(classId, member); await paintMembers(); }
      catch (err) { fail('Removing the student', err); }
    });
  });

  document.getElementById('blocked-wrap').classList.toggle('hidden', !blocked.length);
  const bbox = document.getElementById('blocked');
  bbox.innerHTML = blocked.map(b =>
    '<div class="index-row" data-uid="' + b.uid + '">' +
      '<span class="grow"><span class="index-term">' + esc(b.name || b.email || b.uid) + '</span>' +
      '<br><span class="index-desc">' + esc(b.email || '') + '</span></span>' +
      '<button data-act="unblock">Let back in</button>' +
    '</div>').join('');
  bbox.querySelectorAll('[data-act=unblock]').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try { await unblock(classId, btn.closest('[data-uid]').dataset.uid); await paintMembers(); }
      catch (err) { fail('Unblocking', err); }
    });
  });
}

/* ---------------- settings ---------------- */

function wireSettings() {
  document.getElementById('rename-go').addEventListener('click', async () => {
    const name = document.getElementById('rename').value.trim();
    const note = document.getElementById('rename-note');
    if (!name) return;
    try {
      await renameClass(cls, name);
      cls.name = name;
      document.getElementById('class-name').textContent = name;
      note.className = 'saved';
      note.textContent = 'Saved. Your own class list updates next time you create or rejoin; students keep the old label until they rejoin.';
    } catch (err) { fail('Renaming the class', err); }
  });
}
