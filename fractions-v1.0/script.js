window.addEventListener("load", () => {
  // 1) We define a function to get random fractions
  //    where denominator is between 2 and 6 and
  //    numerator <= denominator.
  function getRandomFractions(count) {
    const fractionsSet = new Set();
    while (fractionsSet.size < count) {
      const den = Math.floor(Math.random() * 5) + 2; // 2..6
      const num = Math.floor(Math.random() * den) + 1; // 1..den
      fractionsSet.add(`${num}/${den}`);
    }
    return [...fractionsSet];
  }

  // We'll store our fractions and current shuffled order here
  let fractions = [];
  let currentOrder = [];

  // DOM elements
  const startButton = document.getElementById("startButton");
  const gameBoard = document.getElementById("gameBoard");
  const fractionCards = document.getElementById("fractionCards");
  const checkButton = document.getElementById("checkButton");
  const resetButton = document.getElementById("resetButton");
  const message = document.getElementById("message");

  // Show the game board when "Start Game" is clicked
  startButton.addEventListener("click", () => {
    gameBoard.classList.remove("hidden");
    startGame();
  });

  checkButton.addEventListener("click", () => {
    checkOrder();
  });

  resetButton.addEventListener("click", () => {
    startGame();
    message.textContent = "";
  });

  // 2) Start or restart the game with new random fractions
  function startGame() {
    fractionCards.innerHTML = ""; // Clear any existing cards

    // Choose how many fractions you want:
    const fractionCount = 5;
    fractions = getRandomFractions(fractionCount);

    // Shuffle them
    currentOrder = shuffleArray([...fractions]);

    // Create fraction cards
    currentOrder.forEach(fr => {
      const card = document.createElement("div");
      card.classList.add("fraction-card");
      card.draggable = true;

      // Create the “pizza” element
      const pizza = document.createElement("div");
      pizza.classList.add("pizza");

      // Parse fraction
      const [num, den] = fr.split("/").map(Number);
      const fractionVal = num / den; // e.g. 2/5 => 0.4

      // Two-layered background:
      // 1) fraction coloring
      // 2) black boundary lines repeated every (360/den) degrees
      pizza.style.background = `
        conic-gradient(
          rgba(255, 255, 0, 0.8) 0% ${fractionVal * 100}%,
          rgba(128, 128, 128, 0.8) ${fractionVal * 100}% 100%
        ),
        repeating-conic-gradient(
          black 0deg 3deg,
          white 3deg ${360 / den}deg
        )
      `;

      // Label for fraction text
      const label = document.createElement("div");
      label.classList.add("fraction-label");
      label.textContent = fr;

      card.appendChild(pizza);
      card.appendChild(label);
      fractionCards.appendChild(card);
    });

    initDragAndDrop();
  }

  // 3) Simple Fisher-Yates shuffle
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // 4) Drag-and-drop logic
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

  // 5) Check if the current card order is correct
  function checkOrder() {
  // Get the user’s fraction labels in order
    const cards = [...document.querySelectorAll(".fraction-card")];
    const userOrder = cards.map(card => 
      card.querySelector(".fraction-label").textContent
    );

    // Check each consecutive pair to ensure the sequence never decreases
    let isNonDecreasing = true;
    for (let i = 0; i < userOrder.length - 1; i++) {
      if (fractionValue(userOrder[i]) > fractionValue(userOrder[i + 1])) {
        isNonDecreasing = false;
        break;
      }
    }

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

  // Check if two arrays match exactly
  function arraysMatch(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((val, idx) => val === arr2[idx]);
  }
});
