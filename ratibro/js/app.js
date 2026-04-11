// RatIBro — shared app logic: auth, sidebar, theme, storage

// === Mock Auth (localStorage-based for prototype) ===
// In production this will be replaced with Firebase Auth

const TEACHER_USERNAME = 'teacher';
const TEACHER_PASSWORD = 'teacher123';
const STUDENT_PASSWORD = 'student123'; // all students share this for prototype

function login(username, password) {
  const isTeacher = username === TEACHER_USERNAME && password === TEACHER_PASSWORD;
  const isStudent = username !== TEACHER_USERNAME && password === STUDENT_PASSWORD;
  if (!isTeacher && !isStudent) return false;
  const user = { username, isTeacher };
  const userJson = JSON.stringify(user);
  try { localStorage.setItem('ratibro_user', userJson); } catch(e) {}
  window.name = userJson; // fallback for file:// protocol (persists across tab navigation)
  return true;
}

function logout() {
  try { localStorage.removeItem('ratibro_user'); } catch(e) {}
  window.name = '';
  window.location.replace('index.html');
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem('ratibro_user') || window.name;
    if (!raw) return null;
    const user = JSON.parse(raw);
    if (user && user.username) {
      // Keep localStorage in sync
      try { localStorage.setItem('ratibro_user', JSON.stringify(user)); } catch(e) {}
      return user;
    }
    return null;
  } catch(e) {
    return null;
  }
}

function requireAuth(redirect = 'index.html') {
  const user = getCurrentUser();
  if (!user) { window.location.replace(redirect); return null; }
  return user;
}

// === Progress Storage ===
// Stored as: ratibro_progress_{username} = { skillId: { ratings: [1,2,3], attempts: 5 } }

function getProgress(username) {
  try {
    const raw = localStorage.getItem(`ratibro_progress_${username}`);
    return raw ? JSON.parse(raw) : {};
  } catch(e) { return {}; }
}

function saveProgress(username, progress) {
  try {
    localStorage.setItem(`ratibro_progress_${username}`, JSON.stringify(progress));
  } catch(e) {}
}

function recordAttempt(username, skillId, rating) {
  const progress = getProgress(username);
  if (!progress[skillId]) progress[skillId] = { ratings: [], attempts: 0 };
  progress[skillId].ratings.push({ rating, timestamp: Date.now() });
  progress[skillId].attempts++;
  saveProgress(username, progress);
}

function getSkillProgress(username, skillId) {
  const progress = getProgress(username);
  return progress[skillId] || { ratings: [], attempts: 0 };
}

function getLatestRating(username, skillId) {
  const p = getSkillProgress(username, skillId);
  if (!p.ratings.length) return null;
  return p.ratings[p.ratings.length - 1].rating;
}

// === Theme ===
function getTheme() {
  return localStorage.getItem('ratibro_theme') || 'light';
}

function setTheme(theme) {
  localStorage.setItem('ratibro_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}

function initTheme() {
  setTheme(getTheme());
}

function toggleTheme() {
  setTheme(getTheme() === 'light' ? 'dark' : 'light');
  updateThemeToggle();
}

function updateThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const isDark = getTheme() === 'dark';
  btn.querySelector('.theme-icon').textContent = isDark ? '☀️' : '🌙';
  btn.querySelector('.theme-label').textContent = isDark ? 'Light mode' : 'Dark mode';
}

// === Sidebar ===
function buildSidebar(activePage, user) {
  const isTeacher = user?.isTeacher;
  const nav = [
    { id: 'dashboard', label: 'Dashboard', href: 'dashboard.html', icon: svgGrid() },
    { id: 'definitions', label: 'Definitions', href: 'definitions.html', icon: svgBook() },
    { id: 'calculations', label: 'Calculations', href: 'calculations.html', icon: svgCalc() },
    { id: 'statements', label: 'Statements', href: 'statements.html', icon: svgDoc() },
  ];
  if (isTeacher) {
    nav.push({ id: 'teacher', label: 'Teacher panel', href: 'teacher.html', icon: svgTeacher() });
  }

  const navHtml = nav.map(item => `
    <a href="${item.href}" class="nav-item${activePage === item.id ? ' active' : ''}">
      ${item.icon}
      <span>${item.label}</span>
    </a>
  `).join('');

  return `
    <aside class="sidebar">
      <div class="sidebar-logo">
        <img src="ratibrosm.png" alt="RatIBro mascot">
        <span class="logo-text">Rat<span class="logo-ib">IB</span>ro</span>
      </div>
      <nav class="sidebar-nav">${navHtml}</nav>
      <div class="sidebar-footer">
        <button class="theme-toggle-btn" id="theme-toggle" onclick="toggleTheme()">
          <span class="theme-icon">🌙</span>
          <span class="theme-label">Dark mode</span>
        </button>
        <div class="sidebar-user">
          <span class="sidebar-username">${user?.username || ''}</span>
          <button class="nav-item logout-btn" onclick="logout()">
            ${svgLogout()}
            <span>Log out</span>
          </button>
        </div>
      </div>
    </aside>
  `;
}

function initSidebar(activePage) {
  const user = requireAuth();
  if (!user) return null;
  const container = document.getElementById('sidebar-container');
  if (container) {
    container.innerHTML = buildSidebar(activePage, user);
    updateThemeToggle();
  }
  return user;
}

// === Toast ===
function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2700);
}

// === Rating colour helpers ===
const RATING_LABELS = { 1: 'Red', 2: 'Amber', 3: 'Yellow', 4: 'Green' };
const RATING_MEANINGS = { 1: "Don't know it", 2: 'Shaky', 3: 'Getting there', 4: 'Got it' };

// === SVG Icons ===
function svgGrid() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>`;
}
function svgBook() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>`;
}
function svgCalc() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/>
    <line x1="8" y1="10" x2="8" y2="10"/><line x1="12" y1="10" x2="12" y2="10"/><line x1="16" y1="10" x2="16" y2="10"/>
    <line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/>
    <line x1="8" y1="18" x2="12" y2="18"/>
  </svg>`;
}
function svgDoc() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>
  </svg>`;
}
function svgTeacher() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>`;
}
function svgLogout() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>`;
}
