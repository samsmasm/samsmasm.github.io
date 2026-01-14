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

// --- 5. ARROWS LOGIC (FIXED) ---
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
    
    // 1. Remove deleted arrows
    Array.from(container.children).forEach(el => {
        if (el.tagName === 'defs') return; // Don't delete the marker definitions
        if (!data[el.id]) el.remove();
    });

    // 2. Create or Update arrows
    for (let id in data) {
        let el = document.getElementById(id);
        if (!el) {
            el = createArrow(id, data[id]); 
            container.appendChild(el); 
        } else if (!el.dataset.dragging) {
            // Only update visuals if user isn't currently dragging it
            updateArrowVisuals(el, data[id]);
        }
    }
});

function createArrow(id, data) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.id = id;
    g.classList.add('arrow-group');

    // Main Line
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.classList.add('arrow-line');
    
    // Handles (Blue dots)
    const h1 = createHandle(id, 'start');
    const h2 = createHandle(id, 'end');

    // Delete Group (Red Button)
    const delG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    delG.classList.add('arrow-del-group');
    delG.style.cursor = "pointer";
    
    const delCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    delCircle.setAttribute("r", "10");
    delCircle.setAttribute("fill", "#ef4444");
    
    const delText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    delText.textContent = "×";
    delText.setAttribute("text-anchor", "middle");
    delText.setAttribute("dy", "5"); // Center vertically
    delText.setAttribute("fill", "white");
    delText.setAttribute("font-weight", "bold");
    delText.style.userSelect = "none";

    delG.append(delCircle, delText);
    delG.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        if(confirm("Delete this arrow?")) remove(ref(db, `scrims/${room}/arrows/${id}`));
    });

    g.append(line, h1, h2, delG);
    
    // Initial Render
    updateArrowVisuals(g, data);

    // --- INTERACTION: Drag Whole Arrow ---
    line.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        g.dataset.dragging = "true"; // Lock updates
        
        const startX = e.clientX; 
        const startY = e.clientY;
        // Read current coords directly from DOM attributes
        const x1 = parseFloat(line.getAttribute("x1"));
        const y1 = parseFloat(line.getAttribute("y1"));
        const x2 = parseFloat(line.getAttribute("x2"));
        const y2 = parseFloat(line.getAttribute("y2"));
        
        const scale = pz.getScale();

        let finalData = { x1, y1, x2, y2 };

        const onMove = (ev) => {
            const dx = (ev.clientX - startX) / scale;
            const dy = (ev.clientY - startY) / scale;
            
            finalData = { x1: x1 + dx, y1: y1 + dy, x2: x2 + dx, y2: y2 + dy };
            
            // Visual update
            updateArrowVisuals(g, { ...data, ...finalData });
        };
        
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            delete g.dataset.dragging;
            update(ref(db, `scrims/${room}/arrows/${id}`), finalData);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    });

    return g;
}

function createHandle(id, type) {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.classList.add('arrow-handle');
    c.setAttribute("r", "6"); 
    
    c.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        const g = document.getElementById(id);
        g.dataset.dragging = "true";
        
        const line = g.querySelector('.arrow-line');
        const matrix = new DOMMatrix(window.getComputedStyle(canvas).transform);
        
        // Capture static "anchor" point (the end of the arrow we are NOT moving)
        const anchorX = parseFloat(line.getAttribute(type === 'start' ? "x2" : "x1"));
        const anchorY = parseFloat(line.getAttribute(type === 'start' ? "y2" : "y1"));
        
        let finalX = 0; 
        let finalY = 0;

        const onMove = (ev) => {
            const coords = getCanvasCoordinates(ev.clientX, ev.clientY, matrix);
            finalX = coords.x;
            finalY = coords.y;

            // Construct new data object for visual update
            const newData = {
                // Keep existing style/head
                style: line.getAttribute("stroke-dasharray") ? 'dotted' : 'solid',
                head: line.getAttribute("marker-end") ? true : false,
                // Update coordinates
                x1: type === 'start' ? finalX : anchorX,
                y1: type === 'start' ? finalY : anchorY,
                x2: type === 'end' ? finalX : anchorX,
                y2: type === 'end' ? finalY : anchorY
            };
            
            updateArrowVisuals(g, newData);
        };

        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            delete g.dataset.dragging;
            
            const updatePayload = (type === 'start') 
                ? { x1: finalX, y1: finalY }
                : { x2: finalX, y2: finalY };
                
            update(ref(db, `scrims/${room}/arrows/${id}`), updatePayload);
        };
        
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    });

    return c;
}

// Helper to sync SVG attributes with Data object
function updateArrowVisuals(g, data) {
    const line = g.querySelector('.arrow-line');
    const handles = g.querySelectorAll('.arrow-handle'); // [0] is start, [1] is end
    const delG = g.querySelector('.arrow-del-group');
    const delCircle = delG.querySelector('circle');
    const delText = delG.querySelector('text');

    // 1. Line
    line.setAttribute("x1", data.x1); line.setAttribute("y1", data.y1);
    line.setAttribute("x2", data.x2); line.setAttribute("y2", data.y2);
    if (data.style === 'dotted') line.setAttribute("stroke-dasharray", "5,5");
    else line.removeAttribute("stroke-dasharray");
    if (data.head) line.setAttribute("marker-end", "url(#arrowhead)");
    else line.removeAttribute("marker-end");

    // 2. Handles
    handles[0].setAttribute("cx", data.x1); handles[0].setAttribute("cy", data.y1);
    handles[1].setAttribute("cx", data.x2); handles[1].setAttribute("cy", data.y2);

    // 3. Delete Button (Center)
    const midX = (data.x1 + data.x2) / 2;
    const midY = (data.y1 + data.y2) / 2;
    delCircle.setAttribute("cx", midX); delCircle.setAttribute("cy", midY - 15);
    delText.setAttribute("x", midX); delText.setAttribute("y", midY - 15);
}