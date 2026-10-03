/* shell-check.mjs — hold a Bizzing app's chrome and home to Bizzing Bee's, by measurement.

   The owner's note (2 Oct 2026): "the top tiles are not aligned with Bizzing Bee… the top nav is
   not spaced and does not operate like Bizzing Bee." Prose let five apps drift five ways; this
   measures instead. REF below was measured from Bee's live DOM at 1280×800 and 390×844.

   In an app's browser check, after the page shows Home with a child:
     import { checkShell } from '<path>/shell-check.mjs';
     const fails = await checkShell(page, { phone: false });   // [] or what drifted, in words
   It also drives the ☰: open, Esc closes it, focus returns to ☰.

   CLI (re-measure Bee, or check any URL):  node shell-check.mjs <home url> [--bee] [--write-ref]  */

/* Bee's numbers (rect = [x, y, w, h], px at the viewport size). */
export const REF = {
  desk: {
    bar: [51, 0, 1177, 56], hive: [86, 7, 41, 41], menu: [136, 7, 41, 41], brandX: 187, search: [541, 7, 414, 41],
    coinsRight: 1030, theme: [1039, 7, 41, 41], lock: [1089, 7, 41, 41], kidRight: 1194, kidH: 41,
    tabs: [51, 56, 1177, 54], tabSpan: [86, 1193], tabY: 56, tabH: 45, header: 111,
    r1: [[86, 131, 360], [460, 131, 360], [833, 131, 360]], r1H: 207, r2: [[86, 350, 547], [647, 350, 547]], r3: [[86, 664, 547], [647, 664, 547]],
  },
  phone: {
    hive: [14, 9, 37, 37], menu: [55, 9, 37, 37], search: [14, 53, 363, 41], header: 104,
    tabbar: [0, 776, 390, 68], col: [15, 360],
    order: ['greet', 'next', 'ring', 'hour', 'second', 'tip', 'quote'],
  },
  drawerW: 327,
};

/* How to find each part: the shell's data-bz attributes, or Bee's own classes. */
const KIT = { header: '[data-bz=header]', bar: '[data-bz=bar]', hive: '[data-bz=hive]', menu: '[data-bz=menu]', brand: '[data-bz=brand]',
  search: '[data-bz=search] input', coins: '[data-bz=coins]', theme: '[data-bz=theme]', lock: '[data-bz=lock]', kid: '[data-bz=kid]',
  tabs: '[data-bz=tabs]', tab: '[data-bz=tabs] [data-bz=tab]', tabbar: '[data-bz=tabbar]', greet: '[data-bz=greet]', ring: '[data-bz=ring]',
  hour: '[data-bz=hour]', next: '[data-bz=next]', second: '[data-bz=second]', tip: '[data-bz=tip]', quote: '[data-bz=quote]',
  drawer: '[data-bz=drawer]', primary: '.bz-btn:not(.out)' };
export const BEE = { header: '.sb-header-sticky', bar: '.sb-fam-bar', hive: '.sb-fam-hive', menu: '.sb-fam-bar > button:nth-of-type(1)', brand: '.sb-fam-brand',
  search: '.sb-hsearch input', coins: '.bz-coinchip', theme: '.sb-fam-bar > button.sb-hdr-ico:not(.sb-fam-lock)', lock: '.sb-fam-lock', kid: '.sb-fam-kid',
  tabs: '.sb-topnav', tab: '.sb-topnav button', tabbar: 'nav.sb-tabbar', greet: '.sb-home-greet', ring: '.sb-home-rings', hour: '.sb-home-woh',
  next: '.sb-home-next', second: '.sb-home-r2 > :nth-child(2)', tip: '.sb-home > div:nth-child(3) > :nth-child(1)', quote: '.sb-home > div:nth-child(3) > :nth-child(2)',
  drawer: '.bz-drawer', primary: null };

async function measure(page, sel) {
  return page.evaluate((sel) => {
    const R = (s) => { const e = s && document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); const st = getComputedStyle(e);
      if (st.display === 'none' || st.visibility === 'hidden' || r.width === 0) return null; return [r.x, r.y, r.width, r.height].map(Math.round); };
    const o = {}; for (const k of Object.keys(sel)) if (k !== 'tab' && k !== 'primary') o[k] = R(sel[k]);
    o.tabsAll = [...document.querySelectorAll(sel.tab)].map((e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round); }).filter((r) => r[2] > 0);
    o.scrollW = document.documentElement.scrollWidth;
    return o;
  }, sel);
}

const near = (a, b, t) => Math.abs(a - b) <= t;
function cmp(fails, what, got, want, tol, keys = [0, 1, 2, 3]) {
  if (!got) { fails.push(`${what}: missing`); return; }
  const names = ['x', 'y', 'width', 'height'];
  for (const i of keys) if (want[i] != null && !near(got[i], want[i], tol)) fails.push(`${what} ${names[i]} is ${got[i]}px, Bee's is ${want[i]}px`);
}

export async function checkShell(page, { phone = false, bee = false } = {}) {
  const sel = bee ? BEE : KIT, fails = [];
  await page.evaluate(() => window.scrollTo(0, 0));
  const m = await measure(page, sel);
  if (!phone) {
    const D = REF.desk;
    cmp(fails, 'top bar', m.bar, D.bar, 4);
    cmp(fails, '⬡ Hive', m.hive, D.hive, 3); cmp(fails, '☰ menu', m.menu, D.menu, 3);
    if (!m.brand || !near(m.brand[0], D.brandX, 4)) fails.push(`logo starts at ${m.brand?.[0]}px, Bee's at ${D.brandX}px`);
    cmp(fails, 'search', m.search, D.search, 5, [1, 2, 3]);
    // the search box sits against the coin chip, as on Bee; its x then follows the balance's digits
    if (m.search && m.coins && !near(m.coins[0] - (m.search[0] + m.search[2]), D.coinsRight - 66 - (D.search[0] + D.search[2]), 3))
      fails.push(`search ends ${m.coins[0] - (m.search[0] + m.search[2])}px before the coin chip, Bee's ${D.coinsRight - 66 - (D.search[0] + D.search[2])}px`);
    if (!m.coins || !near(m.coins[0] + m.coins[2], D.coinsRight, 4)) fails.push(`coin chip ends at ${m.coins && m.coins[0] + m.coins[2]}px, Bee's at ${D.coinsRight}px`);
    cmp(fails, 'theme button', m.theme, D.theme, 3); cmp(fails, '🔒 grown-ups', m.lock, D.lock, 3);
    if (!m.kid || !near(m.kid[0] + m.kid[2], D.kidRight, 4) || !near(m.kid[3], D.kidH, 3)) fails.push(`child switcher at ${JSON.stringify(m.kid)}, Bee's ends at ${D.kidRight}px, ${D.kidH}px tall`);
    cmp(fails, 'tab row', m.tabs, D.tabs, 4);
    const T = m.tabsAll;
    if (T.length < 4 || T.length > 6) fails.push(`${T.length} tabs (4–6)`);
    else {
      if (!near(T[0][0], D.tabSpan[0], 4) || !near(T.at(-1)[0] + T.at(-1)[2], D.tabSpan[1], 4)) fails.push(`tabs span ${T[0][0]}–${T.at(-1)[0] + T.at(-1)[2]}px, Bee's ${D.tabSpan[0]}–${D.tabSpan[1]}px`);
      if (T.some((t) => !near(t[2], T[0][2], 2))) fails.push('tabs are not equal width');
      if (T.some((t) => !near(t[1], D.tabY, 3) || !near(t[3], D.tabH, 3))) fails.push(`tabs not at y ${D.tabY}, ${D.tabH}px tall`);
    }
    if (!m.header || !near(m.header[3], D.header, 4)) fails.push(`header is ${m.header?.[3]}px tall, Bee's ${D.header}px`);
    [['greeting', m.greet], ['daily ring', m.ring], ['… of the hour', m.hour]].forEach(([n, r], i) => {
      cmp(fails, n + ' tile', r, D.r1[i], 5, [0, 1, 2]); if (r && !near(r[3], D.r1H, 40)) fails.push(`${n} tile is ${r[3]}px tall, Bee's ${D.r1H}px`); });
    if (m.greet && m.ring && m.hour && !(near(m.greet[3], m.ring[3], 2) && near(m.ring[3], m.hour[3], 2))) fails.push('the three top tiles are not one height');
    cmp(fails, 'next-on-your-journey card', m.next, D.r2[0], 5, [0, 2]); cmp(fails, 'second journey card', m.second, D.r2[1], 5, [0, 2]);
    if (m.next && m.second && !near(m.next[1], m.second[1], 1)) fails.push('the two journey cards do not share a top');
    cmp(fails, 'tip card', m.tip, D.r3[0], 5, [0, 2]); cmp(fails, 'quote card', m.quote, D.r3[1], 5, [0, 2]);
    if (m.tabbar) fails.push('phone tab bar shows on desktop');
  } else {
    const H = REF.phone;
    cmp(fails, '⬡ Hive', m.hive, H.hive, 3); cmp(fails, '☰ menu', m.menu, H.menu, 3); cmp(fails, 'search row', m.search, H.search, 4);
    if (!m.header || !near(m.header[3], H.header, 6)) fails.push(`header is ${m.header?.[3]}px tall on a phone, Bee's ${H.header}px`);
    cmp(fails, 'bottom tab bar', m.tabbar, H.tabbar, 4);
    if (m.tabs) fails.push('desktop tab row shows on a phone');
    const ys = H.order.map((k) => [k, m[k]]);
    for (const [k, r] of ys) { if (!r) { fails.push(`${k} missing on phone home`); continue; } if (!near(r[0], H.col[0], 3) || !near(r[2], H.col[1], 4)) fails.push(`${k} is not in Bee's single 360px column (x ${r[0]}, w ${r[2]})`); }
    const got = ys.filter(([, r]) => r).sort((a, b) => a[1][1] - b[1][1]).map(([k]) => k);
    if (got.join() !== H.order.filter((k) => m[k]).join()) fails.push(`phone order is ${got.join(' → ')}, Bee's is ${H.order.join(' → ')}`);
    if (m.scrollW > 390) fails.push(`page is ${m.scrollW}px wide on a 390px phone`);
  }
  if (!bee) {
    const prim = await page.evaluate(() => [...document.querySelectorAll('[data-bz=home] .bz-btn:not(.out)')].filter((e) => e.getBoundingClientRect().width > 0).length);
    if (prim !== 1) fails.push(`${prim} filled primary buttons on home (exactly 1)`);
  }
  // behaviour: ☰ opens a left drawer over a scrim; Esc closes it; focus returns to ☰
  await page.click(sel.menu); await page.waitForTimeout(350);
  const d = await page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); const st = getComputedStyle(e);
    return { r: [r.x, r.y, r.width, r.height].map(Math.round), vis: st.display !== 'none' && !e.hidden && r.width > 0,
      text: [...e.querySelectorAll('a,button')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean) }; }, sel.drawer);
  if (!d || !d.vis) fails.push('☰ does not open the drawer');
  else {
    if (d.r[0] > 2 || d.r[1] !== 0 || !near(d.r[2], REF.drawerW, 30)) fails.push(`drawer at ${JSON.stringify(d.r)}, Bee's is a ${REF.drawerW}px panel on the left edge`);
    const want = ['My page', 'Shop', 'Collection', 'Medals'], tail = ['Settings', 'Grown-ups', 'Help', 'Privacy', 'Back to the Hive'];
    const idx = (w) => d.text.findIndex((t) => t.startsWith(w));
    const order = [...want, ...tail].map(idx);
    if (order.some((i) => i < 0)) fails.push(`drawer lacks: ${[...want, ...tail].filter((w, i) => order[i] < 0).join(', ')}`);
    else if (order.some((v, i) => i && v < order[i - 1])) fails.push('drawer entries are not in the family order');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    const after = await page.evaluate(([s, m]) => { const e = document.querySelector(s); const open = !!e && !e.hidden && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0;
      const f = document.activeElement; return { open, focusMenu: !!f && f === document.querySelector(m) }; }, [sel.drawer, sel.menu]);
    if (after.open) fails.push('Esc does not close the drawer');
    else if (!bee && !after.focusMenu) fails.push('focus does not return to ☰ after the drawer closes');
  }
  return fails;
}

/* CLI */
if (import.meta.url === `file://${process.argv[1]}`) {
  const { chromium } = await import('playwright');
  const url = process.argv[2], bee = process.argv.includes('--bee');
  const b = await chromium.launch(); let bad = 0;
  for (const phone of [false, true]) {
    const ctx = await b.newContext({ viewport: phone ? { width: 390, height: 844 } : { width: 1280, height: 800 }, isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 2 : 1 });
    const pg = await ctx.newPage(); await pg.goto(url); await pg.waitForTimeout(2500);
    const f = await checkShell(pg, { phone, bee });
    console.log(phone ? 'phone' : 'desktop', f.length ? '✗\n  ' + f.join('\n  ') : '✓ matches Bee'); bad += f.length; await ctx.close();
  }
  await b.close(); process.exit(bad ? 1 : 0);
}
