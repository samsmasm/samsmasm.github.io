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
  const match = path.match(/\/fmw\/([^/]+)\/?$/);
  if (!match) return '';
  const seg = match[1];
  if (seg === 'index.html') return '';
  return seg;
}

function getBase() {
  const path = window.location.pathname;
  const idx = path.indexOf('/fmw/');
  if (idx === -1) return '/fmw/';
  return path.substring(0, idx) + '/fmw/';
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

document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  updateClock();
  setInterval(updateClock, 30000);
  initTabs();
});
