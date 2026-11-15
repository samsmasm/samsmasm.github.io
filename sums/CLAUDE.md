# Sums, `/sums`

Arithmetic drill for Sam's daughter, written by finger or stylus on a touch screen. Built 2026-11-15. Handwriting is read **on the device** by a small neural network: no API, no network calls, works offline once loaded.

## Sam's spec
- Settings: signs (+ − × ÷, any mix), digits in the first number (1 to 4), digits in the second number (1 to 4), number of questions 6 / 12 / 20. Saved in localStorage `sums-settings`; first visit opens Settings.
- Grid layout that follows rotation: portrait 2/3/4 columns for 6/12/20, landscape 3/4/5, phones in portrait always 2 (scrolls).
- **Override** (reworked by Sam the same day): a wrong card offers only "Try again", because she can't know she was right until she has the right answer (the answer is never shown). When a later try is marked right, the card shows "first read N" and an "I was right the first time" button. Tapping it counts the card as right first time (Sam trusts her judgement over the reader); otherwise it counts as right on the later try. Tapping it after the sheet is finished also updates the saved history entry's first-try count.
- The header button is **Start again** (not "Settings", Sam's wording): it opens the choices panel, whose button is **Start**.
- Minimal, black and white, not distracting. Deliberately does NOT follow AESTHETIC.md (no masthead, no logo). Only colour: dark green tick / dark red cross borders.

## Layout (Sam, 2026-11-15, second round)
- **+ − ×** are stacked like written sums: space at the top for carrying, first number over the second, sign on the left, right-aligned, a line under them. She writes the answer under the line. Long multiplication (× a 2+ digit number) gets more room under the line.
- **÷** is a long-division bracket in the middle of the card: divisor `)` dividend with a bar over the dividend (SVG curve + border-top). She writes the answer on top of the bar; working goes underneath.
- Each card is one writing surface (`.work` with the canvas over the printed question). Strokes are stored relative to an anchor (right end of the answer line, or of the division bar) in units of the printed font size, so writing stays lined up with the digits when the screen rotates.
- **Only the answer is read** (`answerStrokes`): strokes centred below the line (above the bar for ÷); ruled lines she draws are ignored; if there are several rows (long multiplication), only the bottom row counts. Try again removes only those answer strokes and keeps her working. Undo removes the last stroke.

## Players and records (Sam: "like on Typurr")
- Header button with the current player's name opens the Who panel: Everyone (guest) plus named players, one tap to switch, Add, and a two-tap Remove (deletes their records).
- A sheet counts when every card is right (overrides included). Time runs from her first stroke on the sheet to the mark that makes it all right. The header shows the time and "New best!" or the best.
- Records are per player and per combination of settings (`comboKey`: signs in + − × ÷ order | digits a | digits b | count): best time and times done, plus the last 100 sheets (date, time, first-try score). localStorage: `sums-players`, `sums-current`, `sums-rec-<id>` = `{ best: {key: {ms, count, t}}, history: [...] }`. Settings stay shared by everyone.
- No running clock on screen (kept calm); time shows only at the end.

## Behaviour
- Answers are always whole numbers 0 or more: takeaways put the bigger number first, divisions are generated as divisor × quotient so they are exact. 1-digit numbers are 1 to 9 for + and −, 2 to 9 for × and ÷ (no ×1, ÷1). If the first number can't have its digit count for division (e.g. 1-digit ÷ 2-digit), it falls back to a small quotient.
- After a 0.5 s pause the reader shows what it read in grey under the card. **Mark** marks every card that has writing; blank cards are skipped.
- Wrong: ✗, the reading stays visible, pad locks, buttons "Try again" (clears, reopens) and "I wrote it right". Score is "First try n/N": only the first marking counts (an override on the first marking counts as first try right). When all are right, Mark becomes "New sheet".
- Palm rejection: once a stylus (`pointerType 'pen'`) is used, finger touches are ignored on pads.
- Strokes are stored in units of the pad height, so they rescale on rotation (ResizeObserver).

## Files
- `index.html`: page, inline CSS/JS. Globals usable in tests: `settings`, `cards`, `makeQ`, `layout`, `sizeCanvas`, `buildSheet`, `mark`, `draw`, `read`, `answerStrokes`, `current`, `sheetStart`.
- `digits.js`: the reader. `readNumber(strokes, unit)` splits strokes into digits (groups strokes whose x-ranges overlap a lot, or a thin stroke standing inside a wider one, e.g. a 4's down stroke), renders each group MNIST-style (20 px box, centre of mass at 14,14, anti-aliased, stroke radius 1.25 px) and runs the CNN in plain JS.
- `model.js`: int8 weights (~80 KB), `window.SUMS_MODEL`. CNN: conv16/conv32/conv64 (3×3, relu, maxpool) → fc64 → fc10.
- `train/train.py`: retrains on MNIST with augmentation (rotation, shear, width squash, thickness). Needs torch (installed with `pip install --target <dir> torch --index-url https://download.pytorch.org/whl/cpu`, run with `PYTHONPATH=<dir>`) and the four MNIST .gz files in `mnist/` next to it. `python3 train.py ../model.js`. Last run: 99.4% on MNIST test. `train/tojson.py ../test/mnist_sample.json` makes the parity sample (gitignored).
- `test/run.sh`: node reader tests (synthetic pen strokes for every digit, multi-digit splitting, JS = PyTorch parity if the sample exists) then headless-Chrome page tests. `SUMS_SHOTS=<dir>` saves screenshots. Run before committing.

## Known limits / ideas not built
- Synthetic tests are neater than a child's writing; real accuracy is unknown until she uses it. If a digit is misread a lot, collect her strokes and fine-tune (would need a "save sample" mode).
- Digits written touching or overlapping a lot can merge into one.
- Not linked from any index; `noindex`.
