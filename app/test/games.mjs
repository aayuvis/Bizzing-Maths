/* test/games.mjs — every Make-the-Target puzzle served is solvable, and the solver's
   own answer evaluates to the target. Then the Arcade's Family Standard §10 kit:
   every game has a title card and a three-step how-to, the combo moves only with
   right answers, and the combo can never reach a score, a wage or a star. */
import { readFileSync } from 'node:fs';
import { makePuzzle, solve, comboNext, HOWTO, INTRO_MS, rushSkill } from '../src/games.js';
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
console.log(`${fails ? 'FAIL' : 'ok'} games — 750 puzzles solved and checked; title cards, combo and finish screens`);
if (fails) process.exit(1);
