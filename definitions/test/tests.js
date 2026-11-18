// Definition Drill browser tests: setup, tap to place, mouse drag, touch drag from the grip,
// page scroll, a full round, retry missed (with unscored fillers).
const puppeteer = require(process.env.DD_MODS + '/puppeteer-core');
const URL = process.env.DD_URL;
const SHOTS = process.env.DD_SHOTS;
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) fails++; };
const shot = (page, name) => SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }) : null;
const text = (page, sel) => page.$eval(sel, e => e.textContent);

// the answer key for the current board: [{slot:'t-i', fid}]
const key = page => page.evaluate(() =>
  [...document.querySelectorAll('#terms .slot')].map(s => {
    const [t, i] = s.dataset.slot.split('-').map(Number);
    return { slot: s.dataset.slot, fid: state.frags.find(f => f.t === t && f.part === i).id };
  }));
// swap the answers of the first term's two slots
const swapFirst = k => { const a = k.map(x => ({ ...x })); [a[0].fid, a[1].fid] = [a[1].fid, a[0].fid]; return a; };

async function solveByTap(page, k) {
  for (const [n, { slot, fid }] of k.entries()) {
    if (n % 2) { await page.click(`.slot[data-slot="${slot}"]`); await page.click(`.frag[data-f="${fid}"]`); }
    else { await page.click(`.frag[data-f="${fid}"]`); await page.click(`.slot[data-slot="${slot}"]`); }
  }
}
async function center(page, sel) {
  return page.$eval(sel, e => { e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
}
async function solveByDrag(page, k, touch) {
  for (const { slot, fid } of k) {
    const a = await center(page, `.frag[data-f="${fid}"] ${touch ? '.grip' : '.txt'}`);
    const b = await page.$eval(`.slot[data-slot="${slot}"]`, e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    if (touch) {
      await page.touchscreen.touchStart(a.x, a.y);
      for (let s = 1; s <= 12; s++) await page.touchscreen.touchMove(a.x + (b.x - a.x) * s / 12, a.y + (b.y - a.y) * s / 12);
      await page.touchscreen.touchEnd();
    } else {
      await page.mouse.move(a.x, a.y); await page.mouse.down();
      for (let s = 1; s <= 12; s++) await page.mouse.move(a.x + (b.x - a.x) * s / 12, a.y + (b.y - a.y) * s / 12);
      await page.mouse.up();
    }
    await new Promise(r => setTimeout(r, 30));
  }
}
const placedRight = (page, k) => page.evaluate(k => k.every(({ slot, fid }) => state.placed[slot] === fid), k);

(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  // ---- desktop, mouse ----
  await page.setViewport({ width: 1100, height: 1000 });
  await page.goto(URL, { waitUntil: 'networkidle0' });
  ok(await page.$$eval('.unit', l => l.length) === 6, 'five units plus toolkit on the start page');
  ok(await page.evaluate(() => DEFS.length) === 486, 'all 486 terms');
  ok(await page.evaluate(() => DEFS.filter(d => d.review).length) === 55, 'BM: 55 terms flagged for review');
  ok(await page.$eval('.unit[data-u="6"]', u => [...u.querySelectorAll('.chip.sub')].map(c => c.textContent.replace(/\d+$/, '')).join()) === 'Key concepts,Toolkit', 'concepts and toolkit grouped last');
  ok(await page.$eval('.unit[data-u="1"]', u => !u.textContent.includes('concepts')), 'concepts not in Unit 1');
  ok(await page.$eval('.unit[data-u="1"] .wholes', w => w.querySelectorAll('.chip').length === 1 && w.textContent.startsWith('Whole unit6')), 'Unit 1 (no HL terms) has one Whole unit button');
  ok(await page.$eval('#start', b => b.disabled), 'Start disabled with nothing picked');
  ok(JSON.stringify(await page.$$eval('#lengths button', l => l.map(b => b.textContent))) === '["6","12","All"]', 'lengths are 6, 12, All');
  const HR = '.unit[data-u="2"]', FIN = '.unit[data-u="3"]';
  const pressed = sel => page.$eval(sel, b => b.getAttribute('aria-pressed') === 'true');
  const hrSL = await page.evaluate(() => DEFS.filter(d => d.unit === 2 && !d.hl).length);
  ok(await page.$$eval('.unit .chips', l => l.every(s => s.hidden)), 'subtopics start folded');
  ok(await page.$$eval(`${HR} .chip.sub`, l => l.length) === 7, 'HR has 7 subtopics');
  ok(await page.$$eval(`${FIN} .chip.sub`, l => l.length) === 9, 'Finance has 9 subtopics');
  ok(await page.$eval(HR, u => [...u.querySelectorAll('.chip.sub')].filter(c => c.querySelector('.hl')).map(c => c.textContent.slice(0, 3)).join()) === '2.5,2.7', 'HL marked on 2.5 and 2.7');
  await page.click(`${HR} .fold`);
  ok(await page.$eval(`${HR} .chips`, s => !s.hidden) && await page.$eval(`${FIN} .chips`, s => s.hidden), 'Subtopics unfolds only that unit');
  await page.click(`${HR} .whole.hl`);
  ok(await page.$$eval(`${HR} .chip.sub`, l => l.every(c => c.getAttribute('aria-pressed') === 'true')), 'Whole unit HL picks every HR subtopic');
  ok(await text(page, '#picked') === '105 terms picked', '105 HR terms picked');
  await page.click(`${HR} .chip.sub:nth-child(1)`);   // drop 2.1
  ok(!await pressed(`${HR} .whole.hl`), 'dropping a subtopic turns Whole unit off');
  await page.click(`${HR} .whole.hl`); await page.click(`${HR} .whole.hl`);
  ok(await page.$eval('#start', b => b.disabled), 'Whole unit HL again clears it');
  await page.click(`${HR} .whole.sl`);
  ok(await text(page, '#picked') === `${hrSL} terms picked` && hrSL < 105, `Whole unit SL picks the ${hrSL} SL terms`);
  ok(await pressed(`${HR} .whole.sl`) && !await pressed(`${HR} .whole.hl`), 'SL on, HL off');
  ok(await page.$eval(HR, u => [...u.querySelectorAll('.chip.sub')].filter(c => c.getAttribute('aria-pressed') !== 'true').map(c => c.textContent.slice(0, 3)).join()) === '2.5,2.7', 'SL leaves only the HL-only subtopics off');
  ok(await page.evaluate(() => { const c = [...document.querySelectorAll('.chip.sub')].find(c => c.textContent.startsWith('2.4')); return +c.querySelector('.n').textContent < c._g.length; }), '2.4 shows its SL count');
  await page.click(`${HR} .chip.sub:nth-child(4)`); await page.click(`${HR} .chip.sub:nth-child(4)`);   // 2.4 off and on again
  ok(await pressed(`${HR} .whole.sl`), 'after Whole unit SL, a subtopic comes back as SL only');
  await page.click(`${HR} .whole.hl`);
  ok(await text(page, '#picked') === '105 terms picked' && !await pressed(`${HR} .whole.sl`), 'HL after SL picks all 105');
  await page.click(`${FIN} .whole.sl`);
  ok(await pressed(`${HR} .whole.hl`) && await pressed(`${FIN} .whole.sl`), 'HR at HL and Finance at SL together');
  await page.click(`${FIN} .whole.sl`);
  await page.click(`${FIN} .fold`);
  await page.click(`${FIN} .chip.sub:nth-child(2)`);   // 3.2 on top of all of HR
  ok(await text(page, '#picked') === `${105 + await page.$eval(`${FIN} .chip.sub:nth-child(2) .n`, n => +n.textContent)} terms picked`, 'a whole unit plus a subtopic from another unit');
  await shot(page, 'setup-desktop');
  await page.click(`${FIN} .chip.sub:nth-child(2)`); await page.click(`${HR} .whole.hl`);
  ok(await page.$eval('#start', b => b.disabled), 'all cleared');

  // 3.1 has only 2 terms: the board is filled to 3 with an unscored Finance term
  await page.click(`${FIN} .chip.sub:nth-child(1)`);
  ok((await text(page, '#picked')) === '2 terms picked', '3.1 has 2 terms');
  await page.click('#start');
  ok(await page.$$eval('#terms .term', l => l.length) === 3, 'a 2-term pick still gives a 3-term board');
  ok(await page.evaluate(() => state.boards[0].filter(x => x.extra).every(x => x.d.unit === 3) && state.scored === 2), 'filler is from Finance and unscored');
  { const k = await key(page); await solveByTap(page, k); }
  await page.click('#check'); await page.click('#next');
  ok(await text(page, '#final') === '2 / 2', 'score counts only the 2 picked terms');
  await page.click('#change');
  ok(await page.$eval(`${FIN} .chips`, s => !s.hidden), 'unfolded units stay open after a round');
  await page.click(`${FIN} .chip.sub:nth-child(1)`);   // drop 3.1

  const pick27 = () => page.evaluate(() => [...document.querySelectorAll('.chip.sub')].find(c => c.textContent.startsWith('2.7')).click());
  await pick27();
  await page.click('#start');                             // default 6
  ok(await text(page, '#progress') === '1 of 2', '6 terms = 2 boards');
  ok(await page.$$eval('#terms .term', l => l.length) === 3, '3 terms on a board');
  ok(await page.$$eval('#pool .frag', l => l.length) === 6, '6 pieces in the pool');
  ok(await page.$eval('#check', b => b.disabled), 'Check disabled until every piece is placed');
  await shot(page, 'board-desktop');

  // board 1: taps (piece then box, and box then piece), all right
  let k = await key(page);
  await solveByTap(page, k);
  ok(await placedRight(page, k), 'tapping places pieces (either order)');
  ok(await page.$eval('#check', b => !b.disabled), 'Check enabled when all placed');
  // tap a placed piece, then the pool: it goes back; then put it back
  await page.click(`.slot[data-slot="${k[0].slot}"] .frag`);
  await page.click('.poolwrap .label');
  ok(await page.$$eval('#pool .frag', l => l.length) === 1, 'selected placed piece returns to the pool');
  await page.click(`.frag[data-f="${k[0].fid}"]`); await page.click(`.slot[data-slot="${k[0].slot}"]`);
  // swap two placed pieces by tapping one then the other
  await page.click(`.slot[data-slot="${k[0].slot}"] .frag`); await page.click(`.slot[data-slot="${k[2].slot}"] .frag`);
  ok(await page.evaluate(k => state.placed[k[0].slot] === k[2].fid && state.placed[k[2].slot] === k[0].fid, k), 'tapping two placed pieces swaps them');
  await page.click(`.slot[data-slot="${k[0].slot}"] .frag`); await page.click(`.slot[data-slot="${k[2].slot}"] .frag`);
  ok(await placedRight(page, k), 'swap back');
  await page.click('#check');
  ok(await page.$$eval('.term.right', l => l.length) === 3, 'all 3 terms right');
  ok(await text(page, '#score') === '3 right', 'score 3');
  await page.click('#next');

  // board 2: mouse drag, first term's parts swapped
  k = await key(page);
  await solveByDrag(page, swapFirst(k), false);
  ok(await placedRight(page, swapFirst(k)), 'mouse drag places pieces');
  await page.evaluate(() => scrollTo(0, 0));
  // drag a placed piece onto another slot: swap
  await solveByDrag(page, [{ slot: k[2].slot, fid: k[4].fid }], false);
  ok(await page.evaluate(k => state.placed[k[2].slot] === k[4].fid && state.placed[k[4].slot] === k[2].fid, k), 'dragging onto a filled box swaps');
  await solveByDrag(page, [{ slot: k[2].slot, fid: k[2].fid }], false);
  await page.click('#check');
  ok(await page.$$eval('.term.wrong', l => l.length) === 1, 'one term wrong');
  ok(await page.$eval('.term.wrong .fix', e => !e.hidden && e.textContent.length > 40), 'wrong term shows the full definition');
  ok(await page.$$eval('.frag.bad', l => l.length) === 2, 'two pieces marked wrong');
  await shot(page, 'checked-desktop');
  ok(await text(page, '#next') === 'See score', 'last board says See score');
  await page.click('#next');
  ok(await text(page, '#final') === '5 / 6', 'end score 5 / 6');
  ok(await page.$$eval('#missed li', l => l.length) === 1, '1 missed listed');
  await shot(page, 'end');

  // retry: 1 missed + 2 unscored fillers
  await page.click('#retry');
  ok(await page.$$eval('#terms .term', l => l.length) === 3, 'retry board still has 3 terms');
  k = await key(page);
  await solveByTap(page, k);
  await page.click('#check'); await page.click('#next');
  ok(await text(page, '#final') === '1 / 1', 'retry scores only the missed term');
  ok(await page.$eval('#retry', e => e.hidden), 'no Retry missed when nothing was missed');
  await page.click('#change');
  ok(!(await page.$eval('#setup', e => e.hidden)), 'Change topics goes back to setup');

  // ---- phone, touch ----
  await page.setViewport({ width: 390, height: 1700, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: 'networkidle0' });
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll on setup (phone)');
  await shot(page, 'setup-phone');
  await pick27();
  await page.click('#lengths button:nth-child(3)');   // All
  await page.click('#start');
  ok(await text(page, '#progress') === '1 of 5', 'All = 15 terms = 5 boards');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll on board (phone)');
  k = await key(page);
  await solveByDrag(page, k, true);
  ok(await placedRight(page, k), 'touch drag from the grip places pieces');
  await page.click('#check');
  ok(await text(page, '#score') === '3 right', 'touch-placed board marked right');
  await page.click('#next');
  await page.setViewport({ width: 390, height: 700, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await shot(page, 'board-phone');
  // tap the grip (no move) selects the piece
  k = await key(page);
  const g = await center(page, `.frag[data-f="${k[0].fid}"] .grip`);
  await page.touchscreen.tap(g.x, g.y);
  await new Promise(r => setTimeout(r, 50));
  ok(await page.evaluate(() => typeof state.sel === 'number'), 'tapping a grip selects the piece');
  await page.touchscreen.tap(g.x, g.y);

  // scroll: a swipe on a piece's text scrolls the page; one on the grip does not
  const swipe = async (x, y) => {
    await page.touchscreen.touchStart(x, y);
    for (let s = 1; s <= 10; s++) await page.touchscreen.touchMove(x, y - 15 * s);
    await page.touchscreen.touchEnd();
    await new Promise(r => setTimeout(r, 300));
  };
  const first = '#pool .frag:first-child';
  await page.evaluate(sel => { document.querySelector(sel).scrollIntoView({ block: 'center' }); }, first);
  let y0 = await page.evaluate(() => scrollY);
  let p = await page.$eval(first + ' .txt', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await swipe(p.x, p.y);
  let y1 = await page.evaluate(() => scrollY);
  ok(y1 - y0 > 40, `swipe on a piece's text scrolls the page (${y0} -> ${y1})`);
  ok(await page.evaluate(() => Object.keys(state.placed).length === 0), 'that swipe placed nothing');
  await page.evaluate(sel => { document.querySelector(sel).scrollIntoView({ block: 'center' }); }, first);
  y0 = await page.evaluate(() => scrollY);
  p = await page.$eval(first + ' .grip', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await swipe(p.x, p.y);
  y1 = await page.evaluate(() => scrollY);
  ok(Math.abs(y1 - y0) < 30,`swipe on a grip drags instead of scrolling (${y0} -> ${y1})`);

  // ---- landing page ----
  await page.goto(process.env.DD_ROOT, { waitUntil: 'networkidle0' });
  ok(JSON.stringify(await page.$$eval('a.subj', l => l.map(a => a.getAttribute('href')))) === '["business/","economics/"]', 'landing links to both subjects');
  ok(await page.$eval('main', m => /IB style definitions/.test(m.textContent)), 'landing says IB style definitions');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll on landing (phone)');
  await shot(page, 'landing-phone');
  await page.click('a.subj[href="economics/"]'); await page.waitForSelector('.unit');

  // ---- economics ----
  await page.setViewport({ width: 1100, height: 1000 });
  ok(await page.$eval('.mast .sub', e => e.textContent) === 'IB Economics', 'economics page from the landing link');
  ok(await page.evaluate(() => DEFS.length) === 793 && await page.$$eval('.unit', l => l.length) === 4, 'economics: 793 terms in 4 units');
  ok(await page.$eval('.unit[data-u="1"] .wholes', w => w.querySelectorAll('.chip').length === 1), 'economics Unit 1 (no HL) has one Whole unit button');
  ok(await page.$eval('.unit[data-u="2"]', u => [...u.querySelectorAll('.chip.sub')].filter(c => c.querySelector('.hl')).map(c => c.textContent.split(' ')[0]).join()) === '2.4,2.10,2.11,2.12', 'economics HL marked on 2.4, 2.10, 2.11, 2.12');
  await shot(page, 'econ-setup');
  // a board holding a one-part term: 1 box for it, pieces still all placed and marked
  await page.evaluate(() => {
    const one = DEFS.filter(d => d.p.length === 1), two = DEFS.filter(d => d.p.length === 2);
    state.picks = new Set([one[0], two[0], two[1]]);
    startRound([one[0], two[0], two[1]].map(d => ({ d })));
  });
  ok(await page.$$eval('#terms .slot', l => l.length) === 5 && await page.$$eval('#pool .frag', l => l.length) === 5, 'one-part term gets one box (5 pieces)');
  k = await key(page);
  await solveByTap(page, k);
  await page.click('#check');
  ok(await page.$$eval('.term.right', l => l.length) === 3, 'board with a one-part term marks all right');
  await page.click('#next');
  ok(await text(page, '#final') === '3 / 3', 'economics round scores 3 / 3');
  await page.click('#change');
  // review-flagged terms are played with a small "subject to review" tag, on the card and in the full definition
  ok(await page.evaluate(() => DEFS.filter(d => d.review).length) === 64, 'economics: 64 terms flagged for review');
  await page.evaluate(() => {
    const r = DEFS.filter(d => d.review), n = DEFS.filter(d => !d.review && d.p.length === 2);
    startRound([r[0], n[0], n[1]].map(d => ({ d })));
  });
  ok(JSON.stringify(await page.$$eval('#terms .term h3', l => l.map(h => !!h.querySelector('.rev')))) === '[true,false,false]', 'only the flagged term shows subject to review');
  k = await key(page);
  await solveByTap(page, swapFirst(k));
  await page.click('#check');
  ok(await page.$eval('.term.wrong .fix', e => e.textContent.includes('subject to review')), 'full definition keeps the review note');
  await shot(page, 'econ-review');
  await page.click('#next'); await page.click('#change');
  await page.click('.unit[data-u="3"] .whole.sl');
  await page.click('#start');
  ok(await page.$$eval('#terms .term', l => l.length) === 3 && await text(page, '#progress') === '1 of 2', 'economics Unit 3 SL round starts');

  ok(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(fails ? `\n${fails} failed` : '\nall passed');
  process.exit(fails ? 1 : 0);
})();
