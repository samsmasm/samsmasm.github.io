# Find, `/find`

"Which tool do I want?": a filter page that gets Sam (or anyone) to the right unisam.nz tool. Built because there are too many useful tools to remember. Public, linked from the homepage nav ("Find a tool") and the `/tools` and `/experiments` navs.

## Files

- `tools.js`: **the tools list.** One entry per tool: `name`, `url`, `desc`, `for`, `subj`, `who`, `tags` (search-only words). Allowed values are listed at the top of the file. Add a tool here when it should be findable.
- `index.html`: the page (inline CSS and JS, no libraries).

## How it works

- Three questions shown as plain underline-tab options (no pills, per `AESTHETIC.md`): What's it for? · Subject? · Who's using it? One choice per question; click again to clear. AND across questions.
- Each option shows how many tools would be left if you picked it; zero-count options are greyed.
- A subject filter also keeps "any subject" tools, listed after the subject-specific ones.
- Search matches every word against name, description and tags.
- Choices sync to the URL (`?for=live&subj=econ&q=quiz`), so a view can be bookmarked.
- "Remember these?" (shown only with no filters): three tools, favouring ones never or least recently opened from this page. Opens are stored per browser in localStorage `find-opened`.

## What's in and out

Only tools already linked from the homepage, `/tools` or `/experiments`, plus `lineup`, `aiorus` and `stocksimulator`. Private tools (`sayso`, `moderntranslation`, `tote`, `typeit`) stay out. The unreviewed games and resources listed in the root CLAUDE.md stay out until Sam reviews them.

Descriptions reuse Sam's wording from `/tools` and `/experiments` where it exists; keep them in step if either changes.
