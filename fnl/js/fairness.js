import { db, collection, getDocs, query, where, loadPerformers } from "./firebase.js?v=2";

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
    const [nightsSnap, performers] = await Promise.all([
      getDocs(query(collection(db, "nights"), where("date", ">=", cutoff))),
      loadPerformers()
    ]);
    const nameBySlug = new Map(performers.map(p => [p.slug, p.displayName]));

    // Aggregate per individual person (slug), not per slot text — a duo slot
    // credits each named performer separately.
    const counts = new Map(); // slug -> { name, count, dates: Set }
    for (const nightDoc of nightsSnap.docs) {
      const date = nightDoc.id;
      const slotsSnap = await getDocs(collection(db, "nights", date, "slots"));
      for (const slotDoc of slotsSnap.docs) {
        const s = slotDoc.data();
        if (s.isBreak || !s.performerSlugs) continue;
        for (const slug of s.performerSlugs) {
          if (!slug) continue;
          const entry = counts.get(slug) || { name: nameBySlug.get(slug) || slug, count: 0, dates: new Set() };
          entry.count++;
          entry.dates.add(date);
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
        <span>${r.name}<br><small class="muted">${[...r.dates].sort().reverse().map(d => d.slice(5)).join(", ")}</small></span>
        <span class="fairness-count${r.count >= 3 ? " high" : ""}">${r.count}×</span>
      </div>
    `).join("");
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="muted">Couldn't load fairness data.</p>`;
  }
}
