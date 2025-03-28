/*******************************************************
 * script.js - Using Pointer Events for unified input
 * to fix the stylus "straight-line" bug
 ******************************************************/

// References to canvases and contexts
const drawingCanvas = document.getElementById('drawingCanvas');
const gridCanvas = document.getElementById('gridCanvas');
const drawingCtx = drawingCanvas.getContext('2d');
const gridCtx = gridCanvas.getContext('2d');

// Tool and drawing state variables
let currentColor = "#000000";
let currentThickness = 2;
let currentTool = "pen"; // "pen", "eraser", or "eraseArea"
let isDrawing = false;
let hasMoved = false;
let lastX = 0;
let lastY = 0;
let gridOn = true;
const undoStack = [];

// Variables for Erase Area
let eraseStartX = 0;
let eraseStartY = 0;
let selectionRect = null;

// Maintain a "maximum" canvas size that can grow but not shrink
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;

/*******************************************************
 * Initialization and Resizing
 *******************************************************/
function initCanvas() {
  drawingCanvas.width = canvasWidth;
  drawingCanvas.height = canvasHeight;
  gridCanvas.width = canvasWidth;
  gridCanvas.height = canvasHeight;
  drawGrid();
}
initCanvas();

/**
 * Only grow the canvas if the window becomes larger.
 * If the window is smaller, we keep the bigger canvas
 * so the user can scroll to see the rest.
 */
function resizeCanvas() {
  // Check if window is larger than our current canvas size
  const newWidth = window.innerWidth;
  const newHeight = window.innerHeight;
  
  // If neither dimension is bigger, do nothing
  if (newWidth <= canvasWidth && newHeight <= canvasHeight) return;
  
  // Save current drawing
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = drawingCanvas.width;
  tempCanvas.height = drawingCanvas.height;
  tempCanvas.getContext('2d').drawImage(drawingCanvas, 0, 0);
  
  // Update our "maximum" width/height
  canvasWidth = Math.max(canvasWidth, newWidth);
  canvasHeight = Math.max(canvasHeight, newHeight);
  
  // Resize real canvases
  drawingCanvas.width = canvasWidth;
  drawingCanvas.height = canvasHeight;
  gridCanvas.width = canvasWidth;
  gridCanvas.height = canvasHeight;
  
  // Redraw the saved image at the top-left
  drawingCtx.drawImage(tempCanvas, 0, 0);
  
  // Redraw grid
  drawGrid();
}
window.addEventListener('resize', resizeCanvas);

/*******************************************************
 * Grid Drawing
 *******************************************************/
function drawGrid() {
  gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
  if (!gridOn) return;
  
  gridCtx.strokeStyle = '#ADD8E6';
  gridCtx.lineWidth = 0.5;
  const spacing = 50; // spacing between grid lines
  
  // Vertical lines
  for (let x = spacing; x < gridCanvas.width; x += spacing) {
    gridCtx.beginPath();
    gridCtx.moveTo(x, 0);
    gridCtx.lineTo(x, gridCanvas.height);
    gridCtx.stroke();
  }
  // Horizontal lines
  for (let y = spacing; y < gridCanvas.height; y += spacing) {
    gridCtx.beginPath();
    gridCtx.moveTo(0, y);
    gridCtx.lineTo(gridCanvas.width, y);
    gridCtx.stroke();
  }
}

/*******************************************************
 * Undo Stack
 *******************************************************/
function saveState() {
  undoStack.push(drawingCanvas.toDataURL());
  if (undoStack.length > 20) {
    undoStack.shift();
  }
}

function undo() {
  if (undoStack.length === 0) return;
  const imgData = undoStack.pop();
  const img = new Image();
  img.onload = function() {
    drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    drawingCtx.drawImage(img, 0, 0);
  };
  img.src = imgData;
}

/*******************************************************
 * Pointer Event Helpers
 *******************************************************/
function getPointerCoords(e) {
  // Use clientX/Y for pointer events
  const rect = drawingCanvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

/*******************************************************
 * Pointer Event Handlers
 *******************************************************/

// 1) pointerdown
function pointerDownHandler(e) {
  e.preventDefault();
  
  if (currentTool === "eraseArea") {
    // Begin erase-area selection
    const coords = getPointerCoords(e);
    eraseStartX = coords.x;
    eraseStartY = coords.y;
    
    selectionRect = document.createElement("div");
    selectionRect.id = "selectionRect";
    selectionRect.style.position = "absolute";
    selectionRect.style.border = "1px dashed #000";
    selectionRect.style.background = "rgba(200,200,200,0.3)";
    selectionRect.style.pointerEvents = "none";
    selectionRect.style.left = coords.x + "px";
    selectionRect.style.top = coords.y + "px";
    selectionRect.style.width = "0px";
    selectionRect.style.height = "0px";
    
    document.getElementById("container").appendChild(selectionRect);
    return;
  }
  
  // Normal pen/eraser logic
  isDrawing = true;
  hasMoved = false;
  saveState();
  
  const coords = getPointerCoords(e);
  lastX = coords.x;
  lastY = coords.y;
}

// 2) pointermove
function pointerMoveHandler(e) {
  e.preventDefault();
  
  // Erase area dragging
  if (currentTool === "eraseArea" && selectionRect) {
    const coords = getPointerCoords(e);
    const x = Math.min(eraseStartX, coords.x);
    const y = Math.min(eraseStartY, coords.y);
    const w = Math.abs(coords.x - eraseStartX);
    const h = Math.abs(coords.y - eraseStartY);
    
    selectionRect.style.left = x + "px";
    selectionRect.style.top = y + "px";
    selectionRect.style.width = w + "px";
    selectionRect.style.height = h + "px";
    return;
  }
  
  // If we're not actively drawing, exit
  if (!isDrawing) return;
  
  // Draw or erase
  hasMoved = true;
  const coords = getPointerCoords(e);
  drawingCtx.beginPath();
  drawingCtx.moveTo(lastX, lastY);
  drawingCtx.lineTo(coords.x, coords.y);
  drawingCtx.strokeStyle = (currentTool === "eraser") ? "#FFFFFF" : currentColor;
  drawingCtx.lineWidth = currentThickness;
  drawingCtx.lineCap = "round";
  drawingCtx.lineJoin = "round";
  drawingCtx.stroke();
  
  lastX = coords.x;
  lastY = coords.y;
}

// 3) pointerup / pointercancel / pointerout
function pointerUpHandler(e) {
  e.preventDefault();
  
  // Finalize erase-area
  if (currentTool === "eraseArea" && selectionRect) {
    const coords = getPointerCoords(e);
    const x = Math.min(eraseStartX, coords.x);
    const y = Math.min(eraseStartY, coords.y);
    const w = Math.abs(coords.x - eraseStartX);
    const h = Math.abs(coords.y - eraseStartY);
    
    saveState();
    drawingCtx.clearRect(x, y, w, h);
    
    selectionRect.parentNode.removeChild(selectionRect);
    selectionRect = null;
    
    // Revert back to pen after erasing area
    currentTool = "pen";
    return;
  }
  
  // If we weren't drawing, nothing to finalize
  if (!isDrawing) return;
  
  // If the user never moved, draw a single dot
  if (!hasMoved) {
    drawingCtx.beginPath();
    drawingCtx.arc(lastX, lastY, currentThickness / 2, 0, Math.PI * 2);
    drawingCtx.fillStyle = (currentTool === "eraser") ? "#FFFFFF" : currentColor;
    drawingCtx.fill();
  }
  
  isDrawing = false;
}

/*******************************************************
 * Register Pointer Events
 *******************************************************/
drawingCanvas.addEventListener('pointerdown', pointerDownHandler);
drawingCanvas.addEventListener('pointermove', pointerMoveHandler);
// We treat pointerup, pointercancel, and pointerout the same
drawingCanvas.addEventListener('pointerup', pointerUpHandler);
drawingCanvas.addEventListener('pointercancel', pointerUpHandler);
drawingCanvas.addEventListener('pointerout', pointerUpHandler);

/*******************************************************
 * Button & UI Logic
 *******************************************************/

// Color selection
document.querySelectorAll('.color-btn').forEach(button => {
  button.addEventListener('click', () => {
    currentColor = button.getAttribute('data-color');
    currentTool = "pen";
  });
});

// Thickness selection
document.querySelectorAll('.thickness-btn').forEach(button => {
  button.addEventListener('click', () => {
    currentThickness = parseInt(button.getAttribute('data-size'));
  });
});

// Tool buttons
document.getElementById('penButton').addEventListener('click', () => {
  currentTool = "pen";
});
document.getElementById('eraserButton').addEventListener('click', () => {
  currentTool = "eraser";
});
document.getElementById('eraseAreaButton').addEventListener('click', () => {
  currentTool = "eraseArea";
});
document.getElementById('undoButton').addEventListener('click', () => {
  undo();
});
document.getElementById('clearButton').addEventListener('click', () => {
  saveState();
  drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
});
document.getElementById('gridToggleButton').addEventListener('click', () => {
  gridOn = !gridOn;
  drawGrid();
});

// Save button: composite with white background (no grid)
document.getElementById('saveButton').addEventListener('click', () => {
  const composite = document.createElement('canvas');
  composite.width = drawingCanvas.width;
  composite.height = drawingCanvas.height;
  const compCtx = composite.getContext('2d');
  
  // Fill with white background
  compCtx.fillStyle = "#FFFFFF";
  compCtx.fillRect(0, 0, composite.width, composite.height);
  // Draw the actual drawing
  compCtx.drawImage(drawingCanvas, 0, 0);
  
  // Download as PNG
  const link = document.createElement('a');
  link.download = 'whiteboard.png';
  link.href = composite.toDataURL('image/png');
  link.click();
});

// Print button: composite the drawing (transparent background) without grid
document.getElementById('printButton').addEventListener('click', () => {
  const composite = document.createElement('canvas');
  composite.width = drawingCanvas.width;
  composite.height = drawingCanvas.height;
  const compCtx = composite.getContext('2d');
  compCtx.drawImage(drawingCanvas, 0, 0);
  
  const dataUrl = composite.toDataURL('image/png');
  const printWindow = window.open('', '_blank', 'width=' + drawingCanvas.width + ',height=' + drawingCanvas.height);
  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Whiteboard</title>
        <style>
          body, html { margin: 0; padding: 0; height: 100%; }
          img { display: block; }
        </style>
        <script>
          function initiatePrint() {
            setTimeout(function() {
              window.print();
            }, 200);
          }
        </script>
      </head>
      <body>
        <img src="${dataUrl}" onload="initiatePrint()">
      </body>
    </html>
  `);
  printWindow.document.close();
});
