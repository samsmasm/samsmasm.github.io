// Checkin - question set builder: manual entry plus CSV import.

import {
  requireUser, qp, esc, fail, newId, LETTERS, BLANK_SET,
  getClass, getSet, createSet, saveSet, saveKey, getKey, syncKeyVisibility,
  csvToQuestions, addShellLinks, isOneOff} from './core.js?v=290b6c8-1909';

const classId = qp('c');
let setId = qp('s');
const isNew = qp('new') === '1' || !setId;

let me = null, cls = null, set = null, key = {};

(async function start() {
  me = await requireUser();
  const back = 'teach.html?c=' + encodeURIComponent(classId);
  document.getElementById('back').href = back;

  try {
    cls = await getClass(classId);
    if (cls.ownerUid !== me.uid) { location.replace('class.html?c=' + encodeURIComponent(classId)); return; }
    if (isNew) {
      set = { ...BLANK_SET(), id: null };
      key = {};
    } else {
      set = await getSet(classId, setId);
      key = await getKey(classId, setId);
    }
  } catch (err) { return fail('Loading the set', err); }

  addShellLinks([{ label: cls.name, href: 'teach.html?c=' + encodeURIComponent(classId),
                   icon: 'stack' }]);
  document.getElementById('head').textContent = isNew ? 'New question set' : 'Edit question set';
  document.getElementById('status-line').textContent = isNew
    ? cls.name
    : cls.name + ' · ' + { draft: 'draft', open: 'open to the class now', closed: 'closed' }[set.status];
  // A run of a one off test already has its name: the name of the test itself,
  // which lives on the container. What this field names is the batch, so it says
  // so and writes to the batch, rather than quietly overwriting the quiz name
  // and leaving students looking at "Period 3" with no idea what it is.
  if (isOneOff(cls)) {
    document.querySelector('label[for="title"], .panel .label').textContent = 'Batch name';
    const field = document.getElementById('title');
    field.value = set.runLabel || '';
    field.placeholder = 'Period 3, or Tuesday group';
    const hint = document.createElement('p');
    hint.className = 'tiny';
    hint.textContent = 'The test is called "' + (cls.name || '') +
      '". This names just this batch of people, and both are shown to them.';
    field.insertAdjacentElement('afterend', hint);
  } else {
    document.getElementById('title').value = set.title || '';
  }
  pick('mode', set.mode || 'self');
  pick('reveal', set.reveal || 'release');

  renderQuestions();
  wire();
  updateAiPrompt();
})();

function pick(group, value) {
  document.querySelectorAll('input[name=' + group + ']').forEach(r => { r.checked = r.value === value; });
}
function chosen(group) {
  const hit = document.querySelector('input[name=' + group + ']:checked');
  return hit ? hit.value : null;
}

/* ---------------- rendering the editor ---------------- */

function renderQuestions() {
  const box = document.getElementById('questions');
  const qs = set.questions || [];
  document.getElementById('qcount').textContent = qs.length
    ? '(' + qs.length + ', out of ' + qs.reduce((n, q) => n + (Number(q.maxMark) || 1), 0) + ')'
    : '';

  if (!qs.length) {
    box.innerHTML = '<p class="tiny">No questions yet. Add one below, or paste a CSV.</p>';
    return;
  }

  box.innerHTML = qs.map((q, i) => {
    const opts = q.options || [];
    const answer = key[q.id] || '';
    const mcqBits = LETTERS.slice(0, 4).map((letter, n) =>
      '<div class="row" style="margin-top:.3rem">' +
        '<span class="choice-letter">' + letter + '</span>' +
        '<input type="text" class="grow" data-f="opt' + n + '" value="' + esc(opts[n] || '') + '" placeholder="Option ' + letter + '">' +
      '</div>').join('');

    return '<div class="qblock" data-i="' + i + '">' +
      '<div class="spread">' +
        '<span class="label">Question ' + (i + 1) + '</span>' +
        '<span class="row">' +
          '<select data-f="type" style="width:auto">' +
            '<option value="mcq"' + (q.type === 'mcq' ? ' selected' : '') + '>Multiple choice</option>' +
            '<option value="text"' + (q.type === 'text' ? ' selected' : '') + '>Short text</option>' +
          '</select>' +
          '<button data-act="up" class="btn-quiet"' + (i === 0 ? ' disabled' : '') + '>Up</button>' +
          '<button data-act="down" class="btn-quiet"' + (i === qs.length - 1 ? ' disabled' : '') + '>Down</button>' +
          '<button data-act="del" class="btn-warn">Delete</button>' +
        '</span>' +
      '</div>' +
      '<textarea data-f="prompt" rows="2" placeholder="What do you want them to answer?">' + esc(q.prompt || '') + '</textarea>' +
      '<div data-part="mcq" class="' + (q.type === 'mcq' ? '' : 'hidden') + '">' +
        mcqBits +
        '<div class="row mt">' +
          '<span class="label" style="margin:0">Correct answer</span>' +
          '<select data-f="correct" style="width:auto">' +
            '<option value="">not set</option>' +
            LETTERS.slice(0, 4).map(l =>
              '<option value="' + l + '"' + (answer.toUpperCase() === l ? ' selected' : '') + '>' + l + '</option>').join('') +
          '</select>' +
          '<span class="label" style="margin:0">Marks for this question</span>' +
          '<input type="number" data-f="maxMark" min="1" max="100" value="' + (Number(q.maxMark) || 1) + '">' +
        '</div>' +
      '</div>' +
      '<div data-part="text" class="' + (q.type === 'text' ? '' : 'hidden') + '">' +
        '<div class="row mt">' +
          '<span class="label" style="margin:0">Marks for this question</span>' +
          '<input type="number" data-f="maxMark2" min="1" max="100" value="' + (Number(q.maxMark) || 1) + '">' +
          '<span class="tiny">1 mark gives you a right or wrong toggle when you mark.</span>' +
        '</div>' +
        '<textarea data-f="model" rows="2" class="mt" placeholder="Model answer, for your eyes while marking (optional)">' +
          esc(q.type === 'text' ? answer : '') + '</textarea>' +
      '</div>' +
    '</div>';
  }).join('');

  box.querySelectorAll('[data-act]').forEach(btn =>
    btn.addEventListener('click', () => onQuestionAction(btn)));
  box.querySelectorAll('[data-f=type]').forEach(sel =>
    sel.addEventListener('change', () => {
      const block = sel.closest('[data-i]');
      const isMcq = sel.value === 'mcq';
      block.querySelector('[data-part=mcq]').classList.toggle('hidden', !isMcq);
      block.querySelector('[data-part=text]').classList.toggle('hidden', isMcq);
    }));
}

// Reads every editor field back into memory. Called before any structural change
// and before saving, so nothing typed is lost by a re-render.
function harvest() {
  const blocks = document.querySelectorAll('#questions [data-i]');
  const out = [], newKey = {};
  blocks.forEach(block => {
    const i = Number(block.dataset.i);
    const old = set.questions[i] || {};
    const val = f => {
      const el = block.querySelector('[data-f="' + f + '"]');
      return el ? el.value : '';
    };
    const type = val('type') === 'text' ? 'text' : 'mcq';
    const id = old.id || newId();
    const q = { id, type, prompt: val('prompt').trim() };
    if (type === 'mcq') {
      q.options = [0, 1, 2, 3].map(n => val('opt' + n).trim()).filter(o => o !== '');
      q.maxMark = Math.max(1, Number(val('maxMark')) || 1);
      const letter = val('correct');
      if (letter) newKey[id] = letter;
    } else {
      q.maxMark = Math.max(1, Number(val('maxMark2')) || 1);
      const model = val('model').trim();
      if (model) newKey[id] = model;
    }
    out.push(q);
  });
  set.questions = out;
  key = newKey;
  if (isOneOff(cls)) {
    // The quiz name stays the container's, so renaming the test renames every
    // batch of it and nothing here can clobber it.
    set.runLabel = document.getElementById('title').value.trim();
    set.title = cls.name || set.title || '';
  } else {
    set.title = document.getElementById('title').value.trim();
  }
  set.mode = chosen('mode') || 'self';
  set.reveal = chosen('reveal') || 'release';
}

function onQuestionAction(btn) {
  const i = Number(btn.closest('[data-i]').dataset.i);
  harvest();
  const qs = set.questions;
  if (btn.dataset.act === 'del') {
    if (btn.dataset.armed !== '1') { btn.dataset.armed = '1'; btn.textContent = 'Sure?'; return; }
    const [gone] = qs.splice(i, 1);
    if (gone) delete key[gone.id];
  } else if (btn.dataset.act === 'up' && i > 0) {
    [qs[i - 1], qs[i]] = [qs[i], qs[i - 1]];
  } else if (btn.dataset.act === 'down' && i < qs.length - 1) {
    [qs[i + 1], qs[i]] = [qs[i], qs[i + 1]];
  }
  renderQuestions();
}

/* ---------------- wiring ---------------- */

function wire() {
  document.getElementById('add-mcq').addEventListener('click', () => {
    harvest();
    set.questions.push({ id: newId(), type: 'mcq', prompt: '', options: ['', '', '', ''], maxMark: 1 });
    renderQuestions();
    focusLast();
  });

  document.getElementById('add-text').addEventListener('click', () => {
    harvest();
    set.questions.push({ id: newId(), type: 'text', prompt: '', maxMark: 1 });
    renderQuestions();
    focusLast();
  });

  document.getElementById('csv-add').addEventListener('click', () => importCSV(false));
  document.getElementById('csv-replace').addEventListener('click', () => importCSV(true));
  document.getElementById('csv-file').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('csv-text').value = await file.text();
    note('csv-note', 'File read. Now choose add or replace.', 'msg msg-ok');
  });

  const template =
    'type,question,optionA,optionB,optionC,optionD,answer,maxMark\n' +
    'mcq,"What happens to quantity demanded when price rises, all else equal?",It falls,It rises,It is unchanged,It becomes perfectly elastic,A,1\n' +
    'text,"Explain why demand for insulin is price inelastic.",,,,,"Few substitutes; it is a necessity; a small share of income",3\n';
  const link = document.getElementById('template');
  link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(template);
  link.download = 'checkin-template.csv';

  document.getElementById('save').addEventListener('click', () => save(false));
  document.getElementById('save-open').addEventListener('click', () => save(true));

  ['ai-topic', 'ai-num'].forEach(id =>
    document.getElementById(id).addEventListener('input', updateAiPrompt));
  document.getElementById('ai-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(document.getElementById('ai-prompt').value); }
    catch { document.getElementById('ai-prompt').select(); }
  });
}

function focusLast() {
  const blocks = document.querySelectorAll('#questions [data-i]');
  const last = blocks[blocks.length - 1];
  if (last) last.querySelector('[data-f=prompt]').focus();
}

function note(id, text, cls) {
  const el = document.getElementById(id);
  el.className = cls || 'tiny';
  el.textContent = text;
}

function importCSV(replace) {
  const text = document.getElementById('csv-text').value.trim();
  if (!text) return note('csv-note', 'Paste some CSV first, or choose a file.', 'msg msg-bad');
  const { questions, key: newKeys, errors } = csvToQuestions(text);
  if (!questions.length) return note('csv-note', errors.join(' '), 'msg msg-bad');

  harvest();
  if (replace) { set.questions = []; key = {}; }
  set.questions = set.questions.concat(questions);
  Object.assign(key, newKeys);
  renderQuestions();
  document.getElementById('csv-text').value = '';
  document.getElementById('csv-file').value = '';
  note('csv-note',
    'Imported ' + questions.length + (questions.length === 1 ? ' question. ' : ' questions. ') +
    errors.join(' ') + ' Nothing is stored until you press Save.',
    errors.length ? 'msg msg-bad' : 'msg msg-ok');
}

function updateAiPrompt() {
  const topic = document.getElementById('ai-topic').value.trim() || '[topic]';
  const num = Number(document.getElementById('ai-num').value) || 8;
  document.getElementById('ai-prompt').value =
`Write ${num} concept check questions on: ${topic}

Return only CSV, no commentary, with exactly this header row:
type,question,optionA,optionB,optionC,optionD,answer,maxMark

Rules:
- type is either mcq or text
- for mcq, fill all four options and put the correct letter (A, B, C or D) in answer, maxMark 1
- for text, leave the option columns empty, put a model answer in answer, and set maxMark to
  the number of marks the question is worth
- quote any field containing a comma
- mix roughly two thirds mcq and one third text
- test understanding, not recall of wording`;
}

/* ---------------- saving ---------------- */

async function save(thenOpen) {
  harvest();
  const btns = [document.getElementById('save'), document.getElementById('save-open')];
  if (isOneOff(cls)) {
    if (!set.runLabel) return note('save-note', 'Give this batch a name first.', 'savefail');
  } else if (!set.title) {
    return note('save-note', 'Give the set a title first.', 'savefail');
  }
  if (!set.questions.length) return note('save-note', 'Add at least one question.', 'savefail');
  const blank = set.questions.findIndex(q => !q.prompt);
  if (blank >= 0) return note('save-note', 'Question ' + (blank + 1) + ' has no text.', 'savefail');
  const thinMcq = set.questions.findIndex(q => q.type === 'mcq' && (q.options || []).length < 2);
  if (thinMcq >= 0) return note('save-note', 'Question ' + (thinMcq + 1) + ' needs at least two options.', 'savefail');
  // Without a correct answer a multiple choice question can never mark itself,
  // and nothing downstream would tell you, so catch it here.
  const noAnswer = set.questions.findIndex(q => q.type === 'mcq' && !key[q.id]);
  if (noAnswer >= 0) {
    return note('save-note',
      'Question ' + (noAnswer + 1) + ' has no correct answer chosen, so it could never be marked.',
      'savefail');
  }

  btns.forEach(b => b.disabled = true);
  note('save-note', 'Saving.', 'tiny');
  try {
    const body = {
      title: set.title,
      mode: set.mode,
      reveal: set.reveal,
      questions: set.questions
    };
    // The batch name only exists on a one off run, and must not be written as an
    // empty field onto an ordinary class set.
    if (isOneOff(cls)) body.runLabel = set.runLabel;
    if (!setId) {
      setId = await createSet(classId, body);
      set.id = setId;
      set.status = 'draft';
      set.resultsReleased = false;
      history.replaceState(null, '', 'set.html?c=' + encodeURIComponent(classId) + '&s=' + setId);
    } else {
      await saveSet(classId, setId, body);
    }
    await saveKey(classId, setId, key);

    if (thenOpen) {
      const patch = { status: 'open', openedAt: new Date() };
      if (set.mode === 'live') patch.liveIndex = 0;
      await saveSet(classId, setId, patch);
      Object.assign(set, patch);
    }
    await syncKeyVisibility(classId, { ...set, id: setId });

    if (thenOpen) {
      location.href = 'results.html?c=' + encodeURIComponent(classId) + '&s=' + setId;
      return;
    }
    note('save-note', 'Saved.', 'saved');
    document.getElementById('head').textContent = 'Edit question set';
  } catch (err) {
    fail('Saving', err);
    note('save-note', 'Not saved.', 'savefail');
  }
  btns.forEach(b => b.disabled = false);
}
