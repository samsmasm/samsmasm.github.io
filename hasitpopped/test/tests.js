// Headless check of /hasitpopped: loads both tabs, clicks every control, fails on any page error.
// Run via test/run.sh. HP_SHOTS=<dir> saves screenshots.
const puppeteer = require(process.env.HP_MODS + '/puppeteer-core');
const URL = process.env.HP_URL, SHOTS = process.env.HP_SHOTS;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const [w, h, tag] of [[1280, 900, 'desktop'], [390, 844, 'phone']]) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/goatcounter|gc\.zgo|fonts\./.test(m.text())) errors.push(m.text()); });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    const answer = await page.$eval('#answer', (e) => e.textContent);
    ok(/^(Not yet|Wobbling|Hissing|Popped)\.$/.test(answer), `${tag}: verdict "${answer}"`);
    ok(await page.$$eval('.card', (c) => c.length) === 8, `${tag}: 8 signal cards`);
    ok(await page.$$eval('.card .chart', (c) => c.every((x) => x.innerHTML.length > 50)), `${tag}: every card has a chart`);
    ok(await page.$$eval('.card .v', (c) => c.every((x) => !/NaN|undefined|–/.test(x.textContent))), `${tag}: every card has a value`);
    ok(await page.$$eval('#context .v', (c) => c.every((x) => !/NaN|undefined/.test(x.textContent))), `${tag}: context values`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${tag}-overview.png`, fullPage: true });

    await page.click('nav a[data-tab="stocks"]');
    await new Promise((r) => setTimeout(r, 200));
    ok(await page.$eval('#indexchart', (e) => e.querySelectorAll('path').length >= 2), `${tag}: index chart drawn`);
    ok(await page.$$eval('.tile', (t) => t.length) === 24, `${tag}: 24 tiles`);
    for (const b of await page.$$('#measure button')) {
      await b.click();
      const bad = await page.$$eval('.tile .tv', (t) => t.filter((x) => /NaN|undefined/.test(x.textContent)).length);
      const label = await b.evaluate((e) => e.textContent);
      ok(bad === 0, `${tag}: measure "${label}" renders`);
    }
    for (const b of await page.$$('#range button')) await b.click();
    for (const b of await page.$$('#legend button')) await b.click();
    for (const b of await page.$$('#legend button')) await b.click();
    for (const k of ['fromPeak', 'name', 'vol']) await page.click(`th[data-k="${k}"]`);
    ok(await page.$$eval('#table tbody tr', (r) => r.length) === 24, `${tag}: table has 24 rows`);
    ok(!(await page.$eval('#table', (e) => /NaN|undefined/.test(e.textContent))), `${tag}: table has no NaN`);
    await page.click('#measure button');
    await page.click('#range button[data-r="0"]');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${tag}-stocks.png`, fullPage: true });
    ok(errors.length === 0, `${tag}: no page errors ${errors.join(' | ')}`);
    await page.close();
  }
  await browser.close();
  console.log(fails ? `${fails} failed` : 'all passed');
  process.exit(fails ? 1 : 0);
})();
