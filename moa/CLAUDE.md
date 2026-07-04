# CLAUDE.md — MOA (Modern Origin Archive)

## What this is

**MOA: Modern Origin Archive** is a student-facing guide for the IB History MYP/DP Internal Assessment (or similar extended research task). It walks students through the research process step by step: choosing a research question, finding and justifying sources, crafting a narrative, reflecting, and submitting.

Live at: `unisam.nz/moa/`

---

## Aesthetic

**Retro Windows 9x / late-1990s web aesthetic.** This is intentional and should be preserved. Key characteristics:
- Windows 9x taskbar at top (`div.taskbar`) with a real clock
- `border: 3px solid #000080` (navy blue), `background: #fffff0` (cream) for cards
- Orange (`#ff6600`) or navy headers on part cards
- `font-family: 'Times New Roman', Times, serif` for body text
- `font-family: Arial, sans-serif` for UI labels
- Blue hyperlink colours (`#0000ee`) 
- `style.css` is the main stylesheet, `retro.css` provides the Windows 9x chrome (taskbar, window frame elements)

Do not modernise this. It is not a bug or oversight — the retro style is the design.

---

## File structure

```
moa/
  index.html            ← project overview / homepage (redirects to today/ unless ?direct=1)
  nav.js                ← shared nav renderer, clock, font size, tab logic
  style.css             ← main content styles (retro body, cards, typography)
  retro.css             ← Windows 9x chrome (taskbar, window frames)
  today/                ← "Today" page — current task / what to do now
  docs/                 ← Official assessment docs
  rq/                   ← Research Question guide
    starters/           ← RQ starter prompts
  sources/              ← Finding sources guide
  argmap/               ← Argument map tool
  justifying/           ← Justifying sources guide
  narrative/            ← Crafting the narrative guide
  reflecting/           ← Reflection guide
  finalsubmission/      ← Final submission checklist
  timeline/             ← Timeline page
  music/                ← Background music player
  guestbook/            ← Student guestbook (Firebase)
  big6/                 ← Big6 research framework
  gibbons/              ← Content about gibbons (topic-specific)
  tcc/                  ← TCC content
  4-1/ through 4-5-*    ← Topic-specific content pages
  png/                  ← Image assets
  sam90s.jpg etc.       ← Author photos for the retro vibe
```

---

## nav.js — key functions

Every page must include `<script src="/moa/nav.js"></script>` and call `renderNav()` after the DOM is ready.

```js
renderNav()          // injects <ul> into #main-nav
updateClock()        // sets #taskbar-clock, call on interval
initTabs()           // activates .tab-btn / .tab-panel by URL hash
initFontCtrl()       // wires up font size +/- buttons
```

`PAGES` array in `nav.js` is the source of truth for nav order and slugs. To add a new page, add it to `PAGES` and create the directory with `index.html`.

---

## Page pattern

Every page:
1. `<div class="taskbar">` at top (copy from any existing page)
2. `<script src="/moa/nav.js"></script>` before body closes (or in head)
3. `<nav id="main-nav"></nav>` in a sidebar or header position
4. Call `renderNav()` and `setInterval(updateClock, 1000)` on DOMContentLoaded

Font size is stored in `localStorage` under key `moa-fontsize` as a CSS variable `--fs`. The IIFE in `nav.js` applies it before paint.

---

## Key constraints

- The homepage redirect: `index.html` immediately redirects to `/moa/today/` unless `?direct=1` is in the URL (used by the nav link to "The Project" page). Do not remove this redirect.
- `nav.js` uses the pathname to detect base URL — it looks for `/moa/` in the path. Works correctly on both unisam.nz and localhost.
- The guestbook uses Firebase Realtime Database (project: `dowserboard` — same Firebase project as Pulse).
- The `argmap/` subdirectory contains an interactive argument mapping tool — a separate self-contained tool.

---

## Current status

Active in-use site for a Grade 9 History IA project. Core pages done: today, docs, rq (with activities), sources, argmap, big6, guestbook, music.

**Stub pages (structure exists, no content):** justifying/, narrative/, reflecting/, timeline/. These were never filled in.

**No known bugs in active pages.**
