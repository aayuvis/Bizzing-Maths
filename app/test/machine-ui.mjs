/* machine-ui.mjs — Beat the Machine in Chromium, on the BUILT app (games spec §2.3, M4–M6, T14/T15):
     · a child with fewer than three earned tricks is told which stops to earn, each a link, and no
       match can start (M4);
     · the setup lists the cards; every Vedic one carries the honest label, word for word, and no
       plain trick does (M5); the rail offers only earned cards, each Vedic one labelled (M4, M5);
     · a FULL HEAT is played by keyboard alone — 1–8 pick a card, digits type, Enter submits —
       and the heat's verdict, one trick's algebra and its coin follow (M6);
     · a wrong card says why not, in words, and the machine finishes first;
     · the tape stands still while the tab is hidden;
     · the stage is full-bleed and symmetric at 1280×800 and 390×844, light and night: on a laptop
       the slate column and the machine mirror each other about the rail; on a phone every column
       has equal margins, every key is inside the viewport, the tab bar is hidden, nothing scrolls
       sideways, every control is ≥ 44 × 44 and none holds an emoji;
     · a whole match, by keyboard, ends on a finish card that lists what was practised and pays
       one answer coin per heat won (a level-1 sweep pays no contest coins).
   Screenshots land in $SHOTS as machine-*.png. Each check was watched to fail with its feature broken. */
import { site, kidRec, household, checker, ready, until, SHOTS } from './lib/site.mjs';
import * as M from '../src/machine.js';

const { BASE, browser, close } = await site('machine', +(process.env.PORT_BASE || 5200) + 19);
const { ok, fails } = checker();
const errors = [];
const EMOJI = /\p{Extended_Pictographic}/u;
const EARNED = ['round-add', 'times-eleven', 'square-five', 'nikhilam-100', 'crosswise', 'diff-squares', 'halve-double'];

async function open(vp, tag, { dark = false, earned = EARNED, coins = 0 } = {}) {
  const phone = vp.width < 500;
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, colorScheme: dark ? 'dark' : 'light' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  const tricks = Object.fromEntries(earned.map((id) => [id, { stars: 2, best: 9, learned: true, runs: 2 }]));
  tricks['above-100'] = { stars: 1, best: 6, learned: true, runs: 1 };            // one star is not earned
  const kid = kidRec('ka', 'Ahana', '11-14', 'hexbee', { tricks });
  const wallet = { v: 1, kids: { ahana: { coins, ledger: [] } } };
  await p.addInitScript(([h, w, mode]) => {
    try { if (!localStorage.getItem('bzm_household')) { localStorage.setItem('bzm_household', h); localStorage.setItem('bizzing.wallet', w); localStorage.setItem('bzm_device', JSON.stringify({ mode })); } } catch {}
  }, [JSON.stringify(household([kid])), JSON.stringify(wallet), dark ? 'dark' : 'light']);
  await p.goto(BASE + '#/machine'); await ready(p);
  return { p, ctx, shot: (n) => p.screenshot({ path: `${SHOTS}/machine-${tag}-${n}.png` }) };
}
const st = (p) => p.evaluate(() => { const s = window.__bzmMachine.state(); return { phase: s.phase, i: s.i, rail: s.m && s.m.rail, q: s.m && s.m.sums[s.i], lines: s.lines, of: s.tape && s.tape.length, lv: s.m && s.m.lv }; });
const coins = (p) => p.evaluate(() => { try { return JSON.parse(localStorage.getItem('bizzing.wallet')).kids.ahana.coins; } catch { return 0; } });
const key = async (p, k) => { await p.keyboard.press(k); };
/* one sum by keyboard: the right card's number, the answer's digits, Enter */
async function playSum(p, { wrong = false } = {}) {
  const s = await st(p);
  const right = M.rightCards(s.q, s.rail);
  const idx = wrong ? s.rail.findIndex((id) => !right.includes(id)) : s.rail.indexOf(right[0]);
  await key(p, String(idx + 1));
  if (wrong) { await until(p, () => window.__bzmMachine.state().phase === 'fb'); return { s, idx }; }
  await until(p, () => window.__bzmMachine.state().phase === 'type');
  for (const d of String(s.q.ans)) await key(p, d);
  await key(p, 'Enter');
  await until(p, (i) => { const x = window.__bzmMachine.state(); return x.phase === 'heat' || x.i > i || x.phase === 'done'; }, s.i, 8000);
  return { s, idx };
}
/* every control on the stage a finger can reach, under 44 × 44 */
const small = (p, sel) => p.$$eval(sel, (els) => els.filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed')
  .map((e) => ({ e, r: e.getBoundingClientRect() })).filter((x) => x.r.width && (x.r.width < 43.5 || x.r.height < 43.5)).map((x) => `${x.e.className || x.e.tagName} ${Math.round(x.r.width)}×${Math.round(x.r.height)}`));
const emojiIn = (p, sel) => p.$$eval(sel, (els, src) => els.filter((e) => new RegExp(src, 'u').test(e.innerText || '')).map((e) => e.innerText.trim()), EMOJI.source);

/* ---------- M4: fewer than three earned: which stops, linked, and no match */
{
  const { p, ctx, shot } = await open({ width: 1280, height: 800 }, 'gate', { earned: ['round-add', 'times-eleven'] });
  const g = await p.evaluate(() => ({ gate: !!document.querySelector('[data-gate]'), start: !!document.querySelector('[data-act=machStart]'),
    links: [...document.querySelectorAll('[data-earn]')].map((a) => ({ id: a.dataset.earn, href: a.getAttribute('href') })) }));
  const unearned = M.CARD_IDS.filter((id) => !['round-add', 'times-eleven'].includes(id));
  ok(g.gate && !g.start, `gate: with 2 earned tricks the screen says to earn more, with no Start (${JSON.stringify(g).slice(0, 120)})`);
  ok(g.links.length === unearned.length && g.links.every((l) => unearned.includes(l.id) && l.href === `#/stop/${l.id}|drill`), `gate: each stop still to earn is linked to its drill (${g.links.map((l) => l.href).join(' ')})`);
  await shot('gate');
  await p.click(`[data-earn="square-five"]`); await ready(p);
  ok(await p.evaluate(() => window.__bzm.R.ui.nav === 'stop' && window.__bzm.R.ui.arg === 'square-five'), 'gate: an earn link opens that stop');
  await ctx.close();
}

for (const [vp, tag] of [[{ width: 1280, height: 800 }, 'desk'], [{ width: 390, height: 844 }, 'phone']]) for (const mode of ['light', 'dark']) {
  const T = `${tag}-${mode}`, phone = vp.width < 500;
  const { p, ctx, shot } = await open(vp, T, { dark: mode === 'dark' });

  /* the setup: the cards, honestly labelled */
  const rows = await p.$$eval('.mc-row', (rs) => rs.map((r) => ({ id: r.dataset.card, own: r.classList.contains('own'), label: (r.querySelector('[data-vedic]') || {}).textContent || '' })));
  ok(rows.length === M.CARD_IDS.length, `${T}: the setup lists every trick card (${rows.length})`);
  for (const r of rows) {
    ok(r.own === EARNED.includes(r.id), `${T}: ${r.id} is shown as ${r.own ? 'earned' : 'to earn'} correctly (one star is not earned)`);
    ok(M.isVedic(r.id) ? r.label === M.VEDIC_LABEL : r.label === '', `${T}: ${r.id} ${M.isVedic(r.id) ? 'carries the honest Vedic label' : 'is a plain trick, with no Vedic label'} (M5)`);
  }
  ok(!!(await p.$('[data-act=machStart]')), `${T}: with ${EARNED.length} earned the match can start`);
  ok((await small(p, '.mach-page button, .mach-page a[href]')).length === 0, `${T}: setup controls ≥ 44 × 44 (${(await small(p, '.mach-page button, .mach-page a[href]')).slice(0, 4).join(' | ')})`);
  const wide0 = await p.evaluate((w) => Math.max(document.documentElement.scrollWidth, innerWidth) - w, vp.width);
  ok(wide0 <= 0, `${T}: the setup does not scroll sideways (${wide0}px)`);
  await shot('setup');

  /* start: the stage */
  await p.click('[data-act=machStart]');
  await until(p, () => window.__bzmMachine.state().phase === 'pick');
  let s = await st(p);
  ok(s.rail.length === Math.min(EARNED.length, M.LEVELS[s.lv - 1].cards) + 1 && s.rail.at(-1) === M.STRAIGHT && s.rail.slice(0, -1).every((id) => EARNED.includes(id)), `${T}: the rail offers only earned cards, then Straight (${s.rail.join(', ')}) (M4)`);
  const railLab = await p.$$eval('.mcard', (cs) => cs.map((c) => c.getAttribute('aria-description') || ''));
  ok(s.rail.every((id, i) => (M.isVedic(id) ? railLab[i] === M.VEDIC_LABEL : railLab[i] === '')), `${T}: every Vedic card on the rail carries the honest label (M5)`);

  const geo = await p.evaluate(() => {
    const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width, h: b.height }; };
    const tb = [...document.querySelectorAll('[data-bz=tabbar], .bz-tabbar, .tabbar')].filter((e) => e.getBoundingClientRect().height > 0 && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden');
    const keys = [...document.querySelectorAll('.mach-stage .pk')].map((k) => k.getBoundingClientRect()).map((b) => ({ l: b.left, r: b.right, t: b.top, b: b.bottom }));
    return { stage: r('.mach-stage'), slate: r('.ms-slate'), pad: r('.ms-pad'), mach: r('.ms-mach'), rail: r('.ms-rail'), tabbars: tb.length, keys, W: innerWidth, H: innerHeight, sw: document.documentElement.scrollWidth,
      plate: getComputedStyle(document.querySelector('.mach-stage')).backgroundImage };
  });
  ok(geo.stage && geo.stage.l === 0 && geo.stage.t === 0 && Math.abs(geo.stage.r - geo.W) < 1 && Math.abs(geo.stage.b - geo.H) < 1, `${T}: the stage is full-bleed (${JSON.stringify(geo.stage)})`);
  ok(geo.plate.includes(mode === 'dark' ? 'g-machine-night' : 'g-machine') && (mode === 'dark' || !geo.plate.includes('night')), `${T}: the ${mode === 'dark' ? 'night' : 'day'} workshop plate is up (${geo.plate.slice(0, 80)})`);
  // the plate must actually ARRIVE: a url resolved against the wrong base still names the file
  const plateOk = await p.evaluate(async (bg) => { const m = /url\("?([^")]+)"?\)/.exec(bg); if (!m) return false; try { const r = await fetch(m[1]); return r.ok && (r.headers.get('content-type') || '').includes('image'); } catch { return false; } }, geo.plate);
  ok(plateOk, `${T}: the workshop plate loads (${geo.plate.slice(0, 100)})`);
  ok(geo.tabbars === 0, `${T}: the tab bar is hidden during a heat`);
  ok(geo.sw <= geo.W, `${T}: no sideways scroll on the stage (${geo.sw} > ${geo.W})`);
  if (!phone) {
    const L = { l: Math.min(geo.slate.l, geo.pad.l), r: Math.max(geo.slate.r, geo.pad.r) };
    ok(Math.abs(L.l - (geo.W - geo.mach.r)) <= 2 && Math.abs((L.r - L.l) - geo.mach.w) <= 2, `${T}: slate and machine mirror each other (slate ${Math.round(L.l)}–${Math.round(L.r)}, machine ${Math.round(geo.mach.l)}–${Math.round(geo.mach.r)} of ${geo.W})`);
    ok(Math.abs((geo.rail.l + geo.rail.r) / 2 - geo.W / 2) <= 2, `${T}: the card rail sits on the centre line`);
    ok(geo.mach.l > geo.rail.r && geo.slate.r < geo.rail.l, `${T}: slate left, rail between, machine right`);
  } else {
    for (const [n, b] of [['tape strip', geo.mach], ['slate', geo.slate], ['card row', geo.rail], ['keypad', geo.pad]]) ok(Math.abs(b.l - (geo.W - b.r)) <= 1.5, `${T}: the ${n} has equal margins (${Math.round(b.l)} / ${Math.round(geo.W - b.r)})`);
    ok(geo.mach.b <= geo.slate.t && geo.slate.b <= geo.rail.t && geo.rail.b <= geo.pad.t, `${T}: tape strip on top, slate, cards, then keypad`);
  }
  ok(geo.keys.length === 12 && geo.keys.every((k) => k.t >= 0 && k.b <= geo.H + 0.5 && k.l >= 0 && k.r <= geo.W + 0.5), `${T}: every key, ✓ included, is inside the viewport (${JSON.stringify(geo.keys.at(-1))} in ${geo.W}×${geo.H})`);
  const tiny = await small(p, '.mach-stage button');
  ok(tiny.length === 0, `${T}: every stage control ≥ 44 × 44 (${tiny.slice(0, 4).join(' | ')})`);
  const emo = await emojiIn(p, '.mach-stage button');
  ok(emo.length === 0, `${T}: no emoji in a stage control (${emo.slice(0, 3).join(' | ')})`);
  await shot('pick');

  if (tag === 'desk' && mode === 'light') {
    /* the tape stands still while the tab is hidden */
    await until(p, () => window.__bzmMachine.state().lines >= 1, null, 10000);
    const before = (await st(p)).lines;
    await p.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await p.waitForTimeout(M.LEVELS[0].stepMs * 2 + 300);
    const hid = (await st(p)).lines;
    await p.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    ok(hid === before, `${T}: the tape does not move while the tab is hidden (${before} → ${hid})`);
  }

  /* M6: a full heat by keyboard */
  const c0 = await coins(p);
  for (let j = 0; j < M.PER_HEAT; j++) {
    const before = await st(p);
    if (j === 0) {
      const idx = before.rail.indexOf(M.rightCards(before.q, before.rail)[0]);
      await key(p, String(idx + 1)); await until(p, () => window.__bzmMachine.state().phase === 'type');
      const sl = await p.evaluate(() => document.querySelector('.ms-work').textContent);
      ok(!(sl.match(/\d+/g) || []).map(Number).includes(before.q.ans), `${T}: the slate does not show the answer before it is typed (rule 3)`);
      if (!phone || mode === 'dark') await shot('type');
      for (const d of String(before.q.ans)) await key(p, d);
      ok((await p.textContent('#ms-ans')).trim() === String(before.q.ans), `${T}: typed digits land on the slate`);
      await key(p, 'Enter');
      await until(p, () => window.__bzmMachine.state().phase === 'fb');
      ok((await p.evaluate(() => !!document.querySelector('.msvg.stall') && /stalls/.test(document.querySelector('.ms-fb').textContent))), `${T}: right card + right answer before the tape ends: the machine stalls`);
      if (!phone && mode === 'light') await shot('stall');
      await key(p, 'Enter');
      await until(p, (i) => window.__bzmMachine.state().i > i, before.i);
    } else await playSum(p);
  }
  ok((await st(p)).phase === 'heat', `${T}: four sums make a heat`);
  const hp = await p.evaluate(() => ({ h: document.querySelector('.ms-heat h2').textContent, alg: !!document.querySelector('.ms-alg .alg'), lab: (document.querySelector('.ms-alg [data-vedic]') || {}).textContent || '', id: document.querySelector('.ms-alg').dataset.alg }));
  ok(/won the heat: 4 of 4/.test(hp.h) && hp.alg, `${T}: a heat of four beaten sums is won, with one trick's algebra (${hp.h})`);
  ok(M.isVedic(hp.id) ? hp.lab === M.VEDIC_LABEL : hp.lab === '', `${T}: the algebra of ${hp.id} is labelled honestly`);
  await until(p, (c) => { try { return JSON.parse(localStorage.getItem('bizzing.wallet')).kids.ahana.coins > c; } catch { return false; } }, c0, 3000);
  ok(await coins(p) === c0 + 1, `${T}: a heat won pays one answer coin (${c0} → ${await coins(p)})`);
  await shot('heat');
  await key(p, 'Enter');
  await until(p, () => window.__bzmMachine.state().phase === 'pick');

  /* a wrong card: why not, in words, and the machine finishes first */
  const w = await playSum(p, { wrong: true });
  const fb = await p.evaluate(() => ({ t: document.querySelector('.ms-fb').textContent, done: document.querySelector('.ms-mach').classList.contains('done'), lines: window.__bzmMachine.state().lines, of: window.__bzmMachine.state().tape.length }));
  ok(fb.t.includes(M.explain(w.s.rail[w.idx], w.s.q, w.s.rail)) && fb.done && fb.lines === fb.of, `${T}: a wrong card says why not and the machine finishes (${fb.t.slice(0, 90)})`);
  ok(await p.evaluate(() => !!document.querySelector('.mcard.wrong') && !!document.querySelector('.mcard.right')), `${T}: the wrong card and the right card are marked`);
  await shot('wrong');

  if (tag === 'desk' && mode === 'light') {
    /* the rest of the match, by keyboard, to the finish card */
    await key(p, 'Enter');
    for (let guard = 0; guard < 40; guard++) {
      const x = await st(p);
      if (x.phase === 'done') break;
      if (x.phase === 'heat' || x.phase === 'fb') { await key(p, 'Enter'); await until(p, (ph) => window.__bzmMachine.state().phase !== ph, x.phase, 4000); continue; }
      await playSum(p);
    }
    await ready(p);
    const d = await p.evaluate(() => ({ done: !!document.querySelector('[data-done]'), h: (document.querySelector('[data-done] h2') || {}).textContent, n: document.querySelectorAll('.ms-practised li').length, tabbar: document.documentElement.classList.contains('stage-on') }));
    ok(d.done && d.n === M.SUMS && !d.tabbar, `${T}: the match ends on a finish card listing all ${M.SUMS} sums practised, the stage down (${JSON.stringify(d)})`);
    // heat 2 had one wrong card and three beaten sums: still won. Five heats, five coins; level 1 pays no contest coins
    ok(await coins(p) === c0 + 5, `${T}: five heats won pay five answer coins and a level-1 sweep no contest coins (${c0} → ${await coins(p)})`);
    const rec = await p.evaluate(() => { const k = window.__bzm.R.h.kids[0]; return { gl: k.gameLv && k.gameLv.machine, m: k.machine }; });
    ok(rec.gl && rec.gl.lv === 1 && rec.m.heats === 5 && rec.m.won === 5 && Object.keys(rec.m.seen).length >= 1, `${T}: the level and the machine's record are kept (${JSON.stringify(rec).slice(0, 160)})`);
    await shot('finish');
  }
  await ctx.close();
}

ok(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await close();
console.log(fails() ? `machine-ui: ${fails()} checks FAILED` : 'machine-ui: the gate, the honest cards, a heat by keyboard, a wrong card, the hidden tab, the symmetric stage, a whole match');
process.exit(fails() ? 1 : 0);
