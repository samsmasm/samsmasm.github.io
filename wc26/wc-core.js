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

  // Resolve knockout bracket slot codes to real teams. Codes come from
  // WC_SCHEDULE: "1A"/"2A" (group A winner / runner-up), "3EFGIJ" (a best
  // third-place slot from one of those groups), "W73" (winner of match 73).
  // Returns helpers used by BOTH the schedule and the "next games" box, so they
  // resolve identically. Sources: group standings (positions) + ESPN's own
  // bracket (best-third allocation and shootout-aware winners).
  const SLOT_RE = /^(?:[12][A-L]|3[A-L]{3,6}|W\d+)$/;
  const isSlot = s => SLOT_RE.test(s || '');
  function makeBracket(standings, events, schedule) {
    schedule = schedule || [];
    const POS = {};
    for (const ch of (standings && standings.children) || []) {
      const g = (ch.name.match(/group ([a-l])/i) || [])[1];
      if (!g) continue;
      const ents = (ch.standings && ch.standings.entries) || [];
      const stat = (e, n) => { const s = (e.stats || []).find(x => x.name === n); return s ? s.value : undefined; };
      if (!ents.length || !ents.every(e => (stat(e, 'gamesPlayed') || 0) >= 3)) continue; // group incomplete
      const ord = [...ents].sort((a, b) => (stat(a, 'rank') ?? 99) - (stat(b, 'rank') ?? 99));
      POS['1' + g.toUpperCase()] = ord[0].team.displayName;
      POS['2' + g.toUpperCase()] = ord[1].team.displayName;
    }
    const OPP = new Map(), WIN = new Map();
    for (const ev of events || []) {
      const c = ev.competitions && ev.competitions[0];
      if (!c || (c.competitors || []).length !== 2) continue;
      const note = c.altGameNote || '';
      if (!/round of \d+|quarter|semi|final/i.test(note)) continue;
      const [x, y] = c.competitors;
      const xn = x.team.displayName, yn = y.team.displayName;
      if (/round of 32/i.test(note)) { OPP.set(canon(xn), yn); OPP.set(canon(yn), xn); }
      if (c.status && c.status.type && c.status.type.completed) {
        const w = x.winner ? xn : (y.winner ? yn : null); // ESPN flag is correct on penalties
        if (w) WIN.set(pairKey(xn, yn), canon(w));
      }
    }
    function resolveSlot(code, depth) {
      if (!isSlot(code)) return code;        // already a real team (group stage)
      if (POS[code]) return POS[code];
      const w = /^W(\d+)$/.exec(code);
      if (w && depth < 6) {
        const row = schedule.find(r => r.no === +w[1]);
        if (!row) return null;
        const a = resolveSlot(row.t1, depth + 1), b = resolveSlot(row.t2, depth + 1);
        if (!a || !b) return null;
        const wc = WIN.get(pairKey(a, b));
        return wc ? (canon(a) === wc ? a : b) : null;
      }
      return null;                            // 3rd-place slots filled via sibling below
    }
    function resolveFixture(m) {
      let a = resolveSlot(m.t1, 0), b = resolveSlot(m.t2, 0);
      if (a && !b && /^3/.test(m.t2)) { const o = OPP.get(canon(a)); if (o && !isPlaceholderTeam(o)) b = o; }
      if (b && !a && /^3/.test(m.t1)) { const o = OPP.get(canon(b)); if (o && !isPlaceholderTeam(o)) a = o; }
      return [a, b];
    }
    return { resolveSlot, resolveFixture };
  }

  global.WC = { strip, ALIAS, canon, same, pairKey, esc, competitors, buildMatchMap, orient, outcome, isPlaceholderTeam, isSlot, makeBracket };
})(typeof window !== 'undefined' ? window : globalThis);
