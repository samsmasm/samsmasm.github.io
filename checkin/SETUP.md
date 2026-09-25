# Checkin - setup

Static pages with Google sign-in and Firestore. No build step, no framework, no
server: every page is plain HTML, CSS and ES modules, and every link inside it is
relative, so the whole folder works from any domain or subfolder you drop it in.

Nothing outside this folder is referenced. The only things loaded from elsewhere
are the Firebase SDK, Google Fonts and the QR library, all from public CDNs.

It currently runs on a Firebase project called **coldwar-d8109**, which is a
personal account used for trying it out.

## Console steps, once

All of these are in the Firebase console, and none of them can be done from a
code editor. If you are setting this up on a new Firebase project, do all four;
if you are moving it to a different project, also replace `firebaseConfig` in
`js/firebase.js` with that project's web config.

1. **Authentication**: press **Get started** first, because the project has no
   auth configuration at all and the sign-in method list does not appear until
   you do. Then **Sign-in method > Google > Enable**, and set the support email
   to your own address. Skipping the Get started step is what produces
   `auth/configuration-not-found` at sign-in.
   Then, on the same tab, **Add new provider > Anonymous > Enable**. One off
   tests are answered by people with no account, and Firestore still has to pin
   every write to somebody, so their browser is handed a throwaway account it
   never shows them. Without this, a one off test fails at the name step with
   `auth/operation-not-allowed`, and nothing else is affected.
   Anonymous account auto clean-up, on the same page, is worth turning on. It
   deletes accounts nobody has used for 30 days. It does not touch Firestore, so
   results already written stay exactly where they are.
2. **Authentication > Settings > Authorized domains**: add every domain the site
   will be opened on, including the GitHub Pages one. Sign-in fails with
   `auth/unauthorized-domain` on any address not listed. `localhost` is already
   there by default for local testing.
3. **Firestore Database**: create a database if the project has none yet.
   Production mode, and pick a region near you (`australia-southeast1`).
   Do not use the default open test rules.
4. **Firestore Database > Rules**: paste the contents of `firestore.rules`
   from this folder and publish. Do this again whenever that file changes, since
   the console holds its own copy: the rules are not deployed from this repo.

Take care to use the **Firestore Database > Rules** tab, not the similar looking
**Realtime Database > Rules** tab. Overwriting the Realtime Database rules would
break Operation: Shadow Protocol, which is the one realistic way this setup goes
wrong.

No indexes need creating: every query is a single collection ordered by one
field, which Firestore indexes automatically.

## How the data is shaped

```
users/{uid}                        email, name, cached lists of their classes and one off tests
joinCodes/{CODE}                   points a six character code at one class
runCodes/{CODE}                    points a six character code at one run of one off test
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

## Cache busting, which you cannot skip

The host sends `cache-control: max-age=14400`, so a browser will hold a four
hour old copy of any file. That does not merely look stale: new HTML running
against an old cached module fails outright, with errors like
`can't access property "innerHTML", box is null`, because the page and the code
no longer agree about what exists.

The fix is to change the URL whenever the code changes. Before committing any
change to the pages or the JS, run:

    python3 stamp.py

It puts a fresh `?v=` on every `<script src="js/...">` and on every relative
import inside `js/`. Imports from a CDN are left alone. After that a browser
cannot serve an old module, because it has never seen that URL before.

The pages themselves are still cached, so after a deploy you may need one hard
refresh (`Ctrl+Shift+R`) to pick up new HTML. If that gets annoying, a cache
rule on the host giving `*.html` in this folder a short TTL would remove it.

## Moving it to another host and another Firebase project

Copy the whole `checkin/` folder. It is self-contained on purpose: no reference
to the site it currently lives on, no root-absolute paths, and the only things
loaded from elsewhere are the Firebase SDK (gstatic), Google Fonts
(fonts.googleapis.com) and the QR library (cdnjs). If the school blocks any of
those three hosts, that is the thing to sort out first.

1. **Replace `firebaseConfig` in `js/firebase.js`** with the new project's web
   config. That is the only file that knows which Firebase project this is.
2. **Do the four console steps above** on the new project. All four, in order.
   The Anonymous provider in step 1 is easy to skip and one off tests do not work
   without it.
3. **Authorized domains** must include wherever it is actually served from: the
   school's GitHub Pages domain, and any custom domain in front of it. Sign-in
   fails with `auth/unauthorized-domain` on anything not listed.
4. **Publish `firestore.rules`.** The rules are not deployed from the repo, so a
   new project starts with whatever the console gives it, which is either
   deny-all or wide open. Neither is what you want.
5. **Run the tests**: `./test/run.sh` from inside the folder. It needs `python3`
   and `google-chrome`. It touches no Firebase project at all, so it is safe to
   run anywhere and it will tell you whether the copy is intact.

**The data does not come with it.** A new Firebase project starts empty: no
classes, no question sets, no responses, no accounts. Everyone signs in again and
classes are made again. If the existing data has to move, that is a Firestore
export and import between projects, and it is a separate job from this one.

Nothing else is tied to where it is served from. QR codes and the one off test
links build themselves from whatever address the page is open on, so they follow
the move by themselves.

**After changing any file in `js/` or any page, run `python3 stamp.py`.** It puts
a fresh `?v=` on the stylesheet and every script so browsers cannot serve a stale
module against new HTML. A host that sends long cache headers, which is most of
them, makes this the difference between a deploy working and a deploy breaking in
a way that is hard to read.

The `test/` folder can be deleted if the school would rather not publish it. It
holds no credentials and talks to a fake Firestore, so it is harmless either way,
but it is the thing that catches the mistakes this project actually makes, so
keeping it is the better call.

## Teacher or student

On a first visit everyone is asked whether they mostly teach or mostly study,
and the answer is kept on their user document as `role`. It decides which half
of the home page leads and nothing else. Both roles can still make a class and
join a class: the other route moves to a plain link in the header and a quiet
line at the foot of the home page. It is never a permission, so there is nothing
in the rules about it, and anyone can switch at the bottom of their home page.

## Practice retakes

A student who has done a set can press **Try again** for a private practice run.
Turn it on per set with **Allow practice retakes** on the responses page. The
button only appears once results are released, because until then the student's
browser holds no answer key and a retake could tell them nothing.

Practice answers go to `responses/{uid}/retakes/{attemptId}`, which the rules
make readable and writable by that student alone. The teacher is deliberately
not given read access, so revising in private cannot become something a student
is judged on. Nothing about a practice run touches the marked record: the grid,
the totals and the CSV always show the original attempt.

Multiple choice marks itself during a practice run. Written answers get no
feedback, because nobody is reading them.

Putting results back on hold also switches practice off, otherwise students
would keep an answer key they are no longer meant to have.

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
- The per-set practice switch is enforced in the interface, not in the rules, so
  a determined student could store a practice run on a set you have not opened
  for it. It stays private to them either way, so there is nothing to gain.
- Editing questions in a set that students have already answered keeps the
  answers attached to the questions they belong to, because questions carry
  their own ids. Deleting a question does orphan any answers to it.

## Next step, when you want it

Gemini analysis of written answers. The natural hook is the marking view in
`js/results.js`: every written answer for one question is already gathered in
one place, which is the right shape for asking for themes and common
misconceptions across the class.
