# Riddles, `/riddles`

Interactive probability riddles for Grade 9 and up (also IB Econ and BM). The full brief, with all twelve riddles, is in Sam's vault: `~/notes/Projects/Probability riddles/Probability riddles CLAUDE.md`. Read it before adding a riddle.

Every riddle runs the same five steps: Riddle, Guess, Watch, Describe ("what do you see?", not a second guess), Answer (guess next to truth, a few one-line reasons, optional calculation, then free play). Few words; the visuals do the work. Never praise or grade.

## Status (2026-11-12)

Built: `positive/` (ported from the vault prototype), `montyhall/`, `birthday/`, `simpson/`. The other eight show as "Soon" rows on the front page. Not linked from any index or `/find` yet; ask Sam first.

## Decisions made without Sam (open to change)

- **Front page**: grouped ruled index (four themes), one hook line and a small SVG thumbnail per riddle, "Done" ticks from localStorage. The brief asked for 2 or 3 directions; this is the grouped-doors one.
- **Riddle titles avoid famous names** so students cannot look up the answer: "Three doors", "Shared birthdays", "Better every time". The famous name appears in the answer step.
- **No anchoring**: number guesses start empty and the slider thumb is hidden until used; "Lock it in" stays disabled until a guess exists.
- Monty Hall Watch: one shared game slowly, two more, then 97 fast; each game exactly one of stayer/switcher wins. Seed is chosen so the 100 games land near 33/67.
- Birthday Watch: one example room on a calendar ring (seed chosen so its first match is at 19 to 26) plus a curve over 2,000 seeded rooms. Axis to 70.
- Simpson uses the real Charig 1986 kidney stone numbers. Free play changes each treatment's share of large stones with subgroup rates fixed.

## Files

| File | What |
|---|---|
| `riddles.css` | Shared look: Option B paper and ink, plus a designed dark theme (system setting, or `data-theme`) |
| `riddles.js` | `window.R`: seeded `rng`, `timeline` (cancellable timers and tweens; `?speed=N` speeds it up), `steps`, `field`, `guess`, `choices`, `scale`, `compare`, `fitCanvas`, `onTheme`, `progress`/`markDone` |
| `<slug>/index.html` | One riddle each; markup for the five steps plus a page script. `[data-go="n"]` buttons move between steps |
| `test/run.sh` | Plays every riddle in headless Chrome (phone and desktop, light and dark). `test/run.sh /folder` saves screenshots |

## Rules

- Colours: red and violet for sick and false alarm (amber next to red was rejected as too similar); blue `--a` and orange `--b` for two-way comparisons. Always a word or letter beside colour.
- All randomness is seeded. Honour reduced motion (the timeline already does).
- No em dashes anywhere. Run `test/run.sh` before committing.
