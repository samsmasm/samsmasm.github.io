// Data checks. Run: node scripts/check.js
const M = require('../model.js');
const data = require('../data/derived/data.json');

console.log('Electorates mapped:', data.electorates.length, '(should be 71)');
console.log('Polls:', data.polls.length, '| newest', data.polls[0].end);

for (const model of ['hold', 'swing']) {
  const r = M.run(data, { model, excl: [] });
  console.log(`\n== Model: ${model} ==`);
  const tbc = r.winners.filter(w => !w.candidate);
  console.log('Seats with no candidate for the predicted winner:', tbc.length ? tbc.map(w => `${w.name} (${w.party})`).join(', ') : 'none');
  for (const k in r.alloc.parties) {
    const p = r.alloc.parties[k];
    if (p.total && !data.lists[k]) console.log('Party with seats but no list:', k);
    if (r.seats[k].shortBy) console.log(`List exhausted: ${k} short by ${r.seats[k].shortBy}`);
  }
  const rows = Object.entries(r.alloc.parties).filter(([, p]) => p.total).sort((a, b) => b[1].total - a[1].total);
  console.log('House', r.alloc.house, rows.map(([k, p]) => `${k} ${p.total} (${p.electorates}e+${p.list}l, ${p.vote.toFixed(1)}%)`).join(', '));
}

console.log('\nMedium/low confidence mappings:');
for (const e of data.electorates.filter(e => e.confidence !== 'high')) {
  console.log(`  ${e.name} <- ${e.pred} [${e.confidence}] ${e.notes}`);
}
const preds = new Set(data.electorates.map(e => e.pred));
console.log('2023 seats with no successor:', ['Mana', 'Ōhāriu', 'Kelston', 'Te Atatū', 'New Lynn', 'Ōtaki', 'Rongotai', 'Wellington Central', 'Bay of Plenty', 'East Coast', 'Panmure-Ōtāhuhu']
  .filter(n => !preds.has(n)).join(', '));
