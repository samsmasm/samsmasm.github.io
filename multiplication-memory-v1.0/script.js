let flippedTiles = [];
let matchesFound = 0;
let attempts = 0;

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function generateMultiplicationData(pairsCount) {
  const data = [];
  for (let i = 1; i <= 6; i++) {
    for (let j = 1; j <= 6; j++) {
      data.push({ problem: `${i}x${j}`, answer: i * j }); // Add problem and answer pairs
    }
  }
  shuffle(data); // Shuffle all pairs
  console.log("Generated multiplication data:", data.slice(0, pairsCount)); // Debugging
  return data.slice(0, pairsCount); // Take the first `pairsCount` pairs
}

function initGame() {
  const gameBoard = document.getElementById("game-board");
  gameBoard.innerHTML = ""; // Clear the game board
  flippedTiles = [];
  matchesFound = 0;

  // Generate multiplication problems and answers
  const multiplicationData = generateMultiplicationData(8); // 8 pairs for a 4x4 grid
  const tileData = [
    ...multiplicationData.map(pair => ({ content: pair.problem, type: "problem" })), // Add problems
    ...multiplicationData.map(pair => ({ content: pair.answer, type: "answer" }))    // Add answers
  ];
  shuffle(tileData); // Shuffle tiles

  // Create tiles
  tileData.forEach((data, index) => {
    const tile = document.createElement("div");
    tile.classList.add("tile");
    tile.dataset.content = data.content;
    tile.dataset.type = data.type; // Mark tile as "problem" or "answer"

    console.log("Creating tile:", data.content, data.type); // Debugging

    // Add click handler
    tile.addEventListener("click", handleTileClick);

    gameBoard.appendChild(tile);
  });

  document.getElementById("message").textContent = "";
}

function handleTileClick(event) {
  const tile = event.target;

  // Prevent flipping more than 2 tiles or flipping already matched tiles
  if (flippedTiles.length === 2 || tile.classList.contains("flipped") || tile.classList.contains("matched")) {
    return;
  }

  tile.classList.add("flipped");
  tile.textContent = tile.dataset.content; // Reveal the tile content
  flippedTiles.push(tile);

  if (flippedTiles.length === 2) {
    checkMatch(); // Check for a match after two tiles are flipped
  }
}

function checkMatch() {
  attempts++;
  document.getElementById("attempts-count").textContent = attempts; // Update attempts on the page

  const [tile1, tile2] = flippedTiles;

  let problemTile, answerTile;

  // Identify which tile is the problem and which is the answer
  if (tile1.dataset.type === "problem" && tile2.dataset.type === "answer") {
    problemTile = tile1;
    answerTile = tile2;
  } else if (tile2.dataset.type === "problem" && tile1.dataset.type === "answer") {
    problemTile = tile2;
    answerTile = tile1;
  } else {
    // If both are problems or both are answers, no match
    setTimeout(() => {
      tile1.classList.remove("flipped");
      tile1.textContent = "";
      tile2.classList.remove("flipped");
      tile2.textContent = "";
      flippedTiles = [];
    }, 1000);
    return;
  }

  // Extract the problem (e.g., "2x2") and calculate its result
  const [a, b] = problemTile.dataset.content.split("x").map(Number);
  const problemResult = a * b;

  // Check if the problem result matches the answer
  if (problemResult === parseInt(answerTile.dataset.content)) {
    matchesFound++;

    // Lock matched tiles
    problemTile.classList.add("matched");
    answerTile.classList.add("matched");
    problemTile.style.backgroundColor = "pink";
    answerTile.style.backgroundColor = "pink";

    // Remove event listeners
    problemTile.removeEventListener("click", handleTileClick);
    answerTile.removeEventListener("click", handleTileClick);

    // Clear flipped tiles array
    flippedTiles = [];

    // Check if the game is complete
    if (matchesFound === 8) {
      document.getElementById("message").textContent = "Congratulations! You matched all pairs!";
    }
  } else {
    // Flip back non-matching tiles
    setTimeout(() => {
      tile1.classList.remove("flipped");
      tile1.textContent = "";
      tile2.classList.remove("flipped");
      tile2.textContent = "";
      flippedTiles = [];
    }, 1000);
  }
}

// Start the game
initGame();
