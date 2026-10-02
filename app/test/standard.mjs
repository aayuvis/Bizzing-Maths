/* test/standard.mjs — the family standard v2 checks (FIX-MATHS 2 Oct 2026), on the BUILT
   app at its GitHub Pages sub-path, desktop 1280 and phone 390.

   §1 Fix first: the grown-ups report fits a 390px phone · an unknown hash lands on Home ·
   tester mode draws no lock on anything it opened, and no road stop is a blank circle ·
   ⬡ stays in the top bar during a run and hides only inside a timed contest question.

   Every assertion here was watched to fail once before it was trusted. */
import { site, household, kidRec, checker, SHOTS } from './lib/site.mjs';
import { checkShell } from './lib/shell-check.mjs';

const { BASE, browser, close } = await site('std', 5204);
const { ok, fails } = checker();
const errors = [];
const SHELL = {};

/* a child with something on the report: two stops starred, some facts, a land test */
function seeded(parent = {}) {
  const a = kidRec('ka', 'Ahana', '8-10', 'hexbee', { xp: 140, tricks: { 'make-ten': { stars: 3, learned: true }, 'bridge-ten': { stars: 2, learned: true } } });
  const b = kidRec('kb', 'Kabir', '6-7', 'rocket');
  return household([a, b], parent);
}
async function open(vp, h, url = '') {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: vp.width < 500, hasTouch: vp.width < 500 });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  await p.addInitScript((hh) => { try { if (!localStorage.getItem('bzm_household')) localStorage.setItem('bzm_household', JSON.stringify(hh)); } catch {} }, h);
  await p.goto(BASE + url); await p.waitForTimeout(350);
  return { p, ctx };
}
const nav = (p) => p.evaluate(() => window.__bzm.R.ui.nav);
const width = (p) => p.evaluate(() => document.documentElement.scrollWidth);

for (const [vp, tag] of [[{ width: 1280, height: 800 }, 'desk'], [{ width: 390, height: 844 }, 'phone']]) {
  /* 1 · the grown-ups report fits the device */
  {
    const { p, ctx } = await open(vp, seeded(), '#/grownups');
    for (const ch of '1234') await p.keyboard.press(ch);
    await p.waitForSelector('.rc');
    await p.screenshot({ path: `${SHOTS}/std-${tag}-grownups.png`, fullPage: true });
    ok(await width(p) <= vp.width, `${tag}: the grown-ups report fits ${vp.width}px (scrollWidth ${await width(p)})`);
    await ctx.close();
  }
  /* 2 · unknown hashes land on Home */
  for (const bad of ['#/nonsense', '#/stop/bad', '#/world/nowhere', '#/lib/nothing']) {
    const { p, ctx } = await open(vp, seeded(), bad);
    ok(await nav(p) === 'home' && await p.locator('.home2').count() === 1 && await p.locator('.ob-land').count() === 0, `${tag}: ${bad} lands on Home (nav ${await nav(p)})`);
    await ctx.close();
  }
  /* 3 · tester mode: no locks on what it opened; no blank road stops */
  {
    const { p, ctx } = await open(vp, seeded({ tester: true }), '#/journey');
    await p.evaluate(() => { window.__bzm.R.ui.jlv = 8; window.__bzm.render(); }); await p.waitForTimeout(150);
    const blank = await p.$$eval('.lboard .bpin > span:first-child', (s) => s.filter((x) => !x.textContent.trim() && !x.querySelector('svg')).length);
    ok(blank === 0, `${tag}: no road stop is a blank circle on a later level in tester mode (got ${blank})`);
    ok(await p.locator('.lboard .bpin.shut').count() === 0, `${tag}: tester mode shows no shut stop on the road`);
    await p.screenshot({ path: `${SHOTS}/std-${tag}-tester-road.png` });
    await p.evaluate(() => window.__bzm.fire('openWorld', 'observatory')); await p.waitForTimeout(150);
    ok(await p.locator('.board .lvb.later, .board .bpin.shut').count() === 0, `${tag}: tester mode draws no lock on world-board pins`);
    for (const tool of ['vedic', 'chinese', 'tables']) {
      await p.evaluate((t) => window.__bzm.go('lib', t), tool); await p.waitForTimeout(600);
      const locked = await p.$$eval('.locked, .bpin.shut', (s) => s.filter((x) => x.offsetParent).length);
      ok(locked === 0, `${tag}: tester mode leaves no locked ${tool} stone (got ${locked})`);
    }
    await ctx.close();
  }
  /* 4 · ⬡ stays in the bar during a run; hides only in a timed contest question */
  {
    const { p, ctx } = await open(vp, seeded());
    await p.evaluate(() => window.__bzm.fire('startFacts', '×')); await p.waitForTimeout(200);
    const hiveVis = () => p.$eval('[data-bz=hive]', (e) => getComputedStyle(e).visibility === 'visible');
    ok(await nav(p) === 'run' && await hiveVis(), `${tag}: ⬡ stays in the top bar during a drill`);
    await p.evaluate(() => window.__bzm.go('contest')); await p.evaluate(() => window.__bzm.fire('startContest')); await p.waitForTimeout(200);
    ok(!(await hiveVis()), `${tag}: ⬡ hides inside a timed contest question`);
    await ctx.close();
  }
}


/* ================================================================== §2–§11 harmonise, §3 key elements */
const EMOJI = /\p{Extended_Pictographic}/u;
const ROUTES = ['home', 'atlas', 'journey', 'library', 'puzzles', 'play', 'contest', 'facts', 'goals', 'stories', 'me', 'shop', 'collection', 'medals', 'settings', 'help', 'mistakes', 'search', 'privacy', 'world/bakery', 'stop/make-ten', 'lib/dictionary', 'lib/vedic'];
async function emojiIn(p) {
  return p.evaluate((src) => { const re = new RegExp(src, 'u'); const out = [];
    for (const el of document.querySelectorAll('button, [role=tab], nav, h1, h2, h3, .chip')) { if (!el.offsetParent && el.tagName !== 'NAV') continue; const t = el.innerText || ''; if (re.test(t)) out.push(t.trim().slice(0, 30)); }
    return out; }, EMOJI.source);
}
const BAD_TEXT = /\[object Object\]|\{[a-z_]+\}|\bundefined\b|\bNaN\b/;

for (const [vp, tag] of [[{ width: 1280, height: 800 }, 'desk'], [{ width: 390, height: 844 }, 'phone']]) {
  const phone = vp.width < 900;
  const { p, ctx } = await open(vp, seeded({ plan: 'family' }));
  await p.waitForSelector('.home2');
  /* the chrome and Home are Bee's, by measurement (integration/shell-check.mjs): the bar, the tab row or the
     phone tab bar, the three rows of Home, and ☰ — opens, Esc closes, focus returns */
  ok(/Bizzing\s*Maths/.test(await p.textContent('[data-bz=brand]')) && await p.$eval('[data-bz=brand] img', (i) => /octo-head/.test(i.src)), `${tag}: the logo is Octo's head and "Bizzing Maths"`);
  const tabs = await p.$$eval(phone ? '[data-bz=tabbar] a' : '[data-bz=tab]', (b) => b.map((x) => x.textContent.trim()));
  ok(tabs.join() === 'Home,Atlas,Library,Puzzles,Play', `${tag}: tabs are Home · Atlas · Library · Puzzles · Play (got ${tabs})`);
  ok(await p.locator('[data-bz=greet] img[src*=octo]').count() === 1 && (await p.textContent('[data-bz=greet] .bz-bubble')).length > 20, `${tag}: Octo greets with a line about the child`);
  const items = await p.$$eval('[data-bz=drawer] a', (x) => x.map((e) => e.querySelector('b').textContent.trim()));
  ok(items.join('|') === 'My page|Shop|Collection|Medals|My mistakes|What I’m learning|The Story Shelf|Mock contest|Settings|Grown-ups|Help|Privacy|Back to the Hive', `${tag}: ☰ lists the family order (got ${items.join('|')})`);
  /* the coin chip opens the wallet history (§1.1) */
  await p.click('[data-bz=coins]'); await p.waitForTimeout(150);
  ok(await p.locator('.sheet.wallet').count() === 1 && /Bizzing coins/.test(await p.textContent('.sheet.wallet')), `${tag}: the coin chip opens the wallet`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  /* every screen: no emoji in a control, no broken text, no sideways scroll */
  for (const r of ROUTES) {
    await p.evaluate((x) => { location.hash = '#/' + x; }, r); await p.waitForTimeout(r.startsWith('lib') ? 700 : 220);
    const em = await emojiIn(p);
    ok(em.length === 0, `${tag}: zero emoji in controls on #/${r} (got ${em.slice(0, 4).join(' | ')})`);
    const txt = await p.evaluate(() => document.querySelector('main').innerText);
    ok(!BAD_TEXT.test(txt), `${tag}: no [object Object], {placeholder}, undefined or NaN on #/${r} (${(txt.match(BAD_TEXT) || [])[0]})`);
    ok(await width(p) <= vp.width, `${tag}: no sideways scroll on #/${r} (${await width(p)})`);
  }
  /* touch targets (P3): every control a child taps is at least 44px, on Home, Puzzles, Goals and Facts */
  if (phone) for (const r of ['home', 'puzzles', 'goals', 'facts', 'play', 'settings', 'shop']) {
    await p.evaluate((x) => { location.hash = '#/' + x; }, r); await p.waitForTimeout(250);
    const small = await p.$$eval('main button, main a, main [role=tab], [data-bz=tabbar] a', (b) => b.filter((x) => {
      if (!x.offsetParent || x.closest('p, .bz-foot, .foot') || x.classList.contains('linkish')) return false;   // inline text links are exempt
      const r = x.getBoundingClientRect(); return r.width < 43.5 || r.height < 43.5; }).map((x) => (x.className || x.tagName) + ':' + Math.round(x.getBoundingClientRect().height)));
    ok(small.length === 0, `${tag}: every target on #/${r} is ≥ 44px (got ${small.length}: ${small.slice(0, 5).join(', ')})`);
  }
  /* N12: the Puzzle Tower's floor pins never overlap on a phone */
  if (phone) {
    await p.evaluate(() => { location.hash = '#/puzzles'; }); await p.waitForTimeout(300);
    const boxes = await p.$$eval('.fpin', (b) => b.map((x) => x.getBoundingClientRect()).map((r) => [r.left, r.top, r.right, r.bottom]));
    let hits = 0; for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const [a, b] = [boxes[i], boxes[j]]; if (a[0] < b[2] - 1 && b[0] < a[2] - 1 && a[1] < b[3] - 1 && b[1] < a[3] - 1) hits++; }
    ok(boxes.length === 12 && hits === 0, `${tag}: the twelve tower pins do not overlap (${hits} overlaps)`);
  }
  /* Settings in the five sections, in order (§5) */
  await p.evaluate(() => { location.hash = '#/settings'; }); await p.waitForTimeout(200);
  const secs = await p.$$eval('.set-sec', (s) => s.map((x) => x.dataset.sec));
  ok(secs.join() === 'me,sound,look,comfort,grownups', `${tag}: Settings sections in the standard's order (got ${secs})`);
  ok(await p.locator('.set-sec[data-sec=sound] input[type=range]').count() === 1, `${tag}: one volume slider`);
  await ctx.close();
}

/* checkShell: Home with a child, desktop and phone, light and dark — must be [] */
for (const [vp, tag] of [[{ width: 1280, height: 800 }, 'desk'], [{ width: 390, height: 844 }, 'phone']]) for (const mode of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: vp, colorScheme: mode, isMobile: vp.width < 500, hasTouch: vp.width < 500 });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(e.message));
  await p.addInitScript((hh) => { if (!localStorage.getItem('bzm_household')) localStorage.setItem('bzm_household', JSON.stringify(hh)); }, seeded());
  await p.goto(BASE); await p.waitForSelector('[data-bz=home]'); await p.waitForTimeout(400);
  const f = await checkShell(p, { phone: vp.width < 500 });
  SHELL[`${tag} ${mode}`] = f;
  ok(f.length === 0, `${tag} ${mode}: checkShell matches Bee (${f.join('; ')})`);
  await p.screenshot({ path: `${SHOTS}/std-shell-${tag}-${mode}.png` });
  await ctx.close();
}

/* the avatars (§8): 96 on the Collection, each card says its tier and its path; buying through the wallet */
{
  const { p, ctx } = await open({ width: 1280, height: 800 }, seeded());
  await p.evaluate(() => { localStorage.setItem('bizzing.wallet', JSON.stringify({ v: 1, kids: { ahana: { coins: 700, ledger: [{ a: 'bee', t: Date.now() - 864e5, n: 700, why: 'migrated' }] } } })); });
  await p.reload(); await p.evaluate(() => { location.hash = '#/collection'; }); await p.waitForTimeout(400);
  const cards = await p.$$eval('.bz-av', (c) => c.map((x) => ({ tier: x.dataset.tier, state: x.dataset.state, say: x.querySelector('.av-say').textContent.trim(), label: x.querySelector('figcaption b').textContent })));
  ok(cards.length === 96, `the Collection shows all 96 (got ${cards.length})`);
  ok(cards.every((c) => c.say && c.label), 'every card states its tier and its path in words');
  const tiers = cards.reduce((a, c) => ((a[c.tier] = (a[c.tier] || 0) + 1), a), {});
  ok(tiers.common === 24 && tiers.rare === 36 && tiers.epic === 24 && tiers.legendary === 12, `tiers 24/36/24/12 (got ${JSON.stringify(tiers)})`);
  ok(cards.filter((c) => c.tier === 'legendary').every((c) => /^First: |^Opens with its world/.test(c.say)), 'a Legendary first asks for its learning milestone');
  ok(cards.filter((c) => c.state === 'world').length === 48, `packs 5–12 wait for their worlds on the free plan; their Commons are free all the same (got ${cards.filter((c) => c.state === 'world').length})`);
  await p.click('.bz-av[data-id=pyrafox] .btn'); await p.waitForTimeout(200);
  const after = await p.evaluate(() => ({ k: window.__bzm.R.h.kids[0], w: JSON.parse(localStorage.getItem('bizzing.wallet')).kids.ahana }));
  ok(after.k.avatar === 'pyrafox' && after.k.shop.avatars.includes('pyrafox') && after.w.coins === 580 && after.w.ledger.some((x) => x.why === 'avatar:pyrafox' && x.n === -120), `a Rare costs exactly 120 coins through the wallet (got ${after.w.coins})`);
  await p.evaluate(() => { location.hash = '#/shop'; }); await p.waitForTimeout(150);
  await p.click('.shop-tabs [data-arg=worlds]'); await p.waitForTimeout(150);
  await p.click('.world-card [data-act=buyWorld][data-arg="3"]'); await p.waitForTimeout(200);
  const w3 = await p.evaluate(() => ({ k: window.__bzm.R.h.kids[0], w: JSON.parse(localStorage.getItem('bizzing.wallet')).kids.ahana, theme: document.documentElement.dataset.theme }));
  ok(w3.k.shop.worlds.includes(3) && w3.w.coins === 340 && w3.theme === 'blueprint', `world 3 opens for 240 coins and dresses the app (got ${w3.w.coins}, ${w3.theme})`);
  await p.click('.shop-tabs [data-arg=avatars]'); await p.waitForTimeout(150);
  const tabs = await p.$$eval('.shop-tabs [role=tab]', (t) => t.map((x) => x.textContent.trim()));
  ok(tabs.join() === 'Avatars,Worlds,Extras' && await p.locator('.wal-card .wal-list li').count() >= 3, `the Shop: Avatars · Worlds · Extras, then the wallet history (got ${tabs})`);
  const lines = await p.$$eval('.wal-card .wal-list li', (l) => l.map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
  ok(lines.some((l) => /bought Pyramid Fox/.test(l)) && lines.some((l) => /opened Inventor’s Harbour/.test(l)) && lines.some((l) => /Bee/.test(l)), `the wallet history says it in words, with the app (got ${lines.slice(0, 3).join(' | ')})`);
  await ctx.close();
}

/* the six worlds (§7): painted by day and by night, three layers, paused when hidden, frozen under reduced motion; AA on the cards over them */
const WORLDS6 = ['graph', 'chalk', 'blueprint', 'orbit', 'rangoli', 'arcade'];
function lum(c) { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
for (const [vp, tag] of [[{ width: 1280, height: 800 }, 'desk'], [{ width: 390, height: 844 }, 'phone']]) {
  for (const mode of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: vp, colorScheme: mode, isMobile: vp.width < 500, hasTouch: vp.width < 500 });
    const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(e.message));
    await p.addInitScript((hh) => { if (!localStorage.getItem('bzm_household')) localStorage.setItem('bzm_household', JSON.stringify(hh)); }, seeded({ plan: 'family' }));
    await p.goto(BASE); await p.waitForSelector('.home2');
    for (const w of WORLDS6) {
      await p.evaluate((id) => window.__bzm.fire('theme', id), w); await p.waitForTimeout(500);
      const st = await p.evaluate(() => { const pl = document.querySelector('.ws-plate'), cs = getComputedStyle(pl);
        return { bg: cs.backgroundImage, layers: [['.ws-plate'], ['.ws-near'], ['.ws-parts i'], ['.ws-idle', '.ws-idle > *']].filter((ss) => ss.some((s) => { const e = document.querySelector(s); return e && getComputedStyle(e).animationName !== 'none'; })).length,
          card: getComputedStyle(document.querySelector('[data-bz=greet]')).backgroundColor, ink: getComputedStyle(document.querySelector('[data-bz=greet] strong')).color, muted: getComputedStyle(document.querySelector('[data-bz=greet] small')).color }; });
      ok(new RegExp(`world-${w}-${mode === 'dark' ? 'night' : 'day'}${vp.width < 701 ? '-s' : ''}\\.webp`).test(st.bg), `${tag} ${mode}: ${w} wears its ${mode === 'dark' ? 'painted night' : 'day'} plate (got ${st.bg.slice(-40)})`);
      ok(st.layers === 4, `${tag} ${mode}: ${w} has its ambient layers moving (got ${st.layers})`);
      ok(contrast(st.ink, st.card) >= 4.5 && contrast(st.muted, st.card) >= 4.5, `${tag} ${mode}: ${w} text over the world passes AA (${contrast(st.ink, st.card).toFixed(1)}, ${contrast(st.muted, st.card).toFixed(1)})`);
      await p.screenshot({ path: `${SHOTS}/std-world-${w}-${mode}-${tag}.png` });
    }
    await p.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    ok(await p.$eval('.ws-plate', (e) => getComputedStyle(e).animationPlayState) === 'paused', `${tag} ${mode}: the world pauses when the page is hidden`);
    await ctx.close();
  }
}
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); await p.addInitScript((hh) => { if (!localStorage.getItem('bzm_household')) localStorage.setItem('bzm_household', JSON.stringify(hh)); }, seeded());
  await p.goto(BASE); await p.waitForSelector('.home2');
  ok(await p.$$eval('.wstage, .wstage *', (els) => els.every((e) => getComputedStyle(e).animationName === 'none')), 'reduced motion freezes the world to its still');
  await ctx.close();
}

/* music (§11): Home's loop after the first tap, the world's elsewhere, nothing in Calm mode, a game's in a game */
{
  const { p, ctx } = await open({ width: 1280, height: 800 }, seeded());
  await p.waitForSelector('.home2');
  ok(await p.evaluate(() => document.documentElement.dataset.music !== 'on'), 'no music before the first tap');
  await p.mouse.click(640, 30); await p.waitForTimeout(900);
  ok(await p.evaluate(() => document.documentElement.dataset.music === 'on' && document.documentElement.dataset.tune === 'home'), 'Home plays its own loop after the first tap');
  await p.evaluate(() => window.__bzm.go('atlas')); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.documentElement.dataset.tune) === 'hills', 'elsewhere, the world’s own loop (Patchwork Hills)');
  await p.evaluate(() => window.__bzm.fire('setDev', 'calm')); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.documentElement.dataset.music) === 'off', 'Calm mode turns the music off');
  await ctx.close();
}

/* search (C4): three known things, from three kinds */
{
  const { p, ctx } = await open({ width: 1280, height: 800 }, seeded());
  await p.fill('[data-bz=search] input', 'bakery'); await p.press('[data-bz=search] input', 'Enter'); await p.waitForSelector('#q');
  ok(await p.evaluate(() => window.__bzm.R.ui.nav) === 'search' && await p.locator('.results button').count() > 0, 'the bar’s search opens the results');
  for (const [q, want, kind] of [['bakery', 'The Fraction Bakery', 'Place'], ['suki', '', 'Story'], ['hypotenuse', 'hypotenuse', 'Word']]) {
    await p.fill('#q', ''); await p.type('#q', q); await p.waitForTimeout(700);
    const res = await p.$$eval('.results button', (b) => b.map((x) => ({ kind: x.querySelector('.r-kind').textContent, t: x.querySelector('b').textContent })));
    ok(res.some((r) => r.kind.toLowerCase() === kind.toLowerCase() && (!want || r.t.toLowerCase() === want.toLowerCase())), `search "${q}" finds a ${kind}${want ? ` (${want})` : ''} (got ${res.slice(0, 3).map((r) => r.kind + ':' + r.t).join(', ')})`);
  }
  await p.fill('#q', ''); await p.type('#q', 'bakery'); await p.waitForTimeout(300);
  await p.click('.results button'); await p.waitForTimeout(250);
  ok((await p.evaluate(() => window.__bzm.R.ui.nav)) === 'world', 'a result opens what it names');
  await ctx.close();
}

/* the mistakes deck (F3): a miss goes in, comes back after a gap, and moves on */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage(); await p.clock.install();
  await p.addInitScript((hh) => { if (!localStorage.getItem('bzm_household')) localStorage.setItem('bzm_household', JSON.stringify(hh)); }, seeded());
  await p.goto(BASE); await p.waitForSelector('.home2');
  await p.evaluate(() => window.__bzm.fire('startFacts', '×')); await p.clock.runFor(300);
  await p.keyboard.press('9'); await p.keyboard.press('9'); await p.keyboard.press('9'); await p.keyboard.press('Enter'); await p.clock.runFor(300);
  const d0 = await p.evaluate(() => Object.values(window.__bzm.R.h.kids[0].mistakes));
  ok(d0.length === 1 && d0[0].due > Date.now(), `a miss goes into the deck, not due today (got ${d0.length})`);
  await p.evaluate(() => window.__bzm.go('home')); await p.clock.runFor(200);
  ok(await p.locator('[data-bz=second] a[href="#/mistakes"]').count() === 0, 'Home does not offer it before its gap');
  await p.clock.fastForward(26 * 3600e3); await p.evaluate(() => window.__bzm.render()); await p.clock.runFor(200);
  ok(await p.locator('[data-bz=second] a[href="#/mistakes"]').count() === 1, 'after a day it comes back on Home');
  await p.evaluate(() => window.__bzm.go('mistakes')); await p.clock.runFor(200);
  await p.click('[data-act=startMistakes]'); await p.clock.runFor(300);
  const ans = await p.evaluate(() => window.__bzm.R.run.items[0].ans);
  for (const ch of String(ans)) await p.keyboard.press(ch);
  await p.clock.runFor(1500);
  const d1 = await p.evaluate(() => Object.values(window.__bzm.R.h.kids[0].mistakes));
  ok(d1.length === 1 && d1[0].box === 1 && d1[0].due > Date.now() + 864e5, `right after its gap, it moves on to three days (box ${d1[0] && d1[0].box})`);
  await ctx.close();
}

/* certificates (T9): a PNG made on the device, from the grown-ups area */
{
  const h = seeded(); const A = h.kids[0];
  const { p, ctx } = await open({ width: 1280, height: 800 }, h);
  await p.evaluate(() => { const k = window.__bzm.R.h.kids[0]; for (const t of window.__bzm.tricksIn('gardens')) k.tricks[t.id] = { stars: 2, learned: true }; window.__bzm.go('grownups'); });
  for (const ch of '1234') await p.keyboard.press(ch);
  await p.waitForSelector('.certs');
  ok(await p.locator('.certs [data-act=cert]').count() >= 1, 'a finished place gives a certificate in the grown-ups area');
  const dl = p.waitForEvent('download');
  await p.click('.certs [data-act=cert]');
  const file = await dl;
  ok(/^bizzing-maths-ahana-world-gardens\.png$/.test(file.suggestedFilename()), `the certificate saves as a PNG on the device (got ${file.suggestedFilename()})`);
  await p.evaluate(() => window.__bzm.go('home'));
  ok(await p.locator('[data-act=cert]').count() === 0, 'no certificate button on a child’s screen');
  void A; await ctx.close();
}

/* first paint: ≤ 250 KB of fonts (§9) */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); const fonts = [];
  p.on('response', async (r) => { if (/\.woff2$/.test(r.url())) { try { fonts.push({ u: r.url().split('/').pop(), n: (await r.body()).length }); } catch {} } });
  await p.addInitScript((hh) => { if (!localStorage.getItem('bzm_household')) localStorage.setItem('bzm_household', JSON.stringify(hh)); }, seeded());
  await p.goto(BASE); await p.waitForSelector('.home2'); await p.waitForLoadState('networkidle');
  const kb = Math.round(fonts.reduce((a, f) => a + f.n, 0) / 1024);
  ok(kb <= 250 && fonts.length <= 4, `≤ 250 KB and ≤ 4 faces of fonts before first paint (got ${kb} KB: ${fonts.map((f) => f.u.split('-').slice(0, 2).join('-')).join(', ')})`);
  await ctx.close();
}

ok(!errors.length, 'no page errors: ' + errors.slice(0, 4).join(' | '));
for (const [k, f] of Object.entries(SHELL)) console.log(`checkShell ${k}: ${f.length ? f.join('; ') : '[]'}`);
await close();
console.log(`${fails() ? 'FAIL' : 'ok'} standard — fix-first; top bar, ☰, tabs, Home, Settings, emoji, overflow, targets; 96 avatars and the Shop; six worlds day and night; music; search; mistakes; certificates; fonts`);
if (fails()) process.exit(1);
