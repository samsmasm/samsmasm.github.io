// Checkin - one student, everything they have done in a class.

import {
  requireUser, qp, esc, fail, fmtDate, getClass, listMembers, addShellLinks
} from './core.js?v=641cfbd-2036';
import { loadClassHistory, averagePct, renderPercentChart } from './history.js?v=641cfbd-2036';

const classId = qp('c');
const studentId = qp('u');
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

  document.getElementById('back').href = 'students.html?c=' + encodeURIComponent(classId);
  addShellLinks([
    { label: cls.name, href: 'teach.html?c=' + encodeURIComponent(classId), icon: 'stack' },
    { label: 'Over time', href: 'students.html?c=' + encodeURIComponent(classId), icon: 'people' }
  ]);

  try {
    const [members, history] = await Promise.all([
      listMembers(classId),
      loadClassHistory(classId)
    ]);
    const member = members.find(m => m.uid === studentId);
    paint(member, history);
  } catch (err) { fail('Loading results', err); }
})();

function paint(member, history) {
  const name = member ? member.name : 'Student no longer on the roll';
  const points = history.byStudent.get(studentId) || [];
  const done = points.filter(p => p.attempted);
  const avg = averagePct(points);

  document.title = name + ' - Checkin';
  document.getElementById('who').textContent = name;
  document.getElementById('sub').textContent = [
    cls.name,
    member ? member.email : '',
    done.length + ' of ' + history.sets.length + ' sets answered',
    avg === null ? '' : avg + '% average'
  ].filter(Boolean).join(' · ');

  renderPercentChart(document.getElementById('chart'), points);

  // Every set in the class, including ones this student never answered, so a
  // gap is visible rather than silently missing.
  const bySet = new Map(points.map(p => [p.setId, p]));
  const rows = history.sets.slice().reverse().map(set => {
    const p = bySet.get(set.id);
    const link = 'results.html?c=' + encodeURIComponent(classId) + '&s=' + set.id;
    const meta = !p || !p.attempted
      ? '<span class="state state-todo">not answered</span>'
      : '<b>' + p.awarded + ' of ' + p.outOf + '</b><br>' + p.pct + '%' +
        (p.provisional ? '<br><span class="state state-todo">still marking</span>' : '');
    return '<div class="index-row">' +
      '<span class="grow">' +
        '<a class="index-name" href="' + link + '">' + esc(set.title || 'Untitled') + '</a>' +
        '<br><span class="index-desc">' + (set.questions || []).length + ' questions · ' +
          esc(fmtDate(set.openedAt || set.createdAt)) + '</span>' +
      '</span>' +
      '<span class="index-meta">' + meta + '</span>' +
    '</div>';
  }).join('');

  document.getElementById('sets').innerHTML = rows ||
    '<p class="tiny">This class has not run any sets yet.</p>';
}
