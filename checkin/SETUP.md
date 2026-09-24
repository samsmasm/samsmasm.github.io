# Checkin - setup

Static pages on unisam.nz, with Google sign-in and Firestore in the existing
**coldwar-d8109** Firebase project. The only other tool in that project is
Operation: Shadow Protocol (`/coldwar`), which uses its Realtime Database and
its own password scheme rather than Firebase Auth. Checkin uses Firestore, a
separate database with a separate ruleset, so nothing here can break it.

Live at `unisam.nz/checkin/`.

## Console steps, once

All of these are in the Firebase console for the **coldwar-d8109** project, and
none of them can be done from here. That project has never had Authentication or
Firestore switched on, so both start from nothing.

1. **Authentication**: press **Get started** first, because the project has no
   auth configuration at all and the sign-in method list does not appear until
   you do. Then **Sign-in method > Google > Enable**, and set the support email
   to your own address. Skipping the Get started step is what produces
   `auth/configuration-not-found` at sign-in.
2. **Authentication > Settings > Authorized domains**: add `unisam.nz`, and
   `samsmasm.github.io` too if you ever open the site on that address. Sign-in
   fails with `auth/unauthorized-domain` on any address not listed.
   `localhost` is already there by default for local testing.
3. **Firestore Database**: create a database if the project has none yet.
   Production mode, and pick a region near you (`australia-southeast1`).
   Do not use the default open test rules.
4. **Firestore Database > Rules**: paste the contents of `firestore.rules`
   from this folder and publish.

Take care to use the **Firestore Database > Rules** tab, not the similar looking
**Realtime Database > Rules** tab. Overwriting the Realtime Database rules would
break Operation: Shadow Protocol, which is the one realistic way this setup goes
wrong.

No indexes need creating: every query is a single collection ordered by one
field, which Firestore indexes automatically.

## How the data is shaped

```
users/{uid}                        email, name, and a cached list of their classes
joinCodes/{CODE}                   points a six character code at one class
classes/{cid}                      name, ownerUid, joinCode
  members/{uid}                    the roll, students only
  blocked/{uid}                    students removed by the teacher
  sets/{sid}                       title, mode, status, reveal, questions[]
    keys/key                       the answer key, teacher only
    responses/{uid}                one document per student per set
```

The class list on a person's own user document is only a convenience for the
home page. Access is always decided by the member documents and the class owner,
so removing a student cuts them off immediately.

## The answer key

Correct answers live in `sets/{sid}/keys/key`, which the rules let only the
teacher read. A copy is placed on the set document, where students can read it,
only when they are allowed to know: either the set marks multiple choice
instantly, or results have been released. Switching a set back to held removes
the copy again.

## QR codes

`qr.html` shows one question as a QR code big enough to scan from the back of the
room. Reach it from the QR button on a set in the class dashboard, the **Show QR
code** button on a set's responses page, or the QR link beside any single
question there.

Press **Present** (or P) to drop the page chrome and go full screen, arrow keys
to move the code from question to question, Escape to come back.

Each code points at one question, old or new, and a student scanning it lands on
that question alone rather than at the start of the set. The class join code
rides along in the link, so a student who has not joined yet is let in by the
scan instead of hitting a wall. In a live set, a scanned link ignores the
question you are currently on: the code is you pointing at a question, so it
wins.

The QR drawing library comes from cdnjs at page load. If it is blocked, the page
says so and still shows the link in text.

## Known limits of the prototype

- A student who knows a class id could add themselves to that class without the
  code. Class ids are random and only handed out through a join code, and you
  can remove and block anyone, so this is a nuisance rather than a hole.
- Students can read a set that is still a draft if they go looking in the
  network traffic. Draft questions are hidden in the interface but not by the
  rules. The answer key is never exposed this way.
- Marks are stored on the student's own response document, so a student who
  inspects network traffic could see a mark you have entered before you release
  results. The interface respects the setting.
- In live mode the interface stops a student running ahead of you, but the rules
  do not, so a determined student could answer a later question early.
- Editing questions in a set that students have already answered keeps the
  answers attached to the questions they belong to, because questions carry
  their own ids. Deleting a question does orphan any answers to it.

## Next step, when you want it

Gemini analysis of written answers. The natural hook is the marking view in
`js/results.js`: every written answer for one question is already gathered in
one place, which is the right shape for asking for themes and common
misconceptions across the class.
