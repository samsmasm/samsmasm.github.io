# Cultivar: Claude Code Context

Spaced repetition vocabulary app for students. Static frontend on GitHub Pages (served at `unisam.nz/cultivar/`), Firebase backend. Originally built for Vietnamese, now subject-agnostic (languages and subject-vocab both supported).

## Architecture

**Frontend:** Vanilla HTML/CSS/JS, ES modules, no build step. Firebase SDK from CDN (v10.7.1). Each page is a standalone HTML file sharing `style.css` and the `js/` modules.

**Backend:** Firebase, using Firestore for data and Google Sign-In for auth. No server.

**Auth:** Google Sign-In only (popup on desktop, redirect fallback on mobile). Auth guard at the top of every page's module: `onAuthStateChanged` → redirect to `index.html` if no user.

## Files

```
js/config.js   - Firebase init (real project credentials are committed)
js/srs.js      - SRS levels + interval calc (nextInterval, levelLabel)
js/db.js       - ALL Firestore reads/writes (single source of truth)
style.css      - shared mobile-first CSS (custom properties; bottom-sheet modal styles)
index.html     - Home: per-deck session buttons, progress stats, hamburger menu (Help/Settings)
decks.html     - Browse/enrol/unenroll decks; "Add cards" link to cards.html
cards.html     - Add cards: Language vs Subject-vocab tabs; CSV import; admin can target a deck
dash.html      - Dashboard: per-deck word management (boxes, statuses, multi-select), daily-limit settings, per-deck reset
revise.html    - Cram Mode setup: pick decks (grouped subject→unit), reset cram progress
review.html    - Session player for ALL three modes (SRS, review-only, cram) via query params
admin.html     - Admin only: create decks, bulk CSV import (single deck), mass delete decks
firestore.rules - security rules (paste into console)
SETUP.md       - Firebase setup steps for humans
```

Bottom nav (all pages): Home / Decks / Revise / Dash. `cards.html` is reached from Decks; `admin.html` from a Home quick-tile (admins only).

## Data model

A **deck = one named collection of words**. Decks no longer map 1:1 to subject/unit/subunit — instead, unit and subunit are stored on each word for grouping within a deck. `findOrCreateDeckByName` is used for bulk CSV import (finds by name or creates new). The old `findOrCreateDeck` (by subject/unit/subunit) still exists for legacy use.

```
decks/{deckId}
  name, description
  subject, unit, subunit      ← still present but no longer the primary grouping key
  is_public: true
  word_count                  ← denormalised, increment() on add
  created_by, created_at

decks/{deckId}/words/{wordId}
  vietnamese, english         ← generic front/back (also used for term/definition)
  notes                       ← optional
  unit, subunit               ← set by bulk CSV import; used for grouping on the dashboard
  card_type                   ← optional 'subject' (personal subject-vocab cards)
  example_vn, example_en      ← optional (personal cards)
  created_at

users/{uid}
  email, display_name, created_at
  is_admin                    ← set manually in console; app can never set it true
  subscribed_decks: string[]
  settings: { daily_new: 12, session_max: 36 }      ← per-user, editable on Dash
  deck_today: { [deckId]: { date, count, word_ids[] } }  ← per-deck daily intro counter
  word_status: { [`${deckId}_${wordId}`]: 'ask_soon'|'skip'|'never' }
  cram_known: { [`${wordId}_${direction}`]: true }  ← Cram Mode "known" set, persists until reset

users/{uid}/progress/{progressId}   ← progressId = "{wordId}_{vn_en|en_vn}"
  word_id, deck_id (null for personal), source: 'deck'|'personal', direction
  level: 0–6, due_date, last_reviewed (null until first attempt)
  correct_count, incorrect_count

users/{uid}/cards/{cardId}          ← personal cards (progress created at add time)
```

## SRS (js/srs.js)

7 Leitner levels. Intervals (days): 0, 1, 3, 7, 30, 90, 365. Box labels (UI): New, Seen it, Know a bit, Getting there, Comfortable, Strong, Mastered.
- Correct → level+1 (cap 6), due = now + interval
- Incorrect → level 0, due = start of today (retried this session)

Each word has TWO progress records (one per direction). `todayStr()` uses **local** date (not UTC) so daily resets happen at local midnight.

## Core mechanics (the important bits)

**Per-deck, independent sessions.** Each deck has its own daily new-word allowance and its own review queue. No global pooling. Two decks = up to 2× new words/day.

**Daily introduction gate.** `autoIntroduceDailyForDeck` introduces up to `settings.daily_new` (default 12) new words per deck per check-in day, but ONLY if there are no *unstarted* new words waiting (`countUnstartedForDeck` = level 0 AND `last_reviewed` null). Crucially, **a failed review (level 0 WITH last_reviewed) does NOT block new words** - only never-attempted words do. The manual "Add N more" button on the done screen uses the same gate (`canIntroduceMoreForDeck`).

**Session shape.** `getDueCardsForDeck` returns genuinely-new (capped at daily_new×2 cards) + failed-resets (always) + reviews (filling up to `session_max` total). `{ reviewOnly: true }` drops all new words.

**Home buttons.** Per deck: "New + review" (`review.html?deck=ID`) and "Review only" (`review.html?deck=ID&mode=review`). Personal cards get their own button (`deck=personal`). Personal cards are created straight into the SRS cycle (no introduction gate).

**Cram Mode (revise.html → review.html?mode=cram).** Exam revision, completely separate from SRS. Pick decks (passed via `sessionStorage.cramDecks`); drills every word both directions. Three ratings: Know it (persisted to `cram_known`, drops out until reset), Partially (requeue near end), Don't know (requeue ~4 ahead). Never reads or writes SRS progress. Reset clears `cram_known` (on cram done screen and on revise.html).

**Review session player (review.html)** handles all three modes by branching on `mode` param. Tap card to flip (and tap back to unflip). Wrong/partial cards recycle within the session.

## Admin page (admin.html)

**Create deck:** manual form with name, description, subject/unit/subunit fields.

**Bulk CSV import:** admin enters a deck name; all rows go into that one deck (creating it if the name is new, adding to it if it already exists). Format: `Subject,Unit,Subunit,Vietnamese,English,Notes`. Unit and Subunit are stored on each word for dashboard grouping; they do NOT create separate decks. Header row auto-detected and skipped.

**Mass delete:** scrollable checklist of all decks with checkboxes. Select all / None buttons. "Delete selected (N)" runs two confirm dialogs then deletes in sequence.

**Manage deck words:** dropdown to select a deck, then single-word add form and word list with refresh.

## Dashboard (dash.html)

Words are grouped in a two-level hierarchy:
- **Unit header** (bold, brand colour): covers all words sharing `word.unit`. Has a select-all checkbox and "Ask all N pending" button.
- **Subunit header** (indented, muted): groups words by `word.subunit` within a unit. Has its own select-all checkbox.
- Legacy words without a `unit` field are grouped flat by `word.subunit || word.category || ''`.

Both unit and subunit headers are **collapsible** (click header to toggle, chevron shows state). If a deck has more than 250 words and more than one top-level group, it loads with all groups collapsed by default.

**Selection bar** (appears above nav when words are checked):
- `← Earlier` / `Later →`: bulk move selected words between SRS boxes
- `Ask soon` / `Skip` / `Never`: bulk set word status for selected words
- Works on both introduced and non-introduced words

## Conventions

- All Firestore access goes through `js/db.js`. Pages never call Firestore directly.
- `esc()` used wherever HTML is built from data (XSS).
- Progress writes on answers are fire-and-forget (`updateProgress(...).catch(console.error)`).
- `is_admin` can only be set manually in the console (Firestore rule blocks the app from setting it).
- Firestore rules allow a user to update their own doc EXCEPT `is_admin`; deck words are admin-write, auth-read.
- Bulk CSV import: admin format is `Subject,Unit,Subunit,Vietnamese,English,Notes` (all rows to one named deck). Personal cards: Language tab `Other,Your,ExampleOther,ExampleYours,Notes`; Subject tab `Term,Definition,Example`.
- **No em dashes in user-facing copy** (project-wide writing rule).
- Always `git push` immediately after committing.

## Deployment

Lives in the GitHub Pages repo `samsmasm.github.io` under `/cultivar/`. No build step. Must be served over HTTPS (Firebase Auth won't work on `file://`). `js/config.js` already has the project credentials (`cultivar-d3add`). Authorized domains in Firebase: `unisam.nz`, `www.unisam.nz`, `samsmasm.github.io`, `localhost`.

For local dev: `npx serve .` from this directory.
