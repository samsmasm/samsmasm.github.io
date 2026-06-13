# CLAUDE.md — Typurr

A friendly typing game for young children (roughly 4-8), starring **Ty the cat**. Lives at `samsmasm.github.io/typurr/`, deploys to **unisam.nz/typurr** on push to `main`. Vanilla HTML/CSS/JS, no build step. Branched originally from the `catjump` runner.

## Files
- `index.html` — all the screens (sky/parallax world, Ty the cat SVG, HUD, picker/home screen, add-player dialog, win/fail screens).
- `script.js` — all game logic.
- `styles.css` — all styling (Fredoka font, day/night palette vars, animations).

## How it plays
Ty runs to the right. Each obstacle wears a letter (or a whole word) in a floating badge. Type it to **smash** the obstacle; it leaves a crater that Ty **auto-hops** (no timing needed). Wrong key just flashes red. **SPACE** is a fallback jump (with a free double jump on a second tap) from a limited budget shown as paw prints. Catch **fish** for bonus paws. Hitting an obstacle makes Ty **tumble** over it and lose 3 jumps (if he has 3), otherwise the run ends. A **finish line** rolls in once the last obstacle is cleared.

## Levels
Home screen is a grid: rows are letter sets (`ETAO` building up to all 26) then 12 word themes (colours, animals, shapes, fruit, vehicles, sea life, numbers, feelings, sight words, weather, toys, minibeasts; each has 7+ words). Columns are 5 fixed speeds (1.5 → 11). Colours show the word and obstacle in that colour; other themes draw a picture obstacle. Track length (Standard 12 / Long 20 / Longer 40) and mistake handling (Keep going / accuracy mode that restarts the word) are settings on the home screen.

## Stars
Per `(rowId, speedId)` cell, best saved. `tumbled` → 1 star; else a non-fish SPACE jump used (`wastedJumps > 0`) → 2 stars; else 3. Jumps that caught a fish do not count.

## Players (local profiles)
"Player" bar on the home screen. `guest` = shared "Everyone" profile. Progress is namespaced via `ukey(suffix)`: guest uses `typurr-<suffix>`, named players use `typurr-u-<id>-<suffix>`. One tap to switch; "New" opens a name + icon dialog. localStorage keys: `typurr-users`, `typurr-current`, `typurr-fish`, `typurr-stars-*`, `typurr-muted`, `typurr-mistake`, `typurr-track`. A one-time IIFE migrates any legacy `cattype-*` keys to `typurr-*`.

## Testing
Headless puppeteer-core against a local server (system Chrome at `/usr/bin/google-chrome`). Pattern: serve the folder, drive `startLevel(rowId, speedId)`, read `frontObstacle()`, press `Key<L>` to type. Internals are global (state, obstacles, level, etc.) so they can be inspected from `page.evaluate`.

## Conventions
- Never use em dashes in user-facing text (project-wide rule for this site).
- Keep obstacle art as inline SVG; new word themes go in the `WORD_THEMES` table.
- Use absolute paths for shell commands; the working directory can reset between calls.
