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
  const allHouseholdsGroup = DATA.groups.find(g => g.id === "all_households");
  const standalone = document.getElementById("standalone-pills");
  standalone.appendChild(makePill(allHouseholdsGroup));

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
  // Simple luminance check to pick white or dark text
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? "#0f172a" : "#ffffff";
}

function toggleGroup(id) {
  if (selectedGroups.includes(id)) {
    if (selectedGroups.length === 1) return; // always keep at least one
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

function quartersForRange(years) {
  const n = years * 4;
  return DATA.quarters.slice(-n);
}

function valuesForRange(arr, years) {
  const n = years * 4;
  return arr.slice(-n);
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
  const latest = primaryGroup.annual.all.at(-1);
  const latestQuarter = DATA.quarters.at(-1);

  document.getElementById("hero-rate").textContent = latest.toFixed(1) + "%";
  document.getElementById("hero-meta").innerHTML =
    `<strong>${primaryGroup.label}</strong> · ${latestQuarter}`;
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
  const quarters = quartersForRange(selectedYears);

  const datasets = selectedGroups.map(id => {
    const g = groupById(id);
    return {
      label: g.label,
      data: valuesForRange(g.annual.all, selectedYears),
      borderColor: g.color,
      backgroundColor: g.color + "18",
      tension: 0.35,
      borderWidth: 2.5,
      pointRadius: 3,
      pointHoverRadius: 5,
    };
  });

  const ctx = document.getElementById("line-chart");
  if (lineChart) lineChart.destroy();

  lineChart = new Chart(ctx, {
    type: "line",
    data: { labels: quarters, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          display: selectedGroups.length > 1,
          position: "top",
          labels: {
            font: { family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif", size: 12 },
            boxWidth: 12,
            padding: 12,
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}%`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: "#e2e8f0" },
          ticks: {
            font: { size: 11 },
            color: "#64748b",
            maxRotation: 45,
          },
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
  const values = groups.map(s => {
    const arr = g.annual[s.id];
    return arr ? arr.at(-1) : null;
  });

  const colors = values.map(v =>
    v === null ? "#94a3b8" : v > 0 ? "#dc2626cc" : "#15803dcc"
  );

  document.getElementById("bar-chart-subtitle").textContent =
    `· ${g.label} · ${DATA.quarters.at(-1)}`;

  const ctx = document.getElementById("bar-chart");
  if (barChart) barChart.destroy();

  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderRadius: 3,
      }],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.x !== null ? ctx.parsed.x.toFixed(1) + "%" : "n/a"}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: "#e2e8f0" },
          ticks: {
            font: { size: 11 },
            color: "#64748b",
            callback: v => v.toFixed(0) + "%",
          },
          title: {
            display: true,
            text: "% change (annual)",
            color: "#94a3b8",
            font: { size: 11 },
          },
        },
        y: {
          grid: { display: false },
          ticks: {
            font: { size: 11 },
            color: "#0f172a",
          },
        },
      },
    },
  });
}

// ── Go ───────────────────────────────────────────────────────

init();
