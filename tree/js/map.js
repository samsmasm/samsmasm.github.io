/* Map view: Leaflet + OSM tiles, loaded only when #/map is opened.
   Reads only the public data through Store, so private people never reach the map. */
const TreeMap = (() => {
  const LIB = 'https://cdnjs.cloudflare.com/ajax/libs/';
  const CSS = [LIB + 'leaflet/1.9.4/leaflet.min.css', LIB + 'leaflet.markercluster/1.5.3/MarkerCluster.min.css'];
  const JS = [LIB + 'leaflet/1.9.4/leaflet.min.js', LIB + 'leaflet.markercluster/1.5.3/leaflet.markercluster.min.js'];
  const BRANCH_COL = ['#9b4a2a', '#5f6532', '#3f5159', '#8a6a24'], DIRECT = '#2a2922', OTHER = '#9a927a';
  const ERA = ['#3f5159', '#5f6532', '#b48a68', '#9b4a2a'];   // early to late
  let libs = null, M = null, data = null, ui = { mode: 'branch', lines: true, lo: 0, hi: 0 };

  const load = () => libs || (libs = (async () => {
    const mine = document.querySelector('link[href="css/tree.css"]');   // library CSS goes first so ours wins
    CSS.forEach(h => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = h; document.head.insertBefore(l, mine); });
    for (const s of JS) await new Promise((ok, no) => { const t = document.createElement('script'); t.src = s; t.onload = ok; t.onerror = no; document.head.appendChild(t); });
  })());

  /* family branches: ancestors of each grandparent, then their other descendants, spouses and in-laws */
  function branches() {
    const root = S.person('@I1@'), br = new Map(), labels = [];
    if (!root) return { br, labels };
    const par = S.parents(root), gps = [];
    [par.father, par.mother].forEach(pp => { if (!pp) return; const q = S.parents(pp); [q.father, q.mother].forEach(g => g && gps.push(g)); });
    const down = (p, seen = new Set()) => { if (!p || seen.has(p.id)) return seen; seen.add(p.id); S.unions(p).forEach(u => u.children.forEach(c => down(c, seen))); return seen; };
    gps.forEach(g => down(g).forEach(id => br.set(id, 'direct')));
    gps.forEach((g, i) => {
      labels.push(g.private ? 'Private' : S.name(g));
      (function up(p) { if (!p) return; if (br.get(p.id) !== 'direct') br.set(p.id, i); const q = S.parents(p); up(q.father); up(q.mother); })(g);
      br.set(g.id, i);
    });
    const queue = [...br.keys()].filter(id => br.get(id) !== 'direct');
    while (queue.length) {
      const p = S.person(queue.shift()), b = br.get(p.id), q = S.parents(p);
      const next = [...S.unions(p).flatMap(u => [u.spouse, ...u.children]), q.father, q.mother];
      for (const n of next) if (n && !br.has(n.id)) { br.set(n.id, b); queue.push(n.id); }
    }
    return { br, labels };
  }

  function build() {
    const P = S.placeInfo, pts = {}, years = [];
    const plot = name => { const i = P(name); return i && i.lat != null && i.precision !== 'country' ? i : null; };
    const add = (who, e) => {
      const i = plot(e.place); if (!i) return false;
      (pts[e.place] = pts[e.place] || { name: e.place, info: i, items: [] }).items.push({ who, e });
      if (e.year) years.push(e.year); return true;
    };
    let skipped = 0;
    for (const p of S.all()) if (!p.private) for (const e of p.events) if (e.place && !add([p], e)) skipped++;
    for (const f of Object.values(S.families())) {
      const who = [f.husb, f.wife].map(S.person).filter(p => p && !p.private);
      if (who.length) for (const e of f.events) if (e.place && !add(who, e)) skipped++;
    }
    const lines = [];
    for (const p of S.all()) {
      if (p.private) continue;
      const pick = ts => ts.map(t => S.ev(p, t)).find(e => e && plot(e.place));
      const b = pick(['BIRT', 'CHR', 'BAPM']), d = pick(['DEAT', 'BURI']);
      const im = p.events.filter(e => e.type === 'IMMI' && plot(e.place)).sort((x, y) => (x.year || 0) - (y.year || 0));
      const stops = [b, ...im, d].filter(Boolean).filter((e, k, a) => !k || e.place !== a[k - 1].place);
      if (stops.length < 2) continue;
      lines.push({ p, stops, from: b ? b.year : null, to: d ? d.year : null });
    }
    const lo = Math.floor(Math.min(...years) / 10) * 10, hi = Math.ceil(Math.max(...years) / 10) * 10;
    return { pts, lines, lo, hi, skipped, ...branches() };
  }

  const mix = (a, b, t) => '#' + [0, 2, 4].map(k => Math.round(parseInt(a.substr(k + 1, 2), 16) * (1 - t) + parseInt(b.substr(k + 1, 2), 16) * t).toString(16).padStart(2, '0')).join('');
  function eraCol(y) {
    if (!y) return OTHER;
    const t = Math.max(0, Math.min(1, (y - data.lo) / ((data.hi - data.lo) || 1))) * (ERA.length - 1), k = Math.min(ERA.length - 2, Math.floor(t));
    return mix(ERA[k], ERA[k + 1], t - k);
  }
  const brCol = id => { const b = data.br.get(id); return b === 'direct' ? DIRECT : b == null ? OTHER : BRANCH_COL[b]; };
  const full = () => ui.lo <= data.lo && ui.hi >= data.hi;
  const inRange = y => y ? y >= ui.lo && y <= ui.hi : full();

  function colourFor(items) {
    if (ui.mode === 'era') { const ys = items.map(x => x.e.year).filter(Boolean).sort((a, b) => a - b); return eraCol(ys[Math.floor(ys.length / 2)]); }
    const n = {}; items.forEach(x => x.who.forEach(p => { const c = brCol(p.id); n[c] = (n[c] || 0) + 1; }));
    return Object.entries(n).sort((a, b) => b[1] - a[1])[0][0];
  }
  function icon(col, hollow, n) {
    const r = Math.min(11, 5 + Math.sqrt(n) * 1.6), s = Math.ceil(r * 2 + 4);
    const svg = `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}"><circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="${hollow ? '#f7f3e4' : col}" fill-opacity="${hollow ? .55 : .9}" stroke="${hollow ? col : '#2a2922'}" stroke-width="${hollow ? 2.2 : 1}"${hollow ? ' stroke-dasharray="3 2"' : ''}/></svg>`;
    return L.divIcon({ html: svg, className: 'pin', iconSize: [s, s], iconAnchor: [s / 2, s / 2], popupAnchor: [0, -s / 2] });
  }
  const isHollow = i => i.precision === 'region' || i.approx || i.uncertain;   // 'area' with its own coordinates is a town, e.g. Hawkshead

  function popup(pt, items) {
    const i = pt.info, where = pt.name.split(', ').slice(1).join(', ');
    const rows = items.slice().sort((a, b) => (a.e.year || 9999) - (b.e.year || 9999)).map(({ who, e }) =>
      `<tr><td class="k">${esc(S.EV[e.type] || e.type)}</td><td class="d">${esc(e.year || '')}</td><td>${who.map(p => `<a href="${pHref(p)}">${esc(S.name(p))}</a>`).join(' &amp; ')}${e.place_detail ? `<div class="venue">${esc(e.place_detail)}</div>` : ''}</td></tr>`).join('');
    const note = i.uncertain ? 'Position uncertain, needs review' : i.approx ? 'Approximate position' : i.precision === 'region' ? 'Region only, approximate' : '';
    return `<div class="pcard"><div class="head"><span class="k">${esc(where || 'Place')}</span><span class="k">${items.length} ${items.length === 1 ? 'entry' : 'entries'}</span></div>
      <div class="body"><h3>${esc(i.name)}</h3>${note ? `<div class="k approx">${note}</div>` : ''}<table class="ledger">${rows}</table>
      <p><a href="#/place/${encodeURIComponent(pt.name)}">Place page →</a></p></div></div>`;
  }

  function draw() {
    const { map, cl, ln } = M; cl.clearLayers(); ln.clearLayers(); M.markers = {};
    let shown = 0;
    for (const pt of Object.values(data.pts)) {
      const items = pt.items.filter(x => inRange(x.e.year)); if (!items.length) continue;
      const m = L.marker([pt.info.lat, pt.info.lng], { icon: icon(colourFor(items), isHollow(pt.info), items.length), title: pt.info.name, n: items.length })
        .bindPopup(() => popup(pt, items), { maxWidth: 360, minWidth: 260, autoPanPadding: [30, 30] });
      cl.addLayer(m); M.markers[pt.name] = m; shown += items.length;
    }
    if (ui.lines) for (const l of data.lines) {
      if ((l.to || l.from || 0) < ui.lo || (l.from || l.to || 9999) > ui.hi) { if (!full()) continue; }
      const col = ui.mode === 'era' ? eraCol(l.from || l.to) : brCol(l.p.id);
      const ll = l.stops.map(e => { const i = S.placeInfo(e.place); return [i.lat, i.lng]; });
      const pl = L.polyline(ll, { color: col, weight: 1.3, opacity: .75, interactive: true })
        .bindTooltip(`${esc(S.name(l.p))} · ${l.from || '?'} – ${l.to || '?'}<br><span class="k">${l.stops.map(e => esc(e.place.split(',')[0])).join(' → ')}</span>`, { sticky: true, className: 'ltip' })
        .on('mouseover', e => e.target.setStyle({ weight: 3.2, opacity: 1 })).on('mouseout', e => e.target.setStyle({ weight: 1.3, opacity: .75 }))
        .on('click', () => { location.hash = pHref(l.p); });
      ln.addLayer(pl);
    }
    $('#mapcount').textContent = `${shown} entries at ${Object.keys(M.markers).length} places`;
    legend();
  }

  function legend() {
    const box = $('#maplegend');
    if (ui.mode === 'era') {
      box.innerHTML = `<span class="k">Earliest</span><span class="ramp" style="background:linear-gradient(90deg,${ERA.join(',')})"></span><span class="k">Latest</span><span class="dates">${data.lo} – ${data.hi}</span>`;
    } else {
      box.innerHTML = data.labels.map((l, i) => `<span><i style="background:${BRANCH_COL[i]}"></i>${esc(l)} line</span>`).join('') +
        `<span><i style="background:${DIRECT}"></i>Grandparents' descendants</span><span><i style="background:${OTHER}"></i>Not linked</span>`;
    }
    box.innerHTML += `<span class="keypin"><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="#5b5846" stroke="#2a2922"/></svg>Town or village</span>
      <span class="keypin"><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="#f7f3e4" stroke="#5b5846" stroke-width="2" stroke-dasharray="3 2"/></svg>Region, approximate or uncertain</span>`;
  }

  function clusterIcon(c) {
    const n = c.getAllChildMarkers().reduce((s, m) => s + (m.options.n || 1), 0), s = n < 10 ? 30 : n < 50 ? 36 : 44;
    return L.divIcon({ html: `<span>${n}</span>`, className: 'cluster', iconSize: [s, s] });
  }

  function view() {
    return `<div class="card slate mapcard"><div class="head"><span class="k">Map of places</span><span class="k" id="mapcount"></span></div>
      <div class="body mapctl">
        <span class="k gen-pick">Colour by <a href="#" data-mode="branch">Family line</a><a href="#" data-mode="era">Era</a></span>
        <label class="k"><input type="checkbox" id="maplines" checked> Migration lines</label>
        <span class="yrs"><label class="k">From <input type="range" id="ylo"></label><label class="k">To <input type="range" id="yhi"></label><span class="dates" id="yread"></span></span>
      </div><div id="maplegend" class="maplegend"></div></div>
      <div id="map" class="mapbox"><p class="empty" style="padding:20px">Loading map…</p></div>
      <p class="mapfoot" id="mapfoot"></p>
      <p><a href="#/places">All places as a list →</a></p>`;
  }

  async function mount(focus) {
    unmount();
    try { await load(); } catch (_) { $('#map').innerHTML = '<p class="empty" style="padding:20px">The map library could not be loaded.</p>'; return; }
    if (!$('#map')) return;   // left the page while loading
    data = data || build();
    if (!ui.hi) { ui.lo = data.lo; ui.hi = data.hi; }
    $('#map').innerHTML = '';
    const map = L.map('map', { worldCopyJump: true, zoomSnap: .5, minZoom: 2 });
    // Esri topographic tiles: tile.openstreetmap.org is blocked on some networks (e.g. Sam's Wi-Fi) and CARTO now needs a key
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18,
      attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, USGS, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors and the GIS user community' }).addTo(map);
    const cl = L.markerClusterGroup({ maxClusterRadius: 38, showCoverageOnHover: false, iconCreateFunction: clusterIcon });
    const ln = L.layerGroup().addTo(map); cl.addTo(map);
    M = { map, cl, ln, markers: {} };
    const sl = [$('#ylo'), $('#yhi')];
    sl.forEach(s => { s.min = data.lo; s.max = data.hi; s.step = 5; });
    sl[0].value = ui.lo; sl[1].value = ui.hi;
    const read = () => { $('#yread').textContent = ui.lo + ' – ' + ui.hi; };
    sl.forEach(s => s.oninput = () => {
      let a = +sl[0].value, b = +sl[1].value; if (a > b) { if (s === sl[0]) b = a; else a = b; sl[0].value = a; sl[1].value = b; }
      ui.lo = a; ui.hi = b; read(); clearTimeout(M.t); M.t = setTimeout(draw, 60);
    });
    read();
    const modes = document.querySelectorAll('[data-mode]');
    const setMode = () => modes.forEach(a => a.classList.toggle('on', a.dataset.mode === ui.mode));
    modes.forEach(a => a.onclick = e => { e.preventDefault(); ui.mode = a.dataset.mode; setMode(); draw(); });
    setMode();
    $('#maplines').checked = ui.lines; $('#maplines').onchange = e => { ui.lines = e.target.checked; draw(); };
    draw();
    $('#mapfoot').textContent = `${data.lines.length} people have a line from birth to death place, through any immigration stop. ${data.skipped} entries have no plottable place (country only or not identified) and are not shown. Private and living people are left off.`;
    const all = Object.values(data.pts).map(p => [p.info.lat, p.info.lng]);
    if (all.length) map.fitBounds(all, { padding: [20, 20] }); else map.setView([20, 80], 2);
    const m = focus && M.markers[focus];
    if (m) { map.setView(m.getLatLng(), 9); cl.zoomToShowLayer(m, () => m.openPopup()); }
    else if (focus && S.placeInfo(focus) && S.placeInfo(focus).lat != null) { const i = S.placeInfo(focus); map.setView([i.lat, i.lng], 8); }
  }
  function unmount() { if (M) { M.map.remove(); M = null; } }
  const has = name => { const i = S.placeInfo(name); return !!(i && i.lat != null && i.precision !== 'country'); };
  return { view, mount, unmount, has };
})();
