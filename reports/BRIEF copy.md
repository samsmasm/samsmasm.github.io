# Report Comment Generator — Project Brief

Handoff document for Claude Code. Read alongside `index.html`.  
Last updated: 2026-05-29.

---

## 1. What this is

A browser-based tool for teachers to generate end-of-year report comments. The teacher loads a comment bank for their subject(s), selects traits for each student (disposition, performance, work ethic, optional qualities, next steps), and the app assembles them into a natural-sounding paragraph. All data is stored in `localStorage` with a JSON backup/restore feature.

### Files

| File | Purpose | localStorage key |
|------|---------|-----------------|
| `index.html` | The live public version | `rcg_exp_v1` (banks: `rcg_banks_exp_v1`) |
| `report_comments copy.html` | Stable legacy version — in active use, do not touch | `rcg_v1` |

The two files are fully isolated — they do not share storage. Both are single self-contained HTML files. No dependencies, no build step.

---

## 2. Current feature set

### Setup tab

- **Student list** — paste CSV directly or upload a `.csv` file. Preserves existing traits on re-load.
- **CSV formatting helpers** — collapsible: Google Sheets path, or LLM prompt to reformat a messy list.
- **Comment banks** — LLM prompt (Step 1) + paste output (Step 2). No file upload — paste only. Banks support multiple subjects in one JSON array.
- **Configure Visible Traits** — checkboxes to hide unused chips from the student editor per category.
- **Course preambles** — one textarea per subject present in the loaded CSV. Appears after CSV is loaded. Keyed by subject label, not internal type.
- **Save & Restore** — exports all state as a `.json` backup file; imports it back.

### Students tab

- Sticky left-hand list sorted by block then last name
- Filter pills by block and class
- Click student → trait selection panel on the right
- ★ review flag button on each row (toggles amber)
- Comment preview with live character count and colour-coded bar

### Comments tab

- All students grouped by block; filter pills by block / class / ★ Flagged
- Per-card:
  - ★ review flag
  - **✏ Edit** button → inline textarea with live char count; **Save** / **Discard**
  - **Original / Edited** version pills (appear after an edit is saved)
  - Alt version shown in grey italics `[in brackets]` below the active version
  - **Copy** — copies active version + alt in brackets to clipboard
- **⬇ Export configured** — downloads `.txt` of all configured students in the current filter

### Templates tab

- Shows all template strings from every loaded comment bank, grouped by subject
- Editable in-place: click any template cell to edit it; saves on blur back into the stored bank
- Raw token strings shown (e.g. `[NAME]`, `[THEIR_CAP]`) — not substituted
- Empty state if no banks loaded

---

## 3. CSV format

```
FirstName,LastName,Class,Block,Gender
Sarah,Smith,ECON,A,F
John,Doe,MATH,B,M
Alex,Chen,ENG,A,N
```

- **Class** — any short subject code; matched case-insensitively against loaded comment banks
- **Block** — any label; used for grouping and sorting only
- **Gender** — `M` (he/him), `F` (she/her), `N` (they/them)
- Last name is for sorting only — never appears in generated comments
- Student ID: `first_last_cls_block` lowercased, spaces → underscores. **Must remain stable** — re-upload matching depends on it.

There are no built-in subject mappings. All comment generation is bank-driven.

---

## 4. Comment generation

All comments come from an uploaded comment bank. If no bank is loaded for a student's class code, `generate()` returns `''` — no hardcoded fallback.

### Function: `generate(student)`

Calls `findBankForClass(student.cls)`. If a matching bank is found, delegates to `generateFromBank(student, bankEntry)`. Otherwise returns `''`.

### Structure

```
[Opening sentence]  [Performance sentence]  [Progress note?]  [Quality elaboration?]  [Next steps sentence.]
```

All parts joined by spaces. Empty parts filtered out.

### `getSubjectKey(cls)` / `getSubjectLabel(cls)`

These helpers check for an uploaded bank first, returning `bank.meta.subject_label` if found. Used everywhere preambles are stored or displayed — ensures preamble fields match the actual subject, not a hardcoded default.

### Character limits

- Soft cap: 400 chars (amber)
- Hard cap: 500 chars (red)
- Preamble excluded from count

---

## 5. Trait definitions

### Performance (stackable)
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
| `passionate` | Passionate / deeply interested | Woven into opening; in elaboration if 2+ |
| `focused_questions` | Asks focused questions (short) | Woven into opening; in elaboration if 2+ |
| `focused_questions_long` | Asks focused questions (long) | Woven into opening; in elaboration if 2+ |
| `strong_progress` | Strong progress / resilience | Always a standalone sentence; never in opening or elaboration |

### Next Steps (any combination)
`read` · `focus` · `prep` · `assessment` · `questions` · `support` · `collab` · `verbal` · `structure` · `current`

---

## 6. Comment bank JSON schema

### Format

The uploaded JSON is an **array** of subject entries — one file covers all subjects:

```json
[
  {
    "class_codes": ["MATH", "10MATH"],
    "meta": {
      "version": "2",
      "subject_label": "IB Mathematics AA",
      "skills_phrase": "mathematical reasoning and problem-solving"
    },
    "opening": { ... },
    "opening_double": { ... },
    "performance": { ... },
    "qual_phrases": { ... },
    "progress_note": "...",
    "next_steps": { ... }
  }
]
```

Single-subject legacy format (plain object, not array) is still accepted on upload; requires class codes to be entered in the UI.

### Token system

| Token | Replaced with |
|-------|--------------|
| `[NAME]` | Student first name |
| `[THEIR]` | their / his / her |
| `[THEIR_CAP]` | Their / His / Her (sentence-start) |
| `[THEY]` | they / he / she |
| `[THEY_CAP]` | They / He / She (sentence-start) |
| `[THEM]` | them / him / her |
| `[SUBJECT_SKILLS]` | `meta.skills_phrase` |

### Schema detail

```json
{
  "opening": {
    "quiet":  { "default":"", "analytical":"", "original":"", "bold":"", "critical":"", "passionate":"", "focused_questions":"", "focused_questions_long":"" },
    "group":  { ... },
    "social": { ... }
  },
  "opening_double": {
    "group+quiet": "",
    "quiet+social": "",
    "group+social": ""
  },
  "performance": {
    "strong":   { "diligent":"", "consistent":"", "needs_prompt":"", "inconsistent":"" },
    "solid":    { ... },
    "capable":  { ... },
    "building": { ... }
  },
  "qual_phrases": {
    "analytical":"", "original":"", "bold":"", "critical":"",
    "passionate":"", "focused_questions":"", "focused_questions_long":""
  },
  "progress_note": "",
  "next_steps": {
    "read":"", "focus":"", "prep":"", "assessment":"", "questions":"",
    "support":"", "collab":"", "verbal":"", "structure":"", "current":""
  }
}
```

### Validation

`validateBank(bank)` checks all required keys and returns an array of missing key paths. Upload is rejected with a specific error listing missing keys.

### Template editing

Templates can be edited directly in the Templates tab after loading. Each cell is `contenteditable`; on blur, `saveTemplateEdit(bankId, path, el)` writes the change back into the stored bank using dot-notation path (e.g. `opening.quiet.analytical`). Raw token strings are shown and edited directly.

---

## 7. LLM prompts

Two copyable prompts are built into the app:

### CSV formatting prompt (`CSV_PROMPT`)
Paste into an LLM with a messy class list. Returns correctly formatted CSV.

### Bank generation prompt (`BANK_PROMPT`)
Multi-step prompt that:
1. Asks for each subject: name, class codes, skills phrase, target comment length, optional style examples
2. Generates a complete JSON array covering all subjects
3. Explicitly distinguishes what must vary by subject (opening sentences, `read`/`current` next steps) vs what can be shared (performance sentences, generic next steps)

**Character length target** is question 4 in Step 1. The teacher specifies how many characters a baseline comment (one opening + one performance sentence + one next step) should be. The LLM calibrates all template lengths accordingly. Suggested range: 280–420 chars (soft warning at 400, hard cap at 500).

---

## 8. Data model in localStorage

### State object (key: `rcg_exp_v1`)

```js
{
  students: [
    {
      id: "sarah_smith_econ_a",
      first: "Sarah",
      last: "Smith",
      cls: "Econ",
      block: "A",
      gender: "F",
      traits: {
        disposition:  ["quiet"],
        performance:  ["strong"],
        workEthic:    ["diligent"],
        qualities:    ["analytical", "passionate"],
        nextSteps:    ["read", "structure"]
      },
      editedComment: "Sarah is...",
      useEdited: true,
      reviewLater: false
    }
  ],
  preambles: {
    "IB Mathematics AA": "IB Mathematics is a...",
    "IB English": "..."
  },
  hiddenTraits: {
    qualities: ["focused_questions_long"],
    nextSteps: ["collab"]
  }
}
```

Preambles are keyed by `subject_label` from the bank (not by internal type code).

`hiddenTraits` stores arrays of IDs to hide per category. Default (absent) = all visible.

### Comment banks (key: `rcg_banks_exp_v1`)

```js
[
  {
    id: "1748530000000",
    class_codes: ["MATH", "10MATH"],
    bank: { /* full bank object — see Section 6 */ }
  }
]
```

---

## 9. Style requirements (templates must follow these)

### Strengths-based
Weaknesses reframed as opportunity. Never: "is distracted", "needs to try harder".

### Pronoun-safe sentence construction
- Start sentences with name or `p.capPos` (possessive noun) — `"Their understanding is strong"` not `"They understand well"`
- Use `p.sub` only mid-sentence or in modal constructions: `"[they] would benefit from"`, `"when [they] engage"`
- `needs_prompt` uses dependent clause: `"While [their] understanding is solid, [they] would benefit from..."`

### No em dashes
Use commas, semicolons, or new sentences instead.

### Name frequency
First name 2–3 times per comment. Avoid starting consecutive sentences with the name.

### Tone
Warm but direct. Reads like a thoughtful teacher wrote it.

---

## 10. Things to preserve / not break

- localStorage key `rcg_exp_v1` — changing wipes all saved data
- Student ID format `first_last_cls_block` — must stay stable for trait preservation on re-upload
- `QUAL_PRIORITY` order determines which quality gets the opening slot
- The stacking alert and double-disposition yellow border are intentional UX features
- Preamble keys are `subject_label` strings — do not revert to internal type codes
- `saveTemplateEdit` uses dot-notation path; `opening_double` keys contain `+` (not `.`), which is handled correctly by splitting on `.` only

---

## 11. What remains to build

**A. Preamble system for uploaded banks** *(partially done)*  
Preambles are now keyed by `bank.meta.subject_label` via `getSubjectKey()`. The preamble fields appear correctly after loading a bank. No known gaps.

**B. GitHub Pages deployment** *(done)*  
Live at `samsmasm.github.io/reports`.

**C. LLM prompt refinement**  
The bank generation prompt is solid. Common failure mode: LLM fills generic text rather than subject-specific sentences. The prompt explicitly flags `read` and `current` next steps as subject-specific and leaves them blank in the scaffold. Test with real subjects.

**D. Teacher onboarding flow**  
The Setup tab now has a 4-step overview. A first-run wizard or checklist is not yet built but may not be needed.

**E. Export bank edits**  
After editing templates in the Templates tab, there is no way to export the modified bank as a JSON file. Adding a "Download bank" button per subject would let teachers save their edits.
