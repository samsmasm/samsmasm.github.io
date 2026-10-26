# FMW Imperialism in Asia: student guide site

A student-facing website for Sam's Grade 9 FMW (Foundations of the Modern World) unit "Imperialism in Asia" at SSIS, Ho Chi Minh City. About 40% of students are Vietnamese, about 35% Korean, the rest from many places. It is modelled on his earlier site unisam.nz/fmwafrica.

Served at unisam.nz/asia/ (this folder, `index.html`).

## What the unit is
Students write their own research question and answer it in a 4 to 5 minute recorded, voiced slideshow "documentary" (hard limit 5:30). Compelling question: "How did imperialism reshape power, place, and people in Asia between 1800 and 1914?" They follow the Big 6 research model, record sources and notes in NoodleTools (project named with first and last name, shared to G9 FMW Asia), and are marked on four strands plus one lens (Government, Geography, or Society and Technology).

## Files
- `index.html`: the whole site in one self-contained file (HTML, CSS and JS). Only external resource is Google Fonts.
- `CLAUDE.md`: this file.
- `sources/`: Sam's ebooks converted to text, for checking facts and quotes. Private. Never commit or publish (see Sources). Ignored by `.gitignore` in this folder.
- `asia-guide.html`: an older draft of `index.html`, kept local only. Not committed.
- The hand-off notes (README, to-projects, from-projects, status) live in the Obsidian vault, not here (see the last section).

## Structure of the site
Seven tabs across the top: Overview, Process, Content, Peer sharing and reflection, Exemplar, Rubric, Links. Every tab except Links has a left rail of its sections, one section shown at a time. Hash tokens: `stage-1` to `stage-6`, `overview`, `content`, `peers`, `example`, `rubric`, `links`.
- **Links**: every link, built from `LINKS`. Groups with an `id` (`l-primary`, `l-pictures`) can be targeted by pointer buttons (`data-goto="links" data-anchor="l-pictures"`). Never write "at the bottom of this page"; point to the Links tab.
- **Overview**: what students are making, how they get there (Big 6, link to the SSIS library Big 6 page), how it is marked, where work lives.
- **Process**: the six Big 6 stages as the rail (Task definition, Information seeking strategies, Location and access, Use of information, Synthesis, Evaluation). Each stage is short: a brief intro, a few actions, one "Do this" box, and one-line pointers to Content or Peers. Includes a "Copy planning template" button, a question map diagram (stage 1), a collapsed optional voices quiz, a script word counter, and a rubric level-tap self-check. "Clear what this page remembers" is on Overview, under Using this site.
- **Content**: teaching ideas (big questions, five ways empire worked with citations from the project books, power/place/people, the three lenses, four voices, change and continuity, own-history note).
- **Peer sharing and reflection**: reusable in-class activities written to work on any unit. Data is the `ACTIVITIES` array in the script.
- **Exemplar**: Sarawak under the Brooke family, laid out by the six stages.
- **Rubric**: plain words, a level-tap self-check, and the full rubric word for word. Data is the `RUBRIC` array.

## Design rules (decided with Sam)
- Keep cognitive load low. Do not put everything from the class slides on one page. Process stages stay short; teaching content lives on the Content tab.
- Do not give students boxes to write in unless there is a serious reason to structure the input (the question tester, script counter). Everything else is written in their own Google Doc. Notes are made in NoodleTools, not on this site or in the Doc. Sam removed the source log (2026-10-26) because it repeated NoodleTools; students tag note cards by voice there instead. Do not add tools that duplicate NoodleTools.
- Keep it short. When adding anything, look for what could be removed and ask Sam.
- The planning template (`buildTemplate()` in the script) must follow the six Big 6 stages and contain no in-class activities.
- Honest about limits: the site does not save work reliably (localStorage only, wrapped in try/catch). Never imply it does.
- Worked example comes from outside the students' choice set, so it shows the moves, not content to copy.
- Palette: warm archive paper and ink, indigo accent. No red and gold, no flag colours, no colour per country, no "Asian-looking" fonts or motifs. The four source voices (Imperial, Local, Outside, Later) have muted colours and always show the voice name too. Dark mode is supported through the CSS variables at the top of `index.html`.
- Accessible and dyslexia-friendly: Atkinson Hyperlegible body, left-aligned, generous spacing, visible focus, works at phone width.
- The "If this is your own history" section on Content is deliberate: students may hold strong views and condemn actions and systems, must not judge a whole people or classmates, and should hold views lightly because classmates come from different places.

## Writing rules
- Never use em dashes or en dashes anywhere. Use commas, colons, full stops, or "to" for ranges.
- Student-facing text is plain, short, second person.
- In conversation do not address Sam by name.

## Where to edit things
All in `index.html`:
- `CONFIG` near the top of the script: `dueText` and `submitText` are empty, so students see "your teacher will tell you". Fill these in per class.
- `COUNTRIES`: the nine country starters (events, a question people ask, a voice to look for).
- `QUIZ`, `RUBRIC`, `LEVELS`, `ACTIVITIES`, `LINKS`, `LENSES`, `STEMS1`, `STEMS2`.
- Page text is plain HTML in the `<section id="view-...">` blocks. Paged tabs are built from `h3` headings by `buildPaged()`, so each `h3` becomes a rail item. Anchor ids such as `c-ways` are used by the pointer buttons (`data-goto` and `data-anchor`).
- localStorage key is `asia-documentary-guide-v2`. Bump it if saved state changes shape.
- `S.nav` remembers the last tab, Process stage and rail section per tab (saved only after boot). A bare URL with no hash reopens there; a hash in the URL always wins. "Clear what this page remembers" resets it.

## Next steps (Sam, 2026-10-26)
1. Rebuild the exemplar with citations from the project books (request is in the vault's `to-projects.md`).
2. Check the whole site for cognitive overload.
3. The Evaluation stage (Process, stage 6) needs work.

## Decisions taken (2026-10-26)
- Keep the "power, place, people" step in stage 1. Its sample questions are collapsed under "A sample question for each".
- Change and continuity (stage 4) stays and says it is its own rubric strand.
- The class research question sheets (Block E and G) are removed everywhere, for now. Do not mention a question sheet.
- Collapsing: only collapse extras (examples, practice, sample questions), never the steps themselves. The four voices quiz is a collapsed optional practice box.
- No due date yet. `CONFIG.dueText` and `submitText` stay empty until Sam gives them.

## NoodleTools title generator (stage 3)
Same pattern as fmwafrica: teacher (sgraham, tredfern, dniedringhaus), block A to H, first and last name, giving `<teacher>-<block>-asia-FirstLast`. Fields are `data-k` keys `ntTeacher`, `ntBlock`, `ntFirst`, `ntLast`; `renderNT()` builds the title. Names keep accents, including Vietnamese letters (`Ḁ-ỿ`). Until a block is chosen the title shows "Block", not a real letter, so nobody copies the wrong one.

## Remind Sam later (at the start of a session on this site)
- Confirm the teacher list for the title generator (copied from fmwafrica: Graham, Redfern, Niedringhaus) is right for Asia.
- Confirm the NoodleTools note card box names: Direct quotation, Paraphrase, My ideas (used in stage 4).
- Check every class link in `LINKS` still works (copied from last year's planner).
- Due date and submission lines for `CONFIG`.
- Verify the country starters and the Sarawak exemplar against sources (see below).
- Check publisher and year in the "Five ways" works cited list (Mishra edition least certain).
- The Siam example in "Five ways" is thin and needs a source.

## Open checks (detail)
- Country starters and the Sarawak exemplar were written from general knowledge and only partly verified. Sarawak facts checked so far: James Brooke arrived on the schooner Royalist in 1839, became Rajah in 1841, Japanese occupation 1941 to 1945, Vyner ceded Sarawak to Britain in 1946, the 1854 Singapore inquiry dismissed the charges, and Chinese gold miners at Bau rose in 1857.
- The works cited list under "Five ways empire worked" has publisher and year written from memory. Check against Sam's copies. The Mishra edition is least certain.
- The Siam example in "Five ways" is thin: the project books say little about Siam.

## Sources
Sam's project books (in the Claude Project and, if he adds them, in `sources/`): Lovell, The Opium War; Young, Japan's Total Empire; Brocheux and Hémery, Indochina: An Ambiguous Colonization; Mishra, From the Ruins of Empire; Dalrymple, The Anarchy; Seth, A Concise History of Korea.
- Convert epubs to text with pandoc, one file per book, into `sources/`. Keep `sources/` in `.gitignore`. Never publish full text; the site carries only short quotes with citations.
- Epubs have no page numbers. Cite by author and chapter.
- The Brocheux and Hémery text is a scan with OCR errors. Check its quotes against the print book.
- Any quotation added to the site must be found word for word in the converted text first (grep it). If it cannot be found, paraphrase instead.
- Sarawak is not covered by these books. A fully cited extended exemplar should use a topic they do cover, for example Cochinchina under France (Brocheux and Hémery) or the Opium War and treaty ports (Lovell, Mishra). Keep Sarawak as the short "moves, not content" example.

## Testing before you finish
1. Extract the script and run `node --check`.
2. Load the page in jsdom, click through every tab and a few stages, and confirm no errors.
3. Search the file for em dashes and en dashes (there must be none).
4. Look at it at phone width and in dark mode.

## Working with the Claude Project (content requests)
Content that needs the books is written by Claude in the Project "Imperialism in Asia". Hand-offs go through Sam's Obsidian vault (`~/notes`, private GitHub repo samsmasm/notes), folder `asia/`. Its `README.md` has the request and delivery formats:
- `to-projects.md`: Claude Code writes requests here (what content, where it goes, length, which books).
- `from-projects.md`: the Project writes finished content here with citations and a note on what was verified.
- `status.md`: what is done, what is open.
- `site-CLAUDE.md`: a copy of this file, so the Project can read the site's rules and plans. **Every time you edit this CLAUDE.md, copy it over `~/notes/asia/site-CLAUDE.md` and push the vault.** Never edit the copy directly.
Each side only writes to its own file. Nothing is automatic: Sam tells each side when to look. Pull the vault before reading. Do not put book text in the vault.
