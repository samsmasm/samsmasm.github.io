# Modern Translation — Classic Text Modernizer

## What this is

A password-gated web app that takes a classic text (Mill, Smith, Burke, etc. — dense,
older-style English) and translates it sentence-by-sentence into plain modern English at
a chosen reading level, while preserving every idea and the original order of ideas. This
is **translation, not summarization or commentary**. A second model (Gemini) checks each
translated paragraph against its original and flags — but does not fix — anything where
meaning may have drifted.

The user pastes text or uploads a PDF, picks a reading level and an effort level, runs the
job, watches paragraphs translate progressively, reviews/edits/regenerates flagged ones,
and downloads the final result as Markdown or plain text.

This is a personal tool for one user (Sam), gated the same way as the other unisam.nz
tools. It does not need to handle multiple concurrent users or accounts.

## Before writing any code

Three existing projects already solve pieces of this. **Read their actual implementation
files rather than guessing at the pattern** — these notes describe intent, not exact code:

- **wc26** (World Cup 2026 sweepstake site) — reuse its password-gate mechanism exactly.
  Find and read the actual gate implementation (likely a simple client-side check against
  a hash, or a Worker-side check — confirm which).
- **econnews** — reuse the same pattern for calling the Claude API through the
  `api.unisam.nz` Cloudflare Worker proxy (keeps the Anthropic API key server-side, never
  exposed to the client). Read the existing Worker route(s) and replicate the auth/request
  pattern rather than re-architecting it.
- **typeit** — reuse the same pattern for calling the Gemini API through its existing
  worker. Confirm which Gemini model it currently calls (this matters for cost — Flash or
  Flash-Lite tier is right for this verification task; Gemini Pro would be overkill).

If `api.unisam.nz` can be extended with new routes for this project, prefer that over
spinning up a separate Worker, for consistency with the rest of the site. Use judgment
based on how the existing Worker is structured.

## Architecture

- **Frontend**: static site (GitHub Pages, `unisam.nz` subpath or its own page), vanilla
  HTML/CSS/JS to match the rest of the site's tooling — no build step needed unless the
  existing site conventions say otherwise. Match the site's existing visual language
  (horizontal tab nav, Georgia wordmark, the pastel gradient header) loosely, but
  functionality comes first — polish the look once the pipeline works.
- **Backend**: Cloudflare Worker(s) as a thin proxy to the Claude API and the Gemini API.
  The Worker holds the API keys; the frontend never sees them. The Worker should be mostly
  a pass-through (forward the constructed prompt, return the response) — prompt
  construction and orchestration logic lives in the frontend JS, so it's easy to iterate
  on without redeploying a Worker every time the prompt changes.
- **No database, no persistent storage.** Everything lives in browser memory for the
  session. If the page is closed mid-job, the work is lost — that's an acceptable
  tradeoff for v1 given this is a single-user tool. (Could add `window.storage` later if
  that becomes annoying.)

## User flow

1. User authenticates via the password gate (wc26 mechanism).
2. User either pastes text into a textarea, or uploads a PDF (extracted client-side —
   see "Input handling" below).
3. User sets two controls:
   - **Reading level** slider, integer 8–18, default **8**.
   - **Effort level**: High / Standard / Low (controls chunk size — see "Chunking").
4. User clicks "Translate."
5. The app splits the text into paragraphs, builds chunks, then runs the translation loop
   (see "Processing pipeline"). Paragraphs appear on screen progressively as they
   complete, with a visible progress indicator (e.g. "paragraph 14 of 62").
6. As each chunk's translation returns, a non-blocking call to Gemini checks it against
   the original. Any paragraph Gemini flags gets visibly highlighted with its comment
   shown inline.
7. Once everything completes, the user reviews the full document:
   - Flagged paragraphs are visually distinct (e.g. highlighted background).
   - Every paragraph's translated text is directly editable in place.
   - Every paragraph has a "Regenerate" button.
8. User downloads the final document as `.md` or `.txt`.

## Input handling

Two input methods, both producing the same internal representation: an ordered array of
plain-text paragraphs.

- **Paste**: a textarea. Split on blank lines / double newlines into paragraphs. Trim
  whitespace. No further cleanup pass needed — assume pasted text is reasonably clean,
  since the user is supplying it deliberately rather than this being raw OCR output.
- **PDF upload**: extract text client-side using a JS PDF library (e.g. `pdf.js`). After
  extraction, run a cheap **non-AI** cleanup pass before chunking:
  - Strip likely headers/footers/page numbers (repeated short lines appearing on many
    pages, or lines matching `^\d+$`).
  - De-hyphenate words broken across line ends (`exam-\nple` → `example`).
  - Collapse single newlines within a paragraph into spaces, but preserve blank-line
    paragraph breaks.
  - This is plain string processing, no API call, and should run fast even on a full book.
  - No AI cleanup pass on top of this for now — if extraction quality turns out to be bad
    in practice, that's a v2 addition, not a v1 requirement.

No chapter/section detection. No "supplementary instructions" box. The user is expected to
paste or upload exactly the portion of text they want translated.

## Reading level

Single integer parameter (8–18, default 8), inserted into the system prompt as a
description of the target reader, e.g. "Translate for a curious 8 year old reader: simple,
direct words, short sentences, but never dumbed-down ideas."

At low reading levels (roughly 8–11), some source vocabulary has no true one-word modern
equivalent (e.g. "tyranny," "constitutional checks"). Allow the model to use a brief
inline gloss in these cases — e.g. *"tyranny (cruel, unfair rule)"* — rather than either
silently losing meaning or leaving in a word the target reader won't know. This should be
stated explicitly in the system prompt as a permitted technique, not a default behavior —
it should be the exception, used only when a simpler one-word substitute would lose real
meaning.

## Chunking

**Chunks are built by minimum length, not by a fixed paragraph count.** Paragraphs are
never split across chunks and never split internally during chunking (a single very long
source paragraph is its own chunk even if it exceeds the target). Short paragraphs are
grouped together until the chunk reaches a minimum word count, so a handful of short
paragraphs (e.g. dialogue-style or transitional one-liners) don't each burn a full API
call's worth of fixed overhead.

Effort level sets the target minimum chunk size:

| Effort   | Target minimum chunk size |
|----------|---------------------------|
| High     | ~150 words (≈ one typical paragraph) |
| Standard | ~400 words (≈ 2–3 paragraphs) |
| Low      | ~800 words (≈ 5–6 paragraphs) |

Algorithm:

```
function buildChunks(paragraphs, targetMinWords):
    chunks = []
    current = []
    currentWords = 0

    for paragraph in paragraphs:
        current.append(paragraph)
        currentWords += wordCount(paragraph)
        if currentWords >= targetMinWords:
            chunks.append(current)
            current = []
            currentWords = 0

    if current is not empty:
        if chunks is not empty and currentWords < targetMinWords * 0.5:
            # too small to justify its own call — merge into the previous chunk
            chunks[last].extend(current)
        else:
            chunks.append(current)

    return chunks
```

This also naturally handles a short overall input (e.g. a single short passage): if the
whole text is under the target, it just becomes one chunk, one call.

**Note:** this chunking is only for the *initial bulk pass*. Regeneration (see below)
always operates at single-paragraph granularity regardless of how chunks were originally
grouped.

## Processing pipeline (initial translation pass)

Chunks must be processed **sequentially**, not in parallel, because each call depends on
the rolling summary and previous paragraph produced by the call before it.

For each chunk, the frontend sends to the Claude Worker route:

- **System prompt** (constructed once, reused for every call — see "System prompt" below)
- **Book/work summary** — a short fixed description of the work as a whole. For v1 this
  can be a simple text field the user fills in once before starting (e.g. "Mill's On
  Liberty, defending individual freedom against social and political control"), defaulting
  to blank if not supplied.
- **Rolling summary so far** — starts empty, updated after every chunk (see below).
- **Previous chunk's translated text in full** — empty for the first chunk.
- **Current chunk's original text** — the paragraph(s) being translated now.
- **Reading level** parameter.

Expected response, as structured JSON so the frontend can parse reliably without fragile
string-splitting:

```json
{
  "translation": "the translated text for this chunk, ready to display as-is",
  "rolling_summary": "the FULL updated rolling summary, replacing the previous one"
}
```

`rolling_summary` should be the complete updated summary (not a delta to append), capped
at roughly 400–500 words. Instruct the model in the system prompt to compress and
re-summarize older material as the summary grows, rather than letting it grow unbounded
across a long book.

After the chunk's translation returns:
1. Split the translation back into per-paragraph entries matching the original paragraph
   count for that chunk (the model should preserve paragraph breaks corresponding to the
   input — instruct it to mark paragraph boundaries clearly, e.g. with the same blank-line
   convention, so the frontend can split reliably even if it merged or split sentences
   within a paragraph).
2. Display each paragraph in the UI as it's parsed out.
3. Fire off the Gemini verification call for this chunk's paragraphs (see below) —
   **don't wait for it before starting the next Claude chunk call.** It updates the UI
   asynchronously whenever it returns.

## Verification pass (Gemini)

Runs once per *original paragraph* (not per chunk), as soon as that paragraph's
translation is available. Does not block the main translation loop.

Input to the Gemini Worker route: the original paragraph text and its translation.

The verification prompt should ask Gemini to compare meaning only — not style, not reading
level — and flag genuine losses or distortions, not stylistic preferences. It should
**not** rewrite anything, only flag.

Expected response, structured:

```json
{ "flag": null }
```
or
```json
{ "flag": "LOSES THE FORCE OF 'ASSERT' — ORIGINAL IS A STRONGER CLAIM" }
```

When a flag is present, the frontend displays it appended directly after the paragraph in
square brackets, in capitals, exactly as the comment is returned:

> ...a weapon that could be turned against their own people just as easily as against
> foreign enemies. **[LOSES THE FORCE OF 'ASSERT' — ORIGINAL IS A STRONGER CLAIM]**

The paragraph itself gets a highlighted background (or similar visual treatment) so
flagged paragraphs are obvious at a glance when scanning the finished page.

## Regeneration and manual editing

Each paragraph in the UI has:

- **Direct inline editing** — the translated text is editable (e.g. `contenteditable` or a
  textarea swapped in on click). No API call. Edits just update the in-memory state for
  that paragraph and clear its flag (since the user has taken responsibility for it).
- **A "Regenerate" button** — resends *only that single paragraph* to the Claude Worker
  route, using the same context structure as the main pipeline (rolling summary as it
  stood after the previous paragraph, the previous paragraph's final translated text, and
  this paragraph's original text), requesting a fresh translation. This is always
  single-paragraph, regardless of what chunk it was originally grouped into. Replace the
  displayed translation with the new attempt and re-run the Gemini check on it.

## Data model

Keep it simple — an ordered array of paragraph objects, the source of truth for both
display and export:

```js
{
  id: number,            // stable index
  original: string,
  translation: string,
  flag: string | null,
  edited: boolean
}
```

## Output / download

Two buttons: **Download .md** and **Download .txt**. Both assemble the current state of
all paragraphs' `translation` fields, in order, separated by blank lines. Flags are
**not** included in the downloaded file — they're a review aid for the screen only, not
part of the finished translation. No PDF export for v1.

## System prompt — style guide

This is the core of the translation quality and should be assembled once per session
(reading level gets interpolated in) and sent identically on every Claude call.

> You are translating a classic English text into modern, accessible English for a reader
> at approximately a {{readingLevel}} year old reading level. This is translation, not
> summarization: every idea in the original must appear in the translation, in the same
> order. Nothing is cut for brevity, and nothing is added that wasn't implied by the
> original.
>
> Principles:
> 1. **Sentence length and structure.** Break long, multi-clause sentences into shorter
>    ones. Where a sentence does several jobs, split it. Use colons to introduce lists or
>    structure rather than long subordinate clauses.
> 2. **Lead with the main idea.** Where the original buries the key point inside a long
>    sentence, restructure so the core claim comes first.
> 3. **Preserve rhetorical force, don't flatten it.** Vivid words and strong claims should
>    usually survive translation, not be softened into something academic or neutral.
> 4. **Metaphors and extended images: keep whole or drop entirely.** Don't modernize a
>    metaphor halfway. If an image needs specialist/classical knowledge to land, drop it.
>    If it's intuitive without context, keep it intact across the whole passage.
> 5. **Avoid anachronism.** Don't impose modern categories or institutions onto historical
>    concepts that don't quite map.
> 6. **No em dashes.** Use commas, periods, or colons instead.
> 7. **Vocabulary: simple, not simplistic.** Strong, precise words are fine if a reader at
>    this level would know them or could infer them from context. Avoid academic register
>    or jargon. At lower reading levels, where a word has no true simple equivalent and a
>    substitute would lose real meaning, you may add a brief inline gloss in parentheses
>    (e.g. "tyranny (cruel, unfair rule)") — use this sparingly, only when needed.
> 8. **Paragraphs may be split** where a single original paragraph is doing too much for
>    the target reading level. Mark new paragraph breaks clearly with a blank line.
>
> You will be given: a short summary of the work as a whole, a rolling summary of
> everything translated so far in this session, the immediately preceding paragraph's
> finished translation (for tone and continuity), and the current passage to translate.
> Respond only with valid JSON: `{"translation": "...", "rolling_summary": "..."}`. The
> rolling_summary field must be the complete, replacement summary (not just what's new),
> kept to roughly 400–500 words by compressing older material as needed.

## Few-shot examples to embed

Include these three pairs in the system prompt as worked examples. They were developed
and approved through manual calibration before this app existed. Note: these were
calibrated at a slightly higher reading level (around 13) than the new default of 8 — they
still demonstrate the mechanics correctly (sentence splitting, metaphor handling, plain
logical sequencing) and are fine as seed examples, but it's worth regenerating a couple of
fresh examples at reading level 8 once the pipeline is running, to keep the few-shot set
matched to the default target reader.

**Example 1 — narrative/historical, Mill, On Liberty:**

Original:
> The struggle between Liberty and Authority is the most conspicuous feature in the
> portions of history with which we are earliest familiar, particularly in that of Greece,
> Rome, and England. But in old times this contest was between subjects, or some classes
> of subjects, and the Government. By liberty, was meant protection against the tyranny of
> the political rulers. The rulers were conceived (except in some of the popular
> governments of Greece) as in a necessarily antagonistic position to the people whom they
> ruled. They consisted of a governing One, or a governing tribe or caste, who derived
> their authority from inheritance or conquest, who, at all events, did not hold it at the
> pleasure of the governed, and whose supremacy men did not venture, perhaps did not
> desire, to contest, whatever precautions might be taken against its oppressive exercise.
> Their power was regarded as necessary, but also as highly dangerous; as a weapon which
> they would attempt to use against their subjects, no less than against external enemies.

Translation:
> Throughout history, the conflict between Liberty and Authority has been one of the most
> important and visible struggles, especially in Greece, Rome, and England. But in earlier
> times, this was a struggle between ordinary people, or certain groups, and their rulers.
> Liberty simply meant protection from those rulers' tyranny. With a few exceptions in
> ancient Greece, rulers were seen as natural enemies of the people they governed. Power
> was held by a single leader, or by a ruling group or class, who got their authority
> through inheritance or conquest. They did not rule because the people chose them, and
> almost nobody dared challenge their power, or perhaps even wanted to. Whatever limits
> people tried to place on how that power was used, the power itself was never really in
> question. Rulers were seen as necessary, but also as dangerous: a weapon that could be
> turned against their own people just as easily as against foreign enemies.

**Example 2 — extended metaphor, Mill, On Liberty:**

Original:
> To prevent the weaker members of the community from being preyed on by innumerable
> vultures, it was needful that there should be an animal of prey stronger than the rest,
> commissioned to keep them down. But as the king of the vultures would be no less bent
> upon preying upon the flock than any of the minor harpies, it was indispensable to be in
> a perpetual attitude of defence against his beak and claws. The aim, therefore, of
> patriots was to set limits to the power which the ruler should be suffered to exercise
> over the community; and this limitation was what they meant by liberty. It was attempted
> in two ways. First, by obtaining a recognition of certain immunities, called political
> liberties or rights, which it was to be regarded as a breach of duty in the ruler to
> infringe, and which, if he did infringe, specific resistance, or general rebellion, was
> held to be justifiable. A second, and generally a later expedient, was the establishment
> of constitutional checks, by which the consent of the community, or of a body of some
> sort, supposed to represent its interests, was made a necessary condition to some of the
> more important acts of the governing power.

Translation:
> To protect the weaker members of society from being picked apart by countless vultures,
> people believed they needed a stronger predator to keep the others in check. But the
> king of the vultures would be just as hungry for prey as the lesser ones, so it was
> vital to stay constantly on guard against his claws too. The goal of those who fought
> for liberty was therefore to set limits on how much power a ruler could have over the
> people. This is what they meant by liberty. They tried to achieve this in two ways. The
> first was to establish certain rights, known as political liberties, which rulers were
> expected to respect. If a ruler broke these rights, resistance or even rebellion was seen
> as justified. The second method, which came later, was to create constitutional checks:
> rules that meant a ruler could not take major decisions without the agreement of the
> community, or of some body representing its interests.

**Example 3 — plain logical sequence, no metaphor, Adam Smith, The Wealth of Nations:**

Original:
> When the division of labour has been once thoroughly established, it is but a very
> small part of a man's wants which the produce of his own labour can supply. He supplies
> the far greater part of them by exchanging that surplus part of the produce of his own
> labour, which is over and above his own consumption, for such parts of the produce of
> other men's labour as he has occasion for. Every man thus lives by exchanging, or
> becomes, in some measure, a merchant, and the society itself grows to be what is
> properly a commercial society.

Translation:
> Once the division of labour is fully established, a person can no longer make
> everything they need by their own work alone. Instead, they get most of what they need
> a different way. They produce more than they use themselves, and they trade that extra
> amount for the things other people have made that they actually need. In this way,
> everyone lives by trading with everyone else. Each person becomes, in a sense, a kind of
> merchant, and society as a whole becomes what we can properly call a commercial society.

## Cost guardrails

Given this sits behind a password but still spends real API credits, add a simple soft
limit: warn (don't hard-block) if the total input exceeds roughly 60,000 words (a full
book's worth), so an accidental huge upload doesn't run unnoticed. No need for anything
more elaborate — this is a single-user tool.

---

## Current status

Fully built and working. Both modes operational: Quick translate (paste/PDF, no persistence) and Projects (whole-book work with IndexedDB per device). Claude translates, Gemini verifies per paragraph.

**Model:** claude-sonnet-4-6 (translation), gemini-3-flash-preview (verification).

**Unresolved:** `ibeconinequality/cloudflare-worker.js` had a hardcoded Anthropic API key that was replaced but the git history was not scrubbed. Deferred.

**No known functional bugs.**

---

## Build order suggestion for Claude Code

1. Password gate (copy wc26's mechanism) and basic page shell.
2. Paste-text input → paragraph splitting → chunking logic (unit-testable without any API
   calls).
3. Claude Worker route + the sequential translation loop, tested on a short pasted
   passage first.
4. Display UI: progressive paragraph rendering, editable text, regenerate button.
5. Gemini Worker route + verification pass + flag highlighting.
6. PDF upload + extraction + cleanup pass.
7. Download buttons.
8. Visual polish to match the rest of unisam.nz.

Test early with a short passage (a page or two), not a whole book, before running
anything at scale.
