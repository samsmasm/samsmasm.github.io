/* Records page: superlatives worked out in the browser from the public data.
   Living and private people are skipped everywhere (the local full copy marks living people but not private). */
const Records = (() => {
  const HOME = { name: 'Auckland', lat: -36.8485, lng: 174.7633 };   // "born furthest from" measures from here
  const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  const TOP = 5;

  /* "16 Jan 1937" -> { y, m, d, approx }. Qualified dates (Abt, Bef, Bet, ~, c., ranges, decades) are approx. */
  function pd(s) {
    s = (s || '').trim(); if (!s) return null;
    const y = s.match(/\d{4}/); if (!y) return null;
    const approx = /^(~|abt|about|bef|aft|bet|est|cal|c\.|circa|from|to)/i.test(s) || /\d{4}\s*-\s*\d{4}|\d{4}s/i.test(s);
    let m = 0, d = 0, x;
    if ((x = s.match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?\s+(\d{4})/)) && MON[x[2].toLowerCase()]) { d = +x[1]; m = MON[x[2].toLowerCase()]; }
    else if ((x = s.match(/([A-Za-z]{3})[a-z]*\.?\s+(\d{4})/)) && MON[x[1].toLowerCase()]) m = MON[x[1].toLowerCase()];
    return { y: +y[0], m, d, approx };
  }
  const full = t => t && t.m && t.d;
  /* age between two parsed dates; null if either is approximate */
  function age(a, b) {
    if (!a || !b || a.approx || b.approx) return null;
    if (full(a) && full(b)) {
      let v = b.y - a.y; if (b.m < a.m || (b.m === a.m && b.d < a.d)) v--;
      if (v < 0) return null;
      const days = (Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 864e5;
      return { v, sort: days / 365.25, txt: String(v), about: false };
    }
    const v = b.y - a.y; if (v < 0) return null; return { v, sort: v, txt: 'c. ' + v, about: true };
  }
  const pub = p => p && !p.private && !p.living;
  const people = () => S.all().filter(pub);
  const birthEv = p => S.ev(p, 'BIRT') || S.ev(p, 'CHR') || S.ev(p, 'BAPM');
  const deathEv = p => S.ev(p, 'DEAT') || S.ev(p, 'BURI');
  const born = p => pd((birthEv(p) || {}).date);
  const died = p => pd((deathEv(p) || {}).date);
  // one entry per couple (the tree has a few duplicate families)
  function couples() { const seen = new Set(); return Object.values(S.families()).filter(f => { const k = f.husb + f.wife; return !(f.husb && f.wife && seen.has(k)) && seen.add(k); }).map(f => ({ f, h: S.person(f.husb), w: S.person(f.wife) })); }
  const marr = f => pd((f.events.find(e => e.type === 'MARR') || {}).date);
  const geo = pl => { const i = pl && S.placeInfo(pl); return i && i.lat != null && i.precision !== 'country' ? i : null; };
  function km(a, b) {
    const r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r;
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  }
  const fmtKm = n => Math.round(n).toLocaleString('en-GB') + ' km';
  const yrs = a => a.txt + (a.v === 1 ? ' year' : ' years');

  /* rendering. Each row is { h, ps, warn }: ps are the people it names, warn says why it may be wrong. */
  const who = p => `<a href="${pHref(p)}">${esc(S.name(p))}</a> <span class="dates">${esc(S.span(p))}</span>`;
  function dodgy(p) {
    const b = born(p), d = died(p);
    if (/\bCHECK\b/.test(p.name || '')) return 'this person is marked for checking in the tree';
    if (b && d && d.y < b.y) return 'the recorded death is before the birth';
    return '';
  }
  function row(val, body, note, warn, ps) {
    ps = ps || []; warn = warn || ps.map(dodgy).find(Boolean) || '';
    return { ps, warn, val, h: `<tr${warn ? ' class="iffy"' : ''}><td class="k rv">${val}</td><td>${body}${note ? `<div class="venue">${note}</div>` : ''}${warn ? `<div class="recwarn">May be wrong: ${esc(warn)}.</div>` : ''}</td></tr>` };
  }
  const prow = (val, ps, note, warn) => row(val, ps.map(who).join('<br>'), note, warn, ps);
  const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  function card(title, sub, rows, empty) {
    const nx = rows.length && rows[0].warn && rows.find(r => !r.warn);
    const fall = nx ? `<p class="recnext">If the first entry is wrong, the record goes to ${nx.ps.map(p => `<a href="${pHref(p)}">${esc(S.name(p))}</a>`).join(' and ')} (${nx.val}).</p>` : '';
    return `<div class="card slate rec" id="rec-${slug(title)}"><div class="head"><span>${esc(title)}</span></div><div class="body">
    ${sub ? `<p class="k recsub">${sub}</p>` : ''}${rows.length ? `<table class="ledger">${rows.map(r => r.h).join('')}</table>${fall}` : `<p class="empty">${empty || 'Nothing recorded yet.'}</p>`}</div></div>`;
  }
  const group = (title, cards) => `<div class="section"><h2>${esc(title)}</h2><div class="recgrid">${cards.join('')}</div></div>`;

  /* ---------- Time ---------- */
  function furthestBack() {
    return people().map(p => [p, born(p)]).filter(x => x[1]).sort((a, b) => a[1].y - b[1].y).slice(0, TOP)
      .map(([p]) => prow(esc(birthEv(p).date), [p], birthEv(p).place ? esc(birthEv(p).place) : ''));
  }
  function longestLived() {
    return people().map(p => [p, age(born(p), died(p))]).filter(x => x[1]).sort((a, b) => b[1].sort - a[1].sort).slice(0, TOP)
      .map(([p, a]) => prow(yrs(a), [p], '', a.v >= 100 ? 'over 100 is rare, so check the dates' : ''));
  }
  const ordinal = n => n + (['th', 'st', 'nd', 'rd'][n % 10 < 4 && Math.floor(n / 10) % 10 !== 1 ? n % 10 : 0]);
  function byCentury() {
    const m = {};
    for (const p of people()) { const b = born(p); if (!b) continue; const c = Math.floor(b.y / 100); if (!m[c] || b.y < m[c][1].y) m[c] = [p, b]; }
    return Object.keys(m).sort().map(c => prow(ordinal(+c + 1) + ' c.', [m[c][0]], esc(birthEv(m[c][0]).date)));
  }

  /* ---------- Family ---------- */
  function ageGap() {
    return couples().filter(c => pub(c.h) && pub(c.w)).map(c => {
      const bh = born(c.h), bw = born(c.w); if (!bh || !bw || bh.approx || bw.approx) return null;
      const [o, y] = bh.y * 400 + bh.m * 32 + bh.d <= bw.y * 400 + bw.m * 32 + bw.d ? [bh, bw] : [bw, bh];
      return { c, a: age(o, y) };
    }).filter(x => x && x.a && x.a.v < 50).sort((a, b) => b.a.sort - a.a.sort).slice(0, TOP)   // 50+ is a data error
      .map(({ c, a }) => prow(yrs(a), [c.h, c.w], '', a.v >= 30 ? 'a gap this large is unusual, so check the birth dates' : ''));
  }
  function marriageAges() {
    const out = [];
    for (const c of couples()) {
      const m = marr(c.f); if (!m) continue;
      for (const p of [c.h, c.w]) if (pub(p)) { const a = age(born(p), m); if (a && a.v >= 10) out.push({ p, a, m: c.f.events.find(e => e.type === 'MARR').date }); }
    }
    return out;
  }
  const youngestMarried = () => marriageAges().sort((a, b) => a.a.sort - b.a.sort).slice(0, TOP)
    .map(x => prow(yrs(x.a), [x.p], 'Married ' + esc(x.m), x.a.v < 15 ? 'very young to marry, so check the birth and marriage dates' : ''));
  const oldestMarried = () => marriageAges().sort((a, b) => b.a.sort - a.a.sort).slice(0, TOP).map(x => prow(yrs(x.a), [x.p], 'Married ' + esc(x.m)));
  function parentAges(sex) {
    const L = [];
    for (const c of couples()) for (const kid of c.f.children.map(S.person).filter(pub)) {
      const kb = born(kid); if (!kb) continue;
      for (const p of [c.h, c.w]) if (pub(p) && p.sex === sex) { const a = age(born(p), kb); if (a) L.push({ p, a, kid }); }
    }
    const seen = new Set(), lim = sex === 'F' ? 48 : 70;
    return L.sort((a, b) => b.a.sort - a.a.sort).filter(x => !seen.has(x.p.id) && seen.add(x.p.id)).slice(0, TOP)
      .map(x => prow(yrs(x.a), [x.p], `${sex === 'F' ? 'Mother' : 'Father'} of <a href="${pHref(x.kid)}">${esc(S.name(x.kid))}</a>`,
        x.a.v >= lim ? `unusually old for a ${sex === 'F' ? 'mother' : 'father'}, so check the dates` : ''));
  }
  function longestMarriage() {
    return couples().filter(c => pub(c.h) && pub(c.w)).map(c => {
      const m = marr(c.f); if (!m) return null;
      const dv = pd((c.f.events.find(e => e.type === 'DIV') || {}).date);
      const ends = dv ? [dv] : [died(c.h), died(c.w)]; if (ends.some(e => !e)) return null;
      const end = ends.sort((a, b) => (a.y * 400 + a.m * 32 + a.d) - (b.y * 400 + b.m * 32 + b.d))[0];
      const a = age(m, end); return a && { c, a, why: dv ? 'until divorce' : 'until the first death' };
    }).filter(Boolean).sort((a, b) => b.a.sort - a.a.sort).slice(0, TOP)
      .map(({ c, a, why }) => prow(yrs(a), [c.h, c.w], why, a.v >= 70 ? 'over 70 years is rare, so check the dates' : ''));
  }
  function longestLine() {
    const memo = new Map();
    const down = p => {
      if (memo.has(p.id)) return memo.get(p.id);
      memo.set(p.id, [p]);
      let best = [p];
      for (const u of S.unions(p)) for (const k of u.children) if (pub(k)) { const ch = down(k); if (ch.length + 1 > best.length) best = [p, ...ch]; }
      memo.set(p.id, best); return best;
    };
    let top = [];
    for (const p of people()) { const ch = down(p); if (ch.length > top.length) top = ch; }
    if (!top.length) return [];
    return [{ ps: top, warn: '', val: top.length + ' generations', h: `<tr><td class="k rv">${top.length} generations</td><td class="chain">${top.map(p => `<a href="${pHref(p)}">${esc(S.name(p))}</a>`).join(' <span class="k">›</span> ')}</td></tr>` }];
  }
  const firstName = p => (p.given || '').trim().split(/\s+/)[0];
  function commonNames() {
    const m = {}; for (const p of people()) { const g = firstName(p); if (g) m[g] = (m[g] || 0) + 1; }
    return Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8)
      .map(([g, n]) => row(n + ' people', `<a href="#/given/${encodeURIComponent(g)}">${esc(g)}</a>`));
  }
  function commonSurnames() {
    const m = {}; for (const p of people()) { const s = (p.surname || '').trim(); if (s) m[s] = (m[s] || 0) + 1; }
    return Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8)
      .map(([s, n]) => row(n + ' people', `<a href="#/surname/${encodeURIComponent(s)}">${esc(s)}</a>`));
  }

  /* ---------- Place ---------- */
  function furthestFromHome() {
    return people().map(p => { const e = S.ev(p, 'BIRT') || S.ev(p, 'CHR'); const g = e && geo(e.place); return g && { p, e, g, d: km(HOME, g) }; })
      .filter(Boolean).sort((a, b) => b.d - a.d).filter((x, i, L) => L.findIndex(y => y.e.place === x.e.place) === i).slice(0, TOP)
      .map(x => prow(fmtKm(x.d), [x.p], `<a href="#/place/${encodeURIComponent(x.e.place)}">${esc(x.e.place)}</a>` + (x.g.approx ? ' (approximate)' : '')));
  }
  function furthestTravelled() {
    const pl = n => `<a href="#/place/${encodeURIComponent(n)}">${esc(n)}</a>`;
    return people().map(p => {
      const b = birthEv(p), d = deathEv(p), gb = b && geo(b.place), gd = d && geo(d.place);
      return gb && gd && { p, b, d, km: km(gb, gd) };
    }).filter(x => x && x.km > 1).sort((a, b) => b.km - a.km).slice(0, TOP)
      .map(x => prow(fmtKm(x.km), [x.p], `${pl(x.b.place)} to ${pl(x.d.place)}`));
  }
  function migrants() {
    const L = [];
    for (const p of people()) for (const e of p.events) if (e.type === 'IMMI' || e.type === 'EMIG') L.push({ p, e, y: (pd(e.date) || {}).y || 9999 });
    return L.sort((a, b) => a.y - b.y).map(({ p, e }) => prow(esc(e.date || 'Undated'), [p],
      [S.EV[e.type], e.place, e.desc].filter(Boolean).map(esc).join(' · ')));
  }
  function commonBirthplace() {
    const m = {}; for (const p of people()) { const e = S.ev(p, 'BIRT'); if (e && e.place) m[e.place] = (m[e.place] || 0) + 1; }
    return Object.entries(m).filter(x => x[1] > 1).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 6)
      .map(([pl, n]) => row(n + ' born', `<a href="#/place/${encodeURIComponent(pl)}">${esc(pl)}</a>`));
  }

  /* ---------- Stories ---------- */
  function mostPictured() {
    return people().map(p => ({ p, n: S.attachments(p.id).filter(a => a.kind === 'pic').length })).filter(x => x.n)
      .sort((a, b) => b.n - a.n).slice(0, TOP).map(x => prow(x.n + (x.n === 1 ? ' picture' : ' pictures'), [x.p]));
  }
  function bestDocumented() {
    return people().map(p => {
      const ev = p.events.length + p.fams.reduce((s, f) => s + ((S.family(f) || { events: [] }).events.length), 0);
      const docs = S.attachments(p.id).length + p.media.length;
      return { p, ev, docs, notes: p.notes.length, n: ev + docs + p.notes.length };
    }).sort((a, b) => b.n - a.n).slice(0, TOP)
      .map(x => prow(x.n + ' items', [x.p], `${x.ev} events, ${x.docs} pictures and documents, ${x.notes} notes`));
  }
  function occupations() {
    return people().flatMap(p => p.events.filter(e => e.type === 'OCCU' && e.desc).map(e => ({ p, e })))
      .sort((a, b) => a.e.desc.localeCompare(b.e.desc) || (b.e.date ? 1 : 0) - (a.e.date ? 1 : 0))
      .filter((x, i, L) => !i || x.p !== L[i - 1].p || x.e.desc !== L[i - 1].e.desc)
      // occupation is the main text (some are long), the year sits in the narrow left column
      .map(({ p, e }) => row(esc(e.date), `<span class="occ">${esc(e.desc.split(' - ')[0])}</span><br>${who(p)}`, e.place ? esc(e.place) : '', '', [p]));
  }
  function twins() {
    const out = [];
    for (const f of Object.values(S.families())) {
      const by = {};
      for (const k of f.children.map(S.person).filter(pub)) { const b = born(k); if (b && full(b) && !b.approx) (by[`${b.y}-${b.m}-${b.d}`] = by[`${b.y}-${b.m}-${b.d}`] || []).push(k); }
      for (const g of Object.values(by)) if (g.length > 1) out.push(prow(esc(birthEv(g[0]).date), g));
    }
    return out;
  }
  function onThisDay() {
    const L = [];
    const add = (ps, e) => { const t = pd(e.date); if (t && full(t) && !t.approx) L.push({ ps, e, t }); };
    for (const p of people()) for (const e of p.events) if (['BIRT', 'DEAT', 'CHR', 'BURI'].includes(e.type)) add([p], e);
    for (const c of couples()) for (const e of c.f.events) if (e.type === 'MARR' && pub(c.h) && pub(c.w)) add([c.h, c.w], e);
    const now = new Date(), key = (m, d) => m * 32 + d, today = key(now.getMonth() + 1, now.getDate());
    let hits = L.filter(x => key(x.t.m, x.t.d) === today), label = 'Today';
    if (!hits.length && L.length) {   // nothing today: show the next day that has something
      const next = L.map(x => key(x.t.m, x.t.d)).sort((a, b) => ((a - today + 416) % 416) - ((b - today + 416) % 416)).find(k => k !== today);
      hits = L.filter(x => key(x.t.m, x.t.d) === next); label = 'Next';
    }
    return { label, rows: hits.sort((a, b) => a.t.y - b.t.y).map(x => prow(String(x.t.y), x.ps,
      `${S.EV[x.e.type] || x.e.type} ${esc(x.e.date)}${x.e.place ? ', ' + esc(x.e.place) : ''}`)) };
  }

  /* ranked records, also used for the "Records held" box on person pages */
  const RANKED = [
    ['Time', 'Furthest back', 'Earliest recorded births', furthestBack],
    ['Time', 'Longest-lived', 'Age at death', longestLived],
    ['Time', 'First born in each century', '', byCentury],
    ['Family', 'Biggest age gap in a marriage', '', ageGap],
    ['Family', 'Youngest to marry', '', youngestMarried],
    ['Family', 'Oldest to marry', '', oldestMarried],
    ['Family', 'Oldest fathers', 'Age at a child’s birth', () => parentAges('M')],
    ['Family', 'Oldest mothers', 'Age at a child’s birth', () => parentAges('F')],
    ['Family', 'Longest marriages', 'Wedding to the first death, or divorce', longestMarriage],
    ['Family', 'Longest line of descent', 'Parent to child, unbroken', longestLine],
    ['Place', 'Born furthest from ' + HOME.name, 'As the crow flies', furthestFromHome],
    ['Place', 'Furthest travelled', 'Birthplace to place of death', furthestTravelled],
    ['Stories', 'Most pictured', 'Photos linked to them', mostPictured],
    ['Stories', 'Best documented', 'Events, pictures, documents and notes', bestDocumented]];
  const LISTS = [
    ['Family', 'Most common first names', '', commonNames],
    ['Family', 'Most common surnames', '', commonSurnames],
    ['Place', 'Most common birthplaces', '', commonBirthplace],
    ['Place', 'Emigrants and immigrants', 'Recorded voyages and arrivals', migrants],
    ['Stories', 'Twins', 'Siblings born on the same day', twins],
    ['Stories', 'Occupations', '', occupations]];
  let cache = null;
  const ranked = () => cache || (cache = RANKED.map(([g, t, sub, fn]) => [g, t, sub, fn()]));

  function view() {
    const otd = onThisDay(), all = [...ranked(), ...LISTS.map(([g, t, sub, fn]) => [g, t, sub, fn()])];
    all.push(['Stories', 'On this day', otd.label === 'Today' ? 'Births, marriages and deaths on today’s date' : 'Nothing on today’s date, so here is the next one', otd.rows]);
    const order = ['Time', 'Family', 'Place', 'Stories'];
    return `<div class="section" style="margin-top:0"><h2>Records</h2><p class="k">Firsts, extremes and curiosities from the tree. Ages use exact dates where recorded; dates marked about or between are left out. Living and private people are not included. Entries marked <span class="recwarn">may be wrong</span> look doubtful and need checking.</p></div>
      ${order.map(g => group(g, all.filter(x => x[0] === g).map(([, t, sub, rows]) => card(t, sub, rows, t === 'Twins' ? 'No twins recorded.' : '')))).join('')}`;
  }
  /* records a person appears in, for their page */
  function forPerson(p) {
    if (!pub(p)) return '';
    const hits = [];
    for (const [, t, , rows] of ranked()) {
      const i = rows.findIndex(r => r.ps.some(q => q.id === p.id)); if (i < 0) continue;
      const pos = t === 'Longest line of descent' ? 'part of the line' : t === 'First born in each century' ? rows[i].val.replace(' c.', ' century') : ordinal(i + 1);
      hits.push(`<div class="stat"><a href="#/records/${slug(t)}">${esc(t)}</a><span>${esc(pos)}${rows[i].warn ? ' <span class="recwarn">may be wrong</span>' : ''}</span></div>`);
    }
    return hits.length ? `<div class="section"><h2>Tree records</h2>${hits.join('')}<p style="margin-top:8px"><a href="#/records">All records →</a></p></div>` : '';
  }
  function givenView(g) {
    const list = sortByBirth(people().filter(p => firstName(p) === g));
    return `<div class="section" style="margin-top:0"><h2>First name ${esc(g)}: ${list.length} ${list.length === 1 ? 'person' : 'people'}</h2>
      <p class="k"><a href="#/records">Back to records</a></p><div class="cols wide">${list.map(p => mini(p)).join('')}</div></div>`;
  }
  return { view, givenView, forPerson };
})();
