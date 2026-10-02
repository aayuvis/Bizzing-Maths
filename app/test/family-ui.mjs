/* test/family-ui.mjs — the family standard's browser checks (§15), on the BUILT
   app at its GitHub Pages sub-path, desktop and phone:
     back stays in the app · ONE primary button on Home, Continue, above the fold
     at 390×844 · ≤ 6 ways in · the top bar in the family order · the child
     switcher with two children, data never mixed · PIN on grown-ups · no
     third-party requests · no overflow at 390 measured against the device width ·
     the Hive's activity feed written (minutes and a milestone) · coins only from
     standard events and never a rank · #/continue and ?from=hive · ?demo labelled
     and touching nothing real · a medal celebrated exactly once.
   Every assertion here was watched to fail once (see the commit that added it). */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, symlinkSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');

const HERE = resolve(import.meta.dirname, '..');
const SHOTS = process.env.SHOTS || resolve(HERE, '.shots');
const SITE = resolve(HERE, '.site-fam');
rmSync(SITE, { recursive: true, force: true }); mkdirSync(SITE, { recursive: true }); mkdirSync(SHOTS, { recursive: true });
symlinkSync(resolve(HERE, 'build'), resolve(SITE, 'Bizzing-Maths'));
const port = 8000 + Math.floor(Math.random() * 900);
const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: SITE, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const BASE = `http://127.0.0.1:${port}/Bizzing-Maths/`;

let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('  ✗ ' + m); } else if (process.env.V) console.log('  ✓ ' + m); };
const browser = await chromium.launch({ executablePath: existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined });
const errors = [], foreign = [];

/* a household of two, written the way the app writes it, so the walk starts on Home */
function household() {
  const kid = (id, name, band, avatar) => ({ id, name, band, avatar, xp: 0, facts: {}, tricks: {}, checks: {}, games: {}, contest: { best: null, runs: 0, wins: 0 }, stories: {}, puzzles: {}, quest: {}, lib: {},
    journey: { level: 1, done: {}, finished: [], tested: null }, medals: {}, shop: { owned: [], worn: {} }, placed: null, daily: {}, days: {}, created: Date.now(), prefs: { op: '×', timer: false, read: false } });
  return { v: 6, kids: [kid('ka', 'Ahana', '8-10', 'hexbee'), kid('kb', 'Kabir', '6-7', 'rocket')], active: 'ka', parent: { pin: '1234', tester: false } };
}

async function page(vp, tag, { seed = true, clock = false } = {}) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: vp.width < 500, hasTouch: vp.width < 500 });
  const p = await ctx.newPage();
  if (clock) await p.clock.install();
  p.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  p.on('request', (r) => { const u = new URL(r.url()); if (!['127.0.0.1', 'localhost'].includes(u.hostname) && u.protocol.startsWith('http')) foreign.push(`${tag}: ${r.url()}`); });
  if (seed) await p.addInitScript((h) => { try { if (!localStorage.getItem('bzm_household')) localStorage.setItem('bzm_household', JSON.stringify(h)); } catch {} }, household());
  return { p, ctx, shot: (n) => p.screenshot({ path: `${SHOTS}/fam-${tag}-${n}.png` }) };
}
const state = (p) => p.evaluate(() => { const r = window.__bzm.R; return { nav: r.ui.nav, arg: r.ui.arg, active: r.h.active, hash: location.hash }; });

for (const [vp, tag] of [[{ width: 1280, height: 800 }, 'desk'], [{ width: 390, height: 844 }, 'phone']]) {
  const { p, ctx, shot } = await page(vp, tag);
  await p.goto(BASE); await p.waitForSelector('.home2');
  await shot('home');

  // Home anatomy: one filled primary, and it is Continue; ≤ 6 ways in; Continue above the fold
  const prim = await p.$$eval('main .btn.primary', (bs) => bs.filter((b) => b.offsetParent).map((b) => b.closest('#continue') ? 'continue' : b.textContent.trim()));
  ok(prim.length === 1 && prim[0] === 'continue', `${tag}: Home has ONE primary button and it is Continue (got ${JSON.stringify(prim)})`);
  const tiles = await p.locator('.h-r3 > *').count();
  ok(tiles >= 1 && tiles <= 6, `${tag}: at most six ways in (got ${tiles})`);
  ok(await p.locator('.h-three > *').count() === 3, `${tag}: Today's three is three`);
  const cb = await p.$eval('#continue .btn.primary', (b) => b.getBoundingClientRect().bottom);
  ok(cb <= vp.height, `${tag}: Continue is above the fold (bottom ${Math.round(cb)} of ${vp.height})`);
  ok(await p.$eval('.home2', (h) => !h.querySelector('.nod2') || h.querySelector('.nod2').getBoundingClientRect().top >= document.querySelector('#continue').getBoundingClientRect().bottom), `${tag}: the number of the day sits below Continue`);
  ok(await p.$eval('.hcard', (c) => getComputedStyle(c, '::before').content) === 'none', `${tag}: no decorative "+" badges on the cards`);

  // the family top bar: ⬡ · name · … · theme · 🔒 · avatar ▾, 56px
  const order = await p.$$eval('header.top > *, header.top .tools > *', (els) => els.filter((e) => e.offsetParent && !e.classList.contains('tools') && !e.classList.contains('tabs')).map((e) => e.classList.contains('hive') ? 'hive' : e.classList.contains('brand') ? 'name' : e.dataset.act === 'themes' ? 'theme' : e.dataset.arg === 'grownups' ? 'grownups' : e.classList.contains('who') ? 'avatar' : e.className));
  ok(order.join() === 'hive,name,theme,grownups,avatar', `${tag}: top bar in the family order (got ${order})`);
  ok(Math.round(await p.$eval('header.top', (h) => h.getBoundingClientRect().height)) === 56, `${tag}: top bar is 56px`);
  ok(await p.$eval('header .hive', (a) => a.href) === 'https://aayuvis.github.io/Bizzing_Schedule/', `${tag}: ⬡ goes back to the Hive`);

  // no overflow at the device width (Chromium widens innerWidth under emulation: measure against the viewport we set)
  ok(await p.evaluate(() => document.documentElement.scrollWidth) <= vp.width, `${tag}: no sideways scroll on Home`);

  // the switcher: two children, one tap, nothing mixed
  await p.click('header .who'); await p.waitForSelector('.sheet'); await p.waitForTimeout(300);
  await shot('sheet');
  ok(await p.locator('.sheet .sk[data-act=switchKid]').count() === 2, `${tag}: the sheet lists both children`);
  await p.evaluate(() => { const k = window.__bzm.R.h.kids[0]; k.xp = 37; k.tricks.zz = { stars: 2 }; });
  await p.click('.sheet .sk[data-arg=kb]'); await p.waitForSelector('.home2');
  const sw = await p.evaluate(() => { const R = window.__bzm.R, b = R.h.kids.find((k) => k.id === R.h.active); return { active: R.h.active, xp: b.xp, tricks: Object.keys(b.tricks).length, name: document.querySelector('.hname').textContent }; });
  ok(sw.active === 'kb' && sw.xp === 0 && sw.tricks === 0 && sw.name === 'Kabir', `${tag}: switching shows the other child's own record (got ${JSON.stringify(sw)})`);
  ok(await p.locator('.sheet').count() === 0, `${tag}: the sheet closes after switching`);
  await p.click('header .who'); await p.click('.sheet .sk[data-arg=ka]'); await p.waitForSelector('.home2');

  // back stays in the app
  await p.click(vp.width < 760 ? '.tb[data-arg=library]' : '.tab[data-arg=library]'); await p.waitForTimeout(150);
  await p.click(vp.width < 760 ? '.tb[data-arg=puzzles]' : '.tab[data-arg=puzzles]'); await p.waitForTimeout(150);
  await p.goBack(); await p.waitForTimeout(250);
  ok((await state(p)).nav === 'library' && p.url().startsWith(BASE), `${tag}: back returns to the previous screen inside the app`);
  await p.goBack(); await p.waitForTimeout(250);
  ok((await state(p)).nav === 'home' && p.url().startsWith(BASE), `${tag}: back walks screen by screen to Home, inside the app (at ${p.url()})`);

  // PIN on grown-ups
  await p.goto(BASE + '#/grownups'); await p.waitForTimeout(200);
  ok(await p.locator('.pin-dots').count() === 1 && await p.locator('.report').count() === 0, `${tag}: grown-ups asks for the PIN first`);
  for (const ch of '1234') await p.keyboard.press(ch);
  await p.waitForSelector('.rc'); await shot('report');
  const rc = await p.$$eval('.rc', (cs) => cs.map((c) => [...c.querySelectorAll('.rc-cell .kicker')].map((x) => x.textContent).join()));
  ok(rc.length === 2 && rc.every((x) => x === 'Time,Progress,Mastery'), `${tag}: a report card per child in Time · Progress · Mastery (got ${JSON.stringify(rc)})`);
  ok(await p.locator('.rc').first().locator('.rc-st').count() >= 6, `${tag}: the report card charts every strand`);
  await ctx.close();
}

/* the Hive's feed: active minutes and a milestone, per child; coins only from standard events */
{
  const { p, ctx } = await page({ width: 1280, height: 800 }, 'feed', { clock: true });
  await p.goto(BASE); await p.waitForSelector('.home2');
  for (let i = 0; i < 6; i++) { await p.keyboard.press('Shift'); await p.clock.runFor(16000); }
  const feed = await p.evaluate(() => JSON.parse(localStorage.getItem('bizzing.activity') || '{"s":[]}').s);
  ok(feed.some((x) => x.a === 'maths' && x.who === 'Ahana' && x.m >= 1), `active minutes reach bizzing.activity for the right child (got ${JSON.stringify(feed)})`);
  // pass a stop's drill by its own answers: a milestone and coins
  await p.evaluate(() => { const { fire } = window.__bzm; fire('openStop', window.__bzm.J.progress(window.__bzm.R.h.kids[0]).next.stop); });
  await p.evaluate(() => window.__bzm.fire('startDrill', window.__bzm.R.ui.arg));
  for (let i = 0; i < 12; i++) {
    const q = await p.evaluate(() => { const r = window.__bzm.R.run; return r && !r.over && r.items[r.i]; });
    if (!q) break;
    if (q.choices) await p.evaluate((a) => window.__bzm.fire('choose', a), q.ans); else for (const ch of String(q.ans)) await p.keyboard.press(ch === '−' ? '-' : ch);
    await p.clock.runFor(900);
  }
  await p.clock.runFor(1500);
  const after = await p.evaluate(() => ({ s: JSON.parse(localStorage.getItem('bizzing.activity')).s, w: JSON.parse(localStorage.getItem('bizzing.wallet') || 'null'), xp: window.__bzm.R.h.kids[0].xp }));
  ok(after.s.some((x) => x.a === 'maths' && x.ev === 'stop' && x.who === 'Ahana'), 'passing a stop writes a stop milestone');
  const led = after.w && after.w.kids.ahana ? after.w.kids.ahana.ledger : [];
  ok(led.length > 0 && led.every((x) => x.a === 'maths' && { answer: 1, stop: 5, contest: 10, mastery: 20 }[x.why] === x.n), `coins only from standard events at standard amounts (got ${JSON.stringify(led.slice(0, 4))}…)`);
  ok(led.some((x) => x.why === 'stop'), 'the first pass of a stop pays the stop amount');
  // medal: First star, celebrated once
  ok(await p.locator('.cel').count() === 1 && /First star/.test(await p.textContent('.cel')), 'the first stop passed is celebrated with its medal');
  await p.clock.runFor(1200); await p.screenshot({ path: `${SHOTS}/fam-ceremony.png` });
  // close the tab on the ceremony: it comes back next visit, until it is tapped
  await p.clock.runFor(500); await p.reload(); await p.waitForSelector('.home2');
  ok(await p.locator('.cel').count() === 1, 'a medal whose ceremony was never tapped is celebrated on the next visit');
  await p.click('.cel .btn'); await p.clock.runFor(500);
  await p.evaluate(() => window.__bzm.go('home')); await p.reload(); await p.waitForSelector('.home2');
  ok(await p.locator('.cel').count() === 0, 'a medal is celebrated once, not again on the next visit');
  await ctx.close();
}

/* first-load weight (standard §11, audit N2): the phone's first screen ≤ 1.5 MB
   transferred, initial JavaScript ≤ 400 KB gzipped. GitHub Pages gzips text, the
   test server does not — so text is measured gzipped, images as they are. */
{
  const { p, ctx } = await page({ width: 390, height: 844 }, 'weight');
  const got = [];
  p.on('response', async (r) => { try { const b = await r.body(); const t = r.headers()['content-type'] || ''; got.push({ u: r.url(), n: /javascript|css|html|json|svg/.test(t) ? gzipSync(b).length : b.length, js: /javascript/.test(t) }); } catch {} });
  await p.goto(BASE); await p.waitForSelector('.home2'); await p.waitForLoadState('networkidle');
  const total = got.reduce((a, x) => a + x.n, 0), js = got.filter((x) => x.js).reduce((a, x) => a + x.n, 0);
  ok(total <= 1.5 * 1024 * 1024, `first screen on a phone is ≤ 1.5 MB (got ${(total / 1048576).toFixed(2)} MB: ${got.sort((a, b) => b.n - a.n).slice(0, 4).map((x) => x.u.split('/').pop() + ' ' + Math.round(x.n / 1024) + 'K').join(', ')})`);
  ok(js <= 400 * 1024, `initial JavaScript is ≤ 400 KB gzipped (got ${Math.round(js / 1024)} KB)`);
  ok(!got.some((x) => /\/(shapes|formulas|dictionary|vedic|chinese)-/.test(x.u)), 'no Library tool is downloaded for Home');
  await ctx.close();
}

/* #/continue and ?from=hive */
{
  const { p, ctx } = await page({ width: 1280, height: 800 }, 'hive');
  await p.goto(BASE + '?from=hive#/continue'); await p.waitForTimeout(400);
  const s = await state(p);
  ok(s.nav === 'stop' && s.arg, `#/continue opens the Continue card's station (got ${JSON.stringify(s)})`);
  ok(await p.locator('.hive-chip').count() === 1 && await p.$eval('.hive-chip', (a) => a.href) === 'https://aayuvis.github.io/Bizzing_Schedule/', '?from=hive shows "back to my day"');
  await ctx.close();
}

/* ?demo: a labelled sample, nothing real touched */
{
  const { p, ctx, shot } = await page({ width: 390, height: 844 }, 'demo');
  await p.goto(BASE); await p.waitForSelector('.home2');
  const real = await p.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)]))));
  await p.goto(BASE + '?demo'); await p.waitForSelector('.home2');
  await shot('home');
  ok(/Sample/.test(await p.textContent('.demo-bar')) && /Asha/.test(await p.textContent('.hname')), '?demo opens a labelled sample child');
  ok(await p.evaluate(() => Object.keys(window.__bzm.R.h.kids[0].days).length) >= 6, 'the sample has weeks of progress');
  await p.click('#continue .btn.primary'); await p.waitForTimeout(200);
  // things that save at once in a real household: a new face, the sound switch
  await p.evaluate(() => { window.__bzm.fire('setAv', 'rocket'); window.__bzm.fire('sound'); }); await p.waitForTimeout(400);
  for (let i = 0; i < 6; i++) { await p.keyboard.press('Shift'); await p.waitForTimeout(30); }
  const after = await p.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)]))));
  ok(after === real, 'the sample never touches the real household, prefs, wallet or feed');
  await p.goto(BASE + '?demo=try'); await p.waitForTimeout(400);
  ok((await state(p)).nav === 'stop' && /Trying a trick/.test(await p.textContent('.demo-bar')), '?demo=try opens one stop to try, labelled');
  await ctx.close();
}

/* a first visit offers the taster */
{
  const { p, ctx } = await page({ width: 390, height: 844 }, 'first', { seed: false });
  await p.goto(BASE); await p.waitForSelector('.ob-land');
  ok(await p.locator('.ob-land a[href="./?demo=try"]').count() === 1, 'the landing offers "Try a trick first"');
  await ctx.close();
}

ok(!foreign.length, 'no third-party requests: ' + foreign.slice(0, 3).join(' | '));
ok(!errors.length, 'no page errors: ' + errors.slice(0, 5).join(' | '));
await browser.close(); srv.kill(); rmSync(SITE, { recursive: true, force: true });
console.log(`${fails ? 'FAIL' : 'ok'} family-ui — top bar, Home anatomy, switcher, back, PIN, Hive feed, coins, medals, demo`);
if (fails) process.exit(1);
