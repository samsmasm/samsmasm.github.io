// Thin wrappers around the Worker API. Cookies carry the session automatically.

// A 401 from any route means the session lapsed while the page was open. The
// app registers a handler here so it can put the login gate back up, rather
// than letting the failure surface as a per-block error.
let onUnauthorized = null;

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

function noteStatus(status) {
  if (status === 401 && onUnauthorized) onUnauthorized();
}

export async function apiJson(path, method = "GET", body) {
  const opts = { method, credentials: "same-origin", headers: {} };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  // Relative path so the app works under the /sayso base (page URL ends in /sayso/).
  const res = await fetch(`api${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    noteStatus(res.status);
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.detail = data.detail;
    throw err;
  }
  return data;
}

// Send one audio blob for transcription. Returns the transcript text.
export async function transcribeBlob(
  blob,
  { prompt, language = "en", filename, multiSpeaker = false } = {}
) {
  const form = new FormData();
  form.append("audio", blob, filename || "audio.webm");
  if (prompt) form.append("prompt", prompt);
  form.append("language", language);
  if (filename) form.append("filename", filename);
  if (multiSpeaker) form.append("multiSpeaker", "1");

  const res = await fetch("api/transcribe", {
    method: "POST",
    credentials: "same-origin",
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    noteStatus(res.status);
    const err = new Error(data.error || `Transcription failed (${res.status})`);
    err.status = res.status;
    err.detail = data.detail;
    throw err;
  }
  return data.text || "";
}

export const PROMPT_CONTEXT =
  "Teacher feedback comments on student coursework, spoken aloud. " +
  "Student names are said only at the start of a new student's section.";
