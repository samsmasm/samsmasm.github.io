// The Long Game - Firebase, shared by the build page and the teacher page.
//
// Uses the coldwar-d8109 project, which Checkin, aiorus and Lineup also use.
// Everything lives under its own top level collection, dilemmaRooms, so it
// cannot touch their data. The rules are the "dilemmaRooms" block at the end
// of ../checkin/firestore.rules, because a project has one Firestore ruleset.
// See SETUP.md.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth, signInAnonymously, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, deleteDoc, updateDoc, collection, getDocs, query, where,
  serverTimestamp, onSnapshot, orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDMlxhx94WHh-nVOyLPDEfEIY-ohGX7KRY",
  authDomain: "coldwar-d8109.firebaseapp.com",
  projectId: "coldwar-d8109",
  storageBucket: "coldwar-d8109.firebasestorage.app",
  messagingSenderId: "329049097500",
  appId: "1:329049097500:web:fd7184fb4c0ba011db66d9"
};

const ROOMS = 'dilemmaRooms';
export const MAX_SUBMISSIONS = 5;   // per device per room, enforced in the rules
export const MAX_JSON = 8000;       // characters, enforced in the rules

// A handle is a display name, never a real name. Letters, digits, spaces and
// a little punctuation, 2 to 24 characters.
export function cleanHandle(h) {
  return String(h || '').replace(/[^A-Za-z0-9 _.-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
}

export function cleanCode(c) {
  return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

// ---------------------------------------------------------------------------
// Students and the public: an anonymous account in a separately named app, so a Google
// sign-in for another tool on a shared Chromebook is never used here.
// ---------------------------------------------------------------------------

let student = null;
function studentApp() {
  if (!student) {
    const app = initializeApp(firebaseConfig, 'dilemma-student');
    const auth = getAuth(app);
    const db = getFirestore(app);
    const ready = auth.authStateReady()
      .then(() => auth.currentUser || signInAnonymously(auth).then(c => c.user));
    student = { db, ready };
  }
  return student;
}

export async function roomInfo(code) {
  const { db, ready } = studentApp();
  await ready;
  const snap = await getDoc(doc(db, ROOMS, code));
  return snap.exists() ? snap.data() : null;
}

// Public competitions are ordinary rooms whose owner has made them public.
// Anyone can list them, read their strategies and their official standings.
export async function publicRooms() {
  const { db, ready } = studentApp();
  await ready;
  const snap = await getDocs(query(collection(db, ROOMS), where('public', '==', true)));
  return snap.docs.map(d => ({ code: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}

export async function publicStrategies(code) {
  const { db, ready } = studentApp();
  await ready;
  const snap = await getDocs(collection(db, ROOMS, code, 'strategies'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function publicStandings(code) {
  const { db, ready } = studentApp();
  await ready;
  const snap = await getDoc(doc(db, ROOMS, code, 'standings', 'current'));
  return snap.exists() ? snap.data() : null;
}

// Each device gets slots 1 to MAX_SUBMISSIONS per room. A slot can be
// written once and never changed, so the next free one is found by trying.
export async function submitStrategy(code, strategy, handle) {
  const { db, ready } = studentApp();
  const user = await ready;
  const json = JSON.stringify(strategy);
  if (json.length > MAX_JSON) throw new Error('This strategy is too big to send.');
  for (let slot = 1; slot <= MAX_SUBMISSIONS; slot++) {
    const ref = doc(db, ROOMS, code, 'strategies', `${user.uid}_${slot}`);
    const existing = await getDoc(ref).catch(() => null);
    if (existing && existing.exists()) continue;
    await setDoc(ref, {
      uid: user.uid,
      handle: cleanHandle(handle),
      name: String(strategy.name).slice(0, 40),
      schemaVersion: strategy.schemaVersion,
      json,
      createdAt: serverTimestamp()
    });
    return slot;
  }
  throw new Error(`You have already sent ${MAX_SUBMISSIONS} strategies to this room. Ask your teacher to remove one.`);
}

// ---------------------------------------------------------------------------
// Teacher: Google sign-in in the default app. Rooms belong to whoever made them.
// ---------------------------------------------------------------------------

let teacher = null;
export function teacherApp() {
  if (teacher) return teacher;
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const roomRef = code => doc(db, ROOMS, code);
  const uid = () => auth.currentUser.uid;

  teacher = {
    onAuth: cb => onAuthStateChanged(auth, cb),
    signIn: () => signInWithPopup(auth, provider),
    signOut: () => signOut(auth),

    async myRooms() {
      const q = query(collection(db, ROOMS), where('ownerUid', '==', uid()));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ code: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    },

    // Codes skip letters and digits that are easy to confuse (O/0, I/1).
    async createRoom(title) {
      const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      for (let tries = 0; tries < 5; tries++) {
        let code = '';
        for (let i = 0; i < 5; i++) code += abc[Math.floor(Math.random() * abc.length)];
        const ref = roomRef(code);
        if ((await getDoc(ref).catch(() => null))?.exists()) continue;
        await setDoc(ref, { ownerUid: uid(), title: String(title || '').slice(0, 60), open: true, public: false, createdAt: serverTimestamp() });
        return code;
      }
      throw new Error('Could not make a room code. Try again.');
    },

    setOpen: (code, open) => updateDoc(roomRef(code), { open }),
    setPublic: (code, isPublic) => updateDoc(roomRef(code), { public: isPublic }),

    // The official standings of a public competition: one full run, which
    // everyone sees and which "against the top 20" uses.
    publishStandings: (code, standings) =>
      setDoc(doc(db, ROOMS, code, 'standings', 'current'), { ...standings, updatedAt: serverTimestamp() }),
    deleteRoom: code => deleteDoc(roomRef(code)),

    watchStrategies(code, cb, onError) {
      return onSnapshot(collection(db, ROOMS, code, 'strategies'), snap => {
        cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, onError);
    },
    removeStrategy: (code, id) => deleteDoc(doc(db, ROOMS, code, 'strategies', id)),

    // The teacher can add a strategy too (pasted JSON), under their own uid.
    async addStrategy(code, strategy, handle) {
      const id = `t${Date.now().toString(36)}`;
      await setDoc(doc(db, ROOMS, code, 'strategies', id), {
        uid: uid(), handle: cleanHandle(handle) || 'Teacher', name: String(strategy.name).slice(0, 40),
        schemaVersion: strategy.schemaVersion, json: JSON.stringify(strategy), createdAt: serverTimestamp()
      });
    },

    // A saved run stores its settings and the strategy ids, which is all it
    // takes to reproduce it exactly, plus the leaderboard for a quick look.
    async saveRun(code, run) {
      const id = `r${Date.now().toString(36)}`;
      await setDoc(doc(db, ROOMS, code, 'runs', id), { ...run, createdAt: serverTimestamp() });
      return id;
    },
    async listRuns(code) {
      const snap = await getDocs(query(collection(db, ROOMS, code, 'runs'), orderBy('createdAt', 'desc')));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    deleteRun: (code, id) => deleteDoc(doc(db, ROOMS, code, 'runs', id))
  };
  return teacher;
}
