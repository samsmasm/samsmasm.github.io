import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// --- 1. SETUP & ROOM ---
let room = window.location.hash.substring(1);
while (!room) {
    room = prompt("Room Name:")?.replace(/[^a-zA-Z0-9-_]/g, '');
    if(room) window.location.hash = room;
}
document.getElementById('room-display').innerText = "#" + room;

const canvas = document.getElementById('canvas');
const pz = Panzoom(canvas, {
    maxScale: 3, minScale: 0.1, canvas: true,
    excludeClass: 'note', exclude: document.querySelectorAll('.arrow-group')
});
canvas.parentElement.addEventListener('wheel', pz.zoomWithWheel);

// --- 2. HELPERS ---
function getCenter() {
    // Manually parse matrix to be safe
    const style = window.getComputedStyle(canvas).transform;
    let matrix = new DOMMatrix(style);
    // Inverse logic: (ScreenCenter - Translate) / Scale
    const x = ((window.innerWidth / 2) - matrix.e) / matrix.a;
    const y = ((window.innerHeight / 2) - matrix.f) / matrix.a;
    return { x, y };
}

// --- 3. NOTES LOGIC ---
window.addNote = () => {
    const c = getCenter();
    push(ref(db, `scrims/${room}/notes`), {
        text: "", x: c.x - 100, y: c.y - 70, color: '#ffffff'
    });
};

onValue(ref(db, `scrims/${room}/notes`), snap => {
    const container = document.getElementById('notes-container');
    const data = snap.val() || {};
    Array.from(container.children).forEach(n => { if(!data[n.id]) n.remove(); });

    for (let id in data) {
        let el = document.getElementById(id);
        if (!el) { el = createNote(id, data[id]); container.appendChild(el); }
        else if (!el.dataset.dragging) {
            el.style.left = data[id].x + 'px';
            el.style.top = data[id].y + 'px';
            el.style.backgroundColor = data[id].color;
            if(document.activeElement !== el.querySelector('.note-text')) 
                el.querySelector('.note-text').innerText = data[id].text;
        }
    }
});

function createNote(id, data) {
    const div = document.createElement('div');
    div.id = id;
    div.className = 'note';
    // 7 Colors Palette
    const colors = ['#ffffff', '#ffd1dc', '#d1e9ff', '#d1ffda', '#fef3c7', '#e9d5ff', '#ffedd5'];
    
    div.innerHTML = `
        <div class="del-btn" onclick="delNote('${id}')">×</div>
        <div class="note-text" contenteditable="true"></div>
        <div class="note-tools">
            ${colors.map(c => `<div class="color-dot" style="background:${c}" data-c="${c}"></div>`).join('')}
        </div>
    `;
    div.querySelector('.note-text').innerText = data.text;
    
    // Wire up events
    div.querySelector('.del-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if(confirm("Delete note?")) remove(ref(db, `scrims/${room}/notes/${id}`));
    });

    div.querySelectorAll('.color-dot').forEach(d => {
        d.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            update(ref(db, `scrims/${room}/notes/${id}`), { color: d.dataset.c });
        });
    });

    const textEl = div.querySelector('.note-text');
    textEl.addEventListener('blur', () => update(ref(db, `scrims/${room}/notes/${id}`), { text: textEl.innerText }));

    // Drag Logic
    div.addEventListener('mousedown', (e) => {
        if (e.target === textEl || e.target.classList.contains('del-btn')) return;
        e.stopPropagation();
        
        const startX = e.clientX; 
        const startY = e.clientY;
        const startL = parseFloat(div.style.left);
        const startT = parseFloat(div.style.top);
        const scale = pz.getScale();
        div.dataset.dragging = "true";

        const onMove = (ev) => {
            const dx = (ev.clientX - startX) / scale;
            const dy = (ev.clientY - startY) / scale;
            div.style.left = (startL + dx) + 'px';
            div.style.top = (startT + dy) + 'px';
            update(ref(db, `scrims/${room}/notes/${id}`), { x: startL + dx, y: startT + dy });
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

window.delNote = (id) => {}; // Handled in event listener, needed for inline click safety

// --- 4. ARROWS LOGIC ---
window.addArrow = (style, hasHead) => {
    const c = getCenter();
    push(ref(db, `scrims/${room}/arrows`), {
        x1: c.x - 50, y1: c.y, x2: c.x + 50, y2: c.y,
        style: style, head: hasHead
    });
};

onValue(ref(db, `scrims/${room}/arrows`), snap => {
    const container = document.getElementById('svg-layer');
    const data = snap.val() || {};
    
    // Clear old arrows (Simpler to rebuild SVG than diff DOM for arrows)
    // We only keep the defs
    container.innerHTML = `<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#333"/></marker></defs>`;
    
    for (let id in data) {
        createArrow(id, data[id], container);
    }
});

function createArrow(id, data, container) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.classList.add('arrow-group');
    g.dataset.id = id;

    // Line
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", data.x1); line.setAttribute("y1", data.y1);
    line.setAttribute("x2", data.x2); line.setAttribute("y2", data.y2);
    line.classList.add('arrow-line');
    if (data.style === 'dotted') line.setAttribute("stroke-dasharray", "5,5");
    if (data.head) line.setAttribute("marker-end", "url(#arrowhead)");
    
    // Handles
    const h1 = createHandle(data.x1, data.y1, 'start', id, data);
    const h2 = createHandle(data.x2, data.y2, 'end', id, data);
    
    // Center Deleter
    const cx = (data.x1 + data.x2) / 2;
    const cy = (data.y1 + data.y2) / 2;
    const del = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    del.classList.add('arrow-del');
    del.setAttribute("cx", cx); del.setAttribute("cy", cy - 15);
    del.addEventListener('click', (e) => {
        e.stopPropagation();
        if(confirm("Delete arrow?")) remove(ref(db, `scrims/${room}/arrows/${id}`));
    });

    g.append(line, h1, h2, del);
    container.appendChild(g);

    // DRAG WHOLE ARROW
    line.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        const startX = e.clientX; const startY = e.clientY;
        const scale = pz.getScale();
        const init = { x1: data.x1, y1: data.y1, x2: data.x2, y2: data.y2 };

        const onMove = (ev) => {
            const dx = (ev.clientX - startX) / scale;
            const dy = (ev.clientY - startY) / scale;
            update(ref(db, `scrims/${room}/arrows/${id}`), {
                x1: init.x1 + dx, y1: init.y1 + dy,
                x2: init.x2 + dx, y2: init.y2 + dy
            });
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', () => window.removeEventListener('mousemove', onMove), {once:true});
    });
}

function createHandle(x, y, type, id, data) {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", x); c.setAttribute("cy", y);
    c.classList.add('arrow-handle');
    
    c.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        const scale = pz.getScale();
        
        const onMove = (ev) => {
            // Calculate new position in SVG coords
            const rect = canvas.getBoundingClientRect(); // Canvas rect
            // We need coords relative to the transformed canvas origin
            // Since SVG is 1:1 with canvas, we just need mouse offset / scale
            // Wait, simplier: Just use delta like notes
            
            // Actually, for handles, it's easier to calculate absolute pos
            // We can reuse the delta logic if we are careful
            // Or better: (ev.clientX - canvasRect.left) / scale
            
            const matrix = new DOMMatrix(window.getComputedStyle(canvas).transform);
            const newX = (ev.clientX - matrix.e) / matrix.a;
            const newY = (ev.clientY - matrix.f) / matrix.a;

            if (type === 'start') update(ref(db, `scrims/${room}/arrows/${id}`), { x1: newX, y1: newY });
            else update(ref(db, `scrims/${room}/arrows/${id}`), { x2: newX, y2: newY });
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', () => window.removeEventListener('mousemove', onMove), {once:true});
    });
    return c;
}