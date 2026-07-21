# Task: redesign unisam.nz index page

## Context

This is a task for Claude Code. The file to modify is `index.html` in the root of the samsmasm.github.io repository (served at unisam.nz).

Read `AESTHETIC.md` in this folder before doing anything. That document is the long-term design reference for the site. This task file describes what to build for the index page specifically.

---

## What this page does

The index is a teaching gateway. Students land here knowing which subject they're in and looking for a specific tool. Some stumble on it for the first time. The page needs to:

1. Show a live feed of recent content from auto-updating sub-sites (home/default state)
2. Let students filter to their subject instantly (no page load)
3. Allow discovery of experiments and fun things via their own filter tab
4. Get out of the way — students should reach their tool in two clicks maximum

---

## Structure

### Header

- Logo image: `/unisamsq.png` — display at 64px square, border-radius 14px, inside the pastel gradient header
- Site title: "unisam.nz" in Georgia serif, ~26px, colour `#2d1a4a`
- Subtitle: "IB Economics · Business Management · Foundations of the Modern World" in sans-serif 13px, colour `#6b4d8a`
- Header background: swirling pastel radial gradient (see AESTHETIC.md)

### Navigation tab bar

Sits below the header. Horizontal tabs, plain text, no pill shapes. Active tab gets coloured underline. Tabs in order:

| Tab label | data-view | active colour |
|---|---|---|
| home | home | `#a855f7` |
| economics | econ | `#16a34a` |
| business | bm | `#2563eb` |
| history | hist | `#ea580c` |
| classroom | class | `#7c3aed` |
| experiments | exp | `#db2777` |
| all | all | `#1a1a1a` |

### Content area

One view is visible at a time, switched by JS when a tab is clicked. Views:

#### `home` (default)

A feed of recent posts pulled from sub-sites. Display up to 6 items, newest first, across all sources. Each item shows:
- Source tag (styled pill: econnews / quiz / questionmark)
- Title (serif, 15px)
- Excerpt (truncated to ~3 lines, sans-serif, muted)
- Date

Below the feed, a "more" line: `More: /econnews · /questionmark · /quiz` with links.

**How to pull the feed:**

The sub-sites are GitHub Pages sites within the same repo (or adjacent repos). The preferred approach is for each sub-site to output a `feed.json` file at its root (e.g. `/econnews/feed.json`) containing an array of `{ title, excerpt, date, url, source }` objects. The index fetches these on page load via `Promise.all([fetch(...), fetch(...), fetch(...)])`, merges them, sorts by date descending, and renders the top 6.

If a feed.json does not yet exist for a source, skip it gracefully (catch the fetch error, continue). The feed section should render whatever is available, not break if one source is missing.

**Claude Code task:** implement the feed.json output for `/econnews` and `/quiz` as part of this work if those sub-sites are in the same repo and you can see how they generate content. If they are separate repos or the generation is external (e.g. n8n), leave a `// TODO: feed.json` comment and stub the fetch with an empty array so the page still works.

#### `econ` — IB Economics

Grid of tool cards (green tint). Cards link to their URLs. Content:

| Name | URL |
|---|---|
| EconNews | /econnews |
| IB News Finder | /ibnews |
| Econia | /econia |
| Graph Drawer | /graphs |
| Supply & Demand | /supplyanddemand |
| Flipping Hard | /flippinghard |
| Taxation & Redistribution | /ibeconinequality |
| Explaining Causation | /causation |
| Who's Feeling It? | /inflation |
| Stock Simulator | /stocksimulator |
| IB Economics Teacher Helper | https://chatgpt.com/g/g-68e8955705188191adbb5c10b560655c-ib-economics-teacher-helper |
| I Beat Economics | /ibecon |

#### `bm` — IB Business Management

Grid of tool cards (blue tint).

| Name | URL |
|---|---|
| RatIBro | /ratibro |
| Busia | /busia |
| Slop Study | /slopstudy |
| Review Questions | /qreview |
| IB BM Teacher Helper | https://chatgpt.com/g/g-68d74d9ac0bc81919e5b832f2d9e6566-ib-business-management-teacher-helper |
| IB BM Student Coach | https://chatgpt.com/g/g-69113f30ba808191be58469369c20250-ib-business-management-coach |
| I Beat Business Management | /ibbm |

#### `hist` — Foundations of the Modern World

Grid of tool cards (orange/coral tint).

| Name | URL |
|---|---|
| Modern Origin Archive | /moa |
| Operation: Shadow Protocol | /coldwar |
| Hippies, Spies & Civil Rights | /hippiesandspies |

#### `class` — Classroom tools

Grid of tool cards (purple tint).

| Name | URL |
|---|---|
| Griz | /griz |
| UniQuiz | /uniquiz |
| Scrim | /scrim |
| Spectra | /spectra |
| Pulse | /pulse |
| Flare | /flare |
| Argument Mapper | /argmap |
| Dowser | /dowser |
| Whiteboard | /wb |
| PeeDeeEffer | /peedeeeffer |
| PDF Annotator | /pdfwrite |
| Tote | /tote |

#### `exp` — Experiments & fun things

Grid of tool cards (pink tint).

| Name | URL |
|---|---|
| Picture Reveal | /reveal |
| Evolutionary Race Cars | /racecar |
| Forest Evolution | /trees |
| Paper Snowflakes | /snowflake |
| Pinhole | /pinhole |
| Guess Who Strategy | /guesswhoanimals |
| Is Luxon PM? | /isluxonpm |
| Mandelbrot Set | /mandelbrot-v2 |
| Chaos Visualisation | /chaos |
| Coordinate Inverter | /cinvert |
| Flower Generator | /flowers |
| Joined Points | /joinedpoints |
| Function Heat Map | /funcheatmap-v2 |
| Cat Jump | /catjump |
| Kitty Maze | /kittymaze |
| Sudoku | /sudoku |
| UniChase | /unichase |
| Binary Counting | /binary-game-v1.1 |
| Multiplication Memory | /multiplication-memory-v2.1 |
| Fractions | /fractions |
| Number Tiles | /numbertiles |
| Discount Dash | /discountdash-v1.0 |
| Runners in Sync | /runymxc |
| Coordinate Geometry | /coordgeo-v1.1 |
| Algebra Exam Questions | /algeqs |
| Photos | /photos |
| AniPics | /anipics |

#### `all` — Everything

All of the above, grouped by section with section labels, in a single scrolling view.

---

## Card style

See AESTHETIC.md for full details. The short version:

```css
.tool-card {
  border-radius: 10px;
  padding: 1rem 1.1rem;
  border: 1.5px solid [subject border];
  background: [subject background];
  text-decoration: none;
  display: block;
  transition: transform 0.1s;
}
.tool-card:hover { transform: translateY(-2px); }
.tool-card .tool-name { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.tool-card .tool-desc { font-size: 12px; line-height: 1.5; }
```

Subject colours:

```
econ:  bg #f0faf4  border #b6e8cb  name #145c34  desc #2d7a50
bm:    bg #f0f5ff  border #b6cff5  name #1a3a7a  desc #2d5aaa
hist:  bg #fff5f0  border #f5c9b0  name #7a2d0a  desc #aa4d2d
class: bg #f5f0ff  border #d0b6f5  name #4a1a7a  desc #7a4aaa
exp:   bg #fff0f6  border #f5b6d4  name #7a1a4a  desc #aa3a7a
```

---

## What to preserve from the old index

- All existing URLs must continue to work — this is a visual redesign, not a restructure
- The `<title>` tag: "UniSam" is fine, or update to "unisam.nz"
- Any existing `<meta>` tags for viewport, description
- The favicon if one exists

---

## What to remove

The old index had a large single-page layout with generous card descriptions for every tool. This is replaced entirely by the new filtered layout. The old markup can be deleted; the new index.html replaces it.

---

## Known issues / things to decide

- **Card descriptions:** The mockup uses short one-line descriptions. Claude Code should write these based on the existing descriptions in the old index, trimmed to one sentence. Do not just truncate — rewrite to be pithy.
- **External ChatGPT links** open in a new tab (`target="_blank" rel="noopener"`).
- **The "all" view** can abbreviate descriptions further (even shorter) since it's showing everything at once.
- **Mobile:** The tab bar should scroll horizontally on narrow screens (`overflow-x: auto`, no wrapping). Cards should collapse to 1–2 columns. The header logo and title should stack if needed below ~480px.

---

## Reference implementation

The file `index-mockup.html` in this folder contains the working interactive mockup built during the design conversation. Use it as the starting point for the real implementation. It is not production-ready (it uses placeholder feed data and `href="#"` links) but the structure, CSS, and JS are all correct in principle.
