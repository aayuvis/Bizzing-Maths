/* test/family-ui.mjs — the family standard's browser checks (§15), on the BUILT
   app at its GitHub Pages sub-path, desktop and phone:
     back stays in the app · ONE primary button on Home, Continue, above the fold
     at 390×844 · ≤ 6 ways in · the top bar in the family order · the child
     switcher with two children, data never mixed · PIN on grown-ups · no
     third-party requests · no overflow at 390 measured against the device width ·
     the Hive's activity feed written (minutes and a milestone) · coins only from
     standard events and never a rank · #/continue and ?from=hive · ?demo labelled
     and touching nothing real · a medal celebrated exactly once.
   Every assertion here was watched to fail once (see the commit that added it).
   No fixed sleep gates an assertion (audit v4): each waits for the state it is about
   to check, with a generous timeout, so a loaded machine is slower, not different.
   THROTTLE=4 slows the CPU fourfold to prove it. */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, symlinkSync, rmSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { throttled, served } from './lib/site.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');

const HERE = resolve(import.meta.dirname, '..');
const SHOTS = process.env.SHOTS || resolve(HERE, '.shots');
const port = +(process.env.PORT_BASE || 5200) + 2;
const SITE = resolve(HERE, '.site-fam-' + port);   // per port: two runs at once never share (or delete) a site
rmSync(SITE, { recursive: true, force: true }); mkdirSync(SITE, { recursive: true }); mkdirSync(SHOTS, { recursive: true });
symlinkSync(resolve(HERE, 'build'), resolve(SITE, 'Bizzing-Maths'));
const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: SITE, stdio: 'ignore' });
await served(port);
const BASE = `http://127.0.0.1:${port}/Bizzing-Maths/`;
const FORMULA_ID = (await import('../src/library/formulas.js')).CARDS[0].id, STONE_ID = (await import('../src/library/vedic.js')).JOURNEY[0].id;

let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('  ✗ ' + m); } else if (process.env.V) console.log('  ✓ ' + m); };
const browser = throttled(await chromium.launch({ executablePath: existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined }));
/* wait for the app, never the clock: true once `fn` holds in the page, false if it never does (the assertion then says so) */
const until = async (p, fn, arg, timeout = 30000) => { try { await p.waitForFunction(fn, arg, { timeout, polling: 25 }); return true; } catch { return false; } };
const navIs = (p, nav) => until(p, (n) => !!window.__bzm && window.__bzm.R.ui.nav === n, nav);
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
  p.on('request', (r) => { const u = new URL(r.url()); if (!['127.0.0.1', '127.0.0.2', 'localhost'].includes(u.hostname) && u.protocol.startsWith('http')) foreign.push(`${tag}: ${r.url()}`); });
  if (seed) await p.addInitScript((h) => { try { if (!localStorage.getItem('bzm_household')) localStorage.setItem('bzm_household', JSON.stringify(h)); } catch {} }, household());
  return { p, ctx, shot: (n) => p.screenshot({ path: `${SHOTS}/fam-${tag}-${n}.png` }) };
}
const state = (p) => p.evaluate(() => { const r = window.__bzm.R; return { nav: r.ui.nav, arg: r.ui.arg, active: r.h.active, hash: location.hash }; });

for (const [vp, tag] of [[{ width: 1280, height: 800 }, 'desk'], [{ width: 390, height: 844 }, 'phone']]) {
  const { p, ctx, shot } = await page(vp, tag);
  await p.goto(BASE); await p.waitForSelector('.home2');
  await shot('home');

  // Home is Bee's (the shell's home()): ONE filled primary, and it is Continue, above the fold; the rest is checkShell's
  const prim = await p.$$eval('main .bz-btn:not(.out), main .btn.primary', (bs) => bs.filter((b) => b.offsetParent).map((b) => b.closest('[data-bz=next]') ? 'continue' : b.textContent.trim()));
  ok(prim.length === 1 && prim[0] === 'continue', `${tag}: Home has ONE primary button and it is Continue (got ${JSON.stringify(prim)})`);
  ok(await p.locator('.h-r3, .tile2, .h-three').count() === 0, `${tag}: no extra tiles on Home beyond Bee's three rows`);
  const cb = await p.$eval('[data-bz=continue]', (b) => b.getBoundingClientRect().bottom);
  ok(cb <= vp.height - (vp.width <= 720 ? 68 : 0), `${tag}: Continue is above the fold (bottom ${Math.round(cb)} of ${vp.height})`);
  ok(await p.$eval('[data-bz=hive]', (a) => a.href) === 'https://aayuvis.github.io/Bizzing_Schedule/', `${tag}: ⬡ goes back to the Hive`);
  // no overflow at the device width (Chromium widens innerWidth under emulation: measure against the viewport we set)
  ok(await p.evaluate(() => document.documentElement.scrollWidth) <= vp.width, `${tag}: no sideways scroll on Home`);

  // the switcher: two children, one tap, nothing mixed
  await p.click('[data-bz=kid]'); await p.waitForSelector('.sheet'); await p.waitForSelector('.kid-menu .km-row');
  await until(p, () => document.getAnimations().every((a) => a.playState !== 'running' || a.effect.getTiming().iterations === Infinity), null, 5000);
  await shot('sheet');
  ok(await p.locator('.kid-menu .km-kid[data-act=switchKid]').count() === 2, `${tag}: the menu lists both children`);
  ok(await p.locator('.kid-menu .km-kid.on .km-tick').count() === 1, `${tag}: the child playing has the tick`);
  ok((await p.locator('.kid-menu .km-row').allTextContents()).map((t) => t.trim()).join(' | ') === 'My page — avatar, badges, collection | Settings | + Add a child grown-ups', `${tag}: My page, Settings, + Add a child (grown-ups), in Bee's words and order`);
  await p.evaluate(() => { const k = window.__bzm.R.h.kids[0]; k.xp = 37; k.tricks.zz = { stars: 2 }; });
  await p.click('.kid-menu .km-kid[data-arg=kb]'); await p.waitForSelector('.home2');
  const sw = await p.evaluate(() => { const R = window.__bzm.R, b = R.h.kids.find((k) => k.id === R.h.active); return { active: R.h.active, xp: b.xp, tricks: Object.keys(b.tricks).length, name: document.querySelector('[data-bz=greet] strong').textContent }; });
  ok(sw.active === 'kb' && sw.xp === 0 && sw.tricks === 0 && sw.name === 'Kabir', `${tag}: switching shows the other child's own record (got ${JSON.stringify(sw)})`);
  ok(await p.locator('.sheet').count() === 0, `${tag}: the sheet closes after switching`);
  await p.click('[data-bz=kid]'); await p.click('.kid-menu .km-kid[data-arg=ka]'); await p.waitForSelector('.home2');

  // back stays in the app
  await p.click(vp.width <= 720 ? '[data-bz=tabbar] a[href="#/library"]' : '[data-bz=tab][href="#/library"]'); await navIs(p, 'library');
  await p.click(vp.width <= 720 ? '[data-bz=tabbar] a[href="#/puzzles"]' : '[data-bz=tab][href="#/puzzles"]'); await navIs(p, 'puzzles');
  await p.goBack(); await until(p, () => window.__bzm.R.ui.nav !== 'puzzles');
  ok((await state(p)).nav === 'library' && p.url().startsWith(BASE), `${tag}: back returns to the previous screen inside the app`);
  await p.goBack(); await until(p, () => window.__bzm.R.ui.nav !== 'library');
  ok((await state(p)).nav === 'home' && p.url().startsWith(BASE), `${tag}: back walks screen by screen to Home, inside the app (at ${p.url()})`);

  // PIN on grown-ups
  await p.goto(BASE + '#/grownups'); await p.waitForSelector('.pin-dots, .report');
  ok(await p.locator('.pin-dots').count() === 1 && await p.locator('.report').count() === 0, `${tag}: grown-ups asks for the PIN first`);
  for (const ch of '1234') await p.keyboard.press(ch);
  await p.waitForSelector('.rc'); await shot('report');
  // the PIN is never kept as itself: the seeded plain '1234' was hashed on load, and nothing stores it.
  // A migrated household is written at once (audit v4 Q1), so storage already holds this schema's record.
  await until(p, () => { try { return JSON.parse(localStorage.getItem('bzm_household')).v >= 10; } catch { return false; } });
  const kept = await p.evaluate(() => localStorage.getItem('bzm_household') || '');
  ok(!/"pin"\s*:/.test(kept) && !kept.includes('"1234"') && /"pinHash":"[0-9a-f]{32}\$[0-9a-f]{64}"/.test(kept), `${tag}: the PIN is kept only as a salted hash`);
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
   test server does not — so text is measured gzipped, images as they are.
   Audit v4 R2 took the stops' code off the first screen (vite-light.mjs): 371 KB → 244 KB.
   The budget is held at what that reached plus 5%, so the gain cannot quietly erode;
   raise it only with a reason written here. */
const JS_BUDGET_KB = 257;
{
  const { p, ctx } = await page({ width: 390, height: 844 }, 'weight');
  const got = [];
  p.on('response', async (r) => { try { const b = await r.body(); const t = r.headers()['content-type'] || ''; got.push({ u: r.url(), n: /javascript|css|html|json|svg/.test(t) ? gzipSync(b).length : b.length, js: /javascript/.test(t) }); } catch {} });
  await p.goto(BASE); await p.waitForSelector('.home2'); await p.waitForLoadState('networkidle');
  const total = got.reduce((a, x) => a + x.n, 0), js = got.filter((x) => x.js).reduce((a, x) => a + x.n, 0);
  ok(total <= 1.5 * 1024 * 1024, `first screen on a phone is ≤ 1.5 MB (got ${(total / 1048576).toFixed(2)} MB: ${got.sort((a, b) => b.n - a.n).slice(0, 4).map((x) => x.u.split('/').pop() + ' ' + Math.round(x.n / 1024) + 'K').join(', ')})`);
  ok(js <= JS_BUDGET_KB * 1024, `initial JavaScript is ≤ ${JS_BUDGET_KB} KB gzipped (got ${Math.round(js / 1024)} KB)`);
  ok(!got.some((x) => /\/full-/.test(x.u)) && !(await p.evaluate(() => window.__bzm.engineReady())), 'no stop\'s code is downloaded for Home — only the stops\' data');
  ok(!got.some((x) => /\/(shapes|formulas|dictionary|vedic|chinese)-/.test(x.u)), 'no Library tool is downloaded for Home');
  ok(!got.some((x) => /\/story-data-/.test(x.u)), 'no story is downloaded for Home — they arrive with the first screen that tells one');
  // and a stop's screen, opened cold, waits for its code and then draws it whole: a Counting Court stop, the last chapter
  await p.evaluate(() => { location.hash = '#/stop/hundred-fowls|learn'; });
  ok(await until(p, () => window.__bzm.engineReady() && window.__bzm.R.ui.nav === 'stop' && !!document.querySelector('.stop-page .learn')), 'a stop opened from Home draws once its code arrives');
  ok(await p.evaluate(() => performance.getEntriesByType('resource').some((e) => /\/full-[\w-]+\.js$/.test(e.name))), 'and the stops\' code is what arrived for it');
  await ctx.close();
}

/* offline after one visit (sw.js keeps every hashed asset it served): the stops' code, a
   Library tool and the app itself come back with no network. The worker is registered only
   off 127.0.0.1/localhost (main.js), so this serves the same build on 127.0.0.2 — still a
   secure loopback origin to the browser. */
{
  const srv2 = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.2'], { cwd: SITE, stdio: 'ignore' });
  try {
    await served(port, 600, '127.0.0.2');
    const B2 = `http://127.0.0.2:${port}/Bizzing-Maths/`;
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(`offline: ${e.message}`));
    await p.addInitScript((h) => { try { if (!localStorage.getItem('bzm_household')) localStorage.setItem('bzm_household', JSON.stringify(h)); } catch {} }, household());
    await p.goto(B2); await p.waitForSelector('.home2');
    await p.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await p.reload(); await p.waitForSelector('.home2');
    ok(await until(p, () => !!navigator.serviceWorker.controller), 'the service worker looks after the app from the second load');
    // the first visit opens a stop and a Library tool, so their code is fetched — and kept
    await p.evaluate(() => { location.hash = '#/stop/times-eleven|learn'; }); await until(p, () => window.__bzm.R.ui.nav === 'stop' && !!document.querySelector('.stop-page .learn'));
    await p.evaluate(() => { location.hash = '#/lib/dictionary'; }); await until(p, () => !!document.querySelector('.t-dictionary'));
    await p.evaluate(() => { location.hash = '#/home'; }); await until(p, () => window.__bzm.R.ui.nav === 'home');
    await ctx.setOffline(true);
    await p.reload(); await p.waitForSelector('.home2', { timeout: 30000 }).catch(() => {});
    ok(await p.locator('.home2').count() === 1 && !(await p.evaluate(() => window.__bzm.engineReady())), 'offline, the app opens on Home (the stops\' code not yet asked for)');
    await p.evaluate(() => { location.hash = '#/stop/hundred-fowls|learn'; });
    ok(await until(p, () => window.__bzm.R.ui.nav === 'stop' && !!document.querySelector('.stop-page .learn')) && await p.locator('.engine-fail').count() === 0, 'offline, a stop opens: its code came from the worker');
    await p.evaluate(() => { location.hash = '#/lib/dictionary'; });
    ok(await until(p, () => !!document.querySelector('.t-dictionary')), 'offline, a Library tool visited once opens');
    await ctx.close();
  } finally { srv2.kill(); }
}

/* the Contest Hall: sit a paper by keyboard, leave mid-way, carry on, hand it in, read the review */
{
  const { p, ctx, shot } = await page({ width: 1280, height: 800 }, 'hall');
  await p.goto(BASE + '#/hall'); await p.waitForSelector('.hall .board-scroll');
  ok(await p.locator('.paper-grid .pg').count() === 60, 'the hall offers sixty fixed papers in a band');
  ok(await p.locator('[data-act=pband][aria-selected=true]').textContent() === 'Grades 1–2', 'a Level 1 child starts in the Grades 1–2 papers');
  await p.click('[data-act=pband][data-arg=g34]');
  await p.click('[data-act=paperStart][data-arg="g34|2"]'); await p.waitForSelector('.pq-choices');
  ok(await p.locator('.pq-choices .pc').count() === 5 && await p.locator('.paper-nav .pn').count() === 24, 'a grades 3–4 paper: 24 questions, five choices each');
  const first = await p.evaluate(() => window.__bzm.R.paper.p.items[0]);
  await p.keyboard.press(String.fromCharCode(97 + first.choices.indexOf(first.ans))); await until(p, () => window.__bzm.R.paper.i !== 0);
  ok(await p.evaluate(() => window.__bzm.R.paper.i) === 1, 'choosing an answer moves to the next question');
  // answer question 2, let the paper move on, step back to it and clear it — never a race with the move
  await p.keyboard.press('b'); await until(p, () => window.__bzm.R.paper.answers[1] != null && window.__bzm.R.paper.i === 2);
  ok(await p.evaluate(() => window.__bzm.R.paper.answers[1] != null), 'B answers question 2');
  await p.keyboard.press('ArrowLeft'); await until(p, () => window.__bzm.R.paper.i === 1);
  await p.keyboard.press('Backspace'); await until(p, () => window.__bzm.R.paper.answers[1] == null);
  ok(await p.evaluate(() => window.__bzm.R.paper.answers[1] == null), 'Backspace leaves a question blank');
  // leave, come back: the answers are kept and the clock kept running
  await p.click('[data-act=paperQuit]'); await p.waitForSelector('.paper-resume');
  const kept = await p.evaluate(() => { const k = window.__bzm.R.h.kids.find((x) => x.id === window.__bzm.R.h.active); return k.paperDraft; });
  ok(kept && kept.no === 2 && kept.answers[0] === first.ans, 'leaving keeps the paper part-way through');
  await p.click('[data-act=paperResume]'); await p.waitForSelector('.pq-choices');
  ok(await p.evaluate(() => window.__bzm.R.paper.answers[0]) === first.ans, 'carrying on finds the answers where they were');
  await p.click('[data-act=paperFinish]'); await p.click('[data-act=paperFinish]'); await p.waitForSelector('.pe-score');
  await shot('paper-end');
  const sc = await p.evaluate(() => window.__bzm.R.paper.sc);
  ok(sc.right === 1 && sc.blank === 23 && sc.points === 24 + first.pts, `one right, 23 blank scores 24 + ${first.pts} (got ${sc.points})`);
  ok(await p.locator('.pe-item').count() === 23 && await p.locator('.pe-item [data-act=openStop]').count() >= 1, 'every miss is reviewed, with the way in to practise');
  const rec = await p.evaluate(() => { const k = window.__bzm.R.h.kids.find((x) => x.id === window.__bzm.R.h.active); return { best: k.papers.best['g34:2'], draft: k.paperDraft }; });
  ok(rec.best === sc.points && rec.draft === null, 'the best score is kept and the draft is cleared');
  await ctx.close();
}

/* deep links (owner, 3 Oct 2026): every link lands on the THING it names, not the room it is in */
{
  const { p, ctx, shot } = await page({ width: 1280, height: 800 }, 'deep');
  await p.goto(BASE); await p.waitForSelector('.home2, [data-bz=home], main');
  /* a link is followed when its screen is up: the Library tool loaded and drawn (a lazy chunk —
     it once arrived after a fixed 450 ms wait and failed a stone, then a formula), the stop page,
     the grid, the road, the run. Nothing is read before that screen is there. */
  const at = async (hash, ready, arg) => {
    await p.evaluate((h) => { location.hash = h; }, hash);
    await until(p, ready, arg);
    return p.evaluate(() => { const R = window.__bzm.R; return { nav: R.ui.nav, arg: R.ui.arg, tab: R.ui.tab, lcase: R.ui.lcase, beat: R.ui.beat, cell: R.ui.cell, op: R.ui.factOp, jlv: R.ui.jlv, lib: R.ui.lib, run: R.run && { kind: R.run.kind, fam: R.run.fam } }; });
  };
  const tool = (id) => window.__bzm.R.ui.nav === 'lib' && window.__bzm.R.ui.arg === id && !!document.querySelector('.t-' + id);
  let s = await at('#/lib/dictionary|perimeter', tool, 'dictionary');
  ok(s.lib && s.lib.dictionary && s.lib.dictionary.open === 'perimeter' && /perimeter/i.test(await p.textContent('main')), `a word link opens that word in the Dictionary (${JSON.stringify(s.lib && s.lib.dictionary)})`);
  s = await at('#/lib/formulas|' + FORMULA_ID, tool, 'formulas');
  ok(s.lib && s.lib.formulas && s.lib.formulas.card && s.lib.formulas.tab === 'card', `a formula link opens that formula's card (${JSON.stringify(s.lib && s.lib.formulas)})`);
  s = await at('#/lib/vedic|' + STONE_ID, tool, 'vedic');
  ok(s.lib && s.lib.vedic && s.lib.vedic.step === 0, 'a stone link opens that stone on its journey');
  s = await at('#/lib/explorer|360', tool, 'explorer');
  ok(s.lib && s.lib.explorer && s.lib.explorer.n === '360', 'the number of the hour opens on its page in the Number Explorer');
  s = await at('#/stop/times-eleven|learn|1', () => window.__bzm.R.ui.nav === 'stop' && !!document.querySelector('.stop-page .learn'));
  ok(s.nav === 'stop' && s.arg === 'times-eleven' && s.tab === 'learn' && s.lcase === 1, `a worked-idea link opens the stop on Learn, on that idea (${JSON.stringify(s)})`);
  s = await at('#/stop/times-eleven|story|3', () => window.__bzm.R.ui.tab === 'story' && !!document.querySelector('.stop-page .story'));
  ok(s.tab === 'story' && s.beat === 3, 'a story-moment link opens the story at that beat');
  s = await at('#/facts/×|7×8', () => window.__bzm.R.ui.nav === 'facts' && !!document.querySelector('.fgrid'));
  ok(s.nav === 'facts' && s.op === '×' && s.cell === '7×8', `a fact link opens the facts grid on that fact (${s.op} ${s.cell})`);
  s = await at('#/journey/2', () => window.__bzm.R.ui.nav === 'journey' && !!document.querySelector('.lboard'));
  ok(s.nav === 'journey' && s.jlv === 2, 'a level link opens that level\'s road');
  s = await at('#/puzzles/space', () => !!window.__bzm.R.run && window.__bzm.R.run.kind === 'puzzle');
  ok(s.run && s.run.kind === 'puzzle' && s.run.fam === 'space', 'a puzzle-family link starts six of that family');
  await p.evaluate(() => window.__bzm.fire('quitRun'));
  // and a card in My Feed: tap its button, land on its thing
  await at('#/feed', () => window.__bzm.R.ui.nav === 'feed'); await p.waitForSelector('.bzf-card[data-kind] .bzf-row a', { timeout: 30000 });
  await shot('feed');
  ok(await p.locator('.bzf-card .bzf-more').count() > 0 && await p.locator('.bzf-card .bzf-where').count() > 0, 'feed cards carry a second line and where they live');
  const card = await p.$eval('.bzf-card[data-kind] .bzf-row a', (x) => x.getAttribute('href'));
  ok(/\|/.test(card) || /^#\/(journey|play|puzzles|facts|world|me|contest|lib\/[a-z]+$)/.test(card), `the card's link is specific (${card})`);
  await ctx.close();
}

/* #/continue and ?from=hive */
{
  const { p, ctx } = await page({ width: 1280, height: 800 }, 'hive');
  await p.goto(BASE + '?from=hive#/continue'); await until(p, () => !!window.__bzm && window.__bzm.R.ui.nav !== 'home' && !!document.querySelector('.stop-page, .run'));
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
  ok(/Sample/.test(await p.textContent('.demo-bar')) && /Asha/.test(await p.textContent('[data-bz=greet] strong')), '?demo opens a labelled sample child');
  ok(await p.evaluate(() => Object.keys(window.__bzm.R.h.kids[0].days).length) >= 6, 'the sample has weeks of progress');
  await p.click('[data-bz=continue]'); await until(p, () => window.__bzm.R.ui.nav !== 'home');
  // things that save at once in a real household: a new face, the sound switch
  await p.evaluate(() => Promise.all([window.__bzm.fire('setAv', 'rocket'), window.__bzm.fire('sound')]));
  for (let i = 0; i < 6; i++) await p.keyboard.press('Shift');
  // and anything that saves later is made to save NOW (the page going away flushes it), so the check is not a race with a timer
  await p.evaluate(() => dispatchEvent(new Event('pagehide')));
  const after = await p.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)]))));
  ok(after === real, 'the sample never touches the real household, prefs, wallet or feed');
  await p.goto(BASE + '?demo=try'); await until(p, () => !!window.__bzm && window.__bzm.R.ui.nav === 'stop' && !!document.querySelector('.demo-bar'));
  ok((await state(p)).nav === 'stop' && /Trying a trick/.test(await p.textContent('.demo-bar')), '?demo=try opens one stop to try, labelled');
  await ctx.close();
}

/* a first visit: the landing, in Bizzing Bee's shape (owner, 4 Oct 2026: "landing page can have
   screenshots... look at bizzingbee"). Every door leads into the app or down the page; every
   picture is a real screen that exists; every number is the code's own count, recounted here;
   no testimonial and no price; the privacy line is the privacy page's; the first screen stays
   under the family budget, with no screenshot fetched before it scrolls near. */
{
  const T = await import('../src/tricks.js'), L = await import('../src/levels.js'), A = await import('../src/avatars.js');
  const P = await import('../src/papers/engine.js'), Z = await import('../src/puzzles.js'), M = await import('../src/model.js');
  const contestW = new Set(T.WORLDS.filter((w) => w.track === 'contest').map((w) => w.id));
  const perStop = T.CHECKED.levels.length * T.CHECKED.each;
  const WANT = {
    stops: T.TRICKS.length, worlds: T.WORLDS.length, levels: L.LEVELS.length,
    tools: (await import('../src/library/shelf.js')).ORDER.length, games: (await import('../src/arcade.js')).GAMES.length,
    families: Z.FAMILIES.length, floors: Z.FLOORS, papers: P.BAND_IDS.length * P.FIXED, bands: P.BAND_IDS.length, fixed: P.FIXED,
    strategies: T.TRICKS.filter((t) => contestW.has(t.world)).length,
    avatars: A.CATALOGUE.length, packs: A.PACKS.length, commons: A.CATALOGUE.filter((a) => a.tier === 'common').length,
    feed: (await import('../src/feed/index.js')).INDEX.length, perStop, checked: T.TRICKS.length * perStop,
    rivals: (await import('../src/contest.js')).RIVALS.length,
    ageBands: M.BANDS.length, ageMin: +M.BANDS[0].id.split('-')[0], ageMax: +M.BANDS.at(-1).id.split('-').pop(),
  };
  // what the page says in words, it must also be true of the code
  const STORIES = (await import('../src/story-data.js')).STORIES;
  ok(T.TRICKS.every((t) => STORIES[t.id]), 'the landing says "a story for every stop": every stop has one');
  ok(T.TRICKS.every((t) => t.why.length >= 2 && t.alg), 'the landing says every stop carries two reasons and the algebra: it does');

  const { p, ctx } = await page({ width: 390, height: 844 }, 'first', { seed: false });
  const got = [];
  p.on('response', async (r) => { try { const b = await r.body(); const t = r.headers()['content-type'] || ''; got.push({ u: r.url(), n: /javascript|css|html|json|svg/.test(t) ? gzipSync(b).length : b.length, js: /javascript/.test(t) }); } catch {} });
  await p.goto(BASE); await p.waitForSelector('.ob-land .land-rest'); await p.waitForLoadState('networkidle');
  const total = got.reduce((a, x) => a + x.n, 0), js = got.filter((x) => x.js).reduce((a, x) => a + x.n, 0);
  ok(total <= 1.5 * 1024 * 1024, `the landing's first screen on a phone is ≤ 1.5 MB (got ${(total / 1048576).toFixed(2)} MB)`);
  ok(js <= 400 * 1024, `the landing's initial JavaScript is ≤ 400 KB gzipped (got ${Math.round(js / 1024)} KB)`);
  ok(!got.some((x) => /\/art\/shots\//.test(x.u)), `no screenshot is fetched for the first screen (got ${got.filter((x) => /\/art\/shots\//.test(x.u)).map((x) => x.u.split('/').pop())})`);

  // the doors: Start, the taster, the sample — into the app, or down the page; nothing else
  ok(await p.locator('.ob-land a[href="./?demo=try"]').count() === 1, 'the landing offers "Try a trick first"');
  ok(await p.locator('.ob-land [data-act=obStart]').count() === 1, 'the landing has one Start');
  const doors = await p.$$eval('.ob-land a, .ob-land button', (els) => els.map((e) => e.dataset.act || e.getAttribute('href')));
  const bad = doors.filter((d) => !['obStart', './?demo=try', './?demo'].includes(d) && !/^#land-[a-z]+$/.test(d || ''));
  ok(!bad.length && doors.includes('obStart') && doors.includes('./?demo=try'), `every button or link on the landing leads into the app or to an in-page anchor (stray: ${bad.join(', ')})`);
  const primaries = await p.$$eval('.ob-land .btn.primary', (bs) => bs.map((b) => b.dataset.act));
  ok(primaries.length === 1 && primaries[0] === 'obStart', `Start is the landing's one primary button (got ${primaries})`);

  // the pictures: every screenshot named exists on disk and on the server, and every <img> loads
  const refs = await p.$$eval('.ob-land img', (is) => is.map((i) => i.getAttribute('data-lsrc') || i.getAttribute('src')));
  const shots = refs.filter((r) => /^art\/shots\//.test(r));
  ok(shots.length >= 12, `the landing shows the real screens (got ${shots.length})`);
  const capt = [...readFileSync(resolve(HERE, '../tools/shots.mjs'), 'utf8').matchAll(/^\s*\['([a-z]+)', async/gm)].map((m) => m[1]);
  ok(shots.every((r) => capt.includes(r.split('/').pop().replace('.jpg', ''))), `every screenshot is one tools/shots.mjs captures, so it can be made again (${shots.filter((r) => !capt.includes(r.split('/').pop().replace('.jpg', '')))})`);
  ok(shots.every((r) => existsSync(resolve(HERE, 'public', r))), `every screenshot file exists (missing: ${shots.filter((r) => !existsSync(resolve(HERE, 'public', r)))})`);
  const status = await p.evaluate(async (rs) => Promise.all(rs.map(async (r) => { const x = await fetch(r); return [r, x.status, x.headers.get('content-type')]; })), [...new Set(refs)]);
  ok(status.every(([, st, ct]) => st === 200 && /^image\//.test(ct || '')), `every <img> on the landing resolves (bad: ${status.filter(([, st, ct]) => st !== 200 || !/^image\//.test(ct || '')).map(([r, st]) => r + ' ' + st)})`);
  for (let y = 0, H = await p.evaluate(() => document.documentElement.scrollHeight); y < H; y += 500) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(60); }
  await p.waitForLoadState('networkidle');
  const broken = await p.$$eval('.ob-land img', (is) => is.filter((i) => !i.complete || !i.naturalWidth || i.hasAttribute('data-lsrc')).map((i) => i.getAttribute('src') || i.getAttribute('data-lsrc')));
  ok(!broken.length, `every image on the landing has loaded once scrolled to (broken: ${broken.slice(0, 4)})`);

  // the numbers: each one drawn from the code, and equal to the count made here
  const shown = await p.$$eval('.ob-land [data-n]', (es) => es.map((e) => [e.dataset.n, e.textContent]));
  const wrong = shown.filter(([k, t]) => !(k in WANT) || t.replace(/,/g, '') !== String(WANT[k]));
  ok(shown.length >= 25 && !wrong.length, `every number on the landing equals the code's count (${shown.length} shown; wrong: ${wrong.map(([k, t]) => `${k}=${t} want ${WANT[k]}`).join(', ')})`);
  // …and no other number is on it: outside a counted number, an example (7 × 8) or text quoted from the code, no digit
  const loose = await p.evaluate(() => { const c = document.querySelector('.ob-land').cloneNode(true); c.querySelectorAll('[data-n],[data-eg],[data-code],img,svg').forEach((e) => e.remove()); return (c.textContent.match(/[^\s]*\d[^\s]*/g) || []); });
  ok(!loose.length, `no number on the landing is typed by hand (found: ${loose.slice(0, 6).join(' | ')})`);

  // nothing invented and nothing sold: no testimonial, no price
  const land = await p.textContent('.ob-land');
  ok(!/testimonial|[$£€₹]\s?\d|\bper (month|year)\b|pricing|\bplans?\b|subscri|free trial/i.test(land) && await p.locator('.ob-land blockquote, .ob-land [class*=testimon], .ob-land [class*=pric], .ob-land [class*=plan]').count() === 0,
    'no testimonial and no price section on the landing');
  ok(/ages 6 to 14\b/.test(await p.textContent('.ob-land .land-age')), 'the age line says 6 to 14, as the age bands do');
  ok(!/Bizzing Bee|Bizzing India|Bizzing Finance/.test(land) && await p.locator('footer.foot').count() === 1, 'the family is named once, in the footer, not twice');
  ok(/grown-ups/i.test(await p.textContent('.ob-land .ob-grown')), 'one plain sentence for grown-ups');
  ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390, 'the landing does not scroll sideways on a phone');

  // the privacy line is the privacy page's own sentence
  const priv = await p.$$eval('.ob-land .land-privacy', (es) => es.map((e) => e.textContent.trim()));
  await p.goto(BASE + '#/privacy'); await p.waitForSelector('.prose');
  const page2 = (await p.textContent('.prose')).replace(/\s+/g, ' ');
  ok(priv.length >= 1 && priv.every((x) => page2.includes(x)), `the landing's privacy line is the privacy page's (${priv[0]})`);
  await ctx.close();
}

ok(!foreign.length, 'no third-party requests: ' + foreign.slice(0, 3).join(' | '));
ok(!errors.length, 'no page errors: ' + errors.slice(0, 5).join(' | '));
await browser.close(); srv.kill(); rmSync(SITE, { recursive: true, force: true });
console.log(`${fails ? 'FAIL' : 'ok'} family-ui — top bar v2, Home anatomy, switcher, back, PIN, Hive feed, coins, medals, demo`);
if (fails) process.exit(1);
