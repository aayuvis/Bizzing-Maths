/* rush-ui.mjs — Number Rush and Rush · Calm in Chromium on the BUILT app (games spec §1.3, §3.1):
     T3  with bubbles 1 and 12 up, typing "12" pops 12 and "1" waits; Enter — or ✓ on the pad — pops 1
     T4  the first landing takes the same time at 60 fps and at 12 fps (the real game loop, driven
         frame by frame on a virtual clock)
     T5  Rush's level rule: 40% of the bubbles served drops a level, 60% keeps it; the chip on the
         title card shows the last level; the finish card says the verdict
     T9  the sky does not move while the tab is hidden
     T10 a miss in Rush is due in Rush · Calm and in the next Mock Contest's pool
   plus: a miss flashes the sum with its answer for a second; Calm holds a wrong answer with its why
   and pays what Twenty facts pays; level 1 draws dot patterns; Squares' miss says why; Inverse
   brings a family down together. Every assertion was watched to fail once (see the commit). */
import { site, kidRec, household, checker, SHOTS } from './lib/site.mjs';

const { BASE, browser, close } = await site('rush', +(process.env.PORT_BASE || 5200) + 15);
const { ok, fails } = checker();
const errors = [];
const kidA = kidRec('ka', 'Ahana', '8-10', 'hexbee');
kidA.shop = { owned: [], worn: {}, modes: ['rush:squares', 'rush:mixed'] };
const wallet = (n) => JSON.stringify({ v: 1, kids: { ahana: { coins: n, ledger: [{ a: 'bee', t: Date.now() - 864e5, n, why: 'migrated' }] } } });

async function open(vp, tag, { dark = false } = {}) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, hasTouch: true, colorScheme: dark ? 'dark' : 'light' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  await p.addInitScript(([h, w]) => { try { if (!localStorage.getItem('bzm_household')) { localStorage.setItem('bzm_household', h); localStorage.setItem('bizzing.wallet', w); } } catch {} }, [JSON.stringify(household([kidA])), wallet(50)]);
  await p.goto(BASE + '#/home'); await p.waitForSelector('#app main');
  if (dark) await p.evaluate(() => document.documentElement.setAttribute('data-mode', 'dark'));
  const G = (fn, a) => p.evaluate(fn, a);
  return { p, ctx, G, shot: (n) => p.screenshot({ path: `${SHOTS}/rush-${tag}-${n}.png` }) };
}
const kid = (G) => G(() => { const k = window.__bzm.R.h.kids[0]; return { xp: k.xp, facts: k.facts, gameLv: k.gameLv, coins: JSON.parse(localStorage.getItem('bizzing.wallet')).kids.ahana.coins }; });
/* the virtual clock: requestAnimationFrame is queued, and __frames(ms, n) runs n frames ms apart */
const fakeClock = (G) => G(() => {
  window.__vt = window.__vt || 1000; window.__q = [];
  if (!window.__raf0) window.__raf0 = [window.requestAnimationFrame, window.cancelAnimationFrame];
  window.requestAnimationFrame = (cb) => { window.__q.push(cb); return window.__q.length; };
  window.cancelAnimationFrame = () => {};
  window.__frame = (ms) => { window.__vt += ms; for (const cb of window.__q.splice(0)) cb(window.__vt); };
  window.__frames = (ms, n) => { for (let i = 0; i < n; i++) window.__frame(ms); };
});
const realClock = (G) => G(() => { if (window.__raf0) [window.requestAnimationFrame, window.cancelAnimationFrame] = window.__raf0; });
const S = (G) => G(() => window.__bzmGames.active().probe.state());
const B = (G) => G(() => window.__bzmGames.active().probe.bubbles());
const quit = async (p, G) => { await G(() => { const g = window.__bzmGames && window.__bzmGames.active(); if (g) g.quit(); }); await p.waitForTimeout(150); };
/* open standard Rush on its title card; `lv` clicks a level chip first */
async function rush(p, G, { lv = null, mode = '' } = {}) {
  await G((a) => window.__bzm.fire('play', a), 'rush' + (mode ? ':' + mode : ''));
  await p.waitForSelector('.g-intro');
  if (lv) await p.click(`.g-lvb[data-rl="${lv}"]`);
  await fakeClock(G);
  await p.click('.g-intro [data-g=go]');
  await p.waitForSelector('.rush-stage');
}
/* a bot: pops the lowest bubble until it has popped `pops`, then lets the rest land */
const bot = (G, pops) => G((n) => {
  const g = window.__bzmGames.active(); let guard = 0;
  while (!g.probe.state().over && guard++ < 200000) {
    const s = g.probe.state();
    if (s.score < n) {
      const b = g.probe.bubbles().filter((x) => x.y > 0 && !x.shown).sort((x, y) => y.y - x.y)[0];
      if (b) { for (const ch of String(b.ans)) g.key({ key: ch }); if (g.probe.state().score === s.score) g.key({ key: 'Enter' }); continue; }
    }
    window.__frame(1000 / 60);
  }
  return g.probe.state();
}, pops);

{ /* ---------------------------------------------------------------- desktop */
  const { p, ctx, G, shot } = await open({ width: 1280, height: 800 }, 'desk');

  // the title card: a level chip, defaulting to the band's level, said in words; Calm beside it
  await G(() => window.__bzm.fire('play', 'rush')); await p.waitForSelector('.g-intro .g-lv');
  const chips = await p.$$eval('.g-lvb', (b) => b.map((x) => x.getAttribute('aria-checked')));
  ok(chips.length === 5 && chips.indexOf('true') === 2, `the title card has a level chip 1–5, a new 8–10 child on Level 3 (${chips})`);
  ok(/^Level 3 · /.test(await p.locator('.g-lvw').innerText()), 'the level says in words what it is');
  ok(await p.locator('.g-intro [data-g=calm]').count() === 1, 'Calm is reachable from the Rush title card');
  await p.waitForTimeout(500);   // the card's entrance (a small scale-in) has settled
  const tgt = await p.$$eval('.g-lvb, .rush-calm', (b) => b.map((x) => { const r = x.getBoundingClientRect(); return Math.min(r.width, r.height); }));
  ok(tgt.every((v) => v >= 44), `every chip and button is a 44px target (${tgt})`);
  await shot('title');
  await p.keyboard.press('4'); await p.waitForTimeout(3600);
  ok(await p.locator('.g-intro').count() === 1 && (await kid(G)).gameLv.rush.lv === 4, 'key 4 picks Level 4, and a picked level holds the card (no three-second start)');
  await p.keyboard.press('ArrowLeft');
  ok((await kid(G)).gameLv.rush.lv === 3 && await p.locator('.g-lvb.on').innerText() === '3', '← steps the chip back to 3');
  await quit(p, G);

  /* T4: the first landing, at 60 and at 12 frames a second */
  const landAt = async (fps) => {
    await rush(p, G);
    const t = await G((f) => { const g = window.__bzmGames.active(), t0 = window.__vt; let n = 0; while (g.probe.state().lives === 3 && n++ < 100000) window.__frame(1000 / f); return window.__vt - t0; }, fps);
    await quit(p, G); await realClock(G);
    return t;
  };
  const t60 = await landAt(60), t12 = await landAt(12);
  ok(t60 > 3000 && Math.abs(t60 - t12) / t60 < 0.05, `T4: the first landing at 60 fps (${Math.round(t60)} ms) and at 12 fps (${Math.round(t12)} ms) within 5%`);

  /* T3: the prefix, by keyboard */
  await rush(p, G);
  await G(() => window.__bzmGames.active().probe.inject([['1 × 1', 1], ['3 × 4', 12]]));
  await p.keyboard.press('1'); await p.waitForTimeout(60);
  let a = (await B(G)).map((b) => b.ans).sort((x, y) => x - y).join();
  ok(a === '1,12' && (await S(G)).score === 0, `T3: with 1 and 12 up, "1" pops nothing (${a})`);
  await p.keyboard.press('2'); await p.waitForTimeout(60);
  a = (await B(G)).map((b) => b.ans).join();
  ok(a === '1' && (await S(G)).score === 1, `T3: "12" pops 12, and 1 is still up (${a})`);
  await G(() => window.__bzmGames.active().probe.inject([['3 × 4', 12]]));
  await p.keyboard.press('1'); await p.keyboard.press('Enter'); await p.waitForTimeout(60);
  a = (await B(G)).map((b) => b.ans).join();
  ok(a === '12' && (await S(G)).score === 2, `T3: "1" then Enter pops 1 (${a})`);
  /* a miss teaches: a wrong Enter flashes the sum with its answer, for a second */
  await G(() => window.__bzmGames.active().probe.inject([['7 × 8', 56, { op: '×', a: 7, b: 8 }]]));
  await p.keyboard.press('5'); await p.keyboard.press('4'); await p.keyboard.press('Enter'); await p.waitForTimeout(80);
  const fl = await p.locator('.rush-flash').innerText().catch(() => '');
  ok(/7 × 8 = 56/.test(fl), `a wrong Enter flashes the sum it was aimed at, with its answer ("${fl.trim()}")`);
  ok((await kid(G)).facts['7×8'] && (await kid(G)).facts['7×8'].miss === 1, 'and the miss goes to the fact record');
  await shot('flash');
  await p.waitForTimeout(1100);
  ok(await p.locator('.rush-flash').count() === 0, 'the flash is gone after a second');
  // the shown bubble scores nothing when typed now
  const sc0 = (await S(G)).score; await p.keyboard.press('5'); await p.keyboard.press('6'); await p.waitForTimeout(60);
  ok((await S(G)).score === sc0 && !(await B(G)).some((b) => b.ans === 56), 'a bubble whose answer was shown clears when typed, and scores nothing');

  /* T9: a hidden tab stops the sky */
  await G(() => window.__frames(1000 / 60, 60));
  const y0 = (await B(G)).map((b) => b.y), g0 = (await S(G)).gt;
  await G(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); window.__frames(250, 40); });
  const y1 = (await B(G)).map((b) => b.y), g1 = (await S(G)).gt;
  ok(y0.length > 0 && y0.join() === y1.join() && g0 === g1, `T9: ten hidden seconds move nothing (clock ${g0} → ${g1})`);
  await G(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); window.__frames(1000 / 60, 7); });
  const g2 = (await S(G)).gt;
  ok(g2 > g1 && g2 - g1 < 120, `T9: back, it picks up where it was — no jump (${g1} → ${g2})`);
  await quit(p, G); await realClock(G);

  /* T5: 40% drops a level; the chip remembers; 60% keeps it */
  await rush(p, G, { lv: 3 });
  let s = await bot(G, 2);
  await p.waitForSelector('.rush-verdict');
  const v1 = await p.locator('.rush-verdict').innerText();
  ok(s.score === 2 && s.served === 5 && (await kid(G)).gameLv.rush.lv === 2 && /Level 2/.test(v1), `T5: 2 popped of 5 served (40%) drops to Level 2 ("${v1}")`);
  await shot('verdict');
  await realClock(G); await quit(p, G);
  await G(() => window.__bzm.fire('play', 'rush')); await p.waitForSelector('.g-lvb.on');
  ok(await p.locator('.g-lvb.on').innerText() === '2', 'the chip opens on the level last played');
  await quit(p, G);
  await rush(p, G);
  s = await bot(G, 5);
  await p.waitForSelector('.rush-verdict');
  const v2 = await p.locator('.rush-verdict').innerText();
  ok(s.score === 5 && s.served === 8 && (await kid(G)).gameLv.rush.lv === 2 && /keep Level 2/.test(v2), `T5: 5 of 8 (62%) keeps Level 2 ("${v2}")`);
  ok(await p.locator('.g-practised .g-facts.again li').count() > 0, 'the finish card lists the sums that landed, with their answers');
  await realClock(G); await quit(p, G);

  /* T10: what landed in Rush is due in Calm and in the next Mock Contest */
  const missed = Object.entries((await kid(G)).facts).filter(([, r]) => r.miss > 0).map(([k]) => k);
  ok(missed.length >= 3, `the landings are in the fact record (${missed.join(' ')})`);
  await G(() => { location.hash = '#/game/rush:calm'; });
  await p.waitForSelector('.calm-shelf');
  const run = await G(() => { const r = window.__bzm.R.run; return { calm: r.calm, kind: r.kind, title: r.title, keys: r.items.map((q) => `${q.fact.a}${q.fact.op}${q.fact.b}`) }; });
  ok(run.calm && run.kind === 'facts' && /Calm/.test(run.title), `#/game/rush:calm opens Rush · Calm, which is the Twenty facts run (${run.kind}, ${run.title})`);
  // Calm serves the op of the child's most pressing due fact, with the drill's own session builder
  const op = run.keys[0] && /[+\-×÷²]/.exec(run.keys[0])[0], mine = missed.filter((k) => k.includes(op));
  ok(mine.length >= 1 && mine.every((k) => run.keys.includes(k)), `T10: every ${op} fact missed in Rush is on Calm's shelf (${mine.filter((k) => run.keys.includes(k)).length} of ${mine.length})`);
  ok(await p.locator('.rush-stage, canvas').count() === 0 && await p.locator('.timer').count() === 0, 'Calm: nothing falls and nothing is timed');
  await shot('calm');
  // a right answer pops and pays what Twenty facts pays
  const pay = async () => { const before = await kid(G); const ans = await G(() => String(window.__bzm.R.run.items[window.__bzm.R.run.i].ans)); for (const ch of ans) await p.keyboard.press(ch); await p.waitForTimeout(120); const after = await kid(G); return { xp: after.xp - before.xp, coins: after.coins - before.coins }; };
  const calmPay = await pay();
  ok(await p.locator('.cs-now.pop').count() === 1, 'a right answer pops the bubble on the shelf');
  await p.waitForTimeout(900);
  // a wrong answer HOLDS, with the answer and its why
  const i0 = await G(() => window.__bzm.R.run.i);
  // a wrong answer that no prefix of can be right: the answer plus one (typing 999 is RIGHT when the fact is 81 ÷ 9)
  const wrong = await G(() => String(Number(window.__bzm.R.run.items[window.__bzm.R.run.i].ans) + 1));
  for (const ch of wrong) await p.keyboard.press(ch); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
  ok(await G(() => window.__bzm.R.run.i) === i0 && await p.locator('.fb.bad').count() === 1 && await p.locator('.cs-now.held').count() === 1, 'Calm: a wrong answer holds — it does not move on by itself');
  ok(/It is/.test(await p.locator('.fb.bad').innerText()) && await p.locator('.qcard .why-chip').count() === 1, 'and shows the answer and its why');
  await shot('calm-held');
  await G(() => window.__bzm.fire('quitRun')); await p.waitForTimeout(200);
  ok(await G(() => window.__bzm.R.ui.nav) === 'play', 'leaving Calm lands on Play');
  await G(() => window.__bzm.fire('startFacts', '×')); await p.waitForSelector('.qcard');
  const twentyPay = await pay();
  ok(calmPay.xp === twentyPay.xp && calmPay.coins === twentyPay.coins && calmPay.coins === 1, `Calm pays exactly what Twenty facts pays (Calm ${JSON.stringify(calmPay)}, Twenty facts ${JSON.stringify(twentyPay)})`);
  ok(await p.locator('.calm-shelf').count() === 0 && await p.locator('.dots').count() === 1, 'and Twenty facts keeps its own look');
  await G(() => window.__bzm.fire('quitRun')); await p.waitForTimeout(200);
  // the Mock Contest
  await G(() => window.__bzm.fire('startContest')); await p.waitForTimeout(300);
  const cdue = await G(() => window.__bzm.R.contest.c.due);
  ok(missed.every((k) => cdue.includes(k)), `T10: the next Mock Contest's fact pool holds every Rush miss (${cdue.slice(0, 6).join(' ')})`);
  await G(() => window.__bzm.fire('quitContest')); await p.waitForTimeout(200);
  await ctx.close();
}

{ /* ---------------------------------------------------------------- the levels and modes, on a phone */
  for (const dark of [false, true]) {
    const tag = 'phone-' + (dark ? 'dark' : 'light');
    const { p, ctx, G, shot } = await open({ width: 390, height: 844 }, tag, { dark });
    await G(() => window.__bzm.fire('play', 'rush')); await p.waitForSelector('.g-intro .g-lv');
    const sw = await G(() => document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('.g-lvb, .rush-calm')].every((b) => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }));
    ok(sw, `${tag}: the title card fits the phone, no sideways scroll`);
    await shot('title');
    await quit(p, G);
    // level 1: the pre-readers' dots, tapped on the pad, ✓ as Enter
    await rush(p, G, { lv: 1 });
    await G(() => window.__frames(1000 / 60, 60));
    const bs = await B(G);
    ok(bs.length && bs.every((b) => b.dots > 0 || /^\d+ \+ \d+$/.test(b.text)), `${tag} level 1: dots and + within ten (${bs.map((b) => b.dots ? b.dots + ' dots' : b.text)})`);
    await G(() => window.__frames(1000 / 60, 200));
    await shot('level1');
    await G(() => window.__bzmGames.active().probe.inject([['1 + 0', 1], ['6 + 6', 12]]));
    const sc = (await S(G)).score;
    await p.tap('.pad [data-k="1"]'); await p.waitForTimeout(60);
    const mid = (await S(G)).score;
    await p.tap('.pad [data-k="✓"]'); await p.waitForTimeout(60);
    ok(mid === sc && (await S(G)).score === sc + 1, `${tag} T3: on the pad, "1" waits beside 12 and ✓ pops it (${sc} → ${mid} → ${(await S(G)).score})`);
    const keys = await G(() => [...document.querySelectorAll('.pad .pk')].every((b) => { const r = b.getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; }));
    ok(keys, `${tag}: every pad key, ✓ included, is inside the viewport`);
    await quit(p, G); await realClock(G);
    // Squares: a miss says why
    await rush(p, G, { mode: 'squares' });
    await G(() => { for (let i = 0; i < 400 && !window.__bzmGames.active().probe.bubbles().length; i++) window.__frame(1000 / 60); });
    await p.tap('.pad [data-k="0"]'); await p.tap('.pad [data-k="✓"]'); await p.waitForTimeout(60);
    const why = await p.locator('.rush-flash small').innerText().catch(() => '');
    ok(/^\d+² = \d+² \+ 2 × \d+ − 1 = \d+ \+ \d+$/.test(why.trim()), `${tag} Squares: a miss shows why ("${why.trim()}")`);
    await shot('squares-why');
    await quit(p, G); await realClock(G);
    // Inverse: a family falls together
    await rush(p, G, { mode: 'mixed' });
    await G(() => { for (let i = 0; i < 2000 && window.__bzmGames.active().probe.bubbles().length < 4; i++) window.__frame(1000 / 60); });
    const fam = (await B(G)).slice(0, 2), whole = (b) => (/×/.test(b.text) ? b.ans : +b.text.split(' ÷ ')[0]);
    ok(fam.length === 2 && whole(fam[0]) === whole(fam[1]) && fam.every((b) => /^\d+ [×÷] \d+$/.test(b.text)), `${tag} Inverse: the first bubbles are one family (${fam.map((b) => b.text).join(', ')})`);
    await shot('inverse');
    await quit(p, G); await realClock(G);
    // Calm on the phone
    await G(() => window.__bzm.fire('play', 'rush:calm')); await p.waitForSelector('.calm-shelf');
    const fit = await G(() => document.documentElement.scrollWidth <= innerWidth);
    ok(fit, `${tag} Calm: the shelf fits the phone`);
    await shot('calm');
    await ctx.close();
  }
}

ok(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await close();
console.log(`${fails() ? 'FAIL' : 'ok'} rush-ui — the prefix by key and pad, the wall clock at 60 and 12 fps, the level chip and rule, the hidden tab, misses that teach, Calm on the drill's engine, one fact record`);
process.exit(fails() ? 1 : 0);
