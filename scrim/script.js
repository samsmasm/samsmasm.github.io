import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// 1. FIX ROOM PROMPT
// We check hash first. If empty, prompt.
let room = window.location.hash.substring(1);
while (!room) {
    room = prompt("Enter a Room Name (e.g. DesignTeam):");
    if(room) {
        // Clean the string
        room = room.replace(/[^a-zA-Z0-9-_]/g, ''); 
        window.location.hash = room;
    }
}
document.getElementById('room-display').innerText = "#" + room;

// 2. PANZOOM & SLIDER SETUP
const canvas = document.getElementById('canvas');
const zoomSlider = document.getElementById('zoom-slider');

const pz = Panzoom(canvas, {
    maxScale: 3, minScale: 0.1, canvas: true,
    // CRITICAL: Tells Panzoom to ignore clicks on notes
    excludeClass: 'note' 
});

// Link Wheel to Panzoom
canvas.parentElement.addEventListener('wheel', pz.zoomWithWheel);

// Link Slider to Panzoom
zoomSlider.addEventListener('input', (e) => {
    pz.zoom(parseFloat(e.target.value));
});
canvas.addEventListener('panzoomzoom', (e) => {
    zoomSlider.value = e.detail.scale; // Sync slider when wheel is used
});

// 3. GLOBAL CLICK LISTENER (To deselect text)
document.getElementById('viewport').addEventListener('mousedown', (e) => {
    if (e.target.id === 'viewport' || e.target.id === 'canvas') {
        // Clicked background -> Remove focus from text
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        document.querySelectorAll('.note').forEach(n => n.classList.remove('selected'));
    }
});

// 4. ADD NOTE (CENTERED ON VIEW)
document.getElementById('add-note-btn').addEventListener('click', () => {
    const scale = pz.getScale();
    const pan = pz.getPan();
    
    // Calculate center of screen relative to canvas
    const x = ((window.innerWidth / 2) - pan.x) / scale;
    const y = ((window.innerHeight / 2) - pan.y) / scale;

    push(ref(db, `scrims/${room}/notes`), {
        text: "",
        x: x - 100, // Offset so center of note is at center of screen
        y: y - 70, 
        color: '#ffffff'
    });
});

// 5. FIREBASE SYNC
onValue(ref(db, `scrims/${room}/notes`), (snapshot) => {
    const container = document.getElementById('notes-container');
    const data = snapshot.val() || {};
    
    // Clear deleted notes
    Array.from(container.children).forEach(el => {
        if(!data[el.id]) el.remove();
    });

    for (let id in data) {
        let el = document.getElementById(id);
        if (!el) {
            el = createNote(id, data[id]);
            container.appendChild(el);
        } else if (!el.dataset.dragging) {
            // Only update position if I'm not the one dragging it
            el.style.left = data[id].x + 'px';
            el.style.top = data[id].y + 'px';
            el.style.backgroundColor = data[id].color;
            // Only update text if I'm not the one typing
            const textEl = el.querySelector('.note-text');
            if(document.activeElement !== textEl) textEl.innerText = data[id].text;
        }
    }
});

// 6. NOTE CREATION & LOGIC
function createNote(id, data) {
    const div = document.createElement('div');
    div.id = id;
    div.className = 'note';
    div.style.left = data.x + 'px';
    div.style.top = data.y + 'px';
    div.style.backgroundColor = data.color;
    
    div.innerHTML = `
        <div class="note-text" contenteditable="true"></div>
        <div class="note-tools">
            <div class="color-dot" style="background:#ffd1dc" data-c="#ffd1dc"></div>
            <div class="color-dot" style="background:#d1e9ff" data-c="#d1e9ff"></div>
            <div class="color-dot" style="background:#d1ffda" data-c="#d1ffda"></div>
            <div class="color-dot" style="background:#ffffff" data-c="#ffffff"></div>
        </div>
    `;
    
    div.querySelector('.note-text').innerText = data.text; // Set safely

    // TEXT LOGIC
    const textEl = div.querySelector('.note-text');
    
    textEl.addEventListener('focus', () => {
        div.classList.add('selected');
        // We set a flag so dragging doesn't start while typing
        div.dataset.editing = "true"; 
    });
    
    textEl.addEventListener('blur', () => {
        delete div.dataset.editing;
        update(ref(db, `scrims/${room}/notes/${id}`), { text: textEl.innerText });
    });

    // COLOR LOGIC
    div.querySelectorAll('.color-dot').forEach(dot => {
        dot.addEventListener('mousedown', (e) => {
            e.stopPropagation(); // Don't drag when clicking color
            update(ref(db, `scrims/${room}/notes/${id}`), { color: dot.dataset.c });
        });
    });

    // DRAGGING LOGIC (Custom)
    div.addEventListener('mousedown', (e) => {
        // If clicking text, let the browser focus handle it
        if (e.target === textEl) return;
        
        // Otherwise, start dragging
        e.stopPropagation(); // Stop Panzoom from seeing this click
        
        const startX = e.clientX;
        const startY = e.clientY;
        const startLeft = parseFloat(div.style.left);
        const startTop = parseFloat(div.style.top);
        const scale = pz.getScale();
        
        div.dataset.dragging = "true";
        div.classList.add('selected');

        const onMove = (moveEvent) => {
            const dx = (moveEvent.clientX - startX) / scale;
            const dy = (moveEvent.clientY - startY) / scale;
            
            const newX = startLeft + dx;
            const newY = startTop + dy;

            div.style.left = newX + 'px';
            div.style.top = newY + 'px';
            
            // Optional: Throttle this if it's too slow
            update(ref(db, `scrims/${room}/notes/${id}`), { x: newX, y: newY });
        };

        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            delete div.dataset.dragging;
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    });

    return div;
}