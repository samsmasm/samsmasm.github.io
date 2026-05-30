# unisam.nz — design aesthetic guide

This document is the long-term reference for the visual language of unisam.nz and its sub-pages. It should be consulted before building or modifying any page on the site.

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

The logo image is at `/unisamsq.png` (square crop). It appears in the header alongside the site title. It should be:
- 56–72px square
- `border-radius: 12–16px`
- Optionally with a soft white semi-transparent backing if the header gradient makes it hard to read

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

---

## Feed items (home page)

Feed items on the home page are editorial in style — closer to a blog index than a card grid. They use:
- A small coloured source tag (pill-shaped, soft background, dark text in the same hue)
- A serif or near-serif title (Georgia or system serif)
- A sans-serif excerpt in muted grey
- A small date in light grey
- Dividers between items: `1px solid #f0e8ff`

Source tags:
```css
.feed-source {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 3px 9px;
  border-radius: 4px;
  font-family: sans-serif;
}
/* econnews */ background: #d6f5e8; color: #145c34;
/* bm/business content */ background: #d6e8ff; color: #1a3a7a;
/* quiz */ background: #ead6ff; color: #4a1a7a;
```

---

## Footer

Plain, small, muted. No elaborate footer. Something like:

> Built by Sam G · SSIS Ho Chi Minh City · all vibe coded · found a problem? tell Sam.

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

---

## Tone

The copy on the site is written by a human who finds things genuinely interesting. It is direct, slightly dry, occasionally wry. It does not use exclamation marks to signal enthusiasm. Tool descriptions are one sentence, factual, sometimes with a small hook.

Good: *"Coin-flip inequality simulation showing how luck drives wealth gaps."*
Bad: *"An exciting interactive tool to explore inequality concepts!"*

---

## Applying this to sub-pages

Sub-pages inherit the header gradient (with positional variation), the logo, the typography, and the colour system. They do not need the index tab navigation. Each sub-page should feel like it belongs to the same site without being a clone of the index.

The subject colour for a sub-page should be the dominant colour for that page's section (e.g. an Economics tool uses teal/green as its accent throughout).
