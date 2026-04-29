/* ============================================================
   Inflation Tracker — app.js
   ============================================================ */

let DATA = null;
let selectedGroups = ["all_households"];
let selectedYears  = 1;
let viewMode       = "annual";   // "annual" | "index"
let lineChart      = null;
let barChart       = null;

// ── Boot ────────────────────────────────────────────────────

async function init() {
  DATA = await fetch("data/hlpi.json").then(r => r.json());
  buildGroupSelector();
  bindControls();
  bindQuiz();
  render();
}

// ── Group selector ──────────────────────────────────────────

function buildGroupSelector() {
  const standalone = document.getElementById("standalone-pills");
  const allHH = DATA.groups.find(g => g.id === "all_households");
  standalone.appendChild(makePill(allHH));

  ["demographic", "income", "expenditure"].forEach(category => {
    const container = document.getElementById(`pills-${category}`);
    DATA.groups
      .filter(g => g.category === category)
      .forEach(g => container.appendChild(makePill(g)));
  });

  document.querySelectorAll(".accordion-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.category;
      const content = document.getElementById(`pills-${cat}`);
      const open = content.classList.contains("open");
      content.classList.toggle("open", !open);
      btn.classList.toggle("open", !open);
    });
  });
}

function makePill(group) {
  const btn = document.createElement("button");
  btn.className = "group-pill";
  btn.dataset.id = group.id;
  btn.textContent = group.label;
  btn.style.setProperty("--pill-color", group.color);
  btn.style.setProperty("--pill-text-color", pillTextColor(group.color));
  if (selectedGroups.includes(group.id)) btn.classList.add("selected");
  btn.addEventListener("click", () => toggleGroup(group.id));
  return btn;
}

function pillTextColor(hex) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return (0.299*r + 0.587*g + 0.114*b) / 255 > 0.55 ? "#0f172a" : "#ffffff";
}

function toggleGroup(id) {
  if (selectedGroups.includes(id)) {
    if (selectedGroups.length === 1) return;
    selectedGroups = selectedGroups.filter(g => g !== id);
  } else {
    selectedGroups.push(id);
  }
  syncPillStates();
  render();
}

function syncPillStates() {
  document.querySelectorAll(".group-pill").forEach(btn => {
    btn.classList.toggle("selected", selectedGroups.includes(btn.dataset.id));
  });
}

// ── Controls ─────────────────────────────────────────────────

function bindControls() {
  document.querySelectorAll(".period-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".period-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedYears = parseInt(btn.dataset.years);
      render();
    });
  });

  document.querySelectorAll(".view-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".view-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      viewMode = btn.dataset.view;
      render();
    });
  });
}

// ── Data helpers ─────────────────────────────────────────────

function quartersForRange(years) {
  return DATA.quarters.slice(-(years * 4));
}

function sliceLast(arr, n) {
  return arr ? arr.slice(-n) : [];
}

function groupById(id) {
  return DATA.groups.find(g => g.id === id);
}

function topLevelCategories() {
  return DATA.subgroups.filter(s => s.level === 0);
}

// Rebase an index array so that the first non-null value = 100
function rebase(arr) {
  const first = arr.find(v => v != null);
  if (first == null) return arr.map(() => null);
  return arr.map(v => v == null ? null : round2((v / first - 1) * 100));
}

function round2(n) { return Math.round(n * 100) / 100; }

// ── Render ───────────────────────────────────────────────────

function render() {
  renderHero();
  renderSelectedSummary();
  renderLineChart();
  renderBarChart();
}

// ── Hero ──────────────────────────────────────────────────────

function renderHero() {
  const primary = groupById(selectedGroups[0]);
  const latestQ = DATA.quarters.at(-1);
  const cpiRate  = DATA.cpi.annual.all.at(-1);
  const grpRate  = primary.annual.all.at(-1);
  const diff     = grpRate - cpiRate;
  const sign     = diff > 0 ? "+" : "";

  document.getElementById("hero-cpi-rate").textContent  = cpiRate.toFixed(1) + "%";
  document.getElementById("hero-cpi-quarter").textContent = latestQ;
  document.getElementById("hero-group-rate").textContent = grpRate.toFixed(1) + "%";
  document.getElementById("hero-group-name").textContent = primary.label;

  const diffEl = document.getElementById("hero-diff");
  diffEl.textContent = `${sign}${diff.toFixed(1)}% vs headline`;
  diffEl.className   = "hero-diff " + (diff > 0.1 ? "above" : diff < -0.1 ? "below" : "same");
}

// ── Selected summary chips ────────────────────────────────────

function renderSelectedSummary() {
  const el = document.getElementById("selected-summary");
  el.innerHTML = "";
  selectedGroups.forEach(id => {
    const g = groupById(id);
    const chip = document.createElement("div");
    chip.className = "summary-chip";
    chip.style.setProperty("--chip-color",  g.color + "22");
    chip.style.setProperty("--chip-text",   g.color);
    chip.style.setProperty("--chip-swatch", g.color);
    chip.innerHTML = `<span class="chip-swatch"></span>${g.label}`;
    el.appendChild(chip);
  });
}

// ── Line chart ────────────────────────────────────────────────

function renderLineChart() {
  const n        = selectedYears * 4;
  const quarters = quartersForRange(selectedYears);
  const isIndex  = viewMode === "index";

  function buildDataset(label, color, fullArr, dash = false) {
    const sliced = sliceLast(fullArr, n);
    const data   = isIndex ? rebase(sliced) : sliced;
    return {
      label,
      data,
      borderColor:     color,
      backgroundColor: color + "18",
      borderDash:      dash ? [5, 4] : [],
      borderWidth:     dash ? 2 : 2.5,
      pointRadius:     dash ? 2 : 3,
      pointHoverRadius: 5,
      tension: 0.35,
      order:   dash ? 99 : 1,
    };
  }

  const cpiDataset = buildDataset("CPI (headline)", "#000000", DATA.cpi.annual.all, true);
  if (isIndex) cpiDataset.data = rebase(sliceLast(DATA.cpi.index.all, n));

  const groupDatasets = selectedGroups.map(id => {
    const g = groupById(id);
    const arr = isIndex ? g.index.all : g.annual.all;
    return buildDataset(g.label, g.color, arr);
  });

  const yLabel = isIndex
    ? "Cumulative change since start (%)"
    : "Annual change (%)";

  const ctx = document.getElementById("line-chart");
  if (lineChart) lineChart.destroy();

  lineChart = new Chart(ctx, {
    type: "line",
    data: { labels: quarters, datasets: [cpiDataset, ...groupDatasets] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            font: { family: "inherit", size: 12 },
            boxWidth: 20,
            padding: 12,
            generateLabels(chart) {
              return chart.data.datasets.map((ds, i) => ({
                text: ds.label,
                fillStyle: ds.borderColor,
                strokeStyle: ds.borderColor,
                lineWidth: 2,
                lineDash: ds.borderDash || [],
                hidden: false,
                index: i,
              }));
            },
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const v = ctx.parsed.y;
              return ` ${ctx.dataset.label}: ${v != null ? v.toFixed(1) + "%" : "n/a"}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: "#e2e8f0" },
          ticks: { font: { size: 11 }, color: "#64748b", maxRotation: 45 },
        },
        y: {
          grid: { color: "#e2e8f0" },
          ticks: {
            font: { size: 11 },
            color: "#64748b",
            callback: v => v.toFixed(1) + "%",
          },
          title: {
            display: true,
            text: yLabel,
            color: "#94a3b8",
            font: { size: 11 },
          },
        },
      },
    },
  });
}

// ── Bar chart ─────────────────────────────────────────────────

function renderBarChart() {
  const primary  = groupById(selectedGroups[0]);
  const cats     = topLevelCategories();
  const isIndex  = viewMode === "index";
  const n        = selectedYears * 4;

  function latestOrCumulative(annualSeries, indexSeries, catId) {
    if (isIndex) {
      const arr = indexSeries[catId];
      if (!arr) return null;
      return rebase(sliceLast(arr, n)).at(-1);
    }
    const arr = annualSeries[catId];
    return arr ? arr.at(-1) : null;
  }

  const labels   = cats.map(s => s.label);
  const hlpiVals = cats.map(s => latestOrCumulative(primary.annual, primary.index, s.id));
  const cpiVals  = cats.map(s => {
    if (!DATA.cpi.annual[s.id]) return null;  // Interest payments not in CPI
    return latestOrCumulative(DATA.cpi.annual, DATA.cpi.index, s.id);
  });

  const periodLabel = isIndex
    ? `cumulative since ${quartersForRange(selectedYears)[0]}`
    : `annual · ${DATA.quarters.at(-1)}`;

  document.getElementById("bar-chart-subtitle").textContent =
    `· ${primary.label} vs CPI · ${periodLabel}`;

  const ctx = document.getElementById("bar-chart");
  if (barChart) barChart.destroy();

  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: primary.label,
          data:  hlpiVals,
          backgroundColor: primary.color + "cc",
          borderRadius: 3,
        },
        {
          label: "CPI (headline)",
          data:  cpiVals,
          backgroundColor: "#00000033",
          borderColor:     "#000000",
          borderWidth: 1,
          borderRadius: 3,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: { font: { family: "inherit", size: 12 }, boxWidth: 14, padding: 12 },
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const v = ctx.parsed.x;
              return ` ${ctx.dataset.label}: ${v != null ? v.toFixed(1) + "%" : "n/a"}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: "#e2e8f0" },
          ticks: { font: { size: 11 }, color: "#64748b", callback: v => v.toFixed(0) + "%" },
          title: { display: true, text: isIndex ? "Cumulative change (%)" : "Annual change (%)", color: "#94a3b8", font: { size: 11 } },
        },
        y: {
          grid:  { display: false },
          ticks: { font: { size: 11 }, color: "#0f172a" },
        },
      },
    },
  });
}

// ── Quiz ──────────────────────────────────────────────────────

function bindQuiz() {
  const toggle = document.getElementById("quiz-toggle");
  const panel  = document.getElementById("quiz-panel");

  toggle.addEventListener("click", () => {
    const open = !panel.hasAttribute("hidden");
    if (open) {
      panel.setAttribute("hidden", "");
      toggle.textContent = "Which group am I? →";
    } else {
      panel.removeAttribute("hidden");
      toggle.textContent = "Close ✕";
    }
  });

  document.getElementById("quiz-submit").addEventListener("click", runQuiz);

  document.getElementById("quintile-info-btn").addEventListener("click", () => {
    document.getElementById("quintile-info-panel").toggleAttribute("hidden");
  });
}

function runQuiz() {
  const matches = [];

  if (document.getElementById("quiz-superannuitant").checked) matches.push("superannuitants");
  if (document.getElementById("quiz-beneficiary").checked)    matches.push("beneficiaries");
  if (document.getElementById("quiz-maori").checked)          matches.push("maori");

  const incomeQ = document.querySelector('input[name="quiz-income"]:checked');
  if (incomeQ && incomeQ.value !== "none") matches.push(incomeQ.value);

  const expQ = document.querySelector('input[name="quiz-exp"]:checked');
  if (expQ && expQ.value !== "none") matches.push(expQ.value);

  const resultEl = document.getElementById("quiz-result");
  resultEl.removeAttribute("hidden");
  resultEl.innerHTML = "";

  if (matches.length === 0) {
    const p = document.createElement("p");
    p.className = "quiz-result-text";
    p.textContent = "No specific group matched — All Households is your best fit.";
    resultEl.appendChild(p);
    return;
  }

  if (matches.length === 1) {
    const g = groupById(matches[0]);
    const p = document.createElement("p");
    p.className = "quiz-result-text";
    p.textContent = "Your closest match:";
    resultEl.appendChild(p);
    resultEl.appendChild(makeQuizSelectBtn(g));
    return;
  }

  const p = document.createElement("p");
  p.className = "quiz-result-text";
  p.textContent = "You fit multiple groups — pick one to compare:";
  resultEl.appendChild(p);

  const choices = document.createElement("div");
  choices.className = "quiz-result-choices";
  matches.forEach(id => choices.appendChild(makeQuizSelectBtn(groupById(id))));
  resultEl.appendChild(choices);
}

function makeQuizSelectBtn(g) {
  const btn = document.createElement("button");
  btn.className = "quiz-select-btn";
  btn.textContent = g.label;
  btn.style.setProperty("--btn-color",      g.color);
  btn.style.setProperty("--btn-text-color", pillTextColor(g.color));
  btn.addEventListener("click", () => applyQuizGroup(g.id));
  return btn;
}

function applyQuizGroup(id) {
  selectedGroups = [id];
  syncPillStates();
  render();
  document.getElementById("quiz-panel").setAttribute("hidden", "");
  document.getElementById("quiz-toggle").textContent = "Which group am I? →";
}

// ── Go ────────────────────────────────────────────────────────

init();
