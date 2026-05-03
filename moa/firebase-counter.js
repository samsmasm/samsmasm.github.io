import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, runTransaction, get, set }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey:            "AIzaSyCOSkL0C9_P8VeqpefXJbGCeOfXYwMMegE",
  authDomain:        "notes-ff975.firebaseapp.com",
  databaseURL:       "https://notes-ff975-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "notes-ff975",
  storageBucket:     "notes-ff975.firebasestorage.app",
  messagingSenderId: "977644569179",
  appId:             "1:977644569179:web:5c23a086bb411bd1dfb57e"
};

const app = initializeApp(firebaseConfig, 'moa');
const db  = getDatabase(app);

function getSlug() {
  const match = window.location.pathname.match(/\/moa\/([^/]+)\/?$/);
  if (!match) return 'home';
  return match[1] === 'index.html' ? 'home' : match[1];
}

function codeToFlag(code) {
  return [...code.toUpperCase()]
    .map(c => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join('');
}

async function fetchCountry() {
  try {
    const r = await fetch('https://api.country.is/');
    const d = await r.json();
    return d.country || null;
  } catch {
    return null;
  }
}

function renderCounter(n) {
  const el = document.querySelector('.hit-counter');
  if (!el) return;
  const digits = String(n).padStart(6, '0')
    .split('').map(d => `<span class="hc-d">${d}</span>`).join('');
  el.innerHTML =
    `<span class="hc-label">VISITORS</span>` +
    `<span class="hc-digits">${digits}</span>`;
}

async function renderFlags() {
  const snap = await get(ref(db, 'moa/countries'));
  const codes = Object.keys(snap.val() || {}).sort();
  if (!codes.length) return;

  const strip = document.createElement('div');
  strip.className = 'flag-strip';
  strip.innerHTML =
    `<div class="flag-label">Visitors from</div>` +
    `<div class="flag-icons">${codes.map(codeToFlag).join(' ')}</div>`;

  const footer = document.querySelector('.page-footer');
  if (footer) footer.parentNode.insertBefore(strip, footer);
}

async function run() {
  const pg = getSlug();

  const hitsRef = ref(db, `moa/hits/${pg}`);
  await runTransaction(hitsRef, v => (v || 0) + 1);
  const snap = await get(hitsRef);
  renderCounter(snap.val() || 1);

  const cc = await fetchCountry();
  if (cc) await set(ref(db, `moa/countries/${cc}`), true);

  if (pg === 'home') await renderFlags();
}

run();
