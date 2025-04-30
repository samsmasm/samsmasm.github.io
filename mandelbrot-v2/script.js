// script.js
const numPointsInput     = document.getElementById('numPoints');
const maxIterInput       = document.getElementById('maxIter');
const minRealInput       = document.getElementById('minReal');
const minImagInput       = document.getElementById('minImag');
const axisRangeInput     = document.getElementById('axisRange');
const accumulateCheckbox = document.getElementById('accumulate');
const hoverInfo          = document.getElementById('hoverInfo');
const startButton        = document.getElementById('startButton');
const zoomOutButton      = document.getElementById('zoomOutButton');

const container   = document.getElementById('canvasContainer');
const canvas      = document.getElementById('mandelbrotCanvas');
const ctx         = canvas.getContext('2d');
const selDiv      = document.getElementById('selection');
const W           = canvas.width;
const H           = canvas.height;

// core draw routine
function draw(clear = true) {
  const numPoints = +numPointsInput.value;
  const maxIter   = +maxIterInput.value;
  const minReal   = +minRealInput.value;
  const minImag   = +minImagInput.value;
  const range     = +axisRangeInput.value;
  const accumulate= accumulateCheckbox.checked;

  if (clear && !accumulate) ctx.clearRect(0, 0, W, H);

  for (let i = 0; i < numPoints; i++) {
    // sample c uniformly in the square
    const a = minReal + Math.random() * range;
    const b = minImag + Math.random() * range;

    // iterate z = z^2 + c
    let zr = 0, zi = 0, iter = 0;
    while (iter < maxIter && zr*zr + zi*zi <= 4) {
      const tmp = zr*zr - zi*zi + a;
      zi = 2*zr*zi + b;
      zr = tmp;
      iter++;
    }

    // pixel coords
    const px = Math.floor((a - minReal)/range * W);
    const py = Math.floor((minImag + range - b)/range * H);
    if (px<0||px>=W||py<0||py>=H) continue;

    // colour
    if (iter === maxIter) {
      ctx.fillStyle = 'red';
    } else if (iter < 10) {
      ctx.fillStyle = 'black';
    } else {
      const hue = 360 * Math.log(iter) / Math.log(maxIter);
      ctx.fillStyle = `hsl(${hue.toFixed(1)},100%,50%)`;
    }
    ctx.fillRect(px, py, 1, 1);
  }
}

// initial draw
startButton.addEventListener('click', () => draw(true));

// hover info
canvas.addEventListener('mousemove', e => {
  const rect  = canvas.getBoundingClientRect();
  const px    = e.clientX - rect.left;
  const py    = e.clientY - rect.top;
  const minR  = +minRealInput.value;
  const minI  = +minImagInput.value;
  const range = +axisRangeInput.value;

  const a = minR + (px / W) * range;
  const b = minI + ((H - py) / H) * range;
  hoverInfo.textContent = 
    `c = ${a.toFixed(4)} ${b>=0? '+' : '-'} ${Math.abs(b).toFixed(4)}i`;
});

// zoom out
zoomOutButton.addEventListener('click', () => {
  const minR  = +minRealInput.value;
  const minI  = +minImagInput.value;
  const range = +axisRangeInput.value;
  const ctrR  = minR + range/2;
  const ctrI  = minI + range/2;
  const newRange = range * 2;

  minRealInput.value = (ctrR - newRange/2).toFixed(4);
  minImagInput.value = (ctrI - newRange/2).toFixed(4);
  axisRangeInput.value = newRange.toFixed(4);

  draw(true);
});

// drag-to-zoom
let dragStart = null;
container.addEventListener('mousedown', e => {
  const rect = container.getBoundingClientRect();
  dragStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  selDiv.style.left = `${dragStart.x}px`;
  selDiv.style.top  = `${dragStart.y}px`;
  selDiv.style.width = selDiv.style.height = '0px';
  selDiv.style.display = 'block';
});

container.addEventListener('mousemove', e => {
  if (!dragStart) return;
  const rect = container.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const w = x - dragStart.x;
  const h = y - dragStart.y;
  // make square selection: use whichever is larger
  const size = Math.max(Math.abs(w), Math.abs(h));
  const sx = w < 0 ? dragStart.x - size : dragStart.x;
  const sy = h < 0 ? dragStart.y - size : dragStart.y;

  selDiv.style.left   = `${sx}px`;
  selDiv.style.top    = `${sy}px`;
  selDiv.style.width  = `${size}px`;
  selDiv.style.height = `${size}px`;
});

container.addEventListener('mouseup', e => {
  if (!dragStart) return;
  const rect = container.getBoundingClientRect();
  const endX = e.clientX - rect.left;
  const endY = e.clientY - rect.top;
  selDiv.style.display = 'none';

  // compute selection square in pixel coords
  const w = endX - dragStart.x;
  const h = endY - dragStart.y;
  const size = Math.max(Math.abs(w), Math.abs(h));
  const sx = w < 0 ? dragStart.x - size : dragStart.x;
  const sy = h < 0 ? dragStart.y - size : dragStart.y;

  // map pixels → complex
  const minR = +minRealInput.value;
  const minI = +minImagInput.value;
  const range= +axisRangeInput.value;
  const newMinR = minR + (sx / W) * range;
  const newMaxR = minR + ((sx + size) / W) * range;
  const newMaxI = minI + ((H - sy) / H) * range;
  const newMinI = minI + ((H - (sy + size)) / H) * range;

  const deltaR = newMaxR - newMinR;
  const deltaI = newMaxI - newMinI;
  const newRange = Math.max(deltaR, deltaI);

  // update inputs
  minRealInput.value   = newMinR.toFixed(4);
  minImagInput.value   = newMinI.toFixed(4);
  axisRangeInput.value = newRange.toFixed(4);

  // redraw
  draw(true);
  dragStart = null;
});
