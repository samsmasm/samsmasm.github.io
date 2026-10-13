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
3.  Move, stretch and rotate with live re-snapping.

## Decisions

-   Name: Mapic (Sam, 2026-10-13).
-   Touch drawing is in round 1 (Sam, 2026-10-13).
