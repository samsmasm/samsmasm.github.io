# Turtle Artist — `/turtle`

Browser turtle-graphics tool for 6–9 year olds. Teaches sequencing, loops, and
angles: a virtual turtle draws on an SVG canvas from click-to-add commands. No
login, no backend, fully client-side, exports SVG locally. **Phase 1 MVP.**

Single self-contained file: `turtle/index.html` (HTML + inline `<style>` + inline
`<script>`), matching the site convention (`longcut/`, `qreview/`). Only external
asset is `/unisamsq.png`.

## Design

Hybrid: header/footer/wordmark follow `AESTHETIC.md` exactly (Georgia wordmark,
logo 60px `border-radius:14px`, pastel radial header gradient, standard footer).
The play surface (command buttons + canvas) is deliberately bigger/bolder for the
young audience. Accent is a **warm sunny amber**, distinct from the site's claimed
subject hues (purple/pink/green/blue/terracotta). The whole palette lives in CSS
custom properties at the top of `<style>` (`--accent`, `--accent-bg`,
`--accent-border`, `--accent-text`, …) — re-theme in one place.

Icon+label command buttons use glyphs/emoji (🎨 🔁 ↑ ↺). This is the one
sanctioned place for symbols: `AESTHETIC.md`'s "no emoji in nav/chrome" rule is
about site chrome, and the header/footer here stay emoji-free.

**Layout**: three columns on desktop — `.tools-pane` (command buttons) | `.canvas-pane`
(drawing) | `.steps-pane` (program list + run/export). They're placed with flex `order`
(canvas is first in the DOM but `order:2`). Below 1040px they stack: canvas, then
buttons, then steps.

## Extension points for Phase 2 (mandala / pattern painter)

The engine and program model are decoupled from the DOM so they can be reused.

- **`TurtleEngine`** — pure geometry, no DOM. State `{x, y, heading, penDown,
  color, segments}`. Heading `0 = north (up)`; positive turn = clockwise
  (`turnRight`). `forward`/`backward` move by the command's own `value` (px), falling
  back to `STEP_DIST` (40) if absent. Each pen-down move pushes a `{x1,y1,x2,y2,color}`
  segment. `runOps(ops, upto)` always resets first and replays — deterministic, no
  incremental-redraw drift.

- **Program model** — a **tree** of command nodes, each with a stable `id` (used for
  selection across re-renders). Leaves: `{id,type:'forward',value:px}`,
  `{id,type:'backward',value:px}`, `{id,type:'turn',dir:'left'|'right',value:deg}`,
  `{id,type:'pen',state:'up'|'down'}`, `{id,type:'color',value:hex}`. A repeat is a
  **container node** that can nest: `{id,type:'repeat',count:N,body:[...children...]}`.
  `program` is the root list. (This replaced the original flat-array / "repeat wraps
  everything before it" model when reorder + selectable + hierarchical repeats were added.)

- **`flatten(nodes)`** — recursively expands the tree to a primitive-op list. A
  `repeat` runs `flatten(node.body)` `count` times, so nested loops multiply out:
  `[Forward, Turn]` inside `Repeat(4)` = a square; wrap that square + a turn in an
  outer `Repeat(3)` = a 3-square rosette. Deterministic; re-run from scratch each time.

- **Editing / interaction** (all operate on the tree, each snapshots first so `Undo`
  reverses *any* action — add/group/reorder/delete/count):
  - **Selection** — `selected` is a `Set` of node ids. The **whole row** (`data-act="sel"`)
    toggles selection — a big, multi-select-friendly target; nested tool buttons win via
    `closest('[data-act]')`. Selected rows get a `.sel` highlight. **Shift-click** extends
    from the `selAnchor` (last plain click): every row between anchor and target in visual
    order (`nodeOrder`, a pre-order id list) is added.
  - **Group into repeat** — `wrapSelection()` wraps the selected nodes into a new
    `repeat` block, but only if they are **one contiguous run of siblings**
    (`locateSelection()` enforces this; the "Repeat selected" button disables otherwise).
    Selecting a run that already contains a repeat block nests it → hierarchical loops.
  - **Reorder** — `moveNode(path, ±1)` swaps a node with its adjacent sibling (up/down
    arrows; bounds disabled). Reordering is within a sibling list only.
  - **Delete** — two intentional behaviours: the per-row **✕ unwraps** a repeat block
    (removes the loop, *keeps* its steps — `deleteNode`), while **Delete selected**
    (`deleteSelected`) removes selected nodes outright, including a loop *and* its contents.
    Deleting a leaf just removes it; deleting an emptied loop removes it.
  - **Loop count** — 1..`REPEAT_MAX` (**100**). Each block has `−`/`+` buttons
    (`changeCount`) and an editable number field (`setCount`, committed on `change` so it
    doesn't re-render mid-keystroke). The list `click` handler ignores `INPUT` targets so
    typing in the field doesn't also toggle row selection.
  - **Turn sum** — under each loop header, `turnSumHTML` shows how far the loop turns:
    `bodyNetTurn(body)` (right +, left −, recursing into nested loops × their count) per
    pass, and ×count as the total. Lets kids see e.g. 90°×4 = 360° closes the shape.
  - **Edit a step in place** — a leaf row's distance / angle is an editable `.step-num`
    number input (`stepText`/`numInput`); `setStepValue(path, kind, value)` clamps and
    writes `node.value` (kind `'len'` → `LEN_*`, `'angle'` → `ANGLE_*`). Committed on the
    delegated `change` handler. The list `click` handler ignores `INPUT` targets so editing
    a value never toggles row selection.
  - **Add target** — new commands append to root, *unless exactly one repeat block is
    selected*, in which case they append inside that block's `body` (`insertTarget()`).
  - **Paths** — the DOM uses dotted index paths (`"1.0"`); `resolvePath()` maps a path
    to `{parent, index, node}`; `locate(id)` finds a node anywhere by id.

- **Inputs** — `turnAngle` and `stepDist` are the live values stamped onto new turn /
  forward-backward commands. The **Turn** section is two rows of angle buttons (left/right);
  tapping one **adds that turn immediately** (no separate "add" step). `stepDist` comes from
  the **Advanced** `<details>` menu's Travel-length input; `turnAngle` from its Turn-angle
  input, whose **Left / Right** buttons add a custom-angle turn. Both inputs clamp to
  `ANGLE_MIN..MAX` / `LEN_MIN..MAX`. Existing command nodes keep the value they were made with.

- **Rendering** — `renderNodes(nodes, prefix)` recurses to build the list; repeat blocks
  render as an accent-bracketed container with the count stepper and their body indented.
  `segmentsSVG()` builds `<line>` elements (concrete hex colours, so export is trivial).
  `turtleMarker()` is a small green turtle SVG drawn facing north and rotated by heading
  (on-screen only, excluded from export). `render()` reads two independent toggles:
  `showDrawing` (hide the segments for a surprise) and `showTurtle` (hide the turtle) —
  the two switches above the canvas.
  **Run is animated** (`runAnimated`): it first computes the full route and `fitView()`s to
  frame it, then walks the flattened ops via `requestAnimationFrame`, interpolating each
  forward (a growing partial line) and turn (rotating in place) and committing ops with
  `engine.exec` as they finish. Speeds `RUN_SPEED_PX`/`RUN_SPEED_DEG`, floored per op and
  scaled so total ≤ `RUN_CAP_MS`. Run forces the drawing visible (`setDrawOn`) and always
  shows the turtle while walking. `cancelAnimation()` (called by any edit / Step / Clear /
  re-Run) stops it. `runAll()` is the instant version used after edits.
  `Step` walks one primitive op at a time via a cursor that resets on any edit; `Undo`
  restores the previous tree snapshot.

- **Zoom / view** — the SVG `viewBox` is centered on `view.{cx,cy}` with side `view.size`
  (`applyView`). `zoomBy(factor)` scales `size` (in→smaller, clamped `VIEW_MIN..MAX`),
  `fitView()` frames the whole drawing + turtle with padding, `resetView()` restores the
  default 600 box (also on Clear / init). The canvas pane is larger and `sticky` on desktop.

- **Coordinate readout** — `updateCoords()` (called from `render()`) prints the turtle's
  position under the canvas with the **start point as origin (0,0)** and **y pointing up**
  (`x = engine.x − CX`, `y = CY − engine.y`), so Forward is +y and negatives are normal.

- **Export** — serializes a clean copy (segments only, no turtle) framed to the drawing's
  bounding box + padding, via a Blob + temporary `<a download>`. No PNG.

## Guardrails

Every reachable state is valid by construction: repeat count clamped 1–100 (buttons and a
clamped number field), turns come from fixed angle buttons (15/30/45/60/90/120) or the
clamped Advanced angle (1–359), and travel length is the clamped Advanced field (1–300).
Grouping is restricted to contiguous siblings, so the tree stays well-formed.

## Linked from

- `/tools` (Learn and review) and the homepage Tools dropdown in the root `index.html`.

## Not done

- No PNG export; no Phase 2 mandala painter.
