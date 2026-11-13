# CLAUDE.md: notes/

## What this is

**Idea network viewer** at `unisam.nz/notes`: a single self-contained `index.html` (HTML, CSS and JS, no build step on this repo) that draws a network map (with a dynamic mode, article sidebar, hard and soft search, and Filters and Display menus), article view, timeline and sources list from Sam's node markdown files. It is a personal tool, marked `noindex` and not linked from any index.

## Data and privacy

- The page ships with 9 invented sample nodes only. No tokens are in this repo, ever. Real notes go here only as **public sets** that Sam has chosen to publish (see below); never commit any other real notes.
- Public sets: `sets/<slug>.json` (parsed nodes and sources) plus a row in `sets/index.json`. The Load panel lists them under "Public notes", and `?set=<slug>` is a direct link that opens one. Made with `publish_set.py` in the source folder (usage in its header). Published so far: `bm-hr` (IB BM Unit 2 HRM, 2026-11-13, unisam.nz/notes/?set=bm-hr). Re-run the script after those nodes change.
- The Load button reads nodes in the visitor's browser: from a GitHub folder (public repos need no token, private repos need a read-only fine-grained token the visitor pastes in) or from chosen `.md` files. It also reads `Sources.md` from next to the nodes folder, if there is one. Nothing is stored or sent anywhere except requests to api.github.com. The token is only kept on the device if the visitor ticks "Remember", which uses localStorage on this origin.
- Sam's real notes live in the private repo `samsmasm/notes`, in `Sam's notes/`. Read `Sam's notes/CLAUDE.md` there for the node file format and the display rules.

## Source and rebuild

The page is built from a template. The source (`build.py`, `template.html`, `display-config.json`, sample nodes) lives in the private notes repo at `Sam's notes/Display/source/`, not here. To update this page, rebuild from that source with `python3 -I build.py sample-nodes notes-index.html "Idea network (sample data)"` and copy the result to `notes/index.html`. Before committing, grep the page to confirm it holds sample data only, with no real node names or tokens. Look and feel is in the marked CSS and `CONFIG` blocks at the top of the template.

## Design

Own utility look (paper background, square chips, no site masthead), not the full AESTHETIC.md treatment. Chips are square-cornered to respect the no-pills rule.
