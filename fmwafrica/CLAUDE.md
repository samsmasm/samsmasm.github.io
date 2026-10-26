# fmwafrica: FMW African Imperialism museum poster companion

Live at unisam.nz/fmwafrica. A student companion for the Grade 9 FMW African Imperialism museum poster assessment,
used by Mr Graham (Sam), Mr Redfern and Mr Niedringhaus, blocks A to H. Built from Sam's materials in
~/Downloads/africa (deck "FMW Africa 2026-7.pptx" slides 60 to 68, rubric, OPCVL template, exemplar, Congo images
doc, NoodleTools screenshots). It is a companion for the task, NOT a store of everything about Africa.

Student-facing text says "your teacher", never "Sam" (other classes use it). The footer credit "Built by Sam G" stays.

## Deadlines and hand-in
- Blocks A to D: Thursday 29 October 2026. Blocks E to H: Friday 30 October 2026. Both dates are always shown
  (home countdowns, step rail, Hand it in page). Sam rejected a block dropdown for this. Dates live in `DUES` in app.js.
- Hand in: printed A3 poster, bibliography, two OPCVLs. Exact submission method still to come from Sam.
- Bibliography = four (or five) sources: the two images plus two (or three) academic sources, probably one from
  Britannica or Gale and one academic article or similar. (Sam's slide 64 and rubric heading still say "three".)

## Structure
Single page, hash routes. Views are `<section data-view>` in index.html; most wording lives there.
- `#home` The task: question, two countdowns, what you hand in, the steps list.
- `#step-1` Set up NoodleTools: teacher dropdown (sgraham = Mr Graham, tredfern = Mr Redfern, dniedringhaus =
  Mr Niedringhaus), block A to H, name, gives title `<teacher>-<block>-africa-FirstLast`. Five illustrated steps:
  sign in at noodletools.com with school Google Account, New Project, paste title and choose MLA + Junior, hover the
  project row under Sharing and click the + (nt3 has a grey + drawn and circled there), type "Africa" to find the
  teacher's inbox, check the block, Done (no inbox: ask your teacher). Link to noodletools.com/help.
- `#step-2` Choose and research: four country cards (South Africa, Ethiopia, Namibia, Mali) with a starting point and
  plain-text search words; SSIS library page, Sources for African Imperialism doc; NoodleTools note categories.
- `#step-3` Check your sources: Sam's seven questions, Yes/No, for Source 1 (probably Britannica or Gale),
  Source 2 (probably an academic article), Source 3 (optional).
- `#step-4` Write the thesis: textarea, self-checks, a starting frame, weak/better/strong Congo ladder. The strong
  example has no analysis under it and there is no "include resistance" tip under the ladder (Sam removed both: the
  Congo thesis is about international pressure, not local resistance).
- `#step-5` Find two images: every archive from slide 66 in Sam's order, SSIS library suggestions first. No
  per-country "Good for" picks (Sam removed them). Thesis comes first, then images to support it (Sam swapped
  these on 2026-10-26; `state.swap45` in app.js migrates old "done" ticks once).
- `#step-6` Analyse your images: OPCVL then Context/Observe/Symbols/Perspective/Link writer for two images, with
  Sam's template prompts, examples behind a click, sentence counter, copy button.
- `#step-7` Put it in a poster: A3, doesn't need to be beautiful (rubric doesn't reward design), what goes on it
  (title, name, thesis, two images with titles, analysis per image blended into a paragraph, in-text citations),
  Google Docs recommended (File > Page setup > A3) but anywhere is fine with no extra points, one example layout
  (portrait or landscape; no citations box in the diagram). Links the exemplar Google Doc.
- `#submit` Hand it in: both due dates, checklist, "how to submit is coming".
- `#examples` All Congo (not one of the four country choices, so students can't copy). See Examples below.
- `#rubric` Student-language Meeting vs Excellence, with the original rubric verbatim in a collapsed section.
- `#docs` Google Doc links: Unit slides, Project, Rubric, Africa OPCVL template, OPCVL analysis, Museum Poster
  Exemplar 2026, earlier exemplar, Sources for African Imperialism, SSIS library page, Early African History slides.

## Examples page
1. "In the Rubber Coils" (Punch 1906): OPCVL one to two sentences per part (Sam: the long version was too long).
   Analysis is the exemplar's strong sentences as a Context/Observe/Symbols/Perspective/Link list, then the blend
   note, then the exemplar's own paragraphs in a collapsed "See it blended together". The weak/strong table is gone.
2. Nsala (Alice Seeley Harris, 1904): photo hidden behind a content-warning button. Relies on the
   `[hidden] { display: none !important; }` rule, because `img { display: block }` otherwise overrides `hidden`.
3. Tervuren (1897): introduced with "Here is another example, though remember you only need two." Five-part list
   plus the blend note ("these would be better blended together, so the ideas connect and flow").

## Files
- `index.html`: all views and most text.
- `app.js`: data (STEPS, DUES, COUNTRIES, ARCHIVES, SOURCE_QS, SRC_HINTS, THESIS_CHECKS, SUBMIT_CHECKS,
  WRITER_FIELDS), router, tools, analytics. Student input is saved in localStorage key `fmwafrica` (this device only).
- `style.css`: colours, fonts, layout.
- `img/`: africa.svg (logo), favicon.svg, nt1-nt4 NoodleTools screenshots (nt3 is cropped from Sam's full-browser
  capture to hide his tabs and email), rubber-coils.jpg, nsala.jpg, tervuren.jpg.

## Design
- Does NOT follow the pastel rainbow look in AESTHETIC.md (Sam's call). Solid indigo masthead (`#22305e`) with an
  ochre-light (`#d9874f`) bottom rule and active tab; body white, red ochre (`#7a2d0a`) headings, indigo links/tips.
  OPCVL header bars are ochre, Analysis bars are indigo.
- Colour reasoning (Sam asked for a scheme suitable for the continent, not stereotyping or appropriating): red ochre +
  indigo. Avoid pan-African flag colours, kente/mudcloth patterns, safari/animal print, colonial map colours.
- Logo: stylised Africa + Madagascar silhouette replacing /unisamsq.png, traced with OpenCV from
  findtreasure/countries.geojson (Natural Earth 110m, public domain).
- Fonts (Google Fonts): Young Serif headings with `font-variant-numeric: lining-nums` (its old-style 1 reads as I),
  Atkinson Hyperlegible body.

## Rules from Sam
- No direct Britannica links. Students use Britannica or Gale In Context: World History through the SSIS library page;
  "The Britannica there is the school version, more suitable than the public version." The SSIS library link is fine.
- No NotebookLM links.
- Step 6 keeps the big `.nosave` warning (don't rely on the site to save) and the formulaic-writing tip.
- Step 6 writer examples (WRITER_FIELDS `eg`): OPCVL ones are full length (Sam: short ones are "not long enough for a
  good mark"); analysis ones are the exemplar's own sentences. This is separate from the short Rubber Coils OPCVL on
  the Examples page, which Sam wanted short.
- Keep Sam's wording verbatim where used (OPCVL prompts, source questions, rubric original, archive descriptions).
- No AI thesis feedback yet ("not yet").

## Analytics
GoatCounter (samsmasm.goatcounter.com) with `no_onload`; `track()` in app.js counts each view as
`/fmwafrica/#<view>` (home = `/fmwafrica/`), so each step and tab shows separately.

## Testing
puppeteer-core lives at ~/.claude/jobs/7be7cf62/tmp/node_modules/puppeteer-core with /usr/bin/google-chrome.
Serve the repo root (`python3 -m http.server 8765`) so /fmwafrica/ resolves. Stub `gc.zgo.at` with request
interception so tests never send real GoatCounter hits. Check 1280 and 390 widths for horizontal overflow.

## Pending
- Exact submission instructions for the Hand it in page.
- Whether OPCVLs also go on the poster (the exemplar has one) or only get handed in separately.
