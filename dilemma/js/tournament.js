// The Long Game - tournaments.
//
// A format decides who plays whom. Only round robin exists in V1; another
// format (knockout, evolutionary) is a new entry in FORMATS returning pairs,
// with the scoring below left as it is.

import { playMatch, PAYOFFS, DEFAULTS } from './engine.js?v=20261105-092415';

export const FORMATS = {
  roundRobin: {
    label: 'Round robin',
    describe: 'Every strategy plays every other strategy once.',
    pairings(entries, opts) {
      const pairs = [];
      for (let i = 0; i < entries.length; i++) {
        for (let j = i; j < entries.length; j++) {
          if (i === j && !opts.selfPlay) continue;
          pairs.push([i, j]);
        }
      }
      return pairs;
    }
  }
};

// Turns checked strategies into tournament entries, sorted by id, so who
// plays as side A never depends on arrival order and any run replays exactly.
// The teacher page and the competitions page must both build entries here.
export function toEntries(list) {
  return list.map(s => ({ id: s.id, name: s.name, handle: s.handle, strategy: s.strategy }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

// The seed for one match depends only on the tournament seed and the two
// strategies, so adding a strategy never changes anyone else's matches.
export function matchSeed(seed, a, b) {
  return `${seed}|${a.id}|${b.id}`;
}

export function playPair(entries, i, j, opts) {
  const a = entries[i], b = entries[j];
  return playMatch(a.strategy, b.strategy, {
    rounds: opts.rounds, payoffs: opts.payoffs, seed: matchSeed(opts.seed, a, b), log: opts.log
  });
}

// entries: [{ id, name, handle, strategy }]
// Yields to the page now and then so the progress bar can draw.
export async function runTournament(entries, options = {}, onProgress = () => {}) {
  const opts = {
    rounds: DEFAULTS.rounds, seed: DEFAULTS.seed, selfPlay: DEFAULTS.selfPlay,
    payoffs: PAYOFFS, format: 'roundRobin', ...options
  };
  const pairs = FORMATS[opts.format].pairings(entries, opts);
  const n = entries.length;
  const R = opts.rounds;

  const table = entries.map((e, i) => ({
    index: i, id: e.id, name: e.name, handle: e.handle,
    total: 0, matches: 0, rounds: 0, cooperations: 0,
    perRound: new Float64Array(R)
  }));
  const h2h = Array.from({ length: n }, () => new Array(n).fill(null));
  const matches = [];

  let last = Date.now();
  for (let k = 0; k < pairs.length; k++) {
    const [i, j] = pairs[k];
    const m = playPair(entries, i, j, opts);
    const p = opts.payoffs;
    const self = i === j;
    // In self play only one copy's score counts, so playing yourself counts
    // as one match like any other.
    const sides = self ? [[i, m.movesA, m.movesB]] : [[i, m.movesA, m.movesB], [j, m.movesB, m.movesA]];
    for (const [who, mine, theirs] of sides) {
      const t = table[who];
      let score = 0;
      for (let r = 0; r < R; r++) {
        const pts = p[mine[r]][theirs[r]];
        t.perRound[r] += pts;
        score += pts;
        if (mine[r] === 'cooperate') t.cooperations++;
      }
      t.total += score;
      t.matches++;
      t.rounds += R;
    }
    h2h[i][j] = m.scoreA;
    h2h[j][i] = self ? m.scoreA : m.scoreB;
    matches.push({ i, j, scoreA: m.scoreA, scoreB: m.scoreB });

    if (Date.now() - last > 30) {
      onProgress({ match: k + 1, matches: pairs.length, rounds: R });
      await new Promise(res => setTimeout(res, 0));
      last = Date.now();
    }
  }
  onProgress({ match: pairs.length, matches: pairs.length, rounds: R });

  for (const t of table) {
    t.average = t.rounds ? t.total / t.rounds : 0;
    t.coopRate = t.rounds ? t.cooperations / t.rounds : 0;
    for (let r = 0; r < R; r++) t.perRound[r] = t.matches ? t.perRound[r] / t.matches : 0;
  }
  // Fewest years in jail wins.
  const ranking = [...table].sort((a, b) => a.total - b.total || a.name.localeCompare(b.name));
  ranking.forEach((t, k) => { t.rank = k + 1; });

  return { opts, entries, table, ranking, h2h, matches };
}
