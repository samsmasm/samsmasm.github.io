# CLAUDE.md — Checkin

Concept checks for a class: short question sets mixing auto-marked multiple
choice with short written answers a teacher reads and marks.

**This folder is deliberately self-contained.** It is a concept intended to be
migrated to a school's own GitHub, so nothing here may depend on the site it
currently sits in.

---

## Two rules that are easy to break by accident

**1. It does NOT follow the repo's `AESTHETIC.md`.** That file is the unisam.nz
house style and it does not apply here. Checkin is styled after `ratibro/`:
Fraunces headings, Nunito body, amber `#F4A629` on navy `#1E2A4A`, warm `#F7F6F2`
ground, soft shadows, 14px radii, light and dark themes. It uses drop shadows and
a dark mode toggle, both of which `AESTHETIC.md` forbids. That is intentional. Do
not restore the house style, do not add the site logo, do not add a unisam.nz
link, and keep every path relative.

**2. Run `python3 stamp.py` before committing any change to the pages or the JS.**
The host sends `cache-control: max-age=14400`, so a browser keeps a module for
four hours. New HTML running against an old cached module does not merely look
stale, it breaks: this produced `can't access property "innerHTML", box is null`
after one change. `stamp.py` puts a fresh `?v=` on the stylesheet, every script src and every
relative import so the browser cannot serve an old copy. CDN imports are left
alone. Forgetting the stylesheet in that list once left phones rendering the
sidebar markup with no styles at all, which looks like a giant icon and a
stacked menu above the page.

A corollary: never use `location.reload()` or `location.replace()` as a step in a
UI flow. If the page comes back from cache the flow silently appears to do
nothing. Update the DOM in place instead.

---

## Stack

Plain HTML, CSS and ES modules. No build step, no framework, no bundler.

- **Auth**: Firebase Auth, Google sign-in only.
- **Data**: Firestore, project `coldwar-d8109` (a personal project used for
  trying it out; swap `firebaseConfig` in `js/firebase.js` when it moves).
- **Rules**: `firestore.rules`. The console holds its own copy, so **republish
  there whenever that file changes**. Rules are not deployed from this repo.
- Outside code loaded: Firebase SDK, Google Fonts, `qrcode-generator`, all CDNs.

Setup and migration steps are in `SETUP.md`.

---

## Pages

| Page | Who | What |
|---|---|---|
| `index.html` | anyone | Split navy/cream sign-in. Google only. |
| `home.html` | anyone | Classes you teach and classes you are in. Asks teacher or student on a first visit. |
| `teach.html` | teacher | One class: its question sets, the roll, the join code, class settings. |
| `set.html` | teacher | Build or edit a question set, by hand or from CSV. |
| `results.html` | teacher | One set: how they did, what they wrote, marking, live controls. |
| `qr.html` | teacher | One question as a QR code big enough to scan from the back of the room. |
| `students.html` | teacher | The whole roll with each student's most recent result and a trend line. |
| `student.html` | teacher | One student: every set they have done and a percentage-over-time chart. |
| `class.html` | student | The current question, large. Older sets behind "Previous questions". |
| `answer.html` | student | One set: answer it, review it marked, or practise it. |

`js/history.js` gathers how a class has done across all its sets and draws the
sparklines and the percentage chart. It recomputes marks from each set's answer
key rather than trusting stored scores, because a set whose responses page was
never opened has no stored marks and would otherwise read as zero.

`js/core.js` holds everything shared: auth guard, the sidebar shell, all
Firestore access, CSV parsing and the marking maths. `js/answering.js` renders
the student question view and is used by both `class.html` and `answer.html`.

---

## Data model

```
users/{uid}                     email, name, role, and a cached list of classes
joinCodes/{CODE}                points a six character code at one class
classes/{cid}                   name, ownerUid, joinCode
  members/{uid}                 the roll, students only, teacher is not a member
  blocked/{uid}                 students the teacher removed
  sets/{sid}                    title, mode, status, reveal, questions[]
    keys/key                    the answer key, teacher only
    responses/{uid}             one document per student per set
      retakes/{attemptId}       private practice runs, that student only
```

Two things worth knowing:

- **The class list on a user document is only a convenience** for the home page.
  Access is always decided by the member documents and by `ownerUid`, so removing
  a student cuts them off immediately regardless of their cached list.
- **`role` on a user document is a display preference, never a permission.** It
  decides which half of the home page leads. Nothing in the rules refers to it,
  and a student-role account can still create a class.

---

## The answer key

Correct answers live in `sets/{sid}/keys/key`, which only the teacher can read. A
copy is placed on the set document, where students can read it, **only when they
are allowed to know**: either the set marks multiple choice instantly, or results
have been released. `syncKeyVisibility()` in `js/core.js` is the only thing that
should ever move it. Putting results back on hold removes the copy again.

This is why a student cannot dig the answers out of the page before answering.

---

## Design decisions already made

These were settled with Sam. Do not quietly reopen them.

- Questions are multiple choice (auto-marked) or short text (marked by the
  teacher as right/wrong, or out of a per-question total).
- Students sign in with Google too. They join with a six character code and are
  admitted straight away. Removing a student also blocks them rejoining.
- A set is either self paced or live, where the teacher advances the question.
- Marks are shown instantly for multiple choice, or held until released. Per set.
- Answers stay editable until the teacher closes the set. One response each.
- The student class page leads with the current question, large and answerable
  with no further clicks. Older sets sit behind "Previous questions".
- **No projector view for questions.** Deliberate. QR codes are the exception.
- Practice retakes are **private to the student**. The teacher never sees them,
  and the marked record is never touched.

---

## On a phone

Under 680px the sidebar becomes a drawer and a navy top bar carries the
hamburger and the wordmark. Both are rendered by `paintShell()` in `core.js`, so
pages do not carry any menu markup of their own. The drawer closes on the scrim,
on any nav link, and on Escape. List rows stack rather than squeezing four
columns onto a phone, and tables stay inside `.scroller`.

## Conventions

- Match the existing voice in the interface: plain, direct, no exclamation marks,
  no em dashes anywhere.
- Prefer patching the DOM over re-rendering where a re-render would destroy what
  someone is typing. `refreshProgress()` in `answering.js` is the pattern.
- Guard repaints while a mark is being typed: `safePaint()` in `results.js`.
- The pure logic (CSV parsing, marking maths, retake gating) has tests that run
  outside a browser by stubbing the Firebase imports. Keep them passing.
