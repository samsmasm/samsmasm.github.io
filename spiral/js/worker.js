// Web Worker: runs full simulation without blocking UI

import { buildSpiralCoords, expandVectors, cellKey } from './spiral.js';

self.onmessage = function(e) {
  const { totalCells, factionCount, factionVectors } = e.data;
  const spiralCoords = buildSpiralCoords(totalCells + 200);

  // occupiedBy: faction index (0-based), or -1
  // attackedBy: Set of faction indices
  const occupiedBy = new Map();  // key -> faction index
  const attackedBy = new Map();  // key -> Set of faction indices

  // Each faction tracks its placed positions
  const factionPlacements = Array.from({ length: factionCount }, () => []);

  // Precompute full attack vectors per faction
  const fullVectors = factionVectors.map(qv => expandVectors(qv));

  let turn = 0; // current faction index

  for (let placed = 0; placed < totalCells; placed++) {
    const faction = turn % factionCount;
    const vectors = fullVectors[faction];

    // Scan spiral for lowest valid cell
    let foundIdx = -1;
    for (let i = 0; i < totalCells; i++) {
      const { x, y } = spiralCoords[i];
      const key = cellKey(x, y);
      if (occupiedBy.has(key)) continue;
      const attacked = attackedBy.get(key);
      if (attacked) {
        // Check if any attacking faction is an enemy
        let blocked = false;
        for (const attacker of attacked) {
          if (attacker !== faction) { blocked = true; break; }
        }
        if (blocked) continue;
      }
      foundIdx = i;
      break;
    }

    if (foundIdx === -1) break; // no valid cell, simulation complete

    const { x, y } = spiralCoords[foundIdx];
    const key = cellKey(x, y);
    occupiedBy.set(key, faction);
    factionPlacements[faction].push(foundIdx);

    // Project attack vectors
    for (const { dx, dy } of vectors) {
      const ax = x + dx, ay = y + dy;
      const akey = cellKey(ax, ay);
      if (!attackedBy.has(akey)) attackedBy.set(akey, new Set());
      attackedBy.get(akey).add(faction);
    }

    turn++;

    // Report progress every 10000 placements
    if (placed % 10000 === 0) {
      self.postMessage({ type: 'progress', placed, totalCells });
    }
  }

  // Serialize result: array of [spiralIndex, factionIndex]
  const placements = [];
  for (const [key, faction] of occupiedBy) {
    placements.push({ key, faction });
  }

  // Also send attack coverage as flat array for rendering
  const attacks = [];
  for (const [key, factions] of attackedBy) {
    attacks.push({ key, factions: Array.from(factions) });
  }

  self.postMessage({ type: 'done', placements, attacks });
};
