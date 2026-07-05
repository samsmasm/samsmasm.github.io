# CLAUDE.md — fmwskills

Live at **unisam.nz/fmwskills**. Documents (and now tools) a skills-sequencing analysis for Grade 9 **Foundations of the Modern World (FMW)**, the same course whose live student-facing scaffolding lives at `moa/` (see `moa/CLAUDE.md` if present, or the `project_moa` memory). This is an internal teacher tool, not student-facing — built for Sam plus 3 co-teachers to jointly redesign next year's skill sequencing.

## `index.html` — the collaborative sequencing board

A single self-contained page (vanilla JS, SortableJS via CDN for drag-and-drop, no build step). Uses the **`dowserboard` Firebase project** (same one as `moa/today`), new path `fmwskills/boards/{boardId}`.

- **6 tabs**: Baseline (read-only, statically seeded from `skills-redesign.md`, never written to Firebase) + Sam / Thomas / Dan / Diana / Others (each an independently editable Kanban board, seeded from Baseline on first visit, then diverges) + Compare (read-only, fetches all 5 people's boards once and tables them side by side, aligned by the original seed card's stable id).
- **Cards** are typed **Skill / Activity / Assessment**, coloured per AESTHETIC.md's existing subject palette (History orange / Classroom-tools purple / Business blue respectively) — colour is fixed by type, not customisable.
- **Unit boxes** (columns) are freely added/renamed/recoloured/deleted per board — colour here IS customisable per box, via a plain hex prompt.
- **Editing** (drag, add, rename, delete, recolour) is gated by the same passcode as `moa/today` (`0987`), checked client-side only and cached in `sessionStorage` — this is a soft gate for 4 known collaborators, not real security. No Firebase security rules were added; treat this as the same trust model as `moa/today`.
- **Compare view** shows a table of every Baseline-seeded card against each person's current unit-placement, flags rows where placements diverge ("contested"), and can sort/filter to surface disagreements first. Cards a teacher adds beyond the original seed can't be aligned across boards (no shared id) and are listed separately underneath.
- Nothing here writes back to the `.md` files automatically — if the group settles on a final sequence, someone needs to manually transcribe the winning board back into `skills-redesign.md` (or a new doc). The tool is a working/discussion space, not the permanent record.

## Purpose

FMW's daily planner and unit rubrics live in `/home/sam/Documents/FMW/` (not in this repo — a local Documents folder). This analysis works out, from that material, what *skills* (not knowledge) each unit actually builds, whether they're sequenced well across the year, and what to change next year. Big6 (Task Definition → Info Seeking Strategies → Location & Access → Use of Information → Synthesis → Evaluation) is used as the anchor framework throughout, since it's the one named research model the course already uses (introduced mid-year, in Unit 5, in the as-taught version).

## Files, in the order they were built

1. **`skills.md`** — the full, unit-by-unit skill breakdown (all 8 units). Skill-first tables (not standards-first), each skill tagged **Introduced** or **Reinforced**, with rubric criteria cross-referenced only where they genuinely fit. This is the detailed source-of-truth; dense on purpose.
2. **`skills-overview.md`** — the same material condensed into ~11 cross-unit "threads" (e.g. "judging whether a source can be trusted," "building and defending an argument"), each shown as a short arc across the units where it appears, with a one-line read on how well-sequenced it looks. Built because `skills.md` is too dense to reason about at a glance.
3. **`skills-redesign.md`** — the actual proposal: what to introduce at each unit *next year*, fixing the specific problems the overview surfaced (Unit 1 overload, the Nov–Dec concurrent-unit crunch, RQ-vs-report taught too late, visual literacy and AI-as-source-tool dropped and never revisited). Includes the assessment for each unit, and one live change already agreed: Unit 1's assessment becomes an **argument map of an essay** (research + plan, no full essay write-up) rather than a full essay/presentation.

## Known issues identified in the as-taught (this year's) sequencing

- Unit 1 introduced ~15 new skills at once — the single biggest overload point of the year, right at the start.
- Units 4 (WWI/Propaganda) and 5 (Imperialism in Asia) ran concurrently (~19 Nov – 9 Dec) while each introduced unrelated brand-new skills — a calendar-confirmed overload, not just a coincidence of category.
- "RQ vs. Report" (the Historian vs Reporter distinction) wasn't taught until Unit 8, five months after students first wrote an owned RQ in Unit 5.
- Visual/media subtext analysis was introduced hard in Units 3–4 and never revisited despite later visual source material (WWII posters, Cold War imagery).
- AI-as-research-tool appeared in Units 2, 3, and 6, then disappeared entirely for Units 7–8 — including the capstone, where source evaluation rigor matters most. Undecided whether this is deliberate or an oversight.

## Constraints from the parent repo

- Student-facing personal data (names + marks/comments) was explicitly excluded from all analysis in this folder — only rubric/criteria language and unit structure were used, never individual grades or feedback.
- Follow the root `CLAUDE.md` conventions if this folder ever grows a deployed page (AESTHETIC.md, no `git add -A`, etc.) — as of now, nothing here is published to unisam.nz.
