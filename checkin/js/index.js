// Checkin - sign-in page.

import { signIn, onAuth, ensureUserDoc, qp, fail } from './core.js?v=641cfbd-2036';

const next = qp('next') || 'home.html';
const btn = document.getElementById('signin');

onAuth(async user => {
  if (!user) return;
  try {
    await ensureUserDoc(user);
    location.replace(next);
  } catch (err) {
    fail('Sign in', err);
  }
});

btn.addEventListener('click', async () => {
  btn.disabled = true;
  try {
    await signIn();
  } catch (err) {
    btn.disabled = false;
    if (err && err.code === 'auth/popup-closed-by-user') return;
    fail('Google sign in', err);
  }
});
