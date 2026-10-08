// Lineup - what a deck is, and the AI prompt that writes one.
//
// A deck is one topic: a compelling question, the two ends of the line, the
// cards with their reveal notes, and one reflection question. Teachers keep
// decks in lineupDecks. Starting a session copies the deck onto the room, so
// editing a deck later never changes a session that is already running.
//
// Card ids (c1, c2, ...) match a student's placements to a card. They are
// never shown, and a card keeps its id when it is edited.

export const MIN_CARDS = 4;
export const MAX_CARDS = 16;

const LIMITS = {
  title: 80, question: 300, intro: 600, instructions: 400,
  left: 100, right: 100, leftShort: 30, rightShort: 30, reflection: 400,
  text: 120, note: 700, tag: 16
};

// The fields a deck carries, in the order the editor shows them.
export const FIELDS = ['title', 'question', 'intro', 'instructions', 'left', 'right', 'leftShort', 'rightShort', 'reflection'];
const REQUIRED = ['title', 'question', 'left', 'right', 'reflection'];

const NAMES = {
  title: 'the deck name', question: 'the compelling question', intro: 'the introduction',
  instructions: 'the instructions', left: 'the left end', right: 'the right end',
  leftShort: 'the short name for the left end', rightShort: 'the short name for the right end',
  reflection: 'the reflection question'
};

function str(v) {
  return typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '';
}

export function blankDeck() {
  return {
    title: '', question: '', intro: '', instructions: '',
    left: '', right: '', leftShort: '', rightShort: '', reflection: '',
    cards: []
  };
}

export function nextCardId(cards) {
  let n = 0;
  for (const c of cards) {
    const m = /^c(\d+)$/.exec(c.id || '');
    if (m) n = Math.max(n, +m[1]);
  }
  return 'c' + (n + 1);
}

// Tidy anything that looks like a deck (an AI reply, a Firestore document, the
// editor's form) into exactly the shape the pages expect.
export function normaliseDeck(raw) {
  const deck = blankDeck();
  if (!raw || typeof raw !== 'object') return deck;
  for (const f of FIELDS) deck[f] = str(raw[f]);
  const seen = new Set();
  const cards = Array.isArray(raw.cards) ? raw.cards : [];
  for (const c of cards) {
    if (!c || typeof c !== 'object') continue;
    const card = { id: str(c.id), text: str(c.text), note: str(c.note) };
    const tag = str(c.tag);
    if (tag) card.tag = tag;
    if (!/^c\d+$/.test(card.id) || seen.has(card.id)) card.id = '';
    if (card.id) seen.add(card.id);
    deck.cards.push(card);
  }
  for (const card of deck.cards) {
    if (!card.id) { card.id = nextCardId(deck.cards); seen.add(card.id); }
  }
  // Short names fall back to the ends themselves, quoted.
  if (!deck.leftShort && deck.left) deck.leftShort = '"' + deck.left + '"';
  if (!deck.rightShort && deck.right) deck.rightShort = '"' + deck.right + '"';
  return deck;
}

// Plain-language problems with a deck. An empty list means it can be saved.
export function checkDeck(deck) {
  const problems = [];
  for (const f of REQUIRED) if (!deck[f]) problems.push('It needs ' + NAMES[f] + '.');
  for (const f of FIELDS) {
    if (deck[f].length > LIMITS[f]) problems.push(cap(NAMES[f]) + ' is too long (' + LIMITS[f] + ' characters at most).');
  }
  const n = deck.cards.length;
  if (n < MIN_CARDS) problems.push('It needs at least ' + MIN_CARDS + ' cards (it has ' + n + ').');
  if (n > MAX_CARDS) problems.push('It can have at most ' + MAX_CARDS + ' cards (it has ' + n + ').');
  deck.cards.forEach((c, i) => {
    const which = 'Card ' + (i + 1);
    if (!c.text) problems.push(which + ' has no text.');
    if (!c.note) problems.push(which + ' has no reveal note.');
    if (c.text.length > LIMITS.text) problems.push(which + ' is too long (' + LIMITS.text + ' characters at most).');
    if (c.note.length > LIMITS.note) problems.push(which + "'s note is too long (" + LIMITS.note + ' characters at most).');
    if (c.tag && c.tag.length > LIMITS.tag) problems.push(which + "'s tag is too long (" + LIMITS.tag + ' characters at most).');
  });
  return problems;
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// Only the parts of a deck that students and the class screen need. This is
// what gets copied onto a room.
export function playable(deck) {
  const d = normaliseDeck(deck);
  return {
    title: d.title, question: d.question, intro: d.intro, instructions: d.instructions,
    left: d.left, right: d.right, leftShort: d.leftShort, rightShort: d.rightShort,
    reflection: d.reflection, cards: d.cards
  };
}

/* ---------- the AI prompt ---------- */

// details: { subject, level, topic, question, count, tags, notes }
export function buildPrompt(details) {
  const count = Math.max(MIN_CARDS, Math.min(MAX_CARDS, parseInt(details.count, 10) || 10));
  const lines = [];
  lines.push('You are helping a teacher make a "Lineup" card sort for their class.');
  lines.push('');
  lines.push('How a Lineup works: students drag cards onto a line between two opposite ends. When they are happy with their sort, they tap Reveal and read a short note on each card, and they can still move cards after that. Then they answer one reflection question in their notebooks. The teacher\'s screen shows where the whole class put each card, so the cards that split the class are the ones worth discussing.');
  lines.push('');
  lines.push('The class:');
  if (details.subject) lines.push('- Subject: ' + details.subject);
  if (details.level) lines.push('- Year level or age: ' + details.level);
  if (details.topic) lines.push('- Topic: ' + details.topic);
  lines.push(details.question
    ? '- Compelling question: ' + details.question
    : '- Compelling question: none yet. Write one, ideally a "to what extent" question that the line can answer.');
  lines.push('- Number of cards: ' + count);
  if (details.notes) lines.push('- The teacher also says: ' + details.notes);
  lines.push('');
  lines.push('Write:');
  lines.push('1. "title": a short name for this deck, under 6 words.');
  lines.push('2. "question": the compelling question' + (details.question ? ', exactly as given above.' : '.'));
  lines.push('3. "intro": one or two sentences of context students read before they start. Keep it neutral.');
  lines.push('4. "left" and "right": the two ends of the line, as opposites. Each is a short phrase under 8 words. The left end is the "no" or "not at all" end, the right end is the "yes" or "completely" end.');
  lines.push('5. "leftShort" and "rightShort": 1 to 3 word names for each end, used in phrases like "the class moved toward ___".');
  lines.push('6. "instructions": one or two sentences telling students what each card is and what they are deciding about it.');
  lines.push('7. "cards": exactly ' + count + ' cards. Card "text" is under 10 words. Mix them: a few clear-cut, most genuinely arguable, so the class will disagree about some. No card should give away where it belongs.');
  lines.push('8. A "note" on every card, which students read after they sort: 2 or 3 short sentences with concrete evidence (a date, a number, an example), or saying where experts disagree. Never tell students where the card belongs. Use \\n to start a new paragraph if needed.');
  lines.push(details.tags
    ? '9. A "tag" on every card: one short word shown on the card, as the teacher describes above (for example Then or Now).'
    : '9. No "tag" on the cards.');
  lines.push('10. "reflection": one big question that asks students to use the cards as evidence to answer the compelling question.');
  lines.push('');
  lines.push('Write for the year level: short sentences and plain words, with any hard term explained. Only use facts you are confident are correct. Where something is debated, say so in the note rather than picking a side.');
  lines.push('');
  lines.push('Reply with only this JSON, in one code block, and nothing else:');
  lines.push('');
  lines.push('```json');
  lines.push('{');
  lines.push('  "title": "",');
  lines.push('  "question": "",');
  lines.push('  "intro": "",');
  lines.push('  "left": "",');
  lines.push('  "right": "",');
  lines.push('  "leftShort": "",');
  lines.push('  "rightShort": "",');
  lines.push('  "instructions": "",');
  lines.push('  "cards": [');
  lines.push(details.tags
    ? '    { "text": "", "tag": "", "note": "" }'
    : '    { "text": "", "note": "" }');
  lines.push('  ],');
  lines.push('  "reflection": ""');
  lines.push('}');
  lines.push('```');
  return lines.join('\n');
}

// Pull a deck out of whatever the chatbot replied. Throws an Error with a
// message a teacher can act on.
export function parseReply(text, { keepIds = false } = {}) {
  let t = String(text || '').trim();
  if (!t) throw new Error('Paste the chatbot\'s reply into the box first.');
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
  if (fenced) t = fenced[1];
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('That reply has no deck in it. Check you copied the whole reply, including the part in the code block.');
  t = t.slice(a, b + 1);
  const attempts = [
    s => s,
    s => s.replace(/,\s*([}\]])/g, '$1'),
    s => s.replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, '$1')
  ];
  let raw = null;
  for (const fix of attempts) {
    try { raw = JSON.parse(fix(t)); break; } catch (e) {}
  }
  if (!raw) throw new Error('The reply looks cut off or garbled, so it could not be read. Ask the chatbot to "send the whole JSON again", then paste that.');
  if (Array.isArray(raw)) raw = { cards: raw };
  // Cards with any id the chatbot invented get fresh ones.
  if (!keepIds && Array.isArray(raw.cards)) raw.cards = raw.cards.map(c => (c && typeof c === 'object') ? { ...c, id: '' } : c);
  return normaliseDeck(raw);
}

// A prompt asking a chatbot to change an existing deck. Card ids go along so
// that cards which survive keep matching placements in earlier sessions.
export function buildRevisePrompt(deck, what) {
  const d = playable(deck);
  return [
    'Here is a "Lineup" card sort deck as JSON. Students drag the cards onto a line between "left" and "right", then read each card\'s "note" after they sort, then answer the "reflection" question.',
    '',
    'Change it like this: ' + (what || '(the teacher did not say; improve the cards and notes for accuracy and clarity)'),
    '',
    'Rules: keep the same JSON shape. Keep each card\'s "id" exactly as it is if the card stays, even if you reword it. Give new cards no "id". Keep between ' + MIN_CARDS + ' and ' + MAX_CARDS + ' cards. Notes never say where a card belongs. Only use facts you are confident are correct.',
    '',
    'Reply with only the whole revised JSON, in one code block, and nothing else.',
    '',
    '```json',
    JSON.stringify(d, null, 2),
    '```'
  ].join('\n');
}
