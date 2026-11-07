// Rendering helpers: case stimulus (Paper 1 lines, Paper 2 chunks, Paper 3 resources), tables,
// figures and markschemes. Returns HTML strings; all case text is escaped.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const DISCLAIMER = 'Businesses, products and people named in this case are fictitious; any similarity to real ones is coincidental.';

function num(v) {
  // IB style: a space as the thousands separator for whole numbers of 10 000 and above
  if (typeof v === 'number' && Number.isInteger(v) && Math.abs(v) >= 10000) return v.toLocaleString('en-US').replace(/,/g, ' ');
  return String(v);
}

export function table(t) {
  const head = (t.columns || []).some((c) => String(c).trim())
    ? `<tr>${t.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>` : '';
  const rows = t.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(num(c))}</td>`).join('')}</tr>`).join('');
  const unit = t.unit && !String(t.title).includes(t.unit) ? ` (${esc(t.unit)})` : '';
  return `<div class="tbl-wrap"><table class="data"><caption>${esc(t.id)}: ${esc(t.title)}${unit}</caption>${head}${rows}</table></div>`;
}

const COLORS = ['#1E2A4A', '#F4A629', '#45B800', '#C0622B'];

function chart(f) {
  const d = f.data || {};
  if ((f.type === 'line' || f.type === 'bar') && d.x && d.series) {
    const W = 560, H = 240, L = 54, B = 34, T = 10;
    const vals = d.series.flatMap((s) => s.values);
    const lo = Math.min(0, ...vals), hi = Math.max(...vals) * 1.1 || 1;
    const X = (i) => L + (W - L - 12) * (i + 0.5) / d.x.length;
    const Y = (v) => H - B - (H - B - T) * (v - lo) / (hi - lo);
    let g = `<line x1="${L}" y1="${H - B}" x2="${W - 8}" y2="${H - B}" stroke="currentColor" opacity=".5"/><line x1="${L}" y1="${T}" x2="${L}" y2="${H - B}" stroke="currentColor" opacity=".5"/>`;
    for (let k = 0; k <= 4; k++) {
      const v = lo + (hi - lo) * k / 4;
      g += `<text x="${L - 6}" y="${Y(v) + 4}" font-size="11" text-anchor="end" fill="currentColor">${esc(num(Math.round(v * 10) / 10))}</text>`;
    }
    d.x.forEach((x, i) => { g += `<text x="${X(i)}" y="${H - B + 16}" font-size="11" text-anchor="middle" fill="currentColor">${esc(x)}</text>`; });
    d.series.forEach((s, si) => {
      const c = COLORS[si % COLORS.length];
      if (f.type === 'line') {
        g += `<polyline points="${s.values.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}" fill="none" stroke="${c}" stroke-width="2.5"/>`;
        s.values.forEach((v, i) => { g += `<circle cx="${X(i)}" cy="${Y(v)}" r="3.5" fill="${c}"><title>${esc(s.name)}: ${esc(num(v))}</title></circle>`; });
      } else {
        const bw = (W - L - 12) / d.x.length / (d.series.length + 1);
        s.values.forEach((v, i) => {
          const x0 = X(i) - bw * d.series.length / 2 + bw * si;
          g += `<rect x="${x0}" y="${Y(v)}" width="${bw}" height="${Y(lo) - Y(v)}" fill="${c}"><title>${esc(s.name)}: ${esc(num(v))}</title></rect>`;
        });
      }
    });
    const legend = d.series.length > 1 || d.y_label
      ? `<div class="muted small">${d.y_label ? esc(d.y_label) + (d.series.length > 1 ? ' · ' : '') : ''}${d.series.length > 1 ? d.series.map((s, i) => `<span style="color:${COLORS[i % COLORS.length]}">■</span> ${esc(s.name)}`).join('  ') : ''}</div>` : '';
    return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(f.title)}">${g}</svg>${legend}`;
  }
  if (f.type === 'positioning_map' && d.points) {
    const S = 320, P = 40, mid = S / 2;
    const X = (v) => mid + v * (mid - P), Y = (v) => mid - v * (mid - P);
    let g = `<line x1="${P / 2}" y1="${mid}" x2="${S - P / 2}" y2="${mid}" stroke="currentColor" opacity=".5"/><line x1="${mid}" y1="${P / 2}" x2="${mid}" y2="${S - P / 2}" stroke="currentColor" opacity=".5"/>`;
    const [xl, xr] = d.x_axis || ['', ''], [yb, yt] = d.y_axis || ['', ''];
    g += `<text x="${P / 2}" y="${mid - 6}" font-size="11" fill="currentColor">${esc(xl)}</text><text x="${S - P / 2}" y="${mid - 6}" font-size="11" text-anchor="end" fill="currentColor">${esc(xr)}</text>`;
    g += `<text x="${mid + 6}" y="${P / 2 + 4}" font-size="11" fill="currentColor">${esc(yt)}</text><text x="${mid + 6}" y="${S - P / 2}" font-size="11" fill="currentColor">${esc(yb)}</text>`;
    d.points.forEach((p, i) => { g += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="6" fill="${COLORS[i % COLORS.length]}"/><text x="${X(p.x) + 9}" y="${Y(p.y) + 4}" font-size="12" font-weight="700" fill="currentColor">${esc(p.label)}</text>`; });
    return `<svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img" aria-label="${esc(f.title)}">${g}</svg>`;
  }
  if (f.type === 'image') return `<div class="img">Image: ${esc(d.description || '')}</div>`;
  return `<pre class="small">${esc(JSON.stringify(d, null, 1))}</pre>`;
}

export function figure(f) {
  return `<div class="figure"><div class="ft">${esc(f.id)}: ${esc(f.title)}</div>${chart(f)}</div>`;
}

const paras = (ps) => (ps || []).map((p) => `<p>${esc(p)}</p>`).join('');

// Paper 1: fixed numbered lines with tables placed after a given line
export function p1Stimulus(c) {
  const tabs = new Map((c.stimulus.tables || []).map((t) => [t.after_line, t]));
  const lines = c.stimulus.lines.map((l, i) => {
    const n = i + 1;
    return `<div class="ln"><span class="n">${n % 5 === 0 ? n : ''}</span><span class="t">${esc(l)}</span></div>${tabs.has(n) ? table(tabs.get(n)) : ''}`;
  }).join('');
  return `<div class="stimulus lines">${lines}<div class="disclaimer">${DISCLAIMER}</div></div>`;
}

// Paper 2: one chunk of the case (text, tables, figures)
export function chunkHtml(ch) {
  return `<div class="stimulus">${paras(ch.text)}${(ch.tables || []).map(table).join('')}${(ch.figures || []).map(figure).join('')}</div>`;
}

export function p3Stimulus(c) {
  const rs = c.stimulus.resources.map((r) => `<div class="resource"><h3>${esc(r.title)}</h3>${paras(r.text)}${(r.tables || []).map(table).join('')}${(r.figures || []).map(figure).join('')}</div>`).join('');
  return `<div class="stimulus">${rs}<div class="disclaimer">${DISCLAIMER}</div></div>`;
}

export const disclaimer = () => `<div class="disclaimer">${DISCLAIMER}</div>`;

export function markscheme(q) {
  const m = q.markscheme || {};
  let h = '';
  if (m.allocation) h += `<p><b>How marks are awarded:</b> ${esc(m.allocation)}</p>`;
  if (m.answer) h += `<p><b>Answer:</b> ${esc(m.answer)}</p>`;
  if (m.model) h += `<p><b>Model answer:</b> ${esc(m.model)}</p>`;
  if (m.indicative?.length) h += `<b>Possible points:</b><ul>${m.indicative.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
  if (m.notes?.length) h += `<ul>${m.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`;
  if (q.marks >= 10 && q.marks < 17) h += `<p class="small muted">10-mark answers are marked with markbands: the top band needs a clear focus on the question, accurate use of business tools and theories, case evidence woven into balanced arguments, and an explained limitation of the case information.</p>`;
  return h;
}
