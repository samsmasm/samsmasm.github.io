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
- [ ] **adas-nc-self-correction.svg** — SRAS slides to restore Y_fe

### AD/AS Keynesian (reverse-L AS)
- [ ] **adas-kn-as.svg** — Keynesian AS alone (flat → rising → vertical)
- [ ] **adas-kn-equilibrium.svg** — equilibrium (with the three regions)
- [ ] **adas-kn-recessionary-gap.svg**
- [ ] **adas-kn-inflationary-gap.svg**
- [ ] **adas-kn-ad-increase.svg** — AD rising across the three regions

### Growth (3.3)
- [ ] **growth-nc-actual.svg** — AD shift right
- [ ] **growth-nc-potential.svg** — LRAS shift right
- [ ] **growth-kn.svg** — growth on a Keynesian diagram
- [ ] **growth-ppc.svg** — PPC outward shift (macro-styled)

### Inflation & deflation (3.3)
- [ ] **inflation-nc-demand-pull.svg**
- [ ] **inflation-nc-cost-push.svg**
- [ ] **inflation-kn-demand-pull.svg**
- [ ] **inflation-nc-deflation.svg**

### Unemployment / labour (3.3)
- [ ] **unemp-minimum-wage.svg** — labour market, binding minimum wage (ref: minimum wage.png)

### Phillips curves (3.3, HL)
- [ ] **phillips-sr.svg** — short-run Phillips curve
- [ ] **phillips-lr.svg** — long-run (vertical at NRU) + stagflation shift

### Inequality, poverty & tax (3.4)
- [ ] **inequality-lorenz.svg** — Lorenz curve with plotted points (ref: gini.png)
- [ ] **inequality-gini.svg** — Lorenz with Gini areas A/B shaded (ref: gini2.png)
- [ ] **inequality-lorenz-compare.svg** — two Lorenz curves compared
- [ ] **inequality-tax-structures.svg** — progressive / proportional / regressive
- [ ] **inequality-laffer.svg** — Laffer curve (ref: laffercurve.png)

### Monetary policy (3.5)
- [ ] **money-market.svg** — money demand + supply → interest rate (HL)
- [ ] **money-transmission-nc.svg** — interest rate → investment → AD shift
- [ ] **money-policy-nc.svg** — expansionary / contractionary on AD/AS

### Fiscal policy (3.6)
- [ ] **fiscal-nc-expansionary.svg**
- [ ] **fiscal-kn-expansionary.svg**
- [ ] **fiscal-crowding-out.svg** — loanable funds / money market (HL)

### Supply-side policies (3.7)
- [ ] **supply-nc.svg** — LRAS (and SRAS) shift right
- [ ] **supply-kn.svg** — supply-side on a Keynesian diagram

### Time-series / models (3.1)
- [ ] **cycle-business.svg** — real GDP around trend (ref: business cycle.png)
- [ ] **cycle-circular-flow.svg** — circular flow of income (optional)
