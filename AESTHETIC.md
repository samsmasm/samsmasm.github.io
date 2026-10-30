# unisam.nz — design aesthetic guide

This document is the long-term reference for the visual language of unisam.nz and its sub-pages. It should be consulted before building or modifying any page on the site.

---

## Two looks (decided 2026-10-30)

The site has two looks. **Option B is the direction Sam wants the site to move to.** Use it for every new page, and when restyling an old page. Option A is the original pastel look, kept here because most existing pages still use it; do not start new pages in it.

| | Option A: Pastel watercolour (original) | Option B: Paper and ink (preferred) |
|---|---|---|
| Masthead | Multi-radial pastel gradient | Solid navy, amber rule underneath |
| Page | White | Warm paper |
| Headings | Georgia | Fraunces |
| Body | System sans-serif | Atkinson Hyperlegible |
| Feel | Whimsy, unicorn rainbow | Calm, editorial, dyslexia-friendly, a bit of warmth |
| Examples | `/`, econnews, businews, most tools | ratibro, asia, fmwafrica, boss |

### Logo (both looks)

**Always use the cartoon unicorn: `/geocorn.png`** (or `/geocornsmall.png`, 200px, for small sizes). It is round artwork, so it needs no border radius or backing. 40 to 56px in a masthead.

**Never use `/unisamsq.png`, `/unisamicon.png` or `/unisamicon2.png`** (the photo with the unicorn horn) on any page. Swap them for geocorn when you touch a page that still has them.

Topic pages may use a topic logo instead, as fmwafrica does with its Africa silhouette.

### Option B: Paper and ink

The family look of ratibro, asia and fmwafrica: a solid dark masthead with one warm accent, warm paper underneath, a characterful serif for headings and a highly legible body font.

**Colours**

```css
:root {
  --masthead: #1e2a4a;      /* navy masthead, also primary buttons */
  --masthead-ink: #ffffff;  /* text on the masthead */
  --masthead-sub: #c9d2ea;  /* small text on the masthead */
  --amber: #f4a629;         /* masthead rule, active tab underline, focus ring, highlights */
  --amber-ink: #8a5a00;     /* amber as text on paper (plain --amber is too pale to read) */
  --bg: #f7f6f2;            /* page paper */
  --surface: #fffdf8;       /* cards and panels */
  --surface-2: #efede6;     /* quiet fills, table stripes */
  --line: #e3e0d8;          /* borders and dividers */
  --ink: #1e2a4a;           /* body text */
  --muted: #5b6680;         /* secondary text */
  --ok: #18634f;  --ok-soft: #d9eee6;
  --bad: #8a1c1c; --bad-soft: #f8e1e1;
}
```

Subject colours still mark sections (Economics `#145c34`, BM `#1a3a7a`, History `#7a2d0a`, Tools `#4a1a7a`, Experiments `#7a1a4a`): use them for headings, links and accents inside a page, not for the masthead. A topic page may pick its own accent when there is a reason, as asia (indigo on archive paper) and fmwafrica (indigo and red ochre) do; write the reasoning in that page's CLAUDE.md, and avoid flag colours and cultural stereotypes.

**Type**

```html
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Fraunces:opsz,wght@9..144,500;9..144,700&display=swap" rel="stylesheet">
```

- Headings and the wordmark: `'Fraunces', Georgia, serif`, weight 500 to 700, `font-variant-numeric: lining-nums`.
- Body and UI: `'Atkinson Hyperlegible', -apple-system, 'Segoe UI', sans-serif`, 16 to 18px, left-aligned, line-height 1.5. Bold (700) is allowed for key numbers and labels.
- Small labels: uppercase, letter-spacing 0.08em, `--muted` or `--masthead-sub`.

**Masthead**

Solid `--masthead` background, `border-bottom: 4px solid var(--amber)`. Logo, then the page name in Fraunces in white, with an optional small uppercase line under it. Navigation sits on the right of the masthead as plain white text tabs; the active tab has a 3px amber underline. A plain "unisam.nz" link goes home.

**Components**

- Cards and panels: `--surface`, `1px solid var(--line)`, radius 10 to 12px, no shadow.
- Primary button: `--masthead` fill, white text, radius 10px. Secondary: `--surface` with a `--line` border and `--ink` text. Never pill-shaped.
- Focus: `outline: 3px solid var(--amber); outline-offset: 2px`.
- Good and bad results use `--ok` / `--bad` with their soft fills, and always a word or icon too, never colour alone.

**Dark mode** is optional in Option B. If a page has it, follow the system setting (`prefers-color-scheme`) through the CSS variables, as asia does. Pages do not need it.

**Still applies from Option A:** no pill tags or labels, no Tailwind starter-kit look, no emoji in navigation, the tone section, and the footer.

---

Everything from here down describes **Option A** (the original pastel look), apart from the "What to avoid" and "Tone" sections, which apply to both.

---

## Philosophy

The site is serious under the hood and playful on the surface. It is built by a teacher, for students, and it should feel like neither a corporate SaaS product nor a bland school portal. The aesthetic reference points are:

- **Talkonomics** (talkonomicsteaching.wordpress.com) — clean editorial structure, serif wordmark, generous whitespace, content-first
- **Unicorn** — pastel rainbow colours, whimsy, not taking itself too seriously, warmth
- **Not AI-generated looking** — avoid pill buttons, generic card grids, design-system aesthetics, neutral greys, anything that looks like it came from a Tailwind starter kit

The tension to hold: clean enough to be functional and trustworthy; colourful and warm enough to feel human and fun.

---

## Typography

**Wordmark / site title:** Georgia or another serif. Never sans-serif for the site name.

**Body and UI text:** System sans-serif stack — `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`. Clean, readable, not distinctive.

**Section labels / metadata:** Small caps or uppercase with generous letter-spacing. Muted colour. Never bold.

**No Tailwind utility fonts, no Inter, no DM Sans** — these read as AI-generated immediately.

---

## Colour system

### Subject colours

Each subject has a pastel background colour and a darker text/border colour derived from the same hue. These are used for card backgrounds, nav underlines, source tags, and accents.

| Subject | Background | Border | Text / heading |
|---|---|---|---|
| Economics | `#f0faf4` | `#b6e8cb` | `#145c34` |
| Business Management | `#f0f5ff` | `#b6cff5` | `#1a3a7a` |
| History / Foundations | `#fff5f0` | `#f5c9b0` | `#7a2d0a` |
| Classroom tools | `#f5f0ff` | `#d0b6f5` | `#4a1a7a` |
| Experiments | `#fff0f6` | `#f5b6d4` | `#7a1a4a` |

### Header gradient

The site header uses a swirling multi-colour pastel radial gradient. This is the primary "rainbow" moment on every page. It should feel like soft spilled watercolour, not a CSS gradient generator output.

Reference implementation (adjust radial positions for variation per page):

```css
background:
  radial-gradient(ellipse at 10% 50%, #ffd6e7 0%, transparent 50%),
  radial-gradient(ellipse at 30% 20%, #d6f0ff 0%, transparent 45%),
  radial-gradient(ellipse at 55% 80%, #e8d6ff 0%, transparent 40%),
  radial-gradient(ellipse at 75% 30%, #d6ffe8 0%, transparent 45%),
  radial-gradient(ellipse at 90% 70%, #fff3d6 0%, transparent 40%),
  radial-gradient(ellipse at 50% 50%, #ffd6d6 0%, transparent 60%),
  #f9f0ff;
```

Sub-pages can shift the radial positions or swap one colour in the stack to give each section a slightly different feel while staying in the same pastel family.

### Borders and dividers

Use very soft colours — `#f0e8ff` for dividers, `1px solid` not `0.5px`. The site should feel hand-made, not precision-engineered.

### Background

Page background: white (`#fff`) or very light grey. Never beige, never warm/creamy white — these read as dated or cosy in a way that conflicts with the site's tone. Beige backgrounds (`#f7f4ec` style) are explicitly prohibited.

---

## Logo

The logo is the cartoon unicorn, `/geocorn.png` (see "Logo (both looks)" above). It appears in the header alongside the site title, 56 to 72px, with no border radius (the art is already round). Never use the photo logo `/unisamsq.png`.

Do not replace the logo with text, emoji, or a generated icon.

---

## Navigation

### Index page

The index uses a horizontal tab-bar navigation below the header. Tabs are plain text, no borders, no background colours, no pill shapes. The active tab gets a coloured underline in its subject colour (or purple for home). Inactive tabs are muted grey.

```css
.nav-item {
  padding: 0.75rem 1.1rem;
  font-size: 13px;
  font-family: sans-serif;
  font-weight: 500;
  color: #666;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  white-space: nowrap;
}
.nav-item.active {
  color: [subject colour];
  border-bottom-color: [subject colour];
}
```

### Sub-pages

Sub-pages should have a minimal header with the logo, site name, and a plain text link back to unisam.nz. They do not need the full tab-bar navigation — they are destinations, not gateways.

---

## Cards

Tool cards are the primary content unit. They are coloured by subject (see colour system above). They should feel light, not heavy.

```css
.tool-card {
  border-radius: 10px;
  padding: 1rem 1.1rem;
  border: 1.5px solid [subject border colour];
  background: [subject background colour];
  transition: transform 0.1s;
}
.tool-card:hover {
  transform: translateY(-2px);
}
```

Card titles use the subject's dark text colour, weight 600, sans-serif, 14px.
Card descriptions use a mid-tone of the same hue, weight 400, 12px, line-height 1.5.

**What to avoid:**
- Grey card backgrounds
- Drop shadows
- Neutral borders
- Accent dots or left-border stripes (these read as design-system artefacts)
- Identical card sizes forced by a rigid grid — `auto-fill` with `minmax` is fine

**Directory / listing pages (many items, e.g. `/tools`, `/experiments`):** do not use a grid of filled cards — a wall of identical coloured rounded rectangles reads as a generic component grid (the "giant pills" look). Instead use a **ruled editorial index**: each category is a section under its coloured top-rule label, and each item is a row with the name in Georgia in the subject colour on the left, a muted-grey one-line description on the right, and a `1px solid #f0e8ff` hairline between rows. No fills, no borders around items, no rounded boxes.

---

## Feed items (home page)

Feed items on the home page are editorial in style — closer to a blog index than a card grid. They use:
- A small coloured source label in the same hue (plain uppercase text, **not** a filled pill — see the no-pills hard rule)
- A serif or near-serif title (Georgia or system serif)
- A sans-serif excerpt in muted grey
- A small date in light grey
- Dividers between items: `1px solid #f0e8ff`

Source labels are plain coloured text, no background, no border, no radius:
```css
.feed-source {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-family: sans-serif;
}
/* econnews */ color: #145c34;
/* bm/business content */ color: #1a3a7a;
/* quiz */ color: #4a1a7a;
```

---

## Footer

Plain, small, muted. No elaborate footer. Something like:

> Built by Sam G · all vibe coded · found a problem? tell Sam.

Font size 11px, colour `#bbb`, sans-serif. A thin top border in `#f0e8ff`.

---

## What to avoid (hard rules)

- No Tailwind default aesthetics — no `rounded-lg` pill buttons, no `bg-gray-100` surfaces
- No drop shadows anywhere
- No dark mode toggle (the site is light-mode only, intentionally)
- No loading spinners or skeleton screens
- No modal overlays
- No emoji in navigation or UI chrome (the logo is the exception)
- No AI-kit pill buttons for navigation — use underline tabs or plain text links
- No neutral grey card backgrounds — every card should have a hue
- No `font-weight: 700` in body text — 600 maximum for card titles, 500 for nav
- **No pill tags or pill labels.** Filled, rounded-rectangle chips for tags, badges, categories, or metadata are banned outright. They are the single most recognisable "AI / Tailwind starter-kit" tell, and a row of them reads as visual noise — decorative em dashes that add nothing. Render tags and metadata as **plain text** in the relevant subject colour, separated by a middot (`·`) when there are several. Status labels (e.g. "New this week") are plain uppercase letter-spaced text in the subject colour, never a filled pill. This supersedes any pill styling described elsewhere in this document or already shipped on older pages.

---

## Tone

The copy on the site is written by a human who finds things genuinely interesting. It is direct, slightly dry, occasionally wry. It does not use exclamation marks to signal enthusiasm. Tool descriptions are one sentence, factual, sometimes with a small hook.

Good: *"Coin-flip inequality simulation showing how luck drives wealth gaps."*
Bad: *"An exciting interactive tool to explore inequality concepts!"*

---

## Applying this to sub-pages

Sub-pages inherit the header gradient (with positional variation), the logo, the typography, and the colour system. They do not need the index tab navigation. Each sub-page should feel like it belongs to the same site without being a clone of the index.

The subject colour for a sub-page should be the dominant colour for that page's section (e.g. an Economics tool uses teal/green as its accent throughout).

---

## Sub-page implementations

### EconNews (`/econnews`)

The reference implementation. Colours: `--accent: #145c34`, `--link: #145c34`, borders from the Economics green column. Masthead gradient leans green (`#d6ffe8` dominant). Logo: originally `/unisamsq.png`; replace with `/geocorn.png` when next touched. Body font: Georgia serif. UI font: Inter.

### BusiNews (`/businews`)

Business Management weekly case studies. Colours: `--accent: #1a3a7a`, `--link: #1a3a7a`, `--link-hover: #0d2255`. Borders: `--border-mid: #b6cff5`, `--border-soft: #dce8f8`, `--border-pale: #eef4ff`. Muted text: `#3a4a6a`, light text: `#5a7298`. Masthead gradient leans blue (`#d6e8ff` dominant), base `#f0f5ff`. Curriculum tags: `background: #d6e8ff; color: #1a3a7a; border-radius: 4px` (soft pill, no border outline). Logo: originally `/unisamsq.png`; replace with `/geocorn.png` when next touched.
