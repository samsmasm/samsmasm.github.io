// Key word definitions for You're the Boss.
// Every key below gets a small "?" button wherever the word (or one of its "also" spellings)
// appears in the game: scenes, options, results, HR cards and the debrief.
// To change a definition, edit "def". To add a key word, add a new entry. Leave "def" empty
// to show "Definition coming soon."
window.BOSS_DEFS = {
  // Training
  'Induction': { def: 'Training for new starters: the business, the role, policies, safety and the people.' },
  'On-the-job training': { also: ['on-the-job'], def: 'Training while doing the real job at the workplace: induction, coaching, mentoring, job rotation, apprenticeship, in-house courses.' },
  'Off-the-job training': { also: ['off-the-job'], def: 'Training away from the normal work: lectures and conferences, vestibule training, simulators.' },
  'Coaching': { def: 'A supervisor guides the worker through the task.' },
  'Mentoring': { also: ['mentor'], def: 'An experienced colleague the worker can talk to and learn from.' },
  'Apprenticeship': { def: 'Long training under an expert. Deep skills, but slow.' },
  'In-house course': { also: ['in-house courses'], def: "A course run by the firm's own staff." },
  'Vestibule training': { also: ['vestibule'], def: 'A practice area that copies the workplace.' },
  'Simulator': { def: 'Equipment that copies the real job, so mistakes are safe.' },
  'Lecture or conference': { also: ['lectures and conferences', 'conference or lecture course', 'lecture'], def: 'Learning away from work. Fresh ideas, but output falls while they are away.' },

  // Financial rewards
  'Salary': { def: 'A fixed yearly amount, paid in equal instalments.' },
  'Time rate wage': { also: ['time rate'], def: 'Pay for each hour worked.' },
  'Piece rate wage': { also: ['piece rate'], def: 'Pay for each unit finished.' },
  'Commission': { def: 'A percentage of the value of sales made.' },
  'Salary plus commission': { def: 'A fixed base amount with a percentage of sales on top.' },
  'Employee share ownership': { also: ['share ownership'], def: 'Workers own shares in the company, so they share in its future success.' },
  'Performance-related pay': { also: ['PRP'], def: 'A bonus for hitting a target the worker or team controls.' },
  'Profit-related pay': { def: 'A share of company profit paid to every employee, whatever each person did.' },
  'Fringe payments': { also: ['fringe payment'], def: 'Extras on top of pay, such as meals, a gym pass, a car or health cover.' },

  // Non-financial rewards
  'Job enlargement': { also: ['enlargement'], def: 'Adding more tasks at the same level of difficulty (wider).' },
  'Job enrichment': { also: ['enrichment'], def: 'Adding more complex, skilled, responsible work (deeper).' },
  'Job rotation': { also: ['rotation'], def: 'Moving a worker between different jobs for a time (different).' },
  'Empowerment': { def: 'Giving workers the authority to decide how they do their work.' },
  'Purpose': { def: 'Showing workers who benefits from their work, so it feels meaningful.' },
  'Teamwork': { def: 'Working in a group towards a shared goal.' },

  // Law
  'Age discrimination': { def: 'Treating someone worse at work (hiring, pay, training, promotion) because of their age. It is illegal in most countries. Age can still shape what someone wants, so ask them.' },

  // Theories
  'Scientific management': { also: ['Taylor', 'time-and-motion study'], def: 'Taylor: break work into steps, train the best method, monitor, and pay per unit.' },
  "Maslow's hierarchy of needs": { also: ['Maslow'], def: 'Needs come in levels: security, belonging, esteem, self-fulfilment. A need only motivates once the ones below it are met.' },
  "Herzberg's two-factor theory": { also: ['Herzberg', 'two-factor theory'], def: 'Hygiene factors stop dissatisfaction; motivators create motivation.' },
  'Hygiene factors': { also: ['hygiene factor', 'hygiene', 'Herzberg hygiene factors'], def: 'Pay, conditions, security, relationships. Missing ones cause dissatisfaction; fixing them does not motivate.' },
  'Motivators': { also: ['Herzberg motivators'], def: 'The work itself, responsibility, growth, achievement, recognition.' },
  'McClelland': { also: ["McClelland's acquired needs theory", 'acquired needs'], def: 'HL. People are driven mainly by one of three needs: achievement (challenging goals, feedback), affiliation (good relationships) or power (influence over others).' },
  'Deci and Ryan': { also: ['self-determination theory'], def: 'HL. Self-determination theory: people are motivated from inside when they have autonomy (choice over how they work), competence (feeling capable) and relatedness (connection to others).' },
  'Autonomy': { def: 'Having choice and control over how you do your work. One of the three needs in Deci and Ryan.' },
  'Competence': { def: 'Feeling capable and effective at your work. One of the three needs in Deci and Ryan.' },
  'Relatedness': { def: 'Feeling connected to the people you work with. One of the three needs in Deci and Ryan.' },
  'Equity theory': { also: ['equity'], def: 'HL. Adams: people compare what they put in (effort, skill, time) and get out (pay, recognition) with others. Unfairness demotivates until it is put right.' },
  'Expectancy theory': { also: ['expectancy'], def: 'HL. Vroom: people try hard only if effort can reach the target (expectancy), hitting the target brings the reward (instrumentality), and they want the reward (valence).' },
  'Formative appraisal': { also: ['formative'], def: 'HL. Ongoing feedback through the year to help someone improve.' },
  'Summative appraisal': { also: ['summative'], def: 'HL. A judgement of performance at the end of a period, often linked to pay.' },
  '360-degree feedback': { also: ['360-degree'], def: 'HL. Feedback from everyone the person works with: managers, colleagues, customers.' },
  'Self-appraisal': { def: 'HL. The worker reviews their own performance first.' },
  'Intrinsic motivation': { also: ['intrinsic'], def: 'Motivation from the work itself: interest, challenge, purpose.' },
  'Extrinsic motivation': { also: ['extrinsic'], def: 'Motivation from outside rewards: pay, bonuses, perks.' },
};
