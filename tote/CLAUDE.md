# CLAUDE.md — tote/

## What this is

**Tote** is a tiny shared notes app at `unisam.nz/tote`. A single self-contained `index.html` (HTML + CSS + JS, no build step) backed by **Firebase Realtime Database**. Notes are shared/global (no auth) and **expire after 96 hours**.

## File

- `index.html` — everything. Firebase SDKs loaded from CDN via ES modules. Edit this file directly; there is no build.

## Data model

Notes live under `notes/` in Realtime DB as `{ content, createdAt }`, keyed by Firebase push IDs.

- `createdAt` uses `serverTimestamp()` on write; locally treated as `Date.now()` ms.
- Expiry is `96 * 60 * 60 * 1000` ms (`EXPIRY_MS`). On load, expired notes are filtered out of the list and quietly `remove()`d from the DB.
- **Renew** resets `createdAt` to now, extending the note another 96h.
- Notes are sorted newest-first by `createdAt`.

## UI behaviour

- Sidebar lists notes; left border colour fades green→red as a note nears expiry (`expiryColor`).
- Sidebar header has a refresh button (`↻`, re-runs `loadNotes`) and a new-note button (`+`).
- **Single click** on the note view opens the editor (`startEdit`). Clicking the toolbar title also edits.
- Keyboard: Enter = new note, ↑/↓ = move between notes, Ctrl/Cmd+Enter = save, Esc = cancel.
- Mobile: sidebar is an off-canvas drawer toggled by the hamburger.

## Conventions

- Vanilla JS, no framework. Keep it in one file.
- This tool does **not** follow the site-wide `AESTHETIC.md` — it has its own dark-sidebar / amber-accent (`--accent: #e8a838`) look. Match the existing styles here, not the root design system.

## Deployment

Part of the `samsmasm.github.io` repo. Pushing to `main` deploys via GitHub Pages. See the root `CLAUDE.md` for repo-wide rules (notably: never `git add -A`).

---

## Current status

Working. Notes expire after 96 hours. No known bugs or planned features.
