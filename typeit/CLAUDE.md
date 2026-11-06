# typeit, `/typeit`

Photos or PDFs of pages to faithful text (handwriting or print), password-gated, nothing stored.

- `index.html` + `cloudflare-worker.js` (`wrangler.toml`). Details in `README.md`. Deploy the Worker with `npx wrangler deploy` and bump `VERSION` first (check it live at `/typeit/api/version`).

Static, no build step; deploys on push to `main`. Follow the root `CLAUDE.md` (and `AESTHETIC.md` for anything new).
