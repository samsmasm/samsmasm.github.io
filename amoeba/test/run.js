// Headless tests for amoeba/sim.js. Run: amoeba/test/run.sh
'use strict';
const path = require('path');
const AM = require(path.join(__dirname, '..', 'sim.js'));

let failed = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failed++;
}
const r2 = (x) => Math.round(x * 100) / 100;

function run(seed, ticks, settings) {
  const w = new AM.World(seed, settings);
  const half = ticks >> 1;
  let sum = 0, n = 0, min = Infinity, extinctAfterStart = 0;
  for (let t = 0; t < ticks; t++) {
    const before = w.extinctions;
    w.step();
    if (t > 5000 && w.extinctions > before) extinctAfterStart++;
    if (t >= half && t % 100 === 0) { const a = w.amoebas.length; sum += a; n++; if (a < min) min = a; }
  }
  return { w, mean: sum / n, min, extinctAfterStart, s: w.stats() };
}

// 1. Same seed, same world.
{
  const a = new AM.World(42), b = new AM.World(42);
  for (let i = 0; i < 5000; i++) { a.step(); b.step(); }
  check('same seed gives identical runs', JSON.stringify(a.stats()) === JSON.stringify(b.stats()));
}

// 2. Heredity: child genes are a new object, each gene within one mutation step, inside limits.
{
  const rnd = AM.rng(7), size = 0.1;
  const steps = { speed: size, size: size, jitter: size / 2, sense: size * 50 };
  let bad = 0, shared = 0;
  for (let i = 0; i < 20000; i++) {
    const p = { speed: 0.5 + rnd() * 3.5, size: 0.5 + rnd() * 2.5, jitter: rnd(), sense: rnd() * 250 };
    const c = AM.mutate(p, size, rnd);
    if (c === p) shared++;
    for (const k of Object.keys(steps)) {
      const [lo, hi] = AM.LIMITS[k];
      if (Math.abs(c[k] - p[k]) > steps[k] + 1e-9 || c[k] < lo || c[k] > hi) bad++;
    }
  }
  check('children get their own genes, changed by at most one step', bad === 0 && shared === 0, `${bad} bad, ${shared} shared`);
  const p = { speed: 2, size: 1, jitter: 0.2, sense: 60 };
  check('mutation 0 copies genes exactly', JSON.stringify(AM.mutate(p, 0, AM.rng(1))) === JSON.stringify(p));
}

// 3. Grid food search matches a brute-force search.
{
  const w = new AM.World(3);
  for (let i = 0; i < 300; i++) w.step();
  let mismatch = 0;
  for (const o of w.amoebas) {
    let best = null, bd = o.genes.sense ** 2;
    w.eachFood((f) => { const d = (f.x - o.x) ** 2 + (f.y - o.y) ** 2; if (d < bd) { bd = d; best = f; } });
    if (w.nearestFood(o) !== best) mismatch++;
  }
  let count = 0; w.eachFood(() => count++);
  check('grid nearest-food search matches brute force', mismatch === 0, `${w.amoebas.length} amoebas checked`);
  check('food count matches the pellets in the grid', count === w.foodCount, `${count} vs ${w.foodCount}`);
}

// 4. Food arrives at the set rate, with no jump between settings.
{
  for (const food of [0.25, 1, 1.07, 2]) {
    const w = new AM.World(5, { food });
    w.amoebas = []; w.seedAmoebas = () => {};  // no eaters
    const start = w.foodCount;
    for (let i = 0; i < 400; i++) w.step();
    const rate = (w.foodCount - start) / 400, want = AM.RULES.rainPerTick * food;
    check(`food x${food} arrives at ${want} per tick`, Math.abs(rate - want) < 0.12 * want + 0.05, `measured ${r2(rate)}`);
  }
}

// 5. Default world settles: no extinctions after the start, population stays well above zero.
const base = [];
for (const seed of [1, 2, 3]) {
  const r = run(seed, 60000);
  base.push(r);
  check(`seed ${seed}: stable population at default settings`, r.extinctAfterStart === 0 && r.mean > 50 && r.min > 20,
    `mean ${r2(r.mean)}, min ${r.min}, generation ${r.s.generation}`);
  let out = 0;
  for (const o of r.w.amoebas) for (const k of Object.keys(AM.LIMITS)) {
    const [lo, hi] = AM.LIMITS[k]; if (o.genes[k] < lo || o.genes[k] > hi) out++;
  }
  check(`seed ${seed}: all genes inside their limits`, out === 0);
}

// 6. Water thickness moves evolved speed (the lever the population can't absorb).
{
  const thin = run(1, 100000, { thickness: 0.5 }).s.speed;
  const thick = run(1, 100000, { thickness: 2 }).s.speed;
  check('thick water evolves slower amoebas than thin water', thick < thin - 0.5, `thin ${r2(thin)}, thick ${r2(thick)}`);
}

// 7. Rot: no pellet outlives 1.5 x its lifetime.
{
  const w = new AM.World(9, { rot: AM.ROT.fast });
  let old = 0;
  for (let i = 0; i < 3000; i++) {
    w.step();
    w.eachFood((f) => { if (w.tick - f.born > AM.ROT.fast * 1.5 + 1) old++; });
  }
  check('rotting food disappears on time', old === 0);
}

console.log(failed ? `\n${failed} FAILED` : '\nAll passed');
process.exit(failed ? 1 : 0);
