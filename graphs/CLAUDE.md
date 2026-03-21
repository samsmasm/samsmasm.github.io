# Economics Graph Drawer — Project Notes for Claude

## What this is
A single self-contained HTML/CSS/JS file (`index.html`) that lets IB Economics students draw diagrams and export them as JPG. No build step, no dependencies, no separate CSS or JS files. Everything lives in `index.html`. Keep it that way.

Current version: **v1.6** (tag shown in the header UI, line ~365).

## File structure
```
graphs/
  index.html   ← the entire app (~2400 lines)
  CLAUDE.md    ← this file
```

---

## Canvas & coordinate system

**Canvas element** has fixed attributes `width="680" height="560"` — this is the internal resolution and must not change. CSS makes it fill the available space visually; mouse coordinate mapping accounts for this via `getBoundingClientRect()` + `scaleX = canvas.width / r.width`.

```js
const W = 680, H = 560;
const MARGIN = { top: 50, right: 60, bottom: 60, left: 70 };
const PLOT_W = W - MARGIN.left - MARGIN.right;  // 550
const PLOT_H = H - MARGIN.top - MARGIN.bottom;  // 450
```

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
| `curve` | `points[{xn,yn}], color,weight,dash,label, labelDx,labelDy` | catmull-rom spline |
| `text` | `xn,yn, text, color, size` | free text label |
| `dot` | `xn,yn, color, pLabel, qLabel` | equilibrium dot with optional P*/Q* labels and dotted projection lines |
| `region` | `points[{xn,yn}], fillColor, pattern, bwPattern, label, labelDx,labelDy` | filled polygon |

---

## Legend

`state.curves` holds **named curve legend entries** `{ name, color }` — these are manually added by the user via "Add to legend" in the right panel, separate from actual drawn elements.

`renderCurveList()` (line ~2011) renders the sidebar legend list. It shows:
1. `state.curves` entries (line swatches)
2. `state.elements` filtered to `type === 'region' && e.label` (filled swatches)

Call `renderCurveList()` whenever: curves are added/removed, a region label changes, a region color changes, or elements are deleted.

In **JPG export** (`downloadJPG`, line ~2314), the canvas is temporarily expanded to fit both the graph and a legend row below. After `redraw()`, the legend area must be explicitly filled white before drawing legend items — `redraw()` only fills the graph area (680×560).

---

## Templates

Defined in the `TEMPLATES` object (line ~660). Each template has `{ title, yLabel, xLabel, curves[], elements[] }`. Loaded via `loadTemplate(name)` which deep-copies elements and reassigns IDs.

Current templates: `blank`, `sd` (Supply & Demand), `adas` (New Classical AD/AS), `keyn` (Keynesian AD/AS), `ext_neg`, `ext_pos`.

**Keynesian AD/AS** (`keyn`): AD is downward sloping — in normalised coords this means going from small-xn/small-yn (low GDP, high price) to large-xn/large-yn (high GDP, low price). The AS is a hockey-stick curve (flat Keynesian range, then steep near YFE). YFE label is placed via `mkText(xn, 1.05, 'YFE')` below the x-axis (not as a line label), consistent with Q* label placement.

---

## B/W mode

`bwMode` global. When true, all elements render in `#1a1918` (near-black). Regions use canvas pattern fills instead of colour fills — patterns defined in `drawPattern()` (line ~1143):
- `bw-hatch45`, `bw-hatch135`, `bw-crosshatch`, `bw-dots`, `bw-vertical`, `bw-horizontal`

Each region element stores `bwPattern` (which pattern to use in B/W) and `pattern` (colour-mode fill style, currently unused — colour mode uses flat `fillColor`).

---

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

`.canvas-wrap` is `position:relative; overflow:hidden; flex:1` — fills all space between the sidebars. `#graph-canvas` is `position:absolute; inset:0; width:100%; height:100%` — fills the wrapper. The canvas `width/height` *attributes* stay 680×560 for the coordinate system; CSS scaling is handled automatically.

---

## Common pitfalls

- **Normalised y-axis is inverted**: yn=0 is HIGH price. AD curves must go from small-yn (high price) at small-xn to large-yn (low price) at large-xn. Getting this backwards makes AD slope upward.
- **After `redraw()`, view transform is reset**: if you need to draw additional overlays (e.g. in `downloadJPG`), you don't need `applyViewXform()` because export always uses `viewScale=1`.
- **Legend export black background**: `redraw()` only fills 680×560. The expanded legend area below must be explicitly filled white.
- **`renderCurveList()` is not called automatically**: you must call it whenever regions are mutated or their labels change.
- **Line label positions**: vertical lines get labels at the top by default. The exception is YFE-style labels — use `mkText(xn, 1.05, label)` to place below the x-axis instead.
- **`saveUndo()` before every mutation**: undo/redo depends on this being called before `state.elements` or `state.curves` is changed.
