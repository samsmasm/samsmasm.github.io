# FMW Imperialism in Asia: student guide site

A student-facing website for Sam's Grade 9 FMW (Foundations of the Modern World) unit "Imperialism in Asia" at SSIS, Ho Chi Minh City. About 40% of students are Vietnamese, about 35% Korean, the rest from many places. It is modelled on his earlier site unisam.nz/fmwafrica.

Served at unisam.nz/asia/ (this folder, `index.html`).

## What the unit is
Students write their own research question and answer it in a 4 to 5 minute recorded, voiced slideshow "documentary". Compelling question: "How did imperialism reshape power, place, and people in Asia between 1800 and 1914?" They follow the Big 6 research model, record sources and notes in NoodleTools (project named with first and last name, shared to G9 FMW Asia), and are marked on four strands plus one lens (Government, Geography, or Society and Technology).

**Time limit:** students are told 5 minutes ("stay under 5 minutes"). Sam allows 30 seconds of leeway but does not tell them, so never show 5:30 anywhere. The script counter flags anything over 650 words (5:00 at 130 words a minute).

## Files
- `index.html`: the whole site in one self-contained file (HTML, CSS and JS). Only external resource is Google Fonts.
- `CLAUDE.md`: this file.
- `sources/`: Sam's ebooks converted to text, for checking facts and quotes. Private. Never commit or publish (see Sources). Ignored by `.gitignore` in this folder. Not currently on this laptop.
- `asia-guide.html`: an older draft of `index.html`, kept local only. Not committed.
- The hand-off notes (README, to-projects, from-projects, status) live in the Obsidian vault, not here (see the last section).

## Structure of the site
Six visible tabs: Overview, Process, Content, Exemplar, Rubric, Links. A seventh, Peer sharing and reflection, is hidden. Content, Exemplar and Rubric have a left rail of sections, one shown at a time; Process has its six stages as the rail. Hash tokens: `stage-1` to `stage-6`, `overview`, `content`, `peers`, `example`, `rubric`, `links`.

- **Overview** (rebuilt 2026-10-27 from the Project's design plan; wording agreed with Sam). One headline sentence ("Make a 4 to 5 minute documentary about how an empire changed a place in Asia between 1800 and 1914."), then a six-stop path (`ol.path`, HTML and CSS only, no images). On desktop the stops sit in a row with a line through the number circles; under 760px they stack with the line down the left. Each stop is a button with `data-goto="process" data-stage="N"` that opens that stage. Stop 3 has a NoodleTools tag; stop 5 has a CSS time bar (0 to 5:00, 4 to 5 shaded, "Limit: 5 minutes"). Then a "Marked on" strip of four chips (to the Rubric tab), "Start step 1", a small Big 6 link, and "Clear what this page remembers". No rail. Deliberately no lenses or voice names here (they come in stages 1 and 2). The compelling question appears only in the site header.
- **Process**: the six Big 6 stages (Task definition, Information seeking strategies, Location and access, Use of information, Synthesis, Evaluation). Each stage is short: a brief intro, a few numbered steps (`h3`), one "Do this" box, and one-line pointers to Content or Links. Includes a "Copy planning template" button, a question map diagram and question ladder (stage 1), a collapsed optional voices quiz (stage 2), a script word counter (stage 5), and a rubric level-tap self-check and reflection prompts (stage 6).
  - **Stage 3 (Location and access)**, rebuilt 2026-10-27 to be more instructive:
    1. Set up NoodleTools (title generator, see below).
    2. Search in this order: a numbered list (`ol.searchorder`), each with Why, How and one link. (a) Gale In Context and Britannica via the library guide; (b) the starter sources on the Links tab; (c) academic articles on JSTOR, opened from the SSIS library site for the school's access. The JSTOR link is the library site's home page (`sites.google.com/ssis.edu.vn/library`) because the site needs an SSIS login and the exact JSTOR page is unknown. Swap in a direct link when Sam gives one. Then one line: Local voices are hard to find for Korea and Vietnam, and a missing voice says something students can comment on in the documentary.
    3. Read an article without reading all of it (five steps).
- **Content**: teaching ideas (big questions, five ways empire worked with citations from the project books, power/place/people, the three lenses, four voices, change and continuity, own-history note).
- **Exemplar**: Sarawak under the Brooke family, laid out by the six stages.
- **Rubric**: plain words, a level-tap self-check, and the full rubric word for word. Data is the `RUBRIC` array. Never edit the word-for-word text.
- **Links**: every link, built from `LINKS` by `renderLinks()`. Groups in order: Your class; Where to look (`l-where`: search words by country, JSTOR via the library, finding guides, National Library of Vietnam); Starter sources: China (`l-starters`), Korea, Vietnam (cards from the Project); More primary sources (`l-primary`); Pictures (`l-pictures`).
  - An item is `[title, url, description, voice, question]`. `url` may be `''` (book only, no link) or a list of `[label, url]` pairs. `voice` and `question` are optional; a voice shows as a pill, a question as "Ask:".
  - A group may have `note` (an intro line) and `kw` (`[country, words]` lines).
  - Groups with an `id` can be targeted by pointer buttons (`data-goto="links" data-anchor="l-starters"`). Never write "at the bottom of this page"; point to the Links tab.
- **Peer sharing and reflection** (`#peers`): HIDDEN from students (Sam, 2026-10-27: "students don't need this"). The tab button has `hidden`, every pointer to it was removed, and a saved last view of `peers` falls back to Overview. Still reachable at `#peers`. Not deleted yet. Data is the `ACTIVITIES` array. Do not link to it.

## Design rules (decided with Sam)
- **It is a documentary, not an essay.** Do not add essay-writing help such as sentence frames or paragraph models (Sam removed one, 2026-10-27). Help should be about finding, reading and using sources, and making the documentary.
- **Be instructive and clear.** Where students must do things in order, show the order plainly (numbered steps, what to open, why, how), not a loose paragraph of options.
- Keep cognitive load low. Do not put everything from the class slides on one page. Process stages stay short; teaching content lives on the Content tab.
- Do not give students boxes to write in unless there is a serious reason to structure the input (the question tester, script counter). Everything else is written in their own Google Doc. Notes are made in NoodleTools, not on this site or in the Doc. Sam removed the source log (2026-10-26) because it repeated NoodleTools; students tag note cards by voice there instead. Do not add tools that duplicate NoodleTools.
- Keep it short. When adding anything, look for what could be removed and ask Sam.
- The planning template (`buildTemplate()` in the script) must follow the six Big 6 stages and contain no in-class activities.
- Honest about limits: the site does not save work reliably (localStorage only, wrapped in try/catch). Never imply it does.
- Worked example comes from outside the students' choice set, so it shows the moves, not content to copy.
- Palette: warm archive paper and ink, indigo accent. No red and gold, no flag colours, no colour per country, no "Asian-looking" fonts or motifs, no AI art. The four source voices (Imperial, Local, Outside, Later) have muted colours and always show the voice name too. Dark mode is supported through the CSS variables at the top of `index.html`.
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
- Page text is plain HTML in the `<section id="view-...">` blocks. Paged tabs (content, example, rubric, peers) are built from `h3` headings by `buildPaged()`, so each `h3` becomes a rail item. Anchor ids such as `c-ways` are used by the pointer buttons (`data-goto` and `data-anchor`). A `data-goto="process"` button with `data-stage="N"` opens that stage.
- localStorage key is `asia-documentary-guide-v2`. Bump it if saved state changes shape.
- `S.nav` remembers the last tab, Process stage and rail section per tab (saved only after boot). A bare URL with no hash reopens there; a hash in the URL always wins. "Clear what this page remembers" resets it.

## Next steps (Sam, 2026-10-26)
1. Rebuild the exemplar with citations from the project books (request is in the vault's `to-projects.md`).
2. Check the whole site for cognitive overload.
3. The Evaluation stage (Process, stage 6) needs work.

## Decisions taken
2026-10-26:
- Keep the "power, place, people" step in stage 1. Its sample questions are collapsed under "A sample question for each".
- Change and continuity (stage 4) stays and says it is its own rubric strand.
- The class research question sheets (Block E and G) are removed everywhere, for now. Do not mention a question sheet.
- Collapsing: only collapse extras (examples, practice, sample questions), never the steps themselves. The four voices quiz is a collapsed optional practice box.
- No due date yet. `CONFIG.dueText` and `submitText` stay empty until Sam gives them.

2026-10-27:
- Peer sharing and reflection tab hidden (not deleted). Stage 6 carries its own reflection prompts.
- Finding voices built from the Project's delivery: search words and starter source cards on Links, stage 3 search order and article-reading steps. The sentence frame and the Mimi Do worked example were removed as essay help; the thesis stays as a Vietnam starter card.
- A missing Local voice is not just something to report: it says something, and students can comment on it in the documentary.
- Academic articles come from JSTOR through the SSIS library, not Google Scholar.
- Time limit shown as 5 minutes everywhere (see "What the unit is").
- Overview rebuilt as the six-stop path.
- No difficulty notes on starter source cards.

## NoodleTools title generator (stage 3)
Same pattern as fmwafrica: teacher (sgraham, tredfern, dniedringhaus), block A to H, first and last name, giving `<teacher>-<block>-asia-FirstLast`. Fields are `data-k` keys `ntTeacher`, `ntBlock`, `ntFirst`, `ntLast`; `renderNT()` builds the title. Names keep accents, including Vietnamese letters (`Ḁ-ỿ`). Until a block is chosen the title shows "Block", not a real letter, so nobody copies the wrong one.

## Remind Sam later (at the start of a session on this site)
- Get the URL of the SSIS library's JSTOR (or databases) page, to replace the library home page link in stage 3 and on Links.
- Decide whether stage 2 step 1 ("turn sub-questions into search words") moves to stage 3 (open question from the Project).
- Test every starter source and Where to look link from a school network and a student account. From the server (2026-10-27): Hansard, Eastman Museum and Alpha History gave 403 (likely bot blocking), virtual-saigon.net timed out, the rest loaded. The USC Treaty of Nanjing link was dead (404), so the card uses worldjpn.net instead.
- Check the Brocheux and Hémery starter cards (Ham Nghi, Phan Chu Trinh letter, 1908 tax protests) against the print book, including section titles.
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
- Starter source quotes from the books were checked word for word by the Project, not here (`sources/` is not on this laptop).

## Sources
Sam's project books (in the Claude Project and, if he adds them, in `sources/`): Lovell, The Opium War; Young, Japan's Total Empire; Brocheux and Hémery, Indochina: An Ambiguous Colonization; Mishra, From the Ruins of Empire; Dalrymple, The Anarchy; Seth, A Concise History of Korea.
- Convert epubs to text with pandoc, one file per book, into `sources/`. Keep `sources/` in `.gitignore`. Never publish full text; the site carries only short quotes with citations.
- Epubs have no page numbers. Cite by author and chapter.
- The Brocheux and Hémery text is a scan with OCR errors. Check its quotes against the print book.
- Any quotation added to the site must be found word for word in the converted text first (grep it). If it cannot be found, paraphrase instead.
- Sarawak is not covered by these books. A fully cited extended exemplar should use a topic they do cover, for example Cochinchina under France (Brocheux and Hémery) or the Opium War and treaty ports (Lovell, Mishra). Keep Sarawak as the short "moves, not content" example.

## Testing before you finish
1. Extract the script and run `node --check`.
2. Load the page in jsdom, click through every tab, the Overview stops and a few stages, and confirm no errors. jsdom is installed in `../stockshock/node_modules` (run node with `NODE_PATH` pointing there).
3. Search the file for em dashes and en dashes (there must be none), and for "5:30" (there must be none).
4. Look at it at phone width and in dark mode, for example `google-chrome --headless=new --window-size=390,1700 --blink-settings=preferredColorScheme=0 --screenshot=<file> "file://.../asia/index.html#overview"` (drop the blink setting for light mode).
5. Check new external links with curl before publishing them, and tell Sam which ones failed.

## Working with the Claude Project (content requests)
Content that needs the books, and larger design plans, are written by Claude in the Project "Imperialism in Asia". Hand-offs go through Sam's Obsidian vault (`~/notes`, private GitHub repo samsmasm/notes), folder `asia/`. Its `README.md` has the request and delivery formats:
- `to-projects.md`: Claude Code writes requests here (what content, where it goes, length, which books).
- `from-projects.md`: the Project writes finished content and plans here, with citations and a note on what was verified. Newest at the top. Built so far: test message, finding the four voices, Overview path and 5 minute limit (all 2026-10-26 to 27).
- `status.md`: what is done, what is open.
- `site-CLAUDE.md`: a copy of this file, so the Project can read the site's rules and plans. **Every time you edit this CLAUDE.md, copy it over `~/notes/asia/site-CLAUDE.md` and push the vault.** Never edit the copy directly.
Each side only writes to its own file. Nothing is automatic: Sam tells each side when to look. Pull the vault before reading. Do not put book text in the vault. The Obsidian Git plugin may auto-commit vault changes before you do; that is fine, just push.
