# Cultivar — Claude Code Context

Spaced repetition learning app for ~60 students. Static frontend on GitHub Pages (unisam.nz), Firebase backend.

## Architecture

**Frontend:** Vanilla HTML/CSS/JS, ES modules, no build step. Firebase SDK loaded from CDN (v10.7.1). All pages are standalone HTML files sharing `style.css` and the `js/` modules.

**Backend:** Firebase — Firestore for data, Google Sign-In for auth. No server.

**Auth:** Google Sign-In only (popup on desktop, redirect fallback on mobile). No email/password.

## File structure

```
js/config.js     — Firebase init; user must fill in their project credentials
js/srs.js        — Spaced repetition algorithm (levels + interval calculation)
js/db.js         — All Firestore reads/writes (single source of truth)
style.css        — Shared mobile-first CSS (CSS custom properties, no framework)
index.html       — Login (Google) + dashboard (stats, navigation)
review.html      — Daily review session (flip card, Yes/No, retry on fail)
decks.html       — Browse public decks, subscribe, sync new words
cards.html       — Personal cards: add form + CSV import
admin.html       — Admin only: create decks, add/bulk-import words
firestore.rules  — Security rules (paste into Firebase console Rules tab)
SETUP.md         — Step-by-step Firebase setup for humans
```

## Firestore schema

```
decks/{deckId}
  name: string
  description: string
  is_public: boolean
  word_count: number          ← denormalised; updated via increment() on add
  created_by: uid
  created_at: timestamp

decks/{deckId}/words/{wordId}
  vietnamese: string
  english: string
  example_vn: string          ← optional
  example_en: string          ← optional
  notes: string               ← optional
  created_at: timestamp

users/{uid}
  email: string
  display_name: string
  is_admin: boolean           ← set manually in Firestore console; never via app
  subscribed_decks: string[]  ← array of deckIds
  created_at: timestamp

users/{uid}/progress/{progressId}
  progressId format: "{wordId}_vn_en" or "{wordId}_en_vn"
  word_id: string
  deck_id: string | null      ← null for personal cards
  source: "deck" | "personal"
  direction: "vn_en" | "en_vn"
  level: 0–6                  ← SRS level
  due_date: timestamp
  last_reviewed: timestamp | null
  correct_count: number
  incorrect_count: number

users/{uid}/cards/{cardId}    ← personal cards (not in any deck)
  vietnamese, english, example_vn, example_en, notes, created_at
  (progress records created automatically at add time, same schema as above)
```

## SRS algorithm (js/srs.js)

Leitner-style 7 levels. Intervals: 0 (same session), 1d, 3d, 7d, 30d, 90d, 365d.
- Correct → level + 1 (capped at 6), due_date = now + interval
- Incorrect → level = 0, due_date = start of today (retried this session)

Each word gets TWO progress records (one per direction). When a user subscribes to a deck, progress records are batch-created for all words × 2 directions. The `syncNewDeckWords()` function handles new words added after subscription.

"Mastered" threshold = level ≥ 4 (30-day interval).

## Review session logic (review.html)

1. Load all progress records where `due_date <= end of today`
2. Fetch word content in parallel (grouped by deck to minimise reads)
3. Shuffle queue; show one card at a time
4. Tap card → flip animation → reveal answer
5. Yes: `updateProgress(correct=true)`, remove from queue, increment mastered count
6. No: `updateProgress(correct=false)` (resets to level 0), push card to end of queue for retry
7. Session ends when queue is empty

Progress bar = mastered / initial queue size. Failed cards extend the session but don't increase the denominator.

## Key conventions

- All DB logic lives in `js/db.js` — HTML pages import from there, never call Firestore directly
- `esc()` helper used everywhere HTML is built with string interpolation (XSS prevention)
- `showToast()` for feedback messages (each page has its own toast element)
- Auth guard pattern: `onAuthStateChanged` at top of every page's module script; redirect to `index.html` if no user
- Firestore writes on review answers are fire-and-forget (`updateProgress(...).catch(console.error)`) — acceptable for this use case
- `is_admin` can never be set to `true` via the app (Firestore rule blocks it); must be set manually in console

## What's NOT built yet (known gaps)

- No unsubscribe from deck (would need to decide whether to delete progress records)
- No word edit/delete in admin (delete is complex — needs to clean up all subscriber progress)
- No user management / student list view for admin
- No streak tracking or study history stats
- No PWA manifest / service worker (could add for "Add to Home Screen" UX)
- No offline support

## Deployment

Copy this folder into the GitHub Pages repo as a subfolder (e.g. `/viet/`). No build step needed. Must be served over HTTPS (GitHub Pages does this automatically) — Firebase Auth won't work on `file://`.

For local dev: `npx serve .` from this directory.
