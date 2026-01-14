import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, set, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
let room = window.location.hash.substring(1) || "lobby";
window.location.hash = room;

// Panzoom Setup
const canvas = document.getElementById('canvas');
const pz = Panzoom(canvas, { maxScale: 3, minScale: 0.1, canvas: true });
canvas.parentElement.addEventListener('wheel', pz.zoomWithWheel);

// Create Note
document.getElementById('add-note-btn').addEventListener('click', () => {
    const scale = pz.getScale();
    const pan = pz.getPan();
    const x = (window.innerWidth / 2 - pan.x) / scale;
    const y = (window.innerHeight / 2 - pan.y) / scale;

    push(ref(db, `scrims/${room}/notes`), {
        text: "New Note...",
        x: x,
        y: y,
        color: '#ffffff'
    });
});

// Sync Notes from Firebase
onValue(ref(db, `scrims/${room}/notes`), (snapshot) => {
    const container = document.getElementById('notes-container');
    const existingNotes = Array.from(container.children);
    const data = snapshot.val() || {};

    // Remove deleted notes
    existingNotes.forEach(noteEl => {
        if (!data[noteEl.id]) noteEl.remove();
    });

    // Add or Update notes
    for (let id in data) {
        let noteEl = document.getElementById(id);
        if (!noteEl) {
            noteEl = createNoteElement(id, data[id]);
            container.appendChild(noteEl);
        } else {
            // Only update position if we aren't currently dragging it
            if (!noteEl.dataset.isDragging) {
                noteEl.style.left = data[id].x + 'px';
                noteEl.style.top = data[id].y + 'px';
            }
            // Update color and text (if not focused)
            noteEl.style.backgroundColor = data[id].color;
            const textEl = noteEl.querySelector('.note-text');
            if (document.activeElement !== textEl) {
                textEl.innerText = data[id].text;
            }
        }
    }
});

function createNoteElement(id, data) {
    const div = document.createElement('div');
    div.id = id;
    div.className = 'note';
    div.innerHTML = `
        <div class="note-text" contenteditable="true">${data.text}</div>
        <div class="note-tools">
            <div class="color-dot" style="background:#ffd1dc" data-color="#ffd1dc"></div>
            <div class="color-dot" style="background:#d1e9ff" data-color="#d1e9ff"></div>
            <div class="color-dot" style="background:#d1ffda" data-color="#d1ffda"></div>
            <div class="color-dot" style="background:#ffffff" data-color="#ffffff"></div>
        </div>
    `;

    // Text Sync
    div.querySelector('.note-text').addEventListener('input', (e) => {
        update(ref(db, `scrims/${room}/notes/${id}`), { text: e.target.innerText });
    });

    // Color Sync
    div.querySelectorAll('.color-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            update(ref(db, `scrims/${room}/notes/${id}`), { color: dot.dataset.color });
        });
    });

    // Dragging logic adjusted for Zoom
    let isDown = false;
    let offset = { x: 0, y: 0 };

    div.addEventListener('mousedown', (e) => {
        if (e.target.contentEditable === "true") return; // Allow typing
        isDown = true;
        div.dataset.isDragging = "true";
        const scale = pz.getScale();
        offset = {
            x: (e.clientX / scale) - parseFloat(div.style.left),
            y: (e.clientY / scale) - parseFloat(div.style.top)
        };
        e.stopPropagation();
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        const scale = pz.getScale();
        const newX = (e.clientX / scale) - offset.x;
        const newY = (e.clientY / scale) - offset.y;
        div.style.left = newX + 'px';
        div.style.top = newY + 'px';
        update(ref(db, `scrims/${room}/notes/${id}`), { x: newX, y: newY });
    });

    window.addEventListener('mouseup', () => {
        isDown = false;
        delete div.dataset.isDragging;
    });

    return div;
}