/* collection-ui.mjs — the Collection is Bizzing Bee's (the owner: "we should have collections like
   this (ref bizzing bee)"), in Chromium on the BUILT app, at 1280×800 and 390×844, light and dark:
     · ‹ Home, "Collection", "Print my cards" and the coin pill (the real balance; it opens the wallet);
     · three tabs — Medals · N/M, Avatars · N/96, Worlds · N/6 — each count equal to the code's own;
     · the tab lives in the hash: #/medals lands on the Medals tab, and Back steps from tab to tab;
     · each pack is a panel of eight faces in ONE row on a laptop (the same top for every face);
     · each face says its state in Bee's words: "Free for everyone", "Yours", "✓ Wearing" (an SVG
       tick), "N coins · M more to go" with M = price − the wallet, "Ready to buy", "First: …" for a
       Legendary, "Opens with World N" — and Wear works; a face's picture opens the card deck;
     · "Print my cards" draws exactly the OWNED cards, several to an A4 page, and calls print —
       with the network off;
     · the Worlds tab buys through the family wallet and puts the world on;
     · every control ≥ 44 × 44, no emoji in a control, no sideways scroll on a phone.
   Screenshots land in $SHOTS as collection-*.png. Each check was watched to fail with its feature broken. */
import { site, kidRec, household, checker, ready, until, SHOTS } from './lib/site.mjs';
import { CATALOGUE, COMMONS, byAvatar, PACKS } from '../src/avatars.js';
import { THEMES } from '../src/themes.js';
import { MEDALS } from '../src/medals.js';
import { TIERS, WORLD_PRICE } from '../src/integration/bizzing-avatars.js';

const { BASE, browser, close } = await site('collection', +(process.env.PORT_BASE || 5200) + 13);
const { ok, fails } = checker();
const errors = [];
const EMOJI = /\p{Extended_Pictographic}/u;
const BOUGHT = ['pyrafox', 'conicorn'], OWNED = new Set([...COMMONS, ...BOUGHT]);

async function open(vp, tag, { dark = false, coins = 130 } = {}) {
  const phone = vp.width < 500;
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, colorScheme: dark ? 'dark' : 'light' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  const kid = kidRec('ka', 'Ahana', '8-10', 'pyrafox', { starter: 'cubebot', medals: { 'first-star': { at: Date.now() - 864e5, seen: true } }, shop: { owned: [], worn: {}, avatars: BOUGHT.slice() } });
  const wallet = { v: 1, kids: { ahana: { coins, ledger: [{ a: 'maths', t: Date.now() - 864e5, n: coins + 370, why: 'answer' }, { a: 'maths', t: Date.now() - 7200e3, n: -120, why: 'avatar:pyrafox' }, { a: 'maths', t: Date.now() - 3600e3, n: -250, why: 'avatar:conicorn' }] } } };
  await p.addInitScript(([h, w, mode]) => {
    window.__printed = 0; window.print = () => { window.__printed++; };      // the dialog itself is the browser's
    try { if (!localStorage.getItem('bzm_household')) { localStorage.setItem('bzm_household', h); localStorage.setItem('bizzing.wallet', w); localStorage.setItem('bzm_device', JSON.stringify({ mode })); } } catch {}
  }, [JSON.stringify(household([kid])), JSON.stringify(wallet), dark ? 'dark' : 'light']);
  await p.goto(BASE + '#/collection'); await ready(p);
  return { p, ctx, shot: (n) => p.screenshot({ path: `${SHOTS}/collection-${tag}-${n}.png` }) };
}
const go = async (p, hash) => { await p.evaluate((h) => { location.hash = h; }, hash); await ready(p); };
const tabs = (p) => p.$$eval('.coll-tabs [role=tab]', (t) => t.map((x) => ({ id: x.dataset.arg, on: x.getAttribute('aria-selected') === 'true', text: x.textContent.replace(/\s+/g, ' ').trim() })));
const sel = async (p) => ((await tabs(p)).find((t) => t.on) || {}).id;
const face = (p, id) => p.$eval(`.bz-av[data-id="${id}"]`, (f) => ({ say: f.querySelector('.av-say').textContent.trim(), wear: !!f.querySelector('[data-act=setAv]'),
  on: (f.querySelector('.av-on') || {}).textContent ? f.querySelector('.av-on').textContent.trim() : '', tick: !!(f.querySelector('.av-on svg')),
  buy: f.querySelector('[data-act=buyAv]') ? f.querySelector('[data-act=buyAv]').textContent.trim() : '', controls: f.querySelectorAll('button, .av-on').length }));
/* every control a finger can reach on the screen, under 44 × 44 */
const small = (p) => p.$$eval('.collection button, .collection [role=button], .collection [role=tab], .collection a[href]', (els) => els.filter((e) => e.offsetParent && getComputedStyle(e).visibility !== 'hidden' && !e.closest('.coll-intro'))
  .map((e) => ({ e, r: e.getBoundingClientRect() })).filter((x) => x.r.width < 44 - 0.5 || x.r.height < 44 - 0.5).map((x) => `${x.e.className || x.e.tagName} ${Math.round(x.r.width)}×${Math.round(x.r.height)}`));
const emojiIn = (p) => p.$$eval('main button, main [role=tab], main .av-on', (els, src) => els.filter((e) => new RegExp(src, 'u').test(e.innerText || '')).map((e) => e.innerText.trim()), EMOJI.source);

for (const [vp, tag] of [[{ width: 1280, height: 800 }, 'desk'], [{ width: 390, height: 844 }, 'phone']]) for (const mode of ['light', 'dark']) {
  const T = `${tag}-${mode}`, phone = vp.width < 500;
  const { p, ctx, shot } = await open(vp, T, { dark: mode === 'dark' });

  /* the header: ‹ Home · Collection · Print my cards · the coin pill */
  const hd = await p.evaluate(() => { const h = document.querySelector('.coll-head'); return { back: h.querySelector('.back').textContent.replace(/\s+/g, ' ').trim(), backTo: h.querySelector('.back').dataset.arg,
    h1: h.querySelector('h1').textContent, print: h.querySelector('[data-act=printCards]').getAttribute('aria-label'), coins: h.querySelector('[data-act=wallet] b').textContent }; });
  ok(hd.back === '‹ Home' && hd.backTo === 'home' && hd.h1 === 'Collection' && hd.print === 'Print my cards' && hd.coins === '130', `${T}: the header is ‹ Home · Collection · Print my cards · 130 coins (${JSON.stringify(hd)})`);

  /* three tabs, counted from the code */
  const medalIds = new Set(MEDALS.map((m) => m.id));
  const earned = await p.evaluate(() => Object.keys(window.__bzm.R.h.kids[0].medals || {})).then((ks) => ks.filter((k) => medalIds.has(k)).length);
  const want = [`Medals · ${earned}/${MEDALS.length}`, `Avatars · ${OWNED.size}/${CATALOGUE.length}`, `Worlds · 2/${THEMES.length}`];
  const tb = await tabs(p);
  ok(tb.map((t) => t.text).join(' | ') === want.join(' | ') && CATALOGUE.length === 96 && THEMES.length === 6, `${T}: the tabs say ${want.join(' | ')} (got ${tb.map((t) => t.text).join(' | ')})`);
  ok(await sel(p) === 'avatars', `${T}: #/collection opens on Avatars`);
  const intro = await p.textContent('.coll-intro');
  ok(intro.includes(`Rares are ${TIERS.rare.price} Bizzing coins and Epics ${TIERS.epic.price}`) && intro.includes(`a Legendary is ${TIERS.legendary.price} after its learning milestone`) && /Open the Shop$/.test(intro.trim()), `${T}: the intro says the real prices, then Open the Shop`);

  /* 44px targets, no sideways scroll, on every tab */
  for (const t of ['avatars', 'medals', 'worlds']) {
    await go(p, `#/collection/${t}`);
    const tiny = await small(p);
    ok(tiny.length === 0, `${T} ${t}: every control is at least 44 × 44 (${tiny.slice(0, 5).join(' | ')})`);
    // against the device's width, not innerWidth: on a phone the layout viewport stretches to fit what overflows
    const wide = await p.evaluate((w) => Math.max(document.documentElement.scrollWidth, innerWidth) - w, vp.width);
    ok(wide <= 0, `${T} ${t}: no sideways scroll (${wide}px)`);
    const out = await p.$$eval('.collection .bz-av, .collection .cw, .collection .medal, .collection [role=tab], .collection .coll-head > *', (els, w) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.left < -0.5 || r.right > w + 0.5); }).map((e) => e.className), vp.width);
    ok(out.length === 0, `${T} ${t}: nothing sits past the edge of the screen, cut off (${out.slice(0, 4).join(' | ')})`);
    ok((await emojiIn(p)).length === 0, `${T} ${t}: no emoji in a control`);
    await shot(t);
  }
  await go(p, '#/collection');

  /* the packs: twelve panels of eight; on a laptop all eight in one row */
  const packs = await p.$$eval('.pack', (ps) => ps.map((x) => ({ n: x.querySelectorAll('.bz-av').length, tops: [...x.querySelectorAll('.bz-av')].map((f) => Math.round(f.getBoundingClientRect().top)),
    head: x.querySelector('.pack-n').textContent, w: x.querySelector('.pack-w').textContent.trim(), dot: !!x.querySelector('.pack-dot') })));
  ok(packs.length === 12 && packs.every((x) => x.n === 8 && x.dot), `${T}: twelve pack panels of eight, each with its dot`);
  ok(packs.every((x, i) => x.head === `${CATALOGUE.filter((a) => a.pack === i + 1 && OWNED.has(a.id)).length}/8` && x.w.startsWith(`World ${Math.ceil((i + 1) / 2)} · ${THEMES[Math.ceil((i + 1) / 2) - 1].name}`)), `${T}: each panel says N/8 and its world (${packs.map((x) => x.head).join(',')})`);
  if (!phone) ok(packs.every((x) => new Set(x.tops).size === 1), `${T}: every panel holds its eight faces in one row (tops ${packs.map((x) => new Set(x.tops).size).join(',')})`);
  else ok(packs.every((x) => new Set(x.tops).size <= 3), `${T}: on a phone a panel wraps to three rows at most`);

  /* the state lines, in Bee's words */
  const cube = await face(p, 'cubebot'), fox = await face(p, 'pyrafox'), cone = await face(p, 'conicorn'), cyl = await face(p, 'cylicat'), octa = await face(p, 'octachick'), drag = await face(p, 'dodecadrake'), fold = await face(p, 'hopfold');
  ok(cube.say === 'Free for everyone' && cube.wear, `${T}: a Common says "Free for everyone" and can be worn (${JSON.stringify(cube)})`);
  ok(fox.say === 'Yours' && fox.on === 'Wearing' && fox.tick && !fox.wear && fox.controls === 1, `${T}: the worn face says "Yours" and "✓ Wearing", the tick an SVG (${JSON.stringify(fox)})`);
  ok(cone.say === 'Yours' && cone.wear, `${T}: a bought face says "Yours" and can be worn`);
  ok(cyl.say === 'Ready to buy' && cyl.buy === String(TIERS.rare.price), `${T}: a Rare the wallet can pay for says "Ready to buy" with its price chip (${JSON.stringify(cyl)})`);
  ok(octa.say === `${TIERS.epic.price} coins · ${TIERS.epic.price - 130} more to go` && octa.buy === String(TIERS.epic.price), `${T}: an Epic says "250 coins · ${TIERS.epic.price - 130} more to go" — the price less the wallet (${octa.say})`);
  ok(drag.say === `First: ${byAvatar.dodecadrake.milestone.label}` && drag.controls === 0, `${T}: a Legendary says "First: ${byAvatar.dodecadrake.milestone.label}", and has no control (${drag.say})`);
  ok(fold.say === 'Opens with World 3' && fold.controls === 0, `${T}: a face in a shut world says "Opens with World 3", and has no control (${fold.say})`);
  ok((await emojiIn(p)).length === 0, `${T}: no emoji in a control (${(await emojiIn(p)).join(' | ')})`);

  /* a face's picture opens the deck */
  await p.click('.bz-av[data-id=conicorn] img.av-peek'); await until(p, () => !!document.querySelector('.avd-ov .avc'), null, 10000);
  ok(await p.evaluate(() => { const c = document.querySelector('.avd-ov .avc'); return !!c && c.dataset.id === 'conicorn' && !c.classList.contains('locked'); }), `${T}: Cone-icorn's picture opens its card in the deck`);
  await p.keyboard.press('Escape'); await until(p, () => !document.querySelector('.avd-ov'));

  /* Wear */
  await p.click('.bz-av[data-id=cubebot] [data-act=setAv]'); await ready(p);
  const worn = await p.evaluate(() => window.__bzm.R.h.kids[0].avatar);
  ok(worn === 'cubebot' && (await face(p, 'cubebot')).on === 'Wearing' && (await face(p, 'pyrafox')).wear, `${T}: Wear puts Cube Bot on, and Pyramid Fox gets its Wear back (${worn})`);

  /* the coin pill opens the wallet */
  await p.click('.coll-head [data-act=wallet]'); await until(p, () => !!document.querySelector('.sheet.wallet'));
  ok(await p.evaluate(() => /130/.test(document.querySelector('.sheet.wallet .wal-bal').textContent)), `${T}: the coin pill opens the wallet`);
  await p.keyboard.press('Escape'); if (!(await until(p, () => !document.querySelector('.sheet.wallet'), null, 3000))) await p.evaluate(() => window.__bzm.fire('wallet')); await until(p, () => !document.querySelector('.sheet.wallet'));

  /* the tabs in the hash; Back steps between them */
  await p.click('.coll-tabs [data-arg=worlds]'); await ready(p);
  ok(await sel(p) === 'worlds' && await p.evaluate(() => location.hash) === '#/collection/worlds', `${T}: the Worlds tab is #/collection/worlds`);
  const ws = await p.$$eval('.cw', (c) => c.map((x) => ({ n: +x.dataset.n, say: x.querySelector('.cw-say').textContent.trim(), buy: !!x.querySelector('[data-act=buyWorld]'), use: !!x.querySelector('[data-act=theme], .av-on') })));
  ok(ws.length === THEMES.length && ws.filter((w) => w.n > 2).every((w) => w.say === `${WORLD_PRICE} coins · ${WORLD_PRICE - 130} more to go` && w.buy && !w.use) && ws.filter((w) => w.n <= 2).every((w) => w.use && !w.buy), `${T}: a shut world says "${WORLD_PRICE} coins · ${WORLD_PRICE - 130} more to go"; an open one can be put on (${ws.map((w) => w.say).join(' | ')})`);
  await p.click('.coll-tabs [data-arg=medals]'); await ready(p);
  ok(await sel(p) === 'medals' && await p.locator('.medals .medal').count() === MEDALS.length, `${T}: the Medals tab shows all ${MEDALS.length} medals`);
  await p.goBack(); await ready(p);
  ok(await sel(p) === 'worlds', `${T}: Back from Medals returns to Worlds`);
  await p.goBack(); await ready(p);
  ok(await sel(p) === 'avatars' && await p.evaluate(() => location.hash) === '#/collection', `${T}: Back again returns to Avatars`);
  await go(p, '#/medals');
  ok(await sel(p) === 'medals' && await p.evaluate(() => location.hash) === '#/collection/medals' && await p.locator('.medals .medal').count() === MEDALS.length, `${T}: #/medals opens the Collection's Medals tab`);
  await go(p, '#/collection/nonsense');
  ok(await sel(p) === 'avatars', `${T}: an unknown tab lands on Avatars`);

  /* Print my cards: exactly the owned cards, several to an A4 page, with the network off */
  await go(p, '#/collection');
  await p.click('.bz-av[data-id=pyrafox] img.av-peek'); await p.waitForSelector('.avd-ov .avc'); await p.keyboard.press('Escape');   // the cards' code has arrived once
  await ctx.setOffline(true);
  await p.click('.coll-head [data-act=printCards]'); await p.waitForSelector('#print-sheet .avc');
  await until(p, () => window.__printed > 0, null, 10000);
  const ps = await p.evaluate(() => ({ ids: [...document.querySelectorAll('#print-sheet .avc')].map((c) => c.dataset.id), printed: window.__printed, locked: document.querySelectorAll('#print-sheet .avc.locked').length }));
  ok(ps.ids.length === OWNED.size && ps.ids.every((id) => OWNED.has(id)) && new Set(ps.ids).size === ps.ids.length && ps.locked === 0, `${T}: the print sheet holds exactly the ${OWNED.size} owned cards (got ${ps.ids.length})`);
  ok(ps.printed === 1, `${T}: the print dialog is asked for once, offline (${ps.printed})`);
  if (mode === 'light') await shot('print');
  await p.emulateMedia({ media: 'print' });
  const pr = await p.evaluate(() => { const g = document.querySelector('#print-sheet .ps-grid'), cs = [...g.querySelectorAll('.avc')].map((c) => c.getBoundingClientRect());
    return { others: [...document.body.children].filter((e) => e.id !== 'print-sheet' && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0).map((e) => e.id || e.className),
      cols: new Set(cs.map((r) => Math.round(r.left))).size, bar: getComputedStyle(document.querySelector('.ps-bar')).display }; });
  ok(pr.others.length === 0 && pr.bar === 'none' && pr.cols === 3, `${T}: on paper only the cards print, three across (${JSON.stringify(pr)})`);
  await p.emulateMedia({ media: null });
  if (tag === 'desk' && mode === 'light') {
    const pdf = await p.pdf({ format: 'A4', printBackground: true });
    const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page\b(?!s)/g) || []).length;
    ok(pages >= 1 && pages <= Math.ceil(OWNED.size / 6), `the ${OWNED.size} cards fit at least six to an A4 page (${pages} pages)`);
  }
  await p.click('#print-sheet [data-ps=close]');
  ok(await p.evaluate(() => !document.getElementById('print-sheet') && !document.documentElement.classList.contains('printing') && document.activeElement.matches('[data-act=printCards]')), `${T}: Close puts the sheet away and focus returns to Print my cards`);
  await ctx.setOffline(false);
  await ctx.close();
}

/* the Worlds tab: bought through the family wallet, then worn */
{
  const { p, ctx, shot } = await open({ width: 1280, height: 800 }, 'worlds', { coins: 700 });
  await go(p, '#/collection/worlds');
  const cards = await p.$$eval('.cw', (c) => c.map((x) => ({ n: +x.dataset.n, say: x.querySelector('.cw-say').textContent.trim(), plan: !!x.querySelector('.cw-plan'), art: getComputedStyle(x.querySelector('.cw-art')).backgroundImage })));
  ok(cards.length === THEMES.length && cards.every((c) => /world-.+\.webp/.test(c.art)), `the Worlds tab shows all ${THEMES.length} worlds, each with its painted plate`);
  ok(cards.filter((c) => c.n > 2).every((c) => c.say === 'Ready to buy' && c.plan) && cards.filter((c) => c.n <= 2).every((c) => /^Open/.test(c.say)), `a shut world says what it costs and that it comes with the family plan (${cards.map((c) => c.say).join(' | ')})`);
  await p.click('.cw[data-n="3"] .btn'); await ready(p);
  const b = await p.evaluate(() => ({ k: window.__bzm.R.h.kids[0], w: JSON.parse(localStorage.getItem('bizzing.wallet')).kids.ahana, theme: document.documentElement.dataset.theme, tab: (document.querySelector('.coll-tabs [data-arg=worlds]') || { textContent: '' }).textContent.replace(/\s+/g, ' ').trim() }));
  ok(b.k.shop.worlds.includes(3) && b.w.coins === 700 - WORLD_PRICE && b.w.ledger.some((x) => x.why === 'world:3' && x.n === -WORLD_PRICE) && b.theme === 'blueprint', `World 3 is bought through the family wallet for ${WORLD_PRICE} and put on (${b.w.coins}, ${b.theme})`);
  ok(b.tab === `Worlds · 3/${THEMES.length}`, `the Worlds count moves with it (${b.tab})`);
  const left = await p.$$eval('.cw', (c) => c.filter((x) => +x.dataset.n > 3).map((x) => x.querySelector('.cw-say').textContent.trim()));
  ok(left.length === 3 && left.every((s) => s === 'Ready to buy'), `the rest still say "Ready to buy" at ${700 - WORLD_PRICE} coins (${left.join(' | ')})`);
  await p.click('.cw[data-world=graph] [data-act=theme]'); await ready(p);
  const w = await p.evaluate(() => ({ t: window.__bzm.R.h.kids[0].prefs.theme, html: document.documentElement.dataset.theme, on: document.querySelector('.cw[data-world=graph] .av-on') && document.querySelector('.cw[data-world=graph] .av-on').textContent.trim() }));
  ok(w.t === 'graph' && w.html === 'graph' && w.on === 'Your world', `"Use this world" puts Patchwork Hills on (${JSON.stringify(w)})`);
  await shot('bought');
  await ctx.close();
}

await close();
if (errors.length) console.error(errors.join('\n'));
ok(!errors.length, `no page errors (${errors.length})`);
console.log(`${fails() ? 'FAIL' : 'ok'} collection-ui — Bee's Collection: three counted tabs in the hash, pack panels of eight, Bee's state lines, Wear, the deck, Print my cards, worlds through the wallet`);
if (fails()) process.exit(1);
