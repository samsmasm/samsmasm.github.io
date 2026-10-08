# AI or us?, `/aiorus`

Grade 9 History card sort plus live class screen, built around 'To what extent will AI mirror the Industrial Revolution?' (just like vs nothing like).

- Files: `index.html` (student), `class.html` (class screen), `cards.js` (card content), `student.js`, `class.js`, `firebase.js`.
- Anonymous Firestore in `coldwar-d8109`; rules live at the end of `checkin/firestore.rules`. See `SETUP.md`.
- Run `python3 stamp.py` before committing (cache-busting `?v=` stamps, 4h cache).

Static, no build step; deploys on push to `main`. Follow the root `CLAUDE.md` (and `AESTHETIC.md` for anything new).
