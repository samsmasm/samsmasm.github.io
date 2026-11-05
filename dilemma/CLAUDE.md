# The Long Game, `/dilemma`

Repeated prisoner's dilemma for Grade 9 and up, scored in **years in jail (fewest wins)**. Students design a strategy (guided builder, or describe it to any AI and paste the JSON back), test it, and send it to their class room or a public competition. Teachers run round-robin tournaments and get a leaderboard, head-to-head matrix, graphs, a round-by-round replay and CSV export. The Compete page lets anyone run a public competition: everyone, against the top 20 of the official standings, or against a seeded random sample, optionally with their own strategy added.

The name is Claude's; Sam may rename it. The original spec is in Sam's vault: `~/notes/AIdeas/Prisoner's dilemma site CLAUDE.md`. Read it before adding features, especially the V2 list.

## Decisions Sam made (2026-11-05)

- **Years in jail, fewer is better**, everywhere (Sam asked for "got less time in jail"). Payoffs are the classic points as 5 minus points: 2/2, 4/4, 0/5. `scoreLead` is their years minus mine.
- Test matches are against **Tit for Tat, Always Cooperate, Always Defect and Random**, each side's years named, a verdict in jail words, cards in a 2 by 2 grid.
- The flow is **build, test, send**, shown as a step bar; sending is how you enter (Sam could not find "save").
- **Any teacher can make a room public**; public rooms are the competitions. Entries appear straight away; the owner removes bad ones.
- **Top 20 comes from official standings** the owner publishes after a full run. Runs on the Compete page use those standings' settings.
- **"When they defect" offers only Defect back and Cooperate anyway.** "Copy them" was removed because after a defection it is the same as defecting back. ("When they cooperate" keeps "Repeat my last move", which is different.)
- **Random slips run 0 to 100%**: a slip hands the move to a coin flip, so 100% is a fully random player and about half of slip rounds actually change the move. A round is logged as `slipped` only when the coin changed it.
- **Spot a pattern** twist (not the same as the **Pattern** twist, which plays a fixed sequence): a Them/You grid over the last 3 rounds, oldest on the left, each box cycling C, D, blank (not looked at), then cooperate or defect with a %. Up to 4 patterns, one rule each, one `recent` condition each. Default is Sam's example: they cooperated last round and you defected two rounds ago, so defect.

## Open threads

- Sam still needs to paste `checkin/firestore.rules` into the Firebase console (newest marker `dilemmaPublic`). Until then rooms, sending and competitions fail. Real Firebase flows are untested live.
- Not yet in `/find` (tools.js + tree.js) or any index. Ask Sam first.
- Offered, not done: clearer readback wording for grudge memory ("start a grudge: 2 more rounds of punishment"); "Repeat my last move" on "When they defect"; a 1% slider step for small slips; looking back more than 3 rounds in Spot a pattern.

## Rules that matter

- **Strategies are data, never code.** `js/engine.js` interprets JSON. Never `eval`, never `Function`, never anything an AI wrote.
- **The schema is the heart.** `SCHEMA.md` documents it. A change touches the engine, `validate.js`, `readback.js`, `prompt.js` and `SCHEMA.md` together. Bump `PROMPT_VERSION` when the prompt changes (1.3 as of the `recent` check). Purely additive checks stay at `schemaVersion` 1; anything that changes an old strategy's meaning needs 2.
- **Deterministic.** All randomness goes through the seeded generator. Match seed is `seed|idA|idB`; each side has its own generator. Build entries with `toEntries()` (sorted by id) on every page, or runs stop matching each other and the standings. "You" on the Compete page has id `~you`, which sorts last.
- **The readback is made from the JSON**, never from builder answers, so it always says what the strategy really does.
- **No em dashes** anywhere, including comments and UI copy.
- Run `test/run.sh` before committing: Node tests for engine and builder, then headless Chrome over every page with `js/firebase.js` swapped for `test/fake-firebase.js` by request interception (sends are read back from `window.__sent`). `test/run.sh /some/folder` also saves screenshots. Teacher sign-in itself is not covered.
- Run `python3 stamp.py` before committing (4h cache on unisam.nz).

## Files

| File | What |
|---|---|
| `index.html` | How it works, matrix in years (drawn from `PAYOFFS`) |
| `build.html` + `js/build.js` | Step bar, builder, AI route, review (readback, 4 test matches, replay), send to class or public |
| `compete.html` + `js/compete.js` | Public competitions, official standings, run everyone / top 20 / sample, your strategy optional |
| `teacher.html` + `js/teacher.js` | Google sign-in, rooms, open/closed, public/private, strategies, run, saved runs, publish standings |
| `js/engine.js` | Payoffs, seeded RNG, checks (plus `recent`, `RECENT_MAX` 3), actions, `chooseMove`, `playMatch` |
| `js/tournament.js` | `FORMATS` (only round robin), `toEntries`, `runTournament`, `playPair` |
| `js/validate.js` | `LIMITS`, `validate` (student-friendly messages), `parsePasted`, `fromStored` |
| `js/readback.js` | Plain English from JSON |
| `js/builder.js` | `QUESTIONS` as data, `compile(answers)`, `builderAnswersFor`, `newSpot` |
| `js/prompt.js` | The copy-paste AI prompt and the "take it further" prompt |
| `js/replay.js` | Round-by-round replay, shared |
| `js/results.js` | Leaderboard, head to head (hidden over 40 entries), graphs, replay picker, CSV; `opts.mine` picks out "you" |
| `js/opponents.js` | The four test opponents |
| `js/firebase.js` | The only file that knows the Firebase project. See `SETUP.md` |

## How the builder maps to rules

`compile()` emits rules in the spec's precedence: start-up and special rounds, then switching / scoreboard / reading them / spotted patterns, then testing follow-up / forgiveness / grudge, then normal responses, then fallback. Slips are applied by the engine last. Memory slots used: `grudge` (punishment rounds left; forever = 1 never counted down) and `tested` (2 = just tested, 1 = check their reaction now, -1 = exploiting). Too many twists can exceed the 8-rule cap; the builder shows a meter and blocks testing until a twist is turned off.

A strategy opens back in the builder only if its `builder` answers still compile to exactly its rules. Anything an AI changed is shown read-only with the readback.

The last strategy tested on a device is kept in `localStorage['longgame.lastTested']`, which the Compete page offers as "the one I last tested".

## Look

AESTHETIC.md Option B. Moves: cooperate `--coop` green, defect `--defect` red, always with a C/D letter. Two-series charts use `--series-a` / `--series-b`, validated with the dataviz palette checker. The many-strategy line chart greys everyone but one highlighted strategy rather than inventing 30 colours.
