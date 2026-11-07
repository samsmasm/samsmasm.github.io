# CLAUDE.md — tote/

## What this is

**Tote** is Sam's private notes app at `unisam.nz/tote`. Notes **expire after 96 hours**. Only Sam's Google account can reach it, and every note is **end-to-end encrypted** with a passphrase, so the server, Cloudflare and Google only ever hold ciphertext. Noindex, not linked from any index.

## Files

- `index.html`: the app (HTML + CSS + JS, no build step).
- `client.js`: shared module, imported by `index.html` **and `/typeit`** ("Save to Tote"). Google sign-in (Firebase Auth, project coldwar-d8109, same as Tracker/Checkin), passphrase key, encryption, API calls.
- `worker/`: Cloudflare Worker `unisam-tote` at `unisam.nz/tote/api/*`, KV `TOTE_KV`. Verifies the Firebase ID token itself and only answers for `ALLOWED_EMAIL`. Deploy: `npx wrangler@4 deploy --config tote/worker/wrangler.jsonc`.
- `test/`: `node tote/test/worker.test.mjs` (token check + routes on a fake KV) and `node tote/test/crypto.test.mjs` (encryption). Run both after touching the Worker or `client.js`.

## Security model

- **Passphrase** never leaves the browser. PBKDF2-SHA256 (600k rounds, random 16-byte salt) → non-extractable AES-GCM-256 key, remembered in IndexedDB (`tote` db, `keys` store) until **Lock** or **Sign out**. /typeit is the same origin, so it shares the sign-in and the key.
- Each note: AES-GCM, random 12-byte IV, note id as additional data (ciphertext can't be swapped between ids).
- KV `meta` = `{salt, check}`; `check` is "tote-ok" encrypted with label `check`, used to tell a wrong passphrase. `PUT /meta` only works once; **Forgot it?** calls `DELETE /all` (wipes every note + meta) and starts again.
- KV `n:<id>` = `{iv, ct}` with `expirationTtl` 96h: **KV deletes expired notes itself.** Saving or Renew re-puts with a fresh TTL. Expiry shown in the UI comes from the key's KV expiration.
- Local draft (`localStorage["tote-draft"]`) is encrypted too (label `draft`).
- The server can still see note count, sizes and save times, not content.
- KV `list` is eventually consistent (up to ~60s), so a just-saved/deleted note can lag on another device's refresh.

## Old Firebase Tote (being retired)

Until 2026-11-07 Tote stored plain text in Firebase Realtime DB `notes-ff975`, **world-readable** with open rules. `importOldNotes()` in `index.html` (marked TEMPORARY) offers to move any old notes in, encrypted, and deletes them from Firebase. Old notes were moved 2026-11-07 (`notes` is empty). Sayso deployed with the new client 2026-11-07. Still open: Sam to lock this DB. **The same DB holds MOA's visit counter under `moa/`**, so don't lock the whole DB: rules must be `{"rules": {".read": false, ".write": false, "moa": {".read": true, ".write": true}}}`. Then remove the import block. /sayso also uses `client.js` for Send to Tote.

## UI behaviour

- Gate panel: sign in with Google → set passphrase (first time) or enter it → notes.
- Sidebar lists notes; left border colour fades green→red as a note nears expiry (`expiryColor`). Footer has **Lock** and **Sign out**.
- Sidebar header has a refresh button (`↻`, re-runs `loadNotes`) and a new-note button (`+`).
- **Single click** on the note view opens the editor (`startEdit`). Clicking the toolbar title also edits.
- Toolbar **Copy** button (view mode) copies the note text to the clipboard.
- **Autosave:** leaving the editor for another note (sidebar click, `+`, refresh, delete of another note, Lock, Sign out) saves first via `leaveEdit()`. Hiding the tab (`visibilitychange`/`pagehide`) saves too but stays in the editor. All writes go through `writeEdit()`, which chains them so a new note is never created twice. Cancel still discards.
- **Local draft:** every keystroke stores the encrypted `{id, content}`; cleared on save/cancel. On load, an unsaved draft reopens in the editor ("Unsaved draft restored").
- Keyboard: Enter = new note, ↑/↓ = move between notes, Ctrl/Cmd+Enter = save, Esc = cancel.
- Mobile: sidebar is an off-canvas drawer toggled by the hamburger.

## Conventions

- Vanilla JS, no framework.
- This tool does **not** follow the site-wide `AESTHETIC.md`: it has its own dark-sidebar / amber-accent (`--accent: #e8a838`) look.
- Render note text with `textContent` only, never `innerHTML`.

## Deployment

Page: push to `main` (GitHub Pages). Worker: wrangler command above. See the root `CLAUDE.md` for repo-wide rules (notably: never `git add -A`).
