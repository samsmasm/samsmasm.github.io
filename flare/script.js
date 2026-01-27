// ==========================================
// 1. FIREBASE CONFIGURATION (Must be at the top!)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, push, onChildAdded, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Your Dowserboard Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBGdNJgl1PG0IueYQk_jjn4cOg-sMFbHe0",
    authDomain: "dowserboard.firebaseapp.com",
    projectId: "dowserboard",
    storageBucket: "dowserboard.firebasestorage.app",
    messagingSenderId: "1032600748722",
    appId: "1:1032600748722:web:1584c7508fbbca617cbfab"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ==========================================
// 2. STATE MANAGEMENT
// ==========================================
let currentRoom = null;
let isTeacher = false;
let studentCooldownTimer = null;
let recentSignals = []; // To track threshold
let threshold = 1;

// DOM Elements
const views = {
    landing: document.getElementById('view-landing'),
    teacher: document.getElementById('view-teacher'),
    student: document.getElementById('view-student')
};

// ==========================================
// 3. NAVIGATION & ROOM SETUP
// ==========================================

// Ensure DOM is loaded before attaching listeners
window.addEventListener('DOMContentLoaded', () => {
    
    // Setup Button Listeners
    const btnCreate = document.getElementById('btn-create-room');
    const btnJoin = document.getElementById('btn-join-room');
    const btnEnter = document.getElementById('btn-enter');
    const btnLeave = document.getElementById('btn-leave');

    if(btnCreate) btnCreate.onclick = () => showInput('teacher');
    if(btnJoin) btnJoin.onclick = () => showInput('student');
    
    if(btnEnter) btnEnter.onclick = async () => {
        const roomCode = document.getElementById('room-code-input').value.trim().toUpperCase();
        if (!roomCode) return alert("Please enter a room name");
        
        currentRoom = roomCode;
        
        // Unlock Audio Context immediately on interaction
        unlockAudio();

        if (isTeacher) {
            initTeacherMode();
        } else {
            initStudentMode();
        }
    };

    if(btnLeave) btnLeave.onclick = () => {
        window.location.reload(); 
    };
});

function showInput(role) {
    isTeacher = (role === 'teacher');
    const inputArea = document.getElementById('input-area');
    const btnGroup = document.querySelector('.btn-group');
    const inputField = document.getElementById('room-code-input');

    if(inputArea) inputArea.classList.remove('hidden');
    if(btnGroup) btnGroup.classList.add('hidden');
    if(inputField) inputField.focus();
}

function switchView(viewName) {
    Object.values(views).forEach(el => {
        if(el) el.classList.remove('active');
    });
    if(views[viewName]) views[viewName].classList.add('active');
}

// ==========================================
// 4. TEACHER LOGIC
// ==========================================
function initTeacherMode() {
    switchView('teacher');
    const display = document.getElementById('teacher-room-display');
    if(display) display.textContent = currentRoom;
    
    // Default Settings
    updateConfig(); 

    // Listen for Pings
    const pingsRef = ref(db, `rooms/${currentRoom}/pings`);
    
    // When a new ping comes in
    onChildAdded(pingsRef, (snapshot) => {
        const data = snapshot.val();
        handleSignal(data);
    });

    // Configuration Listeners
    const btnUpdate = document.getElementById('btn-update-text');
    const inputThresh = document.getElementById('threshold-input');
    const inputCool = document.getElementById('cooldown-input');

    if(btnUpdate) btnUpdate.onclick = updateConfig;
    if(inputThresh) inputThresh.onchange = updateConfig;
    if(inputCool) inputCool.onchange = updateConfig;
}

function updateConfig() {
    const textEl = document.getElementById('btn-text-input');
    const cdEl = document.getElementById('cooldown-input');
    const thEl = document.getElementById('threshold-input');

    if(!textEl || !cdEl || !thEl) return;

    // Update local variables
    threshold = parseInt(thEl.value);

    // Sync to Firebase
    set(ref(db, `rooms/${currentRoom}/config`), {
        btnText: textEl.value,
        cooldown: parseInt(cdEl.value)
    });
}

function handleSignal(data) {
    const now = Date.now();
    
    // 1. Add to History
    addHistoryItem(now);

    // 2. Threshold Logic
    recentSignals = recentSignals.filter(t => now - t < 5000);
    recentSignals.push(now);

    if (recentSignals.length >= threshold) {
        playSound();
        recentSignals = []; 
    }
}

function addHistoryItem(timestamp) {
    const list = document.getElementById('history-list');
    if(!list) return;

    const li = document.createElement('li');
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString();
    
    li.innerHTML = `Signal Received <span class="time">${timeStr}</span>`;
    list.prepend(li);

    // Update count
    const countEl = document.getElementById('total-signals');
    if(countEl) countEl.textContent = parseInt(countEl.textContent) + 1;
}

// Audio Handling
let isPlaying = false;
function playSound() {
    if (isPlaying) return; 

    const select = document.getElementById('sound-select');
    if(!select) return;

    const soundType = select.value;
    const audioEl = document.getElementById(`audio-${soundType}`);
    
    if (audioEl) {
        isPlaying = true;
        audioEl.currentTime = 0;
        audioEl.play().catch(e => console.log("Audio blocked:", e));
        setTimeout(() => { isPlaying = false; }, 2000);
    }
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
            }).catch(() => {});
        }
    });
}

// ==========================================
// 5. STUDENT LOGIC
// ==========================================
let globalCooldown = 30;

function initStudentMode() {
    switchView('student');
    const display = document.getElementById('student-room-display');
    if(display) display.textContent = currentRoom;

    const btn = document.getElementById('btn-signal');
    
    // Listen for Config Changes
    const configRef = ref(db, `rooms/${currentRoom}/config`);
    onValue(configRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            if(btn) btn.textContent = data.btnText || "Slow down please";
            globalCooldown = data.cooldown !== undefined ? data.cooldown : 30;
        }
    });

    // Handle Button Press
    if(btn) {
        btn.onclick = () => {
            push(ref(db, `rooms/${currentRoom}/pings`), {
                timestamp: Date.now()
            });
            startStudentCooldown();
        };
    }
}

function startStudentCooldown() {
    const btn = document.getElementById('btn-signal');
    const msg = document.getElementById('cooldown-msg');
    const timerSpan = document.getElementById('timer');

    if (globalCooldown === 0) return;

    if(btn) btn.disabled = true;
    if(msg) msg.classList.remove('hidden');
    
    let timeLeft = globalCooldown;
    if(timerSpan) timerSpan.textContent = timeLeft;

    studentCooldownTimer = setInterval(() => {
        timeLeft--;
        if(timerSpan) timerSpan.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(studentCooldownTimer);
            if(btn) btn.disabled = false;
            if(msg) msg.classList.add('hidden');
        }
    }, 1000);
}
