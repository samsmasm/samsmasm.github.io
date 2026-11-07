// Runs the puzzle generator from index.html 2000 times per bank and checks for repeated words.
// Run: node tests/test_generation.js   (build first with python3 build.py)
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const logic = html.split('/*LOGIC_START*/')[1].split('/*LOGIC_END*/')[0];
eval(logic + ';globalThis.api={buildPuzzle,prepare,guessResult,guessKey,pickVoice,shuffle,seededRandom,dayKey,dailyCodes};');
const load = f => JSON.parse(fs.readFileSync(path.join(root, 'data', f), 'utf8'));
let failed = false;
for (const [f, n, per, tiers] of [['bm_categories.json', 4, 4, [1,2,3,4]], ['econ_categories.json', 4, 4, [1,2,3,4]], ['kids_categories.json', 4, 4, [1,2,3,4]], ['sound_categories.json', 3, 3, [1,2,3,4]]]) {
  const bank = load(f); api.prepare(bank);
  const on = new Set(bank.meta.topics.map(t => t.code));
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
// Sound it out: at every stage of a game, no more than half the cards left may have a picture.
{
  const bank = load('sound_categories.json'); api.prepare(bank);
  const on = new Set(bank.meta.topics.map(t => t.code));
  let over = 0, total = 0, pics = 0, badSize = 0; const varied = new Map(), tierSets = new Set();
  const tierOf = new Map(bank.categories.map(c => [c.name, c.tier]));
  for (let i = 0; i < 5000; i++) {
    const p = api.buildPuzzle(bank, on, bank.meta.grid);
    if (p.groups.length !== 3 || p.groups.some(g => g.words.length !== 3)) badSize++;
    tierSets.add(p.groups.map(g => tierOf.get(g.name)).join());
    const counts = p.groups.map(g => g.words.filter(w => w.e).length);
    // the worst case for any stage is the groups with the most pictures being the ones left
    const worst = [...counts].sort((a, b) => b - a);
    worst.forEach((_, k) => { if (worst.slice(0, k + 1).reduce((a, b) => a + b) * 2 > (k + 1) * 3) over++; });
    total += 9; pics += counts.reduce((a, b) => a + b);
    p.groups.forEach(g => g.words.forEach(w => {
      const s = varied.get(w.w) || new Set(); s.add(!!w.e); varied.set(w.w, s);
    }));
  }
  const both = [...varied.values()].filter(s => s.size === 2).length;
  console.log('pictures: over half at any stage', over, 'times, average', (pics / total * 100).toFixed(0) + '% of cards,', both, 'words seen with and without one');
  console.log('3 by 3 grid: wrong size', badSize, 'times,', tierSets.size, 'tier combinations (want 4)');
  if (over || !pics || !both || badSize || tierSets.size !== 4) failed = true;
  // The limit is only for banks that ask for it: Kids keeps a picture on every card that has one
  const kids = load('kids_categories.json'); api.prepare(kids);
  const emojiOf = new Map(kids.categories.flatMap(c => c.words.map((w, i) => [c.id + w, c.emoji[i]])));
  const nameToId = new Map(kids.categories.map(c => [c.name, c.id]));
  let kidsOk = true;
  for (let i = 0; i < 2000; i++) {
    const kp = api.buildPuzzle(kids, new Set(kids.meta.topics.map(t => t.code)), { n: 4, per: 4, tiers: [1, 2, 3, 4] });
    for (const g of kp.groups) for (const w of g.words) if (w.e !== emojiOf.get(nameToId.get(g.name) + w.w)) kidsOk = false;
  }
  console.log('kids pictures unchanged', kidsOk ? 'ok' : 'FAILED');
  if (!kidsOk) failed = true;
}
const right = api.guessResult(['2-0', '2-1', '2-2', '2-3']) === 2 && api.guessResult(['0-0', '0-1', '0-2', '0-3']) === 0;
const wrong = api.guessResult(['2-0', '2-1', '2-2', '1-3']) === -1;
console.log('guessResult', right && wrong ? 'ok' : 'FAILED');
if (!right || !wrong) failed = true;
const keyOk = api.guessKey(['2-1', '0-3', '1-0', '3-2']) === api.guessKey(['3-2', '1-0', '2-1', '0-3'])
  && api.guessKey(['2-1', '0-3', '1-0', '3-2']) !== api.guessKey(['2-1', '0-3', '1-0', '3-1']);
console.log('guessKey', keyOk ? 'ok' : 'FAILED');
if (!keyOk) failed = true;
// Daily puzzle: day boundary at 23:00 UTC, same puzzle for the same day, always possible, SL only
const dk = s => api.dayKey(new Date(s));
const dayOk = dk('2026-11-05T22:59:59Z') === '2026-11-05' && dk('2026-11-05T23:00:00Z') === '2026-11-06'
  && dk('2026-12-31T23:30:00Z') === '2027-01-01' && dk('2026-11-06T22:59:59Z') === '2026-11-06';
console.log('dayKey', dayOk ? 'ok' : 'FAILED');
if (!dayOk) failed = true;
for (const f of ['bm_categories.json', 'econ_categories.json', 'kids_categories.json', 'sound_categories.json']) {
  const bank = load(f); api.prepare(bank);
  const make = key => {
    const rand = api.seededRandom(key);
    const p = api.buildPuzzle(bank, api.dailyCodes(bank), bank.meta.grid || { n: 4, per: 4, tiers: [1, 2, 3, 4] }, rand);
    return p && { p, order: api.shuffle([...Array(16).keys()], rand) };
  };
  let bad = 0, hl = 0; const seen = new Set();
  for (let d = 0; d < 1000; d++) {
    const key = new Date(Date.UTC(2026, 10, 6 + d)).toISOString().slice(0, 10) + ':' + f;
    const a = make(key), b = make(key);
    if (!a || JSON.stringify(a) !== JSON.stringify(b)) { bad++; continue; }
    hl += a.p.groups.filter(g => g.level === 'HL').length;
    seen.add(a.p.groups.map(g => g.name).join());
  }
  console.log(f, 'daily over 1000 days:', bad, 'failed,', hl, 'HL groups,', seen.size, 'different category sets');
  if (bad || hl || seen.size < 900) failed = true;
}
const V = (name, lang) => ({ name, lang });
const voiceOk = api.pickVoice([V('Daniel', 'en-GB'), V('Samantha', 'en-US'), V('Thomas', 'fr-FR')]).name === 'Samantha'
  && api.pickVoice([V('Fred', 'en-US'), V('Oliver', 'en-GB')]).name === 'Oliver'
  && api.pickVoice([V('Thomas', 'fr-FR')]) === null
  && api.pickVoice([]) === null;
console.log('pickVoice', voiceOk ? 'ok' : 'FAILED');
if (!voiceOk) failed = true;
process.exit(failed ? 1 : 0);
