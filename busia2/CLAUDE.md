# BUSIA2, `/busia2`: short-version A/B copy of the IA guide

Version 2 of the IB BM IA guide, for Sam's A/B test against the long original at `busia/` (Version 1). Students reach it only through random assignment by `/busia/ab/assign.js`; it is not linked anywhere and every page is `noindex`.

- Same shell as `busia/`. The 8 pages `index`, `rq`, `docs`, `concept`, `analysis`, `structure`, `sketching`, `conclusion` carry the short text (about half the long version). `start`, `check`, `submit`, `faq`, `team`, `sample`, `examiners` are unchanged copies.
- Source text: Sam's Obsidian notes in `~/notes/busiatemp/IB BM IA * (short).md` (plan in `~/notes/busiatemp/CLAUDE.md`); `content_md/` mirrors them. Never rewrite the short text without asking Sam.
- Own storage keys (`busia2-visited`, `busia2-check-marks`) so progress does not bleed between versions.
- Every page loads `/busia/ab/assign.js` first in `<head>`, and `nav.js` loads `/busia/ab/ab.js`. The A/B code lives only in `busia/ab/`; do not copy it here.
- Any change to an unchanged page in `busia/` should be copied here too, or the versions drift.
