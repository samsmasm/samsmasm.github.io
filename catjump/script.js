// Game elements
const gameContainer = document.getElementById('game-container');
const cat = document.getElementById('cat');
const timerDisplay = document.getElementById('timer');
const scoreboardEl = document.getElementById('scoreboard');

let isJumping = false;
let jumpVelocity = 0;
const gravity = 0.5;
// Increase jump strength for higher jumps (easier game)
const jumpStrength = 15;
const groundLevel = 20; // matches bottom CSS for cat and cactus

let cactusSpeed = 5;
let gameOver = false;
let startTime;
let elapsedTime = 0;
let animationFrameId;
let cactusSpawnTimeout;

// We'll keep an array of cactus objects
let cactuses = [];

// Array to store scores (most recent first)
let scores = [];

// Generate a random hex color
function getRandomColor() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

// Update the scoreboard display in the top-right corner
function updateScoreboard() {
  // Create a string with each score on its own line
  let html = '';
  scores.forEach(score => {
    html += `${score.toFixed(2)} s<br>`;
  });
  scoreboardEl.innerHTML = html;
}

// Initialize game state
function init() {
  // On restart, change the background color
  gameContainer.style.background = getRandomColor();

  // Reset cat position and state
  cat.style.bottom = groundLevel + 'px';
  isJumping = false;
  jumpVelocity = 0;
  gameOver = false;
  cat.textContent = '😺';
  startTime = Date.now();
  elapsedTime = 0;
  timerDisplay.textContent = `Time: 0.00 s`;

  // Remove any remaining cactus elements
  cactuses.forEach(obj => {
    if (obj.el && obj.el.parentNode) {
      obj.el.parentNode.removeChild(obj.el);
    }
  });
  cactuses = [];

  // Cancel any existing timeouts/animations
  clearTimeout(cactusSpawnTimeout);
  cancelAnimationFrame(animationFrameId);

  // Start spawning cactuses and the game loop
  spawnCactus();
  animationFrameId = requestAnimationFrame(gameLoop);
}

// Spawn a new cactus at a random interval (between 1 and 3 seconds)
function spawnCactus() {
  if (gameOver) return;

  const cactusEl = document.createElement('div');
  cactusEl.classList.add('cactus');
  cactusEl.textContent = '🌵';

  // Starting position on the right side
  let cactusX = window.innerWidth;
  cactusEl.style.left = cactusX + 'px';
  gameContainer.appendChild(cactusEl);

  // Add to array of cactuses
  cactuses.push({ el: cactusEl, x: cactusX });

  // Schedule next cactus spawn with random delay
  const delay = Math.random() * 2000 + 1000; // between 1000ms and 3000ms
  cactusSpawnTimeout = setTimeout(spawnCactus, delay);
}

function gameLoop() {
  // Calculate elapsed time
  if (!gameOver) {
    elapsedTime = (Date.now() - startTime) / 1000;
    timerDisplay.textContent = `Time: ${elapsedTime.toFixed(2)} s`;
  }
  
  // Update all cactuses
  // We need to iterate over a copy of the array in case we remove elements
  cactuses.slice().forEach((obj, index) => {
    obj.x -= cactusSpeed;
    obj.el.style.left = obj.x + 'px';

    // Remove cactus if it goes off-screen
    if (obj.x < -50) {
      if (obj.el.parentNode) {
        obj.el.parentNode.removeChild(obj.el);
      }
      // Remove from the array
      cactuses.splice(index, 1);
    }
  });
  
  // Jump physics for the cat
  if (isJumping) {
    let currentBottom = parseFloat(cat.style.bottom);
    currentBottom += jumpVelocity;
    jumpVelocity -= gravity;
    if (currentBottom <= groundLevel) {
      currentBottom = groundLevel;
      isJumping = false;
      jumpVelocity = 0;
    }
    cat.style.bottom = currentBottom + 'px';
  }
  
  // Collision detection with all cactuses
  for (let obj of cactuses) {
    if (checkCollision(cat, obj.el)) {
      gameOver = true;
      cat.textContent = '😿';
      // Record score if game is over
      recordScore(elapsedTime);
      break;
    }
  }
  
  if (!gameOver) {
    animationFrameId = requestAnimationFrame(gameLoop);
  }
}

// Simple collision detection between two elements using bounding boxes
function checkCollision(a, b) {
  const aRect = a.getBoundingClientRect();
  const bRect = b.getBoundingClientRect();
  
  return (
    aRect.right > bRect.left &&
    aRect.left < bRect.right &&
    aRect.bottom > bRect.top &&
    aRect.top < bRect.bottom
  );
}

// Record the score and update the scoreboard
function recordScore(time) {
  // Add the new score to the start of the scores array
  scores.unshift(time);
  updateScoreboard();
}

// Listen for spacebar key for jump or restart
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    if (gameOver) {
      init();
    } else if (!isJumping) {
      isJumping = true;
      jumpVelocity = jumpStrength;
    }
  }
});

// Start the game when the page loads
init();
