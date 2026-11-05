// The Long Game - checking a strategy before it is allowed to play.
//
// AI output drifts, so nothing is trusted. Every problem gets a message a
// Grade 9 student can act on, naming where it is and what to change.

import { SCHEMA_VERSION, CHECKS, MOVE_CHECKS, NUMBER_OPS, ACTIONS } from './engine.js?v=20261105-092620';

export const LIMITS = {
  rules: 8,
  conditions: 2,
  memory: 3,
  pattern: 10,
  name: 40,
  description: 140,
  label: 50,
  approximations: 400,
  slip: 100,
  memoryValue: 1000,
  builderBytes: 4000
};

const MOVES = ['cooperate', 'defect'];
const TOP_KEYS = ['schemaVersion', 'name', 'description', 'firstMove', 'rules', 'fallback',
  'memory', 'pattern', 'slip', 'approximations', 'builder'];
const RULE_KEYS = ['when', 'do', 'chance', 'otherwise', 'set', 'change', 'label'];
const DECISION_KEYS = ['do', 'chance', 'otherwise'];

// Pulls the JSON out of whatever was pasted: code fences, a sentence before
// it, a sentence after it.
export function parsePasted(text) {
  const t = String(text || '').trim();
  if (!t) return { error: 'Nothing was pasted yet.' };
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start < 0 || end < start) {
    return { error: 'There is no JSON here. It should start with { and end with }. Ask the AI for the JSON only.' };
  }
  try {
    return { value: JSON.parse(t.slice(start, end + 1)) };
  } catch (e) {
    return { error: 'The JSON is broken, so it cannot be read. Check you copied everything from the first { to the last }. If it still fails, ask the AI to "output the JSON again, valid JSON only". (' + e.message + ')' };
  }
}

// A strategy as stored in Firestore, parsed and checked again. Anything that
// fails is shown but left out of tournaments.
export function fromStored(d) {
  let strategy = null, errors = [];
  try {
    strategy = JSON.parse(d.json);
    const v = validate(strategy);
    if (!v.ok) errors = v.errors;
  } catch { errors = ['The stored JSON cannot be read.']; }
  return { id: d.id, handle: d.handle, name: d.name, strategy, errors, at: d.createdAt?.toDate?.() };
}

function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}

function suggest(word, options) {
  let best = null, bestD = Infinity;
  for (const o of options) {
    const dd = distance(String(word), o);
    if (dd < bestD) { best = o; bestD = dd; }
  }
  return bestD <= 3 ? ` Did you mean "${best}"?` : '';
}

const isInt = n => Number.isInteger(n);
const isPercent = n => typeof n === 'number' && n >= 0 && n <= 100;
const isObj = o => o && typeof o === 'object' && !Array.isArray(o);

export function validate(s) {
  const errors = [];
  const err = (where, msg) => errors.push(where ? `${where}: ${msg}` : msg);

  if (!isObj(s)) return { ok: false, errors: ['A strategy must be one JSON object, starting with { and ending with }.'] };

  for (const k of Object.keys(s)) {
    if (!TOP_KEYS.includes(k)) err('', `"${k}" is not part of a strategy.${suggest(k, TOP_KEYS)}`);
  }

  if (s.schemaVersion !== SCHEMA_VERSION) {
    err('schemaVersion', `must be ${SCHEMA_VERSION}.`);
  }
  if (typeof s.name !== 'string' || !s.name.trim()) err('name', 'give your strategy a name.');
  else if (s.name.length > LIMITS.name) err('name', `keep it to ${LIMITS.name} characters.`);
  if (s.description !== undefined && (typeof s.description !== 'string' || s.description.length > LIMITS.description)) {
    err('description', `should be one short sentence, ${LIMITS.description} characters at most.`);
  }
  if (s.approximations !== undefined && (typeof s.approximations !== 'string' || s.approximations.length > LIMITS.approximations)) {
    err('approximations', `should be a short note, ${LIMITS.approximations} characters at most.`);
  }
  if (s.builder !== undefined && (!isObj(s.builder) || JSON.stringify(s.builder).length > LIMITS.builderBytes)) {
    err('builder', 'is not valid. Delete it.');
  }

  // Memory
  const memNames = [];
  if (s.memory !== undefined) {
    if (!isObj(s.memory)) err('memory', 'should look like { "grudge": 0 }.');
    else {
      const names = Object.keys(s.memory);
      if (names.length > LIMITS.memory) err('memory', `at most ${LIMITS.memory} memory numbers.`);
      for (const k of names) {
        if (!/^[a-zA-Z][a-zA-Z0-9]{0,15}$/.test(k)) err('memory', `"${k}" needs to be one short word, letters and digits only.`);
        if (!isInt(s.memory[k]) || Math.abs(s.memory[k]) > LIMITS.memoryValue) err('memory', `"${k}" must start as a whole number.`);
        memNames.push(k);
      }
    }
  }

  // Pattern
  if (s.pattern !== undefined) {
    if (!Array.isArray(s.pattern) || !s.pattern.length || s.pattern.length > LIMITS.pattern) {
      err('pattern', `should be a list of 1 to ${LIMITS.pattern} moves, like ["cooperate", "cooperate", "defect"].`);
    } else {
      s.pattern.forEach((m, i) => {
        if (!MOVES.includes(m)) err('pattern', `move ${i + 1} is "${m}". Each move must be "cooperate" or "defect".`);
      });
    }
  }

  if (s.slip !== undefined && !(typeof s.slip === 'number' && s.slip >= 0 && s.slip <= LIMITS.slip)) {
    err('slip', `is a percentage from 0 to ${LIMITS.slip}.`);
  }

  let usesPattern = false;

  function checkDecision(d, where, { first = false, allowNext = false } = {}) {
    if (!isObj(d)) { err(where, 'should look like { "do": "cooperate" }.'); return; }
    const allowed = first ? ['cooperate', 'defect', 'pattern'] : ACTIONS;
    const doOpts = allowNext ? [...allowed, 'nextRule'] : allowed;
    if (!doOpts.includes(d.do)) {
      if (first && ACTIONS.includes(d.do)) err(where, `"${d.do}" cannot be used on round 1, because nothing has happened yet. Use "cooperate" or "defect".`);
      else err(where, `"do" is "${d.do}". It must be one of: ${doOpts.join(', ')}.${suggest(d.do, doOpts)}`);
    }
    if (d.do === 'pattern' || d.otherwise === 'pattern') usesPattern = true;
    if (d.chance !== undefined) {
      if (!isPercent(d.chance)) err(where, '"chance" is a percentage from 0 to 100.');
      else if (d.chance < 100 && d.otherwise === undefined) {
        err(where, `has a ${d.chance}% chance, so it needs "otherwise" to say what happens the rest of the time.`);
      }
    }
    if (d.otherwise !== undefined) {
      const oOpts = allowNext ? [...allowed, 'nextRule'] : allowed;
      if (!oOpts.includes(d.otherwise)) err(where, `"otherwise" is "${d.otherwise}". It must be one of: ${oOpts.join(', ')}.${suggest(d.otherwise, oOpts)}`);
    }
  }

  function checkCondition(c, where) {
    if (!isObj(c)) { err(where, 'each condition should look like { "check": "theirLast", "is": "defect" }.'); return; }
    const what = c.check;
    const isMem = typeof what === 'string' && what.startsWith('memory.');
    const known = Object.keys(CHECKS).concat('chance');
    if (typeof what !== 'string' || (!isMem && !known.includes(what))) {
      err(where, `"${what}" is not something a strategy can look at.${suggest(what, known)}`);
      return;
    }
    if (isMem && !memNames.includes(what.slice(7))) {
      err(where, `"${what}" uses a memory number that is not set up in "memory".`);
    }
    const ops = Object.keys(c).filter(k => k !== 'check');
    if (what === 'chance') {
      if (ops.length !== 1 || ops[0] !== 'percent' || !isPercent(c.percent)) err(where, 'a chance check looks like { "check": "chance", "percent": 10 }.');
      return;
    }
    if (ops.length !== 1) {
      err(where, `a condition compares one thing. Found ${ops.length ? ops.join(' and ') : 'nothing'} after "check". Split it into two conditions.`);
      return;
    }
    const op = ops[0];
    if (MOVE_CHECKS.includes(what)) {
      if (op !== 'is') err(where, `"${what}" is a move, so use "is", like { "check": "${what}", "is": "defect" }.`);
      else if (!MOVES.includes(c.is)) err(where, `"is" must be "cooperate" or "defect", not "${c.is}".`);
    } else {
      if (!NUMBER_OPS.includes(op)) err(where, `"${op}" is not a comparison. Use one of: ${NUMBER_OPS.join(', ')}.${suggest(op, NUMBER_OPS)}`);
      else if (!isInt(c[op])) err(where, `"${op}" needs a whole number.`);
    }
  }

  function checkMemoryOps(r, where) {
    for (const key of ['set', 'change']) {
      if (r[key] === undefined) continue;
      if (!isObj(r[key])) { err(where, `"${key}" should look like { "grudge": 3 }.`); continue; }
      for (const [k, n] of Object.entries(r[key])) {
        if (!memNames.includes(k)) err(where, `"${key}" uses "${k}", which is not set up in "memory".`);
        if (!isInt(n) || Math.abs(n) > LIMITS.memoryValue) err(where, `"${key}" for "${k}" needs a whole number.`);
      }
    }
  }

  // First move and fallback
  if (s.firstMove === undefined) err('firstMove', 'is missing. Every strategy needs a first move.');
  else checkDecision(s.firstMove, 'firstMove', { first: true });
  if (s.fallback === undefined) err('fallback', 'is missing. Say what to do when no rule applies.');
  else checkDecision(s.fallback, 'fallback');

  // Rules
  if (s.rules !== undefined && !Array.isArray(s.rules)) err('rules', 'should be a list: [ ... ].');
  const rules = Array.isArray(s.rules) ? s.rules : [];
  if (rules.length > LIMITS.rules) err('rules', `there are ${rules.length} rules. The most allowed is ${LIMITS.rules}.`);
  rules.slice(0, LIMITS.rules + 2).forEach((r, i) => {
    const where = `Rule ${i + 1}`;
    if (!isObj(r)) { err(where, 'should be an object like { "when": [...], "do": "defect" }.'); return; }
    for (const k of Object.keys(r)) {
      if (!RULE_KEYS.includes(k)) err(where, `"${k}" is not part of a rule.${suggest(k, RULE_KEYS)}`);
    }
    if (r.when !== undefined) {
      if (!Array.isArray(r.when)) err(where, '"when" should be a list of conditions: [ ... ].');
      else {
        if (r.when.length > LIMITS.conditions) err(where, `has ${r.when.length} conditions. The most allowed is ${LIMITS.conditions}.`);
        r.when.forEach((c, k) => checkCondition(c, `${where}, condition ${k + 1}`));
      }
    }
    checkDecision(Object.fromEntries(DECISION_KEYS.filter(k => k in r).map(k => [k, r[k]])), where, { allowNext: true });
    if (r.do === 'nextRule' && !r.set && !r.change) err(where, '"nextRule" does nothing unless the rule also changes memory with "set" or "change".');
    checkMemoryOps(r, where);
    if (r.label !== undefined && (typeof r.label !== 'string' || r.label.length > LIMITS.label)) {
      err(where, `"label" is a short name, ${LIMITS.label} characters at most.`);
    }
  });

  if (usesPattern || rules.some(r => r && (r.do === 'pattern' || r.otherwise === 'pattern'))) {
    if (!Array.isArray(s.pattern)) err('pattern', 'is missing, but a rule says to follow the pattern.');
  }

  return { ok: errors.length === 0, errors };
}
