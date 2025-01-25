// script.js

window.addEventListener("load", () => {

  // 1) Generate random fractions based on level
  function getRandomFractions(count, level) {
    const fractionsSet = new Set();
    while (fractionsSet.size < count) {
      const den = Math.floor(Math.random() * 5) + 2; // 2..6
      let num;
      if (level === 2) {
        // Level 2: numerator is always 1
        num = 1;
      } else {
        // Level 1 or 3: numerator <= denominator
        num = Math.floor(Math.random() * den) + 1; // 1..den
      }
      fractionsSet.add(`${num}/${den}`);
    }
    return [...fractionsSet];
  }

  // Game state
  let level = 0;
  let fractions = [];
  let progressSteps = 0;

  // DOM elements
  const level1Button = document.getElementById("level1Button");
  const level2Button = document.getElementById("level2Button");
  const level3Button = document.getElementById("level3Button");
  const gameBoard     = document.getElementById("gameBoard");
  const fractionCards = document.querySelector(".fraction-container");
  const checkPizzasButton  = document.getElementById("checkPizzasButton");
  const checkAnswersButton = document.getElementById("checkAnswersButton");
  const resetButton        = document.getElementById("resetButton");
  const message            = document.getElementById("message");
  const progressRow        = document.getElementById("progressRow");

  // 2) Init progress row
  function initProgressRow() {
    progressRow.innerHTML = "";
    const initialImages = [
      "eating.jpg",
      "pizza.jpg",
      "pizza.jpg",
      "pizza.jpg",
      "pizza.jpg",
      "pizza.jpg",
      "pizza.jpg"
    ];
    initialImages.forEach((imgSrc, idx) => {
      const img = document.createElement("img");
      img.src = `./images/${imgSrc}`;
      img.alt = `Progress ${idx + 1}`;
      img.classList.add("progress-image");
      progressRow.appendChild(img);
    });
    progressSteps = 0;
  }

  // 3) Manage button states
  function updateButtonStates() {
    if (level === 1) {
      // Hide 'Check the Pizzas!' for Level 1
      checkPizzasButton.classList.add("hidden");
      checkPizzasButton.disabled = true;
      // Show and enable other buttons
      checkAnswersButton.classList.remove("hidden");
      checkAnswersButton.disabled = false;
      resetButton.classList.remove("hidden");
      resetButton.disabled = false;
    } else if (level === 2 || level === 3) {
      // Show 'Check the Pizzas!' for Levels 2 & 3
      checkPizzasButton.classList.remove("hidden");
      checkPizzasButton.disabled = false;
      // Show and enable other buttons
      checkAnswersButton.classList.remove("hidden");
      checkAnswersButton.disabled = false;
      resetButton.classList.remove("hidden");
      resetButton.disabled = false;
    }
  }

  // 4) Click handlers for level buttons
  level1Button.addEventListener("click", () => {
    level = 1;
    initGame();
  });
  level2Button.addEventListener("click", () => {
    level = 2;
    initGame();
  });
  level3Button.addEventListener("click", () => {
    level = 3;
    initGame();
  });

  // 5) Initialize game
  function initGame() {
    gameBoard.classList.remove("hidden");
    fractionCards.innerHTML = "";
    message.textContent = "";
    initProgressRow();
    updateButtonStates();
    startGame();
  }

  // 6) Start or reset
  function startGame() {
    fractionCards.innerHTML = "";
    const fractionCount = 5;
    fractions = getRandomFractions(fractionCount, level);

    // Build fraction cards
    fractions.forEach(fr => {
      const card = createFractionCard(fr);
      fractionCards.appendChild(card);
    });

    // Initialize drag-and-drop functionality
    initDragAndDrop();

    // Re-enable 'Check the Pizzas!' if applicable
    if (level === 2 || level === 3) {
      checkPizzasButton.disabled = false;
    }
  }

  // 7) Create fraction card
  function createFractionCard(fr) {
    const card = document.createElement("div");
    card.classList.add("fraction-card");
    card.draggable = true;

    const pizza = document.createElement("div");
    pizza.classList.add("pizza");

    // For Level 1, show pizza immediately
    if (level === 1) {
      setPizzaBackground(pizza, fr);
    } else {
      // For Levels 2 & 3, hide pizza initially
      pizza.style.background = "none";
      pizza.style.border = "1px solid #ccc";
    }

    const label = document.createElement("div");
    label.classList.add("fraction-label");
    label.textContent = fr;

    card.appendChild(pizza);
    card.appendChild(label);
    return card;
  }

  // 8) Set pizza background
  function setPizzaBackground(pizzaElement, fractionStr) {
    const [num, den] = fractionStr.split("/").map(Number);
    const fractionVal = num / den;
    pizzaElement.style.background = `
      conic-gradient(
        rgba(255, 255, 0, 0.8) 0% ${fractionVal * 100}%,
        rgba(128, 128, 128, 0.8) ${fractionVal * 100}% 100%
      ),
      repeating-conic-gradient(
        black 0deg 3deg,
        white 3deg ${360 / den}deg
      )
    `;
  }

  // 9) Drag-and-drop logic confined within fraction-container
  function initDragAndDrop() {
    const fractionContainer = document.querySelector(".fraction-container");
    let draggedCard = null;

    fractionContainer.addEventListener("dragstart", (e) => {
      if (e.target.classList.contains("fraction-card")) {
        draggedCard = e.target;
        draggedCard.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      }
    });

    fractionContainer.addEventListener("dragend", () => {
      if (draggedCard) {
        draggedCard.classList.remove("dragging");
        draggedCard = null;
      }
    });

    fractionContainer.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (!draggedCard) return;

      const target = e.target.closest(".fraction-card");
      if (!target || target === draggedCard) return;

      const bounding = target.getBoundingClientRect();
      const offset = e.clientY - bounding.top;

      if (offset < bounding.height / 2) {
        fractionContainer.insertBefore(draggedCard, target);
      } else {
        fractionContainer.insertBefore(draggedCard, target.nextSibling);
      }
    });

    fractionContainer.addEventListener("drop", (e) => {
      e.preventDefault();
      // Reordering is handled in dragover
    });
  }

  // 10) Check the Pizzas
  checkPizzasButton.addEventListener("click", () => {
    if (level === 2 || level === 3) {
      const cards = document.querySelectorAll(".fraction-card");
      cards.forEach(card => {
        const fractionStr = card.querySelector(".fraction-label").textContent;
        const pizzaEl = card.querySelector(".pizza");
        setPizzaBackground(pizzaEl, fractionStr);
      });
      checkPizzasButton.disabled = true; // Disable after clicking
    }
  });

  // 11) Check the Answers
  checkAnswersButton.addEventListener("click", () => {
    checkOrder();
  });

  // 12) Reset
  resetButton.addEventListener("click", () => {
    message.textContent = "";
    initProgressRow();
    updateButtonStates();
    startGame();
  });

  // 13) Check order
  function checkOrder() {
    const cards = [...document.querySelectorAll(".fraction-card")];
    const userOrder = cards.map(card => card.querySelector(".fraction-label").textContent);
    let isNonDecreasing = true;

    for (let i = 0; i < userOrder.length - 1; i++) {
      if (fractionValue(userOrder[i]) > fractionValue(userOrder[i + 1])) {
        isNonDecreasing = false;
        break;
      }
    }

    if (isNonDecreasing) {
      updateProgressRow();
      message.textContent = "Correct! Nice job ordering the fractions.";
      message.style.color = "green";

      if (progressSteps >= 6) {
        updateProgressRow(true);
        message.textContent = "Congratulations! You've completed the game.";
        message.style.color = "blue";
        // Disable further actions
        checkAnswersButton.disabled = true;
        checkPizzasButton.disabled = true;
      } else {
        startGame();
      }
    } else {
      message.textContent = "Not quite. Try rearranging them again!";
      message.style.color = "red";
    }
  }

  function fractionValue(fr) {
    const [num, den] = fr.split("/").map(Number);
    return num / den;
  }

  // 14) Progress Row
  function updateProgressRow(isFinal = false) {
    if (progressSteps < 6) {
      const poopImg = progressRow.children[progressSteps];
      poopImg.src = "./images/poop.jpg";

      if (progressSteps + 1 < progressRow.children.length) {
        const nextImg = progressRow.children[progressSteps + 1];
        if (progressSteps + 1 === progressRow.children.length - 1) {
          nextImg.src = "./images/pop.jpg";
        } else {
          nextImg.src = "./images/eating.jpg";
        }
      }
      progressSteps++;
    }
    if (isFinal && progressSteps === 6) {
      const lastImg = progressRow.children[6];
      lastImg.src = "./images/pop.jpg";
    }
  }

  // Initial button state
  checkPizzasButton.classList.add("hidden");
  checkAnswersButton.classList.add("hidden");
  resetButton.classList.add("hidden");
  initProgressRow();
});
