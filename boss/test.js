// Random playthroughs: node boss/test.js
const B = require('./engine.js');
const tally = {};
let maxDec = 0;
for (let i = 0; i < 20000; i++) {
  const h = B.HIRES[i % 5].id;
  const st = B.newState(h);
  let guard = 0;
  while (!st.dead && st.hub !== 'END') {
    if (++guard > 60) throw new Error('stuck at ' + st.hub);
    const hub = B.HUBS[st.hub];
    if (Math.random() < 0.1) B.askThem(st);
    if (st.dead) break;
    if (hub.router) { B.route(st); continue; }
    if (hub.sort) B.sortCheck(st, new Set(Math.random() < 0.7 ? ['pay', 'noise', 'security', 'boss'] : ['pay']));
    if (st.dead) break;
    const opts = B.optionsAt(st);
    const o = opts[Math.floor(Math.random() * opts.length)];
    const q = B.choose(st, o.id);
    if (q) B.answerName(st, q, Math.random() < 0.7 ? q.answer : 'nope');
  }
  maxDec = Math.max(maxDec, st.decisions);
  const k = h + ' ' + (st.dead ? 'dead:' + st.dead.kind : st.ending.id);
  tally[k] = (tally[k] || 0) + 1;
}
console.log(tally, 'max decisions', maxDec);

// A good run for each hire should reach Promoted mentor
const good = {
  maya: ['induct', 'salary', 'tm', 'rotate', 'growth', 'secure', 'shared', 'team', 'coach', 'grant', 'learn', 'promote'],
};
for (const [h, path] of Object.entries(good)) {
  const st = B.newState(h);
  for (const id of path) {
    if (B.HUBS[st.hub].router) B.route(st);
    const q = B.choose(st, id);
    if (q) B.answerName(st, q, q.answer);
    if (st.dead) break;
  }
  console.log(h, st.dead || st.ending, st.M, st.S, st.W, st.need, st.hub);
}
