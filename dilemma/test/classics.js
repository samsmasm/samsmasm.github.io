// The classic strategies, written in the schema. Used by the tests to prove
// the schema can express them all. Not offered on the site in V1.

const C = 'cooperate', D = 'defect';

export const alwaysCooperate = {
  schemaVersion: 1, name: 'Always Cooperate',
  firstMove: { do: C }, rules: [], fallback: { do: C }
};

// The site's own test opponents, so the tests cover exactly what students meet.
import { alwaysDefect, titForTat } from '../js/opponents.js';
export { alwaysDefect, titForTat };

export const titForTwoTats = {
  schemaVersion: 1, name: 'Tit for Two Tats',
  firstMove: { do: C },
  rules: [
    { when: [{ check: 'theirLast', is: D }, { check: 'theirLast2', is: D }], do: D }
  ],
  fallback: { do: C }
};

export const grudger = {
  schemaVersion: 1, name: 'Grudger',
  firstMove: { do: C },
  rules: [{ when: [{ check: 'theirDefections', atLeast: 1 }], do: D }],
  fallback: { do: C }
};

// Win-stay, lose-shift: keep your move after 3 or 5 points, change it after 0 or 1.
export const pavlov = {
  schemaVersion: 1, name: 'Pavlov',
  firstMove: { do: C },
  rules: [{ when: [{ check: 'theirLast', is: C }], do: 'repeat' }],
  fallback: { do: 'switch' }
};

export const random = {
  schemaVersion: 1, name: 'Random',
  firstMove: { do: C, chance: 50, otherwise: D },
  rules: [],
  fallback: { do: C, chance: 50, otherwise: D }
};

// Tit for Tat that punishes for three rounds, using a memory number.
export const punisher3 = {
  schemaVersion: 1, name: 'Punish Three',
  memory: { grudge: 0 },
  firstMove: { do: C },
  rules: [
    { when: [{ check: 'theirLast', is: D }], do: D, set: { grudge: 2 } },
    { when: [{ check: 'memory.grudge', moreThan: 0 }], do: D, change: { grudge: -1 } }
  ],
  fallback: { do: C }
};

export const endGameTitForTat = {
  schemaVersion: 1, name: 'Tit for Tat, defects last round',
  firstMove: { do: C },
  rules: [{ when: [{ check: 'roundsLeft', equals: 1 }], do: D, label: 'Special round' }],
  fallback: { do: 'copy' }
};

export const ccd = {
  schemaVersion: 1, name: 'C C D',
  pattern: [C, C, D],
  firstMove: { do: 'pattern' }, rules: [], fallback: { do: 'pattern' }
};

export const all = [alwaysCooperate, alwaysDefect, titForTat, titForTwoTats, grudger, pavlov, random,
  punisher3, endGameTitForTat, ccd];
