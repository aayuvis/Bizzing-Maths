/* test/rubric-ui.mjs — the first-five-minutes promises from the audit rubric, driven in the
   BUILT app as a six-year-old would meet them:
   - A3/A8 "Start at Level 1" opens the first stop's warm-up at once (first question in ≤ 5 taps),
     and the first right answer gets Octo's cheer;
   - E6 a 6–7 child can ask for a hint before any wrong answer, and the hint never shows the answer;
   - B1/F1 Home's third tile is today's five-minute mix, and #/mix starts it;
   - C4 typing in the top bar's search shows suggestions under the box, and one opens its thing;
   - I4 Octo stands at a world's entrance, welcoming on the first visit;
   - A5 ?demo shows a wallet with coins in it and today's ring part-way round, storing nothing.
   Audit v4, Home, onboarding, rewards and games:
   - A8 the warm-up ends on a sticker made from the three answers;
   - B1/B5 Octo's greeting names the stop the child passed, and when;
   - F1 the mix shows three ticks as it goes and ends on one card, part by part;
   - G2 a Play tile shows "Best: N" once the game is played, and nothing before;
   - A6 the level test explains the placement with a question the child got right;
   - L4 passing a level test opens a level-up scene, shown once;
   - B8 the daily cards have one name, “… of the hour”, on Home, the Library and My page, and
     the trick card carries a worked example.
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


/* Answer the run on screen: `want(q)` says whether to get it right. Wrong answers and
   held right ones (puzzles) are moved on with Next, as a child would. */
async function drive(page, want, until = () => false) {
  for (let guard = 0; guard < 140; guard++) {
    const st = await page.evaluate(() => { const r = window.__bzm.R.run; return r && { over: r.over, fb: !!r.fb, q: r.items[r.i], i: r.i, n: r.results.length }; });
    if (!st || st.over || await until(st)) return st;
    if (st.fb) { await page.evaluate(() => window.__bzm.fire('nextQ')); await page.waitForTimeout(60); continue; }
    const right = want(st.q);
    if (st.q.choices) {
      const c = right ? st.q.ans : st.q.choices.find((x) => String(x) !== String(st.q.ans));
      await page.evaluate((c) => window.__bzm.fire('choose', c), String(c));
    } else {
      const a = String(st.q.ans).replace('−', '-');
      await page.keyboard.type(right ? a : (a === '7777' ? '8888' : '7777'));
      if (!right) await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(right ? 760 : 120);
  }
  return null;
}

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
  ok(await page.locator('.fb.cheer .octo').count() === 1, `the first right answer gets Octo’s cheer (${r.q.text} = ${r.q.ans} · ${JSON.stringify(await run())})`);
  await shot('cheer');

  // A8 (v4): the warm-up ends with a visible win — a sticker built from the three answers
  await page.waitForTimeout(700);
  await drive(page, () => true);   // the rest right
  r = await page.evaluate(() => { const r = window.__bzm.R.run; return { over: r.over, right: r.results.filter((x) => x.right).length, n: r.results.length }; });
  ok(r.over && await page.locator('.end-card .win-card').count() === 1, 'the warm-up ends on a sticker card');
  ok(await page.locator('.win-card .win-stars i.on').count() === r.right && await page.locator('.win-card .win-stars i').count() === r.n, `the sticker's stars are the answers that were right (${r.right} of ${r.n})`);
  await shot('warmup-win');

  // B1/B5 (v4): Octo's greeting names the stop the child passed, and when
  const passed = await page.evaluate(() => {
    const k = window.__bzm.R.h.kids.find((c) => c.id === window.__bzm.R.h.active), id = window.__bzm.R.run.trick;
    const title = window.__bzm.R.run.title.replace(/ — a warm-up$/, '');
    k.tricks[id] = { ...(k.tricks[id] || {}), stars: 2, best: 80 };
    k.last = { what: 'stop', title, at: Date.now() - 86400000 };
    return title;
  });
  await page.evaluate(() => window.__bzm.go('home')); await page.waitForTimeout(250);
  const bubble = await page.locator('[data-bz=greet] .bz-bubble').innerText();
  ok(bubble.includes(passed) && /yesterday/.test(bubble), `the greeting names the stop passed yesterday (“${bubble}”)`);
  ok(await page.locator('[data-bz=r1] > *').count() === 3, 'the greeting stays in its bubble — Home keeps three cards in its first row');
  await shot('greeting');

  // B1/F1: Home's mix tile, and #/mix starts it
  await page.evaluate(() => window.__bzm.go('home')); await page.waitForTimeout(200);
  ok(await page.locator('a[href="#/mix"]').count() >= 1, 'Home offers today’s five-minute mix');
  await page.click('a[href="#/mix"]'); await page.waitForTimeout(300);
  r = await run();
  ok(r && r.kind === 'mix' && await page.evaluate(() => window.__bzm.R.run.items.length) >= 8, 'the mix starts with facts, a stop and a puzzle');

  // F1 (v4): three ticks — facts · stop · puzzle — tick as each part is done, then one card
  ok(await page.locator('.mix-ticks li').count() === 3 && await page.locator('.mix-ticks li.done').count() === 0, 'the mix shows three ticks, none done at the start');
  let k3 = 0;
  await drive(page, () => (k3++ % 3) !== 1, (st) => st.q && st.q.part !== 'facts');
  ok(await page.locator('.mix-ticks li[data-part=facts].done').count() === 1 && await page.locator('.mix-ticks li.done').count() === 1, 'the facts tick fills when the facts are done, and only that one');
  await shot('mix-ticks');
  await drive(page, () => (k3++ % 3) !== 1);
  const parts = await page.evaluate(() => { const r = window.__bzm.R.run; return ['facts', 'stop', 'puzzle'].map((p) => { const ix = r.items.map((q, i) => (q.part === p ? i : -1)).filter((i) => i >= 0); return { p, n: ix.length, ok: ix.filter((i) => r.results[i].right).length }; }); });
  for (const x of parts) {
    const txt = await page.locator(`.mix-sum .ms-part[data-part=${x.p}] .ms-n`).innerText().catch(() => '');
    ok(txt.replace(/\s/g, '') === `${x.ok}/${x.n}`, `the mix summary counts ${x.p}: ${txt} want ${x.ok}/${x.n}`);
  }
  // a medal the evidence now supports has its ceremony; Brilliant! moves on
  while (await page.locator('.cel [data-act=celDone]').count()) { await page.click('.cel [data-act=celDone]'); await page.waitForTimeout(150); }
  await page.locator('.mix-sum').scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {}); await shot('mix-summary');

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

  // G2 (v4): a game tile shows its best score, and nothing before it is played
  await page.evaluate(() => window.__bzm.go('play')); await page.waitForTimeout(250);
  ok(await page.locator('.gtile .gbest').count() === 0, 'an unplayed game shows no best line');
  await page.evaluate(() => { const R = window.__bzm.R, k = R.h.kids.find((c) => c.id === R.h.active); k.games.rush = { best: 23, plays: 2 }; window.__bzm.render(); });
  await page.waitForTimeout(150);
  ok((await page.locator('.gtile[data-arg=rush] .gbest').innerText().catch(() => '')).includes('Best: 23'), 'Number Rush shows “Best: 23”');
  ok(await page.locator('.gtile[data-arg=target] .gbest, .gtile[data-arg=line] .gbest').count() === 0, 'the unplayed games still show nothing');
  await page.locator('.gtiles').scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {}); await shot('play-tiles');

  // B8 (v4): one cadence and one name for the daily cards, and a worked example on the trick card
  const daily = [];
  for (const nav of ['home', 'library', 'me']) {
    await page.evaluate((n) => window.__bzm.go(n), nav); await page.waitForTimeout(250);
    const txt = await page.locator('main').innerText();
    daily.push(...(txt.match(/(trick|number|quote|fact|puzzle) of the (day|hour)/gi) || []).map((x) => x.toLowerCase()));
    ok(/For example — /.test(txt), `${nav}: the trick of the hour shows a worked example`);
  }
  ok(daily.length >= 4 && daily.every((x) => x.endsWith('of the hour')), `every daily card says “of the hour” (${[...new Set(daily)].join(', ')})`);
  ok(await page.locator('.trick-day .worked').count() === 1, 'My page’s trick card has its worked line');
  await shot('trick-of-the-hour');

  // A6 (v4): the level test explains where it put the child, with a question they got right
  await page.evaluate(() => window.__bzm.fire('startLevelTest')); await page.waitForTimeout(300);
  await drive(page, (q) => q.tlevel <= 2);
  const rights = await page.evaluate(() => { const r = window.__bzm.R.run; return r.items.filter((q, i) => r.results[i] && r.results[i].right).map((q) => String(q.text)); });
  const why = await page.locator('.placed-why').innerText().catch(() => '');
  ok(/You start at Level 3 because you got/.test(why) && rights.some((t) => why.includes(t)), `the placement names a question the child got right (“${why}”)`);
  await shot('placement');
  await page.evaluate(() => window.__bzm.fire('endRun'));

  // L4 (v4): pass a level test and the level-up scene opens — the new level's name, its first
  // land's painted plate, Octo cheering — once
  await page.evaluate(() => {
    const { R, J } = window.__bzm, k = R.h.kids.find((c) => c.id === R.h.active), j = J.rec(k);
    const p = J.progress(k); j.tests = j.tests || {};
    for (const x of p.nodes) { if (x.kind === 'stop') j.done[`${x.stop}@${x.lv}`] = true; if (x.kind === 'landtest') j.tests[`L${p.level}:${x.land.id}`] = { passed: true, best: 20, stars: 2 }; }
    window.__bzm.fire('startLevelExam');
    const r = R.run; r.results = r.items.filter((q) => !q.bonus).map(() => ({ right: true, ms: 2000 }));
    window.__bzm.fire('skipBonus');
  });
  await page.waitForTimeout(400);
  const up = await page.evaluate(() => { const { R, J } = window.__bzm, k = R.h.kids.find((c) => c.id === R.h.active); return { level: k.journey.level, name: J.levelOf(k.journey.level).name, world: J.landsOf(k.journey.level)[0].world }; });
  ok(await page.locator(`.cel.lvup[data-level="${up.level}"]`).count() === 1, `passing the Level ${up.level - 1} test opens the Level ${up.level} scene`);
  ok((await page.locator('.cel.lvup h2').innerText().catch(() => '')).includes(up.name), 'the scene names the new level');
  ok((await page.locator('.lvup-plate').getAttribute('style').catch(() => '')).includes(`art/w-${up.world}.webp`), 'its plate is the first land’s painting');
  ok(await page.locator('.cel.lvup .lvup-octo img[src*="octo-cheer"]').count() === 1, 'Octo cheers');
  await page.waitForTimeout(900); await shot('levelup');
  while (await page.locator('.cel [data-act=celDone]').count()) { await page.click('.cel [data-act=celDone]'); await page.waitForTimeout(150); }
  await page.reload(); await page.waitForTimeout(800);
  ok(await page.locator('.cel.lvup').count() === 0, 'the scene is shown once — not again on the next visit');
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
console.log('ok rubric-ui — warm-up in ≤ 5 taps with a cheer, a hint for the youngest, today’s mix, type-ahead, Octo at the gate, a first stop opens on its story, the demo wallet; v4: the warm-up sticker, a greeting from evidence, the mix part by part, best scores, the placement explained, the level-up scene, one name for the daily cards');
