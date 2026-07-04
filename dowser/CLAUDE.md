# CLAUDE.md — Dowser

## What this is

**Dowser** is a live collaborative sticky-note board for classroom use. Teachers create a room; students join and post sticky notes on a shared canvas. Teacher view shows all notes live on a draggable canvas. Predecessor to Pulse for live classroom interaction.

Live at: `unisam.nz/dowser/`

---

## File structure

Single file: **`index.html`** (~420 lines). All HTML, CSS, and JS in one file.

---

## Firebase

Uses **Firebase Realtime Database** (project: `dowserboard` — same project as Pulse and MOA guestbook).

---

## Dependencies (CDN)

- `interact.js` — drag-to-reposition sticky notes on the teacher canvas
- `qrcodejs` — QR code for students to scan

---

## Views

- **Launch screen** — teacher creates room, or student joins
- **Teacher view** — full-screen canvas with draggable sticky notes, live updating
- **Student view** — text input to post a note to the room

---

## Visual style

- Font: Comic Sans MS / Chalkboard SE for note content (intentionally casual)
- Headings: Inter 800, uppercase, tight letter-spacing
- Sticky notes: `--postit: #fef08a` (yellow)
- Background: `--bg: #e2e8f0`
- Accent: `--accent: #4f46e5` (indigo)

---

## Constraints

- Single file. Keep it that way.
- Firebase project is shared with Pulse — do not change the Firebase config unless both tools are being migrated.

---

## Current status

Working. Predecessor to Pulse, still live for classroom sticky-note sessions. No known bugs or planned features.
