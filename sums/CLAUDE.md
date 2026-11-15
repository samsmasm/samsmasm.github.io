# Sums, `/sums`

Maths practice for Sam's two daughters, written by finger or stylus on a touch screen. Built 2026-11-15. Handwriting is read **on the device** by a small neural network: no API, no network calls, works offline once loaded. Not linked from any index; `noindex`.

**Users.** A 5-year-old in US-style kindergarten who **can't read yet** (pictures, numbers and spoken prompts only, never written questions she must read) and a nearly-8-year-old in grade 2 working above level (she found the first age-8 set straightforward, so newer age-8 defaults lean harder). Sam wants them free to explore: the girls change their own settings, nothing is locked.

**Before committing:** run `test/run.sh` (all must pass; questions are random, so run it twice after layout changes). Update `tracker/projects.md` and run `python3 tracker/publish.py` (see the repo CLAUDE.md).

## Flow
1. **Names** (opening screen): big name tiles, Everyone, "+ Add a name". Switching names clears the current sheet or grid, so nobody lands on someone else's.
2. **Age**: "How old are you?" with cake tiles (5 or 8 candles), read aloud. A named player is asked once and the age is saved on the player (names from before ages existed are asked on first tap); **Everyone** is asked every time, so ages never mix. `AGES = [5, 8]` (6 and 7 to come; store the age, not a grade).
3. **Home**: "What do you want to do today?" activity tiles for that age (picture, name, best time for her current settings). Age 5: read aloud on arrival. Header: ‹ Names, speaker, "Name · age", Records.
4. Tapping an activity **with choices opens its setup page first** (Sam: ask every time), with that player's own last choices selected; title "Name · Activity"; at age 5 it says "Choose, then press Start." Activities with no choices (Make 10, Teen numbers) go straight to the sheet. Back on a setup returns where she came from (home, or her sheet/grid via Start again).
5. **Sheet** (cards) or **grid** (Times grid): header ‹ Home, Start again (that activity's setup), speaker (repeats the question), score, Mark. At age 5 the question is spoken when the sheet opens.
6. **Records** page: change age (cakes), best times and recent sheets for every activity, Remove.

## Activities (`ACTS` in index.html)
Each has `name`, `ages`, `setup` kind, `say` (spoken prompt), `pic` (tile SVG), `defaults(age)`, `make(cfg)` → question (`kind` + `ans`), `key(cfg)` / `label(key)` for records; optional `options`, `blocked(cfg)` (warning text that turns Start off), `grid`, `noCount`.

**Age 5**
- **Sums** (also age 8): stacked + − ×, long-division ÷, keypad setup. Age 5 default: + only, 0–5 and 0–5, 6 questions.
- **How many?**: ten frame(s), dots filled in order (top row left to right). Up to 5 / 10 / 20 (20 = two frames, first full). No line under ten frames (Sam removed it); she writes anywhere below.
- **Number bonds**: whole circle on top joined to two part circles; one is empty (`.hole`) and she writes **inside it** (stroke centre within 1.9 em of the circle centre; radius 1 em). Up to 5 / 10 / 20. A part of 0 only about 1 card in 10.
- **Teen numbers**: 11–19 as a full ten frame plus a second frame with 1–9 dots.
- **Make 10**: one ten frame, 1–9 dots, empty spaces as dashed circles; answer = 10 − dots.
- **Read aloud**: every card has a speaker in its foot (`cardSay`: "3 plus 4", "3 and 4 make what?", "7 is 3 and what?"; frames use the activity's prompt). Age 5 only.

**Age 8**
- **Sums**: age 8 default + − ×, 10–99 and 0–9, 12 questions. The old one-device `sums-settings` (from before names) is **never** used: carrying it over once gave the 8-year-old her sister's single digits (Sam hit this).
- **Missing number**: `7 + ☐ = 12` with "☐ = ___" underneath. Hides the first or second number; never an equation where any number works (0 × ☐ = 0, 0 ÷ ☐). The line length comes from the longest number shown, so it gives no hint. Keypad setup.
- **Arrays**: r rows × c columns of dots, write the total. `grid` setup: the two keypads relabelled Rows / Columns, signs and "bigger" hidden; only 0 chosen → warning, Start off. Default rows 2–5, columns 2–9.
- **Place value**: kinds Blocks (base-ten, true proportions: hundreds squares 3 a row, tens sticks, ones cubes 3 a row; `PV_EM` sets the size), 300 + 40 + 7 (zero parts left out, shuffled about a third of the time so she can't just copy digits), 10 more / 10 less (amounts 1, 10, 100; never below 0 or above the max). Up to 99 or 999.
- **Number lines**: 10 steps, only the two ends labelled, an arrow at tick 1–9; she works out the step. Counting in 1s / 2s / 5s / 10s / 100s.
- **Area**: kinds Count squares (grid, sides ≤ 10), Area (side lengths only), Perimeter, Missing side (caption "Area 36", "?" on a side). Sides up to 5 / 10 / 12. A caption above the rectangle says what to find; rectangle to proportion (`areaSvg`).
- **Times bonds**: number bonds for multiplication (product on top, factors below, one empty; a missing factor is a division). Tables 2–12, up to × 10 or × 12. Reuses the `bond` card.
- **Fractions**: a bar or circle cut into d equal parts with n shaded (bars sometimes shade scattered parts), or a 0-to-1 number line cut into d with an arrow. Parts 2,3,4,5,6,8,10,12 (default 2,3,4,6,8). Top number above a short printed bar, bottom number below (`fracParts`; marks on the picture are ignored). **Equal fractions count** (2/4 for 1/2). Reading shows "3/4", or "3/?" if one is missing.
- **Times grid** (Sam's design): its own screen (`#gridS`, `startGrid`), not cards. 1..N across and down, only the triangle row ≤ column (6 × 7 = 7 × 6 is one cell; diagonal included). A number appears on a tile; she **drags** it to its cell (or taps the cell). Any empty cell with that product counts (12 fits 2 × 6, 3 × 4, 1 × 12). Wrong cell: red flash, tile goes back, no longer first try. While dragging, the row and column headers light up. Cells outside her tables are grey and never asked. Choices: tables 1–12 (default 2–12), 10 × 10 or 12 × 12, numbers 12 / 24 / whole grid (`noCount`: no Questions row, no examples). Mark is hidden while playing and becomes "New grid" at the end. Cell size fills the screen (`sizeGrid`, on resize).

**Both ages (built by NZ curriculum year, see `CURRICULUM.md`)**
- **Clocks**: option **Year** 1 o'clock (write the hour before a printed "o'clock"), 2 half and quarter hours, 3 to 5 minutes (minute ticks on the face), 4 any minute; **Kind** Clock (face) or Words ("quarter to 5", "17 minutes past 7", Year 2 up; Year 1 always shows a face). Year 2 up writes `__ : __`. Numbers sit over the hands with a white edge so no hand hides one. 3:05 is right written as 05 or 5. Age 5 default Year 1 face, age 8 Year 3 both.
- **Money**: NZ coins drawn to real size (gold $1 $2 grey), notes as labelled rectangles. **Year** 1 whole dollars to $10 ($1 $2 coins, $5 $10 notes, 1–3 of them), 2 coins only or notes only (often a group of like ones; cents to 100c, dollars to $100), 3 dollars and cents together (`$ __ and __ c`, no decimal point, sometimes out of order); **Kind** How much? or Change (price tag "costs" and the note "you pay"; Year 3 prices have cents). Age 5 default Year 1 how much, age 8 Year 3 both.
- **Add and take away** / **Times and divide** (Sam: Sums split into year modes, the original **Sums** keypad tile kept as it was, records and all). **Year** sets the numbers, **Signs** picks + − or × ÷. Years 1–2 print across (`expr`: "7 + 5" then "= ___", read aloud "7 plus 5"); Years 3–4 stacked or long division (column methods start in Year 3). Add/take away: Year 1 within 20 (and 10 + n), 2 facts to 20 and within 100 (32 + 2, 32 + 20), 3 three digits within 1,000, 4 four digits. Times/divide: Year 1 2s 5s 10s to 20, 2 those tables to × 10, 3 adds 3s 4s 8s and 2-digit × 1-digit, 4 all tables 2–10 and up to 3-digit × or ÷ 1-digit; division always exact. `addSubQ`, `mulDivQ`, `asQ`.
- **Number patterns** (`seq` card, laid out like Missing number: one term is a box, then "☐ = ___"): five terms, sometimes counting back. Year 1 in 1s (to 30), 2s, 10s; Year 2 1s across 100 to 120, 2s, 3s, 5s, 10s; Year 3 2s 3s 4s 5s 8s from multiples, 10s and 100s to 1,000, and growing patterns (add 3 to 12 each time). Year 1 hides the last term most of the time. Read aloud "4, 5, 6, 7, what?".
- **Doubles and halves**: Year 1 to 10 with dots (`dpic`: n dots, a dashed middle line, then n empty spaces for a double, or 2n dots split for a half; answer anywhere below), Year 2 to 20, Year 3 tens and two-digit numbers (double 35, half of 70). Kind Double / Half.
- **Story sums** (`story` card: wrapped words, then "___ fish"): animal stories (Ty the cat, a dog, a squirrel...), "It" in the second sentence. Year 1 add, take away, bags of, shared by, within 20; Year 2 adds how many more (compare and need) and two steps within 20, within 100; Year 3 within 1,000, two steps within 100, 3s 4s 8s too. Kind + − / × ÷. Each card reads its story aloud. Default 6 questions.
- **Graphs** (Sam: very simple pictures, block colours only where they add value). Categories are block colours (`BLOCK`), shown as coloured squares, never words, so a non-reader can match them; the question is read aloud by colour name ("How many red?"). Year 1 picture graph (3 rows of dots to 8, "how many ■?"), Year 2 tally chart (to 20) or picture graph, 4 colours, adds "how many more ■ than ■?", Year 3 bar graph with a scale in 2s, 5s or 10s and light grid lines, adds "how many altogether?". Counts in one graph are all different. Rows, not columns, so the picture suits the card shape.
- **Shapes**: one block colour with an ink outline. Count sides or corners: Year 1 triangles, squares, rectangles (sometimes turned); Year 2 up to 6 sides (regular or irregular, `irregular` keeps them convex with clear corners) and 3D (cube, cuboid, square pyramid, triangular prism; hidden edges dashed) faces or corners; Year 3 up to 10 sides (7 up always regular), 3D edges too, and lines of symmetry (square, rectangle, isosceles, regular 3/5/6/8). Kind Flat / 3D. `fitPts` keeps every shape inside its box.
- **Rulers**: a plain coloured pencil with a wood tip, dashed guides down from both ends. Year 1 counts alternating blue/white blocks (10 blocks, pencil 2–9), Year 2 a 10 cm ruler from 0, Year 3 a 12 cm ruler with half-cm marks and the pencil often not starting at 0. Question "How long?", unit after the line ("blocks" / "cm"). Rulers are short so the numbers are big enough to read on a card.
- Graphs, Shapes and Rulers print as `pic2`: the question, the picture, then "___" (2.5 em, the same whatever the answer) and a unit.
- **Two blanks** (`q.two`, `q.parts`): Clocks Year 2 up and Money Year 3. Strokes are anchored at the middle of the ":" or "and" on the lines; `twoParts` splits left / right of it and ignores writing more than 2.4 em up (on the clock or coins). Shown as "3:05" or "$2 and 50c".

Questions can carry their own spoken words in `q.say`; `cardSay` uses it first. Also suggested, not built: rounding, breaking numbers apart (7 × 14 = 7 × 10 + 7 × ☐), patterns, rulers, bar models.

## The sheet (plain, like a paper printout; Sam likes it, keep it that way)
- Grid of cards follows rotation: portrait 2/3/4 columns for 6/12/20, landscape 3/4/5, phones in portrait always 2 (scrolls).
- `qMarkup(q)` prints each question; `--h` / `--c` (height and width in em) set the font size to fit the card. Layouts: `col` (stacked + − ×: carry space on top, sign left, line under), `div` (long-division bracket in the middle, answer on the bar), `miss` (a line of text, then "= ___"; also used by `expr` cards), `bond`, `frac`, `pic2` (clocks and money: picture, then blanks; `qMarkup` can name its own `anchor`), and `frame` (any picture on top, answer anywhere below: ten frames, arrays, blocks, number lines, area).
- Each card is one writing surface (`.work`, canvas over the printed question). Strokes are stored relative to an **anchor** in units of the printed font size, so writing stays lined up after rotation: `.rule` (col), `.dd` top (div), `.wl` (miss/expr), centre of `.hole` (bond), `.fbar` (frac), bottom of the picture (frame).
- **Which writing is the answer** (`answerStrokes` + `inZone`): below the line (col, frame), above the bar (div), inside the empty circle (bond), everything (miss/expr, so an answer on the line, in the box or a bit low all count), above/below the bar (frac). Ruled lines she draws are ignored; several rows → the bottom row. If a card has writing but none in its answer place, all her writing is read instead of skipping the card.
- `readAnswer(c)` reads and checks every card (`{ text, ok, backwards }`); fractions compare n·D = N·d.
- After a 0.5 s pause the reading shows in big grey text (26 px, Sam) under the card.
- **Mark marks every card with anything written on it, in one press** (Sam): 4 of 12 done → those 4 marked, clock keeps going; the sheet finishes when all are right.
- **Wrong** (Sam): only "Try again" (clears the answer, keeps working); the answer is never shown. When a later try is right, the card shows "first read N" and **I was right the first time**, which counts it as first try right (and updates the saved history if the sheet is already finished).
- **Backwards digits**: the reader has 17 classes, 0–9 plus BACKWARDS 2 3 4 5 6 7 9, because a flip check can't tell a backwards 5 from a real 2 (tested: same confidence). A backwards digit still counts; the card shows it mirrored next to the right way round, and at age 5 it is said ("Watch out, your 3 is backwards"). Sam briefly floated a "receptive" version (choose which way round is right) and dropped it.
- Palm rejection once a stylus is used. Undo removes the last stroke.
- Look: black and white; only colour is dark green / dark red card borders (and grey fraction shading). Not AESTHETIC.md. The front screens can be more designed than the sheet (Sam).

## Setup page (Start again)
- `keypad` (Sums, Missing number): laid out like a sum. First number's calculator keypad (7 8 9 / 4 5 6 / 1 2 3 / 0 All) on top; signs left of the second keypad; "10–99 / 100–999 / 1000–9999" beside each; a line; Questions 6/12/20 and Start. Tap to toggle digits, drag across keys to set many, at least one stays on; a key after 10–99 starts a fresh pick. Default 0–9. ÷: divide by the second number (0 skipped), the answer comes from the first number's picks; only 0 to divide by → warning, Start off if ÷ is the only sign.
- `grid` (Arrays): the same keypads as Rows / Columns.
- `opts` (How many?, Number bonds, Place value, Number lines, Area, Times bonds, Fractions, Clocks, Money, and the year-set ones, Times grid): rows of buttons built from the activity's `options` (`[{key, label, values, multi}]`); multi rows keep at least one on.
- `none` (Make 10, Teen numbers): no setup page.
- "Like these": four sample questions in the printed style, tap for more. Back without Start discards changes.

## Players, settings, records
- localStorage: `sums-players` = `[{id, name, age}]`; settings per player per activity `sums-cfg-<id>-<act>` (Everyone: `sums-cfg-guest-<age>-<act>`); records `sums-rec-<id>` = `{ best: {key: {ms, count, t}}, history: [{k, ms, first, n, t}] }` (last 100).
- Record keys: Sums keeps its original format with no prefix (`+-|2|1:0123456789|12`: signs | first | second | count, keypad line = `1:` + digits) so old records still count; all others are `<act>~...` (see each `key`). `labelFor(key)` names them.
- A sheet or grid counts when everything is right. Time runs from her first stroke (or first drag) to the end; the header shows the time and "New best!" or the best. No running clock.
- **Remove** is double-click proof (Sam): the first tap turns it into "Keep <name>" and the real confirm appears at the top of the page, ignoring taps for 0.5 s. Removes the player, records and settings.

## Adding an activity
1. Add an entry to `ACTS` (ages, setup kind, options, defaults, make, key, label, pic, say). Use an existing card `kind` if one fits.
2. A new card kind needs: a `qMarkup` branch (with `--h` / `--c`), its anchor in `layout`, and a rule in `inZone` (or its own reader in `readAnswer`, as fractions do).
3. Add browser tests (questions correct, cards fit with room to write, answers written in place are read and marked right, record label), and check screenshots in portrait, landscape and phone.

## Years instead of ages (planned)
`CURRICULUM.md` lists the NZ Years 1–4 maths curriculum with Sums activities marked. `mock/` (unisam.nz/sums/mock/, not wired to the real page) is the agreed direction: home shows her year's tiles, each tile has steps for the years that skill has (go up or down one skill without changing year), a Keep going row, and a Map page with skills down and years across. `mock/pics.json` holds the tile pictures, dumped from `ACTS` with headless Chrome; refresh it after adding an activity.

## Files
- `index.html`: everything, inline CSS/JS. Globals used by tests: `ACTS`, `makeQ`, `cards`, `buildSheet`, `layout`, `sizeCanvas`, `draw`, `read`, `readAnswer`, `answerStrokes`, `loadCfg`, `loadRec`, `labelFor`, `draft`, `players`, `current`, `act`, `sheetStart`, `goNames`, `G`, `startGrid`, `dropOn`.
- `digits.js`: the reader. `readNumber(strokes, unit)` splits strokes into digits (x-overlap grouping, or a thin stroke inside a wider one such as a 4's down stroke), renders each MNIST-style (20 px box, centre of mass at 14,14, stroke radius 1.25 px), runs the CNN in plain JS, and returns `{ text, digits, backwards }`.
- `model.js`: int8 weights (~80 KB). CNN conv16/conv32/conv64 (3×3, relu, maxpool) → fc64 → fc17. `digits.js` reads the class count from the weights, so a 10-class model still works.
- `train/train.py`: retrains on MNIST with augmentation, mirroring a quarter of each batch into the backwards classes. Needs torch (`pip install --target <dir> torch --index-url https://download.pytorch.org/whl/cpu`, run with `PYTHONPATH=<dir>`) and the MNIST .gz files in `train/mnist/` (gitignored). `python3 train.py <out.js>` (~10 min on CPU). Last run (2026-11-15): 99.2% digits, 98.3% backwards digits. `train/tojson.py ../test/mnist_sample.json` makes the parity sample (gitignored).
- `test/run.sh`: node reader tests (synthetic pen strokes, backwards digits, splitting, JS = PyTorch parity), then headless-Chrome tests of every screen and activity (speech stubbed and checked). `SUMS_SHOTS=<dir>` saves screenshots.

## Known limits
- Synthetic tests are neater than a child's writing; real accuracy is unknown until they use it on the tablet. If a digit is misread a lot, a "save sample" mode could collect their strokes to fine-tune.
- Digits written touching or overlapping a lot can merge into one.
- Speech uses the device's built-in voice (speechSynthesis); quality varies by tablet.
- The page doesn't update itself while open: reload after each change (Sam saw old behaviour from an unrefreshed tab).
