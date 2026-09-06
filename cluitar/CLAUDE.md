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

## Rendering

`build()` constructs the DOM once and `refreshAll()` does **targeted** updates.
Do not replace this with a full re-render on status change — that collapses any
open video panel and throws away scroll position on every click, which is
exactly what the phone use case can least afford.

Notation renders lazily the first time an item's details are opened, guarded on
`window.ABCJS` so a CDN failure degrades rather than throws.

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
- **Four videos were removed as dead** (2026-09-06). `yqwxHYBD8iY`,
  `Ur_Xb_GcmaI`, `4bE7Ixb0lss` and `X7pU3Ctrv2E` all return 403 (private or
  removed), so items 1.1, 1.2, 1.3, 1.4 and 1.6 currently have links but no
  video. Replacements need finding by hand — do not guess YouTube IDs.
- Two dead links were repointed at pages verified live on the same date; the
  JustinGuitar and Fender links return 403 to scripted checks but are fine in a
  browser (bot blocking), so leave them.
- Notation is two hardcoded ABC snippets (`ex1`, `ex2`). More means more entries
  in `notationExamples` keyed from the item's `notation` field.
- No pitch detection or listening feedback. Out of scope, much larger project.
