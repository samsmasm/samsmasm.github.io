# Mortgage Payoff (`/mortgage`)

Interactive mortgage payoff calculator built around Sam's actual tracking spreadsheet. Shows what extra repayments and lump sums do to the life of the loan. Live at unisam.nz/mortgage.

## Origin

Originally scaffolded by Gemini as a Tailwind dashboard with a phased roadmap. Rebuilt 2026-06-12 by Claude Code: the math engine was kept (verified correct), the Tailwind UI was replaced to comply with the repo's `AESTHETIC.md` (no Tailwind, no shadows, watercolour masthead, tools-purple palette), and the full roadmap was implemented in one pass.

## Source financial logic (the source of truth)

Baseline parameters from the spreadsheet:

- Initial principal: $177,096.34
- Annual interest rate: 4.89%
- Baseline repayment: $1,000.00 per fortnight
- Simple periodic compounding: periodic rate = annual rate / payments per year (weekly 52, fortnightly 26, monthly 12)
- Interest per period = balance x periodic rate; principal paid = repayment minus interest
- Sanity check: baseline scenario pays off in 216 fortnights (~8.3 years) with ~$38,487 total interest

## Architecture

Single file, `index.html`. Vanilla JS, hand-written CSS, hand-rolled SVG chart. Zero dependencies, zero CDNs, fully client-side. Logo and favicon reference `/geocornsmall.png` at the repo root (the 1MB `/geocorn.png` is the full-size original; do not use it inline), so test via a server from the repo root, not file://.

Key functions in the inline script:

- `amortize(principal, rate, ppy, payment, lumpAmount, lumpPeriod)` is the engine; returns `{rows, totalInterest, periods, finished}`. Capped at 50 years.
- `recalc()` reads inputs, runs baseline and optimized scenarios, updates stats, chart, milestones; table render is debounced 120ms.
- `renderChart()` builds the SVG: baseline line (muted purple), plan line (green), interest-gap polygon (pastel green fill). Series are sampled to <=400 points so slider drags stay smooth. SVG has explicit width/height attributes (Chrome clips otherwise).
- `setFrequency()` converts repayment and extra amounts mathematically (annual total held constant) so switching frequency never resets what the user typed.

## Implemented features

- Slider + numeric input pairs for all six numeric inputs, kept in sync
- Next payment date picker anchoring every displayed date (stats, milestones, tooltip, CSV)
- Frequency switching (weekly/fortnightly/monthly) with mathematical scaling
- Validation guard: repayment below first-period interest shows an alert and dims stale results (`.has-error`)
- Extra per payment and one-off lump sum with timing in years; note shows the landing date, or warns if it lands after payoff
- Comparison stats: debt-free date, total interest, interest saved, time saved (all vs base repayments)
- Hover tooltip on the chart showing balances at any point in time
- Milestone timeline: principal-beats-interest crossover, $50k/$100k thresholds, halfway, debt-free date
- CSV download of the schedule and a print stylesheet (print hides controls and chart, expands the table)
- Shareable URL state: all inputs sync to query params (`f,b,r,p,e,l,y,d`) via debounced `history.replaceState`, restored on load by `applyUrlState()`; "Copy link to this plan" button copies the URL
- Lump-sum rows highlighted green in the schedule table

## Conventions

- Follow `AESTHETIC.md` at the repo root for any visual change. Accent is classroom-tools purple (`#4a1a7a` / `#d0b6f5` / `#f5f0ff`); green (`#145c34` family) is reserved for savings, orange (`#7a2d0a` family) for interest/cost.
- All dates are anchored to the "Next payment date" input (payment 1 lands on it; defaults to one period from today) and use `en-NZ` formatting.
- Copy is dry and human: no exclamation marks, no em dashes.
- Keep it dependency-free and single-file.

## Possible next steps (not started)

- Rate-change scenarios (what if rates rise 1% in year 3)
- Multiple lump sums
- Offset account simulation (balance that reduces interest but stays withdrawable)
