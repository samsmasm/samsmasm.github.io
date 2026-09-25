// Checkin - the box you put a one off test code into.
//
// It is on the sign-in page, where nobody has an account yet, and on the home
// page, where they do. One module for both, because two copies of a box this
// small is exactly how the two end up behaving differently.

export function mountCodeBox(el, opts = {}) {
  if (!el) return;
  const id = opts.idPrefix || 'oneoff';

  el.innerHTML =
    '<div class="row">' +
      '<input type="text" id="' + id + '-code" class="code-input" maxlength="6" ' +
        'autocomplete="off" autocapitalize="characters" spellcheck="false" ' +
        'aria-label="One off test code" placeholder="ABC123">' +
      '<button id="' + id + '-go" class="btn-go">Go</button>' +
    '</div>' +
    '<p class="tiny" id="' + id + '-note">' + (opts.note || '') + '</p>';

  const input = document.getElementById(id + '-code');
  const note = document.getElementById(id + '-note');

  const go = () => {
    const code = input.value.trim().toUpperCase();
    if (code.length < 4) {
      note.className = 'tiny savefail';
      note.textContent = 'That code looks too short. It is six letters and numbers.';
      input.focus();
      return;
    }
    location.href = 'go.html?code=' + encodeURIComponent(code);
  };

  document.getElementById(id + '-go').addEventListener('click', go);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  // Typing again clears a complaint about the last attempt.
  input.addEventListener('input', () => {
    if (note.className !== 'tiny') { note.className = 'tiny'; note.textContent = opts.note || ''; }
  });

  return input;
}
