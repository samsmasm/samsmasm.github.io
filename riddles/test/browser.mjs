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

// feedback posts are caught here and never reach the real inbox
const sentFeedback = [];
await page.setRequestInterception(true);
page.on('request', req => {
  if (req.url().startsWith('https://unisam.nz/feedback/api/')) {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
    if (req.method() === 'POST') sentFeedback.push(JSON.parse(req.postData() || '{}'));
    req.respond({ status: 200, contentType: 'application/json', body: '{"ok":true}', headers: cors });
  } else req.continue();
});

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
  const note = await page.$eval('#s3 .randnote', e => e.textContent).catch(() => '');
  ok(/^(Truly random|Exactly as expected|Real data)/.test(note), `${tag}: says whether the numbers are random, exact or real`, note);
  await shot(`${tag}-3-describe`);
  await page.click(`#desc-opts .opt[data-i="${descIndex}"]`);
  await page.click('#go-answer');
  await shot(`${tag}-4-answer`);
  const qs = await page.evaluate(() => [document.querySelector('#s0 .question').textContent, (document.querySelector('#s4 .recall p') || {}).textContent]);
  ok(qs[0] === qs[1], `${tag}: the answer repeats the question`, qs.join(' | '));
  const calc = await page.$eval('#s4', e => e.textContent);
  ok(!/P\(|\bsens\b|\bspec\b|\bprev\b|HHH/.test(calc), `${tag}: no shorthand in the answer`, (calc.match(/P\(|\bsens\b|\bspec\b|\bprev\b|HHH/) || [''])[0]);
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
  const m = seen.match(/Staying won (\d+) of 50 games\. Switching won (\d+) of 50/);
  ok(m && +m[2] > +m[1], `${tag}: switching won more of its 50`, seen);
  ok(/No difference/.test(await text('#cmp')), `${tag}: compare shows guess`);
  ok(/Stayed: won \d+ of 50/.test(await text('#rates')), `${tag}: win-rate bars`, await text('#rates'));
}, '#try-100', async (tag) => {
  // one game by hand: pick a door, then click a door to stay (your door) or switch (the other closed door)
  let stays = 0, switches = 0;
  async function game(k) {
    await page.waitForSelector('#w-doors button.door:not(:disabled)', { timeout: 5000 });
    await page.click(`#w-doors button.door:nth-child(${(k % 3) + 1})`);
    ok(await page.$$eval('#w-doors .door.open', d => d.length) === 1, `${tag}: game ${k + 1} host opens one door`);
    const sw = k % 2 === 1;
    await page.evaluate((cls) => document.querySelector('#w-doors .tag.' + cls).closest('button').click(), sw ? 'w' : 's');
    if (sw) switches++; else stays++;
  }
  for (let k = 0; k < 6; k++) await game(k);
  await page.waitForFunction(() => !document.getElementById('w-ask').hidden, { timeout: 5000 });
  ok(/automatically play the rest/.test(await text('#caption')), `${tag}: asks after 6 games`);
  const rows = await page.evaluate(() => ['#t-stay', '#t-switch'].map(s => document.querySelectorAll(s + ' span.won, ' + s + ' span.lost').length));
  ok(rows[0] === stays && rows[1] === switches, `${tag}: each game lands in the row for the choice`, rows.join(','));
  await shot(`${tag}-2a-ask`);
  await page.click('#w-no');
  for (let k = 6; k < 10; k++) await game(k);
  await page.waitForFunction(() => !document.getElementById('w-ask').hidden, { timeout: 5000 });
  ok(/10 games played/.test(await text('#w-round')), `${tag}: asks again after 4 more`, await text('#w-round'));
  await page.click('#w-yes');
  // the Stayed row fills completely before any automatic Switched game
  await page.waitForFunction(() => /Switched games/.test(document.getElementById('caption').textContent), { timeout: 10000 });
  const mid = await page.evaluate(() => ['#t-stay', '#t-switch'].map(s => document.querySelectorAll(s + ' span.won, ' + s + ' span.lost').length));
  ok(mid[0] === 50 && mid[1] < 50, `${tag}: autoplay fills Stayed first`, mid.join(','));
  await page.waitForFunction(() => !document.getElementById('go-describe').disabled, { timeout: 20000 });
  ok(await page.$$eval('#t-stay span.lost', s => s.length) > 15, `${tag}: goats shown as rings in the Stayed row`);
}, '#try-100');
ok(await page.$$eval('#p-doors .door', d => d.length) === 100, 'montyhall: 100 doors in play');
await page.click('#p-doors .door:nth-child(5)');
ok(await page.$$eval('#p-doors .door.open', d => d.length) === 98, 'montyhall: host opens 98');
await page.evaluate(() => [...document.querySelectorAll('#p-doors button.door:not(:disabled)')].find(b => !b.classList.contains('pick')).click());
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

// Click-through riddles: press Next until "What did you see?" shows
const walkThrough = (n) => async (tag) => {
  ok(await page.$eval('#w-back', b => b.disabled), `${tag}: back disabled on step 1`);
  for (let k = 0; k < n - 1; k++) { await page.click('#w-next'); await sleep(150); await shot(`${tag}-2-step${k + 2}`); }
  ok(new RegExp(`Step ${n} of ${n}`).test(await text('#w-step')), `${tag}: reached the last step`);
};

// Due a tails
await play('streak', async () => { await page.type('#guess-host .numin', '30'); }, 2, async (tag) => {
  ok(/You: 30%/.test(await text('#scale')) && /Answer: 50%/.test(await text('#scale')), `${tag}: scale`, await text('#scale'));
  const m = (await text('#seen')).match(/Of (\d+) people with five heads, (\d+) flipped heads next and (\d+)/);
  ok(m && +m[2] + +m[3] === +m[1] && +m[1] > 250 && +m[1] < 380, `${tag}: about 312 streaks, heads plus tails add up`, await text('#seen'));
}, '#try');
await page.$eval('#len', e => { e.value = 1; e.dispatchEvent(new Event('input')); });
ok(/started with 1 heads/.test(await text('#plive')), 'streak: free play streak of 1', await text('#plive'));

// Falling balls
await play('galton', async () => { await page.click('#guess-opts .opt[data-i="0"]'); }, 1, async (tag) => {
  ok(/Flat/.test(await text('#cmp')) && /hump/.test(await text('#cmp')), `${tag}: compare`, await text('#cmp'));
  const m = (await text('#seen')).match(/middle bin got (\d+) balls\. The two end bins got (\d+) and (\d+)/);
  ok(m && +m[1] > 180 && +m[2] < 10 && +m[3] < 10, `${tag}: bell shape counts`, await text('#seen'));
}, '#try');
await page.$eval('#lean', e => { e.value = 80; e.dispatchEvent(new Event('input')); });
await shot('galton-6-lean');

// The DNA match
await play('dna', async () => { await page.type('#guess-host .numin', '0.0001'); }, 2, async (tag) => {
  ok(/Answer: 91%/.test(await text('#scale')), `${tag}: answer 91%`, await text('#scale'));
}, '#try', walkThrough(4));
ok((await text('#live-p')) === '91%', 'dna: riddle numbers give 91%', await text('#live-p'));
await page.click('.presets button[data-pop="3"]');
ok((await text('#live-p')) === '0.10%', 'dna: town of 1,000 gives 0.10%', await text('#live-p'));

// Top of the class
await play('regression', async () => { await page.type('#guess-host .numin', '85'); }, 2, async (tag) => {
  const big = +(await text('#ans-big'));
  ok(big > 66 && big < 80, `${tag}: gold stars fall back to about 72`, big);
  ok(/Gold stars went from 8\d to (6\d|7\d)/.test(await text('#seen')), `${tag}: seen box`, await text('#seen'));
}, '#try', walkThrough(4));
await page.$eval('#luck', e => { e.value = 0; e.dispatchEvent(new Event('input')); });
const nl = (await text('#plive')).match(/(\d+) on test 1, (\d+) on test 2/);
ok(nl && Math.abs(+nl[1] - +nl[2]) <= 1, 'regression: no luck, no slipping back', await text('#plive'));
await page.$eval('#luck', e => { e.value = 10; e.dispatchEvent(new Event('input')); });
await runAgain('regression', async () => page.$eval('#play', c => c.toDataURL()));

// "Run again" must give a new run without reloading
async function runAgain(tag, snapshot) {
  const before = await snapshot();
  await page.click('#again');
  await sleep(50);
  const after = await snapshot();
  ok(before !== after, `${tag}: run again gives a new run`);
  ok(/Run 2/.test(await text('#run-n')), `${tag}: run number goes up`, await text('#run-n'));
}

// The fair game
await play('ruin', async () => { await page.type('#guess-host .numin', '50'); }, 2, async (tag) => {
  ok(/Answer: 100%/.test(await text('#scale')), `${tag}: answer 100%`, await text('#scale'));
  ok(/By 20,000: (8[5-9]|9\d|100)\./.test(await text('#seen')), `${tag}: about 94 broke`, await text('#seen'));
}, '#try');
await page.click('[data-r="1000"]');
ok(/after 1,000 rounds: \d+ of 100 broke/.test(await text('#plive')), 'ruin: free play rounds', await text('#plive'));
await page.click('[data-r="100000"]');
await runAgain('ruin', async () => page.$eval('#play', c => c.toDataURL()));

// Infinite money
const playedRuns = [];
await play('stpetersburg', async () => { await page.type('#guess-host .numin', '10'); }, 2, async (tag) => {
  ok(/You said\$10 a game/.test(await text('#cmp')) && /No limit/.test(await text('#cmp')), `${tag}: compare`, await text('#cmp'));
  ok(/^You saw: No: it drifted.*Right\. Your biggest win, \$[\d,]+.*of your 10,000 games paid just \$2/.test(await text('#seen')), `${tag}: seen box describes this run`, await text('#seen'));
  ok(/average win per game/.test(await text('#s4 .recall')), `${tag}: question asks about the average`, await text('#s4 .recall'));
  ok(!/fair price/i.test(await page.evaluate(() => document.body.textContent)), `${tag}: never claims a fair price`);
}, '#try', async (tag) => {
  // flip by hand: keep flipping until heads, five games
  async function game(k) {
    await page.waitForFunction(() => !document.getElementById('w-flip').disabled && !document.getElementById('w-flip-row').hidden, { timeout: 5000 });
    for (let f = 0; f < 60; f++) {
      await page.click('#w-flip');
      if (/^Heads/.test(await text('#caption'))) break;
    }
    ok(new RegExp(`Your games: (\\$[\\d,]+(, )?){${k + 1}}$`).test(await text('#w-mine')), `${tag}: game ${k + 1} recorded`, await text('#w-mine'));
  }
  for (let k = 0; k < 5; k++) await game(k);
  playedRuns.push(await text('#w-mine'));
  await page.waitForFunction(() => !document.getElementById('w-ask').hidden, { timeout: 5000 });
  ok(/5 games played/.test(await text('#w-round')), `${tag}: asks after 5 games`);
  await shot(`${tag}-2a-ask`);
  await page.click('#w-yes');
});
ok((await text('#live')) === '$21', 'stpetersburg: $1 million limit gives $21', await text('#live'));
await page.click('.presets button[data-c="10"]');
ok((await text('#live')) === '$11', 'stpetersburg: $1,000 limit gives $11', await text('#live'));
ok(/average win \$\d/.test(await text('#psim')), 'stpetersburg: free play runs games', await text('#psim'));
ok(await page.$eval('#play', c => c.clientHeight > 100), 'stpetersburg: free play draws a graph');
await shot('stpetersburg-6-limit');
await runAgain('stpetersburg', async () => text('#psim'));

// Two children
await play('twochildren', async () => { await page.type('#guess-host .numin', '50'); }, 1, async (tag) => {
  ok(/Answer: 33.3%/.test(await text('#scale')), `${tag}: answer 33.3%`, await text('#scale'));
  const m = (await text('#seen')).match(/(\d+) of the (\d+) families/);
  ok(m && Math.abs(+m[1] / +m[2] - 1 / 3) < 0.01, `${tag}: one in three`, await text('#seen'));
}, '#try', walkThrough(5));
await page.click('[data-f="2"]');
ok(/= 4\d|= 5\d/.test(await text('#plive')), 'twochildren: older is a boy gives about 50%', await text('#plive'));

// Sleeping Beauty
await play('sleepingbeauty', async () => { await page.type('#guess-host .numin', '50'); }, 2, async (tag) => {
  const sc = await text('#scale');
  ok(/Thirders: 33.3%/.test(sc) && /Halfers: 50%/.test(sc), `${tag}: both answers on the scale`, sc);
  ok(/both are true/.test(await text('#seen')), `${tag}: seen box`, await text('#seen'));
  await page.click('#side-h');
  ok(/thirder would ask you/.test(await text('#against')), `${tag}: picking a side shows the other side`);
}, '#try', walkThrough(4));
await page.$eval('#wakes', e => { e.value = 9; e.dispatchEvent(new Event('input')); });
ok(/1 in 10 = 10%/.test(await text('#pt')), 'sleepingbeauty: nine wakings gives 1 in 10', await text('#pt'));

// Desktop width pass, and light even when the system asks for dark
await page.setViewport({ width: 1280, height: 900 });
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
await play('positive', async () => { await page.type('#guess-host .numin', '80'); }, 0, async () => {}, '#try-nums');
ok(await page.evaluate(() => getComputedStyle(document.body).backgroundColor) === 'rgb(247, 246, 242)', 'paper background under system dark mode');
await page.emulateMediaFeatures([]);

// Front page shows progress
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.goto(BASE, { waitUntil: 'networkidle0' });
const statuses = await page.$$eval('a.item .status', s => s.map(x => x.textContent));
ok(statuses.length === 12 && statuses.every(s => /Done/.test(s)), 'front page: all twelve marked done', statuses.join(','));
ok(await page.$eval('a.item', e => getComputedStyle(e).borderTopStyle === 'none'), 'front page: a plain list on a phone');
await shot('index');
await page.evaluate(() => localStorage.clear());
for (const [wd, name] of [[820, 'tablet'], [1366, 'laptop']]) {
  await page.setViewport({ width: wd, height: 1000 });
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  ok(await page.$eval('a.item', e => getComputedStyle(e).borderTopStyle === 'solid'), `front page: tiles on a ${name}`);
  await shot(`index-${name}`);
}
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

// Feedback form: opens inline, needs words, posts to the shared inbox as app "riddles"
await page.goto(BASE + 'galton/', { waitUntil: 'networkidle0' });
ok(/Found a problem\? Send feedback\./.test(await text('footer')) && !/tell Sam/.test(await text('footer')), 'feedback: footer reads "Found a problem? Send feedback."', await text('footer'));
await page.click('#fb-open');
ok(await visible('#fb'), 'feedback: form opens on the page');
await page.click('#fb-send');
ok(/Write a few words/.test(await text('#fb-msg')), 'feedback: asks for words first');
await page.click('[data-fb="idea"]');
await page.type('#fb-text', 'Test idea from the test suite');
await shot('feedback-form');
await page.click('#fb-send');
await page.waitForFunction(() => /Thanks, sent/.test(document.getElementById('fb-open').textContent), { timeout: 5000 });
const fb = sentFeedback[sentFeedback.length - 1] || {};
ok(fb.app === 'riddles' && fb.type === 'idea' && /Test idea/.test(fb.message) && fb.meta && fb.meta.page === '/riddles/galton/', 'feedback: posts app, type, message and page', JSON.stringify(fb));
ok(!(await page.$('script[src*="goatcounter"], script[src*="gc.zgo.at"]')), 'goatcounter: not loaded when testing locally');
const gcCode = await page.evaluate(() => fetch('/riddles/riddles.js').then(r => r.text()));
ok(/samsmasm\.goatcounter\.com\/count/.test(gcCode), 'goatcounter: wired up for the live site');

// No horizontal scroll at phone width on any page
for (const p of ['', 'positive/', 'montyhall/', 'birthday/', 'simpson/', 'streak/', 'galton/', 'dna/', 'regression/', 'ruin/', 'stpetersburg/', 'twochildren/', 'sleepingbeauty/']) {
  await page.goto(BASE + p, { waitUntil: 'networkidle0' });
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(over <= 0, `no sideways scroll: /${p}`, over);
}

ok(errors.length === 0, 'no page errors', errors.join(' | '));
await browser.close();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
