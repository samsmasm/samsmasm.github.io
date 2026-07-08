# CLAUDE.md — Longcut

## What this is

**Longcut** is a quiet-route A* pathfinder. Given a start and end point on a map, it finds the most pedestrian/cyclist-friendly route (preferring footpaths, avoiding main roads) while staying within a user-set detour factor. Built on Leaflet + OpenStreetMap data via the Overpass API.

It also has a second mode, **Wild spot** (🏕 tab): pick an area (box or circle) and it finds the point in that area farthest from any road, with a distance heatmap.

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

## Wild spot mode

UI: `#mode-tabs` switches `body.wild-mode`, which shows `.wild-only` panel sections and hides `.route-only`. A `uiMode` guard on the shared map `click` handler keeps route pin-placing out of wild mode. All wild state lives in a second global `W = {}`.

### Pipeline (per run, `runWild`)

1. User draws a **box** (mousedown-drag, map panning disabled while armed) or **circle** (click centre, mousemove preview, click to fix radius). Esc cancels.
2. `fetchWildData` — one Overpass `out geom` query (no child-node resolution) for: drivable highways (`WILD_ROAD_RE`; `service` and paths/tracks each opt-in via checkbox), `natural=coastline` (always), and `natural=water` ways/relations + `waterway=riverbank` (when "Ignore lakes & rivers" is ticked). Bbox is **padded** so roads just outside the area still count.
3. Segments projected to local equirectangular km coords (`makeProj`); road segs bucketed into a spatial hash (`buildSegIndex`); water way-fragments stitched into closed rings (`assembleRings` — multipolygon outers are often split across ways; inner rings included so even-odd PIP makes islands land again).
4. `buildExclusion` — water mask on the scan grid. Rasterize water-boundary segments onto grid cells (thickened 3×3 so flood fill can't leak through corner clips), flood-fill remaining cells into regions, classify each region with ONE representative test: **sea** = point is right of the nearest coastline segment (OSM: water on the right of way direction), **lake** = even-odd point-in-polygon. Boundary cells get exact per-point tests. Region trick avoids per-point coastline ring searches, which would be quadratic-slow inland.
5. `scanGrid` — coarse grid, ~22.5k samples regardless of area size (auto-coarsens, min cell 8 m), skipping excluded cells. Point→road distance via `nearestRoad`: expanding ring search over hash buckets, ring perimeters only, early exit.
6. `topCandidates` + `refinePoint` — top 5 mutually-separated candidates, three zoom passes of a 13×13 local grid each (final precision ~cell/50), also skipping excluded points.
7. **Boundary-correctness loop:** if the winning distance exceeds the fetch pad, refetch with `pad = best*1.5` and redo (max 3 attempts).
8. Render: 🏕 marker, dashed line to the nearest road point, canvas-based `L.imageOverlay` heatmap in the chosen colour (`HEAT_COLS`; transparent for water/outside; canvas rows flipped — row 0 north, grid row 0 south).

### Options & preferences

- Sea is **always** excluded; "Ignore lakes & rivers" (default on), "Count driveways & service roads" (default off), "Count paths & tracks" (default off).
- Heatmap colour: green/blue/ember select.
- **Map style** select (both modes, bottom of panel): Carto light (default), Carto voyager, classic OSM, Carto dark — `BASEMAPS` + `setBasemap()`.
- All of the above persist in `localStorage` key `longcut-prefs` (`prefs` / `savePref()`).

### Gotchas

- Coastline side-test uses the nearest segment only — fine in practice, but an area drawn entirely offshore with no coastline in the padded bbox is unknowable and treated as land.
- Overpass mirror fallback is shared with route mode via `overpassFetch(q)` — `fetchOSM` is now a thin wrapper over it.
- `.sect label.chk` needs that full selector: plain `.chk` loses specificity to `.sect label`'s uppercase styling.
- The map spinner text is set per-mode (`run()` and `runWild()` each set `textContent` before showing it).

---

## Current status

Working and stable. All core features shipped: A* routing, quiet-preference cost model, parallel-path reclassification, waypoint drag editing, Regenerate, walk/bike modes, detour/stretch sliders, quietness score, Wild spot mode (farthest point from a road).

**Not built:** Touch/mobile drag support for waypoints (drag-the-route editing is mouse-only). Wild spot box-drawing is also mouse-only (circle mode works with taps).

**No known bugs.**
