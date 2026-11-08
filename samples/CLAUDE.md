# Samples, `/samples`

IB model answers revealed step by step: hint, prompt, starters, blanks (click a blank to reveal a word), full text. Linked from the homepage under Economics.

Static, no build step; deploys on push to `main`. AESTHETIC.md Option B (paper and ink).

## Files
- `samples.css` + `engine.js`: shared by every sample page. A page defines `window.SAMPLE = { parts: [...] }` and loads `engine.js`; it renders into `<main id="essay">`. The data format is documented at the top of `engine.js`.
- `index.html`: ruled index of samples.
- `econ/macro/poverty/`: 15-mark P1 essay (one part).
- `econ/micro/price-floor/`: P1 (a) 10 + (b) 15, government intervention without externality (Thailand rice pledging, 2011 to 2014).
- `econ/micro/carbon-tax/`: P1 (a) 10 + (b) 15, intervention with externality (British Columbia carbon tax, 2008 to 2025).
- `econ/micro/indirect-tax/`: P1 (a) 10 only, two reasons for an indirect tax. **Sam's own answer**, copied verbatim from his vault (`Classes/IB Economics/Sample answers/P1 10marksindirecttax.md`), including his SVG (`indirect-tax.svg`, not the house style). Only the hints, prompts and starters were drafted by Claude. Never reword the `text` fields.

## Sam's structures (2026-11-02)
- **10 marks, DDEE**: Define, Diagram, Explain, Example (optional, generic, not real-world).
- **15 marks, DDEEE**: Define, Diagram, Explain, Examples (real and required, integrated with the theory), Evaluate on different stakeholders (consumers, producers, government, workers, society, as in his decks), then a judgement.
- Each part shows the checklist; each paragraph's `covers` lists which letters it hits.

## Diagrams
Reuse IBecon micro SVGs by absolute path (`/ibecon/graphs/micrographs/...`). New ones live next to the page that uses them, drawn in the micrographs house style (Georgia, teal curves, red MSC/DWL, purple controls): `price-floor-gov-buys.svg`, `pigouvian-tax.svg`. They are not yet in IBecon's `graphs.md`; copy them into `ibecon-src/public/graphs/micrographs/` (and add entries) if IBecon wants them.

## Content status
The two micro pages were drafted by Claude from Sam's Unit 2 decks; real-world facts are web-checked and listed under Sources on each page. **Pending Sam's review.** Real examples must be real.

Every page Sam hasn't checked carries a bright `<div class="unchecked">` "Not checked by Sam" box under the page head (poverty, price floors, carbon taxes as of 2026-11-08). Indirect tax is Sam's own answer, so it has no box. New Claude-drafted pages get the box; remove it only when Sam says a page is checked.
