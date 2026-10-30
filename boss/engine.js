// Pick a Path: You're the Boss. Game rules only, no DOM.
// Spec: Obsidian vault, AIdeas/Pick a Path The Boss Game.md
(function (root) {
  const HIRES = [
    { id: 'maya', name: 'Maya', age: 24, job: 'Assembly line worker at a bike factory', M: 2, S: 2, need: 1, mc: 'ach', values: 'cash for every perfect bike',
      look: { skin: '#e9b98f', hair: '#3a2418', style: 'pony', shirt: '#2f6fb0' } },
    { id: 'tuan', name: 'Tuan', age: 26, job: 'Sales rep for a gadget distributor', M: 3, S: 2, need: 2, mc: 'pow', values: 'a bigger commission and a top-seller trip',
      look: { skin: '#d9a273', hair: '#1c1410', style: 'short', shirt: '#c0392b' } },
    { id: 'aisha', name: 'Aisha', age: 27, job: 'App developer at a 12-person startup', M: 2, S: 3, need: 3, mc: 'ach', values: 'a week to build her own idea',
      look: { skin: '#a8754e', hair: '#17110c', style: 'bob', shirt: '#6a3fa0' } },
    { id: 'kofi', name: 'Kofi', age: 44, job: 'Warehouse picker on the night shift', M: 2, S: 1, need: 1, mc: 'aff', values: 'guaranteed day shifts',
      note: 'New to warehouses after his factory closed. Two teenagers at home.',
      look: { skin: '#7a4a2c', hair: '#17110c', style: 'cap', shirt: '#e08a1e', beard: true } },
    { id: 'rosa', name: 'Rosa', age: 63, job: 'Office administrator at a logistics firm', M: 2, S: 3, need: 2, mc: 'aff', values: 'Friday afternoons off',
      note: 'Thirty years in offices. Plans to retire at 66.',
      look: { skin: '#eebd96', hair: '#c9c4bd', style: 'bun', shirt: '#1f8a6a', glasses: true } },
    { id: 'cat', name: 'Biscuit', age: '4 (32 in cat years)', job: 'Rodent control officer at a cheese warehouse', M: 3, S: 3, need: 1, mc: 'pow', values: 'a tin of salmon',
      look: { fur: '#e8963a', stripe: '#c46f1c', collar: '#2f6fb0', style: 'cat' },
      needWords: {
        1: 'Mrrrow. (The bowl is empty. The bowl is always empty.)',
        2: 'Prrrp? (Wants a lap. Any lap. Yours, ideally.)',
        3: 'MROW. (Wants you to look at the mouse it caught. Look at it.)',
        4: '... (Stares at the top shelf. Wants to conquer it.)',
      } },
  ];

  const NEED_WORDS = {
    1: "I'm worried about rent. Is this job safe?",
    2: "I'd like to feel part of the team.",
    3: 'I want people to notice my work.',
    4: 'I want to grow. Give me something that matters.',
  };

  // Theories a player can give as the reason for a choice. hl: HL only in the IB guide.
  const THEORIES = {
    taylor: { name: 'Taylor', sum: 'Taylor: workers are motivated by money; managers set the one best method, supervise closely and pay by output.' },
    maslow: { name: 'Maslow', sum: 'Maslow: needs come in levels (physiological, safety, social, esteem, self-actualisation); the lowest unmet need motivates.' },
    herzberg: { name: 'Herzberg', sum: 'Herzberg: hygiene factors (pay, conditions, security, relationships) only stop dissatisfaction; motivators (achievement, recognition, responsibility, the work itself, growth) motivate.' },
    mcclelland: { name: 'McClelland', hl: true, sum: 'McClelland: each person is driven mainly by achievement, affiliation or power, and is motivated by work that feeds that need.' },
    sdt: { name: 'Deci and Ryan', hl: true, sum: 'Deci and Ryan (self-determination theory): people are motivated from inside when they feel autonomy, competence and relatedness.' },
    equity: { name: 'Equity theory', hl: true, sum: 'Equity theory (Adams): people compare what they put in and get out with others; unfairness demotivates until it is put right.' },
    expectancy: { name: 'Expectancy theory', hl: true, sum: 'Expectancy theory (Vroom): people try hard only if effort can reach the target (expectancy), the target brings the reward (instrumentality) and they value the reward (valence).' },
  };

  const DEATHS = {
    quit: {
      title: 'They quit',
      theory: 'Basic and belonging needs must be met before higher rewards work (Maslow). Pay, security and relationships are hygiene factors: ignore them and people leave (Herzberg).',
      better: 'A salary base, a team, or pay that meets the need first.',
    },
    demotivated: {
      title: 'Demotivated',
      theory: 'Reward the need the worker has now, not the one you assumed. Per-unit pay and close monitoring suit repetitive work, not creative work (Taylor).',
      better: 'Autonomy, purpose or a meaningful challenge.',
    },
    unskilled: {
      title: 'Out of their depth',
      theory: 'Training is a reward and a requirement. Match the training type to the job: on-the-job for closeness to the work, off-the-job to cut distraction, and simulators or a practice area for safe repetition.',
      better: 'Train them before you stretch them.',
    },
  };

  // ---------- state helpers ----------
  // Motivation and skills have no ceiling; warnings count up to the second one.
  function add(st, k, v) { st[k] = Math.max(0, st[k] + v); }
  function die(st, kind, why) { if (!st.dead) st.dead = { kind, why }; }
  function say(st, m) { st.msgs.push(m); }

  // The Need engine
  function eng(st, tag) {
    if (tag === st.need) {
      st.matched++;
      if (tag === 1) { add(st, 'M', 1); add(st, 'W', -1); say(st, 'That eased their worries.'); }
      else { add(st, 'M', 2); say(st, 'That really landed.'); }
      st.need = Math.min(4, st.need + 1);
    } else if (tag < st.need) {
      say(st, 'Already sorted for them, so no effect.');
    } else {
      st.early++;
      add(st, 'M', -1); say(st, 'Not ready for this.');
    }
  }

  const PER = ['maya', 'tuan', 'aisha', 'kofi', 'rosa', 'cat'];
  // Apply an effect spec: {M,S,W,need,flag,clearW,tag,msg,dead,why}, a per-hire table of specs, or a function
  function fx(st, s) {
    if (typeof s === 'function') return s(st);
    if (!s) return;
    if (PER.some((h) => h in s)) return fx(st, s[st.hire.id]);
    if (s.dead) return die(st, s.dead, s.why);
    if (s.M) add(st, 'M', s.M);
    if (s.S) add(st, 'S', s.S);
    if (s.W) add(st, 'W', s.W);
    if (s.clearW) st.W = 0;
    if (s.need) st.need = s.need;
    if (s.flag) st.flags[s.flag] = 1;
    if (s.msg) say(st, s.msg);
    if (s.tag) eng(st, s.tag);
  }

  function check(st) {
    if (st.dead) return;
    if (st.W >= 2) die(st, 'quit', 'A second warning. They walked out.');
    else if (st.M <= 0) die(st, 'demotivated', 'Motivation hit zero.');
    else if (st.S <= 0) die(st, 'unskilled', 'Skills hit zero. They could not do the job.');
  }

  const QUIT_RENT = { dead: 'quit', why: 'Nothing to sell, so no pay. Rent was due.' };
  const isTaylorJob = (st) => ['maya', 'kofi', 'cat'].includes(st.hire.id);

  // ---------- hubs ----------
  // Option fields: label (or labels: {hire: text} overrides), term, fx, fun ({hire: joke} or one joke for all), next, loop.
  const HUBS = {
    H1: {
      title: 'Day One',
      scene: 'Monday, 8:30. Your new hire arrives at the door and looks around.',
      sceneFor: { cat: 'Monday, 8:30. Your new hire arrives through the cat flap and looks around. Then sits down and washes a leg.' },
      terms: ['Induction', 'On-the-job training', 'Mentoring'],
      options: [
        { id: 'induct', label: 'Run a full induction day: tour, safety, systems, meet the team', term: 'Induction', fx: { M: 1, S: 1 },
          labels: { cat: 'Run a full induction day: tour of every sunbeam, safety talk (the shredder is not a bed), meet the team' },
          fun: { kofi: 'Highlight of the tour: the forklift. Kofi names it Kevin.', rosa: "By 10am Rosa knows everyone's name, birthday and coffee order.",
            cat: 'Biscuit sniffs every member of staff and approves of three of them.' } },
        { id: 'buddy', label: 'Pair them with a buddy for the day', term: 'On-the-job training', fx: { S: 1 },
          labels: { cat: 'Pair Biscuit with Gerald, the warehouse dog, for the day' },
          fun: { cat: 'Gerald shows Biscuit where the mice live. Gerald has never caught one.' } },
        { id: 'keycard', label: 'Hand over a keycard and say "you\'ll pick it up"', term: 'No induction', fx: { S: -1, M: -1, msg: 'Lost on day one.' },
          fun: { maya: 'Maya spends the morning in the supply cupboard. It is a nice cupboard.', aisha: 'Nobody tells Aisha the wifi password, so she hacks the printer instead.',
            cat: 'Biscuit cannot use a keycard. Biscuit spends the day yelling at the door.' } },
      ],
      debrief: 'Induction is on-the-job training for new starters. It introduces the business, the role, policies, safety and the people, so the worker settles in and the business avoids early mistakes.',
    },
    H2: {
      title: 'The contract',
      scene: 'Offer letter time. HR lists the ways you could pay. The pay must suit the work.',
      sceneFor: { cat: 'Offer letter time. Biscuit can count mice, but not money. The pay must suit the work.' },
      terms: ['Salary', 'Time rate wage', 'Piece rate wage', 'Commission', 'Salary plus commission', 'Employee share ownership', 'Taylor'],
      options: [
        { id: 'salary', label: 'A fixed yearly amount, paid in equal instalments', term: 'Salary',
          fx: { maya: { M: 1, need: 2 }, tuan: {}, aisha: { M: 1 }, kofi: { M: 1, need: 2 }, rosa: { M: 1 }, cat: { M: 1, need: 2 } },
          fun: { tuan: 'Tuan asks where the leaderboard is.', cat: "Paid monthly, in tuna. Biscuit eats the whole month's pay by 9:05am." } },
        { id: 'time', label: 'Paid for every hour worked', term: 'Time rate wage',
          fx: { maya: { M: 1, need: 2 }, tuan: {}, aisha: { M: -1, msg: 'Clock-watching.' }, kofi: { M: 1, need: 2 }, rosa: {},
            cat: { M: 1, need: 2, flag: 'OutputGap', msg: 'Paid for time, not for mice.' } },
          fun: { cat: 'Biscuit sleeps 16 hours a day. Payroll pays for every one of them.' } },
        { id: 'piece', label: 'Paid for every unit finished', term: 'Piece rate wage',
          fx: { maya: { M: 2, need: 2, flag: 'Rushing', msg: 'Fast, but rushing.' }, tuan: { M: -1, msg: 'There is no unit to count.' },
            aisha: { S: -1, M: -1, W: 1, msg: 'Quality collapses.' }, kofi: { M: 2, need: 2, flag: 'Rushing', msg: 'Fast, but rushing.' }, rosa: { M: -1, W: 1 },
            cat: { M: 2, need: 2, flag: 'Rushing', msg: 'Countable output, so it works (Taylor). But rushing.' } },
          fun: { aisha: 'Aisha ships 400 apps. They are all the same login button.',
            cat: 'One treat per mouse. By lunch there are 14 mice on your desk. Some of them are only half a mouse.' } },
        { id: 'comm', label: 'Only a percentage of what they sell', term: 'Commission',
          fx: { maya: QUIT_RENT, tuan: { M: 1, flag: 'CommissionOnly' }, aisha: QUIT_RENT, kofi: QUIT_RENT, rosa: { M: -1 },
            cat: { dead: 'quit', why: 'Biscuit tried to sell a mouse to a customer. No sale, no pay, no tuna. Biscuit left through the cat flap forever.' } },
          fun: { maya: 'Maya tries to sell half a bike to the security guard.' } },
        { id: 'salcomm', label: 'A fixed yearly amount plus a percentage of sales', term: 'Salary plus commission',
          fx: { maya: { M: -1 }, tuan: { M: 1 }, aisha: { M: -1 }, kofi: { M: -1 }, rosa: {}, cat: { M: -1 } },
          fun: { cat: 'A percentage of what sales? Biscuit has never sold anything except guilt.' } },
        { id: 'shares', label: 'A low fixed amount plus shares in the company', term: 'Employee share ownership',
          fx: { maya: { M: -1, W: 1 }, tuan: { M: -1, W: 1 }, aisha: { M: 2, need: 4, msg: 'A stake in something new.' },
            kofi: { dead: 'quit', why: 'Shares do not pay rent. With two teenagers, he took a job with a proper wage.' }, rosa: { M: -1, msg: 'Close to retirement, she wants pay now, not shares that grow for years.' }, cat: { M: -1, W: 1, msg: 'Shares do not fill a food bowl.' } },
          fun: { cat: 'Biscuit eats the share certificate.' } },
      ],
      nameIt: {
        ask: 'How is this pay calculated?',
        map: { salary: 'Salary', time: 'Time rate wage', piece: 'Piece rate wage', comm: 'Commission', salcomm: 'Salary plus commission', shares: 'Employee share ownership' },
        pool: ['Salary', 'Time rate wage', 'Piece rate wage', 'Commission', 'Salary plus commission', 'Employee share ownership'],
      },
      debrief: 'Salary suits work that is hard to measure. Time rate suits work needed during set hours. Piece rate suits repetitive, countable output (Taylor) but risks rushed quality. Commission suits sales but leaves income unstable. Employee share ownership gives a stake in future success but no cash today.',
    },
    H4: {
      title: 'Skills gap',
      scene: 'They are struggling with the work, and the numbers show it. How will you train them?',
      terms: ['In-house course', 'Coaching', 'Mentoring', 'Apprenticeship', 'Vestibule training', 'Simulator', 'Lecture or conference'],
      options: [
        { id: 'inhouse', label: 'In-house course run by your own staff', term: 'In-house course', fx: { S: 1 },
          fun: { cat: 'A slideshow on mousing. Biscuit sits on the laptop for all of it.' } },
        { id: 'coach', label: 'Coaching: a supervisor guides them through the task', term: 'Coaching',
          fx: { maya: { S: 1, M: 1 }, tuan: { S: 1 }, aisha: { S: 1 }, kofi: { S: 1, M: 1 }, rosa: { S: 1 }, cat: { S: 1, M: 1 } },
          fun: { cat: 'A supervisor demonstrates the pounce. Badly. Biscuit looks embarrassed for him.' } },
        { id: 'mentor', label: 'Mentoring: an experienced colleague they can talk to', term: 'Mentoring',
          fx: { maya: { S: 1 }, tuan: { S: 1, M: 1 }, aisha: { S: 1, M: 1 }, kofi: { S: 1 }, rosa: { S: 1, M: 1 }, cat: { S: 1, M: 1 } },
          fun: { cat: 'Old Tom, the retired warehouse cat, shares his secrets. Mostly about naps.' } },
        { id: 'appr', label: 'Apprenticeship: long training under an expert', term: 'Apprenticeship',
          fx: { maya: { S: 2, M: -1, msg: 'Months of lower output.' }, tuan: { S: 2 }, aisha: { S: 2 }, kofi: { S: 2, M: -1, msg: 'Months of lower output.' }, rosa: { S: 2 },
            cat: { S: 2, M: -1, msg: 'Two years under a master mouser. The mice multiply while it studies.' } } },
        { id: 'vest', label: 'A practice area copying the workplace', term: 'Vestibule training',
          fx: { maya: { S: 2 }, tuan: { S: 1, msg: 'A role-play room.' }, aisha: { msg: 'Nothing to copy.' }, kofi: { S: 2 }, rosa: { msg: 'Nothing to copy.' }, cat: { S: 2 } },
          fun: { tuan: 'Tuan sells a stapler to a mannequin. The mannequin buys two.',
            cat: 'A practice warehouse full of wind-up mice. Biscuit destroys every one. That was the point.' } },
        { id: 'sim', label: 'Simulator: equipment copying the real job', term: 'Simulator',
          fx: { maya: { msg: 'No simulator exists for this.' }, tuan: { S: 1 }, aisha: { S: 2, msg: 'Crash drills.' }, kofi: { S: 2, msg: 'Forklift simulator.' }, rosa: { msg: 'No simulator exists for this.' },
            cat: { S: 1, M: 1, msg: 'A laser-dot simulator.' } },
          fun: { aisha: 'The simulator crashes the servers 40 times. Aisha is having the best day of her life.',
            cat: 'Biscuit has never been happier. The dot is never caught.' } },
        { id: 'lecture', label: 'Conference or lecture course away from work', term: 'Lecture or conference',
          fx: { maya: { S: 1, M: -1, msg: 'Output falls.' }, tuan: { S: 1, M: 1 }, aisha: { S: 1, M: 1 }, kofi: { S: 1, M: -1, msg: 'Output falls.' }, rosa: { S: 1, M: 1 },
            cat: { M: -1, msg: 'Far from the real work, so nothing sticks. And nobody catches mice while it is away.' } },
          fun: { cat: 'A conference in another city. Biscuit spends it in the cat carrier, screaming.' } },
        { id: 'nothing', label: 'Nothing: they will work it out', term: 'No training',
          fx: (st) => st.S <= 1 ? die(st, 'unskilled', 'Left to work it out, they could not.') : add(st, 'W', 1) },
      ],
      debrief: 'On-the-job types are induction, coaching, mentoring, job rotation, apprenticeship and in-house courses. Off-the-job types are lectures and conferences, vestibule training and simulators. On-the-job training links closely to the real work. Off-the-job training reduces distraction but can be less relevant and takes the worker away from production.',
    },
    H5: {
      title: 'The hygiene audit',
      scene: 'Motivation is low. You ask for a complaint list.',
      sceneFor: { cat: 'Motivation is low. Biscuit cannot write, so it has knocked six things off your desk. HR has translated each one into a complaint.' },
      sort: {
        items: [
          { id: 'pay', label: 'Pay slightly below market', hygiene: true },
          { id: 'noise', label: 'A noisy shared workspace', hygiene: true },
          { id: 'security', label: 'Unclear job security', hygiene: true },
          { id: 'boss', label: 'A cold supervisor', hygiene: true },
          { id: 'recog', label: 'No recognition for good work', hygiene: false },
          { id: 'resp', label: 'No real responsibility', hygiene: false },
        ],
        top: { maya: 'security', tuan: 'recog', aisha: 'resp', kofi: 'pay', rosa: 'boss', cat: 'noise' },
        topFor: { cat: 'the vacuum cleaner' },
      },
      terms: ['Herzberg hygiene factors', 'Herzberg motivators', 'Fringe payment'],
      options: [
        { id: 'hyg', label: 'Fix every hygiene complaint: pay to market, quieter space, secure contract, friendlier supervisor', term: 'Herzberg hygiene factors',
          fx: { clearW: true, msg: 'No longer unhappy, but not motivated either.' },
          fun: { cat: 'The vacuum cleaner is banned. Biscuit is calmer, but no keener.' } },
        { id: 'mot', label: 'Add the motivators only: recognition and real responsibility', term: 'Herzberg motivators',
          fx: { M: 1, W: 1, msg: 'The basics still grate.' },
          fun: { cat: 'Biscuit is Employee of the Month. The photo is just an orange blur.' } },
        { id: 'both', label: 'Fix the hygiene factors and add the motivators', term: 'Herzberg, both factors', fx: { M: 2, clearW: true } },
        { id: 'pay', label: 'Give a pay rise only', term: 'Herzberg hygiene factors', fx: { M: 1, flag: 'PayFade', msg: 'Nice for now.' } },
        { id: 'pizza', label: 'Buy everyone pizza', term: 'Fringe payment', fx: { msg: 'Nice lunch. Nothing changed.' },
          fun: { maya: 'Pineapple. A heated debate breaks out.', tuan: 'Pineapple. A heated debate breaks out.', aisha: 'Pineapple. A heated debate breaks out.',
            kofi: 'Pineapple. A heated debate breaks out.', rosa: 'Rosa collects the money and makes a spreadsheet of toppings.',
            cat: "Biscuit eats the anchovies off everyone's slice. Everyone else is now also demotivated." } },
        { id: 'grateful', label: 'Tell them to be grateful to have a job', term: 'Herzberg hygiene factors',
          fx: { maya: { dead: 'demotivated', why: '"Be grateful" was the last straw.' }, tuan: { dead: 'demotivated', why: '"Be grateful" was the last straw.' },
            aisha: { dead: 'demotivated', why: '"Be grateful" was the last straw.' }, kofi: { dead: 'demotivated', why: '"Be grateful" was the last straw.' },
            rosa: { dead: 'demotivated', why: '"Be grateful" was the last straw.' },
            cat: { dead: 'demotivated', why: 'Biscuit stared at you, unblinking, knocked your coffee off the desk, and never caught another mouse.' } } },
      ],
      debrief: "Herzberg's two-factor theory says hygiene factors (pay, conditions, security, relationships) cause dissatisfaction when missing, but fixing them does not create motivation. Motivators (the work itself, responsibility, growth, achievement, recognition) do.",
    },
    H6: {
      title: 'Output is below target',
      scene: 'Production is behind. How will you raise output?',
      sceneFor: { cat: 'The mouse count is behind target. A mouse was seen wearing a tiny hat. How will you raise output?' },
      terms: ['Taylor', 'Empowerment', 'Intrinsic motivation', 'Extrinsic motivation'],
      options: [
        { id: 'tm', label: 'Time-and-motion study: break the job into steps, train the best method, set a standard', term: 'Taylor',
          fx: { maya: { S: 1, M: 1 }, tuan: { M: -1, msg: 'No standard exists for selling.' }, aisha: { M: -2, msg: 'Creative work does not fit a stopwatch.' }, kofi: { S: 1, M: 1 }, rosa: { S: 1 },
            cat: { S: 1, M: 1, msg: 'Mousing is repetitive and countable, so Taylor works.' } },
          fun: { maya: "A man with a stopwatch times Maya's sneezes. She is now 4% more efficient at sneezing.",
            cat: 'The study finds the best pounce angle: 47 degrees. Biscuit already knew.' } },
        { id: 'monitor', label: 'Close monitoring plus a bonus for every extra unit', term: 'Taylor',
          fx: (st) => {
            const id = st.hire.id;
            if (isTaylorJob(st)) {
              add(st, 'M', 1);
              if (st.flags.Rushing) { add(st, 'S', -1); say(st, 'Rushing even more: mistakes pile up.'); }
            } else if (id === 'aisha') { add(st, 'M', -2); say(st, 'Watched all day. Hates it.'); }
            else if (id === 'rosa') { add(st, 'M', -1); add(st, 'W', 1); }
            else add(st, 'M', -1);
          },
          fun: { aisha: "You put a camera on Aisha's screen. She codes a bot that waves at it.",
            cat: 'Biscuit loves being watched. Cats expect an audience.' } },
        { id: 'goal', label: 'Set a clear goal and leave them to it', term: 'Empowerment',
          fx: { maya: { flag: 'OutputGap', msg: 'Happy enough, but output stays low.' }, tuan: { M: 1 }, aisha: { M: 2, msg: 'Autonomy!' },
            kofi: { flag: 'OutputGap', msg: 'Happy enough, but output stays low.' }, rosa: { M: 1 },
            cat: { flag: 'OutputGap', msg: 'Happy enough, but output stays low.' } },
          fun: { cat: 'Left to it, Biscuit finds a box and sleeps in it until Thursday.' } },
        { id: 'raise', label: 'Raise pay across the board', term: 'Extrinsic motivation',
          fx: { maya: { M: 1, flag: 'PayFade' }, tuan: {}, aisha: {}, kofi: { M: 1, flag: 'PayFade' }, rosa: {}, cat: { M: 1, flag: 'PayFade' } },
          fun: { cat: 'More tuna. Biscuit gets fatter, not faster.' } },
      ],
      debrief: 'Taylor claimed that breaking work into steps, training the best method, monitoring and paying incentives raise output. That fits assembly, picking and mousing. It fails for creative work, where close control and per-unit pay damage motivation.',
    },
    H7: {
      title: 'The month-three plateau',
      scene: 'The work feels the same every day. They are restless.',
      sceneFor: { cat: 'Same warehouse, same mice. Biscuit has started pushing pens off desks while making eye contact.' },
      terms: ['Job enrichment', 'Job enlargement', 'Job rotation', 'Empowerment', 'Purpose', 'Fringe payment', 'Intrinsic motivation', 'Extrinsic motivation'],
      options: [
        { id: 'enrich', term: 'Job enrichment',
          label: (st) => 'Hand over a bigger, harder job: ' + ({ maya: 'judge the quality of finished bikes', tuan: 'lead a client pitch', aisha: 'lead a feature end to end',
            kofi: 'run a stock audit', rosa: 'own the monthly report', cat: 'Head of Pest Strategy (birds too)' })[st.hire.id],
          fx: (st) => st.S < 2 ? die(st, 'unskilled', 'A bigger job, but not the skills to do it.') : eng(st, 3),
          fun: { kofi: 'Kofi ran a team of twenty at the factory. The audit takes him one morning.',
            cat: 'Biscuit catches a pigeon and leaves it in the boardroom as a report.' } },
        { id: 'enlarge', label: 'Add one more task at the same level of difficulty', term: 'Job enlargement',
          labels: { cat: 'Add one more task at the same level of difficulty: also chase the moths' },
          fx: { W: 1, msg: 'More of the same. The problem stays.' }, loop: true },
        { id: 'rotate', label: 'Move them through different jobs, a month each quarter', term: 'Job rotation',
          labels: { cat: 'Move Biscuit through different jobs: a month on reception, a month in the loading bay' },
          fx: { S: 1, tag: 2 },
          fun: { cat: 'On reception, Biscuit sits on the keyboard and greets every visitor with a slow blink.' } },
        { id: 'empower', label: 'Let them choose how and with which tools they work', term: 'Empowerment', fx: { tag: 4 },
          labels: { cat: 'Let Biscuit choose how and where it works' },
          fun: { aisha: 'Aisha picks a standing desk, a rubber duck and dark mode.', cat: 'Biscuit chooses the top of the fridge. It can see everything from there.' } },
        { id: 'purpose', label: 'Show them who benefits from their work', term: 'Purpose', fx: { tag: 4 },
          labels: { cat: 'Show Biscuit who benefits: a wall of cheese, not one bit nibbled' },
          fun: { cat: 'Biscuit stares at the cheese for an hour. It is a meaningful stare.' } },
        { id: 'fringe', label: 'Add free lunches and a gym pass', term: 'Fringe payment',
          labels: { cat: 'Add a heated bed and a scratching post' },
          fx: (st) => { eng(st, 1); say(st, 'The plateau remains.'); }, loop: true,
          fun: { kofi: 'Kofi lifts boxes for eight hours a night. He uses the gym for the showers.',
            cat: 'Biscuit sleeps in the heated bed and ignores the scratching post. Scratches the sofa.' } },
      ],
      nameIt: {
        ask: 'What is this change called?',
        map: { enrich: 'Job enrichment', enlarge: 'Job enlargement', rotate: 'Job rotation' },
        pool: ['Job enrichment', 'Job enlargement', 'Job rotation'],
      },
      debrief: 'Enlargement adds tasks at the same level (wider). Enrichment adds more complex, skilled work (deeper). Rotation moves the worker between jobs for a time (different). Empowerment and purpose speak to growth needs and are often the strongest intrinsic motivators.',
    },
    H8: {
      title: 'The rival offer',
      urgent: true,
      scene: 'A rival firm has offered your worker more money. The answer is due Friday.',
      sceneFor: { cat: 'The neighbours have offered Biscuit more tuna and a sunnier window. The answer is due Friday.' },
      terms: ['Fringe payment', 'Employee share ownership', 'Performance-related pay', 'Maslow', 'Herzberg hygiene factors'],
      options: [
        { id: 'match', label: 'Match with a pay rise', term: 'Herzberg hygiene factors',
          labels: { cat: 'Match their tuna offer' },
          fx: (st) => st.flags.PayFade ? (add(st, 'W', 1), say(st, 'They have stopped being moved by money.')) : eng(st, 1),
          fun: { cat: 'Biscuit eats both bowls.' } },
        { id: 'shares', label: 'Offer shares or share options', term: 'Employee share ownership', fx: { tag: 3 },
          fun: { cat: 'Biscuit sits on the share options. This may count as accepting.' } },
        { id: 'growth', label: 'Offer a growth deal: lead a project and a funded course', term: 'Maslow: growth', fx: { S: 1, tag: 4 },
          labels: { cat: 'Offer a growth deal: lead Operation Pigeon and a funded course in advanced climbing' } },
        { id: 'prp', label: 'Offer a performance bonus', term: 'Performance-related pay', fx: { tag: 3 } },
        { id: 'nomatch', label: 'Say "we can\'t match them"', term: 'Maslow: security',
          fx: (st) => st.need === 1 ? die(st, 'quit', st.hire.id === 'cat' ? 'Biscuit moved next door. You see it in their window every morning. Smug.' : 'They took the better-paid job.') : add(st, 'W', 1) },
      ],
      debrief: 'Pay matches only meet hygiene needs. A worker whose basic needs are met is more likely to be kept by esteem and growth rewards.',
    },
    H9: {
      title: 'The life event',
      scene: (st) => ({
        maya: 'Her rent goes up 20%.',
        kofi: 'His mother moves in and needs care in the evenings, so he needs predictable hours.',
        rosa: 'Her closest colleague of 20 years retires, and she feels alone.',
        tuan: 'He wins the regional sales award and wants status.',
        aisha: 'She says the work has become too easy.',
        cat: 'A kitten has been hired. It is getting all the likes on the company Instagram.',
      })[st.hire.id],
      sceneFun: {
        maya: 'Her landlord has bought a jet ski.',
        kofi: 'He has made a colour-coded care rota. The teenagers have ignored it.',
        rosa: 'Her desk plant, Fernando, also looks sad.',
        tuan: 'He has the trophy engraved. Again. Bigger.',
        aisha: 'She finished the week\'s work on Tuesday and spent Wednesday rewriting it in a language nobody uses.',
        cat: 'Biscuit has not blinked in four hours.',
      },
      enter(st) {
        // The cat's status is threatened, so esteem comes to the top
        st.need = { maya: 1, kofi: 1, rosa: 2, tuan: 3, aisha: 4, cat: 3 }[st.hire.id];
        if (st.M <= 1) st.need = Math.max(1, st.need - 1);
      },
      terms: ['Maslow', 'Fringe payment', 'Teamwork', 'Empowerment'],
      options: [
        { id: 'secure', label: 'Guaranteed hours and a pay rise', term: 'Maslow: security', fx: { tag: 1 },
          labels: { cat: 'A guaranteed food bowl, refilled on the hour' } },
        { id: 'belong', label: 'A team lunch and a buddy', term: 'Maslow: belonging', fx: { tag: 2 },
          fun: { cat: 'Team lunch. Biscuit sits on the table, in the middle of the food.' } },
        { id: 'esteem', label: 'Public recognition and a new title', term: 'Maslow: esteem', fx: { tag: 3 },
          fun: { cat: 'Biscuit is now Senior Cat. It gets a tiny name badge and removes it at once.' } },
        { id: 'grow', label: 'Time for a project of their own choosing', term: 'Maslow: growth', fx: { tag: 4 },
          fun: { cat: 'Biscuit chooses a project: the top shelf.' } },
        { id: 'life', label: '"That\'s life, keep working"', term: 'Ignoring needs', fx: { M: -1, W: 1 } },
      ],
      debrief: "Maslow's hierarchy says people move through security, belonging, esteem and self-fulfilment needs, and that a lower need that is threatened returns to the top. The right reward depends on where the worker is now, not where they were last month.",
    },
    H10: {
      title: 'The team shake-up',
      scene: 'A new colleague joins. The team is tense, and your worker is getting lost in the middle.',
      sceneFor: { cat: 'Gerald the dog has brought his brother to work. The team is tense, and Biscuit is up a filing cabinet.' },
      terms: ['Teamwork', 'Mentoring', 'Maslow'],
      options: [
        { id: 'shared', label: 'Set a shared team target with a shared reward', term: 'Teamwork', fx: { tag: 2 },
          fun: { tuan: 'Tuan makes the team chant before every meeting.', cat: 'Target: zero mice. Biscuit and the dogs form a pincer movement.' } },
        { id: 'mentor', label: 'Pair them with a mentor or buddy', term: 'Mentoring', fx: { S: 1, tag: 2 } },
        { id: 'prize', label: 'Give the best-performing pair a prize', term: 'Maslow: esteem', fx: { tag: 3 } },
        { id: 'desk', label: 'Move them to a separate desk away from the noise', term: 'Isolation',
          fx: (st) => st.need === 2 ? die(st, 'quit', 'Cut off from the team, they left.') : add(st, 'M', -1),
          fun: { cat: 'Biscuit was already sitting on that desk.' } },
        { id: 'ignore', label: 'Ignore it and hope it settles', term: 'Ignoring relationships', fx: { W: 1 } },
      ],
      debrief: 'Teamwork meets belonging needs and is a Herzberg relationship factor. Isolating a worker who needs people is a fast route to losing them.',
    },
    H11: {
      title: 'Bonus design',
      scene: 'Targets are being hit and you want to share the success.',
      terms: ['Performance-related pay', 'Profit-related pay', 'Commission'],
      options: [
        { id: 'indiv', label: 'A bonus if their own target is met', term: 'Performance-related pay (individual)',
          fx: (st) => {
            eng(st, 3);
            if (st.hire.id === 'tuan') { st.flags.Gaming = 1; say(st, 'He starts pushing customers to hit the number.'); }
            if (st.hire.id === 'cat') { st.flags.Gaming = 1; say(st, 'Biscuit games the target.'); }
          },
          fun: { tuan: 'He sells his grandmother a smart fridge. She already has two.',
            cat: "Biscuit starts importing mice from next door's garden and catching them again in the warehouse." } },
        { id: 'team', label: 'A bonus if the whole team hits its target', term: 'Performance-related pay (team)', fx: { tag: 2 } },
        { id: 'profit', label: 'A share of company profit for every employee', term: 'Profit-related pay',
          fx: (st) => { eng(st, 2); if (st.hire.id === 'tuan') { add(st, 'M', -1); say(st, 'The top seller gets the same as everyone.'); } },
          fun: { cat: 'Biscuit does not understand profit but loves the envelope. Sits in it.' } },
        { id: 'none', label: 'No bonus this year', term: 'No reward',
          fx: (st) => { if (st.need >= 3) { add(st, 'M', -1); say(st, 'They notice.'); } } },
      ],
      nameIt: {
        ask: 'Which scheme is this?',
        map: { indiv: 'Performance-related pay', team: 'Performance-related pay', profit: 'Profit-related pay' },
        pool: ['Performance-related pay', 'Profit-related pay', 'Commission'],
      },
      debrief: 'Performance-related pay rewards a target the worker or team controls, so it can raise effort but also encourage gaming. Profit-related pay shares company profit whatever each person did, so it builds loyalty and shared purpose but does not reward individual effort.',
    },
    H12: {
      title: 'New skills needed',
      scene: (st) => 'You are launching something new, and the launch has a date. ' + ({
        maya: 'Maya gets a new assembly machine.', tuan: 'Tuan gets a new product range.', aisha: 'Aisha gets a new platform to build on.',
        kofi: 'Kofi gets a new scanning system.', rosa: 'Rosa gets new booking software.',
        cat: 'The warehouse buys a robot vacuum, and Biscuit must learn to work alongside it.' })[st.hire.id],
      terms: ['In-house course', 'Coaching', 'Mentoring', 'Job rotation', 'Apprenticeship', 'Vestibule training', 'Simulator', 'Lecture or conference'],
      options: [
        { id: 'inhouse', label: 'In-house course run by your own staff', term: 'In-house course', fx: { S: 1 },
          fun: { rosa: 'Rosa has learned five booking systems since 1993. She finds three bugs on day one.' } },
        { id: 'skip', only: ['rosa'], label: 'Skip her training: she retires soon anyway', term: 'Age discrimination',
          fx: { M: -1, W: 1, msg: 'Treating her worse because of her age is age discrimination, and it is illegal. Rosa calls HR.' } },
        { id: 'coach', label: 'Coaching from a supervisor', term: 'Coaching',
          fx: { maya: { S: 1, M: 1 }, tuan: { S: 1 }, aisha: { S: 1 }, kofi: { S: 1, M: 1 }, rosa: { S: 1 }, cat: { S: 1, M: 1 } } },
        { id: 'mentor', label: 'Mentoring by an experienced colleague', term: 'Mentoring',
          fx: { maya: { S: 1 }, tuan: { S: 1, M: 1 }, aisha: { S: 1, M: 1 }, kofi: { S: 1 }, rosa: { S: 1, M: 1 }, cat: { S: 1 } } },
        { id: 'rotate', label: 'Shadow the team already using it', term: 'Job rotation', fx: { S: 1, M: 1 },
          fun: { cat: 'Biscuit shadows the cleaners and the robot. By Friday Biscuit is riding it.' } },
        { id: 'appr', label: 'Apprenticeship under an expert', term: 'Apprenticeship', fx: { S: 2, M: -1, msg: 'The launch waits.' } },
        { id: 'vest', label: 'A practice area copying the workplace', term: 'Vestibule training',
          fx: { maya: { S: 2 }, tuan: { S: 1 }, aisha: { msg: 'Nothing useful to copy.' }, kofi: { S: 2 }, rosa: { msg: 'Nothing useful to copy.' }, cat: { S: 2 } },
          fun: { cat: 'A practice room with a second robot vacuum. Biscuit learns where it turns.' } },
        { id: 'sim', label: 'Simulator copying the real equipment', term: 'Simulator',
          fx: { maya: { msg: 'No simulator exists for this.' }, tuan: { S: 1 }, aisha: { S: 2 }, kofi: { S: 2 }, rosa: { msg: 'No simulator exists for this.' }, cat: { S: 1 } },
          fun: { cat: 'A robot vacuum video game. Biscuit mostly paws at the screen.' } },
        { id: 'lecture', label: 'Conference or lecture course away from work', term: 'Lecture or conference',
          fx: { maya: { S: 1, M: -1, msg: 'Output falls.' }, tuan: { S: 1, M: 1 }, aisha: { S: 1, M: 1 }, kofi: { S: 1, M: -1, msg: 'Output falls.' }, rosa: { S: 1, M: 1 },
            cat: { S: 1, M: -1, msg: 'Output falls.' } },
          fun: { cat: 'A lecture on robotics. Biscuit sleeps through it, which is honestly fair.' } },
        { id: 'nothing', label: 'Nothing: they will work it out', term: 'No training',
          fx: (st) => st.S <= 2 ? die(st, 'unskilled', st.hire.id === 'cat' ? 'Biscuit attacked the robot vacuum. The robot vacuum won.' : 'Launch day came and they could not run the new system.') : add(st, 'M', -1) },
      ],
      debrief: 'Training helps the business (productivity, flexibility, new technology, fewer accidents) and the worker (value, promotion, resilience). Costs are fees, time away and the risk the worker takes the new skills to a rival.',
    },
    H13: {
      title: 'The share offer',
      scene: 'The company is growing. You can offer your worker a stake.',
      terms: ['Employee share ownership', 'Profit-related pay', 'Fringe payment'],
      options: [
        { id: 'grant', label: 'Grant shares that vest over four years', term: 'Employee share ownership',
          fx: (st) => {
            if (st.hire.id === 'rosa') say(st, 'Rosa retires before they vest, so they mean little to her. Ask what she wants instead.');
            else eng(st, 3);
            market(st);
          },
          fun: { cat: 'Biscuit now owns 0.01% of the company and acts like it owns all of it.' } },
        { id: 'discount', label: 'Let them buy shares at a discount', term: 'Employee share ownership',
          fx: (st) => {
            if (st.hire.id === 'tuan' || st.hire.id === 'aisha') eng(st, 3);
            else if (st.hire.id === 'rosa') { add(st, 'M', -1); say(st, 'Three years from retirement, she will not risk her savings on shares.'); }
            else { add(st, 'M', -1); add(st, 'W', 1); say(st, 'They cannot afford it.'); }
            market(st);
          },
          fun: { maya: 'Maya checks her savings: a bike bell and a coupon.', cat: 'Biscuit has no bank account. Just a pile of bottle caps under the fridge.' } },
        { id: 'none', label: 'No shares', term: 'No shares', fx: {} },
      ],
      nameIt: {
        ask: 'What is this called?',
        map: { grant: 'Employee share ownership', discount: 'Employee share ownership' },
        pool: ['Employee share ownership', 'Profit-related pay', 'Fringe payments'],
      },
      debrief: "Employee share ownership gives workers a stake in the business and builds loyalty, and suits startups that cannot pay high salaries. The disadvantages are that shares can lose value, they bring no cash today, and the owners' control is diluted.",
    },
    H14: {
      title: 'Perks',
      scene: 'You have a small budget for extras on top of pay.',
      terms: ['Fringe payment', 'Herzberg hygiene factors', 'Intrinsic motivation', 'Extrinsic motivation'],
      options: [
        { id: 'car', label: 'A transport allowance or company car', term: 'Fringe payment', fx: { tag: 1 },
          fun: { tuan: 'Tuan asks if it can be red. It cannot.', cat: 'A company car. Biscuit sleeps on the warm bonnet.' } },
        { id: 'gym', label: 'Free meals and a gym membership', term: 'Fringe payment', fx: { tag: 1 },
          fun: { cat: 'Free meals: yes. The gym: Biscuit watches the treadmill from a safe distance.' } },
        { id: 'health', label: 'Private health cover', term: 'Fringe payment', fx: { tag: 1 },
          fun: { cat: 'Biscuit hears the word "vet" and hides for two days.' } },
        { id: 'learn', label: 'A learning allowance for courses and books', term: 'Fringe payment (growth)', fx: { tag: 4 },
          fun: { rosa: 'Rosa signs up for a course in data dashboards. She is the only one who finishes it.',
            cat: 'Biscuit buys a book and sits on it. Learning by absorption.' } },
      ],
      debrief: 'Fringe payments are extras given on top of pay. They are extrinsic and mostly hygiene factors (Herzberg), so they stop complaints but rarely motivate on their own. A learning allowance is a fringe payment that serves growth, so it can do more.',
    },
    H15: {
      title: 'Year-end',
      scene: 'A record year. Share the success as you wish.',
      terms: ['Profit-related pay', 'Performance-related pay', 'Employee share ownership', 'Fringe payment', 'Mentoring'],
      options: [
        { id: 'profit', label: 'Profit-related pay for everyone', term: 'Profit-related pay', fx: { tag: 2 } },
        { id: 'prp', label: "A PRP bonus for the worker's own results", term: 'Performance-related pay', fx: { tag: 3 } },
        { id: 'shares', label: 'More shares', term: 'Employee share ownership', fx: { tag: 3 } },
        { id: 'gift', label: 'A fringe gift: a voucher or a weekend trip', term: 'Fringe payment', fx: { tag: 1 },
          fun: { cat: 'A weekend trip. Biscuit spends it inside the box the tickets came in.' } },
        { id: 'promote', label: 'Promote them to a mentoring role with a new title', term: 'Maslow: growth', fx: { tag: 4, flag: 'Promoted' },
          labels: { cat: 'Promote Biscuit to mentor the kitten, with a new title' },
          fun: { aisha: 'Lesson one for the new hire: never deploy on a Friday.', rosa: 'Rosa has trained every new starter for thirty years. Now it comes with a title.', cat: 'Lesson one for the kitten: knock things off tables, but only important things.' } },
        { id: 'speech', label: 'A thank-you speech only', term: 'No reward',
          fx: (st) => { if (st.need >= 3) { add(st, 'M', -1); say(st, 'Words are not enough.'); } },
          fun: { maya: "Someone's phone rings halfway through. It is yours.", tuan: "Someone's phone rings halfway through. It is yours.",
            aisha: "Someone's phone rings halfway through. It is yours.", kofi: "Someone's phone rings halfway through. It is yours.",
            rosa: "Someone's phone rings halfway through. It is yours.", cat: 'Biscuit walks across the laptop halfway through and ends the slideshow.' } },
      ],
      debrief: 'Match the reward to the need: profit-related pay and team rewards for belonging, PRP, shares and titles for esteem, and growth roles for self-fulfilment.',
    },
  };
  // ---------- more scenarios ----------
  // General ones go in every hire's pool (hl: HL games only). Ones with `hire` belong to that hire alone.
  // Each option's `why` lists the theories that back it, with the reason; `bad` explains why no theory does.
  const mcIs = (k) => (st) => st.hire.mc === k;
  Object.assign(HUBS, {
    EQ: {
      title: 'The pay gap', hl: true,
      scene: (st) => st.hire.name + ' finds out that a new starter doing the same job is paid 15% more.',
      sceneFor: { cat: 'Biscuit discovers that the kitten gets premium tuna. Biscuit gets the supermarket brand.' },
      terms: ['Equity theory', 'Hygiene factors'],
      options: [
        { id: 'fix', label: 'Raise their pay to match, and explain how pay is set', term: 'Equity theory', fx: { M: 1, clearW: true, msg: 'Fair again.' },
          labels: { cat: 'Give Biscuit premium tuna too, and explain the menu' },
          why: { equity: 'They compare their pay with a colleague doing the same work. Matching it puts the balance right.',
            herzberg: 'Unfair pay is a hygiene problem. Fixing it removes the dissatisfaction.' } },
        { id: 'less', label: 'Let them work fewer hours instead of raising pay', term: 'Equity theory', fx: { M: 1, flag: 'OutputGap', msg: 'Balance restored by doing less. Output falls.' },
          labels: { cat: 'Let Biscuit nap for longer instead' },
          why: { equity: 'Equity theory says people restore fairness by putting in less. Fewer hours does exactly that, but the firm loses output.' } },
        { id: 'once', label: 'Give a one-off bonus and leave the gap', term: 'One-off bonus', fx: { msg: 'Nice, but the gap is still there every month.' },
          labels: { cat: 'One tin of salmon, once' },
          bad: 'A one-off payment does not fix an unfairness that repeats every month, so they will still feel short-changed.' },
        { id: 'secret', label: 'Tell them pay is confidential and to stop comparing', term: 'Ignoring fairness', fx: { M: -1, W: 1 },
          labels: { cat: "Hide the kitten's bowl" }, fun: { cat: 'Biscuit finds the bowl in four minutes.' },
          bad: 'People compare anyway. Hiding the unfairness makes it feel worse, and no theory recommends it.' },
      ],
      debrief: 'Equity theory (Adams): people compare their inputs (effort, skill, time) and outputs (pay, recognition) with others. If it feels unfair they put in less, ask for more, or leave. Restoring fairness restores motivation.',
    },
    EX: {
      title: 'The target nobody believes in', hl: true,
      scene: (st) => 'Head office sets a huge new target with a cash bonus. ' + st.hire.name + ' says: "I can\'t hit that. And I don\'t care about that bonus."',
      sceneFor: { cat: 'Head office wants 100 mice a week, with a bonus of one biscuit. Biscuit looks at the target, then at the biscuit, then leaves.' },
      terms: ['Expectancy theory', 'Taylor'],
      options: [
        { id: 'reset', label: (st) => 'Make the target reachable, help them reach it, and offer something they value: ' + st.hire.values, term: 'Expectancy theory', fx: { M: 2 },
          why: { expectancy: 'Effort must reach the target (expectancy), the target must bring the reward (instrumentality), and the reward must be wanted (valence). This fixes all three.' } },
        { id: 'double', label: 'Keep the target but double the bonus', term: 'Taylor', fx: { msg: 'They still do not believe they can hit it.' },
          labels: { cat: 'Keep the target but offer two biscuits' },
          why: { taylor: 'Taylor says money motivates, so a bigger bonus should mean more effort. Expectancy theory disagrees: if the target looks impossible, the bonus is worth nothing.' } },
        { id: 'train', label: 'Keep the target and train them until they can reach it', term: 'Training', fx: { S: 1, M: 1 },
          why: { expectancy: 'Training raises expectancy: they start to believe effort can hit the target.', sdt: 'Training builds competence, one of the three needs.' } },
        { id: 'targets', label: 'Tell them targets are targets', term: 'Ignoring the problem', fx: { M: -1 },
          bad: 'If they do not believe in the target or want the reward, nothing changes. No theory backs it.' },
      ],
      debrief: 'Expectancy theory (Vroom): motivation = expectancy (can I do it?) x instrumentality (will I get the reward?) x valence (do I want it?). If any one is zero, motivation is zero.',
    },
    SD: {
      title: 'The new manager', hl: true,
      scene: (st) => 'A new manager checks everything ' + st.hire.name + ' does.',
      sceneFun: {
        maya: 'Maya keeps getting the new brake fitting wrong, and the manager just says "again".',
        tuan: 'Tuan now needs every email approved.',
        aisha: 'Aisha says: "I could do this in half the time if he left me alone."',
        kofi: 'On the night shift, Kofi has not spoken to anyone since Tuesday.',
        rosa: 'Since the merger, Rosa eats lunch alone.',
        cat: 'The manager has put Biscuit on a lead.',
      },
      terms: ['Deci and Ryan', 'Empowerment', 'Taylor'],
      options: [
        { id: 'auton', label: 'Let them decide how to work; the manager checks results, not every step', term: 'Autonomy',
          fx: (st) => add(st, 'M', ['aisha', 'tuan', 'cat'].includes(st.hire.id) ? 2 : 1),
          why: { sdt: 'Autonomy is one of the three needs in self-determination theory.', herzberg: 'Responsibility is a Herzberg motivator.' } },
        { id: 'compet', label: 'Give clear feedback and coaching so they feel good at the job', term: 'Competence',
          fx: (st) => { add(st, 'S', 1); if (st.hire.id === 'maya') add(st, 'M', 2); },
          why: { sdt: 'Competence is one of the three needs in self-determination theory.', herzberg: 'Feeling of achievement is a Herzberg motivator.' } },
        { id: 'relate', label: 'Set up a buddy and a weekly team check-in', term: 'Relatedness',
          fx: (st) => add(st, 'M', ['kofi', 'rosa'].includes(st.hire.id) ? 2 : 1),
          why: { sdt: 'Relatedness is one of the three needs in self-determination theory.', maslow: 'Belonging is a social need in Maslow\'s hierarchy.' } },
        { id: 'checks', label: 'Back the manager: more checks mean fewer mistakes', term: 'Close supervision',
          fx: (st) => add(st, 'M', ['aisha', 'cat'].includes(st.hire.id) ? -2 : -1),
          why: { taylor: 'Taylor: managers supervise closely so workers stick to the one best method.' } },
      ],
      debrief: 'Deci and Ryan (self-determination theory): people are motivated from inside (intrinsically) when they have autonomy (control over how they work), competence (feeling good at it) and relatedness (connection to others). Find which one is missing.',
    },
    MC: {
      title: 'One opportunity', hl: true,
      scene: (st) => 'There is budget for one development opportunity for ' + st.hire.name + '.',
      sceneFun: {
        maya: 'Maya keeps a chart of her best day on the line.', tuan: 'Tuan wants to be the one everyone listens to.',
        aisha: 'Aisha loves a hard problem with a clear finish line.', kofi: 'Kofi is the one who remembers everyone\'s birthday.',
        rosa: 'Everyone stops at Rosa\'s desk to chat.', cat: 'Biscuit sits on the highest shelf and looks down on everyone.',
      },
      terms: ['McClelland', 'Maslow'],
      options: [
        { id: 'ach', label: 'A tough personal target with weekly feedback on progress', term: 'McClelland: achievement',
          fx: (st) => add(st, 'M', mcIs('ach')(st) ? 2 : 0),
          why: { mcclelland: 'Feeds the need for achievement: challenging goals and feedback.', herzberg: 'Achievement is a Herzberg motivator.' } },
        { id: 'aff', label: 'Run the team social and help new starters settle in', term: 'McClelland: affiliation',
          fx: (st) => add(st, 'M', mcIs('aff')(st) ? 2 : 0),
          why: { mcclelland: 'Feeds the need for affiliation: good relationships and belonging.', maslow: 'Meets social (belonging) needs.' } },
        { id: 'pow', label: 'Lead a small team and chair the weekly meeting', term: 'McClelland: power',
          fx: (st) => add(st, 'M', mcIs('pow')(st) ? 2 : mcIs('aff')(st) ? -1 : 0),
          why: { mcclelland: 'Feeds the need for power: influence over others.', maslow: 'Status and respect meet esteem needs.' } },
        { id: 'none', label: 'Nothing this year: budgets are tight', term: 'No development', fx: { M: -1 },
          bad: 'Every theory here says growth and development matter. Doing nothing feeds no need.' },
      ],
      debrief: "McClelland's acquired needs theory: people are driven mainly by achievement, affiliation or power. Read the clues about what each person enjoys, then give them work that feeds that need.",
    },
    AP: {
      title: 'Appraisal time', hl: true,
      scene: (st) => "It is time for " + st.hire.name + "'s appraisal. Which kind will you use?",
      terms: ['Deci and Ryan', 'Herzberg'],
      options: [
        { id: 'form', label: 'Formative: short feedback chats all year, to help them improve', term: 'Formative appraisal',
          fx: (st) => { add(st, 'S', 1); add(st, 'M', ['maya', 'kofi'].includes(st.hire.id) ? 2 : 1); },
          why: { sdt: 'Regular feedback builds competence.', herzberg: 'It recognises progress, and recognition is a motivator.' } },
        { id: 'summ', label: 'Summative: one end-of-year rating, linked to pay', term: 'Summative appraisal',
          fx: (st) => add(st, 'M', st.hire.id === 'tuan' ? 1 : 0),
          why: { expectancy: 'A clear link from rating to reward raises instrumentality.', taylor: 'Taylor links pay to measured performance.' } },
        { id: 'r360', label: '360-degree: feedback from colleagues, customers and their manager', term: '360-degree feedback',
          fx: (st) => add(st, 'M', st.hire.id === 'rosa' ? 2 : 1),
          fun: { rosa: 'Fourteen colleagues say Rosa is the reason the office works.' },
          why: { herzberg: 'Hearing praise from everyone is recognition, a motivator.', maslow: 'Respect from others meets esteem needs.' } },
        { id: 'self', label: 'Self-appraisal: they review their own year first', term: 'Self-appraisal',
          fx: (st) => add(st, 'M', ['aisha', 'cat'].includes(st.hire.id) ? 2 : 1),
          fun: { cat: 'Biscuit rates itself 10 out of 10 in every category, then sits on the form.' },
          why: { sdt: 'Judging your own work gives autonomy.' } },
      ],
      debrief: 'Formative appraisal is ongoing and helps people improve. Summative appraisal judges the year, often for pay. 360-degree feedback comes from everyone the person works with. Self-appraisal starts with the worker\'s own view.',
    },

    // --- two per hire ---
    MQ: {
      title: 'Speed or quality', hire: 'maya',
      scene: "The line has been sped up. Maya's brake fittings are starting to fail the checks.",
      terms: ['Taylor', 'Empowerment'],
      options: [
        { id: 'stop', label: 'Give her the authority to stop the line when something is wrong', term: 'Empowerment', fx: { M: 2, S: 1 },
          why: { herzberg: 'Responsibility is a motivator.', sdt: 'Control over her own work gives autonomy.' } },
        { id: 'pay', label: 'Pay more per bike to keep the speed up', term: 'Piece rate', fx: { M: 1, S: -1, msg: 'More bikes, more faults.' },
          why: { taylor: 'Taylor: pay by output and workers will go faster. The catch is quality.' } },
        { id: 'qc', label: 'Add an inspector at the end of the line', term: 'Quality control', fx: { S: 1, msg: 'Faults get caught, but nobody feels better about the work.' },
          bad: 'Sensible for quality, but it is not about motivation, so no motivation theory backs it.' },
        { id: 'slow', label: 'Slow the line back down, nothing else', term: 'Working conditions', fx: { M: 1 },
          why: { herzberg: 'A sane pace is a working condition, a hygiene factor: it removes dissatisfaction.' } },
      ],
      debrief: 'Taylor-style speed and piece rates raise output but can wreck quality. Giving workers responsibility for quality (empowerment) motivates and fixes the faults at source.',
    },
    MS: {
      title: 'The near miss', hire: 'maya',
      scene: "A guard on Maya's machine fails and a wheel flies across the floor. Nobody is hurt. This time.",
      terms: ['Maslow', 'Hygiene factors'],
      options: [
        { id: 'team', label: 'Fix the guard tonight, and ask the line to help design better safety', term: 'Safety and empowerment', fx: { M: 2, S: 1, clearW: true },
          why: { maslow: 'Safety is a basic need: it must be met before anything else motivates.', herzberg: 'Safe working conditions are a hygiene factor.', sdt: 'A say in the fix gives autonomy.' } },
        { id: 'fix', label: 'Fix the guard tonight', term: 'Safety', fx: { M: 1, clearW: true },
          why: { maslow: 'Safety is a basic need.', herzberg: 'Safe working conditions are a hygiene factor.' } },
        { id: 'danger', label: 'Pay danger money instead', term: 'Danger money', fx: { M: -1, W: 1, msg: 'Money does not stop a flying wheel.' },
          why: { taylor: 'Taylor assumes money makes up for anything. Maslow would say safety comes first.' } },
        { id: 'poster', label: 'Put up a "Safety first!" poster', term: 'Doing nothing', fx: { M: -1 }, fun: 'The poster falls off the wall.',
          bad: 'A poster changes nothing. Safety is a basic need and a hygiene factor; this ignores both.' },
      ],
      debrief: 'Maslow puts safety near the bottom of the hierarchy: until people feel safe, higher rewards do not work. Herzberg lists working conditions as a hygiene factor.',
    },
    TQ: {
      title: 'Who made the sale?', hire: 'tuan',
      scene: 'A colleague claims the commission on a deal Tuan closed.',
      terms: ['Equity theory', 'Commission'],
      options: [
        { id: 'check', label: 'Check the records and pay whoever made the sale', term: 'Fairness', fx: { M: 1 },
          why: { equity: 'He compares what he put in with what he gets. Paying the right person keeps it fair.', herzberg: 'Fair pay is a hygiene factor.' } },
        { id: 'split', label: 'Split it 50/50 to keep the peace', term: 'Unfair split', fx: { M: -1, W: 1 },
          bad: 'He did all the work and gets half the reward. Equity theory predicts he will put in less.' },
        { id: 'pool', label: 'Switch the team to a shared bonus pool', term: 'Team reward', fx: { M: -1, msg: 'Tuan wants to win, not share.' },
          why: { maslow: 'Shared rewards build belonging, a social need. But Tuan is not driven by belonging.' } },
        { id: 'ignore', label: 'Tell them to sort it out themselves', term: 'Ignoring the problem', fx: { W: 1 },
          bad: 'An unfair reward left unfixed demotivates. No theory backs ignoring it.' },
      ],
      debrief: 'Commission ties pay to sales, so who gets credit matters a lot. Equity theory explains why an unfair split hits motivation hard.',
    },
    TP: {
      title: 'Top of the leaderboard', hire: 'tuan',
      scene: 'Tuan has been top seller three months running. He says he wants more than money.',
      terms: ['McClelland', 'Maslow'],
      options: [
        { id: 'lead', label: 'Make him team leader for three junior reps', term: 'Promotion', fx: { M: 2 },
          why: { mcclelland: 'Tuan is driven by power: influence over others feeds it.', maslow: 'Status meets esteem needs.', herzberg: 'Responsibility and advancement are motivators.' } },
        { id: 'board', label: 'Put his name in lights on a sales leaderboard', term: 'Recognition', fx: { M: 1 }, fun: 'He photographs it from four angles.',
          why: { herzberg: 'Recognition is a motivator.', maslow: 'Public recognition meets esteem needs.' } },
        { id: 'cash', label: 'Give him a cash bonus', term: 'Bonus', fx: { msg: 'He said he wanted more than money.' },
          why: { taylor: 'Taylor: money motivates. But he just told you it is not enough.' } },
        { id: 'email', label: 'Thank him by email', term: 'Small thanks', fx: {},
          why: { herzberg: 'Recognition is a motivator, but this is a very small one.' } },
      ],
      debrief: 'Once pay is fair, high performers often want status, responsibility or influence. McClelland calls this the need for power.',
    },
    AC: {
      title: 'Crunch time', hire: 'aisha',
      scene: 'The launch is in two weeks. Aisha has worked until midnight for ten days.',
      terms: ['Maslow', 'Hygiene factors'],
      options: [
        { id: 'cut', label: 'Let her decide which features to cut to hit the date', term: 'Empowerment', fx: { M: 2, clearW: true },
          why: { sdt: 'Her call on the scope gives autonomy.', herzberg: 'Responsibility is a motivator.' } },
        { id: 'rest', label: 'Move the launch and send her home on time', term: 'Rest', fx: { M: 1, clearW: true },
          why: { maslow: 'Sleep is a physiological need, the very bottom of the hierarchy.', herzberg: 'Sane hours are a working condition, a hygiene factor.' } },
        { id: 'ot', label: 'Pay double overtime', term: 'Overtime pay', fx: { W: 1, msg: 'Richer and more exhausted.' },
          why: { taylor: 'Taylor: more money for more hours. It does not fix exhaustion.' } },
        { id: 'pizza', label: 'Order pizza for the late nights', term: 'Perk', fx: {}, fun: 'She codes with one hand and eats with the other.',
          bad: 'Free food does not fix exhaustion. No theory says pizza beats sleep.' },
      ],
      debrief: 'Long hours attack the bottom of Maslow\'s hierarchy. Giving people control over how to hit a deadline often works better than paying them to suffer.',
    },
    AS: {
      title: 'Her own idea', hire: 'aisha',
      scene: 'Aisha has an idea for a feature nobody asked for. She lights up when she talks about it.',
      terms: ['Intrinsic motivation', 'Deci and Ryan'],
      options: [
        { id: 'day', label: 'Give her one day a week to build it', term: 'Intrinsic motivation', fx: { M: 2 },
          why: { maslow: 'Creating something of her own is self-actualisation.', sdt: 'Choosing her own project gives autonomy.', herzberg: 'The work itself and growth are motivators.' } },
        { id: 'hack', label: 'Run a company hackathon where everyone pitches ideas', term: 'Hackathon', fx: { M: 1 },
          why: { sdt: 'Autonomy and relatedness together.', mcclelland: 'A competition feeds the need for achievement.', herzberg: 'A chance to achieve and be recognised for ideas: motivators.' } },
        { id: 'prize', label: 'Offer a cash prize if the idea makes money', term: 'Cash prize', fx: {},
          why: { taylor: 'Taylor: money motivates. But she is already motivated from inside; money adds little.' } },
        { id: 'later', label: 'Put it on the list for next year', term: 'Not now', fx: { M: -1 },
          bad: 'Turning down intrinsic motivation wastes it. No theory backs it.' },
      ],
      debrief: 'Intrinsic motivation comes from the work itself. Deci and Ryan found that adding money to work people already love can even reduce their motivation.',
    },
    KN: {
      title: 'Alone on the night shift', hire: 'kofi',
      scene: 'Kofi works the quietest aisles alone, all night. He has started talking to the forklift.',
      terms: ['Maslow', 'Teamwork'],
      options: [
        { id: 'crew', label: 'Put him in a picking team with a shared target', term: 'Teamwork', fx: { M: 2 },
          why: { maslow: 'Belonging is a social need.', sdt: 'Working with others gives relatedness.', mcclelland: 'Kofi is driven by affiliation.' } },
        { id: 'bonus', label: 'Pay a night-shift bonus', term: 'Shift premium', fx: { tag: 1 },
          why: { maslow: 'Extra pay meets security needs, if they are not met yet.', herzberg: 'Pay is a hygiene factor.' } },
        { id: 'pods', label: 'Give him headphones and a podcast subscription', term: 'Perk', fx: {}, fun: 'He is now an expert on Roman plumbing.',
          why: { herzberg: 'Nicer conditions are a hygiene factor. He is still alone.' } },
        { id: 'nothing', label: 'Night shift is night shift', term: 'Ignoring it', fx: { M: -1 },
          bad: 'Isolation ignores belonging needs. No theory backs it.' },
      ],
      debrief: 'People who work alone miss the social side of work. Maslow calls it belonging, Deci and Ryan call it relatedness, McClelland calls it affiliation.',
    },
    KF: {
      title: 'Day shift perks', hire: 'kofi',
      scene: 'Day-shift staff get free lunch in the canteen. The canteen is closed at night.',
      terms: ['Equity theory', 'Fringe payments'],
      options: [
        { id: 'equal', label: 'Give the night shift a meal allowance worth the same', term: 'Fairness', fx: { M: 1, clearW: true },
          why: { equity: 'Same work, same perks: fairness restored.', herzberg: 'Perks are hygiene factors; unequal ones cause dissatisfaction.' } },
        { id: 'swap', label: 'Let night staff swap onto day shifts in turn', term: 'Rotation', fx: (st) => { add(st, 'M', 1); eng(st, 1); },
          why: { equity: 'Sharing out the better shifts balances the rewards.', maslow: 'Predictable hours meet security needs.' } },
        { id: 'explain', label: 'Explain that the canteen cannot open at night', term: 'Explaining', fx: { M: -1 },
          bad: 'The reason may be true, but the unfairness is still there.' },
        { id: 'nothing', label: 'Nobody has complained, so do nothing', term: 'Ignoring it', fx: { W: 1 },
          bad: 'Unfairness that nobody mentions still demotivates.' },
      ],
      debrief: 'Fringe payments are part of the reward package. When one group gets more for the same work, equity theory predicts resentment.',
    },
    RP: {
      title: 'Four days a week', hire: 'rosa',
      scene: 'Rosa asks to work four days a week until she retires.',
      terms: ['Hygiene factors', 'Age discrimination'],
      options: [
        { id: 'yes', label: 'Agree, and plan her week with her', term: 'Flexible working', fx: { M: 2 },
          why: { herzberg: 'Working conditions are a hygiene factor; meeting this removes a big source of dissatisfaction.', sdt: 'Planning her own week gives autonomy.' } },
        { id: 'trial', label: 'Agree to a three-month trial', term: 'Flexible working', fx: { M: 1 },
          why: { herzberg: 'Better working conditions, a hygiene factor.' } },
        { id: 'no', label: 'Refuse: everyone works five days', term: 'Refusal', fx: { M: -1, W: 1 },
          bad: 'A reasonable request turned down with no reason. No theory backs it.' },
        { id: 'retire', label: 'Suggest she retires early instead', term: 'Age discrimination', fx: { M: -1, W: 1, msg: 'Pushing her out because of her age is age discrimination, and it is illegal.' },
          bad: 'This is age discrimination, which is illegal. Age shaped her request; it must not shape how you treat her.' },
      ],
      debrief: 'Flexible working is a working condition (a hygiene factor). People near retirement often want it, and asking is the right move. Pushing someone out because of age is illegal.',
    },
    RK: {
      title: 'Thirty years in her head', hire: 'rosa',
      scene: 'Rosa knows how everything in the office works. Nobody else does.',
      terms: ['Herzberg', 'Mentoring'],
      options: [
        { id: 'mentor', label: 'Ask her to train two colleagues, and credit her publicly', term: 'Mentoring and recognition', fx: { M: 2 },
          why: { herzberg: 'Recognition and responsibility are motivators.', maslow: 'Respect meets esteem needs.', mcclelland: 'Rosa is driven by affiliation, and teaching is social.' } },
        { id: 'video', label: 'Film her doing each task, to find the one best method', term: 'Scientific management', fx: {},
          why: { taylor: 'Taylor: study the job, record the one best method, train everyone in it.' } },
        { id: 'manual', label: 'Ask her to write a manual by Friday', term: 'Extra task', fx: { M: -1, msg: 'A chore, not a reward.' },
          bad: 'An extra chore with no recognition. No theory backs it as motivation.' },
        { id: 'bonus', label: 'Pay a bonus for writing everything down', term: 'Bonus', fx: {},
          why: { taylor: 'Taylor: pay for output.' } },
      ],
      debrief: 'Experienced staff are a knowledge asset. Asking them to teach recognises their value (Herzberg) and suits people driven by affiliation (McClelland).',
    },
    CL: {
      title: 'The red dot', hire: 'cat', hl: true,
      scene: 'A new laser-pointer game is meant to keep Biscuit sharp. The red dot can never be caught.',
      terms: ['Expectancy theory'],
      options: [
        { id: 'mouse', label: 'Swap in a toy mouse Biscuit can actually catch', term: 'Expectancy theory', fx: { M: 2, S: 1 },
          why: { expectancy: 'Effort now leads to success, so expectancy is no longer zero.', sdt: 'Catching things builds competence.' } },
        { id: 'treat', label: 'Give a treat after every session, caught or not', term: 'Reward', fx: { M: 1 },
          why: { taylor: 'Taylor: reward the work done.' } },
        { id: 'faster', label: 'Make the dot faster to keep it challenging', term: 'Harder target', fx: { M: -1 }, fun: 'Biscuit runs into the filing cabinet.',
          bad: 'If effort can never succeed, expectancy theory says motivation falls to zero. Faster makes it worse.' },
        { id: 'stop', label: 'Stop the game', term: 'Stop', fx: {},
          bad: 'Nothing gained, nothing learned. No theory backs it.' },
      ],
      debrief: 'Expectancy theory in one cat: if effort never leads to the result, nobody keeps trying.',
    },
    CR: {
      title: 'Nobody noticed', hire: 'cat',
      scene: "Biscuit's mouse count is up 40% this month. Nobody has said a word. Biscuit has started leaving mice on the manager's chair.",
      terms: ['Herzberg', 'Maslow'],
      options: [
        { id: 'wall', label: "Put Biscuit's photo on the Employee of the Month wall", term: 'Recognition', fx: { M: 2 }, fun: 'Biscuit sits under the photo all day, to make sure people see it.',
          why: { herzberg: 'Recognition is a motivator.', maslow: 'Respect meets esteem needs.' } },
        { id: 'boss', label: 'Put Biscuit in charge of the kitten\'s training', term: 'Responsibility', fx: { M: 2 },
          why: { mcclelland: 'Biscuit is driven by power.', herzberg: 'Responsibility is a motivator.' } },
        { id: 'tuna', label: 'An extra tin of tuna', term: 'Bonus', fx: { M: 1 },
          why: { taylor: 'Taylor: reward output with pay. Tuna is Biscuit\'s pay.' } },
        { id: 'chair', label: 'Move the manager\'s chair', term: 'Ignoring it', fx: { M: -1 }, fun: 'The mice follow the chair.',
          bad: 'It ignores the real message: Biscuit wants to be noticed.' },
      ],
      debrief: 'Recognition is the cheapest motivator there is, and its absence is very noticeable.',
    },
  });

  // "Because" reasons for the original hubs
  const WHY = {
    H6: {
      tm: { taylor: 'Breaking the job into steps and setting a standard is scientific management.' },
      monitor: { taylor: 'Close supervision and pay per unit are Taylor\'s methods.' },
      goal: { sdt: 'Leaving them to it gives autonomy.', herzberg: 'Responsibility is a motivator.' },
      raise: { taylor: 'Taylor: money is the motivator.' },
    },
    H7: {
      enrich: { herzberg: 'More responsible, challenging work is a motivator (vertical loading).', maslow: 'A bigger role meets esteem needs.', mcclelland: 'A harder job feeds the need for achievement.' },
      enlarge: '!More of the same work does not motivate. Herzberg called this horizontal loading.',
      rotate: { sdt: 'Learning new jobs builds competence.', maslow: 'New skills and variety support growth (self-actualisation).' },
      empower: { sdt: 'Choosing how to work gives autonomy.', herzberg: 'Responsibility is a motivator.', maslow: 'Control over your work supports self-actualisation.' },
      purpose: { maslow: 'Meaningful work supports self-actualisation.', sdt: 'Seeing who you help builds relatedness.' },
      fringe: '!Perks are hygiene factors. They stop complaints but do not cure boredom.',
    },
    H8: {
      match: { taylor: 'Taylor: money is what keeps workers.', herzberg: 'Pay below the market is a hygiene problem.', maslow: 'Pay meets security needs.' },
      shares: { maslow: 'A stake in the firm meets esteem needs.' },
      growth: { maslow: 'Growth and challenge are self-actualisation.', sdt: 'Learning builds competence.', herzberg: 'Growth is a motivator.' },
      prp: { expectancy: 'A clear link between performance and reward raises instrumentality.', taylor: 'Taylor links pay to output.' },
      nomatch: '!Doing nothing about a pay gap ignores pay as a hygiene factor and a security need.',
    },
    H9: {
      secure: { maslow: 'Guaranteed hours and pay meet safety and security needs.', herzberg: 'Job security and pay are hygiene factors.' },
      belong: { maslow: 'A team and a buddy meet social needs.', sdt: 'They build relatedness.' },
      esteem: { maslow: 'Recognition and status meet esteem needs.', herzberg: 'Recognition is a motivator.' },
      grow: { maslow: 'Their own project supports self-actualisation.', sdt: 'Choosing it gives autonomy.' },
      life: '!Ignoring a life event ignores the need it creates. No theory backs it.',
    },
    H10: {
      shared: { maslow: 'Shared goals build belonging.', sdt: 'Working together builds relatedness.', mcclelland: 'Feeds the need for affiliation.' },
      mentor: { sdt: 'A mentor builds relatedness and competence.', maslow: 'Meets belonging needs.' },
      prize: { herzberg: 'Recognition is a motivator.', mcclelland: 'A contest feeds the need for achievement.' },
      desk: '!Isolating someone in a tense team ignores belonging. No theory recommends it.',
      ignore: '!Relationships at work are a hygiene factor. Ignoring the tension leaves the dissatisfaction.',
    },
    H11: {
      indiv: { expectancy: 'A personal target with a reward raises instrumentality.', taylor: 'Taylor: pay for individual output.' },
      team: { maslow: 'A team reward builds belonging.', expectancy: 'A clear target and reward for the team.' },
      profit: { maslow: 'Everyone sharing the success builds belonging.' },
      none: '!Success with no reward ignores recognition and pay. No theory backs it.',
    },
    H14: {
      car: { maslow: 'Perks meet security needs, if those are not met yet.', herzberg: 'Perks are hygiene factors.' },
      gym: { maslow: 'Perks meet basic needs, if those are not met yet.', herzberg: 'Perks are hygiene factors.' },
      health: { maslow: 'Health cover meets safety needs.', herzberg: 'Perks are hygiene factors.' },
      learn: { maslow: 'Learning supports self-actualisation.', sdt: 'Learning builds competence.', herzberg: 'Growth is a motivator.' },
    },
    H15: {
      profit: { maslow: 'Everyone sharing the success builds belonging.' },
      prp: { expectancy: 'Rewarding their own results links performance to reward.', taylor: 'Taylor: pay for output.' },
      shares: { maslow: 'Ownership meets esteem needs.' },
      gift: { maslow: 'A treat meets basic needs, if they are not met yet.' },
      promote: { maslow: 'A new role supports self-actualisation.', herzberg: 'Responsibility and advancement are motivators.', mcclelland: 'Teaching others feeds affiliation or power.' },
      speech: { herzberg: 'Recognition is a motivator, but a speech alone is small.' },
    },
  };
  for (const [hubId, opts] of Object.entries(WHY)) {
    for (const [optId, w] of Object.entries(opts)) {
      const o = HUBS[hubId].options.find((x) => x.id === optId);
      if (typeof w === 'string') o.bad = w.slice(1); else o.why = w;
    }
  }

  // ---------- job-specific scenes and option wording ----------
  // Merged into HUBS below. Same choices and effects for everyone; only the words fit each job.
  // Labels at name-it hubs (H2, H7, H11, H13) must describe the scheme without naming it.
  const JOBS = {
    H1: {
      scene: {
        maya: 'Monday, 7:00. Maya arrives at the bike factory. The line is already running, and it is loud.',
        tuan: 'Monday, 8:30. Tuan arrives in a sharp suit, already thinking about his sales target.',
        aisha: 'Monday, 9:45. Aisha arrives at the startup. Nobody has set up her laptop.',
        kofi: 'Monday, 10pm. Kofi starts his first night shift in a warehouse the size of three football pitches.',
        rosa: 'Monday, 8:00. Rosa arrives at the logistics office with her own stapler. It is a good stapler.',
      },
      labels: {
        induct: {
          maya: 'Run a full induction day: tour of the line, safety gear, meet the team',
          tuan: 'Run a full induction day: the product range, the customer database, meet the sales team',
          aisha: 'Run a full induction day: laptop set-up, a tour of the code, meet the team',
          kofi: 'Run a full induction: forklift safety, the scanner, the aisle layout, meet the night crew',
          rosa: 'Run a full induction day: the systems, the policies, who does what',
        },
        buddy: {
          maya: 'Pair her with an experienced line worker for the day',
          tuan: 'Let him shadow the top sales rep on calls for the day',
          aisha: 'Pair her with the lead developer for the day',
          kofi: 'Pair him with a picker who knows every aisle',
          rosa: 'Pair her with the office manager for the day',
        },
      },
    },
    H2: {
      scene: {
        maya: 'Offer letter time. Bikes come off the line one at a time, so her output is easy to count. The pay must suit the work.',
        tuan: 'Offer letter time. His sales are easy to measure, but some months are much slower than others. The pay must suit the work.',
        aisha: 'Offer letter time. Her work is creative and hard to count: one bug can take a week. The pay must suit the work.',
        kofi: 'Offer letter time. Every pick is scanned, so his output is easy to count. He has two teenagers and rent to pay. The pay must suit the work.',
        rosa: 'Offer letter time. Her work is steady and hard to count: emails, bookings, people. The pay must suit the work.',
      },
    },
    H4: {
      scene: {
        maya: "Maya's bikes keep failing the brake check. How will you train her?",
        tuan: "Tuan's product demos keep going wrong in front of customers. How will you train him?",
        aisha: "Aisha's code keeps breaking the app. How will you train her?",
        kofi: 'Kofi keeps picking the wrong items, and the scanner beeps at him all night. How will you train him?',
        rosa: "Rosa's bookings keep clashing. How will you train her?",
      },
    },
    H6: {
      scene: {
        maya: 'The line makes 40 bikes a day. The target is 50. How will you raise output?',
        tuan: 'Sales are 20% below target this quarter. How will you raise them?',
        aisha: 'The new feature is three weeks late. How will you speed things up?',
        kofi: 'Picks per hour are below the warehouse target. How will you raise them?',
        rosa: "Bookings are piling up in Rosa's inbox. How will you clear them faster?",
      },
      labels: {
        tm: {
          maya: 'Time-and-motion study: break wheel fitting into steps, train the best method, set a bikes-per-hour standard',
          tuan: 'Time-and-motion study: script every sales call step by step and set a calls-per-hour standard',
          aisha: 'Time-and-motion study: break coding into timed steps and set a lines-per-hour standard',
          kofi: 'Time-and-motion study: map the fastest route through the aisles, train it, set a picks-per-hour standard',
          rosa: 'Time-and-motion study: break each booking into steps, train the best method, set a bookings-per-hour standard',
        },
        monitor: {
          maya: 'Watch the line closely and pay a bonus for every extra bike',
          tuan: 'Listen in on every call and pay a bonus for every extra call made',
          aisha: 'Track her keystrokes and pay a bonus for every extra line of code',
          kofi: 'Track every scan and pay a bonus for every extra pick',
          rosa: 'Check her screen every hour and pay a bonus for every extra booking',
        },
      },
    },
    H7: {
      scene: {
        maya: 'Fit a wheel. Fit a wheel. Fit a wheel. Three months in, Maya is restless.',
        tuan: 'Same pitch, same clients, every day. Three months in, Tuan is restless.',
        aisha: 'Another login screen. Three months in, Aisha is restless.',
        kofi: 'Aisle 14, aisle 15, aisle 14 again. Three months in, Kofi is restless.',
        rosa: 'Same bookings, same forms, every day. Three months in, Rosa is restless.',
      },
      labels: {
        enlarge: {
          maya: 'Add one more task at the same level of difficulty: she also fits the bells',
          tuan: 'Add one more task at the same level of difficulty: he also answers the general enquiries line',
          aisha: 'Add one more task at the same level of difficulty: she also fixes the office printer',
          kofi: 'Add one more task at the same level of difficulty: he also sweeps the aisles',
          rosa: 'Add one more task at the same level of difficulty: she also orders the stationery',
        },
        rotate: {
          maya: 'Move her through different jobs: a month each on frames, wheels and paint',
          tuan: 'Move him through different teams: a month each in marketing, customer support and sales',
          aisha: 'Move her through different teams: a month each in design, testing and support',
          kofi: 'Move him round the warehouse: a month each in goods in, picking and dispatch',
          rosa: 'Move her through different departments: a month each in bookings, accounts and customer service',
        },
        empower: {
          maya: 'Let her choose how to set up her own workstation and tools',
          tuan: 'Let him choose which clients to chase and how',
          aisha: 'Let her choose her own tools and how she builds',
          kofi: 'Let him plan his own pick routes',
          rosa: 'Let her redesign how the office runs',
        },
        purpose: {
          maya: 'Show her a video of children learning to ride on her bikes',
          tuan: 'Show him the small businesses that run on the gadgets he sells',
          aisha: 'Show her the 10,000 people who use her app every day',
          kofi: 'Show him the hospital that got its supplies on time because of his night shift',
          rosa: 'Show her how her bookings get 200 trucks home on time every week',
        },
      },
    },
    H8: {
      scene: {
        maya: 'A rival bike maker across town has offered Maya more money. The answer is due Friday.',
        tuan: 'A rival distributor has offered Tuan a bigger base salary and a better car. The answer is due Friday.',
        aisha: 'A big tech company has offered Aisha a lot more money. The answer is due Friday.',
        kofi: 'A rival warehouse has offered Kofi day shifts and more money. The answer is due Friday.',
        rosa: 'A rival firm has offered Rosa more money and a shorter commute. The answer is due Friday.',
      },
    },
    H10: {
      scene: {
        maya: 'A new supervisor reorganises the line. The team is tense, and Maya is caught in the middle.',
        tuan: 'A star rep joins from a rival and grabs the best clients. The sales team is tense, and Tuan is caught in the middle.',
        aisha: 'Two new developers join and argue about everything. Aisha is caught in the middle.',
        kofi: 'The night crew has split into old hands and new temps. Kofi is caught in the middle.',
        rosa: 'The office merges with another branch: new faces, new desks. Rosa is caught in the middle.',
      },
    },
    H11: {
      scene: {
        maya: 'The factory made a record 1,200 bikes this month. You want to share the success.',
        tuan: 'Sales are up 30%. You want to share the success.',
        aisha: 'The app has passed 100,000 downloads. You want to share the success.',
        kofi: 'The warehouse hit 99.9% picking accuracy this month. You want to share the success.',
        rosa: 'The office has cleared its booking backlog. You want to share the success.',
        cat: 'The warehouse went a whole month with no nibbled cheese. You want to share the success.',
      },
    },
    H15: {
      scene: {
        maya: 'A record year for the factory, and no bikes came back with faulty brakes. Share the success as you wish.',
        tuan: "Tuan closed the biggest deal in the company's history. Share the success as you wish.",
        aisha: 'The app won a design award. Share the success as you wish.',
        kofi: 'The warehouse went the whole year without an accident. Share the success as you wish.',
        rosa: "Rosa's new booking system saved the firm thousands. Share the success as you wish.",
        cat: 'Zero mice in the warehouse all year. The cheese is untouched. Share the success as you wish.',
      },
      labels: {
        promote: {
          maya: 'Promote her to train new line workers, with a new title',
          tuan: 'Promote him to coach the junior sales reps, with a new title',
          aisha: 'Promote her to mentor the junior developers, with a new title',
          kofi: 'Promote him to night shift trainer, with a new title',
          rosa: 'Promote her to train every new office starter, with a new title',
        },
      },
    },
  };
  for (const [hubId, j] of Object.entries(JOBS)) {
    const h = HUBS[hubId];
    if (j.scene) h.sceneFor = Object.assign({}, j.scene, h.sceneFor);
    for (const [optId, ls] of Object.entries(j.labels || {})) {
      const o = h.options.find((x) => x.id === optId);
      o.labels = Object.assign({}, ls, o.labels);
    }
  }
  for (const [id, h] of Object.entries(HUBS)) h.id = id;

  // ---------- pop quiz ----------
  // After every third decision (five in a full game). Questions are picked to fit the steps just played.
  // A quiz can also ask the player to name a scheme they just chose (the hub's nameIt).
  const QUIZ = [
    { id: 'maslow-first', hubs: ['H1', 'H2', 'H8'], ask: "In Maslow's hierarchy, which needs must be met first?",
      choices: ['Physiological and safety needs', 'Esteem needs', 'Self-actualisation', 'Social needs'],
      why: 'Basic needs (food, shelter, a safe income) come first. Higher needs only motivate once these are met.' },
    { id: 'maslow-top', hubs: ['H7', 'H8', 'H15', 'H14'], ask: 'Giving a worker a challenging project so they can grow meets which Maslow need?',
      choices: ['Self-actualisation', 'Safety', 'Physiological', 'Social'],
      why: 'Growth, challenge and reaching your potential are self-actualisation, the top of the hierarchy.' },
    { id: 'maslow-down', hubs: ['H9'], ask: (st) => st.hire.name + "'s needs changed after a life event. What does Maslow's theory say about this?",
      choices: ['A threatened lower need becomes the priority again', 'Needs only ever move up', 'Money replaces all other needs', 'Needs never change once met'],
      why: 'If a lower need is threatened (rent goes up, a friend leaves), it returns to the top, so the right reward changes too.' },
    { id: 'maslow-social', hubs: ['H10', 'H9'], ask: 'Teamwork and a buddy mainly meet which Maslow need?',
      choices: ['Social (love and belonging)', 'Physiological', 'Self-actualisation', 'Safety'],
      why: 'Belonging to a group is a social need, the level above safety.' },
    { id: 'herz-hygiene', hubs: ['H5', 'H14', 'H8'], ask: 'Which of these is a Herzberg hygiene factor?',
      choices: ['Working conditions', 'Recognition', 'Responsibility', 'Achievement'],
      why: 'Hygiene factors are pay, conditions, security and relationships. Missing ones cause dissatisfaction.' },
    { id: 'herz-motivator', hubs: ['H5', 'H7', 'H9'], ask: 'Which of these is a Herzberg motivator?',
      choices: ['Recognition for good work', 'Pay', 'Job security', 'A friendly supervisor'],
      why: 'Motivators come from the work itself: recognition, responsibility, achievement, growth.' },
    { id: 'herz-fix', hubs: ['H5', 'H14'], ask: 'According to Herzberg, what happens when you fix the hygiene factors?',
      choices: ['Dissatisfaction falls, but motivation does not rise much', 'Motivation rises a lot', 'Workers become self-actualised', 'Nothing changes at all'],
      why: 'Fixing hygiene factors removes complaints. To motivate, you need motivators.' },
    { id: 'taylor-fit', hubs: ['H2', 'H6'], ask: "Taylor's scientific management fits best with which job?",
      choices: ['Repetitive work with countable output', 'Creative app design', 'Leading a team', 'Writing adverts'],
      why: 'Breaking work into steps and paying per unit only works when the work is repetitive and easy to count.' },
    { id: 'taylor-money', hubs: ['H6', 'H2'], ask: 'What did Taylor believe motivates workers?',
      choices: ['Money', 'Recognition', 'Belonging', 'Self-actualisation'],
      why: 'Taylor saw workers as economic: pay them per unit and they will work harder.' },
    { id: 'taylor-not', hubs: ['H6'], ask: 'Which of these is NOT part of scientific management?',
      choices: ['Letting workers choose their own methods', 'Time-and-motion study', 'Piece rate pay', 'Close supervision'],
      why: 'Taylor wanted one best method, set by managers. Choosing your own method is empowerment.' },
    { id: 'intrinsic', hubs: ['H7', 'H9', 'H15'], ask: (st) => st.hire.name + ' works harder because the work itself is interesting. This is...',
      choices: ['Intrinsic motivation', 'Extrinsic motivation', 'A hygiene factor', 'Piece rate'],
      why: 'Intrinsic motivation comes from the work itself. Extrinsic comes from outside rewards like pay.' },
    { id: 'extrinsic', hubs: ['H14', 'H8', 'H11'], ask: 'A company car is an example of...',
      choices: ['An extrinsic reward', 'An intrinsic reward', 'Job enrichment', 'Empowerment'],
      why: 'Perks and pay are outside rewards: extrinsic. A company car is a fringe payment.' },
    { id: 'prp-risk', hubs: ['H11'], ask: 'A disadvantage of individual performance-related pay is that...',
      choices: ['Workers may game the target or stop helping each other', 'It cannot be paid to individuals', 'It is paid whatever the worker does', 'It always lowers output'],
      why: 'PRP rewards a number, so people may chase the number (gaming) and compete instead of cooperating.' },
    { id: 'profit-pay', hubs: ['H11', 'H15'], ask: 'Profit-related pay is...',
      choices: ['A share of company profit paid to all staff', 'Pay for each unit produced', 'A percentage of your own sales', 'A bonus for hitting your own target'],
      why: 'Everyone shares in profit, whatever each person did. It builds loyalty, not individual effort.' },
    { id: 'train-off', hubs: ['H4', 'H12', 'H1'], ask: 'Which of these is off-the-job training?',
      choices: ['Vestibule training', 'Coaching', 'Mentoring', 'Induction'],
      why: 'Vestibule training uses a practice area away from the real job. The others happen at work.' },
    { id: 'train-risk', hubs: ['H12', 'H4'], ask: 'A risk to the business of training workers is that...',
      choices: ['They may leave for a rival with their new skills', 'Productivity falls forever', 'Workers become less flexible', 'It removes the need for pay'],
      why: 'Training costs money and time, and a rival may get the benefit if the worker leaves.' },
    { id: 'age', hubs: ['H12', 'H13', 'H9'], ask: (st) => st.hire.name + ' is ' + String(st.hire.age).split(' ')[0] + '. Which of these is legal and sensible?',
      choices: ['Ask what they want from rewards and training', 'Skip training them because of their age', 'Pay them less because of their age', 'Only promote people under 40'],
      why: 'Treating someone worse because of their age is age discrimination, and it is illegal. But age can shape what people want (a pension, flexible hours, passing on skills), so ask rather than assume.' },
    { id: 'shares-why', hubs: ['H13', 'H2'], ask: 'Why might employee share ownership raise motivation?',
      choices: ['Workers gain when the company does well', 'It pays cash every month', 'It removes all risk', 'It is a hygiene factor'],
      why: 'Owning a stake links the worker to the firm\'s success. But shares can lose value and pay nothing today.' },
    { id: 'enrich', hubs: ['H7', 'H12'], ask: 'Giving a worker more complex and responsible tasks is called...',
      choices: ['Job enrichment', 'Job enlargement', 'Job rotation', 'Piece rate'],
      why: 'Enrichment is deeper work. Enlargement is more tasks at the same level. Rotation is moving between jobs.' },
  ];

  QUIZ.push(
    { id: 'mcclelland', hl: true, hubs: ['MC', 'TP', 'KN', 'RK', 'CR'], ask: "McClelland's three acquired needs are...",
      choices: ['Achievement, affiliation and power', 'Safety, social and esteem', 'Autonomy, competence and relatedness', 'Expectancy, instrumentality and valence'],
      why: 'McClelland: achievement (challenge, feedback), affiliation (relationships) and power (influence). One usually dominates.' },
    { id: 'sdt', hl: true, hubs: ['SD', 'AS', 'AC', 'AP'], ask: 'Deci and Ryan say people are motivated from inside when they have...',
      choices: ['Autonomy, competence and relatedness', 'Achievement, affiliation and power', 'Pay, conditions and security', 'Expectancy, instrumentality and valence'],
      why: 'Self-determination theory: autonomy (choice), competence (feeling capable) and relatedness (connection).' },
    { id: 'equity', hl: true, hubs: ['EQ', 'TQ', 'KF'], ask: 'In equity theory, a worker who feels underpaid compared with a colleague will probably...',
      choices: ['Put in less effort, or leave', 'Work harder to earn more', 'Feel more motivated', 'Not notice'],
      why: 'Adams: people restore fairness by putting in less, asking for more, or leaving.' },
    { id: 'expectancy', hl: true, hubs: ['EX', 'CL', 'H11'], ask: "In Vroom's expectancy theory, 'valence' means...",
      choices: ['How much the person wants the reward', 'Whether effort can reach the target', 'Whether hitting the target brings the reward', 'How fair the pay is'],
      why: 'Valence is how much the reward is wanted. Expectancy: can effort reach the target? Instrumentality: will the target bring the reward?' },
    { id: 'appraisal', hl: true, hubs: ['AP'], ask: 'Feedback given regularly through the year to help someone improve is...',
      choices: ['Formative appraisal', 'Summative appraisal', '360-degree feedback', 'Self-appraisal'],
      why: 'Formative appraisal is ongoing and developmental. Summative judges the year, often for pay.' },
  );
  // The hire-only scenarios share the SL questions that fit them
  const EXTRA_TAGS = { 'taylor-fit': ['MQ'], 'maslow-first': ['MS', 'AC'], 'herz-hygiene': ['TQ', 'KF', 'RP', 'MS'], 'herz-motivator': ['TP', 'RK', 'CR', 'MQ'],
    'intrinsic': ['AS'], 'maslow-social': ['KN'], 'age': ['RP'] };
  for (const [id, hubs] of Object.entries(EXTRA_TAGS)) QUIZ.find((q) => q.id === id).hubs.push(...hubs);

  function makeQuiz(st) {
    const recent = st.log.slice(-3).reverse();
    const lastWasName = st.quizIds.length && st.quizIds[st.quizIds.length - 1].startsWith('name-');
    const cands = [];
    for (const e of recent) {
      const hub = HUBS[e.hub], ans = hub.nameIt && hub.nameIt.map[e.opt];
      const nq = ans && { id: 'name-' + e.hub, ask: 'At "' + hub.title + '" you chose: ' + e.choice + '. ' + hub.nameIt.ask,
        choices: [ans].concat(hub.nameIt.pool.filter((p) => p !== ans).slice(0, 3)), why: ans + ': ' + (e.choice.endsWith('.') ? e.choice : e.choice + '.') };
      const tq = QUIZ.filter((q) => q.hubs.includes(e.hub) && (st.level === 'HL' || !q.hl));
      if (lastWasName) cands.push(...tq, nq); else cands.push(nq, ...tq);
    }
    // Older hires, or anyone who just discriminated on age, get the age question once it fits
    const ageQ = QUIZ.find((q) => q.id === 'age');
    if ((+st.hire.age >= 40 || recent.some((e) => e.opt === 'skip')) && recent.some((e) => ageQ.hubs.includes(e.hub))) cands.unshift(ageQ);
    const q = cands.concat(QUIZ.filter((c) => st.level === 'HL' || !c.hl)).find((c) => c && !st.quizIds.includes(c.id));
    return { id: q.id, ask: typeof q.ask === 'function' ? q.ask(st) : q.ask, choices: q.choices.slice(), answer: q.choices[0], why: q.why, n: st.quizIds.length + 1 };
  }

  function market(st) {
    say(st, "Then the company's value drops 30% this quarter.");
    if (st.need === 1) add(st, 'W', 1); else say(st, 'They hold on to the shares.');
  }

  // ---------- flow ----------
  // Every action is recorded in st.acts, so a saved game (hire, seed, level, actions) can be replayed and rescored.
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function shuffle(arr, r) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
  const SL_POOL = ['H6', 'H7', 'H8', 'H9', 'H10', 'H11', 'H12', 'H13', 'H14'];
  const HL_POOL = ['EQ', 'EX', 'SD', 'MC', 'AP'];
  // Day one and the contract first, year-end last. Ten scenarios in between, shuffled:
  // the hire's own ones, then (HL) three HL scenarios and the rest from the shared pool.
  function makeDeck(hire, seed, hl) {
    const r = rng(seed);
    const pick = (pool, n) => shuffle(pool.slice(), r).slice(0, n);
    const own = Object.keys(HUBS).filter((k) => HUBS[k].hire === hire.id && (hl || !HUBS[k].hl));
    const theory = hl ? pick(HL_POOL, 3) : [];
    const mid = own.concat(theory, pick(SL_POOL, 10 - own.length - theory.length));
    return ['H1', 'H2'].concat(shuffle(mid, r), ['H15']);
  }

  function newState(hireId, seed, level) {
    const hire = HIRES.find((h) => h.id === hireId);
    if (!hire) throw new Error('no hire');
    seed = Number.isInteger(seed) ? seed : Math.floor(Math.random() * 1e9);
    level = level === 'SL' ? 'SL' : 'HL';
    return { hire, seed, level, deck: makeDeck(hire, seed, level === 'HL'), step: 0, M: hire.M, S: hire.S, W: 0, need: hire.need, flags: {}, hub: 'H1', removed: {},
      asked: 0, log: [], msgs: [], dead: null, ending: null, decisions: 0, reached: 1, acts: [], pendingQ: null, sorted: false,
      quizIds: [], quizRight: 0, matched: 0, early: 0, best: 0, whyRight: 0, whyWrong: 0 };
  }

  const label = (o, st) => (o.labels && o.labels[st.hire.id]) || (typeof o.label === 'function' ? o.label(st) : o.label);
  const scene = (h, st) => {
    const base = (h.sceneFor && h.sceneFor[st.hire.id]) || (typeof h.scene === 'function' ? h.scene(st) : h.scene);
    return h.sceneFun && h.sceneFun[st.hire.id] ? base + ' ' + h.sceneFun[st.hire.id] : base;
  };
  const funFor = (o, st) => (typeof o.fun === 'string' ? o.fun : o.fun && o.fun[st.hire.id]) || null;
  const needWords = (st) => (st.hire.needWords || NEED_WORDS)[st.need];
  const optionsAt = (st) => (HUBS[st.hub].options || []).filter((o) => !st.removed[st.hub + o.id] && (!o.only || o.only.includes(st.hire.id)));
  // Theories the player may give as a reason at this level
  const theoriesFor = (st) => Object.keys(THEORIES).filter((k) => st.level === 'HL' || !THEORIES[k].hl);
  // Does this hub ask "because which theory?"
  const asksWhy = (hub) => !!(hub.options && hub.options.some((o) => o.why || o.bad));
  // The theories that back an option, at this level
  const fitsFor = (o, st) => Object.keys(o.why || {}).filter((k) => st.level === 'HL' || !THEORIES[k].hl);

  function clone(st) {
    return Object.assign({}, st, { flags: Object.assign({}, st.flags), removed: Object.assign({}, st.removed), log: [], msgs: [], acts: [] });
  }
  // How good a position is, used to suggest a better option in the debrief
  function value(s) { return s.dead ? -100 : s.M * 2 + s.S - s.W * 3 + s.need * 0.5; }
  function tryOpt(st, o) { const c = clone(st); fx(c, o.fx); check(c); return value(c); }

  function arrive(st, id) {
    st.hub = id; st.asked = 0;
    if (id === 'END') { st.reached = st.deck.length + 1; st.ending = ending(st); return; }
    st.reached = st.step + 1;
    if (HUBS[id].enter) HUBS[id].enter(st);
  }
  // Next step in the deck, unless skills or motivation have run low (then a remedial step comes first)
  function advance(st) {
    st.sorted = false;
    if (st.flags.CommissionOnly) return die(st, 'quit', 'A slow month on commission only, and the rent is due.');
    if (st.S <= 1) return arrive(st, 'H4');
    if (st.M <= 1 && !st.flags.Audited) { st.flags.Audited = 1; return arrive(st, 'H5'); }
    st.step++;
    arrive(st, st.step < st.deck.length ? st.deck[st.step] : 'END');
  }

  const over = (st) => !!st.dead || st.hub === 'END';
  function guard(ok) { if (!ok) throw new Error('bad move'); }

  // Choose an option, and (where the hub asks) the theory behind it. Returns a pending quiz or null.
  function choose(st, optId, theory) {
    const hub = HUBS[st.hub];
    guard(!over(st) && !st.pendingQ && (!hub.sort || st.sorted));
    const opts = optionsAt(st);
    const opt = opts.find((o) => o.id === optId);
    guard(opt);
    const why = asksWhy(hub);
    guard(why ? theory === 'none' || theoriesFor(st).includes(theory) : !theory);
    st.acts.push('c' + optId + (why ? ':' + theory : ''));
    const vals = opts.map((o) => ({ o, v: tryOpt(st, o) }));
    const before = { M: st.M, S: st.S, W: st.W }, was = tally(st);
    st.msgs = [];
    fx(st, opt.fx);
    check(st);
    st.decisions++;
    const mine = value(st);
    const best = vals.reduce((a, b) => (b.v > a.v ? b : a));
    const better = best.v > mine + 0.01;
    if (!better) st.best++;
    let reason = null;
    if (why) {
      const fits = fitsFor(opt, st);
      const ok = theory === 'none' ? !fits.length : fits.includes(theory);
      if (ok) st.whyRight++; else st.whyWrong++;
      reason = { pick: theory, ok, fits: fits.map((k) => ({ id: k, name: THEORIES[k].name, text: opt.why[k] })), bad: fits.length ? null : opt.bad || 'No motivation theory backs this choice.',
        pickSum: theory === 'none' ? null : THEORIES[theory].sum };
    }
    const entry = { hub: hub.id, opt: opt.id, title: hub.title, choice: label(opt, st), term: opt.term, msgs: st.msgs.slice(), fun: funFor(opt, st), reason,
      before, after: { M: st.M, S: st.S, W: st.W }, better: better ? label(best.o, st) : null,
      betterTerm: better ? best.o.term : null, debrief: hub.debrief };
    st.log.push(entry);
    if (!st.dead) {
      if (opt.loop) { st.removed[hub.id + opt.id] = 1; arrive(st, hub.id); }
      else advance(st);
    }
    pointsFor(st, entry, was);
    if (st.dead) return null;
    // A quiz falls due on reaching steps 3, 6, 9 and 12, and at the end, so a full game always has five
    if ([3, 6, 9, 12, st.deck.length + 1].filter((n) => st.reached >= n).length > st.quizIds.length) {
      st.pendingQ = makeQuiz(st);
      st.quizIds.push(st.pendingQ.id);
    }
    return st.pendingQ;
  }

  // Pop quiz answer: right is M+1, wrong is M-1. Returns true if right.
  function answerQuiz(st, pick) {
    const q = st.pendingQ;
    guard(q);
    st.pendingQ = null;
    const right = pick === q.answer;
    st.acts.push(right ? 'n1' : 'n0');
    const before = { M: st.M, S: st.S, W: st.W }, was = tally(st);
    if (right) st.quizRight++;
    add(st, 'M', right ? 1 : -1);
    check(st);
    const entry = { hub: st.hub, title: 'Pop quiz ' + q.n, choice: q.ask, term: q.answer, quiz: { ok: right, answer: q.answer },
      msgs: [], before, after: { M: st.M, S: st.S, W: st.W }, better: right ? null : q.answer, betterTerm: null, debrief: q.why };
    st.log.push(entry);
    if (st.hub === 'END') st.ending = st.dead ? null : ending(st);
    pointsFor(st, entry, was);
    return right;
  }

  // H5 sort check: picks is a set of item ids the player says are hygiene factors
  function sortCheck(st, picks) {
    return sortResult(st, HUBS.H5.sort.items.every((i) => i.hygiene === picks.has(i.id)));
  }
  function sortResult(st, ok) {
    guard(!over(st) && !st.pendingQ && HUBS[st.hub].sort && !st.sorted);
    st.sorted = true;
    st.acts.push(ok ? 's1' : 's0');
    if (!ok) { add(st, 'M', -1); check(st); }
    return ok;
  }

  // Ask them: the second use at one hub gives a warning, and there is no third
  function askThem(st) {
    guard(!over(st) && !st.pendingQ && st.asked < 2);
    st.acts.push('a');
    st.asked++;
    if (st.asked === 2) { add(st, 'W', 1); check(st); }
    return needWords(st);
  }
  // Ask HR: free unless the hub is urgent
  function askHR(st) {
    if (over(st) || st.pendingQ || !HUBS[st.hub].urgent) return false;
    st.acts.push('h');
    add(st, 'W', 1); check(st);
    return true;
  }

  // Rebuild a game from its recorded actions. Returns null if the actions are not a finished, legal game.
  function replay(hireId, seed, level, acts) {
    try {
      guard(Number.isInteger(seed));
      const st = newState(hireId, seed, level);
      for (const a of acts) {
        if (a === 'a') askThem(st);
        else if (a === 'h') guard(askHR(st));
        else if (a === 's1' || a === 's0') sortResult(st, a === 's1');
        else if (a === 'n1' || a === 'n0') answerQuiz(st, a === 'n1' ? st.pendingQ && st.pendingQ.answer : null);
        else if (a[0] === 'c') { const [o, t] = a.slice(1).split(':'); choose(st, o, t); }
        else return null;
      }
      return over(st) && !st.pendingQ ? st : null;
    } catch (e) { return null; }
  }

  // ---------- score ----------
  // Each part rewards a bit of theory: matching rewards to needs (Maslow), choosing well, knowing the terms, keeping the worker.
  const POINTS = [
    { key: 'matched', each: 30, label: 'Reward matched their need right now' },
    { key: 'early', each: -10, label: 'Reward they were not ready for' },
    { key: 'best', each: 10, label: 'Best call (no option would have done better)' },
    { key: 'whyRight', each: 20, label: 'Right reason (theory) for your choice' },
    { key: 'whyWrong', each: 5, label: 'Reason that did not fit (+5 for trying)' },
    { key: 'quizRight', each: 20, label: 'Quiz answer right' },
    { key: 'steps', each: 10, label: 'Steps they stayed' },
  ];
  const ENDING_BONUS = { mentor: 150, loyal: 100, fragile: 50 };
  function tally(st) {
    const t = { matched: st.matched, early: st.early, best: st.best, whyRight: st.whyRight, whyWrong: st.whyWrong, quizRight: st.quizRight, steps: Math.min(st.deck.length, st.reached) };
    t.ending = st.ending ? ENDING_BONUS[st.ending.id] : 0;
    return t;
  }
  function breakdown(st) {
    const t = tally(st);
    const rows = POINTS.map((p) => ({ label: p.label, n: t[p.key], each: p.each, pts: t[p.key] * p.each }));
    if (st.ending) rows.push({ label: 'Ending: ' + st.ending.title, n: 1, each: t.ending, pts: t.ending });
    return rows;
  }
  function score(st) { return breakdown(st).reduce((a, r) => a + r.pts, 0); }
  // What one action earned, and why
  function pointsFor(st, entry, was) {
    const now = tally(st), why = [];
    for (const p of POINTS) {
      const d = now[p.key] - was[p.key];
      if (d) why.push({ pts: d * p.each, label: p.label });
    }
    if (now.ending !== was.ending) why.push({ pts: now.ending - was.ending, label: st.ending ? 'Ending: ' + st.ending.title : 'Ending lost' });
    entry.pts = why.reduce((a, w) => a + w.pts, 0);
    entry.why = why;
  }

  function ending(st) {
    if (st.M >= 8 && st.S >= 5 && st.need >= 3 && st.flags.Promoted && !st.flags.Gaming)
      return { id: 'mentor', title: 'Promoted mentor',
        text: st.hire.id === 'cat'
          ? 'Biscuit is now Head of Mousing. The kitten is terrified and very well trained. You matched each reward to what Biscuit needed at the time, and the work itself became the reward.'
          : 'They now train the next hire. You matched each reward to what they needed at the time, and the work itself became the reward.' };
    if (st.M >= 5 && st.S >= 4) {
      const extra = [];
      if (st.flags.OutputGap) extra.push('But output never reached target.');
      if (st.flags.Gaming) extra.push(st.hire.id === 'cat' ? 'But the neighbours want their mice back.' : 'But customers found them pushy.');
      return { id: 'loyal', title: 'Loyal veteran', text: [st.hire.id === 'cat' ? 'Biscuit stays for years, mostly on the fridge.' : 'They stay for years.'].concat(extra).join(' ') };
    }
    return { id: 'fragile', title: 'Fragile survivor',
      text: st.hire.id === 'cat'
        ? 'Biscuit stays another year, but keeps sitting in the neighbours\' window. Your rewards fixed some problems but missed what really mattered.'
        : 'They stay another year, and they are already reading job ads. Your rewards fixed some problems but missed what really mattered to them.' };
  }

  const Boss = { HIRES, HUBS, DEATHS, QUIZ, newState, optionsAt, label, scene, choose, answerQuiz,
    sortCheck, askThem, askHR, replay, THEORIES, theoriesFor, asksWhy, score, breakdown, POINTS, ENDING_BONUS, over };
  if (typeof module !== 'undefined') module.exports = Boss;
  root.Boss = Boss;
})(typeof window !== 'undefined' ? window : globalThis);
