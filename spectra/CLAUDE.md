# CLAUDE.md — Spectra

## What this is

**Spectra** is a live classroom opinion polling tool. Teacher posts a statement; students rate it on a spectrum (e.g. Strongly Disagree → Strongly Agree). Teacher sees the live distribution as a visual spectrum/bar.

Same pattern as Pulse and Dowser — teacher creates room, students join via room code or QR code.

Live at: `unisam.nz/spectra/`

---

## File structure

```
spectra/
  index.html    ← all views
  script.js     ← logic (~Firebase Realtime DB)
  styles.css    ← styles
```

---

## Firebase

Uses **Firebase Realtime Database** (project: `dowserboard` — same project as Pulse and Dowser).

---

## Dependencies (CDN)

- `qrcodejs` — QR code for student join

---

## Views

- **Landing** — teacher vs student selector
- **Teacher view** — post a statement, see live spectrum of responses
- **Student view** — rate the statement on a slider/scale

---

## Family note

Spectra, Pulse, and Dowser form a trio of live classroom tools sharing the same Firebase project. They have similar view-switching patterns and room-code join flows.

---

## Current status

Working. No known bugs or planned features.
