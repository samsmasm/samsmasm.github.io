/* Chart tab: an hourglass chart around one person. Ancestors run to the right, descendants to the left,
   every known generation, laid out compactly (each line only takes the height it needs).
   Pan by dragging, scrolling, the arrow buttons or the keyboard arrows. Clicking a name re-centres the chart. */
const TreeChart = (() => {
  const W = 210, H = 42, GAP = 56, SLOT = H + 12, TOP = 8, HEAD = 30;
  let cleanup = null;

  // tidy layout: leaves get one slot each, a parent sits in the middle of what it leads to.
  // Only generations up to `limit` are laid out, so columns off screen take no room;
  // a node whose line carries on past the limit is marked `more`. Keys are stable paths, used to keep your place.
  function layout(root, next, limit) {
    const nodes = [], edges = [];
    let row = 0, depth = 0;
    (function place(p, g, seen, key) {
      depth = Math.max(depth, g);
      const all = seen.has(p.id) ? [] : next(p).filter(q => !seen.has(q.id)), kids = g < limit ? all : [];
      const s2 = new Set(seen).add(p.id);
      const n = { p, g, key, more: g >= limit && all.length > 0 };
      if (!kids.length) n.y = row++;
      else {
        const ys = kids.map((q, i) => place(q, g + 1, s2, key + '.' + i));
        n.y = (ys[0].y + ys[ys.length - 1].y) / 2;
        ys.forEach(c => edges.push([n, c]));
      }
      nodes.push(n); return n;
    })(root, 0, new Set(), '0');
    return { nodes, edges, rows: Math.max(row, 1), depth, root: nodes[nodes.length - 1] };
  }
  const parentsOf = p => { const q = S.parents(p); return [q.father, q.mother].filter(Boolean); };
  const childrenOf = p => sortByBirth(S.unions(p).flatMap(u => u.children));

  let C = null;   // current chart: person, full sizes, x positions
  function view(key) {
    const p = S.person(S.keyId(key)) || S.person('@I1@'); if (!p) return notFound();
    const Af = layout(p, parentsOf, Infinity), Df = layout(p, childrenOf, Infinity);
    const x0 = 10 + Df.depth * (W + GAP), totalW = x0 + (Af.depth + 1) * (W + GAP) + 10;
    C = { p, x0, totalW, aDepth: Af.depth, dDepth: Df.depth };
    const X = (side, g) => side === 'a' ? x0 + g * (W + GAP) : x0 - g * (W + GAP);
    C.X = X;
    const ROM = n => ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI'][n] || n + 1;
    const DESC = ['', 'Children', 'Grandchildren', 'Great-grandchildren'];
    const heads = [];
    for (let g = 0; g <= Af.depth; g++) heads.push([X('a', g), g === 0 ? 'Centre' : g === 1 ? 'Parents' : g === 2 ? 'Grandparents' : 'Gen. ' + ROM(g)]);
    for (let g = 1; g <= Df.depth; g++) heads.push([X('d', g), DESC[g] || `${g - 2}× great-grandchildren`]);
    // generation labels sit in their own strip that stays at the top while scrolling down
    const headSvg = `<div class="chartheads"><svg width="${totalW}" height="${HEAD}" viewBox="0 0 ${totalW} ${HEAD}">${heads.map(([x, t]) =>
      `<text x="${x}" y="18" font-size="13" fill="#5b5846" letter-spacing="2">${esc(t.toUpperCase())}</text><line x1="${x}" x2="${x + W}" y1="23" y2="23" stroke="#2a2922"/>`).join('')}</svg></div>`;
    const nA = Af.nodes.length - 1, nD = Df.nodes.length - 1;
    return `<div class="card slate"><div class="head"><span class="k">Chart</span><span class="k">${nA} ancestors · ${nD} descendants</span></div>
      <div class="body"><h1 class="person-name" style="font-size:1.9rem"><a href="${pHref(p)}" style="border:0">${esc(S.name(p))}</a></h1>
      <span class="k">Ancestors to the right, descendants to the left. Drag, scroll or use the arrows to follow a line; generations open out as they come into view. › marks a line that carries on. Click a name for their details below the chart.</span></div></div>
      <div class="chartwrap"><div class="chartport" id="chartport" tabindex="0">${headSvg}<div id="chartbody"></div></div>
        <div class="chartnav noprint">
          <button data-d="-1,0" aria-label="Left">◀</button><button data-d="0,-1" aria-label="Up">▲</button>
          <button data-c aria-label="Back to centre">●</button>
          <button data-d="0,1" aria-label="Down">▼</button><button data-d="1,0" aria-label="Right">▶</button></div></div>
      <div id="chartinfo" class="chartinfo"></div>`;
  }

  // details panel under the chart for the clicked person
  function info(q) {
    if (q.private) return `<div class="card slate"><div class="head"><span class="k">Selected</span><span class="k">Private</span></div><div class="body"><h2 class="person-name" style="font-size:1.7rem">Private</h2><p class="empty">Details of this person are kept private.</p>
      <p><a href="#/chart/${S.idKey(q.id)}">Centre the chart here</a></p></div></div>`;
    const fact = (lab, e) => e ? `<tr><td class="k">${lab}</td><td class="d">${esc(e.date)}</td><td>${esc(e.place)}${e.place_detail ? `<div class="venue">${esc(e.place_detail)}</div>` : ''}</td></tr>` : '';
    const par = S.parents(q), un = S.unions(q), occ = q.events.filter(e => e.type === 'OCCU' && e.desc);
    const lnk = x => x ? `<a href="#" data-pick="${esc(x.id)}">${esc(S.name(x))}</a>` : '<span class="empty">not recorded</span>';
    const rows = [['Born', S.ev(q, 'BIRT') || S.ev(q, 'CHR') || S.ev(q, 'BAPM')], ['Died', S.ev(q, 'DEAT')], ['Buried', S.ev(q, 'BURI')]].map(([l, e]) => fact(l, e)).join('');
    const note = q.notes[0] ? q.notes[0].split('\n')[0] : '';
    return `<div class="card ${q.sex === 'F' ? 'rust' : q.sex === 'M' ? 'olive' : 'slate'}"><div class="head"><span class="k">Selected · ${esc(S.idKey(q.id))}</span>
      <span class="k"><a href="#/chart/${S.idKey(q.id)}">Centre the chart here</a> · <a href="${pHref(q)}">Full record →</a></span></div>
      <div class="body"><h2 class="person-name" style="font-size:1.7rem">${esc(S.name(q))}</h2><div class="dates">${esc(S.span(q))}</div>
      ${rows ? `<table class="ledger" style="margin-top:8px">${rows}</table>` : ''}
      <div class="infogrid"><div><span class="k">Parents</span><br>${lnk(par.father)} &amp; ${lnk(par.mother)}</div>
      ${un.map(u => `<div><span class="k">Partner</span><br>${lnk(u.spouse)}${u.children.length ? `<br><span class="k">Children</span><br>${sortByBirth(u.children).map(lnk).join(', ')}` : ''}</div>`).join('')}
      ${occ.length ? `<div><span class="k">Occupation</span><br>${occ.map(e => esc(e.desc.split(' - ')[0])).join('; ')}</div>` : ''}</div>
      ${note ? `<div class="note">${esc(trunc(note, 400))}</div>` : ''}</div></div>`;
  }

  // draw the chart with ancestors up to generation aLim and descendants down to dLim; returns y of each node key
  function render(aLim, dLim) {
    const { p, X, totalW } = C;
    const A = layout(p, parentsOf, aLim), D = layout(p, childrenOf, dLim);
    const ry = Math.max(A.root.y, D.root.y), offA = ry - A.root.y, offD = ry - D.root.y;
    const totalH = TOP + (Math.max(A.rows + offA, D.rows + offD) + .5) * SLOT;
    const Y = (n, off) => TOP + (n.y + off + .5) * SLOT;
    const pos = {};
    const box = (n, side, off) => {
      const q = n.p, x = X(side, n.g), y = Y(n, off), on = q.id === p.id;
      pos[side + n.key] = { x, y };
      const sel = q.id === C.sel;
      return `<g class="cbox${sel ? ' sel' : ''}" data-id="${esc(q.id)}" role="button" tabindex="-1"><rect x="${x}" y="${y - H / 2}" width="${W}" height="${H}" fill="${sel ? '#2a2922' : on ? '#e4dcc0' : '#f7f3e4'}" stroke="#2a2922" stroke-width="${on ? 2 : 1}"/>
        <rect x="${x}" y="${y - H / 2}" width="4" height="${H}" fill="${q.private ? '#9a927a' : q.sex === 'F' ? '#9b4a2a' : '#5f6532'}"/>
        <text x="${x + 12}" y="${y - 3}" font-size="15" fill="${sel ? '#f3efe0' : '#2a2922'}">${esc(trunc(S.name(q), 27))}</text>
        <text x="${x + 12}" y="${y + 14}" font-size="12" fill="${sel ? '#b48a68' : '#5b5846'}">${esc(S.span(q))}</text></g>
        ${n.more ? `<text x="${side === 'a' ? x + W + 6 : x - 14}" y="${y + 6}" font-size="18" fill="#9b4a2a">${side === 'a' ? '›' : '‹'}</text>` : ''}`;
    };
    const elbow = (a, b, side, off) => {
      const ax = X(side, a.g) + (side === 'a' ? W : 0), bx = X(side, b.g) + (side === 'a' ? 0 : W), mx = (ax + bx) / 2;
      return `M${ax},${Y(a, off)} H${mx} V${Y(b, off)} H${bx}`;
    };
    const boxes = A.nodes.map(n => box(n, 'a', offA)).join('') + D.nodes.filter(n => n.g > 0).map(n => box(n, 'd', offD)).join('');
    $('#chartbody').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
      <path fill="none" stroke="#3f5159" stroke-width="1.2" d="${A.edges.map(([a, b]) => elbow(a, b, 'a', offA)).join(' ')} ${D.edges.map(([a, b]) => elbow(a, b, 'd', offD)).join(' ')}"/>${boxes}</svg>`;
    return pos;
  }

  function mount() {
    if (cleanup) cleanup();
    const port = $('#chartport'); if (!port || !C) return;
    const { X, x0, aDepth, dDepth } = C, COL = W + GAP;
    // which generations are on screen (a partly visible column counts)
    const lims = () => [Math.max(0, Math.min(aDepth, Math.floor((port.scrollLeft + port.clientWidth - x0) / COL))),
                        Math.max(0, Math.min(dDepth, Math.ceil((x0 + W - port.scrollLeft) / COL) - 1))];
    let cur = null, pos = {};
    function relayout() {
      const L2 = lims(); if (cur && L2[0] === cur[0] && L2[1] === cur[1]) return;
      // keep the box nearest the middle of the screen where it is while the rest opens out or closes up
      const cx = port.scrollLeft + port.clientWidth / 2, cy = port.scrollTop + port.clientHeight / 2 - HEAD;
      let anchor = null, best = Infinity;
      for (const [k, v] of Object.entries(pos)) { const d = Math.abs(v.x + W / 2 - cx) * 2 + Math.abs(v.y - cy); if (d < best) { best = d; anchor = k; } }
      const before = anchor && pos[anchor].y - port.scrollTop;
      cur = L2; pos = render(...L2);
      if (anchor && pos[anchor]) port.scrollTop = pos[anchor].y - before;
    }
    const centre = smooth => {
      const r = pos['a0'];
      port.scrollTo({ left: x0 + W / 2 - port.clientWidth / 2, top: (r ? r.y : 0) + HEAD - port.clientHeight / 2, behavior: smooth ? 'smooth' : 'auto' });
    };
    // first draw: work out what will be visible with the centre person in the middle
    port.scrollLeft = x0 + W / 2 - port.clientWidth / 2;
    C.sel = null;
    pos = render(...(cur = lims()));
    centre(false);
    $('#chartinfo').innerHTML = '<p class="empty">Click a name in the chart to see their details here.</p>';
    let raf = 0;
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; relayout(); }); };
    port.addEventListener('scroll', onScroll);
    // drag to pan (a short click still follows the link)
    let drag = null, moved = false;
    port.onpointerdown = e => { if (e.button) return; drag = { x: e.clientX, y: e.clientY, l: port.scrollLeft, t: port.scrollTop }; moved = false; };
    const move = e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) { moved = true; port.classList.add('dragging'); }
      port.scrollLeft = drag.l - dx; port.scrollTop = drag.t - dy; };
    const up = () => { drag = null; port.classList.remove('dragging'); };
    port.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    const select = id => {
      const q = S.person(id); if (!q) return;
      C.sel = id; pos = render(...cur);
      const box = $('#chartinfo'); box.innerHTML = info(q);
      box.querySelectorAll('[data-pick]').forEach(a => a.onclick = ev => { ev.preventDefault(); select(a.dataset.pick); });
      const r = box.getBoundingClientRect(); if (r.top > innerHeight - 80) box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    port.addEventListener('click', e => { const g = e.target.closest && e.target.closest('.cbox'); if (g) select(g.dataset.id); });
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    // arrow buttons: tap for a step, hold to keep going
    const step = (dx, dy) => port.scrollBy({ left: dx * (W + GAP), top: dy * SLOT * 3, behavior: 'smooth' });
    let hold = null;
    document.querySelectorAll('.chartnav button').forEach(b => {
      if (b.hasAttribute('data-c')) { b.onclick = () => centre(true); return; }
      const [dx, dy] = b.dataset.d.split(',').map(Number);
      b.onpointerdown = () => { step(dx, dy); clearInterval(hold); hold = setInterval(() => port.scrollBy(dx * 18, dy * 18), 30); };
      b.onpointerup = b.onpointerleave = () => clearInterval(hold);
    });
    const key = e => {
      if (e.target.matches && e.target.matches('input, textarea')) return;
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (d) { e.preventDefault(); step(...d); }
    };
    window.addEventListener('keydown', key);
    cleanup = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('keydown', key); clearInterval(hold); cleanup = null; };
  }
  const unmount = () => cleanup && cleanup();
  return { view, mount, unmount };
})();
