const E = require('./engine.js');
const seqs = { A: E.seqFor('A'), B: E.seqFor('B'), C: E.seqFor('C'), s7: E.seqFor('R', 7), s21: E.seqFor('R', 21) };
const pol = {
  never: () => false, always: () => true,
  onShock: (c) => c.delay > 0 || c.priceMult > 1,
};
for (const [sn, seq] of Object.entries(seqs)) {
  const res = [];
  for (const b of [0, 400, 800, 1200, 1600, 2400, 3200])
    for (const q of [800, 1000, 1200, 1600, 2400])
      for (const [pn, pf] of Object.entries(pol)) {
        const t = E.run(seq, (i) => ({ buffer: b, qty: q, dual: pf(seq[i]) })).total;
        res.push([Math.round(t / 100) / 10, `B${b} Q${q} ${pn}`]);
      }
  res.sort((a, b) => b[0] - a[0]);
  const jit = E.run(seq, { buffer: 0, qty: 800, dual: false }).total;
  const jic = E.run(seq, { buffer: 3200, qty: 2400, dual: false }).total;
  console.log(sn, seq.map(c=>c.id).join(','));
  console.log('  top', res.slice(0, 3).map((x) => x.join(' ')).join(' | '));
  console.log('  pureJIT', Math.round(jit / 100) / 10, ' bigJIC(B3200 Q2400)', Math.round(jic / 100) / 10);
}
