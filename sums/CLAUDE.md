# Sums, `/sums`

Maths practice for Sam's two daughters, written by finger or stylus on a touch screen. Built 2026-11-15. Handwriting is read **on the device** by a small neural network: no API, no network calls, works offline once loaded.

Users: a 5-year-old in US-style kindergarten who **can't read yet** (pictures, numbers and spoken prompts only, never written questions she must read) and a nearly-8-year-old in grade 2 working above level. Sam wants them free to explore: the girls change their own settings, nothing is locked.

## Flow (2026-11-15, step 1 of Sam's plan)
1. **Names** (opening screen): big name tiles, Everyone, "+ Add a name".
2. **Age**: "How old are you?" with cake tiles (5 or 8 candles, read aloud). A named player is asked once (old names without an age get asked on first tap) and the age is saved on the player; **Everyone** is asked every time, so ages never mix. Ages offered: `AGES = [5, 8]` (6 and 7 to come; store the age, not a grade).
3. **Home**: "What do you want to do today?" activity tiles for that age (picture, name, best time for her current settings). Age 5: read aloud on arrival. Header: ‹ Names, speaker, "Name · age", Records.
4. **Sheet**: header ‹ Home, Start again (that activity's setup), speaker (repeats the question), score, Mark. At age 5 the question is spoken when the sheet opens.
5. **Records** page: change age (cakes), best times and recent sheets for all activities, Remove (double-click proof, below).

## Activities (`ACTS` in index.html)
Each has `ages`, `defaults(age)`, `make(cfg)` → question, `setup` kind, `say` (spoken prompt), `pic` (tile SVG), `key(cfg)` / `label(key)` for records.
- **Sums** (5 and 8): stacked + − ×, long-division ÷, keypad setup. Defaults: age 5 = + only, 0–5 and 0–5, 6 questions; age 8 = + − ×, 10–99 and 0–9, 12 (or the old global `sums-settings` if she had one).
- **Missing number** (8): `7 + ☐ = 12` with "☐ = ___" underneath. Hides first or second number; never an equation where any number works (0 × ☐ = 0, 0 ÷ ☐). She can write on the line or in the box in the sum (both read; bottom row wins). The line length comes from the longest number shown, not the answer, so it gives no hint. Keypad setup.
- **How many?** (5): ten frame(s) with dots filled in order (top row left to right); "up to" 5 / 10 / 20 (20 = two frames, first full). Answer under the line.
- **Make 10** (5): one ten frame, 1–9 dots, the empty spaces drawn as dashed circles; answer = 10 − dots.
Ideas agreed for later (Sam liked all): number bonds, teen numbers, read every card aloud, backwards-digit check (age 5); arrays, place value, number lines, then clocks and coins, then word problems (age 8).

## The sheet (unchanged look: plain, like a paper printout; Sam likes it)
- Grid follows rotation: portrait 2/3/4 columns for 6/12/20, landscape 3/4/5, phones in portrait always 2 (scrolls).
- **+ − ×** stacked like written sums: carry space on top, sign left, right-aligned, line under; answer under the line. Long multiplication gets more room. **÷** long-division bracket in the middle; answer on the bar, working underneath.
- Each card is one writing surface (`.work`, canvas over the printed question). Strokes are stored relative to an anchor (`.rule` / `.dd` / `.wl`) in units of the printed font size, so writing stays lined up after rotation.
- **Only the answer is read** (`answerStrokes` + `inZone(kind)`): below the line (col, frame), above the bar (div), anywhere above the answer line (miss). Ruled lines ignored; several rows → bottom row. Try again removes only those strokes; Undo the last stroke.
- After a 0.5 s pause the reading shows in grey. Mark marks every card with writing.
- **Wrong** (Sam): only "Try again"; the answer is never shown. When a later try is right, the card shows "first read N" and **I was right the first time**, which counts it as first try right (also updates the saved history if the sheet is already done).
- Palm rejection once a stylus is used.
- Look: black and white, only colour dark green / dark red card borders. Not AESTHETIC.md. The front screens can be more designed than the sheet (Sam).

## Setup page (Start again)
- Keypad kind (Sums, Missing number): laid out like a sum. First number's calculator keypad (7 8 9 / 4 5 6 / 1 2 3 / 0 All) on top; signs left of the second keypad; "10–99 / 100–999 / 1000–9999" beside each; a line; Questions 6/12/20 and Start. Tap to toggle digits, drag to set many, at least one stays on; a key after 10–99 starts a fresh pick. Default 0–9.
- ÷ with keypads: divide by the second number (0 skipped), the answer comes from the first number's picks. Only 0 to divide by: warning, Start off if ÷ is the only sign.
- How many?: "Up to" 5/10/20. Make 10: questions only.
- "Like these": four sample questions in the printed style (`qMarkup`), tap for more. Back without Start discards changes.

## Players, settings, records
- localStorage: `sums-players` = `[{id, name, age}]`; settings per player per activity `sums-cfg-<id>-<act>` (Everyone: `sums-cfg-guest-<age>-<act>`); records `sums-rec-<id>` = `{ best: {key: {ms, count, t}}, history: [{k, ms, first, n, t}] }` (last 100).
- Record keys: Sums keeps the original format with no prefix (`+-|2|1:0123456789|12`, signs | first | second | count, keypad line = `1:` + digits) so old records still count; others are `missing~<same>`, `howmany~<max>|<n>`, `make10~<n>`. `labelFor(key)` names them.
- A sheet counts when every card is right. Time runs from the first stroke to the mark that makes it all right; header shows time and "New best!" or the best. No running clock.
- **Remove** is double-click proof (Sam): the first tap turns it into "Keep <name>" and the real confirm appears at the top of the page, ignoring taps for 0.5 s. Removes the player, records and settings.

## Files
- `index.html`: everything, inline CSS/JS. Globals used by tests: `ACTS`, `makeQ`, `cards`, `buildSheet`, `layout`, `sizeCanvas`, `draw`, `read`, `answerStrokes`, `loadCfg`, `loadRec`, `labelFor`, `draft`, `players`, `current`, `act`, `sheetStart`, `goNames`.
- `digits.js`: the reader. `readNumber(strokes, unit)` splits strokes into digits (x-overlap grouping, or a thin stroke inside a wider one such as a 4's down stroke), renders each MNIST-style (20 px box, centre of mass at 14,14, stroke radius 1.25 px) and runs the CNN in plain JS.
- `model.js`: int8 weights (~80 KB). CNN conv16/conv32/conv64 (3×3, relu, maxpool) → fc64 → fc10.
- `train/train.py`: retrains on MNIST with augmentation. Needs torch (`pip install --target <dir> torch --index-url https://download.pytorch.org/whl/cpu`, run with `PYTHONPATH=<dir>`) and the MNIST .gz files in `train/mnist/`. Last run 99.4%. `train/tojson.py ../test/mnist_sample.json` makes the parity sample (gitignored).
- `test/run.sh`: node reader tests, then headless-Chrome tests of every screen and activity (speech is stubbed and checked). `SUMS_SHOTS=<dir>` saves screenshots. Run before committing.

## Known limits
- Synthetic tests are neater than a child's writing; real accuracy is unknown until they use it. If a digit is misread a lot, a "save sample" mode could collect their strokes to fine-tune.
- Digits written touching or overlapping a lot can merge into one.
- Speech uses the device's built-in voice (speechSynthesis); quality varies by tablet.
- Not linked from any index; `noindex`.
