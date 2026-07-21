// script.js

window.addEventListener("load", () => {

  // ---------- DOM ----------
  const pickerScreen   = document.getElementById("picker-screen");
  const gameScreen     = document.getElementById("game-screen");
  const userBar        = document.getElementById("user-bar");
  const tierGroup      = document.getElementById("tier-group");
  const modeGroup      = document.getElementById("mode-group");
  const playBtn        = document.getElementById("play-btn");
  const backBtn        = document.getElementById("back-btn");
  const gameTitle      = document.getElementById("game-title");
  const starCountEl    = document.getElementById("star-count");
  const muteBtn        = document.getElementById("mute-btn");
  const message        = document.getElementById("message");

  const orderBoard = document.getElementById("order-board");
  const matchBoard = document.getElementById("match-board");
  const buildBoard = document.getElementById("build-board");

  const fractionContainer  = document.getElementById("fraction-container");
  const checkPizzasButton  = document.getElementById("checkPizzasButton");
  const checkAnswersButton = document.getElementById("checkAnswersButton");
  const progressRow        = document.getElementById("progressRow");

  const matchGrid = document.getElementById("match-grid");

  const buildPizza     = document.getElementById("build-pizza");
  const buildTargetEl  = document.getElementById("build-target");
  const checkBuildBtn  = document.getElementById("checkBuildButton");

  const winScreen   = document.getElementById("win-screen");
  const winText     = document.getElementById("win-text");
  const winAgainBtn = document.getElementById("win-again-btn");
  const winMenuBtn  = document.getElementById("win-menu-btn");

  const userDialog   = document.getElementById("user-dialog");
  const userNameIn   = document.getElementById("user-name");
  const iconGrid     = document.getElementById("icon-grid");
  const userSaveBtn  = document.getElementById("user-save");
  const userCancelBtn = document.getElementById("user-cancel");

  const mascotEl = document.getElementById("mascot");
  const buntingEl = document.getElementById("bunting");
  const titleEl = document.getElementById("title");

  // ---------- audio ----------
  let audioCtx = null;
  let muted = localStorage.getItem("fractions-muted") === "1";
  function ensureAudio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
    }
  }
  function tone(freqFrom, freqTo, duration, type, volume, when = 0) {
    if (muted || !audioCtx) return;
    const t0 = audioCtx.currentTime + when;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqTo, 1), t0 + duration);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }
  const sfx = {
    correct: () => { tone(880, 880, 0.09, "sine", 0.22); tone(1320, 1320, 0.16, "sine", 0.2, 0.07); },
    wrong: () => tone(220, 150, 0.18, "sawtooth", 0.16),
    match: () => { tone(520, 880, 0.12, "sine", 0.22); tone(780, 1240, 0.14, "sine", 0.18, 0.08); },
    tap: () => tone(500, 620, 0.06, "triangle", 0.14),
    fanfare: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.18, "triangle", 0.22, i * 0.13)); },
  };
  function updateMuteBtn() {
    muteBtn.textContent = muted ? "🔇" : "🔊";
  }
  muteBtn.addEventListener("click", () => {
    ensureAudio();
    muted = !muted;
    localStorage.setItem("fractions-muted", muted ? "1" : "0");
    updateMuteBtn();
  });
  updateMuteBtn();

  // ---------- players (local profiles, same pattern as typurr) ----------
  const ICON_CHOICES = ["🐱","🐶","🦊","🐰","🐼","🦁","🐯","🐸","🐵","🦄","🐧","🐨","🐢","🐙"];
  let users = [];
  try { users = JSON.parse(localStorage.getItem("fractions-users") || "[]"); } catch (e) { users = []; }
  let currentUserId = localStorage.getItem("fractions-current") || "guest";

  function ukey(suffix) {
    return currentUserId === "guest" ? `fractions-${suffix}` : `fractions-u-${currentUserId}-${suffix}`;
  }

  function currentPlayer() {
    if (currentUserId === "guest") return { id: "guest", name: "Everyone", icon: "🌈" };
    return users.find(u => u.id === currentUserId) || { id: "guest", name: "Everyone", icon: "🌈" };
  }

  function renderUserBar() {
    const all = [{ id: "guest", name: "Everyone", icon: "🌈" }, ...users];
    let html = all.map(u =>
      `<button class="user-chip${u.id === currentUserId ? " selected" : ""}" data-id="${u.id}">
        <span class="uc-icon">${u.icon}</span><span class="uc-name">${u.name}</span></button>`
    ).join("");
    html += `<button class="user-chip add" id="add-user-chip"><span class="uc-icon">＋</span><span class="uc-name">New</span></button>`;
    userBar.innerHTML = html;
    userBar.querySelectorAll(".user-chip[data-id]").forEach(btn => {
      btn.addEventListener("click", () => switchUser(btn.dataset.id));
    });
    document.getElementById("add-user-chip").addEventListener("click", openUserDialog);
  }

  function switchUser(id) {
    currentUserId = id;
    localStorage.setItem("fractions-current", id);
    renderUserBar();
    loadTierAndMode();
    updateStarCount();
  }

  let pendingIcon = ICON_CHOICES[0];
  function openUserDialog() {
    pendingIcon = ICON_CHOICES[0];
    userNameIn.value = "";
    iconGrid.innerHTML = ICON_CHOICES.map((ic, i) =>
      `<button class="icon-opt${i === 0 ? " selected" : ""}" data-icon="${ic}">${ic}</button>`
    ).join("");
    iconGrid.querySelectorAll(".icon-opt").forEach(btn => {
      btn.addEventListener("click", () => {
        pendingIcon = btn.dataset.icon;
        iconGrid.querySelectorAll(".icon-opt").forEach(b => b.classList.toggle("selected", b === btn));
      });
    });
    userDialog.classList.remove("hidden");
    setTimeout(() => userNameIn.focus(), 50);
  }
  function closeUserDialog() { userDialog.classList.add("hidden"); }
  function addUser() {
    const name = userNameIn.value.trim().slice(0, 12) || "Player";
    const id = "u" + Date.now();
    users.push({ id, name, icon: pendingIcon });
    localStorage.setItem("fractions-users", JSON.stringify(users));
    closeUserDialog();
    switchUser(id);
  }
  userSaveBtn.addEventListener("click", addUser);
  userCancelBtn.addEventListener("click", closeUserDialog);
  userNameIn.addEventListener("keydown", (e) => { if (e.key === "Enter") addUser(); });

  // ---------- tier / mode selection ----------
  let tier = "A";
  let mode = "order";

  function loadTierAndMode() {
    tier = localStorage.getItem(ukey("tier")) || "A";
    mode = localStorage.getItem(ukey("mode")) || "order";
    renderTierMode();
  }
  function renderTierMode() {
    tierGroup.querySelectorAll(".pill-btn").forEach(b => b.classList.toggle("selected", b.dataset.tier === tier));
    modeGroup.querySelectorAll(".mode-card").forEach(b => b.classList.toggle("selected", b.dataset.mode === mode));
  }
  tierGroup.querySelectorAll(".pill-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      tier = btn.dataset.tier;
      localStorage.setItem(ukey("tier"), tier);
      renderTierMode();
    });
  });
  modeGroup.querySelectorAll(".mode-card").forEach(btn => {
    btn.addEventListener("click", () => {
      mode = btn.dataset.mode;
      localStorage.setItem(ukey("mode"), mode);
      renderTierMode();
    });
  });

  function updateStarCount() {
    const stars = parseInt(localStorage.getItem(ukey(`stars-${mode}-${tier}`)) || "0", 10);
    starCountEl.textContent = `⭐ ${stars}`;
  }
  function awardStar() {
    const key = ukey(`stars-${mode}-${tier}`);
    const stars = parseInt(localStorage.getItem(key) || "0", 10) + 1;
    localStorage.setItem(key, String(stars));
    updateStarCount();
  }

  // ---------- fraction helpers ----------
  function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }
  function fractionValue(fr) {
    const [num, den] = fr.split("/").map(Number);
    return num / den;
  }
  function reducedKey(num, den) {
    const g = gcd(num, den);
    return `${num / g}/${den / g}`;
  }

  const TIER_CFG = {
    A: { minDen: 2, maxDen: 4,  showPizza: true,  matchPairs: 3, buildRounds: 3, matchMaxDen: 6,  buildMaxDen: 6,  showPizzaMatch: true },
    B: { minDen: 2, maxDen: 6,  showPizza: false, matchPairs: 4, buildRounds: 4, matchMaxDen: 9,  buildMaxDen: 8,  showPizzaMatch: true },
    C: { minDen: 2, maxDen: 10, showPizza: false, matchPairs: 5, buildRounds: 5, matchMaxDen: 12, buildMaxDen: 10, showPizzaMatch: false },
  };

  // Pick a column count that evenly divides `n`, closest to a square layout,
  // so the match grid is always a clean rectangle (never a ragged last row).
  function gridCols(n) {
    let best = n;
    for (let c = 1; c <= n; c++) {
      if (n % c !== 0) continue;
      if (Math.abs(c - Math.sqrt(n)) < Math.abs(best - Math.sqrt(n))) best = c;
    }
    return Math.max(best, n / best); // wider than tall (or square)
  }

  function getRandomFractions(count, cfg) {
    const seen = new Set();
    const out = [];
    let guard = 0;
    while (out.length < count && guard < 500) {
      guard++;
      const den = Math.floor(Math.random() * (cfg.maxDen - cfg.minDen + 1)) + cfg.minDen;
      const num = Math.floor(Math.random() * den) + 1;
      const key = reducedKey(num, den);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(`${num}/${den}`);
    }
    // Tier C: occasionally add a deliberate equivalent-value pair as a teaching moment
    if (tier === "C" && out.length >= 2 && Math.random() < 0.4) {
      const baseIdx = Math.floor(Math.random() * out.length);
      const [num, den] = out[baseIdx].split("/").map(Number);
      const k = den * 2 <= 12 ? 2 : null;
      if (k) {
        const twin = `${num * k}/${den * k}`;
        const otherIdx = (baseIdx + 1) % out.length;
        out[otherIdx] = twin;
      }
    }
    return out;
  }

  // ---------- screen nav ----------
  function showPicker() {
    pickerScreen.classList.remove("hidden");
    gameScreen.classList.add("hidden");
    winScreen.classList.add("hidden");
  }
  function showGame() {
    ensureAudio();
    pickerScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    orderBoard.classList.add("hidden");
    matchBoard.classList.add("hidden");
    buildBoard.classList.add("hidden");
    message.textContent = "";
    updateStarCount();
    const modeNames = { order: "Order the Pizzas", match: "Match the Equivalents", build: "Build the Fraction" };
    gameTitle.textContent = modeNames[mode];

    if (mode === "order") { orderBoard.classList.remove("hidden"); startOrderMode(); }
    if (mode === "match") { matchBoard.classList.remove("hidden"); startMatchMode(); }
    if (mode === "build") { buildBoard.classList.remove("hidden"); startBuildMode(); }
  }
  playBtn.addEventListener("click", showGame);
  backBtn.addEventListener("click", showPicker);

  function showWin(text) {
    sfx.fanfare();
    confettiBurst();
    mascotDance(true);
    winText.textContent = text;
    winScreen.classList.remove("hidden");
  }
  winAgainBtn.addEventListener("click", () => { winScreen.classList.add("hidden"); mascotDance(false); showGame(); });
  winMenuBtn.addEventListener("click", () => { winScreen.classList.add("hidden"); mascotDance(false); showPicker(); });

  function confettiBurst() {
    const colors = ["#ffd166", "#ff8fab", "#7cc46f", "#6ec5e9", "#e0573f", "#b89ae0"];
    for (let i = 0; i < 28; i++) {
      const c = document.createElement("div");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "%";
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = (Math.random() * 0.7) + "s";
      c.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 3500);
    }
  }

  // ---------- pizza artwork (SVG) ----------
  // Draw a round pizza cut into `den` slices. `on` is either a count (first N
  // slices topped) or a boolean array (per-slice, for Build mode).
  function pizzaSVG(den, on, size = "100%") {
    const cx = 50, cy = 50, r = 42;
    const onArr = Array.isArray(on) ? on : Array.from({ length: den }, (_, i) => i < on);
    const P = (a) => {
      const rad = (a * Math.PI) / 180;
      return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)];
    };
    let wedges = "", pep = "", lines = "";
    for (let i = 0; i < den; i++) {
      const a0 = (i * 360) / den, a1 = ((i + 1) * 360) / den;
      const [x0, y0] = P(a0), [x1, y1] = P(a1);
      const large = a1 - a0 > 180 ? 1 : 0;
      const d = `M${cx},${cy} L${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`;
      wedges += `<path class="slice ${onArr[i] ? "on" : "off"}" d="${d}"/>`;
      if (onArr[i]) {
        const rad = (((a0 + a1) / 2) * Math.PI) / 180;
        const dot = (pr, rr) => {
          const px = cx + rr * Math.sin(rad), py = cy - rr * Math.cos(rad);
          pep += `<circle class="pep-b" cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="${pr.toFixed(2)}"/>` +
                 `<circle class="pep-t" cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="${(pr * 0.62).toFixed(2)}"/>`;
        };
        dot(Math.max(2.4, r * 0.12), r * 0.6);
        if (den <= 6) dot(Math.max(1.9, r * 0.09), r * 0.28);
      }
    }
    for (let i = 0; i < den; i++) {
      const [x, y] = P((i * 360) / den);
      lines += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}" class="slice-line"/>`;
    }
    return `<svg class="pizza-svg" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">` +
      `<circle cx="${cx}" cy="${cy}" r="46" class="crust"/>${wedges}${pep}${lines}` +
      `<circle cx="${cx}" cy="${cy}" r="46" class="crust-ring"/></svg>`;
  }

  function mysteryPizzaSVG(size = "100%") {
    return `<svg class="pizza-svg" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">` +
      `<circle cx="50" cy="50" r="46" class="crust"/>` +
      `<circle cx="50" cy="50" r="42" class="mystery"/>` +
      `<text x="50" y="65" text-anchor="middle" class="mystery-q">?</text></svg>`;
  }

  // ---------- celebration effects ----------
  function starPopAt(x, y) {
    const s = document.createElement("div");
    s.className = "star-pop";
    s.textContent = "⭐";
    s.style.left = x + "px";
    s.style.top = y + "px";
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1400);
  }
  function sparkleBurst(x, y) {
    const colors = ["#fff", "#ffd166", "#ff8fab"];
    for (let i = 0; i < 8; i++) {
      const s = document.createElement("div");
      s.className = "spark";
      s.style.left = (x + (Math.random() - 0.5) * 90) + "px";
      s.style.top = (y + (Math.random() - 0.5) * 70) + "px";
      s.style.background = colors[i % colors.length];
      s.style.animationDelay = (Math.random() * 0.15) + "s";
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 850);
    }
  }
  // small "well done" burst near the top-centre of the play area
  function cheer() {
    const x = window.innerWidth / 2;
    const y = window.innerHeight * 0.34;
    starPopAt(x, y);
    sparkleBurst(x, y);
  }

  // ---------- Mr. Pizza reactions ----------
  function mascotNom() {
    mascotEl.classList.remove("nom");
    void mascotEl.offsetWidth;
    mascotEl.classList.add("nom");
  }
  function mascotDance(on) {
    mascotEl.classList.toggle("dancing", on);
  }

  // ==================================================================
  // MODE 1: ORDER THE PIZZAS
  // ==================================================================
  let orderFractions = [];
  let progressSteps = 0;

  function initProgressRow() {
    progressRow.innerHTML = "";
    for (let i = 0; i < 6; i++) {
      const pip = document.createElement("span");
      pip.className = "prog-pip";
      pip.textContent = "🍕";
      progressRow.appendChild(pip);
    }
    progressSteps = 0;
  }

  function startOrderMode() {
    message.textContent = "";
    initProgressRow();
    const cfg = TIER_CFG[tier];
    checkPizzasButton.classList.toggle("hidden", cfg.showPizza);
    checkPizzasButton.disabled = false;
    checkAnswersButton.classList.remove("hidden");
    buildOrderRound(cfg);
  }

  function buildOrderRound(cfg) {
    fractionContainer.innerHTML = "";
    orderFractions = getRandomFractions(5, cfg);
    orderFractions.forEach(fr => fractionContainer.appendChild(createFractionCard(fr, cfg)));
    initPointerDrag(fractionContainer);
    if (!cfg.showPizza) checkPizzasButton.disabled = false;
  }

  function createFractionCard(fr, cfg) {
    const card = document.createElement("div");
    card.classList.add("fraction-card");

    const pizza = document.createElement("div");
    pizza.classList.add("pizza");
    if (cfg.showPizza) {
      setPizzaBackground(pizza, fr);
    } else {
      pizza.innerHTML = mysteryPizzaSVG();
    }

    const label = document.createElement("div");
    label.classList.add("fraction-label");
    label.textContent = fr;

    card.appendChild(pizza);
    card.appendChild(label);
    return card;
  }

  function setPizzaBackground(pizzaElement, fractionStr) {
    const [num, den] = fractionStr.split("/").map(Number);
    pizzaElement.innerHTML = pizzaSVG(den, num);
  }

  checkPizzasButton.addEventListener("click", () => {
    const cfg = TIER_CFG[tier];
    if (cfg.showPizza) return;
    document.querySelectorAll(".fraction-card").forEach(card => {
      const fractionStr = card.querySelector(".fraction-label").textContent;
      setPizzaBackground(card.querySelector(".pizza"), fractionStr);
    });
    checkPizzasButton.disabled = true;
  });

  checkAnswersButton.addEventListener("click", checkOrder);

  function checkOrder() {
    const cards = [...document.querySelectorAll(".fraction-card")];
    cards.forEach(c => c.classList.remove("wrong"));
    const values = cards.map(card => fractionValue(card.querySelector(".fraction-label").textContent));

    let firstBadIdx = -1;
    let tieFound = false;
    for (let i = 0; i < values.length - 1; i++) {
      if (values[i] > values[i + 1]) { firstBadIdx = i; break; }
      if (values[i] === values[i + 1]) tieFound = true;
    }

    if (firstBadIdx === -1) {
      sfx.correct();
      cheer();
      mascotNom();
      updateProgressRow();
      message.textContent = tieFound
        ? "Correct! And nice spot, two of those pizzas are the same size!"
        : "Correct! Nice job ordering the pizzas.";
      message.style.color = "#3a8a3a";

      if (progressSteps >= 6) {
        awardStar();
        checkAnswersButton.disabled = true;
        checkPizzasButton.disabled = true;
        setTimeout(() => showWin("You ordered every pizza correctly!"), 500);
      } else {
        setTimeout(() => buildOrderRound(TIER_CFG[tier]), 700);
      }
    } else {
      sfx.wrong();
      cards[firstBadIdx].classList.add("wrong");
      cards[firstBadIdx + 1].classList.add("wrong");
      message.textContent = "Not quite! Look at the two glowing pizzas, one of them is in the wrong place.";
      message.style.color = "#c0392b";
    }
  }

  function updateProgressRow() {
    if (progressSteps < 6) {
      const pip = progressRow.children[progressSteps];
      pip.textContent = "⭐";
      pip.classList.remove("done");
      void pip.offsetWidth;
      pip.classList.add("done");
      progressSteps++;
    }
  }

  // ---------- pointer-based drag & drop (mouse + touch, one code path) ----------
  function initPointerDrag(container) {
    let draggedCard = null;
    let placeholder = null;

    function endDrag(card) {
      if (draggedCard !== card) return;
      card.classList.remove("dragging");
      card.style.position = "";
      card.style.zIndex = "";
      card.style.left = "";
      card.style.top = "";
      card.style.pointerEvents = "";
      if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.insertBefore(card, placeholder);
        placeholder.remove();
      }
      draggedCard = null;
      placeholder = null;
    }

    // Fallback: if a pointerup/cancel is ever missed by the card itself (can
    // happen with synthetic or interrupted input), still release the drag.
    window.addEventListener("pointerup", () => { if (draggedCard) endDrag(draggedCard); });
    window.addEventListener("pointercancel", () => { if (draggedCard) endDrag(draggedCard); });

    container.querySelectorAll(".fraction-card").forEach(card => {
      card.addEventListener("pointerdown", (e) => {
        draggedCard = card;
        card.setPointerCapture(e.pointerId);
        card.classList.add("dragging");
        // Let elementFromPoint see the card underneath the dragged ghost.
        card.style.pointerEvents = "none";
        placeholder = document.createElement("div");
        placeholder.className = "fraction-card placeholder";
        placeholder.style.width = card.offsetWidth + "px";
        placeholder.style.height = card.offsetHeight + "px";
      });

      card.addEventListener("pointermove", (e) => {
        if (draggedCard !== card) return;
        card.style.position = "fixed";
        card.style.zIndex = "1000";
        card.style.left = e.clientX - card.offsetWidth / 2 + "px";
        card.style.top = e.clientY - card.offsetHeight / 2 + "px";

        const under = document.elementFromPoint(e.clientX, e.clientY);
        const target = under && under.closest(".fraction-card:not(.dragging)");
        if (target && container.contains(target)) {
          const bounding = target.getBoundingClientRect();
          const before = (e.clientX - bounding.left) < bounding.width / 2;
          container.insertBefore(placeholder, before ? target : target.nextSibling);
        }
      });

      card.addEventListener("pointerup", () => endDrag(card));
      card.addEventListener("pointercancel", () => endDrag(card));
    });
  }

  // ==================================================================
  // MODE 2: MATCH THE EQUIVALENTS
  // ==================================================================
  let matchFlipped = [];
  let matchFound = 0;
  let matchTotal = 0;
  let matchLocked = false;

  function generateEquivalentPair(maxDen, usedValues) {
    let guard = 0;
    while (guard < 300) {
      guard++;
      const den = Math.floor(Math.random() * 5) + 2; // 2..6 base
      const num = Math.floor(Math.random() * (den - 1)) + 1; // proper fraction
      const g = gcd(num, den);
      const bNum = num / g, bDen = den / g;
      const value = bNum / bDen;
      if (usedValues.has(value)) continue;
      const maxK = Math.floor(maxDen / bDen);
      if (maxK < 2) continue;
      const k = Math.floor(Math.random() * (maxK - 1)) + 2; // 2..maxK
      usedValues.add(value);
      return [`${bNum}/${bDen}`, `${bNum * k}/${bDen * k}`, value];
    }
    return null;
  }

  function startMatchMode() {
    const cfg = TIER_CFG[tier];
    matchFound = 0;
    matchLocked = false;
    matchFlipped = [];
    const usedValues = new Set();
    const cards = [];
    for (let i = 0; i < cfg.matchPairs; i++) {
      const pair = generateEquivalentPair(cfg.matchMaxDen, usedValues);
      if (!pair) continue;
      const [labelA, labelB, value] = pair;
      cards.push({ label: labelA, value, matched: false });
      cards.push({ label: labelB, value, matched: false });
    }
    matchTotal = cards.length / 2;
    // shuffle
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    matchGrid.innerHTML = "";
    matchGrid.style.setProperty("--cols", gridCols(cards.length));
    cards.forEach((cData, idx) => {
      const el = document.createElement("button");
      el.className = "match-card" + (cfg.showPizzaMatch ? "" : " numbers-only");
      el.dataset.idx = idx;
      el.innerHTML = cfg.showPizzaMatch
        ? `<div class="match-back">?</div><div class="match-front"><div class="pizza"></div><div class="fraction-label"></div></div>`
        : `<div class="match-back">?</div><div class="match-front"><div class="fraction-label"></div></div>`;
      if (cfg.showPizzaMatch) setPizzaBackground(el.querySelector(".pizza"), cData.label);
      el.querySelector(".fraction-label").textContent = cData.label;
      el.addEventListener("click", () => flipMatchCard(el, cData));
      matchGrid.appendChild(el);
    });
    message.textContent = `Find all ${matchTotal} matching pairs!`;
    message.style.color = "#333";
  }

  function flipMatchCard(el, cData) {
    if (matchLocked || cData.matched || el.classList.contains("flipped")) return;
    sfx.tap();
    el.classList.add("flipped");
    matchFlipped.push({ el, cData });

    if (matchFlipped.length === 2) {
      matchLocked = true;
      const [a, b] = matchFlipped;
      if (Math.abs(a.cData.value - b.cData.value) < 1e-9) {
        setTimeout(() => {
          sfx.match();
          sparkleBurst(window.innerWidth / 2, window.innerHeight * 0.4);
          a.el.classList.add("matched");
          b.el.classList.add("matched");
          a.cData.matched = true;
          b.cData.matched = true;
          matchFound++;
          matchFlipped = [];
          matchLocked = false;
          if (matchFound >= matchTotal) {
            awardStar();
            setTimeout(() => showWin("You matched every equivalent fraction!"), 300);
          } else {
            message.textContent = `Nice! ${matchFound} of ${matchTotal} pairs found.`;
            message.style.color = "#3a8a3a";
          }
        }, 400);
      } else {
        sfx.wrong();
        message.textContent = "Not the same amount, try another pair!";
        message.style.color = "#c0392b";
        setTimeout(() => {
          a.el.classList.remove("flipped");
          b.el.classList.remove("flipped");
          matchFlipped = [];
          matchLocked = false;
        }, 800);
      }
    }
  }

  // ==================================================================
  // MODE 3: BUILD THE FRACTION
  // ==================================================================
  let buildDen = 4, buildNum = 1, buildShaded = [];
  let buildRound = 0, buildTotal = 0;

  function startBuildMode() {
    const cfg = TIER_CFG[tier];
    buildRound = 0;
    buildTotal = cfg.buildRounds;
    nextBuildTarget();
  }

  function nextBuildTarget() {
    buildShaded = null; // set below once buildDen is known

    if (tier === "C") {
      // Show a reduced target (e.g. "1/3") but cut the pizza into a multiple
      // of that denominator (e.g. 6 or 12 slices), so the kid has to work
      // out the equivalent slice count herself instead of just counting.
      const tDen = Math.floor(Math.random() * 4) + 2; // 2..5
      const tNum = Math.floor(Math.random() * (tDen - 1)) + 1;
      const kOptions = [2, 3, 4].filter(k => tDen * k <= 12 && tDen * k !== tDen);
      const k = kOptions[Math.floor(Math.random() * kOptions.length)];
      buildDen = tDen * k;
      buildNum = tNum * k;
      buildTargetEl.textContent = `${tNum}/${tDen}`;
      message.textContent = `Round ${buildRound + 1} of ${buildTotal}: this pizza is cut into ${buildDen} slices. Shade ${tNum}/${tDen} of it!`;
    } else {
      // Tier A: simple halves/quarters/thirds. Tier B: a bit wider a range.
      const minDen = 2, maxDen = tier === "A" ? 4 : 6;
      buildDen = Math.floor(Math.random() * (maxDen - minDen + 1)) + minDen;
      buildNum = Math.floor(Math.random() * (buildDen - 1)) + 1;
      buildTargetEl.textContent = `${buildNum}/${buildDen}`;
      message.textContent = `Round ${buildRound + 1} of ${buildTotal}: shade ${buildNum} out of ${buildDen} slices.`;
    }

    buildShaded = new Array(buildDen).fill(false);
    message.style.color = "#333";
    drawBuildPizza();
  }

  function drawBuildPizza() {
    buildPizza.innerHTML = pizzaSVG(buildDen, buildShaded);
  }

  buildPizza.addEventListener("pointerdown", (e) => {
    const rect = buildPizza.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx, dy = e.clientY - cy;
    const radius = rect.width / 2;
    if (Math.hypot(dx, dy) > radius) return;
    const screenAngle = Math.atan2(dy, dx) * 180 / Math.PI;
    const topAngle = (screenAngle + 90 + 360) % 360;
    const idx = Math.min(buildDen - 1, Math.floor(topAngle / (360 / buildDen)));
    buildShaded[idx] = !buildShaded[idx];
    sfx.tap();
    drawBuildPizza();
  });

  checkBuildBtn.addEventListener("click", () => {
    const shadedCount = buildShaded.filter(Boolean).length;
    if (shadedCount === buildNum) {
      sfx.correct();
      cheer();
      mascotNom();
      buildRound++;
      message.textContent = "Correct! That's exactly the right amount.";
      message.style.color = "#3a8a3a";
      if (buildRound >= buildTotal) {
        awardStar();
        setTimeout(() => showWin("You built every fraction perfectly!"), 500);
      } else {
        setTimeout(() => nextBuildTarget(), 700);
      }
    } else {
      sfx.wrong();
      buildPizza.classList.add("wrong");
      setTimeout(() => buildPizza.classList.remove("wrong"), 400);
      message.textContent = shadedCount > buildNum ? "That's too many slices shaded, try again!" : "That's not quite enough slices, try again!";
      message.style.color = "#c0392b";
    }
  });

  // ---------- init ----------
  // Split only the letters into bouncing spans; keep the pizza emoji whole
  // (splitting by "" would break its surrogate pair into broken glyphs).
  titleEl.innerHTML = '<span style="animation-delay:0s">🍕</span> ' +
    "Pizza Fractions".split("").map((ch, i) =>
      ch === " " ? " " : `<span style="animation-delay:${((i + 1) * 0.06).toFixed(2)}s">${ch}</span>`
    ).join("");

  // Festive bunting across the top (Italian-festa colours)
  const flagColors = ["#e0573f", "#f7f3e8", "#7cbc60", "#ffd166"];
  for (let i = 0; i < 20; i++) {
    const f = document.createElement("div");
    f.className = "flag";
    f.style.background = flagColors[i % flagColors.length];
    f.style.animationDelay = (i * 0.12).toFixed(2) + "s";
    buntingEl.appendChild(f);
  }
  renderUserBar();
  loadTierAndMode();
  showPicker();
});
