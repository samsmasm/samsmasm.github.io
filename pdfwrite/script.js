// Global tool settings
let currentTool = 'pen'; // 'pen', 'eraser', or 'text'
let isDrawing = false;
let lastX = 0, lastY = 0;
let penColor = '#000000';
let penThickness = 2;

// PDF.js globals
let pdfDoc = null;
let currentScale = 1; // Default scale; adjust for zoom/snap later

// Container where PDF pages will be rendered
const pdfContainer = document.getElementById('pdfContainer');

// File input for PDF upload
document.getElementById('pdfInput').addEventListener('change', handleFileSelect);

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    const fileReader = new FileReader();
    fileReader.onload = function() {
      const typedarray = new Uint8Array(this.result);
      loadPDF(typedarray);
    }
    fileReader.readAsArrayBuffer(file);
  }
}

function loadPDF(data) {
  // Load PDF via PDF.js
  pdfjsLib.getDocument({ data: data }).promise.then(function(pdf) {
    pdfDoc = pdf;
    pdfContainer.innerHTML = ''; // Clear previous content
    // Render each page
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      renderPage(pageNum);
    }
  });
}

function renderPage(num) {
  pdfDoc.getPage(num).then(function(page) {
    const viewport = page.getViewport({ scale: currentScale });
    
    // Create container for this page
    const pageContainer = document.createElement('div');
    pageContainer.className = 'pageContainer';
    pageContainer.style.position = 'relative';
    pageContainer.style.marginBottom = '10px';
    pageContainer.style.width = viewport.width + 'px';
    pageContainer.style.height = viewport.height + 'px';
    
    // PDF canvas: where the PDF page is rendered
    const pdfCanvas = document.createElement('canvas');
    pdfCanvas.width = viewport.width;
    pdfCanvas.height = viewport.height;
    pdfCanvas.className = 'pdf-canvas';
    pageContainer.appendChild(pdfCanvas);
    
    const pdfCtx = pdfCanvas.getContext('2d');
    const renderContext = {
      canvasContext: pdfCtx,
      viewport: viewport
    };
    page.render(renderContext);
    
    // Annotation canvas for freehand drawing
    const annotationCanvas = document.createElement('canvas');
    annotationCanvas.width = viewport.width;
    annotationCanvas.height = viewport.height;
    annotationCanvas.style.position = 'absolute';
    annotationCanvas.style.top = '0';
    annotationCanvas.style.left = '0';
    annotationCanvas.className = 'annotationCanvas';
    pageContainer.appendChild(annotationCanvas);
    
    // Annotation layer for text boxes
    const annotationLayer = document.createElement('div');
    annotationLayer.style.position = 'absolute';
    annotationLayer.style.top = '0';
    annotationLayer.style.left = '0';
    annotationLayer.style.width = viewport.width + 'px';
    annotationLayer.style.height = viewport.height + 'px';
    annotationLayer.className = 'annotationLayer';
    pageContainer.appendChild(annotationLayer);
    
    // Append page container to PDF container
    pdfContainer.appendChild(pageContainer);
    
    // Attach event listeners for drawing and text
    addCanvasListeners(annotationCanvas);
    addTextListener(annotationLayer);
  });
}

// ----- Drawing (Pen/Eraser) on Annotation Canvas -----
function addCanvasListeners(canvas) {
  const ctx = canvas.getContext('2d');
  
  // Use pointer events to cover both mouse and touch
  canvas.addEventListener('pointerdown', function(e) {
    if (currentTool === 'pen' || currentTool === 'eraser') {
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      lastX = e.clientX - rect.left;
      lastY = e.clientY - rect.top;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      // Prevent default to avoid touch scrolling interference
      e.preventDefault();
    }
  });
  
  canvas.addEventListener('pointermove', function(e) {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineWidth = penThickness;
    ctx.lineCap = 'round';
    
    // Set drawing mode based on tool
    if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = penColor;
    }
    ctx.lineTo(x, y);
    ctx.stroke();
    lastX = x;
    lastY = y;
    e.preventDefault();
  });
  
  canvas.addEventListener('pointerup', endDrawing);
  canvas.addEventListener('pointerleave', endDrawing);
  
  function endDrawing(e) {
    if (isDrawing) {
      ctx.closePath();
      isDrawing = false;
      ctx.globalCompositeOperation = 'source-over';
      e.preventDefault();
    }
  }
}

// ----- Text Tool Implementation -----
function addTextListener(layer) {
  layer.addEventListener('click', function(e) {
    if (currentTool === 'text') {
      // Create an editable text box at the click position
      const textBox = document.createElement('div');
      textBox.contentEditable = true;
      textBox.className = 'text-box';
      textBox.style.position = 'absolute';
      
      // Calculate click position relative to the layer
      const rect = layer.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      textBox.style.left = offsetX + 'px';
      textBox.style.top = offsetY + 'px';
      textBox.style.border = '1px solid #ccc';
      textBox.style.minWidth = '50px';
      textBox.style.minHeight = '20px';
      textBox.style.padding = '2px';
      textBox.style.backgroundColor = 'rgba(255,255,255,0.8)';
      
      layer.appendChild(textBox);
      textBox.focus();
      
      // Optionally, handle blur or enter key to finalize text.
      textBox.addEventListener('blur', function() {
        // Store text content and position if needed for later PDF export.
      });
    }
  });
}

// ----- Toolbar Button Wiring -----
document.getElementById('penBtn').addEventListener('click', () => {
  currentTool = 'pen';
});
document.getElementById('eraserBtn').addEventListener('click', () => {
  currentTool = 'eraser';
});
document.getElementById('textBtn').addEventListener('click', () => {
  currentTool = 'text';
});
document.getElementById('colorPicker').addEventListener('change', (e) => {
  penColor = e.target.value;
});
document.getElementById('thicknessSelector').addEventListener('change', (e) => {
  penThickness = parseInt(e.target.value, 10);
});

// Additional toolbar functionality for zoom and snapping to width would modify `currentScale`
// and re-render the PDF pages accordingly.
