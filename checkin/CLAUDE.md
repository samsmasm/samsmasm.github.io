# CLAUDE.md — Checkin

Concept checks for a class: short question sets mixing auto-marked multiple
choice with short written answers a teacher reads and marks.

**This folder is deliberately self-contained.** It is a concept intended to be
migrated to a school's own GitHub, so nothing here may depend on the site it
currently sits in.

> **Migrating this to another GitHub and another Firebase project?**
> The instructions are in **`SETUP.md`**, under *Moving it to another host and
> another Firebase project*, with the console steps it refers to just above it.
> Read that first; this file is about working on the code, not standing it up.
>
> The very short version: swap `firebaseConfig` in `js/firebase.js`, do the five
> console steps on the new project, and run `./test/run.sh` to check the copy is
> intact. Two of those five steps get missed and neither failure looks like a
> missing setup step: **enabling the Anonymous provider**, without which one off
> tests fail at the name step while everything else keeps working, and
> **publishing `firestore.rules` by hand**, which is not deployed from the repo.
> **No data comes across**: a new Firebase project starts empty.

---

## Three rules that are easy to break by accident

**1. It does NOT follow the repo's `AESTHETIC.md`.** That file is the unisam.nz
house style and it does not apply here. Checkin is styled after `ratibro/`:
Fraunces headings, Nunito body, amber `#F4A629` on navy `#1E2A4A`, warm `#F7F6F2`
ground, soft shadows, 14px radii, light and dark themes. It uses drop shadows and
a dark mode toggle, both of which `AESTHETIC.md` forbids. That is intentional. Do
not restore the house style, do not add the site logo, do not add a unisam.nz
link, and keep every path relative.

**Telling whether the published rules are current.** `firestore.rules` is not
deployed from this repo: the console holds its own copy, so the file here can be
ahead of what is live. Rather than guess, grep the console's Rules tab for the
newest marker in this file. As of 2026-09-25 that is **`runCodes`**, added with
one off tests; before that it was `retakes`. If the marker is missing, the live
rules are older than the repo and need a paste. `git log -- checkin/firestore.rules`
says when the file last actually changed, which is usually the faster answer.

---

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

**3. Run `./test/run.sh` before committing anything in `js/`.** It is quick and it
catches the failure this project is actually prone to: a page that looks entirely
normal while a feature is wired to nothing.

`results.js` used `wireMarkInput` and imported it from nowhere, so every mark box
threw on wiring and no written mark was ever saved. `teach.js` did the same with
the history helpers, so no trend line ever drew. Neither showed anything on the
page, and `node --check` cannot see either, because both files are valid
JavaScript. Marks looked as though they saved intermittently only because
multiple choice is recomputed from the key on every load.

`test/run.sh` does two things: it drives the real `results.js`, `teach.js`,
`student.js`, `check.js` and `go.js` in headless Chrome against a fake Firestore (`test/fake/`, swapped in
with an import map) and reads back what would truly have been written, then runs
`test/undefined-calls.py`, which reports any function called but never defined or
imported. Add a case to the matching page whenever marking, the roll or the
student view changes.

Traps when writing one of these harness pages: an import map value must be
`./fake/x.js` and never a bare `fake/x.js`; the theme comes from localStorage, so
setting `data-theme` alone is undone the moment the shell paints; and a harness
page missing an element the real page has looks exactly like a real bug. Where a
test needs a page's markup, fetch the real `.html` and slice it rather than
pasting a copy that will drift.

The fakes are only as honest as they are made to be. `test/fake/firestore.js` has
had to learn that `doc(collectionRef)` mints an id, that a reference carries
`.id`, and that a listener on one document is a different shape from a listener
on a collection. Each of those gaps made a passing test meaningless until it was
fixed. If something works in a test and not in the browser, suspect the fake.

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
| `teach.html` | teacher | One class. Sets, the roll with how each student is going, the join code, and settings (rename, remove a student). |
| `set.html` | teacher | Build or edit a question set, by hand or from CSV. |
| `results.html` | teacher | One set: how they did, what they wrote, marking, live controls. |
| `qr.html` | teacher | One question as a QR code big enough to scan from the back of the room. |
| `checks.html` | teacher | One off tests: the list, and making a new one from scratch or from a set you already have. |
| `check.html` | teacher | One one off test: its runs, the live code, and starting it again for the next group. |
| `go.html` | anyone | Answering a one off test with **no account at all**: a code, a name, the questions. |

The one off code box is on the sign-in page and on the home page, from
`js/codebox.js`. One module for both, because two copies of a box that small is
how the two end up behaving differently.
| `student.html` | teacher | One student in detail: their line against the class average, where the marks went, and every set folded shut over the whole paper. |
| `class.html` | student | The current question, large. Older sets behind "Previous questions". |
| `answer.html` | student | One set: answer it, review it marked, or practise it. |

`js/history.js` gathers how a class has done across all its sets and draws the
sparklines and the percentage chart. It recomputes marks from each set's answer
key rather than trusting stored scores, because a set whose responses page was
never opened has no stored marks and would otherwise read as zero.

`loadClassHistory` returns three things: `sets`, `byStudent` (one point per set
per student, carrying the class average, their place and how many sat it) and
`bySet` (the whole class on that set, including per question how many tried it
and how many got full marks). All of it falls out of responses that had to be
read anyway, so a class comparison anywhere costs no extra reads. `studentQuestions`
is pure: it re-reads what is already loaded and returns every question one student
met, so the detailed view needs no second trip to Firestore.

`js/core.js` holds everything shared: auth guard, the sidebar shell, all
Firestore access, CSV parsing and the marking maths. `js/answering.js` renders
the student question view and is used by both `class.html` and `answer.html`.

---

## One off tests

For a room that is not a class: a relief lesson, a workshop, an open evening.
Nobody signs in.

**It is not a second implementation of anything.** A one off test is a container
in `classes/` carrying `kind: 'oneoff'`, and each of its runs is an ordinary
question set inside it. That is deliberate and load bearing: the builder, the
marking grid, the written answer panels, the QR page and the student question
view all work on it unchanged. Anything that special cases a one off should be a
line or two about wording or a link, never a parallel copy of a feature. The two
worst bugs this project has had both came from a second copy of something
drifting from the first.

A **run** is a batch of people. Starting the test again copies the questions and
the key into a new run with a new code, so the group that sat it last period
cannot turn up in this period's results, and an edit now cannot rewrite what an
earlier group was asked. Settled with Sam: runs, not copies of the whole test.

Identity, where there are no accounts:

- The browser is given a **Firebase anonymous account** it never sees. Firestore
  needs somebody to pin a write to; without this the rules would have to accept
  writes from anyone at all. `requireAnyUser()` in core.js is the guard: it never
  redirects to sign-in and never writes a user document.
- The person types a **name**, which is claimed in
  `classes/{cid}/sets/{sid}/names/{slug}`. A second person typing the same name
  is turned back and asked to add a last name, which is what Sam chose over
  letting duplicates through or renaming them silently. The claim is read one
  document at a time by id, never listed, so checking a name cannot become a way
  to pull out who is in the room.
- The name is kept in `localStorage` per run, so a reload does not ask again and
  does not start a second answer sheet.

`realAccount()` in the rules keeps an anonymous visitor from creating classes,
join codes or run codes: a throwaway account may answer, and nothing else.

**Anonymous sign-in is enabled on coldwar-d8109**, with auto clean-up on (Sam did
this on 2026-09-25). It is still worth writing down for a fresh project:
Authentication > Sign-in method > Add new provider > Anonymous. Without it the
name step fails with `auth/operation-not-allowed` and nothing else in Checkin is
affected. Auto clean-up deletes unused anonymous accounts after 30 days and does
not touch Firestore, so results already written stay.

---

## Data model

```
users/{uid}                     email, name, role, and cached lists of classes and one offs
joinCodes/{CODE}                points a six character code at one class
runCodes/{CODE}                 points a six character code at one run of a one off test
classes/{cid}                   name, ownerUid, joinCode
                                a one off test is the same document with kind: 'oneoff',
                                no joinCode and no members
  members/{uid}                 the roll, students only, teacher is not a member
  blocked/{uid}                 students the teacher removed
  sets/{sid}                    title, mode, status, reveal, questions[]
                                a run of a one off test also carries runCode and runLabel
    keys/key                    the answer key, teacher only
    names/{slug}                one off tests only: a name claimed in a room with no accounts
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

## Marks are written one question at a time

`applyMark()` and `autoMark()` in `results.js` write a **single question's mark**
through `saveOneMark()`, never the whole `marks` map, and no `score` field is
stored at all. This is not a style preference. Writing the whole map from local
state meant a snapshot arriving mid-run could reassign `responses` underneath
`autoMark`, whose stale copy then overwrote a mark the teacher had just entered.
Marks appeared to save and were silently wiped later, sometimes.

Nothing reads a stored score: every view works the total out from the marks with
`totalAwarded()`, so storing it only created something that could go stale.

Keep both properties. If you ever need to write several marks at once, write
them as separate keys under `marks`, not as a replacement map.

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
- **A student is never shown marks for work that has not been marked.** The
  total they see counts only what has actually been decided, so eight right out
  of eight multiple choice reads as "8 out of 8" with a line saying the written
  answers are still with the teacher, not "8 out of 12" as though they had lost
  four marks. A question left **blank** is different and does count: nobody is
  waiting on it, and leaving it out would flatter them instead. `studentScore()`
  in core.js is the one implementation, used by the finished screen, the class
  page and both set subtitles, so they cannot quote different numbers for the
  same paper. Teacher views still show the true total out of everything.
- **A one off run carries two names**: the quiz is named on the container and the
  batch on the run (`runLabel`). Students are shown both, quiz first, because
  "Period 3" on its own tells them nothing about what they are sitting. The
  builder's title field edits the **batch** name for a one off run: it used to
  write `title` and so quietly overwrote the quiz name, which is how students
  ended up seeing only the batch. Renaming the test updates every run's copy of
  the title.
- Handing in ends on a **finished screen of its own**, not a line of text under
  the last question, which read as nothing having happened. It carries the score
  if they are allowed to know it, what they left blank, and where to go next:
  the class, practice, earlier sets, or another code for a one off. The way back
  into the answers is the quiet option at the end, since answers stay editable
  until the set closes. Arriving at a set already handed in still opens on the
  answers, because that is what the student clicked to see.
- Results split two ways: a set's own page stays scoped to that set, and anything
  across time lives on the class page. Clicking a student's name anywhere on a
  set's responses page opens their detailed history.
- The detailed view of a student is **this class only**, not every class Sam
  teaches them in. Settled 2026-09-24.
- That page is ordered how they are going, then what is worth acting on, then
  everything: the chart and where they stand, then the outlier flags and where
  the marks went, then every set folded shut. Sets open onto the whole paper:
  what was asked, what they put, what was right, and any comment. Chosen over
  summary tiles and an always-open transcript.
- A question is flagged as an outlier only when at least four students answered
  it: missed when 70% or more of them got full marks, got when 30% or fewer did.
  Below four the comparison says nothing, so nothing is claimed.

---

## The percentage chart

One student's line against a quiet dashed grey class average. Two series, so
there is a legend and both lines are labelled at their right-hand end: identity
is never left to colour alone. The axis is pinned to 0 to 100 because the numbers
are percentages and a trimmed axis invents drama that is not there.

The student's line is `--chart-them`, which is the **darker** amber on a light
ground and the bright one on navy. That is measured, not taste: `--primary` on
cream sits under 2:1 against the page and reads as a smudge. The class line is
grey on purpose. It is a reference, not a rival, and it should never compete with
the student for attention.

The chart is drawn in viewBox units and scaled to fit, so its 11px labels land at
about 6 real pixels on a phone. The mobile block in `style.css` scales the type
and strokes back up; those are the same sizes seen through the shrink, not a
second design.

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
