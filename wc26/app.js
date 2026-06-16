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
const esc = s => (s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
    ['r32', 'r16', 'qf', 'sf', 'final'].forEach((rd, i) => {
      const rr = d.rounds[rd];
      const correct = rr.picks.filter(x => x.status === 'correct').length;
      const cls = rr.resolved ? (correct > 0 ? 'correct' : 'wrong') : 'pending';
      const tip = `${ROUND_LABEL[rd]}: ${rr.resolved ? correct + '/' + rr.picks.length + ' correct' : 'not resolved'} · `
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
// Schedule + upcoming games (from window.WC_SCHEDULE, scores from ESPN events)
// ---------------------------------------------------------------------------
const VNZ = 'Asia/Ho_Chi_Minh', ETZ = 'America/New_York';
const schedKey = m => [canon(m.t1), canon(m.t2)].sort().join('|');
const fmtVN = ts => ts ? new Date(ts).toLocaleString('en-GB', { timeZone: VNZ, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) : 'TBC';
const fmtVNTime = ts => ts ? new Date(ts).toLocaleTimeString('en-GB', { timeZone: VNZ, hour: '2-digit', minute: '2-digit', hour12: false }) : 'TBC';
const fmtETTime = ts => ts ? new Date(ts).toLocaleTimeString('en-US', { timeZone: ETZ, hour: 'numeric', minute: '2-digit', hour12: true }) : '';
const fmtVNDay = ts => ts ? new Date(ts).toLocaleDateString('en-GB', { timeZone: VNZ, weekday: 'long', day: 'numeric', month: 'long' }) : 'Date TBC';

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

// Build a lookup of played/in-progress results keyed by canonical team pair.
function buildScheduleScores(events) {
  const map = new Map();
  for (const ev of (events || [])) {
    const c = competitors(ev);
    if (!c || (c.state !== 'in' && c.state !== 'post')) continue;
    if (Number.isNaN(c.hs) || Number.isNaN(c.as)) continue;
    map.set([canon(c.home), canon(c.away)].sort().join('|'), c);
  }
  return map;
}

// Score badge for a schedule row, orienting the score to t1–t2 order.
function scoreBadge(m, scores) {
  const c = scores.get(schedKey(m));
  if (!c) return '';
  const t1Home = canon(m.t1) === canon(c.home);
  const a = t1Home ? c.hs : c.as, b = t1Home ? c.as : c.hs;
  const live = c.state === 'in';
  return `<span class="sch-score${live ? ' live' : ''}">${a}–${b}${live ? ' <b>LIVE</b>' : ''}</span>`;
}

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
    return `<div class="up-card${started ? ' started' : ''}">
        <div class="up-teams">${esc(m.t1)} <span class="up-v">vs</span> ${esc(m.t2)}</div>
        <div class="up-rel">${rel}</div>
      </div>`;
  }).join('');
}

let SCHED_NOW = Date.now(), SCHED_SCORES = new Map();

function buildScheduleBody(viewAll) {
  const list = (window.WC_SCHEDULE || []).filter(m => viewAll || m.ours);
  let lastDay = '', html = '', firstUpcomingId = '';
  list.forEach((m, i) => {
    const day = fmtVNDay(m.ts);
    if (day !== lastDay) { lastDay = day; html += `<div class="sch-day">${esc(day)} <span>VN</span></div>`; }
    const past = m.ts && m.ts < SCHED_NOW;
    if (!past && !firstUpcomingId) firstUpcomingId = `sch-${m.no}`;
    html += `<div class="sch-row${past ? ' past' : ''}${m.ours ? ' ours' : ''}" id="sch-${m.no}">
        <div class="sch-time"><b>${fmtVNTime(m.ts)}</b><small>${fmtETTime(m.ts)} ET</small></div>
        <div class="sch-match"><span class="sch-stage">${esc(m.stage)}</span>${esc(m.t1)} <span class="sch-v">v</span> ${esc(m.t2)} ${scoreBadge(m, SCHED_SCORES)}</div>
        ${m.ours ? '<div class="sch-flag" title="One of our games">★</div>' : '<div class="sch-flag"></div>'}
      </div>`;
  });
  const body = document.getElementById('schedule-body');
  body.innerHTML = html || '<p class="up-empty">No matches.</p>';
  const target = firstUpcomingId && document.getElementById(firstUpcomingId);
  if (target) target.scrollIntoView({ block: 'start' });
}

function wireSchedule() {
  const modal = document.getElementById('schedule-modal');
  const open = document.getElementById('open-schedule');
  const close = document.getElementById('close-schedule');
  const ours = document.getElementById('sch-ours'), all = document.getElementById('sch-all');
  if (!modal || !open) return;
  let viewAll = false;
  const show = () => { buildScheduleBody(viewAll); modal.hidden = false; document.documentElement.style.overflow = 'hidden'; };
  const hide = () => { modal.hidden = true; document.documentElement.style.overflow = ''; };
  open.addEventListener('click', show);
  close.addEventListener('click', hide);
  modal.addEventListener('click', e => { if (e.target === modal) hide(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) hide(); });
  ours.addEventListener('click', () => { viewAll = false; ours.classList.add('active'); all.classList.remove('active'); buildScheduleBody(false); });
  all.addEventListener('click', () => { viewAll = true; all.classList.add('active'); ours.classList.remove('active'); buildScheduleBody(true); });
}
wireSchedule();

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

    // Upcoming games + schedule scores (refresh alongside the leaderboard).
    SCHED_NOW = Date.now();
    SCHED_SCORES = buildScheduleScores(events);
    renderUpcoming(SCHED_NOW);

    status.style.display = 'none';
  } catch (e) {
    status.textContent = 'Could not load live scores (' + e.message + '). The leaderboard needs an internet connection to ESPN.';
    status.className = 'status err';
  }
}

document.getElementById('refresh').addEventListener('click', () => main(true));
main();
