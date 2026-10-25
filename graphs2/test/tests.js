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

// Feedback: fetch is stubbed so nothing reaches the live inbox.
const stubFetch = `window.__sent = []; window.fetch = async (url, opts) => { window.__sent.push({ url, body: JSON.parse(opts.body) }); return { ok: true, status: 200, json: async () => ({ ok: true }) }; };`;

test('feedback sends no picture or diagram unless ticked', async (page) => {
  await ev(page, stubFetch + `loadTemplate('sd');`);
  await page.click('header button[onclick="openFeedback()"]');
  await page.type('#fb-message', 'The label stayed behind');
  await page.click('#fb-send');
  await new Promise(r => setTimeout(r, 100));
  const sent = await ev(page, `window.__sent`);
  eq(sent.length, 1, 'requests sent');
  assert(sent[0].url === 'https://unisam.nz/feedback/api/report', 'url ' + sent[0].url);
  eq(sent[0].body.image, null, 'image sent without opt-in');
  eq(sent[0].body.diagram, null, 'diagram sent without opt-in');
  eq(sent[0].body.app, 'graphs2', 'app');
  eq(sent[0].body.type, 'bug', 'type');
  assert(sent[0].body.meta.version && sent[0].body.meta.browser, 'meta missing');
  assert(!(await ev(page, `document.getElementById('feedback-modal').classList.contains('open')`)), 'modal still open');
});

test('feedback includes picture and diagram when ticked, and they open from the inbox', async (page) => {
  await ev(page, stubFetch + `loadTemplate('ext_neg');`);
  await ev(page, `openFeedback()`);
  await page.type('#fb-message', 'Check this');
  await page.click('#fb-image');
  assert(await ev(page, `document.getElementById('fb-preview').style.display !== 'none'`), 'no preview shown');
  await page.click('#fb-diagram');
  await page.click('#fb-send');
  await new Promise(r => setTimeout(r, 100));
  const body = await ev(page, `window.__sent[0].body`);
  assert(/^data:image\/jpeg;base64,/.test(body.image || ''), 'image missing');
  const diagram = JSON.parse(body.diagram);
  eq(diagram.curves.length, 3, 'diagram curves');
  // Simulate the inbox's "Open this diagram" handoff.
  await ev(page, `loadTemplate('blank'); localStorage.setItem('sw2_open', ${JSON.stringify(body.diagram)});`);
  await page.reload({ waitUntil: 'load' });
  eq(await ev(page, `state.curves.length`), 3, 'handoff did not open the diagram');
  eq(await ev(page, `localStorage.getItem('sw2_open')`), null, 'handoff key not cleared');
});

test('feedback needs a message, and typing in it does not trigger shortcuts', async (page) => {
  await ev(page, stubFetch + `loadTemplate('sd'); state.selectedId = state.elements[0].id;`);
  await ev(page, `openFeedback()`);
  await page.click('#fb-send');
  eq(await ev(page, `window.__sent.length`), 0, 'sent an empty report');
  await page.type('#fb-message', 'abc');
  await page.keyboard.press('Backspace');
  eq(await ev(page, `state.elements.length`), 3, 'Backspace deleted an element');
});


// ─── PHASE 3: CONNECTED DIAGRAMS ─────────────────────────────

// Puts D and S on blank axes and returns their ids.
const sdLines = `state.elements = [mkLine(0.1, 0.1, 0.9, 0.9, '#1a4a8a', 2.5, '', 'D'), mkLine(0.1, 0.9, 0.9, 0.1, '#1a7a4a', 2.5, '', 'S')]; redraw();`;

test('equilibrium tool snaps to the crossing, connects, and numbers P₁/Q₁', async (page) => {
  await ev(page, sdLines + `setTool('equil')`);
  const p = await ptn(page, 0.51, 0.52);
  await page.mouse.click(p.x, p.y);
  const d = await ev(page, `state.elements.find(e => e.type === 'dot')`);
  assert(d, 'no point created');
  assert(near(d.xn, 0.5) && near(d.yn, 0.5), `not at crossing: ${d.xn},${d.yn}`);
  eq(d.on, await ev(page, `state.elements.slice(0, 2).map(e => e.id)`), 'not connected');
  eq([d.pLabel, d.qLabel], ['P₁', 'Q₁'], 'labels');
  eq(d.showDot, false, 'dot should be hidden by default');
  await page.mouse.click(p.x, p.y);
  eq(await ev(page, `state.elements.filter(e => e.type === 'dot').pop().pLabel`), 'P₂', 'second point numbering');
});

test('macro axes give PL/Y labels', async (page) => {
  await ev(page, `loadTemplate('blank'); document.getElementById('y-label').value = 'Price level'; document.getElementById('x-label').value = 'Real GDP';` + sdLines + `setTool('equil')`);
  const p = await ptn(page, 0.5, 0.5);
  await page.mouse.click(p.x, p.y);
  eq(await ev(page, `[state.elements[2].pLabel, state.elements[2].qLabel]`), ['PL₁', 'Y₁'], 'macro labels');
});

test('dragging a curve carries its equilibrium point, and undo puts it back', async (page) => {
  await ev(page, sdLines + `state.elements.push(mkEq(state.elements[0], state.elements[1], 'P', 'Q')); redraw();`);
  const a = await ptn(page, 0.3, 0.7), b = await ptn(page, 0.4, 0.7); // on S, drag right by 0.1
  await drag(page, a, b);
  const d = await ev(page, `state.elements[2]`);
  assert(near(d.xn, 0.55, 0.01) && near(d.yn, 0.55, 0.01), `point did not follow: ${d.xn},${d.yn}`);
  await ev(page, `undo()`);
  const d2 = await ev(page, `state.elements[2]`);
  assert(near(d2.xn, 0.5) && near(d2.yn, 0.5), 'undo did not restore point');
});

test('no drop line along a vertical or horizontal curve', async (page) => {
  await ev(page, `state.elements = [mkLine(0.1, 0.1, 0.9, 0.9, '#1a4a8a', 2.5, '', 'AD'), mkLine(0.5, 0, 0.5, 1, '#c8380a', 2.5, '', 'LRAS'), mkLine(0, 0.3, 1, 0.3, '#888', 2.5, '', 'Pmax')];
    state.elements.push(mkEq(state.elements[0], state.elements[1], 'P', 'Q'), mkEq(state.elements[0], state.elements[2], 'P', 'Q')); redraw();`);
  eq(await ev(page, `derived.get(state.elements[3].id)`), { skipQ: true, skipP: false }, 'vertical: skip the down line');
  eq(await ev(page, `derived.get(state.elements[4].id)`), { skipQ: false, skipP: true }, 'horizontal: skip the left line');
});

test('dragging a P label moves only the label, and it still follows afterwards', async (page) => {
  await ev(page, sdLines + `state.elements.push(mkEq(state.elements[0], state.elements[1], 'Pe', 'Qe')); redraw();`);
  const box = await ev(page, `dotLabelBox(state.elements[2], 'p')`);
  const a = await pt(page, box.x, box.y), b = await pt(page, box.x - 10, box.y - 20);
  await drag(page, a, b);
  const d = await ev(page, `state.elements[2]`);
  assert(Math.abs(d.pDy + 20) < 1.5 && near(d.yn, 0.5), `pDy=${d.pDy} yn=${d.yn}`);
  await ev(page, `state.elements[1].y1n += 0.1; state.elements[1].y2n += 0.1; redraw();`);
  const box2 = await ev(page, `dotLabelBox(state.elements[2], 'p')`);
  assert(box2.y > box.y - 20 + 15, 'label did not follow the point');
  await ev(page, `state.selectedId = state.elements[2].id; resetLabelPosition();`);
  eq(await ev(page, `state.elements[2].pDy`), 0, 'reset label position');
});

test('clicking a label without dragging edits it inline', async (page) => {
  await ev(page, sdLines + `state.elements.push(mkEq(state.elements[0], state.elements[1], 'P', 'Q')); redraw();`);
  const box = await ev(page, `dotLabelBox(state.elements[2], 'q')`);
  const a = await pt(page, box.x, box.y);
  await page.mouse.click(a.x, a.y);
  await page.keyboard.press('End');
  await page.keyboard.type('e');
  await page.keyboard.press('Enter');
  eq(await ev(page, `state.elements[2].qLabel`), 'Qe', 'inline edit of Q label');
});

test('Label tool attaches text placed beside a curve, Alt+drag leaves it behind', async (page) => {
  await ev(page, sdLines + `setTool('text')`);
  const p = await ptn(page, 0.3, 0.27); // just above D at (0.3, 0.3)
  await page.mouse.click(p.x, p.y);
  await new Promise(r => setTimeout(r, 50));
  await page.keyboard.type('Demand');
  await page.keyboard.press('Enter');
  const t = await ev(page, `state.elements.find(e => e.type === 'text')`);
  assert(t.attach && t.attach.id === await ev(page, `state.elements[0].id`), 'not attached to D: ' + JSON.stringify(t.attach));
  await ev(page, `setTool('select')`);
  const a = await ptn(page, 0.7, 0.7), b = await ptn(page, 0.7, 0.6);
  await drag(page, a, b);
  const t2 = await ev(page, `state.elements.find(e => e.type === 'text')`);
  assert(near(t2.yn, t.yn - 0.1, 0.01), 'text did not follow D');
  await page.keyboard.down('Alt');
  await drag(page, await ptn(page, 0.7, 0.6), await ptn(page, 0.7, 0.5));
  await page.keyboard.up('Alt');
  const t3 = await ev(page, `state.elements.find(e => e.type === 'text')`);
  assert(near(t3.yn, t2.yn, 0.005) && !t3.attach, 'Alt+drag should leave the text behind');
});

test('an arrow drawn between two curves keeps its ends on them', async (page) => {
  await ev(page, `snapEnabled = false; state.elements = [mkLine(0.1, 0.9, 0.5, 0.1, '#1a7a4a', 2.5, '', 'S1'), mkLine(0.3, 0.9, 0.7, 0.1, '#1a7a4a', 2.5, '', 'S2')]; redraw(); setTool('arrow');`);
  await drag(page, await ptn(page, 0.3, 0.5), await ptn(page, 0.5, 0.5));
  const ar = await ev(page, `state.elements[2]`);
  assert(ar.p1On && ar.p2On, 'ends not attached: ' + JSON.stringify(ar));
  await ev(page, `const s = state.elements[1]; s.x1n += 0.1; s.x2n += 0.1; redraw();`);
  const ar2 = await ev(page, `state.elements[2]`);
  assert(near(ar2.x2n, 0.6, 0.01), 'arrow end did not follow S2: ' + ar2.x2n);
});

test('deleting a curve deletes its equilibrium points', async (page) => {
  await ev(page, sdLines + `state.elements.push(mkEq(state.elements[0], state.elements[1], 'P', 'Q')); state.selectedId = state.elements[0].id; deleteSelected();`);
  eq(await ev(page, `state.elements.map(e => e.label)`), ['S'], 'point left behind');
});

test('templates load as connected points that follow their curves', async (page) => {
  for (const name of ['sd', 'adas', 'keyn', 'ext_neg', 'ext_pos']) {
    await ev(page, `loadTemplate('${name}')`);
    const r = await ev(page, `state.elements.filter(e => e.type === 'dot').map(d => ({ on: d.on, broken: !!(derived.get(d.id) || {}).broken, ok: d.on.every(id => elById(id)) }))`);
    assert(r.length, name + ': no points');
    r.forEach(x => assert(x.ok && !x.broken, name + ': bad point ' + JSON.stringify(x)));
  }
  // keyn: YFE label follows the YFE line.
  await ev(page, `loadTemplate('keyn'); const y = state.elements.find(e => e.type === 'line' && e.dash); y.x1n += 0.05; y.x2n += 0.05; redraw();`);
  assert(near(await ev(page, `state.elements.find(e => e.text === 'YFE').xn`), 0.76), 'YFE label did not follow');
});

test('v1 hand-drawn equilibria become connected points', async (page) => {
  // The v1.9 S&D template, verbatim.
  const v1 = { title: '', yLabel: 'Price ($/unit)', xLabel: 'Quantity (units/week)', curves: [], elements: [
    { id: 1, type: 'line', x1n: 0.08, y1n: 0.05, x2n: 0.92, y2n: 0.88, color: '#1a4a8a', weight: 2.5, dash: '', label: 'D', labelDx: 0, labelDy: 0 },
    { id: 2, type: 'line', x1n: 0.08, y1n: 0.88, x2n: 0.88, y2n: 0.08, color: '#1a7a4a', weight: 2.5, dash: '', label: 'S', labelDx: 0, labelDy: 0 },
    { id: 3, type: 'line', x1n: 0, y1n: 0.4625, x2n: 0.4975, y2n: 0.4625, color: '#aaa', weight: 1.5, dash: '5,4', label: '', labelDx: 0, labelDy: 0 },
    { id: 4, type: 'line', x1n: 0.4975, y1n: 0.4625, x2n: 0.4975, y2n: 1.0, color: '#aaa', weight: 1.5, dash: '5,4', label: '', labelDx: 0, labelDy: 0 },
    { id: 5, type: 'text', xn: 0.4975, yn: 1.02, text: 'Q*', color: '#333', size: 13 },
    { id: 6, type: 'text', xn: -0.07, yn: 0.4625, text: 'P', color: '#333', size: 13 },
    { id: 7, type: 'text', xn: 0.7, yn: 0.3, text: 'Surplus', color: '#333', size: 13 },
  ] };
  await ev(page, `applyGraphData(${JSON.stringify(v1)})`);
  const els = await ev(page, `state.elements.map(e => e.type + ':' + (e.label || e.text || e.pLabel + '/' + e.qLabel) + (e.on ? ':on' + e.on.join(',') : ''))`);
  eq(els, ['line:D', 'line:S', 'text:Surplus', 'dot:P/Q*:on1,2'], 'converted elements');
  // A v1 dot keeps showing its dot.
  await ev(page, `applyGraphData({ elements: [{ id: 1, type: 'line', x1n: 0.1, y1n: 0.1, x2n: 0.9, y2n: 0.9, label: 'D' }, { id: 2, type: 'line', x1n: 0.1, y1n: 0.9, x2n: 0.9, y2n: 0.1, label: 'S' }, { id: 3, type: 'dot', xn: 0.5, yn: 0.5, color: '#1a1918', pLabel: 'P', qLabel: 'Q' }] })`);
  eq(await ev(page, `[state.elements[2].showDot, state.elements[2].on]`), [true, [1, 2]], 'v1 dot');
});

test('choosing a dash makes the line thin, in the sidebar and in properties', async (page) => {
  await page.select('#stroke-weight', '4');
  await page.select('#stroke-dash', '6,4');
  eq(await ev(page, `document.getElementById('stroke-weight').value`), '1.5', 'sidebar weight');
  await ev(page, `state.elements = [mkLine(0.1, 0.1, 0.5, 0.5, '#1a4a8a', 4, '', '')]; state.selectedId = state.elements[0].id; updateProp('dash', '2,3');`);
  eq(await ev(page, `state.elements[0].weight`), 1.5, 'props weight');
});

test('exported picture has no warning marks', async (page) => {
  await ev(page, sdLines + `state.elements.push(mkEq(state.elements[0], state.elements[1], 'P', 'Q')); state.elements[1].x1n = 0.95; state.elements[1].x2n = 0.99; redraw();`);
  assert(await ev(page, `!!derived.get(state.elements[2].id).broken`), 'should be broken');
  await ev(page, `renderExport(1, 'image/png')`);
  eq(await ev(page, `exporting`), false, 'exporting flag left on');
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
