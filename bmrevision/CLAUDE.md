# BM revision, `/bmrevision`

Temporary self-guided revision site for Sam's **IB2 Business Management** class, for the two lessons he is away for: Wednesday 25 and Monday 30 November 2026 (exam prep before 2 December). Built 2026-11-22. Remove or unlink after 2 December unless Sam says otherwise.

Sam's project note: `~/notes/Projects/BM revision/BM revision.md`. The vault folder also holds a copy of `index.html`: **edit the copy here, then copy it back to the vault** so the two stay the same (and commit and push both).

## Shape

One self-contained `index.html` (HTML, CSS, JS). No server, no login. Views are `<section class="view" id="v-NAME">`, switched by `go(name)`; the hash is kept in the URL.

- **Tab bar** (`#tabs`): Home · 1. RAG · 2. Topic cards · 3. KOTO ▾ (case, decision tree 1, 2, critical path 1, 2 (HL), tools and recommendation) · 4. Targets · Helpers ▾ (business bank, toolkit grid). Dropdowns open on click, close on pick, outside click or Escape. `markTabs()` underlines the current tab; a dropdown button is "on" for any view in its `data-group`.
- **Home** is a numbered path diagram, not tiles (Sam: students already have a heavy cognitive load). Wednesday: 1 RAG (start here), 2 Topic cards. Monday: IA note, 3 KOTO practice (sub-steps a to e, critical paths HL only, lettering switches with `.sl-only`/`.hl-only`), 4 More topic cards, 5 Targets. Helpers in dashed boxes with dotted links beside the step that uses them. `renderPath()` shows done ticks (RAG done, number of cards).
- **RAG**: every content line of the IB guide (`SYL`), collapsible by unit and subtopic, R/A/G buttons in real colours (selected one outlined, others fade). "IBBM notes" links per subtopic (`IBBM_LINKS`, and the 7 Ps via `IBBM_P_LINKS`; 2.6, 2.7, 5.7, 5.9 have no IBBM page). Mind map link (`MINDMAP_LINKS`, a Google Drive folder only SSIS accounts can open). Live "Your priorities" list under it (`renderPrio()`: reds, then ambers).
- **Targets** (view id is still `wrap`, saved answers under `S.ans.wrap`): the same priorities list at the top (`#targetPrio`), then Now amber or green, Still red, My goal for 2 December.
- Topic cards, KOTO case, decision trees (SVG with a key), critical paths (HL), tools and recommendation (planning boxes: relevant info, relevant theory; then ranking and PEEL), business bank, toolkit grid.
- SL/HL chosen on first visit (modal), toggle in the masthead; `body.sl .hlonly` hides HL content. Students who open a later section before the RAG get a nudge with "Continue anyway".
- `BACKUP_LINK`: the Google Doc version of the pack, shown in "Good to know".

## Saving and copying

Answers live only in the student's browser: localStorage key `bmrev-v1`, wrapped in try/catch. Every section has labelled copy buttons that copy an HTML table (pastes into Google Docs) with a plain-text fallback. Copy buttons not yet tested in Google Docs by Sam.

## Look

The sophisticated look (AESTHETIC.md Option B): navy masthead, amber rule, Fraunces and Atkinson Hyperlegible, geocorn logo, BM blue `#1a3a7a` accent. HL labels are plain uppercase text, never chips. Colours are CSS variables at the top of the style block.

## Answers (invented KOTO figures)

- Decision tree 1: net gain Option 1 $190,000, Option 2 $170,000, Option 3 $0
- Decision tree 2: net gain cooking classes $45,000, café kiosk $48,000
- Critical path 1: A B F H, 15 weeks; float C 1, D 6
- Critical path 2: A D E G, 11 weeks; float B 2, C 3, F 2

## Testing

No test suite. Check in headless Chrome with Playwright from the npx cache (`/home/sam/.npm/_npx/*/node_modules/playwright`, `executablePath: '/usr/bin/google-chrome'`), loading the file with `file://` (a local server was blocked). The logo 404s on file://, that is expected. Check every view at 390px wide for sideways scroll (`document.documentElement.scrollWidth`); data tables scroll inside themselves on phones.

## Rules

Short, plain wording (students work alone). No em dashes. Content follows the IB guide; Sam's wording stays as he wrote it.
