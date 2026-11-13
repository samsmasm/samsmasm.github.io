// Amoeba: shared simulation. No DOM. Used by index.html (window.AM) and test/run.js (require).
// One World holds the food grid and the amoebas; step() advances one tick (one 60fps frame).
(function (root) {
  'use strict';

  const AM = {};

  // Fixed world size: every screen runs the same world, scaled to fit.
  AM.W = 1200;
  AM.H = 800;

  // Gene limits [min, max]. Without ceilings size ran away to 8 to 24, and speed could lock into
  // an arms race (speed 5 to 7.5, about 15 alive, food piling up). A speed ceiling of 4 stopped
  // that in tests; 5 did not.
  AM.LIMITS = { speed: [0.5, 4], size: [0.5, 3], jitter: [0, 1], sense: [0, 250] };

  // Food rot choices (pellet lifetime in ticks). An uneaten pellet lasts about 35 ticks at
  // normal food, so only short lifetimes matter; 20 starved everything in tests.
  AM.ROT = { off: 0, slow: 150, fast: 50 };

  // Settings the page can change while running.
  AM.SETTINGS = {
    food: 1,          // food supply multiplier (1 = 1.5 pellets per tick)
    thickness: 1,     // water thickness: multiplies the cost of speed
    rot: 0,           // pellet lifetime in ticks, 0 = never rots
    mutation: 0.1,    // mutation size
  };

  // Fixed rules. Costs are energy per tick.
  AM.RULES = {
    rainPerTick: 1.5, foodCap: 2000, startFood: 100,
    startPop: 15, startEnergy: 100, reproThreshold: 250, reproCost: 120,
    baseCost: 0.05, speedCost: 0.05, sizeCost: 0.1, jitterCost: 0.5, senseCost: 0.002,
    infantTicks: 300, infantMul: 1.5,
    baseRadius: 5, energyRadius: 0.08,
    cell: 40,
  };

  AM.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const clamp = (v, [lo, hi]) => (v < lo ? lo : v > hi ? hi : v);

  // Energy burned per tick by an adult with these genes.
  AM.cost = function (g, settings) {
    const R = AM.RULES;
    return R.baseCost
      + g.speed * g.speed * R.speedCost * settings.thickness
      + g.size * g.size * R.sizeCost
      + g.jitter * g.jitter * R.jitterCost
      + g.sense * R.senseCost;
  };

  // Child genes: a fresh object; each gene changes with probability 0.5, then is kept in its limits.
  AM.mutate = function (g, size, rnd) {
    const c = { speed: g.speed, size: g.size, jitter: g.jitter, sense: g.sense };
    const m = size * 2;
    if (rnd() < 0.5) c.speed = clamp(c.speed + (rnd() - 0.5) * m, AM.LIMITS.speed);
    if (rnd() < 0.5) c.size = clamp(c.size + (rnd() - 0.5) * m, AM.LIMITS.size);
    if (rnd() < 0.5) c.jitter = clamp(c.jitter + (rnd() - 0.5) * m / 2, AM.LIMITS.jitter);
    if (rnd() < 0.5) c.sense = clamp(c.sense + (rnd() - 0.5) * m * 50, AM.LIMITS.sense);
    return c;
  };

  class World {
    constructor(seed, settings) {
      this.seed = seed === undefined ? (Math.random() * 2 ** 32) >>> 0 : seed >>> 0;
      this.rnd = AM.rng(this.seed);
      this.settings = Object.assign({}, AM.SETTINGS, settings || {});
      const c = AM.RULES.cell;
      this.gx = Math.ceil(AM.W / c);
      this.gy = Math.ceil(AM.H / c);
      this.grid = Array.from({ length: this.gx * this.gy }, () => []);
      this.foodCount = 0;
      this.amoebas = [];
      this.tick = 0;
      this.births = 0;
      this.extinctions = 0;
      for (let i = 0; i < AM.RULES.startFood; i++) this.addFood(this.rnd() * AM.W, this.rnd() * AM.H);
      this.seedAmoebas();
    }

    randomGenes() {
      const r = this.rnd;
      return { speed: 0.5 + r() * 3.5, size: 0.8 + r() * 0.4, jitter: r() * 0.8, sense: r() * 250 };
    }

    seedAmoebas() {
      for (let i = 0; i < AM.RULES.startPop; i++) {
        this.amoebas.push(this.makeAmoeba(this.rnd() * AM.W, this.rnd() * AM.H, AM.RULES.startEnergy, this.randomGenes(), 0));
      }
    }

    makeAmoeba(x, y, energy, genes, gen) {
      const a = this.rnd() * Math.PI * 2;
      return {
        x, y, energy, genes, gen, age: 0,
        vx: Math.cos(a) * genes.speed, vy: Math.sin(a) * genes.speed,
        radius: AM.RULES.baseRadius * genes.size + energy * AM.RULES.energyRadius,
      };
    }

    cellIndex(x, y) {
      const c = AM.RULES.cell;
      const cx = Math.min(this.gx - 1, Math.max(0, (x / c) | 0));
      const cy = Math.min(this.gy - 1, Math.max(0, (y / c) | 0));
      return cy * this.gx + cx;
    }

    addFood(x, y) {
      const n = this.rnd();
      const rot = this.settings.rot;
      this.grid[this.cellIndex(x, y)].push({
        x, y, nutrition: n, size: 2 + n * 4, born: this.tick,
        dies: rot > 0 ? this.tick + rot * (0.5 + this.rnd()) : Infinity,
      });
      this.foodCount++;
    }

    // Calls fn(pellet, cellArray, index) for every pellet in cells overlapping the circle.
    eachFoodNear(x, y, r, fn) {
      const c = AM.RULES.cell;
      const x0 = Math.max(0, ((x - r) / c) | 0), x1 = Math.min(this.gx - 1, ((x + r) / c) | 0);
      const y0 = Math.max(0, ((y - r) / c) | 0), y1 = Math.min(this.gy - 1, ((y + r) / c) | 0);
      for (let cy = y0; cy <= y1; cy++) {
        for (let cx = x0; cx <= x1; cx++) {
          const cell = this.grid[cy * this.gx + cx];
          for (let i = cell.length - 1; i >= 0; i--) fn(cell[i], cell, i);
        }
      }
    }

    nearestFood(o) {
      const R = o.genes.sense;
      if (R <= 0) return null;
      let best = null, bd = R * R;
      this.eachFoodNear(o.x, o.y, R, (f) => {
        const d = (f.x - o.x) ** 2 + (f.y - o.y) ** 2;
        if (d < bd) { bd = d; best = f; }
      });
      return best;
    }

    spawnFood() {
      const s = this.settings;
      if (s.rot > 0) {
        for (const cell of this.grid) {
          for (let i = cell.length - 1; i >= 0; i--) {
            if (cell[i].dies <= this.tick) { cell.splice(i, 1); this.foodCount--; }
          }
        }
      }
      const rate = AM.RULES.rainPerTick * s.food;
      let k = Math.floor(rate) + (this.rnd() < rate % 1 ? 1 : 0);
      while (k-- > 0 && this.foodCount < AM.RULES.foodCap) this.addFood(this.rnd() * AM.W, this.rnd() * AM.H);
    }

    step() {
      const R = AM.RULES, s = this.settings, rnd = this.rnd;
      this.spawnFood();
      const born = [];
      for (let i = this.amoebas.length - 1; i >= 0; i--) {
        const o = this.amoebas[i], g = o.genes;
        o.age++;
        let loss = AM.cost(g, s);
        if (o.age < R.infantTicks) loss *= R.infantMul;
        o.energy -= loss;
        if (o.energy <= 0) { this.amoebas.splice(i, 1); continue; }

        const t = this.nearestFood(o);
        const ang = t ? Math.atan2(t.y - o.y, t.x - o.x) : Math.atan2(o.vy, o.vx) + (rnd() - 0.5) * g.jitter;
        o.vx = Math.cos(ang) * g.speed;
        o.vy = Math.sin(ang) * g.speed;
        o.x += o.vx;
        o.y += o.vy;
        o.radius = R.baseRadius * g.size + o.energy * R.energyRadius;
        if (o.x + o.radius > AM.W) { o.x = AM.W - o.radius; o.vx = -o.vx; }
        if (o.x - o.radius < 0) { o.x = o.radius; o.vx = -o.vx; }
        if (o.y + o.radius > AM.H) { o.y = AM.H - o.radius; o.vy = -o.vy; }
        if (o.y - o.radius < 0) { o.y = o.radius; o.vy = -o.vy; }

        // Eat: 6 is the largest pellet radius, so this search covers every pellet that can touch.
        this.eachFoodNear(o.x, o.y, o.radius + 6, (f, cell, j) => {
          if (Math.hypot(o.x - f.x, o.y - f.y) < o.radius + f.size) {
            o.energy += 15 + f.nutrition * 40;
            cell.splice(j, 1);
            this.foodCount--;
          }
        });

        if (o.energy >= R.reproThreshold) {
          o.energy -= R.reproCost;
          const genes = AM.mutate(g, s.mutation, rnd);
          born.push(this.makeAmoeba(o.x + (rnd() - 0.5) * 10, o.y + (rnd() - 0.5) * 10, R.reproCost, genes, o.gen + 1));
          this.births++;
        }
      }
      for (const b of born) this.amoebas.push(b);
      if (this.amoebas.length === 0) { this.extinctions++; this.seedAmoebas(); }
      this.tick++;
    }

    stats() {
      const a = this.amoebas, n = a.length;
      const mean = (k) => (n ? a.reduce((t, o) => t + o.genes[k], 0) / n : 0);
      let gen = 0;
      for (const o of a) if (o.gen > gen) gen = o.gen;
      return {
        tick: this.tick, alive: n, food: this.foodCount, generation: gen,
        births: this.births, extinctions: this.extinctions,
        speed: mean('speed'), size: mean('size'), jitter: mean('jitter'), sense: mean('sense'),
      };
    }

    // Visit every pellet (for drawing).
    eachFood(fn) {
      for (const cell of this.grid) for (const f of cell) fn(f);
    }
  }

  AM.World = World;

  if (typeof module !== 'undefined' && module.exports) module.exports = AM;
  else root.AM = AM;
})(typeof self !== 'undefined' ? self : this);
