/* test/feed-ui.mjs — My Feed in the BUILT app (FAMILY-STANDARD §6a), desktop and phone, light and dark.

   The last tab, after Play, with the feed icon, and a row in ☰; the family's head, about twenty
   cards, the finished card pointing at Continue; no sideways scroll at 390px; text on every card
   passes AA in all six worlds by day and by night; a card's question works by keyboard (1–4 on
   the focused card) AND by touch, a right answer pays once and a wrong one holds with "Not this
   time — it is …" until Continue; j/k step card to card; the grown-up's switch takes the tab, the
   ☰ row and the screen away; ?demo shows a feed and writes nothing. Run after `npm run build`. */
import { site, kidRec, household, checker, SHOTS } from './lib/site.mjs';

const { ok, fails } = checker();
const { BASE, browser, close } = await site('feed', +(process.env.PORT_BASE || 5200) + 5);
const errors = [];
const seed = () => household([kidRec('ka', 'Asha', '8-10', 'hexbee', { journey: { level: 3, done: {}, finished: [], tested: null } })], { plan: 'family' });
async function open(vp, mode = 'light', { demo = false, hh = seed() } = {}) {
  const ctx = await browser.newContext({ viewport: vp, colorScheme: mode, isMobile: vp.width < 500, hasTouch: vp.width < 500 });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(e.message));
  if (!demo) await p.addInitScript((h) => { try { if (!localStorage.getItem('bzm_household')) localStorage.setItem('bzm_household', JSON.stringify(h)); } catch {} }, hh);
  return { ctx, p };
}
const toFeed = async (p) => { await p.evaluate(() => window.__bzm.go('feed')); await p.waitForSelector('.bzf-card[data-kind]', { timeout: 15000 }); };
const coins = (p) => p.evaluate(() => +(document.querySelector('[data-bz=coins]')?.textContent.replace(/\D+/g, '') || 0));
function lum(c) { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

for (const [vp, tag] of [[{ width: 1280, height: 800 }, 'desk'], [{ width: 390, height: 844 }, 'phone']]) {
  for (const mode of ['light', 'dark']) {
    const { ctx, p } = await open(vp, mode);
    const reqs = []; p.on('request', (r) => { if (/\/assets\/g-(L\d+|any)-/.test(r.url())) reqs.push(r.url()); });
    await p.goto(BASE); await p.waitForSelector('.home2');
    ok(!reqs.length, `${tag} ${mode}: no feed data on the first screen`);
    const tabs = await p.$$eval(vp.width < 500 ? '[data-bz=tabbar] a' : '[data-bz=tabs] [data-bz=tab]', (as) => as.map((a) => [a.getAttribute('href'), a.textContent.trim(), !!a.querySelector('svg')]));
    ok(tabs.length === 6 && tabs.at(-1)[0] === '#/feed' && tabs.at(-1)[1] === 'My Feed' && tabs.at(-1)[2] && tabs.at(-2)[0] === '#/play', `${tag} ${mode}: My Feed is the sixth and last tab, after Play, with its icon (${tabs.map((t) => t[1]).join(' · ')})`);
    ok(await p.locator('[data-bz=drawer] a[href="#/feed"]').count() === 1, `${tag} ${mode}: ☰ has a My Feed row`);
    await toFeed(p);
    const s = await p.evaluate(() => ({ head: !!document.querySelector('[data-bz=phead]'), cards: document.querySelectorAll('.bzf-card[data-kind]').length, end: document.querySelector('[data-bz=feed-end]'),
      endHref: document.querySelector('[data-bz=feed-end] a')?.getAttribute('href'), last: document.querySelector('.bzf-list').lastElementChild.dataset.bz,
      wide: document.documentElement.scrollWidth, media: document.querySelectorAll('audio,video,[autoplay]').length, words: [...document.querySelectorAll('[data-bz=phead], .bzf-why, .bzf-top, .bzf-row, .bzf-opts, [data-bz=feed-end]')].map((e) => e.innerText).join(' | '),
      whys: [...document.querySelectorAll('.bzf-why')].every((e) => e.textContent.trim().length > 3) }));
    ok(s.head && s.cards >= 10 && s.cards <= 20 && s.end && s.last === 'feed-end' && s.endHref === '#/continue', `${tag} ${mode}: the page head, ${s.cards} cards, then the finished card pointing at Continue`);
    ok(s.whys, `${tag} ${mode}: every card says why it is there`);
    const fg = await p.evaluate(() => window.__bzm.feedGroups());
    ok(fg.needed.length >= 1 && JSON.stringify(fg.loaded) === JSON.stringify(fg.needed) && reqs.every((u) => fg.loaded.some((g) => u.includes(`/g-${g}-`))), `${tag} ${mode}: the feed loads only the groups its session needs (${fg.loaded.join(', ')}; fetched ${reqs.length})`);
    ok(s.wide <= vp.width, `${tag} ${mode}: no sideways scroll (${s.wide}px)`);
    ok(s.media === 0 && !/\b(likes?|streaks?|days in a row|followers)\b/i.test(s.words), `${tag} ${mode}: no likes, counts, streaks or autoplay`);
    // contrast in every world, on the card, its why, its question and its button
    for (const w of ['graph', 'chalk', 'blueprint', 'orbit', 'rangoli', 'arcade']) {
      await p.evaluate((id) => window.__bzm.fire('theme', id), w); await p.waitForSelector('.bzf-card[data-kind]'); await p.waitForTimeout(150);
      const pairs = await p.evaluate(() => {
        // the colour actually behind the text: translucent layers composited down to the first opaque one
        const solid = (el) => {
          const layers = [];
          for (let e = el; e; e = e.parentElement) { const m = getComputedStyle(e).backgroundColor.match(/[\d.]+/g).map(Number); const a = m.length > 3 ? m[3] : 1; if (a > 0) layers.push([m[0], m[1], m[2], a]); if (a >= 1) break; }
          let c = layers.length && layers.at(-1)[3] >= 1 ? layers.pop().slice(0, 3) : [255, 255, 255];
          for (const [r, g, b, a] of layers.reverse()) c = [r * a + c[0] * (1 - a), g * a + c[1] * (1 - a), b * a + c[2] * (1 - a)];
          return `rgb(${c.map(Math.round).join(',')})`;
        };
        const out = [];
        for (const sel of ['.bzf-card h3', '.bzf-body', '.bzf-why', '.bzf-src', '.bzf-q', '.bzf-opt', '.bzf-row .bz-btn', '.bzf-badge']) {
          const el = document.querySelector(sel); if (el) out.push([sel, getComputedStyle(el).color, solid(el)]);
        }
        return out;
      });
      const low = pairs.filter(([, fg, bg]) => contrast(fg, bg) < 4.5).map(([sel, fg, bg]) => `${sel} ${contrast(fg, bg).toFixed(2)}`);
      ok(pairs.length >= 5 && !low.length, `${tag} ${mode}: ${w} — My Feed passes AA (${low.join(', ') || pairs.length + ' pairs'})`);
    }
    await p.screenshot({ path: `${SHOTS}/feed-${tag}-${mode}.png` });
    await ctx.close();
  }
}

/* a card's question: keyboard on the desktop, touch on the phone; right pays once, wrong holds */
for (const [vp, tag] of [[{ width: 1280, height: 800 }, 'keyboard'], [{ width: 390, height: 844 }, 'touch']]) {
  const { ctx, p } = await open(vp);
  await p.goto(BASE); await p.waitForSelector('.home2'); await toFeed(p);
  const ids = await p.$$eval('.bzf-card[data-kind]', (cs) => cs.filter((c) => c.querySelector('.bzf-opt')).map((c) => c.dataset.id));
  ok(ids.length >= 2, `${tag}: at least two cards ask a question (${ids.length})`);
  ok(!(await p.locator('.bzf-after').count()), `${tag}: no answer is on the page before it is given`);
  const before = await coins(p);
  const card = (id) => `.bzf-card[data-id="${id}"]`;
  // right
  const rightIx = await p.$$eval(`${card(ids[0])} .bzf-opt`, (bs) => bs.findIndex((b) => b.dataset.o === '0'));
  if (tag === 'keyboard') { await p.focus(card(ids[0])); await p.keyboard.press(String(rightIx + 1)); } else await p.tap(`${card(ids[0])} .bzf-opt[data-o="0"]`);
  await p.waitForSelector(`${card(ids[0])} .bzf-after.ok`);
  ok(await coins(p) === before + 1, `${tag}: a right answer pays one coin (${before} → ${await coins(p)})`);
  ok(await p.$$eval(`${card(ids[0])} .bzf-opt`, (bs) => bs.every((b) => b.disabled)), `${tag}: and the card is answered — it cannot pay twice`);
  // wrong
  const wrongIx = await p.$$eval(`${card(ids[1])} .bzf-opt`, (bs) => bs.findIndex((b) => b.dataset.o !== '0'));
  if (tag === 'keyboard') { await p.focus(card(ids[1])); await p.keyboard.press(String(wrongIx + 1)); } else await p.tap(`${card(ids[1])} .bzf-opt:not([data-o="0"])`);
  await p.waitForSelector(`${card(ids[1])} [data-bzf=cont]`);
  ok(/^Not this time — it is “/.test(await p.$eval(`${card(ids[1])} .bzf-after`, (e) => e.textContent)) && await coins(p) === before + 1, `${tag}: a wrong answer holds with "Not this time — it is …" and pays nothing`);
  await p.waitForTimeout(800);
  ok(await p.locator(`${card(ids[1])} [data-bzf=cont]`).count() === 1, `${tag}: it holds until Continue`);
  if (tag === 'keyboard') { await p.focus(`${card(ids[1])} [data-bzf=cont]`); await p.keyboard.press('Enter'); } else await p.tap(`${card(ids[1])} [data-bzf=cont]`);
  await p.waitForTimeout(200);
  ok(await p.locator(`${card(ids[1])} .bzf-opt`).count() === 0, `${tag}: Continue moves on`);
  if (tag === 'keyboard') {
    await p.focus('.bzf-card[data-kind]'); await p.keyboard.press('j'); await p.waitForTimeout(100);
    const at = await p.evaluate(() => [...document.querySelectorAll('.bzf-card')].indexOf(document.activeElement));
    await p.keyboard.press('k'); await p.waitForTimeout(100);
    const back = await p.evaluate(() => [...document.querySelectorAll('.bzf-card')].indexOf(document.activeElement));
    ok(at === 1 && back === 0, `j and k step card to card (${at}, ${back})`);
  }
  // scrolling earns nothing
  const c0 = await coins(p); await p.mouse.wheel(0, 4000); await p.waitForTimeout(300);
  ok(await coins(p) === c0, `${tag}: scrolling earns nothing`);
  await ctx.close();
}

/* the grown-up's switch takes it away, behind the PIN */
{
  const { ctx, p } = await open({ width: 1280, height: 800 });
  await p.goto(BASE); await p.waitForSelector('.home2');
  await p.evaluate(() => window.__bzm.go('grownups'));
  for (const d of '1234') await p.keyboard.press(d);
  await p.waitForSelector('[data-act=toggle][data-arg=feed]');
  ok(await p.getAttribute('[data-act=toggle][data-arg=feed]', 'aria-checked') === 'true', 'the switch is on by default');
  await p.click('[data-act=toggle][data-arg=feed]'); await p.waitForTimeout(200);
  ok(await p.locator('[data-bz=tab][href="#/feed"]').count() === 0 && await p.locator('[data-bz=drawer] a[href="#/feed"]').count() === 0, 'switched off: no tab and no ☰ row');
  await p.evaluate(() => window.__bzm.go('feed')); await p.waitForTimeout(300);
  ok(await p.locator('.bzf-card[data-kind]').count() === 0 && /switched off/.test(await p.textContent('main')), '#/feed says it is switched off');
  await p.waitForTimeout(400); await p.goto(BASE + '#/home'); await p.reload(); await p.waitForSelector('.home2');
  ok(await p.locator('[data-bz=tab][href="#/feed"]').count() === 0, 'and it stays off');
  await p.screenshot({ path: `${SHOTS}/feed-off.png` });
  await ctx.close();
}

/* ?demo shows a feed and writes nothing */
{
  const { ctx, p } = await open({ width: 390, height: 844 }, 'light', { demo: true });
  await p.goto(BASE + '?demo'); await p.waitForSelector('.home2'); await toFeed(p);
  await p.tap('.bzf-card .bzf-opt[data-o="0"]').catch(() => {});
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => localStorage.length) === 0, '?demo writes nothing');
  await ctx.close();
}

ok(!errors.length, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await close();
if (fails()) { console.error(`feed-ui: ${fails()} failure(s)`); process.exit(1); }
console.log('ok feed-ui — the sixth tab and its ☰ row, ~20 cards and an ending, AA in 6 worlds day and night, keyboard and touch, pays once, PIN switch, demo writes nothing');
