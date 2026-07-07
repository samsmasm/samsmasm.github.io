import {
  db, doc, collection, setDoc, writeBatch, serverTimestamp, slugify, upsertPerformer
} from "./firebase.js";
import { parseEntry, minutesToTime, timeToMinutes } from "./parse.js";

const $ = (id) => document.getElementById(id);
let nightsData = []; // [{ id, dateRaw, dateIso, dateValid, mc, rows: [entry...] }]

// ---------- CSV parsing (handles quoted fields with embedded commas) ----------

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ""; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function parseDateHeader(header) {
  const m = header.match(/^\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*(?:\(([^)]+)\))?/);
  if (!m) return { dateRaw: header, dateIso: null, valid: false, mc: "" };
  const [, dd, mm, yyRaw, mc] = m;
  let year = yyRaw;
  if (year.length === 2) year = "20" + year;
  const valid = year.length === 4 && +mm >= 1 && +mm <= 12 && +dd >= 1 && +dd <= 31;
  const dateIso = valid ? `${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}` : null;
  return { dateRaw: header, dateIso, valid, mc: mc || "" };
}

function buildNights(rows) {
  const header = rows[0];
  const dataRows = rows.slice(1);
  const nights = [];

  let i = 0;
  while (i < header.length) {
    const h = (header[i] || "").trim();
    if (!h || h === "#" || /^time$/i.test(h)) { i++; continue; }

    const { dateRaw, dateIso, valid, mc } = parseDateHeader(h);
    const hasHashTime = (header[i + 1] || "").trim() === "#" && /^time$/i.test((header[i + 2] || "").trim());

    const parsedRows = [];
    for (const r of dataRows) {
      const cell = (r[i] || "").trim();
      const explicitTime = hasHashTime ? (r[i + 2] || "").trim() : "";
      if (!cell) continue;
      const entry = parseEntry(cell);
      if (!entry) continue;
      entry.explicitTime = explicitTime || null;
      parsedRows.push(entry);
    }

    if (parsedRows.length) {
      nights.push({
        id: `night-${i}`,
        dateRaw, dateIso, dateValid: valid, mc,
        include: valid,
        rows: parsedRows
      });
    }
    i += hasHashTime ? 3 : 1;
  }
  return nights;
}

// ---------- rendering ----------

function rowHtml(nightId, idx, entry) {
  const names = (entry.names || []).join(" & ");
  const flagClass = entry.flagged ? "flagged" : "";
  return `
    <tr class="${entry.flagged ? "flagged" : ""}" data-night="${nightId}" data-idx="${idx}">
      <td><input type="checkbox" class="row-include" ${entry.skip ? "" : "checked"}></td>
      <td><input type="checkbox" class="row-break" ${entry.isBreak ? "checked" : ""}></td>
      <td><input type="text" class="row-names" value="${names.replace(/"/g, "&quot;")}" autocomplete="fnl-no-suggest" autocorrect="off" autocapitalize="off" spellcheck="false" ${entry.isBreak ? "disabled" : ""}></td>
      <td><input type="number" min="1" class="row-pieces" value="${entry.pieces || 1}" style="width:60px" ${entry.isBreak ? "disabled" : ""}></td>
      <td><input type="text" class="row-time" value="${entry.explicitTime || ""}" style="width:70px" placeholder="auto"></td>
      <td class="muted">${entry.flagged ? (entry.notes || "check") : ""}</td>
      <td class="muted">${entry.raw}</td>
    </tr>`;
}

function renderNight(night) {
  const flaggedCount = night.rows.filter(r => r.flagged).length;
  return `
    <div class="card night-block" data-night-id="${night.id}">
      <div class="night-head">
        <label><input type="checkbox" class="night-include" ${night.include ? "checked" : ""}> Import this night</label>
        <label>Date: <input type="text" class="night-date" value="${night.dateIso || ""}" placeholder="YYYY-MM-DD" style="width:120px"></label>
        <label>MC: <input type="text" class="night-mc" value="${night.mc || ""}" style="width:100px" autocomplete="fnl-no-suggest" autocorrect="off" autocapitalize="off" spellcheck="false"></label>
        <span class="muted">from column "${night.dateRaw}"</span>
        ${!night.dateValid ? '<span class="pill draft">date needs fixing</span>' : ""}
        ${flaggedCount ? `<span class="pill draft">${flaggedCount} flagged row${flaggedCount === 1 ? "" : "s"}</span>` : ""}
      </div>
      <table class="review">
        <thead><tr><th>Incl.</th><th>Break?</th><th>Names</th><th>Pieces</th><th>Time</th><th>Flag</th><th>Raw</th></tr></thead>
        <tbody>${night.rows.map((r, idx) => rowHtml(night.id, idx, r)).join("")}</tbody>
      </table>
    </div>`;
}

function renderAll() {
  $("reviewArea").innerHTML = nightsData.map(renderNight).join("");
  $("importBar").style.display = nightsData.length ? "block" : "none";
  wireEvents();
}

function wireEvents() {
  document.querySelectorAll(".night-block").forEach(block => {
    const nightId = block.dataset.nightId;
    const night = nightsData.find(n => n.id === nightId);

    block.querySelector(".night-include").addEventListener("change", (e) => night.include = e.target.checked);
    block.querySelector(".night-date").addEventListener("input", (e) => night.dateIsoOverride = e.target.value.trim());
    block.querySelector(".night-mc").addEventListener("input", (e) => night.mcOverride = e.target.value.trim());

    block.querySelectorAll("tbody tr").forEach(tr => {
      const idx = Number(tr.dataset.idx);
      const row = night.rows[idx];
      tr.querySelector(".row-include").addEventListener("change", (e) => row.skip = !e.target.checked);
      tr.querySelector(".row-break").addEventListener("change", (e) => { row.isBreak = e.target.checked; });
      tr.querySelector(".row-names").addEventListener("input", (e) => { row.names = e.target.value.split(/\s*&\s*/).filter(Boolean); });
      tr.querySelector(".row-pieces").addEventListener("input", (e) => { row.pieces = Math.max(1, parseInt(e.target.value, 10) || 1); });
      tr.querySelector(".row-time").addEventListener("input", (e) => { row.explicitTime = e.target.value.trim() || null; });
    });
  });
}

// ---------- import ----------

async function importNight(night) {
  const dateIso = night.dateIsoOverride || night.dateIso;
  if (!dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) throw new Error(`Bad date for column "${night.dateRaw}"`);

  const mc = night.mcOverride ?? night.mc ?? "";
  await setDoc(doc(db, "nights", dateIso), {
    date: dateIso, mc, startTime: "19:00", status: "final",
    imported: true, updatedAt: serverTimestamp()
  }, { merge: true });

  const slotsCol = collection(db, "nights", dateIso, "slots");
  const batch = writeBatch(db);
  let mins = timeToMinutes("19:00");
  let order = 0;
  const included = night.rows.filter(r => !r.skip);
  for (const r of included) {
    const computedTime = r.explicitTime || minutesToTime(mins);
    batch.set(doc(slotsCol, String(order)), {
      order,
      isBreak: !!r.isBreak,
      performerText: (r.names || []).join(" & "),
      performerSlugs: (r.names || []).map(slugify),
      pieces: r.isBreak ? null : (r.pieces || 1),
      minutes: r.isBreak ? 15 : (r.pieces || 1) * 5,
      computedTime,
      flagged: !!r.flagged,
      raw: r.raw || null,
      notes: r.notes || ""
    });
    mins += r.isBreak ? 15 : (r.pieces || 1) * 5;
    order++;
    for (const n of (r.names || [])) await upsertPerformer(n);
  }
  await batch.commit();
}

$("importAllBtn").addEventListener("click", async () => {
  $("importAllBtn").disabled = true;
  const status = $("importStatus");
  let ok = 0, fail = 0;
  for (const night of nightsData) {
    if (!night.include) continue;
    try {
      await importNight(night);
      ok++;
    } catch (err) {
      console.error(err);
      fail++;
    }
    status.textContent = `Imported ${ok}, failed ${fail}...`;
  }
  status.textContent = `Done — imported ${ok} night(s), ${fail} failed.`;
  $("importAllBtn").disabled = false;
});

$("fileInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  const rows = parseCSV(text);
  nightsData = buildNights(rows);
  renderAll();
});
