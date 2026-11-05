# Strategy schema, version 1

A strategy is one JSON object. The engine (`js/engine.js`) reads it; nothing in it is ever run as code. `js/validate.js` checks it, `js/readback.js` turns it into plain English, and the AI prompt (`js/prompt.js`) carries a student-friendly copy of this page. **Change all four together.**

## Scoring

Years in jail, fewer is better: both cooperate 2 each, both defect 4 each, a defector against a cooperator 0 and 5. These are the literature's points (3, 1, 5, 0) as 5 minus points, so rankings match the classic results. `PAYOFFS` in `js/engine.js`.

## Shape

```json
{
  "schemaVersion": 1,
  "name": "Tit for Tat",
  "description": "Start nice, then copy their last move.",
  "firstMove": { "do": "cooperate" },
  "rules": [],
  "fallback": { "do": "copy" }
}
```

| Field | Required | What |
|---|---|---|
| `schemaVersion` | yes | Always `1` for now. A V2 engine keeps reading V1. |
| `name` | yes | 1 to 40 characters. |
| `description` | no | Up to 140 characters. |
| `firstMove` | yes | A decision for round 1. `do` may only be `cooperate`, `defect` or `pattern`. Rules never run on round 1. |
| `rules` | no | Up to 8. From round 2, checked top to bottom; the first that fits decides. |
| `fallback` | yes | A decision used when no rule fits. Cannot be `nextRule`. |
| `memory` | no | Up to 3 whole-number slots with starting values: `{ "grudge": 0 }`. Each match starts fresh. Values are clamped to -1000..1000. |
| `pattern` | no | 1 to 10 moves. Needed if anything uses `pattern`. Indexed by round number: round 1 is the first move, and it loops. |
| `slip` | no | 0 to 100. Percent of rounds a coin flip replaces the chosen move (so half of those rounds change). 100 is a fully random player. Applied last, after every rule. The game itself has no noise. |
| `approximations` | no | Up to 400 characters. Where the AI says what it could not build exactly. Shown beside the readback. |
| `builder` | no | The builder's answers, so a strategy can be reopened in the builder. Opaque to the engine, max 4000 bytes. |

Unknown fields are an error, with a "did you mean" suggestion.

## Decisions

`{ "do": ACTION }`, or with a chance: `{ "do": ACTION, "chance": 70, "otherwise": ACTION }`.

`chance` is a percent. Below 100, `otherwise` is required. One random draw per decision.

## Actions

| Action | Move |
|---|---|
| `cooperate`, `defect` | that move |
| `copy` | their last move |
| `opposite` | the opposite of their last move |
| `repeat` | my own last move |
| `switch` | the opposite of my own last move |
| `pattern` | the pattern's move for this round |
| `nextRule` | rules only (`do` or `otherwise`): skip to the next rule |

## Rules

```json
{ "when": [CONDITION, CONDITION], "do": "defect", "chance": 70, "otherwise": "nextRule",
  "set": { "grudge": 3 }, "change": { "grudge": -1 }, "label": "Grudge" }
```

- `when`: 0 to 2 conditions, all must hold. None means always.
- A rule is **used** when its conditions hold and its chance does not send it to `nextRule`. Only then do `set` and `change` apply (set first, then change). A rule whose `do` is `nextRule` is always used, which is how memory counts things without deciding the move.
- `label` (up to 50 characters) is shown in the readback and the replay.

## Conditions

`{ "check": WHAT, COMPARISON: VALUE }`, exactly one comparison.

| Check | Type | Notes |
|---|---|---|
| `theirLast`, `theirLast2`, `theirLast3` | move | Their move 1, 2, 3 rounds ago. Use `is`. Before then it is `none`, which matches nothing. |
| `myLast` | move | My move last round. |
| `round` | number | Starts at 1. |
| `roundsLeft` | number | Including this one, so the final round is `equals: 1` whatever the match length. |
| `theirDefections` | number | Total so far. |
| `theirDefectionsLast5` | number | In the last 5 rounds. |
| `theirDefectStreak`, `theirCoopStreak` | number | Run length ending last round. |
| `theirCooperationRate` | number | Percent, 0 to 100, rounded. |
| `myDefections` | number | Total so far. |
| `scoreLead` | number | Their years in jail minus mine, so positive means I am doing better. |
| `memory.NAME` | number | A slot declared in `memory`. |
| `chance` | special | `{ "check": "chance", "percent": 10 }`, one random draw. |
| `recent` | special | `{ "check": "recent", "them": ["cooperate"], "me": ["any", "defect"] }`. A pattern of past moves, one condition. Each list starts at last round, 1 to 3 long, entries `cooperate`, `defect` or `any`. Either list may be left out; at least one entry must not be `any`. Rounds before the match started match nothing. |

Number comparisons: `equals`, `atLeast`, `atMost`, `moreThan`, `lessThan`, `multipleOf`. Values are whole numbers. A range uses both conditions.

## Deliberately excluded

Recognising the opponent, full history beyond the counts above, information from other matches, more than two conditions per rule.

## Randomness

Every match has a seed: `tournamentSeed|idA|idB`. Each side gets its own generator (`seed|A`, `seed|B`), so one strategy's dice never shift the other's. Same seed, same strategies, same result, always.

## Adding V2 without breaking V1

- New checks, actions or fields: add them, bump `schemaVersion` to 2, and accept both in the validator. Old submissions keep their `1` and their meaning.
- Purely additive checks that change nothing an old strategy means (`recent`, added 2026-11-05) stayed at 1.
- Cheap talk: a new optional `messages` block plus new checks (`theirLastMessage`, `theirMessagesHonest`); the replay log already has per-round slots to carry them.
- Noise: a tournament option applied after `slip`, in `playMatch`.
- Evolutionary mode: a new entry in `FORMATS` in `js/tournament.js`.
