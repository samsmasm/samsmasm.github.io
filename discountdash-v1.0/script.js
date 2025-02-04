// List of available products with typical prices and emojis
const productsList = [
  { name: "Milk, 2l", emoji: "🥛", price: 5.00 },
  { name: "Bread, loaf", emoji: "🍞", price: 3.50 },
  { name: "Eggs, dozen", emoji: "🥚", price: 6.00 },
  { name: "Cheese, 500g", emoji: "🧀", price: 7.50 },
  { name: "Apples, 1kg", emoji: "🍎", price: 4.50 },
  { name: "Bananas, 1kg", emoji: "🍌", price: 4.00 },
  { name: "Tomatoes, 1kg", emoji: "🍅", price: 4.20 },
  { name: "Chicken, whole", emoji: "🍗", price: 12.00 },
  { name: "Coffee, 250g", emoji: "☕", price: 8.00 },
  { name: "Yogurt, pack", emoji: "🥣", price: 4.00 }
];

const numRounds = 6;
let currentRound = 1;
let roundStartTime;
let totalTimeTaken = 0; // in seconds
let totalSavings = 0;   // net savings (money saved - money overpaid)

// New global variables to track savings and overpaid separately:
let totalMoneySaved = 0;
let totalMoneyOverpaid = 0;

// Elements
const samTableBody = document.querySelector("#sam-table tbody");
const miltonTableBody = document.querySelector("#milton-table tbody");
const roundInfo = document.getElementById("round-info");
const timerDisplay = document.getElementById("timer");
const feedbackDiv = document.getElementById("feedback");
const finalResultsDiv = document.getElementById("final-results");

const chooseSamButton = document.getElementById("choose-sam");
const chooseMiltonButton = document.getElementById("choose-milton");

// Timer variables
let timerInterval;

// Utility function to get a random number within a range
function getRandom(min, max) {
  return Math.random() * (max - min) + min;
}

// Generate a basket for one round (3 products instead of 5)
function generateBasket() {
  const basket = [];
  const productsCopy = [...productsList];
  for (let i = 0; i < 3; i++) {
    const index = Math.floor(Math.random() * productsCopy.length);
    basket.push(productsCopy.splice(index, 1)[0]);
  }
  return basket;
}

// For each supermarket, generate a price list based on the basket
// For each shop, 2 of the 3 products will have a discount.
function generateShopPrices(basket) {
  const entries = [];
  // Randomly pick 2 indices for discount.
  const discountIndices = [];
  while (discountIndices.length < 2) {
    let idx = Math.floor(Math.random() * basket.length);
    if (!discountIndices.includes(idx)) {
      discountIndices.push(idx);
    }
  }
  basket.forEach((product, idx) => {
    // Base price modified slightly (+/- 5%)
    let modifiedPrice = product.price * getRandom(0.95, 1.05);
    modifiedPrice = parseFloat(modifiedPrice.toFixed(2));

    let discount = 0;
    let finalPrice = modifiedPrice;
    if (discountIndices.includes(idx)) {
      // Choose a discount percentage: 10%, 15% or 20%
      discount = [10, 15, 20][Math.floor(Math.random() * 3)];
      finalPrice = modifiedPrice * (1 - discount / 100);
      finalPrice = parseFloat(finalPrice.toFixed(2));
    }
    entries.push({
      name: product.name,
      emoji: product.emoji,
      originalPrice: modifiedPrice,
      discount,
      finalPrice
    });
  });
  return entries;
}

// Render a shop's products into its table body
function renderShop(tableBody, shopEntries) {
  tableBody.innerHTML = "";
  shopEntries.forEach(entry => {
    const tr = document.createElement("tr");
    // Product cell with emoji and name
    const productTd = document.createElement("td");
    productTd.textContent = `${entry.emoji} ${entry.name}`;
    tr.appendChild(productTd);

    // Price cell: if discount, show original price and discount note only.
    const priceTd = document.createElement("td");
    if (entry.discount > 0) {
      priceTd.innerHTML = `\$${entry.originalPrice.toFixed(2)}<br>(${entry.discount}% off)`;
    } else {
      priceTd.textContent = `\$${entry.originalPrice.toFixed(2)}`;
    }
    tr.appendChild(priceTd);
    tableBody.appendChild(tr);
  });
}

// Start the timer for a round
function startTimer() {
  roundStartTime = Date.now();
  timerDisplay.textContent = "Time: 0s";
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - roundStartTime) / 1000);
    timerDisplay.textContent = `Time: ${elapsed}s`;
  }, 1000);
}

// Stop the timer and return time taken in seconds
function stopTimer() {
  clearInterval(timerInterval);
  return Math.floor((Date.now() - roundStartTime) / 1000);
}

// Data for the current round
let currentBasket, samEntries, miltonEntries;

// Initialize a new round
function initRound() {
  feedbackDiv.textContent = "";
  roundInfo.textContent = `Round: ${currentRound} / ${numRounds}`;
  // Generate a basket and then generate prices for each shop
  currentBasket = generateBasket();
  samEntries = generateShopPrices(currentBasket);
  miltonEntries = generateShopPrices(currentBasket);

  // Render both tables
  renderShop(samTableBody, samEntries);
  renderShop(miltonTableBody, miltonEntries);

  // Start timer
  startTimer();
}

// Calculate total cost of a shop’s basket using finalPrice (with discount applied)
function calcTotal(entries) {
  return entries.reduce((sum, entry) => sum + entry.finalPrice, 0);
}

// Handle student’s choice
function handleChoice(chosenShop) {
  const timeTaken = stopTimer();
  let chosenTotal, otherTotal;
  if (chosenShop === "sam") {
    chosenTotal = calcTotal(samEntries);
    otherTotal = calcTotal(miltonEntries);
  } else {
    chosenTotal = calcTotal(miltonEntries);
    otherTotal = calcTotal(samEntries);
  }
  const diff = parseFloat((otherTotal - chosenTotal).toFixed(2)); // positive means money saved

  totalTimeTaken += timeTaken;
  totalSavings += diff;

  // Update separate savings tracking:
  if (diff > 0) {
    totalMoneySaved += diff;
  } else if (diff < 0) {
    totalMoneyOverpaid += Math.abs(diff);
  }

  // Provide feedback:
  let feedbackMsg = `⏱ You took ${timeTaken} second${timeTaken !== 1 ? "s" : ""}. `;
  if (diff > 0) {
    feedbackMsg += `💰 You saved \$${diff.toFixed(2)} this round!`;
  } else if (diff < 0) {
    feedbackMsg += `⚠️ You overpaid by \$${Math.abs(diff).toFixed(2)} this round.`;
  } else {
    feedbackMsg += `👌 It was a tie.`;
  }
  feedbackDiv.textContent = feedbackMsg;

  // If rounds remain, move to next round after a short delay; otherwise, show final results.
  if (currentRound < numRounds) {
    currentRound++;
    setTimeout(initRound, 2000);
  } else {
    setTimeout(showFinalResults, 2000);
  }
}

// Display final overall score using logarithmic scaling and replace the table with overall results
function showFinalResults() {
  // Hide game controls and tables
  document.getElementById("tables-container").classList.add("hidden");
  document.getElementById("controls").classList.add("hidden");
  roundInfo.classList.add("hidden");
  timerDisplay.classList.add("hidden");
  feedbackDiv.classList.add("hidden");

  // Logarithmic weighted score calculation
  const weightMoney = 10;
  const weightTime = 1;

  let moneyScore = totalSavings >= 0 
    ? Math.log(totalSavings + 1) 
    : -Math.log(Math.abs(totalSavings) + 1);
  let timeScore = Math.log(totalTimeTaken + 1);
  const finalScore = ((weightMoney * moneyScore) - (weightTime * timeScore));

  // Replace the table with overall results
  finalResultsDiv.innerHTML = `
    <h2>Overall Results</h2>
    <p>Total Money Overpaid: \$${totalMoneyOverpaid.toFixed(2)}</p>
    <p>Total Money Saved: \$${totalMoneySaved.toFixed(2)}</p>
    <p>Net Savings: \$${totalSavings.toFixed(2)}</p>
    <p>Total Time Taken: ${totalTimeTaken} second${totalTimeTaken !== 1 ? "s" : ""}</p>
    <p>Final Weighted Score: ${finalScore.toFixed(2)}</p>
    <button id="restart">Play Again</button>
  `;

  finalResultsDiv.classList.remove("hidden");

  // Add event listener to restart button
  document.getElementById("restart").addEventListener("click", () => location.reload());
}

// Event listeners for buttons
chooseSamButton.addEventListener("click", () => handleChoice("sam"));
chooseMiltonButton.addEventListener("click", () => handleChoice("milton"));

// Start first round when page loads
initRound();
