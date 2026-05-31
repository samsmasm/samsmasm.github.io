import { db, auth } from './config.js';
import {
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  collection, query, where, orderBy,
  writeBatch, Timestamp, serverTimestamp, increment
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { nextInterval } from './srs.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

// ── Users ────────────────────────────────────────────────────────────────────

export async function getOrCreateUser(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const data = {
      email: user.email,
      display_name: user.displayName || user.email.split('@')[0],
      is_admin: false,
      subscribed_decks: [],
      created_at: serverTimestamp()
    };
    await setDoc(ref, data);
    return { ...data, created_at: new Date() };
  }
  return snap.data();
}

export async function getUser(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export async function getUserStats(uid) {
  const endTs = Timestamp.fromDate(endOfToday());
  const q = query(collection(db, 'users', uid, 'progress'), where('due_date', '<=', endTs));
  const [dueSnap, allSnap] = await Promise.all([
    getDocs(q),
    getDocs(collection(db, 'users', uid, 'progress'))
  ]);
  // Count unique words (each word has 2 progress records, one per direction)
  const dueWords = new Set(dueSnap.docs.map(d => d.data().word_id));
  const allWords = new Set(allSnap.docs.map(d => d.data().word_id));
  return { due: dueWords.size, total: allWords.size };
}

// ── Decks ────────────────────────────────────────────────────────────────────

export async function getPublicDecks() {
  const q = query(collection(db, 'decks'), where('is_public', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getDeck(deckId) {
  const snap = await getDoc(doc(db, 'decks', deckId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getDeckWords(deckId) {
  const snap = await getDocs(collection(db, 'decks', deckId, 'words'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getDeckProgress(uid, deckId) {
  const q = query(collection(db, 'users', uid, 'progress'), where('deck_id', '==', deckId));
  const snap = await getDocs(q);
  const best = {};
  for (const d of snap.docs) {
    const { word_id, level } = d.data();
    if (best[word_id] === undefined || level > best[word_id]) best[word_id] = level;
  }
  const wordIds = Object.keys(best);
  const mastered = wordIds.filter(id => best[id] >= 4).length;
  return { total: wordIds.length, mastered };
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

const DAILY_NEW_LIMIT = 12;
const DAILY_REVIEW_LIMIT = 48;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function dailyAllowanceRemaining(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  const d = snap.data() || {};
  if (d.new_today_date === todayStr()) {
    return Math.max(0, DAILY_NEW_LIMIT - (d.new_today_count || 0));
  }
  return DAILY_NEW_LIMIT;
}

async function bumpDailyCount(uid, wordsAdded) {
  const snap = await getDoc(doc(db, 'users', uid));
  const d = snap.data() || {};
  const today = todayStr();
  const prev = d.new_today_date === today ? (d.new_today_count || 0) : 0;
  await updateDoc(doc(db, 'users', uid), {
    new_today_date: today,
    new_today_count: prev + wordsAdded
  });
}

// Finds deck words that have no progress records yet (pending pool)
async function pendingWordsForDeck(uid, deckId) {
  const [words, progressSnap] = await Promise.all([
    getDeckWords(deckId),
    getDocs(query(collection(db, 'users', uid, 'progress'), where('deck_id', '==', deckId)))
  ]);
  const existing = new Set(progressSnap.docs.map(d => d.data().word_id));
  return words.filter(w => !existing.has(w.id)).map(w => ({ deckId, word: w }));
}

export async function getPendingCount(uid) {
  const userData = await getUser(uid);
  const deckIds = userData?.subscribed_decks || [];
  let count = 0;
  for (const deckId of deckIds) {
    const pending = await pendingWordsForDeck(uid, deckId);
    count += pending.length;
  }
  return count;
}

export async function introduceWords(uid, count) {
  if (count <= 0) return 0;
  const userData = await getUser(uid);
  const deckIds = userData?.subscribed_decks || [];

  const pending = [];
  for (const deckId of deckIds) {
    pending.push(...await pendingWordsForDeck(uid, deckId));
    if (pending.length >= count) break;
  }

  const toIntroduce = pending.slice(0, count);
  if (toIntroduce.length === 0) return 0;

  const now = Timestamp.fromDate(new Date());
  for (let i = 0; i < toIntroduce.length; i += 499) {
    const batch = writeBatch(db);
    for (const { deckId, word } of toIntroduce.slice(i, i + 499)) {
      for (const dir of ['vn_en', 'en_vn']) {
        batch.set(doc(db, 'users', uid, 'progress', `${word.id}_${dir}`), {
          word_id: word.id, deck_id: deckId, source: 'deck',
          direction: dir, level: 0, due_date: now,
          last_reviewed: null, correct_count: 0, incorrect_count: 0
        });
      }
    }
    await batch.commit();
  }
  await bumpDailyCount(uid, toIntroduce.length);
  return toIntroduce.length;
}

export async function autoIntroduceDaily(uid) {
  const remaining = await dailyAllowanceRemaining(uid);
  if (remaining <= 0) return 0;
  return introduceWords(uid, remaining);
}

export async function subscribeToDeck(uid, deckId) {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  const arr = userSnap.data().subscribed_decks || [];
  if (!arr.includes(deckId)) {
    await updateDoc(userRef, { subscribed_decks: [...arr, deckId] });
  }
  // Only introduce up to today's remaining allowance, not all words at once
  const remaining = await dailyAllowanceRemaining(uid);
  return introduceWords(uid, remaining);
}

export async function unenrollFromDeck(uid, deckId) {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  const arr = (snap.data().subscribed_decks || []).filter(id => id !== deckId);
  await updateDoc(userRef, { subscribed_decks: arr });
}

export async function syncNewDeckWords(uid, deckId) {
  const [words, existingSnap] = await Promise.all([
    getDeckWords(deckId),
    getDocs(query(collection(db, 'users', uid, 'progress'), where('deck_id', '==', deckId)))
  ]);
  const existing = new Set(existingSnap.docs.map(d => d.id));
  const now = Timestamp.fromDate(new Date());

  const missing = [];
  for (const word of words) {
    for (const dir of ['vn_en', 'en_vn']) {
      const pid = `${word.id}_${dir}`;
      if (!existing.has(pid)) missing.push({ pid, word_id: word.id, dir });
    }
  }

  for (let i = 0; i < missing.length; i += 499) {
    const batch = writeBatch(db);
    for (const { pid, word_id, dir } of missing.slice(i, i + 499)) {
      batch.set(doc(db, 'users', uid, 'progress', pid), {
        word_id, deck_id: deckId, source: 'deck',
        direction: dir, level: 0, due_date: now,
        last_reviewed: null, correct_count: 0, incorrect_count: 0
      });
    }
    await batch.commit();
  }
  return missing.length;
}

// ── Review ───────────────────────────────────────────────────────────────────

export async function getDueCards(uid) {
  const endTs = Timestamp.fromDate(endOfToday());
  const q = query(collection(db, 'users', uid, 'progress'), where('due_date', '<=', endTs));
  const progressSnap = await getDocs(q);
  if (progressSnap.empty) return [];

  // Group word fetches by source to parallelise
  const deckFetches = {};  // wordId → {deckId, wordId}
  const personalIds = [];

  for (const pd of progressSnap.docs) {
    const { word_id, source, deck_id } = pd.data();
    if (source === 'deck') {
      if (!deckFetches[word_id]) deckFetches[word_id] = { deck_id, word_id };
    } else {
      personalIds.push(word_id);
    }
  }

  const wordCache = {};
  await Promise.all([
    ...Object.values(deckFetches).map(async ({ deck_id, word_id }) => {
      const snap = await getDoc(doc(db, 'decks', deck_id, 'words', word_id));
      if (snap.exists()) wordCache[word_id] = snap.data();
    }),
    ...personalIds.map(async id => {
      const snap = await getDoc(doc(db, 'users', uid, 'cards', id));
      if (snap.exists()) wordCache[id] = snap.data();
    })
  ]);

  const cards = progressSnap.docs
    .map(pd => {
      const progress = pd.data();
      const word = wordCache[progress.word_id];
      if (!word) return null;
      return { progressId: pd.id, progress, word, direction: progress.direction };
    })
    .filter(Boolean);

  // Three buckets:
  // 1. Genuinely new — level 0, never reviewed (last_reviewed null) → cap at 12 words × 2 directions
  // 2. Failed-reset  — level 0, previously reviewed then got wrong → always include (retry cycle)
  // 3. Review        — level > 0 → cap at DAILY_REVIEW_LIMIT
  const genuinelyNew = cards.filter(c => c.progress.level === 0 && !c.progress.last_reviewed);
  const failedReset  = cards.filter(c => c.progress.level === 0 &&  c.progress.last_reviewed);
  const reviewCards  = cards.filter(c => c.progress.level  > 0);

  return [
    ...genuinelyNew.slice(0, DAILY_NEW_LIMIT * 2),
    ...failedReset,
    ...reviewCards.slice(0, DAILY_REVIEW_LIMIT)
  ];
}

export async function updateProgress(uid, progressId, correct) {
  const ref = doc(db, 'users', uid, 'progress', progressId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const { level } = snap.data();
  const { level: newLevel, dueDate } = nextInterval(level, correct);
  await updateDoc(ref, {
    level: newLevel,
    due_date: Timestamp.fromDate(dueDate),
    last_reviewed: serverTimestamp(),
    ...(correct
      ? { correct_count: increment(1) }
      : { incorrect_count: increment(1) })
  });
}

// ── Personal cards ───────────────────────────────────────────────────────────

export async function addPersonalCard(uid, cardData) {
  const cardRef = doc(collection(db, 'users', uid, 'cards'));
  const now = Timestamp.fromDate(new Date());
  await setDoc(cardRef, { ...cardData, created_at: serverTimestamp() });

  const batch = writeBatch(db);
  for (const dir of ['vn_en', 'en_vn']) {
    batch.set(doc(db, 'users', uid, 'progress', `${cardRef.id}_${dir}`), {
      word_id: cardRef.id, deck_id: null, source: 'personal',
      direction: dir, level: 0, due_date: now,
      last_reviewed: null, correct_count: 0, incorrect_count: 0
    });
  }
  await batch.commit();
  return cardRef.id;
}

export async function getPersonalCards(uid) {
  const snap = await getDocs(
    query(collection(db, 'users', uid, 'cards'), orderBy('created_at', 'desc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deletePersonalCard(uid, cardId) {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'users', uid, 'cards', cardId));
  batch.delete(doc(db, 'users', uid, 'progress', `${cardId}_vn_en`));
  batch.delete(doc(db, 'users', uid, 'progress', `${cardId}_en_vn`));
  await batch.commit();
}

// ── Admin ────────────────────────────────────────────────────────────────────

export async function deleteDeck(deckId) {
  const words = await getDeckWords(deckId);
  for (let i = 0; i < words.length; i += 499) {
    const batch = writeBatch(db);
    for (const w of words.slice(i, i + 499)) {
      batch.delete(doc(db, 'decks', deckId, 'words', w.id));
    }
    await batch.commit();
  }
  await deleteDoc(doc(db, 'decks', deckId));
}

export async function findOrCreateDeck(subject, unit, subunit) {
  const decks = await getAllDecks();
  const match = decks.find(d =>
    d.subject === subject && d.unit === unit && (d.subunit || '') === (subunit || '')
  );
  if (match) return match.id;
  const name = subunit || unit;
  return createDeck(name, '', subject, unit, subunit);
}

export async function createDeck(name, description, subject = '', unit = '', subunit = '') {
  const ref = doc(collection(db, 'decks'));
  await setDoc(ref, {
    name, description, subject, unit, subunit,
    is_public: true,
    word_count: 0,
    created_by: auth.currentUser.uid,
    created_at: serverTimestamp()
  });
  return ref.id;
}

export async function addWordToDeck(deckId, wordData) {
  const ref = doc(collection(db, 'decks', deckId, 'words'));
  await setDoc(ref, { ...wordData, created_at: serverTimestamp() });
  await updateDoc(doc(db, 'decks', deckId), { word_count: increment(1) });
  return ref.id;
}

export async function updateWord(deckId, wordId, wordData) {
  await updateDoc(doc(db, 'decks', deckId, 'words', wordId), wordData);
}

export async function bulkAddWordsToDeck(deckId, words) {
  let added = 0;
  for (let i = 0; i < words.length; i += 499) {
    const chunk = words.slice(i, i + 499);
    const batch = writeBatch(db);
    for (const word of chunk) {
      batch.set(doc(collection(db, 'decks', deckId, 'words')), {
        ...word, created_at: serverTimestamp()
      });
      added++;
    }
    await batch.commit();
  }
  await updateDoc(doc(db, 'decks', deckId), { word_count: increment(added) });
  return added;
}

export async function getAllDecks() {
  const snap = await getDocs(query(collection(db, 'decks'), orderBy('name')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
