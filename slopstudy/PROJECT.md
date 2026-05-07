# CaseGen — Project Notes

## What It Is

CaseGen is a slot-machine web app that generates IB Business Management Unit 3 Finance case studies. Students spin reels to randomly select a scenario (companies, products, locations) and theory terms, then click a button to generate a short case study and exam-style questions via AI.

The intended use is classroom practice — a quick way to produce varied, unpredictable case studies that students can analyse and answer questions on, without the teacher having to write them from scratch. The surreal word sets make it more engaging; the realistic sets make it more exam-like.

## Intended Audience

IB BM students and teachers. The tool lives at `samsmasm.github.io/casegen` and requires no login.

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | Single `index.html` — Tailwind CSS CDN, vanilla JS |
| Hosting | GitHub Pages |
| API proxy | Cloudflare Worker (`casegen.samgetsstuffdone.workers.dev`) |
| AI routing | Cloudflare AI Gateway |
| AI model | Anthropic Claude (`claude-haiku-4-5-20251001`) |
| API key storage | Cloudflare Worker secret (`CASEGEN_KEY`) |

## Features

- **Style toggle** — Surreal or Mostly Realistic word sets, each with 40 companies, 40 products, 40 locations
- **Theory checkboxes** — draw theory terms from 3.1–3.3, 3.4–3.9, or both
- **Sliders** — Companies (1–3), Products (1–2), Locations (1–2), Questions (3–6)
- **Slot machine animation** — staggered ease-out spin with lock-in effect per cell
- **Per-cell reroll** — click any locked cell to re-spin just that one
- **Per-cell custom entry** — long-press any locked cell to type your own word
- **60-second spin cooldown** — prevents rapid API hammering
- **AI generation** — sends prompt + system instruction to Claude via Worker, renders output as an IB exam paper
- **Copy buttons** — copy prompt or output to clipboard

## Word Lists

Stored in `wordlist.md`. Three categories each for surreal and realistic styles, plus two theory pools (3.1–3.3 and 3.4–3.9). The theory terms need auditing against the actual IB BM syllabus — some may not be official terminology.

## Prompt Design

The prompt is built client-side from the selected words and slider values, then sent to the Worker. Key design decisions:

- The theory terms are declared in the prompt *before* the case study is written, so the model can plant relevant data in the narrative
- The case study is instructed to read as a narrative with a backstory and a challenge, not a financial report
- Financial figures should appear where the story calls for them, not as a bullet list
- The questions instruction says "draw directly on the case study you just wrote" to reinforce coherence
- Model is told: no em dashes, no mid-sentence bolding

Both the case and questions are generated in a single API call (sequential in one response), so the questions always have the case in context when they are written.

---

## Cloudflare Workers + Anthropic API: What We Learned

This section documents the full debugging journey so the same mistakes are not repeated in future projects.

### The Goal

Keep the API key off the frontend (never in client-side JS). Use a Cloudflare Worker as a thin proxy: the browser posts a prompt to the Worker, the Worker adds the API key and forwards to the AI provider, the Worker returns the response.

### Attempt 1: Gemini (abandoned)

Initially used the Gemini API (`generativelanguage.googleapis.com`). This failed for two reasons:

1. **Vietnam geographic restriction.** Gemini blocks API calls originating from Vietnam, both directly and via Cloudflare Workers running on Vietnamese edge nodes. Most newer Gemini models returned "User location is not supported". Only `gemini-2.0-flash` worked, but it had a 20 requests/day free limit.
2. **Quota is per project, not per key.** Creating a new API key in the same Google Cloud project did not reset the quota.

### Attempt 2: Anthropic (direct Worker fetch)

Switched to Anthropic (`api.anthropic.com/v1/messages`). The API key was confirmed valid via a local `curl` test from Vietnam — it returned a proper `not_found_error` for a bad model name, not an auth error. So the key works and Anthropic is reachable from Vietnam directly.

However, the Cloudflare Worker's `fetch()` to `api.anthropic.com` consistently returned:

```json
{"error": {"type": "forbidden", "message": "Request not allowed"}}
```

This is **not** Anthropic's standard error format (which wraps errors as `{"type":"error","error":{...}}`). The non-standard format was the clue that this response was not coming from Anthropic itself, but from something intercepting the outbound request — most likely Cloudflare blocking Worker-to-Anthropic traffic from Vietnamese edge nodes.

A debug GET endpoint was added to the Worker to confirm:
- The API key was correctly set (right prefix, right length)
- General outbound `fetch()` worked fine (probe to `httpbin.org` returned 200)
- Only the call to `api.anthropic.com` was blocked

### Fix: Cloudflare AI Gateway

Cloudflare has a product called **AI Gateway** specifically designed to proxy AI API calls. Using it resolved the issue.

**Setup:**
1. Cloudflare dashboard → AI → AI Gateway → Create Gateway (name: `casegen`)
2. Turn off Authenticated Gateway (not needed when only a Worker calls it)
3. Turn off Cache (each prompt should get a fresh response)

**The URL format for Anthropic via AI Gateway:**
```
https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}/anthropic/v1/messages
```

The gateway URL the UI shows by default uses `/compat/chat/completions` (OpenAI-compatible format). For Anthropic's native API, replace that suffix with `/anthropic/v1/messages`.

The Worker sends the same headers as before (`x-api-key`, `anthropic-version`, `Content-Type`). The AI Gateway forwards them through to Anthropic unchanged.

### Model Name Issues

Several model names were tried and failed with `not_found_error`:

- `claude-3-5-haiku-20241022` — does not exist (wrong name format)
- `claude-3-haiku-20240307` — deprecated by 2026

The correct current Haiku model (as of May 2026) is:

```
claude-haiku-4-5-20251001
```

Model names follow the pattern `claude-{family}-{version}-{date}`. Check the Anthropic docs or system context for the current names before assuming an old name still works.

### Final Worker Pattern

```javascript
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS });

    try {
      const body = await request.json();
      const payload = {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: body.systemInstruction,
        messages: [{ role: 'user', content: body.prompt }],
      };
      const upstream = await fetch(
        'https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}/anthropic/v1/messages',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.API_KEY_SECRET_NAME,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await upstream.json();
      return new Response(JSON.stringify(data), {
        status: upstream.status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
  },
};
```

The top-level try/catch is important: if it is missing and the Worker crashes, the browser sees a network error rather than a CORS-headered response, and the actual error message is hidden.

The response text from Claude is at `data.content[0].text`.

### Key Takeaways for Future Projects

1. **Always use Cloudflare AI Gateway, not direct fetch to AI APIs.** Direct Worker-to-Anthropic calls are blocked (at least from Vietnamese edge nodes). The AI Gateway is the intended path.
2. **The AI Gateway URL suffix depends on the provider.** For Anthropic it is `/anthropic/v1/messages`, not the `/compat/chat/completions` default shown in the UI.
3. **Verify model names before deploying.** Old model names get deprecated. Check the current name rather than copying from old code.
4. **Debug with a GET endpoint.** Adding a temporary GET handler that returns the key prefix/length and a probe fetch to a neutral endpoint (`httpbin.org`) quickly isolates whether the issue is the key, outbound connectivity, or something specific to the AI endpoint.
5. **The CORS headers must be present even on error responses.** Wrap the entire handler in try/catch and always return CORS headers, otherwise the browser reports a vague network error instead of the actual problem.
6. **Quota is per Google Cloud project, not per API key.** For Gemini, creating a new key in the same project does not reset limits.
