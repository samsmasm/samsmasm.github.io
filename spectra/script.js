import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
let currentConfig = null;
let responses = {};
let displayMode = 'random';
let expandedCategories = new Set(); // for reveal mode collapse/expand
let responsesUnsubscribe = null;

let studentConfig = null;
let studentRoom = null;
let studentSliderValues = {};

let tooltipTimer = null;
const singleClickTimers = new Map();

const CAT_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
];
const categoryColorMap = {};
let categoryColorIndex = 0;

function getCategoryColor(category) {
    if (!categoryColorMap[category]) {
        categoryColorMap[category] = CAT_COLORS[categoryColorIndex % CAT_COLORS.length];
        categoryColorIndex++;
    }
    return categoryColorMap[category];
}

// ==========================================
// HELPERS
// ==========================================

async function hashPin(pin) {
    const enc = new TextEncoder().encode(pin);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getStudentId() {
    let id = localStorage.getItem('spectra_student_id');
    if (!id) {
        id = 'st_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
        localStorage.setItem('spectra_student_id', id);
    }
    return id;
}

function parseStatements(raw) {
    return raw.trim().split(/\n\s*\n/)
        .map(block => block.trim())
        .filter(Boolean)
        .map((block, i) => {
            const match = block.match(/^([\s\S]+?)\s*\[([^\]]+)\]\s*$/);
            if (!match) return null;
            return { id: i, text: match[1].trim(), category: match[2].trim() };
        })
        .filter(Boolean);
}

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function showError(id, msg) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.classList.remove('hidden');
}

function hideError(id) {
    document.getElementById(id).classList.add('hidden');
}

// ==========================================
// VIEW MANAGEMENT
// ==========================================

function showView(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + name).classList.add('active');
}

// ==========================================
// ROUTER
// ==========================================

function router() {
    if (responsesUnsubscribe) {
        responsesUnsubscribe();
        responsesUnsubscribe = null;
    }

    const hash = window.location.hash.slice(1).toUpperCase();
    const role = new URLSearchParams(window.location.search).get('role');

    if (!hash && !role) {
        showView('landing');
    } else if (role === 'teacher' && !hash) {
        showView('teacher-setup');
    } else if (role === 'teacher' && hash) {
        showView('teacher-dashboard');
        initTeacherDashboard(hash);
    } else if (hash && !role) {
        showView('student-sliders');
        initStudentFlow(hash);
    }
}

// ==========================================
// LANDING
// ==========================================

function initLanding() {
    document.getElementById('btn-im-teacher').addEventListener('click', () => {
        window.location.href = '?role=teacher';
    });

    document.getElementById('btn-im-student').addEventListener('click', () => {
        const entry = document.getElementById('student-room-entry');
        entry.classList.toggle('hidden');
        if (!entry.classList.contains('hidden')) {
            document.getElementById('landing-room-input').focus();
        }
    });

    document.getElementById('btn-student-go').addEventListener('click', () => {
        const room = document.getElementById('landing-room-input').value.trim().toUpperCase();
        if (room) window.location.hash = room.toLowerCase();
    });

    document.getElementById('landing-room-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('btn-student-go').click();
    });
}

// ==========================================
// TEACHER SETUP
// ==========================================

function initTeacherSetup() {
    document.getElementById('btn-back-setup').addEventListener('click', () => {
        window.location.href = '.';
    });

    document.getElementById('btn-start-session').addEventListener('click', createSession);
    document.getElementById('btn-rejoin').addEventListener('click', rejoinSession);

    document.getElementById('new-room-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('new-pin-input').focus();
    });

    document.getElementById('rejoin-room-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('rejoin-pin-input').focus();
    });

    document.getElementById('rejoin-pin-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') rejoinSession();
    });
}

async function createSession() {
    hideError('create-error');

    const roomName = document.getElementById('new-room-input').value.trim().toUpperCase();
    const pin = document.getElementById('new-pin-input').value.trim();
    const raw = document.getElementById('statements-input').value;
    const scaleMin = parseInt(document.getElementById('scale-min-input').value) || 0;
    const scaleMax = parseInt(document.getElementById('scale-max-input').value) || 100;
    const shuffle = document.getElementById('shuffle-toggle').checked;
    const requireName = document.getElementById('require-name-toggle').checked;

    if (!roomName) return showError('create-error', 'Please enter a room name.');
    if (!pin) return showError('create-error', 'Please enter a PIN.');
    if (!raw.trim()) return showError('create-error', 'Please add some statements.');
    if (scaleMax <= scaleMin) return showError('create-error', 'Scale max must be greater than scale min.');

    const statements = parseStatements(raw);
    if (statements.length === 0) {
        return showError('create-error', 'No valid statements found. Use the format: Statement text [Category]');
    }

    const indices = statements.map((_, i) => i);
    const statementOrder = shuffle ? shuffleArray(indices) : indices;
    const pinHash = await hashPin(pin);

    const context = document.getElementById('context-input').value.trim();
    const config = { pin: pinHash, scaleMin, scaleMax, shuffle, statementOrder, statements, requireName, context };

    const btn = document.getElementById('btn-start-session');
    btn.textContent = 'Creating…';
    btn.disabled = true;

    try {
        await set(ref(db, `spectra/${roomName}/config`), config);
        sessionStorage.setItem(`spectra_pin_${roomName}`, pin);
        window.location.href = `?role=teacher#${roomName.toLowerCase()}`;
    } catch (err) {
        btn.textContent = 'Start Session';
        btn.disabled = false;
        showError('create-error', 'Failed to create room. Check your connection.');
    }
}

async function rejoinSession() {
    hideError('rejoin-error');

    const roomName = document.getElementById('rejoin-room-input').value.trim().toUpperCase();
    const pin = document.getElementById('rejoin-pin-input').value.trim();

    if (!roomName) return showError('rejoin-error', 'Please enter a room name.');
    if (!pin) return showError('rejoin-error', 'Please enter a PIN.');

    const btn = document.getElementById('btn-rejoin');
    btn.textContent = 'Checking…';
    btn.disabled = true;

    try {
        const snap = await get(ref(db, `spectra/${roomName}/config`));
        if (!snap.exists()) {
            showError('rejoin-error', 'Room not found.');
            btn.textContent = 'Rejoin'; btn.disabled = false;
            return;
        }

        const stored = snap.val();
        const pinHash = await hashPin(pin);

        if (stored.pin !== pinHash) {
            showError('rejoin-error', 'Incorrect PIN.');
            btn.textContent = 'Rejoin'; btn.disabled = false;
            return;
        }

        sessionStorage.setItem(`spectra_pin_${roomName}`, pin);
        window.location.href = `?role=teacher#${roomName.toLowerCase()}`;
    } catch (err) {
        showError('rejoin-error', 'Connection error. Try again.');
        btn.textContent = 'Rejoin'; btn.disabled = false;
    }
}

// ==========================================
// TEACHER DASHBOARD
// ==========================================

function initTeacherDashboard(roomName) {
    currentRoom = roomName;
    responses = {};
    displayMode = 'random';
    expandedCategories = new Set();
    Object.keys(categoryColorMap).forEach(k => delete categoryColorMap[k]);
    categoryColorIndex = 0;
    currentConfig = null;

    document.getElementById('t-room-label').textContent = roomName;

    // Reset mode buttons
    document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
    document.querySelector('.btn-mode[data-mode="random"]').classList.add('active');

    // QR code modal — clear and regenerate
    const joinUrl = `https://samsmasm.github.io/spectra/#${roomName.toLowerCase()}`;
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = '';
    new QRCode(qrContainer, { text: joinUrl, width: 400, height: 400 });
    document.getElementById('join-link-text').textContent =
        `samsmasm.github.io/spectra/#${roomName.toLowerCase()}`;

    // Context box
    document.getElementById('context-box').classList.add('hidden');

    // Load config (also populates context box text)
    get(ref(db, `spectra/${roomName}/config`)).then(snap => {
        if (snap.exists()) {
            currentConfig = snap.val();
            const ctx = currentConfig.context || '';
            const ctxEl = document.getElementById('context-text');
            if (ctx) {
                ctxEl.textContent = ctx;
                document.getElementById('btn-toggle-context').classList.add('has-context');
            } else {
                document.getElementById('btn-toggle-context').disabled = true;
            }
            renderResults();
        } else {
            document.getElementById('results-panel').innerHTML =
                '<div class="empty-state">Room config not found.</div>';
        }
    });

    // Subscribe to responses
    responsesUnsubscribe = onValue(ref(db, `spectra/${roomName}/responses`), snap => {
        responses = snap.exists() ? snap.val() : {};
        updateResponseCount();
        renderResults();
    });
}

function updateResponseCount() {
    const count = Object.keys(responses).length;
    document.getElementById('t-count').textContent = `${count} response${count !== 1 ? 's' : ''}`;
}

// ==========================================
// RESULTS RENDERING
// ==========================================

function renderResults() {
    if (!currentConfig) return;

    const { statements, statementOrder, scaleMin, scaleMax } = currentConfig;
    const panel = document.getElementById('results-panel');
    const ordered = statementOrder.map(i => statements[i]);

    panel.innerHTML = '';

    if (displayMode === 'table') {
        renderTable(panel, ordered);
        return;
    }

    if (displayMode === 'random') {
        ordered.forEach(s => panel.appendChild(buildStatementCard(s, scaleMin, scaleMax)));
    } else {
        renderGrouped(panel, ordered, scaleMin, scaleMax, displayMode);
    }
}

function renderGrouped(container, statements, scaleMin, scaleMax, mode) {
    // Group by category
    const groups = {};
    statements.forEach(s => {
        if (!groups[s.category]) groups[s.category] = [];
        groups[s.category].push(s);
    });

    const sortedCats = Object.keys(groups).sort();

    sortedCats.forEach(cat => {
        const color = getCategoryColor(cat);
        const isExpanded = expandedCategories.has(cat);

        // Category title
        const titleEl = document.createElement('div');
        titleEl.className = 'category-group-label';

        if (mode === 'reveal') {
            titleEl.classList.add('reveal-title');
            titleEl.innerHTML = `
                <span class="cat-dot" style="background:${color}"></span>
                <span>${escapeHtml(cat)}</span>
                <span class="expand-icon">${isExpanded ? '▾' : '▸'}</span>
            `;
            titleEl.addEventListener('click', () => {
                if (expandedCategories.has(cat)) expandedCategories.delete(cat);
                else expandedCategories.add(cat);
                renderResults();
            });
        } else {
            // organise: title shown, all spectra visible, no click needed
            titleEl.innerHTML = `
                <span class="cat-dot" style="background:${color}"></span>
                <span>${escapeHtml(cat)}</span>
            `;
        }

        container.appendChild(titleEl);

        // Show statements: always in organise, only if expanded in reveal
        if (mode === 'organise' || isExpanded) {
            groups[cat].forEach(s => container.appendChild(buildStatementCard(s, scaleMin, scaleMax)));
        }
    });
}

function buildStatementCard(statement, scaleMin, scaleMax) {
    const card = document.createElement('div');
    card.className = 'statement-card';

    // Collect dot data: {studentId, score, name}
    const dotData = [];
    Object.entries(responses).forEach(([studentId, sr]) => {
        const v = sr[String(statement.id)];
        if (v !== undefined && v !== null) {
            const name = sr._name || '';
            dotData.push({ studentId, score: Number(v), name });
        }
    });

    const avg = dotData.length > 0
        ? dotData.reduce((sum, d) => sum + d.score, 0) / dotData.length
        : null;

    const meta = dotData.length > 0
        ? `${dotData.length} response${dotData.length !== 1 ? 's' : ''} · avg ${avg.toFixed(1)}`
        : 'No responses yet';

    card.innerHTML = `
        <div class="statement-text">${escapeHtml(statement.text)}</div>
        <div class="spectrum-container">
            <div class="spectrum-bar-inner">
                <div class="spectrum-track"></div>
            </div>
            <div class="spectrum-labels">
                <span>${scaleMin}</span>
                <span>${scaleMax}</span>
            </div>
        </div>
        <div class="response-meta">${meta}</div>
    `;

    // Build dots via DOM so we can attach data-* attributes for event delegation
    const barInner = card.querySelector('.spectrum-bar-inner');
    const range = scaleMax - scaleMin;
    const color = getCategoryColor(statement.category);

    if (range > 0) {
        const posCount = {};

        dotData.forEach(({ studentId, score, name }) => {
            const pct = Math.max(0, Math.min(100, (score - scaleMin) / range * 100));
            const key = pct.toFixed(0);
            posCount[key] = (posCount[key] || 0) + 1;
            const topOffset = (posCount[key] - 1) * 4;

            const dot = document.createElement('span');
            dot.className = 'spectrum-dot';
            dot.style.left = pct.toFixed(2) + '%';
            dot.style.top = (50 + topOffset) + '%';
            dot.style.background = color;
            dot.dataset.studentId = studentId;
            dot.dataset.statementId = String(statement.id);
            if (name) dot.dataset.name = name;
            barInner.appendChild(dot);
        });

        if (avg !== null) {
            const avgPct = Math.max(0, Math.min(100, (avg - scaleMin) / range * 100));
            const avgEl = document.createElement('span');
            avgEl.className = 'spectrum-avg';
            avgEl.style.left = avgPct.toFixed(2) + '%';
            barInner.appendChild(avgEl);
        }
    }

    return card;
}

// ==========================================
// TABLE VIEW
// ==========================================

function renderTable(panel, ordered) {
    if (Object.keys(responses).length === 0) {
        panel.innerHTML = '<div class="empty-state">No responses yet.</div>';
        return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'table-scroll';

    const table = document.createElement('table');
    table.className = 'response-table';

    // Header
    const thead = table.createTHead();
    const hr = thead.insertRow();
    const th0 = document.createElement('th');
    th0.textContent = 'Student';
    hr.appendChild(th0);
    ordered.forEach(s => {
        const th = document.createElement('th');
        th.title = s.text;
        th.textContent = s.text.length > 22 ? s.text.slice(0, 22) + '…' : s.text;
        hr.appendChild(th);
    });

    // Body
    const tbody = table.createTBody();
    Object.entries(responses).forEach(([studentId, sr]) => {
        const row = tbody.insertRow();
        row.dataset.studentId = studentId;

        const name = sr._name || '';
        const nameCell = row.insertCell();
        nameCell.className = 'student-cell';
        if (name) {
            nameCell.textContent = name;
            nameCell.title = studentId;
        } else {
            nameCell.innerHTML = `<span class="anon-id">${escapeHtml(studentId.slice(0, 12))}</span>`;
        }

        ordered.forEach(s => {
            const v = sr[String(s.id)];
            const td = row.insertCell();
            td.className = 'score-cell' + (v === undefined || v === null ? ' empty' : '');
            td.textContent = (v !== undefined && v !== null) ? v : '—';
            if (v !== undefined && v !== null) {
                td.dataset.statementId = String(s.id);
                td.dataset.studentId = studentId;
            }
        });
    });

    // Double-click a row → mark for deletion; click marked row → delete
    table.addEventListener('dblclick', e => {
        const row = e.target.closest('tbody tr');
        if (!row || row.classList.contains('row-pending-delete')) return;
        row.classList.add('row-pending-delete');
        row.cells[0].innerHTML = '<span class="delete-x">✕ Delete</span>';
    });

    table.addEventListener('click', e => {
        const row = e.target.closest('tbody tr.row-pending-delete');
        if (!row) return;
        remove(ref(db, `spectra/${currentRoom}/responses/${row.dataset.studentId}`));
    });

    wrap.appendChild(table);
    panel.appendChild(wrap);
}

// ==========================================
// DOT INTERACTIONS (event delegation on results panel)
// ==========================================

function handleResultsClick(e) {
    const dot = e.target.closest('.spectrum-dot[data-student-id]');
    if (!dot) return;

    if (dot.classList.contains('marked-delete')) {
        // Confirm: remove that specific response
        remove(ref(db, `spectra/${currentRoom}/responses/${dot.dataset.studentId}/${dot.dataset.statementId}`));
        return;
    }

    // Single-click: show name tooltip (cancel if dblclick fires)
    clearTimeout(singleClickTimers.get(dot));
    singleClickTimers.set(dot, setTimeout(() => {
        singleClickTimers.delete(dot);
        const name = dot.dataset.name;
        if (name) showDotTooltip(e, name);
    }, 220));
}

function handleResultsDblClick(e) {
    const dot = e.target.closest('.spectrum-dot[data-student-id]');
    if (!dot) return;

    // Cancel pending single-click
    clearTimeout(singleClickTimers.get(dot));
    singleClickTimers.delete(dot);

    dot.classList.add('marked-delete');
    dot.textContent = '✕';
}

function showDotTooltip(e, name) {
    const tooltip = document.getElementById('dot-tooltip');
    tooltip.textContent = name;
    tooltip.style.left = (e.clientX + 12) + 'px';
    tooltip.style.top = (e.clientY - 40) + 'px';
    tooltip.classList.remove('hidden');
    clearTimeout(tooltipTimer);
    tooltipTimer = setTimeout(hideDotTooltip, 3000);
}

function hideDotTooltip() {
    document.getElementById('dot-tooltip').classList.add('hidden');
    clearTimeout(tooltipTimer);
}

// ==========================================
// STUDENT FLOW (no PIN — open to anyone with the link)
// ==========================================

async function initStudentFlow(roomName) {
    studentRoom = roomName;
    document.getElementById('s-sliders-room-label').textContent = roomName;
    document.getElementById('sliders-container').innerHTML = '';
    document.getElementById('submit-bar').classList.add('hidden');
    document.getElementById('done-message').classList.add('hidden');
    document.getElementById('student-load-error').classList.add('hidden');

    try {
        const snap = await get(ref(db, `spectra/${roomName}/config`));
        if (!snap.exists()) {
            showError('student-load-error', 'Room not found. Check the link and try again.');
            return;
        }
        studentConfig = snap.val();
        initStudentSliders();
    } catch (err) {
        showError('student-load-error', 'Connection error. Please refresh and try again.');
    }
}

// ==========================================
// STUDENT SLIDERS
// ==========================================

function initStudentSliders() {
    const { statements, statementOrder, scaleMin, scaleMax, requireName } = studentConfig;
    const ordered = statementOrder.map(i => statements[i]);
    const mid = Math.round((scaleMin + scaleMax) / 2);

    const container = document.getElementById('sliders-container');
    container.innerHTML = '';

    // Preserve any existing values (for "change responses" flow)
    const prevValues = { ...studentSliderValues };
    studentSliderValues = {};

    ordered.forEach(statement => {
        const savedVal = prevValues[statement.id] ?? mid;
        const item = document.createElement('div');
        item.className = 'slider-item';
        item.innerHTML = `
            <div class="slider-statement-text">${escapeHtml(statement.text)}</div>
            <div class="slider-row">
                <span class="slider-min">${scaleMin}</span>
                <input type="range" class="spectrum-slider"
                    min="${scaleMin}" max="${scaleMax}"
                    value="${savedVal}">
                <span class="slider-max">${scaleMax}</span>
                <span class="slider-value">${savedVal}</span>
            </div>
        `;
        container.appendChild(item);

        const slider = item.querySelector('.spectrum-slider');
        const valueEl = item.querySelector('.slider-value');
        studentSliderValues[statement.id] = savedVal;

        slider.addEventListener('input', () => {
            const v = Number(slider.value);
            studentSliderValues[statement.id] = v;
            valueEl.textContent = v;
        });
    });

    // Name input
    const nameWrap = document.getElementById('name-input-wrap');
    if (requireName) {
        nameWrap.classList.remove('hidden');
    } else {
        nameWrap.classList.add('hidden');
    }

    document.getElementById('submit-bar').classList.remove('hidden');
    document.getElementById('done-message').classList.add('hidden');

    // Re-wire submit/change buttons to avoid duplicate listeners
    const submitBtn = document.getElementById('btn-submit-responses');
    const newSubmit = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newSubmit, submitBtn);
    newSubmit.addEventListener('click', submitStudentResponses);

    const changeBtn = document.getElementById('btn-change-responses');
    const newChange = changeBtn.cloneNode(true);
    changeBtn.parentNode.replaceChild(newChange, changeBtn);
    newChange.addEventListener('click', () => {
        document.getElementById('done-message').classList.add('hidden');
        document.getElementById('submit-bar').classList.remove('hidden');
    });
}

async function submitStudentResponses() {
    const studentId = getStudentId();
    const btn = document.getElementById('btn-submit-responses');
    btn.textContent = 'Submitting…';
    btn.disabled = true;

    const data = { ...studentSliderValues };
    const name = document.getElementById('student-name-input').value.trim();
    if (name) data._name = name;

    try {
        await set(ref(db, `spectra/${studentRoom}/responses/${studentId}`), data);
        document.getElementById('submit-bar').classList.add('hidden');
        document.getElementById('done-message').classList.remove('hidden');
    } catch (err) {
        btn.textContent = 'Submit Responses';
        btn.disabled = false;
        alert('Failed to submit. Check your connection and try again.');
    }
}

// ==========================================
// INIT
// ==========================================

window.addEventListener('DOMContentLoaded', () => {
    initLanding();
    initTeacherSetup();

    // Mode buttons (attached once; work across all dashboard visits)
    document.querySelectorAll('.btn-mode').forEach(btn => {
        btn.addEventListener('click', () => {
            displayMode = btn.dataset.mode;
            if (displayMode !== 'reveal') expandedCategories = new Set();
            document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderResults();
        });
    });

    document.getElementById('btn-t-leave').addEventListener('click', () => {
        if (responsesUnsubscribe) responsesUnsubscribe();
        window.location.href = '?role=teacher';
    });

    // QR modal toggle
    document.getElementById('btn-toggle-qr').addEventListener('click', () => {
        document.getElementById('qr-modal').classList.remove('hidden');
    });
    document.getElementById('btn-close-qr').addEventListener('click', () => {
        document.getElementById('qr-modal').classList.add('hidden');
    });
    document.getElementById('qr-modal-backdrop').addEventListener('click', () => {
        document.getElementById('qr-modal').classList.add('hidden');
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') document.getElementById('qr-modal').classList.add('hidden');
    });

    // Context box toggle
    document.getElementById('btn-toggle-context').addEventListener('click', () => {
        document.getElementById('context-box').classList.toggle('hidden');
    });

    // Font size slider
    document.getElementById('font-size-slider').addEventListener('input', e => {
        document.getElementById('results-panel').style.setProperty('--q-font-size', e.target.value + 'px');
    });

    // Event delegation for dot interactions on results panel
    const resultsPanel = document.getElementById('results-panel');
    resultsPanel.addEventListener('click', handleResultsClick);
    resultsPanel.addEventListener('dblclick', handleResultsDblClick);

    // Hide tooltip on any outside click
    document.addEventListener('click', e => {
        if (!e.target.closest('.spectrum-dot') && !e.target.closest('#dot-tooltip')) {
            hideDotTooltip();
        }
    });

    router();
});

window.addEventListener('hashchange', router);
window.addEventListener('popstate', router);
