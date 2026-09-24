// Checkin - Firebase app, auth and Firestore.
// Uses the "coldwar-d8109" Firebase project. The only other tool in it is
// Operation: Shadow Protocol (/coldwar), which uses that project's Realtime
// Database. Checkin uses Firestore, a separate database with a separate
// ruleset, so nothing here can affect it.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// No databaseURL here on purpose: Checkin never touches the Realtime Database.
const firebaseConfig = {
  apiKey: "AIzaSyDMlxhx94WHh-nVOyLPDEfEIY-ohGX7KRY",
  authDomain: "coldwar-d8109.firebaseapp.com",
  projectId: "coldwar-d8109",
  storageBucket: "coldwar-d8109.firebasestorage.app",
  messagingSenderId: "329049097500",
  appId: "1:329049097500:web:fd7184fb4c0ba011db66d9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

export function signIn() {
  return signInWithPopup(auth, provider);
}

export function signOutNow() {
  return signOut(auth);
}

export function onAuth(cb) {
  return onAuthStateChanged(auth, cb);
}
