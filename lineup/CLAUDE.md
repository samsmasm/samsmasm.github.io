# Lineup - notes for working on this folder

Lineup (unisam.nz/lineup) is a card sort for any topic: students drag cards onto
a line between two opposite ends, tap Reveal to read a note on each card, and
answer one reflection question in their notebooks. The class screen shows where
everyone put each card. It is `../aiorus/` generalised; read `SETUP.md` for the
file map, data model and Firebase setup.

## Decisions Sam made (do not re-litigate)

- Name: **Lineup**.
- Teachers keep a **deck library**, and decks can be **shared by link**: a
  teacher link (`teach.html?copy=ID`, adds an independent copy) and a student
  link (`./?deck=ID`, sort alone, nothing sent).
- Decks are made by **copying a prompt into any chatbot** and pasting the reply
  back. There is no API call from the site.
- `/aiorus` and `/aiorus2` stay untouched and live; their card sets are the two
  starter decks in `starters.js`. The aiorus2 starter's compelling question was
  written by Claude, not Sam, so Sam may change it.
- Same look as aiorus (dyslexia friendly, purple info / blue task / dark red
  reflection). Header logo is the unicorn `../geocornsmall.png`, as on
  econnews, not the photo `unisamsq.png`.

## How it fits together

- `deck.js` is the one place that knows what a deck is: `normaliseDeck` tidies
  anything deck-shaped, `checkDeck` returns plain-language problems,
  `buildPrompt` and `buildRevisePrompt` are the AI prompts, `parseReply` pulls
  a deck out of a chatbot reply (code fences, chatter, trailing commas).
- **Card ids** (`c1`, `c2`...) match placements to cards. They never change when
  a card is edited, new cards get `nextCardId`, and the revise prompt asks the
  chatbot to keep them. A fresh AI deck gets new ids.
- **Starting a session copies the deck onto the room** (`createRoom` in
  `teacher.js`), so editing a deck never changes a session already running.
  The class screen and students read the deck from the room, never from
  `lineupDecks`.
- "Preview as a student" opens `./?preview=1` **in a new tab** on purpose, so
  unsaved edits stay in the editor tab. The deck travels through localStorage
  (`lineup:preview-deck`). The preview banner's Close button calls
  `window.close()` and falls back to `teach.html`.
- Students are anonymous through a separately named Firebase app
  (`lineup-student`), so a Checkin Google login on a shared Chromebook is not used.

## Before committing

1. `python3 stamp.py` in this folder after any `.html`, `.js` or `.css` change.
   unisam.nz caches for 4 hours, and new HTML with old JS breaks the page.
2. If the rules changed, they are the last block of `../checkin/firestore.rules`
   and **Sam must re-paste that whole file** into the coldwar-d8109 console. The
   console is current if it contains `lineupRooms`. To check without console
   access: sign up an anonymous account through the identitytoolkit REST API
   with the public key in `firebase.js`, then GET
   `lineupRooms/ZZZZ`. `NOT_FOUND` means the rules are live,
   `PERMISSION_DENIED` means they are not (this was the cause of
   "Could not load your sessions (permission-denied)" on 2026-10-08).

## Testing

There is no test folder yet. What worked (2026-10-08): puppeteer-core with the
system Chrome, serving the repo root with `python3 -m http.server`, and request
interception that swaps the `gstatic.com/firebasejs` modules for small fakes
backed by localStorage, so the teacher tab, class screen and student tab share
one fake database. Two traps:

- The fake modules must be served with `Access-Control-Allow-Origin: *`, or the
  module import fails silently and the page sits on "Loading...".
- Clicks and screenshots in a background puppeteer tab hang (no animation
  frames). Call `bringToFront()` before using a tab.

The failure mode to watch for, as in Checkin: a function used but imported
from nowhere. `node --check` cannot see it. `../checkin/test/undefined-calls.py`
works on this folder if you point its `HERE` at `lineup/` and glob `*.js`.
