# CLAUDE.md: Amoeba (evolution in a dish), `/amoeba`

Amoebas eat food pellets, split when full and pass on four genes with small mutations. Sliders change the world
(food supply, water thickness, food rot, mutation size) and a graph shows what evolves. Not linked from any index
yet (see the root CLAUDE.md list of unlinked games).

History: two single-file versions from Dec 2025 / Mar 2026 (`index.html` "Stage 7", `index1.html` with poison
and ageing) were replaced on 2026-11-13 by this version. Both are in git history. Headless runs showed the old
pages supported only about 3 to 15 amoebas, died out 20 to 321 times per hour of play, and never evolved
more than one strategy.

## Files

```
amoeba/
  index.html      page markup + CSS (AESTHETIC.md Option B)
  app.js          drawing, controls, fast forward, history graph
  sim.js          SHARED: World class, genes, costs, mutation, food grid. No DOM. window.AM or require()
  REVIEW.md       open questions with evidence, for a targeted review by a stronger model
  test/run.sh     headless Node tests of sim.js (about 15 s)
  test/browser.js headless Chrome checks (desktop, phone, controls, fast forward)
```

**Run `amoeba/test/run.sh` before committing** any change to sim.js.

## World

Fixed 1200x800 world (every screen runs the same world, scaled to fit). Food arrives at 1.5 pellets per tick
times the Food supply slider, cap 2000. A 40px grid makes food lookups local, which is what makes fast forward
possible (the old page checked every pellet for every amoeba each frame). If everything dies, 15 random
amoebas are seeded and the Extinctions counter goes up (rare now).

## Genes and costs

Genes: `speed` [0.5, 4], `size` [0.5, 3], `jitter` (wobble when no food is in sight) [0, 1], `sense` [0, 250].
Energy per tick: `0.05 + speed² x 0.05 x thickness + size² x 0.1 + jitter² x 0.5 + sense x 0.002`, times 1.5
for the first 300 ticks of life. Split at 250 energy; the child gets 120. Each gene mutates with probability 0.5
by up to `mutation x` (1, 1, 0.5, 50) per gene, clamped to its limits.

Why these limits: without a ceiling size ran away to 8 to 24, and speed could lock into an arms race (speed 5 to
7.5, about 15 alive, food piling up). Speed ceiling 4 stopped that in tests; 5 did not.

## What the sliders do (measured)

- **Food supply** mostly changes the head count, not the genes: the population grows until the food lying around
  is back to about the same level. Food x4 multiplied the population by about 6.5 and moved speed by about 40%.
- **Water thickness** is the reliable lever: x0.5 evolves speed about 3, x2 about 1.3.
- **Food rots** (Never / Slowly 150 ticks / Quickly 50 ticks), drawn fading to brown. The result depends on
  history. Switched on in a settled dish, speed drops (Quickly: 1.8 to 2.4 down to 1.5 to 1.8 in all four
  seeds tested, after 180k ticks; Slowly: a smaller drop). Started with rot already on, it goes the other way:
  speed 2.6 to 3.75, sense 73 to 117, only 12 to 43 alive. Sam spotted the drop in the browser (2026-11-13).
- Sense ignores its own cost (see REVIEW.md).

## Page details

- Watch = 1 tick per frame, 5x, Fast forward = as many ticks as fit in 22 ms per frame (about 240x on a laptop).
- History graph keeps up to 600 samples from the start; when full it drops every other one and halves the rate.
- Below 860px the panel moves under the dish and the page scrolls.
- No modals, no emoji.

## Checking in a browser

Serve the repo root with `python3 -m http.server 8765 --bind 127.0.0.1`, then
`node amoeba/test/browser.js <screenshot dir>` (Puppeteer from `~/.cache/sw-test`, `/usr/bin/google-chrome`).

## Status

Rebuilt and tested 2026-11-13 (Node tests + headless Chrome on desktop and phone). Open questions are in
REVIEW.md.

**Next step:** work through REVIEW.md on Claude Fable (`/model` in Claude Code), diagnosis only: measure, explain,
propose small rule changes, then stop for Sam to pick. Switch back to Opus to build the chosen fixes. Fable costs
about 2.5x Opus, so keep it to the reasoning-heavy part (see the root CLAUDE.md, Evolution simulations).
