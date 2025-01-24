"use strict";

console.log(document.getElementById("start-game"));

// Global variables
let flippedTiles = [];
let matchesFound = 0;
let attempts = 0;
let currentSelectedTables = [];

// Function Definitions (Keep these outside the DOMContentLoaded wrapper)
function getRandomImage() {
  const totalImages = 10; // Update this number if you add more images
  const randomIndex = Math.floor(Math.random() * totalImages) + 1;
  return `images/${randomIndex}.jpg`;
}

function getSelectedTimesTables() {
  const checkboxes = document.querySelectorAll(".times-table:checked");
  console.log("Checked boxes:", checkboxes); // Debugging
  const selected = Array.from(checkboxes).map(cb => parseInt(cb.value));
  console.log("Selected times tables:", selected); // Debugging

  if (selected.length === 0) {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  }

  return selected;
}

function assignTileBackgrounds(image) {
  const gameBoard = document.getElementById("game-board");
  const tiles = gameBoard.querySelectorAll(".tile");

  tiles.forEach((tile, index) => {
    const row = Math.floor(index / 4); // Row index (0-3)
    const col = index % 4;            // Column index (0-3)
    tile.dataset.bgPosition = `-${col * 100}px -${row * 100}px`;
    tile.dataset.bgImage = image;
  });
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function generateMultiplicationData(pairsCount, selectedTables) {
  const data = [];
  selectedTables.forEach(number => {
    for (let i = 1; i <= 12; i++) {
      data.push({ problem: `${number}x${i}`, answer: number * i });
    }
  });
  shuffle(data); // Shuffle all pairs
  return data.slice(0, pairsCount); // Take the first `pairsCount` pairs
}

function initGame(selectedTables) {

  // Store the current tables for "Play again" functionality
  currentSelectedTables = [...selectedTables];

  document.getElementById("times-tables-selection").style.display = "none"; 
  const gameBoard = document.getElementById("game-board");
  gameBoard.style.display = "grid"; // or block, but grid is more direct
  gameBoard.innerHTML = "";
  flippedTiles = [];
  matchesFound = 0;
  attempts = 0;

  document.getElementById("times-tables-selection").style.display = "none"; // Hide checklist
  document.getElementById("game-board").style.display = "grid"; // Show game board
  console.log("Initializing game with:", selectedTables); // Debugging
  
 
  const gameBoard = document.getElementById("game-board");
  console.log("Game Board Element:", gameBoard); // Debugging
  gameBoard.innerHTML = ""; // Clear the game board
  flippedTiles = [];
  matchesFound = 0;
  attempts = 0;

  const selectedImage = getRandomImage();
  console.log("Selected Image for Background:", selectedImage); // Debugging

  const multiplicationData = generateMultiplicationData(8, selectedTables); // 8 pairs for a 4x4 grid
  console.log("Generated Multiplication Data:", multiplicationData); // Debugging

  const tileData = [
    ...multiplicationData.map(pair => ({ content: pair.problem, type: "problem" })), // Add problems
    ...multiplicationData.map(pair => ({ content: pair.answer, type: "answer" }))    // Add answers
  ];
  console.log("Tile Data Before Shuffling:", tileData); // Debugging

  shuffle(tileData); // Shuffle tiles
  console.log("Tile Data After Shuffling:", tileData); // Debugging

  // Create tiles
  tileData.forEach((data, index) => {
    const tile = document.createElement("div");
    tile.classList.add("tile");
    tile.dataset.content = data.content;
    tile.dataset.type = data.type;
    tile.dataset.index = index;

    tile.addEventListener("click", handleTileClick);
    gameBoard.appendChild(tile);
    console.log("Tile Added to Game Board:", tile); // Debugging
  });

  assignTileBackgrounds(selectedImage);
  console.log("Tiles Assigned Backgrounds"); // Debugging

  document.getElementById("message").textContent = "";
  document.getElementById("attempts-count").textContent = "0"; // Reset attempts
  
  console.log("Game Board Content After Initialization:", document.getElementById("game-board").innerHTML);
  console.log("Game successfully initialized!");
  
  document.getElementById("message").textContent = "";
  document.getElementById("attempts-count").textContent = "0";

  // Hide these two buttons if they were previously shown
  document.getElementById("play-again").style.display = "none";
  document.getElementById("choose-new").style.display = "none";
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

    // Lock matched tiles and reveal their part of the image
    [problemTile, answerTile].forEach(tile => {
      tile.classList.add("matched");
      tile.style.backgroundImage = `url(${tile.dataset.bgImage})`;
      tile.style.backgroundPosition = tile.dataset.bgPosition;
    });

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
  
  if (matchesFound === 8) {
    document.getElementById("message").textContent = 
      "Congratulations! You matched all pairs!";
    
    // Show the new buttons now that the game is finished
    document.getElementById("play-again").style.display = "inline-block";
    document.getElementById("choose-new").style.display = "inline-block";
  }
}

// Wrap DOM-dependent code inside DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and script running");

  // Add the event listener to the Start Game button
  document.getElementById("start-game").addEventListener("click", () => {
    console.log("Start Game button clicked"); // Debugging
    const selectedTables = getSelectedTimesTables();
    console.log("Selected Times Tables:", selectedTables); // Debugging
    initGame(selectedTables);
  });
  
  document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("start-game").addEventListener("click", () => {
    const selectedTables = getSelectedTimesTables();
    initGame(selectedTables);
  });

  // Button 1: Replay with the **same** times tables
  document.getElementById("play-again").addEventListener("click", () => {
    initGame(currentSelectedTables);
  });

  // Button 2: Go back to the checklist
  document.getElementById("choose-new").addEventListener("click", () => {
    // Show the selection again
    document.getElementById("times-tables-selection").style.display = "block";
    // Hide the board, buttons, and message
    document.getElementById("game-board").style.display = "none";
    document.getElementById("play-again").style.display = "none";
    document.getElementById("choose-new").style.display = "none";
    document.getElementById("message").textContent = "";
  });


  // Add "Select All" functionality for checkboxes
  document.getElementById("select-all").addEventListener("change", (event) => {
    const checked = event.target.checked;
    const checkboxes = document.querySelectorAll(".times-table");
    checkboxes.forEach(cb => cb.checked = checked);
  });
});
