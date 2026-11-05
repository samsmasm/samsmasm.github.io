// The Long Game - drawing a tournament's results, and CSV export.

import { playPair } from './tournament.js?v=20261105-092620';
import { mountReplay } from './replay.js?v=20261105-092620';
import { rulePhrase } from './readback.js?v=20261105-092620';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = x => Math.round(x * 100) + '%';
const label = t => `${t.name} (${t.handle})`;

let tip;
function tooltip(evt, html) {
  if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; document.body.append(tip); }
  if (!html) { tip.style.display = 'none'; return; }
  tip.innerHTML = html;
  tip.style.display = 'block';
  tip.style.left = Math.min(window.innerWidth - 290, evt.clientX + 14) + 'px';
  tip.style.top = (evt.clientY + 14) + 'px';
}

// opts.mine: the entry id to pick out as "you" (the competitions page).
export function renderResults(res, panes, opts = {}) {
  board(res, panes.board, opts.mine);
  headToHead(res, panes.h2h, panes);
  graphs(res, panes.graphs, opts.mine);
  replayPicker(res, panes.replay, opts.mine);
  exporter(res, panes.export);
}

// ---------------------------------------------------------------------------

function board(res, el, mine) {
  const max = Math.max(1, ...res.table.map(t => t.total));
  let lastTotal = null, shown = 0;
  el.innerHTML = `<div class="panel scroller"><table>
    <thead><tr><th class="n">#</th><th>Strategy</th><th>By</th><th class="n">Years</th><th style="width:28%"></th><th class="n">Per round</th><th class="n">Cooperates</th></tr></thead>
    <tbody>${res.ranking.map((t, k) => {
      if (t.total !== lastTotal) shown = k + 1;
      lastTotal = t.total;
      return `<tr${t.id === mine ? ' class="mine"' : ''}>
        <td class="n">${shown}</td><td><strong>${esc(t.name)}</strong>${t.id === mine ? ' <span class="label" style="color:var(--amber-ink)">you</span>' : ''}</td><td>${esc(t.handle)}</td>
        <td class="n"><strong>${t.total}</strong></td>
        <td><div class="bar" style="width:${(100 * t.total / max).toFixed(1)}%"></div></td>
        <td class="n">${t.average.toFixed(2)}</td><td class="n">${pct(t.coopRate)}</td></tr>`;
    }).join('')}</tbody></table>
    <p class="small muted" style="margin-top:10px"><strong>Fewest years wins.</strong> ${res.entries.length} strategies, ${res.matches.length} matches of ${res.opts.rounds} rounds, seed "${esc(res.opts.seed)}", ${res.opts.selfPlay ? 'including' : 'not including'} self play. Per round: 2 is steady cooperation, 4 is steady defection.</p></div>`;
}

// ---------------------------------------------------------------------------

const H2H_MAX = 40;

function headToHead(res, el, panes) {
  if (res.entries.length > H2H_MAX) {
    el.innerHTML = `<div class="panel"><p>Too many strategies to draw (${res.entries.length}). Download the head to head CSV from Export, or watch any pair in Replay.</p></div>`;
    return;
  }
  const order = res.ranking.map(t => t.index);
  const R = res.opts.rounds;
  // Sequential: one hue, light to dark, for average years per round 0 to 5.
  const fill = v => `color-mix(in srgb, var(--series-a) ${Math.round(8 + 82 * v / 5)}%, #fffdf8)`;
  el.innerHTML = `<div class="panel">
    <p class="small muted">Each row's average years per round against each column. Darker means more years in jail. Click a square to watch that match.</p>
    <div class="scroller"><table class="h2h" style="width:auto">
      <thead><tr><th></th>${order.map(j => `<th class="colh" title="${esc(res.table[j].name)}">${esc(res.table[j].name.length > 22 ? res.table[j].name.slice(0, 21) + '...' : res.table[j].name)}</th>`).join('')}</tr></thead>
      <tbody>${order.map(i => `<tr><th class="rowh">${esc(res.table[i].name)}</th>${order.map(j => {
        const s = res.h2h[i][j];
        if (s === null) return '<td style="background:var(--surface-2)" title="Did not play">-</td>';
        const v = s / R;
        return `<td data-i="${i}" data-j="${j}" style="background:${fill(v)};color:${v >= 3.5 ? '#fff' : 'var(--ink)'};cursor:pointer">${v.toFixed(1)}</td>`;
      }).join('')}</tr>`).join('')}</tbody>
    </table></div>
    <p class="small muted" style="margin-top:8px">Scale: <span style="background:${fill(0)};padding:2px 6px">0</span> <span style="background:${fill(1)};padding:2px 6px">1</span> <span style="background:${fill(3)};padding:2px 6px">3</span> <span style="background:${fill(5)};padding:2px 6px;color:#fff">5</span> years per round</p>
  </div>`;
  el.querySelectorAll('td[data-i]').forEach(td => {
    const i = +td.dataset.i, j = +td.dataset.j;
    td.onmousemove = e => tooltip(e, `<strong>${esc(res.table[i].name)}</strong> ${res.h2h[i][j]} years<br><strong>${esc(res.table[j].name)}</strong> ${res.h2h[j][i]} years`);
    td.onmouseleave = () => tooltip(null);
    td.onclick = () => { tooltip(null); panes.openReplay(i, j); };
  });
}

// ---------------------------------------------------------------------------

function graphs(res, el, mine) {
  const R = res.opts.rounds;
  const mineIndex = res.table.find(t => t.id === mine)?.index;
  el.innerHTML = `<div class="panel">
      <div class="row" style="justify-content:space-between">
        <h3 style="margin:0">Years per round, through the match</h3>
        <label class="small">Highlight <select data-hl>${res.ranking.map(t => `<option value="${t.index}" ${t.index === mineIndex ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>
      </div>
      <p class="small muted">Averaged over every match. Lower is better. A rise near the end means defecting as the game runs out. Grey lines are everyone else. Smoothed over 5 rounds; hover for exact values.</p>
      <div class="chart" data-lines></div>
    </div>
    <div class="panel">
      <h3>How often each strategy cooperates</h3>
      <div class="chart" data-coop></div>
    </div>`;

  const W = 720, H = 280, L = 34, Rm = 140, T = 10, B = 26;
  const x = r => L + (W - L - Rm) * (R === 1 ? 0 : r / (R - 1));
  const y = v => T + (H - T - B) * (1 - v / 5);
  // Lines are smoothed over 5 rounds, or random strategies turn the chart to
  // noise. The tooltip gives the exact value for the round.
  const half = R >= 50 ? 2 : 0;
  const smooth = new Map(res.table.map(t => [t, Array.from(t.perRound, (_, r) => {
    const lo = Math.max(0, r - half), hi = Math.min(R - 1, r + half);
    let s = 0;
    for (let k = lo; k <= hi; k++) s += t.perRound[k];
    return s / (hi - lo + 1);
  })]));
  const path = t => smooth.get(t).map((v, r) => `${x(r).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const lines = el.querySelector('[data-lines]');
  function drawLines(hl) {
    const h = res.table[hl];
    lines.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Average years per round for each strategy">
      <g class="grid">${[0, 2, 4, 5].map(v => `<line x1="${L}" x2="${W - Rm}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join('')}</g>
      <text x="${L}" y="${H - 6}">round 1</text><text x="${W - Rm}" y="${H - 6}" text-anchor="end">${R}</text>
      ${res.table.filter(t => t.index !== hl).map(t => `<polyline points="${path(t)}" fill="none" stroke="#c9c5ba" stroke-width="1"/>`).join('')}
      <polyline points="${path(h)}" fill="none" stroke="var(--series-a)" stroke-width="2.5"/>
      <text x="${W - Rm + 6}" y="${y(smooth.get(h)[R - 1]) + 4}" style="fill:var(--ink);font-weight:700">${esc(h.name).slice(0, 18)}</text>
      <line data-cur y1="${T}" y2="${H - B}" stroke="var(--ink)" stroke-dasharray="3 3" style="display:none"/>
      <rect x="${L}" y="${T}" width="${W - L - Rm}" height="${H - T - B}" fill="transparent" data-hit/>
    </svg>`;
    const svg = lines.querySelector('svg'), hit = lines.querySelector('[data-hit]'), cur = lines.querySelector('[data-cur]');
    hit.onmousemove = e => {
      const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
      const lx = p.matrixTransform(svg.getScreenCTM().inverse()).x;
      const r = Math.max(0, Math.min(R - 1, Math.round((lx - L) / (W - L - Rm) * (R - 1))));
      cur.style.display = ''; cur.setAttribute('x1', x(r)); cur.setAttribute('x2', x(r));
      const avg = res.table.reduce((s, t) => s + t.perRound[r], 0) / res.table.length;
      tooltip(e, `Round ${r + 1}<br><strong>${esc(h.name)}</strong> ${h.perRound[r].toFixed(2)}<br>Everyone ${avg.toFixed(2)}`);
    };
    hit.onmouseleave = () => { cur.style.display = 'none'; tooltip(null); };
  }
  const sel = el.querySelector('[data-hl]');
  sel.onchange = () => drawLines(+sel.value);
  drawLines(+sel.value);

  // Cooperation bars, sorted, one colour, value labelled.
  const rows = [...res.table].sort((a, b) => b.coopRate - a.coopRate);
  const bh = 22, cw = 720, lw = 200;
  el.querySelector('[data-coop]').innerHTML = `<svg viewBox="0 0 ${cw} ${rows.length * bh + 6}" role="img" aria-label="Cooperation rate by strategy">
    ${rows.map((t, k) => `<text x="${lw - 8}" y="${k * bh + 15}" text-anchor="end" style="fill:var(--ink)">${esc(t.name).slice(0, 28)}</text>
      <rect x="${lw}" y="${k * bh + 4}" width="${Math.max(2, (cw - lw - 60) * t.coopRate)}" height="${bh - 8}" rx="3" fill="var(--series-a)"/>
      <text x="${lw + Math.max(2, (cw - lw - 60) * t.coopRate) + 6}" y="${k * bh + 15}">${pct(t.coopRate)}</text>`).join('')}
  </svg>`;
}

// ---------------------------------------------------------------------------

function replayPicker(res, el, mine) {
  const opts = res.ranking.map(t => `<option value="${t.index}">${esc(label(t))}</option>`).join('');
  el.innerHTML = `<div class="panel">
    <div class="row"><select data-a>${opts}</select><span>vs</span><select data-b>${opts}</select></div>
    <div data-view style="margin-top:12px"></div></div>`;
  const a = el.querySelector('[data-a]'), b = el.querySelector('[data-b]');
  const me = res.table.find(t => t.id === mine);
  if (me) {
    a.value = me.index;
    b.value = (res.ranking.find(t => t !== me) || me).index;
  } else if (res.ranking[1]) b.value = res.ranking[1].index;
  const show = () => openMatch(res, +a.value, +b.value, el.querySelector('[data-view]'));
  a.onchange = b.onchange = show;
  el.pick = (i, j) => { a.value = i; b.value = j; show(); };
  show();
}

function openMatch(res, i, j, view) {
  if (res.h2h[i][j] === null) {
    view.innerHTML = '<p class="muted">These two did not play each other (self play is off).</p>';
    return;
  }
  // Matches are stored as (lower index, higher index); replaying in that
  // order gives exactly the tournament's match, whichever side is asked for.
  const [p, q] = i <= j ? [i, j] : [j, i];
  const m = playPair(res.entries, p, q, { ...res.opts, log: true });
  const flip = p !== i;
  const match = flip ? {
    ...m, scoreA: m.scoreB, scoreB: m.scoreA, movesA: m.movesB, movesB: m.movesA,
    log: m.log.map(r => ({ ...r, a: r.b, b: r.a, ptsA: r.ptsB, ptsB: r.ptsA, totalA: r.totalB, totalB: r.totalA, memA: r.memB, memB: r.memA }))
  } : m;
  mountReplay(view, {
    a: res.entries[i].strategy, b: res.entries[j].strategy,
    nameA: res.entries[i].name, nameB: res.entries[j].name + (i === j ? ' (copy)' : ''), match
  });
}

// ---------------------------------------------------------------------------

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
const csv = rows => rows.map(r => r.map(csvCell).join(',')).join('\n');

function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function exporter(res, el) {
  const opts = res.ranking.map(t => `<option value="${t.index}">${esc(label(t))}</option>`).join('');
  el.innerHTML = `<div class="panel">
    <div class="row"><button class="btn" data-x="board">Leaderboard CSV</button><button class="btn" data-x="h2h">Head to head CSV</button></div>
    <h3 style="margin-top:18px">One match, round by round</h3>
    <div class="row"><select data-a>${opts}</select><span>vs</span><select data-b>${opts}</select><button class="btn" data-x="match">Match CSV</button><button class="btn" data-x="all">Every match (one file)</button></div>
  </div>`;
  const stamp = `seed-${res.opts.seed}-r${res.opts.rounds}`.replace(/[^A-Za-z0-9_-]/g, '');
  const roundRows = (i, j) => {
    const [p, q] = i <= j ? [i, j] : [j, i];
    const m = playPair(res.entries, p, q, { ...res.opts, log: true });
    const A = res.entries[p], Bn = res.entries[q];
    const why = (s, c) => c.rule === -1 ? 'first move' : c.rule === -2 ? 'fallback' : `rule ${c.rule + 1}: ${rulePhrase(s.rules[c.rule], s)}`;
    return m.log.map(r => [A.name, Bn.name, r.round, res.opts.rounds - r.round, r.a.move, r.b.move, r.ptsA, r.ptsB, r.totalA, r.totalB,
      why(A.strategy, r.a), why(Bn.strategy, r.b), r.a.slipped ? 'yes' : '', r.b.slipped ? 'yes' : '']);
  };
  const head = ['strategy A', 'strategy B', 'round', 'rounds left after', 'A move', 'B move', 'A years', 'B years', 'A total years', 'B total years', 'A reason', 'B reason', 'A slipped', 'B slipped'];

  el.querySelector('[data-x="board"]').onclick = () => download(`leaderboard-${stamp}.csv`, csv([
    ['rank', 'strategy', 'handle', 'total', 'average per round', 'cooperation rate', 'matches'],
    ...res.ranking.map((t, k) => [k + 1, t.name, t.handle, t.total, t.average.toFixed(3), t.coopRate.toFixed(3), t.matches])
  ]));
  el.querySelector('[data-x="h2h"]').onclick = () => download(`head-to-head-${stamp}.csv`, csv([
    ['years for row against column', ...res.table.map(t => t.name)],
    ...res.table.map((t, i) => [t.name, ...res.h2h[i]])
  ]));
  el.querySelector('[data-x="match"]').onclick = () => {
    const i = +el.querySelector('[data-a]').value, j = +el.querySelector('[data-b]').value;
    if (res.h2h[i][j] === null) return;
    download(`match-${stamp}.csv`, csv([head, ...roundRows(i, j)]));
  };
  el.querySelector('[data-x="all"]').onclick = () => {
    const rows = [head];
    for (const mm of res.matches) rows.push(...roundRows(mm.i, mm.j));
    download(`all-matches-${stamp}.csv`, csv(rows));
  };
}
