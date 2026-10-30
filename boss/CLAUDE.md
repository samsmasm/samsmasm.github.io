# You're the Boss (/boss)

Pick-a-path game for IB BM 2.4 (motivation, rewards, training). Hire one of six workers (five people and Biscuit the cat), make about 15 calls, keep them motivated, skilled and here. Full design spec: Obsidian vault `AIdeas/Pick a Path The Boss Game.md`.

## Files

- `engine.js`: all rules (hires, hubs H1 to H15, the Need engine, pop quiz, endings, score, replay). No DOM. `node test.js` runs 12,000 random games and greedy games, checks every game replays to the same score and that full games get five different quizzes.
- `defs.js`: key word definitions. Every key (and its `also` spellings) gets a "?" wherever it appears in the game. Sam will replace these draft definitions with his own; empty `def` shows "Definition coming soon."
- `index.html`: UI. Views: pick, hub, router (H3), sort (H5), result, quiz, quizres, end; tabs Play, Leaderboard, Teacher.

## Rules that differ from the spec

- Motivation and skills have no ceiling (Sam: capping at 4 made the game meaningless). Need still runs 1 to 4. Ending thresholds were raised: Promoted mentor needs M 8+, S 5+; Loyal veteran M 5+, S 4+.
- Name-it checks are no longer instant. Instead there is a **pop quiz** when the player first reaches steps 3, 6, 9, 12 and the end (five per full game, `QUIZ_AT`). `makeQuiz` picks, from the last three choices, either "name the scheme you just chose" (hub `nameIt`) or a theory question from `QUIZ` tagged with that hub, alternating where it can. Right: M+1 and 20 points. Wrong: M-1.
- Option labels at name-it hubs (H2, H7, H11, H13) describe the scheme without naming it.
- H5 sort asks for all four hygiene factors.
- "Ask HR first" at H8 is the Ask HR button, which costs a warning at urgent hubs.
- The cat (`cat`): per-hire labels (`labels`), scenes (`sceneFor`), jokes (`fun`, `sceneFun`) and effects. Mousing is countable, so Taylor and piece rate work for it; commission kills it (nothing to sell); individual PRP sets Gaming (it imports mice).

## Hires and age

Maya 24, Tuan 26, Aisha 27, Kofi 44 (career change, teenagers at home, his mother moves in at H9), Rosa 63 (retires at 66), Biscuit the cat. Age changes preferences, never ability: Rosa wants pay now not shares (H2), long-vesting shares mean little to her (H13), she is great with new software (H12 joke). H12 has a Rosa-only trap option ("skip her training, she retires soon") that is flagged as illegal age discrimination (`only` on options). The `age` quiz question comes first for hires aged 40+ or after the trap. The pick screen says age discrimination is illegal but age can shape preferences.

## Score and leaderboard

- Score = 10 x (M + S) + 10 x step reached (16 at the end) + 20 x quiz right - 10 x warnings + ending bonus (mentor 150, loyal 100, fragile 50).
- Leaderboard: same Realtime Database as /stockshock (`coldwar-d8109`), path `boss/scores`, REST only, no rule changes. Rows are `{n, c: hire, a: actions joined by commas, at}`; scores are always recomputed with `Boss.replay`, so a tampered row is dropped. Last 7 days, best per name. Name required, "Keep me off the class leaderboard" checkbox, name-clash warning needs a second press. Teacher tab code `0987` (same as Stock Shock) lists rows with two-click Delete.
- Tests must stub `fetch` (see the session's puppeteer script pattern): never write test rows to the real database.

## Style

AESTHETIC.md Option B (paper and ink), BM blue as section colour, geocorn logo. Low text: decision first, debrief behind "Why?". No em dashes.
