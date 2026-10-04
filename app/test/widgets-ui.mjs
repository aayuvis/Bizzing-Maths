/* test/widgets-ui.mjs — the three ways to answer by building (audit v4 E4), driven in the BUILT app.

   For each kind — the fraction bar, the place-value blocks, tap-the-chart — one question answered
   right by TOUCH, one right by KEYBOARD, and one answered wrong, which must hold until dismissed (the
   Bee's rule) while a right one moves on by itself. On a phone every control is ≥ 44px (a bar's part
   is a strip: ≥ 44px tall, and the shade buttons are the 44px route to it), every control has a name,
   and no widget starts on its answer. Screenshots of each, desktop and phone, light and dark. */
import { site, SHOTS, kidRec, household, checker } from './lib/site.mjs';

const { BASE, browser, close } = await site('widgets', +(process.env.PORT_BASE || 5200) + 10);
const { ok, fails } = checker();
const errors = [];

/* the questions, made by the stops' own q() in the page — the app's code, never a copy */
const SETS = {
  fracbar: [
    ['bakery', 'fraction-parts', { n: 4, k: 3, shape: 'pie', input: 'fracbar' }],
    ['bakery', 'equivalent-fractions', { a: 1, b: 2, m: 3, miss: 'top', input: 'fracbar' }],
    ['bakery', 'simplify-fractions', { a: 6, b: 8, input: 'fracbar' }],
  ],
  blocks: [
    ['library', 'place-value', { n: 372, p: 2, kind: 'worth', input: 'blocks' }],
    ['gardens', 'tens-then-ones', { a: 47, b: 36, input: 'blocks' }],
    ['library', 'round-nearest', { n: 63, to: 10, input: 'blocks' }],
  ],
  chart: [
    ['carnival', 'bar-compare', { labels: ['Wheel', 'Cups', 'Train', 'Slide'], values: [9, 4, 6, 7], step: 1, a: 3, b: 1, ask: 'which' }],
    ['carnival', 'line-graph-read', { temps: [16, 18, 22, 24, 28, 26, 20], ask: 'when', i: 4, j: 4 }],
    ['carnival', 'pictogram-total', { labels: ['Hoopla', 'Darts', 'Ducks'], counts: [10, 6, 8], per: 2, ask: 'which', a: 2 }],
  ],
};
const start = (p, kind) => p.evaluate(([set, kind]) => {
  const B = window.__bzm;
  const items = set.map(([w, id, ex]) => { const t = B.tricksIn(w).find((x) => x.id === id), q = t.q(ex);
    if (t.draw) q.html = t.draw(q); if (t.keys) q.keys = t.keys; if (q.input === 'chart') q.hits = t.hits(q); q.trick = id; return q; });
  B.startRun('mix', `Widgets: ${kind}`, items);
}, [SETS[kind], kind]);
const run = (p) => p.evaluate(() => { const r = window.__bzm.R.run; return r && { i: r.i, fb: r.fb, over: r.over, w: r.w, q: r.items[r.i] }; });
const settle = (p, ms = 900) => p.waitForTimeout(ms);

async function audit(p, tag, kind) {
  const r = await run(p);
  ok(await p.locator('#widget').count() === 1 && await p.locator('.pad').count() === 0, `${tag} ${kind}: the widget replaces the keypad`);
  ok(await p.locator('#widget .right, #widget .wrong').count() === 0, `${tag} ${kind}: nothing is marked before an answer`);
  const read = (await p.locator('#widget .wid-read').innerText().catch(() => '')).trim();
  ok(!read || read !== String(r.q.ans), `${tag} ${kind}: the widget does not start on the answer (${read})`);
  const named = await p.$$eval('#widget button', (bs) => bs.filter((b) => !(b.getAttribute('aria-label') || b.textContent.trim())).length);
  ok(named === 0, `${tag} ${kind}: every control has a name for a screen reader (${named} without)`);
  if (tag === 'phone') {
    const small = await p.$$eval('#widget button', (bs) => bs.map((b) => { const r = b.getBoundingClientRect(); return { c: b.className, w: r.width, h: r.height }; })
      .filter((x) => (x.c.includes('wf-p') ? x.h < 44 || x.w < 24 : x.w < 44 || x.h < 44)));
    ok(!small.length, `phone ${kind}: every target is at least 44px (${JSON.stringify(small.slice(0, 3))})`);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `phone ${kind}: no sideways scroll`);
  }
}
async function rightMovesOn(p, tag, what, i) {
  await settle(p);
  const r = await run(p);
  ok(r.i === i + 1 && !r.fb, `${tag} ${what}: a right answer moves on by itself (at ${r.i}, fb ${JSON.stringify(r.fb)})`);
}
async function wrongHolds(p, tag, what, i) {
  await settle(p, 1500);
  const r = await run(p);
  ok(r.i === i && r.fb && !r.fb.right, `${tag} ${what}: a wrong answer holds until dismissed (at ${r.i}, fb ${JSON.stringify(r.fb)})`);
  ok(await p.locator('.runner.is-wrong').count() === 1 && await p.locator('[data-act=nextQ]').count() === 1, `${tag} ${what}: it shows the answer and waits for Next`);
  ok(await p.locator('#widget button:not([disabled])').count() === 0, `${tag} ${what}: the widget is still while it holds`);
}

for (const [vp, tag] of [[{ width: 1280, height: 800 }, 'desk'], [{ width: 390, height: 844 }, 'phone']]) for (const mode of ['light', 'dark']) {
  const phone = vp.width < 500;
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, colorScheme: mode });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  await p.addInitScript((h) => { try { localStorage.setItem('bzm_household', JSON.stringify(h)); } catch {} }, household([kidRec('k1', 'Ira', '8-10', 'hexbee')]));
  await p.goto(BASE); await p.waitForSelector('.home2');
  const shot = (n) => p.screenshot({ path: `${SHOTS}/widgets-${tag}-${mode}-${n}.png` });
  const tap = (sel) => (phone ? p.locator(sel).first().tap() : p.locator(sel).first().click());
  const full = mode === 'light';   // every answer path once per viewport; dark is the screenshots and the audit

  /* ---- the fraction bar */
  await start(p, 'fracbar'); await p.waitForSelector('#widget .wf-bar');
  await audit(p, tag, 'fracbar'); await shot('fracbar-start');
  // 1 · touch: three more parts, shade three — by tapping on a phone, by dragging along the bar with a mouse
  for (let k = 0; k < 3; k++) await tap('[data-act=wf][data-arg="n+"]');
  if (phone) for (const i of [0, 1, 2]) await tap(`.wf-p[data-part="${i}"]`);
  else {
    const box = async (i) => p.locator(`.wf-p[data-part="${i}"]`).boundingBox();
    const a = await box(0), b = await box(2);
    await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await p.mouse.down();
    await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 }); await p.mouse.up();
  }
  ok((await run(p)).w.on.length === 3, `${tag}: ${phone ? 'tapping' : 'dragging along'} the bar shades three parts (${JSON.stringify((await run(p)).w)})`);
  await shot('fracbar-built');
  await tap('[data-act=wCheck]');
  await rightMovesOn(p, tag, 'fraction bar by touch', 0);
  if (full) {
    // 2 · keyboard: 1/2 = ?/6 — the six parts are given; ↑ shades, Enter checks
    await audit(p, tag, 'fracbar');
    for (let k = 0; k < 3; k++) await p.keyboard.press('ArrowUp');
    await p.keyboard.press('Enter');
    await rightMovesOn(p, tag, 'fraction bar by keyboard', 1);
    // 3 · wrong: simplify 6/8, built as 2/4 — holds
    for (let k = 0; k < 3; k++) await tap('[data-act=wf][data-arg="n+"]');
    await tap('[data-act=wf][data-arg="k+"]'); await tap('[data-act=wf][data-arg="k+"]');
    await tap('[data-act=wCheck]');
    await wrongHolds(p, tag, 'fraction bar, wrong', 2);
    await shot('fracbar-wrong');
    // keyboard Space shades the part under the cursor; ←/→ change the parts
    await p.keyboard.press('Enter'); await settle(p, 300);
  }
  await p.evaluate(() => { window.__bzm.R.run = null; window.__bzm.go('home'); });

  /* ---- the blocks */
  await start(p, 'blocks'); await p.waitForSelector('#widget .wb-cols');
  await audit(p, tag, 'blocks'); await shot('blocks-start');
  // 1 · touch: the 3 in 372 is worth three hundred blocks
  for (let k = 0; k < 3; k++) await tap('[data-act=wb][data-arg="h+"]');
  await shot('blocks-built');
  await tap('[data-act=wCheck]');
  await rightMovesOn(p, tag, 'blocks by touch', 0);
  if (full) {
    // 2 · keyboard: 47 + 36 = 83 — ← to the tens, ↑ eight times, → to the ones, ↑ three times, Enter
    await p.keyboard.press('ArrowLeft'); for (let k = 0; k < 8; k++) await p.keyboard.press('ArrowUp');
    await p.keyboard.press('ArrowRight'); for (let k = 0; k < 3; k++) await p.keyboard.press('ArrowUp');
    const w = (await run(p)).w; ok(w.t === 8 && w.o === 3, `${tag}: the arrows build eight tens and three ones (${JSON.stringify(w)})`);
    await p.keyboard.press('Enter');
    await rightMovesOn(p, tag, 'blocks by keyboard', 1);
    // 3 · wrong: 63 to the nearest ten, built as 70 — holds
    for (let k = 0; k < 7; k++) await tap('[data-act=wb][data-arg="t+"]');
    await tap('[data-act=wCheck]');
    await wrongHolds(p, tag, 'blocks, wrong', 2);
    await shot('blocks-wrong');
    await p.keyboard.press('Enter'); await settle(p, 300);
  }
  await p.evaluate(() => { window.__bzm.R.run = null; window.__bzm.go('home'); });

  /* ---- tap the chart */
  await start(p, 'chart'); await p.waitForSelector('#widget .tc-hit');
  await audit(p, tag, 'chart'); await shot('chart-start');
  // 1 · touch: 4 + 3 = 7 votes is the Slide
  await tap('.tc-hit[data-arg="Slide"]');
  await rightMovesOn(p, tag, 'chart by touch', 0);
  if (full) {
    // 2 · keyboard: 28 °C was at 1 pm, the fifth dot — → five times, Enter
    await audit(p, tag, 'chart');
    for (let k = 0; k < 5; k++) await p.keyboard.press('ArrowRight');
    ok(await p.evaluate(() => document.activeElement && document.activeElement.dataset.arg) === '1 pm', `${tag}: the arrows move the focus ring to the fifth dot`);
    await shot('chart-focus');
    await p.keyboard.press('Enter');
    await rightMovesOn(p, tag, 'chart by keyboard', 1);
    // 3 · wrong: 8 prizes is Ducks; tap Darts — holds, the right row marked
    await tap('.tc-hit[data-arg="Darts"]');
    await wrongHolds(p, tag, 'chart, wrong', 2);
    ok(await p.locator('.tc-hit.right[data-arg="Ducks"]').count() === 1 && await p.locator('.tc-hit.wrong[data-arg="Darts"]').count() === 1, `${tag}: the wrong tap and the right row are both marked`);
    await shot('chart-wrong');
  }
  await p.evaluate(() => { window.__bzm.R.run = null; window.__bzm.go('home'); });

  /* ---- Learn shows it: empty, then built when the steps are done */
  if (full) {
    await p.evaluate(() => { window.__bzm.R.ui.tab = 'learn'; window.__bzm.go('stop', 'fraction-parts'); }); await p.waitForSelector('.learn-wid #widget');
    ok(await p.locator('.learn-wid .wf-p.on').count() === 0, `${tag}: Learn's bar starts empty`);
    await p.click('[data-act=watchAll]'); await settle(p, 200);
    ok(await p.locator('.learn-wid .wf-p.on').count() === 3 && await p.locator('.learn-wid .wf-p').count() === 4, `${tag}: and is built to 3/4 once the steps are shown`);
    await shot('learn-fracbar');
  }
  await ctx.close();
}

ok(!errors.length, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await close();
console.log(`${fails() ? 'FAIL' : 'ok'} widgets-ui — fraction bar, blocks and chart: right by touch, right by keyboard, wrong holds; desktop and phone, light and dark`);
if (fails()) process.exit(1);
