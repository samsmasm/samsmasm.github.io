const Engine = (function () {
  const CFG = {
    price: 20,
    cost: 12,
    baseDemand: 800,
    baseLead: 1,
    cap: 4000,
    startStock: 800,
    rounds: 10,
    hold: { storage: 0.4, insurance: 0.2, opportunity: 0.4 },
    dualFee: 500,
  };
  CFG.holdPerUnit = CFG.hold.storage + CFG.hold.insurance + CFG.hold.opportunity;

  const C = {
    calm: { id: 'calm', title: 'Quiet month', text: 'Orders arrive on time and demand is steady at about 800 units.', demand: 800, delay: 0, priceMult: 1, tag: 'calm' },
    quiet: { id: 'quiet', title: 'Slow sales month', text: 'Customers hold back spending. Demand falls to 650 units. Deliveries are normal.', demand: 650, delay: 0, priceMult: 1, tag: 'demand' },
    surge: { id: 'surge', title: 'Demand surge', text: 'A viral product review sends demand to 1,200 units. Deliveries are normal.', demand: 1200, delay: 0, priceMult: 1, tag: 'demand' },
    surge2: { id: 'surge2', title: 'Demand surge and port congestion', text: 'Demand rises to 1,100 units while congested ports add 1 week to any order placed now.', demand: 1100, delay: 1, priceMult: 1, tag: 'both' },
    licence: { id: 'licence', title: 'Export licence delays', text: 'Your rare earth supplier waits on a government export licence. Orders placed now arrive 2 weeks late and input prices rise 25% (single source).', demand: 800, delay: 2, priceMult: 1.25, tag: 'supply', link: 'Rare earths: licence delay and single-source dependence' },
    lane: { id: 'lane', title: 'Shipping lane closed', text: 'A key shipping lane closes. Orders placed now arrive 3 weeks late.', demand: 800, delay: 3, priceMult: 1, tag: 'supply' },
    lane2: { id: 'lane2', title: 'Shipping delays', text: 'Port strikes add 2 weeks to any order placed now.', demand: 800, delay: 2, priceMult: 1, tag: 'supply' },
    spike: { id: 'spike', title: 'Input price spike', text: 'Rare earth prices jump 40% as supply tightens. Orders placed now cost 40% more per unit (single source).', demand: 800, delay: 0, priceMult: 1.4, tag: 'price', link: 'Rare earths: price spike' },
    spike2: { id: 'spike2', title: 'Input price rise', text: 'Input prices rise 30% for orders placed now (single source).', demand: 800, delay: 0, priceMult: 1.3, tag: 'price' },
    licence1: { id: 'licence1', title: 'Paperwork hold-up', text: 'Customs paperwork adds 1 week to any order placed now.', demand: 800, delay: 1, priceMult: 1, tag: 'supply' },
  };

  const SEQ = {
    A: ['calm', 'calm', 'surge', 'calm', 'licence', 'lane', 'spike', 'quiet', 'calm', 'surge2'],
    B: ['calm', 'calm', 'calm', 'licence1', 'calm', 'calm', 'calm', 'quiet', 'calm', 'spike2'],
    C: ['calm', 'surge', 'lane2', 'lane', 'spike', 'surge2', 'calm', 'licence', 'surge', 'calm'],
  };
  const SEQ_NAMES = { A: 'Rare earth crunch', B: 'Calm waters', C: 'Cascade', R: 'Random', L: 'Stable world', S: 'Unsettled world', H: 'Chaotic world' };
  // Worlds: the ten events of a fixed set in a seeded random order, round 1 kept calm as a warm-up.
  const WORLD_DECK = { L: 'B', S: 'A', H: 'C' };

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seqFor(mode, seed) {
    if (SEQ[mode]) return SEQ[mode].map((k) => C[k]);
    if (WORLD_DECK[mode]) {
      const deck = SEQ[WORLD_DECK[mode]], r = rng(seed), rest = deck.slice(1);
      for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
      return [deck[0]].concat(rest).map((k) => C[k]);
    }
    const r = rng(seed);
    const pool = ['calm', 'calm', 'calm', 'quiet', 'surge', 'surge2', 'licence', 'lane', 'lane2', 'spike', 'spike2', 'licence1'];
    const out = ['calm', 'calm'];
    while (out.length < CFG.rounds) out.push(pool[Math.floor(r() * pool.length)]);
    return out.map((k) => C[k]);
  }

  function newState() {
    return { round: 0, onHand: CFG.startStock, lots: [{ qty: CFG.startStock, cost: CFG.cost }], pipeline: [], total: 0, history: [] };
  }

  function reorderLevel(buffer) { return buffer + CFG.baseDemand * CFG.baseLead; }

  function play(s, lev, card) {
    s.round += 1;
    const r = s.round;
    const arrived = [];
    s.pipeline = s.pipeline.filter((o) => {
      if (o.arrive <= r) { s.lots.push({ qty: o.qty, cost: o.cost }); s.onHand += o.qty; arrived.push(o); return false; }
      return true;
    });
    const startStock = s.onHand;
    let ordered = null;
    if (startStock <= reorderLevel(lev.buffer) && s.pipeline.length === 0) {
      const qty = Math.min(lev.qty, CFG.cap - startStock);
      if (qty > 0) {
        const delay = lev.dual ? Math.min(card.delay, 1) : card.delay;
        const pm = lev.dual ? 1 + (card.priceMult - 1) / 2 : card.priceMult;
        const lead = CFG.baseLead + delay;
        ordered = { qty, cost: CFG.cost * pm, arrive: r + lead, lead, delay };
        s.pipeline.push(ordered);
      }
    }
    const demand = card.demand;
    const sold = Math.min(demand, s.onHand);
    const lost = demand - sold;
    let need = sold, cogs = 0;
    while (need > 0) {
      const lot = s.lots[0];
      const take = Math.min(lot.qty, need);
      cogs += take * lot.cost; lot.qty -= take; need -= take;
      if (lot.qty === 0) s.lots.shift();
    }
    s.onHand -= sold;
    const revenue = sold * CFG.price;
    const holding = s.onHand * CFG.holdPerUnit;
    const fee = lev.dual ? CFG.dualFee : 0;
    const profit = revenue - cogs - holding - fee;
    s.total += profit;
    const res = { round: r, card, lev: { ...lev }, startStock, ordered, arrivedQty: arrived.reduce((a, o) => a + o.qty, 0), demand, sold, lost, endStock: s.onHand, revenue, cogs, holding, fee, profit, total: s.total, lostProfit: lost * (CFG.price - CFG.cost), stockout: lost > 0 };
    s.history.push(res);
    return res;
  }

  /* ---------- rules version 2 (added 2026-10-22) ----------
     Used when a rules object R = { v: 2, hard: bool } is passed; without R the original rules above run unchanged,
     so old score codes still give the same totals.
     Levers: { rl: reorder level, qty: reorder quantity, sup: supplier index, build: true on the round a canning line is built }.
     New for everyone: bulk discount on big orders, cans go off after a shelf life.
     Hard adds: lost sales cut next round's demand (goodwill), global/local suppliers, make your own (cost to make vs cost to buy),
     capacity utilisation and productivity of the canning line. */
  const RULES = {
    life: 4, bulkMin: 2000, bulkDisc: 0.05, goodwill: 0.25,
    std: [
      { key: 'single', name: 'Single supplier', cost: 12, lead: 1, maxDelay: 99, priceShare: 1, fee: 0 },
      { key: 'dual', name: 'Dual supplier', cost: 12, lead: 1, maxDelay: 1, priceShare: 0.5, fee: 500 },
    ],
    hard: [
      { key: 'global', name: 'Global supplier', cost: 12, lead: 2, maxDelay: 99, priceShare: 1, fee: 0 },
      { key: 'local', name: 'Local supplier', cost: 13, lead: 1, maxDelay: 0, priceShare: 0.5, fee: 0 },
      { key: 'make', name: 'Make your own', cost: 8, lead: 1, maxDelay: 0, priceShare: 1, fee: 0, cap: 1000, fixed: 2000, workers: 4 },
    ],
  };
  const suppliers = (R) => (R && R.hard ? RULES.hard : RULES.std);

  function newState2() {
    return { round: 0, onHand: CFG.startStock, lots: [{ qty: CFG.startStock, cost: CFG.cost, r: 1 }], pipeline: [], total: 0, history: [], goodwill: 0, built: 0 };
  }

  function play2(s, lev, card, R) {
    s.round += 1;
    const r = s.round, sups = suppliers(R);
    const arrived = [];
    s.pipeline = s.pipeline.filter((o) => {
      if (o.arrive <= r) { s.lots.push({ qty: o.qty, cost: o.cost, r }); s.onHand += o.qty; arrived.push(o); return false; }
      return true;
    });
    if (R.hard && lev.build && !s.built) s.built = r;
    let si = sups[lev.sup] ? lev.sup : 0;
    if (sups[si].cap && !s.built) si = 0;
    const sup = sups[si];
    const startStock = s.onHand;
    let ordered = null, made = 0;
    if (startStock <= lev.rl && s.pipeline.length === 0) {
      let qty = Math.min(lev.qty, CFG.cap - startStock);
      if (sup.cap) qty = Math.min(qty, sup.cap);
      if (qty > 0) {
        const delay = Math.min(card.delay, sup.maxDelay);
        const pm = 1 + (card.priceMult - 1) * sup.priceShare;
        const bulk = !sup.cap && qty >= RULES.bulkMin;
        const cost = sup.cost * pm * (bulk ? 1 - RULES.bulkDisc : 1);
        const lead = sup.lead + delay;
        ordered = { qty, cost, arrive: r + lead, lead, delay, sup: si, bulk };
        s.pipeline.push(ordered);
        if (sup.cap) made = qty;
      }
    }
    const goodwillLoss = R.hard ? s.goodwill : 0;
    const demand = Math.max(0, card.demand - goodwillLoss);
    const sold = Math.min(demand, s.onHand);
    const lost = demand - sold;
    let need = sold, cogs = 0;
    while (need > 0) {
      const lot = s.lots[0];
      const take = Math.min(lot.qty, need);
      cogs += take * lot.cost; lot.qty -= take; need -= take;
      if (lot.qty === 0) s.lots.shift();
    }
    s.onHand -= sold;
    // Cans still on the shelf after `life` rounds go off and are thrown away.
    let spoiled = 0, spoilCost = 0;
    while (s.lots.length && r - s.lots[0].r + 1 >= RULES.life) { const lot = s.lots.shift(); spoiled += lot.qty; spoilCost += lot.qty * lot.cost; }
    s.onHand -= spoiled;
    const revenue = sold * CFG.price;
    const holding = s.onHand * CFG.holdPerUnit;
    const fee = sup.fee;
    const fixed = R.hard && s.built ? RULES.hard[2].fixed : 0;
    const profit = revenue - cogs - holding - fee - fixed - spoilCost;
    s.total += profit;
    if (R.hard) s.goodwill = Math.round((lost * RULES.goodwill) / 50) * 50;
    const line = RULES.hard[2];
    const res = { round: r, card, lev: { ...lev, sup: si }, startStock, ordered, arrivedQty: arrived.reduce((a, o) => a + o.qty, 0), demand, cardDemand: card.demand, goodwillLoss, sold, lost, endStock: s.onHand, revenue, cogs, holding, fee, fixed, spoiled, spoilCost, profit, total: s.total, lostProfit: lost * (CFG.price - CFG.cost), stockout: lost > 0, built: s.built, made, util: s.built ? made / line.cap : null, productivity: s.built ? made / line.workers : null, nextGoodwill: R.hard ? s.goodwill : 0 };
    s.history.push(res);
    return res;
  }

  function run(seq, levers, R) {
    const s = R ? newState2() : newState();
    seq.forEach((card, i) => (R ? play2 : play)(s, typeof levers === 'function' ? levers(i, s) : levers, card, R));
    return s;
  }

  return { CFG, CARDS: C, SEQ, SEQ_NAMES, WORLD_DECK, RULES, suppliers, seqFor, newState, newState2, play, play2, run, reorderLevel, rng };
})();
if (typeof module !== 'undefined') module.exports = Engine;
