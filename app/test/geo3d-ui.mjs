/* test/geo3d-ui.mjs — the geometry explainers, driven in the BUILT app (desktop 1280 and phone 390,
   light and dark, and once more under reduced motion).

   1 · Learn: a wired stop's "Why it works" opens on its explainer, in ASK mode (no answer) until the
       steps are shown, then FULL — and where it had got to is kept across that re-render.
   2 · Keyboard: ← → step, Space plays, End/Home jump. Touch: the 44px buttons. A 3D solid turns by
       its button, ↑ ↓, and a drag.
   3 · Play runs to the end and STOPS: the player asks for no frame after it ends (window.__g3.frames,
       and every requestAnimationFrame on the page, counted for a second after).
   4 · Reduced motion (the device's setting, and Settings' own switch): no Play, no tween — a step is
       one still picture, and no animation frame is asked for at all.
   5 · A drill question shows no explainer (rule 3); a wrong answer offers one, folded, after the answer.
   6 · Every control ≥ 44px, named; no sideways scroll; the player is not in the first load.
   7 · The Formula Book's moving card plays on its own example.
   Key frames are saved as screenshots: geo3d-<view>-<mode>-<stop>-<n>.png. */
import { site, SHOTS, kidRec, household, checker, until, ready } from './lib/site.mjs';

const { BASE, browser, close } = await site('geo3d', +(process.env.PORT_BASE || 5200) + 20);
const { ok, fails } = checker();
const errors = [];
const STOPS = ['volume-cuboid', 'area-rectangles', 'area-triangles', 'out-in', 'painted-cubes', 'round-the-circle'];

async function open(vp, { dark = false, reduced = false } = {}) {
  const phone = vp.width < 500;
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, colorScheme: dark ? 'dark' : 'light', reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  // every animation frame the page asks for is counted, not just the player's own
  await p.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.__raf = 0; window.requestAnimationFrame = (f) => { window.__raf++; return raf(f); }; });
  await p.addInitScript((h) => { try { localStorage.setItem('bzm_household', JSON.stringify(h)); } catch {} }, household([kidRec('k1', 'Ira', '11-14', 'hexbee')], { tester: true }));
  await p.goto(BASE); await p.waitForSelector('.home2');
  return { p, ctx, phone };
}
const state = (p) => p.evaluate(() => { const g = document.querySelector('.g3d'); return g && { t: +g.dataset.g3t, playing: g.hasAttribute('data-g3playing'), mode: g.dataset.g3mode, cap: g.querySelector('.g3-cap').textContent, pos: g.querySelector('.g3-pos').textContent, playHidden: g.querySelector('[data-g3b=play]').hidden, svg: g.querySelector('.g3-stage').innerHTML.length, frames: window.__g3 ? window.__g3.frames : 0 }; });
const lastStep = (p) => p.evaluate(() => { const g = document.querySelector('.g3d'); const pos = g.querySelector('.g3-pos').textContent; return /\/\s*(\d+)/.test(pos) ? +pos.match(/\/\s*(\d+)/)[1] - 1 : null; });
async function toStop(p, id) {
  await p.evaluate((x) => { location.hash = `#/stop/${x}|learn`; }, id);
  await until(p, () => !!document.querySelector('.stop-page .learn .g3d[data-g3on]'));
  await ready(p);
}
async function sizes(p, tag) {
  const small = await p.$$eval('.g3d .g3-b:not([hidden]), .g3-more > summary', (bs) => bs.filter((b) => b.offsetParent).map((b) => { const r = b.getBoundingClientRect(); return { a: b.getAttribute('aria-label') || b.textContent.trim(), w: r.width, h: r.height }; }).filter((x) => x.w < 44 || x.h < 44));
  ok(!small.length, `${tag}: every explainer control is at least 44px (${JSON.stringify(small.slice(0, 3))})`);
  const unnamed = await p.$$eval('.g3d button', (bs) => bs.filter((b) => !(b.getAttribute('aria-label') || '').trim()).length);
  ok(unnamed === 0, `${tag}: every explainer button has a name`);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${tag}: no sideways scroll`);
  const fit = await p.$eval('.g3d .g3-svg', (s) => { const r = s.getBoundingClientRect(); return r.right <= innerWidth + 1 && r.left >= -1 && r.width > 200; });
  ok(fit, `${tag}: the picture fits the window`);
}
/* the player stops: no frame of its own, and none on the page from it, once it has ended */
async function stopsAfter(p, tag) {
  const a = await p.evaluate(() => [window.__g3.frames, window.__raf]);
  await p.waitForTimeout(1000);
  const b = await p.evaluate(() => [window.__g3.frames, window.__raf]);
  ok(b[0] === a[0], `${tag}: the player asks for no frame after it ends (${b[0] - a[0]} in a second)`);
  ok(b[1] - a[1] <= 2, `${tag}: nothing on the page keeps asking for frames after the explainer ends (${b[1] - a[1]} in a second)`);
}

for (const [vp, view] of [[{ width: 1280, height: 800 }, 'desk'], [{ width: 390, height: 844 }, 'phone']]) for (const dark of [false, true]) {
  const { p, ctx, phone } = await open(vp, { dark });
  const mode = dark ? 'dark' : 'light', tag = `${view} ${mode}`;
  const tap = (sel) => (phone ? p.locator(sel).first().tap() : p.locator(sel).first().click());
  ok(!(await p.evaluate(() => !!window.__g3)), `${tag}: the explainer's player is not part of the first load`);

  for (const id of STOPS) {
    await toStop(p, id);
    const s0 = await state(p);
    ok(s0 && s0.mode === 'ask' && s0.t === 0, `${tag} ${id}: Learn opens on the explainer in ask mode at the start (${JSON.stringify(s0)})`);
    ok(await p.$eval('.g3d', (g) => !!g.closest('.card.why')), `${tag} ${id}: the explainer sits in "Why it works"`);
    await sizes(p, `${tag} ${id}`);
    await p.locator('.g3d').first().scrollIntoViewIfNeeded();
    await p.screenshot({ path: `${SHOTS}/geo3d-${view}-${mode}-${id}-0.png` });
    // keyboard: one step forward tweens to step 1 and stops there
    await p.locator('.g3d').first().focus();
    await p.keyboard.press('ArrowRight');
    ok(await until(p, () => { const g = document.querySelector('.g3d'); return +g.dataset.g3t === 1 && !g.hasAttribute('data-g3playing'); }, null, 5000), `${tag} ${id}: → steps to the next picture and stops there`);
    ok((await p.evaluate(() => window.__bzm.R.ui.watch || 0)) === 0, `${tag} ${id}: the arrow key moved the explainer, not the Learn steps`);
    // Space plays it to the end
    await p.keyboard.press(' ');
    ok(await until(p, () => document.querySelector('.g3d').hasAttribute('data-g3playing'), null, 3000), `${tag} ${id}: Space plays`);
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${SHOTS}/geo3d-${view}-${mode}-${id}-1.png` });
    await p.keyboard.press('End');
    const se = await state(p);
    ok(!se.playing && /Step/.test(se.pos), `${tag} ${id}: End jumps to the last picture and stops (${JSON.stringify(se)})`);
    await stopsAfter(p, `${tag} ${id}`);
    // ask mode says no answer, even at the end; then "Show every step" turns it full, at the same place
    const askEnd = await state(p);
    await p.evaluate(() => window.__bzm.fire('watchAll'));
    await until(p, () => document.querySelector('.g3d[data-g3on]') && document.querySelector('.g3d').dataset.g3mode === 'full');
    const sf = await state(p);
    ok(sf.mode === 'full' && sf.t === askEnd.t, `${tag} ${id}: once the steps are shown the explainer counts in full, where it was (${askEnd.t} → ${sf.t})`);
    await p.locator('.g3d').first().scrollIntoViewIfNeeded();
    await p.screenshot({ path: `${SHOTS}/geo3d-${view}-${mode}-${id}-end.png` });
    // touch / click: back to the start, then Play by its button, to the end
    await tap('.g3d [data-g3b=first]');
    ok((await state(p)).t === 0, `${tag} ${id}: the start button goes back to the first picture`);
    await tap('.g3d [data-g3b=play]');
    const n = await lastStep(p);
    ok(await until(p, (m) => +document.querySelector('.g3d').dataset.g3t === m && !document.querySelector('.g3d').hasAttribute('data-g3playing'), n, 40000), `${tag} ${id}: Play runs to the last picture (${n}) and stops`);
    await stopsAfter(p, `${tag} ${id} (played)`);
    if (id === 'volume-cuboid' || id === 'painted-cubes') {
      const before = await p.$eval('.g3d .g3-stage', (s) => s.innerHTML);
      await tap('.g3d [data-g3b=turn]');
      const turned = await p.$eval('.g3d .g3-stage', (s) => s.innerHTML);
      ok(turned !== before, `${tag} ${id}: Turn turns the solid`);
      const box = await p.locator('.g3d .g3-stage').boundingBox();
      await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await p.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2, { steps: 4 }); await p.mouse.up();
      ok(await p.$eval('.g3d .g3-stage', (s) => s.innerHTML) !== turned, `${tag} ${id}: a drag turns the solid`);
      await p.locator('.g3d').first().focus(); await p.keyboard.press('ArrowUp');
      ok(await p.$eval('.g3d .g3-stage', (s) => s.innerHTML) !== turned, `${tag} ${id}: ↑ turns the solid`);
    }
  }

  // 5 · a drill question shows no explainer; a wrong answer offers one, after the answer, folded
  await p.evaluate(() => { const B = window.__bzm, t = B.tricksIn('clocktower').find((x) => x.id === 'area-rectangles'); const q = t.q({ lv: 2, W: 7, H: 6 }); q.html = t.draw(q); q.trick = t.id; B.startRun('mix', 'Explainer check', [q]); });
  await until(p, () => !!document.querySelector('.runner .qcard'));
  ok(await p.locator('.runner .g3d').count() === 0, `${tag}: a drill question shows no explainer before it is answered`);
  for (const k of '41') await p.keyboard.press(k);
  await p.keyboard.press('Enter');
  await until(p, () => !!document.querySelector('.runner.is-wrong'));
  ok(await p.locator('.runner .g3-more:not([open]) .g3d[data-g3mode=full]').count() === 1, `${tag}: a wrong answer offers the explainer, folded, after the answer`);
  await tap('.runner .g3-more > summary');
  await until(p, () => !!document.querySelector('.runner .g3-more[open] .g3d[data-g3on]'));
  await sizes(p, `${tag} feedback`);
  await p.locator('.runner .g3d [data-g3b=next]').first().focus();
  await p.keyboard.press('Enter');
  ok(await until(p, () => +document.querySelector('.runner .g3d').dataset.g3t >= 1, null, 5000) && (await p.evaluate(() => window.__bzm.R.ui.nav)) === 'run' && (await p.evaluate(() => window.__bzm.R.run.i)) === 0,
    `${tag}: Enter on the explainer's own button steps it — it does not move the drill on`);
  await p.screenshot({ path: `${SHOTS}/geo3d-${view}-${mode}-feedback.png` });
  await p.evaluate(() => window.__bzm.fire('quitRun'));

  // 7 · the Formula Book's moving card
  await p.evaluate(() => { location.hash = '#/lib/formulas|area-circle'; });
  await until(p, () => !!document.querySelector('.t-formulas-move .g3d[data-g3on]'));
  await ready(p);
  await sizes(p, `${tag} formula card`);
  await p.locator('.t-formulas-move').scrollIntoViewIfNeeded();
  await tap('.t-formulas-move [data-g3b=play]');
  const fn = await lastStep(p);
  ok(await until(p, (m) => +document.querySelector('.t-formulas-move .g3d').dataset.g3t === m, fn, 30000), `${tag}: the Formula Book's circle plays to the end`);
  ok(/78\.5/.test(await p.$eval('.t-formulas-move .g3d', (g) => g.textContent)), `${tag}: the card's picture ends on its own example, 78.5`);
  await p.screenshot({ path: `${SHOTS}/geo3d-${view}-${mode}-formula.png` });
  await ctx.close();
}

/* 4 · reduced motion: the device's setting, then Settings' own switch */
for (const [vp, view] of [[{ width: 1280, height: 800 }, 'desk'], [{ width: 390, height: 844 }, 'phone']]) {
  const { p, ctx, phone } = await open(vp, { reduced: true });
  const tap = (sel) => (phone ? p.locator(sel).first().tap() : p.locator(sel).first().click());
  await toStop(p, 'volume-cuboid');
  const s0 = await state(p);
  ok(s0.playHidden, `${view} reduced: there is no Play — the explainer is a sequence of still pictures`);
  const f0 = await p.evaluate(() => [window.__g3.frames, window.__raf]);
  await tap('.g3d [data-g3b=next]');
  const s1 = await state(p);
  ok(s1.t === 1 && !s1.playing, `${view} reduced: Next shows the next still picture at once (t ${s1.t})`);
  await p.locator('.g3d').first().focus();
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight');
  ok((await state(p)).t === 3, `${view} reduced: → steps picture by picture`);
  await p.waitForTimeout(600);
  const f1 = await p.evaluate(() => [window.__g3.frames, window.__raf]);
  ok(f1[0] === f0[0], `${view} reduced: the player never asks for an animation frame (${f1[0] - f0[0]})`);
  await p.locator('.g3d').first().scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${SHOTS}/geo3d-${view}-reduced.png` });
  await ctx.close();
}
{
  const { p, ctx } = await open({ width: 1280, height: 800 });
  await p.evaluate(() => { window.__bzm.R.dev.motion = true; document.documentElement.setAttribute('data-motion', 'reduced'); });
  await toStop(p, 'area-triangles');
  ok((await state(p)).playHidden, 'Settings\' reduce-motion switch hides Play too');
  const f0 = await p.evaluate(() => window.__g3.frames);
  await p.locator('.g3d').first().focus(); await p.keyboard.press('ArrowRight');
  ok((await state(p)).t === 1 && (await p.evaluate(() => window.__g3.frames)) === f0, 'Settings\' reduce-motion switch: a step is a still picture, no frames');
  await ctx.close();
}

ok(!errors.length, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await close();
if (fails()) { console.error(`geo3d-ui: ${fails()} failure(s)`); process.exit(1); }
console.log(`ok geo3d-ui — ${STOPS.length} stops' explainers on desktop and phone, light and dark: keys, taps, turns, stops when done, still under reduced motion, no leak in a drill; the Formula Book's circle`);
