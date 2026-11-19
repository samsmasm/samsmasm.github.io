# Definition Drill (IB Business Management and IB Economics)

A browser game for drilling IB style definitions, built for Sam's students at SSIS. Static pages, no backend, works on touch screens and with a mouse. Live at `unisam.nz/definitions`.

## Why it exists

IB definition questions are worth 2 marks. Examiner reports repeat that one-line definitions only earn 1 mark and that students need two distinct elements. Every definition is split into its elements (pieces), and students rebuild it by placing the pieces under the right term, in order.

## Files and pages

- `index.html`: hand-written landing page at `/definitions/`. Says "IB style definitions" and offers two cards: Business Management (BM blue, 486 terms) and Economics (Econ green, 793 terms). **Update the counts on it if a bank changes size.**
- `template.html`: the whole game (markup, CSS, JS) with placeholders `{{SUBJECT}}`, `{{SLUG}}`, `{{COLOUR}}`, `{{LEDE}}`, `{{DATA}}`. **Edit this for any game change.**
- `business/index.html`, `economics/index.html`: **generated** by `build.mjs`. Never hand-edit them.
- `build.mjs`: validates each `data/<slug>.json` (unit known, 2 or 3 parts, 1 allowed for Economics, no em or en dashes) and writes the subject pages. Per-subject settings (name, colour, lede, unit names, minimum parts) are in its `SUBJECTS`.
- `import.mjs`: copies the vault banks into `data/business.json` and `data/economics.json` (details below).
- `test/run.sh` + `test/tests.js`: headless Chrome tests (puppeteer-core shared with ShiftWork in `~/.cache/sw-test`). `DD_SHOTS=<dir>` saves screenshots.
- `IB BM Glossary (IBO).pdf` and `IB BM Kognity definitions_glossary.md`: **copyrighted, never commit** (in `.git/info/exclude`).

Rebuild after any change: `node definitions/import.mjs && node definitions/build.mjs`, then `bash definitions/test/run.sh` (132 checks; run twice, since term choice is random).

## Data

Each entry in `data/*.json`: `term`, `unit`, `topic` ("5.5 Break-even analysis", guide numbering and names), `hl` (boolean), `p` (the parts; term + parts joined by spaces reads as one sentence, part one lowercase, last part ends with a full stop), and `review: true` when flagged.

- **Business:** source of truth is `~/notes/Projects/BM definitions/data/all.json` (already split into `element1` / `element2`). Import lowercases part one unless it starts with an acronym, adds the final full stop, names subtopics from the guide (`TOPICS`), and takes the units in `UNITS_LIVE` (all 5 plus `toolkit`). The bank tags the 4 key concepts as unit 1 subtopic "concepts"; import moves them and the toolkit to group 6 "Toolkit and concepts" so Unit 1's buttons do not pull in Ethics, Sustainability and so on. Counts: Unit 1 62, 2 HR 105, 3 Finance 87, 4 Marketing 87, 5 Operations 76, group 6 69.
- **Economics:** source of truth is `~/notes/Projects/Economics definitions/data/all.json` (already in game shape; units 1 to 4: 97, 278, 219, 199). The source work is in the vault's `temp/economics definitions/` (read its CLAUDE.md): fix wording in the drafts there, rerun `assemble.py`, then reimport here. Never fix wording in `data/*.json`; the next import overwrites it.
- **One-part terms (Economics, 5):** Change, Market price, One-off windfall, International trade, Forex. They get a single box, so a board can have 4 or 5 pieces; the Economics lede does not promise six.
- **Review flags (Sam, 2026-11-18):** flagged terms (BM 55 from all.json; Econ 64, read as a bare flag from the vault's `all-audit.json`, never its source text, which is copyrighted) stay in the game with a small amber "subject to review" tag on the term card and in the full definition. When Sam clears a flag in the vault, reimport and rebuild. The 61 possible Economics duplicate pairs are not tagged and all are included.

## How the game works

- **Start page (Sam, 2026-11-17):** press-to-select buttons (Sam tried tick boxes and preferred buttons). Per unit: "Whole unit SL" (non-HL terms), "Whole unit HL" (every term) and a "Subtopics" fold (folded at the start, stays open after a round). A unit with no HL terms (BM Unit 1, Econ Unit 1) shows one "Whole unit" button. Any mix across units works. Picks are **single terms** (`state.picks`), because HL terms also sit inside SL subtopics. A subtopic shows pressed when all its terms are picked, or all its SL terms and none of its HL ones (count then shows the SL number). After Whole unit SL, a subtopic tapped back on adds its SL terms only (`state.level`). HL-only subtopics show a small "HL" label (BM 2.5, 2.7, 3.6, 3.9; Econ 2.4, 2.10, 2.11, 2.12). Nothing is picked at the start.
- **Round lengths:** 6, 12, 18 or All terms (18 added 2026-11-18).
- **Board size (Sam, 2026-11-19):** "Each board" choice on the start page: "2 terms · 6 pieces" or "3 terms · 8 pieces" (`state.per`, default 3). The last choice is the student's default, in localStorage `dd-board`, shared by both subjects. The ledes no longer name a number of terms.
- **Header (Sam, 2026-11-19):** logo and "Definition Drill" go to the subject choice `/definitions/`; the "IB <Subject>" line goes back to this subject's start (`./`). No "Subjects" link; top right is just unisam.nz.
- **Leaving mid-round:** results are saved at every Check, so a student who leaves after 1 of 2 boards keeps those terms' results and asked marks (tested).
- **Boards of 3 terms (Sam, 2026-11-17).** The first version (one term, its parts reordered) was too easy. Each board shows 3 terms with one empty box per part, and all their pieces shuffled in a shared pool, so students must read the pieces to match them. A leftover is spread over the last boards (one term bigger), never a board of 1. If fewer terms are picked than a board holds, unscored terms from the same unit fill the board. (2-term boards are an option since 2026-11-19, see Board size.)
- **Spare pieces (Sam, 2026-11-19):** each board's pool also holds 2 distractors (`SPARES`, `spares()`), one piece each from two terms not on the board: same subtopic first, then same unit, then anywhere; never a text already on the board. They carry `t: -1`. Check needs every box filled (not an empty pool); the pool label says "N boxes left", then "2 spare". After Check the leftover spares are greyed.
- **Placing:** tap a piece then a box (or box then piece); tap two placed pieces to swap; tap a placed piece then the pool to take it out. Drag: mouse from anywhere on a piece, touch only from the grip strip on its left (`touch-action:none` only there), so swiping on a piece's text still scrolls the page. Taps on pieces are handled on pointerup (pointer capture stops the browser's click arriving after a grip tap); the click listener ignores the duplicate. Auto-scroll while a dragged piece is near the top or bottom edge.
- **Checking:** Check is enabled only when every box is filled. Marking is per piece (✓/✗); a term is right only if all its pieces are in the right boxes in order. Wrong terms show the full definition in their card. Pieces drop trailing commas and full stops so punctuation does not give the order away; the full definition keeps them, with an amber bar at the split point.
- **End:** score, "To go over" list of missed definitions, Retry missed (if fewer than 3 were missed, other terms from the chosen topics fill the board, unscored), Play again, Change topics.

## Per-student memory (browser only, per subject)

Kept in localStorage, keys `dd-again-<slug>`, `dd-seen-<slug>` and `dd-last-<slug>`, term key `unit|term`. Only `loadSet` / `saveSet` / `loadObj` / `saveObj` touch storage (wrapped in try/catch). **Browser only by Sam's decision (2026-11-19): it fits his school's data protection policy. Do not add a login or a server store.**

- **Review again (Sam, 2026-11-18):** each term card, each "To go over" entry and each glossary definition has a "☆ Review again" toggle, off by default. Once anything is saved, the start page shows a "Review again" section above Topics: "Whole course" plus one button per unit (deliberately no subtopics), and "List →", which opens the Glossary filtered to ★ Review again. These buttons add to picks like unit buttons, so they mix with other topics.
- **Progress, last result (Sam, 2026-11-19):** `dd-last` holds each term's result the last time it was on a checked board (fillers too): 1 right, 0 missed. Last result, not "ever right", so a later miss turns it amber again. **No numbers on screen** (Sam's wish): each subtopic button has a thin strip along its bottom edge with one segment per term, sorted right (subject colour), missed (amber), not yet (pale); each unit heading has one continuous bar in the same colours. Counts are only in `aria-label`s for screen readers.
- **Glossary (Sam, 2026-11-19):** a "Practise | Glossary" switch above the start page (`#tabs`, hidden during play). Units with their bar, subtopics as `<details>` folds with their strip, each term a fold with a progress dot, its definition (amber split bars) and its Review again toggle. Filters, single choice, tap again for all: Not yet, Missed, Right, ★ Review again; a filter opens every subtopic that has a match. "Clear my progress" at the bottom clears `again`, `seen` and `last` for this subject: the first tap turns it into "Keep my progress" and the real confirm appears at the top of the glossary, ignoring taps for 0.5 s (Sam's double-click-proof pattern).
- **Report a definition (Sam, 2026-11-19):** a deliberately small, quiet link under the three terms on each board. It opens a panel: pick which term, optional note, "Send to Sam". POSTs to the shared feedback Worker (`app: 'definitions'`, type bug, message "<Subject> definition: <term> (<topic>)" plus the note, `diagram` = JSON of subject, term, unit, topic, parts). Nothing else about the student is sent.
- **No repeats until all asked (Sam, 2026-11-18):** every term on a checked board (fillers too) is recorded as asked. Start uses `choose()`: never-asked terms from the pick first; when fewer are left than the round needs, it takes them all, clears the asked marks for that pick (a fresh cycle) and fills from the rest. The start line adds "· N not asked yet" or "· all asked, starting again" (nothing when none of the pick has been asked). Retry missed is unaffected.

## Links

Homepage: Business menu and BM panel link `/definitions/business/`; Economics menu and Econ panel link `/definitions/economics/` (keep menus and panels in step). /find has one entry per subject (Course notes and revision). Not mirrored to the work site (`ssis-sgraham.github.io`) yet.

## Possible later (only if Sam asks)

- Easier warm-up mode: plain term-to-definition matching.
- Teacher print view of all definitions for a topic.

## Conventions

- Never use em dashes in any text, code comments, UI copy or commit messages. NZ/UK spelling.
- Look: AESTHETIC.md Option B (navy masthead, amber rule, paper background, Fraunces + Atkinson Hyperlegible), subject colours BM `#1a3a7a`, Econ `#145c34`, geocorn logo.
- Student-facing copy is short, plain and friendly. No AO labels. Low text, large touch targets, dyslexia-friendly spacing.
- Sam wants to steer. Do not ask him questions or propose new directions mid-task; make the sensible call, state it in one line, and carry on. He has the final say on pedagogy.
- No frameworks, no external requests apart from Google Fonts, no tracking.
- Report back briefly: what changed, counts, anything flagged.
