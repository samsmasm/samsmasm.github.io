// List of animal emojis.
const animalEmojis = ["🐶", "🐱", "🐰", "🐻", "🦊", "🐼", "🐨", "🐯"];

// Get DOM elements.
const tileContainer = document.getElementById("tile-container");
const guideContainer = document.getElementById("guide-container");
const yayMessage = document.getElementById("yay-message");
const meowSound = document.getElementById("meow-sound");
const toggleGuideButton = document.getElementById("toggle-guide");
const resetButton = document.getElementById("reset-button");

const btnEmoji = document.getElementById("mode-emoji");
const btnMixed = document.getElementById("mode-mixed");
const btnDigits = document.getElementById("mode-digits");

const tileCountSlider = document.getElementById("tile-count-slider");
const tileCountDisplay = document.getElementById("tile-count-display");
const startNumberSlider = document.getElementById("start-number-slider");
const startNumberDisplay = document.getElementById("start-number-display");

let currentMode = "mixed"; // Options: "emoji", "mixed", "digits"
const dragThreshold = 5;   // Minimal pixels before starting a drag.
let guideVisible = true;   // Guide row is visible by default.

// Create tiles based on slider values and current mode.
function createTiles() {
  tileContainer.innerHTML = '';
  const tileCount = parseInt(tileCountSlider.value, 10);
  const startNumber = parseInt(startNumberSlider.value, 10);
  
  // In "mixed" mode, choose up to 2 random numbers from the sequence to display as digits.
  let digitTiles = [];
  if (currentMode === "mixed") {
    while (digitTiles.length < Math.min(2, tileCount)) {
      const candidate = startNumber + Math.floor(Math.random() * tileCount);
      if (!digitTiles.includes(candidate)) {
        digitTiles.push(candidate);
      }
    }
  }
  
  // Create each draggable tile.
  for (let i = 0; i < tileCount; i++) {
    const numberValue = startNumber + i;
    const tile = document.createElement("div");
    tile.classList.add("tile");
    tile.setAttribute("data-number", numberValue);
    
    if (currentMode === "emoji") {
      const emoji = animalEmojis[Math.floor(Math.random() * animalEmojis.length)];
      tile.textContent = numberValue > 0 ? emoji.repeat(numberValue) : emoji;
    } else if (currentMode === "digits") {
      tile.textContent = numberValue;
      tile.style.fontSize = "3em";
    } else if (currentMode === "mixed") {
      if (digitTiles.includes(numberValue)) {
        tile.textContent = numberValue;
        tile.style.fontSize = "3em";
      } else {
        const emoji = animalEmojis[Math.floor(Math.random() * animalEmojis.length)];
        tile.textContent = numberValue > 0 ? emoji.repeat(numberValue) : emoji;
      }
    }
    
    tileContainer.appendChild(tile);
    addDragAndDrop(tile);
  }
  
  shuffleTiles();
  updateGuide();
}

// Update the guide row based on slider values.
function updateGuide() {
  guideContainer.innerHTML = '';
  const tileCount = parseInt(tileCountSlider.value, 10);
  const startNumber = parseInt(startNumberSlider.value, 10);
  
  for (let i = 0; i < tileCount; i++) {
    const numberValue = startNumber + i;
    const guideElem = document.createElement("div");
    guideElem.classList.add("guide-element");
    guideElem.textContent = numberValue;
    guideContainer.appendChild(guideElem);
  }
  guideContainer.style.display = guideVisible ? "flex" : "none";
}

// Shuffle the order of the tiles.
function shuffleTiles() {
  const tiles = Array.from(tileContainer.children);
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    tileContainer.insertBefore(tiles[i], tiles[j]);
  }
}

// Drag-and-drop implementation that uses the tile's initial offset.
function addDragAndDrop(tile) {
  let startX = 0, startY = 0;
  let tileInitialLeft = 0, tileInitialTop = 0;
  let draggingStarted = false;
  let initialIndex = null;
  
  const pointerDown = (e) => {
    e.preventDefault();
    startX = e.clientX || e.touches[0].clientX;
    startY = e.clientY || e.touches[0].clientY;
    tileInitialLeft = tile.offsetLeft;
    tileInitialTop = tile.offsetTop;
    initialIndex = Array.from(tileContainer.children).indexOf(tile);
    
    document.addEventListener("pointermove", pointerMove);
    document.addEventListener("pointerup", pointerUp);
    document.addEventListener("touchmove", pointerMove, { passive: false });
    document.addEventListener("touchend", pointerUp);
  };
  
  const pointerMove = (e) => {
    e.preventDefault();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    if (!draggingStarted) {
      const dx = clientX - startX;
      const dy = clientY - startY;
      if (Math.hypot(dx, dy) < dragThreshold) return;
      draggingStarted = true;
      tile.classList.add("dragging");
      tile.style.left = tileInitialLeft + "px";
      tile.style.top = tileInitialTop + "px";
    }
    
    if (draggingStarted) {
      tile.style.left = (tileInitialLeft + clientX - startX) + "px";
      tile.style.top = (tileInitialTop + clientY - startY) + "px";
    }
    
    // Determine new index based on the tile's center.
    const tileRect = tile.getBoundingClientRect();
    const centerX = tileRect.left + tileRect.width / 2;
    
    let newIndex = 0;
    Array.from(tileContainer.children).forEach(child => {
      if (child === tile) return;
      const childRect = child.getBoundingClientRect();
      const childCenterX = childRect.left + childRect.width / 2;
      if (centerX > childCenterX) newIndex++;
    });
    
    if (newIndex !== initialIndex) {
      tileContainer.removeChild(tile);
      if (newIndex >= tileContainer.children.length) {
        tileContainer.appendChild(tile);
      } else {
        tileContainer.insertBefore(tile, tileContainer.children[newIndex]);
      }
      initialIndex = newIndex;
    }
  };
  
  const pointerUp = (e) => {
    if (draggingStarted) {
      tile.classList.remove("dragging");
      tile.style.left = "";
      tile.style.top = "";
    }
    draggingStarted = false;
    document.removeEventListener("pointermove", pointerMove);
    document.removeEventListener("pointerup", pointerUp);
    document.removeEventListener("touchmove", pointerMove);
    document.removeEventListener("touchend", pointerUp);
    
    checkOrder();
  };
  
  tile.addEventListener("pointerdown", pointerDown);
  tile.addEventListener("touchstart", pointerDown, { passive: false });
}

// Check if the tiles are in ascending order.
function checkOrder() {
  const tiles = Array.from(tileContainer.children);
  const numbers = tiles.map(tile => Number(tile.getAttribute("data-number")));
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i - 1] > numbers[i]) return;
  }
  celebrate();
}

// Celebration function: show "Yay!" and play sound.
function celebrate() {
  yayMessage.style.opacity = "1";
  yayMessage.style.animation = "sparkle 1s ease forwards";
  meowSound.play();
  setTimeout(() => {
    yayMessage.style.opacity = "0";
    yayMessage.style.animation = "none";
  }, 1000);
}

// Reset button event.
resetButton.addEventListener("click", createTiles);

// Mode selection buttons events.
btnEmoji.addEventListener("click", () => { currentMode = "emoji"; createTiles(); });
btnMixed.addEventListener("click", () => { currentMode = "mixed"; createTiles(); });
btnDigits.addEventListener("click", () => { currentMode = "digits"; createTiles(); });

// Slider events.
tileCountSlider.addEventListener("input", () => {
  tileCountDisplay.textContent = tileCountSlider.value;
  createTiles();
});
startNumberSlider.addEventListener("input", () => {
  startNumberDisplay.textContent = startNumberSlider.value;
  createTiles();
});

// Toggle guide row visibility.
toggleGuideButton.addEventListener("click", () => {
  guideVisible = !guideVisible;
  guideContainer.style.display = guideVisible ? "flex" : "none";
});

// Initialize game.
createTiles();
