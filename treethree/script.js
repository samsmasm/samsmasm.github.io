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

    // --- Game State ---
    let nodes = []; // { id, x, y, color }
    let connections = []; // { childId, parentId }
    let savedTrees = []; // Canonical representations
    let nextNodeId = 0;
    // let selectedColor = 'red'; // No longer needed - color comes from dragged button
    let isEraserMode = false;
        // for duplicate‑subtree highlighting
    let duplicateRoots = new Set();
    let duplicateEdges = new Set();


    // State for dragging an *existing* node
    let draggingExistingNode = null; // { node: nodeObject, offsetX: number, offsetY: number }

    // State for dragging a *new* node from the palette
    let draggingNewNodeInfo = {
        active: false,
        color: null,
        x: 0, // Current mouse X relative to viewport
        y: 0  // Current mouse Y relative to viewport
    };

    // State for connecting nodes (click existing child, then existing parent)
    let connectingState = {
        isConnecting: false,
        childNodeId: null
    };

    let highlightErrorTree = false; // For duplicate display

    // --- Initialization ---
    function init() {
        addEventListeners();
        resizeCanvas(); // Initial size calculation + redraw
        setupInitialTree(); // Place root node after resize
        updateTreeCount();
        // Note: resizeCanvas calls redrawCanvas
    }

    // --- Canvas Resizing ---
    function resizeCanvas() {
        // Get the actual display size of the canvas element based on CSS
        const displayWidth = canvas.clientWidth;
        const displayHeight = canvas.clientHeight;

        // Check if the canvas size has actually changed
        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            // Set the canvas drawing buffer size to match the display size
            canvas.width = displayWidth;
            canvas.height = displayHeight;

            // Re-calculate root position if needed (or handle in setupInitialTree)
            // No need to recenter view - it fills the space

            console.log(`Canvas resized to: ${canvas.width}x${canvas.height}`);
            redrawCanvas(); // Redraw with new dimensions
        }
    }

    function setupInitialTree() {
        nodes = [];
        connections = [];
        nextNodeId = 0;
        highlightErrorTree = false;
        // Calculate root position based on *current* canvas dimensions
        const rootX = Math.round(canvas.width / (2 * GRID_SIZE)) * GRID_SIZE;
        const rootY = canvas.height - GRID_SIZE * 3; // Start bit higher
        const finalRootY = Math.max(GRID_SIZE, rootY); // Ensure within bounds

        // Ensure root X is also on grid and within bounds
        const finalRootX = Math.max(0, Math.min(canvas.width, rootX));

        addNode(finalRootX, finalRootY, 'red'); // Start with a red root node
        redrawCanvas();
    }

    // --- Drawing Functions ---
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

    function drawNodes() {
        nodes.forEach(node => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = NODE_COLORS[node.color] || '#cccccc';
            ctx.fill();

            const isSelectedForConnection = connectingState.isConnecting && connectingState.childNodeId === node.id;
            const isHighlighted = highlightErrorTree || isSelectedForConnection;

            ctx.strokeStyle = isHighlighted ? (highlightErrorTree ? ERROR_COLOR : SELECTED_BORDER_COLOR) : '#333';
            ctx.lineWidth = isHighlighted ? 2 : 1;
            ctx.stroke();
        });
    }

    function drawConnections() {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = CONNECTION_WIDTH;
        connections.forEach(conn => {
            const childNode = findNodeById(conn.childId);
            const parentNode = findNodeById(conn.parentId);
            if (childNode && parentNode) {
                ctx.beginPath();
                ctx.moveTo(childNode.x, childNode.y);
                ctx.lineTo(parentNode.x, parentNode.y);
                ctx.stroke();
            }
        });
    }

    // Draw the temporary node following the cursor when dragging from palette
    function drawTemporaryDraggingNode() {
        if (!draggingNewNodeInfo.active) return;

        const pos = getCanvasPosFromViewport(draggingNewNodeInfo.x, draggingNewNodeInfo.y);

        // Only draw if cursor is over the canvas
        if (pos.x >= 0 && pos.x <= canvas.width && pos.y >= 0 && pos.y <= canvas.height) {
            const snappedPos = snapToGrid(pos.x, pos.y);
            const color = NODE_COLORS[draggingNewNodeInfo.color] || '#cccccc';

            ctx.save(); // Save context state
            ctx.globalAlpha = TEMP_NODE_ALPHA; // Make it semi-transparent
            ctx.beginPath();
            ctx.arc(snappedPos.x, snappedPos.y, NODE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            // Maybe add a border too?
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore(); // Restore context state (like alpha)
        }
    }

    function redrawCanvas() {
        // Ensure canvas dimensions are up-to-date before drawing
        // resizeCanvas(); // Avoid calling resize within redraw - potential loop. Resize handled separately.

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        drawConnections();
        drawNodes();
        // Draw the temporary node last, so it's on top
        drawTemporaryDraggingNode();
    }

    // --- Event Listeners ---
    function addEventListeners() {
        // Listeners for dragging NEW nodes from palette
        colorBtns.forEach(btn => {
            btn.addEventListener('mousedown', handleColorButtonMouseDown);
            // Prevent browser's default drag behavior on buttons
            btn.addEventListener('dragstart', (e) => e.preventDefault());
        });

        // Global listeners to track mouse movement and release anywhere
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);

        // Listener specifically for interactions within the CANVAS
        canvas.addEventListener('mousedown', handleCanvasMouseDown);

        // Other controls
        eraserToggle.addEventListener('change', handleEraserToggle);
        newTreeBtn.addEventListener('click', handleNewTree);

        // Resize listener
        window.addEventListener('resize', resizeCanvas);
    }

    // --- Coordinate & Helper Functions ---

    // Gets mouse position relative to the canvas top-left
    function getCanvasPosFromEvent(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    // Converts viewport coordinates to canvas coordinates
    function getCanvasPosFromViewport(viewportX, viewportY) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: viewportX - rect.left,
            y: viewportY - rect.top
        };
    }


    function snapToGrid(x, y) {
        let gridX = Math.round(x / GRID_SIZE) * GRID_SIZE;
        let gridY = Math.round(y / GRID_SIZE) * GRID_SIZE;
        // Clamp to be within the canvas bounds
        gridX = Math.max(0, Math.min(canvas.width, gridX));
        gridY = Math.max(0, Math.min(canvas.height, gridY));
        return { x: gridX, y: gridY };
    }

    function findNodeAt(x, y) {
        let minDistSq = NODE_RADIUS * NODE_RADIUS;
        let foundNode = null;
        for (let i = nodes.length - 1; i >= 0; i--) { // Iterate backwards for Z-order
            const node = nodes[i];
            const dx = x - node.x;
            const dy = y - node.y;
            const distSq = dx * dx + dy * dy;
            if (distSq <= minDistSq) {
                foundNode = node;
                break;
            }
        }
        return foundNode;
    }

    function findNodeById(id) {
        return nodes.find(node => node.id === id) || null;
    }

    function isGridOccupied(x, y) {
        return nodes.some(node => node.x === x && node.y === y);
    }

    function setStatus(message) { statusMessage.textContent = message; }
    function clearStatus() { statusMessage.textContent = ''; }
    function updateTreeCount() { treeCountSpan.textContent = savedTrees.length; }


    // --- Event Handlers ---

    // Mousedown on a color button in the palette
    function handleColorButtonMouseDown(e) {
        if (isEraserMode) return; // Don't drag new nodes in eraser mode
        e.preventDefault(); // Prevent text selection, etc.
        clearStatus();
        highlightErrorTree = false; // Reset error visuals

        // Reset other potentially active states
        connectingState.isConnecting = false;
        connectingState.childNodeId = null;
        draggingExistingNode = null;

        // Start dragging a NEW node
        draggingNewNodeInfo.active = true;
        draggingNewNodeInfo.color = e.target.getAttribute('data-color');
        draggingNewNodeInfo.x = e.clientX; // Store initial viewport coords
        draggingNewNodeInfo.y = e.clientY;

        document.body.classList.add('dragging-new-node'); // Global cursor style
        redrawCanvas(); // Show the temp node immediately
    }

    // Mousedown directly on the canvas element
    function handleCanvasMouseDown(e) {
        if (draggingNewNodeInfo.active) return; // Ignore canvas clicks if dragging new node

        const pos = getCanvasPosFromEvent(e);
        const clickedNode = findNodeAt(pos.x, pos.y);
        clearStatus();
        highlightErrorTree = false; // Reset error visuals

        if (isEraserMode) {
            if (clickedNode) {
                deleteNodeAndSubtree(clickedNode.id);
                redrawCanvas();
            }
            // No action on empty space click in eraser mode
        } else {
            // --- Normal Mode ---
            if (clickedNode) {
                if (connectingState.isConnecting) {
                    // --- Trying to complete a connection (parent clicked) ---
                    const childNode = findNodeById(connectingState.childNodeId);
                    if (childNode && childNode.id !== clickedNode.id) {
                        if (isConnectionValid(childNode, clickedNode)) {
                            addConnection(childNode.id, clickedNode.id);
                        } else {
                            setStatus("Invalid connection: Parent must be below child, no cycles.");
                        }
                    } else if (childNode && childNode.id === clickedNode.id) {
                        setStatus("Connection cancelled."); // Clicked same node
                    }
                    // Reset connection state
                    connectingState.isConnecting = false;
                    connectingState.childNodeId = null;
                } else {
                    // --- Start dragging EXISTING node OR initiate connection ---
                    // Initiate connection (child clicked)
                    connectingState.isConnecting = true;
                    connectingState.childNodeId = clickedNode.id;
                    setStatus(`Selected node ${clickedNode.id}. Click potential parent below it.`);

                    // Allow dragging existing node to start
                    draggingExistingNode = {
                        node: clickedNode,
                        offsetX: pos.x - clickedNode.x,
                        offsetY: pos.y - clickedNode.y
                    };
                    document.body.classList.add('dragging-existing-node');
                }
                redrawCanvas(); // Show selection highlight
            } else {
                // --- Clicked on empty canvas space ---
                // Reset connection state if user clicks away
                if (connectingState.isConnecting) {
                    connectingState.isConnecting = false;
                    connectingState.childNodeId = null;
                    setStatus("Connection cancelled.");
                    redrawCanvas(); // Remove selection highlight
                }
                // DO NOTHING ELSE - Nodes are added via drag-from-palette now
            }
        }
    }

    // Mouse moves anywhere on the page
    function handleGlobalMouseMove(e) {
        if (draggingNewNodeInfo.active) {
            // Update position for the temporary node being dragged
            draggingNewNodeInfo.x = e.clientX;
            draggingNewNodeInfo.y = e.clientY;
            redrawCanvas(); // Redraw to show temp node moving
        }
        else if (draggingExistingNode) {
            // --- Handle dragging an EXISTING node ---
            // Cancel connection attempt if dragging starts significantly
            if (connectingState.isConnecting && connectingState.childNodeId === draggingExistingNode.node.id) {
                connectingState.isConnecting = false;
                connectingState.childNodeId = null;
                clearStatus();
            }

            const pos = getCanvasPosFromEvent(e);
            let targetX = pos.x - draggingExistingNode.offsetX;
            let targetY = pos.y - draggingExistingNode.offsetY;

            // Apply parent/child dragging constraints
            const node = draggingExistingNode.node;
            let parentY = canvas.height;
            const parentConn = connections.find(conn => conn.childId === node.id);
            if (parentConn) {
                const parentNode = findNodeById(parentConn.parentId);
                parentY = parentNode ? parentNode.y : canvas.height;
            }

            const children = nodes.filter(n => connections.some(conn => conn.parentId === node.id && conn.childId === n.id));
            let maxChildY = 0;
            if (children.length > 0) {
                 maxChildY = Math.max(...children.map(c => c.y));
            }

            const minY = maxChildY + GRID_SIZE;
            const maxY = parentY - GRID_SIZE;
            const effectiveMinY = Math.min(minY, maxY);
            const effectiveMaxY = Math.max(minY, maxY);

            const clampedY = Math.max(0, Math.min(canvas.height, Math.max(effectiveMinY, Math.min(targetY, effectiveMaxY))));
            const clampedX = Math.max(0, Math.min(canvas.width, targetX));
            const snappedPos = snapToGrid(clampedX, clampedY);

            // Check collision
            let collision = false;
            for (const otherNode of nodes) {
                if (otherNode.id !== node.id && otherNode.x === snappedPos.x && otherNode.y === snappedPos.y) {
                    collision = true;
                    break;
                }
            }

            if (!collision) {
                node.x = snappedPos.x;
                node.y = snappedPos.y;
                redrawCanvas();
            }
        }
    }

    // Mouse button released anywhere on the page
    function handleGlobalMouseUp(e) {
        // --- Handle finishing drag of NEW node ---
        if (draggingNewNodeInfo.active) {
            const pos = getCanvasPosFromEvent(e); // Get coords relative to canvas

            // Check if mouse is released over the canvas
            if (pos.x >= 0 && pos.x <= canvas.width && pos.y >= 0 && pos.y <= canvas.height) {
                const snappedPos = snapToGrid(pos.x, pos.y);
                if (!isGridOccupied(snappedPos.x, snappedPos.y)) {
                    addNode(snappedPos.x, snappedPos.y, draggingNewNodeInfo.color);
                    // addNode calls redraw, but we need it after resetting state below
                } else {
                    setStatus("Grid position occupied.");
                }
            } else {
                 setStatus("Node drop cancelled (outside canvas).");
            }

            // Reset new node drag state
            draggingNewNodeInfo.active = false;
            draggingNewNodeInfo.color = null;
            document.body.classList.remove('dragging-new-node');
            redrawCanvas(); // Final redraw without temp node
        }
        // --- Handle finishing drag of EXISTING node ---
        else if (draggingExistingNode) {
            draggingExistingNode = null;
            document.body.classList.remove('dragging-existing-node');
             // If connection was pending but no drag happened, it should still be active
             // But if dragging occurred, connection intent is cancelled by mousemove handler.
            redrawCanvas(); // Ensure final state looks right
        }

         // Note: If connection was active but no dragging, it remains active until next click.
    }

    function handleEraserToggle(e) {
        isEraserMode = e.target.checked;
        // Reset conflicting states if eraser is activated
        if (isEraserMode) {
            connectingState.isConnecting = false;
            connectingState.childNodeId = null;
            if (draggingExistingNode) { // Cancel existing drag
                 draggingExistingNode = null;
                 document.body.classList.remove('dragging-existing-node');
            }
             if (draggingNewNodeInfo.active) { // Cancel new drag
                 draggingNewNodeInfo.active = false;
                 document.body.classList.remove('dragging-new-node');
            }
            clearStatus();
        }
        canvas.classList.toggle('eraser-active', isEraserMode);
        redrawCanvas();
    }

    // --- Game Logic Functions (Mostly Unchanged, check connectivity/root finding) ---

    function addNode(x, y, color) {
        if (x < 0 || x > canvas.width || y < 0 || y > canvas.height) {
             console.error("Attempted to add node outside bounds:", x, y);
             return null;
         }
        const newNode = { id: nextNodeId++, x: x, y: y, color: color };
        nodes.push(newNode);
        // No redraw here - called by the function that initiated the add
        return newNode;
    }

    function addConnection(childId, parentId) {
         if (connections.some(conn => conn.childId === childId && conn.parentId === parentId)) return;
         if (childId === parentId) { setStatus("Node cannot connect to itself."); return; }
         if (connections.some(conn => conn.childId === childId)) {
             setStatus(`Node ${childId} already has a parent.`);
             return;
         }
         connections.push({ childId, parentId });
         setStatus(`Connected ${childId} to ${parentId}.`);
         // No redraw here - called by mouse handler which will redraw
    }

    function isConnectionValid(childNode, parentNode) {
        if (!childNode || !parentNode) return false; // Safety check
        // Rule 1: Parent must be below child
        if (parentNode.y <= childNode.y) return false;
        // Rule 2: No cycles (Check if child is an ancestor of parent)
        let downwardQueue = [parentNode.id];
        let visitedDownward = new Set();
        let head = 0;
        while (head < downwardQueue.length) {
            const currentId = downwardQueue[head++];
            if (currentId === childNode.id) return false; // Cycle!
            if (visitedDownward.has(currentId)) continue;
            visitedDownward.add(currentId);
            connections.filter(conn => conn.parentId === currentId)
                       .forEach(conn => downwardQueue.push(conn.childId));
        }
        return true;
    }

     function deleteNodeAndSubtree(nodeId) {
        let nodeIdsToDelete = new Set([nodeId]);
        let queue = [nodeId];
        let head = 0;
        while (head < queue.length) {
            const currentId = queue[head++];
            connections.forEach(conn => {
                if (conn.parentId === currentId && !nodeIdsToDelete.has(conn.childId)) {
                    nodeIdsToDelete.add(conn.childId);
                    queue.push(conn.childId);
                }
            });
        }
        nodes = nodes.filter(node => !nodeIdsToDelete.has(node.id));
        connections = connections.filter(conn => !nodeIdsToDelete.has(conn.childId) && !nodeIdsToDelete.has(conn.parentId));
        // Reset if needed
         if (nodes.length === 0) { setupInitialTree(); }
         else if (!findRootNode()) {
            setStatus("Tree structure invalid after deletion. Resetting.");
            setupInitialTree();
         }
         // Redraw is handled by the caller (mousedown)
    }

    function findRootNode() {
        if (nodes.length === 0) return null;
        const childIds = new Set(connections.map(conn => conn.childId));
        const potentialRoots = nodes.filter(node => !childIds.has(node.id));
        return potentialRoots.length === 1 ? potentialRoots[0] : null;
    }

    function checkConnectivity(rootNode) {
         const reachableNodes = new Set();
         if (!rootNode) return { reachableNodes, isConnected: false };
         const queue = [rootNode.id];
         reachableNodes.add(rootNode.id);
         let head = 0;
         while(head < queue.length) {
             const currentId = queue[head++];
             connections.filter(conn => conn.parentId === currentId)
                        .forEach(conn => {
                             if (!reachableNodes.has(conn.childId)) {
                                 reachableNodes.add(conn.childId);
                                 queue.push(conn.childId);
                             }
                         });
         }
         return { reachableNodes, isConnected: reachableNodes.size === nodes.length };
    }

     function generateCanonicalRepresentation(nodeId) {
        const node = findNodeById(nodeId);
        if (!node) return '';
        const childrenConnections = connections.filter(conn => conn.parentId === nodeId);
        if (childrenConnections.length === 0) {
            return `${node.color}()`;
        }
        const childRepresentations = childrenConnections
            .map(conn => generateCanonicalRepresentation(conn.childId))
            .sort();
        return `${node.color}(${childRepresentations.join(',')})`;
    }

     function handleNewTree() {
        clearStatus();
        highlightErrorTree = false;
        if (nodes.length === 0) { setStatus("Cannot save an empty tree."); return; }
        const root = findRootNode();
        if (!root) { setStatus("Invalid tree: No single root node."); redrawCanvas(); return; }
        const { isConnected } = checkConnectivity(root);
         if (!isConnected) { setStatus("Invalid tree: Not all nodes are connected."); redrawCanvas(); return; }

        const canonicalTree = generateCanonicalRepresentation(root.id);
        if (savedTrees.includes(canonicalTree)) {
            setStatus("Duplicate Tree Structure Detected! Cannot save.");
            highlightErrorTree = true;
        } else {
            setStatus(`Tree saved! Sequence length: ${savedTrees.length + 1}. Starting new tree.`);
            savedTrees.push(canonicalTree);
            updateTreeCount();
            setupInitialTree(); // Reset state & redraws
            return; // Exit early to avoid double redraw
        }
        redrawCanvas(); // Redraw only needed if error or other issue
    }

    // --- Start the Game ---
    init();
});