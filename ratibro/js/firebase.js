// RatIBro — Firebase configuration and initialisation

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyBad5uovt_JcF8Z7mjIg0rlrcrHlSCPYWs",
  authDomain: "financehub-58eb2.firebaseapp.com",
  projectId: "financehub-58eb2",
  storageBucket: "financehub-58eb2.firebasestorage.app",
  messagingSenderId: "98813964924",
  appId: "1:98813964924:web:e247f54da079ba99354ff9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// === Auth ===

const TEACHER_EMAIL = 'samgetsstuffdone@gmail.com';

async function loginWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  await ensureUserDoc(cred.user);
  return cred.user;
}

async function logoutUser() {
  await signOut(auth);
  window.location.replace('index.html');
}

function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

function isTeacher(user) {
  if (!user) return false;
  return user.email === TEACHER_EMAIL;
}

function getDisplayName(user) {
  if (!user) return '';
  return user.displayName || user.email;
}

// === Firestore: User docs ===

async function ensureUserDoc(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email: user.email,
      displayName: user.displayName || user.email,
      createdAt: Date.now(),
      progress: {}
    });
  }
}

async function getUserDoc(uid) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

// === Firestore: Progress ===

async function getProgress(uid) {
  const data = await getUserDoc(uid);
  return data?.progress || {};
}

async function recordAttempt(uid, skillId, rating) {
  const ref = doc(db, 'users', uid);
  const data = await getUserDoc(uid);
  const progress = data?.progress || {};

  if (!progress[skillId]) progress[skillId] = { ratings: [], attempts: 0 };
  progress[skillId].ratings.push({ rating, timestamp: Date.now() });
  progress[skillId].attempts = (progress[skillId].attempts || 0) + 1;

  // setDoc with merge works even if the document doesn't exist yet
  await setDoc(ref, { progress }, { merge: true });
}

// === Firestore: Teacher ===

async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

async function setRealName(uid, realName) {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, { realName });
}

export {
  auth, db,
  loginWithGoogle, logoutUser, onAuthChange,
  isTeacher, getDisplayName,
  ensureUserDoc, getUserDoc,
  getProgress, recordAttempt,
  getAllUsers, setRealName,
  TEACHER_EMAIL
};
