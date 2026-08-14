# Unit 1 (Foundations) content gaps

Audit date: 14 Aug 2026. Compares the IB syllabus (`refdocs/ibeconsyll.txt`, Unit 1) and what was
actually taught in 2025-26 (`public/2025happenings/IB1 Econ Course Record 2025-26.md`, lessons L2-L5)
against the two live pages, `src/pages/unit1/1-1.astro` and `1-2.astro`.

---

## A. Sections that are stubs on the page right now

These already say "Materials to come" to students, so they are the most visible holes.

1. **Circular flow of income (1.1)**, the whole section. Syllabus wants the model plus
   interdependence between five decision-makers (households, firms, government, banks and the
   financial sector, foreign sector), and leakages and injections. Currently one empty callout.
   The two-sector diagram `cycle-circular-flow.svg` exists but is used only on 3-1.
2. **Key concept 4, Equity (1.1)**. The other eight concepts have definitions; equity is blank.
3. **Economic methodology (1.2)**, the whole section. Syllabus wants: role of positive economics
   (logic, hypotheses/models/theories, ceteris paribus, empirical evidence, refutation) and role of
   normative economics (value judgments in policy making, the meaning of equity and equality).
   Taught in L3 but never written up.

## B. Syllabus points with no coverage at all

4. **Free goods.** Listed in the syllabus under opportunity cost. Never mentioned on either page.
5. **Opportunity cost as "the cost of choice".** Appears in passing inside The Economic Problem and
   in the PPC section, but has no definition or worked treatment of its own.
6. **Scarcity and sustainability.** The syllabus explicitly pairs these under scarcity. The page
   defines sustainability as key concept 6 but never links the two.
7. **Market versus government intervention** as the stated means of answering the three basic
   questions. The page goes straight from the three questions to the systems table; the framing the
   syllabus asks for is missing.
8. **The meaning of equity versus equality.** Sits under normative economics in 1.2 and is also the
   natural home for the missing key concept 4. Currently nowhere.
9. **Theory of Knowledge questions.** The guide lists five for Unit 1 (realism of models, assumptions,
   economics as a young social science, positive/normative in other disciplines, paradigm shifts).
   There is no TOK content anywhere on the site, so this is a decision about site-wide convention,
   not just Unit 1.

## C. Diagrams

10. **PPC outward shift.** "Shifts of the PPC" is a table with no diagram. `growth-ppc.svg` already
    exists and is not embedded anywhere in Unit 1. Cheapest fix on this list.
11. **Five-sector circular flow.** `cycle-circular-flow-extended.svg` is sitting in
    `ibecon-src/graphs-wip/`, flagged in `graphs.md` as WIP and not on the site. Needed for gap 1.

## D. Practice

12. **Both practice tabs are empty.** Note this is site-wide, not specific to Foundations: 2-1 and
    others carry the same "Materials to come" callout.
13. **Class activities that never made it onto the site**, from the course record:
    - Glass Dome group scenario (scarcity, choices, opportunity costs, what/how/for whom), L2
    - Concept mapping activity for the nine key concepts, L2
    - Positive versus normative sorting Do Now, L3 (the page has a good table already, so this is
      close to done)
    - "What would each school say about this scenario?" applied practice, L3
    - Mini whiteboard PPC sketching prompts, L4
    - PPC applied to news articles: tariffs, shipbuilding, Mexico, Vietnam growth, L4
    - Test Your Understanding 1.9 textbook questions, L4
    - Unit 1 test (planned ~27 Aug 2025; `refdocs/mydocs/1 Intro/` holds
      "IB1 Econ Intro test 1.docx" and "IB1 Econ unit 1 practice test.docx")

## Unreviewed resources that could fill these

`refdocs/mydocs/1 Intro/` contains: IB1 econ Ch1 Foundations.pptx, Economic problem.docx,
IB1 econ he who can't pay dies.docx, IB1 Econ Intro test 1.docx, IB1 Econ unit 1 practice test.docx.
These are binary and have not been parsed; the current page content is syllabus-derived.
