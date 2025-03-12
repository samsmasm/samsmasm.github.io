const cat = document.getElementById("cat");
const gameContainer = document.getElementById("game-container");
const scoreDisplay = document.getElementById("score");

let catSize = 40;
let catSpeed = 15;
let catX = 50;
let catY = gameContainer.clientHeight / 2 - catSize / 2;
let isPopped = false;
let miceEaten = 0;

// Update cat position
function updateCatPosition() {
    cat.style.left = `${catX}px`;
    cat.style.top = `${catY}px`;
}

// Move the cat in all directions
document.addEventListener("keydown", (event) => {
    if (isPopped) return; // Prevent movement during explosion

    if (event.code === "ArrowUp" && catY > 0) {
        catY -= catSpeed;
    } else if (event.code === "ArrowDown" && catY < gameContainer.clientHeight - catSize) {
        catY += catSpeed;
    } else if (event.code === "ArrowLeft" && catX > 0) {
        catX -= catSpeed;
    } else if (event.code === "ArrowRight" && catX < gameContainer.clientWidth - catSize) {
        catX += catSpeed;
    }
    updateCatPosition();
});

// Spawn mice
function spawnMouse() {
    if (isPopped) return;

    const mouse = document.createElement("div");
    mouse.textContent = "🐭";
    mouse.classList.add("mouse");
    mouse.style.top = `${Math.random() * (gameContainer.clientHeight - 30)}px`;
    gameContainer.appendChild(mouse);

    let moveInterval = setInterval(() => {
        let catRect = cat.getBoundingClientRect();
        let mouseRect = mouse.getBoundingClientRect();

        if (
            catRect.right > mouseRect.left &&
            catRect.left < mouseRect.right &&
            catRect.bottom > mouseRect.top &&
            catRect.top < mouseRect.bottom
        ) {
            eatMouse(mouse);
            clearInterval(moveInterval);
        }
    }, 20);

    setTimeout(() => {
        mouse.remove();
    }, 5000);

    setTimeout(spawnMouse, Math.random() * 1500 + 800);
}

// Eat mouse and grow
function eatMouse(mouse) {
    mouse.remove();
    miceEaten++;
    scoreDisplay.textContent = `Mice Eaten: ${miceEaten}`;
    
    catSize += 5;
    cat.style.fontSize = `${catSize}px`;

    if (catSize > 120) {
        popCat();
    }
}

// Cat pops, mice scatter
function popCat() {
    isPopped = true;
    cat.textContent = "💥";

    let mice = [];
    
    for (let i = 0; i < miceEaten; i++) {
        let escapedMouse = document.createElement("div");
        escapedMouse.textContent = "🐭";
        escapedMouse.classList.add("mouse");
        escapedMouse.style.top = `${Math.random() * (gameContainer.clientHeight - 30)}px`;
        escapedMouse.style.left = `${Math.random() * (gameContainer.clientWidth - 30)}px`;
        gameContainer.appendChild(escapedMouse);

        let speed = Math.random() * 2 + 1;
        let angle = Math.random() * 360;
        let moveInterval = setInterval(() => {
            let dx = speed * Math.cos(angle);
            let dy = speed * Math.sin(angle);
            escapedMouse.style.transform = `translate(${dx}px, ${dy}px)`;
        }, 30);

        mice.push({ element: escapedMouse, interval: moveInterval });
    }

    setTimeout(() => {
        mice.forEach(mouse => {
            clearInterval(mouse.interval);
            mouse.element.remove();
        });
        resetGame();
    }, 2000);
}

// Reset game after explosion
function resetGame() {
    isPopped = false;
    cat.textContent = "🐱";
    catSize = 40;
    cat.style.fontSize = `${catSize}px`;
    catX = 50;
    catY = gameContainer.clientHeight / 2 - catSize / 2;
    updateCatPosition();
    miceEaten = 0;
    scoreDisplay.textContent = `Mice Eaten: ${miceEaten}`;
    spawnMouse();
}

// Start game
spawnMouse();
updateCatPosition();
