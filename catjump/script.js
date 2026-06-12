// Cat Jump 2 — a friendly runner for small people.
// Same game as catjump: run, jump over things, survive as long as you can.

const container = document.getElementById('game-container');
const catEl = document.getElementById('cat');
const catSvg = document.getElementById('cat-svg');
const timerEl = document.getElementById('timer');
const starCountEl = document.getElementById('star-count');
const starBadgeEl = document.getElementById('star-badge');
const fishCountEl = document.getElementById('fish-count');
const fishBadgeEl = document.getElementById('fish-badge');
const overFishEl = document.getElementById('over-fish');
const soundBtn = document.getElementById('sound-btn');
const timerBtn = document.getElementById('timer-btn');
const timerPicker = document.getElementById('timer-picker');
const timesupScreen = document.getElementById('timesup-screen');
const startScreen = document.getElementById('start-screen');
const overScreen = document.getElementById('over-screen');
const overTimeEl = document.getElementById('over-time');
const overStarsEl = document.getElementById('over-stars');
const bestLineEl = document.getElementById('best-line');
const titleEl = document.getElementById('title');
const totalStarsStartEl = document.getElementById('total-stars-start');
const hillsBack = document.getElementById('hills-back');
const hillsFront = document.getElementById('hills-front');
const ground = document.getElementById('ground');
const starsLayer = document.getElementById('stars-layer');
const leaderboardEl = document.getElementById('leaderboard');
const lbListEl = document.getElementById('lb-list');

// ---------- tuning ----------
const GROUND_Y = 70;          // cat's resting bottom, px
const GRAVITY = 0.5;          // floaty jump = forgiving for little fingers
const JUMP_STRENGTH = 17;
const START_SPEED = 4.5;
const MAX_SPEED = 6.8;
const SPEED_RAMP = 0.0015;    // per frame
const STAR_EVERY = 6;         // seconds per star
const DOUBLE_JUMP_STRENGTH = 13;
const JUMP_BUFFER_MS = 160;   // pressing just before landing still jumps
const RESTART_LOCKOUT_MS = 700;
const DAY_CYCLE = 90;         // seconds for a full day->night->day

// ---------- state ----------
let state = 'start';          // 'start' | 'playing' | 'over'
let catY = GROUND_Y;
let velocity = 0;
let airborne = false;
let jumpsUsed = 0;
let bufferedJumpAt = 0;
let sessionScores = [];       // this session's run times, cleared on refresh
let speed = START_SPEED;
let playTime = 0;             // seconds survived this run
let worldTime = 0;            // keeps ticking across runs, drives day/night
let starsThisRun = 0;
let nextStarAt = STAR_EVERY;
let obstacles = [];
let items = [];               // fish and yarn balls
let platforms = [];           // rideable clouds
let standingOn = null;        // cloud the cat is standing on, or null = ground
let cloudTimer = 0;
let nextCloudIn = 7;
let fishThisRun = 0;
let invincibleUntil = 0;      // playTime seconds when yarn power ends
let fishTimer = 0;
let nextFishIn = 2.5;
let yarnTimer = 0;
let nextYarnIn = 14;
let groundX = 0;
let lastFrame = 0;
let spawnTimer = 0;
let nextSpawnIn = 2.2;        // seconds
let gameOverAt = 0;
let lastSparkleAt = 0;

let best = parseFloat(localStorage.getItem('catjump2-best') || '0');
let totalStars = parseInt(localStorage.getItem('catjump2-stars') || '0', 10);
let totalFish = parseInt(localStorage.getItem('catjump2-fish') || '0', 10);
let muted = localStorage.getItem('catjump2-muted') === '1';

// ---------- session timer ----------
let sessionLimitMs = 0;   // 0 = off; set in ms when parent picks a duration
let sessionStartMs = 0;   // wall-clock ms when the limit was set
let sessionExpired = false;
let pickerOpen = false;

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
  doubleJump: () => tone(480, 960, 0.2, 'triangle', 0.25),
  star: () => { tone(880, 880, 0.1, 'sine', 0.2); tone(1320, 1320, 0.16, 'sine', 0.2, 0.09); },
  bump: () => tone(170, 55, 0.35, 'sawtooth', 0.22),
  bloop: () => { tone(520, 880, 0.12, 'sine', 0.22); tone(780, 1240, 0.14, 'sine', 0.18, 0.08); },
  power: () => { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.14, 'square', 0.12, i * 0.09)); },
  smash: () => { tone(300, 60, 0.2, 'square', 0.2); tone(150, 40, 0.25, 'sawtooth', 0.15, 0.02); },
  poff: () => tone(260, 150, 0.16, 'sine', 0.2),
  fanfare: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.18, 'triangle', 0.22, i * 0.13)); },
};

function updateSoundBtn() {
  soundBtn.textContent = muted ? '🔇' : '🔊';
}

soundBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  muted = !muted;
  localStorage.setItem('catjump2-muted', muted ? '1' : '0');
  updateSoundBtn();
});

// ---------- session leaderboard ----------
function renderLeaderboard(lastEntry) {
  if (sessionScores.length === 0) return;
  leaderboardEl.classList.remove('hidden');
  const top = [...sessionScores].sort((a, b) => b.time - a.time).slice(0, 5);
  const ranks = ['🥇', '🥈', '🥉', '4.', '5.'];
  lbListEl.innerHTML = top.map((s, i) => {
    const cls = s === lastEntry ? 'lb-row current' : 'lb-row';
    const fish = s.fish > 0 ? ` · 🐟${s.fish}` : '';
    return `<div class="${cls}">${ranks[i]} ${s.time.toFixed(1)} s${fish}</div>`;
  }).join('');
}

// ---------- timer UI ----------
function updateTimerBtn() {
  if (!sessionLimitMs) {
    timerBtn.textContent = '⏱';
    timerBtn.classList.remove('active', 'warning');
    return;
  }
  const remaining = Math.max(0, sessionLimitMs - (Date.now() - sessionStartMs));
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  timerBtn.textContent = `${mins}:${String(secs).padStart(2, '0')}`;
  timerBtn.classList.toggle('warning', remaining < 60000);
  timerBtn.classList.toggle('active', remaining >= 60000);
}

function openPicker() {
  if (sessionExpired) return;
  pickerOpen = true;
  timerPicker.classList.remove('hidden');
  // mark whichever option is currently selected
  timerPicker.querySelectorAll('.timer-opt').forEach(btn => {
    const mins = parseInt(btn.dataset.mins, 10);
    btn.classList.toggle('selected', sessionLimitMs === mins * 60000);
  });
}

function closePicker() {
  pickerOpen = false;
  timerPicker.classList.add('hidden');
}

timerBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  pickerOpen ? closePicker() : openPicker();
});

timerPicker.querySelectorAll('.timer-opt').forEach(btn => {
  btn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    const mins = parseInt(btn.dataset.mins, 10);
    if (mins === 0) {
      sessionLimitMs = 0;
      sessionStartMs = 0;
    } else {
      sessionLimitMs = mins * 60000;
      sessionStartMs = Date.now();
    }
    updateTimerBtn();
    closePicker();
  });
});

// dismiss picker by tapping outside it
timerPicker.addEventListener('pointerdown', (e) => {
  if (e.target === timerPicker) closePicker();
});

function checkSessionTimer() {
  if (!sessionLimitMs || sessionExpired) return;
  if (Date.now() - sessionStartMs >= sessionLimitMs) {
    sessionExpired = true;
    state = 'timesup';
    catSvg.classList.remove('running', 'jumping');
    catSvg.classList.add('oops');
    overScreen.classList.add('hidden');
    timesupScreen.classList.remove('hidden');
  }
  updateTimerBtn();
}

// ---------- day / night palette ----------
const PALETTES = {
  day:    { skyTop: [154, 220, 240], skyBot: [232, 248, 244], hillBack: [184, 224, 154], hillFront: [140, 200, 112], grass: [124, 188, 96],  dirt: [226, 188, 140], stars: 0,   sun: 1,   cloud: 1 },
  gold:   { skyTop: [168, 214, 212], skyBot: [255, 240, 204], hillBack: [196, 218, 142], hillFront: [152, 192, 104], grass: [136, 180, 92],  dirt: [222, 182, 132], stars: 0,   sun: 1,   cloud: 1 },
  sunset: { skyTop: [255, 158, 116], skyBot: [255, 226, 186], hillBack: [212, 186, 122], hillFront: [176, 148, 94],  grass: [158, 148, 86],  dirt: [206, 164, 120], stars: 0.1, sun: 0.85, cloud: 0.9 },
  night:  { skyTop: [40, 50, 94],    skyBot: [94, 110, 162],  hillBack: [70, 94, 126],   hillFront: [48, 70, 100],   grass: [56, 88, 96],    dirt: [76, 80, 108],   stars: 1,   sun: 0,   cloud: 0.35 },
  dawn:   { skyTop: [186, 168, 224], skyBot: [255, 216, 198], hillBack: [168, 188, 150], hillFront: [126, 164, 110], grass: [112, 158, 92],  dirt: [200, 172, 134], stars: 0.2, sun: 0.5, cloud: 0.8 },
};

// (fraction of cycle, palette) keypoints
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
// (layers translate up to one tile-width, so we need viewport + 1 tile of coverage)
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

// ---------- obstacles ----------
// each type lists the sky phases it appears in, so the scenery
// changes as day turns to sunset and night
const OBSTACLE_TYPES = [
  { // friendly potted cactus
    phases: ['day', 'gold', 'sunset', 'dawn'],
    w: 64, h: 86,
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
  { // spotty mushroom
    phases: ['day', 'gold', 'dawn'],
    w: 62, h: 58,
    svg: `<svg width="62" height="58" viewBox="0 0 62 58">
      <rect x="22" y="28" width="18" height="28" rx="8" fill="#fdf3e3"/>
      <path d="M3 30 Q31 -14 59 30 Q31 40 3 30 Z" fill="#e0573f"/>
      <circle cx="20" cy="18" r="4.5" fill="#fdf3e3"/>
      <circle cx="38" cy="11" r="3.6" fill="#fdf3e3"/>
      <circle cx="46" cy="22" r="3.2" fill="#fdf3e3"/>
    </svg>` },
  { // berry bush
    phases: ['day', 'gold', 'sunset', 'dawn'],
    w: 80, h: 48,
    svg: `<svg width="80" height="48" viewBox="0 0 80 48">
      <ellipse cx="24" cy="32" rx="22" ry="16" fill="#5da356"/>
      <ellipse cx="54" cy="30" rx="24" ry="18" fill="#6db463"/>
      <ellipse cx="40" cy="22" rx="18" ry="14" fill="#7cc46f"/>
      <circle cx="30" cy="24" r="4" fill="#e0573f"/>
      <circle cx="50" cy="20" r="4" fill="#e0573f"/>
      <circle cx="42" cy="34" r="4" fill="#e0573f"/>
      <circle cx="60" cy="32" r="4" fill="#e0573f"/>
    </svg>` },
  { // little wooden fence
    phases: ['day', 'gold', 'dawn', 'night'],
    w: 66, h: 54,
    svg: `<svg width="66" height="54" viewBox="0 0 66 54">
      <rect x="6" y="6" width="10" height="48" rx="5" fill="#c89564"/>
      <rect x="28" y="2" width="10" height="52" rx="5" fill="#b9854f"/>
      <rect x="50" y="6" width="10" height="48" rx="5" fill="#c89564"/>
      <rect x="0" y="14" width="66" height="8" rx="4" fill="#d9a872"/>
      <rect x="0" y="34" width="66" height="8" rx="4" fill="#d9a872"/>
    </svg>` },
  { // tall daisies
    phases: ['day', 'dawn'],
    w: 70, h: 64,
    svg: `<svg width="70" height="64" viewBox="0 0 70 64">
      <path d="M16 64 Q14 40 18 24 M35 64 Q35 36 33 14 M54 64 Q56 42 52 28" stroke="#6db463" stroke-width="5" fill="none" stroke-linecap="round"/>
      <g><circle cx="18" cy="18" r="6" fill="#fff" transform="translate(-7,0)"/><circle cx="18" cy="18" r="6" fill="#fff" transform="translate(7,0)"/><circle cx="18" cy="18" r="6" fill="#fff" transform="translate(0,-7)"/><circle cx="18" cy="18" r="6" fill="#fff" transform="translate(0,7)"/><circle cx="18" cy="18" r="5.5" fill="#ffd166"/></g>
      <g><circle cx="33" cy="9" r="6" fill="#ff9ec4" transform="translate(-7,0)"/><circle cx="33" cy="9" r="6" fill="#ff9ec4" transform="translate(7,0)"/><circle cx="33" cy="9" r="6" fill="#ff9ec4" transform="translate(0,-7)"/><circle cx="33" cy="9" r="6" fill="#ff9ec4" transform="translate(0,7)"/><circle cx="33" cy="9" r="5.5" fill="#fff3b0"/></g>
      <g><circle cx="52" cy="22" r="6" fill="#ffd166" transform="translate(-7,0)"/><circle cx="52" cy="22" r="6" fill="#ffd166" transform="translate(7,0)"/><circle cx="52" cy="22" r="6" fill="#ffd166" transform="translate(0,-7)"/><circle cx="52" cy="22" r="6" fill="#ffd166" transform="translate(0,7)"/><circle cx="52" cy="22" r="5.5" fill="#e0573f"/></g>
    </svg>` },
  { // big sunset mushroom (same drawing, rendered larger)
    phases: ['gold', 'sunset'],
    w: 84, h: 78,
    svg: `<svg width="84" height="78" viewBox="0 0 62 58">
      <rect x="22" y="28" width="18" height="28" rx="8" fill="#fdf3e3"/>
      <path d="M3 30 Q31 -14 59 30 Q31 40 3 30 Z" fill="#c4538a"/>
      <circle cx="20" cy="18" r="4.5" fill="#fdf3e3"/>
      <circle cx="38" cy="11" r="3.6" fill="#fdf3e3"/>
      <circle cx="46" cy="22" r="3.2" fill="#fdf3e3"/>
    </svg>` },
  { // firefly bush
    phases: ['night'],
    w: 78, h: 56,
    svg: `<svg width="78" height="56" viewBox="0 0 78 56">
      <ellipse cx="39" cy="40" rx="36" ry="16" fill="#26403a"/>
      <ellipse cx="39" cy="28" rx="26" ry="16" fill="#33524a"/>
      <circle class="ff" cx="20" cy="24" r="4" fill="#ffe97a"/>
      <circle class="ff ff2" cx="46" cy="14" r="3.5" fill="#fff3a8"/>
      <circle class="ff ff3" cx="60" cy="32" r="4" fill="#ffe97a"/>
      <circle class="ff ff4" cx="34" cy="34" r="3" fill="#fff3a8"/>
    </svg>` },
  { // glowing night mushroom
    phases: ['night'],
    w: 62, h: 58,
    svg: `<svg width="62" height="58" viewBox="0 0 62 58">
      <rect x="22" y="28" width="18" height="28" rx="8" fill="#cfe8e0"/>
      <path d="M3 30 Q31 -14 59 30 Q31 40 3 30 Z" fill="#4ec9b0"/>
      <circle class="ff" cx="20" cy="18" r="4.5" fill="#eafff8"/>
      <circle class="ff ff3" cx="38" cy="11" r="3.6" fill="#eafff8"/>
      <circle class="ff ff2" cx="46" cy="22" r="3.2" fill="#eafff8"/>
    </svg>` },
];

// which palette dominates the sky right now
function phaseNow() {
  const frac = (worldTime % DAY_CYCLE) / DAY_CYCLE;
  let i = 0;
  while (i < CYCLE.length - 2 && frac >= CYCLE[i + 1][0]) i++;
  const t = (frac - CYCLE[i][0]) / (CYCLE[i + 1][0] - CYCLE[i][0]);
  return t < 0.5 ? CYCLE[i][1] : CYCLE[i + 1][1];
}

function spawnObstacle() {
  const phase = phaseNow();
  const pool = OBSTACLE_TYPES.filter(t => t.phases.includes(phase));
  const type = pool[Math.floor(Math.random() * pool.length)];
  const el = document.createElement('div');
  el.className = 'obstacle';
  el.innerHTML = type.svg;
  const x = container.clientWidth + 40;
  el.style.transform = `translateX(${x}px)`;
  container.appendChild(el);
  obstacles.push({ el, x, w: type.w });
}

function scheduleNextSpawn() {
  // gap shrinks a little as the game speeds up, but always stays jumpable
  const min = 1.15, max = 2.4 - (speed - START_SPEED) * 0.15;
  nextSpawnIn = min + Math.random() * Math.max(max - min, 0.4);
  spawnTimer = 0;
}

// ---------- collectibles ----------
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

const YARN_SVG = `<svg width="44" height="44" viewBox="0 0 44 44">
  <circle cx="22" cy="22" r="20" fill="#ff8fab"/>
  <path d="M4 16 Q22 8 40 16 M4 28 Q22 20 40 28 M8 36 Q24 30 38 33 M8 8 Q22 16 36 8" stroke="#e0648f" stroke-width="3" fill="none" stroke-linecap="round"/>
  <circle cx="22" cy="22" r="6" fill="#ffb3c6"/>
</svg>`;

// keep new items clear of obstacles so fish never lure the cat into a crash
function clearOfObstacles(x) {
  let moved = true;
  while (moved) {
    moved = false;
    for (const ob of obstacles) {
      if (Math.abs(x - ob.x) < 320) { x = ob.x + 380; moved = true; }
    }
  }
  return x;
}

function spawnFishAt(x, y) {
  const [body, dark] = FISH_COLORS[Math.floor(Math.random() * FISH_COLORS.length)];
  const el = document.createElement('div');
  el.className = 'item fish';
  el.innerHTML = fishSvg(body, dark);
  el.style.bottom = y + 'px';
  el.style.transform = `translateX(${x}px)`;
  container.appendChild(el);
  items.push({ el, x, kind: 'fish' });
}

function spawnFish() {
  const x = clearOfObstacles(container.clientWidth + 60);
  // low = little hop, mid = full jump, high = needs a double jump
  const heights = [170, 240, 330];
  const y = heights[Math.floor(Math.random() * heights.length)] + Math.random() * 25;
  spawnFishAt(x, y);
}

// ---------- cloud platforms ----------
const CLOUD_W = 200;

const CLOUD_SVG = `<svg width="200" height="64" viewBox="0 0 200 64">
  <ellipse cx="100" cy="46" rx="94" ry="17" fill="#ffffff"/>
  <circle cx="42" cy="36" r="21" fill="#ffffff"/>
  <circle cx="86" cy="27" r="27" fill="#ffffff"/>
  <circle cx="134" cy="31" r="23" fill="#ffffff"/>
  <circle cx="169" cy="40" r="16" fill="#ffffff"/>
  <ellipse cx="100" cy="54" rx="84" ry="9" fill="#dce8f5"/>
  <circle class="ff" cx="40" cy="12" r="3" fill="#ffd166"/>
  <circle class="ff ff2" cx="100" cy="4" r="3.5" fill="#ffd166"/>
  <circle class="ff ff3" cx="158" cy="14" r="3" fill="#ffd166"/>
</svg>`;

function spawnCloud() {
  const el = document.createElement('div');
  el.className = 'platform';
  el.innerHTML = CLOUD_SVG;
  const surfaceY = 215 + Math.random() * 65; // cat's feet height when standing
  const x = container.clientWidth + 80;
  el.style.bottom = (surfaceY - 36) + 'px';  // feet sink a little into the fluff
  el.style.transform = `translateX(${x}px)`;
  container.appendChild(el);
  platforms.push({ el, x, w: CLOUD_W, top: surfaceY });
  // a fish above most clouds makes them worth visiting
  if (Math.random() < 0.65) spawnFishAt(x + CLOUD_W / 2 - 24, surfaceY + 105);
}

// is the cat far enough over this cloud to stand on it (forgiving edges)
function catOverCloud(p) {
  const left = catEl.offsetLeft;
  return p.x < left + 92 && p.x + p.w > left + 22;
}

function spawnYarn() {
  const el = document.createElement('div');
  el.className = 'item yarn';
  el.innerHTML = YARN_SVG;
  const x = clearOfObstacles(container.clientWidth + 60);
  el.style.bottom = '74px';
  el.style.transform = `translateX(${x}px)`;
  container.appendChild(el);
  items.push({ el, x, kind: 'yarn' });
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

function collectYarn(it) {
  invincibleUntil = playTime + 3;
  catEl.classList.add('power');
  ringAt(it.x + 16, 90);
  for (let i = 0; i < 8; i++) sparkle();
  sfx.power();
}

function smashObstacle(ob) {
  const idx = obstacles.indexOf(ob);
  if (idx >= 0) obstacles.splice(idx, 1);
  puff(ob.x, 90);
  puff(ob.x + 24, 110);
  ringAt(ob.x + 24, 100);
  ob.el.remove();
  sfx.smash();
}

// ---------- little effects ----------
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

function starPop() {
  const s = document.createElement('div');
  s.className = 'star-pop';
  s.textContent = '★';
  s.style.left = (catEl.offsetLeft + 50) + 'px';
  s.style.bottom = (catY + 110) + 'px';
  container.appendChild(s);
  ringAt(catEl.offsetLeft + 75, catY + 130);
  setTimeout(() => s.remove(), 1450);
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

// ---------- collision (forgiving hitboxes) ----------
function hitSomething() {
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

// ---------- game flow ----------
function startRun() {
  obstacles.forEach(o => o.el.remove());
  obstacles = [];
  items.forEach(it => it.el.remove());
  items = [];
  platforms.forEach(p => p.el.remove());
  platforms = [];
  standingOn = null;
  cloudTimer = 0;
  nextCloudIn = 6 + Math.random() * 4;
  catY = GROUND_Y;
  velocity = 0;
  airborne = false;
  speed = START_SPEED;
  playTime = 0;
  starsThisRun = 0;
  fishThisRun = 0;
  invincibleUntil = 0;
  fishTimer = 0;
  nextFishIn = 2.5 + Math.random() * 2;
  yarnTimer = 0;
  nextYarnIn = 12 + Math.random() * 10;
  catEl.classList.remove('power', 'power-ending');
  nextStarAt = STAR_EVERY;
  scheduleNextSpawn();
  nextSpawnIn = 1.8; // a moment to get ready
  starCountEl.textContent = '0';
  fishCountEl.textContent = '0';
  timerEl.textContent = '0.0';
  catSvg.classList.remove('oops');
  catSvg.classList.add('running');
  startScreen.classList.add('hidden');
  overScreen.classList.add('hidden');
  state = 'playing';
}

function endRun() {
  state = 'over';
  gameOverAt = performance.now();
  catSvg.classList.remove('running', 'jumping', 'flip');
  catSvg.classList.add('oops');
  sfx.bump();

  const entry = { time: playTime, fish: fishThisRun };
  sessionScores.push(entry);
  renderLeaderboard(entry);

  totalStars += starsThisRun;
  localStorage.setItem('catjump2-stars', String(totalStars));
  totalFish += fishThisRun;
  localStorage.setItem('catjump2-fish', String(totalFish));
  catEl.classList.remove('power', 'power-ending');

  const isNewBest = playTime > best;
  if (isNewBest) {
    best = playTime;
    localStorage.setItem('catjump2-best', best.toFixed(1));
  }

  overTimeEl.textContent = playTime.toFixed(1) + ' seconds';
  overStarsEl.textContent = starsThisRun > 0 ? '★'.repeat(Math.min(starsThisRun, 12)) : 'Jump longer to win stars!';
  overFishEl.textContent = fishThisRun > 0 ? `🐟 × ${fishThisRun}` : '';
  if (isNewBest) {
    bestLineEl.textContent = '🎉 NEW BEST! 🎉';
    bestLineEl.classList.add('new-best');
    confettiBurst();
    setTimeout(() => sfx.fanfare(), 300);
  } else {
    bestLineEl.textContent = 'Best: ' + best.toFixed(1) + ' s';
    bestLineEl.classList.remove('new-best');
  }
  overScreen.classList.remove('hidden');
}

// land on the ground (platform = null) or on a cloud
function landAt(y, platform) {
  catY = y;
  airborne = false;
  jumpsUsed = 0;
  standingOn = platform;
  catSvg.classList.remove('jumping', 'flip');
  catSvg.classList.add('running');
  catEl.classList.remove('landed');
  void catEl.offsetWidth; // restart squash animation
  catEl.classList.add('landed');
  puff(catEl.offsetLeft + 20, y - 6);
  if (platform) sfx.poff();
  if (performance.now() - bufferedJumpAt < JUMP_BUFFER_MS) {
    bufferedJumpAt = 0;
    tryJump();
  }
}

function tryJump() {
  if (!airborne) {
    airborne = true;
    standingOn = null;
    jumpsUsed = 1;
    velocity = JUMP_STRENGTH;
    catSvg.classList.remove('running');
    catSvg.classList.add('jumping');
    sfx.jump();
  } else if (jumpsUsed === 1) {
    // double jump: smaller boost plus a somersault
    jumpsUsed = 2;
    velocity = DOUBLE_JUMP_STRENGTH;
    catSvg.classList.add('flip');
    for (let i = 0; i < 5; i++) sparkle();
    sfx.doubleJump();
  } else {
    bufferedJumpAt = performance.now();
  }
}

function handleInput() {
  if (sessionExpired || pickerOpen) return;
  ensureAudio();
  if (state === 'start') {
    startRun();
  } else if (state === 'playing') {
    tryJump();
  } else if (state === 'over') {
    if (performance.now() - gameOverAt > RESTART_LOCKOUT_MS) startRun();
  }
}

container.addEventListener('pointerdown', handleInput);
document.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'Space') e.preventDefault();
  handleInput();
});
document.addEventListener('contextmenu', (e) => e.preventDefault());

// ---------- main loop ----------
function frame(now) {
  const dt = Math.min((now - lastFrame) / 16.667, 3); // frames worth of time, capped
  lastFrame = now;

  if (state === 'playing') {
    playTime += dt / 60;
    worldTime += dt / 60;
    timerEl.textContent = playTime.toFixed(1);

    // speed up gently
    speed = Math.min(speed + SPEED_RAMP * dt, MAX_SPEED);

    // scroll the world
    groundX += speed * dt;
    ground.style.transform = `translateX(${-(groundX % 400)}px)`;
    hillsFront.style.transform = `translateX(${-((groundX * 0.4) % 800)}px)`;
    hillsBack.style.transform = `translateX(${-((groundX * 0.15) % 800)}px)`;

    // spawn obstacles
    spawnTimer += dt / 60;
    if (spawnTimer >= nextSpawnIn) {
      spawnObstacle();
      scheduleNextSpawn();
    }

    // spawn collectibles
    fishTimer += dt / 60;
    if (fishTimer >= nextFishIn) {
      spawnFish();
      fishTimer = 0;
      nextFishIn = 2.5 + Math.random() * 3;
    }
    yarnTimer += dt / 60;
    if (yarnTimer >= nextYarnIn) {
      spawnYarn();
      yarnTimer = 0;
      nextYarnIn = 20 + Math.random() * 15;
    }
    cloudTimer += dt / 60;
    if (cloudTimer >= nextCloudIn) {
      spawnCloud();
      cloudTimer = 0;
      nextCloudIn = 8 + Math.random() * 6;
    }

    // move items, collect on touch
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.x -= speed * dt;
      it.el.style.transform = `translateX(${it.x}px)`;
      if (it.x < -100) {
        it.el.remove();
        items.splice(i, 1);
        continue;
      }
      if (touchingCat(it.el)) {
        if (it.kind === 'fish') collectFish(it);
        else collectYarn(it);
        it.el.remove();
        items.splice(i, 1);
      }
    }

    // yarn power countdown
    const invincible = playTime < invincibleUntil;
    if (invincible) {
      catEl.classList.toggle('power-ending', invincibleUntil - playTime < 1);
      if (now - lastSparkleAt > 60) {
        lastSparkleAt = now;
        sparkle();
      }
    } else if (catEl.classList.contains('power')) {
      catEl.classList.remove('power', 'power-ending');
    }

    // move obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const ob = obstacles[i];
      ob.x -= speed * dt;
      ob.el.style.transform = `translateX(${ob.x}px)`;
      if (ob.x < -120) {
        ob.el.remove();
        obstacles.splice(i, 1);
      }
    }

    // move cloud platforms
    for (let i = platforms.length - 1; i >= 0; i--) {
      const p = platforms[i];
      p.x -= speed * dt;
      p.el.style.transform = `translateX(${p.x}px)`;
      if (p.x < -260) {
        if (standingOn === p) {
          standingOn = null;
          airborne = true;
          velocity = 0;
        }
        p.el.remove();
        platforms.splice(i, 1);
      }
    }

    // jump physics
    if (airborne) {
      const prevY = catY;
      catY += velocity * dt;
      velocity -= GRAVITY * dt;
      // falling onto a cloud? (one-way platforms: pass through from below)
      if (velocity < 0) {
        for (const p of platforms) {
          if (catOverCloud(p) && prevY >= p.top && catY <= p.top) {
            landAt(p.top, p);
            break;
          }
        }
      }
      if (airborne && catY <= GROUND_Y) landAt(GROUND_Y, null);
      catEl.style.bottom = catY + 'px';
      if (airborne) {
        // sparkle trail while flying
        if (now - lastSparkleAt > 80) {
          lastSparkleAt = now;
          sparkle();
        }
        // tilt with the jump arc
        catEl.style.transform = `rotate(${-velocity * 0.8}deg)`;
      } else {
        catEl.style.transform = '';
      }
    } else if (standingOn && !catOverCloud(standingOn)) {
      // the cloud drifted out from under the cat
      standingOn = null;
      airborne = true;
      velocity = 0;
      jumpsUsed = 0; // falling is free: a full jump is still available
      catSvg.classList.remove('running');
      catSvg.classList.add('jumping');
    } else {
      catY = standingOn ? standingOn.top : GROUND_Y;
      catEl.style.bottom = catY + 'px';
      catEl.style.transform = '';
    }

    // stars for surviving
    if (playTime >= nextStarAt) {
      nextStarAt += STAR_EVERY;
      starsThisRun++;
      starCountEl.textContent = starsThisRun;
      starBadgeEl.classList.remove('bump');
      void starBadgeEl.offsetWidth;
      starBadgeEl.classList.add('bump');
      starPop();
      sfx.star();
    }

    // collect / dodge
    const hit = hitSomething();
    if (hit) {
      if (playTime < invincibleUntil) smashObstacle(hit);
      else endRun();
    }
  }

  checkSessionTimer();
  applySky();
  requestAnimationFrame(frame);
}

// ---------- boot ----------
titleEl.innerHTML = 'Cat Jump!'.split('').map((ch, i) =>
  ch === ' ' ? ' ' : `<span style="animation-delay:${i * 0.07}s">${ch}</span>`
).join('');

if (totalStars > 0 || totalFish > 0) {
  totalStarsStartEl.textContent = `You have ${totalStars} ★ and ${totalFish} 🐟 so far!`;
}

updateSoundBtn();
updateTimerBtn();
catEl.style.bottom = GROUND_Y + 'px';
catSvg.classList.add('running');
lastFrame = performance.now();
requestAnimationFrame(frame);