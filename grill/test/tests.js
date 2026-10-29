// Grill tests. Page globals are reachable in page.evaluate (one classic script).
const puppeteer = require(process.env.GR_MODS + '/puppeteer-core');
const URL = process.env.GR_URL;
const only = process.argv[2] || '';
const shots = process.env.GR_SHOTS || '';
const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const assert = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };

const KINDS = ['tax', 'subsidy', 'ceiling', 'floor'];

test('generators always give whole-number, on-chart markets', async page => {
  const bad = await page.evaluate(() => {
    const out = [];
    for (const k of ['tax', 'subsidy', 'ceiling', 'floor']) for (let i = 0; i < 300; i++) {
      const sc = gen(k);
      const pts = diagram(sc).points;
      for (const p of pts) if (!isInt(p.x) || !isInt(p.y) || p.x <= 0 || p.x > GX || p.y <= 0 || p.y >= GY) out.push([k, p]);
      for (const l of diagram(sc).lines) if (!seg(l.line)) out.push([k, 'line off chart']);
    }
    return out.slice(0, 5);
  });
  assert(bad.length === 0, JSON.stringify(bad));
});

test('every shading concept is a whole number of clickable areas', async page => {
  const bad = await page.evaluate(() => {
    const out = [];
    for (const k of ['tax', 'subsidy', 'ceiling', 'floor']) for (let i = 0; i < 60; i++) {
      const sc = gen(k), cells = buildCells(sc), C = conceptsFor(sc);
      for (const c in C) {
        const area = cells.filter(g => g.sig.includes(c)).reduce((s, g) => s + g.polys.reduce((t, p) => t + polyArea(p), 0), 0);
        const want = polyArea(C[c].poly);
        if (Math.abs(area - want) > 1e-6) out.push([k, c, area, want]);
      }
    }
    return out.slice(0, 5);
  });
  assert(bad.length === 0, JSON.stringify(bad));
});

test('calculation answers match the drawn diagram', async page => {
  const bad = await page.evaluate(() => {
    const out = [];
    for (let i = 0; i < 200; i++) {
      const t = gen('tax');
      // Pc from the equations: Qd(P) = Qs(P - t)
      const Qd = P => 10 * (t.a - P) / t.b, Qs = P => 10 * (P - t.c) / t.d;
      let lo = 0, hi = 20; for (let j = 0; j < 60; j++) { const m = (lo + hi) / 2; Qd(m) > Qs(m - t.t) ? lo = m : hi = m; }
      if (Math.abs(lo - t.Pc) > 1e-6) out.push(['tax Pc', lo, t.Pc]);
      const s = gen('subsidy');
      const Qd2 = P => 10 * (s.a - P) / s.b, Qs2 = P => 10 * (P - s.c) / s.d;
      lo = 0; hi = 20; for (let j = 0; j < 60; j++) { const m = (lo + hi) / 2; Qd2(m) > Qs2(m + s.s) ? lo = m : hi = m; }
      if (Math.abs(lo - s.Pc) > 1e-6) out.push(['sub Pc', lo, s.Pc]);
    }
    return out.slice(0, 5);
  });
  assert(bad.length === 0, JSON.stringify(bad));
});

// Answer every step correctly by clicking, and check it scores as correct.
async function answerRight(page) {
  const st = await page.evaluate(() => ({ type: Q.steps[Q.i].type }));
  if (st.type === 'line') {
    const i = await page.evaluate(() => Q.steps[Q.i].cands.findIndex(c => c.ok));
    await page.evaluate(i => document.querySelector(`[data-cand="${i}"] .hit`).dispatchEvent(new MouseEvent('click', { bubbles: true })), i);
    await page.click('#check-btn');
  } else if (st.type === 'label') {
    const slots = await page.evaluate(() => labelSlots(Q.sc).map(s => ({ id: s.id, answer: s.answer })));
    for (const s of slots) {
      const ci = await page.evaluate(a => ui.chips.indexOf(a), s.answer);
      await page.click(`[data-chip="${ci}"]`);
      await page.evaluate(id => document.querySelector(`[data-slot="${id}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true })), s.id);
    }
    await page.click('#check-btn');
  } else if (st.type === 'shade') {
    const ids = await page.evaluate(() => ui.cells.map((g, i) => g.sig.includes(Q.steps[Q.i].concept) ? i : -1).filter(i => i >= 0));
    for (const i of ids) await page.evaluate(i => document.querySelector(`[data-cell="${i}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true })), i);
    await page.click('#check-btn');
  } else if (st.type === 'mc') {
    await page.evaluate(() => [...document.querySelectorAll('[data-opt]')].find(b => b.dataset.opt === Q.steps[Q.i].ans).click());
  } else {
    await page.evaluate(() => { document.getElementById('num-in').value = String(Q.steps[Q.i].ans); });
    await page.click('#check-btn');
  }
  return page.evaluate(() => document.querySelector('.verdict').textContent);
}

test('right answers score as correct in every drill (HL)', async page => {
  await page.evaluate(() => setLevel('HL'));
  for (const k of KINDS) for (const s of ['draw', 'label', 'shade', 'effects', 'calc']) {
    for (let rep = 0; rep < 4; rep++) {
      await page.evaluate((k, s) => startDrill('cell', k, s), k, s);
      const n = await page.evaluate(() => Q.steps.length);
      for (let j = 0; j < n; j++) {
        const v = await answerRight(page);
        assert(v === 'Correct', `${k}/${s} step ${j}: ${v}`);
        if (shots && rep === 0) await page.screenshot({ path: `${shots}/${k}-${s}-${j}.png` });
        await page.click('#next-btn');
      }
    }
  }
  const sc = await page.evaluate(() => store.scores['tax.draw']);
  assert(sc && sc.every(x => x === 1), 'scores saved');
});

test('a wrong shade is marked wrong and the score shows on the home grid', async page => {
  await page.evaluate(() => startDrill('cell', 'tax', 'shade'));
  const wrong = await page.evaluate(() => ui.cells.findIndex(g => !g.sig.includes(Q.steps[Q.i].concept)));
  await page.evaluate(i => document.querySelector(`[data-cell="${i}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true })), wrong);
  await page.click('#check-btn');
  const v = await page.evaluate(() => document.querySelector('.verdict').textContent);
  assert(v === 'Not quite. Try again.', v);
  // still editable straight away: the wrong area is red, untap it and shade the right ones
  assert(await page.evaluate(i => document.querySelector(`[data-cell="${i}"]`).classList.contains('wrong'), wrong), 'wrong area red');
  await page.evaluate(i => document.querySelector(`[data-cell="${i}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true })), wrong);
  const v2 = await answerRight(page);
  assert(v2 === 'Got it', v2);
  await page.evaluate(() => showHome());
  const txt = await page.evaluate(() => document.getElementById('grid').textContent);
  assert(txt.includes('0/1'), 'only the first try counts: ' + txt);
});

test('wrong label boxes stay editable, and Show me the answer reveals', async page => {
  await page.evaluate(() => startDrill('cell', 'tax', 'label'));
  const slots = await page.evaluate(() => labelSlots(Q.sc).map(s => ({ id: s.id, answer: s.answer })));
  // fill with everything shifted by one so all are wrong
  for (let i = 0; i < slots.length; i++) {
    const name = slots[(i + 1) % slots.length].answer;
    const ci = await page.evaluate(a => ui.chips.indexOf(a), name);
    await page.click(`[data-chip="${ci}"]`);
    await page.evaluate(id => document.querySelector(`[data-slot="${id}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true })), slots[i].id);
  }
  await page.click('#check-btn');
  const red = await page.evaluate(() => document.querySelectorAll('.slot.wrong').length);
  assert(red === slots.length, 'all boxes red: ' + red);
  assert(await page.evaluate(() => !document.getElementById('check-btn').hidden), 'check still available');
  await page.click('.giveup');
  const v = await page.evaluate(() => document.querySelector('.verdict').textContent);
  assert(v === 'Here’s the answer', v);
  assert(await page.evaluate(() => !document.getElementById('next-btn').hidden), 'next shown');
});

test('a wrong multiple-choice option greys out and another can be picked', async page => {
  await page.evaluate(() => startDrill('cell', 'floor', 'effects'));
  await page.evaluate(() => [...document.querySelectorAll('[data-opt]')].find(b => b.dataset.opt !== Q.steps[Q.i].ans).click());
  assert((await page.evaluate(() => document.querySelector('.verdict').textContent)) === 'Not quite. Try again.');
  await page.evaluate(() => [...document.querySelectorAll('[data-opt]')].find(b => b.dataset.opt === Q.steps[Q.i].ans).click());
  assert((await page.evaluate(() => document.querySelector('.verdict').textContent)) === 'Got it');
});

test('effects questions never show Shortage/Surplus on the graph', async page => {
  for (const k of ['ceiling', 'floor']) {
    await page.evaluate(k => startDrill('cell', k, 'effects'), k);
    const t = await page.evaluate(() => document.getElementById('chart').textContent);
    assert(!/Shortage|Surplus/.test(t), k + ': ' + t);
  }
});

test('labels can be dragged onto boxes and between boxes', async page => {
  await page.evaluate(() => startDrill('cell', 'subsidy', 'label'));
  const centre = sel => page.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, sel);
  const dragTo = async (from, to) => {
    const [x1, y1] = await centre(from), [x2, y2] = await centre(to);
    await page.mouse.move(x1, y1); await page.mouse.down();
    await page.mouse.move((x1 + x2) / 2, (y1 + y2) / 2, { steps: 4 }); await page.mouse.move(x2, y2, { steps: 4 });
    await page.mouse.up();
  };
  const slots = await page.evaluate(() => labelSlots(Q.sc).map(s => ({ id: s.id, answer: s.answer })));
  const ci = await page.evaluate(a => ui.chips.indexOf(a), slots[0].answer);
  await dragTo(`[data-chip="${ci}"]`, `[data-slot="${slots[1].id}"]`);
  assert((await page.evaluate(id => ui.filled[id], slots[1].id)) === slots[0].answer, 'chip dropped in box');
  await dragTo(`[data-slot="${slots[1].id}"]`, `[data-slot="${slots[0].id}"]`);
  const f = await page.evaluate(() => ui.filled);
  assert(f[slots[0].id] === slots[0].answer && !f[slots[1].id], 'moved between boxes: ' + JSON.stringify(f));
  assert(!(await page.evaluate(() => document.querySelector('.dragghost'))), 'ghost removed');
  assert((await page.evaluate(() => ui.chip)) === null, 'drag does not leave a chip selected');
  for (const s of slots.slice(1)) {
    const c = await page.evaluate(a => ui.chips.indexOf(a), s.answer);
    await dragTo(`[data-chip="${c}"]`, `[data-slot="${s.id}"]`);
  }
  await page.click('#check-btn');
  assert((await page.evaluate(() => document.querySelector('.verdict').textContent)) === 'Correct');
});

test('wrong labels go back to the list and can be put right', async page => {
  await page.evaluate(() => startDrill('cell', 'tax', 'label'));
  const slots = await page.evaluate(() => labelSlots(Q.sc).map(s => ({ id: s.id, answer: s.answer })));
  const place = async (name, id) => {
    await page.click(`[data-chip="${await page.evaluate(a => ui.chips.indexOf(a), name)}"]`);
    await page.evaluate(id => document.querySelector(`[data-slot="${id}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true })), id);
  };
  // swap the first two, everything else right
  await place(slots[1].answer, slots[0].id); await place(slots[0].answer, slots[1].id);
  for (const s of slots.slice(2)) await place(s.answer, s.id);
  await page.click('#check-btn');
  const st = await page.evaluate(() => ({ filled: Object.keys(ui.filled).length, red: document.querySelectorAll('.slot.wrong').length, free: document.querySelectorAll('.chip:not(.used)').length }));
  assert(st.red === 2 && st.free === 2 && st.filled === slots.length - 2, JSON.stringify(st));
  await place(slots[0].answer, slots[0].id); await place(slots[1].answer, slots[1].id);
  await page.click('#check-btn');
  assert((await page.evaluate(() => document.querySelector('.verdict').textContent)) === 'Got it');
});

test('what-if questions hide the graph; skip moves on without scoring', async page => {
  const hidden = await page.evaluate(() => {
    startDrill('cell', 'ceiling', 'effects');
    Q.steps = [{ skill: 'effects', type: 'mc', ...effectsFor(Q.sc).find(e => /above Pe/.test(e.q)) }]; Q.i = 0; renderStep();
    return { chart: document.getElementById('chart').style.display, ctx: document.getElementById('context').textContent };
  });
  assert(hidden.chart === 'none' && !/\$/.test(hidden.ctx), JSON.stringify(hidden));
  await page.click('#skip-btn');
  const scores = await page.evaluate(() => JSON.stringify(store.scores));
  assert(scores === '{}', 'skip records nothing: ' + scores);
});

test('SL hides the Calculate column', async page => {
  await page.evaluate(() => setLevel('SL'));
  const t = await page.evaluate(() => document.getElementById('grid').textContent);
  assert(!t.includes('Calculate'), t);
  await page.evaluate(() => setLevel('HL'));
  const t2 = await page.evaluate(() => document.getElementById('grid').textContent);
  assert(t2.includes('Calculate'), t2);
  if (shots) {
    await page.screenshot({ path: `${shots}/home.png` });
    await page.setViewport({ width: 390, height: 844 });
    await page.screenshot({ path: `${shots}/home-phone.png` });
    await page.evaluate(() => startDrill('cell', 'tax', 'shade'));
    await page.screenshot({ path: `${shots}/drill-phone.png` });
  }
});

(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  let fails = 0;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue;
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 1100 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    try { await t.fn(page); if (errors.length) throw new Error(errors[0]); console.log('ok  ', t.name); }
    catch (e) { fails++; console.log('FAIL', t.name, '\n     ', e.message); }
    await page.close();
  }
  await browser.close();
  console.log(fails ? `${fails} failed` : 'all passed');
  process.exit(fails ? 1 : 0);
})();
