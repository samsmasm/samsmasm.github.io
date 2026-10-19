# Wet Bulb Range, `/weather`

Weather tool for 152 cities. A sortable, searchable league table (feels like, temperature, wet bulb, humidity, peak sun, UV) for today, tomorrow and the day after, with each figure shown as a range across several weather models. Tapping a city opens a detail view: a model-by-model forecast (rain, temperature, sun, storm energy, wind, dew point, air quality) plus the original wet bulb breakdown and a "Guess first" game.

Built on Sam's phone in a Claude chat, then moved here. Single static file: `index.html` (CSS, markup and one script in an IIFE). No build step, no backend, no API key. Deploys on push to `main` like the rest of the repo, so follow the root `CLAUDE.md`. Keep it off the public index (`index.html`, `/tools`, `/experiments`) until Sam decides where it goes. Add files by name, never `git add -A`.

## Status

- **Live data tested against the real Open-Meteo API on 2026-10-20** (jsdom with real `fetch`): all 150 cities live, city detail live with all 8 models, no errors.
- **Concurrency limit:** Open-Meteo returns 429 "Too many concurrent requests" when the page fires all 12 requests at once (half the cities silently fell back to example data). Every request now goes through one queue (`NET`, `getJson`): at most 3 in flight, 429 retried up to 3 times with back-off, city-detail requests jump the queue. Do not bypass it with a bare `fetch`.
- When a live fetch fails the page falls back to labelled **Example data**: rough mid-October guesses per city plus simulated spread, rain, wind and air quality. That is only a demo. Never present example values as a forecast.
- All 8 model keys work (`ecmwf_ifs025`, `gfs_seamless`, `icon_seamless`, `gem_seamless`, `jma_seamless`, `meteofrance_seamless`, `ukmo_seamless`, `cma_grapes_global`). Known gaps in real responses: **`uv_index` only comes from GFS** (all other models return null); JMA has no gusts, shortwave or CAPE; UKMO shortwave stops partway through day 3. Gaps are left out of averages and ranges, never counted as zero, and the page notes say so.
- **UV has a second source: CAMS** from the air quality API. League: `uvUrl` fetches `uv_index` for each 15-city chunk alongside the forecast (failure just leaves GFS alone), merged in `parseDays(h, uvh)`. Detail: `aqUrl` asks for `uv_index` too and `parseFc` stores it as `H.uv.cams`; `across` adds `cams` to the sources for any key that has it. `cams` is deliberately not in `fc.models`, so it never shows up in rain or temperature charts or model counts.
- Requests are retried on 429 (up to 3 times) and on network errors (up to 2 times), but not after the 20 s timeout.

## Data source

Open-Meteo forecast API (free, no key, **non-commercial use only**, CC BY 4.0, so keep the attribution in the page notes). Limits: 600 calls a minute, 5,000 an hour, 10,000 a day. It allows browser requests from any site, so no proxy or Worker is needed.

- League table: 10 requests of 15 cities each (4 models, hourly, 3 days), about 1.5 MB. Cached in `localStorage` key `wbr-live3` for 10 minutes.
- City detail: 2 requests when a city is selected (8 models; plus the separate air quality API). Kept in memory for 10 minutes, with a 2 minute back-off after a failure.
- Hourly variables: `temperature_2m`, `relative_humidity_2m`, `apparent_temperature`, `surface_pressure`, `shortwave_radiation`, `uv_index` (league); plus `dew_point_2m`, `precipitation`, `cloud_cover`, `wind_speed_10m`, `wind_gusts_10m`, `cape` and daily `sunrise`/`sunset` (detail). Times are the city's local time (`timezone=auto`).

## How it works

- **Wet bulb:** Stull (2011) from temperature and humidity (about 1 degree accuracy), or a full psychrometric solve using pressure (toggle in the detail view). Wet bulb here is plain wet bulb, not WBGT.
- **League table:** each day uses that city's "peak hour", the hour with the highest median Stull wet bulb across models, in local time. Temperature, humidity, feels like and pressure are taken at that hour. Sun is the day's maximum shortwave radiation and UV the day's maximum UV index. Four models. Each cell shows the middle value (median when four or more sources, else mean) with low to high underneath.
- **Forecast detail:** eight models. Resolution depends on the day: today hourly, tomorrow 3-hour blocks, day after 6-hour blocks (`BSIZE = [1, 3, 6]`). Hours already gone today are the models' own estimate, not station readings.
- **Temperature, feels like, wet bulb:** averaged across models, with a band for lowest to highest.
- **Rain is deliberately not just averaged** (Sam's call: models disagree on whether and when it rains). The stacked bars show the average rate with each model's share in its own colour, so a long drizzle (many colours in each hour) looks different from separate short downpours (one colour per bar). Also: four 6-hour totals with share of day, a dot per model for the day total, and an optional per-model view with 2.5 and 7.5 mm/h guide lines. Do not collapse this into a single average.
- **Heat level** uses thresholds chosen by Claude, not an official scale and not yet reviewed by Sam: feels like 32/38/45 and wet bulb 25/28/31 degrees C mark Warm/Hot/Severe. **Best and hardest three hours** (6am to 6pm local, daylight only) score feels like + 6 x share of models with rain + 0.3 x UV.
- Other strips use common bands: UV (WHO), US AQI, CAPE (500/1500/2500/3500 J/kg), gusts (25/40/55/75 km/h), dew point (18/21/24/26 degrees C). All defined as small `lv*` functions near `HEAT`.
- Example mode is simulated in `exFc` (forecast detail) and `fresh` (league). Both are deterministic per city.

## Code map (all in `index.html`)

- `RAW` city list: name, country, extra search words, lat, lon, typical afternoon temp, RH, pressure (example mode only). Search is word-prefix (`words`), so "uk" does not match "Kyiv".
- Your places (card under the day picker): saved cities as chips showing feels like for the chosen day, a "Find a city" box (works with the table hidden), and the Hide table / Show table toggle. Saved list and table visibility live in `localStorage` key `wbr` (`places`, `table`). Code: `renderPlaces` (called from `update`), `applyTableVis`/`setTable`, `findMatches`/`renderFind`. The Save button is `#saveBtn` in the city header.
- League: default sort feels like, highest first; the last sort used is saved in `localStorage` key `wbr` (with city and method) and restored on the next visit. `COLS`, `rowStats`, `renderLeague`, `parseDays`, `loadLiveAll`.
- Detail, wet bulb part: `calc`, `update`, `chartSVG`, game functions.
- Forecast detail: section starting `/* ---------- forecast detail for the selected city ---------- */`: `exFc`, `parseFc`, `fcLoad`, `across`/`agg` (block statistics across models), `rainSVG`, `tempSVG`, `sunSVG`, `stripsSVG`/`stripRows`, `renderForecast`, `tipFor`.

## Design

Currently does **not** follow `AESTHETIC.md`: it uses Barlow Condensed and IBM Plex (Google Fonts), pill buttons, grey card backgrounds and a system dark mode. Restyling to the site look is a likely next job. Keep the data-viz encoding when restyling: every model colour carries a letter (E, G, I, C, J, F, U, M), no meaning rests on colour alone, and the four extra models are greys. On phones the layout is one column (Sam uses it on his phone); keep it working at 360px with no sideways page scroll. From 1000px wide it becomes a dashboard: the table is a sticky left column (560px, scrolls on its own) and the city's panels form a grid (`#detail` is a CSS grid, `#fcBox` is `display: contents` so its cards join that grid); with the table hidden the panels take the full width. The primary purpose is now the weather at your chosen city; the ranking table is secondary and hideable.

## Testing

`tests/run.js` and `tests/run2.js` run the page in jsdom, in example mode and with a fake Open-Meteo `fetch`: row counts, sorting, search, day switching, game flow, all 150 cities across the three days, no NaN or undefined in the forecast section. From `tests/`: `npm install jsdom --no-save` (never commit `node_modules`), then `node run.js` and `node run2.js` (run2 takes a few minutes). Neither replaces a look at the real page on a phone.

## Ideas not built

- Rain column in the league table (day total and chance, with range across models).
- Weight models by how well each has done for a city lately, using Open-Meteo's past-forecast archive.
- Compare against real observations for HCMC (Tan Son Nhat airport).
- UTCI or WBGT. Open-Meteo has no radiant temperature or longwave data, so any version would be approximate.
