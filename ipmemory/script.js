const emojis = ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼"]; // 8 pairs
const gameGrid = document.querySelector(".game-grid");
const timerDisplay = document.querySelector(".timer");
const restartBtn = document.querySelector(".restart-btn");

let cards = [];
let flippedCards = [];
let matchedCards = [];
let time = 0;
let timer;

// Duplicate emojis to create pairs
const emojiPairs = [...emojis, ...emojis];

// Shuffle emojis
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Create cards
function createCards() {
  shuffle(emojiPairs);
  gameGrid.innerHTML = "";
  emojiPairs.forEach((emoji, index) => {
    const card = document.createElement("div");
    card.classList.add("card");
    card.dataset.index = index;

    const emojiSpan = document.createElement("span");
    emojiSpan.classList.add("emoji");
    emojiSpan.textContent = emoji;
    card.appendChild(emojiSpan);

    card.addEventListener("click", flipCard);
    gameGrid.appendChild(card);
    cards.push(card);
  });
}

// Flip card
function flipCard() {
  if (flippedCards.length < 2 && !this.classList.contains("flipped")) {
    this.classList.add("flipped");
    flippedCards.push(this);

    if (flippedCards.length === 2) {
      checkMatch();
    }
  }
}

// Check for a match
function checkMatch() {
  const [card1, card2] = flippedCards;
  if (card1.querySelector(".emoji").textContent === card2.querySelector(".emoji").textContent) {
    card1.classList.add("matched");
    card2.classList.add("matched");
    matchedCards.push(card1, card2);

    if (matchedCards.length === cards.length) {
      clearInterval(timer);
      setTimeout(() => alert("You win!"), 500);
    }
  } else {
    setTimeout(() => {
      card1.classList.remove("flipped");
      card2.classList.remove("flipped");
    }, 1000);
  }
  flippedCards = [];
}

// Start timer
function startTimer() {
  timer = setInterval(() => {
    time++;
    const minutes = Math.floor(time / 60).toString().padStart(2, "0");
    const seconds = (time % 60).toString().padStart(2, "0");
    timerDisplay.textContent = `Time: ${minutes}:${seconds}`;
  }, 1000);
}

// Restart game
function restartGame() {
  clearInterval(timer);
  time = 0;
  timerDisplay.textContent = "Time: 00:00";
  flippedCards = [];
  matchedCards = [];
  cards = [];
  createCards();
  startTimer();
}

// Initialize game
function init() {
  createCards();
  startTimer();
}

restartBtn.addEventListener("click", restartGame);
init();