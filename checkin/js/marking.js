// Checkin - how a mark box behaves, in one place, because the grid and the
// per-question view both use it and must not drift apart.

// Marks are whole numbers, never negative, never more than the question is worth.
export function tidyMark(input, max) {
  if (input.value === '') return '';
  let value = Math.round(Number(input.value));
  if (!Number.isFinite(value) || value < 0) value = 0;
  if (value > max) value = max;
  input.value = String(value);
  return value;
}

// Arriving at an unmarked answer offers full marks, already selected so a digit
// types straight over it. Leaving the box commits whatever is in it, which means
// tabbing straight through a set awards full marks and you type only where the
// answer is not worth full marks.
export function wireMarkInput(input, max, save, debounced) {
  let lastWritten = input.value;

  const commit = () => {
    const value = tidyMark(input, max);
    if (String(value) === String(lastWritten)) return;   // nothing actually changed
    lastWritten = String(value);
    save(value);
  };

  input.addEventListener('focus', () => {
    if (input.value === '') input.value = String(max);
    input.select();
  });
  input.addEventListener('input', debounced ? debounced(commit) : commit);
  input.addEventListener('blur', commit);

  // Lets a quick button set the value and have it saved through the same path.
  input.setMark = value => { input.value = String(value); commit(); };

  return commit;
}
