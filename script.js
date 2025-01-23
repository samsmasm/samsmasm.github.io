// Binary digits and target number
let binaryDigits = Array(8).fill(0);
let targetNumber = generateTarget();
let messageTimeout = null;

// Generate a random target number (0-255)
function generateTarget() {
  return Math.floor(Math.random() * 256);
}

// Convert binary array to decimal
function binaryToDecimal(binaryArray) {
  return binaryArray.reduce((sum, bit, index) => sum + bit * Math.pow(2, 7 - index), 0);
}

// Update the display
function updateDisplay() {
  const currentNumber = binaryToDecimal(binaryDigits);
  document.getElementById("current-number").textContent = currentNumber;
  document.getElementById("target-number").textContent = targetNumber;

  // Check if the current number matches the target
  if (currentNumber === targetNumber) {
    document.getElementById("message").textContent = `Nice! ${targetNumber} in binary is ${binaryDigits.join("")}.`;

    // Reset after 3 seconds
    clearTimeout(messageTimeout);
    messageTimeout = setTimeout(() => {
      targetNumber = generateTarget();
      binaryDigits.fill(0); // Reset all boxes to 0
      updateDisplay();
      document.getElementById("message").textContent = "";
    }, 3000);
  }
}

// Toggle a binary digit
function toggleDigit(index) {
  binaryDigits[index] = binaryDigits[index] === 0 ? 1 : 0;
  updateBinaryButtons();
  updateDisplay();
}

// Update binary buttons
function updateBinaryButtons() {
  const container = document.getElementById("binary-boxes");
  container.innerHTML = ""; // Clear existing buttons
  binaryDigits.forEach((bit, index) => {
    const button = document.createElement("button");
    button.className = `binary-button ${bit === 1 ? "active" : ""}`;
    button.textContent = bit;
    button.addEventListener("click", () => toggleDigit(index));
    container.appendChild(button);

    // Add the base-10 value below the button
    const base10Value = document.createElement("div");
    base10Value.textContent = Math.pow(2, 7 - index); // 128, 64, 32, ...
    base10Value.style.fontSize = "14px";
    base10Value.style.marginTop = "5px";
    container.appendChild(base10Value);
  });
}

// Initialize game
function initGame() {
  updateBinaryButtons();
  updateDisplay();
}

// Start the game
initGame();
