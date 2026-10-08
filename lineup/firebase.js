// Lineup - Firebase setup, shared by every page.
//
// Uses the coldwar-d8109 Firebase project, which Checkin and aiorus also use.
// Lineup keeps its data in its own top level collections, lineupDecks and
// lineupRooms, so it cannot touch anyone else's. Its rules live at the bottom
// of ../checkin/firestore.rules, because a Firebase project has only one
// Firestore ruleset. See SETUP.md.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth, signInAnonymously, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export * from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDMlxhx94WHh-nVOyLPDEfEIY-ohGX7KRY",
  authDomain: "coldwar-d8109.firebaseapp.com",
  projectId: "coldwar-d8109",
  storageBucket: "coldwar-d8109.firebasestorage.app",
  messagingSenderId: "329049097500",
  appId: "1:329049097500:web:fd7184fb4c0ba011db66d9"
};

export const ROOMS = 'lineupRooms';
export const DECKS = 'lineupDecks';

// Students get a separately named app, so their sign-in is kept apart from the
// default one. Without this, a student who has signed in to Checkin with Google
// on the same Chromebook would send placements under their Google account.
// With it, every student is an anonymous account and nothing more.
export function studentFirebase() {
  const app = initializeApp(firebaseConfig, 'lineup-student');
  const auth = getAuth(app);
  const db = getFirestore(app);
  // Reuse the anonymous account from an earlier visit if there is one, so a
  // reload updates the same dots instead of adding a second set.
  const ready = auth.authStateReady()
    .then(() => auth.currentUser || signInAnonymously(auth).then(c => c.user));
  return { db, ready };
}

// The teacher uses the default app with Google sign-in, which is the same
// sign-in Checkin uses, so being signed in to one means signed in to both.
export function teacherFirebase() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return {
    db,
    onAuth: cb => onAuthStateChanged(auth, cb),
    signIn: () => signInWithPopup(auth, provider),
    currentUser: () => auth.currentUser,
    signOut: () => signOut(auth)
  };
}
