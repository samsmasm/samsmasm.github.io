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
  eq(await ev(page, `state.elements.filter(e => e.label).map(e => e.label)`), ['D', 'S'], 'undo did not restore S&D');
});

test('templates are built fresh each load (editing one does not change the next)', async (page) => {
  await ev(page, `loadTemplate('keyn')`);
  await ev(page, `state.elements.find(e => e.type === 'curve').points[0].xn = 0.9`);
  await ev(page, `loadTemplate('keyn')`);
  eq(await ev(page, `state.elements.find(e => e.type === 'curve').points[0].xn`), 0.05, 'template mutated');
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

test('legend is built from labels, off by default, and its changes are undoable', async (page) => {
  await ev(page, `loadTemplate('ext_neg')`);
  eq(await ev(page, `state.legend.show`), false, 'legend should start off');
  eq(await ev(page, `[...document.querySelectorAll('#curve-list .curve-name')].map(e => e.textContent)`), ['MPB=D', 'MPC=S', 'MSC'], 'legend entries');
  await page.click('#legend-show');
  eq(await ev(page, `state.legend.show`), true, 'legend not switched on');
  await page.click('#curve-list .curve-item:nth-child(3) input');
  eq(await ev(page, `legendEntries().map(e => e.label)`), ['MPB=D', 'MPC=S'], 'unticked entry still in legend');
  await ev(page, `undo(); undo();`);
  eq(await ev(page, `[state.legend.show, state.legend.hidden.length]`), [false, 0], 'legend changes not undone');
});

test('autosave restores the diagram after a reload', async (page) => {
  await ev(page, `loadTemplate('ext_neg'); document.getElementById('graph-title').value = 'Smoking'; redraw(); writeAutosave();`);
  await page.reload({ waitUntil: 'load' });
  eq(await ev(page, `state.title`), 'Smoking', 'title not restored');
  eq(await ev(page, `state.elements.filter(e => e.label).map(e => e.label)`), ['MPB=D', 'MPC=S', 'MSC'], 'diagram not restored');
});

test('labels and legend names from a save code are escaped', async (page) => {
  await ev(page, `window.__pwned = 0; applyGraphData({ v: 2,
    elements: [mkLine(0.1, 0.1, 0.5, 0.5, '#1a4a8a', 2.5, '', '"><img src=x onerror="window.__pwned=2">'),
               mkLine(0.1, 0.5, 0.5, 0.1, '#1a4a8a', 2.5, '', '<img src=x onerror="window.__pwned=1">')] });
    state.selectedId = state.elements[0].id; renderProps();`);
  await new Promise(r => setTimeout(r, 200));
  eq(await ev(page, `window.__pwned`), 0, 'markup executed');
  eq(await ev(page, `document.querySelector('#props-form input').value`), '"><img src=x onerror="window.__pwned=2">', 'label value mangled');
});

test('property selects show true values (opacity 25%, custom dash)', async (page) => {
  await ev(page, `state.elements = [mkRegion([{xn:.1,yn:.1},{xn:.5,yn:.1},{xn:.3,yn:.5}], '#1a4a8a', 'solid')]; state.selectedId = state.elements[0].id; renderProps();`);
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
  await ev(page, `loadTemplate('sd'); state.selectedId = state.elements[0].id; downloadImage('jpg');`);
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
  eq(await ev(page, `state.legend.show`), true, 'v1 legend list should become a shown legend');
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
  eq(diagram.elements.filter(e => e.label).length, 3, 'diagram curves');
  // Simulate the inbox's "Open this diagram" handoff.
  await ev(page, `loadTemplate('blank'); localStorage.setItem('sw2_open', ${JSON.stringify(body.diagram)});`);
  await page.reload({ waitUntil: 'load' });
  eq(await ev(page, `state.elements.filter(e => e.label).length`), 3, 'handoff did not open the diagram');
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
  for (const name of await ev(page, `Object.keys(TEMPLATES).filter(k => !['blank', 'ppc', 'lorenz', 'phillips', 'cost', 'jcurve'].includes(k))`)) {
    await ev(page, `loadTemplate('${name}')`);
    const r = await ev(page, `state.elements.filter(e => e.type === 'dot' && e.on).map(d => ({ on: d.on, broken: !!(derived.get(d.id) || {}).broken, ok: d.on.every(id => elById(id)) }))`);
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

test('choosing a dash makes the line thin; line style is set in one place', async (page) => {
  eq(await ev(page, `!!document.getElementById('stroke-weight') || !!document.getElementById('stroke-dash')`), false, 'sidebar line style still there');
  await ev(page, `state.elements = [mkLine(0.1, 0.1, 0.5, 0.5, '#1a4a8a', 4, '', '')]; state.selectedId = state.elements[0].id; updateProp('dash', '2,3');`);
  eq(await ev(page, `state.elements[0].weight`), 1.5, 'props weight');
});

test('exported picture has no warning marks', async (page) => {
  await ev(page, sdLines + `state.elements.push(mkEq(state.elements[0], state.elements[1], 'P', 'Q')); state.elements[1].x1n = 0.95; state.elements[1].x2n = 0.99; redraw();`);
  assert(await ev(page, `!!derived.get(state.elements[2].id).broken`), 'should be broken');
  await ev(page, `renderExport(1, 'image/png')`);
  eq(await ev(page, `exporting`), false, 'exporting flag left on');
});


// ─── PHASE 4: CONSOLIDATION ──────────────────────────────────

test('regions have one fill setting, and v1 pattern/bwPattern migrate', async (page) => {
  await ev(page, `applyGraphData({ elements: [
    { id: 1, type: 'region', points: [{xn:.1,yn:.1},{xn:.5,yn:.1},{xn:.3,yn:.5}], fillColor: '#1a4a8a', pattern: 'solid', bwPattern: 'bw-dots', fillOpacity: 0.25, label: 'CS' },
    { id: 2, type: 'region', points: [{xn:.1,yn:.6},{xn:.5,yn:.6},{xn:.3,yn:.9}], fillColor: '#1a4a8a', pattern: 'crosshatch', bwPattern: 'bw-hatch45', fillOpacity: 0.25, label: 'PS' }] })`);
  eq(await ev(page, `state.elements.map(e => [e.fill, 'pattern' in e, 'bwPattern' in e])`), [['dots', false, false], ['crosshatch', false, false]], 'migrated fill');
  await ev(page, `state.selectedId = 1; renderProps();`);
  eq(await ev(page, `[...document.querySelectorAll('#props-form select')].length`), 1, 'one fill select (hatch has no strength)');
});

test('one Export menu: JPG, PNG and copy image', async (page) => {
  await ev(page, `loadTemplate('sd'); window.__dl = []; HTMLAnchorElement.prototype.click = function () { window.__dl.push([this.download, this.href.split(';')[0]]); };
    window.__clip = null; window.ClipboardItem = function (o) { this.o = o; }; navigator.clipboard.write = async items => { window.__clip = Object.keys(items[0].o); };`);
  await page.click('#export-btn');
  assert(await ev(page, `document.getElementById('export-menu').classList.contains('open')`), 'menu not open');
  await page.click('#export-menu button:nth-child(2)');
  await page.click('#export-btn');
  await page.click('#export-menu button:nth-child(3)');
  eq(await ev(page, `window.__dl`), [['economics-graph.jpg', 'data:image/jpeg'], ['economics-graph.png', 'data:image/png']], 'downloads');
  await page.click('#export-btn');
  await page.click('#export-menu button:nth-child(1)');
  await new Promise(r => setTimeout(r, 100));
  eq(await ev(page, `window.__clip`), ['image/png'], 'clipboard');
  assert(!(await ev(page, `document.getElementById('export-menu').classList.contains('open')`)), 'menu left open');
});

test('exported picture grows a legend only when switched on', async (page) => {
  await ev(page, `loadTemplate('sd')`);
  const size = () => ev(page, `new Promise(r => { const i = new Image(); i.onload = () => r([i.width, i.height]); i.src = renderExport(1, 'image/png'); })`);
  eq(await size(), [680, 560], 'no legend when off');
  await ev(page, `setLegendShow(true)`);
  const [w, h] = await size();
  assert(w === 680 && h > 560, 'legend not added: ' + h);
});

test('header has no sign-in button', async (page) => {
  eq(await ev(page, `!!document.getElementById('header-auth-btn')`), false, 'header sign-in still there');
  eq(await ev(page, `getComputedStyle(document.getElementById('header-user')).display`), 'none', 'status shown when signed out');
});

test('colour is chosen in one place: new lines take the next unused colour, arrows are black', async (page) => {
  eq(await ev(page, `!!document.getElementById('color-row')`), false, 'sidebar colour row still there');
  await ev(page, `loadTemplate('blank'); setTool('line')`);
  const draw = async (x1, y1, x2, y2) => {
    const r = await page.$eval('#graph-canvas', c => { const b = c.getBoundingClientRect(); return { x: b.left, y: b.top, s: b.width / 680 }; });
    await page.mouse.move(r.x + x1 * r.s, r.y + y1 * r.s); await page.mouse.down();
    await page.mouse.move(r.x + x2 * r.s, r.y + y2 * r.s, { steps: 5 }); await page.mouse.up();
  };
  await draw(120, 100, 500, 450);
  await draw(120, 450, 500, 100);
  await ev(page, `setTool('arrow')`);
  await draw(300, 200, 400, 200);
  eq(await ev(page, `state.elements.map(e => e.color)`), ['#1a4a8a', '#c8380a', '#1a1918'], 'colours');
});

test('selected-object panel hides colour choice in B/W mode', async (page) => {
  await ev(page, `loadTemplate('sd'); state.selectedId = state.elements[0].id; renderProps()`);
  const hasColor = () => ev(page, `[...document.querySelectorAll('#props-form label')].some(l => l.textContent.trim() === 'Color')`);
  assert(await ev(page, `bwMode`), 'expected B/W by default');
  eq(await hasColor(), false, 'colour row shown in B/W');
  await ev(page, `toggleBW()`);
  eq(await hasColor(), true, 'colour row missing in Colour mode');
});


// ─── PHASE 5: BIG FEATURES ───────────────────────────────────

test('Shift right makes S₁ and S₂, an attached arrow, and the new equilibrium', async (page) => {
  await ev(page, `loadTemplate('sd'); state.selectedId = state.elements[1].id; renderProps();`);
  await page.click('.shift-row button:nth-child(2)');
  const r = await ev(page, `state.elements.map(e => ({ type: e.type, label: e.label, p: e.pLabel, q: e.qLabel, on: !!e.on, ends: !!(e.p1On && e.p2On) }))`);
  eq(r.filter(e => e.type === 'line').map(e => e.label), ['D', 'S₁', 'S₂'], 'curve labels');
  assert(r.some(e => e.type === 'arrow' && e.ends), 'no attached arrow');
  eq(r.filter(e => e.type === 'dot').map(e => [e.p, e.q, e.on]), [['P₁', 'Q₁', true], ['P₂', 'Q₂', true]], 'equilibria');
  const [d1, d2] = await ev(page, `state.elements.filter(e => e.type === 'dot')`);
  assert(d2.xn > d1.xn + 0.03 && d2.yn > d1.yn + 0.03, 'new equilibrium should be lower right');
  await ev(page, `undo()`);
  eq(await ev(page, `state.elements.length`), 3, 'shift is one undo step');
});

test('S1 and S_1 become S₁ in labels; free text keeps plain digits', async (page) => {
  await ev(page, `state.elements = [mkLine(0.1, 0.1, 0.9, 0.9, '#1a4a8a', 2.5, '', 'D')]; state.selectedId = state.elements[0].id; renderProps();`);
  await page.click('#props-form input[type=text]', { count: 3 });
  await page.keyboard.type('AD1');
  eq(await ev(page, `state.elements[0].label`), 'AD₁', 'loose subscript in curve label');
  eq(await ev(page, `[fmtLabel('S_12', false), fmtLabel('Q1 2024', false), fmtLabel('MPC=S', true)]`), ['S₁₂', 'Q1 2024', 'MPC=S'], 'formatting rules');
});

test('keyboard: tool letters, arrow nudge as one undo step, Ctrl+C/V and Ctrl+D', async (page) => {
  await ev(page, `state.elements = [mkLine(0.1, 0.5, 0.5, 0.5, '#1a4a8a', 2.5, '', 'S')]; state.selectedId = state.elements[0].id; undoStack = []; redraw();`);
  await page.keyboard.press('l');
  eq(await ev(page, `state.tool`), 'line', 'L picks line');
  await page.keyboard.press('v');
  eq(await ev(page, `state.tool`), 'select', 'V picks select');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.down('Shift'); await page.keyboard.press('ArrowRight'); await page.keyboard.up('Shift');
  const x = await ev(page, `toCanvas(state.elements[0].x1n, 0).x - toCanvas(0.1, 0).x`);
  assert(Math.abs(x - 11) < 0.01, 'nudged by ' + x);
  eq(await ev(page, `undoStack.length`), 1, 'nudges should be one undo step');
  await page.keyboard.down('Control'); await page.keyboard.press('c'); await page.keyboard.press('v'); await page.keyboard.press('d'); await page.keyboard.up('Control');
  eq(await ev(page, `state.elements.length`), 3, 'paste + duplicate');
});

test('middle points of a curve can be dragged', async (page) => {
  await ev(page, `state.elements = [mkCurve([{xn:.1,yn:.8},{xn:.4,yn:.5},{xn:.8,yn:.2}], '#1a4a8a', 2.5, '', 'C')]; state.selectedId = state.elements[0].id; redraw();`);
  await drag(page, await ptn(page, 0.4, 0.5), await ptn(page, 0.4, 0.7));
  const pts = await ev(page, `state.elements[0].points`);
  assert(near(pts[1].yn, 0.7, 0.01) && near(pts[0].yn, 0.8) && near(pts[2].yn, 0.2), 'middle point did not move alone: ' + JSON.stringify(pts));
});

test('touch: drawing a line and double-tapping to finish a curve work', async (page) => {
  await ev(page, `snapEnabled = false; setTool('line')`);
  const a = await ptn(page, 0.2, 0.2), b = await ptn(page, 0.6, 0.6);
  const cdp = await page.createCDPSession();
  const touch = (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y }] : [] });
  await touch('touchStart', a); await touch('touchMove', b); await touch('touchEnd');
  eq(await ev(page, `state.elements.map(e => e.type)`), ['line'], 'line not drawn by touch');
  await ev(page, `setTool('curve')`);
  for (const [x, y] of [[0.1, 0.8], [0.4, 0.5]]) { const p = await ptn(page, x, y); await touch('touchStart', p); await touch('touchEnd'); await new Promise(r => setTimeout(r, 500)); }
  const p = await ptn(page, 0.7, 0.2);
  await touch('touchStart', p); await touch('touchEnd'); await touch('touchStart', p); await touch('touchEnd');
  const c = await ev(page, `state.elements.find(e => e.type === 'curve')`);
  assert(c && c.points.length === 3, 'curve by double tap: ' + JSON.stringify(c && c.points));
});

test('shape templates (cost, ppc, lorenz) have their labelled curves', async (page) => {
  for (const [k, labels] of [['cost', ['MC', 'ATC', 'AVC']], ['ppc', ['PPC']], ['lorenz', ['Line of equality', 'Lorenz curve']]]) {
    await ev(page, `loadTemplate('${k}')`);
    eq(await ev(page, `state.elements.filter(e => e.label).map(e => e.label)`), labels, k);
  }
});

test('a template replaces everything: curves, title, axis labels and legend', async (page) => {
  await ev(page, `loadTemplate('adas'); state.title = 'My AD'; state.xLabelDx = 30; setLegendShow(true); syncTextInputs()`);
  await ev(page, `loadTemplate('cost')`);
  eq(await ev(page, `[state.title, state.yLabel, state.xLabel, state.xLabelDx, state.legend.show, document.getElementById('y-label').value]`),
    ['', 'Costs ($)', 'Quantity', 0, false, 'Costs ($)'], 'leftovers');
  eq(await ev(page, `state.elements.filter(e => e.label).map(e => e.label)`), ['MC', 'ATC', 'AVC'], 'curves');
  eq(await ev(page, `typeof addShape`), 'undefined', 'add-shape still there');
});

test('Fill region click mode fills the area bounded by curves, drop lines and axes', async (page) => {
  await ev(page, `loadTemplate('sd'); setFillMode('click'); setTool('region')`);
  const r = await page.$eval('#graph-canvas', c => { const b = c.getBoundingClientRect(); return { x: b.left, y: b.top, s: b.width / 680 }; });
  const at = await ev(page, `toCanvas(0.1, 0.3)`); // inside consumer surplus
  await page.mouse.click(r.x + at.x * r.s, r.y + at.y * r.s);
  await page.keyboard.press('Escape'); // close the label box
  const reg = await ev(page, `state.elements[0]`);
  eq(reg.type, 'region', 'no region made');
  let a = 0;
  reg.points.forEach((p, i) => { const q = reg.points[(i + 1) % reg.points.length]; a += p.xn * q.yn - q.xn * p.yn; });
  a = Math.abs(a) / 2;
  // y-axis, P line, D (carried on to the top edge): about 0.122 of the plot
  assert(Math.abs(a - 0.122) < 0.008, 'area ' + a.toFixed(4));
  assert(reg.points.length < 30, 'too many corners: ' + reg.points.length);
  // Off the plot, or in an area open to the top/right edge, nothing is filled.
  const n = await ev(page, `state.elements.length`);
  await page.mouse.click(r.x + 10 * r.s, r.y + 10 * r.s);
  const open = await ev(page, `toCanvas(0.9, 0.4)`); // right of the crossing, open to the right edge
  await page.mouse.click(r.x + open.x * r.s, r.y + open.y * r.s);
  eq(await ev(page, `state.elements.length`), n, 'filled off the plot or an open area');
});

test('clicking a selected Fill region button switches between click and draw', async (page) => {
  await ev(page, `setFillMode('click'); setTool('select')`);
  await page.click('#tool-region');
  eq(await ev(page, `[fillMode, state.tool]`), ['click', 'region'], 'first click only selects the tool');
  await page.click('#tool-region');
  eq(await ev(page, `[fillMode, state.tool, document.getElementById('fill-mode-label').textContent]`), ['draw', 'region', 'draw'], 'second click');
  await page.click('#tool-region');
  eq(await ev(page, `fillMode`), 'click', 'third click');
});

test('clicking a filled area again cycles its colour (or hatching in B/W)', async (page) => {
  await ev(page, `loadTemplate('sd'); setFillMode('click'); setTool('region')`);
  const at = await ev(page, `toCanvas(0.1, 0.3)`);
  await ev(page, `fillAt(${at.x}, ${at.y}); document.querySelector('.inline-label-edit')?.blur()`);
  const n = await ev(page, `state.elements.length`);
  const f0 = await ev(page, `state.elements[0].fill`);
  await ev(page, `fillAt(${at.x}, ${at.y})`);
  eq(await ev(page, `state.elements.length`), n, 'made a second region');
  assert(await ev(page, `state.elements[0].fill`) !== f0, 'B/W hatching did not change');
  await ev(page, `toggleBW()`);
  const c0 = await ev(page, `state.elements[0].fillColor`);
  await ev(page, `fillAt(${at.x}, ${at.y})`);
  assert(await ev(page, `state.elements[0].fillColor`) !== c0, 'colour did not change');
});

test('Style menu restyles the whole diagram in one undo step, leaving guides alone', async (page) => {
  await ev(page, `loadTemplate('tax')`);
  await page.click('#style-btn');
  assert(await ev(page, `document.getElementById('style-menu').classList.contains('open')`), 'menu did not open');
  await page.click('#style-menu button:last-child'); // All lines thick
  eq(await ev(page, `state.elements.filter(e => (e.type === 'line' || e.type === 'curve') && !isGuide(e)).every(e => e.weight === 4)`), true, 'not all thick');
  eq(await ev(page, `document.getElementById('style-menu').classList.contains('open')`), false, 'menu stayed open');
  await ev(page, `styleDiagram('hatching')`);
  const fills = await ev(page, `state.elements.filter(e => e.type === 'region').map(e => e.fill)`);
  eq(new Set(fills).size, fills.length, 'hatching not distinct');
  await ev(page, `styleDiagram('colours')`);
  const cols = await ev(page, `state.elements.filter(e => (e.type === 'line' || e.type === 'curve') && !isGuide(e)).map(e => e.color)`);
  eq(new Set(cols).size, cols.length, 'colours not distinct');
  await ev(page, `undo(); undo(); undo()`);
  eq(await ev(page, `state.elements.filter(e => e.type === 'line' && !isGuide(e)).every(e => e.weight === 2.5)`), true, 'undo did not restore');
});

test('settings shape templates, new drawings and exports, and are saved', async (page) => {
  await page.click('header button.gear');
  assert(await ev(page, `document.getElementById('settings-modal').classList.contains('open')`), 'settings did not open');
  const set = (key, label) => ev(page, `(() => { const f = PREF_FIELDS.flatMap(g => g[1]).find(f => f[0] === '${key}'); setPref('${key}', f[2].findIndex(o => o[1] === ${JSON.stringify(label)})); })()`);
  await set('weight', 'Thick');
  await set('guide', 'Dotted · · ·');
  await set('currency', '€');
  await set('eqLabels', 'Pe and Qe');
  await set('showDot', 'Yes');
  await set('fill', 'Always hatching');
  await set('bw', 'Colour');
  eq(await ev(page, `bwMode`), false, 'session did not switch to colour');
  await ev(page, `loadTemplate('sd')`);
  eq(await ev(page, `[state.yLabel, state.elements[0].weight, state.elements.find(e => e.type === 'dot').showDot, GUIDE.dash]`),
    ['Price (€/unit)', 4, true, '2,3'], 'template');
  await set('axisUnits', 'Plain: Price');
  await ev(page, `loadTemplate('monopoly')`);
  eq(await ev(page, `[state.yLabel, state.xLabel]`), ['Price, costs, revenue', 'Quantity'], 'plain axis titles');
  await ev(page, `loadTemplate('blank'); state.elements = [mkLine(0.1, 0.1, 0.9, 0.9, '#1a4a8a', 2.5, '', 'D'), mkLine(0.1, 0.9, 0.9, 0.1, '#1a7a4a', 2.5, '', 'S')]; redraw()`);
  eq(await ev(page, `nextEqLabels()`), ['Pe', 'Qe'], 'eq labels');
  eq(await ev(page, `newFill()`), 'hatch45', 'fill in colour mode');
  // Saved for next time.
  eq(await ev(page, `JSON.parse(localStorage.getItem('sw2_prefs')).currency`), '€', 'not saved');
  // Transparent PNG at 4×.
  await set('exportSize', 'Extra large (2720 px wide)');
  await set('transparent', 'Transparent (for coloured slides)');
  const px = await ev(page, `new Promise(res => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); res([img.width, x.getImageData(2, 2, 1, 1).data[3]]); }; img.src = exportPNG(); })`);
  eq(px, [2720, 0], 'export size / transparency');
  // Switch to the defaults and back: saved choices come back.
  await page.click('#prefs-switch');
  eq(await ev(page, `[useDefaults, prefs.currency, GUIDE.dash, bwMode, document.querySelector('#settings-form select').disabled]`), [true, '$', '6,4', true, true], 'defaults');
  await page.click('#prefs-switch');
  eq(await ev(page, `[useDefaults, prefs.currency, GUIDE.dash, bwMode]`), [false, '€', '2,3', false], 'back to mine');
  await ev(page, `resetPrefs()`);
  eq(await ev(page, `[prefs.currency, GUIDE.dash, bwMode, myPrefs.currency]`), ['$', '6,4', true, '$'], 'reset');
});

test('when zoomed in, dragging empty space moves the view', async (page) => {
  await ev(page, `loadTemplate('blank'); setTool('select'); changeZoom(2, W / 2, H / 2)`);
  const before = await ev(page, `[viewOffsetX, viewOffsetY]`);
  const b = await page.$eval('#graph-canvas', c => { const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(b.x, b.y); await page.mouse.down();
  await page.mouse.move(b.x + 60, b.y + 40, { steps: 5 }); await page.mouse.up();
  const after = await ev(page, `[viewOffsetX, viewOffsetY]`);
  assert(after[0] > before[0] && after[1] > before[1], 'view did not move: ' + JSON.stringify([before, after]));
});

test('Point tool places a dot or cross; click the button again to switch; on a crossing it links', async (page) => {
  await ev(page, `loadTemplate('sd'); setPointMode('dot')`);
  const click = async (xn, yn) => {
    const p = await ev(page, `(() => { const c = toCanvas(${xn}, ${yn}), b = canvas.getBoundingClientRect(), s = b.width / W;
      return { x: b.left + (c.x * viewScale + viewOffsetX) * s, y: b.top + (c.y * viewScale + viewOffsetY) * s }; })()`);
    await page.mouse.click(p.x, p.y);
  };
  await page.keyboard.press('p');
  eq(await ev(page, `state.tool`), 'point', 'P shortcut');
  await click(0.2, 0.7);
  const free = await ev(page, `state.elements[state.elements.length - 1]`);
  eq([free.type, free.mark, free.showDot, free.dropP, free.dropQ, free.pLabel, !!free.on], ['dot', 'dot', true, false, false, '', false], 'free dot');
  // The tool is already selected, so clicking its button switches to cross.
  await page.click('#tool-point');
  eq(await ev(page, `[pointMode, state.tool, document.getElementById('point-mode-label').textContent]`), ['cross', 'point', 'cross'], 'after click');
  // On the D x S crossing it links.
  const x = await ev(page, `(() => { const d = state.elements.find(e => e.type === 'dot' && !e.mark); return [d.xn, d.yn]; })()`);
  await click(x[0] + 0.01, x[1]);
  const linked = await ev(page, `state.elements[state.elements.length - 1]`);
  eq([linked.mark, linked.on && linked.on.length], ['cross', 2], 'linked cross');
  // Plain points don't change equilibrium numbering.
  eq(await ev(page, `nextEqLabels()`), ['P₂', 'Q₂'], 'eq numbering');
});

test('drawn MC passes exactly through the drawn lowest points of AVC and ATC', async (page) => {
  for (const [tpl, names] of [['cost', ['AVC', 'ATC']], ['perfcomp', ['ATC']], ['monopoly', ['ATC']]]) {
    await ev(page, `loadTemplate('${tpl}')`);
    const gaps = await ev(page, `(() => {
      const mc = state.elements.find(e => e.label === 'MC');
      return ${JSON.stringify(names)}.map(n => {
        const low = curveLowest(state.elements.find(e => e.label === n));
        // vertical distance in canvas px between MC and the curve's lowest point
        return Math.abs(toCanvas(0, curveYAt(mc, low.xn)).y - toCanvas(0, low.yn).y);
      });
    })()`);
    gaps.forEach((g, i) => assert(g < 0.5, tpl + ' ' + names[i] + ': MC misses the lowest point by ' + g.toFixed(2) + 'px'));
  }
});


// ─── PHASE 6: TEMPLATES ──────────────────────────────────────

test('every template loads cleanly, with labelled curves, inside the canvas', async (page, errors) => {
  const keys = await ev(page, `Object.keys(TEMPLATES)`);
  assert(keys.length >= 22, 'only ' + keys.length + ' templates');
  for (const k of keys) {
    await ev(page, `loadTemplate('${k}')`);
    const r = await ev(page, `(() => {
      const out = [];
      state.elements.forEach(e => {
        const pts = isLinear(e) ? [[e.x1n, e.y1n], [e.x2n, e.y2n]] : e.points ? e.points.map(p => [p.xn, p.yn]) : [[e.xn, e.yn]];
        pts.forEach(([x, y]) => { if (x < -0.13 || x > 1.1 || y < -0.1 || y > 1.1) out.push(e.type + ' ' + (e.label || e.text || '') + ' at ' + x.toFixed(2) + ',' + y.toFixed(2)); });
      });
      return out;
    })()`);
    eq(r, [], k + ': elements off the canvas');
  }
  eq(errors, [], 'errors');
});

test('tax template: the burden areas meet the equilibria exactly', async (page) => {
  await ev(page, `loadTemplate('tax')`);
  const r = await ev(page, `(() => {
    const dots = state.elements.filter(e => e.type === 'dot');
    const regs = state.elements.filter(e => e.type === 'region');
    return { p1: dots[0].yn, pc: dots[1].yn, q2: dots[1].xn, pp: dots[2].yn,
      cons: regs[0].points.map(p => p.yn), prod: regs[1].points.map(p => p.yn), right: regs[0].points[1].xn };
  })()`);
  assert(near(Math.min(...r.cons), r.pc) && near(Math.max(...r.cons), r.p1), 'consumer area edges');
  assert(near(Math.min(...r.prod), r.p1) && near(Math.max(...r.prod), r.pp), 'producer area edges');
  assert(near(r.right, r.q2), 'areas end at Q2');
  assert(r.pc < r.p1 && r.p1 < r.pp, 'Pc above P1 above Pp');
});

test('monopoly: profit area sits between price and AC at MC = MR', async (page) => {
  await ev(page, `loadTemplate('monopoly')`);
  const r = await ev(page, `(() => { const m = state.elements.find(e => e.type === 'dot' && e.on); const reg = state.elements.find(e => e.type === 'region');
    return { q: m.xn, right: reg.points[1].xn, top: Math.min(...reg.points.map(p => p.yn)), bottom: Math.max(...reg.points.map(p => p.yn)) }; })()`);
  assert(near(r.q, r.right, 0.003), 'profit area does not end at the MC = MR quantity');
  assert(r.top < r.bottom, 'price should be above AC (abnormal profit)');
});

test('template picker shows thumbnails by group and loads the choice', async (page) => {
  await ev(page, `loadTemplate('sd'); state.selectedId = state.elements[0].id;`);
  await page.click('.template-btn.browse');
  await page.waitForFunction(() => { const i = [...document.querySelectorAll('#template-grid img')]; return i.length && i.every(x => x.src.startsWith('data:image/png')); }, { timeout: 5000 });
  eq(await ev(page, `[...document.querySelectorAll('#template-grid h3')].map(h => h.textContent)`), ['Micro', 'Macro', 'Global'], 'groups');
  assert(await ev(page, `[...document.querySelectorAll('#template-grid img')].every(i => i.src.startsWith('data:image/png'))`), 'thumbnails missing');
  eq(await ev(page, `[state.elements.length, state.selectedId === state.elements[0].id, undoStack.length]`), [3, true, 1], 'thumbnails disturbed the diagram');
  await page.click('.tpl-card[onclick*="monopoly"]');
  eq(await ev(page, `state.yLabel`), 'Price, costs, revenue ($)', 'monopoly not loaded');
  assert(!(await ev(page, `document.getElementById('template-modal').classList.contains('open')`)), 'picker still open');
});

test('undo and redo buttons work and grey out when there is nothing to do', async (page) => {
  await ev(page, `undoStack = []; redoStack = []; updateUndoButtons();`);
  eq(await ev(page, `[document.getElementById('undo-btn').disabled, document.getElementById('redo-btn').disabled]`), [true, true], 'start state');
  await ev(page, `loadTemplate('sd')`);
  const n = await ev(page, `state.elements.length`);
  await ev(page, `state.selectedId = state.elements[0].id; deleteSelected()`);
  await page.click('#undo-btn');
  eq(await ev(page, `state.elements.length`), n, 'undo did not restore');
  assert(!(await ev(page, `document.getElementById('redo-btn').disabled`)), 'redo still greyed');
  await page.click('#redo-btn');
  assert(await ev(page, `state.elements.length < ${n}`), 'redo did not delete again');
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
