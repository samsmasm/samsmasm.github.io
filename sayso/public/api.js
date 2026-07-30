// Thin wrappers around the Worker API. Cookies carry the session automatically.

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
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.detail = data.detail;
    throw err;
  }
  return data;
}

// Send one audio blob for transcription. Returns the transcript text.
export async function transcribeBlob(blob, { prompt, language = "en", filename } = {}) {
  const form = new FormData();
  form.append("audio", blob, filename || "audio.webm");
  if (prompt) form.append("prompt", prompt);
  form.append("language", language);
  if (filename) form.append("filename", filename);

  const res = await fetch("api/transcribe", {
    method: "POST",
    credentials: "same-origin",
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Transcription failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data.text || "";
}

export const PROMPT_CONTEXT =
  "Teacher feedback comments on student coursework, spoken aloud. " +
  "Student names are said only at the start of a new student's section.";
