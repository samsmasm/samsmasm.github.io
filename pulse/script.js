import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBGdNJgl1PG0IueYQk_jjn4cOg-sMFbHe0",
    authDomain: "dowserboard.firebaseapp.com",
    projectId: "dowserboard",
    storageBucket: "dowserboard.firebasestorage.app",
    messagingSenderId: "1032600748722",
    appId: "1:1032600748722:web:1584c7508fbbca617cbfab"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ==========================================
// STATE
// ==========================================

let currentRoom = null;
let config = null;
let responses = {};
let isRevealed = false;
let varCount = 1;
let canvas, ctx, canvasW, canvasH;
let dotPositions = [];
let qrGenerated = false;

// Choose mode state
let newRoomMode = 'plot';
let maxVotes = 1;
let blobPositions = {};
let allOptions = {};
let chooseResponses = {};
let studentVotes = new Set();

const views = {
    landing: document.getElementById('view-landing'),
    teacher: document.getElementById('view-teacher'),
    student: document.getElementById('view-student'),
};

// ==========================================
// INIT
// ==========================================

window.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash.substring(1).toUpperCase();
    const role = new URLSearchParams(window.location.search).get('role');

    // Tab buttons
    document.getElementById('tab-teacher').addEventListener('click', () => showTab('teacher'));
    document.getElementById('tab-student').addEventListener('click', () => showTab('student'));

    // Var count buttons (plot mode)
    document.querySelectorAll('.var-count-btn').forEach(btn => {
        btn.addEventListener('click', () => setVarCount(parseInt(btn.dataset.n)));
    });

    // Mode selector (Plot / Choose)
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => setNewRoomMode(btn.dataset.mode));
    });

    // Vote count buttons (choose setup)
    document.querySelectorAll('.vote-count-btn').forEach(btn => {
        btn.addEventListener('click', () => setMaxVotes(parseInt(btn.dataset.v)));
    });

    // Add option row button (teacher choose setup)
    document.getElementById('btn-add-option').addEventListener('click', () => addOptionRow(''));

    // Landing actions
    document.getElementById('btn-start').addEventListener('click', startSession);
    document.getElementById('btn-rejoin').addEventListener('click', rejoinSession);
    document.getElementById('btn-join').addEventListener('click', joinSession);

    // Teacher controls
    document.getElementById('btn-reveal').addEventListener('click', toggleReveal);
    document.getElementById('btn-qr').addEventListener('click', toggleQR);
    document.getElementById('btn-csv').addEventListener('click', exportCSV);
    document.getElementById('btn-delete').addEventListener('click', deleteBoard);
    document.getElementById('btn-leave').addEventListener('click', leaveRoom);

    // Student plot submit
    document.getElementById('btn-submit').addEventListener('click', submitResponse);

    // Student choose submit + add option
    document.getElementById('btn-submit-choose').addEventListener('click', submitChooseResponse);
    document.getElementById('btn-add-student-opt').addEventListener('click', addStudentOption);

    // Canvas setup
    canvas = document.getElementById('chart');
    ctx = canvas.getContext('2d');
    canvas.addEventListener('mousemove', handleHover);
    canvas.addEventListener('mouseleave', () => document.getElementById('tip').classList.add('hidden'));
    window.addEventListener('resize', resizeCanvas);

    // Initial UI state
    setVarCount(1);
    initOptionRows();

    // Direct URL navigation
    if (hash) {
        currentRoom = hash;
        if (role === 'teacher') {
            document.getElementById('r-room-input').value = hash;
            showTab('teacher');
        } else {
            initStudentMode();
        }
    }
});

// ==========================================
// LANDING — TABS & VARIABLE CONFIG
// ==========================================

function showTab(tab) {
    document.getElementById('panel-teacher').classList.toggle('hidden', tab !== 'teacher');
    document.getElementById('panel-student').classList.toggle('hidden', tab !== 'student');
    document.getElementById('tab-teacher').classList.toggle('active', tab === 'teacher');
    document.getElementById('tab-student').classList.toggle('active', tab === 'student');
}

function setVarCount(n) {
    varCount = n;
    document.querySelectorAll('.var-count-btn').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.n) === n);
    });
    renderVarConfigRows(n);
}

function renderVarConfigRows(n) {
    const saved = [0, 1, 2].map(i => ({
        label: document.getElementById(`vl-${i}`)?.value ?? '',
        min:   document.getElementById(`vmin-${i}`)?.value ?? '0',
        max:   document.getElementById(`vmax-${i}`)?.value ?? '10',
    }));

    const axisNames = ['X axis', 'Y axis', 'Colour'];
    const container = document.getElementById('var-config-rows');
    container.innerHTML = '';
    for (let i = 0; i < n; i++) {
        const title = n === 1 ? 'Variable' : `Variable ${i + 1} (${axisNames[i]})`;
        const div = document.createElement('div');
        div.className = 'var-block';
        div.innerHTML = `
            <div class="var-block-title">${title}</div>
            <div class="field-group">
                <label>Label</label>
                <input type="text" id="vl-${i}" placeholder="e.g. Confidence">
            </div>
            <div class="mini-row">
                <div class="field-group">
                    <label>Min</label>
                    <input type="number" id="vmin-${i}" value="0">
                </div>
                <div class="field-group">
                    <label>Max</label>
                    <input type="number" id="vmax-${i}" value="10">
                </div>
            </div>
        `;
        container.appendChild(div);
        document.getElementById(`vl-${i}`).value   = saved[i].label;
        document.getElementById(`vmin-${i}`).value = saved[i].min;
        document.getElementById(`vmax-${i}`).value = saved[i].max;
    }
}

function setNewRoomMode(mode) {
    newRoomMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.mode === mode);
    });
    document.getElementById('plot-setup').classList.toggle('hidden', mode !== 'plot');
    document.getElementById('choose-setup').classList.toggle('hidden', mode !== 'choose');
}

// ==========================================
// CHOOSE SETUP (teacher landing)
// ==========================================

function initOptionRows() {
    document.getElementById('option-input-rows').innerHTML = '';
    addOptionRow('');
    addOptionRow('');
}

function addOptionRow(value) {
    const rows = document.getElementById('option-input-rows');
    if (rows.children.length >= 15) return;
    const idx = rows.children.length + 1;
    const row = document.createElement('div');
    row.className = 'option-input-row';
    row.innerHTML = `
        <input type="text" class="option-text-input" placeholder="Option ${idx}">
        <button class="btn-remove-opt" title="Remove">×</button>
    `;
    if (value) row.querySelector('.option-text-input').value = value;
    row.querySelector('.btn-remove-opt').addEventListener('click', () => {
        if (document.getElementById('option-input-rows').children.length > 1) {
            row.remove();
        }
    });
    rows.appendChild(row);
}

function setMaxVotes(v) {
    maxVotes = v;
    document.querySelectorAll('.vote-count-btn').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.v) === v);
    });
}

// ==========================================
// TEACHER SETUP
// ==========================================

async function startSession() {
    const room = document.getElementById('t-room-input').value.trim().toUpperCase();
    const pin = document.getElementById('t-pin-input').value.trim();
    if (!room) return alert("Please enter a room name.");
    if (!pin) return alert("Please enter a PIN.");

    const existing = await get(ref(db, `pulse/${room}/config`));
    if (existing.exists()) {
        return alert("A room with this name already exists. Use 'Rejoin Room' to return to it, or choose a different name.");
    }

    config = {
        mode: newRoomMode,
        anonymity: document.getElementById('t-anonymity').value,
        reveal: document.getElementById('t-reveal').value,
        pin,
    };

    if (newRoomMode === 'plot') {
        const variables = [];
        for (let i = 0; i < varCount; i++) {
            const label = document.getElementById(`vl-${i}`).value.trim() || `Variable ${i + 1}`;
            const min = parseFloat(document.getElementById(`vmin-${i}`).value) || 0;
            let max = parseFloat(document.getElementById(`vmax-${i}`).value) || 10;
            if (max <= min) max = min + 1;
            variables.push({ label, min, max });
        }
        config.variables = variables;
    } else {
        const rows = document.getElementById('option-input-rows').children;
        const options = {};
        let idx = 0;
        for (const row of rows) {
            const label = row.querySelector('.option-text-input').value.trim();
            if (label) options[`t_${idx++}`] = label;
        }
        if (!Object.keys(options).length) return alert("Please add at least one option.");
        config.options = options;
        config.maxVotes = maxVotes;
        config.allowStudentOptions = document.getElementById('allow-student-options').checked;
    }

    currentRoom = room;
    await set(ref(db, `pulse/${room}/config`), config);
    initTeacherMode();
}

async function rejoinSession() {
    const room = document.getElementById('r-room-input').value.trim().toUpperCase();
    const pin = document.getElementById('r-pin-input').value.trim();
    if (!room) return alert("Please enter a room name.");
    if (!pin) return alert("Please enter your PIN.");

    const snap = await get(ref(db, `pulse/${room}/config`));
    if (!snap.exists()) return alert("Room not found. Check the room name.");
    if (snap.val().pin !== pin) return alert("Incorrect PIN.");

    config = snap.val();
    currentRoom = room;
    initTeacherMode();
}

// ==========================================
// TEACHER MODE
// ==========================================

function initTeacherMode() {
    switchView('teacher');
    document.getElementById('t-room-label').textContent = currentRoom;
    window.history.replaceState(null, '', `?role=teacher#${currentRoom.toLowerCase()}`);

    isRevealed = config.reveal === 'live';
    updateRevealBtn();

    if (!qrGenerated) {
        const url = `https://unisam.nz/pulse/#${currentRoom.toLowerCase()}`;
        document.getElementById('qr-url-text').textContent = url;
        new QRCode(document.getElementById('qrcode'), { text: url, width: 300, height: 300 });
        qrGenerated = true;
    }

    if (config.mode === 'choose') {
        document.getElementById('plot-content').classList.add('hidden');
        document.getElementById('choose-content').classList.remove('hidden');
        initChooseTeacher();
    } else {
        document.getElementById('plot-content').classList.remove('hidden');
        document.getElementById('choose-content').classList.add('hidden');
        onValue(ref(db, `pulse/${currentRoom}/responses`), (snap) => {
            responses = snap.val() || {};
            const n = Object.keys(responses).length;
            document.getElementById('t-count').textContent = `${n} response${n !== 1 ? 's' : ''}`;
            redraw();
        });
        resizeCanvas();
    }
}

function updateRevealBtn() {
    const btn = document.getElementById('btn-reveal');
    const isChoose = config && config.mode === 'choose';
    btn.textContent = isRevealed
        ? (isChoose ? 'Hide Counts' : 'Hide Dots')
        : (isChoose ? 'Show Counts' : 'Show Dots');
    btn.classList.toggle('active', isRevealed);
}

function toggleReveal() {
    isRevealed = !isRevealed;
    updateRevealBtn();
    if (config && config.mode === 'choose') {
        renderBlobs(document.getElementById('blob-canvas'));
    } else {
        redraw();
    }
}

function toggleQR() {
    const panel = document.getElementById('qr-panel');
    panel.classList.toggle('hidden');
    document.getElementById('btn-qr').classList.toggle('active', !panel.classList.contains('hidden'));
    if (!config || config.mode !== 'choose') {
        setTimeout(resizeCanvas, 10);
    }
}

async function deleteBoard() {
    if (!confirm("Delete this board? This will remove all responses and config and cannot be undone.")) return;
    await remove(ref(db, `pulse/${currentRoom}`));
    leaveRoom();
}

function leaveRoom() {
    window.location.href = window.location.pathname;
}

function exportCSV() {
    if (config && config.mode === 'choose') {
        exportChooseCSV();
        return;
    }
    const rows = Object.values(responses);
    if (!rows.length) return alert("No responses yet.");
    const headers = config.variables.map(v => `"${v.label}"`);
    if (config.anonymity !== 'anonymous') headers.push('"Name"');
    let csv = headers.join(',') + '\n';
    rows.forEach(r => {
        const vals = r.values.map(v => v);
        if (config.anonymity !== 'anonymous') vals.push(`"${(r.name || '').replace(/"/g, '""')}"`);
        csv += vals.join(',') + '\n';
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `pulse-${currentRoom}.csv`;
    a.click();
}

function exportChooseCSV() {
    const rows = Object.entries(chooseResponses);
    if (!rows.length) return alert("No responses yet.");
    const optLabels = {};
    Object.entries(allOptions).forEach(([k, o]) => { optLabels[k] = o.label; });
    let csv = '"Votes"' + (config.anonymity !== 'anonymous' ? ',"Name"' : '') + '\n';
    rows.forEach(([, r]) => {
        const votes = (r.votes || []).map(k => optLabels[k] || k).join('; ');
        let row = `"${votes}"`;
        if (config.anonymity !== 'anonymous') row += `,"${(r.name || '').replace(/"/g, '""')}"`;
        csv += row + '\n';
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `pulse-${currentRoom}-choose.csv`;
    a.click();
}

// ==========================================
// CHOOSE — TEACHER VIEW (BLOBS)
// ==========================================

function initChooseTeacher() {
    const blobCanvas = document.getElementById('blob-canvas');
    blobCanvas.innerHTML = '';
    blobPositions = {};
    allOptions = {};
    chooseResponses = {};

    // Build teacher-defined options (static, from config)
    Object.entries(config.options || {}).forEach(([key, label]) => {
        allOptions[key] = { label, studentAdded: false };
    });

    // Listen for student-added options (real-time)
    onValue(ref(db, `pulse/${currentRoom}/studentOptions`), (snap) => {
        const studentOpts = snap.val() || {};
        // Remove deleted student options
        Object.keys(allOptions).forEach(k => {
            if (allOptions[k].studentAdded && !studentOpts[k]) delete allOptions[k];
        });
        // Add new student options
        Object.entries(studentOpts).forEach(([key, opt]) => {
            if (!allOptions[key]) allOptions[key] = { label: opt.label, studentAdded: true };
        });
        renderBlobs(blobCanvas);
    });

    // Listen for student responses (votes)
    onValue(ref(db, `pulse/${currentRoom}/responses`), (snap) => {
        chooseResponses = snap.val() || {};
        const n = Object.keys(chooseResponses).length;
        document.getElementById('t-count').textContent = `${n} response${n !== 1 ? 's' : ''}`;
        renderBlobs(blobCanvas);
    });
}

function renderBlobs(container) {
    // Count votes per option
    const counts = {};
    Object.keys(allOptions).forEach(k => { counts[k] = 0; });
    if (isRevealed) {
        Object.values(chooseResponses).forEach(r => {
            (r.votes || []).forEach(k => { if (k in counts) counts[k]++; });
        });
    }

    // Track existing blob elements
    const existingEls = {};
    container.querySelectorAll('[data-blob-key]').forEach(el => {
        existingEls[el.getAttribute('data-blob-key')] = el;
    });

    // Remove stale blobs
    Object.keys(existingEls).forEach(k => {
        if (!allOptions[k]) existingEls[k].remove();
    });

    // Create or update
    Object.entries(allOptions).forEach(([key, opt], idx) => {
        const count = counts[key] || 0;
        const size = blobSize(count);
        if (existingEls[key]) {
            updateBlobElement(existingEls[key], count, size);
        } else {
            const el = createBlobElement(key, opt.label, opt.studentAdded, count, size, idx, container);
            container.appendChild(el);
        }
    });
}

function blobSize(count) {
    return Math.max(100, Math.min(220, 100 + count * 14));
}

function createBlobElement(key, label, studentAdded, count, size, idx, container) {
    const wrap = document.createElement('div');
    wrap.className = 'blob-wrap';
    wrap.setAttribute('data-blob-key', key);

    if (!blobPositions[key]) {
        blobPositions[key] = defaultBlobPosition(idx, container);
    }
    wrap.style.left = blobPositions[key].left + 'px';
    wrap.style.top = blobPositions[key].top + 'px';

    const circle = document.createElement('div');
    circle.className = 'blob' + (studentAdded ? ' student-added' : '');
    circle.style.width = size + 'px';
    circle.style.height = size + 'px';

    const countEl = document.createElement('div');
    countEl.className = 'blob-count';
    countEl.textContent = isRevealed ? count : '–';
    circle.appendChild(countEl);

    wrap.appendChild(circle);

    const labelEl = document.createElement('div');
    labelEl.className = 'blob-label';
    labelEl.textContent = label;
    wrap.appendChild(labelEl);

    if (studentAdded) {
        const del = document.createElement('button');
        del.className = 'blob-delete';
        del.innerHTML = '✕';
        del.title = 'Delete this option';
        del.addEventListener('click', e => {
            e.stopPropagation();
            deleteStudentOption(key);
        });
        wrap.appendChild(del);
    }

    setupBlobDrag(wrap, key);
    return wrap;
}

function updateBlobElement(el, count, size) {
    const circle = el.querySelector('.blob');
    const countEl = el.querySelector('.blob-count');
    circle.style.width = size + 'px';
    circle.style.height = size + 'px';
    countEl.textContent = isRevealed ? count : '–';
}

function defaultBlobPosition(idx, container) {
    const cols = 4;
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const rect = container.getBoundingClientRect();
    const containerW = rect.width || 800;
    const cellW = containerW / cols;
    return {
        left: col * cellW + cellW / 2 - 60,
        top: 40 + row * 220,
    };
}

function setupBlobDrag(el, key) {
    interact(el).draggable({
        listeners: {
            move(event) {
                const left = parseFloat(el.style.left) + event.dx;
                const top = parseFloat(el.style.top) + event.dy;
                el.style.left = left + 'px';
                el.style.top = top + 'px';
                blobPositions[key] = { left, top };
            }
        }
    });
}

async function deleteStudentOption(key) {
    if (!confirm("Delete this student-suggested option? All votes for it will be lost.")) return;
    await remove(ref(db, `pulse/${currentRoom}/studentOptions/${key}`));
}

// ==========================================
// STUDENT MODE
// ==========================================

async function joinSession() {
    const room = document.getElementById('s-room-input').value.trim().toUpperCase();
    if (!room) return alert("Please enter a room name.");
    currentRoom = room;
    initStudentMode();
}

async function initStudentMode() {
    switchView('student');
    document.getElementById('s-room-label').textContent = currentRoom;
    window.history.replaceState(null, '', `#${currentRoom.toLowerCase()}`);

    const snap = await get(ref(db, `pulse/${currentRoom}/config`));
    if (!snap.exists()) {
        document.getElementById('s-error').classList.remove('hidden');
        document.getElementById('s-form').classList.add('hidden');
        return;
    }

    config = snap.val();
    if (config.mode === 'choose') {
        document.getElementById('s-form').classList.add('hidden');
        document.getElementById('s-choose-form').classList.remove('hidden');
        initStudentChooseMode(config);
    } else {
        renderSliders(config);
    }
}

function renderSliders(cfg) {
    const container = document.getElementById('s-sliders');
    container.innerHTML = '';
    cfg.variables.forEach((v, i) => {
        const mid = Math.round((v.min + v.max) / 2);
        const div = document.createElement('div');
        div.className = 'slider-group';
        div.innerHTML = `
            <div class="slider-header">
                <span class="slider-label">${v.label}</span>
                <span class="slider-value" id="sv-${i}">${mid}</span>
            </div>
            <input type="range" id="sl-${i}" min="${v.min}" max="${v.max}" step="1" value="${mid}">
            <div class="slider-minmax"><span>${v.min}</span><span>${v.max}</span></div>
        `;
        container.appendChild(div);
        div.querySelector(`#sl-${i}`).addEventListener('input', function () {
            document.getElementById(`sv-${i}`).textContent = this.value;
        });
    });

    if (cfg.anonymity !== 'anonymous') {
        document.getElementById('s-name-wrap').classList.remove('hidden');
    }
}

async function submitResponse() {
    const values = config.variables.map((_, i) => parseInt(document.getElementById(`sl-${i}`).value));
    const response = { values, timestamp: Date.now() };
    if (config.anonymity !== 'anonymous') {
        response.name = document.getElementById('s-name').value.trim() || 'Anonymous';
    }
    await push(ref(db, `pulse/${currentRoom}/responses`), response);
    document.getElementById('s-form').classList.add('hidden');
    document.getElementById('s-done').classList.remove('hidden');
}

// ==========================================
// CHOOSE — STUDENT VIEW
// ==========================================

function getSessionId() {
    let id = localStorage.getItem('pulse_session_id');
    if (!id) {
        id = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        localStorage.setItem('pulse_session_id', id);
    }
    return id;
}

function initStudentChooseMode(cfg) {
    studentVotes = new Set();

    if (cfg.anonymity !== 'anonymous') {
        document.getElementById('s-choose-name-wrap').classList.remove('hidden');
    }
    if (cfg.allowStudentOptions) {
        document.getElementById('s-add-option-wrap').classList.remove('hidden');
    }

    updateVoteHint();

    // Pre-load this student's existing votes
    const sessionId = getSessionId();
    get(ref(db, `pulse/${currentRoom}/responses/${sessionId}`)).then(snap => {
        if (snap.exists()) {
            studentVotes = new Set(snap.val().votes || []);
            updateVoteHint();
            document.querySelectorAll('#s-options-list .option-btn').forEach(btn => {
                btn.classList.toggle('selected', studentVotes.has(btn.dataset.key));
            });
        }
    });

    // Teacher options (static from config)
    const teacherOptions = {};
    Object.entries(cfg.options || {}).forEach(([k, label]) => { teacherOptions[k] = label; });
    renderStudentOptions(teacherOptions, {});

    // Listen for student-added options appearing in real-time
    onValue(ref(db, `pulse/${currentRoom}/studentOptions`), snap => {
        renderStudentOptions(teacherOptions, snap.val() || {});
    });
}

function renderStudentOptions(teacherOptions, studentOptions) {
    const container = document.getElementById('s-options-list');
    const allOpts = { ...teacherOptions };
    Object.entries(studentOptions).forEach(([k, v]) => { allOpts[k] = v.label; });

    // Remove stale votes for options that no longer exist
    studentVotes.forEach(k => { if (!allOpts[k]) studentVotes.delete(k); });

    // Track existing buttons
    const existingBtns = {};
    container.querySelectorAll('.option-btn').forEach(btn => {
        existingBtns[btn.dataset.key] = btn;
    });

    // Remove stale buttons
    Object.keys(existingBtns).forEach(k => {
        if (!allOpts[k]) existingBtns[k].remove();
    });

    // Create or update buttons
    Object.entries(allOpts).forEach(([key, label]) => {
        if (existingBtns[key]) {
            existingBtns[key].classList.toggle('selected', studentVotes.has(key));
        } else {
            const btn = document.createElement('button');
            btn.className = 'option-btn' + (studentVotes.has(key) ? ' selected' : '');
            btn.textContent = label;
            btn.dataset.key = key;
            btn.addEventListener('click', () => toggleVote(key));
            container.appendChild(btn);
        }
    });

    updateVoteHint();
}

function toggleVote(key) {
    if (studentVotes.has(key)) {
        studentVotes.delete(key);
    } else {
        if (studentVotes.size >= (config.maxVotes || 1)) {
            // Remove the first (oldest) selected vote to make room
            const first = studentVotes.values().next().value;
            studentVotes.delete(first);
        }
        studentVotes.add(key);
    }
    document.querySelectorAll('#s-options-list .option-btn').forEach(btn => {
        btn.classList.toggle('selected', studentVotes.has(btn.dataset.key));
    });
    updateVoteHint();
}

function updateVoteHint() {
    const hint = document.getElementById('vote-hint');
    if (!config || config.mode !== 'choose') return;
    const max = config.maxVotes || 1;
    const sel = studentVotes.size;
    hint.textContent = max === 1
        ? (sel ? 'One option selected' : 'Select an option')
        : `${sel} of up to ${max} options selected`;
}

async function addStudentOption() {
    const input = document.getElementById('s-new-option');
    const label = input.value.trim();
    if (!label) return;
    await push(ref(db, `pulse/${currentRoom}/studentOptions`), {
        label,
        timestamp: Date.now(),
    });
    input.value = '';
}

async function submitChooseResponse() {
    const sessionId = getSessionId();
    const response = { votes: [...studentVotes], timestamp: Date.now() };
    if (config.anonymity !== 'anonymous') {
        response.name = document.getElementById('s-choose-name').value.trim() || 'Anonymous';
    }
    await set(ref(db, `pulse/${currentRoom}/responses/${sessionId}`), response);

    const feedback = document.getElementById('s-choose-feedback');
    feedback.classList.remove('hidden');
    setTimeout(() => feedback.classList.add('hidden'), 2000);
}

// ==========================================
// CANVAS
// ==========================================

function resizeCanvas() {
    if (!canvas || (config && config.mode === 'choose')) return;
    const wrap = canvas.parentElement;
    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvasW = rect.width;
    canvasH = rect.height;
    canvas.width = Math.floor(canvasW * dpr);
    canvas.height = Math.floor(canvasH * dpr);
    canvas.style.width = canvasW + 'px';
    canvas.style.height = canvasH + 'px';
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    redraw();
}

function redraw() {
    if (!ctx || !config || config.mode === 'choose') return;
    ctx.clearRect(0, 0, canvasW, canvasH);
    dotPositions = [];
    const list = Object.entries(responses).map(([id, r]) => ({ id, ...r }));
    if (config.variables.length === 1) {
        drawHistogram(list, config.variables[0]);
    } else {
        drawScatter(list, config.variables);
    }
}

// ==========================================
// SEEDED JITTER
// ==========================================

function seededRand(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    return (Math.abs(h) % 10000) / 10000;
}

function jitter(id) {
    return {
        x: (seededRand(id + 'x') - 0.5) * 14,
        y: (seededRand(id + 'y') - 0.5) * 14,
    };
}

// ==========================================
// SCATTER PLOT (2 or 3 variables)
// ==========================================

function drawScatter(list, vars) {
    const legendW = vars.length === 3 ? 140 : 0;
    const pad = { top: 40, right: 20 + legendW, bottom: 80, left: 90 };
    const pw = canvasW - pad.left - pad.right;
    const ph = canvasH - pad.top - pad.bottom;
    const v0 = vars[0], v1 = vars[1], v2 = vars[2] || null;

    function toX(val) { return pad.left + (val - v0.min) / (v0.max - v0.min) * pw; }
    function toY(val) { return pad.top + ph - (val - v1.min) / (v1.max - v1.min) * ph; }

    drawScatterAxes(pad, pw, ph, v0, v1);

    if (!isRevealed) return;

    list.forEach(r => {
        const j = jitter(r.id);
        const x = toX(r.values[0]) + j.x;
        const y = toY(r.values[1]) + j.y;
        const color = v2 ? varToColor(r.values[2], v2) : '#3b82f6';
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.78;
        ctx.fill();
        ctx.globalAlpha = 1;
        dotPositions.push({ x, y, r, color });
    });

    if (list.length > 0) {
        const ax = toX(mean(list, 0));
        const ay = toY(mean(list, 1));
        ctx.beginPath();
        ctx.arc(ax, ay, 13, 0, Math.PI * 2);
        ctx.fillStyle = '#f97316';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('avg', ax, ay);
    }

    if (v2) drawColorLegend(pad, ph, v2);
}

function drawScatterAxes(pad, pw, ph, v0, v1) {
    const xRange = v0.max - v0.min;
    const yRange = v1.max - v1.min;
    const xTicks = Math.min(xRange, 10);
    const yTicks = Math.min(yRange, 10);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '18px Inter, sans-serif';

    for (let i = 0; i <= xTicks; i++) {
        const val = v0.min + Math.round(i / xTicks * xRange);
        const x = pad.left + (i / xTicks) * pw;
        ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + ph); ctx.stroke();
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(val, x, pad.top + ph + 8);
    }
    for (let i = 0; i <= yTicks; i++) {
        const val = v1.min + Math.round(i / yTicks * yRange);
        const y = pad.top + ph - (i / yTicks) * ph;
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + pw, y); ctx.stroke();
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(val, pad.left - 10, y);
    }

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pad.left, pad.top, pw, ph);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(v0.label, pad.left + pw / 2, canvasH - 6);
    ctx.save();
    ctx.translate(22, pad.top + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'top'; ctx.fillText(v1.label, 0, 0);
    ctx.restore();
}

function varToColor(val, v) {
    const t = Math.max(0, Math.min(1, (val - v.min) / (v.max - v.min)));
    const hue = Math.round(220 - t * 220);
    return `hsl(${hue}, 75%, 50%)`;
}

function drawColorLegend(pad, ph, v2) {
    const lx = canvasW - pad.right + 20;
    const ly = pad.top + 24;
    const lw = 26;
    const lh = ph - 24;

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(v2.label, lx + lw / 2, ly - 6, lw * 5);

    const grad = ctx.createLinearGradient(0, ly, 0, ly + lh);
    grad.addColorStop(0, 'hsl(0, 75%, 50%)');
    grad.addColorStop(1, 'hsl(220, 75%, 50%)');
    ctx.fillStyle = grad;
    ctx.fillRect(lx, ly, lw, lh);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.strokeRect(lx, ly, lw, lh);

    ctx.fillStyle = '#1e293b';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(v2.max, lx + lw + 6, ly);
    ctx.textBaseline = 'bottom';
    ctx.fillText(v2.min, lx + lw + 6, ly + lh);
}

// ==========================================
// HISTOGRAM (1 variable)
// ==========================================

function drawHistogram(list, v) {
    const pad = { top: 40, right: 40, bottom: 80, left: 90 };
    const pw = canvasW - pad.left - pad.right;
    const ph = canvasH - pad.top - pad.bottom;
    const range = v.max - v.min;

    let buckets;
    if (range <= 20) {
        buckets = [];
        for (let val = v.min; val <= v.max; val++) {
            buckets.push({ label: val, centerVal: val, count: 0 });
        }
        list.forEach(r => {
            const b = buckets.find(b => b.label === r.values[0]);
            if (b) b.count++;
        });
    } else {
        const n = 10;
        buckets = Array.from({ length: n }, (_, i) => {
            const lo = v.min + i * range / n;
            const hi = v.min + (i + 1) * range / n;
            return { label: `${Math.round(lo)}–${Math.round(hi)}`, centerVal: (lo + hi) / 2, count: 0 };
        });
        list.forEach(r => {
            const idx = Math.min(Math.floor((r.values[0] - v.min) / range * 10), 9);
            buckets[idx].count++;
        });
    }

    const maxCount = Math.max(...buckets.map(b => b.count), 1);
    const bw = pw / buckets.length;

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '18px Inter, sans-serif';
    const yTicks = Math.min(maxCount, 6);
    for (let i = 0; i <= yTicks; i++) {
        const val = Math.round(i / yTicks * maxCount);
        const y = pad.top + ph - (val / maxCount) * ph;
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + pw, y); ctx.stroke();
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(val, pad.left - 10, y);
    }

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pad.left, pad.top, pw, ph);

    if (isRevealed) {
        buckets.forEach((b, i) => {
            if (!b.count) return;
            const x = pad.left + i * bw;
            const bh = (b.count / maxCount) * ph;
            ctx.fillStyle = '#3b82f6';
            ctx.globalAlpha = 0.72;
            ctx.fillRect(x + 2, pad.top + ph - bh, bw - 4, bh);
            ctx.globalAlpha = 1;
        });

        if (list.length > 0) {
            const avg = mean(list, 0);
            const ax = pad.left + (avg - v.min) / range * pw;
            ctx.save();
            ctx.setLineDash([6, 4]);
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(ax, pad.top); ctx.lineTo(ax, pad.top + ph); ctx.stroke();
            ctx.restore();
            ctx.fillStyle = '#f97316';
            ctx.font = 'bold 18px Inter, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
            ctx.fillText(`avg: ${avg.toFixed(1)}`, ax, pad.top - 4);
        }
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '16px Inter, sans-serif';
    buckets.forEach((b, i) => {
        const x = pad.left + (i + 0.5) * bw;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(b.label, x, pad.top + ph + 8);
    });

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(v.label, pad.left + pw / 2, canvasH - 6);
    ctx.save();
    ctx.translate(22, pad.top + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'top'; ctx.fillText('Count', 0, 0);
    ctx.restore();
}

// ==========================================
// HOVER TOOLTIP
// ==========================================

function handleHover(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const tip = document.getElementById('tip');
    const hit = dotPositions.find(d => Math.hypot(d.x - mx, d.y - my) < 12);
    if (hit) {
        const lines = config.variables.map((v, i) => `${v.label}: ${hit.r.values[i]}`);
        if (hit.r.name && config.anonymity !== 'anonymous') lines.push(hit.r.name);
        tip.innerHTML = lines.join('<br>');
        const tipX = Math.min(mx + 14, canvasW - 160);
        tip.style.left = tipX + 'px';
        tip.style.top = (my - 10) + 'px';
        tip.classList.remove('hidden');
    } else {
        tip.classList.add('hidden');
    }
}

// ==========================================
// UTILS
// ==========================================

function mean(list, idx) {
    return list.reduce((s, r) => s + r.values[idx], 0) / list.length;
}

function switchView(name) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[name].classList.add('active');
}
