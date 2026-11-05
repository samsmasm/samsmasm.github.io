// The Long Game - turning a strategy's JSON back into plain English.
//
// The readback is made from the JSON itself, never from what the student
// meant, so it always says what the strategy will really do.

export function chanceWord(p) {
  if (p <= 0) return 'never';
  if (p <= 20) return 'rarely';
  if (p <= 45) return 'sometimes';
  if (p <= 79) return 'often';
  if (p < 100) return 'almost always';
  return 'always';
}

const short = m => (m === 'cooperate' ? 'C' : 'D');

export function actionPhrase(a, s = {}) {
  switch (a) {
    case 'cooperate': return 'cooperate';
    case 'defect': return 'defect';
    case 'copy': return 'copy their last move';
    case 'opposite': return 'do the opposite of their last move';
    case 'repeat': return 'repeat your own last move';
    case 'switch': return 'switch away from your own last move';
    case 'pattern': return `play the next move in your pattern (${(s.pattern || []).map(short).join(', ')})`;
    case 'nextRule': return 'carry on to the next rule';
  }
  return String(a);
}

export function decisionPhrase(d, s) {
  const act = actionPhrase(d.do, s);
  const c = d.chance ?? 100;
  if (d.do === 'nextRule' || c >= 100) return act;
  return `${act} ${c}% of the time (${chanceWord(c)}), otherwise ${actionPhrase(d.otherwise, s)}`;
}

const OPS = {
  equals: n => `is ${n}`,
  atLeast: n => `is ${n} or more`,
  atMost: n => `is ${n} or less`,
  moreThan: n => `is more than ${n}`,
  lessThan: n => `is less than ${n}`,
  multipleOf: n => `is a multiple of ${n}`
};

const SUBJECTS = {
  theirDefections: 'the number of times they have defected',
  theirDefectionsLast5: 'the number of times they defected in the last 5 rounds',
  theirDefectStreak: 'the number of times in a row they have just defected',
  theirCoopStreak: 'the number of times in a row they have just cooperated',
  myDefections: 'the number of times you have defected',
  scoreLead: 'how many fewer years you have than them (below 0 means you have more)'
};

const AGO = { theirLast: 'last round', theirLast2: 'two rounds ago', theirLast3: 'three rounds ago' };

export function conditionPhrase(c) {
  const op = Object.keys(c).find(k => k !== 'check');
  const n = c[op];
  switch (c.check) {
    case 'chance': return `a ${c.percent}% chance comes up (${chanceWord(c.percent)})`;
    case 'theirLast': case 'theirLast2': case 'theirLast3':
      return `they ${c.is === 'defect' ? 'defected' : 'cooperated'} ${AGO[c.check]}`;
    case 'myLast': return `you ${c.is === 'defect' ? 'defected' : 'cooperated'} last round`;
    case 'round':
      if (op === 'equals') return `it is round ${n}`;
      if (op === 'atLeast') return `it is round ${n} or later`;
      if (op === 'atMost') return `it is round ${n} or earlier`;
      if (op === 'moreThan') return `it is after round ${n}`;
      if (op === 'lessThan') return `it is before round ${n}`;
      if (op === 'multipleOf') return `it is every ${ordinal(n)} round (rounds ${n}, ${2 * n}, ${3 * n} ...)`;
      break;
    case 'roundsLeft':
      if (op === 'equals' && n === 1) return 'it is the final round';
      if (op === 'equals') return `it is ${n} rounds from the end (counting the final round as 1)`;
      if (op === 'atMost' && n === 1) return 'it is the final round';
      if (op === 'atMost') return `it is one of the last ${n} rounds`;
      if (op === 'lessThan') return `it is one of the last ${n - 1} rounds`;
      if (op === 'moreThan') return `there are more than ${n} rounds to go (counting this one)`;
      if (op === 'atLeast') return `there are ${n} or more rounds to go (counting this one)`;
      break;
    case 'theirCooperationRate': {
      const words = { equals: 'exactly', atLeast: 'at least', atMost: 'at most', moreThan: 'more than', lessThan: 'less than' }[op];
      if (words) return `they have cooperated in ${words} ${n}% of rounds so far`;
      break;
    }
    case 'scoreLead':
      if ((op === 'moreThan' && n === 0) || (op === 'atLeast' && n === 1)) return 'you have fewer years than them';
      if ((op === 'lessThan' && n === 0) || (op === 'atMost' && n === -1)) return 'you have more years than them';
      if (op === 'atLeast' && n > 0) return `you have at least ${n} fewer years than them`;
      if (op === 'atMost' && n < 0) return `you have at least ${-n} more years than them`;
      if (op === 'equals' && n === 0) return 'you both have the same years';
      break;
  }
  if (c.check.startsWith('memory.')) return `your memory number "${c.check.slice(7)}" ${OPS[op](n)}`;
  return `${SUBJECTS[c.check] || c.check} ${OPS[op] ? OPS[op](n) : op + ' ' + n}`;
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function memoryPhrases(r) {
  const out = [];
  for (const [k, n] of Object.entries(r.set || {})) out.push(`set "${k}" to ${n}`);
  for (const [k, n] of Object.entries(r.change || {})) {
    out.push(n >= 0 ? `add ${n} to "${k}"` : `take ${-n} off "${k}"`);
  }
  return out;
}

export function rulePhrase(r, s) {
  const when = (r.when || []).map(conditionPhrase);
  const cond = when.length ? `If ${when.join(' and ')}` : 'Always';
  const mem = memoryPhrases(r);
  let text = `${cond}: ${decisionPhrase(r, s)}.`;
  if (mem.length) {
    const tail = mem.join(' and ');
    text += r.do === 'nextRule' ? ` First ${tail}.` : ` Also ${tail}.`;
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Returns { intro, first, rules: [{ label, text }], fallback, extras[] }.
export function readback(s) {
  const first = `Round 1: ${decisionPhrase(s.firstMove, s)}.`;
  const rules = (s.rules || []).map(r => ({ label: r.label || '', text: rulePhrase(r, s) }));
  const fallback = `If no rule applies: ${decisionPhrase(s.fallback, s)}.`;
  const extras = [];
  const mem = Object.entries(s.memory || {});
  if (mem.length) {
    extras.push('Memory numbers, which start at: ' + mem.map(([k, n]) => `"${k}" = ${n}`).join(', ') + '.');
  }
  if (s.slip) extras.push(`Random slips: ${s.slip}% of the time (${chanceWord(s.slip)}) you do the opposite of what you meant.`);
  return { first, rules, fallback, extras };
}

// The same readback as plain text, for copying into an AI chat.
export function readbackText(s) {
  const r = readback(s);
  const lines = [s.name + (s.description ? ': ' + s.description : ''), r.first];
  if (r.rules.length) {
    lines.push('From round 2, check these rules in order and use the first one that fits:');
    r.rules.forEach((x, i) => lines.push(`${i + 1}. ${x.text}`));
  }
  lines.push(r.fallback, ...r.extras);
  return lines.join('\n');
}
