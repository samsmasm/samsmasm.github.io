// Run with: node test/builder.test.js

import assert from 'node:assert/strict';
import { playMatch } from '../js/engine.js';
import { validate } from '../js/validate.js';
import { compile, defaultAnswers, builderAnswersFor } from '../js/builder.js';
import * as K from './classics.js';

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('PASS', name); }
  catch (e) { failed++; console.log('FAIL', name, '\n   ', e.message); }
}
const str = moves => moves.map(m => (m === 'cooperate' ? 'C' : 'D')).join('');
const with_ = (changes) => {
  const a = defaultAnswers();
  for (const [k, v] of Object.entries(changes)) a[k] = typeof v === 'object' && !Array.isArray(v) ? { ...a[k], ...v } : v;
  return compile(a);
};
const slipsOn = rounds => ({
  schemaVersion: 1, name: 'Defects on given rounds', firstMove: { do: 'cooperate' },
  rules: [{ when: [{ check: 'round', equals: rounds[0] }], do: 'defect' }, ...(rounds[1] ? [{ when: [{ check: 'round', equals: rounds[1] }], do: 'defect' }] : [])],
  fallback: { do: 'cooperate' }
});

test('default answers make Tit for Tat', () => {
  const s = compile(defaultAnswers());
  assert.ok(validate(s).ok, validate(s).errors.join('; '));
  for (const opp of [K.alwaysDefect, K.random, K.pavlov, K.ccd]) {
    const a = playMatch(s, opp, { rounds: 60, seed: 'q' });
    const b = playMatch(K.titForTat, opp, { rounds: 60, seed: 'q' });
    assert.deepEqual(a.movesA, b.movesA, opp.name);
  }
});

test('grudge of 3 rounds', () => {
  const s = with_({ grudge: { kind: 'n', n: 3 } });
  assert.ok(validate(s).ok, validate(s).errors.join('; '));
  assert.equal(str(playMatch(s, slipsOn([2]), { rounds: 8 }).movesA), 'CCDDDCCC');
});

test('grudge forever is Grudger', () => {
  const s = with_({ grudge: { kind: 'forever' } });
  const a = playMatch(s, slipsOn([3]), { rounds: 8 });
  assert.equal(str(a.movesA), 'CCCDDDDD');
});

test('forgive after 2 cooperations ends a forever grudge', () => {
  const s = with_({ grudge: { kind: 'forever' }, forgive: { on: true, kind: 'coop', n: 2 } });
  assert.ok(validate(s).ok, validate(s).errors.join('; '));
  // They defect on round 2 and cooperate after. Rounds 3, 4 punished, then
  // on round 5 they have cooperated twice in a row (rounds 3 and 4).
  assert.equal(str(playMatch(s, slipsOn([2]), { rounds: 7 }).movesA), 'CCDDCCC');
});

test('patience: two in a row before reacting', () => {
  const s = with_({ patience: { on: true, kind: 'twoInARow' } });
  assert.equal(str(playMatch(s, K.alwaysDefect, { rounds: 5 }).movesA), 'CCDDD');
});

test('special rounds: final round and every 10th, any match length', () => {
  const s = with_({ special: { on: true, entries: [{ kind: 'final', do: 'defect', chance: 100 }, { kind: 'every', a: 10, do: 'defect', chance: 100 }] } });
  assert.ok(validate(s).ok, validate(s).errors.join('; '));
  const m = playMatch(s, K.alwaysCooperate, { rounds: 25 });
  const d = m.movesA.map((x, i) => (x === 'defect' ? i + 1 : 0)).filter(Boolean);
  assert.deepEqual(d, [10, 20, 25]);
});

test('special round 1 becomes the first move', () => {
  const s = with_({ special: { on: true, entries: [{ kind: 'round', a: 1, do: 'defect', chance: 100 }] } });
  assert.deepEqual(s.firstMove, { do: 'defect' });
});

test('start-up phase then normal play', () => {
  const s = with_({ startup: { on: true, moves: ['defect', 'defect', 'cooperate'] } });
  assert.equal(str(playMatch(s, K.alwaysCooperate, { rounds: 6 }).movesA), 'DDCCCC');
});

test('pattern alone ignores the opponent', () => {
  const s = with_({ pattern: { on: true, use: 'alone', moves: ['cooperate', 'defect'] } });
  assert.equal(str(playMatch(s, K.alwaysDefect, { rounds: 6 }).movesA), 'CDCDCD');
});

test('testing then exploiting a pushover', () => {
  const s = with_({ testing: { on: true, chance: 100, ifRetaliate: 'normal', ifNot: 'exploit' } });
  assert.ok(validate(s).ok, validate(s).errors.join('; '));
  assert.equal(str(playMatch(s, K.alwaysCooperate, { rounds: 6 }).movesA), 'CDDDDD');
});

test('testing then saying sorry to Tit for Tat', () => {
  const s = with_({ testing: { on: true, chance: 30, ifRetaliate: 'apologise', ifNot: 'normal' } });
  assert.ok(validate(s).ok, validate(s).errors.join('; '));
  const m = playMatch(s, K.titForTat, { rounds: 300, log: true, seed: 'sorry' });
  const sorry = m.log.filter(r => r.a.rule >= 0 && s.rules[r.a.rule].set && s.rules[r.a.rule].set.tested === 0 && r.a.move === 'cooperate');
  assert.ok(sorry.length > 5, 'apologised ' + sorry.length + ' times');
});

test('switching, scoreboard and reading compile and validate', () => {
  const s = with_({
    switching: { on: true, kind: 'betrayals', n: 5, do: 'defect' },
    scoreboard: { on: true, when: 'behind', by: 10, do: 'defect', chance: 80 },
    reading: { on: true, above: 50, do: 'cooperate', elseDo: 'defect' },
    slip: { on: true, chance: 5 },
    first: { do: 'cooperate', chance: 90 }
  });
  const v = validate(s);
  assert.ok(v.ok, v.errors.join('; '));
  assert.deepEqual(s.firstMove, { do: 'cooperate', chance: 90, otherwise: 'defect' });
  assert.equal(s.slip, 5);
});

test('builder answers round-trip, and a hand edit is spotted', () => {
  const s = with_({ grudge: { kind: 'n', n: 4 } });
  const copy = JSON.parse(JSON.stringify(s));
  assert.ok(builderAnswersFor(copy));
  copy.rules[0].do = 'cooperate';
  assert.equal(builderAnswersFor(copy), null);
  assert.equal(builderAnswersFor(K.titForTat), null);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
