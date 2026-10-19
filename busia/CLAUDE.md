# IB BM IA guide, `/busia`

Student guide to the IB Business Management Internal Assessment, start to finish, one page per stage.

- Stage folders (`start`, `rq`, `concept`, `analysis`, `conclusion`, `structure`, `sketching`, `check`, `examiners`, `submit`, `sample`, `faq`, `team`, `docs`), shared `style.css`, `nav.js`, `checklist.js`.
- Source text in `content_md/`; originals in `originalfiles/`. Sample IA PDFs and an IA template docx sit at the root.
- Writing style: concise and practical, no padding. Progress stored in localStorage (`busia-visited`).

Static, no build step; deploys on push to `main`. Follow the root `CLAUDE.md` (and `AESTHETIC.md` for anything new).

## A/B test (live 2026-10-18 to 2026-11-01)

Sam is A/B testing this guide (Version 1) against a short copy at `busia2/` (Version 2). Only 8 pages differ: index, rq, docs, concept, analysis, structure, sketching, conclusion. Plan and decisions: `~/notes/busiatemp/CLAUDE.md`. Ask Sam before every push while the test is live.

**Files.** Shared code lives only in `busia/ab/`:
- `assign.js`: loaded first in `<head>` on every page of both folders. Master switches at its top: `AB_ENABLED` and `TEST_END` (`'2026-11-01'`, Ho Chi Minh time). Sends new students to the notice, then keeps each student in their version (redirects to the same page in the other folder if needed). After `TEST_END`, students can switch freely from the menu.
- `welcome/`: the opt-in notice ("Take part" / "No thanks, just the guide"). "Take part" asks the worker for the smaller group (`POST /busia-ab/assign`), with a coin flip after 2.5s.
- `ab.js` (loaded from the end of both `nav.js` files): the three-question bottom sheet, active-time clock, pageview records, and the menu links (Backend, "Stop the questions", version switch after the test).
- `ab-config.js`: prompt settings. Currently 6 prompts per student in total, 2 per day, on the 8 changed pages only.
- `ab-questions.js`: the three questions (ease, covered, nextstep), 1 to 5.
- `worker/`: the `busia-ab` Cloudflare Worker (D1 database `busia-ab`, routes `unisam.nz/busia-ab` and `unisam.nz/busia-ab/*`). Logging, assignment, and the password-protected Backend at `unisam.nz/busia-ab/` (results, per-student table with Exclude/Restore, CSV). Deploy with `cd busia/ab/worker && npx wrangler deploy`. Secrets: `BUSIA_PASSWORD` (Sam's, never ask for it) and `AUTH_SECRET`. `SETUP.md` has the dashboard route.

**Overrides.** `?v=1` / `?v=2` forces a version; `?nolog` stops recording from that browser. Logging in to the Backend does the same as `?nolog`. Students are anonymous and under 18: never collect names, emails, IPs or free text.

**Editing pages.** The only A/B edits to the original pages are the `assign.js` script tag and the loader line at the end of `nav.js`. When editing an unchanged page here, copy the change to `busia2/` too. A change to one of the 8 short pages in `busia2/` should also go into its note in `~/notes/busiatemp/` (`busia2/content_md` mirrors those notes).

**Extending the test.** Change `TEST_END` in `assign.js` before the current date passes, bump the version tag (below), and tell Sam to update the notice wording and tell students. Consider raising `MAX_PROMPTS`.

**Caching.** Cloudflare tells browsers to keep `.js` files for 4 hours (HTML for 10 minutes). Every A/B script and `nav.js` is loaded with a `?v=YYYYMMDD[letter]` tag (currently `v=20261018d`). When you change any of them, bump that tag everywhere: the `assign.js` and `nav.js` script tags on all `busia/` and `busia2/` pages, the `ab.js` loader at the end of both `nav.js` files, and `VER` in `ab.js`. Never fetch a new `?v=` address before GitHub Pages has finished deploying (check with a random `?cb=` query instead): Cloudflare will cache the old file under the new address for 4 hours.

**Known bug (not fixed).** With browser storage blocked, `nav.js` throws and the menu does not render. Pre-existing, not caused by the test.
