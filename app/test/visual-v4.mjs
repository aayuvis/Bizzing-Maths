/* test/visual-v4.mjs — the visual findings of audit v4, measured from the live DOM of the BUILT app,
   desktop 1280 and phone 390. Each check was watched to fail on the old build before it was trusted.

   1 · the Contest Hall draws no emoji (pins, headings, index), and the child's marker covers no pin's icon
   2 · with no child yet, the top bar shows no empty avatar pill and no tab row
   3 · Me: "Your progress" spans the page; the trick of the day's title sits in its text column under the kicker
   4 · Number Rush: a painted stage that starts below the bar, bubbles that arrive whole and big, a splash on pop
       that holds still under reduced motion
   5 · Shop: an avatar card is never blank while its picture loads */
import { site, household, kidRec, checker, SHOTS } from './lib/site.mjs';

const { BASE, browser, close } = await site('v4', +(process.env.PORT_BASE || 5200) + 9);
const { ok, fails } = checker();
const errors = [];
const EMOJI = /\p{Extended_Pictographic}/u;
const seeded = () => household([kidRec('ka', 'Ahana', '8-10', 'hexbee', { xp: 140 })], { plan: 'family' });
async function open(vp, h, url = '', o = {}) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: vp.width < 500, hasTouch: vp.width < 500, reducedMotion: o.reduced ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  if (o.block) await p.route(o.block, () => new Promise(() => {}));   // a picture that never arrives
  if (h) await p.addInitScript((hh) => { try { if (!localStorage.getItem('bzm_household')) localStorage.setItem('bzm_household', JSON.stringify(hh)); } catch {} }, h);
  await p.goto(BASE + url, { waitUntil: o.block ? 'domcontentloaded' : 'load' }); await p.waitForTimeout(400);
  return { p, ctx };
}
const hits = (a, b, pad = 0) => a.left < b.right - pad && b.left < a.right - pad && a.top < b.bottom - pad && b.top < a.bottom - pad;

for (const [vp, tag] of [[{ width: 1280, height: 800 }, 'desk'], [{ width: 390, height: 844 }, 'phone']]) {
  /* 1 · the Contest Hall */
  {
    const { p, ctx } = await open(vp, seeded(), '#/hall');
    await p.waitForSelector('.hall .bpin'); await p.waitForTimeout(300);
    const txt = await p.$eval('.hall', (e) => e.innerText);
    const em = [...txt.matchAll(new RegExp(EMOJI.source, 'gu'))].map((m) => m[0]);
    ok(em.length === 0, `${tag}: the Contest Hall draws no emoji — pins, headings and index are icons (got ${em.join(' ')})`);
    ok(await p.$$eval('.hall .bpin', (b) => b.every((x) => x.querySelector('.hall-g svg'))), `${tag}: every Hall pin carries an SVG icon`);
    const cover = await p.evaluate(() => {
      const me = document.querySelector('.hall .bpin .me'); if (!me) return ['no marker'];
      const m = me.getBoundingClientRect(), out = [];
      for (const pin of document.querySelectorAll('.hall .bpin')) for (const el of [pin.querySelector('.hall-g'), pin.querySelector(':scope > span')]) {
        if (!el) continue; const r = el.getBoundingClientRect();
        if (m.left < r.right && r.left < m.right && m.top < r.bottom && r.top < m.bottom) out.push(pin.getAttribute('aria-label') + ' ' + el.className);
      }
      return out;
    });
    ok(cover.length === 0, `${tag}: the child's marker covers no pin's icon or number (${cover.join(' | ')})`);
    await p.screenshot({ path: `${SHOTS}/v4-${tag}-hall.png` });
    await ctx.close();
  }
  /* 2 · landing with no child */
  {
    const { p, ctx } = await open(vp, null, '');
    const vis = (sel) => p.$$eval(sel, (els) => els.some((e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; }));
    ok(!(await vis('[data-bz=kid]')), `${tag}: no avatar pill in the bar before a child exists`);
    ok(!(await vis('[data-bz=tabs]')) && !(await vis('[data-bz=tabbar]')), `${tag}: no tab row before a child exists`);
    await p.screenshot({ path: `${SHOTS}/v4-${tag}-landing.png` });
    await ctx.close();
    const k = await open(vp, seeded(), '#/home');
    ok(await k.p.$eval('[data-bz=kid]', (e) => e.getBoundingClientRect().width > 0), `${tag}: with a child, the avatar pill is back`);
    await k.ctx.close();
  }
  /* 3 · Me */
  {
    const { p, ctx } = await open(vp, seeded(), '#/me');
    await p.waitForSelector('.me-page');
    const w = await p.evaluate(() => { const pg = document.querySelector('.me-page').getBoundingClientRect(), y = document.querySelector('.me-page > .yatra').getBoundingClientRect(); return [Math.round(y.width), Math.round(pg.width)]; });
    ok(w[0] >= w[1] - 2, `${tag}: "Your progress" spans the page, no blank beside it (${w[0]} of ${w[1]}px)`);
    const td = await p.evaluate(() => {
      const c = document.querySelector('.me-page .trick-day'), k = c.querySelector('.kick').getBoundingClientRect(), img = c.querySelector('img').getBoundingClientRect();
      const t = c.querySelector('b').getBoundingClientRect(), para = c.querySelector('p').getBoundingClientRect(), go = c.querySelector('button').getBoundingClientRect();
      const ink = (e) => { const r = document.createRange(); r.selectNodeContents(e); return r.getBoundingClientRect(); };
      const tl = ink(c.querySelector('b'));
      return { gap: Math.round(t.top - k.bottom), left: Math.round(tl.left - img.right), col: Math.round(Math.max(Math.abs(para.left - t.left), Math.abs(go.left - t.left))) };
    });
    ok(td.gap >= 0 && td.gap <= 16 && td.left >= 0 && td.left <= 24 && td.col <= 2, `${tag}: the trick of the day's title sits under its kicker, beside Aryabhata, with its words below it (${JSON.stringify(td)})`);
    await p.screenshot({ path: `${SHOTS}/v4-${tag}-me.png`, fullPage: true });
    await ctx.close();
  }
  /* 4 · Number Rush */
  for (const reduced of [false, true]) {
    const { p, ctx } = await open(vp, seeded(), '#/play', { reduced });
    await p.click('[data-act=play][data-arg=rush]'); await p.waitForSelector('.g-intro, .rush-stage'); await p.evaluate(() => { const i = document.querySelector('.g-intro'); if (i) i.click(); }); await p.waitForSelector('.rush-stage');   // the title card also starts itself
    const g = (f) => p.evaluate(f);
    const geo = await g(() => { const b = document.querySelector('.play-bar').getBoundingClientRect(), s = document.querySelector('.rush-stage'), r = s.getBoundingClientRect(), cs = getComputedStyle(s);
      const blur = (cs.backdropFilter.match(/blur\(([\d.]+)px\)/) || [0, 0])[1], sat = (cs.backdropFilter.match(/saturate\(([\d.]+)\)/) || [0, 1])[1];
      const a = cs.backgroundColor.match(/[\d.]+/g).map(Number);
      return { gap: Math.round(r.top - b.bottom), blur: +blur, sat: +sat, alpha: a.length > 3 ? a[3] : (a.every((v) => v === 0) ? 0 : 1) }; });
    if (!reduced) {
      ok(geo.gap >= 6, `${tag}: the Rush stage starts below the bar (gap ${geo.gap}px)`);
      ok(geo.blur <= 2 && geo.sat >= 1 && geo.alpha <= 0.2, `${tag}: the Rush stage shows its painted sky, not a pale veil (blur ${geo.blur}px, saturate ${geo.sat}, wash ${geo.alpha})`);
    }
    // bubbles arrive whole inside the stage, and big
    const seen = [];
    for (let i = 0; i < 12; i++) { seen.push(...await g(() => window.__bzmGames.active().probe.bubbles())); await p.waitForTimeout(120); }
    const cut = seen.filter((b) => b.y - b.r < -0.5), small = seen.filter((b) => b.r < (vp.width < 500 ? 46 : 52));
    if (!reduced) {
      ok(seen.length > 0 && cut.length === 0, `${tag}: no bubble is cut by the top of the stage (${cut.length} of ${seen.length} cut)`);
      ok(seen.length > 0 && small.length === 0, `${tag}: Rush bubbles are big (${[...new Set(seen.map((b) => Math.round(b.r)))].join(',')}px radius)`);
      await p.screenshot({ path: `${SHOTS}/v4-${tag}-rush.png` });
    }
    await p.waitForFunction(() => window.__bzmGames.active().probe.answers().length > 0, null, { timeout: 8000 });
    const a = await g(() => window.__bzmGames.active().probe.answers()[0]);
    for (const ch of a) await p.keyboard.press(ch);
    await p.waitForTimeout(60);
    const sp = await g(() => { const s = document.querySelector('.rush-stage .gsplash'); if (!s) return null;
      return { n: s.querySelectorAll('*').length, moving: [s, ...s.querySelectorAll('*')].filter((e) => getComputedStyle(e).animationName !== 'none' && !/fade/.test(getComputedStyle(e).animationName)).length }; });
    if (!reduced) {
      ok(sp && sp.n >= 6 && sp.moving > 0, `${tag}: a popped bubble splashes (${JSON.stringify(sp)})`);
      await p.screenshot({ path: `${SHOTS}/v4-${tag}-rush-pop.png` });
    } else ok(sp && sp.moving === 0, `${tag}: under reduced motion the splash holds still (${JSON.stringify(sp)})`);
    await g(() => window.__bzmGames.active().quit());
    await ctx.close();
  }
  /* 5 · Shop: no blank avatar card while its picture is on the way */
  {
    const { p, ctx } = await open(vp, seeded(), '#/shop', { block: '**/avatars/**' });
    await p.waitForSelector('.bz-av'); await p.waitForTimeout(300);
    const blank = await p.$$eval('.bz-av', (cs) => cs.filter((c) => c.getBoundingClientRect().top < innerHeight).filter((c) => {
      const i = c.querySelector('img'); if (!i) return true;
      const r = i.getBoundingClientRect(), cs2 = getComputedStyle(i);
      return r.height < 40 || r.width < 40 || (cs2.backgroundImage === 'none' && /rgba\(0, 0, 0, 0\)|transparent/.test(cs2.backgroundColor));
    }).map((c) => c.dataset.id));
    ok(blank.length === 0, `${tag}: every avatar card holds a sized, tinted placeholder before its picture arrives (blank: ${blank.slice(0, 6).join(', ')})`);
    await p.screenshot({ path: `${SHOTS}/v4-${tag}-shop-loading.png` });
    await ctx.close();
  }
}

ok(!errors.length, 'no page errors: ' + errors.slice(0, 4).join(' | '));
await close();
console.log(`${fails() ? 'FAIL' : 'ok'} visual-v4 — the Hall in icons, no empty pill before a child, Me laid out, Rush painted and whole, Shop cards never blank`);
process.exit(fails() ? 1 : 0);
