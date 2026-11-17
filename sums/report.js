// Report a problem: the same shared unisam-feedback inbox Grill uses (see ../feedback/CLAUDE.md), app 'sums'.
// Every Sums page loads this. It adds a small flag button to the page's <header> (or the corner if there is
// none) that opens a panel: reason chips, optional words, Send. A page can set window.sumsReportContext to a
// function returning what it is showing (activity, settings, the questions on the sheet); that is sent as
// `diagram` JSON and shows under "Attached data" in the inbox. Nothing else is sent.
(() => {
  const URL_ = 'https://unisam.nz/feedback/api/report';
  const REASONS = ['It read the writing wrong', 'The answer is wrong', 'The picture looks wrong', 'Too small or hard to tap', 'It is confusing', 'Something else'];
  const css = `
  .rptBtn { padding: 4px 8px !important; line-height: 0; border-color: #bbb !important; color: #888 !important; background: #fff; }
  .rptBtn svg { width: 20px; height: 20px; }
  header .rptBtn { margin-left: auto; }
  header #score:not([hidden]) ~ .rptBtn, header .spacer:not([hidden]) ~ .rptBtn { margin-left: 0; }
  .rptBtn.corner { position: fixed; right: 12px; bottom: 12px; z-index: 50; border: 1.5px solid #bbb; border-radius: 4px; cursor: pointer; }
  #rptBack { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; padding: 16px; }
  #rptBox { background: #fff; color: #111; border: 1.5px solid #111; border-radius: 8px; padding: 18px; width: 100%; max-width: 460px;
    font: 16px/1.35 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; -webkit-user-select: text; user-select: text; }
  #rptBox h2 { font-size: 20px; margin: 0 0 12px; }
  #rptBox .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  #rptBox button { font: inherit; color: #111; background: #fff; border: 1.5px solid #111; border-radius: 4px; padding: 6px 12px; cursor: pointer; }
  #rptBox .chips button { font-size: 15px; }
  #rptBox button.sel, #rptBox button.primary { background: #111; color: #fff; }
  #rptBox textarea { display: block; width: 100%; box-sizing: border-box; margin: 12px 0; font: inherit; font-size: 15px; padding: 8px; border: 1.5px solid #111; border-radius: 4px; }
  #rptBox .row { display: flex; gap: 8px; }
  #rptBox .note { color: #888; font-size: 14px; margin: 10px 0 0; }
  #rptBox .msg { font-size: 14px; margin: 6px 0 0; min-height: 1.2em; }`;
  const flag = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M5 21V4"/><path d="M5 4h12l-2.5 4L17 12H5" fill="currentColor" fill-opacity=".15"/></svg>';

  function init() {
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const btn = document.createElement('button');
    btn.className = 'rptBtn'; btn.id = 'rptBtn'; btn.type = 'button';
    btn.setAttribute('aria-label', 'Report a problem'); btn.title = 'Report a problem';
    btn.innerHTML = flag;
    const head = document.querySelector('header');
    if (head) head.appendChild(btn); else { btn.classList.add('corner'); document.body.appendChild(btn); }
    btn.onclick = open;
  }

  let reason = null, sentOnce = false;
  function open() {
    if (document.getElementById('rptBack')) return;
    reason = null;
    const back = document.createElement('div'); back.id = 'rptBack';
    back.innerHTML = `<div id="rptBox" role="dialog" aria-label="Report a problem">
      <h2>${sentOnce ? 'Thanks. Anything else wrong?' : 'What’s wrong?'}</h2>
      <div class="chips">${REASONS.map(r => `<button type="button" data-r="${r}">${r}</button>`).join('')}</div>
      <textarea rows="3" maxlength="1000" placeholder="Anything else? (optional)"></textarea>
      <input name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
      <div class="row"><button type="button" class="primary" data-a="send">Send</button><button type="button" data-a="cancel">Cancel</button></div>
      <p class="note">Sends this page${window.sumsReportContext ? ', the activity, its settings and the questions on screen with what was read' : ''}. Nothing else.</p>
      <p class="msg"></p></div>`;
    document.body.appendChild(back);
    // keep taps and keys inside the panel from reaching the page (sheets listen for pen strokes)
    for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'keydown']) back.addEventListener(ev, e => e.stopPropagation());
    back.addEventListener('click', e => {
      e.stopPropagation();
      if (e.target === back) return close();
      const c = e.target.closest('[data-r]');
      if (c) { reason = c.dataset.r; back.querySelectorAll('[data-r]').forEach(b => b.classList.toggle('sel', b === c)); return; }
      const a = e.target.closest('[data-a]');
      if (a && a.dataset.a === 'cancel') close();
      if (a && a.dataset.a === 'send') send(back);
    });
  }
  function close() { const b = document.getElementById('rptBack'); if (b) b.remove(); }

  async function send(back) {
    const text = back.querySelector('textarea').value.trim(), msg = back.querySelector('.msg'), btn = back.querySelector('[data-a="send"]');
    if (!reason && !text) { msg.textContent = 'Pick a reason or write a few words first.'; return; }
    let ctx = null;
    try { ctx = window.sumsReportContext ? window.sumsReportContext() : null; } catch (e) { ctx = { error: String(e) }; }
    const where = ctx && ctx.where ? ctx.where : document.title;
    const payload = {
      app: 'sums', type: 'bug',
      message: (reason || 'Report') + (text ? ': ' + text : '') + '\n\nWhere: ' + where,
      website: back.querySelector('[name="website"]').value,
      meta: { page: location.host + location.pathname + location.search, where, browser: navigator.userAgent, viewport: innerWidth + 'x' + innerHeight },
    };
    if (ctx) { try { payload.diagram = JSON.stringify(ctx).slice(0, 290000); } catch (e) {} }
    btn.disabled = true; msg.textContent = 'Sending…';
    try {
      const r = await fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (r.status === 429) throw new Error('Too many reports from here in the last hour. Try again later.');
      if (!r.ok) throw new Error('The report could not be sent (error ' + r.status + ').');
      sentOnce = true;
      back.querySelector('#rptBox').innerHTML = '<h2>Thanks, sent.</h2><div class="row"><button type="button" class="primary" data-a="cancel">Close</button></div>';
    } catch (e) {
      btn.disabled = false;
      msg.textContent = /^(Too many|The report)/.test(e.message) ? e.message : 'Could not reach the server. Check the connection and try again.';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
