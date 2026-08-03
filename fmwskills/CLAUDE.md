# CLAUDE.md — fmwskills

Live at **unisam.nz/fmwskills**. Documents (and now tools) a skills-sequencing analysis for Grade 9 **Foundations of the Modern World (FMW)**, the same course whose live student-facing scaffolding lives at `moa/` (see `moa/CLAUDE.md` if present, or the `project_moa` memory). This is an internal teacher tool, not student-facing — built for Sam plus 3 co-teachers to jointly redesign next year's skill sequencing.

## `index.html` — the collaborative sequencing board

A single self-contained page (vanilla JS, SortableJS via CDN for drag-and-drop, no build step). Uses the **`dowserboard` Firebase project** (same one as `moa/today`), path `fmwskills/boards/{boardId}`.

- **6 tabs**: Baseline (read-only, statically seeded from `skills-redesign.md`, never written to Firebase) + Sam / Thomas / Dan / Diana / Others (each an independently editable Kanban board, seeded from Baseline on first visit, then diverges) + Compare (read-only, fetches all 5 people's boards once and tables them side by side, aligned by the original seed card's stable id).
- **9 unit boxes** (columns), freely added/renamed/recoloured/deleted per board — colour here IS customisable per box, via a plain hex prompt. No dates on units (removed — wasn't worth the maintenance and isn't shown anywhere else).
- **Cards** are typed **Skill / Previous assessment / New assessment** — no more "Activity" type (folded into skills or dropped). Skill cards are freely draggable/reorderable and can carry an optional **category**: `research` / `communication` / `history`, shown as plain text in the card ("Skill · Research") — no colour-coding, no left-border stripes, no dots. AESTHETIC.md explicitly bans accent stripes/dots and pill tags, so category is text-only, following the "plain text separated by a middot" pattern used elsewhere on the site.
- **Previous assessment** and **New assessment** are one fixed pair per unit, pinned at the bottom of the column, outside the sortable skill list (so they can never be dragged). Previous assessment is locked (no edit/delete — it's last year's actual assessment, kept for reference). New assessment is editable (this year's plan) but not deletable.
- Card colours follow AESTHETIC.md's palette: Skill = History orange, Previous assessment = Business Management blue, New assessment = Economics green. All three are existing palette entries, not invented colours.
- **"Just the skills" toggle** (person tabs only): flips the board into one flowing grid of skill cards only, grouped by unit under a plain-text divider (no dates, no colour swatch — just the unit name). Drag-and-drop works across the whole grid; a card's unit is reassigned based on which divider precedes it after a drop.
- **Editing** (drag, add, rename, delete, recolour) is gated by the same passcode as `moa/today` (`0987`), checked client-side only and cached in `sessionStorage` — this is a soft gate for known collaborators, not real security. No Firebase security rules were added; treat this as the same trust model as `moa/today`.
- **Compare view** shows a table of every Baseline-seeded card against each person's current unit-placement, flags rows where placements diverge ("contested"), and can sort/filter to surface disagreements first. Cards a teacher adds beyond the original seed can't be aligned across boards (no shared id) and are listed separately underneath.
- `skills-redesign.md` is kept in sync with the Baseline seed in `index.html` — if you change one, update the other. The five live person boards (`sam`/`thomas`/`dan`/`diana`/`others`) do NOT auto-update when the seed changes (they only seed once, on first visit) — after a structural redesign, the boards need to be manually reset by writing the new seed to each `fmwskills/boards/{id}` path in Firebase.
- `docs/` (rubrics, standards doc, Big6 PDFs) is **gitignored** — it contains real school curriculum material and the school's name, and this repo is public. Keep anything sensitive there, never remove it from `.gitignore`.

## Purpose

FMW's daily planner and unit rubrics live in `/home/sam/Documents/FMW/` (not in this repo — a local Documents folder); a working copy of the standards doc, rubrics, and Big6 reference material also lives in `docs/` here (gitignored, see above). This analysis works out, from that material, what *skills* (not knowledge) each unit actually builds, whether they're sequenced well across the year, and what to change next year. Big6 (Task Definition → Info Seeking Strategies → Location & Access → Use of Information → Synthesis → Evaluation) is used as the anchor framework throughout, cross-referenced against the school's actual FMW9 standards doc.

## Files, in the order they were built

1. **`skills.md`** — the full, unit-by-unit skill breakdown (the original 8-unit as-taught structure). Skill-first tables (not standards-first), each skill tagged **Introduced** or **Reinforced**, with rubric criteria cross-referenced only where they genuinely fit. This is the detailed source-of-truth for the as-taught baseline; dense on purpose. Not updated for the 9-unit redesign — treat as historical.
2. **`skills-overview.md`** — the same as-taught material condensed into ~11 cross-unit "threads" (e.g. "judging whether a source can be trusted," "building and defending an argument"), each shown as a short arc across the units where it appears, with a one-line read on how well-sequenced it looks. Built because `skills.md` is too dense to reason about at a glance. Also historical (as-taught, not redesign).
3. **`skills-redesign.md`** — the current proposal, kept in sync with `index.html`'s Baseline seed. 9 units (WWII and Cold War split apart), each skill tagged with a category (Research/Communication/History-Geo-Econ), Previous/New assessment pairing per unit. If you change the seed data in `index.html`, update this file to match, and vice versa.

## Known issues identified in the as-taught (this year's) sequencing

- Unit 1 introduced ~15 new skills at once — the single biggest overload point of the year, right at the start.
- Units 4 (WWI/Propaganda) and 5 (Imperialism in Asia) ran concurrently (~19 Nov – 9 Dec) while each introduced unrelated brand-new skills — a calendar-confirmed overload, not just a coincidence of category.
- "RQ vs. Report" (the Historian vs Reporter distinction) wasn't taught until Unit 8, five months after students first wrote an owned RQ in Unit 5.
- Visual/media subtext analysis was introduced hard in Units 3–4 and never revisited despite later visual source material (WWII posters, Cold War imagery).
- AI-as-research-tool appeared in Units 2, 3, and 6, then disappeared entirely for Units 7–8 — including the capstone, where source evaluation rigor matters most. Undecided whether this is deliberate or an oversight.

## Constraints from the parent repo

- Student-facing personal data (names + marks/comments) was explicitly excluded from all analysis in this folder — only rubric/criteria language and unit structure were used, never individual grades or feedback.
- Follow the root `CLAUDE.md` conventions (AESTHETIC.md, no `git add -A`, etc.) — `index.html` is live and published at unisam.nz/fmwskills.
