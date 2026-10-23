const { JSDOM } = require('jsdom');
const fs = require('fs');
const Engine = require('./engine.js');
const html = fs.readFileSync('out/Stock_Shock_JIT_vs_JIC.html', 'utf8');
const fails = [];
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) fails.push(msg); };
const STD = { v: 2, hard: false }, HARD = { v: 2, hard: true };

// 7. No em dashes in the built file
check(html.split(String.fromCharCode(8212)).length - 1 === 0, 'built HTML has no em dashes');

// Engine: old rules unchanged, new rules behave
{ const A = Engine.seqFor('A');
  check(Engine.run(A, { buffer: 0, qty: 800, dual: false }).total === 42100 && Engine.run(A, { buffer: 3200, qty: 2400, dual: false }).total === 50000, 'old rules give the same totals as before');
  const big = Engine.run(A, { rl: 4000, qty: 2400, sup: 0 }, STD);
  check(big.history.some((h) => h.ordered && h.ordered.bulk && Math.abs(h.ordered.cost - 11.4) < 1e-9), 'orders of 2,000 or more get the 5% bulk discount');
  const L = Engine.seqFor('L', 3); const jic = Engine.run(L, { rl: 4000, qty: 2400, sup: 0 }, STD);
  check(jic.history.some((h) => h.spoiled > 0), 'big piles of cans go off after the shelf life');
  check(jic.history.every((h) => h.profit === h.revenue - h.cogs - h.holding - h.fee - h.fixed - h.spoilCost), 'profit includes spoiled stock');
  const out = Engine.run(A, { rl: 0, qty: 400, sup: 0 }, HARD);
  const k = out.history.findIndex((h) => h.lost > 0);
  check(k >= 0 && k < 9 && out.history[k + 1].goodwillLoss === Math.round(out.history[k].lost * 0.25 / 100) * 100 && out.history[k + 1].demand === out.history[k + 1].cardDemand - out.history[k + 1].goodwillLoss, 'Hard: lost sales cut next round demand');
  const mk = Engine.run(A, (i) => ({ rl: 1600, qty: 1200, sup: i >= 3 ? 2 : 0, build: i === 3 }), HARD);
  check(mk.history[3].built === 4 && mk.history.slice(3).every((h) => h.fixed === 2000) && mk.history.slice(0, 3).every((h) => h.fixed === 0), 'Hard: canning line fixed cost from the build round');
  check(mk.history.filter((h) => h.made).every((h) => h.made <= 1000 && h.util === h.made / 1000 && h.ordered.cost === 8 * (1 + (h.card.priceMult - 1))), 'Hard: making is capped at capacity and costs $8 a can');
  const nb = Engine.run(A, { rl: 1600, qty: 1200, sup: 2 }, HARD);
  check(nb.history.every((h) => h.lev.sup === 0 && h.fixed === 0), 'Hard: cannot make without building the line'); }

const errs = [];
const posts = [], now = Date.now(), store = {
  '-A0': { n: 'Cheat', m: 'S', d: 7, t: 999999, v: 2, x: 0, h: Array(10).fill([1600, 1200, 0, 0]), at: now },
  '-A1': { n: 'Broken', m: 'S', d: 7, t: 5, v: 2, x: 0, h: [[1, 2, 3, 0]], at: now },
  '-A2': { n: 'Oldie', m: 'S', d: 7, t: 5, h: Array(10).fill([800, 1200, 0]), at: now },
};
let fetchUrls = [];
const fakeFetch = (url, opt = {}) => {
  fetchUrls.push(url);
  if (opt.method === 'DELETE') { const k = decodeURIComponent(url.split('/scores/')[1].replace('.json', '')); delete store[k]; return Promise.resolve({ ok: true, json: () => Promise.resolve(null) }); }
  if (opt.method === 'POST') { const b = JSON.parse(opt.body); posts.push(b); store['-P' + posts.length] = { ...b, at: Date.now() }; return Promise.resolve({ ok: true, json: () => Promise.resolve({ name: 'x' }) }); }
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
const answer = (right = true) => {
  if (!d.querySelector('#quiz') || d.querySelector('#qfb').textContent) return;
  if (w.__qmc()) { const n = d.querySelectorAll('.qopt').length; click(`.qopt[data-i="${right ? w.__qa() : (w.__qa() + 1) % n}"]`); }
  else { d.querySelector('#qa').value = right ? String(w.__qa()) : '-99999'; click('#qcheck'); }
};

(async () => {
check(d.querySelectorAll('#worldPick .world').length === 4 && d.querySelectorAll('.world.lvl').length === 2 && d.querySelector('#quizOn').checked, 'setup offers four worlds, two levels, questions on by default');
click('#go');
check(!w.__G() && /Type your name/.test(d.querySelector('#nmMsg').textContent), 'cannot start without a name');
d.querySelector('#nm').value = '   '; click('#go');
check(!w.__G(), 'a blank name does not count');
d.querySelector('#nm').value = 'Test Team'; click('#go');
check(!!d.querySelector('#helpModal') && /about 8 cats arrive/.test(d.querySelector('#helpModal').textContent) && /minimum you want left on the shelves/.test(d.querySelector('#helpModal').textContent) && !/Hard:/.test(d.querySelector('#helpModal').textContent), 'How to play opens by itself the first time');
click('#helpGo'); check(!d.querySelector('#helpModal') && w.localStorage.getItem('stockshock-seen-help') === '1', "Let's play closes it and remembers it was seen");
click('#helpBtn'); check(!!d.querySelector('#helpModal'), 'How to play button opens it again');
d.querySelector('#helpModal .modalx').click(); check(!d.querySelector('#helpModal'), 'X closes it');

// 2. Round 1 scene: stock 800 and demand 800 give 8 cans and 8 cats
check(d.querySelectorAll('#scene [data-can]').length === 8, 'round 1 scene has 8 cans');
check(d.querySelectorAll('#scene [data-cat]').length === 8, 'round 1 scene has 8 cats');
check(d.querySelectorAll('#scene [data-cat][data-mood="neutral"]').length === 8, 'round 1 cats are neutral');

// 3. Target buffer 1,200 gives reorder level 1,200 + 800 x 1 week = 2,000 (line at 20 cans), updated without a re-render
const sceneBefore = d.querySelector('#scene'), ccBefore = d.querySelector('#ccRl').getAttribute('y1');
setRange('#bf', 1200);
check(d.querySelector('#scene') === sceneBefore, 'buffer slider updates the scene without re-render');
check(d.querySelector('#scRl').getAttribute('data-cans') === '20' && w.__G().lev.rl === 2000, 'reorder line at 20 cans for buffer 1,200');
check(/= 1,200 \+ 800 x 1 week = 2,000/.test(d.querySelector('#rlcalc').textContent), 'reorder level calculation shown live');
check(d.querySelectorAll('#scene [data-can] .cb[stroke="#1f7a45"]').length === 8, 'buffer cans outlined in green');
check(d.querySelector('#ccRl').getAttribute('y1') !== ccBefore, 'stock control chart reorder line moves with the slider');
check(d.querySelector('#bfo').textContent === '', 'no delay warning in a calm round');
setRange('#bf', 800);
check(d.querySelector('#scRl').getAttribute('data-cans') === '16', 'reorder line back to 16 cans');

let sawOut = 0, sawCalm = 0, sawDel = 0;
for (let r = 1; r <= 10; r++) {
  if (!d.querySelector('#run')) throw new Error('no run button round ' + r);
  if (r === 2) {
    check(!!d.querySelector('.colA #quiz') && d.querySelector('#run').disabled && /Answer the question/.test(d.querySelector('#run').textContent), 'round 2 asks a question and Run waits for it');
    answer(false);
    check(/Not quite\. .{10,}/.test(d.querySelector('#qfb').textContent) && !d.querySelector('#run').disabled, 'a wrong answer shows the working and unlocks Run');
  }
  if (r === 5) { answer(true); check(/Correct/.test(d.querySelector('#qfb').textContent), 'a right answer is marked correct'); }
  if (r === 3) { setRange('#bf', 1200); setRange('#qy', 1600); }
  if (r === 5) d.querySelectorAll('.opt')[1].click();
  answer();
  { const st = w.__G().s, arr = st.pipeline.filter((o) => o.arrive <= r).reduce((t, o) => t + o.qty, 0);
    if (arr) sawDel++;
    check(d.querySelectorAll('#scene [data-can]').length === Math.ceil((st.onHand + arr) / 100), `round ${r} scene shows stock after this round's delivery`); }
  click('#run');
  if (!d.querySelector('#next')) throw new Error('no next round ' + r);
  const h = w.__G().last;
  if (h.stockout) { sawOut++; check(sadCount() > 0 && lostShown(), `round ${r} stock-out: sad cat and Lost sale label`); }
  else { sawCalm++; check(sadCount() === 0 && !lostShown(), `round ${r} no stock-out: no sad cats`); }
  check(d.querySelectorAll('#scene [data-can]').length === Math.ceil(h.endStock / 100), `round ${r} result scene cans match end stock`);
  click('#next');
}
check(sawCalm > 0, 'played at least one no-stock-out round');
check(w.__G().mode === 'S' && w.__G().seed > 0 && !w.__G().hard, 'default game is the Unsettled world, Standard level');
{ const ids = (sq) => sq.map((c) => c.id).sort().join(); const a = Engine.seqFor('A', 0);
  check([1, 2, 3, 99].every((k) => ids(Engine.seqFor('S', k)) === ids(a) && Engine.seqFor('S', k)[0].id === 'calm'), 'shuffled games have the same events, round 1 calm');
  check([['L', 'B'], ['H', 'C']].every(([m, f]) => [5, 6].every((k) => ids(Engine.seqFor(m, k)) === ids(Engine.seqFor(f)))), 'Stable and Chaotic worlds use their event sets');
  check(['A', 'B', 'C'].every((m) => Engine.seqFor(m).map((c) => c.id).join() === Engine.SEQ[m].join()), 'fixed sets unchanged');
  check(Engine.seqFor('S', 1).map((c) => c.id).join() !== Engine.seqFor('S', 2).map((c) => c.id).join(), 'shuffled games differ in order'); }
check(sawDel > 0, 'played at least one round with a delivery');

const txt = d.body.textContent;
check(/Final result: Test Team/.test(txt) && /Debrief/.test(txt), 'end screen shown');
check(/How JIT and JIC played your shocks/.test(txt) && /Reorder level 2,800/.test(txt) && /Buffer 2,000/.test(txt) && /Reorder level 800/.test(txt) && /Maximum stock/.test(txt) && /Lead time/.test(txt), 'end screen has JIT and JIC stock control charts with lead times');
check(/Questions right 2 of 3/.test(txt), 'end screen counts questions right');
{ const st = w.__G().s; check(txt.includes('Cans left at the end ' + st.onHand.toLocaleString('en-US')) && Math.abs(st.total - st.history.reduce((a, h) => a + h.revenue - h.cogs - h.holding - h.fee - h.fixed - h.spoilCost + h.bonus, 0)) < 1e-6, 'end stock is shown and only cans sold are charged to profit'); }
{ const H = w.__G().s.history, right = w.__G().quizLog.filter((x) => x.ok).map((x) => x.r);
  check(H.filter((h) => h.bonus === 500).map((h) => h.round).join() === right.join() && H.every((h) => !h.bonus || right.includes(h.round)), 'each right answer adds a $500 bonus to that round, wrong answers add nothing'); }

// 8. Leaderboard
await tick();
check(posts.length === 1 && posts[0].n === 'Test Team' && posts[0].v === 2 && posts[0].x === 0 && posts[0].h.length === 10, 'public game saved to leaderboard once, under the new rules');
check(posts[0].h.every((x, i) => x[0] === w.__G().s.history[i].lev.rl && x[1] === w.__G().s.history[i].lev.qty), 'saved levers match the game');
check(fetchUrls.some((u) => /orderBy=%22\$key%22&startAt=%22/.test(u)), 'leaderboard loads by time-ordered key');
let lbTxt = d.querySelector('#lbBox').textContent;
const cheatSeq = Engine.seqFor('S', 7), cheatTrue = Math.round(Engine.run(cheatSeq, { rl: 1600, qty: 1200, sup: 0 }, STD).total);
check(/Test Team \(you\)/.test(lbTxt), 'leaderboard shows you');
check(/Cheat/.test(lbTxt) && !/999,999/.test(lbTxt) && lbTxt.includes('$' + cheatTrue.toLocaleString('en-US')), 'leaderboard recomputes edited totals');
check(!/Broken/.test(lbTxt) && !/Oldie/.test(lbTxt), 'leaderboard skips invalid and old-rules rows');
d.querySelector('#lbSort [data-k="vs"]').click();
lbTxt = d.querySelector('#lbBox').textContent;
const cheatVs = Math.round(cheatTrue - Engine.run(cheatSeq, { rl: 2800, qty: 4000, sup: 0 }, STD).total);
check(/vs pure JIC/.test(lbTxt) && lbTxt.includes((cheatVs >= 0 ? '+$' : '-$') + Math.abs(cheatVs).toLocaleString('en-US')), 'leaderboard can order by beating pure JIC');
d.querySelector('#lbSort [data-k="total"]').click();
{ const o = d.querySelector('#rpLegend [data-key="o0"]');
  check(!!o && /Cheat/.test(o.parentNode.textContent) && /other order/.test(o.parentNode.textContent) && +o.getAttribute('data-total') === cheatTrue && !d.querySelector('#rpLegend [data-key="o1"]') && !!d.querySelector('#rp-stock-o0'), 'replay adds other players in this world, named, with recomputed totals (not you)'); }

// 5. Replay card, scrub slider 0 to 10, totals match Engine.run
const G = w.__G();
check(!!d.querySelector('#replay'), 'replay card present');
const sc = d.querySelector('#rpScrub');
check(!!sc && sc.getAttribute('min') === '0' && sc.getAttribute('max') === '10', 'scrub slider min 0 max 10');
d.querySelector('#rpHyb').click();
setRange('#rpScrub', 10);
const seq = Engine.seqFor(G.mode, G.seed);
const want = {
  you: Engine.run(seq, (i) => G.s.history[i].lev, STD).total,
  jit: Engine.run(seq, { rl: 800, qty: 800, sup: 0 }, STD).total,
  jic: Engine.run(seq, { rl: 2800, qty: 4000, sup: 0 }, STD).total,
  hyb: Engine.run(seq, (i) => ({ rl: 1600, qty: 1200, sup: seq[i].delay > 0 || seq[i].priceMult > 1 ? 1 : 0 }), STD).total,
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

// 6. Score codes: new code decodes to the game total; an old code still scores under the old rules
const code = d.querySelector('#code').textContent;
const dec = w.__decode(code);
console.log('game total', Math.round(G.s.total), 'decoded', Math.round(dec.total), 'claimed', dec.claimed);
check(Math.round(dec.total) === Math.round(G.s.total) && dec.claimed === Math.round(G.s.total), 'score code decodes to game total');
const oldCode = Buffer.from(JSON.stringify({ n: 'Old', m: 'A', d: 0, t: 42100, h: Array(10).fill([0, 800, 0]) })).toString('base64');
check(Math.round(w.__decode(oldCode).total) === 42100, 'old score codes still decode under the old rules');

// Teacher tab: code, deletes, class view
d.querySelector('#tabTeacher').click();
check(!d.querySelector('#codes'), 'teacher tab is locked');
d.querySelector('#tcode').value = '1234'; click('#tgo');
check(!d.querySelector('#codes') && /not right/.test(d.querySelector('#tmsg').textContent), 'wrong teacher code is refused');
d.querySelector('#tcode').value = '0987'; click('#tgo');
check(!!d.querySelector('#codes'), 'teacher code 0987 unlocks');
await tick();
{ const n0 = d.querySelectorAll('#lbAdmin .adm').length, row = [...d.querySelectorAll('#lbAdmin .adm')].find((r) => /Cheat/.test(r.textContent));
  check(n0 === Object.keys(store).length && !!row, 'teacher sees every saved game');
  check([...d.querySelectorAll('#lbAdmin .adm')].some((r) => /Oldie/.test(r.textContent) && /Old version/.test(r.textContent)), 'teacher sees old-rules entries labelled');
  row.querySelector('button').click(); check(!!store['-A0'], 'first delete click only arms the button');
  row.querySelector('button').click(); await tick();
  check(!store['-A0'] && d.querySelectorAll('#lbAdmin .adm').length === n0 - 1, 'second click deletes the entry'); }
d.querySelector('#codes').value = code + '\n' + oldCode + '\n';
d.querySelector('#build').click();
check(d.querySelectorAll('#lb table tr').length === 3 && /old rules/.test(d.querySelector('#lb').textContent), 'teacher code table reads new and old codes');
click('#openClass'); await tick();
check(!!d.querySelector('#cvBoard') && /Test Team/.test(d.querySelector('#cvBoard').textContent) && /Reorder level/.test(d.querySelector('#cvChart').textContent), 'class view shows the board and class chart');
click('#cvBack');

// 9. Leaderboard tab renders
d.querySelector('#tabLb').click(); await tick();
check(/Test Team/.test(d.querySelector('#lbBox').textContent) && d.querySelector('#lbSet') && d.querySelector('#lbLvl'), 'leaderboard tab lists players with world and level pickers');

// 4b. A game built to stock out: reorder level 0, order 400
d.querySelector('#tabPlay').click();
w.__start('Out Team', 'A', 0);
check(!d.querySelector('#helpModal'), 'How to play does not open by itself again');
for (let r = 1; r <= 10; r++) {
  setRange('#bf', 0); setRange('#qy', 400); answer();
  click('#run');
  const h = w.__G().last;
  if (h.stockout) { sawOut++; check(sadCount() > 0 && lostShown(), `low-stock round ${r}: sad cat and Lost sale label`); }
  else check(sadCount() === 0 && !lostShown(), `low-stock round ${r}: no sad cats`);
  click('#next');
}
check(sawOut > 0, 'played at least one stock-out round');
await tick();

// 10. Private Hard game, questions off: nothing sent; make or buy works
const before = posts.length;
d.querySelector('#fresh').click();
d.querySelector('#nm').value = 'Private Pat'; d.querySelector('#priv').checked = true; d.querySelector('#quizOn').checked = false;
d.querySelector('.world.lvl[data-h="1"]').click();
d.querySelector('#worldPick .world[data-m="H"]').click(); click('#go');
check(w.__G().mode === 'H' && w.__G().hard && !w.__G().quiz, 'picking Chaotic world, Hard, no questions starts it');
check(d.querySelectorAll('.optrow.three .opt').length === 3 && d.querySelector('.opt[data-d="2"]').classList.contains('off'), 'Hard shows global, local and make (locked until built)');
let sawGoodwill = false;
for (let r = 1; r <= 10; r++) {
  check(!d.querySelector('#quiz'), `round ${r}: no question when questions are off`);
  if (r === 2) { setRange('#bf', 0); setRange('#qy', 400); }
  if (r === 1) { setRange('#bf', 800); check(w.__G().lev.rl === 2400 && /800 x 2 weeks = 2,400/.test(d.querySelector('#rlcalc').textContent), 'Hard: global supplier plans on a 2-week lead time');
    d.querySelectorAll('.opt')[1].click(); check(w.__G().lev.rl === 1600, 'Hard: switching to local recalculates the reorder level'); d.querySelectorAll('.opt')[0].click(); }
  if (r === 4) {
    check(!!d.querySelector('.opt[data-d="2"] #buildBtn'), 'round 4 offers to build the canning line on the Make card');
    click('#buildBtn'); check(d.querySelector('.opt[data-d="2"]').classList.contains('sel'), 'building selects Make'); setRange('#bf', 800); setRange('#qy', 1200);
  }
  if (w.__G().s.goodwill > 0 && /unhappy cats/.test(d.body.textContent)) sawGoodwill = true;
  click('#run');
  const h = w.__G().last;
  if (r === 4) check(h.built === 4 && h.lev.sup === 2 && /Capacity utilisation/.test(d.body.textContent) && /Canning line fixed cost/.test(d.body.textContent), 'building the line lets you make your own and shows capacity utilisation');
  click('#next');
}
check(sawGoodwill, 'Hard: a stock-out shows lower demand next round');
await tick();
check(posts.length === before, 'private game is not saved');
check(/stay off the leaderboard/.test(d.querySelector('#lbBox').textContent), 'private game explains it was not added');
check(/Hard/.test(d.body.textContent) && /local supplier/.test(d.body.textContent), 'Hard end screen describes the Hard benchmarks');

// Question bank: varied, no repeats within a game, every right answer marked correct
{ w.__opts({ quiz: true, hard: false }); const kinds = new Set(); let bad = 0;
  for (let seed = 1; seed <= 40; seed++) {
    w.__start('Q', 'S', seed); const seen = [];
    for (let r = 1; r <= 10; r++) { if (d.querySelector('#quiz')) { seen.push(d.querySelector('.qt').textContent); answer(true); if (!/Correct/.test(d.querySelector('#qfb').textContent)) bad++; } click('#run'); click('#next'); }
    seen.forEach((x) => kinds.add(x.replace(/[0-9,$%]+/g, '#')));
    if (seen.length !== 3 || new Set(seen).size !== 3) bad++;
  }
  check(kinds.size >= 15 && bad === 0, `question bank is varied (${kinds.size} kinds over 40 games) and every right answer is marked correct`); }

{ const b = (k, x) => ({ n: 'B' + k, m: 'S', d: 7, v: 2, x: 0, h: Array.from({ length: 10 }, (_, i) => [1600, 1200, 0, 0, x(i)]) });
  const W = w.eval('(o)=>o'); // run lbCheck through a score code round trip
  const code = (o) => Buffer.from(JSON.stringify(o)).toString('base64');
  const plain = w.__decode(code(b(0, () => 0))).total, two = w.__decode(code(b(1, (i) => (i === 1 || i === 4 ? 1 : 0)))).total;
  check(two - plain === 1000, 'score codes include question bonuses'); }

// Term help buttons
{ w.__start('Tips', 'S', 3); const tips = [...d.querySelectorAll('button.tip')].map((b) => b.dataset.tip);
  check(['reorder', 'qty', 'bulk', 'supplier', 'buffer', 'lead', 'chart', 'profit', 'usage'].every((k) => tips.includes(k)), 'round screen has ? help on the key terms');
  const sel = d.querySelector('.opt.sel'); d.querySelector('button.tip[data-tip="supplier"]').click();
  const box = d.querySelector('.tipbox');
  check(!box.hidden && /Single or dual supplier/.test(box.textContent) && /Dual: delays capped/.test(box.querySelector('.eq').textContent), 'tapping ? shows the definition and equation');
  d.querySelector('button.tip[data-tip="reorder"]').click();
  check(/buffer stock \+ \(usage x lead time\)/.test(box.querySelector('.eq').textContent) && d.querySelector('.opt.sel') === sel, 'help switches terms and does not change choices');
  d.body.click(); check(box.hidden, 'clicking elsewhere hides the help'); }

{ // results picture uses the normal delivery time, not this round's delay
  w.__opts({ quiz: false, hard: false }); w.__start('Buf', 'A', 0);
  for (let r = 1; r <= 5; r++) { setRange('#bf', 800);
    if (r === 5) check(/takes 3 weeks, not 1\. You will sell 1,600 more while you wait: your 800 buffer will be used up and you will be 800 short|take 3 weeks, not 1, but you are not ordering this round/.test(d.querySelector('#bfo').textContent), 'a delay round warns that the buffer will be used up and how short you will be');
    click('#run'); if (r < 5) click('#next'); }
  check(w.__G().last.card.delay === 2 && d.querySelector('#scBf').getAttribute('data-cans') === '8' && !/No buffer/.test(d.querySelector('#scBfT').textContent), 'results after a delay round show the planned buffer at normal delivery time'); }

{ w.__opts({ quiz: false, hard: false }); w.__start('Zero', 'A', 0);
  check(d.querySelector('#qy').getAttribute('min') === '0', 'reorder quantity slider starts at 0');
  setRange('#qy', 0); check(/reorder quantity is 0/.test(d.querySelector('#prev').textContent), 'reorder quantity 0 means no order');
  click('#run'); check(!w.__G().last.ordered, 'no order is placed with reorder quantity 0'); }

// Same name warning and top-three scores
{ d.querySelector('#tabPlay').click();
  for (let k = 0; k < 30 && !d.querySelector('#fresh'); k++) { answer(); if (d.querySelector('#run')) click('#run'); else if (d.querySelector('#next')) click('#next'); }
  d.querySelector('#fresh').click(); await tick();
  d.querySelector('#priv').checked = false; d.querySelector('#nm').value = 'test team'; d.querySelector('#nm').dispatchEvent(new w.Event('input'));
  check(/already on this week's leaderboard/.test(d.querySelector('#nmWarn').textContent), 'warns when the name is already on the leaderboard');
  const before = w.__G(); click('#go');
  check(w.__G() === before && /Start with this name/.test(d.querySelector('#go').textContent), 'first Start press with a taken name only asks to confirm');
  click('#go'); check(w.__G() !== before && w.__G().name === 'test team', 'second press keeps the name and starts');
  d.querySelector('#tabLb').click(); await tick();
  const nm = [...d.querySelectorAll('#lbBox .poptip')].find((x) => /Test Team/i.test(x.textContent));
  nm.click(); const box = d.querySelector('.tipbox');
  check(!!nm && !box.hidden && /top (score|\d scores)/.test(box.textContent) && /\$/.test(box.textContent), 'leaderboard names show their top scores');
  d.body.click(); d.querySelector('#tabPlay').click(); }

// 1. No uncaught errors
check(errs.length === 0, 'no uncaught errors' + (errs.length ? ': ' + errs.join(' | ') : ''));

if (fails.length) { console.error(`\n${fails.length} check(s) FAILED`); process.exit(1); }
console.log('\nAll checks passed.');
process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
