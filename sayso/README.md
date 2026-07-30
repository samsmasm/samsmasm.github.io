# Sayso

A personal, password-protected transcription app for marking. One Cloudflare
Worker serves the frontend and a small API; the API proxies OpenAI's
`gpt-transcribe`. See `CLAUDE.md` for the full brief.

- **Record** — dictate short comments; each segment is transcribed on its own.
  - **Hold mode:** press & hold to record, lift to pause (resumes into the same
    segment), flick up to send.
  - **Auto mode:** tap to record; a silence pause auto-sends, or tap **Send**.
- **Upload** — drop an audio file. Files over 25MB are split in the browser with
  ffmpeg.wasm before upload. No audio ever touches the server storage.
- **Copy all** — the reassembled, in-order transcript for pasting into an LLM.

## How it works (security)

- The OpenAI key lives only as a Worker secret — never sent to the browser.
- Every money-spending request needs a valid signed session cookie (HMAC-signed,
  `HttpOnly` / `Secure` / `SameSite=Strict`), issued after the password check.
- `/api/transcribe` is rate-limited per session (25 req / 60s) as a bug backstop.
- No audio is persisted anywhere. Only text transcripts are stored, in KV, with a
  TTL from the retention setting, so they auto-expire.

## Deploy

You need the Cloudflare account this should live on. From this folder:

```bash
# 1. Authenticate wrangler (opens a browser)
npx wrangler login

# 2. Create the KV namespace, then paste the printed id into wrangler.jsonc
#    (replace REPLACE_WITH_KV_ID)
npx wrangler kv namespace create SAYSO_KV

# 3. Set the three secrets
npx wrangler secret put OPENAI_API_KEY   # your OpenAI API key
npx wrangler secret put SITE_PASSWORD    # the login password you'll type
npx wrangler secret put SESSION_SECRET   # any long random string, e.g. `openssl rand -hex 32`

# 4. Deploy
npx wrangler deploy
```

Live at **https://unisam.nz/sayso** — the Worker is routed to that path
(`routes` in `wrangler.jsonc`) while the rest of unisam.nz stays on GitHub Pages.
The Worker serves under the `/sayso` base: it strips that prefix internally, and
the frontend uses relative API paths so everything resolves under `/sayso/`.

## ⚠️ Set an OpenAI spend cap

The rate limit here is only a backstop. **Set a hard monthly spend cap in your
OpenAI account dashboard** (Billing → Limits) so a bug or a leaked session can
never run up an unbounded bill. `gpt-transcribe` is billed by audio duration.

## Local dev

```bash
npx wrangler dev
```

Secrets can be provided locally via a `.dev.vars` file (never commit it):

```
OPENAI_API_KEY=sk-...
SITE_PASSWORD=...
SESSION_SECRET=...
```
