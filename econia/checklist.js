// Checklist interactivity + save-to-txt
// Each checklist page calls initChecklist(storageKey, title)

function initChecklist(storageKey, title) {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');

  // Apply saved state on load
  document.querySelectorAll('.checklist-item').forEach(item => {
    const cb  = item.querySelector('input[type="checkbox"]');
    const id  = cb.dataset.id;
    if (saved[id]) {
      cb.checked = true;
      item.classList.add('done');
    }

    // Toggle on click anywhere in the row
    item.addEventListener('click', e => {
      if (e.target !== cb) cb.checked = !cb.checked;
      item.classList.toggle('done', cb.checked);
      saved[id] = cb.checked;
      localStorage.setItem(storageKey, JSON.stringify(saved));
    });
  });

  // Save button
  const btn = document.getElementById('save-btn');
  if (btn) {
    btn.addEventListener('click', () => saveAsText(title, storageKey));
  }
}

function saveAsText(title, storageKey) {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
  const date  = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const doneItems = [];
  const todoItems = [];

  document.querySelectorAll('.checklist-item').forEach(item => {
    const cb       = item.querySelector('input[type="checkbox"]');
    const id       = cb.dataset.id;
    const heading  = item.closest('.checklist-section')?.querySelector('.checklist-section-title')?.textContent?.trim() || '';
    const strong   = item.querySelector('.checklist-item-text strong')?.textContent?.trim() || '';
    const note     = item.querySelector('.checklist-item-text .note')?.textContent?.trim() || '';
    const text     = note ? `${strong} — ${note}` : strong;

    if (saved[id]) {
      doneItems.push({ heading, text });
    } else {
      todoItems.push({ heading, text });
    }
  });

  let out = `${title}\nSaved: ${date}\n\n`;

  if (doneItems.length) {
    out += `DONE\n${'─'.repeat(60)}\n`;
    let lastHeading = '';
    doneItems.forEach(({ heading, text }) => {
      if (heading !== lastHeading) {
        out += `\n${heading}\n`;
        lastHeading = heading;
      }
      out += `  ✓  ${text}\n`;
    });
    out += '\n';
  }

  if (todoItems.length) {
    out += `TO DO\n${'─'.repeat(60)}\n`;
    let lastHeading = '';
    todoItems.forEach(({ heading, text }) => {
      if (heading !== lastHeading) {
        out += `\n${heading}\n`;
        lastHeading = heading;
      }
      out += `  •  ${text}\n`;
    });
  }

  const blob = new Blob([out], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = title.toLowerCase().replace(/\s+/g, '-') + '.txt';
  a.click();
  URL.revokeObjectURL(url);
}
