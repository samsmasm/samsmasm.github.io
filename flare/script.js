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
let threshold = 3; // Default threshold

// DOM Cache
const views = {
    landing: document.getElementById('view-landing'),
    teacher: document.getElementById('view-teacher'),
    student: document.getElementById('view-student')
};

// ==========================================
// 3. INITIALIZATION & NAVIGATION
// ==========================================

window.addEventListener('DOMContentLoaded', () => {
    // 1. Check for URL Hash (Auto-Join)
    if (window.location.hash) {
        const roomFromHash = window.location.hash.substring(1).toUpperCase();
        if (roomFromHash) {
            currentRoom = roomFromHash;
            unlockAudio(); // Browser requirement hack
            initStudentMode();
            return; // Skip landing logic
        }
    }

    // 2. Setup Landing Buttons
    document.getElementById('btn-create-room').onclick = () => showInput('teacher');
    document.getElementById('btn-join-room').onclick = () => showInput('student');
    document.getElementById('btn-back').onclick = resetLanding;
    document.getElementById('btn-enter').onclick = handleEntry;

    // 3. Setup Leave Buttons
    document.getElementById('btn-leave-teacher').onclick = leaveRoom;
    document.getElementById('btn-leave-student').onclick = leaveRoom;
});

function showInput(role) {
    isTeacher = (role === 'teacher');
    document.querySelector('.btn-group').classList.add('hidden');
    document.getElementById('input-area').classList.remove('hidden');
    
    const pinContainer = document.getElementById('pin-container');
    const inputField = document.getElementById('room-code-input');
    
    if (isTeacher) {
        pinContainer.classList.remove('hidden');
    } else {
        pinContainer.classList.add('hidden');
    }
    
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
        // Teacher Security Check
        const pinInput = document.getElementById('teacher-pin-input').value.trim();
        if (!pinInput || pinInput.length < 4) return alert("Please enter a 4-digit PIN");

        await verifyTeacher(roomCode, pinInput);
    } else {
        // Student Entry
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

            // CASE 1: Legacy Room (Exists, but has no PIN)
            // We "claim" it by saving the PIN you just entered.
            if (!data.pin) {
                await set(ref(db, `rooms/${room}/config`), {
                    ...data, // Keep existing settings (threshold, cooldown)
                    pin: pin
                });
                alert("Legacy room detected. PIN has been set to: " + pin);
                initTeacherMode();
                return;
            }

            // CASE 2: Modern Room (Check PIN)
            if (data.pin === pin) {
                initTeacherMode();
            } else {
                alert("Incorrect PIN for this room.");
            }
        } else {
            // CASE 3: New Room (Create it)
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
    
    // Load config to fill inputs
    const configRef = ref(db, `rooms/${currentRoom}/config`);
    onValue(configRef, (snapshot) => {
        const data = snapshot.val();
        if(data) {
            document.getElementById('threshold-input').value = data.threshold || 3;
            document.getElementById('cooldown-input').value = data.cooldown || 30;
            document.getElementById('btn-text-input').value = data.btnText || "Slow down please";
            threshold = data.threshold || 3; // Sync local threshold
        }
    });

    // Listen for Pings
    const pingsRef = ref(db, `rooms/${currentRoom}/pings`);
    onChildAdded(pingsRef, (snapshot) => {
        handleSignal(snapshot.val());
    });

    // UI Listeners
    document.getElementById('btn-update-text').onclick = updateConfig;
    document.getElementById('threshold-input').onchange = updateConfig;
    document.getElementById('cooldown-input').onchange = updateConfig;
}

function updateConfig() {
    const text = document.getElementById('btn-text-input').value;
    const cd = parseInt(document.getElementById('cooldown-input').value);
    const th = parseInt(document.getElementById('threshold-input').value);

    // Maintain existing PIN while updating other settings
    // We use update() via set with merge logic, but simple way is to read first or just assume PIN hasn't changed locally
    // To be safe, we just update the specific fields without overwriting the whole node if possible, 
    // but the simplest way here given the structure is to merge.
    
    // NOTE: set() overwrites. We need to be careful not to delete the PIN.
    // Better strategy: Read current config, update fields, save back.
    
    get(ref(db, `rooms/${currentRoom}/config`)).then((snap) => {
        const currentData = snap.val() || {};
        set(ref(db, `rooms/${currentRoom}/config`), {
            ...currentData, // Keep the PIN
            btnText: text,
            cooldown: cd,
            threshold: th
        });
    });
    
    threshold = th;
}

function handleSignal(data) {
    const now = Date.now();
    addHistoryItem(now);

    // Threshold Logic
    recentSignals = recentSignals.filter(t => now - t < 5000); // 5 sec rolling window
    recentSignals.push(now);

    if (recentSignals.length >= threshold) {
        playSound();
        recentSignals = []; // Reset burst
    }
}

function addHistoryItem(timestamp) {
    const list = document.getElementById('history-list');
    const li = document.createElement('li');
    li.innerHTML = `Signal Received <span class="time">${new Date(timestamp).toLocaleTimeString()}</span>`;
    list.prepend(li);
    
    const countEl = document.getElementById('total-signals');
    countEl.textContent = parseInt(countEl.textContent) + 1;
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
    
    // Update URL hash so they can share it
    window.location.hash = currentRoom;

    const btn = document.getElementById('btn-signal');
    
    // Real-time Sync
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

// Helper to unlock AudioContext on iOS/Chrome
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
