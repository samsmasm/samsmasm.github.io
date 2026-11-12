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

async function play(slug, guessFn, descIndex, checks, tryBtn, theme) {
  await page.goto(`${BASE}${slug}/?speed=25`, { waitUntil: 'networkidle0' });
  if (theme) await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
  const tag = `${slug}${theme ? '-' + theme : ''}`;
  await shot(`${tag}-0-riddle`);
  await page.click('[data-go="1"]');
  ok(await page.$eval('#go-watch', b => b.disabled), `${tag}: lock disabled before a guess`);
  await guessFn();
  ok(!(await page.$eval('#go-watch', b => b.disabled)), `${tag}: lock enabled after a guess`);
  await shot(`${tag}-1-guess`);
  await page.click('#go-watch');
  await page.waitForFunction(() => !document.getElementById('go-describe').disabled, { timeout: 20000 });
  ok(true, `${tag}: watch finished`);
  await shot(`${tag}-2-watch`);
  await page.click('#go-describe');
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

// Simpson
await play('simpson', async () => {
  await page.click('#guess-opts .opt[data-i="0"]');
}, 1, async (tag) => {
  ok(/You saidA/.test(await text('#cmp')) && /AnswerB/.test(await text('#cmp')), `${tag}: compare`, await text('#cmp'));
}, '#try');
ok(/A 78%.*B 83%.*winner: B/.test(await text('#live')), 'simpson: real mix gives B', await text('#live'));
await page.click('#v-fair');
ok(/winner: A/.test(await text('#live')), 'simpson: same mix gives A', await text('#live'));
await page.click('#v-all');
await shot('simpson-6-combined');

// Dark theme pass on two riddles, desktop width
await page.setViewport({ width: 1280, height: 900 });
await play('positive', async () => { await page.type('#guess-host .numin', '80'); }, 0, async () => {}, '#try-nums', 'dark');
await play('simpson', async () => { await page.click('#guess-opts .opt[data-i="1"]'); }, 1, async () => {}, '#try', 'dark');

// Front page shows progress
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.goto(BASE, { waitUntil: 'networkidle0' });
const statuses = await page.$$eval('a.row .status', s => s.map(x => x.textContent));
ok(statuses.every(s => /Done/.test(s)), 'front page: all four marked done', statuses.join(','));
await shot('index');
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
await shot('index-dark');

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
