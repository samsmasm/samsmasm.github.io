/* Who's In, Who's Out: page wiring. All the maths lives in model.js. */
(function () {
  'use strict';
  const D = window.WIWO_DATA;
  const M = window.WIWO;
  const P = D.parties;
  const $ = s => document.querySelector(s);

  const DEFAULTS = { model: 'swing', excl: [] };
  const LINK_VERSION = 2; // v2: default seat model changed from hold to swing
  const MODEL_TEXT = {
    hold: 'every seat holds as in 2023',
    swing: 'uniform swing, with some seats called from electorate polls',
  };
  const MODEL_HINT = {
    hold: 'Each 2026 electorate goes to the party that won its closest 2023 seat. Simple and stable, but it ignores any shift in support since 2023.',
    swing: 'Each party\'s change since 2023 in the poll average is added to its 2023 candidate vote in every seat. Crude: it misses personal votes (Epsom for ACT, for example) and local campaigns. Exceptions, marked ● in the electorate table: '
      + D.electorates.filter(e => e.swingCall).map(e => `${e.name} (${P[e.swingCall.party].name})`).join(', ')
      + '. The Māori seats follow their latest electorate polls, and Tāmaki goes to National with its ACT MP retiring.',
  };

  // Pollsters in the data, with how many polls each has inside the averaging window.
  const newest = D.polls.reduce((m, p) => (p.end > m ? p.end : m), D.polls[0].end);
  const inWindow = p => (Date.parse(newest) - Date.parse(p.end)) / 86400000 <= M.WINDOW_DAYS;
  const pollsters = [...new Set(D.polls.map(p => p.pollster))].map(name => ({
    name, slug: M.slug(name),
    n: D.polls.filter(p => p.pollster === name && inWindow(p)).length,
  })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  const pollsterBySlug = Object.fromEntries(pollsters.map(p => [p.slug, p]));

  // ---------- helpers ----------
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = iso => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const pct = (x, d = 1) => x.toFixed(d) + '%';
  const pname = k => (P[k] ? P[k].name : k);
  const colour = k => (P[k] ? P[k].colour : '#999');
  const chip = k => `<span class="party"><span class="sw" style="background:${colour(k)}"></span>${esc(pname(k))}</span>`;
  function textOn(hex) {
    const n = parseInt(hex.slice(1), 16);
    const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return l > 0.6 ? '#1d1a24' : '#fff';
  }

  // ---------- state <-> URL hash ----------
  // Format: #v=2&model=hold&excl=Curia,RoyMorgan. Unknown keys are ignored so later
  // versions can add more (for example per-seat overrides) without breaking old links.
  // v=1 links were made when hold was the default, so a v=1 link with no model means hold.
  function readHash() {
    const q = new URLSearchParams(location.hash.slice(1));
    const oldDefault = q.get('v') === '1' ? 'hold' : DEFAULTS.model;
    const model = q.get('model') in MODEL_TEXT ? q.get('model') : oldDefault;
    const excl = (q.get('excl') || '').split(',').filter(s => s in pollsterBySlug);
    return { model, excl };
  }
  function writeHash(state) {
    const q = new URLSearchParams();
    q.set('v', String(LINK_VERSION));
    if (state.model !== DEFAULTS.model) q.set('model', state.model);
    if (state.excl.length) q.set('excl', state.excl.join(','));
    const h = '#' + q.toString().replace(/%2C/g, ',');
    if (location.hash !== h) history.replaceState(null, '', h);
  }

  let state = readHash();

  // ---------- render ----------
  function renderControls() {
    document.querySelectorAll('.seg button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.model === state.model)));
    $('#model-hint').textContent = MODEL_HINT[state.model];
    // Built once, then only ticked or unticked, so keyboard focus survives a change.
    if (!$('#pollsters').children.length) {
      $('#pollsters').innerHTML = pollsters.map(p => `
        <label><input type="checkbox" value="${p.slug}">
        <span>${esc(p.name)} <span class="n">${p.n ? p.n + ' poll' + (p.n > 1 ? 's' : '') : 'no recent polls'}</span></span></label>`).join('');
    }
    document.querySelectorAll('#pollsters input').forEach(i => { i.checked = !state.excl.includes(i.value); });
  }

  function renderChanged() {
    const box = $('#changed');
    const items = [];
    if (state.model !== DEFAULTS.model) items.push(`Seat model: ${MODEL_TEXT[state.model]} (default: ${MODEL_TEXT[DEFAULTS.model]})`);
    if (state.excl.length) items.push(`Pollsters excluded: ${state.excl.map(s => pollsterBySlug[s].name).join(', ')} (default: all included)`);
    box.hidden = false;
    if (!items.length) {
      box.className = 'default-note';
      box.innerHTML = 'Default assumptions.';
      return;
    }
    box.className = 'changed';
    box.innerHTML = `<h2>This view uses different assumptions from the default:</h2>
      <ul>${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
      <button type="button" class="reset">Reset to default assumptions</button>`;
    box.querySelector('.reset').onclick = () => update(DEFAULTS);
  }

  function renderPolls(r) {
    const pa = r.poll;
    $('#polls-upto').textContent = pa.avg ? `polls up to ${fmtDate(pa.latest)}` : '';
    if (!pa.avg) { $('#avg-table').innerHTML = ''; $('#polls-table').innerHTML = ''; return; }
    const keys = [...D.pollParties, 'OTH'];
    $('#avg-table').innerHTML = `<tr><th>Party</th><th class="r">Average</th><th class="r">2023</th><th class="r">Change</th></tr>` +
      keys.map(k => {
        const was = D.national2023[k];
        const ch = was != null ? pa.avg[k] - was : null;
        return `<tr><td>${chip(k)}</td><td class="r">${pct(pa.avg[k])}</td><td class="r">${was != null ? pct(was) : ''}</td>
          <td class="r">${ch != null ? (ch >= 0 ? '+' : '') + ch.toFixed(1) : ''}</td></tr>`;
      }).join('');
    $('#polls-used-summary').textContent = `${pa.used.length} polls in the average (last ${M.WINDOW_DAYS} days)`;
    $('#polls-table').innerHTML = `<tr><th>Fieldwork</th><th>Pollster</th><th class="r">Sample</th>${D.pollParties.map(k => `<th class="r">${k}</th>`).join('')}</tr>` +
      pa.used.map(p => `<tr><td>${p.start === p.end ? fmtDate(p.end) : fmtDate(p.start) + ' to ' + fmtDate(p.end)}</td>
        <td>${esc(p.pollster)}</td><td class="r">${p.sample ? p.sample.toLocaleString('en-NZ') : '?'}</td>
        ${D.pollParties.map(k => `<td class="r">${p.pct[k] != null ? p.pct[k] : '–'}</td>`).join('')}</tr>`).join('');
  }

  function partyOrder(r) {
    return Object.keys(r.alloc.parties)
      .filter(k => r.alloc.parties[k].total > 0)
      .sort((a, b) => r.alloc.parties[b].total - r.alloc.parties[a].total || r.alloc.parties[b].vote - r.alloc.parties[a].vote);
  }

  function renderTotals(r) {
    const a = r.alloc;
    const order = partyOrder(r);
    const majority = Math.floor(a.house / 2) + 1;
    // Left bloc on the left, Opportunity in the middle, right bloc on the right,
    // with a line at the halfway point so you can see who gets over it.
    const LR = ['GRN', 'LAB', 'TPM', 'OPP', 'NZF', 'ACT', 'NAT'];
    const barOrder = LR.filter(k => order.includes(k)).concat(order.filter(k => !LR.includes(k)));
    $('#bar').innerHTML = barOrder.map(k => {
      const t = a.parties[k].total;
      return `<div style="flex:${t};background:${colour(k)};color:${textOn(colour(k))}" title="${esc(pname(k))}: ${t}">${t >= 4 ? t : ''}</div>`;
    }).join('') + `<span class="half" title="Halfway: a majority needs ${majority}"></span>`;

    const over = Object.keys(a.parties).filter(k => a.parties[k].overhang > 0);
    $('#house').innerHTML = `House of <strong>${a.house}</strong> seats; a majority needs <strong>${majority}</strong> (the black line marks halfway). ` +
      (a.overhang > 0
        ? `That is ${a.overhang} more than 120 because of overhang: ${over.map(k => `${esc(pname(k))} wins ${a.parties[k].overhang} more electorate${a.parties[k].overhang > 1 ? 's' : ''} than its party vote entitles it to`).join('; ')}. In New Zealand the other parties get no extra seats to make up for it.`
        : 'No overhang.');

    const rows = Object.keys(a.parties).filter(k => k !== 'OTH')
      .sort((x, y) => a.parties[y].total - a.parties[x].total || a.parties[y].vote - a.parties[x].vote);
    $('#seat-table').innerHTML = `<tr><th>Party</th><th class="r">Party vote</th><th class="r">Electorates</th><th class="r">List</th><th class="r">Total</th><th>Note</th></tr>` +
      rows.map(k => {
        const p = a.parties[k];
        const note = !p.qualifies ? 'Under 5% and no electorate: no seats'
          : p.overhang ? `Overhang of ${p.overhang}`
          : (p.vote < M.THRESHOLD ? 'Under 5%, in on an electorate' : '');
        return `<tr class="${p.total ? '' : 'out'}"><td>${chip(k)}</td><td class="r">${pct(p.vote)}</td><td class="r">${p.electorates}</td>
          <td class="r">${p.list}</td><td class="r"><strong>${p.total}</strong></td><td class="lead">${note}</td></tr>`;
      }).join('') +
      `<tr class="out"><td>${chip('OTH')}</td><td class="r">${pct(r.poll.avg.OTH)}</td><td class="r"></td><td class="r"></td><td class="r">0</td><td class="lead">Smaller parties, all under 5%</td></tr>`;
  }

  function renderMPs(r) {
    $('#mp-lists').innerHTML = partyOrder(r).map(k => {
      const p = r.alloc.parties[k];
      const s = r.seats[k];
      const rows = s.mps.map(m => `<li><span class="${m.tbc ? 'tbc' : ''}">${esc(m.name)}</span>
        <span class="how">${m.how === 'electorate' ? 'Electorate: ' + esc(m.seat) : 'List #' + m.rank}</span></li>`).join('');
      const short = s.shortBy ? `<li class="tbc">List runs out: ${s.shortBy} seat${s.shortBy > 1 ? 's' : ''} unfilled</li>` : '';
      const next = s.next.length ? `<li class="cut">Cut-off · next in line</li>` +
        s.next.map(m => `<li class="next"><span>${esc(m.name)}</span><span class="how">List #${m.rank}</span></li>`).join('') : '';
      return `<div class="mp-party"><h3 style="border-color:${colour(k)}">${esc(pname(k))}</h3>
        <p class="sum">${p.total} seats: ${p.electorates} electorate, ${p.list} list</p>
        <ol>${rows}${short}${next}</ol></div>`;
    }).join('');
  }

  function renderElectorates(r) {
    const row = w => {
      const flipped = w.party !== w.held2023;
      let note = '';
      if (w.call) note = `<span class="flag" title="Called by hand">●</span> ${esc(w.call)}`;
      else if (state.model === 'swing' && w.lead != null) note = `lead ${w.lead.toFixed(1)} pts` + (flipped ? ` · gain from ${esc(pname(w.held2023))}` : '');
      else if (w.majority2023) note = `2023 majority ${w.majority2023.toLocaleString('en-NZ')}`;
      const flag = w.confidence !== 'high' ? ` <span class="flag" title="${esc('Mapping uncertain (' + w.confidence + '): ' + w.notes)}" tabindex="0">◆</span>` : '';
      return `<tr><td>${esc(w.name)}</td><td>${chip(w.party)}</td>
        <td>${w.candidate ? esc(w.candidate) : `<span class="tbc">Candidate TBC (none listed)</span>`}</td>
        <td>${esc(w.pred)}${flag}</td><td class="lead">${note}</td></tr>`;
    };
    const general = r.winners.filter(w => !w.maori), maori = r.winners.filter(w => w.maori);
    $('#elec-table').innerHTML = `<tr><th>Electorate</th><th>Predicted</th><th>Candidate</th><th>2023 seat</th><th>Note</th></tr>` +
      `<tr class="sub"><td colspan="5">General electorates (${general.length})</td></tr>` + general.map(row).join('') +
      `<tr class="sub"><td colspan="5">Māori electorates (${maori.length})</td></tr>` + maori.map(row).join('');
  }

  function render() {
    renderControls();
    renderChanged();
    const r = M.run(D, state);
    renderPolls(r);
    $('#results').hidden = !!r.empty;
    $('#empty').hidden = !r.empty;
    if (r.empty) return;
    renderTotals(r);
    renderMPs(r);
    renderElectorates(r);
  }

  function update(next) {
    state = { model: next.model, excl: [...next.excl] };
    writeHash(state);
    render();
  }

  // ---------- events ----------
  document.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => update({ ...state, model: b.dataset.model })));
  $('#pollsters').addEventListener('change', () => {
    const excl = [...document.querySelectorAll('#pollsters input')].filter(i => !i.checked).map(i => i.value);
    update({ ...state, excl });
  });
  window.addEventListener('hashchange', () => { state = readHash(); writeHash(state); render(); });
  $('#copy').addEventListener('click', async () => {
    writeHash(state);
    try { await navigator.clipboard.writeText(location.href); $('#copied').textContent = 'Copied.'; }
    catch (e) { $('#copied').textContent = location.href; }
    setTimeout(() => { $('#copied').textContent = ''; }, 4000);
  });

  // Static bits: constants in the "how it works" list, build info.
  document.querySelectorAll('[data-const]').forEach(el => { el.textContent = M[el.dataset.const]; });
  $('#build-info').textContent = `Data fetched ${fmtDate(D.fetched)}, built ${fmtDate(D.built)}; newest poll ${fmtDate(newest)}.`;

  writeHash(state);
  render();
})();
