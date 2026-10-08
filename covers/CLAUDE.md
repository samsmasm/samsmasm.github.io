# Covers, `/covers`

Find a book's cover and print it big for a classroom door, alone or several to a page.
No login, no backend: one self-contained file, `covers/index.html` (inline `<style>` and
`<script>`). Linked from `/tools` under "Document utilities". Was called "Door Cover";
the `localStorage` keys still say `doorcover` and `doorcover-sheet`. Don't rename them,
or saved settings and sheets are lost.

## Design

Follows `AESTHETIC.md`: watercolour header, `/geocornsmall.png` unicorn logo (not
`/unisamsq.png`), Tools purple (`#4a1a7a`, tint `#f5f0ff`, border `#d0b6f5`), Georgia
headings, standard footer. No shadows, no pills, no dark mode. Example searches are
plain links separated by middots, not chips.

Two views, underline tabs: **Find covers** and **Sheet (n)**. The Paper setting (A4 or
Letter) is always visible next to the tabs.

## Cover sources

All are called from the browser, so each must allow CORS.

1. **Open Library** search gives the suggestion list. Uses the full-size original
   (`/b/id/<id>.jpg`, about 3x the `-L` size) with `-L` as an `onerror` fallback.
   `?default=false` makes a missing cover 404 instead of returning a blank image.
2. **Apple Books** (`itunes.apple.com/search?media=ebook`, CORS `*`). Artwork URLs are
   rewritten to `/2400x2400bb.jpg`, which gives about 1500x2400. When found, these become
   option 2, since they're usually the largest.
3. **Google Books** is a backup only. The keyless API often returns 429 (shared daily quota).
4. Other Open Library editions of the work fill out "More covers".

Suggestion fallback chain: Open Library, then Google, then Apple. `smaller(url, size)`
maps a big URL to a thumbnail or fallback for Open Library and Apple only.

## Printing

Each card has **Print: 1/1 1/2 1/4 1/8** buttons that go straight to `window.print()`.
`printOne()` centres the cover on a page turned whichever way suits that size.
Buttons get class `.soft` (orange) when the cover would print below 100 dpi.

Every size and position is set **in mm from script** (`printPages`), and `@page` is
written into `#pageRule`. Never rely on `max-width`/`max-height` for print sizing:
they only shrink, so small images never filled the page (that was the original bug).
`pageBox()` keeps 1mm spare in height so a page never spills onto a second.

## The sheet (multi-cover pages)

`sheet` is an ordered array of `{ url, w, h, alt, title, size, pin? }` saved to
`doorcover-sheet`. `size` is 1, 2, 4 or 8 (fraction of a page). `autoSize()` sets it
on add: the largest size that prints at 150 dpi or more, else 100 dpi or more, else 1/8.

**Grid.** A page is a grid of eighths: 4x2 cells landscape, 2x4 portrait (`GRID`).
Each size is a block of cells (`GRID[o].blk`), so mixed sizes snap together. Covers
are never rotated. On A4, 1/1 and 1/4 slots are tall on portrait pages and 1/2 and 1/8
slots are tall on landscape, so a mismatched cover prints smaller than its slot. That
is expected, and the preview shows it.

**`pack(items, orient)`** places pinned covers first, then first-fits the rest in sheet
order, then drops empty pages. **`arrange()`**: every page has the same orientation
(Sam's requirement: print and pin up whole pages without cutting). Auto keeps the pins'
orientation if any exist, else picks fewer pages, then more cover area. The "Pages:
Auto / Portrait / Landscape" control overrides it.

**Dragging** uses pointer events with window listeners, so it works on touch too.
`shownLayout` holds the arrangement currently on screen.
- Cover onto cover: `moveTo()` swaps them, and their pins.
- Cover onto an empty `.gcell`: `moveToCell()` sets `pin = { orient, page, x, y }`,
  nudged so the block fits, and unpins any cover it overlaps. Plain reordering can't do
  this, because first-fit refills the gap and pulls the cover straight back.
- List row onto row: `moveInList()` reorders.
- Dragging near the window edge auto-scrolls, so later pages are reachable.
- Changing a cover's size deletes its pin. "Tidy up (auto arrange)" clears all pins.

## Testing

Headless Chrome via `puppeteer-core` with `/usr/bin/google-chrome`, serving the repo
with `python3 -m http.server <port> --directory <repo>`. Gotchas:
- Port 8765 is often already taken by another server. Use a different port.
- `pkill -f "http.server ..."` kills your own shell. Kill by PID from `ss -ltnp`.
- Seed `localStorage['doorcover-sheet']` to test the sheet without searching.
- Stub `window.print` before printing, then `page.pdf({ preferCSSPageSize: true })`
  to check the real printed layout.
- Elements must be inside the viewport for `elementFromPoint`, so drags to page 2
  need the auto-scroll (or a tall viewport).
- Clear the search box with Ctrl+A then Backspace. Triple-click doesn't select it.
