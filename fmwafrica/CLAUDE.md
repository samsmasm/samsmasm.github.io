# fmwafrica: FMW African Imperialism museum poster companion

Student guide for Sam's Grade 9 FMW African Imperialism museum poster assessment (due Thu 29 Oct 2026 for blocks A to D, Fri 30 Oct for E to H; both always shown, DUES in app.js).
Built from Sam's materials in ~/Downloads/africa (deck slides 60 to 68, rubric, OPCVL template, exemplar,
Congo images doc). It is a companion for the task, NOT a store of everything about Africa.

## Files
- `index.html`: all views as `<section data-view>`; hash routes (#home, #step-1..#step-6, #submit, #examples, #rubric, #docs).
  Most student-facing wording lives here, so edit text here.
- `app.js`: data (STEPS, COUNTRIES, ARCHIVES, SOURCE_QS, THESIS_CHECKS, SUBMIT_CHECKS, WRITER_FIELDS) and tools.
  Student input saved in localStorage key `fmwafrica` (device only; the UI tells them to paste into their own doc).
- `style.css`: History rust `#7a2d0a` (red ochre) + indigo `#22305e` second accent, white background.
  Sam asked for a scheme suitable for the continent: ochre + indigo chosen; avoid pan-African flag colours,
  kente/mudcloth patterns, safari/animal print, colonial map colours.
- Header: Sam said this site need NOT follow the pastel rainbow AESTHETIC.md look. Solid indigo masthead, ochre-light
  (#d9874f) rule and active tab, Africa silhouette logo (img/africa.svg) instead of /unisamsq.png, favicon img/favicon.svg.
  Africa outline traced from findtreasure/countries.geojson (Natural Earth 110m, public domain) with OpenCV.
- `img/`: nt1-4 NoodleTools screenshots, rubber-coils.jpg (Punch 1906), nsala.jpg (behind a content-warning click), tervuren.jpg (1897).

## Conventions
- Examples are all Congo (not one of the four country choices) so students can't copy them.
- Country cards are launchpads only (power, turning point, resistance, search words). No direct Britannica links: students must use Britannica via the SSIS library page (school version). The SSIS library page link itself is fine.
- Sam's own wording kept verbatim where used (OPCVL prompts, source questions, rubric original).
- Step 6 writer examples (WRITER_FIELDS `eg`): the OPCVL ones answer every prompt at full length (Sam: short ones are "not long enough for a good mark"). The analysis ones are the exemplar's own sentences, split by part (`fromEx`); Observe is pulled out of the exemplar's Symbols wording (`egNote` says so). The weak/strong table's strong column uses the same exemplar sentences. Sentence counter: aim for one, flags over three (the exemplar uses up to three per part).
- Step 6 must keep the big `.nosave` warning (do not rely on the site to save) and the formulaic-writing tip (write off the page or edit the copied response). Sam asked for both.

## Pending
- Exact submission instructions (Submit view says "coming"). Currently: printed poster, bibliography, OPCVLs.
- NoodleTools step: teachers sgraham (Mr Graham), tredfern (Mr Redfern), dniedringhaus (Mr Niedringhaus); blocks A to H.
  Title = <teacher>-<block>-africa-FirstLast. Citation: MLA, Junior. Students type "Africa" in Share to find their teacher's inbox.
  Screenshots img/nt1..nt4 (nt3 cropped from Sam's full-browser capture to hide tabs and email).
- NotebookLM links removed at Sam's request; don't add them back.
- AI thesis feedback: Sam said not yet.
