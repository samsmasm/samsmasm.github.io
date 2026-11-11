/* app.js: the Racecar page. Live arena (draws one Race at a time), the
   background evolution pool, and all the panels. Physics, genomes and
   evolution live in sim.js, shared with worker.js. */
(function () {
'use strict';

const $ = (id) => document.getElementById(id);
const CONFIG = Object.assign({}, RC.DEFAULTS);
const MAX_LOG = 150, MAX_HISTORY_ROWS = 400;

let population = [];
let race = null;
let generation = 1;
let simSpeed = 4;
let frame = 0;
let camX = 0, camY = 2.5, scale = 40;
let history = [];                  // [{ gen, best, avg, str, finished, champion }]
let bg = null;                     // background run state, or null
let canvas, ctx, dpr = 1;

/* ---------- logging and small UI helpers ---------- */

function log(msg) {
    const el = $('log');
    const lines = (el.textContent ? el.textContent.split('\n') : []).concat(msg);
    el.textContent = lines.slice(-MAX_LOG).join('\n');
    el.scrollTop = el.scrollHeight;
}

function setIo(msg, isErr) { const el = $('ioStatus'); el.textContent = msg; el.className = isErr ? 'err' : ''; }
function setBg(msg, isErr) { const el = $('bgStatus'); el.textContent = msg; el.className = isErr ? 'err' : ''; }

function syncMutationSlider() {
    const v = Math.round(CONFIG.MUTATION_RATE * 100);
    $('inputMutation').value = v;
    $('valMutation').textContent = v + '%';
}

/* ---------- generations ---------- */

function resetSimulation(seed) {
    stopBackground();
    generation = 1;
    history = [];
    CONFIG.MUTATION_RATE = 0.5;
    syncMutationSlider();
    $('listHistory').innerHTML = '';
    $('log').textContent = '';
    drawGraph();
    population = [];
    if (seed) { population.push(seed); log('Started from your car.'); }
    while (population.length < CONFIG.POPULATION_SIZE) population.push(RC.random(CONFIG));
    startGeneration();
}

function startGeneration() {
    race = new RC.Race(population, CONFIG, { terrainSeed: RC.newSeed() });
    race.onFinalize = (car, reason) => log(`Gen ${generation}, car ${car.index + 1}: ${reason}`);
    const sp = RC.startPos(CONFIG);
    camX = sp.x; camY = sp.y;
    $('dispGen').textContent = generation;
    $('dispPop').textContent = population.length;
}

function recordGeneration(rec) {
    rec.gen = generation;
    history.push(rec);
    const row = document.createElement('div');
    row.className = rec.finished ? 'fin' : '';
    row.title = 'Put this car in the Save box';
    row.innerHTML = `<span>Gen ${rec.gen}</span><span>${rec.str}</span>`;
    row.onclick = () => {
        $('ioTextarea').value = JSON.stringify(rec.champion);
        setIo(`Generation ${rec.gen}'s best car is in the box.`);
        openDetails('ioTextarea');
    };
    const list = $('listHistory');
    list.prepend(row);
    while (list.children.length > MAX_HISTORY_ROWS) list.lastChild.remove();
    drawGraph();
}

function finishLiveGeneration() {
    const out = RC.evolve(RC.entriesFromRace(race), CONFIG);
    log(`--- Gen ${generation} done: best ${out.record.str} ---`);
    recordGeneration(out.record);
    syncMutationSlider();
    population = out.population;
    generation++;
    startGeneration();
}

/* ---------- background evolution (worker pool) ---------- */

const pool = { workers: [], pending: new Map(), nextId: 1 };

function poolSize() {
    const cores = navigator.hardwareConcurrency || 4;
    return Math.max(1, Math.min(cores - 1, 8));
}

function ensurePool() {
    if (pool.workers.length) return;
    for (let i = 0; i < poolSize(); i++) {
        const w = new Worker('worker.js');
        w.onmessage = (e) => {
            const p = pool.pending.get(e.data.id);
            if (!p) return;
            pool.pending.delete(e.data.id);
            if (e.data.error) p.reject(new Error(e.data.error)); else p.resolve(e.data.results);
        };
        w.onerror = (e) => {
            e.preventDefault();
            const err = new Error(e.message || 'Background worker failed to start');
            pool.pending.forEach(p => p.reject(err));
            pool.pending.clear();
            killPool();
        };
        pool.workers.push(w);
    }
}

function killPool() {
    pool.workers.forEach(w => w.terminate());
    pool.workers = [];
}

function raceIn(worker, genomes, config, terrainSeed) {
    return new Promise((resolve, reject) => {
        const id = pool.nextId++;
        pool.pending.set(id, { resolve, reject });
        worker.postMessage({ id, genomes, config, terrainSeed });
    });
}

async function runBackground(gens) {
    try { ensurePool(); }
    catch (e) { setBg('Background evolution needs the page served from a website, not opened as a file.', true); return; }

    const run = bg = { stop: false, aborted: false, target: generation + gens, started: performance.now(), startGen: generation };
    $('btnFast').textContent = 'Stop';
    $('btnSkip').disabled = true;
    race = null;                                 // drop the half-run live race
    log(`Evolving ${gens} generations in the background on ${pool.workers.length} cores...`);

    try {
        while (!run.stop && generation < run.target) {
            const cfg = Object.assign({}, CONFIG);
            const seed = RC.newSeed();
            const n = pool.workers.length;
            const per = Math.ceil(population.length / n);
            const jobs = [];
            for (let i = 0; i < n; i++) {
                const chunk = population.slice(i * per, (i + 1) * per);
                if (chunk.length) jobs.push(raceIn(pool.workers[i], chunk, cfg, seed));
            }
            const results = (await Promise.all(jobs)).flat();
            const out = RC.evolve(population.map((g, i) => ({ genome: g, r: results[i] })), CONFIG);
            recordGeneration(out.record);
            syncMutationSlider();
            population = out.population;
            generation++;
            const done = generation - run.startGen, secs = (performance.now() - run.started) / 1000;
            setBg(`Generation ${generation - 1} done (${done} of ${gens}), best ${out.record.str}. ${(secs / done).toFixed(1)}s each on ${n} cores.`);
            $('dispGen').textContent = generation;
        }
        const ran = generation - run.startGen;
        setBg(run.stop ? `Stopped after ${ran} generations. Watching the latest one.` : `Done: ${ran} generations. Watching the latest one.`);
        log(`Background run finished at generation ${generation - 1}.`);
    } catch (e) {
        if (run.aborted) return;             // track change or load: the page has already reset
        setBg('Background evolution failed: ' + e.message, true);
        killPool();
    }
    bg = null;
    $('btnFast').textContent = 'Evolve';
    $('btnSkip').disabled = false;
    startGeneration();
}

function stopBackground() {
    if (!bg) return;
    bg.stop = true;
    bg.aborted = true;
    bg = null;
    // Abandon the generation in flight so a track change takes effect at once.
    killPool();
    pool.pending.forEach(p => p.reject(new Error('stopped')));
    pool.pending.clear();
    $('btnFast').textContent = 'Evolve';
    $('btnSkip').disabled = false;
}

/* ---------- main loop ---------- */

function loop() {
    requestAnimationFrame(loop);
    if (bg) { drawBackgroundScreen(); return; }
    if (!race) return;

    for (let s = 0; s < simSpeed; s++) {
        race.step();
        if (race.over) { finishLiveGeneration(); return; }
    }

    const leader = race.leader();
    if (leader) {
        const p = leader.body.getPosition();
        camX += (p.x - camX) * 0.15;
        camY += (p.y - camY) * 0.15;
    }
    frame++;
    updateHud(leader);
    if (frame % 12 === 0) updateLeaderboard(leader);
    render(leader ? leader.index : -1);
}

/* ---------- rendering ---------- */

function resize() {
    dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    scale = Math.max(22, Math.min(40, Math.min(r.width, r.height) / 16));
    drawGraph();
}

// Visible gap between the side panels (they are hidden below 860px).
const wide = (W) => W > 860;
const viewLeft = (W) => wide(W) ? 324 : 0;
const viewRight = (W) => wide(W) ? W - 274 : W;

function render(leaderIndex) {
    const W = canvas.width / dpr, H = canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#f7f6f2';
    ctx.fillRect(0, 0, W, H);

    // Leader sits 40% across the gap between the panels, so you see what is coming.
    const viewCx = viewLeft(W) + 0.4 * (viewRight(W) - viewLeft(W));
    ctx.translate(viewCx - camX * scale, H / 2 + camY * scale);
    ctx.scale(1, -1);

    const minX = camX - viewCx / scale - 2, maxX = camX + (W - viewCx) / scale + 2;
    drawMarkers(minX, maxX);

    for (let b = race.world.getBodyList(); b; b = b.getNext()) {
        const ud = b.getUserData();
        if (ud === 'ground') { ctx.globalAlpha = 1; drawGround(b, minX, maxX); continue; }
        const isLeader = ud && ud.carIndex === leaderIndex;
        ctx.globalAlpha = isLeader ? 1 : 0.28;
        drawCarBody(b, isLeader);
    }
    ctx.globalAlpha = 1;
}

function drawGround(b, minX, maxX) {
    ctx.strokeStyle = '#1e2a4a';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let f = b.getFixtureList(); f; f = f.getNext()) {
        const s = f.getShape();
        const v1 = s.m_vertex1, v2 = s.m_vertex2;
        if (Math.max(v1.x, v2.x) < minX || Math.min(v1.x, v2.x) > maxX) continue;
        ctx.moveTo(v1.x * scale, v1.y * scale);
        ctx.lineTo(v2.x * scale, v2.y * scale);
    }
    ctx.stroke();
}

function drawCarBody(b, isLeader) {
    const pos = b.getPosition();
    ctx.save();
    ctx.translate(pos.x * scale, pos.y * scale);
    ctx.rotate(b.getAngle());
    for (let f = b.getFixtureList(); f; f = f.getNext()) {
        const s = f.getShape(), ud = f.getUserData();
        if (s.getType() === 'polygon') {
            ctx.fillStyle = (ud && ud.color) || '#7a1a4a';
            ctx.beginPath();
            s.m_vertices.forEach((v, i) => { i ? ctx.lineTo(v.x * scale, v.y * scale) : ctx.moveTo(v.x * scale, v.y * scale); });
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = isLeader ? '#f4a629' : 'rgba(30,42,74,.5)';
            ctx.lineWidth = isLeader ? 2.5 : 1;
            ctx.stroke();
        } else if (s.getType() === 'circle') {
            const r = s.m_radius * scale, cx = s.m_p.x * scale, cy = s.m_p.y * scale;
            ctx.fillStyle = isLeader ? '#1e2a4a' : '#3d4660';
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, RC.TAU); ctx.fill();
            ctx.strokeStyle = '#fffdf8';
            ctx.lineWidth = isLeader ? 2 : 1;
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + r, cy); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + r); ctx.stroke();
        }
    }
    ctx.restore();
}

function drawMarkers(minX, maxX) {
    const start = Math.max(0, Math.floor(minX / 10) * 10);
    ctx.save();
    ctx.scale(1, -1);                              // text the right way up
    ctx.font = '12px "Atkinson Hyperlegible", sans-serif';
    ctx.textAlign = 'center';
    for (let x = start; x <= maxX; x += 10) {
        const y = RC.groundHeight(x, CONFIG, race.terrain);
        if (y === null) continue;
        const finish = CONFIG.TRACK_TYPE === 'flat' && x === CONFIG.TRACK_LENGTH;
        ctx.fillStyle = finish ? '#8a1c1c' : '#c9c4b6';
        ctx.fillRect(x * scale - (finish ? 2 : 1), -y * scale - 100, finish ? 4 : 2, 100);
        ctx.fillStyle = finish ? '#8a1c1c' : '#5b6680';
        ctx.fillText(finish ? 'FINISH' : `${x} m`, x * scale, -y * scale + 18);
    }
    ctx.restore();
}

function drawBackgroundScreen() {
    const W = canvas.width / dpr, H = canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#f7f6f2';
    ctx.fillRect(0, 0, W, H);
    const cx = (viewLeft(W) + viewRight(W)) / 2;
    ctx.fillStyle = '#1e2a4a';
    ctx.textAlign = 'center';
    ctx.font = '600 24px Fraunces, Georgia, serif';
    ctx.fillText('Evolving in the background', cx, H / 2 - 10);
    ctx.font = '15px "Atkinson Hyperlegible", sans-serif';
    ctx.fillStyle = '#5b6680';
    ctx.fillText(`Generation ${generation} of ${bg.target - 1}. The latest one races here when it finishes.`, cx, H / 2 + 18);
}

/* ---------- panels ---------- */

function updateHud(leader) {
    $('dispAlive').textContent = race.cars.filter(c => !c.done).length;
    $('dispTime').textContent = race.time.toFixed(1) + 's';
    $('dispLead').textContent = leader ? Math.max(0, leader.distance).toFixed(1) + 'm' : '-';
    $('dispHeight').textContent = leader ? leader.maxHeight.toFixed(1) + 'm' : '-';
    if (!leader || frame % 6) return;
    const g = leader.genome;
    $('dispPower').textContent = (leader.bodyArea * CONFIG.POWER_DENSITY).toFixed(0) + ' Nm';
    $('dispMass').textContent = leader.totalMass.toFixed(1) + ' kg';
    $('dispMotor').textContent = g.motorSpeed.toFixed(1) + ' rad/s';
    $('dispDensity').textContent = g.density.toFixed(2);
    $('dispSusp').textContent = g.suspHz.toFixed(1) + ' Hz, ' + g.suspDamp.toFixed(2) + ' damping';
    $('dispWheels').textContent = g.wheels.length + ' / ' + g.points.length;
    const slide = leader.movedDist > 0.5 ? RC.clamp(1 - leader.rolledDist / leader.movedDist, 0, 1) : 0;
    $('dispSlide').textContent = Math.round(slide * 100) + '%';
}

function liveRank(c) {
    if (CONFIG.TRACK_TYPE === 'flat' && c.finished) return c.time;
    if (CONFIG.TRACK_TYPE === 'flat') return 1000 - c.distance;
    return -c.distance;
}

function updateLeaderboard(leader) {
    const sorted = [...race.cars].sort((a, b) => liveRank(a) - liveRank(b));
    const list = $('listCurrentGen');
    list.innerHTML = '';
    sorted.slice(0, 15).forEach((c, i) => {
        const div = document.createElement('div');
        div.className = c === leader ? 'lead' : (c.finished ? 'fin' : (c.done ? 'done' : ''));
        const metric = CONFIG.TRACK_TYPE === 'flat' && c.finished ? c.time.toFixed(2) + 's' : Math.max(0, c.distance).toFixed(1) + 'm';
        div.innerHTML = `<span>${i + 1}. Car ${c.index + 1}</span><span>${metric}${c.done && !c.finished ? ' · out' : ''}</span>`;
        list.appendChild(div);
    });
}

function drawGraph() {
    const c = $('fitnessGraph');
    const r = c.getBoundingClientRect();
    if (!r.width) return;
    c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = r.width, H = r.height, pad = 6;
    g.clearRect(0, 0, W, H);
    $('graphLabel').textContent = 'Best per generation, ' + RC.scoreLabel(CONFIG);
    $('graphLatest').textContent = history.length ? history[history.length - 1].str : '';
    if (!history.length) return;

    const max = Math.max(...history.map(h => h.best)) || 1;
    const xAt = (i) => history.length > 1 ? pad + (i / (history.length - 1)) * (W - pad * 2) : W / 2;
    const yAt = (v) => H - pad - (v / max) * (H - pad * 2 - 12);

    g.fillStyle = '#5b6680';
    g.font = '11px "Atkinson Hyperlegible", sans-serif';
    g.fillText(max.toFixed(max < 50 ? 1 : 0), pad, 12);

    const line = (key, color, width) => {
        g.strokeStyle = color; g.lineWidth = width; g.lineJoin = 'round';
        g.beginPath();
        history.forEach((h, i) => { const x = xAt(i), y = yAt(h[key]); i ? g.lineTo(x, y) : g.moveTo(x, y); });
        g.stroke();
    };
    line('avg', '#9aa3b8', 1.5);
    line('best', '#f4a629', 2.5);
}

function openDetails(childId) {
    const d = $(childId).closest('details');
    if (d) d.open = true;
}

/* ---------- controls ---------- */

function selectTrack(type) {
    if (type === CONFIG.TRACK_TYPE) return;
    if (generation > 5 && !confirm(`Switch track? This starts again from random cars (you are on generation ${generation}).`)) return;
    CONFIG.TRACK_TYPE = type;
    document.querySelectorAll('.tracks button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.track === type)));
    applyTrackLabels();
    setBg('');
    resetSimulation();
}

function applyTrackLabels() {
    $('goal').textContent = RC.TRACKS[CONFIG.TRACK_TYPE].goal;
    const jump = CONFIG.TRACK_TYPE === 'jump';
    $('rowHeightLabel').hidden = !jump;
    $('dispHeight').hidden = !jump;
}

function copyLeader() {
    let car = race && race.leader();
    if (!car && race) car = [...race.cars].sort((a, b) => liveRank(a) - liveRank(b))[0];
    const g = car ? car.genome : population[0];
    if (!g) return;
    const json = JSON.stringify(RC.toData(g));
    $('ioTextarea').value = json;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(json).then(() => setIo('Copied the leader to your clipboard.'), () => setIo('The leader is in the box. Copy it from there.'));
    } else setIo('The leader is in the box. Copy it from there.');
}

function loadFromText(text) {
    try {
        const g = RC.fromData(JSON.parse(text));
        setIo('Loaded. Generation 1 starts with your car plus random ones.');
        resetSimulation(g);
        return true;
    } catch (e) {
        setIo("That isn't a car this page can read (" + e.message + ').', true);
        return false;
    }
}

function bindControls() {
    document.querySelectorAll('.tracks button').forEach(b => { b.onclick = () => selectTrack(b.dataset.track); });

    document.querySelectorAll('.seg button').forEach(b => {
        b.onclick = () => {
            simSpeed = parseInt(b.dataset.speed, 10);
            document.querySelectorAll('.seg button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        };
    });

    $('btnSkip').onclick = () => { if (race && !race.over) race.finishAll('Race ended early'); };
    $('btnFast').onclick = () => { if (bg) { bg.stop = true; setBg('Stopping after this generation...'); } else runBackground(parseInt($('selGens').value, 10)); };

    $('btnPanels').onclick = () => {
        const open = document.body.classList.toggle('panels-open');
        $('btnPanels').setAttribute('aria-expanded', String(open));
        if (open) drawGraph();
    };

    $('inputPop').oninput = (e) => { CONFIG.POPULATION_SIZE = parseInt(e.target.value, 10); $('valPop').textContent = CONFIG.POPULATION_SIZE; };
    $('inputMutation').oninput = (e) => { CONFIG.MUTATION_RATE = parseInt(e.target.value, 10) / 100; $('valMutation').textContent = e.target.value + '%'; };
    $('inputDecay').oninput = (e) => { const v = parseInt(e.target.value, 10); CONFIG.MUTATION_DECAY = 1 - v / 100; $('valDecay').textContent = v + '%'; };
    $('inputMaxTime').oninput = (e) => { CONFIG.MAX_TIME = parseInt(e.target.value, 10); $('txtMaxTime').textContent = CONFIG.MAX_TIME + 's'; };

    const bindInt = (id, key, out) => { $(id).oninput = (e) => { CONFIG[key] = parseInt(e.target.value, 10); $(out).textContent = CONFIG[key]; }; };
    bindInt('inputMinWheels', 'MIN_WHEELS', 'txtMinWheels');
    bindInt('inputMaxWheels', 'MAX_WHEELS', 'txtMaxWheels');
    bindInt('inputMinPoints', 'MIN_POINTS', 'txtMinPoints');
    bindInt('inputMaxPoints', 'MAX_POINTS', 'txtMaxPoints');

    const bindNudge = (id, key) => { $(id).oninput = (e) => { CONFIG[key] = parseFloat(e.target.value); }; };
    bindNudge('nudgeWheels', 'NUDGE_WHEELS');
    bindNudge('nudgeWheelSize', 'NUDGE_WHEEL_SIZE');
    bindNudge('nudgeBodySize', 'NUDGE_BODY_SIZE');

    $('btnCopyBest').onclick = copyLeader;
    $('btnLoad').onclick = () => loadFromText($('ioTextarea').value);

    // The designer hands the leader over in the URL hash too.
    $('lnkDesigner').onclick = () => {
        const car = race && race.leader();
        if (car) $('lnkDesigner').href = 'designer.html#car=' + encodeURIComponent(JSON.stringify(RC.toData(car.genome)));
    };
}

/* ---------- start ---------- */

window.addEventListener('load', () => {
    if (typeof planck === 'undefined') {
        $('goal').textContent = "The physics engine didn't load. Check your connection and refresh.";
        return;
    }
    canvas = $('canvas');
    ctx = canvas.getContext('2d');
    window.addEventListener('resize', resize);
    resize();
    bindControls();
    applyTrackLabels();

    // designer.html sends cars here as #car=<json>
    const m = location.hash.match(/^#car=(.+)$/);
    if (m) {
        const text = decodeURIComponent(m[1]);
        $('ioTextarea').value = text;
        window.history.replaceState(null, '', location.pathname);
        if (loadFromText(text)) openDetails('ioTextarea');
        else resetSimulation();
    } else resetSimulation();

    requestAnimationFrame(loop);
});

})();
