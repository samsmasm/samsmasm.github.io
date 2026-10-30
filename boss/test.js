// Playthrough tests: node boss/test.js
const B = require('./engine.js');
const assert = (c, m) => { if (!c) throw new Error(m); };

// Plays one game. pickOpt(st, opts) chooses; skill (0 to 1) is the chance of getting checks right.
function play(h, pickOpt, skill) {
  const st = B.newState(h);
  let n = 0;
  while (!B.over(st)) {
    assert(++n < 80, 'stuck at ' + st.hub);
    const hub = B.HUBS[st.hub];
    if (Math.random() < 0.1) { try { B.askThem(st); } catch (e) { /* asked twice already */ } }
    if (B.over(st)) break;
    if (hub.router) { B.route(st); continue; }
    if (hub.sort && !st.sorted) B.sortCheck(st, new Set(Math.random() < skill ? ['pay', 'noise', 'security', 'boss'] : ['pay']));
    if (B.over(st)) break;
    const q = B.choose(st, pickOpt(st, B.optionsAt(st)).id);
    if (q) B.answerQuiz(st, Math.random() < skill ? q.answer : "nope");
  }
  return st;
}
const random = (st, opts) => opts[Math.floor(Math.random() * opts.length)];
// Greedy: best one-step value, using the engine's own "better option" hint
function greedy(st, opts) {
  let best = opts[0], bv = -1e9;
  for (const o of opts) {
    // value the option by replaying the game so far on a fresh copy, then trying it
    const t = B.newState(st.hire.id);
    for (const a of st.acts) {
      if (a === 'r') B.route(t); else if (a === 'a') B.askThem(t); else if (a === 'h') B.askHR(t);
      else if (a[0] === 's') B.sortCheck(t, new Set(a === 's1' ? ['pay', 'noise', 'security', 'boss'] : []));
      else if (a[0] === 'n') B.answerQuiz(t, a === 'n1' ? t.pendingQ.answer : 'x'); else B.choose(t, a.slice(1));
    }
    B.choose(t, o.id);
    const v = t.dead ? -100 : t.M * 2 + t.S - t.W * 3 + t.need + (o.id === 'promote' ? 5 : 0);
    if (v > bv) { bv = v; best = o; }
  }
  return best;
}

const tally = {}, scores = {};
for (const [name, pick, skill, runs] of [['random', random, 0.6, 12000], ['greedy', greedy, 1, 60]]) {
  for (let i = 0; i < runs; i++) {
    const h = B.HIRES[i % B.HIRES.length].id;
    const st = play(h, pick, skill);
    // every finished game must replay to the same result
    const r = B.replay(h, st.acts);
    assert(r && B.score(r) === B.score(st) && r.M === st.M, 'replay mismatch ' + h + ' ' + st.acts.join(','));
    // a full game has five quizzes, all different
    if (!st.dead) assert(st.quizIds.length === 5 && new Set(st.quizIds).size === 5, 'quiz count ' + st.quizIds);
    const k = name + ' ' + h + ' ' + (st.dead ? 'dead:' + st.dead.kind : st.ending.id);
    if (name === 'greedy' && i < 6) console.log(h, st.quizIds.join(' '));
    tally[k] = (tally[k] || 0) + 1;
    (scores[name + ' ' + h] = scores[name + ' ' + h] || []).push(B.score(st) + ' M' + st.M + ' S' + st.S);
  }
}
console.log(tally);
for (const h of B.HIRES) console.log('greedy', h.id, scores['greedy ' + h.id].slice(0, 3).join(' | '));

// Tampered action lists are rejected
assert(B.replay('maya', ['cinduct']) === null, 'unfinished game accepted');
assert(B.replay('maya', ['cnope']) === null, 'bad option accepted');
assert(B.replay('dog', []) === null, 'bad hire accepted');
console.log('ok');
