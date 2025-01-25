// script.js

window.addEventListener("load", () => {
  /* 1) Generate random fractions based on the selected level:
        - Level 1: Any fraction with numerator ≤ denominator (denominator ≤ 6)
        - Level 2: Fractions with numerator = 1 (denominator ≤ 6)
        - Level 3: Any fraction with numerator ≤ denominator (denominator ≤ 6) */

  function getRandomFractions(count, level) {
    const fractionsSet = new Set();
    while (fractionsSet.size < count) {
      let num, den;
      if (level === 2) {
        // Level 2: numerator is always 1
        den = Math.floor(Math.random() * 5) + 2; // 2..6
        num = 1;
      } else {
        // Level 1 and 3: numerator <= denominator
        den = Math.floor(Math.random() * 5) + 2; // 2..6
        num = Math.floor(Math.random() * den) + 1; // 1..den
      }
      fractionsSet.add(`${num}/${den}`);
    }
    return [...fractionsSet];
  }

  // We’ll store some game state here
  let level = 0;          // 1, 2, or 3
  let fractions = [];     // Current fraction set
  let currentOrder = [];  // Shuffled order

  // DOM elements
  const level1Button       = document.getElementById("level1Button");
  const level2Button       = document.getElementById("level2Button");
  const level3Button       = document.getElementById("level3Button");
  const gameBoard          = document.getElementById("gameBoard");
  const fractionCards      = document.getElementById("fractionCards");
  const checkPizzasButton  = document.getElementById("checkPizzasButton");
  const checkAnswersButton = document.getElementById("checkAnswersButton");
  const resetButton        = document.getElementById("resetButton");
  const message            = document.getElementById("message");

  // Handle clicks on Level 1, Level 2, and Level 3
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

  // Initialize the game based on the selected level
  function initGame() {
    // Reveal the game board and relevant buttons
    gameBoard.classList.remove("hidden");
    fractionCards.innerHTML = "";
    message.textContent = "";

    // Show or hide buttons based on level
    if (level === 1) {
      checkPizzasButton.classList.add("hidden"); // No need to reveal pizzas; they're shown by default
      checkAnswersButton.classList.remove("hidden");
      resetButton.classList.remove("hidden");
    } else if (level === 2 || level === 3) {
      checkPizzasButton.classList.remove("hidden"); // Allow to reveal pizzas
      checkAnswersButton.classList.remove("hidden");
      resetButton.classList.remove("hidden");
    }

    startGame();
  }

  // Start or reset the game with new random fractions
  function startGame() {
    fractionCards.innerHTML = ""; // Clear existing cards

    // Define how many fractions per game
    const fractionCount = 5;

    // Generate fractions based on the current level
    fractions = getRandomFractions(fractionCount, level);

    // Shuffle them
    currentOrder = shuffleArray([...fractions]);

    // Create a wrapper to hold everything: thin cat, pizzas, fat cat
    const rowWrapper = document.createElement("div");
    rowWrapper.classList.add("row-wrapper");

    // Add the thin cat image to the far left
    const thinCat = document.createElement("img");
    thinCat.src = "./images/nothungry.jpg";
    thinCat.alt = "Thin cat";
    thinCat.classList.add("thin-cat");
    rowWrapper.appendChild(thinCat);

    // Add each pizza tile in the middle
    currentOrder.forEach(fr => {
      const card = createFractionCard(fr);
      rowWrapper.appendChild(card); // Add each fraction card to the row
    });

    // Add the fat cat image to the far right
    const fatCat = document.createElement("img");
    fatCat.src = "./images/hungry.jpg";
    fatCat.alt = "Fat cat";
    fatCat.classList.add("fat-cat");
    rowWrapper.appendChild(fatCat);

    // Append the entire row to the game board
    fractionCards.appendChild(rowWrapper);

    // Initialize drag-and-drop functionality
    initDragAndDrop();
  }

  // Create individual fraction cards
  function createFractionCard(fr) {
    const card = document.createElement("div");
    card.classList.add("fraction-card");
    card.draggable = true;

    // Create the pizza element
    const pizza = document.createElement("div");
    pizza.classList.add("pizza");

    // For Level 1, show the pizza immediately
    if (level === 1) {
      setPizzaBackground(pizza, fr);
    } else {
      // For Level 2 and 3, hide the pizza initially
      pizza.style.background = "none";
      pizza.style.border = "1px solid #ccc"; // Optional boundary
    }

    // Add the fraction label below the pizza
    const label = document.createElement("div");
    label.classList.add("fraction-label");
    label.textContent = fr;

    // Assemble the card
    card.appendChild(pizza);
    card.appendChild(label);

    return card; // Return the complete card
  }

  // Set the conic-gradient background for a fraction
  function setPizzaBackground(pizzaElement, fractionStr) {
    const [num, den] = fractionStr.split("/").map(Number);
    const fractionVal = num / den; // e.g., 2/5 => 0.4

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

  // Shuffle array (Fisher-Yates)
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Drag-and-drop logic
  function initDragAndDrop() {
    const cards = document.querySelectorAll(".fraction-card");
    let draggedCard = null;

    cards.forEach(card => {
      card.addEventListener("dragstart", () => {
        draggedCard = card;
      });
      card.addEventListener("dragover", (e) => {
        e.preventDefault();
      });
      card.addEventListener("drop", () => {
        if (draggedCard && draggedCard !== card) {
          // Swap the inner content (pizza + label)
          const tempHTML = card.innerHTML;
          card.innerHTML = draggedCard.innerHTML;
          draggedCard.innerHTML = tempHTML;
        }
      });
    });
  }

  // Button: “Check the Pizzas!” (Level 2 and 3 only)
  checkPizzasButton.addEventListener("click", () => {
    if (level === 2 || level === 3) {
      // Reveal the pizza backgrounds in all cards
      const cards = document.querySelectorAll(".fraction-card");
      cards.forEach(card => {
        const fractionStr = card.querySelector(".fraction-label").textContent;
        const pizzaEl = card.querySelector(".pizza");
        setPizzaBackground(pizzaEl, fractionStr);
      });
    }
  });

  // Button: “Check the Answers”
  checkAnswersButton.addEventListener("click", () => {
    checkOrder();
  });

  // Button: “Reset”
  resetButton.addEventListener("click", () => {
    message.textContent = "";
    startGame();
  });

  // Checking the user’s order
  function checkOrder() {
    const cards = [...document.querySelectorAll(".fraction-card")];
    const userOrder = cards.map(card =>
      card.querySelector(".fraction-label").textContent
    );

    // Sort fractions by numeric value
    const correctOrder = [...fractions].sort(
      (a, b) => fractionValue(a) - fractionValue(b)
    );

    // Check for non-decreasing order
    let isNonDecreasing = true;
    for (let i = 0; i < userOrder.length - 1; i++) {
      if (fractionValue(userOrder[i]) > fractionValue(userOrder[i + 1])) {
        isNonDecreasing = false;
        break;
      }
    }

    // Display result
    if (isNonDecreasing) {
      message.textContent = "Correct! Nice job ordering the fractions.";
      message.style.color = "green";
    } else {
      message.textContent = "Not quite. Try rearranging them again!";
      message.style.color = "red";
    }
  }

  // Convert "2/5" -> 2/5 = 0.4
  function fractionValue(fr) {
    const [num, den] = fr.split("/").map(Number);
    return num / den;
  }
});
