/* Data layer. All views read through Store; none touch the JSON directly.
   Edit mode (later) will add Store.save*() methods that write via a local API,
   so views never need to change how they read. */
const Store = (() => {
  // Where image and transcript files live. Change these two lines to move them (e.g. to a bucket).
  const MEDIA = { pics: 'webpics/', text: 'webtext/' };
  let D = null, byName = [], ATT = {};
  const EV = { BIRT:'Born', DEAT:'Died', BURI:'Buried', CHR:'Christened', BAPM:'Baptised', MARR:'Married', DIV:'Divorced',
    ENGA:'Engaged', RESI:'Residence', OCCU:'Occupation', EMIG:'Emigrated', IMMI:'Immigrated', NATU:'Naturalised', CENS:'Census',
    PROB:'Probate', WILL:'Will', CREM:'Cremated', EVEN:'Event', EDUC:'Education', RELI:'Religion', TITL:'Title', NATI:'Nationality', ADOP:'Adopted' };
  const idKey = id => id.replace(/@/g, '');
  const keyId = k => '@' + k + '@';
  const cleanPlace = s => (s || '').replace(/\s+/g, ' ').replace(/\s+,/g, ',').trim();
  async function load(url) {
    const r = await fetch(url); D = await r.json();
    for (const p of Object.values(D.people)) {
      p.events.forEach(e => e.place = cleanPlace(e.place));
      p._lc = (p.name || '').toLowerCase();
    }
    for (const f of Object.values(D.families)) f.events.forEach(e => e.place = cleanPlace(e.place));
    try {
      const a = await (await fetch('data/attachments.json')).json();
      for (const it of a) for (const q of it.p) (ATT[q[0]] = ATT[q[0]] || []).push({ kind: it.k, file: it.f, title: it.t, role: q[1], conf: q[2], note: q[3] });
    } catch (_) { ATT = {}; }
    return D;
  }
  const attachments = id => ATT[id] || [];
  const mediaUrl = a => (a.kind === 'pic' ? MEDIA.pics : MEDIA.text) + encodeURIComponent(a.file);
  const person = id => D.people[id] || null;
  const family = id => D.families[id] || null;
  const all = () => Object.values(D.people);
  const ev = (o, t) => o.events.find(e => e.type === t) || null;
  const name = p => (p && p.private) ? 'Private' : (p && p.name) ? p.name : '(unnamed)';
  function span(p) {
    const b = ev(p, 'BIRT') || ev(p, 'CHR') || ev(p, 'BAPM'), d = ev(p, 'DEAT') || ev(p, 'BURI');
    const by = b && b.year, dy = d && d.year;
    if (!by && !dy) return '';
    return (by || '?') + ' – ' + (dy || (p.living ? '' : '?'));
  }
  function parents(p) {
    const f = p.famc.length ? family(p.famc[0]) : null;
    return { fam: f, father: f && f.husb ? person(f.husb) : null, mother: f && f.wife ? person(f.wife) : null };
  }
  function siblings(p) {
    const f = p.famc.length ? family(p.famc[0]) : null;
    return f ? f.children.filter(c => c !== p.id).map(person).filter(Boolean) : [];
  }
  function unions(p) {
    return p.fams.map(fid => { const f = family(fid); const sid = f.husb === p.id ? f.wife : f.husb;
      return { fam: f, spouse: sid ? person(sid) : null, children: f.children.map(person).filter(Boolean) }; });
  }
  function surnames() {
    const m = {}; for (const p of all()) { if (p.private) continue; const s = (p.surname || '').trim() || '(none recorded)'; (m[s] = m[s] || []).push(p); }
    return m;
  }
  function places() {
    const m = {};
    const add = (pl, o, e) => { if (!pl) return; const x = (m[pl] = m[pl] || { people: new Map() }); const k = o.id; if (!x.people.has(k)) x.people.set(k, []); x.people.get(k).push(e); };
    for (const p of all()) for (const e of p.events) add(e.place, p, e);
    return m;
  }
  function search(q) {
    const toks = q.toLowerCase().split(/\s+/).filter(Boolean); if (!toks.length) return [];
    const pl = places(); const res = [];
    for (const p of all()) {
      if (p.private) continue;
      const hay = p._lc + ' ' + p.events.map(e => e.place.toLowerCase()).join(' ');
      if (toks.every(t => hay.includes(t))) res.push([toks.every(t => p._lc.includes(t)) ? 0 : 1, p]);
    }
    return res.sort((a, b) => a[0] - b[0] || (a[1].birth_year || 9999) - (b[1].birth_year || 9999)).map(x => x[1]);
  }
  const meta = () => D.meta;
  return { load, attachments, mediaUrl, person, family, all, ev, name, span, parents, siblings, unions, surnames, places, search, meta, EV, idKey, keyId };
})();
