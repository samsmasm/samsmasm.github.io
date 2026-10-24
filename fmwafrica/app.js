// FMW Africa museum poster companion. Everything a student types is saved in
// localStorage under 'fmwafrica' (this device only).

const DUE = new Date('2026-10-30T23:59:00+07:00');

const STEPS = [
  { id: 'step-1', label: 'Set up NoodleTools', desc: 'Name it, share it with Sam' },
  { id: 'step-2', label: 'Choose and research', desc: 'Pick a country, find three academic sources' },
  { id: 'step-3', label: 'Check your sources', desc: 'Seven questions for each source' },
  { id: 'step-4', label: 'Find two images', desc: 'From the time, and saying different things' },
  { id: 'step-5', label: 'Write the thesis', desc: 'Answer the question, include resistance' },
  { id: 'step-6', label: 'Analyse your images', desc: 'OPCVL, then five sentences each' },
  { id: 'submit', label: 'Hand it in', desc: 'Poster, bibliography, OPCVLs' },
];

const COUNTRIES = [
  {
    id: 'sa', name: 'South Africa', power: 'British',
    hook: 'Diamonds, gold, and a Zulu army that beat the British once.',
    facts: [
      ['Colonial power', 'Britain, holding the Cape from 1806 and Natal from 1843.'],
      ['What changed', 'Diamonds at Kimberley (1867) and gold on the Witwatersrand (1886) made the region worth fighting for.'],
      ['Resistance', 'The Zulu kingdom defeated the British at Isandlwana (January 1879) but lost at Ulundi (July 1879). The Bambatha Rebellion (1906) was against a new tax.'],
      ['Also look at', 'The South African War (1899 to 1902), where camps held Boer and Black African civilians. The Natives Land Act (1913).'],
    ],
    search: ['Anglo-Zulu War', 'Cetshwayo', 'Mineral Revolution', 'Bambatha Rebellion', 'Natives Land Act 1913', 'migrant labour South Africa'],
    archives: ['South African History Online', 'Illustrated London News Archive', 'Punch Magazine Archive', 'Library of Congress'],
  },
  {
    id: 'et', name: 'Ethiopia', power: 'Italian',
    hook: 'The country that beat a European army and stayed independent.',
    facts: [
      ['Colonial power', 'Italy, which held neighbouring Eritrea from 1890.'],
      ['What changed', 'The Treaty of Wuchale (1889): the Italian version of Article 17 made Ethiopia a protectorate; the Amharic version did not.'],
      ['Resistance', 'Menelik II and Empress Taytu defeated Italy at the Battle of Adwa (1 March 1896). Ethiopia kept its independence.'],
      ['Also look at', 'How Menelik bought modern rifles, and how he expanded his own empire south at the same time.'],
    ],
    search: ['Battle of Adwa', 'Menelik II', 'Taytu Betul', 'Treaty of Wuchale', 'First Italo-Ethiopian War'],
    archives: ['Gallica (France)', 'Wikimedia Commons', 'Illustrated London News Archive', 'Europeana'],
  },
  {
    id: 'na', name: 'Namibia', power: 'German South West Africa',
    hook: 'Land, cattle, and the first genocide of the 20th century.',
    facts: [
      ['Colonial power', 'Germany, which declared a protectorate in 1884.'],
      ['What changed', 'German settlers took land and cattle. Rinderpest (1897) killed most of the herds.'],
      ['Resistance', 'The Herero rose in January 1904 under Samuel Maharero; the Nama under Hendrik Witbooi joined in October 1904.'],
      ['Also look at', 'The Battle of Waterberg (1904), von Trotha\'s extermination order, the camps such as Shark Island. Germany recognised it as genocide in 2021.'],
    ],
    search: ['Herero and Nama genocide', 'Samuel Maharero', 'Hendrik Witbooi', 'Lothar von Trotha', 'Shark Island camp'],
    archives: ['Wikimedia Commons', 'Europeana', 'UK National Archives', 'Library of Congress'],
  },
  {
    id: 'ml', name: 'Mali', power: 'French West Africa',
    hook: 'Samori Touré fought France for sixteen years.',
    facts: [
      ['Colonial power', 'France, pushing inland from Senegal from the 1880s. The area became the colony of French Sudan.'],
      ['What changed', 'Conquest, then forced labour, a head tax and the Dakar to Niger railway (Kayes to the Niger by 1904).'],
      ['Resistance', 'Samori Touré\'s Wassoulou empire fought France from 1882 until his capture in 1898. Sikasso (Kénédougou) fell in 1898; Ségou (Toucouleur empire) in 1890.'],
      ['Also look at', 'Timbuktu taken in 1894. How the French used African soldiers (tirailleurs).'],
    ],
    search: ['Samori Touré', 'Toucouleur Empire', 'Siege of Sikasso', 'French Sudan', 'Dakar-Niger railway', 'tirailleurs sénégalais'],
    archives: ['Gallica (France)', 'Europeana', 'Smithsonian African Art Museum', 'Wikimedia Commons'],
  },
];

const ARCHIVES = [
  ['Wikimedia Commons', 'https://commons.wikimedia.org/', 'Open image library of historical sources'],
  ['Library of Congress', 'https://www.loc.gov/pictures/', 'U.S. archive of photos and prints'],
  ['British Library', 'https://www.bl.uk/catalogues-and-collections', 'Maps, diaries, and colonial illustrations'],
  ['UK National Archives', 'https://www.nationalarchives.gov.uk/', 'Colonial Office and empire records'],
  ['Europeana', 'https://www.europeana.eu/', 'European museums’ digitized art and photos'],
  ['Illustrated London News Archive', 'https://www.iln.org.uk/', '19th-century engravings and news images'],
  ['Punch Magazine Archive', 'https://punch.photoshelter.com/', 'Satirical cartoons about empire'],
  ['New York Public Library', 'https://digitalcollections.nypl.org/', 'Global photos and historical documents'],
  ['Trove (Australia)', 'https://trove.nla.gov.au/', 'Colonial and Pacific newspapers and photos'],
  ['South African History Online', 'https://www.sahistory.org.za/', 'Images from colonial and apartheid eras'],
  ['Gallica (France)', 'https://gallica.bnf.fr/', 'French colonial maps, books, and illustrations'],
  ['Met Museum (New York)', 'https://www.metmuseum.org/art/collection', 'Art showing imperial imagery and objects'],
  ['Smithsonian African Art Museum', 'https://africa.si.edu/', 'African art in colonial contexts'],
  ['Victoria and Albert Museum', 'https://collections.vam.ac.uk/', 'British design and colonial visual culture'],
];

const SOURCE_QS = [
  'Is the author named and qualified to write about the topic?',
  'Is the publisher or website reliable (university, museum, government, or journal)?',
  'Can I tell why this source was created (to inform, persuade, record, or sell)?',
  'Does it use real evidence, facts, or data, or just opinion?',
  'Does it give clear, accurate information about the event or issue?',
  'Does it add useful insight or match what other good sources say?',
  'Could the author’s role, purpose, or context make it biased or incomplete?',
];
// For the last question "yes" is the warning answer.
const SOURCE_FLIP = 6;

const THESIS_CHECKS = [
  ['Answer', 'Does it answer the question: how did 19th century imperialism affect your country?'],
  ['Clarity', 'Is my main argument clear after one read?'],
  ['Focus', 'Does it directly answer the question or task?'],
  ['Argument', 'Does it make a claim someone could disagree with?'],
  ['Specificity', 'Does it use precise words and ideas, not vague ones like good or important?'],
  ['Resistance', 'Does it mention African resistance?'],
];

const SUBMIT_CHECKS = [
  'Poster printed, with my thesis and two images',
  'Each image has a title and its five-sentence analysis',
  'Citations in the text of the poster',
  'Bibliography: three academic sources and both images',
  'An OPCVL for image 1',
  'An OPCVL for image 2',
];

const WRITER_FIELDS = [
  { part: 'OPCVL', key: 'o', label: 'Origin', prompts: [
    'Who created the text, and if anyone else is speaking, who are they?',
    'When was it created and when was it published?',
    'Where was the author from?',
    'Where was it published?'],
    eg: 'Linley Sambourne, Punch, London, 28 November 1906.' },
  { key: 'p', label: 'Purpose', prompts: [
    'Why does this source exist and why did the creator choose this particular format?',
    'Who is the intended audience?'],
    eg: 'Pressure for reform while Parliament debated the Casement report.' },
  { key: 'c', label: 'Content', prompts: [
    'What does the source say?',
    'What do the images convey?'],
    eg: 'A snake with Leopold’s crowned head strangles a Congolese man; others flee.' },
  { key: 'v', label: 'Value', prompts: [
    'How does the source help us understand the time and place, as well as the events occurring at the time the source was created or is focusing on?',
    'How does the text help us understand the perspectives of a given time and place?',
    'How does it help us understand the perspectives of the author?'],
    eg: 'Shows how the British press framed the Congo.' },
  { key: 'l', label: 'Limitation', prompts: [
    'What is there from the time and place discussed that we cannot understand from the source?',
    'Are there limitations in the perspective that leave out important information?',
    'Could this be intentional?'],
    eg: 'A British view, not a Congolese voice. Blames one villain, not companies or other powers.' },
  { part: 'Analysis: one sentence each', key: 'ctx', label: 'Context', one: true, prompts: [
    'What is the immediate context for this artifact, referring to the country and where the artifact was published?'],
    eg: 'Published in Punch in London in November 1906, while Leopold still personally owned the Congo and Parliament was debating the Casement report.' },
  { key: 'obs', label: 'Observe', one: true, prompts: [
    'Describe what you literally see in the image.',
    'Only what you see.'],
    eg: 'A snake with Leopold’s crowned head coils around a Congolese man, while another figure carries a child away.' },
  { key: 'sym', label: 'Symbols', one: true, prompts: [
    'Explain the symbolism or the emotions produced by the image, linking this explanation to your previous observations.',
    'What stands for what?'],
    eg: 'The snake stands for both the rubber vine and Leopold himself, squeezing the life and wealth out of the Congo.' },
  { key: 'per', label: 'Perspective', one: true, prompts: [
    'Analyse the perspectives, biases, meaning, and purpose of the artifact.',
    'Who is this made for? Whose voice is missing?'],
    eg: 'Drawn by a British cartoonist for British readers, it blames Leopold alone and shows Congolese people only as helpless.' },
  { key: 'lnk', label: 'Link', one: true, prompts: [
    'Link back to your thesis statement.'],
    eg: 'Its publication in London, not Belgium, supports my thesis that international pressure helped end Leopold’s personal rule in 1908.' },
];

// ---------- storage ----------
const KEY = 'fmwafrica';
let state = {};
try { state = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { state = {}; }
state.done = state.done || {};
state.nt = state.nt || {};
state.srcs = state.srcs || [{}, {}, {}];
state.tchecks = state.tchecks || {};
state.schecks = state.schecks || {};
state.imgs = state.imgs || [{}, {}];
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode: still works, just not saved */ }
}

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 1600);
}
function copyText(text, msg) {
  const done = () => toast(msg || 'Copied');
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
  } else fallbackCopy(text, done);
}
function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { toast('Select and copy it yourself'); }
  ta.remove();
}

// ---------- router ----------
function route() {
  let id = location.hash.slice(1) || 'home';
  if (!document.querySelector(`section[data-view="${id}"]`)) id = 'home';
  document.querySelectorAll('section[data-view]').forEach(s => s.classList.toggle('show', s.dataset.view === id));

  const stepIdx = STEPS.findIndex(s => s.id === id);
  $('#stepsShell').style.display = stepIdx >= 0 ? '' : 'none';
  const tab = stepIdx >= 0 ? 'steps' : id;
  document.querySelectorAll('.tabs a').forEach(a => a.classList.toggle('active', a.dataset.tab === tab));

  if (stepIdx >= 0) {
    state.last = id;
    save();
    $('#doneBox').checked = !!state.done[id];
    const prev = STEPS[stepIdx - 1], next = STEPS[stepIdx + 1];
    $('#prevBtn').href = prev ? '#' + prev.id : '#home';
    $('#prevBtn').textContent = prev ? 'Back' : 'The task';
    $('#nextBtn').style.display = next ? '' : 'none';
    if (next) {
      $('#nextBtn').href = '#' + next.id;
      $('#nextBtn').textContent = next.id === 'submit' ? 'Hand it in' : 'Next step';
    }
    if (id === 'step-4') renderImgPicks();
    if (id === 'step-6') renderThesisPin();
  }
  renderRail(id);
  renderHomeSteps();
  window.scrollTo(0, 0);
}

function renderRail(current) {
  $('#rail').innerHTML = STEPS.map((s, i) => `
    <li><a href="#${s.id}" class="${s.id === current ? 'active' : ''} ${state.done[s.id] ? 'done' : ''}">
      <span class="n">${s.id === 'submit' ? '✓' : i + 1}</span><span class="lbl">${esc(s.label)}</span></a></li>`).join('')
    + `<li class="due">Due <strong>Fri 30 Oct</strong></li>`;
}

function renderHomeSteps() {
  $('#homeSteps').innerHTML = STEPS.map((s, i) => `
    <li><a href="#${s.id}">
      <span class="n">${s.id === 'submit' ? '✓' : i + 1}</span>
      <span class="t">${esc(s.label)}<span class="d">${esc(s.desc)}</span></span>
      <span class="tick ${state.done[s.id] ? 'on' : ''}">${state.done[s.id] ? 'done' : ''}</span>
    </a></li>`).join('');
  const firstOpen = STEPS.find(s => !state.done[s.id]);
  const btn = $('#resumeBtn');
  if (!firstOpen) { btn.href = '#submit'; btn.textContent = 'All steps done'; }
  else if (firstOpen.id === 'step-1') { btn.href = '#step-1'; btn.textContent = 'Start step 1'; }
  else { btn.href = '#' + firstOpen.id; btn.textContent = 'Carry on: ' + firstOpen.label.toLowerCase(); }
}

function renderCountdown() {
  const days = Math.ceil((DUE - new Date()) / 86400000);
  const el = $('#countdown'), sub = $('#countdownSub');
  if (days > 1) { el.textContent = days + ' days'; sub.textContent = 'until Friday 30 October'; }
  else if (days === 1) { el.textContent = 'Tomorrow'; sub.textContent = 'Friday 30 October'; }
  else if (days === 0) { el.textContent = 'Today'; sub.textContent = 'Friday 30 October'; }
  else { el.textContent = 'Fri 30 Oct'; sub.textContent = 'The deadline has passed'; }
}

$('#doneBox').addEventListener('change', e => {
  const id = location.hash.slice(1);
  state.done[id] = e.target.checked;
  save();
  renderRail(id);
  renderHomeSteps();
  if (e.target.checked) toast('Nice. On to the next one.');
});

// ---------- step 1: NoodleTools ----------
function renderNT() {
  const clean = s => (s || '').replace(/[^A-Za-zÀ-ɏ'-]/g, '');
  const first = clean(state.nt.first), last = clean(state.nt.last), block = state.nt.block || 'E';
  const name = `sgraham-${block}-africa-${first || 'First'}${last || 'Last'}`;
  $('#ntName').textContent = name;
  $('#ntShare').textContent = `FMW Block ${block} Africa 26`;
}
['first', 'last', 'block'].forEach(k => {
  const el = $('#nt' + k[0].toUpperCase() + k.slice(1));
  el.value = state.nt[k] || '';
  el.addEventListener('input', () => { state.nt[k] = el.value; save(); renderNT(); });
});
$('#ntCopy').addEventListener('click', () => copyText($('#ntName').textContent, 'Project name copied'));

// ---------- step 2: countries ----------
function renderCountries() {
  $('#countries').innerHTML = COUNTRIES.map(c => `
    <button class="country ${state.country === c.id ? 'picked' : ''}" data-c="${c.id}">
      <span class="cn">${c.name}</span>
      <span class="who">${c.power}</span>
      ${esc(c.hook)}
      ${state.country === c.id ? '<br><span class="pickmark">Your country</span>' : ''}
    </button>`).join('');
  const c = COUNTRIES.find(x => x.id === state.country);
  $('#countryDetail').innerHTML = c ? `
    <div class="box cdetail">
      <h3>${c.name}: a starting point</h3>
      <p class="small" style="margin-top:0">Just enough to know what to search for. Your three academic sources do the real work.</p>
      <dl>${c.facts.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      <p class="searchwords" style="margin:12px 0 0"><span class="label">Search Britannica for</span><br>
        ${c.search.map(w => `<a href="https://www.britannica.com/search?query=${encodeURIComponent(w)}" target="_blank" rel="noopener">${esc(w)}</a>`).join(' · ')}</p>
    </div>` : `<p class="small">Tap a country to see a starting point. You can change your mind.</p>`;
  document.querySelectorAll('.country').forEach(b => b.addEventListener('click', () => {
    state.country = state.country === b.dataset.c ? null : b.dataset.c;
    save();
    renderCountries();
  }));
}

// ---------- step 3: source checker ----------
function renderSrcs() {
  $('#srcs').innerHTML = state.srcs.map((s, i) => `
    <div class="box src" data-i="${i}">
      <h3>Source ${i + 1}</h3>
      <input type="text" class="src-name" placeholder="Title, author, or link" value="${esc(s.name || '')}">
      <ul class="qs">${SOURCE_QS.map((q, j) => {
        const a = (s.a || {})[j];
        return `<li><span>${esc(q)}</span><span class="yn" data-j="${j}">
          <button class="${a === 'y' ? (j === SOURCE_FLIP ? 'on-no' : 'on-yes') : ''}" data-v="y">Yes</button>
          <button class="${a === 'n' ? (j === SOURCE_FLIP ? 'on-yes' : 'on-no') : ''}" data-v="n">No</button></span></li>`;
      }).join('')}</ul>
      <div class="verdict">${srcVerdict(s)}</div>
    </div>`).join('');
  document.querySelectorAll('.src').forEach(box => {
    const i = +box.dataset.i;
    $('.src-name', box).addEventListener('input', e => { state.srcs[i].name = e.target.value; save(); });
    box.querySelectorAll('.yn button').forEach(b => b.addEventListener('click', () => {
      const j = b.parentElement.dataset.j;
      state.srcs[i].a = state.srcs[i].a || {};
      state.srcs[i].a[j] = state.srcs[i].a[j] === b.dataset.v ? undefined : b.dataset.v;
      save();
      renderSrcs();
    }));
  });
}
function srcVerdict(s) {
  const a = s.a || {};
  const answered = SOURCE_QS.filter((_, j) => a[j]).length;
  if (!answered) return '';
  const flags = SOURCE_QS.filter((_, j) => (j === SOURCE_FLIP ? a[j] === 'y' : a[j] === 'n')).length;
  if (answered < SOURCE_QS.length) return `${answered} of ${SOURCE_QS.length} answered.`;
  if (!flags) return '<b>Looks solid.</b> Note the author and publisher for your bibliography.';
  return `<b>${flags} thing${flags > 1 ? 's' : ''} to watch.</b> You can still use it: explain ${flags > 1 ? 'them' : 'it'} in your Value and Limitation.`;
}

// ---------- step 4: images ----------
function renderImgPicks() {
  const c = COUNTRIES.find(x => x.id === state.country);
  $('#imgPicks').innerHTML = c
    ? `<p class="small">Good places to start for <b>${c.name}</b> are marked first.</p>`
    : `<p class="small">Choose your country in <a href="#step-2">step 2</a> and the best archives for it will be marked here.</p>`;
  const picks = c ? c.archives : [];
  const sorted = [...ARCHIVES].sort((a, b) => {
    const ia = picks.indexOf(a[0]), ib = picks.indexOf(b[0]);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  $('#archives').innerHTML = `<li><a href="https://sites.google.com/ssis.edu.vn/library/hs-research-sources/african-imperialism-9fmw?authuser=0" target="_blank" rel="noopener">SSIS library suggestions</a><span>Start here if you haven’t stumbled on images yet.</span></li>`
    + sorted.map(([n, u, d]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(n)}</a><span>${picks.includes(n) ? `<span class="star">Good for ${c.name}</span> · ` : ''}${esc(d)}</span></li>`).join('');
}

// ---------- step 5: thesis ----------
const thesisEl = $('#thesis');
thesisEl.value = state.thesis || '';
thesisEl.addEventListener('input', () => { state.thesis = thesisEl.value; save(); });

function renderChecks(listEl, items, store, labelFn) {
  listEl.innerHTML = items.map((it, i) => `<li><label><input type="checkbox" data-i="${i}" ${store[i] ? 'checked' : ''}> <span>${labelFn(it)}</span></label></li>`).join('');
  listEl.querySelectorAll('input').forEach(cb => cb.addEventListener('change', () => { store[cb.dataset.i] = cb.checked; save(); }));
}
renderChecks($('#thesisChecks'), THESIS_CHECKS, state.tchecks, ([k, v]) => `<b>${k}.</b> ${esc(v)}`);
renderChecks($('#submitChecks'), SUBMIT_CHECKS, state.schecks, esc);

// ---------- step 6: writer ----------
let curImg = 0;
function renderThesisPin() {
  const t = (state.thesis || '').trim();
  $('#thesisPin').innerHTML = t ? `<b>Your thesis</b>${esc(t)}` : `<b>Your thesis</b><a href="#step-5">Write it in step 5</a> first, so you can link back to it.`;
}
function sentences(text) {
  return (text.trim().match(/[^.!?]+[.!?]+(\s|$)/g) || (text.trim() ? [text] : [])).length;
}
function renderWriter() {
  const d = state.imgs[curImg];
  let html = `<div class="field" style="border-bottom:none"><div>
      <label class="fl" for="w-title">Image title and description</label>
      <input type="text" id="w-title" data-k="title" value="${esc(d.title || '')}" placeholder="e.g. 1906 cartoon of Leopold II as a snake">
    </div><div class="prompts">Give it a title for your poster, as in the exemplar.</div></div>`;
  WRITER_FIELDS.forEach(f => {
    if (f.part) html += `<h3 class="part">${f.part}</h3>`;
    html += `<div class="field"><div>
        <label class="fl" for="w-${f.key}">${f.label}</label>
        <textarea id="w-${f.key}" data-k="${f.key}" rows="${f.one ? 2 : 3}">${esc(d[f.key] || '')}</textarea>
        <div class="meta" data-meta="${f.key}"></div>
      </div><div class="prompts">
        <ul>${f.prompts.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
        <details><summary>See an example</summary><p class="eg">${esc(f.eg)}</p></details>
      </div></div>`;
  });
  $('#writer').innerHTML = html;
  $('#writer').querySelectorAll('[data-k]').forEach(el => {
    el.addEventListener('input', () => { state.imgs[curImg][el.dataset.k] = el.value; save(); meta(el); grow(el); });
    meta(el);
    grow(el);
  });
}
function meta(el) {
  const f = WRITER_FIELDS.find(x => x.key === el.dataset.k);
  const m = $(`[data-meta="${el.dataset.k}"]`);
  if (!f || !m) return;
  const words = el.value.trim() ? el.value.trim().split(/\s+/).length : 0;
  if (f.one) {
    const n = sentences(el.value);
    m.textContent = n ? `${n} sentence${n > 1 ? 's' : ''} · aim for one` : 'One sentence';
    m.classList.toggle('long', n > 2);
  } else m.textContent = words ? `${words} words` : '';
}
function grow(el) {
  if (el.tagName !== 'TEXTAREA') return;
  el.style.height = 'auto';
  el.style.height = Math.max(el.scrollHeight + 4, 64) + 'px';
}
document.querySelectorAll('.imgtabs button').forEach(b => b.addEventListener('click', () => {
  curImg = +b.dataset.img;
  document.querySelectorAll('.imgtabs button').forEach(x => x.classList.toggle('active', x === b));
  renderWriter();
}));
$('#copyImg').addEventListener('click', () => {
  const d = state.imgs[curImg];
  const lines = [`IMAGE ${curImg + 1}: ${d.title || ''}`, '', 'OPCVL'];
  WRITER_FIELDS.forEach(f => {
    if (f.key === 'ctx') lines.push('', 'ANALYSIS');
    lines.push(`${f.label}: ${(d[f.key] || '').trim()}`);
  });
  copyText(lines.join('\n'), `Image ${curImg + 1} copied. Paste it into your doc.`);
});

// ---------- examples ----------
$('#nsalaShow').addEventListener('click', () => { $('#nsalaCw').hidden = true; $('#nsalaImg').hidden = false; });

// ---------- go ----------
renderNT();
renderCountries();
renderSrcs();
renderWriter();
renderCountdown();
window.addEventListener('hashchange', route);
route();
