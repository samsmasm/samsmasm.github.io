import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc,
         doc, getDoc, query, orderBy, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyBGdNJgl1PG0IueYQk_jjn4cOg-sMFbHe0",
  authDomain:        "dowserboard.firebaseapp.com",
  projectId:         "dowserboard",
  storageBucket:     "dowserboard.firebasestorage.app",
  messagingSenderId: "1032600748722",
  appId:             "1:1032600748722:web:1584c7508fbbca617cbfab"
};

const app = initializeApp(firebaseConfig, 'moa-gb');
const db  = getFirestore(app);
const COL = 'moa-guestbook';

let entries    = [];
let deleteMode = false;

function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(ts) {
  if (!ts) return '';
  return ts.toDate().toLocaleDateString('en-GB',
    { day: 'numeric', month: 'long', year: 'numeric' });
}

async function loadEntries() {
  const snap = await getDocs(query(collection(db, COL), orderBy('timestamp', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function renderEntries() {
  const el = document.getElementById('gb-entries');
  if (!el) return;

  const countBar = document.getElementById('gb-count-bar');
  if (countBar) countBar.textContent =
    entries.length ? `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}` : '';

  if (!entries.length) {
    el.innerHTML = '<p class="gb-empty">No entries yet. Be the first to sign!</p>';
    return;
  }

  el.innerHTML = entries.map(e => `
    <div class="gb-entry" data-id="${esc(e.id)}">
      <div class="gb-meta">
        <span class="gb-name">${esc(e.name)}</span>
        ${e.location ? `<span class="gb-loc">📍 ${esc(e.location)}</span>` : ''}
        <span class="gb-date">${fmtDate(e.timestamp)}</span>
        ${deleteMode ? `<button class="gb-del-btn" data-id="${esc(e.id)}">✕ Delete</button>` : ''}
      </div>
      ${e.url ? `<div class="gb-url">🌐 <a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.url)}</a></div>` : ''}
      <div class="gb-msg">${esc(e.message).replace(/\n/g,'<br>')}</div>
    </div>
  `).join('<div class="gb-divider">✦ ─────────────── ✦</div>');

  el.querySelectorAll('.gb-del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this entry?')) return;
      await deleteDoc(doc(db, COL, btn.dataset.id));
      entries = await loadEntries();
      renderEntries();
    });
  });
}

async function tryUnlock() {
  const entered = prompt('PIN:');
  if (!entered) return;
  const snap = await getDoc(doc(db, 'config', 'moa'));
  if (entered === snap.data()?.deletePin) {
    deleteMode = true;
    renderEntries();
  } else {
    alert('Incorrect.');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    entries = await loadEntries();
  } catch {
    document.getElementById('gb-entries').innerHTML =
      '<p class="gb-empty">Could not load entries. Check that Firestore is enabled on the dowserboard project.</p>';
    return;
  }
  renderEntries();

  document.getElementById('gb-lock').addEventListener('click', tryUnlock);

  const form = document.getElementById('gb-form');
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const btn = form.querySelector('.gb-submit');
    btn.disabled = true;
    btn.textContent = 'Signing…';

    const data = {
      name:      form.gb_name.value.trim(),
      location:  form.gb_location.value.trim(),
      url:       form.gb_url.value.trim(),
      message:   form.gb_message.value.trim(),
      timestamp: serverTimestamp(),
    };

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 8000));
    try {
      await Promise.race([addDoc(collection(db, COL), data), timeout]);
      form.reset();
      btn.textContent = '✓ Signed!';
      entries = await loadEntries();
      renderEntries();
      setTimeout(() => document.querySelector('[data-tab="read"]').click(), 800);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Sign!';
      alert('Could not save: ' + err.message);
    }
  });
});
