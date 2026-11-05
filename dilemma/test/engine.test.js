// Run with: node test/engine.test.js (from the dilemma folder, or anywhere).

import assert from 'node:assert/strict';
import { playMatch } from '../js/engine.js';
import { runTournament } from '../js/tournament.js';
import { validate, parsePasted } from '../js/validate.js';
import { readbackText } from '../js/readback.js';
import * as K from './classics.js';

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('PASS', name); }
  catch (e) { failed++; console.log('FAIL', name, '\n   ', e.message); }
}
const str = moves => moves.map(m => (m === 'cooperate' ? 'C' : 'D')).join('');

await test('every classic strategy is valid', () => {
  for (const s of K.all) {
    const v = validate(s);
    assert.ok(v.ok, s.name + ': ' + v.errors.join('; '));
  }
});

await test('Tit for Tat vs Always Defect: 5 years, then 4 a round', () => {
  const m = playMatch(K.titForTat, K.alwaysDefect, { rounds: 100 });
  assert.equal(m.scoreA, 401);
  assert.equal(m.scoreB, 396);
  assert.equal(str(m.movesA).slice(0, 3), 'CDD');
});

await test('Tit for Tat vs Tit for Tat cooperates throughout', () => {
  const m = playMatch(K.titForTat, K.titForTat, { rounds: 100 });
  assert.equal(m.scoreA, 200);
  assert.equal(m.scoreB, 200);
});

await test('Grudger never forgives', () => {
  const oneSlip = {
    schemaVersion: 1, name: 'Slips on round 3',
    firstMove: { do: 'cooperate' },
    rules: [{ when: [{ check: 'round', equals: 3 }], do: 'defect' }],
    fallback: { do: 'cooperate' }
  };
  const m = playMatch(K.grudger, oneSlip, { rounds: 8 });
  assert.equal(str(m.movesA), 'CCCDDDDD');
  assert.equal(str(m.movesB), 'CCDCCCCC');
});

await test('Pavlov: win-stay, lose-shift', () => {
  const m = playMatch(K.pavlov, K.alwaysDefect, { rounds: 6 });
  // C (sucker) shift to D, D vs D (1 point) shift to C, ...
  assert.equal(str(m.movesA), 'CDCDCD');
  const n = playMatch(K.pavlov, K.alwaysCooperate, { rounds: 4 });
  assert.equal(str(n.movesA), 'CCCC');
});

await test('Tit for Two Tats waits for two defections in a row', () => {
  const m = playMatch(K.titForTwoTats, K.alwaysDefect, { rounds: 5 });
  assert.equal(str(m.movesA), 'CCDDD');
});

await test('memory: punish for three rounds then return', () => {
  const oneSlip = {
    schemaVersion: 1, name: 'Slips on round 2',
    firstMove: { do: 'cooperate' },
    rules: [{ when: [{ check: 'round', equals: 2 }], do: 'defect' }],
    fallback: { do: 'cooperate' }
  };
  const m = playMatch(K.punisher3, oneSlip, { rounds: 8 });
  assert.equal(str(m.movesA), 'CCDDDCCC');
});

await test('last round behaviour uses rounds left, whatever the length', () => {
  for (const rounds of [10, 37, 200]) {
    const m = playMatch(K.endGameTitForTat, K.alwaysCooperate, { rounds, log: true });
    assert.equal(m.movesA[rounds - 1], 'defect');
    assert.equal(m.movesA.slice(0, -1).every(x => x === 'cooperate'), true);
    assert.equal(m.log[rounds - 1].a.rule, 0);
  }
});

await test('scoreLead: behind means more years than them', () => {
  const s = {
    schemaVersion: 1, name: 'Fights back when behind',
    firstMove: { do: 'cooperate' },
    rules: [{ when: [{ check: 'scoreLead', atMost: -5 }], do: 'defect' }],
    fallback: { do: 'cooperate' }
  };
  // Round 1: 5 years to their 0, so behind by 5 and defects from round 2.
  assert.equal(str(playMatch(s, K.alwaysDefect, { rounds: 4 }).movesA), 'CDDD');
  assert.equal(str(playMatch(s, K.alwaysCooperate, { rounds: 4 }).movesA), 'CCCC');
});

await test('pattern repeats C C D', () => {
  const m = playMatch(K.ccd, K.alwaysCooperate, { rounds: 7 });
  assert.equal(str(m.movesA), 'CCDCCDC');
});

await test('same seed, same match; different seed, different match', () => {
  const a = playMatch(K.random, K.random, { rounds: 200, seed: 'x' });
  const b = playMatch(K.random, K.random, { rounds: 200, seed: 'x' });
  const c = playMatch(K.random, K.random, { rounds: 200, seed: 'y' });
  assert.deepEqual(a.movesA, b.movesA);
  assert.deepEqual(a.movesB, b.movesB);
  assert.notDeepEqual(a.movesA, c.movesA);
  assert.notDeepEqual(a.movesA, a.movesB);
  const coop = a.movesA.filter(x => x === 'cooperate').length;
  assert.ok(coop > 70 && coop < 130, 'roughly half: ' + coop);
});

await test('random slips hand the move to a coin flip and are logged', () => {
  const sloppy = { ...K.alwaysCooperate, name: 'Sloppy', slip: 40 };
  const m = playMatch(sloppy, K.alwaysCooperate, { rounds: 500, log: true, seed: 's' });
  const slips = m.log.filter(r => r.a.slipped);
  assert.ok(slips.length > 60 && slips.length < 140, 'about 20% changed: ' + slips.length);
  assert.ok(slips.every(r => r.a.intended === 'cooperate' && r.a.move === 'defect'));
  // 100% slip is a fully random player, whatever its rules say.
  const chaos = playMatch({ ...K.alwaysDefect, slip: 100 }, K.alwaysCooperate, { rounds: 500, seed: 's' });
  const coop = chaos.movesA.filter(x => x === 'cooperate').length;
  assert.ok(coop > 200 && coop < 300, 'about half: ' + coop);
});

await test('chance with otherwise nextRule falls through', () => {
  const s = {
    schemaVersion: 1, name: 'Sometimes test',
    firstMove: { do: 'cooperate' },
    rules: [{ do: 'defect', chance: 30, otherwise: 'nextRule' }],
    fallback: { do: 'cooperate' }
  };
  assert.ok(validate(s).ok, validate(s).errors.join('; '));
  const m = playMatch(s, K.alwaysCooperate, { rounds: 1000, log: true });
  const fromRule = m.log.filter(r => r.a.rule === 0).length;
  const fromFallback = m.log.filter(r => r.a.rule === -2).length;
  assert.equal(fromRule + fromFallback, 999);
  assert.ok(fromRule > 230 && fromRule < 370, 'about 30%: ' + fromRule);
});

await test('round robin tournament: totals, self play, head to head', async () => {
  const entries = [K.titForTat, K.alwaysDefect, K.alwaysCooperate].map((s, i) => ({ id: 'e' + i, name: s.name, strategy: s }));
  const r = await runTournament(entries, { rounds: 10, seed: 't', selfPlay: true });
  assert.equal(r.matches.length, 6);
  // Years. TFT: self 20, vs AllD 41, vs AllC 20
  assert.equal(r.table[0].total, 81);
  // AllD: self 40, vs TFT 36, vs AllC 0
  assert.equal(r.table[1].total, 76);
  // AllC: self 20, vs TFT 20, vs AllD 50
  assert.equal(r.table[2].total, 90);
  assert.equal(r.ranking[0].name, 'Always Defect', 'fewest years ranks first');
  assert.equal(r.ranking[2].name, 'Always Cooperate');
  assert.equal(r.h2h[0][1], 41);
  assert.equal(r.h2h[1][0], 36);
  const noSelf = await runTournament(entries, { rounds: 10, seed: 't', selfPlay: false });
  assert.equal(noSelf.matches.length, 3);
  assert.equal(noSelf.table[0].total, 61);
});

await test('tournament is reproducible from its seed', async () => {
  const entries = [K.random, K.pavlov, K.grudger].map((s, i) => ({ id: 'e' + i, name: s.name, strategy: s }));
  const a = await runTournament(entries, { rounds: 100, seed: 'repeat' });
  const b = await runTournament(entries, { rounds: 100, seed: 'repeat' });
  assert.deepEqual(a.table.map(t => t.total), b.table.map(t => t.total));
});

await test('validator: friendly errors for common AI slips', () => {
  const bad = {
    schemaVersion: 1, name: 'Oops',
    firstMove: { do: 'copy' },
    rules: [
      { when: [{ check: 'theirlast', is: 'defect' }], do: 'defect' },
      { when: [{ check: 'round', atLeast: 5, atMost: 10 }], do: 'cooperate', chance: 50 },
      { when: [{ check: 'memory.angry', moreThan: 0 }], do: 'defect' }
    ]
  };
  const v = validate(bad);
  assert.equal(v.ok, false);
  const all = v.errors.join('\n');
  assert.match(all, /firstMove.*round 1/);
  assert.match(all, /fallback.*missing/);
  assert.match(all, /Did you mean "theirLast"/);
  assert.match(all, /Split it into two conditions/);
  assert.match(all, /needs "otherwise"/);
  assert.match(all, /not set up in "memory"/);
});

await test('validator: too many rules, unknown keys', () => {
  const s = { ...K.titForTat, rules: Array(9).fill({ do: 'cooperate' }), colour: 'red' };
  const all = validate(s).errors.join('\n');
  assert.match(all, /most allowed is 8/);
  assert.match(all, /"colour" is not part of a strategy/);
});

await test('parsePasted strips code fences and chatter', () => {
  const p = parsePasted('Here you go!\n```json\n{"a": 1}\n```\nHope that helps.');
  assert.deepEqual(p.value, { a: 1 });
  assert.ok(parsePasted('no json').error);
  assert.ok(parsePasted('{"a": 1,}').error);
});

await test('readback reads in plain English', () => {
  const t = readbackText(K.punisher3);
  assert.match(t, /Round 1: cooperate/);
  assert.match(t, /If they defected last round: defect\. Also set "grudge" to 2/);
  assert.match(t, /take 1 off "grudge"/);
  assert.match(readbackText(K.random), /50% of the time \(often\), otherwise defect/);
  assert.match(readbackText(K.endGameTitForTat), /it is the final round/);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
