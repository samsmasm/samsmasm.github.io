// RatIBro -shared app logic: theme, sidebar, toast, SVG icons

// === Theme ===
function getTheme() {
  try { return localStorage.getItem('ratibro_theme') || 'light'; } catch(e) { return 'light'; }
}

function setTheme(theme) {
  try { localStorage.setItem('ratibro_theme', theme); } catch(e) {}
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
function buildSidebar(activePage, displayName, isTeacher) {
  const nav = [
    { id: 'dashboard',    label: 'Dashboard',    href: 'dashboard.html',    icon: svgGrid() },
    { id: 'definitions',  label: 'Definitions',  href: 'definitions.html',  icon: svgBook() },
    { id: 'calculations', label: 'Calculations', href: 'calculations.html', icon: svgCalc() },
    { id: 'statements',   label: 'Statements',   href: 'statements.html',   icon: svgDoc() },
  ];
  if (isTeacher) {
    nav.push({ id: 'teacher', label: 'Teacher panel', href: 'teacher.html', icon: svgTeacher() });
  }

  const navHtml = nav.map(item => `
    <a href="${item.href}" class="nav-item${activePage === item.id ? ' active' : ''}">
      ${item.icon}<span>${item.label}</span>
    </a>
  `).join('');

  return `
    <button class="mobile-menu-btn" onclick="toggleMobileMenu()" aria-label="Toggle menu">☰</button>
    <aside class="sidebar" id="app-sidebar">
      <div class="sidebar-logo">
        <img src="ratibroicon2sm.png" alt="RatIBro mascot">
        <span class="logo-text">Rat<span class="logo-ib">IB</span>ro</span>
      </div>
      <nav class="sidebar-nav">${navHtml}</nav>
      <div class="sidebar-footer">
        <button class="theme-toggle-btn" id="theme-toggle" onclick="toggleTheme()">
          <span class="theme-icon">🌙</span>
          <span class="theme-label">Dark mode</span>
        </button>
        <div class="sidebar-user">
          <span class="sidebar-username">${displayName}</span>
          <button class="nav-item logout-btn" id="logout-btn">
            ${svgLogout()}<span>Log out</span>
          </button>
        </div>
      </div>
    </aside>
  `;
}

function toggleMobileMenu() {
  document.body.classList.toggle('sidebar-open');
  // Close when clicking the overlay
  if (document.body.classList.contains('sidebar-open')) {
    document.addEventListener('click', closeMobileMenuOnOutsideClick, { once: false });
  }
}

function closeMobileMenuOnOutsideClick(e) {
  const sidebar = document.getElementById('app-sidebar');
  const menuBtn = document.querySelector('.mobile-menu-btn');
  if (sidebar && !sidebar.contains(e.target) && menuBtn && !menuBtn.contains(e.target)) {
    document.body.classList.remove('sidebar-open');
    document.removeEventListener('click', closeMobileMenuOnOutsideClick);
  }
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

// === Rating helpers ===
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

// === Help modal ===
function showHelp(html) {
  let overlay = document.getElementById('help-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'help-overlay';
    overlay.className = 'help-overlay';
    overlay.innerHTML = `<div class="help-modal" role="dialog" aria-modal="true">
      <button class="help-close" onclick="closeHelp()" aria-label="Close help">&times;</button>
      <div id="help-body"></div>
    </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeHelp(); });
    document.body.appendChild(overlay);
  }
  document.getElementById('help-body').innerHTML = html;
  overlay.classList.add('visible');
}

function closeHelp() {
  const overlay = document.getElementById('help-overlay');
  if (overlay) overlay.classList.remove('visible');
}
