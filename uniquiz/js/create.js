import { db } from './firebase.js';
import { initAuthOverlay } from './auth.js';
import {
  ref, push, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

let questions = [];

initAuthOverlay(() => {
  document.getElementById('main-content').classList.remove('hidden');
  setup();
});

function setup() {
  document.getElementById('add-q-btn').addEventListener('click', addQuestion);
  document.getElementById('save-btn').addEventListener('click', saveQuiz);
  document.getElementById('clear-all-btn').addEventListener('click', clearAll);

  // ── Tabs ──
  document.getElementById('tab-manual-btn').addEventListener('click', () => switchTab('manual'));
  document.getElementById('tab-csv-btn').addEventListener('click',    () => switchTab('csv'));

  ['opt-a','opt-b','opt-c','opt-d'].forEach((id, i, arr) => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const next = arr[i + 1] ? document.getElementById(arr[i + 1]) : document.getElementById('correct-ans');
        next?.focus();
      }
    });
  });

  // ── AI prompt generator ──
  const topicEl = document.getElementById('ai-topic');
  const numEl   = document.getElementById('ai-num');
  const promptEl = document.getElementById('ai-prompt');

  function updatePrompt() {
    const topic = topicEl.value.trim() || '[your topic here]';
    const num   = parseInt(numEl.value) || 10;
    promptEl.value = buildPrompt(topic, num);
  }

  document.getElementById('gen-prompt-btn').addEventListener('click', updatePrompt);
  topicEl.addEventListener('input', updatePrompt);
  numEl.addEventListener('input', updatePrompt);

  document.getElementById('copy-prompt-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(promptEl.value).then(() => {
      const btn = document.getElementById('copy-prompt-btn');
      btn.textContent = '✓ Copied!';
      btn.classList.add('btn-success');
      setTimeout(() => { btn.textContent = 'Copy prompt'; btn.classList.remove('btn-success'); }, 2000);
    });
  });

  // ── CSV file drop / browse ──
  const csvDrop  = document.getElementById('csv-drop');
  const csvInput = document.getElementById('csv-input');

  document.getElementById('csv-browse').addEventListener('click', () => csvInput.click());
  csvInput.addEventListener('change', e => { if (e.target.files[0]) parseCSVFile(e.target.files[0]); });

  csvDrop.addEventListener('dragover',  e => { e.preventDefault(); csvDrop.classList.add('dragover'); });
  csvDrop.addEventListener('dragleave', () => csvDrop.classList.remove('dragover'));
  csvDrop.addEventListener('drop', e => {
    e.preventDefault();
    csvDrop.classList.remove('dragover');
    if (e.dataTransfer.files[0]) parseCSVFile(e.dataTransfer.files[0]);
  });
  csvDrop.addEventListener('click', e => {
    if (e.target !== document.getElementById('csv-browse')) csvInput.click();
  });

  // ── CSV paste ──
  document.getElementById('csv-import-btn').addEventListener('click', () => {
    const text = document.getElementById('csv-paste').value.trim();
    if (!text) return;
    parseCSVText(text);
  });
}

// ── Tab switching ──
function switchTab(tab) {
  document.getElementById('tab-manual').classList.toggle('hidden', tab !== 'manual');
  document.getElementById('tab-csv').classList.toggle('hidden',    tab !== 'csv');
  document.getElementById('tab-manual-btn').classList.toggle('active', tab === 'manual');
  document.getElementById('tab-csv-btn').classList.toggle('active',    tab === 'csv');
}

// ── AI prompt template ──
function buildPrompt(topic, num) {
  return `Generate ${num} multiple-choice quiz questions about: ${topic}

Return ONLY a CSV block with no other text. Use this exact header row:
question,optionA,optionB,optionC,optionD,correctAnswer

Rules:
- correctAnswer must be exactly A, B, C, or D
- Do not use commas inside any cell — rewrite with semicolons if needed
- Include the header row exactly as shown above
- No numbering, markdown formatting, or explanation — just the CSV

Example row:
What is the law of demand?,Quantity demanded rises as price falls,Quantity demanded rises as price rises,Quantity demanded falls as price rises,Demand is unaffected by price,A`;
}

// ── Manual question entry ──
function addQuestion() {
  const text    = document.getElementById('q-text').value.trim();
  const optA    = document.getElementById('opt-a').value.trim();
  const optB    = document.getElementById('opt-b').value.trim();
  const optC    = document.getElementById('opt-c').value.trim();
  const optD    = document.getElementById('opt-d').value.trim();
  const correct = document.getElementById('correct-ans').value;
  const errEl   = document.getElementById('add-err');

  if (!text)                      { showErr(errEl, 'Question text is required.'); return; }
  if (!optA||!optB||!optC||!optD) { showErr(errEl, 'All four options are required.'); return; }
  if (!correct)                   { showErr(errEl, 'Select the correct answer.'); return; }

  errEl.classList.add('hidden');
  questions.push({ text, options: [
    {id:'A', text:optA}, {id:'B', text:optB},
    {id:'C', text:optC}, {id:'D', text:optD}
  ], correctAnswer: correct });

  render();
  clearForm();
  document.getElementById('q-text').focus();
}

function clearForm() {
  ['q-text','opt-a','opt-b','opt-c','opt-d'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('correct-ans').value = '';
}

// ── CSV parsing (shared logic) ──
function handleParsed({ data }, source) {
  const errContainer = document.getElementById('csv-errs');
  const okEl = document.getElementById('csv-ok');
  errContainer.innerHTML = '';
  okEl.classList.add('hidden');

  const errors = [];
  const parsed = [];

  data.forEach((row, i) => {
    const n       = i + 2;
    const q       = (row.question || '').trim();
    const a       = (row.optionA || '').trim();
    const b       = (row.optionB || '').trim();
    const c       = (row.optionC || '').trim();
    const d       = (row.optionD || '').trim();
    const correct = (row.correctAnswer || '').trim().toUpperCase();

    if (!q)                    { errors.push(`Row ${n}: question is empty.`); return; }
    if (!a||!b||!c||!d)        { errors.push(`Row ${n}: one or more options are empty.`); return; }
    if (!['A','B','C','D'].includes(correct)) {
      errors.push(`Row ${n}: correctAnswer "${row.correctAnswer}" must be A, B, C, or D.`); return;
    }

    parsed.push({ text: q, options: [
      {id:'A',text:a},{id:'B',text:b},{id:'C',text:c},{id:'D',text:d}
    ], correctAnswer: correct });
  });

  if (errors.length) {
    errContainer.innerHTML = errors.map(e => `<div class="csv-err-item">${esc(e)}</div>`).join('');
  }

  if (parsed.length) {
    questions.push(...parsed);
    render();
    okEl.textContent = `${parsed.length} question${parsed.length > 1 ? 's' : ''} imported.`;
    okEl.classList.remove('hidden');
    if (source === 'paste') document.getElementById('csv-paste').value = '';
  }
}

function parseCSVFile(file) {
  window.Papa.parse(file, {
    header: true, skipEmptyLines: true,
    complete: result => handleParsed(result, 'file'),
    error: err => {
      document.getElementById('csv-errs').innerHTML =
        `<div class="csv-err-item">Failed to parse file: ${esc(err.message)}</div>`;
    }
  });
}

function parseCSVText(text) {
  window.Papa.parse(text, {
    header: true, skipEmptyLines: true,
    complete: result => handleParsed(result, 'paste'),
    error: err => {
      document.getElementById('csv-errs').innerHTML =
        `<div class="csv-err-item">Failed to parse text: ${esc(err.message)}</div>`;
    }
  });
}

// ── Question list rendering ──
function render() {
  const listEl   = document.getElementById('q-list');
  const countEl  = document.getElementById('q-count');
  const emptyEl  = document.getElementById('q-empty');
  const clearBtn = document.getElementById('clear-all-btn');
  const saveBtn  = document.getElementById('save-btn');

  countEl.textContent = questions.length;
  clearBtn.classList.toggle('hidden', questions.length === 0);
  saveBtn.disabled = questions.length === 0;

  if (questions.length === 0) {
    if (emptyEl) emptyEl.style.display = '';
    listEl.querySelectorAll('.q-item').forEach(el => el.remove());
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  listEl.innerHTML = questions.map((q, i) => `
    <div class="q-item">
      <div class="q-num">${i + 1}</div>
      <div class="q-body">
        <div class="q-text">${esc(q.text)}</div>
        <div class="q-opts">
          ${q.options.map(o => `
            <span class="opt-chip ${o.id === q.correctAnswer ? 'correct' : ''}">
              ${o.id === q.correctAnswer ? '✓ ' : ''}${esc(o.text)}
            </span>
          `).join('')}
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" data-i="${i}" style="flex-shrink:0;padding:0.25rem 0.5rem;">✕</button>
    </div>
  `).join('');

  listEl.querySelectorAll('[data-i]').forEach(btn => {
    btn.addEventListener('click', () => {
      questions.splice(Number(btn.dataset.i), 1);
      render();
    });
  });
}

function clearAll() {
  if (!confirm('Remove all questions?')) return;
  questions = [];
  render();
}

// ── Save ──
async function saveQuiz() {
  const title   = document.getElementById('quiz-title').value.trim();
  const errEl   = document.getElementById('save-err');
  const saveBtn = document.getElementById('save-btn');

  if (!title)            { showErr(errEl, 'Enter a quiz title.'); return; }
  if (!questions.length) { showErr(errEl, 'Add at least one question.'); return; }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';
  errEl.classList.add('hidden');

  const timeLimit = Math.max(0, parseInt(document.getElementById('time-limit').value) || 0);
  const data = { title, questions, timeLimit, createdAt: serverTimestamp() };
  if (document.getElementById('p-96h').checked) {
    data.deleteAfter = Date.now() + 96 * 3600 * 1000;
  }

  try {
    await push(ref(db, 'uq/quizzes'), data);
    window.location.href = 'teacher.html';
  } catch (err) {
    showErr(errEl, `Failed to save: ${err.message}`);
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Quiz';
  }
}

function showErr(el, msg) { el.textContent = msg; el.classList.remove('hidden'); }

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
