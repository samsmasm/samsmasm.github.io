'use strict';

// ---------------------------------------------------------------------------
// Team-name normalisation. CSV spellings and ESPN spellings differ; collapse
// both to a canonical key so comparisons are reliable.
// ---------------------------------------------------------------------------
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
function canon(name) {
  const s = strip(name);
  return ALIAS[s] || s;
}
const same = (a, b) => canon(a) === canon(b);

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

function competitors(ev) {
  const c = ev.competitions && ev.competitions[0];
  if (!c) return null;
  const home = c.competitors.find(x => x.homeAway === 'home') || c.competitors[0];
  const away = c.competitors.find(x => x.homeAway === 'away') || c.competitors[1];
  return {
    note: c.altGameNote || '',
    state: c.status && c.status.type && c.status.type.state, // pre | in | post
    completed: !!(c.status && c.status.type && c.status.type.completed),
    home: home.team.displayName, hs: parseInt(home.score, 10),
    away: away.team.displayName, as: parseInt(away.score, 10),
  };
}

function buildResults(events, standings, ov) {
  ov = ov || {};
  const parsed = events.map(competitors).filter(Boolean);

  // --- group-stage match results, keyed by canonical "home|away" (order-free) ---
  const matchKey = (a, b) => [canon(a), canon(b)].sort().join('|');
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
    if (Array.isArray(o)) { [hs, as] = o; }
    else {
      const m = matches.get(matchKey(fx.home, fx.away));
      if (!m) return null;
      hs = m.hs; as = m.as;
    }
    if (hs > as) return 'home';
    if (as > hs) return 'away';
    return 'draw';
  }

  // --- group winners from standings (entries[0] = leader), only when group complete ---
  const groupWinners = {}; // letter -> team name | undefined
  if (standings && standings.children) {
    for (const child of standings.children) {
      const g = (child.name.match(/group\s+([a-l])/i) || [])[1];
      if (!g) continue;
      const L = g.toUpperCase();
      const entries = (child.standings && child.standings.entries) || [];
      if (entries.length && groupDone[L] >= 6) groupWinners[L] = entries[0].team.displayName;
    }
  }
  if (ov.groupWinners) for (const g of Object.keys(ov.groupWinners)) groupWinners[g] = ov.groupWinners[g];

  // --- knockout round membership (set of teams that reached each round) ---
  const rounds = { r32: new Set(), r16: new Set(), qf: new Set(), sf: new Set(), final: new Set() };
  let champion = null, thirdWinner = null;
  // R32 qualifiers come from the standings advance/best-8 flags, but those are
  // provisional mid-tournament. Only trust them once EVERY group is complete
  // (all 12 groups x 6 matches), per the agreed "locks at end of group stage" rule.
  const groupStageComplete = Object.values(groupDone).filter(n => n >= 6).length === 12;
  if (groupStageComplete && standings && standings.children) {
    for (const child of standings.children) {
      for (const e of ((child.standings && child.standings.entries) || [])) {
        const d = (e.note && e.note.description || '').toLowerCase();
        if (d.includes('advance') || d.includes('best')) rounds.r32.add(canon(e.team.displayName));
      }
    }
  }
  // From knockout fixtures: participants of a round reached that round; final winner = champion.
  for (const m of parsed) {
    const rd = classifyRound(m.note);
    if (!rd) continue;
    if (rd === 'third') { if (m.completed) thirdWinner = m.hs > m.as ? m.home : m.away; continue; }
    rounds[rd].add(canon(m.home)); rounds[rd].add(canon(m.away));
    if (rd === 'final' && m.completed) champion = m.hs > m.as ? m.home : m.away;
  }
  // Overrides for rounds / champion / third place.
  if (ov.rounds) for (const rd of Object.keys(rounds)) {
    if (Array.isArray(ov.rounds[rd])) rounds[rd] = new Set(ov.rounds[rd].map(canon));
  }
  if (ov.champion) champion = ov.champion;
  if (ov.thirdPlaceWinner) thirdWinner = ov.thirdPlaceWinner;
  const finalScore = ov.finalScore || null;

  return { fixtureOutcome, groupWinners, groupDone, rounds, champion, thirdWinner, finalScore };
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

  for (const rd of ['r32', 'r16', 'qf', 'sf', 'final']) {
    const set = R.rounds[rd];
    const resolved = set.size > 0;
    const picks = p[rd].map(team => {
      const ok = set.has(canon(team));
      return { team, status: resolved ? (ok ? 'correct' : 'wrong') : 'pending', pts: ok ? ROUND_PTS[rd] : 0 };
    });
    const pts = resolved ? picks.reduce((s, x) => s + x.pts, 0) : 0;
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
const pill = (txt, cls) => `<span class="pill ${cls}">${txt}</span>`;
const esc = s => (s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function detailHTML(d, p) {
  const matchRows = d.matches.map(m =>
    `<div class="d-row ${m.status}"><span class="d-fx">${esc(m.fx.home)} v ${esc(m.fx.away)}${m.doubled ? ' <b class="dbl">2×</b>' : ''}</span>`
    + `<span class="d-pick">picked ${esc(m.pick) || '-'}</span>`
    + `<span class="d-pts">${m.status === 'pending' ? '·' : '+' + m.pts}</span></div>`).join('');

  const gwRows = d.groupWinners.map(g =>
    `<div class="d-row ${g.status}"><span class="d-fx">Group ${g.group} winner${g.doubled ? ' <b class="dbl">2×</b>' : ''}</span>`
    + `<span class="d-pick">picked ${esc(g.pick) || '-'}${g.winner ? ' · actual ' + esc(g.winner) : ''}</span>`
    + `<span class="d-pts">${g.status === 'pending' ? '·' : '+' + g.pts}</span></div>`).join('');

  const roundNames = { r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarterfinals', sf: 'Semifinals', final: 'Final' };
  const roundBlocks = ['r32', 'r16', 'qf', 'sf', 'final'].map(rd => {
    const r = d.rounds[rd];
    const chips = r.picks.map(x => `<span class="chip ${x.status}">${esc(x.team)}</span>`).join('');
    return `<div class="d-round"><div class="d-round-h">${roundNames[rd]} <small>(${r.per}pt each)</small>`
      + `<span class="d-pts">${r.resolved ? '+' + r.pts : 'pending'}</span></div><div class="chips">${chips}</div></div>`;
  }).join('');

  const specRows = d.special.map(s =>
    `<div class="d-row ${s.status}"><span class="d-fx">${s.label}</span>`
    + `<span class="d-pick">picked ${esc(s.pick)}${s.actual && s.actual !== '-' ? ' · actual ' + esc(s.actual) : ''}</span>`
    + `<span class="d-pts">${s.tiebreak ? '' : (s.status === 'pending' ? '·' : '+' + s.pts)}</span></div>`).join('');

  return `<div class="detail">
    <div class="d-sec"><h4>Group matches</h4>${matchRows}</div>
    <div class="d-sec"><h4>Group winners</h4>${gwRows}</div>
    <div class="d-sec"><h4>Knockout progression</h4>${roundBlocks}</div>
    <div class="d-sec"><h4>Finals</h4>${specRows}</div>
  </div>`;
}

function render(scored, meta) {
  const tbody = document.getElementById('board');
  tbody.innerHTML = '';
  scored.forEach((s, i) => {
    const rank = i + 1;
    const tr = document.createElement('tr');
    tr.className = 'row';
    tr.innerHTML = `<td class="rank">${rank}</td><td class="name">${esc(s.p.name)}`
      + `${s.tiebreak ? ' <span class="tb" title="Correct final score (tiebreak)">★</span>' : ''}</td>`
      + `<td class="pts">${s.total}</td><td class="exp">▸</td>`;
    const det = document.createElement('tr');
    det.className = 'detail-row';
    det.style.display = 'none';
    det.innerHTML = `<td colspan="4"></td>`;
    tr.addEventListener('click', () => {
      const open = det.style.display !== 'none';
      if (!open && !det.dataset.built) {
        det.firstChild.innerHTML = detailHTML(s.detail, s.p);
        det.dataset.built = '1';
      }
      det.style.display = open ? 'none' : 'table-row';
      tr.querySelector('.exp').textContent = open ? '▸' : '▾';
    });
    tbody.appendChild(tr);
    tbody.appendChild(det);
  });
  document.getElementById('meta').textContent = meta;
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
    status.style.display = 'none';
  } catch (e) {
    status.textContent = 'Could not load live scores (' + e.message + '). The leaderboard needs an internet connection to ESPN.';
    status.className = 'status err';
  }
}

document.getElementById('refresh').addEventListener('click', () => main(true));
main();
