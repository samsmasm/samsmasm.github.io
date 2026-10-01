# aiorus2 - setup

This is the first version of aiorus (task sort: machines vs humans), kept here
when `../aiorus/` was rebuilt around the compelling question on 1 Oct 2026. Both
share the same Firebase rooms collection, so a session started on either class
screen appears in both session lists. Students must use the link or QR from the
class screen they are on.

AI or us? A card sort for Grade 9 History: students drag task cards onto a line
from "Machines already do this" to "Only humans, even in 50 years", tap Reveal
to read what has really happened, then answer one reflection question.

- `index.html` + `student.js`: the student page. Link: `aiorus/?room=CODE`.
- `class.html` + `class.js`: the class screen (teacher signs in with Google).
  **Join screen** shows the QR code and room code together, both big. **Display
  mode** goes full screen and squeezes every card onto one screen for the projector.
- `cards.js`: **the card list, the two line labels and the reflection question.
  Edit this file to change the cards.** Keep a card's `id` once a class has used it.
- `firebase.js`: Firebase config and sign-in.

## Privacy

Students never sign in. Each device gets an anonymous Firebase account and sends
only card ids and numbers from 0 to 100. Students answer the reflection question
in their notebooks, so no writing is collected at all. Only the teacher
who opened a room can read it. Rooms stop accepting writes after 24 hours, and
"End session and delete" removes everything.

Student sign-in uses a separately named Firebase app, so a student already signed
in to Checkin with Google on the same Chromebook is still anonymous here.

## Firebase

Runs on **coldwar-d8109**, alongside Checkin. Google and Anonymous sign-in are
already enabled there for Checkin, so there is nothing new to switch on.

**The rules are the one step.** A Firebase project has a single Firestore
ruleset, so the aiorus rules are the last block in `../checkin/firestore.rules`.
Paste that whole file into Firebase console > Firestore Database > Rules >
Publish. The console copy is current if it contains `aiorusRooms`.

Optional: Firestore > TTL policies > add a policy on field `expireAt` for
collection group `aiorusRooms` and another for `placements`. Firestore then
deletes old sessions by itself, even ones you never ended.

## Moving it

Everything is relative and inside this folder, except the logo (`../unisamsq.png`,
which hides itself if missing) and CDNs (Firebase SDK, qrcode-generator). To move
to another Firebase project, swap `firebaseConfig` in `firebase.js`, enable
Google + Anonymous sign-in, add the domain to Authorized domains, and publish the
aiorus rules block (it needs the `signedIn`, `uid` and `realAccount` helpers from
the top of Checkin's rules file).

## Before every commit: `python3 stamp.py`

unisam.nz tells browsers to cache files for 4 hours, so a change can leave a
student with new HTML and old JS, which breaks the page. `stamp.py` puts a fresh
`?v=` on every script, stylesheet and import so browsers always fetch matching
files. Run it (from this folder) whenever a `.html`, `.js` or `.css` file changes.
