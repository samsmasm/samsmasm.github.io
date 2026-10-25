# Economics Graph Drawer — Project Notes for Claude

> **This is the v2 fork (`graphs2/`). Read `PLAN.md` first**: it has the phases, the decisions and a progress log. The live v1.9 app is `../graphs/`; leave it alone until Phase 7 copies this folder over it. Line numbers below are approximate and drift; grep for function names.
>
> **Philosophy changed (2026-10-25):** v1 kept some deliberate friction. That is dropped. Make it as easy as possible for students and teachers: connected things move together (curve, its label, its equilibrium points, their drop lines and P/Q labels), common IB moves are one click, no popups where inline edit or undo would do. When in doubt, the app does the work, not the student.

## What this is
A single self-contained HTML/CSS/JS file (`index.html`) that lets IB Economics students draw diagrams and export them as JPG. No build step, no dependencies, no separate CSS or JS files. Everything lives in `index.html`. Keep it that way.

Current version: **v2.0 beta** (tag shown in the header UI, in the `<header>` block). The page is `noindex` and links back to the stable `/graphs/`.

## File structure
```
graphs2/
  index.html      ← the entire app
  CLAUDE.md       ← this file
  PLAN.md         ← v2 plan, decisions, progress log
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
- **Autosave**: `redraw()` calls `scheduleAutosave()`, which writes `{ graph, driveFile }` to localStorage `sw2_autosave` (debounced, skipped when unchanged). `init()` restores it. A leave-page warning appears only if localStorage writes fail.
- Saved data has `v: 2`. Every load goes through `migrateGraphData()`; put format conversions there.
- localStorage keys are prefixed `sw2_` so the fork never touches the live app's state.
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

- **Shift curve** (`shiftSelected(dir)`, buttons in the panel for lines and curves): copies the curve `SHIFT_BY` (0.15) left/right, numbers labels (`numberCopy`: S → S₁/S₂, S₂ → S₃), adds an arrow attached to both at t = 0.8, and copies every equilibrium on the original onto the new curve with numbered P/Q labels. One undo step.
- **Subscripts**: `fmtLabel(text, loose)`. `S_1` → S₁ everywhere; `S1` → S₁ in curve and point labels only (free text keeps "Q1 2024"). Applied when a label is stored (`fmtFor`), so state holds the Unicode subscripts.
- **Keyboard** (`onKeyDown`, ignored while typing in a field): V/L/A/C/T/R/E tools, arrows nudge 1 px (Shift 10 px, a run of nudges is one undo step), Ctrl+C / Ctrl+V (internal clipboard, pasted copies are free of links) and Ctrl+D duplicate. `moveElement()` and `copyOf()` are the shared helpers.
- **Curve points**: every point of a selected curve has a handle (ends larger); `hitTestNode` returns a point index for curves.
- **Label halo**: `haloText()` strokes white behind every label and text.
- **Pointer events**: the canvas listens to `pointerdown/move/up/cancel` (with pointer capture) instead of mouse events, and `touch-action: none`. `clickCount` replaces `e.detail` (pointer events have none); a double tap on touch calls `onDblClick` from `onPointerDown`, and `lastDblAt` stops a native dblclick doubling it.
- **Ready-made shapes** (`SHAPES`, `addShape`): MC/AC, PPC, J-curve (with zero line), Lorenz (with line of equality).

---

## Canvas & coordinate system

**Logical dimensions** are W=680, H=560. **Render scale** (`SCALE = 2`) means the actual canvas pixel buffer is 1360×1120, displayed at 680×560 CSS pixels (centred on screen). All drawing code, coordinates, font sizes, and thresholds work in logical space — `ctx.setTransform` applies SCALE automatically via `applyViewXform()`.

```js
const W = 680, H = 560;
const SCALE = 2; // canvas pixels = W*SCALE × H*SCALE
const MARGIN = { top: 50, right: 60, bottom: 60, left: 70 };
const PLOT_W = W - MARGIN.left - MARGIN.right;  // 550
const PLOT_H = H - MARGIN.top - MARGIN.bottom;  // 450
```

Mouse coordinate mapping uses `W / r.width` (not `canvas.width / r.width`) to get logical coords. Never use `canvas.width`/`canvas.height` where you mean `W`/`H`.

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
  drawColor: COLORS[0],
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

One "Export ▾" header menu: Copy image (PNG to the clipboard, for Google Docs/Slides), Download JPG, Download PNG. All at 2× via `renderExport(2, mime)`. Sign-in lives only in the Save dialog; the header shows "Drive: email" when signed in (click opens Save).

## Templates

`TEMPLATES[key] = { group, name, sub, build }`. `build()` runs at load time and returns `{ title, yLabel, xLabel, elements }`, so builders can use any helper (they also run for thumbnails). `loadTemplate(key)` → `setDiagram(t)` (which `cloneElements()` to remap ids and links) and is undoable with a toast. Groups: Micro, Macro, Global (`TEMPLATE_GROUPS`).

22 templates: blank, sd, tax, subsidy, ceiling, floor, ext_neg, ext_pos, merit, demerit, monopoly, perfcomp, ppc (Micro); adas, inflgap, deflgap, keyn, phillips, lorenz (Macro); tariff, quota, exrate (Global).

Builder helpers: `mkEq(a, b, pLabel, qLabel)` for connected equilibria; `freePoint()` for points that are not crossings (Pp, monopoly Pm and AC); `footLabel(line, text)` for Yfe / NRU attached under a vertical line; `hLine`, `rectRegion`, `triRegion`; geometry `lineCross`, `lineXAt`, `lineYAt`, `curveYAt`, `curveLowest` so shaded areas and tangencies are exact. Shaded areas are plain regions, **not** connected: they stay put if a curve is moved.

Picker: the sidebar keeps Blank and S&D, plus "All templates", which opens `#template-modal` (`openTemplatePicker`). Thumbnails are real renders via `templateThumb(key)` (temporarily swaps the diagram, `renderExport(0.5)`, restores; cached in `thumbCache`). Escape or clicking outside closes any dialog.

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

`.canvas-wrap` is `flex:1; display:flex; align-items:center; justify-content:center; overflow:auto` — centres the canvas between the sidebars. `#graph-canvas` displays at its CSS size (680×560px) set in JS via `canvas.style.width/height`. The canvas pixel buffer is 1360×1120 (W×SCALE, H×SCALE) for crisp 2× rendering and larger JPG exports.

---

## Common pitfalls

- **Normalised y-axis is inverted**: yn=0 is HIGH price. AD curves must go from small-yn (high price) at small-xn to large-yn (low price) at large-xn. Getting this backwards makes AD slope upward.
- **After `redraw()`, transform is set to base SCALE**: if you need to draw additional overlays (e.g. in `downloadJPG`), call `ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0)` to draw in logical coords without view transform.
- **Legend export black background**: `redraw()` only fills W×H logical area. The expanded legend area below must be explicitly filled white.
- **SCALE must be incorporated in `applyViewXform`**: the function applies `SCALE * viewScale` and `SCALE * viewOffset`. Any new transform code must account for this.
- **Mouse coords use `W / r.width`, not `canvas.width / r.width`**: using canvas.width would give pixel coords (0–1360), but all code expects logical coords (0–680).
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

- Scope is `openid email profile .../auth/drive.file`. All three are **non-sensitive**, so this needs only basic OAuth verification, not the sensitive-scope review. Do not widen to `drive` or `drive.readonly`, which are restricted and would trigger a security assessment.
- `drive.file` only ever sees files this app created, so the folder lookup query reliably finds our own folder and nothing else in the student's Drive is visible to the app.
- Uses the GIS **token model** (`initTokenClient`), not the ID-token/One Tap model. Tokens last ~1 hour; `driveEnsureToken()` refreshes silently using the `sw2_drive_granted` localStorage flag to decide between `prompt:''` and `prompt:'consent'`.
- `driveApi()` wraps fetch, attaching the bearer token and retrying once on a 401 after clearing the token.
- Create uses a multipart upload; update uses `uploadType=media` PATCH; delete sets `trashed:true` rather than hard-deleting, so students can recover work from their Drive bin.
- `GOOGLE_HOSTED_DOMAIN` maps to the `hosted_domain` param, which filters the account chooser only. It is **not** a security control. It does not need to be, because each student's data lives in their own Drive under their own credentials, so there is no shared store to protect.

Deployment origins must be registered as Authorised JavaScript origins on the OAuth client: both `https://samsmasm.github.io` and `https://unisam.nz`.

Because every scope used is non-sensitive, an **External** consent screen published to **Production** needs no verification, shows no "unverified app" warning, has no user cap, and does not require a privacy policy URL. The unverified-app warning is triggered only by sensitive or restricted scopes. The 100-user cap applies only to Testing publishing status, so remember to hit Publish.

---

## Current status

v2 beta in progress; see the progress log in `PLAN.md`.
