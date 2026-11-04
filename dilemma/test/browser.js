// Drives the real pages in headless Chrome. Run through test/run.sh.

import { createRequire } from 'node:module';
const require = createRequire(process.env.MODS + '/');
const puppeteer = require('puppeteer-core');

const BASE = process.env.URL;
const SHOTS = process.env.SHOTS;
let passed = 0, failed = 0;
const ok = (cond, name, extra = '') => {
  if (cond) { passed++; console.log('PASS', name); } else { failed++; console.log('FAIL', name, extra); }
};

const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.setViewport({ width: 1280, height: 900 });

// Home
await page.goto(BASE + 'index.html', { waitUntil: 'networkidle0' });
ok(await page.$eval('#m-dc', e => e.textContent.trim().startsWith('5')), 'home: payoff matrix filled from config');
if (SHOTS) await page.screenshot({ path: SHOTS + '/home.png', fullPage: true });

// Builder: defaults are Tit for Tat
await page.goto(BASE + 'build.html', { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
let rb = await page.$eval('#b-readback', e => e.textContent);
ok(/Round 1: cooperate/.test(rb) && /they defected last round: defect/i.test(rb), 'builder: default readback is Tit for Tat', rb);

// Grudge forever, plus a special final round
await page.click('[data-k="grudge-kind-forever"]');
await page.click('[data-k="card-special"]');
rb = await page.$eval('#b-readback', e => e.textContent);
ok(/it is the final round: defect/.test(rb), 'builder: special round in readback', rb);
ok(/set "grudge" to 1/.test(rb), 'builder: forever grudge uses memory', rb);
ok(await page.$eval('#b-meter', e => e.textContent) === '4 of 8 rules', 'builder: rule meter');

// Chance slider on first move
await page.click('[data-k="first-do-some"]');
rb = await page.$eval('#b-readback', e => e.textContent);
ok(/Round 1: cooperate 80% of the time \(almost always\), otherwise defect/.test(rb), 'builder: chance on first move', rb);

// Too many twists trips the rule cap
for (const id of ['testing', 'scoreboard', 'switching', 'reading', 'startup']) await page.click(`[data-k="card-${id}"]`);
await page.click('[data-k="testing-ifNot-exploit"]');
await page.click('[data-k="testing-ifRetaliate-apologise"]');
ok(await page.$eval('#b-test', b => b.disabled), 'builder: over the rule cap blocks testing');
ok(await page.$eval('#b-meter', e => e.classList.contains('over')), 'builder: meter shows over');
if (SHOTS) await page.screenshot({ path: SHOTS + '/builder-over.png', fullPage: true });
for (const id of ['testing', 'switching', 'reading', 'startup']) await page.click(`[data-k="card-${id}"]`);
ok(!(await page.$eval('#b-test', b => b.disabled)), 'builder: back under the cap');

await page.type('#b-name', 'Grudge Bot');
await page.click('#b-test');
await page.waitForSelector('#review:not(.hidden)');
ok(await page.$eval('#r-tests', e => e.querySelectorAll('.panel').length) === 2, 'review: two test matches');
ok(await page.$eval('#r-replay [data-round]', e => e.textContent) === '100 of 100', 'review: replay shown');
const why = await page.$eval('#r-replay [data-wa]', e => e.textContent);
ok(/Rule \d/.test(why) || /First move/.test(why) || /fallback/.test(why), 'review: replay says which rule fired', why);
if (SHOTS) await page.screenshot({ path: SHOTS + '/review.png', fullPage: true });

// Back to the builder keeps the answers
await page.click('#r-edit');
ok(await page.$eval('#b-name', e => e.value) === 'Grudge Bot', 'review: change it returns to the builder with answers');

// Reload keeps the answers
await page.reload({ waitUntil: 'networkidle0' });
ok(await page.$eval('#b-name', e => e.value) === 'Grudge Bot', 'builder: answers survive a reload');

// AI route: broken JSON, then a builder-made JSON that can reopen in the builder
await page.click('[data-route="ai"]');
ok((await page.$eval('#ai-prompt', e => e.value)).includes('Tit for Tat'), 'ai: prompt has the worked example');
await page.type('#ai-paste', '{"schemaVersion":1,"name":"x","firstMove":{"do":"copy"},"rules":[]}');
await page.click('#ai-check');
const errs = await page.$eval('#ai-errors', e => e.textContent);
ok(/round 1/.test(errs) && /fallback/.test(errs), 'ai: friendly errors', errs);
await page.$eval('#ai-paste', e => { e.value = ''; });
await page.type('#ai-paste', 'Sure! ```json\n' + JSON.stringify({
  schemaVersion: 1, name: 'Sneaky', approximations: 'You asked to recognise friends; it cannot, so it watches their cooperation rate.',
  firstMove: { do: 'cooperate' },
  rules: [{ when: [{ check: 'theirCooperationRate', atLeast: 80 }, { check: 'roundsLeft', atMost: 3 }], do: 'defect' }],
  fallback: { do: 'copy' }
}) + '\n```');
await page.click('#ai-check');
await page.waitForSelector('#review:not(.hidden)');
ok(/could not build everything/.test(await page.$eval('#r-approx', e => e.textContent)), 'ai: approximation note shown');
ok(await page.$eval('#r-edit', e => e.textContent) === 'Change it', 'ai: hand-made JSON is read-only for the builder');

// Phone width: nothing wider than the screen
await page.setViewport({ width: 390, height: 844 });
await page.goto(BASE + 'build.html', { waitUntil: 'networkidle0' });
const wide = await page.evaluate(() => document.documentElement.scrollWidth);
ok(wide <= 392, 'phone: build page fits', 'scrollWidth ' + wide);
if (SHOTS) await page.screenshot({ path: SHOTS + '/phone.png', fullPage: false });

// Results drawn from a real tournament
await page.setViewport({ width: 1280, height: 900 });
await page.goto(BASE + 'test/results-harness.html', { waitUntil: 'networkidle0' });
await page.waitForFunction(() => document.getElementById('RESULTS').textContent.includes('DONE'));
const lines = (await page.$eval('#RESULTS', e => e.textContent)).split('\n').filter(l => l !== 'DONE');
for (const l of lines) ok(l.startsWith('PASS'), 'results: ' + l.replace(/^(PASS|FAIL) /, ''));
if (SHOTS) await page.screenshot({ path: SHOTS + '/results.png', fullPage: true });

// Teacher page loads to its sign-in
await page.goto(BASE + 'teacher.html', { waitUntil: 'networkidle0' });
await page.waitForSelector('#signed-out:not(.hidden)', { timeout: 8000 }).catch(() => {});
ok(await page.$eval('#signed-out', e => !e.classList.contains('hidden')), 'teacher: shows sign in');

ok(errors.length === 0, 'no page errors', errors.join('\n'));
await browser.close();
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
