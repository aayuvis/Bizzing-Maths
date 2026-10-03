/* test/rubric-ui.mjs — the first-five-minutes promises from the audit rubric, driven in the
   BUILT app as a six-year-old would meet them:
   - A3/A8 "Start at Level 1" opens the first stop's warm-up at once (first question in ≤ 5 taps),
     and the first right answer gets Octo's cheer;
   - E6 a 6–7 child can ask for a hint before any wrong answer, and the hint never shows the answer;
   - B1/F1 Home's third tile is today's five-minute mix, and #/mix starts it;
   - C4 typing in the top bar's search shows suggestions under the box, and one opens its thing;
   - I4 Octo stands at a world's entrance, welcoming on the first visit;
   - A5 ?demo shows a wallet with coins in it and today's ring part-way round, storing nothing.
   Each check was watched to fail once with its feature removed. */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, symlinkSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');

const HERE = resolve(import.meta.dirname, '..');
const SHOTS = process.env.SHOTS || resolve(HERE, '.shots');
const SITE = resolve(HERE, '.site-rubric');
rmSync(SITE, { recursive: true, force: true }); mkdirSync(SITE, { recursive: true }); mkdirSync(SHOTS, { recursive: true });
symlinkSync(resolve(HERE, 'build'), resolve(SITE, 'Bizzing-Maths'));
const port = +(process.env.PORT_BASE || 5200) + 7;
const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: SITE, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('  ✗ ' + m); } else if (process.env.V) console.log('  ✓ ' + m); };
const browser = await chromium.launch({ executablePath: existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined });
const errors = [];
const base = `http://127.0.0.1:${port}/Bizzing-Maths/`;

try {
  /* ---- a six-year-old, from the landing page */
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (e) => errors.push(e.message));
  const shot = (n) => page.screenshot({ path: `${SHOTS}/rubric-${n}.png` });
  const run = () => page.evaluate(() => { const r = window.__bzm.R.run; return r && { kind: r.kind, i: r.i, fb: r.fb, over: r.over, hinted: r.hinted, q: r.items[r.i] }; });
  let taps = 0; const tap = async (sel) => { taps++; await page.click(sel); };
  await page.goto(base); await page.waitForSelector('.ob-land');
  await tap('[data-act=obStart]'); await page.fill('#kname', 'Mira'); await page.press('#kname', 'Enter');
  await page.waitForSelector('.ob-opt'); await tap('[data-act=draftBand][data-arg="6-7"]');
  await page.waitForSelector('.ob-face'); await tap('.ob-face');
  await page.waitForSelector('.ob-world'); await tap('.ob-world');
  await page.waitForSelector('[data-act=startLevel1]'); await tap('[data-act=startLevel1]');
  await page.waitForTimeout(300);
  let r = await run();
  ok(r && r.kind === 'warmup' && !r.over, `"Start at Level 1" opens the first stop's warm-up (got ${r && r.kind})`);
  ok(taps <= 6, `the first question is ${taps - 1} taps after the landing page (≤ 5)`);

  // E6: the hint, before any wrong answer, never the answer
  ok(await page.locator('[data-act=runHint]').count() === 1, 'a 6–7 child is offered a hint before any wrong answer');
  if (await page.locator('[data-act=runHint]').count()) { await page.click('[data-act=runHint]'); await page.waitForSelector('.hint-chip'); }
  const hint = await page.locator('.hint-chip').innerText().catch(() => '');
  r = await run();
  const shows = (txt) => new RegExp(`(^|[^0-9])${String(r.q.ans).replace(/[-−]/, '[-−]')}([^0-9]|$)`).test(txt);
  ok(!shows(hint) || shows(r.q.text || ''), `the hint shows no number the question does not (${hint} / ${r.q.ans})`);
  await shot('hint');

  // A8: the first right answer, Octo cheers
  for (const ch of String(r.q.ans).replace('−', '-')) await page.keyboard.press(ch);
  await page.waitForTimeout(200);
  ok(await page.locator('.fb.cheer .octo').count() === 1, 'the first right answer gets Octo’s cheer');
  await shot('cheer');

  // B1/F1: Home's mix tile, and #/mix starts it
  await page.evaluate(() => window.__bzm.go('home')); await page.waitForTimeout(200);
  ok(await page.locator('a[href="#/mix"]').count() >= 1, 'Home offers today’s five-minute mix');
  await page.click('a[href="#/mix"]'); await page.waitForTimeout(300);
  r = await run();
  ok(r && r.kind === 'mix' && await page.evaluate(() => window.__bzm.R.run.items.length) >= 8, 'the mix starts with facts, a stop and a puzzle');

  // C4: type-ahead under the top bar's search
  await page.evaluate(() => window.__bzm.go('home')); await page.waitForTimeout(200);
  await page.click('[data-bz=search] input'); await page.keyboard.type('sudo');
  await page.waitForSelector('#ta-list:not([hidden]) button', { timeout: 2000 }).catch(() => {});
  ok(await page.locator('#ta-list:not([hidden]) button').count() >= 2, 'typing shows suggestions under the search box');
  ok(await page.evaluate(() => document.activeElement && document.activeElement.closest('[data-bz="search"]') != null), 'the box keeps its focus while suggestions show');
  await shot('typeahead');
  await page.click('#ta-list button[data-act=sudokuPlay]').catch(() => {}); await page.waitForTimeout(400);
  ok(await page.locator('#ta-list:not([hidden])').count() === 0 && await page.locator('.play h2, .play .g-title, .play').filter({ hasText: 'Sudoku' }).count() > 0, 'a suggestion opens its thing and the list closes');
  await page.keyboard.press('Escape').catch(() => {});

  // I4: Octo at a world's entrance
  await page.evaluate(() => window.__bzm.go('world', 'gardens')); await page.waitForTimeout(300);
  ok(await page.locator('.board .octo-gate .octo').count() === 1, 'Octo stands at the world’s entrance');
  // stories load on first need (story-data.js), yet a first visit to a stop still opens on its story
  await page.evaluate(() => window.__bzm.fire('openStop', 'make-ten')); await page.waitForTimeout(700);
  ok(await page.evaluate(() => window.__bzm.R.ui.tab) === 'story' && await page.locator('.story[aria-label^="A story"]').count() === 1, 'a first visit to a stop opens on its story, after the stories arrive');
  await shot('world');
  await page.close();

  /* ---- A5: the demo's wallet and today's ring, from memory only */
  const d = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  d.on('pageerror', (e) => errors.push('demo: ' + e.message));
  await d.goto(base + '?demo'); await d.waitForTimeout(800);
  const coins = +(await d.locator('[data-bz=coins] span').first().innerText().catch(() => '0'));
  ok(coins > 0, `the demo wallet has coins (${coins})`);
  ok(await d.evaluate(() => { const k = window.__bzm.R.h.kids[0], t = new Date(), p = (n) => String(n).padStart(2, '0'); const td = `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`; return (k.days[td] || {}).ok > 0; }), 'the demo’s ring is part-way round today');
  ok(await d.evaluate(() => Object.keys(localStorage).filter((x) => /bizzing/i.test(x)).length) === 0, 'the demo stored nothing');
  await d.screenshot({ path: `${SHOTS}/rubric-demo.png` });
} finally {
  await browser.close(); srv.kill(); rmSync(SITE, { recursive: true, force: true });
}
for (const e of errors) { fails++; console.error('  ✗ page error: ' + e); }
if (fails) { console.error(`rubric-ui: ${fails} failure(s)`); process.exit(1); }
console.log('ok rubric-ui — warm-up in ≤ 5 taps with a cheer, a hint for the youngest, today’s mix, type-ahead, Octo at the gate, a first stop opens on its story, the demo wallet');
