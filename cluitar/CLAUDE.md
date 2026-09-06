# CLAUDE.md — cluitar (`/cluitar`)

## What this is

**Cluitar** — a single-page classical guitar practice path at `unisam.nz/cluitar`.
Personal tool, not a teaching resource. Sam has a cello background (reads treble
and bass clef, knows a few open chords, no scale or technique training), so the
curriculum assumes music literacy and sequences guitar-specific technique, first
position note reading, and one-octave scales.

The point of difference from a checklist: a rule-based engine picks **one** thing
to practise today, the way a teacher would choose the day's focus.

## Structure

Everything is in `index.html` — no build step, no dependencies to install.
External runtime deps, all from CDN: abcjs 6.4.4 (notation), Firebase 10.12.0
modular SDK (auth + Firestore).

## Data model

Curriculum item:
`{ id, title, desc, prereqs: [ids], videos: [{id,title}], links: [{url,label}], notation?, fingeringNote? }`

Progress: `{ [itemId]: { status, updatedAt } }` where status is
`not_started | ongoing | complete` and `updatedAt` is **epoch milliseconds**.

Deliberately a plain number, not a Firestore `serverTimestamp()` — a pending
server timestamp reads back as `null` in the local snapshot, which made every
just-touched item look infinitely stale and yanked the recommendation onto it.

## Firebase

Shares the **`cultivar-d3add`** project (not argmap's). Google sign-in, already
enabled there, and `unisam.nz` is already an authorised domain because cultivar
runs on it.

Progress is stored as a single `cluitar` **map field on `users/{uid}`**.

Two constraints drove that placement, and both matter if you ever move it:

1. Cultivar's deployed Firestore rules already allow `create`/`update` on
   `users/{uid}` for the owning user (blocking only `is_admin`), so this needs
   **no rules change in the console**.
2. It must **not** go in `users/{uid}/progress/*`, even though the rules would
   allow it. Cultivar's `getProgressStats()` does an unfiltered `getDocs()` over
   that whole subcollection and does `counts[level]++` on every doc it finds — a
   cluitar doc in there has no `level` and would corrupt cultivar's SRS stats.

Cultivar only ever `updateDoc()`s named fields on the user doc, so it will never
clobber the `cluitar` field.

Signed out, the app still works: progress goes to `localStorage` under
`cluitar.progress.v1`. On sign-in, local and remote are merged per item, most
recent `updatedAt` winning, so practising on a phone offline and then opening a
laptop does the right thing.

## Recommendation engine

`computeSuggestion()` filters to items whose prerequisites are all at least
`ongoing` and which are not complete, then takes, in order:

1. an `ongoing` item untouched for more than 3 days (picking something back up
   beats starting something new)
2. the lowest-numbered `not_started` item
3. any remaining `ongoing` item

The warm-up shown alongside it is hardcoded to the chromatic warm-up video.

## Layout

Two-pane app shell, built for a laptop about a metre away with a guitar in your
lap: lesson index on the left, the selected lesson filling the right. `body` is
`height:100%; overflow:hidden` and each pane scrolls independently, so the video
never scrolls off while you are playing. Below 900px the shell stacks and the
page scrolls normally.

Base font size is 17px with a 30px lesson title — deliberately large for reading
at distance. Do not shrink these back to phone sizes.

## Rendering

`renderDetail()` rebuilds the right pane and is called **only when the selection
changes**. Status changes go through `refreshDetailStatus()`, which touches the
toggle and the prerequisite line and nothing else.

This split is the important one: rebuilding the pane on a status click would
tear down and reload the YouTube iframes mid-playback. There is a regression test
for it — mark an iframe with a data attribute, change status, confirm the
attribute survives.

For the same reason, marking the open lesson complete moves the "today"
recommendation on in the sidebar but deliberately does **not** navigate the pane
away from what you are watching.

Notation renders on selection, guarded on `window.ABCJS` so a CDN failure
degrades rather than throws.

## Why external links open in a new tab

They are not framed, and cannot be. Measured 2026-09-06, by response header and
by actually framing each one in Chrome:

- **Blocked** (`X-Frame-Options: SAMEORIGIN`): thisisclassicalguitar.com (10 of
  the 16 links), justinguitar.com, fender.com
- **Frameable**: classicalguitarcorner.com, richterguitar.com, gumroad.com

12 of 16 links refuse to be framed, including every link to the main source, and
a frame refusal cannot be reliably detected from JavaScript to fall back on. So
links are plain links marked "Opens in a new tab". Do not add an in-page browser
pane for them; it would be an empty box three times out of four.

## Design

Follows the root `AESTHETIC.md`, Experiments column (`#7a1a4a` wine, `#fff0f6`
background, `#f5b6d4` borders), pink-leaning watercolour masthead.

The original prototype used a warm parchment/wood palette. That is explicitly
prohibited by `AESTHETIC.md` ("Beige backgrounds are explicitly prohibited"), so
it was rebuilt on white. Status controls are plain middot-separated text rather
than buttons or pills, per the no-pills hard rule.

## Known gaps / next steps

- **Curriculum stops at Step 3.** Steps 4+ from the original planning
  (two-voice reading, slurs, arpeggios, first repertoire piece) are not built
  into the data yet.
- Two dead links were repointed at pages verified live 2026-09-06; the
  JustinGuitar and Fender links return 403 to scripted checks but are fine in a
  browser (bot blocking), so leave them.

## Video provenance

Four IDs went private or were removed (`yqwxHYBD8iY`, `Ur_Xb_GcmaI`,
`4bE7Ixb0lss`, `X7pU3Ctrv2E`) and were replaced on 2026-09-06. Every replacement
came from **This is Classical Guitar** (Bradford Werner), the same source the
text links already point at, found by scraping the YouTube embeds out of his
lesson pages rather than by guessing IDs:

| Item | Video | ID |
|---|---|---|
| 1.1 | Classical guitar position: how to sit, hold, position | `dYC9awwT_YQ` |
| 1.2 | 6 common technique problems solved with a better position | `U-ZV_3rsyiw` |
| 1.3 | Right hand position and technique lesson | `RDOqubQd9Jo` |
| 1.4 | Q&A: rest and free stroke | `vi42Tlb_9VU` |
| 1.6 | Left hand position and technique | `HTjwvwCZmRo` |
| 1.6 | The spider — left hand independence exercise | `RHfzegyFTmI` |

The spider exercise restores the drill the original 1.6 video taught, and its
lesson page (linked on the item) carries the notation for it.

**To re-check these later**, hit the oEmbed endpoint — a 403 means private,
removed, or embedding disabled, all of which break the iframe:

```
curl -s "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<ID>&format=json"
```

Do not guess YouTube IDs. A wrong 11-character ID resolves to some unrelated
video rather than failing, so replacements must come from a page that embeds
them or from a verified search result.
- Notation is two hardcoded ABC snippets (`ex1`, `ex2`). More means more entries
  in `notationExamples` keyed from the item's `notation` field.
- No pitch detection or listening feedback. Out of scope, much larger project.
