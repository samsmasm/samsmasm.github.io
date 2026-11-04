# The Long Game, `/dilemma`

Repeated prisoner's dilemma for Grade 9 and up. Students design a strategy (guided builder, or describe it to any AI and paste the JSON back), test it, and send it to a room. The teacher runs a round-robin tournament and gets a leaderboard, head-to-head matrix, graphs, a round-by-round replay and CSV export.

The name is Claude's; Sam may rename it. The original spec is in Sam's vault: `~/notes/AIdeas/Prisoner's dilemma site CLAUDE.md`. Read it before adding features, especially the V2 list.

## Rules that matter

- **Strategies are data, never code.** `js/engine.js` interprets JSON. Never `eval`, never `Function`, never anything an AI wrote.
- **The schema is the heart.** `SCHEMA.md` documents it. A change touches the engine, `validate.js`, `readback.js`, `prompt.js` and `SCHEMA.md` together. Bump `PROMPT_VERSION` when the prompt changes.
- **Deterministic.** All randomness goes through the seeded generator. Match seed is `seed|idA|idB`; each side has its own generator. Entries are sorted by id before a tournament so saved runs replay exactly.
- **The readback is made from the JSON**, never from builder answers, so it always says what the strategy really does.
- **No em dashes** anywhere, including comments and UI copy.
- Run `test/run.sh` before committing (Node tests for engine and builder, then headless Chrome over the real pages). `test/run.sh /some/folder` also saves screenshots.
- Run `python3 stamp.py` before committing (4h cache on unisam.nz).

## Files

| File | What |
|---|---|
| `index.html` | How it works, payoff matrix (drawn from `PAYOFFS`) |
| `build.html` + `js/build.js` | Builder, AI route, review (readback, test matches vs Tit for Tat and Always Defect, replay), send |
| `teacher.html` + `js/teacher.js` | Google sign-in, rooms, strategies, run, saved runs |
| `js/engine.js` | Payoffs, seeded RNG, checks, actions, `chooseMove`, `playMatch` |
| `js/tournament.js` | `FORMATS` (only round robin), `runTournament`, `playPair` |
| `js/validate.js` | `LIMITS`, `validate` (student-friendly messages), `parsePasted` |
| `js/readback.js` | Plain English from JSON |
| `js/builder.js` | `QUESTIONS` as data, `compile(answers)`, `builderAnswersFor` |
| `js/prompt.js` | The copy-paste AI prompt and the "take it further" prompt |
| `js/replay.js` | Round-by-round replay, shared by both pages |
| `js/results.js` | Leaderboard, head to head, graphs, replay picker, CSV |
| `js/opponents.js` | The two test opponents |
| `js/firebase.js` | The only file that knows the Firebase project. See `SETUP.md` |

## How the builder maps to rules

`compile()` emits rules in the spec's precedence: start-up and special rounds, then switching / scoreboard / reading them, then testing follow-up / forgiveness / grudge, then normal responses, then fallback. Slips are applied by the engine last. Memory slots used: `grudge` (punishment rounds left; forever = 1 never counted down) and `tested` (2 = just tested, 1 = check their reaction now, -1 = exploiting). Too many twists can exceed the 8-rule cap; the builder shows a meter and blocks testing until a twist is turned off.

A strategy opens back in the builder only if its `builder` answers still compile to exactly its rules. Anything an AI changed is shown read-only with the readback.

## Look

AESTHETIC.md Option B. Moves: cooperate `--coop` green, defect `--defect` red, always with a C/D letter. Two-series charts use `--series-a` / `--series-b`, validated with the dataviz palette checker. The many-strategy line chart greys everyone but one highlighted strategy rather than inventing 30 colours.
