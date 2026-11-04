// The Long Game - step through one match round by round.
// Used by the build page (test matches) and the teacher page (any match).

import { playMatch } from './engine.js?v=20261105-065547';
import { rulePhrase, decisionPhrase } from './readback.js?v=20261105-065547';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const letter = m => (m === 'cooperate' ? 'C' : 'D');

function why(strategy, pick, round) {
  if (round === 1 || pick.rule === -1) return 'First move: ' + decisionPhrase(strategy.firstMove, strategy) + '.';
  let text = pick.rule === -2
    ? 'No rule fitted, so the fallback: ' + decisionPhrase(strategy.fallback, strategy) + '.'
    : `Rule ${pick.rule + 1}${strategy.rules[pick.rule].label ? ' (' + strategy.rules[pick.rule].label + ')' : ''}: ` + rulePhrase(strategy.rules[pick.rule], strategy);
  if (pick.slipped) text += ` Then a random slip turned ${pick.intended} into ${pick.move}.`;
  return text;
}

// opts: { a, b, nameA, nameB, rounds, seed, payoffs, match? }
// match can be passed in if it has already been played with log: true.
export function mountReplay(el, opts) {
  const m = opts.match || playMatch(opts.a, opts.b, { rounds: opts.rounds, seed: opts.seed, payoffs: opts.payoffs, log: true });
  const R = m.log.length;
  let at = R;          // rounds shown so far
  let timer = null;

  el.classList.add('replay');
  el.innerHTML = `
    <div class="board">
      <div class="side"><div class="who"><span class="key" style="background:var(--series-a)"></span>${esc(opts.nameA)}</div><div class="mv" data-a></div><div class="total num" data-ta></div><div class="small muted" data-pa></div></div>
      <div class="mid"><div class="label">Round</div><div class="round num" data-round></div><div class="small muted" data-left></div></div>
      <div class="side"><div class="who"><span class="key" style="background:var(--series-b)"></span>${esc(opts.nameB)}</div><div class="mv" data-b></div><div class="total num" data-tb></div><div class="small muted" data-pb></div></div>
    </div>
    <div class="row" style="align-items:flex-start;gap:18px">
      <p class="why" style="flex:1" data-wa></p><p class="why" style="flex:1;text-align:right" data-wb></p>
    </div>
    <div class="controls">
      <button class="btn" data-first title="Start">&#9198;</button>
      <button class="btn" data-prev title="Back one round">&#9664;</button>
      <button class="btn primary" data-play>Play</button>
      <button class="btn" data-next title="Forward one round">&#9654;</button>
      <input type="range" min="1" max="${R}" value="${R}" aria-label="Round" data-scrub>
    </div>
    <div style="margin-top:12px">
      <div class="label" style="margin-bottom:4px">${esc(opts.nameA)}</div><div class="strip" data-sa></div>
      <div class="label" style="margin:8px 0 4px">${esc(opts.nameB)}</div><div class="strip" data-sb></div>
    </div>
    <div class="chart" style="margin-top:14px" data-chart></div>`;

  const $ = s => el.querySelector(s);
  const stripA = $('[data-sa]'), stripB = $('[data-sb]');
  for (const r of m.log) {
    const ia = document.createElement('i'); ia.className = (r.a.move === 'defect' ? 'd' : '') + (r.a.slipped ? ' slip' : '');
    const ib = document.createElement('i'); ib.className = (r.b.move === 'defect' ? 'd' : '') + (r.b.slipped ? ' slip' : '');
    ia.title = `Round ${r.round}: ${r.a.move}`; ib.title = `Round ${r.round}: ${r.b.move}`;
    ia.onclick = ib.onclick = () => show(r.round);
    stripA.append(ia); stripB.append(ib);
  }

  // Running totals: two lines, one axis, labelled at their ends.
  const chart = $('[data-chart]');
  const W = 640, H = 200, L = 40, Rm = 130, T = 10, B = 26;
  const maxY = Math.max(10, ...m.log.map(r => Math.max(r.totalA, r.totalB)));
  const x = i => L + (W - L - Rm) * (R === 1 ? 0 : (i - 1) / (R - 1));
  const y = v => T + (H - T - B) * (1 - v / maxY);
  const pts = key => m.log.map(r => `${x(r.round).toFixed(1)},${y(r[key]).toFixed(1)}`).join(' ');
  const ticks = [0, Math.round(maxY / 2), maxY];
  chart.innerHTML = `<div class="label">Running total</div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Running totals for both players">
      <g class="grid">${ticks.map(t => `<line x1="${L}" x2="${W - Rm}" y1="${y(t)}" y2="${y(t)}"/><text x="${L - 6}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join('')}</g>
      <text x="${L}" y="${H - 6}">1</text><text x="${W - Rm}" y="${H - 6}" text-anchor="end">${R}</text>
      <polyline points="${pts('totalA')}" fill="none" stroke="var(--series-a)" stroke-width="2"/>
      <polyline points="${pts('totalB')}" fill="none" stroke="var(--series-b)" stroke-width="2"/>
      <text x="${W - Rm + 6}" y="${y(m.scoreA) + (m.scoreA >= m.scoreB ? -2 : 12)}" style="fill:var(--ink)">${esc(opts.nameA.slice(0, 16))}</text>
      <text x="${W - Rm + 6}" y="${y(m.scoreB) + (m.scoreB > m.scoreA ? -2 : 12)}" style="fill:var(--ink)">${esc(opts.nameB.slice(0, 16))}</text>
      <line data-cursor y1="${T}" y2="${H - B}" stroke="var(--ink)" stroke-width="1" stroke-dasharray="3 3"/>
      <rect x="${L}" y="${T}" width="${W - L - Rm}" height="${H - T - B}" fill="transparent" data-hit style="cursor:crosshair"/>
    </svg>`;
  const svg = chart.querySelector('svg');
  const hit = chart.querySelector('[data-hit]');
  const roundAt = evt => {
    const p = svg.createSVGPoint(); p.x = evt.clientX; p.y = evt.clientY;
    const local = p.matrixTransform(svg.getScreenCTM().inverse());
    return Math.max(1, Math.min(R, Math.round(1 + (local.x - L) / (W - L - Rm) * (R - 1))));
  };
  hit.addEventListener('pointermove', e => { stop(); show(roundAt(e)); });
  hit.addEventListener('click', e => { stop(); show(roundAt(e)); });

  function show(n) {
    at = Math.max(1, Math.min(R, n));
    const r = m.log[at - 1];
    const mvA = $('[data-a]'), mvB = $('[data-b]');
    mvA.className = 'mv ' + letter(r.a.move).toLowerCase(); mvA.textContent = letter(r.a.move);
    mvB.className = 'mv ' + letter(r.b.move).toLowerCase(); mvB.textContent = letter(r.b.move);
    $('[data-ta]').textContent = r.totalA;
    $('[data-tb]').textContent = r.totalB;
    $('[data-pa]').textContent = `+${r.ptsA} this round`;
    $('[data-pb]').textContent = `+${r.ptsB} this round`;
    $('[data-round]').textContent = `${at} of ${R}`;
    const left = R - at;
    $('[data-left]').textContent = left === 0 ? 'final round' : `${left} to go`;
    $('[data-wa]').textContent = why(opts.a, r.a, r.round) + memText(r.memA);
    $('[data-wb]').textContent = why(opts.b, r.b, r.round) + memText(r.memB);
    $('[data-scrub]').value = at;
    stripA.querySelectorAll('.now').forEach(i => i.classList.remove('now'));
    stripB.querySelectorAll('.now').forEach(i => i.classList.remove('now'));
    stripA.children[at - 1].classList.add('now');
    stripB.children[at - 1].classList.add('now');
    const cx = x(at);
    const cur = chart.querySelector('[data-cursor]');
    cur.setAttribute('x1', cx); cur.setAttribute('x2', cx);
  }
  const memText = mem => {
    const e = Object.entries(mem || {});
    return e.length ? ' Memory: ' + e.map(([k, v]) => `${k} = ${v}`).join(', ') + '.' : '';
  };

  function stop() { clearInterval(timer); timer = null; $('[data-play]').textContent = 'Play'; }
  function play() {
    if (timer) return stop();
    if (at >= R) show(1);
    $('[data-play]').textContent = 'Pause';
    const step = Math.max(40, Math.min(400, 6000 / R));
    timer = setInterval(() => { if (at >= R) stop(); else show(at + 1); }, step);
  }

  $('[data-first]').onclick = () => { stop(); show(1); };
  $('[data-prev]').onclick = () => { stop(); show(at - 1); };
  $('[data-next]').onclick = () => { stop(); show(at + 1); };
  $('[data-play]').onclick = play;
  $('[data-scrub]').oninput = e => { stop(); show(+e.target.value); };

  show(R);
  return { match: m, show, stop };
}
