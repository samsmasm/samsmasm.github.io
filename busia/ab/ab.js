/*
 * BUSIA A/B test: rating sheet, active-time clock, logging, menu links.
 * Loaded by nav.js on every busia/ and busia2/ page. assign.js has already
 * decided the mode (window.BUSIA_AB). Every step is wrapped so a failure here
 * never breaks the guide: links always work without this file.
 */
(function () {
  var AB = window.BUSIA_AB;
  if (!AB || !AB.shown) return;
  var BASE = '/busia/ab/';
  var VER = '?v=20261018b'; // bump with the ?v= on the script tags whenever any A/B file changes (browsers cache scripts for 4 hours)

  function load(src, done) {
    var s = document.createElement('script');
    s.src = BASE + src + VER; s.onload = done; s.onerror = function () {};
    document.head.appendChild(s);
  }
  load('ab-config.js', function () { load('ab-questions.js', function () {
    try { start(window.BUSIA_AB_CONFIG, window.BUSIA_AB_QUESTIONS); } catch (e) {}
  }); });

  function start(C, QS) {
    if (!C || !QS) return;

    // ---- storage --------------------------------------------------------
    var store = null;
    try { localStorage.setItem('busia-ab-test', '1'); localStorage.removeItem('busia-ab-test'); store = localStorage; }
    catch (e) { try { sessionStorage.setItem('busia-ab-test', '1'); store = sessionStorage; } catch (e2) {} }
    function get(k) { try { return store ? store.getItem(k) : null; } catch (e) { return null; } }
    function set(k, v) { try { if (store) store.setItem(k, v); } catch (e) {} }
    function rid() {
      var a = new Uint8Array(8); crypto.getRandomValues(a);
      return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    }

    var page = AB.slug || 'index';
    var stopped = get('busia-ab-stopped') === '1'; // student used "Stop the questions"
    var canLog = AB.mode === 'test' && AB.log && get('busia-ab-ignore') !== '1' && !stopped;
    var preview = AB.mode === 'preview';
    var promptHere = (AB.mode === 'test' || preview) && !stopped && C.PROMPT_PAGES.indexOf(AB.slug) !== -1;

    // ---- menu links ---------------------------------------------------------
    function addMenuLinks() {
      var nav = document.getElementById('main-nav');
      if (!nav) return;
      var box = document.createElement('div');
      box.className = 'busia-ab-menu';
      if (AB.mode === 'choice') {
        var other = AB.shown === 1 ? 2 : 1;
        var sw = document.createElement('a');
        sw.href = '/' + (other === 2 ? 'busia2' : 'busia') + location.pathname.replace(/^\/busia2?\//, '/');
        sw.textContent = other === 2 ? 'Switch to the short version' : 'Switch to the long version';
        sw.addEventListener('click', function () { set('busia-ab-choice', String(other)); });
        box.appendChild(sw);
      }
      if (AB.mode === 'test' && !stopped) {
        var st = document.createElement('a');
        st.href = '#';
        st.textContent = 'Stop the questions';
        st.addEventListener('click', function (ev) {
          ev.preventDefault();
          set('busia-ab-stopped', '1'); stopped = true; canLog = false; promptHere = false;
          st.textContent = 'Questions stopped. Nothing more is recorded.';
        });
        box.appendChild(st);
      }
      var be = document.createElement('a');
      be.href = '/busia-ab/';
      be.textContent = 'Backend';
      be.className = 'busia-ab-backend';
      box.appendChild(be);
      nav.appendChild(box);
    }

    // ---- active-time clock --------------------------------------------------
    var active = 0, lastActivity = Date.now(), scrolled = false;
    // Scroll depth (how far down, % of page) and scroll-backs (moving back up by
    // more than half a screen, counted once per upward run).
    var maxDepth = 0, upRuns = 0, lastY = window.scrollY, runTop = window.scrollY, goingUp = false;
    function depth() {
      var h = document.documentElement.scrollHeight;
      var d = h > 0 ? Math.round(100 * Math.min(1, (window.scrollY + window.innerHeight) / h)) : 100;
      if (d > maxDepth) maxDepth = d;
    }
    function track() {
      var y = window.scrollY;
      if (y < lastY) {
        if (!goingUp) { goingUp = true; runTop = lastY; }
        if (runTop - y > window.innerHeight / 2 && runTop !== -1) { upRuns++; runTop = -1; }
      } else if (y > lastY) { goingUp = false; }
      lastY = y; depth();
    }
    window.addEventListener('load', depth);
    function poke() { lastActivity = Date.now(); }
    ['mousemove', 'keydown', 'touchstart', 'pointerdown', 'wheel'].forEach(function (ev) {
      window.addEventListener(ev, poke, { passive: true });
    });
    window.addEventListener('scroll', function () { poke(); track(); if (window.scrollY > 150) scrolled = true; }, { passive: true });
    setInterval(function () {
      if (document.visibilityState === 'visible' && Date.now() - lastActivity < C.IDLE_AFTER * 1000 && active < C.MAX_SECONDS_PER_PAGE) active++;
      maybeTimed();
    }, 1000);

    // ---- sending ------------------------------------------------------------
    function send(records) {
      if (!canLog || !records.length) return;
      try {
        var body = JSON.stringify({ records: records });
        if (navigator.sendBeacon && navigator.sendBeacon(C.LOG_URL, new Blob([body], { type: 'text/plain' }))) return;
        fetch(C.LOG_URL, { method: 'POST', body: body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(function () {});
      } catch (e) {}
    }
    var viewId = rid();
    function sendPageview() {
      if (!C.LOG_PAGEVIEWS) return;
      send([{ type: 'pageview', view_id: viewId, version_shown: AB.shown, version_assigned: AB.assigned, anon_id: AB.id,
              page: page, seconds_on_page: active, max_depth: maxDepth, scroll_backs: upRuns, ts: new Date().toISOString() }]);
    }
    // Sent whenever the page is hidden; if the student comes back, a later record
    // with the same view_id and more seconds replaces it in the analysis.
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') sendPageview(); });
    window.addEventListener('pagehide', sendPageview);

    // ---- when to prompt -------------------------------------------------------
    var promptedThisPage = false;
    function inField() {
      var el = document.activeElement;
      return el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
    }
    function allowed(trigger) {
      if (!promptHere || promptedThisPage || sheetOpen || inField()) return false;
      if (preview && C.PREVIEW_ALWAYS_PROMPT) return true;
      var count = parseInt(get('busia-ab-prompts') || '0', 10);
      var last = parseInt(get('busia-ab-last-prompt') || '0', 10);
      if (count >= C.MAX_PROMPTS) return false;
      if (Date.now() - last < C.COOLDOWN * 1000) return false;
      if (trigger === 'leave') return active >= C.MIN_ACTIVE_BEFORE_LEAVE && Math.random() < C.LEAVE_PROBABILITY;
      return active >= C.TIMED_AFTER && scrolled && Math.random() < C.TIMED_PROBABILITY;
    }
    var timedChecked = false;
    function maybeTimed() {
      if (timedChecked || active < C.TIMED_AFTER || !scrolled) return;
      timedChecked = true;
      if (allowed('timed')) showSheet('timed', null);
    }

    function internalTarget(a, ev) {
      if (!a || ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return null;
      if (a.target && a.target !== '_self') return null;
      if (a.hasAttribute('download')) return null;
      var u; try { u = new URL(a.href, location.href); } catch (e) { return null; }
      if (u.origin !== location.origin) return null;
      if (!/^\/busia2?\//.test(u.pathname) || /^\/busia\/ab\//.test(u.pathname)) return null;
      if (/\.(pdf|docx?|pptx?|xlsx?)$/i.test(u.pathname)) return null;
      if (u.pathname === location.pathname && u.hash) return null;
      return u.href;
    }
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest ? ev.target.closest('a[href]') : null;
      var href = internalTarget(a, ev);
      if (!href) return;
      if (sheetOpen) { finish(null); return; } // treat as skip, let the link go
      if (!allowed('leave')) return;
      ev.preventDefault();
      showSheet('leave', href);
    });

    // ---- the sheet ------------------------------------------------------------
    var sheetOpen = false, sheet = null, pending = null, trigger = null, answers = {};
    function css() {
      var st = document.createElement('style');
      st.textContent = [
        '.busia-ab-menu{margin:1.25rem 0 0;padding:0 0.75rem;display:flex;flex-direction:column;gap:0.4rem}',
        '.busia-ab-menu a{font-size:11px;color:#8a97b0;text-decoration:none}',
        '.busia-ab-menu a:hover{color:#1a3a7a;text-decoration:underline}',
        '.busia-ab-sheet{position:fixed;left:0;right:0;bottom:0;z-index:1000;background:#fff;border-top:2px solid #1a3a7a;',
        'padding:0.9rem 1rem calc(0.9rem + env(safe-area-inset-bottom));font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#13243f;',
        'max-height:85vh;overflow-y:auto}',
        '.busia-ab-inner{max-width:560px;margin:0 auto}',
        '.busia-ab-head{display:flex;justify-content:space-between;align-items:baseline;gap:1rem;margin-bottom:0.6rem}',
        '.busia-ab-title{font-family:Georgia,serif;font-size:1rem;color:#1a3a7a;margin:0}',
        '.busia-ab-anon{font-size:11px;color:#5a7298}',
        '.busia-ab-q{margin:0 0 0.75rem}',
        '.busia-ab-qtext{font-size:0.9rem;font-weight:600;margin:0 0 0.35rem}',
        '.busia-ab-scale{display:grid;grid-template-columns:repeat(5,1fr);gap:0.4rem}',
        '.busia-ab-scale button{min-height:44px;font-size:1rem;font-weight:600;border:1.5px solid #b6cff5;background:#f0f5ff;color:#1a3a7a;border-radius:8px;cursor:pointer}',
        '.busia-ab-scale button[aria-checked="true"]{background:#1a3a7a;color:#fff;border-color:#1a3a7a}',
        '.busia-ab-scale button:focus-visible,.busia-ab-actions button:focus-visible{outline:3px solid #f5b6d4;outline-offset:1px}',
        '.busia-ab-ends{display:flex;justify-content:space-between;font-size:11px;color:#5a7298;margin-top:0.2rem}',
        '.busia-ab-actions{display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-top:0.4rem}',
        '.busia-ab-actions button{min-height:44px;font-size:0.95rem;font-weight:600;border-radius:8px;cursor:pointer;border:1.5px solid #1a3a7a}',
        '.busia-ab-send{background:#1a3a7a;color:#fff}',
        '.busia-ab-skip{background:#fff;color:#1a3a7a}'
      ].join('');
      document.head.appendChild(st);
    }
    function showSheet(trig, href) {
      sheetOpen = true; promptedThisPage = true; pending = href; trigger = trig; answers = {};
      if (!preview || !C.PREVIEW_ALWAYS_PROMPT) {
        set('busia-ab-prompts', String(parseInt(get('busia-ab-prompts') || '0', 10) + 1));
        set('busia-ab-last-prompt', String(Date.now()));
      }
      sheet = document.createElement('div');
      sheet.className = 'busia-ab-sheet';
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-labelledby', 'busia-ab-title');
      var html = '<div class="busia-ab-inner"><div class="busia-ab-head"><h2 class="busia-ab-title" id="busia-ab-title">Three quick questions about this page</h2>' +
        '<span class="busia-ab-anon">Anonymous, takes 2 seconds.</span></div>';
      QS.forEach(function (q, i) {
        html += '<div class="busia-ab-q"><p class="busia-ab-qtext" id="busia-ab-q' + i + '">' + esc(q.text) + '</p>' +
          '<div class="busia-ab-scale" role="radiogroup" aria-labelledby="busia-ab-q' + i + '">';
        for (var n = 1; n <= 5; n++) {
          var lab = n === 1 ? ', ' + q.lowLabel : n === 5 ? ', ' + q.highLabel : '';
          html += '<button type="button" role="radio" aria-checked="false" data-q="' + esc(q.id) + '" data-n="' + n + '" aria-label="' + n + esc(lab) + '">' + n + '</button>';
        }
        html += '</div><div class="busia-ab-ends" aria-hidden="true"><span>1 = ' + esc(q.lowLabel) + '</span><span>5 = ' + esc(q.highLabel) + '</span></div></div>';
      });
      html += '<div class="busia-ab-actions"><button type="button" class="busia-ab-send">Send</button><button type="button" class="busia-ab-skip">Skip</button></div></div>';
      sheet.innerHTML = html;
      sheet.addEventListener('click', function (ev) {
        var b = ev.target.closest('button');
        if (!b) return;
        if (b.dataset.q) {
          answers[b.dataset.q] = parseInt(b.dataset.n, 10);
          sheet.querySelectorAll('button[data-q="' + b.dataset.q + '"]').forEach(function (x) { x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
        } else if (b.classList.contains('busia-ab-send')) finish(answers);
        else if (b.classList.contains('busia-ab-skip')) finish(null);
      });
      sheet.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') finish(null); });
      document.body.appendChild(sheet);
      // Focus the sheet itself, not the "1" button, so no answer looks pre-selected.
      sheet.setAttribute('tabindex', '-1');
      sheet.style.outline = 'none';
      sheet.focus({ preventScroll: true });
    }
    function finish(ans) {
      if (!sheetOpen) return;
      var base = { type: 'rating', version_shown: AB.shown, version_assigned: AB.assigned, anon_id: AB.id, prompt_id: rid(),
                   page: page, trigger: trigger, seconds_on_page: active, scrolled: scrolled,
                   device: window.innerWidth < 700 ? 'phone' : 'desktop', ts: new Date().toISOString() };
      var recs = [];
      if (ans) Object.keys(ans).forEach(function (q) { var r = Object.assign({}, base); r.question_id = q; r.rating = ans[q]; recs.push(r); });
      if (!recs.length) { var s = Object.assign({}, base); s.question_id = 'all'; s.rating = 'skip'; recs.push(s); }
      send(recs);
      sheetOpen = false;
      if (sheet) sheet.remove();
      if (pending) { var h = pending; pending = null; location.href = h; }
    }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    css();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addMenuLinks); else addMenuLinks();
  }
})();
