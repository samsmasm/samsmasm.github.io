# ShiftWork v2 plan

Agreed with Sam on 2026-10-25. Work happens in `graphs2/` (a fork of `graphs/`) and is promoted back over `graphs/` only at the end (Phase 7). Read this file and `CLAUDE.md` before starting any phase.

## Philosophy (changed 2026-10-25)

v1 deliberately kept some friction. **That is dropped.** The goal now is that ShiftWork is as easy as possible for students and teachers. Concretely:

- The app does the geometry. If something is visibly connected to something else (a drop line to an equilibrium, an equilibrium to its curves, a label to its curve or point), it stays connected when things move.
- Common IB moves (shift a curve, mark an equilibrium, label P₁/Q₁) are one click, not a sequence of manual steps.
- No popups (`prompt()`, `confirm()`, modal dialogs) where an inline edit or undo would do.
- Anything destructive is undoable rather than guarded by a confirm.

When a choice comes up between "student does it by hand" and "the app does it for them", pick the app.

## Decisions

1. Feedback alerts: **none**. Sam checks the reports page occasionally. No email binding needed in the Worker. (2026-10-25)
2. Legend: **build automatically** from labelled curves and regions, off by default, each entry tickable, follows B/W mode. Replaces the manual "+ Add / rename curve" list. (2026-10-25)
3. Guide-line style: **dashed `6,4`**, thin. (2026-10-25)
4. Equilibrium dot: **hidden by default**, toggle in props. (2026-10-25)

---

## Phase 0: Fork and scaffolding

- Copy `graphs/` to `graphs2/`. `graphs/` stays live and untouched until Phase 7.
- graphs2 header: "Beta" tag and a link to the stable version. Add `<meta name="robots" content="noindex">`. Do not add it to `/find` or the home page.
- graphs2 uses its own localStorage keys (`sw2_*`). Drive works unchanged (same origins, same OAuth client).
- Saved data gets `v: 2`. graphs2 must open every v1 save code and Drive file, converting on load (`migrateV1(data)`). v1 does not need to open v2 files.
- Test harness in `graphs2/test/`: headless Chrome scripts (puppeteer, as in catjump) that drive the real page and assert on `state`. Every fix and feature below gets a check. Run before every commit.
- Refactor first, because everything later touches these:
  - `isLinear(el)` for the `line || arrow || dbarrow || brace` check (about 12 copies).
  - `eventToLogical(e)` for the mouse-to-logical conversion (copied into 4 handlers).
  - `escapeHtml()` for everything put into `innerHTML`.
  - Delete dead code: `roundRect`, `hoverHitId`, the two empty stroke `change` listeners, unused `pattern` on legend items, `origLabel = 'text'` in Duplicate.

## Phase 1: Bug fixes

1. Undo snapshots the whole document (elements, legend, title, axis labels, axis label offsets). Template load, clear and axis-label drag become undoable. A click with no movement must not push an undo entry or clear redo.
2. Loading a template asks only if the canvas has content, and is undoable.
3. Autosave the current diagram to localStorage on every change; restore on load. `beforeunload` warning when there is unsaved work.
4. Arrows, double arrows and braces can be body-dragged (move code only handles line/curve/region/dot/text).
5. Brace label hit test uses the tip position where the label is actually drawn.
6. Selected element's endpoint handles take priority over its label in hit testing.
7. Double-click to finish a curve or region no longer adds 2 duplicate points.
8. Small ones: opacity dropdown default (0.25 has no option, shows 10%); "Make horizontal / vertical" shown for dbarrow but does nothing; header subtitle is dark-on-dark; title/axis inputs use `oninput`; export clears the props panel selection properly; redraw after `document.fonts.ready`.
9. Escape labels and legend names (shared save codes can inject markup).
10. Weight/dash dropdowns show the true value even for non-standard values (templates use `5,4`, so they show "Solid").

## Phase 2: Feedback / report-a-fault button

Early so graphs2 testers can report while it is being built.

**UI**: "Feedback" button in the header opens a small form: message, type (Bug / Idea / Other), optional reply email. Two opt-in checkboxes, both unticked by default:
- "Include a picture of my diagram": captured from the canvas with the existing export code (no screenshot library), preview shown before sending.
- "Include my diagram file so Sam can open it": attaches the save code.

Always sent, and listed openly in the form: app version, browser, viewport size, current tool, last few JS errors (small `window.onerror` ring buffer). No Google email unless typed.

**Backend**: Cloudflare Worker `unisam-feedback`, reusable by any tool via an `app` field.
- Store reports in KV (image in R2 or KV).
- No alerts (decision 1): Sam checks the reports page.
- `graphs2/reports.html` (secret key) lists reports with thumbnail, metadata, "Mark done", and "Open this diagram" which loads the attached save code into graphs2.
- Per-IP rate limit plus honeypot field. Turnstile only if spam appears.
- Cloudflare MCP is read-only: deploy via dashboard or wrangler. Write the code plus step-by-step deploy notes.

## Phase 3: Connected diagrams (the core of v2)

**This is where "everything connected moves together" lives.** It is the foundation for Phases 5 and 6 (Shift curve, templates), so it comes before them.

### 3a. Guide-line style
- One `GUIDE` constant (thin weight 1.5, dash per decision 3, grey) used by template guide lines, equilibrium drop lines and the sidebar default.
- Choosing a dash always sets weight to Thin (not only until the weight is first touched).

### 3b. Attachment model
Every element can be attached to another, and positions are resolved from the attachments on every redraw (`resolveAttachments()` called at the top of `redraw()`, in dependency order, with a cycle guard).

- **Equilibrium point** (`dot`): `on: [idA, idB]`. Its position is recomputed as the intersection of those two curves (lines or sampled curves, reusing `getElSegments` / `segSegIntersect`). If they no longer cross, it keeps its last position and shows a faint warning ring.
- **Drop lines** belong to the point (drawn by the dot, not separate line elements), so they always follow it.
- **Axis labels of a point** (P₁, Q₁) belong to the point, so they follow too. Each has its own offset for manual nudging.
- **Curve labels** already follow their curve via `labelDx/labelDy` offsets. Keep that, and make sure every linear type and curve does it consistently (brace included).
- **Free text** gets an optional `attach: { id, dx, dy }`. When a Label is placed within a short distance of an element, it attaches automatically (shown with a faint connector while selected). Detach button in the props panel.
- **Line endpoints** get optional `p1On` / `p2On: { id, t }` (parameter along the target), so a shift arrow drawn between S₁ and S₂ stays between them. Set automatically when an endpoint is snapped onto an element.

### 3c. Moving labels separately
- Dragging a curve moves the curve and everything attached (its label, its equilibrium points, their drop lines and P/Q labels, attached text).
- Dragging a label moves only that label: it changes the label's offset from its parent, so it still follows the parent afterwards.
- A selected label shows a small handle and a "Reset label position" button.
- Holding Alt while dragging a curve moves the curve alone, leaving free text behind (for the rare case it was auto-attached wrongly).

### 3d. Click an intersection to add drop lines
- Equilibrium tool snaps to intersections (hover shows the snap marker). Clicking creates a point `on` the two curves that cross there.
- Draws dotted lines down to the x-axis and left to the y-axis.
- Skip rule: if one of the crossing curves is exactly vertical (LRAS, perfectly inelastic S), skip the down line; if one is exactly horizontal (price ceiling/floor, flat Keynesian AS, perfectly elastic D), skip the left line. Stored as computed flags, recomputed when curves move.
- Labels auto-number P₁/Q₁, P₂/Q₂ (PL/Y for AD/AS axes, judged from axis label text). Edited inline, no `prompt()`.
- Dot visibility per decision 4, toggle in props.

### 3e. Migration of v1 diagrams
`migrateV1` converts old saves into connected form where it is unambiguous:
- A pair of dashed lines meeting at a curve intersection and running to both axes becomes one equilibrium point `on` those curves.
- Text within a few pixels of where that point's axis labels would go becomes its P/Q labels.
- Anything ambiguous stays as plain elements (never guess destructively).

## Phase 4: Consolidation (remove duplicates)

- One text editing path: inline on canvas. Remove the edit modal; Label and Equilibrium tools use the inline box instead of `prompt()`.
- One fill system (pattern plus colour) for both colour and B/W modes; `migrateV1` maps `pattern` / `bwPattern`.
- One export button (2×) with a menu: Copy image (clipboard, for Google Docs), JPG, PNG.
- One Clear, undoable, no confirm.
- Sign-in lives in the Save modal only; header shows Drive status.
- Colour picker shows "Colour mode only" in B/W mode.
- Legend per decision 2: built from labelled curves and regions, each tickable, follows B/W mode (black lines, patterns), removes "+ Add / rename curve".

## Phase 5: Big features

1. **Shift curve**: select a curve, "Shift left" / "Shift right". Duplicates horizontally, relabels S₁/S₂, adds a shift arrow attached to both (Phase 3b). Equilibrium tool then snaps to the new crossing. Optional: auto-create the new equilibrium and number it.
2. Subscripts: `S1` or `S_1` renders as S₁ in all labels.
3. Keyboard: V/L/A/C/T/R/E tools, arrow-key nudge (Shift = bigger), Ctrl+C/V/D, Esc cancels an in-progress line.
4. Drag middle points of curves.
5. White halo behind labels, readable over hatching and lines.
6. Pointer events for touch (iPads, touchscreen Chromebooks).
7. Preset curve shapes: U-shaped MC/AC, PPC bow, J-curve, Lorenz.

## Phase 6: Templates

- Template picker: grid with thumbnails, grouped Micro / Macro / Global.
- Rebuild existing templates with connected equilibrium points (no hand-placed drop lines or text), so equilibria are always exact.
- New: indirect tax with incidence, subsidy, price ceiling, price floor, PPC, Lorenz curve, monopoly, perfect competition, tariff, quota, exchange rate market, Phillips curve, inflationary gap, deflationary gap, merit good, demerit good.

## Phase 7: Promote

- Walk through every template and a set of real v1 save codes in graphs2.
- Copy graphs2 over graphs, version v2.0, `/graphs2` becomes a redirect to `/graphs`.
- Rewrite `CLAUDE.md` for v2 (line numbers, attachment model, migration).
- Feedback Worker stays live for the main app.

Commit and push after each phase step so Sam can test at unisam.nz/graphs2.

---

## Progress log

### 2026-10-25: Phases 0 and 1 done

Phase 0: forked to `graphs2/` (beta tag, link to stable, `noindex`, `sw2_` storage keys, `v: 2` saves via `migrateGraphData`), browser test harness in `test/`, helpers `isLinear`, `eventToLogical`, `escapeHtml`, dead code removed.

Phase 1: all ten items done and covered by tests. Decisions taken along the way (Sam was away, trusted these calls):
- **No confirms at all.** Loading a template over work and clearing are undoable and show an Undo toast, rather than asking first. This matches the new philosophy better than the plan's "asks first".
- **No leave-page warning** while autosave works, since nothing is lost on reload. The warning only appears if localStorage writes fail (private mode, full storage).
- **"Clear canvas" and "Reset everything" merged into one "Clear diagram"** (pulled forward from Phase 4; it is just loading the blank template, so it is undoable).
- **Edit modal removed and the Label tool's `prompt()` replaced** by the inline editor (pulled forward from Phase 4), because double-clicking a dot opened the modal on a field dots don't use, and inline editing also had to learn zoom/pan.
- Also fixed while there: templates were shallow-copied, so editing a template curve's endpoint changed the template itself for the next load; inline edit box was mispositioned when zoomed; text hit area now matches the text width; Escape cancels any in-progress drawing (from Phase 5).
- Brace dash dropdown hidden (braces always draw solid).

### 2026-10-25: Phase 2 done (feedback button)

- Worker `unisam-feedback` **deployed and live** at `unisam.nz/feedback/api/*` with KV storage. Inbox page at `unisam.nz/feedback/`. Everything is documented in `feedback/CLAUDE.md`, including where the admin key lives (`~/.config/unisam-feedback-admin-key`).
- Changes from the plan: the inbox lives at `/feedback/` rather than `graphs2/reports.html`, because the service is shared by all tools. "Open this diagram" hands over through localStorage (`sw2_open`) rather than a long URL.
- graphs2: "Feedback" button in the header. Form has type, message, optional email, and two opt-in boxes (picture with preview, diagram file), both unticked every time the form opens, and a "What else is sent" note. Metadata: version, page, browser, viewport, tool, colour mode, zoom, element count, last 8 page errors.
- Tested: Worker locally (submit, honeypot, empty message, auth, CORS, rate limit, done, delete) and live (submit, list, delete, CORS); graphs2 with 3 browser tests (fetch stubbed).
- Also: `renderExport()` now does the export drawing for both JPG download and feedback pictures; typing in any dialog no longer triggers canvas shortcuts (Backspace, Ctrl+Z).

### 2026-10-25: Phase 3 done (connected diagrams)

All of 3a to 3e, with 13 new browser tests (34 in total). Calls made:
- **Templates rebuilt on connected points now** (pulled forward from Phase 6), because the old hand-placed guide lines would otherwise stay disconnected. Label text is unchanged (P / Q*, PL / Yfe, Pm / Qm, Ps / Qs, P₁ / Y₁). The Keynesian YFE text is attached to the YFE line.
- An attached point cannot be dragged on its own (the hint bar explains), because its position *is* the crossing. "Unlink from curves" in the panel frees it. A free point dropped onto a crossing links to it.
- Dragging an arrow whose ends are on curves slides the ends along those curves, rather than tearing them off. Alt+drag detaches.
- Deleting a curve deletes its equilibrium points (undoable). Attached text and arrow ends just become free.
- Clicking a hidden dot needs to be within 7 px (12 px when shown), so the curves crossing there stay easy to grab. Clicking a drop line selects its point.
- Guide lines use the curve colour rule: grey `#888` in colour mode, black in B/W like everything else.
- Text auto-attaches when placed within 24 px of a line, curve or point. Free text can be attached later with "Attach to nearest".

**Next: Phase 4 (consolidation).**
