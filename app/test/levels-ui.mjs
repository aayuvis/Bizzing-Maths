/* levels-ui.mjs — games spec §2.2, §3.2, §3.3 in Chromium on the BUILT app:
     · every start screen (Make the Target, Number Line, Cube Builder, Today's puzzle) carries the
       level chip: five levels (two sizes for the daily), each said in words, defaulting to the level
       last played; touching it holds the card until Play
     · the level rule as each game counts "right" (T5): a clean Target solve, a Line placement within
       5%, a Cube stack solved without Show me — 40% drops a level, 60% keeps it
     · Target: the round climbs (two puzzles a level below), the keys are the level's, the second-way
       challenge refuses the child's own way and pays a star for another
     · Today's puzzle: two sizes from one seed; after Show me the day is "shown", "Play again" is Done,
       and a later solve of that seed is never credited
     · Number Line: labelled ticks → bare ticks → no ticks inside a round; the best error per line
     · Cube Builder audit: perfect and random bots, keyboard AND touch reach the same build, a 4 × 4
       floor at level 4, the fewest required at level 5, 44px raise/lower controls, no sideways scroll
   Every assertion here was watched to fail once (see the commit that added it). */
import { site, kidRec, household, checker, SHOTS, until } from './lib/site.mjs';

const { BASE, browser, close } = await site('levels', +(process.env.PORT_BASE || 5200) + 16);
const { ok, fails } = checker();
const errors = [];
const MODES = ['line:negatives', 'line:fractions', 'target:five', 'target:hard'];
const kidA = () => kidRec('ka', 'Ahana', '8-10', 'hexbee', { shop: { owned: [], worn: {}, modes: MODES } });

async function open(vp, tag, { dark = false } = {}) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, hasTouch: true, colorScheme: dark ? 'dark' : 'light' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  await p.addInitScript((h) => { try { if (!localStorage.getItem('bzm_household')) localStorage.setItem('bzm_household', h); } catch {} }, JSON.stringify(household([kidA()])));
  // the same deal every run: the games' Math.random is seeded, so no check depends on a lucky puzzle
  await p.addInitScript((seed) => { let a = seed >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, [...tag].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7));
  await p.goto(BASE + '#/play'); await p.waitForSelector('#app main');
  if (dark) await p.evaluate(() => document.documentElement.setAttribute('data-mode', 'dark'));
  const G = (fn, a) => p.evaluate(fn, a);
  // a shot waits for the overlay's fade and the card's entrance to finish
  // (never the title card's three-second bar: waiting for that would start the game)
  const shot = async (n) => { await until(p, () => document.getAnimations().every((a) => a.playState !== 'running' || (a.effect && (a.effect.getTiming().iterations === Infinity || (a.effect.target && a.effect.target.closest && a.effect.target.closest('.g-bar'))))), null, 4000); await p.screenshot({ path: `${SHOTS}/levels-${tag}-${n}.png` }); };
  return { p, ctx, G, shot };
}
const probe = (G, k, a) => G(([k, a]) => { const g = window.__bzmGames && window.__bzmGames.active(); return g && g.probe[k](a); }, [k, a]);
const kidNow = (G) => G(() => JSON.parse(JSON.stringify(window.__bzm.R.h.kids[0])));
const chip = (p) => p.evaluate(() => ({ n: document.querySelectorAll('.g-intro .g-lvb').length, on: +(document.querySelector('.g-lvb.on') || {}).dataset?.lv, words: (document.querySelector('.g-lvw') || {}).textContent || '', labels: [...document.querySelectorAll('.g-lvb')].map((b) => b.getAttribute('aria-label')) }));
const fire = (G, a, arg) => G(([a, arg]) => window.__bzm.fire(a, arg), [a, arg]);
const atEnd = (p) => p.waitForSelector('.play-end', { timeout: 15000 });

/* every plan that makes the target, by the game's rules, with the way (op multiset) it uses */
const OPS = { '+': (a, b) => a + b, '-': (a, b) => (a >= b ? a - b : null), '*': (a, b) => a * b, '/': (a, b) => (b && a % b === 0 ? a / b : null) };
const SYM = { '+': '+', '-': '−', '*': '×', '/': '÷' };
function plans(xs, t, keys) {
  const out = [];
  (function go(items, steps) {
    if (items.length === 1) { if (items[0] === t) out.push({ steps, way: steps.map((s) => SYM[s[1]]).sort().join('') }); return; }
    for (let i = 0; i < items.length; i++) for (let k = 0; k < items.length; k++) {
      if (i === k) continue;
      for (const o of keys) {
        const r = OPS[o](items[i], items[k]); if (r == null) continue;
        go([r, ...items.filter((_, x) => x !== i && x !== k)], [...steps, [items[i], o, items[k]]]);
      }
    }
  })(xs, []);
  return out;
}
const KEY = { '+': '+', '−': '-', '×': '*', '÷': '/' };
async function playPlan(p, plan) {
  const vals = () => p.$$eval('.mt-card b', (bs) => bs.map((b) => +b.textContent));
  for (const [a, o, b] of plan.steps) {
    const v = await vals();
    const sel = await p.$$eval('.mt-card', (cs) => cs.findIndex((c) => c.classList.contains('on')));
    const ia = sel >= 0 && v[sel] === a ? sel : v.indexOf(a);
    if (sel >= 0 && sel !== ia) await p.keyboard.press(String(sel + 1));
    if (sel !== ia) await p.keyboard.press(String(ia + 1));
    const ib = v.findIndex((x, i) => x === b && i !== ia);
    await p.keyboard.press(o); await p.keyboard.press(String(ib + 1));
  }
}
async function solveNow(p, G, want = null) {
  const pz = await probe(G, 'puzzle');
  const keys = [...pz.ops].map((o) => KEY[o]);
  const all = plans(pz.nums, pz.target, keys);
  const plan = want ? all.find(want) : all[0];
  await playPlan(p, plan);
  return plan;
}
const skipIntro = async (p) => { await p.keyboard.press('Enter'); await p.waitForSelector('.g-intro', { state: 'detached' }); };

/* ================================================================ Make the Target (desktop) */
{
  const { p, ctx, G, shot } = await open({ width: 1280, height: 800 }, 'desk');
  await fire(G, 'play', 'target'); await p.waitForSelector('.g-intro .g-lvb');
  let c = await chip(p);
  ok(c.n === 5 && c.on === 3 && /^Level 3 · one × needed$/.test(c.words), `Target: the start screen has the level chip, 1–5, an 8–10 starting at 3, said in words (${JSON.stringify(c)})`);
  ok(c.labels.every((l, i) => new RegExp(`^Level ${i + 1} · \\S`).test(l)), `Target: every level is said in words (${c.labels.join(' | ')})`);
  await p.keyboard.press('4'); await p.waitForTimeout(3600);
  await shot('target-chip');
  c = await chip(p);
  ok(c.on === 4 && /÷ needed/.test(c.words) && await p.locator('.g-intro').count() === 1, `Target: a key chooses a level, and the card waits for Play (${c.words})`);
  await skipIntro(p); await p.waitForSelector('.mt-card');
  ok(await probe(G, 'level') === 4 && (await kidNow(G)).gameLv.target.lv === 4, 'Target: the level chosen is the level played, and remembered');
  // the round climbs: puzzles 1–2 one level below, the rest at the level; the keys are the level's
  const seen = [], clean = [];
  for (let r = 1; r <= 5; r++) {
    await p.waitForFunction((r) => new RegExp(`Puzzle\\s*${r}\\b`).test(document.querySelector('.play-hud').textContent) && !document.querySelector('.mt-target.won'), r, { timeout: 8000 });
    const pz = await probe(G, 'puzzle');
    seen.push(pz.lv);
    ok(await p.locator('.mt-op').count() === pz.ops.length, `Target puzzle ${r}: the keys are the level's own (${pz.ops})`);
    if (r <= 2) { const pl = await solveNow(p, G); clean.push(new Set(plans(pz.nums, pz.target, [...pz.ops].map((o) => KEY[o])).map((x) => x.way)).size > 1); await until(p, () => !!document.querySelector('.mt-target.won')); }
    else { await p.keyboard.press('s'); await until(p, () => /One way/.test(document.querySelector('.mt-msg').innerText)); }
    if (r === 1) await shot('target-l3');
  }
  ok(seen.join() === '3,3,4,4,4', `Target: a round of five climbs, two a level below (${seen})`);
  await atEnd(p);
  ok((await probe(G, 'results')).join() === 'clean,clean,shown,shown,shown', 'Target: each puzzle is recorded clean or shown');
  let end = await p.locator('.play-end').innerText();
  ok(/40% right — next round is Level 3/.test(end) && (await kidNow(G)).gameLv.target.lv === 3, `T5 Target: 2 clean of 5 (40%) drops a level (${end.match(/\d+% right[^\n]*/)})`);
  // the second-way challenge: the child's own way is refused, another way earns a star
  const offered = await p.locator('[data-g=second]').count();
  // offered exactly when one of the clean solves has another way (counted here by the test's own enumeration)
  ok(offered === (clean.some(Boolean) ? 1 : 0) && clean.some(Boolean) && /Can you make it another way\?/.test(end), `Target: the finish card offers the second-way challenge (clean solves with another way: ${clean})`);
  await shot('target-end');
  const stars0 = await p.locator('.play-end .stars .on').count(), xp0 = (await kidNow(G)).xp;
  await p.click('[data-g=second]'); await p.waitForSelector('.mt-block');
  const blocked = (await probe(G, 'challenge')).blocked;
  await solveNow(p, G, (pl) => pl.way === blocked);
  await p.waitForTimeout(150);
  ok(/same way/.test(await p.locator('.mt-msg').innerText()) && await p.locator('.mt-target.won').count() === 0, `Target: the second way refuses the child's own way (${blocked})`);
  await shot('target-second');
  await p.keyboard.press('r');
  await solveNow(p, G, (pl) => pl.way !== blocked);
  await atEnd(p);
  end = await p.locator('.play-end').innerText();
  ok(/a star for it/.test(end) && await p.locator('.play-end .stars .on').count() === Math.min(3, stars0 + 1), `Target: another way is worth a star (${stars0} → ${await p.locator('.play-end .stars .on').count()})`);
  ok((await kidNow(G)).xp === xp0 && (await kidNow(G)).gameLv.target.lv === 3, 'Target: the second way never pays a wage and never moves the level');
  // Play again: the chip now defaults to the level the rule left; 3 clean of 5 (60%) keeps it
  await p.click('[data-g=again]'); await p.waitForSelector('.g-intro .g-lvb');
  ok((await chip(p)).on === 3, 'Target: the chip defaults to the last level played');
  await skipIntro(p); await p.waitForSelector('.mt-card');
  for (let r = 1; r <= 5; r++) {
    await p.waitForFunction((r) => new RegExp(`Puzzle\\s*${r}\\b`).test(document.querySelector('.play-hud').textContent) && !document.querySelector('.mt-target.won'), r, { timeout: 8000 });
    if (r <= 3) { await solveNow(p, G); await until(p, () => !!document.querySelector('.mt-target.won')); }
    else { await p.keyboard.press('s'); await until(p, () => /One way/.test(document.querySelector('.mt-msg').innerText)); }
  }
  await atEnd(p);
  end = await p.locator('.play-end').innerText();
  ok(/60% right — you keep Level 3/.test(end) && (await kidNow(G)).gameLv.target.lv === 3, `T5 Target: 3 clean of 5 (60%) keeps the level (${end.match(/\d+% right[^\n]*/)})`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);

  /* -------------------------------------------- Today's puzzle: two sizes, shown is shown */
  await fire(G, 'daily'); await p.waitForSelector('.g-intro .g-lvb');
  c = await chip(p);
  ok(c.n === 2 && c.on === 4 && /Bigger · Level 4/.test(c.words) && /Smaller · Level 2/.test(c.labels[0]), `Today's puzzle: two sizes, Level 2 and Level 4, from one seed (${c.labels.join(' | ')})`);
  await p.keyboard.press('2'); await shot('daily-chip'); await skipIntro(p); await p.waitForSelector('.mt-card');
  const small = await probe(G, 'puzzle');
  ok(small.lv === 2 && small.nums.length === 3, `Today's puzzle: the smaller one is Level 2 (${small.nums} → ${small.target})`);
  const x1 = (await kidNow(G)).xp;
  await p.keyboard.press('s'); await p.waitForSelector('.mt-tools [data-t=done]');
  await p.click('.mt-tools [data-t=done]'); await atEnd(p);
  ok(await p.locator('.play-end [data-g=again]').count() === 0 && /^Done/.test(await p.locator('.play-end [data-g=done]').innerText()), 'Today\'s puzzle: "Play again" is Done');
  await shot('daily-shown');
  const day = await G(() => { const d = new Date(), q = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${q(d.getMonth() + 1)}-${q(d.getDate())}`; });
  ok((await kidNow(G)).daily[day].shown === true, 'Today\'s puzzle: after Show me the day is recorded as shown');
  await p.click('.play-end [data-g=done]'); await p.waitForTimeout(200);
  // the same seed, solved later the same day: never credited
  await fire(G, 'daily'); await p.waitForSelector('.g-intro .g-lvb'); await skipIntro(p); await p.waitForSelector('.mt-card');
  const big = await probe(G, 'puzzle');
  ok(big.lv === 4 && big.nums.length === 4, `Today's puzzle: the bigger one is Level 4 (${big.nums} → ${big.target})`);
  await solveNow(p, G); await atEnd(p);
  const kd = await kidNow(G);
  ok(kd.xp === x1 && !kd.daily[day].puzzle && /for fun/.test(await p.locator('.play-end').innerText()), `Today's puzzle: a solve after Show me is never credited (xp ${x1} → ${kd.xp}, solved ${kd.daily[day].puzzle})`);
  await p.click('.play-end [data-g=done]'); await p.waitForTimeout(200);
  await ctx.close();
}
{ // a second clean solve of today's puzzle pays again, as it always did (owner, 9 Oct 2026); only Show me stops pay
  const { p, ctx, G } = await open({ width: 1280, height: 800 }, 'daily2');
  const x0 = (await kidNow(G)).xp;
  for (let t = 0; t < 2; t++) {
    await fire(G, 'daily'); await p.waitForSelector('.g-intro .g-lvb'); await skipIntro(p); await p.waitForSelector('.mt-card');
    await solveNow(p, G); await atEnd(p);
    await p.click('.play-end [data-g=done]'); await p.waitForTimeout(200);
  }
  const k = await kidNow(G);
  ok(k.xp - x0 === 20, `Today's puzzle: solved twice in a day without Show me, paid twice (${k.xp - x0} xp)`);
  await ctx.close();
}

/* ================================================================ Number Line */
{
  const { p, ctx, G, shot } = await open({ width: 1280, height: 800 }, 'line');
  await fire(G, 'play', 'line'); await p.waitForSelector('.g-intro .g-lvb');
  let c = await chip(p);
  ok(c.n === 5 && c.on === 2 && /^Level 2 · 0 to 100$/.test(c.words), `Line: the chip, an 8–10 starting at 0–100 (${c.words})`);
  await p.click('.g-lvb[data-lv="3"]'); await p.waitForTimeout(3500);
  ok((await chip(p)).on === 3 && await p.locator('.g-intro').count() === 1, 'Line: a tap chooses a level and the card waits');
  await shot('line-chip');
  await p.click('.g-intro [data-g=go]'); await p.waitForSelector('.nl-track');
  const ticks = () => G(() => [...document.querySelectorAll('.nl-tick:not(.end)')].map((t) => t.textContent.trim()));
  const phases = [];
  for (let r = 0; r < 8; r++) {
    const L = await probe(G, 'line'), t = await probe(G, 'target'), tk = await ticks();
    phases.push(L.phase);
    ok(L.range === '0–1000', `Line round ${r + 1}: level 3 is 0–1000 (${L.range})`);
    if (r < 3) ok(tk.length === 3 && tk.every(Boolean) && !tk.includes(String(t)), `Line round ${r + 1}: labelled quarter ticks, none the answer (${tk})`);
    else if (r < 6) ok(tk.length === 3 && tk.every((x) => !x), `Line round ${r + 1}: ticks with no numbers`);
    else ok(tk.length === 0, `Line round ${r + 1}: no ticks`);
    if (r === 0) await shot('line-labelled');
    if (r === 3) await shot('line-bare');
    if (r === 6) await shot('line-none');
    // three right (one 4 away, two 10 away — all within 5% of 1000), five far
    const off = r === 0 ? 4 : r < 3 ? 10 : 200;
    await probe(G, 'place', t + off <= 1000 ? t + off : t - off);
    await p.waitForSelector('.nl-true');
    await p.keyboard.press('Enter');
  }
  await atEnd(p);
  const end = await p.locator('.play-end').innerText();
  ok(/38% right — next round is Level 2/.test(end) && (await kidNow(G)).gameLv.line.lv === 2, `T5 Line: 3 of 8 within 5% drops a level (${end.match(/\d+% right[^\n]*/)})`);
  ok(/Your best on 0–1000: 4 away\./.test(end) && (await kidNow(G)).gameLv.line.err['0–1000'] === 4, `Line: the best error on the line is kept and said (${end.match(/Your best[^\n]*/)})`);
  ok(!/streak/i.test(end), 'Line: a record, never a streak');
  await shot('line-end');
  // 60% keeps: five of eight within 5%
  await p.click('[data-g=again]'); await p.waitForSelector('.g-intro .g-lvb');
  ok((await chip(p)).on === 2, 'Line: the chip defaults to the last level played');
  await skipIntro(p); await p.waitForSelector('.nl-track');
  for (let r = 0; r < 8; r++) {
    const t = await probe(G, 'target'), L = await probe(G, 'line'), span = L.hi - L.lo;
    await probe(G, 'place', r < 5 ? t : (t + span * 0.3 <= L.hi ? t + span * 0.3 : t - span * 0.3));
    await p.waitForSelector('.nl-true'); await p.keyboard.press('Enter');
  }
  await atEnd(p);
  ok(/63% right — you keep Level 2/.test(await p.locator('.play-end').innerText()), 'T5 Line: 5 of 8 keeps the level');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  // the paid modes have their ladders: Negatives labels every fifth tick at level 1, Fractions starts on halves
  await fire(G, 'play', 'line:negatives'); await p.waitForSelector('.g-intro .g-lvb');
  ok(/^Level 1 · −10 to 10$/.test((await chip(p)).words), `Negatives: its own ladder (${(await chip(p)).words})`);
  await skipIntro(p); await p.waitForSelector('.nl-track');
  const nt = await ticks();
  ok(nt.filter(Boolean).join() === '−5,0,5' && nt.length > 10, `Negatives level 1: every fifth tick labelled (${nt.filter(Boolean)}; ${nt.length} ticks)`);
  await shot('line-negatives');
  await G(() => window.__bzmGames.active().quit()); await p.waitForTimeout(200);
  await fire(G, 'play', 'line:fractions'); await p.waitForSelector('.g-intro .g-lvb');
  ok(/^Level 1 · halves$/.test((await chip(p)).words), 'Fractions: level 1 is halves');
  await skipIntro(p); await p.waitForSelector('.nl-track');
  const fl = await probe(G, 'line'), fq = await p.locator('.nl-q b').innerText();
  ok(fl.range === '0–4' && /^\d\/2$/.test(fq), `Fractions level 1: halves on 0–4 (${fq} on ${fl.range})`);
  await shot('line-fractions');
  await G(() => window.__bzmGames.active().quit());
  await ctx.close();
}

/* ================================================================ Cube Builder: the audit, on a phone */
for (const dark of [false, true]) {
  const tag = dark ? 'dark' : 'light';
  const { p, ctx, G, shot } = await open({ width: 390, height: 844 }, 'cubes-' + tag, { dark });
  await fire(G, 'play', 'cubes'); await p.waitForSelector('.g-intro .g-lvb');
  let c = await chip(p);
  ok(c.n === 5 && c.on === 2 && /^Level 2 · many ways$/.test(c.words) && /4 × 4, one hidden tower/.test(c.labels[3]) && /fewest cubes only/.test(c.labels[4]), `${tag} Cube: the chip, levels 1–5 in words (${c.labels.join(' | ')})`);
  const chipSmall = await G(() => [...document.querySelectorAll('.g-lvb')].filter((b) => { const r = b.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).length);
  ok(chipSmall === 0, `${tag} Cube: every level button is at least 44px`);
  await p.tap('.g-lvb[data-lv="4"]'); await shot('chip'); await p.tap('.g-intro [data-g=go]'); await p.waitForSelector('.cb-grid');
  ok(await probe(G, 'level') === 4 && (await probe(G, 'puzzle')).n === 3, `${tag} Cube: level 4's round opens one level below, on 3 × 3`);
  // the PERFECT bot by KEYBOARD: arrows and digits
  async function byKeys() {
    const ans = await probe(G, 'answer'), n = Math.sqrt(ans.length);
    let sel = await G(() => +document.querySelector('.cb-cell.sel').dataset.i);
    for (let i = 0; i < ans.length; i++) {
      if (!ans[i]) continue;
      const [r, c, r0, c0] = [Math.floor(i / n), i % n, Math.floor(sel / n), sel % n];
      for (let k = 0; k < Math.abs(r - r0); k++) await p.keyboard.press(r > r0 ? 'ArrowDown' : 'ArrowUp');
      for (let k = 0; k < Math.abs(c - c0); k++) await p.keyboard.press(c > c0 ? 'ArrowRight' : 'ArrowLeft');
      sel = i; await p.keyboard.press(String(ans[i]));
    }
    return ans;
  }
  // the PERFECT bot by TOUCH: a tap on a square, then up, up, up
  async function byTouch() {
    const ans = await probe(G, 'answer');
    for (let i = 0; i < ans.length; i++) { if (!ans[i]) continue; await p.tap(`.cb-cell[data-i="${i}"]`); for (let k = 0; k < ans[i]; k++) await p.tap('[data-a=up]'); }
    return ans;
  }
  const a1 = await byKeys(); await p.waitForTimeout(100);
  ok((await probe(G, 'build')).join() === a1.join() && /fewest/.test(await p.locator('.cb-msg').innerText()), `${tag} Cube: the perfect bot solves puzzle 1 by keyboard`);
  await p.waitForFunction(() => /Puzzle\s*2/.test(document.querySelector('.play-hud').textContent), null, { timeout: 5000 });
  ok((await probe(G, 'puzzle')).n === 4 && await p.locator('.cb-cell').count() === 16, `${tag} Cube: level 4 is a 4 × 4 floor`);
  await p.waitForFunction(() => document.getAnimations().every((x) => x.playState !== 'running' || (x.effect && x.effect.getTiming().iterations === Infinity)), null, { timeout: 5000 }).catch(() => {});
  const small = await G(() => [...document.querySelectorAll('.play .cb-cell, .play .cb-ctl button, .play .mt-tools button')].map((b) => { const r = b.getBoundingClientRect(); return [b.className, b.dataset.a || '', Math.round(r.width), Math.round(r.height)]; }).filter(([, , w, h]) => w < 44 || h < 44));
  ok(small.length === 0, `${tag} Cube: on a 4 × 4 floor every square and the raise and lower controls are at least 44px (${JSON.stringify(small.slice(0, 4))})`);
  const wide = await G(() => Math.max(document.querySelector('.play-body').scrollWidth - document.querySelector('.play-body').clientWidth, document.documentElement.scrollWidth - innerWidth));
  ok(wide <= 0, `${tag} Cube: nothing scrolls sideways on a phone at 4 × 4 (${wide}px)`);
  // the fold: with a square chosen, the raise and lower controls are on screen, not under anything fixed
  await p.tap('.cb-cell[data-i="5"]');
  const fold = await G(() => { const u = document.querySelector('[data-a=up]').getBoundingClientRect(), d = document.querySelector('[data-a=down]').getBoundingClientRect(); return { top: Math.min(u.top, d.top), bottom: Math.max(u.bottom, d.bottom), h: innerHeight, hit: document.elementFromPoint(u.left + u.width / 2, u.top + u.height / 2)?.closest('[data-a=up]') ? 1 : 0 }; });
  ok(fold.bottom <= fold.h && fold.top >= 0 && fold.hit === 1, `${tag} Cube: raise and lower are inside the phone's viewport and nothing covers them (${JSON.stringify(fold)})`);
  await shot('l4');
  await p.tap('[data-a=clear]');
  const a2 = await byTouch(); await p.waitForTimeout(100);
  ok((await probe(G, 'build')).join() === a2.join(), `${tag} Cube: the perfect bot solves the 4 × 4 by touch — the same build the keys make`);
  await p.waitForFunction(() => /Puzzle\s*3/.test(document.querySelector('.play-hud').textContent), null, { timeout: 5000 });
  await byKeys();
  await atEnd(p);
  let end = await p.locator('.play-end').innerText();
  ok(/100% right — Level 5 is open/.test(end) && await p.locator('[data-g=up]').count() === 1, `${tag} Cube: the perfect bot's 3 of 3 offers Level 5 (${end.match(/\d+% right[^\n]*/)})`);
  await shot('end');
  // level 5: a match with more than the fewest is not a solve
  await p.tap('[data-g=up]'); await p.waitForSelector('.g-intro .g-lvb');
  ok((await chip(p)).on === 5, `${tag} Cube: taking the offer opens Level 5`);
  await p.tap('.g-intro [data-g=go]'); await p.waitForSelector('.cb-grid');
  await byKeys(); await p.waitForFunction(() => /Puzzle\s*2/.test(document.querySelector('.play-hud').textContent), null, { timeout: 5000 });
  const pz = await probe(G, 'puzzle');
  ok(pz.lv === 5, `${tag} Cube: puzzle 2 is a level-5 puzzle`);
  const v = pz.views, n = pz.n, more = pz.answer.findIndex((x, i) => x > 0 && x + 1 <= Math.min(v.front[i % n], v.side[Math.floor(i / n)]));
  const extra = pz.answer.slice(); extra[more]++;
  for (let i = 0; i < extra.length; i++) { if (!extra[i]) continue; await p.tap(`.cb-cell[data-i="${i}"]`); await p.tap(`[data-a=set][data-v="${extra[i]}"]`); }
  await p.waitForTimeout(100);
  const m5 = await p.locator('.cb-msg').innerText();
  ok(more >= 0 && await p.locator('.cb-view.match').count() === 3 && /only the fewest/.test(m5) && await p.locator('[data-a=done]').innerText().then((t) => /Check/.test(t)), `${tag} Cube L5: the views match with one cube too many, and it is not a solve (${m5.slice(0, 70)})`);
  await p.keyboard.press('Enter'); await p.waitForTimeout(100);
  ok(/not the fewest/.test(await p.locator('.cb-msg').innerText()) && (await probe(G, 'right')) === 1, `${tag} Cube L5: Check says it is not the fewest, and nothing is counted`);
  await shot('l5');
  // one row: every button on the same centre line (a 48px button and a 44px one differ in top)
  const row = await G(() => { const bs = [...document.querySelectorAll('.cb-ctl button')]; return { tops: new Set(bs.map((b) => { const r = b.getBoundingClientRect(); return Math.round((r.top + r.height / 2) / 8); })).size, small: bs.filter((b) => b.getBoundingClientRect().width < 44 || b.getBoundingClientRect().height < 44).length, n: bs.length }; });
  ok(row.tops === 1 && row.small === 0 && row.n === 7, `${tag} Cube L5: lower, 0–4 and raise sit on one row on a phone, every one at least 44px (${JSON.stringify(row)})`);
  // the RANDOM bot: thirty random keys a puzzle, then Check, then Show me
  const rnd = (() => { let a = 7; return () => ((a = (a * 1103515245 + 12345) % 2147483648) / 2147483648); })();
  const KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '+', '-', '0', '1', '2', '3', '4'];
  const r0 = await probe(G, 'right');
  for (let q = 2; q <= 3; q++) {
    await p.waitForFunction((q) => new RegExp(`Puzzle\\s*${q}`).test(document.querySelector('.play-hud').textContent) && !document.querySelector('.cb.lock'), q, { timeout: 6000 });
    await p.keyboard.press('c');
    for (let k = 0; k < 30; k++) await p.keyboard.press(KEYS[Math.floor(rnd() * KEYS.length)]);
    await p.keyboard.press('Enter'); await p.waitForTimeout(80);
    if (!(await G(() => !!document.querySelector('.cb.lock')))) await p.keyboard.press('s');
  }
  await atEnd(p);
  ok((await probe(G, 'right')) === r0, `${tag} Cube: the random bot solves nothing (${(await probe(G, 'right')) - r0} of 2)`);
  end = await p.locator('.play-end').innerText();
  ok(/33% right — next round is Level 4/.test(end), `T5 Cube: 1 of 3 drops a level (${end.match(/\d+% right[^\n]*/)})`);
  await p.tap('.play-end [data-g=done]'); await p.waitForTimeout(200);
  // the Puzzles tab offers all five levels, and the one last played is lit
  await G(() => window.__bzm.go('puzzles')); await p.waitForSelector('[data-act=cubesPlay]');
  ok(await p.locator('[data-act=cubesPlay]').count() === 5 && await p.locator('[data-act=cubesPlay].on').getAttribute('data-arg') === '4', `${tag} Cube: the Puzzles tab offers levels 1–5, the last played lit`);
  await ctx.close();
}

ok(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await close();
console.log(`${fails() ? 'FAIL' : 'ok'} levels-ui — the level chip on Target, Line, Cube Builder and Today's puzzle; the level rule as each game counts right; the second way; the daily's two sizes and Show me; the Line's tick ramp and best; Cube Builder's bots, 4 × 4, fewest-only, 44px and the fold`);
process.exit(fails() ? 1 : 0);
