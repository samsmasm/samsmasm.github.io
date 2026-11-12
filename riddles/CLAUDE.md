# Riddles, `/riddles`

Interactive probability riddles for Grade 9 and up (also IB Econ and BM). The full brief, with all twelve riddles, is in Sam's vault: `~/notes/Projects/Probability riddles/Probability riddles CLAUDE.md`. Read it before adding a riddle.

Every riddle runs the same five steps: Riddle, Guess, Watch, Describe ("what do you see?", not a second guess), Answer (guess next to truth, a few one-line reasons, optional calculation, then free play). Few words; the visuals do the work. Never praise or grade.

## Status (2026-11-12)

Built (8 of 12): `positive/` (ported from the vault prototype), `montyhall/`, `birthday/`, `simpson/`, then `streak/` (Due a tails, gambler's fallacy), `galton/` (Falling balls), `dna/` (prosecutor's fallacy), `regression/` (Top of the class). Still "Soon": The fair game (gambler's ruin), Infinite money (St Petersburg), Two children, Sleeping Beauty (last, contested). Not linked from any index or `/find` yet; ask Sam first.

Front page is built from the `GROUPS` list in `index.html` (thumbnails in `THUMB`). A ruled list on phones; from 720px wide it becomes tiles (picture, name, hook, Play/Done at the foot; Soon tiles dashed). Adding a riddle = one entry in `GROUPS` plus a `THUMB` function.

Watch styles: auto-playing (positive, birthday, streak, galton), played by hand (montyhall), or click-through with `R.walk` and Back/Next (simpson has its own copy; dna and regression use `R.walk`). Click-through suits riddles that need explaining step by step; Sam asked for numbers on everything in those.

## Decisions made without Sam (open to change)

- **Front page**: grouped ruled index (four themes), one hook line and a small SVG thumbnail per riddle, "Done" ticks from localStorage. The brief asked for 2 or 3 directions; this is the grouped-doors one.
- **Riddle titles avoid famous names** so students cannot look up the answer: "Three doors", "Shared birthdays", "Better every time". The famous name appears in the answer step.
- **No anchoring**: number guesses start empty and the slider thumb is hidden until used; "Lock it in" stays disabled until a guess exists.
- Birthday Watch: one example room on a calendar ring (seed chosen so its first match is at 19 to 26) plus a curve over 2,000 seeded rooms. Axis to 70.
- Simpson uses the real Charig 1986 kidney stone numbers. Free play changes each treatment's share of large stones with subgroup rates fixed.

## Sam's feedback (2026-11-12, round 1), all done

- **Light only.** Dark mode removed, to match the sophisticated look.
- **Describe sits under the visual**: `R.steps` moves `#viz` from `#viz-home` (Watch) into `#viz-slot` (Describe) and back. Any new riddle wraps its Watch visual the same way.
- **Three doors is played, not watched** (step label "Play"). The student picks a door, the host opens a goat, they choose Stay or Switch; every round scores both the stayer (kept the pick) and the switcher. After 6 rounds it asks "Shall we automatically play the rest?"; "No" plays 4 more and asks again; "Yes" runs the rest to 100 fast. Their own record shows too.
- **Birthday free play** shows a dot per room made (orange matched, blue not, the room on the ring is circled), latest 400.
- **Better every time** is clicked through (Back / Next, 4 steps) with numbers on every block ("81 of 87 worked") and percentages on the bars.

## Sam's feedback (2026-11-12, round 2), all done

- The Answer step repeats the riddle's question at the top (`R.steps` copies `#s0 .question` into a `.recall` box).
- Calculations in plain words, no shorthand (no `P(A | B)`, `sens`, `spec`, `HHHHH`). Prefer whole numbers of people. Tests check the Answer step for this shorthand.
- Give students what they need to guess well (Top of the class now states the class average). Axes start at 0 for scores out of 100.
- Pick seeds that land near the expected result, so one run cannot teach the wrong lesson (streak, regression).

## Files

| File | What |
|---|---|
| `riddles.css` | Shared look: Option B paper and ink, light only |
| `riddles.js` | `window.R`: seeded `rng` and `normal`, `timeline` (cancellable timers and tweens; `?speed=N` speeds it up), `steps` (also moves `#viz` into Describe), `walk` (Back/Next click-through), `field`, `guess`, `choices`, `scale`, `compare`, `fitCanvas`, `progress`/`markDone` |
| `<slug>/index.html` | One riddle each; markup for the five steps plus a page script. `[data-go="n"]` buttons move between steps |
| `test/run.sh` | Plays every riddle in headless Chrome (phone and desktop), including playing Three doors by hand. `test/run.sh /folder` saves screenshots |

## Rules

- Colours: red and violet for sick and false alarm (amber next to red was rejected as too similar); blue `--a` and orange `--b` for two-way comparisons. Always a word or letter beside colour.
- All randomness is seeded. Honour reduced motion (the timeline already does).
- No em dashes anywhere. Run `test/run.sh` before committing.
- **Run `python3 riddles/stamp.py` before committing.** unisam.nz caches for 4 hours, so a new page with an old cached `riddles.js` breaks (it blanked "Their average is" on Top of the class, 2026-11-12). The stamp changes the `?v=` on the shared links in every page.
