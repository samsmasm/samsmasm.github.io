# Grill (graph drill), `/grill`

Drills IB Economics government intervention diagrams: indirect tax, subsidy, price ceiling, price floor (2.7 in the 2027 guide: diagrams SL/HL, calculations HL only). No externalities yet. Built 2026-10-29 as a quick prototype for a class test a few days later; later plans are more micro graphs, then macro.

## Files
- `index.html`: the whole app (inline CSS/JS, SVG, no libraries).
- `test/run.sh` + `test/tests.js`: headless-Chrome tests (puppeteer-core shared with ShiftWork in `~/.cache/sw-test`). Run before committing. `GR_SHOTS=<dir>` saves a screenshot of every step type.

## How it works
- **Markets are generated**, never hand-written: straight-line D (`y = a − b·x`) and S (`y = c + d·x`) on a 12 × 14 grid (x = quantity / 10, y = price in $), slopes 0.5/1/2, every key point a whole number (`gen(kind)`). Calculation answers come from the same numbers.
- `diagram(sc)`: the finished diagram (lines, points with P/Q axis names, Shortage/Surplus braces). Labels, slots and the drawn picture all come from it.
- **Skills** (columns on the home grid): Draw (tap the right grey line; ceilings/floors may follow up with "raise/lower it" + an effects question, then a label step), Label (tap chip, tap box), Shade, Effects (multiple choice), Calculate (HL only, shows Qd/Qs functions).
- **Shading**: `conceptsFor(sc)` lists each area as a polygon (CS/PS before and after, DWL, tax revenue, subsidy cost, expenditure, revenue, tax burden, transfers, government buying the surplus). `buildCells` cuts the chart along every line plus horizontals/verticals at the key points, and groups cells by which concepts contain them, so any concept is a whole number of tappable areas. To add an area, just add a concept polygon whose edges lie on those lines.
- **Labels** match the IBecon diagrams: Pe, Qe, Pc, Pp, Qt (tax), Q2 (subsidy; Sam prefers Qe then Q2 over Q1), S + tax, S + subsidy, plus Pmax/Pmin, Qs/Qd, Price ceiling/floor.
- **Wrong answers** (Sam, 2026-10-29): say "Not quite. Try again." and leave the step editable at once, mistakes in red (wrong line, red label boxes, red shaded areas, greyed MC option). Only the first attempt is scored; a later right answer says "Got it". "Show me the answer" (`finish(false)`) reveals. `check()` marks, `finish(ok)` closes the step.
- **Don't give answers away on the graph**: multiple-choice steps draw the diagram without the Shortage/Surplus labels (`noAnno`). Sam spotted "What does the floor create?" with "Surplus" written on the graph.
- **What-if questions** ("the ceiling is set above Pe...") contradict the drawn market, so they carry `noGraph`: no chart, no context line.
- **Labels**: drag a chip (or a filled box) onto a box, or tap chip then box (`placeLabel`, pointer-event drag with a ghost chip). A wrong check sends the wrong labels back to the list and leaves their boxes empty and red.
- **Skip question** button: new question, nothing scored.
- **Choosing a drill**: Totally random (`mix`), Practise my weakest (`weak`), a topic row name (`kind`: random skill), a skill column name (`skill`: random topic), or one box (`cell`).
- **Calculate is SL and HL** (Sam, 2026-10-29). SL: prices, quantities, spending, revenue, government money, shortage/surplus size. HL adds anything matching `HL_ONLY` in `calcsFor` (consumer/producer surplus, DWL, shares of the tax/subsidy, transfers). **No Qd/Qs functions anywhere**: the 2027 guide doesn't use them and Sam doesn't want students thinking they need them. Every value is read off the graph, so generators keep all needed points on gridlines (including the DWL corner for ceilings/floors).
- **Shading** puts DWL in about half of shade questions (Sam wants DWL identification drilled).
- **Report a problem**: link under each question opens an inline panel (reason chips + optional text) and POSTs to the shared feedback Worker with `app: 'grill'`; `diagram` holds the question, market and the student's answer as JSON (shown under "Attached data" in the inbox).
- **Enter key**: marks the answer, then a second Enter moves on. The keydown handler calls `preventDefault()`, otherwise focus moves to Next during marking and the same Enter press clicks it (Sam hit this).
- **Progress**: localStorage `grill_v1` = `{ level, scores: { 'tax.shade': [last 10 as 1/0] } }`. "Practise my weakest" picks untried cells first, then the lowest score.
- Floor welfare (CS/PS/DWL) assumes the government does NOT buy the surplus; the "government buys the surplus" questions say so.

## Look
Sam asked (2026-10-29) for a bold, blocky barbecue look: deep reds, oranges, amber, charcoal, thick dark borders, Anton (Google Fonts) for headings and buttons. This deliberately departs from AESTHETIC.md's pastel style. `grilllogo.jpg` is Sam's original logo; `logo.jpg` is a square 256px crop of it used in the header and as the favicon. D stays deep blue so it reads clearly against the orange S.

## Not linked yet
Not on the homepage, `/tools` or `/find` (find only lists tools linked from those). Sam is planning his own imagery for it.
