/* Headless tests for racecar/sim.js. Run with test/run.sh (it fetches Planck
   into ~/.cache/racecar-test the first time). Usage: run.sh [gens] */
'use strict';
const path = require('path');
const planckDir = process.env.PLANCK_DIR || path.join(require('os').homedir(), '.cache/racecar-test/node_modules/planck-js');
global.window = global;   // Planck's browser build passes `window` to its UMD wrapper
global.planck = require(path.join(planckDir, 'dist/planck.js'));
const RC = require('../sim.js');

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? '  ok   ' : '  FAIL ') + msg); if (!cond) fails++; };
const cfgFor = (track, extra) => Object.assign({}, RC.DEFAULTS, { TRACK_TYPE: track }, extra || {});
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

console.log('Genome');
{
    const cfg = cfgFor('flat');
    let allNormal = true;
    for (let i = 0; i < 500; i++) {
        let g = RC.random(cfg);
        for (let k = 0; k < 20; k++) g = RC.mutate(RC.crossover(g, RC.random(cfg)), cfg);
        const sorted = g.points.every((p, j) => j === 0 || p.angle >= g.points[j - 1].angle);
        const inRange = g.points.concat(g.wheels).every(p => p.angle >= 0 && p.angle < RC.TAU);
        if (!sorted || !inRange || g.points.length < cfg.MIN_POINTS || g.wheels.length < cfg.MIN_WHEELS) allNormal = false;
    }
    ok(allNormal, 'angles stay sorted and in [0, 2pi); counts stay within limits');

    const legacy = { hue: 10, points: [{ angle: 0, radius: 1 }, { angle: 2, radius: 1.5 }, { angle: 4, radius: 1 }], wheels: [{ vertexIndex: 1, radius: 0.4 }, { vertexIndex: 9, radius: 0.3 }] };
    const g = RC.fromData(legacy);
    ok(Math.abs(g.wheels[0].angle - 2) < 1e-9 && Math.abs(g.wheels[1].angle - 4) < 1e-9, 'old vertexIndex exports convert to wheel angles (out of range clamps)');
    ok(g.motorSpeed === 15 && g.density === 2 && g.suspHz === 4, 'old exports get default tuning genes');

    const m = RC.mountPoint(g.points, 2);
    ok(Math.abs(Math.hypot(m.x, m.y) - 1.5) < 1e-6, 'wheel at a corner angle mounts on that corner');

    // Heredity: how far do wheels move from parent to child at a low mutation rate?
    // Old scheme stored a corner index; any added corner shifts indices.
    const low = cfgFor('flat', { MUTATION_RATE: 0.1 });
    const moves = [];
    for (let i = 0; i < 2000; i++) {
        const p = RC.random(low), c = RC.mutate(p, low);
        if (c.wheels.length !== p.wheels.length) continue;
        p.wheels.forEach((w, j) => {
            const a = RC.mountPoint(p.points, w.angle), b = RC.mountPoint(c.points, c.wheels[j].angle);
            moves.push(Math.hypot(a.x - b.x, a.y - b.y));
        });
    }
    const big = moves.filter(d => d > 0.5).length / moves.length;
    ok(big < 0.08, `wheels rarely jump when a child mutates (${(big * 100).toFixed(1)}% moved > 0.5 m)`);
}

console.log('Physics');
{
    // Two corners at the same angle used to become a phantom 2 m box.
    const g = RC.fromData({ points: [{ angle: 0, radius: 1 }, { angle: 0, radius: 1.2 }, { angle: 2, radius: 1 }, { angle: 4, radius: 1 }], wheels: [{ angle: 2, radius: 0.3 }] });
    const race = new RC.Race([g], cfgFor('flat'), { terrainSeed: 1 });
    let maxExtent = 0;
    for (let f = race.cars[0].body.getFixtureList(); f; f = f.getNext()) {
        const s = f.getShape();
        if (s.getType() === 'polygon') s.m_vertices.forEach(v => { maxExtent = Math.max(maxExtent, Math.hypot(v.x, v.y)); });
    }
    ok(maxExtent <= 1.2 + 1e-6, `degenerate slices are skipped, not boxed (max extent ${maxExtent.toFixed(2)} m)`);

    const t1 = RC.makeTerrain(5), t2 = RC.makeTerrain(6);
    const cfgR = cfgFor('rough');
    ok(RC.groundHeight(40, cfgR, t1) !== RC.groundHeight(40, cfgR, t2), 'rough terrain differs between seeds');
    ok(RC.groundHeight(40, cfgR, t1) === RC.groundHeight(40, cfgR, RC.makeTerrain(5)), 'same seed gives the same terrain');

    for (const track of ['flat', 'hill', 'jump', 'rough']) {
        const cfg = cfgFor(track, { MAX_TIME: 20 });
        const pop = Array.from({ length: 10 }, () => RC.random(cfg));
        const t0 = Date.now();
        const r = new RC.Race(pop, cfg, { terrainSeed: RC.newSeed() }).runToEnd();
        const allScored = r.cars.every(c => c.result && isFinite(c.result.fitness));
        ok(allScored, `${track}: a race runs to the end and every car is scored (${Date.now() - t0} ms)`);
    }
}

console.log('Split races (what the background workers do)');
{
    // Smooth tracks only: on rough/jump, Planck's contact order depends on which
    // other cars share the world, and bumps amplify the float differences, so a
    // car never repeats its exact run there (true in the live arena too).
    for (const track of ['flat', 'hill']) {
        const cfg = cfgFor(track, { MAX_TIME: 20 });
        const pop = Array.from({ length: 12 }, () => RC.random(cfg));
        const seed = RC.newSeed();
        const whole = new RC.Race(pop, cfg, { terrainSeed: seed }).runToEnd().cars.map(c => c.result.distance);
        const split = [];
        for (let i = 0; i < pop.length; i += 4) {
            new RC.Race(pop.slice(i, i + 4), cfg, { terrainSeed: seed }).runToEnd().cars.forEach(c => split.push(c.result.distance));
        }
        const diff = Math.max(...whole.map((d, i) => Math.abs(d - split[i])));
        ok(diff < 0.01, `${track}: racing in 3 separate worlds gives the same distances (max diff ${diff.toFixed(4)} m)`);
    }
}

console.log('Evolution');
{
    const gens = parseInt(process.argv[2] || '25', 10);
    for (const track of ['flat', 'hill']) {
        const cfg = cfgFor(track);
        let pop = Array.from({ length: cfg.POPULATION_SIZE }, () => RC.random(cfg));
        const bests = [];
        const t0 = Date.now();
        for (let g = 0; g < gens; g++) {
            const race = new RC.Race(pop, cfg, { terrainSeed: RC.newSeed() }).runToEnd();
            const out = RC.evolve(RC.entriesFromRace(race), cfg);
            bests.push(out.record.best);
            pop = out.population;
        }
        const ms = (Date.now() - t0) / gens;
        const first = Math.max(...bests.slice(0, 3)), last = Math.max(...bests.slice(-3));
        console.log(`  ${track}: best ${first.toFixed(2)} -> ${last.toFixed(2)} ${RC.scoreLabel(cfg)}, ${ms.toFixed(0)} ms per generation`);
        ok(last >= first, `${track}: elites mean the best never gets much worse over ${gens} generations`);
    }
}

console.log(fails ? `\n${fails} FAILED` : '\nAll passed');
process.exit(fails ? 1 : 0);
