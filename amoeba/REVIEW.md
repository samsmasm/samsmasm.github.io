# Amoeba: targeted review list (for a stronger model)

Open questions found while rebuilding amoeba on 2026-11-13. Each one has the evidence so far and a concrete
question. All numbers are from headless runs of the rules now in `sim.js` (1200x800 world, 1.5 pellets per tick).
Measure with seeded `new AM.World(seed, settings)` runs in Node; don't reason from the code alone.

## 1. Sense range ignores its own cost
Halving or doubling the sense cost left evolved sense at 53 to 56 every time; only the population size changed
(155 to 181 alive at half cost, 65 to 81 at double). Speed responds cleanly to its cost (thickness x0.5 gives
speed about 3, x2 gives about 1.3). Guess: the crowd adjusts how much food is lying around until about 55 is
just enough to see the nearest pellet. Unproven.
**Question:** what pins sense, and what small rule change would let the environment move it?

## 2. "Best" sense from probes disagrees with evolution
Fixed-gene "ghost" probes (they record what they would eat without removing it, energy held at 150) netted
0.337 energy per tick at sense 120 against 0.123 at sense 60, yet populations started at sense 120 evolved back
down to about 56. Either the probe method is biased (fixed mouth size, no infancy, ghosts never lose a pellet
they are chasing to themselves) or something over a lifetime (the 300-tick infancy at 1.5x cost, mouth growing
with stored energy) outweighs adult intake.
**Question:** is the probe wrong, or is selection on sense really driven by something other than adult intake?

## 3. Food rot: opposite results depending on when it starts
At normal food an uneaten pellet lasts about 35 ticks before something eats it.
- Rot switched on in a settled dish (100k ticks without rot first, then 200k with): speed fell in all 4 seeds.
  Quickly (50 ticks) 2.43 / 2.07 / 1.80 / 1.94 down to about 1.6 / 1.7 / 1.8 / 1.75; Slowly (150) a smaller
  drop. The population dipped to about 60 to 90 and mostly recovered. Sam saw the drop in the browser first.
- Rot on from the start (200k ticks, 4 seeds): Slowly no consistent change; Quickly gave speed 2.6 to 3.75,
  sense 73 to 117, only 12 to 43 alive, food sitting 100 to 210 px from the nearest amoeba (63 to 79 without rot).
- Older prototype runs at 400 to 3000 ticks changed nothing; 20 ticks starved everything.
Guess (unproven): in a crowd, the pellets that rot are the far ones, which are what speed is for, so rot removes
speed's payoff. From scratch, food rots before slow amoebas reach it, so fast long-range hunters take over and
then keep food sparse, which keeps rewarding speed. Same two-state problem as item 4.
**Question:** is that the mechanism, and is the two-state result something to show students on purpose (it is
real ecology) or to remove?

## 4. Is the speed ceiling of 4 enough?
Without a ceiling some runs lock into an arms race: speed 5 to 7.5, sense 150 to 180, about 15 alive, food
piling up, and it lasts 500k ticks. A ceiling of 4 stopped it in the two seeds that showed it; a ceiling of 5
did not (speed 4.45, 22 alive). Only two seeds were tested, all at thickness 1.
**Question:** does the ceiling hold across many seeds and at thickness 0.5, where the best speed (about 3)
sits close to the ceiling? Is there a rule-based fix rather than a cap (the arms race comes from "first to reach a
pellet gets it")?

## 5. The size gene is dead
Now that size costs by area (size squared), evolved size sits on its floor (0.54 to 0.58) in every run. Bigger
bodies have a bigger mouth but it never pays. Before the change, size had no ceiling and ran away (8 to 24).
**Question:** give size a real trade-off (for example bigger is slower, or bigger survives longer without food)
so it settles somewhere interesting, or remove the gene.

## 6. Only ever one strategy
Every run ends with one lineage and one strategy; no blind grazer (sense under 20) has ever survived. Food in
drifting patches roughly doubled the spread in speed and once gave two separate speed groups, but not reliably.
**Question:** what is the smallest change that gives two strategies living side by side?

## Smaller things
- `sim.js` mutation clamps at the limits, so genes pile up exactly on a bound. Reflecting off the bound would
  avoid that; check whether it changes outcomes.
- Mouth radius grows with stored energy (`energyRadius`), so a full amoeba catches more. Kept from the old page
  untested.
- Switching rot on or off only affects new pellets; existing pellets keep their old lifetime.
- `app.js` fast forward spends 22 ms per frame on steps. Fine on a laptop (about 240x real time); check it does
  not make a slow phone janky.
