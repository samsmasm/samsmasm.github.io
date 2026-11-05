// The Long Game - the guided strategy builder, as data.
//
// QUESTIONS describes every question the builder asks: wording, choices, the
// example shown on hover, and its section. compile() turns a set of answers
// into a strategy. The page draws its form from QUESTIONS, and the plain
// English readback is made from the compiled JSON, so the two cannot disagree.
// A V2 option is a new entry here plus a few lines in compile().

import { SCHEMA_VERSION } from './engine.js?v=20261105-092620';
import { LIMITS } from './validate.js?v=20261105-092620';

const C = 'cooperate', D = 'defect';

// What "otherwise" means when a decision only happens some of the time.
export const INVERSE = { cooperate: D, defect: C, copy: 'opposite', opposite: 'copy', repeat: 'switch', switch: 'repeat' };

export const MOVE_CHOICES = [
  { value: C, label: 'Cooperate' },
  { value: D, label: 'Defect' }
];

// type: 'choice' (pick one), 'number', 'moves' (a list of C/D), 'special' (special rounds list)
// chance: true when the answer can be "a chance of" rather than always.
export const QUESTIONS = [
  {
    id: 'first', section: 'core', title: 'First move',
    ask: 'Round 1. What do you do?',
    fields: [{ key: 'do', type: 'choice', chance: true, choices: [
      { value: C, label: 'Cooperate', tip: 'Start nice. Most winning strategies do.' },
      { value: D, label: 'Defect', tip: 'Start mean: walk free if they cooperate.' }
    ] }]
  },
  {
    id: 'onCoop', section: 'core', title: 'When they cooperate',
    ask: 'They cooperated last round. You...',
    fields: [{ key: 'do', type: 'choice', chance: true, choices: [
      { value: C, label: 'Cooperate back', tip: 'Stay loyal: 2 years each.' },
      { value: D, label: 'Defect', tip: 'Take advantage: 0 years for you, 5 for them.' },
      { value: 'repeat', label: 'Repeat my last move', tip: 'Do whatever you did last round.' }
    ] }]
  },
  {
    id: 'onDefect', section: 'core', title: 'When they defect',
    ask: 'They defected last round. You...',
    fields: [{ key: 'do', type: 'choice', chance: true, choices: [
      { value: D, label: 'Defect back', tip: 'An eye for an eye.' },
      { value: C, label: 'Cooperate anyway', tip: 'Turn the other cheek.' }
    ] }]
  },
  {
    id: 'grudge', section: 'core', title: 'Grudge',
    ask: 'After they defect, how long do you keep defecting, even if they say sorry?',
    fields: [
      { key: 'kind', type: 'choice', choices: [
        { value: 'none', label: 'No grudge', tip: 'Just answer their last move each round.' },
        { value: '1', label: '1 round', tip: 'Hit back once, then judge them fresh.' },
        { value: '2', label: '2 rounds', tip: 'Hit back twice in a row.' },
        { value: 'n', label: 'Set number', tip: 'Hit back for a number of rounds you choose.' },
        { value: 'forever', label: 'Forever', tip: 'Once betrayed, never cooperate again.' }
      ] },
      { key: 'n', type: 'number', label: 'Rounds', min: 3, max: 20, showIf: a => a.kind === 'n' }
    ]
  },

  {
    id: 'forgive', section: 'twist', title: 'Forgiveness',
    ask: 'End a grudge early.',
    needs: '"After they cooperate" only works with a grudge of 2 rounds or more.',
    fields: [
      { key: 'kind', type: 'choice', choices: [
        { value: 'chance', label: 'By chance', tip: 'Each grudge round there is a chance you let it go.' },
        { value: 'coop', label: 'After they cooperate', tip: 'Forgive once they cooperate a few times in a row.' }
      ] },
      { key: 'chance', type: 'percent', label: 'Chance each round', showIf: a => a.kind === 'chance' },
      { key: 'n', type: 'number', label: 'Cooperations in a row', min: 1, max: 10, showIf: a => a.kind === 'coop' }
    ]
  },
  {
    id: 'patience', section: 'twist', title: 'Patience',
    ask: 'Let some betrayals go before you react.',
    hint: 'Until then, your fallback move is used.',
    fields: [
      { key: 'kind', type: 'choice', choices: [
        { value: 'twoInARow', label: 'Two in a row', tip: 'React only after two defections in a row.' },
        { value: 'total', label: 'A number in total', tip: 'React once they have defected this many times.' },
        { value: 'last5', label: 'A number in the last 5 rounds', tip: 'React if they defect this often recently.' }
      ] },
      { key: 'n', type: 'number', label: 'How many', min: 2, max: 20, showIf: a => a.kind !== 'twoInARow' }
    ]
  },
  {
    id: 'slip', section: 'twist', title: 'Random slips',
    ask: 'Sometimes a coin flip picks your move instead. 100% is totally random.',
    fields: [{ key: 'chance', type: 'percent', label: 'Slip chance', max: LIMITS.slip }]
  },
  {
    id: 'testing', section: 'twist', title: 'Testing',
    ask: 'Now and then defect on purpose to see what they do.',
    fields: [
      { key: 'chance', type: 'percent', label: 'Test chance, when they cooperate' },
      { key: 'ifRetaliate', type: 'choice', label: 'If they hit back', choices: [
        { value: 'normal', label: 'Carry on as normal', tip: 'Treat it like any other round.' },
        { value: 'apologise', label: 'Say sorry', tip: 'Cooperate once to make up.' }
      ] },
      { key: 'ifNot', type: 'choice', label: 'If they let it go', choices: [
        { value: 'normal', label: 'Go back to normal', tip: 'One test was enough.' },
        { value: 'exploit', label: 'Keep taking advantage', tip: 'Defect whenever they cooperate, from now on.' }
      ] }
    ]
  },
  {
    id: 'pattern', section: 'twist', title: 'Pattern',
    ask: 'Play a fixed repeating sequence.',
    fields: [
      { key: 'moves', type: 'moves', label: 'Sequence', max: LIMITS.pattern },
      { key: 'use', type: 'choice', choices: [
        { value: 'alone', label: 'Instead of my answers', tip: 'Ignore the other player. Just play the pattern.' },
        { value: 'fallback', label: 'As my fallback', tip: 'Play the pattern when no other rule applies.' }
      ] }
    ]
  },
  {
    id: 'scoreboard', section: 'twist', title: 'Scoreboard',
    ask: 'Change what you do when your years and theirs get far apart.',
    fields: [
      { key: 'when', type: 'choice', choices: [
        { value: 'behind', label: 'When I have more years', tip: 'Fight back when losing.' },
        { value: 'ahead', label: 'When I have fewer years', tip: 'Change tactics when winning.' }
      ] },
      { key: 'by', type: 'number', label: 'By at least (years)', min: 1, max: 500 },
      { key: 'do', type: 'choice', chance: true, label: 'Then', choices: MOVE_CHOICES }
    ]
  },
  {
    id: 'switching', section: 'twist', title: 'Switching',
    ask: 'Switch to a new approach for the rest of the game.',
    fields: [
      { key: 'kind', type: 'choice', choices: [
        { value: 'round', label: 'From a round', tip: 'Count from round 1.' },
        { value: 'betrayals', label: 'After too many betrayals', tip: 'Once they have defected this many times in total.' }
      ] },
      { key: 'n', type: 'number', label: 'Round or betrayals', min: 2, max: 1000 },
      { key: 'do', type: 'choice', label: 'Switch to', choices: [
        { value: C, label: 'Always cooperate' },
        { value: D, label: 'Always defect' },
        { value: 'copy', label: 'Copy them' }
      ] }
    ]
  },
  {
    id: 'reading', section: 'twist', title: 'Reading them',
    ask: 'React to how often they cooperate overall.',
    fields: [
      { key: 'above', type: 'percent', label: 'If they cooperate more than' },
      { key: 'do', type: 'choice', label: 'Then', choices: MOVE_CHOICES },
      { key: 'elseDo', type: 'choice', label: 'If not', choices: [
        { value: 'none', label: 'Use my other answers' },
        ...MOVE_CHOICES
      ] }
    ]
  },
  {
    id: 'special', section: 'twist', title: 'Special rounds',
    ask: 'Any rounds where you always want to do the same thing?',
    fields: [{ key: 'entries', type: 'special', max: 5 }]
  },
  {
    id: 'startup', section: 'twist', title: 'Start-up',
    ask: 'A fixed opening before your usual rules begin. This replaces your first move.',
    fields: [{ key: 'moves', type: 'moves', label: 'Opening moves', max: 5 }]
  },

  {
    id: 'fallback', section: 'finish', title: 'Fallback',
    ask: 'If none of your rules apply, you...',
    fields: [{ key: 'do', type: 'choice', chance: true, choices: [
      { value: C, label: 'Cooperate' },
      { value: D, label: 'Defect' },
      { value: 'copy', label: 'Copy them' }
    ] }]
  }
];

// Kinds of special round. Counting from the end matters because the teacher
// can change the number of rounds.
export const SPECIAL_KINDS = [
  { value: 'round', label: 'Round', nums: ['a'] },
  { value: 'range', label: 'Rounds from ... to', nums: ['a', 'b'] },
  { value: 'final', label: 'The final round', nums: [] },
  { value: 'lastN', label: 'The last ... rounds', nums: ['a'] },
  { value: 'every', label: 'Every ...th round', nums: ['a'] }
];

export function defaultAnswers() {
  return {
    first: { do: C, chance: 100 },
    onCoop: { do: C, chance: 100 },
    onDefect: { do: D, chance: 100 },
    grudge: { kind: 'none', n: 3 },
    forgive: { on: false, kind: 'chance', chance: 20, n: 2 },
    patience: { on: false, kind: 'twoInARow', n: 3 },
    slip: { on: false, chance: 5 },
    testing: { on: false, chance: 5, ifRetaliate: 'normal', ifNot: 'normal' },
    pattern: { on: false, moves: [C, C, D], use: 'fallback' },
    scoreboard: { on: false, when: 'behind', by: 10, do: D, chance: 100 },
    switching: { on: false, kind: 'round', n: 50, do: D },
    reading: { on: false, above: 50, do: C, elseDo: 'none' },
    special: { on: false, entries: [{ kind: 'final', a: 1, b: 1, do: D, chance: 100 }] },
    startup: { on: false, moves: [C, D] },
    fallback: { do: C, chance: 100 },
    name: '', description: ''
  };
}

// A decision from an answer with an optional chance. Pattern never has one.
function dec(a) {
  const d = { do: a.do };
  const c = a.chance ?? 100;
  if (c < 100 && INVERSE[a.do]) { d.chance = c; d.otherwise = INVERSE[a.do]; }
  return d;
}

const cond = (check, op, value) => ({ check, [op]: value });

function specialConditions(e) {
  switch (e.kind) {
    case 'round': return [cond('round', 'equals', e.a)];
    case 'range': return [cond('round', 'atLeast', Math.min(e.a, e.b)), cond('round', 'atMost', Math.max(e.a, e.b))];
    case 'final': return [cond('roundsLeft', 'equals', 1)];
    case 'lastN': return [cond('roundsLeft', 'atMost', e.a)];
    case 'every': return [cond('round', 'multipleOf', e.a)];
  }
  return [];
}

// Turns answers into a strategy. Rules come out in the fixed order of
// precedence: special rounds, switching, grudge and patience, normal
// responses, fallback. Random slips apply last, in the engine.
export function compile(ans) {
  const A = { ...defaultAnswers(), ...ans };
  const rules = [];
  const memory = {};
  const push = (label, r) => rules.push({ ...r, label });
  const grudgeLen = { none: 0, 1: 1, 2: 2, n: A.grudge.n, forever: Infinity }[A.grudge.kind];
  const patternAlone = A.pattern.on && A.pattern.use === 'alone';

  const s = { schemaVersion: SCHEMA_VERSION, name: (A.name || '').trim() || 'My strategy' };
  if ((A.description || '').trim()) s.description = A.description.trim();

  // Round 1
  s.firstMove = dec(A.first);
  if (patternAlone) s.firstMove = { do: 'pattern' };

  // 1. Special rounds and the start-up phase
  if (A.startup.on && A.startup.moves.length) {
    s.firstMove = { do: A.startup.moves[0] };
    A.startup.moves.slice(1).forEach((m, i) => push('Start-up', { when: [cond('round', 'equals', i + 2)], do: m }));
  }
  if (A.special.on) {
    for (const e of A.special.entries) {
      if (e.kind === 'round' && e.a === 1) { s.firstMove = dec(e); continue; }
      push('Special round', { when: specialConditions(e), ...dec(e) });
    }
  }

  // 2. Switching, scoreboard, reading the opponent
  if (A.switching.on) {
    const c = A.switching.kind === 'round'
      ? cond('round', 'atLeast', A.switching.n)
      : cond('theirDefections', 'atLeast', A.switching.n);
    push('Switch', { when: [c], do: A.switching.do });
  }
  if (A.scoreboard.on) {
    const c = A.scoreboard.when === 'behind'
      ? cond('scoreLead', 'atMost', -A.scoreboard.by)
      : cond('scoreLead', 'atLeast', A.scoreboard.by);
    push('Scoreboard', { when: [c], ...dec(A.scoreboard) });
  }
  if (A.reading.on) {
    push('Reading them', { when: [cond('theirCooperationRate', 'moreThan', A.reading.above)], do: A.reading.do });
    if (A.reading.elseDo !== 'none') {
      push('Reading them', { when: [cond('theirCooperationRate', 'atMost', A.reading.above)], do: A.reading.elseDo });
    }
  }

  if (!patternAlone) {
    // 3. Testing follow-up, forgiveness, grudge and patience
    const T = A.testing;
    const testMemory = T.on && (T.ifRetaliate !== 'normal' || T.ifNot !== 'normal');
    if (testMemory) {
      memory.tested = 0;
      push('Testing', { when: [cond('memory.tested', 'equals', 2)], do: 'nextRule', change: { tested: -1 } });
      if (T.ifRetaliate === 'apologise') {
        push('Testing', { when: [cond('memory.tested', 'equals', 1), cond('theirLast', 'is', D)], do: C, set: { tested: 0 } });
      }
      if (T.ifNot === 'exploit') {
        push('Testing', { when: [cond('memory.tested', 'equals', 1), cond('theirLast', 'is', C)], do: D, set: { tested: -1 } });
        push('Testing', { when: [cond('memory.tested', 'lessThan', 0), cond('theirLast', 'is', C)], do: D });
      }
      if (T.ifRetaliate === 'normal' || T.ifNot === 'normal') {
        push('Testing', { when: [cond('memory.tested', 'equals', 1)], do: 'nextRule', set: { tested: 0 } });
      }
    }

    // What counts as a betrayal worth reacting to
    const P = A.patience;
    let trigger = [cond('theirLast', 'is', D)];
    if (P.on && P.kind === 'twoInARow') trigger = [cond('theirDefectStreak', 'atLeast', 2)];
    if (P.on && P.kind === 'total') trigger = [cond('theirLast', 'is', D), cond('theirDefections', 'atLeast', P.n)];
    if (P.on && P.kind === 'last5') trigger = [cond('theirLast', 'is', D), cond('theirDefectionsLast5', 'atLeast', P.n)];

    const F = A.forgive;
    if (grudgeLen === 1) {
      // A one round grudge has nothing to end early, so forgiving by chance
      // means sometimes not hitting back at all.
      const r = { when: trigger, do: D };
      if (F.on && F.kind === 'chance') { r.chance = 100 - F.chance; r.otherwise = C; }
      push('Grudge', r);
    } else if (grudgeLen > 1) {
      // The memory number "grudge" counts the punishment rounds still to come.
      // Forever is a grudge that is never counted down.
      memory.grudge = 0;
      const hold = grudgeLen === Infinity ? 1 : grudgeLen - 1;
      push('Grudge', { when: trigger, do: D, set: { grudge: hold } });
      if (F.on && F.kind === 'chance') {
        push('Forgiveness', { when: [cond('memory.grudge', 'moreThan', 0)], do: C, chance: F.chance, otherwise: 'nextRule', set: { grudge: 0 } });
      }
      if (F.on && F.kind === 'coop') {
        push('Forgiveness', { when: [cond('memory.grudge', 'moreThan', 0), cond('theirCoopStreak', 'atLeast', F.n)], do: C, set: { grudge: 0 } });
      }
      const r = { when: [cond('memory.grudge', 'moreThan', 0)], do: D };
      if (grudgeLen !== Infinity) r.change = { grudge: -1 };
      push('Grudge', r);
    } else {
      if (F.on && F.kind === 'chance') {
        push('Forgiveness', { when: trigger, do: C, chance: F.chance, otherwise: 'nextRule' });
      }
      push('When they defect', { when: trigger, ...dec(A.onDefect) });
    }

    // 4. Normal responses
    if (T.on) {
      const r = { when: [cond('theirLast', 'is', C)], do: D, chance: T.chance, otherwise: 'nextRule' };
      if (testMemory) r.set = { tested: 2 };
      push('Testing', r);
    }
    push('When they cooperate', { when: [cond('theirLast', 'is', C)], ...dec(A.onCoop) });
  }

  // 5. Fallback
  s.rules = rules;
  s.fallback = (A.pattern.on) ? { do: 'pattern' } : dec(A.fallback);
  if (A.pattern.on) s.pattern = A.pattern.moves.slice(0, LIMITS.pattern);
  if (Object.keys(memory).length) s.memory = memory;
  if (A.slip.on && A.slip.chance > 0) s.slip = A.slip.chance;
  s.builder = A;
  return s;
}

// Can this JSON be opened in the builder? Only if it carries builder answers
// that still compile to exactly the same rules. Anything an AI has changed by
// hand fails this and is shown read-only instead.
export function builderAnswersFor(s) {
  if (!s || !s.builder) return null;
  try {
    const again = compile(s.builder);
    const strip = x => { const { builder, ...rest } = x; return JSON.stringify(rest); };
    return strip(again) === strip(s) ? s.builder : null;
  } catch {
    return null;
  }
}
