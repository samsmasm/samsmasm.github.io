// Checkin - everyone on the roll with their most recent result, and a way into
// each student's own history.

import {
  requireUser, qp, esc, fail, getClass, listMembers, addShellLinks
} from './core.js?v=641cfbd-2036';
import { loadClassHistory, latestPoint, averagePct, sparkline } from './history.js?v=641cfbd-2036';

const classId = qp('c');
let me = null, cls = null;

(async function start() {
  me = await requireUser();
  try {
    cls = await getClass(classId);
  } catch (err) { return fail('Loading the class', err); }
  if (cls.ownerUid !== me.uid) {
    location.replace('class.html?c=' + encodeURIComponent(classId));
    return;
  }

  document.title = cls.name + ' over time - Checkin';
  addShellLinks([
    { label: cls.name, href: 'teach.html?c=' + encodeURIComponent(classId), icon: 'stack' },
    { label: 'Over time', href: 'students.html?c=' + encodeURIComponent(classId),
      icon: 'people', match: p => p === 'students.html' }
  ]);

  try {
    const [members, history] = await Promise.all([
      listMembers(classId),
      loadClassHistory(classId)
    ]);
    paint(members, history);
  } catch (err) { fail('Loading results', err); }
})();

function paint(members, history) {
  const sets = history.sets;
  document.getElementById('sub').textContent = cls.name + ' · ' + members.length +
    (members.length === 1 ? ' student · ' : ' students · ') + sets.length +
    (sets.length === 1 ? ' set' : ' sets');

  if (!members.length) {
    document.getElementById('list').innerHTML =
      '<p class="tiny">Nobody has joined this class yet.</p>';
    return;
  }

  const rows = members.map(m => {
    const points = history.byStudent.get(m.uid) || [];
    const last = latestPoint(points);
    const avg = averagePct(points);
    const doneCount = points.filter(p => p.attempted).length;

    const recent = last
      ? '<b>' + last.pct + '%</b><br><span class="index-desc">' + esc(last.title) + '</span>' +
        (last.provisional ? '<br><span class="state state-todo">still marking</span>' : '')
      : '<span class="state state-todo">nothing yet</span>';

    return '<div class="index-row">' +
      '<span class="grow">' +
        '<span class="index-term">' + esc(m.name) + '</span>' +
        '<br><span class="index-desc">' + esc(m.email) + '</span>' +
      '</span>' +
      '<span class="spark-cell">' + sparkline(points) + '</span>' +
      '<span class="index-meta">' + recent + '</span>' +
      '<span class="index-meta">' +
        (avg === null ? '' : avg + '% average<br>') +
        doneCount + ' of ' + sets.length + ' done' +
      '</span>' +
      '<a class="btn" href="student.html?c=' + encodeURIComponent(classId) +
        '&u=' + encodeURIComponent(m.uid) + '">All results</a>' +
    '</div>';
  }).join('');

  document.getElementById('list').innerHTML = rows +
    '<p class="tiny mt">The little line is that student across every set, oldest on the left. ' +
    'A percentage counts unmarked written answers as nothing, so it can rise once you finish marking.</p>';
}
