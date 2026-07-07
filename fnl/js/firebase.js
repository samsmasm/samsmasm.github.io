// FNL's own Firebase project (fnl-scheduler).
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  initializeFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDYg1lzTiclHGYOFlpWBAoDGsL5K3vib0I",
  authDomain: "fnl-scheduler.firebaseapp.com",
  projectId: "fnl-scheduler",
  storageBucket: "fnl-scheduler.firebasestorage.app",
  messagingSenderId: "900667854087",
  appId: "1:900667854087:web:bc68929515c19ab21089a2"
};

const app = initializeApp(firebaseConfig);
// auto-detect long-polling: some proxies/corporate networks (and this preview sandbox)
// don't play nicely with Firestore's default WebChannel streaming transport.
export const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });

export {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, writeBatch
};

export function slugify(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function upsertPerformer(displayName) {
  const slug = slugify(displayName);
  if (!slug) return null;
  const ref = doc(db, "performers", slug);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { displayName: displayName.trim(), createdAt: serverTimestamp() });
  }
  return slug;
}

export async function loadPerformers() {
  const snap = await getDocs(collection(db, "performers"));
  return snap.docs.map(d => ({ slug: d.id, ...d.data() }));
}
