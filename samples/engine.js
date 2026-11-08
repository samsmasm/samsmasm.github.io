/* Samples reveal engine.
   A page defines window.SAMPLE = { parts: [ { title, marks, question, checklist?, checked?, unchecked?, paras: [...] } ] }
   checked: true shows "Checked by Sam"; unchecked: true shows the bright "Not checked by Sam" box for that part.
   then loads this file. Each para: { label, covers?, hint[], prompt[], starters[], text, graph? }
   In text, {curly braces} mark a blank that reveals one word per click.
   graph: { src, alt, caption } */
(function () {
  var MAX_LEVEL = 4;
  var ADV_LABELS = ['Show hint', 'Show prompt', 'Show starters', 'Show blanks', 'Done'];
  var paras = [];

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function buildBlanks(text, idx) {
    var parts = text.split(/\{([^}]+)\}/);
    var html = '';
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 0) { html += esc(parts[i]); continue; }
      html += '<span class="blank" role="button" tabindex="0" data-para="' + idx + '" data-words="' +
        encodeURIComponent(parts[i]) + '" data-revealed="0" title="Click to reveal a word">   </span>';
    }
    return html;
  }

  function list(items, cls) {
    return '<div class="para-text ' + cls + '">' + items.map(function (h) { return '<div class="starter-line">' + esc(h) + '</div>'; }).join('') + '</div>';
  }

  function renderPara(p, idx) {
    var div = document.createElement('div');
    div.className = 'para-block';
    div.dataset.level = 0;
    div.dataset.idx = idx;
    var graph = p.graph ? '<figure class="para-graph"><img src="' + esc(p.graph.src) + '" alt="' + esc(p.graph.alt || '') +
      '">' + (p.graph.caption ? '<figcaption>' + esc(p.graph.caption) + '</figcaption>' : '') + '</figure>' : '';
    div.innerHTML =
      '<div class="para-meta">' +
        '<span class="para-label">' + esc(p.label) + '</span>' +
        '<span class="para-covers">' + (p.covers ? esc(p.covers.join(' · ')) : '') + '</span>' +
        '<button class="para-reset" data-act="reset" title="Hide this paragraph again">Reset</button>' +
        '<button class="para-back" data-act="back" title="Go back one step" disabled>Back</button>' +
        '<button class="para-adv" data-act="adv">Show hint</button>' +
      '</div>' +
      '<div class="level-content" data-l="1">' + list(p.hint, 'hint') + '</div>' +
      '<div class="level-content" data-l="2">' + list(p.prompt, 'prompt') + '</div>' +
      '<div class="level-content" data-l="3"><div class="para-text starters">' +
        p.starters.map(function (s) { return '<div class="starter-line">' + esc(s) + '</div>'; }).join('') + '</div></div>' +
      '<div class="level-content" data-l="4"><p class="para-text">' + buildBlanks(p.text, idx) + '</p>' + graph + '</div>';
    return div;
  }

  function block(idx) { return document.querySelector('.para-block[data-idx="' + idx + '"]'); }

  function setLevel(idx, level) {
    var b = block(idx);
    b.dataset.level = level;
    b.querySelectorAll('.level-content').forEach(function (el) {
      el.classList.toggle('active', +el.dataset.l === level);
    });
    var btn = b.querySelector('.para-adv');
    btn.textContent = ADV_LABELS[level];
    btn.disabled = level === MAX_LEVEL;
    b.querySelector('.para-back').disabled = level === 0;
    if (level === 0) b.querySelectorAll('.blank').forEach(resetBlank);
  }

  function resetBlank(el) {
    el.dataset.revealed = 0;
    el.textContent = '   ';
    el.classList.remove('partial', 'revealed');
    el.setAttribute('tabindex', '0');
  }

  function revealWord(el, all) {
    var words = decodeURIComponent(el.dataset.words).split(' ');
    var n = all ? words.length : Math.min(words.length, +el.dataset.revealed + 1);
    el.dataset.revealed = n;
    if (n < words.length) {
      el.textContent = words.slice(0, n).join(' ') + '…';
      el.classList.add('partial');
    } else {
      el.textContent = words.join(' ');
      el.classList.remove('partial');
      el.classList.add('revealed');
      el.removeAttribute('tabindex');
    }
  }

  function setAll(level) { paras.forEach(function (_, i) { setLevel(i, level); }); }

  function revealAll() {
    setAll(MAX_LEVEL);
    document.querySelectorAll('.blank').forEach(function (b) { revealWord(b, true); });
  }

  function render() {
    var main = document.getElementById('essay');
    window.SAMPLE.parts.forEach(function (part) {
      var sec = document.createElement('section');
      sec.className = 'part';
      var head = '';
      if (part.unchecked) head += '<div class="unchecked" role="note"><strong>Not checked by Sam</strong><span>Sam hasn\'t checked this part yet, so it may contain mistakes. Use it with care.</span></div>';
      if (part.title) head += '<div class="part-head"><h2>' + esc(part.title) + '</h2><span class="marks">' + esc(part.marks) + ' marks</span></div>';
      if (part.checked) head += '<div class="checked" role="note">&#10003; Checked by Sam</div>';
      if (part.question) head += '<p class="question">&#8220;' + esc(part.question) + '&#8221;</p>';
      if (part.checklist) {
        head += '<div class="checklist"><div class="label">Checklist: ' + esc(part.checklist.map(function (c) { return c[0].charAt(0); }).join('')) + '</div><ol>' +
          part.checklist.map(function (c) {
            return '<li><span class="letter">' + esc(c[0].charAt(0)) + '</span><span><b>' + esc(c[0]) + '.</b> ' + esc(c[1]) + '</span></li>';
          }).join('') + '</ol></div>';
      }
      sec.innerHTML = head;
      part.paras.forEach(function (p) {
        sec.appendChild(renderPara(p, paras.length));
        paras.push(p);
      });
      main.appendChild(sec);
    });

    main.addEventListener('click', function (e) {
      var blank = e.target.closest('.blank');
      if (blank && !blank.classList.contains('revealed')) { revealWord(blank); return; }
      var btn = e.target.closest('button[data-act]');
      if (!btn) return;
      var idx = +btn.closest('.para-block').dataset.idx;
      var lv = +block(idx).dataset.level;
      if (btn.dataset.act === 'adv' && lv < MAX_LEVEL) setLevel(idx, lv + 1);
      if (btn.dataset.act === 'back' && lv > 0) setLevel(idx, lv - 1);
      if (btn.dataset.act === 'reset') setLevel(idx, 0);
    });
    main.addEventListener('keydown', function (e) {
      var blank = e.target.closest && e.target.closest('.blank');
      if (blank && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); revealWord(blank); }
    });

    document.querySelectorAll('[data-all]').forEach(function (b) {
      b.addEventListener('click', function () { setAll(+b.dataset.all); });
    });
    var ra = document.getElementById('reveal-all');
    if (ra) ra.addEventListener('click', revealAll);
  }

  render();
})();
