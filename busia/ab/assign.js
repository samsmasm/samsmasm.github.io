/*
 * BUSIA A/B test: assignment. Loaded as the FIRST thing in <head> on every
 * busia/ and busia2/ page (blocking on purpose, so there is no flash of the
 * wrong version). Plan: ~/notes/busiatemp/CLAUDE.md. Prompt settings live in
 * ab-config.js; the two master switches live here because this file has to
 * decide before the page draws.
 */
(function () {
  // ---- master switches -------------------------------------------------
  var AB_ENABLED = true;       // false: no notice, no redirects, no sheet, nothing recorded
  var TEST_END = '2026-11-01'; // 'YYYY-MM-DD' (Ho Chi Minh time): last day of the two-week test. After it, students can switch freely.
  // ----------------------------------------------------------------------

  var K = {
    version: 'busia-ab-version',   // '1' or '2' once opted in (or forced with ?v=)
    id: 'busia-ab-id',             // random anonymous id
    consent: 'busia-ab-consent',   // 'in' or 'out'
    ignore: 'busia-ab-ignore',     // '1' = never record from this browser (Sam)
    preview: 'busia-ab-preview',   // '1' = Sam previewing with ?v= while AB_ENABLED is off
    choice: 'busia-ab-choice'      // '1' or '2', chosen after the test ends
  };

  var store = null;
  [function () { return window.localStorage; }, function () { return window.sessionStorage; }].some(function (get) {
    try { var s = get(); s.setItem('busia-ab-test', '1'); s.removeItem('busia-ab-test'); store = s; return true; }
    catch (e) { return false; }
  });
  function get(k) { try { return store ? store.getItem(k) : null; } catch (e) { return null; } }
  function set(k, v) { try { if (store) store.setItem(k, v); } catch (e) {} }

  var loc = window.location;
  var m = loc.pathname.match(/^\/(busia2?)\/(.*)$/);
  var state = { enabled: AB_ENABLED, mode: 'off', log: false, shown: null, assigned: null, id: null, slug: '', storage: !!store };
  window.BUSIA_AB = state;
  if (!m || /^ab\//.test(m[2])) return;

  state.shown = m[1] === 'busia2' ? 2 : 1;
  var rest = m[2];
  state.slug = rest.replace(/(index\.html)?$/, '').replace(/\/$/, '').split('/')[0];

  function randomId() {
    var a = new Uint8Array(12); window.crypto.getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  function go(version) {
    var want = version === 2 ? 'busia2' : 'busia';
    if (want !== m[1]) { loc.replace('/' + want + '/' + rest + loc.search + loc.hash); return true; }
    return false;
  }

  // Sam's overrides: ?v=1 / ?v=2 forces a version, ?nolog stops recording from this browser.
  var q = loc.search;
  if (/[?&]nolog\b/.test(q)) set(K.ignore, '1');
  var forced = (q.match(/[?&]v=([12])\b/) || [])[1];
  if (forced) {
    set(K.version, forced);
    if (!get(K.id)) set(K.id, randomId());
    if (!AB_ENABLED) set(K.preview, '1'); else set(K.consent, 'in');
  }
  if (!store) return; // no storage: show the page as opened, record nothing

  var ended = TEST_END && new Date() > new Date(TEST_END + 'T23:59:59+07:00');
  var version = get(K.version) === '2' ? 2 : get(K.version) === '1' ? 1 : null;

  if (!AB_ENABLED) {
    if (get(K.preview) === '1' && version) {
      state.mode = 'preview'; state.assigned = version; state.id = get(K.id);
      state.log = get(K.ignore) !== '1';
      go(version);
    }
    return;
  }

  if (ended) {
    state.mode = 'choice';
    var choice = get(K.choice) === '2' ? 2 : get(K.choice) === '1' ? 1 : (get(K.consent) === 'in' ? version : 1);
    if (choice) go(choice);
    return;
  }

  var consent = get(K.consent);
  if (consent === 'out') { state.mode = 'optout'; go(1); return; }
  if (consent !== 'in' || !version) {
    loc.replace('/busia/ab/welcome/?next=' + encodeURIComponent(loc.pathname + loc.search + loc.hash));
    return;
  }
  state.mode = 'test'; state.assigned = version; state.id = get(K.id);
  state.log = get(K.ignore) !== '1' && !!state.id;
  go(version);
})();
