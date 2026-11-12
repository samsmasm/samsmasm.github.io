// Plays every riddle start to finish in headless Chrome. Run through test/run.sh.
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
page.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(m.text()); });

const shot = async (name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }); };
const text = (sel) => page.$eval(sel, e => e.textContent);
const visible = (sel) => page.$eval(sel, e => !e.closest('[hidden]'));

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function play(slug, guessFn, descIndex, checks, tryBtn, watchFn) {
  await page.goto(`${BASE}${slug}/?speed=25`, { waitUntil: 'networkidle0' });
  const tag = slug;
  await shot(`${tag}-0-riddle`);
  await page.click('[data-go="1"]');
  ok(await page.$eval('#go-watch', b => b.disabled), `${tag}: lock disabled before a guess`);
  await guessFn();
  ok(!(await page.$eval('#go-watch', b => b.disabled)), `${tag}: lock enabled after a guess`);
  await shot(`${tag}-1-guess`);
  await page.click('#go-watch');
  if (watchFn) await watchFn(tag);
  await page.waitForFunction(() => { const b = document.getElementById('go-describe'); return !b.disabled && !b.hidden; }, { timeout: 20000 });
  ok(true, `${tag}: watch finished`);
  await shot(`${tag}-2-watch`);
  await page.click('#go-describe');
  ok(await page.$eval('#viz', e => !!e.closest('#s3')), `${tag}: the visual sits in the describe step`);
  await shot(`${tag}-3-describe`);
  await page.click(`#desc-opts .opt[data-i="${descIndex}"]`);
  await page.click('#go-answer');
  await shot(`${tag}-4-answer`);
  await checks(tag);
  await page.click(tryBtn);
  ok(await visible('#explore'), `${tag}: free play opens`);
  await shot(`${tag}-5-play`);
}

await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.goto(BASE, { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());

// Positive test: type 50
await play('positive', async () => {
  await page.type('#guess-host .numin', '50');
}, 3, async (tag) => {
  ok((await text('#ans-big')) === '9.0%', `${tag}: answer 9.0%`, await text('#ans-big'));
  ok(/You: 50%/.test(await text('#scale')), `${tag}: scale shows guess`, await text('#scale'));
  ok(/matches the dots: 100 violet, 10 red/.test(await text('#seen')), `${tag}: seen box`, await text('#seen'));
}, '#try-nums');
await page.click('.presets button[data-p="0.1"]');
await new Promise(r => setTimeout(r, 100));
ok((await text('#live-res')) === '92%', 'positive: common disease preset 92%', await text('#live-res'));

// Monty Hall
await play('montyhall', async () => {
  await page.click('#guess-opts .opt[data-i="2"]');
}, 1, async (tag) => {
  const seen = await text('#seen');
  const m = seen.match(/stayer won (\d+) cars\. The switcher won (\d+)/);
  ok(m && +m[1] + +m[2] === 100 && +m[2] > +m[1], `${tag}: tallies add to 100, switcher ahead`, seen);
  ok(/No difference/.test(await text('#cmp')), `${tag}: compare shows guess`);
  ok(/You won \d+ of the 10 rounds you played/.test(seen), `${tag}: own record in seen box`, seen);
}, '#try-100', async (tag) => {
  // play a round by hand: pick a door, then stay or switch
  async function round(k) {
    await page.waitForSelector('#w-doors button.door:not(:disabled)', { timeout: 5000 });
    await page.click(`#w-doors button.door:nth-child(${(k % 3) + 1})`);
    ok(await page.$$eval('#w-doors .door.open', d => d.length) === 1, `${tag}: round ${k + 1} host opens one door`);
    await page.click(k % 2 ? '#w-switch' : '#w-stay');
  }
  for (let k = 0; k < 6; k++) await round(k);
  await page.waitForFunction(() => !document.getElementById('w-ask').hidden, { timeout: 5000 });
  ok(/automatically play the rest/.test(await text('#caption')), `${tag}: asks after 6 rounds`);
  await shot(`${tag}-2a-ask`);
  await page.click('#w-no');
  for (let k = 6; k < 10; k++) await round(k);
  await page.waitForFunction(() => !document.getElementById('w-ask').hidden, { timeout: 5000 });
  ok(/10 rounds played/.test(await text('#w-round')), `${tag}: asks again after 4 more`, await text('#w-round'));
  await page.click('#w-yes');
}, '#try-100');
ok(await page.$$eval('#p-doors .door', d => d.length) === 100, 'montyhall: 100 doors in play');
await page.click('#p-doors .door:nth-child(5)');
ok(await page.$$eval('#p-doors .door.open', d => d.length) === 98, 'montyhall: host opens 98');
await page.click('#p-switch');
ok(/1 of 1 won|0 of 1 won/.test(await text('#r-switch')), 'montyhall: switch recorded', await text('#r-switch'));
await shot('montyhall-6-100doors');

// Birthday: slider-free typed guess 183
await play('birthday', async () => {
  await page.type('#guess-host .numin', '183');
}, 1, async (tag) => {
  ok(/You: 183/.test(await text('#scale')) && /Answer: 23/.test(await text('#scale')), `${tag}: scale`, await text('#scale'));
  ok(/With 23 people, [\d,]+ of the 2,000 rooms/.test(await text('#seen')), `${tag}: seen box`, await text('#seen'));
}, '#try');
ok((await text('#live')) === '51%', 'birthday: 23 people is 51%', await text('#live'));
await page.click('#hundred');
ok(/Rooms made: 10[01]/.test(await text('#ptally')), 'birthday: 100 rooms made', await text('#ptally'));
const rd = await page.$$eval('#roomdots span', s => [s.length, s.filter(x => x.classList.contains('m')).length, s.filter(x => x.classList.contains('last')).length]);
ok(rd[0] >= 100 && rd[1] > 30 && rd[1] < 75 && rd[2] === 1, 'birthday: a dot per room, about half orange, one ringed', rd.join(','));
await shot('birthday-6-rooms');

// Simpson
await play('simpson', async () => {
  await page.click('#guess-opts .opt[data-i="0"]');
}, 1, async (tag) => {
  ok(/You saidA/.test(await text('#cmp')) && /AnswerB/.test(await text('#cmp')), `${tag}: compare`, await text('#cmp'));
}, '#try', async (tag) => {
  ok(await page.$eval('#go-describe', b => b.hidden), `${tag}: describe hidden until the last step`);
  ok(await page.$eval('#w-back', b => b.disabled), `${tag}: back disabled on step 1`);
  for (let k = 0; k < 3; k++) {
    await page.click('#w-next');
    await sleep(150);
    await shot(`${tag}-2-step${k + 2}`);
  }
  ok(/Step 4 of 4/.test(await text('#w-step')), `${tag}: reached step 4`);
  await page.click('#w-back'); await sleep(150);
  ok(/Step 3 of 4/.test(await text('#w-step')), `${tag}: back works`);
  await page.click('#w-next'); await sleep(150);
});
ok(/A 78%.*B 83%.*winner: B/.test(await text('#live')), 'simpson: real mix gives B', await text('#live'));
await page.click('#v-fair');
ok(/winner: A/.test(await text('#live')), 'simpson: same mix gives A', await text('#live'));
await page.click('#v-all');
await shot('simpson-6-combined');

// Desktop width pass, and light even when the system asks for dark
await page.setViewport({ width: 1280, height: 900 });
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
await play('positive', async () => { await page.type('#guess-host .numin', '80'); }, 0, async () => {}, '#try-nums');
ok(await page.evaluate(() => getComputedStyle(document.body).backgroundColor) === 'rgb(247, 246, 242)', 'paper background under system dark mode');
await page.emulateMediaFeatures([]);

// Front page shows progress
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.goto(BASE, { waitUntil: 'networkidle0' });
const statuses = await page.$$eval('a.row .status', s => s.map(x => x.textContent));
ok(statuses.every(s => /Done/.test(s)), 'front page: all four marked done', statuses.join(','));
await shot('index');

// No horizontal scroll at phone width on any page
for (const p of ['', 'positive/', 'montyhall/', 'birthday/', 'simpson/']) {
  await page.goto(BASE + p, { waitUntil: 'networkidle0' });
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(over <= 0, `no sideways scroll: /${p}`, over);
}

ok(errors.length === 0, 'no page errors', errors.join(' | '));
await browser.close();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
