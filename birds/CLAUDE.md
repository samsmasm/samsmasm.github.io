# Birds of a Feather, `/birds`

A classroom grouping puzzle for Sam's students (was Class Connections). Sixteen cards hide four groups of four. Players pick four cards and press Check, with four lives. Single HTML page, no server, no accounts, nothing saved. Keep it clearly its own thing: do not bring back the NYT game's name or its yellow, green, blue and purple.

Sets: Business Management and Economics (IB, with an SL/HL toggle) and Kids (ages 5 to 7, emoji on every card). All three play the same 4 by 4 game and all have the Voice toggle.

Live at unisam.nz/birds, with direct links `#business`, `#economics` and `#kids`. Linked from `/tools` and `/find`. Look: `AESTHETIC.md` Option B, masthead on every screen (Sam asked to keep it in games). Found groups are shorter than live cards so the rest stays on screen. The private Claude artifact (https://claude.ai/artifact/M1PxwvJuuyzNCVjKdnT3P3) is out of date, with the old gameplay: do not treat it as live.

## Where the code lives

- **Source of truth: `~/samsmasm.github.io/birds/`.** Pushing `main` there deploys the site.
- **Vault hand-off copy: `temp/connections/` in the notes vault.** Its `CLAUDE.md` is a copy of this file. Its code is the old Class Connections version (drag and reveal), so do not build or deploy from it, and its `tests/test_units.js` is older than the one here. Sessions without the site repo can still work on the JSON banks there, then those banks get merged here.
- **Merging banks from the vault:** vault banks up to commit `69788ef` are merged here. To merge later changes, copy the banks over, keep the two small fixes made here (Kids `design_notes` no longer mention age modes, BM topic labels use "Organisational"), build and run all three tests.

## Layout

```
CLAUDE.md                   this file
index.html                  BUILT output, the whole site. Do not edit by hand.
build.py                    embeds the three JSON banks into src/template.html -> index.html
src/template.html           all HTML, CSS and JS. Placeholders: __BM_JSON__ __ECON_JSON__ __KIDS_JSON__
data/bm_categories.json     Business Management bank (313 categories, every subtopic in Units 1 to 5 including HL)
data/econ_categories.json   Economics bank (110 categories)
data/kids_categories.json   Kids bank (40 categories, has a parallel "emoji" array)
tests/check_banks.py        validates the banks (schema, topic codes, clash links, undeclared shared words, level and HL refs)
tests/test_generation.js    runs the generator 2000 times per bank, checks no repeated words, checks guessResult and pickVoice
tests/test_units.js         checks each unit alone can make a puzzle, at SL and HL, and that SL never shows an HL group
```

Workflow: edit `src/template.html` or a JSON bank, run `python3 build.py`, then `python3 tests/check_banks.py`, `node tests/test_generation.js` and `node tests/test_units.js`. Only commit `index.html` after the build. Stage this folder by name (never `git add -A` in this repo) and `git pull --rebase` before pushing, because bots commit to `main`.

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
- `topics`: a category is only used when every one of its topics is ticked. The panel has Select all and Select none for the whole set plus All and None per unit. The site reads HL from the code ending in `HL`, not from `defaultOn`, which only `check_banks.py` and `test_units.js` use.
- `level`: "SL" or "HL" on every BM and Econ category, HL when any of its topics is HL. Derive it from the topics, never set it by hand. An HL category's `ref` ends in HL. Kids has no level.
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

- Direct links: `/birds#business`, `/birds#economics`, `/birds#kids`. The hash drives the screen (`route()`), so the browser Back button works. Going to the menu and back into the same set resumes the puzzle. Opening a different set starts a new one.
- Click or tap cards to pick up to four, and again to unpick. No dragging. Shuffle is a normal button and keeps the picks.
- New puzzle lives inside the closed Topics panel so kids do not press it by accident, with an inline "Are you sure?" (no browser dialog or modal). When a game ends or no puzzle can be made, a big New puzzle button replaces Check, with no confirmation.
- Check is the big amber button, centred on the page, and is enabled at four picks. Right: the group moves to the top as a coloured row with the category name and syllabus ref. Wrong: "Not quite.", one feather lost, the cards shake and stay picked so one or two can be swapped. A wrong four cannot be tried again in that puzzle, in any order: Check stays disabled and it says "Already tried.", with no life lost (`S.tried`, `guessKey`). It never says how close a guess was.
- Sounds after Check: a rising sparkle when right, a soft two-note fall when wrong. Made with Web Audio (`play`, `SPARKLE`, `SAD`), no files, and independent of the Voice toggle.
- SL/HL toggle: in the Topics panel for BM and Econ, hidden for Kids, remembered per set in `S.level` while the page is open (no localStorage). SL is the default: every SL topic ticked, HL boxes unticked and locked, and Select all or All skip them, so a student cannot get HL by accident. HL ticks everything, because the HL course includes SL, and boxes can then be changed one by one. The toggle only moves ticks: the puzzle changes on New puzzle, and the generator is unchanged. Sam first asked for everything ticked by default, then the toggle brief said SL by default, so SL with all SL ticked covers both.
- Revealed HL groups show a plain "HL" after the name (plain text, not a pill, per `AESTHETIC.md`).
- Four lives. At zero the remaining groups appear in tier order. There is no score or history by design.
- All three sets play the same game. A small Voice on/off toggle next to Shuffle reads a card aloud when it is tapped, in every set; it starts off and stays as set when switching sets. `pickVoice` prefers lighter named English voices, with pitch 1.25 and rate 0.9, because device defaults sounded deep. What it sounds like depends on the voices installed on each device.
- The page registers `window.claude.hot.snapshot` so an open viewer keeps its puzzle across a republish. This is harmless outside the Claude viewer.

## Sources of truth for content

- IB course guides: do not copy guide text into the bank or the vault. Topic titles and standard terms only.
  - BM: `~/samsmasm.github.io/ibbmsyllabus.md`
  - Econ: `~/samsmasm.github.io/ibecon-src/refdocs/ibeconsyll.txt`
- Topic codes follow the vault's syllabus map (`/CLAUDE.md` at the vault root). Both banks cover the whole guide. Every HL topic code ends in `HL`: whole HL-only subtopics such as BM `2.5 HL`, `3.6 HL`, `5.9 HL` and Econ `2.4 HL`, and extensions inside SL subtopics such as BM `2.4 HL`, `Toolkit HL` and Econ `2.5 HL`. The SL part keeps the plain code, so `2.4` and `2.4 HL` are two tick boxes.
- Known thin sets: BM and Econ Concepts, Econ Toolkit, and the HL-only topics of Econ Units 3 and 4 cannot make a puzzle alone, so the page shows "not enough categories". BM `ip-types` has only 3 words, so it is never drawn until it gets a fourth.
- BM bank was checked against the project's Business Management course guide and Kognity notes. The Econ bank was built in the Economics Claude project from its guide. The Kids bank is original. Skim tiers 3 and 4 before class use.

## Working style (Sam's preferences)

- No em dashes anywhere, in code comments, UI text or notes.
- British or New Zealand spelling (organisation, labour, colour).
- Do not address Sam by name in replies. Do not ask him questions or steer; make a sensible decision and say what was chosen.
- Voice dictation is common, so tolerate odd phrasing. "talkonomics" is the right spelling when it is misheard.
- Keep UI plain and big enough to read from the back of a classroom. No scores, accounts or tracking.

## Ideas not built yet

- An "HL only" level option for revising extension content (optional in the toggle brief, left out to keep the control simple).
- A "harder mode" that allows overlapping categories as deliberate red herrings (the `clashesWith` data already supports it).
- A fourth set (FMW grade 9 history) using the same bank format.
- Print or export of a puzzle and its answer key.
- Loading the banks from the JSON files instead of embedding them, if Sam wants to edit banks without rebuilding.
