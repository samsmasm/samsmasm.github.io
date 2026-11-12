/* Riddles: shared engine. Every riddle page loads this first and gets window.R.
   Pieces: seeded random numbers, a cancellable timeline for Watch sequences,
   the five-step stepper, the number field, the guess control, the describe options,
   the guess-versus-truth scale, canvas sizing, theme repaint and progress on this device. */
(function () {
  "use strict";
  var R = {};
  R.$ = function (id) { return document.getElementById(id); };
  R.all = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  R.reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ---------- numbers ---------- */
  R.rng = function (seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  R.int = function (rnd, n) { return Math.floor(rnd() * n); };
  R.shuffle = function (arr, rnd) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };
  R.clamp = function (v, lo, hi) { return Math.min(hi, Math.max(lo, v)); };
  R.round2 = function (v) { return Math.round(v * 100) / 100; };
  R.fmtInt = function (n) { return Math.round(n).toLocaleString("en-US"); };
  R.fmtPct = function (x) {
    var v = x * 100;
    if (v >= 10) return v.toFixed(0) + "%";
    if (v >= 1) return v.toFixed(1) + "%";
    return v.toFixed(2) + "%";
  };
  R.cssVar = function (name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); };
  R.ease = function (u) { return u * u * (3 - 2 * u); };

  /* ---------- timeline: timers and tweens that all stop together ---------- */
  /* ?speed=10 plays every Watch ten times faster (used by the tests) */
  var SPEED = Number(new URLSearchParams(location.search).get("speed")) || 1;
  R.timeline = function () {
    var timers = [], rafs = [], alive = true;
    var t = {
      alive: function () { return alive; },
      after: function (ms, fn) {
        timers.push(setTimeout(function () { if (alive) fn(); }, ms / SPEED));
      },
      tween: function (dur, fn, done) {
        if (!alive) return;
        dur /= SPEED;
        if (R.reduceMotion || dur <= 0) { fn(1); if (done) done(); return; }
        var t0 = performance.now();
        (function step(now) {
          if (!alive) return;
          var u = Math.min(1, (now - t0) / dur);
          fn(u);
          if (u < 1) rafs.push(requestAnimationFrame(step)); else if (done) done();
        })(t0);
      },
      cancel: function () {
        alive = false;
        timers.forEach(clearTimeout);
        rafs.forEach(cancelAnimationFrame);
      }
    };
    return t;
  };

  /* ---------- canvas sized to its box, with a height ratio ---------- */
  R.fitCanvas = function (canvas, ratio) {
    var ctx = canvas.getContext("2d");
    var w = canvas.clientWidth;
    if (!w) return null;
    var h = Math.round(w * ratio);
    canvas.style.height = h + "px";
    var dpr = window.devicePixelRatio || 1;
    var pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  };
  R.onResize = function (el, fn) {
    if (window.ResizeObserver) {
      var lastW = 0;
      new ResizeObserver(function () { if (el.clientWidth !== lastW) { lastW = el.clientWidth; fn(); } }).observe(el);
    } else window.addEventListener("resize", fn);
  };
  R.onTheme = function (fn) {
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      if (mq.addEventListener) mq.addEventListener("change", fn);
    }
    new MutationObserver(fn).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  };

  /* ---------- stepper: sections .step in order, list #stepper ---------- */
  R.steps = function (o) {
    o = o || {};
    var steps = R.all("section.step");
    var items = R.$("stepper") ? R.$("stepper").children : [];
    var api = { current: -1 };
    api.show = function (n, quiet) {
      var prev = api.current;
      api.current = n;
      steps.forEach(function (el, i) { el.hidden = i !== n; });
      Array.prototype.forEach.call(items, function (li, i) {
        li.className = i < n ? "done" : "";
        if (i === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
      });
      /* the Watch visual (#viz) moves into the Describe step (#viz-slot), so students describe what is in front of them */
      var viz = R.$("viz"), home = R.$("viz-home"), slot = R.$("viz-slot");
      if (viz && home && slot) {
        if (n === 3) slot.appendChild(viz);
        else if (viz.parentNode !== home) home.appendChild(viz);
      }
      /* the Answer step repeats the riddle's question at the top */
      if (n === 4 && !steps[4].querySelector(".recall")) {
        var q = steps[0].querySelector(".question"), h4 = steps[4].querySelector("h2");
        if (q && h4) {
          var rc = document.createElement("div");
          rc.className = "recall";
          rc.innerHTML = '<div class="kicker">The question</div><p></p>';
          rc.querySelector("p").textContent = q.textContent;
          h4.insertAdjacentElement("afterend", rc);
        }
      }
      if (o.onLeave && prev !== n) o.onLeave(prev, n);
      if (o.onEnter && o.onEnter[n]) o.onEnter[n]();
      if (!quiet) {
        var h = steps[n].querySelector("h2");
        if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
        var top = R.$("stepper") || steps[n];
        if (top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: "start" });
      }
    };
    R.all("[data-go]").forEach(function (b) {
      b.addEventListener("click", function () { api.show(Number(b.getAttribute("data-go"))); });
    });
    return api;
  };

  /* ---------- click-through Watch: Back / Next over a list of captions ----------
     Needs #w-back, #w-next, #w-step, #caption, #go-describe. onGo(from, to) draws the change. */
  R.walk = function (caps, onGo) {
    var api = { at: 0 }, last = caps.length - 1;
    function go(n) {
      var from = api.at;
      api.at = n;
      R.$("caption").textContent = typeof caps[n] === "function" ? caps[n]() : caps[n];
      R.$("w-step").textContent = "Step " + (n + 1) + " of " + caps.length;
      R.$("w-back").disabled = n === 0;
      R.$("w-next").hidden = n === last;
      R.$("go-describe").hidden = n !== last;
      onGo(from, n);
    }
    R.$("w-next").addEventListener("click", function () { if (api.at < last) go(api.at + 1); });
    R.$("w-back").addEventListener("click", function () { if (api.at > 0) go(api.at - 1); });
    api.start = function () { api.at = 0; go(0); };
    return api;
  };

  /* normal random numbers (Box-Muller) from a seeded generator */
  R.normal = function (rnd) {
    var u = 1 - rnd(), v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185307 * v);
  };

  /* ---------- editable number field with nudge arrows ----------
     mode "pct": arrows step 0.1, or 0.01 below 0.1 and above 99.9.
     mode "int": arrows step 1.  value null starts empty (no anchor). */
  function fmtNum(v) { return String(Number(v.toFixed(2))); }
  function nudgeStep(v, dir) {
    if (dir > 0) return (v >= 99.9 || v < 0.1) ? 0.01 : 0.1;
    return (v > 99.9 || v <= 0.1) ? 0.01 : 0.1;
  }
  R.field = function (host, o) {
    var val = o.value == null ? null : o.value;
    var isInt = o.mode === "int";
    var wrap = document.createElement("span");
    wrap.className = "numfield " + (o.big ? "big" : "sm");
    var input = document.createElement("input");
    input.type = "text";
    input.inputMode = isInt ? "numeric" : "decimal";
    input.autocomplete = "off";
    input.className = "numin";
    input.placeholder = "?";
    input.setAttribute("aria-label", o.label);
    function mk(txt, cls, label) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "nb " + cls; b.textContent = txt;
      b.setAttribute("aria-label", label);
      return b;
    }
    var dn = mk("▼", "dn", "Decrease " + o.label), up = mk("▲", "up", "Increase " + o.label);
    wrap.appendChild(dn);
    wrap.appendChild(input);
    if (o.suffix) { var s = document.createElement("span"); s.className = "unit"; s.textContent = o.suffix; wrap.appendChild(s); }
    wrap.appendChild(up);
    host.appendChild(wrap);
    function tidy(v) { return R.clamp(isInt ? Math.round(v) : R.round2(v), o.min, o.max); }
    function size() { input.style.width = Math.max(isInt ? 2 : 2, input.value.length || 1) + "ch"; }
    function write(v, notify) {
      val = v == null ? null : tidy(v);
      input.value = val == null ? "" : (isInt ? String(val) : fmtNum(val));
      size();
      if (notify && val != null) o.onChange(val);
    }
    function nudge(dir) {
      var start = val == null ? (o.nudgeFrom != null ? o.nudgeFrom : o.min) : val;
      if (val == null) { write(start, true); return; }
      write(val + dir * (isInt ? 1 : nudgeStep(val, dir)), true);
    }
    input.addEventListener("input", function () {
      var n = parseFloat(input.value.replace(",", "."));
      size();
      if (!isNaN(n)) { val = tidy(n); o.onChange(val); }
    });
    input.addEventListener("blur", function () { write(val, false); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { write(val, false); input.blur(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); nudge(1); }
      else if (e.key === "ArrowDown") { e.preventDefault(); nudge(-1); }
    });
    up.addEventListener("click", function () { nudge(1); });
    dn.addEventListener("click", function () { nudge(-1); });
    write(val, false);
    return { set: function (v) { write(v, false); }, get: function () { return val; }, input: input };
  };

  /* ---------- guess control: big field plus a slider whose thumb stays hidden until used ---------- */
  R.guess = function (host, o) {
    var state = { value: null };
    var fh = document.createElement("div");
    host.appendChild(fh);
    var range = document.createElement("input");
    range.type = "range"; range.min = o.min; range.max = o.max; range.step = o.step || 1;
    range.value = (o.min + o.max) / 2;
    range.className = "untouched";
    range.setAttribute("aria-label", o.label + ", slider");
    var rw = document.createElement("div");
    rw.appendChild(range);
    var ends = document.createElement("div");
    ends.className = "rangeends";
    ends.innerHTML = "<span></span><span></span>";
    ends.children[0].textContent = (o.endLabels || [o.min, o.max])[0];
    ends.children[1].textContent = (o.endLabels || [o.min, o.max])[1];
    rw.appendChild(ends);
    host.appendChild(rw);
    function set(v) {
      state.value = v;
      range.classList.remove("untouched");
      if (o.button) o.button.disabled = false;
      if (o.onChange) o.onChange(v);
    }
    var field = R.field(fh, {
      big: true, label: o.label, min: o.min, max: o.max, mode: o.mode, suffix: o.suffix,
      value: null, nudgeFrom: o.nudgeFrom,
      onChange: function (v) { range.value = v; set(v); }
    });
    range.addEventListener("input", function () {
      var v = o.mode === "int" ? Math.round(Number(range.value)) : R.round2(Number(range.value));
      field.set(v); set(v);
    });
    if (o.button) o.button.disabled = true;
    state.reset = function () {
      state.value = null; field.set(null);
      range.value = (o.min + o.max) / 2; range.classList.add("untouched");
      if (o.button) o.button.disabled = true;
    };
    return state;
  };

  /* ---------- describe / choice options: .opt buttons with data-i inside a radiogroup ---------- */
  R.choices = function (group, onPick) {
    var opts = R.all(".opt", group);
    var api = { value: -1 };
    function pick(b, focus) {
      api.value = Number(b.getAttribute("data-i"));
      opts.forEach(function (o) {
        var on = o === b;
        o.setAttribute("aria-checked", on ? "true" : "false");
        o.tabIndex = on ? 0 : -1;
      });
      if (focus) b.focus();
      if (onPick) onPick(api.value);
    }
    opts.forEach(function (b, i) {
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", "false");
      b.tabIndex = i === 0 ? 0 : -1;
      b.addEventListener("click", function () { pick(b); });
      b.addEventListener("keydown", function (e) {
        var d = (e.key === "ArrowDown" || e.key === "ArrowRight") ? 1 : (e.key === "ArrowUp" || e.key === "ArrowLeft") ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        pick(opts[(i + d + opts.length) % opts.length], true);
      });
    });
    api.text = function (i) { return opts[i] ? opts[i].textContent : ""; };
    api.reset = function () {
      api.value = -1;
      opts.forEach(function (o, i) { o.setAttribute("aria-checked", "false"); o.tabIndex = i === 0 ? 0 : -1; });
    };
    return api;
  };

  /* ---------- guess versus truth on one scale ---------- */
  R.scale = function (host, o) {
    var span = o.max - o.min;
    function pos(v) { return (R.clamp(v, o.min, o.max) - o.min) / span * 100; }
    host.innerHTML =
      '<div class="scalerow" aria-hidden="true"><span></span><div class="tr">' +
      '<div class="mk g"></div><div class="mk a"></div><span class="ml g"></span><span class="ml a"></span>' +
      '</div><span></span></div><p class="sr-only"></p>';
    var ends = host.querySelectorAll(".scalerow > span");
    ends[0].textContent = o.fmt(o.min);
    ends[1].textContent = o.fmt(o.max);
    var g = pos(o.guess), a = pos(o.answer);
    host.querySelector(".mk.g").style.left = g + "%";
    host.querySelector(".mk.a").style.left = a + "%";
    var lg = host.querySelector(".ml.g"), la = host.querySelector(".ml.a");
    lg.textContent = "You: " + o.fmt(o.guess);
    la.textContent = "Answer: " + o.fmt(o.answer);
    lg.style.left = R.clamp(g, 10, 90) + "%";
    la.style.left = R.clamp(a, 13, 87) + "%";
    host.querySelector(".sr-only").textContent = "Your guess " + o.fmt(o.guess) + ". The answer " + o.fmt(o.answer) + ".";
  };

  /* guess versus truth for a choice: two boxes side by side */
  R.compare = function (host, guessText, truthText) {
    host.className = "vs";
    host.innerHTML = '<div><div class="lab">You said</div><div class="val"></div></div>' +
      '<div class="truth"><div class="lab">Answer</div><div class="val"></div></div>';
    var v = host.querySelectorAll(".val");
    v[0].textContent = guessText;
    v[1].textContent = truthText;
  };

  R.list = function (ul, lines) {
    ul.innerHTML = "";
    lines.forEach(function (t) { var li = document.createElement("li"); li.textContent = t; ul.appendChild(li); });
  };

  /* ---------- progress on this device only ---------- */
  var KEY = "riddles.progress";
  R.progress = function () {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  };
  R.markDone = function (slug, data) {
    try {
      var p = R.progress();
      p[slug] = Object.assign({ at: Date.now() }, data || {});
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch (e) { /* storage blocked: progress is optional */ }
  };

  window.R = R;
})();
