// Checkin - how a class has done across its sets, and the small charts that show it.
//
// Marks are recomputed here from each set's answer key rather than trusted from
// the stored score, because a set whose responses page the teacher never opened
// has no stored marks at all and would otherwise read as zero.

import {
  listSets, getResponses, getKey, computeMarks, totalAwarded, maxScore,
  needsMarking, answeredCount, esc
} from './core.js?v=8faff7a-2110';

function when(set) {
  const t = set.openedAt || set.createdAt;
  return (t && t.seconds) || 0;
}

// Everything a class has done, oldest set first.
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

  // uid -> one point per set, in set order
  const byStudent = new Map();
  for (const { set, key, responses } of loaded) {
    const outOf = maxScore(set);
    for (const r of responses) {
      const attempted = answeredCount(set, r) > 0;
      const marks = computeMarks(set, r, key);
      const awarded = totalAwarded(set, marks);
      if (!byStudent.has(r.uid)) byStudent.set(r.uid, []);
      byStudent.get(r.uid).push({
        setId: set.id,
        title: set.title || 'Untitled',
        at: when(set),
        attempted,
        awarded,
        outOf,
        // A percentage is provisional while any written answer is still unmarked,
        // because those count as nothing until the teacher gets to them.
        provisional: needsMarking(set, r),
        pct: attempted && outOf ? Math.round((awarded / outOf) * 100) : null
      });
    }
  }

  return { sets: loaded.map(l => l.set), byStudent };
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
   One student, one measure, ordered in time, so: a line. The axis is pinned to
   0-100 because the numbers are percentages and a trimmed axis would invent
   drama that is not there. One series, so no legend: the heading names it. The
   table under the chart carries the same numbers for anyone who cannot use it.
------------------------------------------------------ */

const CHART = { w: 640, h: 260, left: 46, right: 18, top: 18, bottom: 44 };

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

  const path = done.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.pct).toFixed(1)).join(' ');

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

  el.innerHTML =
    '<div class="chart" data-chart>' +
      '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" ' +
        'aria-label="Percentage on each question set over time. ' +
        esc(done.map(p => p.title + ' ' + p.pct + ' percent').join(', ')) + '">' +
        grid +
        '<line class="chart-cross hidden" y1="' + top + '" y2="' + (top + plotH) + '"/>' +
        '<path class="chart-line" d="' + path + '"/>' +
        dots + xLabels +
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
    tip.innerHTML = '<b>' + esc(p.title) + '</b><br>' + p.awarded + ' of ' + p.outOf +
      ', ' + p.pct + '%' + (p.provisional ? '<br>still being marked' : '');
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
