# Mapic

## Project Overview

Build a browser-based tool for making "GPS art" routes: the user draws a
picture freehand on an OpenStreetMap-based map, or traces an image laid
over the map, and the tool turns the drawing into a route that follows
real roads and paths as closely as possible. The user can then move,
stretch and rotate the drawing to find a spot where the roads fit it
well, and download the result as a GPX route to follow.

Part of the mapping suite: follow `../CLAUDE.md` for the shared header,
map tiles and conventions. Lives at `/mapping/mapic/`.

## Core Principles

-   **Local-first and private:** images and drawings stay in the
    browser. Only map tiles and road-data requests for the visible area
    go to third parties.
-   **The user decides the shape:** the snapped route is a suggestion
    shown next to the drawing, never silently replacing it.
-   **Honest about fit:** show how far the snapped route strays from the
    drawing, so a bad match is obvious.
-   **Reliable over elaborate:** one drawing, one route, done well.
-   **Do not code until asked:** this file is the brief. Do not start
    implementation unless Sam explicitly says to.

## Target Workflow

1.  **Choose an area**
    -   Pan and zoom the map to where the route should go.
2.  **Optional: overlay an image to trace**
    -   Open a local image file (PNG, JPG, SVG). It is shown over the map
        with an opacity slider.
    -   Move, scale and rotate the image. Lock it when done so it does
        not move while tracing.
    -   The image is never uploaded and is not part of the export.
3.  **Draw the shape**
    -   Freehand drawing with mouse, pen or finger, simplified into a
        line with a sensible number of points.
    -   Editing: drag points, delete points, undo/redo, clear.
    -   One continuous line for v1. Pen-up gaps (separate strokes) are a
        later question, since a route has to be one continuous path.
    -   Option for a closed shape (end joins start).
4.  **Snap to roads**
    -   Load the road and path network for the area from Overpass once,
        then route in the browser, so updates are instant and do not hit
        a server on every change.
    -   Method: sample the drawing into points, snap each to the nearest
        usable way, and find shortest paths between consecutive snapped
        points, penalising paths that wander far from the drawn line.
    -   Profile: walking/running or cycling (decides which ways count).
    -   Show the drawing and the snapped route together, in different
        styles, plus distance and a fit score (for example the average
        and worst distance from the drawing).
5.  **Move, stretch and rotate**
    -   Handles on the drawing to move, scale (uniform and per axis) and
        rotate it. The snapped route updates live while dragging.
    -   If the drawing leaves the loaded road area, fetch more (with a
        size cap) or ask the user to zoom in.
6.  **Export**
    -   Download the snapped route as GPX (a track, and possibly a
        `<rte>`), with distance shown.
    -   "Open in GPS Fixer" is not needed for v1.

## Technical Notes and Risks

-   Overpass is free but rate-limited. Cap the area (a few km across),
    cache the result for the session, and show a clear message when a
    request is refused or slow.
-   Road graph: build nodes and edges from Overpass ways, filtered by
    profile (for example no motorways on foot). A* or Dijkstra in the
    browser is fast enough for a few km.
-   Snapping freehand lines is the hard part. Start with the simple
    method above; tune sample spacing against real drawings.
-   Image rotation needs either a small plugin (Leaflet.DistortableImage)
    or a custom CSS transform on an image overlay. Prefer the simplest
    that works on phones.
-   Freehand drawing on touch screens conflicts with map panning: need
    a clear draw mode versus pan mode.

## Scope

### Version 1

-   Image overlay with opacity, move, scale, rotate, lock.
-   Freehand drawing with simplification, editing and undo/redo.
-   In-browser snapping to roads for walk/run or cycle.
-   Fit score and distance.
-   Move, scale and rotate the drawing with live re-snapping.
-   GPX download.

### Possible later enhancements

-   Automatic search: try positions, sizes and angles nearby and suggest
    the best fit.
-   Multiple strokes joined by the shortest connecting path.
-   Hand-off to GPS Fixer or other suite tools.
-   Save and reload a drawing (as a local file).

## Suggested build rounds

1.  Page, map, image overlay and freehand drawing (no snapping),
    including touch. Sam's laptop has a touchscreen, so touch and pen
    drawing must work from the start: use pointer events, a clear Draw
    / Pan toggle (in Draw mode one finger draws, map dragging is off;
    pinch zoom can stay), and test on a touch device.
2.  Road data from Overpass and snapping, with fit score and export.
3.  Move, stretch and rotate with live re-snapping, plus Sam's
    additions (2026-10-13):
    -   Drag the auto-created route by hand: grab any point on the green
        route and pull it onto a different road (a via point the router
        must pass through), as in GPS Fixer's follow-roads lines.
    -   Distance displayed throughout (route length is already shown
        after round 2; keep it visible and live while dragging).
    -   Loops: if the drawing is closed, or its ends are close, let the
        user choose where the start/finish is (click a point on the
        loop). The exported GPX starts there.
    -   Multi-stroke lines: allow two, three or four strokes as separate
        pieces, joined into one line where their ends are close together,
        instead of every new stroke joining on to the end.

## Implementation (round 1, 2026-10-13)

-   Single `index.html`, same Leaflet/CARTO setup and header nav as GPS
    Fixer. Last map view remembered in localStorage `mapic.view`.
-   State `S`: `pts` (LatLngs), `closed`, `img` ({url, nw, nh, c, wm =
    width in metres, rot = degrees clockwise}). Points and `img` are
    replaced, never mutated, so undo snapshots share them. One undo/redo
    history covers drawing and image placement; opacity and lock are not
    recorded.
-   Trace image: an `<img>` (object URL, never uploaded) in a custom pane
    (z 350, between tiles and the drawing), placed with a CSS transform
    from centre, width in metres and rotation. Repositioned on
    `zoom`/`viewreset`, animated on `zoomanim` like Leaflet's
    ImageOverlay. Unlocked + Pan mode: drag the image to move, white
    corner handle to resize (aspect kept), blue handle to rotate.
    "Straighten" sets rotation to 0. No plugin.
-   Drawing: pointer events on the map container. Draw mode disables map
    dragging and double-click zoom and sets touch-action none; a second
    pointer cancels the stroke so pinch zoom still works. Strokes are
    simplified (`L.LineUtil.simplify`, 1.5 px) and join on to the end of
    the line, or the start if begun within 40 px of it (reversed).
-   Pan mode shows a dot per point (drag to move, click to remove), up to
    600 points.
-   Smoke-tested in headless Chrome with a synthetic pen stroke and image.
    Not yet tried on a real touchscreen.

## Implementation (round 2, 2026-10-13)

-   Road data (since 2026-10-13, replacing Overpass): OpenFreeMap vector
    tiles (OpenMapTiles schema), `transportation` layer at z14, URL from
    the TileJSON at tiles.openfreemap.org/planet. CDN, CORS, about 0.5 to
    2 s per tile, cached per tile for the session; 6 parallel fetches,
    3 tries each. Limit 64 tiles (about 15 km across). Small MVT decoder
    inline (`decodeMVT`), no library. Overpass was dropped because the
    public servers were overloaded (random 406/504; a 39 km² query took
    100 s on the mail.ru mirror), so big drawings failed.
-   Tile lines are clipped to the tile (buffer dropped) and points on the
    tile edge are welded to the neighbour's matching point (+-1 unit).
-   Noding in `buildGraph`: tile lines are simplified, so many junctions
    lack a shared point. Segments are split where they cross (same
    layer, not bridge/tunnel) and dead ends are joined to any segment
    within 3 m. Without this only about 65% of the network was
    connected; with it about 90%.
-   `roadRule` decides per profile (foot / bike) which roads count, from
    OpenMapTiles fields (class, subclass, service, oneway, access, foot,
    bicycle). Bike
    respects one-way streets, but the wrong way is kept at 6x cost
    (`WRONG_WAY`) and reported, so routing never fails outright.
-   Graph in local metres (CSR arrays, edges in pairs so `e ^ 1` is the
    reverse). Snapping only uses the largest connected component.
-   Snapping: edge cost = length x (1 + (d / D)^2), d = distance from the
    edge's middle to the drawing (capped at 4D), D = 2% of drawing size
    (15 to 120 m). Anchors every A metres (total / 50, 30 to 250 m) plus
    corners sharper than about 50 degrees, each snapped to the nearest
    node (never a dead-end tip); A* between consecutive anchors.
    `dropDetours` then cuts any loop or out-and-back shorter than
    max(3A, 6D).
-   Fit: distances both ways (drawing to route, route to drawing) sampled
    every max(10 m, size / 400), capped at 6D; shows the mean and the 95th
    percentile, with a word (close / recognisable / loose) from mean /
    drawing size. Loose whenever the 95th percentile hits the cap.
-   After the first snap, any change to the drawing or profile re-snaps
    automatically (250 ms debounce) if the roads are already loaded.
-   GPX: one `trk`, no times, `type` running or cycling.
-   Tested on Wellington: a 12 km drawing loads 42 tiles in about 5 s
    (under 1 s cached), graph build about 350 ms, snap about 300 ms. Foot routes look good. Bike routes in the CBD
    still show a few short stubs from one-way pairs; round 3's route
    dragging is the fix.
-   Testing note: headless Chrome hangs on exit while the beforeunload
    warning is armed; strip it in test copies.

## Decisions

-   Name: Mapic (Sam, 2026-10-13).
-   Touch drawing is in round 1 (Sam, 2026-10-13).
