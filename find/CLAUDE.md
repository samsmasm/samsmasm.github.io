# Find, `/find`

A clickable flowchart that gets Sam (or anyone) to the right unisam.nz tool, built because there are too many useful tools to remember. Public, linked from the homepage nav ("Find a tool") and the `/tools` and `/experiments` navs.

An earlier version used filter rows (What's it for? / Subject? / Who?). Sam rejected it: the filters weren't fine enough and the tools didn't fit the categories. **Keep it a question-by-question flowchart.**

## Files

- `tree.js`: **the flowchart.** Nested questions; each option has an `id` (goes in the URL), a `label`, an optional `hint`, and either `next` (another question) or `tools` (a list of tool urls). A tool can sit at the end of several paths. Keep end lists to about five.
- `tools.js`: every tool the flowchart can point to: `name`, `url`, `s` (colour family: econ, bm, hist, maths, any), `desc`, `tags` (search-only words).
- `index.html`: the page (inline CSS and JS, no libraries).

**Adding a tool:** add it to `tools.js`, then put its url at the end of every path where Sam would look for it in `tree.js`. Then check that every tool is reachable and every url in the tree exists:

```
node -e "global.window={};require('./find/tools.js');require('./find/tree.js');const u=new Set(window.TOOLS.map(t=>t.url)),s=new Set();(function w(n){for(const o of n.opts)o.next?w(o.next):o.tools.forEach(x=>{if(!u.has(x))console.log('unknown',x);s.add(x)})})(window.TREE);console.log('unreachable:',[...u].filter(x=>!s.has(x)))"
```

## How it works

- One question at a time, as ruled rows (label, hint, "n tools" below it). No pills or boxes, per `AESTHETIC.md`.
- The path is in the URL (`?p=teaching/general/responses`), so the browser back button and bookmarks work. A trail of answers at the top lets you jump back; an unknown id stops at the last valid question.
- The end of a path shows "Try this one" / "Try one of these" with the tools' descriptions.
- "Know what you want?" search at the bottom: every word must appear in name, description or tags.
- "Remember these?" (start screen only): three tools, favouring ones never or least recently opened from this page. Opens are stored per browser in localStorage `find-opened`.

## What's in and out

Only tools already linked from the homepage, `/tools` or `/experiments`, plus `lineup`, `aiorus` and `stocksimulator`. Private tools (`sayso`, `moderntranslation`, `tote`, `typeit`) stay out. The unreviewed games and resources listed in the root CLAUDE.md stay out until Sam reviews them.

Descriptions reuse Sam's wording from `/tools` and `/experiments` where it exists; keep them in step if either changes.
