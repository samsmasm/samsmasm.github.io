# CLAUDE.md — PDF Annotation Tool

## What this is

A browser-based PDF annotation tool. Users upload a PDF, draw on it (freehand annotations with thickness/colour controls), and can undo. Designed for quickly marking up documents without installing software.

Live at: `unisam.nz/pdfwrite/`

---

## File structure

```
pdfwrite/
  index.html    ← main UI (~461 lines)
  script.js     ← annotation logic
  styles.css    ← styles
```

---

## Architecture

- PDF rendered to canvas using **PDF.js** (CDN)
- Annotations drawn on a transparent overlay canvas layered on top of the PDF canvas
- Undo stack tracks drawing operations
- Toolbar: file picker, pen thickness slider, colour picker, undo button

---

## Constraints

- No server upload — everything is client-side.
- PDF.js version is pinned via CDN — verify it still works if CDN version is bumped.

---

## Current status

Working. Simple annotation tool, no planned features. No known bugs.
