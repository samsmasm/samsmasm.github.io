# CLAUDE.md — Trees (Forest Evolution)

## What this is

**Trees** is a slot-based forest evolution simulation. Trees compete for light, water, and space across a row of ground slots. Each tree has 11 heritable genes. Climate controls (rainfall, wind, fire) drive evolutionary pressure; traits like bark thickness, root depth, and serotiny are costly but pay off under the right conditions.

Live at: `unisam.nz/trees/`

---

## File structure

Single file: **`index.html`** (~1413 lines). No dependencies.

---

## Slot system

The ground is divided into `numSlots = floor(canvasWidth / CFG.slotW)` slots (14px each). Each slot holds one `Tree` or `null`. Trees cannot share a slot. Slot indices are stable — `slots[i]` is always the tree at horizontal position `(i + 0.5) × slotW`.

`numSlots` changes on window resize. The array is extended or truncated, and `lightArr` (Float32Array) is rebuilt.

---

## Tree genome (11 genes)

| Gene | Range | What it does |
|---|---|---|
| `h` | 0.15–1.0 | Target height as fraction of `maxTreeH` |
| `g` | 0.20–1.0 | Girth (trunk width, wind resistance) |
| `cw` | 0.05–1.0 | Canopy width (shade cast, wind catch) |
| `s` | 0–1 | Seed strategy: 0=few large (shade-germinable), 1=many small |
| `d` | 1–14 | Dispersal: slots of seed spread from parent |
| `r` | 0–1 | Root depth (drought resistance) |
| `b` | 0–1 | Bark thickness (fire resistance) |
| `a` | 0–1 | Allelopathy (suppresses germination nearby) |
| `sr` | 0–1 | Serotiny (seeds sealed, released by fire heat) |
| `ls` | 0–1 | Light preference: 0=shade-tolerant, 1=sun-loving |
| `dorm` | 0–1 | Seed dormancy (how long seeds stay viable in the seed bank) |

**Visual encoding:**
- `s` → foliage colour: deep emerald (0) to bright lime-yellow (1)
- `g` + `h` ratio → morphology: `shapeRatio > 2.0` → conifer shape; ≤ 2.0 → deciduous
- `b` → trunk/bark colour: cream/sandy (thin) to near-black (thick bark)
- `sr` → visible cones (conifer) or dark pod clusters (deciduous) on canopy
- `a > 0.2` → sickly yellow-brown dead zone + dead-grass marks around base

---

## Light model

`computeLight()` runs every simulation frame. Returns a `Float32Array` of light levels (0–1) per slot.

Each tree casts shade based on `h` (height fraction) and `cw` (canopy width gene):
```
maxShade = 0.45 + cwFrac × 0.35  // up to 0.80 per tree
reach    = ceil(canopyRX / slotW) // slots in each direction
```

Shadow is multiplicative (`light[i] *= (1 - shadow)`), so overlapping canopies compound. Minimum light is clamped to 0.01 (even old-growth has some gap light).

---

## Energy model (per frame)

```
gain  = photoEff × waterAccess × photoBase
loss  = hFrac × maintH + g × maintG + cw × 0.022
      + maintBase + r × 0.016 + b × 0.013 + a × 0.020
```

`waterAccess = rainfall + (1 - rainfall) × r × 0.55` — deep roots buffer drought.

`photoEff`: shade-tolerant trees (ls≈0) saturate at 12% light and max at 0.50; sun-loving trees (ls≈1) saturate at 100% light and max at 1.15. This creates a genuine trade-off between understory and canopy strategies.

Reproduction at `energy >= 200`. Cost: 100. Offspring count: `1 + s×9 + rand(0,2)`.

---

## Seed bank

Seeds don't germinate immediately — they enter `seedBank[]` and decay over time:
```
viability = exp(-age / halfLife)
halfLife  = SEED_HALFLIFE × (1 + dorm × 49)  // 1200 to 60,000 frames
```

Seeds with viability below `SEED_MIN_VIA` (0.004) are removed. Each frame, viable seeds have a small chance to germinate if their slot is empty.

**Germination is probabilistic:** `P = 0.28 × shadeFact × (1 - suppression)`
- `shadeFact` penalises small seeds (low `s`) in deep shade
- `suppression` from allelopathic neighbours (up to 0.85)

Max seed bank: 2000 seeds.

---

## Fire system

Triggered stochastically: `P = fireRate × 0.0015` per frame. Each fire starts at a random cluster of slots (radius 2–5).

Per burning slot:
- Spreads to adjacent slots every 25 frames (`P = 0.65`)
- `burnTime = 55 + b×120 + g×20 + rand(0,35)` — thick bark burns much slower
- Fire resistance: `P(survive ignition) = b²×0.65 + g²×0.10`

On death by fire: tree's `seedCache` (serotinous seeds) is dumped into the seed bank.

---

## Wind

`CFG.windDir` drifts slowly each frame `±0.025`, clamped to [-1, 1]. Wind biases seed dispersal direction and increases topple probability for tall, wide-canopied trees:

```
vuln = (h / maxTreeH) × (1 + cw × 0.7) / (g + 0.2)
P(topple) = windStr × vuln × 0.0025
```

Toppled trees spawn a `FallingTree` visual animation (falls in 40 render frames toward wind direction).

---

## Simulation loop

`simulate()` is called `CFG.simSpeed` times per `requestAnimationFrame`. Stats update every 60 frames. Two trait history graphs (Physical and Strategic) track 300-frame rolling averages.

`frameCount` = simulation frames. `animFrame` = render frames. These diverge at high `simSpeed`.

---

## Average tree preview

Top-right panel renders an "average tree" using mean gene values across all living trees. Uses identical drawing logic to the `Tree` class — if visual output looks wrong, cross-check `drawAverageTree()` against `Tree._drawConifer()` and `Tree._drawDeciduous()`.

---

## Key invariants

- `slots.length === numSlots` always. Resize pads or truncates the array and rebuilds `lightArr`.
- `lightArr` is a `Float32Array` — don't accidentally convert to a plain array.
- The seed bank uses `halfLife` per seed at insertion time based on the `dorm` gene at that moment — it doesn't update if the gene changes.
- `stumps[]` fade out over `maxAge` frames. They're purely visual.
- `windParticles` and `raindrops` are arrays of simple `{x, y, ...}` objects, rebuilt in `initParticles()` on reset.

---

## Current status

Working simulation. No known bugs or planned features.
