// ShiftWork v2 browser tests. Run via ./run.sh (serves the repo and sets SW_URL).
// Each test gets a fresh page with empty localStorage. Page globals (`state`,
// `undoStack`, functions) are reachable from page.evaluate because the app is
// one classic script.
const puppeteer = require(process.env.SW_MODS + '/puppeteer-core');
const URL = process.env.SW_URL;
const only = process.argv[2];

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// Logical canvas coords (680×560, no zoom) → page coords.
async function pt(page, x, y) {
  return page.evaluate((x, y) => {
    const r = canvas.getBoundingClientRect();
    return { x: r.left + (x * viewScale + viewOffsetX) * r.width / W, y: r.top + (y * viewScale + viewOffsetY) * r.height / H };
  }, x, y);
}
// Normalised plot coords → page coords.
async function ptn(page, xn, yn) {
  const c = await page.evaluate((xn, yn) => toCanvas(xn, yn), xn, yn);
  return pt(page, c.x, c.y);
}
async function drag(page, a, b, steps = 8) {
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps });
  await page.mouse.up();
}
const ev = (page, js) => page.evaluate(js);
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
const near = (a, b, tol = 0.002) => Math.abs(a - b) < tol;

// ─── TESTS ───────────────────────────────────────────────────

test('loads with no console errors and shows the beta tag', async (page, errors) => {
  const tag = await ev(page, `document.querySelector('header .tag').textContent`);
  assert(/beta/i.test(tag), 'beta tag missing: ' + tag);
  eq(errors.length, 0, 'console errors ' + errors.join(' | '));
});

test('loading a template is undoable, and offers Undo when it replaced work', async (page) => {
  await ev(page, `loadTemplate('sd')`);
  const n = await ev(page, `state.elements.length`);
  assert(n > 0, 'sd template empty');
  await ev(page, `loadTemplate('adas')`);
  assert(await ev(page, `document.getElementById('toast').classList.contains('show')`), 'toast not shown');
  await ev(page, `undo()`);
  eq(await ev(page, `state.curves.map(c => c.name)`), ['D', 'S'], 'undo did not restore S&D legend');
});

test('template curves are deep-copied (editing one does not change the template)', async (page) => {
  await ev(page, `loadTemplate('keyn')`);
  await ev(page, `state.elements.find(e => e.type === 'curve').points[0].xn = 0.9`);
  eq(await ev(page, `TEMPLATES.keyn.elements.find(e => e.type === 'curve').points[0].xn`), 0.05, 'template mutated');
});

test('a click with no movement adds no undo step and keeps redo', async (page) => {
  await ev(page, `loadTemplate('sd', { record: false }); undoStack = []; redoStack = [];`);
  await ev(page, `saveUndo(); redoStack = ['x'];`);
  const before = await ev(page, `undoStack.length`);
  // Click a quarter of the way along demand, away from the equilibrium guide lines.
  const mid = await ev(page, `(() => { const d = state.elements[0]; return toCanvas(d.x1n + (d.x2n - d.x1n) / 4, d.y1n + (d.y2n - d.y1n) / 4); })()`);
  const q = await pt(page, mid.x, mid.y);
  await page.mouse.click(q.x, q.y);
  eq(await ev(page, `state.selectedId`), await ev(page, `state.elements[0].id`), 'line not selected');
  eq(await ev(page, `undoStack.length`), before, 'click pushed an undo step');
  eq(await ev(page, `redoStack.length`), 1, 'click cleared redo');
});

test('arrows, double arrows and braces can be dragged to move them', async (page) => {
  for (const mk of ['mkArrow', 'mkDArrow', 'mkBrace']) {
    await ev(page, `state.elements = [${mk}(0.2, 0.5, 0.6, 0.5, '#1a4a8a', 2.5, '', '')]; redraw();`);
    const a = await ptn(page, 0.4, 0.5), b = await ptn(page, 0.4, 0.3);
    await drag(page, a, b);
    const el = await ev(page, `state.elements[0]`);
    assert(near(el.y1n, 0.3, 0.01) && near(el.y2n, 0.3, 0.01), `${mk} did not move: y1n=${el.y1n}`);
  }
});

test('brace label hit area is at the tip where it is drawn', async (page) => {
  await ev(page, `state.elements = [mkBrace(0.2, 0.5, 0.6, 0.5, '#1a4a8a', 1.5, 'Tax')]; redraw();`);
  const r = await ev(page, `(() => { const el = state.elements[0]; const a = toCanvas(el.x1n, el.y1n), b = toCanvas(el.x2n, el.y2n);
    return { pos: getFullLabelPos(el), tip: braceGeometry(a.x, a.y, b.x, b.y, el.flip).tip }; })()`);
  assert(near(r.pos.x, r.tip.x, 0.01) && near(r.pos.y, r.tip.y, 0.01), 'label pos != tip');
});

test('selected endpoint handle wins over a label sitting beside it', async (page) => {
  await ev(page, `state.elements = [mkLine(0.2, 0.6, 0.6, 0.6, '#1a4a8a', 2.5, '', 'S')]; state.selectedId = state.elements[0].id; redraw();`);
  const a = await ptn(page, 0.6, 0.6), b = await ptn(page, 0.8, 0.6);
  await drag(page, a, b);
  const el = await ev(page, `state.elements[0]`);
  assert(near(el.x2n, 0.8, 0.01), 'endpoint did not move, x2n=' + el.x2n);
});

test('double-click to finish a curve adds no duplicate points', async (page) => {
  await ev(page, `snapEnabled = false; setTool('curve')`);
  const pts = [[0.1, 0.8], [0.4, 0.5], [0.7, 0.2]];
  for (let i = 0; i < pts.length; i++) {
    const p = await ptn(page, ...pts[i]);
    if (i < pts.length - 1) { await page.mouse.click(p.x, p.y); await new Promise(r => setTimeout(r, 400)); }
    else await page.mouse.click(p.x, p.y, { count: 2 });
  }
  const c = await ev(page, `state.elements.find(e => e.type === 'curve')`);
  assert(c, 'no curve created; curvePoints=' + await ev(page, `JSON.stringify(curvePoints)`));
  eq(c.points.length, 3, 'point count');
});

test('Escape cancels a line mid-draw', async (page) => {
  await ev(page, `setTool('line')`);
  const a = await ptn(page, 0.2, 0.2), b = await ptn(page, 0.6, 0.6);
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  eq(await ev(page, `state.elements.length`), 0, 'line was created');
});

test('title edits are live and undoable in one step', async (page) => {
  await page.click('#graph-title');
  await page.keyboard.type('Coffee');
  eq(await ev(page, `state.title`), 'Coffee', 'title not live');
  await page.click('#y-label'); // blur
  await ev(page, `undo()`);
  eq(await ev(page, `state.title`), '', 'undo did not clear title');
});

test('legend changes are undoable', async (page) => {
  await ev(page, `openAddCurve(); document.getElementById('modal-name').value = 'MSC'; confirmAddCurve();`);
  eq(await ev(page, `state.curves.length`), 1, 'curve not added');
  await ev(page, `undo()`);
  eq(await ev(page, `state.curves.length`), 0, 'legend add not undone');
});

test('autosave restores the diagram after a reload', async (page) => {
  await ev(page, `loadTemplate('ext_neg'); document.getElementById('graph-title').value = 'Smoking'; redraw(); writeAutosave();`);
  await page.reload({ waitUntil: 'load' });
  eq(await ev(page, `state.title`), 'Smoking', 'title not restored');
  eq(await ev(page, `state.curves.map(c => c.name)`), ['MPB=D', 'MPC=S', 'MSC'], 'legend not restored');
});

test('labels and legend names from a save code are escaped', async (page) => {
  await ev(page, `window.__pwned = 0; applyGraphData({ curves: [{ name: '<img src=x onerror="window.__pwned=1">', color: '#1a4a8a' }],
    elements: [mkLine(0.1, 0.1, 0.5, 0.5, '#1a4a8a', 2.5, '', '"><img src=x onerror="window.__pwned=2">')] });
    state.selectedId = state.elements[0].id; renderProps();`);
  await new Promise(r => setTimeout(r, 200));
  eq(await ev(page, `window.__pwned`), 0, 'markup executed');
  eq(await ev(page, `document.querySelector('#props-form input').value`), '"><img src=x onerror="window.__pwned=2">', 'label value mangled');
});

test('property selects show true values (opacity 25%, custom dash)', async (page) => {
  await ev(page, `state.elements = [mkRegion([{xn:.1,yn:.1},{xn:.5,yn:.1},{xn:.3,yn:.5}], '#1a4a8a', 'solid')]; state.selectedId = state.elements[0].id; bwMode = false; renderProps();`);
  const op = await ev(page, `[...document.querySelectorAll('#props-form select')].pop().selectedOptions[0].textContent`);
  eq(op, '25%', 'opacity shown');
  await ev(page, `state.elements = [mkLine(0.1, 0.1, 0.5, 0.5, '#1a4a8a', 1.5, '5,4', '')]; state.selectedId = state.elements[0].id; renderProps();`);
  const dash = await ev(page, `[...document.querySelectorAll('#props-form select')].pop().selectedOptions[0].textContent`);
  assert(/Custom/.test(dash), 'non-standard dash shown as ' + dash);
});

test('make horizontal/vertical works on double arrows', async (page) => {
  await ev(page, `state.elements = [mkDArrow(0.2, 0.5, 0.6, 0.55, '#1a4a8a', 2.5, '', '')]; state.selectedId = state.elements[0].id; makeLineOrthogonal();`);
  const el = await ev(page, `state.elements[0]`);
  eq(el.y1n, el.y2n, 'not horizontal');
});

test('Label tool uses an inline box (no prompt) and an empty edit leaves nothing', async (page) => {
  await ev(page, `setTool('text')`);
  const p = await ptn(page, 0.5, 0.5);
  await page.mouse.click(p.x, p.y);
  await new Promise(r => setTimeout(r, 50));
  await page.keyboard.type('Excess supply');
  await page.keyboard.press('Enter');
  eq(await ev(page, `state.elements.map(e => e.text)`), ['Excess supply'], 'text not created');
  await page.mouse.click(p.x + 100, p.y + 60);
  await new Promise(r => setTimeout(r, 50));
  await page.keyboard.press('Escape');
  eq(await ev(page, `state.elements.length`), 1, 'cancelled label left an element');
  await ev(page, `undo()`);
  eq(await ev(page, `state.elements.length`), 0, 'label creation not one undo step');
});

test('export keeps the selection', async (page) => {
  await ev(page, `loadTemplate('sd'); state.selectedId = state.elements[0].id; downloadJPG(1);`);
  eq(await ev(page, `state.selectedId`), await ev(page, `state.elements[0].id`), 'selection lost');
});

test('v1 save codes still load', async (page) => {
  // Shape of a v1.9 save: no `v` field.
  const v1 = { title: 'Old', yLabel: 'Price', xLabel: 'Qty', curves: [{ name: 'D', color: '#1a4a8a' }],
    elements: [{ id: 3, type: 'line', x1n: 0.1, y1n: 0.1, x2n: 0.9, y2n: 0.9, color: '#1a4a8a', weight: 2.5, dash: '', label: 'D', labelDx: 0, labelDy: 0 }],
    xLabelDx: 0, xLabelDy: 0, yLabelDx: 0, yLabelDy: 0 };
  const code = Buffer.from(encodeURIComponent(JSON.stringify(v1)).replace(/%([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), 'binary').toString('base64');
  await ev(page, `openSaveModal(); document.getElementById('save-code').value = ${JSON.stringify(code)}; loadFromSaveModal();`);
  eq(await ev(page, `state.title`), 'Old', 'v1 code did not load');
  eq(await ev(page, `currentGraphData().v`), 2, 'not upgraded to v2');
});

// ─── RUNNER ──────────────────────────────────────────────────
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  let pass = 0, fail = 0;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue;
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/accounts\.google|gsi|goatcounter|Failed to load resource/i.test(m.text())) errors.push(m.text()); });
    page.on('dialog', d => { errors.push('dialog: ' + d.message()); d.dismiss(); });
    try {
      await page.goto(URL, { waitUntil: 'load' });
      await page.evaluate(() => localStorage.clear());
      await page.reload({ waitUntil: 'load' });
      await t.fn(page, errors);
      const late = errors.filter(e => !/^dialog/.test(e) || true);
      if (late.length) throw new Error('page errors: ' + late.join(' | '));
      console.log('PASS', t.name); pass++;
    } catch (e) {
      console.log('FAIL', t.name, '\n    ', e.message); fail++;
    }
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
