// Run: node tests/model.test.js
const assert = require('assert');
const path = require('path');
const M = require('../model.js');
const data = require('../data/derived/data.json');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('ok  ', name); }
  catch (e) { console.log('FAIL', name, '\n     ', e.message); process.exitCode = 1; }
}

test('Sainte-Lague hand-worked example', () => {
  // A 53, B 24, C 23 over 7 seats. Quotients:
  // A: 53, 17.67, 10.6, 7.57   B: 24, 8, 4.8   C: 23, 7.67, 4.6
  // Top 7: 53, 24, 23, 17.67, 10.6, 8, 7.67 -> A 3, B 2, C 2
  assert.deepStrictEqual(M.sainteLague({ A: 53, B: 24, C: 23 }, 7), { A: 3, B: 2, C: 2 });
});

test('Reproduce 2023: 122 seats, N48 L34 G15 A11 NZF8 TPM6', () => {
  const vote = { ...data.national2023 };
  const r = M.allocate(vote, data.electorateWins2023);
  const t = k => r.parties[k].total;
  assert.deepStrictEqual(
    { NAT: t('NAT'), LAB: t('LAB'), GRN: t('GRN'), ACT: t('ACT'), NZF: t('NZF'), TPM: t('TPM') },
    { NAT: 48, LAB: 34, GRN: 15, ACT: 11, NZF: 8, TPM: 6 });
  assert.strictEqual(r.house, 122);
  assert.strictEqual(r.parties.TPM.overhang, 2);
  assert.strictEqual(r.parties.OPP.total, 0);
});

test('Threshold: under 5% with an electorate qualifies (coat-tail)', () => {
  const r = M.allocate({ A: 50, B: 46, C: 4 }, { C: 1 });
  assert.ok(r.parties.C.qualifies);
  assert.ok(r.parties.C.total >= 4, 'C should get about 4% of 120 seats');
});

test('Threshold: under 5% with no electorate gets nothing', () => {
  const r = M.allocate({ A: 50, B: 46, C: 4 }, {});
  assert.ok(!r.parties.C.qualifies);
  assert.strictEqual(r.parties.C.total, 0);
  assert.strictEqual(r.parties.A.total + r.parties.B.total, 120);
});

test('List filling: electorate winner on the list appears once, as electorate MP', () => {
  const alloc = { parties: { X: { list: 2, total: 3 } } };
  const winners = [{ name: 'Seat One', party: 'X', candidate: 'Chlöe Smith' }];
  const lists = { X: [
    { rank: 1, name: 'Chloe Smith' }, // same person, accent differs
    { rank: 2, name: 'Bob Jones' },
    { rank: 3, name: 'Ann Lee' },
    { rank: 4, name: 'Tim Hill' },
  ] };
  const s = M.fillSeats(alloc, winners, lists).X;
  assert.deepStrictEqual(s.mps.map(m => m.name), ['Chlöe Smith', 'Bob Jones', 'Ann Lee']);
  assert.strictEqual(s.mps[0].how, 'electorate');
  assert.deepStrictEqual(s.next.map(m => m.name), ['Tim Hill']);
});

test('Overhang: party with more electorates than entitlement keeps them', () => {
  const r = M.allocate({ A: 60, B: 38, C: 2 }, { C: 4 });
  assert.strictEqual(r.parties.C.total, 4);
  assert.strictEqual(r.parties.C.list, 0);
  assert.ok(r.house > 120);
});

test('Poll average: all pollsters excluded gives no average', () => {
  const all = [...new Set(data.polls.map(p => M.slug(p.pollster)))];
  const pa = M.pollAverage(data.polls, data.pollParties, all);
  assert.strictEqual(pa.avg, null);
});

test('Poll average uses only the latest poll from each pollster', () => {
  const pa = M.pollAverage(data.polls, data.pollParties, []);
  const names = pa.used.map(p => p.pollster);
  assert.strictEqual(new Set(names).size, names.length);
  for (const u of pa.used) {
    const newer = data.polls.filter(p => p.pollster === u.pollster && p.end > u.end);
    assert.strictEqual(newer.length, 0, u.pollster);
  }
});

test('Poll average sums to 100', () => {
  const pa = M.pollAverage(data.polls, data.pollParties, []);
  const sum = Object.values(pa.avg).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 100) < 1e-9, String(sum));
});

test('Full run: both models give 71 electorates and a full House', () => {
  for (const model of ['hold', 'swing']) {
    const r = M.run(data, { model, excl: [] });
    assert.strictEqual(r.winners.length, 71);
    assert.ok(r.alloc.house >= 120);
    for (const k in r.seats) assert.strictEqual(r.seats[k].mps.length + r.seats[k].shortBy, r.alloc.parties[k].total, k);
  }
});

console.log(`\n${passed} passed`);
