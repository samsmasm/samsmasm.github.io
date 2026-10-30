// Playthrough tests: node boss/test.js
const B = require('./engine.js');
const assert = (c, m) => { if (!c) throw new Error(m); };
const HYGIENE = ['pay', 'noise', 'security', 'boss'];

// A theory that fits the option (or 'none'), or a random one
function reasonFor(st, o, right) {
  if (!B.asksWhy(B.HUBS[st.hub])) return undefined;
  const fits = Object.keys(o.why || {}).filter((k) => st.level === 'HL' || !B.THEORIES[k].hl);
  if (right) return fits[0] || 'none';
  const all = B.theoriesFor(st).concat('none');
  return all[Math.floor(Math.random() * all.length)];
}

// Choose an option with a first reason (right or random), then the right one and the follow-up, as the page does
function pickWith(st, o, right, detailRight) {
  const first = reasonFor(st, o, right);
  if (first === undefined) return B.choose(st, o.id);
  const final = B.reasonOk(st, o.id, first) ? first : reasonFor(st, o, true);
  const d = B.detailFor(st, o.id, final);
  return B.choose(st, o.id, first, final, d ? (detailRight ? '1' : '0') : undefined);
}

// Plays one game. pickOpt(st, opts) chooses; skill (0 to 1) is the chance of getting checks and reasons right.
function play(h, level, pickOpt, skill) {
  const st = B.newState(h, Math.floor(Math.random() * 1e9), level);
  let n = 0;
  while (!B.over(st) || st.pendingQ) {
    assert(++n < 400, 'stuck at ' + st.hub);
    if (st.pendingQ) { B.answerQuiz(st, Math.random() < skill ? st.pendingQ.answer : 'nope'); continue; }
    const hub = B.HUBS[st.hub];
    if (Math.random() < 0.1 && st.asked < 1) B.askThem(st);
    if (B.over(st)) break;
    if (hub.sort && !st.sorted) B.sortCheck(st, new Set(Math.random() < skill ? HYGIENE : ['pay']));
    if (B.over(st)) break;
    const o = pickOpt(st, B.optionsAt(st));
    pickWith(st, o, Math.random() < skill, Math.random() < skill);
  }
  return st;
}
const random = (st, opts) => opts[Math.floor(Math.random() * opts.length)];
// Greedy: best one-step value, judged by replaying the game so far on a copy
function greedy(st, opts) {
  let best = opts[0], bv = -1e9;
  for (const o of opts) {
    const t = B.newState(st.hire.id, st.seed, st.level);
    for (const a of st.acts) {
      if (a === 'a') B.askThem(t); else if (a === 'h') B.askHR(t);
      else if (a[0] === 's') B.sortCheck(t, new Set(a === 's1' ? HYGIENE : []));
      else if (a[0] === 'n') B.answerQuiz(t, a === 'n1' ? t.pendingQ.answer : 'x');
      else { const [id, th, f, d] = a.slice(1).split(':'); B.choose(t, id, th, f, d); }
    }
    pickWith(t, o, true, true);
    const v = t.dead ? -100 : t.M * 2 + t.S - t.W * 3 + t.need + (o.id === 'promote' ? 5 : 0);
    if (v > bv) { bv = v; best = o; }
  }
  return best;
}

// Every option that asks for a reason has one at each level (or is marked bad)
for (const level of ['SL', 'HL']) {
  for (const h of B.HIRES) {
    const st = B.newState(h.id, 1, level);
    for (const [id, hub] of Object.entries(B.HUBS)) {
      if (!B.asksWhy(hub) || (hub.hire && hub.hire !== h.id) || (hub.hl && level === 'SL')) continue;
      for (const o of hub.options) {
        const fits = Object.keys(o.why || {}).filter((k) => level === 'HL' || !B.THEORIES[k].hl);
        assert(fits.length || o.bad, level + ' ' + id + ' ' + o.id + ' has no reason');
        // Every reason for a theory with a follow-up gives that follow-up an answer
        if (!o.only || o.only.includes(h.id)) for (const k of fits) {
          if (!['maslow', 'herzberg', 'sdt', 'mcclelland', 'expectancy'].includes(k)) continue;
          st.hub = id;
          const d = B.detailFor(st, o.id, k);
          assert(d && d.answers.every((a) => d.choices.includes(a)), 'no follow-up answer: ' + id + ' ' + o.id + ' ' + k);
        }
      }
    }
  }
}

// Decks: 13 steps, start and end fixed, different between games and between hires
const decks = new Set();
for (let i = 0; i < 40; i++) {
  const st = B.newState(B.HIRES[i % 6].id, i, i % 2 ? 'SL' : 'HL');
  assert(st.deck.length === 13 && st.deck[0] === 'H1' && st.deck[1] === 'H2' && st.deck[12] === 'H15', 'deck shape ' + st.deck);
  assert(new Set(st.deck).size === 13, 'repeat in deck ' + st.deck);
  if (st.level === 'SL') assert(!st.deck.some((k) => B.HUBS[k].hl), 'HL step in SL deck');
  decks.add(st.deck.join());
}
assert(decks.size === 40, 'decks repeat');

const tally = {}, scores = {};
let missTotal = 0, halfTotal = 0;
for (const [name, pick, skill, runs] of [['random', random, 0.6, 6000], ['greedy', greedy, 1, 48]]) {
  for (let i = 0; i < runs; i++) {
    const h = B.HIRES[i % B.HIRES.length].id, level = i % 12 < 6 ? 'HL' : 'SL';
    const st = play(h, level, pick, skill);
    const r = B.replay(h, st.seed, st.level, st.acts);
    assert(r && B.score(r) === B.score(st) && r.M === st.M, 'replay mismatch ' + h + ' ' + st.acts.join(','));
    if (!st.dead) assert(st.quizIds.length === 5 && new Set(st.quizIds).size === 5, 'quiz count ' + st.quizIds);
    if (!st.dead) assert(st.quizIds.some((id) => id.startsWith('herz')), 'no Herzberg question ' + st.quizIds);
    const misses = st.log.filter((e) => e.title === 'Why did it not land?').length;
    assert(misses === st.early || (st.dead && misses === st.early - 1), 'miss questions ' + misses + ' for ' + st.early + ' early');
    missTotal += misses;
    halfTotal += st.matchedHalf + st.bestHalf;
    assert(st.matchedHalf + st.bestHalf <= st.whyWrong * 2, 'half points without a wrong reason');
    const k = name + ' ' + level + ' ' + h + ' ' + (st.dead ? 'dead:' + st.dead.kind : st.ending.id);
    tally[k] = (tally[k] || 0) + 1;
    (scores[name + ' ' + h] = scores[name + ' ' + h] || []).push(B.score(st) + ' M' + st.M + ' S' + st.S);
  }
}
console.log(tally);
console.log('why-did-it-not-land questions:', missTotal);
assert(missTotal > 0, 'no miss questions asked');
assert(halfTotal > 0, 'never gave half points');

// Try again: a wrong answer keeps the question, only the first try scores
{
  const st = B.newState('aisha', 11, 'HL');
  while (!st.pendingQ) { const o = B.optionsAt(st)[0]; if (B.HUBS[st.hub].sort && !st.sorted) B.sortCheck(st, new Set(HYGIENE)); else pickWith(st, o, true, true); }
  const q = st.pendingQ, M = st.M;
  assert(B.answerQuiz(st, 'nope') === false && st.pendingQ === q, 'wrong answer did not stay');
  assert(B.answerQuiz(st, 'nope') === false && st.M === M - (q.miss ? 0 : 1), 'second wrong try scored again');
  assert(B.answerQuiz(st, q.answer) === true && st.pendingQ !== q && st.log[st.log.length - 1].quiz.ok === false, 'first try not what counts');
}

// A wrong first reason must be followed by a right one
{
  const st = B.newState('maya', 3, 'HL');
  while (!B.asksWhy(B.HUBS[st.hub]) || st.pendingQ) {
    if (st.pendingQ) B.answerQuiz(st, st.pendingQ.answer);
    else if (B.HUBS[st.hub].sort && !st.sorted) B.sortCheck(st, new Set(HYGIENE));
    else pickWith(st, B.optionsAt(st)[0], true, true);
  }
  const o = B.optionsAt(st).find((x) => Object.keys(x.why || {}).length);
  const wrong = B.theoriesFor(st).concat('none').find((t) => !B.reasonOk(st, o.id, t));
  let threw = false;
  try { B.choose(st, o.id, wrong, wrong); } catch (e) { threw = true; }
  assert(threw, 'accepted a wrong final reason');
}

// A version 2 game (no miss questions) still replays under v2 rules
{
  const st = B.newState('maya', 7, 'HL', 2);
  let n = 0;
  while ((!B.over(st) || st.pendingQ) && n++ < 80) {
    if (st.pendingQ) { assert(!st.pendingQ.miss, 'miss question in v2'); B.answerQuiz(st, st.pendingQ.answer); continue; }
    if (B.HUBS[st.hub].sort && !st.sorted) { B.sortCheck(st, new Set(HYGIENE)); continue; }
    const o = random(st, B.optionsAt(st));
    B.choose(st, o.id, reasonFor(st, o, true));
  }
  const r = B.replay('maya', 7, 'HL', st.acts, 2);
  assert(r && B.score(r) === B.score(st), 'v2 replay');
}
for (const h of B.HIRES) console.log('greedy', h.id, scores['greedy ' + h.id].slice(0, 4).join(' | '));

// Tampered or unfinished games are rejected
assert(B.replay('maya', 5, 'HL', ['cinduct']) === null, 'unfinished game accepted');
assert(B.replay('maya', 5, 'HL', ['cnope']) === null, 'bad option accepted');
assert(B.replay('dog', 5, 'HL', []) === null, 'bad hire accepted');
assert(B.replay('maya', undefined, 'HL', []) === null, 'missing seed accepted');
console.log('ok');
