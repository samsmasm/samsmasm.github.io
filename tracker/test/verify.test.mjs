// node tracker/test/verify.test.mjs
// Checks the Worker's Firebase ID token check with a locally made RSA key.
import { verifyIdToken } from '../worker/src/index.js';
import assert from 'node:assert/strict';

const env = { FIREBASE_PROJECT: 'coldwar-d8109', ALLOWED_EMAIL: 'samgetsstuffdone@gmail.com' };
const now = 1_800_000_000;
const b64url = buf => Buffer.from(buf).toString('base64url');

const pair = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true, ['sign', 'verify']);
const pub = await crypto.subtle.exportKey('jwk', pair.publicKey);
const keys = [{ ...pub, kid: 'k1' }];

async function token(over = {}, headerOver = {}, signer = pair.privateKey) {
  const header = { alg: 'RS256', kid: 'k1', typ: 'JWT', ...headerOver };
  const payload = {
    aud: 'coldwar-d8109', iss: 'https://securetoken.google.com/coldwar-d8109',
    sub: 'uid1', email: 'samgetsstuffdone@gmail.com', email_verified: true,
    iat: now - 60, exp: now + 3000, ...over,
  };
  const data = b64url(JSON.stringify(header)) + '.' + b64url(JSON.stringify(payload));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', signer, new TextEncoder().encode(data));
  return data + '.' + b64url(sig);
}
const check = async t => !!(await verifyIdToken(t, env, now, keys));

assert.equal(await check(await token()), true, 'valid token accepted');
assert.equal(await check(await token({ email: 'Samgetsstuffdone@gmail.com' })), true, 'email case ignored');
assert.equal(await check(await token({ email: 'someone@gmail.com' })), false, 'other email rejected');
assert.equal(await check(await token({ email_verified: false })), false, 'unverified email rejected');
assert.equal(await check(await token({ aud: 'other-project' })), false, 'wrong audience rejected');
assert.equal(await check(await token({ iss: 'https://evil.example' })), false, 'wrong issuer rejected');
assert.equal(await check(await token({ exp: now - 1 })), false, 'expired rejected');
assert.equal(await check(await token({}, { kid: 'nope' })), false, 'unknown key rejected');
assert.equal(await check(await token({}, { alg: 'none' })), false, 'alg none rejected');

const other = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true, ['sign', 'verify']);
assert.equal(await check(await token({}, {}, other.privateKey)), false, 'wrong signature rejected');

const good = await token();
const [h, , s] = good.split('.');
const forged = h + '.' + b64url(JSON.stringify({ aud: 'coldwar-d8109', iss: 'https://securetoken.google.com/coldwar-d8109',
  sub: 'x', email: 'samgetsstuffdone@gmail.com', email_verified: true, iat: now, exp: now + 9999, extra: 1 })) + '.' + s;
assert.equal(await check(forged), false, 'edited payload rejected');
assert.equal(await check(''), false, 'empty rejected');
assert.equal(await check('a.b.c'), false, 'garbage rejected');

console.log('verify tests passed');
