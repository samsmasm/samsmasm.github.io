# Project Brief: Marking Transcription Site ("Sayso")

> **The sections below are the ORIGINAL brief.** Read the status block first —
> the app is built and live; the brief is kept for design intent/context.

## Implementation status (updated 2026-07-30)

- **Live and deployed** at **https://unisam.nz/sayso** — a single Cloudflare
  Worker (`sayso`) serves the frontend (`public/`) and the API (`/api/*`). The
  rest of unisam.nz stays on GitHub Pages. Source lives in this folder inside the
  `samsmasm.github.io` repo; the running app is the deployed Worker, not Pages.
- **Serving under `/sayso`:** `wrangler.jsonc` routes `unisam.nz/sayso` +
  `/sayso/*` to the Worker; `assets.run_worker_first: true` is REQUIRED so the
  asset layer doesn't bypass the Worker's prefix-stripping. Frontend uses
  relative paths; the HTML shell is served `no-cache`; every CSS/JS URL carries a
  `?v=N` cache-buster — **bump N on every frontend change**.
- **Model:** `gpt-transcribe` ($0.0045/min). Multi-speaker requests instead use
  `gpt-4o-transcribe-diarize` ($0.006/min, `diarized_json` → "Speaker N:" text).
- **Secrets/bindings:** KV `SAYSO_KV`; secrets `OPENAI_API_KEY`, `SITE_PASSWORD`
  (the single shared login), `SESSION_SECRET` (signs the session cookie).
- **Built beyond the brief:** per-block delete → collapsible "Deleted sections"
  (24h purge); "Multiple speakers" setting; distance-based swipe-to-send with
  drag/fly-away/grow-back animation; running **cost estimate** (audio time × rate,
  per model, persisted in localStorage, resettable); **session restore on reload**
  (last session reopened from KV for the retention period).
- **Known operational note:** the Worker runs at the Cloudflare edge nearest the
  user, so from an OpenAI-geo-blocked region transcription fails — the owner uses
  a **NZ VPN** to relocate the edge. No simple Worker egress-region pin exists.
- **Owner TODO:** hard OpenAI spend cap; remove leftover `sayso.unisam.nz`
  custom-domain subdomain (dashboard → Workers & Pages → sayso → Domains & Routes).

## 1. Purpose

A personal, password-protected web app for transcribing spoken audio using OpenAI's `gpt-transcribe` API, built for two specific workflows:

1. **Live recording** — dictating short spoken comments (e.g. marking student work aloud) directly into the site via microphone, with names spoken only at the start of each student's section and comments attributed by sequence order.
2. **File upload** — uploading pre-recorded audio files (e.g. phone voice memos) for transcription, with automatic chunking for files over the API's size limit.

The site is for a single user (the owner). It is not a multi-tenant product. Security is important because the OpenAI API costs real money per use, and the password gate must not be trivially bypassable.

---

## 2. Tech Stack

- **Backend:** Cloudflare Worker
  - Holds the OpenAI API key as a Worker secret (`OPENAI_API_KEY`) — never exposed to the client.
  - Handles all calls to `gpt-transcribe`.
  - Enforces password protection on every request.
  - Enforces rate limiting.
- **Storage:** Cloudflare KV (or D1 if relational queries become useful later — KV is sufficient for this use case and simpler to start with).
- **Frontend:** Static site served via Cloudflare Pages (or Worker static assets), plain HTML/CSS/JS — no build-heavy framework required, but React is fine if it speeds up development in Claude Code.
- **Client-side audio splitting (file upload only):** ffmpeg.wasm, for splitting oversized files into sub-25MB chunks before upload.
- **Auth:** Custom password-check pattern implemented directly in the Cloudflare Worker (same pattern the user has used on a previous personal site) — not Cloudflare Access. A shared secret/password is checked on every request to protected routes; on success, issue a signed session cookie or token so the user isn't re-entering the password on every single API call.

---

## 3. Security Requirements

- All Worker endpoints (except the login/auth endpoint itself) must require a valid session before doing anything that costs money (i.e., before calling the OpenAI API).
- The OpenAI API key must live only as a Worker secret, never sent to or accessible from the client.
- Rate limiting on the transcription endpoint (Cloudflare's built-in rate limiting, e.g. capped requests per minute per session) as a backstop against runaway costs from a bug or leaked session.
- The user will separately set a hard spend cap in their OpenAI account dashboard — no action needed in code for this, but worth a comment in the README reminding them.
- No audio is ever written to Worker storage or KV/D1. Only text transcripts are persisted.
- Audio captured during live recording is held in browser memory (a JS variable/array buffer) only, and only until that segment's transcript is successfully returned — then discarded. It must never be written to localStorage, IndexedDB, or any other persistent client-side storage, and never uploaded anywhere except the one-time POST to the Worker for transcription.

---

## 4. Data Model

Store transcripts in KV with a structure roughly like:

```
Key: session:{sessionId}
Value: {
  sessionId: string,
  createdAt: ISO timestamp,
  type: "live" | "upload",
  segments: [
    {
      sequence: number,
      text: string,
      capturedAt: ISO timestamp,
      status: "complete" | "failed"
    },
    ...
  ],
  fullText: string  // segments concatenated in sequence order, paragraph-separated
}
```

- `sequence` is assigned at the moment a segment is **captured** (recording closed), not when its transcription API call resolves. This guarantees correct ordering even if API responses return out of order.
- Each KV entry should have a TTL (time-to-live) set based on the user-configured retention period (see Section 8), so old sessions auto-expire without needing a manual cleanup job.

---

## 5. Page 1: Live Recording

### 5.1 Layout
- A single primary record control (large, thumb-friendly — this will be used one-handed while marking papers).
- A live-updating transcript panel below/beside it, showing each segment's text as it returns, in order.
- A settings panel or gear icon exposing: mode toggle (Hold / Auto), silence threshold slider, retention days field.
- A small status indicator per segment: "recording…", "sending…", "✓ done", or "✗ failed — retry" (with a retry button that resends just that segment's buffered audio).
- A "Copy all" button that copies the full reassembled `fullText` block to the clipboard.

### 5.2 Mode 1: Hold to Record

State machine:
- **Idle** → press and hold the button → **Recording**
- **Recording** → lift finger → **Paused** (segment stays open, not sent)
- **Paused** → press and hold again → **Recording** (resumes into the *same* segment — audio is appended, not restarted)
- **Recording** → flick the button upward (a drag/swipe gesture, distinct from a simple lift) → **Sending** (segment closes and is sent immediately; this works as a direct continuous motion out of the initial press, no need to lift first)
- **Paused** → flick the button upward → **Sending** (segment closes with whatever audio has been captured so far, and sends)
- **Sending** → **Idle** (ready for the next segment; button resets to its default state)

Implementation notes:
- "Flick upward" should be implemented as a drag gesture with a vertical distance/velocity threshold on both touch and pointer events, so it works on mobile (primary use case) and trackpad/mouse (secondary, for testing on laptop).
- A "lift" (pointerup/touchend without meeting the flick threshold) is a pause, not a send — this distinction must be reliable. Suggest requiring the flick to cross a clear vertical pixel threshold (e.g. 60-80px) within a short time window to avoid accidental sends from a normal lift.
- While paused, the accumulating audio blob for that segment must persist in memory (not reset) so that resuming appends rather than starting over.

### 5.3 Mode 2: Auto

State machine:
- **Idle** → press Record → **Recording** (silence timer starts, using the current threshold setting, default range 2–15s)
- **Recording**, silence detected for the full threshold duration → auto-**Sending** → **Idle**
- **Recording** → press the same button again → **Paused** (silence timer cancelled, nothing sent, audio buffer retained)
- **Paused** → press the same button again → **Recording** (resumes into the same segment, timer re-arms)
- **Recording** → press separate **Send** button → **Sending** immediately, skipping the silence wait → **Idle**
- **Paused** → press **Send** button → **Sending** with whatever was captured → **Idle**

Implementation notes:
- Only two controls needed: one toggling Record/Pause button, and one separate Send button.
- Voice Activity Detection (VAD) for the silence timer can use the Web Audio API's `AnalyserNode` to monitor input amplitude — trigger the silence countdown when amplitude drops below a threshold, cancel/reset the countdown if amplitude rises again before the threshold elapses.
- The silence threshold value (2–15 seconds, adjustable via a slider in settings) should be stored client-side (e.g. in a simple settings object, persisted via a cookie or a KV-backed user-settings record) so it doesn't reset between sessions.

### 5.4 Segment Send & Transcription Flow (both modes)

1. On segment close (however triggered), the buffered audio blob is assigned the next sequence number and immediately POSTed to the Worker's `/transcribe-segment` endpoint, along with the session ID and sequence number.
2. The Worker calls `gpt-transcribe` (via `/v1/audio/transcriptions`) with:
   - The audio file
   - `prompt`: a consistent context string, e.g. *"Teacher feedback comments on student coursework, spoken aloud. Student names are said only at the start of a new student's section."*
   - Response format: plain text or JSON (text is simplest).
3. On success, the Worker appends the segment's text to the session's KV record at the correct `sequence` position (not necessarily at the end of the array — insert/sort by sequence, since responses can return out of order) and returns the transcript text to the client.
4. The client appends the returned text to the on-screen transcript panel, in the correct sequence position, and marks that segment "✓ done".
5. On failure (network error, API error), mark the segment "✗ failed" with a retry button. The audio blob for a failed segment stays in memory (not discarded) until either a successful retry or the user navigates away.
6. Once a segment is confirmed successful, its audio blob is discarded from memory immediately.
7. The Worker maintains and returns an up-to-date `fullText` (all received segments concatenated in sequence order, separated by a blank line/paragraph break) so the "Copy all" button always has the latest complete text, even with segments still in flight.

---

## 6. Page 2: File Upload

### 6.1 Layout
- File picker / drag-and-drop zone, accepting common phone-recorded formats (m4a, mp3, wav, mp4, webm — matching the formats `gpt-transcribe` supports).
- Progress indicator per chunk if a file needs splitting.
- Same live-updating transcript panel pattern as Page 1, with a "Copy all" button.

### 6.2 Chunking Logic
- OpenAI's file upload limit is 25MB per request. Files under this go straight through.
- Files over 25MB are split **client-side in the browser** using ffmpeg.wasm before upload — this avoids uploading a large file to the Worker only to have the Worker re-split and re-upload it, which would double data transfer and risk hitting Cloudflare Worker request-size/CPU-time limits.
- Split target: chunks comfortably under 25MB (e.g. aim for ~20MB to leave margin), and where feasible, split at detected silence gaps rather than a fixed byte offset, to avoid cutting mid-sentence.
- Chunks are sent to the Worker in sequence, each with `sequence` assigned by chunk order.
- Each chunk's `prompt` parameter includes the transcript text of the previous chunk (or the last ~200 words of it) as context, to help the model carry continuity across the artificial split point.
- Once all chunks return, concatenate transcripts in order into the session's `fullText`, same as the live-recording flow.

---

## 7. Reassembly & Output

- Regardless of source (live recording or file upload), the end product the user actually wants is a single, ordered block of text — `fullText` — suitable for copy-pasting into another LLM.
- No per-segment labeling or student-name detection is needed; order alone carries the meaning (names appear only where spoken, and everything until the next name belongs to the same student).
- Provide a single "Copy all" action, plus (nice-to-have, not required for v1) a way to view/copy individual segments if the user wants to check or redo one specific bit.

---

## 8. Settings

Exposed on both pages (or a shared settings panel):

- **Silence threshold** (Auto mode only): slider, range 2–15 seconds, default 5 seconds.
- **Retention period**: numeric input (days), default 14. Used to set the TTL on new KV session records at time of creation. Changing this setting should only affect new sessions going forward, not retroactively alter TTLs on already-stored sessions (simplest to implement; can revisit if the user wants retroactive changes later).

Settings should persist across visits — simplest approach is a small settings record in KV keyed to the user's session/device, or a long-lived cookie if a single fixed value is acceptable.

---

## 9. Non-Goals / Explicitly Out of Scope for v1

- No multi-user support, no user accounts beyond the single shared password.
- No speaker diarization.
- No word-level timestamps.
- No permanent audio storage or audio download feature.
- No real-time/streaming word-by-word transcription — every segment is sent as a complete file and transcribed as a whole (this is the cheaper `gpt-transcribe` file-transcription flow, not the more expensive Realtime/streaming API).
- No automatic student-name extraction or structuring of output — the user will feed the plain reassembled text into a separate LLM for that.

---

## 10. Suggested Build Order

1. Worker skeleton with password-gated session auth.
2. `/transcribe-segment` endpoint calling `gpt-transcribe`, tested with a hardcoded test audio file via curl/Postman before any frontend exists.
3. KV session storage with TTL based on retention setting.
4. Live Recording page: Auto mode first (simpler state machine), then Hold mode.
5. Live transcript panel + Copy all.
6. File Upload page with ffmpeg.wasm chunking.
7. Settings panel (silence threshold, retention days) wired to persisted values.
8. Rate limiting + final security pass.

---

## 11. Open Items for the User to Decide During/After Build

- Exact wording of the `prompt` context string sent with each transcription call (a starting suggestion is given in Section 5.4, but this is easy to tune once real output is seen).
- Whether a "view individual segments" mode is worth adding beyond the single "Copy all" block.
- Visual/UI styling — no specific design direction has been given yet; default to something clean and readable, thumb-friendly given the primary use case is one-handed operation while marking papers.

---

## 12. Future development ideas (not yet built)

### Accounts with usage allowances + a shared "guest" account

Goal: move beyond the single shared password so the owner can (a) hand out
accounts that each get a set free allowance (e.g. 1 hour, or 30 min, one-off),
and/or (b) run a shared "guest" account for other people that **caps at, say,
20 min per day** — and the owner must be able to **see how much each account is
actually using**.

This stays within the existing Worker + KV stack (no Firebase needed).

**Approach sketch:**

- **Users store (KV):** `user:{username}` → `{ passwordHash, role: "owner"|"user",
  quotaType: "oneoff"|"daily", quotaSeconds }`. Keep a `users:index` key (array of
  usernames) so the admin view can enumerate them.
- **Auth:** extend the current login to take username + password; the existing
  HMAC-signed session cookie just carries `username` instead of nothing. Minimal
  change to the current scheme in `worker.js`.
- **Usage counters (KV):**
  - Daily cap: `usage:{username}:{YYYY-MM-DD}` (seconds used today, TTL ~2 days).
  - One-off allowance: `usage:{username}:total` (seconds used lifetime).
  - Increment by the request's audio duration on each successful transcription;
    **reject at `/transcribe` when over quota** (check before calling OpenAI so
    an over-quota user can't spend money).

- **⚠️ The key technical gap — authoritative duration.** Quotas must be enforced
  **server-side**; the current cost estimate uses a *client-reported* duration
  (see `record.js` / `upload.js` → `addUsage`), which is display-only and easily
  spoofed. The Worker does **not** currently measure audio length. Before building
  quotas, decide how the Worker gets a trustworthy duration per request. Options:
  - Request a `response_format` that returns duration (whisper `verbose_json` has
    a `duration` field; `diarized_json` segments carry `end` times you can `max()`).
    Confirm what `gpt-transcribe` exposes — may need a format change or a probe.
  - Derive from the response `usage` (audio tokens → seconds) if provided.
  - Fallback: trust client-reported seconds but treat as advisory only (not
    suitable for a hard cap).

- **Owner visibility:** an owner-only `GET /api/usage` that reads the `usage:*`
  keys (via `SAYSO_KV.list({ prefix: "usage:" })`) and returns per-user totals;
  render a small admin panel. Gate it behind `role === "owner"` on the session.

- **Simplest first step:** just add ONE extra "guest" account with
  `quotaType: "daily"`, `quotaSeconds: 1200` (20 min). That exercises the whole
  path (accounts, per-day counter, enforcement, admin readout) before generalising
  to arbitrary per-user allowances.
