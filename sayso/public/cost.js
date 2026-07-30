// Running cost estimate = transcribed audio time × per-minute rate.
// Persisted in localStorage (just two numbers — no transcript content) so the
// total survives reloads until the user resets it.

const RATE = { normal: 0.0045, diarize: 0.006 }; // USD per audio minute
const KEY = "sayso_cost_v1";

let seconds = 0; // total transcribed audio seconds
let cost = 0; // accumulated USD (rates differ per request, so store the sum)
let valueEl = null;

export function initCost() {
  valueEl = document.getElementById("cost-value");
  const resetBtn = document.getElementById("cost-reset");
  if (resetBtn) resetBtn.addEventListener("click", reset);
  load();
  render();
}

// Record one successful transcription's audio duration and which model billed it.
export function addUsage(sec, multiSpeaker) {
  if (!sec || sec < 0 || !isFinite(sec)) return;
  seconds += sec;
  cost += (sec / 60) * (multiSpeaker ? RATE.diarize : RATE.normal);
  save();
  render();
}

function reset() {
  seconds = 0;
  cost = 0;
  save();
  render();
  window.saysoToast?.("Cost estimate reset.");
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "{}");
    seconds = Number(s.seconds) || 0;
    cost = Number(s.cost) || 0;
  } catch {
    seconds = 0;
    cost = 0;
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ seconds, cost }));
  } catch {
    /* ignore quota/private-mode errors */
  }
}

function render() {
  if (!valueEl) return;
  valueEl.textContent = `≈ $${cost.toFixed(3)} · ${formatTime(seconds)}`;
}

function formatTime(sec) {
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m ? `${m}m ${r}s` : `${r}s`;
}
