# CLAUDE.md — Walker (Creature Evolution)

## What this is

**Walker** is an evolutionary simulation where procedurally generated creatures made of bones and muscles learn to walk. Physics is custom Verlet integration (no external library). Each generation, the top survivors' traits are inherited by the next population.

Live at: `unisam.nz/walker/`

---

## File structure

Single file: **`index.html`** (~800 lines). No dependencies.

---

## Physics engine

Custom Verlet integration. No external library.

| Constant | Value | Notes |
|---|---|---|
| `WORLD_WIDTH` | 115 | Total track length in world units |
| `TRACK_START` | 3 | Where creatures begin |
| `TRACK_FINISH` | 103 | Finish line — 100-unit track |
| `DT_BASE` | 1/60 | Physics timestep |
| `ITERS` | 10 | Constraint solver iterations per step |
| `GRAVITY` | 40 | Downward acceleration |
| `FRICTION` | 0.88 | Air resistance multiplier per step |
| `GND_FRICTION` | 0.40 | Ground contact friction (velocity damping) |
| `MUSCLE_BREAK` | 8 | Max stretch before muscle snaps |
| `MAX_CONN_LEN` | 5 | Max rest length of a connection |

---

## Genome structure

```js
{
  nodes: [{ x, y }],          // initial positions of point masses
  conns: [{
    type: 'bone' | 'muscle',
    a, b,                      // indices into nodes[]
    restLen,                   // target length
    // muscle only:
    contractionFactor,         // 0.4 – 0.8 (how much it shortens)
    frequency,                 // 0.5 – 3 Hz
    phase                      // 0 – 2π
  }],
  groups: [{                   // collinearity groups
    a, b,                      // bone connection indices
    attachPts                  // constraint: attachment points stay collinear
  }]
}
```

**Groups** enforce collinearity of attachment points on bones. This prevents the creature twisting into a degenerate flat form. Without groups, unconstrained muscles can exploit degenerate poses. Groups should be maintained when mutating bone connections.

---

## Muscles

Muscles alternate length each cycle:
```
targetLen = restLen × (1 - contractionFactor × sin(2π × frequency × t + phase))
```

A muscle snaps permanently if stretched beyond `MUSCLE_BREAK` units (actual length, not target). Snapped muscles are removed from `conns[]` at the start of the next generation reset.

---

## Fitness function

```
score = distance if did not finish
score = 100 + (TIME_CAP - finishTime) × SPEED_BONUS if finished
```

- `TIME_CAP = 120` seconds
- `SPEED_BONUS = 10` — a creature finishing in 60s scores `100 + 60×10 = 700`
- Non-finishers: score = raw x-position (0–100)

This creates a clear priority: finish at all > finish fast.

---

## Reproduction modes

Toggled via UI:

**Sexual (crossover)**
- Parents sampled from top 50% survivors
- New genome: take parent with more nodes as base
- Muscle params blend at 40% rate from the other parent
- Point positions and connection topology from base parent

**Asexual (clone + mutate)**
- Champion copied unchanged (elitism)
- All others are mutated clones of the champion

Mutation operations: node position perturbation, rest length adjustment, add/remove nodes, add/remove connections, muscle param drift.

---

## Rendering

Two render modes:
- **Normal** (speed < 100×): full Canvas 2D render each animation frame
- **Headless** (speed ≥ 100×): skips main canvas render entirely, only updates stats

Creatures drawn as circles (nodes) connected by lines (connections). Bones are drawn grey; muscles change hue based on current contraction state (contracted = warm, extended = cool).

Ground is a horizontal line at Y=0. Distance markers drawn at 10-unit intervals.

---

## Champion preview box

230×188px canvas in the top-right corner. Shows only the current-generation champion creature. Controls:
- Speed slider: 0.1 – 2.0× (independent of main sim speed)
- Zoom slider: 4 – 40 world-units visible

Preview maintains its own physics state (separate node positions) so it doesn't interfere with the generation run.

---

## Stall detection

Per creature, tracked each generation:
- Records last `stallTime` seconds of x-position history
- If movement in that window < `stallDist`, creature is disqualified (scored at current distance)

This prevents creatures that get stuck from consuming the full generation time.

---

## UI controls

- **Speed** slider: physics steps per animation frame (1–200; ≥100 = headless)
- **Population** input: creatures per generation
- **Reproduction mode** toggle: sexual / asexual
- **Reset** button: new random population, clears history

Stats panel: generation number, best score, avg score, finish rate.

---

## Constraints

- Single file. Keep all HTML/CSS/JS in `index.html`.
- Groups must be maintained when modifying bone connections — a group referencing a deleted connection index causes silent physics errors.
- `contractionFactor` must stay in `[0.4, 0.8]` — values outside this range cause muscles that are always contracted (< 0.4) or that over-extend and instantly snap (> 0.8).

---

## Current status

Working. Custom Verlet physics, sexual and asexual reproduction modes, champion preview all functional. No known bugs or planned features.
