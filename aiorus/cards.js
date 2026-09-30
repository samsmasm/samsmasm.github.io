// aiorus - THE CARD LIST. Edit this file to change the cards.
//
// Each card has:
//   id    short name the class screen uses to match placements. Once a class
//         has used a card, keep its id the same (you can still change the text).
//         For a brand new card, any short unique word will do.
//   era   'then' for historical tasks, 'now' for tasks today.
//   text  what the card says.
//   note  what students see after they tap Reveal.
//
// Cards appear in this order in the tray and on the class screen.

export const CARDS = [
  {
    id: 'weave', era: 'then',
    text: 'Weaving cloth by hand',
    note: 'Power looms took over in the early 1800s. Hand weavers\' pay collapsed, and some joined the Luddite protests (1811 to 1816). Today hand weaving is mostly a craft or a luxury.'
  },
  {
    id: 'copy', era: 'then',
    text: 'Copying books by hand',
    note: 'The printing press (around 1450) replaced most scribes. In the 1800s, steam presses made books and newspapers cheap enough for almost everyone.'
  },
  {
    id: 'plough', era: 'then',
    text: 'Ploughing a field',
    note: 'Steam ploughs arrived in the 1850s and tractors spread in the 1900s. Some tractors now steer themselves by GPS. In 1800 about a third of British workers farmed. Today it is around 1 in 100.'
  },
  {
    id: 'truck', era: 'now',
    text: 'Driving a truck',
    note: 'In 2025 a company began running trucks with no driver on board on a Texas highway. Experts disagree on how fast this will spread. City streets, bad weather and public trust are still hard problems.'
  },
  {
    id: 'essay', era: 'now',
    text: 'Writing an essay',
    note: 'AI can write a fluent essay in seconds. But it can make up facts, and people argue about whether there are real ideas behind the words. The question has become: what is an essay for?'
  },
  {
    id: 'diagnose', era: 'now',
    text: 'Diagnosing an illness',
    note: 'In tests, AI can spot some diseases in scans as well as specialists. Doctors still make the final call, talk with patients and handle unusual cases. Who is to blame when AI gets it wrong is still debated.'
  },
  {
    id: 'translate', era: 'now',
    text: 'Translating a language',
    note: 'Hundreds of millions of people use machine translation every day. Humans are still trusted for legal, medical and literary work, where small errors or tone matter. Many translators now check machine translations instead of starting from scratch.'
  },
  {
    id: 'laugh', era: 'now',
    text: 'Making a friend laugh',
    note: 'AI can write jokes, and some are funny. But making a friend laugh depends on knowing them, timing and shared history. Experts disagree on whether a machine can really "get" a joke.'
  },
  {
    id: 'comfort', era: 'now',
    text: 'Comforting someone who is upset',
    note: 'Some people already talk to AI chatbots when they feel low, and some say it helps. Others worry it is not real care and could replace human contact. Many experts see this as the most human task on the list, but not all.'
  },
  {
    id: 'teach', era: 'now',
    text: 'Teaching a class',
    note: 'AI tutors can explain ideas and give instant feedback, one to one. Teaching also means knowing students, running a room and caring about people. Most experts expect AI to change teaching, not replace teachers. Some disagree.'
  },
  {
    id: 'recipe', era: 'now',
    text: 'Inventing a new recipe',
    note: 'AI has already invented recipes, and some chefs use it for ideas. But it cannot taste anything. Is inventing something new real creativity, or remixing what already exists? People disagree.'
  }
];

// The two ends of the line.
export const LEFT_END = 'Machines already do this';
export const RIGHT_END = 'Only humans, even in 50 years';

// The one big reflection question (dark red).
export const REFLECTION = 'Which card did you move, and why? What does the industrial revolution suggest about where this card will end up?';
