// Pick a Path: You're the Boss. Game rules only, no DOM.
// Spec: Obsidian vault, AIdeas/Pick a Path The Boss Game.md
(function (root) {
  const HIRES = [
    { id: 'maya', name: 'Maya', age: 24, job: 'Assembly line worker at a bike factory', M: 2, S: 2, need: 1,
      look: { skin: '#e9b98f', hair: '#3a2418', style: 'pony', shirt: '#2f6fb0' } },
    { id: 'tuan', name: 'Tuan', age: 26, job: 'Sales rep for a gadget distributor', M: 3, S: 2, need: 2,
      look: { skin: '#d9a273', hair: '#1c1410', style: 'short', shirt: '#c0392b' } },
    { id: 'linh', name: 'Linh', age: 27, job: 'App developer at a 12-person startup', M: 2, S: 3, need: 3,
      look: { skin: '#f0c7a0', hair: '#24160f', style: 'bob', shirt: '#6a3fa0' } },
    { id: 'nam', name: 'Nam', age: 31, job: 'Warehouse picker on the night shift', M: 2, S: 1, need: 1,
      look: { skin: '#c98f62', hair: '#2a1d14', style: 'cap', shirt: '#e08a1e' } },
    { id: 'hoa', name: 'Hoa', age: 29, job: 'Office administrator at a logistics firm', M: 2, S: 2, need: 2,
      look: { skin: '#eebd96', hair: '#3b2416', style: 'bun', shirt: '#1f8a6a' } },
    { id: 'cat', name: 'Biscuit', age: '4 (32 in cat years)', job: 'Rodent control officer at a cheese warehouse', M: 3, S: 3, need: 1,
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
      if (tag === 1) { add(st, 'M', 1); add(st, 'W', -1); say(st, 'That eased their worries.'); }
      else { add(st, 'M', 2); say(st, 'That really landed.'); }
      st.need = Math.min(4, st.need + 1);
    } else if (tag < st.need) {
      say(st, 'Already sorted for them, so no effect.');
    } else {
      add(st, 'M', -1); say(st, 'Not ready for this.');
    }
  }

  const PER = ['maya', 'tuan', 'linh', 'nam', 'hoa', 'cat'];
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
  const isTaylorJob = (st) => ['maya', 'nam', 'cat'].includes(st.hire.id);

  // ---------- hubs ----------
  // Option fields: label (or labels: {hire: text} overrides), term, fx, fun ({hire: joke} or one joke for all), next, loop.
  const HUBS = {
    H1: {
      title: 'Day One',
      scene: 'Monday, 8:30. Your new hire arrives at the door and looks around.',
      sceneFor: { cat: 'Monday, 8:30. Your new hire arrives through the cat flap and looks around. Then sits down and washes a leg.' },
      terms: ['Induction', 'On-the-job training', 'Mentoring'],
      options: [
        { id: 'induct', label: 'Run a full induction day: tour, safety, systems, meet the team', term: 'Induction', fx: { M: 1, S: 1 }, next: 'H2',
          labels: { cat: 'Run a full induction day: tour of every sunbeam, safety talk (the shredder is not a bed), meet the team' },
          fun: { nam: 'Highlight of the tour: the forklift. Nam names it Kevin.', hoa: "By 10am Hoa knows everyone's name, birthday and coffee order.",
            cat: 'Biscuit sniffs every member of staff and approves of three of them.' } },
        { id: 'buddy', label: 'Pair them with a buddy for the day', term: 'On-the-job training', fx: { S: 1 }, next: 'H2',
          labels: { cat: 'Pair Biscuit with Gerald, the warehouse dog, for the day' },
          fun: { cat: 'Gerald shows Biscuit where the mice live. Gerald has never caught one.' } },
        { id: 'keycard', label: 'Hand over a keycard and say "you\'ll pick it up"', term: 'No induction', fx: { S: -1, M: -1, msg: 'Lost on day one.' }, next: 'H2',
          fun: { maya: 'Maya spends the morning in the supply cupboard. It is a nice cupboard.', linh: 'Nobody tells Linh the wifi password, so she hacks the printer instead.',
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
          fx: { maya: { M: 1, need: 2 }, tuan: {}, linh: { M: 1 }, nam: { M: 1, need: 2 }, hoa: { M: 1 }, cat: { M: 1, need: 2 } },
          fun: { tuan: 'Tuan asks where the leaderboard is.', cat: "Paid monthly, in tuna. Biscuit eats the whole month's pay by 9:05am." } },
        { id: 'time', label: 'Paid for every hour worked', term: 'Time rate wage',
          fx: { maya: { M: 1, need: 2 }, tuan: {}, linh: { M: -1, msg: 'Clock-watching.' }, nam: { M: 1, need: 2 }, hoa: {},
            cat: { M: 1, need: 2, flag: 'OutputGap', msg: 'Paid for time, not for mice.' } },
          fun: { cat: 'Biscuit sleeps 16 hours a day. Payroll pays for every one of them.' } },
        { id: 'piece', label: 'Paid for every unit finished', term: 'Piece rate wage',
          fx: { maya: { M: 2, need: 2, flag: 'Rushing', msg: 'Fast, but rushing.' }, tuan: { M: -1, msg: 'There is no unit to count.' },
            linh: { S: -1, M: -1, W: 1, msg: 'Quality collapses.' }, nam: { M: 2, need: 2, flag: 'Rushing', msg: 'Fast, but rushing.' }, hoa: { M: -1, W: 1 },
            cat: { M: 2, need: 2, flag: 'Rushing', msg: 'Countable output, so it works (Taylor). But rushing.' } },
          fun: { linh: 'Linh ships 400 apps. They are all the same login button.',
            cat: 'One treat per mouse. By lunch there are 14 mice on your desk. Some of them are only half a mouse.' } },
        { id: 'comm', label: 'Only a percentage of what they sell', term: 'Commission',
          fx: { maya: QUIT_RENT, tuan: { M: 1, flag: 'CommissionOnly' }, linh: QUIT_RENT, nam: QUIT_RENT, hoa: { M: -1 },
            cat: { dead: 'quit', why: 'Biscuit tried to sell a mouse to a customer. No sale, no pay, no tuna. Biscuit left through the cat flap forever.' } },
          fun: { maya: 'Maya tries to sell half a bike to the security guard.' } },
        { id: 'salcomm', label: 'A fixed yearly amount plus a percentage of sales', term: 'Salary plus commission',
          fx: { maya: { M: -1 }, tuan: { M: 1 }, linh: { M: -1 }, nam: { M: -1 }, hoa: {}, cat: { M: -1 } },
          fun: { cat: 'A percentage of what sales? Biscuit has never sold anything except guilt.' } },
        { id: 'shares', label: 'A low fixed amount plus shares in the company', term: 'Employee share ownership',
          fx: { maya: { M: -1, W: 1 }, tuan: { M: -1, W: 1 }, linh: { M: 2, need: 4, msg: 'A stake in something new.' },
            nam: { dead: 'quit', why: 'Shares do not pay rent.' }, hoa: {}, cat: { M: -1, W: 1, msg: 'Shares do not fill a food bowl.' } },
          fun: { cat: 'Biscuit eats the share certificate.' } },
      ],
      nameIt: {
        ask: 'How is this pay calculated?',
        map: { salary: 'Salary', time: 'Time rate wage', piece: 'Piece rate wage', comm: 'Commission', salcomm: 'Salary plus commission', shares: 'Employee share ownership' },
        pool: ['Salary', 'Time rate wage', 'Piece rate wage', 'Commission', 'Salary plus commission', 'Employee share ownership'],
      },
      next: 'H3',
      debrief: 'Salary suits work that is hard to measure. Time rate suits work needed during set hours. Piece rate suits repetitive, countable output (Taylor) but risks rushed quality. Commission suits sales but leaves income unstable. Employee share ownership gives a stake in future success but no cash today.',
    },
    H3: {
      title: 'Month-one check',
      scene: 'End of month one. Here is the scorecard.',
      router: true,
      terms: ['Maslow', 'Herzberg hygiene factors', 'Herzberg motivators'],
      route(st) {
        if (st.hire.id === 'tuan' && st.flags.CommissionOnly) { die(st, 'quit', 'A slow month on commission only, and the rent is due.'); return null; }
        if (st.S <= 1) return 'H4';
        if (st.M <= 1) return 'H5';
        return 'H6';
      },
    },
    H4: {
      title: 'Skills gap',
      scene: 'They are struggling with the work, and the numbers show it. How will you train them?',
      terms: ['In-house course', 'Coaching', 'Mentoring', 'Apprenticeship', 'Vestibule training', 'Simulator', 'Lecture or conference'],
      options: [
        { id: 'inhouse', label: 'In-house course run by your own staff', term: 'In-house course', fx: { S: 1 },
          fun: { cat: 'A slideshow on mousing. Biscuit sits on the laptop for all of it.' } },
        { id: 'coach', label: 'Coaching: a supervisor guides them through the task', term: 'Coaching',
          fx: { maya: { S: 1, M: 1 }, tuan: { S: 1 }, linh: { S: 1 }, nam: { S: 1, M: 1 }, hoa: { S: 1 }, cat: { S: 1, M: 1 } },
          fun: { cat: 'A supervisor demonstrates the pounce. Badly. Biscuit looks embarrassed for him.' } },
        { id: 'mentor', label: 'Mentoring: an experienced colleague they can talk to', term: 'Mentoring',
          fx: { maya: { S: 1 }, tuan: { S: 1, M: 1 }, linh: { S: 1, M: 1 }, nam: { S: 1 }, hoa: { S: 1, M: 1 }, cat: { S: 1, M: 1 } },
          fun: { cat: 'Old Tom, the retired warehouse cat, shares his secrets. Mostly about naps.' } },
        { id: 'appr', label: 'Apprenticeship: long training under an expert', term: 'Apprenticeship',
          fx: { maya: { S: 2, M: -1, msg: 'Months of lower output.' }, tuan: { S: 2 }, linh: { S: 2 }, nam: { S: 2, M: -1, msg: 'Months of lower output.' }, hoa: { S: 2 },
            cat: { S: 2, M: -1, msg: 'Two years under a master mouser. The mice multiply while it studies.' } } },
        { id: 'vest', label: 'A practice area copying the workplace', term: 'Vestibule training',
          fx: { maya: { S: 2 }, tuan: { S: 1, msg: 'A role-play room.' }, linh: { msg: 'Nothing to copy.' }, nam: { S: 2 }, hoa: { msg: 'Nothing to copy.' }, cat: { S: 2 } },
          fun: { tuan: 'Tuan sells a stapler to a mannequin. The mannequin buys two.',
            cat: 'A practice warehouse full of wind-up mice. Biscuit destroys every one. That was the point.' } },
        { id: 'sim', label: 'Simulator: equipment copying the real job', term: 'Simulator',
          fx: { maya: { msg: 'No simulator exists for this.' }, tuan: { S: 1 }, linh: { S: 2, msg: 'Crash drills.' }, nam: { S: 2, msg: 'Forklift simulator.' }, hoa: { msg: 'No simulator exists for this.' },
            cat: { S: 1, M: 1, msg: 'A laser-dot simulator.' } },
          fun: { linh: 'The simulator crashes the servers 40 times. Linh is having the best day of her life.',
            cat: 'Biscuit has never been happier. The dot is never caught.' } },
        { id: 'lecture', label: 'Conference or lecture course away from work', term: 'Lecture or conference',
          fx: { maya: { S: 1, M: -1, msg: 'Output falls.' }, tuan: { S: 1, M: 1 }, linh: { S: 1, M: 1 }, nam: { S: 1, M: -1, msg: 'Output falls.' }, hoa: { S: 1, M: 1 },
            cat: { M: -1, msg: 'Far from the real work, so nothing sticks. And nobody catches mice while it is away.' } },
          fun: { cat: 'A conference in another city. Biscuit spends it in the cat carrier, screaming.' } },
        { id: 'nothing', label: 'Nothing: they will work it out', term: 'No training',
          fx: (st) => st.S <= 1 ? die(st, 'unskilled', 'Left to work it out, they could not.') : add(st, 'W', 1) },
      ],
      next: 'H3',
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
        top: { maya: 'security', tuan: 'recog', linh: 'resp', nam: 'pay', hoa: 'boss', cat: 'noise' },
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
          fun: { maya: 'Pineapple. A heated debate breaks out.', tuan: 'Pineapple. A heated debate breaks out.', linh: 'Pineapple. A heated debate breaks out.',
            nam: 'Pineapple. A heated debate breaks out.', hoa: 'Hoa collects the money and makes a spreadsheet of toppings.',
            cat: "Biscuit eats the anchovies off everyone's slice. Everyone else is now also demotivated." } },
        { id: 'grateful', label: 'Tell them to be grateful to have a job', term: 'Herzberg hygiene factors',
          fx: { maya: { dead: 'demotivated', why: '"Be grateful" was the last straw.' }, tuan: { dead: 'demotivated', why: '"Be grateful" was the last straw.' },
            linh: { dead: 'demotivated', why: '"Be grateful" was the last straw.' }, nam: { dead: 'demotivated', why: '"Be grateful" was the last straw.' },
            hoa: { dead: 'demotivated', why: '"Be grateful" was the last straw.' },
            cat: { dead: 'demotivated', why: 'Biscuit stared at you, unblinking, knocked your coffee off the desk, and never caught another mouse.' } } },
      ],
      next: 'H6',
      debrief: "Herzberg's two-factor theory says hygiene factors (pay, conditions, security, relationships) cause dissatisfaction when missing, but fixing them does not create motivation. Motivators (the work itself, responsibility, growth, achievement, recognition) do.",
    },
    H6: {
      title: 'Output is below target',
      scene: 'Production is behind. How will you raise output?',
      sceneFor: { cat: 'The mouse count is behind target. A mouse was seen wearing a tiny hat. How will you raise output?' },
      terms: ['Taylor', 'Empowerment', 'Intrinsic motivation', 'Extrinsic motivation'],
      options: [
        { id: 'tm', label: 'Time-and-motion study: break the job into steps, train the best method, set a standard', term: 'Taylor',
          fx: { maya: { S: 1, M: 1 }, tuan: { M: -1, msg: 'No standard exists for selling.' }, linh: { M: -2, msg: 'Creative work does not fit a stopwatch.' }, nam: { S: 1, M: 1 }, hoa: { S: 1 },
            cat: { S: 1, M: 1, msg: 'Mousing is repetitive and countable, so Taylor works.' } },
          fun: { maya: "A man with a stopwatch times Maya's sneezes. She is now 4% more efficient at sneezing.",
            cat: 'The study finds the best pounce angle: 47 degrees. Biscuit already knew.' } },
        { id: 'monitor', label: 'Close monitoring plus a bonus for every extra unit', term: 'Taylor',
          fx: (st) => {
            const id = st.hire.id;
            if (isTaylorJob(st)) {
              add(st, 'M', 1);
              if (st.flags.Rushing) { add(st, 'S', -1); say(st, 'Rushing even more: mistakes pile up.'); }
            } else if (id === 'linh') { add(st, 'M', -2); say(st, 'Watched all day. Hates it.'); }
            else if (id === 'hoa') { add(st, 'M', -1); add(st, 'W', 1); }
            else add(st, 'M', -1);
          },
          fun: { linh: "You put a camera on Linh's screen. She codes a bot that waves at it.",
            cat: 'Biscuit loves being watched. Cats expect an audience.' } },
        { id: 'goal', label: 'Set a clear goal and leave them to it', term: 'Empowerment',
          fx: { maya: { flag: 'OutputGap', msg: 'Happy enough, but output stays low.' }, tuan: { M: 1 }, linh: { M: 2, msg: 'Autonomy!' },
            nam: { flag: 'OutputGap', msg: 'Happy enough, but output stays low.' }, hoa: { M: 1 },
            cat: { flag: 'OutputGap', msg: 'Happy enough, but output stays low.' } },
          fun: { cat: 'Left to it, Biscuit finds a box and sleeps in it until Thursday.' } },
        { id: 'raise', label: 'Raise pay across the board', term: 'Extrinsic motivation',
          fx: { maya: { M: 1, flag: 'PayFade' }, tuan: {}, linh: {}, nam: { M: 1, flag: 'PayFade' }, hoa: {}, cat: { M: 1, flag: 'PayFade' } },
          fun: { cat: 'More tuna. Biscuit gets fatter, not faster.' } },
      ],
      next: 'H7',
      debrief: 'Taylor claimed that breaking work into steps, training the best method, monitoring and paying incentives raise output. That fits assembly, picking and mousing. It fails for creative work, where close control and per-unit pay damage motivation.',
    },
    H7: {
      title: 'The month-three plateau',
      scene: 'The work feels the same every day. They are restless.',
      sceneFor: { cat: 'Same warehouse, same mice. Biscuit has started pushing pens off desks while making eye contact.' },
      terms: ['Job enrichment', 'Job enlargement', 'Job rotation', 'Empowerment', 'Purpose', 'Fringe payment', 'Intrinsic motivation', 'Extrinsic motivation'],
      options: [
        { id: 'enrich', term: 'Job enrichment',
          label: (st) => 'Hand over a bigger, harder job: ' + ({ maya: 'judge the quality of finished bikes', tuan: 'lead a client pitch', linh: 'lead a feature end to end',
            nam: 'run a stock audit', hoa: 'own the monthly report', cat: 'Head of Pest Strategy (birds too)' })[st.hire.id],
          fx: (st) => st.S < 2 ? die(st, 'unskilled', 'A bigger job, but not the skills to do it.') : eng(st, 3), next: 'H8',
          fun: { cat: 'Biscuit catches a pigeon and leaves it in the boardroom as a report.' } },
        { id: 'enlarge', label: 'Add one more task at the same level of difficulty', term: 'Job enlargement',
          labels: { cat: 'Add one more task at the same level of difficulty: also chase the moths' },
          fx: { W: 1, msg: 'More of the same. The problem stays.' }, loop: true },
        { id: 'rotate', label: 'Move them through different jobs, a month each quarter', term: 'Job rotation',
          labels: { cat: 'Move Biscuit through different jobs: a month on reception, a month in the loading bay' },
          fx: { S: 1, tag: 2 }, next: 'H8',
          fun: { cat: 'On reception, Biscuit sits on the keyboard and greets every visitor with a slow blink.' } },
        { id: 'empower', label: 'Let them choose how and with which tools they work', term: 'Empowerment', fx: { tag: 4 }, next: 'H9',
          labels: { cat: 'Let Biscuit choose how and where it works' },
          fun: { linh: 'Linh picks a standing desk, a rubber duck and dark mode.', cat: 'Biscuit chooses the top of the fridge. It can see everything from there.' } },
        { id: 'purpose', label: 'Show them who benefits from their work', term: 'Purpose', fx: { tag: 4 }, next: 'H9',
          labels: { cat: 'Show Biscuit who benefits: a wall of cheese, not one bit nibbled' },
          fun: { cat: 'Biscuit stares at the cheese for an hour. It is a meaningful stare.' } },
        { id: 'fringe', label: 'Add free lunches and a gym pass', term: 'Fringe payment',
          labels: { cat: 'Add a heated bed and a scratching post' },
          fx: (st) => { eng(st, 1); say(st, 'The plateau remains.'); }, loop: true,
          fun: { nam: 'Nam lifts boxes for eight hours a night. He uses the gym for the showers.',
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
      next: 'H9',
      debrief: 'Pay matches only meet hygiene needs. A worker whose basic needs are met is more likely to be kept by esteem and growth rewards.',
    },
    H9: {
      title: 'The life event',
      scene: (st) => ({
        maya: 'Her rent goes up 20%.',
        nam: 'His partner is expecting, and he needs predictable hours.',
        hoa: 'Her closest colleague is leaving and she feels alone.',
        tuan: 'He wins the regional sales award and wants status.',
        linh: 'She says the work has become too easy.',
        cat: 'A kitten has been hired. It is getting all the likes on the company Instagram.',
      })[st.hire.id],
      sceneFun: {
        maya: 'Her landlord has bought a jet ski.',
        nam: 'He has already bought a tiny hi-vis vest.',
        hoa: 'Her desk plant, Fernando, also looks sad.',
        tuan: 'He has the trophy engraved. Again. Bigger.',
        linh: 'She finished the week\'s work on Tuesday and spent Wednesday rewriting it in a language nobody uses.',
        cat: 'Biscuit has not blinked in four hours.',
      },
      enter(st) {
        // The cat's status is threatened, so esteem comes to the top
        st.need = { maya: 1, nam: 1, hoa: 2, tuan: 3, linh: 4, cat: 3 }[st.hire.id];
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
      next: 'H10',
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
      next: 'H11',
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
      next: 'H12',
      debrief: 'Performance-related pay rewards a target the worker or team controls, so it can raise effort but also encourage gaming. Profit-related pay shares company profit whatever each person did, so it builds loyalty and shared purpose but does not reward individual effort.',
    },
    H12: {
      title: 'New skills needed',
      scene: (st) => 'You are launching something new, and the launch has a date. ' + ({
        maya: 'Maya gets a new assembly machine.', tuan: 'Tuan gets a new product range.', linh: 'Linh gets a new platform to build on.',
        nam: 'Nam gets a new scanning system.', hoa: 'Hoa gets new booking software.',
        cat: 'The warehouse buys a robot vacuum, and Biscuit must learn to work alongside it.' })[st.hire.id],
      terms: ['In-house course', 'Coaching', 'Mentoring', 'Job rotation', 'Apprenticeship', 'Vestibule training', 'Simulator', 'Lecture or conference'],
      options: [
        { id: 'inhouse', label: 'In-house course run by your own staff', term: 'In-house course', fx: { S: 1 } },
        { id: 'coach', label: 'Coaching from a supervisor', term: 'Coaching',
          fx: { maya: { S: 1, M: 1 }, tuan: { S: 1 }, linh: { S: 1 }, nam: { S: 1, M: 1 }, hoa: { S: 1 }, cat: { S: 1, M: 1 } } },
        { id: 'mentor', label: 'Mentoring by an experienced colleague', term: 'Mentoring',
          fx: { maya: { S: 1 }, tuan: { S: 1, M: 1 }, linh: { S: 1, M: 1 }, nam: { S: 1 }, hoa: { S: 1, M: 1 }, cat: { S: 1 } } },
        { id: 'rotate', label: 'Shadow the team already using it', term: 'Job rotation', fx: { S: 1, M: 1 },
          fun: { cat: 'Biscuit shadows the cleaners and the robot. By Friday Biscuit is riding it.' } },
        { id: 'appr', label: 'Apprenticeship under an expert', term: 'Apprenticeship', fx: { S: 2, M: -1, msg: 'The launch waits.' } },
        { id: 'vest', label: 'A practice area copying the workplace', term: 'Vestibule training',
          fx: { maya: { S: 2 }, tuan: { S: 1 }, linh: { msg: 'Nothing useful to copy.' }, nam: { S: 2 }, hoa: { msg: 'Nothing useful to copy.' }, cat: { S: 2 } },
          fun: { cat: 'A practice room with a second robot vacuum. Biscuit learns where it turns.' } },
        { id: 'sim', label: 'Simulator copying the real equipment', term: 'Simulator',
          fx: { maya: { msg: 'No simulator exists for this.' }, tuan: { S: 1 }, linh: { S: 2 }, nam: { S: 2 }, hoa: { msg: 'No simulator exists for this.' }, cat: { S: 1 } },
          fun: { cat: 'A robot vacuum video game. Biscuit mostly paws at the screen.' } },
        { id: 'lecture', label: 'Conference or lecture course away from work', term: 'Lecture or conference',
          fx: { maya: { S: 1, M: -1, msg: 'Output falls.' }, tuan: { S: 1, M: 1 }, linh: { S: 1, M: 1 }, nam: { S: 1, M: -1, msg: 'Output falls.' }, hoa: { S: 1, M: 1 },
            cat: { S: 1, M: -1, msg: 'Output falls.' } },
          fun: { cat: 'A lecture on robotics. Biscuit sleeps through it, which is honestly fair.' } },
        { id: 'nothing', label: 'Nothing: they will work it out', term: 'No training',
          fx: (st) => st.S <= 2 ? die(st, 'unskilled', st.hire.id === 'cat' ? 'Biscuit attacked the robot vacuum. The robot vacuum won.' : 'Launch day came and they could not run the new system.') : add(st, 'M', -1) },
      ],
      next: 'H13',
      debrief: 'Training helps the business (productivity, flexibility, new technology, fewer accidents) and the worker (value, promotion, resilience). Costs are fees, time away and the risk the worker takes the new skills to a rival.',
    },
    H13: {
      title: 'The share offer',
      scene: 'The company is growing. You can offer your worker a stake.',
      terms: ['Employee share ownership', 'Profit-related pay', 'Fringe payment'],
      options: [
        { id: 'grant', label: 'Grant shares that vest over four years', term: 'Employee share ownership',
          fx: (st) => { eng(st, 3); market(st); },
          fun: { cat: 'Biscuit now owns 0.01% of the company and acts like it owns all of it.' } },
        { id: 'discount', label: 'Let them buy shares at a discount', term: 'Employee share ownership',
          fx: (st) => {
            if (st.hire.id === 'tuan' || st.hire.id === 'linh') eng(st, 3);
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
      next: 'H14',
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
          fun: { cat: 'Biscuit buys a book and sits on it. Learning by absorption.' } },
      ],
      next: 'H15',
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
          fun: { linh: 'Lesson one for the new hire: never deploy on a Friday.', cat: 'Lesson one for the kitten: knock things off tables, but only important things.' } },
        { id: 'speech', label: 'A thank-you speech only', term: 'No reward',
          fx: (st) => { if (st.need >= 3) { add(st, 'M', -1); say(st, 'Words are not enough.'); } },
          fun: { maya: "Someone's phone rings halfway through. It is yours.", tuan: "Someone's phone rings halfway through. It is yours.",
            linh: "Someone's phone rings halfway through. It is yours.", nam: "Someone's phone rings halfway through. It is yours.",
            hoa: "Someone's phone rings halfway through. It is yours.", cat: 'Biscuit walks across the laptop halfway through and ends the slideshow.' } },
      ],
      next: 'END',
      debrief: 'Match the reward to the need: profit-related pay and team rewards for belonging, PRP, shares and titles for esteem, and growth roles for self-fulfilment.',
    },
  };
  for (const [id, h] of Object.entries(HUBS)) h.id = id;

  // ---------- pop quiz ----------
  // After every third decision (five in a full game). Questions are picked to fit the steps just played.
  // A quiz can also ask the player to name a scheme they just chose (the hub's nameIt).
  const QUIZ = [
    { id: 'maslow-first', hubs: ['H1', 'H2', 'H3', 'H8'], ask: "In Maslow's hierarchy, which needs must be met first?",
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
    { id: 'shares-why', hubs: ['H13', 'H2'], ask: 'Why might employee share ownership raise motivation?',
      choices: ['Workers gain when the company does well', 'It pays cash every month', 'It removes all risk', 'It is a hygiene factor'],
      why: 'Owning a stake links the worker to the firm\'s success. But shares can lose value and pay nothing today.' },
    { id: 'enrich', hubs: ['H7', 'H12'], ask: 'Giving a worker more complex and responsible tasks is called...',
      choices: ['Job enrichment', 'Job enlargement', 'Job rotation', 'Piece rate'],
      why: 'Enrichment is deeper work. Enlargement is more tasks at the same level. Rotation is moving between jobs.' },
  ];

  const QUIZ_AT = [3, 6, 9, 12, 16];
  function makeQuiz(st) {
    const recent = st.log.slice(-3).reverse();
    const lastWasName = st.quizIds.length && st.quizIds[st.quizIds.length - 1].startsWith('name-');
    const cands = [];
    for (const e of recent) {
      const hub = HUBS[e.hub], ans = hub.nameIt && hub.nameIt.map[e.opt];
      const nq = ans && { id: 'name-' + e.hub, ask: 'At "' + hub.title + '" you chose: ' + e.choice + '. ' + hub.nameIt.ask,
        choices: [ans].concat(hub.nameIt.pool.filter((p) => p !== ans).slice(0, 3)), why: ans + ': ' + (e.choice.endsWith('.') ? e.choice : e.choice + '.') };
      const tq = QUIZ.filter((q) => q.hubs.includes(e.hub));
      if (lastWasName) cands.push(...tq, nq); else cands.push(nq, ...tq);
    }
    const q = cands.concat(QUIZ).find((c) => c && !st.quizIds.includes(c.id));
    return { id: q.id, ask: typeof q.ask === 'function' ? q.ask(st) : q.ask, choices: q.choices.slice(), answer: q.choices[0], why: q.why, n: st.quizIds.length + 1 };
  }

  function market(st) {
    say(st, "Then the company's value drops 30% this quarter.");
    if (st.need === 1) add(st, 'W', 1); else say(st, 'They hold on to the shares.');
  }

  // ---------- flow ----------
  // Every action is recorded in st.acts, so a saved game can be replayed and rescored (see replay).
  function newState(hireId) {
    const hire = HIRES.find((h) => h.id === hireId);
    if (!hire) throw new Error('no hire');
    return { hire, M: hire.M, S: hire.S, W: 0, need: hire.need, flags: {}, hub: 'H1', removed: {},
      asked: 0, log: [], msgs: [], dead: null, ending: null, decisions: 0, reached: 1, acts: [], pendingQ: null, sorted: false, quizIds: [], quizRight: 0 };
  }

  const label = (o, st) => (o.labels && o.labels[st.hire.id]) || (typeof o.label === 'function' ? o.label(st) : o.label);
  const scene = (h, st) => {
    const base = (h.sceneFor && h.sceneFor[st.hire.id]) || (typeof h.scene === 'function' ? h.scene(st) : h.scene);
    return h.sceneFun && h.sceneFun[st.hire.id] ? base + ' ' + h.sceneFun[st.hire.id] : base;
  };
  const funFor = (o, st) => (typeof o.fun === 'string' ? o.fun : o.fun && o.fun[st.hire.id]) || null;
  const needWords = (st) => (st.hire.needWords || NEED_WORDS)[st.need];
  const optionsAt = (st) => (HUBS[st.hub].options || []).filter((o) => !st.removed[st.hub + o.id]);

  function clone(st) {
    return Object.assign({}, st, { flags: Object.assign({}, st.flags), removed: Object.assign({}, st.removed), log: [], msgs: [], acts: [] });
  }
  // How good a position is, used to suggest a better option in the debrief
  function value(s) { return s.dead ? -100 : s.M * 2 + s.S - s.W * 3 + s.need * 0.5; }
  function tryOpt(st, o) { const c = clone(st); fx(c, o.fx); check(c); return value(c); }

  function goTo(st, id) {
    st.hub = id; st.asked = 0;
    if (id === 'END') { st.reached = 16; st.ending = ending(st); return; }
    st.reached = Math.max(st.reached, +id.slice(1));
    if (HUBS[id].enter) HUBS[id].enter(st);
  }

  const over = (st) => !!st.dead || st.hub === 'END';
  function guard(ok) { if (!ok) throw new Error('bad move'); }

  // Router hubs (H3)
  function route(st) {
    guard(!over(st) && HUBS[st.hub].router && !st.pendingQ);
    st.acts.push('r');
    const next = HUBS[st.hub].route(st);
    if (next) goTo(st, next);
  }

  // Returns a name-it question {ask, answer, pool} or null
  function choose(st, optId) {
    const hub = HUBS[st.hub];
    guard(!over(st) && !hub.router && !st.pendingQ && (!hub.sort || st.sorted));
    const opts = optionsAt(st);
    const opt = opts.find((o) => o.id === optId);
    guard(opt);
    st.acts.push('c' + optId);
    const vals = opts.map((o) => ({ o, v: tryOpt(st, o) }));
    const before = { M: st.M, S: st.S, W: st.W };
    st.msgs = [];
    fx(st, opt.fx);
    check(st);
    st.decisions++;
    const mine = value(st);
    const best = vals.reduce((a, b) => (b.v > a.v ? b : a));
    const better = best.v > mine + 0.01;
    st.log.push({ hub: hub.id, opt: opt.id, title: hub.title, choice: label(opt, st), term: opt.term, msgs: st.msgs.slice(), fun: funFor(opt, st),
      before, after: { M: st.M, S: st.S, W: st.W }, better: better ? label(best.o, st) : null,
      betterTerm: better ? best.o.term : null, debrief: hub.debrief });
    if (st.dead) return null;
    if (opt.loop) { st.removed[hub.id + opt.id] = 1; goTo(st, hub.id); }
    else { st.sorted = false; goTo(st, opt.next || hub.next); }
    // A quiz falls due on reaching steps 3, 6, 9 and 12, and at the end, so a full game always has five
    if (QUIZ_AT.filter((n) => st.reached >= n).length > st.quizIds.length) {
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
    const before = { M: st.M, S: st.S, W: st.W };
    if (right) st.quizRight++;
    add(st, 'M', right ? 1 : -1);
    check(st);
    st.log.push({ hub: st.hub, title: 'Pop quiz ' + q.n, choice: q.ask, term: q.answer, quiz: { ok: right, answer: q.answer },
      msgs: [], before, after: { M: st.M, S: st.S, W: st.W }, better: right ? null : q.answer, betterTerm: null, debrief: q.why });
    if (st.hub === 'END') st.ending = st.dead ? null : ending(st);
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
  function replay(hireId, acts) {
    try {
      const st = newState(hireId);
      for (const a of acts) {
        if (a === 'r') route(st);
        else if (a === 'a') askThem(st);
        else if (a === 'h') guard(askHR(st));
        else if (a === 's1' || a === 's0') sortResult(st, a === 's1');
        else if (a === 'n1' || a === 'n0') answerQuiz(st, a === 'n1' ? st.pendingQ && st.pendingQ.answer : null);
        else if (a[0] === 'c') choose(st, a.slice(1));
        else return null;
      }
      return over(st) && !st.pendingQ ? st : null;
    } catch (e) { return null; }
  }

  const ENDING_BONUS = { mentor: 150, loyal: 100, fragile: 50 };
  // Score: 10 per motivation and skill point, 10 per step reached, 20 per quiz answer right,
  // minus 10 per warning, plus a bonus for surviving
  function score(st) {
    return 10 * (st.M + st.S) + 10 * st.reached + 20 * st.quizRight - 10 * st.W + (st.ending ? ENDING_BONUS[st.ending.id] : 0);
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
    sortCheck, askThem, askHR, route, replay, score, over };
  if (typeof module !== 'undefined') module.exports = Boss;
  root.Boss = Boss;
})(typeof window !== 'undefined' ? window : globalThis);
