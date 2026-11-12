# Birds of a Feather, `/birds`

A classroom grouping puzzle for Sam's students (was Class Connections). Sixteen cards hide four groups of four (nine cards in three groups of three in Sound it out). Players pick a group's worth of cards and press Check, with four lives. There is one daily puzzle per set, then random extras. Single HTML page, no server, no accounts, and the only thing saved is a note in the browser that today's puzzle is done. Keep it clearly its own thing: do not bring back the NYT game's name or its yellow, green, blue and purple.

Sets: Business Management and Economics (IB, with an SL/HL toggle), two kids modes: Picture words (set key `kids`, ages 5 to 7, emoji on every card) and Sound it out (set key `sound`, for Sam's 5 year old learning to read). Plus a History section with FMW (set key `fmw`, Grade 9 history, no SL/HL). All play the same game, on a 4 by 4 board except Sound it out, which is 3 by 3. The menu has IB, History and Kids sections, and Sam plans more kids modes: add a card to the Kids section, a bank, and the set key to `TITLES`, `LINKS`, `KIDS_SETS` and `BANKS`.

Sound it out: a 3 by 3 board, because Sam found 16 words too many to sound out. `meta.grid` in the bank sets the size (`grid()` in the page, Sam's idea: same word list, just fewer drawn). Each puzzle uses three of the four tiers at random, three words from each, so about a quarter of puzzles have no word family. Every word can be sounded out, mostly 3 letters, and no more than half the cards left on the board ever have a picture. `meta.picturesPerGroup` (1) does this in `limitPictures`: a limit per group holds at every stage of the game (2 of 3 would break it on the last group), and which words get a picture changes each puzzle. There is no Voice toggle here, because reading the word aloud would defeat the point. Tier 4 holds the word families (`-at`, `-ock`). Sam is happy with 4-letter families like `-ill` and `-ock`, so do not cut them to raise the 3-letter share. `check_banks.py` holds the list of allowed 5-letter words and the 55% floor for 3-letter words. This bank's daily variety is 905 against the test's limit of 900, so removing categories may fail `test_generation.js`.

FMW: built 2026-11-13 from Sam's word list in the vault note `temp/birds.md` (units 1, 2A, 2B, 3, 4, one category per heading). Each category is its own tick box (topic code = category id), grouped by unit, so a class can play one unit or any run of units; unit headings come from `meta.unitNames` in the bank. `ref` is the unit name. Sam's lists went in as written apart from British spelling and French accents. Claude added nine categories (mostly tier 4 wordplay) and marked each with `"added": true`; the list is also at the end of the vault note, in case Sam wants to delete them. Shared words between units (sugar, indigo, Versailles, machine gun and so on) are declared clashes, and `as-treaty` also clashes with `as-china` and `as-japan` so "Nanking" never sits beside "Treaty of Nanking".

Live at unisam.nz/birds, with direct links `#business`, `#economics`, `#kids`, `#sound` and `#fmw`. Linked from `/tools` and `/find`. Look: `AESTHETIC.md` Option B, masthead on every screen (Sam asked to keep it in games). Found groups are shorter than live cards so the rest stays on screen. The private Claude artifact (https://claude.ai/artifact/M1PxwvJuuyzNCVjKdnT3P3) is out of date, with the old gameplay: do not treat it as live.

## Where the code lives

- **Source of truth: `~/samsmasm.github.io/birds/`.** Pushing `main` there deploys the site.
- **Vault hand-off copy: `temp/connections/` in the notes vault.** Its `CLAUDE.md` is a copy of this file. Its code is the old Class Connections version (drag and reveal), so do not build or deploy from it, and its `tests/test_units.js` is older than the one here. Sessions without the site repo can still work on the JSON banks there, then those banks get merged here.
- **Merging banks from the vault:** vault banks up to commit `69788ef` are merged here. To merge later changes, copy the banks over, keep the two small fixes made here (Kids `design_notes` no longer mention age modes, BM topic labels use "Organisational"), build and run all three tests.

## Layout

```
CLAUDE.md                   this file
index.html                  BUILT output, the whole site. Do not edit by hand.
build.py                    embeds the five JSON banks into src/template.html -> index.html
src/template.html           all HTML, CSS and JS. Placeholders: __BM_JSON__ __ECON_JSON__ __KIDS_JSON__ __SOUND_JSON__ __FMW_JSON__
data/bm_categories.json     Business Management bank (313 categories, every subtopic in Units 1 to 5 including HL)
data/econ_categories.json   Economics bank (110 categories)
data/kids_categories.json   Picture words bank (40 categories, has a parallel "emoji" array)
data/sound_categories.json  Sound it out bank (53 categories, 331 words, each word used once, so clashesWith stays empty)
data/fmw_categories.json    FMW Grade 9 history bank (42 categories, 5 units; "added": true marks Claude's additions)
tests/check_banks.py        validates the banks (schema, topic codes, clash links, undeclared shared words, level and HL refs), and for Sound it out: decodable patterns, word length, no repeats
tests/test_generation.js    runs the generator 2000 times per bank, checks no repeated words, the picture limit, the guess helpers, pickVoice and 1000 days of daily puzzles
tests/test_units.js         checks each unit alone can make a puzzle, at SL and HL, and that SL never shows an HL group
```

Workflow: edit `src/template.html` or a JSON bank, run `python3 build.py`, then `python3 tests/check_banks.py`, `node tests/test_generation.js` and `node tests/test_units.js`. Only commit `index.html` after the build. Stage this folder by name (never `git add -A` in this repo) and `git pull --rebase` before pushing, because bots commit to `main`.

## Data format (all five banks)

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
- `level`: "SL" or "HL" on every BM and Econ category, HL when any of its topics is HL. Derive it from the topics, never set it by hand. An HL category's `ref` ends in HL. The kids banks and FMW have no level (`KIDS_BANKS` in `check_banks.py` lists the banks without one).
- `words`: 4 to 10 items. The site draws 4 at random each time, so longer lists give more variety. Cards should be short (under about 28 characters).
- `clashesWith`: ids of categories that make a word ambiguous. The site treats it as two-way. Any two categories that share a word must list each other (`check_banks.py` enforces this).
- Kids banks: each category also has `emoji`, same length as `words` (empty string where there is no good emoji). Their "topics" are themes, not syllabus codes.
- Optional `meta` settings, used by Sound it out: `grid` (`n` groups, `per` words each, `tiers`) replaces the default 4 by 4, and `picturesPerGroup` limits the emoji shown in each group.
- `ref` is the syllabus subtopic code, shown on the reveal banner.

## How puzzles are generated (in `src/template.html`, between `/*LOGIC_START*/` and `/*LOGIC_END*/`)

1. Filter categories to those whose topics are all ticked and that have enough words.
2. Pick one category per tier (amber to navy), preferring the exact tier and borrowing the nearest tier if empty.
3. Reject a pick if it clashes with a chosen category or shares any word (case-insensitive, full word lists) with one.
4. Draw 4 random words from each, shuffle all cards. Every set is 4 by 4 except Sound it out, which draws 3 words from each of three random tiers (`meta.grid`).
5. If 400 attempts fail, show "not enough categories" and ask for more ticks. Single topics often cannot make a full puzzle; a whole unit always can.

The logic block is pure functions so the Node test can load it. Keep it free of DOM calls.

## Daily puzzle

- Opening a set starts today's puzzle: the same cards in the same order for everyone, made by the normal generator with `seededRandom(day + ':' + set)` in place of `Math.random`. Sam is happy with the generator as it is: cards that could fit two groups are part of the game, and the only thing to avoid is the exact same word twice, which it already blocks.
- The day changes at 23:00 UTC (`dayKey`), which is 6am in Vietnam all year. Sam wanted the change between 9pm and 7am Vietnam time, at night for as many IB students as possible. The Americas are never at night in that window, so 6am keeps the change out of the school day for the US, Europe and most of Asia.
- It always uses every SL topic (`dailyCodes`), whatever is ticked. The ticks and the SL/HL toggle only apply to extra puzzles.
- Finishing it, win or lose, stores the day in localStorage as `birds-done-<set>`. Until the next day, opening or refreshing that set gives a random extra puzzle. This is a loose lock on purpose: refreshing mid-game restarts the daily, and another browser gets round it.
- The title says "Daily puzzle: Economics" with an amber underline and the date beside it, or "Extra puzzle: Economics" with "Today's daily is done". Menu cards say "Daily puzzle ready" or "done" for each set.
- If a daily is unfinished, the Topics panel shows a Daily puzzle button to get back to it from an extra puzzle.
- Editing a bank changes the daily puzzles from then on, including today's, so push bank changes in the evening Vietnam time if it matters.

## Interaction

- Direct links: `/birds#business`, `/birds#economics`, `/birds#kids`, `/birds#sound`, `/birds#fmw`. The hash drives the screen (`route()`), so the browser Back button works. Going to the menu and back into the same set resumes the puzzle. Opening a different set starts a new one.
- Click or tap cards to pick up to four, and again to unpick. No dragging. Shuffle is a normal button and keeps the picks.
- New puzzle lives inside the closed Topics panel so kids do not press it by accident, with an inline "Are you sure?" (no browser dialog or modal). When a game ends or no puzzle can be made, a big New puzzle button replaces Check, with no confirmation.
- Check is the big amber button, centred on the page, and is enabled at four picks (three in Sound it out). Right: the group moves to the top as a coloured row with the category name and syllabus ref. Wrong: "Not quite.", one feather lost, the cards shake and stay picked so one or two can be swapped. A wrong guess cannot be tried again in that puzzle, in any order: Check stays disabled and it says "Already tried.", with no life lost (`S.tried`, `guessKey`). It never says how close a guess was.
- Sounds after Check: a rising sparkle when right, a soft two-note fall when wrong. Made with Web Audio (`play`, `SPARKLE`, `SAD`), no files, and independent of the Voice toggle.
- SL/HL toggle: in the Topics panel for BM and Econ, hidden for the kids sets, remembered per set in `S.level` while the page is open (no localStorage). SL is the default: every SL topic ticked, HL boxes unticked and locked, and Select all or All skip them, so a student cannot get HL by accident. HL ticks everything, because the HL course includes SL, and boxes can then be changed one by one. The toggle only moves ticks: the puzzle changes on New puzzle, and the generator is unchanged. Sam first asked for everything ticked by default, then the toggle brief said SL by default, so SL with all SL ticked covers both.
- Revealed HL groups show a plain "HL" after the name (plain text, not a pill, per `AESTHETIC.md`).
- Four lives. At zero the remaining groups appear in tier order. There is no score or history by design.
- All five sets play the same game. A small Voice on/off toggle next to Shuffle reads a card aloud when it is tapped, in every set except Sound it out; it starts off and stays as set when switching sets. `pickVoice` prefers lighter named English voices, with pitch 1.25 and rate 0.9, because device defaults sounded deep. What it sounds like depends on the voices installed on each device.
- The page registers `window.claude.hot.snapshot` so an open viewer keeps its puzzle across a republish. This is harmless outside the Claude viewer.

## Sources of truth for content

- IB course guides: do not copy guide text into the bank or the vault. Topic titles and standard terms only.
  - BM: `~/samsmasm.github.io/ibbmsyllabus.md`
  - Econ: `~/samsmasm.github.io/ibecon-src/refdocs/ibeconsyll.txt`
- Topic codes follow the vault's syllabus map (`/CLAUDE.md` at the vault root). Both banks cover the whole guide. Every HL topic code ends in `HL`: whole HL-only subtopics such as BM `2.5 HL`, `3.6 HL`, `5.9 HL` and Econ `2.4 HL`, and extensions inside SL subtopics such as BM `2.4 HL`, `Toolkit HL` and Econ `2.5 HL`. The SL part keeps the plain code, so `2.4` and `2.4 HL` are two tick boxes.
- Known thin sets: BM and Econ Concepts, Econ Toolkit, and the HL-only topics of Econ Units 3 and 4 cannot make a puzzle alone, so the page shows "not enough categories". BM `ip-types` has only 3 words, so it is never drawn until it gets a fourth.
- BM bank was checked against the project's Business Management course guide and Kognity notes. The Econ bank was built in the Economics Claude project from its guide. Both kids banks are original. Skim tiers 3 and 4 before class use.

## Working style (Sam's preferences)

- No em dashes anywhere, in code comments, UI text or notes.
- British or New Zealand spelling (organisation, labour, colour).
- Do not address Sam by name in replies. Do not ask him questions or steer; make a sensible decision and say what was chosen.
- Voice dictation is common, so tolerate odd phrasing. "talkonomics" is the right spelling when it is misheard.
- Keep UI plain and big enough to read from the back of a classroom. No scores, accounts or tracking.

## Ideas not built yet

- An "HL only" level option for revising extension content (optional in the toggle brief, left out to keep the control simple).
- A "harder mode" that allows overlapping categories as deliberate red herrings (the `clashesWith` data already supports it).
- Print or export of a puzzle and its answer key.
- Loading the banks from the JSON files instead of embedding them, if Sam wants to edit banks without rebuilding.
