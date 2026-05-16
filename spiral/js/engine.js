// Main simulation engine (runs on main thread for animated playback)

import { buildSpiralCoords, expandVectors, cellKey } from './spiral.js';

export const FACTION_COLORS = ['#e74c3c', '#2c2c2c', '#3498db', '#27ae60', '#9b59b6', '#f39c12'];
export const FACTION_NAMES  = ['Red', 'Black', 'Blue', 'Green', 'Purple', 'Orange'];

export class SimEngine {
  constructor() {
    this.reset();
  }

  init(gridW, gridH, factionCount, factionVectors) {
    this.gridW = gridW;
    this.gridH = gridH;
    this.factionCount = factionCount;
    // factionVectors[i] = array of {dx,dy} from the 6x6 grid (first quadrant)
    this.factionVectors = factionVectors;
    this.fullVectors = factionVectors.map(qv => expandVectors(qv));
    const totalCells = gridW * gridH;
    this.spiralCoords = buildSpiralCoords(totalCells + 200); // slight buffer
    this.reset();
  }

  reset() {
    this.occupiedBy  = new Map(); // cellKey -> faction index
    this.attackedBy  = new Map(); // cellKey -> Set of faction indices
    this.turn        = 0;
    this.stepCount   = 0;
    this.done        = false;
    this.scanPointer = 0; // optimisation: track lowest unchecked cell
  }

  // Run one placement. Returns {x, y, faction} or null if done.
  step() {
    if (this.done) return null;
    const faction = this.turn % this.factionCount;
    const vectors = this.fullVectors[faction];
    const coords  = this.spiralCoords;

    let foundIdx = -1;
    for (let i = 0; i < coords.length; i++) {
      const { x, y } = coords[i];
      const key = cellKey(x, y);
      if (this.occupiedBy.has(key)) continue;
      const attacked = this.attackedBy.get(key);
      if (attacked) {
        let blocked = false;
        for (const attacker of attacked) {
          if (attacker !== faction) { blocked = true; break; }
        }
        if (blocked) continue;
      }
      foundIdx = i;
      break;
    }

    if (foundIdx === -1) { this.done = true; return null; }

    const { x, y } = coords[foundIdx];
    const key = cellKey(x, y);
    this.occupiedBy.set(key, faction);

    for (const { dx, dy } of vectors) {
      const akey = cellKey(x + dx, y + dy);
      if (!this.attackedBy.has(akey)) this.attackedBy.set(akey, new Set());
      this.attackedBy.get(akey).add(faction);
    }

    this.turn++;
    this.stepCount++;
    return { x, y, faction };
  }

  getState() {
    return {
      occupiedBy: this.occupiedBy,
      attackedBy: this.attackedBy,
      stepCount:  this.stepCount,
      done:       this.done,
    };
  }
}
