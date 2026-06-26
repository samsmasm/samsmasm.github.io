'use strict';
// Cross-check wc26/data.js (built from scheduleall.csv) against ESPN's fixtures.
// Reports: (1) internal slot-code structure problems, (2) team mismatches vs ESPN
// (serious), (3) kickoff-time / venue discrepancies vs ESPN (minor).
const fs = require('fs');
global.window = global;
eval(fs.readFileSync(__dirname + '/wc-core.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/data.js', 'utf8'));
const { canon, pairKey, isPlaceholderTeam } = WC;
const https = require('https');
const get = u => new Promise((res, rej) => https.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d))); }).on('error', rej));
const WINDOWS = ['20260611-20260615', '20260616-20260620', '20260621-20260627', '20260628-20260703', '20260704-20260707', '20260709-20260711', '20260714-20260715', '20260717-20260719'];

(async () => {
  const parts = await Promise.all(WINDOWS.map(w => get(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${w}&limit=300`)));
  const standings = await get('https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings');
  const evs = [];
  for (const p of parts) for (const ev of (p.events || [])) {
    const c = ev.competitions && ev.competitions[0]; if (!c || (c.competitors || []).length !== 2) continue;
    const t = c.competitors.map(x => x.team.displayName);
    evs.push({ ts: Date.parse(ev.date), venue: (c.venue && c.venue.fullName) || '', note: c.altGameNote || '',
      teams: t, real: t.filter(n => !isPlaceholderTeam(n)).map(canon) });
  }
  // group positions
  const POS = {};
  for (const ch of (standings.children || [])) {
    const g = (ch.name.match(/group ([a-l])/i) || [])[1]; if (!g) continue;
    const ents = (ch.standings && ch.standings.entries) || [];
    const stat = (e, n) => { const s = (e.stats || []).find(x => x.name === n); return s ? s.value : undefined; };
    if (!ents.length || !ents.every(e => (stat(e, 'gamesPlayed') || 0) >= 3)) continue;
    const ord = [...ents].sort((a, b) => (stat(a, 'rank') ?? 99) - (stat(b, 'rank') ?? 99));
    POS['1' + g.toUpperCase()] = ord[0].team.displayName;
    POS['2' + g.toUpperCase()] = ord[1].team.displayName;
  }

  const sched = window.WC_SCHEDULE;
  const groupRows = sched.filter(m => /^Group/.test(m.stage));
  const koRows = sched.filter(m => !/^Group/.test(m.stage));
  const isGroupSlot = s => /^[12][A-L]$/.test(s);
  const problems = [], times = [];

  // (1) internal structure ------------------------------------------------------
  console.log('=== (1) Internal slot-code structure ===');
  const r32 = sched.filter(m => m.stage === 'Round of 32');
  const gslots = [];
  r32.forEach(m => [m.t1, m.t2].forEach(t => { if (isGroupSlot(t)) gslots.push(t); }));
  const want = []; 'ABCDEFGHIJKL'.split('').forEach(g => want.push('1' + g, '2' + g));
  const counts = {}; gslots.forEach(s => counts[s] = (counts[s] || 0) + 1);
  const missing = want.filter(w => !counts[w]);
  const dup = Object.entries(counts).filter(([, n]) => n > 1);
  console.log('  R32 group slots present:', gslots.length, '/24', '| missing:', missing.length ? missing.join(',') : 'none', '| duplicated:', dup.length ? dup.map(([k, n]) => `${k}x${n}`).join(',') : 'none');
  const thirds = []; r32.forEach(m => [m.t1, m.t2].forEach(t => { if (/^3[A-L]+$/.test(t)) thirds.push(t); }));
  console.log('  R32 third-place slots:', thirds.length, '/8', thirds.length === 8 ? 'OK' : '!! expected 8');
  // winner-slot references chain correctly: each round consumes the previous round's matches exactly once
  const rounds = [['Round of 16', 'Round of 32'], ['Quarterfinals', 'Round of 16'], ['Semifinals', 'Quarterfinals'], ['Final', 'Semifinals'], ['Third Place', 'Semifinals']];
  for (const [round, prev] of rounds) {
    const rows = sched.filter(m => m.stage === round); if (!rows.length) continue;
    const prevNos = new Set(sched.filter(m => m.stage === prev).map(m => m.no));
    const refs = [];
    rows.forEach(m => [m.t1, m.t2].forEach(t => { const w = /^[WL](\d+)$/.exec(t); if (w) refs.push(+w[1]); }));
    const bad = refs.filter(n => !prevNos.has(n));
    const rc = {}; refs.forEach(n => rc[n] = (rc[n] || 0) + 1);
    const dupRefs = Object.entries(rc).filter(([, n]) => n > 1 && round !== 'Final' && round !== 'Third Place');
    console.log(`  ${round}: ${refs.length} refs -> ${prev}`, bad.length ? `!! invalid refs: ${bad.join(',')}` : 'all valid', dupRefs.length ? `!! dup refs: ${dupRefs.map(([k]) => k)}` : '');
  }

  // helper: nearest ESPN event by time
  const nearest = (ts, pool) => pool.reduce((best, e) => Math.abs(e.ts - ts) < Math.abs((best ? best.ts : -1e15) - ts) ? e : best, null);

  // (2) group-stage matchups vs ESPN -------------------------------------------
  console.log('\n=== (2) Group-stage matchups vs ESPN ===');
  const espnByPair = new Map();
  evs.filter(e => /group/i.test(e.note) && e.real.length === 2).forEach(e => espnByPair.set(e.real.slice().sort().join('|'), e));
  let gOk = 0;
  for (const m of groupRows) {
    const key = [canon(m.t1), canon(m.t2)].sort().join('|');
    const e = espnByPair.get(key);
    if (!e) { problems.push(`GROUP ${m.no} ${m.t1} v ${m.t2}: pairing not found in ESPN`); continue; }
    gOk++;
    if (Math.abs(e.ts - m.ts) > 60000) times.push(`GROUP ${m.no} ${m.t1} v ${m.t2}: our ${new Date(m.ts).toISOString()} vs ESPN ${new Date(e.ts).toISOString()}`);
  }
  console.log(`  ${gOk}/${groupRows.length} group matchups confirmed against ESPN`);

  // (3) knockout: resolved slots must agree with ESPN fixture at that time ------
  console.log('\n=== (3) Knockout slots vs ESPN (where resolvable) ===');
  const koEvents = evs.filter(e => /round of|quarter|semi|final/i.test(e.note));
  let koChecked = 0;
  for (const m of koRows) {
    const mine = [m.t1, m.t2].map(t => isGroupSlot(t) ? POS[t] : null).filter(Boolean).map(canon);
    if (!mine.length) continue; // nothing resolvable yet
    const e = nearest(m.ts, koEvents);
    if (!e) continue;
    koChecked++;
    const espnSet = new Set(e.real);
    const offenders = mine.filter(t => !espnSet.has(t));
    if (offenders.length) {
      problems.push(`KO ${m.no} (${m.stage}) ${m.t1} v ${m.t2}: our resolved [${offenders.join(',')}] not in ESPN fixture [${e.teams.join(', ')}] @ ${new Date(e.ts).toISOString()}`);
    }
    if (Math.abs(e.ts - m.ts) > 60000) times.push(`KO ${m.no} ${m.t1} v ${m.t2}: our ${new Date(m.ts).toISOString()} vs ESPN ${new Date(e.ts).toISOString()}`);
  }
  console.log(`  ${koChecked} knockout matches had at least one resolvable slot to check`);

  // report ----------------------------------------------------------------------
  console.log('\n=== SERIOUS PROBLEMS (team/matchup mismatches) ===');
  console.log(problems.length ? problems.map(p => '  !! ' + p).join('\n') : '  none ✓');
  console.log('\n=== KICKOFF-TIME / minor discrepancies (ESPN may have rescheduled) ===');
  console.log(times.length ? times.map(t => '  ~ ' + t).join('\n') : '  none ✓');
})();
