# CLAUDE.md — Longcut

## What this is

**Longcut** is a quiet-route A* pathfinder. Given a start and end point on a map, it finds the most pedestrian/cyclist-friendly route (preferring footpaths, avoiding main roads) while staying within a user-set detour factor. Built on Leaflet + OpenStreetMap data via the Overpass API.

Live at: `unisam.nz/longcut/`

---

## File structure

Single self-contained file: **`index.html`** (~983 lines). No build step, no dependencies beyond CDN. Keep it that way.

CDN dependencies (pinned, do not upgrade without testing):
- Leaflet `1.9.4` (map rendering)
- Overpass API (OSM data) — tries 3 mirrors in order

---

## Architecture

### State object `S`

All mutable state lives in a single global `S = {}`:
- `S.graph` / `S.nodes` — the OSM road graph (built from Overpass response)
- `S.mainComp` — Set of node IDs in the largest connected component
- `S.startId` / `S.endId` — snapped start/end node IDs
- `S.anchors` — ordered array of node IDs `[start, ...waypoints, end]`
- `S.penalties` — Map of edge penalties (accumulated by Regenerate)
- `S.routePath` — current path as node ID array
- `S.route` — current path as `{lat, lon}` array
- `S.detour` / `S.stretch` / `S.mode` / `S.quietness`

### Pipeline (per run)

1. `fetchOSM(bbox)` — Overpass query for all walkable/cycleable highways in bbox
2. `buildGraph(data, mode)` — build bidirectional weighted graph from OSM ways
3. `largestComponent(graph)` — find the biggest connected subgraph
4. `snapNode(lat, lon, nodes, valid)` — snap click point to nearest routable node
5. `aStar(...)` — A* with cost multipliers, ellipse pruning, and optional penalties
6. `renderRoute(path, ...)` — draw coloured polyline on map + stats

### Cost model

Each edge has `baseMult` (cost multiplier) and `points` (niceness score 0–10).

Walk cost multipliers (lower = preferred):
- `footway/path`: 1.0 — preferred
- `cycleway`: 1.2
- `residential/living_street`: 2.5
- `tertiary`: 4.0
- `secondary`: 6.0
- `primary`: 9.0

The **stretch slider** linearly scales non-path multipliers: `mult = 1 + (baseMult - 1) * stretch`. At stretch=0 all roads are equally cheap; at stretch=1 full avoidance. This does not affect the A* heuristic admissibility because path cost (baseMult=1) is unchanged.

### Parallel-path reclassification (critical gotcha)

A path that runs alongside a road might be a pavement (access to the road) or a genuinely separate cycleway/footpath. The code classifies these by measuring **connections per km**: if ≥3 connections/km, it's demoted to the road's class. This prevents the router from routing along every pavement and scoring them as quiet paths.

### OSM graph fragmentation (critical gotcha)

**Never skip short edges** when building the graph. Short edges at junctions and curves are load-bearing for connectivity. Removing them (even for "optimisation") fragments the graph into thousands of disconnected islands and makes routing fail silently. The only skip condition is `d === 0` (co-located duplicate nodes).

### Regenerate

Accumulates a penalty map: each click penalises every edge of the current route by ×2.4. A* then steers around it. Penalties accumulate across clicks, so 3 regenerates make the original route very expensive.

### Waypoint drag editing

Drag the route line to pull it through a new waypoint. Uses a **windowed local repair**: only re-routes within `win` km of the grab point, then splices back in. Window grows with drag distance. Uses a generous local detour factor (min 4) because short legs may need to bow out significantly.

---

## Key constraints

- Max route length: 25 km (crow-flies). Checked before fetching OSM.
- Overpass query tries 3 mirrors; moves on after 429 (rate limit). All mirrors failing throws an error to the user.
- Node IDs are normalised to **strings** throughout. Inconsistent type (int vs string) breaks Map/Set lookups silently — never use integer node IDs.
- A* iteration limit: 500,000. If hit, routing fails (no route found message).
- The `inEllipse` bound uses `detourFactor * 1.6 + 0.4 km buffer` to avoid over-pruning curved routes (straight-line underestimates real paths).

---

## Current status

Working and stable. All core features shipped: A* routing, quiet-preference cost model, parallel-path reclassification, waypoint drag editing, Regenerate, walk/bike modes, detour/stretch sliders, quietness score.

**Not built:** Touch/mobile drag support for waypoints (drag-the-route editing is mouse-only).

**No known bugs.**
