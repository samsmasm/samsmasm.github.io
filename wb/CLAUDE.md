# CLAUDE.md — Simple Whiteboard

## What this is

A minimal browser-based whiteboard. Two canvas layers: one for freehand drawing strokes, one for grid guidelines. Floating control panel (draggable). No backend, fully client-side.

Live at: `unisam.nz/wb/`

---

## File structure

```
wb/
  index.html    ← layout + canvas elements
  script.js     ← drawing logic
  styles.css    ← styles
```

---

## Architecture

- `#drawingCanvas` — strokes layer
- `#gridCanvas` — grid overlay layer
- Both canvases are absolutely positioned and layered
- Floating `#controls` div with drag handle (`#dragHandle`)

---

## Constraints

- No external dependencies.
- Keep as a simple, fast drawing tool. No features beyond basic pen drawing and grid toggle.

---

## Current status

Working. Simple and complete. No known bugs or planned features.
