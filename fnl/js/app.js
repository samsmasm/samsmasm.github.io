import {
  db, collection, doc, getDoc, getDocs, setDoc, deleteDoc, writeBatch,
  serverTimestamp, slugify, upsertPerformer, loadPerformers
} from "./firebase.js";
import { timeToMinutes, minutesToTime } from "./parse.js";
import { renderFairnessPanel } from "./fairness.js";

const PIECE_MINUTES = 5;
const BREAK_MINUTES = 15;

let performers = [];       // [{slug, displayName}]
let slots = [];            // working schedule state
let nightDate = null;
let nightStatus = "draft";
let nextSlotId = 1;

const $ = (id) => document.getElementById(id);

function defaultNextFriday() {
  const d = new Date();
  const day = d.getDay();
  const add = (5 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + add);
  return d.toISOString().slice(0, 10);
}

// ---------- rendering ----------

function recomputeTimes() {
  let mins = timeToMinutes($("startTime").value || "19:00");
  for (const s of slots) {
    s.computedTime = minutesToTime(mins);
    mins += s.isBreak ? (s.minutes || BREAK_MINUTES) : (s.pieces || 1) * PIECE_MINUTES;
  }
}

function renderSchedule() {
  recomputeTimes();
  const list = $("scheduleList");
  list.innerHTML = "";
  $("emptyMsg").style.display = slots.length ? "none" : "block";

  let totalPieces = 0;
  for (const s of slots) {
    const li = document.createElement("li");
    li.className = "slot" + (s.isBreak ? " break-row" : "") + (s.flagged ? " flagged" : "");
    li.dataset.id = s.id;

    if (s.isBreak) {
      li.innerHTML = `
        <span class="handle no-print">⠿</span>
        <span class="time">${s.computedTime}</span>
        <span class="name">Break<small>${s.minutes} min</small></span>
        <span class="actions no-print">
          <button type="button" class="remove-btn" data-action="remove">✕</button>
        </span>`;
    } else {
      totalPieces += s.pieces;
      const names = s.names.join(" & ") || "(unnamed)";
      li.innerHTML = `
        <span class="handle no-print">⠿</span>
        <span class="time">${s.computedTime}</span>
        <span class="name">${names}<small>${s.pieces} piece${s.pieces === 1 ? "" : "s"}${s.notes ? " — " + s.notes : ""}</small></span>
        <span class="actions no-print">
          <span class="stepper">
            <button type="button" data-action="dec">−</button>
            <span>${s.pieces}</span>
            <button type="button" data-action="inc">+</button>
          </span>
          <button type="button" class="remove-btn" data-action="remove">✕</button>
        </span>`;
    }
    list.appendChild(li);
  }
  $("totalPieces").textContent = totalPieces ? `— ${totalPieces} pieces, ends ~${slots.length ? slots[slots.length - 1].computedTime : ""}` : "";
}

$("scheduleList").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const li = btn.closest("li.slot");
  const id = Number(li.dataset.id);
  const slot = slots.find(s => s.id === id);
  if (!slot) return;
  if (btn.dataset.action === "remove") {
    slots = slots.filter(s => s.id !== id);
  } else if (btn.dataset.action === "inc") {
    slot.pieces++;
  } else if (btn.dataset.action === "dec") {
    slot.pieces = Math.max(1, slot.pieces - 1);
  }
  renderSchedule();
});

new Sortable($("scheduleList"), {
  handle: ".handle",
  animation: 150,
  onEnd: () => {
    const ids = [...$("scheduleList").children].map(li => Number(li.dataset.id));
    slots.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    renderSchedule();
  }
});

// ---------- add performer form ----------

let piecesVal = 1;
$("piecesPlus").addEventListener("click", () => { piecesVal++; $("piecesVal").textContent = piecesVal; });
$("piecesMinus").addEventListener("click", () => { piecesVal = Math.max(1, piecesVal - 1); $("piecesVal").textContent = piecesVal; });

const nameInput = $("nameInput");
const acList = $("autocompleteList");
nameInput.addEventListener("input", () => {
  const q = nameInput.value.trim().toLowerCase();
  if (!q) { acList.hidden = true; return; }
  const matches = performers.filter(p => p.displayName.toLowerCase().includes(q)).slice(0, 8);
  if (!matches.length) { acList.hidden = true; return; }
  acList.innerHTML = matches.map(m => `<div data-name="${m.displayName}">${m.displayName}</div>`).join("");
  acList.hidden = false;
});
acList.addEventListener("click", (e) => {
  const div = e.target.closest("div[data-name]");
  if (!div) return;
  nameInput.value = div.dataset.name;
  acList.hidden = true;
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".autocomplete-wrap")) acList.hidden = true;
});

$("addBtn").addEventListener("click", () => {
  const name = nameInput.value.trim();
  if (!name) return;
  slots.push({
    id: nextSlotId++,
    isBreak: false,
    names: [name],
    pieces: piecesVal,
    pref: $("slotPref").value,
    flagged: false,
    notes: ""
  });
  nameInput.value = "";
  piecesVal = 1;
  $("piecesVal").textContent = "1";
  renderSchedule();
});

$("addBreakBtn").addEventListener("click", () => {
  slots.push({ id: nextSlotId++, isBreak: true, minutes: BREAK_MINUTES, names: [] });
  renderSchedule();
});

// ---------- auto-arrange ----------

$("autoArrangeBtn").addEventListener("click", () => {
  const performers = slots.filter(s => !s.isBreak);
  const already = slots.some(s => s.isBreak);
  const early = performers.filter(s => s.pref === "early");
  const mid = performers.filter(s => (s.pref || "mid") === "mid");
  const late = performers.filter(s => s.pref === "late");

  const ordered = [...early, ...mid, ...late];
  if (!already) {
    // insert a break near the ~90 minute mark (end of the "early" group, or halfway if no prefs given)
    const insertAt = early.length || Math.ceil(ordered.length / 2);
    ordered.splice(insertAt, 0, { id: nextSlotId++, isBreak: true, minutes: BREAK_MINUTES, names: [] });
  } else {
    // keep existing break(s) in place relative to their group
    const breaks = slots.filter(s => s.isBreak);
    const insertAt = early.length || Math.ceil(ordered.length / 2);
    ordered.splice(insertAt, 0, ...breaks);
  }
  slots = ordered;
  renderSchedule();
});

// ---------- save / load ----------

function slotToDoc(s, i) {
  return {
    order: i,
    isBreak: !!s.isBreak,
    performerText: s.names ? s.names.join(" & ") : "",
    performerSlugs: (s.names || []).map(slugify),
    pieces: s.isBreak ? null : (s.pieces || 1),
    minutes: s.isBreak ? (s.minutes || BREAK_MINUTES) : (s.pieces || 1) * PIECE_MINUTES,
    computedTime: s.computedTime || null,
    flagged: !!s.flagged,
    raw: s.raw || null,
    notes: s.notes || ""
  };
}

$("saveBtn").addEventListener("click", async () => {
  const date = $("nightDate").value;
  if (!date) { alert("Pick a date first."); return; }
  recomputeTimes();
  $("saveBtn").disabled = true;
  try {
    await setDoc(doc(db, "nights", date), {
      date,
      mc: $("mcName").value.trim(),
      startTime: $("startTime").value || "19:00",
      status: nightStatus,
      updatedAt: serverTimestamp()
    }, { merge: true });

    const slotsCol = collection(db, "nights", date, "slots");
    const existing = await getDocs(slotsCol);
    const batch = writeBatch(db);
    existing.docs.forEach(d => batch.delete(d.ref));
    slots.forEach((s, i) => {
      batch.set(doc(slotsCol, String(i)), slotToDoc(s, i));
    });
    await batch.commit();

    for (const s of slots) {
      for (const n of (s.names || [])) await upsertPerformer(n);
    }
    performers = await loadPerformers();
    nightDate = date;
    alert("Saved.");
  } catch (err) {
    console.error(err);
    alert("Save failed — see console.");
  } finally {
    $("saveBtn").disabled = false;
  }
});

$("loadNightBtn").addEventListener("click", () => loadNight($("nightDate").value));

async function loadNight(date) {
  if (!date) return;
  const nightSnap = await getDoc(doc(db, "nights", date));
  if (!nightSnap.exists()) {
    slots = [];
    nightStatus = "draft";
    $("statusPill").textContent = "draft";
    renderSchedule();
    return;
  }
  const data = nightSnap.data();
  $("mcName").value = data.mc || "";
  $("startTime").value = data.startTime || "19:00";
  nightStatus = data.status || "draft";
  $("statusPill").textContent = nightStatus;
  $("statusPill").className = "pill " + nightStatus;

  const slotsSnap = await getDocs(collection(db, "nights", date, "slots"));
  slots = slotsSnap.docs
    .map(d => d.data())
    .sort((a, b) => a.order - b.order)
    .map(d => ({
      id: nextSlotId++,
      isBreak: d.isBreak,
      names: d.performerText ? d.performerText.split(" & ") : [],
      pieces: d.pieces || 1,
      minutes: d.minutes,
      flagged: d.flagged,
      raw: d.raw,
      notes: d.notes || ""
    }));
  renderSchedule();
}

// ---------- print ----------

$("printBtn").addEventListener("click", () => {
  $("printDate").textContent = $("nightDate").value
    ? new Date($("nightDate").value + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "";
  $("printMc").textContent = $("mcName").value ? `MC: ${$("mcName").value}` : "";
  window.print();
});

// ---------- fairness panel ----------

$("toggleFairness").addEventListener("click", () => {
  const body = $("fairnessBody");
  const hidden = body.style.display === "none";
  body.style.display = hidden ? "block" : "none";
  $("toggleFairness").textContent = hidden ? "Hide" : "Show";
  localStorage.setItem("fnl_fairness_hidden", hidden ? "0" : "1");
});
if (localStorage.getItem("fnl_fairness_hidden") === "1") {
  $("fairnessBody").style.display = "none";
  $("toggleFairness").textContent = "Show";
}

// ---------- init ----------

(async function init() {
  $("nightDate").value = defaultNextFriday();
  performers = await loadPerformers();
  renderSchedule();
  await loadNight($("nightDate").value);
  renderFairnessPanel($("fairnessList"));
})();
