import { db } from './firebase.js';
import { ref, get, set } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

const SESSION_KEY = 'uq_teacher_auth';
const SESSION_TTL = 8 * 60 * 60 * 1000;

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function isValid() {
  try {
    const s = sessionStorage.getItem(SESSION_KEY);
    if (!s) return false;
    return Date.now() < JSON.parse(s).expiry;
  } catch { return false; }
}

function saveSession() {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ expiry: Date.now() + SESSION_TTL }));
}

export function teacherLogout() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = 'index.html';
}

export function initAuthOverlay(onSuccess) {
  if (isValid()) { onSuccess(); return; }

  const overlay   = document.getElementById('auth-overlay');
  const form      = document.getElementById('auth-form');
  const input     = document.getElementById('auth-password');
  const errEl     = document.getElementById('auth-error');
  const submitBtn = document.getElementById('auth-submit');

  overlay.classList.remove('hidden');
  setTimeout(() => input?.focus(), 50);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const password = input.value.trim();
    if (!password) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Checking…';
    errEl.textContent = '';

    try {
      const hash = await sha256(password);
      const snap = await get(ref(db, 'uq/config/teacher'));

      if (!snap.exists()) {
        await set(ref(db, 'uq/config/teacher'), { passwordHash: hash });
        saveSession();
        overlay.classList.add('hidden');
        onSuccess();
        return;
      }

      if (snap.val().passwordHash === hash) {
        saveSession();
        overlay.classList.add('hidden');
        onSuccess();
      } else {
        errEl.textContent = 'Incorrect password.';
        input.value = '';
        input.focus();
      }
    } catch (err) {
      errEl.textContent = err?.message || 'Unknown error';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enter';
    }
  });
}
