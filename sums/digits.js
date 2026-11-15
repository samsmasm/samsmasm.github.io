// Handwritten digit reader. Runs entirely on the device, no network.
// readNumber(strokes) -> { text, digits: [{d, p}] }
// strokes: array of strokes, each an array of [x, y] points, in any units
// (the page stores them as fractions of the writing strip's height).
(function (root) {
  'use strict';

  // ---- model -------------------------------------------------------------
  let W = null;
  function decode(L) {
    const bin = typeof atob === 'function' ? atob(L.b) : Buffer.from(L.b, 'base64').toString('binary');
    const out = new Float32Array(L.n);
    for (let i = 0; i < L.n; i++) {
      let v = bin.charCodeAt(i); if (v > 127) v -= 256;
      out[i] = v * L.s;
    }
    return out;
  }
  function weights() {
    if (!W) {
      const M = root.SUMS_MODEL, w = {};
      for (const k in M) w[k] = decode(M[k]);
      W = w;
    }
    return W;
  }

  // conv 3x3, pad 1, then relu, then 2x2 max pool (floor)
  function convReluPool(x, cin, size, wt, bias, cout) {
    const n = size * size, conv = new Float32Array(cout * n);
    for (let o = 0; o < cout; o++) {
      const ob = o * n, b = bias[o];
      for (let i = 0; i < n; i++) conv[ob + i] = b;
      for (let c = 0; c < cin; c++) {
        const xb = c * n, wb = (o * cin + c) * 9;
        for (let ky = 0; ky < 3; ky++) for (let kx = 0; kx < 3; kx++) {
          const wv = wt[wb + ky * 3 + kx];
          if (wv === 0) continue;
          const dy = ky - 1, dx = kx - 1;
          const y0 = Math.max(0, -dy), y1 = Math.min(size, size - dy);
          const x0 = Math.max(0, -dx), x1 = Math.min(size, size - dx);
          for (let y = y0; y < y1; y++) {
            const r = ob + y * size, s = xb + (y + dy) * size + dx;
            for (let xx = x0; xx < x1; xx++) conv[r + xx] += wv * x[s + xx];
          }
        }
      }
    }
    const h = size >> 1, out = new Float32Array(cout * h * h);
    for (let o = 0; o < cout; o++) for (let y = 0; y < h; y++) for (let xx = 0; xx < h; xx++) {
      const i = o * n + 2 * y * size + 2 * xx;
      const m = Math.max(conv[i], conv[i + 1], conv[i + size], conv[i + size + 1]);
      out[(o * h + y) * h + xx] = m > 0 ? m : 0;
    }
    return out;
  }
  function dense(x, wt, bias, nout, relu) {
    const nin = x.length, out = new Float32Array(nout);
    for (let o = 0; o < nout; o++) {
      let s = bias[o]; const b = o * nin;
      for (let i = 0; i < nin; i++) s += wt[b + i] * x[i];
      out[o] = relu && s < 0 ? 0 : s;
    }
    return out;
  }
  // Classes 0-9 are digits; 10-16 (if the model has them) are the same digits
  // written BACKWARDS: mirrored 2 3 4 5 6 7 9. See train/train.py.
  const MIRRORED = [2, 3, 4, 5, 6, 7, 9];
  const digitOf = cls => cls < 10 ? cls : MIRRORED[cls - 10];

  // img: Float32Array(784), 0 = paper, 1 = ink. Returns softmax probabilities.
  function classify(img) {
    const w = weights();
    let x = convReluPool(img, 1, 28, w['c1.weight'], w['c1.bias'], 16);
    x = convReluPool(x, 16, 14, w['c2.weight'], w['c2.bias'], 32);
    x = convReluPool(x, 32, 7, w['c3.weight'], w['c3.bias'], 64);
    x = dense(x, w['f1.weight'], w['f1.bias'], 64, true);
    x = dense(x, w['f2.weight'], w['f2.bias'], w['f2.bias'].length, false);
    let m = -Infinity; for (const v of x) m = Math.max(m, v);
    let s = 0; const p = x.map(v => { const e = Math.exp(v - m); s += e; return e; });
    return Array.from(p, v => v / s);
  }

  // ---- strokes -> 28x28 image, MNIST style -------------------------------
  // MNIST digits fit a 20x20 box (aspect kept), centred by centre of mass.
  function bbox(strokes) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const s of strokes) for (const [x, y] of s) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
  }
  const RADIUS = 1.25; // stroke half-width in 28px space

  function render(strokes) {
    const b = bbox(strokes);
    const k = 20 / Math.max(b.w, b.h, 1e-6);
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    const segs = [];
    for (const s of strokes) {
      const P = s.map(([x, y]) => [(x - cx) * k + 14, (y - cy) * k + 14]);
      if (P.length === 1) P.push(P[0]);
      for (let i = 1; i < P.length; i++) segs.push([P[i - 1][0], P[i - 1][1], P[i][0], P[i][1]]);
    }
    const draw = (ox, oy) => {
      const img = new Float32Array(784);
      for (const [ax0, ay0, bx0, by0] of segs) {
        const ax = ax0 + ox, ay = ay0 + oy, bx = bx0 + ox, by = by0 + oy;
        const gx0 = Math.max(0, Math.floor(Math.min(ax, bx) - RADIUS - 1));
        const gx1 = Math.min(27, Math.ceil(Math.max(ax, bx) + RADIUS + 1));
        const gy0 = Math.max(0, Math.floor(Math.min(ay, by) - RADIUS - 1));
        const gy1 = Math.min(27, Math.ceil(Math.max(ay, by) + RADIUS + 1));
        const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
        for (let py = gy0; py <= gy1; py++) for (let px = gx0; px <= gx1; px++) {
          const qx = px + 0.5, qy = py + 0.5;
          let t = L2 ? ((qx - ax) * dx + (qy - ay) * dy) / L2 : 0;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const ex = ax + t * dx - qx, ey = ay + t * dy - qy;
          const d = Math.sqrt(ex * ex + ey * ey);
          const v = RADIUS + 0.5 - d;
          if (v > 0) { const i = py * 28 + px; if (v > img[i]) img[i] = v > 1 ? 1 : v; }
        }
      }
      return img;
    };
    // centre of mass to the middle
    let img = draw(0, 0), m = 0, mx = 0, my = 0;
    for (let i = 0; i < 784; i++) { const v = img[i]; m += v; mx += v * (i % 28 + 0.5); my += v * (Math.floor(i / 28) + 0.5); }
    if (m > 0) {
      const ox = 14 - mx / m, oy = 14 - my / m;
      if (Math.abs(ox) > 0.3 || Math.abs(oy) > 0.3) img = draw(ox, oy);
    }
    return img;
  }

  // ---- splitting a written number into digits ----------------------------
  // Digits sit side by side, so group strokes whose horizontal extents overlap
  // a lot (the two strokes of a 4, the flag of a 5). `unit` is the writing
  // height, used to ignore taps and to stop thin 1s from swallowing neighbours.
  function split(strokes, unit) {
    const items = [];
    for (const s of strokes) {
      if (!s.length) continue;
      const b = bbox([s]);
      if (Math.max(b.w, b.h) < unit * 0.04) continue; // stray tap
      items.push({ x0: b.x0, x1: b.x1, strokes: [s] });
    }
    items.sort((a, b) => a.x0 - b.x0);
    const groups = [];
    for (const it of items) {
      let merged = false;
      for (const g of groups) {
        const ov = Math.min(g.x1, it.x1) - Math.max(g.x0, it.x0);
        const narrow = Math.max(Math.min(g.x1 - g.x0, it.x1 - it.x0), unit * 0.25);
        // or a thin stroke standing well inside a wider one (the down stroke of a 4)
        const gw = g.x1 - g.x0, iw = it.x1 - it.x0;
        const [wide, thin] = gw >= iw ? [g, it] : [it, g];
        const mid = (thin.x0 + thin.x1) / 2, ww = wide.x1 - wide.x0;
        const inside = mid > wide.x0 + ww * 0.15 && mid < wide.x1 - ww * 0.15;
        if (ov > narrow * 0.45 || inside) {
          g.strokes.push(...it.strokes); g.x0 = Math.min(g.x0, it.x0); g.x1 = Math.max(g.x1, it.x1);
          merged = true; break;
        }
      }
      if (!merged) groups.push({ x0: it.x0, x1: it.x1, strokes: it.strokes });
    }
    groups.sort((a, b) => a.x0 - b.x0);
    return groups;
  }

  function readNumber(strokes, unit) {
    if (!strokes.length) return { text: '', digits: [] };
    if (!unit) { const b = bbox(strokes); unit = Math.max(b.h, 1e-6); }
    const digits = split(strokes, unit).map(g => {
      const p = classify(render(g.strokes));
      let c = 0; for (let i = 1; i < p.length; i++) if (p[i] > p[c]) c = i;
      return { d: digitOf(c), p: p[c], backwards: c >= 10, x0: g.x0, x1: g.x1 };
    });
    return { text: digits.map(g => g.d).join(''), digits, backwards: digits.filter(g => g.backwards).map(g => g.d) };
  }

  root.SumsDigits = { readNumber, classify, render, split, digitOf };
})(typeof window !== 'undefined' ? window : globalThis);
