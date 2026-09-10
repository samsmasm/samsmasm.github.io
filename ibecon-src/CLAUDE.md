# CLAUDE.md: ibecon-src (IBecon Astro source)

## What this is

Astro source for the **I Beat Economics** site. Builds to `../ibecon/`, served from `unisam.nz/ibecon/`.

**Never edit `../ibecon/` directly.** Always edit source here, then build. Commit the built
output alongside the source, since `../ibecon/` is what GitHub Pages actually deploys.

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
      Layout.astro        ← wraps every page: Nav + global.css + footer
                             props: title, description, noindex
    components/
      Nav.astro           ← top nav, hand-maintained (every page listed by hand)
    pages/
      index.astro         ← homepage (four unit cards)
      today.astro         ← Today in class board, UNLISTED, see below
      unit1/              ← 1-1, 1-2 + index (Introduction to Economics)
      unit2/              ← 2-1 through 2-12 + index (Microeconomics)
      unit3/              ← 3-1 through 3-7 + index (Macroeconomics)
      unit4/              ← index only (Global Economy, not yet populated)
    styles/
      global.css          ← all site CSS, single file, no per-page stylesheets
  public/                 ← copied to ../ibecon/ AS-IS at build. See warning below.
    graphs/
      micrographs/        ← 29 hand-authored SVGs + graphs.md + originals/
      macrographs/        ← 41 hand-authored SVGs + graphs.md + originals/
    2025happenings/       ← class planning docs, GITIGNORED, see warning below
  graphs-wip/             ← SVGs being drawn, not yet served (not under public/)
  refdocs/
    gaps-unit1-foundations.md   ← tracked
    ibeconsyll.txt              ← IB syllabus text, gitignored
    mydocs/                     ← teacher pptx/docx/xlsx, GITIGNORED, see below
```

---

## Anything in `public/` gets published

`public/` is copied verbatim into `../ibecon/`, which deploys to unisam.nz. There is no
filtering step. Two things are therefore gitignored and must stay that way:

- **`refdocs/mydocs/`** holds teacher source material: practice tests, mark schemes, unpublished
  class decks. (Not in `public/`, so not deployed, but it must not land in a public repo either.)
- **`public/2025happenings/`** holds the course record, the planner and the day-to-day sheet.
  These are in `public/`, so tracking them would publish them at
  `unisam.nz/ibecon/2025happenings/`. The built copy `ibecon/2025happenings/` is ignored
  at the repo root for the same reason.

Before adding anything to `public/`, assume a student will find it. Never use
`git add -A` or `git add .` in this repo (see the root CLAUDE.md).

---

## Colour scheme

The site chrome and all content pages use the **teal** palette in `src/styles/global.css`:

```css
--navy: #0D5C57;  --navy-dark: #094843;
--blue: #14746F;  --blue-light: #A7E8E4;  --blue-pale: #E8F8F7;
--bg: #f8fafc;    --surface: #ffffff;
--text: #1e293b;  --text-muted: #64748b;
--border: #e2e8f0;  --border-strong: #cbd5e1;
```

Callout accents: `--amber` `--green` `--red` `--purple`, each with a `-light` background pair.

`--accent: #145c34` (the unisam.nz Economics green from the root `AESTHETIC.md`) is defined
in `global.css` but is used **only by `today.astro`**. No content page references it. Do not
introduce it into topic pages: they are teal, and the sibling tool at `/ibeconinequality/`
uses the same teal, not a contrasting colour.

---

## Page pattern

```astro
---
import Layout from '../../layouts/Layout.astro';
---
<Layout title="2.3 Competitive Market Equilibrium">
  <div class="breadcrumb">...</div>
  <div class="topic-hero">...</div>
  <div class="learning-goals">...</div>
  <div class="tabs">
    <button class="tab-btn active" onclick="switchTab(this,'notes-2-3')">Notes</button>
    <button class="tab-btn" onclick="switchTab(this,'worked-2-3')">Worked Examples</button>
    <button class="tab-btn" onclick="switchTab(this,'practice-2-3')">Practice</button>
  </div>
  <div class="tab-content active" id="notes-2-3">...</div>
  <div class="tab-content" id="worked-2-3">...</div>
  <div class="tab-content" id="practice-2-3">...</div>
  <div class="page-nav">...</div>
</Layout>
```

**Tab ids are suffixed with the topic number** (`notes-2-3`, not `notes`). Notes and Practice
are always present; the Worked Examples tab is optional and only appears where there is
calculation to show (2.3, 2.5, 3.1, 3.3, 3.4, 3.5, 3.6).

`switchTab()` is injected inline by `Layout.astro`.

### Content classes (all in `global.css`)

- `.section` + `.section-title`, then `<h3>` for subheadings
- `.callout` with one of `key-term` `hl-only` `exam-tip` `remember` `warning`, each wrapping a `.callout-title`
- `.learning-goals`, `.recap` (dark teal checklist box), `.two-col` + `.content-card`
- `.key-terms` + `.key-term-card`, `.formula-box`, `.graph-figure` (`<figure>` + `<img>` + `<figcaption>`)
- `.exercises` + `.exercises-title`, then `.exercise` + `.exercise-q` (+ optional `.exercise-marks`),
  with answers in `<details class="answer"><summary>Show answer</summary><div class="answer-content">`
- `.hl-badge` for the HL marker

Use `&#8321;`/`&#8322;` for subscripts in prose so they match the graph labels.

---

## Graphs

Every diagram on the site is a **hand-authored SVG** in `public/graphs/`. There is no chart
library and no build step for them. Two sets, with **different house styles**:

| | `micrographs/` (29) | `macrographs/` (41) |
|---|---|---|
| Used by | Unit 1, Unit 2 | Unit 3 |
| Font | Georgia serif | Segoe UI / sans-serif |
| Title | baked into the SVG | none, the page `figcaption` carries it |
| Origin | no "0" label | "0" labelled, arrowheads on both axis ends |
| Canvas | 680×540 (a few wider/taller) | 680×540 (a few wider/taller) |
| Palette | demand `#14746F`, supply `#0D5C57`, highlight/DWL `#C0392B` | AD/demand `#1F4DA1`, SRAS/policy `#C81E5A`, LRAS `#E8A200` |

Referenced from pages as `/ibecon/graphs/micrographs/<name>.svg` (or `macrographs/`).

### `graphs.md` is the source of truth

Each folder has a **`graphs.md`** recording the shared house style, the naming convention, and
what every single SVG shows and labels, so a future edit does not need to open the image.

**Keep it updated.** Adding, changing or retiring an SVG means editing that folder's
`graphs.md` in the same commit. Read it before drawing anything new: it is what keeps 70
diagrams looking like one set.

`originals/` in each folder holds the reference images the SVGs were drawn from (hand-drawn
JPGs for micro, Kognity PNGs for macro). Not served on the site.

Distinct surpluses/areas on one diagram must use **distinct colours** (consumer surplus blue,
producer surplus amber), never two shades of the same hue.

`graphs-wip/` holds SVGs still being drawn. Move one into `public/graphs/<set>/` and add its
`graphs.md` entry when it is ready.

---

## Content status

| Unit | Notes | Practice |
|---|---|---|
| Unit 1 (1.1–1.2) | complete | **stubs** ("Materials to come") |
| Unit 2 (2.1–2.12) | complete | 2.1, 2.2, 2.3 done. **2.4–2.12 are stubs** |
| Unit 3 (3.1–3.7) | complete | complete |
| Unit 4 (4.1–4.10) | **nothing**, index stub only | n/a |

Eleven pages still carry the "Materials to come" practice stub: `1-1`, `1-2`, and `2-4`
through `2-12`. Find them with `grep -rl "Materials to come" src/pages`.

---

## Gaps

**Unit 4 (The Global Economy)** is a single stub page listing all ten topics as "To come".
No content exists, and there is no teacher material for it: `refdocs/mydocs/` holds only
`1 Intro`, `2 Micro` and `3 Macro`. Unit 4 needs source material before it can be written.

(Older versions of this file referred to a `myres/` folder here. There is no `myres/` in
`ibecon-src`. That folder belongs to `ibbm-src`. The resource store here is
`refdocs/mydocs/`.)

---

## Today board: currently hidden

The Firebase-backed "Today in class" board used to be the homepage. It is now parked at
`src/pages/today.astro` → `/ibecon/today/`: still fully working (Firebase project
`dowserboard`, paths `ibecon/today` and `ibecon/archive`, passcode admin via clicking the
heading), but not linked from the homepage or nav, and served with `noindex, nofollow` via
the Layout's `noindex` prop.

It is also the only page using the green `--accent` and `#f0faf4`.

To reinstate as the homepage: copy `today.astro` back over `index.astro`, drop the `noindex`
prop, and change the first nav link's label in `Nav.astro` from "Home" back to "Today".

---

## Future: Today page multi-year / multi-class expansion

Two planned but not yet built features for the Today system (Firebase paths `ibecon/today` and `ibecon/archive`):

**1. Deep-archive / end-of-year rollover**
When a school year ends, all posts in `ibecon/archive` should be moved to a dated sub-path (e.g. `ibecon/archive-2025-26/`) and `ibecon/today` + `ibecon/archive` cleared for the new year. A simple admin button in the edit modal ("Archive this year") could do the Firebase moves. Students could be given a read-only link to the previous year's archive page.

**2. Parallel IB1 / IB2 sections**
If running Year 1 and Year 2 simultaneously, the simplest path is two side-by-side Today sections on the homepage, each with its own Firebase path pair (e.g. `ibecon/ib1/today`, `ibecon/ib1/archive`, `ibecon/ib2/today`, `ibecon/ib2/archive`). The admin trigger would need to clarify which class's board is being edited (a small "IB1 / IB2" selector before the passcode modal, or separate trigger headings). Each section would have its own tiered archive.

---

## Adding a new page

1. Create `src/pages/unitX/X-Y.astro`, copying an existing topic page for the tab pattern
2. Add the nav entry in `src/components/Nav.astro` (hand-maintained, nothing is automatic)
3. Fix the `.page-nav` previous/next links on the neighbouring pages
4. `npm run build`, then commit source and built output together

---

## Key constraints

- Inter from Google Fonts; `switchTab` is inline in the layout; `base: '/ibecon'` handles all links
- All CSS lives in `src/styles/global.css`. No per-page stylesheets, no CSS framework
- All diagrams are hand-authored SVGs. No chart library
- Same callout and section conventions as `ibbm-src`

---

## Current status

Notes are complete for Units 1, 2 and 3. Practice is complete for Unit 3 and for 2.1–2.3;
the other eleven topic pages still have practice stubs. Unit 4 has no content at all.

The homepage is the four-unit card grid. The Today board is hidden at `/ibecon/today/`.

**Not built:** all 10 Unit 4 topics; practice for 1.1, 1.2 and 2.4–2.12; the Today page
multi-year / IB1-IB2 expansion documented above.

**No known bugs in built content.**
