// Checkin - one student, everything they have done in a class.
//
// The shape of the page: how they are going, then the things worth acting on,
// then everything, in that order. Every set is on the page but collapsed, so a
// long history stays readable and the detail is one click away rather than a
// scroll away.

import {
  requireUser, qp, esc, fail, fmtDate, getClass, listMembers, addShellLinks, LETTERS
} from './core.js?v=735195a-1914';
import {
  loadClassHistory, averagePct, latestPoint, renderPercentChart, studentQuestions, ordinal
} from './history.js?v=735195a-1914';

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

  document.getElementById('back').href = 'teach.html?c=' + encodeURIComponent(classId);
  addShellLinks([
    { label: cls.name, href: 'teach.html?c=' + encodeURIComponent(classId), icon: 'stack' },
    { label: 'Everyone', href: 'teach.html?c=' + encodeURIComponent(classId), icon: 'people' }
  ]);

  try {
    const [members, history] = await Promise.all([
      listMembers(classId),
      loadClassHistory(classId)
    ]);
    paint(members.find(m => m.uid === studentId), history);
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
  paintStanding(points, avg);

  const questions = studentQuestions(history, studentId);
  paintFlags(questions);
  paintLost(questions);
  paintSets(points, history, questions);
}

/* ---------------- where they sit ---------------- */

// The chart says the shape; this says the numbers, including their place in the
// class, which is the one thing a line against an average cannot tell you.
function paintStanding(points, avg) {
  const done = points.filter(p => p.attempted && p.pct !== null);
  const box = document.getElementById('standing');
  if (!done.length) { box.innerHTML = ''; return; }

  const last = latestPoint(points);
  const withClass = done.filter(p => typeof p.classAvg === 'number');
  const classAvg = withClass.length
    ? Math.round(withClass.reduce((n, p) => n + p.classAvg, 0) / withClass.length) : null;
  const gap = classAvg === null || avg === null ? null : avg - classAvg;

  const bits = [];
  if (last) {
    bits.push('Most recently <b>' + esc(last.title) + '</b>: ' +
      last.awarded + ' of ' + last.outOf + ', ' + last.pct + '%' +
      (last.place && last.sat > 1 ? ', ' + ordinal(last.place) + ' of ' + last.sat + ' who sat it' : ''));
  }
  if (gap !== null) {
    bits.push('Over ' + withClass.length + (withClass.length === 1 ? ' set' : ' sets') +
      ' they average <b>' + avg + '%</b> against a class average of <b>' + classAvg + '%</b>' +
      (gap === 0 ? ', the same'
        : ', ' + Math.abs(gap) + ' points ' + (gap > 0 ? 'above' : 'below')));
  }
  const unmarked = done.filter(p => p.provisional).length;
  if (unmarked) {
    bits.push('<span class="state state-todo">' + unmarked +
      (unmarked === 1 ? ' set' : ' sets') + ' still part marked</span>, so those ' +
      'percentages will only go up');
  }
  box.innerHTML = bits.map(b => '<p class="standing-line">' + b + '</p>').join('');
}

/* ---------------- worth a look ---------------- */

// Two kinds of surprise: a question they missed that the class found easy, and
// one they got that the class found hard. Both are more useful than a mark.
function paintFlags(questions) {
  const missed = questions.filter(r => r.flag === 'missed');
  const nailed = questions.filter(r => r.flag === 'nailed');
  const wrap = document.getElementById('flags-wrap');
  if (!missed.length && !nailed.length) { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');

  const group = (rows, kind, lead) => rows.length
    ? '<p class="tiny mt">' + lead + '</p>' +
      rows.map(r => questionCard(r, kind)).join('')
    : '';

  document.getElementById('flags').innerHTML =
    group(missed, 'missed', 'Missed, where most of the class did not:') +
    group(nailed, 'nailed', 'Got, where most of the class did not:');
}

/* ---------------- where the marks went ---------------- */

function paintLost(questions) {
  const lost = questions.filter(r => r.awarded !== null && r.awarded < r.full);
  const blank = questions.filter(r => r.given === null && r.set.status !== 'draft');
  const label = document.getElementById('lost-label');
  const box = document.getElementById('lost');

  if (!lost.length && !blank.length) {
    label.textContent = 'Where the marks went';
    box.innerHTML = '<p class="tiny">Full marks on everything marked so far.</p>';
    return;
  }

  label.textContent = 'Where the marks went · ' + lost.length +
    (lost.length === 1 ? ' question' : ' questions') + ' short of full marks' +
    (blank.length ? ', ' + blank.length + ' left blank' : '');

  box.innerHTML = lost.map(r => questionCard(r, 'lost')).join('') ||
    '<p class="tiny">Nothing marked down. The blanks are below.</p>';
}

/* ---------------- one question, in full ---------------- */

function marksLine(r) {
  if (r.given === null) return '<span class="state state-todo">no answer</span>';
  if (r.awarded === null) return '<span class="state state-todo">not marked yet</span>';
  return '<b>' + r.awarded + ' of ' + r.full + '</b>';
}

function classLine(r) {
  if (r.classRate === null || !r.attempts) return '';
  const pct = Math.round(r.classRate * 100);
  return '<span class="tiny">' + pct + '% of the ' + r.attempts +
    ' who answered it got full marks</span>';
}

function flagChip(r) {
  if (r.flag === 'missed') return '<span class="chip chip-warn">most of the class got this</span>';
  if (r.flag === 'nailed') return '<span class="chip chip-good">most of the class did not get this</span>';
  return '';
}

// Their answer next to the right answer, which is the only arrangement that
// makes a lost mark mean anything.
function questionCard(r, kind) {
  const answer = r.given === null
    ? '<p class="tiny">Left blank.</p>'
    : '<div class="answer-given">' + esc(shownAnswer(r)) + '</div>';

  const model = r.model === undefined || r.model === null || r.model === ''
    ? ''
    : '<p class="feedback"><b>' + (r.q.type === 'mcq' ? 'Correct answer' : 'Model answer') +
      ':</b> ' + esc(r.q.type === 'mcq' ? modelLetter(r) : r.model) + '</p>';

  const comment = r.comment
    ? '<p class="feedback"><b>Your comment:</b> ' + esc(r.comment) + '</p>' : '';

  const where = kind === 'inset' ? '' :
    '<a class="tiny" href="results.html?c=' + encodeURIComponent(classId) + '&s=' + r.set.id +
    '">' + esc(r.set.title || 'Untitled') + '</a> · ' + esc(fmtDate(r.at ? r.at * 1000 : null)) + ' · ';

  return '<div class="qcard">' +
    '<div class="spread"><span class="tiny">' + where +
      (r.q.type === 'mcq' ? 'multiple choice' : 'written, out of ' + r.full) + '</span>' +
      '<span>' + marksLine(r) + '</span></div>' +
    '<p class="prompt prompt-small">' + esc(r.q.prompt) + '</p>' +
    answer + model + comment +
    '<div class="row row-tight">' + classLine(r) + flagChip(r) + '</div>' +
  '</div>';
}

function shownAnswer(r) {
  if (r.q.type !== 'mcq') return r.given;
  const letter = String(r.given).toUpperCase();
  const text = (r.q.options || [])[LETTERS.indexOf(letter)] || '';
  return letter + '. ' + text;
}

function modelLetter(r) {
  const letter = String(r.model).toUpperCase();
  const text = (r.q.options || [])[LETTERS.indexOf(letter)] || '';
  return text ? letter + '. ' + text : letter;
}

/* ---------------- every set, folded away ---------------- */

// Every set in the class, including ones this student never answered, so a gap
// is visible rather than silently missing. Each one opens on the whole paper:
// what was asked, what they put, what was right, what you said.
function paintSets(points, history, questions) {
  const bySet = new Map(points.map(p => [p.setId, p]));

  const rows = [...history.sets].reverse().map(set => {
    const p = bySet.get(set.id);
    const link = 'results.html?c=' + encodeURIComponent(classId) + '&s=' + set.id;
    const mine = questions.filter(r => r.set.id === set.id);

    const meta = [];
    if (!p || !p.attempted) {
      meta.push('<span class="state state-todo">not answered</span>');
    } else {
      meta.push('<b>' + p.awarded + ' of ' + p.outOf + '</b> &middot; ' + p.pct + '%');
      if (typeof p.classAvg === 'number') meta.push('class ' + p.classAvg + '%');
      if (p.place && p.sat > 1) meta.push(ordinal(p.place) + ' of ' + p.sat);
      if (p.provisional) meta.push('<span class="state state-todo">still marking</span>');
    }

    return '<details class="setfold">' +
      '<summary>' +
        '<span class="grow">' +
          '<span class="index-name">' + esc(set.title || 'Untitled') + '</span>' +
          '<br><span class="index-desc">' + (set.questions || []).length +
            (((set.questions || []).length) === 1 ? ' question · ' : ' questions · ') +
            esc(fmtDate(set.openedAt || set.createdAt)) + '</span>' +
        '</span>' +
        '<span class="index-meta">' + meta.join('<br>') + '</span>' +
      '</summary>' +
      '<div class="setfold-body">' +
        mine.map(r => questionCard(r, 'inset')).join('') +
        '<p class="tiny"><a href="' + link + '">See the whole class on this set</a></p>' +
      '</div>' +
    '</details>';
  }).join('');

  document.getElementById('sets').innerHTML = rows ||
    '<p class="tiny">This class has not run any sets yet.</p>';
}
