# CLAUDE.md — Slop Study (CaseGen)

## What this is

**Slop Study** is a slot-machine IB Business Management case study generator. Students spin reels to get random companies/products/locations + theory terms, then generate a case study + exam questions via AI. Used for classroom finance practice (Unit 3).

See `PROJECT.md` for comprehensive documentation including the full debugging history, tech stack, and word lists.

---

## Architecture summary

```
slopstudy/
  index.html      ← single-file frontend (Tailwind CDN + vanilla JS)
  worker.js       ← Cloudflare Worker source (deploy via Cloudflare dashboard)
  wordlist.md     ← all word lists (surreal + realistic) and theory terms
  PROJECT.md      ← full project notes including debugging history
```

---

## Critical: API routing

**Must use Cloudflare AI Gateway, not direct Anthropic fetch.** Direct Worker-to-Anthropic calls are blocked from Vietnamese edge nodes. See `PROJECT.md` for the full story and the exact AI Gateway URL format.

Gateway URL format:
```
https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}/anthropic/v1/messages
```

Note: the `/anthropic/v1/messages` suffix — not the `/compat/chat/completions` default shown in the Cloudflare UI.

---

## Current model

`claude-haiku-4-5-20251001` — verify this is current before deploying changes. Model names change.

---

## Worker secret name

`CASEGEN_KEY` — the Anthropic API key, set as a Cloudflare Worker Secret.

---

## Theory terms

The theory term pools in `wordlist.md` need auditing against the actual IB BM syllabus — some terms may not be official IB terminology. Fix before adding new terms.

---

## Current status

Working. Slot machine UI, per-cell reroll, custom entry, and AI case study generation all functional.

**Known gap:** `wordlist.md` theory terms (sections 3.1-3.3 and 3.4-3.9) were written from memory and have not been cross-checked against the actual IB BM syllabus. Some terms may be non-standard. This should be fixed before any wordlist changes.

**No other known bugs.**
