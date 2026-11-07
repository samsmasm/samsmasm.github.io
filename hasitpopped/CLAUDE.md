# Has it popped? (`/hasitpopped`)

Daily dashboard: is the AI stock bubble popping? Built 2026-11-01. Sam wanted it text-light ("the data speaking for itself"), explanations collapsed under "What is this?", in AESTHETIC.md Option B.

## Files
- `fetch.py`: stdlib Python. Pulls ~6 years of daily adjusted closes from Yahoo's chart API (24 AI stocks + benchmarks + 11 sector ETFs) and FRED CSVs (high-yield spread, 10y, Fed funds), computes per-stock stats and the daily series, writes `data.json` (~140 KB).
- `data.json`: generated. Never hand-edit.
- `manual.json`: hand-entered quarterly numbers (Big Tech capex guidance, Nvidia data-centre revenue, H100 rental price, private lab valuations). The page reads it directly, so a commit shows at once.
- `app.js`: all rendering and **every threshold** (`SIGNALS`, `MEASURES`). `style.css`, `index.html`.
- `test/run.sh`: headless-Chrome check of both tabs (`HP_SHOTS=<dir>` saves screenshots). Run before committing.
- `.github/workflows/hasitpopped.yml` (repo root): runs `fetch.py` 22:30 UTC Mon-Fri and commits `data.json`. Sam added it through the GitHub web UI on 2026-11-07 (Claude's git token can't push workflow files). To refresh by hand: run it from the Actions tab (Run workflow), or run `python3 hasitpopped/fetch.py` and commit `data.json`.

## Signals (overview)
Eight lights: AI index from peak, QQQ/RSP from peak, % of AI stocks above 200-day, VXN, high-yield spread (auto); capex cuts, Nvidia DC growth, H100 rental price (manual). Red = 1, amber = ½: under 1.5 "Not yet.", under 3 "Wobbling.", under 4.5 "Hissing.", else "Popped.".

**AI index** = equal-weighted, chain-linked index of the 21 US-listed stocks (Asia excluded), base 100 on 2023-01-03, on S&P trading days with forward-fill. New listings (CRWV, SPCX) join on their first day.

## Gotchas
- **FRED stalls browser-like User-Agents** from scripts (read timeout). `fetch.py` sends a curl UA to FRED only. Yahoo is fine with a Mozilla UA.
- Yahoo's chart API is unofficial. If it breaks, Stooq CSV is the fallback.
- Asian stocks are in local currency; they're excluded from the AI index and the breadth signal.
- xAI merged into SpaceX (Feb 2026); SpaceX listed as SPCX on 12 Jun 2026, so it's tracked as a stock.

## Quarterly update (manual.json)
After each earnings season: update `capex.companies[].guide` (move the old value to `prev`), add the Nvidia quarter (fill the null Jan/Apr 2026 quarters too when convenient), add a GPU price point, lab valuations, bump `updated`. Amazon's Q3 2026 (29 Oct) capex figure was still to be entered at build time.

## Not linked yet
Not on the homepage, `/tools` or `/find`.
