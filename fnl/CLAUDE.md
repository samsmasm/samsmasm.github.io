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
  css/style.css            — shared styles + print stylesheet
  js/firebase.js           — Firebase init + shared Firestore helpers (slugify, upsertPerformer...)
  js/parse.js              — free-text entry parsing heuristics (names/pieces/annotations)
  js/app.js                — schedule editor: add/arrange/drag/save/print
  js/fairness.js           — "recently played" panel (trailing 4-week window)
  js/history.js            — history.html logic
  js/import-review.js      — tools/import-review.html logic
  cloudflare-worker.js     — password-gate Worker source (see Auth below)
```

## Data model (Firestore)

- `performers/{slug}` — `{ displayName, createdAt }`
- `nights/{yyyy-mm-dd}` — `{ date, mc, startTime, status: 'draft'|'final', imported?, updatedAt }`
  - `nights/{date}/slots/{order}` — `{ order, isBreak, performerText, performerSlugs[], pieces, minutes, computedTime, flagged, raw, notes }`

Times are derived from `startTime` + cumulative `minutes` (pieces × 5, or a break's fixed
length) unless a slot has an explicit `computedTime` from historical import data.

## Firebase project

Dedicated project `fnl-scheduler` (config in `js/firebase.js`). To hand ownership to the FNL
admin later, add them as an owner in the Firebase console (Project settings → Users and
permissions) — no code change needed.

Firestore security rules are permissive (no per-user Firebase Auth here — the Cloudflare
Worker password gate is the actual access control, same trust model as `wc26/`).

## Auth

Cloudflare Worker gate, same pattern as `wc26/cloudflare-worker.js`: shared password, signed
session cookie (`fnlauth`), route `unisam.nz/fnl/*`. **The Worker itself must be created and
deployed by hand** (Cloudflare dashboard or `wrangler`) — this repo only holds the source:

1. Create a Worker, paste in `cloudflare-worker.js`.
2. Add route `unisam.nz/fnl/*` (zone must be proxied).
3. Set secrets `SITE_PASSWORD` and `AUTH_SECRET` (random string) via the dashboard or
   `wrangler secret put`.

## Historical import

The organiser's spreadsheet (one column per week, rows = slots) was imported once via
`tools/import-review.html`: pick the CSV with the in-browser file input (never committed —
same reasoning as `wc26/wc.csv` being gitignored for PII), review/fix the auto-parsed rows
(duo acts, ambiguous counts, MC/break/wait-list rows are heuristically flagged), then import.
Duo entries ("Roy & Joop 2") are stored as one shared slot with the total piece count; each
named performer gets one "appearance" credited that night for fairness tracking.

Re-run the tool any time there's another batch of historical data to backfill — it's additive
(uses `setDoc` with merge on the night doc, replaces that night's slots wholesale).
