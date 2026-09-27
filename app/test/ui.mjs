/* test/ui.mjs — drive the BUILT app in a real browser, the way a child would.
   Serves build/ under /Bizzing-Maths/ (the GitHub Pages sub-path), then walks:
   onboarding → placement skip → Atlas → a stop's three tabs → a drill → facts →
   the contest → all three games by keyboard → the grown-ups PIN. Any page
   error fails it. Screenshots land in $SHOTS (default: build/../.shots). */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, symlinkSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');

const HERE = resolve(import.meta.dirname, '..');
const SHOTS = process.env.SHOTS || resolve(HERE, '.shots');
const SITE = resolve(HERE, '.site');
rmSync(SITE, { recursive: true, force: true }); mkdirSync(SITE, { recursive: true }); mkdirSync(SHOTS, { recursive: true });
symlinkSync(resolve(HERE, 'build'), resolve(SITE, 'Bizzing-Maths'));
const port = 8000 + Math.floor(Math.random() * 900);
const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: SITE, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('  ✗ ' + m); } else if (process.env.V) console.log('  ✓ ' + m); };
const browser = await chromium.launch({ executablePath: existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined });
const errors = [];
async function run(vp, tag) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${tag} console: ${m.text()}`); });
  const shot = (n) => page.screenshot({ path: `${SHOTS}/${tag}-${n}.png`, fullPage: false });
  const R = () => page.evaluate(() => { const r = window.__bzm.R; return { nav: r.ui.nav, run: r.run && { kind: r.run.kind, i: r.run.i, n: r.run.items.length, over: r.run.over, fb: r.run.fb, q: r.run.items[r.run.i] } }; });
  const nav = (k) => page.click(vp.width < 760 ? `.tb[data-arg=${k}]` : `.tab[data-arg=${k}]`);
  const typeAns = async (ans) => { for (const ch of String(ans)) await page.keyboard.press(ch); };

  await page.goto(`http://127.0.0.1:${port}/Bizzing-Maths/`);
  await page.waitForSelector('.welcome');
  await shot('01-welcome');
  ok(await page.locator('[data-act=createKid]').isDisabled(), 'create is disabled until name and age');
  await page.fill('#kname', 'Ahana');
  await page.click('[data-act=draftBand][data-arg="8-10"]');
  await page.click('[data-act=draftAv][data-arg="panda"]');
  await page.click('[data-act=createKid]');
  await page.waitForSelector('[data-act=startPlace]');
  // placement: answer the first four right, then two wrong
  await page.click('[data-act=startPlace]');
  for (let i = 0; i < 6; i++) {
    const s = await R();
    if (s.run.over) break;
    if (i < 4) await typeAns(s.run.q.ans); else { await typeAns('1'); await page.keyboard.press('Enter'); await page.waitForTimeout(150); if (!(await R()).run.over) await page.keyboard.press('Enter'); }
    await page.waitForTimeout(750);
  }
  await page.waitForTimeout(1600);
  ok((await R()).run && (await R()).run.over, 'placement stops after two misses in a row');
  await shot('02-placed');
  await page.click('[data-act=endRun]');
  await page.waitForSelector('.atlas');
  await shot('03-atlas');
  ok(await page.locator('.stop.shut').count() > 0, 'some stops are shut');
  // open the market's "times-nine" (8–10 child may wander 6–7 stops)
  await page.click('[data-act=openStop][data-arg="times-nine"]');
  await page.waitForSelector('.learn');
  await page.click('[data-act=watch]'); await page.click('[data-act=watch]');
  await shot('04-learn');
  await page.click('[data-act=stopTab][data-arg=turn]');
  await page.click('[data-act=startGuided]');
  // type every step of both guided questions
  for (let q = 0; q < 2; q++) {
    for (let s = 0; s < 8; s++) {
      const g = await page.evaluate(() => { const r = window.__bzm.R.run; return r && r.kind === 'guided' ? { si: r.si, n: r.steps.length, v: r.steps[r.si] && r.steps[r.si].v } : null; });
      if (!g || g.si >= g.n) break;
      if (s === 0 && q === 0) await shot('05-turn');
      await typeAns(g.v); await page.waitForTimeout(60);
    }
    await page.keyboard.press('Enter'); await page.waitForTimeout(120);
  }
  const star1 = await page.evaluate(() => { const r = window.__bzm.R; return r.h.kids[0].tricks['times-nine'].stars; });
  ok(star1 >= 1, 'Your turn earns the first star');
  // drill: all right
  await page.click('[data-act=startDrill]');
  for (let i = 0; i < 10; i++) { const s = await R(); await typeAns(s.run.q.ans); await page.waitForTimeout(520); if (i === 3) await shot('06-drill'); }
  await page.waitForTimeout(500);
  ok((await R()).run.over, 'drill finishes');
  await shot('07-drill-end');
  const st = await page.evaluate(() => window.__bzm.R.h.kids[0].tricks['times-nine'].stars);
  ok(st >= 2, `drill passes the stop (${st} stars)`);
  // a wrong answer holds and shows the working
  await page.click('[data-act=endRun]');
  await page.click('[data-act=startDrill]');
  await typeAns('1'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
  ok(await page.locator('.fb-work .steps li').count() >= 2, 'a wrong drill answer shows the trick on that question');
  await shot('08-wrong');
  ok((await R()).run.fb && !(await R()).run.fb.right, 'wrong answer holds');
  await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  ok((await R()).run.i === 1, 'Enter moves on after a wrong answer');
  await page.keyboard.press('Escape');
  // facts
  await nav('facts');
  await page.waitForSelector('.fgrid');
  await page.click('[data-act=startFacts]');
  for (let i = 0; i < 20; i++) { const s = await R(); if (!s.run || s.run.over) break; await typeAns(s.run.q.ans); await page.waitForTimeout(480); }
  await page.waitForTimeout(400);
  ok((await R()).run.over, 'twenty facts finish');
  await page.click('[data-act=endRun]'); await page.waitForSelector('.fgrid');
  await page.click('.fc.learning, .fc.quick, .fc.new >> nth=0');
  await shot('09-facts');
  // stop pages for a sutra with a figure
  await page.evaluate(() => { window.__bzm.R.h.parent.tester = true; window.__bzm.render(); });
  await nav('atlas'); await page.click('[data-act=openStop][data-arg="square-five"]'); await page.click('[data-act=watchAll]');
  await shot('10-sutra');
  await page.click('.back');
  await page.click('[data-act=openStop][data-arg="crosswise"]'); await page.click('[data-act=watchAll]');
  await page.evaluate(() => document.querySelector('.why').scrollIntoView());
  await shot('11-crosswise');
  // contest
  await nav('contest'); await page.waitForSelector('.rivals');
  await shot('12-lobby');
  await page.click('[data-act=startContest]');
  for (let r = 0; r < 60; r++) {
    const ph = await page.evaluate(() => { const C = window.__bzm.R.contest; return C && { ph: C.phase, a: C.q && C.q.ans, ch: C.q && C.q.choices }; });
    if (!ph || ph.ph === 'end') break;
    if (ph.ph === 'ask' || ph.ph === 'champ') { if (r === 2) await shot('13-contest-q'); if (ph.ch) await page.keyboard.press(ph.ch.indexOf(ph.a) === 0 ? '1' : '2'); else await typeAns(ph.a); }
    else { if (r === 3) await shot('14-contest-round'); await page.keyboard.press('Enter'); }
    await page.waitForTimeout(90);
  }
  const end = await page.evaluate(() => window.__bzm.R.contest && window.__bzm.R.contest.phase);
  ok(end === 'end', 'a contest answered perfectly runs to the end');
  await shot('15-contest-end');
  // games by keyboard
  await nav('arcade'); await page.waitForSelector('.gtiles');
  await shot('16-arcade');
  await page.click('[data-act=play][data-arg=rush]'); await page.waitForTimeout(2600);
  await shot('17-rush');
  const bub = await page.evaluate(() => 1); await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  ok(!(await page.locator('.play').count()), 'Escape closes Number Rush');
  await page.click('[data-act=play][data-arg=target]'); await page.waitForSelector('.mt-card');
  await page.keyboard.press('1'); await page.keyboard.press('+');
  await shot('18-target');
  await page.keyboard.press('s'); await page.waitForTimeout(200);
  ok(/=/.test(await page.locator('.mt-msg').innerText()), 'Show me reveals a solution');
  await page.keyboard.press('Escape');
  await page.click('[data-act=play][data-arg=line]'); await page.waitForSelector('.nl-track');
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter'); await page.waitForTimeout(100);
  ok(await page.locator('.nl-true').count() === 1, 'Number Line places by keyboard');
  await shot('19-line');
  await page.keyboard.press('Escape');
  // home + grown-ups
  await nav('home'); await page.waitForSelector('.home');
  await shot('20-home');
  await page.click('.tool[data-arg=grownups]');
  for (const k of '1234') await page.keyboard.press(k);
  await page.waitForSelector('.report');
  await shot('21-grownups');
  ok(await page.locator('.report').count() === 1, 'PIN opens the grown-ups page');
  await page.close();
}
try {
  await run({ width: 1280, height: 860 }, 'desk');
  await run({ width: 390, height: 844 }, 'phone');
} finally { await browser.close(); srv.kill(); }
for (const e of errors) { fails++; console.error('  ✗ ' + e); }
console.log(`${fails ? 'FAIL' : 'ok'} ui — desktop and phone walked end to end`);
process.exit(fails ? 1 : 0);
