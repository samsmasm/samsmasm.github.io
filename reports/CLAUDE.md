# Report Comment Generator — CLAUDE.md

Handoff for Claude Code. Read alongside `index.html`.

---

## Files

| File | Purpose | localStorage key |
|------|---------|-----------------|
| `index.html` | Live version — all work goes here | `rcg_exp_v1` (banks: `rcg_banks_exp_v1`) |
| `report_comments copy.html` | Stable legacy — **DO NOT TOUCH** | `rcg_v1` |

Single self-contained HTML file. No build step. No dependencies. ~2425 lines.

---

## localStorage keys

| Key | Contents |
|-----|----------|
| `rcg_exp_v1` | Main state: students, preambles, hiddenTraits |
| `rcg_banks_exp_v1` | Comment banks array |
| `rcg_sets_exp_v1` | Named saved sets |
| `rcg_active_set_v1` | ID of currently active set |

**Never rename `rcg_exp_v1` or the student ID format** — both wipe saved data.

Student ID format: `first_last_cls_block` (lowercased, spaces → underscores). Must stay stable so trait preservation works on CSV re-upload.

---

## Critical architectural rules

### `buildStepsText` must be a top-level function
It was previously nested inside `generateFromBank`, which caused silent V8 runtime failures in Chrome: Templates tab went blank, Comments tab showed only students with no traits/banks, Students right panel showed nothing. No syntax error appeared. Fix: top-level with `n` and `p` passed explicitly.

### `generateFromBank(student, bankEntry, trim=false)`
- `trim=false` → returns plain string (backward-compat path used by `generate()`)
- `trim=true` → returns `{comment, dropped}` (auto-shorten path)
- Predicted grade is **never** in the drop order when trimming
- Drop order: second next step → quality phrase → progress note → first next step → truncate

### Preambles keyed by `bank.meta.subject_label`
Accessed via `getSubjectKey(cls)` / `getSubjectLabel(cls)`. Never revert to internal type codes.

### Autosave debounce
`save()` and `saveBanks()` both call `scheduleAutosave()` (2s debounce). Only fires if an active set exists.

---

## Key functions (with line numbers — verify in file)

| Function | Line | Purpose |
|----------|------|---------|
| `buildStepsText(n, p, pairs)` | ~928 | Assembles next-steps sentence. Top-level. |
| `generateFromBank(student, bankEntry, trim)` | ~948 | Core generation. trim=false→string, trim=true→{comment,dropped} |
| `generate(student)` | ~1203 | Thin wrapper; calls findBankForClass → generateFromBank |
| `autoShortenComment(id)` | ~1208 | Saves trimmed version as editedComment |
| `findBankForClass(cls)` | ~710 | Case-insensitive class code lookup |
| `validateBank(bank)` | ~716 | Returns array of missing key paths |
| `applyTokens(tmpl, name, p, sk)` | ~739 | Token substitution |
| `scheduleAutosave()` | ~1247 | 2s debounce autosave to active set |
| `updateActiveSet(silent)` | ~1255 | Writes current state into the active saved set |
| `buildCommentCard(st, preamble)` | ~1838 | Reusable comment card HTML (used by normal + multi-class views) |
| `findMultiClassGroups(students)` | ~1828 | Groups students who appear in 2+ classes |
| `renderComments()` | ~1902 | Main comments tab render; includes multi-class comparison path |
| `saveTemplateEdit(bankId, path, el)` | ~2204 | Dot-notation path write-back for template cells |
| `saveMetaEdit(id)` | ~2232 | Saves edited subject label, skills phrase, class codes |
| `exportCsv()` | ~2146 | CSV with char count columns |

---

## Trait definitions (TRAIT_DEFS ~line 751)

- **performance**: `strong` · `solid` · `capable` · `building` (stackable)
- **workEthic**: `diligent` · `consistent` · `needs_prompt` · `inconsistent` (stackable)
- **disposition**: `quiet` · `group` · `social` (max 2; yellow border on card if 2 selected)
- **qualities**: `analytical` · `original` · `bold` · `critical` · `passionate` · `focused_questions` · `focused_questions_long` · `strong_progress`
- **nextSteps**: `read` · `focus` · `prep` · `assessment` · `questions` · `support` · `collab` · `verbal` · `structure` · `current`
- **predictedGrade**: `very_high` · `high` · `medium` · `low` — **single-select** (enforced in `toggleTrait`)

`QUAL_PRIORITY` (~line 926): `['analytical','original','bold','critical','passionate','focused_questions','focused_questions_long']`
Determines which quality gets the opening slot when multiple are selected.

`strong_progress` always produces a standalone sentence — never woven into opening or elaboration.

---

## Token system

| Token | Replaced with |
|-------|--------------|
| `[NAME]` | Student first name |
| `[THEIR]` | their / his / her |
| `[THEIR_CAP]` | Their / His / Her |
| `[THEY]` | they / he / she |
| `[THEY_CAP]` | They / He / She |
| `[THEM]` | them / him / her |
| `[SUBJECT_SKILLS]` | `meta.skills_phrase` |

---

## Comment bank JSON schema

Upload format: array of subject entries (single-object legacy also accepted; prompts for class codes).

```json
[
  {
    "class_codes": ["ECON", "IBECON"],
    "meta": { "version": "2", "subject_label": "IB Economics", "skills_phrase": "..." },
    "opening": { "quiet": { "default":"", "analytical":"", ... }, "group":{...}, "social":{...} },
    "opening_double": { "group+quiet":"", "quiet+social":"", "group+social":"" },
    "performance": { "strong": { "diligent":"", ... }, "solid":{...}, "capable":{...}, "building":{...} },
    "qual_phrases": { "analytical":"", "original":"", "bold":"", "critical":"", "passionate":"", "focused_questions":"", "focused_questions_long":"" },
    "progress_note": "",
    "next_steps": { "read":"", "focus":"", "prep":"", "assessment":"", "questions":"", "support":"", "collab":"", "verbal":"", "structure":"", "current":"" },
    "predicted_grade": { "very_high":"", "high":"", "medium":"", "low":"" }
  }
]
```

`opening_double` keys contain `+` (not `.`). `saveTemplateEdit` splits on `.` only — `+` in keys is handled correctly.

---

## Character limits

- Soft cap: 400 chars (amber) — comment only, preamble excluded
- Hard cap: 500 chars (red)
- Two counts shown: comment only, and comment + preamble (with `·` separator)
- Auto-shorten button appears on over-cap cards only; never drops predicted grade

---

## Saved sets

Three-layer safety: autosave (2s debounce on every save/saveBanks call) → "Update now" button → "Download" file.

Active set ID in `rcg_active_set_v1`. New set = clear all data first (with warning), then enter new data and save.

---

## Writing style rules for templates

- Strengths-based: weaknesses reframed as opportunity. Never "is distracted", "needs to try harder".
- Start sentences with name or `[THEIR_CAP]` (possessive). Use `[THEY]` only mid-sentence or in modal constructions.
- `needs_prompt` uses a dependent clause: "While [their] understanding is solid, [they] would benefit from..."
- No em dashes. Use commas, semicolons, or new sentences.
- First name 2–3 times per comment. Avoid consecutive sentences starting with the name.

---

## CSV format

```
FirstName,LastName,Class,Block,Gender
Sarah,Smith,ECON,A,F
```

Gender: `M` (he/him) · `F` (she/her) · `N` (they/them). Class is case-insensitive; matched against bank `class_codes`.

---

## Deployment

GitHub Pages: `samsmasm.github.io/reports`. Always `git push` after every commit.

---

## Current status

Working and stable. Used for generating student report comments. Complex internals but all known bugs fixed.

**Critical reminder:** `buildStepsText` must remain a top-level function — if nested inside `generateFromBank`, Chrome silently fails (blank Templates tab, missing data in Comments tab). This has burned a commit before.
