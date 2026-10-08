# Stock Simulator, `/stocksimulator`

Classroom demo of how random stock price paths look, and how easy it is to find a "pattern" in pure noise. It draws many random walks at once, then lets you pick the "most interesting" one by a chosen measure (straightest, biggest swing, longest streak...) and show it on its own, as if it were a real stock. **In active use.** Not linked from `/tools` or the homepage; opened by URL.

## Files

Two independent, self-contained pages (inline CSS and JS, canvas, no libraries, no backend, no storage):

| File | Title | Model |
|---|---|---|
| `index.html` | Stock Simulator | Simple ±1 coin-flip random walk. Defaults: 50 lines, 100 steps. |
| `index2.html` | Stock viewer | Richer model: normally distributed log returns (`randNormal`, Box-Muller); **Mode** = Log (centred axis) or Price (S₀ = 1000, never below 0); linear/log Y axis; optional annual **Drift** with Annual % and Days/yr; **Target path** overlay (index fund mode or continuous compounding). Defaults: 100 lines, 1000 steps. Has a `runTests()` self-check. |

Ask Sam which one is in use before changing either. Do not merge them unless asked.

## Shared controls

- **Play / Pause** animates the paths step by step; the **Progress** slider scrubs through them.
- **Regenerate** draws new paths; the **Lines** and **Steps** inputs + **Apply** resize the set.
- **Line** select with ◀ ▶ picks one path. **View**: selected only / selected + faint others / all equal.
- **Pick interesting** + **Find** selects the path that scores best on one measure and switches the view to "selected only": straightest (least SSE to the best-fit line), greatest range, most zero-crossings, longest one-direction streak, largest max drawdown, earliest to reach 75% of the global max |y|, or largest area under |y|.
- Scroll to zoom, drag to pan the canvas.

## Style

Dark slate theme (`#0f172a`, sky-blue accent), system sans. It predates `AESTHETIC.md` and is not restyled to the site palette.

Static, no build step; deploys on push to `main`.
