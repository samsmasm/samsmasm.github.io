// ----- Utility Functions -----
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

// ----- Puzzle Generators -----

// Puzzle 1: Stone Wall Simplification Puzzle
function generateSimplifyPuzzle() {
  let a = getRandomInt(5, 30);
  let b = getRandomInt(5, 30);
  let d = gcd(a, b);
  let simpleA = a / d;
  let simpleB = b / d;
  
  return {
    type: "simplify",
    ascii: `
   .-^-.
  /_/_\\_\\
  |     |    On a moss-covered stone wall,
  | ${a}:${b} |    ancient runes glow,
  |     |    murmuring: "Reveal the simplest truth..."
  '-.-.-'
    `,
    questionText: `In the Hall of Beginnings, the wall presents the ratio ${a}:${b}. Simplify it (format x:y) to calm the restless spirits.`,
    answer: `${simpleA}:${simpleB}`,
    example: `Example: Simplify 8:12 → 2:3`
  };
}

// Puzzle 2: Claire's Challenge from the Living Tattoos
function generateClaireChallengePuzzle() {
  let x = getRandomInt(3, 20);
  let y = getRandomInt(3, 20);
  let d = gcd(x, y);
  let simpX = x / d;
  let simpY = y / d;
  
  return {
    type: "claire",
    ascii: `
     .----------.
    |  *  *  *  |
    |  * Claire's *   Suddenly, from the flickering shadows,
    |  Living     |   the tattoos on Principal Claire's arms
    |  Tattoos    |   stir and whisper a secret ratio:
    '----------'
       ${x}:${y}
    `,
    questionText: `Her animated tattoos intone: "Simplify the ratio ${x}:${y} to unlock my hidden lore." Enter your answer in x:y format.`,
    answer: `${simpX}:${simpY}`,
    example: `Example: Simplify 12:16 → 3:4`
  };
}

// Puzzle 3: The Recipe Puzzle in the Haunted Kitchen
function generateRecipePuzzle() {
  // Vary the amount of flour between 50g and 150g.
  let flour = getRandomInt(50, 150);
  // Recipe ratio: flour : sugar : egg : butter = 7 : 6 : 5 : 8
  // Flour is 7 parts.
  let partWeight = flour / 7;
  let totalCakeWeight = Math.round(partWeight * 26); // 26 total parts, rounded
  return {
    type: "recipe",
    ascii: `
         ___________
        |  _______  | 
        | |       | |   In the ghostly kitchen,
        | | ${flour}g | |   a tattered chalkboard proclaims:
        | | Flour | |   "Bake the cake of salvation,
        | |_______| |    to appease the ancient hunger."
        |___________|  
    `,
    questionText: `With only ${flour}g of flour (representing 7 parts) available, and the mystical recipe ratio of 7:6:5:8, determine the total weight of the cake (26 parts total). Enter the weight as a whole number of grams.`,
    answer: totalCakeWeight.toString(),
    example: `Example: If flour is 100g then one part = 14.29g and total ≈ 371g (rounded).`
  };
}

// Puzzle 4: The Haunted Car Park Conundrum
function generateCarParkPuzzle() {
  // Generate ratio: parked cars (X) to empty spots (Y)
  let X = getRandomInt(2, 10);
  let Y = getRandomInt(2, 10);
  // Let the number of empty spots be Y multiplied by a random factor.
  let factor = getRandomInt(2, 5);
  let emptySpots = Y * factor;
  // Then parked cars = X * (emptySpots / Y)
  let parkedCars = X * (emptySpots / Y);
  parkedCars = Math.round(parkedCars);
  
  return {
    type: "carpark",
    ascii: `
    .====================.
    |   Car Park of Doom  |
    |  Level of Shadows   |
    |                    |
    |  [Parked : Empty]   |
    |      ${X}:${Y}       |
    '===================='
    `,
    questionText: `In the haunted car park, the ratio of parked cars to empty spots is ${X}:${Y}. If there are ${emptySpots} empty spots, how many parked cars lurk among them? Provide your answer as a whole number.`,
    answer: parkedCars.toString(),
    example: `Example: If ratio is 3:2 and there are 10 empty spots (2×5), then parked cars = 3×5 = 15.`
  };
}

// Puzzle 5: The Final Escape Puzzle – The Key of Proportions
function generateFinalPuzzle() {
  // Generate a random integer between 50 and 150 as the sum value, paired with 100.
  let A = getRandomInt(50, 150);
  let B = 100;
  let d = gcd(A, B);
  let simpA = A / d;
  let simpB = B / d;
  
  return {
    type: "final",
    ascii: `
     .********************************.
    |    The Final Door of Ratios     |
    |  Inscribed with a key formula:  |
    |         ${A}:${B}              |
    '********************************'
    `,
    questionText: `Before you, the ancient door bears the ratio ${A}:${B}. Express this ratio in its simplest form to forge the key that unlocks your escape. Enter your answer in x:y format.`,
    answer: `${simpA}:${simpB}`,
    example: `Example: Simplify 120:100 → 6:5`
  };
}

// ----- Puzzle State & Narrative Flow -----
const puzzles = [
  generateSimplifyPuzzle,
  generateClaireChallengePuzzle,
  generateRecipePuzzle,
  generateCarParkPuzzle,
  generateFinalPuzzle
];

let currentPuzzleIndex = 0;
let currentPuzzle = null;
let spellsLeft = 2; // Magic wand bypass spells

const narrativeEl = document.getElementById("narrative");
const feedbackEl = document.getElementById("feedback");
const answerInput = document.getElementById("answer");
const spellsLeftEl = document.getElementById("spellsLeft");

// ----- Narrative Display Functions -----
function showNarrative(text) {
  narrativeEl.textContent = text;
}

function loadNextPuzzle() {
  if (currentPuzzleIndex < puzzles.length) {
    currentPuzzle = puzzles[currentPuzzleIndex]();
    currentPuzzleIndex++;
    showNarrative(
      currentPuzzle.ascii + "\n\n" + currentPuzzle.questionText
    );
    feedbackEl.textContent = "";
    answerInput.value = "";
    // Ensure input and magic sections are visible during puzzles.
    document.getElementById("inputSection").classList.remove("hidden");
    document.getElementById("magic").classList.remove("hidden");
  } else {
    // End of puzzles – show epilogue.
    showNarrative(`
  .***********************************.
  |        THE DOOR IS UNLOCKED       |
  |  You have vanquished the terrors  |
  | of the accursed ratios and freed   |
  |   Albany Senior High from the curse.  |
  '***********************************'

  Principal Claire, on her roller skates, glides forward as her living tattoos finally rest.
  The darkness recedes, and the once-haunted spaces brighten.
  You have proven your mastery over the arcane proportions.
  
  Congratulations, brave soul!
    `);
    document.getElementById("inputSection").classList.add("hidden");
    document.getElementById("magic").classList.add("hidden");
  }
}

// ----- Answer Checking -----
function checkAnswer() {
  let userAnswer = answerInput.value.trim();
  if (userAnswer === currentPuzzle.answer) {
    feedbackEl.textContent = "✅ Correct! The ancient forces nod in approval.";
    setTimeout(loadNextPuzzle, 1500);
  } else {
    feedbackEl.textContent = `❌ Wrong answer. The darkness whispers: "${currentPuzzle.example}"`;
  }
}

// ----- Magic Spell (Bypass) -----
function useSpell() {
  if (spellsLeft > 0) {
    spellsLeft--;
    spellsLeftEl.textContent = spellsLeft;
    feedbackEl.textContent = "✨ With a flash, the magic wand erases the puzzle... You move on through the veil.";
    setTimeout(loadNextPuzzle, 1000);
  } else {
    feedbackEl.textContent = "⚠️ No spells remain! The puzzle's challenge cannot be evaded.";
  }
}

// ----- Event Listeners -----
document.getElementById("submit").addEventListener("click", checkAnswer);
document.getElementById("spell1").addEventListener("click", useSpell);

// ----- Start the Game Manually -----
function startGame() {
  // Hide the start button and show input/magic sections.
  document.getElementById("startSection").classList.add("hidden");
  document.getElementById("inputSection").classList.remove("hidden");
  document.getElementById("magic").classList.remove("hidden");

  showNarrative(`
  *************************************************************
  *  You awaken in a darkness that chills your very soul...   *
  *************************************************************

  In an unearthly silence, you find yourself lying on cold, hard floors
  of Albany Senior High School—an institution you once knew well.
  Yet now, the familiar open learning spaces and vast, multi-level car parks
  have become the stage of a nightmarish vision.

  From the shadows, a spectral figure glides. Principal Claire appears,
  dazzling in her attire and poised on roller skates. But it is her arms,
  where tattoos twist and writhe like living symbols, that speak in an eerie chorus:
  
  "Only by mastering the sacred ratios may you banish these horrors and reclaim your world."
  
  A low, disembodied voice echoes through the empty space, urging you to begin.
  
  When you are ready to face the first trial, press the 'Submit Answer' button.
  `);
  
  // Load the first puzzle only after the user reads and clicks "Submit Answer" (they will use the input field).
  setTimeout(loadNextPuzzle, 0); // Immediately load after starting
}

// Start button event listener:
document.getElementById("begin").addEventListener("click", startGame);
