// List of animal emojis.
const animalEmojis = ["🐶", "🐱", "🐰", "🐻", "🦊", "🐼", "🐨", "🐯"];

// Elements.
const tileContainer = document.getElementById("tile-container");
const guideContainer = document.getElementById("guide-container");
const yayMessage = document.getElementById("yay-message");
const meowSound = document.getElementById("meow-sound");
const toggleGuideButton = document.getElementById("toggle-guide");

const btnEmoji = document.getElementById("mode-emoji");
const btnMixed = document.getElementById("mode-mixed");
const btnDigits = document.getElementById("mode-digits");

const tileCountSlider = document.getElementById("tile-count-slider");
const tileCountDisplay = document.getElementById("tile-count-display");
const startNumberSlider = document.getElementById("start-number-slider");
const startNumberDisplay = document.getElementById("start-number-display");

let currentMode = "mixed";
const dragThreshold = 5; // Minimal pixels before dragging.
let guideVisible = true; // Guide row is visible by default.

function createTiles() {
  tileContainer.innerHTML = '';
  
  // Get values from sliders.
  const tileCount = parseInt(tileCountSlider.value, 10);
  const startNumber = parseInt(startNumberSlider.value, 10);
  
  // For "mixed" mode, choose two random numbers (from the sequence) to display as digits.
  let digitTiles = [];
  if (currentMode === "mixed") {
    while (digitTiles.length < Math.min(2, tileCount)) {
      const candidate = startNumber + Math.floor(Math.random() * tileCount);
      if (!digitTiles.includes(candidate)) {
        digitTiles.push(candidate);
      }
    }
  }
  
  // Create draggable tiles.
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

function shuffleTiles() {
  const tiles = Array.from(tileContainer.children);
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    tileContainer.insertBefore(tiles[i], tiles[j]);
  }
}

function addDragAndDrop(tile) {
    let startX = 0, startY = 0;
    let tileInitialLeft = 0, tileInitialTop = 0;
    let draggingStarted = false;
    let initialIndex = null;
    
    const pointerDown = (e) => {
      e.preventDefault();
      startX = e.clientX || e.touches[0].clientX;
      startY = e.clientY || e.touches[0].clientY;
      // Get the tile's current offset within its container.
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
        // Set initial absolute position.
        tile.style.left = tileInitialLeft + "px";
        tile.style.top = tileInitialTop + "px";
      }
      
      if (draggingStarted) {
        // Update position relative to the initial offset.
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
  
  

function checkOrder() {
  const tiles = Array.from(tileContainer.children);
  const numbers = tiles.map(tile => Number(tile.getAttribute("data-number")));
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i - 1] > numbers[i]) return;
  }
  celebrate();
}

function celebrate() {
  yayMessage.style.opacity = "1";
  yayMessage.style.animation = "sparkle 1s ease forwards";
  meowSound.play();
  setTimeout(() => {
    yayMessage.style.opacity = "0";
    yayMessage.style.animation = "none";
  }, 1000);
}

// Reset on double click or double tap.
document.addEventListener("dblclick", createTiles);
let lastTouchTime = 0;
document.addEventListener("touchend", () => {
  const now = Date.now();
  if (now - lastTouchTime < 300) createTiles();
  lastTouchTime = now;
});

// Mode button listeners.
btnEmoji.addEventListener("click", () => { currentMode = "emoji"; createTiles(); });
btnMixed.addEventListener("click", () => { currentMode = "mixed"; createTiles(); });
btnDigits.addEventListener("click", () => { currentMode = "digits"; createTiles(); });

// Slider listeners.
tileCountSlider.addEventListener("input", () => {
  tileCountDisplay.textContent = tileCountSlider.value;
  createTiles();
});
startNumberSlider.addEventListener("input", () => {
  startNumberDisplay.textContent = startNumberSlider.value;
  createTiles();
});

// Toggle guide visibility.
toggleGuideButton.addEventListener("click", () => {
  guideVisible = !guideVisible;
  guideContainer.style.display = guideVisible ? "flex" : "none";
});

createTiles();
