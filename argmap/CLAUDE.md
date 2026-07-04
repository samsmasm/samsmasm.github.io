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

## Current status

Working and stable. No known bugs or planned features.
