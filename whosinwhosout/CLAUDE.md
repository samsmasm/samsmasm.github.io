# Who's In, Who's Out: project brief

(On the build laptop, copy this file to the project root as `CLAUDE.md`.)

## 1. What this is

A single-page website called **Who's In, Who's Out** that predicts who will be in New Zealand's next Parliament, not just how many seats each party gets. The election is **Saturday 7 November 2026**. The owner wants a fast first version live **today**, then polish afterwards. It will be hosted on his personal site, unisam.nz (confirm the sub-path; use only relative paths so it works from any folder).

How it works:

1. Take a poll-of-polls party vote (computed by us from published polls).
2. Work out how many seats each party is entitled to (Sainte-Lague, 120 seats, 5% threshold or one electorate win).
3. Decide who wins each electorate (default: every seat is held by the party that won its closest predecessor in 2023).
4. Fill each party's entitlement with its electorate winners first, then go down its party list in order, skipping anyone who already won an electorate.
5. Show the named people predicted to be in Parliament, party by party.

This is a modelled estimate, not a forecast. The page must say so clearly (see section 9).

## 2. Scope: V1 (ship today) versus V2 (later)

### V1 (must ship today)
- Poll average computed from all scraped polls, with a **checkbox per pollster** to include or exclude. All included by default. Do not hide or drop any pollster by default, including Curia (the owner does not want to be accused of bias).
- **Seat model toggle** (global, not per seat):
  - Default: **Hold 2023** (every new electorate is won by the party that won its closest 2023 predecessor).
  - Alternative: **Uniform swing** (see section 5).
  - The user can toggle back and forth.
- Results: seat totals by party, electorate versus list split, predicted MPs by party, and an electorate table.
- **Shareable link** that stores every assumption the user changed, plus a visible "What has been changed" summary for whoever opens the link (section 8).
- Disclaimer and data credits.
- Works on a phone.

### V2 (do not build now, but do not design against it)
- Per-electorate overrides (click a seat, set the winning party or candidate).
- Manual entry of Maori electorate polling, with a toggle between "2023 result" and "poll".
- Probabilities from a simulation (Monte Carlo) instead of one prediction.
- Map view, parliament chart.
- Custom party vote percentages typed in by the user.

Keep the data model and the URL state format extensible so V2 overrides can be added without breaking old links (include a version number in the link state).

## 3. Parties and basic rules

- Parliament has 120 seats plus any overhang. There are **71 electorates in 2026: 64 general and 7 Maori**, so 49 list seats if there is no overhang. Boundaries were finalised on 8 August 2025.
- Allocation uses the **Sainte-Lague** method on party vote shares.
- A party takes part in the allocation only if it gets **5% or more of the party vote, or wins at least one electorate** (the coat-tail rule).
- Votes for parties that fail the threshold are discarded (renormalise among qualifying parties before allocation).
- **Overhang**: if a party wins more electorates than its entitlement, it keeps them all and the House grows. Other parties' entitlements are still computed from the 120-seat allocation. So:
  - entitlement = Sainte-Lague result over 120 seats among qualifying parties
  - list seats = max(0, entitlement - electorate seats)
  - total seats = max(entitlement, electorate seats)
  - House size = sum of totals (show this number; it can exceed 120)
- Parties to model: National, Labour, Green, ACT, NZ First, Te Pati Maori, Opportunity, plus an "Other" bucket for the remainder. Add any other party that appears in the polling table with a meaningful share, but only parties with a party list matter for naming MPs.

## 4. Data sources and how to get them

The build laptop has normal network access, so **fetch programmatically** and cache everything. Do not hand-type data except in the manual files listed below. Recommended approach:

- `scripts/` holds fetch and build scripts (Python or Node, whichever is quicker to write).
- `data/raw/` holds untouched downloads (HTML, wikitext, CSV). Commit these so builds are repeatable and the site survives a source going down.
- `data/derived/*.json` is produced by the scripts and consumed by the site.
- `data/manual/` holds hand-edited files (mapping table, fixes). **Scripts must never overwrite `data/manual/`.**
- Be polite to servers: set a descriptive User-Agent, fetch each source once, cache it, no hammering.
- If a source blocks scripted access, tell the owner and ask him to download the file in a browser and drop it in `data/raw/`. Do not work around blocks.

| Need | Source | Notes |
|---|---|---|
| Polls | https://en.wikipedia.org/wiki/Opinion_polling_for_the_2026_New_Zealand_general_election | Use the MediaWiki API (`action=parse`, wikitext or HTML) rather than scraping the rendered page. Table has pollster, fieldwork dates, sample size, party percentages. Regular pollsters: 1News/Verian, RNZ/Reid Research, Roy Morgan, Curia (Taxpayers' Union), plus others that appear (Talbot Mills, Freshwater, etc.). |
| 2023 results by electorate | https://electionresults.govt.nz/electionresults_2023/electorate-status.html and https://archive.electionresults.govt.nz/electionresults_2023/ (statistics pages, "Summary of votes by electorate") | Get per-electorate candidate votes and party votes. Prefer CSV or XLSX downloads if offered. Margins also in https://elections.nz/assets/2023-General-Election/Official-results/Attachment-B-electorate-margins-and-turnout-revised.pdf |
| 2023 party vote by electorate (one table) | https://en.wikipedia.org/wiki/Results_of_the_2023_New_Zealand_general_election | Easiest single source cross-check. |
| 2023 national result | https://elections.nz/media-and-news/2023/official-results-for-the-2023-general-election/ | Used for the test in section 10. |
| Party lists and ranks | https://en.wikipedia.org/wiki/Party_lists_in_the_2026_New_Zealand_general_election and the Electoral Commission lists at https://vote.nz | Lists were due 12pm on 8 October 2026, so they are final. Cross-check Wikipedia against vote.nz for each party. |
| Electorate candidates | https://en.wikipedia.org/wiki/Candidates_in_the_2026_New_Zealand_general_election_by_electorate | Gives each candidate, party, list number (if any), and flags incumbents and retiring MPs. |
| New boundaries | https://www.elections.nz/boundary-review and each new electorate's Wikipedia article | Needed to build the mapping table. |

Known gotchas:
- **Port Waikato** was decided in a later by-election (25 November 2023), not on election night. Use the by-election result for the seat. Verify the winner and party.
- Names differ between sources (macrons and accents, for example Chloe/Chlöe). Normalise names for matching but display the properly accented form.
- Candidate lists change (withdrawals). Re-fetch lists at build time and show the fetch date.

## 5. Seat models

### Model A: Hold 2023 (DEFAULT)
For each of the 71 new electorates, find its **closest 2023 predecessor** via the mapping table (section 6). The winning party is the party that won the predecessor in 2023. Per-seat margins are shown but not used.

### Model B: Uniform swing (toggle)
1. For each party, compute `swing = poll_average_party_vote - 2023_national_party_vote` in percentage points.
2. For each electorate, take the predecessor's 2023 **electorate vote** share for each party's candidate. (Electorate vote, not party vote: about 35.5% of voters split their ticket in 2023, so the two differ.)
3. Add each party's swing to that party's electorate share, floor at zero. Independents and parties without a 2023 candidate in the seat get no swing.
4. The winner is the party with the highest adjusted share.
5. Keep it simple for V1. Note in the UI that this is a crude model and that personal votes (for example Epsom for ACT) are not captured.

Both models must go through the same allocation and list-filling code afterwards.

### Naming the electorate winner
Party holds the seat in both models. The **named person** is that party's candidate in the new electorate, taken from the candidates page. Do **not** try to reason about departed MPs, party switches or retirements in V1: the party keeps the seat, and we show whoever the party has standing there. If the winning party has no candidate listed for the seat, show "Candidate TBC" and flag it in the data checks. Do not invent names.

## 6. Boundary mapping (do this once, mark uncertainty)

Create `data/manual/electorate_mapping.csv` with columns:

`new_electorate, predecessor_2023, change_type, confidence, notes`

- `change_type`: same, renamed, boundary-changed, merged, new.
- `confidence`: high, medium, low.
- Most seats map one to one. For new or heavily changed seats, pick the predecessor that supplies the largest share of voters, using the Representation Commission report and the Wikipedia electorate articles, and mark `confidence` medium or low.
- 2026 has one fewer general electorate than 2023, so at least one predecessor seat disappears. Make sure every new electorate maps to exactly one predecessor and list any 2023 seats with no successor.
- Known changes to verify (from news coverage, not guaranteed complete): Wellington loses a seat; a new Kenepuru electorate (Tawa, Johnsonville, Ohariu area) in Wellington; a new Mt Maunganui electorate with Tauranga and Bay of Plenty boundaries shifting; west Auckland reshuffled (New Lynn, Kelston, Te Atatu, Henderson, Waitakere); Hutt South expands to include Newlands.
- In the UI, show a small "mapping uncertain" marker on every seat with `confidence` medium or low.
- Ship a short list of the low-confidence mappings to the owner at the end for review. He is happy for Claude to make best guesses to hit the deadline.

## 7. Poll average

- Parse every poll in the Wikipedia table for the 2026 election period. Store: pollster, fieldwork start and end, sample size, and each party's percentage.
- **Pollster checkboxes**: one per pollster, all ticked by default. Unticking removes that pollster's polls from the average.
- Average method (default, keep it transparent and documented on the page):
  - use polls with fieldwork ending within the last 60 days (make the window a constant at the top of the code)
  - weight by recency (exponential decay, half-life 14 days) and by square root of sample size
  - handle undecideds by renormalising each poll's party figures to 100% before averaging
  - "Other" = 100 minus the sum of listed parties
- Show the table of included polls with dates, and the "polls up to" date next to the average.
- If every pollster is unticked, show a friendly message instead of an error.

## 8. Shareable link and "what has changed" summary

- All assumptions live in the URL **hash** (so no server is needed), for example `#v=1&model=swing&excl=Curia,RoyMorgan`.
- On load, parse the hash, apply it, and compare to the defaults.
- If anything differs from the defaults, show a prominent box at the top: **"This view uses different assumptions from the default:"** followed by a plain-English list, for example:
  - "Seat model: uniform swing (default: every seat holds as in 2023)"
  - "Pollsters excluded: Curia"
- If nothing differs, show "Default assumptions."
- Also show the date of the latest poll in the average and the date the data was built, so anyone opening an old link knows how stale it is.
- Include a "Copy link" button. Include a version number in the state so V2 can extend it.

## 9. Page content and tone

- Title: **Who's In, Who's Out**. Neutral, plain design. No party colours as the page theme (use them sparingly for party chips). Readable on a phone, readable in dark mode.
- Disclaimer, visible near the top and again in the footer: "This is a modelled estimate based on an average of published polls and a simple assumption about electorate results. It is not a forecast, it does not account for local campaigns, personal votes or boundary changes beyond a best-guess mapping, and it will be wrong in places. Treat named individuals as scenarios, not predictions."
- Sections, in order:
  1. Header and disclaimer
  2. Assumptions panel (seat model toggle, pollster checkboxes, poll average and polls-up-to date)
  3. "What has changed" box (only when the link differs from defaults)
  4. Seat totals: a table by party (party vote %, electorates, list seats, total) plus House size and whether there is overhang, with a simple stacked bar
  5. Predicted MPs by party: name, "Electorate: X" or "List #n", with electorate winners listed first and the list cut-off visible; also show the "next in line" two or three names below the cut-off, since those are the people on the margin
  6. Electorate table: new electorate, predecessor, mapping marker, predicted party, candidate name
  7. Footer: data credits (Wikipedia, CC BY-SA; New Zealand Electoral Commission), sources, build date, how the model works in five lines, and the V2 teaser
- No tracking, no ads in V1.

## 10. Tests and checks (do these before calling anything done)

1. **Reproduce 2023.** Feed in the 2023 actual national party vote and the 2023 electorate winners. The allocation code should produce, within the Port Waikato by-election caveat, 122 seats: National 48, Labour 34, Green 15, ACT 11, NZ First 8, Te Pati Maori 6 (overhang for Te Pati Maori). Port Waikato was deferred and added one more seat later. Compare against the official results page. If this fails, fix the allocation code before anything else.
2. Sainte-Lague unit tests with a small hand-worked example.
3. List filling: a candidate who is on the list and wins an electorate appears once, as an electorate MP, and is skipped on the list.
4. Threshold and coat-tail: a party under 5% with one electorate qualifies; a party under 5% with none does not.
5. Link round trip: change toggles, copy the link, reload, and confirm identical state and the correct "what has changed" text.
6. Data checks script prints: electorates mapped (should be 71), electorates with no candidate for the predicted winning party, parties with lists not matched to the allocation, and low-confidence mappings.
7. Open the page on a phone-width viewport and check nothing overflows.

## 11. Technical approach

- Static site, no backend. `index.html` plus a small JS file and one `data.json`. Vanilla JS is fine; keep dependencies to a minimum. A single self-contained HTML file with the data embedded is acceptable if that is faster.
- All calculation (poll average, swing, allocation, list filling) runs in the browser from `data.json` so toggles update instantly.
- Keep calculation code in plain functions with no DOM access so it can be tested in Node.
- Use relative paths only. Output goes in `dist/` ready to drop onto the host.
- Keep the code commented where the electoral rules are applied (threshold, coat-tail, overhang), because the owner may show this to students.

## 12. Order of work (ship fast)

1. Scaffold the repo and the folders in section 4.
2. Fetch and parse polls; fetch 2023 results; fetch lists and candidates. Write the derived JSON.
3. Build the mapping table (best guesses, mark uncertainty).
4. Write and test the allocation and list-filling code, including the 2023 reproduction test.
5. Build the page and the toggles.
6. Add the share link and "what has changed" box.
7. Add disclaimer and credits, check on a phone, build `dist/`.
8. Report to the owner: what shipped, the low-confidence mappings to review, anything that could not be fetched, and what V2 should tackle first.

## 13. Working agreements

- The owner is in a hurry and happy for sensible judgement calls. Make the call, note it in a `DECISIONS.md` file, and keep going. Stop and ask only for things that cannot be undone or that need his login or files.
- Never write em dashes in any text, including page copy, comments and commit messages.
- Do not invent data. If something cannot be found, show it as unknown and list it in the final report.
- Do not claim the model is accurate. The disclaimer wording above stays.
- Keep the first version small. Anything not listed under V1 is V2.
