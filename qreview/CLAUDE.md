# CLAUDE.md — QReview (IB Continual Revision)

## What this is

**QReview** is a self-contained IB revision tool. Students are shown questions from IB past papers; they reveal the answer and mark themselves. Questions are loaded from a JSON structure, filtered by unit, and presented one at a time. Supports dark mode. Configurable question display size.

Live at: `unisam.nz/qreview/`

---

## File structure

Single file: **`index.html`** (~714 lines). All HTML, CSS, and JS in one file. No build step, no external dependencies beyond the favicon.

---

## Core concepts

**Question data** is stored in a JavaScript object or JSON array near the top of the `<script>` block. Each entry has (approximately):
```js
{ unit: '1', topic: 'Demand', question: '...', answer: '...' }
```
(Verify exact shape in the file before editing.)

**Unit filter** — checkboxes let students pick which units to include in the rotation. State is tracked in a JS array.

**Question size** — the `--question-size` CSS variable (default `2em`) is user-adjustable via +/- buttons. Stored in `localStorage` or managed in JS state.

---

## Dark mode

`body.dark` class toggles all dark-mode colours. Applied by a button; state may be persisted in localStorage.

---

## Key patterns

- Questions are loaded into a queue and shuffled.
- "Remove" button (`.remove-btn`) deletes the current question from the active session (not permanently).
- Answer is revealed by toggling a `.hidden` class.
- The `.controls` section holds the navigation and settings buttons.

---

## Constraints

- Keep everything in `index.html`. No external JS or CSS files.
- Do not add a backend. This is a static, offline-capable tool.
- When adding questions, add them to the data structure in the script block — do not create a separate JSON file unless the user explicitly asks.

---

## Current status

Working. No known bugs or planned features.
