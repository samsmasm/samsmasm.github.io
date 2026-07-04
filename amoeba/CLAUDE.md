# CLAUDE.md — Amoeba (Evolution Simulation)

## What this is

**Amoeba** is a continuous evolution simulation (Stage 7: Behavioral Divergence). Organisms eat food pellets and reproduce, with four heritable genes under natural selection. Metabolic costs are carefully balanced so multiple survival strategies (fast+blind vs slow+sensing) can coexist.

Live at: `unisam.nz/amoeba/`

---

## File structure

```
amoeba/
  index.html     ← current simulation (~513 lines, all-in-one)
  index1.html    ← earlier version (~887 lines) — kept for reference, not live
```

Single canvas, full-screen, dark background (`#0d1117`). No external dependencies.

---

## Genome (4 genes)

| Gene | Range | Effect |
|---|---|---|
| `speed` | 0.5 – ~5.5 | Movement speed; cost is **quadratic** (speed² × 0.05) |
| `size` | 0.5 – ~1.2 | Body size multiplier; cost is linear |
| `jitter` | 0 – 0.8 | Wander/noise when not hunting; cost is quadratic (jitter² × 0.5) |
| `senseRange` | 0 – 250px | Detection radius for food; cost is linear per pixel |

**Visual encoding:**
- Body colour: speed → hue shift, purple (slow) to red (fast) `hsl(280 - speedNorm*280, 100%, 50%)`
- Outline colour: jitter → same hue mapping
- Sense circle drawn at low opacity if `senseRange > 5`

---

## Metabolism (energy per frame)

```
loss = baseMetabolism           (0.05)
     + speed² × speedCostFactor (0.05)
     + size × sizeCostFactor    (0.05)
     + jitter² × jitterCostFactor (0.5)
     + senseRange × senseCostFactor (0.002)
```

During infancy (`age < 300 frames`): `loss × 1.5`. This penalises newborns that happen to reproduce in a rich patch before proving long-term viability.

**Key design intent:** Speed cost is quadratic — doubling speed costs 4× as much energy, preventing runaway speed evolution. Jitter is also quadratic for the same reason.

---

## Behaviour

Each frame, organism checks within its `senseRange` for the closest food pellet. If found, it steers toward it (direct velocity toward target). If no food in range, it wanders: angle drifts by `jitter × random(-0.5, 0.5)`.

Bounce off canvas walls (velocity component negated).

---

## Reproduction

Threshold: `energy >= 250`. Cost: 120 energy. Offspring spawned ±5px from parent. Each gene mutates independently with probability 0.5; magnitude scales with `CONFIG.mutationRate × 2`.

Mutations are clamped:
- `speed >= 0.5`
- `size >= 0.5`
- `jitter >= 0`
- `senseRange >= 0`

---

## Food

Spawned as green circles (shade encodes nutrition: bright = high). Eaten when organism centre is within `organism.radius + food.size`. Nutrition gain: `(15 + nutrition × 40) × foodNutritionMulti`.

Organism `radius = baseRadius × genes.size + energy × radiusScale`. Larger energy = visually bigger body.

Population cap on food: 3000 pellets.

---

## CONFIG constants

```js
reproThreshold:  250     // energy needed to reproduce
reproCost:       120     // energy cost of reproducing
speedCostFactor: 0.05    // quadratic speed energy cost per unit² per frame
jitterCostFactor: 0.5   // quadratic jitter energy cost per unit² per frame
senseCostFactor: 0.002  // linear sense range energy cost per px per frame
infantDuration:  300    // frames of higher metabolism after birth
```

Changing `reproThreshold` has large downstream effects — lower = faster population growth, less selection pressure per generation.

---

## Current status

Working. Stage 7 (Behavioral Divergence) is the live version in `index.html`. `index1.html` is an earlier reference backup — do not modify it. No known bugs or planned features.

---

## UI sliders (live, affect `CONFIG` directly)

| Slider | Config key | Default |
|---|---|---|
| Algae Growth | `foodSpawnRate` | 0.10 |
| Mutation Rate | `mutationRate` | 0.10 |
| Food Nutrition | `foodNutritionMulti` | 1.0 |

Stats panel updates every 10 frames: food count, organism count, avg speed, avg sense.

---

## Constraints

- Single file. Keep all HTML/CSS/JS in `index.html`.
- `index1.html` is a reference backup — do not modify it.
- The simulation auto-restarts from a single organism if the population hits zero after frame 100.
