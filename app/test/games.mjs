/* test/games.mjs — every Make-the-Target puzzle served is solvable, and the solver's
   own answer evaluates to the target. */
import { makePuzzle, solve } from '../src/games.js';
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
console.log(`${fails ? 'FAIL' : 'ok'} games — 750 puzzles solved and checked`);
if (fails) process.exit(1);
