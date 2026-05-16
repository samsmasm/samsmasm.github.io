import { SimEngine, FACTION_NAMES } from './engine.js';

const COLOR_OPTIONS = [
  '#e53935', '#1e88e5', '#fdd835', '#43a047',
  '#8e24aa', '#fb8c00', '#d81b60', '#00897b',
  '#3949ab', '#1a1a1a',
];
let factionColors = [...COLOR_OPTIONS];

// ── Simulation state ──────────────────────────────────────────────────────────
const engine = new SimEngine();
let gridSize      = 200;
let factionCount  = 2;
let uniqueMatrices = false;
let factionVectors = Array.from({ length: 10 }, () => []);
let sharedVectors  = [];
let playing    = false;
let intervalId = null;
let tickMs     = 0;
let worker     = null;

// ── View state (zoom/pan) ─────────────────────────────────────────────────────
let viewCX    = 0;   // grid coord at canvas centre X
let viewCY    = 0;   // grid coord at canvas centre Y
let viewScale = 4;   // pixels per cell

// Cache of the last data sent to the canvas -- used by zoom/pan to redraw
// without losing worker results or requiring engine re-read
let renderCache = null; // { occupiedBy, attackedBy, n, spiralCoords }

// ── DOM refs ──────────────────────────────────────────────────────────────────
const canvas          = document.getElementById('canvas');
const ctx             = canvas.getContext('2d');
const btnPlay         = document.getElementById('btn-play');
const btnPause        = document.getElementById('btn-pause');
const btnStep         = document.getElementById('btn-step');
const btnReset        = document.getElementById('btn-reset');
const btnCalc         = document.getElementById('btn-calc');
const btnZoomIn       = document.getElementById('btn-zoom-in');
const btnZoomOut      = document.getElementById('btn-zoom-out');
const btnZoomFit      = document.getElementById('btn-zoom-fit');
const speedSlider     = document.getElementById('speed-slider');
const speedLabel      = document.getElementById('speed-label');
const factionSelect   = document.getElementById('faction-select');
const gridSizeInput   = document.getElementById('grid-size');
const uniqueToggle    = document.getElementById('unique-toggle');
const factionColorsDiv = document.getElementById('faction-colors');
const matricesDiv     = document.getElementById('matrices');
const stepCounter     = document.getElementById('step-counter');
const progressBar     = document.getElementById('progress-bar');
const progressWrap    = document.getElementById('progress-wrap');
const progressMsg     = document.getElementById('progress-msg');

// ── Canvas setup ──────────────────────────────────────────────────────────────
function initCanvas() {
  // Match canvas internal resolution to its CSS rendered size
  const wrap = canvas.parentElement;
  const size = wrap.getBoundingClientRect().width || 600;
  canvas.width  = Math.round(size);
  canvas.height = Math.round(size);
}

// Fit the entire grid in the viewport
function fitView() {
  viewCX = 0;
  viewCY = 0;
  viewScale = Math.max(1, canvas.width / gridSize);
}

// ── Coordinate transforms ─────────────────────────────────────────────────────
function gridToCanvas(gx, gy) {
  return {
    px: canvas.width  / 2 + (gx - viewCX) * viewScale,
    py: canvas.height / 2 - (gy - viewCY) * viewScale,
  };
}

function canvasToGrid(px, py) {
  return {
    gx: viewCX + (px - canvas.width  / 2) / viewScale,
    gy: viewCY - (py - canvas.height / 2) / viewScale,
  };
}

// ── Rendering ─────────────────────────────────────────────────────────────────
function clearCanvas() {
  ctx.fillStyle = '#f8f8f4';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawCell(gx, gy, color) {
  const { px, py } = gridToCanvas(gx, gy);
  const s = viewScale;
  if (px + s < 0 || py + s < 0 || px >= canvas.width || py >= canvas.height) return;
  ctx.fillStyle = color;
  ctx.fillRect(px, py, s, s);
}

// Core draw -- always updates renderCache so zoom/pan can redraw correctly
function drawData(occupiedBy, attackedBy, n, spiralCoords) {
  renderCache = { occupiedBy, attackedBy, n, spiralCoords };
  clearCanvas();

  ctx.globalAlpha = 0.13;
  for (let i = 0; i < n; i++) {
    if (occupiedBy[i] !== 0) continue;
    const atk = attackedBy[i];
    if (atk === 0) continue;
    const { x, y } = spiralCoords[i];
    for (let f = 0; f < factionCount; f++) {
      if (atk & (1 << f)) drawCell(x, y, factionColors[f]);
    }
  }
  ctx.globalAlpha = 1;

  for (let i = 0; i < n; i++) {
    if (occupiedBy[i] !== 0) {
      const { x, y } = spiralCoords[i];
      drawCell(x, y, factionColors[occupiedBy[i] - 1]);
    }
  }

  if (sel.active) drawSelectionRect();
}

// Redraw from engine state (animated play)
function renderFull() {
  const { occupiedBy, attackedBy, spiralCoords, n } = engine.getState();
  if (spiralCoords) drawData(occupiedBy, attackedBy, n, spiralCoords);
}

// Redraw from cached data -- used by zoom/pan/fit so worker results aren't lost
function redraw() {
  if (renderCache) drawData(
    renderCache.occupiedBy, renderCache.attackedBy,
    renderCache.n, renderCache.spiralCoords
  );
}

// Called when worker finishes
function renderFromWorkerData(occupiedBy, attackedBy, n, spiralCoords) {
  drawData(occupiedBy, attackedBy, n, spiralCoords);
  let count = 0;
  for (let i = 0; i < n; i++) if (occupiedBy[i] !== 0) count++;
  stepCounter.textContent = count;
}

// ── Selection rectangle ───────────────────────────────────────────────────────
const sel = { active: false, x0: 0, y0: 0, x1: 0, y1: 0 }; // canvas pixels

function drawSelectionRect() {
  const x = Math.min(sel.x0, sel.x1);
  const y = Math.min(sel.y0, sel.y1);
  const w = Math.abs(sel.x1 - sel.x0);
  const h = Math.abs(sel.y1 - sel.y0);
  ctx.save();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = 'rgba(100,100,200,0.08)';
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// ── Canvas mouse interaction ───────────────────────────────────────────────────
// Left drag  → select area to zoom
// Right drag → pan
// Scroll     → zoom toward cursor

function canvasPos(e) {
  const r = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / r.width;
  const scaleY = canvas.height / r.height;
  return { px: (e.clientX - r.left) * scaleX, py: (e.clientY - r.top) * scaleY };
}

let panDrag = null; // { px, py, cx, cy } for right-drag pan

canvas.addEventListener('contextmenu', e => e.preventDefault());

canvas.addEventListener('mousedown', e => {
  const { px, py } = canvasPos(e);
  if (e.button === 2) {
    // Right click: start pan
    panDrag = { px, py, cx: viewCX, cy: viewCY };
  } else {
    // Left click: start selection
    sel.active = true;
    sel.x0 = sel.x1 = px;
    sel.y0 = sel.y1 = py;
  }
});

canvas.addEventListener('mousemove', e => {
  const { px, py } = canvasPos(e);
  if (panDrag) {
    const dx = (px - panDrag.px) / viewScale;
    const dy = (py - panDrag.py) / viewScale;
    viewCX = panDrag.cx - dx;
    viewCY = panDrag.cy + dy;
    redraw();
  } else if (sel.active) {
    sel.x1 = px;
    sel.y1 = py;
    redraw();
  }
});

canvas.addEventListener('mouseup', e => {
  if (panDrag && e.button === 2) { panDrag = null; return; }
  if (!sel.active) return;
  sel.active = false;

  const w = Math.abs(sel.x1 - sel.x0);
  const h = Math.abs(sel.y1 - sel.y0);
  if (w < 8 || h < 8) { redraw(); return; }

  const g0 = canvasToGrid(Math.min(sel.x0, sel.x1), Math.min(sel.y0, sel.y1));
  const g1 = canvasToGrid(Math.max(sel.x0, sel.x1), Math.max(sel.y0, sel.y1));
  const gW = g1.gx - g0.gx;
  const gH = g0.gy - g1.gy;

  viewScale = Math.min(canvas.width / gW, canvas.height / gH);
  viewCX = (g0.gx + g1.gx) / 2;
  viewCY = (g0.gy + g1.gy) / 2;
  redraw();
});

canvas.addEventListener('mouseleave', () => {
  if (sel.active) { sel.active = false; redraw(); }
  panDrag = null;
});

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const { px, py } = canvasPos(e);
  const factor = e.deltaY < 0 ? 1.25 : 1 / 1.25;
  const g = canvasToGrid(px, py);
  viewScale = Math.max(0.5, Math.min(200, viewScale * factor));
  viewCX = g.gx - (px - canvas.width  / 2) / viewScale;
  viewCY = g.gy + (py - canvas.height / 2) / viewScale;
  redraw();
}, { passive: false });

// ── Zoom buttons ──────────────────────────────────────────────────────────────
btnZoomIn.addEventListener('click',  () => { viewScale = Math.min(200, viewScale * 1.5); redraw(); });
btnZoomOut.addEventListener('click', () => { viewScale = Math.max(0.5, viewScale / 1.5); redraw(); });
btnZoomFit.addEventListener('click', () => { fitView(); redraw(); });

// ── Simulation helpers ────────────────────────────────────────────────────────
function getCurrentVectors() {
  if (uniqueMatrices) return factionVectors.slice(0, factionCount);
  return Array.from({ length: factionCount }, () => [...sharedVectors]);
}

function engineInit() {
  engine.init(gridSize, gridSize, factionCount, getCurrentVectors());
  fitView();
  clearCanvas();
  stepCounter.textContent = '0';
}

function stepOnce() {
  const result = engine.step();
  if (result) {
    drawCell(result.x, result.y, factionColors[result.faction]);
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
  renderCache = null;
  engineInit();
}

// ── Controls ──────────────────────────────────────────────────────────────────
speedSlider.addEventListener('input', () => {
  const v = parseFloat(speedSlider.value);
  if (v === 0) { tickMs = 0; speedLabel.textContent = 'max speed'; }
  else { tickMs = Math.round(Math.pow(10, (v / 100) * 3)); speedLabel.textContent = tickMs + ' ms'; }
  if (playing) { stopPlayback(); startPlayback(); }
});

factionSelect.addEventListener('change', () => {
  factionCount = parseInt(factionSelect.value);
  buildFactionColors();
  buildMatrices();
  resetAll();
});

gridSizeInput.addEventListener('change', () => {
  gridSize = Math.max(10, Math.min(1000, parseInt(gridSizeInput.value) || 200));
  gridSizeInput.value = gridSize;
  resetAll();
});

uniqueToggle.addEventListener('change', () => {
  uniqueMatrices = uniqueToggle.checked;
  buildMatrices();
  resetAll();
});

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
  const totalCells   = gridSize * gridSize;
  const spiralCoords = engine.getState().spiralCoords;

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

// ── Faction colour cards ──────────────────────────────────────────────────────
function buildFactionColors() {
  factionColorsDiv.innerHTML = '';
  for (let f = 0; f < factionCount; f++) {
    const card = document.createElement('div');
    card.className = 'faction-color-card';

    const name = document.createElement('div');
    name.className = 'faction-color-name';
    name.textContent = `Faction ${f + 1}`;
    name.style.color = factionColors[f];
    card.appendChild(name);

    const picker = document.createElement('div');
    picker.className = 'colour-picker';
    for (const hex of COLOR_OPTIONS) {
      const sw = document.createElement('div');
      sw.className = 'swatch' + (hex === factionColors[f] ? ' selected' : '');
      sw.style.backgroundColor = hex;
      sw.addEventListener('click', () => {
        factionColors[f] = hex;
        buildFactionColors();
        buildMatrices();
        renderFull();
      });
      picker.appendChild(sw);
    }
    card.appendChild(picker);
    factionColorsDiv.appendChild(card);
  }
}

// ── Movement matrices ─────────────────────────────────────────────────────────
function buildMatrices() {
  matricesDiv.innerHTML = '';
  if (uniqueMatrices) {
    for (let f = 0; f < factionCount; f++) {
      const w = document.createElement('div');
      w.className = 'matrix-wrapper';
      const t = document.createElement('div');
      t.className = 'matrix-title';
      t.textContent = `Faction ${f + 1}`;
      t.style.color = factionColors[f];
      w.appendChild(t);
      w.appendChild(makeGrid(f, factionVectors[f], factionColors[f]));
      matricesDiv.appendChild(w);
    }
  } else {
    const w = document.createElement('div');
    w.className = 'matrix-wrapper';
    const t = document.createElement('div');
    t.className = 'matrix-title';
    t.style.color = '#555';
    t.textContent = 'Shared';
    w.appendChild(t);
    w.appendChild(makeGrid(0, sharedVectors, '#5b6af0'));
    matricesDiv.appendChild(w);
  }
}

function makeGrid(factionIdx, vecArray, activeColor) {
  const grid = document.createElement('div');
  grid.className = 'matrix-grid';
  for (let row = 5; row >= 0; row--) {
    for (let col = 0; col < 6; col++) {
      const cell = document.createElement('div');
      cell.className = 'matrix-cell';
      if (col === 0 && row === 0) {
        cell.classList.add('origin');
      } else {
        if (vecArray.some(v => v.dx === col && v.dy === row)) applyActiveStyle(cell, activeColor);
        cell.addEventListener('click', () => toggleVector(factionIdx, col, row, cell, activeColor, vecArray));
      }
      grid.appendChild(cell);
    }
  }
  return grid;
}

function applyActiveStyle(cell, color) {
  cell.style.backgroundColor = color;
  cell.style.borderColor = color;
  cell.style.opacity = '0.65';
}

function clearActiveStyle(cell) {
  cell.style.backgroundColor = '';
  cell.style.borderColor = '';
  cell.style.opacity = '';
}

function toggleVector(factionIdx, dx, dy, cell, color, vecArray) {
  const idx = vecArray.findIndex(v => v.dx === dx && v.dy === dy);
  if (idx === -1) { vecArray.push({ dx, dy }); applyActiveStyle(cell, color); }
  else            { vecArray.splice(idx, 1);    clearActiveStyle(cell); }
  if (!uniqueMatrices) factionVectors = Array.from({ length: 10 }, () => [...sharedVectors]);
  resetAll();
}

// ── Init ──────────────────────────────────────────────────────────────────────
function setDefaultKnight() {
  sharedVectors = [{ dx: 1, dy: 2 }, { dx: 2, dy: 1 }];
  factionVectors = Array.from({ length: 10 }, () => [...sharedVectors]);
}

setDefaultKnight();
initCanvas();
buildFactionColors();
buildMatrices();
engineInit();
btnPause.disabled = true;
