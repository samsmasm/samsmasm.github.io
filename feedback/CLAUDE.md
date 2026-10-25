# Feedback inbox (unisam-feedback)

One feedback / fault-report service for any unisam.nz tool. Built 2026-10-25 for ShiftWork v2 (`graphs/`, app name `graphs`), designed to be reused.

## Pieces

- `worker/`: Cloudflare Worker `unisam-feedback`, routed at `unisam.nz/feedback/api/*` (and `www.`). Deployed with `npx wrangler@4 deploy` from `worker/` (wrangler OAuth on Sam's machine works; the Cloudflare MCP is read-only). KV namespace `FEEDBACK_KV` (id in `wrangler.jsonc`).
- `index.html`: the inbox at unisam.nz/feedback/ (GitHub Pages, `noindex`). Asks for the admin key once and keeps it in that browser's localStorage. Lists reports (filter by tool, hide done), shows message, reply email, screenshot, metadata, and for ShiftWork reports **Open this diagram** / **Copy save code**.
- Admin key: Worker secret `ADMIN_KEY`. The value lives only in `~/.config/unisam-feedback-admin-key` on Sam's Linux machine (mode 600). To rotate: write a new value to that file, then `npx wrangler@4 secret put ADMIN_KEY < ~/.config/unisam-feedback-admin-key`.

## API

| method | path | who | notes |
|---|---|---|---|
| POST | `/feedback/api/report` | anyone | `{ app, type: bug/idea/other, message, email?, image? (jpeg/png data URL), diagram? (string), meta? (flat object), website (honeypot) }` |
| GET | `/feedback/api/reports?cursor=&app=` | admin | newest first, 100 per page, summaries from KV metadata |
| GET | `/feedback/api/report/:id` | admin | full report incl. image and diagram |
| POST | `/feedback/api/report/:id/done` | admin | toggles done |
| DELETE | `/feedback/api/report/:id` | admin | deletes report and image |

Admin = `Authorization: Bearer <ADMIN_KEY>`. CORS allows unisam.nz, www.unisam.nz, samsmasm.github.io.

Limits: 12 reports per IP per hour (soft, KV based), message 4000 chars, image 2 MB, diagram 300 KB, reports expire after a year. Honeypot `website` field: bots get a fake success. No email alerts: Sam checks the inbox when he wants to (his decision).

## Adding it to another tool

POST to `https://unisam.nz/feedback/api/report` with a unique `app` name. Keep any screenshot or user content **opt-in and unticked by default**, and say in the form exactly what else is sent. See `graphs/index.html` (search `FEEDBACK`) for a complete example, including the `recentErrors` ring buffer sent in `meta.errors`.

The "Open this diagram" handoff writes the diagram to localStorage `sw2_open` and opens `/<app>/`; ShiftWork reads and clears it on load. It only works when the inbox is opened on unisam.nz (same origin as the app).
