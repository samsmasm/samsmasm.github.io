# Plainspeak — deployment

The frontend (`index.html`) is served by GitHub Pages at `unisam.nz/moderntranslation/`.
The Worker (`cloudflare-worker.js`) gates that path and proxies the Claude + Gemini APIs.

## 1. Deploy the Worker

Deploy `cloudflare-worker.js` to a Cloudflare Worker and route it at:

```
unisam.nz/moderntranslation/*
```

The zone must be proxied (orange-cloud) so the Worker sits in front of GitHub Pages.

## 2. Set the secrets

```
wrangler secret put SITE_PASSWORD       # the shared password
wrangler secret put AUTH_SECRET         # any long random string
wrangler secret put ANTHROPIC_API_KEY   # Claude API key
wrangler secret put GEMINI_API_KEY      # Gemini API key
```

(Or set them in the Cloudflare dashboard under the Worker's Settings → Variables.)

## 3. How it works

- `POST /moderntranslation/login` — checks the password, sets a signed `mtauth` cookie.
- `POST /moderntranslation/api/translate` — body `{ system, user, max_tokens? }`, returns `{ text }` (raw Claude text; the frontend parses the JSON inside it).
- `POST /moderntranslation/api/verify` — body `{ prompt }`, returns `{ text }` (raw Gemini text).
- Everything else: passes through to GitHub Pages if the cookie is valid, otherwise shows the login page.

The Worker is a thin pass-through: all prompt construction and orchestration lives in
`index.html`, so prompts can be iterated without redeploying the Worker.

## Models

- Translation: `claude-sonnet-4-6`
- Verification: `gemini-3-flash-preview`

Change these at the top of `cloudflare-worker.js` if needed.
