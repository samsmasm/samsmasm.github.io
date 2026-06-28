# CLAUDE.md — ibecon-src (IBecon Astro source)

## What this is

Astro source for the **I Beat Economics** site. Builds to `../ibecon/`, served from `unisam.nz/ibecon/`.

**Never edit `../ibecon/` directly.** Always edit source here, then build.

---

## Build

```bash
npm run build    # builds to ../ibecon/
npm run dev      # dev server at localhost:4321
```

Astro config: `astro.config.mjs`
```js
site: 'https://unisam.nz', base: '/ibecon', outDir: '../ibecon'
```

---

## File structure

```
ibecon-src/
  src/
    layouts/
      Layout.astro       ← wraps every page: Nav + global.css + footer
    components/
      Nav.astro           ← top nav
    pages/
      index.astro         ← homepage
      unit1/              ← 1-1, 1-2 + index
      unit2/              ← 2-1 through 2-12 + index (Microeconomics)
      unit3/              ← 3-1 through 3-7 + index (Macroeconomics)
      unit4/              ← index only (Global Economy — not yet populated)
    styles/
      global.css
  refdocs/                ← reference docs
```

---

## Colour scheme

Economics green: `--accent: #145c34`, borders `#b6e8cb`, background `#f0faf4`.

---

## Page pattern

Same structure as `ibbm-src`:
```astro
---
import Layout from '../../layouts/Layout.astro';
---
<Layout title="X.X Topic Name">
  <div class="breadcrumb">...</div>
  <div class="topic-hero">...</div>
  <div class="tabs">...</div>
  <div id="notes" class="tab-content active">...</div>
  <div id="practice" class="tab-content">...</div>
</Layout>
```

`switchTab()` injected inline by Layout. Same callout/section conventions as IBBM.

---

## Completed units

- Unit 1: 1.1–1.2 (Introduction to Economics)
- Unit 2: 2.1–2.12 (Microeconomics — full)
- Unit 3: 3.1–3.7 (Macroeconomics — full)
- Unit 4: index placeholder only — content not yet written

---

## Gaps

Unit 4 (Global Economy) has no content pages yet. The `myres/` folder inside `ibecon-src` contains resources that could inform Unit 4 content.

---

## Future: Today page multi-year / multi-class expansion

Two planned but not yet built features for the Today system (Firebase paths `ibecon/today` and `ibecon/archive`):

**1. Deep-archive / end-of-year rollover**
When a school year ends, all posts in `ibecon/archive` should be moved to a dated sub-path (e.g. `ibecon/archive-2025-26/`) and `ibecon/today` + `ibecon/archive` cleared for the new year. A simple admin button in the edit modal ("Archive this year") could do the Firebase moves. Students could be given a read-only link to the previous year's archive page.

**2. Parallel IB1 / IB2 sections**
If running Year 1 and Year 2 simultaneously, the simplest path is two side-by-side Today sections on the homepage, each with its own Firebase path pair (e.g. `ibecon/ib1/today`, `ibecon/ib1/archive`, `ibecon/ib2/today`, `ibecon/ib2/archive`). The admin trigger would need to clarify which class's board is being edited (a small "IB1 / IB2" selector before the passcode modal, or separate trigger headings). Each section would have its own tiered archive.

---

## Adding a new page

1. Create `src/pages/unitX/X-Y.astro`
2. Add nav entry in `src/components/Nav.astro`
3. `npm run build`

---

## Key constraints

Same as `ibbm-src`: Inter from Google Fonts, `switchTab` is inline in layout, `base: '/ibecon'` handles all links.
