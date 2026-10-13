# Mapping tools, `/mapping`

A small suite of browser-only map tools. Set up 2026-10-13.

- `index.html`: the hub. Ruled editorial index per `AESTHETIC.md`
  (Tools purple, `#4a1a7a`). A tool that is not built yet is listed as
  plain text marked "Coming", not linked.
- `gpsfixer/`: GPS Fixer (live). Read its CLAUDE.md.
- `mapic/`: Mapic, draw or trace a picture and snap it to roads (rounds 1
  and 2 live). Listed on /tools (Document utilities) and /find. Read its
  CLAUDE.md.
- Longcut (`/longcut`) is a related map tool but stays where it is; the
  hub lists it under "Elsewhere on unisam.nz".

## Conventions for every tool

-   One folder per tool, each a single `index.html` (no build step),
    linked as `/mapping/<tool>/` with the trailing slash.
-   Separate pages, not in-page tabs. Each tool header carries the suite
    nav: "Mapping tools" (hub) plus one underline tab per live tool, the
    current one marked `class="on"`. When a tool goes live, add its tab
    to every tool's header and turn its hub row into a link.
-   Local-first: user files (GPX, images) never leave the browser. Only
    map tiles and, where a tool says so, clicked points or bounding boxes
    go to third parties. Say so in the UI.
-   Map: Leaflet 1.9.4 from unpkg, CARTO Voyager tiles with the key in
    `gpsfixer/index.html` (`CARTO_KEY`), `maxNativeZoom: 18`, attribution
    shown. Never tile.openstreetmap.org (Sam's DNS sends it to 127.0.0.1).
    The key's account details are in `gpsfixer/api.md`, local only.
-   Routing: FOSSGIS OSRM (routing.openstreetmap.de), fair use. Road data:
    Overpass (overpass-api.de) works from Sam's network (checked
    2026-10-13); requests need a normal User-Agent, which browsers send.
-   Moving work between tools: hand GPX text over via sessionStorage,
    never a server.
-   Warn before leaving a page with unsaved edits.
-   New public tools also go in `/tools` and `/find` (see their CLAUDE.md).
