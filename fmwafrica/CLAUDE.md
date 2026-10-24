# fmwafrica: FMW African Imperialism museum poster companion

Student guide for Sam's Grade 9 FMW African Imperialism museum poster assessment (due Fri 30 Oct 2026).
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
- `img/`: rubber-coils.jpg (Punch 1906), nsala.jpg (behind a content-warning click), tervuren.jpg (1897).

## Conventions
- Examples are all Congo (not one of the four country choices) so students can't copy them.
- Country cards are launchpads only (power, turning point, resistance, search words). Britannica links are search URLs.
- Sam's own wording kept verbatim where used (OPCVL prompts, source questions, rubric original).

## Pending
- Exact submission instructions (Submit view says "coming"). Currently: printed poster, bibliography, OPCVLs.
- Block letters: slide 63 name format says E/F, share groups say E/G. Site uses E and G.
- AI thesis feedback: Sam said not yet.
