# Cultivar: Claude Code Context

Spaced repetition vocabulary app for students. Static frontend on GitHub Pages (served at `unisam.nz/cultivar/`), Firebase backend. Originally built for Vietnamese, now subject-agnostic (languages and subject-vocab both supported).

## Architecture

**Frontend:** Vanilla HTML/CSS/JS, ES modules, no build step. Firebase SDK from CDN (v10.7.1). Each page is a standalone HTML file sharing `style.css` and the `js/` modules.

**Backend:** Firebase, using Firestore for data and Google Sign-In for auth. No server.

**Auth:** Google Sign-In only (popup on desktop, redirect fallback on mobile). Auth guard at the top of every page's module: `onAuthStateChanged` → redirect to `index.html` if no user.

## Standard page shell

Every page follows this structure (copy this when adding a new page):

```html
<header class="page-header">
  <a href="index.html" class="btn-icon" style="font-size:1.1rem">←</a>
  <h1>Page Title</h1>
  <div style="width:44px"></div>   <!-- spacer to centre the title -->
</header>

<main class="main-pad">
  <!-- content here -->
</main>

<nav class="bottom-nav">
  <a href="index.html" class="nav-item"><span class="nav-icon">🏠</span><span class="nav-label">Home</span></a>
  <a href="decks.html" class="nav-item"><span class="nav-icon">📦</span><span class="nav-label">Decks</span></a>
  <a href="revise.html" class="nav-item"><span class="nav-icon">🎯</span><span class="nav-label">Cram</span></a>
  <a href="dash.html" class="nav-item active"><span class="nav-icon">📊</span><span class="nav-label">Dash</span></a>
</nav>

<div class="toast" id="toast"></div>
```

Add `active` class to the current page's nav item. Pages that are not in the main nav (e.g. `review.html`, `admin.html`) omit the back arrow spacer pattern and use `← back link | title | spacer` in the header, or just a back arrow.

Toast is triggered in JS with:
```js
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
```

## CSS design system (style.css)

### Custom properties
```css
--brand: #4f46e5          /* indigo — primary colour */
--brand-light: #eef2ff    /* indigo tint — chip/badge backgrounds */
--brand-dark: #3730a3     /* indigo dark — headings in brand contexts */
--correct: #16a34a        /* green */
--correct-light: #dcfce7  /* green tint */
--incorrect: #dc2626      /* red */
--incorrect-light: #fee2e2
--bg: #f8fafc             /* page background */
--surface: #ffffff        /* card/panel background */
--text: #1e293b           /* body text */
--muted: #64748b          /* secondary text, labels */
--border: #e2e8f0         /* dividers, input borders */
--shadow: ...             /* subtle card shadow */
--shadow-lg: ...          /* flashcard shadow */
--nav-h: 60px             /* bottom nav height — use in position calculations */
--header-h: 54px          /* sticky header height */
--r: 14px                 /* standard border-radius */
```

### Key classes

**Layout**
- `.main-pad` — `<main>` wrapper: `padding:16px`, `flex-direction:column`, `gap:16px`
- `.page-center` — full-height centred column (used for loading/empty/done states)
- `.hidden` — `display:none !important`

**Buttons**
- `.btn` — base button (inline-flex, 46px min-height, border-radius 12px)
- `.btn-primary` — brand fill
- `.btn-secondary` — light grey fill
- `.btn-ghost` — transparent, brand text
- `.btn-success` / `.btn-danger` — green / red fill
- `.btn-full` — `width:100%`
- `.btn-large` — bigger padding/font
- `.btn-icon` — icon-only tap target (44×44px min, no background)

**Review answer buttons** (only in review.html)
- `.btn-wrong`, `.btn-right`, `.btn-partial` — large coloured answer buttons
- `.answer-row` — flex container for answer buttons; add `.three` class for cram mode's three-button layout

**Panels**
- `.panel` — white card with shadow and `overflow:hidden`
- `.panel-title` — bold header bar with grey background and bottom border
- `.panel-body` — padded flex-column content area

**Lists**
- `.card-list` — flex-column with `gap:10px`
- `.list-card` — individual item card (white, shadow, flex row with `gap:12px`)
- `.list-card-body`, `.list-card-title`, `.list-card-sub` — inner content of a list card

**Misc**
- `.section-heading` — flex row with `h2` left and action button right; used above lists
- `.form-group` — flex-column label+input wrapper with `gap:5px`
- `.error-msg` — red small text for validation errors
- `.csv-hint` — blue-tinted info box (used above CSV textareas)
- `.badge`, `.badge-brand`, `.badge-success` — small pill badges
- `.spinner` — animated loading spinner
- `.empty-icon`, `.empty-state` — centred empty-state layout

## Files

```
js/config.js   - Firebase init (real project credentials are committed)
js/srs.js      - SRS levels + interval calc (nextInterval, levelLabel)
js/db.js       - ALL Firestore reads/writes (single source of truth)
style.css      - shared mobile-first CSS (custom properties; all classes above)
index.html     - Home: per-deck session buttons, progress stats, hamburger menu (Help/Settings)
decks.html     - Browse/enrol/unenroll decks; "Add cards" link to cards.html
cards.html     - Add cards: Language vs Subject-vocab tabs; CSV import; admin deck selector
dash.html      - Dashboard: per-deck word management (boxes, statuses, multi-select), daily-limit settings, per-deck reset
revise.html    - Cram setup (UI label: "Cram"): direction selector, deck picker, reset cram progress
review.html    - Session player for ALL three modes (SRS, review-only, cram) via query params
admin.html     - Admin only: create decks, bulk CSV import (single deck), mass delete decks
firestore.rules - security rules (paste into console)
SETUP.md       - Firebase setup steps for humans
```

Bottom nav (all pages): Home / Decks / Cram / Dash. The nav label is "Cram" but the file is still `revise.html`. `cards.html` is reached from Decks; `admin.html` from a Home quick-tile (admins only).

## Data model

A **deck = one named collection of words**. Unit and subunit are stored on each word for dashboard grouping within the deck. `findOrCreateDeckByName` is used for bulk CSV import (finds by name or creates new). The old `findOrCreateDeck` (by subject/unit/subunit) still exists and is still used by `cards.html`'s admin CSV import.

```
decks/{deckId}
  name, description
  subject, unit, subunit      ← present but no longer the primary grouping key
  is_public: true
  word_count                  ← denormalised, increment() on add
  created_by, created_at

decks/{deckId}/words/{wordId}
  vietnamese, english         ← generic front/back (term/definition for subject cards)
  notes                       ← optional
  unit, subunit               ← set by admin bulk CSV import; used for dashboard grouping
  card_type                   ← optional 'language' or 'subject'
  example_vn, example_en      ← optional
  created_at

users/{uid}
  email, display_name, created_at
  is_admin                    ← set manually in console; app can never set it true
  subscribed_decks: string[]
  settings: { daily_new: 12, session_max: 36 }
  deck_today: { [deckId]: { date, count, word_ids[] } }   ← per-deck daily intro counter
  word_status: { [`${deckId}_${wordId}`]: 'ask_soon'|'skip'|'never' }
  cram_known: { [`${wordId}_${direction}`]: true }        ← cram "known" set, persists until reset

users/{uid}/progress/{progressId}   ← progressId = "{wordId}_{vn_en|en_vn}"
  word_id, deck_id (null for personal), source: 'deck'|'personal', direction
  level: 0–6, due_date, last_reviewed (null until first attempt)
  correct_count, incorrect_count

users/{uid}/cards/{cardId}          ← personal cards (progress created at add time)
```

### word_status semantics

A word starts as "pending" — it exists in the deck but has no progress record yet. The introduction gate controls when pending words enter the user's SRS cycle.

- **no status (normal):** pending word is eligible for introduction in the normal daily queue
- **`ask_soon`:** pending word is prioritised — introduced before other normal words in the same session
- **`skip`:** pending word is excluded from the SRS introduction queue for now (user can un-skip later); also excluded from cram sessions
- **`never`:** word is permanently excluded from the user's SRS cycle; also used when a word is manually removed via "Never" button on the dashboard; also excluded from cram sessions

Only pending (non-introduced) words are affected by `ask_soon`/`skip`/`never` in the SRS introduction gate. Introduced words follow the SRS schedule regardless of status. Both `skip` and `never` are filtered out in `getCramCards`.

## SRS (js/srs.js)

7 Leitner levels. Intervals (days): 0, 1, 3, 7, 30, 90, 365. Box labels (UI): New, Seen it, Know a bit, Getting there, Comfortable, Strong, Mastered.
- Correct → level+1 (cap 6), due = now + interval
- Incorrect → level 0, due = start of today (retried this session)

Each word has TWO progress records (one per direction). `todayStr()` uses **local** date (not UTC) so daily resets happen at local midnight.

## Core mechanics (the important bits)

**Per-deck, independent sessions.** Each deck has its own daily new-word allowance and its own review queue. No global pooling.

**Daily introduction gate.** `autoIntroduceDailyForDeck` introduces up to `settings.daily_new` (default 12) new words per deck per day, but ONLY if there are no *unstarted* new words waiting (`countUnstartedForDeck` = level 0 AND `last_reviewed` null). A failed review (level 0 WITH `last_reviewed`) does NOT block new words. The "Add N more" button on the done screen uses `canIntroduceMoreForDeck`.

**Session shape.** `getDueCardsForDeck` returns genuinely-new (capped at daily_new×2 cards) + failed-resets (always) + reviews (filling up to `session_max` total). `{ reviewOnly: true }` drops all new words.

**Home buttons.** Per deck: "New + review" (`review.html?deck=ID`) and "Review only" (`review.html?deck=ID&mode=review`). Personal cards: `deck=personal`. Personal cards skip the introduction gate entirely.

**Cram Mode.** `revise.html` → `review.html?mode=cram`. Deck IDs passed via `sessionStorage.cramDecks` (JSON array). Direction passed as `?dir=vn_en|en_vn` URL param (omit for both). Words with `skip` or `never` status are excluded. Separate from SRS entirely.

## review.html — URL params and session flow

```
review.html?deck=DECK_ID                        Normal SRS session (new + review)
review.html?deck=DECK_ID&mode=review            Review-only (no new words introduced)
review.html?mode=cram                           Cram — reads decks from sessionStorage.cramDecks, both directions
review.html?mode=cram&dir=vn_en                 Cram — Term → Def only
review.html?mode=cram&dir=en_vn                 Cram — Def → Term only (Jeopardy)
```

`dirFilter = params.get('dir')` is read at the top of the script. For cram, it filters the word pool before computing `totalUnique` and `mastered`. For SRS, direction filtering is not applied (both directions always run).

**Progress bar** (`#prog-track`, `.progress-track` — `display:flex`, 10px tall):
- SRS: green (mastered) / red (wrong, still in queue) / grey (not yet seen). Tracked via `wrongInSession` Set of progressIds.
- Cram: green (known) / yellow `#f59e0b` (partial) / red (don't know) / grey (not yet rated). Tracked via `cramRatings` Map of `cardKey → 'known'|'partial'|'soon'`. Pre-known cards from previous sessions are pre-populated as `'known'` on load.
- Rendered by `segs(items, total)` which outputs `<div style="flex:N;...">` children.

**SRS session flow:**
1. `autoIntroduceDailyForDeck` runs (skipped in review-only mode)
2. `getDueCardsForDeck` builds the queue (both directions always)
3. Cards shuffled; tap to flip, then ✓/✗
4. Correct: `mastered++`, removed from `wrongInSession`. Wrong: added to `wrongInSession`, pushed to end of queue
5. Done screen → "Practice today's words" (repeat-btn) and "Add N more words" (more-btn)

**Cram session flow:**
1. `getCramCards` fetches words from chosen decks, excluding `skip`/`never` words, filtered by `dirFilter`
2. `getCramKnown` filters out already-known cards; pre-known are marked in `cramRatings`
3. Three ratings: "Know it" → `cramRatings.set(key,'known')`, persists to `cram_known`, removed from queue; "Partially" → `cramRatings.set(key,'partial')`, pushed to end; "Don't know" → `cramRatings.set(key,'soon')`, inserted ~4 ahead
4. Done screen has "Reset & cram again" which calls `resetCram` (clears `cram_known`) and restarts from full pool

**Done screen buttons:**
- `repeat-btn` — replays today's introduced words via `getTodayCardsForDeck`
- `more-btn` — calls `introduceWordsForDeck` then starts new session; disabled if unstarted words pending
- `cram-reset-btn` — cram only: resets `cram_known` and restarts

## Cram page (revise.html)

UI label is "Cram" (nav, page title). The filename stays `revise.html`.

**Direction selector** (shown inside `#picker`, above deck list): three pill buttons — "Both ways" (default, no `?dir=` param), "Term → Def" (`?dir=vn_en`), "Jeopardy" (`?dir=en_vn`). Active button gets brand fill. Selected direction stored in `cramDir` variable.

**Deck picker:** grouped by `deck.subject` → `deck.unit`. Unit rows have a checkbox that toggles all decks under that unit. "Select all" toggle at top.

**Known-cards note:** shown if `cram_known` has any entries — displays count and a Reset button that calls `resetCram`.

**Start cram button** (sticky bar above nav, appears when ≥1 deck selected): sets `sessionStorage.cramDecks` then navigates to `review.html?mode=cram[&dir=DIRECTION]`.

## cards.html — adding cards

Two tabs: **Language** and **Subject vocab**. Behaviour differs for admins vs students.

**Language tab fields:** Other language (→ `vietnamese`), Your language (→ `english`), Example (other), Example (yours), Notes. Sets `card_type: 'language'`.

**Subject vocab tab fields:** Term (→ `vietnamese`), Definition (→ `english`), Example (→ `example_vn`). Sets `card_type: 'subject'`.

**Student behaviour:** cards always go to `users/{uid}/cards/` (personal cards), immediately entered into SRS at level 0.

**Admin behaviour:** a deck selector appears at the top (hidden for students). If a deck is selected, cards go to that deck via `addWordToDeck` instead of personal cards. The page can be pre-targeted via `?deck=DECK_ID` query param (set by "Add cards" link on `decks.html`).

**CSV import on cards.html (student):**
- Language tab: `OtherLanguage,YourLanguage,ExampleOther,ExampleYours,Notes`
- Subject tab: `Term,Definition,Example`

**CSV import on cards.html (admin):** still uses the old `findOrCreateDeck(subject, unit, subunit)` to route rows to decks — creates separate decks per subunit. This is different from `admin.html`'s bulk import which uses `findOrCreateDeckByName`. Note: this is an inconsistency worth knowing about.

**LLM prompt generator:** a `<details>` block with copyable prompts (one per tab) that users can paste into an LLM to generate CSVs in the correct format. Copy button uses `navigator.clipboard`.

## Admin page (admin.html)

**Create deck:** manual form → `createDeck(name, desc, subject, unit, subunit)`.

**Bulk CSV import:** admin enters a deck name; all CSV rows go into one deck (`findOrCreateDeckByName`). Format: `Subject,Unit,Subunit,Vietnamese,English,Notes`. Unit and Subunit stored on each word for dashboard grouping. Header row auto-detected and skipped.

**Mass delete:** scrollable checklist of all decks. Select all / None. "Delete selected (N)" → two confirms → deletes sequentially, showing live progress count.

**Manage deck words:** dropdown selects a deck; reveals single-word add form and paginated word list.

## Dashboard (dash.html)

**Grouping:** two-level hierarchy when words have a `unit` field:
- **Unit header** (bold, `--brand` colour, 2px border): covers all words in that unit. Select-all checkbox + "Ask all N pending" button.
- **Subunit header** (indented 8px, `--muted`, 1px border): groups words within a unit by `word.subunit`. Select-all checkbox.
- Legacy words without `unit` fall back to flat grouping by `word.subunit || word.category || ''`.

**Collapsing:** click a header row (not the checkbox or button) to toggle. Chevron ▼/▶ shows state. Auto-collapses everything on load if `words.length > 250` AND there is more than one top-level group.

**Selection bar** (fixed above bottom nav, appears when words are checked):
- `← Earlier` / `Later →` — bulk move selected words between SRS boxes
- `Ask soon` / `Skip` / `Never` — bulk set `word_status` for selected words
- Works on both introduced and non-introduced words; `bulkSetWordStatus` and `bulkMoveWordBox` in db.js

## Conventions

- All Firestore access goes through `js/db.js`. Pages never call Firestore directly.
- `esc()` defined in every page's script for XSS-safe HTML building from data.
- Progress writes on answers are fire-and-forget (`updateProgress(...).catch(console.error)`).
- `is_admin` can only be set manually in the console.
- Firestore rules: user can update their own doc EXCEPT `is_admin`; deck words are admin-write, auth-read.
- **No em dashes in user-facing copy.**
- Always `git push` immediately after committing.

## Deployment

Lives in `samsmasm.github.io` under `/cultivar/`. No build step. Must be served over HTTPS. Firebase project: `cultivar-d3add`. Authorized domains: `unisam.nz`, `www.unisam.nz`, `samsmasm.github.io`, `localhost`.

For local dev: `npx serve .` from the `cultivar/` directory.
