/***********************************************************
  GLOBAL CONSTANTS & VARIABLES
************************************************************/
const HUNTER_SIZE = 40;      // Approx. width/height of hunter
const PREY_SIZE = 30;        // Approx. width/height of prey
const SWARM_THRESHOLD = 10;  // # of prey on field => they start chasing
const COLLISION_COUNT = 10;  // # colliding at once => kills the hunter

let hunterEmoji = "🐱";
let preyEmoji   = "🐭";

let hunterX = 50; // top-left corner of the hunter
let hunterY;      // we'll set it in resetGame
let hunterSpeed = 15;

let preyEaten = 0;
let preyArr = []; // array of prey objects: { x, y, speed, angle, element, interval, movementInterval, directionInterval }
let gameTime = 0;
let timerRunning = false;
let gameOver = false;
let swarmMode = false;
let preySpeedBoost = 0;
let swarmCooldown = false; // cooldown after explosion

/***********************************************************
  DOM ELEMENTS
************************************************************/
const hunterEl       = document.getElementById("hunter");
const gameContainer  = document.getElementById("game-container");
const scoreDisplay   = document.getElementById("score");
const timerDisplay   = document.getElementById("timer");
const gameOverMsg    = document.getElementById("game-over-message");

// Audio
const meowSound      = document.getElementById("meow-sound");
const bangSound      = document.getElementById("bang-sound");
const sadMeowSound   = document.getElementById("sad-meow-sound");

/***********************************************************
  SETUP & EVENT LISTENERS
************************************************************/
function setupSelections() {
  // Hunter selection
  document.querySelectorAll("#hunter-selection .selection-option").forEach(btn => {
    btn.addEventListener("click", () => {
      hunterEmoji = btn.getAttribute("data-animal");
      if (!gameOver) hunterEl.textContent = hunterEmoji;
    });
  });
  // Prey selection
  document.querySelectorAll("#prey-selection .selection-option").forEach(btn => {
    btn.addEventListener("click", () => {
      preyEmoji = btn.getAttribute("data-animal");
      // Update all current prey
      document.querySelectorAll(".mouse").forEach(preyEl => {
        preyEl.textContent = preyEmoji;
      });
    });
  });
}

// Move the hunter or reset the game
document.addEventListener("keydown", e => {
  if (gameOver) {
    if (e.code === "Space" || e.code.startsWith("Arrow")) {
      resetGame();
    }
    return;
  }
  // Normal movement
  if (e.code === "ArrowUp") {
    hunterY = Math.max(0, hunterY - hunterSpeed);
  } else if (e.code === "ArrowDown") {
    hunterY = Math.min(gameContainer.clientHeight - HUNTER_SIZE, hunterY + hunterSpeed);
  } else if (e.code === "ArrowLeft") {
    hunterX = Math.max(0, hunterX - hunterSpeed);
  } else if (e.code === "ArrowRight") {
    hunterX = Math.min(gameContainer.clientWidth - HUNTER_SIZE, hunterX + hunterSpeed);
  }
  updateHunterPosition();
});

// Clicking game-over message resets game
gameOverMsg.addEventListener("click", resetGame);

/***********************************************************
  MAIN GAME FUNCTIONS
************************************************************/
function resetGame() {
  gameOver = false;
  swarmMode = false;
  swarmCooldown = false;
  hunterEl.textContent = hunterEmoji;
  hunterEl.style.fontSize = `${HUNTER_SIZE}px`;
  preyEaten = 0;
  scoreDisplay.textContent = "Prey Eaten: 0";
  gameOverMsg.style.display = "none";

  // Remove existing prey
  document.querySelectorAll(".mouse").forEach(el => el.remove());
  // Clear intervals for all prey
  preyArr.forEach(p => {
    if (p.interval) clearInterval(p.interval);
    if (p.movementInterval) clearInterval(p.movementInterval);
    if (p.directionInterval) clearInterval(p.directionInterval);
  });
  preyArr = [];

  // Position hunter in middle-left
  hunterX = 50;
  hunterY = (gameContainer.clientHeight - HUNTER_SIZE) / 2;
  updateHunterPosition();
}

function updateHunterPosition() {
  hunterEl.style.left = `${hunterX}px`;
  hunterEl.style.top  = `${hunterY}px`;
  hunterEl.textContent = hunterEmoji;
}

// Timer
function startTimer() {
  if (!timerRunning) {
    timerRunning = true;
    setInterval(() => {
      gameTime++;
      timerDisplay.textContent = `Time: ${gameTime}s`;
    }, 1000);
  }
}

// Spawn new prey
function spawnPrey() {
  if (gameOver) return;

  const preyEl = document.createElement("div");
  preyEl.classList.add("mouse");
  preyEl.textContent = preyEmoji;
  gameContainer.appendChild(preyEl);

  // Random initial position
  let x = Math.random() * (gameContainer.clientWidth  - PREY_SIZE);
  let y = Math.random() * (gameContainer.clientHeight - PREY_SIZE);

  // Movement
  let angle = Math.random() * Math.PI * 2;
  let speed = 2 + Math.random() * 2 + preySpeedBoost;

  let preyObj = { 
    x, 
    y, 
    angle, 
    speed, 
    element: preyEl,
    interval: null,
    movementInterval: null,
    directionInterval: null
  };

  // Main update loop
  preyObj.interval = setInterval(() => {
    if (gameOver) {
      clearInterval(preyObj.interval);
      return;
    }

    // 1) If not in swarm mode & #prey < SWARM_THRESHOLD => random wandering
    // 2) If #prey >= SWARM_THRESHOLD => set swarmMode = true => they chase
    if (!swarmMode && preyArr.length >= SWARM_THRESHOLD) {
      swarmMode = true;
    }
    if (swarmMode) {
      // chase the hunter
      let preyCenterX = preyObj.x + PREY_SIZE/2;
      let preyCenterY = preyObj.y + PREY_SIZE/2;
      let hunterCenterX = hunterX + HUNTER_SIZE/2;
      let hunterCenterY = hunterY + HUNTER_SIZE/2;
      let chaseAngle = Math.atan2(hunterCenterY - preyCenterY, hunterCenterX - preyCenterX);
      preyObj.angle = chaseAngle;
    } else {
      // random wandering
      if (Math.random() < 0.02) {
        preyObj.angle += (Math.random() * 0.5 - 0.25);
      }
    }

    // Move
    let dx = preyObj.speed * Math.cos(preyObj.angle);
    let dy = preyObj.speed * Math.sin(preyObj.angle);
    preyObj.x += dx;
    preyObj.y += dy;

    // Bounce on edges
    if (preyObj.x < 0) {
      preyObj.x = 0; 
      preyObj.angle = Math.PI - preyObj.angle;
    } else if (preyObj.x > gameContainer.clientWidth - PREY_SIZE) {
      preyObj.x = gameContainer.clientWidth - PREY_SIZE; 
      preyObj.angle = Math.PI - preyObj.angle;
    }
    if (preyObj.y < 0) {
      preyObj.y = 0;
      preyObj.angle = -preyObj.angle;
    } else if (preyObj.y > gameContainer.clientHeight - PREY_SIZE) {
      preyObj.y = gameContainer.clientHeight - PREY_SIZE;
      preyObj.angle = -preyObj.angle;
    }

    // Update DOM
    preyEl.style.left = `${preyObj.x}px`;
    preyEl.style.top  = `${preyObj.y}px`;

    // Collision check
    collisionCheck(preyObj);

  }, 30);

  preyArr.push(preyObj);
}

// On each frame, check if prey is colliding with hunter
function collisionCheck(preyObj) {
  if (gameOver) return;  

  let hx = hunterX + HUNTER_SIZE/2;
  let hy = hunterY + HUNTER_SIZE/2;
  let px = preyObj.x + PREY_SIZE/2;
  let py = preyObj.y + PREY_SIZE/2;

  let dx = hx - px;
  let dy = hy - py;
  let distance = Math.sqrt(dx*dx + dy*dy);
  let collisionDist = (HUNTER_SIZE + PREY_SIZE)/2 * 0.8;

  if (distance < collisionDist) {
    // If the swarm threshold is reached or exceeded => no more eating
    if (preyArr.length >= SWARM_THRESHOLD) {
      // Instead check if we kill the hunter
      let colliding = getPreyColliding();
      if (colliding.length >= COLLISION_COUNT) {
        killHunter(colliding);
      }
    } else {
      // The hunter can eat this prey
      eatPrey(preyObj);
    }
  }
}

// Return all prey currently colliding
function getPreyColliding() {
  let colliding = [];
  let hx = hunterX + HUNTER_SIZE/2;
  let hy = hunterY + HUNTER_SIZE/2;
  for (let p of preyArr) {
    let px = p.x + PREY_SIZE/2;
    let py = p.y + PREY_SIZE/2;
    let dx = hx - px;
    let dy = hy - py;
    let dist = Math.sqrt(dx*dx + dy*dy);
    let collisionDist = (HUNTER_SIZE + PREY_SIZE)/2 * 0.8;
    if (dist < collisionDist) {
      colliding.push(p);
    }
  }
  return colliding;
}

// Eat a prey
function eatPrey(preyObj) {
  clearInterval(preyObj.interval);
  preyObj.element.remove();
  preyArr = preyArr.filter(p => p !== preyObj);

  preyEaten++;
  scoreDisplay.textContent = `Prey Eaten: ${preyEaten}`;

  // Grow
  let newSize = HUNTER_SIZE + 5;
  meowSound.currentTime = 0;
  meowSound.play();

  if (newSize > 120) {
    explodeHunter();
  } else {
    // update HUNTER_SIZE
    hunterEl.style.fontSize = `${newSize}px`;
    window.HUNTER_SIZE = newSize; // store globally so it persists
  }
}

// Explosion if the hunter grows too large
function explodeHunter() {
  hunterEl.textContent = "💥";
  bangSound.currentTime = 0;
  bangSound.play();

  setTimeout(() => {
    hunterEl.textContent = hunterEmoji;
    window.HUNTER_SIZE = 40;
    hunterEl.style.fontSize = "40px";

    releaseBones();
    swarmCooldown = true;
    setTimeout(() => swarmCooldown = false, 2000);
  }, 1000);
}

// Release bones => boost prey speed
function releaseBones() {
  let boneCount = preyEaten;
  let angleStep = (Math.PI * 2)/(boneCount || 1);
  let releaseDistance = 50;

  for (let i=0; i<boneCount; i++) {
    let angle = i*angleStep;
    let bone = document.createElement("div");
    bone.classList.add("bone");
    bone.textContent = "🦴";
    let bx = hunterX + releaseDistance * Math.cos(angle);
    let by = hunterY + releaseDistance * Math.sin(angle);
    bone.style.left = `${bx}px`;
    bone.style.top  = `${by}px`;
    bone.style.position = "absolute";
    gameContainer.appendChild(bone);

    setTimeout(() => bone.remove(), 1000);
  }

  preySpeedBoost += 1;
  for (let p of preyArr) {
    p.speed += 1;
  }
  preyEaten = 0;
  scoreDisplay.textContent = "Prey Eaten: 0";
}

// If 10 or more are colliding => kill the hunter
function killHunter(collidingPrey) {
  gameOver = true;
  sadMeowSound.currentTime = 0;
  sadMeowSound.play();

  hunterEl.textContent = "☠️";
  gameOverMsg.style.display = "block";

  // For each of the 10 colliding prey => switch them to random-swarm logic
  for (let i=0; i<COLLISION_COUNT; i++) {
    if (collidingPrey[i]) {
      // Clear old chase/wander interval
      clearInterval(collidingPrey[i].interval);
      // Start random direction motion
      startSwarmMotion(collidingPrey[i]);
    }
  }
}

// The colliding prey move in random directions every second
function startSwarmMotion(preyObj) {
  // movementInterval => moves the prey each frame
  preyObj.movementInterval = setInterval(() => {
    let dx = preyObj.speed * Math.cos(preyObj.angle);
    let dy = preyObj.speed * Math.sin(preyObj.angle);
    preyObj.x += dx;
    preyObj.y += dy;

    // bounce
    if (preyObj.x < 0) {
      preyObj.x = 0;
      preyObj.angle = Math.PI - preyObj.angle;
    }
    else if (preyObj.x > gameContainer.clientWidth - PREY_SIZE) {
      preyObj.x = gameContainer.clientWidth - PREY_SIZE;
      preyObj.angle = Math.PI - preyObj.angle;
    }
    if (preyObj.y < 0) {
      preyObj.y = 0;
      preyObj.angle = -preyObj.angle;
    }
    else if (preyObj.y > gameContainer.clientHeight - PREY_SIZE) {
      preyObj.y = gameContainer.clientHeight - PREY_SIZE;
      preyObj.angle = -preyObj.angle;
    }

    // update DOM
    preyObj.element.style.left = `${preyObj.x}px`;
    preyObj.element.style.top  = `${preyObj.y}px`;
  }, 30);

  // directionInterval => randomizes angle every second
  preyObj.directionInterval = setInterval(() => {
    preyObj.angle = Math.random() * Math.PI * 2;
  }, 1000);
}

/***********************************************************
  START GAME
************************************************************/
setupSelections();
resetGame();
startTimer();

// Repeatedly spawn new prey
setInterval(() => {
  if (!gameOver) spawnPrey();
}, 2000);
