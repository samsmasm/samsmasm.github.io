// Cat Type — a friendly typing runner for small people.
// Type the letter on each obstacle to SMASH it; the cat auto-hops the crater.
// Out of letters? Press SPACE to jump (limited jumps per level).

const container = document.getElementById('game-container');
const catEl = document.getElementById('cat');
const catSvg = document.getElementById('cat-svg');
const progressEl = document.getElementById('progress');
const fishCountEl = document.getElementById('fish-count');
const fishBadgeEl = document.getElementById('fish-badge');
const pawsEl = document.getElementById('paws');
const pawsBadgeEl = document.getElementById('paws-badge');
const soundBtn = document.getElementById('sound-btn');
const homeBtn = document.getElementById('home-btn');
const pickerScreen = document.getElementById('picker-screen');
const lvGrid = document.getElementById('lv-grid');
const overScreen = document.getElementById('over-screen');
const overProgressEl = document.getElementById('over-progress');
const overFishEl = document.getElementById('over-fish');
const winScreen = document.getElementById('win-screen');
const winStarsEl = document.getElementById('win-stars');
const winLineEl = document.getElementById('win-line');
const winFishEl = document.getElementById('win-fish');
const againBtn = document.getElementById('again-btn');
const pickBtn = document.getElementById('pick-btn');
const titleEl = document.getElementById('title');
const totalFishStartEl = document.getElementById('total-fish-start');
const hillsBack = document.getElementById('hills-back');
const hillsFront = document.getElementById('hills-front');
const ground = document.getElementById('ground');
const starsLayer = document.getElementById('stars-layer');

// ---------- tuning ----------
const GROUND_Y = 70;          // cat's resting bottom, px
const GRAVITY = 0.5;          // floaty = forgiving for little fingers
const JUMP_STRENGTH = 17;     // SPACE jump (clears any obstacle)
const AUTO_HOP_STRENGTH = 13; // little leap over a smashed crater
const JUMP_BUDGET = 5;        // SPACE jumps allowed per level
const OBSTACLE_COUNT = 16;    // obstacles to clear to finish a level
const SPAWN_GAP = 560;        // px between obstacles (constant on-screen spacing)
const DAY_CYCLE = 90;         // seconds for a full day->night->day

// ---------- letter frequencies (English text %) ----------
const FREQ = {
  A: 8.2, B: 1.5, C: 2.8, D: 4.3, E: 12.7, F: 2.2, G: 2.0, H: 6.1, I: 7.0,
  J: 0.16, K: 0.77, L: 4.0, M: 2.4, N: 6.7, O: 7.5, P: 1.9, Q: 0.12, R: 6.0,
  S: 6.3, T: 9.1, U: 2.8, V: 0.98, W: 2.4, X: 0.15, Y: 2.0, Z: 0.074,
};

// letter sets build up from the most common letters outward
const LETTER_SETS = [
  { label: 'E T A O',         letters: 'ETAO' },
  { label: '+ I N',           letters: 'ETAOIN' },
  { label: '+ S H R L',       letters: 'ETAOINSHRL' },
  { label: '+ D C U M W F',   letters: 'ETAOINSHRLDCUMWF' },
  { label: 'all 26',          letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
];

const SPEEDS = [
  { label: 'Slow',   icon: '🐢', speed: 3.2 },
  { label: 'Medium', icon: '🐇', speed: 4.4 },
  { label: 'Fast',   icon: '🚀', speed: 5.8 },
];

// ---------- state ----------
let state = 'picker';         // 'picker' | 'playing' | 'over' | 'win'
let level = null;             // { setId, speedId, letters, speed }
let catY = GROUND_Y;
let velocity = 0;
let airborne = false;
let speed = 4;
let worldTime = 0;            // keeps ticking, drives day/night
let obstacles = [];
let craters = [];
let items = [];               // fish
let spawnedCount = 0;
let clearedCount = 0;
let jumpsLeft = JUMP_BUDGET;
let jumpsUsedThisLevel = 0;
let fishThisRun = 0;
let scrollSinceSpawn = SPAWN_GAP; // spawn the first obstacle promptly
let groundX = 0;
let lastFrame = 0;
let fishTimer = 0;
let nextFishIn = 3;
let lastSparkleAt = 0;
let lastLetter = '';

let totalFish = parseInt(localStorage.getItem('cattype-fish') || '0', 10);
let muted = localStorage.getItem('cattype-muted') === '1';

// best stars per level cell, keyed "setId-speedId"
function bestStars(setId, speedId) {
  return parseInt(localStorage.getItem(`cattype-stars-${setId}-${speedId}`) || '0', 10);
}
function saveStars(setId, speedId, stars) {
  if (stars > bestStars(setId, speedId)) {
    localStorage.setItem(`cattype-stars-${setId}-${speedId}`, String(stars));
  }
}

// ---------- sounds (WebAudio, no files needed) ----------
let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function tone(freqFrom, freqTo, duration, type, volume, when = 0) {
  if (muted || !audioCtx) return;
  const t0 = audioCtx.currentTime + when;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqFrom, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(freqTo, 1), t0 + duration);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

const sfx = {
  jump: () => tone(280, 560, 0.18, 'triangle', 0.25),
  hop: () => tone(360, 620, 0.14, 'triangle', 0.2),
  ding: () => { tone(880, 880, 0.09, 'sine', 0.22); tone(1320, 1320, 0.16, 'sine', 0.2, 0.07); },
  nope: () => tone(200, 150, 0.16, 'sawtooth', 0.16),
  smash: () => { tone(300, 60, 0.2, 'square', 0.2); tone(150, 40, 0.25, 'sawtooth', 0.15, 0.02); },
  bump: () => tone(170, 55, 0.35, 'sawtooth', 0.22),
  bloop: () => { tone(520, 880, 0.12, 'sine', 0.22); tone(780, 1240, 0.14, 'sine', 0.18, 0.08); },
  poff: () => tone(260, 150, 0.16, 'sine', 0.2),
  fanfare: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.18, 'triangle', 0.22, i * 0.13)); },
};

function updateSoundBtn() {
  soundBtn.textContent = muted ? '🔇' : '🔊';
}

soundBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  muted = !muted;
  localStorage.setItem('cattype-muted', muted ? '1' : '0');
  updateSoundBtn();
});

homeBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  goToPicker();
});

// ---------- day / night palette ----------
const PALETTES = {
  day:    { skyTop: [154, 220, 240], skyBot: [232, 248, 244], hillBack: [184, 224, 154], hillFront: [140, 200, 112], grass: [124, 188, 96],  dirt: [226, 188, 140], stars: 0,   sun: 1,   cloud: 1 },
  gold:   { skyTop: [168, 214, 212], skyBot: [255, 240, 204], hillBack: [196, 218, 142], hillFront: [152, 192, 104], grass: [136, 180, 92],  dirt: [222, 182, 132], stars: 0,   sun: 1,   cloud: 1 },
  sunset: { skyTop: [255, 158, 116], skyBot: [255, 226, 186], hillBack: [212, 186, 122], hillFront: [176, 148, 94],  grass: [158, 148, 86],  dirt: [206, 164, 120], stars: 0.1, sun: 0.85, cloud: 0.9 },
  night:  { skyTop: [40, 50, 94],    skyBot: [94, 110, 162],  hillBack: [70, 94, 126],   hillFront: [48, 70, 100],   grass: [56, 88, 96],    dirt: [76, 80, 108],   stars: 1,   sun: 0,   cloud: 0.35 },
  dawn:   { skyTop: [186, 168, 224], skyBot: [255, 216, 198], hillBack: [168, 188, 150], hillFront: [126, 164, 110], grass: [112, 158, 92],  dirt: [200, 172, 134], stars: 0.2, sun: 0.5, cloud: 0.8 },
};

const CYCLE = [
  [0.00, 'day'], [0.38, 'day'], [0.46, 'gold'], [0.53, 'sunset'], [0.62, 'night'],
  [0.84, 'night'], [0.94, 'dawn'], [1.00, 'day'],
];

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpRgb(a, b, t) {
  return `rgb(${Math.round(lerp(a[0], b[0], t))}, ${Math.round(lerp(a[1], b[1], t))}, ${Math.round(lerp(a[2], b[2], t))})`;
}

function applySky() {
  const frac = (worldTime % DAY_CYCLE) / DAY_CYCLE;
  let i = 0;
  while (i < CYCLE.length - 2 && frac >= CYCLE[i + 1][0]) i++;
  const [f0, k0] = CYCLE[i];
  const [f1, k1] = CYCLE[i + 1];
  const t = (frac - f0) / (f1 - f0);
  const a = PALETTES[k0], b = PALETTES[k1];
  const s = container.style;
  s.setProperty('--sky-top', lerpRgb(a.skyTop, b.skyTop, t));
  s.setProperty('--sky-bottom', lerpRgb(a.skyBot, b.skyBot, t));
  s.setProperty('--hill-back', lerpRgb(a.hillBack, b.hillBack, t));
  s.setProperty('--hill-front', lerpRgb(a.hillFront, b.hillFront, t));
  s.setProperty('--grass', lerpRgb(a.grass, b.grass, t));
  s.setProperty('--dirt', lerpRgb(a.dirt, b.dirt, t));
  s.setProperty('--stars-opacity', lerp(a.stars, b.stars, t).toFixed(2));
  s.setProperty('--sun-opacity', lerp(a.sun, b.sun, t).toFixed(2));
  s.setProperty('--cloud-opacity', lerp(a.cloud, b.cloud, t).toFixed(2));
}

// clone parallax tiles until each layer is wide enough for the screen
function fillTiles(layer, tileW) {
  const needed = Math.ceil((window.innerWidth + tileW) / tileW);
  const originals = Array.from(layer.children);
  while (layer.children.length < needed) {
    layer.appendChild(originals[layer.children.length % originals.length].cloneNode(true));
  }
}

function fillAllTiles() {
  fillTiles(ground, 400);
  fillTiles(hillsFront, 800);
  fillTiles(hillsBack, 800);
}

fillAllTiles();
window.addEventListener('resize', fillAllTiles);

// scatter little twinkling stars in the night sky
for (let i = 0; i < 36; i++) {
  const star = document.createElement('div');
  star.className = 'sky-star';
  star.style.left = Math.random() * 100 + '%';
  star.style.top = Math.random() * 100 + '%';
  star.style.animationDelay = (Math.random() * 2.4) + 's';
  star.style.transform = `scale(${0.6 + Math.random()})`;
  starsLayer.appendChild(star);
}

// ---------- obstacle art (cosmetic; varies with the sky) ----------
const OBSTACLE_TYPES = [
  { phases: ['day', 'gold', 'sunset', 'dawn'], w: 64, h: 86,
    svg: `<svg width="64" height="86" viewBox="0 0 64 86">
      <ellipse cx="32" cy="40" rx="15" ry="26" fill="#69b35e"/>
      <path d="M17 36 q-12 -2 -10 -14" stroke="#69b35e" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M47 30 q12 -3 11 -16" stroke="#69b35e" stroke-width="10" fill="none" stroke-linecap="round"/>
      <circle cx="27" cy="34" r="2" fill="#4e8c46"/><circle cx="37" cy="44" r="2" fill="#4e8c46"/>
      <circle cx="30" cy="50" r="2" fill="#4e8c46"/>
      <circle cx="32" cy="14" r="7" fill="#ff8fab"/><circle cx="32" cy="14" r="3" fill="#fff3b0"/>
      <path d="M14 62 L50 62 L46 84 L18 84 Z" fill="#d9714e"/>
      <rect x="11" y="58" width="42" height="9" rx="4.5" fill="#c4593a"/>
    </svg>` },
  { phases: ['day', 'gold', 'dawn'], w: 62, h: 58,
    svg: `<svg width="62" height="58" viewBox="0 0 62 58">
      <rect x="22" y="28" width="18" height="28" rx="8" fill="#fdf3e3"/>
      <path d="M3 30 Q31 -14 59 30 Q31 40 3 30 Z" fill="#e0573f"/>
      <circle cx="20" cy="18" r="4.5" fill="#fdf3e3"/>
      <circle cx="38" cy="11" r="3.6" fill="#fdf3e3"/>
      <circle cx="46" cy="22" r="3.2" fill="#fdf3e3"/>
    </svg>` },
  { phases: ['day', 'gold', 'sunset', 'dawn'], w: 80, h: 48,
    svg: `<svg width="80" height="48" viewBox="0 0 80 48">
      <ellipse cx="24" cy="32" rx="22" ry="16" fill="#5da356"/>
      <ellipse cx="54" cy="30" rx="24" ry="18" fill="#6db463"/>
      <ellipse cx="40" cy="22" rx="18" ry="14" fill="#7cc46f"/>
      <circle cx="30" cy="24" r="4" fill="#e0573f"/>
      <circle cx="50" cy="20" r="4" fill="#e0573f"/>
      <circle cx="42" cy="34" r="4" fill="#e0573f"/>
      <circle cx="60" cy="32" r="4" fill="#e0573f"/>
    </svg>` },
  { phases: ['day', 'gold', 'dawn', 'night'], w: 66, h: 54,
    svg: `<svg width="66" height="54" viewBox="0 0 66 54">
      <rect x="6" y="6" width="10" height="48" rx="5" fill="#c89564"/>
      <rect x="28" y="2" width="10" height="52" rx="5" fill="#b9854f"/>
      <rect x="50" y="6" width="10" height="48" rx="5" fill="#c89564"/>
      <rect x="0" y="14" width="66" height="8" rx="4" fill="#d9a872"/>
      <rect x="0" y="34" width="66" height="8" rx="4" fill="#d9a872"/>
    </svg>` },
  { phases: ['day', 'dawn'], w: 70, h: 64,
    svg: `<svg width="70" height="64" viewBox="0 0 70 64">
      <path d="M16 64 Q14 40 18 24 M35 64 Q35 36 33 14 M54 64 Q56 42 52 28" stroke="#6db463" stroke-width="5" fill="none" stroke-linecap="round"/>
      <g><circle cx="18" cy="18" r="6" fill="#fff" transform="translate(-7,0)"/><circle cx="18" cy="18" r="6" fill="#fff" transform="translate(7,0)"/><circle cx="18" cy="18" r="6" fill="#fff" transform="translate(0,-7)"/><circle cx="18" cy="18" r="6" fill="#fff" transform="translate(0,7)"/><circle cx="18" cy="18" r="5.5" fill="#ffd166"/></g>
      <g><circle cx="33" cy="9" r="6" fill="#ff9ec4" transform="translate(-7,0)"/><circle cx="33" cy="9" r="6" fill="#ff9ec4" transform="translate(7,0)"/><circle cx="33" cy="9" r="6" fill="#ff9ec4" transform="translate(0,-7)"/><circle cx="33" cy="9" r="6" fill="#ff9ec4" transform="translate(0,7)"/><circle cx="33" cy="9" r="5.5" fill="#fff3b0"/></g>
      <g><circle cx="52" cy="22" r="6" fill="#ffd166" transform="translate(-7,0)"/><circle cx="52" cy="22" r="6" fill="#ffd166" transform="translate(7,0)"/><circle cx="52" cy="22" r="6" fill="#ffd166" transform="translate(0,-7)"/><circle cx="52" cy="22" r="6" fill="#ffd166" transform="translate(0,7)"/><circle cx="52" cy="22" r="5.5" fill="#e0573f"/></g>
    </svg>` },
  { phases: ['gold', 'sunset'], w: 84, h: 78,
    svg: `<svg width="84" height="78" viewBox="0 0 62 58">
      <rect x="22" y="28" width="18" height="28" rx="8" fill="#fdf3e3"/>
      <path d="M3 30 Q31 -14 59 30 Q31 40 3 30 Z" fill="#c4538a"/>
      <circle cx="20" cy="18" r="4.5" fill="#fdf3e3"/>
      <circle cx="38" cy="11" r="3.6" fill="#fdf3e3"/>
      <circle cx="46" cy="22" r="3.2" fill="#fdf3e3"/>
    </svg>` },
  { phases: ['night'], w: 78, h: 56,
    svg: `<svg width="78" height="56" viewBox="0 0 78 56">
      <ellipse cx="39" cy="40" rx="36" ry="16" fill="#26403a"/>
      <ellipse cx="39" cy="28" rx="26" ry="16" fill="#33524a"/>
      <circle class="ff" cx="20" cy="24" r="4" fill="#ffe97a"/>
      <circle class="ff ff2" cx="46" cy="14" r="3.5" fill="#fff3a8"/>
      <circle class="ff ff3" cx="60" cy="32" r="4" fill="#ffe97a"/>
      <circle class="ff ff4" cx="34" cy="34" r="3" fill="#fff3a8"/>
    </svg>` },
  { phases: ['night'], w: 62, h: 58,
    svg: `<svg width="62" height="58" viewBox="0 0 62 58">
      <rect x="22" y="28" width="18" height="28" rx="8" fill="#cfe8e0"/>
      <path d="M3 30 Q31 -14 59 30 Q31 40 3 30 Z" fill="#4ec9b0"/>
      <circle class="ff" cx="20" cy="18" r="4.5" fill="#eafff8"/>
      <circle class="ff ff3" cx="38" cy="11" r="3.6" fill="#eafff8"/>
      <circle class="ff ff2" cx="46" cy="22" r="3.2" fill="#eafff8"/>
    </svg>` },
];

function phaseNow() {
  const frac = (worldTime % DAY_CYCLE) / DAY_CYCLE;
  let i = 0;
  while (i < CYCLE.length - 2 && frac >= CYCLE[i + 1][0]) i++;
  const t = (frac - CYCLE[i][0]) / (CYCLE[i + 1][0] - CYCLE[i][0]);
  return t < 0.5 ? CYCLE[i][1] : CYCLE[i + 1][1];
}

// weighted random letter from the current level's set
function pickLetter() {
  const set = level.letters;
  let total = 0;
  for (const ch of set) total += FREQ[ch];
  let letter;
  // avoid repeating the previous letter when the set is big enough to allow it
  do {
    let r = Math.random() * total;
    letter = set[set.length - 1];
    for (const ch of set) { r -= FREQ[ch]; if (r <= 0) { letter = ch; break; } }
  } while (letter === lastLetter && set.length > 1 && Math.random() < 0.8);
  lastLetter = letter;
  return letter;
}

function spawnObstacle() {
  const phase = phaseNow();
  const pool = OBSTACLE_TYPES.filter(t => t.phases.includes(phase));
  const type = pool[Math.floor(Math.random() * pool.length)];
  const letter = pickLetter();
  const el = document.createElement('div');
  el.className = 'obstacle';
  el.innerHTML = type.svg + `<div class="ob-letter">${letter}</div>`;
  const x = container.clientWidth + 40;
  el.style.transform = `translateX(${x}px)`;
  container.appendChild(el);
  obstacles.push({ el, x, w: type.w, letter, letterEl: el.querySelector('.ob-letter'), cleared: false });
  spawnedCount++;
}

// ---------- crater (left after a smash, the cat auto-hops it) ----------
const CRATER_SVG = `<svg width="90" height="42" viewBox="0 0 90 42">
  <ellipse cx="45" cy="26" rx="42" ry="15" fill="#3a2a1a" opacity="0.5"/>
  <ellipse cx="45" cy="22" rx="35" ry="11" fill="#2a1d10"/>
  <ellipse cx="45" cy="19" rx="26" ry="7" fill="#1d140b"/>
  <path d="M7 24 q-4 -9 7 -8 M83 24 q4 -9 -7 -8" stroke="#c89564" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="16" cy="11" r="3" fill="#d9a872"/><circle cx="74" cy="10" r="2.6" fill="#d9a872"/>
</svg>`;

function spawnCrater(x) {
  const el = document.createElement('div');
  el.className = 'crater';
  el.innerHTML = CRATER_SVG;
  el.style.transform = `translateX(${x}px)`;
  container.appendChild(el);
  craters.push({ el, x, w: 90, hopped: false });
}

// ---------- fish collectibles ----------
const FISH_COLORS = [
  ['#ff9e4f', '#e07a3f'],
  ['#5fa8e8', '#3a7fc0'],
  ['#ff8fab', '#e0648f'],
];

function fishSvg(body, dark) {
  return `<svg width="48" height="32" viewBox="0 0 48 32">
    <path d="M14 16 L2 5 Q7 16 2 27 Z" fill="${dark}"/>
    <ellipse cx="28" cy="16" rx="17" ry="11" fill="${body}"/>
    <path d="M22 7 q-3 9 0 18 M29 6 q-3 10 0 20" stroke="${dark}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M26 5 q5 -5 9 0" stroke="${dark}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="37" cy="13" r="3.4" fill="#fff"/>
    <circle cx="38" cy="13" r="1.8" fill="#3a2c20"/>
    <path d="M40 20 q-3 2 -6 1" stroke="${dark}" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`;
}

// keep fish clear of obstacles so they never lure the cat into a crash
function clearOfObstacles(x) {
  let moved = true;
  while (moved) {
    moved = false;
    for (const ob of obstacles) {
      if (Math.abs(x - ob.x) < 300) { x = ob.x + 360; moved = true; }
    }
  }
  return x;
}

function spawnFish() {
  const [body, dark] = FISH_COLORS[Math.floor(Math.random() * FISH_COLORS.length)];
  const x = clearOfObstacles(container.clientWidth + 60);
  const y = [150, 200, 250][Math.floor(Math.random() * 3)] + Math.random() * 20;
  const el = document.createElement('div');
  el.className = 'item fish';
  el.innerHTML = fishSvg(body, dark);
  el.style.bottom = y + 'px';
  el.style.transform = `translateX(${x}px)`;
  container.appendChild(el);
  items.push({ el, x });
}

function touchingCat(el) {
  const c = catEl.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return c.right + 8 > r.left && c.left - 8 < r.right &&
         c.bottom + 8 > r.top && c.top - 8 < r.bottom;
}

function collectFish(it) {
  fishThisRun++;
  fishCountEl.textContent = fishThisRun;
  fishBadgeEl.classList.remove('bump');
  void fishBadgeEl.offsetWidth;
  fishBadgeEl.classList.add('bump');
  ringAt(it.x + 20, parseFloat(it.el.style.bottom) + 10);
  sfx.bloop();
}

// ---------- effects ----------
function ringAt(x, bottomY) {
  const r = document.createElement('div');
  r.className = 'burst-ring';
  r.style.left = x + 'px';
  r.style.bottom = bottomY + 'px';
  container.appendChild(r);
  setTimeout(() => r.remove(), 650);
}

function puff(x, y) {
  for (let i = 0; i < 3; i++) {
    const p = document.createElement('div');
    p.className = 'puff';
    p.style.left = (x + i * 14 - 14) + 'px';
    p.style.bottom = y + 'px';
    container.appendChild(p);
    setTimeout(() => p.remove(), 550);
  }
}

function sparkle() {
  const s = document.createElement('div');
  s.className = 'sparkle';
  s.style.left = (catEl.offsetLeft + 10 + Math.random() * 30) + 'px';
  s.style.bottom = (catY + 20 + Math.random() * 50) + 'px';
  container.appendChild(s);
  setTimeout(() => s.remove(), 750);
}

function letterPop(letter, x, bottomY) {
  const s = document.createElement('div');
  s.className = 'letter-pop';
  s.textContent = letter;
  s.style.left = x + 'px';
  s.style.bottom = bottomY + 'px';
  container.appendChild(s);
  setTimeout(() => s.remove(), 800);
}

function confettiBurst() {
  const colors = ['#ffd166', '#ff8fab', '#7cc46f', '#6ec5e9', '#e0573f', '#b89ae0'];
  for (let i = 0; i < 28; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + '%';
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = (Math.random() * 0.7) + 's';
    c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    container.appendChild(c);
    setTimeout(() => c.remove(), 3500);
  }
}

// ---------- smashing & typing ----------
function smashObstacle(ob) {
  const idx = obstacles.indexOf(ob);
  if (idx >= 0) obstacles.splice(idx, 1);
  const bottomPx = 74 + ob.w / 2;
  letterPop(ob.letter, ob.x + ob.w / 2 - 18, 120);
  puff(ob.x, 90);
  puff(ob.x + 24, 110);
  ringAt(ob.x + ob.w / 2, 100);
  ob.el.classList.add('smashing');
  setTimeout(() => ob.el.remove(), 420);
  spawnCrater(ob.x + ob.w / 2 - 45);
  sfx.smash();
  sfx.ding();
  markCleared();
}

function flashWrong(ob) {
  ob.letterEl.classList.remove('wrong');
  void ob.letterEl.offsetWidth;
  ob.letterEl.classList.add('wrong');
  setTimeout(() => ob.letterEl.classList.remove('wrong'), 400);
  sfx.nope();
}

// the obstacle the cat must deal with next: nearest one still ahead
function frontObstacle() {
  let best = null;
  for (const ob of obstacles) {
    if (ob.x + ob.w < catEl.offsetLeft) continue; // already behind the cat
    if (!best || ob.x < best.x) best = ob;
  }
  return best;
}

function typeLetter(letter) {
  const ob = frontObstacle();
  if (!ob) return;
  if (ob.letter === letter) smashObstacle(ob);
  else flashWrong(ob);
}

function markCleared() {
  clearedCount++;
  updateProgress();
  if (clearedCount >= OBSTACLE_COUNT) winLevel();
}

function updateProgress() {
  progressEl.textContent = `${clearedCount}/${OBSTACLE_COUNT}`;
}

function renderPaws() {
  let html = '';
  for (let i = 0; i < JUMP_BUDGET; i++) {
    html += `<span class="paw${i < jumpsLeft ? '' : ' used'}">🐾</span>`;
  }
  pawsEl.innerHTML = html;
}

// ---------- jumping ----------
function spaceJump() {
  if (airborne) return;
  if (jumpsLeft <= 0) {
    pawsBadgeEl.classList.remove('shake');
    void pawsBadgeEl.offsetWidth;
    pawsBadgeEl.classList.add('shake');
    return;
  }
  jumpsLeft--;
  jumpsUsedThisLevel++;
  renderPaws();
  airborne = true;
  velocity = JUMP_STRENGTH;
  catSvg.classList.remove('running');
  catSvg.classList.add('jumping');
  sfx.jump();
}

function autoHop() {
  if (airborne) return;
  airborne = true;
  velocity = AUTO_HOP_STRENGTH;
  catSvg.classList.remove('running');
  catSvg.classList.add('jumping');
  sfx.hop();
}

function land() {
  catY = GROUND_Y;
  airborne = false;
  velocity = 0;
  catSvg.classList.remove('jumping');
  catSvg.classList.add('running');
  catEl.classList.remove('landed');
  void catEl.offsetWidth;
  catEl.classList.add('landed');
  catEl.style.transform = '';
}

// ---------- collision (forgiving hitboxes) ----------
function hitObstacle() {
  const c = catEl.getBoundingClientRect();
  const catBox = { left: c.left + 30, right: c.right - 18, top: c.top + 18, bottom: c.bottom - 4 };
  for (const ob of obstacles) {
    const o = ob.el.getBoundingClientRect();
    const obBox = { left: o.left + 14, right: o.right - 14, top: o.top + 12, bottom: o.bottom };
    if (catBox.right > obBox.left && catBox.left < obBox.right &&
        catBox.bottom > obBox.top && catBox.top < obBox.bottom) {
      return ob;
    }
  }
  return null;
}

// ---------- input ----------
function handleTap() {
  ensureAudio();
  if (state === 'playing') spaceJump();
}

container.addEventListener('pointerdown', handleTap);

document.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  ensureAudio();
  if (e.code === 'Space') {
    e.preventDefault();
    if (state === 'playing') spaceJump();
    return;
  }
  if (state === 'playing' && /^Key[A-Z]$/.test(e.code)) {
    typeLetter(e.code.slice(3));
  }
});
document.addEventListener('contextmenu', (e) => e.preventDefault());

// ---------- screens & flow ----------
function buildPicker() {
  let html = '<div class="lv-head"><div class="lv-corner"></div>';
  for (const sp of SPEEDS) html += `<div class="lv-col">${sp.icon}<span>${sp.label}</span></div>`;
  html += '</div>';
  LETTER_SETS.forEach((set, si) => {
    html += `<div class="lv-row-wrap"><div class="lv-rowlabel">${set.label}</div>`;
    SPEEDS.forEach((sp, pi) => {
      const stars = bestStars(si, pi);
      const dots = '★★★☆☆☆'.slice(3 - stars, 6 - stars);
      html += `<button class="lv-cell" data-set="${si}" data-speed="${pi}">
        <span class="lv-stars">${dots}</span></button>`;
    });
    html += '</div>';
  });
  lvGrid.innerHTML = html;
  lvGrid.querySelectorAll('.lv-cell').forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      ensureAudio();
      startLevel(parseInt(btn.dataset.set, 10), parseInt(btn.dataset.speed, 10));
    });
  });
}

function startLevel(setId, speedId) {
  level = {
    setId, speedId,
    letters: LETTER_SETS[setId].letters,
    speed: SPEEDS[speedId].speed,
  };
  speed = level.speed;
  // reset world
  obstacles.forEach(o => o.el.remove()); obstacles = [];
  craters.forEach(c => c.el.remove()); craters = [];
  items.forEach(it => it.el.remove()); items = [];
  catY = GROUND_Y;
  velocity = 0;
  airborne = false;
  spawnedCount = 0;
  clearedCount = 0;
  jumpsLeft = JUMP_BUDGET;
  jumpsUsedThisLevel = 0;
  fishThisRun = 0;
  scrollSinceSpawn = SPAWN_GAP;
  fishTimer = 0;
  nextFishIn = 3 + Math.random() * 2;
  lastLetter = '';
  updateProgress();
  renderPaws();
  fishCountEl.textContent = '0';
  catEl.style.bottom = GROUND_Y + 'px';
  catEl.style.transform = '';
  catSvg.classList.remove('oops', 'jumping');
  catSvg.classList.add('running');
  pickerScreen.classList.add('hidden');
  overScreen.classList.add('hidden');
  winScreen.classList.add('hidden');
  state = 'playing';
}

function failLevel() {
  state = 'over';
  catSvg.classList.remove('running', 'jumping');
  catSvg.classList.add('oops');
  sfx.bump();
  totalFish += fishThisRun;
  localStorage.setItem('cattype-fish', String(totalFish));
  overProgressEl.textContent = `You smashed ${clearedCount} of ${OBSTACLE_COUNT}!`;
  overFishEl.textContent = fishThisRun > 0 ? `🐟 × ${fishThisRun}` : '';
  overScreen.classList.remove('hidden');
}

function winLevel() {
  state = 'win';
  catSvg.classList.remove('jumping');
  catSvg.classList.add('running');
  // star rating from jumps used
  let stars = 3;
  if (jumpsUsedThisLevel >= 4) stars = 1;
  else if (jumpsUsedThisLevel >= 2) stars = 2;
  const prevBest = bestStars(level.setId, level.speedId);
  saveStars(level.setId, level.speedId, stars);
  totalFish += fishThisRun;
  localStorage.setItem('cattype-fish', String(totalFish));

  winStarsEl.innerHTML = '★★★☆☆☆'.slice(3 - stars, 6 - stars)
    .split('').map((c, i) => `<span style="animation-delay:${i * 0.18}s">${c}</span>`).join('');
  winLineEl.textContent = jumpsUsedThisLevel === 0
    ? 'No jumps used. Super typing!'
    : `You used ${jumpsUsedThisLevel} jump${jumpsUsedThisLevel === 1 ? '' : 's'}.`;
  winLineEl.classList.toggle('new-best', stars > prevBest);
  winFishEl.textContent = fishThisRun > 0 ? `🐟 × ${fishThisRun}` : '';
  winScreen.classList.remove('hidden');
  confettiBurst();
  setTimeout(() => sfx.fanfare(), 250);
}

function goToPicker() {
  state = 'picker';
  obstacles.forEach(o => o.el.remove()); obstacles = [];
  craters.forEach(c => c.el.remove()); craters = [];
  items.forEach(it => it.el.remove()); items = [];
  catY = GROUND_Y;
  velocity = 0;
  airborne = false;
  catEl.style.bottom = GROUND_Y + 'px';
  catEl.style.transform = '';
  catSvg.classList.remove('oops', 'jumping');
  catSvg.classList.add('running');
  overScreen.classList.add('hidden');
  winScreen.classList.add('hidden');
  buildPicker();
  updateTotalFish();
  pickerScreen.classList.remove('hidden');
}

overScreen.addEventListener('pointerdown', () => {
  if (state === 'over' && level) startLevel(level.setId, level.speedId);
});
againBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  startLevel(level.setId, level.speedId);
});
pickBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  goToPicker();
});

function updateTotalFish() {
  totalFishStartEl.textContent = totalFish > 0 ? `You have caught ${totalFish} 🐟 so far!` : '';
}

// ---------- main loop ----------
function frame(now) {
  const dt = Math.min((now - lastFrame) / 16.667, 3);
  lastFrame = now;
  worldTime += dt / 60;

  if (state === 'playing') {
    const catLeft = catEl.offsetLeft;

    // scroll world
    groundX += speed * dt;
    ground.style.transform = `translateX(${-(groundX % 400)}px)`;
    hillsFront.style.transform = `translateX(${-((groundX * 0.4) % 800)}px)`;
    hillsBack.style.transform = `translateX(${-((groundX * 0.15) % 800)}px)`;

    // spawn obstacles at constant pixel spacing, until the level's quota is met
    scrollSinceSpawn += speed * dt;
    if (spawnedCount < OBSTACLE_COUNT && scrollSinceSpawn >= SPAWN_GAP) {
      spawnObstacle();
      scrollSinceSpawn = 0;
    }

    // spawn fish
    fishTimer += dt / 60;
    if (fishTimer >= nextFishIn) {
      spawnFish();
      fishTimer = 0;
      nextFishIn = 3 + Math.random() * 3;
    }

    // move fish, collect on touch
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.x -= speed * dt;
      it.el.style.transform = `translateX(${it.x}px)`;
      if (it.x < -100) { it.el.remove(); items.splice(i, 1); continue; }
      if (touchingCat(it.el)) { collectFish(it); it.el.remove(); items.splice(i, 1); }
    }

    // move obstacles; count safe passes (the cat jumped over them)
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const ob = obstacles[i];
      ob.x -= speed * dt;
      ob.el.style.transform = `translateX(${ob.x}px)`;
      if (!ob.cleared && ob.x + ob.w < catLeft + 8) {
        ob.cleared = true;
        markCleared();
      }
      if (ob.x < -160) { ob.el.remove(); obstacles.splice(i, 1); }
    }

    // move craters; auto-hop as each one reaches the cat
    for (let i = craters.length - 1; i >= 0; i--) {
      const cr = craters[i];
      cr.x -= speed * dt;
      cr.el.style.transform = `translateX(${cr.x}px)`;
      const crCenter = cr.x + cr.w / 2;
      const catCenter = catLeft + 55;
      if (!cr.hopped && crCenter <= catCenter + 80 && crCenter >= catCenter - 20) {
        cr.hopped = true;
        autoHop();
      }
      if (cr.x < -160) { cr.el.remove(); craters.splice(i, 1); }
    }

    // jump physics
    if (airborne) {
      catY += velocity * dt;
      velocity -= GRAVITY * dt;
      if (catY <= GROUND_Y) {
        land();
      } else {
        catEl.style.bottom = catY + 'px';
        if (now - lastSparkleAt > 80) { lastSparkleAt = now; sparkle(); }
        catEl.style.transform = `rotate(${-velocity * 0.8}deg)`;
      }
    }

    // crash?
    const hit = hitObstacle();
    if (hit) failLevel();
  }

  applySky();
  requestAnimationFrame(frame);
}

// ---------- boot ----------
titleEl.innerHTML = 'Cat Type!'.split('').map((ch, i) =>
  ch === ' ' ? ' ' : `<span style="animation-delay:${i * 0.07}s">${ch}</span>`
).join('');

buildPicker();
updateTotalFish();
updateSoundBtn();
catEl.style.bottom = GROUND_Y + 'px';
catSvg.classList.add('running');
lastFrame = performance.now();
requestAnimationFrame(frame);
