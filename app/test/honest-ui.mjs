/* test/honest-ui.mjs — the honest-rewards week in the built app (games spec §1.1, §1.5, §1.6, §2.1, §3.4).

   T7  the phone fold: at 390 × 844, during a Mock Contest question, a paper, a Tower floor, Twenty
       facts and Number Rush, the tab bar is gone and every key (✓ included; on a paper, every choice)
       is wholly inside the window and is the topmost thing at its own centre — nothing fixed over it.
       On a laptop the family's tab row stays where it is.
   T9  a hidden tab: the Mock Contest's clock advances 0 while hidden — the question is still up after
       its whole time has passed hidden, and resumes when the tab comes back.
   T1  in the app: a masher's contest pays no contest coins and its finish card says so in the spec's
       words; a blank paper pays nothing and gets the kind line.
   §1.6 the finish card lists what you practised (each miss with its answer); #/game/<id> opens the
       game, or the hero card's screen; a game's name is never cut short on a phone.
   §2.1 every question names one live rival's tell, with their face; every round shows the rivals' times.
   §3.4 the paper navigator's numbers sit in the middle of their chips.
   Run after `npm run build`. Each new check was watched failing with its feature removed. */
import { site, kidRec, household, checker, ready, until, SHOTS } from './lib/site.mjs';

const { BASE, browser, close } = await site('honest', +(process.env.PORT_BASE || 5200) + 14);
const { ok, fails } = checker();
const errors = [];
const PHONE = { width: 390, height: 844 }, LAPTOP = { width: 1280, height: 800 };

async function open(vp, tag, { dark = false, band = '8-10', extra = {} } = {}) {
  const phone = vp.width < 500;
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, colorScheme: dark ? 'dark' : 'light' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  const kid = kidRec('ka', 'Ahana', band, 'hexbee', extra);
  await p.addInitScript((h) => { try { if (!localStorage.getItem('bzm_household')) localStorage.setItem('bzm_household', h); } catch {} }, JSON.stringify(household([kid])));
  await p.goto(BASE + '#/home'); await p.waitForSelector('#app main'); await ready(p);
  const G = (fn, a) => p.evaluate(fn, a);
  return { p, ctx, G, shot: (n) => p.screenshot({ path: `${SHOTS}/honest-${tag}-${n}.png` }) };
}
const fire = (G, act, arg) => G(([a, b]) => window.__bzm.fire(a, b), [act, arg ?? null]);
const coins = (G) => G(() => +(document.querySelector('[data-bz=coins] span') || { textContent: 'NaN' }).textContent);

/* every key / choice: inside the window, and the thing actually under its own centre */
const FOLD = (sel) => {
  const tb = document.querySelector('[data-bz=tabbar]');
  const tab = tb ? getComputedStyle(tb).display !== 'none' && tb.getBoundingClientRect().height > 0 : false;
  const keys = [...document.querySelectorAll(sel)].filter((k) => k.offsetParent || getComputedStyle(k).position === 'fixed');
  const bad = keys.filter((k) => {
    const r = k.getBoundingClientRect();
    if (r.top < 0 || r.left < 0 || r.bottom > innerHeight + 0.5 || r.right > innerWidth + 0.5 || r.height < 1) return true;
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !(top && (top === k || k.contains(top)));
  }).map((k) => `${k.dataset.k || k.textContent.trim().slice(0, 8)}@${Math.round(k.getBoundingClientRect().bottom)}`);
  return { n: keys.length, bad, tab, wide: document.documentElement.scrollWidth > innerWidth + 1 };
};
async function fold(G, p, where, sel = '.pad .pk') {
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  // the screen's own entrance (a fade, a slide) is not the screen: wait for it, never the clock
  await until(p, () => document.getAnimations().every((a) => a.playState !== 'running' || (a.effect && a.effect.getTiming().iterations === Infinity) || (a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.timer'))), null, 5000);
  const f = await G(FOLD, sel);
  ok(f.n > 0, `T7 ${where}: the keys are on screen (${f.n})`);
  ok(!f.tab, `T7 ${where}: the phone tab bar steps aside`);
  ok(!f.bad.length, `T7 ${where}: every key is inside 390 × 844 and above anything fixed${f.bad.length ? ` — not: ${f.bad.join(', ')}` : ''}`);
  ok(!f.wide, `T7 ${where}: nothing scrolls sideways`);
  return f;
}

/* ================================================================ phone */
{
  const { p, ctx, G, shot } = await open(PHONE, 'phone');

  // ---- the Mock Contest: tells, the fold, the clock, a masher's pay, the practised list
  await fire(G, 'startContest'); await p.waitForSelector('.contest-q');
  for (let round = 0; round < 4; round++) {
    const st = await G(() => { const C = window.__bzm.R.contest; return C ? C.phase : null; });
    if (st !== 'ask' && st !== 'champ') break;
    const hasPad = await G(() => !!document.querySelector('.contest .pad'));
    if (hasPad) await fold(G, p, `contest question ${round + 1}`);
    else await fold(G, p, `contest choice ${round + 1}`, '.contest .choice-row .btn');
    const tell = await G(() => { const t = document.querySelector('.c-tell'); return t && { txt: t.textContent, face: !!t.querySelector('img') }; });
    ok(tell && tell.face && / — \S/.test(tell.txt), `§2.1 the question names a rival's tell, with their face (${tell && tell.txt})`);
    if (round === 0) await shot('contest-ask');
    // the masher: a wrong answer typed (the question's answer + 1), or a wrong choice
    await G(() => { const C = window.__bzm.R.contest, q = C.q; if (q.choices) window.__bzm.fire('cChoose', q.choices.find((c) => c !== q.ans)); });
    const wrong = await G(() => { const q = window.__bzm.R.contest.q; return q.choices ? null : String(+q.ans + 1); });
    if (wrong) { await p.keyboard.type(wrong); await p.keyboard.press('Enter'); }
    await p.waitForSelector('.round-card');
    const times = await G(() => [...document.querySelectorAll('.field li .rt')].map((e) => e.textContent));
    ok(times.length >= 1 && times.every((t) => /^\d+\.\ds$/.test(t)), `§2.1 the round shows the rivals' times (${times.slice(0, 4).join(' ')}…)`);
    if (round === 0) await shot('contest-round');
    await p.keyboard.press('Enter');
    await until(p, () => { const C = window.__bzm.R.contest; return C && C.phase !== 'round'; }, null, 5000);
  }
  // the result: out in round 2 (round one sits nobody down), so no contest coins and the card says so
  await until(p, () => window.__bzm.R.contest && window.__bzm.R.contest.phase === 'end', null, 5000);
  const end = await G(() => ({ pay: (document.querySelector('.c-pay') || {}).textContent || '', got: !!document.querySelector('.practised'),
    miss: [...document.querySelectorAll('.practised li.w')].map((li) => li.textContent.replace(/\s+/g, ' ').trim()), ans: window.__bzm.R.contest.met.map((m) => m.ans) }));
  // out in round 2 — or 3, if everybody missed round 2 and it was played again
  ok(/^\s*Round [23]: no coins this time\. Reach round 4, or get 4 right, for contest coins\.\s*$/.test(end.pay), `T1 the masher's finish card: "${end.pay.trim()}"`);
  ok(await coins(G) === 0, `T1 the masher's contest paid no coins (balance ${await coins(G)})`);
  ok(end.got && end.miss.length === end.ans.length && end.miss.every((t, i) => t.includes(end.ans[i])), `§1.6 "What you practised" lists every miss with its answer (${end.miss.join(' | ')})`);
  // a medal ceremony is its own screen: "Brilliant!" closes it, as a child would
  for (let i = 0; i < 4 && await G(() => !!document.querySelector('.cel .btn')); i++) { await p.click('.cel .btn'); await p.waitForTimeout(150); }
  await p.screenshot({ path: `${SHOTS}/honest-phone-contest-end.png`, fullPage: true });
  await fire(G, 'quitContest');

  // ---- T9: a hidden tab stops the contest's clock
  await fire(G, 'startContest'); await p.waitForSelector('.contest-q');
  const T = await G(() => { const C = window.__bzm.R.contest; return { band: window.__bzm.R.h.kids[0].band, h: C.q.h }; });
  const secs = await G(({ band, h }) => Math.round(({ '6-7': 14, '8-10': 11, '11-14': 9 }[band] || 11) * (1 + h * 1.4)), T);
  const hide = (s) => G((st) => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => st }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => st === 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); }, s);
  await p.waitForTimeout(500);
  await hide('hidden');
  const u0 = await G(() => window.__bzm.contestUsed());
  await p.waitForTimeout(secs * 1000 + 1200);
  const u1 = await G(() => window.__bzm.contestUsed()), still = await G(() => window.__bzm.R.contest.phase);
  const bar = await G(() => { const b = document.querySelector('.timer i'); return b ? getComputedStyle(b).animationPlayState : 'gone'; });
  ok(still === 'ask', `T9 the question is still up after its whole ${secs}s passed hidden (phase ${still})`);
  ok(Math.abs(u1 - u0) < 50, `T9 the contest clock advanced ${Math.round(u1 - u0)} ms while hidden (want 0)`);
  ok(bar === 'paused', `T9 the time bar stops while hidden (${bar})`);
  await hide('visible');
  await p.waitForTimeout(600);
  const u2 = await G(() => window.__bzm.contestUsed());
  ok(u2 - u1 > 300 && u2 < secs * 1000, `T9 back in view, the clock runs again from where it stopped (${Math.round(u1)} → ${Math.round(u2)} ms)`);
  ok(await until(p, () => window.__bzm.R.contest.phase === 'round', null, secs * 1000 + 3000), 'T9 …and the question still times out when its time is used up in view');
  await fire(G, 'quitContest');

  // ---- Twenty facts, a Tower floor: every question of the run
  await fire(G, 'startFacts', '×'); await p.waitForSelector('.runner .pad');
  for (let i = 0; i < 3; i++) {
    await fold(G, p, `Twenty facts ${i + 1}`);
    if (i === 0) await shot('facts');
    const a = await G(() => { const r = window.__bzm.R.run; return String(r.items[r.i].ans); });
    await p.keyboard.type(a); await until(p, () => { const r = window.__bzm.R.run; return r && !r.fb; }, null, 3000);
    await p.waitForTimeout(80);
  }
  await fire(G, 'quitRun');
  for (const floor of ['1', '2', '3']) {
    await G((f) => { const k = window.__bzm.R.h.kids[0]; for (let i = 1; i < +f; i++) k.quest[i] = { stars: 3, passed: true }; }, floor);
    await fire(G, 'climb', floor); await p.waitForSelector('.runner .qcard');
    for (let i = 0; i < 6; i++) {
      const q = await G(() => { const r = window.__bzm.R.run; if (!r || r.over) return null; const q = r.items[r.i]; return { choices: !!q.choices, ans: String(q.ans), pad: !!document.querySelector('.runner .pad') }; });
      if (!q) break;
      if (q.pad) await fold(G, p, `Tower floor ${floor} · ${i + 1}`);
      else await fold(G, p, `Tower floor ${floor} · ${i + 1} (choices)`, '.runner .choice-row .btn');
      if (floor === '1' && i === 0) await shot('tower');
      if (q.choices) await fire(G, 'choose', q.ans); else { await p.keyboard.type(q.ans); }
      await p.waitForTimeout(120);
      if (await G(() => !!(window.__bzm.R.run && window.__bzm.R.run.fb))) { await p.keyboard.press('Enter'); await p.waitForTimeout(80); }
    }
    await fire(G, 'quitRun');
  }

  // ---- a paper: the fold (choices are its keys), the chips, and a blank paper's pay
  await G(() => window.__bzm.go('hall')); await ready(p);
  await fire(G, 'paperStart', 'g34|1'); await p.waitForSelector('.paper-q');
  await fold(G, p, 'a paper question', '.pq-choices .pc, .pq-go .btn:not([disabled]), .paper-bar .btn');
  const chips = await G(() => [...document.querySelectorAll('.paper-nav .pn')].map((b) => {
    const r = b.getBoundingClientRect(), rg = document.createRange(); rg.selectNodeContents(b); const t = rg.getBoundingClientRect();
    return { n: b.textContent, dx: (t.left + t.width / 2) - (r.left + r.width / 2), dy: (t.top + t.height / 2) - (r.top + r.height / 2) };
  }));
  const off = chips.filter((c) => Math.abs(c.dx) > 1 || Math.abs(c.dy) > 1.5);
  ok(chips.length >= 18 && !off.length, `§3.4 every question number sits in the middle of its chip${off.length ? ` — off: ${off.slice(0, 5).map((c) => `${c.n} (${c.dx.toFixed(1)}, ${c.dy.toFixed(1)})`).join(' ')}` : ''}`);
  await shot('paper');
  const before = await coins(G);
  await fire(G, 'paperFinish'); await fire(G, 'paperFinish');
  await p.waitForSelector('.paper-end');
  const pp = await G(() => (document.querySelector('.paper-end .c-pay') || {}).textContent || '');
  ok(/Hand in a paper you’ve tried at least half of to earn contest coins\./.test(pp), `T1 a blank paper gets the kind line ("${pp.trim()}")`);
  ok(await coins(G) === before, `T1 a blank paper pays nothing (${before} → ${await coins(G)})`);
  for (let i = 0; i < 4 && await G(() => !!document.querySelector('.cel .btn')); i++) { await p.click('.cel .btn'); await p.waitForTimeout(150); }
  await p.screenshot({ path: `${SHOTS}/honest-phone-paper-end.png` });

  // ---- Number Rush: a keypad game inside its overlay; every game's name whole on a phone
  await G(() => window.__bzm.go('play')); await ready(p);
  for (const g of ['rush', 'target', 'line', 'cubes']) {
    await fire(G, 'play', g); await p.waitForSelector('.g-intro [data-g=go]'); await p.click('.g-intro [data-g=go]');
    await p.waitForTimeout(700);
    if (g === 'rush') { await fold(G, p, 'Number Rush'); await shot('rush'); }
    const t = await G(() => { const b = document.querySelector('.play-t b'), r = b.getBoundingClientRect(), bar = document.querySelector('.play-bar').getBoundingClientRect(); return { txt: b.textContent, cut: b.scrollWidth > b.clientWidth + 1 || getComputedStyle(b).textOverflow === 'ellipsis' && b.scrollWidth > b.clientWidth, inside: r.left >= bar.left && r.right <= bar.right }; });
    ok(!t.cut && t.inside, `§1.6 "${t.txt}" is whole on a phone, not cut short`);
    await G(() => document.querySelector('.play-x').click()); await p.waitForTimeout(150);
  }
  await ctx.close();
}

/* ================================================================ deep links: #/game/<id> */
for (const [id, want] of [['target', { game: 'g-target' }], ['rush', { game: 'g-rush' }], ['contest', { nav: 'contest' }], ['hall', { nav: 'hall' }], ['facts', { nav: 'run' }], ['challenge', { nav: 'run' }], ['nonsense', { nav: 'play' }]]) {
  const { p, ctx, G } = await open(LAPTOP, 'deeplink');
  await p.goto(BASE + '#/game/' + id);
  const got = await until(p, (w) => (w.game ? !!document.querySelector('.play.' + w.game) : window.__bzm.R.ui.nav === w.nav && !document.querySelector('.engine-wait')), want, 10000);
  ok(got, `§1.6 #/game/${id} opens ${want.game || want.nav} (nav ${await G(() => window.__bzm.R.ui.nav)}, hash ${await G(() => location.hash)})`);
  await ctx.close();
}

/* ================================================================ laptop, and the dark world */
for (const [vp, tag, dark] of [[LAPTOP, 'laptop', false], [LAPTOP, 'laptop-dark', true], [PHONE, 'phone-dark', true]]) {
  const { p, ctx, G, shot } = await open(vp, tag, { dark });
  if (dark) await G(() => { document.documentElement.setAttribute('data-mode', 'dark'); window.__bzm.render(); });
  await fire(G, 'startContest'); await p.waitForSelector('.contest-q');
  if (vp.width > 800) {
    const tabs = await G(() => { const t = document.querySelector('[data-bz=tabs]'); return t && getComputedStyle(t).display !== 'none'; });
    ok(tabs, `T7 ${tag}: on a laptop the family's tab row stays during a question`);
  }
  await shot('contest-ask');
  for (let i = 0; i < 4 && await G(() => window.__bzm.R.contest.phase === 'ask'); i++) {
    await fire(G, 'cChoose', 'x');                                  // a wrong answer, typed or chosen
    await p.waitForSelector('.round-card'); if (!i) await shot('contest-round');
    await p.keyboard.press('Enter'); await p.waitForTimeout(150);
  }
  await until(p, () => window.__bzm.R.contest.phase === 'end', null, 5000);
  for (let i = 0; i < 4 && await G(() => !!document.querySelector('.cel .btn')); i++) { await p.click('.cel .btn'); await p.waitForTimeout(150); }
  await p.screenshot({ path: `${SHOTS}/honest-${tag}-contest-end.png`, fullPage: true });
  await G(() => window.__bzm.go('hall')); await ready(p);
  await fire(G, 'paperStart', 'g56|3'); await p.waitForSelector('.paper-q'); await shot('paper');
  await ctx.close();
}

ok(!errors.length, `no page errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await close();
if (fails()) { console.error(`honest-ui: ${fails()} failure(s)`); process.exit(1); }
console.log('ok honest-ui — T7 the phone fold (contest, paper, Tower, Twenty facts, Rush), T9 the hidden tab, T1 in the app, the practised list, deep links, whole game names, tells and times, centred chips');
