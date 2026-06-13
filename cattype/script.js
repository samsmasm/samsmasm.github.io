// Cat Type — a friendly typing runner for small people.
// Type the letter (or whole word) on each obstacle to SMASH it; the cat
// auto-hops the crater. Out of letters? Press SPACE to jump (limited per level).

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
const LETTER_COUNT = 16;      // obstacles to clear in a single-letter level
const WORD_COUNT = 12;        // obstacles to clear in a word level
const LETTER_GAP = 560;       // px between single-letter obstacles
const WORD_GAP = 700;         // px between word obstacles (more reading room)
const DAY_CYCLE = 90;         // seconds for a full day->night->day

// ---------- letter frequencies (English text %) ----------
const FREQ = {
  A: 8.2, B: 1.5, C: 2.8, D: 4.3, E: 12.7, F: 2.2, G: 2.0, H: 6.1, I: 7.0,
  J: 0.16, K: 0.77, L: 4.0, M: 2.4, N: 6.7, O: 7.5, P: 1.9, Q: 0.12, R: 6.0,
  S: 6.3, T: 9.1, U: 2.8, V: 0.98, W: 2.4, X: 0.15, Y: 2.0, Z: 0.074,
};

// colour words: the letters AND the obstacle balloon are shown in this colour
const COLOURS = [
  { word: 'RED',    col: '#e23b2e' },
  { word: 'ORANGE', col: '#f0851f' },
  { word: 'YELLOW', col: '#f3c200' },
  { word: 'GREEN',  col: '#36a64a' },
  { word: 'BLUE',   col: '#2f74d0' },
  { word: 'PURPLE', col: '#8a4bd0' },
  { word: 'PINK',   col: '#ec6aa8' },
  { word: 'WHITE',  col: '#ffffff' },
];

// each picker row: single-letter sets build outward from the commonest letters,
// then two word themes (colours, animals)
const ROWS = [
  { type: 'letters', label: 'E T A O',       letters: 'ETAO' },
  { type: 'letters', label: '+ I N',         letters: 'ETAOIN' },
  { type: 'letters', label: '+ S H R L',     letters: 'ETAOINSHRL' },
  { type: 'letters', label: '+ D C U M W F', letters: 'ETAOINSHRLDCUMWF' },
  { type: 'letters', label: 'all 26',        letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
  { type: 'colours', label: '🎨 Colours' },
  { type: 'animals', label: '🦁 Animals' },
];

const SPEEDS = [
  { label: 'Slow',      icon: '🐢', speed: 2.6 },
  { label: 'Medium',    icon: '🐇', speed: 3.8 },
  { label: 'Fast',      icon: '🐎', speed: 5.4 },
  { label: 'Super',     icon: '🚀', speed: 7.6 },
  { label: 'Lightning', icon: '⚡', speed: 11.0 },
];

// ---------- fierce little animal obstacles ----------
const ANIMALS = [
  { word: 'LION', svg: `<svg width="72" height="70" viewBox="0 0 72 70">
      <g fill="#cf8a3a"><circle cx="36" cy="38" r="31"/>
      <circle cx="9" cy="30" r="8"/><circle cx="63" cy="30" r="8"/>
      <circle cx="16" cy="13" r="8"/><circle cx="56" cy="13" r="8"/><circle cx="36" cy="7" r="8"/>
      <circle cx="12" cy="50" r="8"/><circle cx="60" cy="50" r="8"/>
      <circle cx="28" cy="65" r="7"/><circle cx="44" cy="65" r="7"/></g>
      <circle cx="36" cy="40" r="21" fill="#f4cd84"/>
      <path d="M22 32 L34 37 M50 32 L38 37" stroke="#7a4a18" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="29" cy="40" r="3.2" fill="#3a2c20"/><circle cx="43" cy="40" r="3.2" fill="#3a2c20"/>
      <path d="M33 47 L39 47 L36 51 Z" fill="#7a4a18"/>
      <path d="M36 51 q-5 4 -9 2 M36 51 q5 4 9 2" stroke="#7a4a18" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M30 53 L33 58 L27 57 Z" fill="#fff"/><path d="M42 53 L45 57 L39 58 Z" fill="#fff"/>
    </svg>` },
  { word: 'BEAR', svg: `<svg width="68" height="70" viewBox="0 0 68 70">
      <circle cx="16" cy="16" r="11" fill="#8a6240"/><circle cx="52" cy="16" r="11" fill="#8a6240"/>
      <circle cx="16" cy="16" r="5" fill="#b88a5e"/><circle cx="52" cy="16" r="5" fill="#b88a5e"/>
      <circle cx="34" cy="40" r="27" fill="#9a6e48"/>
      <path d="M22 32 L31 36 M46 32 L37 36" stroke="#5a3a1e" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="26" cy="39" r="3.2" fill="#3a2c20"/><circle cx="42" cy="39" r="3.2" fill="#3a2c20"/>
      <ellipse cx="34" cy="48" rx="13" ry="10" fill="#e6cba6"/>
      <ellipse cx="34" cy="45" rx="4" ry="3" fill="#3a2c20"/>
      <path d="M34 48 q-5 5 -10 3 M34 48 q5 5 10 3" stroke="#5a3a1e" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M28 51 L31 56 L25 55 Z" fill="#fff"/><path d="M40 51 L43 55 L37 56 Z" fill="#fff"/>
    </svg>` },
  { word: 'FOX', svg: `<svg width="66" height="68" viewBox="0 0 66 68">
      <path d="M10 8 L26 26 L8 34 Z" fill="#e0712f"/><path d="M56 8 L40 26 L58 34 Z" fill="#e0712f"/>
      <path d="M13 13 L23 24 L13 28 Z" fill="#3a2c20"/><path d="M53 13 L43 24 L53 28 Z" fill="#3a2c20"/>
      <path d="M33 18 Q58 24 33 64 Q8 24 33 18 Z" fill="#e0712f"/>
      <path d="M33 40 Q46 44 33 64 Q20 44 33 40 Z" fill="#f6e3cf"/>
      <path d="M22 30 L31 34 M44 30 L35 34" stroke="#a04a14" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="26" cy="37" r="3.2" fill="#3a2c20"/><circle cx="40" cy="37" r="3.2" fill="#3a2c20"/>
      <path d="M30 49 L36 49 L33 54 Z" fill="#3a2c20"/>
      <path d="M33 54 q-4 4 -8 3 M33 54 q4 4 8 3" stroke="#a04a14" stroke-width="2.3" fill="none" stroke-linecap="round"/>
    </svg>` },
  { word: 'FROG', svg: `<svg width="70" height="62" viewBox="0 0 70 62">
      <circle cx="17" cy="16" r="13" fill="#6cbf52"/><circle cx="53" cy="16" r="13" fill="#6cbf52"/>
      <circle cx="17" cy="14" r="6" fill="#fff"/><circle cx="53" cy="14" r="6" fill="#fff"/>
      <circle cx="18" cy="15" r="3.2" fill="#1f3a1a"/><circle cx="54" cy="15" r="3.2" fill="#1f3a1a"/>
      <path d="M8 8 L18 13 M62 8 L52 13" stroke="#3f7a30" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M6 30 Q35 14 64 30 Q60 56 35 56 Q10 56 6 30 Z" fill="#7fce63"/>
      <path d="M16 42 Q35 56 54 42" stroke="#3f7a30" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M22 43 L26 48 L18 48 Z" fill="#fff"/><path d="M48 43 L52 48 L44 48 Z" fill="#fff"/>
    </svg>` },
  { word: 'OWL', svg: `<svg width="64" height="70" viewBox="0 0 64 70">
      <path d="M8 6 L20 20 L6 24 Z" fill="#7a5a8a"/><path d="M56 6 L44 20 L58 24 Z" fill="#7a5a8a"/>
      <ellipse cx="32" cy="40" rx="26" ry="28" fill="#8a6aa0"/>
      <ellipse cx="32" cy="42" rx="18" ry="22" fill="#b89ec8"/>
      <circle cx="22" cy="34" r="11" fill="#fff"/><circle cx="42" cy="34" r="11" fill="#fff"/>
      <circle cx="23" cy="35" r="5" fill="#3a2c20"/><circle cx="41" cy="35" r="5" fill="#3a2c20"/>
      <path d="M14 22 L26 28 M50 22 L38 28" stroke="#4a3458" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M28 42 L36 42 L32 50 Z" fill="#f0a83a"/>
      <path d="M16 56 q8 8 16 0 q8 8 16 0" stroke="#6a4a7a" stroke-width="3" fill="none" stroke-linecap="round"/>
    </svg>` },
  { word: 'BEE', svg: `<svg width="66" height="62" viewBox="0 0 66 62">
      <ellipse cx="20" cy="20" rx="16" ry="13" fill="#dfe7f2" opacity="0.85"/>
      <ellipse cx="46" cy="20" rx="16" ry="13" fill="#dfe7f2" opacity="0.85"/>
      <ellipse cx="33" cy="40" rx="22" ry="19" fill="#f3c200"/>
      <path d="M20 30 q13 8 26 0 M16 42 q17 9 34 0 M22 53 q11 5 22 0" stroke="#3a2c20" stroke-width="5" fill="none"/>
      <path d="M24 33 L31 36 M42 33 L35 36" stroke="#3a2c20" stroke-width="3" stroke-linecap="round"/>
      <circle cx="27" cy="39" r="3" fill="#3a2c20"/><circle cx="39" cy="39" r="3" fill="#3a2c20"/>
      <path d="M28 46 q5 3 10 0" stroke="#3a2c20" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="M29 8 L33 14 M37 8 L33 14" stroke="#3a2c20" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="29" cy="7" r="2.5" fill="#3a2c20"/><circle cx="37" cy="7" r="2.5" fill="#3a2c20"/>
    </svg>` },
];

// a coloured balloon for the colour level
function balloonSvg(col) {
  return `<svg width="58" height="74" viewBox="0 0 58 74">
    <ellipse cx="29" cy="30" rx="25" ry="29" fill="${col}" stroke="rgba(0,0,0,0.16)" stroke-width="2"/>
    <path d="M25 57 L33 57 L29 65 Z" fill="${col}"/>
    <path d="M29 65 q-5 5 -2 9" stroke="#9a8a78" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="20" cy="22" rx="6" ry="10" fill="rgba(255,255,255,0.5)"/>
  </svg>`;
}

// ---------- state ----------
let state = 'picker';         // 'picker' | 'playing' | 'over' | 'win'
let level = null;             // { rowId, speedId, type, ... }
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
let levelCount = LETTER_COUNT;
let levelGap = LETTER_GAP;
let jumpsLeft = JUMP_BUDGET;
let jumpsUsedThisLevel = 0;
let fishThisRun = 0;
let scrollSinceSpawn = 0;
let groundX = 0;
let lastFrame = 0;
let fishTimer = 0;
let nextFishIn = 3;
let lastSparkleAt = 0;
let lastWord = '';

let totalFish = parseInt(localStorage.getItem('cattype-fish') || '0', 10);
let muted = localStorage.getItem('cattype-muted') === '1';

// best stars per level cell, keyed "rowId-speedId"
function bestStars(rowId, speedId) {
  return parseInt(localStorage.getItem(`cattype-stars-${rowId}-${speedId}`) || '0', 10);
}
function saveStars(rowId, speedId, stars) {
  if (stars > bestStars(rowId, speedId)) {
    localStorage.setItem(`cattype-stars-${rowId}-${speedId}`, String(stars));
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
  tick: () => tone(660, 880, 0.06, 'sine', 0.16),       // correct letter within a word
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

// ---------- single-letter obstacle art (cosmetic; varies with the sky) ----------
const OBSTACLE_TYPES = [
  { phases: ['day', 'gold', 'sunset', 'dawn'], w: 64,
    svg: `<svg width="64" height="86" viewBox="0 0 64 86">
      <ellipse cx="32" cy="40" rx="15" ry="26" fill="#69b35e"/>
      <path d="M17 36 q-12 -2 -10 -14" stroke="#69b35e" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M47 30 q12 -3 11 -16" stroke="#69b35e" stroke-width="10" fill="none" stroke-linecap="round"/>
      <circle cx="32" cy="14" r="7" fill="#ff8fab"/><circle cx="32" cy="14" r="3" fill="#fff3b0"/>
      <path d="M14 62 L50 62 L46 84 L18 84 Z" fill="#d9714e"/>
      <rect x="11" y="58" width="42" height="9" rx="4.5" fill="#c4593a"/>
    </svg>` },
  { phases: ['day', 'gold', 'dawn'], w: 62,
    svg: `<svg width="62" height="58" viewBox="0 0 62 58">
      <rect x="22" y="28" width="18" height="28" rx="8" fill="#fdf3e3"/>
      <path d="M3 30 Q31 -14 59 30 Q31 40 3 30 Z" fill="#e0573f"/>
      <circle cx="20" cy="18" r="4.5" fill="#fdf3e3"/>
      <circle cx="38" cy="11" r="3.6" fill="#fdf3e3"/>
      <circle cx="46" cy="22" r="3.2" fill="#fdf3e3"/>
    </svg>` },
  { phases: ['day', 'gold', 'sunset', 'dawn'], w: 80,
    svg: `<svg width="80" height="48" viewBox="0 0 80 48">
      <ellipse cx="24" cy="32" rx="22" ry="16" fill="#5da356"/>
      <ellipse cx="54" cy="30" rx="24" ry="18" fill="#6db463"/>
      <ellipse cx="40" cy="22" rx="18" ry="14" fill="#7cc46f"/>
      <circle cx="30" cy="24" r="4" fill="#e0573f"/><circle cx="50" cy="20" r="4" fill="#e0573f"/>
      <circle cx="42" cy="34" r="4" fill="#e0573f"/><circle cx="60" cy="32" r="4" fill="#e0573f"/>
    </svg>` },
  { phases: ['day', 'gold', 'dawn', 'night'], w: 66,
    svg: `<svg width="66" height="54" viewBox="0 0 66 54">
      <rect x="6" y="6" width="10" height="48" rx="5" fill="#c89564"/>
      <rect x="28" y="2" width="10" height="52" rx="5" fill="#b9854f"/>
      <rect x="50" y="6" width="10" height="48" rx="5" fill="#c89564"/>
      <rect x="0" y="14" width="66" height="8" rx="4" fill="#d9a872"/>
      <rect x="0" y="34" width="66" height="8" rx="4" fill="#d9a872"/>
    </svg>` },
  { phases: ['day', 'dawn'], w: 70,
    svg: `<svg width="70" height="64" viewBox="0 0 70 64">
      <path d="M16 64 Q14 40 18 24 M35 64 Q35 36 33 14 M54 64 Q56 42 52 28" stroke="#6db463" stroke-width="5" fill="none" stroke-linecap="round"/>
      <g><circle cx="18" cy="18" r="6" fill="#fff" transform="translate(-7,0)"/><circle cx="18" cy="18" r="6" fill="#fff" transform="translate(7,0)"/><circle cx="18" cy="18" r="6" fill="#fff" transform="translate(0,-7)"/><circle cx="18" cy="18" r="6" fill="#fff" transform="translate(0,7)"/><circle cx="18" cy="18" r="5.5" fill="#ffd166"/></g>
      <g><circle cx="33" cy="9" r="6" fill="#ff9ec4" transform="translate(-7,0)"/><circle cx="33" cy="9" r="6" fill="#ff9ec4" transform="translate(7,0)"/><circle cx="33" cy="9" r="6" fill="#ff9ec4" transform="translate(0,-7)"/><circle cx="33" cy="9" r="6" fill="#ff9ec4" transform="translate(0,7)"/><circle cx="33" cy="9" r="5.5" fill="#fff3b0"/></g>
      <g><circle cx="52" cy="22" r="6" fill="#ffd166" transform="translate(-7,0)"/><circle cx="52" cy="22" r="6" fill="#ffd166" transform="translate(7,0)"/><circle cx="52" cy="22" r="6" fill="#ffd166" transform="translate(0,-7)"/><circle cx="52" cy="22" r="6" fill="#ffd166" transform="translate(0,7)"/><circle cx="52" cy="22" r="5.5" fill="#e0573f"/></g>
    </svg>` },
  { phases: ['gold', 'sunset'], w: 84,
    svg: `<svg width="84" height="78" viewBox="0 0 62 58">
      <rect x="22" y="28" width="18" height="28" rx="8" fill="#fdf3e3"/>
      <path d="M3 30 Q31 -14 59 30 Q31 40 3 30 Z" fill="#c4538a"/>
      <circle cx="20" cy="18" r="4.5" fill="#fdf3e3"/>
      <circle cx="38" cy="11" r="3.6" fill="#fdf3e3"/>
      <circle cx="46" cy="22" r="3.2" fill="#fdf3e3"/>
    </svg>` },
  { phases: ['night'], w: 78,
    svg: `<svg width="78" height="56" viewBox="0 0 78 56">
      <ellipse cx="39" cy="40" rx="36" ry="16" fill="#26403a"/>
      <ellipse cx="39" cy="28" rx="26" ry="16" fill="#33524a"/>
      <circle class="ff" cx="20" cy="24" r="4" fill="#ffe97a"/>
      <circle class="ff ff2" cx="46" cy="14" r="3.5" fill="#fff3a8"/>
      <circle class="ff ff3" cx="60" cy="32" r="4" fill="#ffe97a"/>
      <circle class="ff ff4" cx="34" cy="34" r="3" fill="#fff3a8"/>
    </svg>` },
  { phases: ['night'], w: 62,
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
  let r = Math.random() * total;
  let letter = set[set.length - 1];
  for (const ch of set) { r -= FREQ[ch]; if (r <= 0) { letter = ch; break; } }
  return letter;
}

// pick the next obstacle's word + art, depending on the level type
function pickObstacle() {
  if (level.type === 'letters') {
    const phase = phaseNow();
    const pool = OBSTACLE_TYPES.filter(t => t.phases.includes(phase));
    const type = pool[Math.floor(Math.random() * pool.length)];
    return { word: pickLetter(), svg: type.svg, w: type.w, theme: 'letter' };
  }
  if (level.type === 'colours') {
    let c;
    do { c = COLOURS[Math.floor(Math.random() * COLOURS.length)]; }
    while (c.word === lastWord && COLOURS.length > 1);
    lastWord = c.word;
    return { word: c.word, svg: balloonSvg(c.col), w: 58, theme: 'colour', col: c.col };
  }
  // animals
  let a;
  do { a = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]; }
  while (a.word === lastWord && ANIMALS.length > 1);
  lastWord = a.word;
  return { word: a.word, svg: a.svg, w: 68, theme: 'animal' };
}

// build the floating badge: a single circle for letters, spans for words
function buildBadge(spec) {
  if (spec.word.length === 1) {
    const el = document.createElement('div');
    el.className = 'ob-letter';
    el.textContent = spec.word;
    return { badgeEl: el, spanEls: null };
  }
  const el = document.createElement('div');
  el.className = 'ob-word theme-' + spec.theme;
  const spanEls = [];
  for (const ch of spec.word) {
    const s = document.createElement('span');
    s.className = 'wl';
    s.textContent = ch;
    if (spec.theme === 'colour') s.style.color = spec.col;
    el.appendChild(s);
    spanEls.push(s);
  }
  spanEls[0].classList.add('next');
  return { badgeEl: el, spanEls };
}

function spawnObstacle() {
  const spec = pickObstacle();
  const el = document.createElement('div');
  el.className = 'obstacle';
  el.innerHTML = spec.svg;
  const { badgeEl, spanEls } = buildBadge(spec);
  el.appendChild(badgeEl);
  const x = container.clientWidth + 40;
  el.style.transform = `translateX(${x}px)`;
  container.appendChild(el);
  obstacles.push({ el, x, w: spec.w, word: spec.word, typed: 0, badgeEl, spanEls, cleared: false });
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
  // a fish gives back a jump: leaping to catch one costs nothing on balance
  jumpsLeft++;
  renderPaws();
  pawsBadgeEl.classList.remove('bump');
  void pawsBadgeEl.offsetWidth;
  pawsBadgeEl.classList.add('bump');
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

function letterPop(text, x, bottomY) {
  const s = document.createElement('div');
  s.className = 'letter-pop';
  s.textContent = text;
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
  letterPop(ob.word, ob.x + ob.w / 2 - ob.word.length * 9, 120);
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
  ob.badgeEl.classList.remove('wrong');
  void ob.badgeEl.offsetWidth;
  ob.badgeEl.classList.add('wrong');
  setTimeout(() => ob.badgeEl.classList.remove('wrong'), 400);
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
  if (ob.word[ob.typed] !== letter) { flashWrong(ob); return; }
  ob.typed++;
  if (ob.spanEls) {
    ob.spanEls[ob.typed - 1].classList.remove('next');
    ob.spanEls[ob.typed - 1].classList.add('done');
    if (ob.spanEls[ob.typed]) ob.spanEls[ob.typed].classList.add('next');
  }
  if (ob.typed >= ob.word.length) smashObstacle(ob);
  else sfx.tick();
}

function markCleared() {
  clearedCount++;
  updateProgress();
  if (clearedCount >= levelCount) winLevel();
}

function updateProgress() {
  progressEl.textContent = `${clearedCount}/${levelCount}`;
}

function renderPaws() {
  // always show at least the base budget; grow if fish have topped it up
  const slots = Math.max(JUMP_BUDGET, jumpsLeft);
  let html = '';
  for (let i = 0; i < slots; i++) {
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
  ROWS.forEach((row, ri) => {
    const wordRow = row.type !== 'letters';
    html += `<div class="lv-row-wrap${wordRow ? ' word-row' : ''}"><div class="lv-rowlabel">${row.label}</div>`;
    SPEEDS.forEach((sp, pi) => {
      const stars = bestStars(ri, pi);
      const dots = '★★★☆☆☆'.slice(3 - stars, 6 - stars);
      html += `<button class="lv-cell" data-row="${ri}" data-speed="${pi}">
        <span class="lv-stars">${dots}</span></button>`;
    });
    html += '</div>';
  });
  lvGrid.innerHTML = html;
  lvGrid.querySelectorAll('.lv-cell').forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      ensureAudio();
      startLevel(parseInt(btn.dataset.row, 10), parseInt(btn.dataset.speed, 10));
    });
  });
}

function startLevel(rowId, speedId) {
  const row = ROWS[rowId];
  level = {
    rowId, speedId,
    type: row.type,
    letters: row.letters,
    speed: SPEEDS[speedId].speed,
  };
  speed = level.speed;
  levelCount = row.type === 'letters' ? LETTER_COUNT : WORD_COUNT;
  levelGap = row.type === 'letters' ? LETTER_GAP : WORD_GAP;
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
  scrollSinceSpawn = levelGap; // spawn the first obstacle promptly
  fishTimer = 0;
  nextFishIn = 3 + Math.random() * 2;
  lastWord = '';
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
  overProgressEl.textContent = `You smashed ${clearedCount} of ${levelCount}!`;
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
  const prevBest = bestStars(level.rowId, level.speedId);
  saveStars(level.rowId, level.speedId, stars);
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
  if (state === 'over' && level) startLevel(level.rowId, level.speedId);
});
againBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  startLevel(level.rowId, level.speedId);
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
    if (spawnedCount < levelCount && scrollSinceSpawn >= levelGap) {
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
      if (ob.x < -200) { ob.el.remove(); obstacles.splice(i, 1); }
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
      if (cr.x < -200) { cr.el.remove(); craters.splice(i, 1); }
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
