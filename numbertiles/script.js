// List of animal emojis to choose from.
const animalEmojis = [
    "🐶", "🐱", "🐰", "🐻", "🦊", "🐼", "🐨", "🐯",
    "🦁", "🐮", "🐷", "🐵", "🐸", "🐔", "🐧", "🐦",
    "🐤", "🐣", "🐥", "🦆"
  ];
  
// Container and other elements.
const container = document.getElementById("tile-container");
const yayMessage = document.getElementById("yay-message");
const meowSound = document.getElementById("meow-sound");

// Mode buttons.
const btnEmoji = document.getElementById("mode-emoji");
const btnMixed = document.getElementById("mode-mixed");
const btnDigits = document.getElementById("mode-digits");

// Slider controls.
const tileCountSlider = document.getElementById("tile-count-slider");
const tileCountDisplay = document.getElementById("tile-count-display");
const startNumberSlider = document.getElementById("start-number-slider");
const startNumberDisplay = document.getElementById("start-number-display");

// Current mode; default is "mixed".
let currentMode = "mixed";
const dragThreshold = 5; // Minimal movement in pixels before dragging starts.

function createTiles() {
  container.innerHTML = '';

  // Read values from sliders.
  const tileCount = parseInt(tileCountSlider.value, 10);
  const startNumber = parseInt(startNumberSlider.value, 10);

  // For "mixed" mode, decide which two tile numbers (from the sequence) will display as a digit.
  let digitTiles = [];
  if (currentMode === "mixed") {
    while (digitTiles.length < Math.min(2, tileCount)) {
      const candidate = startNumber + Math.floor(Math.random() * tileCount);
      if (!digitTiles.includes(candidate)) {
        digitTiles.push(candidate);
      }
    }
  }

  // Create tiles for numbers starting from startNumber.
  for (let i = 0; i < tileCount; i++) {
    const numberValue = startNumber + i;
    const tile = document.createElement("div");
    tile.classList.add("tile");
    tile.setAttribute("data-number", numberValue);

    if (currentMode === "emoji") {
      // Emoji mode: all tiles display emojis.
      const emoji = animalEmojis[Math.floor(Math.random() * animalEmojis.length)];
      tile.textContent = emoji.repeat(numberValue);
    } else if (currentMode === "digits") {
      // Only digits mode: all tiles display the digit.
      tile.textContent = numberValue;
      tile.style.fontSize = "3em";
    } else if (currentMode === "mixed") {
      // Mixed mode: two random tiles show as digits.
      if (digitTiles.includes(numberValue)) {
        tile.textContent = numberValue;
        tile.style.fontSize = "3em";
      } else {
        const emoji = animalEmojis[Math.floor(Math.random() * animalEmojis.length)];
        tile.textContent = emoji.repeat(numberValue);
      }
    }
    
    container.appendChild(tile);
    addDragAndDrop(tile);
  }
  
  // Shuffle the tile order.
  shuffleTiles();
}

function shuffleTiles() {
  const tilesArray = Array.from(container.children);
  for (let i = tilesArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    container.insertBefore(tilesArray[i], tilesArray[j]);
  }
}

function addDragAndDrop(tile) {
  let offsetX = 0, offsetY = 0;
  let startX = 0, startY = 0;
  let draggingStarted = false;
  let initialIndex = null;

  const pointerDownHandler = (e) => {
    e.preventDefault();
    startX = e.clientX || e.touches[0].clientX;
    startY = e.clientY || e.touches[0].clientY;
    const rect = tile.getBoundingClientRect();
    offsetX = startX - rect.left;
    offsetY = startY - rect.top;
    initialIndex = Array.from(container.children).indexOf(tile);

    document.addEventListener("pointermove", pointerMoveHandler);
    document.addEventListener("pointerup", pointerUpHandler);
    document.addEventListener("touchmove", pointerMoveHandler, {passive: false});
    document.addEventListener("touchend", pointerUpHandler);
  };

  const pointerMoveHandler = (e) => {
    e.preventDefault();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    // Only start dragging after exceeding the movement threshold.
    if (!draggingStarted) {
      const dx = clientX - startX;
      const dy = clientY - startY;
      if (Math.hypot(dx, dy) < dragThreshold) {
        return;
      }
      draggingStarted = true;
      tile.classList.add("dragging");
      const rect = tile.getBoundingClientRect();
      tile.style.width = rect.width + "px";
      tile.style.height = rect.height + "px";
    }
    
    tile.style.left = (clientX - offsetX - container.getBoundingClientRect().left) + "px";
    tile.style.top = (clientY - offsetY - container.getBoundingClientRect().top) + "px";

    const draggingRect = tile.getBoundingClientRect();
    const centerX = draggingRect.left + draggingRect.width / 2;
    
    let newIndex = 0;
    Array.from(container.children).forEach(child => {
      if (child === tile) return;
      const childRect = child.getBoundingClientRect();
      const childCenterX = childRect.left + childRect.width / 2;
      if (centerX > childCenterX) {
        newIndex++;
      }
    });
    
    if (newIndex !== initialIndex) {
      container.removeChild(tile);
      if (newIndex >= container.children.length) {
        container.appendChild(tile);
      } else {
        container.insertBefore(tile, container.children[newIndex]);
      }
      initialIndex = newIndex;
    }
  };

  const pointerUpHandler = (e) => {
    if (draggingStarted) {
      tile.classList.remove("dragging");
      tile.style.left = "";
      tile.style.top = "";
      tile.style.width = "";
      tile.style.height = "";
    }
    draggingStarted = false;
    document.removeEventListener("pointermove", pointerMoveHandler);
    document.removeEventListener("pointerup", pointerUpHandler);
    document.removeEventListener("touchmove", pointerMoveHandler);
    document.removeEventListener("touchend", pointerUpHandler);
    
    checkOrder();
  };

  tile.addEventListener("pointerdown", pointerDownHandler);
  tile.addEventListener("touchstart", pointerDownHandler, {passive: false});
}

function checkOrder() {
  const tilesArray = Array.from(container.children);
  const numbers = tilesArray.map(tile => Number(tile.getAttribute("data-number")));
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i-1] > numbers[i]) {
      return;
    }
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

// Reset the game when double-clicking (desktop) or double-tapping (touch).
document.addEventListener("dblclick", () => {
  createTiles();
});
let lastTouchTime = 0;
document.addEventListener("touchend", () => {
  let now = new Date().getTime();
  if (now - lastTouchTime < 300) {
    createTiles();
  }
  lastTouchTime = now;
});

// Mode button event listeners.
btnEmoji.addEventListener("click", () => {
  currentMode = "emoji";
  createTiles();
});
btnMixed.addEventListener("click", () => {
  currentMode = "mixed";
  createTiles();
});
btnDigits.addEventListener("click", () => {
  currentMode = "digits";
  createTiles();
});

// Update slider displays and recreate tiles when sliders change.
tileCountSlider.addEventListener("input", () => {
  tileCountDisplay.textContent = tileCountSlider.value;
  createTiles();
});
startNumberSlider.addEventListener("input", () => {
  startNumberDisplay.textContent = startNumberSlider.value;
  createTiles();
});

// Initialize game on page load.
createTiles();
