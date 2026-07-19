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
  (`turnRight`). `forward`/`backward` move a fixed `STEP_DIST` (40px). Each pen-down
  move pushes a `{x1,y1,x2,y2,color}` segment. `runOps(ops, upto)` always resets
  first and replays — deterministic, no incremental-redraw drift.

- **Program model** — flat array of command objects: `{type:'forward'}`,
  `{type:'backward'}`, `{type:'turn',dir:'left'|'right',value:deg}`,
  `{type:'pen',state:'up'|'down'}`, `{type:'color',value:hex}`,
  `{type:'repeat',count:N}`.

- **`flatten(program)`** — expands to a primitive-op list (no repeats). A
  `repeat(count)` appends `count-1` more copies of everything accumulated before it,
  so `[Forward, Turn, Repeat(4)]` = 4 iterations = a square. This is the "repeat
  wraps the whole program" decision; there are **no nested block containers**. If
  Phase 2 needs nested loops, that's the thing to change here.

- **Rendering** — `segmentsSVG()` builds `<line>` elements (concrete hex colours, so
  export is trivial); `turtleMarker()` is the on-screen triangle (uses `var(--accent)`
  and is excluded from export). `Run` replays all; `Step` walks one primitive op at a
  time via a cursor that resets on any edit; `Undo` pops and re-runs from scratch.

- **Export** — serializes a clean copy (white bg rect + segments only, no turtle) via
  a Blob + temporary `<a download>`. No PNG in Phase 1.

## Guardrails

Every reachable state is valid by construction: repeat count clamped 1–20 (buttons
only, no keyboard), forward is a fixed positive increment, turn angles are
quick-select chips (15/30/45/90). There is no free numeric text entry, so the app
can't be driven into an invalid state.

## Not done in Phase 1

- Not linked from the root `index.html` nav yet (no PNG export, no Phase 2 mandala).
