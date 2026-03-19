const STAGES = [
  { slug: '',          label: 'Overview',          num: 1  },
  { slug: 'rq',        label: 'Find Your RQ',      num: 2  },
  { slug: 'concept',   label: 'Key Concept',       num: 3  },
  { slug: 'docs',      label: 'Supporting Docs',   num: 4  },
  { slug: 'structure', label: 'Structure',          num: 5  },
  { slug: 'analysis',  label: 'Analysis & Writing', num: 6  },
  { slug: 'conclusion',label: 'Conclusion',         num: 7  },
  { slug: 'submit',    label: 'Submitting It',      num: 8  },
  { slug: 'sample',    label: 'Sample IA',          num: 's'},
];

function getCurrentSlug() {
  const path = window.location.pathname;
  const match = path.match(/\/busia\/([^/]+)\/?$/);
  if (!match) return '';
  const seg = match[1];
  if (seg === 'index.html') return '';
  return seg;
}

function renderNav() {
  const visited = JSON.parse(localStorage.getItem('busia-visited') || '[]');
  const current = getCurrentSlug();

  if (!visited.includes(current)) {
    visited.push(current);
    localStorage.setItem('busia-visited', JSON.stringify(visited));
  }

  const nav = document.getElementById('main-nav');
  if (!nav) return;

  const base = getBase();

  const label = document.createElement('div');
  label.className = 'sidebar-order-label';
  label.textContent = 'Follow this order:';
  nav.appendChild(label);

  const ul = document.createElement('ul');
  STAGES.forEach(stage => {
    const isActive  = stage.slug === current;
    const isVisited = visited.includes(stage.slug) && !isActive;

    const li = document.createElement('li');
    const a  = document.createElement('a');

    const href = stage.slug === '' ? base + 'index.html' : base + stage.slug + '/';
    a.href = href;

    if (isActive)  a.classList.add('active');
    if (isVisited) a.classList.add('visited');

    a.innerHTML = `<span class="nav-num">${stage.num}</span><span class="nav-label">${stage.label}</span>`;
    li.appendChild(a);
    ul.appendChild(li);
  });

  nav.appendChild(ul);
}

function getBase() {
  const path = window.location.pathname;
  const idx = path.indexOf('/busia/');
  if (idx === -1) return '/busia/';
  return path.substring(0, idx) + '/busia/';
}

document.addEventListener('DOMContentLoaded', renderNav);
