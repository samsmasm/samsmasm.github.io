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
  { slug: 'rq',           label: 'Research Question',
    children: [
      { slug: 'rq/starters', label: 'RQ Starters' },
    ]
  },
  { slug: 'sources',      label: 'Finding Sources'          },
  { slug: 'bibliography', label: 'Annotated Bibliography'   },
  { slug: 'narrative',    label: 'Crafting Your Narrative'  },
  { slug: 'tcc',          label: 'Time, Continuity & Change'},
  { slug: 'conclusions',  label: 'Conclusions'              },
  { slug: 'timeline',     label: 'The Timeline'             },
  { slug: 'music',        label: '🎵 Music'                 },
  { slug: 'guestbook',   label: '📖 Guestbook'             },
  { slug: 'big6',        label: '🔍 Big6'                  },
];

function getCurrentSlug() {
  const path = window.location.pathname;
  const idx = path.indexOf('/moa/');
  if (idx === -1) return '';
  const after = path.slice(idx + 5).replace(/\/index\.html$/, '').replace(/\/$/, '');
  return after;
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
    const isActive   = current === page.slug;
    const isExpanded = page.children && (isActive || current.startsWith(page.slug + '/'));
    if (isActive) a.classList.add('active');
    a.textContent = page.label;
    if (page.slug === 'guestbook') {
      const badge = document.createElement('span');
      badge.className = 'new-badge';
      badge.textContent = 'NEW';
      a.appendChild(badge);
    }
    li.appendChild(a);
    if (isExpanded) {
      const subUl = document.createElement('ul');
      subUl.className = 'sub-nav';
      page.children.forEach(child => {
        const subLi = document.createElement('li');
        const subA  = document.createElement('a');
        subA.href = base + child.slug + '/';
        if (current === child.slug) subA.classList.add('active');
        subA.textContent = child.label;
        subLi.appendChild(subA);
        subUl.appendChild(subLi);
      });
      li.appendChild(subUl);
    }
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
    '</p>' +
    '<a class="ai-toggle">How was AI used to make this site?</a>' +
    '<div class="ai-expand">' +
      'I built this site using AI as a production tool. I brought the ideas, the content, and the decisions: what the site should look like, what it should say, and how it should work. The AI took resources I had already created, reshaped and reformatted them, and occasionally added to them, while I iterated on the results, rejecting or refining anything that didn\'t fit. The creative vision and pedagogical judgement were mine throughout; the AI handled the implementation.' +
    '</div>';

  const toggle = aboutDiv.querySelector('.ai-toggle');
  const expand = aboutDiv.querySelector('.ai-expand');
  toggle.addEventListener('click', () => {
    const isOpen = expand.style.display === 'block';
    expand.style.display = isOpen ? 'none' : 'block';
    toggle.classList.toggle('ai-toggle-open', !isOpen);
  });

  win.appendChild(aboutDiv);
}

function initLibraryDropdown() {
  const link = document.querySelector('a.taskbar-link');
  if (!link) return;

  const wrap = document.createElement('div');
  wrap.className = 'library-dropdown-wrap';
  link.parentNode.insertBefore(wrap, link);
  wrap.appendChild(link);

  const drop = document.createElement('div');
  drop.className = 'library-dropdown';
  const dbLinks = [
    { label: 'Gale: Global Issues',  href: 'https://go.gale.com/ps/i.do?p=GIC&sw=w&u=vnssis&v=2.1&pg=BasicSearch&it=static&sid=bookmark-GIC' },
    { label: 'Gale: Global History', href: 'https://go.gale.com/ps/i.do?p=WHIC&sw=w&u=vnssis&v=2.1&pg=BasicSearch&it=static&sid=bookmark-WHIC' },
    { label: 'Gale ebooks',          href: 'https://go.gale.com/ps/i.do?p=GVRL&sw=w&u=vnssis&v=2.1&pg=BasicSearch&it=static&sid=bookmark-GVRL' },
    { label: 'JSTOR',                href: 'https://www.jstor.org/' },
  ];
  dbLinks.forEach(db => {
    const a = document.createElement('a');
    a.href = db.href;
    a.textContent = db.label;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'library-dropdown-item';
    drop.appendChild(a);
  });
  wrap.appendChild(drop);
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
  initLibraryDropdown();
});
