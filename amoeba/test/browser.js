// Browser check with headless Chrome: desktop and phone layouts, controls, fast forward.
// Needs a server: python3 -m http.server 8765 --bind 127.0.0.1 (repo root). Run: node amoeba/test/browser.js [outDir]
'use strict';
const puppeteer = require('/home/sam/.cache/sw-test/node_modules/puppeteer-core');
const out = process.argv[2] || '.';
const URL = 'http://127.0.0.1:8765/amoeba/';

let failed = 0;
const check = (name, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`); if (!ok) failed++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('dialog', (d) => { errors.push('dialog: ' + d.message()); d.dismiss(); });

    // Desktop
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await sleep(1500);
    const alive1 = +(await page.$eval('#sAlive', (e) => e.textContent));
    check('desktop: amoebas alive after load', alive1 > 0, `${alive1} alive`);
    const layout = await page.evaluate(() => {
      const d = document.getElementById('dish').getBoundingClientRect();
      const p = document.querySelector('.panel').getBoundingClientRect();
      return { dw: d.width, dh: d.height, side: p.left >= d.right, scroll: document.documentElement.scrollWidth > innerWidth };
    });
    check('desktop: dish is 3:2 and the panel sits beside it', Math.abs(layout.dw / layout.dh - 1.5) < 0.02 && layout.side, `${Math.round(layout.dw)}x${Math.round(layout.dh)}`);
    check('desktop: no horizontal scroll', !layout.scroll);
    await page.screenshot({ path: `${out}/desktop.png` });

    // Fast forward: generations should climb quickly.
    const gen0 = +(await page.$eval('#sGen', (e) => e.textContent));
    await page.click('[data-speed="fast"]');
    await sleep(6000);
    const gen1 = +(await page.$eval('#sGen', (e) => e.textContent));
    const rate = await page.$eval('#rate', (e) => e.textContent);
    check('fast forward advances many generations', gen1 - gen0 >= 5, `${gen0} -> ${gen1}, "${rate}"`);
    const pts = await page.evaluate(() => {
      const g = document.getElementById('graph'), c = g.getContext('2d').getImageData(0, 0, g.width, g.height).data;
      let n = 0; for (let i = 3; i < c.length; i += 4) if (c[i] > 0) n++; return n;
    });
    check('history graph is drawn', pts > 200, `${pts} painted pixels`);

    // Sliders and rot reach the world.
    await page.$eval('#inThick', (e) => { e.value = '2'; e.dispatchEvent(new Event('input')); });
    await page.click('[data-rot="fast"]');
    const vThick = await page.$eval('#vThick', (e) => e.textContent);
    check('thickness slider updates its label', vThick === 'x2.0', vThick);
    await sleep(1500);
    await page.screenshot({ path: `${out}/desktop-rot.png` });

    // Pause stops the clock.
    await page.click('#btnPause');
    const g2 = await page.$eval('#sGen', (e) => e.textContent);
    const f2 = await page.$eval('#sFood', (e) => e.textContent);
    await sleep(1500);
    const g3 = await page.$eval('#sGen', (e) => e.textContent);
    const f3 = await page.$eval('#sFood', (e) => e.textContent);
    check('pause freezes the world', g2 === g3 && f2 === f3);
    await page.click('#btnPause');

    // Restart (back to Watch first, or fast forward races through generations in the wait).
    await page.click('[data-speed="1"]');
    await page.click('#btnRestart');
    await sleep(300);
    const genR = +(await page.$eval('#sGen', (e) => e.textContent));
    check('restart begins again', genR <= 2, `generation ${genR}`);

    // Phone
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(1500);
    const phone = await page.evaluate(() => {
      const d = document.getElementById('dish').getBoundingClientRect();
      const p = document.querySelector('.panel').getBoundingClientRect();
      return { dw: d.width, below: p.top >= d.bottom - 1, scroll: document.documentElement.scrollWidth > innerWidth, pw: p.width };
    });
    check('phone: dish fills the width with 16px gutters', Math.abs(phone.dw - (390 - 32)) < 2, `${Math.round(phone.dw)}px`);
    check('phone: panel below the dish', phone.below);
    check('phone: no horizontal scroll', !phone.scroll);
    await page.screenshot({ path: `${out}/phone.png`, fullPage: true });

    check('no page errors or dialogs', errors.length === 0, errors.join(' | '));
  } finally {
    await browser.close();
  }
  console.log(failed ? `\n${failed} FAILED` : '\nAll passed');
  process.exit(failed ? 1 : 0);
})();
