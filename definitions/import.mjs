// Copies chosen units from the definitions bank in Sam's vault into data/defs.json.
// The vault's all.json is the source of truth: fix wording there, then run
//   node definitions/import.mjs && node definitions/build.mjs
// Optional args: path to all.json, then unit numbers (default: the UNITS_LIVE list below).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const UNITS_LIVE = ['1', '2', '3', '4', '5', 'toolkit'];
// The bank tags the 4 key concepts as unit 1 and the toolkit as unit "toolkit"; both go in group 6 (see build.mjs UNITS).
const GROUP6 = { concepts: 'Key concepts', toolkit: 'Toolkit' };
// Subtopic names as in the IB BM guide (ibbmsyllabus.md); hl = the whole subtopic is HL only.
const TOPICS = {
  '1.1': 'What is a business?', '1.2': 'Types of business entities', '1.3': 'Business objectives',
  '1.4': 'Stakeholders', '1.5': 'Growth and evolution', '1.6': 'Multinational companies (MNCs)',
  '2.1': 'Introduction to human resource management', '2.2': 'Organizational structure',
  '2.3': 'Leadership and management', '2.4': 'Motivation and demotivation',
  '2.5': 'Organizational (corporate) culture', '2.6': 'Communication', '2.7': 'Industrial/employee relations',
  '3.1': 'Introduction to finance', '3.2': 'Sources of finance', '3.3': 'Costs and revenues',
  '3.4': 'Final accounts', '3.5': 'Profitability and liquidity ratio analysis', '3.6': 'Efficiency ratio analysis',
  '3.7': 'Cash flow', '3.8': 'Investment appraisal', '3.9': 'Budgets',
  '4.1': 'Introduction to marketing', '4.2': 'Marketing planning', '4.3': 'Sales forecasting',
  '4.4': 'Market research', '4.5': 'The seven Ps of the marketing mix', '4.6': 'International marketing',
  '5.1': 'Introduction to operations management', '5.2': 'Operations methods',
  '5.3': 'Lean production and quality management', '5.4': 'Location', '5.5': 'Break-even analysis',
  '5.6': 'Production planning', '5.7': 'Crisis management and contingency planning',
  '5.8': 'Research and development', '5.9': 'Management information systems',
};

const src = process.argv[2] || join(homedir(), 'notes/Projects/BM definitions/data/all.json');
const units = process.argv.length > 3 ? process.argv.slice(3) : UNITS_LIVE;
const all = JSON.parse(readFileSync(src, 'utf8'));

// lowercase the first letter of part one, unless it starts an acronym (IPO, SMART)
const lower = s => /^[A-Z][A-Z]/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1);
const stop = s => /[.!?]$/.test(s) ? s : s + '.';

const out = [], warn = [];
for (const x of all) {
  if (!units.includes(x.unit)) continue;
  const g6 = GROUP6[x.subtopic];
  if (!g6 && !TOPICS[x.subtopic]) { warn.push(`${x.term}: no subtopic name for ${x.subtopic}`); continue; }
  const joined = `${x.element1} ${x.element2}`.replace(/\.$/, '');
  if (joined !== x.definition.replace(/\.$/, '')) warn.push(`${x.term}: element1 + element2 differ from definition`);
  out.push({
    term: x.term, unit: g6 ? 6 : +x.unit, topic: g6 || `${x.subtopic} ${TOPICS[x.subtopic]}`,
    hl: x.level === 'HL', p: [lower(x.element1), stop(x.element2)],
  });
}
writeFileSync(join(here, 'data/defs.json'), '[\n' + out.map(d => '  ' + JSON.stringify(d)).join(',\n') + '\n]\n');
console.log(`Wrote ${out.length} definitions (units ${units.join(', ')}) to data/defs.json`);
if (warn.length) console.log('Check:\n  ' + warn.join('\n  '));
