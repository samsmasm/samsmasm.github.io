# Griz, `/griz`

Jeopardy-style quiz board for running competitive class quizzes from your own content. **In active use.** Linked from the homepage Tools dropdown and from `/tools` ("Generate competitive class quizzes from your own content").

## Files

One self-contained `index.html` (inline CSS and JS, about 600 lines). Only dependency is PapaParse from cdnjs. No backend, no storage: a game lives only in the open tab, and reloading wipes it.

## How a game runs

1. **Setup view.** Paste CSV, pick game mode, number of teams (1 to 6, names editable) and point decay rate, then **Build Grid**. **Load Example** fills a sample CSV.
2. **Board.** One column per category, tiles sorted by points. Column colours are spread evenly round the hue wheel.
3. **Question modal.** The live reward starts at the tile's points and drops by the decay rate every second (floor 0). Teacher reveals the answer and marks Correct or Wrong.
4. Turn passes to the team after the one who **picked** the tile, whoever ended up answering. Game ends when every tile is used; the winner modal shows the top score.

Teacher overrides on the scoreboard: click a team card to make it the active team; its **+** button adds any number of points (negative works too).

## CSV format

```
category,points,question,answer,type,media_url
Space,100,What planet do we live on?,Earth,text,
```

Parsed with `header: true`, so column names must match exactly. Only `category`, `points`, `question` and `answer` are used. `type` and `media_url` are read but **ignored** (no image/media support yet). Questions come from Sam's custom GPT, "Griz CSV generator", linked at the top of the setup view. If you change the CSV format, the GPT's instructions need changing too, and those live in ChatGPT, not this repo.

## Game modes

- **Standard (no negatives):** Reveal Answer, then Correct (+live points) or Wrong (0).
- **Pass/Steal:** before revealing, the active team can **Pass** (no penalty) or answer **Wrong** (loses the live points); either moves to the next team. When every team has had a go, the tile closes. After a reveal, Wrong also loses the live points.

## Times Tables Tool

The modal builds a board with one column per chosen table (1 to 12). Each column gets N random multipliers (N from the Rows slider), worth 100, 200, and so on. These questions are flagged `isMath`: instead of reveal buttons the modal shows a typed-answer box. Enter checks the answer by exact string match, then awards or fails automatically.

## Style

Dark theme (`#121212`, yellow highlight, green active team), Segoe UI. It predates `AESTHETIC.md` and is meant for projecting in a classroom, so keep it dark and high contrast rather than restyling it to the site palette.

Static, no build step; deploys on push to `main`.
