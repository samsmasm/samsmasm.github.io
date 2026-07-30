// Shared transcript store. The browser is the source of truth for ordering and
// the reassembled fullText; the Worker only persists a text copy to KV.
//
// Audio never lives here. A failed segment's blob is held transiently inside its
// retry closure (in the recording/upload controller) and released on success.

import { apiJson } from "./api.js?v=7";

const segmentsEl = document.getElementById("segments");
const emptyNote = document.getElementById("empty-note");

let state = null; // { sessionId, createdAt, type, seq, segments: Map }
let getRetentionDays = () => 14;
let saveTimer = null;

export function configureStore(opts) {
  getRetentionDays = opts.getRetentionDays || getRetentionDays;
}

let deletedExpanded = false;

export function newSession(type) {
  state = {
    sessionId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    type,
    seq: 0,
    segments: new Map(), // sequence -> { sequence, text, status, capturedAt, retry }
    deleted: [], // { sequence, text, status, capturedAt, deletedAt }
  };
  render();
}

export function ensureSession(type) {
  if (!state) newSession(type);
  return state;
}

// Create a segment placeholder and return its sequence number. `retry` is an
// async function that re-attempts the send for this segment.
export function createSegment({ status = "sending", retry = null } = {}) {
  ensureSession(state?.type || "live");
  const sequence = ++state.seq;
  state.segments.set(sequence, {
    sequence,
    text: "",
    status,
    capturedAt: new Date().toISOString(),
    retry,
  });
  render();
  return sequence;
}

export function setRetry(sequence, retry) {
  const seg = state?.segments.get(sequence);
  if (seg) seg.retry = retry;
}

export function setStatus(sequence, status) {
  const seg = state?.segments.get(sequence);
  if (!seg) return;
  seg.status = status;
  render();
}

export function setText(sequence, text) {
  const seg = state?.segments.get(sequence);
  if (!seg) return;
  seg.text = text;
  seg.status = "complete";
  seg.retry = null; // release the audio blob held in the retry closure
  render();
  scheduleSave();
}

export function fail(sequence, message) {
  const seg = state?.segments.get(sequence);
  if (!seg) return;
  seg.status = "failed";
  seg.error = message || "";
  render();
}

// Move a settled block into the "Deleted sections" area (kept 24h, then purged).
export function deleteSegment(sequence) {
  const seg = state?.segments.get(sequence);
  if (!seg) return;
  if (seg.status !== "complete" && seg.status !== "failed") return;
  state.segments.delete(sequence);
  state.deleted.push({ ...seg, retry: null, deletedAt: Date.now() });
  render();
  scheduleSave();
}

export function restoreSegment(sequence) {
  if (!state) return;
  const idx = state.deleted.findIndex((d) => d.sequence === sequence);
  if (idx === -1) return;
  const [seg] = state.deleted.splice(idx, 1);
  delete seg.deletedAt;
  state.segments.set(seg.sequence, seg);
  render();
  scheduleSave();
}

function purgeDeleted() {
  if (!state || !state.deleted.length) return;
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  state.deleted = state.deleted.filter((d) => d.deletedAt > cutoff);
}

export function getFullText() {
  if (!state) return "";
  return [...state.segments.values()]
    .filter((s) => s.status === "complete" && s.text.trim())
    .sort((a, b) => a.sequence - b.sequence)
    .map((s) => s.text.trim())
    .join("\n\n");
}

// ---------------------------------------------------------------------------
// Persistence (debounced full-record PUT — single writer, no races)
// ---------------------------------------------------------------------------

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 800);
}

async function saveNow() {
  if (!state) return;
  const record = {
    sessionId: state.sessionId,
    createdAt: state.createdAt,
    type: state.type,
    retentionDays: getRetentionDays(),
    segments: [...state.segments.values()].map((s) => ({
      sequence: s.sequence,
      text: s.text,
      capturedAt: s.capturedAt,
      status: s.status === "complete" ? "complete" : "failed",
    })),
    fullText: getFullText(),
  };
  try {
    await apiJson("/session", "PUT", record);
  } catch {
    // Persistence is best-effort; the on-screen copy remains authoritative.
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function render() {
  purgeDeleted();
  const segs = state ? [...state.segments.values()].sort((a, b) => a.sequence - b.sequence) : [];
  const deleted = state ? state.deleted : [];
  emptyNote.hidden = segs.length > 0 || deleted.length > 0;

  // Rebuild everything except the static empty note.
  [...segmentsEl.querySelectorAll(".segment, .deleted-section")].forEach((n) => n.remove());

  for (const seg of segs) {
    segmentsEl.appendChild(buildSegment(seg, false));
  }

  if (deleted.length) {
    segmentsEl.appendChild(buildDeletedSection(deleted));
  }
  segmentsEl.scrollTop = segmentsEl.scrollHeight;
}

function buildSegment(seg, isDeleted) {
  const el = document.createElement("div");
  el.className = "segment" + (isDeleted ? " deleted" : "");

  const text = document.createElement("div");
  text.className = "seg-text";
  text.textContent = seg.text || placeholderFor(seg.status);
  if (!seg.text) text.classList.add("muted");
  el.appendChild(text);

  const meta = document.createElement("div");
  meta.className = "seg-meta";

  const status = document.createElement("span");
  status.className = `seg-status ${seg.status}`;
  status.textContent = labelFor(seg.status);
  meta.appendChild(status);

  const num = document.createElement("span");
  num.textContent = `#${seg.sequence}`;
  meta.appendChild(num);

  if (!isDeleted && seg.status === "failed" && seg.retry) {
    const retryBtn = document.createElement("button");
    retryBtn.className = "retry-btn";
    retryBtn.textContent = "Retry";
    retryBtn.onclick = () => {
      setStatus(seg.sequence, "sending");
      seg.retry();
    };
    meta.appendChild(retryBtn);
  }

  if (isDeleted) {
    const restoreBtn = document.createElement("button");
    restoreBtn.className = "retry-btn";
    restoreBtn.textContent = "Restore";
    restoreBtn.onclick = () => restoreSegment(seg.sequence);
    meta.appendChild(restoreBtn);
  }

  el.appendChild(meta);

  if (seg.status === "failed" && seg.error) {
    const errLine = document.createElement("div");
    errLine.className = "seg-error";
    errLine.textContent = seg.error;
    el.appendChild(errLine);
  }

  // Corner × to delete a settled block (not while recording/sending).
  if (!isDeleted && (seg.status === "complete" || seg.status === "failed")) {
    const del = document.createElement("button");
    del.className = "seg-del";
    del.setAttribute("aria-label", "Delete block");
    del.textContent = "✕";
    del.onclick = () => deleteSegment(seg.sequence);
    el.appendChild(del);
  }

  return el;
}

function buildDeletedSection(deleted) {
  const wrap = document.createElement("div");
  wrap.className = "deleted-section";

  const toggle = document.createElement("button");
  toggle.className = "deleted-toggle";
  toggle.textContent = `${deletedExpanded ? "▾" : "▸"} Deleted sections (${deleted.length})`;
  toggle.onclick = () => {
    deletedExpanded = !deletedExpanded;
    render();
  };
  wrap.appendChild(toggle);

  if (deletedExpanded) {
    const list = document.createElement("div");
    list.className = "deleted-list";
    for (const seg of deleted) {
      list.appendChild(buildSegment(seg, true));
    }
    const note = document.createElement("p");
    note.className = "muted small";
    note.textContent = "Deleted blocks clear automatically after 24 hours.";
    list.appendChild(note);
    wrap.appendChild(list);
  }
  return wrap;
}

function labelFor(status) {
  return {
    recording: "recording…",
    sending: "sending…",
    complete: "✓ done",
    failed: "✗ failed",
  }[status] || status;
}

function placeholderFor(status) {
  if (status === "recording") return "listening…";
  if (status === "sending") return "transcribing…";
  if (status === "failed") return "(no transcript — retry)";
  return "";
}

export { render };
