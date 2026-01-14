import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// --- CONFIGURATION ---
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

// Get room from URL hash (e.g., #science) or prompt
let room = window.location.hash.substring(1);
if (!room) {
    room = prompt("Enter a Scrim Room Name:") || "lobby";
    window.location.hash = room;
}
document.getElementById('room-display').innerText = "#" + room;

// --- PANZOOM SETUP ---
const canvasElement = document.getElementById('canvas');
const panzoom = Panzoom(canvasElement, {
    maxScale: 3,
    minScale: 0.2,
    canvas: true
});

// Zoom with wheel
canvasElement.parentElement.addEventListener('wheel', panzoom.zoomWithWheel);

// --- NOTE LOGIC ---
document.getElementById('add-note-btn').addEventListener('click', () => {
    const text = prompt("Note text:");
    if (!text) return;

    // We'll place it in the center of the current view
    const scale = panzoom.getScale();
    const pan = panzoom.getPan();
    
    // Simple math to drop note near your current view center
    const x = (window.innerWidth / 2 - pan.x) / scale;
    const y = (window.innerHeight / 2 - pan.y) / scale;

    push(ref(db, `scrims/${room}/notes`), {
        text: text,
        x: x,
        y: y,
        color: '#ffffff'
    });
});

// Listen for notes from Firebase
onValue(ref(db, `scrims/${room}/notes`), (snapshot) => {
    const container = document.getElementById('notes-container');
    container.innerHTML = ""; // Refresh list
    snapshot.forEach((child) => {
        const data = child.val();
        const note = document.createElement('div');
        note.className = 'note';
        note.style.left = data.x + 'px';
        note.style.top = data.y + 'px';
        note.style.backgroundColor = data.color;
        note.innerText = data.text;
        container.appendChild(note);
    });
});