/* avdeck-ui.mjs — Bizzing Bee's avatar card deck, in Chromium on the BUILT app, at 1280×800 and
   390×844, light and dark (the owner: "clicking on the avatar in the hello card does not open up
   all avatar cards with their history and their ranking like it does in bizzingbee.com"):
     · Home's hello-card picture (Octo, the family shell's) is a button — keyboard-reachable, named
       with the count — with the child's own face as a badge on its corner;
     · the deck's code is not on Home's first paint: it arrives when the deck opens;
     · tapping the picture opens a dialog on the worn face, "N / M owned", "Wearing";
     · › and ArrowRight flip forward, ‹ and ArrowLeft back, a swipe flips on the phone;
     · each card says its tier, its ranking, four stats and how it came to the child, from the record:
       the starter "Picked when you started", a bought face "Bought for 120 coins on …";
     · Wear switches the worn face and the top bar's avatar with it;
     · Tab stays inside; Escape closes and focus returns to the picture; a tap outside closes;
     · every control ≥ 44 × 44, no emoji in a control, no sideways scroll, the card inside the screen;
     · under reduced motion nothing animates;
     · My page's face and "Avatar cards" open the same deck; a locked face in the Collection is
       peeked at as a silhouette that says how it is earned.
   Screenshots land in $SHOTS as avdeck-*.png. Each check was watched to fail with its feature removed. */
import { site, kidRec, household, checker, ready, until, SHOTS } from './lib/site.mjs';
import { AVATARS } from '../src/model.js';
import { COMMONS } from '../src/avatars.js';

const { BASE, browser, close } = await site('avdeck', +(process.env.PORT_BASE || 5200) + 12);
const { ok, fails } = checker();
const errors = [];
const EMOJI = /\p{Extended_Pictographic}/u;
const DAY = 864e5, BOUGHT = Date.now() - 2 * DAY;
const OWNED = AVATARS.filter((a) => COMMONS.includes(a) || ['pyrafox', 'conicorn'].includes(a));

async function open(vp, tag, { dark = false, reduced = false } = {}) {
  const phone = vp.width < 500;
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, colorScheme: dark ? 'dark' : 'light', reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  const kid = kidRec('ka', 'Ahana', '8-10', 'hexbee', { starter: 'hexbee', created: Date.now() - 9 * DAY, shop: { owned: [], worn: {}, avatars: ['pyrafox', 'conicorn'] } });
  const wallet = { v: 1, kids: { ahana: { coins: 400, ledger: [{ a: 'maths', t: BOUGHT - DAY, n: 640, why: 'answer' }, { a: 'maths', t: BOUGHT, n: -120, why: 'avatar:pyrafox' }, { a: 'maths', t: BOUGHT + 3600e3, n: -250, why: 'avatar:conicorn' }] } } };
  await p.addInitScript(([h, w, mode]) => { try { if (!localStorage.getItem('bzm_household')) { localStorage.setItem('bzm_household', h); localStorage.setItem('bizzing.wallet', w); localStorage.setItem('bzm_device', JSON.stringify({ mode })); } } catch {} },
    [JSON.stringify(household([kid])), JSON.stringify(wallet), dark ? 'dark' : 'light']);
  await p.goto(BASE + '#/home'); await ready(p);
  return { p, ctx, shot: (n) => p.screenshot({ path: `${SHOTS}/avdeck-${tag}-${n}.png` }) };
}
const deck = (p) => p.evaluate(() => {
  const o = document.querySelector('.avd-ov'); if (!o) return null;
  const c = o.querySelector('.avc');
  return { id: c && c.dataset.id, count: (o.querySelector('.avd-count') || {}).textContent || '', role: o.getAttribute('role'), modal: o.getAttribute('aria-modal'),
    h: (o.querySelector('h2.avc-name') || {}).textContent || '', worn: !!o.querySelector('.avd-worn'), wear: !!o.querySelector('[data-avd=wear]'),
    tier: (o.querySelector('.avc-tier') || {}).textContent || '', rank: (o.querySelector('.avc-rank') || {}).textContent || '',
    stats: o.querySelectorAll('.avc-stat').length, hist: [...o.querySelectorAll('.avc-hist li')].map((l) => l.textContent), power: (o.querySelector('.avc-power') || {}).textContent || '' };
});
const at = (id) => OWNED.indexOf(id);
async function flipTo(p, id) {
  for (let i = 0; i < OWNED.length + 1; i++) { const d = await deck(p); if (d.id === id) return true; await p.keyboard.press('ArrowRight'); }
  return false;
}

for (const [vp, tag] of [[{ width: 1280, height: 800 }, 'desk'], [{ width: 390, height: 844 }, 'phone']]) for (const mode of ['light', 'dark']) {
  const T = `${tag}-${mode}`;
  const { p, ctx, shot } = await open(vp, T, { dark: mode === 'dark' });
  const phone = vp.width < 500;

  // the hello card's picture: a named, focusable button, Octo still in it, the child's face on its corner
  const g = await p.evaluate(() => {
    const i = document.querySelector('[data-bz=greet] > img'), b = document.querySelector('[data-bz=greet] .greet-badge');
    const r = i.getBoundingClientRect(), q = b && b.getBoundingClientRect();
    return { src: i.getAttribute('src'), role: i.getAttribute('role'), tab: i.tabIndex, label: i.getAttribute('aria-label') || '', badge: b && b.querySelector('img').getAttribute('src'),
      overlap: q ? Math.max(0, Math.min(r.right, q.right) - Math.max(r.left, q.left)) * Math.max(0, Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top)) / (q.width * q.height) : 0,
      cursor: getComputedStyle(i).cursor,
      lazy: performance.getEntriesByType('resource').filter((e) => /avatar-cards/.test(e.name)).length };
  });
  ok(/mascot\/octo-/.test(g.src), `${T}: the hello card's picture is still Octo (${g.src})`);
  ok(g.role === 'button' && g.tab === 0 && g.label === `Your avatar cards — ${OWNED.length} owned` && g.cursor === 'pointer', `${T}: the picture is a named, focusable button (${JSON.stringify(g)})`);
  ok(/avatars\/hexbee\.webp$/.test(g.badge || '') && g.overlap > 0.5, `${T}: the child's own face sits as a badge on the picture's corner (${g.badge}, overlap ${g.overlap.toFixed(2)})`);
  ok(g.lazy === 0, `${T}: the deck's code is not part of Home's first paint (${g.lazy} loaded)`);
  if (mode === 'light') await shot('home');

  // open it with a tap on the picture
  await p.click('[data-bz=greet] > img'); await p.waitForSelector('.avd-ov .avc'); await ready(p);
  let d = await deck(p);
  ok(d.role === 'dialog' && d.modal === 'true', `${T}: the deck is a modal dialog`);
  ok(d.id === 'hexbee' && d.count === `${at('hexbee') + 1} / ${OWNED.length} owned` && d.worn && !d.wear, `${T}: it opens on the worn face, with the count and "Wearing" (${JSON.stringify([d.id, d.count, d.worn])})`);
  ok(d.h === 'Honeycomb Bee' && d.tier === 'Common' && /^Common · #\d of 8 in Pattern Pets · #\d+ of 96$/.test(d.rank) && d.stats === 4 && / — /.test(d.power), `${T}: the card shows name, tier, ranking, power and four stats (${d.rank})`);
  ok(/^Picked when you started, on \d{1,2} [A-Z][a-z]{2} \d{4}$/.test(d.hist.join()), `${T}: the starter's history: picked when you started (${d.hist})`);
  ok(await p.evaluate(() => performance.getEntriesByType('resource').some((e) => /avatar-cards/.test(e.name))), `${T}: the deck's code arrived when it opened`);
  await shot('open');

  // targets, emoji, sideways scroll, the card inside the screen
  const box = await p.evaluate(() => {
    const o = document.querySelector('.avd-ov');
    const small = [...o.querySelectorAll('button')].filter((b) => { const r = b.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).map((b) => b.className);
    const emoji = [...o.querySelectorAll('button, h2, .avd-count')].map((b) => b.innerText).filter((t) => /\p{Extended_Pictographic}/u.test(t));
    const c = o.querySelector('.avc').getBoundingClientRect(), n = [...o.querySelectorAll('.avd-nav')].map((b) => b.getBoundingClientRect());
    return { small, emoji, sw: document.documentElement.scrollWidth, ow: o.scrollWidth, cl: c.left, cr: c.right, navIn: n.every((r) => r.left >= 0 && r.right <= innerWidth) };
  });
  ok(!box.small.length, `${T}: every control in the deck is ≥ 44 × 44 (${box.small})`);
  ok(!box.emoji.length, `${T}: no emoji in the deck's controls (${box.emoji})`);
  ok(box.sw <= vp.width && box.ow <= vp.width && box.cl >= 0 && box.cr <= vp.width && box.navIn, `${T}: no sideways scroll; the card and arrows are inside the screen (${JSON.stringify(box)})`);

  // flipping: › , ArrowRight, ‹ , ArrowLeft
  const i0 = at('hexbee'), next = (n) => OWNED[(i0 + n + OWNED.length) % OWNED.length];
  await p.click('.avd-next'); d = await deck(p);
  ok(d.id === next(1) && d.count === `${i0 + 2} / ${OWNED.length} owned` && d.wear, `${T}: › flips to the next owned card and the count follows (${d.id}, ${d.count})`);
  await p.keyboard.press('ArrowRight'); d = await deck(p);
  ok(d.id === next(2) && d.count.startsWith(`${i0 + 3} /`), `${T}: ArrowRight flips forward (${d.id})`);
  await p.keyboard.press('ArrowLeft'); await p.click('.avd-prev'); d = await deck(p);
  ok(d.id === 'hexbee', `${T}: ArrowLeft and ‹ flip back (${d.id})`);
  if (phone) {
    const cdp = await ctx.newCDPSession(p), y = 420;
    const tp = (type, x) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    await tp('touchStart', 320); for (const x of [260, 200, 140, 90]) await tp('touchMove', x); await tp('touchEnd');
    d = await deck(p);
    ok(d.id === next(1), `${T}: a swipe left flips to the next card (${d.id})`);
    await tp('touchStart', 80); for (const x of [140, 200, 260, 320]) await tp('touchMove', x); await tp('touchEnd');
    d = await deck(p);
    ok(d.id === 'hexbee', `${T}: a swipe right flips back (${d.id})`);
  }
  // only owned faces are in the deck
  const seen = new Set(); for (let i = 0; i < OWNED.length; i++) { seen.add((await deck(p)).id); await p.keyboard.press('ArrowRight'); }
  ok(seen.size === OWNED.length && [...seen].every((x) => OWNED.includes(x)), `${T}: the deck holds exactly the ${OWNED.length} owned faces (${seen.size})`);

  // a bought face's history, from the wallet's own ledger line
  ok(await flipTo(p, 'pyrafox'), `${T}: Pyramid Fox is in the deck`);
  d = await deck(p);
  ok(d.hist.length === 1 && /^Bought for 120 coins on \d{1,2} [A-Z][a-z]{2} \d{4}$/.test(d.hist[0]) && d.tier === 'Rare' && d.rank === 'Rare · #4 of 8 in Shape Pals · #37 of 96', `${T}: a bought face says what it cost and when, and its ranking (${d.hist} · ${d.rank})`);
  if (mode === 'light') { await ready(p); await shot('bought'); }

  // Tab stays inside the dialog
  let inside = true; for (let i = 0; i < 8; i++) { await p.keyboard.press(i % 3 === 2 ? 'Shift+Tab' : 'Tab'); inside = inside && await p.evaluate(() => !!document.activeElement.closest('.avd-ov')); }
  ok(inside, `${T}: Tab and Shift+Tab stay inside the deck`);

  // Wear: the worn face and the top bar's avatar switch
  await p.click('[data-avd=wear]'); await ready(p);
  const w = await p.evaluate(() => ({ worn: window.__bzm.R.h.kids[0].avatar, bar: [...document.querySelectorAll('[data-bz=kid] img')].map((i) => i.getAttribute('src')).join() }));
  d = await deck(p);
  ok(w.worn === 'pyrafox' && /pyrafox/.test(w.bar) && d.worn && !d.wear, `${T}: Wear switches the worn face and the top bar's avatar (${JSON.stringify(w)})`);
  await shot('worn');

  // Escape closes; focus returns to the hello card's picture
  await p.keyboard.press('Escape');
  const after = await p.evaluate(() => ({ open: !!document.querySelector('.avd-ov'), focus: document.activeElement && document.activeElement.matches('[data-bz=greet] > img'), badge: document.querySelector('[data-bz=greet] .greet-badge img').getAttribute('src') }));
  ok(!after.open && after.focus, `${T}: Escape closes, and focus returns to the picture (${JSON.stringify(after)})`);
  ok(/pyrafox/.test(after.badge), `${T}: the badge on the picture is the face now worn (${after.badge})`);

  // the keyboard opens it too, on the newly worn face; a tap outside closes it
  await p.focus('[data-bz=greet] > img'); await p.keyboard.press('Enter'); await p.waitForSelector('.avd-ov .avc');
  d = await deck(p);
  ok(d.id === 'pyrafox', `${T}: Enter on the picture opens the deck on the worn face (${d.id})`);
  await p.mouse.click(4, vp.height - 4);
  ok(!(await deck(p)), `${T}: a tap outside the card closes the deck`);

  // My page: the face and "Avatar cards" open the same deck
  await p.evaluate(() => { location.hash = '#/me'; }); await ready(p);
  await p.click('.sc-open'); await p.waitForSelector('.avd-ov .avc');
  ok((await deck(p)).id === 'pyrafox', `${T}: My page's face opens the deck`);
  await p.keyboard.press('Escape');
  ok(await p.evaluate(() => document.activeElement && document.activeElement.matches('.sc-open')), `${T}: focus returns to My page's face`);
  await p.click('.me-page [data-act=avDeck].btn'); await p.waitForSelector('.avd-ov .avc');
  ok((await deck(p)).count === `${at('pyrafox') + 1} / ${OWNED.length} owned`, `${T}: My page's "Avatar cards" opens the same deck`);
  await p.keyboard.press('Escape');

  // the Collection: a locked face is peeked at as a silhouette that says how it is earned
  await p.evaluate(() => { location.hash = '#/collection'; }); await ready(p);
  await p.click('.bz-av[data-id=dodecadrake] img.av-peek'); await p.waitForSelector('.avd-ov .avc'); await ready(p);
  const pk = await p.evaluate(() => { const o = document.querySelector('.avd-ov'); return { locked: !!o.querySelector('.avc.locked'), hh: o.querySelector('.avc-hh').textContent, li: o.querySelector('.avc-hist li').textContent, wear: !!o.querySelector('[data-avd=wear]'), nav: o.querySelectorAll('.avd-nav').length, filter: getComputedStyle(o.querySelector('.avc-art img')).filter }; });
  ok(pk.locked && pk.hh === 'How to earn it' && /^First, finish .+ Then 500 coins in the Shop\.$/.test(pk.li) && !pk.wear && !pk.nav && /brightness\(0\)/.test(pk.filter), `${T}: a locked face is a silhouette that says how it is earned, and cannot be worn (${JSON.stringify(pk)})`);
  if (mode === 'light') await shot('locked');
  await p.keyboard.press('Escape');
  await ctx.close();
}

/* reduced motion: the deck opens and flips without a single animation */
for (const vp of [{ width: 390, height: 844 }]) {
  const { p, ctx } = await open(vp, 'reduced', { reduced: true });
  await p.click('[data-bz=greet] > img'); await p.waitForSelector('.avd-ov .avc');
  await p.click('.avd-next');
  const an = await p.evaluate(() => ({ n: document.getAnimations().filter((a) => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.avd-ov')).length,
    sheen: getComputedStyle(document.querySelector('.avc'), '::after').display }));
  ok(an.n === 0 && an.sheen === 'none', `under reduced motion nothing in the deck animates (${JSON.stringify(an)})`);
  await ctx.close();
}

await close();
if (errors.length) console.error(errors.join('\n'));
ok(!errors.length, `no page errors (${errors.length})`);
console.log(`${fails() ? 'FAIL' : 'ok'} avdeck-ui — the hello card opens Bee's avatar card deck: owned faces, ranking, history from the record, wear, keys, swipe, focus`);
if (fails()) process.exit(1);
