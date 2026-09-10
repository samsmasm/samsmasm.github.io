# CLAUDE.md — IBecon Inequality

## What this is

**IBecon Inequality** is an interactive IB Economics simulation on taxation and redistribution. Students explore how different tax systems (progressive, regressive, proportional) affect income inequality, using a Lorenz curve and Gini coefficient. Supports multiple screen/activity modes.

Live at: `unisam.nz/ibeconinequality/`

---

## File structure

Single file: **`index.html`** (~1880 lines). All HTML, CSS, and JS in one file. No external dependencies.

---

## Colour scheme

Economics teal. This is the **same** palette as the main IBecon site at `/ibecon/`
(`ibecon-src/src/styles/global.css`), not a contrasting one, so the two read as siblings:
- `--teal: #0D5C57`      (main site `--navy`)
- `--teal-dark: #094843` (main site `--navy-dark`)
- `--teal-mid: #14746F`  (main site `--blue`)
- `--teal-light: #A7E8E4`
- `--teal-pale: #E8F8F7`

Keep them in step: if the main site's teal changes, change these to match.

---

## Architecture

**Screen-based** with `.screen` divs toggled by `.active` class. Screens are:
- Setup / intro
- Simulation (interactive tax system adjustor)
- Results (Lorenz curve, Gini coefficient)

**No external chart library** — charts drawn with Canvas 2D API.

---

## Key concepts simulated

- Lorenz curve visualisation
- Gini coefficient calculation
- Progressive vs regressive vs proportional tax effects
- Redistribution via transfer payments
- Before/after tax income distribution comparison

---

## Constraints

- Keep in one file.
- Content must be accurate to IB Economics HL curriculum (Unit 2: Microeconomics — market failure + equity).
- Canvas rendering: do not add Chart.js or other libraries — the existing canvas implementation is intentional.

---

## Current status

Working simulation. No known bugs or planned features.

**Security note:** A hardcoded Anthropic API key was found and removed from `cloudflare-worker.js` (replaced with `env.ANTHROPIC_API_KEY`). The old key was deleted but the git history has not been scrubbed. Low risk but worth knowing.
