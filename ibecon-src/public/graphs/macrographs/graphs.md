# Macro graphs — reference & plan

Hand-authored SVG macro diagrams for IBecon Unit 3. Served from
`unisam.nz/ibecon/graphs/macrographs/<name>.svg`.

`originals/` holds the Kognity reference PNGs that define the target style.

## House style (Kognity conventions)

Different from the micro set. Match the reference PNGs:

- **Sans-serif** font (`'Segoe UI', 'Helvetica Neue', Arial, sans-serif`). No baked-in title — the page figcaption carries the label.
- **Colour roles** (consistent across every diagram):
  - AD and demand-side / equality lines: **blue** `#1F4DA1`
  - SRAS, Keynesian AS, and policy lines (min wage, Lorenz curve): **magenta** `#C81E5A`
  - LRAS and vertical full-capacity lines: **gold** `#E8A200`
  - axes, neutral curves (Laffer), text: near-black `#222`
  - dashed projection lines: grey `#777`
- **Axes have arrowheads** on both ends; **origin labelled "0"**.
- Subscripts via `&#8321;`/`&#8322;`; `Y_fe` for full-employment output.
- Curve labels at the line ends; **shift arrows** show movement (centred in the gap between the curves); filled dots at key points; dashed projection lines to the axes.
- **Shifts label the original curve `₁` and the new curve `₂`** (e.g. AD₁ → AD₂, SRAS₁ → SRAS₂), not AD → AD₁.

## Naming convention

`topic-model-variant.svg` (kebab-case). Topic first so related diagrams cluster
in the folder; model code second (`nc` neoclassical, `kn` Keynesian; omitted when
model-agnostic); then the variant. HL items tracked here, not in the filename.

Topic prefixes: `adas-` `growth-` `inflation-` `unemp-` `phillips-` `money-`
`fiscal-` `supply-` `inequality-` `cycle-`. Output gaps live under `adas-`.

## Neoclassical model: straight SRAS + vertical LRAS

The IB neoclassical SRAS is a **straight upward line**, with a separate vertical
LRAS at Y_fe. Y_fe / the LRAS intersection is shown where contextually relevant
(gaps, growth, long-run adjustment) and omitted on the plainest building blocks.

---

## Planned graphs

Status: [x] done, [ ] to do.

### AD/AS building blocks (shared)
- [x] **adas-ad.svg** — AD curve alone
- [x] **adas-ad-increase.svg** — AD shifts right (AD&#8321; → AD&#8322;)
- [x] **adas-ad-decrease.svg** — AD shifts left (AD&#8321; → AD&#8322;)

### AD/AS neoclassical (straight SRAS, vertical LRAS)
- [x] **adas-nc-sras.svg** — straight SRAS alone
- [x] **adas-nc-lras.svg** — vertical LRAS alone at Y_fe
- [x] **adas-nc-equilibrium.svg** — AD + SRAS + LRAS long-run equilibrium at Y_fe
- [x] **adas-nc-recessionary-gap.svg** — AD&#8321; left of LRAS; recessionary/deflationary gap
- [x] **adas-nc-inflationary-gap.svg** — AD&#8321; right of LRAS; inflationary/expansionary gap
- [x] **adas-nc-self-correction.svg** — recession self-corrects: SRAS&#8321; → SRAS&#8322; (rightward) restores Y_fe at a lower price

### AD/AS Keynesian (reverse-L AS)
- [x] **adas-kn-as.svg** — Keynesian AS alone (flat → rising → vertical), Y_fe marked
- [x] **adas-kn-equilibrium.svg** — equilibrium in the intermediate region; three regions labelled
- [x] **adas-kn-recessionary-gap.svg** — AD&#8322; left of Y_fe; gap Y&#8321; → Y_fe below axis
- [x] **adas-kn-inflationary-gap.svg** — AD&#8322; raises PL only (output stays Y_fe); gap shown horizontally at PL&#8321;
- [x] **adas-kn-ad-increase.svg** — AD&#8321;/AD&#8322;/AD&#8323; across the three regions, with PL&#8321;/&#8322;/&#8323; and Y&#8321;/&#8322;/fe

### Growth (3.3)
- [x] **growth-nc-actual.svg** — actual growth: AD&#8321; → AD&#8322; right, both eq below Y_fe (using spare capacity)
- [x] **growth-nc-potential.svg** — potential growth: LRAS&#8321; → LRAS&#8322; (and SRAS) shift right, output up / price down
- [x] **growth-kn.svg** — Keynesian demand-led growth: AD&#8321; → AD&#8322; in the flat region, output up with no inflation
- [x] **growth-ppc.svg** — PPC outward shift (capital vs consumer goods), macro-styled

### Inflation & deflation (3.3)
- [x] **inflation-nc-demand-pull.svg** — AD&#8321; → AD&#8322; right; PL and Y rise
- [x] **inflation-nc-cost-push.svg** — SRAS&#8321; → SRAS&#8322; left; PL rises, Y falls (stagflation)
- [x] **inflation-kn-demand-pull.svg** — AD&#8321; → AD&#8322; in the steep region; mostly price rise
- [x] **inflation-nc-deflation.svg** — AD&#8321; → AD&#8322; left; PL falls (deflation)

### Unemployment / labour (3.3)
- [x] **unemp-minimum-wage.svg** — labour market, binding minimum wage above W*; L_D &lt; L_S gives unemployment (surplus)

### Phillips curves (3.3, HL)
- [x] **phillips-sr.svg** — short-run Phillips curve (downward, convex; inflation–unemployment trade-off)
- [x] **phillips-lr.svg** — vertical LRPC at NRU; SRPC&#8321;/SRPC&#8322; with A→B→C expectations adjustment

### Inequality, poverty & tax (3.4)
- [x] **inequality-lorenz.svg** — Lorenz curve (blue) with quintile points A–E vs the line of equality
- [x] **inequality-gini.svg** — Lorenz (magenta) vs equality line (blue); area A (gold) and B (blue) shaded; Gini = A/(A+B)
- [x] **inequality-lorenz-compare.svg** — more equal (blue) vs less equal (magenta) Lorenz curves
- [x] **inequality-tax-structures.svg** — progressive (blue, up), proportional (gold, flat), regressive (magenta, down)
- [x] **inequality-laffer.svg** — inverted-U revenue vs tax rate; R_B at optimal rate T*

### Monetary policy (3.5)
- [x] **money-market.svg** — MD (blue) + vertical MS (magenta) → r*, Q*
- [x] **money-policy-nc.svg** — expansionary: MS&#8321; → MS&#8322; right, interest rate r&#8321; → r&#8322; falls
- [x] **money-transmission-nc.svg** — two-panel: MS shift lowers r (money market) → AD&#8321; → AD&#8322; right (goods market)

### Fiscal policy (3.6)
- [x] **fiscal-nc-expansionary.svg** — AD&#8321; → AD&#8322; right closing a recessionary gap to Y_fe; PL rises
- [x] **fiscal-kn-expansionary.svg** — AD&#8321; (flat) → AD&#8322; (intermediate); large output rise, small price rise
- [x] **fiscal-crowding-out.svg** — loanable funds: govt borrowing shifts D&#8321; → D&#8322; right, r rises (crowds out investment)

### Supply-side policies (3.7)
- [x] **supply-nc.svg** — LRAS&#8321; → LRAS&#8322; and SRAS&#8321; → SRAS&#8322; shift right; output up, price down
- [x] **supply-kn.svg** — Keynesian AS&#8321; → AS&#8322; shifts right (Y_fe rightward); output up, price down

### Time-series / models (3.1)
- [x] **cycle-business.svg** — real GDP cycle (blue) around the rising long-term trend (magenta); peak/trough/recovery/recession
- [x] **cycle-circular-flow.svg** — 2-sector circular flow; money flows (magenta) and real flows (blue) between households and firms
