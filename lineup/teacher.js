// Lineup - helpers shared by the teacher pages (teach.html and class.html).

import {
  ROOMS, doc, getDoc, setDoc, getDocs, deleteDoc, collection, writeBatch, serverTimestamp, Timestamp
} from './firebase.js?v=20261008-193745';
import { playable } from './deck.js?v=20261008-193745';

const DAY = 24 * 60 * 60 * 1000;
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O, which look like 1 and 0

export function fmt(ts) {
  return ts ? ts.toDate().toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
}

// Start a session: a four letter room with a copy of the deck on it, so later
// edits to the deck never change a session that is running. Returns the code.
export async function createRoom(db, uid, deckId, deck) {
  for (let tries = 0; tries < 8; tries++) {
    let code = '';
    for (let i = 0; i < 4; i++) code += LETTERS[Math.floor(Math.random() * LETTERS.length)];
    const ref = doc(db, ROOMS, code);
    if ((await getDoc(ref).catch(() => null))?.exists()) continue;
    await setDoc(ref, {
      ownerUid: uid,
      createdAt: serverTimestamp(),
      expireAt: Timestamp.fromMillis(Date.now() + DAY),
      deckId: deckId || '',
      deck: playable(deck)
    });
    return code;
  }
  throw new Error('Could not find a free room code. Try again.');
}

export async function deleteRoom(db, code) {
  const snap = await getDocs(collection(db, ROOMS, code, 'placements'));
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  await deleteDoc(doc(db, ROOMS, code));
}

// A button that needs a second tap within a few seconds before it acts.
export function armable(btn, armedText, action, busyText = 'Deleting...') {
  const text = btn.textContent;
  let timer = null;
  btn.addEventListener('click', async () => {
    if (!btn.classList.contains('armed')) {
      btn.classList.add('armed');
      btn.textContent = armedText;
      timer = setTimeout(() => { btn.classList.remove('armed'); btn.textContent = text; }, 4000);
      return;
    }
    clearTimeout(timer);
    btn.disabled = true;
    btn.textContent = busyText;
    try { await action(); btn.textContent = text; }
    catch (e) { console.error(e); btn.textContent = 'That did not work'; }
    btn.disabled = false;
    btn.classList.remove('armed');
  });
}
