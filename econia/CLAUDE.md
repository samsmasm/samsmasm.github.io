# CLAUDE.md — Econia (IB Econ IA Guide)

## What this is

**Econia** is a step-by-step guide for IB Economics students writing their Internal Assessment (IA) commentary. It walks through the entire process from choosing an article to submitting the portfolio, with a numbered stage system and progress tracking.

Live at: `unisam.nz/econia/`

---

## File structure

```
econia/
  index.html          ← Stage 1: Overview
  nav.js              ← shared nav renderer (same pattern as moa/nav.js)
  checklist.js        ← completion checklist logic
  style.css           ← all styles
  article/            ← Stage 2: Choosing an article
  plan/               ← Stage 3: Planning
  structure/          ← Stage 4: Structure
  diagrams/           ← Stage 5: Diagrams & Analysis
  concept/            ← Stage 6: Key Concept
  intro/              ← Stage 7: Introduction
  evaluation/         ← Stage 8: Evaluation
  weaving/            ← Stage 9: Check Your Commentary
  submit/             ← Stage 10: Submitting
  example/            ← Example commentary (stage 'e')
  grading2/           ← Grading criteria reference
  content_md/         ← Markdown source files for each stage's content
  diagrams/           ← diagram assets
  KZ Micro.pdf        ← reference document
```

---

## nav.js

Same pattern as `moa/nav.js`. `STAGES` array defines slug, label, and stage number. `renderNav()` builds the nav, marks visited pages (stored in `localStorage` under `econia-visited`), and highlights the active stage.

Every page must:
1. Include `<script src="/econia/nav.js"></script>`
2. Have `<nav id="main-nav"></nav>` in the sidebar
3. Call `renderNav()` on DOMContentLoaded

---

## Page pattern

Each stage page (`article/index.html`, etc.) follows:
1. Sidebar with logo + `#main-nav`
2. Main content area with `<div class="stage-tag">Stage N</div>`, `<h1>`, and content
3. Next-stage button at the bottom

The sidebar layout uses CSS Grid or Flexbox with an `<aside class="sidebar">` and `<main class="main">`.

---

## Content source

`content_md/` contains the original Markdown for each stage. If updating content, the Markdown files are the authoritative source — convert to HTML and update the corresponding `index.html`.

---

## Key constraints

- Visited page tracking is via localStorage (`econia-visited` array of slugs).
- `checklist.js` manages a completion checklist — do not break its integration with stage pages.
- The `grading2/` page shows the IB IA marking criteria — keep it accurate to the IB rubric.

---

## Current status

Working. All 10 stages and the example/grading pages are present. No known bugs or planned features.
