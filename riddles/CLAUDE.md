# Riddles, `/riddles`

Interactive probability riddles for Grade 9 and up (also IB Econ and BM). The original brief, with all twelve riddles, is in Sam's vault: `~/notes/Projects/Probability riddles/Probability riddles CLAUDE.md`. This file and the code are now the source of truth.

Every riddle runs the same five steps: Riddle, Guess, Watch (or Play), Describe ("what do you see?", an observation, not a second guess), Answer (the question again, guess next to truth, a few one-line reasons, an optional calculation, then free play). Few words; the visuals do the work. Never praise or grade.

## Status (2026-11-13)

All 12 riddles are live. Not linked from the homepage, `/tools` or `/find` yet; ask Sam first. Tracker entry: "Riddles".

| Slug | Title | Idea | Watch style | Numbers |
|---|---|---|---|---|
| `positive` | The positive test | base rates, Bayes | auto | exactly as expected (10 sick, 100 false alarms) |
| `dna` | The DNA match | prosecutor's fallacy | click-through (`R.walk`) | exactly as expected (10 innocent matches) |
| `montyhall` | Three doors | Monty Hall | played by hand | truly random |
| `streak` | Due a tails | gambler's fallacy | auto | truly random |
| `ruin` | The fair game | gambler's ruin | auto | truly random |
| `stpetersburg` | Infinite money | St Petersburg paradox | played by hand | truly random |
| `birthday` | Shared birthdays | birthday problem | auto | truly random |
| `regression` | Top of the class | regression to the mean | click-through (`R.walk`) | truly random |
| `galton` | Falling balls | Galton board, bell curve | auto | truly random |
| `twochildren` | Two children | sample space | click-through (`R.walk`) | exactly as expected (100 of each kind) |
| `simpson` | Better every time | Simpson's paradox | click-through (own copy of walk) | real data (Charig 1986) |
| `sleepingbeauty` | Sleeping Beauty | contested | click-through (`R.walk`) | exactly as expected (500/500) |

Titles avoid famous names so students cannot look up the answer; the famous name appears in the answer step.

## Rules Sam has set (keep to these)

**Honest numbers** (2026-11-13). No hand-picked "typical" runs. Every Watch step is either:
- **Truly random**: `R.freshSeed()` (crypto), new on every page load, or every play for played riddles.
- **Exactly as expected**: the textbook counts, with the order or positions shuffled.
- **Real data**: Simpson's patients.

The `.randnote` line inside `#viz` must say which ("Truly random.", "Exactly as expected.", "Real data, not a simulation.") and why the counts look as they do. A test checks every Describe step has one starting with one of those phrases. Free play is always truly random. Never add a fixed seed.

**Accurate claims.** Check every probability statement. "In a class of 30, someone will get it" was wrong for a 1 in 32 chance; it is "a good chance (61%)". Say "tends to", "about", "a good chance" unless something is certain. In Infinite money the average tends to climb, it does not always.

**One quantity per riddle** (Infinite money, 2026-11-12). The question, the Describe options and the answer must all be about the same thing (there: the average win per game). Never say "fair price": the maths gives the expected value; what someone should pay depends on their taste for risk. A test checks for "fair price".

**Plain-word calculations.** No `P(A | B)`, `sens`, `spec`, `HHHHH`. Prefer whole numbers of people (the positive test uses 100,000 people so every count is whole). A test checks the Answer step for that shorthand.

**Give what is needed to guess.** Top of the class states the class average as well as the gold-star average. Score axes run 0 to 100.

**Describe under the visual.** `R.steps` moves `#viz` from `#viz-home` (Watch) into `#viz-slot` (Describe) and back, so students describe what is in front of them. Wrap any new Watch visual the same way.

**The Answer step repeats the question** (`R.steps` copies `#s0 .question` into a `.recall` box).

**Click-through where guidance is needed**, with numbers on everything (Better every time, DNA, Top of the class, Two children, Sleeping Beauty).

**Played riddles** ask to autoplay: Three doors after 6 games then every 4; Infinite money after 5 then every 5. "No" plays more by hand, "Yes" plays the rest.

**Free play reruns**: any simulated free play has a "Run again: <n> new <things>" button (`#again`), plus "Run N" (`#run-n`) where the result may not visibly change.

**Light only.** Dark mode was removed to match AESTHETIC.md Option B.

**No anchoring.** Number guesses start empty, the slider thumb is hidden until used, and "Lock it in" stays disabled until there is a guess.

## Riddle notes

- **Three doors**: stay or switch by clicking a door (no buttons). Each game goes in the row for the choice made: Stayed / Switched, 50 each. Filled dot = car, thick ring = goat, faint dot = not played. Autoplay fills Stayed first, then Switched. Answer shows two win-rate bars. Free play: 3 or 100 doors.
- **Infinite money**: the student flips (tails doubles the prize, heads pays). The graph of the running average appears once autoplay starts (to 10,000 games). The answer describes the student's own run. Free play ("Give the casino a limit"): with a limit of 2^c dollars the expected value is c + 1; it plays 10,000 capped games and graphs the average against a dashed expected-value line.
- **Sleeping Beauty**: kept as short as possible after several rewrites (Sam found every longer version confusing). The rule is said in one sentence, then shown as rows that stop after the last question (Heads: Asked, End; Tails: Asked, Asked, End). Do not use a table with a "2nd waking" column: the empty heads cell implied a second heads waking. No days of the week, no memory drug. The answer presents halfers and thirders side by side (`R.scale` with `answers`), and "Which side are you on?" shows the best point against the chosen side.
- **Simpson**: real Charig 1986 kidney stone data. Free play changes each treatment's share of large stones with subgroup rates fixed.
- **Birthday**: free play shows a dot per room made (orange matched, blue not, the room on the ring circled).
- **Top of the class**: the riddle's averages (60 class, about 85 gold stars) come from the run; the calculation box works out the expected test-2 score (half the lead is skill) and shows this run's result next to it.

## Front page

Built from the `GROUPS` list in `index.html` (thumbnails in the `THUMB` functions). A ruled list on phones; from 720px wide it becomes tiles (picture, name, hook, Play or Done at the foot). Done ticks come from localStorage (`riddles.progress`, via `R.markDone`). Adding a riddle = one `GROUPS` entry plus a `THUMB` function.

## Feedback and analytics

`riddles.js` adds both to every page, so new riddles get them for free:
- The footer's "found a problem? tell Sam." becomes "Found a problem? **Send feedback**." The link opens an inline form (no modal) that POSTs to the shared inbox (`../feedback/CLAUDE.md`) with `app: "riddles"`, type bug/idea/other, the message, and `meta` = page, visible step, viewport. Read reports at unisam.nz/feedback. Tests intercept the POST so nothing reaches the real inbox.
- GoatCounter page views (samsmasm.goatcounter.com), skipped on localhost.

## Files

| File | What |
|---|---|
| `riddles.css` | Shared look: AESTHETIC.md Option B, light only |
| `riddles.js` | `window.R`: `rng`, `freshSeed`, `normal`, `timeline` (cancellable timers and tweens; `?speed=N` speeds them up; progress clamped at 0), `steps` (moves `#viz`, repeats the question), `walk` (Back/Next), `field`, `guess`, `choices`, `scale` (one or several answers), `compare`, `fitCanvas`, `onResize`, `progress`/`markDone`, plus the feedback form and GoatCounter |
| `<slug>/index.html` | One riddle each: markup for the five steps plus a page script. `[data-go="n"]` buttons move between steps |
| `index.html` | Front page |
| `stamp.py` | Stamps `?v=` on the shared CSS/JS links in every page |
| `test/run.sh` | Plays every riddle in headless Chrome (phone and desktop), including the played games by hand, the feedback form, tiles and the honesty checks. `test/run.sh /folder` saves screenshots |

## Before every commit

1. `python3 riddles/stamp.py`. unisam.nz caches for 4 hours, so a new page with an old cached `riddles.js` breaks (it blanked "Their average is" on Top of the class).
2. `riddles/test/run.sh`. Results are random now, so a check that fails once should be rerun; if it fails twice, it is a real bug (that is how the negative tween progress crash was found).
3. Update the tracker entry and run `python3 tracker/publish.py`.

## Style

- Colours: red and violet for sick and false alarm (amber next to red was rejected as too similar); blue `--a` and orange `--b` for two-way comparisons. Always a word or letter beside colour.
- Honour reduced motion (the timeline already does).
- No em dashes anywhere.
