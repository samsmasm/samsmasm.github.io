const canvas = document.getElementById('phylloCanvas');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - document.querySelector('.controls').offsetHeight - 20;
}
window.addEventListener('resize', resize);
resize();

function parseInput(val) {
  if (val.includes('/')) {
    const [num, den] = val.split('/').map(Number);
    return num / den;
  }
  return parseFloat(val);
}

const angleInput = document.getElementById('angleInput');
const angleSlider = document.getElementById('angleSlider');
const dotsInput = document.getElementById('dotsInput');
const decimalPlaceInput = document.getElementById('decimalPlaceInput');
const directionInput = document.getElementById('directionInput');
const toggleAnimationBtn = document.getElementById('toggleAnimationBtn');
const colorToggle = document.getElementById('colorToggle');
const trailToggle = document.getElementById('trailToggle');
const sizeToggle = document.getElementById('sizeToggle');

let animationInterval = null;

// Sync inputs and redraw on change
angleInput.addEventListener('input', () => {
  const prop = parseInput(angleInput.value);
  if (!isNaN(prop)) angleSlider.value = prop * 360;
  draw();
});
angleSlider.addEventListener('input', () => {
  angleInput.value = (angleSlider.value / 360).toFixed(3);
  draw();
});
dotsInput.addEventListener('input', draw);
decimalPlaceInput.addEventListener('change', draw);
directionInput.addEventListener('change', () => {
  toggleAnimationBtn.textContent = animationInterval ? 'Pause' : 'Play';
});
colorToggle.addEventListener('change', draw);
trailToggle.addEventListener('change', draw);
sizeToggle.addEventListener('change', draw);

toggleAnimationBtn.addEventListener('click', () => {
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = null;
    toggleAnimationBtn.textContent = 'Play';
  } else {
    animationInterval = setInterval(stepAnimation, 100);
    toggleAnimationBtn.textContent = 'Pause';
  }
});

function stepAnimation() {
  let prop = parseInput(angleInput.value);
  const place = parseInt(decimalPlaceInput.value, 10);
  const dir = directionInput.value;
  const delta = Math.pow(10, -place) * (dir === 'increase' ? 1 : -1);
  prop += delta;
  if (prop < 0) prop = 0;
  angleInput.value = prop.toFixed(place);
  angleSlider.value = (prop * 360).toFixed(1);
  draw();
}

function draw() {
  if (!trailToggle.checked) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = 'rgba(245, 245, 245, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const proportion = parseInput(angleInput.value);
  const maxDots = parseInt(dotsInput.value, 10) || 0;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const spacing = 4;

  for (let i = 0; i < maxDots; i++) {
    const angle = 2 * Math.PI * ((i * proportion) % 1);
    const r = spacing * Math.sqrt(i);
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);

    if (colorToggle.checked) {
      const hue = (i / maxDots) * 360;
      ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
    } else {
      ctx.fillStyle = 'rgba(0, 150, 136, 0.7)';
    }

    const size = sizeToggle.checked ? Math.max(1.5, 4 * Math.sqrt((maxDots - i) / maxDots)) : 2;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fill();
  }
}

draw();
