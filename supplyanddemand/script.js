// Set up canvas and context
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

// Economic coordinate system settings
const Q_MAX = 100;
const P_MAX = 100;
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;

// Conversion functions between economic coordinates and canvas pixels.
function econToCanvas(Q, P) {
  const x = Q * (canvasWidth / Q_MAX);
  // Flip P because canvas y increases downward
  const y = canvasHeight - P * (canvasHeight / P_MAX);
  return { x, y };
}

function canvasToEcon(x, y) {
  const Q = x / (canvasWidth / Q_MAX);
  const P = (canvasHeight - y) / (canvasHeight / P_MAX);
  return { Q, P };
}

// A helper to ensure label positions stay on screen.
function clampX(x) {
  return Math.max(5, Math.min(x, canvasWidth - 60));
}

// Baseline parameters for the curves
const demandBaseIntercept = 80;  // Demand: P = 80 - 0.8*Q (if no shift)
const supplyBaseIntercept = 20;  // Supply: P = 20 + 0.8*Q
const slopeFactor = 0.8;         // absolute slope

// Shift parameters (in Q-units)
// A positive delta means a rightward shift.
let deltaDemand = 0;
let deltaSupply = 0;

// The functions representing the curves; optionally allow a provided delta.
function demandP(Q, delta = deltaDemand) {
  return (demandBaseIntercept + slopeFactor * delta) - slopeFactor * Q;
}

function supplyP(Q, delta = deltaSupply) {
  return supplyBaseIntercept - slopeFactor * delta + slopeFactor * Q;
}

// Compute the instantaneous equilibrium (intersection of the two curves)
// Uses the provided deltas.
function computeEquilibrium(deltaD = deltaDemand, deltaS = deltaSupply) {
  const Qeq = ((demandBaseIntercept - supplyBaseIntercept) + slopeFactor * (deltaD + deltaS)) / (2 * slopeFactor);
  const Peq = (demandBaseIntercept + slopeFactor * deltaD) - slopeFactor * Qeq;
  return { Q: Qeq, P: Peq };
}

// stickyPrice controls the horizontal dotted line (initially at equilibrium)
let stickyPrice = computeEquilibrium().P;
// Increase speed: quicker adjustment toward new equilibrium.
const priceLerp = 0.05;

// ---
// Ghost parameters (for when "Show the changes" is enabled)
let ghostExists = false;
let ghostDeltaDemand = 0;
let ghostDeltaSupply = 0;
let ghostStickyPrice = 0;
let ghostEquilibrium = { Q: 0, P: 0 };

// ---
// Dragging logic (horizontal only)
function pointToLineDistance(px, py, x1, y1, x2, y2) {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = (len_sq !== 0) ? (dot / len_sq) : -1;
  let xx, yy;
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

const dragThreshold = 10; // pixels
let activeCurve = null;   // "demand" or "supply"
let dragStartQ = 0;       // starting Q (in economic units) when dragging begins
let initialDelta = 0;     // the delta value at the start of dragging
let isDragging = false;

canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  // Determine closeness to the demand curve
  const dStart = econToCanvas(0, demandP(0));
  const dEnd = econToCanvas(Q_MAX, demandP(Q_MAX));
  const distDemand = pointToLineDistance(mouseX, mouseY, dStart.x, dStart.y, dEnd.x, dEnd.y);
  
  // Determine closeness to the supply curve
  const sStart = econToCanvas(0, supplyP(0));
  const sEnd = econToCanvas(Q_MAX, supplyP(Q_MAX));
  const distSupply = pointToLineDistance(mouseX, mouseY, sStart.x, sStart.y, sEnd.x, sEnd.y);
  
  if (distDemand < dragThreshold || distSupply < dragThreshold) {
    // If "Show the changes" is checked, record ghost values.
    if (document.getElementById("showGhost").checked) {
      ghostExists = true;
      ghostDeltaDemand = deltaDemand;
      ghostDeltaSupply = deltaSupply;
      ghostStickyPrice = stickyPrice;
      ghostEquilibrium = computeEquilibrium();
    } else {
      ghostExists = false;
    }
    
    activeCurve = (distDemand < distSupply) ? "demand" : "supply";
    isDragging = true;
    const econPos = canvasToEcon(mouseX, mouseY);
    dragStartQ = econPos.Q;
    initialDelta = (activeCurve === "demand") ? deltaDemand : deltaSupply;
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (!activeCurve) return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const econPos = canvasToEcon(mouseX, 0); // Only horizontal (Q) matters
  const dQ = econPos.Q - dragStartQ;
  
  if (activeCurve === "demand") {
    deltaDemand = initialDelta + dQ;
  } else if (activeCurve === "supply") {
    deltaSupply = initialDelta + dQ;
  }
});

canvas.addEventListener('mouseup', () => {
  activeCurve = null;
  isDragging = false;
});

canvas.addEventListener('mouseleave', () => {
  activeCurve = null;
  isDragging = false;
});

// ---
// Arrow drawing utility
function drawArrow(x1, y1, x2, y2) {
  const headLength = 8;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
  ctx.lineTo(x2, y2);
  ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
  ctx.fill();
}

// ---
// Drawing functions

function drawAxes() {
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  
  // x-axis (Quantity)
  ctx.beginPath();
  const origin = econToCanvas(0, 0);
  const xAxisEnd = econToCanvas(Q_MAX, 0);
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(xAxisEnd.x, xAxisEnd.y);
  ctx.stroke();
  
  // y-axis (Price)
  ctx.beginPath();
  const yAxisEnd = econToCanvas(0, P_MAX);
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(origin.x, yAxisEnd.y);
  ctx.stroke();
  
  // Axis labels
  ctx.fillStyle = '#000';
  ctx.font = '14px sans-serif';
  ctx.fillText("Q", canvasWidth - 20, origin.y - 10);
  ctx.fillText("P", origin.x + 10, 20);
}

function drawGhostCurves() {
  // Only draw ghost curves if that curve was moved.
  ctx.save();
  ctx.setLineDash([4, 4]);
  
  // Ghost Demand
  if (Math.abs(ghostDeltaDemand - deltaDemand) > 0.001) {
    ctx.beginPath();
    const dStart = econToCanvas(0, demandP(0, ghostDeltaDemand));
    const dEnd = econToCanvas(Q_MAX, demandP(Q_MAX, ghostDeltaDemand));
    ctx.moveTo(dStart.x, dStart.y);
    ctx.lineTo(dEnd.x, dEnd.y);
    ctx.strokeStyle = '#ff9999'; // lighter red
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  // Ghost Supply
  if (Math.abs(ghostDeltaSupply - deltaSupply) > 0.001) {
    ctx.beginPath();
    const sStart = econToCanvas(0, supplyP(0, ghostDeltaSupply));
    const sEnd = econToCanvas(Q_MAX, supplyP(Q_MAX, ghostDeltaSupply));
    ctx.moveTo(sStart.x, sStart.y);
    ctx.lineTo(sEnd.x, sEnd.y);
    ctx.strokeStyle = '#99cc99'; // lighter green
    ctx.stroke();
  }
  ctx.restore();
}

function drawGhostDottedLines() {
  const ghostStickyY = econToCanvas(0, ghostStickyPrice).y;
  ctx.save();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  
  // Horizontal ghost dotted line
  ctx.beginPath();
  ctx.moveTo(0, ghostStickyY);
  ctx.lineTo(canvasWidth, ghostStickyY);
  ctx.stroke();
  
  // Compute Q where ghost curves intersect ghostStickyPrice.
  const ghostQd = (demandBaseIntercept + slopeFactor * ghostDeltaDemand - ghostStickyPrice) / slopeFactor;
  const ghostQs = (ghostStickyPrice - (supplyBaseIntercept - slopeFactor * ghostDeltaSupply)) / slopeFactor;
  
  const ghostPosQd = econToCanvas(ghostQd, 0).x;
  const ghostPosQs = econToCanvas(ghostQs, 0).x;
  
  // Vertical dotted lines
  ctx.beginPath();
  ctx.moveTo(ghostPosQd, ghostStickyY);
  ctx.lineTo(ghostPosQd, canvasHeight);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(ghostPosQs, ghostStickyY);
  ctx.lineTo(ghostPosQs, canvasHeight);
  ctx.stroke();
  ctx.restore();
  
  // Label ghost vertical lines.
  ctx.fillStyle = '#000';
  ctx.font = '14px sans-serif';
  if (Math.abs(ghostQd - ghostQs) < 0.5) {
    const ghostPosQ = econToCanvas((ghostQd + ghostQs) / 2, 0).x;
    ctx.fillText("Qe", clampX(ghostPosQ) - 15, canvasHeight - 10);
    const ghostPriceLabel = ghostEquilibrium.P.toFixed(1);
    // Position P1 toward the right.
    ctx.fillText("P1: " + ghostPriceLabel, canvasWidth - 60, econToCanvas(0, ghostEquilibrium.P).y - 10);
  } else {
    ctx.fillText("Qd", clampX(econToCanvas(ghostQd, 0).x) - 15, canvasHeight - 10);
    ctx.fillText("Qs", clampX(econToCanvas(ghostQs, 0).x) - 15, canvasHeight - 10);
    const midX = (econToCanvas(ghostQd, 0).x + econToCanvas(ghostQs, 0).x) / 2;
    if (ghostQd > ghostQs) {
      ctx.fillText("Shortage", midX - 20, canvasHeight - 30);
    } else {
      ctx.fillText("Surplus", midX - 20, canvasHeight - 30);
    }
    const ghostPriceLabel = ghostStickyPrice.toFixed(1);
    ctx.fillText("P1: " + ghostPriceLabel, canvasWidth - 60, econToCanvas(0, ghostStickyPrice).y - 10);
  }
}

function drawGhostEquilibriumMarker() {
  const pos = econToCanvas(ghostEquilibrium.Q, ghostEquilibrium.P);
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 6, 0, 2 * Math.PI);
  ctx.strokeStyle = '#000';
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#000';
  ctx.font = '14px sans-serif';
  ctx.fillText("E1", pos.x - 20, pos.y - 10);
}

function drawNewCurves() {
  // Draw new demand curve
  ctx.beginPath();
  const dStart = econToCanvas(0, demandP(0));
  const dEnd = econToCanvas(Q_MAX, demandP(Q_MAX));
  ctx.moveTo(dStart.x, dStart.y);
  ctx.lineTo(dEnd.x, dEnd.y);
  ctx.strokeStyle = '#d9534f'; // red
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Draw new supply curve
  ctx.beginPath();
  const sStart = econToCanvas(0, supplyP(0));
  const sEnd = econToCanvas(Q_MAX, supplyP(Q_MAX));
  ctx.moveTo(sStart.x, sStart.y);
  ctx.lineTo(sEnd.x, sEnd.y);
  ctx.strokeStyle = '#5cb85c'; // green
  ctx.stroke();
}

function drawNewDottedLines() {
  const stickyY = econToCanvas(0, stickyPrice).y;
  ctx.save();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  
  // Horizontal dotted line
  ctx.beginPath();
  ctx.moveTo(0, stickyY);
  ctx.lineTo(canvasWidth, stickyY);
  ctx.stroke();
  
  // Compute Q for new curves at stickyPrice.
  const Qd = (demandBaseIntercept + slopeFactor * deltaDemand - stickyPrice) / slopeFactor;
  const Qs = (stickyPrice - (supplyBaseIntercept - slopeFactor * deltaSupply)) / slopeFactor;
  
  const posQd = econToCanvas(Qd, 0).x;
  const posQs = econToCanvas(Qs, 0).x;
  
  // Vertical dotted lines
  ctx.beginPath();
  ctx.moveTo(posQd, stickyY);
  ctx.lineTo(posQd, canvasHeight);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(posQs, stickyY);
  ctx.lineTo(posQs, canvasHeight);
  ctx.stroke();
  ctx.restore();
  
  // Label new dotted lines.
  ctx.fillStyle = '#000';
  ctx.font = '14px sans-serif';
  if (Math.abs(Qd - Qs) < 0.5) {
    const posQ = econToCanvas((Qd + Qs) / 2, 0).x;
    ctx.fillText("Qe", clampX(posQ) - 15, canvasHeight - 10);
    const priceLabel = computeEquilibrium().P.toFixed(1);
    ctx.fillText("P2: " + priceLabel, canvasWidth - 60, econToCanvas(0, computeEquilibrium().P).y - 10);
  } else {
    ctx.fillText("Qd", clampX(posQd) - 15, canvasHeight - 10);
    ctx.fillText("Qs", clampX(posQs) - 15, canvasHeight - 10);
    const midX = (posQd + posQs) / 2;
    if (Qd > Qs) {
      ctx.fillText("Shortage", midX - 20, canvasHeight - 30);
    } else {
      ctx.fillText("Surplus", midX - 20, canvasHeight - 30);
    }
    const priceLabel = stickyPrice.toFixed(1);
    ctx.fillText("P2: " + priceLabel, canvasWidth - 60, econToCanvas(0, stickyPrice).y - 10);
  }
}

function drawNewEquilibriumMarker() {
  const eq = computeEquilibrium();
  const pos = econToCanvas(eq.Q, eq.P);
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 6, 0, 2 * Math.PI);
  ctx.fillStyle = '#337ab7';
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.stroke();
  ctx.fillStyle = '#000';
  ctx.font = '14px sans-serif';
  ctx.fillText("E2", pos.x - 15, pos.y - 10);
}

// Draw labels for curves.
// If ghost exists and a curve was moved, label ghost as "D1"/"S1" and new as "D2"/"S2".
// Otherwise, label simply as "Demand" or "Supply". Also, ensure labels are clamped within the canvas.
function drawCurveLabels() {
  if (ghostExists && Math.abs(ghostDeltaDemand - deltaDemand) > 0.001) {
    ctx.fillStyle = '#ff9999';
    ctx.font = '16px sans-serif';
    const posDemand = econToCanvas(10, demandP(10, ghostDeltaDemand));
    ctx.fillText("D1", clampX(posDemand.x) + 5, posDemand.y - 5);
    
    ctx.fillStyle = '#d9534f';
    const posDemandNew = econToCanvas(10, demandP(10));
    ctx.fillText("D2", clampX(posDemandNew.x) + 5, posDemandNew.y - 5);
  } else {
    ctx.fillStyle = '#d9534f';
    ctx.font = '16px sans-serif';
    const posDemand = econToCanvas(10, demandP(10));
    ctx.fillText("Demand", clampX(posDemand.x) + 5, posDemand.y - 5);
  }
  
  if (ghostExists && Math.abs(ghostDeltaSupply - deltaSupply) > 0.001) {
    ctx.fillStyle = '#99cc99';
    ctx.font = '16px sans-serif';
    const posSupply = econToCanvas(10, supplyP(10, ghostDeltaSupply));
    ctx.fillText("S1", clampX(posSupply.x) + 5, posSupply.y + 15);
    
    ctx.fillStyle = '#5cb85c';
    const posSupplyNew = econToCanvas(10, supplyP(10));
    ctx.fillText("S2", clampX(posSupplyNew.x) + 5, posSupplyNew.y + 15);
  } else {
    ctx.fillStyle = '#5cb85c';
    ctx.font = '16px sans-serif';
    const posSupply = econToCanvas(10, supplyP(10));
    ctx.fillText("Supply", clampX(posSupply.x) + 5, posSupply.y + 15);
  }
}

// Draw arrows between ghost and new values for equilibrium, price, and Qe if there are differences.
function drawArrows() {
  const arrowThreshold = 0.5;
  
  // Determine which curve has shifted (if any) for arrow offset.
  let shiftedCurve = null;
  if (Math.abs(ghostDeltaDemand - deltaDemand) > 0.001) shiftedCurve = "demand";
  else if (Math.abs(ghostDeltaSupply - deltaSupply) > 0.001) shiftedCurve = "supply";
  
  let offset = 0;
  if (shiftedCurve === "demand") offset = 10;
  else if (shiftedCurve === "supply") offset = -10;
  
  // Equilibrium arrow
  const ghostEq = ghostEquilibrium;
  const newEq = computeEquilibrium();
  if (Math.abs(ghostEq.P - newEq.P) > arrowThreshold || Math.abs(ghostEq.Q - newEq.Q) > arrowThreshold) {
    const posGhost = econToCanvas(ghostEq.Q, ghostEq.P);
    const posNew = econToCanvas(newEq.Q, newEq.P);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    // Shift arrow horizontally by the offset so it doesn't overlap the curve.
    drawArrow(posGhost.x + offset, posGhost.y, posNew.x + offset, posNew.y);
  }
  
  // Price arrow (vertical) placed at the very left.
  if (Math.abs(ghostStickyPrice - stickyPrice) > arrowThreshold) {
    const posGhost = econToCanvas(0, ghostStickyPrice);
    const posNew = econToCanvas(0, stickyPrice);
    const xFixed = 20; // very left
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    drawArrow(xFixed, posGhost.y, xFixed, posNew.y);
  }
  
  // Qe arrow (horizontal) placed at the very bottom.
  const ghostQd = (demandBaseIntercept + slopeFactor * ghostDeltaDemand - ghostStickyPrice) / slopeFactor;
  const ghostQs = (ghostStickyPrice - (supplyBaseIntercept - slopeFactor * ghostDeltaSupply)) / slopeFactor;
  const ghostQe = (ghostQd + ghostQs) / 2;
  
  const Qd = (demandBaseIntercept + slopeFactor * deltaDemand - stickyPrice) / slopeFactor;
  const Qs = (stickyPrice - (supplyBaseIntercept - slopeFactor * deltaSupply)) / slopeFactor;
  const newQe = (Qd + Qs) / 2;
  
  if (Math.abs(ghostQe - newQe) > 0.5) {
    const posGhost = econToCanvas(ghostQe, 0);
    const posNew = econToCanvas(newQe, 0);
    const yFixed = canvasHeight - 10; // very bottom
    drawArrow(posGhost.x, yFixed, posNew.x, yFixed);
  }
}

// Main animation loop
function animate() {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  drawAxes();
  
  const ghostEnabled = document.getElementById("showGhost").checked;
  if (ghostEnabled && ghostExists) {
    drawGhostCurves();
    drawGhostDottedLines();
    drawGhostEquilibriumMarker();
  }
  
  drawNewCurves();
  drawCurveLabels();
  
  if (!isDragging) {
    const target = computeEquilibrium().P;
    stickyPrice += (target - stickyPrice) * priceLerp;
  }
  
  drawNewDottedLines();
  drawNewEquilibriumMarker();
  if (ghostEnabled && ghostExists) {
    drawArrows();
  }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
