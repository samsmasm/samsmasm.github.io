# Sums, `/sums`

Arithmetic drill for Sam's daughter, written by finger or stylus on a touch screen. Built 2026-11-15. Handwriting is read **on the device** by a small neural network: no API, no network calls, works offline once loaded.

## Sam's spec
- Settings: signs (+ − × ÷, any mix), digits in the first number (1 to 4), digits in the second number (1 to 4), number of questions 6 / 12 / 20. Saved in localStorage `sums-settings`; first visit opens Settings.
- Grid layout that follows rotation: portrait 2/3/4 columns for 6/12/20, landscape 3/4/5, phones in portrait always 2 (scrolls).
- **Override**: when a card is marked wrong she can press "I wrote it right" and it counts as right (Sam trusts her judgement over the reader). The card then says "misread".
- Minimal, black and white, not distracting. Deliberately does NOT follow AESTHETIC.md (no masthead, no logo). Only colour: dark green tick / dark red cross borders.

## Behaviour
- Answers are always whole numbers 0 or more: takeaways put the bigger number first, divisions are generated as divisor × quotient so they are exact. 1-digit numbers are 1 to 9 for + and −, 2 to 9 for × and ÷ (no ×1, ÷1). If the first number can't have its digit count for division (e.g. 1-digit ÷ 2-digit), it falls back to a small quotient.
- Each card: question, a writing pad, foot line. After a 0.5 s pause the reader shows what it read in grey. **Mark** marks every card that has writing; blank cards are skipped.
- Wrong: ✗, the reading stays visible, pad locks, buttons "Try again" (clears, reopens) and "I wrote it right". Score is "First try n/N": only the first marking counts (an override on the first marking counts as first try right). When all are right, Mark becomes "New sheet".
- Palm rejection: once a stylus (`pointerType 'pen'`) is used, finger touches are ignored on pads.
- Strokes are stored in units of the pad height, so they rescale on rotation (ResizeObserver).

## Files
- `index.html`: page, inline CSS/JS. Globals usable in tests: `settings`, `cards`, `makeQ`, `buildSheet`, `mark`, `draw`, `openSettings`.
- `digits.js`: the reader. `readNumber(strokes, unit)` splits strokes into digits (groups strokes whose x-ranges overlap a lot, or a thin stroke standing inside a wider one, e.g. a 4's down stroke), renders each group MNIST-style (20 px box, centre of mass at 14,14, anti-aliased, stroke radius 1.25 px) and runs the CNN in plain JS.
- `model.js`: int8 weights (~80 KB), `window.SUMS_MODEL`. CNN: conv16/conv32/conv64 (3×3, relu, maxpool) → fc64 → fc10.
- `train/train.py`: retrains on MNIST with augmentation (rotation, shear, width squash, thickness). Needs torch (installed with `pip install --target <dir> torch --index-url https://download.pytorch.org/whl/cpu`, run with `PYTHONPATH=<dir>`) and the four MNIST .gz files in `mnist/` next to it. `python3 train.py ../model.js`. Last run: 99.4% on MNIST test. `train/tojson.py ../test/mnist_sample.json` makes the parity sample (gitignored).
- `test/run.sh`: node reader tests (synthetic pen strokes for every digit, multi-digit splitting, JS = PyTorch parity if the sample exists) then headless-Chrome page tests. `SUMS_SHOTS=<dir>` saves screenshots. Run before committing.

## Known limits / ideas not built
- Synthetic tests are neater than a child's writing; real accuracy is unknown until she uses it. If a digit is misread a lot, collect her strokes and fine-tune (would need a "save sample" mode).
- Digits written touching or overlapping a lot can merge into one.
- Not linked from any index; `noindex`.
