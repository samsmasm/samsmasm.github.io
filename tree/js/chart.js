/* Chart tab: an hourglass chart around one person. Ancestors run to the right, descendants to the left,
   every known generation, laid out compactly (each line only takes the height it needs).
   Pan by dragging, scrolling, the arrow buttons or the keyboard arrows. Clicking a name re-centres the chart. */
const TreeChart = (() => {
  const W = 210, H = 42, GAP = 56, SLOT = H + 12, TOP = 8, HEAD = 30;
  let cleanup = null;

  // tidy layout: leaves get one slot each, a parent sits in the middle of what it leads to
  function layout(root, next) {
    const nodes = [], edges = [];
    let row = 0, depth = 0;
    (function place(p, g, seen) {
      depth = Math.max(depth, g);
      const kids = seen.has(p.id) ? [] : next(p).filter(q => !seen.has(q.id));
      const s2 = new Set(seen).add(p.id);
      const n = { p, g };
      if (!kids.length) n.y = row++;
      else {
        const ys = kids.map(q => place(q, g + 1, s2));
        n.y = (ys[0].y + ys[ys.length - 1].y) / 2;
        ys.forEach(c => edges.push([n, c]));
      }
      nodes.push(n); return n;
    })(root, 0, new Set());
    return { nodes, edges, rows: Math.max(row, 1), depth, root: nodes[nodes.length - 1] };
  }
  const parentsOf = p => { const q = S.parents(p); return [q.father, q.mother].filter(Boolean); };
  const childrenOf = p => sortByBirth(S.unions(p).flatMap(u => u.children));

  function view(key) {
    const p = S.person(S.keyId(key)) || S.person('@I1@'); if (!p) return notFound();
    const A = layout(p, parentsOf), D = layout(p, childrenOf);
    const ry = Math.max(A.root.y, D.root.y), offA = ry - A.root.y, offD = ry - D.root.y;
    const x0 = 10 + D.depth * (W + GAP);
    const totalW = x0 + (A.depth + 1) * (W + GAP) + 10;
    const totalH = TOP + (Math.max(A.rows + offA, D.rows + offD) + .5) * SLOT;
    const X = (side, g) => side === 'a' ? x0 + g * (W + GAP) : x0 - g * (W + GAP);
    const Y = (n, off) => TOP + (n.y + off + .5) * SLOT;
    const ROM = n => ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI'][n] || n + 1;
    const DESC = ['', 'Children', 'Grandchildren', 'Great-grandchildren'];
    const heads = [];
    for (let g = 0; g <= A.depth; g++) heads.push([X('a', g), g === 0 ? 'Centre' : g === 1 ? 'Parents' : g === 2 ? 'Grandparents' : 'Gen. ' + ROM(g)]);
    for (let g = 1; g <= D.depth; g++) heads.push([X('d', g), DESC[g] || `${g - 2}× great-grandchildren`]);
    const box = (n, side, off) => {
      const q = n.p, x = X(side, n.g), y = Y(n, off), on = q.id === p.id;
      return `<a href="#/chart/${S.idKey(q.id)}" data-person="${esc(S.idKey(q.id))}"><rect x="${x}" y="${y - H / 2}" width="${W}" height="${H}" fill="${on ? '#e4dcc0' : '#f7f3e4'}" stroke="#2a2922" stroke-width="${on ? 2 : 1}"/>
        <rect x="${x}" y="${y - H / 2}" width="4" height="${H}" fill="${q.private ? '#9a927a' : q.sex === 'F' ? '#9b4a2a' : '#5f6532'}"/>
        <text x="${x + 12}" y="${y - 3}" font-size="15" fill="#2a2922">${esc(trunc(S.name(q), 27))}</text>
        <text x="${x + 12}" y="${y + 14}" font-size="12" fill="#5b5846">${esc(S.span(q))}</text></a>`;
    };
    const elbow = (a, b, side, off) => {
      const ax = X(side, a.g) + (side === 'a' ? W : 0), bx = X(side, b.g) + (side === 'a' ? 0 : W), mx = (ax + bx) / 2;
      return `<path d="M${ax},${Y(a, off)} H${mx} V${Y(b, off)} H${bx}"/>`;
    };
    // generation labels sit in their own strip that stays at the top while scrolling down
    const headSvg = `<div class="chartheads"><svg width="${totalW}" height="${HEAD}" viewBox="0 0 ${totalW} ${HEAD}">${heads.map(([x, t]) =>
      `<text x="${x}" y="18" font-size="13" fill="#5b5846" letter-spacing="2">${esc(t.toUpperCase())}</text><line x1="${x}" x2="${x + W}" y1="23" y2="23" stroke="#2a2922"/>`).join('')}</svg></div>`;
    const svg = headSvg + `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
      <g fill="none" stroke="#3f5159" stroke-width="1.2">${A.edges.map(([a, b]) => elbow(a, b, 'a', offA)).join('')}${D.edges.map(([a, b]) => elbow(a, b, 'd', offD)).join('')}</g>
      ${A.nodes.map(n => box(n, 'a', offA)).join('')}${D.nodes.filter(n => n.g > 0).map(n => box(n, 'd', offD)).join('')}</svg>`;
    const nA = A.nodes.length - 1, nD = D.nodes.length - 1;
    return `<div class="card slate"><div class="head"><span class="k">Chart</span><span class="k">${nA} ancestors · ${nD} descendants</span></div>
      <div class="body"><h1 class="person-name" style="font-size:1.9rem"><a href="${pHref(p)}" style="border:0">${esc(S.name(p))}</a></h1>
      <span class="k">Ancestors to the right, descendants to the left. Drag, scroll or use the arrows to follow a line. Click a name to centre the chart on them.</span></div></div>
      <div class="chartwrap"><div class="chartport" id="chartport" tabindex="0" data-cx="${x0 + W / 2}" data-cy="${HEAD + TOP + (ry + .5) * SLOT}">${svg}</div>
        <div class="chartnav noprint">
          <button data-d="-1,0" aria-label="Left">◀</button><button data-d="0,-1" aria-label="Up">▲</button>
          <button data-c aria-label="Back to centre">●</button>
          <button data-d="0,1" aria-label="Down">▼</button><button data-d="1,0" aria-label="Right">▶</button></div></div>`;
  }

  function mount() {
    if (cleanup) cleanup();
    const port = $('#chartport'); if (!port) return;
    const centre = smooth => port.scrollTo({ left: +port.dataset.cx - port.clientWidth / 2, top: +port.dataset.cy - port.clientHeight / 2, behavior: smooth ? 'smooth' : 'auto' });
    centre(false);
    // drag to pan (a short click still follows the link)
    let drag = null, moved = false;
    port.onpointerdown = e => { if (e.button) return; drag = { x: e.clientX, y: e.clientY, l: port.scrollLeft, t: port.scrollTop }; moved = false; };
    const move = e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) { moved = true; port.classList.add('dragging'); }
      port.scrollLeft = drag.l - dx; port.scrollTop = drag.t - dy; };
    const up = () => { drag = null; port.classList.remove('dragging'); };
    port.addEventListener('click', e => { if (moved) { e.preventDefault(); moved = false; } }, true);
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
