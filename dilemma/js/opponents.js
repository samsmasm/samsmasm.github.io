// The strategies every student's test matches are played against.

export const titForTat = {
  schemaVersion: 1, name: 'Tit for Tat', description: 'Starts nice, then copies your last move.',
  firstMove: { do: 'cooperate' }, rules: [], fallback: { do: 'copy' }
};

export const alwaysDefect = {
  schemaVersion: 1, name: 'Always Defect', description: 'Defects every round, no matter what.',
  firstMove: { do: 'defect' }, rules: [], fallback: { do: 'defect' }
};

export const random = {
  schemaVersion: 1, name: 'Random', description: 'Flips a coin every round.',
  firstMove: { do: 'cooperate', chance: 50, otherwise: 'defect' },
  rules: [],
  fallback: { do: 'cooperate', chance: 50, otherwise: 'defect' }
};

export const TEST_OPPONENTS = [titForTat, alwaysDefect, random];
