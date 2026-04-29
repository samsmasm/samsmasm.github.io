/* ============================================================
   Inflation Tracker — app.js
   ============================================================ */

let DATA                 = null;
let selectedGroups       = ["all_households"];
let selectedYears        = 1;
let viewMode             = "annual";   // "annual" | "index"
let selectedTenure       = null;       // null | "renter" | "outright" | "mortgaged"
let lineChart            = null;
let barChart             = null;
let userHasSelectedGroup = false;

// ── Tenure config ────────────────────────────────────────────
// Home ownership proportions by group (owned outright + mortgaged, including family trusts).
// Source: Stats NZ Table A1, 2022/23 Household Economic Survey.
// Update after each HILS expenditure module cycle (~every 3 years).
const HOME_OWNERSHIP_PCT = {
  all_households:  65.8,
  beneficiaries:   26.4,
  maori:           47.0,
  superannuitants: 85.7,
  income_q1:       66.7,
  income_q2:       53.2,
  income_q3:       59.9,
  income_q4:       69.9,
  income_q5:       79.8,
  expenditure_q1:  60.5,
  expenditure_q2:  58.8,
  expenditure_q3:  61.4,
  expenditure_q4:  65.7,
  expenditure_q5:  82.3,
};

// Fraction of homeowners carrying a mortgage (national estimate, HES 2022/23).
// Assumed constant across groups. Update after each HES / HILS cycle.
const F_MORT = 0.57;

const TENURE_LABELS = {
  renter:    "renter",
  outright:  "outright owner",
  mortgaged: "mortgaged owner",
};

// ── Boot ────────────────────────────────────────────────────

// Tab switching binds immediately (no data dependency)
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => activateTab(btn.dataset.tab));
});

async function init() {
  DATA = await fetch("data/hlpi.json").then(r => r.json());
  buildGroupSelector();
  bindControls();
  bindTenure();
  bindQuiz();
  render();
}

// ── Tabs ─────────────────────────────────────────────────────

function activateTab(name) {
  document.querySelectorAll(".tab-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.tab === name)
  );
  document.querySelectorAll(".tab-panel").forEach(p =>
    p.classList.toggle("active", p.dataset.tab === name)
  );
}

// ── Group selector ──────────────────────────────────────────

function buildGroupSelector() {
  ["demographic", "income", "expenditure"].forEach(category => {
    const container = document.getElementById(`pills-${category}`);
    DATA.groups
      .filter(g => g.category === category)
      .forEach(g => container.appendChild(makePill(g)));
  });

  document.querySelectorAll(".section-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const cat    = btn.dataset.category;
      const pills  = document.getElementById(`pills-${cat}`);
      const isOpen = pills.classList.contains("open");
      pills.classList.toggle("open", !isOpen);
      btn.classList.toggle("open", !isOpen);
      btn.querySelector(".section-chevron").textContent = isOpen ? "+" : "−";
    });
  });

  document.getElementById("personalise-link").addEventListener("click", () => {
    activateTab("personalise");
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
  userHasSelectedGroup = true;
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

// ── Tenure ────────────────────────────────────────────────────

function bindTenure() {
  document.querySelectorAll('input[name="tenure"]').forEach(radio => {
    radio.addEventListener("change", () => {
      const val      = document.querySelector('input[name="tenure"]:checked')?.value;
      selectedTenure = (val === "none") ? null : (val ?? null);
      userHasSelectedGroup = true;
      render();
    });
  });
}

// Adjust the annual % series for a specific housing tenure type.
//
// The group HLPI rate is a weighted average over all members, including
// mixed tenure types. This function re-weights to reflect what a specific
// tenure type actually pays:
//   - Renter:          rent scaled up to 1/p_rent; rates/maintenance/interest removed
//   - Outright owner:  rent removed; rates/maintenance scaled up to 1/p_own; interest removed
//   - Mortgaged owner: rent removed; rates/maintenance scaled to 1/p_own; interest to 1/p_mort
//
// Weights: HLC24 Dec 2024 (in group.weights). Tenure proportions: HES 2022/23 Table A1.
function computeTenureAdjustedAnnual(group, tenure) {
  if (!tenure) return group.annual.all;

  const p_own  = (HOME_OWNERSHIP_PCT[group.id] ?? 65.8) / 100;
  const p_rent = 1 - p_own;
  const p_mort = p_own * F_MORT;

  const w       = group.weights;
  const w_rent  = w["housing_and_household_utilities_group__actual_rentals_for_housing"]         ?? 0;
  const w_rates = w["housing_and_household_utilities_group__property_rates_and_related_services"] ?? 0;
  const w_maint = w["housing_and_household_utilities_group__property_maintenance"]                ?? 0;
  const w_int   = w["interest_payments_group"]                                                    ?? 0;

  const r_rent_s  = group.annual["sub__actual_rentals_for_housing"]              ?? [];
  const r_rates_s = group.annual["sub__property_rates_and_related_services"]     ?? [];
  const r_maint_s = group.annual["sub__property_maintenance"]                    ?? [];
  const r_int_s   = group.annual["interest_payments"]                            ?? [];

  return group.annual.all.map((r_group, i) => {
    if (r_group == null) return null;
    const r_rent  = r_rent_s[i];
    const r_rates = r_rates_s[i];
    const r_maint = r_maint_s[i];
    const r_int   = r_int_s[i];
    if (r_rent == null || r_rates == null || r_maint == null || r_int == null) return r_group;

    let num, den;

    if (tenure === "renter") {
      const extra = p_rent > 0 ? w_rent * (1/p_rent - 1) : 0;
      num = r_group * 100 + extra * r_rent - w_rates * r_rates - w_maint * r_maint - w_int * r_int;
      den = 100 + extra - w_rates - w_maint - w_int;

    } else if (tenure === "outright") {
      const extra_r = p_own > 0 ? w_rates * (1/p_own - 1) : 0;
      const extra_m = p_own > 0 ? w_maint * (1/p_own - 1) : 0;
      num = r_group * 100 - w_rent * r_rent + extra_r * r_rates + extra_m * r_maint - w_int * r_int;
      den = 100 - w_rent + extra_r + extra_m - w_int;

    } else if (tenure === "mortgaged") {
      const extra_r = p_own  > 0 ? w_rates * (1/p_own  - 1) : 0;
      const extra_m = p_own  > 0 ? w_maint * (1/p_own  - 1) : 0;
      const extra_i = p_mort > 0 ? w_int   * (1/p_mort - 1) : 0;
      num = r_group * 100 - w_rent * r_rent + extra_r * r_rates + extra_m * r_maint + extra_i * r_int;
      den = 100 - w_rent + extra_r + extra_m + extra_i;

    } else {
      return r_group;
    }

    return den > 0 ? round2(num / den) : r_group;
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

function rebase(arr) {
  const first = arr.find(v => v != null);
  if (first == null) return arr.map(() => null);
  return arr.map(v => v == null ? null : round2((v / first - 1) * 100));
}

function round2(n) { return Math.round(n * 100) / 100; }

// ── Render ───────────────────────────────────────────────────

function render() {
  renderHero();
  renderLineChart();
  renderBarChart();
}

// ── Hero ──────────────────────────────────────────────────────

function renderHero() {
  const latestQ = DATA.quarters.at(-1);
  const cpiRate = DATA.cpi.annual.all.at(-1);

  document.getElementById("hero-cpi-rate").textContent    = cpiRate.toFixed(1) + "%";
  document.getElementById("hero-cpi-quarter").textContent = latestQ;

  const hookEl  = document.getElementById("hero-hook");
  const statsEl = document.getElementById("hero-group-stats");

  if (!userHasSelectedGroup) {
    hookEl.removeAttribute("hidden");
    statsEl.setAttribute("hidden", "");
    return;
  }

  hookEl.setAttribute("hidden", "");
  statsEl.removeAttribute("hidden");

  const primary   = groupById(selectedGroups[0]);
  const adjSeries = computeTenureAdjustedAnnual(primary, selectedTenure);
  const grpRate   = adjSeries.at(-1);
  const diff      = grpRate - cpiRate;
  const sign      = diff > 0 ? "+" : "";

  const tenureLabel = selectedTenure ? ` · ${TENURE_LABELS[selectedTenure]}` : "";
  document.getElementById("hero-group-rate").textContent = grpRate.toFixed(1) + "%";
  document.getElementById("hero-group-name").textContent = primary.label + tenureLabel;

  const diffEl = document.getElementById("hero-diff");
  diffEl.textContent = `${sign}${diff.toFixed(1)}% vs headline`;
  diffEl.className   = "hero-diff " + (diff > 0.1 ? "above" : diff < -0.1 ? "below" : "same");
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
      borderColor:      color,
      backgroundColor:  color + "18",
      borderDash:       dash ? [5, 4] : [],
      borderWidth:      dash ? 2 : 2.5,
      pointRadius:      dash ? 2 : 3,
      pointHoverRadius: 5,
      tension: 0.35,
      order:   dash ? 99 : 1,
    };
  }

  const cpiDataset = buildDataset("CPI (headline)", "#000000", DATA.cpi.annual.all, true);
  if (isIndex) cpiDataset.data = rebase(sliceLast(DATA.cpi.index.all, n));

  const groupDatasets = selectedGroups.map(id => {
    const g      = groupById(id);
    const adjArr = computeTenureAdjustedAnnual(g, selectedTenure);
    const arr    = isIndex ? g.index.all : adjArr;
    const label  = selectedTenure ? `${g.label} (${TENURE_LABELS[selectedTenure]})` : g.label;
    return buildDataset(label, g.color, arr);
  });

  const yLabel = isIndex
    ? "Cumulative change since start (%)"
    : selectedTenure
      ? `Annual change — ${TENURE_LABELS[selectedTenure]} (%)`
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
    if (!DATA.cpi.annual[s.id]) return null;
    return latestOrCumulative(DATA.cpi.annual, DATA.cpi.index, s.id);
  });

  const periodLabel = isIndex
    ? `cumulative since ${quartersForRange(selectedYears)[0]}`
    : `annual · ${DATA.quarters.at(-1)}`;

  const groupLabel = primary.label;

  document.getElementById("bar-chart-subtitle").textContent =
    `· ${groupLabel} vs CPI · ${periodLabel}`;

  const ctx = document.getElementById("bar-chart");
  if (barChart) barChart.destroy();

  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: groupLabel,
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
  userHasSelectedGroup = true;
  selectedGroups = [id];
  syncPillStates();
  render();
  document.getElementById("quiz-panel").setAttribute("hidden", "");
  document.getElementById("quiz-toggle").textContent = "Which group am I? →";
  activateTab("groups");
}

// ── Go ────────────────────────────────────────────────────────

init();
