/*
 * BUSIA A/B test: prompt settings. Sam tunes these. The master switches
 * (AB_ENABLED, TEST_END) are at the top of assign.js.
 */
window.BUSIA_AB_CONFIG = {
  // Where answers go (the busia-ab Cloudflare Worker; see worker/SETUP.md).
  LOG_URL: '/busia-ab/log',

  // Pages the prompt may appear on: only the 8 that differ between versions.
  PROMPT_PAGES: ['', 'rq', 'docs', 'concept', 'analysis', 'structure', 'sketching', 'conclusion'],

  MAX_PROMPTS: 6,               // per student, in total
  MAX_PER_DAY: 2,               // per student, per calendar day (spreads answers across the weeks)
  LEAVE_PROBABILITY: 1 / 3,     // chance of a prompt when leaving a page by an internal link
  MIN_ACTIVE_BEFORE_LEAVE: 15,  // seconds of active time on the page before a leave prompt is allowed
  TIMED_AFTER: 90,              // seconds of active time on the page before a mid-page prompt
  TIMED_PROBABILITY: 0.5,       // chance the mid-page prompt actually shows when due
  COOLDOWN: 120,                // never two prompts within this many seconds

  // Active time: the clock runs only while the tab is visible and the student
  // has scrolled, moved the mouse, pressed a key or touched in the last IDLE_AFTER seconds.
  IDLE_AFTER: 60,
  MAX_SECONDS_PER_PAGE: 1200,   // cap per page visit (20 minutes)

  LOG_PAGEVIEWS: true,          // one record per page visit (page, active seconds). Set false to switch off.

  // While previewing with ?v= (AB_ENABLED off), show the sheet on every page change so Sam can see it.
  PREVIEW_ALWAYS_PROMPT: true
};
