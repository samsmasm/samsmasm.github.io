# CLAUDE.md — Argument Mapper

## What this is

**Argument Mapper** is a standalone canvas-based tool for building visual argument maps. Users place nodes (contentions, reasons, objections, rebuttals, evidence) on a freeform canvas and connect them with arrows. Intended for academic writing and essay planning.

Live at: `unisam.nz/argmap/` (also embedded at `/moa/argmap/`)

---

## File structure

Single file: **`index.html`** (~2582 lines). All HTML, CSS, and JS in one file. No dependencies.

---

## Node types and colours

```
Contention  — #5c6bc0 (indigo)
Reason      — #43a047 (green)
Objection   — #ef5350 (red)
Rebuttal    — #fb8c00 (orange)
Evidence    — #1e88e5 (blue)
```

Each type has a badge (small label) with a matching pastel background (`--badge-{type}-bg/fg`).

---

## Canvas model

- Nodes are `div` elements positioned absolutely on a `#canvas` element that itself is transformed for panning/zooming.
- Connections are SVG `<path>` elements drawn from parent node to child node.
- Design tokens are defined as CSS custom properties at `:root` — node width, radius, colours, connector stroke.

---

## Key interactions

- **Add node** — button per type, or keyboard shortcut
- **Connect nodes** — drag from one node's connect handle to another
- **Delete node** — select + delete key or button
- **Pan** — drag the canvas background
- **Zoom** — scroll wheel
- **Save/Load** — serialise node positions and connections to JSON, store in localStorage or export

---

## Constraints

- Single file. Do not split into multiple files.
- Font: Georgia for node text (maintains academic register).
- Canvas background: `#f5f3ef` (warm off-white).
- Do not change node type colours or badge styles without explicit instruction — these are part of the visual grammar that students learn to read.

---

## Save / share model

Firebase project `argmap-194a5` (Firestore). `saveMap()` writes to `argmap_maps/{6-char code}`; signed-in users also get an entry under `users/{uid}/maps/{code}` for the My Maps panel. `location.hash` mirrors the current code and is auto-loaded on page open.

Share links come in two flavours off the same code:
- `#CODE` — edit link, loads bound to that code; saving overwrites the original.
- `#CODEcopy` — copy link, loads the same content but `currentCode` stays `null`, so the first Save forks a brand-new code instead of touching the original.

Opening either kind of link (via the initial-hash auto-load only, not internal Load-panel/My-Maps loads) shows a one-time modal stating which mode it is. Both link types are surfaced together in the Share modal (`#code-modal`), opened from Save (guest) or the My Maps "Share" button.

---

## Opening screen vs sample

`INITIAL_NODES` (what a fresh page load shows) is just a blank contention + one reason. The full 7-node worked example lives in `SAMPLE_NODES` and only loads via the "Sample" button at the top of the Help modal (`loadSample()`).

---

## Current status

Working and stable. No known bugs.
