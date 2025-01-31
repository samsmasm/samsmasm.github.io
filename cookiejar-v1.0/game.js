let score = 0;
let correctAnswer; // Store current correct answer

// Modified operations array with answers
const operations = [
    { num1: 2, num2: 3, answer: 5 },
    { num1: 5, num2: 4, answer: 9 },
    // Add more problems
];

function generateProblem() {
    const current = operations[0]; // Get first problem
    correctAnswer = current.answer; // Store correct answer
    document.getElementById('problem').textContent = 
        `${current.num1} + ${current.num2} = ?`;
    createOptions(current.answer);
}

function createOptions(correct) {
    const optionsContainer = document.getElementById('options');
    optionsContainer.innerHTML = '';
    
    // Generate random options including correct answer
    const options = [correct];
    while(options.length < 3) {
        const randomNum = correct + Math.floor(Math.random() * 5) - 2;
        if(!options.includes(randomNum) && randomNum > 0) options.push(randomNum);
    }

    options.sort(() => Math.random() - 0.5).forEach(num => {
        const container = document.createElement('div');
        container.className = 'cookie-container';
        container.dataset.value = num;
        
        const cookie = document.createElement('img');
        cookie.src = 'images/2.jpg';
        cookie.className = 'cookie-option';
        
        const number = document.createElement('div');
        number.className = 'cookie-number';
        number.textContent = num;

        container.appendChild(cookie);
        container.appendChild(number);
        container.addEventListener('click', checkAnswer);
        optionsContainer.appendChild(container);
    });
}

function checkAnswer(e) {
    const container = e.currentTarget;
    const selectedValue = parseInt(container.dataset.value);
    
    // Disable further clicks during animation
    container.style.pointerEvents = 'none';

    if(selectedValue === correctAnswer) {
        score++;
        document.getElementById('score').textContent = `Cookies: ${score}/10`;
        
        // Animate cookie to jar
        const clonedCookie = container.cloneNode(true);
        clonedCookie.style.position = 'absolute';
        clonedCookie.style.left = `${container.offsetLeft}px`;
        clonedCookie.style.top = `${container.offsetTop}px`;
        document.body.appendChild(clonedCookie);
        
        // Animation logic
        const jarPosition = document.getElementById('jar').getBoundingClientRect();
        anime({
            targets: clonedCookie,
            left: jarPosition.left + 50,
            top: jarPosition.top + 30,
            scale: 0.5,
            duration: 1000,
            easing: 'easeOutQuad',
            complete: () => clonedCookie.remove()
        });
    } else {
        // Wrong answer handling
        container.querySelector('img').src = 'images/3.jpg';
        anime({
            targets: container,
            scale: 0.8,
            duration: 500,
            easing: 'easeInOutQuad'
        });
    }

    // Prepare next problem after delay
    setTimeout(() => {
        operations.shift(); // Remove answered question
        if(operations.length > 0) {
            generateProblem();
        } else {
            alert('Great job! You collected all cookies! 🎉');
        }
    }, 1500);
}

// Initialize game
generateProblem();