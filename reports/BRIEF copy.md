# Report Comment Generator — Project Brief

Handoff document for Claude Code. Read alongside both HTML files.  
Last updated: 2026-05-29.

---

## 1. What this is

A browser-based tool for teachers to generate end-of-year report comments. The teacher selects traits for each student (disposition, performance, work ethic, optional qualities, next steps) and the app assembles them into a natural-sounding paragraph. All data is stored in `localStorage` with a JSON backup/restore feature.

### Two files

| File | Purpose | localStorage key |
|------|---------|-----------------|
| `report_comments.html` | Stable — in active use for end-of-term reporting | `rcg_v1` |
| `report_comments_experimental.html` | Fork for building the public version | `rcg_exp_v1` (banks: `rcg_banks_exp_v1`) |

The two files are fully isolated — they do not share storage. Both are single self-contained HTML files (~1,500–1,800 lines). No dependencies, no build step.

---

## 2. Current feature set (both files unless noted)

### Setup tab
- **CSV upload** or **paste** — loads student roster, preserves existing traits on re-upload
- **Course preambles** — one textarea per subject present in the loaded CSV (appears before each generated comment, excluded from character count). Only shown after a CSV is loaded.
- **Save & Restore** — exports all state as a `.json` backup file; imports it back

### Students tab
- Sticky left-hand list sorted by block then last name
- Filter pills by block and class
- Click student → trait selection panel on the right
- ★ review flag button on each row (toggles amber)
- Comment preview with live character count and colour-coded bar

### Comments tab
- All students grouped by block; filter pills by block / class / ★ Flagged
- Per-card:
  - ★ review flag (amber when on; name shows inline ★ too)
  - **✏ Edit** button → inline textarea with live char count; **Save** / **Discard**
  - **Original / Edited** version pills (appear after an edit is saved); toggles which version is shown
  - Alt version shown in grey italics `[in brackets]` below the active version
  - **Copy** — copies active version + alt in brackets to clipboard
- **⬇ Export configured** — downloads `.txt` of all configured students in the current filter; active version exported, alt version in `[brackets]` below each entry

### Templates tab
Read-only view of all comment strings (dispositions × qualities, performance × work ethic, next steps, quality elaboration combos). Uses `they/them` and "Name" as placeholders.

### Experimental file extras
- **CSV paste textarea** — paste directly without a file
- **Comment Banks card** — upload a teacher-authored JSON bank; validated on upload; class-code mapping
- **LLM prompt helpers** — copyable prompts for (a) formatting CSV and (b) generating a comment bank
- **Preambles** — dynamically shows fields only for subjects present in the CSV (not all three by default)

---

## 3. CSV format

```
FirstName,LastName,Class,Block,Gender
Sarah,Smith,Econ,A,F
John,Doe,FMW,B,M
Alex,Chen,Bus,A,N
```

- **Class** — case-insensitive; mapped via `CLS_MAP = { FMW:'FMW', BUS:'Business', ECON:'Economics' }`
- **Block** — any label; used for grouping and sorting only
- **Gender** — `M` (he/him), `F` (she/her), `N` (they/them)
- Last name is for sorting only — never appears in generated comments
- Student ID: `first_last_cls_block` lowercased, spaces → underscores. **Must remain stable** — re-upload matching depends on it.

---

## 4. Subjects and vocabulary

| CSV code | Subject label | Skills phrase | Notes |
|----------|--------------|---------------|-------|
| `FMW` | Foundations of the Modern World | `historical thinking` | Gr 9 history — students won't continue next year |
| `BUS` | IB Business Management | `business frameworks and concepts` | Year 1 IB |
| `ECON` | IB Economics | `economic concepts and analysis` | Year 1 IB |

Subject affects: opening sentence wording, performance vocabulary, next-steps phrasing for `read` and `current`.

---

## 5. Trait definitions

### Performance (stackable — "stacked" label shown if >1 selected)
`strong` · `solid` · `capable` · `building`

### Work Ethic (stackable)
`diligent` · `consistent` · `needs_prompt` · `inconsistent`

### Disposition (max 2 — yellow left border on comment card if 2 selected)
`quiet` · `group` · `social`

### Optional Qualities (any combination)
| ID | Label | Behaviour |
|----|-------|-----------|
| `analytical` | Analytical | Woven into opening; in elaboration if 2+ |
| `original` | Original thinker | Woven into opening; in elaboration if 2+ |
| `bold` | Bold in thinking | Woven into opening; in elaboration if 2+ |
| `critical` | Critical approach | Woven into opening; in elaboration if 2+ |
| `passionate` | Passionate / deeply interested | Woven into opening (subject-specific wording); in elaboration if 2+ |
| `focused_questions` | Asks focused questions (short) | Woven into opening; in elaboration if 2+ |
| `focused_questions_long` | Asks focused questions (long) | Woven into opening; in elaboration if 2+ |
| `strong_progress` | Strong progress / resilience | Always a standalone sentence after performance; never in opening or elaboration |

### Next Steps (any combination)
`read` · `focus` · `prep` · `assessment` · `questions` · `support` · `collab` · `verbal` · `structure` · `current`

---

## 6. Comment generation logic

### Function: `generate(student)`

First checks for an uploaded comment bank matching the student's class code (experimental file only). If found, delegates to `generateFromBank()`. Otherwise uses hardcoded templates.

### Structure

```
[Opening sentence]  [Performance sentence]  [Progress note?]  [Quality elaboration?]  [Next steps sentence.]
```

All parts joined by spaces. Empty parts are filtered out.

### Opening sentence — `opening(name, disp, quals, p, subj)`

- **Two dispositions selected**: uses `OPENING_DOUBLE[pair][subject]` — a fixed paired template. Quality cannot be woven in here; any quality must appear in the elaboration sentence instead.
- **One disposition**: looks up `OPENING_TEMPLATES[subject][disposition][quality]`. The quality used is the first match in `QUAL_PRIORITY` order:
  ```
  analytical > original > bold > critical > passionate > focused_questions > focused_questions_long
  ```
  Falls back to `default` if no quality matches.

Templates are arrow functions `(name, p) => string` where `p` is the pronoun set.

### Performance sentence — `perfEthic(name, perf, ethic, p, subj)`

16 combinations (4 performance × 4 work ethic). All use `p.capPos` (Their/His/Her) at sentence start to avoid name repetition and avoid `they has` conjugation issues. `needs_prompt` combinations use dependent clauses: `"While [their] understanding is solid, [they] would benefit from..."`.

### Progress note

If `strong_progress` is in qualities: `"${p.capPos} progress this year has been strong, showing resilience and a conscious commitment to ${p.pos} own development."` — uses possessive noun so `has been` is always grammatically correct regardless of pronoun.

### Quality elaboration — `qualElaboration(name, quals, p)`

Called when:
- Single disposition + 2+ qualities selected (first quality is in opening; elaboration covers all)
- Double disposition + 1+ qualities selected (opening has no quality slot; elaboration covers all)

Uses a noun-phrase map (e.g. `analytical → 'analytical depth'`) assembled into: `"${p.capPos} work shows [phrase1] and [phrase2], enriching ${p.pos} engagement with the subject."`. This structure avoids all subject-verb agreement issues.

### Next steps — `nextSteps(name, steps, p, subj)`

Joins step clauses into: `"[Name] would benefit from [clause1] and [clause2]."` with serial comma when any non-final clause contains "and" internally. Appends a subject-specific impact closer drawn from the categories of steps selected.

### Pronoun conventions (critical)

```js
P = {
  M: { sub:'he',   obj:'him',  pos:'his',   capSub:'He',   capObj:'Him',  capPos:'His'   },
  F: { sub:'she',  obj:'her',  pos:'her',   capSub:'She',  capObj:'Her',  capPos:'Her'   },
  N: { sub:'they', obj:'them', pos:'their', capSub:'They', capObj:'Them', capPos:'Their' }
}
```

Always use `p.capPos` (possessive) to start sentences — never `p.capSub` before a singular verb, which would produce "they understands". Pattern: `"${p.capPos} understanding is strong"` not `"${p.capSub} understands"`.

### Character limits
- Soft cap: 400 chars (amber)
- Hard cap: 500 chars (red)
- Preamble excluded from count

---

## 7. Data model in localStorage

### State object (key: `rcg_v1` / `rcg_exp_v1`)

```js
{
  students: [
    {
      id: "sarah_smith_econ_a",   // stable — do not change generation logic
      first: "Sarah",
      last: "Smith",
      cls: "Econ",
      block: "A",
      gender: "F",
      traits: {
        disposition:  ["quiet"],           // max 2
        performance:  ["strong"],          // stackable
        workEthic:    ["diligent"],        // stackable
        qualities:    ["analytical", "passionate"],
        nextSteps:    ["read", "structure"]
      },
      editedComment: "Sarah is...",        // teacher's manual edit (optional)
      useEdited: true,                     // which version to show/export
      reviewLater: false                   // ★ flag
    }
  ],
  preambles: {
    "FMW": "Foundations of the Modern World is a...",
    "Business": "IB Business Management...",
    "Economics": "IB Economics..."
  }
}
```

### Comment banks (key: `rcg_banks_exp_v1`) — experimental file only

```js
[
  {
    id: "1748530000000",
    class_codes: ["MATH", "10MATH"],   // CSV class codes this bank applies to
    bank: { /* JSON bank object — see Section 8 */ }
  }
]
```

---

## 8. Comment bank JSON schema (experimental file)

This is the schema for teacher-uploaded comment banks. Fully implemented and validated in the experimental file.

### Token system

In bank template strings, use these tokens — substituted at render time:

| Token | Replaced with |
|-------|--------------|
| `[NAME]` | Student first name |
| `[THEIR]` | their / his / her |
| `[THEIR_CAP]` | Their / His / Her (sentence-start) |
| `[THEY]` | they / he / she |
| `[THEY_CAP]` | They / He / She (sentence-start) |
| `[THEM]` | them / him / her |
| `[SUBJECT_SKILLS]` | `meta.skills_phrase` |

**Never start a sentence with `[THEIR]` or `[THEY]`** — always use the `_CAP` variants at sentence start.

### Full schema

```json
{
  "meta": {
    "version": "1",
    "subject_label": "IB Mathematics",
    "skills_phrase": "mathematical reasoning and problem-solving"
  },
  "opening": {
    "quiet":  { "default":"", "analytical":"", "original":"", "bold":"", "critical":"", "passionate":"", "focused_questions":"", "focused_questions_long":"" },
    "group":  { "default":"", "analytical":"", "original":"", "bold":"", "critical":"", "passionate":"", "focused_questions":"", "focused_questions_long":"" },
    "social": { "default":"", "analytical":"", "original":"", "bold":"", "critical":"", "passionate":"", "focused_questions":"", "focused_questions_long":"" }
  },
  "opening_double": {
    "group+quiet":  "",
    "quiet+social": "",
    "group+social": ""
  },
  "performance": {
    "strong":   { "diligent":"", "consistent":"", "needs_prompt":"", "inconsistent":"" },
    "solid":    { "diligent":"", "consistent":"", "needs_prompt":"", "inconsistent":"" },
    "capable":  { "diligent":"", "consistent":"", "needs_prompt":"", "inconsistent":"" },
    "building": { "diligent":"", "consistent":"", "needs_prompt":"", "inconsistent":"" }
  },
  "qual_phrases": {
    "analytical":             "analytical depth",
    "original":               "original thinking",
    "bold":                   "a willingness to take intellectual risks",
    "critical":               "a critical approach to ideas",
    "passionate":             "genuine enthusiasm for the subject",
    "focused_questions":      "a clear awareness of [THEIR] learning",
    "focused_questions_long": "a clear awareness of [THEIR] learning and depth of engagement"
  },
  "progress_note": "[THEIR_CAP] progress this year has been strong, showing resilience and a conscious commitment to [THEIR] own development.",
  "next_steps": {
    "read":       "reading widely in the subject to deepen [THEIR] understanding",
    "focus":      "directing [THEIR] natural energy more consistently into the task at hand",
    "prep":       "preparing consistently before each class",
    "assessment": "developing a clearer understanding of what assessments require",
    "questions":  "asking questions and seeking clarification when unsure",
    "support":    "making regular use of teacher support",
    "collab":     "widening [THEIR] collaboration circle",
    "verbal":     "building confidence in contributing ideas verbally",
    "structure":  "practising how to structure and develop [THEIR] arguments",
    "current":    "engaging with current developments in the subject"
  }
}
```

### Validation

`validateBank(bank)` checks all 50 required keys and returns an array of missing key paths. Upload is rejected with a specific error message listing missing keys.

### Generation

`findBankForClass(cls)` scans loaded banks for a class-code match (case-insensitive). If found, `generateFromBank(student, bankEntry)` runs the same logic as the hardcoded `generate()` but using `applyTokens()` for substitution instead of JS template literals. Falls back to hardcoded templates if no bank matches.

---

## 9. Style requirements (templates must follow these)

### Strengths-based
Weaknesses are reframed as opportunity. Never: "is distracted", "needs to try harder". Always: "bringing warmth and energy to the class" / "greater consistency in effort will help him realise his full potential".

### Pronoun-safe sentence construction
- Start sentences with name or `p.capPos` (possessive noun) — `"Their understanding is strong"` not `"They understand well"`
- Use `p.sub` only mid-sentence or in modal constructions: `"[they] would benefit from"`, `"when [they] engage"`
- `needs_prompt` performance templates use dependent clause: `"While [their] understanding is solid, [they] would benefit from..."`

### No em dashes
Use commas, semicolons, or new sentences instead.

### Name frequency
First name 2–3 times per comment. Avoid starting consecutive sentences with the name — use pronoun or possessive instead.

### Tone
Warm but direct. Reads like a thoughtful teacher wrote it. Not a form letter.

---

## 10. Sample comments (Economics — style reference)

> Sarah thinks widely and with curiosity, often wanting to understand both the broad patterns and the finer details of why ideas work. She demonstrates strong understanding and skill use, supported by consistent focus. To continue refining her analysis, Sarah would benefit from reading more widely in economics news, helping her link concepts to real world developments.

> Trien enjoys learning with peers and generally maintains good focus in class. His understanding is strong, and his skills provide a solid base for further growth. To deepen his explanation and analysis, he would benefit from asking the teacher questions when needed and reading more widely in economics news.

---

## 11. Things to preserve / not break

- localStorage key `rcg_v1` — changing wipes all saved data
- Student ID format `first_last_cls_block` — must stay stable for trait preservation on re-upload
- `QUAL_PRIORITY` order determines which quality gets the opening slot — changing it changes output for existing students
- The stacking alert and double-disposition yellow border are intentional UX features
- Backup format is just the raw state object as JSON — `save(JSON.parse(fileContents))` is the full restore

---

## 12. What remains to build (public version roadmap)

### Architecture
The experimental file has the bank infrastructure in place. For GitHub Pages hosting:
- The `report_comments_experimental.html` becomes `index.html`
- The hardcoded FMW / Business / Economics templates remain as the built-in default bank (useful as a worked example)
- Teachers with different subjects upload their own bank

### Immediate next tasks

**A. "Select which trait categories are relevant" config screen**  
Teachers may not use all 10 next-steps options or all 8 quality variants. A simple configuration screen (checkboxes per trait chip) would hide unused options. This was designed but not yet built. Relatively easy — just a filter on `TRAIT_DEFS` before rendering chips.

**B. Preamble system for uploaded banks**  
Currently `preambles` are stored by subject key (`'FMW'`, `'Business'`, `'Economics'`). For uploaded banks, the preamble should be keyed by `bank.meta.subject_label`. Need `getSubjectKey(cls)` helper:
```js
function getSubjectKey(cls){
  const b = findBankForClass(cls);
  return b ? b.bank.meta.subject_label : clsToSubject(cls);
}
```
Then replace `preambles[subj]` with `preambles[getSubjectKey(st.cls)]` everywhere, and update `savePreamble` to use the same key.

**C. LLM prompt refinement**  
The bank generation prompt is embedded in `BANK_PROMPT` (constant in experimental file). Test it thoroughly against Claude and GPT-4. Common failure mode: the LLM fills in defaults from the scaffold rather than generating subject-specific text. The prompt currently includes a note that no value should remain as an empty string — verify this holds in practice.

**D. GitHub Pages deployment**  
The app is already a single file — no build needed. Just needs a repo and Pages enabled. Consider:
- Renaming to `index.html`
- Adding a `README.md` pointing to the live URL
- Whether to include the LLM prompts as separate files in `/prompts/` for easier updating

**E. Teacher onboarding flow**  
Currently a new teacher arrives at the Setup tab and must know to: upload CSV → upload bank → enter preamble → go to Students tab. Consider a first-run wizard or a "Getting started" checklist that makes this sequence explicit.

---

## 13. File structure (current)

```
outputs/
├── report_comments.html             — stable, in active use
├── report_comments_experimental.html — dev fork with bank system
└── BRIEF.md                         — this file
```
