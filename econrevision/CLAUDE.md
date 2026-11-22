# Econ revision, `/econrevision`

Temporary self-guided revision site for Sam's **IB1 Economics** class, for the two lessons he is away for: Wednesday 25 and Monday 30 November 2026. It covers the Semester 1 exam (Unit 1 and Unit 2 micro). Built 2026-11-22 from Sam's Word pack. Remove or unlink after the exam unless Sam says otherwise.

Sam's brief: `~/notes/Projects/econ-revision/Econ revision website brief.md` (with the Word pack). The vault folder also holds a copy of `index.html`: **edit the copy here, then copy it back to the vault** so the two stay the same (and commit and push both). **Don't change the content**: the site is the pack in web form.

## Shape

One self-contained `index.html`. Sections are `<main> > section` switched by `show(id)` / `go(id)`; `go` shows the Part 1 nudge if the checklist isn't done (`S.part1`), with "Continue anyway". Content is the `DATA` JSON in the script: `G` checklist sections, `GR` graph groups, `TD` tricky differences, `mb` markband.

- **Nav**: Home · 1. Checklist · 2. Graphs · 3. Tricky differences · 4. 10-markers · 5. Targets · unisam.nz, plus the SL/HL switch.
- **Home** is a numbered path diagram (Sam: students already have a heavy cognitive load). Wednesday: 1 Checklist (start here), 2 Graphs groups 1 to 6, 3 Fix a red (`goReds()` opens the checklist in priorities view). Monday: 4 Tricky differences, 5 Graphs groups 7 to 11 (`goGraphs(7)` scrolls to group 7), 6 One 10-mark question, 7 Targets. Helpers in dashed boxes with dotted links: IBEcon notes, Answer structures (/samples). `renderPath()` shows done ticks.
- **Checklist**: R/A/G buttons in real colours (selected one outlined, others fade), By topic / My priorities views, expand and collapse. "IB Econ page" links per section (`IBECON_LINKS`; "2.10" must stay before "2.1" so it matches first).
- **Graphs**: two ticks per sub-point (from memory, checked and fixed); links per group (`IBECON_GRAPH_LINKS`). Group 12 (perfect competition, HL) is flagged not on the exam.
- **Tricky differences**: RAG plus an answer box, priorities view, no answer key.
- **10-markers**: instructions, three questions, simplified markband; `STRUCTURES_URL` = `/samples/`.
- **Targets**: "Your priorities" at the top (`renderTargetPrio()`: checklist reds, then ambers, for the student's level), then three boxes.
- Backup link on Home goes to the Google Doc version of the pack (the .docx is no longer hosted here).

## Saving and copying

localStorage key `ib1econ-s1-revision-v1`, wrapped in try/catch. "Copy blank table" and "Copy my answers" on every interactive section (HTML table for Google Docs, plain-text fallback). Copy buttons not yet tested in Google Docs by Sam.

## Look

The sophisticated look (AESTHETIC.md Option B) with the Economics green `#145c34` accent. Colours are `--colour-*` CSS variables at the top. HL labels are plain uppercase text.

## Testing

As in `bmrevision/CLAUDE.md`: Playwright from the npx cache with `/usr/bin/google-chrome`, `file://`, check views at 390px wide for sideways scroll.

## Rules

Tight, short wording. No em dashes. Scope strictly from the IB guide (not on this exam: circular flow, equity in the distribution of income and wealth, market structures; economic thought left out of the checklist).
