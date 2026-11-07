// node tote/test/worker.test.mjs
// Checks the Worker's token check and its note routes against an in-memory KV.
import worker, { verifyIdToken } from '../worker/src/index.js';
import assert from 'node:assert/strict';

const b64url = buf => Buffer.from(buf).toString('base64url');
const pair = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true, ['sign', 'verify']);
const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid: 'k1' };

// The Worker fetches Google's keys; hand it ours instead.
globalThis.fetch = async () => new Response(JSON.stringify({ keys: [jwk] }));

async function token(over = {}, headerOver = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', kid: 'k1', typ: 'JWT', ...headerOver };
  const payload = {
    aud: 'coldwar-d8109', iss: 'https://securetoken.google.com/coldwar-d8109',
    sub: 'uid1', email: 'samgetsstuffdone@gmail.com', email_verified: true,
    iat: now - 60, exp: now + 3000, ...over,
  };
  const data = b64url(JSON.stringify(header)) + '.' + b64url(JSON.stringify(payload));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(data));
  return data + '.' + b64url(sig);
}

// ---- token check ----
const tenv = { FIREBASE_PROJECT: 'coldwar-d8109', ALLOWED_EMAIL: 'samgetsstuffdone@gmail.com' };
const ok = async t => !!(await verifyIdToken(t, tenv, Date.now() / 1000, [jwk]));
assert.equal(await ok(await token()), true, 'valid token accepted');
assert.equal(await ok(await token({ email: 'someone@gmail.com' })), false, 'other email rejected');
assert.equal(await ok(await token({ email_verified: false })), false, 'unverified email rejected');
assert.equal(await ok(await token({ aud: 'other' })), false, 'wrong audience rejected');
assert.equal(await ok(await token({ exp: 1 })), false, 'expired rejected');
assert.equal(await ok(await token({}, { alg: 'none' })), false, 'alg none rejected');
assert.equal(await ok('a.b.c'), false, 'garbage rejected');

// ---- routes, with a fake KV ----
class FakeKV {
  m = new Map();
  async get(k, type) { const e = this.m.get(k); if (!e) return null; return type === 'json' ? JSON.parse(e.v) : e.v; }
  async put(k, v, opts = {}) { this.m.set(k, { v, expiration: opts.expirationTtl ? Math.floor(Date.now() / 1000) + opts.expirationTtl : undefined }); }
  async delete(k) { this.m.delete(k); }
  async list({ prefix }) {
    return { keys: [...this.m].filter(([k]) => k.startsWith(prefix)).map(([name, e]) => ({ name, expiration: e.expiration })), list_complete: true };
  }
}
const env = { ...tenv, TOTE_KV: new FakeKV() };
const good = await token();
const call = async (method, path, body, tok = good) => {
  const res = await worker.fetch(new Request('https://unisam.nz/tote/api' + path, {
    method, headers: { Authorization: 'Bearer ' + tok, Origin: 'https://unisam.nz' }, body: body && JSON.stringify(body),
  }), env);
  return { status: res.status, body: await res.json(), cors: res.headers.get('Access-Control-Allow-Origin') };
};
const box = { iv: 'AAAAAAAAAAAAAAAA', ct: 'c2VjcmV0' };

assert.equal((await call('GET', '/notes', null, '')).status, 401, 'no token: 401');
assert.equal((await call('GET', '/notes', null, await token({ email: 'x@y.z' }))).status, 401, 'other account: 401');

let r = await call('GET', '/meta');
assert.equal(r.status, 200); assert.equal(r.body.meta, null, 'no meta at first');
assert.equal(r.cors, 'https://unisam.nz', 'CORS for unisam.nz');
assert.equal((await call('PUT', '/meta', { salt: 'c2FsdA==', check: box })).status, 200, 'meta set');
assert.equal((await call('PUT', '/meta', { salt: 'b3RoZXI=', check: box })).status, 409, 'meta cannot be overwritten');
assert.equal((await call('GET', '/meta')).body.meta.salt, 'c2FsdA==');

assert.equal((await call('PUT', '/notes/abcdefgh12345678', box)).status, 200, 'note saved');
assert.equal((await call('PUT', '/notes/bad', box)).status, 404, 'short id rejected');
assert.equal((await call('PUT', '/notes/abcdefgh12345678', { iv: 'x', ct: '<script>' })).status, 400, 'non-base64 rejected');
assert.equal((await call('PUT', '/notes/abcdefgh12345678', { content: 'plain text' })).status, 400, 'plain text rejected');
assert.equal(env.TOTE_KV.m.get('n:abcdefgh12345678').expiration > Date.now() / 1000 + 95 * 3600, true, 'saved with ~96h TTL');

r = await call('GET', '/notes');
assert.equal(r.body.notes.length, 1);
assert.deepEqual({ ...r.body.notes[0], expires: 0 }, { id: 'abcdefgh12345678', ...box, expires: 0 });
assert.equal(r.body.notes[0].expires > Date.now(), true, 'expiry reported in ms');

env.TOTE_KV.m.get('n:abcdefgh12345678').expiration = 5;
assert.equal((await call('POST', '/notes/abcdefgh12345678/renew')).status, 200, 'renewed');
assert.equal(env.TOTE_KV.m.get('n:abcdefgh12345678').expiration > Date.now() / 1000 + 95 * 3600, true, 'renew resets TTL');
assert.equal((await call('POST', '/notes/zzzzzzzzzzzzzzzz/renew')).status, 404, 'renew missing: 404');

assert.equal((await call('DELETE', '/notes/abcdefgh12345678')).status, 200);
assert.equal((await call('GET', '/notes')).body.notes.length, 0, 'deleted');

await call('PUT', '/notes/aaaaaaaaaaaaaaaa', box);
await call('PUT', '/notes/bbbbbbbbbbbbbbbb', box);
r = await call('DELETE', '/all');
assert.equal(r.body.deleted, 2);
assert.equal(env.TOTE_KV.m.size, 0, 'wipe removes notes and meta');

console.log('tote worker tests passed');
