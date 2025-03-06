document.addEventListener("DOMContentLoaded", function() {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const formulaInput = document.getElementById("formula");
  const drawBtn = document.getElementById("drawBtn");
  const scaleToggle = document.getElementById("scaleToggle");
  const aMinInput = document.getElementById("aMin");
  const aMaxInput = document.getElementById("aMax");
  const valuesDiv = document.getElementById("values");
  const errorDiv = document.getElementById("error");
  const cellInfoDiv = document.getElementById("cellInfo");

  // Canvas margins for axes & labels
  const marginLeft = 40;
  const marginRight = 20;
  const marginTop = 20;
  const marginBottom = 40;

  let gridData = []; // 2D array holding computed values
  let cellSize = 5;   // will be dynamically computed
  const MAX_RANGE = 250;  // maximum allowed range for both axes

  drawBtn.addEventListener("click", drawVisualization);
  canvas.addEventListener("mousemove", handleMouseMove);

  // Preprocess the input to replace | ... | with abs(...)
  function preprocessFormula(inputStr) {
    // This regex replaces any text of the form | ... | with abs(...).
    // Note: This simple regex assumes no nested absolute value bars.
    return inputStr.replace(/\|([^|]+)\|/g, "abs($1)");
  }

  function getAxisRanges() {
    const aMin = parseFloat(aMinInput.value);
    const aMax = parseFloat(aMaxInput.value);
    return { aMin, aMax };
  }

  function drawVisualization() {
    // Clear previous messages and canvas
    errorDiv.textContent = "";
    valuesDiv.textContent = "";
    cellInfoDiv.textContent = "";
    formulaInput.classList.remove("error");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let formulaStr = formulaInput.value.trim();
    if (!formulaStr) {
      errorDiv.textContent = "Please enter a formula.";
      formulaInput.classList.add("error");
      return;
    }
    
    // Preprocess to support absolute value notation using |...|
    formulaStr = preprocessFormula(formulaStr);

    let compiled;
    try {
      compiled = math.compile(formulaStr);
    } catch (e) {
      errorDiv.textContent = "Error in formula: " + e.message;
      formulaInput.classList.add("error");
      return;
    }

    // Get axis ranges (for both a and b)
    const { aMin, aMax } = getAxisRanges();
    if (aMax <= aMin) {
      errorDiv.textContent = "Axis max must be greater than axis min.";
      return;
    }
    if ((aMax - aMin) > MAX_RANGE) {
      errorDiv.textContent = `Axis range is too large. Maximum allowed range is ${MAX_RANGE}.`;
      return;
    }

    // Set grid resolution based on axis ranges.
    const range = aMax - aMin; // same for both a and b
    const gridCols = range + 1;
    const gridRows = range + 1;

    // Compute cell size so grid fits in the canvas (accounting for margins)
    const gridWidth = canvas.width - marginLeft - marginRight;
    const gridHeight = canvas.height - marginTop - marginBottom;
    cellSize = Math.min(gridWidth / range, gridHeight / range);

    gridData = [];
    let validValues = [];

    // Evaluate the formula for each grid point.
    // Add the custom functions to the scope.
    for (let i = 0; i < gridCols; i++) {
      gridData[i] = [];
      const a = aMin + i;
      for (let j = 0; j < gridRows; j++) {
        const b = aMin + j;  // Use the same range for b
        let result;
        try {
          result = compiled.evaluate({
            a,
            b,
            sin: Math.sin,
            cos: Math.cos,
            tan: Math.tan,
            log: Math.log,
            exp: Math.exp,
            sqrt: Math.sqrt,
            abs: Math.abs
          });
          if (typeof result !== "number" || !isFinite(result)) {
            result = NaN;
          }
        } catch (e) {
          result = NaN;
        }
        gridData[i][j] = result;
        if (!isNaN(result)) {
          validValues.push(result);
        }
      }
    }

    if (validValues.length === 0) {
      errorDiv.textContent = "All computed values are invalid.";
      return;
    }

    const minValue = Math.min(...validValues);
    const maxValue = Math.max(...validValues);
    let useLog = scaleToggle.checked;
    if (useLog && minValue <= 0) {
      errorDiv.textContent = "Logarithmic scale requires all values to be positive. Using linear scale instead.";
      useLog = false;
    }

    // Draw each cell of the grid.
    for (let i = 0; i < gridCols; i++) {
      for (let j = 0; j < gridRows; j++) {
        const val = gridData[i][j];
        let color = "black";
        if (!isNaN(val)) {
          let fraction;
          if (maxValue === minValue) {
            fraction = 0.5;
          } else if (useLog) {
            fraction = (Math.log(val) - Math.log(minValue)) / (Math.log(maxValue) - Math.log(minValue));
          } else {
            fraction = (val - minValue) / (maxValue - minValue);
          }
          const red = Math.round(255 * fraction);
          const blue = Math.round(255 * (1 - fraction));
          color = `rgb(${red},0,${blue})`;
        }
        ctx.fillStyle = color;
        // Convert grid indices to canvas coordinates.
        // a-axis increases left to right.
        // b-axis increases upward, so invert the vertical index.
        const x = marginLeft + i * cellSize;
        const y = marginTop + ((gridRows - 1 - j) * cellSize);
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }

    // Draw axes with tick marks and labels.
    drawAxes(aMin, aMax, gridRows);

    valuesDiv.textContent = `Min (blue): ${minValue}   |   Max (red): ${maxValue}`;
  }

  function drawAxes(aMin, aMax, gridRows) {
    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    ctx.lineWidth = 1;
    ctx.font = "10px Arial";
    
    // Draw X-axis (variable a)
    const xAxisY = canvas.height - marginBottom;
    ctx.beginPath();
    ctx.moveTo(marginLeft, xAxisY);
    ctx.lineTo(canvas.width - marginRight, xAxisY);
    ctx.stroke();

    // Tick marks for a-axis (every 10 units if possible)
    const range = aMax - aMin;
    const tickInterval = (range >= 100) ? 10 : Math.max(1, Math.floor(range / 10));
    ctx.textAlign = "center";
    for (let a = aMin; a <= aMax; a += tickInterval) {
      const i = a - aMin;
      const x = marginLeft + i * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, xAxisY);
      ctx.lineTo(x, xAxisY + 5);
      ctx.stroke();
      ctx.fillText(a, x, xAxisY + 7);
    }
    ctx.textAlign = "right";
    ctx.fillText("a", canvas.width - marginRight, xAxisY + 20);

    // Draw Y-axis (variable b)
    const yAxisX = marginLeft;
    ctx.beginPath();
    ctx.moveTo(yAxisX, marginTop);
    ctx.lineTo(yAxisX, canvas.height - marginBottom);
    ctx.stroke();

    // Tick marks for b-axis (every 10 units if possible)
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let b = aMin; b <= aMax; b += tickInterval) {
      const j = b - aMin;
      const y = marginTop + ((gridRows - 1 - j) * cellSize);
      ctx.beginPath();
      ctx.moveTo(yAxisX - 5, y);
      ctx.lineTo(yAxisX, y);
      ctx.stroke();
      ctx.fillText(b, yAxisX - 7, y);
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("b", marginLeft - 20, marginTop);
  }

  // Interactive: Show cell info on mouse hover.
  function handleMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left - marginLeft;
    const mouseY = event.clientY - rect.top - marginTop;
    const i = Math.floor(mouseX / cellSize);
    const gridRows = gridData[0] ? gridData[0].length : 0;
    const j = gridRows ? Math.floor(mouseY / cellSize) : -1;
    const adjustedJ = gridRows ? (gridRows - 1 - j) : -1;

    const { aMin } = getAxisRanges();
    if (
      gridData[i] &&
      gridData[i][adjustedJ] !== undefined
    ) {
      const a = aMin + i;
      const b = aMin + adjustedJ;
      const val = gridData[i][adjustedJ];
      cellInfoDiv.textContent = `a: ${a}, b: ${b}, value: ${val}`;
    } else {
      cellInfoDiv.textContent = "";
    }
  }
});
