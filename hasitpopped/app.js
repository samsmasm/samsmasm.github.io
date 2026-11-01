'use strict';
/* Has it popped? Reads data.json (daily, from fetch.py) and manual.json (hand-entered).
   Every traffic-light threshold lives in SIGNALS below. */

const $ = (s) => document.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sign = (v) => (v > 0 ? '+' : v < 0 ? '−' : '');
const pct = (v, d = 1) => (v == null ? '–' : sign(v) + Math.abs(v).toFixed(d) + '%');
const num = (v, d = 1) => (v == null ? '–' : (v < 0 ? '−' : '') + Math.abs(v).toFixed(d));
const lastVal = (a) => { for (let i = a.length - 1; i >= 0; i--) if (a[i] != null) return a[i]; return null; };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dShort = (iso) => `${+iso.slice(8, 10) || ''} ${MON[+iso.slice(5, 7) - 1]} ${iso.slice(2, 4)}`.trim();
const dLong = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const mShort = (iso) => `${MON[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;

let D, M;               // data.json, manual.json
const renders = {};     // tab -> list of chart render fns (re-run on resize)

/* ---------- grading ---------- */
function grade(v, amber, red, highIsBad) {
  if (v == null) return 'grey';
  if (highIsBad) return v >= red ? 'red' : v >= amber ? 'amber' : 'green';
  return v <= red ? 'red' : v <= amber ? 'amber' : 'green';
}
const WORD = { green: 'Fine', amber: 'Watch', red: 'Warning', grey: 'No data' };

const SIGNALS = [
  { id: 'ai', name: 'AI stocks, from peak', series: 'aiDrawdown', amber: -10, red: -20,
    fmt: (v) => pct(v), sub: () => `AI index peaked ${dShort(aiPeakDate())}`,
    what: 'An equal-weighted index of 21 US-listed AI stocks: chip makers, cloud giants, neoclouds, data-centre power and AI software. How far it is below its highest close.',
    rule: 'Amber at −10%. Red at −20%, the usual line for a bear market.' },
  { id: 'leaders', name: 'Big tech vs the average stock', series: 'leaders', amber: -5, red: -10,
    fmt: (v) => pct(v), sub: () => 'Nasdaq-100 ÷ equal-weight S&P 500, from peak',
    what: 'The Nasdaq-100 (QQQ) divided by the equal-weight S&P 500 (RSP). While AI leads, this climbs. When money leaves big tech for everything else, it falls.',
    rule: 'Amber at 5% below its peak, red at 10%.' },
  { id: 'breadth', name: 'AI stocks above 200-day average', series: 'breadthAI', amber: 60, red: 40,
    fmt: (v) => Math.round(v) + '%', sub: () => { const u = usStocks(); return `${u.filter((s) => s.vs200 > 0).length} of ${u.filter((s) => s.vs200 != null).length} stocks`; },
    what: 'The share of the AI stocks trading above their own 200-day average price, a common test of a long-run uptrend. A bubble leaking from the inside shows up here before the index falls.',
    rule: 'Amber under 60%, red under 40%.' },
  { id: 'vxn', name: 'Nasdaq fear gauge (VXN)', series: 'vxn', amber: 25, red: 30, high: true,
    fmt: (v) => num(v, 1), sub: () => (D.macro.vix ? `VIX (S&P 500) ${num(D.macro.vix.value)}` : ''),
    what: 'Expected volatility of the Nasdaq-100 over the next month, priced from options. Calm markets sit around 15 to 20. It jumps when investors rush to buy protection.',
    rule: 'Amber at 25, red at 30.' },
  { id: 'hy', name: 'Junk bond spread', series: 'hy', amber: 4, red: 5, high: true,
    fmt: (v) => num(v, 2) + '%', sub: () => { const h = D.series.hy, a = lastVal(h), b = h[h.length - 64]; return a != null && b != null ? `${sign(a - b)}${Math.abs(a - b).toFixed(2)} pts in 3 months` : ''; },
    what: 'The extra interest risky companies pay over US government bonds (ICE BofA US High Yield spread). Lenders demand more when they get nervous. Much of the data-centre build-out is now borrowed money.',
    rule: 'Amber at 4%, red at 5%. Also amber if it rises a full point in 3 months.' },
  { id: 'capex', name: 'Big Tech spending plans', manual: true,
    what: 'Full-year capital spending guidance from the four biggest AI spenders. This money is the demand behind the chip and data-centre stocks. A cut from one is a warning; cuts from several is the pop.',
    rule: 'Amber if one company cuts guidance, red if two or more do.' },
  { id: 'nvidia', name: 'Nvidia data-centre revenue', manual: true,
    what: 'Nvidia sells most of the AI chips, so its data-centre sales are the clearest measure of real AI spending, not just stock prices.',
    rule: 'Amber if year-on-year growth falls under 40%, red under 15% or if a quarter falls.' },
  { id: 'gpu', name: 'Price to rent an AI chip', manual: true,
    what: 'Hourly price to rent an Nvidia H100 from specialist clouds. If too many data centres have been built, rental prices fall. Rising prices mean demand still outruns supply.',
    rule: 'Amber if it falls 15% from the earliest point shown, red at 30%.' },
];

/* ---------- helpers on data ---------- */
const usStocks = () => D.stocks.filter((s) => s.layer !== 'Asia');
function aiPeakDate() {
  const a = D.series.ai; let m = -Infinity, k = 0;
  a.forEach((v, i) => { if (v != null && v >= m) { m = v; k = i; } });
  return D.dates[k];
}
function signalState(sig) {
  if (!sig.manual) {
    const v = lastVal(D.series[sig.series]);
    let g = grade(v, sig.amber, sig.red, sig.high);
    if (sig.id === 'hy' && g === 'green') {
      const h = D.series.hy, b = h[h.length - 64];
      if (v != null && b != null && v - b >= 1) g = 'amber';
    }
    return { g, v: sig.fmt(v), s: sig.sub() };
  }
  if (sig.id === 'capex') {
    const cs = M.capex.companies, cuts = cs.filter((c) => c.guide < c.prev).length;
    const ups = cs.filter((c) => c.guide > c.prev).length;
    const total = cs.reduce((a, c) => a + c.guide, 0);
    return { g: cuts >= 2 ? 'red' : cuts === 1 ? 'amber' : 'green', v: `$${Math.round(total)}bn`,
      s: `${M.capex.year} plans · ${cuts} cut, ${ups} raised, ${cs.length - cuts - ups} held` };
  }
  if (sig.id === 'nvidia') {
    const q = M.nvidia.quarters.filter((x) => x.dc != null);
    const fell = q.length > 1 && q[q.length - 1].dc < q[q.length - 2].dc;
    const y = M.nvidia.yoy;
    return { g: fell || y < 15 ? 'red' : y < 40 ? 'amber' : 'green', v: pct(y, 0),
      s: `Year on year · $${q[q.length - 1].dc}bn in ${q[q.length - 1].q}` };
  }
  if (sig.id === 'gpu') {
    const p = M.gpu.points, a = p[0], b = p[p.length - 1], ch = (b.p / a.p - 1) * 100;
    return { g: ch <= -30 ? 'red' : ch <= -15 ? 'amber' : 'green', v: `$${b.p.toFixed(2)}`,
      s: `H100 per hour · ${pct(ch, 0)} since ${mShort(a.d + '-01')}` };
  }
}

/* ---------- colour scales ---------- */
const NEUTRAL = [243, 240, 231], GOOD = [31, 111, 87], BAD = [156, 42, 42];
function heat(v, [bad, mid, good]) {
  if (v == null) return { bg: '#ebe8e0', fg: '#5b6680' };
  const t = (v - mid) * (good - mid) >= 0 ? Math.min(1, (v - mid) / (good - mid)) : -Math.min(1, (v - mid) / (bad - mid));
  const to = t > 0 ? GOOD : BAD, k = Math.abs(t);
  const c = NEUTRAL.map((n, i) => Math.round(n + (to[i] - n) * k));
  return { bg: `rgb(${c})`, fg: k > 0.55 ? '#fff' : '#1e2a4a' };
}

/* ---------- tooltip ---------- */
const tip = $('#tip');
function showTip(html, e) {
  tip.innerHTML = html; tip.hidden = false;
  const r = tip.getBoundingClientRect();
  let x = e.clientX + 14, y = e.clientY + 14;
  if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
  if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14;
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
}
const hideTip = () => { tip.hidden = true; };

/* ---------- SVG line chart ---------- */
function niceStep(range, n) {
  const raw = range / n, p = 10 ** Math.floor(Math.log10(raw)), f = raw / p;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
}
/* o: { labels, lines:[{v,color,w,name,dash}], bands:[{lo,hi,fill}], extra:[y values to keep in view],
        fmt, minimal, ref, dots, tip(i) } */
function lineChart(host, o) {
  const W = Math.max(120, host.clientWidth), H = host.clientHeight || 120;
  const padL = o.minimal ? 0 : 40, padR = o.minimal ? 0 : 8, padT = 6, padB = o.minimal ? 2 : 20;
  const vals = o.lines.flatMap((l) => l.v).filter((v) => v != null).concat(o.extra || []);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (lo === hi) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
  const n = o.labels.length;
  const x = (i) => padL + (n <= 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (n - 1));
  const y = (v) => padT + ((hi - v) * (H - padT - padB)) / (hi - lo);
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  for (const b of o.bands || []) {
    const a = Math.max(lo, b.lo), c = Math.min(hi, b.hi);
    if (c > a) s += `<rect x="${padL}" y="${y(c)}" width="${W - padL - padR}" height="${y(a) - y(c)}" fill="${b.fill}"/>`;
  }
  if (!o.minimal) {
    const st = niceStep(hi - lo, 4);
    for (let t = Math.ceil(lo / st) * st; t <= hi; t += st) {
      const yy = y(t).toFixed(1);
      s += `<line x1="${padL}" x2="${W - padR}" y1="${yy}" y2="${yy}" stroke="#e3e0d8"/>`;
      s += `<text x="${padL - 6}" y="${+yy + 4}" text-anchor="end" font-size="11" fill="#5b6680">${esc(o.fmt(+t.toFixed(6)))}</text>`;
    }
    // x ticks: years if long, quarters if medium, months if short
    const span = n, ticks = [];
    o.labels.forEach((l, i) => {
      const prev = o.labels[i - 1];
      if (!prev) return;
      if (span > 400 ? l.slice(0, 4) !== prev.slice(0, 4)
        : span > 100 ? l.slice(5, 7) !== prev.slice(5, 7) && ['01', '04', '07', '10'].includes(l.slice(5, 7))
          : l.slice(5, 7) !== prev.slice(5, 7)) ticks.push(i);
    });
    if (n < 12) o.labels.forEach((_, i) => ticks.push(i));
    for (const i of ticks) {
      const l = o.labels[i];
      const txt = span > 400 ? l.slice(0, 4) : `${MON[+l.slice(5, 7) - 1]}${l.slice(5, 7) === '01' || n < 12 ? ' ' + l.slice(2, 4) : ''}`;
      s += `<line x1="${x(i)}" x2="${x(i)}" y1="${H - padB}" y2="${H - padB + 4}" stroke="#c9c5ba"/>`;
      s += `<text x="${x(i)}" y="${H - 4}" text-anchor="middle" font-size="11" fill="#5b6680">${txt}</text>`;
    }
  }
  if (o.ref != null && o.ref > lo && o.ref < hi) s += `<line x1="${padL}" x2="${W - padR}" y1="${y(o.ref)}" y2="${y(o.ref)}" stroke="#5b6680" stroke-dasharray="3 3" stroke-width="1"/>`;
  for (const l of o.lines) {
    let d = '', pen = false;
    l.v.forEach((v, i) => {
      if (v == null) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`; pen = true;
    });
    s += `<path d="${d}" fill="none" stroke="${l.color}" stroke-width="${l.w || 2}" stroke-linejoin="round" stroke-linecap="round"${l.dash ? ` stroke-dasharray="${l.dash}"` : ''}/>`;
    if (o.dots) l.v.forEach((v, i) => { if (v != null) s += `<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="${l.color}"/>`; });
    if (o.endDot !== false && !o.dots) {
      const i = l.v.length - 1; if (l.v[i] != null) s += `<circle cx="${x(i)}" cy="${y(l.v[i])}" r="3" fill="${l.color}"/>`;
    }
  }
  s += `<line class="hl" x1="0" x2="0" y1="${padT}" y2="${H - padB}" stroke="#1e2a4a" stroke-width="1" visibility="hidden"/>`;
  s += `<rect x="${padL}" y="0" width="${W - padL - padR}" height="${H}" fill="transparent"/></svg>`;
  host.innerHTML = s;
  if (!o.tip) return;
  const svg = host.firstChild, hl = svg.querySelector('.hl');
  svg.addEventListener('mousemove', (e) => {
    const bx = svg.getBoundingClientRect();
    const i = Math.max(0, Math.min(n - 1, Math.round(((e.clientX - bx.left - padL) / (W - padL - padR)) * (n - 1))));
    hl.setAttribute('x1', x(i)); hl.setAttribute('x2', x(i)); hl.setAttribute('visibility', 'visible');
    showTip(o.tip(i), e);
  });
  svg.addEventListener('mouseleave', () => { hl.setAttribute('visibility', 'hidden'); hideTip(); });
}
function spark(vals, color) {
  const v = vals.filter((x) => x != null); if (v.length < 2) return '';
  const lo = Math.min(...v), hi = Math.max(...v), W = 100, H = 26;
  const d = vals.map((p, i) => `${i ? 'L' : 'M'}${((i / (vals.length - 1)) * W).toFixed(1)},${(H - 1 - ((p - lo) / (hi - lo || 1)) * (H - 2)).toFixed(1)}`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="${color}" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>`;
}

const AMBER_BAND = 'rgba(244,166,41,.16)', RED_BAND = 'rgba(138,28,28,.09)';

/* ---------- Overview ---------- */
function renderOverview() {
  const states = SIGNALS.map((s) => ({ sig: s, ...signalState(s) }));
  const red = states.filter((s) => s.g === 'red').length, amber = states.filter((s) => s.g === 'amber').length;
  const green = states.filter((s) => s.g === 'green').length;
  const score = red + amber / 2;
  const [word, cls] = score < 1.5 ? ['Not yet.', 'green'] : score < 3 ? ['Wobbling.', 'amber'] : score < 4.5 ? ['Hissing.', 'amber'] : ['Popped.', 'red'];
  $('#answer').textContent = word; $('#answer').className = 'answer ' + cls;
  $('#tally').innerHTML = `<b>${red}</b> red · <b>${amber}</b> amber · <b>${green}</b> green, of ${states.length} signals`;
  $('#lights').innerHTML = states.map((s) => `<a href="#sig-${s.sig.id}" class="${s.g}" title="${esc(s.sig.name)}: ${WORD[s.g]}"></a>`).join('');

  const ai = D.series.ai, aiDD = lastVal(D.series.aiDrawdown), spx = D.bench['^GSPC'];
  const bear = D.stocks.filter((s) => s.fromPeak <= -20).length;
  $('#keynums').innerHTML = [
    ['AI index from peak', pct(aiDD), grade(aiDD, -10, -20), `Peak ${dShort(aiPeakDate())}`],
    ['AI index since Jan 2023', pct(lastVal(ai) - 100, 0), '', `S&P 500 ${pct(lastVal(D.series.spx) - 100, 0)}`],
    ['S&P 500 from peak', pct(spx?.fromPeak), grade(spx?.fromPeak, -10, -20), `Peak ${spx ? dShort(spx.peakDate) : ''}`],
    ['AI stocks down 20%+', `${bear} of ${D.stocks.length}`, '', 'In their own bear market'],
  ].map(([l, v, c, s]) => `<div class="keynum"><div class="label">${l}</div><div class="v ${c}">${v}</div><div class="s">${esc(s)}</div></div>`).join('');

  $('#cards').innerHTML = states.map((s) => `
    <article class="card ${s.g}" id="sig-${s.sig.id}">
      <div class="top"><span class="name">${esc(s.sig.name)}</span><span class="state">${WORD[s.g]}</span></div>
      <div class="v">${s.v}</div>
      <div class="s">${esc(s.s)}</div>
      <div class="chart" data-sig="${s.sig.id}"></div>
      <details><summary>What is this?</summary><p>${esc(s.sig.what)}</p><p><b>${esc(s.sig.rule)}</b></p>${manualNote(s.sig)}</details>
    </article>`).join('');

  renders.overview = [];
  for (const s of states) {
    const host = document.querySelector(`.chart[data-sig="${s.sig.id}"]`);
    renders.overview.push(() => cardChart(host, s.sig));
  }

  const lab = (name) => M.labs.find((l) => l.name === name);
  const spcx = D.stocks.find((s) => s.sym === 'SPCX');
  const ctx = [
    ['US 10-year yield', D.macro.us10y ? num(D.macro.us10y.value, 2) + '%' : '–', 'Cost of long-term money'],
    ['Fed funds rate', D.macro.fedfunds ? num(D.macro.fedfunds.value, 2) + '%' : '–', 'Cost of short-term money'],
    ['VIX', D.macro.vix ? num(D.macro.vix.value) : '–', 'S&P 500 fear gauge'],
    ['Anthropic', lab('Anthropic') ? `$${lab('Anthropic').value}bn` : '–', `Last private round, ${lab('Anthropic') ? mShort(lab('Anthropic').asOf + '-01') : ''}`],
    ['OpenAI', lab('OpenAI') ? `$${lab('OpenAI').value}bn` : '–', `Last private round, ${lab('OpenAI') ? mShort(lab('OpenAI').asOf + '-01') : ''}`],
    ['SpaceX (incl. xAI)', spcx ? `$${spcx.last.toFixed(0)}` : '–', spcx ? `${pct(spcx.fromPeak, 0)} from peak` : ''],
  ];
  $('#context').innerHTML = ctx.map(([l, v, s]) => `<div class="keynum"><div class="label">${l}</div><div class="v">${v}</div><div class="s">${esc(s)}</div></div>`).join('');
}

function manualNote(sig) {
  if (!sig.manual) return '';
  const src = (M[sig.id].sources || []).map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">source ${i + 1}</a>`).join(', ');
  return `<p>Entered by hand, last checked ${dShort(M.updated)}. ${src}</p>`;
}

function cardChart(host, sig) {
  if (!sig.manual) {
    const N = 504, v = D.series[sig.series].slice(-N), labels = D.dates.slice(-N);
    const bands = sig.high
      ? [{ lo: sig.amber, hi: sig.red, fill: AMBER_BAND }, { lo: sig.red, hi: 1e9, fill: RED_BAND }]
      : [{ lo: sig.red, hi: sig.amber, fill: AMBER_BAND }, { lo: -1e9, hi: sig.red, fill: RED_BAND }];
    const f = sig.id === 'hy' ? (t) => t + '%' : sig.id === 'vxn' ? (t) => String(t) : (t) => t + '%';
    return lineChart(host, { labels, lines: [{ v, color: '#1e2a4a', w: 1.6 }], bands, extra: [sig.amber, sig.red], fmt: f,
      tip: (i) => `${dShort(labels[i])}<br><b>${sig.fmt(v[i])}</b>` });
  }
  if (sig.id === 'capex') {
    const cs = M.capex.companies, max = Math.max(...cs.map((c) => Math.max(c.guide, c.prev)));
    host.style.height = 'auto';
    host.innerHTML = `<div style="display:grid;gap:5px;padding-top:4px">${cs.map((c) => {
      const cls = c.guide < c.prev ? 'red' : c.guide > c.prev ? 'green' : 'grey';
      const arrow = c.guide < c.prev ? '▼' : c.guide > c.prev ? '▲' : '=';
      return `<div class="${cls}" style="display:grid;grid-template-columns:68px 1fr 84px;align-items:center;gap:8px;font-size:13px;white-space:nowrap" title="${esc(c.note)}">
        <span>${esc(c.name)}</span>
        <span style="position:relative;height:12px;background:var(--surface-2);border-radius:2px">
          <span style="position:absolute;left:0;top:0;bottom:0;width:${(c.guide / max) * 100}%;background:var(--masthead);border-radius:2px"></span>
          <span style="position:absolute;top:-3px;bottom:-3px;width:2px;left:calc(${(c.prev / max) * 100}% - 1px);background:var(--amber)"></span></span>
        <span style="text-align:right;font-weight:700">$${c.guide}bn <span style="color:var(--c)">${arrow}</span></span></div>`;
    }).join('')}<div style="font-size:11px;color:var(--muted)">Bar: latest guidance. <span style="color:var(--amber-ink)">|</span> previous.</div></div>`;
    return;
  }
  if (sig.id === 'nvidia') {
    const q = M.nvidia.quarters, max = Math.max(...q.map((x) => x.dc || 0));
    host.innerHTML = `<div style="display:flex;align-items:flex-end;gap:6px;height:100%;padding-top:4px">${q.map((x) => `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;font-size:11px;color:var(--muted)">
        <b style="color:var(--ink);font-size:12px">${x.dc == null ? '' : '$' + x.dc}</b>
        <div style="width:100%;height:${x.dc == null ? 0 : (x.dc / max) * 70}%;background:var(--masthead);border-radius:2px 2px 0 0;${x.dc == null ? 'border-bottom:2px dashed var(--line)' : ''}"></div>
        <span>${esc(x.q.replace(/ 20/, ' '))}</span></div>`).join('')}</div>`;
    return;
  }
  if (sig.id === 'gpu') {
    const p = M.gpu.points, labels = p.map((x) => x.d + '-01'), v = p.map((x) => x.p);
    const a = v[0];
    return lineChart(host, { labels, lines: [{ v, color: '#1e2a4a', w: 2 }], dots: true,
      bands: [{ lo: a * 0.7, hi: a * 0.85, fill: AMBER_BAND }, { lo: 0, hi: a * 0.7, fill: RED_BAND }],
      extra: [a * 0.85], fmt: (t) => '$' + t.toFixed(1),
      tip: (i) => `${mShort(labels[i])}<br><b>$${v[i].toFixed(2)}</b> per hour<br>${esc(p[i].src)}` });
  }
}

/* ---------- Stocks ---------- */
const LAYER_COLOURS = { Chips: '#2f6db5', Hyperscalers: '#18634f', 'Neoclouds & power': '#b4462b', 'Software & labs': '#7a3d9a', Asia: '#b07d12' };
const MEASURES = [
  { k: 'fromPeak', l: 'From peak', stops: [-45, -12, 0] },
  { k: 'd1', l: '1 day', stops: [-5, 0, 5] },
  { k: 'w1', l: '1 week', stops: [-12, 0, 12] },
  { k: 'm1', l: '1 month', stops: [-20, 0, 20] },
  { k: 'ytd', l: 'This year', stops: [-40, 0, 60] },
  { k: 'y1', l: '1 year', stops: [-50, 0, 100] },
  { k: 'vs200', l: 'vs 200-day', stops: [-25, 0, 25] },
  { k: 'rel3m', l: 'vs S&P, 3m', stops: [-30, 0, 30] },
  { k: 'vol', l: 'Volatility', stops: [110, 50, 25], fmt: (v) => Math.round(v) + '%' },
  { k: 'daysSincePeak', l: 'Days since peak', stops: [365, 45, 0], fmt: (v) => v + ' days' },
];
let measure = MEASURES[0], range = 0, sortKey = null, sortDir = 1;
const lineOn = { 'AI index': true, 'S&P 500': true };

function renderStocks() {
  const us = usStocks(), dd = lastVal(D.series.aiDrawdown);
  const above = us.filter((s) => s.vs200 > 0).length, withMA = us.filter((s) => s.vs200 != null).length;
  const bear = D.stocks.filter((s) => s.fromPeak <= -20).length;
  const dc = D.stocks.filter((s) => s.deathCross).length, dcN = D.stocks.filter((s) => s.deathCross != null).length;
  const aiYtd = ytdOf(D.series.ai);
  $('#stocknums').innerHTML = [
    ['AI index from peak', pct(dd), grade(dd, -10, -20), `Peak ${dShort(aiPeakDate())}`],
    ['AI index this year', pct(aiYtd), '', `S&P 500 ${pct(ytdOf(D.series.spx))}`],
    ['Above 200-day average', `${above} of ${withMA}`, grade((above / withMA) * 100, 60, 40), 'US-listed AI stocks'],
    ['Down 20% or more', `${bear} of ${D.stocks.length}`, bear >= D.stocks.length / 2 ? 'red' : bear >= D.stocks.length / 4 ? 'amber' : 'green', 'From their own peak'],
    ['Death crosses', `${dc} of ${dcN}`, dc >= dcN / 2 ? 'red' : dc >= dcN / 4 ? 'amber' : 'green', '50-day average under 200-day'],
  ].map(([l, v, c, s]) => `<div class="keynum"><div class="label">${l}</div><div class="v ${c}">${v}</div><div class="s">${esc(s)}</div></div>`).join('');

  // legend
  const names = ['AI index', 'S&P 500', ...Object.keys(D.series.layers)];
  $('#legend').innerHTML = names.map((n) => `<button data-line="${esc(n)}" class="${lineOn[n] ? '' : 'off'}"><i style="background:${colourOf(n)}"></i>${esc(n)}</button>`).join('');

  // layers
  $('#layers').innerHTML = Object.entries(D.series.layers).map(([L, v]) => {
    const dd = ((lastVal(v) / Math.max(...v.filter((x) => x != null))) - 1) * 100;
    const m1 = (v[v.length - 1] / v[v.length - 22] - 1) * 100;
    const n = D.stocks.filter((s) => s.layer === L).length;
    return `<div class="layer ${grade(dd, -10, -20)}"><div class="label">${esc(L)} · ${n}</div><div class="v">${pct(dd)}</div>
      <div class="s">from peak · 1 month ${pct(m1)}</div><div class="chart" data-layer="${esc(L)}"></div></div>`;
  }).join('');

  $('#measure').innerHTML = MEASURES.map((m) => `<button data-m="${m.k}" class="${m === measure ? 'on' : ''}">${esc(m.l)}</button>`).join('');
  renderHeat(); renderTable();

  renders.stocks = [renderIndexChart, ...[...document.querySelectorAll('.layer .chart')].map((h) => () => {
    const v = D.series.layers[h.dataset.layer].slice(-252), labels = D.dates.slice(-252);
    lineChart(h, { labels, lines: [{ v, color: LAYER_COLOURS[h.dataset.layer], w: 1.6 }], minimal: true, fmt: String,
      tip: (i) => `${dShort(labels[i])}<br><b>${pct(((v[i] / v[0]) - 1) * 100)}</b> over the window` });
  })];
}
function ytdOf(a) {
  const y = D.asOf.slice(0, 4); let k = D.dates.findIndex((d) => d.slice(0, 4) === y);
  return k > 0 ? (lastVal(a) / a[k - 1] - 1) * 100 : null;
}
const colourOf = (n) => (n === 'AI index' ? '#1e2a4a' : n === 'S&P 500' ? '#a3a9b6' : LAYER_COLOURS[n]);

function renderIndexChart() {
  const start = range ? Math.max(0, D.dates.length - range) : 0;
  const labels = D.dates.slice(start);
  const src = { 'AI index': D.series.ai, 'S&P 500': D.series.spx, ...D.series.layers };
  const lines = Object.entries(src).filter(([n]) => lineOn[n]).map(([n, v]) => {
    const w = v.slice(start), b = w.find((x) => x != null);
    return { name: n, v: w.map((x) => (x == null ? null : (x / b - 1) * 100)), color: colourOf(n), w: n === 'AI index' ? 3 : n === 'S&P 500' ? 2.2 : 1.6 };
  });
  if (!lines.length) { $('#indexchart').innerHTML = ''; return; }
  lineChart($('#indexchart'), { labels, lines, ref: 0, fmt: (t) => (t > 0 ? '+' : t < 0 ? '−' : '') + Math.abs(t) + '%',
    tip: (i) => `${dShort(labels[i])}<br>${lines.map((l) => `<span style="color:${l.name === 'AI index' ? '#f4a629' : '#fff'}">${esc(l.name)}</span> <b style="color:#fff">${pct(l.v[i], 0)}</b>`).join('<br>')}` });
}

function fmtMeasure(m, v) { return v == null ? '–' : m.fmt ? m.fmt(v) : pct(v); }
function renderHeat() {
  const groups = {};
  for (const s of D.stocks) (groups[s.layer] = groups[s.layer] || []).push(s);
  $('#heat').innerHTML = Object.entries(groups).map(([L, ss]) => `<div class="heatgroup"><div class="label">${esc(L)}</div><div class="tiles">${ss.map((s) => {
    const c = heat(s[measure.k], measure.stops);
    return `<div class="tile" data-sym="${esc(s.sym)}" style="background:${c.bg};--tc:${c.fg}"><div class="sym">${esc(s.sym.replace(/\.(KS|T)$/, ''))}</div><div class="nm">${esc(s.name)}</div>
      <div class="tv">${fmtMeasure(measure, s[measure.k])}</div>${spark(s.spark, c.fg)}</div>`;
  }).join('')}</div></div>`).join('');
}

function money(s) {
  const v = s.last, d = v >= 1000 ? 0 : 2;
  const t = v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  return s.ccy === 'USD' ? '$' + t : `${t} <span class="mut">${esc(s.ccy)}</span>`;
}
const COLS = [
  ['name', 'Stock'], ['layer', 'Layer'], ['last', 'Price'], ['d1', '1d'], ['m1', '1m'], ['ytd', 'YTD'], ['y1', '1y'],
  ['fromPeak', 'From peak'], ['peakDate', 'Peak'], ['vs200', 'vs 200d'], ['deathCross', '50/200'], ['vol', 'Vol'], ['rel3m', 'vs S&P 3m'],
];
function renderTable() {
  let rows = D.stocks.slice();
  if (sortKey) rows.sort((a, b) => {
    const x = a[sortKey], y = b[sortKey];
    if (x == null) return 1; if (y == null) return -1;
    return (x > y ? 1 : x < y ? -1 : 0) * sortDir;
  });
  const cell = (s, k) => {
    const v = s[k];
    if (k === 'name') return `<b>${esc(s.name)}</b> <span class="mut">${esc(s.sym)}</span>`;
    if (k === 'layer') return `<span class="mut">${esc(s.layer)}</span>`;
    if (k === 'last') return money(s);
    if (k === 'peakDate') return `<span class="mut">${dShort(v)}</span>`;
    if (k === 'deathCross') return v == null ? '–' : v ? '<span class="neg">Death</span>' : '<span class="pos">Golden</span>';
    if (k === 'vol') return v == null ? '–' : Math.round(v) + '%';
    return `<span class="${v > 0 ? 'pos' : v < 0 ? 'neg' : ''}">${pct(v)}</span>`;
  };
  $('#table').innerHTML = `<thead><tr>${COLS.map(([k, l]) => `<th data-k="${k}" class="${sortKey === k ? 'sorted' : ''}">${esc(l)}${sortKey === k ? (sortDir > 0 ? ' ↑' : ' ↓') : ''}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((s) => `<tr>${COLS.map(([k]) => `<td>${cell(s, k)}</td>`).join('')}</tr>`).join('')}</tbody>`;
}

/* ---------- events ---------- */
document.addEventListener('click', (e) => {
  const b = e.target.closest('button, th');
  if (!b) return;
  if (b.dataset.r != null) {
    range = +b.dataset.r;
    document.querySelectorAll('#range button').forEach((x) => x.classList.toggle('on', x === b));
    renderIndexChart();
  } else if (b.dataset.line) {
    lineOn[b.dataset.line] = !lineOn[b.dataset.line];
    b.classList.toggle('off', !lineOn[b.dataset.line]);
    renderIndexChart();
  } else if (b.dataset.m) {
    measure = MEASURES.find((m) => m.k === b.dataset.m);
    document.querySelectorAll('#measure button').forEach((x) => x.classList.toggle('on', x === b));
    renderHeat();
  } else if (b.dataset.k) {
    if (sortKey === b.dataset.k) sortDir = -sortDir;
    else { sortKey = b.dataset.k; sortDir = ['name', 'layer', 'peakDate'].includes(sortKey) ? 1 : 1; }
    renderTable();
  }
});
document.addEventListener('mouseover', (e) => {
  const t = e.target.closest('.tile');
  if (!t) return;
  const s = D.stocks.find((x) => x.sym === t.dataset.sym);
  const move = (ev) => showTip(`<b>${esc(s.name)}</b> ${money(s).replace(/<[^>]+>/g, '')}<br>From peak ${pct(s.fromPeak)} (${dShort(s.peakDate)})<br>This year ${pct(s.ytd)} · 1 year ${pct(s.y1)}<br>vs 200-day ${pct(s.vs200)}${s.listed ? `<br>Listed ${dShort(s.listed)}` : ''}`, ev);
  move(e);
  t.addEventListener('mousemove', move);
  t.addEventListener('mouseleave', () => { hideTip(); t.removeEventListener('mousemove', move); }, { once: true });
});

function route() {
  const tab = location.hash === '#stocks' ? 'stocks' : 'overview';
  document.querySelectorAll('.tab').forEach((s) => (s.hidden = s.id !== tab));
  document.querySelectorAll('nav a[data-tab]').forEach((a) => a.classList.toggle('on', a.dataset.tab === tab));
  hideTip();
  (renders[tab] || []).forEach((f) => f());
  if (location.hash.startsWith('#sig-')) document.querySelector(location.hash)?.scrollIntoView();
}
window.addEventListener('hashchange', route);
let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(route, 150); });

const bust = Math.floor(Date.now() / 6e5);
Promise.all(['data.json', 'manual.json'].map((f) => fetch(`${f}?t=${bust}`).then((r) => { if (!r.ok) throw new Error(f); return r.json(); })))
  .then(([d, m]) => {
    D = d; M = m;
    $('#asof').textContent = `The AI bubble, daily · data to ${dLong(D.asOf)}`;
    renderOverview(); renderStocks(); route();
  })
  .catch((err) => { $('#answer').textContent = 'No data'; $('#tally').textContent = 'Could not load ' + err.message + '.'; });
