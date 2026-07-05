# CLAUDE.md — samsmasm.github.io (unisam.nz)

## What this is

The GitHub Pages repo for **unisam.nz** — a teacher-built site for IB students. Static HTML/CSS/JS deployed directly from this repo. No bundler at the root level. Individual subdirectory projects may have their own build steps (Astro for `ibbm-src` → `ibbm/` and `ibecon-src` → `ibecon/`).

---

## Repo layout

```
/                         ← root, deploys as unisam.nz
  index.html              ← homepage with tab nav and news feed
  AESTHETIC.md            ← visual language reference — READ BEFORE BUILDING ANYTHING
  ibbm-src/               ← Astro source for IBBM site (npm run build → ibbm/)
  ibecon-src/             ← Astro source for IBecon site (npm run build → ibecon/)
  ibbm/                   ← built output, do not edit directly
  ibecon/                 ← built output, do not edit directly
  econnews/               ← weekly economics news feed
  businews/               ← weekly IB BM case studies (see CLAUDE.md inside)
  ibnews/                 ← IB News Finder (Cloudflare Worker + frontend)
  ratibro/                ← IB Finance revision app (Firebase auth + Firestore)
  moa/                    ← MOA: Modern Origin Archive (retro Windows 9x aesthetic)
  fmwskills/              ← FMW skills-sequencing planning docs + collaborative Kanban tool (Firebase, see CLAUDE.md inside)
  longcut/                ← Quiet-route A* pathfinder (Leaflet + OSM, single HTML)
  graphs/                 ← Economics Graph Drawer (see CLAUDE.md inside)
  pulse/                  ← Live classroom response tool (Firebase Realtime DB)
  qreview/                ← IB continual revision / flashcard tool
  reports/                ← automated student report tools (see CLAUDE.md inside)
  cultivar/               ← genetics/cultivar tool (see CLAUDE.md inside)
  mymaths/                ← mymaths integration (see CLAUDE.md inside)
  [many other small tools]
```

---

## Design system

**Always read `AESTHETIC.md` before creating or editing any frontend.** Key rules:
- Pastel watercolour header gradient (multi-radial). Never flat or linear.
- Subject colours: Economics green (`#145c34`), BM blue (`#1a3a7a`), History orange (`#7a2d0a`), Tools purple (`#4a1a7a`), Experiments pink (`#7a1a4a`).
- Georgia or system sans-serif. No Inter, no DM Sans, no Tailwind aesthetics.
- No drop shadows, no pill buttons, no neutral grey card backgrounds, no dark mode toggle.
- Logo: `/unisamsq.png`, 56–72px, border-radius 12–16px.

---

## GitHub Actions / automation

- `econnews_scripts/` — Python scripts for the EconNews pipeline (RSS → Claude → GitHub Pages)
- `businews_scripts/` — Python scripts for the BusiNews pipeline (see `businews/CLAUDE.md`)
- `.github/workflows/` — workflow definitions
- `generate-feeds.py` / `generate-manifest.js` — feed generation utilities

---

## Deployment

Every push to `main` deploys via GitHub Pages. The repo root is the site root. Subdirectory `ibbm/` and `ibecon/` are built Astro outputs — never edit those files directly; edit `ibbm-src/` and `ibecon-src/` then rebuild.

---

## What to avoid at the root level

- Never use `git add -A` or `git add .` — too many generated files in `ibbm/`, `ibecon/`, `node_modules` etc.
- Never commit `node_modules/` or `.env` files.
- The `dist/` folders inside `ibbm-src/` and `ibecon-src/` do not exist — Astro builds directly to the output dirs above.
