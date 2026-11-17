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
  ok(await page.$eval('.chip', b => b.getAttribute('aria-pressed') === 'true'), 'only topic is picked by default');
  ok(JSON.stringify(await page.$$eval('#lengths button', l => l.map(b => b.textContent))) === '["6","12","All"]', 'lengths are 6, 12, All');
  await shot(page, 'setup-desktop');
  await page.click('.chip');
  ok(await page.$eval('#start', b => b.disabled), 'Start disabled with no topic');
  await page.click('.chip');
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

  ok(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(fails ? `\n${fails} failed` : '\nall passed');
  process.exit(fails ? 1 : 0);
})();
