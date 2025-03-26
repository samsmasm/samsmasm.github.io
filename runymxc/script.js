let amberSpeed, bobSpeed;

// Generate speeds on page load:
// Bob's speed: between 5.5 and 6.5 m/s.
// Amber's speed is between 0.5 and 1.5 m/s faster than Bob.
window.onload = function() {
  generateSpeeds();
  resetRunners();
};

function generateSpeeds() {
  bobSpeed = parseFloat((Math.random() * 1 + 5.5).toFixed(1)); // 5.5 - 6.5 m/s
  amberSpeed = parseFloat((bobSpeed + (Math.random() * 1 + 0.5)).toFixed(1)); // bobSpeed + 0.5 - bobSpeed + 1.5
  document.getElementById("speedDisplay").innerText = 
    `Amber runs at ${amberSpeed} m/s while Bob runs at ${bobSpeed} m/s.`;
}

function resetRunners() {
  const meterToPx = 800 / 100; // 8px per meter
  const amber = document.getElementById("amber");
  const bob = document.getElementById("bob");
  amber.style.transition = "none";
  bob.style.transition = "none";
  // Amber always starts at 0 m (left edge)
  amber.style.left = (0 * meterToPx) + "px";
  // Bob remains at the start until a race is started.
  bob.style.left = "0px";
}

function testRace() {
  const bobStartInput = document.getElementById("bobStart").value;
  const bobStart = Number(bobStartInput);
  if(isNaN(bobStart) || bobStart < 0 || bobStart > 100){
    alert("Please enter a valid number for Bob's starting position (between 0 and 100).");
    return;
  }
  
  const meterToPx = 800 / 100; // 8px per meter
  const amber = document.getElementById("amber");
  const bob = document.getElementById("bob");

  amber.style.transition = "none";
  bob.style.transition = "none";

  // Set starting positions.
  // Amber always starts at 0 m.
  amber.style.left = (0 * meterToPx) + "px";
  // Bob starts at the user-specified metres from the start.
  bob.style.left = (bobStart * meterToPx) + "px";

  // Force reflow.
  amber.offsetWidth;
  bob.offsetWidth;

  // Calculate race durations.
  // Amber runs 100 m: time = 100 / amberSpeed.
  const amberTime = 100 / amberSpeed;
  // Bob runs from his starting position to 100 m: distance = 100 - bobStart.
  const bobTime = (100 - bobStart) / bobSpeed;

  amber.style.transition = `left ${amberTime}s linear`;
  bob.style.transition = `left ${bobTime}s linear`;

  amber.style.left = "800px";
  bob.style.left = "800px";

  // Compute theoretical difference (in metres) at the moment the faster runner finishes:
  // Let T_A = 100 / amberSpeed and T_B = (100 - bobStart) / bobSpeed.
  // If Amber finishes first (T_A < T_B), Bob's position at time T_A is bobStart + bobSpeed * T_A.
  // Difference = 100 - (bobStart + bobSpeed * T_A).
  // Else if Bob finishes first, Amber's position at time T_B is amberSpeed * T_B.
  // Difference = 100 - (amberSpeed * T_B).
  const T_A = amberTime;
  const T_B = bobTime;
  let diff;
  if (T_A < T_B) {
    diff = 100 - (bobStart + bobSpeed * T_A);
  } else if (T_B < T_A) {
    diff = 100 - (amberSpeed * T_B);
  } else {
    diff = 0;
  }
  recordResult(diff);
}

function recordResult(diff) {
  // Create a new list item with the difference (in metres).
  const li = document.createElement("li");
  li.textContent = `${diff.toFixed(2)} m apart`;
  const resultsList = document.getElementById("resultsList");
  // Prepend the new result.
  resultsList.insertBefore(li, resultsList.firstChild);
}

function revealAnswer() {
  // Correct Bob starting position (in metres from start) for a simultaneous finish:
  // (100 - bobStart_correct) / bobSpeed = 100 / amberSpeed  -->
  // bobStart_correct = 100 - (bobSpeed * 100 / amberSpeed)
  const correctBobStart = 100 - (bobSpeed * 100 / amberSpeed);
  const formula = `y = ${bobSpeed.toFixed(2)}x + ${correctBobStart.toFixed(2)}`;
  document.getElementById("correctFormula").innerText = "Correct formula for Bob: " + formula;

  // Generate the graph.
  drawGraph();

  // Show the graph.
  document.getElementById("graphCanvas").style.display = "block";
}

function regenerateSpeeds() {
  generateSpeeds();
  resetRunners();
  document.getElementById("correctFormula").innerText = "";
  document.getElementById("graphCanvas").style.display = "none";
}

// Draw a graph of the two runners' equations.
// x-axis: time (seconds), y-axis: position (metres, 0 to 100).
// Amber: y = amberSpeed * t (with c = 0)
// Bob: y = bobSpeed * t + c, where c = correctBobStart = 100 - (bobSpeed * 100 / amberSpeed)
function drawGraph() {
  const canvas = document.getElementById('graphCanvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cw = canvas.width;
  const ch = canvas.height;
  
  // Define x-axis range: time from 0 to T_max (Amber's finish time) with a 10% margin.
  const T_max = 100 / amberSpeed;
  const T_range = T_max * 1.1;
  
  // y-axis range: 0 to 100 m.
  const Y_max = 100;

  // Coordinate conversion functions.
  function xPixel(t) {
    return (t / T_range) * cw;
  }
  function yPixel(y) {
    return ch - (y / Y_max) * ch;
  }

  // Draw axes.
  ctx.beginPath();
  ctx.moveTo(0, yPixel(0));
  ctx.lineTo(cw, yPixel(0)); // x-axis
  ctx.moveTo(0, yPixel(0));
  ctx.lineTo(0, yPixel(Y_max)); // y-axis
  ctx.strokeStyle = 'black';
  ctx.stroke();

  // Label axes.
  ctx.fillStyle = 'black';
  ctx.font = "16px sans-serif";
  ctx.fillText("Seconds", cw / 2, ch - 5);
  ctx.save();
  ctx.translate(15, ch / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Metres", 0, 0);
  ctx.restore();

  // Draw Amber's line: y = amberSpeed * t.
  ctx.beginPath();
  ctx.moveTo(xPixel(0), yPixel(0));
  ctx.lineTo(xPixel(T_max), yPixel(amberSpeed * T_max));
  ctx.strokeStyle = 'blue';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = 'blue';
  ctx.fillText(`Amber: y = ${amberSpeed.toFixed(2)}x`, xPixel(T_max/2), yPixel(amberSpeed * (T_max/2)));

  // Bob's correct starting constant.
  const correctBobStart = 100 - (bobSpeed * 100 / amberSpeed);
  // Draw Bob's line: y = bobSpeed * t + correctBobStart.
  ctx.beginPath();
  ctx.moveTo(xPixel(0), yPixel(correctBobStart));
  ctx.lineTo(xPixel(T_max), yPixel(bobSpeed * T_max + correctBobStart));
  ctx.strokeStyle = 'red';
  ctx.stroke();
  ctx.fillStyle = 'red';
  ctx.fillText(`Bob: y = ${bobSpeed.toFixed(2)}x + ${correctBobStart.toFixed(2)}`, xPixel(T_max/2), yPixel(bobSpeed*(T_max/2) + correctBobStart));
}
