# CLAUDE.md: Argument Mapper

## What this is

**Argument Mapper** is a standalone canvas-based tool for building visual argument maps. Users place nodes (contentions, reasons, objections, rebuttals, evidence) on a freeform canvas and connect them with arrows. Intended for academic writing and essay planning.

Live at: `unisam.nz/argmap/` (also embedded at `/moa/argmap/`)

---

## File structure

The app is a single file: **`index.html`**. All HTML, CSS, and JS in one file. No dependencies.

`import-prompt.md` sits alongside it but is **documentation only**, never loaded at runtime. See "Import" below.

---

## Node types and colours

```
Contention  #5c6bc0 (indigo)
Reason      #43a047 (green)
Objection   #ef5350 (red)
Rebuttal    #fb8c00 (orange)
Evidence    #1e88e5 (blue)
Draft       #c8c4bc (grey) - unclassified floating note
```

Each type has a badge (small label) with a matching pastel background (`--badge-{type}-bg/fg`).

`VALID_CHILDREN` governs what can hang off what, and drives the hover strip's buttons:

```
contention -> reason, objection
reason     -> reason, objection, evidence
objection  -> rebuttal, evidence
rebuttal   -> evidence
evidence   -> (nothing)
draft      -> (nothing)
```

---

## Canvas model

- Nodes are `div` elements positioned absolutely on a `#canvas` element that itself is transformed for panning/zooming.
- Connections are SVG `<path>` elements drawn from parent node to child node.
- Design tokens are defined as CSS custom properties at `:root`: node width, radius, colours, connector stroke.

---

## Key interactions

- **Add child node**: hover a node, then click a coloured button in the hover strip below it. The strip only offers types allowed by `VALID_CHILDREN`. `+ Node` in the left panel opens the full add panel.
- **Drafts**: `+ Draft` makes a floating unparented node. Click its `Connect ->` button to enter connection mode, then click a parent and pick a type. Connection is click-based, not drag.
- **Change type**: click a node's type badge (any type except contention).
- **Delete node**: the `x` button in the node header. There is no delete-key shortcut.
- **Detach**: hover a connector, click the `-` button to make the child a floating island.
- **Collapse**: `▾` in the node header hides the subtree below. The node keeps showing its own text; only descendants hide.
- **Co-premises**: drag two siblings close together to snap them into an AND/OR group; drag apart to split.
- **Resize node**: drag the right edge handle. Width is per node, default `--node-width` 234px.
- **Pan**: drag blank canvas. **Zoom**: scroll wheel, or the zoom panel bottom-right.
- **Keyboard**: only `Esc` (close panels / exit connection mode) and `Ctrl/Cmd+Z` (undo). No other shortcuts exist.
- **Save/Load**: Firestore, not localStorage. See "Save / share model".

Nodes snap to vertical bands (`SNAP_LEVELS`, recomputed into `dynamicLevels` so tall nodes push later levels down).

---

## Left panel

```
Map        New · Save · Load · Share · My Maps (signed in only) · Export · Print
Edit       Undo · Tidy
Build      + Node · + Draft
Analyse    Check
(no label) ? Help
```

Below the groups: Google sign-in button, or the signed-in user area with Sign out.

**Import is deliberately absent here.** It lives at the bottom of the Help modal. See "Import".

Other UI: `Sample` button in the Help modal title row, zoom panel bottom-right, status chip top-left (`Draft` / `Saved` / `Loaded` / `Copy`), editable `#map-name` title.

---

## Constraints

- Single file. Do not split into multiple files.
- Font: Georgia for node text (maintains academic register).
- Canvas background: `#f5f3ef` (warm off-white).
- Do not change node type colours or badge styles without explicit instruction. These are part of the visual grammar that students learn to read.
- No em dashes in any UI text, comments, or docs in this project.
- The audience is students. Default to making AI-assistance features less prominent, not more.

---

## Save / share model

Firebase project `argmap-194a5` (Firestore). `saveMap()` writes to `argmap_maps/{6-char code}`; signed-in users also get an entry under `users/{uid}/maps/{code}` for the My Maps panel. `location.hash` mirrors the current code and is auto-loaded on page open.

Share links come in two flavours off the same code:
- `#CODE`: edit link, loads bound to that code; saving overwrites the original.
- `#CODEcopy`: copy link, loads the same content but `currentCode` stays `null`, so the first Save forks a brand-new code instead of touching the original.

Opening either kind of link (via the initial-hash auto-load only, not internal Load-panel/My-Maps loads) shows a one-time modal stating which mode it is. Because an edit link and your own bookmark are the same URL, that modal also fires on a plain refresh, so its wording covers both cases.

Both link types are surfaced together in the Share modal (`#code-modal`), opened from the left-panel **Share** button, from Save (guest), or from the My Maps "Share" button. `shareMap()` saves first when the map has no code yet.

---

## Local drafts and the unsaved chip

Every edit is mirrored to localStorage. Firestore is still written **only on explicit Save**, so this costs no database quota. Continuous Firestore autosave was considered and rejected on write-volume grounds.

- `markDirty()` is called from `pushUndo()` (covering all 11 structural mutations at once) plus the three that bypass it: node text, evidence source, and the map title.
- `pushUndo()` runs *before* its mutation, which is safe here only because `markDirty()` merely schedules a debounced write that reads live state when it fires.
- `markDirty()` is a hint, not a verdict. `flushDraft()` compares against `savedSnapshot` and resolves back to clean if nothing actually changed, so a mousedown without a drag does not leave the map looking dirty.
- Draft key is `argmap_draft:{code|'new'}`. `purgeOldDrafts()` drops anything over 14 days on load.

**The chip counts from the oldest unsaved change, not from the last save.** Reading a saved map for ten minutes without editing must never escalate, or the warning becomes noise and students learn to ignore it.

| Unsaved for | Chip | Class |
|---|---|---|
| clean | `Draft` / `Saved` / `Loaded` / `Copy` | none |
| under 2 min | `Unsaved · 1 min` | `dirty-1` |
| 2 to 5 | `Unsaved · 3 min` | `dirty-2` |
| 5 to 10 | `Unsaved · 7 min` | `dirty-3` |
| 10+ | `Unsaved · 12 min` | `dirty-4` (brick red) |

The ramp deepens warm tones rather than shifting hue, because green/orange/red are already Reason/Rebuttal/Objection in the node grammar. Only the final step is red, and it is `#a83b26`, distinct from objection `#ef5350`.

Never write `status-chip.textContent` directly. Set `chipMode` and call `updateChip()`, or use `baselineState()` / `clearDraft()`, otherwise the timer gets clobbered.

**Drafts are offered, never applied silently**, via `#restore-modal`. `baselineState()` clears the stored draft, so callers must read it with `readDraft()` *before* baselining. On a shared link the restore prompt is queued behind the share banner through `afterShareModeModal` rather than stacking on it.

No `beforeunload` guard: with the local mirror in place, closing the tab no longer loses work, so the prompt would be friction without benefit.

---

## Import

Deliberately de-emphasised so students do their own reasoning rather than having an AI do it.

- The Import button is **not** in the left panel. It sits at the bottom-left of the Help modal footer (`#btn-import`), and there is no Import row in the help grid.
- The modal accepts pasted JSON only. The old two-tab "Get prompt / Paste JSON" UI and the `IMPORT_PROMPT` constant are gone from `index.html`, so the prompt is not in the page source students load.
- The prompt text is preserved verbatim in `import-prompt.md`. Note this repo has a `.nojekyll` file, so that `.md` is still publicly reachable at `unisam.nz/argmap/import-prompt.md`; it is unlinked, not hidden.
- To restore prompt visibility, recover the `IMPORT_PROMPT` const, the `.import-tabs` / `.import-tab` / `.import-prompt-pre` CSS, and the tab markup from git history (the commit before `import-prompt.md` was added).

Do not re-add the prompt to the UI without explicit instruction.

---

## Opening screen vs sample

`INITIAL_NODES` (what a fresh page load shows) is just a blank contention + one reason, titled "New argument map". The full 7-node worked example lives in `SAMPLE_NODES` and only loads via the "Sample" button at the top of the Help modal (`loadSample()`), which retitles the map "Sample argument map".

Keep the hardcoded `#map-name` text in the markup in sync with `INITIAL_NODES`. It previously still read as the sample's contention after the opening screen was blanked.

---

## Testing

No test suite. Chrome is installed, so verify UI changes by driving the real page rather than eyeballing the diff:

```bash
cd argmap && python3 -m http.server 8731 &
# copy index.html to a temp name, inject a <script type="module"> test block
# before </body> that clicks things and writes results into a div, then:
google-chrome --headless --no-sandbox --disable-gpu \
  --virtual-time-budget=25000 --dump-dom http://localhost:8731/__t.html
```

Gotchas learned the hard way:
- Stub `window.confirm=()=>true` in a plain `<script>` before the module, or `newMap()` / `loadSample()` silently abort.
- Build the harness in a **separate .js file**, not `node -e "..."` inside double quotes. Bash expands `$VAR` inside the injected JS and you get a passing-looking test that actually ran on empty input.
- Do not click **Share** or **Save** in a test. Both write real documents to production Firestore.
- Grepping the dumped DOM for a string finds your own test script too. Check `index.html` itself.

---

## Current status

Working and stable. No known bugs.

Verified in headless Chrome as of the import change: opening screen renders 2 blank nodes with a connector, Sample loads 7, collapse keeps the collapsed node's own text visible, Import accepts JSON and builds the map.

Untested end to end: the Share button's Firestore round trip, because exercising it writes live data.
