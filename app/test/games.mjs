/* test/games.mjs — every Make-the-Target puzzle served is solvable, and the solver's
   own answer evaluates to the target. Then the Arcade's Family Standard §10 kit:
   every game has a title card and a three-step how-to, the combo moves only with
   right answers, and the combo can never reach a score, a wage or a star. */
import { readFileSync } from 'node:fs';
import { makePuzzle, solve, comboNext, HOWTO, INTRO_MS, rushSkill, rushSpeed, RUSH_BASE, lineSpec, lineStep } from '../src/games.js';
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
for (const id of ['rush', 'target', 'line', 'sudoku']) {
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
for (const fn of ['numberRush', 'makeTarget', 'numberLine', 'sudoku']) {
  const body = src.slice(src.indexOf(`export function ${fn}(`)).split(/\nexport function /)[0];
  ok(/\bintro\(g, /.test(body), `${fn} opens on its title card`);
  ok(/resultCard\(g, \{[^]*?practised: \{ skill:/.test(body), `${fn} finishes on a screen naming what was practised`);
  ok(/\bpop\(g, /.test(body) && (/\bwobble\(g, /.test(body)), `${fn} moves something on a right answer AND on a wrong one`);
}
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
console.log(`${fails ? 'FAIL' : 'ok'} games — 750 puzzles solved and checked; title cards, combo and finish screens`);
if (fails) process.exit(1);
