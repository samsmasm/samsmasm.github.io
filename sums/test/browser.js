// Browser checks for Sums: node sums/test/browser.js <url> [shotsDir]
// Uses the puppeteer-core shared with the other unisam tests (~/.cache/sw-test).
const puppeteer = require(process.env.HOME + '/.cache/sw-test/node_modules/puppeteer-core');
const URL = process.argv[2], SHOTS = process.argv[3] || '';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const wait = ms => new Promise(r => setTimeout(r, ms));

// glyphs in a 0.6 x 1 box (same shapes as run.js), and a fake speech engine
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
  window.numStrokes = (s, right, top, size = 1, mirror = false) => {
    s = String(s); const out = [];
    const mx = x => mirror ? 0.6 - x : x;
    [...s].forEach((ch, k) => GL[ch].forEach(st => {
      const x0 = right - (s.length - k) * 0.8 * size + 0.1 * size, pts = [];
      for (let i = 1; i < st.length; i++) for (let t = 0; t < 1; t += 0.1)
        pts.push([x0 + mx(st[i - 1][0] + (st[i][0] - st[i - 1][0]) * t) * size, top + (st[i - 1][1] + (st[i][1] - st[i - 1][1]) * t) * size]);
      out.push(pts);
    }));
    return out;
  };
  // the answer where she should write it: under the line, on the division bar, on the missing-number line
  window.writeNum = (c, n, extra = [], mirror = false) => {
    if (c.q.kind === 'frac') { // "3/4": top number above the bar, bottom number below
      const [t, b] = String(n).split('/');
      c.strokes = [...extra, ...numStrokes(t, -0.3, -1.6, 0.9, mirror), ...numStrokes(b, -0.3, 0.35, 0.9, mirror)];
    } else if (c.q.kind === 'bond') { // in the empty circle, centred on the anchor
      const w = String(n).length * 0.8 * 0.9;
      c.strokes = [...extra, ...numStrokes(n, w / 2, -0.45, 0.9, mirror)];
    } else if (c.q.two) { // "3 : 15", "$2 and 50 c": first number left of the middle, second right of it
      const [a, b] = (Array.isArray(n) ? n : c.q.parts).map(String), s = 0.85;
      c.strokes = [...extra, ...numStrokes(a, -0.45, -1.05, s, mirror), ...numStrokes(b, 0.45 + b.length * 0.8 * s, -1.05, s, mirror)];
    } else {
      const top = { div: -1.3, miss: -1.1, expr: -1.1, seq: -1.1, story: -1.1, clock: -1.05, money: -1.05, graph: -1.05, shape: -1.05, ruler: -1.05 }[c.q.kind] ?? 0.3;
      c.strokes = [...extra, ...numStrokes(n, 0, top, 1, mirror)];
    }
    draw(c);
  };
};
const fakeSpeech = () => {
  window.__said = [];
  Object.defineProperty(window, 'speechSynthesis', { value: { cancel() {}, speak(u) { window.__said.push(u.text); } } });
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('pageerror', e => { console.log('page error: ' + e.message); fails++; });
  await page.evaluateOnNewDocument(fakeSpeech);
  await page.setViewport({ width: 820, height: 1180, hasTouch: true });
  await page.goto(URL);
  await page.evaluate(HELPERS);
  const said = () => page.evaluate(() => window.__said.slice());
  const visible = sel => page.$eval(sel, e => { for (let n = e; n && n.nodeType === 1; n = n.parentElement) if (n.hidden || getComputedStyle(n).display === 'none') return false; return true; }).catch(() => false);
  const tiles = sel => page.$$eval(sel + ' .tile .nm', t => t.map(x => x.textContent));

  // ---- opening: who's doing sums?
  ok(await visible('#namesS'), 'opens on the names');
  ok((await tiles('#nameTiles')).join() === 'Everyone,+ Add a name', 'first visit: Everyone and Add');

  // question generator rules (unchanged from before)
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

  // ---- add Mia, she's 8
  await page.click('#addTile');
  await page.type('#newName', 'Mia');
  await page.click('#addBtn');
  ok(await visible('#ageS'), 'new name asks how old');
  ok((await said()).includes('How old are you?'), 'age question is read aloud');
  await page.click('#ageTiles [data-age="8"]');
  ok(await visible('#homeS'), 'age 8 goes to the activities');
  ok((await tiles('#actTiles')).join() === 'Sums,Add and take away,Times and divide,Missing number,Arrays,Place value,Number lines,Area,Times bonds,Fractions,Clocks,Money,Number patterns,Doubles and halves,Story sums,Graphs,Shapes,Rulers,Times grid', '8: the age-8 activities ' + (await tiles('#actTiles')).join());
  ok(await page.$eval('#title', e => e.textContent) === 'Mia · 8', 'title shows name and age');
  await page.click('#backBtn');
  ok(await page.$$eval('#nameTiles .tile .sub', t => t.map(x => x.textContent).join()) === 'any age,age 8', 'name tile shows her age');

  // a name saved before ages existed gets asked once, then remembered
  await page.evaluate(() => { players.push({ id: 'old1', name: 'Ada' }); store.set('sums-players', players); goNames(); });
  await page.click('#nameTiles [data-id="old1"]');
  ok(await visible('#ageS'), 'old name without an age is asked');
  await page.click('#ageTiles [data-age="5"]');
  await page.click('#backBtn');
  await page.click('#nameTiles [data-id="old1"]');
  ok(await visible('#homeS') && (await tiles('#actTiles')).join() === 'Sums,Add and take away,Times and divide,How many?,Number bonds,Teen numbers,Make 10,Clocks,Money,Number patterns,Doubles and halves,Story sums,Graphs,Shapes,Rulers', 'age saved: straight to the 5 activities ' + (await tiles('#actTiles')).join());
  ok((await said()).slice(-1)[0] === 'What do you want to do today?', 'age 5 home is read aloud');
  await page.click('#backBtn');

  // Everyone asks the age every time
  await page.click('#nameTiles [data-id="guest"]');
  ok(await visible('#ageS'), 'Everyone asks the age');
  await page.click('#ageTiles [data-age="5"]');
  ok((await tiles('#actTiles')).length === 15, 'Everyone at 5: the age-5 activities');
  await page.click('#backBtn');
  await page.click('#nameTiles [data-id="guest"]');
  ok(await visible('#ageS'), 'Everyone asks again next time');
  ok((await page.$$eval('#ageTiles [data-age]', t => t.map(x => x.dataset.age).join())) === '4,5,6,7,8,9,10,11', 'ages 4 to 11 to choose from');
  // age only suggests a starting year: 4 and 5 → Year 1, 6 → Year 2, 10 → Year 6 (capped at what is built)
  const sugg = await page.evaluate(() => [4, 5, 6, 7, 10, 11].map(a => {
    age = a; return `${a}:${group()}:${reads() ? 'r' : '-'}:${loadCfg('clock').yr}:${loadCfg('seq').yr}:${loadCfg('clock').n}`;
  }).join(' '));
  ok(sugg === '4:5:r:1:1:6 5:5:r:1:1:6 6:5:r:2:2:6 7:8:-:3:3:12 10:8:-:4:3:12 11:8:-:4:3:12', 'age → tiles, read aloud, starting year (capped at the highest built): ' + sugg);
  await page.click('#ageTiles [data-age="6"]');
  ok((await tiles('#actTiles')).length === 15 && (await page.$eval('#title', e => e.textContent)) === 'Everyone · 6', 'age 6: the younger tiles');
  await page.click('#actTiles [data-act="graph"]');
  ok(await page.evaluate(() => draft.yr === 2 && $('.sughint').textContent === 'Suggested for age 6: Year 2'), 'age 6: Graphs starts at Year 2 and says so');
  await page.click('#backBtn'); await page.click('#backBtn');
  await page.click('#nameTiles [data-id="guest"]');
  await page.click('#ageTiles [data-age="10"]');
  ok((await tiles('#actTiles')).length === 19, 'age 10: the older tiles');
  await page.click('#backBtn');

  // ---- the bug Sam hit: one girl's choices must never carry to the other.
  // Old one-device settings (from before names) are ignored; Ada (5) picks
  // single digits, then Mia (8) gets her own choices.
  await page.evaluate(() => localStorage.setItem('sums-settings', JSON.stringify({ ops: ['+'], a: 1, b: 1, pa: [1, 2], pb: [1, 2], n: 6 })));
  await page.click('#nameTiles [data-id="old1"]');
  await page.click('#actTiles [data-act="sums"]');
  ok(await visible('#setupS') && /Ada · Sums/.test(await page.$eval('#title', e => e.textContent)), 'Sums tile asks first: setup page, titled with her name');
  ok((await said()).slice(-1)[0] === 'Choose, then press Start.', 'age 5 setup is spoken');
  await page.click('.kp[data-line="a"] [data-k="3"]'); // Ada switches 3 on: 0–5 minus 3
  await page.click('#newBtn');
  ok(await visible('#sheet') && await page.evaluate(() => cards.length === 6 && cards.every(c => c.q.a <= 5 && c.q.a !== 3)), 'Ada gets her sheet from her choices');
  await page.click('#backBtn'); await page.click('#backBtn');
  await page.click('#nameTiles [data-id]:not([data-id="guest"]):not([data-id="old1"])');
  ok(await page.evaluate(() => cards.length === 0), 'switching names clears the last sheet');
  await page.click('#actTiles [data-act="sums"]');
  ok(await page.evaluate(() => draft.a === 2 && draft.b === 1 && draft.n === 12 && draft.ops.join() === '+,-,*'), "Mia's setup shows her own (age-8) choices, not Ada's or the old device ones: " + await page.evaluate(() => JSON.stringify(draft)));
  await page.click('#backBtn');
  ok(await visible('#homeS'), 'Back from a setup opened from home goes home (not to an old sheet)');

  // ---- Mia: Sums, set up through the keypad page
  await page.click('#actTiles [data-act="sums"]');
  ok(await visible('#setupS') && await visible('#kpBlock') && await page.$eval('#optBlock', e => e.children.length === 0), 'Sums opens the keypad setup');
  ok(!(await said()).slice(-1)[0].startsWith('Choose'), 'age 8: not read aloud automatically');
  await page.click('#opsOpts button[data-v="/"]');
  await page.click('#nOpts button[data-v="12"]');
  await page.click('#newBtn');
  const cols = () => page.$eval('#sheet', s => getComputedStyle(s).gridTemplateColumns.split(' ').length);
  ok(await cols() === 3, 'portrait: 3 columns for 12');
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem('sums-cfg-' + current + '-sums')).ops.join('') === '+-*/'), 'her settings are saved under her name');

  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); // let the cards size themselves first
  const lay = await page.evaluate(() => {
    const out = [];
    for (const c of cards) {
      const qv = c.el.querySelector('.qv'), w = c.work.getBoundingClientRect(), r = qv.getBoundingClientRect();
      const inside = r.left >= w.left - 1 && r.right <= w.right + 1 && r.top >= w.top - 1;
      const room = c.q.kind === 'div' ? c.ay > 1.3 * c.F && c.h - c.ay > 1.5 * c.F : c.ay > 3 * c.F && c.h - c.ay >= 1.4 * c.F;
      if (!inside || !room) out.push(`${c.q.a}${c.q.op}${c.q.b} inside=${inside} room=${room}`);
    }
    return out;
  });
  ok(lay.length === 0, 'stacked / long division fit with room to write ' + lay.join('; '));

  // force a known mix: cards 0-2 +, 3-5 −, 6-8 ×, 9-11 ÷
  await page.evaluate(() => {
    const ops = ['+', '+', '+', '-', '-', '-', '*', '*', '*', '/', '/', '/'];
    cards.forEach((c, i) => { c.q = makeQ(ops[i], 2, 1); c.q.kind = ops[i] === '/' ? 'div' : 'col'; layout(c); sizeCanvas(c); });
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
  ok(await page.$eval('.card .read', e => e.textContent) === String(P0.ans), 'pointer writing under the line read live');

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
  ok(work.carry, 'carry above the line ignored');
  ok(work.div, 'division: answer on the bar read, working under it ignored');
  ok(work.rows, 'several rows under the line: the bottom row is the answer');

  await page.evaluate(() => {
    for (const i of [2, 3, 4, 5, 7, 8]) writeNum(cards[i], cards[i].q.ans);
    writeNum(cards[10], cards[10].q.ans + 1);
  });
  if (SHOTS) await page.screenshot({ path: SHOTS + '/1-written-portrait.png' });
  await page.click('#markBtn');
  const states = await page.$$eval('.card', cs => cs.map(c => c.dataset.state));
  ok(states.slice(0, 10).every(s => s === 'right') && states[10] === 'wrong' && states[11] === 'writing', 'marking: right, wrong, blank left alone');
  ok((await page.$eval('#score', e => e.textContent)) === 'First try 10/12', 'score');

  const before = await page.evaluate(() => cards[3].strokes[0][0]);
  await page.setViewport({ width: 1180, height: 820, hasTouch: true });
  await wait(300);
  ok(await cols() === 4, 'landscape: 4 columns for 12');
  ok(await page.evaluate(b => { const c = cards[3]; return c.strokes[0][0][0] === b[0] && read(c) === String(c.q.ans); }, before), 'writing kept and still read after rotation');

  ok(await page.evaluate(() => { const e = cards[10].el; return getComputedStyle(e.querySelector('.override')).display === 'none'; }), 'wrong card offers only Try again');
  await page.click('.card[data-state="wrong"] .retry');
  await page.evaluate(() => writeNum(cards[10], cards[10].q.ans));
  await page.click('#markBtn');
  ok(await page.evaluate(() => { const e = cards[10].el; return e.dataset.state === 'right' && getComputedStyle(e.querySelector('.override')).display !== 'none'; }), 'right on a later try offers "I was right the first time"');
  await page.evaluate(() => writeNum(cards[11], cards[11].q.ans + 1, cards[11].q.kind === 'div' ? [] : numStrokes(1, -0.8, -3.4, 0.5)));
  await page.click('#markBtn');
  await page.click('.card[data-state="wrong"] .retry');
  ok(await page.evaluate(() => { const c = cards[11]; return c.el.dataset.state === 'writing' && c.el.querySelector('.read').textContent === '' && (c.q.kind === 'div' || c.strokes.length === 1); }), 'try again clears the answer and keeps the working');
  await page.evaluate(() => { sheetStart = Date.now() - 95000; writeNum(cards[11], cards[11].q.ans); });
  await page.click('#markBtn');
  ok(/^First try 10\/12 · 1:3[45]/.test(await page.$eval('#score', e => e.textContent)), 'finished: score and time');
  await page.evaluate(() => cards[10].el.querySelector('.override').click());
  ok(/^First try 11\/12/.test(await page.$eval('#score', e => e.textContent)), 'claim counts as first try');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/3-done-landscape.png' });
  const rec = await page.evaluate(() => { const r = loadRec(current); return [Object.keys(r.best).join(), r.history[0].first]; });
  ok(rec[0] === '+-*/|2|1:0123456789|12' && rec[1] === 11, 'record saved: ' + rec.join(' / '));

  // ---- Sam's case: 4 of 12 done, Mark marks those 4 at once (even writing in
  // the wrong place) and the clock keeps going; the rest later finish it
  await page.click('#markBtn'); // New sheet
  const part = await page.evaluate(() => {
    sheetStart = Date.now() - 30000;
    for (let i = 0; i < 3; i++) writeNum(cards[i], cards[i].q.ans);
    const c = cards[3]; c.strokes = numStrokes(c.q.ans, 0, c.q.kind === 'div' ? 0.6 : -2.2, 0.7); draw(c); // answer written in the wrong place
    return sheetStart;
  });
  await page.click('#markBtn');
  ok(await page.evaluate(() => cards.slice(0, 4).every(c => c.el.dataset.state !== 'writing') && cards.slice(4).every(c => c.el.dataset.state === 'writing')), 'one Mark marks all 4 written cards (including one written in the wrong place), leaves the 8 blank');
  ok(await page.evaluate(s => !sheetDone && sheetStart === s, part) && /^First try \d+\/12$/.test(await page.$eval('#score', e => e.textContent)), 'clock keeps going, no time yet');
  await page.evaluate(() => { cards.forEach((c, i) => { if (i >= 4) writeNum(c, c.q.ans); else if (c.el.dataset.state === 'wrong') { c.el.querySelector('.retry').click(); writeNum(c, c.q.ans); } }); });
  await page.click('#markBtn');
  ok(await page.evaluate(() => sheetDone && cards.every(c => c.el.dataset.state === 'right')) && / · \d:\d\d/.test(await page.$eval('#score', e => e.textContent)), 'then the other 8 in one Mark finish the sheet, with its time');

  // ---- Mia: Missing number
  await page.click('#backBtn');
  ok(await visible('#homeS') && /Best \d:\d\d/.test(await page.$eval('#actTiles [data-act="sums"] .sub', e => e.textContent)), 'home tile shows her best time');
  await page.click('#actTiles [data-act="missing"]');
  await page.click('#newBtn');
  const miss = await page.evaluate(() => cards.every(c => {
    const q = c.q, calc = { '+': (a, b) => a + b, '-': (a, b) => a - b, '*': (a, b) => a * b, '/': (a, b) => a / b }[q.op];
    return q.kind === 'miss' && calc(q.a, q.b) === q.c && q.ans === q[q.hide] && c.el.querySelectorAll('.bx').length === 2;
  }));
  ok(miss, 'missing number: every equation true, the box hides a or b');
  ok(await page.evaluate(() => { const out = []; for (let i = 0; i < 400; i++) out.push(ACTS.missing.make({ ops: ['*', '/'], a: 1, b: 1, pa: [0, 1, 2], pb: [0, 3], n: 6 })); return out.every(q => !(q.op === '*' && (q.hide === 'a' ? q.b : q.a) === 0) && !(q.op === '/' && q.hide === 'b' && q.a === 0)); }), 'missing number never has more than one right answer (no 0 × ☐ = 0)');
  const mw = await page.evaluate(() => {
    const c0 = cards[0], c1 = cards[1];
    writeNum(c0, c0.q.ans); // on the line
    // in the box in the equation: find the box, write there
    const bx = c1.el.querySelector('.eq .bx').getBoundingClientRect(), wr = c1.work.getBoundingClientRect();
    const right = (bx.right - wr.left - c1.ax) / c1.F, top = (bx.top - wr.top - c1.ay) / c1.F;
    c1.strokes = numStrokes(c1.q.ans, right, top, 0.8); draw(c1);
    return [read(c0) === String(c0.q.ans), read(c1) === String(c1.q.ans)];
  });
  ok(mw[0], 'missing number: answer on the line is read');
  ok(mw[1], 'missing number: answer written in the box is read');
  ok(await page.evaluate(() => { const c = cards[2]; c.strokes = numStrokes(c.q.ans, 0, 0.2); return read(c) === String(c.q.ans); }), 'missing number: answer written a bit low, under the line, is read');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/6-missing.png' });

  // every card's printed question fits and leaves room to write the answer
  const fits = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))).then(() => page.evaluate(() => cards.filter(c => {
    const w = c.work.getBoundingClientRect(), r = c.el.querySelector('.qv').getBoundingClientRect();
    const room = c.q.kind === 'bond' ? true // she writes in the circle, checked separately
      : c.q.kind === 'expr' || c.q.kind === 'miss' || c.q.kind === 'seq' ? c.ay > 2.5 * c.F
      : c.q.kind === 'story' ? c.ay > 2.5 * c.F && r.bottom <= w.bottom + 1
      : ['clock', 'money', 'graph', 'shape', 'ruler'].includes(c.q.kind) ? r.bottom <= w.bottom + 1 // she writes above the line, inside the question
      : c.h - c.ay >= 1.3 * c.F;
    return r.left < w.left - 1 || r.right > w.right + 1 || r.top < w.top - 1 || !room;
  }).map(c => JSON.stringify(c.q))));
  const writeAllAndMark = async () => {
    await page.evaluate(() => cards.forEach(c => writeNum(c, c.q.ans)));
    await page.click('#markBtn');
    return page.evaluate(() => cards.filter(c => c.el.dataset.state !== 'right').map(c => `${JSON.stringify(c.q)} read ${read(c)}`));
  };

  // ---- Mia: Arrays
  await page.click('#backBtn');
  await page.click('#actTiles [data-act="arrays"]');
  ok(await page.evaluate(() => $('#kpBlock').dataset.mode === 'grid' && $('#labA').textContent === 'Rows' && $('#labB').textContent === 'Columns' && getComputedStyle($('#opsOpts')).visibility === 'hidden'), 'Arrays setup: keypads for rows and columns, no signs');
  ok(await page.evaluate(() => { draft.pa = [0]; syncOpts(); const w = $('#warn').textContent, d = $('#newBtn').disabled; draft.pa = [2, 3, 4, 5]; syncOpts(); return /other than 0/.test(w) && d && !$('#newBtn').disabled; }), 'rows of only 0: warning and Start off');
  await page.click('#newBtn');
  ok(await page.evaluate(() => cards.every(c => c.q.kind === 'array' && c.q.ans === c.q.r * c.q.c && c.el.querySelectorAll('circle').length === c.q.ans && c.q.r >= 2 && c.q.r <= 5 && c.q.c >= 2 && c.q.c <= 9)), 'Arrays: 2–5 rows by 2–9 columns, dots = rows × columns');
  ok((await fits()).length === 0, 'Arrays fit with room to write ' + (await fits()).join(' '));
  ok((await writeAllAndMark()).length === 0, 'Arrays: answers written under them are read and marked right');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/12-arrays.png' });

  // ---- Mia: Place value
  await page.click('#backBtn');
  await page.click('#actTiles [data-act="pv"]');
  ok(await page.evaluate(() => draft.kinds.join() === 'blocks,expanded,more' && draft.max === 999), 'Place value setup: all three kinds, up to 999');
  await page.click('#optBlock [data-key="kinds"] [data-v="more"]');
  await page.click('#optBlock [data-key="kinds"] [data-v="expanded"]');
  await page.click('#optBlock [data-key="kinds"] [data-v="blocks"]'); // the last one stays on
  ok(await page.evaluate(() => draft.kinds.join() === 'blocks'), 'kinds toggle, and one always stays on');
  const pv = await page.evaluate(() => {
    const bad = [];
    for (let i = 0; i < 300; i++) {
      for (const max of [99, 999]) {
        const b = ACTS.pv.make({ kinds: ['blocks'], max });
        if (b.h * 100 + b.t * 10 + b.o !== b.ans || b.ans > max || b.ans < 10) bad.push('blocks ' + JSON.stringify(b));
        const e = ACTS.pv.make({ kinds: ['expanded'], max }), parts = e.text.split(' + ').map(Number);
        if (parts.reduce((x, y) => x + y, 0) !== e.ans || parts.some(p => p === 0 || !/^[1-9]0*$/.test(String(p)))) bad.push('expanded ' + JSON.stringify(e));
        const m = ACTS.pv.make({ kinds: ['more'], max }), [, amt, dir, v] = m.text.match(/^(\d+) (more|less) than (\d+)$/);
        if (m.ans !== (dir === 'more' ? +v + +amt : +v - +amt) || m.ans < 0 || m.ans > max || (max === 99 && +amt === 100)) bad.push('more ' + JSON.stringify(m));
      }
    }
    return bad.slice(0, 4);
  });
  ok(pv.length === 0, 'Place value questions: blocks = the number, expanded parts add up (no 0 parts), more/less right and in range ' + pv.join(' '));
  await page.click('#optBlock [data-key="kinds"] [data-v="expanded"]');
  await page.click('#optBlock [data-key="kinds"] [data-v="more"]');
  await page.click('#newBtn');
  ok(await page.evaluate(() => cards.filter(c => c.q.kind === 'pv').every(c => c.el.querySelectorAll('rect').length === c.q.h + c.q.t + c.q.o)), 'blocks drawn: one shape per hundred, ten and one');
  ok((await fits()).length === 0, 'Place value fits with room to write ' + (await fits()).join(' '));
  const pvBad = await writeAllAndMark();
  ok(pvBad.length === 0, 'Place value: blocks and "= ___" answers read and marked right ' + pvBad.join(' | '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/13-pv.png' });

  // ---- Mia: Number lines
  await page.click('#backBtn');
  await page.click('#actTiles [data-act="nline"]');
  ok(await page.evaluate(() => draft.steps.join() === '2,5,10'), 'Number lines setup: in 2s, 5s, 10s to start');
  await page.click('#optBlock [data-key="steps"] [data-v="100"]');
  await page.click('#newBtn');
  ok(await page.evaluate(() => cards.every(c => {
    const t = [...c.el.querySelectorAll('text')].map(x => +x.textContent);
    return c.q.ans === c.q.start + c.q.k * c.q.step && c.q.k >= 1 && c.q.k <= 9 && t[0] === c.q.start && t[1] === c.q.start + 10 * c.q.step && [2, 5, 10, 100].includes(c.q.step);
  })), 'Number lines: ends labelled, arrow inside, answer = start + steps');
  ok((await fits()).length === 0, 'Number lines fit with room to write ' + (await fits()).join(' '));
  ok((await writeAllAndMark()).length === 0, 'Number lines: answers read and marked right');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/14-nline.png' });
  // ---- Mia: Area
  await page.click('#backBtn');
  await page.click('#actTiles [data-act="area"]');
  ok(await page.evaluate(() => draft.kinds.join() === 'area,perim,side' && draft.max === 12), 'Area setup: area, perimeter, missing side, sides up to 12');
  await page.click('#optBlock [data-key="kinds"] [data-v="squares"]');
  const ar = await page.evaluate(() => {
    const bad = [];
    for (let i = 0; i < 400; i++) {
      const q = ACTS.area.make({ kinds: ['squares', 'area', 'perim', 'side'], max: 12 });
      const want = { squares: q.w * q.h, area: q.w * q.h, perim: 2 * (q.w + q.h), side: q.hide === 'w' ? q.w : q.h }[q.mode];
      if (q.ans !== want || q.w < 2 || q.h < 2 || q.w > 12 || q.h > 12 || (q.mode === 'squares' && (q.w > 10 || q.h > 10))) bad.push(JSON.stringify(q));
      if (q.mode === 'side' && q.cap !== `Area ${q.w * q.h}`) bad.push('cap ' + JSON.stringify(q));
    }
    return bad.slice(0, 3);
  });
  ok(ar.length === 0, 'Area questions: area, perimeter, missing side, squares all right ' + ar.join(' '));
  await page.click('#newBtn');
  ok(await page.evaluate(() => cards.every(c => {
    const t = [...c.el.querySelectorAll('svg text')].map(x => x.textContent), lines = c.el.querySelectorAll('svg line').length;
    if (c.q.mode === 'squares') return t.length === 0 && lines === c.q.w - 1 + c.q.h - 1;
    return t.length === 2 && t.includes(c.q.hide === 'w' ? '?' : String(c.q.w)) && t.includes(c.q.hide === 'h' ? '?' : String(c.q.h)) && c.el.querySelector('.cap').textContent === c.q.cap;
  })), 'Area cards: grid for counting, side lengths (or ?) and what to find');
  ok((await fits()).length === 0, 'Area fits with room to write ' + (await fits()).join(' '));
  ok((await writeAllAndMark()).length === 0, 'Area: answers read and marked right');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/15-area.png' });

  // ---- Mia: Times bonds
  await page.click('#backBtn');
  await page.click('#actTiles [data-act="tbond"]');
  ok(await page.evaluate(() => draft.tables.join() === '2,3,4,5,6,7,8,9,10,11,12' && draft.upto === 12), 'Times bonds setup: 2–12 tables, up to × 12');
  await page.click('#optBlock [data-key="upto"] [data-v="10"]');
  for (const t of [2, 3, 4, 5, 6, 8, 9, 10, 11, 12]) await page.click(`#optBlock [data-key="tables"] [data-v="${t}"]`); // just the 7s
  await page.click('#newBtn');
  ok(await page.evaluate(() => cards.every(c => c.q.kind === 'bond' && c.q.w === c.q.p * c.q.q2 && (c.q.p === 7 || c.q.q2 === 7) && Math.max(c.q.p, c.q.q2) <= 10 && Math.min(c.q.p, c.q.q2) >= 2 && c.el.querySelectorAll('.hole').length === 1)), 'Times bonds: just the 7s up to × 10, product on top');
  ok((await fits()).length === 0, 'Times bonds fit ' + (await fits()).join(' '));
  ok((await writeAllAndMark()).length === 0, 'Times bonds: answers in the empty circle read and marked right');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/16-tbond.png' });

  // ---- Mia: Fractions
  await page.click('#backBtn');
  await page.click('#actTiles [data-act="frac"]');
  ok(await page.evaluate(() => draft.kinds.join() === 'shapes,line' && draft.parts.join() === '2,3,4,6,8'), 'Fractions setup: shapes and number line, 2 3 4 6 8 parts');
  await page.click('#newBtn');
  ok(await page.evaluate(() => cards.every(c => {
    const q = c.q;
    if (q.n < 1 || q.n >= q.d || q.shaded.length !== q.n) return false;
    if (q.shape === 'bar') return c.el.querySelectorAll(`svg rect[fill="${SHADE}"]`).length === q.n && c.el.querySelectorAll('svg rect').length === q.d + 1;
    if (q.shape === 'circle') return c.el.querySelectorAll(`svg path[fill="${SHADE}"]`).length === q.n && c.el.querySelectorAll('svg path').length === q.d;
    return c.el.querySelectorAll('svg line').length === q.d + 2;
  })), 'Fractions: the right number of parts, n shaded (or n ticks along on the line)');
  ok((await fits()).length === 0, 'Fractions fit ' + (await fits()).join(' '));
  const fr = await page.evaluate(() => {
    const c = cards[0], q = c.q, out = {};
    writeNum(c, `${q.n}/${q.d}`); out.plain = readAnswer(c).ok && read(c) === `${q.n}/${q.d}`;
    writeNum(c, `${q.n * 2}/${q.d * 2}`); out.equal = readAnswer(c).ok;
    writeNum(c, `${q.n + 1}/${q.d}`); out.wrong = !readAnswer(c).ok;
    c.strokes = numStrokes(q.n, -0.3, -1.6, 0.9); out.half = read(c) === `${q.n}/?` && !readAnswer(c).ok;
    writeNum(c, `${q.n}/${q.d}`, numStrokes(1, 3, -4, 0.6)); out.picture = readAnswer(c).ok; // a mark on the picture is ignored
    return out;
  });
  ok(fr.plain, 'Fractions: top over bottom read as n/d');
  ok(fr.equal, 'an equal fraction counts (2/4 for 1/2)');
  ok(fr.wrong, 'a different fraction is wrong');
  ok(fr.half, 'only a top number: shown as n/?, not right');
  ok(fr.picture, 'marks on the picture are ignored');
  ok((await writeAllAndMark()).length === 0, 'Fractions: whole sheet read and marked right');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/17-frac.png' });
  await page.click('#markBtn'); // new sheet, then try again keeps nothing of the answer
  await page.evaluate(() => { writeNum(cards[0], `${cards[0].q.n + 1}/${cards[0].q.d}`); });
  await page.click('#markBtn');
  await page.click('.card[data-state="wrong"] .retry');
  ok(await page.evaluate(() => cards[0].strokes.length === 0), 'Fractions: Try again clears both numbers');

  // ---- Mia: Clocks (Years 1–4)
  await page.click('#backBtn');
  await page.click('#actTiles [data-act="clock"]');
  ok(await page.evaluate(() => draft.yr === 4 && draft.kinds.join() === 'face,words'), 'Clocks setup at age 8: Year 4 suggested, clock and words');
  ok(await page.evaluate(() => $('#optBlock [data-key="yr"] .sug').dataset.v === '4' && /^Suggested for age 8: Year 4$/.test($('.sughint').textContent)), 'the suggested year has a dot and a line saying so');
  const ck = await page.evaluate(() => {
    const bad = [];
    const minsOk = { 1: m => m === 0, 2: m => [0, 15, 30, 45].includes(m), 3: m => m % 5 === 0 && m < 60, 4: m => m >= 0 && m < 60 };
    for (const yr of [1, 2, 3, 4]) for (let i = 0; i < 300; i++) {
      const q = ACTS.clock.make({ yr, kinds: ['face', 'words'] });
      if (q.h < 1 || q.h > 12 || !minsOk[yr](q.m)) bad.push(yr + ' range ' + JSON.stringify(q));
      if (yr === 1 && (q.two || q.ans !== q.h || q.words)) bad.push('y1 ' + JSON.stringify(q));
      if (yr > 1 && (!q.two || q.parts[0] !== q.h || q.parts[1] !== q.m || q.ticks !== (yr >= 3))) bad.push(yr + ' parts ' + JSON.stringify(q));
    }
    const w = [[4, 0], [4, 15], [4, 30], [4, 45], [12, 40], [12, 45], [7, 17], [3, 59], [9, 5]].map(([h, m]) => timeWords(h, m)).join(' / ');
    if (w !== "4 o'clock / quarter past 4 / half past 4 / quarter to 5 / 20 to 1 / quarter to 1 / 17 minutes past 7 / 1 minute to 4 / 5 past 9") bad.push('words: ' + w);
    // hands: the minute hand points at the minutes, the hour hand moves on through the hour
    const ends = q => [...new DOMParser().parseFromString(clockSvg(q), 'image/svg+xml').querySelectorAll('path[stroke-linecap]')].map(p => p.getAttribute('d').match(/L(\S+) (\S+)/).slice(1).map(Number));
    const ang = ([x, y]) => (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360;
    const [hh, mm] = ends({ h: 3, m: 30 });
    if (Math.abs(ang(mm) - 180) > 0.5 || Math.abs(ang(hh) - 105) > 0.5) bad.push('hands at 3:30 ' + ang(hh) + ' ' + ang(mm));
    return bad.slice(0, 4);
  });
  ok(ck.length === 0, 'Clocks: o\'clock / half and quarter / 5 minutes / any minute, words and hands right ' + ck.join(' | '));
  await page.click('#newBtn');
  ok(await page.evaluate(() => cards.every(c => c.q.kind === 'clock' && c.q.two && c.el.querySelectorAll('.ln').length === 2 && (c.q.words ? c.el.querySelector('.words').textContent === c.q.words : c.el.querySelectorAll('svg text').length === 12))), 'Clocks cards: a face (or words) and "__ : __"');
  ok((await fits()).length === 0, 'Clocks fit ' + (await fits()).join(' '));
  const cr = await page.evaluate(() => {
    const c = cards[0], out = {};
    c.q = { kind: 'clock', h: 3, m: 5, ticks: true, two: true, parts: [3, 5], ans: '3:05' }; layout(c); sizeCanvas(c);
    writeNum(c, ['3', '05']); out.zero = readAnswer(c).ok && read(c) === '3:05';
    writeNum(c, ['3', '5']); out.plain = readAnswer(c).ok;
    writeNum(c, ['5', '3']); out.swapped = !readAnswer(c).ok;
    c.strokes = numStrokes(3, -0.45, -1.05, 0.85); out.half = read(c) === '3:?' && !readAnswer(c).ok;
    writeNum(c, ['3', '5'], numStrokes(7, 1, -5, 0.6)); out.face = readAnswer(c).ok; // a mark on the clock is ignored
    return out;
  });
  ok(cr.zero && cr.plain, 'Clocks: 3:05 read whether she writes 05 or 5');
  ok(cr.swapped && cr.half, 'Clocks: swapped numbers are wrong; only the hour shows 3:? and is not right');
  ok(cr.face, 'Clocks: marks on the clock face are ignored');
  ok((await writeAllAndMark()).length === 0, 'Clocks: whole sheet read and marked right');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/20-clocks.png' });
  await page.click('#markBtn');
  await page.evaluate(() => writeNum(cards[0], [String(cards[0].q.h % 12 + 1), String(cards[0].q.m)]));
  await page.click('#markBtn');
  await page.click('.card[data-state="wrong"] .retry');
  ok(await page.evaluate(() => cards[0].strokes.length === 0), 'Clocks: Try again clears both numbers');
  await page.click('#setupBtn');
  await page.click('#optBlock [data-key="yr"] [data-v="1"]');
  await page.click('#newBtn');
  ok(await page.evaluate(() => cards.every(c => !c.q.two && c.q.m === 0 && c.el.querySelectorAll('.ln').length === 1 && /o.clock/.test(c.el.querySelector('.ans').textContent))), 'Clocks Year 1: on the hour, "__ o\'clock"');
  ok((await fits()).length === 0, 'Clocks Year 1 fit ' + (await fits()).join(' '));
  ok((await writeAllAndMark()).length === 0, 'Clocks Year 1: hours read and marked right');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/21-clocks-y1.png' });

  // ---- Mia: Money (Years 1–3)
  await page.click('#backBtn');
  await page.click('#actTiles [data-act="money"]');
  ok(await page.evaluate(() => draft.yr === 3 && draft.kinds.join() === 'count,change' && /Year 4 \(Year 3 is the highest here so far\)/.test($('.sughint').textContent)), 'Money setup at age 8: Year 3, the highest built, and says so');
  const mo = await page.evaluate(() => {
    const bad = [];
    for (const yr of [1, 2, 3]) for (let i = 0; i < 400; i++) {
      const q = ACTS.money.make({ yr, kinds: ['count', 'change'] });
      const total = q.change ? q.pay - q.price : sumOf(q.items);
      const want = q.unit === '$c' ? [Math.floor(total / 100), total % 100] : q.unit === '$' ? total / 100 : total;
      if (q.unit === '$c' ? !(q.two && q.parts[0] === want[0] && q.parts[1] === want[1]) : q.ans !== want) bad.push('answer ' + JSON.stringify(q));
      if (q.unit === '$' && total % 100) bad.push('whole dollars ' + JSON.stringify(q));
      if (q.change) {
        if (q.price <= 0 || q.price >= q.pay || !isNote(q.pay)) bad.push('change ' + JSON.stringify(q));
        if ((yr < 3) !== (q.unit === '$')) bad.push('change unit ' + JSON.stringify(q));
      } else {
        const cents = q.items.filter(v => v < 100), dollars = q.items.filter(v => v >= 100);
        if (yr === 1 && (cents.length || total > 1000)) bad.push('y1 ' + JSON.stringify(q));
        if (yr === 2 && ((cents.length && dollars.length) || (cents.length && total > 100) || total > 10000 || (q.items.some(v => v >= 500) && q.items.some(v => v < 500)))) bad.push('y2 ' + JSON.stringify(q));
        if (yr === 3 && (!cents.length || !dollars.length || sumOf(cents) >= 100 || q.unit !== '$c')) bad.push('y3 ' + JSON.stringify(q));
      }
    }
    return bad.slice(0, 4);
  });
  ok(mo.length === 0, 'Money: totals and change right; Year 1 whole dollars to $10, Year 2 coins or notes, Year 3 dollars and cents ' + mo.join(' | '));
  await page.click('#newBtn');
  ok(await page.evaluate(() => cards.every(c => {
    const q = c.q, svg = c.el.querySelector('.qv svg');
    if (q.change) return c.el.querySelector('.cap').textContent === 'Change?' && svg.querySelectorAll('text').length >= 4;
    return svg.querySelectorAll('circle').length + svg.querySelectorAll('rect').length / 2 === q.items.length;
  })), 'Money cards: one coin or note drawn per item; change shows the price and the note');
  ok((await fits()).length === 0, 'Money fits ' + (await fits()).join(' '));
  ok((await writeAllAndMark()).length === 0, 'Money: whole sheet read and marked right');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/22-money.png' });
  for (const yr of [2, 1]) {
    await page.click('#setupBtn');
    await page.click(`#optBlock [data-key="yr"] [data-v="${yr}"]`);
    await page.click('#newBtn');
    ok((await fits()).length === 0, `Money Year ${yr} fits ` + (await fits()).join(' '));
    ok((await writeAllAndMark()).length === 0, `Money Year ${yr}: read and marked right`);
    if (SHOTS) await page.screenshot({ path: SHOTS + `/23-money-y${yr}.png` });
  }
  ok(await page.evaluate(() => [labelFor('clock~3|face,words|12'), labelFor('money~1|count|6')].join(' / '))
    === 'Clocks · Year 3 · clock, words · 12 questions / Money · Year 1 · how much · 6 questions', 'record labels for Clocks and Money');
  ok(await page.evaluate(() => [cardSay({ kind: 'money', change: true, price: 350, pay: 500 }), cardSay({ kind: 'clock', words: 'half past 4' })].join(' / '))
    === 'It costs 3 dollars and 50 cents. You pay 5 dollars. How much change? / half past 4. Write the time.', 'Clocks and Money cards read aloud');

  // ---- year-set sheets: open an activity, pick a year, check it fits and marks right
  const yearSheet = async (a, yr, name) => {
    if (await visible('#sheet') && await page.evaluate(x => act === x, a)) await page.click('#setupBtn');
    else { await page.click('#backBtn'); await page.click(`#actTiles [data-act="${a}"]`); }
    await page.click(`#optBlock [data-key="yr"] [data-v="${yr}"]`);
    await page.click('#newBtn');
    ok((await fits()).length === 0, `${name} Year ${yr} fits ` + (await fits()).join(' '));
    const bad = await writeAllAndMark();
    ok(bad.length === 0, `${name} Year ${yr}: read and marked right ` + bad.join(' | '));
  };

  // ---- Add and take away, Times and divide (Sums by year; the original Sums stays as it was)
  const ys = await page.evaluate(() => {
    const bad = [];
    const nums = q => q.kind === 'expr' ? (([a, , b]) => [+a, +b])(q.text.split(' ')) : [q.a, q.b];
    const lim = { 1: [20, 20], 2: [100, 100], 3: [999, 999], 4: [9999, 9999] };
    for (const yr of [1, 2, 3, 4]) for (const op of ['+', '-', '*', '/']) for (let i = 0; i < 300; i++) {
      const q = (op === '+' || op === '-' ? addSubQ : mulDivQ)(op, yr), [a, b] = nums(q);
      const want = { '+': a + b, '-': a - b, '*': a * b, '/': a / b }[op];
      if (q.ans !== want || !Number.isInteger(q.ans) || q.ans < 0) bad.push(`${yr} wrong ${JSON.stringify(q)}`);
      if ((yr <= 2) !== (q.kind === 'expr') || (yr >= 3 && q.kind !== (op === '/' ? 'div' : 'col'))) bad.push(`${yr} layout ${JSON.stringify(q)}`);
      if ((op === '+' || op === '-') && (Math.max(a, b, q.ans) > lim[yr][0] || (yr === 3 && a < 100) || (yr === 4 && a < 1000))) bad.push(`${yr} size ${JSON.stringify(q)}`);
      if (op === '*' && yr <= 2 && (![2, 5, 10].includes(a) && ![2, 5, 10].includes(b) || (yr === 1 && q.ans > 20))) bad.push(`${yr} times ${JSON.stringify(q)}`);
      if (op === '/' && (b < 2 || b > 10 || (yr === 1 && a > 20) || (yr <= 2 && ![2, 5, 10].includes(b)))) bad.push(`${yr} divide ${JSON.stringify(q)}`);
    }
    return bad.slice(0, 4);
  });
  ok(ys.length === 0, 'Sums by year: answers right; Year 1 within 20, 2 within 100, 3 three digits, 4 four digits; 2s 5s 10s first; across in Years 1–2, stacked after ' + ys.join(' | '));
  await page.click('#backBtn');
  await page.click('#actTiles [data-act="addsub"]');
  ok(await page.evaluate(() => draft.yr === 4 && draft.ops.join() === '+,-' && $('#kpBlock').hidden), 'Add and take away setup at age 8: Year 4, + and −, no keypads');
  for (const yr of [3, 1, 2, 4]) await yearSheet('addsub', yr, 'Add and take away');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/24-addsub-y4.png' });
  for (const yr of [3, 1, 2, 4]) await yearSheet('muldiv', yr, 'Times and divide');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/25-muldiv-y4.png' });
  ok(await page.evaluate(() => { const q = addSubQ('+', 1); return cardSay(q) === q.text.replace('+', 'plus'); }), 'Year 1 sums are read aloud ("3 plus 4")');

  // ---- Number patterns
  const sq = await page.evaluate(() => {
    const bad = [], max = { 1: 100, 2: 120, 3: 1000 };
    for (const yr of [1, 2, 3]) for (let i = 0; i < 400; i++) {
      const q = seqQ(yr), t = q.terms, d = t[1] - t[0];
      if (t.length !== 5 || t.some((v, j) => j && v - t[j - 1] !== d) || d === 0 || Math.min(...t) < 0 || Math.max(...t) > max[yr] || q.ans !== t[q.hide]) bad.push(`${yr} ${JSON.stringify(q)}`);
      if (yr === 1 && ![1, 2, 10].includes(Math.abs(d))) bad.push('y1 step ' + JSON.stringify(q));
    }
    return bad.slice(0, 4);
  });
  ok(sq.length === 0, 'Number patterns: five terms, same step, never below 0 or past the year\'s top, Year 1 in 1s, 2s, 10s ' + sq.join(' | '));
  for (const yr of [3, 1, 2]) await yearSheet('seq', yr, 'Number patterns');
  ok(await page.evaluate(() => cards.every(c => c.el.querySelectorAll('.eq .bx').length === 1)), 'Number patterns: one box in the pattern');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/26-seq.png' });

  // ---- Doubles and halves
  const dq = await page.evaluate(() => {
    const bad = [];
    for (const yr of [1, 2, 3]) for (let i = 0; i < 300; i++) {
      const q = dblQ(yr, ['double', 'half']), n = +q.cap?.match(/\d+/)?.[0] || +q.text.match(/\d+/)[0], dbl = /double/.test(q.cap || q.text);
      if (q.ans !== (dbl ? 2 * n : n / 2) || (yr === 1 && (q.kind !== 'dpic' || q.ans > 10)) || (yr === 2 && Math.max(n, q.ans) > 20)) bad.push(`${yr} ${JSON.stringify(q)}`);
    }
    return bad.slice(0, 4);
  });
  ok(dq.length === 0, 'Doubles and halves: right answers, Year 1 to 10 with dots, Year 2 to 20 ' + dq.join(' | '));
  for (const yr of [3, 1]) await yearSheet('dbl', yr, 'Doubles and halves');
  ok(await page.evaluate(() => cards.every(c => {
    const full = c.el.querySelectorAll('svg circle[fill="currentColor"]').length, empty = c.el.querySelectorAll('svg circle[fill="none"]').length;
    return c.q.dbl ? full === c.q.n && empty === c.q.n : full === 2 * c.q.n && empty === 0;
  })), 'Year 1 dots: a double shows n and n empty spaces, a half shows 2n split down the middle');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/27-dbl-y1.png' });

  // ---- Story sums
  const sto = await page.evaluate(() => {
    const bad = [], top = { 1: 20, 2: 100, 3: 1000 };
    const calc = { add: n => n[0] + n[1], sub: n => n[0] - n[1], compare: n => n[0] - n[1], need: n => n[1] - n[0], two: n => n[0] + n[1] - n[2], groups: n => n[0] * n[1], share: n => n[0] / n[1] };
    for (const yr of [1, 2, 3]) for (const kinds of [['addsub', 'muldiv'], ['muldiv'], ['addsub']]) for (let i = 0; i < 150; i++) {
      const q = storyQ(yr, kinds), n = q.text.match(/\d+/g).map(Number);
      if (q.ans !== calc[q.type](n) || q.ans < 2 || Math.max(...n, q.ans) > top[yr]) bad.push(`${yr} ${JSON.stringify(q)}`);
      if (!kinds.includes(STORY_KIND[q.type]) || (yr === 1 && ['compare', 'need', 'two'].includes(q.type))) bad.push(`${yr} type ${q.type} ${kinds}`);
      if (q.type === 'two' && Math.max(...n) > (yr === 2 ? 20 : 100)) bad.push('two steps too big ' + JSON.stringify(q));
    }
    return bad.slice(0, 4);
  });
  ok(sto.length === 0, 'Story sums: the answer matches the story; Year 1 within 20 (no two-step), Year 2 within 100 (two-step within 20), Year 3 within 1,000 ' + sto.join(' | '));
  for (const yr of [3, 1, 2]) await yearSheet('story', yr, 'Story sums');
  ok(await page.evaluate(() => cards.every(c => cardSay(c.q) === c.q.text && c.el.querySelector('.u').textContent === c.q.unit)), 'Story sums: each card reads its story aloud, the answer line has its unit');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/28-story-y2.png' });

  // ---- Graphs
  const gq = await page.evaluate(() => {
    const bad = [];
    for (const yr of [1, 2, 3]) for (let i = 0; i < 300; i++) {
      const q = graphQ(yr), ns = q.cats.map(c => c.n), by = Object.fromEntries(q.cats.map(c => [c.nm, c.n]));
      const want = q.ask === 'one' ? by[q.of[0]] : q.ask === 'more' ? by[q.of[0]] - by[q.of[1]] : ns.reduce((a, b) => a + b, 0);
      if (q.ans !== want || q.ans < 1 || new Set(ns).size !== ns.length) bad.push(`${yr} ${JSON.stringify(q)}`);
      if ((yr === 1 && (q.type !== 'pic' || q.ask !== 'one' || q.cats.length !== 3 || Math.max(...ns) > 8)) || (yr === 2 && q.type === 'bar') || (yr === 3 && (q.type !== 'bar' || ns.some(n => n % q.step)))) bad.push(`${yr} type ${JSON.stringify(q)}`);
      // the drawing shows the counts: dots, tally marks, or bar heights on the scale
      const svg = new DOMParser().parseFromString(graphSvg(q), 'image/svg+xml');
      if (q.type === 'pic' && svg.querySelectorAll('circle').length !== ns.reduce((a, b) => a + b, 0)) bad.push('dots ' + JSON.stringify(q));
      if (q.type === 'tally' && svg.querySelectorAll('line').length !== ns.reduce((a, b) => a + b, 0)) bad.push('tally ' + JSON.stringify(q));
      if (q.type === 'bar') {
        const bars = [...svg.querySelectorAll('rect')].filter(r => +r.getAttribute('width') === 13).map(r => +r.getAttribute('height'));
        if (bars.some((h, j) => Math.abs(h - ns[j] * 60 / (6 * q.step)) > 0.01)) bad.push('bars ' + JSON.stringify(q));
      }
    }
    return bad.slice(0, 4);
  });
  ok(gq.length === 0, 'Graphs: answers match the counts and the drawing (dots, tally marks, bars on the scale); Year 1 picture graphs, Year 3 bar graphs ' + gq.join(' | '));
  for (const yr of [3, 1, 2]) await yearSheet('graph', yr, 'Graphs');
  ok(await page.evaluate(() => cards.every(c => c.el.querySelectorAll('.cap .sw').length === c.q.of.length && cardSay(c.q) === c.q.say)), 'Graphs: colour squares in the question, read aloud by colour name');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/29-graph-y2.png' });

  // ---- Shapes
  const shq = await page.evaluate(() => {
    const bad = [], symOk = { 4: [4], 2: [2], 1: [1], 3: [3], 5: [5], 6: [6], 8: [8] };
    for (const yr of [1, 2, 3]) for (const kinds of [['flat', 'solid'], ['flat'], ['solid']]) for (let i = 0; i < 200; i++) {
      const q = shapeQ(yr, kinds);
      if (q.solid) { if (yr === 1 || !kinds.includes('solid') || q.ans !== SOLIDS[q.solid][q.ask] || (yr === 2 && q.ask === 'edges')) bad.push(`${yr} solid ${JSON.stringify(q)}`); continue; }
      if (q.ask === 'sym') { if (yr !== 3 || !symOk[q.ans]) bad.push('sym ' + JSON.stringify(q)); continue; }
      const n = q.pts.length;
      if (q.ans !== n || (yr === 1 && n > 4) || (yr === 2 && n > 6) || n > 10 || q.pts.some(p => Math.hypot(...p) > 46)) bad.push(`${yr} flat ${JSON.stringify(q)}`);
      if (yr >= 2 && kinds.length === 1 && kinds[0] === 'solid' && !q.solid) bad.push('solid only gave flat');
    }
    return bad.slice(0, 4);
  });
  ok(shq.length === 0, 'Shapes: sides = corners = points drawn; 3D faces, edges, corners right; Year 1 up to 4 sides, Year 2 up to 6, symmetry in Year 3 ' + shq.join(' | '));
  for (const yr of [3, 1, 2]) await yearSheet('shape', yr, 'Shapes');
  ok(await page.evaluate(() => cards.every(c => c.q.solid ? c.el.querySelectorAll('svg line[stroke-dasharray]').length === 3 : c.el.querySelector('svg polygon').getAttribute('points').split(' ').length === c.q.pts.length)), 'Shapes: the polygon has as many corners as the answer; 3D shapes show hidden edges dashed');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/30-shape-y2.png' });

  // ---- Rulers
  const rq = await page.evaluate(() => {
    const bad = [];
    for (const yr of [1, 2, 3]) for (let i = 0; i < 300; i++) {
      const q = rulerQ(yr);
      if (q.ans !== q.e - q.s || q.ans < 2 || q.s < 0 || (yr < 3 && q.s !== 0) || q.e > { 1: 9, 2: 10, 3: 12 }[yr] || q.unit !== (yr === 1 ? 'blocks' : 'cm')) bad.push(`${yr} ${JSON.stringify(q)}`);
    }
    return bad.slice(0, 4);
  });
  ok(rq.length === 0, 'Rulers: length = end − start, Year 1 in blocks, Year 2 from 0, Year 3 sometimes not from 0 ' + rq.join(' | '));
  for (const yr of [3, 1, 2]) await yearSheet('ruler', yr, 'Rulers');
  ok(await page.evaluate(() => cards.every(c => { const t = [...c.el.querySelectorAll('svg text')].map(x => +x.textContent); return t.length === 11 && t[0] === 0 && t[10] === 10 && c.el.querySelector('.u').textContent === 'cm'; })), 'Rulers Year 2: a 0–10 cm ruler and "cm" after the line');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/31-ruler-y2.png' });
  ok(await page.evaluate(() => [labelFor('graph~3|12'), labelFor('shape~2|flat,solid|6'), labelFor('ruler~1|6')].join(' / '))
    === 'Graphs · Year 3 · 12 questions / Shapes · Year 2 · flat, 3D · 6 questions / Rulers · Year 1 · 6 questions', 'record labels for Graphs, Shapes, Rulers');

  ok(await page.evaluate(() => [labelFor('addsub~2|+-|12'), labelFor('muldiv~3|*/|6'), labelFor('seq~1|6'), labelFor('dbl~3|double,half|12'), labelFor('story~2|addsub,muldiv|6')].join(' / '))
    === 'Add and take away · Year 2 · + − · 12 questions / Times and divide · Year 3 · × ÷ · 6 questions / Number patterns · Year 1 · 6 questions / Doubles and halves · Year 3 · doubles, halves · 12 questions / Story sums · Year 2 · + −, × ÷ · 6 questions', 'record labels for the new activities');

  // ---- Mia: Times grid
  await page.click('#backBtn');
  await page.click('#actTiles [data-act="tgrid"]');
  ok(await visible('#optBlock [data-key="tables"]') && !(await visible('#nOpts')) && !(await visible('#previewLab')), 'Times grid setup: tables, size, numbers; no Questions row or examples');
  await page.click('#optBlock [data-key="count"] [data-v="12"]');
  await page.click('#newBtn');
  ok(await visible('#gridS') && !(await visible('#markBtn')), 'grid shown, no Mark button while playing');
  const gl = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('#tGrid .gc')];
    return {
      n: cells.length, lower: cells.filter(c => +c.dataset.c < +c.dataset.r).length,
      off: cells.filter(c => c.classList.contains('off')).map(c => c.dataset.r + 'x' + c.dataset.c).join(),
      heads: [...document.querySelectorAll('#tGrid [data-col]')].map(h => h.textContent).join(),
    };
  });
  ok(gl.n === 78 && gl.lower === 0 && gl.heads === '1,2,3,4,5,6,7,8,9,10,11,12', `12 × 12, one triangle only: ${gl.n} cells, none below the diagonal`);
  ok(gl.off === '1x1', 'only 1 × 1 is grey when the 1s table is not chosen: ' + gl.off);
  // a right cell and a wrong cell for the number on the tile
  const cellFor = right => page.evaluate(ok => {
    const c = [...document.querySelectorAll('#tGrid .gc:not(.off):not(.done)')].find(x => (+x.dataset.r * +x.dataset.c === G.value) === ok);
    const b = c.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, r: c.dataset.r, c: c.dataset.c };
  }, right);
  const tileAt = async () => { const b = await (await page.$('#gTile')).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  // drag it to the right cell (and the row and column light up on the way)
  let [tx, ty] = await tileAt(), good = await cellFor(true);
  await page.mouse.move(tx, ty); await page.mouse.down(); await page.mouse.move(good.x, good.y, { steps: 8 });
  ok(await page.evaluate(g => document.querySelector(`#tGrid [data-row="${g.r}"]`).classList.contains('lit') && document.querySelector(`#tGrid [data-col="${g.c}"]`).classList.contains('lit'), good), 'while dragging, the row and column light up');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/18-grid-drag.png' });
  await page.mouse.up();
  ok(await page.evaluate(g => document.querySelector(`#tGrid .gc[data-r="${g.r}"][data-c="${g.c}"]`).classList.contains('done') && G.placed === 1 && G.first === 1, good), 'dropped on the right cell: it fills in, first try');
  // drag to a wrong cell: bounces back
  [tx, ty] = await tileAt(); const bad = await cellFor(false);
  await page.mouse.move(tx, ty); await page.mouse.down(); await page.mouse.move(bad.x, bad.y, { steps: 8 }); await page.mouse.up();
  ok(await page.evaluate(g => !document.querySelector(`#tGrid .gc[data-r="${g.r}"][data-c="${g.c}"]`).classList.contains('done') && G.placed === 1 && G.tries === 1, bad), 'dropped on a wrong cell: stays empty, counts a miss');
  // tapping the right cell works too, but this one isn't first try
  good = await cellFor(true);
  await page.mouse.click(good.x, good.y);
  ok(await page.evaluate(() => G.placed === 2 && G.first === 1), 'tapping the right cell places it (not first try after a miss)');
  // the rest, then it finishes with a time
  await page.evaluate(() => { G.start = Date.now() - 61000; while (!G.done) { const c = [...document.querySelectorAll('#tGrid .gc:not(.off):not(.done)')].find(x => +x.dataset.r * +x.dataset.c === G.value); dropOn(c); } });
  ok(await page.evaluate(() => G.placed === 12 && document.querySelectorAll('#tGrid .gc.done').length === 12) && /First try 11\/12 · 1:0[12]/.test(await page.$eval('#score', e => e.textContent)), 'finished: 12 placed, first try 11/12 with its time ' + await page.$eval('#score', e => e.textContent));
  ok(await visible('#markBtn') && await page.$eval('#markBtn', e => e.textContent) === 'New grid', 'then "New grid" appears');
  ok(await page.evaluate(() => { const r = loadRec(current); return r.history[0].k === 'tgrid~2,3,4,5,6,7,8,9,10,11,12|12|12' && r.history[0].first === 11; }), 'saved to her records');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/19-grid-done.png' });
  await page.click('#markBtn');
  ok(await page.evaluate(() => !G.done && G.placed === 0 && document.querySelectorAll('#tGrid .gc.done').length === 0) && !(await visible('#markBtn')), 'New grid starts an empty one');
  await page.click('#setupBtn'); await page.click('#backBtn');
  ok(await visible('#gridS'), 'Start again then Back returns to the grid');
  ok(await page.evaluate(() => labelFor('tgrid~2,3,4,5,7|10|0')) === 'Times grid · 2–5, 7 · 10 × 10 · whole grid', 'record label for the grid');

  ok(await page.evaluate(() => [labelFor('area~area,perim|12|12'), labelFor('tbond~2,3,4,5,7|12|12'), labelFor('frac~shapes|2,3,4|6')].join(' / '))
    === 'Area · area, perimeter · sides up to 12 · 12 questions / Times bonds · 2–5, 7 · up to × 12 · 12 questions / Fractions · shapes · 2, 3, 4 parts · 6 questions', 'record labels for Area, Times bonds, Fractions');
  ok(await page.evaluate(() => [labelFor('arrays~2345|23456789|12'), labelFor('pv~blocks,more|999|6'), labelFor('nline~2,5,10|12')].join(' / '))
    === 'Arrays · 2–5 rows · 2–9 columns · 12 questions / Place value · blocks, more · up to 999 · 6 questions / Number lines · in 2s, 5s, 10s · 12 questions', 'record labels for the new activities');

  // ---- Ada (5): How many? and Make 10, read aloud
  await page.click('#backBtn'); await page.click('#backBtn');
  await page.click('#nameTiles [data-id="old1"]');
  await page.click('#actTiles [data-act="howmany"]');
  await page.click('#newBtn');
  ok((await said()).slice(-1)[0] === 'How many dots?', 'age 5: the question is read aloud');
  const hm = await page.evaluate(() => cards.every(c => c.q.kind === 'frame' && c.q.ans === c.q.dots && c.el.querySelectorAll('svg circle').length === c.q.dots && c.q.dots >= 1 && c.q.dots <= 10));
  ok(hm, 'How many?: ten frame shows exactly the answer in dots (up to 10)');
  ok(await page.evaluate(() => { writeNum(cards[0], cards[0].q.ans); return read(cards[0]) === String(cards[0].q.ans); }), 'How many?: answer under the line read');
  await page.click('#sayBtn');
  ok((await said()).slice(-1)[0] === 'How many dots?', 'speaker button repeats it');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/7-howmany.png' });
  await page.click('#setupBtn');
  ok(await visible('#optBlock [data-key="max"]') && !(await visible('#kpBlock')), 'How many? setup: Up to, no keypads');
  await page.click('#optBlock [data-key="max"] [data-v="20"]');
  await page.click('#newBtn');
  ok(await page.evaluate(() => cards.every(c => c.el.querySelectorAll('.frame svg').length === 2 && c.el.querySelectorAll('svg circle').length === c.q.dots)), 'up to 20: two frames, dots match');
  await page.click('#backBtn');
  await page.click('#actTiles [data-act="make10"]');
  ok((await said()).slice(-1)[0] === 'How many more dots to make ten?', 'Make 10 read aloud');
  ok(await page.evaluate(() => cards.every(c => c.q.ans === 10 - c.q.dots && c.el.querySelectorAll('circle[fill="none"]').length === c.q.ans)), 'Make 10: empty spaces match the answer');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/8-make10.png' });
  // backwards digits still count, and are pointed out (shown and said)
  await page.evaluate(() => { cards[0].q = { kind: 'frame', dots: 7, frames: 1, empty: true, ans: 3 }; layout(cards[0]); sizeCanvas(cards[0]); writeNum(cards[0], 3, [], true); });
  await page.click('#markBtn');
  ok(await page.evaluate(() => cards[0].el.dataset.state === 'right' && cards[0].first === true && !!cards[0].el.querySelector('.read .flipd')), 'backwards 3: marked right first time, shown mirrored next to a 3');
  ok(/your 3 is backwards/.test((await said()).slice(-1)[0]), 'backwards 3 is said out loud: ' + (await said()).slice(-1)[0]);
  await page.evaluate(() => { cards[1].q = { kind: 'frame', dots: 5, frames: 1, empty: true, ans: 5 }; layout(cards[1]); sizeCanvas(cards[1]); writeNum(cards[1], 2); });
  await page.click('#markBtn');
  ok(await page.evaluate(() => cards[1].el.dataset.state === 'wrong'), 'a real 2 is not taken as a backwards 5');

  // every card has a speaker at age 5
  ok(await page.$$eval('.card .cardsay', b => b.length) === 6, 'age 5: a speaker on every card');
  await page.click('.card:nth-child(3) .cardsay');
  ok((await said()).slice(-1)[0] === 'How many more dots to make ten?', 'card speaker reads the card');

  // Number bonds: write in the empty circle
  await page.click('#backBtn');
  await page.click('#actTiles [data-act="bonds"]');
  await page.click('#newBtn');
  ok((await said()).slice(-1)[0] === 'What number goes in the empty circle?', 'Number bonds read aloud');
  const bonds = await page.evaluate(() => cards.every(c => c.q.kind === 'bond' && c.q.w === c.q.p + c.q.q2 && c.q.ans === c.q[c.q.hide] && c.el.querySelectorAll('.hole').length === 1 && c.el.querySelectorAll('svg text').length === 2 && c.q.w <= 10));
  ok(bonds, 'Number bonds: whole = parts, one empty circle, two numbers shown, up to 10');
  ok(await page.evaluate(() => cards.every(c => { writeNum(c, c.q.ans); return read(c) === String(c.q.ans); })), 'Number bonds: answer written in the empty circle is read (all 6)');
  ok(await page.evaluate(() => { const c = cards[0]; c.strokes = [...numStrokes(7, 4, -0.5, 0.9), ...numStrokes(c.q.ans, 0.36, -0.45, 0.9)]; return read(c) === String(c.q.ans); }), 'writing in the empty circle wins over writing elsewhere');
  ok(await page.evaluate(() => { const c = cards[0]; c.strokes = numStrokes(7, 4, -0.5, 0.9); return read(c) === '7'; }), 'writing only outside the circle is still read (so the card gets marked)');
  const bs = await page.evaluate(() => { cards[0].q = { kind: 'bond', w: 7, p: 3, q2: 4, hide: 'w', ans: 7 }; cards[1].q = { kind: 'bond', w: 7, p: 3, q2: 4, hide: 'q2', ans: 4 }; return [cardSay(cards[0].q), cardSay(cards[1].q)]; });
  ok(bs.join(' / ') === '3 and 4 make what? / 7 is 3 and what?', 'bond cards are read as "3 and 4 make what?" / "7 is 3 and what?"');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/10-bonds.png' });

  // Teen numbers: a full ten and some more
  await page.click('#backBtn');
  await page.click('#actTiles [data-act="teens"]');
  ok(await page.evaluate(() => cards.every(c => c.q.ans >= 11 && c.q.ans <= 19 && c.el.querySelectorAll('.frame svg').length === 2 && c.el.querySelectorAll('svg circle').length === c.q.ans)), 'Teen numbers: 11–19 as a full ten frame and some more');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/11-teens.png' });

  // Ada's Sums starts small, and is hers, not Mia's
  await page.click('#backBtn');
  await page.click('#actTiles [data-act="sums"]');
  ok(await page.evaluate(() => draft.pa.join('') === '01245' && draft.n === 6), "Ada's Sums setup remembers her own choices (0–5 without 3)");
  await page.click('#newBtn');
  ok(await page.evaluate(() => cards.length === 6 && cards.every(c => c.q.op === '+' && c.q.a <= 5 && c.q.a !== 3 && c.q.b <= 5)), 'and her sheet uses them');

  // labels for every kind of record
  ok(await page.evaluate(() => [labelFor('+-|1:0123456789|2|12'), labelFor('missing~+|2|1:05|6'), labelFor('howmany~10|6'), labelFor('make10~12')].join(' / '))
    === 'Sums · + − · 0–9 and 2-digit · 12 questions / Missing number · + · 2-digit and 0, 5 · 6 questions / How many? · up to 10 · 6 questions / Make 10 · 12 questions', 'record labels for each activity');

  // keypads: the 2 times table up to 5 (on Mia's Sums)
  await page.click('#backBtn'); await page.click('#backBtn');
  await page.click('#nameTiles [data-id]:not([data-id="guest"]):not([data-id="old1"])');
  await page.click('#actTiles [data-act="sums"]');
  for (const v of ['+', '-', '/']) await page.click(`#opsOpts button[data-v="${v}"]`);
  await page.click('.kp[data-line="a"] [data-k="2"]');
  await page.click('.kp[data-line="b"] [data-k="all"]');
  const centre = async sel => { const b = await (await page.$(sel)).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  const [x9, y9] = await centre('.kp[data-line="b"] [data-k="9"]'), [x6, y6] = await centre('.kp[data-line="b"] [data-k="6"]');
  await page.mouse.move(x9, y9); await page.mouse.down(); await page.mouse.move(x6, y6, { steps: 6 }); await page.mouse.up();
  await page.click('.kp[data-line="b"] [data-k="7"]');
  await page.click('.kp[data-line="b"] [data-k="8"]');
  const st = await page.evaluate(() => JSON.stringify([draft.a, draft.pa, draft.b, draft.pb, draft.ops]));
  ok(st === '[1,[2],1,[0,1,2,3,4,5],["*"]]', 'keypad: tap, All, drag, taps: ' + st);
  ok(await page.$$eval('#preview .mini', m => m.length) === 4, 'four examples shown');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/9-setup.png' });
  await page.click('#newBtn');
  ok(await page.evaluate(() => cards.every(c => c.q.op === '*' && c.q.a === 2 && c.q.b <= 5)), 'sheet is all 2 × 0–5');
  // back from setup without Start keeps the old settings
  await page.click('#setupBtn');
  await page.click('#opsOpts button[data-v="+"]');
  await page.click('#backBtn');
  ok(await visible('#sheet') && await page.evaluate(() => loadCfg('sums').ops.join() === '*'), 'Back from setup returns to the sheet and keeps the saved settings');
  await page.click('#setupBtn');
  await page.click('#opsOpts button[data-v="/"]');
  await page.click('.big[data-line="b"] [data-d="2"]');
  await page.click('.kp[data-line="b"] [data-k="0"]');
  ok(/other than 0/.test(await page.$eval('#warn', e => e.textContent)) && !(await page.$eval('#newBtn', e => e.disabled)), 'only 0 to divide by: warning, Start still on');
  await page.click('#opsOpts button[data-v="*"]');
  ok(await page.$eval('#newBtn', e => e.disabled), '÷ alone with only 0: Start is off');
  await page.click('#backBtn');

  // records page: tables, age change, remove (double-click proof)
  await page.click('#backBtn');
  await page.click('#meBtn');
  ok(/Sums · × · 2 and 0–5|Sums · \+ − × ÷/.test(await page.$eval('#records', e => e.textContent)), 'records page lists her sheets');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/4-me.png' });
  await page.$eval('#removeBtn', e => e.scrollIntoView({ block: 'center' }));
  const rmBox = await (await page.$('#removeBtn')).boundingBox();
  await page.mouse.click(rmBox.x + rmBox.width / 2, rmBox.y + rmBox.height / 2, { clickCount: 2 });
  await page.mouse.click(rmBox.x + rmBox.width / 2, rmBox.y + rmBox.height / 2);
  ok(await page.evaluate(() => players.length === 2), 'double/triple click on Remove does not remove');
  await page.click('#removeBtn');
  ok(await page.$eval('#confirmBox', e => e.hidden), 'Keep cancels');
  await page.click('#removeBtn');
  const cf = await (await page.$('#confirmRemoveBtn')).boundingBox();
  ok(Math.abs(cf.y - rmBox.y) > 150, 'confirm is far from Remove');
  await page.click('#confirmRemoveBtn');
  ok(await page.evaluate(() => players.length === 2), 'confirm ignores its first half second');
  const gone = await page.evaluate(() => current);
  await wait(600);
  await page.click('#confirmRemoveBtn');
  ok(await page.evaluate(id => players.length === 1 && localStorage.getItem('sums-rec-' + id) === null, gone) && await visible('#namesS'), 'removed with records, back to names');

  // phone and landscape layouts
  await page.setViewport({ width: 390, height: 844, hasTouch: true, isMobile: true }); // reloads
  await page.evaluate(HELPERS);
  await page.click('#nameTiles [data-id="old1"]');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/5-phone-home.png' });
  await page.click('#actTiles [data-act="howmany"]');
  await page.click('#newBtn');
  await page.evaluate(() => buildSheet({ max: 20, n: 20 }));
  ok(await cols() === 2, 'phone portrait: 2 columns');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/5-phone.png' });
  await page.setViewport({ width: 1180, height: 820, hasTouch: true });
  await page.click('#nameTiles [data-id="old1"]');
  await page.click('#actTiles [data-act="sums"]');
  await page.click('#newBtn');
  await page.evaluate(() => buildSheet({ ops: ['+', '-', '*', '/'], a: 3, b: 2, pa: ALL_DIGITS, pb: ALL_DIGITS, n: 20 }));
  ok(await cols() === 5, 'landscape: 5 columns for 20');
  const fit = await page.evaluate(() => cards.filter(c => { const w = c.work.getBoundingClientRect(), r = c.el.querySelector('.qv').getBoundingClientRect(); return r.right > w.right + 1 || r.left < w.left - 1 || r.bottom > w.bottom + 1; }).length);
  ok(fit === 0, `3-digit and 2-digit, 20 on screen: every question fits (${fit} overflow)`);
  await page.evaluate(() => { act = 'howmany'; buildSheet({ max: 20, n: 20 }); });
  const fit2 = await page.evaluate(() => cards.filter(c => { const w = c.work.getBoundingClientRect(), r = c.el.querySelector('.qv').getBoundingClientRect(); return r.right > w.right + 1 || r.bottom > w.bottom + 1 || c.h - c.ay < 1.3 * c.F; }).length);
  ok(fit2 === 0, `two ten frames, 20 on screen: fit with room to write (${fit2} bad)`);
  if (SHOTS) await page.screenshot({ path: SHOTS + '/2-landscape-frames.png' });

  await browser.close();
  console.log(fails ? `${fails} failed` : 'all passed');
  process.exit(fails ? 1 : 0);
})();
