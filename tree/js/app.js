/* Views. Read-only for now. MODE is the hook for the later edit mode:
   views render through helpers that can add edit controls when MODE === 'edit'. */
const MODE = 'view';
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const S = Store;
const pHref = p => '#/person/' + S.idKey(p.id);
const ref = p => 'REF. ' + S.idKey(p.id);

function mini(p, extra) {
  if (p && p.private) return `<a class="minicard unk" href="${pHref(p)}"><div class="k">${esc(extra || 'Person')}</div><div class="nm">Private</div></a>`;
  if (!p) return '<div class="minicard unk"><div class="nm">Unknown</div><div class="k">not recorded</div></div>';
  const b = S.ev(p, 'BIRT');
  return `<a class="minicard" href="${pHref(p)}"><div class="k">${esc(extra || '')}${extra ? ' · ' : ''}<span class="mono">${esc(S.idKey(p.id))}</span></div>
    <div class="nm">${esc(S.name(p))}</div><div class="dates">${esc(S.span(p))}${b && b.place ? ' · ' + esc(b.place.split(',')[0]) : ''}</div></a>`;
}
const sortByBirth = a => a.slice().sort((x, y) => (x.birth_year || 9999) - (y.birth_year || 9999));
function evRows(list) {
  return list.slice().sort((a, b) => (a.year || 9999) - (b.year || 9999)).map(e =>
    `<tr><td class="k">${esc(S.EV[e.type] || e.type)}</td><td class="d">${esc(e.date)}</td><td>${esc(e.place)}${e.desc ? (e.place ? ' — ' : '') + esc(e.desc.split('\n')[0]) : ''}</td></tr>`).join('');
}

/* ---------- views ---------- */
function home() {
  const ppl = S.all(), sn = S.surnames();
  const top = Object.entries(sn).filter(([k]) => !k.startsWith('(')).sort((a, b) => b[1].length - a[1].length).slice(0, 12);
  const yrs = ppl.map(p => p.birth_year).filter(Boolean);
  const root = S.person('@I1@');
  const side = q => { if (!q) return []; const g = [S.parents(q).father, S.parents(q).mother].filter(x => x && !x.private); return g.length ? g : (q.private ? [] : [q]); };
  const par = root ? S.parents(root) : {};
  const lines = [['Father\u2019s parents', side(par.father)], ['Mother\u2019s parents', side(par.mother)]].filter(l => l[1].length);
  const pl = Object.keys(S.places()).length;
  return `<div class="hero">
    <div class="card slate"><div class="head"><span class="k">Sheet 1</span><span class="k">Index</span></div><div class="body">
      <h2 style="font-size:2rem;margin:4px 0 8px">The Graham, Dawes, Clark<br>and related families</h2>
      <p>A working record of ${ppl.length} people across ${yrs.length ? Math.round((Math.max(...yrs) - Math.min(...yrs)) / 25) : 0} or so generations, from ${Math.min(...yrs)} to the present, mostly in England, Scotland and New Zealand.</p>
      <p>Begin with the four grandparents, or search by name or place above.</p>
      ${lines.map(([lab, ps]) => `<p><span class="k">${lab}</span><br>${ps.map(q => `<a href="${pHref(q)}">${esc(S.name(q))}</a> <span class="dates">${esc(S.span(q))}</span>`).join(' &amp; ')}</p>`).join('')}
      ${root ? `<p><a href="#/chart/${S.idKey(root.id)}/6">Both lines on one chart \u2192</a></p>` : ''}</div></div>
    <div><div class="section" style="margin-top:0"><h2>Survey summary</h2>
      <div class="stat"><span>People</span><span>${ppl.length}</span></div>
      <div class="stat"><span>Families</span><span>${document.body.dataset.fams}</span></div>
      <div class="stat"><span>Places named</span><span>${pl}</span></div>
      <div class="stat"><span>Earliest birth recorded</span><span>${Math.min(...yrs)}</span></div>
      <p style="margin-top:8px"><a href="#/records">Records: oldest, furthest back, longest-lived and more →</a></p></div>
      <div class="section"><h2>Principal surnames</h2>
      ${top.map(([k, v]) => `<div class="stat"><a href="#/surname/${encodeURIComponent(k)}">${esc(k)}</a><span>${v.length}</span></div>`).join('')}
      <p style="margin-top:8px"><a href="#/surnames">All surnames →</a></p></div></div></div>`;
}

function personView(key) {
  const p = S.person(S.keyId(key)); if (!p) return notFound();
  if (p.private) return `<div class="card slate"><div class="head"><span class="k">${esc(ref(p))}</span><span class="k">Private</span></div><div class="body"><h1 class="person-name">Private</h1><p class="empty">Details of this person are kept private.</p></div></div><div class="section"><h2>Parents</h2><div class="cols">${mini(S.parents(p).father, 'Father')}${mini(S.parents(p).mother, 'Mother')}</div></div>`;
  const b = S.ev(p, 'BIRT'), d = S.ev(p, 'DEAT'), bu = S.ev(p, 'BURI');
  const par = S.parents(p), sibs = sortByBirth(S.siblings(p)), un = S.unions(p);
  const fact = (lab, e) => e ? `<tr><td class="k">${lab}</td><td class="d">${esc(e.date)}</td><td>${esc(e.place)}</td></tr>` : '';
  const rest = p.events.filter(e => !['BIRT', 'DEAT', 'BURI'].includes(e.type));
  const famEvents = un.map(u => u.fam.events.map(e => ({ ...e, _with: u.spouse }))).flat();
  return `<div class="card ${p.sex === 'F' ? 'rust' : p.sex === 'M' ? 'olive' : 'slate'}">
    <div class="head"><span class="k">${esc(ref(p))}</span><span class="k">${p.sex === 'F' ? 'Female' : p.sex === 'M' ? 'Male' : 'Sex not recorded'}</span></div>
    <div class="body"><h1 class="person-name">${esc(S.name(p))}</h1><div class="dates">${esc(S.span(p))}</div>
      <table class="ledger" style="margin-top:10px">${fact('Born', b)}${fact('Died', d)}${fact('Buried', bu)}</table></div></div>
    <div class="section"><h2>Parents</h2><div class="cols">${mini(par.father, 'Father')}${mini(par.mother, 'Mother')}</div>
      <p style="margin-top:10px"><a href="#/chart/${esc(key)}/5">Ancestor chart →</a></p></div>
    ${sibs.length ? `<div class="section"><h2>Siblings</h2><div class="cols">${sibs.map(s => mini(s)).join('')}</div></div>` : ''}
    ${un.length ? `<div class="section"><h2>${un.length > 1 ? 'Partners and children' : 'Partner and children'}</h2>${un.map(u => `
      <div style="margin-bottom:18px"><div class="cols">${mini(u.spouse, 'Partner')}</div>
      ${u.fam.events.length ? `<table class="ledger" style="margin-top:8px">${evRows(u.fam.events)}</table>` : ''}
      ${u.children.length ? `<div class="cols" style="margin-top:10px">${sortByBirth(u.children).map(c => mini(c, 'Child')).join('')}</div>` : ''}</div>`).join('')}</div>` : ''}
    ${rest.length ? `<div class="section"><h2>Other recorded events</h2><table class="ledger">${evRows(rest)}</table></div>` : ''}
    ${p.notes.length ? `<div class="section"><h2>Notes</h2>${p.notes.map(n => `<div class="note">${esc(n)}</div>`).join('')}</div>` : ''}
    ${Records.forPerson(p)}
    ${attView(p)}
    ${p.media.length ? `<div class="section"><h2>Attached documents</h2>${p.media.map(m => `<details class="att"><summary>${esc(m.file)}</summary><div class="inner">${m.note ? esc(m.note) : '<span class="empty">No transcription yet. Image display comes in a later stage.</span>'}</div></details>`).join('')}</div>` : ''}`;
}

const ROLE = { subject: '', sender: 'Written by', recipient: 'Sent to', mentioned: 'Mentioned', place: 'Place' };
function attView(p) {
  const L = S.attachments(p.id); if (!L.length) return '';
  const pics = L.filter(a => a.kind === 'pic'), docs = L.filter(a => a.kind === 'text');
  const cap = a => `${ROLE[a.role] || ''}${a.conf === 'low' ? ' (uncertain)' : ''}`.trim();
  const flag = a => a.note ? `<div class="attnote">${esc(a.note)}</div>` : '';
  return `<div class="section"><h2>Pictures and documents</h2>
    ${pics.length ? `<div class="gallery">${pics.map(a => `<figure><a href="${S.mediaUrl(a)}" target="_blank"><img loading="lazy" src="${S.mediaUrl(a)}" alt="${esc(a.title)}"></a><figcaption>${esc(a.title)}${cap(a) ? ` <span class="k">${esc(cap(a))}</span>` : ''}${flag(a)}</figcaption></figure>`).join('')}</div>` : ''}
    ${docs.map(a => `<details class="att" data-src="${S.mediaUrl(a)}"><summary>${esc(a.title)}${cap(a) ? ` <span class="k">${esc(cap(a))}</span>` : ''}</summary><div class="inner">${flag(a)}<span class="empty">Loading…</span></div></details>`).join('')}</div>`;
}
document.addEventListener('toggle', async e => {
  const d = e.target; if (!d.matches || !d.matches('details.att[data-src]') || !d.open || d.dataset.done) return;
  d.dataset.done = 1; const box = d.querySelector('.inner'), nt = box.querySelector('.attnote');
  try { const t = await (await fetch(d.dataset.src)).text(); box.innerHTML = (nt ? nt.outerHTML : '') + '<pre class="ocr">' + esc(t) + '</pre>'; }
  catch (_) { box.innerHTML += 'Could not load.'; }
}, true);

function chartView(key, gens) {
  const p = S.person(S.keyId(key)); if (!p) return notFound();
  const G = Math.min(7, Math.max(2, +gens || 5)), W = 210, H = 40, GAP = 54, slot = H + 10, rows = 2 ** (G - 1), top = 30;
  const totalH = rows * slot + top + 10, totalW = G * W + (G - 1) * GAP + 20;
  const nodes = [], lines = [];
  (function place(person, g, i) {
    if (!person || g >= G) return;
    const x = 10 + g * (W + GAP), y = top + (i + 0.5) * (rows * slot / 2 ** g);
    nodes.push({ person, x, y, g });
    const par = S.parents(person);
    [[par.father, i * 2], [par.mother, i * 2 + 1]].forEach(([q, j]) => {
      if (!q) return;
      if (g + 1 >= G) { nodes.push({ more: true, x: x + W, y }); return; }
      const qy = top + (j + 0.5) * (rows * slot / 2 ** (g + 1)), qx = 10 + (g + 1) * (W + GAP);
      lines.push(`M${x + W},${y} H${x + W + GAP / 2} V${qy} H${qx}`);
      place(q, g + 1, j);
    });
  })(p, 0, 0);
  const ROM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
    ${Array.from({ length: G }, (_, g) => `<text x="${10 + g * (W + GAP)}" y="18" font-size="13" fill="#5b5846" letter-spacing="2">GEN. ${ROM[g]}</text><line x1="${10 + g * (W + GAP)}" x2="${10 + g * (W + GAP) + W}" y1="23" y2="23" stroke="#2a2922"/>`).join('')}
    ${lines.map(d => `<path d="${d}" fill="none" stroke="#3f5159" stroke-width="1.2"/>`).join('')}
    ${nodes.map(n => n.more ? `<text x="${n.x + 6}" y="${n.y + 5}" fill="#9b4a2a" font-size="15">›</text>` : `
      <a href="${pHref(n.person)}"><rect x="${n.x}" y="${n.y - H / 2}" width="${W}" height="${H}" fill="${n.g === 0 ? '#e4dcc0' : '#f7f3e4'}" stroke="#2a2922"/>
      <rect x="${n.x}" y="${n.y - H / 2}" width="4" height="${H}" fill="${n.person.sex === 'F' ? '#9b4a2a' : '#5f6532'}"/>
      <text x="${n.x + 12}" y="${n.y - 3}" font-size="15" fill="#2a2922">${esc(trunc(S.name(n.person), 27))}</text>
      <text x="${n.x + 12}" y="${n.y + 13}" font-size="12" fill="#5b5846">${esc(S.span(n.person))}</text></a>`).join('')}</svg>`;
  return `<div class="card slate"><div class="head"><span class="k">Ancestor chart</span><span class="k gen-pick">Generations: ${[3, 4, 5, 6, 7].map(n => `<a class="${n === G ? 'on' : ''}" href="#/chart/${esc(key)}/${n}">${n}</a>`).join('')}</span></div>
    <div class="body"><h1 class="person-name" style="font-size:1.9rem"><a href="${pHref(p)}" style="border:0">${esc(S.name(p))}</a></h1>
    <span class="k">Click any name to move the chart there. › marks a line that continues beyond the chart.</span></div></div>
    <div class="pedwrap" style="margin-top:18px">${svg}</div>`;
}
const trunc = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;

function surnamesView() {
  const m = S.surnames(), keys = Object.keys(m).sort((a, b) => a.localeCompare(b));
  const letters = [...new Set(keys.map(k => k[0].toUpperCase()))];
  return `<div class="section" style="margin-top:0"><h2>Surnames</h2><div class="letters">${letters.map(l => `<a href="#" data-jump="${l}">${l}</a>`).join('')}</div>
    <div class="list-split">${keys.map(k => `<div id="s-${esc(k[0].toUpperCase())}-${esc(k)}"><a href="#/surname/${encodeURIComponent(k)}">${esc(k)}</a><span>${m[k].length}</span></div>`).join('')}</div></div>`;
}
function surnameView(s) {
  const list = sortByBirth(S.surnames()[s] || []);
  return `<div class="section" style="margin-top:0"><h2>${esc(s)} — ${list.length} ${list.length === 1 ? 'person' : 'people'}</h2><div class="cols wide">${list.map(p => mini(p)).join('')}</div></div>`;
}
/* place hierarchy: country, then region (the level under the country), then the place */
function placeGroup(pl) {
  const ch = S.placeChain(pl);
  if (!ch.length) return { country: pl.split(',').pop().trim() || '(none)', region: '' };
  const country = ch[0][1].name, own = ch[ch.length - 1][1];
  const region = ch.length >= 3 ? ch[1][0] : ch.length === 2 && own.precision !== 'place' ? ch[1][0] : '';
  return { country, region };
}
const venues = evs => [...new Set(evs.map(e => e.place_detail).filter(Boolean))];
function placesView() {
  const m = S.places(), by = {};
  for (const [pl, v] of Object.entries(m)) {
    const g = placeGroup(pl), c = (by[g.country] = by[g.country] || {});
    (c[g.region] = c[g.region] || []).push([pl, v.people.size, venues([...v.people.values()].flat())]);
  }
  const nPl = c => Object.values(c).reduce((s, a) => s + a.length, 0);
  const row = ([pl, n, vs]) => `<div><span><a href="#/place/${encodeURIComponent(pl)}">${esc(pl.split(', ')[0])}</a>${pl === placeGroup(pl).region ? ' <span class="venue">(region only)</span>' : ''}${vs.length ? ` <span class="venue">${esc(vs.join('; '))}</span>` : ''}</span><span>${n}</span></div>`;
  return `<div class="section" style="margin-top:0"><h2>Places</h2><p class="k">Grouped by country, then region. Numbers are people with an event there. <a href="#/map">See them on the map →</a></p>` +
    Object.entries(by).sort((a, b) => nPl(b[1]) - nPl(a[1])).map(([c, regs]) =>
    `<details open class="att"><summary>${esc(c)} <span class="k">· ${nPl(regs)} places</span></summary><div class="inner">${Object.entries(regs)
      .sort((a, b) => (a[0] ? 1 : 0) - (b[0] ? 1 : 0) || a[0].localeCompare(b[0])).map(([r, arr]) =>
      `${r ? `<h3 class="region"><a href="#/place/${encodeURIComponent(r)}">${esc(r.split(', ')[0])}</a></h3>` : ''}<div class="list-split">${arr.sort((a, b) => a[0].localeCompare(b[0])).map(row).join('')}</div>`).join('')}</div></details>`).join('') + '</div>';
}
function placeView(pl) {
  const m = S.places(), v = m[pl], info = S.placeInfo(pl);
  const within = Object.keys(m).filter(k => k !== pl && k.endsWith(', ' + pl)).sort();
  if (!v && !within.length) return notFound();
  const crumbs = S.placeChain(pl).slice(0, -1).map(([n, i]) => `<a href="#/place/${encodeURIComponent(n)}">${esc(i.name)}</a>`).reverse().join(', ');
  const rows = v ? [...v.people.entries()].map(([id, evs]) => [S.person(id), evs]).sort((a, b) => (a[0].birth_year || 9999) - (b[0].birth_year || 9999)) : [];
  const note = !info ? '' : info.lat == null || info.precision === 'country' ? 'Not on the map' : info.uncertain ? 'Position on the map is uncertain and needs review' : info.approx ? 'Approximate position on the map' : info.precision === 'place' ? '' : 'Mapped as a region';
  return `<div class="section" style="margin-top:0"><h2>${esc(info ? info.name : pl)}${crumbs ? ` <span class="crumbs">· ${crumbs}</span>` : ''}</h2>
    <p class="k">${TreeMap.has(pl) ? `<a href="#/map/${encodeURIComponent(pl)}">Show on the map →</a> ` : ''}${note ? esc(note) + ' · ' : ''}<a href="#/places">All places</a></p>
    ${rows.length ? `<table class="ledger">${rows.map(([p, evs]) =>
    `<tr><td class="k">${evs.map(e => S.EV[e.type] || e.type).join(', ')}</td><td class="d">${esc(evs.map(e => e.date).filter(Boolean).join('; '))}</td><td><a href="${pHref(p)}">${esc(S.name(p))}</a> <span class="dates">${esc(S.span(p))}</span>${venues(evs).length ? `<div class="venue">${esc(venues(evs).join('; '))}</div>` : ''}</td></tr>`).join('')}</table>` : ''}
    ${within.length ? `<div class="section"><h2>Places within</h2><div class="list-split">${within.map(k => `<div><a href="#/place/${encodeURIComponent(k)}">${esc(k.slice(0, -pl.length - 2))}</a><span>${m[k].people.size}</span></div>`).join('')}</div></div>` : ''}</div>`;
}
function searchView(q) {
  const r = S.search(q);
  return `<div class="section" style="margin-top:0"><h2>${r.length} result${r.length === 1 ? '' : 's'} for “${esc(q)}”</h2><div class="cols wide">${r.slice(0, 120).map(p => mini(p)).join('') || '<p class="empty">Nothing matches. Try fewer words, or just a surname.</p>'}</div></div>`;
}
const notFound = () => '<p class="empty">That page is not on this sheet.</p>';

/* ---------- router ---------- */
function route() {
  const h = decodeURIComponent((location.hash || '#/').slice(2)), [a, b, c] = h.split('/');
  let html;
  if (!a) html = home();
  else if (a === 'person') html = personView(b);
  else if (a === 'chart') html = chartView(b, c);
  else if (a === 'surnames') html = surnamesView();
  else if (a === 'surname') html = surnameView(b);
  else if (a === 'places') html = placesView();
  else if (a === 'place') html = placeView(h.slice(6));
  else if (a === 'search') html = searchView(h.slice(7));
  else if (a === 'map') html = TreeMap.view();
  else if (a === 'records') html = Records.view();
  else if (a === 'given') html = Records.givenView(b);
  else html = notFound();
  TreeMap.unmount();
  $('#view').innerHTML = html;
  document.body.classList.toggle('wide', a === 'map');
  if (a === 'map') TreeMap.mount(h.slice(4) || null);
  document.querySelectorAll('nav.legend a').forEach(l => l.classList.toggle('on', l.getAttribute('href') === '#/' + (a || '')));
  const pn = a === 'person' && S.person(S.keyId(b));
  document.title = pn ? S.name(pn) + ' · Family tree' : 'Family tree';
  window.scrollTo(0, 0);
  const rec = a === 'records' && b && document.getElementById('rec-' + b); if (rec) rec.scrollIntoView({ block: 'start' });
  document.querySelectorAll('[data-jump]').forEach(l => l.onclick = e => { e.preventDefault(); const t = document.querySelector(`[id^="s-${l.dataset.jump}-"]`); t && t.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
}
async function boot() {
  try {
    const local = ['localhost', '127.0.0.1'].includes(location.hostname);
    let D; try { if (!local) throw 0; D = await S.load('data/tree.full.json'); } catch (_) { D = await S.load('data/tree.json'); }
    document.body.dataset.fams = Object.keys(D.families).length;
    $('#gen').textContent = 'Compiled ' + D.meta.generated.slice(0, 10) + ' from ' + D.meta.source;
    $('#mode').textContent = D.meta.variant === 'full' ? 'Local full copy, includes private people' : 'Read-only view, private details withheld';
    $('#q').form.onsubmit = e => { e.preventDefault(); const q = $('#q').value.trim(); if (q) location.hash = '#/search/' + encodeURIComponent(q); };
    window.addEventListener('hashchange', route); route();
  } catch (e) { $('#view').innerHTML = '<p class="empty">Could not load the tree data. If you opened this file directly, serve the folder instead (see README).</p>'; console.error(e); }
}
boot();
