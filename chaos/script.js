document.addEventListener("DOMContentLoaded", function () {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    let points = [];
    let running = false;

    function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        points = [];
        running = false;
    }

    canvas.addEventListener("click", function (event) {
        if (running) return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const selectedColor = document.getElementById("colorPicker").value;

        points.push({ x, y, color: selectedColor });

        ctx.fillStyle = selectedColor;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
    });

    function startChaosGame() {
        if (points.length < 3) {
            alert("Please place at least three points!");
            return;
        }

        running = true;
        let currentPoint = points[Math.floor(Math.random() * points.length)];
        const iterations = parseInt(document.getElementById("iterations").value);
        const colorPoints = document.getElementById("colorPoints").checked;
        const drawTraces = document.getElementById("drawTraces").checked;

        for (let i = 0; i < iterations; i++) {
            let target = points[Math.floor(Math.random() * points.length)];
            let newX = (currentPoint.x + target.x) / 2;
            let newY = (currentPoint.y + target.y) / 2;

            if (drawTraces) {
                ctx.strokeStyle = "gray";
                ctx.beginPath();
                ctx.moveTo(currentPoint.x, currentPoint.y);
                ctx.lineTo(newX, newY);
                ctx.stroke();
            }

            ctx.fillStyle = colorPoints ? target.color : "black";
            ctx.fillRect(newX, newY, 1, 1);

            currentPoint = { x: newX, y: newY };
        }
    }

    document.getElementById("startButton").addEventListener("click", startChaosGame);
    document.getElementById("resetButton").addEventListener("click", clearCanvas);
});
