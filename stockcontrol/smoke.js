const { JSDOM } = require('jsdom');
const fs = require('fs');
const Engine = require('./engine.js');
const html = fs.readFileSync('out/Stock_Shock_JIT_vs_JIC.html', 'utf8');
const fails = [];
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) fails.push(msg); };

// 7. No em dashes in the built file
check(html.split(String.fromCharCode(8212)).length - 1 === 0, 'built HTML has no em dashes');

const errs = [];
const posts = [], store = {
  '-A0': { n: 'Cheat', m: 'A', d: 0, t: 999999, h: Array(10).fill([800, 1200, 0]) },
  '-A1': { n: 'Broken', m: 'A', d: 0, t: 5, h: [[1, 2, 3]] },
};
let fetchUrls = [];
const fakeFetch = (url, opt = {}) => {
  fetchUrls.push(url);
  if (opt.method === 'POST') { const b = JSON.parse(opt.body); posts.push(b); store['-P' + posts.length] = b; return Promise.resolve({ ok: true, json: () => Promise.resolve({ name: 'x' }) }); }
  return Promise.resolve({ ok: true, json: () => Promise.resolve(JSON.parse(JSON.stringify(store))) });
};
const tick = () => new Promise((r) => setTimeout(r, 30));
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/?fast', pretendToBeVisual: true,
  beforeParse(w) { w.scrollTo = () => {}; w.__fast = true; w.fetch = fakeFetch; w.addEventListener('error', (e) => errs.push(e.message)); } });
const w = dom.window, d = w.document;
const click = (sel) => d.querySelector(sel).click();
const setRange = (sel, v) => { const el = d.querySelector(sel); el.value = v; el.dispatchEvent(new w.Event('input')); };
const sadCount = () => d.querySelectorAll('[data-cat][data-mood="sad"]').length;
const lostShown = () => { const g = d.querySelector('#scLost'); return !!g && g.getAttribute('display') !== 'none' && /Lost sale/.test(g.textContent); };

(async () => {
d.querySelector('#nm').value = 'Test Team'; click('#go');

// 2. Round 1 scene: stock 800 and demand 800 give 8 cans and 8 cats
check(d.querySelectorAll('#scene [data-can]').length === 8, 'round 1 scene has 8 cans');
check(d.querySelectorAll('#scene [data-cat]').length === 8, 'round 1 scene has 8 cats');
check(d.querySelectorAll('#scene [data-cat][data-mood="neutral"]').length === 8, 'round 1 cats are neutral');

// 3. Buffer 1,200 puts the reorder line at 20 cans, updated without a re-render
const sceneBefore = d.querySelector('#scene');
setRange('#bf', 1200);
check(d.querySelector('#scene') === sceneBefore, 'buffer slider updates the scene without re-render');
check(d.querySelector('#scRl').getAttribute('data-cans') === '20', 'reorder line at 20 cans for buffer 1,200');
check(d.querySelectorAll('#scene [data-can] .cb[stroke="#1f7a45"]').length === 8, 'buffer cans outlined in green');
setRange('#bf', 800);
check(d.querySelector('#scRl').getAttribute('data-cans') === '16', 'reorder line back to 16 cans for buffer 800');

let sawOut = 0, sawCalm = 0, sawDel = 0;
for (let r = 1; r <= 10; r++) {
  if (!d.querySelector('#run')) throw new Error('no run button round ' + r);
  if (r === 3) { setRange('#bf', 1200); setRange('#qy', 1600); }
  if (r === 5) d.querySelectorAll('.opt')[1].click();
  { const st = w.__G().s, arr = st.pipeline.filter((o) => o.arrive <= r).reduce((t, o) => t + o.qty, 0);
    if (arr) sawDel++;
    check(d.querySelectorAll('#scene [data-can]').length === Math.ceil((st.onHand + arr) / 100), `round ${r} scene shows stock after this round's delivery`); }
  click('#run');
  if (!d.querySelector('#next')) throw new Error('no next round ' + r);
  // 4. Moods match the stock-out result
  const h = w.__G().last;
  if (h.stockout) { sawOut++; check(sadCount() > 0 && lostShown(), `round ${r} stock-out: sad cat and Lost sale label`); }
  else { sawCalm++; check(sadCount() === 0 && !lostShown(), `round ${r} no stock-out: no sad cats`); }
  check(d.querySelectorAll('#scene [data-can]').length === Math.ceil(h.endStock / 100), `round ${r} result scene cans match end stock`);
  click('#next');
}
check(sawCalm > 0, 'played at least one no-stock-out round');
check(sawDel > 0, 'played at least one round with a delivery');

const txt = d.body.textContent;
check(/Final result: Test Team/.test(txt) && /Debrief/.test(txt), 'end screen shown');

// 8. Leaderboard: public named game saves once, board recomputes totals and drops bad rows
await tick();
check(posts.length === 1 && posts[0].n === 'Test Team' && posts[0].h.length === 10, 'public game saved to leaderboard once');
check(posts[0].h.every((x, i) => x[0] === w.__G().s.history[i].lev.buffer && x[1] === w.__G().s.history[i].lev.qty), 'saved levers match the game');
check(fetchUrls.some((u) => /orderBy=%22\$key%22&startAt=%22/.test(u)), 'leaderboard loads by time-ordered key');
const lbTxt = d.querySelector('#lbBox').textContent;
const cheatTrue = Math.round(Engine.run(Engine.seqFor('A', 0), { buffer: 800, qty: 1200, dual: false }).total);
check(/Test Team \(you\)/.test(lbTxt), 'leaderboard shows you');
check(/Cheat/.test(lbTxt) && !/999,999/.test(lbTxt) && lbTxt.includes('$' + cheatTrue.toLocaleString('en-US')), 'leaderboard recomputes edited totals');
check(!/Broken/.test(lbTxt), 'leaderboard skips invalid rows');

// 5. Replay card, scrub slider 0 to 10, totals match Engine.run
const G = w.__G();
check(!!d.querySelector('#replay'), 'replay card present');
const sc = d.querySelector('#rpScrub');
check(!!sc && sc.getAttribute('min') === '0' && sc.getAttribute('max') === '10', 'scrub slider min 0 max 10');
d.querySelector('#rpHyb').click();
setRange('#rpScrub', 10);
const seq = Engine.seqFor(G.mode, G.seed);
const want = {
  you: Engine.run(seq, (i) => G.s.history[i].lev).total,
  jit: Engine.run(seq, { buffer: 0, qty: 800, dual: false }).total,
  jic: Engine.run(seq, { buffer: 3200, qty: 2400, dual: false }).total,
  hyb: Engine.run(seq, (i) => ({ buffer: 800, qty: 1200, dual: seq[i].delay > 0 || seq[i].priceMult > 1 })).total,
};
for (const [k, v] of Object.entries(want)) {
  const el = d.querySelector(`#rpLegend [data-key="${k}"]`);
  check(!!el && +el.getAttribute('data-total') === Math.round(v), `replay total ${k} matches Engine.run (${Math.round(v)})`);
}
check(/Round 10, /.test(d.querySelector('#rpCap').textContent), 'replay caption at round 10');
const soMarks = d.querySelectorAll('.rp-so').length, soRounds = G.s.history.filter((h) => h.stockout).length;
check(soMarks === soRounds, `stock-out markers on replay (${soMarks} of ${soRounds})`);
setRange('#rpScrub', 3);
check(d.querySelector('#rpRd').textContent === '3' && /Round 3, /.test(d.querySelector('#rpCap').textContent), 'scrubbing to round 3 updates caption');

// 6. Score code decodes to the game total
const code = d.querySelector('#code').textContent;
const dec = w.__decode(code);
console.log('game total', Math.round(G.s.total), 'decoded', Math.round(dec.total), 'claimed', dec.claimed);
check(Math.round(dec.total) === Math.round(G.s.total) && dec.claimed === Math.round(G.s.total), 'score code decodes to game total');

d.querySelector('#tabTeacher').click();
d.querySelector('#codes').value = code + '\n' + code.replace(/.$/, '') + '\n';
d.querySelector('#build').click();
console.log('leaderboard rows:', d.querySelectorAll('#lb table tr').length, /could not be read/.test(d.body.textContent));

// 9. Leaderboard tab renders
d.querySelector('#tabLb').click(); await tick();
check(/Test Team/.test(d.querySelector('#lbBox').textContent) && d.querySelector('#lbSet'), 'leaderboard tab lists players');

// 4b. A game built to stock out: buffer 0, order 400
d.querySelector('#tabPlay').click();
w.__start('Out Team', 'A', 0);
for (let r = 1; r <= 10; r++) {
  setRange('#bf', 0); setRange('#qy', 400);
  click('#run');
  const h = w.__G().last;
  if (h.stockout) { sawOut++; check(sadCount() > 0 && lostShown(), `low-stock round ${r}: sad cat and Lost sale label`); }
  else check(sadCount() === 0 && !lostShown(), `low-stock round ${r}: no sad cats`);
  click('#next');
}
check(sawOut > 0, 'played at least one stock-out round');
await tick();

// 10. Private game sends nothing
const before = posts.length;
d.querySelector('#fresh').click();
d.querySelector('#nm').value = 'Private Pat'; d.querySelector('#priv').checked = true; click('#go');
for (let r = 1; r <= 10; r++) { click('#run'); click('#next'); }
await tick();
check(posts.length === before, 'private game is not saved');
check(/stay off the leaderboard/.test(d.querySelector('#lbBox').textContent), 'private game explains it was not added');

// 1. No uncaught errors
check(errs.length === 0, 'no uncaught errors' + (errs.length ? ': ' + errs.join(' | ') : ''));

if (fails.length) { console.error(`\n${fails.length} check(s) FAILED`); process.exit(1); }
console.log('\nAll checks passed.');
})().catch((e) => { console.error(e); process.exit(1); });
