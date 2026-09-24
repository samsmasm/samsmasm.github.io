// Checkin - how a class has done across its sets, and the small charts that show it.
//
// Marks are recomputed here from each set's answer key rather than trusted from
// the stored score, because a set whose responses page the teacher never opened
// has no stored marks at all and would otherwise read as zero.

import {
  listSets, getResponses, getKey, computeMarks, totalAwarded, maxScore,
  needsMarking, answeredCount, esc
} from './core.js?v=28ba446-0639';

function when(set) {
  const t = set.openedAt || set.createdAt;
  return (t && t.seconds) || 0;
}

export function hasAnswer(response, qid) {
  const a = response && response.answers ? response.answers[qid] : undefined;
  return a !== undefined && a !== null && String(a).trim() !== '';
}

// A place in the class, with ties sharing it: two students on 80% are both
// second and nobody is third.
function places(done) {
  const ranked = [...done].sort((a, b) => b.pct - a.pct);
  const out = new Map();
  ranked.forEach(r => out.set(r.uid, ranked.findIndex(o => o.pct === r.pct) + 1));
  return out;
}

export function ordinal(n) {
  if (!n) return '';
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return n + 'th';
  return n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
}

// Everything a class has done, oldest set first.
//
// It also works out how the class went on each set and on each question in it,
// which costs nothing extra: every response is already here. That is what lets a
// single student's result be read against the class rather than in a vacuum.
export async function loadClassHistory(classId) {
  const sets = (await listSets(classId))
    .filter(s => s.status !== 'draft')
    .sort((a, b) => when(a) - when(b));

  const loaded = await Promise.all(sets.map(async set => {
    const [key, responses] = await Promise.all([
      getKey(classId, set.id).catch(() => ({})),
      getResponses(classId, set.id).catch(() => [])
    ]);
    return { set, key, responses };
  }));

  const byStudent = new Map();   // uid -> one point per set, in set order
  const bySet = new Map();       // setId -> the whole class on that set

  for (const { set, key, responses } of loaded) {
    const outOf = maxScore(set);

    const rows = responses.map(r => {
      const attempted = answeredCount(set, r) > 0;
      const marks = computeMarks(set, r, key);
      const awarded = totalAwarded(set, marks);
      return {
        uid: r.uid, response: r, marks, attempted, awarded,
        // A percentage is provisional while any written answer is still unmarked,
        // because those count as nothing until the teacher gets to them.
        provisional: needsMarking(set, r),
        pct: attempted && outOf ? Math.round((awarded / outOf) * 100) : null
      };
    });

    const done = rows.filter(r => r.attempted && r.pct !== null);
    const avgPct = done.length
      ? Math.round(done.reduce((n, r) => n + r.pct, 0) / done.length) : null;
    const place = places(done);

    // Per question: how many tried it and how many of those got full marks. The
    // share is what makes an outlier visible, one way or the other.
    const questions = new Map();
    for (const q of set.questions || []) {
      const full = Number(q.maxMark) || 1;
      const tried = rows.filter(r => hasAnswer(r.response, q.id));
      const fullMarks = tried.filter(r => Number((r.marks[q.id] || {}).awarded) >= full).length;
      questions.set(q.id, {
        attempts: tried.length, fullMarks,
        rate: tried.length ? fullMarks / tried.length : null
      });
    }

    bySet.set(set.id, { set, key, rows, avgPct, questions, sat: done.length });

    for (const r of rows) {
      if (!byStudent.has(r.uid)) byStudent.set(r.uid, []);
      byStudent.get(r.uid).push({
        setId: set.id,
        title: set.title || 'Untitled',
        at: when(set),
        attempted: r.attempted,
        awarded: r.awarded,
        outOf,
        provisional: r.provisional,
        pct: r.pct,
        classAvg: avgPct,
        place: place.get(r.uid) || null,
        sat: done.length
      });
    }
  }

  return { sets: loaded.map(l => l.set), byStudent, bySet };
}

/* ---------------- one student, question by question ----------------
   Pure: it re-reads what loadClassHistory already gathered, so the detailed
   view of a student costs no further reads.
------------------------------------------------------------------- */

// Below this many attempts a class comparison says nothing useful, so no
// question is flagged as an outlier either way.
const ENOUGH = 4;

function outlier(awarded, full, stats) {
  if (awarded === null || stats.rate === null || stats.attempts < ENOUGH) return null;
  if (awarded < full && stats.rate >= 0.7) return 'missed';
  if (awarded >= full && stats.rate <= 0.3) return 'nailed';
  return null;
}

// Every question this student met, newest set first.
export function studentQuestions(history, uid) {
  const out = [];
  for (const set of [...history.sets].reverse()) {
    const info = history.bySet.get(set.id);
    if (!info) continue;
    const row = info.rows.find(r => r.uid === uid) || null;
    for (const q of set.questions || []) {
      const full = Number(q.maxMark) || 1;
      const stats = info.questions.get(q.id) || { attempts: 0, rate: null, fullMarks: 0 };
      const mark = row ? (row.marks[q.id] || null) : null;
      const raw = mark ? mark.awarded : null;
      const awarded = (raw === undefined || raw === null || raw === '') ? null : Number(raw);
      out.push({
        set, at: when(set), q, full,
        given: row && hasAnswer(row.response, q.id) ? row.response.answers[q.id] : null,
        model: info.key ? info.key[q.id] : undefined,
        awarded,
        comment: (mark && mark.comment) || '',
        classRate: stats.rate,
        attempts: stats.attempts,
        flag: outlier(awarded, full, stats)
      });
    }
  }
  return out;
}

export function latestPoint(points) {
  for (let i = (points || []).length - 1; i >= 0; i--) {
    if (points[i].attempted) return points[i];
  }
  return null;
}

export function averagePct(points) {
  const done = (points || []).filter(p => p.attempted && p.pct !== null);
  if (!done.length) return null;
  return Math.round(done.reduce((n, p) => n + p.pct, 0) / done.length);
}

/* ---------------- sparkline ----------------
   A rough shape of how someone has been going, small enough to live in a table
   cell. No axes and no hover: the full picture is one click away on their own
   page, and this only has to say "rising", "falling" or "all over the place".
-------------------------------------------- */

export function sparkline(points, opts = {}) {
  const done = (points || []).filter(p => p.attempted && p.pct !== null);
  const w = opts.width || 66;
  const h = opts.height || 20;
  if (done.length < 2) {
    return '<span class="spark-empty" title="Not enough history yet">' +
      (done.length ? String(done[0].pct) + '%' : '') + '</span>';
  }

  // Scaled to the student's own range rather than to 0-100, or every line looks
  // flat. A minimum span keeps small wobbles from being blown up into drama, and
  // the exact numbers are in the tooltip and beside it.
  const values = done.map(p => p.pct);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const mid = (lo + hi) / 2;
  const span = Math.max(hi - lo, 30);
  const from = Math.max(0, Math.min(mid - span / 2, 100 - span));
  const to = from + span;

  const pad = 3;
  const step = (w - pad * 2) / (done.length - 1);
  const y = pct => h - pad - ((pct - from) / (to - from)) * (h - pad * 2);
  const pts = done.map((p, i) => [pad + i * step, y(p.pct)]);
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const last = pts[pts.length - 1];
  const label = done.map(p => p.title + ': ' + p.pct + '%').join('\n');

  return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h +
    '" role="img" aria-label="' + esc(done.map(p => p.pct + '%').join(', ')) + '">' +
    '<title>' + esc(label) + '</title>' +
    '<line class="spark-base" x1="' + pad + '" y1="' + (h - pad) + '" x2="' + (w - pad) + '" y2="' + (h - pad) + '"/>' +
    '<path class="spark-line" d="' + path + '"/>' +
    '<circle class="spark-dot" cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="2.6"/>' +
    '</svg>';
}

/* ---------------- percentage over time ----------------
   One student against their class, ordered in time, so: a line each. The axis is
   pinned to 0-100 because the numbers are percentages and a trimmed axis would
   invent drama that is not there. Two series, so there is a legend and both ends
   are labelled: identity is never left to colour alone. The class line is a
   quiet dashed grey rather than a second bright colour, because it is a reference
   and not a rival. Every number in it is also written out in the list of sets
   below the chart, which is the table view for anyone who cannot read the line.
------------------------------------------------------ */

const CHART = { w: 640, h: 270, left: 46, right: 74, top: 22, bottom: 44 };

export function renderPercentChart(el, points) {
  const done = (points || []).filter(p => p.attempted && p.pct !== null);
  if (done.length < 2) {
    el.innerHTML = '<p class="tiny">A line needs at least two marked sets. ' +
      (done.length ? 'There is one so far.' : 'There are none yet.') + '</p>';
    return;
  }

  const { w, h, left, right, top, bottom } = CHART;
  const plotW = w - left - right;
  const plotH = h - top - bottom;
  const x = i => left + (done.length === 1 ? plotW / 2 : (i / (done.length - 1)) * plotW);
  const y = pct => top + plotH - (pct / 100) * plotH;

  const grid = [0, 25, 50, 75, 100].map(v =>
    '<line class="chart-grid" x1="' + left + '" y1="' + y(v) + '" x2="' + (w - right) + '" y2="' + y(v) + '"/>' +
    '<text class="chart-axis" x="' + (left - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + '%</text>'
  ).join('');

  const line = values => values
    .map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');

  const theirs = done.map(p => p.pct);
  const classLine = done.every(p => typeof p.classAvg === 'number')
    ? done.map(p => p.classAvg) : null;

  const dots = done.map((p, i) =>
    '<circle class="chart-dot' + (p.provisional ? ' provisional' : '') + '" ' +
      'cx="' + x(i).toFixed(1) + '" cy="' + y(p.pct).toFixed(1) + '" r="4.5" data-i="' + i + '"/>'
  ).join('');

  // Labels thin out rather than collide.
  const every = Math.ceil(done.length / 8);
  const xLabels = done.map((p, i) => (i % every === 0 || i === done.length - 1)
    ? '<text class="chart-axis" x="' + x(i).toFixed(1) + '" y="' + (h - bottom + 20) + '" text-anchor="middle">' +
      esc(shortDate(p.at)) + '</text>'
    : '').join('');

  // Named at the end of each line as well as in the legend, so the two are never
  // told apart by colour alone.
  const endLabel = (values, cls, text) => {
    const i = values.length - 1;
    return '<text class="chart-end ' + cls + '" x="' + (x(i) + 7) + '" y="' + (y(values[i]) + 4) + '">' +
      esc(text) + '</text>';
  };

  const legend = '<p class="chart-legend">' +
    '<span class="key key-them">Them</span>' +
    (classLine ? '<span class="key key-class">Class average</span>' : '') +
    '</p>';

  el.innerHTML = legend +
    '<div class="chart" data-chart>' +
      '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" ' +
        'aria-label="Percentage on each question set over time. ' +
        esc(done.map(p => p.title + ' ' + p.pct + ' percent' +
          (typeof p.classAvg === 'number' ? ', class average ' + p.classAvg + ' percent' : '')).join('. ')) + '">' +
        grid +
        '<line class="chart-cross hidden" y1="' + top + '" y2="' + (top + plotH) + '"/>' +
        (classLine ? '<path class="chart-line chart-line-class" d="' + line(classLine) + '"/>' : '') +
        '<path class="chart-line" d="' + line(theirs) + '"/>' +
        dots + xLabels +
        endLabel(theirs, 'chart-end-them', 'Them') +
        (classLine ? endLabel(classLine, 'chart-end-class', 'Class') : '') +
        '<rect class="chart-hit" x="' + left + '" y="' + top + '" width="' + plotW + '" height="' + plotH + '"/>' +
      '</svg>' +
      '<div class="chart-tip hidden"></div>' +
    '</div>';

  wireChart(el.querySelector('[data-chart]'), done, x, y);
}

function shortDate(seconds) {
  if (!seconds) return '';
  return new Date(seconds * 1000).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });
}

function wireChart(root, done, x, y) {
  const svg = root.querySelector('svg');
  const tip = root.querySelector('.chart-tip');
  const cross = root.querySelector('.chart-cross');
  const hit = root.querySelector('.chart-hit');

  const show = i => {
    const p = done[i];
    const lines = ['<b>' + esc(p.title) + '</b>',
      p.awarded + ' of ' + p.outOf + ', ' + p.pct + '%'];
    if (typeof p.classAvg === 'number') lines.push('class average ' + p.classAvg + '%');
    if (p.place && p.sat > 1) lines.push(ordinal(p.place) + ' of ' + p.sat);
    if (p.provisional) lines.push('still being marked');
    tip.innerHTML = lines.join('<br>');
    tip.classList.remove('hidden');
    cross.classList.remove('hidden');
    cross.setAttribute('x1', x(i));
    cross.setAttribute('x2', x(i));

    // Place the tip over the point, in the element's own pixels rather than the
    // viewBox's, and keep it inside the box.
    const box = svg.getBoundingClientRect();
    const scale = box.width / CHART.w;
    const px = x(i) * scale;
    const py = y(p.pct) * scale;
    tip.style.left = Math.max(4, Math.min(px - tip.offsetWidth / 2, box.width - tip.offsetWidth - 4)) + 'px';
    tip.style.top = Math.max(4, py - tip.offsetHeight - 12) + 'px';
    root.querySelectorAll('.chart-dot').forEach(d =>
      d.classList.toggle('on', Number(d.dataset.i) === i));
  };

  const hide = () => {
    tip.classList.add('hidden');
    cross.classList.add('hidden');
    root.querySelectorAll('.chart-dot').forEach(d => d.classList.remove('on'));
  };

  const nearest = event => {
    const box = svg.getBoundingClientRect();
    const vx = ((event.clientX - box.left) / box.width) * CHART.w;
    let best = 0, bestGap = Infinity;
    done.forEach((p, i) => {
      const gap = Math.abs(x(i) - vx);
      if (gap < bestGap) { bestGap = gap; best = i; }
    });
    return best;
  };

  hit.addEventListener('mousemove', e => show(nearest(e)));
  hit.addEventListener('mouseleave', hide);
  hit.addEventListener('click', e => show(nearest(e)));
  root.querySelectorAll('.chart-dot').forEach(dot => {
    dot.addEventListener('mouseenter', () => show(Number(dot.dataset.i)));
  });
}
