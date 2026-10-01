// aiorus - THE CARD LIST. Edit this file to change the cards.
//
// Each card is something that happened in the Industrial Revolution. Students
// decide whether AI will repeat it.
//
// Each card has:
//   id    short name the class screen uses to match placements. Once a class
//         has used a card, keep its id the same (you can still change the text).
//         For a brand new card, any short unique word will do.
//   era   optional: 'then' or 'now' shows a small tag on the card. Leave it out
//         for no tag.
//   text  what the card says.
//   note  what students see after they tap Reveal. A line break (\n) starts a
//         new paragraph.
//
// Cards appear in this order in the tray and on the class screen.

export const CARDS = [
  {
    id: 'trades',
    text: 'Whole trades disappeared',
    note: 'Then: power looms wiped out hand weaving as a way to earn a living within a few decades.\nNow: AI can already do parts of jobs like translating, customer service and basic coding. Experts disagree on whether whole jobs will vanish or just change.'
  },
  {
    id: 'newjobs',
    text: 'More new jobs appeared than were lost',
    note: 'Then: factories, railways and offices created millions of jobs nobody could have imagined in 1750.\nNow: AI has created some new jobs, such as training and checking AI. Economists disagree on whether new jobs will appear fast enough this time.'
  },
  {
    id: 'slow',
    text: 'The change took generations',
    note: 'Then: steam power spread slowly. Even in 1850, most British workers did not work in factories.\nNow: ChatGPT reached 100 million users in about two months. But businesses and governments can take years to change how they work.'
  },
  {
    id: 'luddites',
    text: 'Workers fought back',
    note: 'Then: the Luddites smashed machines (1811 to 1816). The government sent soldiers and made machine breaking punishable by death.\nNow: Hollywood writers and actors went on strike in 2023, partly over AI. Artists and authors have taken AI companies to court.'
  },
  {
    id: 'owners',
    text: 'Owners got rich long before workers did',
    note: 'Then: many historians argue that workers\' wages barely rose for decades, while factory owners grew rich.\nNow: a few tech companies are among the most valuable in history. Will ordinary workers share the gains, and when?'
  },
  {
    id: 'towns',
    text: 'People moved to where the work was',
    note: 'Then: millions moved from the countryside to crowded factory towns like Manchester.\nNow: AI companies cluster in a few cities, like San Francisco. But much AI work can be done from anywhere online.'
  },
  {
    id: 'poorest',
    text: 'Children and the poor paid the price',
    note: 'Then: children worked long hours in mills and mines, and city slums spread disease.\nNow: low-paid workers in countries like Kenya have labelled disturbing content to train AI. Some worry the poorest countries will gain the least.'
  },
  {
    id: 'laws',
    text: 'Governments acted only after the damage',
    note: 'Then: the 1833 Factory Act, the first with inspectors to enforce it, came decades after factories spread.\nNow: the European Union passed an AI law in 2024. Many other countries have done much less. Is that early, or already too late?'
  },
  {
    id: 'school',
    text: 'Schools changed to fit the new economy',
    note: 'Then: by 1880 school was compulsory in Britain, partly to train workers who could read, write and keep time.\nNow: schools are debating how to use AI, and what students need to learn when AI can write an essay.'
  },
  {
    id: 'everyday',
    text: 'Everyday life changed, not just work',
    note: 'Then: railways brought one standard time across Britain, cheap goods and seaside holidays.\nNow: AI is already inside phones, search engines and social media feeds. Most people use it without noticing.'
  }
];

// The two ends of the line, and short names for them on the class screen.
export const LEFT_END = 'AI will be nothing like this';
export const RIGHT_END = 'AI will be just like this';
export const LEFT_SHORT = '"nothing like"';
export const RIGHT_SHORT = '"just like"';

// The compelling question, shown at the top of the student page.
export const QUESTION = 'To what extent will AI mirror the Industrial Revolution?';

// The one big reflection question (dark red).
export const REFLECTION = 'Which card is the strongest evidence that AI will, or will not, mirror the Industrial Revolution? Why?';
