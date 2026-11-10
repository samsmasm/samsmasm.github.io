# Samples, `/samples`

IB model answers revealed step by step: hint, prompt, starters, blanks (click a blank to reveal a word), full text. Linked from the homepage under Economics.

Static, no build step; deploys on push to `main`. AESTHETIC.md Option B (paper and ink).

## Files
- `samples.css` + `engine.js`: shared by every sample page. A page defines `window.SAMPLE = { parts: [...] }` and loads `engine.js`; it renders into `<main id="essay">`. The data format is documented at the top of `engine.js`.
- `index.html`: ruled index of samples, grouped by unit.
- `econ/macro/poverty/`: 15-mark P1 essay (one part). Not checked by Sam.
- `econ/micro/indirect-tax/`: P1 (a) 10 only, two reasons for an indirect tax. **Sam's own answer**, with his SVG (`indirect-tax.svg`, not the house style). No warning box.
- `econ/micro/price-floor/`: P1 (a) 10 + (b) 15, government intervention without externality. Part (a) was rewritten by Sam in the vault (price, quantity and spending/revenue, diagram `price-floor-revenue.svg` with areas R and G, producer effects with and without the government buying the surplus, price stability point). **(a) checked by Sam; (b) not checked** (Claude-drafted, Thailand rice pledging 2011 to 2014).
- `econ/micro/subsidy/`: P1 (a) 10 only, two reasons for a subsidy (merit goods, producers' incomes, PED add-on). Claude-drafted (2026-11-10) as a close mirror of Sam's indirect tax answer, with `subsidy.svg` drawn in the same style as `indirect-tax.svg`. Not checked by Sam. Vault note: `P1 10markssubsidy.md`.
- `econ/micro/carbon-tax/`: P1 (a) 10 + (b) 15, intervention with externality (British Columbia carbon tax, 2008 to 2025). Claude-drafted, not checked by Sam.

## The vault is the source for Sam's answers
Sam's versions live in the Obsidian vault, `~/notes/Classes/IB Economics/Sample answers/` (`P1 10marksindirecttax.md`, `P1 10+15marks pricefloor.md`). Sam edits there and asks for the site to be updated. To sync:
1. `git -C ~/notes pull --rebase`, then diff the note against the last synced commit to see exactly what changed.
2. Copy the answer text into the `text` fields **word for word**. `{braces}` only mark blanks around Sam's own words; never reword. Captions and SVGs are copied exactly too (an SVG goes in its own file next to the page; delete the one it replaces).
3. Rewrite that paragraph's hint, prompt and starters to fit the new text (these are Claude's scaffolding, not Sam's).
4. Verify by script, both ways: every site paragraph (braces stripped) is a line in the note, every answer paragraph in the note is on the site, and the caption and SVG match. Then commit and push.

The note's own header lines (Length, Structure, "revised" notes) are Sam's; don't edit them without asking. Notes copied out of the site into the vault get inline SVGs with no blank lines or comments (they break Obsidian's HTML), a viewBox so they scale, and a white background rect for dark mode.

## Checked status
- Whole page unchecked: a bright `<div class="unchecked">` "Not checked by Sam" box under the page head (poverty, carbon taxes).
- Mixed: no page box; set `checked: true` on a part for a green "Checked by Sam" badge, or `unchecked: true` for the bright box, which renders **above** that part's heading (Sam asked for it above, not under).
- Sam's own answers get nothing. New Claude-drafted pages get the box; remove it only when Sam says that part is checked, and update the note's `status:` line to match.

## Sam's structures
- **10 marks, DDEE** (2026-11-02): Define, Diagram, Explain, Example (optional, generic, not real-world).
- **15 marks, DDEEE**: Define, Diagram, Explain, Examples (real and required, integrated with the theory), Evaluate on different stakeholders (consumers, producers, government, workers, society), then a judgement.
- How Sam actually writes 10-markers (indirect tax and price floor, 2026-11-08): the definitions paragraph also answers the question; one diagram; one block per reason or stakeholder; effects through price, quantity and spending/revenue rather than surplus areas; PED where it decides the outcome; no conclusion; usually no example.
- Each part shows the checklist; each paragraph's `covers` lists which letters it hits.

## Engine behaviour
Hints and prompts render as plain lines (no bullets). Each paragraph has Reset, Back (one level down) and an advance button. The toolbar sets every paragraph to a level or reveals everything.

## Diagrams
Reuse IBecon micro SVGs by absolute path (`/ibecon/graphs/micrographs/...`) where they fit. Page-specific ones live next to the page: `price-floor-revenue.svg` (Sam's), `price-floor-gov-buys.svg`, `pigouvian-tax.svg` (Claude, micrographs house style: Georgia, teal curves, red MSC/DWL, purple controls), `indirect-tax.svg` (Sam's). None are in IBecon's `graphs.md` yet.

## Content rules
Real-world facts in Claude-drafted parts are web-checked and listed under Sources on the page. Real examples must be real.
