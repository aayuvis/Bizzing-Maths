/* test/levels-play.mjs — games spec §2.2, §3.2, §3.3: the level ladders of Make the Target, Number
   Line and Cube Builder, proved over thousands of generated puzzles (T5, T6).

   The proofs here share no code with what they prove: `ways()` below is a plain enumeration of
   every expression a hand of cards can make (each card once, − never below nought, ÷ always
   whole — the game's own rules), written out again, not imported. Each check was watched to fail
   with its feature removed (see the report that landed this file). */
import { readFileSync } from 'node:fs';
import * as G from '../src/games.js';
import * as C from '../src/cubes.js';
import { afterRound, levelOf, setLevel } from '../src/game-level.js';
import { seeded } from '../src/rand.js';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; if (fails < 25) console.error('  ✗ ' + m); } };

/* ------------------------------------------------ an independent prover */
const F = { '+': (a, b) => a + b, '−': (a, b) => (a >= b ? a - b : null), '×': (a, b) => a * b, '÷': (a, b) => (b && a % b === 0 ? a / b : null) };
// every way (sorted op string) that makes `t` from ALL of xs, using only the keys in `keys`
function ways(xs, t, keys = '+−×÷') {
  const out = new Set();
  (function go(items) {
    if (items.length === 1) { if (items[0].v === t) out.add(items[0].w.split('').sort().join('')); return; }
    for (let i = 0; i < items.length; i++) for (let j = 0; j < items.length; j++) {
      if (i === j) continue;
      const rest = items.filter((_, x) => x !== i && x !== j);
      for (const o of keys) {
        const v = F[o](items[i].v, items[j].v); if (v == null || v > 10000) continue;
        go([...rest, { v, w: items[i].w + items[j].w + o }]);
      }
    }
  })(xs.map((v) => ({ v, w: '' })));
  return out;
}
// every value any hand can make (memo by the hand): for the five-card proofs
function values(xs, keys = '+−×÷', memo = new Map()) {
  const k = xs.slice().sort((a, b) => a - b).join(',') + '|' + keys;
  if (memo.has(k)) return memo.get(k);
  const out = new Set();
  if (xs.length === 1) out.add(xs[0]);
  for (let i = 0; i < xs.length; i++) for (let j = 0; j < xs.length; j++) {
    if (i === j) continue;
    const rest = xs.filter((_, x) => x !== i && x !== j);
    for (const o of keys) { const v = F[o](xs[i], xs[j]); if (v != null && v <= 10000) for (const u of values([...rest, v], keys, memo)) out.add(u); }
  }
  memo.set(k, out); return out;
}
const evalSol = (s) => Function(`return ${s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')}`)();
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

/* ------------------------------------------------ T6: Make the Target levels */
let served = 0;
for (const band of ['6-7', '8-10', '11-14']) for (let lv = 1; lv <= 5; lv++) for (let i = 0; i < 170; i++) {
  const p = G.levelPuzzle(band, lv, seeded(`lv${band}:${lv}:${i}`));
  const tag = `${band} L${lv} #${i}`;
  if (!p) { ok(false, `${tag}: a puzzle was found`); continue; }
  served++;
  const keys = G.TARGET_LEVELS[lv].ops, W = ways(p.nums, p.target, keys), all = [...W];
  ok(p.nums.length === (band === '6-7' ? 3 : 4) && p.ops === keys, `${tag}: sized by band, with the level's keys`);
  ok(evalSol(p.sol) === p.target && all.length > 0, `${tag}: ${p.nums} → ${p.target} is solved ("${p.sol}")`);
  ok(!p.nums.includes(p.target), `${tag}: the target is not one of the cards`);
  if (lv === 1) ok(keys === '+' && p.target === sum(p.nums), `${tag}: level 1 adds them all`);
  else ok(p.target !== sum(p.nums), `${tag}: level ${lv}: the target is never the plain sum (${p.nums} → ${p.target})`);
  if (lv === 2) ok(keys === '+−' && all.every((w) => w.includes('−')), `${tag}: level 2 needs a −`);
  if (lv === 3) ok(keys === '+−×' && all.every((w) => w.includes('×')) && all.some((w) => w.split('×').length === 2) && ways(p.nums, p.target, '+−').size === 0, `${tag}: level 3: + and − cannot, one × can (${all})`);
  if (lv === 4) ok(all.every((w) => w.includes('÷')) && ways(p.nums, p.target, '+−×').size === 0, `${tag}: level 4: ÷ needed (${all})`);
  if (lv === 5) ok(all.every((w) => w.includes('÷') && w.includes('×')) && ways(p.nums, p.target, '+−×').size === 0 && ways(p.nums, p.target, '+−÷').size === 0, `${tag}: level 5: × and ÷ both needed (${all})`);
  // the game's own list of ways is the same as the plain enumeration's (the second-way proof rests on it)
  if (i < 40) ok([...G.waysTo(p.nums, p.target, Object.fromEntries([...keys].map((o) => [o, F[o]])))].map(([w]) => w).sort().join() === all.sort().join(), `${tag}: waysTo lists every way`);
}
// Five numbers (paid): every card needed, + and − alone cannot
let fives = 0;
for (const band of ['6-7', '8-10', '11-14']) for (let i = 0; i < 100; i++) {
  const p = G.makePuzzle(band, seeded(`five-lv${band}${i}`), 'five'), n = p.nums.length, memo = new Map();
  ok(values(p.nums, '+−×÷', memo).has(p.target) && evalSol(p.sol) === p.target, `five ${band} #${i}: solved`);
  let spare = null;
  for (let m = 1; m < (1 << n) - 1 && !spare; m++) { const part = p.nums.filter((_, j) => m >> j & 1); if (values(part, '+−×÷', memo).has(p.target)) spare = part; }
  ok(!spare, `five ${band} #${i}: every card needed — ${spare} alone makes ${p.target} from ${p.nums}`);
  ok(!values(p.nums, '+−', memo).has(p.target), `five ${band} #${i}: + and − alone cannot make ${p.target} from ${p.nums}`);
  fives++;
}
// a hand with a spare card, a free ×1, or + and − only, is refused
ok(!G.fiveHolds([2, 3, 4, 6, 1], 24) && !G.fiveHolds([2, 3, 4, 6, 5], 20) && !G.fiveHolds([9, 8, 7, 6, 5], 35), 'Five numbers refuses a spare card, a free ×1 and a + and − sum');
// the round climbs: two a level below, then the level
ok([1, 2, 3, 4, 5].map((r) => G.targetRampLv(4, r)).join() === '3,3,4,4,4' && G.targetRampLv(1, 1) === 1, 'Target: a round of five, the first two one level below');
// the second way: a way is the multiset of operations used
ok(G.wayOf('(6 × 4) − (3 + 2)') === G.wayOf('(3 + 2) − (4 × 6)') && G.wayOf('6 × 4 + 1') !== G.wayOf('6 × 4 − 1'), 'a way is the multiset of operations');
ok(G.wayWords('++×') === 'one × and two +', `a way said in words (${G.wayWords('++×')})`);
// today's puzzle: two sizes from ONE seed, the same in every house
const d1 = G.dailyPuzzle(2, '2026-10-09'), d2 = G.dailyPuzzle(4, '2026-10-09');
ok(JSON.stringify(d1) === JSON.stringify(G.dailyPuzzle(2, '2026-10-09')) && JSON.stringify(d2) === JSON.stringify(G.dailyPuzzle(4, '2026-10-09')), "today's puzzle is the same puzzle every time it is dealt");
ok(d1.lv === 2 && d1.nums.length === 3 && d2.lv === 4 && d2.nums.length === 4 && G.targetHolds(2, d1.nums, d1.target) && G.targetHolds(4, d2.nums, d2.target), "today's puzzle comes in Level 2 and Level 4");
ok(JSON.stringify(G.dailyPuzzle(4, '2026-10-10')) !== JSON.stringify(d2), 'and tomorrow brings another');
for (let l = 1; l <= 5; l++) ok(/^Level \d · \S/.test(G.targetName(l)), `Target level ${l} is said in words (${G.targetName(l)})`);

/* ------------------------------------------------ T5: the level rule, as each game counts "right" */
{ // Target: a clean solve is right; a shown one is not
  const k = {}; setLevel(k, 'target', 3);
  let v = afterRound(k, 'target', G.targetRight(['clean', 'clean', 'shown', 'shown', 'shown']), G.TARGET_ROUNDS);
  ok(v.dropped && levelOf(k, 'target') === 2, 'Target: 2 of 5 clean (40%) drops a level');
  v = afterRound(k, 'target', G.targetRight(['clean', 'shown', 'clean', 'clean', 'shown']), G.TARGET_ROUNDS);
  ok(v.kept && levelOf(k, 'target') === 2, 'Target: 3 of 5 clean (60%) keeps it');
  ok(G.targetRight(['shown', 'shown', 'shown', 'shown', 'shown']) === 0, 'Target: a puzzle shown never counts');
}
{ // Number Line: right is within 5% of the line; a round of eight
  const k = {}; setLevel(k, 'line', 3);
  const errs = (n) => Array.from({ length: 8 }, (_, i) => (i < n ? 0.04 : 0.09));
  ok(G.lineRight(0.05) && !G.lineRight(0.0501), 'Number Line: within 5% of the range is right');
  let v = afterRound(k, 'line', errs(3).filter(G.lineRight).length, G.LINE_ROUNDS);
  ok(v.dropped && levelOf(k, 'line') === 2, 'Number Line: 3 of 8 (under half — 40% is not a whole placement) drops a level');
  v = afterRound(k, 'line', errs(5).filter(G.lineRight).length, G.LINE_ROUNDS);
  ok(v.kept && levelOf(k, 'line') === 2, 'Number Line: 5 of 8 (60% and over) keeps it');
}
{ // Cube Builder: right is a solve without Show me; a round of three
  const k = {}; setLevel(k, 'cubes', 4);
  let v = afterRound(k, 'cubes', 1, G.CUBE_ROUNDS); ok(v.dropped && levelOf(k, 'cubes') === 3, 'Cube Builder: 1 of 3 drops a level');
  v = afterRound(k, 'cubes', 2, G.CUBE_ROUNDS); ok(v.kept && levelOf(k, 'cubes') === 3, 'Cube Builder: 2 of 3 keeps it');
  v = afterRound(k, 'cubes', 3, G.CUBE_ROUNDS); ok(v.offer === 4 && levelOf(k, 'cubes') === 3, 'Cube Builder: 3 of 3 offers the next, never forces it');
}
// the games hand the rule what they counted, and nothing else
const src = readFileSync(new URL('../src/games.js', import.meta.url), 'utf8');
const body = (fn) => src.slice(src.indexOf(`export function ${fn}(`)).split(/\nexport function /)[0];
ok(/afterRound\(kid, 'target', targetRight\(results\), ROUNDS\)/.test(body('makeTarget')), 'Target hands the rule its clean solves');
ok(/results\.push\('shown'\)/.test(body('makeTarget')) && /results\.push\('clean'\)/.test(body('makeTarget')), 'Target records each puzzle as clean or shown');
ok(/afterRound\(kid, game, right, ROUNDS\)/.test(body('numberLine')) && /const ok = lineRight\(err\)/.test(body('numberLine')) && /onTick\(ok\)/.test(body('numberLine')), 'Number Line pays and counts the same "within 5%"');
ok(/afterRound\(kid, 'cubes', right, CUBE_ROUNDS\)/.test(body('cubeBuilder')), 'Cube Builder hands the rule its solves');

/* ------------------------------------------------ §3.2 Number Line: the ladder and the round ramp */
ok([0, 1, 2, 3, 4, 5, 6, 7].map(G.linePhase).join() === 'labelled,labelled,labelled,plain,plain,plain,none,none', 'Number Line: 1–3 labelled ticks, 4–6 bare ticks, 7–8 none');
const RANGE = { 1: '0–20', 2: '0–100', 3: '0–1000', 4: '0–1' };
for (const mode of [null, 'fractions', 'negatives']) for (let lv = 1; lv <= 5; lv++) for (const band of ['6-7', '8-10', '11-14']) {
  const r = seeded(`line:${mode}:${lv}:${band}`), ranges = new Set();
  for (let n = 0; n < 400; n++) {
    const i = n % 8, P = G.linePlacement(band, mode, lv, i, r), span = P.hi - P.lo, tag = `${mode || 'standard'} L${lv} ${band} #${n}`;
    ranges.add(P.range);
    ok(P.v > P.lo && P.v < P.hi && P.v !== (P.lo + P.hi) / 2, `${tag}: ${P.label} is a real point inside ${P.range}, not the middle`);
    if (!mode) ok(Math.abs(P.v - (P.lo + P.hi) / 2) >= span * 0.06 - 1e-9, `${tag}: a whole-line number is never within 6% of the middle`);
    if (i < 3) ok(P.drawn.length > 0 && P.drawn.every((t) => t.label) && !P.drawn.some((t) => Math.abs(t.v - P.v) < span * 0.02 - 1e-12), `${tag}: labelled ticks, none of them the answer`);
    else if (i < 6) ok(P.drawn.length > 0 && P.drawn.every((t) => !t.label), `${tag}: bare ticks`);
    else ok(P.drawn.length === 0, `${tag}: no ticks`);
    if (!mode && lv <= 4) ok(P.range === RANGE[lv], `${tag}: level ${lv} is ${RANGE[lv]} (${P.range})`);
    if (!mode && lv === 4) ok(/^0\.\d\d$/.test(P.label) && Math.abs(+P.label - P.v) < 1e-12, `${tag}: decimals in hundredths (${P.label})`);
    if (mode === 'negatives' && lv <= 2 && i < 3) ok(P.drawn.every((t) => t.v % 5 === 0) && P.drawn.length === (2 * P.hi) / 5 - 1, `${tag}: every fifth tick labelled`);
  }
  if (!mode && lv === 5) ok(ranges.size >= 3, `standard L5 ${band}: mixed lines (${[...ranges]})`);
}
for (let l = 1; l <= 5; l++) for (const m of [null, 'fractions', 'negatives']) ok(/^Level \d · \S/.test(G.lineName(m, l)), `Number Line ${m || 'standard'} level ${l} is said in words`);
{ // the best error per line is a record: it only ever gets better, and it is never a count of anything
  const k = {};
  let b = G.lineBest(k, 'line', '0–1000', 12); ok(b.isNew && b.best === 12, 'a first placement is the best on its line');
  b = G.lineBest(k, 'line', '0–1000', 30); ok(!b.isNew && b.best === 12, 'a worse one leaves the record');
  b = G.lineBest(k, 'line', '0–1000', 4); ok(b.isNew && b.best === 4, 'a better one replaces it');
  b = G.lineBest(k, 'line', '0–100', 9); ok(b.best === 9 && k.gameLv.line.err['0–1000'] === 4, 'each line keeps its own record');
  ok(!/streak/i.test(body('numberLine')), 'the record is never called a streak');
}

/* ------------------------------------------------ §3.3 Cube Builder: levels, and the bots */
ok([1, 2, 3].map((r) => G.cubeRampLv(5, r)).join() === '4,5,5' && G.cubeRampLv(1, 1) === 1, 'Cube Builder: a round climbs — the first puzzle one level below');
{ // the perfect bot builds the answer and solves every puzzle; the random bot almost never does
  let perfect = 0, randomHits = 0, tries = 0;
  for (let lv = 1; lv <= 5; lv++) for (let i = 0; i < C.BANK[lv].length; i++) {
    const p = C.cubePuzzle(lv, i);
    if (C.sameViews(C.viewsOf(p.answer, p.n), p.views) && C.count(p.answer) === p.min) perfect++;
    const r = seeded(`cube-rand${lv}:${i}`);
    for (let t = 0; t < 400; t++) {
      // the random bot: a random height (0…hmax) in every square, the way a masher on the pad would
      const h = Array.from({ length: p.n * p.n }, () => Math.floor(r() * (p.hmax + 1)));
      tries++; if (C.sameViews(C.viewsOf(h, p.n), p.views) && (!C.LEVELS[lv].fewestOnly || C.count(h) === p.min)) randomHits++;
    }
  }
  ok(perfect === 60, `the perfect bot solves all sixty puzzles with the fewest (${perfect})`);
  ok(randomHits / tries < 0.01, `the random bot solves under 1% (${randomHits}/${tries})`);
}
ok(C.LEVELS[4].n === 4 && C.BANK[4].every((h) => { const s = C.solve(C.viewsOf(h, 4)); return s.free.length === 1; }), 'level 4: a 4 × 4 floor, exactly one tower hidden');
ok(C.LEVELS[5].fewestOnly && /fewestOnly/.test(body('cubeBuilder')), 'level 5: the game accepts only the fewest');

console.log(`${fails ? 'FAIL' : 'ok'} levels-play — ${served} Target puzzles (levels 1–5) and ${fives} Five-numbers puzzles proved by an independent enumeration; the level rule in Target, Line and Cube Builder; the Line's ladder and ramp; Cube Builder's bots`);
if (fails) process.exit(1);
