// node tote/test/crypto.test.mjs
// Checks client.js's crypto (it imports Firebase from a CDN, so its crypto functions are copied here
// from client.js source rather than imported).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../client.js', import.meta.url), 'utf8');
const pick = name => {
  const m = src.match(new RegExp(`(?:export )?(?:async )?(?:function ${name}\\b[\\s\\S]*?\\n\\}|const ${name} = [^\\n]*)`));
  if (!m) throw new Error('missing ' + name);
  return m[0].replace(/^export /, '');
};
const code = ['enc', 'b64', 'unb64', 'derive', 'encrypt', 'decrypt', 'keyFits'].map(pick).join('\n');
const { derive, encrypt, decrypt, keyFits } = new Function(
  'const ITERATIONS = 600000;\n' + code + '\nreturn { derive, encrypt, decrypt, keyFits };')();

const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await derive('correct horse battery', salt);
const meta = { salt: null, check: await encrypt(key, 'check', 'tote-ok') };

const text = 'Meeting notes ✓ – ünïcödé\n'.repeat(5000); // ~130 KB, exercises chunked base64
const box = await encrypt(key, 'note1', text);
assert.equal(await decrypt(key, 'note1', box), text, 'round trip');
assert.equal(box.ct.includes('Meeting'), false, 'ciphertext is not plain text');
await assert.rejects(decrypt(key, 'note2', box), 'ciphertext bound to its note id');

const wrong = await derive('wrong horse battery', salt);
await assert.rejects(decrypt(wrong, 'note1', box), 'wrong passphrase cannot decrypt');
assert.equal(await keyFits(key, meta), true, 'check passes with right key');
assert.equal(await keyFits(wrong, meta), false, 'check fails with wrong key');

const again = await derive('correct horse battery', salt);
assert.equal(await decrypt(again, 'note1', box), text, 'same passphrase + salt = same key');
await assert.rejects(crypto.subtle.exportKey('raw', key), 'raw key cannot be exported');

console.log('tote crypto tests passed');
