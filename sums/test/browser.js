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
    if (c.q.kind === 'bond') { // in the empty circle, centred on the anchor
      const w = String(n).length * 0.8 * 0.9;
      c.strokes = [...extra, ...numStrokes(n, w / 2, -0.45, 0.9, mirror)];
    } else {
      const top = { div: -1.3, miss: -1.1, expr: -1.1 }[c.q.kind] ?? 0.3;
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
  ok((await tiles('#actTiles')).join() === 'Sums,Missing number,Arrays,Place value,Number lines', '8: the age-8 activities ' + (await tiles('#actTiles')).join());
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
  ok(await visible('#homeS') && (await tiles('#actTiles')).join() === 'Sums,How many?,Number bonds,Teen numbers,Make 10', 'age saved: straight to the 5 activities ' + (await tiles('#actTiles')).join());
  ok((await said()).slice(-1)[0] === 'What do you want to do today?', 'age 5 home is read aloud');
  await page.click('#backBtn');

  // Everyone asks the age every time
  await page.click('#nameTiles [data-id="guest"]');
  ok(await visible('#ageS'), 'Everyone asks the age');
  await page.click('#ageTiles [data-age="5"]');
  ok((await tiles('#actTiles')).length === 5, 'Everyone at 5: the 5 activities');
  await page.click('#backBtn');
  await page.click('#nameTiles [data-id="guest"]');
  ok(await visible('#ageS'), 'Everyone asks again next time');
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
  const fits = () => page.evaluate(() => cards.filter(c => {
    const w = c.work.getBoundingClientRect(), r = c.el.querySelector('.qv').getBoundingClientRect();
    const room = c.q.kind === 'expr' || c.q.kind === 'miss' ? c.ay > 2.5 * c.F : c.h - c.ay >= 1.3 * c.F;
    return r.left < w.left - 1 || r.right > w.right + 1 || r.top < w.top - 1 || !room;
  }).map(c => JSON.stringify(c.q)));
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
