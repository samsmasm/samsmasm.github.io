// script.js

// TREE(3)-inspired tree builder with duplicate and inf-embeddability highlighting

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const canvas = document.getElementById('tree-canvas');
    const ctx = canvas.getContext('2d');
    const newTreeBtn = document.getElementById('new-tree-btn');
    const colorBtns = document.querySelectorAll('.color-options .draggable-node-source');
    const eraserToggle = document.getElementById('eraser-toggle');
    const statusMessage = document.getElementById('status-message');
    const treeCountSpan = document.getElementById('tree-count');

    // --- Configuration ---
    const GRID_SIZE = 40;
    const NODE_RADIUS = 12;
    const CONNECTION_WIDTH = 2;
    const NODE_COLORS = { red: '#E74C3C', green: '#2ECC71', blue: '#3498DB' };
    const GRID_COLOR = '#e0e0e0';
    const SELECTED_BORDER_COLOR = '#000000';
    const ERROR_COLOR = 'orange';
    const INF_COLOR = 'purple';
    const TEMP_NODE_ALPHA = 0.7;
    const EMB_SIZE_CAP = 12;
    const EMB_DEPTH_CAP = 8;

    // --- Highlight/Error State ---
    let highlightErrorTree = false;
    let duplicateRoots = new Set();
    let duplicateEdges = new Set();
    let infEmbedRoots = new Set();
    let infEmbedEdges = new Set();

    // --- Game State ---
    let nodes = [];
    let connections = [];
    let savedTrees = [];
    let nextNodeId = 0;
    let isEraserMode = false;

    // --- Computed Subtree Data ---
    let subtreeSize = {};
    let subtreeColorCount = {};

    // --- Dragging/Connecting State ---
    let draggingExistingNode = null;
    let draggingNewNodeInfo = { active: false, color: null, x: 0, y: 0 };
    let connectingState = { isConnecting: false, childNodeId: null };

    // --- Memo for inf-embedding ---
    let embedMemo = {};

    // --- Initialization ---
    function init() {
        addEventListeners();
        resizeCanvas();
        setupInitialTree();
        updateTreeCount();
    }

    // --- Canvas & Redraw ---
    function resizeCanvas() {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            redrawCanvas();
        }
    }

    function redrawCanvas() {
        computeDuplicateSubtrees();
        computeSubtreeData();
        computeInfEmbeddings();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        drawConnections();
        drawNodes();
        drawTemporaryDraggingNode();
    }

    // --- Initial Tree Setup ---
    function setupInitialTree() {
        nodes = [];
        connections = [];
        nextNodeId = 0;
        highlightErrorTree = false;
        const rootX = Math.round((canvas.width / 2) / GRID_SIZE) * GRID_SIZE;
        const rootY = Math.max(GRID_SIZE, canvas.height - GRID_SIZE * 3);
        addNode(rootX, rootY, 'red');
    }

    // --- Compute Duplicate Subtrees ---
    function computeDuplicateSubtrees() {
        const reps = {};
        nodes.forEach(n => {
            const r = generateCanonicalRepresentation(n.id);
            (reps[r] = reps[r] || []).push(n.id);
        });
        duplicateRoots.clear();
        duplicateEdges.clear();
        Object.values(reps).forEach(arr => {
            if (arr.length > 1) arr.forEach(id => duplicateRoots.add(id));
        });
        duplicateRoots.forEach(rid => {
            const q = [rid];
            while (q.length) {
                const cur = q.shift();
                connections.forEach(c => {
                    if (c.parentId === cur) {
                        duplicateEdges.add(`${c.childId}-${c.parentId}`);
                        q.push(c.childId);
                    }
                });
            }
        });
    }

    // --- Compute Subtree Data ---
    function computeSubtreeData() {
        subtreeSize = {};
        subtreeColorCount = {};
        const childrenMap = {};
        nodes.forEach(n => { childrenMap[n.id] = []; });
        connections.forEach(c => { childrenMap[c.parentId].push(c.childId); });
        function dfs(u) {
            let size = 1;
            const cnt = { red: 0, green: 0, blue: 0 };
            const col = findNodeById(u).color;
            cnt[col]++;
            childrenMap[u].forEach(v => {
                dfs(v);
                size += subtreeSize[v];
                const cc = subtreeColorCount[v];
                cnt.red += cc.red; cnt.green += cc.green; cnt.blue += cc.blue;
            });
            subtreeSize[u] = size;
            subtreeColorCount[u] = cnt;
        }
        nodes.forEach(n => {
            if (!connections.some(c => c.childId === n.id)) dfs(n.id);
        });
    }

    // --- Compute Inf-Embeddability ---
    function computeInfEmbeddings() {
        infEmbedRoots.clear();
        infEmbedEdges.clear();
        embedMemo = {};
        nodes.forEach(u => nodes.forEach(v => {
            if (u !== v && canEmbed(u, v)) {
                infEmbedRoots.add(u);
                const pc = connections.find(c => c.childId === u);
                if (pc) infEmbedEdges.add(`${pc.childId}-${pc.parentId}`);
            }
        }));
    }

    function canEmbed(u, v) {
        const key = `${u}-${v}`;
        if (embedMemo[key] !== undefined) return embedMemo[key];
        const nu = findNodeById(u), nv = findNodeById(v);
        if (nu.color !== nv.color) return embedMemo[key] = false;
        if (subtreeSize[u] > EMB_SIZE_CAP) return embedMemo[key] = false;
        const need = subtreeColorCount[u], have = subtreeColorCount[v];
        if (need.red > have.red || need.green > have.green || need.blue > have.blue)
            return embedMemo[key] = false;
        const kids = connections.filter(c => c.parentId === u).map(c => c.childId);
        const desc = getDescendantsLimited(v, EMB_DEPTH_CAP);
        const cand = kids.map(cu => desc.filter(dv => canEmbed(cu, dv)));
        const matchD = {};
        function dfsMatch(ci, seen) {
            for (const dv of cand[ci]) {
                if (seen.has(dv)) continue;
                seen.add(dv);
                if (matchD[dv] === undefined || dfsMatch(matchD[dv], seen)) {
                    matchD[dv] = ci;
                    return true;
                }
            }
            return false;
        }
        let ok = true;
        for (let i = 0; i < kids.length; i++) {
            if (!dfsMatch(i, new Set())) { ok = false; break; }
        }
        return embedMemo[key] = ok;
    }

    function getDescendantsLimited(u, maxDepth) {
        const res = [];
        function bfs(arr, d) {
            if (d > maxDepth) return;
            const next = [];
            arr.forEach(id => {
                connections.filter(c => c.parentId === id).forEach(c => {
                    res.push(c.childId);
                    next.push(c.childId);
                });
            });
            if (next.length) bfs(next, d + 1);
        }
        bfs([u], 1);
        return res;
    }

    // --- Drawing Helpers ---
    function drawGrid() {
        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let x = 0; x <= canvas.width; x += GRID_SIZE) {
            ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
        }
        for (let y = 0; y <= canvas.height; y += GRID_SIZE) {
            ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();
    }

    function drawConnections() {
        connections.forEach(c => {
            const key = `${c.childId}-${c.parentId}`;
            if (duplicateEdges.has(key)) {
                ctx.strokeStyle = ERROR_COLOR;
                ctx.lineWidth = CONNECTION_WIDTH + 1;
            } else if (infEmbedEdges.has(key)) {
                ctx.strokeStyle = INF_COLOR;
                ctx.lineWidth = CONNECTION_WIDTH + 1;
            } else {
                ctx.strokeStyle = '#333';
                ctx.lineWidth = CONNECTION_WIDTH;
            }
            const ch = findNodeById(c.childId);
            const pr = findNodeById(c.parentId);
            if (ch && pr) {
                ctx.beginPath();
                ctx.moveTo(ch.x, ch.y);
                ctx.lineTo(pr.x, pr.y);
                ctx.stroke();
            }
        });
    }

    function drawNodes() {
        nodes.forEach(n => {
            ctx.beginPath();
            ctx.arc(n.x, n.y, NODE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = NODE_COLORS[n.color] || '#cccccc';
            ctx.fill();

            const isSel = connectingState.isConnecting && connectingState.childNodeId === n.id;
            const isDup = duplicateRoots.has(n.id);
            const isInf = infEmbedRoots.has(n.id);

            let strokeColor = '#333';
            if (highlightErrorTree || isDup) strokeColor = ERROR_COLOR;
            else if (isInf) strokeColor = INF_COLOR;
            else if (isSel) strokeColor = SELECTED_BORDER_COLOR;

            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = (highlightErrorTree || isDup || isInf || isSel) ? 2 : 1;
            ctx.stroke();
        });
    }

    function drawTemporaryDraggingNode() {
        if (!draggingNewNodeInfo.active) return;
        const pos = getCanvasPosFromViewport(draggingNewNodeInfo.x, draggingNewNodeInfo.y);
        if (pos.x < 0 || pos.x > canvas.width || pos.y < 0 || pos.y > canvas.height) return;
        const snap = snapToGrid(pos.x, pos.y);
        ctx.save();
        ctx.globalAlpha = TEMP_NODE_ALPHA;
        ctx.beginPath();
        ctx.arc(snap.x, snap.y, NODE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = NODE_COLORS[draggingNewNodeInfo.color] || '#cccccc';
        ctx.fill();
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    // --- Event Listeners & Handlers ---
    function addEventListeners() {
        colorBtns.forEach(btn => {
            btn.addEventListener('mousedown', handleColorButtonMouseDown);
            btn.addEventListener('dragstart', e => e.preventDefault());
        });
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        canvas.addEventListener('mousedown', handleCanvasMouseDown);
        eraserToggle.addEventListener('change', handleEraserToggle);
        newTreeBtn.addEventListener('click', handleNewTree);
        window.addEventListener('resize', resizeCanvas);
    }

    // --- Utility Helpers ---
    function getCanvasPosFromEvent(e) {
        const r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function getCanvasPosFromViewport(x, y) {
        const r = canvas.getBoundingClientRect();
        return { x: x - r.left, y: y - r.top };
    }
    function snapToGrid(x, y) {
        let gx = Math.round(x / GRID_SIZE) * GRID_SIZE;
        let gy = Math.round(y / GRID_SIZE) * GRID_SIZE;
        gx = Math.max(0, Math.min(canvas.width, gx));
        gy = Math.max(0, Math.min(canvas.height, gy));
        return { x: gx, y: gy };
    }
    function findNodeAt(x, y) {
        const r2 = NODE_RADIUS * NODE_RADIUS;
        for (let i = nodes.length - 1; i >= 0; i--) {
            const n = nodes[i];
            const dx = x - n.x, dy = y - n.y;
            if (dx * dx + dy * dy <= r2) return n;
        }
        return null;
    }
    function findNodeById(id) { return nodes.find(n => n.id === id) || null; }
    function isGridOccupied(x, y) { return nodes.some(n => n.x === x && n.y === y); }
    function setStatus(m) { statusMessage.textContent = m; }
    function clearStatus() { statusMessage.textContent = ''; }
    function updateTreeCount() { treeCountSpan.textContent = savedTrees.length; }

    // --- Mouse Interactions ---
    function handleColorButtonMouseDown(e) {
        if (isEraserMode) return;
        e.preventDefault(); clearStatus(); highlightErrorTree = false;
        connectingState.isConnecting = false; connectingState.childNodeId = null;
        draggingExistingNode = null;
        draggingNewNodeInfo.active = true;
        draggingNewNodeInfo.color = e.target.getAttribute('data-color');
        draggingNewNodeInfo.x = e.clientX;
        draggingNewNodeInfo.y = e.clientY;
        document.body.classList.add('dragging-new-node');
        redrawCanvas();
    }
    function handleCanvasMouseDown(e) {
        if (draggingNewNodeInfo.active) return;
        const pos = getCanvasPosFromEvent(e);
        const hit = findNodeAt(pos.x, pos.y);
        clearStatus(); highlightErrorTree = false;
        if (isEraserMode) { if (hit) { deleteNodeAndSubtree(hit.id); redrawCanvas(); }}
        else if (hit) {
            if (connectingState.isConnecting) {
                const child = findNodeById(connectingState.childNodeId);
                if (child && child.id !== hit.id) {
                    if (isConnectionValid(child, hit)) addConnection(child.id, hit.id);
                    else setStatus('Invalid connection: Parent must be below child, no cycles.');
                } else setStatus('Connection cancelled.');
                connectingState.isConnecting = false; connectingState.childNodeId = null;
            } else {
                connectingState.isConnecting = true; connectingState.childNodeId = hit.id;
                setStatus(`Selected node ${hit.id}. Click potential parent below.`);
                draggingExistingNode = { node: hit, offsetX: pos.x - hit.x, offsetY: pos.y - hit.y };
                document.body.classList.add('dragging-existing-node');
            }
            redrawCanvas();
        } else if (connectingState.isConnecting) {
            connectingState.isConnecting = false; connectingState.childNodeId = null;
            setStatus('Connection cancelled.'); redrawCanvas();
        }
    }
    function handleGlobalMouseMove(e) {
        if (draggingNewNodeInfo.active) {
            draggingNewNodeInfo.x = e.clientX; draggingNewNodeInfo.y = e.clientY; redrawCanvas();
        } else if (draggingExistingNode) {
            if (connectingState.isConnecting && connectingState.childNodeId === draggingExistingNode.node.id) {
                connectingState.isConnecting = false; clearStatus();
            }
            const pos = getCanvasPosFromEvent(e), n = draggingExistingNode.node;
            let tx = pos.x - draggingExistingNode.offsetX, ty = pos.y - draggingExistingNode.offsetY;
            let pY = canvas.height;
            const pc = connections.find(c => c.childId === n.id);
            if (pc) { const p = findNodeById(pc.parentId); if (p) pY = p.y; }
            const kids = nodes.filter(x => connections.some(c=>c.parentId===n.id&&c.childId===x.id));
            const maxY = kids.length ? Math.max(...kids.map(x=>x.y)) : 0;
            const minY = maxY + GRID_SIZE, maxAllowed = pY - GRID_SIZE;
            const cy = Math.max(0, Math.min(canvas.height, Math.max(minY, Math.min(ty, maxAllowed))));
            const cx = Math.max(0, Math.min(canvas.width, tx));
            const snap = snapToGrid(cx, cy);
            if (!isGridOccupied(snap.x, snap.y)) { n.x = snap.x; n.y = snap.y; redrawCanvas(); }
        }
    }
    function handleGlobalMouseUp(e) {
        if (draggingNewNodeInfo.active) {
            const pos = getCanvasPosFromEvent(e);
            if (pos.x>=0&&pos.x<=canvas.width&&pos.y>=0&&pos.y<=canvas.height) {
                const snap = snapToGrid(pos.x,pos.y);
                if (!isGridOccupied(snap.x,snap.y)) addNode(snap.x,snap.y,draggingNewNodeInfo.color);
                else setStatus('Occupied');
            } else setStatus('Cancelled');
            draggingNewNodeInfo.active=false; document.body.classList.remove('dragging-new-node'); redrawCanvas();
        } else if (draggingExistingNode) {
            draggingExistingNode=null; document.body.classList.remove('dragging-existing-node'); redrawCanvas();
        }
    }
    function handleEraserToggle(e) {
        isEraserMode=e.target.checked;
        if (isEraserMode) { connectingState.isConnecting=false; connectingState.childNodeId=null; draggingExistingNode&&document.body.classList.remove('dragging-existing-node'); draggingExistingNode=null; draggingNewNodeInfo.active&&document.body.classList.remove('dragging-new-node'); draggingNewNodeInfo.active=false; clearStatus(); }
        canvas.classList.toggle('eraser-active',isEraserMode); redrawCanvas();
    }

    // --- Core Tree Logic ---
    function addNode(x,y,color) { const n={id:nextNodeId++,x,y,color}; nodes.push(n); redrawCanvas(); return n; }
    function addConnection(cid,pid) { if(connections.some(c=>c.childId===cid&&c.parentId===pid))return; if(cid===pid){setStatus('Self');return;} if(connections.some(c=>c.childId===cid)){setStatus('Has parent');return;} connections.push({childId:cid,parentId:pid}); setStatus('Connected'); redrawCanvas(); }
    function isConnectionValid(c,p) { if(!c||!p||p.y<=c.y)return false; const q=[p.id],vs=new Set(); while(q.length){const u=q.shift(); if(u===c.id)return false; if(vs.has(u))continue; vs.add(u); connections.filter(x=>x.parentId===u).forEach(x=>q.push(x.childId));} return true; }
    function deleteNodeAndSubtree(id){const del=new Set([id]),q=[id];while(q.length){const u=q.shift();connections.forEach(c=>{if(c.parentId===u&&!del.has(c.childId)){del.add(c.childId);q.push(c.childId);}});}nodes=nodes.filter(n=>!del.has(n.id));connections=connections.filter(c=>!del.has(c.childId)&&!del.has(c.parentId));if(!nodes.length)setupInitialTree();else if(!findRootNode()){setStatus('Reset');setupInitialTree();}redrawCanvas();}
    function findRootNode(){if(!nodes.length)return null;const cs=new Set(connections.map(c=>c.childId));const r=nodes.filter(n=>!cs.has(n.id));return r.length===1?r[0]:null;}
    function checkConnectivity(rt){const reach=new Set([rt.id]),q=[rt.id];while(q.length){const u=q.shift();connections.filter(c=>c.parentId===u).forEach(c=>{if(!reach.has(c.childId)){reach.add(c.childId);q.push(c.childId);}});}return{reachableNodes:reach,isConnected:reach.size===nodes.length};}
    function generateCanonicalRepresentation(id){const n=findNodeById(id);if(!n)return'';const ch=connections.filter(c=>c.parentId===id);if(!ch.length)return`${n.color}()`;const rs=ch.map(c=>generateCanonicalRepresentation(c.childId)).sort();return`${n.color}(${rs.join(',')})`;}
    function handleNewTree(){clearStatus();highlightErrorTree=false;const rt=findRootNode();if(!rt){setStatus('No root');redrawCanvas();return;}const cc=checkConnectivity(rt);if(!cc.isConnected){setStatus('Disconnected');redrawCanvas();return;}const can=generateCanonicalRepresentation(rt.id);if(savedTrees.includes(can)){setStatus('Duplicate');highlightErrorTree=true;redrawCanvas();}else{savedTrees.push(can);updateTreeCount();setupInitialTree();}}

    init();
});
