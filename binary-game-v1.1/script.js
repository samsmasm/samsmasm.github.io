let binaryDigits = Array(8).fill(0); // Initialize an 8-bit binary number
let revealedTiles = []; // Keep track of revealed tiles
let targetNumber = generateTarget(); // Target number
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
  binaryDigits[index] = binaryDigits[index] === 0 ? 1 : 0;
  updateBinaryButtons();
  updateDisplay();
}

// Generate a random target number
function generateTarget() {
  return Math.floor(Math.random() * 256); // Random number between 0-255
}

// Initialize the binary game
function initGame() {
  updateBinaryButtons();
  updateDisplay();
}

// Update the display
function updateDisplay() {
  const currentNumber = binaryToDecimal(binaryDigits);
  document.getElementById("current-number").textContent = currentNumber;
  document.getElementById("target-number").textContent = targetNumber;

  if (currentNumber === targetNumber) {
    document.getElementById("message").textContent = `Nice! ${targetNumber} in binary is ${binaryDigits.join("")}.`;
    revealRandomTile(); // Reveal a tile

    setTimeout(() => {
      targetNumber = generateTarget(); // Generate a new target
      binaryDigits.fill(0); // Reset binary digits
      updateBinaryButtons();
      updateDisplay();
      document.getElementById("message").textContent = "";
    }, 3000);
  }
}

// Convert binary to decimal
function binaryToDecimal(binaryArray) {
  return binaryArray.reduce((sum, bit, index) => sum + bit * Math.pow(2, 7 - index), 0);
}

// Initialize cat tiles
function initCatGame() {
  const catContainer = document.getElementById("cat-container");
  catContainer.innerHTML = ""; // Clear existing tiles

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

  if (revealedTiles.length === totalTiles) {
    document.getElementById("cat-message").textContent = "Congratulations! You've won a cat!";
    setTimeout(resetCatGame, 3000);
  }
}

// Reset the cat game
function resetCatGame() {
  revealedTiles = [];
  document.getElementById("cat-message").textContent = "";
  initCatGame();
}

// Initialize everything
initGame();
initCatGame();
