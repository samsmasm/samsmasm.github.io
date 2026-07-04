# CLAUDE.md — ibbm-src (IBBM Astro source)

## What this is

Astro source for the **I Beat Business Management** site. Builds to `../ibbm/`, which is served from `unisam.nz/ibbm/`.

**Never edit `../ibbm/` directly.** Always edit source here, then build.

---

## Build

```bash
npm run build    # builds to ../ibbm/
npm run dev      # dev server at localhost:4321
```

Astro config: `astro.config.mjs`
```js
site: 'https://unisam.nz', base: '/ibbm', outDir: '../ibbm'
```

---

## File structure

```
ibbm-src/
  src/
    layouts/
      Layout.astro       ← wraps every page: Nav + global.css + footer
    components/
      Nav.astro           ← top nav with dropdown menus per unit
    pages/
      index.astro         ← homepage
      unit1/              ← 1-1 through 1-6, plus index
      unit3/              ← 3-1 through 3-9 (+5-5 break-even), plus index
      unit4/              ← 4-1, 4-2, 4-3, 4-4, 4-5-{product,price,promotion,place,people,processes,physical}, 4-6, plus index
      casestudies/        ← case study pages
    styles/
      global.css          ← all site-wide styles
  finsyl.md               ← IB Finance syllabus reference (Unit 3 content checklist)
  refdocs/                ← reference docs for content accuracy
```

---

## Page pattern

Every content page:
```astro
---
import Layout from '../../layouts/Layout.astro';
---
<Layout title="X.X Topic Name">
  <div class="breadcrumb">...</div>
  <div class="topic-hero">...</div>
  <div class="tabs">
    <button class="tab-btn active" onclick="switchTab(this, 'notes')">Notes</button>
    <button class="tab-btn" onclick="switchTab(this, 'practice')">Practice</button>
  </div>
  <div id="notes" class="tab-content active">...</div>
  <div id="practice" class="tab-content">...</div>
</Layout>
```

`switchTab()` is defined in `Layout.astro` as an `is:inline` script (always available).

---

## Content conventions

- **Learning goals** box at top of notes tab: `<div class="learning-goals">`
- **Section headers**: `<h2 class="section-title">`
- **Callout boxes**: `<div class="callout remember|key|example">` with a `<div class="callout-title">`
- **Tables**: standard HTML tables inside section divs
- **HL content**: wrap in `<div class="hl-only">` with a label badge

Content should match the IB BM syllabus. `finsyl.md` is the Unit 3 checklist. For other units check the nav structure in `Nav.astro` for what topics exist.

---

## Nav structure (completed units)

Unit 1: 1.1–1.6 (Business Org)
Unit 3: 3.1–3.9 + 5.5 (Finance — all built)
Unit 4: 4.1–4.6 including 4.5 split into 7Ps (all built)

Units 2 and 5 are not yet in the nav. Do not add them unless asked.

Case studies are separate pages under `/casestudies/`.

---

## Adding a new page

1. Create `src/pages/unitX/X-Y.astro` following the pattern above
2. Add a nav entry in `src/components/Nav.astro` in the correct dropdown
3. Rebuild: `npm run build`

---

## Key constraints

- Inter font loaded from Google Fonts in `Layout.astro`. Do not change.
- `switchTab` is injected as `is:inline` in the layout — do not redefine it in page scripts.
- The built output goes to `../ibbm/` (a sibling directory of `ibbm-src/`). Astro's `base: '/ibbm'` handles all internal links automatically.

---

## Current status

Units 1, 3, and 4 fully built (all pages). Units 2 (Human Resource Management) and 5 (Operations Management) have no pages and are not in the nav.

**Not built:** Units 2 and 5 entirely. Case studies page exists but content may be sparse.

**No bugs in built content.**
