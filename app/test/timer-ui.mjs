/* timer-ui.mjs — Beat the Timer in Chromium, on the BUILT app (games spec §3.7, BT7–BT10 and the stage):
     · #/timer opens the setup — grade, theme, level, window — with 5 minutes locked below level 6;
     · BT9  the keyboard alone plays a whole run: Enter on Start, digits, Backspace, S, Enter, and
            the finish card's Level up / Stay — and nothing levels up until it is chosen;
     · BT7  the best (and its ghost) survive a reload, per theme × level × window;
     · BT8  a hidden page stops the run's clock, and it resumes where it was;
     · BT10 at 390 × 844 every key of the pad (and Skip) is inside the viewport, on top, with the
            tab bar hidden — with the fraction keys too;
     · Calm mode keeps the ring but stops the last-ten-seconds pulse; the ghost races the best;
     · pay: `answer` for at most 10 right a run, `stop` 5 for a level's first hit; the medal is earned;
     · the grown-ups' page says it in words; no sideways scroll, 44 px targets, no emoji in a control.
   The page's clock is Playwright's (installed), so a minute passes in a moment. Screenshots land in
   $SHOTS as timer-*.png. Each check was watched to fail with its feature broken (see the report). */
import { site, kidRec, household, checker, ready, until, SHOTS } from './lib/site.mjs';

const { BASE, browser, close } = await site('timer', +(process.env.PORT_BASE || 5200) + 18);
const { ok, fails } = checker();
const errors = [];
const EMOJI = /\p{Extended_Pictographic}/u;

async function open(vp, tag, { dark = false, calm = false, band = '8-10', extra = {} } = {}) {
  const phone = vp.width < 500;
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, colorScheme: dark ? 'dark' : 'light' });
  const p = await ctx.newPage();
  await p.clock.install();
  p.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  const kid = kidRec('ka', 'Ahana', band, 'hexbee', extra);
  await p.addInitScript(([h, mode, calm]) => {
    try { if (!localStorage.getItem('bzm_household')) { localStorage.setItem('bzm_household', h); localStorage.setItem('bzm_device', JSON.stringify({ mode, calm, sound: false })); } } catch {}
  }, [JSON.stringify(household([kid])), dark ? 'dark' : 'light', calm]);
  await p.goto(BASE + '#/timer'); await ready(p);
  await until(p, () => !!document.querySelector('.tmr-setup'));
  return { p, ctx, shot: (n) => p.screenshot({ path: `${SHOTS}/timer-${tag}-${n}.png` }) };
}
const run = (p) => p.evaluate(() => { const c = window.__bzmTimer && window.__bzmTimer.active(); if (!c) return null; const r = c.run;
  return { t: r.t, score: r.score, right: r.right, wrong: r.wrong, skips: r.skips, ans: String(r.q.ans).replace('-', '−'), text: r.q.text, lock: !!r.lock, over: r.over, input: r.input, paid: r.paid, res: c.res }; });
const kidNow = (p) => p.evaluate(() => JSON.parse(JSON.stringify(window.__bzm.R.h.kids[0])));
const coins = (p) => p.evaluate(() => { try { const w = JSON.parse(localStorage.getItem('bizzing.wallet')); return ((w.kids || {}).ahana || {}).coins || 0; } catch { return 0; } });
/* type one answer with the keyboard, the way a child does */
async function typeRight(p) { const r = await run(p); for (const c of r.ans) await p.keyboard.press(c === '−' ? '-' : c); await p.clock.runFor(30); }
/* a medal's ceremony (main.js) is the app's own, over the setup once a run closes: say Brilliant and go on */
async function dismiss(p) { for (let i = 0; i < 4 && await p.$('.cel .btn'); i++) { await p.click('.cel .btn'); await p.clock.runFor(400); } }
const small = (p, sel) => p.$$eval(sel, (els) => els.filter((e) => e.offsetParent).map((e) => ({ e, r: e.getBoundingClientRect() }))
  .filter((x) => x.r.width < 43.5 || x.r.height < 43.5).map((x) => `${x.e.className} ${Math.round(x.r.width)}×${Math.round(x.r.height)}`));

/* ---- the setup, at both sizes, light and dark ---- */
for (const [vp, tag] of [[{ width: 1280, height: 800 }, 'desk'], [{ width: 390, height: 844 }, 'phone']]) for (const dark of [false, true]) {
  const T = `${tag}-${dark ? 'dark' : 'light'}`;
  const { p, ctx, shot } = await open(vp, T, { dark });
  const s = await p.evaluate(() => ({
    grades: [...document.querySelectorAll('[data-arg^="grade|"]')].map((b) => b.textContent.trim()),
    on: (document.querySelector('[data-arg^="grade|"].on') || {}).textContent,
    themes: [...document.querySelectorAll('.tmr-theme b')].map((b) => b.textContent),
    five: (document.querySelector('[data-arg="mins|5"]') || {}).disabled, two: (document.querySelector('[data-arg="mins|2"].on') || null) !== null,
    lv: (document.querySelector('.tmr-lvn') || {}).dataset.lv, target: (document.querySelector('.tmr-card-lv') || {}).dataset.target }));
  ok(s.grades.join() === '1,2,3,4,5,6,7,8' && s.on === '3', `${T}: grades 1–8, defaulting to Grade 3 for an 8–10 child (${s.on})`);
  ok(s.themes.join() === 'Addition,Subtraction,Multiplication,Mixed', `${T}: Grade 3's themes and Mixed (${s.themes.join()})`);
  ok(s.five === true && s.two && s.lv === '1', `${T}: level 1, 2 minutes, and 5 minutes locked below level 6 (BT4)`);
  ok(await p.evaluate(() => document.documentElement.scrollWidth) <= vp.width, `${T}: no sideways scroll on the setup`);
  const sm = await small(p, '.tmr-setup button:not(:disabled)'); ok(!sm.length, `${T}: every setup control is at least 44 × 44 (${sm.join(', ')})`);
  ok(!(await p.$$eval('.tmr-setup button', (bs) => bs.map((b) => b.innerText))).some((t) => EMOJI.test(t)), `${T}: no emoji in a control`);
  const top = await p.$eval('.tmr-themes', (e) => e.getBoundingClientRect().top);
  ok(top < vp.height / 2, `${T}: the theme picker starts in the top half (${Math.round(top)})`);
  await shot('setup');
  // the stage, mid-run, for the eye
  await p.click('[data-arg="theme|mul10"]'); await p.click('[data-arg="start"]'); await until(p, () => !!document.querySelector('.tmr-stage .tq-text'));
  await typeRight(p); await typeRight(p); await p.clock.runFor(4000);
  await shot('stage');
  await ctx.close();
}

/* ---- BT9: the keyboard plays a whole run; BT5: Stay changes nothing; pay; the medal ---- */
{
  const T = 'desk-kb', { p, ctx, shot } = await open({ width: 1280, height: 800 }, T);
  await p.click('[data-arg="theme|mul10"]'); await p.click('[data-arg="mins|1"]');
  ok(await p.$eval('.tmr-card-lv', (e) => e.dataset.target) === '10', `${T}: Multiplication level 1, 1 minute: target 10 (10 a minute)`);
  await p.focus('.tmr-go'); await p.keyboard.press('Enter');
  ok(await until(p, () => !!document.querySelector('.tmr-stage')), `${T}: Enter on Start opens the stage`);
  ok(await p.evaluate(() => document.documentElement.classList.contains('tmr-run')), `${T}: the run marks <html> (tmr-run), for the tab bar`);
  const c0 = await coins(p);
  for (let i = 0; i < 3; i++) await typeRight(p);
  let r = await run(p);
  ok(r.score === 3 && r.right === 3, `${T}: three right answers typed: score 3 (${r.score})`);
  // a wrong answer: it waits for Enter, then shows the right one for a second
  const wrong = String(Number(r.ans.replace('−', '-')) + 1);
  for (const c of wrong) await p.keyboard.press(c);
  r = await run(p); ok(r.input === wrong && !r.lock, `${T}: a wrong answer waits for Enter (rule 3)`);
  await p.keyboard.press('Backspace'); r = await run(p); ok(r.input === wrong.slice(0, -1), `${T}: Backspace deletes`);
  await p.keyboard.press(wrong.at(-1)); await p.keyboard.press('Enter'); await p.clock.runFor(50);
  r = await run(p); ok(r.lock && r.wrong === 1 && r.score === 3, `${T}: Enter on a wrong answer: no score, the answer shown`);
  ok(/Not this time/.test(await p.$eval('.tq-note', (e) => e.textContent)) && (await p.$eval('#tmr-ans', (e) => e.textContent)).length > 0, `${T}: the right answer is on screen`);
  await p.clock.runFor(1100); r = await run(p); ok(!r.lock, `${T}: one second later, the next question`);
  await p.keyboard.press('s'); await p.clock.runFor(1100); r = await run(p); ok(r.skips === 1 && r.score === 3, `${T}: S skips, for nothing`);
  for (let i = 0; i < 9; i++) await typeRight(p);
  r = await run(p); ok(r.score === 12 && r.paid === 10, `${T}: 12 right, \`answer\` paid for 10 of them (${r.paid})`);
  await p.clock.runFor(61000);
  ok(await until(p, () => !!document.querySelector('.tmr-fin')), `${T}: the clock runs out on its own`);
  const fin = await p.evaluate(() => ({ v: document.querySelector('.tf-v').textContent, up: !!document.querySelector('[data-t=up]'), stay: !!document.querySelector('[data-t=stay]'), focus: document.activeElement && document.activeElement.dataset.t, practised: document.querySelectorAll('.tf-list li').length }));
  ok(fin.v === '12 of 10 — target hit!' && fin.up && fin.stay, `${T}: "12 of 10 — target hit!" offers Level up and Stay (${fin.v})`);
  ok(fin.focus === 'up' && fin.practised > 0, `${T}: the choice has the keyboard's focus, and the card lists what was practised`);
  let k = await kidNow(p);
  ok(k.timer.lv.mul10 === undefined || k.timer.lv.mul10 === 1, `${T}: BT5 — nothing levelled up before the choice`);
  ok(k.timer.hit['mul10·1'] === true && k.medals['timer-first'], `${T}: the hit is recorded, and "On the clock" is earned`);
  ok(await coins(p) - c0 === 15, `${T}: coins: 10 \`answer\` + 5 \`stop\` for the first hit (got ${await coins(p) - c0}: ${await p.evaluate(() => localStorage.getItem('bizzing.wallet'))})`);
  await shot('finish');
  await p.keyboard.press('Tab'); await p.keyboard.press('Enter');   // Stay
  ok(await until(p, () => !document.querySelector('.tmr-stage')), `${T}: Stay closes the card`);
  k = await kidNow(p); ok((k.timer.lv.mul10 || 1) === 1, `${T}: BT5 — Stay keeps level 1`);
  ok(await until(p, () => !!document.querySelector('.cel'), null, 3000), `${T}: the medal's ceremony follows the run, not over it`);
  await dismiss(p);
  { const n = Object.values(k.facts).reduce((a, f) => a + f.n, 0); ok(n === 13, `${T}: every fact answered (12 right, 1 wrong) went into the one fact record (${n})`); }
  // BT7: the best survives a reload, and the ghost races it
  await p.reload(); await ready(p); await until(p, () => !!document.querySelector('.tmr-setup')); await dismiss(p);
  await p.click('[data-arg="theme|mul10"]'); await p.click('[data-arg="mins|1"]');
  ok(await p.$eval('[data-best]', (e) => e.dataset.best).catch(() => null) === '12', `${T}: BT7 — the best (12) is there after a reload`);
  await p.click('[data-arg="mins|2"]');
  ok(await p.$('.tmr-best [data-best]') === null, `${T}: BT7 — a best is per window: none yet for 2 minutes`);
  await p.click('[data-arg="mins|1"]'); await p.click('.tmr-go'); await until(p, () => !!document.querySelector('.tb-ghost'));
  ok(!!(await p.$('.tb-ghost')), `${T}: the ghost of your best is on the bar`);
  await p.clock.runFor(30000);
  const gx = await p.$eval('.tb-ghost', (e) => parseFloat(e.style.left)); ok(gx > 0, `${T}: the ghost has moved where your best was at this moment (${gx.toFixed(0)}%)`);
  for (let i = 0; i < 13; i++) await typeRight(p);
  await p.clock.runFor(200);
  ok(await p.$eval('.tb-ghost', (e) => e.classList.contains('passed')), `${T}: …and is overtaken`);
  await p.clock.runFor(31000); await until(p, () => !!document.querySelector('.tmr-fin'));
  ok(/A new best/.test(await p.$eval('.tf-best', (e) => e.textContent)), `${T}: a beaten best says so`);
  // Level up, by the keyboard: Enter on the focused choice
  await p.keyboard.press('Enter'); await until(p, () => !document.querySelector('.tmr-stage'));
  k = await kidNow(p); ok(k.timer.lv.mul10 === 2, `${T}: BT5 — Level up, chosen, moves to level 2`);
  ok(await p.$eval('.tmr-lvn', (e) => e.dataset.lv) === '2', `${T}: the setup now shows level 2`);
  // Escape ends a run unscored; it never writes a best
  await p.click('.tmr-go'); await until(p, () => !!document.querySelector('.tmr-stage')); await typeRight(p);
  await p.keyboard.press('Escape'); ok(await until(p, () => !document.querySelector('.tmr-stage')), `${T}: Escape stops a run`);
  k = await kidNow(p); ok(k.timer.best['mul10·2·1'] === undefined, `${T}: a stopped run sets no best`);
  // the grown-ups' page, in words
  await p.evaluate(() => { window.__bzm.R.ui.gate = true; window.__bzm.go('grownups'); window.__bzm.R.ui.gate = true; window.__bzm.render(); });
  await until(p, () => !!document.querySelector('.rc-timer'));
  const line = await p.$eval('.rc-timer', (e) => e.textContent).catch(() => '');
  ok(/Multiplication: Level 2, no run at this level yet\./.test(line), `${T}: the grown-ups' page says it in words ("${line.replace(/\s+/g, ' ').trim()}")`);
  await ctx.close();
}

/* ---- BT8: a hidden page stops the clock ---- */
{
  const T = 'desk-hidden', { p, ctx } = await open({ width: 1280, height: 800 }, T);
  await p.click('[data-arg="theme|mul10"]'); await p.click('.tmr-go'); await until(p, () => !!document.querySelector('.tmr-stage'));
  await p.clock.runFor(5000); const t0 = (await run(p)).t;
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.clock.runFor(40000);
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.clock.runFor(1000); const t1 = (await run(p)).t;
  ok(t1 - t0 < 2500 && t1 > t0, `${T}: BT8 — 40 hidden seconds cost the run nothing (${Math.round(t0)} → ${Math.round(t1)} ms)`);
  await ctx.close();
}

/* ---- Calm mode: the ring stays, the last-ten-seconds pulse does not ---- */
for (const calm of [false, true]) {
  const T = `desk-calm-${calm}`, { p, ctx } = await open({ width: 1280, height: 800 }, T, { calm });
  await p.click('[data-arg="theme|mul10"]'); await p.click('[data-arg="mins|1"]'); await p.click('.tmr-go'); await until(p, () => !!document.querySelector('.tmr-stage'));
  await p.clock.runFor(52000);
  const r = await p.evaluate(() => ({ ring: !!document.querySelector('.tmr-ring .tr-fg'), pulse: document.querySelector('.tmr-ring').classList.contains('pulse') }));
  ok(r.ring && r.pulse === !calm, `${T}: the ring is there; the pulse is ${calm ? 'silenced by Calm mode' : 'on in the last ten seconds'}`);
  await ctx.close();
}

/* ---- BT10: at 390 × 844 every key is inside the viewport and on top, the tab bar hidden ---- */
for (const [theme, grade, label] of [['mul10', 3, 'digits'], ['frac', 5, 'fraction keys'], ['int', 6, 'minus key']]) for (const dark of [false, true]) {
  const T = `phone-${theme}-${dark ? 'dark' : 'light'}`, { p, ctx, shot } = await open({ width: 390, height: 844 }, T, { dark });
  await p.click(`[data-arg="grade|${grade}"]`); await p.click(`[data-arg="theme|${theme}"]`); await p.click('.tmr-go');
  await until(p, () => !!document.querySelector('.tmr-stage .pk'));
  // walk a few questions so a pad with the extra row is seen
  for (let i = 0; i < 8; i++) {
    const keys = await p.evaluate(() => [...document.querySelectorAll('.tmr-stage .pk, .tmr-stage .tmr-skip')].map((b) => { const r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, top = document.elementFromPoint(x, y);
      return { k: b.dataset.k, in: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, onTop: !!top && (top === b || b.contains(top)), w: r.width, h: r.height }; }));
    const out = keys.filter((x) => !x.in || !x.onTop || x.w < 43.5 || x.h < 43.5);
    ok(keys.length >= 13 && !out.length, `${T}: BT10 — every key inside 390 × 844, on top, ≥ 44 px (${out.map((x) => x.k).join(' ') || keys.length + ' keys'})`);
    if (keys.length > 13) break;
    await p.keyboard.press('s'); await p.clock.runFor(1100);
  }
  ok(await p.evaluate(() => { const t = document.querySelector('[data-bz=tabbar]'); return !t || getComputedStyle(t).display === 'none' || t.getBoundingClientRect().height === 0; }), `${T}: the tab bar is hidden during the run`);
  ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390, `${T}: no sideways scroll on the stage`);
  if (theme !== 'mul10') ok(await p.$$eval('.tmr-stage .pad-x .pk', (b) => b.length) > 0, `${T}: the ${label} are on the pad`);
  await shot('stage');
  await ctx.close();
}

ok(!errors.length, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await close();
if (fails()) { console.error(`timer-ui: ${fails()} failed`); process.exit(1); }
console.log('timer-ui: ok');
