/* test/games.mjs — every Make-the-Target puzzle served is solvable, and the solver's
   own answer evaluates to the target. Then the Arcade's Family Standard §10 kit:
   every game has a title card and a three-step how-to, the combo moves only with
   right answers, and the combo can never reach a score, a wage or a star. */
import { readFileSync } from 'node:fs';
import { makePuzzle, solve, comboNext, HOWTO, INTRO_MS, rushSkill, rushSpeed, RUSH_BASE, lineSpec, lineStep } from '../src/games.js';
import * as G from '../src/games.js';
import { seeded } from '../src/rand.js';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; if (fails < 20) console.error('  ✗ ' + m); } };
for (const band of ['6-7', '8-10', '11-14']) for (let i = 0; i < 250; i++) {
  const p = makePuzzle(band, seeded(band + i));
  ok(p.nums.length === (band === '6-7' ? 3 : 4), 'size by band');
  const v = Function(`return ${p.sol.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')}`)();
  ok(v === p.target, `${p.nums} → ${p.target}: "${p.sol}" = ${v}`);
  const used = p.sol.match(/\d+/g).map(Number).sort((a, b) => a - b).join();
  ok(used === p.nums.slice().sort((a, b) => a - b).join(), `solution uses every number once: ${p.sol} vs ${p.nums}`);
  if (band === '6-7') ok(!/[×÷]/.test(p.sol) || solve(p.nums, p.target), 'young puzzles solvable');
}
ok(solve([1, 1, 1, 1], 24) === null, 'impossible stays impossible');

// §10: a title card and a three-second how-to for every game
for (const id of ['rush', 'target', 'line', 'sudoku', 'cubes']) {
  const h = HOWTO[id];
  ok(h && h.practises && h.practises.length > 8, `${id}: the title card says what it practises`);
  ok(h && h.steps.length === 3 && h.steps.every(([ic, t]) => ic && t.length > 10 && t.length < 60), `${id}: three short how-to steps`);
}
ok(INTRO_MS === 3000, 'the how-to lasts three seconds');
// the combo rewards accuracy: right answers climb it, ANY miss returns it to nought
let c = 0; for (const r of [true, true, true]) c = comboNext(c, r);
ok(c === 3, 'three right is a combo of three');
ok(comboNext(c, false) === 0 && comboNext(0, false) === 0, 'a miss resets the combo, never below nought');
ok(rushSkill(['×', '÷']) === 'times tables and division facts, at speed', 'the finish screen names the facts practised: ' + rushSkill(['×', '÷']));
ok(rushSkill(['+', '-']) === 'adding facts and taking-away facts, at speed', 'young bands name adding and taking away');
// structural: the combo is display only. No call that pays (onTick, onEnd, onSolve)
// may mention it, and every game opens on intro() and closes on resultCard(practised).
const src = readFileSync(new URL('../src/games.js', import.meta.url), 'utf8');
const pays = src.match(/\bon(Tick|End|Solve)\([^;]*/g) || [];
ok(pays.length >= 8, `found the paying calls (${pays.length})`);
for (const p of pays) ok(!/combo/.test(p), `a paying call mentions the combo: ${p}`);
for (const fn of ['numberRush', 'makeTarget', 'numberLine', 'sudoku', 'cubeBuilder']) {
  const body = src.slice(src.indexOf(`export function ${fn}(`)).split(/\nexport function /)[0];
  ok(/\bintro\(g, /.test(body), `${fn} opens on its title card`);
  ok(/resultCard\(g, \{[^]*?practised: \{ skill:/.test(body), `${fn} finishes on a screen naming what was practised`);
  ok(/\bpop\(g, /.test(body) && (/\bwobble\(g, /.test(body)), `${fn} moves something on a right answer AND on a wrong one`);
}

/* ------------------------------------------------------------ Cube Builder (rule 8)
   Every puzzle in the bank is PROVED: the views are measured from its stack, cubes.js's
   solver finds every stack those views allow, and a second, plain brute force here — every
   height 0…hmax in every square, no pruning, no reasoning about bounds — must find exactly
   the same number of stacks, the same fewest and the same most. The stack the bank holds is
   a fewest one, and the level's promise holds. */
const C = await import('../src/cubes.js');
function brute(v, hmax) {
  // plain enumeration of every stack; the views are compared by hand in loops (not viewsOf) so
  // that this proof shares no code with the thing it proves, and so 2 million stacks take a moment
  const n = v.n, N = n * n, h = new Array(N).fill(0), top = v.top, front = v.front, side = v.side;
  const fits = () => {
    for (let i = 0; i < N; i++) if ((h[i] > 0 ? 1 : 0) !== top[i]) return false;
    for (let c = 0; c < n; c++) { let m = 0; for (let r = 0; r < n; r++) if (h[r * n + c] > m) m = h[r * n + c]; if (m !== front[c]) return false; }
    for (let r = 0; r < n; r++) { let m = 0; for (let c = 0; c < n; c++) if (h[r * n + c] > m) m = h[r * n + c]; if (m !== side[r]) return false; }
    return true;
  };
  let ways = 0, min = Infinity, max = -Infinity, nmin = 0;
  for (;;) {
    if (fits()) {
      let s = 0; for (let i = 0; i < N; i++) s += h[i];
      ways++; if (s > max) max = s; if (s < min) { min = s; nmin = 1; } else if (s === min) nmin++;
    }
    let i = 0; while (i < N && h[i] === hmax) h[i++] = 0;
    if (i === N) break;
    h[i]++;
  }
  return { ways, min, max, nmin };
}
const waysBy = {};
let proved = 0;
for (const lv of [1, 2, 3]) {
  const L = C.LEVELS[lv], bank = C.BANK[lv];
  ok(bank.length >= 10, `cubes level ${lv}: a bank of at least ten (${bank.length})`);
  ok(new Set(bank.map((h) => JSON.stringify(C.viewsOf(h, L.n)))).size === bank.length, `cubes level ${lv}: no two puzzles share their views`);
  waysBy[lv] = [];
  for (let i = 0; i < bank.length; i++) {
    const p = C.cubePuzzle(lv, i), s = C.solve(p.views), b = brute(p.views, L.hmax);
    const tag = `cubes L${lv} #${i} ${JSON.stringify(p.answer)}`;
    ok(p.answer.length === L.n * L.n && p.answer.every((x) => Number.isInteger(x) && x >= 0 && x <= L.hmax), `${tag}: a ${L.n}×${L.n} stack no taller than ${L.hmax}`);
    ok(C.sameViews(C.viewsOf(p.answer, L.n), p.views), `${tag}: the bank's stack has the puzzle's views`);
    ok(s.ways >= 1 && s.ways === b.ways, `${tag}: the solver and the brute force agree on how many stacks fit (${s.ways} vs ${b.ways})`);
    ok(s.min === b.min && s.max === b.max && s.mins.length === b.nmin, `${tag}: …and on the fewest and the most (${s.min}/${s.max}/${s.mins.length} vs ${b.min}/${b.max}/${b.nmin})`);
    ok(p.min === b.min && C.count(p.answer) === b.min, `${tag}: the fewest cubes the game claims (${p.min}) is the fewest the search finds (${b.min})`);
    ok(s.mins.some((m) => m.join() === p.answer.join()), `${tag}: the stack "Show me" builds is one of the fewest`);
    ok(C.levelHolds(lv, s), `${tag}: level ${lv}'s promise holds (${s.ways} ways, ${s.min}–${s.max} cubes, ${s.mins.length} fewest)`);
    for (const m of s.mins) ok(C.sameViews(C.viewsOf(m, L.n), p.views), `${tag}: every fewest stack the solver returns really has the views`);
    waysBy[lv].push(b.ways); proved++;
  }
}
// difficulty is trickiness, not size: every level-2 puzzle leaves more open than any level-1, and so on
ok(Math.max(...waysBy[1]) < Math.min(...waysBy[2]) && Math.max(...waysBy[2]) < Math.min(...waysBy[3]), `cubes: each level leaves strictly more stacks open than the one before (${[1, 2, 3].map((l) => `${Math.min(...waysBy[l])}–${Math.max(...waysBy[l])}`).join(' | ')})`);
ok(new Set([1, 2, 3].map((l) => C.LEVELS[l].n)).size === 1, 'cubes: the grid is the same size at every level — the ramp is trickiness');
ok(C.bandLevel('6-7') === 1 && C.bandLevel('8-10') === 2 && C.bandLevel('11-14') === 3, 'cubes: the level follows the age band');
// views no stack can have are refused, not served
ok(C.solve({ n: 3, front: [2, 0, 1], side: [1, 2, 0], top: [1, 1, 0, 0, 0, 0, 0, 0, 0] }).ways === 0, 'cubes: a top view with a square where the front shows nothing has no stack');
ok(C.solve({ n: 3, front: [3, 1, 1], side: [1, 1, 1], top: [1, 0, 0, 0, 1, 0, 0, 0, 1] }).ways === 0, 'cubes: a front peak no row can reach has no stack');
ok(G.cubeStars(9) === 3 && G.cubeStars(8) === 3 && G.cubeStars(7) === 2 && G.cubeStars(5) === 2 && G.cubeStars(4) === 1 && G.cubeStars(1) === 0, 'cubes: finish stars from the round\'s stars');
ok(G.CUBE_ROUNDS * 3 === 9, 'cubes: three puzzles, three stars each');

/* one place decides what play is worth (model.js payout): main.js's play() pays every game
   through it — Cube Builder included — and never calls tick() itself; the daily puzzle too */
const { WAGE, payout, newKid } = await import('../src/model.js');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const playFn = main.slice(main.indexOf('function play(arg'), main.indexOf('\n}\n', main.indexOf('function play(arg')));
const calls = playFn.split('\n').filter((l) => /\bG\.\w+\(/.test(l));
ok(calls.length === 4 && ['numberRush', 'makeTarget', 'numberLine', 'cubeBuilder'].every((fn) => calls.some((l) => l.includes(`G.${fn}(`))), `play() starts the four Arcade games (${calls.length})`);
for (const l of calls) ok((l.match(/\bpayout\(k, arg, /g) || []).length === 1 && !/\btick\(/.test(l), `a game is paid through payout(), once, and never by tick() directly: ${l.trim().slice(0, 60)}`);
ok(/G\.makeTarget\(k, \{ daily: true, onSolve: \(\) => \{ payout\(k, 'daily', true\)/.test(main), "the daily puzzle is paid through payout('daily')");
ok(WAGE.cubes === 5 && WAGE.target === 5 && WAGE.rush === 1 && WAGE.line === 1 && WAGE.daily === 10, `the wage table (${JSON.stringify(WAGE)})`);
{ const a = newKid('W', '8-10', 'cubebot'); payout(a, 'cubes', true); payout(a, 'cubes', false); ok(a.xp === WAGE.cubes, `a solved Cube Builder puzzle pays ${WAGE.cubes} xp and a shown one pays nothing (${a.xp})`);
  let threw = false; try { payout(a, 'nosuch', true); } catch { threw = true; } ok(threw, 'a game with no wage cannot be paid by accident'); }
const cb = src.slice(src.indexOf('export function cubeBuilder(')).split(/\nexport function /)[0];
ok((cb.match(/\bonTick\((true|false)\)/g) || []).length === 2 && !/onTick\([^)]*(score|stars|combo)/.test(cb), 'Cube Builder pays per puzzle — true when solved, false when shown — never by score or stars');
// keyboard AND touch drive the SAME function: every key and every tap goes through act()
const keyBody = cb.slice(cb.indexOf('g.key = (e) =>'), cb.indexOf('next();\n  }', cb.indexOf('g.key = (e) =>')));
ok((keyBody.match(/\bact\(/g) || []).length >= 8 && !/\bh\[/.test(keyBody), 'Cube Builder: every key calls act(), and no key touches the build itself');
ok(/data-i[^]*?onclick = \(\) => act\('sel'/.test(cb) && /data-a[^]*?onclick = \(\) => act\(b\.dataset\.a/.test(cb), 'Cube Builder: every tap calls act() too');

// G8 (audit v4): difficulty ramps INSIDE a game, gently and fairly
{ ok(rushSpeed(0, 0) === RUSH_BASE, 'Number Rush starts at its base speed');
  let prev = rushSpeed(3, 0);
  for (let st = 1; st <= 20; st++) { const v = rushSpeed(3, st); ok(v >= prev && v / prev <= 1.05, `fall speed rises gently with the streak (${st}: ×${(v / prev).toFixed(3)})`); prev = v; }
  ok(rushSpeed(3, 10) > rushSpeed(3, 0), 'a streak really does speed the sky up');
  ok(rushSpeed(3, 99) === rushSpeed(3, 10) && rushSpeed(3, 10) / rushSpeed(3, 0) <= 1.3 + 1e-9, 'the streak adds at most 30%');
  ok(rushSpeed(999, 999) <= RUSH_BASE * 2 * 1.3 + 1e-12, 'never more than 2.6× the start, however long the game');
  ok(rushSpeed(12, 0) < rushSpeed(12, 6), 'a landing (streak back to nought) gives the slower sky back');
  for (const band of ['6-7', '8-10', '11-14']) for (const mode of [null, 'negatives']) {
    const w = [0, 1, 2].map((s) => lineSpec(band, mode, s)), span = (x) => x.hi - x.lo;
    ok(span(w[0]) < span(w[2]) && span(w[0]) <= span(w[1]) && span(w[1]) <= span(w[2]), `${band}/${mode}: the line widens step by step (${w.map(span)})`);
    ok(span(w[0]) === span(lineSpec(band, mode)), `${band}/${mode}: it starts on the band's own line, unchanged`);
    for (const x of w) for (let i = 0; i < 60; i++) { const p = x.pick(seeded(band + mode + i)); ok(p.v > x.lo && p.v < x.hi && p.v !== (x.lo + x.hi) / 2, `${band}: every target is a real point inside its line`); }
  }
  const steps = [0, 1, 2, 3, 4, 5, 8].map(lineStep);
  ok(steps.join() === '0,0,1,1,2,2,2', `the line widens only after correct (close) answers, two at a time (${steps})`);
  ok(steps.every((v, i) => !i || v >= steps[i - 1]), 'it never narrows');
  const src2 = readFileSync(new URL('../src/games.js', import.meta.url), 'utf8');
  ok(/close\.length/.test(src2.slice(src2.indexOf('const widen'), src2.indexOf('const widen') + 200)), 'the Number Line game widens from its close answers');
  ok(/speed = rushSpeed\(score, streak\)/.test(src2), 'Number Rush sets its speed from rushSpeed'); }

console.log(`${fails ? 'FAIL' : 'ok'} games — 750 puzzles solved and checked; ${proved} Cube Builder puzzles proved by solver AND brute force; one wage path; Rush and Line ramp gently inside a game; title cards, combo and finish screens`);
if (fails) process.exit(1);
