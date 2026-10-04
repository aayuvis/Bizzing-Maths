/* atlas-ui.mjs — the Atlas and motion items of audit v4, in Chromium on the BUILT app:
     · D2  every Sutra Ladder, Counting Court and Contest Hall land on a road (from
           levels.js) is drawn as a named branch — a fork off the road and a signpost
           inside its own land's painting — and listed under the board; a signpost
           selects that land's first stop. The road is still the thing: the board
           starts in the top third at 1280×800 and 390×844 with branches on it.
     · D6  when the child has passed a stop since a board was last shown, the avatar
           walks the road from the old pin to the new one: one animation, ≤ 1.2 s,
           ending on the new pin; the next render does not walk again; under reduced
           motion (system or Settings) nothing walks, but the new pin is remembered.
     · D10 every world board's ambient motes animate, pause when the page is hidden,
           and have animation-name none under reduced motion (system and Settings).
     · N10 a new screen fades in (≤ 200 ms, starting visible); a re-render in place
           does not; the first paint does not; reduced motion does not; focus stays.
   Screenshots land in $SHOTS as atlas-*.png. */
import { site, kidRec, household, checker, SHOTS } from './lib/site.mjs';
import { WORLDS } from '../src/tricks.js';
import { LEVELS } from '../src/levels.js';

const { BASE, browser, close } = await site('atlas', +(process.env.PORT_BASE || 5200) + 8);
const { ok, fails } = checker();
const errors = [];
const BR = { vedic: 'Sutra Ladder', chinese: 'Counting Court', contest: 'Contest Hall' };

async function open(vp, tag, { level = 6, reduced = false } = {}) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  const kid = kidRec('ka', 'Ahana', '11-14', 'hexbee', { journey: { level, done: {}, finished: [], tested: null } });
  await p.addInitScript((h) => { try { if (!localStorage.getItem('bzm_household')) localStorage.setItem('bzm_household', h); } catch {} }, JSON.stringify(household([kid])));
  await p.goto(BASE + '#/home'); await p.waitForSelector('#app main');
  const G = (fn, a) => p.evaluate(fn, a);
  return { p, ctx, G, shot: (n) => p.screenshot({ path: `${SHOTS}/atlas-${tag}-${n}.png` }) };
}
const go = (G, nav, arg) => G(([n, a]) => window.__bzm.go(n, a), [nav, arg ?? null]);
// pass the next step on the child's road, as passing it would record it
const passNext = (G) => G(() => { const { R, J } = window.__bzm, k = R.h.kids[0], p = J.progress(k); const x = p.nodes.find((n) => n.kind === 'stop' && !n.done); k.journey.done[`${x.stop}@${x.lv}`] = Date.now(); });
const walks = (G) => G(() => document.getAnimations().filter((a) => a.id === 'walk').map((a) => ({ dur: a.effect.getTiming().duration, first: a.effect.getKeyframes()[0].translate, last: a.effect.getKeyframes().at(-1).translate, on: a.effect.target.closest('.cur') ? 'cur' : 'other' })));

/* ---- D2: branches, at every level, from levels.js */
for (const [vp, tag] of [[{ width: 1280, height: 800 }, 'desktop'], [{ width: 390, height: 844 }, 'phone']]) {
  const { p, ctx, G, shot } = await open(vp, tag);
  await go(G, 'atlas'); await p.waitForSelector('.lboard');
  for (const L of LEVELS) {
    await G((n) => window.__bzm.fire('jlv', n), L.n); await p.waitForTimeout(60);
    const want = L.lands.filter((l) => BR[l.concept]).map((l) => BR[l.concept]);
    const got = await G(() => [...document.querySelectorAll('.lboard .br-sign')].map((s) => {
      const r = s.getBoundingClientRect(), b = document.querySelector('.lboard').getBoundingClientRect();
      const panels = [...document.querySelectorAll('.lboard .panel')].map((x) => x.getBoundingClientRect());
      const inside = panels.findIndex((q) => r.left >= q.left - 1 && r.right <= q.right + 1);
      return { name: s.querySelector('b').textContent, inside, panel: panels.length, top: (r.top - b.top) / b.height, bottom: (r.bottom - b.top) / b.height, arg: +s.dataset.arg };
    }));
    ok(JSON.stringify(got.map((x) => x.name)) === JSON.stringify(want), `${tag} L${L.n}: signposts ${JSON.stringify(got.map((x) => x.name))}, levels.js says ${JSON.stringify(want)}`);
    const landIdx = L.lands.map((l, i) => (BR[l.concept] ? i : -1)).filter((i) => i >= 0);
    const recap = got.length && got[0].panel > L.lands.length ? 1 : 0;
    got.forEach((x, i) => ok(x.inside === landIdx[i] + recap, `${tag} L${L.n}: the ${x.name} signpost stands inside its own land's painting (panel ${x.inside}, want ${landIdx[i] + recap})`));
    got.forEach((x) => ok(x.top > 0.25 && x.bottom < 0.66, `${tag} L${L.n}: the ${x.name} signpost stands above the road, under the land's name (${x.top.toFixed(2)}–${x.bottom.toFixed(2)})`));
    const forks = await G(() => document.querySelectorAll('.lboard svg.road .br-rd').length);
    ok(forks === want.length, `${tag} L${L.n}: one fork off the road per branch (${forks})`);
    const list = await G(() => [...document.querySelectorAll('.road-branches .rbr b')].map((b) => b.textContent));
    ok(JSON.stringify(list) === JSON.stringify(want), `${tag} L${L.n}: the branches are listed under the board`);
    if (L.n === 6) {
      await p.evaluate(() => window.scrollTo(0, 0));
      await shot('road-branches');
      // the road is still the thing: the board starts in the top third under the bar, and the page never scrolls sideways
      const m = await G(() => { const bar = document.querySelector('[data-bz=header]').getBoundingClientRect().bottom, nav = document.querySelector('[data-bz=tabbar]'), bottom = nav && getComputedStyle(nav).display !== 'none' ? nav.getBoundingClientRect().top : innerHeight; const r = document.querySelector('.board-scroll').getBoundingClientRect(); return { start: (r.top - bar) / (bottom - bar), wide: document.documentElement.scrollWidth > innerWidth + 1 }; });
      ok(m.start <= 0.35 && !m.wide, `${tag}: with branches the road board still starts ${Math.round(m.start * 100)}% down (≤ 35%) and nothing scrolls sideways`);
      // and the branches are seen without scrolling: the whole list on a desktop, the first of them on a phone
      const seen = await G((sel) => { const el = document.querySelector(sel); if (!el) return false; const r = el.getBoundingClientRect(), nav = document.querySelector('[data-bz=tabbar]'), bottom = nav && getComputedStyle(nav).display !== 'none' ? nav.getBoundingClientRect().top : innerHeight; return r.top >= 0 && r.bottom <= bottom; }, tag === 'phone' ? '.road-branches .rbr' : '.road-branches');
      ok(seen, `${tag}: the branches off the road are in view without scrolling`);
      // a signpost selects that branch's first stop, and the card names its place
      const ladder = got.find((x) => x.name === 'Sutra Ladder');
      ok(ladder, `${tag}: the Level 6 road has a Sutra Ladder signpost`);
      if (ladder) {
        // from the list under the board: the branch is selected AND brought into view on the board
        await p.click(`.road-branches .rbr[data-arg="${ladder.arg}"]`); await p.waitForTimeout(700);
        const card = await G(() => { const s = document.querySelector('.lboard .br-sign.on') || document.querySelector(`.lboard .br-sign[data-arg="${window.__bzm.R.ui.rpick}"]`), sc = document.querySelector('.board-scroll').getBoundingClientRect(), r = s.getBoundingClientRect();
          return { rpick: window.__bzm.R.ui.rpick, kicker: document.querySelector('.card.pick .kicker').textContent, nav: window.__bzm.R.ui.nav, inView: r.left >= sc.left && r.right <= sc.right }; });
        ok(card.rpick === ladder.arg && /Ladder/.test(card.kicker) && card.nav === 'atlas', `${tag}: the Sutra Ladder branch selects its first stop (${JSON.stringify(card)})`);
        ok(card.inView, `${tag}: and the board scrolls its signpost into view`);
        await p.evaluate(() => window.scrollTo(0, 0));
        await shot('road-branch-picked');
        // and the signpost on the board does the same
        await G(() => { window.__bzm.R.ui.rpick = null; window.__bzm.render(); });
        await p.click(`.lboard .br-sign[data-arg="${ladder.arg}"]`); await p.waitForTimeout(100);
        ok(await G(() => window.__bzm.R.ui.rpick) === ladder.arg, `${tag}: the signpost on the board selects the branch too`);
      }
    }
  }
  await G(() => window.__bzm.fire('jlv', 6));
  await ctx.close();
}

/* ---- D6: walking to the next pin — on the road and on a world board */
{
  const { p, ctx, G, shot } = await open({ width: 1280, height: 800 }, 'walk');
  await go(G, 'atlas'); await p.waitForSelector('.lboard .cur .me');
  ok((await walks(G)).length === 0, 'the first sight of a road walks nobody (nothing to walk from)');
  await passNext(G); await go(G, 'home'); await go(G, 'atlas'); await p.waitForTimeout(30);
  let w = await walks(G);
  ok(w.length === 1 && w[0].on === 'cur', `after a pass, returning to the road walks the avatar once (${JSON.stringify(w)})`);
  ok(w.length && w[0].dur <= 1200 && w[0].dur >= 300, `the walk is short: ${w[0] && w[0].dur} ms (≤ 1200)`);
  ok(w.length && w[0].first !== '0px 0px' && /^-/.test(w[0].first) && /^0px( 0px)?$/.test(w[0].last), `it starts back at the old pin and ends on the new one (${w[0] && w[0].first} → ${w[0] && w[0].last})`);
  await p.waitForTimeout(450); await shot('road-walking');
  await p.waitForTimeout(900);
  await G(() => window.__bzm.render()); await go(G, 'home'); await go(G, 'atlas'); await p.waitForTimeout(30);
  ok((await walks(G)).length === 0, 'once per pass: the road shown again does not walk again');
  // a world board: a child off the journey
  await G(() => { const k = window.__bzm.R.h.kids[0]; k.journey.level = 0; k.band = '6-7'; });
  await go(G, 'world', 'gardens'); await p.waitForSelector('.board .cur .me');
  ok((await walks(G)).length === 0, 'the first sight of a world board walks nobody');
  await G(() => { const { R, tricksIn } = window.__bzm, k = R.h.kids[0]; k.tricks[tricksIn('gardens')[0].id] = { stars: 2 }; });
  await go(G, 'home'); await go(G, 'world', 'gardens'); await p.waitForTimeout(30);
  w = await walks(G);
  ok(w.length === 1 && w[0].dur <= 1200 && /^0px( 0px)?$/.test(w[0].last), `after a pass, returning to the world board walks the avatar to the new pin (${JSON.stringify(w)})`);
  await p.waitForTimeout(1300); await G(() => window.__bzm.render());
  ok((await walks(G)).length === 0, 'and a re-render of the board does not walk again');
  // Settings' reduced motion: no walk, but the new pin is remembered
  await G(() => { document.documentElement.setAttribute('data-motion', 'reduced'); const { R, tricksIn } = window.__bzm, k = R.h.kids[0]; k.tricks[tricksIn('gardens')[1].id] = { stars: 2 }; });
  await go(G, 'home'); await go(G, 'world', 'gardens'); await p.waitForTimeout(30);
  ok((await walks(G)).length === 0, 'under Settings\' reduced motion nobody walks');
  const seen = await G(() => (window.__bzm.R.ui.walked || {})['w:gardens']);
  ok(seen === 2, `but the new pin is remembered, so the walk does not wait to happen later (${seen})`);
  await ctx.close();
}
{
  const { p, ctx, G } = await open({ width: 1280, height: 800 }, 'walk-reduced', { reduced: true });
  await go(G, 'atlas'); await p.waitForSelector('.lboard .cur .me');
  await passNext(G); await go(G, 'home'); await go(G, 'atlas'); await p.waitForTimeout(30);
  ok((await walks(G)).length === 0, 'under prefers-reduced-motion nobody walks');
  await ctx.close();
}

/* ---- D10: every world's ambient life runs, pauses when hidden, and is none under reduced motion */
for (const reduced of [false, true]) {
  const { p, ctx, G, shot } = await open({ width: 1280, height: 800 }, reduced ? 'amb-reduced' : 'amb', { level: 0, reduced });
  await G(() => { window.__bzm.R.h.parent.tester = true; });
  for (const w of WORLDS) {
    await go(G, 'world', w.id); await p.waitForSelector(`.board .amb.amb-${w.id}`, { state: 'attached' });
    const a = await G(() => { const is = [...document.querySelectorAll('.board .amb i')].filter((i) => getComputedStyle(i).display !== 'none'); const cs = is.map((i) => getComputedStyle(i)); return { n: is.length, names: [...new Set(cs.map((c) => c.animationName))], play: [...new Set(cs.map((c) => c.animationPlayState))], vis: getComputedStyle(document.querySelector('.board .amb')).visibility }; });
    if (!reduced) ok(a.n > 0 && !a.names.includes('none') && a.play.join() === 'running', `${w.id}: the ambient life runs (${JSON.stringify(a)})`);
    else ok(a.names.join() === 'none' && a.vis === 'hidden', `${w.id}: under prefers-reduced-motion the ambient life is still (${JSON.stringify(a)})`);
    if (!reduced) {
      const hid = await G(() => { document.documentElement.setAttribute('data-hidden', ''); const s = [...new Set([...document.querySelectorAll('.board .amb i')].map((i) => getComputedStyle(i).animationPlayState))]; document.documentElement.removeAttribute('data-hidden'); return s; });
      ok(hid.join() === 'paused', `${w.id}: paused when the page is hidden (${hid})`);
      const set = await G(() => { document.documentElement.setAttribute('data-motion', 'reduced'); const s = [...new Set([...document.querySelectorAll('.board .amb i')].map((i) => getComputedStyle(i).animationName))]; document.documentElement.removeAttribute('data-motion'); return s; });
      ok(set.join() === 'none', `${w.id}: none under Settings' reduced motion (${set})`);
      if (['court', 'bakery', 'ladder', 'harbour'].includes(w.id)) { await p.waitForTimeout(900); await shot(`world-${w.id}`); }
    } else if (w.id === 'court') await shot('world-court');
  }
  await ctx.close();
}

/* ---- N10: route transitions */
for (const reduced of [false, true]) {
  const { p, ctx, G } = await open({ width: 1280, height: 800 }, reduced ? 'route-reduced' : 'route', { reduced });
  const fade = () => G(() => { const m = document.getElementById('main'), c = getComputedStyle(m); return { cls: m.classList.contains('route-in'), name: c.animationName, dur: parseFloat(c.animationDuration) * (c.animationDuration.endsWith('ms') ? 1 : 1000) }; });
  const first = await fade();
  ok(!first.cls, 'the first paint of the app does not fade');
  await go(G, 'library'); await p.waitForSelector('.lib-grid');
  const f = await fade();
  if (!reduced) ok(f.cls && f.name === 'route-in' && f.dur > 0 && f.dur <= 200, `a new screen fades in, ≤ 200 ms (${JSON.stringify(f)})`);
  else ok(f.name === 'none' || !f.cls, `under prefers-reduced-motion a new screen does not fade (${JSON.stringify(f)})`);
  // the core is painted at once: on the first frame the screen is already mostly visible
  if (!reduced) {
    const op = await G(() => { window.__bzm.go('goals'); const o = +getComputedStyle(document.getElementById('main')).opacity; return o; });
    ok(op >= 0.5, `the core shows on the first frame (opacity ${op})`);
  }
  await G(() => window.__bzm.render());
  ok(!(await fade()).cls, 'a re-render in place does not fade');
  // focus is the app's, not the fade's: mid-fade the new screen is live — not inert, not hidden from
  // assistive tech, takes taps — and its first control takes focus at once
  const mid = await G(() => { window.__bzm.go('puzzles'); const m = document.getElementById('main'), b = m.querySelector('button, a[href]'); b.focus();
    return { fading: m.classList.contains('route-in'), inert: m.inert || !!m.closest('[inert],[aria-hidden="true"]'), pe: getComputedStyle(m).pointerEvents, focused: document.activeElement === b }; });
  ok(!mid.inert && mid.pe !== 'none' && mid.focused && (reduced || mid.fading), `mid-fade the new screen is live and takes focus (${JSON.stringify(mid)})`);
  if (!reduced) {
    await G(() => document.documentElement.setAttribute('data-motion', 'reduced'));
    await go(G, 'play'); const s = await fade();
    ok(!s.cls || s.name === 'none', `under Settings' reduced motion a new screen does not fade (${JSON.stringify(s)})`);
  }
  await ctx.close();
}

await close();
if (errors.length) console.error(errors.join('\n'));
ok(!errors.length, `no page errors (${errors.length})`);
console.log(`${fails() ? 'FAIL' : 'ok'} atlas-ui — branches on the road, walking to the next pin, ambient life, route transitions`);
if (fails()) process.exit(1);
