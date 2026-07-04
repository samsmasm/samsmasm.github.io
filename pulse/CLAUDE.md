# CLAUDE.md — Pulse

## What this is

**Pulse** is a live classroom response tool. Teachers create a "room" and students join to respond in real time. Two modes:
- **Plot mode** — students place a dot on a 2D coordinate space (e.g. two-variable trade-off). Teacher sees all dots live.
- **Choose mode** — students vote on labelled options. Teacher sees live vote distribution as blobs.

Live at: `unisam.nz/pulse/`

---

## File structure

```
pulse/
  index.html      ← all views (landing, teacher, student)
  script.js       ← all logic (~1192 lines)
  styles.css      ← all styles (~878 lines)
```

---

## Firebase

Uses **Firebase Realtime Database** (project: `dowserboard`).

```js
const firebaseConfig = {
  apiKey: "AIzaSyBGdNJgl1PG0IueYQk_jjn4cOg-sMFbHe0",
  authDomain: "dowserboard.firebaseapp.com",
  projectId: "dowserboard",
  ...
};
```

Firebase SDK loaded from CDN (`firebase-app.js`, `firebase-database.js`, version `10.7.1`). Do not change the CDN version without testing.

Data structure in Firebase Realtime DB:
```
rooms/
  {roomId}/
    config: { mode, axes, options, maxVotes, pin, ... }
    responses/
      {pushId}: { x, y, timestamp }   ← plot mode
      {pushId}: { votes: [...], timestamp }  ← choose mode
```

---

## Views

`index.html` has three views gated by `display: none/block`:
- `#view-landing` — role selector (teacher vs student) + room setup
- `#view-teacher` — teacher dashboard (canvas for plot dots, or blob display for choose)
- `#view-student` — student input interface

View transitions handled in `script.js` by `showView(name)`.

---

## Modes

### Plot mode
- Teacher sets axis labels (1 or 2 variables)
- Students click/tap to place a dot on the canvas
- Teacher sees live dots; can reveal all at once
- Canvas rendered with `ctx` (2D canvas API)

### Choose mode
- Teacher creates up to 4 labelled options
- Students vote (up to `maxVotes` votes allowed)
- Teacher sees live vote blobs (`blobPositions` in state) using `interact.js` for draggable blob placement
- Student sees option buttons; votes tracked in `studentVotes` Set

---

## Key state

Global state vars in `script.js`:
- `currentRoom` — room ID string
- `config` — room config object
- `responses` / `chooseResponses` — live response data
- `isRevealed` — whether teacher has revealed responses
- `dotPositions` / `blobPositions` / `allOptions` — render state

---

## Key constraints

- PIN is required to create a teacher room (prevents student hijack).
- Room ID is the room name uppercased. Students join by entering the room name.
- `interact.js` (from CDN) is used only for draggable blob positioning in choose mode.
- `qrcodejs` (from CDN) generates a QR code for students to scan to join.
- The tool is designed for classroom use on a projector — layout is optimised for a teacher screen + student phones.

---

## Current status

Working. Plot mode and Choose mode both functional. No known bugs or planned features.
