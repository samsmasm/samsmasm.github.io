// Integer coordinate key -- no string allocation in hot paths
export function numKey(x, y) { return (y + 2000) * 4001 + (x + 2000); }

// Spiral coordinate pre-computation
// Direction sequence: right, up, left, down
export function buildSpiralCoords(count) {
  const coords = new Array(count);
  coords[0] = { x: 0, y: 0 };
  if (count === 1) return coords;

  let x = 0, y = 0;
  const dx = [1, 0, -1, 0];
  const dy = [0, 1, 0, -1];
  let dir = 0, steps = 1, stepsTaken = 0, dirChanges = 0;

  for (let i = 1; i < count; i++) {
    x += dx[dir];
    y += dy[dir];
    coords[i] = { x, y };
    stepsTaken++;
    if (stepsTaken === steps) {
      stepsTaken = 0;
      dir = (dir + 1) % 4;
      dirChanges++;
      if (dirChanges % 2 === 0) steps++;
    }
  }
  return coords;
}

// Expand first-quadrant vectors by rotating 90°/180°/270°
export function expandVectors(quadrantVectors) {
  const seen = new Set();
  const result = [];
  for (const { dx, dy } of quadrantVectors) {
    for (const r of [
      { dx:  dx, dy:  dy },
      { dx: -dy, dy:  dx },
      { dx: -dx, dy: -dy },
      { dx:  dy, dy: -dx },
    ]) {
      if (r.dx === 0 && r.dy === 0) continue;
      const k = `${r.dx}_${r.dy}`;
      if (!seen.has(k)) { seen.add(k); result.push(r); }
    }
  }
  return result;
}
