# Setting up The Long Game

It uses the **coldwar-d8109** Firebase project, the same as Checkin, aiorus and Lineup. Its data lives in its own collection, `dilemmaRooms`.

## The one step that is needed

**Paste the rules.** The rules are the `dilemmaRooms` block at the end of `../checkin/firestore.rules` (a project has one ruleset, so every tool's rules live in that one file). Paste the **whole file** into Firebase console > coldwar-d8109 > Firestore Database > Rules > Publish.

To check whether the console is current, search its Rules tab for `dilemmaPublic` (added with public competitions; before that the marker was `dilemmaRooms`). If it is not there, the rules need pasting. Until they are, the teacher page shows "Could not load rooms" and students get "The room would not accept it".

Everything else is already on for that project: Google sign-in (teachers), Anonymous sign-in (students), and unisam.nz and samsmasm.github.io as authorized domains.

## Data

```
dilemmaRooms/{CODE}            ownerUid, title, open, public, createdAt
  strategies/{uid_1..5}        a student's strategy: uid, handle, name, schemaVersion, json, createdAt
  strategies/{t...}            one the teacher added
  runs/{id}                    a saved tournament: settings, strategy ids, top of the leaderboard
  standings/current            public rooms: the official standings (settings + full ranking)
```

- A **public competition** is an ordinary room whose owner pressed "Make it a public competition". It is listed on `compete.html`, and anyone signed in (anonymous included) can read its strategies and standings. Going public exposes everything already sent, so the button takes two clicks.
- **Official standings**: after running a tournament with every strategy in a public room, the owner can press "Publish as official standings". The Compete page shows the top 20 and uses those settings (rounds, seed, self play) for every run there, so results compare.

- Students are anonymous. They can send up to 5 strategies per device per room, read back only their own, and never change or delete one. They can only send while the room is open.
- Only the teacher who made a room can read its strategies, remove them, close it, or save runs.
- The strategy is stored as a JSON string (max 8000 characters) and validated again when the teacher loads it.
- Deleting a room in the console does not delete its subcollections; delete those too if tidying up.
