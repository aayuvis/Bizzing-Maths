/* test/standard.mjs — the family standard v2 checks (FIX-MATHS 2 Oct 2026), on the BUILT
   app at its GitHub Pages sub-path, desktop 1280 and phone 390.

   §1 Fix first: the grown-ups report fits a 390px phone · an unknown hash lands on Home ·
   tester mode draws no lock on anything it opened, and no road stop is a blank circle ·
   ⬡ stays in the top bar during a run and hides only inside a timed contest question.

   Every assertion here was watched to fail once before it was trusted. */
import { until, ready, site, household, kidRec, checker, SHOTS } from './lib/site.mjs';
import { checkShell } from './lib/shell-check.mjs';

const { BASE, browser, close } = await site('std', +(process.env.PORT_BASE || 5200) + 4);
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
  await p.goto(BASE + url); await ready(p);
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
    await p.evaluate(() => { window.__bzm.R.ui.jlv = 8; window.__bzm.render(); }); await ready(p);
    const blank = await p.$$eval('.lboard .bpin > span:first-child', (s) => s.filter((x) => !x.textContent.trim() && !x.querySelector('svg')).length);
    ok(blank === 0, `${tag}: no road stop is a blank circle on a later level in tester mode (got ${blank})`);
    ok(await p.locator('.lboard .bpin.shut').count() === 0, `${tag}: tester mode shows no shut stop on the road`);
    await p.screenshot({ path: `${SHOTS}/std-${tag}-tester-road.png` });
    await p.evaluate(() => window.__bzm.fire('openWorld', 'observatory')); await ready(p);
    ok(await p.locator('.board .lvb.later, .board .bpin.shut').count() === 0, `${tag}: tester mode draws no lock on world-board pins`);
    for (const tool of ['vedic', 'chinese', 'tables']) {
      await p.evaluate((t) => window.__bzm.go('lib', t), tool); await ready(p);
      const locked = await p.$$eval('.locked, .bpin.shut', (s) => s.filter((x) => x.offsetParent).length);
      ok(locked === 0, `${tag}: tester mode leaves no locked ${tool} stone (got ${locked})`);
    }
    await ctx.close();
  }
  /* 4 · ⬡ stays in the bar during a run; hides only in a timed contest question */
  {
    const { p, ctx } = await open(vp, seeded());
    await p.evaluate(() => window.__bzm.fire('startFacts', '×')); await ready(p);
    const hiveVis = () => p.$eval('[data-bz=hive]', (e) => getComputedStyle(e).visibility === 'visible');
    ok(await nav(p) === 'run' && await hiveVis(), `${tag}: ⬡ stays in the top bar during a drill`);
    await p.evaluate(() => window.__bzm.go('contest')); await p.evaluate(() => window.__bzm.fire('startContest')); await ready(p);
    ok(!(await hiveVis()), `${tag}: ⬡ hides inside a timed contest question`);
    await ctx.close();
  }
}


/* ================================================================== §2–§11 harmonise, §3 key elements */
const EMOJI = /\p{Extended_Pictographic}/u;
const ROUTES = ['home', 'hall', 'atlas', 'journey', 'library', 'puzzles', 'play', 'contest', 'facts', 'goals', 'stories', 'me', 'shop', 'collection', 'medals', 'settings', 'help', 'mistakes', 'search', 'privacy', 'world/bakery', 'stop/make-ten', 'lib/dictionary', 'lib/vedic'];
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
  ok(/Bizzing\s*Maths/.test(await p.textContent('[data-bz=brand]')) && await p.$eval('[data-bz=brand] img', (i) => /octo-logo/.test(i.src)), `${tag}: the logo is Octo and "Bizzing Maths"`);
  // Octo in FULL beside the name (owner, 3 Oct 2026). A crop shows as a flat cut: the last painted row
  // (or column) on that side is solid. A whole Octo ends in tentacle tips and a round head, never a line.
  const cut = await p.$eval('[data-bz=brand] img', async (i) => {
    if (!i.complete) await new Promise((r) => { i.onload = r; });
    const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight;
    const x = c.getContext('2d'); x.drawImage(i, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height;
    const a = (px, py) => d[(py * W + px) * 4 + 3];
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) if (a(px, py) > 16) { x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
    const row = (py) => { let n = 0; for (let px = x0; px <= x1; px++) n += a(px, py) > 128; return n / (x1 - x0 + 1); };
    const col = (px) => { let n = 0; for (let py = y0; py <= y1; py++) n += a(px, py) > 128; return n / (y1 - y0 + 1); };
    return Math.max(row(y0), row(y1), col(x0), col(x1));
  });
  ok(cut < 0.3, `${tag}: the logo shows all of Octo — one edge is ${Math.round(cut * 100)}% solid, a cut`);
  const tabs = await p.$$eval(phone ? '[data-bz=tabbar] a' : '[data-bz=tab]', (b) => b.map((x) => x.textContent.trim()));
  // My Feed is the sixth and LAST tab, after Play (owner, 2 Oct 2026; standard §6a)
  ok(tabs.join() === 'Home,Atlas,Library,Puzzles,Play,My Feed', `${tag}: tabs are Home · Atlas · Library · Puzzles · Play · My Feed (got ${tabs})`);
  ok(await p.locator('[data-bz=greet] img').count() === 1 && await p.locator('[data-bz=greet] > img[src*="avatars/"]').count() === 1 && (await p.textContent('[data-bz=greet] .bz-bubble')).length > 20, `${tag}: the hello card shows the child's own face, with a line about the child`);
  const items = await p.$$eval('[data-bz=drawer] a', (x) => x.map((e) => e.querySelector('b').textContent.trim()));
  ok(items.join('|') === 'My page|Shop|Collection|Medals|My mistakes|What I’m learning|The Story Shelf|My Feed|Settings|Grown-ups|Help|Privacy|Back to the Hive', `${tag}: ☰ lists the family order (got ${items.join('|')})`);
  /* the coin chip opens the wallet history (§1.1) */
  await p.click('[data-bz=coins]'); await ready(p);
  ok(await p.locator('.sheet.wallet').count() === 1 && /Bizzing coins/.test(await p.textContent('.sheet.wallet')), `${tag}: the coin chip opens the wallet`);
  await p.keyboard.press('Escape'); await ready(p);
  /* every screen: no emoji in a control, no broken text, no sideways scroll */
  for (const r of ROUTES) {
    await p.evaluate((x) => { location.hash = '#/' + x; }, r); await ready(p);
    const em = await emojiIn(p);
    ok(em.length === 0, `${tag}: zero emoji in controls on #/${r} (got ${em.slice(0, 4).join(' | ')})`);
    const txt = await p.evaluate(() => document.querySelector('main').innerText);
    ok(!BAD_TEXT.test(txt), `${tag}: no [object Object], {placeholder}, undefined or NaN on #/${r} (${(txt.match(BAD_TEXT) || [])[0]})`);
    ok(await width(p) <= vp.width, `${tag}: no sideways scroll on #/${r} (${await width(p)})`);
  }
  /* touch targets (P3, audit v4): on a phone, every visible button, link and [data-act] control on every main
     screen — and the bar and the tab bar around it — is at least 44 × 44 CSS px. ONE exemption, stated: a link
     that is a run of words inside a sentence (an <a> or .linkish inside a <p>, or the footer's links), where
     the line itself is the target (WCAG 2.5.8's inline exception). A standalone "Learn it →" is not inline.
     The top bar is not this app's to size: it is Bee's, placed to Bee's measured pixels by checkShell (rule 16),
     so its 37px buttons are a family finding, reported, not overridden here. The phone tab bar IS checked. */
  if (phone) for (const r of ROUTES) {
    await p.evaluate((x) => { location.hash = '#/' + x; }, r); await ready(p);
    const small = await p.$$eval('main button, main a[href], main [data-act], main [role=tab], main summary, [data-bz=tabbar] a', (b) => [...new Set(b)].filter((x) => {
      if (!x.offsetParent || x.closest('.bz-foot, .foot') || x.closest('p, li > span') && (x.tagName === 'A' || x.classList.contains('linkish'))) return false;
      if (x.closest('[aria-hidden=true]') || x.disabled) return false;
      const cs = getComputedStyle(x); if (cs.visibility === 'hidden') return false;
      const r = x.getBoundingClientRect(); return r.width < 43.5 || r.height < 43.5; })
      .map((x) => `${x.tagName.toLowerCase()}.${String(x.className || '').split(' ')[0]}${x.dataset.act ? '[' + x.dataset.act + ']' : ''} "${(x.innerText || x.getAttribute('aria-label') || '').trim().slice(0, 14)}" ${Math.round(x.getBoundingClientRect().width)}×${Math.round(x.getBoundingClientRect().height)}`));
    ok(small.length === 0, `${tag}: every target on #/${r} is ≥ 44 × 44px (got ${small.length}: ${small.slice(0, 6).join(', ')})`);
  }
  /* N12: the Puzzle Tower's floor pins never overlap on a phone */
  if (phone) {
    await p.evaluate(() => { location.hash = '#/puzzles'; }); await ready(p);
    const boxes = await p.$$eval('.fpin', (b) => b.map((x) => x.getBoundingClientRect()).map((r) => [r.left, r.top, r.right, r.bottom]));
    let hits = 0; for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const [a, b] = [boxes[i], boxes[j]]; if (a[0] < b[2] - 1 && b[0] < a[2] - 1 && a[1] < b[3] - 1 && b[1] < a[3] - 1) hits++; }
    ok(boxes.length === 12 && hits === 0, `${tag}: the twelve tower pins do not overlap (${hits} overlaps)`);
  }
  /* Settings in the five sections, in order (§5) */
  await p.evaluate(() => { location.hash = '#/settings'; }); await ready(p);
  const secs = await p.$$eval('.set-sec', (s) => s.map((x) => x.dataset.sec));
  ok(secs.join() === 'me,sound,look,comfort,grownups', `${tag}: Settings sections in the standard's order (got ${secs})`);
  ok(await p.locator('.set-sec[data-sec=sound] input[type=range]').count() === 1, `${tag}: one volume slider`);
  await ctx.close();
}

/* emoji in the Library's tools and the grown-ups report (§9). The route sweep above saw only each tool's
   first screen, and 45 emoji sat a tab or a click away (Number Explorer, Shape Studio, Formula Book, the report's
   strands). So: every tool, every tab it shows (and the tabs those open), one opened item of each kind, and the
   report — any emoji in a control fails. A control is a button, a link, a role=button/tab/radio/switch/option,
   a chip, a <label>, a <select> or a <summary>. Watched to fail on 🎲 Random before it was trusted. */
const TOOLS = ['explorer', 'working', 'tables', 'shapes', 'graphs', 'dictionary', 'formulas', 'vedic', 'chinese'];
const CTRL = 'button, a, [role=button], [role=tab], [role=radio], [role=switch], [role=option], .chip, label, select, summary';
async function ctrlEmoji(p) {
  return p.evaluate(([src, sel]) => { const re = new RegExp(src, 'u'), out = [];
    for (const el of document.querySelectorAll(sel)) {
      if (!el.offsetParent || el.closest('[data-bz=bar], [data-bz=tabbar], [data-bz=drawer], .bz-foot')) continue;
      const t = (el.innerText || el.textContent || '') + ' ' + (el.tagName === 'SELECT' ? [...el.options].map((o) => o.text).join(' ') : '');
      if (re.test(t)) out.push(t.trim().replace(/\s+/g, ' ').slice(0, 28));
    }
    return out; }, [EMOJI.source, CTRL]);
}
const TABSEL = 'main [role=tab], main [data-act=lib][data-arg^="tab|"], main [data-act=lib][data-arg^="mode|"]';
const OPENERS = ['open|', 'card|', 'set|', 'solid|', 'letter|', 'ex|'];
for (const [vp, tag] of [[{ width: 1280, height: 800 }, 'desk'], [{ width: 390, height: 844 }, 'phone']]) {
  const { p, ctx } = await open(vp, seeded({ plan: 'family' }));
  await p.waitForSelector('.home2');
  const found = [];
  const scan = async (where) => { for (const e of await ctrlEmoji(p)) found.push(`${where}: ${e}`); };
  const goTool = async (t) => { await p.evaluate((x) => { location.hash = '#/home'; location.hash = '#/lib/' + x; }, t); await ready(p); };
  const clickKey = (key) => p.evaluate(([sel, k]) => { const el = [...document.querySelectorAll(sel)].find((e) => e.offsetParent && ((e.dataset.arg || '') + '#' + e.textContent.trim()) === k); if (el) el.click(); return !!el; }, [TABSEL, key]);
  let views = 0;
  for (const t of TOOLS) {
    await goTool(t); await scan(t); views++;
    const seen = new Set();
    for (let round = 0; round < 3; round++) {
      const keys = await p.$$eval(TABSEL, (els) => els.filter((e) => e.offsetParent).map((e) => (e.dataset.arg || '') + '#' + e.textContent.trim()));
      const fresh = keys.filter((k) => !seen.has(k)); if (!fresh.length) break;
      for (const k of fresh) { seen.add(k); if (await clickKey(k)) { await ready(p); await scan(`${t} › ${k.split('#')[1].slice(0, 20)}`); views++; } }
    }
    for (const o of OPENERS) {
      await goTool(t);
      const hit = await p.evaluate((pre) => { const el = [...document.querySelectorAll(`main [data-arg^="${pre}"]`)].find((e) => e.offsetParent); if (el) el.click(); return !!el; }, o);
      if (hit) { await ready(p); await scan(`${t} › ${o}`); views++; }
    }
  }
  await p.evaluate(() => { location.hash = '#/grownups'; }); await ready(p);
  for (const ch of '1234') await p.keyboard.press(ch);
  await p.waitForSelector('.rc'); await scan('grown-ups');
  const rcEmoji = await p.$$eval('.rc', (r, src) => r.flatMap((x) => (x.innerText.match(new RegExp(src, 'gu')) || [])), EMOJI.source.replace('/u', ''));
  ok(views >= 30, `${tag}: the emoji sweep opened every tool's tabs and items (${views} views)`);
  ok(found.length === 0, `${tag}: zero emoji in a control on any Library tool or the grown-ups report (got ${found.length}: ${found.slice(0, 6).join(' | ')})`);
  ok(rcEmoji.length === 0, `${tag}: the grown-ups report draws its strands as icons, not emoji (got ${rcEmoji.join(' ')})`);
  if (process.env.EMOJI_LIST) console.log(tag, found.length, '\n  ' + found.join('\n  '), '\n  report:', rcEmoji.join(' '));
  await ctx.close();
}

/* checkShell: Home with a child, desktop and phone, light and dark — must be [] */
for (const [vp, tag] of [[{ width: 1280, height: 800 }, 'desk'], [{ width: 390, height: 844 }, 'phone']]) for (const mode of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: vp, colorScheme: mode, isMobile: vp.width < 500, hasTouch: vp.width < 500 });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(e.message));
  await p.addInitScript((hh) => { if (!localStorage.getItem('bzm_household')) localStorage.setItem('bzm_household', JSON.stringify(hh)); }, seeded());
  await p.goto(BASE); await p.waitForSelector('[data-bz=home]'); await ready(p);
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
  await p.reload(); await p.evaluate(() => { location.hash = '#/collection'; }); await ready(p);
  const cards = await p.$$eval('.bz-av', (c) => c.map((x) => ({ tier: x.dataset.tier, state: x.dataset.state, say: x.querySelector('.av-say').textContent.trim(), label: x.querySelector('figcaption b').textContent })));
  ok(cards.length === 96, `the Collection shows all 96 (got ${cards.length})`);
  ok(cards.every((c) => c.say && c.label), 'every card states its tier and its path in words');
  const tiers = cards.reduce((a, c) => ((a[c.tier] = (a[c.tier] || 0) + 1), a), {});
  ok(tiers.common === 24 && tiers.rare === 36 && tiers.epic === 24 && tiers.legendary === 12, `tiers 24/36/24/12 (got ${JSON.stringify(tiers)})`);
  ok(cards.filter((c) => c.tier === 'legendary').every((c) => /^First: |^Opens with its world/.test(c.say)), 'a Legendary first asks for its learning milestone');
  ok(cards.filter((c) => c.state === 'world').length === 48, `packs 5–12 wait for their worlds on the free plan; their Commons are free all the same (got ${cards.filter((c) => c.state === 'world').length})`);
  await p.click('.bz-av[data-id=pyrafox] .btn'); await ready(p);
  const after = await p.evaluate(() => ({ k: window.__bzm.R.h.kids[0], w: JSON.parse(localStorage.getItem('bizzing.wallet')).kids.ahana }));
  ok(after.k.avatar === 'pyrafox' && after.k.shop.avatars.includes('pyrafox') && after.w.coins === 580 && after.w.ledger.some((x) => x.why === 'avatar:pyrafox' && x.n === -120), `a Rare costs exactly 120 coins through the wallet (got ${after.w.coins})`);
  await p.evaluate(() => { location.hash = '#/shop'; }); await ready(p);
  await p.click('.shop-tabs [data-arg=worlds]'); await ready(p);
  await p.click('.world-card [data-act=buyWorld][data-arg="3"]'); await ready(p);
  const w3 = await p.evaluate(() => ({ k: window.__bzm.R.h.kids[0], w: JSON.parse(localStorage.getItem('bizzing.wallet')).kids.ahana, theme: document.documentElement.dataset.theme }));
  ok(w3.k.shop.worlds.includes(3) && w3.w.coins === 340 && w3.theme === 'blueprint', `world 3 opens for 240 coins and dresses the app (got ${w3.w.coins}, ${w3.theme})`);
  await p.click('.shop-tabs [data-arg=avatars]'); await ready(p);
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
      await p.evaluate((id) => window.__bzm.fire('theme', id), w); await ready(p);
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

/* the owner's visual audit (3 Oct 2026), each note turned into a measurement, desktop and phone, light and dark.
   All of these were run against the build before the fixes and failed there first. */
// colours come back from the page through a canvas, so color-mix()'s color(srgb …) reads as rgb like any other
const NORM = 'window.__rgb = (c) => { const x = document.createElement("canvas").getContext("2d"); x.fillStyle = "#000"; x.fillStyle = c; return x.fillStyle; };';
const rgba = (c) => { c = String(c); if (/^#[\da-f]{6}$/i.test(c)) return { r: parseInt(c.slice(1, 3), 16), g: parseInt(c.slice(3, 5), 16), b: parseInt(c.slice(5, 7), 16), a: 1 };
  const m = c.match(/[\d.]+/g) || [0, 0, 0, 0], k = /^color\(srgb/.test(c) ? 255 : 1;
  return { r: Math.round(m[0] * k), g: Math.round(m[1] * k), b: Math.round(m[2] * k), a: m[3] == null ? 1 : +m[3] }; };
const rgbStr = (c) => { const x = rgba(c); return `rgb(${x.r}, ${x.g}, ${x.b})`; };
const chroma = (c) => { const x = rgba(c); return Math.max(x.r, x.g, x.b) - Math.min(x.r, x.g, x.b); };
for (const [vp, tag] of [[{ width: 1280, height: 800 }, 'desk'], [{ width: 390, height: 844 }, 'phone']]) for (const mode of ['light', 'dark']) {
  const T = `${tag} ${mode}`;
  const ctx = await browser.newContext({ viewport: vp, colorScheme: mode, isMobile: vp.width < 500, hasTouch: vp.width < 500 });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(e.message));
  await p.addInitScript(NORM);
  await p.addInitScript((hh) => { if (!localStorage.getItem('bzm_household')) localStorage.setItem('bzm_household', JSON.stringify(hh)); }, seeded({ plan: 'family', tester: true }));
  await p.goto(BASE); await p.waitForSelector('.home2');
  const to = async (h) => { await p.evaluate((x) => { location.hash = x; }, h); await ready(p); };
  /* 1 · Play: a hero tile's picture never sits on its words, and no tile is white on white */
  await to('#/play');
  const heroes = await p.$$eval('.hero-t', (ts) => ts.map((t) => {
    const after = getComputedStyle(t, '::after').content, ic = t.querySelector('.hero-ic'), cs = getComputedStyle(t);
    const icR = ic && ic.getBoundingClientRect(); let over = 0;
    const w = document.createTreeWalker(t, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) { if (!n.textContent.trim() || (ic && ic.contains(n))) continue; const rg = document.createRange(); rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) if (icR && r.right > icR.left + 1 && r.left < icR.right - 1 && r.bottom > icR.top + 1 && r.top < icR.bottom - 1) over++; }
    return { id: t.className, raster: after && after !== 'none' && after !== 'normal', over, bg: cs.backgroundImage, bgc: __rgb(cs.backgroundColor), ink: __rgb(cs.color) };
  }));
  heroes.forEach((h) => { h.bgc = rgbStr(h.bgc); h.ink = rgbStr(h.ink); });
  ok(heroes.length === 4 && heroes.every((h) => !h.raster && h.over === 0), `${T}: no Play hero picture covers its text (${heroes.filter((h) => h.raster || h.over).map((h) => h.id).join(', ')})`);
  ok(heroes.every((h) => h.bg !== 'none' || contrast(h.ink, h.bgc) >= 3), `${T}: every Play hero tile has a ground under its words (${heroes.filter((h) => h.bg === 'none' && contrast(h.ink, h.bgc) < 3).map((h) => h.id).join(', ')})`);
  /* 2 · a page subtitle wraps; it is never cut with an ellipsis */
  for (const r of ['puzzles', 'library', 'medals', 'atlas', 'contest', 'goals']) {
    await to('#/' + r);
    const cut = await p.$$eval('.phead-t p', (ps) => ps.filter((x) => x.offsetParent).filter((x) => { const c = getComputedStyle(x); return c.textOverflow === 'ellipsis' || c.whiteSpace === 'nowrap' || x.scrollWidth > x.clientWidth + 1; }).map((x) => x.textContent.slice(0, 24)));
    ok(cut.length === 0, `${T}: #/${r}'s subtitle wraps, never cut (${cut.join(' | ')})`);
  }
  /* 3 · world-board road badges are pills over the pin, never a disc across it */
  await to('#/world/carnival');
  const lv = await p.$$eval('.board .bpin .lvb', (b) => b.map((x) => Math.round(x.getBoundingClientRect().height)));
  ok(lv.length > 0 && lv.every((h) => h <= 24), `${T}: the Data Carnival's road badges are pills (heights ${[...new Set(lv)].join(',')})`);
  /* 4 · the Continue card's title is a title in every world (orbit's h3 once fell to body size) */
  await to('#/home');
  for (const w of WORLDS6) {
    await p.evaluate((id) => window.__bzm.fire('theme', id), w); await ready(p);
    const fs = await p.$eval('.bz-jbody h3', (h) => parseFloat(getComputedStyle(h).fontSize)).catch(() => 0);
    ok(fs >= 18, `${T}: ${w}'s Continue card title is a title (${fs}px)`);
  }
  await p.evaluate(() => window.__bzm.fire('theme', 'graph'));
  /* 5 · progress tracks show their empty part on the card they sit on */
  for (const tool of ['formulas', 'vedic', 'chinese', 'tables']) {
    await to('#/lib/' + tool);
    const tr = await p.$$eval('[role=progressbar]', (bs) => bs.filter((b) => b.offsetParent).map((b) => {
      const own = __rgb(getComputedStyle(b).backgroundColor); let e = b.parentElement, under = null;
      while (e) { const c = __rgb(getComputedStyle(e).backgroundColor); const a = +(c.match(/[\d.]+/g) || [])[3]; if (c !== 'rgba(0, 0, 0, 0)' && (isNaN(a) || a > 0.5)) { under = c; break; } e = e.parentElement; }
      return { own, under: under || __rgb(getComputedStyle(document.body).backgroundColor) };
    }));
    const flat = tr.map(({ own, under }) => { const o = rgba(own), u = rgba(under); const mix = (k) => Math.round(o[k] * o.a + u[k] * (1 - o.a)); return contrast(`rgb(${mix('r')},${mix('g')},${mix('b')})`, rgbStr(under)); });
    // (the Formula Book's count drops its bar on a phone; elsewhere a track must be there)
    ok((tr.length > 0 || (tool === 'formulas' && tag === 'phone')) && flat.every((c) => c >= 1.25), `${T}: ${tool}'s progress track is visible on its ground (contrast ${flat.map((c) => c.toFixed(2)).join(', ')})`);
  }
  /* C · the Formula Book's pictures are in colour, in the world's colours, locked or collected */
  await to('#/lib/formulas');
  const lockedFill = await p.$eval('.t-formulas-tile.locked .t-formulas-tpic .dg-fill1', (e) => [__rgb(getComputedStyle(e).fill), getComputedStyle(e.closest('svg')).opacity, getComputedStyle(e.closest('svg')).filter]);
  ok(chroma(lockedFill[0]) >= 18 && +lockedFill[1] >= 0.5 && lockedFill[2] === 'none', `${T}: a locked formula card is a coloured silhouette, not grey (${lockedFill.join(' / ')})`);
  await p.evaluate(() => { const b = document.querySelector('[data-arg="open|area-trapezium"]'); if (b) b.click(); }); await ready(p);
  const fills = await p.$$eval('.t-formulas-pic .dg-fill1, .t-formulas-pic .dg-fill2', (es) => [...new Set(es.map((e) => __rgb(getComputedStyle(e).fill)))]);
  ok(fills.length === 2 && fills.every((f) => chroma(f) >= 18), `${T}: the trapezium's two copies are two colours (${fills.join(' / ')})`);
  await p.evaluate(() => window.__bzm.fire('theme', 'rangoli')); await ready(p);
  const fillsR = await p.$$eval('.t-formulas-pic .dg-fill1', (es) => __rgb(getComputedStyle(es[0]).fill)).catch(() => '');
  ok(fillsR && fillsR !== fills[0], `${T}: the Formula Book's colours come from the world (graph ${fills[0]}, rangoli ${fillsR})`);
  await p.evaluate(() => window.__bzm.fire('theme', 'graph'));
  /* 6 · certificates: the child's name and the line after it are two things */
  await to('#/grownups');
  for (const ch of '1234') await p.keyboard.press(ch);
  await p.waitForSelector('.certs');
  const gap = await p.$$eval('.cert-row', (rs) => rs.map((r) => { const b = r.querySelector('b'), n = b && b.nextElementSibling; if (!n) return 99; const x = b.getBoundingClientRect(), y = n.getBoundingClientRect(); return y.top >= x.bottom - 1 ? 99 : Math.round(y.left - x.right); }));
  ok(gap.length > 0 && gap.every((g) => g >= 6), `${T}: a certificate row keeps the name apart from its line (gaps ${gap.join(',')})`);
  /* 8 · on a dark page, every painted daylight plate is dimmed to dusk */
  if (mode === 'dark') for (const r of ['atlas', 'library', 'journey', 'play', 'puzzles', 'feed', 'world/bakery', 'home']) {
    await to('#/' + r);
    const lit = await p.evaluate(() => { const out = [];
      for (const e of document.querySelectorAll('main *, [data-bz] *')) {
        if (!e.offsetParent && e.tagName !== 'IMG') continue;
        const cs = getComputedStyle(e), u = e.tagName === 'IMG' ? (e.currentSrc || e.src) : cs.backgroundImage;
        if (!/\/art\/(s|w|q|g|lib|j)-|\/art\/atlas/.test(u || '') || e.getBoundingClientRect().width < 60) continue;
        let b = 1; for (let x = e; x && x !== document.documentElement; x = x.parentElement) { const m = getComputedStyle(x).filter.match(/brightness\(([\d.]+)\)/); if (m) b *= +m[1]; }
        if (b > 0.6) out.push(u.split('/').pop().slice(0, 20) + ':' + b);
      }
      return out; });
    ok(lit.length === 0, `${T}: #/${r} has no daylight plate left bright on the dark page (${lit.slice(0, 4).join(' | ')})`);
  }
  await ctx.close();
}
/* 7 · confetti never falls over a question: a new child's celebration is cleared when the placement starts */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(e.message));
  await p.addInitScript((hh) => { if (!localStorage.getItem('bzm_household')) localStorage.setItem('bzm_household', JSON.stringify(hh)); }, seeded());
  await p.goto(BASE); await p.waitForSelector('.home2');
  await p.evaluate(() => { const R = window.__bzm.R; R.ui.draft = { name: 'Asha', band: '8-10', avatar: 'hexbee' }; window.__bzm.fire('createKid'); });
  await until(p, () => !!document.querySelector('.conf'), null, 5000);   // the confetti is up (it lasts seconds: never wait for animations here)
  const before = await p.locator('.conf').count();
  await p.evaluate(() => window.__bzm.fire('startPlace')); await until(p, () => window.__bzm.R.ui.nav === 'run' && !!document.querySelector('.run, main'));
  ok(before === 1 && await p.locator('.conf').count() === 0 && await p.evaluate(() => window.__bzm.R.ui.nav) === 'run', `the new child's confetti is cleared when the first question shows (before ${before}, after ${await p.locator('.conf').count()})`);
  await ctx.close();
}

/* music (§11): Home's loop after the first tap, the world's elsewhere, nothing in Calm mode, a game's in a game */
{
  const { p, ctx } = await open({ width: 1280, height: 800 }, seeded());
  await p.waitForSelector('.home2');
  ok(await p.evaluate(() => document.documentElement.dataset.music !== 'on'), 'no music before the first tap');
  await p.mouse.click(640, 30); await until(p, () => document.documentElement.dataset.music === 'on');
  ok(await p.evaluate(() => document.documentElement.dataset.music === 'on' && document.documentElement.dataset.tune === 'home'), 'Home plays its own loop after the first tap');
  await p.evaluate(() => window.__bzm.go('atlas')); await ready(p); await until(p, () => document.documentElement.dataset.tune !== 'home');
  ok(await p.evaluate(() => document.documentElement.dataset.tune) === 'hills', 'elsewhere, the world’s own loop (Patchwork Hills)');
  await p.evaluate(() => window.__bzm.fire('setDev', 'calm')); await until(p, () => document.documentElement.dataset.music !== 'on');
  ok(await p.evaluate(() => document.documentElement.dataset.music) === 'off', 'Calm mode turns the music off');
  await ctx.close();
}

/* search (C4): three known things, from three kinds */
{
  const { p, ctx } = await open({ width: 1280, height: 800 }, seeded());
  await p.fill('[data-bz=search] input', 'bakery'); await p.press('[data-bz=search] input', 'Enter'); await p.waitForSelector('#q');
  ok(await p.evaluate(() => window.__bzm.R.ui.nav) === 'search' && await p.locator('.results button').count() > 0, 'the bar’s search opens the results');
  for (const [q, want, kind] of [['bakery', 'The Fraction Bakery', 'Place'], ['suki', '', 'Story'], ['hypotenuse', 'hypotenuse', 'Word']]) {
    await p.fill('#q', ''); await p.type('#q', q); await until(p, (q) => window.__bzm.R.ui.q === q && window.__bzm.R.ui.more !== null, q); await ready(p);
    const res = await p.$$eval('.results button', (b) => b.map((x) => ({ kind: x.querySelector('.r-kind').textContent, t: x.querySelector('b').textContent })));
    ok(res.some((r) => r.kind.toLowerCase() === kind.toLowerCase() && (!want || r.t.toLowerCase() === want.toLowerCase())), `search "${q}" finds a ${kind}${want ? ` (${want})` : ''} (got ${res.slice(0, 3).map((r) => r.kind + ':' + r.t).join(', ')})`);
  }
  await p.fill('#q', ''); await p.type('#q', 'bakery'); await until(p, () => window.__bzm.R.ui.q === 'bakery' && window.__bzm.R.ui.more !== null); await ready(p);
  await p.click('.results button'); await until(p, () => window.__bzm.R.ui.nav !== 'search'); await ready(p);
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
