// Spiral coordinate pre-computation
// Direction sequence: right, up, left, down
// Starting at (0,0), step 1 = (0,0), step 2 = (1,0), step 3 = (1,1), ...

function buildSpiralCoords(count) {
  const coords = new Array(count);
  coords[0] = { x: 0, y: 0 };
  if (count === 1) return coords;

  let x = 0, y = 0;
  // Directions: right, up, left, down
  const dx = [1, 0, -1, 0];
  const dy = [0, 1, 0, -1];
  let dir = 0;
  let steps = 1;    // steps to take in current direction pair
  let stepsTaken = 0;
  let dirChanges = 0;

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

// Expand attack vectors by rotating through 4 quadrants
// Input: array of {dx, dy} from 6x6 grid (first quadrant, dx>=0, dy>=0)
// Returns full set of attack offsets (deduped)
function expandVectors(quadrantVectors) {
  const seen = new Set();
  const result = [];
  for (const { dx, dy } of quadrantVectors) {
    const rotations = [
      { dx:  dx, dy:  dy },
      { dx: -dy, dy:  dx },
      { dx: -dx, dy: -dy },
      { dx:  dy, dy: -dx },
    ];
    for (const r of rotations) {
      if (r.dx === 0 && r.dy === 0) continue;
      const key = `${r.dx}_${r.dy}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(r);
      }
    }
  }
  return result;
}

// Key for grid state map
function cellKey(x, y) { return `${x},${y}`; }

export { buildSpiralCoords, expandVectors, cellKey };
