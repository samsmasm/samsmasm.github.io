import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
let revealFilter = null;
let responsesUnsubscribe = null;
let qrGenerated = false;

let studentConfig = null;
let studentRoom = null;
let studentSliderValues = {};
let studentSubmitted = false;

// Category colour palette
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
    // Unsubscribe any existing listener when navigating
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
        showView('student-pin');
        initStudentPin(hash);
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

    const config = { pin: pinHash, scaleMin, scaleMax, shuffle, statementOrder, statements };

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
    qrGenerated = false;
    responses = {};
    displayMode = 'random';
    revealFilter = null;

    document.getElementById('t-room-label').textContent = roomName;

    // Mode buttons
    document.querySelectorAll('.btn-mode').forEach(btn => {
        btn.addEventListener('click', () => {
            displayMode = btn.dataset.mode;
            revealFilter = null;
            document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderResults();
        });
    });

    document.getElementById('btn-t-leave').addEventListener('click', () => {
        if (responsesUnsubscribe) responsesUnsubscribe();
        window.location.href = '?role=teacher';
    });

    // Access panel
    const joinUrl = `https://samsmasm.github.io/spectra/#${roomName.toLowerCase()}`;
    document.getElementById('join-link-text').textContent = `samsmasm.github.io/spectra/#${roomName.toLowerCase()}`;

    if (!qrGenerated) {
        new QRCode(document.getElementById('qrcode'), {
            text: joinUrl,
            width: 280,
            height: 280
        });
        qrGenerated = true;
    }

    const storedPin = sessionStorage.getItem(`spectra_pin_${roomName}`);
    document.getElementById('pin-display-val').textContent = storedPin || '(set during creation)';

    // Load config then subscribe to responses
    get(ref(db, `spectra/${roomName}/config`)).then(snap => {
        if (snap.exists()) {
            currentConfig = snap.val();
            // Rebuild category color map in consistent order
            Object.keys(categoryColorMap).forEach(k => delete categoryColorMap[k]);
            categoryColorIndex = 0;
            renderResults();
        } else {
            document.getElementById('results-panel').innerHTML =
                '<div class="empty-state">Room config not found. Has this room been created?</div>';
        }
    });

    responsesUnsubscribe = onValue(ref(db, `spectra/${roomName}/responses`), snap => {
        responses = snap.exists() ? snap.val() : {};
        updateResponseCount();
        renderResults();
    });
}

function updateResponseCount() {
    const count = Object.keys(responses).length;
    const label = `${count} response${count !== 1 ? 's' : ''}`;
    document.getElementById('t-count').textContent = label;
    document.getElementById('access-count').textContent = label;
}

function renderResults() {
    if (!currentConfig) return;

    const { statements, statementOrder, scaleMin, scaleMax } = currentConfig;
    const panel = document.getElementById('results-panel');

    // Build ordered list
    const ordered = statementOrder.map(i => statements[i]);

    panel.innerHTML = '';

    if (displayMode === 'random') {
        ordered.forEach(s => panel.appendChild(buildStatementCard(s, scaleMin, scaleMax, false)));
    } else {
        renderGrouped(panel, ordered, scaleMin, scaleMax, displayMode === 'reveal');
    }
}

function renderGrouped(container, statements, scaleMin, scaleMax, showLabels) {
    // Group by category
    const groups = {};
    statements.forEach(s => {
        if (!groups[s.category]) groups[s.category] = [];
        groups[s.category].push(s);
    });

    const sortedCats = Object.keys(groups).sort();

    sortedCats.forEach(cat => {
        if (showLabels && revealFilter && cat !== revealFilter) return;

        if (showLabels) {
            const label = document.createElement('div');
            const color = getCategoryColor(cat);
            const isActive = revealFilter === cat;
            label.className = 'category-group-label' + (isActive ? ' active' : '');
            label.innerHTML = `
                <span class="cat-dot" style="background:${color}"></span>
                <span>${escapeHtml(cat)}</span>
                <span class="filter-hint">${isActive ? '— click to show all' : '— click to filter'}</span>
            `;
            label.style.setProperty('--cat-color', color);
            label.addEventListener('click', () => {
                revealFilter = isActive ? null : cat;
                renderResults();
            });
            container.appendChild(label);
        }

        groups[cat].forEach(s => container.appendChild(buildStatementCard(s, scaleMin, scaleMax, showLabels)));
    });
}

function buildStatementCard(statement, scaleMin, scaleMax, showCategory) {
    const card = document.createElement('div');
    card.className = 'statement-card';

    // Collect scores for this statement
    const scores = [];
    Object.values(responses).forEach(sr => {
        const v = sr[statement.id] ?? sr[String(statement.id)];
        if (v !== undefined && v !== null) scores.push(Number(v));
    });

    const avg = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : null;

    const color = getCategoryColor(statement.category);

    const catBadge = showCategory
        ? `<span class="statement-category" style="background:${color}">${escapeHtml(statement.category)}</span>`
        : '';

    const meta = scores.length > 0
        ? `${scores.length} response${scores.length !== 1 ? 's' : ''}${avg !== null ? ` · avg ${avg.toFixed(1)}` : ''}`
        : 'No responses yet';

    card.innerHTML = `
        <div class="statement-text">${escapeHtml(statement.text)}</div>
        ${catBadge}
        <div class="spectrum-container">
            <div class="spectrum-bar-inner">
                <div class="spectrum-track"></div>
                ${buildDots(scores, avg, scaleMin, scaleMax, color)}
            </div>
            <div class="spectrum-labels">
                <span>${scaleMin}</span>
                <span>${scaleMax}</span>
            </div>
        </div>
        <div class="response-meta">${meta}</div>
    `;

    return card;
}

function buildDots(scores, avg, scaleMin, scaleMax, color) {
    const range = scaleMax - scaleMin;
    if (range === 0) return '';

    // Group dots by position to stack them slightly
    const posCount = {};

    const dots = scores.map(score => {
        const pct = Math.max(0, Math.min(100, (score - scaleMin) / range * 100));
        const key = pct.toFixed(0);
        posCount[key] = (posCount[key] || 0) + 1;
        const offset = (posCount[key] - 1) * 3; // small vertical stagger for overlaps
        const topPct = 50 + offset;
        return `<span class="spectrum-dot" style="left:${pct.toFixed(2)}%;top:${topPct}%;background:${color}"></span>`;
    }).join('');

    const avgLine = avg !== null
        ? (() => {
            const pct = Math.max(0, Math.min(100, (avg - scaleMin) / range * 100));
            return `<span class="spectrum-avg" style="left:${pct.toFixed(2)}%"></span>`;
        })()
        : '';

    return dots + avgLine;
}

// ==========================================
// STUDENT PIN ENTRY
// ==========================================

function initStudentPin(roomName) {
    studentRoom = roomName;
    document.getElementById('s-room-label').textContent = roomName;

    document.getElementById('btn-pin-join').addEventListener('click', verifyStudentPin);
    document.getElementById('s-pin-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') verifyStudentPin();
    });
}

async function verifyStudentPin() {
    const pin = document.getElementById('s-pin-input').value.trim();
    if (!pin) return;

    hideError('pin-error');
    const btn = document.getElementById('btn-pin-join');
    btn.textContent = 'Checking…';
    btn.disabled = true;

    try {
        const snap = await get(ref(db, `spectra/${studentRoom}/config`));

        if (!snap.exists()) {
            document.getElementById('pin-error').textContent = 'Room not found.';
            document.getElementById('pin-error').classList.remove('hidden');
            btn.textContent = 'Join'; btn.disabled = false;
            return;
        }

        const config = snap.val();
        const pinHash = await hashPin(pin);

        if (config.pin !== pinHash) {
            document.getElementById('pin-error').classList.remove('hidden');
            btn.textContent = 'Join'; btn.disabled = false;
            document.getElementById('s-pin-input').value = '';
            document.getElementById('s-pin-input').focus();
            return;
        }

        // Verified
        studentConfig = config;
        showView('student-sliders');
        initStudentSliders();
    } catch (err) {
        document.getElementById('pin-error').textContent = 'Connection error. Try again.';
        document.getElementById('pin-error').classList.remove('hidden');
        btn.textContent = 'Join'; btn.disabled = false;
    }
}

// ==========================================
// STUDENT SLIDERS
// ==========================================

function initStudentSliders() {
    document.getElementById('s-sliders-room-label').textContent = studentRoom;

    const { statements, statementOrder, scaleMin, scaleMax } = studentConfig;
    const ordered = statementOrder.map(i => statements[i]);
    const mid = Math.round((scaleMin + scaleMax) / 2);

    const container = document.getElementById('sliders-container');
    container.innerHTML = '';
    studentSliderValues = {};

    ordered.forEach(statement => {
        const savedVal = studentSliderValues[statement.id] ?? mid;
        const item = document.createElement('div');
        item.className = 'slider-item';
        item.innerHTML = `
            <div class="slider-statement-text">${escapeHtml(statement.text)}</div>
            <div class="slider-row">
                <span class="slider-min">${scaleMin}</span>
                <input type="range" class="spectrum-slider"
                    id="slider-${statement.id}"
                    min="${scaleMin}" max="${scaleMax}"
                    value="${savedVal}"
                    data-id="${statement.id}">
                <span class="slider-max">${scaleMax}</span>
                <span class="slider-value" id="val-${statement.id}">${savedVal}</span>
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

    document.getElementById('submit-bar').classList.remove('hidden');
    document.getElementById('done-message').classList.add('hidden');

    // Only add submit listener if not already there
    const submitBtn = document.getElementById('btn-submit-responses');
    const newBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newBtn, submitBtn);
    newBtn.addEventListener('click', submitStudentResponses);

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

    try {
        await set(ref(db, `spectra/${studentRoom}/responses/${studentId}`), studentSliderValues);

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
    router();
});

window.addEventListener('hashchange', router);
window.addEventListener('popstate', router);
