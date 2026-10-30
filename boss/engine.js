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
  function add(st, k, v) {
    if (k === 'W') st.W = Math.max(0, st.W + v);
    else st[k] = Math.max(0, Math.min(4, st[k] + v));
  }
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

  // Apply an effect spec: {M,S,W,need,flag,clearW,tag,msg,dead,why} or a function
  function fx(st, s) {
    if (typeof s === 'function') return s(st);
    if (!s) return;
    if (s.maya || s.tuan || s.linh || s.nam || s.hoa) return fx(st, s[st.hire.id]);
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

  const per = (o) => (st) => fx(st, o[st.hire.id]);
  const QUIT_RENT = { dead: 'quit', why: 'Nothing to sell, so no pay. Rent was due.' };

  // ---------- hubs ----------
  const HUBS = {
    H1: {
      title: 'Day One',
      scene: 'Monday, 8:30. Your new hire arrives at the door and looks around.',
      terms: ['Induction', 'On-the-job training', 'Mentoring'],
      options: [
        { id: 'induct', label: 'Run a full induction day: tour, safety, systems, meet the team', term: 'Induction', fx: { M: 1, S: 1 }, next: 'H2' },
        { id: 'buddy', label: 'Pair them with a buddy for the day', term: 'On-the-job training', fx: { S: 1 }, next: 'H2' },
        { id: 'keycard', label: 'Hand over a keycard and say "you\'ll pick it up"', term: 'No induction', fx: { S: -1, M: -1, msg: 'Lost on day one.' }, next: 'H2' },
      ],
      debrief: 'Induction is on-the-job training for new starters. It introduces the business, the role, policies, safety and the people, so the worker settles in and the business avoids early mistakes.',
    },
    H2: {
      title: 'The contract',
      scene: 'Offer letter time. HR lists the ways you could pay. The pay must suit the work.',
      terms: ['Salary', 'Time rate wage', 'Piece rate wage', 'Commission', 'Salary plus commission', 'Employee share ownership', 'Taylor'],
      options: [
        { id: 'salary', label: 'A fixed yearly amount, paid in equal instalments', term: 'Salary',
          fx: { maya: { M: 1, need: 2 }, tuan: {}, linh: { M: 1 }, nam: { M: 1, need: 2 }, hoa: { M: 1 } } },
        { id: 'time', label: 'Paid for every hour worked', term: 'Time rate wage',
          fx: { maya: { M: 1, need: 2 }, tuan: {}, linh: { M: -1, msg: 'Clock-watching.' }, nam: { M: 1, need: 2 }, hoa: {} } },
        { id: 'piece', label: 'Paid for every unit finished', term: 'Piece rate wage',
          fx: { maya: { M: 2, need: 2, flag: 'Rushing', msg: 'Fast, but rushing.' }, tuan: { M: -1, msg: 'There is no unit to count.' },
            linh: { S: -1, M: -1, W: 1, msg: 'Quality collapses.' }, nam: { M: 2, need: 2, flag: 'Rushing', msg: 'Fast, but rushing.' }, hoa: { M: -1, W: 1 } } },
        { id: 'comm', label: 'Only a percentage of what they sell', term: 'Commission',
          fx: { maya: QUIT_RENT, tuan: { M: 1, flag: 'CommissionOnly' }, linh: QUIT_RENT, nam: QUIT_RENT, hoa: { M: -1 } } },
        { id: 'salcomm', label: 'A fixed yearly amount plus a percentage of sales', term: 'Salary plus commission',
          fx: { maya: { M: -1 }, tuan: { M: 1 }, linh: { M: -1 }, nam: { M: -1 }, hoa: {} } },
        { id: 'shares', label: 'A low fixed amount plus shares in the company', term: 'Employee share ownership',
          fx: { maya: { M: -1, W: 1 }, tuan: { M: -1, W: 1 }, linh: { M: 2, need: 4, msg: 'A stake in something new.' },
            nam: { dead: 'quit', why: 'Shares do not pay rent.' }, hoa: {} } },
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
        { id: 'inhouse', label: 'In-house course run by your own staff', term: 'In-house course', fx: { S: 1 } },
        { id: 'coach', label: 'Coaching: a supervisor guides them through the task', term: 'Coaching',
          fx: { maya: { S: 1, M: 1 }, tuan: { S: 1 }, linh: { S: 1 }, nam: { S: 1, M: 1 }, hoa: { S: 1 } } },
        { id: 'mentor', label: 'Mentoring: an experienced colleague they can talk to', term: 'Mentoring',
          fx: { maya: { S: 1 }, tuan: { S: 1, M: 1 }, linh: { S: 1, M: 1 }, nam: { S: 1 }, hoa: { S: 1, M: 1 } } },
        { id: 'appr', label: 'Apprenticeship: long training under an expert', term: 'Apprenticeship',
          fx: { maya: { S: 2, M: -1, msg: 'Months of lower output.' }, tuan: { S: 2 }, linh: { S: 2 }, nam: { S: 2, M: -1, msg: 'Months of lower output.' }, hoa: { S: 2 } } },
        { id: 'vest', label: 'A practice area copying the workplace', term: 'Vestibule training',
          fx: { maya: { S: 2 }, tuan: { S: 1, msg: 'A role-play room.' }, linh: { msg: 'Nothing to copy.' }, nam: { S: 2 }, hoa: { msg: 'Nothing to copy.' } } },
        { id: 'sim', label: 'Simulator: equipment copying the real job', term: 'Simulator',
          fx: { maya: { msg: 'No simulator exists for this.' }, tuan: { S: 1 }, linh: { S: 2, msg: 'Crash drills.' }, nam: { S: 2, msg: 'Forklift simulator.' }, hoa: { msg: 'No simulator exists for this.' } } },
        { id: 'lecture', label: 'Conference or lecture course away from work', term: 'Lecture or conference',
          fx: { maya: { S: 1, M: -1, msg: 'Output falls.' }, tuan: { S: 1, M: 1 }, linh: { S: 1, M: 1 }, nam: { S: 1, M: -1, msg: 'Output falls.' }, hoa: { S: 1, M: 1 } } },
        { id: 'nothing', label: 'Nothing: they will work it out', term: 'No training',
          fx: (st) => st.S <= 1 ? die(st, 'unskilled', 'Left to work it out, they could not.') : add(st, 'W', 1) },
      ],
      next: 'H3',
      debrief: 'On-the-job types are induction, coaching, mentoring, job rotation, apprenticeship and in-house courses. Off-the-job types are lectures and conferences, vestibule training and simulators. On-the-job training links closely to the real work. Off-the-job training reduces distraction but can be less relevant and takes the worker away from production.',
    },
    H5: {
      title: 'The hygiene audit',
      scene: 'Motivation is low. You ask for a complaint list.',
      sort: {
        items: [
          { id: 'pay', label: 'Pay slightly below market', hygiene: true },
          { id: 'noise', label: 'A noisy shared workspace', hygiene: true },
          { id: 'security', label: 'Unclear job security', hygiene: true },
          { id: 'boss', label: 'A cold supervisor', hygiene: true },
          { id: 'recog', label: 'No recognition for good work', hygiene: false },
          { id: 'resp', label: 'No real responsibility', hygiene: false },
        ],
        top: { maya: 'security', tuan: 'recog', linh: 'resp', nam: 'pay', hoa: 'boss' },
      },
      terms: ['Herzberg hygiene factors', 'Herzberg motivators', 'Fringe payment'],
      options: [
        { id: 'hyg', label: 'Fix every hygiene complaint: pay to market, quieter space, secure contract, friendlier supervisor', term: 'Herzberg hygiene factors',
          fx: { clearW: true, msg: 'No longer unhappy, but not motivated either.' } },
        { id: 'mot', label: 'Add the motivators only: recognition and real responsibility', term: 'Herzberg motivators',
          fx: { M: 1, W: 1, msg: 'The basics still grate.' } },
        { id: 'both', label: 'Fix the hygiene factors and add the motivators', term: 'Herzberg, both factors', fx: { M: 2, clearW: true } },
        { id: 'pay', label: 'Give a pay rise only', term: 'Herzberg hygiene factors', fx: { M: 1, flag: 'PayFade', msg: 'Nice for now.' } },
        { id: 'pizza', label: 'Buy everyone pizza', term: 'Fringe payment', fx: { msg: 'Nice lunch. Nothing changed.' } },
        { id: 'grateful', label: 'Tell them to be grateful to have a job', term: 'Herzberg hygiene factors',
          fx: { dead: 'demotivated', why: '"Be grateful" was the last straw.' } },
      ],
      next: 'H6',
      debrief: "Herzberg's two-factor theory says hygiene factors (pay, conditions, security, relationships) cause dissatisfaction when missing, but fixing them does not create motivation. Motivators (the work itself, responsibility, growth, achievement, recognition) do.",
    },
    H6: {
      title: 'Output is below target',
      scene: 'Production is behind. How will you raise output?',
      terms: ['Taylor', 'Empowerment', 'Intrinsic motivation', 'Extrinsic motivation'],
      options: [
        { id: 'tm', label: 'Time-and-motion study: break the job into steps, train the best method, set a standard', term: 'Taylor',
          fx: { maya: { S: 1, M: 1 }, tuan: { M: -1, msg: 'No standard exists for selling.' }, linh: { M: -2, msg: 'Creative work does not fit a stopwatch.' }, nam: { S: 1, M: 1 }, hoa: { S: 1 } } },
        { id: 'monitor', label: 'Close monitoring plus a bonus for every extra unit', term: 'Taylor',
          fx: (st) => {
            const id = st.hire.id;
            if (id === 'maya' || id === 'nam') {
              add(st, 'M', 1);
              if (st.flags.Rushing) { add(st, 'S', -1); say(st, 'Rushing even more: mistakes pile up.'); }
            } else if (id === 'linh') { add(st, 'M', -2); say(st, 'Watched all day. Hates it.'); }
            else if (id === 'hoa') { add(st, 'M', -1); add(st, 'W', 1); }
            else add(st, 'M', -1);
          } },
        { id: 'goal', label: 'Set a clear goal and leave them to it', term: 'Empowerment',
          fx: { maya: { flag: 'OutputGap', msg: 'Happy enough, but output stays low.' }, tuan: { M: 1 }, linh: { M: 2, msg: 'Autonomy!' },
            nam: { flag: 'OutputGap', msg: 'Happy enough, but output stays low.' }, hoa: { M: 1 } } },
        { id: 'raise', label: 'Raise pay across the board', term: 'Extrinsic motivation',
          fx: { maya: { M: 1, flag: 'PayFade' }, tuan: {}, linh: {}, nam: { M: 1, flag: 'PayFade' }, hoa: {} } },
      ],
      next: 'H7',
      debrief: 'Taylor claimed that breaking work into steps, training the best method, monitoring and paying incentives raise output. That fits assembly and picking work. It fails for creative work, where close control and per-unit pay damage motivation.',
    },
    H7: {
      title: 'The month-three plateau',
      scene: 'The work feels the same every day. They are restless.',
      terms: ['Job enrichment', 'Job enlargement', 'Job rotation', 'Empowerment', 'Purpose', 'Fringe payment', 'Intrinsic motivation', 'Extrinsic motivation'],
      options: [
        { id: 'enrich', term: 'Job enrichment',
          label: (st) => 'Hand over a bigger, harder job: ' + ({ maya: 'judge the quality of finished bikes', tuan: 'lead a client pitch', linh: 'lead a feature end to end', nam: 'run a stock audit', hoa: 'own the monthly report' })[st.hire.id],
          fx: (st) => st.S < 2 ? die(st, 'unskilled', 'A bigger job, but not the skills to do it.') : eng(st, 3), next: 'H8' },
        { id: 'enlarge', label: 'Add one more task at the same level of difficulty', term: 'Job enlargement',
          fx: { W: 1, msg: 'More of the same. The problem stays.' }, loop: true },
        { id: 'rotate', label: 'Move them through different jobs, a month each quarter', term: 'Job rotation',
          fx: { S: 1, tag: 2 }, next: 'H8' },
        { id: 'empower', label: 'Let them choose how and with which tools they work', term: 'Empowerment', fx: { tag: 4 }, next: 'H9' },
        { id: 'purpose', label: 'Show them who benefits from their work', term: 'Purpose', fx: { tag: 4 }, next: 'H9' },
        { id: 'fringe', label: 'Add free lunches and a gym pass', term: 'Fringe payment',
          fx: (st) => { eng(st, 1); say(st, 'The plateau remains.'); }, loop: true },
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
      terms: ['Fringe payment', 'Employee share ownership', 'Performance-related pay', 'Maslow', 'Herzberg hygiene factors'],
      options: [
        { id: 'match', label: 'Match with a pay rise', term: 'Herzberg hygiene factors',
          fx: (st) => st.flags.PayFade ? (add(st, 'W', 1), say(st, 'They have stopped being moved by money.')) : eng(st, 1) },
        { id: 'shares', label: 'Offer shares or share options', term: 'Employee share ownership', fx: { tag: 3 } },
        { id: 'growth', label: 'Offer a growth deal: lead a project and a funded course', term: 'Maslow: growth', fx: { S: 1, tag: 4 } },
        { id: 'prp', label: 'Offer a performance bonus', term: 'Performance-related pay', fx: { tag: 3 } },
        { id: 'nomatch', label: 'Say "we can\'t match them"', term: 'Maslow: security',
          fx: (st) => st.need === 1 ? die(st, 'quit', 'They took the better-paid job.') : add(st, 'W', 1) },
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
      })[st.hire.id],
      enter(st) {
        st.need = { maya: 1, nam: 1, hoa: 2, tuan: 3, linh: 4 }[st.hire.id];
        if (st.M <= 1) st.need = Math.max(1, st.need - 1);
      },
      terms: ['Maslow', 'Fringe payment', 'Teamwork', 'Empowerment'],
      options: [
        { id: 'secure', label: 'Guaranteed hours and a pay rise', term: 'Maslow: security', fx: { tag: 1 } },
        { id: 'belong', label: 'A team lunch and a buddy', term: 'Maslow: belonging', fx: { tag: 2 } },
        { id: 'esteem', label: 'Public recognition and a new title', term: 'Maslow: esteem', fx: { tag: 3 } },
        { id: 'grow', label: 'Time for a project of their own choosing', term: 'Maslow: growth', fx: { tag: 4 } },
        { id: 'life', label: '"That\'s life, keep working"', term: 'Ignoring needs', fx: { M: -1, W: 1 } },
      ],
      next: 'H10',
      debrief: "Maslow's hierarchy says people move through security, belonging, esteem and self-fulfilment needs, and that a lower need that is threatened returns to the top. The right reward depends on where the worker is now, not where they were last month.",
    },
    H10: {
      title: 'The team shake-up',
      scene: 'A new colleague joins. The team is tense, and your worker is getting lost in the middle.',
      terms: ['Teamwork', 'Mentoring', 'Maslow'],
      options: [
        { id: 'shared', label: 'Set a shared team target with a shared reward', term: 'Teamwork', fx: { tag: 2 } },
        { id: 'mentor', label: 'Pair them with a mentor or buddy', term: 'Mentoring', fx: { S: 1, tag: 2 } },
        { id: 'prize', label: 'Give the best-performing pair a prize', term: 'Maslow: esteem', fx: { tag: 3 } },
        { id: 'desk', label: 'Move them to a separate desk away from the noise', term: 'Isolation',
          fx: (st) => st.need === 2 ? die(st, 'quit', 'Cut off from the team, they left.') : add(st, 'M', -1) },
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
          fx: (st) => { eng(st, 3); if (st.hire.id === 'tuan') { st.flags.Gaming = 1; say(st, 'He starts pushing customers to hit the number.'); } } },
        { id: 'team', label: 'A bonus if the whole team hits its target', term: 'Performance-related pay (team)', fx: { tag: 2 } },
        { id: 'profit', label: 'A share of company profit for every employee', term: 'Profit-related pay',
          fx: (st) => { eng(st, 2); if (st.hire.id === 'tuan') { add(st, 'M', -1); say(st, 'The top seller gets the same as everyone.'); } } },
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
        nam: 'Nam gets a new scanning system.', hoa: 'Hoa gets new booking software.' })[st.hire.id],
      terms: ['In-house course', 'Coaching', 'Mentoring', 'Job rotation', 'Apprenticeship', 'Vestibule training', 'Simulator', 'Lecture or conference'],
      options: [
        { id: 'inhouse', label: 'In-house course run by your own staff', term: 'In-house course', fx: { S: 1 } },
        { id: 'coach', label: 'Coaching from a supervisor', term: 'Coaching',
          fx: { maya: { S: 1, M: 1 }, tuan: { S: 1 }, linh: { S: 1 }, nam: { S: 1, M: 1 }, hoa: { S: 1 } } },
        { id: 'mentor', label: 'Mentoring by an experienced colleague', term: 'Mentoring',
          fx: { maya: { S: 1 }, tuan: { S: 1, M: 1 }, linh: { S: 1, M: 1 }, nam: { S: 1 }, hoa: { S: 1, M: 1 } } },
        { id: 'rotate', label: 'Shadow the team already using it', term: 'Job rotation', fx: { S: 1, M: 1 } },
        { id: 'appr', label: 'Apprenticeship under an expert', term: 'Apprenticeship', fx: { S: 2, M: -1, msg: 'The launch waits.' } },
        { id: 'vest', label: 'A practice area copying the workplace', term: 'Vestibule training',
          fx: { maya: { S: 2 }, tuan: { S: 1 }, linh: { msg: 'Nothing useful to copy.' }, nam: { S: 2 }, hoa: { msg: 'Nothing useful to copy.' } } },
        { id: 'sim', label: 'Simulator copying the real equipment', term: 'Simulator',
          fx: { maya: { msg: 'No simulator exists for this.' }, tuan: { S: 1 }, linh: { S: 2 }, nam: { S: 2 }, hoa: { msg: 'No simulator exists for this.' } } },
        { id: 'lecture', label: 'Conference or lecture course away from work', term: 'Lecture or conference',
          fx: { maya: { S: 1, M: -1, msg: 'Output falls.' }, tuan: { S: 1, M: 1 }, linh: { S: 1, M: 1 }, nam: { S: 1, M: -1, msg: 'Output falls.' }, hoa: { S: 1, M: 1 } } },
        { id: 'nothing', label: 'Nothing: they will work it out', term: 'No training',
          fx: (st) => st.S <= 2 ? die(st, 'unskilled', 'Launch day came and they could not run the new system.') : add(st, 'M', -1) },
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
          fx: (st) => { eng(st, 3); market(st); } },
        { id: 'discount', label: 'Let them buy shares at a discount', term: 'Employee share ownership',
          fx: (st) => {
            if (st.hire.id === 'tuan' || st.hire.id === 'linh') eng(st, 3);
            else { add(st, 'M', -1); add(st, 'W', 1); say(st, 'They cannot afford it.'); }
            market(st);
          } },
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
        { id: 'car', label: 'A transport allowance or company car', term: 'Fringe payment', fx: { tag: 1 } },
        { id: 'gym', label: 'Free meals and a gym membership', term: 'Fringe payment', fx: { tag: 1 } },
        { id: 'health', label: 'Private health cover', term: 'Fringe payment', fx: { tag: 1 } },
        { id: 'learn', label: 'A learning allowance for courses and books', term: 'Fringe payment (growth)', fx: { tag: 4 } },
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
        { id: 'gift', label: 'A fringe gift: a voucher or a weekend trip', term: 'Fringe payment', fx: { tag: 1 } },
        { id: 'promote', label: 'Promote them to a mentoring role with a new title', term: 'Maslow: growth', fx: { tag: 4, flag: 'Promoted' } },
        { id: 'speech', label: 'A thank-you speech only', term: 'No reward',
          fx: (st) => { if (st.need >= 3) { add(st, 'M', -1); say(st, 'Words are not enough.'); } } },
      ],
      next: 'END',
      debrief: 'Match the reward to the need: profit-related pay and team rewards for belonging, PRP, shares and titles for esteem, and growth roles for self-fulfilment.',
    },
  };
  for (const [id, h] of Object.entries(HUBS)) h.id = id;

  function market(st) {
    say(st, "Then the company's value drops 30% this quarter.");
    if (st.need === 1) add(st, 'W', 1); else say(st, 'They hold on to the shares.');
  }

  // ---------- flow ----------
  function newState(hireId) {
    const hire = HIRES.find((h) => h.id === hireId);
    return { hire, M: hire.M, S: hire.S, W: 0, need: hire.need, flags: {}, hub: 'H1', removed: {},
      asked: 0, log: [], msgs: [], dead: null, ending: null, decisions: 0 };
  }

  const label = (o, st) => (typeof o.label === 'function' ? o.label(st) : o.label);
  const scene = (h, st) => (typeof h.scene === 'function' ? h.scene(st) : h.scene);
  const optionsAt = (st) => (HUBS[st.hub].options || []).filter((o) => !st.removed[st.hub + o.id]);

  function clone(st) {
    return Object.assign({}, st, { flags: Object.assign({}, st.flags), removed: Object.assign({}, st.removed), log: [], msgs: [] });
  }
  function score(s) { return s.dead ? -100 : s.M * 2 + s.S - s.W * 3 + s.need * 0.5; }
  function tryOpt(st, o) { const c = clone(st); fx(c, o.fx); check(c); return score(c); }

  function goTo(st, id) {
    st.hub = id; st.asked = 0;
    if (id === 'END') { st.ending = ending(st); return; }
    if (HUBS[id].enter) HUBS[id].enter(st);
  }

  // Router hubs (H3): returns the death or moves on
  function route(st) {
    const next = HUBS[st.hub].route(st);
    if (next) goTo(st, next);
  }

  // Returns a name-it question {ask, answer, pool} or null
  function choose(st, optId) {
    const hub = HUBS[st.hub];
    const opts = optionsAt(st);
    const opt = opts.find((o) => o.id === optId);
    const scores = opts.map((o) => ({ o, s: tryOpt(st, o) }));
    const before = { M: st.M, S: st.S, W: st.W };
    st.msgs = [];
    fx(st, opt.fx);
    check(st);
    st.decisions++;
    const mine = score(st);
    const best = scores.reduce((a, b) => (b.s > a.s ? b : a));
    st.log.push({ hub: hub.id, title: hub.title, choice: label(opt, st), term: opt.term, msgs: st.msgs.slice(),
      before, after: { M: st.M, S: st.S, W: st.W }, better: best.s > mine + 0.01 ? label(best.o, st) : null,
      betterTerm: best.s > mine + 0.01 ? best.o.term : null, debrief: hub.debrief });
    if (st.dead) return null;
    if (opt.loop) { st.removed[hub.id + opt.id] = 1; goTo(st, hub.id); }
    else goTo(st, opt.next || hub.next);
    const ans = hub.nameIt && hub.nameIt.map[optId];
    return ans ? { ask: hub.nameIt.ask, answer: ans, pool: hub.nameIt.pool } : null;
  }

  // Name-it answer. Wrong costs M-1. Returns true if right.
  function answerName(st, q, pick) {
    const last = st.log[st.log.length - 1];
    if (pick === q.answer) { last.named = pick; return true; }
    add(st, 'M', -1);
    const m = 'HR filed the wrong paperwork. It was ' + q.answer + '.';
    st.msgs.push(m); last.msgs.push(m); last.misnamed = q.answer;
    last.after = { M: st.M, S: st.S, W: st.W };
    check(st);
    if (st.dead) st.ending = null;
    return false;
  }

  // H5 sort check: picks is a set of item ids the player says are hygiene factors
  function sortCheck(st, picks) {
    const items = HUBS.H5.sort.items;
    const ok = items.every((i) => i.hygiene === picks.has(i.id));
    if (!ok) { add(st, 'M', -1); check(st); }
    return ok;
  }

  // Ask them: the second use at one hub gives a warning
  function askThem(st) {
    st.asked++;
    if (st.asked === 2) { add(st, 'W', 1); check(st); }
    return NEED_WORDS[st.need];
  }
  // Ask HR: free unless the hub is urgent
  function askHR(st) {
    if (HUBS[st.hub] && HUBS[st.hub].urgent) { add(st, 'W', 1); check(st); return true; }
    return false;
  }

  function ending(st) {
    if (st.M >= 3 && st.S >= 3 && st.need >= 3 && st.flags.Promoted && !st.flags.Gaming)
      return { id: 'mentor', title: 'Promoted mentor',
        text: 'They now train the next hire. You matched each reward to what they needed at the time, and the work itself became the reward.' };
    if (st.M >= 3 && st.S >= 2) {
      const extra = [];
      if (st.flags.OutputGap) extra.push('But output never reached target.');
      if (st.flags.Gaming) extra.push('But customers found them pushy.');
      return { id: 'loyal', title: 'Loyal veteran', text: ['They stay for years.'].concat(extra).join(' ') };
    }
    return { id: 'fragile', title: 'Fragile survivor',
      text: 'They stay another year, and they are already reading job ads. Your rewards fixed some problems but missed what really mattered to them.' };
  }

  const Boss = { HIRES, HUBS, DEATHS, NEED_WORDS, newState, optionsAt, label, scene, choose, answerName,
    sortCheck, askThem, askHR, route };
  if (typeof module !== 'undefined') module.exports = Boss;
  root.Boss = Boss;
})(typeof window !== 'undefined' ? window : globalThis);
