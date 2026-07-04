# CLAUDE.md — Racecar (Evolutionary Car Simulator)

## What this is

**Racecar** is an evolutionary physics simulation where car designs improve across generations through mutation and natural selection. Cars are procedurally generated polygon bodies with wheels attached to vertices; physics is simulated via Planck.js (Box2D port). Three track challenges: flat sprint, hill climb, ski jump.

Live at: `unisam.nz/racecar/`

---

## File structure

```
racecar/
  index.html      ← simulation (~1257 lines, all-in-one)
  designer.html   ← manual car designer / genome editor (~678 lines)
```

Both files load **Planck.js `0.3.31`** from unpkg CDN and Tailwind CSS from CDN. No other dependencies.

---

## Genome structure

```js
{
  hue:    0–360,        // car colour (HSL)
  points: [{ angle, radius }],  // body vertices in polar coords from centre
  wheels: [{ vertexIndex, radius }]  // wheel attached to a body vertex
}
```

Body is a convex-ish polygon built as pizza-slice triangles from the origin to each adjacent pair of vertices. Vertices are sorted by `angle` to avoid crossing edges.

**Constraints:**
- Points: 3–20 (controlled by UI sliders `MIN_POINTS` / `MAX_POINTS`)
- Wheels: 0–8 (controlled by `MIN_WHEELS` / `MAX_WHEELS`)
- Wheel `vertexIndex` must always be `< points.length` — clamped on mutation

---

## Physics model

| Constant | Value | Effect |
|---|---|---|
| `SCALE` | 40 px/m | World to screen mapping |
| `GRAVITY` | -10 | Standard gravity |
| Body density | 2.0 | Per-slice fixture |
| Wheel density | 1.0 | Per-wheel fixture |
| `POWER_DENSITY` | 80.0 | Torque per unit body area |
| Wheel motor speed | -15.0 rad/s | Clockwise rotation |

**Power is proportional to body area** (shoelace triangle sum). Total torque = `bodyArea × POWER_DENSITY`, split evenly across wheels. This means big bodies are powerful but heavy — the core trade-off.

Collision filtering: body/wheels use category `0x0002` masked against ground `0x0001`, so car parts don't collide with each other.

---

## Track types

| Type | Goal | Finish condition |
|---|---|---|
| `flat` | Fastest time to 100m | `frontX >= TRACK_LENGTH` |
| `hill` | Furthest distance on infinite parabolic hill `y = x²/1000` | Stuck/slid back/time limit |
| `jump` | Max horizontal distance after ski ramp | Landed + 3s post-run timer |

Track geometry is built with Planck.js `Edge` fixtures on a single static body. The hill uses parametric segments. The jump ramp uses a quadratic curve `y = 0.035x² - 2.93x + 61.4` from x=30 to x=50.

---

## Evolutionary algorithm

- Population: 20 (default)
- Selection: best 1 parent (champion), all offspring mutate from it
- Elitism: champion is always copied unchanged into next generation
- Mutation rate decays per generation: `rate *= MUTATION_DECAY` (default 5% per gen, adjustable)
- Fitness: flat = finish time (lower is better) or distance; hill/jump = distance

**Mutation operations:**
- Add/remove body vertices (respects `MIN_POINTS` / `MAX_POINTS`)
- Mutate vertex radius and angle
- Add/remove wheels
- Change wheel radius and `vertexIndex`
- Colour hue drift (rare)
- Mutation bias nudges: `NUDGE_WHEELS`, `NUDGE_WHEEL_SIZE`, `NUDGE_BODY_SIZE` (-1 to +1 slider)

**Safety invariant:** After any mutation that changes point count, wheels with out-of-range `vertexIndex` are clamped to `points.length - 1`. Angles are re-sorted after every mutation.

---

## Simulation loop

`simSpeed` controls the physics steps per `requestAnimationFrame`. Three speeds: Normal (4×), Fast (12×), Realtime (1×).

**Stuck detection:**
- `flat`: stalled < 0.1 m/s for `STUCK_TIME` (3s) → skip
- `hill`: velocity.x < -0.5 → 3s allowed before disqualified
- `jump`: didn't make it past x=50 within `STUCK_TIME` → skip

`getFrontX()` iterates all dynamic body fixtures to find the world's rightmost point (not just the centre of mass), so low-slung cars that inch forward still measure correctly.

---

## Import / Export

Genomes are serialised as JSON `{ points, wheels, hue }`. The "Copy Best" button copies the current generation's best genome. Pasting into the Load textarea and clicking Load seeds the next simulation from that genome (as one member of the initial population).

---

## Car Designer (designer.html)

A standalone editor with:
- Live canvas preview (scaled at 60 px/m, Y-flipped, spinning wheels)
- Per-vertex angle + radius sliders (range + number input, synced)
- Per-wheel size slider + vertex dropdown
- Auto-sort toggle (keeps vertices sorted by angle, prevents self-crossing)
- Dyno stats: body area, total mass, total torque, power/weight ratio
- Copy/paste JSON (compatible with main sim's Import)

Uses the same `CONFIG.POWER_DENSITY`, `BODY_DENSITY`, `WHEEL_DENSITY` constants as `index.html`. Keep these in sync if you change the physics.

---

## Rendering

Canvas coordinate system: Y-flipped (`ctx.scale(1, -1)`), camera tracks the car's centre of mass. Ground is at Y=0 in world space.

Bodies are drawn as coloured triangles (pizza slices) with alternating lightness from the `hue`. Wheels are dark grey circles with two white spokes to show rotation.

`drawOverlay()` renders distance markers at 10m intervals, dynamically generated around the camera position.

---

## Current status

Working. Simulation and car designer both functional across three track types. No known bugs or planned features.
