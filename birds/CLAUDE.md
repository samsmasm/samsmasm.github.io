# Birds of a Feather, `/birds`

A classroom grouping puzzle for Sam's students (was Class Connections). Sixteen cards hide four groups of four. Players pick four cards and press Check, with four lives. Single HTML page, no server, no accounts, nothing saved. Keep it clearly its own thing: do not bring back the NYT game's name or its yellow, green, blue and purple.

Sets: Business Management (IB SL), Economics (IB, HL topics have their own tick boxes) and Kids (ages 5 to 7, emoji on every card, optional read-aloud).

Live at unisam.nz/birds. Linked from `/tools` and `/find`. Look: `AESTHETIC.md` Option B, masthead on every screen (Sam asked to keep it in games). Found groups are shorter than live cards so the rest stays on screen. An older private copy is a Claude artifact (https://claude.ai/artifact/M1PxwvJuuyzNCVjKdnT3P3).

## Layout

```
CLAUDE.md                   this file
index.html                  BUILT output, the whole site. Do not edit by hand.
build.py                    embeds the three JSON banks into src/template.html -> index.html
src/template.html           all HTML, CSS and JS. Placeholders: __BM_JSON__ __ECON_JSON__ __KIDS_JSON__
data/bm_categories.json     Business Management bank (105 categories)
data/econ_categories.json   Economics bank (110 categories)
data/kids_categories.json   Kids bank (20 categories, has a parallel "emoji" array)
tests/check_banks.py        validates the banks (schema, topic codes, clash links, undeclared shared words)
tests/test_generation.js    runs the generator 2000 times per bank, checks no repeated words
```

Workflow: edit `src/template.html` or a JSON bank, run `python3 build.py`, then `python3 tests/check_banks.py` and `node tests/test_generation.js`. Only commit `index.html` after the build.

## Data format (all three banks)

```json
{
  "meta": {
    "course": "...", "scope": "...",
    "tiers": {"1": "amber", "2": "coral", "3": "teal", "4": "navy"},
    "topics": [{"code": "1.4", "label": "Stakeholders", "group": "Unit 1", "defaultOn": true}],
    "generator_rules": []
  },
  "categories": [
    {"id": "ext-stake", "name": "External stakeholders", "tier": 1, "ref": "1.4",
     "topics": ["1.4"], "words": ["Customers", "Suppliers", "..."], "clashesWith": []}
  ]
}
```

- `tier` 1 to 4 maps to amber, coral, teal, navy (CSS `--t1` to `--t4`). Tier 4 is wordplay (`___ capital`, abbreviations) or deliberate traps.
- `topics`: a category is only used when every one of its topics is ticked. Every topic starts ticked (Sam's choice), and the panel has Select all and Select none for the whole set plus All and None per unit. `defaultOn` in the banks is no longer read.
- `words`: 4 to 10 items. The site draws 4 at random each time, so longer lists give more variety. Cards should be short (under about 28 characters).
- `clashesWith`: ids of categories that make a word ambiguous. The site treats it as two-way. Any two categories that share a word must list each other (`check_banks.py` enforces this).
- Kids bank: each category also has `emoji`, same length as `words` (empty string where there is no good emoji). Kids "topics" are themes, not syllabus codes.
- `ref` is the syllabus subtopic code, shown on the reveal banner.

## How puzzles are generated (in `src/template.html`, between `/*LOGIC_START*/` and `/*LOGIC_END*/`)

1. Filter categories to those whose topics are all ticked and that have enough words.
2. Pick one category per tier (amber to navy), preferring the exact tier and borrowing the nearest tier if empty.
3. Reject a pick if it clashes with a chosen category or shares any word (case-insensitive, full word lists) with one.
4. Draw 4 random words from each, shuffle all cards. Every set is 4 by 4, including Kids.
5. If 400 attempts fail, show "not enough categories" and ask for more ticks. Single topics often cannot make a full puzzle; a whole unit always can.

The logic block is pure functions so the Node test can load it. Keep it free of DOM calls.

## Interaction

- Click or tap cards to pick up to four, and again to unpick. No dragging. Clear unpicks all. Shuffle keeps the picks.
- Check is enabled at four picks. Right: the group moves to the top as a coloured row with the category name and syllabus ref. Wrong: "Not quite.", one feather lost, the cards shake and the picks clear. It never says how close a guess was.
- Four lives. At zero the remaining groups appear in tier order. There is no score or history by design.
- Kids has the same game, plus read-aloud when tapped.
- The page registers `window.claude.hot.snapshot` so an open viewer keeps its puzzle across a republish. This is harmless outside the Claude viewer.

## Sources of truth for content

- IB course guides: do not copy guide text into the bank or the vault. Topic titles and standard terms only.
  - BM: `~/samsmasm.github.io/ibbmsyllabus.md`
  - Econ: `~/samsmasm.github.io/ibecon-src/refdocs/ibeconsyll.txt`
- Topic codes follow the vault's syllabus map (`/CLAUDE.md` at the vault root). BM SL only plus toolkit and concepts; Econ includes HL as separate codes such as `2.5 HL`.
- BM bank was checked against the project's Business Management course guide and Kognity notes. The Econ bank was built in the Economics Claude project from its guide. The Kids bank is original. Skim tiers 3 and 4 before class use.

## Working style (Sam's preferences)

- No em dashes anywhere, in code comments, UI text or notes.
- British or New Zealand spelling (organisation, labour, colour).
- Do not address Sam by name in replies. Do not ask him questions or steer; make a sensible decision and say what was chosen.
- Voice dictation is common, so tolerate odd phrasing. "talkonomics" is the right spelling when it is misheard.
- Keep UI plain and big enough to read from the back of a classroom. No scores, accounts or tracking.

## Ideas not built yet

- A "harder mode" that allows overlapping categories as deliberate red herrings (the `clashesWith` data already supports it).
- A fourth set (FMW grade 9 history) using the same bank format.
- Print or export of a puzzle and its answer key.
- Loading the banks from the JSON files instead of embedding them, if Sam wants to edit banks without rebuilding.
