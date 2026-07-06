'use strict';

// Team-name normalisation and result orientation live in wc-core.js (window.WC)
// so this page and the schedule page resolve results identically. wc-core.js
// MUST be loaded before this script.
const { canon, same, pairKey, esc, competitors, orient, isPlaceholderTeam } = WC;

// ---------------------------------------------------------------------------
// ESPN endpoints
// ---------------------------------------------------------------------------
const BASE = 'https://site.api.espn.com/apis';
// Date windows spanning the whole tournament. Past windows return fully;
// future windows return little until those matches are played.
const DATE_WINDOWS = [
  '20260611-20260615', '20260616-20260620', '20260621-20260627', // group stage
  '20260628-20260703', // Round of 32
  '20260704-20260707', // Round of 16
  '20260709-20260711', // Quarterfinals
  '20260714-20260715', // Semifinals
  '20260717-20260719', // Third place + Final
];

async function getJSON(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(url + ' -> ' + r.status);
  return r.json();
}

async function fetchEvents() {
  const all = new Map();
  const results = await Promise.allSettled(
    DATE_WINDOWS.map(w => getJSON(`${BASE}/site/v2/sports/soccer/fifa.world/scoreboard?dates=${w}&limit=300`))
  );
  for (const res of results) {
    if (res.status !== 'fulfilled') continue;
    for (const ev of (res.value.events || [])) all.set(ev.id, ev);
  }
  return [...all.values()];
}

async function fetchStandings() {
  try { return await getJSON(`${BASE}/v2/sports/soccer/fifa.world/standings`); }
  catch { return null; }
}

async function fetchOverrides() {
  try { return await getJSON('overrides.json?ts=' + Date.now()); }
  catch { return {}; }
}

// ---------------------------------------------------------------------------
// Build a results model from ESPN data, then layer overrides on top.
// ---------------------------------------------------------------------------
const ROUND_PTS = { r32: 1, r16: 1, qf: 2, sf: 3, final: 4 };

function classifyRound(note) {
  const n = (note || '').toLowerCase();
  if (n.includes('round of 32')) return 'r32';
  if (n.includes('round of 16')) return 'r16';
  if (n.includes('quarter')) return 'qf';
  if (n.includes('semi')) return 'sf';
  if (n.includes('third') || n.includes('3rd')) return 'third';
  if (n.includes('final')) return 'final'; // after the more specific checks above
  return null;
}

function buildResults(events, standings, ov) {
  ov = ov || {};
  const parsed = events.map(competitors).filter(Boolean);

  // --- group-stage match results, keyed by canonical pair (order-free) ---
  const matchKey = pairKey;
  const matches = new Map(); // key -> {hs,as,home,away,completed}
  const groupDone = {};      // group letter -> completed match count
  for (const m of parsed) {
    if (m.note.toLowerCase().includes('group')) {
      const g = (m.note.match(/group\s+([a-l])/i) || [])[1];
      if (g && m.completed) groupDone[g.toUpperCase()] = (groupDone[g.toUpperCase()] || 0) + 1;
    }
    if (m.completed && !Number.isNaN(m.hs) && !Number.isNaN(m.as)) {
      matches.set(matchKey(m.home, m.away), m);
    }
  }

  // outcome for a predicted fixture: 'home' | 'away' | 'draw' | null(pending)
  function fixtureOutcome(fx) {
    const o = ov.matches && ov.matches[`${fx.home}|${fx.away}`];
    let hs, as;
    if (Array.isArray(o)) {
      // Override is authored in fixture order: [home goals, away goals].
      [hs, as] = o;
    } else {
      // Read the live score oriented to fx.home (the order-free key means
      // ESPN's home/away may be reversed). orient() is the only sanctioned read.
      const res = orient(fx.home, fx.away, matches.get(matchKey(fx.home, fx.away)));
      if (!res) return null;
      hs = res.a; as = res.b;
    }
    if (hs > as) return 'home';
    if (as > hs) return 'away';
    return 'draw';
  }

  // --- group winners from standings (the rank-1 team), only when group complete ---
  // ESPN does NOT return entries in rank order, so the winner is the entry whose
  // 'rank' stat is 1, NOT entries[0] (which ESPN orders some other way). Reading
  // entries[0] silently credited the wrong team (e.g. Canada over group B's real
  // winner Switzerland). wc-core's makeBracket already sorts by rank; match it.
  const rankOf = e => { const s = (e.stats || []).find(x => x.name === 'rank'); return s ? s.value : 99; };
  const groupWinners = {}; // letter -> team name | undefined
  if (standings && standings.children) {
    for (const child of standings.children) {
      const g = (child.name.match(/group\s+([a-l])/i) || [])[1];
      if (!g) continue;
      const L = g.toUpperCase();
      const entries = (child.standings && child.standings.entries) || [];
      if (entries.length && groupDone[L] >= 6) {
        groupWinners[L] = [...entries].sort((a, b) => rankOf(a) - rankOf(b))[0].team.displayName;
      }
    }
  }
  if (ov.groupWinners) for (const g of Object.keys(ov.groupWinners)) groupWinners[g] = ov.groupWinners[g];

  // --- knockout round membership (set of teams that reached each round) ---
  const rounds = { r32: new Set(), r16: new Set(), qf: new Set(), sf: new Set(), final: new Set() };
  // Teams knocked out of a completed knockout match — used to mark a pick "wrong"
  // for a later round the moment their exit is known, rather than waiting for
  // every slot in that round to be filled (see per-pick scoring below).
  const eliminated = new Set();
  let champion = null, thirdWinner = null;
  // R32 membership comes solely from the published R32 fixtures (loop below). We
  // deliberately do NOT use the standings "advance/best" notes: ESPN tags ALL 12
  // third-placed teams as best-third candidates (24 + 12 = 36) even though only 8
  // actually go through, which over-counted the round. The knockout fixtures name
  // the real 32 once the bracket is drawn; before then R32 simply stays pending.
  // From knockout fixtures: participants of a round reached that round; final winner = champion.
  // ESPN lists future bracket fixtures with placeholder slots ("Group I Winner",
  // "Third Place Group A/B/C/D/F", ...); skip those so a round is only counted
  // once it holds real, determined teams.
  for (const m of parsed) {
    const rd = classifyRound(m.note);
    if (!rd) continue;
    if (rd === 'third') { if (m.completed) thirdWinner = m.hs > m.as ? m.home : m.away; continue; }
    if (!isPlaceholderTeam(m.home)) rounds[rd].add(canon(m.home));
    if (!isPlaceholderTeam(m.away)) rounds[rd].add(canon(m.away));
    if (rd === 'final' && m.completed) champion = m.hs > m.as ? m.home : m.away;
    if (m.completed && !isPlaceholderTeam(m.home) && !isPlaceholderTeam(m.away) && m.hs !== m.as) {
      eliminated.add(canon(m.hs > m.as ? m.away : m.home));
    }
  }
  // Overrides for rounds / champion / third place.
  if (ov.rounds) for (const rd of Object.keys(rounds)) {
    if (Array.isArray(ov.rounds[rd])) rounds[rd] = new Set(ov.rounds[rd].map(canon));
  }
  if (ov.champion) champion = ov.champion;
  if (ov.thirdPlaceWinner) thirdWinner = ov.thirdPlaceWinner;
  const finalScore = ov.finalScore || null;

  return { fixtureOutcome, groupWinners, groupDone, rounds, eliminated, champion, thirdWinner, finalScore };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------
function pickedOutcome(pick, fx) {
  if (/draw/i.test(pick)) return 'draw';
  if (same(pick, fx.home)) return 'home';
  if (same(pick, fx.away)) return 'away';
  return null; // unrecognised pick
}

function scorePlayer(p, R, fixtures) {
  const detail = { matches: [], groupWinners: [], rounds: {}, special: [] };
  let total = 0;

  for (const fx of fixtures) {
    const mult = p.doubleGroup === fx.group ? 2 : 1;
    const actual = R.fixtureOutcome(fx);
    const pred = pickedOutcome(p.matchPicks[fx.id], fx);
    let pts = 0, status = 'pending';
    if (actual) {
      const ok = pred === actual;
      pts = ok ? 1 * mult : 0;
      status = ok ? 'correct' : 'wrong';
      total += pts;
    }
    detail.matches.push({ fx, pick: p.matchPicks[fx.id], actual, status, pts, doubled: mult === 2 });
  }

  for (const g of Object.keys(p.groupWinnerPicks)) {
    const mult = p.doubleGroup === g ? 2 : 1;
    const winner = R.groupWinners[g];
    const pick = p.groupWinnerPicks[g];
    let pts = 0, status = 'pending';
    if (winner) {
      const ok = same(pick, winner);
      pts = ok ? 2 * mult : 0;
      status = ok ? 'correct' : 'wrong';
      total += pts;
    }
    detail.groupWinners.push({ group: g, pick, winner, status, pts, doubled: mult === 2 });
  }

  detail.groupPts = detail.matches.reduce((s, x) => s + x.pts, 0)
    + detail.groupWinners.reduce((s, x) => s + x.pts, 0);

  for (const rd of ['r32', 'r16', 'qf', 'sf', 'final']) {
    const set = R.rounds[rd];
    // Score each pick as soon as its own fate is known, rather than waiting for
    // every slot in the round to be filled: a picked team already named in the
    // round's real bracket is correct now; one already eliminated in an earlier
    // round is wrong now; anything else is still pending.
    const picks = p[rd].map(team => {
      const c = canon(team);
      const known = set.has(c);
      const out = R.eliminated.has(c);
      const status = known ? 'correct' : out ? 'wrong' : 'pending';
      return { team, status, pts: known ? ROUND_PTS[rd] : 0 };
    });
    // Gate the cell display on the round itself having started (at least one
    // real team confirmed in it), not on whether a pick merely got eliminated
    // earlier — otherwise everyone shows a hollow "+0" for SF/Final the moment
    // one QF loser is known, before any team has actually reached that round.
    const resolved = set.size > 0;
    const pts = picks.reduce((s, x) => s + x.pts, 0);
    total += pts;
    detail.rounds[rd] = { picks, pts, resolved, per: ROUND_PTS[rd] };
  }

  // Specials
  const champOk = R.champion && same(p.champion, R.champion);
  if (R.champion) total += champOk ? 10 : 0;
  detail.special.push({ label: 'Champion (10)', pick: p.champion, actual: R.champion,
    status: R.champion ? (champOk ? 'correct' : 'wrong') : 'pending', pts: champOk ? 10 : 0 });

  const thirdOk = R.thirdWinner && same(p.thirdPlace, R.thirdWinner);
  if (R.thirdWinner) total += thirdOk ? 5 : 0;
  detail.special.push({ label: '3rd-place playoff (5)', pick: p.thirdPlace, actual: R.thirdWinner,
    status: R.thirdWinner ? (thirdOk ? 'correct' : 'wrong') : 'pending', pts: thirdOk ? 5 : 0 });

  // Final-score: tiebreaker only (not added to total).
  const fsNorm = s => (s || '').replace(/[^0-9]/g, '').slice(0, 2);
  const finalScoreOk = R.finalScore && fsNorm(p.finalScore) === fsNorm(R.finalScore) && fsNorm(p.finalScore).length === 2;
  detail.special.push({ label: 'Final score (tiebreak)', pick: p.finalScore || '-', actual: R.finalScore || '-',
    status: R.finalScore ? (finalScoreOk ? 'correct' : 'wrong') : 'pending', pts: 0, tiebreak: true });

  return { total, tiebreak: finalScoreOk ? 1 : 0, detail };
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
// Three-letter team codes for the grid (keyed by canonical name). Falls back to
// the first three letters for anything unmapped.
const CODES = {
  mexico: 'MEX', southafrica: 'RSA', southkorea: 'KOR', czechia: 'CZE', canada: 'CAN', qatar: 'QAT',
  bosnia: 'BIH', switzerland: 'SUI', brazil: 'BRA', scotland: 'SCO', morocco: 'MAR', haiti: 'HAI',
  unitedstates: 'USA', paraguay: 'PAR', australia: 'AUS', turkiye: 'TUR', germany: 'GER', ivorycoast: 'CIV',
  curacao: 'CUW', ecuador: 'ECU', netherlands: 'NED', tunisia: 'TUN', japan: 'JPN', sweden: 'SWE',
  belgium: 'BEL', egypt: 'EGY', iran: 'IRN', newzealand: 'NZL', spain: 'ESP', saudiarabia: 'KSA',
  capeverde: 'CPV', uruguay: 'URU', france: 'FRA', norway: 'NOR', senegal: 'SEN', iraq: 'IRQ',
  argentina: 'ARG', algeria: 'ALG', austria: 'AUT', jordan: 'JOR', portugal: 'POR', uzbekistan: 'UZB',
  drcongo: 'COD', colombia: 'COL', england: 'ENG', panama: 'PAN', croatia: 'CRO', ghana: 'GHA',
};
function abbr(name) {
  if (!name) return '–';
  if (/draw/i.test(name)) return 'DRW';
  return CODES[canon(name)] || name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || '–';
}
const cell = (text, status, extra, title) =>
  `<td class="mx ${status} ${extra || ''}" title="${esc(title)}">${text}</td>`;

// Simple ranked list (names + points).
function renderStandings(scored) {
  const tbody = document.getElementById('board');
  tbody.innerHTML = scored.map((s, i) =>
    `<tr class="row"><td class="rank">${i + 1}</td>`
    + `<td class="name">${esc(s.p.name)}${s.tiebreak ? ' <span class="tb" title="Correct final score (tiebreak)">★</span>' : ''}</td>`
    + `<td class="pts">${s.total}</td></tr>`).join('');
}

// Wide colour-coded grid: every player against every pick (like the entry CSV).
const GROUPS = 'ABCDEFGHIJKL'.split('');
const ROUND_LABEL = { r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarterfinals', sf: 'Semifinals', final: 'Final' };

function renderMatrix(scored) {
  if (!scored.length) return;

  // Header (single sticky row). Matchups read off any player's fixtures.
  const fxByGroup = {};
  scored[0].detail.matches.forEach(m => (fxByGroup[m.fx.group] = fxByGroup[m.fx.group] || []).push(m.fx));
  let head = '<th class="cName gstart">Player</th><th class="cPts">Pts</th>';
  for (const g of GROUPS) {
    (fxByGroup[g] || []).forEach((fx, idx) => {
      head += `<th class="${idx === 0 ? 'gstart' : ''}" title="Group ${g}: ${esc(fx.home)} v ${esc(fx.away)}">${abbr(fx.home)}·${abbr(fx.away)}</th>`;
    });
    head += `<th title="Group ${g} winner">🏆${g}</th>`;
  }
  head += '<th class="gstart" title="Double-points group">2×</th>';
  head += '<th class="gstart" title="Total group-stage points (all matches + group winner bonuses, doubled group included)">Grp</th>';
  ['r32', 'r16', 'qf', 'sf', 'final'].forEach((rd, i) =>
    head += `<th class="${i === 0 ? 'gstart' : ''}" title="${ROUND_LABEL[rd]} progression (points earned)">${rd === 'final' ? 'Fin' : rd.toUpperCase()}</th>`);
  head += '<th class="gstart" title="3rd-place playoff winner (5)">3rd</th>'
    + '<th title="Champion (10)">Champ</th><th title="Final score (tiebreak)">Score</th>';

  const rows = scored.map(s => {
    const d = s.detail, p = s.p;
    const mByG = {}; d.matches.forEach(m => (mByG[m.fx.group] = mByG[m.fx.group] || []).push(m));
    const wByG = {}; d.groupWinners.forEach(w => (wByG[w.group] = w));
    let r = `<td class="cName gstart">${esc(p.name)}${s.tiebreak ? ' <span class="tb">★</span>' : ''}</td>`
      + `<td class="cPts">${s.total}</td>`;
    for (const g of GROUPS) {
      (mByG[g] || []).forEach((m, idx) =>
        r += cell(abbr(m.pick), m.status, (idx === 0 ? 'gstart ' : '') + (m.doubled ? 'dbl' : ''),
          `${m.pick || '-'} · ${m.fx.home} v ${m.fx.away}`));
      const w = wByG[g];
      r += cell(abbr(w.pick), w.status, w.doubled ? 'dbl' : '',
        `Group ${g} winner: ${w.pick || '-'}${w.winner ? ' · actual ' + w.winner : ''}`);
    }
    r += cell(p.doubleGroup || '–', 'none', 'dblcol gstart', `Double-points group: ${p.doubleGroup || 'none'}`);
    r += cell(String(d.groupPts), 'none', 'gstart', `Group stage total: ${d.groupPts} pts`);
    ['r32', 'r16', 'qf', 'sf', 'final'].forEach((rd, i) => {
      const rr = d.rounds[rd];
      const correct = rr.picks.filter(x => x.status === 'correct').length;
      const known = rr.picks.filter(x => x.status !== 'pending').length;
      const cls = rr.resolved ? (correct > 0 ? 'correct' : 'wrong') : 'pending';
      const tip = `${ROUND_LABEL[rd]}: ${rr.resolved ? correct + '/' + known + ' known so far correct' : 'not resolved'} · `
        + rr.picks.map(x => (x.status === 'correct' ? '✓' : x.status === 'wrong' ? '✗' : '·') + abbr(x.team)).join(' ');
      r += cell(rr.resolved ? '+' + rr.pts : '·', cls, i === 0 ? 'gstart' : '', tip);
    });
    const champ = d.special[0], third = d.special[1], score = d.special[2];
    r += cell(abbr(third.pick), third.status, 'gstart',
      `3rd place: ${third.pick || '-'}${third.actual && third.actual !== '-' ? ' · actual ' + third.actual : ''}`);
    r += cell(abbr(champ.pick), champ.status, '',
      `Champion: ${champ.pick || '-'}${champ.actual && champ.actual !== '-' ? ' · actual ' + champ.actual : ''}`);
    r += cell(esc(score.pick || '–'), score.status, '',
      `Final score: ${score.pick || '-'}${score.actual && score.actual !== '-' ? ' · actual ' + score.actual : ''}`);
    return `<tr>${r}</tr>`;
  }).join('');

  document.getElementById('matrix').innerHTML = `<thead><tr>${head}</tr></thead><tbody>${rows}</tbody>`;
}

function render(scored, meta) {
  renderStandings(scored);
  renderMatrix(scored);
  document.getElementById('meta').textContent = meta;
}

// ---------------------------------------------------------------------------
// Upcoming games (from window.WC_SCHEDULE). The full schedule lives on its own
// page (schedule.html / schedule.js); this page only shows the next two ours.
// ---------------------------------------------------------------------------
function relTime(ts, now) {
  let s = Math.floor((ts - now) / 1000);
  if (s <= 0) return 'now';
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60);
  if (d > 0) return `in ${d}d ${h}h`;
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

// Resolve a knockout slot to a real team name where known, else show the code
// (e.g. "2A"). Built from standings + ESPN bracket via the shared resolver.
let BRACKET = { resolveFixture: m => [null, null] };

function renderUpcoming(now) {
  const el = document.getElementById('upcoming');
  if (!el) return;
  const WINDOW = 2 * 60 * 60 * 1000; // keep a just-kicked-off game visible (~match length)
  const next = (window.WC_SCHEDULE || []).filter(m => m.ours && m.ts && m.ts > now - WINDOW).slice(0, 2);
  if (!next.length) { el.innerHTML = '<div class="up-empty">No more of our games scheduled.</div>'; return; }
  el.innerHTML = next.map(m => {
    const started = m.ts <= now;
    let rel;
    if (started) {
      const mins = Math.max(0, Math.floor((now - m.ts) / 60000));
      rel = `Started ${mins} minute${mins === 1 ? '' : 's'} ago`;
    } else {
      rel = relTime(m.ts, now);
    }
    const [a, b] = BRACKET.resolveFixture(m); // knockout rows carry slot codes (2A, W73)
    return `<div class="up-card${started ? ' started' : ''}">
        <div class="up-teams">${esc(a || m.t1)} <span class="up-v">vs</span> ${esc(b || m.t2)}</div>
        <div class="up-rel">${rel}</div>
      </div>`;
  }).join('');
}

// Short per-browser cache of the (large) ESPN payloads, so rapid re-refreshes
// by the same person don't re-hit ESPN, while keeping worst-case staleness to a
// couple of minutes. The "Refresh now" button bypasses it for instant results
// (e.g. the moment a final ends), and the visible timestamp exposes any lag.
// Overrides are never cached.
const CACHE_KEY = 'wc26-espn', CACHE_TTL = 3 * 60 * 1000;
async function getEspn(force) {
  if (!force) {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (c && Date.now() - c.ts < CACHE_TTL) return { ...c, cached: true };
    } catch { /* ignore */ }
  }
  const [events, standings] = await Promise.all([fetchEvents(), fetchStandings()]);
  const payload = { events, standings, ts: Date.now() };
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(payload)); } catch { /* quota */ }
  return { ...payload, cached: false };
}

async function main(force) {
  const status = document.getElementById('status');
  try {
    status.style.display = '';
    status.className = 'status';
    status.textContent = 'Loading live scores…';
    const [{ events, standings, ts, cached }, ov] = await Promise.all([getEspn(force), fetchOverrides()]);
    const R = buildResults(events, standings, ov);
    const fixtures = window.WC_FIXTURES;
    const scored = window.WC_PLAYERS.map(p => ({ p, ...scorePlayer(p, R, fixtures) }));
    scored.sort((a, b) => b.total - a.total || b.tiebreak - a.tiebreak || a.p.name.localeCompare(b.p.name));

    const finishedMatches = fixtures.filter(fx => R.fixtureOutcome(fx)).length;
    const decidedGroups = Object.keys(R.groupWinners).length;
    const when = new Date(ts).toLocaleString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
    render(scored, `${finishedMatches}/${fixtures.length} group matches scored · ${decidedGroups}/12 groups decided · Last updated ${when} Vietnam time${cached ? ' (cached)' : ''}`);

    // Upcoming games (refresh alongside the leaderboard). Resolve knockout slot
    // codes to real teams the same way the schedule page does.
    BRACKET = WC.makeBracket(standings, events, window.WC_SCHEDULE);
    renderUpcoming(Date.now());

    status.style.display = 'none';
  } catch (e) {
    status.textContent = 'Could not load live scores (' + e.message + '). The leaderboard needs an internet connection to ESPN.';
    status.className = 'status err';
  }
}

document.getElementById('refresh').addEventListener('click', () => main(true));

// Mobile-friendly pick detail: touch devices don't reliably surface the
// `title` attribute on tap, so tapping a matrix cell shows the same text in a
// small popover instead. Delegated on `document` (not `#matrix`, which gets
// its innerHTML replaced on every refresh) so it only needs binding once.
const tipPop = document.createElement('div');
tipPop.className = 'tip-pop';
tipPop.hidden = true;
document.body.appendChild(tipPop);

function hideTip() { tipPop.hidden = true; tipPop._cell = null; }

function showTip(td) {
  tipPop.textContent = td.getAttribute('title') || '';
  tipPop.hidden = false;
  tipPop._cell = td;
  const r = td.getBoundingClientRect();
  tipPop.style.left = '0px'; tipPop.style.top = '0px'; // reset before measuring
  const w = tipPop.offsetWidth, h = tipPop.offsetHeight;
  const left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
  const top = Math.min(Math.max(8, r.bottom + 6), window.innerHeight - h - 8);
  tipPop.style.left = `${left}px`;
  tipPop.style.top = `${top}px`;
}

document.addEventListener('click', e => {
  const td = e.target.closest('#matrix td[title]');
  if (!td) { hideTip(); return; }
  if (tipPop._cell === td && !tipPop.hidden) { hideTip(); return; }
  showTip(td);
});

main();
