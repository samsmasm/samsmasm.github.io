# The Long Game, `/dilemma`

Repeated prisoner's dilemma for Grade 9 and up, scored in **years in jail (fewest wins)**. Students design a strategy (guided builder, or describe it to any AI and paste the JSON back), test it, and send it to their class room or a public competition. Teachers run round-robin tournaments and get a leaderboard, head-to-head matrix, graphs, a round-by-round replay and CSV export. The Compete page lets anyone run a public competition: everyone, against the top 20 of the official standings, or against a seeded random sample, optionally with their own strategy added.

The name is Claude's; Sam may rename it. The original spec is in Sam's vault: `~/notes/AIdeas/Prisoner's dilemma site CLAUDE.md`. Read it before adding features, especially the V2 list.

## Decisions Sam made (2026-11-05)

- **Years in jail, fewer is better**, everywhere (he asked for "got less time in jail"). Payoffs are the classic points as 5 minus points: 2/2, 4/4, 0/5. `scoreLead` is their years minus mine.
- Test matches are against **Tit for Tat, Always Defect and Random**, with each side's years named and a verdict in jail words.
- The flow is **build, test, send**, shown as a step bar; sending is how you enter (he could not find "save").
- **Any teacher can make a room public**; public rooms are the competitions. Entries appear straight away; the owner removes bad ones.
- **Top 20 comes from official standings** the owner publishes after a full run. Runs on the Compete page use those standings' settings.

## Rules that matter

- **Strategies are data, never code.** `js/engine.js` interprets JSON. Never `eval`, never `Function`, never anything an AI wrote.
- **The schema is the heart.** `SCHEMA.md` documents it. A change touches the engine, `validate.js`, `readback.js`, `prompt.js` and `SCHEMA.md` together. Bump `PROMPT_VERSION` when the prompt changes.
- **Deterministic.** All randomness goes through the seeded generator. Match seed is `seed|idA|idB`; each side has its own generator. Build entries with `toEntries()` (sorted by id) on every page, or runs stop matching each other and the standings. "You" on the Compete page has id `~you`, which sorts last.
- **The readback is made from the JSON**, never from builder answers, so it always says what the strategy really does.
- **No em dashes** anywhere, including comments and UI copy.
- Run `test/run.sh` before committing: Node tests for engine and builder, then headless Chrome over every page with `js/firebase.js` swapped for `test/fake-firebase.js` by request interception (sends are read back from `window.__sent`). `test/run.sh /some/folder` also saves screenshots. Teacher sign-in itself is not covered.
- Run `python3 stamp.py` before committing (4h cache on unisam.nz).

## Files

| File | What |
|---|---|
| `index.html` | How it works, matrix in years (drawn from `PAYOFFS`) |
| `build.html` + `js/build.js` | Step bar, builder, AI route, review (readback, 3 test matches, replay), send to class or public |
| `compete.html` + `js/compete.js` | Public competitions, official standings, run everyone / top 20 / sample, your strategy optional |
| `teacher.html` + `js/teacher.js` | Google sign-in, rooms, open/closed, public/private, strategies, run, saved runs, publish standings |
| `js/engine.js` | Payoffs, seeded RNG, checks, actions, `chooseMove`, `playMatch` |
| `js/tournament.js` | `FORMATS` (only round robin), `toEntries`, `runTournament`, `playPair` |
| `js/validate.js` | `LIMITS`, `validate` (student-friendly messages), `parsePasted`, `fromStored` |
| `js/readback.js` | Plain English from JSON |
| `js/builder.js` | `QUESTIONS` as data, `compile(answers)`, `builderAnswersFor` |
| `js/prompt.js` | The copy-paste AI prompt and the "take it further" prompt |
| `js/replay.js` | Round-by-round replay, shared |
| `js/results.js` | Leaderboard, head to head (hidden over 40 entries), graphs, replay picker, CSV; `opts.mine` picks out "you" |
| `js/opponents.js` | The three test opponents |
| `js/firebase.js` | The only file that knows the Firebase project. See `SETUP.md` |

## How the builder maps to rules

`compile()` emits rules in the spec's precedence: start-up and special rounds, then switching / scoreboard / reading them, then testing follow-up / forgiveness / grudge, then normal responses, then fallback. Slips are applied by the engine last. Memory slots used: `grudge` (punishment rounds left; forever = 1 never counted down) and `tested` (2 = just tested, 1 = check their reaction now, -1 = exploiting). Too many twists can exceed the 8-rule cap; the builder shows a meter and blocks testing until a twist is turned off.

A strategy opens back in the builder only if its `builder` answers still compile to exactly its rules. Anything an AI changed is shown read-only with the readback.

The last strategy tested on a device is kept in `localStorage['longgame.lastTested']`, which the Compete page offers as "the one I last tested".

## Look

AESTHETIC.md Option B. Moves: cooperate `--coop` green, defect `--defect` red, always with a C/D letter. Two-series charts use `--series-a` / `--series-b`, validated with the dataviz palette checker. The many-strategy line chart greys everyone but one highlighted strategy rather than inventing 30 colours.
