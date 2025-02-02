// script.js

let points = [];
let chart;

// Define colors for points P1, P2, and P3
const pointColors = ['red', 'blue', 'green'];

/* 
Helper function: count the number of decimals in a numeric string.
If no decimal point is present, returns 0.
*/
function countDecimals(valueStr) {
  if (valueStr.indexOf('.') >= 0) {
    return valueStr.split('.')[1].length;
  }
  return 0;
}

/*
Helper function: compares a student's numeric answer (as string) with the correct numeric value.
Both are rounded to the number of decimals present in the student's answer.
*/
function compareNumeric(studentStr, correctNum) {
  const decimals = countDecimals(studentStr);
  return parseFloat(studentStr).toFixed(decimals) === Number(correctNum).toFixed(decimals);
}

/*
Custom plugin to permanently display coordinate labels on the graph.
Labels are drawn in the format "P1: (x,y)".
*/
const coordinateLabelsPlugin = {
  id: 'coordinateLabels',
  afterDatasetsDraw: (chartInstance) => {
    const ctx = chartInstance.ctx;
    chartInstance.data.datasets.forEach((dataset, datasetIndex) => {
      dataset.data.forEach((dataPoint, index) => {
        const meta = chartInstance.getDatasetMeta(datasetIndex);
        const point = meta.data[index];
        const x = point.x;
        const y = point.y;
        const text = `P${datasetIndex + 1}: (${points[datasetIndex].x}, ${points[datasetIndex].y})`;
        ctx.font = '12px Arial';
        ctx.fillStyle = pointColors[datasetIndex];
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + 5, y - 5);
      });
    });
  }
};

// Initialize when the window loads
window.onload = function () {
  generateProblem();
  document.getElementById('newProblem').addEventListener('click', generateProblem);
};

// Generate three random points
function generatePoints() {
  points = [];
  for (let i = 0; i < 3; i++) {
    let x = getRandomInt(-100, 100);
    let y = getRandomInt(-100, 100);
    points.push({ x, y });
  }
}

// Utility: get a random integer between min and max
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Calculate midpoint (returns an object with raw numeric values)
function calculateMidpoint(p1, p2) {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

// Calculate distance (raw numeric value)
function calculateDistance(p1, p2) {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

// Calculate equation of a line in y=mx+b format; if vertical, returns "x=constant"
function calculateEquation(p1, p2) {
  if (p2.x - p1.x === 0) {
    return `x=${p1.x}`;
  }
  let m = (p2.y - p1.y) / (p2.x - p1.x);
  let b = p1.y - m * p1.x;
  m = parseFloat(m.toFixed(2));
  b = parseFloat(b.toFixed(2));
  return b >= 0 ? `y=${m}x+${b}` : `y=${m}x-${Math.abs(b)}`;
}

// Calculate the perpendicular gradient; if horizontal, returns "Undefined (Vertical Line)"
function calculatePerpendicularGradient(p1, p2) {
  if (p2.x - p1.x === 0) {
    return `0`;
  }
  let m = (p2.y - p1.y) / (p2.x - p1.x);
  if (m === 0) {
    return `Undefined (Vertical Line)`;
  }
  let perpendicularM = -1 / m;
  perpendicularM = parseFloat(perpendicularM.toFixed(2));
  return perpendicularM;
}

// Calculate the equation of the perpendicular bisector in y=mx+b format; if vertical, returns "x=constant"
function calculatePerpendicularBisector(p1, p2) {
  const mid = calculateMidpoint(p1, p2);
  if (p2.x - p1.x === 0) {
    return `y=${mid.y.toFixed(2)}`;
  }
  let m = (p2.y - p1.y) / (p2.x - p1.x);
  if (m === 0) {
    return `x=${mid.x.toFixed(2)}`;
  }
  let perpendicularM = -1 / m;
  let b = mid.y - perpendicularM * mid.x;
  perpendicularM = parseFloat(perpendicularM.toFixed(2));
  b = parseFloat(b.toFixed(2));
  return b >= 0 ? `y=${perpendicularM}x+${b}` : `y=${perpendicularM}x-${Math.abs(b)}`;
}

// Plot the graph using Chart.js
function plotGraph() {
  const ctx = document.getElementById('graph').getContext('2d');

  const datasets = points.map((point, index) => ({
    label: `P${index + 1}`,
    data: [{ x: point.x, y: point.y }],
    backgroundColor: pointColors[index],
    pointRadius: 5,
    pointStyle: 'circle'
  }));

  if (chart) {
    chart.destroy();
  }

  chart = new Chart(ctx, {
    type: 'scatter',
    data: { datasets: datasets },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              const idx = context.dataset.label.replace('P', '') - 1;
              return `P${idx + 1}: (${points[idx].x}, ${points[idx].y})`;
            }
          }
        },
        legend: { display: false }
      },
      scales: {
        x: {
          min: -100,
          max: 100,
          ticks: {
            stepSize: 20,
            color: '#000'
          },
          grid: {
            display: true,
            color: (context) =>
              context.tick.value === 0 ? '#000' : '#e0e0e0',
            lineWidth: (context) =>
              context.tick.value === 0 ? 3 : 1
          },
          title: {
            display: true,
            text: 'X-axis',
            color: '#000',
            font: { size: 14 }
          }
        },
        y: {
          min: -100,
          max: 100,
          ticks: {
            stepSize: 20,
            color: '#000'
          },
          grid: {
            display: true,
            color: (context) =>
              context.tick.value === 0 ? '#000' : '#e0e0e0',
            lineWidth: (context) =>
              context.tick.value === 0 ? 3 : 1
          },
          title: {
            display: true,
            text: 'Y-axis',
            color: '#000',
            font: { size: 14 }
          }
        }
      }
    },
    plugins: [coordinateLabelsPlugin]
  });
}

// Generate the questions table
function generateQuestions() {
  const tableBody = document.querySelector('#questionsTable tbody');
  tableBody.innerHTML = '';

  // Define three unique point pairs:
  const pairs = [
    [0, 1], // Column 2: P1 & P2
    [1, 2], // Column 3: P2 & P3
    [0, 2]  // Column 4: P1 & P3
  ];

  // Define question types:
  const questionTypes = [
    'Midpoint',
    'Distance',
    'Equation of Line',
    'Perpendicular Gradient',
    'Perpendicular Bisector Equation'
  ];

  // Create a row for each question type:
  questionTypes.forEach((type) => {
    const row = document.createElement('tr');
    const questionCell = document.createElement('td');
    questionCell.textContent = type;
    row.appendChild(questionCell);

    pairs.forEach((pair, index) => {
      const cell = document.createElement('td');
      // Generate the input/button HTML for this cell:
      let html = '';
      if (type === 'Midpoint') {
        html = `
          <input type="text" id="${type}_${index}" class="question-input" placeholder="(x,y)">
          <button class="check-button" onclick="checkAnswer('${type}_${index}', '${type}', ${pair[0]}, ${pair[1]})">Check</button>
          <button class="show-answer-button" onclick="showAnswer('${type}_${index}', '${type}', ${pair[0]}, ${pair[1]})">Show</button>
          <div id="${type}_${index}_feedback" class="feedback"></div>
        `;
      } else if (type === 'Distance') {
        html = `
          <input type="text" id="${type}_${index}" class="question-input" placeholder="Distance">
          <button class="check-button" onclick="checkAnswer('${type}_${index}', '${type}', ${pair[0]}, ${pair[1]})">Check</button>
          <button class="show-answer-button" onclick="showAnswer('${type}_${index}', '${type}', ${pair[0]}, ${pair[1]})">Show</button>
          <div id="${type}_${index}_feedback" class="feedback"></div>
        `;
      } else if (type === 'Equation of Line') {
        html = `
          <input type="text" id="${type}_${index}" class="question-input" placeholder="y=mx+b">
          <button class="check-button" onclick="checkAnswer('${type}_${index}', '${type}', ${pair[0]}, ${pair[1]})">Check</button>
          <button class="show-answer-button" onclick="showAnswer('${type}_${index}', '${type}', ${pair[0]}, ${pair[1]})">Show</button>
          <div id="${type}_${index}_feedback" class="feedback"></div>
        `;
      } else if (type === 'Perpendicular Gradient') {
        html = `
          <input type="text" id="${type}_${index}" class="question-input" placeholder="Gradient">
          <button class="check-button" onclick="checkAnswer('${type}_${index}', '${type}', ${pair[0]}, ${pair[1]})">Check</button>
          <button class="show-answer-button" onclick="showAnswer('${type}_${index}', '${type}', ${pair[0]}, ${pair[1]})">Show</button>
          <div id="${type}_${index}_feedback" class="feedback"></div>
        `;
      } else if (type === 'Perpendicular Bisector Equation') {
        html = `
          <input type="text" id="${type}_${index}" class="question-input" placeholder="y=mx+b">
          <button class="check-button" onclick="checkAnswer('${type}_${index}', '${type}', ${pair[0]}, ${pair[1]})">Check</button>
          <button class="show-answer-button" onclick="showAnswer('${type}_${index}', '${type}', ${pair[0]}, ${pair[1]})">Show</button>
          <div id="${type}_${index}_feedback" class="feedback"></div>
        `;
      }
      cell.innerHTML = html;
      // Set the cell text color to match the corresponding point pair:
      // Pair 0: red, Pair 1: blue, Pair 2: green.
      cell.style.color = pointColors[index];
      row.appendChild(cell);
    });
    tableBody.appendChild(row);
  });
}

// getAnswer returns the correct answer based on the question type and point pair.
// For numeric answers, we return raw numbers; for equations, we return strings.
function getAnswer(type, p1, p2) {
  if (type === 'Midpoint') {
    const mid = calculateMidpoint(p1, p2);
    // For display, show default as 2 decimals
    return `(${mid.x.toFixed(2)},${mid.y.toFixed(2)})`;
  } else if (type === 'Distance') {
    return calculateDistance(p1, p2);
  } else if (type === 'Equation of Line') {
    return calculateEquation(p1, p2);
  } else if (type === 'Perpendicular Gradient') {
    return calculatePerpendicularGradient(p1, p2);
  } else if (type === 'Perpendicular Bisector Equation') {
    return calculatePerpendicularBisector(p1, p2);
  }
}

// Generate a new problem: points, graph, and table
function generateProblem() {
  generatePoints();
  plotGraph();
  generateQuestions();
}

// Check the student's answer using standard rounding based on the number of decimals entered.
function checkAnswer(id, type, p1Index, p2Index) {
  const userInput = document.getElementById(id).value.trim();
  const feedback = document.getElementById(`${id}_feedback`);
  const correctAnswer = getAnswer(type, points[p1Index], points[p2Index]);

  if (type === 'Midpoint') {
    // Expect format (x,y)
    const regex = /^\(-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\)$/;
    if (!regex.test(userInput)) {
      feedback.innerText = 'Format should be (x,y)';
      feedback.className = 'feedback incorrect';
      return;
    }
    const parts = userInput.slice(1, -1).split(',');
    if (parts.length !== 2) {
      feedback.innerText = 'Please enter two numbers separated by a comma.';
      feedback.className = 'feedback incorrect';
      return;
    }
    const studentXStr = parts[0].trim();
    const studentYStr = parts[1].trim();
    const mid = calculateMidpoint(points[p1Index], points[p2Index]); // raw numbers
    const xCorrect = compareNumeric(studentXStr, mid.x);
    const yCorrect = compareNumeric(studentYStr, mid.y);
    if (xCorrect && yCorrect) {
      feedback.innerText = 'Correct!';
      feedback.className = 'feedback correct';
    } else {
      // For display, use getAnswer (which rounds to 2 decimals by default)
      feedback.innerText = `Incorrect. Correct Answer: ${getAnswer(type, points[p1Index], points[p2Index])}`;
      feedback.className = 'feedback incorrect';
    }
  } else if (type === 'Distance' || type === 'Perpendicular Gradient') {
    // For numeric answers (except Midpoint), use our compareNumeric helper.
    // First, check if the correct answer is "Undefined (Vertical Line)"
    if (type === 'Perpendicular Gradient' && correctAnswer === 'Undefined (Vertical Line)') {
      if (
        userInput.toLowerCase() === 'undefined' ||
        userInput.toLowerCase() === 'infinite' ||
        userInput.toLowerCase() === 'vertical line'
      ) {
        feedback.innerText = 'Correct!';
        feedback.className = 'feedback correct';
      } else {
        feedback.innerText = 'Incorrect. The gradient is Undefined (Vertical Line).';
        feedback.className = 'feedback incorrect';
      }
    } else {
      if (compareNumeric(userInput, correctAnswer)) {
        feedback.innerText = 'Correct!';
        feedback.className = 'feedback correct';
      } else {
        // Display the correct answer rounded to 2 decimals by default
        feedback.innerText = `Incorrect. Correct Answer: ${Number(correctAnswer).toFixed(2)}`;
        feedback.className = 'feedback incorrect';
      }
    }
  } else if (type === 'Equation of Line' || type === 'Perpendicular Bisector Equation') {
    // For these, normalize (remove spaces, lowercase) and check equality.
    const studentEq = normalizeEquation(userInput);
    const correctEq = normalizeEquation(correctAnswer);
    if (studentEq === correctEq) {
      feedback.innerText = 'Correct!';
      feedback.className = 'feedback correct';
    } else {
      feedback.innerText = `Incorrect. Correct Answer: ${correctAnswer}`;
      feedback.className = 'feedback incorrect';
    }
  }
}

// Show the correct answer in the feedback
function showAnswer(id, type, p1Index, p2Index) {
  const feedback = document.getElementById(`${id}_feedback`);
  const correctAnswer = getAnswer(type, points[p1Index], points[p2Index]);
  // For numeric answers, display using toFixed(2) by default.
  if (type === 'Distance' || type === 'Perpendicular Gradient') {
    feedback.innerText = `Answer: ${Number(correctAnswer).toFixed(2)}`;
  } else {
    feedback.innerText = `Answer: ${correctAnswer}`;
  }
  feedback.className = 'feedback correct';
}

// Normalize equation strings by removing spaces and converting to lowercase.
function normalizeEquation(eq) {
  return eq.replace(/\s+/g, '').toLowerCase();
}
