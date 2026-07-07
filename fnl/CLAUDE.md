# CLAUDE.md — fnl (Friday Night Live scheduler)

## What this is

Scheduling tool for the Friday Night Live open mic admin. Replaces a shared spreadsheet:
enter a performer's name + song count (+ early/mid/late preference), auto-arrange a running
schedule (7–10pm, ~15 min break), drag-and-drop reorder, adjust song counts, print a clean
schedule, and see a "recently played" fairness panel to keep slot distribution fair.

Not built to the pastel `AESTHETIC.md` look — this is an internal admin tool, deliberately
using a plain professional slate/navy palette instead (`css/style.css`).

## Files

```
fnl/
  index.html              — main schedule editor for "tonight"
  history.html             — read-only browse of past nights, searchable by performer
  tools/import-review.html — one-off CSV → Firestore import tool (see below)
  tools/performers.html    — "Tidy names": list all performers, merge/rename/delete duplicates
  css/style.css            — shared styles + print stylesheet
  js/firebase.js           — Firebase init + shared Firestore helpers (slugify, upsertPerformer...)
  js/parse.js              — free-text entry parsing heuristics (names/pieces/annotations)
  js/app.js                — schedule editor: add/arrange/drag/save/print
  js/fairness.js           — "recently played" panel (trailing 4-week window), per-person not per-slot
  js/history.js            — history.html logic
  js/import-review.js      — tools/import-review.html logic
  js/performers-admin.js   — tools/performers.html logic
```

Script tags use `?v=N` cache-busting query params (GitHub Pages caches ~10 min) — bump the
version when editing a JS file that isn't picking up live.

## Data model (Firestore)

- `performers/{slug}` — `{ displayName, createdAt }`
- `nights/{yyyy-mm-dd}` — `{ date, mc, startTime, status: 'draft'|'final', imported?, updatedAt }`
  - `nights/{date}/slots/{order}` — `{ order, isBreak, performerText, performerSlugs[], pieces, minutes, computedTime, flagged, raw, notes }`

Times are derived from `startTime` + cumulative `minutes` (pieces × 5, or a break's fixed
length). A slot with `timeMode: 'manual'` pins the clock to its `manualTime` (set by editing
the time inline; shown locked 🔒 in the UI) and later auto slots flow on from it; unlocking
returns the slot to the auto flow. Editing a time also repositions the card chronologically.

Duo/group entries in the add form ("Roy & Joop", also `/`, `+`, `,`, "and") become one shared
slot with `performerSlugs` containing each person individually — each gets their own fairness
credit, autocomplete completes whichever name segment is currently being typed.

## Loading, saving, and multi-computer use

The users are elderly and not confident with computers, so `index.html` deliberately has no
Save/Load buttons for daily use:

- **Auto-loads the upcoming Friday** on open (`defaultNextFriday()` in `js/app.js` — computes
  the local date string manually rather than via `toISOString()`, which converts to UTC first
  and rolls back a day in timezones ahead of UTC like NZ). The date/heading is shown as plain
  text ("Friday 10 July"); the raw date picker + a "Switch" button are tucked behind a
  "Different night?" toggle for the rare case of planning ahead or fixing an older week.
- **Autosaves** ~1.2s after any change (add/remove/reorder/pieces/time edits/MC/start time),
  with a plain-language status line (`#saveStatus`): "Saving…" / "✓ All changes saved" /
  "⚠️ Save failed". No explicit save step to forget.
- **Live change detection across computers**: each browser tab has a random `sessionId`
  (`js/firebase.js`, stored in sessionStorage) written as `updatedBySession` on every save. An
  `onSnapshot` listener on the current night doc (`subscribeToNight` in `js/app.js`) shows a
  "this was just changed on another computer — Reload now" banner when a *different* session's
  write lands, while ignoring the snapshot echo of the tab's own pending write
  (`snap.metadata.hasPendingWrites`). This is a warning only, not a live merge — reloading is
  the recovery path, intentionally simple rather than trying to reconcile two edited slot lists
  (there is no real-time collaborative merge of the schedule itself, by design: reordering a
  card while someone else is dragging it would be far worse than an occasional warning banner).

## History.js pill / `status` field

`nights.status` (`draft`/`final`) is still written on every save but has no UI control anymore
— it's a leftover from before autosave replaced the explicit save/pill toolbar. `history.html`
still displays it. Harmless as-is; revisit if a real draft→final concept is wanted later.

## Firebase project

Dedicated project `fnl-scheduler` (config in `js/firebase.js`). To hand ownership to the FNL
admin later, add them as an owner in the Firebase console (Project settings → Users and
permissions) — no code change needed.

Firestore security rules are permissive (no per-user Firebase Auth here — the Cloudflare
Worker password gate is the actual access control, same trust model as `wc26/`).

## Auth

Shared Cloudflare Worker with wc26 — source lives in `wc26/cloudflare-worker.js` (worker name
`wc26-auth`), which handles both `/wc26/*` and `/fnl/*` sections via its `SECTIONS` map. Same
shared password for both; per-section signed session cookie (`fnlauth`). To activate the fnl
gate: update the deployed worker code from `wc26/cloudflare-worker.js` and add route
`unisam.nz/fnl/*` to it in the Cloudflare dashboard (secrets `SITE_PASSWORD`/`AUTH_SECRET`
are already set on that worker).

## Historical import

The organiser's spreadsheet (one column per week, rows = slots) was imported once via
`tools/import-review.html`: pick the CSV with the in-browser file input (never committed —
same reasoning as `wc26/wc.csv` being gitignored for PII), review/fix the auto-parsed rows
(duo acts, ambiguous counts, MC/break/wait-list rows are heuristically flagged), then import.
Duo entries ("Roy & Joop 2") are stored as one shared slot with the total piece count; each
named performer gets one "appearance" credited that night for fairness tracking.

Re-run the tool any time there's another batch of historical data to backfill — it's additive
(uses `setDoc` with merge on the night doc, replaces that night's slots wholesale).

## Current status (2026-07-07)

Feature-complete and verified end-to-end against the live `fnl-scheduler` Firestore project:
add/auto-arrange/drag-reorder/piece-steppers/manual time pinning/print/save/load, history
browse, fairness panel, historical CSV import, and the Tidy names merge/rename/delete tool.
Real historical data has been imported and the obvious duplicate performer names cleaned up
(109 → 78 records); some ambiguous ones deliberately left for the admin to resolve (bare
"Steve"/"Chris"/"David"/"Richard"/"Tom"/"Ian"/"Jim"/"Brian", "Alan" vs "Alan Forsyth", "Bryan",
plus CSV junk fragments "M"/"Ji"/"Suzi H").

**Not yet done — next steps:**

1. **Deploy the Cloudflare Worker gate.** This is the one real blocker before sharing the URL
   widely: until the `unisam.nz/fnl/*` route is added to the `wc26-auth` worker (source already
   updated in `wc26/cloudflare-worker.js`), the site and the wide-open Firestore rules are
   reachable by anyone with the link. Steps are in the Auth section above.
2. Real print test on the actual printer, and a run-through on whatever device the admin uses
   at the venue (phone/tablet touch-drag hasn't been tested outside the preview browser).
3. Recommend running it alongside the spreadsheet for the first week or two rather than a cold
   switch.
4. Finish the ambiguous performer-name merges above, ideally with the admin present since they
   know who's who.
5. Nice-to-haves, not blockers: some form of data export/backup before more real data
   accumulates (merges and deletes are permanent), and adding the admin as a Firebase project
   member when handing over ownership (Project settings → Users and permissions — no code
   change needed).

## Possible future rework: performer-facing signup form

**Not being attempted yet — noted for later, would be a major rework.** Idea: instead of the
admin typing every name in manually, participants fill in a public form themselves (name,
pieces, maybe early/mid/late) that writes straight into a night's slot list (as unordered
"pending" entries); the admin then just orders/arranges what's already there rather than
transcribing it. Would need: a public-facing form page separate from the gated admin tool
(can't sit behind the Cloudflare password, so needs its own abuse/spam consideration — rate
limiting, maybe a simple per-night open/closed toggle so it only accepts entries during a
signup window), a "pending/unordered" slot state distinct from the scheduled list, and matching
against the existing performer list so participants don't fragment their own name into a new
duplicate (harder for a stranger to get right than it is for the admin using autocomplete).

**Also needs deciding alongside this: over-capacity handling.** Right now the schedule has no
concept of a hard end time — it will happily compute times past 10pm if enough
performers/pieces are added. Two directions once this becomes a real problem (more relevant
once signups are self-serve and volume is less controlled by the admin doing the typing):
- Let it run long and give the admin an easy way to trim — surface total pieces/end time
  prominently (already shown in the Schedule heading) and make cutting pieces or removing
  people from the list as low-friction as possible so bringing the night back to time is a
  quick trim pass, not a fight.
- Or add an explicit capacity model (a target end time or max total pieces) with a warning
  once the auto-arranged schedule would run over, leaving the actual decision of who gets cut
  to the admin either way — this tool should never auto-reject a signup on its own.
