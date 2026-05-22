document.addEventListener("DOMContentLoaded", function () {
  const canvas        = document.getElementById("canvas");
  const ctx           = canvas.getContext("2d");
  const canvasArea    = document.getElementById("canvasArea");
  const sidebar       = document.getElementById("sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");

  const modeSelect          = document.getElementById("modeSelect");
  const blueProbInput       = document.getElementById("blueProbability");
  const blueProbDisplay     = document.getElementById("blueProbDisplay");
  const blueProbContainer   = document.getElementById("blueProbabilityContainer");
  const iterationsInput     = document.getElementById("iterations");
  const fractionInput       = document.getElementById("fraction");
  const fractionDisplay     = document.getElementById("fractionDisplay");
  const drawTracesCheckbox  = document.getElementById("drawTraces");
  const colorPointsCheckbox = document.getElementById("colorPoints");
  const showLabelsCheckbox  = document.getElementById("showLabels");
  const exclusionSelect     = document.getElementById("exclusionRule");
  const startButton         = document.getElementById("startButton");
  const resetSimButton      = document.getElementById("resetSimulationButton");
  const resetAllButton      = document.getElementById("resetAllButton");
  const exportButton        = document.getElementById("exportButton");
  const statusMsg           = document.getElementById("statusMessage");
  const colorPaletteEl      = document.getElementById("colorPalette");
  const vertexColorSection  = document.getElementById("vertexColorSection");

  // ── Palette ───────────────────────────────────────────────
  const PALETTE = [
    { name: "Red",    hex: "#ef4444" },
    { name: "Blue",   hex: "#60a5fa" },
    { name: "Green",  hex: "#4ade80" },
    { name: "Orange", hex: "#fb923c" },
    { name: "Purple", hex: "#c084fc" },
    { name: "Yellow", hex: "#fde047" },
    { name: "Pink",   hex: "#f472b6" },
    { name: "Teal",   hex: "#2dd4bf" },
  ];

  let selectedColorIndex = 0;

  function buildPalette(indices) {
    colorPaletteEl.innerHTML = "";
    if (!indices.includes(selectedColorIndex)) selectedColorIndex = indices[0];
    indices.forEach(i => {
      const s = document.createElement("button");
      s.className = "color-swatch" + (i === selectedColorIndex ? " selected" : "");
      s.style.background = PALETTE[i].hex;
      s.title = PALETTE[i].name;
      s.dataset.index = i;
      s.addEventListener("click", () => {
        selectedColorIndex = i;
        colorPaletteEl.querySelectorAll(".color-swatch").forEach(el =>
          el.classList.toggle("selected", parseInt(el.dataset.index) === i)
        );
      });
      colorPaletteEl.appendChild(s);
    });
  }

  // ── State ─────────────────────────────────────────────────
  let vertices         = [];
  let running          = false;
  let animFrameId      = null;
  let lastVertexIndex  = -1;
  let iterationCount   = 0;
  let totalIterations  = 0;
  let currentPoint     = null;

  // ── Canvas sizing ─────────────────────────────────────────
  function resizeCanvas() {
    if (running) return;
    const w = canvasArea.clientWidth;
    const h = canvasArea.clientHeight;
    const newSize = Math.max(Math.min(w, h) - 24, 200);
    if (vertices.length > 0 && canvas.width > 0) {
      const scale = newSize / canvas.width;
      vertices = vertices.map(v => ({ ...v, x: v.x * scale, y: v.y * scale }));
    }
    canvas.width  = newSize;
    canvas.height = newSize;
    redrawAll();
  }

  window.addEventListener("resize", resizeCanvas);

  // ── Mode UI ───────────────────────────────────────────────
  function updateModeUI() {
    const mode = modeSelect.value;
    blueProbContainer.style.display = mode === "redBlue" ? "block" : "none";
    if (mode === "redOnly") {
      vertexColorSection.style.display = "none";
    } else if (mode === "redBlue") {
      vertexColorSection.style.display = "block";
      buildPalette([0, 1]);
    } else {
      vertexColorSection.style.display = "block";
      buildPalette([0, 1, 2, 3, 4, 5, 6, 7]);
    }
  }

  modeSelect.addEventListener("change", updateModeUI);

  fractionInput.addEventListener("input", () =>
    fractionDisplay.textContent = parseFloat(fractionInput.value).toFixed(2)
  );
  blueProbInput.addEventListener("input", () =>
    blueProbDisplay.textContent = parseFloat(blueProbInput.value).toFixed(2)
  );

  // ── Mobile sidebar ────────────────────────────────────────
  mobileMenuBtn.addEventListener("click", () => {
    sidebar.classList.add("open");
    sidebarOverlay.classList.add("visible");
  });
  sidebarOverlay.addEventListener("click", () => {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("visible");
  });

  // ── Presets ───────────────────────────────────────────────
  const PRESET_COUNTS = { triangle: 3, square: 4, pentagon: 5, hexagon: 6 };

  function getPresetVertices(shape) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r  = canvas.width * 0.4;
    const n  = PRESET_COUNTS[shape] || 3;
    return Array.from({ length: n }, (_, i) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
      return {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
        color: PALETTE[i % PALETTE.length].hex,
      };
    });
  }

  function loadPreset(shape) {
    stopSimulation();
    vertices = getPresetVertices(shape);
    statusMsg.textContent = "";
    redrawAll();
  }

  document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      loadPreset(btn.dataset.shape);
      document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // ── Canvas click ──────────────────────────────────────────
  canvas.addEventListener("click", function (e) {
    if (running) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top)  * scaleY;
    const color = modeSelect.value === "redOnly"
      ? PALETTE[0].hex
      : PALETTE[selectedColorIndex].hex;
    vertices.push({ x, y, color });
    redrawAll();
    document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
  });

  // ── Drawing ───────────────────────────────────────────────
  function getCentroid() {
    if (vertices.length === 0) return { x: canvas.width / 2, y: canvas.height / 2 };
    return {
      x: vertices.reduce((s, v) => s + v.x, 0) / vertices.length,
      y: vertices.reduce((s, v) => s + v.y, 0) / vertices.length,
    };
  }

  function drawVertices() {
    const showLabels = showLabelsCheckbox.checked;
    const centroid   = getCentroid();

    vertices.forEach((v, i) => {
      ctx.fillStyle = v.color;
      ctx.beginPath();
      ctx.arc(v.x, v.y, 5, 0, Math.PI * 2);
      ctx.fill();

      if (showLabels) {
        const dx  = v.x - centroid.x;
        const dy  = v.y - centroid.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        let lx, ly;
        if (len < 2) {
          lx = v.x + 14;
          ly = v.y - 10;
        } else {
          const off = 16 / len;
          lx = v.x + dx * off;
          ly = v.y + dy * off;
        }
        ctx.font         = "bold 11px system-ui, sans-serif";
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle    = "rgba(255,255,255,0.88)";
        ctx.fillText(String(i + 1), lx, ly);
      }
    });
  }

  function redrawAll() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawVertices();
  }

  showLabelsCheckbox.addEventListener("change", redrawAll);

  // ── Simulation ────────────────────────────────────────────
  function pickTarget() {
    const n         = vertices.length;
    let candidates  = Array.from({ length: n }, (_, i) => i);
    const exclusion = exclusionSelect.value;

    if (lastVertexIndex !== -1 && candidates.length > 1) {
      if (exclusion === "noRepeat") {
        candidates = candidates.filter(i => i !== lastVertexIndex);
      } else if (exclusion === "noAdjacent") {
        const prev = (lastVertexIndex - 1 + n) % n;
        const next = (lastVertexIndex + 1) % n;
        const ex   = new Set([lastVertexIndex, prev, next]);
        const f    = candidates.filter(i => !ex.has(i));
        if (f.length > 0) candidates = f;
      }
    }

    const mode = modeSelect.value;
    if (mode === "redBlue") {
      const wantBlue = Math.random() < parseFloat(blueProbInput.value);
      const target   = wantBlue ? PALETTE[1].hex : PALETTE[0].hex;
      const f        = candidates.filter(i => vertices[i].color === target);
      if (f.length > 0) candidates = f;
    }

    const idx = candidates[Math.floor(Math.random() * candidates.length)];
    lastVertexIndex = idx;
    return vertices[idx];
  }

  const BATCH = 600;

  function simulationLoop() {
    if (!running) return;
    const fraction    = parseFloat(fractionInput.value);
    const drawTraces  = drawTracesCheckbox.checked;
    const colorPoints = colorPointsCheckbox.checked;

    for (let i = 0; i < BATCH && iterationCount < totalIterations; i++) {
      const t    = pickTarget();
      const newX = currentPoint.x + fraction * (t.x - currentPoint.x);
      const newY = currentPoint.y + fraction * (t.y - currentPoint.y);

      if (drawTraces) {
        ctx.strokeStyle = "rgba(180,180,180,0.12)";
        ctx.beginPath();
        ctx.moveTo(currentPoint.x, currentPoint.y);
        ctx.lineTo(newX, newY);
        ctx.stroke();
      }

      ctx.fillStyle = colorPoints ? t.color : "#fff";
      ctx.fillRect(newX, newY, 1, 1);

      currentPoint = { x: newX, y: newY };
      iterationCount++;
    }

    if (iterationCount % 6000 < BATCH) {
      statusMsg.textContent = `${iterationCount.toLocaleString()} / ${totalIterations.toLocaleString()}`;
    }

    if (iterationCount >= totalIterations) {
      running     = false;
      animFrameId = null;
      setControls(true);
      statusMsg.textContent = `Done — ${totalIterations.toLocaleString()} iterations`;
      drawVertices(); // re-stamp labels on top
    } else {
      animFrameId = requestAnimationFrame(simulationLoop);
    }
  }

  function startChaosGame() {
    if (vertices.length < 3) {
      statusMsg.textContent = "Place at least 3 vertices first.";
      return;
    }
    totalIterations = parseInt(iterationsInput.value);
    if (isNaN(totalIterations) || totalIterations < 100) {
      statusMsg.textContent = "Invalid iteration count.";
      return;
    }
    running        = true;
    iterationCount = 0;
    lastVertexIndex = -1;
    currentPoint   = { ...vertices[Math.floor(Math.random() * vertices.length)] };
    setControls(false);
    statusMsg.textContent = "Running...";
    animFrameId = requestAnimationFrame(simulationLoop);
  }

  function stopSimulation() {
    if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
    running = false;
    setControls(true);
  }

  function setControls(enabled) {
    startButton.disabled   = !enabled;
    resetSimButton.disabled = !enabled;
    resetAllButton.disabled = !enabled;
  }

  startButton.addEventListener("click", startChaosGame);

  resetSimButton.addEventListener("click", () => {
    stopSimulation();
    redrawAll();
    statusMsg.textContent = "";
  });

  resetAllButton.addEventListener("click", () => {
    stopSimulation();
    vertices = [];
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
    statusMsg.textContent = "";
  });

  // ── Export ────────────────────────────────────────────────
  exportButton.addEventListener("click", () => {
    const out = document.createElement("canvas");
    out.width  = canvas.width;
    out.height = canvas.height;
    const octx = out.getContext("2d");
    octx.fillStyle = "#000";
    octx.fillRect(0, 0, out.width, out.height);
    octx.drawImage(canvas, 0, 0);
    const a = document.createElement("a");
    a.download = "chaos-game.png";
    a.href     = out.toDataURL("image/png");
    a.click();
  });

  // ── Init ──────────────────────────────────────────────────
  updateModeUI();
  requestAnimationFrame(() => {
    resizeCanvas();
    loadPreset("triangle");
    document.querySelector(".preset-btn[data-shape='triangle']").classList.add("active");
  });
});
