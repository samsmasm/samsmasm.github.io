'use strict';
// ---------------------------------------------------------------------------
// Shared core for the WC26 pages. The leaderboard (app.js) and the schedule
// (schedule.js) BOTH resolve match results through here, so they can never
// disagree about who won. If you change name handling or result orientation,
// you change it once, here.
//
// The subtle bug this prevents: matches are stored under an ORDER-FREE key
// (sorted pair), so ESPN's home/away may be the reverse of a fixture's. Every
// read of a score must be re-oriented to the order the caller cares about.
// `orient()` / `outcome()` are the only sanctioned way to read a result.
// ---------------------------------------------------------------------------
(function (global) {
  function strip(name) {
    return (name || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // drop diacritics
      .toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  const ALIAS = {
    korearepublic: 'southkorea', republicofkorea: 'southkorea', southkorea: 'southkorea',
    iriran: 'iran', iran: 'iran',
    turkiye: 'turkiye', turkey: 'turkiye',
    cotedivoire: 'ivorycoast', ivorycoast: 'ivorycoast',
    caboverde: 'capeverde', capeverde: 'capeverde',
    congodr: 'drcongo', drcongo: 'drcongo', democraticrepublicofcongo: 'drcongo',
    bosniaandherzegovina: 'bosnia', bosniaherzegovina: 'bosnia',
    usa: 'unitedstates', unitedstates: 'unitedstates', unitedstatesofamerica: 'unitedstates',
  };
  const canon = name => { const s = strip(name); return ALIAS[s] || s; };
  const same = (a, b) => canon(a) === canon(b);
  const pairKey = (a, b) => [canon(a), canon(b)].sort().join('|');
  const esc = s => (s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Pull both competitors out of an ESPN event, with raw home/away scores.
  function competitors(ev) {
    const c = ev.competitions && ev.competitions[0];
    if (!c) return null;
    const home = c.competitors.find(x => x.homeAway === 'home') || c.competitors[0];
    const away = c.competitors.find(x => x.homeAway === 'away') || c.competitors[1];
    const st = c.status && c.status.type;
    return {
      note: c.altGameNote || '',
      state: st && st.state,           // pre | in | post
      completed: !!(st && st.completed),
      home: home.team.displayName, hs: parseInt(home.score, 10),
      away: away.team.displayName, as: parseInt(away.score, 10),
    };
  }

  // Build a Map of order-free pairKey -> competitor record. `accept` decides
  // which games count (default: completed only). Games without two numeric
  // scores are skipped.
  function buildMatchMap(events, accept) {
    accept = accept || (m => m.completed);
    const map = new Map();
    for (const ev of (events || [])) {
      const m = competitors(ev);
      if (!m || !accept(m)) continue;
      if (Number.isNaN(m.hs) || Number.isNaN(m.as)) continue;
      map.set(pairKey(m.home, m.away), m);
    }
    return map;
  }

  // THE one place that reads a score. Given a match record and the order you
  // care about (a vs b), returns the scores oriented so `a` is first, no matter
  // which side ESPN listed as home. Returns null when there is no usable score.
  function orient(a, b, m) {
    if (!m || Number.isNaN(m.hs) || Number.isNaN(m.as)) return null;
    const aIsHome = same(a, m.home);
    return {
      a: aIsHome ? m.hs : m.as,
      b: aIsHome ? m.as : m.hs,
      state: m.state, completed: m.completed,
    };
  }

  // ESPN publishes knockout fixtures early with placeholder "teams" for slots
  // not yet filled (e.g. "Group I Winner", "Third Place Group A/B/C/D/F",
  // "Group J 2nd Place"). These are bracket positions, not countries, and must
  // never be treated as a team that reached a round. No real nation's name
  // contains these words, so a keyword test is safe.
  const PLACEHOLDER = /\b(group|winner|runner|place|loser|tbd)\b/i;
  const isPlaceholderTeam = name => PLACEHOLDER.test(name || '');

  // Outcome from a's perspective: 'a' | 'b' | 'draw' | null (no result yet).
  function outcome(a, b, m) {
    const o = orient(a, b, m);
    if (!o) return null;
    if (o.a > o.b) return 'a';
    if (o.b > o.a) return 'b';
    return 'draw';
  }

  global.WC = { strip, ALIAS, canon, same, pairKey, esc, competitors, buildMatchMap, orient, outcome, isPlaceholderTeam };
})(typeof window !== 'undefined' ? window : globalThis);
