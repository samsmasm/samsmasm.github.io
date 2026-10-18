/*
 * BUSIA A/B test: the three questions, shown together in every prompt.
 * Wording agreed with Sam on 2026-10-18. Each stem names the low end first,
 * matching the scale (1 on the left, 5 on the right).
 * Edit the wording freely, but never change an `id` once data exists:
 * the results key off it.
 */
window.BUSIA_AB_QUESTIONS = [
  { id: 'ease',     text: 'How hard or easy was this page to follow?',               lowLabel: 'very hard',      highLabel: 'very easy' },
  { id: 'covered',  text: 'How sure are you that this page told you what you need?', lowLabel: 'not at all sure', highLabel: 'completely sure' },
  { id: 'nextstep', text: 'How unclear or clear is your next step now?',             lowLabel: 'very unclear',   highLabel: 'very clear' }
];
