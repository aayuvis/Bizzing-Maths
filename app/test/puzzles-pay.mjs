/* puzzles-pay.mjs — the Puzzles tab and the Journey's duel, engine side (games spec §3.5, §3.6).
     T11  a Sudoku hint EXPLAINS and never fills: it returns a square and words, never the number;
          the grid is untouched; what it says each group holds never includes the answer, and the
          words never print it; every hint is sound (the one number left IS the solution's); a wrong
          number is pointed at first; hints alone walk every proved grid to its end; three per grid;
          XP is the squares the child placed.
     T12  the Tower pays a typed right at once, a picked right only once the next answer is right too
          (or, for the floor's last, once the floor is passed): a single lucky guess pays 0, and a
          masher picking at random earns far less than a child who knows.
     T13  the duel's rival answers by contest.js rivalGets — the same draw, the same seed — with a
          thinking time; rounds are won, not misses counted; first to two, never past five. */
import { makeSudoku, countSolutions, candidates, sudokuHint, sudokuXP, SUDOKU_HINTS, puzzlePay, puzzlePayEnd, floorSet, FLOOR_PASS } from '../src/puzzles.js';
import { rivalGets, bot, RIVALS, newContest } from '../src/contest.js';
import { newDuel, rivalTurn, settle, duelWon, duelH, DUEL_WIN, DUEL_MAX } from '../src/duel.js';
import { seeded } from '../src/rand.js';
import { readFileSync } from 'node:fs';

let fails = 0; const ok = (c, m) => { if (!c) { fails++; if (fails < 30) console.error('  ✗ ' + m); } else if (process.env.V) console.log('  ✓ ' + m); };
const code = (f) => readFileSync(new URL(f, import.meta.url), 'utf8');

/* ---------------------------------------------------------------- T11 */
const strip = (t) => t.replace(/\b(Row|row|column|Column) \d+/g, '');
const says = (t, v) => new RegExp(`(^|[^0-9])${v}([^0-9]|$)`).test(strip(t));
let grids = 0, hintsSeen = 0; const kinds = {};
for (const [n, reps] of [[4, 40], [6, 25], [9, 8]]) for (let i = 0; i < reps; i++) {
  const lv = 1 + (i % 3), p = makeSudoku(n, lv), cur = p.grid.slice(); grids++;
  ok(countSolutions(p.grid, n, 2) === 1, `${n}×${n} is still proved unique (rule 8)`);
  for (let step = 0; step < n * n && cur.some((v) => !v); step++) {
    const before = cur.join(','), h = sudokuHint(cur, n, p.solution, -1); hintsSeen++;
    ok(cur.join(',') === before, 'a hint never changes the grid');
    ok(h && !('ans' in h) && !('v' in h) && !('value' in h), 'a hint carries no number to place');
    ok(h && !cur[h.i], `the hint points at an empty square (${h && h.kind})`);
    kinds[h.kind] = (kinds[h.kind] || 0) + 1;
    const ans = p.solution[h.i];
    ok(!says(h.text, ans), `the words never print the answer: "${h.text}" (answer ${ans})`);
    ok(h.groups.every((x) => !x.has.includes(ans)), 'what each group already has never includes the answer');
    if (h.kind === 'single') {
      ok(JSON.stringify(candidates(cur, n, h.i)) === JSON.stringify([ans]), 'sound: the one number left is the solution’s');
      const all = new Set(h.groups.flatMap((x) => x.has));
      ok(all.size === n - 1 && h.groups.every((x) => x.has.every((v) => strip(h.text).includes(String(v)))), `it names every number the square cannot be (${[...all]})`);
    }
    cur[h.i] = ans;   // the child places it
  }
  ok(cur.join() === p.solution.join(), 'hints alone walk the grid to its end');
}
ok((kinds.single || 0) > (kinds.few || 0) * 10, `nearly every hint is "only one number fits" (${JSON.stringify(kinds)})`);
{ // a wrong number is pointed at first, and the hint does not fix it
  const p = makeSudoku(6, 1), cur = p.grid.slice(), i = cur.findIndex((v) => !v); cur[i] = (p.solution[i] % 6) + 1;
  const h = sudokuHint(cur, 6, p.solution, -1);
  ok(h.kind === 'wrong' && h.i === i && cur[i] !== p.solution[i] && !says(h.text, p.solution[i]), 'a wrong number is pointed at, not replaced');
}
{ // the selected square is preferred when it is the one forced
  const p = makeSudoku(4, 1), cur = p.grid.slice();
  const forced = cur.map((v, i) => (!v && candidates(cur, 4, i).length === 1 ? i : -1)).filter((i) => i >= 0);
  if (forced.length > 1) ok(sudokuHint(cur, 4, p.solution, forced.at(-1)).i === forced.at(-1), 'the hint explains the square the child is on, when it can');
}
ok(SUDOKU_HINTS === 3, 'three hints per grid');
ok(sudokuXP(8) === 8 && sudokuXP(50) === 50 && sudokuXP(0) === 0, 'XP is the squares placed, one each');
// the game keeps to it: the hint button is capped, the hint never writes cur[], XP comes from placed squares
const G = code('../src/games.js'), M = code('../src/main.js');
const hintFn = G.slice(G.indexOf('function hint()'), G.indexOf('function win()'));
ok(/hints >= SUDOKU_HINTS/.test(hintFn) && !/cur\[[^\]]+\]\s*=/.test(hintFn) && !/given\[[^\]]+\]\s*=/.test(hintFn), 'games.js: the hint is capped at three and writes no square');
ok(/tick\(k, true, sudokuXP\(placed\)\)/.test(M), 'main.js: a solved grid pays sudokuXP(placed)');

/* ---------------------------------------------------------------- T12 */
const pay = (seq, passed = false) => { const p = {}; let c = 0; for (const x of seq) c += puzzlePay(p, x); return c + puzzlePayEnd(p, passed); };
const MC = (right) => ({ mc: true, right }), TY = (right) => ({ mc: false, right });
ok(pay([MC(false), MC(true), MC(false)]) === 0, 'a single lucky pick between misses pays 0');
ok(pay([MC(false), MC(false), MC(true)], false) === 0, 'a single lucky pick at the end of a failed floor pays 0');
ok(pay([MC(true), TY(false)]) === 0, 'a pick followed by a miss pays 0');
ok(pay([TY(true)]) === 1 && pay([TY(true), TY(false), TY(true)]) === 2, 'a typed right pays at once');
ok(pay([MC(true), MC(true)], false) === 1 && pay([MC(true), MC(true)], true) === 2, 'a pick confirmed by the next right pays; the last waits for the floor');
ok(pay([MC(true), TY(true), MC(true), MC(true), TY(true), MC(true)], true) === 6, 'a child who knows is paid for all six');
{ // a masher on real floors: random picks, nothing typed right
  const r = seeded(7); let masher = 0, lucky = 0, knower = 0;
  for (let f = 1; f <= 400; f++) {
    const items = floorSet(1 + (f % 11), ['6-7', '8-10', '11-14'][f % 3], r);
    const seq = items.map((q) => (q.choices ? MC(q.choices[Math.floor(r() * q.choices.length)] === q.ans) : TY(false)));
    const right = seq.filter((x) => x.right).length;
    lucky += right; masher += pay(seq, right >= FLOOR_PASS); knower += pay(items.map((q) => ({ mc: !!q.choices, right: true })), true);
  }
  ok(masher < lucky * 0.45, `a masher's lucky rights mostly pay nothing (${masher} coins for ${lucky} lucky rights)`);
  ok(knower === 2400, `a child who knows is paid for every right (${knower})`);
}
ok(/puzzlePay\(run\.pay/.test(M) && /puzzlePayEnd\(/.test(M), 'main.js pays the Puzzles tab through puzzlePay');

/* ---------------------------------------------------------------- T13 */
for (const b of RIVALS) for (const band of ['6-7', '8-10', '11-14']) for (let s = 1; s <= 30; s++) {
  const d = newDuel(band, b.id), q = { lv: 1 + (s % 3) };
  const t = rivalTurn(d, q, seeded(s * 31 + band.length));
  const want = rivalGets(bot(b.id), { h: duelH(newContest(band, 1).start, q.lv), tag: null }, 1, newContest(band, 1).start, seeded(s * 31 + band.length));
  ok(t.right === want, `${b.name}: the rival's answer is rivalGets's (seed ${s})`);
  ok(t.think > 1000 && t.think < 30000, `${b.name}: a thinking time a child can see (${t.think} ms)`);
}
{ // stronger rivals get more right, by the contest's own rule
  const rate = (id) => { const r = seeded(id); let n = 0; for (let i = 0; i < 2000; i++) n += rivalTurn(newDuel('8-10', id), { lv: 1 }, r).right; return n / 2000; };
  ok(rate('goldlegend') > rate('pixel') + 0.15, `Vesper gets more right than Pip (${rate('goldlegend').toFixed(2)} vs ${rate('pixel').toFixed(2)})`);
}
{ // rounds are WON: the old score ("You right · rival misses") is gone
  const d = newDuel('8-10', 'samurai');
  ok(settle(d, { right: true, ms: 3000 }, { right: false, think: 5000 }) === 'you', 'you right, they wrong: yours');
  ok(settle(d, { right: true, ms: 9000 }, { right: true, think: 5000 }) === 'them', 'both right: the quicker takes it');
  ok(!d.over && d.you === 1 && d.them === 1, 'one each, play on');
  ok(settle(d, { right: false, ms: 9000 }, { right: false, think: 5000 }) === null && !d.over, 'both wrong: nobody, another question');
  ok(settle(d, { right: true, ms: 2000 }, { right: true, think: 5000 }) === 'you' && d.over && duelWon(d) && d.you === DUEL_WIN, 'first to two wins');
  const e = newDuel('8-10', 'pixel'); for (let i = 0; i < 9 && !e.over; i++) settle(e, { right: false, ms: 1 }, { right: false, think: 1 });
  ok(e.over && e.round === DUEL_MAX && !duelWon(e), 'never past five questions; level is not a win');
  const f = newDuel('8-10', 'pixel'); settle(f, { right: false, ms: 1 }, { right: true, think: 1 }); settle(f, { right: false, ms: 1 }, { right: true, think: 1 });
  ok(f.over && !duelWon(f) && f.them === 2, 'the rival can win it');
}
ok(/DU\.rivalTurn\(/.test(M) && /DU\.settle\(/.test(M) && !/You \$\{right\} · \$\{bot\(run\.rival\)\.name\} \$\{n - right\}/.test(M), 'main.js: the duel is played by duel.js, and the misses-as-score line is gone');
{ const D = code('../src/duel.js').replace(/\/\*[\s\S]*?\*\//g, ''); ok(/import \{[^}]*rivalGets[^}]*\} from '\.\/contest\.js'/.test(D) && (D.match(/rivalGets\(/g) || []).length === 1 && !/\br\(\) </.test(D), 'duel.js decides right or wrong only through contest.js rivalGets'); }

console.log(fails ? `FAIL puzzles-pay — ${fails}` : `ok puzzles-pay — ${grids} proved grids walked by ${hintsSeen} hints that never fill (${JSON.stringify(kinds)}), a lone pick pays 0, the rival answers by rivalGets`);
process.exit(fails ? 1 : 0);
