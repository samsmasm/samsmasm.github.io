/***********************************************************
  GLOBAL CONSTANTS & VARIABLES
************************************************************/
const BASE_HUNTER_SIZE = 40;   // initial size for the hunter
const PREY_SIZE = 30;          // approximate size for prey
const SWARM_THRESHOLD = 10;    // number of prey on field that triggers chase/swarm mode
const COLLISION_COUNT = 10;    // number colliding at once to kill the hunter
const MAX_HUNTER_SIZE = 120;   // size threshold for explosion

let hunterEmoji = "🐱";
let preyEmoji   = "🐭";

let hunterX = 50;  // hunter's top-left corner
let hunterY;       // will be set in resetGame()
let hunterSpeed = 15;
let hunterSize = BASE_HUNTER_SIZE; // current size of the hunter

let preyEaten = 0;
let preyArr = [];   // array of prey objects: { x, y, speed, angle, element, interval, movementInterval, directionInterval }
let gameTime = 0;
let timerRunning = false;
let gameOver = false;
let swarmMode = false;         // when true, prey chase the hunter and the hunter stops eating
let preySpeedBoost = 0;        // global boost to prey speeds
let swarmCooldown = false;     // cooldown after explosion

/***********************************************************
  DOM ELEMENTS
************************************************************/
const hunterEl       = document.getElementById("hunter");
const gameContainer  = document.getElementById("game-container");
const scoreDisplay   = document.getElementById("score");
const timerDisplay   = document.getElementById("timer");
const gameOverMsg    = document.getElementById("game-over-message");

// Audio Elements
const meowSound      = document.getElementById("meow-sound");
const bangSound      = document.getElementById("bang-sound");
const sadMeowSound   = document.getElementById("sad-meow-sound");

/***********************************************************
  SETUP & EVENT LISTENERS
************************************************************/
function setupSelections() {
  // Hunter selection panel
  document.querySelectorAll("#hunter-selection .selection-option").forEach(btn => {
    btn.addEventListener("click", () => {
      hunterEmoji = btn.getAttribute("data-animal");
      if (!gameOver) hunterEl.textContent = hunterEmoji;
    });
  });
  // Prey selection panel
  document.querySelectorAll("#prey-selection .selection-option").forEach(btn => {
    btn.addEventListener("click", () => {
      preyEmoji = btn.getAttribute("data-animal");
      // Update all current prey on screen
      document.querySelectorAll(".mouse").forEach(preyEl => {
        preyEl.textContent = preyEmoji;
      });
    });
  });
}

// Move the hunter (or reset the game) via arrow keys.
document.addEventListener("keydown", e => {
  if (gameOver) {
    if (e.code === "Space" || e.code.startsWith("Arrow")) {
      resetGame();
    }
    return;
  }
  if (e.code === "ArrowUp") {
    hunterY = Math.max(0, hunterY - hunterSpeed);
  } else if (e.code === "ArrowDown") {
    hunterY = Math.min(gameContainer.clientHeight - hunterSize, hunterY + hunterSpeed);
  } else if (e.code === "ArrowLeft") {
    hunterX = Math.max(0, hunterX - hunterSpeed);
  } else if (e.code === "ArrowRight") {
    hunterX = Math.min(gameContainer.clientWidth - hunterSize, hunterX + hunterSpeed);
  }
  updateHunterPosition();
});

// Clicking the game-over message resets the game.
gameOverMsg.addEventListener("click", resetGame);

/***********************************************************
  MAIN GAME FUNCTIONS
************************************************************/
function resetGame() {
  gameOver = false;
  swarmMode = false;
  swarmCooldown = false;
  hunterEl.textContent = hunterEmoji;
  hunterSize = BASE_HUNTER_SIZE;
  hunterEl.style.fontSize = `${hunterSize}px`;
  preyEaten = 0;
  scoreDisplay.textContent = "Prey Eaten: 0";
  gameOverMsg.style.display = "none";

  // Remove existing prey elements and clear their intervals.
  document.querySelectorAll(".mouse").forEach(el => el.remove());
  preyArr.forEach(p => {
    if (p.interval) clearInterval(p.interval);
    if (p.movementInterval) clearInterval(p.movementInterval);
    if (p.directionInterval) clearInterval(p.directionInterval);
  });
  preyArr = [];

  // Position the hunter in the middle-left.
  hunterX = 50;
  hunterY = (gameContainer.clientHeight - BASE_HUNTER_SIZE) / 2;
  updateHunterPosition();
}

function updateHunterPosition() {
  hunterEl.style.left = `${hunterX}px`;
  hunterEl.style.top  = `${hunterY}px`;
  hunterEl.textContent = hunterEmoji;
  hunterEl.style.fontSize = `${hunterSize}px`;
}

function startTimer() {
  if (!timerRunning) {
    timerRunning = true;
    setInterval(() => {
      gameTime++;
      timerDisplay.textContent = `Time: ${gameTime}s`;
    }, 1000);
  }
}

// Spawn a new prey.
function spawnPrey() {
  if (gameOver) return;

  const preyEl = document.createElement("div");
  preyEl.classList.add("mouse");
  preyEl.textContent = preyEmoji;
  gameContainer.appendChild(preyEl);

  // Random initial position.
  let x = Math.random() * (gameContainer.clientWidth - PREY_SIZE);
  let y = Math.random() * (gameContainer.clientHeight - PREY_SIZE);

  let angle = Math.random() * Math.PI * 2;
  let speed = 2 + Math.random() * 2 + preySpeedBoost;

  let preyObj = { x, y, angle, speed, element: preyEl, interval: null, movementInterval: null, directionInterval: null };

  // Main update loop for this prey.
  preyObj.interval = setInterval(() => {
    if (gameOver) {
      clearInterval(preyObj.interval);
      return;
    }

    // --- Prey Dodging ---
    // Before collision check, if not in swarm mode and within 150px, dodge.
    let hx = hunterX + hunterSize / 2;
    let hy = hunterY + hunterSize / 2;
    let px = preyObj.x + PREY_SIZE / 2;
    let py = preyObj.y + PREY_SIZE / 2;
    let d = Math.sqrt((hx - px) ** 2 + (hy - py) ** 2);
    if (!swarmMode && d < 150) {
      preyObj.element.style.transform = `translate(${Math.random() * 10}px, ${Math.random() * 10}px)`;
      setTimeout(() => {
        let dodgeAngle = Math.atan2(preyObj.y - hy, preyObj.x - hx);
        // Add some randomness to the dodge.
        preyObj.angle = dodgeAngle + (Math.random() * Math.PI / 2 - Math.PI / 4);
        preyObj.element.style.transform = "";
      }, 500);
    }

    // --- Swarm Mode Activation ---
    if (!swarmMode && preyArr.length >= SWARM_THRESHOLD) {
      swarmMode = true;
    }

    if (swarmMode) {
      // In swarm mode, prey chase the hunter.
      let preyCenterX = preyObj.x + PREY_SIZE / 2;
      let preyCenterY = preyObj.y + PREY_SIZE / 2;
      let hunterCenterX = hunterX + hunterSize / 2;
      let hunterCenterY = hunterY + hunterSize / 2;
      let chaseAngle = Math.atan2(hunterCenterY - preyCenterY, hunterCenterX - preyCenterX);
      preyObj.angle = chaseAngle;
    } else {
      // Random wandering.
      if (Math.random() < 0.02) {
        preyObj.angle += (Math.random() * 0.5 - 0.25);
      }
    }

    let dx = preyObj.speed * Math.cos(preyObj.angle);
    let dy = preyObj.speed * Math.sin(preyObj.angle);
    preyObj.x += dx;
    preyObj.y += dy;

    // Bounce off edges.
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

    // Update DOM position.
    preyEl.style.left = `${preyObj.x}px`;
    preyEl.style.top  = `${preyObj.y}px`;

    // Check for collision with the hunter.
    collisionCheck(preyObj);

  }, 30);

  preyArr.push(preyObj);
}

// Collision detection for a prey.
function collisionCheck(preyObj) {
  if (gameOver) return;

  let hx = hunterX + hunterSize / 2;
  let hy = hunterY + hunterSize / 2;
  let px = preyObj.x + PREY_SIZE / 2;
  let py = preyObj.y + PREY_SIZE / 2;
  let dx = hx - px;
  let dy = hy - py;
  let distance = Math.sqrt(dx * dx + dy * dy);
  let collisionDist = (hunterSize + PREY_SIZE) / 2 * 0.8;

  if (distance < collisionDist) {
    // If swarm mode is active, the hunter should not eat prey.
    if (swarmMode) {
      return; // Do nothing here; killHunter will be triggered by checkGameOver.
    }
    // If the hunter is full, trigger explosion.
    if (hunterSize >= MAX_HUNTER_SIZE) {
      explodeHunter();
    } else {
      // Normal eating.
      eatPrey(preyObj);
    }
  }
}

// Returns an array of prey that are colliding with the hunter.
function getPreyColliding() {
  let colliding = [];
  let hx = hunterX + hunterSize / 2;
  let hy = hunterY + hunterSize / 2;
  for (let p of preyArr) {
    let px = p.x + PREY_SIZE / 2;
    let py = p.y + PREY_SIZE / 2;
    let dx = hx - px;
    let dy = hy - py;
    let dist = Math.sqrt(dx * dx + dy * dy);
    let collisionDist = (hunterSize + PREY_SIZE) / 2 * 0.8;
    if (dist < collisionDist) {
      colliding.push(p);
    }
  }
  return colliding;
}

// Hunter eats a prey.
function eatPrey(preyObj) {
  clearInterval(preyObj.interval);
  preyObj.element.remove();
  preyArr = preyArr.filter(p => p !== preyObj);

  preyEaten++;
  scoreDisplay.textContent = `Prey Eaten: ${preyEaten}`;
  meowSound.currentTime = 0;
  meowSound.play();

  let newSize = hunterSize + 5;
  if (newSize > MAX_HUNTER_SIZE) {
    explodeHunter();
  } else {
    hunterSize = newSize;
    hunterEl.style.fontSize = `${hunterSize}px`;
  }
}

// Explode the hunter when maximum size is reached.
function explodeHunter() {
  hunterEl.textContent = "💥";
  bangSound.currentTime = 0;
  bangSound.play();

  setTimeout(() => {
    hunterEl.textContent = hunterEmoji;
    hunterSize = BASE_HUNTER_SIZE;
    hunterEl.style.fontSize = `${hunterSize}px`;

    releaseBones();
    swarmCooldown = true;
    setTimeout(() => { swarmCooldown = false; }, 2000);
  }, 1000);
}

// Release bones around the hunter and boost prey speed (at a slower rate).
function releaseBones() {
  let boneCount = preyEaten;
  let angleStep = (Math.PI * 2) / (boneCount || 1);
  let releaseDistance = 50;

  for (let i = 0; i < boneCount; i++) {
    let angle = i * angleStep;
    let bone = document.createElement("div");
    bone.classList.add("bone");
    bone.textContent = "🦴";
    let bx = hunterX + releaseDistance * Math.cos(angle);
    let by = hunterY + releaseDistance * Math.sin(angle);
    bone.style.left = `${bx}px`;
    bone.style.top = `${by}px`;
    bone.style.position = "absolute";
    gameContainer.appendChild(bone);
    setTimeout(() => { bone.remove(); }, 1000);
  }

  // Increase prey speed boost by 0.5 (instead of 1)
  preySpeedBoost += 0.5;
  preyArr.forEach(p => { p.speed += 0.5; });
  preyEaten = 0;
  scoreDisplay.textContent = "Prey Eaten: 0";
}

// Periodically check if 10 or more prey are colliding with the hunter to trigger swarm kill.
function checkGameOver() {
  if (gameOver || swarmCooldown) return;
  let colliding = getPreyColliding();
  if (colliding.length >= COLLISION_COUNT) {
    killHunter(colliding);
  }
}

// Kill the hunter when overpowered by a swarm.
function killHunter(collidingPrey) {
  gameOver = true;
  sadMeowSound.currentTime = 0;
  sadMeowSound.play();

  hunterEl.textContent = "☠️";
  gameOverMsg.style.display = "block";

  // For each of the first COLLISION_COUNT colliding prey, clear their normal interval and start swarm motion.
  for (let i = 0; i < COLLISION_COUNT; i++) {
    if (collidingPrey[i]) {
      clearInterval(collidingPrey[i].interval);
      startSwarmMotion(collidingPrey[i]);
    }
  }
}

// For a colliding prey, start swarm motion: update its position continuously and randomize its angle every second.
function startSwarmMotion(preyObj) {
  // Start a movement interval (updates position every 30ms)
  preyObj.movementInterval = setInterval(() => {
    let dx = preyObj.speed * Math.cos(preyObj.angle);
    let dy = preyObj.speed * Math.sin(preyObj.angle);
    preyObj.x += dx;
    preyObj.y += dy;
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
    preyObj.element.style.left = `${preyObj.x}px`;
    preyObj.element.style.top = `${preyObj.y}px`;
  }, 30);

  // Start a direction interval to randomize angle every second.
  preyObj.directionInterval = setInterval(() => {
    preyObj.angle = Math.random() * Math.PI * 2;
  }, 1000);
}

// Setup game loop: spawn prey and periodically check for swarm conditions.
function setupGameLoop() {
  startTimer();
  setInterval(() => {
    if (!gameOver) spawnPrey();
  }, 2000);

  setInterval(() => {
    if (!gameOver && !swarmCooldown) {
      checkGameOver();
    }
  }, 500);
}

/***********************************************************
  START GAME
************************************************************/
setupSelections();
resetGame();
setupGameLoop();
