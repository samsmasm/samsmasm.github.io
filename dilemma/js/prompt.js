// The Long Game - the prompt a student pastes into any AI chat.
// Bump PROMPT_VERSION whenever the wording changes.

import { LIMITS } from './validate.js?v=20261105-074708';

export const PROMPT_VERSION = '1.1';

const SCHEMA_TEXT = `THE GAME
Two prisoners play each other many times in a row (usually 100 rounds, but the teacher can change it). Each round both choose at the same time: "cooperate" (stay loyal) or "defect" (betray the other).
- Both cooperate: 2 years in jail each.
- Both defect: 4 years each.
- One defects, one cooperates: the defector gets 0 years, the cooperator gets 5.
The aim is the FEWEST years in total across a whole tournament against everyone else.

THE STRATEGY FORMAT (schemaVersion 1)
A strategy is one JSON object:
{
  "schemaVersion": 1,
  "name": "short name, at most ${LIMITS.name} characters",
  "description": "optional, one sentence",
  "firstMove": DECISION,            // used on round 1 only. "do" may only be "cooperate", "defect" or "pattern"
  "rules": [ RULE, ... ],           // at most ${LIMITS.rules}. Checked in order from round 2. The FIRST rule that fits is used
  "fallback": DECISION,             // used when no rule fits
  "memory": { "name": 0 },          // optional, at most ${LIMITS.memory} whole-number memory slots with starting values
  "pattern": ["cooperate", "defect"], // optional, 1 to ${LIMITS.pattern} moves, needed if any "do" is "pattern"
  "slip": 5,                        // optional, 0 to ${LIMITS.slip}: percent of rounds you accidentally do the opposite
  "approximations": "optional note" // REQUIRED if you could not build exactly what the student asked for
}

DECISION: { "do": ACTION }
  or with a chance: { "do": ACTION, "chance": 70, "otherwise": ACTION }
  "chance" is a percent. "otherwise" is what happens the rest of the time and is required when chance is below 100.

ACTION is one of:
  "cooperate", "defect",
  "copy"      (copy their last move),
  "opposite"  (the opposite of their last move),
  "repeat"    (repeat my own last move),
  "switch"    (the opposite of my own last move),
  "pattern"   (the next move of "pattern", by round number: round 1 is the first move in the list, and it loops),
  "nextRule"  (only in a rule's "do" or "otherwise": skip to the next rule)

RULE: {
  "when": [ CONDITION ],      // 0, 1 or 2 conditions, ALL must be true. No conditions means always
  "do": ACTION, "chance": 70, "otherwise": ACTION,   // chance and otherwise are optional, as in DECISION
  "set": { "name": 3 },       // optional: set memory slots when this rule is used
  "change": { "name": -1 },   // optional: add to memory slots when this rule is used
  "label": "short name"       // optional, shown in the replay
}
A rule is "used" when its conditions are true and its chance does not send it to "nextRule". Only then do "set" and "change" happen. A rule with "do": "nextRule" is always used, so it can update memory and let later rules decide the move.

CONDITION: { "check": WHAT, COMPARISON: VALUE } with exactly ONE comparison.
  Move checks use "is" with "cooperate" or "defect":
    "theirLast"   their move last round
    "theirLast2"  their move two rounds ago
    "theirLast3"  their move three rounds ago
    "myLast"      my move last round
  Number checks use one of "equals", "atLeast", "atMost", "moreThan", "lessThan", "multipleOf" with a whole number:
    "round"                 the current round, starting at 1
    "roundsLeft"            rounds left INCLUDING this one, so the final round is { "check": "roundsLeft", "equals": 1 }
    "theirDefections"       how many times they have defected so far
    "theirDefectionsLast5"  how many times they defected in the last 5 rounds
    "theirDefectStreak"     how many times in a row they have just defected
    "theirCoopStreak"       how many times in a row they have just cooperated
    "theirCooperationRate"  percent of rounds they have cooperated so far, 0 to 100
    "myDefections"          how many times I have defected so far
    "scoreLead"             their years minus my years, so positive means I am doing better (fewer years)
    "memory.NAME"           a memory slot from "memory"
  A random check: { "check": "chance", "percent": 10 } is true 10% of the time.

NOT POSSIBLE (say so in "approximations" if the student wants these):
  recognising who the opponent is, seeing their full history beyond the checks above, anything from other matches, more than 2 conditions in one rule, more than ${LIMITS.rules} rules.
  A range like "rounds 10 to 20" uses both conditions: [{ "check": "round", "atLeast": 10 }, { "check": "round", "atMost": 20 }].

EXAMPLE: Tit for Tat (cooperate first, then copy whatever they did last round)
{
  "schemaVersion": 1,
  "name": "Tit for Tat",
  "description": "Start nice, then copy their last move.",
  "firstMove": { "do": "cooperate" },
  "rules": [],
  "fallback": { "do": "copy" }
}`;

const STEPS = `HOW TO HELP ME
1. Ask me what my strategy is, in my own words, if I have not said yet.
2. Ask me clarifying questions, a few at a time, in simple language. Always cover:
   - What do I do on round 1?
   - What do I do after they betray me (defect)? For how long?
   - Do I ever forgive? When, or how often?
   - Do I want any randomness? How much?
   - Are there any rounds where I always want the same move (for example the final round, or the last 5)?
3. Read my strategy back to me in plain English, as a short numbered list, and ask "Is this right?". Wait for me to say yes. If I want changes, make them and read it back again.
4. Only after I say yes, reply with the JSON and NOTHING else: no words before or after it, no code fences. It must be valid JSON matching the format above exactly.
5. If anything I asked for cannot be built with this format, build the closest thing you can and explain what you changed in "approximations", in one or two plain sentences. Never change something quietly.

Keep your questions and explanations short and friendly. I am in Grade 9 or above.`;

export function strategyPrompt() {
  return `You are helping a student design a strategy for the repeated prisoner's dilemma, for a tournament on a website called The Long Game. Prompt version ${PROMPT_VERSION}.

${SCHEMA_TEXT}

${STEPS}

Start now with step 1.`;
}

// For a strategy made in the builder that the student wants to take further.
export function extendPrompt(strategy) {
  const { builder, ...plain } = strategy;
  return `You are helping a student improve a strategy for the repeated prisoner's dilemma, for a tournament on a website called The Long Game. Prompt version ${PROMPT_VERSION}.

${SCHEMA_TEXT}

HERE IS MY STRATEGY SO FAR
${JSON.stringify(plain, null, 2)}

${STEPS.replace('1. Ask me what my strategy is, in my own words, if I have not said yet.', '1. Read my current strategy back to me in plain English, then ask how I want to extend or change it.')}

Start now with step 1.`;
}
