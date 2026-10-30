# You're the Boss (/boss)

Pick-a-path game for IB BM 2.4 (motivation, rewards, training). Hire one of six workers (five people and Biscuit the cat), make 13 calls, keep them motivated, skilled and here. Original design spec: Obsidian vault `AIdeas/Pick a Path The Boss Game.md` (the game has moved a long way from its fixed 15-hub route; this file is current).

## Files

- `engine.js`: all rules (hires, theories, scenarios, deck, Need engine, reasons, pop quiz, endings, score, replay). No DOM. `node test.js` checks every option has a reason at SL and HL, deck shape and variety, 6,000 random and 48 greedy games, replay matches, five quizzes per full game, tampered games rejected.
- `defs.js`: key word definitions. Every key (and its `also` spellings) gets a "?" wherever it appears. Sam will replace these draft definitions with his own; empty `def` shows "Definition coming soon."
- `index.html`: UI. Views: pick, hub, why (choose the theory), sort (H5), result, quiz, quizres, end; tabs Play, Leaderboard, Teacher. Logo and title go back to Play.

## How a game runs (rebuilt 2026-10-30 after Sam found two workers' paths "almost identical")

- **Level**: SL (Taylor, Maslow, Herzberg) or HL (adds McClelland, Deci and Ryan, equity, expectancy, and appraisal). Chosen on the pick screen, default HL. SL games never show HL scenarios, theories or quiz questions.
- **Deck** (`makeDeck`, seeded): H1 Day one, H2 The contract, then 10 shuffled scenarios, then H15 Year-end. The 10 are the hire's own scenarios (`hire:` on the hub, two each; the cat's red dot is HL), plus in HL three from `HL_POOL` (EQ, EX, SD, MC, AP), then the rest from `SL_POOL` (H6 to H14).
- **Remedial steps** (`advance`): H4 Skills gap whenever S is 1 or lower (repeats), H5 Hygiene audit once when M is 1 or lower. Tuan on commission only quits at the first step after H2. These do not count as steps.
- **Because**: hubs whose options have `why` ({theoryId: reason}) or `bad` (why no theory backs it) ask for a theory after the action (`asksWhy`). Several theories can be right; "No theory backs this" is right only for options with no fitting theory at that level. Right: +20. Wrong: +5 and the correction (the picked theory's summary and what does back it). Original hubs get reasons from the `WHY` table. H1, H2, H4, H5, H12, H13 do not ask.
- **Hire traits**: `need` (Maslow, hidden, the Need engine), `mc` (McClelland: ach, aff, pow; clues in the MC scene) and `values` (what they value, used in the expectancy scenario).
- **Pop quiz** on reaching steps 3, 6, 9, 12 and the end (five per full game). `makeQuiz` picks from the last three choices: a "name the scheme you chose" question (hub `nameIt`) or a theory question tagged with that hub (`hubs`, plus `EXTRA_TAGS` for hire scenarios), alternating where it can. HL questions only in HL. Right: M+1 and 20 points. Wrong: M-1.

## Other rules

- Motivation and skills have no ceiling. Need runs 1 to 4. Endings: Promoted mentor needs M 8+, S 5+, need 3+, the H15 promotion and no Gaming flag; Loyal veteran M 5+, S 4+.
- Option labels at name-it hubs (H2, H7, H11, H13) describe the scheme without naming it.
- H5 sort asks for all four hygiene factors. "Ask HR" costs a warning at urgent hubs (H8).
- The cat: per-hire labels, scenes and jokes. Mousing is countable, so Taylor and piece rate work; commission kills it; individual PRP sets Gaming (it imports mice).
- `JOBS` gives each human hire their own scenes and option wording on shared hubs; effects stay shared.

## Hires and age

Maya 24, Tuan 26, Aisha 27, Kofi 44 (career change, teenagers at home, his mother moves in at H9), Rosa 63 (retires at 66), Biscuit the cat. Age changes preferences, never ability. Rosa-only traps flagged as illegal age discrimination: H12 "skip her training" (`only`) and RP "suggest she retires early". The `age` quiz question comes first for hires aged 40+ or after the trap. The pick screen says age discrimination is illegal but age can shape preferences.

## Score and leaderboard

- Score (Sam's "mix", explained on the pick screen, after every step and as an end breakdown): +30 reward matches the current need, -10 reward they were not ready for, +10 best call, +20 right reason, +5 reason that did not fit, +20 quiz right, +10 per step reached (max 13), plus ending bonus (mentor 150, loyal 100, fragile 50). `POINTS`, `breakdown()`, `pointsFor()`.
- Leaderboard: Realtime Database `coldwar-d8109`, path `boss/scores`, REST only. Rows `{v: 2, n, c: hire, d: seed, l: level, a: actions, at}`; scores are recomputed with `Boss.replay(hire, seed, level, acts)`, and rows without `v: 2` are ignored. Last 7 days, best per name. Teacher tab code `0987` lists rows with two-click Delete.
- Tests must stub `fetch`: never write test rows to the real database. Screenshot scripts must write to the scratchpad by absolute path, never into this folder.

## Style

AESTHETIC.md Option B (paper and ink), BM blue as section colour, geocorn logo. Low text: decision first, debrief behind "Why?". No em dashes.
