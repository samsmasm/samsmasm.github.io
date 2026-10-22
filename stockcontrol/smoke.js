const { JSDOM } = require('jsdom');
const fs = require('fs');
const Engine = require('./engine.js');
const html = fs.readFileSync('out/Stock_Shock_JIT_vs_JIC.html', 'utf8');
const fails = [];
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) fails.push(msg); };

// 7. No em dashes in the built file
check(html.split(String.fromCharCode(8212)).length - 1 === 0, 'built HTML has no em dashes');

const errs = [];
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/?fast', pretendToBeVisual: true,
  beforeParse(w) { w.scrollTo = () => {}; w.__fast = true; w.addEventListener('error', (e) => errs.push(e.message)); } });
const w = dom.window, d = w.document;
const click = (sel) => d.querySelector(sel).click();
const setRange = (sel, v) => { const el = d.querySelector(sel); el.value = v; el.dispatchEvent(new w.Event('input')); };
const sadCount = () => d.querySelectorAll('[data-cat][data-mood="sad"]').length;
const lostShown = () => { const g = d.querySelector('#scLost'); return !!g && g.getAttribute('display') !== 'none' && /Lost sale/.test(g.textContent); };

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

let sawOut = 0, sawCalm = 0;
for (let r = 1; r <= 10; r++) {
  if (!d.querySelector('#run')) throw new Error('no run button round ' + r);
  if (r === 3) { setRange('#bf', 1200); setRange('#qy', 1600); }
  if (r === 5) d.querySelectorAll('.opt')[1].click();
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

const txt = d.body.textContent;
check(/Final result: Test Team/.test(txt) && /Debrief/.test(txt), 'end screen shown');

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

// 1. No uncaught errors
check(errs.length === 0, 'no uncaught errors' + (errs.length ? ': ' + errs.join(' | ') : ''));

if (fails.length) { console.error(`\n${fails.length} check(s) FAILED`); process.exit(1); }
console.log('\nAll checks passed.');
