// Checkin - finding a question set you have already written.
//
// A dropdown is fine with six sets and useless with sixty, which is where a
// teacher ends up after a year. So: type a word to narrow by title, or pick a
// class to see only that one, and the matches are listed with the button on
// each row rather than hidden behind a second click.
//
// Two places reuse a set, copying into a class and starting a one off test, and
// they share this so the searching works the same in both.

import { esc, fmtDate, myOwnedSets } from './core.js?v=2aeb1e7-1921';

export function mountSetPicker(el, opts = {}) {
  if (!el) return null;
  const actionLabel = opts.actionLabel || 'Use this one';
  let all = [];
  let loaded = false;

  el.classList.add('setpicker');
  el.innerHTML =
    '<div class="row">' +
      '<input type="text" data-search class="grow" autocomplete="off" ' +
        'aria-label="Search question sets by title" placeholder="Search by title">' +
      '<select data-class aria-label="Filter by class">' +
        '<option value="">Any class</option>' +
      '</select>' +
    '</div>' +
    '<div data-list><p class="tiny mt">Loading your question sets.</p></div>';

  const search = el.querySelector('[data-search]');
  const classPick = el.querySelector('[data-class]');
  const list = el.querySelector('[data-list]');

  function matches() {
    const word = search.value.trim().toLowerCase();
    const inClass = classPick.value;
    return all.filter(item => {
      if (inClass && item.classId !== inClass) return false;
      if (!word) return true;
      // Title first, but the class name counts too: "year 11" is a reasonable
      // thing to type when that is how you think of the set.
      return (item.set.title || '').toLowerCase().includes(word) ||
             (item.className || '').toLowerCase().includes(word);
    });
  }

  function paint() {
    const found = matches();

    if (!all.length) {
      list.innerHTML = '<p class="tiny mt">' +
        esc(opts.empty || 'You have no question sets to reuse yet.') + '</p>';
      return;
    }
    if (!found.length) {
      list.innerHTML = '<p class="tiny mt">Nothing matches that. ' +
        '<button class="linkish" data-clear>Show all ' + all.length + '</button></p>';
      list.querySelector('[data-clear]').addEventListener('click', () => {
        search.value = '';
        classPick.value = '';
        paint();
        search.focus();
      });
      return;
    }

    const rows = found.map((item, i) =>
      '<div class="index-row">' +
        '<span class="grow">' +
          '<span class="index-name">' + esc(item.set.title || 'Untitled') + '</span>' +
          '<br><span class="index-desc">' + esc(item.className) + ' &middot; ' +
            (item.set.questions || []).length + ' questions' +
            (item.set.createdAt ? ' &middot; ' + esc(fmtDate(item.set.createdAt)) : '') +
          '</span>' +
        '</span>' +
        '<button data-pick="' + i + '">' + esc(actionLabel) + '</button>' +
      '</div>').join('');

    list.innerHTML =
      '<p class="tiny mt">' + found.length + ' of ' + all.length +
        (all.length === 1 ? ' set' : ' sets') + '</p>' + rows;

    list.querySelectorAll('[data-pick]').forEach(btn =>
      btn.addEventListener('click', () => {
        if (opts.onPick) opts.onPick(found[Number(btn.dataset.pick)], btn);
      }));
  }

  search.addEventListener('input', paint);
  classPick.addEventListener('change', paint);
  // Typing a word that leaves one set standing and pressing Enter should just
  // take it, rather than making you reach for the mouse to confirm the obvious.
  search.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const found = matches();
    if (found.length === 1 && opts.onPick) opts.onPick(found[0], null);
  });

  async function load() {
    try {
      all = await myOwnedSets(opts.uid, {
        skipOneOffs: opts.skipOneOffs, exclude: opts.exclude
      });
      loaded = true;

      const classes = [];
      for (const item of all) {
        if (!classes.some(c => c.id === item.classId)) {
          classes.push({ id: item.classId, name: item.className });
        }
      }
      classPick.innerHTML = '<option value="">Any class</option>' +
        classes.map(c => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join('');
      // A single class of your own is not a filter, it is furniture.
      classPick.classList.toggle('hidden', classes.length < 2);

      paint();
    } catch (err) {
      console.error('loading question sets', err);
      list.innerHTML = '<p class="tiny mt savefail">Could not read your question sets.</p>';
    }
  }

  load();

  return {
    refresh: load,
    isLoaded: () => loaded
  };
}
