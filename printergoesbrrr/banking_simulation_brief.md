# Project Brief: Classroom Banking Simulation — Central Bank Visualiser

## Overview

A single-player interactive web simulation where the user plays the role of a central bank, setting interest rates each round and watching money being created and flowing through a simplified economy in real time. The primary purpose is educational: to demonstrate that commercial banks create money through lending, and that the central bank rate is the key lever controlling how much money gets created.

This is a companion tool to a classroom simulation activity. It should be usable standalone by a student or teacher wanting to explore the mechanics without a full class.

---

## Economic Model

### The Actors

**3 Commercial Banks**
- Each starts with 150 in reserves (physical cash)
- Each round they decide a lending rate (must be at or above the central bank rate)
- They lend to producers by creating deposits — no pre-existing money required
- At settlement they receive asset owner deposits and producer repayments
- If reserves fall short they borrow from the central bank at the CB rate
- If they have surplus reserves they can deposit with the central bank

**3 Asset Owner pairs** (simulated)
- Each controls 2 ingredient monopolies (flour/milk, sugar/baking powder, butter/eggs)
- They sell ingredients to producers at prices they set
- They accumulate cash from sales
- At settlement they must deposit all cash at one of the 3 banks (their choice, based on bank health)
- They do not earn interest on deposits

**6 Producer pairs** (simulated)
- They borrow from whichever bank offers the best rate
- They use loans to buy all 6 ingredients (one unit each)
- A complete set of 6 ingredients = one cake
- Cakes sell to the consumer demand pot for 100 each
- Loans must be repaid by end of game (not each round) — producers can reinvest cake revenue
- If a producer cannot repay at the end, the bank records a bad debt

**The Player — Central Bank**
- Sets the central bank interest rate each round
- Holds the consumer demand pot (starts at 1,500 — maximum 15 cakes can be sold)
- Can observe all balance sheets and money flows in real time

### Money Creation Mechanic

This is the core insight the simulation must demonstrate:

When a bank issues a loan of 100 to a producer:
- The bank records +100 on its asset side (loan)
- The bank simultaneously creates +100 on its liability side (deposit)
- No pre-existing money is used
- The deposit is new money, created by the act of lending

Physical cash does not change. But the total deposit money in the economy grows with every loan. The gap between physical cash (fixed at 1,950 total: 450 in bank reserves + 1,500 consumer pot) and total deposits across all banks is the "created money" — the key reveal.

### Starting Positions

| Actor | Physical cash |
|-------|--------------|
| Each bank (×3) | 150 |
| Consumer demand pot (teacher/player) | 1,500 |
| Asset owners | 0 |
| Producers | 0 |
| **Total** | **1,950** |

### Round Structure

5 rounds total. Central bank rate sequence: 0% → 10% → 20% → 20% → 0%

Each round:
1. Player sets CB rate (or accepts default sequence)
2. Banks announce their lending rates (CB rate + simulated margin)
3. Trading phase: producers borrow, buy ingredients, make cakes, sell to consumer pot
4. Settlement: asset owners deposit cash at banks, banks calculate position, shortfalls borrow from CB
5. Balance sheets update visibly, money flow animations play out

### Key Constraints

- Banks cannot lend below the CB rate (would mean lending at a loss)
- Asset owners must deposit all cash at settlement (choice of bank is free)
- Producers repay loans at end of game, not each round
- Consumer pot is finite: once 1,500 is spent (15 cakes), no more cakes can be sold
- Producer default is possible: if they cannot repay, bank records a bad debt

---

## The Visualisation

### Core Visual Concept

The screen should show money visibly flowing between actors. This is not a spreadsheet — it is a live economic diagram where:

- Loan creation triggers an animation showing a deposit appearing simultaneously on the bank's liability side
- Cash moving between actors is shown as animated tokens or flowing numbers
- Balance sheets update in real time as transactions occur
- The gap between physical cash and total deposits grows visibly over rounds

### Layout

**Central area**: A node diagram showing the 5 actor types (3 banks, asset owners, producers, consumer/player) connected by animated flow lines. Money moves along these lines during trading.

**Bank panels**: Each of the 3 banks has a visible mini balance sheet showing:
- Assets: loans outstanding (per producer, with rate)
- Liabilities: deposits owed
- Reserves: physical cash held
- Health indicator: reserves vs obligations ratio (green/amber/red)

**Player controls** (bottom or side panel):
- CB rate slider (0–20% in 5% increments, or 1% if you want finer control)
- "Advance round" button
- Consumer pot remaining (drains as cakes sell)
- Round counter and current CB rate display

**Money supply panel** (always visible):
- Physical cash in economy: always 1,950
- Total deposits across all banks: grows each round
- Created money (difference): the number to watch
- Simple bar or chart showing the gap growing over time

**Event log**: A running feed of what just happened — "Bank 2 lent 60 to Producer 4 at 15%" — so the player can follow the logic even during fast simulation.

### Simulation Logic (what the computer decides)

Since this is single-player, the computer simulates bank lending decisions, producer behaviour, and asset owner deposit choices. Suggested logic:

**Banks** set lending rate = CB rate + random margin (5–15%). They lend to producers who apply, up to a prudent reserve ratio. Aggressive banks lend more, conservative banks hold back. Personality can be fixed per bank.

**Producers** apply to the bank with the lowest rate. They borrow enough to buy all 6 ingredients. If rates are too high (above ~25%) some producers decide not to borrow — the economy slows. If consumer pot is nearly empty, producers also slow down.

**Asset owners** set ingredient prices (suggest: 8–15 per ingredient, randomised each round within that range, totalling 60–80 per full set). They deposit at the healthiest-looking bank at settlement.

**Ingredient prices** should vary round to round to add realism and make producer profit margins uncertain.

### The Money Count (end of game)

After round 5, a final screen shows:

- Physical cash in economy: 1,950 (unchanged)
- Total deposits created: [sum of all bank liability sheets]
- Created money: [deposits minus 1,950]
- A clear explanation: "Nobody printed this money. Banks created it by writing loans."

Optionally: a timeline chart showing how deposits grew each round vs physical cash staying flat.

---

## Design Direction

**Aesthetic**: Clean, data-rich, slightly editorial. Think financial terminal meets educational infographic. Dark background (navy or near-black) with sharp accent colours for money flows. Numbers should feel weighty and real. Avoid generic dashboard aesthetics — this should feel like something a central banker would actually use.

**Typography**: A distinctive serif or slab serif for headings and large numbers. Monospace for balance sheet figures. Clear hierarchy.

**Colour language**:
- Physical cash / reserves: gold or amber
- Loans (assets): blue
- Deposits (liabilities): green
- Shortfall / bad debt: red
- Created money: a distinct highlight colour — this is the star of the show

**Animation**: Money flow should be the primary animation — smooth, visible, not instant. Loan creation should be the most dramatic moment: watch a deposit appear on the liability side the instant the loan is written on the asset side. Settlement flows should be slower and more deliberate so the player can follow them.

**Speed control**: Player should be able to slow down or speed up the simulation during trading phases.

---

## Technical Notes

- Plain HTML/CSS/JS is fine, or React — whatever produces the best result
- No backend required — all simulation logic runs client-side
- Should work in a modern browser without installation
- Mobile is not a priority — this is a classroom/desk tool
- Should be hostable as a single HTML file on GitHub Pages if possible

---

## What Success Looks Like

A teacher or student can:
1. Load the page and immediately understand what they're looking at
2. Press play and watch money being created in real time
3. Adjust the CB rate and see the effect on lending, production, and deposit creation
4. Reach the end of 5 rounds and see clearly that total deposits far exceed the physical cash that started in the system
5. Come away understanding that banks create money, not central banks — and that the CB rate is the throttle on how much

---

## Out of Scope (for now)

- Multiplayer / classroom mode (separate project)
- Interbank settlement between commercial banks
- Asset owner interest on deposits
- Inflation mechanics
- Mobile layout
