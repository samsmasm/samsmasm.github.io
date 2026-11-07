// Tote client: Google sign-in, the passphrase key, and the encrypted notes API.
// Used by /tote and /typeit. Both are on unisam.nz, so they share the sign-in and the remembered key.
//
// Privacy model: the passphrase never leaves the browser. It is stretched (PBKDF2-SHA256, 600k rounds,
// random salt kept on the server) into a non-extractable AES-GCM key, which is remembered in this
// browser's IndexedDB until Lock or Sign out. Every note is encrypted with it (note id bound in as
// additional data) before it is sent, so the Worker, Cloudflare and Google only ever hold ciphertext.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut as fbSignOut, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// Same Firebase project as Checkin and Tracker; only its Google sign-in is used.
const app = initializeApp({
  apiKey: "AIzaSyDMlxhx94WHh-nVOyLPDEfEIY-ohGX7KRY",
  authDomain: "coldwar-d8109.firebaseapp.com",
  projectId: "coldwar-d8109",
  appId: "1:329049097500:web:fd7184fb4c0ba011db66d9"
});
const auth = getAuth(app);

export const EXPIRY_MS = 96 * 60 * 60 * 1000;
const API = '/tote/api';
const ITERATIONS = 600_000;

function fail(code, msg) { const e = new Error(msg); e.code = code; return e; }

// ── Sign-in ──
export function signIn() {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth, p);
}
export async function signOut() { await forgetKey(); await fbSignOut(auth); }
export const onUser = cb => onAuthStateChanged(auth, cb);

async function api(path, opts = {}) {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw fail('tote-signed-out', 'Not signed in to Tote');
  const headers = { Authorization: 'Bearer ' + await user.getIdToken() };
  if (opts.body) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + path, { ...opts, headers });
  if (res.status === 401) throw fail('tote-forbidden', 'This Google account is not allowed');
  if (!res.ok) throw fail('tote-http', 'Server error ' + res.status);
  return res.json();
}

// ── Bytes ──
const enc = s => new TextEncoder().encode(s);
function b64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
export const newId = () => b64(crypto.getRandomValues(new Uint8Array(15))).replace(/\+/g, '-').replace(/\//g, '_');

// ── Remembered key (IndexedDB, same origin as /typeit) ──
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('tote', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('keys');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbDo(mode, fn) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction('keys', mode);
    const req = fn(tx.objectStore('keys'));
    tx.oncomplete = () => { db.close(); res(req.result); };
    tx.onerror = () => { db.close(); rej(tx.error); };
  });
}
let cachedKey = null;
async function storedKey() {
  if (cachedKey) return cachedKey;
  try { cachedKey = (await idbDo('readonly', s => s.get('k'))) || null; } catch (e) {}
  return cachedKey;
}
async function storeKey(k) { cachedKey = k; try { await idbDo('readwrite', s => s.put(k, 'k')); } catch (e) {} }
export async function forgetKey() { cachedKey = null; try { await idbDo('readwrite', s => s.delete('k')); } catch (e) {} }

// ── Crypto ──
async function derive(pass, salt) {
  const base = await crypto.subtle.importKey('raw', enc(pass.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function encrypt(key, label, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc(label) }, key, enc(text));
  return { iv: b64(iv), ct: b64(ct) };
}
export async function decrypt(key, label, box) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv), additionalData: enc(label) }, key, unb64(box.ct));
  return new TextDecoder().decode(pt);
}
async function keyFits(key, meta) {
  try { return (await decrypt(key, 'check', meta.check)) === 'tote-ok'; } catch (e) { return false; }
}

// ── Passphrase ──
// meta = { salt, check } from the server, or null before the first passphrase is set.
export async function getMeta() { return (await api('/meta')).meta; }

// The remembered key, if there is one and it still matches the server's passphrase.
export async function readyKey(meta) {
  const k = await storedKey();
  if (k && meta && await keyFits(k, meta)) return k;
  if (k) await forgetKey();
  return null;
}
export async function unlock(pass, meta) {
  const key = await derive(pass, unb64(meta.salt));
  if (!(await keyFits(key, meta))) return null;
  await storeKey(key);
  return key;
}
export async function setPassphrase(pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await derive(pass, salt);
  await api('/meta', { method: 'PUT', body: JSON.stringify({ salt: b64(salt), check: await encrypt(key, 'check', 'tote-ok') }) });
  await storeKey(key);
  return key;
}
export async function wipeAll() { await api('/all', { method: 'DELETE' }); await forgetKey(); }

// ── Notes ──
// Returns [{id, content, expires}] newest first, plus how many could not be decrypted.
export async function listNotes(key) {
  const { notes } = await api('/notes');
  const out = [];
  let unreadable = 0;
  for (const n of notes) {
    try { out.push({ id: n.id, content: await decrypt(key, n.id, n), expires: n.expires || Date.now() + EXPIRY_MS }); }
    catch (e) { unreadable++; }
  }
  out.sort((a, b) => b.expires - a.expires);
  return { notes: out, unreadable };
}
// Saves (and renews) a note; returns its new expiry time in ms.
export async function putNote(key, id, content) {
  return (await api('/notes/' + id, { method: 'PUT', body: JSON.stringify(await encrypt(key, id, content)) })).expires;
}
export async function renewNote(id) { return (await api('/notes/' + id + '/renew', { method: 'POST' })).expires; }
export async function deleteNote(id) { await api('/notes/' + id, { method: 'DELETE' }); }

// For /typeit: save text as a new note. Throws code 'tote-locked' if Tote isn't unlocked on this device.
export async function saveToTote(text) {
  await auth.authStateReady();
  if (!auth.currentUser) throw fail('tote-locked', 'Open Tote and sign in first');
  const key = await readyKey(await getMeta());
  if (!key) throw fail('tote-locked', 'Open Tote and unlock it first');
  await putNote(key, newId(), text);
}
