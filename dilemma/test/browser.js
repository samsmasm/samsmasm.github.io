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

// Firebase is replaced by test/fake-firebase.js, so sending and the
// competitions page run with no network and their writes can be read back.
const fakeFirebase = (await import('node:fs')).readFileSync(new URL('./fake-firebase.js', import.meta.url), 'utf8')
  .replace("from './classics.js'", "from '/dilemma/test/classics.js'");
await page.setRequestInterception(true);
page.on('request', req => {
  if (/\/dilemma\/js\/firebase\.js/.test(req.url())) {
    req.respond({ status: 200, contentType: 'application/javascript', body: fakeFirebase });
  } else req.continue();
});

// Home
await page.goto(BASE + 'index.html', { waitUntil: 'networkidle0' });
ok(await page.$eval('#m-cc', e => e.textContent.trim().startsWith('2')), 'home: matrix in years, from config');
ok(await page.$eval('#m-dc', e => e.textContent.trim().startsWith('0')), 'home: defecting on a cooperator is 0 years');
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

await page.click('[data-k="card-spot"]');
rb = await page.$eval('#b-readback', e => e.textContent);
ok(/they cooperated last round and you defected two rounds ago: defect/.test(rb), 'spot: pattern in readback', rb);
await page.click('[data-k="spot-entries-0-them-0"]');
await page.click('[data-k="spot-entries-0-them-2"]');
rb = await page.$eval('#b-readback', e => e.textContent);
ok(/they defected last round and you defected two rounds ago and they cooperated three rounds ago/.test(rb), 'spot: cells cycle C, D, blank', rb);
if (SHOTS) await page.screenshot({ path: SHOTS + '/spot.png', fullPage: true });
await page.click('[data-k="card-spot"]');

ok(await page.$eval('#stepbar [aria-current="step"]', e => e.dataset.step) === '1', 'steps: on step 1 while building');
await page.type('#b-name', 'Grudge Bot');
await page.click('#b-next');
await page.waitForSelector('#review:not(.hidden)');
ok(await page.$eval('#stepbar [aria-current="step"]', e => e.dataset.step) === '2', 'steps: the bottom button goes to step 2');
ok(await page.$eval('#r-tests', e => e.querySelectorAll('.panel').length) === 4, 'review: four test matches');
const cards = await page.$$eval('#r-tests .panel', els => els.map(e => e.textContent.replace(/\s+/g, ' ')));
ok(/vs Always Cooperate/.test(cards[1]), 'review: Always Cooperate is a test opponent');
ok(/vs Random/.test(cards[3]), 'review: Random is a test opponent');
ok(cards.every(c => /You ?\d+ years/.test(c)), 'review: your years shown by name', cards[0]);
ok(/Tit for Tat ?\d+ years/.test(cards[0]), 'review: their years shown by name', cards[0]);
ok(cards.every(c => /got less time in jail|Same time in jail/.test(c)), 'review: verdict in jail words', cards.join(' | '));
ok(!cards.some(c => /scored/.test(c)), 'review: no "scored"');
ok(await page.$eval('#r-replay [data-round]', e => e.textContent) === '100 of 100', 'review: replay shown');
const why = await page.$eval('#r-replay [data-wa]', e => e.textContent);
ok(/Rule \d/.test(why) || /First move/.test(why) || /fallback/.test(why), 'review: replay says which rule fired', why);
if (SHOTS) await page.screenshot({ path: SHOTS + '/review.png', fullPage: true });

// Sending: class by code, public by list
await page.click('#s-send');
ok(/Pick a handle/.test(await page.$eval('#s-msg', e => e.textContent)), 'send: needs a handle first');
await page.type('#s-handle', 'Shark 7!');
await page.type('#s-code', 'class1');
await page.click('#s-send');
await page.waitForFunction(() => /Sent|There is no|closed/.test(document.querySelector('#s-msg').textContent));
let sent = await page.evaluate(() => window.__sent);
ok(sent.length === 1 && sent[0].code === 'CLASS1' && sent[0].handle === 'Shark 7', 'send: to class, handle cleaned', JSON.stringify(sent));
ok(await page.$eval('#stepbar [aria-current="step"]', e => e.dataset.step) === '3', 'steps: step 3 after sending');
const publicOpts = await page.$$eval('#s-public option', os => os.map(o => o.textContent));
ok(publicOpts.length === 1 && publicOpts[0] === 'The Open', 'send: public list shows open competitions only', publicOpts.join());
await page.click('#s-send-public');
await page.waitForFunction(() => window.__sent.length === 2);
sent = await page.evaluate(() => window.__sent);
ok(sent[1].code === 'OPEN1', 'send: to the public competition');
ok(/See the competition/.test(await page.$eval('#s-msg', e => e.textContent)), 'send: links to the competition');

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

// Competitions page. "Sneaky" (the AI route) was the last strategy tested on this device.
await page.goto(BASE + 'compete.html', { waitUntil: 'networkidle0' });
await page.waitForSelector('.comp-item');
ok(await page.$$eval('.comp-item', els => els.length) === 2, 'compete: lists public competitions');
ok(/Official standings: top 10/.test(await page.$eval('#c-standings', e => e.textContent)), 'compete: shows official standings');
await page.click('#run-all');
await page.waitForSelector('#results:not(.hidden)');
ok(await page.$$eval('[data-pane="board"] tbody tr', r => r.length) === 10, 'compete: everyone runs');
await page.select('#y-source', 'last');
ok(/Sneaky/.test(await page.$eval('#y-status', e => e.textContent)), 'compete: picks up the last tested strategy');
await page.click('#run-top');
await page.waitForFunction(() => /You came/.test(document.querySelector('#progress-text').textContent));
ok(await page.$$eval('[data-pane="board"] tbody tr', r => r.length) === 11, 'compete: you against the top (10 here)');
ok(await page.$$eval('tr.mine', r => r.length) === 1, 'compete: your row picked out');
await page.select('#s-size', '10');
await page.$eval('#s-seed', e => { e.value = 'abc'; });
await page.click('#run-sample');
await page.waitForFunction(() => /sample "abc"/.test(document.querySelector('#results-title').textContent));
const first = await page.$$eval('[data-pane="board"] tbody tr td:nth-child(2)', t => t.map(x => x.textContent).sort().join());
await page.click('#run-sample');
await page.waitForFunction(() => !document.querySelector('#run-all').disabled);
const again = await page.$$eval('[data-pane="board"] tbody tr td:nth-child(2)', t => t.map(x => x.textContent).sort().join());
ok(first === again, 'compete: the same sample seed picks the same sample');
if (SHOTS) await page.screenshot({ path: SHOTS + '/compete.png', fullPage: true });

// Teacher page loads to its sign-in
await page.goto(BASE + 'teacher.html', { waitUntil: 'networkidle0' });
await page.waitForSelector('#signed-out:not(.hidden)', { timeout: 8000 }).catch(() => {});
ok(await page.$eval('#signed-out', e => !e.classList.contains('hidden')), 'teacher: shows sign in');

ok(errors.length === 0, 'no page errors', errors.join('\n'));
await browser.close();
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
