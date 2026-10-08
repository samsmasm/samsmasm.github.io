# Lineup - setup

A card sort for any topic. Students drag cards onto a line between two opposite
ends, tap Reveal to read a note on each card, and answer one reflection question
in their notebooks. The class screen shows where everyone put each card, with a
box plot per card, so the class can talk about the cards it disagrees on.

It grew out of `../aiorus/` (AI and the Industrial Revolution). Both aiorus card
sets are here as starter decks; /aiorus and /aiorus2 themselves are unchanged.

## Pages

- `teach.html` + `teach.js`: the teacher page (Google sign-in). Your decks,
  running sessions and starter decks. Make a deck with AI: fill in the class
  details, copy the prompt into any chatbot, paste the reply back, check and edit.
  Also "Change it with AI" on an existing deck, sharing, and a student preview.
- `class.html` + `class.js`: the class screen for one session (`?room=CODE`).
  Join screen, Display mode, Now / First instinct / How it shifted.
- `index.html` + `student.js`: the student page. `./?room=CODE` joins a
  session; `./?deck=ID` sorts a shared deck alone (nothing sent);
  `./?preview=1` is the teacher's preview (nothing saved).
- `deck.js`: what a deck is, checking one, and both AI prompts. Edit the prompt
  wording in `buildPrompt` there.
- `starters.js`: the starter decks.
- `teacher.js`: room creation and deletion, shared by the two teacher pages.
- `firebase.js`: Firebase config and sign-in.

## Data

Firestore in **coldwar-d8109**, next to Checkin and aiorus.

- `lineupDecks/{id}`: a teacher's deck, with `ownerUid`, `ownerName` and
  `shared`. Sharing makes it readable by anyone with the link; copying it gives
  the other teacher their own independent deck.
- `lineupRooms/{CODE}`: a session. Starting one copies the deck onto the room,
  so editing a deck never changes a session that is already running.
- `lineupRooms/{CODE}/placements/{uid}`: one per student device, anonymous:
  card ids and numbers from 0 to 100 only.

Cards have ids `c1`, `c2`... that never change when a card is edited, and the
"Change it with AI" prompt asks the chatbot to keep them.

## Privacy

Students never sign in. Each device gets an anonymous Firebase account (through a
separately named app, so a Google login for Checkin on a shared Chromebook is not
used) and sends only card positions. Only the teacher who started a session can
read it. Sessions stop accepting writes after 24 hours, and "End session and
delete" removes everything.

## Firebase

Google and Anonymous sign-in are already enabled on coldwar-d8109.

**The rules are the one step.** The Lineup rules are the last block in
`../checkin/firestore.rules`. Paste that whole file into Firebase console >
Firestore Database > Rules > Publish. The console copy is current if it contains
`lineupRooms`.

Optional: TTL policies on field `expireAt` for collection groups `lineupRooms`
and `placements`, so old sessions delete themselves.

## Before every commit: `python3 stamp.py`

unisam.nz caches files for 4 hours. `stamp.py` puts a fresh `?v=` on every
script, stylesheet and import so a browser never runs new HTML with old JS.
