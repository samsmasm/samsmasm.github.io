# IB BM IA guide, `/busia`

Student guide to the IB Business Management Internal Assessment, start to finish, one page per stage.

- Stage folders (`start`, `rq`, `concept`, `analysis`, `conclusion`, `structure`, `sketching`, `check`, `examiners`, `submit`, `sample`, `faq`, `team`, `docs`), shared `style.css`, `nav.js`, `checklist.js`.
- Source text in `content_md/`; originals in `originalfiles/`. Sample IA PDFs and an IA template docx sit at the root.
- Writing style: concise and practical, no padding. Progress stored in localStorage (`busia-visited`).

Static, no build step; deploys on push to `main`. Follow the root `CLAUDE.md` (and `AESTHETIC.md` for anything new).

## A/B test (October 2026)

Sam is A/B testing this guide (Version 1) against a short copy at `busia2/` (Version 2). Shared code lives only in `busia/ab/`: `assign.js` (loaded first in `<head>` on every page; master switches `AB_ENABLED` and `TEST_END` at its top), `ab.js` (loaded from `nav.js`), `ab-config.js`, `ab-questions.js`, the opt-in notice at `ab/welcome/`, and the `busia-ab` Cloudflare Worker source in `ab/worker/` (see its `SETUP.md`). Plan: `~/notes/busiatemp/CLAUDE.md`. The only A/B edits to the original pages are the `assign.js` script tag and the loader line at the end of `nav.js`. When editing an unchanged page here, copy the change to `busia2/` too.
