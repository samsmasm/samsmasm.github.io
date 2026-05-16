// Web Worker: instant full-grid simulation, same optimizations as engine.js
import { buildSpiralCoords, expandVectors, numKey } from './spiral.js';

self.onmessage = function(e) {
  const { totalCells, factionCount, factionVectors } = e.data;
  const n = totalCells + 500;
  const spiralCoords = buildSpiralCoords(n);
  const fullVectors  = factionVectors.map(qv => expandVectors(qv));

  // Build coord→index map
  const coordToIdx = new Map();
  for (let i = 0; i < n; i++) {
    const { x, y } = spiralCoords[i];
    coordToIdx.set(numKey(x, y), i);
  }

  const occupiedBy = new Uint8Array(n);  // 0=free, 1+f=faction
  const attackedBy = new Uint16Array(n); // bitmask (supports up to 16 factions)
  const scanPtrs   = new Int32Array(factionCount);
  let turn = 0;

  for (let placed = 0; placed < totalCells; placed++) {
    const f = turn % factionCount;
    const enemyMask = ((1 << factionCount) - 1) ^ (1 << f);

    let ptr = scanPtrs[f];
    while (ptr < n &&
           (occupiedBy[ptr] !== 0 || (attackedBy[ptr] & enemyMask) !== 0)) {
      ptr++;
    }
    scanPtrs[f] = ptr;

    if (ptr >= n) break;

    const { x, y } = spiralCoords[ptr];
    occupiedBy[ptr] = f + 1;

    for (const { dx, dy } of fullVectors[f]) {
      const idx = coordToIdx.get(numKey(x + dx, y + dy));
      if (idx !== undefined) attackedBy[idx] |= (1 << f);
    }

    turn++;

    if (placed % 50000 === 0) {
      self.postMessage({ type: 'progress', placed, totalCells });
    }
  }

  // Transfer typed arrays directly (zero-copy)
  self.postMessage(
    { type: 'done', occupiedBy, attackedBy, n },
    [occupiedBy.buffer, attackedBy.buffer]
  );
};
