/* ============================================================
   Inflation Tracker — app.js
   ============================================================ */

let DATA = null;
let selectedGroups = ["all_households"];
let selectedYears = 1;
let lineChart = null;
let barChart = null;

// ── Boot ────────────────────────────────────────────────────

async function init() {
  DATA = await fetch("data/hlpi.json").then(r => r.json());
  buildGroupSelector();
  bindPeriodButtons();
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
      const category = btn.dataset.category;
      const content = document.getElementById(`pills-${category}`);
      const isOpen = content.classList.contains("open");
      content.classList.toggle("open", !isOpen);
      btn.classList.toggle("open", !isOpen);
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
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? "#0f172a" : "#ffffff";
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

// ── Period buttons ──────────────────────────────────────────

function bindPeriodButtons() {
  document.querySelectorAll(".period-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".period-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedYears = parseInt(btn.dataset.years);
      render();
    });
  });
}

// ── Data helpers ────────────────────────────────────────────

function sliceLast(arr, n) {
  return arr ? arr.slice(-n) : [];
}

function quartersForRange(years) {
  return DATA.quarters.slice(-(years * 4));
}

function groupById(id) {
  return DATA.groups.find(g => g.id === id);
}

function topLevelSubgroups() {
  return DATA.subgroups.filter(s => s.level === 0 && s.id !== "all" && s.id !== "all_groups");
}

// ── Render ──────────────────────────────────────────────────

function render() {
  renderHero();
  renderSelectedSummary();
  renderLineChart();
  renderBarChart();
}

// ── Hero ─────────────────────────────────────────────────────

function renderHero() {
  const primaryGroup = groupById(selectedGroups[0]);
  const latestQuarter = DATA.quarters.at(-1);
  const groupRate = primaryGroup.annual.all.at(-1);
  const cpiRate = DATA.cpi.annual.all.at(-1);
  const diff = groupRate - cpiRate;
  const sign = diff > 0 ? "+" : "";

  document.getElementById("hero-cpi-rate").textContent = cpiRate.toFixed(1) + "%";
  document.getElementById("hero-cpi-quarter").textContent = latestQuarter;
  document.getElementById("hero-group-rate").textContent = groupRate.toFixed(1) + "%";
  document.getElementById("hero-group-name").textContent = primaryGroup.label;
  document.getElementById("hero-diff").textContent =
    `${sign}${diff.toFixed(1)}% vs headline`;
  document.getElementById("hero-diff").className =
    "hero-diff " + (diff > 0.1 ? "above" : diff < -0.1 ? "below" : "same");
}

// ── Selected summary chips ───────────────────────────────────

function renderSelectedSummary() {
  const container = document.getElementById("selected-summary");
  container.innerHTML = "";
  selectedGroups.forEach(id => {
    const g = groupById(id);
    const chip = document.createElement("div");
    chip.className = "summary-chip";
    chip.style.setProperty("--chip-color", g.color + "22");
    chip.style.setProperty("--chip-text", g.color);
    chip.style.setProperty("--chip-swatch", g.color);
    chip.innerHTML = `<span class="chip-swatch"></span>${g.label}`;
    container.appendChild(chip);
  });
}

// ── Line chart ───────────────────────────────────────────────

function renderLineChart() {
  const n = selectedYears * 4;
  const quarters = quartersForRange(selectedYears);

  // CPI always shown as black dashed reference line
  const cpiDataset = {
    label: "CPI (headline)",
    data: sliceLast(DATA.cpi.annual.all, n),
    borderColor: "#000000",
    backgroundColor: "transparent",
    borderDash: [5, 4],
    borderWidth: 2,
    pointRadius: 2,
    pointHoverRadius: 4,
    tension: 0.35,
    order: 99,
  };

  const groupDatasets = selectedGroups.map(id => {
    const g = groupById(id);
    return {
      label: g.label,
      data: sliceLast(g.annual.all, n),
      borderColor: g.color,
      backgroundColor: g.color + "18",
      tension: 0.35,
      borderWidth: 2.5,
      pointRadius: 3,
      pointHoverRadius: 5,
      order: 1,
    };
  });

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
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y != null ? ctx.parsed.y.toFixed(1) + "%" : "n/a"}`,
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
            text: "% change (annual)",
            color: "#94a3b8",
            font: { size: 11 },
          },
        },
      },
    },
  });
}

// ── Bar chart ────────────────────────────────────────────────

function renderBarChart() {
  const primaryId = selectedGroups[0];
  const g = groupById(primaryId);
  const groups = topLevelSubgroups();

  const labels = groups.map(s => s.label);
  const hlpiValues = groups.map(s => g.annual[s.id]?.at(-1) ?? null);
  const cpiValues  = groups.map(s => DATA.cpi.annual[s.id]?.at(-1) ?? null);

  document.getElementById("bar-chart-subtitle").textContent =
    `· ${g.label} vs CPI · ${DATA.quarters.at(-1)}`;

  const ctx = document.getElementById("bar-chart");
  if (barChart) barChart.destroy();

  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: g.label,
          data: hlpiValues,
          backgroundColor: g.color + "cc",
          borderRadius: 3,
        },
        {
          label: "CPI (headline)",
          data: cpiValues,
          backgroundColor: "#00000033",
          borderColor: "#000000",
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
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.x != null ? ctx.parsed.x.toFixed(1) + "%" : "n/a"}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: "#e2e8f0" },
          ticks: { font: { size: 11 }, color: "#64748b", callback: v => v.toFixed(0) + "%" },
          title: { display: true, text: "% change (annual)", color: "#94a3b8", font: { size: 11 } },
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 11 }, color: "#0f172a" },
        },
      },
    },
  });
}

// ── Go ───────────────────────────────────────────────────────

init();
