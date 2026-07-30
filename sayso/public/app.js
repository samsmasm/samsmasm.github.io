// Bootstrap: auth gate, tab switching, settings, and wiring the two controllers.

import { apiJson } from "./api.js?v=4";
import * as store from "./store.js?v=4";
import { initRecord, setMode } from "./record.js?v=4";
import { initUpload } from "./upload.js?v=4";

const loginEl = document.getElementById("login");
const appEl = document.getElementById("app");
const loginForm = document.getElementById("login-form");
const passwordInput = document.getElementById("password");
const loginError = document.getElementById("login-error");

let settings = { silenceThreshold: 5, retentionDays: 14, mode: "hold" };

// ---------------------------------------------------------------------------
// Toast (used across modules via window.saysoToast)
// ---------------------------------------------------------------------------
const toastEl = document.getElementById("toast");
let toastTimer = null;
window.saysoToast = (msg) => {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.hidden = true), 2600);
};

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

async function boot() {
  let authed = false;
  try {
    const me = await apiJson("/me");
    authed = !!me.authenticated;
  } catch {
    authed = false;
  }
  if (authed) enterApp();
  else showLogin();
}

function showLogin() {
  loginEl.hidden = false;
  appEl.hidden = true;
  passwordInput.focus();
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  try {
    await apiJson("/login", "POST", { password: passwordInput.value });
    passwordInput.value = "";
    enterApp();
  } catch (err) {
    loginError.textContent = err.message || "Login failed";
    loginError.hidden = false;
  }
});

async function enterApp() {
  loginEl.hidden = true;
  appEl.hidden = false;

  await loadSettings();
  store.configureStore({ getRetentionDays: () => settings.retentionDays });
  store.newSession("live");

  initRecord({ getSilenceThreshold: () => settings.silenceThreshold });
  initUpload();

  setupTabs();
  setupModeButtons();
  setupSettingsSheet();
  setupTranscriptActions();

  setMode(settings.mode);
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

function setupTabs() {
  const tabs = document.querySelectorAll(".tab");
  const panels = {
    live: document.getElementById("tab-live"),
    upload: document.getElementById("tab-upload"),
  };
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.toggle("active", t === tab));
      const which = tab.dataset.tab;
      panels.live.hidden = which !== "live";
      panels.upload.hidden = which !== "upload";
    });
  });
  tabs[0].classList.add("active");
}

function setupModeButtons() {
  document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      settings.mode = btn.dataset.mode;
      setMode(settings.mode);
      saveSettings();
    });
  });
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const gear = document.getElementById("gear");
const sheet = document.getElementById("settings");
const closeBtn = document.getElementById("settings-close");
const silenceSlider = document.getElementById("silence-slider");
const silenceValue = document.getElementById("silence-value");
const retentionInput = document.getElementById("retention-input");
const logoutBtn = document.getElementById("logout-btn");

async function loadSettings() {
  try {
    settings = await apiJson("/settings");
  } catch {
    // keep defaults
  }
  silenceSlider.value = settings.silenceThreshold;
  silenceValue.textContent = `${settings.silenceThreshold}s`;
  retentionInput.value = settings.retentionDays;
}

let settingsSaveTimer = null;
function saveSettings() {
  clearTimeout(settingsSaveTimer);
  settingsSaveTimer = setTimeout(() => {
    apiJson("/settings", "PUT", settings).catch(() => {});
  }, 400);
}

function setupSettingsSheet() {
  gear.addEventListener("click", () => (sheet.hidden = false));
  closeBtn.addEventListener("click", () => (sheet.hidden = true));
  sheet.addEventListener("click", (e) => {
    if (e.target === sheet) sheet.hidden = true;
  });

  silenceSlider.addEventListener("input", () => {
    settings.silenceThreshold = parseInt(silenceSlider.value, 10);
    silenceValue.textContent = `${settings.silenceThreshold}s`;
    saveSettings();
  });
  retentionInput.addEventListener("change", () => {
    const v = Math.min(3650, Math.max(1, parseInt(retentionInput.value, 10) || 14));
    settings.retentionDays = v;
    retentionInput.value = v;
    saveSettings();
  });

  logoutBtn.addEventListener("click", async () => {
    await apiJson("/logout", "POST").catch(() => {});
    location.reload();
  });
}

// ---------------------------------------------------------------------------
// Transcript actions
// ---------------------------------------------------------------------------

function setupTranscriptActions() {
  document.getElementById("copy-all").addEventListener("click", async () => {
    const text = store.getFullText();
    if (!text) {
      window.saysoToast("Nothing to copy yet.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      window.saysoToast("Copied full transcript.");
    } catch {
      window.saysoToast("Copy failed — select and copy manually.");
    }
  });

  document.getElementById("new-session").addEventListener("click", () => {
    const activeTab = document.querySelector(".tab.active")?.dataset.tab || "live";
    store.newSession(activeTab === "upload" ? "upload" : "live");
    window.saysoToast("Started a new session.");
  });
}

boot();
