# ShiftWork (economics graph maker): Project Notes for Claude

> **This is the live app, v2.0, at unisam.nz/graphs/.** v2 was built as a fork in `graphs2/` and promoted here on 2026-10-25 (Phase 7). `PLAN.md` has the phases, Sam's decisions, the progress log and future ideas; read it before big changes. Line numbers in this file drift; grep for function names.
>
> **Philosophy (2026-10-25):** make it as easy as possible for students and teachers. Connected things move together (curve, its label, its equilibrium points, their drop lines and P/Q labels), common IB moves are one click, no popups where inline edit or undo would do, and each setting lives in one place only. When in doubt, the app does the work, not the student.

## What this is
A single self-contained HTML/CSS/JS file (`index.html`) for drawing IB Economics diagrams and exporting them (copy image, PNG, JPG). No build step, no dependencies, no separate CSS or JS files. Keep it that way.

Current version: **v2.0** (tag in the `<header>` block, which also links to the old version).

## Related folders
- `../graphsold/`: the frozen v1.9, at unisam.nz/graphsold/ (noindex). Don't develop it.
- `../feedback/`: the shared feedback inbox; ShiftWork reports arrive with `app: 'graphs'`.
- `graphs2/` (the beta's folder) was deleted after promotion: nobody had visited it.

## File structure
```
graphs/
  index.html      ← the entire app
  CLAUDE.md       ← this file
  PLAN.md         ← v2 plan, decisions, progress log, future ideas
  test/run.sh     ← serves the repo and runs the browser tests (headless Chrome)
  test/tests.js   ← the tests; one `test(name, fn)` per fix/feature
```

## Tests

`./test/run.sh` (optionally `./test/run.sh "name fragment"`). It needs `/usr/bin/google-chrome`; puppeteer-core is installed on first run into `~/.cache/sw-test`, outside the repo. Each test gets a fresh page with cleared localStorage. Page globals (`state`, `undoStack`, all functions) are reachable in `page.evaluate` because the app is one classic script. **Run before every commit and add a test for every fix or feature.** puppeteer's double-click is `page.mouse.click(x, y, { count: 2 })` (`clickCount` does not fire `dblclick`).

## v2 conventions (added in Phase 0/1)

- `isLinear(el)` / `isLinearTool(t)`: line, arrow, dbarrow, brace. Use instead of chained type checks.
- `eventToLogical(e)` returns `{ rawCx, rawCy, cx, cy }` for any mouse event.
- `escapeHtml()` for anything put into `innerHTML` or an attribute. Save codes are shared between students, so labels are untrusted.
- `selectHTML(options, current, onchange)` for property dropdowns: shows a "Custom" entry for non-standard values instead of lying.
- **Undo** snapshots the whole document (`snapshot()` / `restoreSnapshot()`): elements, legend, title, axis labels and offsets. Drags take a snapshot on mousedown and push it with `saveUndo(snap)` only once the pointer actually moves, so a plain click never adds an undo step or clears redo. Header Undo/Redo buttons (`#undo-btn`, `#redo-btn`) grey out via `updateUndoButtons()`, called from `saveUndo`, `undo` and `redo`; anything else that touches the stacks must call it too. Title/axis inputs snapshot on focus (`onDocTextFocus`) because `input` fires after the text changed.
- No `confirm()` for destructive actions: they are undoable and show `showToast(msg, { undo: true })`. Loading a template over real work, and Clear diagram (which is just `loadTemplate('blank')`), do this.
- **Autosave**: `redraw()` calls `scheduleAutosave()`, which writes `{ graph, driveFile, view }` to localStorage `sw2_autosave` (debounced, skipped when unchanged). `view` = Colour/B/W, snap, tool, zoom: a refresh must change nothing Sam can see (he reported B/W resetting). `init()` restores it when Settings says "open your last diagram"; otherwise the Start-in settings apply. Undo history and selection are not kept.
- **Drive session survives refresh**: `sw2_drive_session` holds `{ token, user }` (token ~1 h, drive.file only). Never request a token on page load: GIS's token client renews only through a popup, which a page load can't open cleanly (Sam saw the consent page on every refresh). An expired token is renewed on the next Drive action, which is a click (`driveEnsureToken`; `openSaveModal` loads the list). `driveForget()` clears it on sign-out. A leave-page warning appears only if localStorage writes fail.
- Saved data has `v: 2`. Every load goes through `migrateGraphData()`; put format conversions there.
- localStorage keys are prefixed `sw2_` (from the beta; kept so beta users keep their autosave and settings). v1.9 used `sw_`, so the two versions never share state. Don't rename them.
- Text editing is inline (`showInlineLabelEdit(el, opts)`); the edit modal and the Label tool's `prompt()` are gone. `getLabelBasePos` covers every type, including brace tips, text and dots.
- **Feedback** (Phase 2): header button opens `#feedback-modal`; `sendFeedback()` POSTs to the shared `unisam-feedback` Worker (`../feedback/CLAUDE.md`). Picture and diagram file are opt-in. `renderExport(scale, mime, quality)` draws the export (used by JPG download and the feedback picture). `openHandoffDiagram()` opens a diagram passed from the inbox via localStorage `sw2_open`.

## Connected diagrams (Phase 3)

Positions of attached elements are **derived** on every redraw by `resolveAttachments()` (top of `redraw()`), in dependency order with a cycle guard. Never set an attached element's position directly and expect it to stick: change its attachment instead.

| link | meaning | set by |
|------|---------|--------|
| `dot.on = [idA, idB]` | sits where A and B cross (nearest crossing to its last position) | Equilibrium tool (`nearestCrossing`), dropping a free dot on a crossing, `mkEq` in templates, v1 migration |
| `text.attach = { id, t, dx, dy, dx0, dy0 }` | canvas-px offset from point `t` along the parent; `dx0/dy0` is the original offset for "Reset label position" | Label tool (`attachText`, 24 px), "Attach to nearest" |
| `line.p1On / p2On = { id, t }` | endpoint sits at point `t` along the parent | drawing or dragging an endpoint onto a line/curve (`attachEnd`, 7 px) |

- `t` is the fraction of the parent's length (`pointAt` / `projectOnto`, using `getElSegments` so curves match what is drawn).
- `derived` (a Map, never saved) holds per-redraw facts for dots: `broken` (curves no longer cross: faint red ring, hidden in export via `exporting`), `skipP` / `skipQ` (a horizontal / vertical curve in the pair, so that drop line is not drawn).
- Dots: `showDot` (false by default for new points; v1 dots keep `true`), `drops` (lines to axes), `pLabel`/`qLabel` with hand offsets `pDx,pDy,qDx,qDy`. `dotLabelBox(el, 'p'|'q')` is the single source for label position. Labels auto-number P₁/Q₁ (PL/Y on macro axes) via `nextEqLabels()`.
- Dragging: a curve drags everything attached. A label drag (`hitTestLabel`) changes only its offset fields. Dragging an attached text changes its offset (`reanchorText`). Dragging an attached arrow slides its ends along their parents (`slideEnds`). An attached dot cannot be dragged (hint shown). **Alt+drag** moves an element alone and detaches text attached to it.
- Deleting uses `removeWithDependents()`: points on a deleted curve go too; attached text and arrow ends become free.
- Template elements reference each other by id; `cloneElements()` remaps ids and references on load. Build templates as IIFEs with `mkEq(a, b, pLabel, qLabel, xn, yn)`.
- `GUIDE` (`#888`, weight 1.5, dash `6,4`) is the one guide-line style. Choosing any dash sets weight to Thin, in the sidebar and in properties.
- v1 migration: `connectV1()` in `migrateGraphData()` turns a dashed horizontal guide from the y-axis plus a dashed vertical guide to the x-axis, meeting at a crossing of two main curves, into one connected point, taking adjacent axis texts as its P/Q labels. Anything ambiguous is left alone.

## Phase 5 features

- **Shift curve** (`shiftSelected(dir)`, buttons in the panel for lines and curves): copies the curve `SHIFT_BY` (0.15) left/right, numbers labels (`numberCopy`: S → S₁/S₂, S₂ → S₃), adds a level arrow attached to both (`addShiftArrow` / `shiftArrowEnds`: carries on from the height of an arrow ending on the source curve, else 0.8 along it; steps 28 px up/down only if it would hit an existing arrow as drawn (`drawnSegment`, `segDist` < 8 px); drawn `SHIFT_GAP` px short of each curve via the arrow's `gap`, drawing only), and copies every equilibrium on the original onto the new curve with numbered P/Q labels. One undo step. The selection moves to the new curve.
  - **The arrow always starts from the selected (last) curve and always makes a new curve** (Sam, 2026-10-25), even on top of an older one: S right then left gives S₃ drawn over S₁. A copy landing on an older curve takes that curve's exact shape (not clipped again, which would make it shorter) and gets `sameAs` = the oldest curve there. Labels are derived on every redraw by `shownLabel`: the oldest shows "S₁ = S₃ = S₅", the others show nothing, while they still lie on each other (`sameShape`); pulled apart, each shows its own. `shownLabelPos` grows a combined label away from the curve end. Legend, editing and numbering still use each curve's own `label`. `sameAs` is remapped in `cloneElements` and dropped by `copyOf`. Sam rejected reusing the old curve with just an arrow back. `sameShape` (samples along the copy, ignoring parts outside the plot) finds a curve already in that spot; only when this curve's **latest** arrow already goes to it (D₁ re-selected and shifted again) does the shift step further from there (D₂ → D₃) instead of stacking.
  - A copy running out of the plot (past either axis, or the right/top edges, where its label would leave the picture) is cut where it leaves (`clipToPlot`). Templates' own curves are never clipped.
- **Subscripts**: `fmtLabel(text, loose)`. `S_1` → S₁ everywhere; `S1` → S₁ in curve and point labels only (free text keeps "Q1 2024"). Applied when a label is stored (`fmtFor`), so state holds the Unicode subscripts.
- **Keyboard** (`onKeyDown`, ignored while typing in a field): V/L/A/C/T/R/E tools, arrows nudge 1 px (Shift 10 px, a run of nudges is one undo step), Ctrl+C / Ctrl+V (internal clipboard, pasted copies are free of links) and Ctrl+D duplicate. `moveElement()` and `copyOf()` are the shared helpers.
- **Curve points**: every point of a selected curve has a handle (ends larger); `hitTestNode` returns a point index for curves.
- **Label halo**: `haloText()` strokes white behind every label and text.
- **Pointer events**: the canvas listens to `pointerdown/move/up/cancel` (with pointer capture) instead of mouse events, and `touch-action: none`. `clickCount` replaces `e.detail` (pointer events have none); a double tap on touch calls `onDblClick` from `onPointerDown`, and `lastDblAt` stops a native dblclick doubling it.
- **Shapes** (`SHAPES`): MC/AC, PPC, J-curve (with zero line), Lorenz (with line of equality). Used only by templates (cost, ppc, jcurve, lorenz). There is deliberately no "add a shape" button: Sam found buttons that add to the page next to templates confusing. Every template replaces everything.
- **Two kinds of curve.** New curves (`mkCurve`, the Curve tool) have `through: true` and pass through every point (`throughPath`: Hermite spline, slope from previous to next neighbour, scaled by segment length so uneven spacing doesn't overshoot). Curves in older saves have no flag and keep the old quadratic-through-midpoints look. `getElSegments` and `drawSmoothCurve(pts, through)` must stay in step.
- **Cost curves** come from `costCurves(qT, atcMin, qV, c)`, one cubic cost function giving MC, AVC and ATC, about 6 points each so they stay editable (Sam rejected dozens of handles). Sam requires MC to go EXACTLY through the lowest points of AVC and ATC, as drawn: both minimums are points of MC too, and each minimum has neighbours at equal height so the drawn curve is flat exactly there. Never draw MC as a straight line. Monopoly finds Qm with `mrCrossesMC`. A test checks the drawn gap is under 0.5 px.
- **Fill region has two modes**, switched by holding its button (`initFillModeButton`, 500 ms; `fillMode` saved in localStorage `sw2_fillMode`; label `#fill-mode-label`). `click` (default): `fillAt` → `fillAreaAt` draws lines, curves and dots' drop lines into an offscreen mask (2× res), carries line ends within 12% of the plot edge on to the edge (template lines stop short of the axes), flood-fills, refuses an area running along the open top/right edge ('open', toast), grows into the walls, then `traceOutline` (Moore) and `simplifyClosed` (Douglas-Peucker) give the polygon. New regions go to the front of `elements` (drawn behind). `sketch`: click corners, double-click to finish.
- **Point tool** (`P`, `placePoint`): a plain marker, a `dot` with `mark: 'dot' | 'cross'`, `showDot: true`, no drop lines or labels. Placed within 10 px of a crossing it links (`on`). Hold the button to switch (`pointMode`, localStorage `sw2_pointMode`). Marked points don't count in `nextEqLabels`. Long presses share `onLongPress(btn, fn)`.
- **B/W switch** (`#bw-btn.mode-switch`, class `bw` when on): a toggle switch, not a button.
- **Settings** (gear in the header, `openSettings`, `PREF_FIELDS`, `PREF_DEFAULTS`). `myPrefs` (localStorage `sw2_prefs`) are the saved choices; `prefs` is what's in use: `myPrefs`, or the defaults when the "My settings / Defaults" switch is on (`useDefaults`, `sw2_prefsUseDefaults`), which keeps `myPrefs` so switching back restores them. Options: start-up (last diagram / blank / S&D, B/W, snap), new drawings and templates (line thickness, guide dashed/dotted via `GUIDE.dash`, shaded areas, equilibrium labels P₁/Pe/P*, dot at equilibria, axis titles with or without units, currency), text size (`fontPx`), export size (2×/4×), transparent PNG (`exportPNG`) and grid in pictures for numbered diagrams (`exportGrid`). Templates go through `buildTemplate()` / `axisTitle()`, never `TEMPLATES[k].build()` directly. Currency is written via `currencyText()`: dong is `'000s of đ` (Sam's wording, Vietnamese đ), e.g. "Price ('000s of đ/unit)". Changing currency also updates the axis titles on screen (`switchCurrency`, one undo step) and the Y-axis placeholder. Text size and guide style apply to existing diagrams too; everything else only to new things. Future ideas (shareable custom styles; asking teacher/student after a while) are in PLAN.md.
- **Style menu** (`#style-btn`, `styleDiagram(what, value)`), next to the B/W switch in the top bar (Sam's choice): Auto colour, Auto hatching, All lines thin/normal/thick. Whole diagram, one undo step each; guides (`isGuide`: dashed or grey) are left alone.
- **Two-mode tools** (Point dot/cross, Fill region click/draw): clicking the button while the tool is selected switches mode (`toolClick`). No long press. Clicking an existing filled area with Fill region in click mode cycles it (`cycleRegion`: colour, or hatching in B/W).
- **Moving around when zoomed**: drag empty space (select tool), two-finger trackpad scroll, or Shift/Space/middle drag. Mouse wheel and pinch zoom. Zoom never goes below 100% (Sam's call); back at 100% the page is re-centred. No header hint about dragging (Sam removed it).
- **Shortcuts list** in Settings comes from `SHORTCUTS` (rendered by `renderShortcuts`, ⌘/Option on Mac). Keep it in step with `onKeyDown` when adding keys. Delete/Backspace outside a text box always `preventDefault()` (Backspace was sending the browser back).
- **New points' axis labels avoid old ones** (`clearAxisLabels`, called by Shift curve and the Equilibrium tool after `resolveAttachments()`): a clashing P label moves left (`pDx`), a Q label down (`qDy`). Existing points are never moved.
- **Lines and curves are cut at the plot edges but keep their whole shape** (Sam, 2026-10-26): `full` holds the uncut geometry, stored only while it differs from what's drawn. All moves go through `setFull(el, offsetFull(fullOf(el), dxn, dyn))` (drag, Shift, nudge, paste), which re-cuts with `clipToPlot`, so dragging back out of the edge restores the length. Reshaping by hand (`applyNodeMove`, Make horizontal / vertical) deletes `full`.
- **Drag onto a same-shaped curve** (within `SAME_SNAP` 8 px of lying exactly on it, `snapOntoSame`, same type and point count, every point the same offset) snaps on and calls `linkSame`, so they share an "S₁ = S₂" label like shifted copies do.
- **Dragging a line or curve is axis-locked** (`axisLock`, `AXIS_LOCK` 0.5): straight sideways or straight up/down unless the drag is plainly diagonal (about 27° to 63°). Other elements move freely.
- **Arrows stay level or upright** (Sam, 2026-10-25): `el.level` is `'h'`, `'v'` or `null` (free). `keepLevel` (end of `resolveOne` for arrows) keeps the first attached end and slides the other along its curve to match; if that curve doesn't reach the level, both ends move to the nearest level it does. Arrows without the flag (older saves, new drawings) get it from their shape on first resolve (`arrowLevel`). Dragging an arrow's end sets `null` while dragging; on release, within 2° of level/upright sets it again. Tests that tilt an arrow by hand must set `level = null` first.
- **Make horizontal / vertical** with an end attached to a curve slides that end along its curve (`levelPointOn`) rather than setting its coordinates, which `resolveAttachments` would undo.
- **Canvas**: `#graph-canvas` fills the whole space between the panels (open white). The W×H export area sits fitted inside it with a 16 px gap (`STAGE_PAD`), and its faint dashed outline is drawn on the canvas (`drawExportFrame`, hidden in export), so it grows, shrinks and pans with the diagram. Drawings outside it show on screen but are not exported.
- Keep tool hints short: a hint that wraps to two lines pushes the canvas down.
- **Numbered axes** (Sam, 2026-10-29; decisions in PLAN.md): `state.numbers = { on, xMax, xStep, yMax, yStep }`, off by default (`NUMBERS_DEFAULT`, 0 to 10 by 1). Part of the diagram: in `snapshot`, `currentGraphData`, `applyGraphData`; `setDiagram` turns it off (templates have no numbers) but keeps the scale. "Numbers" switch (`#num-btn`, `.mode-switch.onoff`, `toggleNumbers`) next to B/W, with scale boxes (`setNumberScale`: max above 0, at most 50 steps; a new max with too many steps picks a round step) shown when on; `syncNumbersUI()` after any change to `state.numbers`. `drawGrid` (faint, before the axes; left out of pictures when `prefs.exportGrid` is false) and `drawAxisNumbers` (thins crowded numbers, hides any a P/Q label covers). Axis titles move clear via `xTitleY()` / `yTitleX()`. `dotLabelBox` appends the value ("P₁ = 40", `fmtNum`); only the name is stored. Snapping (only with Snap on): `gridSnap` for the Line tool, Curve tool points and line/curve handles (`getSnapCandidate(..., grid)`); arrows, braces, labels and points stay free. Line/curve drags move in whole steps (`gridDelta`); Shift curve moves by whole steps.
- **Colour and line style are chosen in one place**, the selected-object panel. The sidebar has neither: new drawings are solid, Normal weight (`state.strokeWeight/strokeDash`).
- **Colour**: the selected-object panel (hidden in B/W). There is no sidebar colour picker: `drawColor()` gives new lines, curves and regions the first palette colour not yet used, and arrows/braces black.

---

## Canvas & coordinate system

**Logical dimensions** of the exported picture are W=680, H=560. All drawing code, coordinates, font sizes, and thresholds work in logical space. On screen the canvas is the size of `.canvas-wrap`; `fitCanvas()` sets `stageFit` (CSS px per logical unit) and `stageX/Y` (CSS px offset of the export area), plus `baseK/baseX/baseY` (logical → canvas pixels before zoom, at device pixel ratio ≥ 2). `applyViewXform()` combines the base with the zoom/pan. `renderExport` swaps the base to `exportScale` with no offset. `SCALE = 2` is only the default export scale.

```js
const W = 680, H = 560;
const SCALE = 2; // default export scale
const MARGIN = { top: 50, right: 60, bottom: 60, left: 70 };
const PLOT_W = W - MARGIN.left - MARGIN.right;  // 550
const PLOT_H = H - MARGIN.top - MARGIN.bottom;  // 450
```

Mouse → logical: `eventToLogical(e)` (`(clientX - r.left - stageX) / stageFit`). Logical → page: `logicalToClient(x, y)` (diagram coords) or `rawToClient` (before zoom); the tests' `pt`/`ptn` use it. Never use `canvas.width`/`canvas.height` where you mean `W`/`H`.

**Normalised coordinates** `(xn, yn)` where `(0,0)` = top-left of the plot area (high price / high value on y-axis) and `(1,1)` = bottom-right (low price / high quantity on x-axis). This means:
- **yn = 0** → top of plot → **HIGH price**
- **yn = 1** → bottom of plot → **LOW price**
- **xn = 0** → left → **low quantity/GDP**
- **xn = 1** → right → **high quantity/GDP**

Conversion functions:
```js
toCanvas(xn, yn)   // normalised → canvas pixels
fromCanvas(cx, cy) // canvas pixels → normalised
```

**View transform** (zoom/pan): `viewScale`, `viewOffsetX`, `viewOffsetY`. Applied via `applyViewXform()` which calls `ctx.setTransform(...)`. Any drawing that happens *after* `redraw()` must call `applyViewXform()` again first. Mouse event raw coords must be un-transformed: `cx = (rawCx - viewOffsetX) / viewScale`.

---

## State

```js
let state = {
  title: '',
  yLabel: 'Price ($/unit)',
  xLabel: 'Quantity (units/week)',
  elements: [],      // all drawn elements (see types below)
  curves: [],        // legend entries { name, color } — shown in sidebar + JPG export
  selectedId: null,
  tool: 'select',
  strokeWeight: 2.5,
  strokeDash: '',
  xLabelDx, xLabelDy, yLabelDx, yLabelDy,  // axis label offsets
};
let nextId = 1;      // auto-increment element IDs
let bwMode = false;  // black & white mode
```

---

## Element types

All elements live in `state.elements`. Constructor helpers at lines ~799–817:

| type | key fields | notes |
|------|-----------|-------|
| `line` | `x1n,y1n,x2n,y2n, color,weight,dash,label, labelDx,labelDy` | straight line |
| `arrow` | same as line | line with arrowhead at (x2n,y2n) |
| `dbarrow` | same as line | arrowheads at both ends |
| `brace` | `x1n,y1n,x2n,y2n, color,weight,label,labelDx,labelDy, flip` | curly brace; label at the tip (`braceGeometry`) |
| `curve` | `points[{xn,yn}], color,weight,dash,label, labelDx,labelDy` | catmull-rom spline |
| `text` | `xn,yn, text, color, size, attach` | text label, optionally attached |
| `dot` | `xn,yn, color, pLabel, qLabel, on, showDot, drops, pDx..qDy` | equilibrium point: drop lines to both axes, P/Q labels; see Connected diagrams |
| `region` | `points[{xn,yn}], fillColor, pattern, bwPattern, label, labelDx,labelDy` | filled polygon |

---

## Legend

Automatic (Phase 4). `state.legend = { show, hidden: [ids] }`. Entries are every labelled `line`, `curve` and `region` (`legendCandidates()`), minus unticked ids (`legendEntries()`). Off by default; the sidebar has the on/off box and a tickable list with swatches drawn by `drawLegendSwatch()` (B/W aware, same fill/dash as the diagram). `renderLegendList()` rebuilds the sidebar; call it when labels, colours, fills or the mode change. `renderExport()` adds the legend band below the picture only when `show` is on. v1 `curves` lists migrate to `show: true` and are dropped.

## Export

One "Export ▾" header menu: Copy image (PNG to the clipboard, for Google Docs/Slides), Download JPG, Download PNG. Size and PNG transparency come from Settings (`exportPNG`). Google Drive sign in / out: the header button `#header-user` (person icon + "Sign in"; once signed in, the email + an exit icon; signing out needs a second click on the red "Sign out?" it turns into, cancelled by clicking elsewhere or 4 s; `headerAuthClick`, `disarmSignOut`), with the settings gear right before it and the Save dialog. Sam asked for the header button on 2026-10-25, reversing the Phase 4 "Save dialog only" choice.

## Templates

`TEMPLATES[key] = { group, name, sub, build }`. `build()` runs at load time and returns `{ title, yLabel, xLabel, elements }`, so builders can use any helper (they also run for thumbnails). `loadTemplate(key)` → `setDiagram(t)` (which `cloneElements()` to remap ids and links) and is undoable with a toast. Groups: Micro, Macro, Global (`TEMPLATE_GROUPS`).

22 templates: blank, sd, tax, subsidy, ceiling, floor, ext_neg, ext_pos, merit, demerit, monopoly, perfcomp, ppc (Micro); adas (AD/LRAS/SRAS), inflgap, deflgap, keyn, phillips, lorenz (Macro); tariff, quota, exrate (Global).

Builder helpers: `mkEq(a, b, pLabel, qLabel)` for connected equilibria; `freePoint()` for points that are not crossings (Pp, monopoly Pm and AC); `footLabel(line, text)` for Yfe / NRU attached under a vertical line; `hLine`, `rectRegion`, `triRegion`; geometry `lineCross`, `lineXAt`, `lineYAt`, `curveYAt`, `curveLowest` so shaded areas and tangencies are exact. Shaded areas are plain regions, **not** connected: they stay put if a curve is moved.

Picker: the sidebar has Sam's three standard templates (S&D, Keynesian AD/AS, AD/LRAS/SRAS; Sam's school uses no plain AD/SRAS diagram) plus "All templates" (Blank is in there, and Clear diagram gives blank axes too), which opens `#template-modal` (`openTemplatePicker`). Thumbnails are real renders via `templateThumb(key)` (temporarily swaps the diagram, `renderExport(0.5)`, restores; cached in `thumbCache`). Escape or clicking outside closes any dialog.

Points have `dropP` / `dropQ` to switch off either drop line (early betas had one `drops` switch; `showDropP/Q` read both).

---

## B/W mode

`bwMode` global (on by default). Everything draws in `#1a1918`. Regions have **one** fill setting `fill` for both modes (`FILL_OPTS`: solid "Shaded", hatch45, hatch135, crosshatch, dots, vertical, horizontal); `drawPattern(pattern, color, c, w, h)`. Solid in B/W is a grey tint. New regions default to hatch45 in B/W and solid in colour. v1 `pattern`/`bwPattern` migrate via `fillFromV1()` (the B/W choice wins unless a colour pattern was picked). Colour pickers show a "Colours show in Colour mode" note in B/W.

## Key functions reference

| function | line | purpose |
|----------|------|---------|
| `redraw()` | ~1271 | clears and redraws everything; calls `applyViewXform()` |
| `drawAxes()` | ~1294 | draws axis lines, ticks, labels |
| `drawElements()` | ~1340 | iterates `state.elements` and calls `drawElement()` |
| `drawElement(el)` | ~1356 | dispatches to type-specific draw functions |
| `drawRegionEl(el)` | ~1196 | draws filled polygon with pattern/color |
| `drawLineLabel(el)` | ~1412 | draws label near midpoint of line/arrow |
| `drawLabelAt(text,x,y,color)` | ~1431 | draws a centred label at canvas coords |
| `getLabelBasePos(el)` | ~853 | returns default label position for a line/arrow (top of vertical lines, midpoint+offset for others) |
| `hitTest(cx, cy)` | ~1967 | returns element under canvas point (checks lines/curves/dots/text first, regions last) |
| `getSnapCandidate(cx,cy)` | ~1028 | returns a snap point (intersection or on-segment) near the given canvas point |
| `renderProps()` | ~2067 | renders the right-panel property form for the selected element |
| `updateProp(key, value)` | ~2169 | updates a property on the selected element; calls `renderCurveList()` if key is `label` or `fillColor` |
| `downloadJPG()` | ~2314 | exports canvas + legend as JPG |
| `saveUndo()` | ~603 | pushes current state to undo stack (call before any mutation) |

---

## CSS layout

Three-column flex layout: left sidebar → `.canvas-wrap` → right panel.

`.canvas-wrap` is `flex:1; position:relative; overflow:hidden`. `#graph-canvas` is absolutely positioned (so it never changes the wrap's size) and `fitCanvas()` (ResizeObserver on the wrap) sizes it to the wrap and redraws.

---

## Common pitfalls

- **Normalised y-axis is inverted**: yn=0 is HIGH price. AD curves must go from small-yn (high price) at small-xn to large-yn (low price) at large-xn. Getting this backwards makes AD slope upward.
- **After `redraw()`, transform is set to the base (no zoom)**: overlays in diagram coords call `applyViewXform()` first (as `drawSnapIndicator` does).
- **Legend export black background**: `redraw()` only fills W×H logical area. The expanded legend area below must be explicitly filled white.
- **Any new transform code must include the base** (`baseK/baseX/baseY`), as `applyViewXform` does, or it will be wrong on screen or in export.
- **`renderCurveList()` is not called automatically**: you must call it whenever regions are mutated or their labels change.
- **Line label positions**: vertical lines get labels at the top by default. The exception is YFE-style labels — use `mkText(xn, 1.05, label)` to place below the x-axis instead.
- **Property-panel text inputs must use `oninput` + `updatePropLive()`, never `onchange`**: `onchange` fires on blur, but clicking the canvas calls `renderProps()`, which replaces `form.innerHTML` and destroys the focused input before blur fires, silently discarding the edit. `updatePropLive()` collapses a run of keystrokes on one field into a single undo entry, reset by `renderProps()`.
- **Template equilibria must be computed, not eyeballed**: dotted projection lines, axis labels and the LRAS position all have to sit on the true intersection of the curves, or they visibly miss. Solve the line pair algebraically and paste the exact values rather than estimating them.
- **`saveUndo()` before every mutation**: undo/redo depends on this being called before the document changes. For drags, take `snapshot()` on mousedown and pass it to `saveUndo(snap)` on first real movement.

---

## Saving

Two paths, both serialising the same object via `currentGraphData()` / `applyGraphData(data)`. Always go through these two helpers when adding a save target, rather than duplicating the field list.

1. **Save code** (original): base64 of the JSON, copied out of a textarea in the save modal.
2. **Google Drive** (v1.9): signs the student in with Google Identity Services and stores one JSON file per diagram in a `ShiftWork Diagrams` folder in *their own* Drive.

### Drive implementation notes

Config constants sit at the top of the Drive block: `GOOGLE_CLIENT_ID` (empty by default) and `GOOGLE_HOSTED_DOMAIN`. **When `GOOGLE_CLIENT_ID` is empty the whole Drive panel hides itself** and the app behaves exactly as v1.8 did, so the file is safe to ship unconfigured.

- Scope is **only** `.../auth/drive.file` (`DRIVE_SCOPES`; a test pins it). Sam found the consent screen asked for too much, so `openid email profile` were dropped on 2026-10-25; the header email now comes from Drive's `about?fields=user(emailAddress)` (`driveFetchUser`), which works with drive.file. drive.file is **non-sensitive**, so this needs only basic OAuth verification. Do not widen to `drive` or `drive.readonly`, which are restricted and would trigger a security assessment, and don't add profile scopes back.
- `drive.file` only ever sees files this app created, so the folder lookup query reliably finds our own folder and nothing else in the student's Drive is visible to the app.
- Uses the GIS **token model** (`initTokenClient`), not the ID-token/One Tap model. Tokens last ~1 hour; `driveEnsureToken()` refreshes silently using the `sw2_drive_granted` localStorage flag to decide between `prompt:''` and `prompt:'consent'`.
- `driveApi()` wraps fetch, attaching the bearer token and retrying once on a 401 after clearing the token.
- Create uses a multipart upload; update uses `uploadType=media` PATCH; delete sets `trashed:true` rather than hard-deleting, so students can recover work from their Drive bin.
- `GOOGLE_HOSTED_DOMAIN` maps to the `hosted_domain` param, which filters the account chooser only. It is **not** a security control. It does not need to be, because each student's data lives in their own Drive under their own credentials, so there is no shared store to protect.

Deployment origins must be registered as Authorised JavaScript origins on the OAuth client: both `https://samsmasm.github.io` and `https://unisam.nz`.

Because every scope used is non-sensitive, an **External** consent screen published to **Production** needs no verification, shows no "unverified app" warning, has no user cap, and does not require a privacy policy URL. The unverified-app warning is triggered only by sensitive or restricted scopes. The 100-user cap applies only to Testing publishing status, so remember to hit Publish.

---

## Current status

v2.0 live at unisam.nz/graphs/ since 2026-10-25, with 85 headless-Chrome tests (numbered axes 2026-10-29; after the 2026-10-25/26 polish round: full-space canvas with zooming export outline, 100% zoom floor, shortcuts list, Backspace fix, shift-curve rules, level arrows, axis-locked drags; see the PLAN.md progress log). Known limits: free points (Pp, monopoly Pm/ATC, quota Q₂) and shaded areas don't follow when curves move; shifts are sideways only, by a fixed `SHIFT_BY` (whole grid steps on numbered diagrams). Future ideas are at the end of `PLAN.md`.

**Shift curve rules are Sam's, settled by trial over several rounds; don't "simplify" them without asking:** new curve every time, from the selected curve; step further only when re-shifting a curve whose latest arrow already goes there; copies on an older curve match it exactly and share one label, "S₁ = S₃"; arrows level, chained, moved only on a real clash; copies cut at the plot edges.
