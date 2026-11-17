// Definition Drill browser tests: setup, arrows, mouse drag, touch drag, scrolling, a full round, retry missed.
const puppeteer = require(process.env.DD_MODS + '/puppeteer-core');
const URL = process.env.DD_URL;
const SHOTS = process.env.DD_SHOTS;
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) fails++; };
const shot = (page, name) => SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }) : null;

const order = page => page.$$eval('#tiles .tile', ls => ls.map(l => +l.dataset.k));
const sorted = o => o.every((k, i) => k === i);

// sort with the arrow buttons only
async function sortWithArrows(page) {
  for (let guard = 0; guard < 20; guard++) {
    const o = await order(page);
    if (sorted(o)) return;
    const pos = o.findIndex((k, i) => k !== i);
    const from = o.indexOf(pos);              // tile that belongs at pos
    await page.click(`#tiles .tile:nth-child(${from + 1}) .up`);
  }
}

// sort by dragging: pick up the tile that belongs at pos and drop it above the tile now there
async function sortWithDrag(page, touch) {
  for (let guard = 0; guard < 10; guard++) {
    const o = await order(page);
    if (sorted(o)) return;
    const pos = o.findIndex((k, i) => k !== i);
    const from = o.indexOf(pos);
    const tiles = await page.$$('#tiles .tile');
    const a = await (await tiles[from].$('.txt')).boundingBox();
    const b = await tiles[pos].boundingBox();
    const x = a.x + 20, y0 = a.y + a.height / 2, y1 = b.y + 4;
    if (touch) {
      await page.touchscreen.touchStart(x, y0);
      for (let s = 1; s <= 10; s++) await page.touchscreen.touchMove(x, y0 + (y1 - y0) * s / 10);
      await page.touchscreen.touchEnd();
    } else {
      await page.mouse.move(x, y0); await page.mouse.down();
      for (let s = 1; s <= 10; s++) await page.mouse.move(x, y0 + (y1 - y0) * s / 10);
      await page.mouse.up();
    }
  }
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  // ---- desktop, mouse ----
  await page.setViewport({ width: 1100, height: 900 });
  await page.goto(URL, { waitUntil: 'networkidle0' });
  ok(await page.$eval('.chip', b => b.getAttribute('aria-pressed') === 'true'), 'only topic is picked by default');
  ok(await page.$eval('#start', b => !b.disabled), 'Start is enabled');
  await shot(page, 'setup-desktop');
  await page.click('.chip');
  ok(await page.$eval('#start', b => b.disabled), 'Start disabled with no topic');
  await page.click('.chip');
  await page.click('#lengths button:nth-child(1)');   // 5
  await page.click('#start');
  ok(await page.$eval('#progress', e => e.textContent) === '1 of 5', 'round of 5 starts');
  ok((await order(page)).length === 3, 'term plus two parts = 3 tiles');
  ok(!sorted(await order(page)), 'tiles start shuffled');
  await shot(page, 'question-desktop');

  // Q1: arrows, right
  await sortWithArrows(page);
  ok(sorted(await order(page)), 'arrow buttons can sort the tiles');
  await page.click('#check');
  ok(await page.$$eval('#tiles .tile.ok', l => l.length) === 3, 'all tiles marked right');
  ok(await page.$eval('#score', e => e.textContent) === '1 right', 'score 1 after a right answer');
  ok(await page.$eval('#full', e => e.textContent.length > 40), 'full definition shown');
  await shot(page, 'checked-right');
  await page.click('#next');

  // Q2: mouse drag, right
  await sortWithDrag(page, false);
  ok(sorted(await order(page)), 'mouse drag can sort the tiles');
  await page.click('#check');
  ok(await page.$eval('#score', e => e.textContent) === '2 right', 'score 2 after mouse drag');
  await page.click('#next');

  // Q3: leave shuffled, wrong
  await page.click('#check');
  ok(await page.$$eval('#tiles .tile.bad', l => l.length) > 0, 'wrong tiles marked');
  ok(await page.$eval('#verdict', e => e.classList.contains('bad')), 'verdict says not quite');
  await shot(page, 'checked-wrong');
  ok(await page.$$eval('#tiles .arrows', l => l.every(a => getComputedStyle(a).display === 'none')), 'arrows hidden after checking');
  await page.click('#next');

  // Q4, Q5: wrong
  for (let q = 0; q < 2; q++) { await page.click('#check'); await page.click('#next'); }
  ok(await page.$eval('#final', e => e.textContent) === '2 / 5', 'end score 2 / 5');
  ok(await page.$$eval('#missed li', l => l.length) === 3, '3 missed listed');
  await shot(page, 'end');

  await page.click('#retry');
  ok(await page.$eval('#progress', e => e.textContent) === '1 of 3', 'Retry missed plays the 3 missed');
  for (let q = 0; q < 3; q++) { await sortWithArrows(page); await page.click('#check'); await page.click('#next'); }
  ok(await page.$eval('#final', e => e.textContent) === '3 / 3', 'retry round all right');
  ok(await page.$eval('#retry', e => e.hidden), 'no Retry missed when nothing was missed');
  await page.click('#change');
  ok(!(await page.$eval('#setup', e => e.hidden)), 'Change topics goes back to setup');

  // ---- phone, touch ----
  await page.setViewport({ width: 390, height: 640, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await shot(page, 'setup-phone');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll on setup (phone)');
  await page.click('#lengths button:nth-child(4)');   // All
  await page.click('#start');
  ok(await page.$eval('#progress', e => e.textContent) === '1 of 15', 'All gives 15');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll on question (phone)');
  await shot(page, 'question-phone');
  await sortWithDrag(page, true);
  ok(sorted(await order(page)), 'touch drag can sort the tiles');
  await page.click('#check');
  ok(await page.$eval('#score', e => e.textContent) === '1 right', 'touch-sorted answer marked right');
  await shot(page, 'checked-phone');

  // page scroll: a swipe that starts outside the tiles scrolls; one on a tile does not
  await page.click('#next');
  await page.setViewport({ width: 390, height: 360, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const swipe = async (x, y) => {
    await page.touchscreen.touchStart(x, y);
    for (let s = 1; s <= 10; s++) await page.touchscreen.touchMove(x, y - 15 * s);
    await page.touchscreen.touchEnd();
    await new Promise(r => setTimeout(r, 300));
  };
  await page.evaluate(() => window.scrollTo(0, 0));
  const top = await page.$eval('#qtopic', e => { const r = e.getBoundingClientRect(); return { x: r.x + 10, y: r.y + r.height / 2 }; });
  await swipe(top.x, top.y);
  const s1 = await page.evaluate(() => scrollY);
  const room = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  ok(s1 > 20, `swipe outside tiles scrolls the page (scrollY ${s1}, room ${room})`);
  await page.evaluate(() => window.scrollTo(0, 0));
  const before = await order(page);
  const t = await page.$eval('#tiles .tile .txt', e => { const r = e.getBoundingClientRect(); return { x: r.x + 10, y: r.y + r.height / 2 }; });
  await swipe(t.x, t.y);
  ok(await page.evaluate(() => scrollY) === 0, 'swipe on a tile does not scroll the page');

  ok(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(fails ? `\n${fails} failed` : '\nall passed');
  process.exit(fails ? 1 : 0);
})();
