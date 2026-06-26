# Micro graphs — reference

Hand-authored SVG teaching diagrams in this folder. All share one house style so they
can be dropped into IBecon pages without redrawing. This file documents what each graph
shows and its key labels, so future edits/usage need not open the image.

Served from `unisam.nz/ibecon/graphs/<name>.svg` (Astro copies `public/` as-is at build).

## Shared style

- Canvas 680×540 (elastic-vs-inelastic 680×560), `font-family="Georgia, serif"`.
- Bold title centred at top. No "0" origin label.
- Axes: y-axis x=90 (y 60→470), x-axis y=470 (x 90→610), stroke #333.
- Axis labels at the **ends** (not the middle): price/cost rotated on the left, quantity at the right end.
- Demand = green `#14746F`; Supply = darker teal `#0D5C57`; externality / DWL / highlight = red `#C0392B`.
- Dashed reference lines grey (`#888` primary, `#aaa` secondary). Equilibrium uses plain `Pe`/`Qe`; shifts use subscripts `₁`/`₂` (`&#8321;`/`&#8322;`).
- `originals/` holds the user's hand-drawn JPG references — not used on the site.

## Foundations

- **ppc.svg** — production possibilities curve, concave to the origin. Axes: **Capital goods** (y) vs **Consumer goods** (x). Points A and B sit on the curve (efficient, showing the trade-off / opportunity cost), X is inside (inefficient, unemployed resources), Z is outside (unattainable). Used in Unit 1 (scarcity, opportunity cost, efficiency) and Unit 3 (potential output / growth).

## Demand & supply basics

- **demand-curve.svg** — single downward-sloping demand curve (green). Illustrates the law of demand.
- **supply-curve.svg** — single upward-sloping supply curve (teal). Illustrates the law of supply.
- **market-equilibrium.svg** — D and S crossing at one point; equilibrium price `Pe` and quantity `Qe` marked with dashed lines.
- **surplus-and-shortage.svg** — D and S with a price above Pe (excess supply / surplus) and a price below Pe (excess demand / shortage) shown.

## Movements vs shifts

- **movement-along-demand.svg** — a price change causing movement between two points on a fixed demand curve.
- **decrease-in-price--movement-along-the-demand-curve.svg** — price falls → quantity demanded rises; margin direction arrows. (Recreated from user's JPG.)
- **increase-in-price--movement-along-the-demand-curve.svg** — price rises → quantity demanded falls.
- **decrease-in-price--movement-along-the-supply-curve.svg** — price falls → quantity supplied falls.
- **increase-in-price--movement-along-the-supply-curve.svg** — price rises → quantity supplied rises.
- **shift-in-demand.svg** — whole demand curve shifts (D₁ → D₂) with new equilibrium; non-price determinant change.
- **shift-in-supply.svg** — whole supply curve shifts (S₁ → S₂) with new equilibrium.

## Elasticity & revenue

- **elastic-vs-inelastic-demand.svg** — steep (inelastic) vs flat (elastic) demand curves compared. Canvas height 560.
- **elastic-vs-inelastic-supply.svg** — steep (inelastic, small ΔQ) vs flat (elastic, large ΔQ) supply for the same ΔP. Sibling of the demand version. Canvas height 560.
- **extreme-elasticities.svg** — 2×2 grid: perfectly inelastic (vertical) and perfectly elastic (horizontal) for both demand and supply, labelled PED/PES = 0 and ∞. Canvas 780×620.
- **ped-and-total-revenue.svg** — flat (elastic) demand; price falls P₁→P₂ and TR rises. TR₁ (smaller) amber box, TR₂ (much larger) blue box, drawn so the size difference is obvious.

## Welfare

- **consumer-producer-surplus.svg** — D and S at equilibrium; **consumer surplus** shaded **blue** (above Pe, under demand), **producer surplus** shaded **amber/orange** (below Pe, above supply). Two surpluses use distinct colours so they read apart from the teal curves.

## Externalities

All four use a third red curve diverging from the private curve; show market equilibrium
(`Pm`, `Qm`, grey) vs social optimum (`P*`, `Q*`, teal) and a red **DWL** triangle.
Axis label is "Price / Cost / Benefit".

- **negative-production-externality.svg** — MSB = demand, MPC = supply; **MSC** (red) above supply. Q\* < Qm (overproduction). DWL right of Q\*.
- **positive-production-externality.svg** — MSB = demand, MPC = supply; **MSC** (red) below supply. Q\* > Qm (underproduction).
- **negative-consumption-externality.svg** — MPB = demand, MSC = supply; **MSB** (red) below demand. Q\* < Qm (overconsumption).
- **positive-consumption-externality.svg** — MPB = demand, MSC = supply; **MSB** (red) above demand. Q\* > Qm (underconsumption, e.g. education/vaccines).

## Government intervention

- **indirect-tax.svg** — specific tax shifts supply up to dashed **S + tax**. Consumers pay `Pc`, producers keep `Pp`, quantity falls `Qe`→`Qt`. **Tax revenue** box (teal) = tax × Qt; red **DWL** triangle.
- **subsidy.svg** — subsidy shifts supply down to dashed **S + subsidy**. Producers receive `Pp`, consumers pay `Pc`, quantity rises `Qe`→`Qs`. **Subsidy cost** box (teal) = subsidy × Qs; red **DWL** triangle (overprovision).
- **tax-incidence-elasticity.svg** — two panels, same specific tax. Left = inelastic demand (consumer-burden box blue is large, producer-burden amber thin); right = elastic demand (reversed). `Pc`/`Pe`/`Pp`, `Qt` marked. Shows who bears the tax depends on PED. Canvas 960×560.

## Price controls

Binding control line drawn in purple `#7D3C98`. Each comes in a basic and a welfare version.

- **price-ceiling.svg** — ceiling `Pc` set **below** Pe. At Pc: `Qs` (supply, short side) < `Qd` (demand). Double-arrow under the axis labels the **Shortage** between Qs and Qd.
- **price-floor.svg** — floor `Pf` set **above** Pe. At Pf: `Qd` (short side) < `Qs`. Double-arrow labels the **Surplus** (excess supply) between Qd and Qs.
- **price-ceiling-welfare.svg** — traded quantity = Qs (= `Q₁`). Consumer surplus blue (now includes the transfer rectangle taken from producers), producer surplus amber, red **DWL** triangle between Q₁ and Qe. Title "Price ceiling: welfare effects".
- **price-floor-welfare.svg** — traded quantity = Qd (= `Q₁`). Producer surplus amber (gains the transfer rectangle from consumers), consumer surplus blue, red **DWL** triangle between Q₁ and Qe.

## Not yet drawn (candidates)

Minimum wage in the labour market, common access resources / tragedy of the
commons (over-extraction), monopoly vs perfect competition allocative efficiency
(only if Market Power 2.11 needs it).
