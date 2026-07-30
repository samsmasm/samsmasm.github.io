// File-upload controller. Files under 25MB go straight to the Worker. Larger
// files are split in the browser with single-threaded ffmpeg.wasm (no
// SharedArrayBuffer / COEP needed) into small speech-optimised mp3 chunks.
// Audio is only ever read locally and POSTed once per chunk for transcription.

import { transcribeBlob, PROMPT_CONTEXT } from "./api.js?v=8";
import * as store from "./store.js?v=8";
import { addUsage } from "./cost.js?v=8";

const dropEl = document.getElementById("drop");
const fileInput = document.getElementById("file-input");
const progressEl = document.getElementById("upload-progress");

let getMultiSpeaker = () => false;

// Keep chunks comfortably under the 25MB API limit. 64kbps mono @ ~1500s ≈ 12MB.
const DIRECT_LIMIT = 24 * 1024 * 1024;
const SEGMENT_SECONDS = 1500;

const FFMPEG_VER = "0.12.10";
const CORE_VER = "0.12.6";
const UTIL_VER = "0.12.1";

let ffmpeg = null;

export function initUpload(opts = {}) {
  getMultiSpeaker = opts.getMultiSpeaker || getMultiSpeaker;
  dropEl.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
    fileInput.value = "";
  });

  ["dragenter", "dragover"].forEach((ev) =>
    dropEl.addEventListener(ev, (e) => {
      e.preventDefault();
      dropEl.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((ev) =>
    dropEl.addEventListener(ev, (e) => {
      e.preventDefault();
      dropEl.classList.remove("dragover");
    })
  );
  dropEl.addEventListener("drop", (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  });
}

async function handleFile(file) {
  store.newSession("upload");
  progressEl.hidden = false;
  progressEl.innerHTML = "";

  const totalDuration = await getDuration(file); // seconds, for the cost estimate

  try {
    if (file.size <= DIRECT_LIMIT) {
      setStatus(`Uploading ${file.name}…`);
      await sendChunk(file, file.name, "", totalDuration);
      setStatus("Done.");
      return;
    }

    setStatus("Loading splitter…");
    await loadFfmpeg();

    setStatus("Splitting audio (this can take a minute for long files)…");
    const chunks = await splitFile(file);

    let prevTail = "";
    for (let i = 0; i < chunks.length; i++) {
      setStatus(`Transcribing chunk ${i + 1} of ${chunks.length}…`);
      const prompt = prevTail
        ? `${PROMPT_CONTEXT} Continuing from: …${prevTail}`
        : PROMPT_CONTEXT;
      const chunkDur =
        i < chunks.length - 1
          ? SEGMENT_SECONDS
          : Math.max(0, totalDuration - SEGMENT_SECONDS * (chunks.length - 1));
      const text = await sendChunk(chunks[i], `chunk_${i}.mp3`, prompt, chunkDur);
      prevTail = lastWords(text, 200);
    }
    setStatus("Done.");
  } catch (err) {
    setStatus(`Error: ${err.message}`);
  }
}

// Send one blob; returns its transcript text (or "" on failure).
async function sendChunk(blob, filename, prompt, durationSec) {
  const seq = store.createSegment({ status: "sending" });
  store.setRetry(seq, () => doSend(blob, filename, prompt, seq, durationSec));
  return doSend(blob, filename, prompt, seq, durationSec);
}

async function doSend(blob, filename, prompt, seq, durationSec) {
  store.setStatus(seq, "sending");
  const multiSpeaker = getMultiSpeaker();
  try {
    const text = await transcribeBlob(blob, {
      prompt: prompt || PROMPT_CONTEXT,
      language: "en",
      filename,
      multiSpeaker,
    });
    store.setText(seq, text);
    addUsage(durationSec, multiSpeaker);
    return text;
  } catch (err) {
    store.fail(seq, err.detail ? `${err.message} — ${err.detail}` : err.message);
    if (err.status === 429) window.saysoToast?.("Rate limit reached — wait a moment.");
    return "";
  }
}

// Read an audio file's duration (seconds) via a throwaway <audio> element.
function getDuration(file) {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const audio = document.createElement("audio");
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(isFinite(audio.duration) ? audio.duration : 0);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };
      audio.src = url;
    } catch {
      resolve(0);
    }
  });
}

// ---------------------------------------------------------------------------
// ffmpeg.wasm (loaded lazily from CDN, single-thread core)
// ---------------------------------------------------------------------------

async function loadFfmpeg() {
  if (ffmpeg) return;
  const ffBase = `https://unpkg.com/@ffmpeg/ffmpeg@${FFMPEG_VER}/dist/esm`;
  const coreBase = `https://unpkg.com/@ffmpeg/core@${CORE_VER}/dist/esm`;
  const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
    import(`${ffBase}/index.js`),
    import(`https://unpkg.com/@ffmpeg/util@${UTIL_VER}/dist/esm/index.js`),
  ]);

  ffmpeg = new FFmpeg();
  // Blob-URL everything so cross-origin worker/core construction is allowed.
  await ffmpeg.load({
    classWorkerURL: await toBlobURL(`${ffBase}/worker.js`, "text/javascript"),
    coreURL: await toBlobURL(`${coreBase}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${coreBase}/ffmpeg-core.wasm`, "application/wasm"),
  });
}

// Decode + downmix to 16kHz mono mp3 and cut into time segments. Re-encoding
// (rather than stream-copy) keeps this robust across every input container.
async function splitFile(file) {
  const inputName = "input";
  await ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));

  await ffmpeg.exec([
    "-i", inputName,
    "-vn",
    "-ac", "1",
    "-ar", "16000",
    "-b:a", "64k",
    "-f", "segment",
    "-segment_time", String(SEGMENT_SECONDS),
    "-reset_timestamps", "1",
    "out_%03d.mp3",
  ]);

  const entries = await ffmpeg.listDir("/");
  const names = entries
    .map((e) => e.name)
    .filter((n) => /^out_\d+\.mp3$/.test(n))
    .sort();

  if (!names.length) throw new Error("Splitting produced no output.");

  const blobs = [];
  for (const name of names) {
    const data = await ffmpeg.readFile(name);
    blobs.push(new Blob([data.buffer], { type: "audio/mpeg" }));
    await ffmpeg.deleteFile(name).catch(() => {});
  }
  await ffmpeg.deleteFile(inputName).catch(() => {});
  return blobs;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lastWords(text, n) {
  const words = (text || "").trim().split(/\s+/);
  return words.slice(-n).join(" ");
}

function setStatus(msg) {
  progressEl.hidden = false;
  progressEl.textContent = msg;
}
