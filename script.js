// Binary game logic

let binaryDigits = Array(8).fill(0); // Initialize an 8-bit binary number
let revealedTiles = []; // Keep track of revealed tiles
const totalTiles = 16;

// Rainbow colors for tiles
const rainbowColors = [
  "red", "orange", "yellow", "green", "blue", "indigo", "violet",
  "pink", "teal", "brown", "lightblue", "gold", "lime", "purple", "silver", "coral",
];

// Initialize binary buttons
function updateBinaryButtons() {
  const container = document.getElementById("binary-boxes");
  container.innerHTML = ""; // Clear existing buttons

  binaryDigits.forEach((bit, index) => {
    const button = document.createElement("button");
    button.className = `binary-button ${bit === 1 ? "active" : ""}`;
    button.textContent = bit;
    button.addEventListener("click", () => toggleDigit(index));
    container.appendChild(button);
  });
}

// Toggle a binary digit
function toggleDigit(index) {
  binaryDigits[index] = binaryDigits[index] === 0 ? 1 : 0;
  updateBinaryButtons();
  updateDisplay();
}

// Initialize cat tiles
function initCatGame() {
  const catContainer = document.getElementById("cat-container");
  catContainer.innerHTML = ""; // Clear any existing tiles

  for (let i = 0; i < totalTiles; i++) {
    const tile = document.createElement("div");
    tile.className = "cat-tile";
    tile.dataset.index = i;

    const tileInner = document.createElement("div");
    tileInner.className = "cat-tile-inner";

    const tileFront = document.createElement("div");
    tileFront.className = "cat-tile-front";
    tileFront.style.background = rainbowColors[i];

    const tileBack = document.createElement("div");
    tileBack.className = "cat-tile-back";
    tileBack.style.backgroundPosition = `${(i % 4) * -50}px ${Math.floor(i / 4) * -50}px`;

    tileInner.appendChild(tileFront);
    tileInner.appendChild(tileBack);
    tile.appendChild(tileInner);

    catContainer.appendChild(tile);
  }
}

// Reveal a random tile
function revealRandomTile() {
  const tiles = document.querySelectorAll(".cat-tile");
  const availableTiles = Array.from(tiles).filter(
    (tile) => !revealedTiles.includes(parseInt(tile.dataset.index))
  );

  if (availableTiles.length > 0) {
    const randomTile =
      availableTiles[Math.floor(Math.random() * availableTiles.length)];
    randomTile.classList.add("flipped");
    revealedTiles.push(parseInt(randomTile.dataset.index));
  }

  // Check if all tiles are revealed
  if (revealedTiles.length === totalTiles) {
    document.getElementById("cat-message").textContent =
      "Congratulations! You've won a cat!";
    setTimeout(resetCatGame, 3000); // Reset after 3 seconds
  }
}

// Reset the cat game
function resetCatGame() {
  revealedTiles = [];
  document.getElementById("cat-message").textContent = "";
  initCatGame();
}

// Update the display
function updateDisplay() {
  const currentNumber = binaryToDecimal(binaryDigits);
  document.getElementById("current-number").textContent = currentNumber;
  document.getElementById("target-number").textContent = targetNumber;

  // Check if the current number matches the target
  if (currentNumber === targetNumber) {
    document.getElementById("message").textContent = `Nice! ${targetNumber} in binary is ${binaryDigits.join("")}.`;
    revealRandomTile(); // Reveal a tile

    // Reset after 3 seconds
    clearTimeout(messageTimeout);
    messageTimeout = setTimeout(() => {
      targetNumber = generateTarget();
      binaryDigits.fill(0); // Reset all boxes to 0
      updateDisplay();
      document.getElementById("message").textContent = "";
    }, 3000);
  }
}

// Convert binary digits to decimal
function binaryToDecimal(binaryArray) {
  return binaryArray.reduce((sum, bit, index) => sum + bit * Math.pow(2, 7 - index), 0);
}

// Generate a random target number
function generateTarget() {
  return Math.floor(Math.random() * 256); // Random number between 0-255
}

// Initialize everything
initGame();
initCatGame();
