// node sums/test/run.js : checks the digit reader on synthetic pen strokes.
// Each digit is a rough child-style polyline; we add slant, squash, wobble and
// size changes, then read single digits and multi-digit numbers.
const path = require('path');
global.window = globalThis;
require(path.join(__dirname, '..', 'model.js'));
require(path.join(__dirname, '..', 'digits.js'));
const { readNumber } = globalThis.SumsDigits;

// glyphs: list of strokes in a box x 0..0.6, y 0..1 (y down)
const ring = (cx, cy, rx, ry, a0 = -Math.PI / 2, a1 = a0 + 2 * Math.PI, n = 24) =>
  Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });
const G = {
  0: [ring(0.3, 0.5, 0.28, 0.5)],
  1: [[[0.3, 0], [0.3, 1]]],
  2: [[[0.05, 0.25], [0.15, 0.06], [0.35, 0], [0.55, 0.1], [0.55, 0.3], [0.4, 0.5], [0, 1], [0.6, 1]]],
  3: [[[0.05, 0.1], [0.3, 0], [0.55, 0.15], [0.5, 0.4], [0.25, 0.48], [0.55, 0.6], [0.58, 0.85], [0.3, 1], [0.02, 0.9]]],
  4: [[[0.4, 0], [0, 0.65], [0.6, 0.65]], [[0.45, 0.3], [0.45, 1]]],
  5: [[[0.1, 0], [0.05, 0.45], [0.35, 0.4], [0.58, 0.6], [0.55, 0.88], [0.3, 1], [0.02, 0.92]], [[0.1, 0], [0.55, 0]]],
  6: [[[0.5, 0], [0.2, 0.3], [0.05, 0.7], [0.15, 0.95], [0.4, 1], [0.55, 0.8], [0.45, 0.55], [0.2, 0.55], [0.07, 0.7]]],
  7: [[[0, 0], [0.6, 0], [0.2, 1]]],
  8: [[[0.5, 0.1], [0.3, 0], [0.08, 0.12], [0.15, 0.38], [0.45, 0.58], [0.55, 0.82], [0.3, 1], [0.05, 0.82], [0.15, 0.58], [0.45, 0.38], [0.52, 0.12], [0.5, 0.1]]],
  9: [[[0.55, 0.15], [0.3, 0], [0.05, 0.15], [0.1, 0.4], [0.35, 0.45], [0.55, 0.25], [0.55, 0.15], [0.55, 1]]],
};

let seed = 1;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const R = (a, b) => a + (b - a) * rand();

function densify(s) {
  const out = [s[0]];
  for (let i = 1; i < s.length; i++) {
    const [ax, ay] = s[i - 1], [bx, by] = s[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.03));
    for (let k = 1; k <= n; k++) out.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]);
  }
  return out;
}
// one written digit at x offset ox; size/height in pad-height units
function write(d, ox, size) {
  const slant = R(-0.25, 0.25), sx = R(0.75, 1.25), rot = R(-0.15, 0.15), oy = R(0.1, 0.25);
  const wob = R(0.005, 0.02);
  return G[d].map(s => densify(s).map(([x, y]) => {
    x = (x - 0.3) * sx + slant * (0.5 - y); y = y - 0.5;
    const X = x * Math.cos(rot) - y * Math.sin(rot), Y = x * Math.sin(rot) + y * Math.cos(rot);
    return [ox + (X + 0.3) * size + R(-wob, wob), oy + (Y + 0.5) * size + R(-wob, wob)];
  }));
}

let fails = 0;
// single digits
const conf = Array.from({ length: 10 }, () => Array(10).fill(0));
const N = 60;
for (let d = 0; d <= 9; d++) for (let i = 0; i < N; i++) {
  const t = readNumber(write(d, 0.2, R(0.5, 0.75)), 1).text;
  conf[d][t.length === 1 ? +t : d === 0 ? 1 : 0]++;
}
let total = 0;
for (let d = 0; d <= 9; d++) {
  total += conf[d][d];
  const wrong = conf[d].map((n, k) => n && k !== d ? `${k}:${n}` : '').filter(Boolean).join(' ');
  console.log(`digit ${d}: ${conf[d][d]}/${N}${wrong ? '  misread as ' + wrong : ''}`);
}
const acc = total / (10 * N);
console.log(`single digits ${(acc * 100).toFixed(1)}%`);
if (acc < 0.9) { console.log('FAIL: single-digit accuracy below 90%'); fails++; }

// multi-digit numbers: are they split into the right number of digits?
let splitOk = 0, readOk = 0; const M = 200;
for (let i = 0; i < M; i++) {
  const len = 2 + Math.floor(rand() * 4);
  const num = Array.from({ length: len }, (_, k) => k === 0 ? 1 + Math.floor(rand() * 9) : Math.floor(rand() * 10)).join('');
  const size = R(0.5, 0.75);
  let x = 0.1, strokes = [];
  for (const ch of num) { strokes.push(...write(+ch, x, size)); x += size * R(0.65, 0.9); }
  const t = readNumber(strokes, 1).text;
  if (t.length === num.length) splitOk++;
  if (t === num) readOk++;
}
console.log(`numbers split into the right count ${splitOk}/${M}, read exactly ${readOk}/${M}`);
if (splitOk / M < 0.95) { console.log('FAIL: splitting below 95%'); fails++; }

// parity with the trained network on real MNIST test images (from train.py)
const fs = require('fs');
const pf = path.join(__dirname, 'mnist_sample.json');
if (fs.existsSync(pf)) {
  const { x, pred, y } = JSON.parse(fs.readFileSync(pf));
  let same = 0, right = 0;
  x.forEach((img, i) => {
    const p = globalThis.SumsDigits.classify(Float32Array.from(img, v => v / 255));
    const d = p.indexOf(Math.max(...p));
    if (d === pred[i]) same++; if (d === y[i]) right++;
  });
  console.log(`MNIST sample: JS matches PyTorch ${same}/${x.length}, correct ${right}/${x.length}`);
  if (same < x.length) { console.log('FAIL: JS inference differs from PyTorch'); fails++; }
}
process.exit(fails ? 1 : 0);
