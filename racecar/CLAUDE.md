# CLAUDE.md: Racecar (evolving cars), `/racecar`

A population of random polygon cars races on a Planck.js (Box2D) track. The best breed (tournament selection, crossover, mutation) and over generations they evolve to sprint, climb, jump and cross rough ground. Linked from /experiments and /find.

History: the original single-champion version (Dec 2025) was replaced on 2026-11-11 by the "Arena Edition" (was `/racecar2`, June 2026) plus the fixes below. `/racecar2/` is now a redirect stub. The old code is in git history.

## Files

```
racecar/
  index.html     page markup + CSS (AESTHETIC.md Option B, paper and ink)
  app.js         page logic: live arena rendering, panels, background worker pool
  sim.js         SHARED: genome, mutation/crossover, tracks, Race class, fitness, evolve. No DOM.
  worker.js      background racer: races a slice of the population, returns results
  designer.html  hand-build a car (uses sim.js for geometry and stats, no Planck)
  test/run.sh    headless Node tests of sim.js (installs Planck into ~/.cache/racecar-test)
```

Planck.js **0.3.31** from unpkg. Its browser build passes `window` to its UMD wrapper, so worker.js and test/run.js set `window = self/global` before loading it. Keep that.

**Run `racecar/test/run.sh` before committing** any change to sim.js (optional arg: generations for the evolution check, default 25; hill takes several seconds per generation).

## Genome (plain data, postable to workers, saved as JSON)

```js
{ hue, points: [{angle, radius}], wheels: [{angle, radius}], motorSpeed, density, suspHz, suspDamp }
```

- Point angles are kept in [0, 2pi) and sorted (`RC.normalize`).
- **Wheels are stored by angle**, mounted where a ray from the centre at that angle meets the body outline (`RC.mountPoint`). They used to store a corner index (`vertexIndex`), which broke heredity: re-sorting after a mutation silently moved wheels, and crossover put a parent's wheels on unrelated corners of the other parent's body (84% of wheels moved > 0.5 m). Never go back to indices.
- `RC.fromData` still reads old exports (vertexIndex, missing tuning genes) from racecar, racecar2 and the old designer.

## Physics

Torque = body area x 80 (`POWER_DENSITY`), split across wheels. Body density is a gene (0.4 to 4), wheel density 1. Motor speed (gearing), suspension Hz and damping are genes. Cars only collide with the ground (category bits). Body is pizza-slice triangles from the origin; slices under 0.01 m² are skipped because Planck silently turns degenerate polygons into a 2 m box.

## Tracks

flat (fastest to 100 m), hill (`y = x²/1000`), jump (ski ramp, gap 50 to 65 m), rough (three sine layers, **new seed every generation**, same for every car in that generation, bumps grow with distance). `RC.groundHeight` is the single source for track shape (used for the distance markers too).

## Evolution

`RC.evolve(entries, cfg)` with entries `[{genome, r}]`: 2 elites, 2 random immigrants, rest are `mutate(crossover(tournament, tournament))`, k = 3. Crossover takes one parent's whole body or splices an arc of corners from one onto the other; wheels come as a set from one parent. Mutation rate decays per generation with a 3% floor. Fitness penalises sliding (up to half the distance). `score` is the human number for the graph: distance, or for the sprint, average speed (non-finishers get distance / time limit so they sit below finishers).

## Background evolution

"Evolve" spreads each generation across `hardwareConcurrency - 1` workers (max 8), each racing its slice of the population in its own world with the same terrain seed, then evolves on the main thread. Cars never touch, so on smooth tracks this gives identical results (tested). On rough and jump, Planck's contact order depends on which cars share a world and bumps amplify float differences, so a car never repeats its exact run there (true in the live arena too). Measured: about 1 s per sprint generation in the browser versus 10 to 60 s watching at 4x. Workers need http(s); opening index.html as a file shows a message instead.

## Status

Working and tested 2026-11-11 (Node tests + headless Chrome: live race, 10-generation background run, track switch mid-run, legacy JSON load, designer to race hand-off, phone layout). Deferred idea (Sam not yet asked): evolve a small "driver" network for throttle and mid-air leaning.
