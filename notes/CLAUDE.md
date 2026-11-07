# CLAUDE.md: notes/

## What this is

**Idea network viewer** at `unisam.nz/notes`: a single self-contained `index.html` (HTML, CSS and JS, no build step on this repo) that draws a network map (with a dynamic mode and article sidebar), article view, timeline and sources list from Sam's node markdown files. It is a personal tool, marked `noindex` and not linked from any index.

## Data and privacy

- The page ships with 9 invented sample nodes only. No real notes and no tokens are in this repo, and none should ever be committed here.
- The Load button reads nodes in the visitor's browser: from a GitHub folder (public repos need no token, private repos need a read-only fine-grained token the visitor pastes in) or from chosen `.md` files. Nothing is stored or sent anywhere except requests to api.github.com. The token is only kept on the device if the visitor ticks "Remember", which uses localStorage on this origin.
- Sam's real notes live in the private repo `samsmasm/notes`, in `Sam's notes/`. Read `Sam's notes/CLAUDE.md` there for the node file format and the display rules.

## Source and rebuild

The page is built from a template. The source (`build.py`, `template.html`, `display-config.json`, sample nodes) lives in the private notes repo at `Sam's notes/Display/source/`, not here. To update this page, rebuild from that source with `python3 -I build.py sample-nodes notes-index.html "Idea network (sample data)"` and copy the result to `notes/index.html`. Look and feel is in the marked CSS and `CONFIG` blocks at the top of the template.

## Design

Own utility look (paper background, square chips, no site masthead), not the full AESTHETIC.md treatment. Chips are square-cornered to respect the no-pills rule.
