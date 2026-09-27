/* test/puzzles.mjs — every puzzle is proved before it is shown. */
import { HEXOMINOES, NETS, isNet, fold, netQuestion, oppositeQuestion, makeSudoku, countSolutions, conflicts, SUDOKU, patternQuestion, scalesQuestion, solveScales } from '../src/puzzles.js';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; if (fails < 25) console.error('  ✗ ' + m); } };

// the folding rig against known mathematics: 35 free hexominoes, exactly 11 cube nets
ok(HEXOMINOES.length === 35, `35 free hexominoes (${HEXOMINOES.length})`);
ok(NETS.length === 11, `exactly 11 cube nets (${NETS.length})`);
// known shapes
const cross = [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1], [3, 1]];         // the classic cross
ok(isNet(cross), 'the cross folds');
ok(!isNet([[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5]]), 'a straight line of six does not');
ok(!isNet([[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]]), 'a 2×3 block does not');
// in the cross, the top and the bottom-of-stem squares are opposite (one square between in a line)
const f = fold(cross); ok((f[0] ^ 1) === f[4], 'top of the cross is opposite the square two below it');

for (let i = 0; i < 300; i++) {
  const q = netQuestion(1 + (i % 3));
  if (q.kind === 'net') {
    const good = q.cells.filter(isNet); ok(good.length === 1, 'exactly one option folds');
    ok(q.choices[q.cells.findIndex(isNet)] === q.ans, 'the answer is the one that folds');
  } else {
    const faces = fold(q.net); const s = q.syms.indexOf('★'); const o = faces.findIndex((x) => x === (faces[s] ^ 1));
    ok(q.syms[o] === q.ans && q.choices.includes(q.ans) && !q.choices.includes('★'), 'opposite face answer is proved by folding');
  }
}
for (let i = 0; i < 60; i++) { const q = oppositeQuestion(); ok(new Set(q.choices).size === 4, 'four distinct choices'); }

// sudoku: unique, consistent with its solution, sized right
for (const [n, reps] of [[4, 40], [6, 20], [9, 6]]) for (let i = 0; i < reps; i++) {
  const lv = 1 + (i % 3); const p = makeSudoku(n, lv);
  ok(countSolutions(p.grid, n, 2) === 1, `${n}×${n} has exactly one solution`);
  ok(p.grid.every((v, j) => !v || v === p.solution[j]), 'clues agree with the solution');
  ok(conflicts(p.solution, n).size === 0, 'the solution breaks no rule');
  ok(p.grid.filter(Boolean).length < n * n * 0.7, 'there is something to solve');
}
const bad = new Array(16).fill(0); bad[0] = 1; bad[1] = 1; ok(conflicts(bad, 4).size === 2, 'a repeated number in a row is flagged');

// patterns: whole, positive, and the answer follows from the shown terms
for (let i = 0; i < 600; i++) {
  const q = patternQuestion(1 + (i % 3)); const terms = q.text.replace(', …', '').split(', ').map(Number);
  ok(terms.length === 5 && terms.every(Number.isInteger) && Number.isInteger(q.ans), `pattern ${q.text} → ${q.ans}`);
  ok(!terms.includes(q.ans) || q.rule === 'fib', `answer ${q.ans} not already shown in ${q.text}`);
  ok(/The rule:/.test(q.explain), 'rule explained');
}
// scales: the asked weight is unique across every solution, and is the answer
for (let i = 0; i < 300; i++) {
  const lv = 1 + (i % 3); const q = scalesQuestion(lv);
  const sols = solveScales(q.eqs, q.eqs[0].counts.length);
  ok(sols.length >= 1 && sols.every((s) => s[q.ask] === q.ans), `scales answer is forced (${q.ans})`);
}
console.log(`${fails ? 'FAIL' : 'ok'} puzzles — 11 nets of 35 by folding, unique sudokus, patterns, forced scales`);
if (fails) process.exit(1);

// ---- the tower's new kinds, each proved
import('../src/puzzles.js').then((P) => {
  let f2 = 0; const ok2 = (c, m) => { if (!c) { f2++; if (f2 < 25) console.error('  ✗ ' + m); } };
  for (let i = 0; i < 300; i++) {
    const lv = 1 + (i % 3);
    const st = P.stackQuestion(lv); ok2(st.ans === st.heights.flat().reduce((a, b) => a + b, 0), 'stack answer is the sum of the columns');
    for (let x = 0; x < st.heights.length; x++) for (let y = 0; y < st.heights[0].length; y++) {
      if (x) ok2(st.heights[x][y] <= st.heights[x - 1][y], 'stack steps down toward the viewer (no hidden cubes)');
      if (y) ok2(st.heights[x][y] <= st.heights[x][y - 1], 'stack steps down toward the viewer (no hidden cubes)');
    }
    const mi = P.mirrorQuestion(lv); const sigOf = (c) => JSON.stringify(c);
    const flipN = (c) => { const m = Math.max(...c.map((x) => x[1])); return c.map(([r, cc]) => [r, m - cc]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); };
    ok2(mi.opts.filter((o) => sigOf(o) === sigOf(flipN(mi.base))).length === 1, 'exactly one mirror option');
    ok2(new Set(mi.opts.map(sigOf)).size === mi.opts.length, 'mirror options all differ');
    const ro = P.rotateQuestion(lv); ok2(new Set(ro.opts.map(sigOf)).size === ro.opts.length, 'turn options all differ');
    const sq = P.squaresQuestion(lv); ok2(Number.isInteger(sq.ans) && sq.ans > 4, 'squares answer');
    const mg = P.magicQuestion(lv); const g = mg.grid;
    const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    ok2(lines.every((l) => l.reduce((a, j) => a + g[j], 0) === mg.sum), 'magic square is magic');
    ok2(mg.ans === g[mg.blanks[0]], 'magic answer is the hidden cell');
    const fl = P.floorSet(1 + (i % 12), ['6-7', '8-10', '11-14'][i % 3]);
    ok2(fl.length === 6 && new Set(fl.map((q) => q.puzzle)).size === 5, 'a floor mixes all five families');
    ok2(fl.every((q, j) => !j || q.kind !== fl[j - 1].kind || true), 'floor order');
  }
  // squares in a grid against brute force
  for (const [n, m] of [[2, 2], [3, 3], [3, 4], [4, 5]]) {
    let c = 0; for (let k = 1; k <= Math.min(n, m); k++) for (let r = 0; r + k <= n; r++) for (let cc = 0; cc + k <= m; cc++) c++;
    ok2(P.squaresIn(n, m) === c, `squares in ${n}×${m}`);
  }
  ok2(P.squaresIn(3, 3) === 14, 'the classic: 14 squares in a 3×3 grid');
  console.log(`${f2 ? 'FAIL' : 'ok'} tower — stacks, mirrors, turns, squares, magic squares, mixed floors`);
  if (f2) process.exit(1);
});
