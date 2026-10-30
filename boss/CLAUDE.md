# You're the Boss (/boss)

Pick-a-path game for IB BM 2.4 (motivation, rewards, training). Hire one of five workers, make about 15 calls, keep them motivated, skilled and here. Full design spec: Obsidian vault `AIdeas/Pick a Path The Boss Game.md`.

## Files

- `engine.js`: all rules (hires, hubs H1 to H15, the Need engine, name-it checks, endings). No DOM; `node test.js` runs 20,000 random games plus a known winning path.
- `defs.js`: key word definitions. Every key (and its `also` spellings) gets a "?" wherever it appears in the game. Sam will replace these draft definitions with his own; empty `def` shows "Definition coming soon."
- `index.html`: UI. Views: pick, hub, router (H3), sort (H5), nameit, result, end.

## Decisions that differ from the spec

- Option labels at name-it hubs (H2, H7, H11) describe the scheme without naming it, so the name-it check is a real test.
- H5 sort asks for all hygiene factors (four of the six complaints, matching the "fix every hygiene complaint" option), not three.
- "Ask HR first" at H8 is the Ask HR button, which costs a warning at urgent hubs.
- Ask them is disabled after the second use at a hub (the second use gives the warning).
- "Better option" in the debrief is found by trying every option on a copy of the state and scoring M*2 + S - 3W + need/2.

## Style

AESTHETIC.md, BM blue. Low text: decision first, debrief behind "Why?". No em dashes.
