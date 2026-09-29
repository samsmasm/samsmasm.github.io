# CLAUDE.md: /ai (How I Use AI)

## What this is

Sam's public statement on how they use AI as a teacher, at `unisam.nz/ai`. It exists for **transparency** with students, parents and colleagues, so it is deliberately prominent: linked from the homepage **top nav** ("How I use AI") and the **footer** ("all vibe coded (how I use AI)"). Do not demote or remove those links to tidy the menu.

Styled like `/privacy.html`: watercolour header, `/unisamsq.png` logo, Georgia headings, purple `#4a1a7a` accents. Follows `AESTHETIC.md`.

---

## Structure

```
ai/
  index.html        ← landing page: two cards, "Click on me" or "Read my full statement"
                       also forwards old hash links (/ai#data-protection → /ai/full/#data-protection)
  full/index.html   ← the full statement (Sam's own words, verbatim) with a contents box
  me/index.html     ← "Click on me" bobblehead page (hand-written HTML/CSS/JS + generated SVG)
  me/faqs.js        ← all bobblehead question/answer text (edit this for text changes)
  me/build.py       ← generates the bobblehead SVG and injects it into me/index.html
  me/id.jpg         ← small, metadata-stripped copy of Sam's photo for the ID card
  me-thumb.jpg      ← landing-page thumbnail (screenshot of the figure)
  gym.jpg           ← ChatGPT-made robot-at-the-gym cartoon used in the statement
```

Every page loads GoatCounter (`samsmasm.goatcounter.com`) before `</body>`. Keep it on any new page.

### Files that must never be committed

These sit untracked in `ai/` on Sam's machine. Never `git add` them, and never use `git add -A` or `git add ai/`:

- `me.jpg`: original selfie with **GPS EXIF data**
- `id.jpg` (in `ai/`, not `ai/me/`): Sam's original headshot
- `bobble-*.png`, `bobble.py`: the three style mockups (Sam chose ink-and-wash)

Add files by explicit path.

---

## Text rules

- **The full statement is Sam's own words, word for word.** Never edit it silently. If something looks like a typo, list it for Sam to accept or reject. Some are deliberate: "what I hope for for my students" is correct grammar.
- Never use em dashes anywhere (Sam's rule). The statement uses spaced hyphens (" - ") and they stay.
- The bobblehead FAQs are **AI-adapted** from the statement, first person in Sam's voice, and the page says so ("These short answers are AI-adapted from my full statement"). Keep that label.
- Emphasise the **iterative back-and-forth**: Sam never asks for something and hands it straight to students, and it often takes as long as doing it alone.

### Section anchors

`full/index.html` headings have ids (slugs, e.g. `data-protection`, `whats-left-when-ai-is-better-than-me`). The contents box and each FAQ's `more` field link to them. If a heading changes, update its `id`, the contents box entry, and any `more` values in `me/faqs.js` that point to it.

---

## The bobblehead (`/ai/me`)

### Editing text

Edit `me/faqs.js` only; no build step needed.
- `FAQS[item]` is an array, so one clickable thing can hold several questions (the ID card has two).
- `a` is a list of paragraphs. Wrap a glossary word as `{{iterative}}` to make a pop-up; definitions live in `GLOSSARY`.
- `chat` + `rounds` (laptop only) replays the deadweight-loss conversation line by line.
- `more` is the anchor in the full statement for "Read the full statement →".
- `ORDER` sets the order of the plain "All the questions" list.

### Editing the drawing

Never hand-edit the SVG inside `me/index.html`. Edit `me/build.py`, then run:

```
python3 ai/me/build.py
```

It replaces everything between `<!--FIGURE-->` and `<!--/FIGURE-->`. Coordinates are in a 1000 × 1010 viewBox, figure centred on x = 500.

**Ink-and-wash technique.** `part()` renders each piece three times:
1. `.lines`: wobbly ink outlines (`#wobble` filter), every fill forced to paper colour so it hides what's behind
2. `.fills`: the same shapes offset (6,4), outlines removed, displaced (`#wash` filter), `mix-blend-mode: multiply`
3. `.tops`: only elements with class `solo`, drawn crisp on top

Use `class="solo"` for anything that must stay sharp and uncoloured by the wash: eyes, mouth, the ID photo, phone and laptop screens, small details. Without it they get buried under the multiply layer and look dark.

**Clickable items** (`part(svg, item_id, aria_label)` makes a `.hot` group, `id="hot-<item>"`):

| item | thing | question |
|---|---|---|
| `pen` | red pen in shirt pocket | Does AI mark my work? |
| `phone` | phone in left hand | Is my feedback written by AI? |
| `id` | ID card on rope | Does AI know who I am? + classroom tools data |
| `laptop` | laptop on books | Did AI make our slides and resources? (chat replay) |
| `magnifier` | magnifying glass | Can I trust them? |
| `clipboard` | clipboard | Does AI plan our lessons? |
| `envelope` | envelope | Are your emails written by AI? |
| `dumbbell` | dumbbell in right hand | Why is it OK for you to use AI...? |
| `controller` | game controller | Isn't that just lazy? |
| `head` | the head | Is AI making you worse at your job? |
| `heart` | heart pin on shirt (separate from the ID rope) | What are teachers for? |

To add an item: draw it in `build.py`, add it to `figure()` with `part(..., "newid", "Question?")`, add `FAQS.newid` and put it in `ORDER` in `faqs.js`, then rebuild.

**Appearance spec (from Sam):** ink-and-wash style; blond hair slightly parted then swept (flattened by `HAIR_SQUASH`, so not bouffant); round black glasses; green eyes; light stubble; longish face; light yellow untucked short-sleeved collared shirt with sleeves covering the upper arms; dark blue trousers; light blue rope lanyard; dark blue ID card with Sam's real photo.

### Behaviour (JS in `me/index.html`)

- A random `.hot` part flashes (scale + gold glow) every 1.8 s, and parts grow on hover or focus. Both are skipped under `prefers-reduced-motion`.
- The head bobbles idly and nudges when something is clicked.
- **Easter egg:** drag the head sideways (clamped to ±50°) and it springs back with a damped boing. A tap without drag (< 8 px) opens the head's question instead.
- **Android Chrome gotcha:** Chrome ignores `touch-action` on SVG child elements, grabs the drag to scroll, then fires `pointercancel`. The fix is non-passive `touchstart`/`touchmove` listeners on `#hot-head` that call `preventDefault()`. Keep them.
- Parts are keyboard-focusable (`tabindex`, `role="button"`, Enter/Space), and the plain question list below the figure gives the same answers without the figure.

### After changing the drawing

Regenerate the landing thumbnail: serve the repo, screenshot `/ai/me/` at 1200 × 900, and crop the figure (at that size it sits at 513 × 519 + 94 + 254), resized to 440 px wide → `ai/me-thumb.jpg`. Then bump the `?v=` number on its `src` in `ai/index.html`: images are cached for 4 hours, so without it people keep seeing the old picture.

---

## Testing

- Serve the repo root (`python3 -m http.server`) and use headless Chrome for screenshots.
- For interaction tests, use puppeteer-core with the system Chrome (`/usr/bin/google-chrome`). Test touch with CDP `Input.dispatchTouchEvent` on an emulated Android viewport; that reproduces the `pointercancel` bug if the touch fix is ever removed.
- Headless screenshots of `#anchor` URLs are unreliable (smooth scroll / blank frames). Check that anchor targets exist instead.
