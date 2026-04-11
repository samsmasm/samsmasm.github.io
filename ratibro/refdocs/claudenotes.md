# Project Brief: RatIBro — IB Business Management Finance Revision Site

## Overview

A standalone web application for IB Business Management students (approx. 40 students) focused on Finance unit revision. The goal is mastery of core finance skills through self-directed, repeatable practice.

---

## Branding

- **Name**: RatIBro (plays on ratio / IB / bro)
- **Mascot**: A wise rat money scholar with an ornate academic/Victorian hat, round spectacles, smart waistcoat. Duolingo-style character.
- **Favicon**: `feathersm.png` (feather — simpler shape for browser tab)
- **"IB" in the logo name is styled distinctively** to make the easter egg visible.

---

## Aesthetic Direction

- **Vibe**: Energetic and app-like — feels like something students want to open (Duolingo-inspired)
- **Fonts**: Fraunces (display/headings) + Nunito (body)
- **Theme**: Light/dark toggle; light default
- **Navigation**: Left sidebar (persistent)
- **Animations**: Subtle transitions only — no sound
- **Rating colours**: Red / Amber / Yellow / Green (4-point scale)
- **Palette**: Neutral overall so rating colours read clearly as signal

---

## Architecture

- **Frontend**: Multi-page HTML site, no build tools, no framework
- **Auth**: Firebase Authentication — Google sign-in only (any Google account)
- **Database**: Firestore (Singapore region) for student progress
- **Hosting**: GitHub Pages at samsmasm.github.io, custom domain unisam.nz via Cloudflare
- **AI**: None — all content generation is procedural

### Auth notes
- ~40 students + one teacher
- Google-only auth: students sign in with their own Google account
- Teacher identified by email: `samgetsstuffdone@gmail.com`
- `isTeacher(user)` in firebase.js checks email match

---

## Data Structure (js/data.js)

### Two-tier content model

**Tier 1 — Skills** (self-rated, tracked in Firestore):
- ~47 skills organized as: `TOPICS → units → clusters[] → skills[]`
- Each skill: `{ id, name, hl, definition, unit, unitName, clusterId, clusterName }`
- `ALL_SKILLS` is a flat array derived from the nested structure
- Progress stored per skill id in Firestore: `{ ratings: [{rating, timestamp}], attempts }`

**Tier 2 — Vocab terms** (definitions practice only, not tracked):
- ~48 vocab terms in `VOCAB_TERMS` array
- Same shape as skills but no progress tracking in Firestore
- `ALL_DEFN_ITEMS = ALL_SKILLS + VOCAB_TERMS` — used by definitions practice
- Vocab terms have `isVocab: true` flag

### Cluster structure
The dashboard organises skills into concept clusters (2–5 skills each) within units:
- ~20 clusters across 10 units
- Each cluster row shows mini status dots (one per skill, coloured by latest rating)
- Clicking a cluster expands to show individual skill sub-rows with rating buttons
- Clusters start collapsed; units start expanded

### SL/HL
Every skill and vocab term has an `hl: boolean` flag. SL/HL toggle deferred — filter will be applied to clusters/skills/vocab when built.

---

## Pages and Features

### 1. Skills Dashboard (dashboard.html)
- Unit sections → cluster rows → expandable skill sub-rows
- Cluster header shows: name + mini status dots per skill
- Skill sub-row: name, history dots (last 8 ratings), 4 rating buttons, attempt count
- Stats bar: topics rated, total attempts, topics in the green
- Rating updates Firestore in background; UI updates immediately (optimistic)

### 2. Definitions Practice (definitions.html)
- Student selects count (3/5/10/15), session begins
- Pulls from ALL_DEFN_ITEMS (~95 total: skills + vocab)
- Priority: unrated skills first, then lowest-rated skills, then vocab (treated as untested)
- Student writes definition → reveals answer → self-rates
- Progress recorded to Firestore for skills only (not vocab terms)

### 3. Calculations Practice (calculations.html)
- Procedurally generated figures, student works by hand, self-rates
- Formulas in FORMULAS object with `calculate()` functions
- skillMap maps formula keys to skill IDs for progress recording

### 4. Statements Practice (statements.html)
- Currently a "coming soon" placeholder

### 5. Teacher Panel (teacher.html)
- Lists all users from Firestore
- Shows: topics rated, greens, total attempts per student
- Teacher can label real names (setRealName)
- Class overview and account management tabs: "coming soon"

---

## Deferred / Stretch Goals

- **SL/HL toggle** — filter out HL content; save preference per user
- **Spaced repetition for vocab** — definitions practice schedules vocab terms based on self-ratings (soon = rated low, deferred = rated high). Needs per-term timestamp tracking.
- **Statements practice** — fill-in and build-from-scratch modes for P&L, SFP, Cash Flow Forecast
- **Class heatmap** — teacher view of all students × all topics
- **Cash flow line items** — individual inflow/outflow rows
- **CSV export** — teacher data export
- **Streak tracking**
- **Mascot animations**

---

## Financial Statement Formats

Exact IB formats in `/refdocs/finstform.md`. All three statement types, budget format, all formulae, and NPV discount tables.

---

## Content Notes

- Glossary source: `/refdocs/glossary.md` — full IB BM glossary, cleaned and reorganised by Gemini, with finance-relevant terms extracted and grouped by unit at the end of the file
- All skill definitions are populated (no more [PLACEHOLDER] entries)
- Wording can be adjusted by teacher — edit `definition` fields in data.js
