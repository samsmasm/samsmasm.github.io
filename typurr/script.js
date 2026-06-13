// Typurr — a friendly typing runner for small people, starring Ty the cat.
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
const homeBtn = document.getElementById('home-btn');
const gearBtn = document.getElementById('gear-btn');
const timerDisplay = document.getElementById('timer-display');
const settingsMenu = document.getElementById('settings-menu');
const settingsTimerBtn = document.getElementById('settings-timer');
const settingsHelpBtn = document.getElementById('settings-help');
const settingsSoundBtn = document.getElementById('settings-sound');
const settingsResetBtn = document.getElementById('settings-reset');
const settingsCloseBtn = document.getElementById('settings-close');
const helpScreen = document.getElementById('help-screen');
const helpCloseBtn = document.getElementById('help-close');
const resetBanner = document.getElementById('reset-banner');
const resetBannerText = document.getElementById('reset-banner-text');
const resetDoneBtn = document.getElementById('reset-done');
const timerPicker = document.getElementById('timer-picker');
const timesupScreen = document.getElementById('timesup-screen');
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
const overAgainBtn = document.getElementById('over-again-btn');
const overPickBtn = document.getElementById('over-pick-btn');
const userBar = document.getElementById('user-bar');
const userDialog = document.getElementById('user-dialog');
const userNameInput = document.getElementById('user-name');
const iconGrid = document.getElementById('icon-grid');
const userSaveBtn = document.getElementById('user-save');
const userCancelBtn = document.getElementById('user-cancel');
const titleEl = document.getElementById('title');
const totalFishStartEl = document.getElementById('total-fish-start');
const hillsBack = document.getElementById('hills-back');
const hillsFront = document.getElementById('hills-front');
const ground = document.getElementById('ground');
const starsLayer = document.getElementById('stars-layer');

// ---------- tuning ----------
const GROUND_Y = 70;          // cat's resting bottom, px
const GRAVITY = 0.4;          // gentle = long, easy-to-time hang time
const JUMP_STRENGTH = 17;     // SPACE jump (clears any obstacle)
const DOUBLE_JUMP_STRENGTH = 13; // second tap in the air = extra lift + flip
const BASE_LEAP_VX = 4.8;     // world-advance rate during a jump; screen-forward = this minus
                              // the level speed, so fast levels barely lunge (the ground clears it)
const RETURN_MAX_TIME = 1.4;  // seconds to gently ease all the way back from a big leap
const JUMP_BUDGET = 5;        // SPACE jumps allowed per level
const TRACK_LENGTHS = [12, 20, 40]; // Standard / Long / Longer (obstacles per level)
const LETTER_GAP = 560;       // px between single-letter obstacles
const WORD_GAP = 700;         // px between word obstacles (more reading room)
const DAY_CYCLE = 90;         // seconds for a full day->night->day

// ---------- letter frequencies (English text %) ----------
const FREQ = {
  A: 8.2, B: 1.5, C: 2.8, D: 4.3, E: 12.7, F: 2.2, G: 2.0, H: 6.1, I: 7.0,
  J: 0.16, K: 0.77, L: 4.0, M: 2.4, N: 6.7, O: 7.5, P: 1.9, Q: 0.12, R: 6.0,
  S: 6.3, T: 9.1, U: 2.8, V: 0.98, W: 2.4, X: 0.15, Y: 2.0, Z: 0.074,
};

const SPEEDS = [
  { label: 'Slow',      icon: '🐢', speed: 1.5 },
  { label: 'Medium',    icon: '🐇', speed: 3.9 },
  { label: 'Fast',      icon: '🐎', speed: 6.3 },
  { label: 'Super',     icon: '🚀', speed: 8.6 },
  { label: 'Lightning', icon: '⚡', speed: 11.0 },
];

// ---------- word-theme art helpers ----------
// a coloured balloon for the colour level
function balloonSvg(col) {
  return `<svg width="58" height="74" viewBox="0 0 58 74">
    <ellipse cx="29" cy="30" rx="25" ry="29" fill="${col}" stroke="rgba(0,0,0,0.16)" stroke-width="2"/>
    <path d="M25 57 L33 57 L29 65 Z" fill="${col}"/>
    <path d="M29 65 q-5 5 -2 9" stroke="#9a8a78" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="20" cy="22" rx="6" ry="10" fill="rgba(255,255,255,0.5)"/>
  </svg>`;
}

// a counting card showing n coloured dots (for the numbers level)
function numberSvg(n) {
  const dotCol = ['#e23b2e', '#2f74d0', '#36a64a', '#f0851f', '#8a4bd0'];
  const twoRows = n > 5;
  let dots = '';
  for (let i = 0; i < n; i++) {
    const row = i < 5 ? 0 : 1;
    const inRow = row === 0 ? Math.min(n, 5) : n - 5;
    const idx = i < 5 ? i : i - 5;
    const cx = 32 - (inRow - 1) * 5 + idx * 10;
    const cy = twoRows ? (row === 0 ? 24 : 44) : 34;
    dots += `<circle cx="${cx}" cy="${cy}" r="4" fill="${dotCol[i % 5]}"/>`;
  }
  return `<svg width="64" height="64" viewBox="0 0 64 64">
    <rect x="4" y="6" width="56" height="52" rx="8" fill="#fff" stroke="#b9c2ec" stroke-width="3"/>${dots}</svg>`;
}

// a friendly round face wearing one expression (for the feelings level)
function faceSvg(inner) {
  return `<svg width="60" height="64" viewBox="0 0 64 64"><circle cx="32" cy="34" r="27" fill="#ffd24a"/>${inner}</svg>`;
}
const FEELING_FACES = {
  HAPPY: `<circle cx="22" cy="28" r="3.4" fill="#3a2c20"/><circle cx="42" cy="28" r="3.4" fill="#3a2c20"/>
    <path d="M20 40 q12 14 24 0" stroke="#3a2c20" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  SAD: `<path d="M16 24 q6 -3 11 0 M48 24 q-6 -3 -11 0" stroke="#3a2c20" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <circle cx="22" cy="31" r="3.2" fill="#3a2c20"/><circle cx="42" cy="31" r="3.2" fill="#3a2c20"/>
    <path d="M20 49 q12 -12 24 0" stroke="#3a2c20" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M23 35 q-2 6 0 9 q2 -3 0 -9Z" fill="#4a9be0"/>`,
  MAD: `<path d="M16 22 L28 27 M48 22 L36 27" stroke="#3a2c20" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="23" cy="32" r="3.2" fill="#3a2c20"/><circle cx="41" cy="32" r="3.2" fill="#3a2c20"/>
    <path d="M22 49 q10 -8 20 0" stroke="#3a2c20" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  SHY: `<circle cx="24" cy="30" r="2.6" fill="#3a2c20"/><circle cx="40" cy="30" r="2.6" fill="#3a2c20"/>
    <ellipse cx="18" cy="39" rx="6" ry="3.5" fill="#ff9ec4"/><ellipse cx="46" cy="39" rx="6" ry="3.5" fill="#ff9ec4"/>
    <path d="M26 43 q6 4 12 0" stroke="#3a2c20" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
  SILLY: `<circle cx="22" cy="28" r="3.2" fill="#3a2c20"/><path d="M37 28 q5 0 8 0" stroke="#3a2c20" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M24 40 q8 6 16 0" stroke="#3a2c20" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M30 44 q3 9 8 6 q2 -4 -1 -8Z" fill="#ff7a9a"/>`,
  SLEEPY: `<path d="M16 30 q6 5 12 0 M36 30 q6 5 12 0" stroke="#3a2c20" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="32" cy="46" r="3" fill="#3a2c20"/>
    <path d="M44 8 h8 l-8 8 h8" stroke="#5a6cc0" stroke-width="2.5" fill="none"/>
    <path d="M53 2 h5 l-5 5 h5" stroke="#5a6cc0" stroke-width="2" fill="none"/>`,
  SCARED: `<path d="M16 22 q5 -4 11 -2 M48 22 q-5 -4 -11 -2" stroke="#3a2c20" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <circle cx="23" cy="31" r="5" fill="#fff"/><circle cx="41" cy="31" r="5" fill="#fff"/>
    <circle cx="23" cy="31" r="2.4" fill="#3a2c20"/><circle cx="41" cy="31" r="2.4" fill="#3a2c20"/>
    <ellipse cx="32" cy="46" rx="5" ry="7" fill="#3a2c20"/>
    <path d="M50 24 q5 2 4 8 q4 -4 0 -10Z" fill="#7fc8e8"/>`,
};

// a blank wooden signpost (the sight word itself rides on the badge above)
const SIGN_SVG = `<svg width="64" height="68" viewBox="0 0 64 68">
  <rect x="29" y="20" width="6" height="46" fill="#a06a3a"/>
  <rect x="8" y="12" width="48" height="24" rx="4" fill="#c89564" stroke="#a06a3a" stroke-width="3"/>
  <circle cx="15" cy="24" r="2" fill="#a06a3a"/><circle cx="49" cy="24" r="2" fill="#a06a3a"/>
</svg>`;

// ---------- word themes ----------
// kind 'colour' draws balloons + colours the letters; 'word' draws a picture
// on a cream badge. Each item: { word, svg, w } (or { word, col } for colours).
const WORD_THEMES = {
  colours: { label: '🎨 Colours', kind: 'colour', items: [
    { word: 'RED', col: '#e23b2e' }, { word: 'ORANGE', col: '#f0851f' },
    { word: 'YELLOW', col: '#f3c200' }, { word: 'GREEN', col: '#36a64a' },
    { word: 'BLUE', col: '#2f74d0' }, { word: 'PURPLE', col: '#8a4bd0' },
    { word: 'PINK', col: '#ec6aa8' }, { word: 'WHITE', col: '#ffffff' },
  ] },
  animals: { label: '🦁 Animals', kind: 'word', items: [
    { word: 'LION', w: 72, svg: `<svg width="72" height="70" viewBox="0 0 72 70">
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
        <path d="M30 53 L33 58 L27 57 Z" fill="#fff"/><path d="M42 53 L45 57 L39 58 Z" fill="#fff"/></svg>` },
    { word: 'BEAR', w: 68, svg: `<svg width="68" height="70" viewBox="0 0 68 70">
        <circle cx="16" cy="16" r="11" fill="#8a6240"/><circle cx="52" cy="16" r="11" fill="#8a6240"/>
        <circle cx="16" cy="16" r="5" fill="#b88a5e"/><circle cx="52" cy="16" r="5" fill="#b88a5e"/>
        <circle cx="34" cy="40" r="27" fill="#9a6e48"/>
        <path d="M22 32 L31 36 M46 32 L37 36" stroke="#5a3a1e" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="26" cy="39" r="3.2" fill="#3a2c20"/><circle cx="42" cy="39" r="3.2" fill="#3a2c20"/>
        <ellipse cx="34" cy="48" rx="13" ry="10" fill="#e6cba6"/>
        <ellipse cx="34" cy="45" rx="4" ry="3" fill="#3a2c20"/>
        <path d="M34 48 q-5 5 -10 3 M34 48 q5 5 10 3" stroke="#5a3a1e" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M28 51 L31 56 L25 55 Z" fill="#fff"/><path d="M40 51 L43 55 L37 56 Z" fill="#fff"/></svg>` },
    { word: 'FOX', w: 66, svg: `<svg width="66" height="68" viewBox="0 0 66 68">
        <path d="M10 8 L26 26 L8 34 Z" fill="#e0712f"/><path d="M56 8 L40 26 L58 34 Z" fill="#e0712f"/>
        <path d="M13 13 L23 24 L13 28 Z" fill="#3a2c20"/><path d="M53 13 L43 24 L53 28 Z" fill="#3a2c20"/>
        <path d="M33 18 Q58 24 33 64 Q8 24 33 18 Z" fill="#e0712f"/>
        <path d="M33 40 Q46 44 33 64 Q20 44 33 40 Z" fill="#f6e3cf"/>
        <path d="M22 30 L31 34 M44 30 L35 34" stroke="#a04a14" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="26" cy="37" r="3.2" fill="#3a2c20"/><circle cx="40" cy="37" r="3.2" fill="#3a2c20"/>
        <path d="M30 49 L36 49 L33 54 Z" fill="#3a2c20"/>
        <path d="M33 54 q-4 4 -8 3 M33 54 q4 4 8 3" stroke="#a04a14" stroke-width="2.3" fill="none" stroke-linecap="round"/></svg>` },
    { word: 'FROG', w: 70, svg: `<svg width="70" height="62" viewBox="0 0 70 62">
        <circle cx="17" cy="16" r="13" fill="#6cbf52"/><circle cx="53" cy="16" r="13" fill="#6cbf52"/>
        <circle cx="17" cy="14" r="6" fill="#fff"/><circle cx="53" cy="14" r="6" fill="#fff"/>
        <circle cx="18" cy="15" r="3.2" fill="#1f3a1a"/><circle cx="54" cy="15" r="3.2" fill="#1f3a1a"/>
        <path d="M8 8 L18 13 M62 8 L52 13" stroke="#3f7a30" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M6 30 Q35 14 64 30 Q60 56 35 56 Q10 56 6 30 Z" fill="#7fce63"/>
        <path d="M16 42 Q35 56 54 42" stroke="#3f7a30" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <path d="M22 43 L26 48 L18 48 Z" fill="#fff"/><path d="M48 43 L52 48 L44 48 Z" fill="#fff"/></svg>` },
    { word: 'OWL', w: 64, svg: `<svg width="64" height="70" viewBox="0 0 64 70">
        <path d="M8 6 L20 20 L6 24 Z" fill="#7a5a8a"/><path d="M56 6 L44 20 L58 24 Z" fill="#7a5a8a"/>
        <ellipse cx="32" cy="40" rx="26" ry="28" fill="#8a6aa0"/>
        <ellipse cx="32" cy="42" rx="18" ry="22" fill="#b89ec8"/>
        <circle cx="22" cy="34" r="11" fill="#fff"/><circle cx="42" cy="34" r="11" fill="#fff"/>
        <circle cx="23" cy="35" r="5" fill="#3a2c20"/><circle cx="41" cy="35" r="5" fill="#3a2c20"/>
        <path d="M14 22 L26 28 M50 22 L38 28" stroke="#4a3458" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M28 42 L36 42 L32 50 Z" fill="#f0a83a"/>
        <path d="M16 56 q8 8 16 0 q8 8 16 0" stroke="#6a4a7a" stroke-width="3" fill="none" stroke-linecap="round"/></svg>` },
    { word: 'BEE', w: 66, svg: `<svg width="66" height="62" viewBox="0 0 66 62">
        <ellipse cx="20" cy="20" rx="16" ry="13" fill="#dfe7f2" opacity="0.85"/>
        <ellipse cx="46" cy="20" rx="16" ry="13" fill="#dfe7f2" opacity="0.85"/>
        <ellipse cx="33" cy="40" rx="22" ry="19" fill="#f3c200"/>
        <path d="M20 30 q13 8 26 0 M16 42 q17 9 34 0 M22 53 q11 5 22 0" stroke="#3a2c20" stroke-width="5" fill="none"/>
        <path d="M24 33 L31 36 M42 33 L35 36" stroke="#3a2c20" stroke-width="3" stroke-linecap="round"/>
        <circle cx="27" cy="39" r="3" fill="#3a2c20"/><circle cx="39" cy="39" r="3" fill="#3a2c20"/>
        <path d="M28 46 q5 3 10 0" stroke="#3a2c20" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <path d="M29 8 L33 14 M37 8 L33 14" stroke="#3a2c20" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="29" cy="7" r="2.5" fill="#3a2c20"/><circle cx="37" cy="7" r="2.5" fill="#3a2c20"/></svg>` },
    { word: 'WOLF', w: 66, svg: `<svg width="66" height="66" viewBox="0 0 66 66">
        <path d="M8 8 L22 26 L6 30 Z" fill="#8a93a0"/><path d="M58 8 L44 26 L60 30 Z" fill="#8a93a0"/>
        <path d="M13 13 L21 24 L12 27 Z" fill="#5a626e"/><path d="M53 13 L45 24 L54 27 Z" fill="#5a626e"/>
        <circle cx="33" cy="38" r="26" fill="#9aa3b0"/>
        <path d="M33 38 L20 56 Q33 64 46 56 Z" fill="#9aa3b0"/>
        <ellipse cx="33" cy="50" rx="12" ry="9" fill="#d3dae2"/>
        <path d="M22 32 L31 36 M44 32 L35 36" stroke="#4a525e" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="26" cy="38" r="3.2" fill="#3a2c20"/><circle cx="40" cy="38" r="3.2" fill="#3a2c20"/>
        <path d="M29 48 L37 48 L33 53 Z" fill="#3a2c20"/>
        <path d="M33 53 q-5 4 -9 2 M33 53 q5 4 9 2" stroke="#4a525e" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <path d="M27 55 L30 60 L24 59 Z" fill="#fff"/><path d="M39 55 L42 59 L36 60 Z" fill="#fff"/></svg>` },
    { word: 'TIGER', w: 68, svg: `<svg width="68" height="68" viewBox="0 0 68 68">
        <circle cx="14" cy="16" r="9" fill="#e0883e"/><circle cx="54" cy="16" r="9" fill="#e0883e"/>
        <circle cx="14" cy="16" r="4" fill="#7a4a18"/><circle cx="54" cy="16" r="4" fill="#7a4a18"/>
        <circle cx="34" cy="38" r="27" fill="#f0953a"/>
        <ellipse cx="34" cy="46" rx="16" ry="13" fill="#fde3c0"/>
        <path d="M20 18 L24 30 M48 18 L44 30 M13 34 L22 36 M55 34 L46 36 M15 46 L24 46 M53 46 L44 46" stroke="#3a2c20" stroke-width="3" stroke-linecap="round"/>
        <path d="M22 32 L31 36 M46 32 L37 36" stroke="#7a4a18" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="27" cy="38" r="3.2" fill="#3a2c20"/><circle cx="41" cy="38" r="3.2" fill="#3a2c20"/>
        <path d="M31 46 L37 46 L34 50 Z" fill="#c4577a"/>
        <path d="M34 50 q-5 4 -9 2 M34 50 q5 4 9 2" stroke="#7a4a18" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <path d="M29 52 L32 57 L26 56 Z" fill="#fff"/><path d="M39 52 L42 56 L36 57 Z" fill="#fff"/></svg>` },
  ] },
  shapes: { label: '🔺 Shapes', kind: 'word', items: [
    { word: 'CIRCLE', w: 62, svg: `<svg width="62" height="64" viewBox="0 0 62 64"><circle cx="31" cy="34" r="28" fill="#2f74d0"/></svg>` },
    { word: 'SQUARE', w: 60, svg: `<svg width="60" height="64" viewBox="0 0 60 64"><rect x="4" y="8" width="52" height="52" rx="6" fill="#e23b2e"/></svg>` },
    { word: 'STAR', w: 64, svg: `<svg width="64" height="64" viewBox="0 0 64 66"><polygon points="32,8 39,26 59,27 43,40 48,59 32,48 16,59 21,40 5,27 25,26" fill="#f3c200"/></svg>` },
    { word: 'HEART', w: 64, svg: `<svg width="64" height="62" viewBox="0 0 64 64"><path d="M32 60 C 2 38 10 10 32 26 C 54 10 62 38 32 60 Z" fill="#ec6aa8"/></svg>` },
    { word: 'OVAL', w: 64, svg: `<svg width="64" height="56" viewBox="0 0 64 56"><ellipse cx="32" cy="30" rx="30" ry="22" fill="#36a64a"/></svg>` },
    { word: 'DIAMOND', w: 60, svg: `<svg width="60" height="68" viewBox="0 0 60 68"><polygon points="30,4 58,34 30,64 2,34" fill="#8a4bd0"/></svg>` },
    { word: 'TRIANGLE', w: 64, svg: `<svg width="64" height="60" viewBox="0 0 64 60"><polygon points="32,4 60,56 4,56" fill="#f0851f"/></svg>` },
  ] },
  fruit: { label: '🍎 Fruit', kind: 'word', items: [
    { word: 'APPLE', w: 60, svg: `<svg width="60" height="66" viewBox="0 0 60 66"><path d="M30 18 C 16 6 2 20 10 40 C 14 58 26 64 30 64 C 34 64 46 58 50 40 C 58 20 44 6 30 18 Z" fill="#e23b2e"/><path d="M30 20 q1 -10 7 -13" stroke="#7a4a1a" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="40" cy="9" rx="7" ry="4" fill="#5da356" transform="rotate(-20 40 9)"/></svg>` },
    { word: 'PEAR', w: 56, svg: `<svg width="56" height="66" viewBox="0 0 56 66"><path d="M28 14 C 22 14 21 23 24 29 C 14 35 12 54 28 63 C 44 54 42 35 32 29 C 35 23 34 14 28 14 Z" fill="#9acb3c"/><path d="M28 15 q1 -8 5 -10" stroke="#7a4a1a" stroke-width="3" fill="none" stroke-linecap="round"/></svg>` },
    { word: 'PLUM', w: 58, svg: `<svg width="58" height="64" viewBox="0 0 58 64"><ellipse cx="29" cy="36" rx="25" ry="26" fill="#8a4bd0"/><path d="M29 12 q-3 26 0 50" stroke="#6a3aa0" stroke-width="3" fill="none"/><path d="M29 12 q2 -8 8 -9" stroke="#5a8a2a" stroke-width="3" fill="none" stroke-linecap="round"/></svg>` },
    { word: 'GRAPE', w: 58, svg: `<svg width="58" height="68" viewBox="0 0 58 68"><g fill="#8a4bd0"><circle cx="29" cy="20" r="9"/><circle cx="18" cy="32" r="9"/><circle cx="40" cy="32" r="9"/><circle cx="29" cy="38" r="9"/><circle cx="22" cy="50" r="9"/><circle cx="36" cy="50" r="9"/><circle cx="29" cy="60" r="8"/></g><path d="M29 12 q2 -8 9 -9" stroke="#5a8a2a" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="40" cy="6" rx="7" ry="4" fill="#5da356"/></svg>` },
    { word: 'LEMON', w: 64, svg: `<svg width="64" height="52" viewBox="0 0 64 52"><ellipse cx="32" cy="28" rx="28" ry="20" fill="#f3c200"/><circle cx="6" cy="28" r="3" fill="#e0b000"/><circle cx="58" cy="28" r="3" fill="#e0b000"/></svg>` },
    { word: 'KIWI', w: 60, svg: `<svg width="60" height="60" viewBox="0 0 60 60"><circle cx="30" cy="32" r="27" fill="#8a6a3a"/><circle cx="30" cy="32" r="22" fill="#9acb3c"/><circle cx="30" cy="32" r="7" fill="#f2f6ea"/><g fill="#3a2c20"><circle cx="30" cy="16" r="1.6"/><circle cx="42" cy="22" r="1.6"/><circle cx="46" cy="34" r="1.6"/><circle cx="40" cy="46" r="1.6"/><circle cx="30" cy="50" r="1.6"/><circle cx="20" cy="46" r="1.6"/><circle cx="14" cy="34" r="1.6"/><circle cx="18" cy="22" r="1.6"/></g></svg>` },
    { word: 'BANANA', w: 64, svg: `<svg width="64" height="56" viewBox="0 0 64 56"><path d="M12 14 Q14 42 40 50 Q58 55 61 46 Q61 50 55 50 Q31 48 21 28 Q15 20 18 12 Z" fill="#f3c200" stroke="#d9b000" stroke-width="2"/><path d="M18 12 q-2 -7 3 -9" stroke="#7a6a1a" stroke-width="3" fill="none" stroke-linecap="round"/></svg>` },
    { word: 'CHERRY', w: 56, svg: `<svg width="56" height="64" viewBox="0 0 56 64"><path d="M28 8 Q20 28 16 42 M28 8 Q36 28 40 40" stroke="#5a8a2a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M28 8 q5 -4 10 -3" stroke="#5a8a2a" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="16" cy="50" r="11" fill="#e23b2e"/><circle cx="40" cy="48" r="11" fill="#c41f1f"/><ellipse cx="12" cy="46" rx="3" ry="2" fill="#ff8a7a"/></svg>` },
  ] },
  vehicles: { label: '🚗 Vehicles', kind: 'word', items: [
    { word: 'CAR', w: 74, svg: `<svg width="74" height="50" viewBox="0 0 74 50"><path d="M6 38 L10 24 L24 24 L32 14 L52 14 L58 24 L68 26 L68 38 Z" fill="#e23b2e"/><rect x="26" y="17" width="10" height="8" fill="#bfe0f0"/><rect x="40" y="17" width="12" height="8" fill="#bfe0f0"/><circle cx="20" cy="40" r="8" fill="#333"/><circle cx="20" cy="40" r="3.5" fill="#bbb"/><circle cx="56" cy="40" r="8" fill="#333"/><circle cx="56" cy="40" r="3.5" fill="#bbb"/></svg>` },
    { word: 'BUS', w: 68, svg: `<svg width="68" height="60" viewBox="0 0 68 60"><rect x="6" y="8" width="56" height="40" rx="6" fill="#f0851f"/><rect x="11" y="14" width="11" height="11" fill="#bfe0f0"/><rect x="28" y="14" width="11" height="11" fill="#bfe0f0"/><rect x="45" y="14" width="11" height="11" fill="#bfe0f0"/><rect x="6" y="32" width="56" height="6" fill="#d96a10"/><circle cx="20" cy="50" r="7" fill="#333"/><circle cx="48" cy="50" r="7" fill="#333"/></svg>` },
    { word: 'VAN', w: 70, svg: `<svg width="70" height="54" viewBox="0 0 70 54"><path d="M6 14 L44 14 L62 28 L62 42 L6 42 Z" fill="#36a64a"/><rect x="46" y="20" width="12" height="9" fill="#bfe0f0"/><circle cx="20" cy="44" r="7" fill="#333"/><circle cx="50" cy="44" r="7" fill="#333"/></svg>` },
    { word: 'BOAT', w: 68, svg: `<svg width="68" height="62" viewBox="0 0 68 62"><path d="M34 6 L34 38 L14 38 Z" fill="#e23b2e"/><path d="M38 10 L38 38 L56 38 Z" fill="#f3c200"/><rect x="33" y="6" width="3" height="34" fill="#7a4a1a"/><path d="M6 42 L62 42 L54 58 L14 58 Z" fill="#8a5a2a"/></svg>` },
    { word: 'BIKE', w: 72, svg: `<svg width="72" height="52" viewBox="0 0 72 52"><circle cx="16" cy="36" r="13" fill="none" stroke="#333" stroke-width="3"/><circle cx="56" cy="36" r="13" fill="none" stroke="#333" stroke-width="3"/><path d="M16 36 L34 36 L46 18 L56 36 M34 36 L46 18 M30 18 L40 18" stroke="#2f74d0" stroke-width="3" fill="none" stroke-linecap="round"/></svg>` },
    { word: 'TRAIN', w: 70, svg: `<svg width="70" height="58" viewBox="0 0 70 58"><rect x="8" y="20" width="40" height="26" rx="4" fill="#2f74d0"/><rect x="48" y="10" width="14" height="36" rx="3" fill="#1a5aa0"/><rect x="16" y="10" width="10" height="12" fill="#444"/><circle cx="21" cy="11" r="5" fill="#777"/><rect x="14" y="26" width="10" height="10" fill="#bfe0f0"/><rect x="30" y="26" width="12" height="10" fill="#bfe0f0"/><circle cx="20" cy="50" r="6" fill="#333"/><circle cx="40" cy="50" r="6" fill="#333"/><circle cx="55" cy="50" r="6" fill="#333"/></svg>` },
    { word: 'PLANE', w: 74, svg: `<svg width="74" height="52" viewBox="0 0 74 52"><path d="M4 28 L52 22 L68 24 Q72 26 68 28 L52 30 L40 40 L34 40 L40 30 L20 31 L14 38 L9 38 L12 29 L4 28 Z" fill="#dfe7f2" stroke="#9bb0c8" stroke-width="1.5"/><circle cx="56" cy="26" r="2.5" fill="#2f74d0"/></svg>` },
  ] },
  sealife: { label: '🐠 Sea life', kind: 'word', items: [
    { word: 'CRAB', w: 70, svg: `<svg width="70" height="50" viewBox="0 0 70 50"><ellipse cx="35" cy="32" rx="22" ry="14" fill="#e23b2e"/><circle cx="27" cy="26" r="3" fill="#fff"/><circle cx="27" cy="26" r="1.6" fill="#3a2c20"/><circle cx="43" cy="26" r="3" fill="#fff"/><circle cx="43" cy="26" r="1.6" fill="#3a2c20"/><path d="M14 30 q-10 -2 -10 -12 M56 30 q10 -2 10 -12" stroke="#e23b2e" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="4" cy="16" r="5" fill="#e23b2e"/><circle cx="66" cy="16" r="5" fill="#e23b2e"/><path d="M16 42 l-8 6 M24 44 l-5 6 M54 42 l8 6 M46 44 l5 6" stroke="#e23b2e" stroke-width="3" stroke-linecap="round"/></svg>` },
    { word: 'FISH', w: 64, svg: `<svg width="64" height="44" viewBox="0 0 64 44"><path d="M50 22 L62 8 Q58 22 62 36 Z" fill="#e0883e"/><ellipse cx="28" cy="22" rx="24" ry="15" fill="#f4a259"/><circle cx="16" cy="18" r="4" fill="#fff"/><circle cx="15" cy="18" r="2" fill="#3a2c20"/><path d="M30 9 q-4 13 0 26" stroke="#e0883e" stroke-width="2.5" fill="none"/></svg>` },
    { word: 'SEAL', w: 64, svg: `<svg width="64" height="56" viewBox="0 0 64 56"><ellipse cx="28" cy="40" rx="24" ry="14" fill="#8a99a8"/><circle cx="46" cy="24" r="14" fill="#9aa9b8"/><circle cx="42" cy="22" r="2.4" fill="#3a2c20"/><circle cx="51" cy="22" r="2.4" fill="#3a2c20"/><ellipse cx="47" cy="28" rx="3" ry="2" fill="#3a2c20"/><path d="M8 42 q-6 4 -4 10 M12 48 q-2 4 2 6" stroke="#8a99a8" stroke-width="4" fill="none" stroke-linecap="round"/></svg>` },
    { word: 'WHALE', w: 70, svg: `<svg width="70" height="50" viewBox="0 0 70 50"><path d="M8 30 Q8 14 32 14 Q56 14 56 30 Q56 42 32 42 Q18 42 12 38 L4 44 Q8 36 8 30 Z" fill="#2f74d0"/><path d="M56 24 L68 16 L66 30 Z" fill="#2f74d0"/><circle cx="20" cy="26" r="2.4" fill="#fff"/><path d="M32 10 q-3 -6 0 -8 q3 6 6 4" stroke="#bfe0f0" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>` },
    { word: 'SHELL', w: 62, svg: `<svg width="62" height="58" viewBox="0 0 62 58"><path d="M31 54 L4 22 Q31 -2 58 22 Z" fill="#ff9ec4"/><path d="M31 54 L31 16 M31 54 L18 20 M31 54 L44 20 M31 54 L8 26 M31 54 L54 26" stroke="#e0648f" stroke-width="2.5" fill="none"/></svg>` },
    { word: 'OCTOPUS', w: 64, svg: `<svg width="64" height="62" viewBox="0 0 64 62"><path d="M32 6 Q54 6 54 30 L54 38 Q44 34 44 44 Q36 38 32 48 Q28 38 20 44 Q20 34 10 38 L10 30 Q10 6 32 6 Z" fill="#8a4bd0"/><circle cx="25" cy="26" r="3" fill="#fff"/><circle cx="25" cy="26" r="1.6" fill="#3a2c20"/><circle cx="39" cy="26" r="3" fill="#fff"/><circle cx="39" cy="26" r="1.6" fill="#3a2c20"/></svg>` },
    { word: 'SHARK', w: 70, svg: `<svg width="70" height="50" viewBox="0 0 70 50"><path d="M6 30 Q14 16 40 18 L64 12 Q66 26 56 30 Q66 34 64 44 L40 38 Q14 42 6 30 Z" fill="#7f93a6"/><path d="M34 14 L40 2 L46 18 Z" fill="#6a7e90"/><circle cx="18" cy="26" r="2.6" fill="#3a2c20"/><path d="M10 32 L20 32 L14 38 Z" fill="#fff"/><path d="M22 34 L30 34 L26 40 Z" fill="#fff"/></svg>` },
  ] },
  numbers: { label: '🔢 Numbers', kind: 'word', items:
    ['ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN']
      .map((w, i) => ({ word: w, w: 64, svg: numberSvg(i + 1) })) },
  feelings: { label: '😊 Feelings', kind: 'word', items:
    Object.keys(FEELING_FACES).map(w => ({ word: w, w: 60, svg: faceSvg(FEELING_FACES[w]) })) },
  sight: { label: '📖 Sight words', kind: 'word', items:
    ['THE','AND','CAT','DOG','SEE','GO','YOU','ARE'].map(w => ({ word: w, w: 64, svg: SIGN_SVG })) },
  weather: { label: '☀️ Weather', kind: 'word', items: [
    { word: 'SUN', w: 60, svg: `<svg width="60" height="60" viewBox="0 0 60 60"><g stroke="#f3a200" stroke-width="4" stroke-linecap="round"><path d="M30 4 V14 M30 46 V56 M4 30 H14 M46 30 H56 M11 11 L18 18 M42 42 L49 49 M49 11 L42 18 M18 42 L11 49"/></g><circle cx="30" cy="30" r="15" fill="#ffd24a"/></svg>` },
    { word: 'RAIN', w: 64, svg: `<svg width="64" height="60" viewBox="0 0 64 60"><ellipse cx="32" cy="24" rx="26" ry="14" fill="#cfd8e2"/><circle cx="20" cy="22" r="11" fill="#cfd8e2"/><circle cx="42" cy="20" r="13" fill="#cfd8e2"/><g fill="#4a9be0"><path d="M18 40 q-3 5 0 8 q3 -3 0 -8Z"/><path d="M32 42 q-3 5 0 8 q3 -3 0 -8Z"/><path d="M46 40 q-3 5 0 8 q3 -3 0 -8Z"/></g></svg>` },
    { word: 'CLOUD', w: 66, svg: `<svg width="66" height="46" viewBox="0 0 66 46"><ellipse cx="33" cy="36" rx="28" ry="6" fill="#dce8f5"/><ellipse cx="33" cy="30" rx="30" ry="13" fill="#fff"/><circle cx="20" cy="26" r="13" fill="#fff"/><circle cx="40" cy="22" r="16" fill="#fff"/><circle cx="52" cy="28" r="11" fill="#fff"/></svg>` },
    { word: 'STAR', w: 60, svg: `<svg width="60" height="60" viewBox="0 0 64 66"><polygon points="32,8 39,26 59,27 43,40 48,59 32,48 16,59 21,40 5,27 25,26" fill="#ffd24a"/></svg>` },
    { word: 'MOON', w: 56, svg: `<svg width="56" height="60" viewBox="0 0 56 60"><path d="M40 8 A24 24 0 1 0 40 52 A18 18 0 1 1 40 8 Z" fill="#fde98a"/></svg>` },
    { word: 'SNOW', w: 58, svg: `<svg width="58" height="58" viewBox="0 0 58 58"><g stroke="#7fb8e8" stroke-width="3" stroke-linecap="round"><path d="M29 6 V52 M9 18 L49 40 M49 18 L9 40"/><path d="M29 14 l-5 -5 M29 14 l5 -5 M29 44 l-5 5 M29 44 l5 5"/></g></svg>` },
    { word: 'WIND', w: 64, svg: `<svg width="64" height="50" viewBox="0 0 64 50"><g stroke="#9ab4c8" stroke-width="4" fill="none" stroke-linecap="round"><path d="M6 16 H40 a7 7 0 1 0 -7 -7"/><path d="M6 28 H50 a8 8 0 1 1 -8 8"/><path d="M6 40 H32 a6 6 0 1 0 -6 6"/></g></svg>` },
  ] },
  toys: { label: '🧸 Toys', kind: 'word', items: [
    { word: 'BALL', w: 58, svg: `<svg width="58" height="58" viewBox="0 0 58 58"><circle cx="29" cy="29" r="27" fill="#f3c200"/><path d="M5 20 Q29 30 53 20" stroke="#e23b2e" stroke-width="7" fill="none"/><path d="M5 38 Q29 28 53 38" stroke="#2f74d0" stroke-width="7" fill="none"/></svg>` },
    { word: 'KITE', w: 56, svg: `<svg width="56" height="68" viewBox="0 0 56 68"><polygon points="28,2 50,26 28,50 6,26" fill="#ec6aa8"/><path d="M28 2 L28 50 M6 26 L50 26" stroke="#fff" stroke-width="2"/><path d="M28 50 q-4 8 2 12 q-6 2 -2 6" stroke="#7a4a1a" stroke-width="2" fill="none"/></svg>` },
    { word: 'DRUM', w: 64, svg: `<svg width="64" height="54" viewBox="0 0 64 54"><rect x="12" y="18" width="40" height="26" rx="3" fill="#e23b2e"/><ellipse cx="32" cy="18" rx="20" ry="7" fill="#f6e3cf"/><path d="M12 22 L52 40 M52 22 L12 40" stroke="#f3c200" stroke-width="2.5"/><path d="M40 16 L58 4 M44 18 L62 8" stroke="#a06a3a" stroke-width="3" stroke-linecap="round"/></svg>` },
    { word: 'DOLL', w: 48, svg: `<svg width="48" height="66" viewBox="0 0 48 66"><circle cx="24" cy="14" r="12" fill="#ffe0bd"/><path d="M12 12 a12 12 0 0 1 24 0 q-12 -6 -24 0Z" fill="#a05a2a"/><circle cx="20" cy="14" r="1.6" fill="#3a2c20"/><circle cx="28" cy="14" r="1.6" fill="#3a2c20"/><path d="M21 19 q3 2 6 0" stroke="#c4577a" stroke-width="1.6" fill="none"/><path d="M14 28 L34 28 L30 60 L18 60 Z" fill="#ec6aa8"/></svg>` },
    { word: 'BLOCKS', w: 60, svg: `<svg width="60" height="60" viewBox="0 0 60 60"><rect x="6" y="32" width="24" height="24" rx="3" fill="#e23b2e"/><rect x="32" y="32" width="24" height="24" rx="3" fill="#2f74d0"/><rect x="18" y="8" width="24" height="24" rx="3" fill="#36a64a"/><g fill="#fff" font-family="Fredoka,sans-serif" font-size="15" font-weight="700" text-anchor="middle"><text x="18" y="50">A</text><text x="44" y="50">B</text><text x="30" y="26">C</text></g></svg>` },
    { word: 'TOP', w: 56, svg: `<svg width="56" height="64" viewBox="0 0 56 64"><rect x="25" y="4" width="6" height="12" rx="2" fill="#a06a3a"/><path d="M12 16 L44 16 L28 44 Z" fill="#e23b2e"/><path d="M12 16 L44 16 L37 28 L19 28 Z" fill="#f3c200"/><path d="M28 44 L28 58" stroke="#7a4a1a" stroke-width="3" stroke-linecap="round"/></svg>` },
    { word: 'ROBOT', w: 56, svg: `<svg width="56" height="68" viewBox="0 0 56 68"><rect x="26" y="2" width="3" height="8" fill="#7a8694"/><circle cx="27" cy="2" r="3" fill="#e23b2e"/><rect x="14" y="9" width="28" height="22" rx="4" fill="#9aa9b8"/><circle cx="22" cy="19" r="3.5" fill="#3a2c20"/><circle cx="34" cy="19" r="3.5" fill="#3a2c20"/><path d="M22 26 h12" stroke="#3a2c20" stroke-width="2" stroke-linecap="round"/><rect x="10" y="33" width="36" height="26" rx="4" fill="#7f8c9b"/><rect x="20" y="39" width="16" height="10" rx="2" fill="#bfe0f0"/><rect x="2" y="35" width="8" height="16" rx="3" fill="#9aa9b8"/><rect x="46" y="35" width="8" height="16" rx="3" fill="#9aa9b8"/><rect x="16" y="59" width="9" height="9" fill="#5a626e"/><rect x="31" y="59" width="9" height="9" fill="#5a626e"/></svg>` },
  ] },
  minibeasts: { label: '🐛 Minibeasts', kind: 'word', items: [
    { word: 'ANT', w: 68, svg: `<svg width="68" height="44" viewBox="0 0 68 44"><g fill="#7a3a1a"><circle cx="50" cy="24" r="11"/><circle cx="34" cy="24" r="7"/><circle cx="16" cy="24" r="9"/></g><path d="M34 24 L24 36 M34 24 L44 38 M30 24 L20 38 M40 24 L48 38 M34 22 L26 12 M34 22 L44 12" stroke="#7a3a1a" stroke-width="2.5" stroke-linecap="round"/><path d="M12 18 L4 8 M16 16 L12 6" stroke="#7a3a1a" stroke-width="2" stroke-linecap="round"/><circle cx="13" cy="22" r="1.6" fill="#fff"/></svg>` },
    { word: 'BUG', w: 58, svg: `<svg width="58" height="50" viewBox="0 0 58 50"><path d="M14 16 Q30 4 46 16 Z" fill="#3a2c20"/><ellipse cx="30" cy="30" rx="24" ry="18" fill="#e23b2e"/><path d="M30 12 L30 48" stroke="#3a2c20" stroke-width="2.5"/><circle cx="18" cy="26" r="3.5" fill="#3a2c20"/><circle cx="42" cy="26" r="3.5" fill="#3a2c20"/><circle cx="22" cy="38" r="3" fill="#3a2c20"/><circle cx="40" cy="38" r="3" fill="#3a2c20"/><circle cx="22" cy="13" r="2" fill="#fff"/><circle cx="38" cy="13" r="2" fill="#fff"/></svg>` },
    { word: 'WORM', w: 68, svg: `<svg width="68" height="40" viewBox="0 0 68 40"><path d="M6 30 Q16 14 26 30 Q36 46 46 30 Q54 18 60 26" stroke="#7fce63" stroke-width="11" fill="none" stroke-linecap="round"/><circle cx="60" cy="24" r="8" fill="#6cbf52"/><circle cx="62" cy="22" r="1.8" fill="#3a2c20"/><path d="M60 18 l-2 -6 M64 18 l2 -6" stroke="#3a8a30" stroke-width="2" stroke-linecap="round"/></svg>` },
    { word: 'SNAIL', w: 66, svg: `<svg width="66" height="50" viewBox="0 0 66 50"><path d="M6 42 Q6 30 20 30 L40 30" stroke="#d9a872" stroke-width="10" fill="none" stroke-linecap="round"/><circle cx="40" cy="28" r="18" fill="#e0883e"/><circle cx="40" cy="28" r="11" fill="none" stroke="#a05a2a" stroke-width="3"/><circle cx="40" cy="28" r="4" fill="none" stroke="#a05a2a" stroke-width="3"/><circle cx="10" cy="40" r="6" fill="#d9a872"/><path d="M8 36 L5 26 M13 36 L16 26" stroke="#d9a872" stroke-width="2.5" stroke-linecap="round"/><circle cx="5" cy="25" r="1.6" fill="#3a2c20"/><circle cx="16" cy="25" r="1.6" fill="#3a2c20"/></svg>` },
    { word: 'SPIDER', w: 66, svg: `<svg width="66" height="56" viewBox="0 0 66 56"><g stroke="#3a2c20" stroke-width="3" fill="none" stroke-linecap="round"><path d="M26 30 L8 20 M26 34 L6 32 M26 38 L8 46 M40 30 L58 20 M40 34 L60 32 M40 38 L58 46"/></g><ellipse cx="33" cy="34" rx="15" ry="13" fill="#3a2c20"/><circle cx="33" cy="20" r="8" fill="#3a2c20"/><circle cx="30" cy="19" r="2.4" fill="#fff"/><circle cx="36" cy="19" r="2.4" fill="#fff"/><circle cx="30" cy="19" r="1.1" fill="#3a2c20"/><circle cx="36" cy="19" r="1.1" fill="#3a2c20"/></svg>` },
    { word: 'FLY', w: 62, svg: `<svg width="62" height="46" viewBox="0 0 62 46"><ellipse cx="18" cy="16" rx="15" ry="10" fill="#cfe0ee" opacity="0.85"/><ellipse cx="44" cy="16" rx="15" ry="10" fill="#cfe0ee" opacity="0.85"/><ellipse cx="31" cy="28" rx="14" ry="11" fill="#3a4250"/><circle cx="31" cy="15" r="8" fill="#4a5260"/><circle cx="28" cy="14" r="3" fill="#e23b2e"/><circle cx="34" cy="14" r="3" fill="#e23b2e"/><path d="M28 8 L25 2 M34 8 L37 2" stroke="#3a2c20" stroke-width="2" stroke-linecap="round"/></svg>` },
    { word: 'BEETLE', w: 56, svg: `<svg width="56" height="50" viewBox="0 0 56 50"><circle cx="28" cy="14" r="8" fill="#3a5a2a"/><ellipse cx="28" cy="30" rx="18" ry="16" fill="#4a7a32"/><path d="M28 16 L28 46" stroke="#2a4a1a" stroke-width="2.5"/><path d="M10 24 L2 18 M10 32 L2 34 M46 24 L54 18 M46 32 L54 34 M14 42 L8 48 M42 42 L48 48" stroke="#2a4a1a" stroke-width="2.5" stroke-linecap="round"/><path d="M24 8 L20 2 M32 8 L36 2" stroke="#2a4a1a" stroke-width="2" stroke-linecap="round"/><circle cx="24" cy="13" r="1.6" fill="#fff"/><circle cx="32" cy="13" r="1.6" fill="#fff"/></svg>` },
  ] },
};

// picker rows: 5 single-letter sets, then every word theme in order
const WORD_ORDER = ['colours', 'animals', 'shapes', 'fruit', 'vehicles', 'sealife', 'numbers', 'feelings', 'sight', 'weather', 'toys', 'minibeasts'];
const ROWS = [
  { type: 'letters', label: 'E T A O',       letters: 'ETAO' },
  { type: 'letters', label: '+ I N',         letters: 'ETAOIN' },
  { type: 'letters', label: '+ S H R L',     letters: 'ETAOINSHRL' },
  { type: 'letters', label: '+ D C U M W F', letters: 'ETAOINSHRLDCUMWF' },
  { type: 'letters', label: 'all 26',        letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
  ...WORD_ORDER.map(k => ({ type: 'word', theme: k, label: WORD_THEMES[k].label })),
];

// ---------- state ----------
let state = 'picker';         // 'picker' | 'playing' | 'over' | 'win'
let level = null;             // { rowId, speedId, type, ... }
let catY = GROUND_Y;
let catX = 0;                 // forward offset from home (px) during a leap
let velocity = 0;
let leapVx = 0;               // current forward speed while airborne
let returning = false;        // gliding back to home after landing a leap
let returnFrom = 0;           // catX at the moment of landing
let returnElapsed = 0;        // seconds into the return glide
let returnDur = 0;            // seconds the return glide should take
let airborne = false;
let airJumps = 0;             // jumps used in the current airborne sequence (for double jump)
let speed = 4;
let worldTime = 0;            // keeps ticking, drives day/night
let obstacles = [];
let patches = [];             // rough dirt left where an obstacle was zapped
let finishing = false;        // last obstacle cleared; finish line is rolling in
let finishEl = null;
let finishX = 0;
let items = [];               // fish
let spawnedCount = 0;
let clearedCount = 0;
let levelCount = 12;
let levelGap = LETTER_GAP;
let jumpsLeft = JUMP_BUDGET;
let wastedJumps = 0;          // SPACE jumps that did NOT catch a fish (drives 2-star)
let jumpUncredited = false;   // current jump counted as wasted, not yet refunded by a fish
let tumbled = false;          // hit an obstacle at least once this level (drives 1-star)
let invulnUntil = 0;          // ms timestamp: no collisions while recovering from a tumble
let fishThisRun = 0;
let scrollSinceSpawn = 0;
let groundX = 0;
let lastFrame = 0;
let fishTimer = 0;
let nextFishIn = 3;
let lastSparkleAt = 0;
let lastWord = '';

// one-time migration: carry any saved progress over from the old "cattype-" keys
(function migrateFromCattype() {
  if (localStorage.getItem('typurr-migrated')) return;
  const oldKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('cattype-')) oldKeys.push(k);
  }
  oldKeys.forEach(k => {
    const nk = 'typurr-' + k.slice('cattype-'.length);
    if (localStorage.getItem(nk) === null) localStorage.setItem(nk, localStorage.getItem(k));
  });
  localStorage.setItem('typurr-migrated', '1');
})();

// ---------- players (local profiles) ----------
// 'guest' = the shared "Everyone" profile, kept on the original (unprefixed) keys
const ICON_CHOICES = ['🐱','🐶','🦊','🐰','🐼','🦁','🐯','🐸','🐵','🦄','🐧','🐨','🐢','🐙','🦖','🐝'];
let users = [];
try { users = JSON.parse(localStorage.getItem('typurr-users') || '[]'); } catch (e) { users = []; }
let currentUserId = localStorage.getItem('typurr-current') || 'guest';
if (currentUserId !== 'guest' && !users.find(u => u.id === currentUserId)) currentUserId = 'guest';

// progress key for the current player (guest keeps the legacy unprefixed keys)
function ukey(suffix) {
  return currentUserId === 'guest' ? `typurr-${suffix}` : `typurr-u-${currentUserId}-${suffix}`;
}

let totalFish = parseInt(localStorage.getItem(ukey('fish')) || '0', 10);
let muted = localStorage.getItem('typurr-muted') === '1';
// 'keep' = wrong letters ignored; 'accuracy' = a slip restarts the word
let mistakeMode = localStorage.getItem('typurr-mistake') || 'keep';
// obstacles per level: 12 / 20 / 40
let trackLength = parseInt(localStorage.getItem('typurr-track') || '12', 10);
if (!TRACK_LENGTHS.includes(trackLength)) trackLength = 12;

// ---------- play timer (grown-up control, in-memory: refresh resets it) ----------
let sessionLimitMs = 0;       // 0 = off
let sessionStartMs = 0;       // wall-clock ms when the limit was set
let sessionExpired = false;
let timerPickerOpen = false;
let settingsOpen = false;
let helpOpen = false;
let resetMode = false;        // tapping a level cycles its stars instead of playing

// best stars per level cell, keyed "rowId-speedId" (per player)
function bestStars(rowId, speedId) {
  return parseInt(localStorage.getItem(ukey(`stars-${rowId}-${speedId}`)) || '0', 10);
}
function saveStars(rowId, speedId, stars) {
  if (stars > bestStars(rowId, speedId)) {
    localStorage.setItem(ukey(`stars-${rowId}-${speedId}`), String(stars));
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
  doubleJump: () => tone(480, 960, 0.2, 'triangle', 0.25),
  hop: () => tone(360, 620, 0.14, 'triangle', 0.2),
  tick: () => tone(660, 880, 0.06, 'sine', 0.16),       // correct letter within a word
  ding: () => { tone(880, 880, 0.09, 'sine', 0.22); tone(1320, 1320, 0.16, 'sine', 0.2, 0.07); },
  nope: () => tone(200, 150, 0.16, 'sawtooth', 0.16),
  smash: () => { tone(300, 60, 0.2, 'square', 0.2); tone(150, 40, 0.25, 'sawtooth', 0.15, 0.02); },
  bump: () => tone(170, 55, 0.35, 'sawtooth', 0.22),
  tumble: () => { tone(440, 150, 0.22, 'square', 0.18); tone(240, 90, 0.3, 'sawtooth', 0.14, 0.05); },
  bloop: () => { tone(520, 880, 0.12, 'sine', 0.22); tone(780, 1240, 0.14, 'sine', 0.18, 0.08); },
  poff: () => tone(260, 150, 0.16, 'sine', 0.2),
  fanfare: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.18, 'triangle', 0.22, i * 0.13)); },
};

function updateSoundBtn() {
  settingsSoundBtn.textContent = muted ? '🔇 Sound: Off' : '🔊 Sound: On';
}

settingsSoundBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  muted = !muted;
  localStorage.setItem('typurr-muted', muted ? '1' : '0');
  updateSoundBtn();
});

homeBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  goToPicker();
});

// ---------- settings menu ----------
function openSettings() {
  if (sessionExpired) return;
  settingsOpen = true;
  settingsMenu.classList.remove('hidden');
}
function closeSettings() {
  settingsOpen = false;
  settingsMenu.classList.add('hidden');
}

gearBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  ensureAudio();
  settingsOpen ? closeSettings() : openSettings();
});
settingsCloseBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); closeSettings(); });
settingsMenu.addEventListener('pointerdown', (e) => { if (e.target === settingsMenu) closeSettings(); });

settingsTimerBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); closeSettings(); openTimerPicker(); });
settingsHelpBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); closeSettings(); openHelp(); });
settingsResetBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); closeSettings(); enterResetMode(); });

// ---------- how to play ----------
function openHelp() { helpOpen = true; helpScreen.classList.remove('hidden'); }
function closeHelp() { helpOpen = false; helpScreen.classList.add('hidden'); }
helpCloseBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); closeHelp(); });
helpScreen.addEventListener('pointerdown', (e) => { if (e.target === helpScreen) closeHelp(); });

// ---------- change-stars (reset) mode ----------
function setStarsExact(rowId, speedId, n) {
  const key = ukey(`stars-${rowId}-${speedId}`);
  if (n <= 0) localStorage.removeItem(key);
  else localStorage.setItem(key, String(n));
}

function enterResetMode() {
  goToPicker();
  resetMode = true;
  resetBannerText.textContent = `Tap a level to change ${currentPlayer().name}'s stars (3 → 2 → 1 → 0)`;
  resetBanner.classList.remove('hidden');
  lvGrid.classList.add('reset-mode');
}
function exitResetMode() {
  resetMode = false;
  resetBanner.classList.add('hidden');
  lvGrid.classList.remove('reset-mode');
}
resetDoneBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); exitResetMode(); });

// ---------- play timer ----------
function updateTimerDisplay() {
  if (!sessionLimitMs) {
    timerDisplay.classList.add('hidden');
    return;
  }
  timerDisplay.classList.remove('hidden');
  const remaining = Math.max(0, sessionLimitMs - (Date.now() - sessionStartMs));
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  timerDisplay.textContent = `⏱ ${mins}:${String(secs).padStart(2, '0')}`;
  timerDisplay.classList.toggle('warning', remaining < 60000);
}

function openTimerPicker() {
  if (sessionExpired) return;
  timerPickerOpen = true;
  timerPicker.classList.remove('hidden');
  timerPicker.querySelectorAll('.timer-opt').forEach(btn => {
    const mins = parseInt(btn.dataset.mins, 10);
    btn.classList.toggle('selected', sessionLimitMs === mins * 60000);
  });
}

function closeTimerPicker() {
  timerPickerOpen = false;
  timerPicker.classList.add('hidden');
}

function checkSessionTimer() {
  if (sessionLimitMs && !sessionExpired && Date.now() - sessionStartMs >= sessionLimitMs) {
    sessionExpired = true;
    state = 'timesup';
    catSvg.classList.remove('running', 'jumping', 'flip', 'tumbling');
    catSvg.classList.add('oops');
    catEl.classList.remove('dancing');
    settingsMenu.classList.add('hidden');
    helpScreen.classList.add('hidden');
    timerPicker.classList.add('hidden');
    timesupScreen.classList.remove('hidden');
  }
  updateTimerDisplay();
}

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
    updateTimerDisplay();
    closeTimerPicker();
  });
});

// tap outside the card to dismiss the picker
timerPicker.addEventListener('pointerdown', (e) => {
  if (e.target === timerPicker) closeTimerPicker();
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
    return { word: pickLetter(), svg: type.svg, w: type.w, badge: 'letter' };
  }
  const theme = WORD_THEMES[level.theme];
  let item;
  do { item = theme.items[Math.floor(Math.random() * theme.items.length)]; }
  while (item.word === lastWord && theme.items.length > 1);
  lastWord = item.word;
  if (theme.kind === 'colour') {
    return { word: item.word, svg: balloonSvg(item.col), w: 58, badge: 'colour', col: item.col };
  }
  return { word: item.word, svg: item.svg, w: item.w || 64, badge: 'word' };
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
  el.className = 'ob-word theme-' + (spec.badge === 'colour' ? 'colour' : 'word');
  const spanEls = [];
  for (const ch of spec.word) {
    const s = document.createElement('span');
    s.className = 'wl';
    s.textContent = ch;
    if (spec.badge === 'colour') s.style.color = spec.col;
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

// ---------- dirt patch (left where an obstacle was zapped; just scrolls by) ----------
function patchSvg(w) {
  const cx = w / 2;
  return `<svg width="${w}" height="20" viewBox="0 0 ${w} 20">
    <ellipse cx="${cx}" cy="13" rx="${cx - 2}" ry="6.5" fill="#b1814e"/>
    <ellipse cx="${cx}" cy="11" rx="${cx - 9}" ry="4.5" fill="#9c6f40"/>
    <circle cx="${cx - 14}" cy="9" r="2" fill="#85602f"/>
    <circle cx="${cx + 10}" cy="12" r="1.8" fill="#85602f"/>
    <circle cx="${cx + 2}" cy="8" r="1.6" fill="#c89564"/>
    <circle cx="${cx - 4}" cy="13" r="1.5" fill="#c89564"/>
  </svg>`;
}

function spawnPatch(x, w) {
  const el = document.createElement('div');
  el.className = 'patch';
  el.innerHTML = patchSvg(w);
  el.style.transform = `translateX(${x}px)`;
  container.appendChild(el);
  patches.push({ el, x, w });
}

// Ty flicks a paw and sparkly stars streak across to zap the obstacle
const SWOOSH_SVG = `<svg width="58" height="66" viewBox="0 0 58 66">
  <path d="M8 10 Q48 22 22 58" stroke="#ffffff" stroke-width="7" fill="none" stroke-linecap="round"/>
  <path d="M22 6 Q56 22 36 60" stroke="#ffe9a8" stroke-width="5" fill="none" stroke-linecap="round"/>
</svg>`;

function pawSwipe() {
  catSvg.classList.remove('swiping');
  void catSvg.offsetWidth;
  catSvg.classList.add('swiping');
  setTimeout(() => catSvg.classList.remove('swiping'), 340);
  // a bold whoosh arc in front of Ty so the swipe reads clearly
  const sw = document.createElement('div');
  sw.className = 'swoosh';
  sw.innerHTML = SWOOSH_SVG;
  sw.style.left = (catEl.offsetLeft + 96) + 'px';
  sw.style.bottom = '86px';
  container.appendChild(sw);
  setTimeout(() => sw.remove(), 400);
}

function zapStars(targetX, targetBottom) {
  const startX = catEl.offsetLeft + 96;
  for (let i = 0; i < 9; i++) {
    const s = document.createElement('div');
    s.className = 'zap-star';
    const sb = 100 + (Math.random() * 36 - 18);
    s.style.left = startX + 'px';
    s.style.bottom = sb + 'px';
    container.appendChild(s);
    const dx = targetX - startX + (Math.random() * 28 - 14);
    const dy = targetBottom - sb + (Math.random() * 24 - 12);
    requestAnimationFrame(() => {
      s.style.transitionDelay = (i * 0.035) + 's';
      s.style.transform = `translate(${dx}px, ${-dy}px) scale(0.7) rotate(220deg)`;
      s.style.opacity = '0';
    });
    setTimeout(() => s.remove(), 1000 + i * 40);
  }
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
  // if this fish was caught during a counted jump, that jump no longer counts
  if (jumpUncredited) { wastedJumps = Math.max(0, wastedJumps - 1); jumpUncredited = false; }
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
  const cx = ob.x + ob.w / 2;
  // Ty swipes a paw and fires sparkly stars across to the obstacle
  pawSwipe();
  zapStars(cx, 100);
  letterPop(ob.word, cx - ob.word.length * 9, 120);
  puff(ob.x, 90);
  puff(ob.x + 24, 110);
  ringAt(cx, 100);
  ob.el.classList.add('smashing');
  setTimeout(() => ob.el.remove(), 420);
  // leave a rough patch of unsettled dirt where it stood
  spawnPatch(ob.x + ob.w / 2 - ob.w / 2, ob.w + 18);
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

function resetWord(ob) {
  ob.typed = 0;
  if (ob.spanEls) {
    ob.spanEls.forEach((s, i) => {
      s.classList.remove('done', 'next');
      if (i === 0) s.classList.add('next');
    });
  }
}

function typeLetter(letter) {
  const ob = frontObstacle();
  if (!ob) return;
  if (ob.word[ob.typed] !== letter) {
    flashWrong(ob);
    // accuracy mode: a slip mid-word sends you back to the start of that word
    if (mistakeMode === 'accuracy' && ob.typed > 0) resetWord(ob);
    return;
  }
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
}

// a checkered finish line that rolls in once the last obstacle is cleared
function finishSvg() {
  const sq = 13, cols = 4, rows = 3, fx = 22, fy = 16;
  let checks = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if ((r + c) % 2 === 0) checks += `<rect x="${fx + c * sq}" y="${fy + r * sq}" width="${sq}" height="${sq}" fill="#2e2e2e"/>`;
  }
  let band = '';
  for (let c = 0; c < 6; c++) band += `<rect x="${16 + c * 10}" y="204" width="10" height="12" fill="${c % 2 ? '#fff' : '#2e2e2e'}"/>`;
  return `<svg width="80" height="220" viewBox="0 0 80 220">
    <rect x="13" y="2" width="7" height="216" rx="3" fill="#9a6e48"/>
    <circle cx="16" cy="4" r="5" fill="#ffd166"/>
    <rect x="${fx}" y="${fy}" width="${cols * sq}" height="${rows * sq}" fill="#fff" stroke="#2e2e2e" stroke-width="2"/>
    ${checks}
    <rect x="14" y="202" width="62" height="16" rx="2" fill="#fff" stroke="#2e2e2e" stroke-width="1.5"/>
    ${band}
  </svg>`;
}

function startFinish() {
  finishing = true;
  finishEl = document.createElement('div');
  finishEl.className = 'finish';
  finishEl.innerHTML = finishSvg();
  // enter from the right edge, one gap behind the last obstacle
  finishX = container.clientWidth + 40;
  finishEl.style.transform = `translateX(${finishX}px)`;
  container.appendChild(finishEl);
}

function clearFinish() {
  finishing = false;
  if (finishEl) { finishEl.remove(); finishEl = null; }
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
// airJumps: 0 on the ground, 1 after a first jump/hop, 2 after a double jump
function spaceJump() {
  if (!airborne) {
    if (jumpsLeft <= 0) {
      pawsBadgeEl.classList.remove('shake');
      void pawsBadgeEl.offsetWidth;
      pawsBadgeEl.classList.add('shake');
      return;
    }
    jumpsLeft--;
    wastedJumps++;          // counts against stars unless a fish is caught this jump
    jumpUncredited = true;
    renderPaws();
    airborne = true;
    returning = false;
    airJumps = 1;
    velocity = JUMP_STRENGTH;
    // advance through the world at a steady rate; on fast levels the ground
    // already does that, so the cat barely lunges forward on screen
    leapVx = Math.max(0, BASE_LEAP_VX - speed);
    catSvg.classList.remove('running');
    catSvg.classList.add('jumping');
    sfx.jump();
  } else if (airJumps === 1) {
    // a second tap in the air: free double jump with a somersault (more distance)
    airJumps = 2;
    velocity = DOUBLE_JUMP_STRENGTH;
    catSvg.classList.add('flip');
    for (let i = 0; i < 5; i++) sparkle();
    sfx.doubleJump();
  }
}

function land() {
  catY = GROUND_Y;
  airborne = false;
  airJumps = 0;
  leapVx = 0;
  // glide gently back to home; longer leaps take longer, short ones are quick
  returning = catX > 2;
  if (returning) {
    returnFrom = catX;
    returnElapsed = 0;
    returnDur = Math.min(RETURN_MAX_TIME, Math.max(0.4, catX / 180));
  }
  jumpUncredited = false; // jump arc ended; no fish means it stays counted
  velocity = 0;
  catSvg.classList.remove('jumping', 'flip');
  catSvg.classList.add('running');
  catEl.classList.remove('landed');
  void catEl.offsetWidth;
  catEl.classList.add('landed');
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

// hitting an obstacle: tumble over it (costs 3 jumps) if you can afford it,
// otherwise the run ends
function handleHit(ob, now) {
  if (jumpsLeft >= 3) {
    jumpsLeft -= 3;
    renderPaws();
    tumbled = true;
    invulnUntil = now + 1000;
    // the obstacle is knocked aside but still counts as cleared
    const idx = obstacles.indexOf(ob);
    if (idx >= 0) obstacles.splice(idx, 1);
    puff(ob.x, 96);
    puff(ob.x + 20, 116);
    ob.el.remove();
    catSvg.classList.add('tumbling');
    setTimeout(() => catSvg.classList.remove('tumbling'), 700);
    sfx.tumble();
    if (!ob.cleared) { ob.cleared = true; markCleared(); }
  } else {
    failLevel();
  }
}

// ---------- input ----------
function modalOpen() {
  return sessionExpired || timerPickerOpen || settingsOpen || helpOpen;
}

function handleTap() {
  if (modalOpen()) return;
  ensureAudio();
  if (state === 'playing') spaceJump();
}

container.addEventListener('pointerdown', handleTap);

document.addEventListener('keydown', (e) => {
  // let typing flow normally into the name input (don't jump / don't block backspace)
  if (e.target && e.target.tagName === 'INPUT') return;
  // never let Backspace navigate the browser back during the game
  if (e.code === 'Backspace') { e.preventDefault(); return; }
  if (modalOpen()) return;
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
      const row = parseInt(btn.dataset.row, 10);
      const sp = parseInt(btn.dataset.speed, 10);
      if (resetMode) {
        // cycle this cell's stars: 3 -> 2 -> 1 -> 0 -> 3
        const cur = bestStars(row, sp);
        const next = cur === 0 ? 3 : cur - 1;
        setStarsExact(row, sp, next);
        btn.querySelector('.lv-stars').textContent = '★★★☆☆☆'.slice(3 - next, 6 - next);
        return;
      }
      ensureAudio();
      startLevel(row, sp);
    });
  });
}

function startLevel(rowId, speedId) {
  const row = ROWS[rowId];
  level = {
    rowId, speedId,
    type: row.type,
    theme: row.theme,
    letters: row.letters,
    speed: SPEEDS[speedId].speed,
  };
  speed = level.speed;
  levelCount = trackLength;
  levelGap = row.type === 'letters' ? LETTER_GAP : WORD_GAP;
  // reset world
  obstacles.forEach(o => o.el.remove()); obstacles = [];
  patches.forEach(p => p.el.remove()); patches = [];
  clearFinish();
  items.forEach(it => it.el.remove()); items = [];
  catY = GROUND_Y;
  catX = 0;
  velocity = 0;
  leapVx = 0;
  returning = false;
  airborne = false;
  airJumps = 0;
  spawnedCount = 0;
  clearedCount = 0;
  jumpsLeft = JUMP_BUDGET;
  wastedJumps = 0;
  jumpUncredited = false;
  tumbled = false;
  invulnUntil = 0;
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
  catEl.classList.remove('dancing', 'intro');
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
  localStorage.setItem(ukey('fish'), String(totalFish));
  overProgressEl.textContent = `You smashed ${clearedCount} of ${levelCount}!`;
  overFishEl.textContent = fishThisRun > 0 ? `🐟 × ${fishThisRun}` : '';
  overScreen.classList.remove('hidden');
}

function winLevel() {
  state = 'win';
  clearFinish();
  // settle the cat on the ground and let it do a happy dance
  airborne = false;
  airJumps = 0;
  returning = false;
  catX = 0;
  velocity = 0;
  catY = GROUND_Y;
  catEl.style.bottom = GROUND_Y + 'px';
  catEl.style.transform = '';
  catSvg.classList.remove('jumping');
  catSvg.classList.add('running');
  catEl.classList.add('dancing');
  // star rating: 3 = typing (and fish-jumps) only, 2 = a non-fish jump, 1 = a tumble
  let stars = 3;
  if (tumbled) stars = 1;
  else if (wastedJumps > 0) stars = 2;
  const prevBest = bestStars(level.rowId, level.speedId);
  saveStars(level.rowId, level.speedId, stars);
  totalFish += fishThisRun;
  localStorage.setItem(ukey('fish'), String(totalFish));

  winStarsEl.innerHTML = '★★★☆☆☆'.slice(3 - stars, 6 - stars)
    .split('').map((c, i) => `<span style="animation-delay:${i * 0.18}s">${c}</span>`).join('');
  winLineEl.textContent = tumbled
    ? 'You took a tumble. Keep practising!'
    : wastedJumps > 0
      ? `You used ${wastedJumps} jump${wastedJumps === 1 ? '' : 's'}.`
      : 'No jumps needed. Super typing!';
  winLineEl.classList.toggle('new-best', stars > prevBest);
  winFishEl.textContent = fishThisRun > 0 ? `🐟 × ${fishThisRun}` : '';
  winScreen.classList.remove('hidden');
  confettiBurst();
  setTimeout(() => sfx.fanfare(), 250);
}

function goToPicker() {
  state = 'picker';
  obstacles.forEach(o => o.el.remove()); obstacles = [];
  patches.forEach(p => p.el.remove()); patches = [];
  clearFinish();
  items.forEach(it => it.el.remove()); items = [];
  catY = GROUND_Y;
  catX = 0;
  velocity = 0;
  leapVx = 0;
  returning = false;
  airborne = false;
  airJumps = 0;
  catEl.style.bottom = GROUND_Y + 'px';
  catEl.style.transform = '';
  catEl.classList.remove('dancing');
  catEl.classList.add('intro');
  catSvg.classList.remove('oops', 'jumping', 'flip');
  catSvg.classList.add('running');
  overScreen.classList.add('hidden');
  winScreen.classList.add('hidden');
  buildPicker();
  renderSettings();
  renderUserBar();
  updateTotalFish();
  pickerScreen.classList.remove('hidden');
}

overAgainBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if (level) startLevel(level.rowId, level.speedId);
});
overPickBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  goToPicker();
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

// ---------- players (local profiles) ----------
function currentPlayer() {
  if (currentUserId === 'guest') return { id: 'guest', name: 'Everyone', icon: '🌈' };
  return users.find(u => u.id === currentUserId) || { id: 'guest', name: 'Everyone', icon: '🌈' };
}

function renderUserBar() {
  const all = [{ id: 'guest', name: 'Everyone', icon: '🌈' }, ...users];
  let html = '<span class="user-bar-label">Player</span>';
  html += all.map(u =>
    `<button class="user-chip${u.id === currentUserId ? ' selected' : ''}" data-id="${u.id}">
      <span class="uc-icon">${u.icon}</span><span class="uc-name">${u.name}</span></button>`
  ).join('');
  html += `<button class="user-chip add" id="add-user-chip"><span class="uc-icon">＋</span><span class="uc-name">New</span></button>`;
  userBar.innerHTML = html;
  userBar.querySelectorAll('.user-chip[data-id]').forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      switchUser(btn.dataset.id);
    });
  });
  document.getElementById('add-user-chip').addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    openUserDialog();
  });
}

function switchUser(id) {
  currentUserId = id;
  localStorage.setItem('typurr-current', id);
  totalFish = parseInt(localStorage.getItem(ukey('fish')) || '0', 10);
  renderUserBar();
  buildPicker();   // stars are per player
  updateTotalFish();
}

let pendingIcon = ICON_CHOICES[0];
function openUserDialog() {
  pendingIcon = ICON_CHOICES[0];
  userNameInput.value = '';
  iconGrid.innerHTML = ICON_CHOICES.map((ic, i) =>
    `<button class="icon-opt${i === 0 ? ' selected' : ''}" data-icon="${ic}">${ic}</button>`
  ).join('');
  iconGrid.querySelectorAll('.icon-opt').forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      pendingIcon = btn.dataset.icon;
      iconGrid.querySelectorAll('.icon-opt').forEach(b => b.classList.toggle('selected', b === btn));
    });
  });
  userDialog.classList.remove('hidden');
  setTimeout(() => userNameInput.focus(), 50);
}

function closeUserDialog() {
  userDialog.classList.add('hidden');
}

function addUser() {
  const name = userNameInput.value.trim().slice(0, 12) || 'Player';
  const id = 'u' + Date.now();
  users.push({ id, name, icon: pendingIcon });
  localStorage.setItem('typurr-users', JSON.stringify(users));
  closeUserDialog();
  switchUser(id);
}

userSaveBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); addUser(); });
userCancelBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); closeUserDialog(); });
userNameInput.addEventListener('keydown', (e) => {
  e.stopPropagation();
  if (e.key === 'Enter') addUser();
});

// ---------- home-screen settings (mistake mode + track length) ----------
function renderSettings() {
  document.querySelectorAll('#settings-bar .set-opt').forEach(btn => {
    const active = btn.dataset.set === 'mistake'
      ? btn.dataset.val === mistakeMode
      : parseInt(btn.dataset.val, 10) === trackLength;
    btn.classList.toggle('selected', active);
  });
}

document.querySelectorAll('#settings-bar .set-opt').forEach(btn => {
  btn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if (btn.dataset.set === 'mistake') {
      mistakeMode = btn.dataset.val;
      localStorage.setItem('typurr-mistake', mistakeMode);
    } else {
      trackLength = parseInt(btn.dataset.val, 10);
      localStorage.setItem('typurr-track', String(trackLength));
    }
    renderSettings();
  });
});

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

    // spawn obstacles at constant pixel spacing; the finish line follows one
    // gap behind the last obstacle so it always arrives after it
    scrollSinceSpawn += speed * dt;
    if (scrollSinceSpawn >= levelGap) {
      if (spawnedCount < levelCount) { spawnObstacle(); scrollSinceSpawn = 0; }
      else if (!finishing) { startFinish(); scrollSinceSpawn = 0; }
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

    // scroll the dirt patches left and clean them up
    for (let i = patches.length - 1; i >= 0; i--) {
      const p = patches[i];
      p.x -= speed * dt;
      p.el.style.transform = `translateX(${p.x}px)`;
      if (p.x < -200) { p.el.remove(); patches.splice(i, 1); }
    }

    // roll the finish line in; crossing it wins the level
    if (finishing && finishEl) {
      finishX -= speed * dt;
      finishEl.style.transform = `translateX(${finishX}px)`;
      if (finishX <= catLeft + 40) {
        clearFinish();
        winLevel();
      }
    }

    // jump physics: arc up while leaping forward, then glide back to home
    if (airborne) {
      catY += velocity * dt;
      velocity -= GRAVITY * dt;
      catX += leapVx * dt;
      if (catY <= GROUND_Y) {
        land();
      } else if (now - lastSparkleAt > 80) {
        lastSparkleAt = now; sparkle();
      }
    } else if (returning) {
      // ease-in-out back to home; the ground keeps scrolling so it looks like
      // Ty slows down and the background gently catches up to him
      returnElapsed += dt / 60;
      const p = Math.min(returnElapsed / returnDur, 1);
      const eased = p * p * (3 - 2 * p);
      catX = returnFrom * (1 - eased);
      if (p >= 1) { catX = 0; returning = false; }
    }
    catEl.style.bottom = catY + 'px';
    catEl.style.transform = `translateX(${catX}px)` + (airborne ? ` rotate(${-velocity * 0.8}deg)` : '');

    // crash? (skipped mid-leap, during the glide back, and just after a tumble)
    if (!airborne && !returning && now >= invulnUntil) {
      const hit = hitObstacle();
      if (hit) handleHit(hit, now);
    }
  }

  checkSessionTimer();
  applySky();
  requestAnimationFrame(frame);
}

// ---------- boot ----------
titleEl.innerHTML = 'Typurr!'.split('').map((ch, i) =>
  ch === ' ' ? ' ' : `<span style="animation-delay:${i * 0.07}s">${ch}</span>`
).join('');

buildPicker();
renderSettings();
renderUserBar();
updateTotalFish();
updateSoundBtn();
updateTimerDisplay();
catEl.style.bottom = GROUND_Y + 'px';
catEl.classList.add('intro');
catSvg.classList.add('running');
lastFrame = performance.now();
requestAnimationFrame(frame);
