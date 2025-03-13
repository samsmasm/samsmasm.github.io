// List of animal emojis to choose from.
const animalEmojis = ["🐶", "🐱", "🐰", "🐻", "🦊", "🐼", "🐨", "🐯"];

// Container and other elements.
const container = document.getElementById("tile-container");
const yayMessage = document.getElementById("yay-message");
const resetButton = document.getElementById("reset-button");
const meowSound = document.getElementById("meow-sound");

let tilesData = []; // Array to store tile elements.

function createTiles() {
  container.innerHTML = '';
  tilesData = [];

  // Decide which two tiles (by their numbers 1-5) will display as a digit.
  // We'll randomly pick 2 distinct numbers between 1 and 5.
  let digitTiles = [];
  while (digitTiles.length < 2) {
    const candidate = Math.floor(Math.random() * 5) + 1;
    if (!digitTiles.includes(candidate)) {
      digitTiles.push(candidate);
    }
  }

  // Create tiles for numbers 1 to 5.
  for (let i = 1; i <= 5; i++) {
    const tile = document.createElement("div");
    tile.classList.add("tile");
    tile.setAttribute("data-number", i);

    // If this tile's number is in the digitTiles array, display a big digit.
    if (digitTiles.includes(i)) {
      tile.textContent = i;
      tile.style.fontSize = "3em";
    } else {
      // Otherwise, pick a random animal emoji and display it repeated i times.
      const emoji = animalEmojis[Math.floor(Math.random() * animalEmojis.length)];
      tile.textContent = emoji.repeat(i);
    }
    
    container.appendChild(tile);
    tilesData.push(tile);
    
    // Add pointer event listeners for drag and drop.
    addDragAndDrop(tile);
  }
  
  // Shuffle the tile order in the container.
  shuffleTiles();
}

function shuffleTiles() {
  const tilesArray = Array.from(container.children);
  // Fisher-Yates shuffle
  for (let i = tilesArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    container.insertBefore(tilesArray[i], tilesArray[j]);
  }
}

function addDragAndDrop(tile) {
  let offsetX = 0, offsetY = 0;
  let startX = 0, startY = 0;
  let initialIndex = null;

  const pointerDownHandler = (e) => {
    e.preventDefault();
    tile.classList.add("dragging");
    startX = e.clientX || e.touches[0].clientX;
    startY = e.clientY || e.touches[0].clientY;
    const rect = tile.getBoundingClientRect();
    offsetX = startX - rect.left;
    offsetY = startY - rect.top;
    initialIndex = Array.from(container.children).indexOf(tile);
    
    // Fix tile size to prevent layout issues.
    tile.style.width = rect.width + "px";
    tile.style.height = rect.height + "px";
    
    document.addEventListener("pointermove", pointerMoveHandler);
    document.addEventListener("pointerup", pointerUpHandler);
    document.addEventListener("touchmove", pointerMoveHandler, {passive: false});
    document.addEventListener("touchend", pointerUpHandler);
  };

  const pointerMoveHandler = (e) => {
    e.preventDefault();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    tile.style.left = (clientX - offsetX - container.getBoundingClientRect().left) + "px";
    tile.style.top = (clientY - offsetY - container.getBoundingClientRect().top) + "px";

    // Determine new potential index based on the center of the dragging tile.
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
    tile.classList.remove("dragging");
    tile.style.left = "";
    tile.style.top = "";
    tile.style.width = "";
    tile.style.height = "";
    
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

resetButton.addEventListener("click", () => {
  createTiles();
});

createTiles();
