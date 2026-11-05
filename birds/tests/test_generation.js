// Runs the puzzle generator from index.html 2000 times per bank and checks for repeated words.
// Run: node tests/test_generation.js   (build first with python3 build.py)
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const logic = html.split('/*LOGIC_START*/')[1].split('/*LOGIC_END*/')[0];
eval(logic + ';globalThis.api={buildPuzzle,prepare};');
const load = f => JSON.parse(fs.readFileSync(path.join(root, 'data', f), 'utf8'));
let failed = false;
for (const [f, n, per, tiers] of [['bm_categories.json', 4, 4, [1,2,3,4]], ['econ_categories.json', 4, 4, [1,2,3,4]], ['kids_categories.json', 4, 4, [1,2,3,4]], ['kids_categories.json', 3, 3, [1,2,3]]]) {
  const bank = load(f); api.prepare(bank);
  const on = new Set(bank.meta.topics.filter(t => t.defaultOn !== false).map(t => t.code));
  let ok = 0;
  for (let i = 0; i < 2000; i++) {
    const p = api.buildPuzzle(bank, on, { n, per, tiers });
    if (!p) continue;
    const seen = new Set(); let dup = false;
    for (const g of p.groups) for (const w of g.words) { const k = w.w.toLowerCase(); if (seen.has(k)) dup = true; seen.add(k); }
    if (!dup && p.groups.length === n) ok++;
  }
  console.log(f, n + 'x' + per, ok + '/2000 ok');
  if (ok < 2000) failed = true;
}
process.exit(failed ? 1 : 0);
