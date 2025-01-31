// game.js

// Element Selections
const questionElement = document.getElementById('question');
const optionsContainer = document.getElementById('options');
const scoreElement = document.getElementById('score');
const mouseElement = document.getElementById('mouse');
const collectedCookiesContainer = document.getElementById('collected-cookies');
const jarElement = document.getElementById('jar');

let score = 0;

// Function to Generate Questions
function generateQuestion() {
    const num1 = Math.floor(Math.random() * 10);
    const num2 = Math.floor(Math.random() * 10);
    const correctAnswer = num1 + num2;

    questionElement.textContent = `What is ${num1} + ${num2}?`;
    optionsContainer.innerHTML = '';

    // Generate Answer Options
    let answers = [correctAnswer];

    // Generate two unique distractors
    while (answers.length < 3) {
        let distractor = correctAnswer + Math.floor(Math.random() * 5) - 2; // Range: correctAnswer-2 to correctAnswer+2
        if (distractor !== correctAnswer && distractor >= 0 && !answers.includes(distractor)) {
            answers.push(distractor);
        }
    }

    // Shuffle Answers
    answers = answers.sort(() => Math.random() - 0.5);

    // Create Option Elements with Numbers
    answers.forEach(answer => {
        const optionContainer = document.createElement('div');
        optionContainer.classList.add('option-container');

        const img = document.createElement('img');
        img.src = 'images/2.jpg'; // Cookie Image
        img.alt = 'Cookie';
        img.classList.add('option');

        const number = document.createElement('span');
        number.classList.add('option-number');
        number.textContent = answer;

        optionContainer.appendChild(img);
        optionContainer.appendChild(number);

        optionContainer.addEventListener('click', () => checkAnswer(answer, correctAnswer, optionContainer));

        optionsContainer.appendChild(optionContainer);
    });
}

// Function to Check Answers
function checkAnswer(selected, correct, optionElement) {
    if (selected === correct) {
        score++;
        updateScore();

        // Animate the correct cookie moving to the stack
        animateCookieToStack(optionElement);
    } else {
        // Change image to broken cookie
        const img = optionElement.querySelector('.option');
        img.src = 'images/3.jpg'; // Broken Cookie Image

        // Optional: Add shake animation or other feedback
    }

    // Disable further clicks on options
    const allOptions = document.querySelectorAll('.option-container');
    allOptions.forEach(option => option.style.pointerEvents = 'none');

    setTimeout(() => {
        if (score >= 10) {
            // Transform the stack into the cookie jar
            transformStackToJar();

            // Reset the game after user clicks OK on the popup
            score = 0;
            updateScore();
            collectedCookiesContainer.innerHTML = ''; // Clear collected cookies
        }
        generateQuestion();
    }, 1000);
}

// Function to Update Score Display
function updateScore() {
    scoreElement.textContent = `Cookies Collected: ${score}`;
}

// Function to Animate Cookie to Collected Stack
function animateCookieToStack(optionElement) {
    const img = document.createElement('img');
    img.src = 'images/5.jpg'; // Collected Cookie Image
    img.alt = 'Collected Cookie';
    img.classList.add('collected-cookie');

    // Append the collected cookie to the stack
    collectedCookiesContainer.appendChild(img);

    // Optional: Add a brief animation (e.g., fade-in)
    img.style.opacity = 0;
    setTimeout(() => {
        img.style.transition = 'opacity 0.5s';
        img.style.opacity = 1;
    }, 100);
}

// Function to Transform Collected Cookies Stack into Cookie Jar
function transformStackToJar() {
    // Animate the jar (e.g., jump)
    jarElement.style.animation = 'jump 0.5s';

    // Show congratulatory popup
    setTimeout(() => {
        alert("Congratulations! You filled the jar! 🎉");

        // Optionally, reset the jar image or other elements here
        // For example, if you have a different image for the full jar:
        // jarElement.src = 'images/full_cookie_jar.jpg';
    }, 500);
}

// Initialize the Game when the Window Loads
window.onload = generateQuestion;
