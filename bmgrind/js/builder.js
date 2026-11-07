// Set builder: turns the catalogue plus the student's choices into a practice "plan".
// Pure logic, no DOM. A plan is { title, preset, minutes, parts: [{ caseId, paper, questionIds, section, choose }] }.
// `choose: 'question'` = answer one question of the part (Paper 1 Section B).
// `choose: 'part'` = answer one of the parts in the same section (Paper 2 Section B: two cases, pick one).

export const PRESETS = [
  { id: 'quick', title: 'Quick 10 minutes', blurb: 'One short Paper 2 data case with its questions.', meta: '10 marks' },
  { id: 'topic', title: 'Topic drill', blurb: 'Questions on the topics you choose, any type.', meta: 'You choose', adjust: ['topics', 'marks', 'reading'] },
  { id: 'calc', title: 'Calculation drill', blurb: 'Paper 2 style calculations: ratios, break-even, cash flow and more.', meta: '10 to 20 marks', adjust: ['topics', 'marks'] },
  { id: 'recall', title: 'Definitions and "state"', blurb: 'Short recall questions: define, state, describe.', meta: 'Fast', adjust: ['topics', 'marks'] },
  { id: 'explain', title: 'Explain with context', blurb: 'Explain and analyse questions where using the case earns the marks.', meta: '2 to 6 mark questions', adjust: ['topics', 'marks', 'reading'] },
  { id: 'tenmark', title: 'One 10-marker', blurb: 'One case and one extended response question.', meta: '10 marks · ~20 min' },
  { id: 'p1a', title: 'Paper 1 short answers', blurb: 'A Paper 1 case with the full Section A run.', meta: '20 marks' },
  { id: 'p2a', title: 'Paper 2 data questions', blurb: 'Paper 2 Section A: short data cases full of calculations.', meta: 'SL 20 · HL 30 marks' },
  { id: 'fullp1', title: 'Full Paper 1', blurb: 'Case study, Section A and a choice of two 10-markers.', meta: '30 marks · 1 h 30' },
  { id: 'fullp2', title: 'Full Paper 2', blurb: 'Section A data questions and a choice of Section B cases.', meta: 'SL 40 · HL 50 marks' },
  { id: 'fullp3', title: 'Full Paper 3', blurb: 'Social enterprise case with six resources (HL).', meta: '25 marks · 1 h 15', hlOnly: true },
];

const MIN_PER_MARK = { p1: 3, p2a: 2.2, p2b: 2.2, p3: 3 };
const AO4 = new Set(['calculate', 'construct', 'complete', 'prepare', 'determine', 'draw', 'plot', 'label', 'annotate']);
const RECALL = new Set(['define', 'state', 'list', 'identify', 'outline', 'describe']);
const EXPLAIN = new Set(['explain', 'analyse', 'distinguish', 'comment', 'suggest', 'apply', 'demonstrate']);

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
const unitOf = (p) => (/^\d/.test(p) ? p.split('.')[0] : 'toolkit');
const subOf = (p) => (/^\d/.test(p) ? p.split('.').slice(0, 2).join('.') : 'toolkit');

export function makeBuilder(catalog, opts) {
  // opts: { level: 'SL'|'HL', units: Set of unit ids covered, recent: [caseIds] }
  const level = opts.level;
  const units = opts.units;
  const recent = new Set(opts.recent || []);
  const cases = catalog.cases.filter((c) => level === 'HL' || c.level === 'SL');
  const qFits = (q) => q.points.every((p) => unitOf(p) === 'toolkit' || units.has(unitOf(p)));
  const fresh = (list) => {
    const unseen = list.filter((c) => !recent.has(c.id));
    return unseen.length ? unseen : list;
  };
  // a case fits if at least one of its ready-made sets only asks about covered units
  const setFits = (c, set) => set.questions.every((id) => qFits(qById(c, id)));
  const fitSets = (c) => c.sets.filter((set) => setFits(c, set));
  const casesOf = (paper) => fresh(cases.filter((c) => c.paper === paper && fitSets(c).length));
  const qById = (c, id) => c.questions.find((q) => q.id === id);
  // marks and minutes the student actually answers (one alternative only)
  const answered = (parts) => {
    const out = [];
    const seenChoice = new Set();
    for (const p of parts) {
      if (p.choose === 'part') {
        if (seenChoice.has(p.section)) continue;
        seenChoice.add(p.section);
      }
      const c = cases.find((x) => x.id === p.caseId);
      const qs = p.questionIds.map((id) => qById(c, id));
      out.push(...(p.choose === 'question' ? [qs.reduce((a, b) => (a.marks >= b.marks ? a : b))] : qs).map((q) => ({ q, paper: c.paper })));
    }
    return out;
  };
  const minutes = (parts) => Math.round(answered(parts).reduce((t, x) => t + x.q.marks * MIN_PER_MARK[x.paper], 0));

  function none(msg) { return { error: msg }; }

  function fullSet(paper, filter = () => true) {
    const cs = casesOf(paper);
    if (!cs.length) return null;
    const c = pick(cs);
    const ok = fitSets(c).filter(filter);
    return { c, s: pick(ok.length ? ok : fitSets(c)) };
  }

  function build(preset, o = {}) {
    // o: { subtopics: Set, marks: number, reading: 'fewer'|'exact' }
    let parts = [];
    let title = PRESETS.find((p) => p.id === preset)?.title || 'Practice';

    if (preset === 'quick') {
      const r = fullSet('p2a');
      if (!r) return none('No Section A cases fit your choices yet.');
      parts = [{ caseId: r.c.id, paper: 'p2a', questionIds: r.s.questions, section: 'A' }];
    } else if (preset === 'fullp1' || preset === 'p1a') {
      const r = fullSet('p1');
      if (!r) return none('No Paper 1 cases fit your choices yet. Try ticking more units.');
      const a = r.s.questions.filter((id) => qById(r.c, id).slot !== 'B');
      parts = [{ caseId: r.c.id, paper: 'p1', questionIds: a, section: 'A' }];
      if (preset === 'fullp1') {
        const b = r.s.questions.filter((id) => qById(r.c, id).slot === 'B');
        parts.push({ caseId: r.c.id, paper: 'p1', questionIds: b, section: 'B', choose: 'question' });
      }
    } else if (preset === 'p2a' || preset === 'fullp2') {
      const n = level === 'HL' ? 3 : 2;
      const cs = shuffle(casesOf('p2a'));
      if (level === 'HL') cs.sort((a, b) => (b.level === 'HL') - (a.level === 'HL')); // at least some HL content first
      if (cs.length < n) return none('Not enough Section A cases fit your choices yet.');
      const chosen = level === 'HL' ? shuffle([cs[0], ...shuffle(cs.slice(1)).slice(0, n - 1)]) : cs.slice(0, n);
      parts = chosen.map((c) => ({ caseId: c.id, paper: 'p2a', questionIds: pick(fitSets(c)).questions, section: 'A' }));
      if (preset === 'fullp2') {
        const bs = shuffle(casesOf('p2b'));
        if (bs.length < 2) return none('Not enough Section B cases fit your choices yet.');
        bs.slice(0, 2).forEach((c) => parts.push({ caseId: c.id, paper: 'p2b', questionIds: pick(fitSets(c)).questions, section: 'B', choose: 'part' }));
      }
    } else if (preset === 'fullp3') {
      if (level !== 'HL') return none('Paper 3 is for HL students. Switch the level to HL to try it.');
      const r = fullSet('p3');
      if (!r) return none('No Paper 3 cases available yet.');
      parts = [{ caseId: r.c.id, paper: 'p3', questionIds: r.s.questions, section: 'P3' }];
    } else if (preset === 'tenmark') {
      const pool = [];
      for (const c of cases) {
        if (c.paper !== 'p1' && c.paper !== 'p2b') continue;
        for (const q of c.questions) if (q.marks === 10 && qFits(q)) pool.push({ c, q });
      }
      const fr = pool.filter((x) => !recent.has(x.c.id));
      if (!pool.length) return none('No 10-mark questions fit your choices yet.');
      const x = pick(fr.length ? fr : pool);
      parts = [{ caseId: x.c.id, paper: x.c.paper, questionIds: [x.q.id], section: 'B' }];
    } else {
      // drills: topic, calc, recall, explain
      const target = o.marks || 20;
      const subs = o.subtopics && o.subtopics.size ? o.subtopics : null;
      const typeOk = {
        topic: (q) => q.marks <= 10,
        calc: (q) => AO4.has(q.command),
        recall: (q) => RECALL.has(q.command) && q.marks <= 4,
        explain: (q) => EXPLAIN.has(q.command) && q.marks >= 2 && q.marks <= 6,
      }[preset];
      const topicOk = (q) => !subs || q.points.some((p) => subs.has(subOf(p)));
      const pool = [];
      for (const c of cases) {
        if (c.paper === 'p3') continue; // Paper 3 questions only make sense as a whole paper
        for (const q of c.questions) if (typeOk(q) && topicOk(q) && qFits(q)) pool.push({ c, q });
      }
      if (!pool.length) return none('No questions match those choices yet. Try more topics or units.');
      const byCase = new Map();
      for (const x of shuffle(pool)) {
        if (!byCase.has(x.c.id)) byCase.set(x.c.id, []);
        byCase.get(x.c.id).push(x);
      }
      let order;
      if (o.reading === 'exact') {
        order = shuffle(pool); // best topic fit, any number of cases
      } else {
        // fewest cases: take the cases with the most matching questions first
        const groups = [...byCase.values()].sort((a, b) => b.length - a.length || (recent.has(a[0].c.id) - recent.has(b[0].c.id)));
        order = groups.flat();
      }
      let total = 0;
      const take = [];
      for (const x of order) {
        if (total >= target) break;
        if (total + x.q.marks > target + 4) continue;
        if (take.some((t) => t.c.id === x.c.id && t.q.id === x.q.id)) continue;
        take.push(x);
        total += x.q.marks;
      }
      const grouped = new Map();
      for (const x of take) {
        if (!grouped.has(x.c.id)) grouped.set(x.c.id, { c: x.c, ids: [] });
        grouped.get(x.c.id).ids.push(x.q.id);
      }
      parts = [...grouped.values()].map(({ c, ids }) => ({
        caseId: c.id, paper: c.paper,
        questionIds: c.questions.map((q) => q.id).filter((id) => ids.includes(id)), // keep case order
        section: 'D',
      }));
      title = `${title}${subs ? ' · chosen topics' : ''}`;
    }
    const marks = answered(parts).reduce((s, x) => s + x.q.marks, 0);
    return { title, preset, level, marks, minutes: minutes(parts), parts, created: Date.now() };
  }

  // Swap one question for a similar one: same case first, then another case of the same paper.
  function reroll(plan, caseId, qid) {
    const c = cases.find((x) => x.id === caseId);
    const q = qById(c, qid);
    const used = new Set(plan.parts.flatMap((p) => p.questionIds.map((id) => `${p.caseId}:${id}`)));
    const similar = (x) => x.marks === q.marks && (c.paper === 'p1' ? x.slot === q.slot : x.command === q.command || AO4.has(x.command) === AO4.has(q.command));
    const same = c.questions.filter((x) => x.id !== qid && similar(x) && qFits(x) && !used.has(`${caseId}:${x.id}`));
    if (same.length) return { caseId, questionId: pick(same).id };
    const others = [];
    for (const oc of cases.filter((x) => x.paper === c.paper && x.id !== caseId)) {
      for (const x of oc.questions) if (similar(x) && qFits(x) && !used.has(`${oc.id}:${x.id}`)) others.push({ caseId: oc.id, questionId: x.id });
    }
    return others.length ? pick(others) : null;
  }

  return { build, reroll, cases };
}

export function allUnits(catalog) {
  return catalog.syllabus.map((u) => u.id);
}
