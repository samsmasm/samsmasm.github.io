import {
  db, collection, doc, getDocs, setDoc, deleteDoc, writeBatch,
  serverTimestamp, slugify, loadPerformers
} from "./firebase.js";

const $ = (id) => document.getElementById(id);

let performers = [];          // [{slug, displayName}]
let nameBySlug = new Map();
let usage = new Map();        // slug -> { count, dates: Set }
let allSlots = [];            // [{ nightId, slotId, data }] — every non-break slot
const selected = new Set();

async function loadAll() {
  performers = await loadPerformers();
  nameBySlug = new Map(performers.map(p => [p.slug, p.displayName]));
  usage = new Map();
  allSlots = [];

  const nightsSnap = await getDocs(collection(db, "nights"));
  for (const nightDoc of nightsSnap.docs) {
    const slotsSnap = await getDocs(collection(db, "nights", nightDoc.id, "slots"));
    for (const slotDoc of slotsSnap.docs) {
      const data = slotDoc.data();
      if (data.isBreak || !data.performerSlugs?.length) continue;
      allSlots.push({ nightId: nightDoc.id, slotId: slotDoc.id, data });
      for (const slug of data.performerSlugs) {
        if (!slug) continue;
        const u = usage.get(slug) || { count: 0, dates: new Set() };
        u.count++;
        u.dates.add(nightDoc.id);
        usage.set(slug, u);
        // performers referenced in slots but missing a performer doc (shouldn't
        // happen, but historical imports may have raced) still get a row
        if (!nameBySlug.has(slug)) nameBySlug.set(slug, slug);
      }
    }
  }
}

function render() {
  const filter = $("filterInput").value.trim().toLowerCase();
  const rows = [...nameBySlug.entries()]
    .map(([slug, name]) => {
      const u = usage.get(slug);
      const dates = u ? [...u.dates].sort() : [];
      return { slug, name, count: u?.count || 0, first: dates[0] || "—", last: dates[dates.length - 1] || "—" };
    })
    .filter(r => !filter || r.name.toLowerCase().includes(filter))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  $("performerRows").innerHTML = rows.map(r => `
    <tr>
      <td><input type="checkbox" data-slug="${r.slug}" ${selected.has(r.slug) ? "checked" : ""}></td>
      <td>${r.name}</td>
      <td>${r.count}</td>
      <td>${r.first}</td>
      <td>${r.last}</td>
    </tr>`).join("") || `<tr><td colspan="5" class="muted">No matches.</td></tr>`;
  updateBar();
}

function updateBar() {
  $("selCount").textContent = `${selected.size} selected`;
  $("mergeBtn").disabled = selected.size < 1 || !$("canonicalName").value.trim();
  if (selected.size && !$("canonicalName").value.trim()) {
    const first = [...selected][0];
    $("canonicalName").placeholder = nameBySlug.get(first) || "Name to keep";
  }
}

$("performerRows").addEventListener("change", (e) => {
  const cb = e.target.closest("input[data-slug]");
  if (!cb) return;
  cb.checked ? selected.add(cb.dataset.slug) : selected.delete(cb.dataset.slug);
  updateBar();
});
$("filterInput").addEventListener("input", render);
$("canonicalName").addEventListener("input", updateBar);

$("mergeBtn").addEventListener("click", async () => {
  const canonicalName = $("canonicalName").value.trim();
  const canonSlug = slugify(canonicalName);
  if (!canonSlug || !selected.size) return;

  const mergeSlugs = new Set(selected);
  const affected = allSlots.filter(s => s.data.performerSlugs.some(slug => mergeSlugs.has(slug)));
  const oldNames = [...mergeSlugs].map(s => nameBySlug.get(s) || s).join(", ");
  if (!confirm(`Merge ${oldNames} → "${canonicalName}"?\nThis rewrites ${affected.length} schedule slot(s) and cannot be undone.`)) return;

  $("mergeBtn").disabled = true;
  const status = $("mergeStatus");
  status.textContent = "Merging…";
  try {
    // update the name lookup first so rewritten slot text uses the new name
    nameBySlug.set(canonSlug, canonicalName);

    // Firestore batches max out at 500 ops — chunk the slot rewrites
    for (let i = 0; i < affected.length; i += 400) {
      const batch = writeBatch(db);
      for (const s of affected.slice(i, i + 400)) {
        const newSlugs = [];
        for (const slug of s.data.performerSlugs) {
          const mapped = mergeSlugs.has(slug) ? canonSlug : slug;
          if (!newSlugs.includes(mapped)) newSlugs.push(mapped);
        }
        const newText = newSlugs.map(slug => nameBySlug.get(slug) || slug).join(" & ");
        batch.update(doc(db, "nights", s.nightId, "slots", s.slotId), {
          performerSlugs: newSlugs,
          performerText: newText
        });
        s.data.performerSlugs = newSlugs;
        s.data.performerText = newText;
      }
      await batch.commit();
      status.textContent = `Merging… ${Math.min(i + 400, affected.length)}/${affected.length} slots`;
    }

    await setDoc(doc(db, "performers", canonSlug), {
      displayName: canonicalName, createdAt: serverTimestamp()
    }, { merge: true });
    for (const slug of mergeSlugs) {
      if (slug !== canonSlug) await deleteDoc(doc(db, "performers", slug));
    }

    status.textContent = `Done — ${affected.length} slot(s) rewritten to "${canonicalName}".`;
    selected.clear();
    $("canonicalName").value = "";
    await loadAll();
    render();
  } catch (err) {
    console.error(err);
    status.textContent = "Merge failed — see console.";
  } finally {
    $("mergeBtn").disabled = false;
  }
});

(async function init() {
  await loadAll();
  render();
})();
