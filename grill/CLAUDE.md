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
- **Labels** match the IBecon diagrams: Pe, Qe, Pc, Pp, Qt (tax), Q1 (subsidy), S + tax, S + subsidy, plus Pmax/Pmin, Qs/Qd, Price ceiling/floor.
- **Progress**: localStorage `grill_v1` = `{ level, scores: { 'tax.shade': [last 10 as 1/0] } }`. "Practise my weakest" picks untried cells first, then the lowest score.
- Floor welfare (CS/PS/DWL) assumes the government does NOT buy the surplus; the "government buys the surplus" questions say so.

## Look
Sam asked (2026-10-29) for a bold, blocky barbecue look: deep reds, oranges, amber, charcoal, thick dark borders, Anton (Google Fonts) for headings and buttons. This deliberately departs from AESTHETIC.md's pastel style. `grilllogo.jpg` is Sam's original logo; `logo.jpg` is a square 256px crop of it used in the header and as the favicon. D stays deep blue so it reads clearly against the orange S.

## Not linked yet
Not on the homepage, `/tools` or `/find` (find only lists tools linked from those). Sam is planning his own imagery for it.
