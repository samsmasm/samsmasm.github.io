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

// --- 0. FORCE STYLES & SVG DEFS (Arrowheads Fix) ---
const styleTag = document.createElement('style');
styleTag.innerHTML = `
    .arrow-group { pointer-events: auto; }
    .arrow-line { stroke: #333; stroke-width: 3; fill: none; transition: stroke 0.2s; cursor: grab; }
    .arrow-group:hover .arrow-line { stroke: #4f46e5; }
    .arrow-handle { fill: #4f46e5; r: 6; opacity: 0; cursor: crosshair; transition: opacity 0.2s; }
    .arrow-group:hover .arrow-handle { opacity: 1; }
    .arrow-del-group { opacity: 0; cursor: pointer; transition: opacity 0.2s; }
    .arrow-group:hover .arrow-del-group { opacity: 1; }
    #svg-layer { pointer-events: none; z-index: 99; overflow: visible; }
    /* Snap Guide Visual */
    .snap-guide { position: absolute; width: 10px; height: 10px; background: red; border-radius: 50%; pointer-events: none; z-index: 1000; transform: translate(-50%, -50%); display: none; }
`;
document.head.appendChild(styleTag);

// Inject Arrowhead Definition
const svgLayer = document.getElementById('svg-layer');
svgLayer.innerHTML = `
    <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#333" />
        </marker>
    </defs>
`;

// --- 1. SETUP & ROOMS ---
let room = window.location.hash.substring(1);
while (!room) {
    room = prompt("Room Name:")?.replace(/[^a-zA-Z0-9-_]/g, '');
    if(room) window.location.hash = room;
}
document.getElementById('room-display').innerText = "#" + room;

const canvas = document.getElementById('canvas');

// Initialize Panzoom
const pz = Panzoom(canvas, {
    maxScale: 3, minScale: 0.1, canvas: true,
    excludeClass: 'interactive'
});

canvas.parentElement.addEventListener('wheel', pz.zoomWithWheel);
document.getElementById('zoom-slider').addEventListener('input', (e) => pz.zoom(parseFloat(e.target.value)));
canvas.addEventListener('panzoomzoom', (e) => document.getElementById('zoom-slider').value = e.detail.scale);

// --- 2. MATH HELPERS ---
function getCanvasMatrix() {
    const style = window.getComputedStyle(canvas).transform;
    return (style === 'none') ? new DOMMatrix() : new DOMMatrix(style);
}

function getViewCenter() {
    const matrix = getCanvasMatrix();
    return {
        x: ((window.innerWidth / 2) - matrix.e) / matrix.a,
        y: ((window.innerHeight / 2) - matrix.f) / matrix.a
    };
}

// --- 3. EXPORT FUNCTIONS (High-Res & Auto-Crop) ---
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
        // 1. Calculate Bounding Box of content
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const elements = document.querySelectorAll('.note, .arrow-line');
        
        if (elements.length === 0) return alert("Nothing to export!");

        elements.forEach(el => {
            const rect = el.getBoundingClientRect(); // Screen coords
            // We need canvas relative coords, but getting screen bounds is easier for a snapshot crop
            // Let's rely on Panzoom reset for simplicity and highest quality
        });

        // 2. Save current view state
        const originalTransform = canvas.style.transform;
        
        // 3. Reset View for clean export (Scale 1, centered-ish)
        // We temporarily disable transitions to make this instant
        canvas.style.transition = 'none';
        pz.reset(); 
        
        // Wait briefly for DOM to settle
        await new Promise(r => setTimeout(r, 100));

        // 4. Capture with Scale 3 (High Res)
        const c = await html2canvas(document.getElementById('canvas'), {
            backgroundColor: '#f0f2f5',
            scale: 3, // <--- Triple Resolution
            logging: false,
            ignoreElements: (el) => el.classList.contains('ui-layer')
        });

        // 5. Restore User View
        canvas.style.transform = originalTransform;
        canvas.style.transition = '';

        const a = document.createElement('a');
        a.href = c.toDataURL("image/jpeg", 0.9);
        a.download = `scrim-${room}.jpg`;
        a.click();
    } catch (e) { 
        alert("Snapshot failed: " + e.message); 
        console.error(e);
    }
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
    
    Array.from(container.children).forEach(n => { if(!data[n.id]) n.remove(); });

    for (let id in data) {
        let el = document.getElementById(id);
        if (!el) { el = createNote(id, data[id]); container.appendChild(el); }
        
        if (!el.dataset.dragging) {
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
    div.className = 'note interactive';
    const colors = ['#ffffff', '#ffd1dc', '#d1e9ff', '#d1ffda', '#fef3c7', '#e9d5ff', '#ffedd5'];
    
    div.innerHTML = `
        <div class="del-btn interactive">×</div>
        <div class="note-text interactive" contenteditable="true"></div>
        <div class="note-tools interactive">
            ${colors.map(c => `<div class="color-dot interactive" style="background:${c}" data-c="${c}"></div>`).join('')}
        </div>
    `;
    div.querySelector('.note-text').innerText = data.text;
    
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
        if (e.target === textEl || e.target.classList.contains('del-btn') || e.target.classList.contains('color-dot')) return;
        e.stopPropagation();
        
        div.dataset.dragging = "true";
        div.classList.add('selected');
        
        const startX = e.clientX; 
        const startY = e.clientY;
        const startLeft = parseFloat(div.style.left);
        const startTop = parseFloat(div.style.top);
        const scale = pz.getScale();

        let finalX = startLeft;
        let finalY = startTop;

        const onMove = (ev) => {
            const dx = (ev.clientX - startX) / scale;
            const dy = (ev.clientY - startY) / scale;
            finalX = startLeft + dx;
            finalY = startTop + dy;
            div.style.left = finalX + 'px';
            div.style.top = finalY + 'px';
        };

        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            delete div.dataset.dragging;
            div.classList.remove('selected');
            update(ref(db, `scrims/${room}/notes/${id}`), { x: finalX, y: finalY });
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    });

    return div;
}

// --- 5. ARROWS LOGIC (With Snapping) ---

// Helper: Find nearest snap point
function getNearestSnapPoint(x, y) {
    const SNAP_DIST = 30;
    let bestPoint = { x, y, dist: Infinity };

    // Iterate all notes to find anchor points
    document.querySelectorAll('.note').forEach(note => {
        const rect = {
            x: parseFloat(note.style.left),
            y: parseFloat(note.style.top),
            w: note.offsetWidth,
            h: note.offsetHeight
        };
        
        // Define 4 Anchors: Top-Mid, Right-Mid, Bottom-Mid, Left-Mid
        const anchors = [
            { x: rect.x + rect.w / 2, y: rect.y },             // Top
            { x: rect.x + rect.w,     y: rect.y + rect.h / 2 }, // Right
            { x: rect.x + rect.w / 2, y: rect.y + rect.h },     // Bottom
            { x: rect.x,              y: rect.y + rect.h / 2 }  // Left
        ];

        anchors.forEach(p => {
            const d = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
            if (d < SNAP_DIST && d < bestPoint.dist) {
                bestPoint = { x: p.x, y: p.y, dist: d, snapped: true };
            }
        });
    });

    return bestPoint;
}

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
    
    // Cleanup
    Array.from(container.children).forEach(el => {
        if (el.tagName === 'defs') return; // Don't delete our arrowhead definition!
        if (!data[el.id]) el.remove();
    });

    for (let id in data) {
        let el = document.getElementById(id);
        if (!el) {
            el = createArrow(id, data[id]); 
            container.appendChild(el); 
        } else if (!el.dataset.dragging) {
            updateArrowVisuals(el, data[id]);
        }
    }
});

function createArrow(id, data) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.id = id;
    g.classList.add('arrow-group', 'interactive');

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.classList.add('arrow-line', 'interactive');
    
    const h1 = createHandle(id, 'start');
    const h2 = createHandle(id, 'end');

    const delG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    delG.classList.add('arrow-del-group', 'interactive');
    
    const delCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    delCircle.setAttribute("r", "10");
    delCircle.setAttribute("fill", "#ef4444");
    delCircle.classList.add('interactive');
    
    const delText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    delText.textContent = "×";
    delText.setAttribute("text-anchor", "middle");
    delText.setAttribute("dy", "5");
    delText.setAttribute("fill", "white");
    delText.setAttribute("font-weight", "bold");
    delText.style.userSelect = "none";
    delText.classList.add('interactive');

    delG.append(delCircle, delText);
    
    delG.addEventListener('mousedown', (e) => {
        e.stopPropagation(); 
        if(confirm("Delete this arrow?")) remove(ref(db, `scrims/${room}/arrows/${id}`));
    });

    g.append(line, h1, h2, delG);
    updateArrowVisuals(g, data);

    // Drag Whole Arrow
    line.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        g.dataset.dragging = "true"; 
        
        const startX = e.clientX; 
        const startY = e.clientY;
        const scale = pz.getScale();
        
        const currentStyle = line.getAttribute("stroke-dasharray") ? 'dotted' : 'solid';
        const currentHead = line.getAttribute("marker-end") ? true : false;
        
        const init = {
            x1: parseFloat(line.getAttribute("x1")),
            y1: parseFloat(line.getAttribute("y1")),
            x2: parseFloat(line.getAttribute("x2")),
            y2: parseFloat(line.getAttribute("y2"))
        };
        let finalData = { ...init };

        const onMove = (ev) => {
            const dx = (ev.clientX - startX) / scale;
            const dy = (ev.clientY - startY) / scale;
            finalData = { 
                x1: init.x1 + dx, y1: init.y1 + dy, 
                x2: init.x2 + dx, y2: init.y2 + dy 
            };
            updateArrowVisuals(g, { ...finalData, style: currentStyle, head: currentHead });
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
    c.classList.add('arrow-handle', 'interactive');
    c.setAttribute("r", "6"); 
    
    c.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        const g = document.getElementById(id);
        g.dataset.dragging = "true";
        
        const line = g.querySelector('.arrow-line');
        const currentStyle = line.getAttribute("stroke-dasharray") ? 'dotted' : 'solid';
        const currentHead = line.getAttribute("marker-end") ? true : false;

        const matrix = getCanvasMatrix();
        
        const anchorX = parseFloat(line.getAttribute(type === 'start' ? "x2" : "x1"));
        const anchorY = parseFloat(line.getAttribute(type === 'start' ? "y2" : "y1"));
        
        let finalX = 0; let finalY = 0;

        const onMove = (ev) => {
            // 1. Raw Mouse Position
            const rawX = (ev.clientX - matrix.e) / matrix.a;
            const rawY = (ev.clientY - matrix.f) / matrix.a;

            // 2. Snap Logic
            const snap = getNearestSnapPoint(rawX, rawY);
            finalX = snap.x;
            finalY = snap.y;

            const newData = {
                x1: type === 'start' ? finalX : anchorX,
                y1: type === 'start' ? finalY : anchorY,
                x2: type === 'end' ? finalX : anchorX,
                y2: type === 'end' ? finalY : anchorY,
                style: currentStyle,
                head: currentHead
            };
            updateArrowVisuals(g, newData);
        };

        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            delete g.dataset.dragging;
            
            const payload = (type === 'start') ? { x1: finalX, y1: finalY } : { x2: finalX, y2: finalY };
            update(ref(db, `scrims/${room}/arrows/${id}`), payload);
        };
        
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    });
    return c;
}

function updateArrowVisuals(g, data) {
    const line = g.querySelector('.arrow-line');
    const handles = g.querySelectorAll('.arrow-handle');
    const delG = g.querySelector('.arrow-del-group');
    const delCircle = delG.querySelector('circle');
    const delText = delG.querySelector('text');

    line.setAttribute("x1", data.x1); line.setAttribute("y1", data.y1);
    line.setAttribute("x2", data.x2); line.setAttribute("y2", data.y2);
    
    if (data.style === 'dotted') line.setAttribute("stroke-dasharray", "5,5");
    else line.removeAttribute("stroke-dasharray");
    
    // Correctly reference the injected arrowhead
    if (data.head) line.setAttribute("marker-end", "url(#arrowhead)");
    else line.removeAttribute("marker-end");

    handles[0].setAttribute("cx", data.x1); handles[0].setAttribute("cy", data.y1);
    handles[1].setAttribute("cx", data.x2); handles[1].setAttribute("cy", data.y2);

    const midX = (data.x1 + data.x2) / 2;
    const midY = (data.y1 + data.y2) / 2;
    delCircle.setAttribute("cx", midX); delCircle.setAttribute("cy", midY - 15);
    delText.setAttribute("x", midX); delText.setAttribute("y", midY - 15);
}