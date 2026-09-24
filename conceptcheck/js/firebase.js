// Concept Check - Firebase app, auth and Firestore.
// Reuses the existing "dowserboard" Firebase project. UniQuiz and FMW Skills use
// that project's Realtime Database; this tool uses Firestore, which has its own
// separate ruleset, so nothing here can affect those older tools.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyBGdNJgl1PG0IueYQk_jjn4cOg-sMFbHe0",
  authDomain: "dowserboard.firebaseapp.com",
  projectId: "dowserboard",
  databaseURL: "https://dowserboard-default-rtdb.firebaseio.com",
  storageBucket: "dowserboard.firebasestorage.app",
  messagingSenderId: "1032600748722",
  appId: "1:1032600748722:web:1584c7508fbbca617cbfab"
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
