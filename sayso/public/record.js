// Live recording controller: Hold mode (press/hold/flick) and Auto mode (VAD).
//
// One segment is open at a time. Pause/resume append into the SAME MediaRecorder
// recording, so the audio is continuous; closing the segment stops the recorder,
// assembles one blob, and sends it. Audio stays in memory only until its
// transcript returns (or is discarded on a fresh capture).

import { transcribeBlob, PROMPT_CONTEXT } from "./api.js?v=7";
import * as store from "./store.js?v=7";
import { addUsage } from "./cost.js?v=7";

const recordBtn = document.getElementById("record-btn");
const recordLabel = document.getElementById("record-label");
const sendBtn = document.getElementById("send-btn");
const hint = document.getElementById("record-hint");
const levelFill = document.getElementById("level-fill");

// Gesture tuning for Hold mode. The swipe-to-send is distance-based (no time
// window), so you can hold and talk for as long as you like, then swipe up.
const SEND_DISTANCE = 100; // px of upward travel that commits a send
const DRAG_DEAD_ZONE = 12; // ignore small wobble while talking
const DRAG_MAX = 150; // px over which the button shrinks to its smallest
// Voice activity: amplitude below this (RMS, 0–1) counts as silence.
const SILENCE_RMS = 0.014;

let mode = "hold";
let getSilenceThreshold = () => 5;
let getMultiSpeaker = () => false;

// Duration accounting for the open segment (sum of active recording intervals).
let segmentMs = 0;
let recStartAt = 0;

// Audio graph (created lazily on first use, then reused).
let stream = null;
let audioCtx = null;
let analyser = null;
let vadRaf = null;

// Recording state.
let recorder = null;
let chunks = [];
let mime = "";
let openSeq = null; // sequence of the currently-open segment, or null
let phase = "idle"; // idle | recording | paused | sending

// Hold-gesture bookkeeping.
let pressStartY = 0;
let flicked = false;

let silenceTimer = null;

export function initRecord(opts) {
  getSilenceThreshold = opts.getSilenceThreshold || getSilenceThreshold;
  getMultiSpeaker = opts.getMultiSpeaker || getMultiSpeaker;
  setMode(mode);

  // Hold-mode pointer gestures.
  recordBtn.addEventListener("pointerdown", onPointerDown);
  recordBtn.addEventListener("pointermove", onPointerMove);
  recordBtn.addEventListener("pointerup", onPointerUp);
  recordBtn.addEventListener("pointercancel", onPointerUp);

  // Auto-mode taps.
  recordBtn.addEventListener("click", onAutoClick);
  sendBtn.addEventListener("click", () => {
    if (mode === "auto") closeAndSend();
  });
}

export function setMode(next) {
  mode = next;
  // Reset any in-flight capture when switching modes.
  hardReset();
  document.querySelectorAll(".mode-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.mode === mode);
  });
  sendBtn.hidden = mode !== "auto";
  if (mode === "hold") {
    recordLabel.textContent = "Hold";
    hint.textContent = "Press & hold to record. Flick up to send.";
  } else {
    recordLabel.textContent = "Record";
    hint.textContent = "Tap to record. Pauses on silence, or tap Send.";
  }
}

// ---------------------------------------------------------------------------
// Microphone + audio graph
// ---------------------------------------------------------------------------

async function ensureStream() {
  if (stream) return true;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    toast("Microphone permission denied.");
    return false;
  }
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaStreamSource(stream);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  return true;
}

function pickMime() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const c of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

function filenameForMime(m) {
  if (m.includes("webm")) return "audio.webm";
  if (m.includes("mp4")) return "audio.mp4";
  if (m.includes("ogg")) return "audio.ogg";
  return "audio.webm";
}

// ---------------------------------------------------------------------------
// Core recording lifecycle
// ---------------------------------------------------------------------------

async function startRecording() {
  if (!(await ensureStream())) return;
  if (audioCtx.state === "suspended") await audioCtx.resume();

  mime = pickMime();
  chunks = [];
  recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  recorder.start();

  segmentMs = 0;
  recStartAt = Date.now();
  openSeq = store.createSegment({ status: "recording" });
  phase = "recording";
  paintPhase();
  startVadLoop(); // drives the level meter in both modes
}

function pauseRecording() {
  if (!recorder || phase !== "recording") return;
  recorder.pause();
  if (recStartAt) {
    segmentMs += Date.now() - recStartAt;
    recStartAt = 0;
  }
  phase = "paused";
  cancelSilenceTimer();
  paintPhase();
}

function resumeRecording() {
  if (!recorder || phase !== "paused") return;
  recorder.resume();
  recStartAt = Date.now();
  phase = "recording";
  paintPhase();
}

// Close the open segment: stop the recorder, assemble one blob, send it.
function closeAndSend() {
  if (!recorder || (phase !== "recording" && phase !== "paused")) return;
  const seq = openSeq;
  const usedMime = mime;
  if (phase === "recording" && recStartAt) {
    segmentMs += Date.now() - recStartAt;
    recStartAt = 0;
  }
  const durationSec = segmentMs / 1000;
  phase = "sending";
  cancelSilenceTimer();
  paintPhase();

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: usedMime || "audio/webm" });
    chunks = [];
    recorder = null;
    openSeq = null;
    phase = "idle";
    paintPhase();
    sendSegment(blob, seq, filenameForMime(usedMime), durationSec);
  };
  recorder.stop();
}

async function sendSegment(blob, seq, filename, durationSec) {
  store.setStatus(seq, "sending");
  // Hold the blob in this closure so a failed segment can be retried.
  store.setRetry(seq, () => doSend(blob, seq, filename, durationSec));
  await doSend(blob, seq, filename, durationSec);
}

async function doSend(blob, seq, filename, durationSec) {
  const multiSpeaker = getMultiSpeaker();
  try {
    const text = await transcribeBlob(blob, {
      prompt: PROMPT_CONTEXT,
      language: "en",
      filename,
      multiSpeaker,
    });
    store.setText(seq, text); // also releases the blob (retry cleared)
    addUsage(durationSec, multiSpeaker);
  } catch (err) {
    store.fail(seq, err.detail ? `${err.message} — ${err.detail}` : err.message);
    if (err.status === 429) toast("Rate limit reached — wait a moment.");
  }
}

function hardReset() {
  cancelSilenceTimer();
  if (recorder && recorder.state !== "inactive") {
    try {
      recorder.onstop = null;
      recorder.stop();
    } catch {}
  }
  recorder = null;
  chunks = [];
  openSeq = null;
  phase = "idle";
  flicked = false;
  segmentMs = 0;
  recStartAt = 0;
  clearButtonDrag();
  paintPhase();
}

// ---------------------------------------------------------------------------
// Hold mode gestures
// ---------------------------------------------------------------------------

function onPointerDown(e) {
  if (mode !== "hold") return;
  e.preventDefault();
  recordBtn.setPointerCapture?.(e.pointerId);
  flicked = false;
  pressStartY = e.clientY;
  clearButtonDrag(); // start from rest

  if (phase === "idle") startRecording();
  else if (phase === "paused") resumeRecording();
}

function onPointerMove(e) {
  if (mode !== "hold" || flicked) return;
  if (phase !== "recording") return;
  const dy = pressStartY - e.clientY; // upward is positive
  const up = dy - DRAG_DEAD_ZONE;
  if (up <= 0) {
    setButtonDrag(0);
    return;
  }
  setButtonDrag(up); // button follows the finger, shrinking as it rises
  if (up >= SEND_DISTANCE) {
    flicked = true;
    flyAwayAndSend(); // committed swipe — fling it off and send
  }
}

function onPointerUp(e) {
  if (mode !== "hold") return;
  recordBtn.releasePointerCapture?.(e.pointerId);
  if (flicked) {
    flicked = false;
    return; // the swipe already sent; fly-away handles the button
  }
  springBack(); // a plain lift = pause; ease the button back to rest
  if (phase === "recording") pauseRecording();
}

// ---------------------------------------------------------------------------
// Swipe animation: button follows the finger, then flings away on send.
// ---------------------------------------------------------------------------

function setButtonDrag(up) {
  const clamped = Math.min(up, DRAG_MAX);
  const t = clamped / DRAG_MAX;
  recordBtn.style.transition = "none";
  recordBtn.style.transform = `translateY(${-clamped}px) scale(${1 - t * 0.55})`;
  recordBtn.style.opacity = String(1 - t * 0.4);
}

function flyAwayAndSend() {
  recordBtn.style.transition = "transform 0.28s cubic-bezier(.4,0,.6,1), opacity 0.28s";
  recordBtn.style.transform = "translateY(-260px) scale(0.08)";
  recordBtn.style.opacity = "0";
  setTimeout(reappear, 300);
  closeAndSend();
}

// After the button flings away, grow it back in from the centre so it's clearly
// a fresh button re-emerging (not a failed send that never left).
function reappear() {
  // Snap back to centre, tiny and invisible, with no transition…
  recordBtn.style.transition = "none";
  recordBtn.style.transform = "translateY(0) scale(0.15)";
  recordBtn.style.opacity = "0";
  void recordBtn.offsetWidth; // force reflow so the next change animates
  // …then pop back to full size with a slight overshoot.
  recordBtn.style.transition = "transform 0.65s cubic-bezier(.34,1.35,.5,1), opacity 0.5s ease";
  recordBtn.style.transform = "translateY(0) scale(1)";
  recordBtn.style.opacity = "1";
  setTimeout(clearButtonDrag, 680);
}

function springBack() {
  recordBtn.style.transition = "transform 0.18s ease, opacity 0.18s ease";
  recordBtn.style.transform = "";
  recordBtn.style.opacity = "";
  setTimeout(clearButtonDrag, 220);
}

function clearButtonDrag() {
  recordBtn.style.transition = "";
  recordBtn.style.transform = "";
  recordBtn.style.opacity = "";
}

// ---------------------------------------------------------------------------
// Auto mode
// ---------------------------------------------------------------------------

function onAutoClick() {
  if (mode !== "auto") return;
  if (phase === "idle") startRecording();
  else if (phase === "recording") pauseRecording();
  else if (phase === "paused") resumeRecording();
}

// ---------------------------------------------------------------------------
// Voice activity detection + level meter
// ---------------------------------------------------------------------------

function startVadLoop() {
  if (vadRaf) return;
  const buf = new Float32Array(analyser.fftSize);
  let silentSince = 0;

  const tick = () => {
    if (!analyser) return;
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const rms = Math.sqrt(sum / buf.length);
    levelFill.style.width = `${Math.min(100, rms * 400)}%`;

    if (mode === "auto" && phase === "recording") {
      const now = Date.now();
      if (rms < SILENCE_RMS) {
        if (!silentSince) silentSince = now;
        if (now - silentSince >= getSilenceThreshold() * 1000) {
          silentSince = 0;
          closeAndSend(); // sustained silence auto-sends
        }
      } else {
        silentSince = 0;
      }
    } else {
      silentSince = 0;
    }

    if (phase === "recording" || phase === "paused") {
      vadRaf = requestAnimationFrame(tick);
    } else {
      vadRaf = null;
      levelFill.style.width = "0%";
    }
  };
  vadRaf = requestAnimationFrame(tick);
}

function cancelSilenceTimer() {
  clearTimeout(silenceTimer);
  silenceTimer = null;
}

// ---------------------------------------------------------------------------
// Visual state
// ---------------------------------------------------------------------------

function paintPhase() {
  recordBtn.classList.remove("recording", "sending", "paused");
  if (phase === "recording") recordBtn.classList.add("recording");
  else if (phase === "sending") recordBtn.classList.add("sending");
  else if (phase === "paused") recordBtn.classList.add("paused");

  if (mode === "hold") {
    recordLabel.textContent =
      phase === "recording" ? "●" : phase === "paused" ? "Resume" : phase === "sending" ? "…" : "Hold";
  } else {
    recordLabel.textContent =
      phase === "recording" ? "Pause" : phase === "paused" ? "Resume" : phase === "sending" ? "…" : "Record";
  }
}

function toast(msg) {
  window.saysoToast?.(msg);
}
