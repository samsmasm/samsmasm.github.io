const STAGES = [
  { slug: '',            label: 'Overview',            num: 1  },
  { slug: 'article',    label: 'Article',              num: 2, children: [
    { slug: 'article/micro',  label: 'Microeconomics', num: '2a' },
    { slug: 'article/macro',  label: 'Macroeconomics', num: '2b' },
    { slug: 'article/global', label: 'Global Economy', num: '2c' },
  ]},
  { slug: 'plan',       label: 'Plan',                 num: 3  },
  { slug: 'structure',  label: 'Structure',            num: 4  },
  { slug: 'diagrams',   label: 'Diagrams & Analysis',  num: 5  },
  { slug: 'concept',    label: 'Key Concept',          num: 6  },
  { slug: 'intro',      label: 'Intro',                num: 7  },
  { slug: 'evaluation', label: 'Evaluation',           num: 8  },
  { slug: 'weaving',    label: 'Check Your Commentary', num: 9  },
  { slug: 'submit',     label: 'Submitting It',        num: 10 },
  { slug: 'example',    label: 'Example',              num: 'e'},
];

function getCurrentSlug() {
  if (typeof ECONIA_STAGE !== 'undefined') return ECONIA_STAGE;
  const path = window.location.pathname;
  // Match /econia/slug/ or /econia/slug
  const match = path.match(/\/econia\/([^/]+)\/?$/);
  if (!match) return ''; // overview / root
  const seg = match[1];
  // If it's 'index.html' or empty treat as root
  if (seg === 'index.html') return '';
  return seg;
}

function renderNav() {
  const visited = JSON.parse(localStorage.getItem('econia-visited') || '[]');
  const current = getCurrentSlug();

  // Mark this page as visited
  if (!visited.includes(current)) {
    visited.push(current);
    localStorage.setItem('econia-visited', JSON.stringify(visited));
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

    if (stage.children && stage.children.length) {
      const inSection = stage.slug === current || stage.children.some(c => c.slug === current);
      if (inSection) {
        const subUl = document.createElement('ul');
        subUl.className = 'nav-sub';
        stage.children.forEach(child => {
          const childIsActive  = child.slug === current;
          const childIsVisited = visited.includes(child.slug) && !childIsActive;

          const childLi = document.createElement('li');
          const childA  = document.createElement('a');
          childA.href = base + child.slug + '/';
          if (childIsActive)  childA.classList.add('active');
          if (childIsVisited) childA.classList.add('visited');
          childA.innerHTML = `<span class="nav-num">${child.num}</span><span class="nav-label">${child.label}</span>`;
          childLi.appendChild(childA);
          subUl.appendChild(childLi);
        });
        li.appendChild(subUl);
      }
    }

    ul.appendChild(li);
  });

  nav.appendChild(ul);
}

function getBase() {
  // Figure out the base path to /econia/
  const path = window.location.pathname;
  const idx = path.indexOf('/econia/');
  if (idx === -1) return '/econia/';
  return path.substring(0, idx) + '/econia/';
}

document.addEventListener('DOMContentLoaded', renderNav);
