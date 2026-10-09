/* puzzles-ui.mjs — the Puzzles tab and the Journey's duel in Chromium on the BUILT app (games spec
   §3.5, §3.6), at 1280×800 and 390×844, light and dark:
     · T11  Sudoku: a hint highlights a square and explains it in words, and the square stays EMPTY;
            three hints and the button is spent (a fourth, by key, changes nothing); solving it pays
            XP equal to the squares the child placed; the finish card lists what was practised,
            with the hinted squares and their numbers.
     · boss floor 4: solved with two hints or fewer, it opens the stairs AND pays `stop` 5, once.
     · T12  Tower floor: one lucky pick among misses pays 0 coins; a floor answered right pays a
            coin for every right and `stop` 5 for the first clear.
     · T13  the duel: the rival's face, tell and thinking bar are on screen; the score is rounds
            won (never your misses); every round's rival answer is the one drawn for it before the
            child answered; first to two ends it, and the end card says so.
   Screenshots land in $SHOTS as puzzles-*.png. */
import { site, kidRec, household, checker, ready, until, SHOTS } from './lib/site.mjs';
import { bot } from '../src/contest.js';

const { BASE, browser, close } = await site('puzzles', +(process.env.PORT_BASE || 5200) + 17);
const { ok, fails } = checker();
const errors = [];

async function open(vp, tag, { dark = false, band = '8-10', extra = {} } = {}) {
  const phone = vp.width < 500;
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, colorScheme: dark ? 'dark' : 'light' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  const kid = kidRec('ka', 'Ahana', band, 'cubebot', extra);
  await p.addInitScript(([h, mode]) => { try { if (!localStorage.getItem('bzm_household')) { localStorage.setItem('bzm_household', h); localStorage.setItem('bzm_device', JSON.stringify({ mode })); } } catch {} }, [JSON.stringify(household([kid])), dark ? 'dark' : 'light']);
  await p.goto(BASE + '#/puzzles'); await ready(p);
  const G = (fn, a) => p.evaluate(fn, a);
  return { p, ctx, G, shot: (n) => p.screenshot({ path: `${SHOTS}/puzzles-${tag}-${n}.png` }) };
}
const coins = (G) => G(() => { try { const w = JSON.parse(localStorage.getItem('bizzing.wallet') || '{}'); return ((w.kids || {}).ahana || {}).coins || 0; } catch { return 0; } });
const ledger = (G) => G(() => { try { return ((JSON.parse(localStorage.getItem('bizzing.wallet') || '{}').kids || {}).ahana || {}).ledger || []; } catch { return []; } });
const xp = (G) => G(() => window.__bzm.R.h.kids[0].xp);
const wide = (G) => G(() => document.documentElement.scrollWidth > innerWidth + 1);
const skip = async (p) => { await p.waitForSelector('.g-intro'); await p.keyboard.press('Enter'); await p.waitForSelector('.g-intro', { state: 'detached' }); };
const grid = (G) => G(() => [...document.querySelectorAll('.sdk .sc')].map((b) => +b.textContent || 0));
/* a plain backtracking solver, in the page's terms — a second route, never puzzles.js's own */
function solve(g) {
  const n = Math.round(Math.sqrt(g.length)), [br, bc] = { 4: [2, 2], 6: [2, 3], 9: [3, 3] }[n], s = g.slice();
  const fits = (i, v) => { const r = Math.floor(i / n), c = i % n; for (let k = 0; k < n; k++) if (s[r * n + k] === v || s[k * n + c] === v) return false;
    const r0 = r - (r % br), c0 = c - (c % bc); for (let a = 0; a < br; a++) for (let b = 0; b < bc; b++) if (s[(r0 + a) * n + c0 + b] === v) return false; return true; };
  const go = (i) => { if (i === s.length) return true; if (s[i]) return go(i + 1); for (let v = 1; v <= n; v++) if (fits(i, v)) { s[i] = v; if (go(i + 1)) return true; } s[i] = 0; return false; };
  go(0); return s;
}
async function fillAll(p, G, sol, start) {
  for (let i = 0; i < sol.length; i++) if (!start[i]) { await p.click(`.sdk .sc[data-i="${i}"]`); await p.keyboard.press(String(sol[i])); if (await G(() => !!document.querySelector('.play-end'))) break; }
}

const part = (x) => !process.env.ONLY || process.env.ONLY === x;   // ONLY=sudoku|boss|tower|duel runs one part, for a quick look
/* a wrong typed answer that no prefix of makes right (typing 9 for 98765 would submit a right 9) */
const miss = (ans) => (/^\d+$/.test(ans) ? String(+ans + 1) : '98765');
const VPS = [[{ width: 1280, height: 800 }, 'desk'], [{ width: 390, height: 844 }, 'phone']];

/* ---------------------------------------------------------------- T11: Sudoku hints */
if (part('sudoku')) for (const [vp, tag0] of VPS) for (const dark of [false, true]) {
  const tag = `${tag0}-${dark ? 'dark' : 'light'}`;
  const { p, ctx, G, shot } = await open(vp, tag, { dark });
  await G(() => window.__bzm.fire('sudokuPlay', '1')); await skip(p); await p.waitForSelector('.sdk');
  const start = await grid(G), sol = solve(start), empties = start.filter((v) => !v).length;
  ok(sol.every(Boolean), `${tag}: the grid on screen solves`);
  const xp0 = await xp(G);
  let lastTip = '';
  for (let h = 1; h <= 3; h++) {
    const before = await grid(G);
    if (h === 2) await p.keyboard.press('h'); else await p.click('[data-t=hint]');
    const st = await G(() => { const c = document.querySelector('.sdk .sc.hint'); return { i: c ? +c.dataset.i : -1, txt: c ? c.textContent : null, tip: (document.querySelector('.sdk-tip') || {}).textContent || '', left: document.querySelector('.play-hud').textContent.match(/Hints left\s*(\d)/) }; });
    const after = await grid(G);
    ok(st.i >= 0 && st.txt === '' && JSON.stringify(after) === JSON.stringify(before), `${tag}: hint ${h} highlights a square and leaves it empty (${st.i}, "${st.txt}")`);
    ok(st.tip.length > 30 && st.tip !== lastTip && !new RegExp(`(must be|is) ${sol[st.i]}\\b`).test(st.tip) && !new RegExp(`(^|[^0-9])${sol[st.i]}([^0-9]|$)`).test(st.tip.replace(/\b(Row|row|column|Column) \d+/g, '')), `${tag}: hint ${h} explains in words and never prints the number: "${st.tip}" (answer ${sol[st.i]})`);
    ok(st.left && +st.left[1] === 3 - h, `${tag}: ${3 - h} hints left after ${h}`);
    lastTip = st.tip;
    if (h === 1) await shot('sudoku-hint');
    // place the hinted square, as the child would
    if (h < 3) { await p.click(`.sdk .sc[data-i="${st.i}"]`); await p.keyboard.press(String(sol[st.i])); }
  }
  const spent = await G(() => { const b = document.querySelector('[data-t=hint]'); return { dis: b.disabled, txt: b.textContent.trim() }; });
  ok(spent.dis && /No hints left/.test(spent.txt), `${tag}: after three, the hint button is spent (${JSON.stringify(spent)})`);
  const g4 = await grid(G), tip4 = await G(() => (document.querySelector('.sdk-tip') || {}).textContent || '');
  await p.keyboard.press('h');
  ok(JSON.stringify(await grid(G)) === JSON.stringify(g4) && (await G(() => (document.querySelector('.sdk-tip') || {}).textContent || '')) === tip4, `${tag}: a fourth hint by key does nothing`);
  ok(!(await wide(G)), `${tag}: nothing scrolls sideways`);
  await fillAll(p, G, sol, start);
  await p.waitForSelector('.play-end', { timeout: 10000 });
  const gained = (await xp(G)) - xp0;
  ok(gained === empties, `${tag}: XP is the squares the child placed (${gained}, ${empties} empty at the start)`);
  const card = await G(() => ({ items: [...document.querySelectorAll('.g-practised .ok li')].map((x) => x.textContent), again: [...document.querySelectorAll('.g-practised .again li')].map((x) => x.textContent) }));
  ok(card.items.some((x) => x === `${empties} squares placed by you`) && card.again.filter((x) => /a hint explained why/.test(x)).length === 3, `${tag}: the finish card lists what was practised and the three hinted squares (${JSON.stringify(card)})`);
  await shot('sudoku-end');
  await ctx.close();
}

/* ---------------------------------------------------------------- boss floor 4 pays `stop` on its first clear */
if (part('boss')) {
  const quest = { 1: { stars: 3, passed: true }, 2: { stars: 3, passed: true }, 3: { stars: 3, passed: true } };
  const { p, ctx, G } = await open(VPS[0][0], 'boss', { extra: { quest } });
  await G(() => window.__bzm.fire('climb', '4')); await skip(p); await p.waitForSelector('.sdk');
  const c0 = await coins(G), start = await grid(G), sol = solve(start);
  await p.click('[data-t=hint]');   // one hint: two stars, the stairs open
  await fillAll(p, G, sol, start); await p.waitForSelector('.play-end', { timeout: 10000 });
  const q = await G(() => window.__bzm.R.h.kids[0].quest[4]), L = await ledger(G);
  ok(q && q.passed && (await coins(G)) - c0 === 5 && L.some((x) => x.why === 'stop' && x.n === 5), `the boss floor's first clear pays stop 5 (${(await coins(G)) - c0}, ${JSON.stringify(q)})`);
  await ctx.close();
}

/* ---------------------------------------------------------------- T12: one lucky pick pays 0 */
async function floorRun(G, p, plan, needMc = false) {
  let items;
  for (let t = 0; t < 30; t++) {   // a floor is drawn at random: draw again until it has a picked puzzle, when one is needed
    await G(() => window.__bzm.fire('climb', '1')); await p.waitForSelector('.runner');
    items = await G(() => window.__bzm.R.run.items.map((q) => ({ mc: !!q.choices, choices: q.choices || null, ans: String(q.ans) })));
    if (!needMc || items.some((q) => q.mc)) break;
    await G(() => window.__bzm.fire('quitRun'));
  }
  const pick = plan(items);
  for (let i = 0; i < items.length; i++) {
    const q = items[i], right = pick[i];
    if (q.mc) await G((c) => window.__bzm.fire('choose', c), right ? q.ans : q.choices.find((c) => String(c) !== q.ans));
    else { await p.keyboard.type(right ? q.ans : miss(q.ans)); if (!right) await p.keyboard.press('Enter'); }
    await until(p, () => !!window.__bzm.R.run.fb);
    await G(() => window.__bzm.fire('nextQ'));
  }
  await until(p, () => window.__bzm.R.run.over);
  return items;
}
if (part('tower')) for (const [vp, tag] of VPS) {
  const { p, ctx, G, shot } = await open(vp, `tower-${tag}`);
  await G(() => { const R = window.__bzm.R; R.h.kids[0].quest = {}; });
  // only the first multiple-choice puzzle is answered right: a lone lucky pick
  const items = await floorRun(G, p, (it) => { const i = it.findIndex((q) => q.mc); return it.map((_, j) => j === i); }, true);
  ok(items.some((q) => q.mc), `${tag}: the floor has a multiple-choice puzzle`);
  ok((await coins(G)) === 0, `${tag}: one lucky pick among misses pays 0 coins (${await coins(G)})`);
  if (process.env.DBG) console.log(JSON.stringify(items), JSON.stringify(await ledger(G)), JSON.stringify(await G(() => window.__bzm.R.run.results)));
  await shot('tower-lucky');
  // the same floor answered right: a coin for every right, and stop 5 for the first clear
  await floorRun(G, p, (it) => it.map(() => true));
  const L = await ledger(G);
  ok((await coins(G)) === 6 + 5 && L.filter((x) => x.why === 'answer').length === 6 && L.some((x) => x.why === 'stop'), `${tag}: a floor answered right pays six answer coins and stop 5 (${await coins(G)})`);
  await ctx.close();
}

/* ---------------------------------------------------------------- T13: the duel */
if (part('duel')) for (const [vp, tag0] of VPS) for (const dark of [false, true]) {
  const tag = `${tag0}-${dark ? 'dark' : 'light'}`;
  const { p, ctx, G, shot } = await open(vp, `duel-${tag}`, { dark, band: '6-7' });
  const land = await G(() => { const { R, J } = window.__bzm, k = R.h.kids[0], pr = J.progress(k); return pr.nodes.find((n) => n.land).land.id; });
  await G((l) => window.__bzm.fire('secret', `duel|${l}`), land); await p.waitForSelector('.duel');
  const rival = await G(() => window.__bzm.R.run.rival), b = bot(rival);
  const face = await G(() => ({ img: (document.querySelector('.duel-rival img.av') || {}).alt, tell: (document.querySelector('.duel-rival .tell') || {}).textContent, dur: (document.querySelector('.dr-bar i') || { style: {} }).style.animationDuration, think: window.__bzm.R.run.duel.turn.think, st: document.querySelector('.dr-st').textContent }));
  ok(face.img === b.name && face.tell.toLowerCase().startsWith(b.tell.toLowerCase()) && face.dur === `${face.think}ms` && /thinking/.test(face.st), `${tag}: the rival's face, tell and thinking time are on screen (${JSON.stringify(face)})`);
  if (tag0 === 'phone' || !dark) await shot('duel-thinking');
  ok(!(await wide(G)), `${tag}: nothing scrolls sideways`);
  if (!dark && tag0 === 'desk') {   // the rival finishes thinking on screen
    const t = face.think;
    ok(await until(p, () => /has an answer/.test(document.querySelector('.dr-st').textContent), null, t + 4000), `${tag}: after ${t} ms the rival has an answer`);
  }
  // play: right on the first, wrong on the second, right after — until it ends
  const seen = [];
  for (let r = 0; r < 6; r++) {
    const s = await G(() => { const run = window.__bzm.R.run, q = run.items[run.i]; return { over: run.over, drawn: run.duel.turn.right, ans: String(q.ans), mc: !!q.choices, choices: q.choices || null }; });
    if (s.over) break;
    const right = r !== 1;
    if (s.mc) await G((c) => window.__bzm.fire('choose', c), right ? s.ans : s.choices.find((c) => String(c) !== s.ans));
    else { await p.keyboard.type(right ? s.ans : miss(s.ans)); if (!right) await p.keyboard.press('Enter'); }
    await until(p, () => !!window.__bzm.R.run.fb);
    const after = await G(() => { const d = window.__bzm.R.run.duel.d, x = d.rounds.at(-1); return { you: d.you, them: d.them, x, shown: document.querySelector('.duel-score').getAttribute('aria-label'), round: (document.querySelector('.duel-round') || {}).textContent || '', st: document.querySelector('.dr-st').textContent }; });
    seen.push({ drawn: s.drawn, ...after });
    ok(after.x.them.right === s.drawn, `${tag}: round ${r + 1} — the rival's answer is the one drawn before you answered (${s.drawn})`);
    ok(after.shown === `You ${after.you}, ${b.name} ${after.them}` && after.round.length > 5 && (after.x.them.right ? /right, in/ : /missed it/).test(after.st), `${tag}: round ${r + 1} is shown — ${after.shown} · "${after.round}" · ${after.st}`);
    if (r === 0 && (tag0 === 'phone' || !dark)) await shot('duel-round');
    await p.keyboard.press('Enter');
    await until(p, () => window.__bzm.R.run.over || !window.__bzm.R.run.fb);
  }
  const end = await G(() => { const run = window.__bzm.R.run, d = run.duel.d; return { over: run.over, you: d.you, them: d.them, rounds: d.rounds.length, right: run.results.filter((x) => x.right).length, n: run.results.length, h2: (document.querySelector('.end-card h2') || {}).textContent }; });
  const won = seen.filter((x) => x.x.who === 'you').length, lost = seen.filter((x) => x.x.who === 'them').length;
  ok(end.over && (end.you === 2 || end.them === 2 || end.rounds === 5) && end.you === won && end.them === lost, `${tag}: first to two ends it, and the score is rounds won (${JSON.stringify(end)})`);
  ok(end.h2 === `You ${end.you} · ${b.name} ${end.them}`, `${tag}: the end card heads with the rounds won (${end.h2}; ${end.right} of ${end.n} right)`);
  if (tag0 === 'phone' || !dark) await shot('duel-end');
  await ctx.close();
}

ok(!errors.length, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await close();
console.log(fails() ? `FAIL puzzles-ui — ${fails()}` : 'ok puzzles-ui — a sudoku hint explains and never fills, three per grid, XP per placed square; a boss floor pays stop; one lucky pick pays 0; the duel rival really answers');
process.exit(fails() ? 1 : 0);
