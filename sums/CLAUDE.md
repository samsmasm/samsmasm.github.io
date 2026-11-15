# Sums, `/sums`

Maths practice for Sam's two daughters, written by finger or stylus on a touch screen. Built 2026-11-15. Handwriting is read **on the device** by a small neural network: no API, no network calls, works offline once loaded.

Users: a 5-year-old in US-style kindergarten who **can't read yet** (pictures, numbers and spoken prompts only, never written questions she must read) and a nearly-8-year-old in grade 2 working above level. Sam wants them free to explore: the girls change their own settings, nothing is locked.

## Flow (2026-11-15, steps 1 and 2 of Sam's plan done)
1. **Names** (opening screen): big name tiles, Everyone, "+ Add a name".
2. **Age**: "How old are you?" with cake tiles (5 or 8 candles, read aloud). A named player is asked once (old names without an age get asked on first tap) and the age is saved on the player; **Everyone** is asked every time, so ages never mix. Ages offered: `AGES = [5, 8]` (6 and 7 to come; store the age, not a grade).
3. **Home**: "What do you want to do today?" activity tiles for that age (picture, name, best time for her current settings). Age 5: read aloud on arrival. Header: ‹ Names, speaker, "Name · age", Records.
   Tapping an activity with choices (Sums, Missing number, How many?, Number bonds) opens its **setup page first** (Sam: ask every time), with that player's own last choices selected; title "Name · Activity"; at age 5 it says "Choose, then press Start." Activities with no choices (Make 10, Teen numbers) go straight to the sheet. Back on a setup goes to where she came from (home, or her sheet via Start again).
   Switching names clears the current sheet, so nobody lands on someone else's.
4. **Sheet**: header ‹ Home, Start again (that activity's setup), speaker (repeats the question), score, Mark. At age 5 the question is spoken when the sheet opens.
5. **Records** page: change age (cakes), best times and recent sheets for all activities, Remove (double-click proof, below).

## Activities (`ACTS` in index.html)
Each has `ages`, `defaults(age)`, `make(cfg)` → question, `setup` kind, `say` (spoken prompt), `pic` (tile SVG), `key(cfg)` / `label(key)` for records.
- **Sums** (5 and 8): stacked + − ×, long-division ÷, keypad setup. Defaults: age 5 = + only, 0–5 and 0–5, 6 questions; age 8 = + − ×, 10–99 and 0–9, 12. The old one-device `sums-settings` (from before names) is **never** used: it was briefly carried over to age-8 Sums and gave the 8-year-old her sister's single digits (Sam hit this).
- **Missing number** (8): `7 + ☐ = 12` with "☐ = ___" underneath. Hides first or second number; never an equation where any number works (0 × ☐ = 0, 0 ÷ ☐). She can write on the line or in the box in the sum (both read; bottom row wins). The line length comes from the longest number shown, not the answer, so it gives no hint. Keypad setup.
- **How many?** (5): ten frame(s) with dots filled in order (top row left to right); "up to" 5 / 10 / 20 (20 = two frames, first full). She writes anywhere below the frames: **no line** under ten frames (Sam removed it; the anchor is the bottom of the last frame).
- **Make 10** (5): one ten frame, 1–9 dots, the empty spaces drawn as dashed circles; answer = 10 − dots.
- **Number bonds** (5): whole circle on top joined to two part circles; one circle is empty (`.hole`) and she writes **inside it** (read if the stroke centre is within 1.9 em of the circle's centre; radius is 1 em). "Up to" 5/10/20. A part of 0 only about 1 card in 10.
- **Teen numbers** (5): 11–19 as a full ten frame plus a second frame with 1–9 dots.
- **Read every card aloud** (5): each card has a speaker button in its foot (`cardSay`: "3 plus 4", "3 and 4 make what?", "7 is 3 and what?"; frames use the activity's prompt). Not shown at age 8.
- **Backwards digits**: the reader has 17 classes, digits 0–9 plus BACKWARDS 2 3 4 5 6 7 9 (trained on mirrored MNIST, see train.py), because a plain flip check can't tell a backwards 5 from a real 2 (tested: same confidence). A backwards digit still counts as right; the card shows it mirrored next to the right way round, and at age 5 it is said ("Watch out, your 3 is backwards"). Tests: 420/420 synthetic backwards digits read and flagged, 0/600 normal digits flagged, a real 2 for 5 still wrong. Sam briefly floated a "receptive" version (choose which way round is right) and then dropped it; worth raising again only if he asks.
Ideas agreed for later (step 3, age 8): arrays, place value, number lines, then clocks and coins, then word problems.
- The reading under each card is big (26 px) so the girls can check it (Sam).

## The sheet (unchanged look: plain, like a paper printout; Sam likes it)
- Grid follows rotation: portrait 2/3/4 columns for 6/12/20, landscape 3/4/5, phones in portrait always 2 (scrolls).
- **+ − ×** stacked like written sums: carry space on top, sign left, right-aligned, line under; answer under the line. Long multiplication gets more room. **÷** long-division bracket in the middle; answer on the bar, working underneath.
- Each card is one writing surface (`.work`, canvas over the printed question). Strokes are stored relative to an anchor (`.rule` / `.dd` / `.wl`) in units of the printed font size, so writing stays lined up after rotation.
- **Only the answer is read** (`answerStrokes` + `inZone(kind)`): below the line (col, frame), above the bar (div), anywhere above the answer line (miss). Ruled lines ignored; several rows → bottom row. Try again removes only those strokes; Undo the last stroke.
- After a 0.5 s pause the reading shows in grey. **Mark marks every card with anything written on it, in one press** (Sam): 4 of 12 done → those 4 are marked and the clock keeps going; the sheet finishes when all are right. If a card has writing but none in its answer place, `answerStrokes` falls back to all her writing (bottom row) instead of skipping the card (skipped cards looked like Mark was going "one by one").
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
- Record keys: Sums keeps the original format with no prefix (`+-|2|1:0123456789|12`, signs | first | second | count, keypad line = `1:` + digits) so old records still count; others are `missing~<same>`, `howmany~<max>|<n>`, `bonds~<max>|<n>`, `teens~<n>`, `make10~<n>`. `labelFor(key)` names them.
- A sheet counts when every card is right. Time runs from the first stroke to the mark that makes it all right; header shows time and "New best!" or the best. No running clock.
- **Remove** is double-click proof (Sam): the first tap turns it into "Keep <name>" and the real confirm appears at the top of the page, ignoring taps for 0.5 s. Removes the player, records and settings.

## Files
- `index.html`: everything, inline CSS/JS. Globals used by tests: `ACTS`, `makeQ`, `cards`, `buildSheet`, `layout`, `sizeCanvas`, `draw`, `read`, `answerStrokes`, `loadCfg`, `loadRec`, `labelFor`, `draft`, `players`, `current`, `act`, `sheetStart`, `goNames`.
- `digits.js`: the reader. `readNumber(strokes, unit)` splits strokes into digits (x-overlap grouping, or a thin stroke inside a wider one such as a 4's down stroke), renders each MNIST-style (20 px box, centre of mass at 14,14, stroke radius 1.25 px) and runs the CNN in plain JS.
- `model.js`: int8 weights (~80 KB). CNN conv16/conv32/conv64 (3×3, relu, maxpool) → fc64 → fc17 (10 digits + 7 backwards digits). `digits.js` reads the class count from the weights, so a 10-class model still works.
- `train/train.py`: retrains on MNIST with augmentation, mirroring a quarter of each batch into the backwards classes. Needs torch (`pip install --target <dir> torch --index-url https://download.pytorch.org/whl/cpu`, run with `PYTHONPATH=<dir>`) and the MNIST .gz files in `train/mnist/` (gitignored). `python3 train.py <out.js>` (~10 min CPU). Last run (2026-11-15): 99.2% digits, 98.3% backwards digits. `train/tojson.py ../test/mnist_sample.json` makes the parity sample (gitignored).
- `test/run.sh`: node reader tests, then headless-Chrome tests of every screen and activity (speech is stubbed and checked). `SUMS_SHOTS=<dir>` saves screenshots. Run before committing.

## Known limits
- Synthetic tests are neater than a child's writing; real accuracy is unknown until they use it. If a digit is misread a lot, a "save sample" mode could collect their strokes to fine-tune.
- Digits written touching or overlapping a lot can merge into one.
- Speech uses the device's built-in voice (speechSynthesis); quality varies by tablet.
- Not linked from any index; `noindex`.
