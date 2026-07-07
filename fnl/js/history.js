import { db, collection, getDocs, query, orderBy } from "./firebase.js?v=2";

const $ = (id) => document.getElementById(id);
let nights = []; // [{date, mc, status, slots: [...]}]

function formatDate(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}

function render(filterText) {
  const q = (filterText || "").trim().toLowerCase();
  const list = $("nightsList");
  list.innerHTML = "";

  for (const night of nights) {
    const slots = q
      ? night.slots.filter(s => !s.isBreak && (s.performerText || "").toLowerCase().includes(q))
      : night.slots;
    if (q && !slots.length) continue;

    const card = document.createElement("div");
    card.className = "card";
    const rows = (q ? slots : night.slots).map(s => {
      if (s.isBreak) return `<div class="muted">${s.computedTime || ""} — Break</div>`;
      return `<div>${s.computedTime || ""} — <strong>${s.performerText}</strong> (${s.pieces} piece${s.pieces === 1 ? "" : "s"})</div>`;
    }).join("");
    card.innerHTML = `
      <h2>${formatDate(night.date)} ${night.mc ? `<span class="muted">— MC: ${night.mc}</span>` : ""}
        <span class="pill ${night.status || "draft"}">${night.status || "draft"}</span></h2>
      ${rows || '<p class="muted">No slots recorded.</p>'}
    `;
    list.appendChild(card);
  }
  if (!list.children.length) {
    list.innerHTML = `<p class="muted">No nights match.</p>`;
  }
}

$("searchInput").addEventListener("input", (e) => render(e.target.value));

(async function init() {
  $("nightsList").innerHTML = `<p class="muted">Loading…</p>`;
  const nightsSnap = await getDocs(query(collection(db, "nights"), orderBy("date", "desc")));
  nights = [];
  for (const d of nightsSnap.docs) {
    const slotsSnap = await getDocs(collection(db, "nights", d.id, "slots"));
    const slots = slotsSnap.docs.map(sd => sd.data()).sort((a, b) => a.order - b.order);
    nights.push({ date: d.id, ...d.data(), slots });
  }
  render("");
})();
