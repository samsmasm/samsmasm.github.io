// Amoeba page: draws the World from sim.js, runs the controls and the history graph.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const dish = $('dish'), ctx = dish.getContext('2d');
  const graph = $('graph'), gctx = graph.getContext('2d');

  const settings = Object.assign({}, AM.SETTINGS);
  let world, history, sampleEvery, paused = false, speed = '1';

  // History: one sample every `sampleEvery` ticks; when full, keep every other one.
  const MAX_POINTS = 600;
  function restart() {
    world = new AM.World(undefined, settings);
    history = [];
    sampleEvery = 60;
    sample();
    draw();
  }
  function sample() {
    const s = world.stats();
    history.push({ alive: s.alive, speed: s.speed, sense: s.sense });
    if (history.length > MAX_POINTS) {
      history = history.filter((_, i) => i % 2 === 0);
      sampleEvery *= 2;
    }
  }

  // Fixed steps per frame (Watch, 5x) or as many as fit in a time budget (Fast forward).
  let rateTicks = 0, rateStart = performance.now();
  function frame(now) {
    if (!paused) {
      if (speed === 'fast') {
        const end = performance.now() + 22;
        do { tick(); } while (performance.now() < end);
      } else {
        for (let i = 0; i < +speed; i++) tick();
      }
    }
    draw();
    if (now - rateStart > 1000) {
      const x = rateTicks / ((now - rateStart) / 1000) / 60;
      $('rate').textContent = paused ? 'Paused' : speed === 'fast' ? `About ${Math.round(x)}x real time` : '';
      rateTicks = 0; rateStart = now;
    }
    requestAnimationFrame(frame);
  }
  function tick() {
    world.step();
    rateTicks++;
    if (world.tick % sampleEvery === 0) sample();
  }

  // Drawing ---------------------------------------------------------------
  function fitCanvas(c) {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    return dpr;
  }
  const speedHue = (v) => {
    const t = (v - AM.LIMITS.speed[0]) / (AM.LIMITS.speed[1] - AM.LIMITS.speed[0]);
    return 220 - 220 * Math.min(1, Math.max(0, t));
  };

  function draw() {
    fitCanvas(dish);
    const k = dish.width / AM.W;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, dish.width, dish.height);
    ctx.setTransform(k, 0, 0, k, 0, 0);

    const t = world.tick;
    world.eachFood((f) => {
      let alpha = 0.55 + f.nutrition * 0.45;
      if (f.dies !== Infinity) alpha *= Math.max(0.15, 1 - (t - f.born) / (f.dies - f.born));
      ctx.fillStyle = `rgba(${f.dies !== Infinity ? '120,110,40' : '47,125,79'},${alpha.toFixed(2)})`;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2); ctx.fill();
    });

    ctx.lineWidth = 1 / k;
    ctx.strokeStyle = 'rgba(30,42,74,0.13)';
    for (const o of world.amoebas) {
      if (o.genes.sense > 5) { ctx.beginPath(); ctx.arc(o.x, o.y, o.genes.sense, 0, Math.PI * 2); ctx.stroke(); }
    }
    for (const o of world.amoebas) {
      const h = speedHue(o.genes.speed);
      ctx.fillStyle = `hsla(${h},58%,50%,0.85)`;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = `hsl(${h},58%,32%)`; ctx.stroke();
    }
    ctx.lineWidth = 1 / k;

    updateStats();
    drawGraph();
  }

  function updateStats() {
    const s = world.stats();
    $('sAlive').textContent = s.alive;
    $('sGen').textContent = s.generation;
    $('sFood').textContent = s.food;
    $('sSpeed').textContent = s.speed.toFixed(2);
    $('sSense').textContent = Math.round(s.sense);
    $('sSize').textContent = s.size.toFixed(2);
    $('sJitter').textContent = s.jitter.toFixed(2);
  }

  let lastGraphLen = -1, lastGraphW = -1;
  function drawGraph() {
    const dpr = fitCanvas(graph);
    if (history.length === lastGraphLen && graph.width === lastGraphW) return;
    lastGraphLen = history.length; lastGraphW = graph.width;
    const w = graph.width, h = graph.height, pad = 4 * dpr;
    gctx.clearRect(0, 0, w, h);
    if (history.length < 2) return;
    const maxAlive = Math.max(50, ...history.map((p) => p.alive));
    const line = (key, max, colour) => {
      gctx.strokeStyle = colour; gctx.lineWidth = 2 * dpr; gctx.beginPath();
      history.forEach((p, i) => {
        const x = pad + (i / (history.length - 1)) * (w - 2 * pad);
        const y = h - pad - Math.min(1, p[key] / max) * (h - 2 * pad);
        i ? gctx.lineTo(x, y) : gctx.moveTo(x, y);
      });
      gctx.stroke();
    };
    line('alive', maxAlive, '#1e2a4a');
    line('speed', AM.LIMITS.speed[1], '#c0392b');
    line('sense', AM.LIMITS.sense[1], '#18634f');
  }

  // Controls ----------------------------------------------------------------
  $('btnPause').addEventListener('click', () => {
    paused = !paused;
    $('btnPause').textContent = paused ? 'Play' : 'Pause';
    $('rate').textContent = paused ? 'Paused' : '';
  });
  $('btnRestart').addEventListener('click', restart);

  function segment(group, attr, onPick) {
    group.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      group.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      onPick(b.dataset[attr]);
    }));
  }
  segment(document.querySelector('[aria-label="Speed"]'), 'speed', (v) => {
    speed = v;
    $('rate').textContent = paused ? 'Paused' : v === 'fast' ? 'Measuring...' : '';
  });
  segment($('rotSeg'), 'rot', (v) => { settings.rot = AM.ROT[v]; world.settings.rot = settings.rot; });

  function slider(id, out, key, fmt) {
    const el = $(id);
    const apply = () => {
      settings[key] = +el.value;
      world.settings[key] = settings[key];
      $(out).textContent = fmt(settings[key]);
    };
    el.addEventListener('input', apply);
    return apply;
  }
  const applyFood = slider('inFood', 'vFood', 'food', (v) => 'x' + v);
  const applyThick = slider('inThick', 'vThick', 'thickness', (v) => 'x' + v.toFixed(1));
  const applyMut = slider('inMut', 'vMut', 'mutation', (v) => v.toFixed(2));

  restart();
  // Pick up values the browser may have restored into the inputs.
  applyFood(); applyThick(); applyMut();
  requestAnimationFrame(frame);
})();
