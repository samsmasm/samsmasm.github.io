// script.js

let points = [];
let chart;

// Define colors for points P1, P2, and P3
const pointColors = ['red', 'blue', 'green'];

// Custom plugin to display permanent coordinate labels
// Now displays labels like "P1: (x,y)"
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

// Initialize when window loads
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

// Plot the graph using Chart.js
function plotGraph() {
  const ctx = document.getElementById('graph').getContext('2d');

  // Prepare datasets for each point
  const datasets = points.map((point, index) => ({
    label: `P${index + 1}`,
    data: [{ x: point.x, y: point.y }],
    backgroundColor: pointColors[index],
    pointRadius: 5,
    pointStyle: 'circle'
  }));

  // Destroy any previous chart
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
            // Use a callback so that the tick at 0 is bold
            color: (context) => context.tick.value === 0 ? '#000' : '#e0e0e0',
            lineWidth: (context) => context.tick.value === 0 ? 3 : 1
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
            color: (context) => context.tick.value === 0 ? '#000' : '#e0e0e0',
            lineWidth: (context) => context.tick.value === 0 ? 3 : 1
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

  // Define the three unique point pairs:
  const pairs = [
    [0, 1], // Column 2 (P1 & P2)
    [1, 2], // Column 3 (P2 & P3)
    [0, 2]  // Column 4 (P1 & P3)
  ];

  // Define question types:
  const questionTypes = [
    'Midpoint',
    'Distance',
    'Equation of Line',
    'Perpendicular Gradient',
    'Perpendicular Bisector Equation'
  ];

  // For each question type, create a row
  questionTypes.forEach((type) => {
    const row = document.createElement('tr');

    // First column: question type
    const questionCell = document.createElement('td');
    questionCell.textContent = type;
    row.appendChild(questionCell);

    // For each pair, create an answer cell
    pairs.forEach((pair, index) => {
      const answer = getAnswer(type, points[pair[0]], points[pair[1]]);
      const cell = document.createElement('td');
      if (type === 'Midpoint') {
        cell.innerHTML = `
          <input type="text" id="${type}_${index}" class="question-input" placeholder="(x,y)">
          <button class="check-button" onclick="checkAnswer('${type}_${index}', '${type}', ${pair[0]}, ${pair[1]})">Check</button>
          <button class="show-answer-button" onclick="showAnswer('${type}_${index}', '${type}', ${pair[0]}, ${pair[1]})">Show</button>
          <div id="${type}_${index}_feedback" class="feedback"></div>
        `;
      } else if (type === 'Distance') {
        cell.innerHTML = `
          <input type="text" id="${type}_${index}" class="question-input" placeholder="Distance">
          <button class="check-button" onclick="checkAnswer('${type}_${index}', '${type}', ${pair[0]}, ${pair[1]})">Check</button>
          <button class="show-answer-button" onclick="showAnswer('${type}_${index}', '${type}', ${pair[0]}, ${pair[1]})">Show</button>
          <div id="${type}_${index}_feedback" class="feedback"></div>
        `;
      } else if (type === 'Equation of Line') {
        cell.innerHTML = `
          <input type="text" id="${type}_${index}" class="question-input" placeholder="y=mx+b">
          <button class="check-button" onclick="checkAnswer('${type}_${index}', '${type}', ${pair[0]}, ${pair[1]})">Check</button>
          <button class="show-answer-button" onclick="showAnswer('${type}_${index}', '${type}', ${pair[0]}, ${pair[1]})">Show</button>
          <div id="${type}_${index}_feedback" class="feedback"></div>
        `;
      } else if (type === 'Perpendicular Gradient') {
        cell.innerHTML = `
          <input type="text" id="${type}_${index}" class="question-input" placeholder="Gradient">
          <button class="check-button" onclick="checkAnswer('${type}_${index}', '${type}', ${pair[0]}, ${pair[1]})">Check</button>
          <button class="show-answer-button" onclick="showAnswer('${type}_${index}', '${type}', ${pair[0]}, ${pair[1]})">Show</button>
          <div id="${type}_${index}_feedback" class="feedback"></div>
        `;
      } else if (type === 'Perpendicular Bisector Equation') {
        cell.innerHTML = `
          <input type="text" id="${type}_${index}" class="question-input" placeholder="y=mx+b">
          <button class="check-button" onclick="checkAnswer('${type}_${index}', '${type}', ${pair[0]}, ${pair[1]})">Check</button>
          <button class="show-answer-button" onclick="showAnswer('${type}_${index}', '${type}', ${pair[0]}, ${pair[1]})">Show</button>
          <div id="${type}_${index}_feedback" class="feedback"></div>
        `;
      }
      // Set the text color for this cell to match the corresponding point pair:
      // For the first pair ([P1,P2]) → red, second ([P2,P3]) → blue, third ([P1,P3]) → green.
      cell.style.color = pointColors[index];
      row.appendChild(cell);
    });

    tableBody.appendChild(row);
  });
}

// Return the correct answer for a given question type and point pair
function getAnswer(type, p1, p2) {
  if (type === 'Midpoint') {
    const midpoint = calculateMidpoint(p1, p2);
    return `(${midpoint.x},${midpoint.y})`;
  } else if (type === 'Distance') {
    return calculateDistance(p1, p2).toFixed(2);
  } else if (type === 'Equation of Line') {
    return calculateEquation(p1, p2);
  } else if (type === 'Perpendicular Gradient') {
    return calculatePerpendicularGradient(p1, p2);
  } else if (type === 'Perpendicular Bisector Equation') {
    return calculatePerpendicularBisector(p1, p2);
  }
}

// Create a new problem (generate points, plot graph, and generate table)
function generateProblem() {
  generatePoints();
  plotGraph();
  generateQuestions();
}

// Calculate the midpoint of two points
function calculateMidpoint(p1, p2) {
  return {
    x: ((p1.x + p2.x) / 2).toFixed(2),
    y: ((p1.y + p2.y) / 2).toFixed(2)
  };
}

// Calculate the distance between two points
function calculateDistance(p1, p2) {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

// Calculate the equation of the line through two points in y=mx+b format
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

// Calculate the gradient of the line perpendicular to the line through two points
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
  return `${perpendicularM}`;
}

// Calculate the equation of the perpendicular bisector of the segment joining two points
function calculatePerpendicularBisector(p1, p2) {
  const midpoint = calculateMidpoint(p1, p2);
  if (p2.x - p1.x === 0) {
    return `y=${midpoint.y}`;
  }
  let m = (p2.y - p1.y) / (p2.x - p1.x);
  if (m === 0) {
    return `x=${midpoint.x}`;
  }
  let perpendicularM = -1 / m;
  let b = midpoint.y - perpendicularM * midpoint.x;
  perpendicularM = parseFloat(perpendicularM.toFixed(2));
  b = parseFloat(b.toFixed(2));
  return b >= 0 ? `y=${perpendicularM}x+${b}` : `y=${perpendicularM}x-${Math.abs(b)}`;
}

// Check the user's answer with flexible precision
function checkAnswer(id, type, p1Index, p2Index) {
  const userInput = document.getElementById(id).value.trim();
  const feedback = document.getElementById(`${id}_feedback`);
  const correctAnswer = getAnswer(type, points[p1Index], points[p2Index]);

  if (type === 'Midpoint') {
    const regex = /^\(-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\)$/;
    if (!regex.test(userInput)) {
      feedback.innerText = 'Format should be (x,y)';
      feedback.className = 'feedback incorrect';
      return;
    }
    const userCoords = userInput.slice(1, -1).split(',').map(num => parseFloat(num.trim()));
    const correctCoords = correctAnswer.slice(1, -1).split(',').map(num => parseFloat(num));
    const isCorrect =
      Math.abs(userCoords[0] - correctCoords[0]) < 0.1 &&
      Math.abs(userCoords[1] - correctCoords[1]) < 0.1;
    if (isCorrect) {
      feedback.innerText = 'Correct!';
      feedback.className = 'feedback correct';
    } else {
      feedback.innerText = `Incorrect. Correct Answer: ${correctAnswer}`;
      feedback.className = 'feedback incorrect';
    }
  } else if (type === 'Distance') {
    const userDistance = parseFloat(userInput);
    if (isNaN(userDistance)) {
      feedback.innerText = 'Please enter a numerical value.';
      feedback.className = 'feedback incorrect';
      return;
    }
    const correctDistance = parseFloat(correctAnswer);
    const isCorrect = Math.abs(userDistance - correctDistance) < 0.1;
    if (isCorrect) {
      feedback.innerText = 'Correct!';
      feedback.className = 'feedback correct';
    } else {
      feedback.innerText = `Incorrect. Correct Answer: ${correctAnswer}`;
      feedback.className = 'feedback incorrect';
    }
  } else if (type === 'Equation of Line') {
    const userEquation = normalizeEquation(userInput);
    const correctEq = normalizeEquation(correctAnswer);
    const isCorrect = userEquation === correctEq;
    if (isCorrect) {
      feedback.innerText = 'Correct!';
      feedback.className = 'feedback correct';
    } else {
      feedback.innerText = `Incorrect. Correct Answer: ${correctAnswer}`;
      feedback.className = 'feedback incorrect';
    }
  } else if (type === 'Perpendicular Gradient') {
    if (correctAnswer === 'Undefined (Vertical Line)') {
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
      const userGradient = parseFloat(userInput);
      if (isNaN(userGradient)) {
        feedback.innerText = 'Please enter a numerical value.';
        feedback.className = 'feedback incorrect';
        return;
      }
      const correctGradient = parseFloat(correctAnswer);
      const isCorrect = Math.abs(userGradient - correctGradient) < 0.1;
      if (isCorrect) {
        feedback.innerText = 'Correct!';
        feedback.className = 'feedback correct';
      } else {
        feedback.innerText = `Incorrect. Correct Answer: ${correctAnswer}`;
        feedback.className = 'feedback incorrect';
      }
    }
  } else if (type === 'Perpendicular Bisector Equation') {
    const userEquation = normalizeEquation(userInput);
    const correctEq = normalizeEquation(correctAnswer);
    const isCorrect = userEquation === correctEq;
    if (isCorrect) {
      feedback.innerText = 'Correct!';
      feedback.className = 'feedback correct';
    } else {
      feedback.innerText = `Incorrect. Correct Answer: ${correctAnswer}`;
      feedback.className = 'feedback incorrect';
    }
  }
}

// Show the correct answer
function showAnswer(id, type, p1Index, p2Index) {
  const feedback = document.getElementById(`${id}_feedback`);
  const correctAnswer = getAnswer(type, points[p1Index], points[p2Index]);
  feedback.innerText = `Answer: ${correctAnswer}`;
  feedback.className = 'feedback correct';
}

// Normalize equation strings for comparison
function normalizeEquation(eq) {
  return eq.replace(/\s+/g, '').toLowerCase();
}
