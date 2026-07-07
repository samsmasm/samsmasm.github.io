import { db, collection, getDocs, query, where } from "./firebase.js";

const WINDOW_DAYS = 28;

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function renderFairnessPanel(container) {
  container.innerHTML = `<p class="muted">Loading…</p>`;
  try {
    const cutoff = isoDaysAgo(WINDOW_DAYS);
    const nightsSnap = await getDocs(query(collection(db, "nights"), where("date", ">=", cutoff)));

    const counts = new Map(); // slug -> { name, count, dates: [] }
    for (const nightDoc of nightsSnap.docs) {
      const date = nightDoc.id;
      const slotsSnap = await getDocs(collection(db, "nights", date, "slots"));
      for (const slotDoc of slotsSnap.docs) {
        const s = slotDoc.data();
        if (s.isBreak || !s.performerSlugs) continue;
        for (const slug of s.performerSlugs) {
          if (!slug) continue;
          const entry = counts.get(slug) || { name: s.performerText, count: 0, dates: [] };
          entry.count++;
          entry.dates.push(date);
          counts.set(slug, entry);
        }
      }
    }

    const rows = [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    if (!rows.length) {
      container.innerHTML = `<p class="muted">No performances in the last ${WINDOW_DAYS / 7} weeks yet.</p>`;
      return;
    }
    container.innerHTML = rows.map(r => `
      <div class="fairness-item">
        <span>${r.name}<br><small class="muted">${r.dates.slice().sort().reverse().join(", ")}</small></span>
        <span class="fairness-count${r.count >= 3 ? " high" : ""}">${r.count}×</span>
      </div>
    `).join("");
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="muted">Couldn't load fairness data.</p>`;
  }
}
