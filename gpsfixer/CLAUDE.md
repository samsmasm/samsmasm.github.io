# GPX Track Repair

## Project Overview

Build a small, reliable browser-based tool for repairing GPS tracking
gaps in GPX files. The primary use case is fixing activities recorded by
apps such as Strava when GPS tracking stops temporarily, leaving an
inaccurate straight line between the last recorded point before the gap
and the first recorded point after it.

The user uploads a GPX file, edits the missing section directly on an
OpenStreetMap-based map, recalculates timestamps for the reconstructed
points, and downloads a repaired GPX file that can be uploaded to
Strava.

This is primarily a personal tool. Other people may use the website too,
but accounts, logins, cloud storage, and server-side file processing are
not required.

## Core Principles

-   **Local-first and private:** GPX files must be processed in the
    user's browser. Do not upload, transmit, or store activity files on
    a server.
-   **Free and straightforward:** Avoid subscriptions, paywalls,
    unnecessary accounts, and dependence on paid services.
-   **Reliable over elaborate:** Prioritize correct GPX handling and a
    predictable editing workflow over extra features.
-   **User-controlled repair:** The user decides where the route went.
    Do not silently invent a route and treat it as fact.
-   **Preserve the original:** Keep the uploaded track unchanged in
    memory as a reference and allow the user to reset or undo edits.
-   **Do not code until asked:** At this stage, this file is the project
    brief. Do not start implementation unless explicitly instructed.

## Target Workflow

1.  **Open a GPX file**
    -   Let the user select a local `.gpx` file.
    -   Parse it in the browser.
    -   Display the recorded track on an OpenStreetMap-based map.
    -   Retain the original data in browser memory only.
2.  **Identify a GPS gap**
    -   Make suspicious straight-line sections easy to see.
    -   Show useful context around the gap, including the recorded
        points before and after it and their timestamps.
    -   The user can select the section they want to repair.
    -   Avoid automatically declaring every straight line to be an
        error. Some straight sections may be genuine.
3.  **Repair the route geometry**
    -   Let the user redraw the missing section on the map by adding,
        moving, or dragging route points, or by drawing a replacement
        path between the recorded points at either end.
    -   Keep the existing valid points outside the selected gap
        unchanged.
    -   Show the edited route and update the estimated distance as the
        user edits it.
    -   Make the distinction between recorded GPS points and
        reconstructed points clear.
    -   Provide undo/reset controls so the user can recover from
        mistakes.
4.  **Calculate timestamps**
    -   Treat route geometry and timestamp calculation as separate
        stages.
    -   Once the user is satisfied with the path, they explicitly choose
        an action such as **Calculate timestamps**.
    -   Use the timestamps of the valid points immediately before and
        after the gap to establish the time available for the
        reconstructed section.
    -   Assign a timestamp to every reconstructed GPX point. The
        timestamps must progress in order and fit within the time
        interval between the two surrounding recorded points.
    -   Use distance along the reconstructed route to distribute the
        elapsed time proportionally as the initial default. This implies
        a constant average speed across the repaired section.
    -   Clearly indicate that these timestamps are estimates, not
        recovered GPS measurements.
    -   Validate that the resulting timestamps are chronological and do
        not conflict with surrounding points. If the route length and
        available time imply an implausible speed, warn the user rather
        than silently changing the recorded times.
5.  **Review the repair**
    -   Show the original and repaired route for comparison.
    -   Show the repaired section's distance and elapsed time, plus the
        activity's updated total distance.
    -   Make it clear that the repaired distance is an estimate based on
        the path drawn by the user.
    -   Let the user revise the geometry and recalculate timestamps if
        necessary.
6.  **Export**
    -   Generate a valid GPX file in the browser.
    -   Preserve valid original points, timestamps, and relevant GPX
        metadata wherever possible.
    -   Replace only the repaired section and any data that must change
        to represent it correctly.
    -   Download the repaired file locally.
    -   The intended next step is for the user to upload this file to
        Strava, which will calculate distance from the uploaded track.
        Do not promise that Strava will accept every file or calculate
        exactly the same distance as this tool.

## Timestamp and Distance Requirements

The repair must account for both space and time:

-   The beginning and end of a GPS gap have known locations and
    timestamps.
-   The route drawn between them determines the reconstructed distance.
-   The time interval is determined by the existing timestamps at either
    end.
-   The reconstructed points need timestamps so the output remains a
    coherent time-stamped track.
-   Changing the route geometry changes the route distance and therefore
    changes the estimated timestamps when they are recalculated.

For the first version, use distance-proportional timestamp
interpolation. Do not attempt to infer detailed changes in pace, stops,
or acceleration inside the missing section because the missing GPS data
cannot establish those reliably.

If a GPX file contains multiple tracks, segments, or timestamp gaps,
preserve its structure and avoid joining separate tracks or segments
accidentally. If the file format or data is unsupported, explain the
issue clearly instead of silently discarding data.

## Interface Requirements

Keep the interface focused on the repair task.

-   A clear GPX upload control.
-   A large interactive map.
-   A visible distinction between the original track, the repaired path,
    and the selected gap.
-   Distance and time information relevant to the selected repair and
    whole activity.
-   A clear separation between editing the route and calculating
    timestamps.
-   Undo/reset and repair-review controls.
-   A download button for the repaired GPX.
-   Helpful validation messages for malformed files, missing timestamps,
    impossible time intervals, and implausible implied speeds.

The map should use OpenStreetMap data or a compatible map-tile provider.
Check the relevant tile provider's usage policy and attribution
requirements. Do not assume that public OpenStreetMap tile servers offer
unlimited production use.

## Privacy and Technical Constraints

-   All GPX parsing, editing, calculations, and file generation should
    happen locally in the browser.
-   No user account, login, database, server-side file storage, or
    activity upload endpoint.
-   Do not send GPX contents or location history to analytics or
    third-party services.
-   Map tiles may be requested from a map provider as needed to display
    the map; explain this distinction if privacy information is shown.
-   Prefer a lightweight implementation with well-supported libraries
    over building GPX parsing, map interaction, or XML handling from
    scratch.
-   Ensure the generated GPX is valid XML and preserves useful original
    metadata where practical.
-   Include required map-data attribution.

## Scope

### Required for Version 1

-   Local GPX upload and parsing.
-   OpenStreetMap-based interactive map.
-   Identify and select a section to repair.
-   Manually draw or adjust the replacement route.
-   Live distance update while editing.
-   Explicit timestamp calculation after the route is finalized.
-   Distance-proportional timestamp interpolation between the known
    endpoints.
-   Validation and warnings for invalid or implausible repairs.
-   Review of the repaired route and total distance.
-   Local download of the repaired GPX.
-   Undo/reset to the original track.

### Possible Later Enhancements

Only consider these after the core workflow is reliable:

-   Better gap detection and highlighting.
-   Support for repairing multiple gaps in one activity.
-   Optional snapping to mapped paths, if technically feasible and
    transparent to the user.
-   More detailed pace and distance summaries.
-   Additional editing tools for misplaced points or other track errors.

These enhancements are not required for the initial version.

## Acceptance Criteria

The first version is successful when:

1.  A user can open a typical GPX activity without sending the file to a
    server.
2.  The recorded route appears on the map.
3.  The user can replace a straight-line GPS gap with a manually drawn
    route.
4.  The displayed distance updates as the route is changed.
5.  The user can explicitly calculate timestamps after finishing the
    route edit.
6.  Every reconstructed point receives a valid, ordered timestamp within
    the surrounding time interval.
7.  The tool warns about missing or inconsistent timing data and
    implausible implied speeds.
8.  The downloaded GPX opens as a valid GPX file and preserves
    unaffected activity data as far as practical.
9.  The user can upload the exported file to Strava and have Strava
    calculate distance from the repaired track.
10. The entire workflow works without an account, subscription, or
    server-side handling of the GPX file.

## Development Guidance

Before implementation, propose a simple architecture and identify
suitable libraries for map display, drawing/editing routes, GPX parsing,
and GPX export. Explain any important technical trade-offs, especially
around route editing, timestamp interpolation, GPX compatibility, and
map-tile usage.

Do not add features merely because they are easy to implement. Keep the
first version focused on repairing GPS gaps accurately and predictably.

## Implementation (v1 built 2026-10-13)

Sam asked for the build, so the "do not code until asked" line above is
satisfied. Live at unisam.nz/gpsfixer.

-   Single file: `index.html`. Leaflet 1.9.4 from unpkg, CARTO Voyager
    tiles (OSM data, attribution shown). Not tile.openstreetmap.org: Sam's
    network DNS resolves it to 127.0.0.1, so the map came up blank.
    CARTO raster tiles now need an API key (`CARTO_KEY` in index.html,
    free non-commercial up to 5M tiles/month). The key email is in
    `api.md`, which is local only (in .git/info/exclude): never commit it. No drawing library: vertex and midpoint handles are plain
    draggable Leaflet markers.
-   Parsing uses `DOMParser`, matching elements by `localName` so GPX
    1.0 and 1.1 (and prefixed namespaces) both work. Files with invalid
    coordinates are refused rather than partially loaded.
-   Export re-parses the untouched original text, removes only the
    recorded points strictly between A and B, and inserts the new
    `trkpt`s (plus an XML comment saying they are reconstructed). All
    metadata, extensions (HR etc.), other tracks and segments are kept.
    Output is re-parsed as a validity check before download.
-   One repair per session (multiple gaps = download, reopen, repeat).
-   Reconstructed path is densified to the recording's median point
    spacing (clamped 3 to 30 m). Timestamps are distance-proportional;
    whole seconds if the source has no fractional seconds, falling back
    to milliseconds if rounding would create duplicates. Elevation is
    linearly interpolated between A and B. New points get no extensions.
-   Any geometry change after calculating clears the timestamps;
    download stays disabled until recalculated.
-   Speed warnings: over 55 m/s, or over 1.8x / under 0.35x the
    activity's typical moving speed (pairs with dt <= 60 s, ignoring
    stops).
-   Gap suspects: per segment, time step > max(30 s, 6x median) with a
    real jump, or distance > max(150 m, 10x median spacing). Top 12 by
    distance. Users can also pick any two points in a segment on the map.
-   Personal tool: not linked from /tools or /find.
