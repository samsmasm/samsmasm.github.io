// Browser checks for Sums: node sums/test/browser.js <url> [shotsDir]
// Uses the puppeteer-core shared with the other unisam tests (~/.cache/sw-test).
const puppeteer = require(process.env.HOME + '/.cache/sw-test/node_modules/puppeteer-core');
const URL = process.argv[2], SHOTS = process.argv[3] || '';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const wait = ms => new Promise(r => setTimeout(r, ms));

// glyphs in a 0.6 x 1 box (same shapes as run.js)
const HELPERS = () => {
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
  // strokes for a number, right-aligned to x = right, top at y = top (question units)
  window.numStrokes = (s, right, top, size = 1) => {
    s = String(s); const out = [];
    [...s].forEach((ch, k) => GL[ch].forEach(st => {
      const x0 = right - (s.length - k) * 0.8 * size + 0.1 * size, pts = [];
      for (let i = 1; i < st.length; i++) for (let t = 0; t < 1; t += 0.1)
        pts.push([x0 + (st[i - 1][0] + (st[i][0] - st[i - 1][0]) * t) * size, top + (st[i - 1][1] + (st[i][1] - st[i - 1][1]) * t) * size]);
      out.push(pts);
    }));
    return out;
  };
  // the answer where she should write it: under the line, or on the division bar
  window.writeNum = (c, n, extra = []) => {
    c.strokes = [...extra, ...numStrokes(n, 0, c.q.op === '/' ? -1.3 : 0.3)];
    draw(c);
  };
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('pageerror', e => { console.log('page error: ' + e.message); fails++; });
  await page.setViewport({ width: 820, height: 1180, hasTouch: true });
  await page.goto(URL);
  await page.evaluate(HELPERS);

  ok(await page.$eval('#settings', e => !e.hidden), 'first visit opens settings');

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

  // players: add Mia
  await page.click('#whoBtn');
  await page.type('#newName', 'Mia');
  await page.click('#addBtn');
  ok(await page.$eval('#whoBtn', e => e.textContent) === 'Mia', 'new player becomes current');
  await page.click('#who .back');

  // all four signs, 2 digit and 1 digit, 12 questions
  await page.click('#settingsBtn');
  for (const v of ['-', '*', '/']) await page.click(`#opsOpts button[data-v="${v}"]`);
  await page.click('.big[data-line="a"] [data-d="2"]');
  await page.click('#nOpts button[data-v="12"]');
  await page.click('#newBtn');
  ok(await page.$$eval('.card', c => c.length) === 12, '12 cards');
  const cols = () => page.$eval('#sheet', s => getComputedStyle(s).gridTemplateColumns.split(' ').length);
  ok(await cols() === 3, 'portrait: 3 columns for 12');

  // layout: stacked for + − ×, bracket for ÷
  const lay = await page.evaluate(() => {
    const out = [];
    for (const c of cards) {
      const qv = c.el.querySelector('.qv'), w = c.work.getBoundingClientRect(), r = qv.getBoundingClientRect();
      const inside = r.left >= w.left - 1 && r.right <= w.right + 1 && r.top >= w.top - 1;
      const kind = c.q.op === '/' ? qv.classList.contains('div') && !!qv.querySelector('.dd') : qv.classList.contains('col') && qv.querySelectorAll('.row').length === 2;
      // stacked: room above for carrying (>= 1 em) and room under the line to write (>= 1.4 em)
      const room = c.q.op === '/' ? c.ay > 1.3 * c.F && c.h - c.ay > 1.5 * c.F : c.ay > 3 * c.F && c.h - c.ay >= 1.4 * c.F;
      if (!inside || !kind || !room) out.push(`${c.q.a}${c.q.op}${c.q.b} inside=${inside} kind=${kind} room=${room}`);
    }
    return out;
  });
  ok(lay.length === 0, 'questions laid out stacked / as long division, fit, with room to write ' + lay.join('; '));

  // force a known mix so every kind is checked: cards 0-2 +, 3-5 −, 6-8 ×, 9-11 ÷
  await page.evaluate(() => {
    const ops = ['+', '+', '+', '-', '-', '-', '*', '*', '*', '/', '/', '/'];
    cards.forEach((c, i) => { c.q = makeQ(ops[i], 2, 1); layout(c); sizeCanvas(c); });
  });

  // card 0: real pointer strokes, through the page's own events
  const P0 = await page.evaluate(() => {
    const c = cards[0], r = c.work.getBoundingClientRect();
    return { x: r.left + c.ax, y: r.top + c.ay, F: c.F, ans: c.q.ans, strokes: numStrokes(c.q.ans, 0, 0.3) };
  });
  for (const st of P0.strokes) {
    const P = st.map(([x, y]) => [P0.x + x * P0.F, P0.y + y * P0.F]);
    await page.mouse.move(P[0][0], P[0][1]); await page.mouse.down();
    for (let i = 1; i < P.length; i += 2) await page.mouse.move(P[i][0], P[i][1]);
    await page.mouse.up();
  }
  await wait(700);
  const shown = await page.$eval('.card .read', e => e.textContent);
  ok(shown === String(P0.ans), `pointer writing under the line read as ${shown} (answer ${P0.ans})`);

  // working is ignored: carries above the line, long-division working under the bar,
  // and for long multiplication only the bottom row (under her own ruled line) counts
  const work = await page.evaluate(() => {
    const out = {};
    const c1 = cards[1]; writeNum(c1, c1.q.ans, numStrokes(1, -0.8, -3.4, 0.5)); out.carry = read(c1) === String(c1.q.ans);
    const c9 = cards[9]; writeNum(c9, c9.q.ans, numStrokes(c9.q.a, 0, 0.3)); out.div = read(c9) === String(c9.q.ans);
    const c6 = cards[6], rule = [[-3, 2.55], [0, 2.55]];
    c6.strokes = [...numStrokes(c6.q.ans + 11, 0, 0.3), rule, ...numStrokes(c6.q.ans, 0, 2.7)];
    out.rows = read(c6) === String(c6.q.ans);
    writeNum(c6, c6.q.ans);
    return out;
  });
  ok(work.carry, 'carry written above the line is ignored');
  ok(work.div, 'division: answer on the bar read, working under it ignored');
  ok(work.rows, 'several rows under the line: the bottom row is the answer');

  // cards 2..10 correct (1, 6 and 9 already written), card 10 wrong, card 11 blank
  await page.evaluate(() => {
    for (const i of [2, 3, 4, 5, 7, 8]) writeNum(cards[i], cards[i].q.ans);
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

  // rotate: landscape gives 4 columns and the writing stays lined up with the numbers
  const before = await page.evaluate(() => { const c = cards[3]; return c.strokes[0][0]; });
  await page.setViewport({ width: 1180, height: 820, hasTouch: true });
  await wait(300);
  ok(await cols() === 4, 'landscape: 4 columns for 12');
  ok(await page.evaluate(b => { const c = cards[3]; return c.strokes[0][0][0] === b[0] && c.strokes[0][0][1] === b[1] && read(c) === String(c.q.ans); }, before), 'writing kept and still read after rotation');

  // wrong: only Try again is offered (she can't know yet whether she was right)
  ok(await page.evaluate(() => { const e = cards[10].el; return getComputedStyle(e.querySelector('.retry')).display !== 'none' && getComputedStyle(e.querySelector('.override')).display === 'none'; }), 'wrong card offers only Try again');

  // card 10: try again, now right; the claim button appears with the first reading
  await page.click('.card[data-state="wrong"] .retry');
  await page.evaluate(() => writeNum(cards[10], cards[10].q.ans));
  await page.click('#markBtn');
  ok(await page.evaluate(() => { const e = cards[10].el; return e.dataset.state === 'right' && getComputedStyle(e.querySelector('.override')).display !== 'none' && /first read/.test(e.querySelector('.read').textContent); }), 'right on a later try: offers "I was right the first time" and shows the first reading');
  ok(await page.evaluate(() => getComputedStyle(cards[0].el.querySelector('.override')).display === 'none'), 'right first time: no claim button');
  ok((await page.$eval('#score', e => e.textContent)) === 'First try 10/12', 'without the claim it counts as the later try');

  // last card: wrong with a carry, try again keeps the carry and clears the answer
  await page.evaluate(() => writeNum(cards[11], cards[11].q.ans + 1, cards[11].q.op === '/' ? [] : numStrokes(1, -0.8, -3.4, 0.5)));
  await page.click('#markBtn');
  await page.click('.card[data-state="wrong"] .retry');
  ok(await page.evaluate(() => { const c = cards[11]; return c.el.dataset.state === 'writing' && read(c) === '' && (c.q.op === '/' || c.strokes.length === 1); }), 'try again clears the answer but keeps the working');
  await page.evaluate(() => { sheetStart = Date.now() - 95000; writeNum(cards[11], cards[11].q.ans); });
  await page.click('#markBtn');
  const sc = await page.$eval('#score', e => e.textContent);
  ok(/^First try 10\/12 · 1:3[45]/.test(sc), 'finished: score and time shown ' + sc);
  ok((await page.$eval('#markBtn', e => e.textContent)) === 'New sheet', 'all done offers a new sheet');

  // after finishing she claims card 10: the score and the saved record both update
  await page.evaluate(() => cards[10].el.querySelector('.override').click());
  ok(/^First try 11\/12/.test(await page.$eval('#score', e => e.textContent)), 'claim counts it as right first time');
  ok(await page.evaluate(() => getComputedStyle(cards[10].el.querySelector('.override')).display === 'none'), 'claim button goes away once used');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/3-done-landscape.png' });

  // records: saved for Mia under this combination
  const rec = await page.evaluate(() => {
    const id = current, r = JSON.parse(localStorage.getItem('sums-rec-' + id));
    return { k: Object.keys(r.best), ms: Object.values(r.best)[0].ms, h: r.history.length, first: r.history[0].first };
  });
  ok(rec.k.length === 1 && rec.k[0] === '+-*/|2|1:123456789|12' && rec.ms > 90000 && rec.h === 1 && rec.first === 11, 'record saved with the claimed first try: ' + JSON.stringify(rec));

  // a faster second sheet is a new best
  await page.click('#markBtn');
  await page.evaluate(() => { sheetStart = Date.now() - 50000; cards.forEach(c => writeNum(c, c.q.ans)); });
  await page.click('#markBtn');
  ok(/New best!/.test(await page.$eval('#score', e => e.textContent)), 'faster sheet says New best!');
  await page.click('#whoBtn');
  const table = await page.$eval('#records', e => e.textContent);
  ok(/0:50/.test(table) && /2×/.test(table), 'records table shows best 0:50, done 2×: ' + table);
  if (SHOTS) await page.screenshot({ path: SHOTS + '/4-who.png' });

  // switching to Everyone shows separate (empty) records
  await page.click('#playerList button[data-id="guest"]');
  ok(/No finished sheets/.test(await page.$eval('#records', e => e.textContent)), 'Everyone has separate records');
  await page.click('#who .back');

  // keypads: the 2 times table up to 5
  await page.click('#settingsBtn');
  for (const v of ['+', '-', '/']) await page.click(`#opsOpts button[data-v="${v}"]`);
  await page.click('.kp[data-line="a"] [data-k="2"]'); // first number was 10–99, so this starts a fresh pick
  await page.click('.kp[data-line="b"] [data-k="all"]');
  const centre = async sel => { const b = await (await page.$(sel)).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  const [x9, y9] = await centre('.kp[data-line="b"] [data-k="9"]'), [x6, y6] = await centre('.kp[data-line="b"] [data-k="6"]');
  await page.mouse.move(x9, y9); await page.mouse.down(); await page.mouse.move(x6, y6, { steps: 6 }); await page.mouse.up();
  await page.click('.kp[data-line="b"] [data-k="7"]');
  await page.click('.kp[data-line="b"] [data-k="8"]');
  const st = await page.evaluate(() => JSON.stringify([settings.a, settings.pa, settings.b, settings.pb, settings.ops]));
  ok(st === '[1,[2],1,[0,1,2,3,4,5],["*"]]', 'keypad: tap, All, drag to switch off 9 and 6, tap 7 and 8 off: ' + st);
  ok(await page.$$eval('#preview .mini', m => m.length) === 4, 'four examples shown');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/7-choices.png', fullPage: true });
  await page.click('#newBtn');
  const tt = await page.evaluate(() => cards.every(c => c.q.op === '*' && c.q.a === 2 && c.q.b >= 0 && c.q.b <= 5 && c.q.ans === 2 * c.q.b));
  ok(tt, 'sheet is all 2 × 0–5');
  ok(await page.evaluate(() => comboLabel(sheetKey)) === '× · 2 and 0–5 · 12 questions', 'record label: ' + await page.evaluate(() => comboLabel(sheetKey)));
  ok(await page.evaluate(() => { const q = []; for (let i = 0; i < 300; i++) q.push(makeQ('/', { d: 1, p: [0, 1, 2] }, { d: 1, p: [0, 3] })); return q.every(x => x.b === 3 && x.a === 3 * x.ans && [0, 1, 2].includes(x.ans)); }), 'division from keypads: divide by the second, answer from the first, never by 0');

  // dividing by only 0 is impossible: warn, and Start is off when ÷ is the only sign
  await page.click('#settingsBtn');
  await page.click('#opsOpts button[data-v="/"]');
  await page.click('.big[data-line="b"] [data-d="2"]');
  await page.click('.kp[data-line="b"] [data-k="0"]');
  ok(/other than 0/.test(await page.$eval('#warn', e => e.textContent)) && !(await page.$eval('#newBtn', e => e.disabled)), 'only 0 to divide by: warning, Start still on (× works)');
  await page.click('#opsOpts button[data-v="*"]');
  ok(await page.$eval('#newBtn', e => e.disabled), '÷ alone with only 0: Start is off');
  await page.click('#settings .back');

  // 20 on a phone in portrait: 2 columns (mobile emulation reloads the page)
  await page.setViewport({ width: 390, height: 844, hasTouch: true, isMobile: true });
  await page.evaluate(() => { settings.n = 20; buildSheet(); });
  ok(await cols() === 2, 'phone portrait: 2 columns');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/5-phone.png' });
  await page.setViewport({ width: 1180, height: 820, hasTouch: true });
  await page.evaluate(() => { settings = { ops: ['+', '-', '*', '/'], a: 3, b: 2, n: 20 }; buildSheet(); });
  ok(await cols() === 5, 'landscape: 5 columns for 20');
  const fit = await page.evaluate(() => cards.filter(c => { const w = c.work.getBoundingClientRect(), r = c.el.querySelector('.qv').getBoundingClientRect(); return r.right > w.right + 1 || r.left < w.left - 1 || r.bottom > w.bottom + 1; }).length);
  ok(fit === 0, `3-digit and 2-digit, 20 on screen: every question fits its card (${fit} overflow)`);
  if (SHOTS) await page.screenshot({ path: SHOTS + '/6-landscape-20.png' });

  await browser.close();
  console.log(fails ? `${fails} failed` : 'all passed');
  process.exit(fails ? 1 : 0);
})();
