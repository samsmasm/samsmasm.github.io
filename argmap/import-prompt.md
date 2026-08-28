# Import prompt (not shown in the app)

This is the AI prompt that used to sit behind the Import modal's "Get prompt" tab.

It was deliberately removed from the UI so students build their own maps rather than
having an AI do the reasoning for them. The Import modal still accepts pasted JSON,
but no longer hands out the prompt that generates it.

**This file is reference only.** The app does not read it at runtime (`index.html` is
self-contained by design). To re-enable prompt visibility, restore the `IMPORT_PROMPT`
constant and the two-tab modal UI, both of which are in git history before the commit
that added this file.

---

```text
Analyse the following text and extract its argument structure as JSON.

Return ONLY valid JSON -- no explanation, no markdown code fences. Do not use em dashes in any text fields; use a plain hyphen or rewrite the phrase instead.

Schema:
{
  "title": "short descriptive title",
  "nodes": [
    { "id": 1, "type": "contention", "text": "...", "parentId": null },
    { "id": 2, "type": "reason",     "text": "...", "parentId": 1    }
  ]
}

Node type rules:
  contention — the central claim or thesis. Exactly one. parentId must be null.
  reason     — supports its parent (a contention or another reason).
  objection  — challenges its parent (a contention or reason).
  rebuttal   — defends against its parent objection.
  evidence   — empirical grounding for its parent. Add optional "source": "Author (Year) — title".

Every node needs: id (unique integer), type, text (1–2 sentences), parentId (integer or null).

Text to analyse:
[PASTE YOUR TEXT HERE]
```
