const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');

const MODELKEYS = ['ecmwf_ifs025', 'gfs_seamless', 'icon_seamless', 'gem_seamless'];
function fakeResponse(url) {
  const u = new URL(url);
  const n = u.searchParams.get('latitude').split(',').length;
  const out = [];
  for (let c = 0; c < n; c++) {
    const hourly = { time: [] };
    for (let i = 0; i < 72; i++) {
      const d = Math.floor(i / 24), h = i % 24;
      hourly.time.push('2026-10-' + String(16 + d) + 'T' + String(h).padStart(2, '0') + ':00');
    }
    MODELKEYS.forEach((k, mi) => {
      const T = [], RH = [], AT = [], P = [], SW = [], UV = [];
      for (let i = 0; i < 72; i++) {
        const d = Math.floor(i / 24), h = i % 24;
        const diurnal = Math.sin(((h - 9) / 24) * 2 * Math.PI); // peaks at 15
        const t = 28 + c * 0.2 + d * 0.5 + mi * 0.4 + 5 * diurnal;
        T.push(+t.toFixed(1)); RH.push(Math.round(70 - 12 * diurnal - mi * 2));
        AT.push(+(t + 3).toFixed(1)); P.push(1008 + mi);
        SW.push(h >= 6 && h <= 18 ? Math.round(900 * (1 + 0.05 * mi) * Math.sin(((h - 6) / 12) * Math.PI)) : 0);
        UV.push(mi < 2 ? (h >= 6 && h <= 18 ? +(10 * Math.sin(((h - 6) / 12) * Math.PI)).toFixed(1) : 0) : null);
      }
      hourly['temperature_2m_' + k] = T; hourly['relative_humidity_2m_' + k] = RH;
      hourly['apparent_temperature_' + k] = AT; hourly['surface_pressure_' + k] = P;
      hourly['shortwave_radiation_' + k] = SW; hourly['uv_index_' + k] = UV;
    });
    out.push({ hourly });
  }
  return out;
}

async function run(mode) {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/',
    beforeParse(win) {
      if (mode === 'live') win.fetch = (url) => Promise.resolve({ ok: true, json: () => Promise.resolve(fakeResponse(String(url))) });
      win.addEventListener('error', (e) => console.log('PAGE ERROR', e.message));
    }
  });
  const w = dom.window, d = w.document;
  await new Promise((r) => setTimeout(r, 300));
  const q = (s) => d.querySelector(s), qa = (s) => Array.from(d.querySelectorAll(s));
  const res = {};
  res.mode = mode;
  res.status = q('#status').textContent;
  res.rows = qa('#lrows tr[data-id]').length;
  res.heads = qa('#lhead button').map((b) => b.textContent);
  res.topRow = q('#lrows tr').textContent.replace(/\s+/g, ' ').slice(0, 90);
  res.count = q('#count').textContent;

  // day change
  qa('#days button')[1].click();
  res.dayPressed = qa('#days button').map((b) => b.getAttribute('aria-pressed')).join(',');
  res.topRowTomorrow = q('#lrows tr').textContent.replace(/\s+/g, ' ').slice(0, 90);
  res.midLbl = q('#midLbl').textContent;

  // sort by sun
  q('#lhead button[data-k="sw"]').click();
  const first = (tr, i) => parseFloat(tr.children[i].firstChild.textContent);
  res.firstRowCells = Array.from(q('#lrows tr[data-id]').children).slice(1).map((td) => td.textContent).join(' | ');
  const sws = qa('#lrows tr[data-id]').map((tr) => first(tr, 5)).filter((x) => !isNaN(x));
  res.sortSunDesc = sws.slice(0, 3).join(' >= ') + ' sorted=' + sws.every((v, i) => i === 0 || sws[i - 1] >= v);
  q('#lhead button[data-k="sw"]').click();
  const sws2 = qa('#lrows tr[data-id]').map((tr) => first(tr, 5)).filter((x) => !isNaN(x));
  res.sortSunAsc = sws2.slice(0, 3).join(' <= ') + ' sorted=' + sws2.every((v, i) => i === 0 || sws2[i - 1] <= v);
  q('#lhead button[data-k="uv"]').click();
  const uvs = qa('#lrows tr[data-id]').map((tr) => tr.children[6].textContent);
  res.sortUVhead = q('#lhead th.on').textContent;
  res.sortUV = uvs.slice(0, 3).join(',') + ' last=' + uvs.slice(-2).join(',');

  // filter
  const inp = q('#q'); inp.value = 'viet'; inp.dispatchEvent(new w.Event('input', { bubbles: true }));
  res.filterViet = qa('#lrows tr[data-id] .cn').map((x) => x.textContent).join(', ');
  inp.value = 'zzz'; inp.dispatchEvent(new w.Event('input', { bubbles: true }));
  res.filterNone = q('#lrows').textContent;
  inp.value = 'da nang'; inp.dispatchEvent(new w.Event('input', { bubbles: true }));
  q('#lrows tr[data-id]').click();
  res.detail = q('#dName').textContent + ' | wb ' + q('#mid').textContent + ' | range ' + q('#fRange').textContent;
  res.measures = qa('#mrows tr').map((tr) => Array.from(tr.children).map((td) => td.textContent).join(' / ')).join(' || ');
  res.srcRows = qa('#rows tr').length;
  res.chartDots = qa('#chart circle').length;

  // edit input
  const before = q('#a-ecmwf').textContent;
  const ti = q('#t-ecmwf'); ti.value = '40'; ti.dispatchEvent(new w.Event('input', { bubbles: true }));
  res.editAT = before + ' -> ' + q('#a-ecmwf').textContent + ' wb ' + q('#w-ecmwf').textContent;

  // method toggle
  q('#mFull').click();
  res.full = q('#w-ecmwf').textContent;

  // game
  q('#gameBtn').click();
  res.gameHidden = 'main hidden=' + q('#main').hidden + ' guess shown=' + !q('#guessCard').hidden + ' | ' + q('#guessQ').textContent;
  q('#revealBtn').click();
  res.reveal = 'main hidden=' + q('#main').hidden + ' result: ' + q('#resText').textContent.slice(0, 80);
  res.revealChart = q('#chart').innerHTML.includes('your guess');
  q('#gameBtn').click();
  res.exit = 'main hidden=' + q('#main').hidden + ' result hidden=' + q('#resultCard').hidden;
  return res;
}

(async () => {
  for (const m of ['example', 'live']) {
    console.log(JSON.stringify(await run(m), null, 1));
  }
})();
