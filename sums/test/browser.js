// Browser checks for Sums: node sums/test/browser.js <url> [shotsDir]
// Uses the puppeteer-core shared with the other unisam tests (~/.cache/sw-test).
const puppeteer = require(process.env.HOME + '/.cache/sw-test/node_modules/puppeteer-core');
const URL = process.argv[2], SHOTS = process.argv[3] || '';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('pageerror', e => { console.log('page error: ' + e.message); fails++; });
  await page.setViewport({ width: 820, height: 1180, hasTouch: true });
  await page.goto(URL);

  ok(await page.$eval('#settings', e => !e.hidden), 'first visit opens settings');

  // question generator rules
  const gen = await page.evaluate(() => {
    const bad = [];
    for (const op of ['+', '-', '*', '/']) for (let a = 1; a <= 4; a++) for (let b = 1; b <= 4; b++) for (let i = 0; i < 200; i++) {
      const q = makeQ(op, a, b);
      if (!Number.isInteger(q.ans) || q.ans < 0) bad.push(JSON.stringify(q));
      if (op === '/' && q.a !== q.b * q.ans) bad.push('div ' + JSON.stringify(q));
      if (op === '-' && q.a - q.b !== q.ans) bad.push('sub ' + JSON.stringify(q));
      if (op === '/' && String(q.b).length !== b) bad.push('divisor digits ' + JSON.stringify([a, b, q]));
      if ((op === '+' || op === '*') && (String(q.a).length !== a || String(q.b).length !== b)) bad.push('digits ' + JSON.stringify([a, b, q]));
    }
    return bad.slice(0, 5);
  });
  ok(gen.length === 0, 'questions: whole, never negative, exact division, right digit counts ' + gen.join(' '));

  // choose all four signs, 2 digit by 1 digit, 12 questions
  for (const v of ['-', '*', '/']) await page.click(`#opsOpts button[data-v="${v}"]`);
  await page.click('#aOpts button[data-v="2"]');
  await page.click('#nOpts button[data-v="12"]');
  await page.click('#newBtn');
  const n = await page.$$eval('.card', c => c.length);
  ok(n === 12, `12 cards (${n})`);
  const cols = () => page.$eval('#sheet', s => getComputedStyle(s).gridTemplateColumns.split(' ').length);
  ok(await cols() === 3, 'portrait: 3 columns for 12');
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem('sums-settings')).ops.length === 4), 'settings saved');

  // write each correct answer with synthetic strokes (same glyphs as run.js, simplified)
  await page.evaluate(() => {
    const ring = (cx, cy, rx, ry) => Array.from({ length: 25 }, (_, i) => { const a = -Math.PI / 2 + 2 * Math.PI * i / 24; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });
    window.GL = {
      0: [ring(0.3, 0.5, 0.28, 0.5)], 1: [[[0.3, 0], [0.3, 1]]],
      2: [[[0.05, 0.25], [0.15, 0.06], [0.35, 0], [0.55, 0.1], [0.55, 0.3], [0.4, 0.5], [0, 1], [0.6, 1]]],
      3: [[[0.05, 0.1], [0.3, 0], [0.55, 0.15], [0.5, 0.4], [0.25, 0.48], [0.55, 0.6], [0.58, 0.85], [0.3, 1], [0.02, 0.9]]],
      4: [[[0.4, 0], [0, 0.65], [0.6, 0.65]], [[0.45, 0.3], [0.45, 1]]],
      5: [[[0.1, 0], [0.05, 0.45], [0.35, 0.4], [0.58, 0.6], [0.55, 0.88], [0.3, 1], [0.02, 0.92]], [[0.1, 0], [0.55, 0]]],
      6: [[[0.5, 0], [0.2, 0.3], [0.05, 0.7], [0.15, 0.95], [0.4, 1], [0.55, 0.8], [0.45, 0.55], [0.2, 0.55], [0.07, 0.7]]],
      7: [[[0, 0], [0.6, 0], [0.2, 1]]],
      8: [[[0.5, 0.1], [0.3, 0], [0.08, 0.12], [0.15, 0.38], [0.45, 0.58], [0.55, 0.82], [0.3, 1], [0.05, 0.82], [0.15, 0.58], [0.45, 0.38], [0.52, 0.12], [0.5, 0.1]]],
      9: [[[0.55, 0.15], [0.3, 0], [0.05, 0.15], [0.1, 0.4], [0.35, 0.45], [0.55, 0.25], [0.55, 0.15], [0.55, 1]]],
    };
    window.writeNum = (c, s) => {
      c.strokes = [];
      [...String(s)].forEach((ch, k) => GL[ch].forEach(st => {
        const pts = [];
        for (let i = 1; i < st.length; i++) for (let t = 0; t < 1; t += 0.1)
          pts.push([0.2 + k * 0.55 + (st[i - 1][0] + (st[i][0] - st[i - 1][0]) * t) * 0.65, 0.15 + (st[i - 1][1] + (st[i][1] - st[i - 1][1]) * t) * 0.65]);
        c.strokes.push(pts);
      }));
      draw(c);
    };
  });

  // card 0: real pointer strokes through the page events, writing its answer
  const ans0 = await page.evaluate(() => cards[0].q.ans);
  const box = await (await page.$('.card .pad')).boundingBox();
  const glyphs = await page.evaluate(() => GL);
  let k = 0;
  for (const ch of String(ans0)) {
    for (const st of glyphs[ch]) {
      const P = st.map(([x, y]) => [box.x + box.height * (0.2 + k * 0.55 + x * 0.65), box.y + box.height * (0.15 + y * 0.65)]);
      await page.mouse.move(P[0][0], P[0][1]); await page.mouse.down();
      for (let i = 1; i < P.length; i++) for (let t = 0.2; t <= 1.001; t += 0.2)
        await page.mouse.move(P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t);
      await page.mouse.up();
    }
    k++;
  }
  await new Promise(r => setTimeout(r, 700));
  const shown = await page.$eval('.card .read', e => e.textContent);
  ok(shown === String(ans0), `pointer writing read live as ${shown} (answer ${ans0})`);

  // cards 1..9 correct, card 10 wrong, card 11 left blank
  await page.evaluate(() => {
    for (let i = 1; i <= 9; i++) writeNum(cards[i], cards[i].q.ans);
    writeNum(cards[10], cards[10].q.ans + 1);
  });
  if (SHOTS) await page.screenshot({ path: SHOTS + '/1-written-portrait.png' });
  await page.click('#markBtn');
  const states = await page.$$eval('.card', cs => cs.map(c => c.dataset.state));
  ok(states.slice(0, 10).every(s => s === 'right'), 'ten correct answers marked right: ' + states.slice(0, 10).join(','));
  ok(states[10] === 'wrong', 'wrong answer marked wrong');
  ok(states[11] === 'writing', 'blank card left alone');
  ok((await page.$eval('#score', e => e.textContent)) === 'First try 10/12', 'score ' + await page.$eval('#score', e => e.textContent));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/2-marked-portrait.png' });

  // rotate: landscape gives 4 columns and strokes are kept
  await page.setViewport({ width: 1180, height: 820, hasTouch: true });
  await new Promise(r => setTimeout(r, 300));
  ok(await cols() === 4, 'landscape: 4 columns for 12');
  ok(await page.evaluate(() => cards[3].strokes.length > 0 && cards[3].cv.width > 0), 'writing kept after rotation');

  // override the wrong one: it was a misread, so it counts as right first time
  await page.click('.card[data-state="wrong"] .override');
  ok((await page.$$eval('.card', cs => cs[10].dataset.state)) === 'right', 'override marks it right');
  ok((await page.$eval('#score', e => e.textContent)) === 'First try 11/12', 'override counts first time');

  // last card: wrong first, then try again and get it right (not first time)
  await page.evaluate(() => writeNum(cards[11], cards[11].q.ans + 1));
  await page.click('#markBtn');
  await page.click('.card[data-state="wrong"] .retry');
  ok(await page.evaluate(() => cards[11].strokes.length === 0 && cards[11].el.dataset.state === 'writing'), 'try again clears and reopens');
  await page.evaluate(() => writeNum(cards[11], cards[11].q.ans));
  await page.click('#markBtn');
  ok((await page.$eval('#score', e => e.textContent)) === 'First try 11/12', 'second try right does not count as first');
  ok((await page.$eval('#markBtn', e => e.textContent)) === 'New sheet', 'all done offers a new sheet');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/3-done-landscape.png' });

  // 20 on a phone in portrait: 2 columns, scrolls
  await page.setViewport({ width: 390, height: 844, hasTouch: true, isMobile: true });
  await page.evaluate(() => { settings.n = 20; buildSheet(); });
  ok(await cols() === 2, 'phone portrait: 2 columns');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/4-phone.png' });
  // (switching mobile emulation off reloads the page, so build the 20 again)
  await page.setViewport({ width: 1180, height: 820, hasTouch: true });
  await page.evaluate(() => { settings.n = 20; buildSheet(); });
  ok(await cols() === 5, 'landscape: 5 columns for 20');
  await page.evaluate(() => { openSettings(); });
  if (SHOTS) await page.screenshot({ path: SHOTS + '/5-settings.png' });

  await browser.close();
  console.log(fails ? `${fails} failed` : 'all passed');
  process.exit(fails ? 1 : 0);
})();
