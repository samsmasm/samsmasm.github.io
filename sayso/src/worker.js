// Sayso — marking transcription Worker.
//
// One Worker serves the static frontend and a small JSON/multipart API.
// Security model:
//   - Every /api route except /login and /me requires a valid signed session cookie.
//   - The OpenAI key lives only as a Worker secret and never reaches the client.
//   - /transcribe (the only endpoint that costs money) is rate-limited per session.
//   - No audio is ever persisted. Only text transcripts are stored, in KV, with a TTL.

const OPENAI_URL = "https://api.openai.com/v1/audio/transcriptions";
const MODEL = "gpt-transcribe";
const COOKIE = "sayso_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const RATE_LIMIT = 25; // transcription requests …
const RATE_WINDOW = 60; // … per this many seconds, per session

const BASE = "/sayso"; // app is served under unisam.nz/sayso

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let path = url.pathname;

    // Normalise the /sayso base path away, so internal routing sees "/", "/api/…".
    if (path === BASE) {
      return Response.redirect(`${url.origin}${BASE}/`, 301);
    }
    if (path.startsWith(`${BASE}/`)) {
      path = path.slice(BASE.length) || "/";
    }

    if (path.startsWith("/api/")) {
      try {
        return await handleApi(request, env, path, url);
      } catch (err) {
        return json({ error: err.message || "Internal error" }, 500);
      }
    }

    // Static asset — rewrite the URL to the base-stripped path so ASSETS resolves
    // it (SPA fallback serves index.html for unknown paths).
    const assetUrl = new URL(url);
    assetUrl.pathname = path;
    return env.ASSETS.fetch(new Request(assetUrl, request));
  },
};

async function handleApi(request, env, path, url) {
  const route = path.slice("/api".length); // e.g. "/login"

  // --- Public routes -------------------------------------------------------
  if (route === "/login" && request.method === "POST") {
    return login(request, env);
  }
  if (route === "/logout" && request.method === "POST") {
    return logout();
  }
  if (route === "/me" && request.method === "GET") {
    const ok = await verifySession(request, env);
    return json({ authenticated: ok });
  }

  // --- Everything below requires a valid session ---------------------------
  const session = await verifySession(request, env);
  if (!session) return json({ error: "Not authenticated" }, 401);

  if (route === "/transcribe" && request.method === "POST") {
    return transcribe(request, env, session);
  }
  if (route === "/session" && request.method === "PUT") {
    return saveSession(request, env);
  }
  if (route === "/session" && request.method === "GET") {
    return getSession(request, env, url);
  }
  if (route === "/settings" && request.method === "GET") {
    return getSettings(env);
  }
  if (route === "/settings" && request.method === "PUT") {
    return putSettings(request, env);
  }

  return json({ error: "Not found" }, 404);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

async function login(request, env) {
  const { password } = await request.json().catch(() => ({}));
  if (!password || !env.SITE_PASSWORD) {
    return json({ error: "Missing password" }, 400);
  }
  const ok = await timingSafeEqual(String(password), env.SITE_PASSWORD);
  if (!ok) {
    return json({ error: "Wrong password" }, 401);
  }
  const token = await signSession(env);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookie(COOKIE, token, SESSION_TTL_SECONDS),
    },
  });
}

function logout() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookie(COOKIE, "", 0),
    },
  });
}

// A session token is: base64url(payload) "." base64url(hmac).
// Payload = { sid, iat, exp }. Stateless — no server storage needed.
async function signSession(env) {
  const payload = {
    sid: crypto.randomUUID(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await hmac(env.SESSION_SECRET, body);
  return `${body}.${sig}`;
}

async function verifySession(request, env) {
  const token = getCookie(request, COOKIE);
  if (!token || !env.SESSION_SECRET) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = await hmac(env.SESSION_SECRET, body);
  if (!(await timingSafeEqual(sig, expected))) return null;
  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
  } catch {
    return null;
  }
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload; // { sid, iat, exp }
}

// ---------------------------------------------------------------------------
// Transcription (the only endpoint that costs money)
// ---------------------------------------------------------------------------

async function transcribe(request, env, session) {
  if (!env.OPENAI_API_KEY) {
    return json({ error: "Server missing OPENAI_API_KEY" }, 500);
  }

  const allowed = await checkRateLimit(env, session.sid);
  if (!allowed) {
    return json({ error: "Rate limit reached — slow down a moment." }, 429);
  }

  const inForm = await request.formData();
  const audio = inForm.get("audio");
  if (!(audio instanceof File) && !(audio instanceof Blob)) {
    return json({ error: "No audio provided" }, 400);
  }
  if (audio.size > 25 * 1024 * 1024) {
    return json({ error: "Audio exceeds 25MB (should have been chunked)" }, 413);
  }

  const prompt = inForm.get("prompt") || "";
  const language = inForm.get("language") || "en";

  const out = new FormData();
  out.append("model", MODEL);
  // Give the file a name+type so OpenAI infers the format correctly.
  const filename = inForm.get("filename") || fileNameFor(audio);
  out.append("file", audio, filename);
  if (prompt) out.append("prompt", String(prompt));
  out.append("languages[]", String(language));
  out.append("response_format", "text");

  const resp = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: out,
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    return json(
      { error: `Transcription failed (${resp.status})`, detail: detail.slice(0, 500) },
      502
    );
  }

  const text = (await resp.text()).trim();
  return json({ text });
}

// Fixed-window per-session counter in KV. Single user => single writer, so this
// is a reliable backstop. The real cost guard is the OpenAI account spend cap.
async function checkRateLimit(env, sid) {
  const window = Math.floor(Date.now() / 1000 / RATE_WINDOW);
  const key = `rl:${sid}:${window}`;
  const current = parseInt((await env.SAYSO_KV.get(key)) || "0", 10);
  if (current >= RATE_LIMIT) return false;
  await env.SAYSO_KV.put(key, String(current + 1), {
    expirationTtl: RATE_WINDOW * 2,
  });
  return true;
}

// ---------------------------------------------------------------------------
// Transcript storage (text only, TTL from retention setting)
// ---------------------------------------------------------------------------

async function saveSession(request, env) {
  const record = await request.json().catch(() => null);
  if (!record || !record.sessionId) {
    return json({ error: "Invalid session record" }, 400);
  }
  const retentionDays = clampInt(record.retentionDays, 1, 3650, 14);
  const createdAt = Date.parse(record.createdAt) || Date.now();
  const expiresAt = createdAt + retentionDays * 86400 * 1000;
  const ttl = Math.max(60, Math.floor((expiresAt - Date.now()) / 1000));

  // Never trust/keep anything audio-shaped — persist text fields only.
  const clean = {
    sessionId: String(record.sessionId),
    createdAt: new Date(createdAt).toISOString(),
    type: record.type === "upload" ? "upload" : "live",
    segments: (record.segments || []).map((s) => ({
      sequence: Number(s.sequence),
      text: String(s.text || ""),
      capturedAt: s.capturedAt || null,
      status: s.status === "failed" ? "failed" : "complete",
    })),
    fullText: String(record.fullText || ""),
  };

  await env.SAYSO_KV.put(`session:${clean.sessionId}`, JSON.stringify(clean), {
    expirationTtl: ttl,
  });
  return json({ ok: true });
}

async function getSession(request, env, url) {
  const id = url.searchParams.get("id");
  if (!id) return json({ error: "Missing id" }, 400);
  const raw = await env.SAYSO_KV.get(`session:${id}`);
  if (!raw) return json({ error: "Not found" }, 404);
  return new Response(raw, {
    headers: { "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Settings (single global record — this is a single-user tool)
// ---------------------------------------------------------------------------

const SETTINGS_KEY = "settings:global";
const DEFAULT_SETTINGS = { silenceThreshold: 5, retentionDays: 14, mode: "hold" };

async function getSettings(env) {
  const raw = await env.SAYSO_KV.get(SETTINGS_KEY);
  const s = raw ? JSON.parse(raw) : {};
  return json({ ...DEFAULT_SETTINGS, ...s });
}

async function putSettings(request, env) {
  const body = await request.json().catch(() => ({}));
  const s = {
    silenceThreshold: clampInt(body.silenceThreshold, 2, 15, 5),
    retentionDays: clampInt(body.retentionDays, 1, 3650, 14),
    mode: body.mode === "auto" ? "auto" : "hold",
  };
  await env.SAYSO_KV.put(SETTINGS_KEY, JSON.stringify(s));
  return json(s);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function cookie(name, value, maxAge) {
  const parts = [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${maxAge}`,
  ];
  return parts.join("; ");
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return b64urlEncode(new Uint8Array(sig));
}

// Constant-time string comparison via HMAC-over-input (hides length/content).
async function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    crypto.getRandomValues(new Uint8Array(32)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const ha = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(a)));
  const hb = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(b)));
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha[i] ^ hb[i];
  return diff === 0;
}

function b64urlEncode(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function clampInt(v, min, max, fallback) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function fileNameFor(blob) {
  const type = blob.type || "";
  if (type.includes("webm")) return "audio.webm";
  if (type.includes("mp4") || type.includes("m4a")) return "audio.mp4";
  if (type.includes("mpeg") || type.includes("mp3")) return "audio.mp3";
  if (type.includes("wav")) return "audio.wav";
  return "audio.webm";
}
