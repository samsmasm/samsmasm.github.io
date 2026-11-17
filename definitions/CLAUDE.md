# Definition Drill (IB Business Management)

A browser game for drilling IB Business Management definitions. Built for Sam's students at SSIS. Single static page, no build step, no backend, works on touch screens and with a mouse.

## Why it exists

IB definition questions are worth 2 marks. Examiner reports repeat that one-line definitions only earn 1 mark and that students need two distinct elements. The game trains that shape: every definition is split into parts, and students rebuild it by dragging the pieces into order.

## How the game works

1. Student picks one or more topics (grouped by IB unit) and a round length (5, 10, 15 or all).
2. Each question shows tiles: the term, then the definition parts, shuffled. 
3. Student drags the tiles into order (or uses the up/down arrows on each tile). Term first, then the parts in reading order.
4. Check marks each tile green or red, then shows the full correct definition.
5. End of round: score, list of missed definitions, "Retry missed" button.

A question counts as correct only if every tile is in the right place.

## Files

- `index.html` is the whole app: markup, CSS, JS and the data block. A working prototype already exists with 34 seed definitions that Claude wrote as placeholders. They are not from Sam's list and should be replaced.
- The real definitions are in Sam's Obsidian vault (repo `samsmasm/notes`) at `Projects/BM definitions/data/all.json`. Inspect the file first. Do not assume its shape. Report what you find (fields, count, duplicates, oddities) before transforming it.

## Status (2026-11-17): whole bank live

- Live at `/definitions/` with the whole bank, 486 terms: Unit 1 (62), 2 HR (105), 3 Finance (87), 4 Marketing (87), 5 Operations (76), and group 6 "Toolkit and concepts" (65 toolkit + 4 key concepts). The bank tags the key concepts as unit 1 subtopic "concepts"; import.mjs moves them to group 6 so Unit 1's buttons do not pull in Ethics, Sustainability and so on. Started as a 2.7-only trial, then units 2 and 3.
- A unit with no HL terms (Unit 1) shows one "Whole unit" button instead of SL and HL.
- 55 terms across the bank carry `review: true` in all.json (23 of them in Unit 4); all are included. The old 34-seed prototype never existed in this folder; `index.html` was built fresh.
- **Data flow:** the vault's `~/notes/Projects/BM definitions/data/all.json` is the source of truth (already split into `element1` / `element2`). `node definitions/import.mjs` copies the units in `UNITS_LIVE` into `data/defs.json` (lowercases the first letter of part one unless it is an acronym, adds the final full stop, names subtopics from the guide), then `node definitions/build.mjs` writes the block into `index.html`. Fix wording in all.json, not in defs.json, or the next import overwrites it. `UNITS_LIVE` now holds every unit plus `toolkit`.
- **Start page (Sam, 2026-11-17):** press-to-select buttons (Sam tried tick boxes and preferred buttons). Per unit: "Whole unit SL" (the unit's non-HL terms), "Whole unit HL" (every term) and a "Subtopics" fold that opens the subtopic buttons (folded at the start; stays open after a round). Any mix across units works. Picks are **single terms** (`state.picks`), because HL terms also sit inside SL subtopics (`hl` in the data). A subtopic button shows pressed when all its terms are picked, or all its SL terms and none of its HL ones (count then shows the SL number). After Whole unit SL, a subtopic tapped back on in that unit adds its SL terms only (`state.level`). HL-only subtopics (2.5, 2.7, 3.6, 3.9) show a small "HL" label. Nothing is picked at the start; a line by Start says how many terms are picked.
- If fewer than 3 terms are picked (3.1 has 2), unscored terms from the same unit fill the board.
- **Boards of 3 terms (Sam, 2026-11-17).** The first version (one term, its parts reordered) was too easy: the term always goes first and the rest is grammar. Now each board shows 3 terms, each with one empty box per part, and all their pieces (6) shuffled in a shared pool. Students must match pieces to terms, so they have to read them. Round lengths are 6, 12 or All **terms** (2, 4 or 5 boards for 2.7). A leftover of 1 or 2 terms is spread over the last boards (boards of 4), never a board of 1.
- Placing: tap a piece then a box (or box then piece); tap two placed pieces to swap; tap a placed piece then the pool to take it out. Drag: mouse from anywhere on a piece, touch only from the grip strip on its left (`touch-action:none` only there), so swiping on a piece's text still scrolls the page. Taps on pieces are handled on pointerup (pointer capture stops the browser's click from arriving after a grip tap); the click listener ignores the duplicate. Auto-scroll while a dragged piece is near the top or bottom edge.
- Check is enabled only when every piece is placed. Marking is per piece (✓/✗); a term counts as right only if all its pieces are in the right boxes in order. Wrong terms show the full definition inside their card.
- Retry missed: if fewer than 3 were missed, other terms from the chosen topics fill the board but are not scored.
- Pieces drop trailing commas and full stops so punctuation does not give the order away; the full definition keeps them, with an amber bar at the split point.
- Build: `node definitions/build.mjs` (validates, rejects em dashes). Tests: `bash definitions/test/run.sh` (64 checks: 6 groups and 486 terms, concepts out of Unit 1, single Whole unit button for Unit 1, start page, folding, Whole unit SL and HL, SL counts, mixed picks across units, HL labels, 3.1 filler board, taps both ways, swap, return to pool, mouse drag, touch drag from the grip, grip tap selects, page scroll on piece text but not on the grip, full round, retry with fillers, no sideways scroll at 390px). `DD_SHOTS=<dir>` saves screenshots.
- Linked from the homepage Business dropdown and BM panel, and from /find (Business > Course notes and revision). Not mirrored to the work site.
- 2026-11-17: Sam called it done for now. Possible later: an IB Economics version (likely its own data and folder or a subject switch; decide with Sam then).
- The IBO PDF and Kognity glossary in this folder are copyrighted: excluded in `.git/info/exclude`, never commit them.

## Data model the page expects

Inside `index.html` there is a clearly marked data block:

```js
const UNITS = {1:"Unit 1: ...", 2:"...", 3:"...", 4:"...", 5:"..."};
const DEFS = [
  {term:"Break-even point", unit:5, topic:"5.5 Break-even analysis",
   p:["the level of output at which total revenue equals total costs,",
      "so the business makes neither a profit nor a loss."]},
  ...
];
```

- `term`: the word or phrase being defined.
- `unit`: number 1 to 5 (matches the IB BM guide units: 1 Introduction, 2 HRM, 3 Finance and accounts, 4 Marketing, 5 Operations).
- `topic`: the subtopic label shown on the picker chips, in the form "5.5 Break-even analysis". The subtopic numbers and names must match the IB Business Management guide.
- `p`: array of 2 or 3 strings. Term plus the parts, joined with spaces, must read as one grammatical 2-mark definition. Part one is normally the genus (what kind of thing it is), part two is the distinguishing detail. Keep parts roughly balanced in length so length does not give away the order.

## Task 1: replace the seed data with Sam's list

1. Read `all.json` and describe its structure.
2. Map every entry to the schema above.
3. Classify each term into the correct unit and subtopic using the IB Business Management guide. HL-only content may be tagged `hl:true` as an optional extra field; if you add it, add an HL filter to the picker.
4. Split each definition into 2 parts (3 only when the definition naturally has three elements). Do not rewrite Sam's wording beyond the split point and the lowercase start of part one. If a definition is a single short clause that cannot honestly be split into two marks, keep it in a list called `UNSPLIT` and tell Sam instead of forcing it.
5. Keep the source data separate from the page: write the cleaned result to `data/defs.json` and generate the `DEFS` block in `index.html` from it with a small script (`build.mjs` or similar), so Sam can edit the JSON and rebuild. Never hand-edit a generated block.
6. Flag duplicates, near-duplicates, terms with no clear subtopic, and definitions that look wrong against the IB guide. Do not silently fix content.
7. Report counts per unit and per subtopic.

## Task 2: polish and test

- Check on a phone-sized viewport with touch emulation. Dragging uses Pointer Events with `touch-action:none` on the tile; confirm that vertical page scrolling still works when the finger starts outside the tiles.
- Test drag with mouse and touch, the arrow buttons, a full round, and "Retry missed".
- Playwright with the local Chrome works for headless checks.
- Keep it one static page. No frameworks, no external requests, no tracking.

## Possible additions (only if Sam asks)

- Spaced repetition: remember missed terms in localStorage and surface them first next time. Use try/catch around storage.
- Pure term-to-definition matching mode as an easier warm-up.
- A teacher mode listing all definitions for a topic, for printing.

## Deployment

Sam's personal site is `samsmasm.github.io`, served at `unisam.nz`. His work site is `ssis-sgraham.github.io`; tool folders from the personal site get mirrored there. Default plan unless Sam says otherwise: put the game in its own folder on the personal site at `/definitions/` (so it is served at `unisam.nz/definitions`), and follow the existing mirror workflow for the work site. Check how the other tool folders (such as `argmap`) are laid out and match them.

## Conventions

- Never use em dashes in any text, code comments, UI copy or commit messages.
- Student-facing copy is short, plain and friendly. No AO labels on the UI.
- Sam wants to steer. Do not ask him questions or propose new directions mid-task; make the sensible call, state it in one line, and carry on. Comment on pedagogy only where it clearly matters, and he has the final say on what suits his students.
- Keep the UI low in text, large touch targets, readable font. Dyslexia-friendly choices are welcome (clear sans-serif, generous spacing).
- Report back briefly: what changed, counts, anything flagged.
