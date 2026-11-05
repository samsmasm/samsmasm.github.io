// The Long Game - game engine.
//
// Strategies are JSON data (see SCHEMA.md) read by the fixed interpreter below.
// Nothing a student or an AI writes is ever run as code.
// Every random draw comes from a seeded generator, so any match can be
// replayed exactly from its seed.

export const SCHEMA_VERSION = 1;

// Years in jail for [my move][their move]. Fewer is better. These are the
// standard points from the literature (3, 0, 5, 1) turned into years as
// 5 minus points, so the game and every strategy's ranking are unchanged.
export const PAYOFFS = {
  cooperate: { cooperate: 2, defect: 5 },
  defect:    { cooperate: 0, defect: 4 }
};

export const DEFAULTS = {
  rounds: 100,
  seed: 'longgame',
  selfPlay: true
};

// ---------------------------------------------------------------------------
// Seeded randomness
// ---------------------------------------------------------------------------

// Turns any string into a 32 bit number (FNV-1a).
export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32: small, fast, good enough for games. Returns 0 <= x < 1.
export function makeRng(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : hashString(String(seed));
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// What a strategy can look at
// ---------------------------------------------------------------------------

const other = m => (m === 'cooperate' ? 'defect' : 'cooperate');

function streak(moves, move) {
  let n = 0;
  for (let i = moves.length - 1; i >= 0 && moves[i] === move; i--) n++;
  return n;
}

// Each check returns a move ('cooperate' / 'defect' / 'none') or a number.
export const CHECKS = {
  theirLast:            v => v.them[v.them.length - 1] || 'none',
  theirLast2:           v => v.them[v.them.length - 2] || 'none',
  theirLast3:           v => v.them[v.them.length - 3] || 'none',
  myLast:               v => v.me[v.me.length - 1] || 'none',
  round:                v => v.round,
  roundsLeft:           v => v.rounds - v.round + 1,
  theirDefections:      v => v.them.filter(m => m === 'defect').length,
  theirDefectionsLast5: v => v.them.slice(-5).filter(m => m === 'defect').length,
  theirDefectStreak:    v => streak(v.them, 'defect'),
  theirCoopStreak:      v => streak(v.them, 'cooperate'),
  theirCooperationRate: v => v.them.length
    ? Math.round(100 * v.them.filter(m => m === 'cooperate').length / v.them.length)
    : 0,
  myDefections:         v => v.me.filter(m => m === 'defect').length,
  // How far ahead I am: their years minus mine. Below 0 means I am behind.
  scoreLead:            v => v.theirScore - v.myScore
};

export const MOVE_CHECKS = ['theirLast', 'theirLast2', 'theirLast3', 'myLast'];
export const NUMBER_OPS = ['equals', 'atLeast', 'atMost', 'moreThan', 'lessThan', 'multipleOf'];

// How far back a "recent" check can look.
export const RECENT_MAX = 3;

// A "recent" check matches a pattern of past moves. Each list starts at last
// round and goes back; "any" means that move is not looked at.
function matchRecent(c, v) {
  const fits = (want = [], moves) => want.every((m, i) => m === 'any' || moves[moves.length - 1 - i] === m);
  return fits(c.me, v.me) && fits(c.them, v.them);
}

function testCondition(c, v, rng) {
  if (c.check === 'chance') return rng() * 100 < c.percent;
  if (c.check === 'recent') return matchRecent(c, v);
  const value = c.check.startsWith('memory.')
    ? (v.memory[c.check.slice(7)] ?? 0)
    : CHECKS[c.check](v);
  if ('is' in c) return value === c.is;
  if ('equals' in c) return value === c.equals;
  if ('atLeast' in c) return value >= c.atLeast;
  if ('atMost' in c) return value <= c.atMost;
  if ('moreThan' in c) return value > c.moreThan;
  if ('lessThan' in c) return value < c.lessThan;
  if ('multipleOf' in c) return c.multipleOf > 0 && value % c.multipleOf === 0;
  return false;
}

// ---------------------------------------------------------------------------
// What a strategy can do
// ---------------------------------------------------------------------------

export const ACTIONS = ['cooperate', 'defect', 'copy', 'opposite', 'repeat', 'switch', 'pattern'];

function resolveAction(action, s, v) {
  const theirLast = v.them[v.them.length - 1];
  const myLast = v.me[v.me.length - 1];
  switch (action) {
    case 'cooperate': return 'cooperate';
    case 'defect': return 'defect';
    case 'copy': return theirLast || 'cooperate';
    case 'opposite': return theirLast ? other(theirLast) : 'defect';
    case 'repeat': return myLast || 'cooperate';
    case 'switch': return myLast ? other(myLast) : 'defect';
    case 'pattern': {
      const p = s.pattern || ['cooperate'];
      return p[(v.round - 1) % p.length];
    }
  }
  return 'cooperate';
}

// A decision is { do, chance?, otherwise? }. Returns the move, or null when a
// failed chance says "otherwise": "nextRule".
function decide(d, s, v, rng) {
  if (d.do === 'nextRule') return null;
  const chance = d.chance ?? 100;
  if (chance >= 100 || rng() * 100 < chance) return resolveAction(d.do, s, v);
  if (d.otherwise === 'nextRule' || d.otherwise === undefined) return null;
  return resolveAction(d.otherwise, s, v);
}

function applyMemory(rule, memory) {
  const clamp = n => Math.max(-1000, Math.min(1000, n));
  if (rule.set) for (const [k, n] of Object.entries(rule.set)) memory[k] = clamp(n);
  if (rule.change) for (const [k, n] of Object.entries(rule.change)) memory[k] = clamp((memory[k] ?? 0) + n);
}

// ---------------------------------------------------------------------------
// One player's move for one round
// ---------------------------------------------------------------------------

// Makes a player: a strategy plus its own memory and random generator.
export function makePlayer(strategy, rng) {
  return { s: strategy, rng, memory: { ...(strategy.memory || {}) } };
}

// v = { round, rounds, me[], them[], myScore, theirScore }.
// Returns { move, intended, rule, slipped } where rule is the index of the
// rule that decided (-1 first move, -2 fallback).
export function chooseMove(player, v) {
  const { s, rng } = player;
  v.memory = player.memory;
  let intended = null;
  let rule = -2;

  if (v.round === 1) {
    rule = -1;
    intended = decide(s.firstMove, s, v, rng) || 'cooperate';
  } else {
    const rules = s.rules || [];
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      if (!(r.when || []).every(c => testCondition(c, v, rng))) continue;
      const move = decide(r, s, v, rng);
      // Memory changes happen when the rule is used. A "nextRule" rule is
      // always used; a chance that fell through to the next rule is not.
      if (move !== null || r.do === 'nextRule') applyMemory(r, player.memory);
      if (move === null) continue;
      intended = move;
      rule = i;
      break;
    }
    if (intended === null) intended = decide(s.fallback, s, v, rng) || 'cooperate';
  }

  // A slip hands the move to a coin flip, so slip 100 is a fully random
  // player. It only counts as slipped when the coin changed the move.
  let move = intended;
  if (s.slip > 0 && rng() * 100 < s.slip) {
    move = rng() < 0.5 ? 'cooperate' : 'defect';
  }
  const slipped = move !== intended;
  return { move, intended, rule, slipped };
}

// ---------------------------------------------------------------------------
// A match
// ---------------------------------------------------------------------------

// Each side gets its own generator, seeded from the match seed and its side,
// so one strategy's dice rolls never change the other's.
export function playMatch(a, b, opts = {}) {
  const rounds = opts.rounds ?? DEFAULTS.rounds;
  const payoffs = opts.payoffs ?? PAYOFFS;
  const seed = String(opts.seed ?? DEFAULTS.seed);
  const pa = makePlayer(a, makeRng(seed + '|A'));
  const pb = makePlayer(b, makeRng(seed + '|B'));
  const movesA = [], movesB = [];
  let scoreA = 0, scoreB = 0;
  const log = opts.log ? [] : null;

  for (let round = 1; round <= rounds; round++) {
    const ca = chooseMove(pa, { round, rounds, me: movesA, them: movesB, myScore: scoreA, theirScore: scoreB });
    const cb = chooseMove(pb, { round, rounds, me: movesB, them: movesA, myScore: scoreB, theirScore: scoreA });
    const ptsA = payoffs[ca.move][cb.move];
    const ptsB = payoffs[cb.move][ca.move];
    movesA.push(ca.move);
    movesB.push(cb.move);
    scoreA += ptsA;
    scoreB += ptsB;
    if (log) log.push({ round, a: ca, b: cb, ptsA, ptsB, totalA: scoreA, totalB: scoreB, memA: { ...pa.memory }, memB: { ...pb.memory } });
  }

  return { rounds, seed, movesA, movesB, scoreA, scoreB, log };
}
