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
  ok(JSON.stringify(await page.$$eval('#lengths button', l => l.map(b => b.textContent))) === '["6","12","18","All"]', 'lengths are 6, 12, 18, All');
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
  ok(await page.$$eval('#pool .frag', l => l.length) === 8, '8 pieces in the pool (6 + 2 spares)');
  ok(await page.evaluate(() => {
    const sp = state.frags.filter(f => f.t === -1), real = state.frags.filter(f => f.t >= 0);
    const onBoard = new Set(state.boards[state.b].map(x => x.d));
    return sp.length === 2 && sp.every(s => !real.some(r => r.text === s.text)) &&
      sp.every(s => DEFS.some(d => !onBoard.has(d) && d.p.map(clean).includes(s.text)));
  }), '2 spares, taken from terms not on the board');
  ok(await page.$eval('#check', b => b.disabled), 'Check disabled until every box is filled');
  await shot(page, 'board-desktop');

  // board 1: taps (piece then box, and box then piece), all right
  let k = await key(page);
  await solveByTap(page, k);
  ok(await placedRight(page, k), 'tapping places pieces (either order)');
  ok(await page.$eval('#check', b => !b.disabled) && await page.$$eval('#pool .frag', l => l.length) === 2, 'Check enabled when all boxes are filled, 2 spares left');
  ok(await text(page, '#left') === '2 spare', 'label says 2 spare');
  // a spare in a box: Check stays enabled, the box is marked wrong
  { const sp = await page.evaluate(() => state.frags.find(f => f.t === -1).id);
    await page.click(`.frag[data-f="${sp}"]`); await page.click(`.slot[data-slot="${k[0].slot}"]`);
    ok(await page.evaluate((k, sp) => state.placed[k[0].slot] === sp, k, sp) && await page.$eval('#check', b => !b.disabled), 'a spare can go in a box (swaps out the piece)');
    await page.click(`.frag[data-f="${k[0].fid}"]`); await page.click(`.slot[data-slot="${k[0].slot}"]`);
    ok(await placedRight(page, k), 'and swaps back'); }
  // tap a placed piece, then the pool: it goes back; then put it back
  await page.click(`.slot[data-slot="${k[0].slot}"] .frag`);
  await page.click('.poolwrap .label');
  ok(await page.$$eval('#pool .frag', l => l.length) === 3, 'selected placed piece returns to the pool');
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
  await page.click('#lengths button:nth-child(4)');   // All
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

  // ---- every picked term is asked before any repeats (BM 2.7, 15 terms, rounds of 6) ----
  await page.evaluate(() => localStorage.clear());
  await page.goto(URL, { waitUntil: 'networkidle0' });
  const playRound = async () => {
    await page.click('#start');
    const asked = await page.evaluate(() => state.boards.flat().filter(x => !x.extra).map(x => x.d.term));
    while (await page.$eval('#play', e => !e.hidden)) {
      await solveByTap(page, await key(page)); await page.click('#check'); await page.click('#next');
    }
    await page.click('#change');
    return asked;
  };
  await pick27();
  ok(await text(page, '#fresh') === '', 'nothing asked yet: no note');
  const r1 = await playRound(), r2 = await playRound();
  ok(r1.length === 6 && r2.length === 6 && r1.every(t => !r2.includes(t)), 'second round asks 6 different terms');
  ok(await text(page, '#fresh') === '· 3 not asked yet', 'start line says 3 not asked yet');
  const r3 = await playRound();
  ok(new Set([...r1, ...r2, ...r3]).size === 15, 'three rounds cover all 15 terms before repeating');
  ok(await text(page, '#fresh') === '· 9 not asked yet', 'a fresh cycle starts once all 15 were asked');
  await page.reload({ waitUntil: 'networkidle0' });
  await pick27();
  ok(await text(page, '#fresh') === '· 9 not asked yet', 'asked terms are remembered after a reload');

  // ---- progress bars (last result per term, no numbers) and the glossary ----
  const strip27 = () => page.evaluate(() => {
    const s = [...document.querySelectorAll('.chip.sub')].find(c => c.textContent.startsWith('2.7')).querySelector('.strip');
    return [...s.children].map(i => i.className).join('');
  });
  ok(await strip27() === 'r'.repeat(15), '2.7 strip: 15 segments, all right after three clean rounds');
  ok(await page.$eval('.unit[data-u="2"] .ubar', b => b.children.length === 1 && Math.abs(parseFloat(b.firstChild.style.width) - 15 / 105 * 100) < 0.01), 'HR unit bar filled 15/105');
  ok(await page.$eval('.unit[data-u="3"] .ubar', b => b.children.length === 0), 'untouched unit bar is empty');
  ok(await page.$$eval('.strip, .ubar', l => l.every(s => !s.textContent)), 'bars carry no numbers');
  await page.click('#start');
  { const k1 = await key(page); await solveByTap(page, swapFirst(k1)); }
  const missedTerm = await page.evaluate(() => state.boards[0][0].d.term);
  await page.click('#check'); await page.click('#next');
  await solveByTap(page, await key(page)); await page.click('#check'); await page.click('#next');
  await page.click('#change');
  ok(await strip27() === 'r'.repeat(14) + 'm', 'a missed term turns amber (last result counts)');
  await page.click('#tabs [data-v="gloss"]');
  ok(await page.$eval('#setup', e => e.hidden) && await page.$eval('#gloss', e => !e.hidden), 'Glossary tab swaps the view');
  ok(await page.$$eval('#gunits .gunit', l => l.length) === 6 && await page.$$eval('#gunits .gterm', l => l.length) === 486, 'glossary lists all 486 terms in 6 units');
  await page.click('#filters [data-f="m"]');
  ok(await page.$$eval('#gunits .gterm', (l, t) => l.length === 1 && l[0].querySelector('summary').textContent.startsWith(t), missedTerm), 'Missed shows only the missed term');
  await page.click('#gunits .gterm summary');
  ok(await page.$eval('#gunits .gdef', e => e.offsetHeight > 0 && e.querySelector('.again')), 'tapping a term opens its definition');
  await page.click('#filters [data-f="r"]');
  ok(await page.$$eval('#gunits .gterm', l => l.length) === 14 && await page.$$eval('#gunits .gterm .dot.r', l => l.length) === 14, 'Right shows the 14');
  await page.click('#filters [data-f="r"]');
  ok(await page.$$eval('#gunits .gterm', l => l.length) === 486, 'tapping the filter again shows all');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll on glossary (phone)');
  await shot(page, 'glossary-phone');
  // clear progress: first tap becomes Keep, the confirm sits at the top and ignores a quick second tap
  await page.click('#clearBtn');
  ok(await text(page, '#clearBtn') === 'Keep my progress' && await page.$eval('#clearConfirm', e => !e.hidden), 'Clear asks for a confirm at the top');
  await page.click('#clearYes');
  ok(await page.evaluate(() => Object.keys(last).length) === 15, 'a too-quick confirm does nothing');
  await page.click('#clearBtn');
  ok(await page.$eval('#clearConfirm', e => e.hidden), 'Keep my progress cancels');
  await page.click('#clearBtn'); await new Promise(r => setTimeout(r, 600)); await page.click('#clearYes');
  ok(await page.evaluate(() => Object.keys(last).length === 0 && !localStorage.getItem('dd-last-business') && !localStorage.getItem('dd-seen-business')), 'confirm clears the progress');
  await page.click('#tabs [data-v="setup"]');
  ok(await strip27() === 'n'.repeat(15) && await text(page, '#fresh') === '', 'bars and asked marks are back to empty');

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
  ok(await page.$$eval('#terms .slot', l => l.length) === 5 && await page.$$eval('#pool .frag', l => l.length) === 7, 'one-part term gets one box (5 pieces + 2 spares)');
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

  // ---- review again (economics) ----
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  ok(await page.$eval('#againBlock', e => e.hidden), 'no Review again section with nothing saved');
  await page.evaluate(() => {   // a board with one Unit 2 and one Unit 4 term
    const a = DEFS.find(d => d.unit === 2 && d.p.length === 2), b = DEFS.find(d => d.unit === 4 && d.p.length === 2), c = DEFS.find(d => d.unit === 1 && d.p.length === 2);
    startRound([a, b, c].map(d => ({ d })));
  });
  ok(await page.$$eval('#terms .again', l => l.every(b => b.getAttribute('aria-pressed') === 'false')), 'Review again is off by default');
  await page.click('.term[data-t="0"] .again'); await page.click('.term[data-t="1"] .again');
  await page.click('.term[data-t="1"] .again'); await page.click('.term[data-t="1"] .again');   // off and on again
  ok(await page.$$eval('#terms .again', l => l.map(b => b.getAttribute('aria-pressed')).join()) === 'true,true,false', 'tapping marks terms (and unmarks)');
  ok(await page.evaluate(() => state.sel === null && Object.keys(state.placed).length === 0), 'marking a term does not touch the pieces');
  await page.reload({ waitUntil: 'networkidle0' });
  ok(await page.$eval('#againBlock', e => !e.hidden), 'saved terms survive a reload');
  ok(await page.$$eval('#againChips .chip', l => l.map(c => c.textContent).join()) === 'Whole course2,Unit 21,Unit 41', 'Whole course plus one button per unit');
  await page.click('#againChips .chip:nth-child(1)');
  ok(await text(page, '#picked') === '2 terms picked' && await pressed('#againChips .chip:nth-child(2)'), 'Whole course picks the saved terms');
  await page.click('#againChips .chip:nth-child(1)');
  await page.click('#againChips .chip:nth-child(3)');
  ok(await text(page, '#picked') === '1 term picked', 'a unit button picks only that unit\'s saved terms');
  await shot(page, 'again-setup');
  await page.click('#start');
  ok(await page.$$eval('#terms .term', l => l.length) === 3 && await page.evaluate(() => state.scored === 1), 'review round runs (fillers unscored)');
  ok(await page.$eval('#terms .again[aria-pressed="true"]', b => !!b), 'the saved term shows as marked on the board');
  k = await key(page); await solveByTap(page, swapFirst(k)); await page.click('#check'); await page.click('#next');
  ok(await page.$$eval('#missed li .again', l => l.length) === await page.$$eval('#missed li', l => l.length), 'To go over list has Review again buttons');
  await page.click('#change');
  await page.click('#againChips .fold');
  ok(await page.$eval('#gloss', e => !e.hidden) && await pressed('#filters [data-f="a"]'), 'List opens the glossary filtered to Review again');
  ok(await page.$$eval('#gunits .gterm', l => l.length) === 2, 'glossary lists the 2 saved terms');
  await page.click('#gunits .gterm summary');
  await page.click('#gunits .gterm .again');
  await page.click('#tabs [data-v="setup"]');
  ok(await page.$$eval('#againChips .chip', l => l[0].textContent) === 'Whole course1', 'unmarking in the glossary updates the Review again counts');

  // ---- report a definition (economics) ----
  await page.evaluate(() => { window._sent = []; window.fetch = async (u, o) => { _sent.push({ u, body: JSON.parse(o.body) }); return { ok: true, status: 200 }; }; });
  await page.evaluate(() => { state.picks.clear(); syncSetup(); });
  await page.click('#againChips .chip:nth-child(1)');
  await page.click('#start');
  ok(await page.$eval('#play', e => !e.hidden) && await page.$eval('#rpanel', e => e.hidden) && await text(page, '#rlink') === 'Report a definition', 'report link under the terms, panel closed');
  await page.click('#rlink');
  ok(await page.$$eval('#rpanel [data-rt]', l => l.length) === 3 && await page.$eval('#rsend', b => b.disabled), 'panel offers the 3 terms, Send waits for a pick');
  const rterm = await page.$eval('#rpanel [data-rt="1"]', b => b.textContent);
  await page.click('#rpanel [data-rt="1"]');
  await page.type('#rnote', 'second part looks off');
  await page.click('#rsend');
  await new Promise(r => setTimeout(r, 50));
  const sent = await page.evaluate(() => _sent);
  ok(sent.length === 1 && sent[0].u === 'https://unisam.nz/feedback/api/report' && sent[0].body.app === 'definitions' &&
    sent[0].body.message.startsWith(`Economics definition: ${rterm} (`) && sent[0].body.message.endsWith('second part looks off') &&
    JSON.parse(sent[0].body.diagram).term === rterm, 'report sends the chosen term and note to the feedback inbox');
  ok(await page.$eval('#rpanel', e => e.hidden) && (await text(page, '#rlink')).startsWith('Thanks, sent'), 'report says thanks');
  ok(await page.evaluate(() => Object.keys(state.placed).length === 0 && state.sel === null), 'reporting does not touch the pieces');
  await page.goto(URL, { waitUntil: 'networkidle0' });
  ok(await page.$eval('#againBlock', e => e.hidden), 'Business keeps its own list');

  ok(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(fails ? `\n${fails} failed` : '\nall passed');
  process.exit(fails ? 1 : 0);
})();
