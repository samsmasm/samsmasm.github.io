import { SimEngine, FACTION_COLORS, FACTION_NAMES } from './engine.js';

// ── State ─────────────────────────────────────────────────────────────────────
const engine = new SimEngine();

let gridW = 100, gridH = 100;
let factionCount = 2;
let uniqueMatrices = false;
let factionVectors = Array.from({ length: 6 }, () => []); // per faction
let sharedVectors  = [];

let playing    = false;
let intervalId = null;
let tickMs     = 50;
let worker     = null;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const canvas        = document.getElementById('canvas');
const ctx           = canvas.getContext('2d');
const btnPlay       = document.getElementById('btn-play');
const btnPause      = document.getElementById('btn-pause');
const btnStep       = document.getElementById('btn-step');
const btnReset      = document.getElementById('btn-reset');
const btnCalc       = document.getElementById('btn-calc');
const speedSlider   = document.getElementById('speed-slider');
const speedLabel    = document.getElementById('speed-label');
const factionSlider = document.getElementById('faction-slider');
const factionLabel  = document.getElementById('faction-label');
const gridWInput    = document.getElementById('grid-w');
const gridHInput    = document.getElementById('grid-h');
const uniqueToggle  = document.getElementById('unique-toggle');
const matricesDiv   = document.getElementById('matrices');
const stepCounter   = document.getElementById('step-counter');
const progressBar   = document.getElementById('progress-bar');
const progressWrap  = document.getElementById('progress-wrap');
const progressMsg   = document.getElementById('progress-msg');

// ── Canvas / Rendering ────────────────────────────────────────────────────────
let tileSize = 6;

function canvasSetup() {
  tileSize = Math.max(1, Math.floor(800 / Math.max(gridW, gridH)));
  canvas.width  = gridW * tileSize;
  canvas.height = gridH * tileSize;
  const maxPx = 800;
  const scale = Math.min(1, maxPx / Math.max(canvas.width, canvas.height));
  canvas.style.width  = (canvas.width  * scale) + 'px';
  canvas.style.height = (canvas.height * scale) + 'px';
}

function worldToCanvas(x, y) {
  const cx = Math.floor(gridW / 2) + x;
  const cy = Math.floor(gridH / 2) - y;
  return { px: cx * tileSize, py: cy * tileSize };
}

function clearCanvas() {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawCell(x, y, color) {
  const { px, py } = worldToCanvas(x, y);
  if (px < 0 || py < 0 || px >= canvas.width || py >= canvas.height) return;
  ctx.fillStyle = color;
  ctx.fillRect(px, py, tileSize, tileSize);
}

function renderFull() {
  clearCanvas();
  const { occupiedBy, attackedBy, spiralCoords, n } = engine.getState();

  // Attack zones
  ctx.globalAlpha = 0.12;
  for (let i = 0; i < n; i++) {
    if (occupiedBy[i] !== 0) continue;
    const atk = attackedBy[i];
    if (atk === 0) continue;
    const { x, y } = spiralCoords[i];
    for (let f = 0; f < factionCount; f++) {
      if (atk & (1 << f)) drawCell(x, y, FACTION_COLORS[f]);
    }
  }
  ctx.globalAlpha = 1;

  // Occupied cells
  for (let i = 0; i < n; i++) {
    if (occupiedBy[i] !== 0) {
      const { x, y } = spiralCoords[i];
      drawCell(x, y, FACTION_COLORS[occupiedBy[i] - 1]);
    }
  }
}

// Render result from worker (typed arrays transferred directly)
function renderFromWorkerData(occupiedBy, attackedBy, n, spiralCoords) {
  clearCanvas();

  ctx.globalAlpha = 0.12;
  for (let i = 0; i < n; i++) {
    if (occupiedBy[i] !== 0) continue;
    const atk = attackedBy[i];
    if (atk === 0) continue;
    const { x, y } = spiralCoords[i];
    for (let f = 0; f < factionCount; f++) {
      if (atk & (1 << f)) drawCell(x, y, FACTION_COLORS[f]);
    }
  }
  ctx.globalAlpha = 1;

  let count = 0;
  for (let i = 0; i < n; i++) {
    if (occupiedBy[i] !== 0) {
      const { x, y } = spiralCoords[i];
      drawCell(x, y, FACTION_COLORS[occupiedBy[i] - 1]);
      count++;
    }
  }
  stepCounter.textContent = count;
}

// ── Simulation helpers ────────────────────────────────────────────────────────
function getCurrentVectors() {
  if (uniqueMatrices) return factionVectors.slice(0, factionCount);
  return Array.from({ length: factionCount }, () => [...sharedVectors]);
}

function engineInit() {
  engine.init(gridW, gridH, factionCount, getCurrentVectors());
  canvasSetup();
  clearCanvas();
  stepCounter.textContent = '0';
}

function stepOnce() {
  const result = engine.step();
  if (result) {
    drawCell(result.x, result.y, FACTION_COLORS[result.faction]);
    stepCounter.textContent = engine.stepCount;
  }
  if (engine.done) stopPlayback();
}

function startPlayback() {
  if (playing) return;
  playing = true;
  btnPlay.disabled  = true;
  btnPause.disabled = false;

  if (tickMs === 0) {
    // Burst mode: batch many steps per animation frame
    const rafLoop = () => {
      if (!playing) return;
      for (let i = 0; i < 2000 && !engine.done; i++) engine.step();
      renderFull();
      stepCounter.textContent = engine.stepCount;
      if (!engine.done) requestAnimationFrame(rafLoop);
      else stopPlayback();
    };
    requestAnimationFrame(rafLoop);
  } else {
    intervalId = setInterval(() => {
      // At faster speeds, run multiple steps per tick to hit target rate
      const stepsPerTick = tickMs <= 10 ? Math.ceil(10 / tickMs) : 1;
      for (let i = 0; i < stepsPerTick && !engine.done; i++) stepOnce();
      if (engine.done) stopPlayback();
    }, Math.min(tickMs, 10));
  }
}

function stopPlayback() {
  playing = false;
  clearInterval(intervalId);
  intervalId = null;
  btnPlay.disabled  = false;
  btnPause.disabled = true;
}

function resetAll() {
  stopPlayback();
  if (worker) { worker.terminate(); worker = null; }
  progressWrap.style.display = 'none';
  engineInit();
}

// ── Speed slider (logarithmic 0–1000ms) ───────────────────────────────────────
speedSlider.addEventListener('input', () => {
  const v = parseFloat(speedSlider.value);
  if (v === 0) {
    tickMs = 0;
    speedLabel.textContent = 'max speed';
  } else {
    tickMs = Math.round(Math.pow(10, (v / 100) * 3));
    speedLabel.textContent = tickMs + ' ms';
  }
  if (playing) { stopPlayback(); startPlayback(); }
});

// ── Faction slider ────────────────────────────────────────────────────────────
factionSlider.addEventListener('input', () => {
  factionCount = parseInt(factionSlider.value);
  factionLabel.textContent = factionCount;
  buildMatrices();
  resetAll();
});

// ── Grid size inputs ───────────────────────────────────────────────────────────
gridWInput.addEventListener('change', () => {
  gridW = Math.max(10, Math.min(1000, parseInt(gridWInput.value) || 100));
  gridWInput.value = gridW;
  resetAll();
});
gridHInput.addEventListener('change', () => {
  gridH = Math.max(10, Math.min(1000, parseInt(gridHInput.value) || 100));
  gridHInput.value = gridH;
  resetAll();
});

// ── Unique matrices toggle ────────────────────────────────────────────────────
uniqueToggle.addEventListener('change', () => {
  uniqueMatrices = uniqueToggle.checked;
  buildMatrices();
  resetAll();
});

// ── Buttons ───────────────────────────────────────────────────────────────────
btnPlay.addEventListener('click',  startPlayback);
btnPause.addEventListener('click', stopPlayback);
btnStep.addEventListener('click',  () => { stopPlayback(); stepOnce(); });
btnReset.addEventListener('click', resetAll);

btnCalc.addEventListener('click', () => {
  stopPlayback();
  if (worker) worker.terminate();

  progressWrap.style.display = 'flex';
  progressBar.style.width = '0%';
  progressMsg.textContent = 'Calculating…';

  const vectors      = getCurrentVectors();
  const totalCells   = gridW * gridH;
  const spiralCoords = engine.getState().spiralCoords; // already built at init

  worker = new Worker('js/worker.js', { type: 'module' });
  worker.postMessage({ totalCells, factionCount, factionVectors: vectors });

  worker.onmessage = (e) => {
    const { type, placed, occupiedBy, attackedBy, n } = e.data;
    if (type === 'progress') {
      progressBar.style.width = Math.round((placed / totalCells) * 100) + '%';
    } else if (type === 'done') {
      progressBar.style.width = '100%';
      progressMsg.textContent = 'Done';
      setTimeout(() => { progressWrap.style.display = 'none'; }, 800);
      canvasSetup();
      renderFromWorkerData(occupiedBy, attackedBy, n, spiralCoords);
      worker = null;
    }
  };

  worker.onerror = (err) => {
    console.error('Worker error:', err);
    progressMsg.textContent = 'Worker error — check console';
    worker = null;
  };
});

// ── 6x6 Matrix builder ────────────────────────────────────────────────────────
function buildMatrices() {
  matricesDiv.innerHTML = '';
  const count = uniqueMatrices ? factionCount : 1;

  for (let f = 0; f < count; f++) {
    const label = uniqueMatrices ? FACTION_NAMES[f] : 'All Factions';
    const color = uniqueMatrices ? FACTION_COLORS[f] : '#aaa';

    const wrapper = document.createElement('div');
    wrapper.className = 'matrix-wrapper';

    const title = document.createElement('div');
    title.className = 'matrix-title';
    title.textContent = label;
    title.style.color = color;
    wrapper.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'matrix-grid';

    for (let row = 5; row >= 0; row--) {
      for (let col = 0; col < 6; col++) {
        const cell = document.createElement('div');
        cell.className = 'matrix-cell';
        if (col === 0 && row === 0) {
          cell.classList.add('origin');
          cell.title = 'Origin (piece position)';
        } else {
          const vec = uniqueMatrices ? factionVectors[f] : sharedVectors;
          if (vec.some(v => v.dx === col && v.dy === row)) cell.classList.add('active');
          cell.addEventListener('click', () => toggleVector(f, col, row, cell));
        }
        grid.appendChild(cell);
      }
    }

    wrapper.appendChild(grid);
    matricesDiv.appendChild(wrapper);
  }
}

function toggleVector(factionIdx, dx, dy, cell) {
  const vec = uniqueMatrices ? factionVectors[factionIdx] : sharedVectors;
  const idx = vec.findIndex(v => v.dx === dx && v.dy === dy);
  if (idx === -1) {
    vec.push({ dx, dy });
    cell.classList.add('active');
  } else {
    vec.splice(idx, 1);
    cell.classList.remove('active');
  }
  if (!uniqueMatrices) {
    factionVectors = Array.from({ length: 6 }, () => [...sharedVectors]);
  }
  resetAll();
}

// ── Default: knight moves ─────────────────────────────────────────────────────
function setDefaultKnight() {
  sharedVectors = [{ dx: 1, dy: 2 }, { dx: 2, dy: 1 }];
  factionVectors = Array.from({ length: 6 }, () => [...sharedVectors]);
}

// ── Init ──────────────────────────────────────────────────────────────────────
setDefaultKnight();
buildMatrices();
engineInit();
btnPause.disabled = true;
