let binaryDigits = Array(8).fill(0); // Initialize an 8-bit binary number
let revealedTiles = []; // Keep track of revealed tiles
let targetNumber = generateTarget(); // Target number
const totalTiles = 16;
const totalImages = 10; // Number of available images
let currentImage = ""; // Path to the current random image
let isGameComplete = false; // Tracks whether all tiles are revealed

// Rainbow colors for tiles
const rainbowColors = [
  "red", "orange", "yellow", "green", "blue", "indigo", "violet",
  "pink", "teal", "brown", "lightblue", "gold", "lime", "purple", "silver", "coral",
];

// Generate a random target number
function generateTarget() {
  return Math.floor(Math.random() * 256); // Random number between 0-255
}

// Convert binary digits to decimal
function binaryToDecimal(binaryArray) {
  return binaryArray.reduce((sum, bit, index) => sum + bit * Math.pow(2, 7 - index), 0);
}

// Select a random image
function selectRandomImage() {
  const randomIndex = Math.floor(Math.random() * totalImages) + 1; // Random number from 1 to totalImages
  return `images/${randomIndex}.jpg`;
}

// Initialize binary buttons
function updateBinaryButtons() {
  const container = document.getElementById("binary-boxes");
  container.innerHTML = ""; // Clear existing buttons

  binaryDigits.forEach((bit, index) => {
    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.alignItems = "center";
    wrapper.style.margin = "5px";

    const button = document.createElement("button");
    button.className = `binary-button ${bit === 1 ? "active" : ""}`;
    button.textContent = bit;
    button.addEventListener("click", () => toggleDigit(index));
    wrapper.appendChild(button);

    const base10Value = document.createElement("div");
    base10Value.textContent = Math.pow(2, 7 - index); // 128, 64, ..., 1
    base10Value.style.fontSize = "14px";
    base10Value.style.marginTop = "5px";
    wrapper.appendChild(base10Value);

    container.appendChild(wrapper);
  });
}

// Toggle a binary digit
function toggleDigit(index) {
  if (isGameComplete) return; // Prevent interaction if the game is complete
  binaryDigits[index] = binaryDigits[index] === 0 ? 1 : 0;
  updateBinaryButtons();
  updateDisplay();
}

// Update the display (Partial Match Logic)
function updateDisplay() {
  const currentNumber = binaryToDecimal(binaryDigits);
  document.getElementById("current-number").textContent = currentNumber;
  document.getElementById("target-number").textContent = targetNumber;

  if (currentNumber === targetNumber && !isGameComplete) {
    document.getElementById("message").textContent = `Nice! ${currentNumber} in binary is ${binaryDigits.join("")}.`;
    revealRandomTile(); // Reveal a tile

    // After 3 seconds, reset the target and message
    setTimeout(() => {
      if (!isGameComplete) {
        targetNumber = generateTarget(); // Generate a new target
        binaryDigits.fill(0); // Reset binary digits
        updateBinaryButtons();
        updateDisplay();
        document.getElementById("message").textContent = "";
      }
    }, 3000);
  }
}

// Reveal a random tile (Handles Complete Match)
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
    isGameComplete = true; // Mark the game as complete
    document.getElementById("message").textContent = `Congratulations, you got ${binaryDigits.join("")} binary number correct!`;
    document.getElementById("reset-button").style.display = "block"; // Show the reset button
  }
}

// Reset the game
function resetGame() {
  isGameComplete = false; // Reset game completion state
  targetNumber = generateTarget(); // Generate a new target
  binaryDigits.fill(0); // Reset binary digits
  revealedTiles = []; // Reset revealed tiles

  // Hide the reset button
  document.getElementById("reset-button").style.display = "none";

  // Clear messages
  document.getElementById("message").textContent = "";

  // Reinitialize the game
  initGame();
  initCatGame();
}

// Initialize the binary game
function initGame() {
  updateBinaryButtons();
  updateDisplay();
}

// Initialize cat tiles
function initCatGame() {
  currentImage = selectRandomImage(); // Select a new random image
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
    tileBack.style.backgroundImage = `url(${currentImage})`; // Use the selected image
    tileBack.style.backgroundSize = "200px 200px";
    tileBack.style.backgroundPosition = `${(i % 4) * -50}px ${Math.floor(i / 4) * -50}px`;

    tileInner.appendChild(tileFront);
    tileInner.appendChild(tileBack);
    tile.appendChild(tileInner);

    catContainer.appendChild(tile);
  }
}

// Initialize everything
initGame();
initCatGame();
