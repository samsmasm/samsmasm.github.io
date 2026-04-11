# Project Brief: RatIBro -- IB Business Management Finance Revision Site

## Overview

A standalone web application for IB Business Management students (approx. 40 students) focused on Finance unit revision. The goal is mastery of core finance skills through self-directed, repeatable practice.

---

## Branding

- **Name**: RatIBro (plays on ratio / IB / bro)
- **Mascot**: A wise rat money scholar with an ornate academic/Victorian hat, round spectacles, smart waistcoat. Duolingo-style character. Asset: `ratibrosm.png` (tab icon for now; smaller version to come).
- **"IB" in the logo name is styled distinctively** to make the easter egg visible.

---

## Aesthetic Direction

- **Vibe**: Energetic and app-like -- feels like something students want to open (Duolingo-inspired)
- **Theme**: Light/dark toggle available to students
- **Navigation**: Left sidebar (persistent)
- **Dashboard tiles**: Compact but not cluttered
- **Animations**: Subtle transitions only -- no sound
- **Rating colours**: Red / Amber / Yellow / Green (4-point scale)
- **Palette**: Neutral overall so rating colours read clearly as signal

---

## Architecture

- **Frontend**: Multi-page site
- **Auth**: Firebase Authentication -- name + password only (no email)
- **Database**: Firebase Realtime Database or Firestore for student progress, self-ratings, saved answers
- **Hosting**: GitHub Pages or Firebase Hosting (TBD)
- **AI**: None -- all content generation is procedural

### Auth notes
- ~40 students + one teacher admin account
- Students choose their own username on first login
- Teacher can label usernames with real student names from the teacher panel
- Teacher can reset student passwords from the teacher panel
- Simple name/password auth is sufficient; no sensitive data stored

---

## Pages and Features

### 1. Home Page -- Skills & Topics Dashboard

A grid of topic tiles (one per individual IB Finance skill/term -- potentially 50+ rows). For each tile:

- **Topic/skill name**
- **Self-rating** (4-colour traffic light: red / amber / yellow / green): editable by student, persists over time
- **Rating history**: small inline chart -- dots plotted over time, each dot coloured by its rating
- **Review count**: number of practice attempts logged for that topic

Each practice activity (definitions, calculations, statements) logs an attempt and adds a dot to the relevant topic tile. Selection algorithms across practice pages prioritise untested or lowest-rated topics, with an element of randomness.

Teacher view shows all students' data in aggregate or individually.

---

### 2. Financial Statements Practice Page

Procedurally generated statements. Student does working by hand, submits, sees correct answer, self-rates on 4-colour scale. No automated marking.

Three statement types (exact IB format from finstform.md):

- **Statement of Profit or Loss** (profit-making and non-profit variants)
- **Statement of Financial Position** (profit-making and non-profit variants)
- **Cash Flow Forecast** (summary rows for now; individual inflow/outflow line items to be added later)

Two practice modes:
- **Fill in entries**: row labels/structure given; student fills in the figures
- **Build from scratch**: student constructs the whole statement

Self-rating feeds into the skills dashboard for the relevant topic(s).

---

### 3. Definition Checker Page

- Student selects how many definitions they want (e.g. 3, 5, 10)
- App selects terms prioritising: untested first, then lowest-rated, with randomness
- Student writes their definition in a text box
- Submits; correct definition revealed for self-comparison
- Student self-rates on 4-colour scale
- Rating adds a dot to that topic's tile on the skills dashboard
- Previous attempts are recorded and visible

No automated marking.

---

### 4. Calculations Practice Page

- Student selects how many questions they want (e.g. 5, 10)
- App generates questions procedurally with randomised figures
- Student does working by hand, inputs answer, submits
- Correct answer and working revealed for self-comparison
- Student self-rates on 4-colour scale
- Same model as definitions and statements

Calculations to include (all from finstform.md formulae):

**SL/HL:** Gross profit margin, Profit margin, ROCE, Current ratio, Acid test ratio, ARR, Payback period

**HL only:** Stock turnover (times and days), Debtor days, Creditor days, Gearing ratio, NPV (with discount table), Capacity utilisation rate, Productivity rate

---

### 5. Teacher Dashboard

- View any individual student's skills dashboard
- Class-wide overview: heatmap/table of self-ratings by topic
- See each student's saved definition attempts
- Reset student passwords
- Label student usernames with real names
- Basic CSV export of progress data

Used occasionally (mainly pre-assessment).

---

## Financial Statement Formats

Exact IB formats defined in `/refdocs/finstform.md`. All three statement types, plus budget format, plus all formulae and NPV discount tables are documented there.

---

## Deferred / Stretch Goals (do not build yet)

- Cash flow statement individual inflow/outflow line items
- "Give me 10 minutes" session mode
- Difficulty levels
- Longer-form / past paper questions
- Recommendations engine
- Streak tracking
- Mascot animations

---

## Content Still Needed from Teacher

1. **Full glossary** -- every key term with definition in exact wording for students
2. **Parameter ranges** -- realistic min/max values for procedural generation (statements and calculations)
3. **Student roster** -- for account creation, or confirm students self-register
4. **Smaller mascot image** -- optimised favicon to replace ratibrosm.png
