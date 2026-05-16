import { buildSpiralCoords, expandVectors, numKey } from './spiral.js';

export const FACTION_COLORS = ['#e74c3c', '#2c2c2c', '#3498db', '#27ae60', '#9b59b6', '#f39c12'];
export const FACTION_NAMES  = ['Red', 'Black', 'Blue', 'Green', 'Purple', 'Orange'];

export class SimEngine {
  constructor() { this.ready = false; }

  init(gridW, gridH, factionCount, factionVectors) {
    this.gridW = gridW;
    this.gridH = gridH;
    this.factionCount = factionCount;
    this.fullVectors = factionVectors.map(qv => expandVectors(qv));

    const n = gridW * gridH + 500;
    this.spiralCoords = buildSpiralCoords(n);
    this.n = n;

    // coordToIdx: integer key → spiral index, for O(1) attack projection
    this.coordToIdx = new Map();
    for (let i = 0; i < n; i++) {
      const { x, y } = this.spiralCoords[i];
      this.coordToIdx.set(numKey(x, y), i);
    }

    this.ready = true;
    this.reset();
  }

  reset() {
    if (!this.ready) return;
    // occupiedBy[i]: 0 = free, 1..6 = factionIndex+1
    this.occupiedBy = new Uint8Array(this.n);
    // attackedBy[i]: bitmask -- bit f means faction f attacks this cell
    this.attackedBy = new Uint8Array(this.n);
    // Per-faction scan pointers (only advance, never retreat -- O(n) total)
    this.scanPtrs = new Int32Array(this.factionCount);
    this.turn = 0;
    this.stepCount = 0;
    this.done = false;
  }

  step() {
    if (this.done) return null;
    const f = this.turn % this.factionCount;
    const enemyMask = ((1 << this.factionCount) - 1) ^ (1 << f);

    // Advance pointer past permanently-blocked cells
    let ptr = this.scanPtrs[f];
    while (ptr < this.n &&
           (this.occupiedBy[ptr] !== 0 || (this.attackedBy[ptr] & enemyMask) !== 0)) {
      ptr++;
    }
    this.scanPtrs[f] = ptr;

    if (ptr >= this.n) { this.done = true; return null; }

    const { x, y } = this.spiralCoords[ptr];
    this.occupiedBy[ptr] = f + 1;

    // Project attack vectors onto grid (integer keys, no string allocation)
    for (const { dx, dy } of this.fullVectors[f]) {
      const idx = this.coordToIdx.get(numKey(x + dx, y + dy));
      if (idx !== undefined) this.attackedBy[idx] |= (1 << f);
    }

    this.turn++;
    this.stepCount++;
    return { x, y, faction: f };
  }

  getState() {
    return {
      occupiedBy:   this.occupiedBy,
      attackedBy:   this.attackedBy,
      spiralCoords: this.spiralCoords,
      n:            this.n,
      stepCount:    this.stepCount,
      done:         this.done,
    };
  }
}
