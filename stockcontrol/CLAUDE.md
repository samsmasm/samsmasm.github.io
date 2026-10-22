# CLAUDE.md

Project: Stock Shock, a JIT vs JIC supply shock simulation for IB Business Management HL 5.6 Production Planning (Part A). Browser game played by students in about 8 minutes, followed by a debrief. Built by a teacher for his own classroom.

## Task for this session

Add two features to the existing game. Do not rebuild it. Edit `app.html` in place and keep `engine.js` numerically unchanged.

1. A visual warehouse scene of cat food cans, with cats as customers.
2. A final replay on the end screen.

Everything else (levers, scoring, shocks, score codes, teacher tab, wording of instructions) stays as it is unless a change below requires it.

## Files

- `engine.js`: pure simulation logic, exposed as `Engine`. No DOM. Also exports via `module.exports` for node tests.
- `app.html`: all UI (HTML, CSS, JS). Contains the placeholder `/*ENGINE*/` inside a script tag.
- `build.py`: inlines `engine.js` into `app.html` and writes `out/Stock_Shock_JIT_vs_JIC.html`. This single file is the deliverable.
- `smoke.js`: headless playthrough using jsdom (`npm install jsdom`). Run `node smoke.js` after every build.
- `grid.js`, `sweep.js`, `test.js`: balance tests. Run `node grid.js` if you ever touch numbers (you should not).

Commands:

```
python3 build.py && node smoke.js
```

## Hard constraints

- Single self-contained HTML file. No external fonts, images, frameworks or CDNs. Must work offline on student devices and a projector. Draw everything with inline SVG and CSS. The one exception is the optional class leaderboard (see below), which uses `fetch` and fails quietly offline.
- No localStorage or other persistence. State lives in the `G` object in memory.
- Never use em dashes anywhere (code comments, UI text, docs). Use commas, colons or hyphens.
- Do not put assessment objective labels (AO1, AO2 and so on) in any UI text.
- Style: large, plain, left-aligned, dyslexia-friendly. Font stack is Verdana first. Colour roles already in CSS: purple for information, blue for tasks and actions, dark red for shocks and stock-outs, green for calm. Never rely on colour alone to carry meaning (add icons, labels or shapes).
- Respect `prefers-reduced-motion`: skip animations and jump to the end state.
- Layout must work from phone width (about 380px) to a projector. Use SVG `viewBox` scaling.
- Original artwork only. Draw simple cats and cans yourself. Do not copy any existing character, brand or logo.
- Player-facing text is concise and in plain English. Keep British or international spelling consistent with the existing text (for example "colour").

## Game rules (original rules, version 1)

Superseded for new games by rules version 2 (see the section at the end). Version 1 still runs, unchanged, for score codes and leaderboard rows without `v`.

- 10 rounds, one week each. Fixed shock sequences A, B, C, a seeded random sequence R, and S (default class set, added 2026-10-22): A's ten events with round 1 calm and rounds 2 to 10 shuffled by a per-game seed. S is additive in `seqFor`; A, B, C and R are unchanged. All S games share one leaderboard.
- Holding cost is shown to players as one "storage costs" figure ($1 per unit per round). The 0.40/0.20/0.40 split still exists in `CFG.hold` but is no longer shown.
- Levers per round: buffer stock (0 to 3,200, step 200), reorder quantity (400 to 4,000, step 200), single or dual supplier.
- Reorder level = buffer + baseDemand x baseLead (800). An order is placed at the start of a round only if stock after deliveries is at or below the reorder level and no order is outstanding. Order quantity is capped by the 4,000 storage limit.
- Price $20, cost $12, base demand 800, lead time 1 week, start stock 800.
- Holding cost $1.00 per unit left at end of round: storage 0.40, insurance and security 0.20, opportunity cost 0.40.
- Dual supplier: $500 a round, extra delay capped at 1 week, price rise halved.
- Lost sales are lost, not delayed. Stock is sold FIFO.
- Score code: base64 JSON `{n, m, d, t, h:[[buffer, qty, dual], ...]}`. The teacher tab decodes it and recomputes totals with `Engine.run`. Do not change this format.

## Engine API (read `engine.js` before using)

- `Engine.CFG`, `Engine.CARDS`, `Engine.SEQ`, `Engine.SEQ_NAMES`
- `Engine.seqFor(mode, seed)` returns an array of 10 cards
- `Engine.newState()`, `Engine.play(state, lev, card)` returns a result object, `Engine.run(seq, levers)` where `levers` is an object or `(i, state) => lev`
- Each result has: `round, card, lev, startStock, ordered, arrivedQty, demand, sold, lost, endStock, revenue, cogs, holding, fee, profit, total, lostProfit, stockout`
- `state.pipeline` holds outstanding orders `{qty, cost, arrive, lead, delay}`

You may add small read-only helpers to `engine.js` if needed (for example a function returning stock after arrivals), but do not change any existing behaviour or numbers.

## Existing UI structure in `app.html`

`render()` switches between `setupView`, `roundView`, `resultView`, `endView`, and `teacherView`. `G.view` is `'round'`, `'result'` or `'end'`. `roundView` already has a "Your warehouse" stat grid, an SVG stock control chart (with `stockChartUpdate()` for live slider updates), the lever sliders, a live four-step preview, and a Run button that calls `Engine.play` then switches to `resultView`.

## Feature 1: Cat food warehouse and cat customers

Theme: the product is cans of cat food. Customers are cats. 1 can on screen = 100 units. Show exact unit numbers in text beside the scene.

Scene placement: on `roundView`, replace the plain "Your warehouse" stat grid area with a scene card, but keep the stat numbers (demand, stock, arriving, on order) as a compact row under or beside the scene. The stock control chart stays, behind the existing "Show stock control chart" checkbox.

Scene elements (inline SVG, responsive):

- Shelves: 4 rows of 10 slots = 40 can slots = the 4,000 storage limit. Label the top as "Storage limit 4,000".
- Cans: a rounded rectangle with a label band and a small fish shape. Round stock up to the nearest can for drawing (stock 850 shows 9 cans). Fill from the bottom left.
- Buffer: the first `buffer / 100` cans (bottom of the stack) have a green outline and a "Buffer" bracket or label. Cans above the buffer are the normal working stock.
- Reorder level: a dashed blue line across the shelves at `reorderLevel / 100` cans, labelled "Reorder level". It must update live as the buffer slider moves (reuse the `upd()` pattern in `roundView`, do not re-render the whole view on input).
- On-order indicator: if an order is outstanding or placed this round, show a small crate or truck icon beside the shelves labelled with quantity and arrival round.
- Customers: a row of cat icons at the front of the shop, one cat per 100 units of this week's demand (round up, so 650 shows 7 cats, the last one a kitten sized or half-width icon is optional). On `roundView` they wait in a line, neutral face. Cats are simple original SVG: head circle, two triangle ears, eyes, nose, whiskers. Vary fur colour slightly across a small palette. Mood changes eyes and mouth: happy (served), sad (turned away).

Run animation (plays between pressing Run and showing `resultView`, about 4 to 6 seconds in total):

1. Delivery: if units arrive this round, cans slide or drop onto the shelves.
2. Order: if an order is placed, show the crate icon appear with its arrival round.
3. Customers: cats step up one at a time. A can lifts off the top of the stack and goes to the cat, which turns happy. If shelves are empty, remaining cats turn sad, walk away, and a "Lost sale" label with the lost profit appears.
4. Holding cost: coins drift from the remaining cans into a jar, split into three coin colours (or labelled shapes) for storage, insurance and security, opportunity cost. Show the dollar total.
5. Then call the existing path (`G.last = Engine.play(...)`, `G.view = 'result'`, `render()`).

Important: call `Engine.play` first (before animating) so the animation is driven by the real result object, then animate from `h.startStock`, `h.arrivedQty`, `h.sold`, `h.lost`, `h.endStock`, `h.holding`. Do not compute the outcome separately in the animation.

Animation controls: a "Skip animation" button visible during the animation, and a "Fast mode" checkbox on the round screen. Fast mode and `prefers-reduced-motion` both skip straight to the result. Support `?fast` in the URL, or `window.__fast = true`, so the jsdom test can run without waiting.

`resultView` should reuse a static version of the scene (end-of-round state, with the cats showing happy or sad) above the existing profit table.

Optional if time allows, only after everything else works: a thin supply route strip across the top (supplier, ship or truck, warehouse) where an outstanding order moves one stage per week and a shock card shows a barrier icon (closed lane, licence hold) on the route. Dual supplier shows a second route that keeps moving.

## Feature 2: Final replay

On `endView`, add a "Replay your game" card above the round-by-round table.

- Animated line chart over rounds 0 to 10 showing end-of-round stock for: the player (purple, thick), pure JIT ghost (grey), pure JIC ghost (grey, dashed). Use `benchmarks`-style strategies from the existing `benchmarks(seq)` function, but you will need per-round histories, so run `Engine.run` for each and read `state.history[i].endStock`. Include the hybrid ghost as a third optional toggle.
- Second panel under it: cumulative profit by round for the same lines, so the final gap is visible.
- Mark stock-out rounds on the player line with a red marker and a text label (not colour alone).
- Show the news card title for the current replay round above the chart, with a small row of chips (demand, delay, price), so students link each dip to a shock.
- Controls: Play, Pause, Restart, a scrub slider (0 to 10), and a speed selector (1x, 2x). Default is play on load at 1 round per second. Under reduced motion, show the final state with the scrub slider available.
- Beneath the chart, a short live caption that updates per round, for example "Round 6, Shipping lane closed: you had 1,000 in stock, pure JIT had 0 and lost 800 sales." Build the caption from real histories. No em dashes.
- Include a "Replay with different levers" button that calls the existing `startGame(G.name, G.mode, G.seed)`.

## Acceptance checks

Extend `smoke.js` so it fails loudly if any of these break:

1. No uncaught errors during a full 10 round playthrough, including pressing Run with the fast flag set.
2. On the round 1 screen (stock 800, demand 800), the scene contains exactly 8 can elements and exactly 8 cat elements. Use stable `data-` attributes such as `data-can`, `data-cat` and `data-mood`.
3. With buffer 1,200 the reorder line sits at 20 cans (2,000 / 100). After moving the slider in jsdom, it updates without a re-render.
4. After a stock-out round, at least one cat has `data-mood="sad"` and the "Lost sale" label is present. After a no-stock-out round, no cat is sad.
5. The end screen contains the replay card, a scrub slider with min 0 and max 10, and the final replay totals match `Engine.run` totals.
6. The score code still decodes to the same total as the game (existing check in `smoke.js`).
7. The built HTML contains no em dash characters (U+2014). Check with a script, for example `python3 -c "import sys; print(open(sys.argv[1]).read().count(chr(8212)))" out/Stock_Shock_JIT_vs_JIC.html` prints 0.

Also do a manual check at 380px width and at 1280px width, and view the animation once with fast mode off.

## Out of scope

Changing balance numbers, sequences, levers or scoring. Adding a backend, accounts, sound, or external assets. Rewriting the teacher tab (only fix breakage if you cause it).

## Handover notes

Report back with: what changed in `app.html`, any helper added to `engine.js`, the final output file path, and the result of `node smoke.js`.

## Deployment

Lives in `samsmasm.github.io/stockcontrol/`, served at unisam.nz/stockcontrol/. `build.py` writes both `out/Stock_Shock_JIT_vs_JIC.html` (the offline single file) and `index.html` (the live page). Commit `index.html` after every build. `out/` and `node_modules/` are git-ignored; run `npm install jsdom` here before `node smoke.js`.

## Player-facing copy (decided 2026-10-22)

Players are distracted grade 11 students who experiment rather than read. Keep every screen scannable: the decision or outcome first, in a few words, with numbers in bold. Explanations live in collapsed `<details>` (full rules and key terms on the setup screen, profit breakdown on the result screen, "All the numbers" and "Debrief" on the end screen). The original rules, key terms, worked example and debrief text are kept word for word inside those sections. The stock chart is on by default.

## Class leaderboard (added 2026-10-22)

- Scores are stored in the Realtime Database of the Cold War game (`coldwar-d8109`, asia-southeast1), under `stockshock/scores`, via the REST API with `fetch`. No Firebase library and no rule changes: Sam agreed to share that database.
- Each save: `{n, m, d, t, h, at}` (same fields as the score code plus a server timestamp). Only named, non-private players are saved, once per game (`G.posted`).
- "Last 7 days" uses `orderBy="$key"&startAt=<push id for now minus 7 days>`. Push keys are time ordered, so no `.indexOn` rule is needed.
- Totals shown are always recomputed from `h` with `Engine.run`; malformed rows are skipped. Best score per name and shock set, with a games count.
- Setup has "Keep me off the class leaderboard" (`lbPrivate`). The end screen shows the top 10 plus your row; the Leaderboard tab has a world picker.
- `smoke.js` stubs `fetch` with a fake store, so tests never write to the real database.

## Worlds, teacher code, walking cat (added 2026-10-22)

- Setup offers four worlds (`seqFor` modes): `L` Stable world (Calm waters events), `S` Unsettled world (Rare earth crunch events, default), `H` Chaotic world (Cascade events), each shuffled per game with round 1 calm; `R` Random draws new events every game. Fixed A, B, C remain for old codes and `#seq=A|B|C` links. Leaderboard has one board per world (seed ignored).
- Teacher tab is behind the code `0987` (`TEACHER_CODE`, deliberately low security). Unlocked, it lists every saved game from the last 7 days with a two-click Delete (REST `DELETE stockshock/scores/<key>`).
- End screen has "How JIT and JIC played your shocks": sawtooth stock control charts (`strategyChart`) for pure JIT and pure JIC on the player's own shocks, with a short explanation of each.
- Rounds 3, 6 and 9: a cat walks along the bottom of the screen (`catWalk`). Rounds 3 and 9 it bites the background hills, round 6 it leaves a smiling poo ("Pardon me!"). It stops in the side margin when the window is wide enough so the marks stay visible; on narrow screens the poo fades after a few seconds. Skipped in fast mode and reduced motion.

## Rules version 2 (added 2026-10-22)

- Engine: `Engine.play2(state, lev, card, R)` / `Engine.run(seq, levers, R)` with `R = {v:2, hard}`; without `R` the original rules run unchanged. Constants in `Engine.RULES`. Balance checked with 200 shuffles per world (Stable favours JIT, Unsettled the hybrid, Chaotic JIC/hybrid; Hard has no dominant supplier).
- Levers: `{rl, qty, sup, build}`. Students set the reorder level directly; the game shows the buffer it leaves = reorder level - 800 x this round's delivery time (can be negative: warns of a stock-out).
- Everyone: orders of 2,000+ get 5% off; cans go off after 4 rounds on the shelf (FIFO lots carry their arrival round).
- Hard: global supplier ($12, 2 weeks, full shocks), local ($13, 1 week, no delays, half price rises), build a canning line from round 4 (fixed $2,000 a round, $8 a can, max 1,000 per order, no delays) for cost to make vs cost to buy, capacity utilisation and productivity (4 workers); lost sales cut next round's demand by 25% of cats turned away (rounded to 50). Still one order on the way at a time.
- Score code v2: `{n, m, d, t, v:2, x:hard?1:0, h:[[rl, qty, sup, built?1:0], ...]}`. `decode` handles both versions. Leaderboard boards only count v2 rows, split by world and level; rows also carry `vs` = profit minus pure JIC on the same shocks ("Beat pure JIC by" ordering).
- Benchmarks (`benchLevers`): Standard JIT rl 800 q 800 single, JIC rl 4000 q 2400 single, hybrid rl 1600 q 1200 dual on shock rounds. Hard JIT local rl 800 q 800, JIC global rl 4000 q 2400, hybrid rl 2000 q 1600 local on shock rounds.
- Round screen chart is a sawtooth stock control chart (`stockControlChart`) with reorder level, buffer, maximum stock (buffer + reorder quantity), lead-time brackets and delivery labels; `ccUpdate` moves its lines with the sliders.
- Quick questions (`makeQuestion`, toggle on setup, default on): rounds 2 (reorder level), 5 (buffer from reorder level), 8 (bulk discount cost, or capacity utilisation on Hard once the line is built), and round 4 on Hard (cost to make). Run is disabled until answered; the end screen shows how many were right.
- Teacher tab has a Class view (`classView`, tab 'class'): projector leaderboard plus class average reorder level and quantity and stock-out share by round, refreshed every 15 seconds, optionally limited to the last 60 minutes.
- 2026-10-22 later: round screen is three columns from 1180px wide (round, profit and news | shop and charts | levers), two columns from 761px, one on phones; `main.wide` widens the page for the round view only. News cards are cat food themed (import licence, fish price spike, viral cat video); the rare earths article links were removed and fixed set A is now "Supply crunch". Round screen is two columns from the top (info, shop and charts on the left; levers sticky on the right) so Run is visible without scrolling on 800px-tall screens. Run is greyed out until a question is answered. Under the stock control chart, `profitChart` shows revenue against stacked costs (cans sold, storage, fees/line/spoiled) with a profit marker per round. On Hard the Build line button sits on the Make supplier card.
- Start screen (2026-10-22): the shop picture is the hero, sized to the window height (`.setupscene svg{height:calc(100vh - 100px)}`), with the title and start form beside it; level and world are pill buttons with one description line (`#pickInfo`); the three rule tiles sit below. Start round 1 is visible without scrolling on every laptop/desktop size tested (down to 1024x650 viewport). Sam does not want to scroll to reach Start or Run.
