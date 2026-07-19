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
  reverses *any* action — add/group/reorder/delete/ungroup/count):
  - **Selection** — `selected` is a `Set` of node ids; each row has a tick box.
  - **Group into repeat** — `wrapSelection()` wraps the selected nodes into a new
    `repeat` block, but only if they are **one contiguous run of siblings**
    (`locateSelection()` enforces this; the "Repeat selected" button disables otherwise).
    Selecting a run that already contains a repeat block nests it → hierarchical loops.
  - **Reorder** — `moveNode(path, ±1)` swaps a node with its adjacent sibling (up/down
    arrows; bounds disabled). Reordering is within a sibling list only.
  - **Ungroup** — `ungroupNode(path)` removes a repeat block but lifts its children into
    the parent. **Delete** removes the node (and its subtree).
  - **Add target** — new commands append to root, *unless exactly one repeat block is
    selected*, in which case they append inside that block's `body` (`insertTarget()`).
  - **Paths** — the DOM uses dotted index paths (`"1.0"`); `resolvePath()` maps a path
    to `{parent, index, node}`; `locate(id)` finds a node anywhere by id.

- **Inputs** — `turnAngle` (current turn amount) and `stepDist` (current travel length)
  are the live values stamped onto new turn / forward-backward commands. Quick-select
  chips set `turnAngle`; the **Advanced** `<details>` menu exposes number inputs for both
  (`setTurnAngle`/`setStepDist`, clamped to `ANGLE_MIN..MAX` / `LEN_MIN..MAX`), kept in
  sync with the chips. Existing command nodes keep the value they were created with.

- **Rendering** — `renderNodes(nodes, prefix)` recurses to build the list; repeat blocks
  render as an accent-bracketed container with the count stepper and their body indented.
  `segmentsSVG()` builds `<line>` elements (concrete hex colours, so export is trivial).
  `turtleMarker()` is a small green turtle SVG drawn facing north and rotated by heading;
  it's on-screen only (excluded from export) and gated by the `showTurtle` preview toggle
  (the switch above the canvas). `render()` reads `showTurtle` — no argument.
  `Run` replays all; `Step` walks one primitive op at a time via a cursor that resets on
  any edit; `Undo` restores the previous tree snapshot.

- **Export** — serializes a clean copy (white bg rect + segments only, no turtle) via
  a Blob + temporary `<a download>`. No PNG in Phase 1.

## Guardrails

Every reachable state is valid by construction: repeat count clamped 1–20 (buttons
only), quick angles are chips (30/45/60/90/120), and the only free numeric entry is in
the opt-in **Advanced** menu, where both fields are clamped (angle 1–359, length 1–300).
Grouping is restricted to contiguous siblings, so the tree stays well-formed.

## Linked from

- `/tools` (Learn and review) and the homepage Tools dropdown in the root `index.html`.

## Not done

- No PNG export; no Phase 2 mandala painter.
