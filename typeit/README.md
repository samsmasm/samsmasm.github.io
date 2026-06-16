# typeit — handwriting to text

Drop in photos or PDFs of handwriting, get verbatim text back (unreadable words
marked `[?]`). Password-gated, nothing stored.

## How it works

- **Frontend** (`index.html`) is plain static HTML/JS, served by GitHub Pages at
  `unisam.nz/typeit/`. It reads each file, base64-encodes it in the browser, and
  POSTs one page at a time to the worker (3 in parallel, output kept in upload
  order).
- **Worker** (`cloudflare-worker.js`) does two things:
  1. Password gate — a signed HttpOnly cookie unlocks `/typeit/*` (same pattern
     as `wc26`). Unauthenticated requests never reach GitHub Pages.
  2. Gemini proxy — `POST /typeit/api/transcribe` adds the secret API key and
     calls `gemini-3-flash-preview` server-side, so the key never reaches the
     browser.

GitHub Pages can't keep a secret, which is why the key and password live in the
worker, not in `index.html`.

## Deploy

### 1. Frontend
Just commit and push — GitHub Pages serves `typeit/` automatically.

### 2. Worker
The worker must be on a route that **owns `/typeit/*`** on the proxied
`unisam.nz` zone (orange cloud). With wrangler:

```toml
# wrangler.toml
name = "typeit"
main = "cloudflare-worker.js"
compatibility_date = "2024-11-01"

[[routes]]
pattern = "unisam.nz/typeit/*"
zone_name = "unisam.nz"
```

```bash
wrangler deploy
wrangler secret put SITE_PASSWORD   # the shared password you type
wrangler secret put AUTH_SECRET     # any long random string
wrangler secret put GEMINI_API_KEY  # your Google AI Studio key
```

> Generate AUTH_SECRET with e.g. `openssl rand -hex 32`.
> Get a Gemini key at https://aistudio.google.com/apikey

(Or paste the worker into the Cloudflare dashboard, add the same three secrets
under Settings → Variables, and add the route `unisam.nz/typeit/*`.)

## Limits / notes

- Model: `gemini-3-flash-preview`, temperature 0 for fidelity.
- Per-page cap: 25 MB after decode. Multi-page PDFs are sent whole (Gemini reads
  all pages in one call).
- Transcription is verbatim: original wording/spelling/line breaks preserved,
  unreadable words → `[?]`, illegible passages → `[illegible]`.
- Output: on-screen (combined or per-page), copy, and download as `.md` / `.txt`.
- Nothing is persisted anywhere — files and text live only for the request.
