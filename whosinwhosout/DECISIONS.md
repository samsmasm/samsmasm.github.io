# Decisions (V1, 29 Oct 2026)

Judgement calls made to ship V1 fast. Change any of these freely.

## Data
- **Electoral Commission results site blocks scripts** (Cloudflare 403 on electionresults.govt.nz and the archive). Not worked around. Per-candidate 2023 electorate votes come from each electorate's Wikipedia article instead (they cite the official results). If you want the official CSVs, download them in a browser into `data/raw/`.
- **Te Atatū 2023**: the Wikipedia results table has the wrong winner-party on a "hold" row. For "hold" rows the build uses the incumbent's party (Labour, Phil Twyford), which matches the vote box.
- **Greens** have an initial and a final list on the lists page; the build uses the last (final) one.
- **Port Waikato** uses the 25 Nov 2023 by-election (Andrew Bayly, National).
- **2023 national party vote** is read from the "2023 election result" row of the polls table (2 decimal places). The 2023 reproduction test passes with it (122 seats, N48 L34 G15 A11 NZF8 TPM6).
- Pollster names are grouped: "Taxpayers' Union–Curia" and "Curia" are both **Curia**; 1 News–Verian is **1News Verian**; The Post/Freshwater Strategy is **Freshwater Strategy**.

## Model
- Only the **latest poll from each pollster** counts (Sam, 29 Oct), so a pollster that polls more often gets no extra say. Before this, 1News Verian's 5 recent polls made up 44% of the average.
- Poll window is anchored on the **newest poll in the data**, not today's date, so an old link gives the same average.
- Polls with no published sample size are treated as n = 1000.
- "Other" in each poll uses the Others column, or 100 minus the listed parties if blank.
- **Hold 2023 gives a big overhang** (National holds 44 electorates on about 28% of the vote, so the House is about 134). That is what the assumption implies; the page explains overhang rather than hiding it.
- Uniform swing: only the seven polled parties swing; independents and minor parties keep their 2023 share. If the predicted winner has no 2026 candidate (Labour in Tāmaki Makaurau under swing), the seat still goes to that party and shows "Candidate TBC (none listed)".
- **Default seat model is uniform swing** (Sam, 29 Oct), not Hold 2023 as in the brief. Hold 2023 gave National a 9-seat overhang on 27.5% of the vote, which comes from the assumption, not the polls. Share links are now `v=2`; a `v=1` link with no `model` still opens as Hold 2023.
- **Hand-called seats in the swing model** (Sam, 29 Oct): `data/manual/swing_calls.csv`. The Māori seats follow their latest electorate polls (Te Tai Tokerau to Green, Te Tai Tonga and Ikaroa-Rāwhiti to Labour), except Tāmaki Makaurau, whose polls are split and which stays with TPM. Tāmaki goes to National: Brooke van Velden (ACT) is retiring and the only published poll is a leaked, unverified one. Hold 2023 is unchanged.
- If a party's list runs out, the seats show as unfilled (not reallocated).

## Boundary mapping (`data/manual/electorate_mapping.csv`)
Medium or low confidence, please review:
- Glendene <- Kelston (medium; half Kelston, half Te Atatū, both Labour)
- Henderson <- Te Atatū (medium)
- Waitākere <- New Lynn (medium; New Lynn was won by National in 2023)
- Kapiti <- Ōtaki (medium; National. Mana, Labour, supplied northern Porirua)
- Kenepuru <- Ōhāriu (low; Ōhāriu vs Mana, both Labour so hold result is the same)
- Mount Maunganui <- Bay of Plenty (medium)
- Tauranga <- Tauranga (medium; moved west)
- Wellington North <- Wellington Central (medium)

2023 seat with no successor: Mana.

## Seat overrides
- Each electorate has a dropdown: the model's pick, or any party that came 1st, 2nd or 3rd in its 2023 predecessor (independents and minor parties skipped). Picked from the 2023 top three, not any party, to keep the list short and plausible.
- The named MP is the chosen party's 2026 candidate in the seat ("Candidate TBC" if it has none).
- Stored in the link as `seats=Slug:PARTY,...`. A link with an unknown seat or a party outside that seat's top three just drops it. Overrides beat both seat models and survive toggling between them.

## Site
- Lives at `samsmasm.github.io/whosinwhosout/` (unisam.nz/whosinwhosout). The folder itself is the deployable site, so there is no separate `dist/`.
- Data is shipped as `data.js` (a plain script) so the page also works opened from disk.
- Look borrowed from /asia (2026-10-30, Sam's request): archive paper, white panels, indigo accent, Barlow Condensed headings, Atkinson Hyperlegible body, dashed strip at the top, no subtitle. Party colours only on chips, the bar and the seat pickers. Ballot box favicon (favicon.svg). Dark mode follows the system setting.
- Not yet added to `/find` or any index page.
