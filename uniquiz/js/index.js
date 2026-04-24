import { db } from './firebase.js';
import { ref, get } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

const form  = document.getElementById('pin-form');
const input = document.getElementById('pin-input');
const errEl = document.getElementById('pin-error');

input.addEventListener('input', () => {
  input.value = input.value.replace(/\D/g, '').slice(0, 6);
  errEl.classList.add('hidden');
});

form.addEventListener('submit', async e => {
  e.preventDefault();
  const pin = input.value.trim();

  if (!/^\d{6}$/.test(pin)) {
    showError('Please enter a 6-digit PIN.');
    return;
  }

  const btn = form.querySelector('button');
  btn.disabled = true;
  btn.textContent = 'Joining…';
  errEl.classList.add('hidden');

  try {
    const snap = await get(ref(db, `uq/sessions/${pin}`));
    if (!snap.exists()) {
      showError('Session not found. Check your PIN.');
      return;
    }
    if (snap.val().currentQuestionIndex === -2) {
      showError('This session has ended.');
      return;
    }
    window.location.href = `play.html?pin=${pin}`;
  } catch (err) {
    showError(err?.message || 'Connection error. Please try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Join';
  }
});

function showError(msg) {
  errEl.textContent = msg;
  errEl.classList.remove('hidden');
}
