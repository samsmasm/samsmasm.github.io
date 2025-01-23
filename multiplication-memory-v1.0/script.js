const problems = [];
let flippedTiles = [];
let matchesFound = 0;

// Generate multiplication problems up to 6 x 6
function generateProblems() {
  for (let i = 1; i <= 6; i++) {
    for (let j = 1; j <= 6; j++) {
      problems.push({ problem: `${i} x ${j}`, answer: i * j });
    }
  }
}

// Shuffle an array
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Initialize the game
function initGame() {
  const gameBoard = document.getElementById("game-board");
  gameBoard.innerHTML = ""; // Clear existing tiles
  flippedTiles = [];
  matchesFound = 0;

  // Generate problems and their answers
  const selectedProblems = problems.slice(0, 12); // 12 problems (24 tiles total)
  const tileData = [...selectedProblems, ...selectedProblems.map(p => ({ problem: p.answer }))]; // Add answers
  shuffle(tileData); // Shuffle the tiles

  // Create tiles
  tileData.forEach((data, index) => {
    const tile = document.createElement("div");
    tile.classList.add("tile");
    tile.dataset.index = index;
    tile.dataset.content = data.problem || data.answer;

    tile.addEventListener("click", () => flipTile(tile, data.problem || data.answer));
    gameBoard.appendChild(tile);
  });
}

// Flip a tile
function flipTile(tile, content) {
  if (flippedTiles.length === 2) return; // Only allow two tiles flipped at a time
  tile.classList.add("flipped");
  tile.textContent = content;
  flippedTiles.push(tile);

  if (flippedTiles.length === 2) {
    checkMatch();
  }
}

function checkMatch() {
  const [tile1, tile2] = flippedTiles;

  const isMatch = (tile1.textContent === tile2.dataset.content) ||
                  (tile2.textContent === tile1.dataset.content);

  if (isMatch) {
    matchesFound++;
    tile1.style.backgroundColor = "pink"; // Change color of matched tiles
    tile2.style.backgroundColor = "pink";
    tile1.classList.add("matched"); // Mark as matched
    tile2.classList.add("matched");

    // Prevent flipping them back
    tile1.removeEventListener("click", flipTile);
    tile2.removeEventListener("click", flipTile);

    flippedTiles = []; // Clear flipped tiles array

    if (matchesFound === 12) {
      document.getElementById("message").textContent = "Congratulations! You matched all pairs!";
    }
  } else {
    // Flip back non-matching tiles after 1 second
    setTimeout(() => {
      tile1.classList.remove("flipped");
      tile1.textContent = "";
      tile2.classList.remove("flipped");
      tile2.textContent = "";
      flippedTiles = [];
    }, 1000);
  }
}

// Reset the game
function resetGame() {
  document.getElementById("message").textContent = "";
  initGame();
}

// Start the game
generateProblems();
initGame();
