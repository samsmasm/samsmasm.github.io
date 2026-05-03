/* Apply saved font size before paint to avoid flash */
(function () {
  const saved = parseInt(localStorage.getItem('moa-fontsize'));
  if (saved) document.documentElement.style.setProperty('--fs', saved + 'px');
})();

const FONT_KEY     = 'moa-fontsize';
const FONT_DEFAULT = 16;
const FONT_MIN     = 11;
const FONT_MAX     = 21;

const PAGES = [
  { slug: '',             label: 'The Project'              },
  { slug: 'rq',           label: 'Research Question'        },
  { slug: 'sources',      label: 'Finding Sources'          },
  { slug: 'bibliography', label: 'Annotated Bibliography'   },
  { slug: 'narrative',    label: 'Crafting Your Narrative'  },
  { slug: 'tcc',          label: 'Time, Continuity & Change'},
  { slug: 'conclusions',  label: 'Conclusions'              },
  { slug: 'timeline',     label: 'The Timeline'             },
  { slug: 'music',        label: '🎵 Music'                 },
  { slug: 'guestbook',   label: '📖 Guestbook'             },
];

function getCurrentSlug() {
  const path = window.location.pathname;
  const match = path.match(/\/moa\/([^/]+)\/?$/);
  if (!match) return '';
  const seg = match[1];
  if (seg === 'index.html') return '';
  return seg;
}

function getBase() {
  const path = window.location.pathname;
  const idx = path.indexOf('/moa/');
  if (idx === -1) return '/moa/';
  return path.substring(0, idx) + '/moa/';
}

function renderNav() {
  const current = getCurrentSlug();
  const nav = document.getElementById('main-nav');
  if (!nav) return;

  const base = getBase();
  const ul = document.createElement('ul');

  PAGES.forEach(page => {
    const li = document.createElement('li');
    const a  = document.createElement('a');
    a.href = page.slug === '' ? base + 'index.html' : base + page.slug + '/';
    if (page.slug === current) a.classList.add('active');
    a.textContent = page.label;
    if (page.slug === 'guestbook') {
      const badge = document.createElement('span');
      badge.className = 'new-badge';
      badge.textContent = 'NEW';
      a.appendChild(badge);
    }
    li.appendChild(a);
    ul.appendChild(li);
  });

  nav.appendChild(ul);
}

function updateClock() {
  const el = document.getElementById('taskbar-clock');
  if (!el) return;
  const now = new Date();
  el.textContent =
    now.getHours().toString().padStart(2, '0') + ':' +
    now.getMinutes().toString().padStart(2, '0');
}

function initTabs() {
  const btns   = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');
  if (!btns.length) return;

  function activate(id) {
    btns.forEach(b   => b.classList.toggle('active',   b.dataset.tab === id));
    panels.forEach(p => p.classList.toggle('active', p.id === id));
    history.replaceState(null, '', '#' + id);
  }

  btns.forEach(b => b.addEventListener('click', () => activate(b.dataset.tab)));

  const hash = window.location.hash.replace('#', '');
  const valid = [...btns].some(b => b.dataset.tab === hash);
  activate(valid ? hash : btns[0].dataset.tab);
}

function initFontCtrl() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;

  const current = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--fs')
  ) || FONT_DEFAULT;

  const ctrl = document.createElement('div');
  ctrl.className = 'font-ctrl';
  ctrl.innerHTML = `
    <div class="font-ctrl-label">Text Size</div>
    <div class="font-ctrl-row">
      <button class="font-btn" id="font-dec" title="Smaller">&#8722;</button>
      <span class="font-val" id="font-val">${current}px</span>
      <button class="font-btn" id="font-inc" title="Larger">+</button>
    </div>`;
  nav.parentNode.appendChild(ctrl);

  function setSize(size) {
    size = Math.min(FONT_MAX, Math.max(FONT_MIN, size));
    document.documentElement.style.setProperty('--fs', size + 'px');
    localStorage.setItem(FONT_KEY, size);
    document.getElementById('font-val').textContent = size + 'px';
    document.getElementById('font-dec').disabled = size <= FONT_MIN;
    document.getElementById('font-inc').disabled = size >= FONT_MAX;
  }

  setSize(current);

  document.getElementById('font-dec').addEventListener('click', () => {
    setSize(parseInt(document.getElementById('font-val').textContent) - 1);
  });
  document.getElementById('font-inc').addEventListener('click', () => {
    setSize(parseInt(document.getElementById('font-val').textContent) + 1);
  });
}

function initHitCounter() {
  const footer = document.querySelector('.page-footer');
  if (!footer) return;

  const placeholder = ['<span class="hc-label">VISITORS</span><span class="hc-digits">',
    Array(6).fill('<span class="hc-d">-</span>').join(''),
    '</span>'].join('');
  const span = document.createElement('span');
  span.className = 'hit-counter';
  span.innerHTML = placeholder;
  footer.appendChild(span);

  const script = document.createElement('script');
  script.type = 'module';
  script.src = getBase() + 'firebase-counter.js';
  document.head.appendChild(script);
}

function initSidebarExtras() {
  const win = document.querySelector('.sidebar-window');
  if (!win) return;

  const coolDiv = document.createElement('div');
  coolDiv.className = 'sidebar-extra';
  coolDiv.innerHTML = '<div class="sidebar-extra-title">✦ Cool Links</div>';
  const ul = document.createElement('ul');
  ul.className = 'cool-links-list';
  const links = [
    { label: '🎵 Music Playlists',  href: getBase() + 'music/',         ext: false },
    { label: '🎧 Gibbons',          href: getBase() + 'gibbons/',       ext: false },
    { label: '📖 Sign Guestbook',   href: getBase() + 'guestbook/',     ext: false },
    { label: '🌐 SSIS Library',     href: 'https://sites.google.com/ssis.edu.vn/library/library?authuser=2', ext: true },
    { label: '🐱 Kitty Maze!',      href: 'https://www.unisam.nz/kittymaze',      ext: true },
    { label: '🔮 Mandelbrot',       href: 'https://www.unisam.nz/mandelbrot-v2',  ext: true },
    { label: '📺 \'90s internet',   href: 'https://www.youtube.com/watch?v=cH8ihSlc9s4', ext: true },
    { label: '🖥️ More \'90s internet', href: 'https://www.webdesignmuseum.org/exhibitions/web-design-in-the-90s', ext: true },
    { label: '⛷️ SkiFree',            href: 'https://archive.org/details/win3_SKIFREE',                         ext: true },
  ];
  const flashPeriods = [0.65, 1.05, 0.85, 1.35, 0.55, 1.6, 1.2, 0.75, 1.45];
links.forEach((lnk, i) => {
    const li    = document.createElement('li');
    const a     = document.createElement('a');
    a.href = lnk.href;
    const chars = [...lnk.label];
    const emojiSpan = document.createElement('span');
    emojiSpan.className = 'cool-emoji';
    emojiSpan.style.animationDuration = (flashPeriods[i] || 1) + 's';
    emojiSpan.textContent = chars[0];
    a.appendChild(emojiSpan);
    a.appendChild(document.createTextNode(chars.slice(1).join('')));
    if (lnk.ext) { a.target = '_blank'; a.rel = 'noopener'; }
    li.appendChild(a);
    ul.appendChild(li);
  });
  coolDiv.appendChild(ul);
  win.appendChild(coolDiv);

  const aboutDiv = document.createElement('div');
  aboutDiv.className = 'sidebar-extra';
  aboutDiv.innerHTML =
    '<div class="sidebar-extra-title">ℹ About This Site</div>' +
    '<p class="sidebar-about-text">' +
      '<strong>MOA</strong> is a Grade&nbsp;9 Foundations of the Modern World site.<br>' +
      'Events: <strong>1990–2015</strong>.<br>' +
      'This site is straight out of the 90s.<br>' +
      'Best viewed at 800&times;600. ✦' +
    '</p>';
  win.appendChild(aboutDiv);
}

function initLastUpdated() {
  const footer = document.querySelector('.page-footer');
  if (!footer) return;
  const span = document.createElement('span');
  span.className = 'last-updated';
  span.textContent = 'Last updated: April 2026';
  footer.appendChild(span);
}

function initSidebarLogo() {
  const logo = document.querySelector('.sidebar-logo');
  if (!logo) return;
  const base = getBase();
  const override = window.MOA_LOGO_OVERRIDE || {};
  const img = document.createElement('img');
  img.src = override.src || (base + 'moa.png');
  img.alt = 'MOA: Modern Origin Archive';

  function spin() {
    img.classList.remove('spinning');
    void img.offsetWidth;
    img.classList.add('spinning');
  }

  spin();
  setInterval(spin, override.interval || 60000);

  img.addEventListener('click', () => {
    window.location.href = base + 'index.html';
  });

  logo.prepend(img);
}

document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  updateClock();
  setInterval(updateClock, 30000);
  initTabs();
  initFontCtrl();
  initHitCounter();
  initSidebarLogo();
  initLastUpdated();
  initSidebarExtras();
});
