/* sim.js: shared genome, physics and evolution for Racecar.
   Loaded by index.html (main thread), worker.js (background evolution)
   and test/run.js (Node). No DOM access in this file.
   Needs the global `planck` (Planck.js 0.3.31) to be loaded first. */
(function (root) {
'use strict';

const TAU = Math.PI * 2;
const DT = 1 / 60;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const wrap = (a) => ((a % TAU) + TAU) % TAU;
const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const pl = () => root.planck || root.Planck;

const DEFAULTS = {
    POPULATION_SIZE: 20,
    MUTATION_RATE: 0.5,
    MUTATION_DECAY: 0.95,
    MUTATION_FLOOR: 0.03,
    ELITE_COUNT: 2,
    IMMIGRANT_COUNT: 2,
    TOURNAMENT_K: 3,

    TRACK_TYPE: 'flat',
    TRACK_LENGTH: 100,
    HILL_LENGTH: 2000,
    ROUGH_LENGTH: 1500,
    MAX_TIME: 60,
    STUCK_TIME: 3,
    GRAVITY: -10,

    MIN_WHEELS: 2, MAX_WHEELS: 4,
    MIN_POINTS: 3, MAX_POINTS: 14,

    POWER_DENSITY: 80,
    WHEEL_DENSITY: 1.0,

    NUDGE_WHEELS: 0, NUDGE_WHEEL_SIZE: 0, NUDGE_BODY_SIZE: 0,

    MOTOR_MIN: 4, MOTOR_MAX: 45,
    DENSITY_MIN: 0.4, DENSITY_MAX: 4.0,
    SUSPHZ_MIN: 1, SUSPHZ_MAX: 12,
    SUSPDAMP_MIN: 0.1, SUSPDAMP_MAX: 1.0,
    POINT_R_MIN: 0.2, POINT_R_MAX: 3.5,
    WHEEL_R_MIN: 0.1, WHEEL_R_MAX: 1.2
};

const TRACKS = {
    flat:  { name: 'Flat sprint',   goal: 'Fastest time to 100 m' },
    hill:  { name: 'Hill climb',    goal: 'Furthest up a hill that keeps getting steeper' },
    jump:  { name: 'Ski jump',      goal: 'Furthest distance off the ramp' },
    rough: { name: 'Rough terrain', goal: 'Furthest over bumps that change every generation' }
};

const range = (a, b) => [Math.min(a, b), Math.max(a, b)];

/* =====================================================================
   GENOME
   A genome is plain data, so it can be posted to the worker and saved as JSON:
   {
     hue,
     points: [{ angle, radius }]   body corners, polar from the centre,
                                   angles kept in [0, 2pi) and sorted
     wheels: [{ angle, radius }]   each wheel mounts where a ray at `angle`
                                   meets the body outline
     motorSpeed, density, suspHz, suspDamp
   }
   Wheels used to store a corner number (vertexIndex). Corner numbers shift
   whenever corners are added or re-sorted, and mean nothing on another
   parent's body, so children did not inherit wheel positions. An angle
   keeps its meaning through mutation and crossover.
   ===================================================================== */

function normalize(g) {
    g.points.forEach(p => { p.angle = wrap(p.angle); });
    g.points.sort((a, b) => a.angle - b.angle);
    g.wheels.forEach(w => { w.angle = wrap(w.angle); });
    return g;
}

function clone(g) {
    return {
        hue: g.hue,
        points: g.points.map(p => ({ angle: p.angle, radius: p.radius })),
        wheels: g.wheels.map(w => ({ angle: w.angle, radius: w.radius })),
        motorSpeed: g.motorSpeed, density: g.density,
        suspHz: g.suspHz, suspDamp: g.suspDamp
    };
}

// Accepts current exports, old exports from racecar/racecar2 (wheels with
// vertexIndex, no tuning genes) and anything the designer produces.
function fromData(d) {
    if (!d || !Array.isArray(d.points) || !Array.isArray(d.wheels) || d.points.length < 3) {
        throw new Error('Needs at least 3 points and a wheels list');
    }
    const num = (v, dflt) => (typeof v === 'number' && isFinite(v) ? v : dflt);
    const points = d.points.map(p => ({ angle: num(p.angle, 0), radius: clamp(num(p.radius, 1), DEFAULTS.POINT_R_MIN, DEFAULTS.POINT_R_MAX) }));
    const wheels = d.wheels.map(w => {
        let angle = w.angle;
        if (typeof angle !== 'number' && typeof w.vertexIndex === 'number') {
            angle = points[clamp(Math.round(w.vertexIndex), 0, points.length - 1)].angle;
        }
        return { angle: num(angle, 0), radius: clamp(num(w.radius, 0.3), DEFAULTS.WHEEL_R_MIN, DEFAULTS.WHEEL_R_MAX) };
    });
    return normalize({
        hue: num(d.hue, 0),
        points, wheels,
        motorSpeed: clamp(num(d.motorSpeed, 15), DEFAULTS.MOTOR_MIN, DEFAULTS.MOTOR_MAX),
        density:    clamp(num(d.density, 2.0), DEFAULTS.DENSITY_MIN, DEFAULTS.DENSITY_MAX),
        suspHz:     clamp(num(d.suspHz, 4), DEFAULTS.SUSPHZ_MIN, DEFAULTS.SUSPHZ_MAX),
        suspDamp:   clamp(num(d.suspDamp, 0.7), DEFAULTS.SUSPDAMP_MIN, DEFAULTS.SUSPDAMP_MAX)
    });
}

function toData(g) {
    const r3 = (v) => Math.round(v * 1000) / 1000;
    return {
        hue: Math.round(g.hue),
        points: g.points.map(p => ({ angle: r3(p.angle), radius: r3(p.radius) })),
        wheels: g.wheels.map(w => ({ angle: r3(w.angle), radius: r3(w.radius) })),
        motorSpeed: r3(g.motorSpeed), density: r3(g.density),
        suspHz: r3(g.suspHz), suspDamp: r3(g.suspDamp)
    };
}

function cornerXY(p) { return { x: p.radius * Math.cos(p.angle), y: p.radius * Math.sin(p.angle) }; }

// Where a ray from the centre at `angle` meets the body outline.
// Points must be normalized (sorted, in [0, 2pi)).
function mountPoint(points, angle) {
    const n = points.length;
    const a = wrap(angle);
    let i = n - 1;                       // slice from the last corner round to the first
    for (let k = 0; k < n - 1; k++) {
        if (a >= points[k].angle && a < points[k + 1].angle) { i = k; break; }
    }
    const j = (i + 1) % n;
    const p1 = cornerXY(points[i]), p2 = cornerXY(points[j]);
    const d = { x: Math.cos(a), y: Math.sin(a) };
    const e = { x: p2.x - p1.x, y: p2.y - p1.y };
    const cross = (u, v) => u.x * v.y - u.y * v.x;
    const den = cross(d, e);
    if (Math.abs(den) > 1e-9) {
        const t = cross(p1, d) / den;
        const s = cross(p1, e) / den;
        if (t >= 0 && t <= 1 && s > 0) return { x: p1.x + t * e.x, y: p1.y + t * e.y };
    }
    // Degenerate or reflex gap: use whichever corner is angularly nearer.
    const da = Math.abs(wrap(a - points[i].angle + Math.PI) - Math.PI);
    const db = Math.abs(wrap(a - points[j].angle + Math.PI) - Math.PI);
    return da <= db ? p1 : p2;
}

function outlineRadius(points, angle) {
    const m = mountPoint(points, angle);
    return Math.hypot(m.x, m.y);
}

function bodyArea(points) {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const p1 = cornerXY(points[i]), p2 = cornerXY(points[(i + 1) % points.length]);
        area += 0.5 * Math.abs(p1.x * p2.y - p1.y * p2.x);
    }
    return area;
}

// Rough stats without a physics world (designer + HUD).
function stats(g, cfg) {
    cfg = cfg || DEFAULTS;
    const area = bodyArea(g.points);
    let wheelMass = 0;
    g.wheels.forEach(w => { wheelMass += Math.PI * w.radius * w.radius * cfg.WHEEL_DENSITY; });
    const mass = area * g.density + wheelMass;
    const torque = area * cfg.POWER_DENSITY;
    return { area, mass, torque, ratio: mass > 0 ? torque / mass : 0 };
}

function randomWheelAngle(g) {
    // Half the time on a corner (corners stick out, so more clearance),
    // half anywhere on the outline.
    if (Math.random() < 0.5 && g.points.length) return g.points[Math.floor(Math.random() * g.points.length)].angle;
    return Math.random() * TAU;
}

function random(cfg) {
    const g = { hue: Math.floor(Math.random() * 360), points: [], wheels: [] };
    const [minP, maxP] = range(cfg.MIN_POINTS, cfg.MAX_POINTS);
    const n = Math.floor(Math.random() * (maxP - minP + 1)) + minP;

    const gaps = [];
    let total = 0;
    for (let i = 0; i < n; i++) { const r = Math.random() + 0.2; gaps.push(r); total += r; }
    let a = Math.random() * TAU;
    for (let i = 0; i < n; i++) {
        a += (gaps[i] / total) * TAU;
        g.points.push({ angle: a, radius: rand(0.3, 1.8) });
    }
    normalize(g);

    const [minW, maxW] = range(cfg.MIN_WHEELS, cfg.MAX_WHEELS);
    const nw = Math.floor(Math.random() * (maxW - minW + 1)) + minW;
    for (let i = 0; i < nw; i++) g.wheels.push({ angle: randomWheelAngle(g), radius: rand(0.2, 0.6) });

    g.motorSpeed = rand(cfg.MOTOR_MIN, cfg.MOTOR_MAX);
    g.density    = rand(cfg.DENSITY_MIN, cfg.DENSITY_MAX);
    g.suspHz     = rand(cfg.SUSPHZ_MIN, cfg.SUSPHZ_MAX);
    g.suspDamp   = rand(cfg.SUSPDAMP_MIN, cfg.SUSPDAMP_MAX);
    return normalize(g);
}

// Two ways to combine bodies: take one parent's whole body, or splice an
// arc of corners from one parent onto the rest of the other. Wheels come as
// a set from one parent; because they are stored by angle they land in the
// same place on the new body (front-bottom stays front-bottom).
function crossover(a, b) {
    const c = { hue: Math.random() < 0.5 ? a.hue : b.hue };

    let pts = null;
    if (Math.random() < 0.5) {
        const cut = Math.random() * TAU, span = rand(0.25, 0.75) * TAU;
        const inArc = (ang) => wrap(ang - cut) < span;
        pts = a.points.filter(p => inArc(p.angle)).concat(b.points.filter(p => !inArc(p.angle)));
        if (pts.length < 3) pts = null;
    }
    if (!pts) pts = (Math.random() < 0.5 ? a : b).points;
    c.points = pts.map(p => ({ angle: p.angle, radius: p.radius }));
    c.wheels = (Math.random() < 0.5 ? a : b).wheels.map(w => ({ angle: w.angle, radius: w.radius }));

    const mix = (x, y) => x + (y - x) * Math.random();
    c.motorSpeed = mix(a.motorSpeed, b.motorSpeed);
    c.density    = mix(a.density, b.density);
    c.suspHz     = mix(a.suspHz, b.suspHz);
    c.suspDamp   = mix(a.suspDamp, b.suspDamp);
    return normalize(c);
}

function mutate(parent, cfg) {
    const c = clone(parent);
    const m = cfg.MUTATION_RATE;
    const [minP, maxP] = range(cfg.MIN_POINTS, cfg.MAX_POINTS);
    const [minW, maxW] = range(cfg.MIN_WHEELS, cfg.MAX_WHEELS);

    // A new corner sits on the existing outline (give or take 20%), so adding
    // one is a small change rather than a random spike.
    const newPoint = () => {
        const angle = Math.random() * TAU;
        const r = c.points.length >= 3 ? outlineRadius(c.points, angle) : 1;
        return { angle, radius: clamp(r * rand(0.8, 1.2), cfg.POINT_R_MIN, cfg.POINT_R_MAX) };
    };
    const removeRandom = (arr) => arr.splice(Math.floor(Math.random() * arr.length), 1);

    // Corner count
    if (c.points.length < minP) {
        while (c.points.length < minP) { c.points.push(newPoint()); normalize(c); }
    } else if (c.points.length > maxP) {
        while (c.points.length > maxP) removeRandom(c.points);
    } else if (Math.random() < m * 0.5) {
        if (Math.random() < 0.5 && c.points.length < maxP) c.points.push(newPoint());
        else if (c.points.length > minP) removeRandom(c.points);
    }

    // Body shape
    c.points.forEach(p => {
        if (Math.random() < m) {
            const shift = (Math.random() - 0.5) + cfg.NUDGE_BODY_SIZE * 0.5;
            p.radius = clamp(p.radius + shift * m * 3, cfg.POINT_R_MIN, cfg.POINT_R_MAX);
        }
        if (Math.random() < m) p.angle += (Math.random() - 0.5) * m;
    });
    normalize(c);

    // Wheel size
    c.wheels.forEach(w => {
        if (Math.random() < m) {
            const shift = (Math.random() - 0.5) + cfg.NUDGE_WHEEL_SIZE * 0.5;
            w.radius = clamp(w.radius + shift * m, cfg.WHEEL_R_MIN, cfg.WHEEL_R_MAX);
        }
    });

    // Wheel count
    if (c.wheels.length < minW) {
        while (c.wheels.length < minW) c.wheels.push({ angle: randomWheelAngle(c), radius: 0.3 });
    } else if (c.wheels.length > maxW) {
        while (c.wheels.length > maxW) removeRandom(c.wheels);
    } else if (Math.random() < m * 0.5) {
        const addProb = 0.5 + cfg.NUDGE_WHEELS * 0.4;
        if (Math.random() < addProb) {
            if (c.wheels.length < maxW) c.wheels.push({ angle: randomWheelAngle(c), radius: 0.3 });
        } else if (c.wheels.length > minW) removeRandom(c.wheels);
    }

    // Wheel position: usually a slide along the outline, occasionally a jump.
    if (Math.random() < m * 0.5 && c.wheels.length > 0) {
        const w = c.wheels[Math.floor(Math.random() * c.wheels.length)];
        if (Math.random() < 0.2) w.angle = randomWheelAngle(c);
        else w.angle += (Math.random() - 0.5) * m * 2;
    }

    // Tuning genes
    if (Math.random() < m) c.motorSpeed = clamp(c.motorSpeed + (Math.random() - 0.5) * m * 30, cfg.MOTOR_MIN, cfg.MOTOR_MAX);
    if (Math.random() < m) c.density    = clamp(c.density    + (Math.random() - 0.5) * m * 2, cfg.DENSITY_MIN, cfg.DENSITY_MAX);
    if (Math.random() < m) c.suspHz     = clamp(c.suspHz     + (Math.random() - 0.5) * m * 6, cfg.SUSPHZ_MIN, cfg.SUSPHZ_MAX);
    if (Math.random() < m) c.suspDamp   = clamp(c.suspDamp   + (Math.random() - 0.5) * m * 0.6, cfg.SUSPDAMP_MIN, cfg.SUSPDAMP_MAX);

    if (Math.random() < 0.1) c.hue = (c.hue + Math.floor((Math.random() - 0.5) * 20) + 360) % 360;

    return normalize(c);
}

/* =====================================================================
   TRACKS
   ===================================================================== */

// Small seeded RNG so a whole generation shares one rough track.
function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
        t = (t + 0x6D2B79F5) >>> 0;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

// Rough terrain: three sine layers with random phase and frequency, new each
// generation, so cars learn "bumpy ground" rather than one memorised course.
// Bumps fade in over the first 15 m and grow slowly with distance.
function makeTerrain(seed) {
    const r = mulberry32(seed);
    const layer = (fLo, fHi, aLo, aHi) => ({ f: fLo + r() * (fHi - fLo), a: aLo + r() * (aHi - aLo), p: r() * TAU });
    return { seed, layers: [layer(0.15, 0.3, 0.5, 0.8), layer(0.45, 0.75, 0.25, 0.45), layer(1.0, 1.5, 0.12, 0.28)] };
}

function roughHeight(x, terrain) {
    if (x <= 5) return 0;
    const env = clamp((x - 5) / 10, 0, 1) * Math.min(1.4, 0.6 + x / 250);
    let h = 0;
    for (const L of terrain.layers) h += Math.sin(x * L.f + L.p) * L.a;
    return h * env;
}

const JUMP_RAMP = (x) => 0.035 * x * x - 2.93 * x + 61.4;

function groundHeight(x, cfg, terrain) {
    switch (cfg.TRACK_TYPE) {
        case 'hill':  return x > 0 ? (x * x) / 1000 : 0;
        case 'rough': return roughHeight(x, terrain);
        case 'jump':
            if (x <= 0) return 30;
            if (x <= 30) return 30 - x * (25 / 30);
            if (x <= 50) return JUMP_RAMP(x);
            if (x < 65) return null;          // the gap
            return -15 - (x - 65) * (15 / 435);
        default: return 0;
    }
}

function startPos(cfg) { return cfg.TRACK_TYPE === 'jump' ? { x: 0, y: 33 } : { x: 0, y: 2.5 }; }

function buildTrack(world, cfg, terrain) {
    const P = pl();
    const ground = world.createBody({ type: 'static' });
    ground.setUserData('ground');
    const fr = { friction: 2.0 };
    const edge = (x1, y1, x2, y2) => ground.createFixture(P.Edge(P.Vec2(x1, y1), P.Vec2(x2, y2)), fr);

    const t = cfg.TRACK_TYPE;
    if (t === 'flat') {
        edge(-20, 10, -20, 0);
        edge(-20, 0, cfg.TRACK_LENGTH + 50, 0);
    } else if (t === 'hill' || t === 'rough') {
        edge(-20, 10, -20, 0);
        const seg = t === 'hill' ? 5 : 1;
        const len = t === 'hill' ? cfg.HILL_LENGTH : cfg.ROUGH_LENGTH;
        let x = -20, y = 0;
        while (x < len) {
            const nx = x + seg, ny = groundHeight(nx, cfg, terrain);
            edge(x, y, nx, ny);
            x = nx; y = ny;
        }
    } else if (t === 'jump') {
        edge(-10, 30, 0, 30);
        edge(-10, 40, -10, 30);
        edge(0, 30, 30, 5);
        let x = 30, y = 5;
        while (x < 50) { const nx = x + 2, ny = JUMP_RAMP(nx); edge(x, y, nx, ny); x = nx; y = ny; }
        edge(65, -15, 500, -30);
    }
    return ground;
}

/* =====================================================================
   RACE: one generation, every car in one shared world.
   Cars only collide with the ground (category bits), not each other.
   ===================================================================== */

const MIN_SLICE_AREA = 0.01;   // Planck turns degenerate triangles into a 2 m box; skip them

class Race {
    constructor(genomes, cfg, opts) {
        const P = pl();
        this.cfg = Object.assign({}, cfg);
        this.terrain = makeTerrain((opts && opts.terrainSeed) || 1);
        this.time = 0;
        this.over = false;
        this.world = P.World(P.Vec2(0, this.cfg.GRAVITY));
        buildTrack(this.world, this.cfg, this.terrain);
        this.cars = genomes.map((g, i) => this.createCar(g, i));
        if (this.cfg.TRACK_TYPE === 'jump') this.world.on('begin-contact', (c) => this.onContact(c));
    }

    onContact(contact) {
        const bA = contact.getFixtureA().getBody(), bB = contact.getFixtureB().getBody();
        const uA = bA.getUserData(), uB = bB.getUserData();
        const carBody = uA === 'ground' ? bB : (uB === 'ground' ? bA : null);
        if (!carBody) return;
        const ud = carBody.getUserData();
        if (ud && typeof ud === 'object' && ud.carIndex != null) {
            const car = this.cars[ud.carIndex];
            if (car && !car.done && car.body && !car.hasLanded && car.body.getPosition().x > 60) car.hasLanded = true;
        }
    }

    createCar(genome, index) {
        const P = pl(), cfg = this.cfg, world = this.world;
        const sp = startPos(cfg);
        const verts = genome.points.map(p => { const v = cornerXY(p); return P.Vec2(v.x, v.y); });

        const body = world.createBody({ type: 'dynamic', position: P.Vec2(sp.x, sp.y), angularDamping: 0.5 });
        body.setUserData({ carIndex: index });

        const area = bodyArea(genome.points);
        const filter = { filterCategoryBits: 0x0002, filterMaskBits: 0x0001 };
        let slices = 0;
        for (let i = 0; i < verts.length; i++) {
            const p1 = verts[i], p2 = verts[(i + 1) % verts.length];
            if (0.5 * Math.abs(p1.x * p2.y - p1.y * p2.x) < MIN_SLICE_AREA) continue;
            const f = body.createFixture(P.Polygon([P.Vec2(0, 0), p1, p2]), Object.assign({ density: genome.density, friction: 2.0 }, filter));
            f.setUserData({ color: `hsl(${genome.hue}, 70%, ${50 + (i % 2) * 10}%)` });
            slices++;
        }
        if (!slices) body.createFixture(P.Circle(0.2), Object.assign({ density: genome.density, friction: 2.0 }, filter));

        const torquePerWheel = (area * cfg.POWER_DENSITY) / Math.max(1, genome.wheels.length);
        const bodies = [body], wheelData = [];
        let wheelMass = 0;
        genome.wheels.forEach(w => {
            const m = mountPoint(genome.points, w.angle);
            const wb = world.createBody({ type: 'dynamic', position: P.Vec2(sp.x + m.x, sp.y + m.y) });
            wb.setUserData({ carIndex: index });
            wb.createFixture(P.Circle(w.radius), Object.assign({ density: cfg.WHEEL_DENSITY, friction: 3.0, restitution: 0.1 }, filter));
            wheelMass += Math.PI * w.radius * w.radius * cfg.WHEEL_DENSITY;
            const joint = world.createJoint(P.WheelJoint({
                motorSpeed: -genome.motorSpeed,
                maxMotorTorque: torquePerWheel,
                enableMotor: true,
                frequencyHz: genome.suspHz,
                dampingRatio: genome.suspDamp
            }, body, wb, wb.getPosition(), P.Vec2(0, 1)));
            wheelData.push({ body: wb, joint, radius: w.radius });
            bodies.push(wb);
        });

        return {
            genome, index, body, bodies, wheelData,
            bodyArea: area, totalMass: area * genome.density + wheelMass,
            done: false, finished: false, distance: 0, time: 0,
            stuckTimer: 0, backTimer: 0,
            hasLanded: false, postRunTimer: 0, maxHeight: sp.y,
            prevX: sp.x, movedDist: 0, rolledDist: 0,
            prevWheelAngles: wheelData.map(wd => wd.body.getAngle()),
            slideFrac: 0, doneReason: '', result: null
        };
    }

    step() {
        if (this.over) return;
        this.world.step(DT);
        this.time += DT;
        for (const c of this.cars) if (!c.done) this.updateCar(c);
        if (this.time > this.cfg.MAX_TIME) this.cars.forEach(c => { if (!c.done) this.finalize(c, 'Time limit'); });
        if (this.cars.every(c => c.done)) this.over = true;
    }

    // Stop everyone now (skip button).
    finishAll(reason) {
        this.cars.forEach(c => { if (!c.done) this.finalize(c, reason); });
        this.over = true;
    }

    updateCar(car) {
        const cfg = this.cfg, t = cfg.TRACK_TYPE;
        const pos = car.body.getPosition(), vel = car.body.getLinearVelocity();
        const speed = vel.length();

        const fx = frontX(car);
        if (fx > car.distance) car.distance = fx;

        // How far it rolled (wheel turn x radius) vs how far it moved.
        const dx = pos.x - car.prevX;
        if (dx > 0) car.movedDist += dx;
        let maxRoll = 0;
        car.wheelData.forEach((wd, i) => {
            const a = wd.body.getAngle();
            const roll = Math.abs(a - car.prevWheelAngles[i]) * wd.radius;
            car.prevWheelAngles[i] = a;
            if (roll > maxRoll) maxRoll = roll;
        });
        car.rolledDist += maxRoll;
        car.prevX = pos.x;

        if (t === 'jump') {
            if (pos.y > car.maxHeight) car.maxHeight = pos.y;
            if (car.hasLanded) car.postRunTimer += DT;
        }

        if (speed < 0.1) car.stuckTimer += DT; else car.stuckTimer = 0;

        let reason = '';
        if (t === 'flat' && fx >= cfg.TRACK_LENGTH) {
            car.finished = true;
            car.time = this.time;
            reason = `Finished ${this.time.toFixed(2)}s`;
        }
        if (!reason && pos.y < -50) reason = 'Fell off';
        if (!reason && car.stuckTimer > cfg.STUCK_TIME) reason = 'Stuck';
        if (!reason && (t === 'hill' || t === 'rough')) {
            if (vel.x < -0.5) { car.backTimer += DT; if (car.backTimer > 3) reason = 'Slid backwards'; }
            else car.backTimer = 0;
        }
        if (!reason && t === 'jump') {
            if (car.hasLanded && car.postRunTimer > 3) reason = 'Jump complete';
            else if (car.hasLanded && speed < 0.1 && car.postRunTimer > 1) reason = 'Stopped';
        }
        if (reason) this.finalize(car, reason);
    }

    finalize(car, reason) {
        if (car.done) return;
        car.done = true;
        car.doneReason = reason;
        car.slideFrac = car.movedDist > 0.5 ? clamp(1 - car.rolledDist / car.movedDist, 0, 1) : 0;
        car.result = {
            distance: car.distance, finished: car.finished, time: car.time,
            slideFrac: car.slideFrac, totalMass: car.totalMass, maxHeight: car.maxHeight
        };
        car.result.fitness = fitness(car.result, this.cfg);
        car.result.score = score(car.result, this.cfg);
        // Remove the car so the arena declutters and survivors stand out.
        car.bodies.forEach(b => { try { this.world.destroyBody(b); } catch (e) { /* already gone */ } });
        car.bodies = [];
        car.body = null;
        if (this.onFinalize) this.onFinalize(car, reason);
    }

    // Run to the end with no drawing (worker + tests).
    runToEnd() { while (!this.over) this.step(); return this; }

    leader() {
        let best = null;
        for (const c of this.cars) if (!c.done && c.body && (!best || c.distance > best.distance)) best = c;
        return best;
    }
}

function frontX(car) {
    const P = pl();
    let fx = -Infinity;
    for (const b of car.bodies) {
        const xf = b.getTransform();
        for (let f = b.getFixtureList(); f; f = f.getNext()) {
            const s = f.getShape();
            if (s.getType() === 'circle') fx = Math.max(fx, P.Transform.mul(xf, s.m_p).x + s.m_radius);
            else if (s.getType() === 'polygon') s.m_vertices.forEach(v => { fx = Math.max(fx, P.Transform.mul(xf, v).x); });
        }
    }
    return fx;
}

/* =====================================================================
   SCORING AND EVOLUTION
   ===================================================================== */

// Selection fitness. Sliding (moving further than the wheels rolled) costs
// up to half the distance; flat finishers always beat non-finishers, then
// faster wins, then lighter.
function fitness(r, cfg) {
    const slideMult = 1 - 0.5 * clamp(r.slideFrac, 0, 1);
    if (cfg.TRACK_TYPE === 'flat' && r.finished) return 100000 - r.time * 1000 - r.totalMass;
    return Math.max(0, r.distance) * slideMult;
}

// Human-readable number for the graph: distance in m, or for the sprint the
// average speed over 100 m (non-finishers: distance / time limit, so they
// always sit below finishers).
function score(r, cfg) {
    if (cfg.TRACK_TYPE === 'flat') return r.finished ? cfg.TRACK_LENGTH / Math.max(r.time, 0.01) : Math.max(0, r.distance) / cfg.MAX_TIME;
    return Math.max(0, r.distance);
}
function scoreLabel(cfg) { return cfg.TRACK_TYPE === 'flat' ? 'average speed (m/s)' : 'distance (m)'; }
function metricStr(r, cfg) {
    if (cfg.TRACK_TYPE === 'flat' && r.finished) return `${r.time.toFixed(2)}s`;
    return `${Math.max(0, r.distance).toFixed(1)}m`;
}

// Takes [{ genome, r }] (r = a car's result), returns the next population and
// a summary record. Mutates cfg.MUTATION_RATE (decay with a floor), as the UI
// slider follows it. entriesFromRace() builds the input from a finished Race;
// the background workers send results back in the same shape.
function entriesFromRace(race) { return race.cars.map(c => ({ genome: c.genome, r: c.result })); }

function evolve(entries, cfg) {
    const ranked = entries.slice().sort((a, b) => b.r.fitness - a.r.fitness);
    const best = ranked[0];
    const record = {
        best: best.r.score,
        avg: ranked.reduce((s, x) => s + x.r.score, 0) / ranked.length,
        str: metricStr(best.r, cfg),
        finished: best.r.finished,
        champion: toData(best.genome)
    };

    cfg.MUTATION_RATE = Math.max(cfg.MUTATION_FLOOR, cfg.MUTATION_RATE * cfg.MUTATION_DECAY);

    const tournament = () => {
        let pick = null;
        for (let i = 0; i < cfg.TOURNAMENT_K; i++) {
            const c = ranked[Math.floor(Math.random() * ranked.length)];
            if (!pick || c.r.fitness > pick.r.fitness) pick = c;
        }
        return pick.genome;
    };

    const next = [];
    for (let i = 0; i < cfg.ELITE_COUNT && i < ranked.length && next.length < cfg.POPULATION_SIZE; i++) next.push(clone(ranked[i].genome));
    for (let i = 0; i < cfg.IMMIGRANT_COUNT && next.length < cfg.POPULATION_SIZE; i++) next.push(random(cfg));
    while (next.length < cfg.POPULATION_SIZE) next.push(mutate(crossover(tournament(), tournament()), cfg));
    return { population: next, record };
}

function newSeed() { return (Math.random() * 4294967296) >>> 0; }

const RC = {
    TAU, DT, DEFAULTS, TRACKS, clamp, wrap,
    normalize, clone, fromData, toData, mountPoint, outlineRadius, bodyArea, stats, cornerXY,
    random, crossover, mutate,
    makeTerrain, groundHeight, startPos, Race, frontX,
    fitness, score, scoreLabel, metricStr, evolve, entriesFromRace, newSeed
};

if (typeof module !== 'undefined' && module.exports) module.exports = RC;
else root.RC = RC;

})(typeof self !== 'undefined' ? self : globalThis);
