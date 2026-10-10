/* test/coach-ui.mjs — Bizzing Bee's daily goal and "Coach speaks", in the built app.

     · the ring card shows Bee's three measures — App time, Practise time, Right answers — with the
       numbers scripted play made: time on the clock while the page is visible, practise time only
       while a question is up, right answers only from answers typed right
     · time counts only while the page is visible, and stops after five minutes with nobody there
     · "Coach speaks →" opens the coach by tap and by keyboard; its ONE action lands on the screen
       it names (the mistakes deck, Rush · Calm, a stop's drill)
     · every line the coach draws says only numbers its evidence holds
     · read-aloud: the coach's first line is spoken once where read-aloud is on, never in Calm mode,
       and with Sound off there is nothing to speak and no button
     · the grown-ups' week shows the same three numbers, from the same record
     · desktop 1280×800 and phone 390×844, light and dark: 44px targets, nothing sideways, and Home
       still measures as Bee's (checkShell returns [])
   Run after `npm run build`. Each check was watched failing with its feature broken. */
import { site, kidRec, household, checker, ready, until, SHOTS } from './lib/site.mjs';
import { checkShell } from './lib/shell-check.mjs';

const { BASE, browser, close } = await site('coach', +(process.env.PORT_BASE || 5200) + 21);
const { ok, fails } = checker();
const errors = [];
const DAY = 864e5;

/* a child with things on record: a mistake due, a fact that trips, a stop with one star */
function richKid(extra = {}) {
  const now = Date.now();
  const r = (miss, recent, box = 0) => ({ n: miss + 2, ok: 2, box, due: now - DAY, last: now - 3600e3, miss, recent });
  return kidRec('ka', 'Ahana', '8-10', 'hexbee', {
    facts: { '7×8': r(3, ['F', 'X', 'X']), '6×9': r(1, ['S', 'S'], 1) },
    tricks: { 'near-doubles': { stars: 1, best: 6, learned: true, runs: 2 } },
    mistakes: { 'make-ten|45 + 38|83': { q: { text: '45 + 38', ans: 83, trick: 'make-ten' }, box: 0, due: now - 3600e3, at: now - 2 * DAY, misses: 2, from: 'drill' } },
    ...extra,
  });
}

async function open(vp, tag, { dark = false, kid = richKid(), clock = false, device = null, said = false, url = '#/home' } = {}) {
  const phone = vp.width < 500;
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, colorScheme: dark ? 'dark' : 'light' });
  const p = await ctx.newPage();
  if (clock) await p.clock.install();
  p.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  await p.addInitScript(([h, dev, spy]) => {
    try { if (!localStorage.getItem('bzm_household')) { localStorage.setItem('bzm_household', h); if (dev) localStorage.setItem('bzm_device', dev); } } catch {}
    if (spy) { window.__said = []; try { const real = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = (u) => { window.__said.push(u.text); try { real(u); } catch {} }; } catch {} }
  }, [JSON.stringify(household([kid])), device ? JSON.stringify(device) : null, said]);
  await p.goto(BASE + url); await p.waitForSelector('#app main'); await ready(p);
  const G = (fn, a) => p.evaluate(fn, a);
  return { p, ctx, G };
}
const nav = (G) => G(() => window.__bzm.R.ui.nav);
const ringText = (G) => G(() => Object.fromEntries([...document.querySelectorAll('[data-bz=ring] [data-ring]')].map((e) => [e.dataset.ring, [e.querySelector('.lg-l').textContent, e.querySelector('b').textContent]])));
const day = (G) => G(() => { const k = window.__bzm.R.h.kids[0], d = new Date(), key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { ...(k.dayLog[key] || { app: 0, prac: 0 }), right: (k.days[key] || {}).ok || 0 }; });
const fmt = (s) => { const m = Math.floor(Math.round(s) / 60); return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`; };
const hide = (G, hidden) => G((h) => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => h }); document.dispatchEvent(new Event('visibilitychange')); }, hidden);
const toHome = async (p, G) => { await G(() => window.__bzm.go('home')); await ready(p); };

/* ---------------------------------------------------------------- 1 · the three measures, from scripted play */
{
  const { p, ctx, G } = await open({ width: 1280, height: 800 }, 'clock', { kid: kidRec('ka', 'Ahana', '8-10', 'hexbee'), clock: true });
  let r = await ringText(G);
  ok(JSON.stringify(r) === JSON.stringify({ app: ['App time', '0m/20m'], prac: ['Practise time', '0m/10m'], right: ['Right answers', '0/20'] }), `a new day's ring reads Bee's three measures at nothing (${JSON.stringify(r)})`);
  // two minutes on Home, the page visible: app time, no practise time
  await p.clock.runFor(120000);
  let d = await day(G);
  ok(d.app >= 115 && d.app <= 125 && d.prac === 0, `two visible minutes on Home are app time and not practise time (${d.app}s, ${d.prac}s)`);
  // a facts drill: five typed right, then a minute with the question up
  await G(() => window.__bzm.fire('startFacts', '×')); await p.clock.runFor(500);
  for (let i = 0; i < 5; i++) {
    const ans = await G(() => String(window.__bzm.R.run.items[window.__bzm.R.run.i].ans));
    for (const ch of ans) await p.keyboard.press(ch);
    await p.clock.runFor(2000);
  }
  const practisedFor = 500 + 5 * 2000;
  await p.clock.runFor(60000);
  d = await day(G);
  ok(d.right === 5, `five answers typed right are five right answers (${d.right})`);
  ok(d.prac >= (practisedFor + 60000) / 1000 - 6 && d.prac <= (practisedFor + 60000) / 1000 + 6, `practise time is the time a question was up (${d.prac}s, ~${(practisedFor + 60000) / 1000}s)`);
  // hidden for ten minutes: nothing counts
  // (hiding counts the visible seconds up to the moment it hides, then nothing)
  await hide(G, true); const before = await day(G); await p.clock.runFor(600000); d = await day(G);
  ok(d.app === before.app && d.prac === before.prac, `ten hidden minutes add nothing (${before.app}→${d.app}s app, ${before.prac}→${d.prac}s practise)`);
  await hide(G, false); await p.keyboard.press('Shift'); await p.clock.runFor(30000); d = await day(G);
  ok(d.app >= before.app + 25 && d.app <= before.app + 36, `visible again, the clock runs again (${before.app}→${d.app}s)`);
  // nobody there: after five minutes with no touch or key, the clock stops
  await p.keyboard.press('Shift'); const idle0 = await day(G); await p.clock.runFor(15 * 60000); d = await day(G);
  ok(d.app - idle0.app <= 5 * 60 + 6 && d.app - idle0.app >= 5 * 60 - 6, `fifteen untouched minutes count as five, then stop (${d.app - idle0.app}s)`);
  // the ring shows exactly what was recorded
  await p.keyboard.press('Escape'); await toHome(p, G); d = await day(G); r = await ringText(G);
  ok(r.app[1] === `${fmt(d.app)}/20m` && r.prac[1] === `${fmt(d.prac)}/10m` && r.right[1] === `${d.right}/20`, `the ring shows the record (${JSON.stringify(r)} for ${JSON.stringify(d)})`);
  // and the grown-ups' week shows the same three numbers for today
  await G(() => { window.__bzm.R.ui.gate = true; window.__bzm.go('grownups'); window.__bzm.R.ui.gate = true; window.__bzm.render(); });
  await until(p, () => !!document.querySelector('[data-goal-row=app]'));
  const wk = await G(() => Object.fromEntries(['app', 'prac', 'right'].map((x) => [x, document.querySelector(`[data-goal-row=${x}] td:last-child`).textContent])));
  ok(wk.app === fmt(d.app) && wk.prac === fmt(d.prac) && wk.right === String(d.right), `the grown-ups' week has today's same three numbers (${JSON.stringify(wk)})`);
  // the grown-up sets a target, and the ring follows it
  await G(() => window.__bzm.fire('setTarget', 'right|10')); await toHome(p, G); r = await ringText(G);
  ok(r.right[1] === `${d.right}/10`, `a grown-up's target is the ring's target (${r.right[1]})`);
  await ctx.close();
}

/* ---------------------------------------------------------------- 2 · Coach speaks, four ways round */
const fit = (sel) => {
  const small = [...document.querySelectorAll(sel)].filter((e) => e.offsetParent).map((e) => { const r = e.getBoundingClientRect(); return { t: (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((x) => x.h < 44 || x.w < 44);
  return { small, wide: document.documentElement.scrollWidth > innerWidth + 1 };
};
for (const [vp, tag] of [[{ width: 1280, height: 800 }, 'desk'], [{ width: 390, height: 844 }, 'phone']]) for (const mode of ['light', 'dark']) {
  const T = `${tag} ${mode}`;
  const { p, ctx, G } = await open(vp, T, { dark: mode === 'dark' });
  // Home is still Bee's, measured
  const shell = await checkShell(p, { phone: vp.width < 500 });
  ok(shell.length === 0, `${T}: checkShell matches Bee with the new ring card (${shell.join('; ')})`);
  await toHome(p, G);
  const card = await G(() => { const a = document.querySelector('[data-bz=ring] .coach-go'), r = a.getBoundingClientRect(); return { href: a.getAttribute('href'), h: Math.round(r.height), w: Math.round(r.width), cta: a.querySelector('.coach-cta').textContent, rows: a.querySelectorAll('[data-ring]').length, labels: [...a.querySelectorAll('.lg-l')].map((x) => getComputedStyle(x).display !== 'none' ? x.textContent : '').join('|') }; });
  ok(card.href === '#/coach' && card.rows === 3 && /Coach speaks →$/.test(card.cta) && card.h >= 44, `${T}: the rings and their three lines are one link, "Coach speaks →" (${JSON.stringify(card)})`);
  ok(card.labels === 'App time|Practise time|Right answers', `${T}: the three measures are named in full (${card.labels})`);
  await p.locator('[data-bz=ring]').screenshot({ path: `${SHOTS}/coach-ring-${tag}-${mode}.png` });
  let f = await G(fit, '[data-bz=ring] a');
  ok(!f.small.length && !f.wide, `${T}: Home's ring card targets are 44px and nothing scrolls sideways (${JSON.stringify(f)})`);
  // by tap (phone) or click (desk) …
  if (vp.width < 500) await p.tap('[data-bz=ring] .coach-go'); else await p.click('[data-bz=ring] .coach-go');
  await until(p, () => !!document.querySelector('.co-line')); await ready(p);
  ok(await nav(G) === 'coach', `${T}: Coach speaks opens the coach by ${vp.width < 500 ? 'tap' : 'click'}`);
  const co = await G(() => ({ head: document.querySelector('.co-line').textContent, octo: !!document.querySelector('.co-hero img.octo'), prim: [...document.querySelectorAll('.coach .btn.primary')].length,
    act: document.querySelector('[data-coach-action]').dataset.coachAction, lines: [...document.querySelectorAll('.coach [data-line]')].map((e) => ({ t: e.textContent, ev: JSON.parse(e.dataset.ev) })) }));
  ok(co.octo && co.prim === 1 && co.act === 'mistakes', `${T}: Octo reads it, with ONE filled action — the mistake that is due (${JSON.stringify({ octo: co.octo, prim: co.prim, act: co.act })})`);
  const badNums = co.lines.flatMap((l) => { let t = l.t; for (const v of Object.values(l.ev)) if (typeof v === 'string') t = t.split(v).join(' '); const nums = Object.values(l.ev).filter((v) => typeof v === 'number'); return (t.match(/\d+/g) || []).map(Number).filter((n) => !nums.includes(n)).map((n) => `${n} in "${l.t}"`); });
  ok(co.lines.length >= 4 && !badNums.length, `${T}: every line on screen says only numbers its evidence holds (${co.lines.length} lines${badNums.length ? '; not: ' + badNums.join(', ') : ''})`);
  ok(!/streak|in a row|don[’']?t break|come back tomorrow/i.test(await G(() => document.querySelector('.coach').textContent)), `${T}: no streak words on the coach`);
  f = await G(fit, '.coach a, .coach button');
  ok(!f.small.length && !f.wide, `${T}: every coach target is 44px and nothing scrolls sideways (${JSON.stringify(f)})`);
  await p.screenshot({ path: `${SHOTS}/coach-${tag}-${mode}.png`, fullPage: true });
  // … and by keyboard: Tab to the card, Enter
  await toHome(p, G);
  await G(() => document.querySelector('[data-bz=ring] .coach-go').focus()); await p.keyboard.press('Enter');
  await until(p, () => !!document.querySelector('.co-line'));
  ok(await nav(G) === 'coach', `${T}: Enter on the focused card opens the coach`);
  // the action lands on the thing it names
  await p.click('[data-coach-action]'); await until(p, () => window.__bzm.R.ui.nav === 'mistakes'); await ready(p);
  ok(await nav(G) === 'mistakes', `${T}: "Try 1 mistake again" lands on the mistakes deck (${await nav(G)})`);
  await ctx.close();
}

/* ---------------------------------------------------------------- 3 · the other actions land where they say */
{
  const vp = { width: 1280, height: 800 };
  // a trap and nothing in the deck: Rush · Calm
  { const k = richKid(); k.mistakes = {};
    const { p, ctx, G } = await open(vp, 'calm', { kid: k, url: '#/coach' }); await until(p, () => !!document.querySelector('[data-coach-action]'));
    ok(await G(() => document.querySelector('[data-coach-action]').dataset.coachAction) === 'calm', 'facts tripping, nothing in the deck: the action is Rush · Calm');
    await p.click('[data-coach-action]'); await until(p, () => !!(window.__bzm.R.run && window.__bzm.R.run.calm));
    const run = await G(() => ({ nav: window.__bzm.R.ui.nav, calm: !!(window.__bzm.R.run && window.__bzm.R.run.calm), title: window.__bzm.R.run && window.__bzm.R.run.title }));
    ok(run.nav === 'run' && run.calm && /Calm/.test(run.title), `…and it starts Rush · Calm (${JSON.stringify(run)})`);
    await ctx.close(); }
  // nothing due anywhere, one stop with one star: that stop's drill
  { const k = richKid(); k.mistakes = {}; k.facts = { '6×7': { n: 3, ok: 3, box: 3, due: Date.now() + 5 * DAY, last: Date.now() - DAY, miss: 0, recent: ['F', 'F', 'F'] } };
    const { p, ctx, G } = await open(vp, 'drill', { kid: k, url: '#/coach' }); await until(p, () => !!document.querySelector('[data-coach-action]'));
    ok(await G(() => document.querySelector('[data-coach-action]').dataset.coachAction) === 'drill', 'nothing due: the action is the one-star stop\'s drill');
    await p.click('[data-coach-action]'); await until(p, () => window.__bzm.R.ui.nav === 'stop' && window.__bzm.R.ui.tab === 'drill');
    const s = await G(() => ({ nav: window.__bzm.R.ui.nav, arg: window.__bzm.R.ui.arg, tab: window.__bzm.R.ui.tab }));
    ok(s.nav === 'stop' && s.arg === 'near-doubles' && s.tab === 'drill', `…and it opens Near doubles on its drill (${JSON.stringify(s)})`);
    await ctx.close(); }
}

/* ---------------------------------------------------------------- 4 · read-aloud: on where it is on, never in Calm, silent with Sound off */
{
  const vp = { width: 1280, height: 800 };
  const said = async (opts) => { const { p, ctx, G } = await open(vp, 'say', { said: true, ...opts, kid: richKid({ prefs: { op: '×', timer: false, read: true } }) });
    await G(() => window.__bzm.go('coach')); await until(p, () => !!document.querySelector('.co-line')); await p.waitForTimeout(900);
    const out = await G(() => ({ said: window.__said || [], btn: !!document.querySelector('[data-act=coachSay]'), head: document.querySelector('.co-line').textContent }));
    await ctx.close(); return out; };
  const on = await said({});
  const plain = (t) => String(t).replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase();   // the voice reads a dash as a pause
  ok(on.said.length === 1 && plain(on.said[0]) === plain(on.head), `read-aloud on: the coach's first line is spoken once (${JSON.stringify(on.said)} / ${on.head})`);
  ok(on.btn, 'read-aloud on: "Read it to me" is offered');
  const calm = await said({ device: { calm: true } });
  ok(calm.said.length === 0 && calm.btn, `Calm mode: nothing is spoken by itself; the button is still there for a tap (${JSON.stringify(calm.said)})`);
  const mute = await said({ device: { sound: false } });
  ok(mute.said.length === 0 && !mute.btn, `Sound off: nothing is spoken and there is no button (${JSON.stringify(mute)})`);
}

ok(!errors.length, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await close();
if (fails()) { console.error(`coach-ui: ${fails()} failure(s)`); process.exit(1); }
console.log('ok coach-ui — the three measures from scripted play, visible-only time, Coach speaks by tap and key, its actions land, read-aloud, desk + phone × light + dark, checkShell []');
