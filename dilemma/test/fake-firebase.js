// Stands in for js/firebase.js in the browser tests (swapped in by request
// interception in browser.js). Same exports, no network. Writes are recorded
// on window.__sent so the tests can read them back.

import * as K from './classics.js';

export const MAX_SUBMISSIONS = 5;
export const MAX_JSON = 8000;
export function cleanHandle(h) {
  return String(h || '').replace(/[^A-Za-z0-9 _.-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
}
export function cleanCode(c) {
  return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

const rooms = {
  CLASS1: { title: '10B', open: true, public: false },
  OPEN1: { title: 'The Open', open: true, public: true },
  SHUT1: { title: 'Last term', open: false, public: true }
};
const stored = K.all.map((s, i) => ({ id: 'u' + String(i).padStart(2, '0') + '_1', handle: 'player' + i, name: s.name, schemaVersion: 1, json: JSON.stringify(s) }));
window.__sent = [];

export async function roomInfo(code) { return rooms[code] || null; }
export async function submitStrategy(code, strategy, handle) {
  window.__sent.push({ code, name: strategy.name, handle });
  return 1;
}
export async function publicRooms() {
  return Object.entries(rooms).filter(([, r]) => r.public).map(([code, r]) => ({ code, ...r }));
}
export async function publicStrategies() { return stored; }
export async function publicStandings(code) {
  if (code !== 'OPEN1') return null;
  // Not a real run: just an order, so "top 20" has something to use.
  return {
    rounds: 100, seed: 'open', selfPlay: true, format: 'roundRobin',
    updatedAt: { toDate: () => new Date('2026-11-01') },
    ranking: stored.map((s, k) => ({ id: s.id, name: s.name, handle: s.handle, total: 1000 + k, average: 2 + k / 10, coopRate: 0.5 }))
  };
}
export function teacherApp() {
  return { onAuth: cb => cb(null), signIn: async () => {}, signOut: async () => {} };
}
