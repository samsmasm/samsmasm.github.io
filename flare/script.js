// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, push, get, child, onChildAdded, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
// 2. GLOBAL STATE
// ==========================================
let currentRoom = null;
let isTeacher = false;
let studentCooldownTimer = null;
let recentSignals = [];
let threshold = 3; 
let teacherJoinTime = 0; // NEW: Tracks when teacher entered

const views = {
    landing: document.getElementById('view-landing'),
    teacher: document.getElementById('view-teacher'),
    student: document.getElementById('view-student')
};

// ==========================================
// 3. INITIALIZATION & NAVIGATION
// ==========================================

window.addEventListener('DOMContentLoaded', () => {
    // URL Hash Check
    if (window.location.hash) {
        const roomFromHash = window.location.hash.substring(1).toUpperCase();
        if (roomFromHash) {
            currentRoom = roomFromHash;
            unlockAudio();
            initStudentMode();
            return;
        }
    }

    document.getElementById('btn-create-room').onclick = () => showInput('teacher');
    document.getElementById('btn-join-room').onclick = () => showInput('student');
    document.getElementById('btn-back').onclick = resetLanding;
    document.getElementById('btn-enter').onclick = handleEntry;
    document.getElementById('btn-leave-teacher').onclick = leaveRoom;
    document.getElementById('btn-leave-student').onclick = leaveRoom;
});

function showInput(role) {
    isTeacher = (role === 'teacher');
    document.querySelector('.btn-group').classList.add('hidden');
    document.getElementById('input-area').classList.remove('hidden');
    
    const pinContainer = document.getElementById('pin-container');
    const inputField = document.getElementById('room-code-input');
    
    if (isTeacher) pinContainer.classList.remove('hidden');
    else pinContainer.classList.add('hidden');
    
    inputField.focus();
}

function resetLanding() {
    document.querySelector('.btn-group').classList.remove('hidden');
    document.getElementById('input-area').classList.add('hidden');
    document.getElementById('room-code-input').value = '';
    document.getElementById('teacher-pin-input').value = '';
}

async function handleEntry() {
    const roomCode = document.getElementById('room-code-input').value.trim().toUpperCase();
    if (!roomCode) return alert("Please enter a room name");

    currentRoom = roomCode;
    unlockAudio();

    if (isTeacher) {
        const pinInput = document.getElementById('teacher-pin-input').value.trim();
        if (!pinInput || pinInput.length < 4) return alert("Please enter a 4-digit PIN");
        await verifyTeacher(roomCode, pinInput);
    } else {
        initStudentMode();
    }
}

function leaveRoom() {
    window.location.hash = "";
    window.location.reload();
}

function switchView(viewName) {
    Object.values(views).forEach(el => el.classList.remove('active'));
    views[viewName].classList.add('active');
}

// ==========================================
// 4. TEACHER LOGIC
// ==========================================

async function verifyTeacher(room, pin) {
    const roomConfigRef = child(ref(db), `rooms/${room}/config`);
    
    try {
        const snapshot = await get(roomConfigRef);
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // Legacy Room Handling
            if (!data.pin) {
                await set(ref(db, `rooms/${room}/config`), { ...data, pin: pin });
                alert("Legacy room detected. PIN set to: " + pin);
                initTeacherMode();
                return;
            }

            if (data.pin === pin) initTeacherMode();
            else alert("Incorrect PIN for this room.");
        } else {
            await set(ref(db, `rooms/${room}/config`), {
                pin: pin,
                btnText: "Slow down please",
                cooldown: 30,
                threshold: 3
            });
            initTeacherMode();
        }
    } catch (error) {
        console.error("Auth Error:", error);
        alert("Connection failed.");
    }
}

function initTeacherMode() {
    switchView('teacher');
    document.getElementById('teacher-room-display').textContent = currentRoom;
    
    // NEW: Capture join time to filter old signals
    teacherJoinTime = Date.now();
    addHistoryItem('system', 'Click count reset (Session Start)');

    const configRef = ref(db, `rooms/${currentRoom}/config`);
    onValue(configRef, (snapshot) => {
        const data = snapshot.val();
        if(data) {
            document.getElementById('threshold-input').value = data.threshold || 3;
            document.getElementById('cooldown-input').value = data.cooldown || 30;
            document.getElementById('btn-text-input').value = data.btnText || "Slow down please";
            threshold = data.threshold || 3;
        }
    });

    const pingsRef = ref(db, `rooms/${currentRoom}/pings`);
    onChildAdded(pingsRef, (snapshot) => {
        const data = snapshot.val();
        handleSignal(data);
    });

    document.getElementById('btn-update-text').onclick = updateConfig;
    document.getElementById('threshold-input').onchange = updateConfig;
    document.getElementById('cooldown-input').onchange = updateConfig;
    
    // NEW: Reset Button Listener
    document.getElementById('btn-reset-count').onclick = resetCounters;
}

// NEW: Reset Logic
function resetCounters() {
    recentSignals = []; // Clear the burst buffer
    document.getElementById('total-signals').textContent = '0'; // Visually reset
    addHistoryItem('system', 'Click count reset');
}

function updateConfig() {
    const text = document.getElementById('btn-text-input').value;
    const cd = parseInt(document.getElementById('cooldown-input').value);
    const th = parseInt(document.getElementById('threshold-input').value);
    
    get(ref(db, `rooms/${currentRoom}/config`)).then((snap) => {
        const currentData = snap.val() || {};
        set(ref(db, `rooms/${currentRoom}/config`), {
            ...currentData,
            btnText: text,
            cooldown: cd,
            threshold: th
        });
    });
    threshold = th;
}

function handleSignal(data) {
    // 1. If signal is OLDER than when teacher joined, ignore it for sound/stats
    if (data.timestamp < teacherJoinTime) {
        return; 
    }

    addHistoryItem('signal', 'Signal Received', data.timestamp);
    
    // Update Total Count
    const countEl = document.getElementById('total-signals');
    countEl.textContent = parseInt(countEl.textContent) + 1;

    // 2. Threshold Logic - use actual packet timestamp, not Date.now()
    const signalTime = data.timestamp; 
    
    // Clean up buffer (keep only last 5 sec)
    recentSignals = recentSignals.filter(t => signalTime - t < 5000);
    recentSignals.push(signalTime);

    if (recentSignals.length >= threshold) {
        playSound();
        addHistoryItem('alert', '⚠️ Sound Activated');
        recentSignals = []; // Reset burst
    }
}

// Updated History Function
function addHistoryItem(type, message, timestamp = null) {
    const list = document.getElementById('history-list');
    const li = document.createElement('li');
    
    let timeStr = "";
    if (timestamp) {
        timeStr = new Date(timestamp).toLocaleTimeString();
    }

    if (type === 'signal') {
        li.className = 'log-signal';
        li.innerHTML = `${message} <span class="time">${timeStr}</span>`;
    } else if (type === 'alert') {
        li.className = 'log-alert';
        li.innerHTML = message;
    } else if (type === 'system') {
        li.className = 'log-system';
        li.textContent = message;
    }

    list.prepend(li);
}

let isPlaying = false;
function playSound() {
    if (isPlaying) return;
    const type = document.getElementById('sound-select').value;
    const audio = document.getElementById(`audio-${type}`);
    if (audio) {
        isPlaying = true;
        audio.currentTime = 0;
        audio.play().catch(() => {});
        setTimeout(() => isPlaying = false, 2000);
    }
}

// ==========================================
// 5. STUDENT LOGIC
// ==========================================
let globalCooldown = 30;

function initStudentMode() {
    switchView('student');
    document.getElementById('student-room-display').textContent = currentRoom;
    window.location.hash = currentRoom;

    const btn = document.getElementById('btn-signal');
    
    onValue(ref(db, `rooms/${currentRoom}/config`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            btn.textContent = data.btnText || "Slow down please";
            globalCooldown = data.cooldown !== undefined ? data.cooldown : 30;
        }
    });

    btn.onclick = () => {
        push(ref(db, `rooms/${currentRoom}/pings`), { timestamp: Date.now() });
        startStudentCooldown();
    };
}

function startStudentCooldown() {
    if (globalCooldown <= 0) return;
    
    const btn = document.getElementById('btn-signal');
    const msg = document.getElementById('cooldown-msg');
    const timer = document.getElementById('timer');
    
    btn.disabled = true;
    msg.classList.remove('hidden');
    let timeLeft = globalCooldown;
    timer.textContent = timeLeft;
    
    studentCooldownTimer = setInterval(() => {
        timeLeft--;
        timer.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(studentCooldownTimer);
            btn.disabled = false;
            msg.classList.add('hidden');
        }
    }, 1000);
}

function unlockAudio() {
    ['siren', 'bells', 'meow'].forEach(id => {
        const el = document.getElementById(`audio-${id}`);
        if(el) {
            el.muted = true;
            el.play().then(() => {
                el.pause();
                el.currentTime = 0;
                el.muted = false;
            }).catch(()=>{});
        }
    });
}
