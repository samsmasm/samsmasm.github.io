// main.js — UI rendering, animation, controller

// --- Node layout in SVG (viewBox 0 0 720 270) ---
const NODES = {
  consumer:    { x: 360, y: 28 },
  cb:          { x: 360, y: 28 },
  banks:       [{ x: 120, y: 105 }, { x: 360, y: 105 }, { x: 600, y: 105 }],
  assetOwners: [{ x: 100, y: 195 }, { x: 310, y: 195 }, { x: 520, y: 195 }],
  producers:   [{ x: 60, y: 258 }, { x: 180, y: 258 }, { x: 300, y: 258 }, { x: 420, y: 258 }, { x: 540, y: 258 }, { x: 660, y: 258 }],
};

// Token colour by transaction type
const TOKEN_COLORS = {
  loan:          '#3b82f6', // blue  — loan created
  purchase:      '#f59e0b', // amber — ingredient purchase
  cake_sale:     '#f0c040', // gold  — cake revenue
  deposit:       '#22c55e', // green — asset owner deposits
  cb_loan:       '#ef4444', // red   — CB emergency
  repayment:     '#a78bfa', // violet — repayment
  default:       '#ef4444', // red   — default
};

let engine;
let animSpeed = 1;  // multiplier: 0.5 = slow, 1 = normal, 2 = fast
let animating  = false;

// --- Bootstrap ---

document.addEventListener('DOMContentLoaded', () => {
  engine = new GameEngine();
  engine.addEventListener('stateChanged', () => renderAll());

  document.getElementById('cb-rate-slider').addEventListener('input', e => {
    engine.setCBRate(+e.target.value);
  });

  document.getElementById('speed-select').addEventListener('change', e => {
    animSpeed = +e.target.value;
  });

  document.getElementById('advance-btn').addEventListener('click', onAdvance);

  renderAll();
  drawStaticSVG();
});

// --- Advance button handler ---

async function onAdvance() {
  if (animating) return;
  const { phase } = engine.state;

  const ANIMATED_PHASES = ['rate_setting', 'lending', 'trading'];

  if (ANIMATED_PHASES.includes(phase)) {
    animating = true;       // set BEFORE advancePhase so stateChanged listener skips button render
    disableAdvance();
    engine.advancePhase();  // advances to next phase (lending|trading|settlement)
    const tx = engine.runPhase();
    renderAll();
    await animateTransactions(tx);
    animating = false;
    renderAll(); // re-render to show correct button label
    return;
  }

  // settlement → debrief, debrief → next round / game_over (no animation needed)
  engine.advancePhase();
  renderAll();
}

function disableAdvance() {
  const btn = document.getElementById('advance-btn');
  btn.disabled = true;
  btn.textContent = 'Simulating...';
}

function enableAdvance() {
  renderAdvanceButton();
}

// --- Render all ---

function renderAll() {
  renderHeader();
  renderBankPanels();
  renderMoneyPanel();
  renderEventLog();
  renderAdvanceButton();
  renderCBControls();
  renderProducerTable();
  renderDebrief();
}

// --- Header ---

function renderHeader() {
  const { round, maxRounds, phase, cbRate } = engine.state;
  document.getElementById('round-display').textContent  = `Round ${round} / ${maxRounds}`;
  document.getElementById('phase-display').textContent  = phaseLabel(phase);
  document.getElementById('cb-rate-display').textContent = `CB Rate: ${cbRate}%`;
  document.getElementById('pot-display').textContent    = `Consumer Pot: ${engine.state.consumerPot}`;
}

function phaseLabel(phase) {
  return {
    rate_setting: 'Rate Setting',
    lending:      'Lending',
    trading:      'Trading',
    settlement:   'Settlement',
    debrief:      'Debrief',
    game_over:    'Game Over',
  }[phase] ?? phase;
}

// --- Bank panels ---

function renderBankPanels() {
  const container = document.getElementById('bank-panels');
  const BANK_COLORS = ['#3b82f6', '#22c55e', '#a78bfa'];

  container.innerHTML = engine.state.banks.map((b, i) => {
    const assets      = b.reserves + b.loansOutstanding;
    const liabilities = b.depositTotal + b.cbBorrowed;
    const equity      = assets - liabilities;
    const health      = engine.healthRatio(b.id);
    const healthClass = health >= 0.2 ? 'health-green' : health >= 0.1 ? 'health-amber' : 'health-red';
    const lendRate    = engine.lendingRate(b.id);

    const loans = b.loanBook.map(l =>
      `<div class="loan-entry">${l.producerName}: ${l.amount} @ ${l.rate}%</div>`
    ).join('') || '<div class="loan-entry muted">None</div>';

    return `
      <div class="bank-panel" style="border-color:${BANK_COLORS[i]}">
        <div class="bank-header" style="color:${BANK_COLORS[i]}">
          <span>${b.name} Bank</span>
          <span class="bank-badge ${healthClass}">${b.personality}</span>
        </div>
        <div class="bank-rate">Lending rate: <strong>${lendRate}%</strong></div>
        <div class="bs-section">
          <div class="bs-label">ASSETS</div>
          <div class="bs-row"><span>Reserves (cash)</span><span class="amber">${b.reserves.toFixed(0)}</span></div>
          <div class="bs-row"><span>Loans outstanding</span><span class="blue">${b.loansOutstanding.toFixed(0)}</span></div>
          <div class="bs-row total"><span>Total assets</span><span>${assets.toFixed(0)}</span></div>
        </div>
        <div class="bs-section">
          <div class="bs-label">LIABILITIES</div>
          <div class="bs-row"><span>Deposits owed</span><span class="green">${b.depositTotal.toFixed(0)}</span></div>
          <div class="bs-row"><span>CB borrowing</span><span class="red">${b.cbBorrowed.toFixed(0)}</span></div>
          <div class="bs-row total"><span>Total liabilities</span><span>${liabilities.toFixed(0)}</span></div>
        </div>
        <div class="bs-row equity"><span>Equity</span><span class="${equity >= 0 ? 'green' : 'red'}">${equity.toFixed(0)}</span></div>
        ${b.badDebts > 0 ? `<div class="bad-debt">Bad debts: ${b.badDebts.toFixed(0)}</div>` : ''}
        <div class="bs-section">
          <div class="bs-label">LOAN BOOK</div>
          ${loans}
        </div>
      </div>
    `;
  }).join('');
}

// --- Money supply panel ---

function renderMoneyPanel() {
  const physical = engine.state.PHYSICAL_CASH;
  const deposits = engine.totalDeposits;
  const created  = engine.createdMoney;
  const maxBar   = Math.max(deposits, physical, created) * 1.1 || physical;
  const pct      = d => Math.min(100, (d / maxBar) * 100).toFixed(1);

  document.getElementById('money-panel').innerHTML = `
    <div class="mp-title">Money Supply</div>
    <div class="mp-stat">
      <span class="mp-label">Physical cash (constant)</span>
      <div class="mp-bar-wrap"><div class="mp-bar amber" style="width:${pct(physical)}%"></div></div>
      <span class="mp-value amber">${physical}</span>
    </div>
    <div class="mp-stat">
      <span class="mp-label">Bank deposits (total)</span>
      <div class="mp-bar-wrap"><div class="mp-bar green" style="width:${pct(deposits)}%"></div></div>
      <span class="mp-value green">${deposits.toFixed(0)}</span>
    </div>
    <div class="mp-stat created">
      <span class="mp-label">Of which: loan-created ★</span>
      <div class="mp-bar-wrap"><div class="mp-bar created-bar" style="width:${pct(created)}%"></div></div>
      <span class="mp-value created-val">${created.toFixed(0)}</span>
    </div>
    <div class="mp-explain">★ Banks created this money by writing loans — no cash moved.</div>
    <div class="mp-cakes">
      Cakes sold: <strong>${engine.state.cakesSold}</strong> / 15 &nbsp;|&nbsp;
      Consumer pot: <strong>${engine.state.consumerPot}</strong>
    </div>
    ${renderHistoryChart()}
  `;
}

function renderHistoryChart() {
  const hist = engine.state.roundHistory;
  if (hist.length === 0) return '';

  const maxVal = Math.max(...hist.map(h => h.createdMoney), 50) * 1.2;
  const W = 220, H = 72, pad = 10;

  const xScale = i => pad + (i / (engine.state.maxRounds - 1 || 1)) * (W - pad * 2);
  const yScale = v => H - pad - (v / maxVal) * (H - pad * 2);

  const pts = hist.map((h, i) => `${xScale(i)},${yScale(h.createdMoney)}`).join(' ');

  return `
    <div class="chart-label">Loan-created money by round</div>
    <svg class="history-chart" viewBox="0 0 ${W} ${H}">
      <line x1="${pad}" y1="${yScale(0)}" x2="${W - pad}" y2="${yScale(0)}" stroke="#2a3347" stroke-width="1"/>
      ${hist.length > 1 ? `<polyline points="${pts}" fill="none" stroke="#e879f9" stroke-width="2"/>` : ''}
      ${hist.map((h, i) => `
        <circle cx="${xScale(i)}" cy="${yScale(h.createdMoney)}" r="3" fill="#e879f9"/>
        <text x="${xScale(i)}" y="${H - 1}" fill="#888" font-size="7" text-anchor="middle">R${h.round}</text>
        <text x="${xScale(i)}" y="${yScale(h.createdMoney) - 4}" fill="#e879f9" font-size="7" text-anchor="middle">${h.createdMoney.toFixed(0)}</text>
      `).join('')}
    </svg>
  `;
}

// --- CB Controls ---

function renderCBControls() {
  const { cbRate, phase, round, defaultCBRates } = engine.state;
  const locked  = phase !== 'rate_setting';
  const slider  = document.getElementById('cb-rate-slider');
  const label   = document.getElementById('cb-rate-value');

  slider.value    = cbRate;
  slider.disabled = locked;
  label.textContent = `${cbRate}%`;

  const hint = document.getElementById('cb-rate-hint');
  if (locked) {
    hint.textContent = 'Rate locked during simulation';
  } else {
    const suggested = defaultCBRates[round - 1];
    hint.textContent = `Suggested for Round ${round}: ${suggested}% · Drag to change`;
  }
}

// --- Producer table ---

function renderProducerTable() {
  const { producers, banks, ingredientPrices } = engine.state;
  const cost = engine.totalIngredientCost;

  document.getElementById('producer-table').innerHTML = `
    <table class="prod-table">
      <thead>
        <tr>
          <th>Bakery</th>
          <th>Bank</th>
          <th>Deposit</th>
          <th>Borrowed</th>
          <th>Revenue</th>
          <th>Cakes</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${producers.map(p => {
          const bank = p.bankId !== null ? banks[p.bankId] : null;
          const status = p.defaulted ? '<span class="red">Defaulted</span>'
                       : p.cakesMade > 0 ? '<span class="green">Active</span>'
                       : '<span class="muted">Idle</span>';
          return `
            <tr class="${p.defaulted ? 'defaulted' : ''}">
              <td>${p.name}</td>
              <td>${bank ? bank.name : '—'}</td>
              <td class="${p.deposit > 0 ? 'green' : ''}">${p.deposit.toFixed(0)}</td>
              <td class="${p.totalBorrowed > 0 ? 'blue' : ''}">${p.totalBorrowed}</td>
              <td class="${p.revenue > 0 ? 'amber' : ''}">${p.revenue}</td>
              <td>${p.cakesMade}</td>
              <td>${status}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    <div class="ingredient-costs">
      Ingredient cost this round: ${cost}
      (${Object.entries(ingredientPrices).map(([k, v]) => `${k} ${v}`).join(', ')})
    </div>
  `;
}

// --- Advance button ---

function renderAdvanceButton() {
  if (animating) return;
  const btn   = document.getElementById('advance-btn');
  const phase = engine.state.phase;

  const labels = {
    rate_setting: 'Begin Lending Phase →',
    lending:      'Begin Trading Phase →',
    trading:      'Begin Settlement →',
    settlement:   'View Debrief →',
    debrief:      engine.state.round < engine.state.maxRounds ? 'Next Round →' : 'View Final Results →',
    game_over:    null,
  };

  const label = labels[phase];
  if (!label) {
    btn.style.display = 'none';
    return;
  }
  btn.style.display = '';
  btn.disabled      = false;
  btn.textContent   = label;
}

// --- Debrief / Game Over panel ---

function renderDebrief() {
  const panel = document.getElementById('debrief-panel');
  const { phase, round, maxRounds, roundHistory, PHYSICAL_CASH } = engine.state;

  if (phase === 'debrief') {
    const h = roundHistory[roundHistory.length - 1];
    if (!h) { panel.innerHTML = ''; return; }
    panel.innerHTML = `
      <div class="debrief-box">
        <div class="debrief-title">Round ${h.round} Summary</div>
        <div class="debrief-stat">CB Rate: <strong>${h.cbRate}%</strong></div>
        <div class="debrief-stat">Total deposits: <strong>${h.totalDeposits.toFixed(0)}</strong></div>
        <div class="debrief-stat">Physical cash: <strong>${PHYSICAL_CASH}</strong></div>
        <div class="debrief-stat highlight">Created money: <strong>${h.createdMoney.toFixed(0)}</strong></div>
        <div class="debrief-stat">Cakes sold so far: <strong>${h.cakesSold}</strong></div>
      </div>
    `;
    return;
  }

  if (phase === 'game_over') {
    const peak = engine.state.peakCreatedMoney || 0;
    panel.innerHTML = `
      <div class="game-over-box">
        <div class="go-title">The Final Count</div>
        <div class="go-stat">Physical cash in economy: <span class="amber">${PHYSICAL_CASH}</span> (unchanged throughout)</div>
        <div class="go-stat highlight-lg">Peak money created by banks: <span class="created-val">${peak.toFixed(0)}</span></div>
        <div class="go-message">Nobody printed this money. Banks created it by writing loans — simultaneously booking the same number on both sides of their balance sheet. No cash moved.</div>
        ${renderHistoryChartFull()}
        <button onclick="location.reload()" class="restart-btn">Play Again</button>
      </div>
    `;
    return;
  }

  panel.innerHTML = '';
}

function renderHistoryChartFull() {
  const hist = engine.state.roundHistory;
  if (hist.length === 0) return '';

  const maxVal = Math.max(...hist.map(h => h.createdMoney), 100) * 1.15;
  const W = 420, H = 120, pad = 20;
  const rounds = engine.state.maxRounds;

  const xScale = i => pad + (i / (rounds - 1 || 1)) * (W - pad * 2);
  const yScale = v => H - pad - (v / maxVal) * (H - pad * 2);

  const pts = hist.map((h, i) => `${xScale(i)},${yScale(h.createdMoney)}`).join(' ');

  return `
    <svg class="history-chart-full" viewBox="0 0 ${W} ${H}">
      <line x1="${pad}" y1="${yScale(0)}" x2="${W - pad}" y2="${yScale(0)}" stroke="#2a3347" stroke-width="1"/>
      ${hist.length > 1 ? `<polyline points="${pts}" fill="none" stroke="#e879f9" stroke-width="2.5"/>` : ''}
      ${hist.map((h, i) => `
        <circle cx="${xScale(i)}" cy="${yScale(h.createdMoney)}" r="4" fill="#e879f9"/>
        <text x="${xScale(i)}" y="${yScale(h.createdMoney) - 7}" fill="#e879f9" font-size="8" text-anchor="middle">${h.createdMoney.toFixed(0)}</text>
        <text x="${xScale(i)}" y="${H - 4}" fill="#888" font-size="8" text-anchor="middle">R${h.round} · ${h.cbRate}%</text>
      `).join('')}
      <text x="${pad}" y="${pad - 4}" fill="#e879f9" font-size="8">Loan-created money per round</text>
    </svg>
  `;
}

// --- Event log ---

function renderEventLog() {
  const log = document.getElementById('event-log');
  const events = engine.state.events.slice(0, 60);

  log.innerHTML = events.map(ev => {
    const cls = {
      phase:          'ev-phase',
      bank_rate:      'ev-bank',
      prices:         'ev-info',
      loan:           'ev-loan',
      no_loan:        'ev-info',
      skip:           'ev-skip',
      purchase:       'ev-purchase',
      cake_sale:      'ev-cake',
      settle_deposit: 'ev-deposit',
      cb_emergency:   'ev-cb',
      repayment:      'ev-repay',
      default:        'ev-default',
    }[ev.type] || 'ev-info';

    return `<div class="ev ${cls}"><span class="ev-round">R${ev.round}</span>${ev.text}</div>`;
  }).join('');
}

// --- Static SVG ---

function drawStaticSVG() {
  const svg = document.getElementById('flow-svg');

  // Background connections (faint lines)
  const connections = [];

  // CB → Banks
  NODES.banks.forEach(b => {
    connections.push({ x1: NODES.consumer.x, y1: NODES.consumer.y, x2: b.x, y2: b.y });
  });
  // Banks → Producers (each bank → 2 producers)
  NODES.banks.forEach((b, bi) => {
    const pRange = bi === 0 ? [0, 1] : bi === 1 ? [2, 3] : [4, 5];
    pRange.forEach(pi => {
      connections.push({ x1: b.x, y1: b.y, x2: NODES.producers[pi].x, y2: NODES.producers[pi].y });
    });
  });
  // Asset owners → Banks
  NODES.assetOwners.forEach((ao, i) => {
    NODES.banks.forEach(b => {
      connections.push({ x1: ao.x, y1: ao.y, x2: b.x, y2: b.y });
    });
  });
  // Producers → Asset owners
  NODES.producers.forEach(p => {
    NODES.assetOwners.forEach(ao => {
      connections.push({ x1: p.x, y1: p.y, x2: ao.x, y2: ao.y });
    });
  });
  // Consumer → Producers
  NODES.producers.forEach(p => {
    connections.push({ x1: NODES.consumer.x, y1: NODES.consumer.y, x2: p.x, y2: p.y });
  });

  const lines = connections.map(c =>
    `<line x1="${c.x1}" y1="${c.y1}" x2="${c.x2}" y2="${c.y2}" stroke="#ffffff" stroke-width="0.5" stroke-opacity="0.07"/>`
  ).join('');

  // Node circles
  const BANK_COLORS  = ['#3b82f6', '#22c55e', '#a78bfa'];
  const AO_COLOR     = '#f59e0b';
  const PROD_COLOR   = '#94a3b8';
  const CONS_COLOR   = '#f0c040';

  const nodeCircles = [
    // Consumer pot
    `<circle cx="${NODES.consumer.x}" cy="${NODES.consumer.y}" r="20" fill="#1e2a3a" stroke="${CONS_COLOR}" stroke-width="2"/>
     <text x="${NODES.consumer.x}" y="${NODES.consumer.y - 3}" fill="${CONS_COLOR}" font-size="7" text-anchor="middle" font-weight="bold">CONSUMER</text>
     <text x="${NODES.consumer.x}" y="${NODES.consumer.y + 7}" fill="${CONS_COLOR}" font-size="6.5" text-anchor="middle">POT</text>`,

    // Banks
    ...NODES.banks.map((b, i) =>
      `<circle cx="${b.x}" cy="${b.y}" r="18" fill="#1e2a3a" stroke="${BANK_COLORS[i]}" stroke-width="2"/>
       <text x="${b.x}" y="${b.y - 2}" fill="${BANK_COLORS[i]}" font-size="7" text-anchor="middle" font-weight="bold">${['ALPHA','BETA','GAMMA'][i]}</text>
       <text x="${b.x}" y="${b.y + 8}" fill="${BANK_COLORS[i]}" font-size="6" text-anchor="middle">BANK</text>`
    ),

    // Asset owners
    ...NODES.assetOwners.map((ao, i) =>
      `<rect x="${ao.x - 20}" y="${ao.y - 12}" width="40" height="24" rx="4" fill="#1e2a3a" stroke="${AO_COLOR}" stroke-width="1.5"/>
       <text x="${ao.x}" y="${ao.y - 1}" fill="${AO_COLOR}" font-size="6.5" text-anchor="middle" font-weight="bold">${['MILLER','SWEET','DAIRY'][i]}</text>
       <text x="${ao.x}" y="${ao.y + 9}" fill="${AO_COLOR}" font-size="6" text-anchor="middle">& Co</text>`
    ),

    // Producers
    ...NODES.producers.map((p, i) =>
      `<rect x="${p.x - 16}" y="${p.y - 10}" width="32" height="20" rx="3" fill="#1e2a3a" stroke="${PROD_COLOR}" stroke-width="1.5"/>
       <text x="${p.x}" y="${p.y + 4}" fill="${PROD_COLOR}" font-size="7" text-anchor="middle" font-weight="bold">B${i + 1}</text>`
    ),
  ].join('');

  svg.innerHTML = lines + nodeCircles;
}

// --- Token animation ---

function nodePos(ref) {
  if (ref.type === 'consumer' || ref.type === 'cb') return NODES.consumer;
  if (ref.type === 'bank')        return NODES.banks[ref.id];
  if (ref.type === 'assetOwner')  return NODES.assetOwners[ref.id];
  if (ref.type === 'producer')    return NODES.producers[ref.id];
  return NODES.consumer;
}

function animateTransactions(txList) {
  return new Promise(resolve => {
    if (txList.length === 0) { resolve(); return; }
    animateNext(txList, 0, resolve);
  });
}

function animateNext(txList, idx, done) {
  if (idx >= txList.length) { done(); return; }

  const tx   = txList[idx];
  const dur  = Math.round(700 / animSpeed);
  const gap  = Math.round(200 / animSpeed);

  animateToken(tx, dur, () => {
    setTimeout(() => animateNext(txList, idx + 1, done), gap);
  });
}

function animateToken(tx, durationMs, onEnd) {
  const svg   = document.getElementById('flow-svg');
  const from  = nodePos(tx.from);
  const to    = nodePos(tx.to);
  const color = TOKEN_COLORS[tx.type] || '#fff';

  // Quadratic bezier control point — offset perpendicular to the midpoint
  const mx  = (from.x + to.x) / 2;
  const my  = (from.y + to.y) / 2;
  const dx  = to.x - from.x;
  const dy  = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const cpx = mx - (dy / len) * 45;
  const cpy = my + (dx / len) * 45;

  // Build bezier lookup table
  const STEPS = 40;
  const bx = [], by = [];
  for (let s = 0; s <= STEPS; s++) {
    const t = s / STEPS;
    const u = 1 - t;
    bx.push(u * u * from.x + 2 * u * t * cpx + t * t * to.x);
    by.push(u * u * from.y + 2 * u * t * cpy + t * t * to.y);
  }

  // SVG elements
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('r', '10');
  circle.setAttribute('fill', color);
  circle.setAttribute('fill-opacity', '0.92');
  circle.setAttribute('cx', from.x);
  circle.setAttribute('cy', from.y);

  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  label.setAttribute('text-anchor', 'middle');
  label.setAttribute('font-size', '8');
  label.setAttribute('fill', '#fff');
  label.setAttribute('font-weight', 'bold');
  label.setAttribute('x', from.x);
  label.setAttribute('y', from.y + 4);
  label.textContent = tx.amount > 999 ? `${(tx.amount / 1000).toFixed(1)}k` : Math.round(tx.amount);

  svg.appendChild(circle);
  svg.appendChild(label);

  let pulsed = false;
  const start = performance.now();

  function step(now) {
    const t01 = Math.min(1, (now - start) / durationMs);
    // ease in-out cubic
    const e = t01 < 0.5 ? 4 * t01 ** 3 : 1 - (-2 * t01 + 2) ** 3 / 2;
    const idx = Math.min(STEPS, Math.round(e * STEPS));
    const x = bx[idx], y = by[idx];

    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    label.setAttribute('x', x);
    label.setAttribute('y', y + 4);

    if (t01 >= 0.85 && !pulsed) {
      pulsed = true;
      pulseNode(tx.to, color);
      renderAll();
    }

    if (t01 < 1) {
      requestAnimationFrame(step);
    } else {
      svg.removeChild(circle);
      svg.removeChild(label);
      if (onEnd) onEnd();
    }
  }

  requestAnimationFrame(step);
}

function pulseNode(ref, color) {
  const svg = document.getElementById('flow-svg');
  const pos = nodePos(ref);

  const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  ring.setAttribute('cx', pos.x);
  ring.setAttribute('cy', pos.y);
  ring.setAttribute('r', '16');
  ring.setAttribute('fill', 'none');
  ring.setAttribute('stroke', color);
  ring.setAttribute('stroke-width', '3');
  svg.appendChild(ring);

  const startTime = performance.now();
  const dur = 380;

  function expand(now) {
    const t = Math.min(1, (now - startTime) / dur);
    ring.setAttribute('r', 16 + t * 22);
    ring.setAttribute('stroke-opacity', (1 - t) * 0.9);
    if (t < 1) requestAnimationFrame(expand);
    else try { svg.removeChild(ring); } catch (_) {}
  }

  requestAnimationFrame(expand);
}
