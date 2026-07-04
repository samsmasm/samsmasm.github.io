# CLAUDE.md — RatIBro

## What this is

**RatIBro** is an IB Finance revision app for students covering IB Business Management Unit 3 (Finance) and related ratio analysis. Google auth via Firebase, progress tracked per-student in Firestore. Teacher panel visible only to whitelisted emails.

Live at: `unisam.nz/ratibro/`

---

## File structure

```
ratibro/
  index.html          ← login page (Google OAuth entry point)
  home.html           ← post-login home / welcome screen
  dashboard.html      ← skill self-rating dashboard
  definitions.html    ← flashcard-style term definitions
  calculations.html   ← worked calculation practice
  statements.html     ← financial statements page
  css/
    style.css         ← all styles (light + dark theme via data-theme attribute)
  js/
    app.js            ← shared logic: theme, sidebar, toast, SVG icons
    data.js           ← all topic/skill/definition content (TOPICS + VOCAB_TERMS)
    firebase.js       ← Firebase config, auth, Firestore helpers
  refdocs/            ← reference documents (IB syllabus, notes, etc.)
```

---

## Data model

**`js/data.js`** contains two top-level structures:

`TOPICS` — array of units, each with `clusters[]` of `skills[]`:
```js
{ unit: '3.1', unitName: '...', clusters: [{ id, name, skills: [{ id, name, hl, definition }] }] }
```
- `hl: true` means Higher Level only
- `id` is the Firestore key for progress tracking

`VOCAB_TERMS` — flat array of definition-only terms (no progress tracking, definitions page only):
```js
{ id, term, definition }
```

**Firestore schema** (`users/{uid}`):
```js
{
  email, displayName, createdAt,
  realName,           // set by teacher
  progress: {
    [skillId]: { ratings: [{ rating, timestamp, q?, s?, a? }], attempts }
  }
}
```

---

## Auth and roles

- Firebase project: `financehub-58eb2`
- Google sign-in only (popup flow)
- Teacher emails hardcoded in `js/firebase.js`: `TEACHER_EMAILS`
- `isTeacher(user)` gates the teacher panel nav item and teacher.html

---

## Shared layout pattern

Every post-login page:
1. Calls `initTheme()` on load
2. Calls `onAuthChange(user => { if (!user) redirect to index; buildSidebar(activePage, name, isTeacher); })`
3. `buildSidebar()` in `app.js` injects the `<aside class="sidebar">` and the mobile menu button

All pages share `css/style.css`. Light/dark theme toggled by `data-theme="light|dark"` on `<html>`. CSS vars prefixed with `--` defined at `:root` and overridden in `[data-theme="dark"]`.

---

## What has been built

- Login, home, dashboard (skill self-rating), definitions, calculations
- Statements page

## What is not yet built

- `understanding.html` — conceptual understanding checks (was deferred)
- `teacher.html` — teacher panel (collecting all user data) — placeholder exists in nav

---

## Current status

Core app working for ~40 students. Login, dashboard, definitions practice, calculations, and statements pages all built.

**Deferred features (documented but not started):** SL/HL toggle (flag already on every skill in data.js), spaced repetition scheduling for vocab terms, teacher class heatmap + CSV export, `understanding.html` conceptual checks.

**No known bugs.**

---

## Adding new content

- **New skill:** add to `TOPICS` in `data.js` under the correct unit/cluster. Give it a unique `id`.
- **New vocab term:** add to `VOCAB_TERMS` in `data.js`.
- **New page:** copy the boilerplate `<head>`, `<script src="js/app.js">`, `<script type="module">` pattern from an existing page. Call `buildSidebar('page-id', ...)` with the correct active page ID matching the `nav` array in `app.js`.

---

## Key constraints

- Firebase SDK is loaded from CDN (`gstatic.com/firebasejs/10.12.0/`), not bundled. Do not change the CDN version without testing.
- `js/firebase.js` is a JS module (`type="module"`). Other scripts are classic scripts. Do not mix them up.
- Firestore progress uses `setDoc` with `{ merge: true }` — safe to call on new and existing docs.
