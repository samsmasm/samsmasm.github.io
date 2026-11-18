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
    if (c.q.form === 'try' && !c.q.done) chancePick(c, true); // Chance, Try it: the 20 picks first
    if (c.q.kind === 'tap') { c.pick = c.q.any ? [[].concat(c.q.right)[0]] : [].concat(c.q.right); paintTap(c); return; } // tap cards: choose the right tile(s)
    if (c.q.kind === 'frac') { // "3/4": top number above the bar, bottom number below
      const [t, b] = String(n).split('/');
      c.strokes = [...extra, ...numStrokes(t, -0.3, -1.6, 0.9, mirror), ...numStrokes(b, -0.3, 0.35, 0.9, mirror)];
    } else if (c.q.kind === 'bond') { // in the empty circle, centred on the anchor
      const w = String(n).length * 0.8 * 0.9;
      c.strokes = [...extra, ...numStrokes(n, w / 2, -0.45, 0.9, mirror)];
    } else if (c.q.two) { // "3 : 15", "$2 and 50 c": first number left of the middle, second right of it
      let [a, b] = (Array.isArray(n) ? n : c.q.parts).map(String), s = 0.85;
      if (c.q.dp && !Array.isArray(n)) b = b.padStart(c.q.dp, '0'); // after the point digits keep their places: 4.09 is 4 and 09
      c.strokes = [...extra, ...numStrokes(a, -0.45, -1.05, s, mirror), ...numStrokes(b, 0.45 + b.length * 0.8 * s, -1.05, s, mirror)];
    } else {
      const top = { div: -1.3, miss: -1.1, expr: -1.1, seq: -1.1, story: -1.1, clock: -1.05, money: -1.05, graph: -1.05, shape: -1.05, ruler: -1.05, prot: -1.05, unit: -1.05 }[c.q.kind] ?? 0.3;
      c.strokes = [...extra, ...numStrokes(c.q.neg ? Math.abs(n) : n, 0, top, 1, mirror)]; // below 0: the minus is printed
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
  ok(await visible('#yearS'), 'new name asks what year');
  ok((await said()).includes('What year are you in?'), 'year question is read aloud');
  ok((await page.$$eval('#yearTiles [data-year]', t => t.map(x => x.dataset.year).join())) === '0,1,2,3,4,5,6,7,8', 'Years 0 to 8 to choose from');
  await page.click('#yearTiles [data-year="4"]');
  ok(await visible('#homeS'), 'Year 4 goes to the activities');
  const Y4 = 'Sums,Add and take away,Times and divide,Missing number,Arrays,Place value,Number lines,Area,Times bonds,Fractions,Fractions of a number,Clocks,Money,Number patterns,Doubles and halves,Story sums,Graphs,Shapes,Rulers,True or false,More or less,Balance,Rounding,Decimals,Change units,Angles,Map,Times grid';
  ok((await tiles('#actTiles')).join() === Y4, 'Year 4 page: the Year 4 activities ' + (await tiles('#actTiles')).join());
  ok(await page.$eval('#title', e => e.textContent) === 'Mia · Year 4', 'title shows name and year');
  ok(await page.evaluate(() => $('#yView').textContent === 'Year 4' && $('#yMine').textContent === 'your year' && !$('#yNext').disabled && !$('#yPrev').disabled && $('#yDots').children.length === 5), 'year switcher: Year 4, your year, Year 5 above (C1)');
  // ‹ goes down a year: Year 3 has no Year-4-only activities
  await page.click('#yPrev');
  const y3 = await tiles('#actTiles');
  ok(await page.evaluate(() => view === 3 && $('#yView').textContent === 'Year 3' && $('#yMine').textContent === ''), '‹ goes to the Year 3 page');
  ok(y3.length === 26 && ['Rounding', 'Splat', 'Number bonds', 'Fractions of a number','True or false', 'More or less', 'Balance'].every(t => y3.includes(t)) && y3.includes('Arrays') && y3.includes('Clocks'), 'Year 3 page: year activities at Year 3 plus the older tiles ' + y3.join());
  await page.click('#actTiles [data-act="clock"]');
  ok(await page.evaluate(() => draft.yr === 3 && $('.sughint').textContent === 'From the page for: Year 3'), 'Clocks from the Year 3 page opens at Year 3');
  await page.click('#backBtn');
  ok(await page.evaluate(() => { const s = store.get(cfgStoreKey('clock'), null); return view === 3 && (!s || s.yr !== 3); }), 'Back without Start does not save the page year, and home stays on Year 3');
  // a swipe right goes down again, left goes up
  const swipe = async (x0, x1) => { await page.touchscreen.touchStart(x0, 600); await page.touchscreen.touchMove((x0 + x1) / 2, 605); await page.touchscreen.touchMove(x1, 610); await page.touchscreen.touchEnd(); };
  await swipe(200, 500);
  ok(await page.evaluate(() => view === 2), 'swipe right: Year 2 page');
  const y2 = await tiles('#actTiles');
  ok(y2.length === 24 && y2.includes('Number bonds') && y2.includes('Rounding') && y2.includes('Splat') && y2.includes('Picture patterns') && y2.includes('Halves and quarters') && y2.includes('Turns') && y2.includes('Map') && !y2.includes('Arrays'), 'Year 2 page: younger tiles, Year 2 activities ' + y2.join());
  await swipe(500, 200); await swipe(500, 200); await swipe(500, 200); await swipe(500, 200);
  ok(await page.evaluate(() => view === 5 && $('#yNext').disabled), 'swipe left up to Year 5, and no further');
  await page.evaluate(() => turnPage(4 - view));
  await page.click('#backBtn');
  ok(await page.$$eval('#nameTiles .tile .sub', t => t.map(x => x.textContent).join()) === 'any year,Year 4', 'name tile shows her year');
  ok(await page.evaluate(() => { const p = players.find(x => x.name === 'Mia'); return p.year === 4 && p.yy === new Date().getFullYear() && !('age' in p); }), 'year saved with the calendar year it is for');

  // 1 January: everyone goes up a year; names saved with an age become a year
  ok(await page.evaluate(() => {
    const L = [{ year: 1, yy: 2026 }, { year: 4, yy: 2025 }, { year: 3, yy: 2027 }, { age: 5 }, { age: 8 }, { name: 'none' }];
    rollYears(L, new Date(2027, 0, 1, 0, 5));
    return L.map(p => `${p.year}/${p.yy}/${'age' in p}`).join();
  }) === '2/2027/false,6/2027/false,3/2027/false,1/2027/false,4/2027/false,undefined/undefined/false', '1 January: up one per new year, ages become years (5 → 1, 8 → 4)');
  ok(await page.evaluate(() => { const L = [{ year: 1, yy: 2026 }]; return !rollYears(L, new Date(2026, 11, 31, 23, 59)) && L[0].year === 1; }), '31 December: no change yet');

  // a name saved before years existed gets asked once, then remembered
  await page.evaluate(() => { players.push({ id: 'old1', name: 'Ada' }); store.set('sums-players', players); goNames(); });
  await page.click('#nameTiles [data-id="old1"]');
  ok(await visible('#yearS'), 'old name without a year is asked');
  await page.click('#yearTiles [data-year="1"]');
  await page.click('#backBtn');
  await page.click('#nameTiles [data-id="old1"]');
  ok(await visible('#homeS') && (await tiles('#actTiles')).join() === 'Sums,Add and take away,Times and divide,How many?,Number bonds,Teen numbers,Make 10,Splat,Clocks,Money,Number patterns,Picture patterns,Doubles and halves,Halves and quarters,Story sums,Graphs,Shapes,Rulers,True or false,More or less,Balance', 'year saved: straight to the Year 1 activities ' + (await tiles('#actTiles')).join());
  ok((await said()).slice(-1)[0] === 'What do you want to do today?', 'Year 1 home is read aloud');
  ok(await page.evaluate(() => $('#yPrev').disabled), 'no page below Year 1');
  await page.click('#yNext');
  ok((await said()).slice(-1)[0] === 'Year 2', 'Year 1 reader: the new page year is said');
  await page.click('#backBtn');

  // Everyone asks the year every time
  await page.click('#nameTiles [data-id="guest"]');
  ok(await visible('#yearS'), 'Everyone asks the year');
  await page.click('#yearTiles [data-year="1"]');
  ok((await tiles('#actTiles')).length === 21, 'Everyone in Year 1: the Year 1 activities');
  await page.click('#backBtn');
  await page.click('#nameTiles [data-id="guest"]');
  ok(await visible('#yearS'), 'Everyone asks again next time');
  // year → tiles, read aloud, starting year (capped at the highest page built)
  const sugg = await page.evaluate(() => [0, 1, 2, 3, 6, 8].map(y => {
    setYear(y); return `${y}:${view}:${group()}:${reads() ? 'r' : '-'}:${loadCfg('clock').yr}:${loadCfg('seq').yr}:${loadCfg('clock').n}`;
  }).join(' '));
  ok(sugg === '0:1:5:r:1:1:6 1:1:5:r:1:1:6 2:2:5:r:2:2:6 3:3:8:-:3:3:12 6:5:8:-:5:5:12 8:5:8:-:5:5:12', 'year → page, tiles, read aloud, starting year: ' + sugg);
  await page.click('#yearTiles [data-year="2"]');
  ok((await tiles('#actTiles')).length === 24 &&(await page.$eval('#title', e => e.textContent)) === 'Everyone · Year 2', 'Year 2: its own page');
  await page.click('#actTiles [data-act="graph"]');
  ok(await page.evaluate(() => draft.yr === 2 && $('.sughint').textContent === 'Your year: Year 2'), 'Year 2: Graphs starts at Year 2 and says so');
  await page.click('#backBtn'); await page.click('#backBtn');
  await page.click('#nameTiles [data-id="guest"]');
  await page.click('#yearTiles [data-year="6"]');
  ok(await page.evaluate(() => view === 5 && /highest so far/.test($('#yMine').textContent) && $('#yMine').textContent.includes('Year 6')), 'Year 6: the Year 5 page, marked the highest so far');
  const y5 = await tiles('#actTiles');
  ok(['Add and take away', 'Times and divide', 'Number patterns', 'Place value', 'Sums', 'Decimals', 'Money', 'Clocks', 'Change units', 'Angles', 'Map', 'Shapes', 'Graphs'].every(t => y5.includes(t)) && !y5.includes('Rulers'), 'Year 5 page: the activities with a Year 5 (and the older tiles without years), not the Year 4-only ones ' + y5.join(', '));
  // a new activity can start with one year only: any page opens it at the nearest year it has
  ok(await page.evaluate(() => [3, 4].map(v => { view = v; return loadCfg('dec').yr; }).join() === '4,4'), 'Decimals (Years 4 and 5 so far) opens at Year 4');
  await page.evaluate(() => { setYear(3); act = 'dec'; goSetup(); });
  ok(await page.evaluate(() => $('.sughint').textContent === 'Your year: Year 3 (Year 4 is the lowest here so far)' && draft.yr === 4 && $('#optBlock [data-key="yr"] [aria-pressed="true"]').dataset.v === '4'), 'Year 3 on a Year 4 only activity: Year 4 chosen, and the line says it is the lowest so far');
  // Years 1 to 5 since E1a (True or false, More or less, Balance); Rounding has 2 to 5
  ok(await page.evaluate(() => [1, 2, 3, 4].map(v => { view = v; return ['tf', 'cmp', 'bal', 'round'].map(x => loadCfg(x).yr).join(''); }).join() === '1112,2222,3333,4444'), 'True or false, More or less, Balance, Rounding: each page opens its own year (Year 1 Rounding at Year 2)');
  await page.evaluate(() => { setYear(3); act = 'tf'; goSetup(); });
  ok(await page.evaluate(() => $('.sughint').textContent === 'Your year: Year 3' && draft.yr === 3), 'Year 3: True or false at Year 3');
  // a tie still goes down: an activity with Years 2 and 4 only (Turns is Year 2 only, so use a made-up one)
  ok(await page.evaluate(() => { const o = ACTS.tf.options[0].values; ACTS.tf.options[0].values = o.filter(v => v[0] !== 3); view = 3; const y = loadCfg('tf').yr; ACTS.tf.options[0].values = o; return y === 2; }), 'between Years 2 and 4: a tie goes down');
  await page.evaluate(() => { setYear(2); act = 'tf'; goSetup(); });
  ok(await page.evaluate(() => $('.sughint').textContent === 'Your year: Year 2' && draft.yr === 2), 'Year 2: True or false at Year 2');
  await page.evaluate(() => { setYear(6); goHome(); });
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

  // ---- working area (Sam): bottom third in portrait, right third in landscape
  ok(await visible('#workBtn') && !(await visible('#workPanel')), 'sheet: a Working button, the working area closed');
  await page.click('#workBtn');
  await wait(150);
  const wa = await page.evaluate(() => {
    const p = $('#workPanel').getBoundingClientRect(), s = $('#sheet').getBoundingClientRect(), avail = innerHeight - 52;
    return { open: !$('#workPanel').hidden, pressed: $('#workBtn').getAttribute('aria-pressed'), ph: p.height / avail, sh: s.height / avail, bottom: Math.round(p.bottom - innerHeight), meets: Math.abs(s.bottom - p.top) < 3 };
  });
  ok(wa.open && wa.pressed === 'true' && Math.abs(wa.ph - 1 / 3) < 0.02 && Math.abs(wa.sh - 2 / 3) < 0.02 && wa.bottom === 0 && wa.meets, 'portrait: the working area is the bottom third, the sheet the top two thirds ' + JSON.stringify(wa));
  const wbox = await (await page.$('#wCanvas')).boundingBox();
  for (const k of [0, 1]) { // two strokes
    await page.mouse.move(wbox.x + 40 + k * 60, wbox.y + 30); await page.mouse.down();
    await page.mouse.move(wbox.x + 80 + k * 60, wbox.y + 90, { steps: 5 }); await page.mouse.up();
  }
  ok(await page.evaluate(() => W.strokes.length === 2 && cards.every(c => c.el.querySelector('.read').textContent === '' || c === cards[0])), 'writing in the working area is kept there, not on any card');
  await page.click('#wUndo');
  ok(await page.evaluate(() => W.strokes.length === 1), 'Undo takes away the last stroke');
  await page.click('#wClear');
  ok(await page.evaluate(() => W.strokes.length === 0), 'Clear empties it');
  ok(await page.evaluate(() => cards.every(c => { const w = c.work.getBoundingClientRect(), r = c.el.querySelector('.qv').getBoundingClientRect(); return w.height > 50 && r.left >= w.left - 1 && r.right <= w.right + 1 && r.top >= w.top - 1; })), 'cards still fit above the working area');
  await page.setViewport({ width: 1180, height: 820, hasTouch: true });
  await wait(300);
  const wl = await page.evaluate(() => { const p = $('#workPanel').getBoundingClientRect(), s = $('#sheet').getBoundingClientRect(); return { pw: p.width / innerWidth, sw: s.width / innerWidth, right: Math.round(innerWidth - p.right), top: p.top }; });
  ok(Math.abs(wl.pw - 1 / 3) < 0.02 && Math.abs(wl.sw - 2 / 3) < 0.02 && wl.right === 0 && wl.top >= 50, 'landscape: the working area is the right third ' + JSON.stringify(wl));
  await page.click('#wHide');
  ok(!(await visible('#workPanel')) && await page.evaluate(() => { const s = $('#sheet').getBoundingClientRect(); return Math.abs(s.width - innerWidth) < 2 && store.get('sums-working') === false; }), 'Hide collapses it and the sheet gets the whole screen back');
  await page.setViewport({ width: 820, height: 1180, hasTouch: true });
  await wait(300);

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
      : ['expr', 'miss', 'seq', 'bal', 'rnum'].includes(c.q.kind) ? c.ay > 2.5 * c.F
      : c.q.kind === 'story' ? c.ay > 2.5 * c.F && r.bottom <= w.bottom + 1
      : c.q.kind === 'tap' ? r.bottom <= w.bottom + 1 && [...c.el.querySelectorAll('.tt')].every(b => { const t = b.getBoundingClientRect(); const m = c.q.cells ? 29 : c.q.tcls === 'nline' ? 31 : 39; return t.width >= m && t.height >= m && t.bottom <= w.bottom + 1 && t.left >= w.left - 1 && t.right <= w.right + 1; }) // tiles big enough to tap
      : ['clock', 'money', 'graph', 'shape', 'ruler', 'prot', 'dec', 'unit'].includes(c.q.kind) ? r.bottom <= w.bottom + 1 // she writes above the line, inside the question
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
      for (const max of [99, 999, 9999]) {
        const b = ACTS.pv.make({ kinds: ['blocks'], max });
        if (b.k * 1000 + b.h * 100 + b.t * 10 + b.o !== b.ans || b.ans > max || b.ans < 10 || (max === 9999 ? b.k < 1 : b.k !== 0)) bad.push('blocks ' + JSON.stringify(b));
        const e = ACTS.pv.make({ kinds: ['expanded'], max }), parts = e.text.split(' + ').map(Number);
        if (parts.reduce((x, y) => x + y, 0) !== e.ans || e.ans > max || parts.some(p => p === 0 || !/^[1-9]0*$/.test(String(p)))) bad.push('expanded ' + JSON.stringify(e));
        const m = ACTS.pv.make({ kinds: ['more'], max }), [, amt, dir, v] = m.text.match(/^(\d+) (more|less) than (\d+)$/);
        if (m.ans !== (dir === 'more' ? +v + +amt : +v - +amt) || m.ans < 0 || m.ans > max || +amt >= max) bad.push('more ' + JSON.stringify(m));
      }
    }
    if (!range(0, 200).some(() => /^1000 /.test(ACTS.pv.make({ kinds: ['more'], max: 9999 }).text))) bad.push('no 1000 more or less at 9,999');
    return bad.slice(0, 4);
  });
  ok(pv.length === 0, 'Place value questions: blocks = the number, expanded parts add up (no 0 parts), more/less right and in range, to 99, 999 and 9,999 ' + pv.join(' '));
  await page.click('#optBlock [data-key="kinds"] [data-v="expanded"]');
  await page.click('#optBlock [data-key="kinds"] [data-v="more"]');
  await page.click('#newBtn');
  ok(await page.evaluate(() => cards.filter(c => c.q.kind === 'pv').every(c => c.el.querySelectorAll('rect').length === c.q.h + c.q.t + c.q.o)), 'blocks drawn: one shape per hundred, ten and one');
  ok((await fits()).length === 0, 'Place value fits with room to write ' + (await fits()).join(' '));
  const pvBad = await writeAllAndMark();
  ok(pvBad.length === 0, 'Place value: blocks and "= ___" answers read and marked right ' + pvBad.join(' | '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/13-pv.png' });
  // up to 9,999: thousands are big cubes
  await page.click('#setupBtn');
  ok(await page.$eval('#optBlock [data-key="max"] [data-v="9999"]', b => b.textContent) === '9,999', 'Place value setup offers "9,999"');
  await page.click('#optBlock [data-key="max"] [data-v="9999"]');
  await page.click('#newBtn');
  ok(await page.evaluate(() => cards.some(c => c.q.kind === 'pv') && cards.filter(c => c.q.kind === 'pv').every(c => c.q.k >= 1 && c.el.querySelectorAll('rect').length === c.q.k + c.q.h + c.q.t + c.q.o)), 'blocks to 9,999: one cube per thousand, then hundreds, tens and ones');
  ok((await fits()).length === 0, 'Place value to 9,999 fits with room to write ' + (await fits()).join(' '));
  const pvBad4 = await writeAllAndMark();
  ok(pvBad4.length === 0, 'Place value to 9,999: read and marked right ' + pvBad4.join(' | '));
  await page.evaluate(() => { buildSheet({ kinds: ['blocks'], max: 9999, n: 12 }); cards[0].q = { kind: 'pv', k: 9, h: 9, t: 9, o: 9, ans: 9999 }; layout(cards[0]); sizeCanvas(cards[0]); });
  ok((await fits()).length === 0, 'Place value: 9,999 in blocks (the biggest picture) fits ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/13-pv-9999.png' });
  ok(await page.evaluate(() => labelFor('pv~blocks|9999|12')) === 'Place value · blocks · up to 9999 · 12 questions', 'record label for Place value to 9,999');

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
  // counting in 25s, 50s and 1000s (Year 4), never past 10,000
  const nl = await page.evaluate(() => {
    const bad = [];
    for (const step of [1, 2, 5, 10, 25, 50, 100, 1000]) for (let i = 0; i < 100; i++) {
      const q = ACTS.nline.make({ steps: [step] });
      if (q.step !== step || q.start % (step * 10) || q.start + 10 * step > 10000 || q.ans !== q.start + q.k * step) bad.push(JSON.stringify(q));
    }
    return bad.slice(0, 4);
  });
  ok(nl.length === 0, 'Number lines: every step size starts on a multiple of ten steps and stays within 10,000 ' + nl.join(' '));
  await page.click('#setupBtn');
  for (const v of [25, 50, 1000, 2, 5, 10, 100]) await page.click(`#optBlock [data-key="steps"] [data-v="${v}"]`); // leaves 25s, 50s, 1000s
  ok(await page.evaluate(() => draft.steps.join() === '25,50,1000'), 'Number lines setup: 25s, 50s and 1000s can be chosen');
  await page.click('#newBtn');
  ok(await page.evaluate(() => cards.every(c => [25, 50, 1000].includes(c.q.step))) && (await fits()).length === 0, 'Number lines in 25s, 50s, 1000s fit with room to write ' + (await fits()).join(' '));
  ok(await page.evaluate(() => { const c = cards[0]; c.q = { kind: 'nline', start: 0, step: 1000, k: 4, ans: 4000 }; layout(c); sizeCanvas(c); const s = c.el.querySelector('svg').getBoundingClientRect(), t = [...c.el.querySelectorAll('svg text')].pop().getBoundingClientRect(); return t.right <= s.right + 0.5 && t.left >= s.left; }), 'Number lines: the "10000" label is not cut off');
  ok((await writeAllAndMark()).length === 0, 'Number lines in 25s, 50s, 1000s: read and marked right');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/14-nline-y4.png' });
  ok(await page.evaluate(() => labelFor('nline~25,50,1000|12')) === 'Number lines · in 25s, 50s, 1000s · 12 questions', 'record label for the new number lines');
  // ---- Mia: Area
  await page.click('#backBtn');
  await page.click('#actTiles [data-act="area"]');
  ok(await page.evaluate(() => draft.kinds.join() === 'area,perim,side,odd,cubes' && draft.max === 12), 'Area setup: area, perimeter, missing side, odd shapes, cubes, sides up to 12');
  // Odd shapes: whole squares joined up inside the grid, an even number of half
  // squares each in its own empty cell sharing a whole side with a square; Cubes: w × d × h
  const odd = await page.evaluate(() => {
    const bad = [];
    for (let i = 0; i < 400; i++) {
      const q = oddQ(), sq = new Set(q.sq.map(p => p.join())), cells = new Set();
      if (q.tris.length % 2 || q.tris.length < 2 || q.ans !== q.sq.length + q.tris.length / 2 || sq.size !== q.sq.length) bad.push('count ' + JSON.stringify(q));
      if (q.sq.some(([x, y]) => x < 1 || y < 1 || x > ODD_W - 2 || y > ODD_H - 2)) bad.push('outside ' + JSON.stringify(q));
      // joined up: every square reachable from the first
      const seen = new Set([q.sq[0].join()]), todo = [q.sq[0]];
      while (todo.length) { const [x, y] = todo.pop(); for (const [a, b] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) if (sq.has(`${a},${b}`) && !seen.has(`${a},${b}`)) { seen.add(`${a},${b}`); todo.push([a, b]); } }
      if (seen.size !== sq.size) bad.push('apart ' + JSON.stringify(q));
      for (const P of q.tris) {
        const cx = Math.min(...P.map(p => p[0])), cy = Math.min(...P.map(p => p[1])), k = `${cx},${cy}`;
        const area = Math.abs((P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[2][0] - P[0][0]) * (P[1][1] - P[0][1])) / 2;
        if (sq.has(k) || cells.has(k) || area !== 0.5 || cx < 0 || cy < 0 || cx >= ODD_W || cy >= ODD_H) bad.push('half ' + JSON.stringify(P));
        cells.add(k);
        // its whole side (two corners on one cell edge) is shared with a square
        const [a, b] = P; const nb = a[0] === b[0] ? (a[0] === cx ? [cx - 1, cy] : [cx + 1, cy]) : (a[1] === cy ? [cx, cy - 1] : [cx, cy + 1]);
        if (!sq.has(nb.join())) bad.push('loose half ' + JSON.stringify([P, q.sq]));
      }
    }
    for (let i = 0; i < 300; i++) { const q = cubesQ(); if (q.ans !== q.w * q.d * q.h || q.w > 4 || q.d > 3 || q.h > 3 || q.ans < 6) bad.push('cubes ' + JSON.stringify(q)); }
    return bad.slice(0, 3);
  });
  ok(odd.length === 0, 'Area odd shapes: joined squares + an even number of attached halves; cubes up to 4 × 3 × 3 ' + odd.join(' '));
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
    if (c.q.mode === 'odd' || c.q.mode === 'cubes') return true; // checked below
    if (c.q.mode === 'squares') return t.length === 0 && lines === c.q.w - 1 + c.q.h - 1;
    return t.length === 2 && t.includes(c.q.hide === 'w' ? '?' : String(c.q.w)) && t.includes(c.q.hide === 'h' ? '?' : String(c.q.h)) && c.el.querySelector('.cap').textContent === c.q.cap;
  })), 'Area cards: grid for counting, side lengths (or ?) and what to find');
  ok((await fits()).length === 0, 'Area fits with room to write ' + (await fits()).join(' '));
  ok((await writeAllAndMark()).length === 0, 'Area: answers read and marked right');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/15-area.png' });
  await page.evaluate(() => { buildSheet({ kinds: ['odd', 'cubes'], max: 12, n: 12 }); show('sheet'); });
  ok(await page.evaluate(() => cards.every(c => {
    const svg = c.el.querySelector('svg'), cap = c.el.querySelector('.cap').textContent;
    if (c.q.mode === 'odd') return cap === 'How many squares?' && svg.querySelectorAll('rect').length === c.q.sq.length && svg.querySelectorAll('polygon').length === c.q.tris.length && svg.querySelectorAll('line').length === ODD_W + ODD_H + 2;
    const { w, d, h } = c.q; return cap === 'How many cubes?' && svg.querySelectorAll('line').length === 2 * (w + 1) + 2 * (h + 1) + 2 * d;
  })), 'Odd shapes: a square for each whole, a triangle for each half, the full grid; Cubes: every cube edge on the three faces');
  ok((await fits()).length === 0, 'Odd shapes and Cubes fit with room to write ' + (await fits()).join(' '));
  ok((await writeAllAndMark()).length === 0, 'Odd shapes and Cubes: answers read and marked right');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/15-area-odd.png' });
  ok(await page.evaluate(() => labelFor('area~odd,cubes|12|6')) === 'Area · odd shapes, cubes · sides up to 12 · 6 questions', 'record label for Odd shapes and Cubes');

  // ---- Area, Year 5 (C3b): L-shape perimeter, Same area (tap), Cube layers
  const ar5 = await page.evaluate(() => {
    const bad = [], types = {}, per = ([w, h]) => 2 * (w + h);
    for (let i = 0; i < 500; i++) {
      const q = lshapeQ(), P = q.pts, n = P.length;
      types[q.type] = 1;
      const sides = P.map((p, k) => { const r = P[(k + 1) % n]; return [r[0] - p[0], r[1] - p[1]]; });
      // straight sides only, turning each corner, every side at least 2, inside its box, no side crossing another
      if (sides.some(([x, y]) => (x && y) || Math.abs(x + y) < 3) || q.ans !== sides.reduce((s, [x, y]) => s + Math.abs(x) + Math.abs(y), 0)) bad.push('sides ' + JSON.stringify(q));
      if (sides.some((s, k) => { const t = sides[(k + 1) % n]; return (s[0] === 0) === (t[0] === 0); })) bad.push('corner ' + JSON.stringify(P));
      if (P.some(([x, y]) => x < 0 || y < 0 || x > q.w || y > q.h) || ![0, q.w].every(v => P.some(p => p[0] === v)) || ![0, q.h].every(v => P.some(p => p[1] === v))) bad.push('box ' + JSON.stringify(q));
      const area = Math.abs(P.reduce((s, p, k) => { const r = P[(k + 1) % n]; return s + p[0] * r[1] - r[0] * p[1]; }, 0)) / 2;
      if (area >= q.w * q.h || area < q.w * q.h / 3) bad.push('area ' + JSON.stringify(q));
      if (!['L', 'step', 'T'].includes(q.type) || n !== (q.type === 'L' ? 6 : 8)) bad.push('type ' + q.type + n);
    }
    if (Object.keys(types).length !== 3) bad.push('types ' + Object.keys(types));
    for (let i = 0; i < 500; i++) {
      const q = sameQ(), A = q.shown[0] * q.shown[1], rs = q.rects;
      const good = rs.filter(r => r[0] * r[1] === A && per(r) !== per(q.shown));
      if (rs.length !== 3 || good.length !== 1 || rs[q.right] !== good[0] || q.ans !== good[0].join('x') || q.tiles[q.right].label !== q.ans) bad.push('same ' + JSON.stringify(q.shown) + JSON.stringify(rs));
      if (new Set(rs.map(r => [...r].sort().join())).size !== 3 || rs.some(r => Math.max(...r) > 8 || Math.min(...r) < 1)) bad.push('tiles ' + JSON.stringify(rs));
      if (q.tiles.some(t => t.say !== 'this one') || !q.top.includes('Same area')) bad.push('words ' + q.top);
    }
    for (let i = 0; i < 300; i++) { const q = layersQ(); if (q.ans !== q.w * q.d * q.h || q.h < 2 || q.w > 5 || q.d > 4 || q.h > 4 || !q.gap) bad.push('layers ' + JSON.stringify(q)); }
    return bad.slice(0, 4);
  });
  ok(ar5.length === 0, 'Area Year 5: L, step and T shapes with straight sides of 2 or more and the right perimeter; Same area has exactly one rectangle with the same area and a new perimeter; Cube layers count w × d × h ' + ar5.join(' | '));
  await page.evaluate(() => { buildSheet({ kinds: ['lperim', 'same', 'layers'], max: 12, n: 12 }); show('sheet'); });
  ok(await page.evaluate(() => cards.every(c => {
    const q = c.q;
    if (q.kind === 'tap') return q.form === 'same' && c.el.querySelectorAll('.tt').length === 3 && c.el.querySelectorAll('.tt svg').length === 3;
    const svg = c.el.querySelector('svg'), cap = c.el.querySelector('.cap').textContent;
    if (q.mode === 'lperim') { const t = [...svg.querySelectorAll('text')].map(x => +x.textContent); return cap === 'Perimeter?' && t.length === q.pts.length && t.reduce((a, b) => a + b, 0) === q.ans; }
    return q.mode === 'layers' && cap === 'How many cubes?' && svg.querySelectorAll(':scope > g').length === q.h;
  })), 'Area Year 5 cards: every side labelled (they add up to the answer), three rectangle tiles, a slab for each layer');
  await page.evaluate(() => { cards.forEach((c, i) => { c.q = [lshapeQ, sameQ, layersQ][i % 3](); layout(c); sizeCanvas(c); }); });
  ok((await fits()).length === 0, 'Area Year 5 fits with room to write ' + (await fits()).join(' '));
  const lab = await page.evaluate(() => {
    const bad = [];
    for (let i = 0; i < 60; i++) {
      const c = cards[0]; c.q = lshapeQ(); layout(c);
      const R = [...c.el.querySelectorAll('svg text')].map(t => t.getBoundingClientRect()), pg = c.el.querySelector('svg polygon').getBoundingClientRect();
      for (let a = 0; a < R.length; a++) for (let b = a + 1; b < R.length; b++) if (R[a].left < R[b].right - 1 && R[b].left < R[a].right - 1 && R[a].top < R[b].bottom - 1 && R[b].top < R[a].bottom - 1) bad.push(JSON.stringify(c.q.pts));
      if (!R.length || pg.width < 40) bad.push('small ' + pg.width);
    }
    return bad.slice(0, 2);
  });
  ok(lab.length === 0, 'L-shapes: no two side labels overlap ' + lab.join(' | '));
  ok((await writeAllAndMark()).length === 0, 'Area Year 5: answers read and tapped are marked right');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/15-area-y5.png' });
  ok(await page.evaluate(() => labelFor('area~lperim,same,layers|12|12')) === 'Area · L-shapes, same area, cube layers · sides up to 12 · 12 questions', 'record label for the Year 5 Area kinds');

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
  ok(await page.evaluate(() => draft.kinds.join() === 'shapes,line,past,add' && draft.parts.join() === '2,3,4,6,8'), 'Fractions setup: shapes, number line, past 1, add; 2 3 4 6 8 parts');
  // the picture matches the fraction, for every kind
  const fracPicOk = () => page.evaluate(() => cards.every(c => {
    const q = c.q, sh = c.el.querySelectorAll(`svg rect[fill="${SHADE}"], svg path[fill="${SHADE}"]`).length;
    if (q.form === 'add') {
      const t = q.op === '+' ? q.terms.reduce((x, y) => x + y) : q.terms[0] - q.terms[1];
      return t === q.n && q.n > 0 && q.n % q.d !== 0 && q.terms.every(x => x >= 1 && x < q.d) && c.el.querySelectorAll('.fsum .ft').length === q.terms.length && sh === q.terms.reduce((x, y) => x + y);
    }
    const W = q.wholes || 1;
    if (W === 2 ? q.n <= q.d || q.n >= 2 * q.d || q.cap !== 'Write it as one fraction' : q.n < 1 || q.n >= q.d) return false;
    if (q.shaded.length !== q.n || q.shaded.some(i => i < 0 || i >= W * q.d) || (W === 2 && !range(0, q.d - 1).every(i => q.shaded.includes(i)))) return false;
    if (q.shape === 'bar') return sh === q.n && c.el.querySelectorAll('svg rect').length === W * (q.d + 1);
    if (q.shape === 'circle') return sh === q.n && c.el.querySelectorAll('svg path').length === W * q.d;
    return c.el.querySelectorAll('svg line').length === W * q.d + 2 && c.el.querySelectorAll('svg text').length === W + 1;
  }));
  await page.click('#newBtn');
  ok(await fracPicOk(), 'Fractions: the right number of parts, n shaded (or n ticks along on the line)');
  ok((await fits()).length === 0, 'Fractions fit ' + (await fits()).join(' '));
  const fq = await page.evaluate(() => {
    const bad = [], seen = {};
    let three = 0, sub = 0, adds = 0, over = 0, pastLine = 0, pasts = 0;
    for (let i = 0; i < 1200; i++) {
      const q = fracQ({ kinds: ['shapes', 'line', 'past', 'add'], parts: [2, 3, 4, 5, 6, 8, 10, 12] });
      const k = q.form === 'add' ? 'add' : q.wholes ? 'past' : q.shape === 'line' ? 'line' : 'shapes';
      seen[k] = (seen[k] || 0) + 1;
      if (q.ans !== `${q.n}/${q.d}`) bad.push('ans ' + JSON.stringify(q));
      if (k === 'add') { adds++; three += q.terms.length === 3; sub += q.op === '−'; over += q.n > q.d; if (!/^\d+ over \d+( (plus|take away) \d+ over \d+)+$/.test(q.say)) bad.push('say ' + q.say); }
      if (k === 'past') { pasts++; pastLine += q.shape === 'line'; }
    }
    if (Object.keys(seen).length !== 4) bad.push('kinds ' + Object.keys(seen));
    if (three < adds * 0.15 || sub < adds * 0.15 || over < adds * 0.15) bad.push(`add: ${three} with three, ${sub} take away, ${over} past one, of ${adds}`);
    if (pastLine < pasts * 0.2 || pastLine > pasts * 0.5) bad.push(`past on a line ${pastLine} of ${pasts}`);
    return bad.slice(0, 4);
  });
  ok(fq.length === 0, 'Fractions Past 1 and Add: past 1 as shapes or a 0-to-2 line; sums of two or three, some take away, some past one whole, never a whole number ' + fq.join(' | '));
  for (const k of ['past', 'add']) {
    await page.evaluate(k => { hideDone(); buildSheet({ kinds: [k], parts: [2, 3, 4, 5, 6, 8, 10, 12], n: 12 }); }, k);
    ok(await fracPicOk() && (await fits()).length === 0, `Fractions (${k} only, all parts) fit and the pictures match ` + (await fits()).join(' '));
    if (SHOTS) await page.screenshot({ path: SHOTS + `/17-frac-${k}.png` });
    const wr = await writeAllAndMark();
    ok(wr.length === 0, `Fractions (${k} only): answers read and marked right ` + wr.join(' | '));
  }
  ok(await page.evaluate(() => { const c = cards[0]; c.q = { kind: 'frac', form: 'add', terms: [3, 3, 3], op: '+', n: 9, d: 8, ans: '9/8', say: '' }; layout(c); sizeCanvas(c); writeNum(c, '9/8'); const a = readAnswer(c).ok; writeNum(c, '18/16'); const b = readAnswer(c).ok; writeNum(c, '1/8'); return a && b && !readAnswer(c).ok; }), 'Fractions Add: 3/8 + 3/8 + 3/8 is right as 9/8 (or 18/16), not 1/8');
  await page.evaluate(() => { hideDone(); buildSheet(ACTS.frac.defaults()); });
  const fr = await page.evaluate(() => {
    const c = cards[0], q = c.q, out = {};
    writeNum(c, `${q.n}/${q.d}`); out.plain = readAnswer(c).ok && read(c) === `${q.n}/${q.d}`;
    writeNum(c, `${q.n * 2}/${q.d * 2}`); out.equal = readAnswer(c).ok;
    writeNum(c, `${q.n + 1}/${q.d}`); out.wrong = !readAnswer(c).ok;
    c.strokes = numStrokes(q.n, -0.3, -1.6, 0.9); out.half = read(c) === `${q.n}/?` && !readAnswer(c).ok;
    writeNum(c, `${q.n}/${q.d}`, numStrokes(1, 3, -4, 0.6)); out.picture = readAnswer(c).ok; // a mark on the picture is ignored
    // Sam: real writing was missed. A big top number reaching up into the picture
    c.strokes = [...numStrokes(q.n, -0.2, -3.6, 2.6), ...numStrokes(q.d, -0.3, 0.35, 0.9)]; out.big = readAnswer(c).ok; // middle 2.3 em up: the old reader threw it away
    // both numbers under the printed bar, with her own line between
    c.strokes = [...numStrokes(q.n, 0, 0.4, 0.9), [[-1.8, 1.55], [0.3, 1.55]], ...numStrokes(q.d, 0, 1.8, 0.9)]; out.ownLine = readAnswer(c).ok;
    // both under the bar, stacked with a gap and no line
    c.strokes = [...numStrokes(q.n, 0, 0.4, 0.9), ...numStrokes(q.d, 0, 1.8, 0.9)]; out.stacked = readAnswer(c).ok;
    // written across under the bar: "3/4" with a slash
    c.strokes = [...numStrokes(q.n, -1.2, 0.5, 0.9), [[-1.05, 1.5], [-0.35, 0.3]], ...numStrokes(q.d, -0.15 + String(q.d).length * 0.72, 0.5, 0.9)]; out.slash = readAnswer(c).ok;
    return out;
  });
  ok(fr.big, 'Fractions: a big top number reaching up into the picture is read');
  ok(fr.ownLine && fr.stacked, 'Fractions: both numbers under the bar, with her own line or just stacked, are read');
  ok(fr.slash, 'Fractions: "3/4" written across with a slash is read');
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
  ok(await page.evaluate(() => draft.yr === 4 && draft.kinds.join() === 'face,words,long'), 'Clocks setup at age 8: Year 4 suggested, clock, words and How long? (Year 5 only)');
  ok(await page.evaluate(() => $('#optBlock [data-key="yr"] .sug').dataset.v === '4' && /^Your year: Year 4$/.test($('.sughint').textContent)), 'the suggested year has a dot and a line saying so');
  ok(await page.evaluate(() => [...document.querySelectorAll('#optBlock .yrb')].map(b => `${b.querySelector('.yn').textContent}|${b.querySelector('.yx').textContent}`).join(' / '))
    === "Year 1|o'clock / Year 2|quarter past, half past / Year 3|5 minutes / Year 4|any minute / Year 5|24-hour, how long", 'Year buttons: "Year 1" on its own, the example under it (Sam: the 1 looked like part of the example)');
  ok(await page.evaluate(() => Object.keys(ACTS).filter(a => maxYear(a) && ACTS[a].ages.includes(8)).every(a => maxYear(a) >= 4)), 'every activity with years on the older tiles goes up to Year 4 at least');
  ok(await page.evaluate(() => Object.keys(ACTS).filter(a => yearsOf(a).includes(5)).sort().join() === 'addsub,angle,bal,chance,clock,cmp,dec,fof,graph,map,money,muldiv,round,seq,shape,tf,units'), 'Year 5 so far (C1 to C4): Add and take away, Times and divide, Number patterns, True or false, More or less, Balance, Rounding, Decimals, Fractions of a number, Money, Clocks, Change units, Angles, Map, Shapes, Graphs, Chance');
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
    // Sam: real writing was missed. Her own colon, everything on the left line
    const dots = x => [[[x, -0.8], [x + 0.02, -0.78]], [[x, -0.3], [x + 0.02, -0.28]]];
    c.strokes = [...numStrokes('3', -2.5, -1.05, 0.85), ...dots(-2.25), ...numStrokes('05', -0.6, -1.05, 0.85)]; out.colon = readAnswer(c).ok && read(c) === '3:05';
    // no colon, written in one run on the right: "305"
    c.strokes = numStrokes('305', 2.4, -1.05, 0.85); out.run = readAnswer(c).ok;
    return out;
  });
  ok(cr.colon && cr.run, 'Clocks: her own colon, or the time written in one run on one side, is read');
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
  // ---- finished (Sam): a kapow and an obvious next step
  await wait(900);
  const dn = await page.evaluate(() => ({ shown: !$('#doneS').hidden, title: $('#dTitle').textContent, stats: $('#dStats').textContent, again: $('#dAgain').textContent, up: $('#dUp').hidden ? '' : $('#dUp').textContent, home: $('#dHome').textContent, head: !$('#markBtn').hidden }));
  ok(dn.shown && /^(Perfect!|All done!)$/.test(dn.title) && /\d:\d\d/.test(dn.stats) && /First try \d+ of 12/.test(dn.stats), 'a finished sheet shows the finish panel: Perfect! or All done!, the time, first try ' + JSON.stringify(dn));
  ok(dn.again === 'Another sheet' && dn.up === 'Harder: Year 2' && dn.home === 'Choose something else', 'next steps: Another sheet, Harder: Year 2, Choose something else');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/32-done.png' });
  await page.click('#dLook');
  ok(!(await visible('#doneS')) && await visible('#sheet') && await page.evaluate(() => sheetDone), 'Look at my sheet closes it and shows the marked sheet');
  await page.click('#markBtn'); // New sheet
  await page.evaluate(() => cards.forEach(c => writeNum(c, c.q.ans)));
  await page.click('#markBtn'); await wait(900);
  await page.click('#dAgain');
  ok(!(await visible('#doneS')) && await page.evaluate(() => !sheetDone && cards.every(c => c.strokes.length === 0) && cfg.yr === 1), 'Another sheet: a fresh sheet, same year');
  await page.evaluate(() => cards.forEach(c => writeNum(c, c.q.ans)));
  await page.click('#markBtn'); await wait(900);
  await page.click('#dUp');
  ok(await page.evaluate(() => !sheetDone && cfg.yr === 2 && loadCfg('clock').yr === 2 && cards.every(c => c.q.two)), 'Harder: the next year up, saved as her choice');
  await page.evaluate(() => cards.forEach(c => writeNum(c, c.q.ans)));
  await page.click('#markBtn'); await wait(900);
  await page.click('#dHome');
  ok(await visible('#homeS') && !(await visible('#doneS')), 'Choose something else goes to the activity tiles');
  await page.click('#actTiles [data-act="clock"]');
  await page.click('#optBlock [data-key="yr"] [data-v="1"]');
  await page.click('#newBtn');
  ok(await page.evaluate(() => {
    const c = cards[0], h = String(c.q.h);
    c.strokes = [...numStrokes(h, -1.4, -1.05, 0.85), [[-1.2, -0.8], [-1.18, -0.78]], [[-1.2, -0.3], [-1.18, -0.28]], ...numStrokes('00', 0.4, -1.05, 0.85)];
    return readAnswer(c).ok;
  }), 'Clocks Year 1: "3:00" written for 3 o\'clock counts');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/21-clocks-y1.png' });

  // ---- Mia: Money (Years 1–3)
  await page.click('#backBtn');
  await page.click('#actTiles [data-act="money"]');
  ok(await page.evaluate(() => draft.yr === 4 && draft.kinds.join() === 'count,change,make' && $('.sughint').textContent === 'Your year: Year 4'), 'Money setup at age 8: Year 4, all three kinds');
  const mo = await page.evaluate(() => {
    const bad = [], seen4 = new Set();
    for (const yr of [1, 2, 3, 4]) for (let i = 0; i < 400; i++) {
      const q = ACTS.money.make({ yr, kinds: ['count', 'change'] });
      const total = q.total ? q.price : q.change ? q.pay - q.price : sumOf(q.items);
      const want = q.unit === '$c' ? [Math.floor(total / 100), total % 100] : q.unit === '$' ? total / 100 : total;
      if (q.unit === '$c' ? !(q.two && q.parts[0] === want[0] && q.parts[1] === want[1]) : q.ans !== want) bad.push('answer ' + JSON.stringify(q));
      if (q.unit === '$' && total % 100) bad.push('whole dollars ' + JSON.stringify(q));
      if (q.change) {
        if (!q.total && (q.price <= 0 || q.price >= q.pay || !isNote(q.pay))) bad.push('change ' + JSON.stringify(q));
        if ((yr === 3) === (q.unit === '$')) bad.push('change unit ' + JSON.stringify(q));
        if (yr !== 4 && (q.tags || q.qty || q.total)) bad.push('shopping below Year 4 ' + JSON.stringify(q));
        if (yr === 4) { // whole dollars: several of one thing, or two or three different things (the total, or the change)
          seen4.add(q.qty ? 'qty' : q.total ? 'total' : 'tags');
          const sum = q.qty ? q.qty * q.each : q.tags && q.tags.reduce((a, b) => a + b, 0);
          if (!sum || q.price !== sum * 100 || (q.qty && q.qty < 2) || (q.tags && (q.tags.length < 2 || q.tags.length > 3 || new Set(q.tags).size !== q.tags.length || q.tags.some(d => !Number.isInteger(d) || d < 1)))) bad.push('y4 shopping ' + JSON.stringify(q));
          if (q.total ? q.pay !== undefined : [1000, 2000, 5000, 10000].find(n => n > q.price) !== q.pay) bad.push('y4 pays ' + JSON.stringify(q));
        }
      } else {
        if (yr === 4 && (q.unit !== '$c' || total % 100 === 0)) bad.push('y4 ' + JSON.stringify(q));
        const cents = q.items.filter(v => v < 100), dollars = q.items.filter(v => v >= 100);
        if (yr === 1 && (cents.length || total > 1000)) bad.push('y1 ' + JSON.stringify(q));
        if (yr === 2 && ((cents.length && dollars.length) || (cents.length && total > 100) || total > 10000 || (q.items.some(v => v >= 500) && q.items.some(v => v < 500)))) bad.push('y2 ' + JSON.stringify(q));
        if (yr === 3 && (!cents.length || !dollars.length || sumOf(cents) >= 100 || q.unit !== '$c')) bad.push('y3 ' + JSON.stringify(q));
      }
    }
    if (seen4.size !== 3) bad.push('Year 4 shopping kinds seen: ' + [...seen4].join());
    return bad.slice(0, 4);
  });
  ok(mo.length === 0, 'Money: totals and change right; Year 1 whole dollars to $10, Year 2 coins or notes, Year 3 dollars and cents, Year 4 bigger amounts, buying several of one thing or two or three different things at whole dollars ' + mo.join(' | '));
  await page.click('#newBtn');
  const moneyCards = () => page.evaluate(() => cards.every(c => {
    const q = c.q, svg = c.el.querySelector('.qv svg');
    if (q.form === 'make') return c.el.querySelectorAll('.tt').length === 10 && c.el.querySelector('.tray'); // tested with Make it below
    if (q.tags) return c.el.querySelector('.cap').textContent === (q.total ? 'How much altogether?' : 'Buy them all. Change?') && svg.querySelectorAll('text').length === q.tags.length + (q.total ? 0 : 2) && q.tags.every(d => [...svg.querySelectorAll('text')].some(t => t.textContent === '$' + d));
    if (q.change) return c.el.querySelector('.cap').textContent === (q.qty ? `Buy ${q.qty}. Change?` : 'Change?') && svg.querySelectorAll('text').length >= 4;
    return svg.querySelectorAll('circle').length + svg.querySelectorAll('rect').length / 2 === q.items.length;
  }));
  ok(await moneyCards(), 'Money cards: one coin or note drawn per item; change shows the price and the note');
  // Year 4 shopping with different things: a tag for each, and the note when she pays
  await page.evaluate(() => {
    buildSheet({ yr: 4, kinds: ['change'], n: 12 });
    const set = (i, q) => { cards[i].q = moneyQ({ ...q, change: true, unit: '$' }, q.total ? q.price : q.pay - q.price); layout(cards[i]); sizeCanvas(cards[i]); };
    set(0, { tags: [3, 7, 12], price: 2200, pay: 5000 }); set(1, { tags: [15, 14, 13], price: 4200, total: true }); set(2, { tags: [2, 9], price: 1100, pay: 2000 });
  });
  ok(await moneyCards() && await page.evaluate(() => cards[0].q.ans === 28 && cards[1].q.ans === 42 && cards[2].q.ans === 9), 'Money Year 4: $3, $7 and $12 paid with $50 is $28 change; three things altogether; a price tag for each');
  ok((await fits()).length === 0, 'Money Year 4 shopping fits ' + (await fits()).join(' '));
  ok((await writeAllAndMark()).length === 0, 'Money Year 4 shopping: read and marked right');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/22-money-y4-shopping.png' });
  ok(await page.evaluate(() => [cardSay({ kind: 'money', change: true, tags: [3, 7, 12], price: 2200, pay: 5000 }), cardSay({ kind: 'money', change: true, tags: [3, 7], price: 1000, total: true })].join(' / '))
    === 'You buy things that cost 3 dollars, 7 dollars, 12 dollars. You pay 50 dollars. How much change? / You buy things that cost 3 dollars, 7 dollars. How much altogether?', 'Money Year 4: different things are read aloud');
  await page.evaluate(() => buildSheet({ yr: 4, kinds: ['count', 'change'], n: 12 }));
  ok((await fits()).length === 0, 'Money fits ' + (await fits()).join(' '));
  ok((await writeAllAndMark()).length === 0, 'Money: whole sheet read and marked right');
  const ms = await page.evaluate(() => {
    const c = cards[0], out = {};
    const dollar = x => [[[x, -1.55], [x, 0.25]], [[x + 0.2, -1.25], [x - 0.2, -1.05], [x + 0.2, -0.65], [x - 0.2, -0.35]]]; // tall line and an S
    const cee = x => [[[x + 0.25, -0.6], [x, -0.55], [x - 0.05, -0.3], [x + 0.25, -0.25]]]; // a small c
    c.q = { kind: 'money', items: [200, 50], unit: '$c', two: true, parts: [2, 50], ans: '$2 and 50c' }; layout(c); sizeCanvas(c);
    c.strokes = [...dollar(-1.9), ...numStrokes('2', -0.5, -1.05, 0.85), ...numStrokes('50', 1.9, -1.05, 0.85), ...cee(2.2)]; out.signs = readAnswer(c).ok;
    c.strokes = [...numStrokes('2', -2.6, -1.05, 0.85), [[-2.4, -0.1], [-2.38, -0.08]], ...numStrokes('50', -0.6, -1.05, 0.85)]; out.point = readAnswer(c).ok; // "2.50"
    c.q = { kind: 'money', items: [500, 200], unit: '$', ans: 7 }; layout(c); sizeCanvas(c);
    c.strokes = [...dollar(-1.6), ...numStrokes('7', 0, -1.05, 0.85)]; out.single = readAnswer(c).ok;
    c.q = { kind: 'money', items: [20, 20, 20], unit: 'c', ans: 60 }; layout(c); sizeCanvas(c);
    c.strokes = [...numStrokes('60', -0.3, -1.05, 0.85), ...cee(0)]; out.cents = readAnswer(c).ok;
    return out;
  });
  ok(ms.signs && ms.single && ms.cents, 'Money: a "$" or "c" she writes in is not read as a digit ' + JSON.stringify(ms));
  ok(ms.point, 'Money: "2.50" written with a point on one side is read as $2 and 50c');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/22-money.png' });
  for (const yr of [3, 2, 1]) {
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
  ok(await page.evaluate(() => cardSay({ kind: 'money', change: true, qty: 3, each: 4, price: 1200, pay: 2000 })) === 'You buy 3, at 4 dollars each. You pay 20 dollars. How much change?', 'Money Year 4: buying several is read aloud');

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
    const lim = { 1: [20, 20], 2: [120, 120], 3: [999, 999], 4: [9999, 9999] };
    const y2 = new Set(), y3h = new Set(); let y3n = 0;
    for (const yr of [1, 2, 3, 4]) for (const op of ['+', '-', '*', '/']) for (let i = 0; i < 300; i++) {
      const q = (op === '+' || op === '-' ? addSubQ : mulDivQ)(op, yr);
      if (yr === 2 && op === '+' && q.text.split(' + ').length === 3) { // D1a: three one-digit numbers, across, read aloud
        const n = q.text.split(' + ').map(Number);
        if (q.ans !== n[0] + n[1] + n[2] || n.some(x => x < 1 || x > 9) || q.say !== n.join(' plus ') || q.kind !== 'expr') bad.push('three ' + JSON.stringify(q));
        y2.add('three'); continue;
      }
      if (yr === 2 && op !== '*' && op !== '/') {
        const [a, b] = nums(q);
        if (a % 10 === 0 && b % 10 === 0 && a < 100 && b < 100) y2.add('tens ' + op);
        if ((a === 100 || b === 100) && Math.max(a, b, q.ans) > 100) y2.add('hund ' + op);
        if (Math.max(a, b, q.ans) > 100 && !(a >= 100 || b >= 100)) bad.push('over 100 without a hundred ' + q.text);
      }
      if (yr === 1 && (op === '*' || op === '/')) { // pictures, no signs: bags of dots, or dots shared into empty bags
        const dots = new DOMParser().parseFromString(groupsSvg(q), 'image/svg+xml').querySelectorAll('circle').length;
        if (q.kind !== 'mgrp' || q.form !== (op === '*' ? 'groups' : 'share') || q.ans !== (op === '*' ? q.g * q.k : q.k) || q.g * q.k > 20 || q.g < 2 || q.k < 2 || dots !== q.g * q.k || /[×÷]/.test(q.cap + q.say)) bad.push(`1 picture ${JSON.stringify(q)}`);
        continue;
      }
      const [a, b] = nums(q);
      const want = { '+': a + b, '-': a - b, '*': a * b, '/': a / b }[op];
      if (q.ans !== want || !Number.isInteger(q.ans) || q.ans < 0) bad.push(`${yr} wrong ${JSON.stringify(q)}`);
      if (yr === 3 && q.hund) { // E1b: hundreds facts across, 700 + 200, 900 − 300, within 1,000, never 0
        y3h.add(op); y3n++;
        if (q.kind !== 'expr' || a % 100 || b % 100 || !a || !b || q.ans <= 0 || q.ans > 1000 || q.say !== `${a} ${op === '+' ? 'plus' : 'take away'} ${b}`) bad.push('3 hundreds ' + JSON.stringify(q));
        continue;
      }
      if (q.kind !== (yr <= 2 || op === '/' ? 'expr' : 'col')) bad.push(`${yr} layout ${JSON.stringify(q)}`); // division is never the long-division bracket (a Year 5 method)
      if ((op === '+' || op === '-') && (Math.max(a, b, q.ans) > lim[yr][0] || (yr === 3 && a < 100) || (yr === 4 && a < 1000))) bad.push(`${yr} size ${JSON.stringify(q)}`);
      if (op === '*' && yr <= 2 && ![2, 5, 10].includes(a) && ![2, 5, 10].includes(b)) bad.push(`${yr} times ${JSON.stringify(q)}`);
      if (op === '/' && (b < 2 || b > 10 || (yr <= 2 && ![2, 5, 10].includes(b)))) bad.push(`${yr} divide ${JSON.stringify(q)}`);
    }
    if (y2.size !== 5) bad.push('Year 2 kinds ' + [...y2]);
    if (y3h.size !== 2 || y3n < 130 || y3n > 270) bad.push('Year 3 hundreds facts ' + [...y3h] + ' ' + y3n + ' of 600');
    return bad.slice(0, 4);
  });
  // Year 5 (C1): six digits stacked or hundredths across; tables to 12, 4 digits × 1, 2 digits × 2; ÷ with a remainder in the bracket
  const y5q = await page.evaluate(() => {
    const bad = [], kinds = new Set();
    for (const op of ['+', '-', '*', '/']) for (let i = 0; i < 400; i++) {
      const q = (op === '+' || op === '-' ? addSubQ : mulDivQ)(op, 5);
      if (q.kind === 'dec') { // 1.31 + 0.22: two blanks round the point, two places
        kinds.add('dec');
        const [x, , y] = q.text.split(' '), a = Math.round(+x * 100), b = Math.round(+y * 100), s = op === '+' ? a + b : a - b;
        if (q.dp !== 2 || !q.two || s <= 0 || s % 100 === 0 || q.parts[0] !== Math.floor(s / 100) || q.parts[1] !== s % 100 || !/^\d\.\d\d$/.test(x) || !/^\d\.\d\d$/.test(y) || +x.slice(-1) === 0 || +y.slice(-1) === 0) bad.push('dec ' + JSON.stringify(q));
        continue;
      }
      if (q.kind === 'div') { // remainders: a = b × k + r, r < b, in the bracket
        kinds.add(q.parts[1] ? 'rem' : 'exact');
        const [k, r] = q.parts;
        if (!q.rem || !q.two || q.a !== q.b * k + r || r < 0 || r >= q.b || q.b < 2 || q.b > 12 || q.a > 9999) bad.push('div ' + JSON.stringify(q));
        continue;
      }
      kinds.add(q.kind + op + String(q.b).length);
      const want = { '+': q.a + q.b, '-': q.a - q.b, '*': q.a * q.b }[op];
      if (q.kind !== 'col' || q.ans !== want || q.ans < 0) bad.push('col ' + JSON.stringify(q));
      if ((op === '+' || op === '-') && (q.a < 10000 || Math.max(q.a, q.b, q.ans) > 999999)) bad.push('size ' + JSON.stringify(q));
      if (op === '*' && !(q.a <= 12 && q.b <= 12) && !(q.a >= 1000 && q.b <= 9) && !(q.a >= 12 && q.a <= 99 && q.b >= 11 && q.b <= 99)) bad.push('times ' + JSON.stringify(q));
    }
    if (!['dec', 'rem', 'exact', 'col*2'].every(k => kinds.has(k))) bad.push('missing kinds ' + [...kinds].join());
    return bad.slice(0, 4);
  });
  ok(await page.evaluate(() => {
    const qs = range(0, 300).map(() => ACTS.pv.make({ kinds: ['blocks', 'expanded', 'more'], max: 999999, n: 12 }));
    const okQ = qs.every(q => q.kind === 'expr' && q.ans >= 0 && q.ans <= 999999 && (/more|less/.test(q.text) ? /^(1000|10000|100000) /.test(q.text) : sumOf(q.text.split(' + ').map(Number)) === q.ans && q.ans >= 100000));
    return okQ && !!ACTS.pv.blocked({ kinds: ['blocks'], max: 999999 }) && !ACTS.pv.blocked({ kinds: ['blocks'], max: 9999 }) && !ACTS.pv.blocked({ kinds: ['blocks', 'more'], max: 999999 });
  }), 'Place value up to 999,999: expanded form and 1,000 / 10,000 / 100,000 more or less, no blocks (Blocks alone is blocked)');
  ok(y5q.length === 0, 'Year 5 sums: six digits stacked, hundredths across (two blanks), tables to 12, 4 digits × 1 and 2 digits × 2 stacked, remainders in the bracket (some exact) ' + y5q.join(' | '));
  ok(ys.length === 0, 'Sums by year: answers right; Year 1 within 20 (times and divide as bags of dots, no signs), 2 within 100, 3 three digits, 4 four digits; 2s 5s 10s first; across in Years 1–2, stacked after, division always across ' + ys.join(' | '));
  ok(await page.evaluate(() => { act = 'sums'; return range(0, 30).every(() => ACTS.sums.make({ ops: ['/'], a: 2, b: 1, pa: ALL_DIGITS, pb: ALL_DIGITS, n: 12 }).kind === 'div'); }), 'the original Sums keeps its long-division bracket');
  await page.click('#backBtn');
  await page.click('#actTiles [data-act="addsub"]');
  ok(await page.evaluate(() => draft.yr === 4 && draft.ops.join() === '+,-' && $('#kpBlock').hidden), 'Add and take away setup at age 8: Year 4, + and −, no keypads');
  for (const yr of [3, 1, 2, 4]) await yearSheet('addsub', yr, 'Add and take away');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/24-addsub-y4.png' });
  await yearSheet('addsub', 5, 'Add and take away');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/24-addsub-y5.png' });
  for (const yr of [3, 1, 2, 4]) await yearSheet('muldiv', yr, 'Times and divide');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/25-muldiv-y4.png' });
  await yearSheet('muldiv', 5, 'Times and divide');
  // remainders: "__ r __" on the bar; 0 may be left empty; working under the bar is not read
  await page.evaluate(() => { hideDone(); buildSheet({ yr: 5, ops: ['/'], n: 12 }); });
  if (SHOTS) await page.screenshot({ path: SHOTS + '/25-muldiv-y5-rem.png' });
  const rm = await page.evaluate(() => {
    const c = cards[0], out = [];
    c.q = { ...c.q, a: 278, b: 4, parts: [69, 2], ans: '69 r 2' }; layout(c); sizeCanvas(c);
    const s = 0.85;
    c.strokes = [...numStrokes('69', -0.45, -1.05, s), ...numStrokes('2', 0.45 + 0.8 * s, -1.05, s)]; out.push(readAnswer(c));
    c.strokes.push(...numStrokes('24', -0.5, 1.6), ...numStrokes('38', -0.5, 2.8)); out.push(readAnswer(c)); // working under the bar
    c.q = { ...c.q, a: 276, parts: [69, 0], ans: '69 r 0' }; layout(c); sizeCanvas(c);
    c.strokes = numStrokes('69', -0.45, -1.05, s); out.push(readAnswer(c)); // 0 left out
    c.strokes = numStrokes('69', -0.45, -1.05, s); c.q = { ...c.q, a: 277, parts: [69, 1] }; out.push(readAnswer(c)); // 1 left out: wrong
    return out.map(r => `${r.text}:${r.ok}`).join(' ');
  });
  ok(rm === '69 r 2:true 69 r 2:true 69:true 69:false', 'remainders: "69 r 2" read; working under the bar ignored; a 0 remainder may be left empty, any other may not: ' + rm);
  await page.evaluate(() => { hideDone(); buildSheet({ yr: 1, ops: ['*', '/'], n: 12 }); });
  ok(await page.evaluate(() => cards.every(c => c.q.kind === 'mgrp' && c.el.querySelectorAll('.qv circle').length === c.q.g * c.q.k && c.el.querySelectorAll('.qv rect').length === c.q.g && cardSay(c.q) === c.q.say)
    && new Set(cards.map(c => c.q.form)).size === 2), 'Times and divide Year 1: bags of dots and sharing into empty bags, one bag per group, read aloud');
  ok((await fits()).length === 0, 'Times and divide Year 1 pictures fit ' + (await fits()).join(' '));
  ok((await writeAllAndMark()).length === 0, 'Times and divide Year 1: answers written under the bags are read and marked right');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/25-muldiv-y1.png' });
  ok(await page.evaluate(() => { const q = addSubQ('+', 1); return cardSay(q) === q.text.replace('+', 'plus'); }), 'Year 1 sums are read aloud ("3 plus 4")');

  // ---- Number patterns
  const sq = await page.evaluate(() => {
    const bad = [], max = { 1: 100, 2: 120, 3: 1000, 4: 10000 };
    for (const yr of [1, 2, 3, 4]) for (let i = 0; i < 400; i++) {
      const q = seqQ(yr), t = q.terms, d = t[1] - t[0];
      const rule = q.mult ? t.every((v, j) => !j || v === t[j - 1] * q.mult) && yr === 4 : t.every((v, j) => !j || v - t[j - 1] === d) && d !== 0;
      if (t.length !== 5 || !rule || Math.min(...t) < 0 || Math.max(...t) > max[yr] || q.ans !== t[q.hide]) bad.push(`${yr} ${JSON.stringify(q)}`);
      if (yr === 1 && ![1, 2, 10].includes(Math.abs(d))) bad.push('y1 step ' + JSON.stringify(q));
    }
    return bad.slice(0, 4);
  });
  ok(sq.length === 0, 'Number patterns: five terms, same step (or ×2, ×3 in Year 4), never below 0 or past the year\'s top, Year 1 in 1s, 2s, 10s ' + sq.join(' | '));
  // Year 5: 11s, 12s, 1000s to 100,000s, decimal steps (two blanks), back through 0 (minus printed)
  const s5 = await page.evaluate(() => {
    const bad = [], kinds = new Set();
    for (let i = 0; i < 600; i++) {
      const q = seqQ(5);
      if (q.kind === 'dec') { // terms in tenths as text; the hidden one has tenths
        kinds.add('dec');
        const t = q.terms.map(x => Math.round(+x * 10)), d = t[1] - t[0];
        if (q.form !== 'seq' || t.length !== 5 || !t.every((v, j) => !j || v - t[j - 1] === d) || !d || q.v !== t[q.hide] || q.v % 10 === 0 || q.parts[0] !== Math.floor(q.v / 10) || q.parts[1] !== q.v % 10 || q.dp !== 1) bad.push('dec ' + JSON.stringify(q));
        continue;
      }
      const t = q.terms, d = t[1] - t[0];
      if (t.length !== 5 || !t.every((v, j) => !j || v - t[j - 1] === d) || !d || q.ans !== t[q.hide] || Math.max(...t) > 999999 || q.neg !== (q.ans < 0)) bad.push(JSON.stringify(q));
      if (Math.min(...t) < 0) { kinds.add('neg'); if (t[0] <= 0 || d >= 0) bad.push('neg ' + JSON.stringify(q)); }
      if ([11, 12].includes(Math.abs(d))) kinds.add('12s');
      if (Math.abs(d) >= 1000) kinds.add('big');
      if (q.neg) kinds.add('negans');
    }
    if (kinds.size < 5) bad.push('kinds ' + [...kinds].join());
    return bad.slice(0, 4);
  });
  ok(s5.length === 0, 'Number patterns Year 5: 11s 12s, 1000s to 100,000s, decimal steps, counting back through 0 ' + s5.join(' | '));
  await yearSheet('seq', 5, 'Number patterns');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/26-seq-y5.png' });
  ok(await page.evaluate(() => cards.every(c => c.el.querySelectorAll('.eq .bx, .words .bx').length === 1)), 'Number patterns Year 5: one box in the pattern');
  ok(await page.evaluate(() => {
    const c = cards[0]; c.q = { kind: 'seq', terms: [6, 4, 2, 0, -2], hide: 4, ans: -2, neg: true }; layout(c); sizeCanvas(c);
    const minus = [...c.el.querySelectorAll('.al span')].some(s => s.textContent === '−');
    writeNum(c, 2); const r = readAnswer(c);
    c.q = { kind: 'seq', terms: [9, 6, 3, 0, -3], hide: 3, ans: 0, neg: false }; layout(c); sizeCanvas(c);
    return minus && r.ok && r.text === '−2' && !c.el.querySelector('.al').textContent.includes('−');
  }), 'below 0: the minus is printed before the line, she writes 2 for −2 (read as −2)');
  for (const yr of [4, 3, 1, 2]) await yearSheet('seq', yr, 'Number patterns');
  ok(await page.evaluate(() => cards.every(c => c.el.querySelectorAll('.eq .bx').length === 1)), 'Number patterns: one box in the pattern');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/26-seq.png' });

  // ---- Doubles and halves
  const dq = await page.evaluate(() => {
    const bad = [];
    for (const yr of [1, 2, 3, 4]) for (let i = 0; i < 300; i++) {
      const q = dblQ(yr, ['double', 'half']), n = +q.cap?.match(/\d+/)?.[0] || +q.text.match(/\d+/)[0], dbl = /double/.test(q.cap || q.text);
      if (q.ans !== (dbl ? 2 * n : n / 2) || (yr === 1 && (q.kind !== 'dpic' || q.ans > 10)) || (yr === 2 && Math.max(n, q.ans) > 20)) bad.push(`${yr} ${JSON.stringify(q)}`);
    }
    return bad.slice(0, 4);
  });
  ok(dq.length === 0, 'Doubles and halves: right answers, Year 1 to 10 with dots, Year 2 to 20 ' + dq.join(' | '));
  for (const yr of [4, 3, 1]) await yearSheet('dbl', yr, 'Doubles and halves');
  ok(await page.evaluate(() => cards.every(c => {
    const full = c.el.querySelectorAll('svg circle[fill="currentColor"]').length, empty = c.el.querySelectorAll('svg circle[fill="none"]').length;
    return c.q.dbl ? full === c.q.n && empty === c.q.n : full === 2 * c.q.n && empty === 0;
  })), 'Year 1 dots: a double shows n and n empty spaces, a half shows 2n split down the middle');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/27-dbl-y1.png' });

  // ---- Story sums
  const sto = await page.evaluate(() => {
    const bad = [], top = { 1: 20, 2: 100, 3: 1000, 4: 10000 };
    const calc = { add: n => n[0] + n[1], sub: n => n[0] - n[1], compare: n => n[0] - n[1], need: n => n[1] - n[0], two: n => n[0] + n[1] - n[2], groups: n => n[0] * n[1], share: n => n[0] / n[1], recipe: n => n[0] * n[1], scale: n => n[1] * n[2] / n[0] };
    const recipes = new Set();
    for (const yr of [1, 2, 3, 4]) for (const kinds of [['addsub', 'muldiv'], ['muldiv'], ['addsub']]) for (let i = 0; i < 150; i++) {
      const q = storyQ(yr, kinds), n = q.text.match(/\d+/g).map(Number);
      if (q.ans !== calc[q.type](n) || q.ans < 2 || Math.max(...n, q.ans) > top[yr]) bad.push(`${yr} ${JSON.stringify(q)}`);
      if (!kinds.includes(STORY_KIND[q.type]) || (yr === 1 && ['compare', 'need', 'two'].includes(q.type))) bad.push(`${yr} type ${q.type} ${kinds}`);
      if (q.type === 'two' && Math.max(...n) > [0, 0, 20, 100, 1000][yr]) bad.push('two steps too big ' + JSON.stringify(q));
      if (['recipe', 'scale'].includes(q.type)) {
        recipes.add(q.type);
        if (yr !== 4 || !['grams', 'mL'].includes(q.unit) || !Number.isInteger(q.ans)) bad.push('recipe ' + JSON.stringify(q));
        if (q.type === 'scale' && ![0.5, 2, 3, 4].includes(n[2] / n[0])) bad.push('scale ' + q.text); // halve, double, × 3, × 4
      }
    }
    if (recipes.size !== 2) bad.push('Year 4 recipe stories seen: ' + [...recipes].join());
    return bad.slice(0, 4);
  });
  ok(sto.length === 0, 'Story sums: the answer matches the story; Year 1 within 20 (no two-step), Year 2 within 100 (two-step within 20), Year 3 within 1,000 ' + sto.join(' | '));
  for (const yr of [4, 3, 1, 2]) await yearSheet('story', yr, 'Story sums');
  ok(await page.evaluate(() => cards.every(c => cardSay(c.q) === c.q.text && c.el.querySelector('.u').textContent === c.q.unit)), 'Story sums: each card reads its story aloud, the answer line has its unit');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/28-story-y2.png' });
  // the longest recipe story on every card
  await page.evaluate(() => {
    hideDone(); buildSheet({ yr: 4, kinds: ['muldiv'], n: 6 });
    const text = 'A recipe for 12 biscuits needs 600 grams of butter. Ty the cat makes 48 biscuits. How many grams?';
    cards.forEach(c => { c.q = { kind: 'story', type: 'scale', text, unit: 'grams', say: text, ans: 2400 }; layout(c); sizeCanvas(c); });
  });
  ok((await fits()).length === 0, 'Story sums Year 4: the longest recipe story fits ' + (await fits()).join(' '));
  ok((await writeAllAndMark()).length === 0, 'Story sums Year 4 recipes: read and marked right');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/28-story-y4.png' });

  // ---- Graphs
  const gq = await page.evaluate(() => {
    const bad = [], asks = new Set();
    for (const yr of [1, 2, 3, 4]) for (let i = 0; i < 300; i++) {
      const q = graphQ(yr);
      if (yr === 4) { // dot plot: how many have v, the most common value, how many altogether, the biggest and smallest values, the spread
        const C = q.counts, mx = Math.max(...C), has = C.map((n, v) => n ? v : -1).filter(v => v >= 0), lo = has[0], hi = has[has.length - 1];
        const want = { one: C[q.v], mode: C.indexOf(mx), all: C.reduce((a, b) => a + b, 0), max: hi, min: lo, range: hi - lo }[q.ask];
        const dots = new DOMParser().parseFromString(graphSvg(q), 'image/svg+xml').querySelectorAll('circle').length;
        if (q.type !== 'dot' || q.ans !== want || C.filter(n => n === mx).length !== 1 || dots !== C.reduce((a, b) => a + b, 0)) bad.push('dot ' + JSON.stringify(q));
        if (C.indexOf(mx) === hi) bad.push('dot plot: the tallest stack is at the biggest value ' + JSON.stringify(q));
        asks.add(q.ask);
        continue;
      }
      if (q.kind === 'tap') { // Years 1 and 2: tap the colour with the most or the least
        const ns = q.cats.map(c => c.n), want = q.ask === 'most' ? Math.max(...ns) : Math.min(...ns), nc = yr === 1 ? 3 : 4;
        if (yr > 2 || q.form !== 'graph' || q.cats.length !== nc || new Set(ns).size !== nc || q.tiles.length !== nc || q.cats[q.right].n !== want || q.tiles[q.right].label !== q.cats[q.right].nm || !q.tiles.every((t, j) => t.say === q.cats[j].nm)) bad.push(`y${yr} tap ` + JSON.stringify(q));
        if (yr === 1 && q.type !== 'col') bad.push('y1 tap type ' + q.type);
        asks.add(`y${yr} ${q.ask}`);
        continue;
      }
      if (yr === 1) asks.add('y1 ' + q.ask);
      if (yr === 2 && q.type === 'cdot') asks.add('y2 cdot');
      const ns = q.cats.map(c => c.n), by = Object.fromEntries(q.cats.map(c => [c.nm, c.n]));
      const want = q.ask === 'one' ? by[q.of[0]] : q.ask === 'more' ? by[q.of[0]] - by[q.of[1]] : ns.reduce((a, b) => a + b, 0);
      if (q.ans !== want || q.ans < 1 || new Set(ns).size !== ns.length) bad.push(`${yr} ${JSON.stringify(q)}`);
      if ((yr === 1 && (q.type !== 'col' || q.ask !== 'one' || q.cats.length !== 3 || Math.max(...ns) > 8)) || (yr === 2 && q.type === 'bar') || (yr === 3 && (q.type !== 'bar' || ns.some(n => n % q.step)))) bad.push(`${yr} type ${JSON.stringify(q)}`);
      // the drawing shows the counts: dots, tally marks, or bar heights on the scale
      const svg = new DOMParser().parseFromString(graphSvg(q), 'image/svg+xml');
      if ((q.type === 'pic' || q.type === 'col' || q.type === 'cdot') && svg.querySelectorAll('circle').length !== ns.reduce((a, b) => a + b, 0)) bad.push('dots ' + JSON.stringify(q));
      if (q.type === 'tally' && svg.querySelectorAll('line').length !== ns.reduce((a, b) => a + b, 0)) bad.push('tally ' + JSON.stringify(q));
      if (q.type === 'bar') {
        const bars = [...svg.querySelectorAll('rect')].filter(r => +r.getAttribute('width') === 13).map(r => +r.getAttribute('height'));
        if (bars.some((h, j) => Math.abs(h - ns[j] * 60 / (6 * q.step)) > 0.01)) bad.push('bars ' + JSON.stringify(q));
      }
    }
    if ([...asks].sort().join() !== 'all,max,min,mode,one,range,y1 least,y1 most,y1 one,y2 cdot,y2 least,y2 most') bad.push('questions seen: ' + [...asks].sort().join());
    return bad.slice(0, 4);
  });
  ok(gq.length === 0, 'Graphs: answers match the counts and the drawing (dots, tally marks, bars on the scale); Year 1 picture graphs, Year 3 bar graphs; Year 4 dot plots ask how many, most common, altogether, most, fewest and spread, and the tallest stack is never at the biggest value ' + gq.join(' | '));
  await yearSheet('graph', 4, 'Graphs');
  // the three new dot plot questions, on one plot: most pets is 5 (the tallest stack is at 2)
  await page.evaluate(() => {
    hideDone(); buildSheet(cfg);
    const base = { kind: 'graph', type: 'dot', topic: 0, counts: [0, 3, 6, 2, 0, 1, 0], of: [] }, T = DOT_TOPICS[0];
    const set = (i, q) => { cards[i].q = { ...base, ...q }; layout(cards[i]); sizeCanvas(cards[i]); };
    set(0, { ask: 'max', cap: T.max, say: T.max, ans: 5 }); set(1, { ask: 'min', cap: T.min, say: T.min, ans: 1 });
    set(2, { ask: 'range', cap: 'How spread out?<br>Biggest take away smallest', capLen: 26, say: 'x', ans: 4 });
  });
  ok(await page.evaluate(() => [0, 1, 2].map(i => cards[i].el.querySelector('.cap').innerText.replace(/\n/g, ' / ')).join(' | ')) === 'Most pets anyone has? | Fewest pets anyone has? | How spread out? / Biggest take away smallest', 'Graphs Year 4: most, fewest and spread questions printed (spread on two lines)');
  ok((await fits()).length === 0, 'Graphs Year 4 new questions fit ' + (await fits()).join(' '));
  ok((await writeAllAndMark()).length === 0, 'Graphs Year 4 new questions: read and marked right');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/29-graph-y4.png' });
  for (const yr of [3, 1, 2]) await yearSheet('graph', yr, 'Graphs');
  ok(await page.evaluate(() => cards.every(c => c.q.kind === 'tap' || (c.el.querySelectorAll('.cap .sw').length === c.q.of.length && cardSay(c.q) === c.q.say))), 'Graphs: colours in the question, read aloud by colour name');
  ok(await page.evaluate(() => { const qs = range(0, 40).map(() => graphQ(2)); return qs.every(q => q.of.length === 0 || /class="sw round"/.test(q.cap) === (q.type === 'pic')); }), 'Graphs: a circle in the question when she counts circles, a square for tallies and bars (Sam)');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/29-graph-y2.png' });
  // Year 1: columns standing on a line, and tap the colour with the most / least (both kinds on one sheet)
  await page.evaluate(() => { hideDone(); buildSheet({ yr: 1, n: 12 }); for (let i = 0; i < 2; i++) { const q = graphQ(1); if (q.kind !== 'tap') { i--; continue; } cards[i].q = q; layout(cards[i]); sizeCanvas(cards[i]); } });
  ok(await page.evaluate(() => cards.every(c => c.q.kind === 'tap' ? c.el.querySelectorAll('.tt .tsw').length === 3 && /^Which has the (most|least)\? (\w+, ){2}\w+\.$/.test(cardSay(c.q)) : c.q.type === 'col')), 'Graphs Year 1: picture graphs in columns; tap cards with three colour squares, read "Which has the most? red, blue, green."');
  ok((await fits()).length === 0, 'Graphs Year 1 (columns and tap cards) fit ' + (await fits()).join(' '));
  ok((await writeAllAndMark()).length === 0, 'Graphs Year 1: written and tapped answers marked right');
  ok(await page.evaluate(() => { const c = cards[0], wrong = c.q.right === 0 ? 1 : 0; c.el.querySelector('.retry').click(); c.pick = [wrong]; paintTap(c); return readAnswer(c).ok === false; }), 'Graphs Year 1: a wrong colour is marked wrong');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/29-graph-y1.png' });
  // Year 5 (C4a): clustered bars (more in one day, altogether, tap the day) and grouped tables
  const g5 = await page.evaluate(() => {
    const bad = [], seen = new Set();
    for (let i = 0; i < 600; i++) {
      const q = graphQ(5);
      seen.add(q.type + ' ' + q.ask);
      const svg = new DOMParser().parseFromString(graphSvg(q), 'image/svg+xml');
      if (q.type === 'gtab') {
        const C = q.counts, want = q.ask === 'all' ? sumOf(C) : q.ask === 'less' ? sumOf(C.slice(0, q.cut)) : sumOf(C.slice(q.cut));
        const shown = [...svg.querySelectorAll('text')].map(t => t.textContent);
        if (q.ans !== want || C.length !== 4 || !C.every((n, j) => shown.includes(gtabBand(GTAB_TOPICS[q.topic].w, j)))) bad.push('gtab ' + JSON.stringify(q));
        continue;
      }
      const G = q.groups, bars = [...svg.querySelectorAll('rect')].filter(r => +r.getAttribute('width') === 10).map(r => +r.getAttribute('height'));
      if (q.type !== 'cbar' || G.length !== 3 || G.some(([a, b]) => a === b || a % q.step || b % q.step || a > 6 * q.step) || bars.length !== 6 || bars.some((h, j) => Math.abs(h - G[j >> 1][j & 1] * 60 / (6 * q.step)) > 0.01)) bad.push('cbar ' + JSON.stringify(q));
      const ix = q.of.map(nm => q.keys.findIndex(k => k.nm === nm));
      if (q.ask === 'all' && q.ans !== sumOf(G.map(g => g[ix[0]]))) bad.push('all ' + JSON.stringify(q));
      if (q.ask === 'more' && (q.ans !== G[q.gi][ix[0]] - G[q.gi][ix[1]] || q.ans < 1)) bad.push('more ' + JSON.stringify(q));
      if (q.ask === 'which') {
        const hits = G.map((g, j) => g[ix[0]] > g[ix[1]] ? j : -1).filter(j => j >= 0);
        if (q.kind !== 'tap' || hits.length !== 1 || hits[0] !== q.right || q.tiles.length !== 3 || q.tiles[q.right].label !== q.days[q.right] || !/day$/.test(q.tiles[0].say)) bad.push('which ' + JSON.stringify(q));
      }
    }
    if ([...seen].sort().join() !== 'cbar all,cbar more,cbar which,gtab all,gtab less,gtab more') bad.push('seen ' + [...seen].sort().join());
    return bad.slice(0, 4);
  });
  ok(g5.length === 0, 'Graphs Year 5: clustered bars on the scale (how many more on one day, one colour altogether, tap the one day with more), grouped tables (less than, or more, altogether) ' + g5.join(' | '));
  for (let r = 0; r < 2; r++) await yearSheet('graph', 5, 'Graphs');
  await page.evaluate(() => { hideDone(); buildSheet({ yr: 5, n: 12 }); const want = ['which', 'which', 'more', 'all', 'gtab', 'gtab']; for (let i = 0; i < want.length; i++) { const q = graphQ(5); if (want[i] === 'gtab' ? q.type !== 'gtab' : q.ask !== want[i] || q.type !== 'cbar') { i--; continue; } cards[i].q = q; layout(cards[i]); sizeCanvas(cards[i]); } });
  ok(await page.evaluate(() => cards.slice(0, 2).every(c => c.el.querySelectorAll('.tt').length === 3 && c.el.querySelectorAll('.tw .sw').length === 2 && /^Which day has more \w+ than \w+\? \w+day, \w+day, \w+day\.$/.test(cardSay(c.q)))), 'Graphs Year 5: tap the day, read "Which day has more cats than dogs? Monday, Tuesday, Wednesday."');
  ok((await fits()).length === 0, 'Graphs Year 5 (all kinds) fit ' + (await fits()).join(' '));
  ok((await writeAllAndMark()).length === 0, 'Graphs Year 5: written and tapped answers marked right');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/29-graph-y5.png' });

  // ---- Chance (C4b, Year 5): a bag of counters; words, a 0 to 1 line, and Try it (20 real picks)
  const ch = await page.evaluate(() => {
    const bad = [], seen = {};
    for (let i = 0; i < 1500; i++) {
      const q = chanceQ(['words', 'line', 'try']);
      seen[q.form] = (seen[q.form] || 0) + 1;
      if (q.cols.length !== sumOf(q.bag.map(b => b[1])) || q.cols.length > BAG_SPOTS.length || q.cols.length < 4) bad.push('bag size ' + JSON.stringify(q));
      if (q.form === 'try') {
        if (q.bag.length < 2 || new Set(q.bag.map(b => b[1])).size !== q.bag.length || q.got || q.tiles.length !== q.bag.length) bad.push('try ' + JSON.stringify(q));
        continue;
      }
      const k = q.cols.filter(c => c === q.ask).length, N = q.cols.length, w = chanceWord(k, N);
      if (w !== q.right || k !== q.k || N !== q.N) bad.push('answer ' + JSON.stringify(q));
      if ((w === 1 && 2 * k > N - 2) || (w === 3 && 2 * k < N + 2)) bad.push('too close to half ' + JSON.stringify(q));
      if (w === 0 && q.bag.length < 2) bad.push('impossible needs other colours ' + JSON.stringify(q));
      if (q.form === 'words' && q.tiles[q.right].label !== q.ans) bad.push('words ans ' + JSON.stringify(q));
      seen[q.form + w] = 1;
    }
    for (const f of ['words0', 'words1', 'words2', 'words3', 'words4', 'line0', 'line1', 'line2', 'line3', 'line4']) if (!seen[f]) bad.push('never ' + f);
    if (!(seen.try > 350 && seen.words > 350 && seen.line > 350)) bad.push('mix ' + JSON.stringify(seen));
    if (chanceQ(['line']).form !== 'line' || chanceQ(['nope']).kind !== 'tap') bad.push('kinds');
    return bad.slice(0, 4);
  });
  ok(ch.length === 0, 'Chance: the answer matches the bag (impossible, unlikely, even, likely, certain), unlikely and likely clear of half, every word and mark comes up, Try it bags have different amounts ' + ch.join(' | '));
  // Try it: really random, a tally of 20, any colour tied for most is right
  const tr = await page.evaluate(() => {
    const bad = [], tops = {};
    act = 'chance'; buildSheet({ yr: 5, kinds: ['try'], n: 6 }); show('sheet');
    const c = cards[0];
    if (!c.el.querySelector('.tiles.wait') || !c.el.querySelector('.pick20')) bad.push('waits before picking');
    c.el.querySelector('.tt').click();
    if (c.pick.length) bad.push('a tile tapped before the picks counted');
    chancePick(c, true);
    if (sumOf(c.q.got) !== 20 || c.el.querySelector('.tiles.wait') || !c.el.querySelector('.pick20').disabled) bad.push('20 picks ' + JSON.stringify(c.q.got));
    const marks = c.el.querySelectorAll('.tally line').length;
    if (marks !== 20) bad.push('tally marks ' + marks);
    const mx = Math.max(...c.q.got);
    if (!c.q.right.length || !c.q.right.every(j => c.q.got[j] === mx)) bad.push('right ' + JSON.stringify(c.q));
    // the picks follow the bag: 300 runs of a 9 to 1 bag, red should come up most nearly always
    const q = { bag: [['red', 9], ['blue', 1]] };
    for (let t = 0; t < 300; t++) {
      const k = { q: { ...chanceQ(['try']), bag: q.bag, cols: [] }, el: document.createElement('div') };
      k.el.innerHTML = '<button class="pick20"></button><span class="tally"></span><div class="tiles"></div>';
      chancePick(k, true);
      tops[k.q.ans] = (tops[k.q.ans] || 0) + 1;
    }
    if (!(tops.red > 290)) bad.push('9 to 1 bag ' + JSON.stringify(tops));
    // a tie: either colour is right, both together are not
    const t2 = { q: { kind: 'tap', any: true, right: [0, 2], tiles: [{ label: 'a' }, { label: 'b' }, { label: 'c' }] }, pick: [2] };
    if (!readAnswer(t2).ok || (t2.pick = [0, 2], readAnswer(t2).ok) || (t2.pick = [1], readAnswer(t2).ok)) bad.push('tie');
    return bad;
  });
  ok(tr.length === 0, 'Chance Try it: tiles wait for "Pick 20", then 20 tally marks from real picks that follow the bag; any colour tied for most is right ' + tr.join(' | '));
  for (const kinds of [['words', 'line', 'try'], ['words'], ['line'], ['try']]) for (const n of [6, 12]) {
    await page.evaluate((kinds, n) => { hideDone(); act = 'chance'; buildSheet({ yr: 5, kinds, n }); show('sheet'); }, kinds, n);
    ok((await fits()).length === 0, `Chance ${kinds.join(',')} × ${n} fits, tiles big enough to tap ` + (await fits()).join(' '));
    if (kinds.length === 1) ok(await page.evaluate(() => cards.every(c => [...c.el.querySelectorAll('.tt')].every(b => b.scrollWidth <= b.clientWidth + 1))), `Chance ${kinds[0]}: every tile's words fit inside it`);
    ok((await writeAllAndMark()).length === 0, `Chance ${kinds.join(',')} × ${n}: tapped right, marked right`);
  }
  await page.evaluate(() => { hideDone(); act = 'chance'; buildSheet({ yr: 5, kinds: ['words', 'line', 'try'], n: 6 }); show('sheet'); const f = ['words', 'line', 'try']; for (let i = 0; i < 6; i++) { let q; do q = chanceQ(f); while (q.form !== f[i % 3]); cards[i].q = q; layout(cards[i]); sizeCanvas(cards[i]); } chancePick(cards[5], true); });
  if (SHOTS) await page.screenshot({ path: SHOTS + '/30-chance.png' });
  ok(await page.evaluate(() => { const c = cards[0]; c.pick = [(c.q.right + 1) % 5]; paintTap(c); const a = !readAnswer(c).ok; c.pick = [c.q.right]; return a && readAnswer(c).ok; }), 'Chance: the wrong word is wrong, the right one right');
  ok(await page.evaluate(() => cards[1].el.querySelectorAll('.tiles.nline .tt').length === 5 && cards[1].el.querySelectorAll('.tiles.nline .tick').length === 2 && cards[0].el.querySelectorAll('.tiles.wrap .tt').length === 5), 'Chance: five word tiles; five marks on the line (0, ½, 1 and two between)');
  ok(await page.evaluate(() => /^Picking a \w+ counter is what\? impossible, unlikely, even chance, likely, certain\.$/.test(cardSay(cards[0].q)) && /^Where on the line from 0 to 1 is picking a \w+ counter\? 0, between 0 and a half, a half, between a half and 1, 1\.$/.test(cardSay(cards[1].q))), 'Chance read aloud: the question then each tile');
  ok(await page.evaluate(() => [ACTS.chance.key({ yr: 5, kinds: ['try', 'words'], n: 6 }), ACTS.chance.key({ yr: 5, kinds: [], n: 12 }), labelFor('chance~5|words,line,try|6')].join(' / ')
    === 'chance~5|words,try|6 / chance~5|words,line,try|12 / Chance · Year 5 · words, 0 to 1 line, try it · 6 questions'), 'Chance record keys and label');

  // ---- Shapes
  const shq = await page.evaluate(() => {
    const bad = [], symOk = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12];
    for (const yr of [1, 2, 3, 4]) for (const kinds of [['flat', 'solid'], ['flat'], ['solid']]) for (let i = 0; i < 200; i++) {
      const q = shapeQ(yr, kinds);
      if (q.solid) { if (yr === 1 || !kinds.includes('solid') || q.ans !== SOLIDS[q.solid][q.ask] || (yr === 2 && q.ask === 'edges')) bad.push(`${yr} solid ${JSON.stringify(q)}`); continue; }
      if (q.ask === 'sym') { if (yr < 3 || !symOk.includes(q.ans) || (yr === 3 && q.ans > 8)) bad.push('sym ' + JSON.stringify(q)); continue; }
      if (q.ask === 'right') { if (yr !== 4 || ![1, 2, 4].includes(q.ans)) bad.push('right ' + JSON.stringify(q)); continue; }
      const n = q.pts.length;
      if (q.ans !== n || (yr === 1 && n > 4) || (yr === 2 && n > 6) || n > (yr === 4 ? 12 : 10) || q.pts.some(p => Math.hypot(...p) > 46)) bad.push(`${yr} flat ${JSON.stringify(q)}`);
      if (yr >= 2 && kinds.length === 1 && kinds[0] === 'solid' && !q.solid) bad.push('solid only gave flat');
    }
    return bad.slice(0, 4);
  });
  ok(shq.length === 0, 'Shapes: sides = corners = points drawn; 3D faces, edges, corners right; Year 1 up to 4 sides, Year 2 up to 6, symmetry in Year 3 ' + shq.join(' | '));
  for (const yr of [4, 3, 1, 2]) await yearSheet('shape', yr, 'Shapes');
  ok(await page.evaluate(() => cards.every(c => c.q.solid ? c.el.querySelectorAll('svg line[stroke-dasharray]').length === 3 : c.el.querySelector('svg polygon').getAttribute('points').split(' ').length === c.q.pts.length)), 'Shapes: the polygon has as many corners as the answer; 3D shapes show hidden edges dashed');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/30-shape-y2.png' });

  // ---- Rulers
  const rq = await page.evaluate(() => {
    const bad = [];
    for (const yr of [1, 2, 3, 4]) for (let i = 0; i < 300; i++) {
      const q = rulerQ(yr, ['pencil']);
      if (q.ans !== q.e - q.s || q.ans < 2 || q.s < 0 || (yr < 3 && q.s !== 0) || q.e > { 1: 9, 2: 10, 3: 12, 4: 60 }[yr] || q.unit !== { 1: 'blocks', 2: 'cm', 3: 'cm', 4: 'mm' }[yr] || (yr === 4 && (q.ans < 15 || ![0, 10].includes(q.s)))) bad.push(`${yr} ${JSON.stringify(q)}`);
    }
    return bad.slice(0, 4);
  });
  ok(rq.length === 0, 'Rulers: length = end − start, Year 1 in blocks, Year 2 from 0, Year 3 sometimes not from 0 ' + rq.join(' | '));
  for (const yr of [4, 3, 1, 2]) await yearSheet('ruler', yr, 'Rulers');
  ok(await page.evaluate(() => cards.filter(c => !c.q.dial && !c.q.jug).every(c => { const t = [...c.el.querySelectorAll('svg text')].map(x => +x.textContent); return t.length === 11 && t[0] === 0 && t[10] === 10 && c.el.querySelector('.u').textContent === 'cm'; })), 'Rulers Year 2: a 0–10 cm ruler and "cm" after the line');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/31-ruler-y2.png' });
  ok(await page.evaluate(() => [labelFor('graph~3|12'), labelFor('shape~2|flat,solid|6'), labelFor('ruler~1|6')].join(' / '))
    === 'Graphs · Year 3 · 12 questions / Shapes · Year 2 · flat, 3D · 6 questions / Rulers · Year 1 · 6 questions', 'record labels for Graphs, Shapes, Rulers');
  // Thermometer (Rulers, Year 4 only)
  const th = await page.evaluate(() => {
    const bad = []; let thermo = 0;
    for (let i = 0; i < 400; i++) {
      const q = rulerQ(4, ['pencil', 'thermo']);
      if (!q.thermo) continue;
      thermo++;
      if (q.ans !== q.t || q.t < 1 || q.t > 39 || q.t % 10 === 0 || q.t % q.step || ![1, 2].includes(q.step) || q.unit !== '°C') bad.push(JSON.stringify(q));
    }
    for (const yr of [1, 2, 3]) for (let i = 0; i < 50; i++) if (rulerQ(yr, ['thermo']).thermo) bad.push('thermometer in Year ' + yr);
    for (let i = 0; i < 50; i++) if (!rulerQ(4, ['thermo']).thermo) bad.push('Thermometer only gave a pencil');
    return { bad: bad.slice(0, 3), thermo };
  });
  ok(th.bad.length === 0 && th.thermo > 120 && th.thermo < 280, 'Thermometer: 1–39 °C, on a mark, never on a labelled 10, Year 4 only ' + th.bad.join(' '));
  await page.evaluate(() => { act = 'ruler'; buildSheet({ yr: 4, kinds: ['thermo'], n: 12 }); show('sheet'); });
  ok(await page.evaluate(() => cards.every(c => {
    const t = [...c.el.querySelectorAll('svg text')].map(x => +x.textContent), marks = c.el.querySelectorAll('svg line').length;
    return t.join() === '40,30,20,10,0'.split(',').reverse().join() && marks === 40 / c.q.step + 1 && c.el.querySelector('.u').textContent === '°C' && c.el.querySelector('.cap').textContent === 'How warm?';
  })), 'Thermometer cards: labels 0 to 40, a mark every 1 or 2, "°C" after the line');
  ok((await fits()).length === 0, 'Thermometer fits with room to write ' + (await fits()).join(' '));
  ok((await writeAllAndMark()).length === 0, 'Thermometer: answers read and marked right');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/31-thermo.png' });
  ok(await page.evaluate(() => [labelFor('ruler~4|pencil,thermo|12'), labelFor('ruler~4|12'), ACTS.ruler.key({ yr: 3, kinds: ['pencil', 'thermo'], n: 12 })].join(' / '))
    === 'Rulers · Year 4 · pencil, thermometer · 12 questions / Rulers · Year 4 · 12 questions / ruler~3|12', 'Rulers record labels with a Kind; Years 1–3 keep their old keys');

  // ---- tap cards (no writing): True or false and More or less, Year 4
  const val = `s => Function('return ' + s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-'))()`;
  const tq = await page.evaluate(valSrc => {
    const bad = [], val = eval(valSrc), kinds = new Set();
    let trues = 0;
    for (let i = 0; i < 600; i++) {
      const q = tfQ(4), [l, r] = q.text.split(' = '), lv = val(l), rv = val(r);
      if (q.kind !== 'tap' || q.truth !== (lv === rv) || q.right !== (q.truth ? 0 : 1) || q.tiles.map(t => t.label).join('') !== '✓✗' || q.ans !== q.tiles[q.right].label) bad.push('wrong ' + JSON.stringify(q));
      if (!Number.isInteger(lv) || !Number.isInteger(rv) || lv < 1 || rv < 1 || Math.max(lv, rv) > 9999) bad.push('size ' + q.text);
      // a wrong one is a near miss: out by 1, 10 or 100, a place out (× or ÷ 10), two digits swapped, or a times-table neighbour
      const d = Math.abs(lv - rv), swapped = String(lv).length === String(rv).length && [...String(lv)].sort().join('') === [...String(rv)].sort().join('');
      if (!q.truth && !([1, 10, 100].includes(d) || swapped || lv === rv * 10 || rv === lv * 10 || (/×/.test(q.text) && d <= 12))) bad.push('not a near miss ' + q.text);
      trues += q.truth;
      kinds.add(/[+−×÷]/.test(r) ? 'both' : /÷ 10$|× 10$/.test(l) ? 'ten' : /×/.test(l) ? 'tables' : 'addsub');
      if (q.say !== signWords(q.text) + '. True?') bad.push('say ' + q.say);
    }
    if (trues < 240 || trues > 360) bad.push('true ' + trues + ' of 600');
    if (kinds.size !== 4) bad.push('kinds ' + [...kinds].join());
    return bad.slice(0, 4);
  }, val);
  ok(tq.length === 0, 'True or false Year 4: the tick is right exactly when both sides are equal; about half true; wrong ones are near misses; four-digit + −, tables, × ÷ 10 and both-sides sentences ' + tq.join(' | '));
  const cq = await page.evaluate(valSrc => {
    const bad = [], val = eval(valSrc);
    let same = 0, shared = 0, nums = 0;
    for (const kinds of [['num'], ['sum'], ['num', 'sum']]) for (let i = 0; i < 400; i++) {
      const q = cmpQ(4, kinds), lv = val(q.l), rv = val(q.r), isNum = /^\d+$/.test(q.l) && /^\d+$/.test(q.r);
      if (q.kind !== 'tap' || q.right !== (lv < rv ? 0 : lv === rv ? 1 : 2) || q.tiles.map(t => t.label).join('') !== '<=>' || q.ans !== q.tiles[q.right].label) bad.push('wrong ' + JSON.stringify(q));
      if (lv < 1 || rv < 1 || Math.max(lv, rv) > 10000 || !Number.isInteger(lv) || !Number.isInteger(rv)) bad.push('size ' + q.l + ' ' + q.r);
      if (kinds.length === 1 && isNum !== (kinds[0] === 'num')) bad.push('kind ' + kinds + ' ' + q.l + ' ' + q.r);
      if (!isNum && q.l === q.r) bad.push('both sides print the same ' + q.l);
      same += lv === rv;
      if (isNum) { nums++; shared += lv !== rv && [...q.l].sort().join('') === [...q.r].sort().join(''); }
      if (!/<span class="bx"><\/span>/.test(q.top)) bad.push('no box ' + q.top);
    }
    if (same < 160 || same > 330) bad.push('equal ' + same + ' of 1200');
    if (shared < nums * 0.3) bad.push('numbers sharing digits ' + shared + ' of ' + nums);
    return bad.slice(0, 4);
  }, val);
  ok(cq.length === 0, 'More or less Year 4: the right sign for the two sides; numbers to 10,000 that often share digits; sums are tables or thousands and hundreds; about one in five equal ' + cq.join(' | '));

  await page.click('#backBtn');
  await page.click('#actTiles [data-act="tf"]');
  ok(await page.evaluate(() => draft.yr === 4 && $('#kpBlock').hidden && $('#optBlock [data-key="yr"]').children.length === 5 && $('.sughint').textContent === 'Your year: Year 4'), 'True or false setup: a Year row with Years 1 to 5, Year 4 chosen');
  ok(await page.$$eval('#preview .mini .tt', t => t.length) === 8, 'True or false examples show their two tiles');
  await page.click('#newBtn');
  ok(await page.evaluate(() => cards.length === 12 && cards.every(c => c.q.kind === 'tap' && c.el.classList.contains('tapc') && c.el.querySelectorAll('.tt').length === 2 && getComputedStyle(c.cv).display === 'none' && getComputedStyle(c.el.querySelector('.undo')).display === 'none' && getComputedStyle(c.el.querySelector('.clear')).display === 'none')), 'True or false sheet: every card has a tick tile and a cross tile, and nothing to write on');
  ok((await fits()).length === 0, 'True or false fits, with tiles big enough to tap ' + (await fits()).join(' '));
  ok(await page.evaluate(() => new Set(cards.map(c => Math.round(c.el.querySelector('.tt').getBoundingClientRect().width))).size === 1 && cards[0].el.querySelector('.tt').getBoundingClientRect().width >= 56), 'tiles are the same size on every card, however long the sentence');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/32-tf.png' });
  const tile = (card, i) => `#sheet .card:nth-child(${card + 1}) .tt[data-i="${i}"]`;
  const pressed = card => page.$$eval(`#sheet .card:nth-child(${card + 1}) .tt`, t => t.map(b => b.getAttribute('aria-pressed')).join());
  // select, change, Mark, Try again, first try scored
  await page.evaluate(() => { window.__w = cards.map(c => 1 - c.q.right); }); // the wrong tile on each card
  const wrong0 = await page.evaluate(() => __w[0]), right0 = 1 - wrong0;
  await page.tap(tile(0, wrong0));
  ok(await pressed(0) === (wrong0 ? 'false,true' : 'true,false') && await page.evaluate(() => sheetStart !== null && cards[0].el.dataset.state === 'writing' && cards[0].el.querySelector('.read').textContent === '' && cards[0].strokes.length === 0), 'tapping a tile selects it (thick border), starts the clock, marks nothing and draws nothing');
  ok(await page.$eval(tile(0, wrong0), b => getComputedStyle(b).boxShadow !== 'none'), 'the chosen tile has a thick ink border');
  await page.tap(tile(0, right0));
  ok(await pressed(0) === (right0 ? 'false,true' : 'true,false'), 'tapping the other tile moves the choice');
  await page.tap(tile(0, wrong0));
  await page.tap(tile(1, await page.evaluate(() => cards[1].q.right)));
  await page.click('#markBtn');
  ok(await page.evaluate(() => cards[0].el.dataset.state === 'wrong' && cards[0].first === false && cards[1].el.dataset.state === 'right' && cards[1].first === true && cards.slice(2).every(c => c.el.dataset.state === 'writing' && c.first === null)), 'Mark marks the cards with a tile chosen (one wrong, one right) and leaves the rest');
  ok(await page.evaluate(() => getComputedStyle(cards[0].el).borderColor === 'rgb(163, 32, 27)' && getComputedStyle(cards[0].el.querySelector('.retry')).display !== 'none' && cards[0].el.querySelector('.read').textContent === ''), 'wrong: red border and Try again; the answer is not shown');
  await page.tap(tile(0, right0));
  ok(await pressed(0) === (wrong0 ? 'false,true' : 'true,false'), 'a marked card ignores taps until Try again');
  await page.click('#sheet .card:nth-child(1) .retry');
  ok(await pressed(0) === 'false,false' && await page.evaluate(() => cards[0].el.dataset.state === 'writing'), 'Try again clears the choice');
  await page.tap(tile(0, right0));
  await page.click('#markBtn');
  ok(await page.evaluate(() => cards[0].el.dataset.state === 'right' && cards[0].first === false && cards[0].el.dataset.claim !== '1' && getComputedStyle(cards[0].el.querySelector('.override')).display === 'none' && $('#score').textContent.replace(/\s+/g, ' ').includes('1/12')), 'right on the second try: marked right, the first try is what scores, no "I was right the first time"');
  ok((await writeAllAndMark()).length === 0 && await page.evaluate(() => sheetDone && loadRec(current).history[0].k === 'tf~4|12' && loadRec(current).history[0].first === 11), 'True or false: the whole sheet tapped right finishes it and saves the record (11 of 12 first try)');
  await wait(800);
  ok(await visible('#doneS') && await page.$eval('#dUp', b => b.textContent.includes('Year 5')), 'finish panel shows; Harder goes to Year 5 (C2a)');
  await page.click('#dLook');
  // the Working area still works beside tap cards
  await page.evaluate(() => { hideDone(); buildSheet(cfg); show('sheet'); setWorking(true); });
  await wait(100);
  ok(await visible('#workPanel') && (await fits()).length === 0, 'tap cards still fit with the Working area open ' + (await fits()).join(' '));
  await page.evaluate(() => setWorking(false));
  // spoken (ages 4–6): the card speaker reads the question, then each tile; a tapped tile says what it is
  await page.evaluate(() => { setYear(1); buildSheet(cfg); });
  const q0 = await page.evaluate(() => cards[0].q.say);
  await page.click('#sheet .card:nth-child(1) .cardsay');
  ok((await said()).slice(-1)[0] === q0 + ' true, not true.' && /equals .+\. True\?$/.test(q0), 'ages 4–6: the card speaker reads the sentence, then the tiles: ' + (await said()).slice(-1)[0]);
  await page.tap(tile(0, 1));
  ok((await said()).slice(-1)[0] === 'not true', 'ages 4–6: a tapped tile says what it is');
  await page.evaluate(() => { setYear(4); });

  // multi (several tiles can be on) and cells (a grid of small squares): for Map, Mirror and Plot later
  await page.evaluate(() => {
    buildSheet(cfg);
    const sq = k => ({ html: '', label: String(k), say: 'square ' + k });
    cards[0].q = { kind: 'tap', top: 'Tap 2 and 5', tc: 6, tiles: range(1, 9).map(sq), right: [1, 4], multi: true, cells: 3, say: 'Tap 2 and 5.', ans: '2 5' };
    cards[1].q = { kind: 'tap', top: 'Which are even?', tc: 8, tiles: [3, 4, 6, 9].map(k => ({ html: String(k), label: String(k), say: String(k) })), right: [1, 2], multi: true, say: 'Which are even?', ans: '4 6' };
    for (const i of [0, 1]) { layout(cards[i]); sizeCanvas(cards[i]); }
  });
  ok(await page.evaluate(() => { const t = [...cards[0].el.querySelectorAll('.tt')].map(b => b.getBoundingClientRect()); return t.length === 9 && Math.abs(t[0].top - t[2].top) < 1 && t[3].top > t[0].top + 20 && Math.abs(t[3].left - t[0].left) < 1 && cards[1].el.querySelectorAll('.tt').length === 4; }), 'cells: nine tiles laid out three across as a grid; four tiles in a row');
  ok((await fits()).length === 0, 'grid and four-tile cards fit ' + (await fits()).join(' '));
  await page.tap(tile(0, 1)); await page.tap(tile(0, 4)); await page.tap(tile(0, 7)); await page.tap(tile(0, 7)); // 8 on, then off again
  await page.tap(tile(1, 1));
  ok(await pressed(0) === 'false,true,false,false,true,false,false,false,false' && await pressed(1) === 'false,true,false,false', 'multi: tiles turn on and off one by one');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/33-tap-cells.png' });
  await page.click('#markBtn');
  ok(await page.evaluate(() => cards[0].el.dataset.state === 'right' && cards[1].el.dataset.state === 'wrong'), 'multi: right only with all of the right tiles and no others');

  // More or less
  await page.click('#backBtn');
  await page.click('#actTiles [data-act="cmp"]');
  ok(await page.evaluate(() => draft.yr === 4 && draft.kinds.join() === 'num,sum,dec,frac'), 'More or less setup: Year 4, numbers, sums, decimals (Year 5 only) and fractions');
  await page.click('#newBtn');
  ok(await page.evaluate(() => cards.every(c => c.q.kind === 'tap' && c.el.querySelectorAll('.tq .bx').length === 1 && [...c.el.querySelectorAll('.tt')].map(b => b.textContent).join('') === '<=>')), 'More or less sheet: an empty box between the two sides, tiles < = >');
  ok((await fits()).length === 0, 'More or less fits, with tiles big enough to tap ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/34-cmp.png' });
  ok((await writeAllAndMark()).length === 0, 'More or less: the right signs are marked right');
  for (const k of ['num', 'sum', 'frac']) {
    await page.evaluate(k => { hideDone(); buildSheet({ yr: 4, kinds: [k], n: 12 }); }, k);
    ok((await fits()).length === 0, `More or less (${k} only) fits ` + (await fits()).join(' '));
  }
  if (SHOTS) await page.screenshot({ path: SHOTS + '/34-cmp-frac.png' });
  ok(await page.evaluate(() => cards.every(c => c.el.querySelectorAll('.tq .fr').length >= 1)), 'More or less fractions print as top over bottom');
  const cfr = await page.evaluate(() => {
    const bad = [], types = new Set();
    let eq = 0;
    const v = s => s.includes('/') ? s.split('/').map(Number) : [+s.slice(2), 10];
    for (let i = 0; i < 1000; i++) {
      const q = cmpQ(4, ['frac']), [a, b] = v(q.l), [c, d] = v(q.r), dec = !q.l.includes('/') || !q.r.includes('/');
      if (q.right !== (a * d < c * b ? 0 : a * d === c * b ? 1 : 2) || q.ans !== q.tiles[q.right].label) bad.push('wrong ' + q.l + ' ' + q.r);
      const t = dec ? 'dec' : b === d ? 'bottom' : a === c ? 'top' : 'other';
      types.add(t);
      if (t === 'other' || (!dec && q.l === q.r)) bad.push('type ' + q.l + ' ' + q.r);
      if (dec && !/^(\d\/10|1\/2)$/.test(q.l.includes('/') ? q.l : q.r)) bad.push('tenths ' + q.l + ' ' + q.r);
      if (!dec && (a >= b || c >= d || Math.max(b, d) > 12)) bad.push('size ' + q.l + ' ' + q.r);
      eq += q.right === 1;
      if (!/^.+, and .+\. Which sign goes in the box\?$/.test(q.say) || /\//.test(q.say)) bad.push('say ' + q.say);
    }
    if (types.size !== 3) bad.push('types ' + [...types]);
    if (eq < 50 || eq > 250) bad.push('equal ' + eq + ' of 1000');
    return bad.slice(0, 4);
  });
  ok(cfr.length === 0, 'More or less fractions: same bottom, same top (to twelfths), or tenths against a decimal; the right sign; only decimals can be equal ' + cfr.join(' | '));
  ok(await page.evaluate(() => [labelFor('tf~4|12'), labelFor('cmp~4|num,sum|12'), labelFor('cmp~4|sum|6'), labelFor('cmp~4|num,sum,frac|12')].join(' / '))
    === 'True or false · Year 4 · 12 questions / More or less · Year 4 · numbers, sums · 12 questions / More or less · Year 4 · sums · 6 questions / More or less · Year 4 · numbers, sums, fractions · 12 questions', 'record labels for True or false and More or less');

  // ---- Fractions of a number, Year 4
  const ofq = await page.evaluate(() => {
    const bad = [];
    let round = 0, parts = 0;
    const ds = new Set();
    for (let i = 0; i < 800; i++) {
      const q = fofQ(4, ['part', 'whole']);
      ds.add(q.d);
      if (q.whole !== q.k * q.d || q.d < 2 || q.d > 10 || q.whole > 1000 || q.k < 2) bad.push('size ' + JSON.stringify(q));
      if (q.ans !== (q.part ? q.k : q.whole)) bad.push('ans ' + JSON.stringify(q));
      if (q.d >= 6 && q.k >= 100) bad.push('three digits in a narrow box ' + JSON.stringify(q));
      round += q.k % 10 === 0 && q.k > 10; parts += q.part;
      if (!(q.part ? /^What is an? \w+ of \d+\?$/ : /^An? \w+ of a set is \d+\. How many in the set\?$/).test(q.say)) bad.push('say ' + q.say);
    }
    if (ds.size !== 9) bad.push('denominators ' + [...ds]);
    if (round < 120 || round > 360) bad.push('round numbers ' + round + ' of 800');
    if (parts < 300 || parts > 500) bad.push('part ' + parts + ' of 800');
    return bad.slice(0, 4);
  });
  ok(ofq.length === 0, 'Fractions of a number Year 4: unit fractions 1/2 to 1/10; find the part or the whole; tables to 10 or round numbers, the whole at most 1,000 ' + ofq.join(' | '));
  await page.click('#backBtn');
  await page.click('#actTiles [data-act="fof"]');
  ok(await page.evaluate(() => draft.yr === 4 && draft.kinds.join() === 'part,whole,pct'), 'Fractions of a number setup: Year 4, part, whole and percent (Year 5 only, ignored)');
  await page.click('#newBtn');
  ok(await page.evaluate(() => cards.every(c => {
    const q = c.q, rects = c.el.querySelectorAll('svg rect').length, txt = [...c.el.querySelectorAll('svg text')].map(t => t.textContent);
    return c.q.kind === 'fof' && rects === q.d + 1 && c.el.querySelector('.cap .fr').textContent === '1' + q.d && txt.join() === (q.part ? `${q.whole},?` : `?,${q.k}`);
  })), 'Fractions of a number: a bar of d boxes, the whole (or ?) on the brace, ? (or the part) in the first box, the fraction above');
  ok((await fits()).length === 0, 'Fractions of a number fits ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/37-fof.png' });
  ok((await writeAllAndMark()).length === 0, 'Fractions of a number: answers written under the bar are read and marked right');
  ok(await page.evaluate(() => labelFor('fof~4|part,whole|12')) === 'Fractions of a number · Year 4 · part, whole · 12 questions', 'Fractions of a number record label');
  ok(await page.evaluate(() => cardSay(cmpQ(4, ['num']))).then(s => /^\d+, and \d+\. Which sign goes in the box\? is less than, equals, is more than\.$/.test(s)), 'More or less is read aloud with its three signs');

  // ---- Balance and Rounding, Year 4
  const bq = await page.evaluate(valSrc => {
    const bad = [], val = eval(valSrc), shapes = new Set();
    for (let i = 0; i < 800; i++) {
      const q = balQ(4), [l, r] = q.text.split(' = ');
      if ((q.text.match(/☐/g) || []).length !== 1) { bad.push('boxes ' + q.text); continue; }
      const nums = q.text.match(/\d+/g).map(Number);
      if (!Number.isInteger(q.ans) || q.ans < 1 || Math.max(q.ans, ...nums) > 9999) bad.push('size ' + q.text + ' ' + q.ans);
      if (val(l.replace('☐', q.ans)) !== val(r.replace('☐', q.ans))) bad.push('not equal ' + q.text + ' ' + q.ans);
      // exactly one answer: no other whole number from 0 to 10,000 balances it
      for (const x of [q.ans - 1, q.ans + 1, 0]) if (x >= 0 && val(l.replace('☐', x)) === val(r.replace('☐', x))) bad.push('two answers ' + q.text);
      shapes.add(/[+−×÷]/.test(l) && /[+−×÷]/.test(r) ? 'both' : 'one');
      if (q.say !== q.text.replace(/\+/g, 'plus').replace(/−/g, 'take away').replace(/×/g, 'times').replace(/÷/g, 'divided by').replace('=', 'is the same as').replace('☐', 'what') + '?') bad.push('say ' + q.say);
    }
    if (shapes.size !== 2) bad.push('shapes ' + [...shapes]);
    return bad.slice(0, 4);
  }, val);
  ok(bq.length === 0, 'Balance Year 4: one box, both sides equal with the answer, one answer only, whole numbers to 9,999, often both sides to work out ' + bq.join(' | '));
  const rdq = await page.evaluate(() => {
    const bad = [], tos = new Set();
    let half = 0;
    for (const kinds of [['line'], ['num']]) for (let i = 0; i < 600; i++) {
      const q = roundQ(4, kinds), n = +q.n, u = q.hi - q.lo, want = Math.round(n / u) * u; // Math.round: halfway goes up
      tos.add(u);
      if (q.ans !== want || q.kind !== (kinds[0] === 'line' ? 'rline' : 'rnum') || n <= q.lo || n >= q.hi || ![1, 10, 100, 1000].includes(u) || n > 9999) bad.push(JSON.stringify(q));
      if (Math.abs(q.pos - (n - q.lo) / u) > 1e-9 || q.cap !== `to the nearest ${u === 1 ? 'whole number' : u}`) bad.push('pos/cap ' + JSON.stringify(q));
      if (u === 1 && !/^\d\.\d$/.test(q.n)) bad.push('tenths ' + q.n);
      if (q.pos === 0.5) { half++; if (q.kind === 'rline') bad.push('halfway on a line ' + q.n); }
    }
    if (tos.size !== 4) bad.push('nearest ' + [...tos]);
    if (!half) bad.push('no halfway numbers in Just numbers');
    return bad.slice(0, 4);
  });
  ok(rdq.length === 0, 'Rounding Year 4: nearest 10, 100, 1,000 or whole number, right answer (halfway up), never halfway on the number line ' + rdq.join(' | '));

  await page.click('#backBtn');
  await page.click('#actTiles [data-act="bal"]');
  ok(await page.evaluate(() => draft.yr === 4 && $('#optBlock [data-key="yr"]').children.length === 5), 'Balance setup: Years 1 to 5, Year 4 chosen');
  await page.click('#newBtn');
  ok(await page.evaluate(() => cards.every(c => c.q.kind === 'bal' && c.el.querySelectorAll('.eq .bx').length === 1 && c.el.querySelectorAll('.al .bx').length === 1)), 'Balance sheet: one box in the equation, "☐ = ___" underneath');
  ok((await fits()).length === 0, 'Balance fits ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/35-bal.png' });
  ok((await writeAllAndMark()).length === 0, 'Balance: answers read and marked right');
  await page.evaluate(() => { hideDone(); buildSheet({ yr: 4, n: 6 }); });
  ok((await fits()).length === 0, 'Balance, 6 on a sheet, fits ' + (await fits()).join(' '));

  await page.click('#backBtn');
  await page.click('#actTiles [data-act="round"]');
  ok(await page.evaluate(() => draft.yr === 4 && draft.kinds.join() === 'line,num'), 'Rounding setup: Year 4, number line and just numbers');
  await page.click('#newBtn');
  ok(await page.evaluate(() => cards.every(c => c.q.kind === 'rnum' ? c.el.querySelector('.eq').textContent === c.q.n && c.el.querySelector('.cap').textContent === c.q.cap
    : [...c.el.querySelectorAll('svg text')].map(t => t.textContent).join('|') === `${c.q.n}|${c.q.lo}|${c.q.hi}`)), 'Rounding cards print the number and what to round to; the line has both ends labelled and the number on the arrow');
  ok((await fits()).length === 0, 'Rounding fits ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/36-round.png' });
  ok((await writeAllAndMark()).length === 0, 'Rounding: answers read and marked right');
  for (const k of ['line', 'num']) {
    await page.evaluate(k => { hideDone(); buildSheet({ yr: 4, kinds: [k], n: 12 }); }, k);
    ok((await fits()).length === 0, `Rounding (${k} only) fits ` + (await fits()).join(' '));
    ok((await writeAllAndMark()).length === 0, `Rounding (${k} only): read and marked right`);
  }
  // the widest: five digits on the line, and 10000 to write
  await page.evaluate(() => { buildSheet({ yr: 4, kinds: ['line'], n: 12 }); cards[0].q = { kind: 'rline', n: '9960', lo: 9900, hi: 10000, pos: 0.6, cap: 'to the nearest 100', say: 'x', ans: 10000 }; layout(cards[0]); sizeCanvas(cards[0]); });
  ok((await fits()).length === 0 && (await writeAllAndMark()).length === 0, 'Rounding: 9960 to 10000 fits and 10000 is read');
  ok(await page.evaluate(() => [labelFor('bal~4|12'), labelFor('round~4|line,num|12'), labelFor('round~4|num|6')].join(' / '))
    === 'Balance · Year 4 · 12 questions / Rounding · Year 4 · number line, just numbers · 12 questions / Rounding · Year 4 · just numbers · 6 questions', 'record labels for Balance and Rounding');

  // ---- C2a: Year 5 on True or false, More or less, Balance, Rounding
  const val5 = `s => { s = s.trim(); const f = s.match(/^(\\d+)\\/(\\d+)$/); return f ? f[1] / f[2] : Function('return ' + s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-'))(); }`;
  const t5 = await page.evaluate(src => {
    const bad = [], val = eval(src), types = new Set(), signs = new Set();
    let trues = 0;
    const dp = s => (s.match(/\.(\d+)/g) || []).every(m => m.length <= 3);
    for (let i = 0; i < 1500; i++) {
      const q = tfQ(5), [l, sign, r] = q.text.split(/ ([<=>]) /), lv = val(l), rv = val(r), d = rv - lv;
      const holds = sign === '=' ? Math.abs(d) < 1e-9 : sign === '<' ? d > 1e-9 : d < -1e-9;
      if (q.kind !== 'tap' || q.truth !== holds || q.right !== (q.truth ? 0 : 1) || q.ans !== q.tiles[q.right].label) bad.push('wrong ' + q.text);
      types.add(q.type); signs.add(sign); trues += q.truth;
      if (sign !== '=' && !['dec', 'frac'].includes(q.type)) bad.push('< or > only on decimals and fractions ' + q.text);
      if (q.text.match(/\d+(\.\d+)?/g).some(n => +n > 999999) || !dp(q.text)) bad.push('size ' + q.text);
      if (q.type === 'frac') {
        const [[a, b], [c, e]] = [l, r].map(s => s.split('/').map(Number));
        if (Math.max(b, e) % Math.min(b, e) || b === e || Math.max(b, e) > 12 || a >= b || c >= e || q.tc !== 5.2) bad.push('fractions ' + q.text);
        if (q.top.split('class="fr"').length !== 3) bad.push('printed top over bottom ' + q.top);
      }
      if (q.type === 'calc' && !q.truth) { const dd = Math.abs(d), sw = [...String(lv)].sort().join('') === [...String(rv)].sort().join(''); if (![1, 10, 100, 1000, 10000].includes(dd) && !sw) bad.push('not a near miss ' + q.text); }
      if (q.text.length > 18 && q.type !== 'frac' && !q.top.includes('<br>')) bad.push('long on one line ' + q.text);
      if (!/\. True\?$/.test(q.say) || /[\/<>=]/.test(q.say)) bad.push('say ' + q.say);
    }
    if (trues < 650 || trues > 850) bad.push('true ' + trues + ' of 1500');
    if (types.size !== 5 || signs.size !== 3) bad.push('types ' + [...types] + ' signs ' + [...signs]);
    return bad.slice(0, 4);
  }, val5);
  ok(t5.length === 0, 'True or false Year 5: six-digit sums, both sides to work out, decimals to two places (sometimes < or >), fractions with one bottom a multiple of the other; about half true ' + t5.join(' | '));
  const c5 = await page.evaluate(src => {
    const bad = [], val = eval(src), types = new Set();
    let same = 0;
    for (let i = 0; i < 1500; i++) {
      const q = cmpQ(5, ['num', 'sum', 'dec', 'frac']), lv = val(q.l), rv = val(q.r), d = rv - lv;
      if (q.right !== (d > 1e-9 ? 0 : Math.abs(d) < 1e-9 ? 1 : 2) || q.ans !== q.tiles[q.right].label) bad.push('wrong ' + q.l + ' ' + q.r);
      types.add(q.type); same += q.right === 1;
      if (q.type === 'num' && !(/^\d{6}$/.test(q.l) && /^\d{6}$/.test(q.r))) bad.push('six digits ' + q.l + ' ' + q.r);
      if (q.type === 'dec' && !(/^\d\.\d\d?$/.test(q.l) && /^\d\.\d\d?$/.test(q.r))) bad.push('decimals ' + q.l + ' ' + q.r);
      if (q.type !== 'num' && q.l === q.r) bad.push('both sides print the same ' + q.l);
      if (q.type === 'frac') { const b = +q.l.split('/')[1], e = +q.r.split('/')[1]; if (Math.max(b, e) % Math.min(b, e) || b === e) bad.push('bottoms ' + q.l + ' ' + q.r); }
      if (!/^.+, and .+\. Which sign goes in the box\?$/.test(q.say) || /\//.test(q.say)) bad.push('say ' + q.say);
    }
    if (types.size !== 4) bad.push('types ' + [...types]);
    if (same < 180 || same > 450) bad.push('equal ' + same + ' of 1500');
    if (cmpQ(5, ['dots']).type !== 'num' || cmpQ(4, ['dec']).l.includes('.')) bad.push('kinds a year does not have');
    return bad.slice(0, 4);
  }, val5);
  ok(c5.length === 0, 'More or less Year 5: six digits, both sides to work out, decimals (0.12 and 0.2, 0.5 and 0.50), fractions with one bottom a multiple of the other; about one in five equal ' + c5.join(' | '));
  const b5 = await page.evaluate(valSrc => {
    const bad = [], val = eval(valSrc), types = new Set();
    for (let i = 0; i < 1000; i++) {
      const q = balQ(5), [l, r] = q.text.split(' = ');
      if ((q.text.match(/☐/g) || []).length !== 1) { bad.push('boxes ' + q.text); continue; }
      const nums = q.text.match(/\d+/g).map(Number);
      if (!Number.isInteger(q.ans) || q.ans < 1 || Math.max(q.ans, ...nums) > 999999) bad.push('size ' + q.text + ' ' + q.ans);
      if (val(l.replace('☐', q.ans)) !== val(r.replace('☐', q.ans))) bad.push('not equal ' + q.text + ' ' + q.ans);
      for (const x of [q.ans - 1, q.ans + 1, 0]) if (x >= 0 && val(l.replace('☐', x)) === val(r.replace('☐', x))) bad.push('two answers ' + q.text);
      if (Math.max(q.ans, ...nums) >= 100000) types.add('six digits');
      if (/[×÷]/.test(q.text)) types.add('times');
      if (/[+−×÷].* = .*[+−×÷]/.test(q.text)) types.add('both');
    }
    if (types.size !== 3) bad.push('types ' + [...types]);
    return bad.slice(0, 4);
  }, val);
  ok(b5.length === 0, 'Balance Year 5: one box, one answer, whole numbers to 999,999: six-digit place changes, × and ÷ by 10, 100, 1000, both sides to work out ' + b5.join(' | '));
  const r5 = await page.evaluate(() => {
    const bad = [], tos = new Set();
    for (const kinds of [['line'], ['num']]) for (let i = 0; i < 800; i++) {
      const q = roundQ(5, kinds), n = +q.n.replace('$', ''), u = q.hi - q.lo, want = Math.round(n / u + 1e-9) * u;
      tos.add(q.n[0] === '$' ? '$' : u > 1 ? u : q.n.split('.')[1].length === 2 ? 'h' : 't');
      if (q.ans !== want || q.kind !== (kinds[0] === 'line' ? 'rline' : 'rnum') || n <= q.lo || n >= q.hi || q.ans > 999999) bad.push(JSON.stringify(q));
      if (Math.abs(q.pos - (n - q.lo) / u) > 1e-9) bad.push('pos ' + JSON.stringify(q));
      if (q.n[0] === '$' ? q.pre !== '$' || q.cap !== 'to the nearest dollar' || !/^\$\d+\.\d\d$/.test(q.n) : q.pre) bad.push('dollars ' + JSON.stringify(q));
      if (u > 1 && (n < 100000 || q.cap !== `to the nearest ${u}`)) bad.push('six digits ' + JSON.stringify(q));
      if (q.kind === 'rline' && q.pos === 0.5) bad.push('halfway on a line ' + q.n);
    }
    if (tos.size !== 6) bad.push('kinds ' + [...tos]);
    return bad.slice(0, 4);
  });
  ok(r5.length === 0, 'Rounding Year 5: six digits to the nearest 1,000, 10,000, 100,000; tenths and hundredths to the whole; dollars to the nearest dollar ' + r5.join(' | '));
  for (const [a, c, shot] of [['tf', { yr: 5, n: 12 }, '50-tf5'], ['cmp', { yr: 5, kinds: ['num', 'sum', 'dec', 'frac'], n: 12 }, '51-cmp5'], ['bal', { yr: 5, n: 12 }, '52-bal5'], ['round', { yr: 5, kinds: ['line', 'num'], n: 12 }, '53-round5']]) {
    await page.evaluate((a, c) => { hideDone(); act = a; buildSheet(c); show('sheet'); }, a, c);
    ok((await fits()).length === 0, `${a} Year 5 fits ` + (await fits()).join(' '));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${shot}.png` });
    const w = await writeAllAndMark();
    ok(w.length === 0, `${a} Year 5: read and marked right ` + w.join(' | '));
  }
  // the widest cards: a long balance on two lines, a six-digit rounding line, dollars on both kinds
  await page.evaluate(() => {
    hideDone(); act = 'bal'; buildSheet({ yr: 5, n: 6 });
    cards[0].q = { kind: 'bal', yr: 5, text: '45000 + 27000 = ☐ + 30000', ans: 42000, say: 'x' };
    cards[1].q = { kind: 'rline', yr: 5, n: '949999', lo: 900000, hi: 1000000, pos: 0.49999, cap: 'to the nearest 100000', say: 'x', ans: 900000 };
    cards[2].q = { kind: 'rline', yr: 5, n: '$48.65', lo: 48, hi: 49, pos: 0.65, cap: 'to the nearest dollar', pre: '$', say: 'x', ans: 49 };
    cards[3].q = { kind: 'rnum', yr: 5, n: '$48.65', lo: 48, hi: 49, pos: 0.65, cap: 'to the nearest dollar', pre: '$', say: 'x', ans: 49 };
    for (const c of cards.slice(0, 4)) { layout(c); sizeCanvas(c); }
  });
  ok(await page.evaluate(() => cards[0].el.querySelector('.eq br') !== null && cards[0].el.querySelectorAll('.eq .bx').length === 1 && [...cards[2].el.querySelectorAll('svg text')].map(t => t.textContent).join('|') === '$48.65|$48|$49' && cards[3].el.querySelector('.al').textContent.startsWith('$')), 'Year 5: a long balance breaks after "=", dollars label the line ends, "$" before the line');
  ok((await fits()).length === 0 && (await writeAllAndMark()).length === 0, 'Year 5 widest cards fit and are read ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/54-year5-wide.png' });
  ok(await page.evaluate(() => [ACTS.cmp.key({ yr: 5, kinds: ['dots', 'num', 'dec'], n: 12 }), ACTS.cmp.key({ yr: 4, kinds: ['num', 'dec'], n: 12 }), labelFor('cmp~5|num,sum,dec,frac|12'), labelFor('tf~5|12'), labelFor('bal~5|6'), labelFor('round~5|line,num|12')].join(' / '))
    === 'cmp~5|num,dec|12 / cmp~4|num|12 / More or less · Year 5 · numbers, sums, decimals, fractions · 12 questions / True or false · Year 5 · 12 questions / Balance · Year 5 · 6 questions / Rounding · Year 5 · number line, just numbers · 12 questions', 'Year 5 record keys and labels');
  await page.evaluate(() => hideDone());

  // ---- C2b: Year 5 on Decimals, Fractions (Add different), Fractions of a number, Money
  const d5 = await page.evaluate(() => {
    const bad = [], forms = {}, H = s => Math.round(+s * 100);
    let mixed = 0, adds = 0, link = 0, pics = 0, two = 0;
    for (const kind of ['pic', 'line', 'addsub', 'ten']) for (let i = 0; i < 500; i++) {
      const q = decQ(5, [kind]), f = q.form || 'whole';
      forms[kind + ':' + f] = 1;
      if (q.kind === 'dec') {
        const v = q.v;
        if (!q.two || q.dp !== 2 || q.parts[0] !== Math.floor(v / 100) || q.parts[1] !== v % 100 || v % 100 === 0 || H(q.ans) !== v || /\.\d*0$/.test(q.ans)) bad.push('parts ' + JSON.stringify(q));
        if (f === 'grid' && (v < 1 || v > 199)) bad.push('grid ' + v);
        if (f === 'hline' && (v <= q.lo || v >= q.lo + 10 || q.lo % 10 || q.lo > 190)) bad.push('hline ' + JSON.stringify(q));
        if (f === 'frac' && (q.n * 100 / q.d !== v || (q.d === 100 && q.n % 10 === 0))) bad.push('frac ' + JSON.stringify(q));
        if (kind === 'pic') { pics++; if (f === 'frac') link++; }
        if (v % 10) two++;
      }
      if (f === 'expr' || f === 'whole') {
        const [a, op, b] = q.text.split(' '), got = q.kind === 'dec' ? q.v : q.ans * 100;
        if (/\.\d*0\b/.test(q.text)) bad.push('trailing zero ' + q.text);
        const want = op === '+' ? H(a) + H(b) : op === '−' ? H(a) - H(b) : op === '÷' ? H(a) / +b : H(a) * +b;
        if (want !== got || got <= 0) bad.push('sum ' + q.text + ' ' + q.ans);
        if (op === '÷' && (+a % 10 === 0 || ![10, 100].includes(+b))) bad.push('div ' + q.text);
        if (op === '×' && (H(a) % 100 === 0 || ![10, 100].includes(+b) || (got % 100 === 0) !== (q.kind === 'expr'))) bad.push('times ' + q.text);
        if (kind === 'addsub') { adds++; if ([a, b].some(x => /^\d+\.\d$/.test(x))) mixed++; if ([a, b].some(x => !x.includes('.'))) bad.push('a whole in a sum ' + q.text); }
      }
    }
    if (mixed / adds < 0.2 || mixed / adds > 0.55) bad.push('a tenth with a hundredth ' + mixed + '/' + adds);
    if (link / pics < 0.15 || link / pics > 0.35) bad.push('fraction link ' + link + '/' + pics);
    if (Object.keys(forms).sort().join() !== 'addsub:expr,line:hline,pic:frac,pic:grid,ten:expr,ten:whole') bad.push('forms ' + Object.keys(forms));
    if (decQ(4, ['pic']).dp !== 1) bad.push('Year 4 changed');
    return bad.slice(0, 4);
  });
  ok(d5.length === 0, 'Decimals Year 5: hundred squares to 1.99, a tenth cut into hundredths, 1/4 3/4 1/2 n/100, + and − to two places (some a tenth with a hundredth), × ÷ 10 and 100; never a whole answer in two blanks ' + d5.join(' | '));
  for (const [k, shot] of [[['pic'], '55-dec5-pic'], [['line'], '55-dec5-line'], [['addsub', 'ten'], '55-dec5-sums']]) {
    await page.evaluate(k => { hideDone(); act = 'dec'; buildSheet({ yr: 5, kinds: k, n: 12 }); show('sheet'); }, k);
    ok((await fits()).length === 0, `Decimals Year 5 (${k}) fits ` + (await fits()).join(' '));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${shot}.png` });
    const w = await writeAllAndMark();
    ok(w.length === 0, `Decimals Year 5 (${k}): read and marked right ` + w.join(' | '));
  }
  ok(await page.evaluate(() => { hideDone(); buildSheet({ yr: 5, kinds: ['line'], n: 6 }); const c = cards[0]; c.q = hTwo(127, { form: 'hline', lo: 120 }); layout(c); sizeCanvas(c); return [...c.el.querySelectorAll('svg text')].map(t => t.textContent).join('|') === '1.2|1.3' && c.el.querySelectorAll('svg line').length === 12; }), 'Decimals Year 5 line: 1.2 to 1.3 in ten steps, both ends labelled');
  const dr5 = await page.evaluate(() => {
    const c = cards[0], out = {};
    const at = (v, w) => { c.q = hTwo(v, { form: 'grid' }); layout(c); sizeCanvas(c); writeNum(c, w); return readAnswer(c); };
    let r = at(105, ['1', '05']); out.plain = r.ok && r.text === '1.05';
    out.places = !at(105, ['1', '5']).ok;    // 1.5 is not 1.05
    out.tenth = at(130, ['1', '3']).ok;       // 1.3 for 1.30
    out.trailing = at(130, ['1', '30']).ok;
    out.noZero = at(47, ['', '47']).ok;       // ".47"
    out.wrong = !at(47, ['0', '74']).ok;
    return out;
  });
  ok(Object.values(dr5).every(Boolean), 'Decimals Year 5 reading: 1.05 must be 05 after the point, 1.3 and 1.30 both right, .47 right ' + JSON.stringify(dr5));
  ok(await page.evaluate(() => [labelFor('dec~5|pic,line,addsub,ten|12'), labelFor('dec~4|ten|6'), cardSay(decQ(5, ['addsub']))].join(' / ')).then(s => /^Decimals · Year 5 · picture, number line, \+ −, × ÷ 10, 100 · 12 questions \/ Decimals · Year 4 · × ÷ 10 · 6 questions \/ \d+(\.\d+)? (plus|take away) \d+(\.\d+)?$/.test(s)), 'Decimals Year 5 label and read aloud');

  const fdq = await page.evaluate(() => {
    const bad = [];
    let minus = 0, past = 0, bigFirst = 0;
    for (let i = 0; i < 800; i++) {
      const q = fracQ({ kinds: ['diff'], parts: [2, 3, 4, 5, 6, 8, 10, 12] }), [d1, d2] = q.ds, D = Math.max(d1, d2), d = Math.min(d1, d2);
      if (q.form !== 'add' || !q.diff || D % d || D === d || q.d !== D || q.terms.length !== 2 || q.terms.some((t, k) => t < 1 || t >= q.ds[k])) { bad.push('shape ' + JSON.stringify(q)); continue; }
      const [x, y] = q.terms.map((t, k) => t * D / q.ds[k]), n = q.op === '+' ? x + y : x - y;
      if (n !== q.n || n <= 0 || n % D === 0 || q.ans !== `${n}/${D}`) bad.push('sum ' + JSON.stringify(q));
      if (q.say !== `${q.terms[0]} over ${q.ds[0]} ${q.op === '+' ? 'plus' : 'take away'} ${q.terms[1]} over ${q.ds[1]}`) bad.push('say ' + q.say);
      minus += q.op === '−'; past += n > D; bigFirst += d1 > d2;
    }
    if (minus < 180 || minus > 350) bad.push('take away ' + minus + ' of 800');
    if (!past || !bigFirst) bad.push('never past one whole, or never the bigger bottom first');
    for (let i = 0; i < 100; i++) { const q = fracQ({ kinds: ['diff'], parts: [2, 4] }); if (q.ds.some(v => ![2, 4].includes(v))) bad.push('parts ignored ' + q.ds); }
    return bad.slice(0, 4);
  });
  ok(fdq.length === 0, 'Fractions Add different: one bottom a multiple of the other, the answer in the bigger, sometimes past one whole, a third take away, never whole; keeps to the chosen parts ' + fdq.join(' | '));
  await page.evaluate(() => { hideDone(); act = 'frac'; buildSheet({ kinds: ['diff'], parts: [2, 3, 4, 5, 6, 8, 10, 12], n: 12 }); show('sheet'); });
  ok(await page.evaluate(() => cards.every(c => [...c.el.querySelectorAll('.ft')].every((ft, k) => {
    const d = c.q.ds[k], rects = ft.querySelectorAll('svg rect').length, lines = ft.querySelectorAll('svg line').length;
    return rects === c.q.d + 1 && lines === (d === c.q.d ? 0 : d - 1) && ft.querySelector('.fr').textContent === `${c.q.terms[k]}${d}`;
  }))), 'Add different: both pictures cut into the bigger bottom number, the smaller one\'s parts in thicker lines, each fraction printed under its picture');
  ok((await fits()).length === 0, 'Add different fits ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/56-frac-diff.png' });
  ok((await writeAllAndMark()).length === 0, 'Add different: answers read and marked right');
  ok(await page.evaluate(() => { const c = cards[0]; c.q = { ...c.q, n: 7, d: 9, ans: '7/9' }; writeNum(c, '14/18'); return readAnswer(c).ok; }), 'Add different: an equal fraction counts (14/18 for 7/9)');
  ok(await page.evaluate(() => [ACTS.frac.key({ kinds: ['add', 'diff'], parts: [3, 9], n: 12 }), labelFor('frac~add,diff|3,9|12')].join(' / ')) === 'frac~add,diff|3,9|12 / Fractions · + −, add different · 3, 9 parts · 12 questions', 'Add different record key and label');

  const f5 = await page.evaluate(() => {
    const bad = [], types = {};
    for (let i = 0; i < 1500; i++) {
      const q = fofQ(5, ['part', 'whole', 'pct']), t = q.pct ? 'pct' : q.part ? 'part' : 'whole';
      types[t] = (types[t] || 0) + 1;
      if (q.whole !== q.k * q.d || q.whole > 1000 || q.k < 1 || (q.d >= 6 && q.k >= 100)) bad.push('size ' + JSON.stringify(q));
      if (q.pct) {
        if (q.d !== 100 / q.pct || ![10, 25, 50].includes(q.pct) || q.n !== 1 || (q.pct === 10 && !q.part)) bad.push('pct ' + JSON.stringify(q));
        if (q.ans !== (q.part ? q.k : q.whole) || !(q.part ? /^What is \d+ percent of \d+\?$/ : /^\d+ percent of a set is \d+\. How many in the set\?$/).test(q.say)) bad.push('pct say ' + q.say);
      } else {
        if (q.n < 2 || q.n >= q.d || q.d < 3 || q.d > 10 || range(2, q.n).some(f => q.n % f === 0 && q.d % f === 0)) bad.push('non-unit, lowest terms ' + JSON.stringify(q));
        if (q.ans !== (q.part ? q.n * q.k : q.whole) || !(q.part ? /^What is \d \w+s of \d+\?$/ : /^\d \w+s of a set is \d+\. How many in the set\?$/).test(q.say)) bad.push('say ' + q.say);
      }
    }
    if (Object.keys(types).length !== 3 || Object.values(types).some(v => v < 350)) bad.push('kinds ' + JSON.stringify(types));
    if (range(0, 50).some(() => fofQ(4, ['part', 'pct']).pct || fofQ(4, ['pct']).pct)) bad.push('percent in Year 4');
    return bad.slice(0, 4);
  });
  ok(f5.length === 0, 'Fractions of a number Year 5: non-unit fractions (part or whole), percent 10% 25% 50% (the whole from 25% or 50%); Year 4 never has percent ' + f5.join(' | '));
  await page.evaluate(() => { hideDone(); act = 'fof'; buildSheet({ yr: 5, kinds: ['part', 'whole', 'pct'], n: 12 }); show('sheet'); });
  ok(await page.evaluate(() => cards.every(c => {
    const q = c.q, txt = [...c.el.querySelectorAll('svg text')].map(t => t.textContent).join(), cap = c.el.querySelector('.cap');
    if (q.pct) return cap.textContent === (q.part ? `${q.pct}% of ${q.whole}` : `${q.pct}% of the set is ${q.k}`) && txt === (q.part ? `${q.whole},?` : `?,${q.k}`) && c.el.querySelectorAll('svg rect').length === q.d + 1;
    return cap.querySelector('.fr').textContent === `${q.n}${q.d}` && txt === (q.part ? `${q.whole},?` : `?,${q.n * q.k}`) && c.el.querySelectorAll('svg path').length === 2;
  })), 'Fractions of a number Year 5: the fraction (or percent) above; a second brace under the first n boxes holds ? or the part');
  ok((await fits()).length === 0, 'Fractions of a number Year 5 fits ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/57-fof5.png' });
  ok((await writeAllAndMark()).length === 0, 'Fractions of a number Year 5: read and marked right');
  ok(await page.evaluate(() => [ACTS.fof.key({ yr: 4, kinds: ['part', 'whole', 'pct'], n: 12 }), ACTS.fof.key({ yr: 4, kinds: ['pct'], n: 12 }), ACTS.fof.key({ yr: 5, kinds: ['part', 'whole', 'pct'], n: 12 }), labelFor('fof~5|part,whole,pct|12')].join(' / '))
    === 'fof~4|part,whole|12 / fof~4|part,whole|12 / fof~5|part,whole,pct|12 / Fractions of a number · Year 5 · part, whole, percent · 12 questions', 'Fractions of a number keys: percent only in Year 5; label');

  const m5 = await page.evaluate(() => {
    const bad = [];
    let totals = 0, changes = 0, counts = 0;
    for (let i = 0; i < 600; i++) {
      const q = ACTS.money.make({ yr: 5, kinds: ['count', 'change', 'make', 'coin'] });
      if (q.kind !== 'money' || q.unit !== '$.' || !q.two || q.dp !== 2) { bad.push('form ' + JSON.stringify(q)); continue; }
      const v = q.change ? (q.total ? q.price : q.pay - q.price) : sumOf(q.items);
      if (q.parts[0] !== Math.floor(v / 100) || q.parts[1] !== v % 100 || v % 100 === 0 || q.ans !== `$${Math.floor(v / 100)}.${String(v % 100).padStart(2, '0')}`) bad.push('parts ' + JSON.stringify(q));
      if (q.change) {
        if (q.ctags.length < 2 || q.ctags.length > 3 || new Set(q.ctags).size !== q.ctags.length || q.ctags.some(c => c < 101 || c > 1999 || c % 100 === 0) || q.price !== sumOf(q.ctags) || q.price >= 5000) bad.push('tags ' + JSON.stringify(q));
        if (!q.total && q.pay !== [1000, 2000, 5000].find(n => n > q.price)) bad.push('pay ' + JSON.stringify(q));
        q.total ? totals++ : changes++;
      } else counts++;
    }
    if (!totals || !changes || !counts) bad.push(`totals ${totals} changes ${changes} counts ${counts}`);
    return bad.slice(0, 4);
  });
  ok(m5.length === 0, 'Money Year 5: prices like $3.45, the total of two or three, or change from the next note up; How much? written $ __ . __; no Make it or Which coin? ' + m5.join(' | '));
  await page.evaluate(() => { hideDone(); act = 'money'; buildSheet({ yr: 5, kinds: ['count', 'change'], n: 12 }); show('sheet'); });
  ok(await page.evaluate(() => cards.every(c => c.el.querySelector('.ans').textContent.replace(/\s/g, '') === '$.' && c.el.querySelectorAll('.ans .ln').length === 2 && (!c.q.ctags || [...c.el.querySelectorAll('svg text')].slice(0, c.q.ctags.length).map(t => t.textContent).join() === c.q.ctags.map(v => '$' + hund(v)).join()))), 'Money Year 5 cards: "$ __ . __", price tags with a point');
  ok((await fits()).length === 0, 'Money Year 5 fits ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/58-money5.png' });
  ok((await writeAllAndMark()).length === 0, 'Money Year 5: read and marked right');
  const mr5 = await page.evaluate(() => {
    const c = cards[0], out = {};
    c.q = moneyQ({ change: true, ctags: [345, 260], price: 605, total: true, unit: '$.' }, 605); layout(c); sizeCanvas(c);
    writeNum(c, ['6', '05']); let r = readAnswer(c); out.right = r.ok && r.text === '$6.05';
    writeNum(c, ['6', '5']); out.places = !readAnswer(c).ok;
    // "$" written before, all on one side with her own point
    c.strokes = [...numStrokes('6', -2.2, -1.05, 0.85), [[-2.0, -0.12], [-2.02, -0.1]], ...numStrokes('05', -0.4, -1.05, 0.85)]; draw(c);
    out.ownPoint = readAnswer(c).ok;
    out.say = cardSay(c.q) === 'You buy things that cost 3 dollars and 45 cents, 2 dollars and 60 cents. How much altogether?';
    return out;
  });
  ok(Object.values(mr5).every(Boolean), 'Money Year 5 reading and read aloud ' + JSON.stringify(mr5));
  ok(await page.evaluate(() => [ACTS.money.key({ yr: 5, kinds: ['count', 'change', 'coin', 'make'], n: 12 }), labelFor('money~5|count,change|12')].join(' / ')) === 'money~5|count,change|12 / Money · Year 5 · how much, change · 12 questions', 'Money Year 5 key and label');
  await page.evaluate(() => hideDone());

  // ---- B2: Year 1 on True or false, More or less, Balance, and Clocks Match
  const t1 = await page.evaluate(valSrc => {
    const bad = [], val = eval(valSrc), shapes = new Set();
    let trues = 0, dots = 0;
    for (let i = 0; i < 600; i++) {
      const q = tfQ(1), [l, r] = q.text.split(' = '), lv = val(l), rv = val(r);
      if (q.kind !== 'tap' || q.truth !== (lv === rv) || q.right !== (q.truth ? 0 : 1) || q.ans !== q.tiles[q.right].label) bad.push('wrong ' + q.text);
      if (q.text.match(/\d+/g).some(n => +n > 9 && +n !== 10) || Math.min(lv, rv) < 1 || Math.max(lv, rv) > 10) bad.push('size ' + q.text);
      if (/[×÷]/.test(q.text)) bad.push('sign ' + q.text);
      if (!q.truth && Math.abs(lv - rv) !== 1) bad.push('not out by 1 ' + q.text);
      if (q.say !== signWords(q.text) + '. True?') bad.push('say ' + q.say);
      shapes.add(/[+−]/.test(l) && /[+−]/.test(r) ? 'both' : /[+−]/.test(l) ? 'left' : 'right');
      trues += q.truth; dots += q.dots;
      if (q.dots) { // each side over its dots: as many dots as its numbers, the take-away ones crossed out
        const d = new DOMParser().parseFromString(`<div>${q.top}</div>`, 'text/html'), cols = [...d.querySelectorAll('.tfc')];
        const want = s => { const m = s.match(/\d+/g).map(Number); return s.includes('+') ? [m[0] + m[1], 0] : s.includes('−') ? [m[0], m[1]] : [m[0], 0]; };
        cols.forEach((c, j) => { const [n, x] = want([l, r][j]); if (c.querySelectorAll('circle').length !== n || c.querySelectorAll('path').length !== x) bad.push('dots ' + q.text); });
        if (cols.length !== 2) bad.push('columns ' + q.text);
      }
    }
    if (trues < 240 || trues > 360) bad.push('true ' + trues);
    if (dots < 240 || dots > 360) bad.push('dots ' + dots);
    if (shapes.size !== 3) bad.push('shapes ' + [...shapes]);
    return bad.slice(0, 4);
  }, val);
  ok(t1.length === 0, 'True or false Year 1: one-digit + and − within 10, sometimes both sides or the sum on the right; wrong ones out by 1; dots (pairs, take-aways crossed out) on about half ' + t1.join(' | '));
  const c1 = await page.evaluate(() => {
    const bad = [];
    let same = 0, near = 0;
    for (const kinds of [['dots'], ['num']]) for (let i = 0; i < 500; i++) {
      const q = cmpQ(1, kinds), a = +q.l, b = +q.r, top = kinds[0] === 'dots' ? 10 : 20;
      const want = a === b ? 1 : (a > b) === q.more ? 0 : 2;
      if (q.right !== want || q.ans !== q.tiles[want].label || q.tiles[1].label !== 'same' || q.tiles.length !== 3) bad.push('wrong ' + JSON.stringify(q));
      if (a < 1 || b < 1 || Math.max(a, b) > top) bad.push('size ' + a + ' ' + b);
      if (/[<>]|&lt;|&gt;/.test(q.top + q.tiles.map(t => t.html.replace(/<[^>]*>/g, '')).join(''))) bad.push('signs ' + q.top);
      if (q.form !== (kinds[0] === 'dots' ? 'heaps' : 'nums') || !q.quiet || cardSay(q) !== q.say) bad.push('form/say ' + q.say);
      if (q.form === 'heaps') {
        const n = h => (h.match(/<circle/g) || []).length;
        if (n(q.tiles[0].html) !== a || n(q.tiles[2].html) !== b || q.tiles[0].say !== 'this one') bad.push('heaps ' + a + ' ' + b);
        if (!/^Which has (more|fewer) dots\? Or are they the same\?$/.test(q.say)) bad.push('say ' + q.say);
      } else if (q.say !== `Which is ${q.more ? 'more' : 'less'}, ${a} or ${b}? Or are they the same?` || q.tiles[0].html !== q.l) bad.push('say ' + q.say);
      same += a === b; near += a !== b && Math.abs(a - b) <= 3;
    }
    if (same < 120 || same > 280) bad.push('same ' + same + ' of 1000');
    if (near < 400) bad.push('close ones ' + near);
    return bad.slice(0, 4);
  });
  ok(c1.length === 0, 'More or less Year 1: two heaps (1–10) or numbers (to 20), more or fewer, tiles left / same / right, no signs, about one in five the same, read aloud without giving the count ' + c1.join(' | '));
  const b1 = await page.evaluate(valSrc => {
    const bad = [], val = eval(valSrc);
    for (let i = 0; i < 600; i++) {
      const q = balQ(1), [l, r] = q.text.split(' = ');
      const nums = q.text.match(/\d+/g).map(Number);
      if ((q.text.match(/☐/g) || []).length !== 1 || !q.saw) bad.push('box ' + q.text);
      if (nums.concat(q.ans).some(n => n < 1 || n > 9) || /[×÷]/.test(q.text) || !/[+−]/.test(l) || !/[+−]/.test(r)) bad.push('size ' + q.text);
      const lv = val(l.replace('☐', q.ans)), rv = val(r.replace('☐', q.ans));
      if (lv !== rv || lv < 2 || lv > 10) bad.push('not equal ' + q.text + ' ' + q.ans);
      for (const x of [q.ans - 1, q.ans + 1]) if (val(l.replace('☐', x)) === val(r.replace('☐', x))) bad.push('two answers ' + q.text);
      if (q.say !== signWords(q.text).replace('equals', 'is the same as').replace('☐', 'what') + '?') bad.push('say ' + q.say);
    }
    return bad.slice(0, 4);
  }, val);
  ok(b1.length === 0, 'Balance Year 1: one-digit + and − on both sides (2 to 10), one box, one answer, read aloud ' + b1.join(' | '));
  const m1 = await page.evaluate(() => {
    const bad = [];
    for (let i = 0; i < 400; i++) {
      const q = ACTS.clock.make({ yr: 1, kinds: ['match'], n: 6 }), labels = q.tiles.map(t => t.label), hs = labels.map(s => +s.split(':')[0]);
      const wrap = k => (k + 11) % 12 + 1, ok_ = hs.filter(h => h !== q.h).every(h => h === 12 || h === wrap(q.h - 1) || h === wrap(q.h + 1));
      if (q.form !== 'match' || q.m !== 0 || new Set(labels).size !== 3 || labels[q.right] !== `${q.h}:00` || !ok_ || (q.h !== 12 && !hs.includes(12))) bad.push(JSON.stringify(labels) + ' ' + q.h);
      if (!labels.every(s => /^\d{1,2}:00$/.test(s)) || q.tiles[q.right].say !== `${q.h} o'clock`) bad.push('tiles ' + labels);
    }
    for (let i = 0; i < 50; i++) { if (ACTS.clock.make({ yr: 3, kinds: ['match'], n: 6 }).kind !== 'clock') bad.push('match in Year 3'); }
    return bad.slice(0, 4);
  });
  ok(m1.length === 0, 'Clocks Match Year 1: a face on the hour, three digital clocks (the time, an hour either side, 12:00); no Match in Year 3 ' + m1.join(' | '));
  ok(await page.evaluate(() => [ACTS.tf.defaults(5).yr, ACTS.cmp.defaults(5).yr, ACTS.cmp.defaults(5).kinds.join(), ACTS.bal.defaults(5).yr, ACTS.clock.defaults(5).kinds.join()].join(' / ')) === '1 / 1 / dots,num / 1 / face,match', 'the younger tiles default to Year 1 (More or less: dots and numbers; Clocks: clock and match)');

  // Year 1 sheets
  await page.evaluate(() => { setYear(1); act = 'tf'; hideDone(); buildSheet({ yr: 1, n: 6 }); show('sheet'); });
  ok(await page.evaluate(() => cards.every(c => c.q.kind === 'tap' && c.el.querySelectorAll('.tt').length === 2) && cards.some(c => c.el.querySelector('.tfd svg'))), 'True or false Year 1 sheet: tick and cross, dots under the sides on some cards');
  ok((await fits()).length === 0, 'True or false Year 1 fits ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/42-tf-y1.png' });
  ok((await writeAllAndMark()).length === 0 && await page.evaluate(() => sheetDone && loadRec(current).history[0].k === 'tf~1|6'), 'True or false Year 1: tapped right, finished, record tf~1|6');
  await wait(800);
  ok(await visible('#doneS') && await page.$eval('#dUp', b => !b.hidden && b.textContent === 'Harder: Year 2'), 'finish panel: Harder goes to the next year it has (Year 1 → Year 2)');
  await page.evaluate(() => { hideDone(); act = 'cmp'; buildSheet({ yr: 1, kinds: ['dots', 'num'], n: 6 }); show('sheet'); });
  ok(await page.evaluate(() => cards.every(c => c.el.querySelectorAll('.tt').length === 3 && c.el.querySelectorAll('.tt')[1].textContent === 'same')), 'More or less Year 1 sheet: three tiles, "same" in the middle');
  ok((await fits()).length === 0, 'More or less Year 1 fits ' + (await fits()).join(' '));
  for (const k of ['dots', 'num']) {
    await page.evaluate(k => { hideDone(); buildSheet({ yr: 1, kinds: [k], n: 12 }); }, k);
    ok((await fits()).length === 0, `More or less Year 1 (${k} only, 12) fits ` + (await fits()).join(' '));
  }
  ok(await page.evaluate(() => cards.every(c => c.el.querySelector('.tt').getBoundingClientRect().width >= 40)), 'More or less Year 1: the tiles are big enough to tap');
  await page.evaluate(() => { buildSheet({ yr: 1, kinds: ['dots'], n: 6 }); });
  if (SHOTS) await page.screenshot({ path: SHOTS + '/43-cmp-y1.png' });
  await page.click('#sheet .card:nth-child(1) .cardsay');
  ok((await said()).slice(-1)[0] === await page.evaluate(() => cards[0].q.say), 'ages 4–6: the card speaker asks the question without reading the heaps out');
  await page.tap('#sheet .card:nth-child(1) .tt[data-i="0"]');
  ok((await said()).slice(-1)[0] === 'this one', 'a tapped heap says "this one", not how many');
  ok((await writeAllAndMark()).length === 0, 'More or less Year 1: the right tiles are marked right');
  await page.evaluate(() => { hideDone(); act = 'bal'; buildSheet({ yr: 1, n: 6 }); show('sheet'); });
  ok(await page.evaluate(() => cards.every(c => c.el.querySelector('.eq + svg.saw') && c.el.querySelectorAll('.al .bx').length === 1)), 'Balance Year 1: a see-saw under the equation, then "☐ = ___"');
  ok((await fits()).length === 0, 'Balance Year 1 fits ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/44-bal-y1.png' });
  ok((await writeAllAndMark()).length === 0, 'Balance Year 1: answers read and marked right');
  await page.evaluate(() => { hideDone(); act = 'clock'; buildSheet({ yr: 1, kinds: ['face', 'match'], n: 12 }); show('sheet'); });
  ok(await page.evaluate(() => cards.some(c => c.q.kind === 'tap') && cards.some(c => c.q.kind === 'clock') && cards.filter(c => c.q.kind === 'tap').every(c => c.el.querySelectorAll('.tq svg text').length === 12 && c.el.querySelectorAll('.tt .dig').length === 3)), 'Clocks Year 1 with Match: written cards and match cards (a face, three digital clocks)');
  ok((await fits()).length === 0, 'Clocks Year 1 with Match fits ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/45-clock-match.png' });
  ok((await writeAllAndMark()).length === 0, 'Clocks Year 1 with Match: read and marked right');
  await page.evaluate(() => { setYear(4); hideDone(); });
  ok(await page.evaluate(() => [ACTS.clock.key({ yr: 1, kinds: ['face', 'match'], n: 6 }), ACTS.clock.key({ yr: 3, kinds: ['face', 'words', 'match'], n: 12 }), ACTS.cmp.key({ yr: 1, kinds: ['dots', 'num', 'sum'], n: 6 }), ACTS.cmp.key({ yr: 4, kinds: ['dots', 'num', 'sum', 'frac'], n: 12 }),
    labelFor('clock~1|face,match|6'), labelFor('cmp~1|dots,num|6'), labelFor('tf~1|6'), labelFor('bal~1|6')].join(' / '))
    === 'clock~1|face,match|6 / clock~3|face,words|12 / cmp~1|dots,num|6 / cmp~4|num,sum,frac|12 / Clocks · Year 1 · clock, match · 6 questions / More or less · Year 1 · dots, numbers · 6 questions / True or false · Year 1 · 6 questions / Balance · Year 1 · 6 questions',
    'record keys keep only the kinds that year has; labels for the Year 1 sheets');

  // ---- D1a: Year 2 on Clocks, True or false, More or less, Balance
  const d1 = await page.evaluate(valSrc => {
    const bad = [], val = eval(valSrc), seen = new Set();
    let trues = 0, cmps = 0, same = 0;
    for (let i = 0; i < 600; i++) { // True or false
      const q = tfQ(2), [l, s, r] = q.text.split(/ ([<=>]) /), lv = val(l), rv = val(r);
      const truth = s === '<' ? lv < rv : s === '>' ? lv > rv : lv === rv;
      if (q.kind !== 'tap' || q.yr !== 2 || q.truth !== truth || q.right !== (truth ? 0 : 1) || q.ans !== q.tiles[q.right].label) bad.push('tf wrong ' + q.text);
      if (q.type === 'cmp') {
        cmps++;
        if (lv === rv || Math.max(lv, rv) > 120 || Math.min(lv, rv) < 1 || /[+−×÷]/.test(q.text) || q.say !== `${l} ${s === '<' ? 'is less than' : 'is more than'} ${r}. True?`) bad.push('tf cmp ' + q.text + ' / ' + q.say);
        if (String(lv).length === 2 && String(rv) === [...String(lv)].reverse().join('')) seen.add('swap');
      } else {
        if (s !== '=' || /[−÷]/.test(q.text) || !q.text.match(/\d+/g).some(n => [2, 5, 10].includes(+n)) || q.say !== signWords(q.text) + '. True?') bad.push('tf tables ' + q.text);
        if (/\+/.test(q.text)) seen.add('repeat');
        if (!truth && ![2, 5, 10].some(t => Math.abs(lv - rv) === t && q.text.match(/\d+/g).map(Number).includes(t))) bad.push('tf not a neighbour ' + q.text);
      }
      if (q.text.length > 18 !== /<br>/.test(q.top)) bad.push('tf lines ' + q.text);
      trues += q.truth;
    }
    if (trues < 240 || trues > 360) bad.push('tf true ' + trues);
    if (cmps < 240 || cmps > 360) bad.push('tf compare ' + cmps);
    for (let i = 0; i < 500; i++) { // More or less
      const q = cmpQ(2, ['dots']), a = +q.l, b = +q.r, want = a < b ? 0 : a === b ? 1 : 2;
      if (q.right !== want || q.ans !== q.tiles[want].label || q.tiles.map(t => t.label).join('') !== '<=>' || a < 1 || b < 1 || Math.max(a, b) > 120 || q.say !== `${a}, and ${b}. Which sign goes in the box?`) bad.push('cmp ' + JSON.stringify(q));
      same += a === b; if (Math.max(a, b) > 100) seen.add('over 100');
    }
    if (same < 60 || same > 140) bad.push('cmp same ' + same + ' of 500');
    for (let i = 0; i < 600; i++) { // Balance
      const q = balQ(2), [l, r] = q.text.split(' = ');
      const nums = q.text.match(/\d+/g).map(Number);
      if ((q.text.match(/☐/g) || []).length !== 1 || !q.saw || q.yr !== 2) bad.push('bal box ' + q.text);
      if (nums.concat(q.ans).some(n => n < 1 || n > 100)) bad.push('bal size ' + q.text);
      const lv = val(l.replace('☐', q.ans)), rv = val(r.replace('☐', q.ans));
      if (lv !== rv) bad.push('bal not equal ' + q.text + ' ' + q.ans);
      for (const x of [q.ans - 1, q.ans + 1]) if (x > 0 && val(l.replace('☐', x)) === val(r.replace('☐', x))) bad.push('bal two answers ' + q.text);
      if (/[×÷]/.test(q.text) && !q.text.match(/\d+/g).concat(String(q.ans)).some(n => [2, 5, 10].includes(+n))) bad.push('bal tables ' + q.text);
      if (/[+−]/.test(l) && /[+−]/.test(r)) seen.add('both'); else if (q.text.includes('÷')) seen.add('divide'); else seen.add('times');
      if (q.say !== signWords(q.text).replace('equals', 'is the same as').replace('☐', 'what') + '?') bad.push('bal say ' + q.say);
    }
    for (let i = 0; i < 400; i++) { // Clocks: o'clock, quarter past, half past only; Match in Year 2
      const q = ACTS.clock.make({ yr: 2, kinds: ['face', 'words', 'match'], n: 6 });
      if (![0, 15, 30].includes(q.m)) bad.push('clock minutes ' + q.m);
      if (q.words && /to /.test(q.words)) bad.push('clock words ' + q.words);
      if (q.kind === 'tap') {
        const labels = q.tiles.map(t => t.label), right = `${q.h}:${String(q.m).padStart(2, '0')}`;
        if (q.form !== 'match' || new Set(labels).size !== 3 || labels[q.right] !== right || q.ans !== right || !labels.every(s => /^\d{1,2}:\d\d$/.test(s))) bad.push('match ' + labels + ' ' + right);
        if (q.m) {
          seen.add('match ' + q.m);
          const wrong = labels.filter(s => s !== right), nx = q.h % 12 + 1;
          if (!wrong.includes(`${nx}:${String(q.m).padStart(2, '0')}`) || !wrong.some(s => s === `${q.h}:0${q.m / 5}` || s === `${q.m / 5}:${String(q.h * 5).padStart(2, "0")}`)) bad.push('match traps ' + labels + ' ' + right);
          if (q.tiles.some(t => /past|quarter|half/.test(t.say))) bad.push('match say ' + q.tiles.map(t => t.say));
        }
      } else if (q.words) seen.add('words');
    }
    if (seen.size !== 9) bad.push('seen ' + [...seen]);
    return bad.slice(0, 5);
  }, val);
  ok(d1.length === 0, 'Year 2: True or false (< > to 120, 2 5 10 tables, two lines when long), More or less (to 120, < = >), Balance (both sides, ☐ × 5 = 20, 6 ÷ ☐ = 2), Clocks (no quarter to, Match with quarter and half past) ' + d1.join(' | '));
  ok(await page.evaluate(() => [ACTS.clock.key({ yr: 2, kinds: ['face', 'match'], n: 6 }), ACTS.cmp.key({ yr: 2, kinds: ['dots', 'num', 'frac'], n: 6 }), labelFor('cmp~2|num|6'), labelFor('tf~2|6'), labelFor('bal~2|12')].join(' / '))
    === 'clock~2|face,match|6 / cmp~2|num|6 / More or less · Year 2 · numbers · 6 questions / True or false · Year 2 · 6 questions / Balance · Year 2 · 12 questions', 'Year 2 record keys and labels');
  await page.evaluate(() => { setYear(2); hideDone(); });
  for (const [a, c] of [['tf', { yr: 2, n: 12 }], ['cmp', { yr: 2, kinds: ['num'], n: 12 }], ['bal', { yr: 2, n: 12 }], ['clock', { yr: 2, kinds: ['face', 'match'], n: 12 }], ['addsub', { yr: 2, ops: ['+', '-'], n: 12 }]]) {
    await page.evaluate((a, c) => { hideDone(); act = a; buildSheet(c); show('sheet'); }, a, c);
    ok((await fits()).length === 0, `${a} Year 2 fits ` + (await fits()).join(' '));
    if (SHOTS) await page.screenshot({ path: SHOTS + `/46-${a}-y2.png` });
    ok((await writeAllAndMark()).length === 0, `${a} Year 2: read and marked right`);
  }

  // ---- D1b: Year 2 on Graphs (dot plot of colours, tap most / least), Rounding, Splat
  const d1b = await page.evaluate(() => {
    const bad = [], seen = new Set();
    for (let i = 0; i < 500; i++) { // Rounding: nearest 10, numbers to 120, never halfway on the line
      const kinds = pickOne([['line'], ['num'], ['line', 'num']]), q = roundQ(2, kinds), n = +q.n, want = Math.round(n / 10) * 10;
      if (q.hi - q.lo !== 10 || n < 11 || n > 119 || n % 10 === 0 || q.ans !== want || q.hi > 120 || q.lo > n || q.hi < n || q.cap !== 'to the nearest 10' || q.say !== `Round ${n} to the nearest 10.`) bad.push('round ' + JSON.stringify(q));
      if (!kinds.includes(q.kind === 'rline' ? 'line' : 'num')) bad.push('round kind ' + q.kind + ' ' + kinds);
      if (q.kind === 'rline' && n % 10 === 5) bad.push('round halfway on the line ' + n);
      if (n % 10 === 5 && q.kind === 'rnum') seen.add('half');
      if (n > 100) seen.add('over 100');
    }
    const dist = (px, py, x0, x1, y) => Math.hypot(px - Math.min(Math.max(px, x0), x1), py - y);
    for (let i = 0; i < 600; i++) { // Splat: two or three blots, the same number under each
      const q = splatQ(2), b = q.blots.length, d = new DOMParser().parseFromString(`<div>${splatSvg(q)}</div>`, 'text/html');
      if (q.total < 11 || q.total > 30 || b < 2 || b > 3 || q.k < 2 || q.k > 5 || q.showing < 2 || q.showing !== q.total - b * q.k || q.ans !== q.k) bad.push('splat numbers ' + JSON.stringify(q));
      if (new Set(q.blots.map(B => B.f)).size !== b) bad.push('splat two blots in a frame ' + JSON.stringify(q));
      if (cardSay(q) !== `${q.total} altogether. ${q.showing} showing. The same number under each blot. How many under one?`) bad.push('splat say ' + cardSay(q));
      seen.add('blots ' + b); seen.add('k ' + q.k);
      const dots = [...d.querySelectorAll('circle[fill="currentColor"]')].map(c => { const g = c.closest('g[transform]'), ty = g ? +g.getAttribute('transform').match(/translate\(0 ([\d.]+)\)/)[1] : 0; return [+c.getAttribute('cx'), +c.getAttribute('cy') + ty]; });
      const segs = [...d.querySelectorAll('path[stroke-width="10.4"]')].map(p => p.getAttribute('d').match(/M([\d.]+) ([\d.]+)H([\d.]+)/).slice(1).map(Number));
      const caps = [...d.querySelectorAll('g[fill] > circle')].filter(c => c.getAttribute('r') === '5.9');
      if (dots.length !== q.total || segs.length !== b || caps.length !== 2 * b) bad.push('splat drawing ' + dots.length + ' ' + segs.length + ' ' + caps.length);
      let covered = 0;
      dots.forEach(([x, y]) => {
        const edge = Math.min(...segs.map(([x0, y0, x1]) => dist(x, y, x0, x1, y0) - 5.2), ...caps.map(c => Math.hypot(x - +c.getAttribute('cx'), y - +c.getAttribute('cy')) - 5.9));
        if (edge <= -3.5 + 0.01) covered++; else if (edge < 3.5 - 0.01) bad.push('splat dot half under a blot ' + edge.toFixed(2) + ' ' + JSON.stringify(q));
      });
      if (covered !== b * q.k) bad.push('splat covered ' + covered + ' of ' + b * q.k);
      // every blot is the same length
      if (segs.some(([x0, , x1]) => Math.abs(x1 - x0 - (q.k - 1) * 10) > 0.01)) bad.push('splat blot sizes');
    }
    let taps = 0;
    for (let i = 0; i < 400; i++) { const q = graphQ(2); if (q.kind === 'tap') { taps++; seen.add('tap ' + q.type); } }
    if (taps < 110 || taps > 220) bad.push('graph taps ' + taps + ' of 400');
    const want = ['half', 'over 100', 'blots 2', 'blots 3', 'k 2', 'k 3', 'k 4', 'k 5', 'tap tally', 'tap pic', 'tap cdot'];
    if (!want.every(s => seen.has(s))) bad.push('seen ' + [...seen]);
    return bad.slice(0, 5);
  });
  ok(d1b.length === 0, 'Year 2: Rounding (nearest 10 to 120, never halfway on the line), Splat (two or three blots, same number under each, dots whole or covered), Graphs (tap most / least on tally, picture and dot plot) ' + d1b.join(' | '));
  ok(await page.evaluate(() => [ACTS.round.defaults(5).yr, ACTS.round.defaults(5).kinds.join(), ACTS.round.key({ yr: 2, kinds: ['line'], n: 6 }), labelFor('round~2|line|6'), labelFor('splat~2|12'), ACTS.splat.key({ yr: 2, n: 6 })].join(' / '))
    === '2 / line / round~2|line|6 / Rounding · Year 2 · number line · 6 questions / Splat · Year 2 · 12 questions / splat~2|6', 'Year 2 Rounding and Splat: younger default number line, record keys and labels');
  // a Graphs sheet with every Year 2 kind: dot plot written, then tap cards on each graph
  await page.evaluate(() => {
    hideDone(); act = 'graph'; buildSheet({ yr: 2, n: 12 }); show('sheet');
    const want = ['cdot', 'tap cdot', 'tap tally', 'tap pic', 'tally', 'pic'];
    for (let i = 0; i < want.length; i++) { const q = graphQ(2), w = (q.kind === 'tap' ? 'tap ' : '') + q.type; if (w !== want[i]) { i--; continue; } cards[i].q = q; layout(cards[i]); sizeCanvas(cards[i]); }
  });
  ok(await page.evaluate(() => cards.filter(c => c.q.kind === 'tap').every(c => c.el.querySelectorAll('.tt .tsw').length === 4)), 'Graphs Year 2: tap cards with four colour squares');
  ok((await fits()).length === 0, 'Graphs Year 2 (dot plots and tap cards) fit ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/47-graph-y2.png' });
  ok((await writeAllAndMark()).length === 0, 'Graphs Year 2: written and tapped answers marked right');
  for (const [a, c] of [['round', { yr: 2, kinds: ['line', 'num'], n: 12 }], ['round', { yr: 2, kinds: ['line'], n: 6 }], ['splat', { yr: 2, n: 6 }], ['splat', { yr: 2, n: 12 }]]) {
    await page.evaluate((a, c) => { hideDone(); act = a; buildSheet(c); show('sheet'); }, a, c);
    ok((await fits()).length === 0, `${a} Year 2 (${c.n}) fits ` + (await fits()).join(' '));
    if (SHOTS) await page.screenshot({ path: SHOTS + `/47-${a}-y2-${c.n}.png` });
    ok((await writeAllAndMark()).length === 0, `${a} Year 2 (${c.n}): read and marked right`);
  }
  ok(await page.evaluate(() => cards.every(c => c.el.querySelector('.cap').innerText.replace(/\s+/g, ' ') === `${c.q.total} altogether ${c.q.showing} showing`)), 'Splat Year 2: "14 altogether" and "4 showing" printed');
  await page.evaluate(() => { setYear(4); hideDone(); });

  // ---- B3: Picture patterns and Shapes Name (Year 1)
  const p1 = await page.evaluate(() => {
    const bad = [], types = {}, gaps = new Set();
    for (let i = 0; i < 600; i++) {
      const q = patQ(1), u = q.unit, d = new DOMParser().parseFromString(`<div>${q.top}</div>`, 'text/html');
      const keys = u.map(t => t.nm + t.col);
      if (new Set(keys).size !== 3) bad.push('unit not three different ' + keys);
      const nms = new Set(u.map(t => t.nm)).size, cols = new Set(u.map(t => t.col)).size;
      if ((q.type === 'shape' && (nms !== 3 || cols !== 1)) || (q.type === 'colour' && (nms !== 1 || cols !== 3)) || (q.type === 'both' && (nms !== 3 || cols !== 3))) bad.push('type ' + q.type + ' ' + keys);
      if (q.len < 7 || q.len > 9 || q.gap < 3 || q.gap >= q.len) bad.push('row ' + q.len + ' gap ' + q.gap);
      // the picture: len - 1 shapes and one dashed box at the gap
      const shapes = d.querySelectorAll('svg > circle, svg > polygon, svg > rect:not([stroke-dasharray])').length, box = d.querySelectorAll('rect[stroke-dasharray]').length;
      if (shapes !== q.len - 1 || box !== 1) bad.push('picture ' + shapes + ' ' + box);
      if (q.tiles.length !== 3 || new Set(q.tiles.map(t => t.label)).size !== 3 || q.tiles[q.right].label !== q.ans) bad.push('tiles ' + q.tiles.map(t => t.label));
      // the right tile is the part at the gap, which is the part three before it
      const want = u[q.gap % 3], w = q.type === 'colour' ? want.col : q.type === 'shape' ? want.nm : want.col + ' ' + want.nm;
      if (q.ans !== w || q.tiles.some(t => t.say !== t.label)) bad.push('answer ' + q.ans + ' ' + w);
      if (cardSay(q) !== `What is missing? ${q.tiles.map(t => t.say).join(', ')}.`) bad.push('say ' + cardSay(q));
      types[q.type] = (types[q.type] || 0) + 1; gaps.add(q.gap);
    }
    if (Object.values(types).length !== 3 || Object.values(types).some(n => n < 140)) bad.push('types ' + JSON.stringify(types));
    if (![3, 4, 5, 6, 7, 8].every(g => gaps.has(g))) bad.push('gaps ' + [...gaps]);
    return bad.slice(0, 4);
  });
  ok(p1.length === 0, 'Picture patterns Year 1: 7 to 9 shapes in a repeat of three, one gap after the first three, tiles are the three parts; shape only, colour only or both ' + p1.join(' | '));
  const n1 = await page.evaluate(() => {
    const bad = [], asked = new Set();
    for (let i = 0; i < 600; i++) {
      const q = nameQ(), labels = q.tiles.map(t => t.label);
      asked.add(q.nm);
      if (q.tiles.length !== 4 || labels.filter(l => l === q.nm).length !== 1 || labels[q.right] !== q.nm || q.ans !== q.nm) bad.push('tiles ' + q.nm + ': ' + labels);
      if (q.nm === 'rectangle' && labels.includes('square')) bad.push('a square among rectangles ' + labels);
      if (NAME_SOLID.includes(q.nm) && labels.filter(l => NAME_SOLID.includes(l)).length !== 3) bad.push('solids ' + labels);
      if (q.top !== `Tap the ${q.nm}` || q.say !== `Tap the ${q.nm}.` || !q.quiet || cardSay(q) !== q.say || q.tiles.some(t => t.say !== 'this one')) bad.push('say ' + q.say);
      // each tile its own colour and size
      const fills = q.tiles.map(t => t.html.match(/fill="(#[0-9a-f]{6})"/)[1]), sizes = q.tiles.map(t => t.html.match(/scale\(([\d.]+)\)/)[1]);
      if (new Set(fills).size !== 4 || new Set(sizes).size !== 4) bad.push('looks ' + fills + ' ' + sizes);
    }
    if (asked.size !== 7) bad.push('asked ' + [...asked]);
    const qs = range(0, 300).map(() => shapeQ(1, ['flat', 'solid', 'name'])), m = qs.filter(q => q.form === 'name').length;
    if (m < 110 || m > 190) bad.push('name share ' + m);
    if (!range(0, 50).every(() => shapeQ(1, ['name']).form === 'name' && shapeQ(3, ['flat', 'name']).kind === 'shape' && shapeQ(4, ['name']).kind === 'shape')) bad.push('Name outside Years 1–2');
    return bad.slice(0, 4);
  });
  ok(n1.length === 0, 'Shapes Name Year 1: "Tap the triangle", four tiles in different colours and sizes, no square when asked for a rectangle, solids with a flat look-alike; tiles say "this one"; Name only in Years 1–2 ' + n1.join(' | '));
  await page.evaluate(() => { setYear(1); hideDone(); act = 'pat'; buildSheet({ yr: 1, n: 6 }); show('sheet'); });
  ok(await page.evaluate(() => cards.every(c => c.q.kind === 'tap' && c.el.querySelectorAll('.tt svg').length === 3 && c.el.querySelector('.tq rect[stroke-dasharray]'))), 'Picture patterns sheet: the row with its gap, three picture tiles');
  ok((await fits()).length === 0, 'Picture patterns fits ' + (await fits()).join(' '));
  ok(await page.evaluate(() => cards.every(c => c.el.querySelector('.tt').getBoundingClientRect().width >= 40)), 'Picture patterns: the tiles are big enough to tap');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/47-pat.png' });
  await page.click('#sheet .card:nth-child(1) .cardsay');
  ok((await said()).slice(-1)[0] === await page.evaluate(() => cardSay(cards[0].q)), 'Picture patterns: the card speaker asks, then names the three tiles');
  ok((await writeAllAndMark()).length === 0 && await page.evaluate(() => sheetDone && loadRec(current).history[0].k === 'pat~1|6'), 'Picture patterns: tapped right, finished, record pat~1|6');
  await page.evaluate(() => { hideDone(); buildSheet({ yr: 1, n: 12 }); });
  ok((await fits()).length === 0, 'Picture patterns (12) fits ' + (await fits()).join(' '));
  await page.evaluate(() => { hideDone(); act = 'shape'; buildSheet({ yr: 1, kinds: ['flat', 'name'], n: 6 }); show('sheet'); cards.forEach((c, i) => { if (i < 3) { c.q = nameQ(); layout(c); sizeCanvas(c); } }); });
  ok(await page.evaluate(() => cards.filter(c => c.q.form === 'name').every(c => c.el.querySelectorAll('.tt svg').length === 4)), 'Shapes Name sheet: four picture tiles');
  ok((await fits()).length === 0, 'Shapes Name fits beside written shapes ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/48-shape-name.png' });
  await page.tap('#sheet .card:nth-child(1) .tt[data-i="0"]');
  ok((await said()).slice(-1)[0] === 'this one', 'a tapped shape says "this one", not its name');
  ok((await writeAllAndMark()).length === 0, 'Shapes Name and written shapes on one sheet: all marked right');
  await page.evaluate(() => { setYear(4); hideDone(); });
  ok(await page.evaluate(() => [ACTS.shape.key({ yr: 1, kinds: ['flat', 'solid', 'name'], n: 6 }), ACTS.shape.key({ yr: 2, kinds: ['flat', 'name'], n: 6 }), ACTS.shape.key({ yr: 3, kinds: ['flat', 'name'], n: 6 }), ACTS.shape.defaults(5).kinds.join(), ACTS.pat.defaults(5).yr, labelFor('shape~1|flat,solid,name|6'), labelFor('pat~1|6')].join(' / '))
    === 'shape~1|flat,solid,name|6 / shape~2|flat,name|6 / shape~3|flat|6 / flat,solid,name / 1 / Shapes · Year 1 · flat, 3D, name · 6 questions / Picture patterns · Year 1 · 6 questions',
    'Shapes keys: Name only in Years 1–2 keys; younger default has Name; Picture patterns key and label');

  // ---- D2a: Year 2 on Picture patterns (which part repeats, the 10th one) and Shapes Name
  const p2 = await page.evaluate(() => {
    const bad = [], asks = {}, units = new Set(), ps = new Set();
    for (let i = 0; i < 800; i++) {
      const q = pat2Q(), d = new DOMParser().parseFromString(`<div>${q.top}</div>`, 'text/html');
      asks[q.ask] = (asks[q.ask] || 0) + 1; units.add(q.unit);
      const labels = q.tiles.map(t => t.label);
      if (q.kind !== 'tap' || new Set(labels).size !== labels.length || labels[q.right] !== q.ans) bad.push('tiles ' + labels + ' ans ' + q.ans);
      if (q.ask === 'unit') {
        // the row repeats the unit; exactly one tile repeats too, and it is the unit
        const row = range(0, q.len - 1).map(j => q.unit[j % q.unit.length]).join('');
        const rep = labels.filter(l => row.split('').every((ch, j) => ch === l[j % l.length]));
        if (q.tiles.length !== 3 || rep.length !== 1 || rep[0] !== q.unit || q.ans !== q.unit) bad.push('unit ' + q.unit + ': ' + labels);
        if (q.len < 2 * q.unit.length + 1 || q.len > 10) bad.push('row ' + q.len + ' for ' + q.unit);
        const shapes = d.querySelectorAll('svg > circle, svg > polygon, svg > rect').length;
        if (shapes !== q.len || d.querySelector('[stroke-dasharray]')) bad.push('picture ' + shapes);
        if (q.tiles.some((t, j) => t.say !== 'this one' || (t.html.match(/<(circle|polygon|rect)/g) || []).length !== labels[j].length)) bad.push('tile pictures ' + labels);
        if (!q.quiet || cardSay(q) !== 'Which part repeats?') bad.push('say ' + cardSay(q));
      } else {
        ps.add(q.p);
        if (q.p < 8 || q.p > 12 || q.tiles.length !== new Set(q.unit).size) bad.push('nth ' + q.p + ' ' + q.unit + ' ' + labels);
        const want = q.unit[(q.p - 1) % q.unit.length], texts = [...d.querySelectorAll('text')].map(t => t.textContent).join();
        if (texts !== `1,2,3,4,5,6,?,${q.p}`) bad.push('numbers ' + texts);
        if (q.say !== `What will the ${q.p}th one be?` || q.tiles.some(t => t.say !== t.label)) bad.push('say ' + q.say);
        // the answer tile is the shape in place p (unit letters map to the things in order of first use)
        const first = [...new Set(q.unit)];
        if (q.tiles[q.right].label !== q.ans || first.indexOf(want) < 0) bad.push('answer ' + q.ans);
      }
    }
    if (asks.unit < 320 || asks.nth < 320) bad.push('asks ' + JSON.stringify(asks));
    if (units.size < 9 || ps.size !== 5) bad.push('variety ' + [...units] + ' ' + [...ps]);
    return bad.slice(0, 4);
  });
  ok(p2.length === 0, 'Picture patterns Year 2: which part repeats (one tile repeats, the others are too short or too long) and the 8th to 12th one ' + p2.join(' | '));
  // the Nth answer really is the shape in that place: rebuild the row from the picture's six shapes
  ok(await page.evaluate(() => range(0, 300).every(() => {
    const q = pat2Q(); if (q.ask !== 'nth') return true;
    const d = new DOMParser().parseFromString(`<div>${q.top}</div>`, 'text/html');
    const six = [...d.querySelectorAll('svg > circle, svg > polygon, svg > rect:not([stroke-dasharray])')].map(e => e.tagName + e.getAttribute('fill') + (e.getAttribute('points') || '').split(' ').length);
    const k = q.unit.length, t = q.tiles[q.right].html, d2 = new DOMParser().parseFromString(t, 'text/html').querySelector('svg > *');
    const tile = d2.tagName + d2.getAttribute('fill') + (d2.getAttribute('points') || '').split(' ').length;
    return six[(q.p - 1) % k].toLowerCase() === tile.toLowerCase();
  })), 'Picture patterns Year 2: the right tile is the shape in the asked place');
  const n2 = await page.evaluate(() => {
    const bad = [], asked = {};
    for (let i = 0; i < 1000; i++) {
      const q = name2Q(), labels = q.tiles.map(t => t.label);
      asked[q.nm] = (asked[q.nm] || 0) + 1;
      if (q.tiles.length !== 4 || new Set(labels).size !== 4 || labels[q.right] !== q.nm || q.ans !== q.nm) bad.push('tiles ' + q.nm + ': ' + labels);
      if ((q.nm === 'rectangle' && labels.includes('square')) || (q.nm === 'cuboid' && labels.includes('cube'))) bad.push('also right ' + labels);
      if (!labels.includes(NAME_NEAR[q.nm])) bad.push('no near one ' + q.nm + ': ' + labels);
      if (NAME_SOLID2.includes(q.nm) && labels.filter(l => NAME_SOLID2.includes(l)).length !== 3) bad.push('solids ' + labels);
      if (!NAME_SOLID2.includes(q.nm) && labels.some(l => NAME_SOLID2.includes(l))) bad.push('a solid among flats ' + labels);
      if (q.say !== `Tap the ${q.nm}.` || !q.quiet || q.tiles.some(t => t.say !== 'this one')) bad.push('say ' + q.say);
      // every picture stays inside its box (polygons)
      for (const t of q.tiles) for (const m of t.html.matchAll(/points="([^"]+)"/g)) if (m[1].split(' ').some(p => p.split(',').some(v => Math.abs(+v) > 46))) bad.push('outside ' + t.label);
    }
    const newShare = NAME_NEW2.reduce((s, x) => s + (asked[x] || 0), 0);
    if (Object.keys(asked).length !== 14 || newShare < 680 || newShare > 820) bad.push('asked ' + JSON.stringify(asked));
    const qs = range(0, 300).map(() => shapeQ(2, ['flat', 'solid', 'name'])), m = qs.filter(q => q.form === 'name').length;
    if (m < 70 || m > 130) bad.push('name share ' + m);
    if (!range(0, 50).every(() => shapeQ(2, ['name']).form === 'name' && NAME_FLAT2.concat(NAME_SOLID2).includes(shapeQ(2, ['name']).nm))) bad.push('Name alone in Year 2');
    return bad.slice(0, 4);
  });
  ok(n2.length === 0, 'Shapes Name Year 2: oval, semicircle, pentagon, hexagon, cuboid, pyramid, cone mostly; a near one on every card; no square for a rectangle or cube for a cuboid ' + n2.join(' | '));
  for (const n of [6, 12]) {
    await page.evaluate(n => { setYear(2); hideDone(); act = 'pat'; buildSheet({ yr: 2, n }); show('sheet'); }, n);
    ok((await fits()).length === 0, `Picture patterns Year 2 (${n}) fits ` + (await fits()).join(' '));
    ok(await page.evaluate(() => cards.every(c => [...c.el.querySelectorAll('.tt')].every(b => { const r = b.getBoundingClientRect(), k = c.el.getBoundingClientRect(); return r.height >= 30 && r.left >= k.left - 1 && r.right <= k.right + 1 && r.bottom <= k.bottom + 1; }))), `Picture patterns Year 2 (${n}): tiles big enough and inside the card`);
    if (SHOTS) await page.screenshot({ path: SHOTS + `/49-pat2-${n}.png` });
    ok((await writeAllAndMark()).length === 0 && await page.evaluate(n => sheetDone && loadRec(current).history[0].k === `pat~2|${n}`, n), `Picture patterns Year 2 (${n}): tapped right, finished, record pat~2|${n}`);
  }
  for (const n of [6, 12]) {
    await page.evaluate(n => { hideDone(); act = 'shape'; buildSheet({ yr: 2, kinds: ['flat', 'solid', 'name'], n }); show('sheet'); cards.forEach((c, i) => { if (i % 2 === 0) { c.q = name2Q(); layout(c); sizeCanvas(c); } }); }, n);
    ok((await fits()).length === 0, `Shapes Name Year 2 (${n}) fits beside written shapes ` + (await fits()).join(' '));
    if (SHOTS) await page.screenshot({ path: SHOTS + `/49-shape-name2-${n}.png` });
    ok((await writeAllAndMark()).length === 0, `Shapes Name Year 2 (${n}) and written shapes: all marked right`);
  }
  ok(await page.evaluate(() => labelFor('pat~2|6')) === 'Picture patterns · Year 2 · 6 questions', 'Picture patterns Year 2 label');

  // ---- D2b: Year 2 on Halves and quarters (thirds, the same, which is bigger, the whole) and Money Make it
  const hq2 = await page.evaluate(() => {
    const bad = [], area = P => Math.abs(P.reduce((s, v, i) => { const w = P[(i + 1) % P.length]; return s + v[0] * w[1] - w[0] * v[1]; }, 0)) / 2;
    const polys = html => [...new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html').querySelectorAll('polygon')].map(p => ({ A: area(p.getAttribute('points').split(' ').map(v => v.split(',').map(Number))), on: p.getAttribute('fill') !== '#fff' }));
    const share = ps => sumOf(ps.filter(p => p.on).map(p => p.A)) / sumOf(ps.map(p => p.A));
    const forms = {}, wants = {};
    for (let i = 0; i < 1200; i++) {
      const q = partsQ(2); forms[q.form] = (forms[q.form] || 0) + 1;
      if (q.form === 'parts') {
        wants[q.want] = (wants[q.want] || 0) + 1;
        if (q.top !== `Which one shows ${FRAC_WORD[q.want]}?` || q.tiles[q.right].label !== 'right') bad.push('words ' + q.top);
        q.tiles.forEach((t, j) => {
          const ps = polys(t.html), A = ps.map(p => p.A), m = sumOf(A) / A.length, equal = A.every(a => Math.abs(a - m) < 0.07 * m);
          if (ps.filter(p => p.on).length !== 1) bad.push('shaded');
          if (j === q.right ? ps.length !== q.want || !equal : ps.length === q.want && (equal || Math.max(...A) / Math.min(...A) < 1.5)) bad.push(`tile ${j === q.right} ${ps.length} ${equal} for ${q.want}`);
          if (ps.length === 3 && q.shapes[j] === 'circle') bad.push('thirds of a circle');
        });
      } else if (q.form === 'same') {
        const top = polys(q.top), want = q.shown[0] === 2 ? '2/4' : '1/2';
        if (Math.abs(share(top) - 0.5) > 0.01 || q.ans !== want || q.tiles[q.right].label !== want || q.tiles.length !== 3 || new Set(q.tiles.map(t => t.label)).size !== 3 || !q.quiet || q.tiles.some(t => t.say !== 'this one')) bad.push('same ' + q.ans + ' ' + q.tiles.map(t => t.label));
        q.tiles.forEach((t, j) => {
          const ps = polys(t.html), [k, n] = t.label.split('/').map(Number);
          if (ps.length !== n || ps.filter(p => p.on).length !== k || Math.abs(share(ps) - k / n) > 0.01 || (j !== q.right && Math.abs(share(ps) - 0.5) < 0.05)) bad.push('same tile ' + t.label + ' ' + ps.length);
          if (n === 3 && q.shape === 'circle') bad.push('thirds of a circle');
        });
        if (!/coloured\. Which one has the same amount coloured\?$/.test(q.say)) bad.push('say ' + q.say);
      } else if (q.form === 'bigger') {
        const sh = q.tiles.map(t => share(polys(t.html))), want = q.most ? Math.max(...sh) : Math.min(...sh);
        if (sh[q.right] !== want || q.tiles.map(t => t.label).sort().join() !== '1/2,1/3,1/4' || q.tiles.some(t => t.say !== FRAC_WORD[+t.label[2]]) || q.quiet) bad.push('bigger ' + sh + ' ' + q.right);
        if (q.tiles.some(t => polys(t.html).length !== +t.label[2]) || q.say !== `Which coloured part is ${q.most ? 'biggest' : 'smallest'}?`) bad.push('bigger parts ' + q.say);
      } else bad.push('form ' + q.form);
    }
    if (Object.keys(forms).length !== 3 || forms.parts < 400 || forms.same < 250 || forms.bigger < 250) bad.push('forms ' + JSON.stringify(forms));
    if (!wants[2] || !wants[3] || !wants[4]) bad.push('wants ' + JSON.stringify(wants));
    if (range(0, 200).some(() => partsQ(1).form !== 'parts' || partsQ(1).want === 3)) bad.push('Year 1 changed');
    const sk = {};
    for (let i = 0; i < 600; i++) {
      const q = shareQ(2), d = new DOMParser().parseFromString(`<div>${shareSvg(q)}</div>`, 'text/html'), dots = d.querySelectorAll('circle').length;
      sk[(q.whole ? 'w' : 'p') + q.g] = 1;
      if (d.querySelectorAll('line').length !== 2 - (q.g === 2)) bad.push('lines ' + q.g);
      if (q.whole) {
        if (dots !== q.k || d.querySelectorAll('rect.hid').length !== q.g - 1 || q.ans !== q.g * q.k || q.cap !== `${q.g === 2 ? 'Half' : 'A quarter'} is ${q.k}` || q.say !== q.cap + '. How many altogether?' || q.k < 2) bad.push('whole ' + JSON.stringify(q));
      } else if (dots !== q.g * q.k || q.ans !== q.k || q.cap !== `${SHARE_WORD[q.g]} of ${q.g * q.k}` || q.g * q.k > 20) bad.push('part ' + JSON.stringify(q));
    }
    if (Object.keys(sk).sort().join() !== 'p2,p3,p4,w2,w4') bad.push('share kinds ' + Object.keys(sk));
    if (range(0, 200).some(() => { const q = shareQ(1); return q.whole || q.g === 3; })) bad.push('Year 1 share changed');
    return bad.slice(0, 4);
  });
  ok(hq2.length === 0, 'Halves and quarters Year 2: a third too; "Which one is the same?" 1/2 and 2/4; biggest / smallest coloured part; a third of; the whole from a part; Year 1 unchanged ' + hq2.join(' | '));
  const mk2 = await page.evaluate(() => {
    const bad = [], seen = new Set();
    for (let i = 0; i < 400; i++) {
      const q = makeIt2Q(), vs = q.tiles.map(t => t.v), coins = vs[0] === 10, sum = q.right.reduce((s, k) => s + vs[k], 0);
      seen.add(coins ? 'c' : 'n');
      if (vs.join() !== (coins ? '10,20,50,100,200' : '500,1000,2000,5000,10000') || vs.includes(q.target) || sum !== q.target) bad.push('tiles ' + vs + ' ' + q.target);
      if (coins ? q.target < 30 || q.target > 90 || q.target % 10 || q.top !== `Make ${q.target}c` || q.say !== `Make ${q.target} cents.`
        : q.target < 1500 || q.target > 9500 || q.target % 500 || q.top !== `Make $${q.target / 100}` || q.say !== `Make ${q.target / 100} dollars.`) bad.push('target ' + q.top + ' / ' + q.say);
    }
    if (seen.size !== 2) bad.push('only ' + [...seen]);
    if (!range(0, 50).every(() => ACTS.money.make({ yr: 2, kinds: ['make'] }).yr === 2)) bad.push('Year 2 make');
    return bad.slice(0, 4);
  });
  ok(mk2.length === 0, 'Money Make it Year 2: coins only (30c to 90c) or notes only ($15 to $95), never one coin or note, five tiles ' + mk2.join(' | '));
  for (const n of [6, 12]) {
    await page.evaluate(n => { setYear(2); hideDone(); act = 'parts'; buildSheet({ yr: 2, kinds: ['tap', 'write'], n }); show('sheet'); }, n);
    await page.evaluate(() => { const qs = [sameFracQ(), biggerFracQ(), partsQ(2), { ...shareQ(2), ...{ kind: 'share', whole: true, g: 4, k: 5, cap: 'A quarter is 5', say: 'A quarter is 5. How many altogether?', ans: 20 } }, shareQ(2), sameFracQ()]; qs.forEach((q, i) => { cards[i].q = q; layout(cards[i]); sizeCanvas(cards[i]); }); });
    ok((await fits()).length === 0, `Halves and quarters Year 2 (${n}) fits ` + (await fits()).join(' '));
    ok(await page.evaluate(() => cards.filter(c => c.q.kind === 'tap').every(c => [...c.el.querySelectorAll('.tt')].every(b => { const r = b.getBoundingClientRect(), k = c.el.getBoundingClientRect(); return r.width >= 40 && r.right <= k.right + 1 && r.bottom <= k.bottom + 1; }))), `Halves and quarters Year 2 (${n}): tiles big enough and inside the card`);
    if (SHOTS) await page.screenshot({ path: SHOTS + `/51-parts2-${n}.png` });
    ok((await writeAllAndMark()).length === 0 && await page.evaluate(n => sheetDone && loadRec(current).history[0].k === `parts~2|tap,write|${n}`, n), `Halves and quarters Year 2 (${n}): right, finished, record parts~2|tap,write|${n}`);
    await page.evaluate(n => { hideDone(); act = 'money'; buildSheet({ yr: 2, kinds: ['count', 'make'], n }); show('sheet'); cards.forEach((c, i) => { if (i < 3) { c.q = makeIt2Q(); layout(c); sizeCanvas(c); } }); }, n);
    ok((await fits()).length === 0 && await page.evaluate(() => cards.filter(c => c.q.form === 'make').every(c => c.el.querySelectorAll('.tt').length === 5)), `Money Make it Year 2 (${n}) fits beside written money, five tiles ` + (await fits()).join(' '));
    if (SHOTS) await page.screenshot({ path: SHOTS + `/46-make-it2-${n}.png` });
    ok((await writeAllAndMark()).length === 0 && await page.evaluate(n => sheetDone && loadRec(current).history[0].k === `money~2|count,make|${n}`, n), `Money Make it Year 2 (${n}): all right, record money~2|count,make|${n}`);
  }
  ok(await page.evaluate(() => [ACTS.money.key({ yr: 2, kinds: ['count', 'make'], n: 6 }), ACTS.money.key({ yr: 1, kinds: ['count', 'make'], n: 6 }), labelFor('money~2|make|6'), labelFor('parts~2|tap,write|6')].join(' / '))
    === 'money~2|count,make|6 / money~1|count|6 / Money · Year 2 · make it · 6 questions / Halves and quarters · Year 2 · which one, half of a number · 6 questions', 'D2b record keys and labels');

  // ---- D2c: Rulers Year 2, Scales (a dial in grams) and Jug (mL)
  const sj = await page.evaluate(() => {
    const bad = [], seen = { pencil: 0, dial: 0, jug: 0 }, steps = new Set();
    const dom = h => new DOMParser().parseFromString(`<div>${h}</div>`, 'text/html');
    for (let i = 0; i < 900; i++) {
      const q = rulerQ(2, ['pencil', 'scales', 'jug']);
      seen[q.dial ? 'dial' : q.jug ? 'jug' : 'pencil']++;
      if (!q.dial && !q.jug) continue;
      steps.add(q.step);
      if (q.kind !== 'ruler' || q.ans !== q.v || q.v % q.step || q.v < q.step || q.v > 9 * q.step || !MEASURE_STEPS.includes(q.step) || cardSay(q) !== q.say) bad.push('q ' + JSON.stringify(q));
      const d = dom(rulerSvg(q)), t = [...d.querySelectorAll('text')].map(x => x.textContent);
      if (q.dial) {
        if (q.unit !== 'g' || q.cap !== 'How heavy?' || q.say !== 'How heavy is it, in grams?') bad.push('dial words ' + q.cap);
        if (t.join() !== [...range(0, 10).map(j => j * q.step), 'g'].join()) bad.push('dial numbers ' + t);
        const p = d.querySelector(`line[stroke="${BLOCK.red}"]`), a = (Math.atan2(+p.getAttribute('x2'), -p.getAttribute('y2')) * 180 / Math.PI + 360) % 360;
        if (Math.abs(a - q.v / (10 * q.step) * 300) > 0.5) bad.push(`pointer ${a} for ${q.v}/${q.step}`);
      } else {
        if (q.unit !== 'mL' || q.cap !== 'How much?' || !/millilitres/.test(q.say)) bad.push('jug words ' + q.cap);
        if (t.join() !== range(1, 10).map(j => j * q.step).join()) bad.push('jug numbers ' + t);
        const lab = [...d.querySelectorAll('text')].find(x => +x.textContent === q.v), w = d.querySelector(`line[stroke="${BLOCK.blue}"]`);
        if (!lab || +lab.getAttribute('y') !== +w.getAttribute('y1')) bad.push('water not on the mark for ' + q.v);
      }
    }
    if (Math.min(...Object.values(seen)) < 230 || steps.size !== 3) bad.push('mix ' + JSON.stringify(seen) + [...steps]);
    for (const yr of [1, 3, 4]) if (range(0, 60).some(() => { const q = rulerQ(yr, ['scales', 'jug']); return q.dial || q.jug; })) bad.push('scales or jug in Year ' + yr);
    if (!range(0, 60).every(() => rulerQ(2, ['scales']).dial && rulerQ(2, ['jug']).jug)) bad.push('one kind alone');
    if (range(0, 200).some(() => rulerQ(4, ['pencil', 'scales', 'jug', 'thermo']).dial) || range(0, 400).filter(() => rulerQ(4, ['pencil', 'scales', 'jug', 'thermo']).thermo).length < 140) bad.push('Year 4 thermometer share changed');
    return bad.slice(0, 4);
  });
  ok(sj.length === 0, 'Rulers Year 2: Scales (0 at the top, pointer on a numbered mark) and Jug (water level on a numbered mark), steps of 2, 5, 10, a third each with Pencil, Year 2 only ' + sj.join(' | '));
  for (const n of [6, 12]) {
    await page.evaluate(n => { setYear(2); hideDone(); act = 'ruler'; buildSheet({ yr: 2, kinds: ['pencil', 'scales', 'jug'], n }); show('sheet'); [scalesQ(), jugQ(), scalesQ(), jugQ()].forEach((q, i) => { cards[i].q = q; layout(cards[i]); sizeCanvas(cards[i]); }); }, n);
    ok((await fits()).length === 0, `Rulers Year 2 Scales and Jug (${n}) fit with room to write ` + (await fits()).join(' '));
    ok(await page.evaluate(() => cards.filter(c => c.q.jug).every(c => c.el.querySelector('.side .u').textContent === 'mL') && cards.filter(c => c.q.dial).every(c => c.el.querySelector('.side .u').textContent === 'g')), `Rulers Year 2 (${n}): the answer beside the jug in mL and beside the scales in g`);
    if (SHOTS) await page.screenshot({ path: SHOTS + `/31-scales-jug-${n}.png` });
    ok((await writeAllAndMark()).length === 0 && await page.evaluate(n => sheetDone && loadRec(current).history[0].k === `ruler~2|pencil,scales,jug|${n}`, n), `Rulers Year 2 Scales and Jug (${n}): read and marked right, record ruler~2|pencil,scales,jug|${n}`);
  }
  ok(await page.evaluate(() => [ACTS.ruler.key({ yr: 2, kinds: ['pencil'], n: 6 }), ACTS.ruler.key({ yr: 2, kinds: ['scales', 'jug', 'thermo'], n: 12 }), ACTS.ruler.key({ yr: 3, kinds: ['pencil', 'scales'], n: 12 }), ACTS.ruler.key({ yr: 4, kinds: ['pencil', 'jug', 'thermo'], n: 12 }), ACTS.ruler.defaults(8).kinds.join(), labelFor('ruler~2|pencil,scales,jug|6'), labelFor('ruler~2|6')].join(' / '))
    === 'ruler~2|6 / ruler~2|scales,jug|12 / ruler~3|12 / ruler~4|pencil,thermo|12 / pencil,scales,jug,thermo / Rulers · Year 2 · pencil, scales, jug · 6 questions / Rulers · Year 2 · 6 questions', 'D2c record keys and labels (Pencil alone keeps the old Year 2 key)');
  await page.evaluate(() => { setYear(4); hideDone(); });

  // ---- B4: Splat, Halves and quarters, Money Which coin?, Rulers Which is longer? (Year 1)
  const sp = await page.evaluate(() => {
    const bad = [], totals = new Set(), hids = new Set();
    const dist = (px, py, x0, x1, y) => Math.hypot(px - Math.min(Math.max(px, x0), x1), py - y);
    for (let i = 0; i < 600; i++) {
      const q = splatQ(), d = new DOMParser().parseFromString(`<div>${splatSvg(q)}</div>`, 'text/html');
      totals.add(q.total); hids.add(q.hid);
      if (q.total < 6 || q.total > 20 || q.hid < 1 || q.hid > 5 || q.ans !== q.hid || q.total - q.hid < 5) bad.push('numbers ' + JSON.stringify(q));
      if (cardSay(q) !== `${q.total} altogether. How many are hiding?`) bad.push('say ' + cardSay(q));
      // every dot is drawn in its ten-frame place; the blot is one stroke with a round cap each end
      const dots = [...d.querySelectorAll('circle[fill="currentColor"]')].map(c => { const g = c.closest('g[transform]'), ty = g ? +g.getAttribute('transform').match(/translate\(0 ([\d.]+)\)/)[1] : 0; return [+c.getAttribute('cx'), +c.getAttribute('cy') + ty]; });
      const seg = d.querySelector('path[stroke-width="10.4"]'), m = seg.getAttribute('d').match(/M([\d.]+) ([\d.]+)H([\d.]+)/).map(Number), [, x0, y0, x1] = m;
      const caps = [...d.querySelectorAll('g[fill] > circle')].filter(c => c.getAttribute('r') === '5.9');
      if (dots.length !== q.total || caps.length !== 2) bad.push('dots ' + dots.length + ' caps ' + caps.length);
      // dots under the blot: covered completely; every other dot is clear of it by its own radius
      let covered = 0;
      dots.forEach(([x, y]) => {
        const edge = Math.min(dist(x, y, x0, x1, y0) - 5.2, ...caps.map(c => Math.hypot(x - +c.getAttribute('cx'), y - +c.getAttribute('cy')) - 5.9));
        if (edge <= -3.5 + 0.01) covered++; else if (edge < 3.5 - 0.01) bad.push('a dot half under the blot ' + edge.toFixed(2) + ' ' + JSON.stringify(q));
      });
      if (covered !== q.hid) bad.push('covered ' + covered + ' of ' + q.hid);
      // the blot sits in one row, in the last frame
      if (Math.abs(y0 - (Math.floor((q.total - 1) / 10) * 26 + q.row * 10 + 5)) > 0.01) bad.push('blot row');
    }
    if (![...Array(15).keys()].map(x => x + 6).every(t => totals.has(t))) bad.push('totals ' + [...totals].sort((a, b) => a - b));
    if (![1, 2, 3, 4, 5].every(h => hids.has(h))) bad.push('hidden ' + [...hids]);
    return bad.slice(0, 4);
  });
  ok(sp.length === 0, 'Splat: totals 6 to 20, 1 to 5 hidden under one blot in one row, the dots beside it untouched, every dot in its ten-frame place ' + sp.join(' | '));
  const hq = await page.evaluate(() => {
    const bad = [], area = P => Math.abs(P.reduce((s, v, i) => { const w = P[(i + 1) % P.length]; return s + v[0] * w[1] - w[0] * v[1]; }, 0)) / 2, asked = {}, shapeSets = new Set();
    for (let i = 0; i < 500; i++) {
      const q = partsQ(), words = q.want === 4 ? 'a quarter' : 'a half';
      asked[q.want] = (asked[q.want] || 0) + 1;
      if (q.tiles.length !== 3 || q.tiles.filter(t => t.label === 'right').length !== 1 || q.tiles[q.right].label !== 'right' || q.ans !== 'right') bad.push('tiles ' + q.tiles.map(t => t.label));
      if (q.top !== `Which one shows ${words}?` || cardSay(q) !== q.say || !q.quiet || q.tiles.some(t => t.say !== 'this one')) bad.push('words ' + q.top + ' ' + q.say);
      if (new Set(q.shapes).size !== 3) bad.push('shapes ' + q.shapes);
      shapeSets.add(q.shapes.join());
      q.tiles.forEach((t, j) => {
        const d = new DOMParser().parseFromString(`<div>${t.html}</div>`, 'text/html'), polys = [...d.querySelectorAll('polygon')];
        const A = polys.map(p => area(p.getAttribute('points').split(' ').map(v => v.split(',').map(Number)))), mean = A.reduce((x, y) => x + y, 0) / A.length;
        const equal = A.every(a => Math.abs(a - mean) < 0.07 * mean), shaded = polys.filter(p => p.getAttribute('fill') !== '#fff').length;
        if (shaded !== 1) bad.push('shaded ' + shaded);
        if (j === q.right) { if (polys.length !== q.want || !equal) bad.push(`right tile ${polys.length} parts equal ${equal} for ${q.want}`); }
        else if ((polys.length === q.want && equal) || (polys.length === q.want && Math.max(...A) / Math.min(...A) < 1.5)) bad.push(`wrong tile ${polys.length} parts equal ${equal} for ${q.want}`);
        else if (polys.length !== q.want && !equal) bad.push('wrong tile cut both ways ' + polys.length);
        if (polys.length === 3 && q.shapes[j] === 'circle') bad.push('thirds of a circle');
      });
    }
    if (!asked[2] || !asked[4] || asked[2] < 180 || asked[4] < 180) bad.push('asked ' + JSON.stringify(asked));
    // written: dots in groups
    const wrote = {};
    for (let i = 0; i < 400; i++) {
      const q = shareQ(), n = q.g * q.k, d = new DOMParser().parseFromString(`<div>${shareSvg(q)}</div>`, 'text/html');
      wrote[q.g] = (wrote[q.g] || 0) + 1;
      if (d.querySelectorAll('circle').length !== n || d.querySelectorAll('line').length !== (q.g === 2 ? 1 : 2) || q.ans !== q.k || q.k < 1 || q.k > 10 || n > 20) bad.push('share ' + JSON.stringify(q));
      if (q.cap !== (q.g === 2 ? `Half of ${n}` : `A quarter of ${n}`) || q.say !== q.cap + '.' || (q.g === 4 && (q.k > 5 || n % 4))) bad.push('share words ' + q.cap);
    }
    if (!wrote[2] || !wrote[4]) bad.push('share kinds ' + JSON.stringify(wrote));
    return bad.slice(0, 4);
  });
  ok(hq.length === 0, 'Halves and quarters: one tile cut into equal parts with one shaded, the others unequal or the wrong number, three different shapes; written half of / a quarter of with dots in groups ' + hq.join(' | '));
  const cn = await page.evaluate(() => {
    const bad = [], asked = new Set();
    for (let i = 0; i < 600; i++) {
      const q = coinQ(), vs = q.tiles.map(t => t.v), notes = vs.filter(v => v >= 500).length;
      asked.add(q.v);
      if (!vs.includes(q.v) || new Set(vs).size !== vs.length || (notes && notes !== vs.length) || vs.length < 3 || vs.length > 4 || (notes && vs.length !== 3)) bad.push('tiles ' + vs + ' for ' + q.v);
      if (vs[q.right] !== q.v || q.ans !== q.tiles[q.right].label || q.tiles.some(t => t.say !== 'this one') || !q.quiet) bad.push('right ' + q.right);
      const kind = q.v >= 500 ? 'note' : 'coin', want = `Tap the ${q.v < 100 ? q.v + 'c' : '$' + q.v / 100} ${kind}`;
      if (q.top !== want || q.say !== `Tap the ${q.v < 100 ? q.v + ' cent' : q.v / 100 + ' dollar'} ${kind}.` || cardSay(q) !== q.say) bad.push('words ' + q.top + ' / ' + q.say);
      // real relative sizes: every coin drawn at the radius it has in the Money pictures
      q.tiles.forEach(t => { const r = t.html.match(/<circle[^>]* r="([\d.]+)"/); if (q.v < 500 && +r[1] !== COIN[t.v][0]) bad.push('size ' + t.v); });
    }
    if (asked.size !== 8) bad.push('asked ' + [...asked]);
    return bad.slice(0, 4);
  });
  ok(cn.length === 0, 'Which coin? three or four coins (or the three notes) at their real sizes, "Tap the 50c coin", spoken "50 cent", tiles say "this one" ' + cn.join(' | '));
  const lg = await page.evaluate(() => {
    const bad = [], trap = { most: [0, 0], least: [0, 0] }, kinds = {};
    for (let i = 0; i < 800; i++) {
      const q = longerQ();
      kinds[q.form] = (kinds[q.form] || 0) + 1;
      const d = new DOMParser().parseFromString(`<div>${q.top}</div>`, 'text/html');
      if (q.form === 'long') {
        const n = q.ls.length, so = [...q.ls].sort((a, b) => a - b);
        if (n < 2 || n > 3 || !so.every((x, j) => !j || x - so[j - 1] >= 2) || new Set(q.ss).size !== n || q.ls.some(l => l < 3 || l > 12) || q.ss.some(x => x < 0 || x > 5)) bad.push('pencils ' + q.ls + ' ' + q.ss);
        const want = (q.most ? Math.max : Math.min)(...q.ls);
        if (q.cols[q.ls.indexOf(want)] !== q.ans || q.tiles[q.right].label !== q.ans || q.tiles.length !== n || new Set(q.cols).size !== n) bad.push('answer ' + q.ans);
        // drawn at those lengths: each tip ends at (start + length) blocks
        const tips = [...d.querySelectorAll('polygon')].filter(p => p.getAttribute('fill') === '#f3dcb0').map(p => Math.max(...p.getAttribute('points').split(' ').map(v => +v.split(',')[0])));
        if (tips.join() !== q.ls.map((l, j) => (q.ss[j] + l) * 10).join()) bad.push('drawn ' + tips + ' vs ' + q.ls.map((l, j) => (q.ss[j] + l) * 10));
        const words = n === 2 ? `Which is ${q.most ? 'longer' : 'shorter'}?` : `Tap the ${q.most ? 'longest' : 'shortest'}`;
        if (q.say !== words || cardSay(q) !== `${words} ${q.tiles.map(t => t.say).join(', ')}.`) bad.push('say ' + cardSay(q));
        // the furthest end (longest) or the earliest end (shortest) belongs to the answer's pencil or not
        const ends = q.ls.map((l, j) => q.ss[j] + l), edge = q.most ? ends.indexOf(Math.max(...ends)) : ends.indexOf(Math.min(...ends)), t = trap[q.most ? 'most' : 'least'];
        t[1]++; if (edge !== q.ls.indexOf(want)) t[0]++;
      } else {
        if (q.hs.length !== 2 || Math.abs(q.hs[0] - q.hs[1]) < 2 || q.hs.some(h => h < 2 || h > 8)) bad.push('towers ' + q.hs);
        const want = (q.tall ? Math.max : Math.min)(...q.hs);
        if (q.cols[q.hs.indexOf(want)] !== q.ans || q.tiles[q.right].label !== q.ans || q.say !== `Which is ${q.tall ? 'taller' : 'shorter'}?`) bad.push('tower answer ' + q.ans);
        if (d.querySelectorAll('rect').length !== q.hs[0] + q.hs[1]) bad.push('blocks ' + d.querySelectorAll('rect').length);
      }
    }
    for (const [k, [a, b]] of Object.entries(trap)) if (a / b < 0.35 || a / b > 0.85) bad.push(`trap share ${k} ${a}/${b}`);
    if (!kinds.long || !kinds.tower || kinds.tower / (kinds.long + kinds.tower) < 0.25 || kinds.tower / (kinds.long + kinds.tower) > 0.45) bad.push('mix ' + JSON.stringify(kinds));
    const mix = range(0, 400).map(() => rulerQ(1, ['pencil', 'longer'])).filter(q => q.kind === 'tap').length;
    if (mix < 140 || mix > 260) bad.push('Pencil + Longer mix ' + mix);
    if (!range(0, 60).every(() => rulerQ(1, ['longer']).kind === 'tap' && rulerQ(2, ['longer']).kind === 'ruler' && rulerQ(1, ['pencil']).kind === 'ruler' && rulerQ(4, ['longer']).kind === 'ruler')) bad.push('Longer outside Year 1');
    return bad.slice(0, 4);
  });
  ok(lg.length === 0, 'Which is longer? pencils (two or three, different starts, lengths 2 apart, drawn at their lengths, the end often misleads) and towers of blocks; tiles are the colours; only in Year 1 ' + lg.join(' | '));
  await page.evaluate(() => { age = 5; hideDone(); act = 'splat'; buildSheet({ yr: 1, n: 6 }); show('sheet'); });
  ok(await page.evaluate(() => cards.every(c => c.q.kind === 'splat' && c.el.querySelector('.cap b') && c.el.querySelectorAll('.qv svg').length === 1)), 'Splat sheet: the numeral, the frames with a blot');
  ok((await fits()).length === 0, 'Splat fits ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/49-splat.png' });
  ok((await writeAllAndMark()).length === 0 && await page.evaluate(() => sheetDone && loadRec(current).history[0].k === 'splat~1|6'), 'Splat: written right, finished, record splat~1|6');
  await page.evaluate(() => { hideDone(); buildSheet({ yr: 1, n: 12 }); });
  ok((await fits()).length === 0, 'Splat (12) fits ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/50-splat12.png' });
  await page.evaluate(() => { hideDone(); act = 'parts'; buildSheet({ yr: 1, kinds: ['tap', 'write'], n: 12 }); show('sheet'); });
  ok(await page.evaluate(() => cards.some(c => c.q.kind === 'tap') && cards.some(c => c.q.kind === 'share') && cards.filter(c => c.q.kind === 'tap').every(c => c.el.querySelectorAll('.tt svg').length === 3)), 'Halves and quarters sheet: three shape tiles on the tap cards, dots on the written ones');
  ok((await fits()).length === 0, 'Halves and quarters fits ' + (await fits()).join(' '));
  ok(await page.evaluate(() => cards.filter(c => c.q.kind === 'tap').every(c => c.el.querySelector('.tt').getBoundingClientRect().width >= 40)), 'Halves and quarters: tiles big enough to tap');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/51-parts.png' });
  ok((await writeAllAndMark()).length === 0 && await page.evaluate(() => sheetDone && loadRec(current).history[0].k === 'parts~1|tap,write|12'), 'Halves and quarters: tapped and written right, record parts~1|tap,write|12');
  await page.evaluate(() => { hideDone(); act = 'money'; buildSheet({ yr: 1, kinds: ['coin'], n: 12 }); show('sheet'); });
  ok(await page.evaluate(() => cards.every(c => c.q.form === 'coin' && c.el.querySelectorAll('.tt svg').length === c.q.tiles.length)), 'Money Which coin? sheet: a coin or note on every tile');
  ok((await fits()).length === 0, 'Which coin? fits ' + (await fits()).join(' '));
  ok(await page.evaluate(() => cards.every(c => [...c.el.querySelectorAll('.tt')].every(t => { const b = t.getBoundingClientRect(), s = t.querySelector('svg').getBoundingClientRect(); return b.width >= 40 && s.width <= b.width + 0.5 && s.height <= b.height + 0.5; }))), 'Which coin?: every coin and note sits inside its tile, tiles big enough to tap');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/52-coin.png' });
  await page.tap('#sheet .card:nth-child(1) .tt[data-i="0"]');
  ok((await said()).slice(-1)[0] === 'this one', 'a tapped coin says "this one", not its value');
  ok((await writeAllAndMark()).length === 0, 'Which coin?: all marked right');
  await page.evaluate(() => { hideDone(); act = 'ruler'; buildSheet({ yr: 1, kinds: ['longer'], n: 12 }); show('sheet'); });
  ok(await page.evaluate(() => cards.every(c => c.q.kind === 'tap' && c.el.querySelectorAll('.tt .tsw').length === c.q.tiles.length)), 'Rulers Which is longer? sheet: a colour swatch on every tile');
  ok((await fits()).length === 0, 'Which is longer? fits ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/53-longer.png' });
  ok((await writeAllAndMark()).length === 0, 'Which is longer?: tapped right and marked');
  await page.evaluate(() => { age = 8; hideDone(); });
  ok(await page.evaluate(() => [ACTS.money.key({ yr: 1, kinds: ['count', 'coin'], n: 6 }), ACTS.money.key({ yr: 3, kinds: ['count', 'coin'], n: 6 }), ACTS.money.defaults(5).kinds.filter(k => k !== 'make').join(), ACTS.ruler.key({ yr: 1, kinds: ['pencil'], n: 6 }), ACTS.ruler.key({ yr: 1, kinds: ['pencil', 'longer'], n: 6 }), ACTS.ruler.key({ yr: 1, kinds: ['longer'], n: 6 }), ACTS.ruler.key({ yr: 2, kinds: ['pencil', 'longer'], n: 6 }), ACTS.ruler.defaults(5).kinds.join(),
      labelFor('money~1|count,coin|6'), labelFor('ruler~1|6'), labelFor('ruler~1|longer|6'), labelFor('ruler~1|pencil,longer|6'), labelFor('splat~1|6'), labelFor('parts~1|tap,write|6')].join(' / '))
    === 'money~1|count,coin|6 / money~3|count|6 / count,coin / ruler~1|6 / ruler~1|pencil,longer|6 / ruler~1|longer|6 / ruler~2|6 / pencil,longer,scales,jug / Money · Year 1 · how much, which coin · 6 questions / Rulers · Year 1 · 6 questions / Rulers · Year 1 · which is longer · 6 questions / Rulers · Year 1 · pencil, which is longer · 6 questions / Splat · Year 1 · 6 questions / Halves and quarters · Year 1 · which one, half of a number · 6 questions',
    'B4 record keys: Which coin? only in Year 1 keys, Which is longer? only in Year 1; old Year 1 pencil keys unchanged; labels');

  // ---- how many questions (Sam: 20 is too many almost everywhere)
  await page.click('#backBtn');
  const nOpts = () => page.$$eval('#nOpts button', b => b.map(x => x.dataset.v).join());
  for (const [a, want] of [['sums', '6,12,20'], ['missing', '6,12,20'], ['story', '4,6'], ['graph', '6,12'], ['bal', '6,12']]) {
    await page.click(`#actTiles [data-act="${a}"]`);
    ok(await nOpts() === want, `${a}: Questions ${want} ` + await nOpts());
    await page.click('#backBtn');
  }
  ok(await page.evaluate(() => {
    const keep = localStorage.getItem(cfgStoreKey('sums'));
    store.set(cfgStoreKey('graph'), { yr: 4, n: 20 }); store.set(cfgStoreKey('story'), { yr: 4, kinds: ['addsub'], n: 12 }); store.set(cfgStoreKey('sums'), { ...ACTS.sums.defaults(8), n: 20 });
    const r = loadCfg('graph').n === 12 && loadCfg('story').n === 6 && loadCfg('sums').n === 20;
    localStorage.setItem(cfgStoreKey('sums'), keep); // her own Sums settings back, for the keypad tests later
    return r;
  }), 'a saved 20 falls back to 12 (6 on Story sums); the keypad Sums keeps 20');
  await page.click('#actTiles [data-act="story"]');
  ok(await page.evaluate(() => draft.n === 6 && $('#nOpts [aria-pressed="true"]').dataset.v === '6'), 'Story sums setup shows the fallback chosen');
  await page.click('#backBtn');
  ok(await page.evaluate(() => labelFor('graph~4|20') === 'Graphs · Year 4 · 20 questions' && labelFor('story~3|addsub|12') === 'Story sums · Year 3 · + − · 12 questions'), 'old records with 20 (or 12 stories) keep their labels');

  // ---- Decimals, Year 4: tenths
  const decq = await page.evaluate(() => {
    const bad = [], forms = {};
    let crossed = 0, adds = 0, link = 0, pics = 0;
    for (const kind of ['pic', 'line', 'addsub', 'ten']) for (let i = 0; i < 500; i++) {
      const q = decQ(4, [kind]), f = q.form || 'whole';
      forms[kind + ':' + f] = 1;
      if (q.kind === 'dec') {
        const v = q.v;
        if (!q.two || q.dp !== 1 || q.parts[0] !== Math.floor(v / 10) || q.parts[1] !== v % 10 || q.parts[1] === 0 || q.ans !== (v / 10).toFixed(1)) bad.push('parts ' + JSON.stringify(q));
        if (f === 'bars' && (v < 1 || v > 29)) bad.push('bars ' + v);
        if (f === 'line' && (v < 1 || v > 19 || v === 10)) bad.push('line ' + v);
        if (f === 'frac' && q.n * 10 / q.d !== v) bad.push('frac ' + JSON.stringify(q));
        if (kind === 'pic') { pics++; if (f === 'frac') link++; }
      }
      if (f === 'expr' || f === 'whole') {
        const [a, op, b] = q.text.split(' '), x = Math.round(+a * 10), y = Math.round(+b * 10);
        const want = op === '+' ? x + y : op === '−' ? x - y : op === '÷' ? x * 10 / y : x * y / 10; // in tenths, except × 10 (whole)
        if (kind === 'addsub') { adds++; if (op === '+' ? x % 10 + y % 10 > 10 : x % 10 < y % 10) crossed++; if (want !== q.v || q.v <= 0) bad.push('addsub ' + q.text + ' ' + q.ans); }
        if (op === '÷' && (want !== q.v || +a % 10 === 0)) bad.push('div ' + q.text + ' ' + q.ans);
        if (op === '×' && (q.kind !== 'expr' || q.ans !== Math.round(+a * 10))) bad.push('times ' + q.text + ' ' + q.ans);
      }
    }
    if (crossed / adds < 0.2 || crossed / adds > 0.47) bad.push('crossing a whole ' + crossed + '/' + adds);
    if (link / pics < 0.15 || link / pics > 0.35) bad.push('fraction link ' + link + '/' + pics);
    if (Object.keys(forms).sort().join() !== 'addsub:expr,line:line,pic:bars,pic:frac,ten:expr,ten:whole') bad.push('forms ' + Object.keys(forms));
    return bad.slice(0, 4);
  });
  ok(decq.length === 0, 'Decimals Year 4: pictures to 2.9, a line from 0 to 2, 3/10 and 1/2, + and − (a third cross a whole), ÷ 10 to tenths, × 10 to wholes; never a whole answer in two blanks ' + decq.join(' | '));
  await page.click('#actTiles [data-act="dec"]');
  ok(await page.evaluate(() => draft.yr === 4 && draft.kinds.join() === 'pic,line,addsub,ten' && $('#optBlock [data-key="yr"]').children.length === 2), 'Decimals setup: Years 4 and 5, Year 4 chosen, all four kinds');
  await page.click('#newBtn');
  ok(await page.evaluate(() => cards.every(c => c.q.kind === 'expr' || (c.el.querySelectorAll('.ans .ln').length === 2 && c.el.querySelector('.ans .sep').textContent === '.'))), 'Decimals cards: two blanks round a printed point (one line for a whole answer)');
  ok((await fits()).length === 0, 'Decimals fit ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/37-dec.png' });
  ok((await writeAllAndMark()).length === 0, 'Decimals: answers read and marked right');
  for (const k of ['pic', 'line', 'addsub', 'ten']) {
    await page.evaluate(k => { hideDone(); buildSheet({ yr: 4, kinds: [k], n: 12 }); }, k);
    ok((await fits()).length === 0, `Decimals (${k} only) fits ` + (await fits()).join(' '));
    if (SHOTS) await page.screenshot({ path: SHOTS + `/37-dec-${k}.png` });
    ok((await writeAllAndMark()).length === 0, `Decimals (${k} only): read and marked right`);
  }
  const dr = await page.evaluate(() => {
    hideDone(); buildSheet({ yr: 4, kinds: ['line'], n: 6 });
    const c = cards[0], out = {};
    const at = (v, w) => { c.q = decTwo(v, { form: 'line' }); layout(c); sizeCanvas(c); writeNum(c, w); return readAnswer(c); };
    let r = at(13, ['1', '3']); out.plain = r.ok && r.text === '1.3';
    out.trailing = at(13, ['1', '30']).ok;           // 1.30 is 1.3
    out.places = !at(13, ['1', '03']).ok;            // 1.03 is not
    out.swapped = !at(13, ['3', '1']).ok;
    r = at(7, ['', '7']); out.noZero = r.ok && r.text === '.7'; // ".7" for 0.7
    out.zero = at(7, ['0', '7']).ok;
    out.wrongWhole = !at(7, ['1', '7']).ok;
    // all on one side, with her own point between the digits
    c.q = decTwo(13, { form: 'line' }); layout(c); sizeCanvas(c);
    c.strokes = [...numStrokes('1', -2.2, -1.05, 0.85), [[-2.0, -0.12], [-2.02, -0.1]], ...numStrokes('3', -0.6, -1.05, 0.85)]; draw(c);
    out.ownPoint = readAnswer(c).ok;
    c.strokes = numStrokes('13', -0.6, -1.05, 0.85); out.noPoint = readAnswer(c).ok; // 13 squeezed left of the point: the last digit is the tenths
    return out;
  });
  ok(Object.values(dr).every(Boolean), 'Decimals reading: 1.3 and 1.30 right, 1.03 and 3.1 wrong, 0.7 with or without the 0, her own point, both digits on one side ' + JSON.stringify(dr));
  ok(await page.evaluate(() => [labelFor('dec~4|pic,line,addsub,ten|12'), labelFor('dec~4|addsub|6')].join(' / '))
    === 'Decimals · Year 4 · picture, number line, + −, × ÷ 10 · 12 questions / Decimals · Year 4 · + − · 6 questions', 'record labels for Decimals');
  ok(await page.evaluate(() => [cardSay(decQ(4, ['addsub'])), cardSay({ kind: 'dec', form: 'frac', n: 3, d: 10, say: '3 over 10. Write it as a decimal.' })].every(s => /^\d\.\d (plus|take away) \d\.\d$|^3 over 10/.test(s))), 'Decimals sums are read aloud');

  // ---- Change units (Year 4: time), A6b
  const uq = await page.evaluate(() => {
    const bad = [], K = { weeks: 7, days: 1, hours: 1 / 24, minutes: 1 / 1440, seconds: 1 / 86400, years: 365, months: 365 / 12, h: 1 / 24, min: 1 / 1440, s: 1 / 86400 };
    let two = 0, mixed = 0;
    const toDays = t => { const p = t.split(' '); let v = 0; for (let i = 0; i < p.length; i += 2) v += +p[i] * K[p[i + 1]]; return v; };
    for (let i = 0; i < 1500; i++) {
      const q = unitsQ(4);
      if (q.kind !== 'unit') { bad.push('kind ' + q.kind); continue; }
      const have = toDays(q.text);
      if (q.two) {
        two++;
        const [a, b] = q.parts;
        if (a < 1 || b < 1 || b > 59 || !Number.isInteger(a) || !Number.isInteger(b) || Math.abs(toDays(`${a} ${q.u1} ${b} ${q.u2}`) - have) > 1e-9) bad.push('two ' + q.text + ' ' + q.parts);
      } else {
        if (q.text.split(' ').length === 4) mixed++;
        if (!Number.isInteger(q.ans) || q.ans < 1 || Math.abs(q.ans * K[q.unit] - have) > 1e-9) bad.push('one ' + q.text + ' = ' + q.ans + ' ' + q.unit);
      }
      if (!/How many/.test(q.say) || /\b(h|min|s)\b/.test(q.say)) bad.push('say ' + q.say);
    }
    if (two < 150 || two > 350 || mixed < 150 || mixed > 350) bad.push(`mixed ${two} ${mixed}`);
    return bad.slice(0, 4);
  });
  ok(uq.length === 0, 'Change units Year 4: weeks, days, hours, minutes, seconds, months and years both ways, whole answers; about a third mixed (100 minutes = 1 h 40 min, and back) ' + uq.join(' | '));
  await page.click('#backBtn');
  await page.click('#actTiles [data-act="units"]');
  ok(await page.evaluate(() => draft.yr === 4 && $('#optBlock [data-key="yr"]').children.length === 2 && !$('#optBlock [data-key="kinds"]')), 'Change units setup: just a Year row (Years 4 and 5), on Year 4');
  await page.click('#newBtn');
  ok(await page.evaluate(() => cards.every(c => c.q.two ? c.el.querySelectorAll('.ans .ln').length === 2 && c.el.querySelector('.ans .sep').textContent === c.q.u1 : c.el.querySelectorAll('.ans .ln').length === 1 && c.el.querySelector('.ans .u:last-child').textContent === c.q.unit)), 'Change units cards: "= ___ days", or "= __ h __ min"');
  ok((await fits()).length === 0, 'Change units fit ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/42-units.png' });
  ok((await writeAllAndMark()).length === 0, 'Change units: answers read and marked right');
  const ur = await page.evaluate(() => {
    hideDone(); buildSheet({ yr: 4, n: 6 });
    const c = cards[0], out = {};
    c.q = { kind: 'unit', text: '100 minutes', u1: 'h', u2: 'min', two: true, parts: [1, 40], ans: '1 h 40 min', say: '' }; layout(c); sizeCanvas(c);
    writeNum(c, ['1', '40']); let r = readAnswer(c); out.plain = r.ok && r.text === '1 h 40 min';
    writeNum(c, ['40', '1']); out.swapped = !readAnswer(c).ok;
    writeNum(c, ['1', '20']); out.wrong = !readAnswer(c).ok;
    c.strokes = numStrokes('140', -0.6, -1.05, 0.85); draw(c); out.oneSide = readAnswer(c).ok; // all left of the "h": the last two digits are the minutes
    c.q = { kind: 'unit', text: '3 weeks', unit: 'days', ans: 21, say: '' }; layout(c); sizeCanvas(c);
    writeNum(c, 21); out.single = readAnswer(c).ok && read(c) === '21';
    writeNum(c, 3); out.singleWrong = !readAnswer(c).ok;
    return out;
  });
  ok(Object.values(ur).every(Boolean), 'Change units reading: 1 h 40 min right in its blanks or squeezed on one side, swapped or wrong is wrong; 3 weeks = 21 days ' + JSON.stringify(ur));
  ok(await page.evaluate(() => labelFor('units~4|12') === 'Change units · Year 4 · 12 questions' && cardSay(unitsQ(4)).includes('How many')), 'Change units record label, read aloud');

  // ---- Angles (Year 4): smaller than, a right angle, or bigger; degrees in a turn. A6b
  const aq = await page.evaluate(() => {
    const bad = [], seen = [0, 0, 0], deg = {};
    for (let i = 0; i < 900; i++) {
      const q = angleQ(4, ['size']);
      if (q.kind !== 'tap' || q.tiles.length !== 3) { bad.push('tiles'); continue; }
      seen[q.right]++;
      if (q.a !== 90 && Math.abs(q.a - 90) < 12) bad.push('near 90: ' + q.a);
      if ((q.a < 90 ? 0 : q.a === 90 ? 1 : 2) !== q.right) bad.push('right ' + q.a + ' ' + q.right);
      if (q.a < 15 || q.a > 170) bad.push('size ' + q.a);
    }
    if (seen.some(k => k < 200)) bad.push('spread ' + seen);
    for (let i = 0; i < 300; i++) {
      const q = angleQ(4, ['deg']); deg[q.w] = q.ans;
      if (q.form !== 'deg' || q.tiles.map(t => t.label).join() !== '90°,180°,360°') bad.push('deg tiles');
    }
    const want = { 'quarter turn': '90°', 'half turn': '180°', 'full turn': '360°', 'right angle': '90°' };
    if (Object.keys(deg).length !== 4 || Object.keys(want).some(w => deg[w] !== want[w])) bad.push('degrees ' + JSON.stringify(deg));
    return bad.slice(0, 4);
  });
  ok(aq.length === 0, 'Angles Year 4: about a third each smaller, right and bigger, never within 12° of 90 unless 90; a quarter turn and a right angle are 90°, a half turn 180°, a full turn 360° ' + aq.join(' | '));
  await page.click('#backBtn');
  await page.click('#actTiles [data-act="angle"]');
  ok(await page.evaluate(() => draft.yr === 4 && draft.kinds.join() === 'size,deg,name,measure' && $('#optBlock [data-key="yr"]').children.length === 2), 'Angles setup: Year 4 (of 4 and 5), every kind on');
  await page.click('#newBtn');
  ok(await page.evaluate(() => cards.length === 12 && cards.every(c => c.q.kind === 'tap' && c.el.querySelectorAll('.tt').length === 3 && c.el.querySelector('.tq svg'))), 'Angles sheet: a picture and three tiles on every card');
  ok((await fits()).length === 0, 'Angles fit, with tiles big enough to tap ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/43-angles.png' });
  ok(await page.evaluate(() => { const c = cards[0]; c.pick = [(c.q.right + 1) % 3]; paintTap(c); const a = !readAnswer(c).ok; c.pick = [c.q.right]; return a && readAnswer(c).ok; }), 'Angles: the wrong tile is wrong, the right one right');
  ok((await writeAllAndMark()).length === 0, 'Angles: the whole sheet tapped right is marked right');
  ok(await page.evaluate(() => [labelFor('angle~4|size,deg|12'), labelFor('angle~4|deg|6')].join(' / ') === 'Angles · Year 4 · right angle?, degrees · 12 questions / Angles · Year 4 · degrees · 6 questions'), 'Angles record labels');
  ok(await page.evaluate(() => cardSay(angleQ(4, ['size'])) === 'Is it smaller than a right angle, a right angle, or bigger? smaller than a right angle, a right angle, bigger than a right angle.' && /^A (quarter turn|half turn|full turn|right angle) is how many degrees\? 90 degrees, 180 degrees, 360 degrees\.$/.test(cardSay(angleQ(4, ['deg'])))), 'Angles read aloud: the question then each tile');

  // ---- Year 5 measuring (C3a): Angles names and protractor, Clocks 24-hour and How long?, Change units length
  const a5 = await page.evaluate(() => {
    const bad = [], seen = {}, sides = [0, 0];
    const ok = { acute: a => a > 0 && a < 90, right: a => a === 90, obtuse: a => a > 90 && a < 180, straight: a => a === 180, reflex: a => a > 180 && a < 360 };
    for (let i = 0; i < 800; i++) {
      const q = angleQ(5, ['name']);
      if (q.form !== 'name' || q.tiles.map(t => t.label).join() !== 'acute,right,obtuse,straight,reflex') { bad.push('tiles'); continue; }
      const w = q.tiles[q.right].label; seen[w] = (seen[w] || 0) + 1;
      if (!ok[w](q.a) || (w === 'acute' && q.a > 78) || (w === 'obtuse' && (q.a < 102 || q.a > 168)) || (w === 'reflex' && (q.a < 195 || q.a > 345))) bad.push(w + ' ' + q.a);
    }
    if (Object.keys(seen).length !== 5 || Object.values(seen).some(k => k < 60)) bad.push('spread ' + JSON.stringify(seen));
    for (let i = 0; i < 400; i++) {
      const q = angleQ(5, ['measure']); sides[+q.left]++;
      if (q.kind !== 'prot' || q.a % 5 || q.a < 10 || q.a > 180 || q.ans !== q.a || q.unit !== '°') bad.push('measure ' + JSON.stringify(q));
    }
    if (sides.some(k => k < 120)) bad.push('zero side ' + sides);
    // the protractor: 19 labels, 0 at the end where the fixed arm lies, and the other arm points at the answer
    const q = { a: 40, left: true }, d = document.createElement('div'); d.innerHTML = protSvg(q);
    const labs = [...d.querySelectorAll('text')].map(t => [+t.getAttribute('x'), t.textContent]);
    if (labs.length !== 19 || labs.find(l => l[1] === '0')[0] > 0 || labs.find(l => l[1] === '180')[0] < 0) bad.push('labels ' + JSON.stringify(labs));
    // a year uses only its own kinds; none left: all of that year's
    for (let i = 0; i < 60; i++) {
      if (!['size', 'deg'].includes(angleQ(4, ['size', 'deg', 'name', 'measure']).form)) bad.push('Year 4 got a Year 5 kind');
      const q5 = angleQ(5, ['size', 'deg']); if (!(q5.form === 'name' || q5.kind === 'prot')) bad.push('Year 5 fallback');
    }
    return bad.slice(0, 4);
  });
  ok(a5.length === 0, 'Angles Year 5: Name (acute, right, obtuse, straight, reflex, well clear of the edges) and Measure (multiples of 5 to 180, zero on either side); each year only its own kinds ' + a5.join(' | '));
  await page.evaluate(() => { hideDone(); act = 'angle'; buildSheet({ yr: 5, kinds: ['name', 'measure'], n: 12 }); show('sheet'); });
  ok(await page.evaluate(() => cards.some(c => c.q.kind === 'prot') && cards.some(c => c.q.form === 'name') && cards.filter(c => c.q.form === 'name').every(c => c.el.querySelectorAll('.tiles.wrap .tt').length === 5) && cards.filter(c => c.q.kind === 'prot').every(c => c.el.querySelectorAll('svg text').length === 19 && c.el.querySelector('.ans .u').textContent === '°')), 'Angles Year 5 sheet: five word tiles, or a protractor and "___ °"');
  ok((await fits()).length === 0, 'Angles Year 5 fit, word tiles big enough to tap ' + (await fits()).join(' '));
  ok(await page.evaluate(() => cards.filter(c => c.q.form === 'name').every(c => [...c.el.querySelectorAll('.tt')].every(b => b.scrollWidth <= b.clientWidth + 1))), 'Angles names: every word fits inside its tile');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/44-angles5.png' });
  ok((await writeAllAndMark()).length === 0, 'Angles Year 5: names tapped and degrees written are marked right');
  ok(await page.evaluate(() => [ACTS.angle.key({ yr: 4, kinds: ['size', 'deg', 'name', 'measure'], n: 12 }), ACTS.angle.key({ yr: 5, kinds: ['size', 'deg', 'name', 'measure'], n: 12 }), ACTS.angle.key({ yr: 5, kinds: ['deg'], n: 6 }), labelFor('angle~5|name,measure|12')].join(' / ')
    === 'angle~4|size,deg|12 / angle~5|name,measure|12 / angle~5|name,measure|6 / Angles · Year 5 · names, measure · 12 questions'), 'Angles record keys keep only that year\'s kinds; Year 5 label');

  const k5 = await page.evaluate(() => {
    const bad = [], toMin = t => { const m = t.match(/^(\d{1,2}):(\d\d)(?: ([ap])\.m\.)?$/); if (!m) return NaN; let H = +m[1]; if (m[3]) { if (H > 12 || H < 1) return NaN; H = H % 12 + (m[3] === 'p' ? 12 : 0); } return H * 60 + +m[2]; };
    let ap = 0, pm = 0, words = 0;
    for (let i = 0; i < 1000; i++) {
      const q = ACTS.clock.make({ yr: 5, kinds: ['face', 'words'], n: 12 }), [H, m] = q.parts;
      const add = q.period === 'in the morning' ? 0 : 12;
      if (q.kind !== 'clock' || !q.two || !q.period || H !== q.h + add || m !== q.m || H < 5 || H > 22 || q.ans !== `${H}:${String(m).padStart(2, '0')}`) bad.push('24 ' + JSON.stringify(q));
      if (q.period === 'in the morning' && q.h === 11 && q.m > 30) bad.push('to 12 in the morning');
      if (H >= 12) pm++; if (q.words) words++;
    }
    if (pm < 450 || words < 350 || words > 650) bad.push(`spread pm ${pm} words ${words}`);
    for (let i = 0; i < 800; i++) {
      const q = ACTS.clock.make({ yr: 5, kinds: ['long'], n: 12 }), [h, m] = q.parts, [s, e] = q.times.map(toMin);
      if (q.kind !== 'unit' || q.u1 !== 'h' || q.u2 !== 'min' || !(e - s === h * 60 + m) || h < 1 || h > 4 || m < 5 || m > 55 || m % 5 || s % 5 || e > 23 * 60 + 59 || !/^How long is it from .+ to .+\?$/.test(q.say)) bad.push('long ' + JSON.stringify(q));
      if (/m\.$/.test(q.times[0])) ap++;
    }
    if (ap < 300 || ap > 500) bad.push('a.m./p.m. ' + ap);
    for (let i = 0; i < 100; i++) { const q = ACTS.clock.make({ yr: 4, kinds: ['long'], n: 12 }); if (q.kind !== 'clock' || q.period) bad.push('Year 4 with How long?'); }
    return bad.slice(0, 4);
  });
  ok(k5.length === 0, 'Clocks Year 5: face or words with the part of the day, written in 24-hour time; How long? 1 to 4 hours and some minutes, a.m./p.m. or 24-hour; Year 4 ignores How long? ' + k5.join(' | '));
  await page.evaluate(() => { hideDone(); act = 'clock'; buildSheet({ yr: 5, kinds: ['face', 'words', 'long'], n: 12 }); show('sheet'); });
  ok(await page.evaluate(() => cards.every(c => c.q.kind === 'unit' ? c.el.querySelector('.cap').textContent === 'How long?' && c.el.querySelector('.ans .sep').textContent === 'h' && !c.el.querySelector('.ans').textContent.includes('=') : c.el.querySelector('.cap').textContent.includes('24-hour time') && c.el.querySelector('.qv').textContent.includes(c.q.period))), 'Clocks Year 5 cards: "24-hour time" and the part of the day; How long? with "__ h __ min" and no "="');
  ok((await fits()).length === 0, 'Clocks Year 5 fit ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/45-clocks5.png' });
  ok((await writeAllAndMark()).length === 0, 'Clocks Year 5: answers read and marked right');
  const cr5 = await page.evaluate(() => {
    hideDone(); buildSheet({ yr: 5, kinds: ['face'], n: 6 });
    const c = cards[0], out = {};
    c.q = { kind: 'clock', h: 3, m: 15, words: null, period: 'in the afternoon', ticks: true, two: true, parts: [15, 15], ans: '15:15' }; layout(c); sizeCanvas(c);
    writeNum(c, ['15', '15']); out.right = readAnswer(c).ok && read(c) === '15:15';
    writeNum(c, ['3', '15']); out.twelveHour = !readAnswer(c).ok;
    c.q = { kind: 'clock', h: 7, m: 5, words: null, period: 'in the morning', ticks: true, two: true, parts: [7, 5], ans: '7:05' }; layout(c); sizeCanvas(c);
    writeNum(c, ['07', '05']); out.leadingZero = readAnswer(c).ok;
    return out;
  });
  ok(Object.values(cr5).every(Boolean), 'Clocks Year 5 reading: 15:15 right, 3:15 wrong in the afternoon, 07:05 right ' + JSON.stringify(cr5));
  ok(await page.evaluate(() => [ACTS.clock.key({ yr: 5, kinds: ['face', 'words', 'long'], n: 12 }), ACTS.clock.key({ yr: 4, kinds: ['face', 'words', 'long'], n: 12 }), labelFor('clock~5|face,words,long|12')].join(' / ')
    === 'clock~5|face,words,long|12 / clock~4|face,words|12 / Clocks · Year 5 · clock, words, how long? · 12 questions'), 'Clocks record keys: How long? only in Year 5; label');

  const u5 = await page.evaluate(() => {
    const bad = [], MM = { km: 1e6, m: 1000, cm: 10, mm: 1 }, seen = {};
    let dp = 0;
    const val = t => { const p = t.split(' '); let v = 0; for (let i = 0; i < p.length; i += 2) v += +p[i] * MM[p[i + 1]]; return Math.round(v * 1000) / 1000; };
    for (let i = 0; i < 1500; i++) {
      const q = unitsQ(5), have = val(q.text);
      seen[q.text.split(' ').slice(-1)[0]] = 1;
      if (q.kind !== 'unit' || !have) { bad.push('q ' + JSON.stringify(q)); continue; }
      if (q.dp) {
        dp++;
        const [a, b] = q.parts, got = Math.round(+`${a}.${String(b).padStart(q.dp, '0')}` * MM[q.unit] * 1000) / 1000;
        if (got !== have || b < 1 || String(b).length > q.dp || !q.say.includes('decimal point')) bad.push('dp ' + JSON.stringify(q));
      } else if (q.two) {
        const [a, b] = q.parts;
        if (a * MM[q.u1] + b * MM[q.u2] !== have || b < 1 || b * MM[q.u2] >= MM[q.u1]) bad.push('two ' + JSON.stringify(q));
      } else if (!Number.isInteger(q.ans) || q.ans < 1 || Math.round(q.ans * MM[q.unit] * 1000) / 1000 !== have) bad.push('one ' + JSON.stringify(q));
      if (!/How many (kilo|centi|milli)?metres/.test(q.say) || /\d (km|m|cm|mm)\b/.test(q.say)) bad.push('say ' + q.say);
    }
    if (dp < 150 || dp > 600 || Object.keys(seen).sort().join() !== 'cm,km,m,mm') bad.push(`spread dp ${dp} ${Object.keys(seen)}`);
    return bad.slice(0, 4);
  });
  ok(u5.length === 0, 'Change units Year 5: m and cm with decimals, km and m, cm and mm, every answer right; decimals as "__ . __" ' + u5.join(' | '));
  await page.evaluate(() => { hideDone(); act = 'units'; buildSheet({ yr: 5, n: 12 }); show('sheet'); });
  ok(await page.evaluate(() => cards.filter(c => c.q.dp).every(c => c.el.querySelector('.ans .sep.pt') && c.el.querySelector('.ans .u:last-child').textContent === c.q.unit)), 'Change units Year 5 cards: decimals as "= __ . __ m"');
  ok((await fits()).length === 0, 'Change units Year 5 fit ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/46-units5.png' });
  ok((await writeAllAndMark()).length === 0, 'Change units Year 5: answers read and marked right');
  const ur5 = await page.evaluate(() => {
    hideDone(); buildSheet({ yr: 5, n: 6 });
    const c = cards[0], out = {};
    c.q = { kind: 'unit', text: '180 cm', unit: 'm', two: true, dp: 2, parts: [1, 80], ans: '1.8', say: '' }; layout(c); sizeCanvas(c);
    writeNum(c, ['1', '8']); out.short = readAnswer(c).ok && read(c) === '1.8';
    writeNum(c, ['1', '80']); out.zero = readAnswer(c).ok;
    writeNum(c, ['1', '08']); out.wrong = !readAnswer(c).ok;
    c.q = { kind: 'unit', text: '2 m 5 cm', unit: 'm', two: true, dp: 2, parts: [2, 5], ans: '2.05', say: '' }; layout(c); sizeCanvas(c);
    writeNum(c, ['2', '05']); out.place = readAnswer(c).ok;
    writeNum(c, ['2', '5']); out.notFive = !readAnswer(c).ok;
    return out;
  });
  ok(Object.values(ur5).every(Boolean), 'Change units Year 5 reading: 1.8 and 1.80 right, 1.08 wrong; 2.05 needs the 0 ' + JSON.stringify(ur5));
  ok(await page.evaluate(() => labelFor('units~5|12') === 'Change units · Year 5 · 12 questions'), 'Change units Year 5 record label');

  // ---- Map (Year 4): tap a grid reference, or say where a shape is. A7
  const mq = await page.evaluate(() => {
    const bad = [], seen = new Set(), swapped = [0, 0];
    for (let i = 0; i < 600; i++) {
      const q = mapQ(4, ['tap', 'where']);
      if (q.things.length < 3 || q.things.length > 4 || new Set(q.things.map(t => t.nm)).size !== q.things.length || new Set(q.things.map(t => t.col)).size !== q.things.length || new Set(q.things.map(t => t.x + ',' + t.y)).size !== q.things.length) bad.push('things ' + JSON.stringify(q.things));
      if (q.form === 'tap') {
        seen.add(q.ans);
        const t = q.tiles[q.right];
        if (q.tiles.length !== 25 || q.cells !== 5 || t.label !== q.ans || q.top !== 'Tap ' + q.ans || q.tiles[0].label !== 'A5' || q.tiles[24].label !== 'E1' || q.tiles.filter(x => x.html).length !== q.things.length) bad.push('tap ' + q.ans);
      } else {
        const t = q.thing, refs = q.tiles.map(x => x.label);
        if (q.ans !== 'ABCDE'[t.x] + t.y || refs[q.right] !== q.ans || refs.length !== 4 || new Set(refs).size !== 4 || refs.some(r => !/^[A-E][1-5]$/.test(r))) bad.push('where ' + JSON.stringify(q.tiles.map(x => x.label)) + ' ' + q.ans);
        if (t.y - 1 !== t.x) { swapped[0]++; if (refs.includes('ABCDE'[t.y - 1] + (t.x + 1))) swapped[1]++; }
        if (q.say !== `Where is the ${t.col} ${t.nm}?`) bad.push('say ' + q.say);
      }
    }
    if (seen.size < 22) bad.push('only ' + seen.size + ' cells asked');
    if (swapped[1] < swapped[0] * 0.9) bad.push('the swapped reference missing: ' + swapped);
    return bad.slice(0, 4);
  });
  ok(mq.length === 0, 'Map Year 4: 3 or 4 different shapes in different colours and cells; Tap asks any cell, A5 top left to E1; Where is offers the right reference and three near misses, the swapped one first ' + mq.join(' | '));
  await page.click('#backBtn');
  await page.click('#actTiles [data-act="map"]');
  ok(await page.evaluate(() => draft.yr === 4 && draft.kinds.join() === 'tap,where' && draft.n === 6), 'Map setup: Year 4, both kinds, 6 questions');
  await page.click('#newBtn');
  ok(await page.evaluate(() => cards.length === 6 && cards.every(c => c.q.kind === 'tap' && (c.q.form === 'tap' ? c.el.querySelectorAll('.tt').length === 25 && c.el.querySelectorAll('.ax').length === 11 : c.el.querySelectorAll('.tt').length === 4 && c.el.querySelector('.tq svg')))), 'Map sheet: a 5 × 5 grid with labels, or a map and four references');
  await page.evaluate(() => { cards.forEach((c, i) => { c.q = mapQ(4, [i % 2 ? 'where' : 'tap']); layout(c); sizeCanvas(c); }); });
  ok((await fits()).length === 0, 'Map fits, with squares big enough to tap ' + (await fits()).join(' '));
  ok(await page.evaluate(() => {
    const g = [...cards[0].el.querySelectorAll('.tiles > *')].map(e => e.getBoundingClientRect()), lab = [...cards[0].el.querySelectorAll('.ax')].map(e => e.textContent);
    // the 5 label sits left of A5, A sits under A1
    const a5 = cards[0].el.querySelector('.tt[data-i="0"]').getBoundingClientRect(), a1 = cards[0].el.querySelector('.tt[data-i="20"]').getBoundingClientRect(), l5 = cards[0].el.querySelectorAll('.ay')[0].getBoundingClientRect(), lA = cards[0].el.querySelectorAll('.axx')[0].getBoundingClientRect();
    return lab.join('') === '54321ABCDE' && l5.right <= a5.left + 1 && Math.abs(l5.top - a5.top) < 2 && lA.top >= a1.bottom - 2 && Math.abs(lA.left - a1.left) < 2;
  }), 'Map: numbers 5 to 1 up the side, letters A to E along the bottom, each by its row or column');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/44-map.png' });
  await page.tap(tile(0, (await page.evaluate(() => cards[0].q.right + 1)) % 25));
  ok(await page.evaluate(() => !readAnswer(cards[0]).ok), 'Map: a different square is wrong');
  ok((await writeAllAndMark()).length === 0, 'Map: the whole sheet tapped right is marked right');
  ok(await page.evaluate(() => labelFor('map~4|tap,where|6') === 'Map · Year 4 · tap C4, where is it? · 6 questions' && cardSay({ ...mapQ(4, ['tap']), say: 'Tap C 4.' }) === 'Tap C 4.'), 'Map record label; read aloud is just the question, not every square');

  // ---- Map, Year 5 (C3b): compass moves from a grid reference
  const mg = await page.evaluate(() => {
    const bad = [], ends = new Set(), dirs = new Set();
    for (let i = 0; i < 600; i++) {
      const q = mapQ(5, ['tap']);
      let x = 'ABCDE'.indexOf(q.start[0]), y = +q.start[1];
      for (const [n, d] of q.moves) { dirs.add(d); x += COMPASS_V[d][0] * n; y += COMPASS_V[d][1] * n; if (n < 1 || n > 4) bad.push('n ' + n); }
      const kinds = q.moves.map(m => ['north', 'south'].includes(m[1]) ? 'ud' : 'lr').sort().join();
      if (kinds !== 'lr,ud' || x < 0 || x > 4 || y < 1 || y > 5 || q.ans !== 'ABCDE'[x] + y || q.tiles[q.right].label !== q.ans || q.tiles.length !== 25 || q.tiles.some(t => t.html)) bad.push(JSON.stringify(q.moves) + q.start + q.ans);
      if (!q.top.includes(`Start at ${q.start}.`) || !q.top.includes('<svg') || !/Tap where you finish\.$/.test(q.say)) bad.push('words ' + q.top);
      ends.add(q.ans);
    }
    if (ends.size < 22 || dirs.size !== 4) bad.push('spread ' + ends.size + ' ' + [...dirs]);
    return bad.slice(0, 4);
  });
  ok(mg.length === 0, 'Map Year 5: one move up or down and one across, 1 to 4 squares, staying on the map; the tapped square is where she finishes ' + mg.join(' | '));
  await page.evaluate(() => { act = 'map'; buildSheet({ yr: 5, kinds: ['tap', 'where'], n: 6 }); show('sheet'); });
  ok(await page.evaluate(() => cards.every(c => c.q.form === 'go' && c.el.querySelectorAll('.tt').length === 25 && c.el.querySelector('.tq svg'))), 'Map Year 5 sheet: compass moves only, a compass rose by the words');
  ok((await fits()).length === 0, 'Map Year 5 fits, squares big enough to tap ' + (await fits()).join(' '));
  ok((await writeAllAndMark()).length === 0, 'Map Year 5: tapped right is marked right');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/44-map-y5.png' });
  ok(await page.evaluate(() => ACTS.map.key({ yr: 5, kinds: ['tap', 'where'], n: 6 }) === 'map~5|go|6' && labelFor('map~5|go|6') === 'Map · Year 5 · compass moves · 6 questions'), 'Map Year 5 record key and label');

  // ---- Map, Year 2 (D2d): steps and turns from an arrow on a plain grid
  const mw2 = await page.evaluate(() => {
    const bad = [], ends = new Set(), turns = { right: 0, left: 0, half: 0 }, faces = new Set(), V = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    for (let i = 0; i < 600; i++) {
      const q = mapQ(2, ['tap', 'where']), [a, t, b] = q.moves;
      let x = 'ABCDE'.indexOf(q.start[0]), y = +q.start[1], d = q.d0;
      x += V[d][0] * a; y += V[d][1] * a;
      if (x < 0 || x > 4 || y < 1 || y > 5) bad.push('off the map after the first leg ' + JSON.stringify([q.start, q.d0, q.moves]));
      d = (d + { right: 1, left: 3, half: 2 }[t]) % 4; x += V[d][0] * b; y += V[d][1] * b;
      turns[t]++; faces.add(q.d0); ends.add(q.ans);
      const arrows = q.tiles.filter(u => u.html);
      if (x < 0 || x > 4 || y < 1 || y > 5 || q.ans !== 'ABCDE'[x] + y || q.ans === q.start || q.tiles[q.right].label !== q.ans || q.tiles.length !== 25 || q.cells !== 5 || q.axes
        || arrows.length !== 1 || arrows[0].label !== q.start || !arrows[0].html.includes(`rotate(${q.d0 * 90})`) || a < 1 || a > 4 || b < 1 || b > 4) bad.push(JSON.stringify([q.start, q.d0, q.moves, q.ans]));
      if (!q.top.includes(`Forward ${a}, `) || !q.top.includes(`forward ${b}.`) || q.tiles.some(u => u.say !== 'this one')
        || !/^Start at the arrow\. Go \d steps? forward, make a (quarter turn (right|left)|half turn), then go \d steps? forward\. Tap where you finish\.$/.test(q.say) || (a === 1) !== q.say.includes('Go 1 step forward')) bad.push('words ' + q.say);
    }
    if (ends.size < 22 || faces.size !== 4 || turns.half < 60 || turns.half > 190 || turns.right < 150 || turns.left < 150) bad.push('spread ' + ends.size + ' ' + JSON.stringify(turns));
    return bad.slice(0, 4);
  });
  ok(mw2.length === 0, 'Map Year 2: forward, a quarter turn right or left (or a half turn), forward, on the map, never back at the start; the arrow sits in the start square facing the way she faces ' + mw2.join(' | '));
  await page.evaluate(() => { hideDone(); act = 'map'; buildSheet({ yr: 2, kinds: ['tap', 'where'], n: 6 }); show('sheet'); });
  ok(await page.evaluate(() => cards.every(c => c.q.form === 'walk' && c.el.querySelectorAll('.tt').length === 25 && c.el.querySelectorAll('.tt svg').length === 1 && !c.el.querySelector('.ax'))), 'Map Year 2 sheet: a plain 5 × 5 grid, no letters or numbers, one arrow');
  ok((await fits()).length === 0, 'Map Year 2 fits, squares big enough to tap ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/44-map-y2.png' });
  ok(await page.evaluate(() => { const c = cards[0]; c.pick = [(c.q.right + 1) % 25]; paintTap(c); const w = !readAnswer(c).ok; c.pick = [c.q.right]; paintTap(c); return w && readAnswer(c).ok; }), 'Map Year 2: another square is wrong, the right one right');
  ok((await writeAllAndMark()).length === 0, 'Map Year 2: tapped right is marked right');
  ok(await page.evaluate(() => cardSay(cards[0].q) === cards[0].q.say), 'Map Year 2 read aloud: the steps, not every square');
  ok(await page.evaluate(() => ACTS.map.key({ yr: 2, kinds: ['tap', 'where'], n: 4 }) === 'map~2|walk|4' && labelFor('map~2|walk|4') === 'Map · Year 2 · steps and turns · 4 questions' && ACTS.map.defaults(5).yr === 2 && ACTS.map.defaults(8).yr === 4), 'Map Year 2 record key and label; the younger default is Year 2');

  // ---- Turns (Year 2, D2d): which turn was it, or where does the arrow point now
  const trq = await page.evaluate(() => {
    const bad = [], seen = new Set(), D =[[0, -1], [1, 0], [0, 1], [-1, 0]]; // up right down left on screen
    for (let i = 0; i < 800; i++) {
      const q = turnsQ(), k = TURN_AMTS.findIndex(t => t[1] === q.f), way = q.acw ? 'anticlockwise' : 'clockwise';
      // where it ends: each quarter is one step round, clockwise on, anticlockwise back
      const e = ((q.s + (q.acw ? -1 : 1) * (k + 1)) % 4 + 4) % 4;
      seen.add(q.form + k + q.acw);
      if (q.kind !== 'tap' || k < 0 || q.e !== e || q.tiles.length !== 4 || new Set(q.tiles.map(t => t.label)).size !== 4 || q.tiles[q.right].label !== q.ans) bad.push(JSON.stringify(q).slice(0, 160));
      if (q.form === 'which') {
        if (q.ans !== TURN_AMTS[k][0] || q.say !== `The arrow turned ${way}. Which turn was it?` || q.tiles.some(t => t.say !== t.label) || q.tiles.some(t => q.acw !== t.html.includes('scale(-1 1)'))) bad.push('which ' + q.ans);
        const r = [...q.top.matchAll(/rotate\((\d+)\)/g)].map(m => +m[1] / 90); // the arrow before, then after
        if (r.join() !== [q.s, q.e].join()) bad.push('arrows ' + r);
      } else {
        if (q.ans !== DIR_WORDS[e] || q.say !== `The arrow makes a ${TURN_AMTS[k][0]} ${way}. Where does it point now?` || q.tiles.map(t => t.label).join() !== 'up,right,down,left') bad.push('where ' + q.ans);
        // the arc starts at the arrow and (short of a full turn) ends pointing the answer's way
        const m = q.top.match(/A14 14 0 [01] 1 (\S+) (\S+)"/); let X = +m[1]; const Y = +m[2]; if (q.acw) X = -X;
        const th = q.s * Math.PI / 2, ex = (X * Math.cos(th) - Y * Math.sin(th)) / 14, ey = (X * Math.sin(th) + Y * Math.cos(th)) / 14;
        if (!q.top.includes(`rotate(${q.s * 90})`) || (q.f < 1 && Math.hypot(ex - D[e][0], ey - D[e][1]) > 0.01)) bad.push('spin ' + JSON.stringify([q.s, q.f, q.acw, ex, ey]));
      }
    }
    if (seen.size !== 16) bad.push('only ' + seen.size + ' of 16 kinds of card');
    return bad.slice(0, 4);
  });
  ok(tq.length === 0, 'Turns: quarter, half, three-quarter and full, either way; the arrows before and after, or the turn drawn from the arrow; the right tile is the turn or where it points ' + trq.join(' | '));
  await page.evaluate(() => { hideDone(); act = 'turn'; buildSheet({ yr: 2, n: 6 }); show('sheet'); for (let i = 0; i < 6; i++) { let q; do q = turnsQ(); while (q.form !== (i % 2 ? 'where' : 'which')); cards[i].q = q; layout(cards[i]); sizeCanvas(cards[i]); } });
  ok(await page.evaluate(() => cards.every(c => c.el.querySelectorAll('.tt').length === 4 && c.el.querySelectorAll('.tq svg').length === (c.q.form === 'which' ? 3 : 1))), 'Turns sheet: two arrows (which turn) or one arrow and its turn (where now), four tiles');
  ok((await fits()).length === 0, 'Turns fits ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/45-turns.png' });
  ok(await page.evaluate(() => { const c = cards[0]; c.pick = [(c.q.right + 1) % 4]; paintTap(c); return !readAnswer(c).ok; }), 'Turns: another tile is wrong');
  ok((await writeAllAndMark()).length === 0, 'Turns: tapped right is marked right');
  ok(await page.evaluate(() => /^The arrow turned (anti)?clockwise\. Which turn was it\? quarter turn, half turn, three-quarter turn, full turn\.$/.test(cardSay(cards[0].q)) && /^The arrow makes a [a-z -]+ turn (anti)?clockwise\. Where does it point now\? pointing up, pointing right, pointing down, pointing left\.$/.test(cardSay(cards[1].q))), 'Turns read aloud: the question, then each tile');
  ok(await page.evaluate(() => ACTS.turn.key({ yr: 2, n: 6 }) === 'turn~2|6' && labelFor('turn~2|12') === 'Turns · Year 2 · 12 questions' && yearsOf('turn').join() === '2' && ACTS.turn.ages.join() === '5'), 'Turns record key and label; Year 2 only, younger tiles');

  // ---- E1a: Year 3 on True or false, More or less, Balance, Rounding
  const e1 = await page.evaluate(valSrc => {
    const bad = [], val = eval(valSrc), seen = new Set();
    let trues = 0, cmps = 0, same = 0;
    for (let i = 0; i < 800; i++) { // True or false
      const q = tfQ(3), [l, s, r] = q.text.split(/ ([<=>]) /), lv = val(l), rv = val(r);
      const truth = s === '<' ? lv < rv : s === '>' ? lv > rv : lv === rv;
      if (q.kind !== 'tap' || q.yr !== 3 || q.truth !== truth || q.right !== (truth ? 0 : 1) || q.ans !== q.tiles[q.right].label) bad.push('tf wrong ' + q.text);
      const nums = q.text.match(/\d+/g).map(Number);
      if (nums.some(n => n < 1 || n > 1000) || !Number.isInteger(lv) || !Number.isInteger(rv)) bad.push('tf size ' + q.text);
      if (q.type === 'cmp') {
        cmps++;
        if (lv === rv || /[+−×÷]/.test(q.text) || q.say !== `${l} ${s === '<' ? 'is less than' : 'is more than'} ${r}. True?`) bad.push('tf cmp ' + q.text);
        if (Math.max(lv, rv) >= 100 && Math.min(lv, rv) >= 100 && [...String(lv)].sort().join() === [...String(rv)].sort().join()) seen.add('digits moved');
      } else {
        if (s !== '=' || q.say !== signWords(q.text) + '. True?') bad.push('tf say ' + q.text);
        for (const o of ['+', '−', '×', '÷']) if (q.text.includes(o)) seen.add('tf ' + o);
        if (q.type === 'both') seen.add('both');
        if (/[×÷]/.test(q.text)) { // a table fact from 2, 3, 4, 5, 8, 10
          const f = (q.text.match(/(\d+) ([×÷]) (\d+)/) || []).slice(1);
          if (!f.length || !(f[1] === '×' ? [+f[0], +f[2]].some(n => TABLES3.includes(n)) && +f[0] <= 10 && +f[2] <= 10 : TABLES3.includes(+f[2]) || TABLES3.includes(+f[0] / +f[2]))) bad.push('tf table ' + q.text);
        }
        if (!truth) { const d = Math.abs(lv - rv); if (![1, 10, 100].includes(d) && !TABLES3.includes(d) && [...String(lv)].sort().join() !== [...String(rv)].sort().join()) bad.push('tf not a near miss ' + q.text); }
      }
      if (q.text.length > 18 !== /<br>/.test(q.top)) bad.push('tf lines ' + q.text);
      trues += q.truth;
    }
    if (trues < 320 || trues > 480) bad.push('tf true ' + trues);
    if (cmps < 320 || cmps > 480) bad.push('tf compare ' + cmps);
    for (let i = 0; i < 600; i++) { // More or less
      const kinds = pickOne([['num'], ['sum'], ['num', 'sum'], ['dots', 'dec']]), q = cmpQ(3, kinds), lv = val(q.l), rv = val(q.r), want = lv < rv ? 0 : lv === rv ? 1 : 2;
      if (q.yr !== 3 || q.right !== want || q.ans !== q.tiles[want].label || q.tiles.map(t => t.label).join('') !== '<=>' || q.say !== `${signWords(q.l)}, and ${signWords(q.r)}. Which sign goes in the box?`) bad.push('cmp ' + JSON.stringify(q));
      if ([...q.l.match(/\d+/g), ...q.r.match(/\d+/g)].some(n => +n < 1 || +n > 1000) || !Number.isInteger(lv) || !Number.isInteger(rv)) bad.push('cmp size ' + q.l + ' ' + q.r);
      const isNum = /^\d+$/.test(q.l) && /^\d+$/.test(q.r);
      if (kinds.includes('sum') !== !isNum && kinds.join() !== 'num,sum') bad.push('cmp kind ' + kinds + ' ' + q.l);
      if (kinds.join() === 'dots,dec' && !isNum) bad.push('cmp kinds a year lacks ' + q.l);
      if (!isNum && q.l === q.r) bad.push('cmp same sum ' + q.l);
      if (!isNum && /[×÷]/.test(q.l)) seen.add('cmp facts'); else if (!isNum) seen.add('cmp hundreds');
      same += lv === rv;
    }
    if (same < 70 || same > 190) bad.push('cmp same ' + same + ' of 600');
    for (let i = 0; i < 800; i++) { // Balance
      const q = balQ(3), [l, r] = q.text.split(' = '), nums = q.text.match(/\d+/g).map(Number);
      if ((q.text.match(/☐/g) || []).length !== 1 || q.saw || q.yr !== 3) bad.push('bal box ' + q.text);
      if (nums.concat(q.ans).some(n => n < 1 || n > 1000)) bad.push('bal size ' + q.text);
      if (val(l.replace('☐', q.ans)) !== val(r.replace('☐', q.ans))) bad.push('bal not equal ' + q.text + ' ' + q.ans);
      for (const x of [q.ans - 1, q.ans + 1]) if (x > 0 && val(l.replace('☐', x)) === val(r.replace('☐', x))) bad.push('bal two answers ' + q.text);
      if (q.say !== signWords(q.text).replace('equals', 'is the same as').replace('☐', 'what') + '?') bad.push('bal say ' + q.say);
      seen.add('bal ' + q.type);
      for (const o of ['+', '−', '×', '÷']) if (q.text.includes(o)) seen.add('bal ' + o);
    }
    for (let i = 0; i < 600; i++) { // Rounding: nearest 10 or 100, numbers to 1,000
      const kinds = pickOne([['line'], ['num'], ['line', 'num']]), q = roundQ(3, kinds), n = +q.n, u = q.hi - q.lo, want = Math.round(n / u) * u;
      if (![10, 100].includes(u) || n < 11 || n > 999 || n % u === 0 || q.ans !== want || q.lo > n || q.hi < n || q.cap !== `to the nearest ${u}` || q.say !== `Round ${n} to the nearest ${u}.`) bad.push('round ' + JSON.stringify(q));
      if (!kinds.includes(q.kind === 'rline' ? 'line' : 'num')) bad.push('round kind ' + q.kind + ' ' + kinds);
      if (q.kind === 'rline' && n % u === u / 2) bad.push('round halfway on the line ' + n);
      seen.add('round ' + u);
      if (q.hi === 1000) seen.add('round to 1000');
    }
    const want = ['digits moved', 'tf +', 'tf −', 'tf ×', 'tf ÷', 'both', 'cmp facts', 'cmp hundreds', 'bal one', 'bal fact', 'bal both', 'bal mix', 'bal +', 'bal −', 'bal ×', 'bal ÷', 'round 10', 'round 100', 'round to 1000'];
    want.forEach(w => { if (!seen.has(w)) bad.push('never saw ' + w); });
    return bad.slice(0, 5);
  }, val);
  ok(e1.length === 0, 'Year 3: True or false (< > to 1,000, + − × ÷ with the 2, 3, 4, 5, 8, 10 tables), More or less (to 1,000, table facts, hundreds and tens), Balance (to 1,000, all four signs), Rounding (nearest 10 or 100) ' + e1.join(' | '));
  ok(await page.evaluate(() => [ACTS.cmp.key({ yr: 3, kinds: ['dots', 'num', 'sum', 'dec', 'frac'], n: 12 }), ACTS.cmp.key({ yr: 3, kinds: ['frac'], n: 6 }), ACTS.round.key({ yr: 3, kinds: ['line', 'num'], n: 12 }),
    labelFor('cmp~3|num,sum|12'), labelFor('tf~3|12'), labelFor('bal~3|6'), labelFor('round~3|line|6'), ['tf', 'cmp', 'bal', 'round'].map(a => yearsOf(a).join('')).join(' ')].join(' / '))
    === 'cmp~3|num,sum,frac|12 / cmp~3|frac|6 / round~3|line,num|12 / More or less · Year 3 · numbers, sums · 12 questions / True or false · Year 3 · 12 questions / Balance · Year 3 · 6 questions / Rounding · Year 3 · number line · 6 questions / 12345 12345 12345 2345','Year 3 record keys and labels; the Year rows');
  await page.evaluate(() => { setYear(3); hideDone(); });
  for (const [a, c] of [['tf', { yr: 3, n: 12 }], ['cmp', { yr: 3, kinds: ['num', 'sum'], n: 12 }], ['bal', { yr: 3, n: 12 }], ['round', { yr: 3, kinds: ['line', 'num'], n: 12 }], ['tf', { yr: 3, n: 6 }], ['round', { yr: 3, kinds: ['line'], n: 6 }]]) {
    await page.evaluate((a, c) => { hideDone(); act = a; buildSheet(c); show('sheet'); }, a, c);
    ok((await fits()).length === 0, `${a} Year 3 (${c.n}) fits ` + (await fits()).join(' '));
    if (SHOTS) await page.screenshot({ path: SHOTS + `/47-${a}-y3-${c.n}.png` });
    ok((await writeAllAndMark()).length === 0, `${a} Year 3 (${c.n}): read and marked right`);
  }

  // ---- E1b: complements to 100 (Splat hundred square, Number bonds up to 100) and Add and take away 700 + 200
  const e1b = await page.evaluate(() => {
    const bad = [], seen = new Set();
    let tens = 0;
    // distance from a point to a segment
    const segD = (px, py, [ax, ay], [bx, by]) => { const t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2))); return Math.hypot(px - ax - t * (bx - ax), py - ay - t * (by - ay)); };
    const inside = (x, y, P) => { let k = false; P.forEach((a, i) => { const b = P[(i + 1) % P.length]; if ((a[1] > y) !== (b[1] > y) && x < a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])) k = !k; }); return k; };
    for (let i = 0; i < 600; i++) { // Splat Year 3: a hundred square, one blot over the last dots
      const q = splatQ(3);
      if (q.kind !== 'splat' || q.total !== 100 || q.showing < 10 || q.showing > 90 || q.ans !== 100 - q.showing || q.hid !== q.ans || q.say !== `100 altogether. ${q.showing} showing. How many are hiding?` || cardSay(q) !== q.say) bad.push('splat3 ' + JSON.stringify(q));
      if (q.showing % 10 === 0) tens++; else seen.add('splat any');
      const d = new DOMParser().parseFromString(`<div>${splatSvg(q)}</div>`, 'text/html');
      const dots = [...d.querySelectorAll('circle[fill="currentColor"]')].map(c => [+c.getAttribute('cx'), +c.getAttribute('cy'), +c.getAttribute('r')]);
      const P = d.querySelector('.blot path').getAttribute('d').replace(/[MZ]/g, '').split('L').map(p => p.trim().split(' ').map(Number));
      const half = +d.querySelector('.blot path').getAttribute('stroke-width') / 2;
      const lobes = [...d.querySelectorAll('.lobe')].map(c => ['cx', 'cy', 'r'].map(k => +c.getAttribute(k)));
      if (dots.length !== 100) bad.push('splat3 dots ' + dots.length);
      let covered = 0;
      dots.forEach(([x, y, r], j) => {
        const idx = Math.floor(y / 10) * 10 + Math.floor(x / 10), edge = Math.min(...P.map((a, k) => segD(x, y, a, P[(k + 1) % P.length])));
        if (inside(x, y, P)) { covered++; if (idx < q.showing) bad.push('splat3 a showing dot is under the blot ' + idx); if (edge < r) bad.push('splat3 dot half under'); }
        else {
          if (idx >= q.showing) bad.push('splat3 a hidden dot shows ' + idx + ' ' + q.showing);
          if (edge - half < r + 0.5) bad.push('splat3 blot edge touches a dot ' + (edge - half).toFixed(2));
          lobes.forEach(([lx, ly, lr]) => { if (Math.hypot(x - lx, y - ly) < lr + r + 0.5) bad.push('splat3 lobe on a dot'); });
        }
      });
      if (covered !== q.hid) bad.push('splat3 covered ' + covered + ' of ' + q.hid);
      if (lobes.some(([x, y]) => x > 0 && x < 100 && y < 100)) bad.push('splat3 a lobe inside the square');
    }
    if (tens < 150 || tens > 260) bad.push('splat3 tens ' + tens + ' of 600');
    let hundreds = 0; tens = 0;
    for (let i = 0; i < 600; i++) { // Number bonds up to 100
      const q = ACTS.bonds.make({ max: 100, n: 12 });
      if (q.kind !== 'bond' || q.w !== q.p + q.q2 || q.p < 1 || q.q2 < 1 || q.w % 10 || q.w < 30 || q.w > 100 || q.ans !== q[q.hide] || q.tens !== (q.p % 10 === 0)) bad.push('bond100 ' + JSON.stringify(q));
      if (q.tens) tens++; hundreds += q.w === 100;
      seen.add('hide ' + q.hide);
    }
    if (tens < 180 || tens > 300 || hundreds < 390 || hundreds > 510) bad.push('bond100 tens ' + tens + ', wholes of 100 ' + hundreds + ' of 600');
    if (range(0, 300).some(() => { const q = ACTS.bonds.make({ max: 20, n: 6 }); return q.w > 20 || 'tens' in q; })) bad.push('bonds up to 20 changed');
    // tens first on the sheet
    const qs = ACTS.bonds.order(range(0, 12).map(() => bond100Q())), firstAny = qs.findIndex(q => !q.tens);
    if (firstAny >= 0 && qs.slice(firstAny).some(q => q.tens)) bad.push('bond100 order');
    ['splat any', 'hide w', 'hide p', 'hide q2'].forEach(w => { if (!seen.has(w)) bad.push('never saw ' + w); });
    return bad.slice(0, 5);
  });
  ok(e1b.length === 0, 'Year 3 complements to 100: Splat hundred square (100 altogether, 10 to 90 showing, a third tens, the blot over exactly the hidden dots), Number bonds up to 100 (wholes of 100 or tens, tens first, then any) ' + e1b.join(' | '));
  ok(await page.evaluate(() => [ACTS.splat.key({ yr: 3, n: 6 }), labelFor('splat~3|12'), ACTS.bonds.key({ max: 100, n: 12 }), labelFor('bonds~100|12'), ACTS.bonds.defaults(8).max, ACTS.bonds.defaults(5).max, ACTS.splat.defaults(8).yr, ACTS.splat.defaults(5).yr, yearsOf('splat').join(''),
    [1, 2, 3, 4, 5].map(v => +onPage('bonds', v)).join('')].join(' / '))
    === 'splat~3|6 / Splat · Year 3 · 12 questions / bonds~100|12 / Number bonds · up to 100 · 12 questions / 100 / 10 / 3 / 1 / 123 / 11100', 'Splat Year 3 and Number bonds up to 100: keys, labels, defaults; Number bonds on the Year 1 to 3 pages');
  for (const [a, c] of [['splat', { yr: 3, n: 6 }], ['splat', { yr: 3, n: 12 }], ['bonds', { max: 100, n: 12 }], ['bonds', { max: 100, n: 6 }], ['addsub', { yr: 3, ops: ['+', '-'], n: 12 }]]) {
    await page.evaluate((a, c) => { hideDone(); act = a; buildSheet(c); show('sheet'); }, a, c);
    ok((await fits()).length === 0, `${a} Year 3 (${c.n}) fits ` + (await fits()).join(' '));
    if (SHOTS) await page.screenshot({ path: SHOTS + `/48-${a}-y3-${c.n}.png` });
    if (a === 'splat') ok(await page.evaluate(() => cards.every(c => c.el.querySelector('.cap').innerText.replace(/\s+/g, ' ') === `100 altogether ${c.q.showing} showing`)), 'Splat Year 3: "100 altogether" and "34 showing" printed');
    if (a === 'bonds') ok(await page.evaluate(() => { const i = cards.findIndex(c => !c.q.tens); return i < 0 || cards.slice(i).every(c => !c.q.tens); }), 'Number bonds up to 100: the tens cards first on the sheet');
    ok((await writeAllAndMark()).length === 0, `${a} Year 3 (${c.n}): read and marked right`);
  }
  // a Year 3 sheet with hundreds facts across among the stacked sums
  await page.evaluate(() => { hideDone(); act = 'addsub'; buildSheet({ yr: 3, ops: ['+', '-'], n: 12 }); for (let i = 0; i < 4; i++) { let q; do q = addSubQ(pickOne(['+', '-']), 3); while (!q.hund); cards[i].q = q; layout(cards[i]); sizeCanvas(cards[i]); } });
  ok((await fits()).length === 0, 'Add and take away Year 3 with 700 + 200 across fits ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/48-addsub-y3-hund.png' });
  ok((await writeAllAndMark()).length === 0, 'Add and take away Year 3: 700 + 200 across read and marked right');

  // ---- E1c: More or less Fractions Year 3, Fractions Add within 1, Fractions of a number Year 3
  const e1c = await page.evaluate(() => {
    const bad = [], seen = new Set();
    let fr = 0;
    for (let i = 0; i < 600; i++) { // More or less Year 3, fractions
      const q = cmpQ(3, ['num', 'sum', 'frac']);
      if (q.type !== 'frac') continue;
      fr++;
      const [a, b] = q.l.split('/').map(Number), [c, d] = q.r.split('/').map(Number), want = a * d < c * b ? 0 : a * d === c * b ? 1 : 2;
      if (q.yr !== 3 || q.right !== want || want === 1 || q.ans !== q.tiles[want].label || q.tiles.map(t => t.label).join('') !== '<=>' || b > 12 || d > 12 || a >= b || c >= d || q.say !== `${a} over ${b}, and ${c} over ${d}. Which sign goes in the box?`) bad.push('cmp frac ' + JSON.stringify(q));
      if (a === 1 && c === 1 && b !== d) seen.add('unit'); else if (b === d && a !== c) seen.add('same bottom'); else bad.push('cmp frac type ' + q.l + ' ' + q.r);
      const dom = new DOMParser().parseFromString(`<div>${q.top}</div>`, 'text/html');
      const bars = [...dom.querySelectorAll('svg')].map(s => [...s.querySelectorAll('rect')].filter(r => r.getAttribute('fill') !== 'none'));
      if (bars.length !== 2 || bars[0].length !== b || bars[1].length !== d || bars[0].filter(r => r.getAttribute('fill') !== 'white').length !== a || bars[1].filter(r => r.getAttribute('fill') !== 'white').length !== c) bad.push('cmp frac bars ' + q.l + ' ' + q.r);
    }
    if (fr < 140 || fr > 270) bad.push('cmp frac share ' + fr + ' of 600');
    if (range(0, 100).some(() => cmpQ(3, ['frac']).type !== 'frac')) bad.push('cmp frac only');
    let three = 0, minus = 0;
    for (let i = 0; i < 600; i++) { // Fractions, Add within 1
      const q = fracQ({ kinds: ['add1'], parts: pickOne([[2, 3, 4, 6, 8], [2], [12], [3, 5, 10]]) });
      const n = q.op === '+' ? q.terms.reduce((x, y) => x + y) : q.terms[0] - q.terms[1];
      if (q.kind !== 'frac' || q.form !== 'add' || !q.within || q.n !== n || n < 1 || n >= q.d || q.terms.some(t => t < 1 || t >= q.d) || q.ans !== `${n}/${q.d}` || q.d < 3) bad.push('add1 ' + JSON.stringify(q));
      three += q.terms.length === 3; minus += q.op === '−';
    }
    if (three < 60 || minus < 120 || minus > 280) bad.push('add1 three ' + three + ', minus ' + minus);
    for (let i = 0; i < 600; i++) { // Fractions of a number Year 3: small tables only
      const q = fofQ(3, pickOne([['part'], ['whole'], ['part', 'whole', 'pct']]));
      if (q.kind !== 'fof' || q.pct || q.n > 1 || ![2, 3, 4, 5, 8, 10].includes(q.d) || q.k < 2 || q.k > 10 || q.whole !== q.k * q.d || q.ans !== (q.part ? q.k : q.whole)) bad.push('fof3 ' + JSON.stringify(q));
      seen.add('fof ' + (q.part ? 'part' : 'whole'));
    }
    ['unit', 'same bottom', 'fof part', 'fof whole'].forEach(w => { if (!seen.has(w)) bad.push('never saw ' + w); });
    return bad.slice(0, 5);
  });
  ok(e1c.length === 0, 'Year 3 fractions: More or less unit fractions to twelfths and same bottom number over bars, never equal; Fractions Add within 1; Fractions of a number with the 2, 3, 4, 5, 8, 10 tables ' + e1c.join(' | '));
  ok(await page.evaluate(() => { const y0 = year, out = []; year = 3; out.push(ACTS.frac.defaults(8).kinds.join()); year = 4; out.push(ACTS.frac.defaults(8).kinds.join()); year = y0;
    return [...out, ACTS.frac.key({ kinds: ['add1', 'shapes'], parts: [4, 8], n: 6 }), labelFor('frac~shapes,line,add1|2,3,4,6,8|12'), ACTS.fof.key({ yr: 3, kinds: ['part', 'whole', 'pct'], n: 12 }), labelFor('fof~3|part,whole|6'), yearsOf('fof').join(''), ACTS.cmp.key({ yr: 3, kinds: ['frac'], n: 6 })].join(' / '); })
    === 'shapes,line,add1 / shapes,line,past,add / frac~shapes,add1|4,8|6 / Fractions · shapes, line, + − within 1 · 2, 3, 4, 6, 8 parts · 12 questions / fof~3|part,whole|12 / Fractions of a number · Year 3 · part, whole · 6 questions / 345 / cmp~3|frac|6', 'E1c keys, labels, Year 3 Fractions default, Fractions of a number Years 3 to 5');
  for (const [a, c] of [['cmp', { yr: 3, kinds: ['frac'], n: 12 }], ['cmp', { yr: 3, kinds: ['frac'], n: 6 }], ['frac', { kinds: ['add1'], parts: [2, 3, 4, 6, 8, 10, 12], n: 12 }], ['frac', { kinds: ['shapes', 'line', 'add1'], parts: [2, 3, 4, 6, 8], n: 6 }], ['fof', { yr: 3, kinds: ['part', 'whole'], n: 12 }], ['fof', { yr: 3, kinds: ['part', 'whole'], n: 6 }]]) {
    await page.evaluate((a, c) => { hideDone(); act = a; buildSheet(c); show('sheet'); }, a, c);
    ok((await fits()).length === 0, `${a} Year 3 E1c (${c.n}) fits ` + (await fits()).join(' '));
    if (SHOTS) await page.screenshot({ path: SHOTS + `/49-${a}-${c.kinds.join('')}-y3-${c.n}.png` });
    ok((await writeAllAndMark()).length === 0, `${a} Year 3 E1c (${c.n}): read and marked right`);
  }

  // ---- Money, Make it (Year 4): drop coins and notes in a tray. A7
  const mkq = await page.evaluate(() => {
    const bad = [];
    for (let i = 0; i < 500; i++) {
      const q = makeItQ(), sum = q.right.reduce((s, k) => s + q.tiles[k].v, 0), d = Math.floor(q.target / 100), c = q.target % 100;
      if (sum !== q.target || q.right.length > 8 || d < 1 || d > 49 || c % 10 || q.tiles.length !== 10 || q.top !== `Make $${d}${c ? ` and ${c}c` : ''}` || q.say !== `Make ${moneyWords(q.target)}.`) bad.push(JSON.stringify({ t: q.target, r: q.right, top: q.top }));
    }
    const ms = range(0, 200).map(() => ACTS.money.make({ yr: 4, kinds: ['count', 'change', 'make'] })), mk = ms.filter(q => q.form === 'make').length;
    if (mk < 40 || mk > 100) bad.push('make share ' + mk);
    if (range(0, 60).some(() => ACTS.money.make({ yr: 3, kinds: ['count', 'make'] }).form === 'make' || ACTS.money.make({ yr: 5, kinds: ['count', 'make'] }).form === 'make') || ACTS.money.make({ yr: 1, kinds: ['make'] }).kind !== 'money') bad.push('make in Years 1, 3 or 5');
    return bad.slice(0, 4);
  });
  ok(mkq.length === 0, 'Money Make it: $1 to $49, cents in tens, a way to make it in 8 or fewer; about a third of Year 4 with all three kinds; not in Years 1, 3, 5 ' + mkq.join(' | '));
  await page.evaluate(() => { act = 'money'; buildSheet({ yr: 4, kinds: ['count', 'make'], n: 12 }); show('sheet'); cards.forEach((c, i) => { if (i < 6) { c.q = makeItQ(); layout(c); sizeCanvas(c); } }); cards[0].q = { ...makeItQ(), target: 590, top: 'Make $5 and 90c', right: [5, 2, 1, 1] }; layout(cards[0]); sizeCanvas(cards[0]); });
  ok((await fits()).length === 0, 'Money Make it fits beside written money cards, tiles big enough ' + (await fits()).join(' '));
  const mi = v => page.evaluate(v => MAKE_V.indexOf(v), v);
  for (const v of [500, 50, 20, 20, 10]) await page.tap(tile(0, await mi(v))); // $5, 50c, 20c, 20c, 10c = $6: too much
  ok(await page.evaluate(() => cards[0].el.querySelectorAll('.tray .tri').length === 5 && !/5\.|\$6|100/.test(cards[0].el.querySelector('.tray').textContent.replace(/\$5|50c|20c|10c/g, '')) && !readAnswer(cards[0]).ok), 'Make it: each tap drops one in the tray; no total shown; too much is wrong');
  await page.tap('#sheet .card:nth-child(1) .tray .tri:last-child'); // takes the 10c out (biggest first, so the 10c is last)
  if (SHOTS) await page.screenshot({ path: SHOTS + '/46-make-it.png' });
  ok(await page.evaluate(() => cards[0].pick.length === 4 && readAnswer(cards[0]).ok && readAnswer(cards[0]).text.split(' ').sort().join() === '$5,20c,20c,50c'), 'Make it: a tap in the tray takes one out; $5 50c 20c 20c makes $5 and 90c');
  ok(await page.evaluate(() => { const c = cards[1]; c.pick = []; let left = c.q.target; for (const v of [200, 100, 50, 20, 10]) while (left >= v) { c.pick.push(MAKE_V.indexOf(v)); left -= v; } return readAnswer(c).ok; }), 'Make it: any way that adds up is right (only coins, no notes)');
  await page.evaluate(() => { cards[1].pick = []; paintTap(cards[1]); });
  await page.click('#markBtn');
  ok(await page.evaluate(() => cards[0].el.dataset.state === 'right' && cards[0].el.querySelector('.read').textContent === ''), 'Make it: marked right, the reading stays blank');
  ok((await writeAllAndMark()).length === 0, 'Money Make it and written money on one sheet: all marked right');
  ok(await page.evaluate(() => [ACTS.money.key({ yr: 4, kinds: ['count', 'change', 'make'], n: 12 }), ACTS.money.key({ yr: 3, kinds: ['count', 'change', 'make'], n: 12 }), labelFor('money~4|count,make|12'), cardSay(makeItQ()).split('.').length].join(' / ') === 'money~4|count,change,make|12 / money~3|count,change|12 / Money · Year 4 · how much, make it · 12 questions / 2'), 'Money keys: Make it only in Year 4 keys; label; read aloud is just the question');

  // ---- Shapes, Moves (Year 4): flip, slide or turn. A7
  const mvq = await page.evaluate(() => {
    const bad = [], seen = [0, 0, 0], key = cs => cs.map(c => c.join()).sort().join(';');
    for (let i = 0; i < 600; i++) {
      const q = movesQ(), A = key(q.a), B = key(q.b);
      seen[q.right]++;
      const turns = [1, 2, 3].map(k => key(rotCells(q.a, k))), flips = [0, 1, 2, 3].map(k => key(rotCells(flipCells(q.a), k)));
      // a slide keeps the shape the same way round; a turn never matches it or any flip; a flip never matches a turn
      if (q.move === 'slide' && B !== A) bad.push('slide changed');
      if (q.move === 'turn' && (B === A || !turns.includes(B) || flips.includes(B))) bad.push('turn ' + B);
      if (q.move === 'flip' && (B === A || turns.includes(B))) bad.push('flip ' + B);
      if (q.tiles[q.right].label !== q.move || q.a.length !== 4) bad.push('tiles');
    }
    if (seen.some(n => n < 150)) bad.push('spread ' + seen);
    return bad.slice(0, 4);
  });
  ok(mvq.length === 0, 'Shapes Moves: a slide is the same shape, a turn is turned and never a mirror image, a flip is a mirror image and never a turn; about a third each ' + mvq.join(' | '));
  ok(await page.evaluate(() => { const qs = range(0, 300).map(() => shapeQ(4, ['flat', 'solid', 'moves'])), m = qs.filter(q => q.form === 'moves').length; return m > 60 && m < 150 && shapeQ(3, ['moves']).kind === 'shape' && shapeQ(4, ['moves']).form === 'moves' && range(0, 50).every(() => shapeQ(2, ['solid', 'moves']).kind === 'shape'); }), 'Shapes: Moves about a third of Year 4 with all three kinds; only Year 4 has it');
  await page.evaluate(() => { act = 'shape'; buildSheet({ yr: 4, kinds: ['flat', 'moves'], n: 12 }); show('sheet'); cards.forEach((c, i) => { if (i < 6) { c.q = movesQ(); layout(c); sizeCanvas(c); } }); });
  ok((await fits()).length === 0, 'Shapes Moves fit beside written shapes, tiles big enough ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/45-moves.png' });
  ok((await writeAllAndMark()).length === 0, 'Shapes Moves and written shapes on one sheet: all marked right');
  ok(await page.evaluate(() => [ACTS.shape.key({ yr: 4, kinds: ['flat', 'solid', 'moves'], n: 12 }), ACTS.shape.key({ yr: 3, kinds: ['flat', 'solid', 'moves'], n: 12 }), ACTS.shape.key({ yr: 3, kinds: ['moves'], n: 6 }), labelFor('shape~4|flat,moves|12')].join(' / ') === 'shape~4|flat,solid,moves|12 / shape~3|flat,solid|12 / shape~3|flat|6 / Shapes · Year 4 · flat, moves · 12 questions'), 'Shapes record keys: Moves only in Year 4 keys; label');

  // ---- Shapes, Year 5 (C3c): parallel sides, right angles, lines, prisms, nets
  const sh5 = await page.evaluate(() => {
    const bad = [], seen = {}, near = {};
    // every hand-made shape: no near misses (sides 15° clear of parallel, corners 15° clear of square)
    for (const [nm, P] of Object.entries(SHAPES5)) {
      const D = sideDirs(P);
      D.forEach((a, i) => D.forEach((b, j) => { if (j > i) { const g = dirGap(a, b); if (g >= 1 && g < 15) bad.push(`${nm} sides ${i},${j} ${g.toFixed(1)}°`); } }));
      cornerAngles(P).forEach((a, i) => { if (Math.abs(a - 90) >= 1 && Math.abs(a - 90) < 15) bad.push(`${nm} corner ${i} ${a.toFixed(1)}°`); });
      if (cornerAngles(P).reduce((s, a) => s + a, 0).toFixed(0) !== String((P.length - 2) * 180)) bad.push(nm + ' angles');
    }
    const want = { square: [2, 4], rectangle: [2, 4], parallelogram: [2, 0], rhombus: [2, 0], trapezium: [1, 0], 'right trapezium': [1, 2], kite: [0, 1], quadrilateral: [0, 0], hexagon: [3, 0], 'L hexagon': [6, 5], 'house hexagon': [2, 2], 'hexagon, one pair': [1, 0], 'hexagon, no pairs': [0, 0] };
    for (const [nm, [p, r]] of Object.entries(want)) if (parPairs(SHAPES5[nm]) !== p || rightCount(SHAPES5[nm]) !== r) bad.push(`${nm} ${parPairs(SHAPES5[nm])} ${rightCount(SHAPES5[nm])}`);
    // the line pairs: read the drawn lines back
    const ang = l => Math.atan2(l[3] - l[1], l[2] - l[0]) * 180 / Math.PI;
    const crosses = (a, b) => { const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); const [p1, p2, p3, p4] = [[a[0], a[1]], [a[2], a[3]], [b[0], b[1]], [b[2], b[3]]]; return o(p1, p2, p3) !== o(p1, p2, p4) && o(p3, p4, p1) !== o(p3, p4, p2); };
    for (let i = 0; i < 1500; i++) {
      const q = shape5Q(['flat', 'solid', 'nets']), k = q.solid ? 'solid' : q.form || q.ask;
      seen[k] = (seen[k] || 0) + 1;
      if (q.solid) { if (q.ans !== SOLIDS[q.solid][q.ask]) bad.push('solid ' + q.solid); continue; }
      if (q.ask === 'par' && (q.ans !== parPairs(q.pts) || q.nm === 'L hexagon' || q.ans !== want[q.nm][0])) bad.push('par ' + q.nm + ' ' + q.ans);
      if (q.ask === 'right' && (q.ans !== rightCount(q.pts) || q.ans !== want[q.nm][1])) bad.push('right ' + q.nm + ' ' + q.ans);
      if (q.ask) { if (q.pts.some(p => Math.hypot(...p) > 46)) bad.push('too big ' + q.nm); continue; }
      if (q.form === 'lines') {
        const d = document.createElement('div');
        q.tiles.forEach((t, j) => {
          d.innerHTML = t.html;
          const L = [...d.querySelectorAll('line')].map(l => ['x1', 'y1', 'x2', 'y2'].map(a => +l.getAttribute(a)));
          const g = dirGap(ang(L[0]), ang(L[1])), x = crosses(L[0], L[1]);
          const isRight = j === q.right;
          if (q.type === 'par') {
            if (isRight && (g > 0.5 || x)) bad.push('parallel tile ' + g);
            if (!isRight && g < 14.5) bad.push('a wrong tile nearly parallel ' + g);
            if (q.pairs[j].form === 'near') { near.n = (near.n || 0) + 1; if (x) bad.push('near pair touches'); }
          } else {
            if (isRight && Math.abs(g - 90) > 0.5) bad.push('perpendicular tile ' + g);
            if (!isRight && Math.abs(g - 90) < 14.5) bad.push('a wrong tile nearly square ' + g);
          }
          if (L.flat().some(v => Math.abs(v) > 28)) bad.push('line out of its box');
        });
        if (q.tiles[q.right].label !== q.ans || !/^Which two lines are (parallel|perpendicular)\?$/.test(q.say)) bad.push('lines say ' + q.say);
      }
    }
    if (!(seen.par > 120 && seen.right > 100 && seen.lines > 100 && seen.solid > 400 && seen.net > 400)) bad.push('spread ' + JSON.stringify(seen));
    if (range(0, 60).some(() => [2, 3, 4].some(y => /prism\d|^(pent|hex)/.test(shapeQ(y, ['solid']).solid || ''))) || range(0, 60).some(() => shapeQ(4, ['nets']).form === 'net')) bad.push('Year 5 parts below Year 5');
    return bad.slice(0, 6);
  });
  ok(sh5.length === 0, 'Shapes Year 5: parallel pairs and right angles counted right with no near misses; the parallel or perpendicular tile is the only one, wrong ones 15° or more out; prisms only in Year 5 ' + sh5.join(' | '));
  // nets: fold every grid net on a cube; the others by their parts
  const nets = await page.evaluate(() => {
    const bad = [];
    const folds = cells => {
      const key = c => c.join(), set = new Set(cells.map(key)), neg = v => v.map(x => -x), seen = new Map([[key(cells[0]), { d: [0, 0, -1], n: [0, 1, 0], e: [1, 0, 0] }]]), stack = [cells[0]];
      while (stack.length) {
        const c = stack.pop(), o = seen.get(key(c));
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nc = [c[0] + dx, c[1] + dy]; if (!set.has(key(nc)) || seen.has(key(nc))) continue;
          let { d, n, e } = o;
          if (dx === 1) [d, e] = [e, neg(d)]; else if (dx === -1) [d, e] = [neg(e), d]; else if (dy === 1) [d, n] = [n, neg(d)]; else [d, n] = [neg(n), d];
          seen.set(key(nc), { d, n, e }); stack.push(nc);
        }
      }
      return seen.size === 6 && new Set([...seen.values()].map(o => o.d.join())).size === 6;
    };
    const makes = n => n.g === 'grid' ? (!folds(n.cells) ? null : n.cw.every(w => w === 1) && n.rh.every(h => h === 1) ? 'cube' : 'cuboid')
      : n.g === 'prism' ? (n.tris.length === 2 && n.tris.some(t => t[1] === 'up') && n.tris.some(t => t[1] === 'down') ? 'prism' : null)
      : n.g === 'pyr' ? (new Set(n.sides).size === 4 ? 'pyramid' : null)
      : (n.circles.length === 2 && n.circles[0][1] !== n.circles[1][1] ? 'cylinder' : null);
    CUBE_NETS.ok.forEach(c => { if (!folds(c)) bad.push('cube ok ' + JSON.stringify(c)); });
    CUBE_NETS.bad.forEach(c => { if (folds(c)) bad.push('cube bad ' + JSON.stringify(c)); });
    CUBOID_NETS.ok.forEach(c => { if (!folds(c.cells)) bad.push('cuboid ok'); });
    CUBOID_NETS.bad.forEach(c => { if (folds(c.cells)) bad.push('cuboid bad'); });
    const solids = new Set();
    for (let i = 0; i < 600; i++) {
      const q = netQ(), m = q.nets.map(makes);
      solids.add(q.of);
      if (m.filter(x => x === q.of).length !== 1 || m[q.right] !== q.of || q.tiles[q.right].label !== q.ans || q.tiles.length !== 3) bad.push(q.of + ' ' + m);
      // every face of a grid net is a rectangle in the cuboid's sizes; circles of a cylinder never overlap
      if (q.nets.some(n => n.g === 'cyl' && n.circles.length === 2 && n.circles[0][1] === n.circles[1][1] && Math.abs(n.circles[0][0] - n.circles[1][0]) < 0.8)) bad.push('circles overlap');
    }
    if (solids.size !== 5) bad.push('solids ' + [...solids]);
    return bad.slice(0, 6);
  });
  ok(nets.length === 0, 'Shapes Nets: every cube and cuboid net labelled right by folding it; exactly one tile folds into the solid on top; all five solids ' + nets.join(' | '));
  await yearSheet('shape', 5, 'Shapes');
  ok(await page.evaluate(() => cards.every(c => c.q.kind === 'tap' ? c.el.querySelectorAll('.tt svg').length === 3 : c.q.solid ? c.el.querySelectorAll('svg line[stroke-dasharray]').length >= 3 : c.el.querySelector('svg polygon').getAttribute('points').split(' ').length === c.q.pts.length)), 'Shapes Year 5 sheet: three picture tiles on tap cards, hidden edges dashed, the shape drawn');
  await page.evaluate(() => { hideDone(); act = 'shape'; buildSheet({ yr: 5, kinds: ['flat', 'solid', 'nets'], n: 12 }); show('sheet'); cards.forEach((c, i) => { c.q = i % 4 === 0 ? netQ() : i % 4 === 1 ? linesQ(i % 8 === 1 ? 'par' : 'perp') : i % 4 === 2 ? shape5Q(['solid']) : shape5Q(['flat']); layout(c); sizeCanvas(c); }); cards[2].q = { ...cards[2].q, solid: 'hexprism', ask: 'edges', cap: 'How many edges?', ans: 18 }; layout(cards[2]); sizeCanvas(cards[2]); cards[6].q = { ...cards[6].q, solid: 'pentprism', ask: 'faces', cap: 'How many faces?', ans: 7 }; layout(cards[6]); sizeCanvas(cards[6]); });
  ok(await page.evaluate(() => cards[2].el.querySelectorAll('svg line[stroke-dasharray]').length === 5 && cards[6].el.querySelectorAll('svg line[stroke-dasharray]').length === 3 && cards[2].el.querySelectorAll('svg polygon').length === 4 && cards[6].el.querySelectorAll('svg polygon').length === 4), 'hexagonal prism: 3 side faces and the end showing, 5 hidden edges dashed; pentagonal prism: 3 hidden edges');
  ok((await fits()).length === 0, 'Shapes Year 5: nets, lines, prisms and parallel cards fit, tiles big enough ' + (await fits()).join(' '));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/47-shapes-y5.png' });
  const wm5 = await writeAllAndMark();
  ok(wm5.length === 0, 'Shapes Year 5: tapped and written answers marked right ' + wm5.join(' | ').slice(0, 600));
  ok(await page.evaluate(() => [ACTS.shape.key({ yr: 5, kinds: ['flat', 'solid', 'moves', 'nets'], n: 12 }), ACTS.shape.key({ yr: 4, kinds: ['flat', 'solid', 'moves', 'nets'], n: 12 }), ACTS.shape.defaults(8).kinds.join(), labelFor('shape~5|flat,solid,nets|12')].join(' / ') === 'shape~5|flat,solid,nets|12 / shape~4|flat,solid,moves|12 / flat,solid,moves,nets / Shapes · Year 5 · flat, 3D, nets · 12 questions'), 'Shapes record keys: Nets only in Year 5 keys; label');

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
  await wait(900);
  ok(await page.evaluate(() => !$('#doneS').hidden && $('#dAgain').textContent === 'Another grid' && $('#dUp').hidden), 'a finished grid shows the finish panel too (Another grid, no Harder)');
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
  ok(await page.evaluate(() => draft.kinds.join() === 'frame,groups'), 'How many? starts with both kinds: ten frame and Groups');
  const hm = await page.evaluate(() => cards.every(c => c.q.kind === 'frame' && c.el.querySelectorAll('svg circle').length === c.q.ans && c.q.ans >= 1 && c.q.ans <= 10 && (c.q.parts ? c.q.ans === c.q.parts[0] + c.q.parts[1] : c.q.ans === c.q.dots)));
  ok(hm, 'How many?: the picture shows exactly the answer in dots (up to 10)');
  const grp = await page.evaluate(() => {
    const bad = [];
    for (const max of [5, 10, 20]) for (let i = 0; i < 300; i++) {
      const q = ACTS.howmany.make({ kinds: ['groups'], max, n: 6 }), [a, b] = q.parts;
      const fills = [...new DOMParser().parseFromString(clustersSvg(q.parts, q.cols), 'image/svg+xml').querySelectorAll('circle')].map(e => e.getAttribute('fill'));
      if (q.ans !== a + b || a < 1 || b < 1 || a > 6 || b > 6 || q.ans > Math.min(max, 10) || q.cols[0] === q.cols[1] || fills.length !== q.ans || fills.filter(f => f === BLOCK[q.cols[0]]).length !== a || fills.filter(f => f === BLOCK[q.cols[1]]).length !== b) bad.push(JSON.stringify(q));
    }
    return bad.slice(0, 3);
  });
  ok(grp.length === 0, 'How many? Groups: two dice patterns (1–6 each) in two colours, total up to 10 (5 when "Up to 5") ' + grp.join(' | '));
  ok(await page.evaluate(() => { writeNum(cards[0], cards[0].q.ans); return read(cards[0]) === String(cards[0].q.ans); }), 'How many?: answer under the line read');
  await page.click('#sayBtn');
  ok((await said()).slice(-1)[0] === 'How many dots?', 'speaker button repeats it');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/7-howmany.png' });
  await page.click('#setupBtn');
  ok(await visible('#optBlock [data-key="max"]') && !(await visible('#kpBlock')), 'How many? setup: Up to, no keypads');
  await page.click('#optBlock [data-key="kinds"] [data-v="frame"]'); // Groups only
  await page.click('#newBtn');
  ok(await page.evaluate(() => cards.every(c => !!c.q.parts && c.el.querySelectorAll('.frame svg').length === 1)), 'How many? Groups only: every card two clusters, no ten frame');
  ok((await fits()).length === 0, 'How many? Groups fit with room to write ' + (await fits()).join(' '));
  ok((await writeAllAndMark()).length === 0, 'How many? Groups: answers under the dots read and marked right');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/7-howmany-groups.png' });
  ok(await page.evaluate(() => sheetKey === 'howmany~10|6|groups' && labelFor(sheetKey) === 'How many? · groups · up to 10 · 6 questions'), 'How many? Groups record key and label');
  await page.click('#setupBtn');
  await page.click('#optBlock [data-key="kinds"] [data-v="frame"]');
  await page.click('#optBlock [data-key="kinds"] [data-v="groups"]'); // ten frames only, as before
  await page.click('#optBlock [data-key="max"] [data-v="20"]');
  await page.click('#newBtn');
  ok(await page.evaluate(() => sheetKey === 'howmany~20|6' && cards.every(c => c.el.querySelectorAll('.frame svg').length === 2 && c.el.querySelectorAll('svg circle').length === c.q.dots)), 'up to 20, ten frames only: two frames, dots match, the old record key');
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
  // ---- deleting records (Sam: someone else did a sheet on her name)
  const r0 = await page.evaluate(() => { const r = loadRec(current), h = r.history[0]; return { n: r.history.length, t: h.t, k: h.k, count: r.best[h.k].count }; });
  await page.click(`#history .del[data-t="${r0.t}"]`);
  ok(await page.evaluate(t => $(`#history .del[data-t="${t}"]`).textContent === 'Keep' && !$('#confirmBox').hidden && /^Tap here to delete .+ from Mia$/.test($('#confirmRemoveBtn').textContent), r0.t), 'Delete on a sheet: it turns into Keep, the real confirm appears at the top');
  await page.click('#confirmRemoveBtn');
  ok(await page.evaluate(n => loadRec(current).history.length === n, r0.n), 'the confirm ignores its first half second');
  await wait(600);
  await page.click('#confirmRemoveBtn');
  const r1 = await page.evaluate(k => { const r = loadRec(current), rest = r.history.filter(x => x.k === k); return { n: r.history.length, best: r.best[k], restMin: rest.length ? Math.min(...rest.map(x => x.ms)) : null }; }, r0.k);
  ok(r1.n === r0.n - 1 && (r1.best ? r1.best.count === r0.count - 1 && r1.best.ms <= r1.restMin : r1.restMin === null || r0.count === 1), 'that one sheet is gone; its best time and count are worked out again ' + JSON.stringify(r1));
  const k1 = await page.$eval('#records .del', b => b.dataset.k);
  await page.click('#records .del');
  await page.click('#records .del'); // Keep: cancels
  ok(await page.evaluate(() => $('#confirmBox').hidden && $('#records .del').textContent === 'Delete'), 'Keep cancels a delete');
  await page.click('#records .del'); await wait(600); await page.click('#confirmRemoveBtn');
  ok(await page.evaluate(k => { const r = loadRec(current); return !r.best[k] && !r.history.some(x => x.k === k); }, k1), 'Delete on a best time removes every sheet of that kind');
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
  // Sam: Firefox would not scroll the home tiles. The front screens now scroll the page itself.
  const sc = await page.evaluate(async () => {
    const tall = document.documentElement.scrollHeight > innerHeight + 100, locked = document.body.classList.contains('lock');
    scrollTo(0, 99999); await new Promise(r => setTimeout(r, 100));
    const last = [...document.querySelectorAll('#actTiles .tile')].pop().getBoundingClientRect(), head = $('header').getBoundingClientRect();
    return { tall, locked, y: scrollY, lastVisible: last.bottom <= innerHeight + 1 && last.top > 0, headTop: head.top };
  });
  ok(sc.tall && !sc.locked && sc.y > 0 && sc.lastVisible && sc.headTop === 0, 'phone home: the page scrolls to the last tile, the header stays at the top ' + JSON.stringify(sc));
  await page.click('#actTiles [data-act="howmany"]');
  ok(await page.evaluate(() => scrollY === 0), 'a new screen starts at the top');
  await page.click('#newBtn');
  ok(await page.evaluate(() => document.body.classList.contains('lock')), 'sheets lock the page (writing never scrolls it)');
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

  // the Year 4 additions (steps A1 to A4) in portrait, landscape and on a phone,
  // and every activity's question counts (each year, each count it offers) fit
  for (const [name, vp] of [['portrait', { width: 820, height: 1180, hasTouch: true }], ['landscape', { width: 1180, height: 820, hasTouch: true }], ['phone', { width: 390, height: 844, hasTouch: true, isMobile: true }]]) {
    await page.setViewport(vp);
    await page.goto(URL); await page.evaluate(HELPERS);
    await page.click('#nameTiles [data-id="old1"]');
    await page.evaluate(() => { setYear(4); });
    const runs = await page.evaluate(() => Object.keys(ACTS).filter(a => !ACTS[a].grid).flatMap(a => (yearsOf(a).length ? yearsOf(a) : [0]).flatMap(y => countsOf(a).map(n => [a, y, n]))));
    const badCounts = [];
    for (const [a, y, n] of runs) {
      await page.evaluate((a, y, n) => { act = a; const d = ACTS[a].defaults(ACTS[a].ages.includes(8) ? 8 : 5); if (y) d.yr = y; d.n = n; buildSheet(d); show('sheet'); }, a, y, n);
      const bad = await fits();
      if (bad.length) badCounts.push(`${a} Year ${y} × ${n}: ${bad[0]}`);
    }
    ok(badCounts.length === 0, `${name}: every activity, every year, every question count fits (${runs.length} sheets) ` + badCounts.slice(0, 4).join(' | '));
    if (SHOTS) for (const n of [4, 6]) { await page.evaluate(n => { act = 'story'; buildSheet({ yr: 4, kinds: ['addsub', 'muldiv'], n }); show('sheet'); }, n); await page.screenshot({ path: SHOTS + `/41-${name}-story-${n}.png` }); }
    for (const [a, c] of [['tf', { yr: 4, n: 12 }], ['cmp', { yr: 4, kinds: ['num', 'sum'], n: 12 }], ['pv', { kinds: ['blocks'], max: 9999, n: 12 }], ['money', { yr: 4, kinds: ['change'], n: 12 }],
      ['graph', { yr: 4, n: 12 }], ['nline', { steps: [25, 50, 1000], n: 12 }], ['muldiv', { yr: 4, ops: ['/'], n: 12 }], ['dec', { yr: 4, kinds: ['pic', 'line', 'addsub', 'ten'], n: 12 }],
      ['frac', { kinds: ['past', 'add'], parts: [2, 3, 4, 5, 6, 8, 10, 12], n: 12 }], ['cmp', { yr: 4, kinds: ['frac'], n: 12 }], ['fof', { yr: 4, kinds: ['part', 'whole'], n: 12 }],
      ['area', { kinds: ['odd', 'cubes'], max: 12, n: 12 }], ['ruler', { yr: 4, kinds: ['pencil', 'thermo'], n: 12 }], ['ruler', { yr: 2, kinds: ['scales'], n: 12 }], ['ruler', { yr: 2, kinds: ['jug'], n: 12 }],
      ['units', { yr: 4, n: 12 }], ['angle', { yr: 4, kinds: ['size'], n: 12 }], ['angle', { yr: 4, kinds: ['deg'], n: 12 }],
      ['map', { yr: 4, kinds: ['tap'], n: 6 }], ['map', { yr: 4, kinds: ['where'], n: 6 }], ['shape', { yr: 4, kinds: ['moves'], n: 12 }], ['money', { yr: 4, kinds: ['make'], n: 12 }],
      ['muldiv', { yr: 1, ops: ['*', '/'], n: 12 }], ['graph', { yr: 1, n: 12 }], ['howmany', { kinds: ['groups'], max: 10, n: 12 }],
      ['tf', { yr: 1, n: 12 }], ['cmp', { yr: 1, kinds: ['dots'], n: 12 }], ['cmp', { yr: 1, kinds: ['num'], n: 12 }], ['bal', { yr: 1, n: 12 }], ['clock', { yr: 1, kinds: ['match'], n: 12 }],
      ['addsub', { yr: 5, ops: ['+', '-'], n: 12 }], ['muldiv', { yr: 5, ops: ['*'], n: 12 }], ['muldiv', { yr: 5, ops: ['/'], n: 12 }], ['seq', { yr: 5, n: 12 }], ['pv', { kinds: ['expanded', 'more'], max: 999999, n: 12 }],
      ['tf', { yr: 5, n: 12 }], ['cmp', { yr: 5, kinds: ['num', 'sum', 'dec'], n: 12 }], ['cmp', { yr: 5, kinds: ['frac'], n: 12 }], ['bal', { yr: 5, n: 12 }], ['round', { yr: 5, kinds: ['line'], n: 12 }], ['round', { yr: 5, kinds: ['num'], n: 12 }],
      ['splat', { yr: 1, n: 12 }], ['parts', { yr: 1, kinds: ['tap'], n: 12 }], ['parts', { yr: 1, kinds: ['write'], n: 12 }], ['money', { yr: 1, kinds: ['coin'], n: 12 }], ['ruler', { yr: 1, kinds: ['longer'], n: 12 }],
      ['dec', { yr: 5, kinds: ['pic'], n: 12 }], ['dec', { yr: 5, kinds: ['line', 'addsub', 'ten'], n: 12 }], ['frac', { kinds: ['diff'], parts: [2, 3, 4, 5, 6, 8, 10, 12], n: 12 }],
      ['fof', { yr: 5, kinds: ['part', 'whole', 'pct'], n: 12 }], ['money', { yr: 5, kinds: ['count', 'change'], n: 12 }],
      ['angle', { yr: 5, kinds: ['name'], n: 12 }], ['angle', { yr: 5, kinds: ['measure'], n: 12 }], ['clock', { yr: 5, kinds: ['face', 'words'], n: 12 }], ['clock', { yr: 5, kinds: ['long'], n: 12 }], ['units', { yr: 5, n: 12 }],
      ['area', { kinds: ['lperim'], max: 12, n: 12 }], ['area', { kinds: ['same'], max: 12, n: 12 }], ['area', { kinds: ['layers'], max: 12, n: 12 }], ['map', { yr: 5, kinds: ['tap'], n: 6 }],
      ['shape', { yr: 5, kinds: ['nets'], n: 12 }], ['shape', { yr: 5, kinds: ['flat'], n: 12 }], ['shape', { yr: 5, kinds: ['solid'], n: 12 }],
      ['turn', { yr: 2, n: 12 }], ['map', { yr: 2, kinds: ['tap'], n: 6 }],
      ['tf', { yr: 3, n: 12 }], ['cmp', { yr: 3, kinds: ['num', 'sum'], n: 12 }], ['bal', { yr: 3, n: 12 }], ['round', { yr: 3, kinds: ['line', 'num'], n: 12 }],
      ['splat', { yr: 3, n: 12 }], ['bonds', { max: 100, n: 12 }], ['addsub', { yr: 3, ops: ['+', '-'], n: 12 }],
      ['cmp', { yr: 3, kinds: ['frac'], n: 12 }], ['frac', { kinds: ['add1'], parts: [2, 3, 4, 6, 8, 10, 12], n: 12 }], ['fof', { yr: 3, kinds: ['part', 'whole'], n: 12 }]]) {
      await page.evaluate((a, c) => { act = a; buildSheet(c); show('sheet'); }, a, c);
      const bad = await fits();
      ok(bad.length === 0, `${name}: ${a} (Year 4 additions) fits ` + bad.join(' '));
      const wrong = await writeAllAndMark();
      ok(wrong.length === 0, `${name}: ${a} read and marked right ` + wrong.join(' | '));
      if (SHOTS) await page.screenshot({ path: SHOTS + `/40-${name}-${a}${c.yr || ''}${(c.kinds || []).join('')}.png` });
    }
  }

  // ---- /sums/review/ links open the right activity with the right choices, and the report flag sends
  {
    const p2 = await browser.newPage();
    p2.on('pageerror', e => { console.log('page error: ' + e.message); fails++; });
    await p2.evaluateOnNewDocument(fakeSpeech);
    await p2.setViewport({ width: 820, height: 1180, hasTouch: true });
    await p2.goto(URL + 'review/');
    const links = await p2.$$eval('#todo a.go, #open a.go', as => as.map(a => a.getAttribute('href')));
    ok(links.length >= 20, `review page lists its links (${links.length})`);
    ok(await p2.$('#rptBtn') !== null, 'review page has the report flag');
    const badLinks = [];
    for (const href of links) {
      const q = href.replace(/^\.\.\/\??/, '');
      await p2.goto(URL + (q ? '?' + q : ''));
      if (!q) { if (!(await p2.$eval('#linkHint', e => e.hidden))) badLinks.push(href + ': hint shown with no link'); continue; }
      const want = Object.fromEntries(new URLSearchParams(q));
      const hint = await p2.$eval('#linkHint', e => e.hidden ? '' : e.textContent);
      if (!hint.startsWith('Next: ')) { badLinks.push(href + ': no hint'); continue; }
      await p2.click('#nameTiles [data-id="guest"]');
      if (await p2.$eval('#yearS', e => !e.hidden)) await p2.click('#yearTiles [data-year="4"]');
      const st = await p2.evaluate(() => ({ screen, act, draft, url: location.search }));
      if (st.screen !== 'setup' || st.act !== want.act) { badLinks.push(`${href}: on ${st.screen} ${st.act}`); continue; }
      if (st.url) badLinks.push(href + ': query left in the address');
      for (const [k, v] of Object.entries(want)) {
        if (k === 'act') continue;
        const got = [].concat(st.draft[k]).map(String).sort().join(), exp = v.split(',').sort().join();
        if (got !== exp) badLinks.push(`${href}: ${k} is ${got}, wanted ${exp}`);
      }
    }
    ok(badLinks.length === 0, 'every review link opens its activity with its choices ' + badLinks.slice(0, 4).join(' | '));
    // a named player saved with an age (from before years) becomes a year on load, then goes straight there; Back from it goes home
    await p2.evaluate(() => localStorage.setItem('sums-players', JSON.stringify([{ id: 'x1', name: 'Test', age: 6 }])));
    await p2.goto(URL + '?act=units&yr=4');
    ok(await p2.evaluate(() => { const p = store.get('sums-players', [])[0]; return p.year === 2 && !('age' in p) && $('#nameTiles [data-id="x1"] .sub').textContent === 'Year 2'; }), 'an old age 6 becomes Year 2 on load');
    await p2.click('#nameTiles [data-id="x1"]');
    ok(await p2.evaluate(() => screen === 'setup' && act === 'units' && draft.yr === 4), 'link: a named player lands on the setup');
    await p2.click('#backBtn');
    ok(await p2.evaluate(() => screen === 'home'), 'link: Back goes to her home');
    ok(await p2.evaluate(() => localStorage.getItem('sums-cfg-x1-units') === null), 'link: choices not saved before Start');

    // report: flag on a sheet sends app sums, the cards and the writing, never the name
    await p2.setRequestInterception(true);
    let sent = null;
    p2.on('request', r => {
      if (r.url().includes('/feedback/api/report')) {
        if (r.method() === 'POST') sent = JSON.parse(r.postData());
        r.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST' }, body: '{"ok":true}' });
      }
      else r.continue();
    });
    await p2.evaluate(() => { act = 'addsub'; buildSheet({ yr: 2, ops: ['+', '-'], n: 6 }); show('sheet'); });
    await p2.evaluate(HELPERS);
    await p2.evaluate(() => writeNum(cards[0], cards[0].q.ans));
    ok(await p2.$eval('#rptBtn', e => e.offsetParent !== null), 'report flag shows on a sheet');
    await p2.click('#rptBtn');
    await p2.click('#rptBox [data-r="It read the writing wrong"]');
    await p2.type('#rptBox textarea', 'test');
    await p2.click('#rptBox [data-a="send"]');
    await wait(400);
    const d = sent && sent.diagram ? JSON.parse(sent.diagram) : {};
    ok(sent && sent.app === 'sums' && /It read the writing wrong: test/.test(sent.message), 'report sends to the sums inbox');
    ok(d.act === 'addsub' && d.cards && d.cards.length === 6 && d.cards[0].strokes.length > 0 && 'ans' in d.cards[0].q, 'report carries the cards and her writing');
    ok(!sent || !JSON.stringify(sent).includes('"Test"'), 'report never sends the name');
    ok(await p2.$eval('#rptBox h2', e => e.textContent.startsWith('Thanks')), 'report says thanks');
    await p2.close();
    // the mock has the flag too
    const p3 = await browser.newPage();
    await p3.goto(URL + 'mock/');
    ok(await p3.$('#rptBtn') !== null, 'mock page has the report flag');
    await p3.close();
  }

  await browser.close();
  console.log(fails ? `${fails} failed` : 'all passed');
  process.exit(fails ? 1 : 0);
})();
