// script.js

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
    const TEMP_NODE_ALPHA = 0.7; // Transparency for dragged new node

    // --- Highlight & Error State ---
    let highlightErrorTree = false;
    // For duplicate-subtree highlighting
    let duplicateRoots = new Set();      // Node IDs that root a duplicated subtree
    let duplicateEdges = new Set();      // "childId-parentId" strings for edges in duplicated subtrees

    // --- Game State ---
    let nodes = [];          // { id, x, y, color }
    let connections = [];    // { childId, parentId }
    let savedTrees = [];     // Canonical representations of saved trees
    let nextNodeId = 0;
    let isEraserMode = false;

    // --- Dragging State ---
    let draggingExistingNode = null;  // { node, offsetX, offsetY }
    let draggingNewNodeInfo = { active: false, color: null, x: 0, y: 0 };

    // --- Connecting State ---
    let connectingState = { isConnecting: false, childNodeId: null };

    // --- Initialization ---
    function init() {
        addEventListeners();
        resizeCanvas();          // Initial sizing + draw
        setupInitialTree();      // Place root node
        updateTreeCount();
    }

    // --- Canvas Resizing & Redraw ---
    function resizeCanvas() {
        const displayWidth = canvas.clientWidth;
        const displayHeight = canvas.clientHeight;
        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = displayWidth;
            canvas.height = displayHeight;
            redrawCanvas();
        }
    }

    function redrawCanvas() {
        // Compute duplicates before draw
        computeDuplicateSubtrees();

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

        // Place a red root node at bottom center snapped to grid
        const rootX = Math.round((canvas.width / 2) / GRID_SIZE) * GRID_SIZE;
        const rootY = Math.max(GRID_SIZE, canvas.height - GRID_SIZE * 3);
        addNode(rootX, rootY, 'red');
    }

    // --- Compute Duplicate Subtrees ---
    function computeDuplicateSubtrees() {
        // Map canonical rep -> [nodeId,...]
        const reps = {};
        nodes.forEach(node => {
            const rep = generateCanonicalRepresentation(node.id);
            (reps[rep] = reps[rep] || []).push(node.id);
        });

        // Identify roots of duplicates
        duplicateRoots.clear();
        Object.values(reps).forEach(ids => {
            if (ids.length > 1) {
                ids.forEach(id => duplicateRoots.add(id));
            }
        });

        // Identify all edges in duplicated subtrees
        duplicateEdges.clear();
        duplicateRoots.forEach(rootId => {
            const queue = [rootId];
            while (queue.length) {
                const current = queue.shift();
                connections.forEach(conn => {
                    if (conn.parentId === current) {
                        duplicateEdges.add(`${conn.childId}-${conn.parentId}`);
                        queue.push(conn.childId);
                    }
                });
            }
        });
    }

    // --- Drawing Helpers ---
    function drawGrid() {
        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let x = 0; x <= canvas.width; x += GRID_SIZE) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
        }
        for (let y = 0; y <= canvas.height; y += GRID_SIZE) {
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();
    }

    function drawConnections() {
        connections.forEach(conn => {
            const child = findNodeById(conn.childId);
            const parent = findNodeById(conn.parentId);
            if (!child || !parent) return;

            const key = `${conn.childId}-${conn.parentId}`;
            if (duplicateEdges.has(key)) {
                ctx.strokeStyle = ERROR_COLOR;
                ctx.lineWidth = CONNECTION_WIDTH + 1;
            } else {
                ctx.strokeStyle = '#333';
                ctx.lineWidth = CONNECTION_WIDTH;
            }

            ctx.beginPath();
            ctx.moveTo(child.x, child.y);
            ctx.lineTo(parent.x, parent.y);
            ctx.stroke();
        });
    }

    function drawNodes() {
        nodes.forEach(node => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = NODE_COLORS[node.color] || '#cccccc';
            ctx.fill();

            const isSelected = connectingState.isConnecting && connectingState.childNodeId === node.id;
            const isDuplicateRoot = duplicateRoots.has(node.id);

            let strokeColor = '#333';
            if (highlightErrorTree)      strokeColor = ERROR_COLOR;
            else if (isDuplicateRoot)    strokeColor = ERROR_COLOR;
            else if (isSelected)         strokeColor = SELECTED_BORDER_COLOR;

            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = (highlightErrorTree || isDuplicateRoot || isSelected) ? 2 : 1;
            ctx.stroke();
        });
    }

    function drawTemporaryDraggingNode() {
        if (!draggingNewNodeInfo.active) return;
        const pos = getCanvasPosFromViewport(draggingNewNodeInfo.x, draggingNewNodeInfo.y);
        if (pos.x < 0 || pos.x > canvas.width || pos.y < 0 || pos.y > canvas.height) return;

        const snapped = snapToGrid(pos.x, pos.y);
        ctx.save();
        ctx.globalAlpha = TEMP_NODE_ALPHA;
        ctx.beginPath();
        ctx.arc(snapped.x, snapped.y, NODE_RADIUS, 0, Math.PI * 2);
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

    // --- Coordinate & Utility Helpers ---
    function getCanvasPosFromEvent(e) {
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function getCanvasPosFromViewport(x, y) {
        const rect = canvas.getBoundingClientRect();
        return { x: x - rect.left, y: y - rect.top };
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
    function findNodeById(id) {
        return nodes.find(n => n.id === id) || null;
    }
    function isGridOccupied(x, y) {
        return nodes.some(n => n.x === x && n.y === y);
    }
    function setStatus(msg) { statusMessage.textContent = msg; }
    function clearStatus() { statusMessage.textContent = ''; }
    function updateTreeCount() { treeCountSpan.textContent = savedTrees.length; }

    // --- Mouse Interaction Handlers ---
    function handleColorButtonMouseDown(e) {
        if (isEraserMode) return;
        e.preventDefault();
        clearStatus(); highlightErrorTree = false;
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
        const clicked = findNodeAt(pos.x, pos.y);
        clearStatus(); highlightErrorTree = false;
        if (isEraserMode) {
            if (clicked) { deleteNodeAndSubtree(clicked.id); redrawCanvas(); }
        } else if (clicked) {
            if (connectingState.isConnecting) {
                const child = findNodeById(connectingState.childNodeId);
                if (child && child.id !== clicked.id) {
                    if (isConnectionValid(child, clicked)) addConnection(child.id, clicked.id);
                    else setStatus('Invalid connection: Parent must be below child, no cycles.');
                } else {
                    setStatus('Connection cancelled.');
                }
                connectingState.isConnecting = false;
                connectingState.childNodeId = null;
            } else {
                // Start new connection or drag existing
                connectingState.isConnecting = true;
                connectingState.childNodeId = clicked.id;
                setStatus(`Selected node ${clicked.id}. Click potential parent below it.`);
                draggingExistingNode = {
                    node: clicked,
                    offsetX: pos.x - clicked.x,
                    offsetY: pos.y - clicked.y
                };
                document.body.classList.add('dragging-existing-node');
            }
            redrawCanvas();
        } else {
            if (connectingState.isConnecting) {
                connectingState.isConnecting = false;
                connectingState.childNodeId = null;
                setStatus('Connection cancelled.');
                redrawCanvas();
            }
        }
    }
    function handleGlobalMouseMove(e) {
        if (draggingNewNodeInfo.active) {
            draggingNewNodeInfo.x = e.clientX;
            draggingNewNodeInfo.y = e.clientY;
            redrawCanvas();
        } else if (draggingExistingNode) {
            if (connectingState.isConnecting && connectingState.childNodeId === draggingExistingNode.node.id) {
                connectingState.isConnecting = false;
                clearStatus();
            }
            const pos = getCanvasPosFromEvent(e);
            let tx = pos.x - draggingExistingNode.offsetX;
            let ty = pos.y - draggingExistingNode.offsetY;
            const node = draggingExistingNode.node;
            let parentY = canvas.height;
            const parentConn = connections.find(c => c.childId === node.id);
            if (parentConn) {
                const p = findNodeById(parentConn.parentId);
                if (p) parentY = p.y;
            }
            const kids = nodes.filter(n => connections.some(c => c.parentId === node.id && c.childId === n.id));
            const maxKidY = kids.length ? Math.max(...kids.map(n => n.y)) : 0;
            const minY = maxKidY + GRID_SIZE;
            const maxY = parentY - GRID_SIZE;
            const clampedY = Math.max(0, Math.min(canvas.height, Math.max(minY, Math.min(ty, maxY))));
            const clampedX = Math.max(0, Math.min(canvas.width, tx));
            const snapped = snapToGrid(clampedX, clampedY);
            if (!isGridOccupied(snapped.x, snapped.y)) {
                node.x = snapped.x;
                node.y = snapped.y;
                redrawCanvas();
            }
        }
    }
    function handleGlobalMouseUp(e) {
        if (draggingNewNodeInfo.active) {
            const pos = getCanvasPosFromEvent(e);
            if (pos.x >= 0 && pos.x <= canvas.width && pos.y >= 0 && pos.y <= canvas.height) {
                const snapped = snapToGrid(pos.x, pos.y);
                if (!isGridOccupied(snapped.x, snapped.y)) addNode(snapped.x, snapped.y, draggingNewNodeInfo.color);
                else setStatus('Grid position occupied.');
            } else {
                setStatus('Node drop cancelled (outside canvas).');
            }
            draggingNewNodeInfo.active = false;
            document.body.classList.remove('dragging-new-node');
            redrawCanvas();
        } else if (draggingExistingNode) {
            draggingExistingNode = null;
            document.body.classList.remove('dragging-existing-node');
            redrawCanvas();
        }
    }
    function handleEraserToggle(e) {
        isEraserMode = e.target.checked;
        if (isEraserMode) {
            connectingState.isConnecting = false;
            connectingState.childNodeId = null;
            if (draggingExistingNode) document.body.classList.remove('dragging-existing-node');
            draggingExistingNode = null;
            if (draggingNewNodeInfo.active) document.body.classList.remove('dragging-new-node');
            draggingNewNodeInfo.active = false;
            clearStatus();
        }
        canvas.classList.toggle('eraser-active', isEraserMode);
        redrawCanvas();
    }

    // --- Core Tree Logic ---
    function addNode(x, y, color) {
        if (x < 0 || x > canvas.width || y < 0 || y > canvas.height) return null;
        const node = { id: nextNodeId++, x, y, color };
        nodes.push(node);
        redrawCanvas();
        return node;
    }
    function addConnection(childId, parentId) {
        if (connections.some(c => c.childId === childId && c.parentId === parentId)) return;
        if (childId === parentId) { setStatus('Node cannot connect to itself.'); return; }
        if (connections.some(c => c.childId === childId)) { setStatus(`Node ${childId} already has a parent.`); return; }
        connections.push({ childId, parentId });
        setStatus(`Connected ${childId} to ${parentId}.`);
        redrawCanvas();
    }
    function isConnectionValid(childNode, parentNode) {
        if (!childNode || !parentNode) return false;
        if (parentNode.y <= childNode.y) return false;
        const queue = [parentNode.id];
        const visited = new Set();
        while (queue.length) {
            const curr = queue.shift();
            if (curr === childNode.id) return false;
            if (visited.has(curr)) continue;
            visited.add(curr);
            connections.filter(c => c.parentId === curr).forEach(c => queue.push(c.childId));
        }
        return true;
    }
    function deleteNodeAndSubtree(nodeId) {
        const toDelete = new Set([nodeId]);
        const queue = [nodeId];
        while (queue.length) {
            const curr = queue.shift();
            connections.forEach(c => {
                if (c.parentId === curr && !toDelete.has(c.childId)) {
                    toDelete.add(c.childId);
                    queue.push(c.childId);
                }
            });
        }
        nodes = nodes.filter(n => !toDelete.has(n.id));
        connections = connections.filter(c => !toDelete.has(c.childId) && !toDelete.has(c.parentId));
        if (nodes.length === 0) setupInitialTree();
        else if (!findRootNode()) {
            setStatus('Tree structure invalid after deletion. Resetting.');
            setupInitialTree();
        }
        redrawCanvas();
    }
    function findRootNode() {
        if (!nodes.length) return null;
        const childIds = new Set(connections.map(c => c.childId));
        const potentialRoots = nodes.filter(n => !childIds.has(n.id));
        return potentialRoots.length === 1 ? potentialRoots[0] : null;
    }
    function checkConnectivity(rootNode) {
        const reachable = new Set([rootNode.id]);
        const queue = [rootNode.id];
        while (queue.length) {
            const curr = queue.shift();
            connections.filter(c => c.parentId === curr).forEach(c => {
                if (!reachable.has(c.childId)) {
                    reachable.add(c.childId);
                    queue.push(c.childId);
                }
            });
        }
        return { reachableNodes: reachable, isConnected: reachable.size === nodes.length };
    }
    function generateCanonicalRepresentation(nodeId) {
        const node = findNodeById(nodeId);
        if (!node) return '';
        const childConns = connections.filter(c => c.parentId === nodeId);
        if (!childConns.length) return `${node.color}()`;
        const reps = childConns
            .map(c => generateCanonicalRepresentation(c.childId))
            .sort();
        return `${node.color}(${reps.join(',')})`;
    }
    function handleNewTree() {
        clearStatus(); highlightErrorTree = false;
        if (!findRootNode()) { setStatus('Invalid tree: No single root node.'); redrawCanvas(); return; }
        const { isConnected } = checkConnectivity(findRootNode());
        if (!isConnected) { setStatus('Invalid tree: Not all nodes are connected.'); redrawCanvas(); return; }
        const canon = generateCanonicalRepresentation(findRootNode().id);
        if (savedTrees.includes(canon)) {
            setStatus('Duplicate Tree Structure Detected! Cannot save.');
            highlightErrorTree = true;
            redrawCanvas();
        } else {
            savedTrees.push(canon);
            updateTreeCount();
            setupInitialTree();
        }
    }

    // --- Start the Game ---
    init();
});
