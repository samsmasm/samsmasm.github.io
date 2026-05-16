// engine.js — pure simulation logic, no DOM

class GameEngine extends EventTarget {
  constructor() {
    super();
    this._init();
  }

  _init() {
    this.state = {
      round: 1,
      maxRounds: 5,
      phase: 'rate_setting',
      // phases: rate_setting | lending | trading | settlement | debrief | game_over
      cbRate: 0,
      defaultCBRates: [0, 10, 20, 20, 0],
      PHYSICAL_CASH: 1950,

      banks: [
        { id: 0, name: 'Alpha', personality: 'Aggressive',   margin: 5,  reserves: 150, loansOutstanding: 0, depositTotal: 0, cbBorrowed: 0, badDebts: 0, loanBook: [] },
        { id: 1, name: 'Beta',  personality: 'Moderate',     margin: 10, reserves: 150, loansOutstanding: 0, depositTotal: 0, cbBorrowed: 0, badDebts: 0, loanBook: [] },
        { id: 2, name: 'Gamma', personality: 'Conservative', margin: 15, reserves: 150, loansOutstanding: 0, depositTotal: 0, cbBorrowed: 0, badDebts: 0, loanBook: [] },
      ],

      assetOwners: [
        { id: 0, name: 'Miller & Co',    ingredients: ['flour', 'milk'],          cash: 0, bankId: null },
        { id: 1, name: 'Sweet Supplies', ingredients: ['sugar', 'baking powder'], cash: 0, bankId: null },
        { id: 2, name: 'Dairy Partners', ingredients: ['butter', 'eggs'],         cash: 0, bankId: null },
      ],

      producers: Array.from({ length: 6 }, (_, i) => ({
        id: i,
        name: `Bakery ${i + 1}`,
        bankId: null,
        deposit: 0,
        totalBorrowed: 0,
        loanDetails: [],  // [{ bankId, amount, rate, round }]
        revenue: 0,
        cakesMade: 0,
        defaulted: false,
      })),

      consumerPot: 1500,
      cakesSold: 0,
      ingredientPrices: {},
      events: [],
      roundHistory: [],
    };

    this._generateIngredientPrices();
  }

  // --- Computed ---

  get totalDeposits() {
    return this.state.banks.reduce((s, b) => s + b.depositTotal, 0);
  }

  get createdMoney() {
    // Money created by lending = loans outstanding (each loan creates an equal deposit from nothing)
    return this.state.banks.reduce((s, b) => s + b.loansOutstanding, 0);
  }

  lendingRate(bankId) {
    const b = this.state.banks[bankId];
    return this.state.cbRate + b.margin;
  }

  healthRatio(bankId) {
    const b = this.state.banks[bankId];
    return b.depositTotal > 0 ? b.reserves / b.depositTotal : Infinity;
  }

  get totalIngredientCost() {
    return Object.values(this.state.ingredientPrices).reduce((s, p) => s + p, 0);
  }

  // --- Player actions ---

  setCBRate(rate) {
    this.state.cbRate = Math.max(0, Math.min(20, Math.round(rate / 5) * 5));
    this._emit('stateChanged');
  }

  // Returns transaction list for animation
  runPhase() {
    switch (this.state.phase) {
      case 'lending':    return this._runLending();
      case 'trading':    return this._runTrading();
      case 'settlement': return this._runSettlement();
      default:           return [];
    }
  }

  advancePhase() {
    const order = ['rate_setting', 'lending', 'trading', 'settlement', 'debrief'];
    const idx = order.indexOf(this.state.phase);

    if (idx >= 0 && idx < order.length - 1) {
      const next = order[idx + 1];
      this.state.phase = next;
      if (next === 'debrief') this._recordHistory(); // record on entry so debrief can show it
    } else {
      // Leaving debrief
      if (this.state.round < this.state.maxRounds) {
        this.state.round++;
        this.state.cbRate = this.state.defaultCBRates[this.state.round - 1];
        this.state.phase = 'rate_setting';
        this._generateIngredientPrices();
        this.state.assetOwners.forEach(ao => { ao.bankId = null; });
      } else {
        this.state.phase = 'game_over';
      }
    }
    this._emit('stateChanged');
  }

  // --- Setup helpers ---

  _generateIngredientPrices() {
    const ings = ['flour', 'milk', 'sugar', 'baking powder', 'butter', 'eggs'];
    this.state.ingredientPrices = {};
    ings.forEach(ing => {
      // 14–20 per ingredient → total 84–120 per bakery, avg ~102
      // This ensures producers usually need a loan even when they have saved cake revenue (100)
      this.state.ingredientPrices[ing] = 14 + Math.floor(Math.random() * 7);
    });
  }

  // --- Phase runners ---

  _runLending() {
    const tx = [];
    const { banks, producers, cbRate } = this.state;
    const cost = this.totalIngredientCost;
    const prices = this.state.ingredientPrices;

    this._log('phase', `— Round ${this.state.round} · Lending Phase —`);

    for (const b of banks) {
      const rate = cbRate + b.margin;
      this._log('bank_rate',
        `${b.name} Bank (${b.personality}) sets lending rate ${rate}% · CB ${cbRate}% + ${b.margin}% margin`,
        { bankId: b.id }
      );
    }

    this._log('prices',
      `Ingredient prices: ${Object.entries(prices).map(([k, v]) => `${k} ${v}`).join(', ')} · Total per bakery: ${cost}`
    );

    const sortedBanks = [...banks].sort((a, b) => this.lendingRate(a.id) - this.lendingRate(b.id));
    const bestBank = sortedBanks[0];
    const bestRate = this.lendingRate(bestBank.id);

    for (const producer of producers) {
      if (producer.defaulted) continue;

      if (bestRate >= 25) {
        // At 25%+, cost of borrowing over 5 rounds exceeds typical cake profit — producers hold off
        this._log('skip',
          `${producer.name}: best rate ${bestRate}% too costly (threshold 25%) — no borrowing this round`,
          { producerId: producer.id }
        );
        continue;
      }
      if (this.state.consumerPot < 100) {
        this._log('skip',
          `${producer.name}: consumer pot only ${this.state.consumerPot} — not worth baking`,
          { producerId: producer.id }
        );
        continue;
      }

      const shortfall = Math.max(0, cost - producer.deposit);

      if (shortfall === 0) {
        this._log('no_loan',
          `${producer.name}: deposit ${producer.deposit} covers ingredients (${cost}) — no new loan needed`,
          { producerId: producer.id }
        );
        if (producer.bankId === null) producer.bankId = bestBank.id;
        continue;
      }

      const otherRates = sortedBanks.slice(1).map(b => `${b.name} ${this.lendingRate(b.id)}%`).join(', ');

      bestBank.loansOutstanding += shortfall;
      bestBank.depositTotal    += shortfall;
      producer.deposit         += shortfall;
      producer.bankId           = bestBank.id;
      producer.totalBorrowed   += shortfall;
      producer.loanDetails.push({ bankId: bestBank.id, amount: shortfall, rate: bestRate, round: this.state.round });
      bestBank.loanBook.push({ producerId: producer.id, producerName: producer.name, amount: shortfall, rate: bestRate, round: this.state.round });

      this._log('loan',
        `${producer.name} chose ${bestBank.name} Bank (${bestRate}%; others: ${otherRates}). Borrowed ${shortfall}. Deposit +${shortfall} created on both sides of balance sheet simultaneously. No cash moved.`,
        { producerId: producer.id, bankId: bestBank.id, amount: shortfall }
      );

      tx.push({ type: 'loan', from: { type: 'bank', id: bestBank.id }, to: { type: 'producer', id: producer.id }, amount: shortfall });
    }

    return tx;
  }

  _runTrading() {
    const tx = [];
    const { producers, assetOwners, banks } = this.state;
    const prices = this.state.ingredientPrices;
    const cost = this.totalIngredientCost;

    this._log('phase', `— Round ${this.state.round} · Trading Phase —`);

    for (const producer of producers) {
      if (producer.defaulted) continue;
      if (producer.bankId === null) continue;
      if (producer.deposit < cost) {
        this._log('skip',
          `${producer.name}: deposit ${producer.deposit.toFixed(0)} < cost ${cost} — skipping production`,
          { producerId: producer.id }
        );
        continue;
      }
      if (this.state.consumerPot < 100) {
        this._log('skip', `${producer.name}: consumer pot empty — skipping`, { producerId: producer.id });
        continue;
      }

      const bank = banks[producer.bankId];

      for (const ao of assetOwners) {
        const aoCost = ao.ingredients.reduce((s, ing) => s + prices[ing], 0);
        producer.deposit  -= aoCost;
        ao.cash           += aoCost;
        if (bank) bank.depositTotal -= aoCost;

        this._log('purchase',
          `${producer.name} buys ${ao.ingredients.join(' & ')} from ${ao.name} for ${aoCost}`,
          { producerId: producer.id, assetOwnerId: ao.id, amount: aoCost }
        );
        tx.push({ type: 'purchase', from: { type: 'producer', id: producer.id }, to: { type: 'assetOwner', id: ao.id }, amount: aoCost });
      }

      this.state.consumerPot -= 100;
      this.state.cakesSold++;
      producer.revenue  += 100;
      producer.deposit  += 100;
      producer.cakesMade++;
      if (bank) bank.depositTotal += 100;

      this._log('cake_sale',
        `${producer.name} sells a cake for 100. Consumer pot: ${this.state.consumerPot} (${this.state.cakesSold}/15 cakes sold)`,
        { producerId: producer.id, amount: 100 }
      );
      tx.push({ type: 'cake_sale', from: { type: 'consumer' }, to: { type: 'producer', id: producer.id }, amount: 100 });
    }

    return tx;
  }

  _runSettlement() {
    const tx = [];
    const { banks, assetOwners, producers } = this.state;

    this._log('phase', `— Round ${this.state.round} · Settlement Phase —`);

    // Rank banks by health for asset owner deposit choice
    const rankedBanks = [...banks].sort((a, b) => this.healthRatio(b.id) - this.healthRatio(a.id));

    for (const ao of assetOwners) {
      if (ao.cash <= 0) continue;

      const best = rankedBanks[0];
      best.reserves    += ao.cash;
      best.depositTotal += ao.cash;

      this._log('settle_deposit',
        `${ao.name} deposits ${ao.cash} cash at ${best.name} Bank (reserve ratio ${(this.healthRatio(best.id) * 100 < Infinity ? (this.healthRatio(best.id) * 100).toFixed(0) : '∞')}% — healthiest)`,
        { assetOwnerId: ao.id, bankId: best.id, amount: ao.cash }
      );
      tx.push({ type: 'deposit', from: { type: 'assetOwner', id: ao.id }, to: { type: 'bank', id: best.id }, amount: ao.cash });

      ao.bankId = best.id;
      ao.cash = 0;
    }

    // CB emergency lending
    for (const bank of banks) {
      if (bank.depositTotal <= 0) continue;
      const required = bank.depositTotal * 0.1;
      if (bank.reserves < required) {
        const needed = Math.ceil(required - bank.reserves);
        bank.reserves  += needed;
        bank.cbBorrowed += needed;

        this._log('cb_emergency',
          `${bank.name} Bank reserves ${(bank.reserves - needed).toFixed(0)} < required ${required.toFixed(0)} (10% of deposits). Emergency loan of ${needed} from CB at ${this.state.cbRate}%.`,
          { bankId: bank.id, amount: needed }
        );
        tx.push({ type: 'cb_loan', from: { type: 'cb' }, to: { type: 'bank', id: bank.id }, amount: needed });
      }
    }

    // Final round: loan repayments
    if (this.state.round === this.state.maxRounds) {
      this._log('phase', '— End of Game: Loan Repayments —');

      for (const producer of producers) {
        if (producer.loanDetails.length === 0) continue;

        const principal = producer.totalBorrowed;
        const interest  = producer.loanDetails.reduce((s, l) => {
          const rounds = this.state.maxRounds - l.round + 1;
          return s + l.amount * (l.rate / 100) * rounds;
        }, 0);
        const totalOwed = principal + interest;
        const bank      = banks[producer.bankId];

        if (producer.revenue >= totalOwed) {
          bank.loansOutstanding  -= principal;
          bank.depositTotal      -= producer.deposit;

          this._log('repayment',
            `${producer.name} repays ${totalOwed.toFixed(0)} to ${bank.name} Bank (principal ${principal} + interest ${interest.toFixed(0)}). Revenue: ${producer.revenue}. Settled.`,
            { producerId: producer.id, bankId: producer.bankId, amount: totalOwed }
          );
          tx.push({ type: 'repayment', from: { type: 'producer', id: producer.id }, to: { type: 'bank', id: producer.bankId }, amount: totalOwed });
        } else {
          const shortfall = totalOwed - producer.revenue;
          bank.badDebts          += shortfall;
          bank.loansOutstanding  -= principal;
          bank.depositTotal      -= producer.deposit;
          producer.defaulted      = true;

          this._log('default',
            `${producer.name} DEFAULTS. Revenue ${producer.revenue} < owed ${totalOwed.toFixed(0)}. ${bank.name} Bank records bad debt: ${shortfall.toFixed(0)}.`,
            { producerId: producer.id, bankId: producer.bankId, amount: producer.revenue }
          );
          tx.push({ type: 'default', from: { type: 'producer', id: producer.id }, to: { type: 'bank', id: producer.bankId }, amount: producer.revenue });
        }
      }
    }

    return tx;
  }

  _recordHistory() {
    const cm = this.createdMoney;
    this.state.peakCreatedMoney = Math.max(this.state.peakCreatedMoney || 0, cm);
    this.state.roundHistory.push({
      round:         this.state.round,
      cbRate:        this.state.cbRate,
      totalDeposits: this.totalDeposits,
      createdMoney:  cm,
      cakesSold:     this.state.cakesSold,
    });
  }

  _log(type, text, meta = {}) {
    this.state.events.unshift({ type, text, round: this.state.round, ...meta });
  }

  _emit(event) {
    this.dispatchEvent(new CustomEvent(event, { detail: this.state }));
  }
}
