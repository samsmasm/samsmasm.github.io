/* Apply saved font size before paint to avoid flash */
(function () {
  const saved = parseInt(localStorage.getItem('moa-fontsize'));
  if (saved) document.documentElement.style.setProperty('--fs', saved + 'px');
})();

const FONT_KEY     = 'moa-fontsize';
const FONT_DEFAULT = 15;
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
  const key = 'moa-hits-' + (getCurrentSlug() || 'home');
  const seed = (key.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 137) % 8000 + 1200;
  const hits = (parseInt(localStorage.getItem(key)) || seed) + 1;
  localStorage.setItem(key, hits);
  const span = document.createElement('span');
  span.className = 'hit-counter';
  span.innerHTML = '&#128100; Visitors: ' + hits.toLocaleString();
  footer.appendChild(span);
}

document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  updateClock();
  setInterval(updateClock, 30000);
  initTabs();
  initFontCtrl();
  initHitCounter();
});
