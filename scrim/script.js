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

// --- 1. SETUP & ROOMS ---
let room = window.location.hash.substring(1);
while (!room) {
    room = prompt("Room Name:")?.replace(/[^a-zA-Z0-9-_]/g, '');
    if(room) window.location.hash = room;
}
document.getElementById('room-display').innerText = "#" + room;

const canvas = document.getElementById('canvas');
const pz = Panzoom(canvas, {
    maxScale: 3, minScale: 0.1, canvas: true,
    excludeClass: 'note' 
});

canvas.parentElement.addEventListener('wheel', pz.zoomWithWheel);
document.getElementById('zoom-slider').addEventListener('input', (e) => pz.zoom(parseFloat(e.target.value)));
canvas.addEventListener('panzoomzoom', (e) => document.getElementById('zoom-slider').value = e.detail.scale);

// --- 2. MATH HELPERS (OPTIMIZED) ---

// Converts screen pixels (mouse) to canvas coordinates (x,y)
// We cache the matrix on mousedown to avoid recalc during drag
function getCanvasCoordinates(clientX, clientY, cachedMatrix = null) {
    const matrix = cachedMatrix || new DOMMatrix(window.getComputedStyle(canvas).transform);
    return {
        x: (clientX - matrix.e) / matrix.a,
        y: (clientY - matrix.f) / matrix.a
    };
}

// Gets the center of the viewport in canvas coordinates (for dropping new items)
function getViewCenter() {
    return getCanvasCoordinates(window.innerWidth / 2, window.innerHeight / 2);
}

// --- 3. EXPORT FUNCTIONS ---
window.exportTXT = () => {
    let content = "SCRIM NOTES - Room: #" + room + "\n---------------------------\n\n";
    document.querySelectorAll('.note-text').forEach(n => {
        if(n.innerText.trim()) content += "• " + n.innerText.trim() + "\n\n";
    });
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `scrim-${room}.txt`;
    a.click();
};

window.exportJPG = async () => {
    try {
        const c = await html2canvas(document.getElementById('canvas'), {
            backgroundColor: '#f0f2f5',
            ignoreElements: (el) => el.classList.contains('ui-layer')
        });
        const a = document.createElement('a');
        a.href = c.toDataURL("image/jpeg");
        a.download = `scrim-${room}.jpg`;
        a.click();
    } catch (e) { alert("Snapshot failed: " + e.message); }
};

// --- 4. NOTES LOGIC ---
window.addNote = () => {
    const c = getViewCenter();
    push(ref(db, `scrims/${room}/notes`), {
        text: "", x: c.x - 100, y: c.y - 70, color: '#ffffff'
    });
};

onValue(ref(db, `scrims/${room}/notes`), snap => {
    const container = document.getElementById('notes-container');
    const data = snap.val() || {};
    
    // Cleanup deleted
    Array.from(container.children).forEach(n => { if(!data[n.id]) n.remove(); });

    for (let id in data) {
        let el = document.getElementById(id);
        if (!el) { el = createNote(id, data[id]); container.appendChild(el); }
        
        // Only update if NOT currently being dragged by local user
        if (!el.dataset.dragging) {
            el.style.left = data[id].x + 'px';
            el.style.top = data[id].y + 'px';
            el.style.backgroundColor = data[id].color;
            // Only update text if not focused to prevent cursor jumping
            if(document.activeElement !== el.querySelector('.note-text')) 
                el.querySelector('.note-text').innerText = data[id].text;
        }
    }
});

function createNote(id, data) {
    const div = document.createElement('div');
    div.id = id;
    div.className = 'note';
    const colors = ['#ffffff', '#ffd1dc', '#d1e9ff', '#d1ffda', '#fef3c7', '#e9d5ff', '#ffedd5'];
    
    div.innerHTML = `
        <div class="del-btn">×</div>
        <div class="note-text" contenteditable="true"></div>
        <div class="note-tools">
            ${colors.map(c => `<div class="color-dot" style="background:${c}" data-c="${c}"></div>`).join('')}
        </div>
    `;
    div.querySelector('.note-text').innerText = data.text;
    
    // Delete & Color (Direct updates)
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

    // --- OPTIMIZED DRAG LOGIC ---
    div.addEventListener('mousedown', (e) => {
        if (e.target === textEl || e.target.classList.contains('del-btn') || e.target.classList.contains('color-dot')) return;
        e.stopPropagation();
        
        div.dataset.dragging = "true";
        div.classList.add('selected');
        
        // 1. Capture starting state
        const startX = e.clientX; 
        const startY = e.clientY;
        const startLeft = parseFloat(div.style.left);
        const startTop = parseFloat(div.style.top);
        const scale = pz.getScale(); // Get scale ONCE

        let finalX = startLeft;
        let finalY = startTop;

        const onMove = (ev) => {
            // 2. Calculate Delta (pure math, no DB calls)
            const dx = (ev.clientX - startX) / scale;
            const dy = (ev.clientY - startY) / scale;
            finalX = startLeft + dx;
            finalY = startTop + dy;
            
            // 3. Update DOM locally for smooth 60fps
            div.style.left = finalX + 'px';
            div.style.top = finalY + 'px';
        };

        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            delete div.dataset.dragging;
            div.classList.remove('selected');
            
            // 4. Update Database ONCE at the end
            update(ref(db, `scrims/${room}/notes/${id}`), { x: finalX, y: finalY });
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    });

    return div;
}

// --- 5. ARROWS LOGIC (OPTIMIZED) ---
window.addArrow = (style, hasHead) => {
    const c = getViewCenter();
    push(ref(db, `scrims/${room}/arrows`), {
        x1: c.x - 50, y1: c.y, x2: c.x + 50, y2: c.y,
        style: style, head: hasHead
    });
};

onValue(ref(db, `scrims/${room}/arrows`), snap => {
    const container = document.getElementById('svg-layer');
    const data = snap.val() || {};
    
    // We recreate SVG content to handle Z-indexing simply, 
    // but in a real app, we would update attributes like we do for Notes.
    // For now, this is fine as arrows are lightweight.
    let html = `<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#333"/></marker></defs>`;
    
    // Note: This approach redraws all arrows on every update. 
    // Ideally, diffing should be used, but simplified here for readability.
    container.innerHTML = html; 
    for (let id in data) createArrow(id, data[id], container);
});

function createArrow(id, data, container) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.classList.add('arrow-group');

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", data.x1); line.setAttribute("y1", data.y1);
    line.setAttribute("x2", data.x2); line.setAttribute("y2", data.y2);
    line.classList.add('arrow-line');
    if (data.style === 'dotted') line.setAttribute("stroke-dasharray", "5,5");
    if (data.head) line.setAttribute("marker-end", "url(#arrowhead)");

    // Handles
    const h1 = createHandle(data.x1, data.y1, id, 'start', data);
    const h2 = createHandle(data.x2, data.y2, id, 'end', data);

    // Delete Button
    const cx = (data.x1 + data.x2) / 2;
    const cy = (data.y1 + data.y2) / 2;
    const del = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    del.classList.add('arrow-del');
    del.setAttribute("cx", cx); del.setAttribute("cy", cy - 15);
    del.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        if(confirm("Delete arrow?")) remove(ref(db, `scrims/${room}/arrows/${id}`));
    });

    g.append(line, h1, h2, del);
    container.appendChild(g);

    // --- DRAG WHOLE ARROW ---
    line.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        const startX = e.clientX; 
        const startY = e.clientY;
        const scale = pz.getScale();
        const init = { ...data };
        let finalData = { ...init };

        const onMove = (ev) => {
            const dx = (ev.clientX - startX) / scale;
            const dy = (ev.clientY - startY) / scale;
            
            // Visual Update Only
            line.setAttribute("x1", init.x1 + dx); line.setAttribute("y1", init.y1 + dy);
            line.setAttribute("x2", init.x2 + dx); line.setAttribute("y2", init.y2 + dy);
            h1.setAttribute("cx", init.x1 + dx); h1.setAttribute("cy", init.y1 + dy);
            h2.setAttribute("cx", init.x2 + dx); h2.setAttribute("cy", init.y2 + dy);
            del.setAttribute("cx", (init.x1 + init.x2)/2 + dx); 
            del.setAttribute("cy", (init.y1 + init.y2)/2 + dy - 15);

            finalData = { 
                x1: init.x1 + dx, y1: init.y1 + dy, 
                x2: init.x2 + dx, y2: init.y2 + dy 
            };
        };
        
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            update(ref(db, `scrims/${room}/arrows/${id}`), finalData);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    });
}

function createHandle(x, y, id, type, currentData) {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", x); c.setAttribute("cy", y);
    c.classList.add('arrow-handle');
    
    c.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        
        // CACHE MATRIX ONCE!
        const matrix = new DOMMatrix(window.getComputedStyle(canvas).transform);
        let finalX = x;
        let finalY = y;

        const onMove = (ev) => {
            // Use cached matrix for super-fast math
            const coords = getCanvasCoordinates(ev.clientX, ev.clientY, matrix);
            finalX = coords.x;
            finalY = coords.y;

            // Visual update handled by re-rendering line? 
            // In this simplified version, we just let the line "snap" on refresh
            // OR we could visually update the line here for polish.
            // For now, dragging the handle is invisible until mouseup to save complexity,
            // or we update the handle position locally:
            c.setAttribute("cx", finalX);
            c.setAttribute("cy", finalY);
        };

        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            
            // DB Update
            if (type === 'start') update(ref(db, `scrims/${room}/arrows/${id}`), { x1: finalX, y1: finalY });
            else update(ref(db, `scrims/${room}/arrows/${id}`), { x2: finalX, y2: finalY });
        };
        
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    });
    return c;
}