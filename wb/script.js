// Get references to the canvases and contexts
const drawingCanvas = document.getElementById('drawingCanvas');
const gridCanvas = document.getElementById('gridCanvas');
const drawingCtx = drawingCanvas.getContext('2d');
const gridCtx = gridCanvas.getContext('2d');

// Control variables
let currentColor = "#000000";
let currentThickness = 2;
let currentTool = "pen"; // "pen", "eraser", or "eraseArea"
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let gridOn = true;
const undoStack = [];

// Variables for erase area mode
let eraseStartX = 0;
let eraseStartY = 0;
let selectionRect = null;

// Resize the canvas without scaling the drawing.
// Instead, extend the canvas and draw the saved image at original size.
function resizeCanvas() {
  // Save current drawing in a temporary canvas
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = drawingCanvas.width;
  tempCanvas.height = drawingCanvas.height;
  tempCanvas.getContext("2d").drawImage(drawingCanvas, 0, 0);
  
  // Set new dimensions (canvas fills the window)
  drawingCanvas.width = window.innerWidth;
  drawingCanvas.height = window.innerHeight;
  gridCanvas.width = window.innerWidth;
  gridCanvas.height = window.innerHeight;
  
  // Redraw saved image at its original size (anchored at top-left)
  drawingCtx.drawImage(tempCanvas, 0, 0);
  
  // Redraw grid on new grid canvas
  drawGrid();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Draw grid lines on the grid canvas (light blue)
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

// Save current drawing state for undo
function saveState() {
  undoStack.push(drawingCanvas.toDataURL());
  if (undoStack.length > 20) {
    undoStack.shift();
  }
}

// Restore the previous drawing state
function undo() {
  if (undoStack.length === 0) return;
  let imgData = undoStack.pop();
  let img = new Image();
  img.onload = function() {
    drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    drawingCtx.drawImage(img, 0, 0);
  }
  img.src = imgData;
}

// Get the correct coordinates for mouse/touch events
function getCoords(e) {
  const rect = drawingCanvas.getBoundingClientRect();
  if (e.touches) {
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    };
  } else {
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }
}

// Begin drawing or starting an erase area selection
function startDrawing(e) {
  const coords = getCoords(e);
  if (currentTool === "eraseArea") {
    // Start erase area selection
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
    e.preventDefault();
    return;
  }
  // Normal drawing mode
  isDrawing = true;
  lastX = coords.x;
  lastY = coords.y;
  saveState();
  e.preventDefault();
}

// Draw a line segment or update the erase area selection rectangle
function draw(e) {
  const coords = getCoords(e);
  if (currentTool === "eraseArea") {
    if (!selectionRect) return;
    const x = Math.min(eraseStartX, coords.x);
    const y = Math.min(eraseStartY, coords.y);
    const w = Math.abs(coords.x - eraseStartX);
    const h = Math.abs(coords.y - eraseStartY);
    selectionRect.style.left = x + "px";
    selectionRect.style.top = y + "px";
    selectionRect.style.width = w + "px";
    selectionRect.style.height = h + "px";
    e.preventDefault();
    return;
  }
  if (!isDrawing) return;
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
  e.preventDefault();
}

// End drawing or finalize the erase area selection
function stopDrawing(e) {
  const coords = getCoords(e);
  if (currentTool === "eraseArea") {
    if (!selectionRect) return;
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
    e.preventDefault();
    return;
  }
  if (!isDrawing) return;
  drawingCtx.beginPath();
  drawingCtx.moveTo(lastX, lastY);
  drawingCtx.lineTo(coords.x, coords.y);
  drawingCtx.strokeStyle = (currentTool === "eraser") ? "#FFFFFF" : currentColor;
  drawingCtx.lineWidth = currentThickness;
  drawingCtx.lineCap = "round";
  drawingCtx.lineJoin = "round";
  drawingCtx.stroke();
  isDrawing = false;
  e.preventDefault();
}

// Mouse events
drawingCanvas.addEventListener('mousedown', startDrawing);
drawingCanvas.addEventListener('mousemove', draw);
drawingCanvas.addEventListener('mouseup', stopDrawing);
drawingCanvas.addEventListener('mouseout', stopDrawing);

// Touch events
drawingCanvas.addEventListener('touchstart', startDrawing);
drawingCanvas.addEventListener('touchmove', draw);
drawingCanvas.addEventListener('touchend', stopDrawing);

// Control button event listeners

// Color selection
document.querySelectorAll('.color-btn').forEach(button => {
  button.addEventListener('click', () => {
    currentColor = button.getAttribute('data-color');
    currentTool = "pen"; // switch back to pen when a color is selected
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

// Save: composite the drawing on a white background (no grid)
document.getElementById('saveButton').addEventListener('click', () => {
  const composite = document.createElement('canvas');
  composite.width = drawingCanvas.width;
  composite.height = drawingCanvas.height;
  const compCtx = composite.getContext('2d');
  compCtx.fillStyle = "#FFFFFF";
  compCtx.fillRect(0, 0, composite.width, composite.height);
  compCtx.drawImage(drawingCanvas, 0, 0);
  const link = document.createElement('a');
  link.download = 'whiteboard.png';
  link.href = composite.toDataURL('image/png');
  link.click();
});

// Print: composite the drawing (transparent background, no grid) without scaling
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
