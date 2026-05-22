document.addEventListener("DOMContentLoaded", function () {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
  
    // Cache DOM elements
    const modeSelect = document.getElementById("modeSelect");
    const blueProbabilityInput = document.getElementById("blueProbability");
    const vertexColorContainer = document.getElementById("vertexColorContainer");
    const iterationsInput = document.getElementById("iterations");
    const fractionInput = document.getElementById("fraction");
    const drawTracesCheckbox = document.getElementById("drawTraces");
    const colorPointsCheckbox = document.getElementById("colorPoints");
    const startButton = document.getElementById("startButton");
    const resetSimulationButton = document.getElementById("resetSimulationButton");
    const resetAllButton = document.getElementById("resetAllButton");
  
    // Status message element for feedback
    const statusMessage = document.createElement("p");
    document.body.insertBefore(statusMessage, canvas.nextSibling);
  
    // Store user-drawn vertices (each: {x, y, color})
    let vertices = [];
    let running = false;
  
    // Update UI based on mode selection
    function updateModeUI() {
      const mode = modeSelect.value;
      if (mode === "redOnly") {
        document.getElementById("blueProbabilityContainer").style.display = "none";
        vertexColorContainer.style.display = "none";
      } else {
        document.getElementById("blueProbabilityContainer").style.display = "inline-block";
        vertexColorContainer.style.display = "inline-block";
      }
    }
    updateModeUI();
    modeSelect.addEventListener("change", updateModeUI);
  
    // Draw user-drawn vertices
    function drawVertices() {
      for (const vertex of vertices) {
        ctx.fillStyle = vertex.color;
        ctx.beginPath();
        ctx.arc(vertex.x, vertex.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  
    // Reset simulation dots (clear simulation output and redraw vertices)
    function resetSimulation() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawVertices();
      statusMessage.textContent = "";
    }
  
    // Reset everything: vertices and simulation dots
    function resetAll() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      vertices = [];
      statusMessage.textContent = "";
    }
  
    // When canvas is clicked, add a vertex.
    canvas.addEventListener("click", function (event) {
      if (running) return; // don't add vertices during simulation
  
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      let color = "red"; // default
  
      // Determine vertex colour based on mode
      if (modeSelect.value === "redBlue") {
        const radios = document.getElementsByName("vertexColor");
        for (const radio of radios) {
          if (radio.checked) {
            color = radio.value;
            break;
          }
        }
      }
      // In redOnly mode, vertices are always red.
  
      vertices.push({ x, y, color });
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  
    // Utility: choose a random element from an array
    function randomChoice(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }
  
    // The simulation function using asynchronous iteration.
    function chaosGameIteration(currentPoint, iterations, count, callback) {
      if (count >= iterations) {
        running = false;
        statusMessage.textContent = "Simulation complete.";
        startButton.disabled = false;
        resetSimulationButton.disabled = false;
        resetAllButton.disabled = false;
        if (callback) callback();
        return;
      }
  
      // Determine the target vertex based on the mode
      const mode = modeSelect.value;
      let targetVertex = null;
      if (mode === "redOnly") {
        const redVertices = vertices.filter(v => v.color === "red");
        if (redVertices.length === 0) {
          alert("No red vertices available.");
          running = false;
          return;
        }
        targetVertex = randomChoice(redVertices);
      } else { // redBlue mode
        const probBlue = parseFloat(blueProbabilityInput.value);
        if (isNaN(probBlue) || probBlue < 0 || probBlue > 1) {
          alert("Please enter a valid probability for blue between 0 and 1.");
          running = false;
          return;
        }
        const randomNum = Math.random();
        let desiredColor = randomNum < probBlue ? "blue" : "red";
        // Filter vertices by the desired color.
        const filtered = vertices.filter(v => v.color === desiredColor);
        // If no vertex of the desired colour, try the other colour.
        if (filtered.length === 0) {
          const otherFiltered = vertices.filter(v => v.color === (desiredColor === "blue" ? "red" : "blue"));
          if (otherFiltered.length === 0) {
            alert("No vertices available for simulation.");
            running = false;
            return;
          }
          targetVertex = randomChoice(otherFiltered);
        } else {
          targetVertex = randomChoice(filtered);
        }
      }
  
      // Get the fraction value
      let fraction = parseFloat(fractionInput.value);
      if (isNaN(fraction) || fraction < 0 || fraction > 1) {
        alert("Please enter a valid fraction (0-1).");
        running = false;
        return;
      }
  
      // Compute the new point position using the fraction (allows other than 0.5)
      const newX = currentPoint.x + fraction * (targetVertex.x - currentPoint.x);
      const newY = currentPoint.y + fraction * (targetVertex.y - currentPoint.y);
  
      // Optionally draw trace lines
      if (drawTracesCheckbox.checked) {
        ctx.strokeStyle = "gray";
        ctx.beginPath();
        ctx.moveTo(currentPoint.x, currentPoint.y);
        ctx.lineTo(newX, newY);
        ctx.stroke();
      }
  
      // Determine dot color: either use target's colour (if checked) or black.
      const dotColor = colorPointsCheckbox.checked ? targetVertex.color : "black";
      ctx.fillStyle = dotColor;
      ctx.fillRect(newX, newY, 1, 1);
  
      // Prepare next iteration
      const newPoint = { x: newX, y: newY };
      if (count % 1000 === 0) {
        statusMessage.textContent = `Iterations: ${count} / ${iterations}`;
      }
  
      requestAnimationFrame(() => {
        chaosGameIteration(newPoint, iterations, count + 1, callback);
      });
    }
  
    // Start the simulation
    function startChaosGame() {
      if (vertices.length < 3) {
        alert("Please place at least three vertices!");
        return;
      }
      if (modeSelect.value === "redBlue") {
        const redCount = vertices.filter(v => v.color === "red").length;
        const blueCount = vertices.filter(v => v.color === "blue").length;
        if (redCount === 0 || blueCount === 0) {
          alert("Please ensure you have at least one red and one blue vertex.");
          return;
        }
      }
  
      const iterations = parseInt(iterationsInput.value);
      if (isNaN(iterations) || iterations < parseInt(iterationsInput.min) || iterations > parseInt(iterationsInput.max)) {
        alert("Please enter a valid number of iterations.");
        return;
      }
  
      // Disable controls during simulation.
      running = true;
      startButton.disabled = true;
      resetSimulationButton.disabled = true;
      resetAllButton.disabled = true;
      statusMessage.textContent = "Simulation running...";
  
      // Start with a random vertex from the vertices array.
      const initialPoint = randomChoice(vertices);
      chaosGameIteration(initialPoint, iterations, 0);
    }
  
    startButton.addEventListener("click", startChaosGame);
    resetSimulationButton.addEventListener("click", resetSimulation);
    resetAllButton.addEventListener("click", resetAll);
  });
  