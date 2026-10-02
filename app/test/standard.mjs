/* test/standard.mjs — the family standard v2 checks (FIX-MATHS 2 Oct 2026), on the BUILT
   app at its GitHub Pages sub-path, desktop 1280 and phone 390.

   §1 Fix first: the grown-ups report fits a 390px phone · an unknown hash lands on Home ·
   tester mode draws no lock on anything it opened, and no road stop is a blank circle ·
   ⬡ stays in the top bar during a run and hides only inside a timed contest question.

   Every assertion here was watched to fail once before it was trusted. */
import { site, household, kidRec, checker, SHOTS } from './lib/site.mjs';

const { BASE, browser, close } = await site('std', 5204);
const { ok, fails } = checker();
const errors = [];

/* a child with something on the report: two stops starred, some facts, a land test */
function seeded(parent = {}) {
  const a = kidRec('ka', 'Ahana', '8-10', 'hexbee', { xp: 140, tricks: { 'make-ten': { stars: 3, learned: true }, 'bridge-ten': { stars: 2, learned: true } } });
  const b = kidRec('kb', 'Kabir', '6-7', 'rocket');
  return household([a, b], parent);
}
async function open(vp, h, url = '') {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: vp.width < 500, hasTouch: vp.width < 500 });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  await p.addInitScript((hh) => { try { if (!localStorage.getItem('bzm_household')) localStorage.setItem('bzm_household', JSON.stringify(hh)); } catch {} }, h);
  await p.goto(BASE + url); await p.waitForTimeout(350);
  return { p, ctx };
}
const nav = (p) => p.evaluate(() => window.__bzm.R.ui.nav);
const width = (p) => p.evaluate(() => document.documentElement.scrollWidth);

for (const [vp, tag] of [[{ width: 1280, height: 800 }, 'desk'], [{ width: 390, height: 844 }, 'phone']]) {
  /* 1 · the grown-ups report fits the device */
  {
    const { p, ctx } = await open(vp, seeded(), '#/grownups');
    for (const ch of '1234') await p.keyboard.press(ch);
    await p.waitForSelector('.rc');
    await p.screenshot({ path: `${SHOTS}/std-${tag}-grownups.png`, fullPage: true });
    ok(await width(p) <= vp.width, `${tag}: the grown-ups report fits ${vp.width}px (scrollWidth ${await width(p)})`);
    await ctx.close();
  }
  /* 2 · unknown hashes land on Home */
  for (const bad of ['#/nonsense', '#/stop/bad', '#/world/nowhere', '#/lib/nothing']) {
    const { p, ctx } = await open(vp, seeded(), bad);
    ok(await nav(p) === 'home' && await p.locator('.home2').count() === 1 && await p.locator('.ob-land').count() === 0, `${tag}: ${bad} lands on Home (nav ${await nav(p)})`);
    await ctx.close();
  }
  /* 3 · tester mode: no locks on what it opened; no blank road stops */
  {
    const { p, ctx } = await open(vp, seeded({ tester: true }), '#/journey');
    await p.evaluate(() => { window.__bzm.R.ui.jlv = 8; window.__bzm.render(); }); await p.waitForTimeout(150);
    const blank = await p.$$eval('.lboard .bpin > span:first-child', (s) => s.filter((x) => !x.textContent.trim() && !x.querySelector('svg')).length);
    ok(blank === 0, `${tag}: no road stop is a blank circle on a later level in tester mode (got ${blank})`);
    ok(await p.locator('.lboard .bpin.shut').count() === 0, `${tag}: tester mode shows no shut stop on the road`);
    await p.screenshot({ path: `${SHOTS}/std-${tag}-tester-road.png` });
    await p.evaluate(() => window.__bzm.fire('openWorld', 'observatory')); await p.waitForTimeout(150);
    ok(await p.locator('.board .lvb.later, .board .bpin.shut').count() === 0, `${tag}: tester mode draws no lock on world-board pins`);
    for (const tool of ['vedic', 'chinese', 'tables']) {
      await p.evaluate((t) => window.__bzm.go('lib', t), tool); await p.waitForTimeout(600);
      const locked = await p.$$eval('.locked, .bpin.shut', (s) => s.filter((x) => x.offsetParent).length);
      ok(locked === 0, `${tag}: tester mode leaves no locked ${tool} stone (got ${locked})`);
    }
    await ctx.close();
  }
  /* 4 · ⬡ stays in the bar during a run; hides only in a timed contest question */
  {
    const { p, ctx } = await open(vp, seeded());
    await p.evaluate(() => window.__bzm.fire('startFacts', '×')); await p.waitForTimeout(200);
    ok(await nav(p) === 'run' && await p.locator('header.top .hive').count() === 1, `${tag}: ⬡ stays in the top bar during a drill`);
    await p.evaluate(() => window.__bzm.go('contest')); await p.evaluate(() => window.__bzm.fire('startContest')); await p.waitForTimeout(200);
    ok(await p.locator('header.top .hive').count() === 0, `${tag}: ⬡ hides inside a timed contest question`);
    await ctx.close();
  }
}

ok(!errors.length, 'no page errors: ' + errors.slice(0, 4).join(' | '));
await close();
console.log(`${fails() ? 'FAIL' : 'ok'} standard — fix-first: report fits, unknown hash → Home, tester opens without locks, ⬡ in runs`);
if (fails()) process.exit(1);
