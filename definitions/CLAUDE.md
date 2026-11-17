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

## Status (2026-11-17): trial with 2.7 only

- Live trial at `/definitions/` with the 15 terms of 2.7 Industrial/employee relations (Sam approved this vocab). The old 34-seed prototype never existed in this folder; `index.html` was built fresh.
- Source of the split: `element1` / `element2` in the vault's `all.json` (already split, so no re-splitting needed). Only change: lowercase first letter of part one. All 15 tagged `hl: true`; no HL filter yet because every term is HL.
- Tiles drop trailing commas and full stops so punctuation does not give the order away; the full definition after Check keeps them, with an amber bar at the split point.
- Build: `node definitions/build.mjs` (validates, rejects em dashes). Tests: `bash definitions/test/run.sh` (29 checks: arrows, mouse drag, touch drag, page scroll outside tiles, full round, retry missed). `DD_SHOTS=<dir>` saves screenshots.
- Not linked from any index or mirrored to the work site yet.
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
