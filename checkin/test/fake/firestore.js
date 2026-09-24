// An in-memory stand-in for Firestore with the parts of its behaviour that
// matter to this bug: merge writes, dotted-path deletes, and a collection
// listener that fires a little later than the write that caused it.

export const STORE = new Map();      // path -> data object
export const LOG = [];               // every write, in order
let listeners = [];
export const CONFIG = { latency: 30 };

export function getFirestore() { return { fake: true }; }
export function serverTimestamp() { return { __ts: true, at: Date.now() }; }
export function deleteField() { return { __delete: true }; }

export function doc(dbOrRef, ...parts) {
  const base = dbOrRef && dbOrRef.path ? dbOrRef.path.split('/') : [];
  return { path: base.concat(parts).join('/'), type: 'doc' };
}
export function collection(dbOrRef, ...parts) {
  const base = dbOrRef && dbOrRef.path ? dbOrRef.path.split('/') : [];
  return { path: base.concat(parts).join('/'), type: 'col' };
}
export function query(ref) { return ref; }
export function orderBy() { return {}; }

function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

function deepMerge(target, patch) {
  const out = { ...(target || {}) };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && !v.__ts && !v.__delete) {
      out[k] = deepMerge(out[k], v);
    } else if (v && v.__delete) {
      delete out[k];
    } else {
      out[k] = v;
    }
  }
  return out;
}

function parentPath(path) { return path.split('/').slice(0, -1).join('/'); }

function notify(path) {
  const parent = parentPath(path);
  setTimeout(() => {
    listeners.filter(l => l.path === parent).forEach(l => l.fire());
  }, CONFIG.latency);
}

export async function setDoc(ref, data, opts) {
  LOG.push({ op: opts && opts.merge ? 'set/merge' : 'set', path: ref.path, data: clone(data) });
  const prior = STORE.get(ref.path);
  STORE.set(ref.path, opts && opts.merge ? deepMerge(prior, clone(data)) : clone(data));
  notify(ref.path);
}

export async function updateDoc(ref, data) {
  LOG.push({ op: 'update', path: ref.path, data: clone(data) });
  if (!STORE.has(ref.path)) { const e = new Error('No document to update'); e.code = 'not-found'; throw e; }
  let next = STORE.get(ref.path);
  for (const [k, v] of Object.entries(data)) {
    if (k.includes('.')) {
      const bits = k.split('.');
      let node = next;
      for (const b of bits.slice(0, -1)) { node[b] = node[b] || {}; node = node[b]; }
      if (v && v.__delete) delete node[bits[bits.length - 1]];
      else node[bits[bits.length - 1]] = clone(v);
    } else if (v && v.__delete) {
      delete next[k];
    } else {
      next = deepMerge(next, { [k]: clone(v) });
    }
  }
  STORE.set(ref.path, next);
  notify(ref.path);
}

export async function deleteDoc(ref) {
  LOG.push({ op: 'delete', path: ref.path });
  STORE.delete(ref.path);
  notify(ref.path);
}

export async function addDoc(ref, data) {
  const id = 'auto' + (LOG.length + 1);
  await setDoc({ path: ref.path + '/' + id }, data);
  return { id };
}

export async function getDoc(ref) {
  const data = STORE.get(ref.path);
  return {
    id: ref.path.split('/').pop(),
    exists: () => data !== undefined,
    data: () => clone(data)
  };
}

function docsIn(path) {
  const depth = path.split('/').length + 1;
  return [...STORE.entries()]
    .filter(([p]) => p.startsWith(path + '/') && p.split('/').length === depth)
    .map(([p, data]) => ({ id: p.split('/').pop(), data: () => clone(data), exists: () => true }));
}

export async function getDocs(ref) {
  const docs = docsIn(ref.path);
  return { docs, empty: !docs.length, forEach: fn => docs.forEach(fn) };
}

export function onSnapshot(ref, next, error) {
  const entry = {
    path: ref.path,
    fire: () => next({ docs: docsIn(ref.path), empty: !docsIn(ref.path).length })
  };
  listeners.push(entry);
  setTimeout(entry.fire, 0);
  return () => { listeners = listeners.filter(l => l !== entry); };
}

export function writeBatch() {
  const ops = [];
  return {
    set: (ref, data, opts) => ops.push(() => setDoc(ref, data, opts)),
    update: (ref, data) => ops.push(() => updateDoc(ref, data)),
    delete: ref => ops.push(() => deleteDoc(ref)),
    commit: async () => { for (const op of ops) await op(); }
  };
}
