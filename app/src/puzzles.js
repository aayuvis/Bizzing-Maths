/* puzzles.js — the Puzzle Room. Reasoning, not arithmetic speed.

   Contest maths (Kangaroo, olympiads, gifted tests) is mostly this: see the
   shape, find the rule, hold two facts at once. Four kinds, every one
   GENERATED and every one PROVED before it is shown:

     Cube nets  — which flat shape folds into a cube, and which faces end up
                  opposite. Proved by folding: the net is rolled across the
                  grid as a real cube would roll, and a shape is a net only if
                  its six squares land on six different faces.
     Sudoku     — 4×4, 6×6, 9×9. Proved unique: clues are removed one at a
                  time and only while a solver still finds exactly one answer.
     Patterns   — what comes next, from a named rule; the rule is shown after.
     Scales     — balance puzzles with hidden weights; the asked-for weight is
                  proved unique by trying every possibility.

   No puzzle here has an answer that depends on how a model or a person
   happened to draw it. */

import { int, pick, shuffle } from './rand.js';

/* ================================================================ cube nets */

/* Faces 0–5, with opposite pairs (0,1) (2,3) (4,5): opp(f) = f ^ 1.
   State of a rolling cube = which face is down, which faces north, which
   faces east. Rolling onto a neighbouring square tips it over that edge. */
const opp = (f) => f ^ 1;
function roll(s, dir) {
  const { d, n, e } = s;
  if (dir === 'E') return { d: e, n, e: opp(d) };
  if (dir === 'W') return { d: opp(e), n, e: d };
  if (dir === 'S') return { d: opp(n), n: d, e };
  return { d: n, n: opp(d), e };           // 'N'
}

/* Fold a set of cells. Returns face-per-cell, or null if two squares would
   land on the same face (so it is not a net). */
export function fold(cells) {
  const key = (r, c) => r + ',' + c;
  const set = new Set(cells.map(([r, c]) => key(r, c)));
  const face = new Map([[key(...cells[0]), { d: 0, n: 2, e: 4 }]]);
  const q = [cells[0]];
  while (q.length) {
    const [r, c] = q.shift(); const s = face.get(key(r, c));
    for (const [dr, dc, dir] of [[0, 1, 'E'], [0, -1, 'W'], [1, 0, 'S'], [-1, 0, 'N']]) {
      const k = key(r + dr, c + dc);
      if (set.has(k) && !face.has(k)) { face.set(k, roll(s, dir)); q.push([r + dr, c + dc]); }
    }
  }
  if (face.size !== cells.length) return null;           // not connected
  const downs = cells.map(([r, c]) => face.get(key(r, c)).d);
  return new Set(downs).size === 6 && cells.length === 6 ? downs : null;
}
export const isNet = (cells) => !!fold(cells);

const norm = (cells) => {
  const r0 = Math.min(...cells.map((x) => x[0])), c0 = Math.min(...cells.map((x) => x[1]));
  return cells.map(([r, c]) => [r - r0, c - c0]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
};
const sig = (cells) => norm(cells).map((x) => x.join(',')).join(';');
const rot = (cells) => cells.map(([r, c]) => [c, -r]);
const flip = (cells) => cells.map(([r, c]) => [r, -c]);
function variants(cells) {
  const out = []; let x = cells;
  for (let i = 0; i < 4; i++) { out.push(norm(x), norm(flip(x))); x = rot(x); }
  return out;
}
const canon = (cells) => variants(cells).map(sig).sort()[0];

/* Every free hexomino (35 of them), grown square by square. */
export const HEXOMINOES = (() => {
  let level = new Map([[sig([[0, 0]]), [[0, 0]]]]);
  for (let n = 1; n < 6; n++) {
    const next = new Map();
    for (const cells of level.values()) {
      for (const [r, c] of cells) for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const cell = [r + dr, c + dc];
        if (cells.some((x) => x[0] === cell[0] && x[1] === cell[1])) continue;
        const grown = norm([...cells, cell]); const k = canon(grown);
        if (!next.has(k)) next.set(k, grown);
      }
    }
    level = next;
  }
  return [...level.values()];
})();
export const NETS = HEXOMINOES.filter(isNet);            // the famous eleven

const orient = (cells) => pick(variants(cells));

export const SYMBOLS = ['★', '●', '▲', '■', '♥', '◆'];

export function netQuestion(lv = 1) {
  if (lv >= 2 && Math.random() < 0.5) return oppositeQuestion(lv);
  const good = orient(pick(NETS));
  const bad = shuffle(HEXOMINOES.filter((h) => !isNet(h))).slice(0, lv === 1 ? 2 : 3).map(orient);
  const opts = shuffle([good, ...bad]);
  const letters = ['A', 'B', 'C', 'D'].slice(0, opts.length);
  const ans = letters[opts.indexOf(good)];
  return {
    kind: 'net', text: 'Which of these folds up into a cube?', choices: letters, ans,
    choiceHtml: opts.map((o) => netSVG(o)),
    explain: 'Picture it rolling: each square tips over onto the next. A net works only if all six squares land on six different faces — the others put two squares on the same face and leave a hole.',
    cells: opts,
  };
}

export function oppositeQuestion() {
  const net = orient(pick(NETS));
  const faces = fold(net);
  const syms = shuffle(SYMBOLS);
  const star = syms.indexOf('★');
  const oppIdx = faces.findIndex((f) => f === opp(faces[star]));
  const ans = syms[oppIdx];
  const others = shuffle(syms.filter((s, i) => i !== star && i !== oppIdx)).slice(0, 3);
  const choices = shuffle([ans, ...others]);
  return {
    kind: 'opposite', text: 'Fold it into a cube. Which symbol ends up opposite the ★?',
    html: netSVG(net, syms), choices, ans,
    explain: 'Two squares in a straight line with exactly one square between them always end up opposite each other. Find the line of three with ★ at one end.',
    net, syms,
  };
}

export function netSVG(cells, syms) {
  const u = 26, W = (Math.max(...cells.map((c) => c[1])) + 1) * u, H = (Math.max(...cells.map((c) => c[0])) + 1) * u;
  return `<svg class="net" viewBox="-2 -2 ${W + 4} ${H + 4}" width="${W + 4}" height="${H + 4}" aria-hidden="true">${cells.map(([r, c], i) =>
    `<rect x="${c * u}" y="${r * u}" width="${u}" height="${u}" rx="2" class="nc"/>${syms ? `<text x="${c * u + u / 2}" y="${r * u + u / 2 + 6}" class="ns${syms[i] === '★' ? ' star' : ''}">${syms[i]}</text>` : ''}`).join('')}</svg>`;
}

/* ================================================================ sudoku */

export const SUDOKU = { 4: { br: 2, bc: 2 }, 6: { br: 2, bc: 3 }, 9: { br: 3, bc: 3 } };

export function candidates(g, n, i) {
  const { br, bc } = SUDOKU[n]; const r = Math.floor(i / n), c = i % n;
  const used = new Set();
  for (let k = 0; k < n; k++) { used.add(g[r * n + k]); used.add(g[k * n + c]); }
  const r0 = r - (r % br), c0 = c - (c % bc);
  for (let a = 0; a < br; a++) for (let b = 0; b < bc; b++) used.add(g[(r0 + a) * n + c0 + b]);
  const out = []; for (let v = 1; v <= n; v++) if (!used.has(v)) out.push(v);
  return out;
}

/* Count solutions, stopping at `limit`. Fills the most-constrained cell first. */
export function countSolutions(g0, n, limit = 2) {
  const g = g0.slice(); let count = 0;
  (function go() {
    if (count >= limit) return;
    let best = -1, bc = null;
    for (let i = 0; i < n * n; i++) if (!g[i]) { const c = candidates(g, n, i); if (!bc || c.length < bc.length) { best = i; bc = c; if (c.length <= 1) break; } }
    if (best < 0) { count++; return; }
    for (const v of bc) { g[best] = v; go(); if (count >= limit) break; }
    g[best] = 0;
  })();
  return count;
}

function fillGrid(n) {
  const g = new Array(n * n).fill(0);
  (function go(i) {
    if (i === n * n) return true;
    for (const v of shuffle(candidates(g, n, i))) { g[i] = v; if (go(i + 1)) return true; }
    g[i] = 0; return false;
  })(0);
  return g;
}

/* Clues left by level: fewer clues is harder. */
const CLUES = { 4: [8, 6, 5], 6: [18, 15, 13], 9: [38, 32, 28] };

export function makeSudoku(n, lv = 1) {
  const solution = fillGrid(n);
  const grid = solution.slice();
  const target = CLUES[n][Math.min(2, lv - 1)];
  let filled = n * n;
  for (const i of shuffle([...Array(n * n).keys()])) {
    if (filled <= target) break;
    const keep = grid[i]; grid[i] = 0;
    if (countSolutions(grid, n, 2) !== 1) grid[i] = keep; else filled--;
  }
  return { n, grid, solution };
}

/* Which filled cells break a rule right now — shown in red. This is the rule,
   not the answer: a cell that is wrong but breaks no rule yet is not flagged. */
export function conflicts(g, n) {
  const bad = new Set(); const { br, bc } = SUDOKU[n];
  const groups = [];
  for (let r = 0; r < n; r++) groups.push([...Array(n).keys()].map((c) => r * n + c));
  for (let c = 0; c < n; c++) groups.push([...Array(n).keys()].map((r) => r * n + c));
  for (let r0 = 0; r0 < n; r0 += br) for (let c0 = 0; c0 < n; c0 += bc) {
    const g1 = []; for (let a = 0; a < br; a++) for (let b = 0; b < bc; b++) g1.push((r0 + a) * n + c0 + b); groups.push(g1);
  }
  for (const grp of groups) {
    const seen = new Map();
    for (const i of grp) if (g[i]) { if (seen.has(g[i])) { bad.add(i); bad.add(seen.get(g[i])); } else seen.set(g[i], i); }
  }
  return bad;
}

/* ================================================================ patterns */

const RULES = [
  { band: 0, name: 'add', make: (r) => { const a = int(1, 20, r), d = int(2, 9, r); return { seq: (i) => a + d * i, rule: `add ${d} each time` }; } },
  { band: 0, name: 'sub', make: (r) => { const d = int(2, 7, r), a = d * 7 + int(5, 30, r); return { seq: (i) => a - d * i, rule: `take away ${d} each time` }; } },
  { band: 0, name: 'double', make: (r) => { const a = int(1, 5, r); return { seq: (i) => a * 2 ** i, rule: 'double each time' }; } },
  { band: 1, name: 'grow', make: (r) => { const a = int(1, 10, r); return { seq: (i) => a + (i * (i + 1)) / 2, rule: 'add 1, then 2, then 3… one more each time' }; } },
  { band: 1, name: 'squares', make: (r) => { const s = int(1, 4, r); return { seq: (i) => (i + s) ** 2, rule: 'square numbers: each is a number times itself' }; } },
  { band: 1, name: 'fib', make: (r) => { const a = int(1, 4, r), b = int(a, 6, r); const f = [a, b]; for (let i = 2; i < 8; i++) f.push(f[i - 1] + f[i - 2]); return { seq: (i) => f[i], rule: 'each number is the two before it added together' }; } },
  { band: 1, name: 'triple', make: (r) => { const a = int(1, 3, r); return { seq: (i) => a * 3 ** i, rule: 'multiply by 3 each time' }; } },
  { band: 2, name: 'alt', make: (r) => { const p = int(2, 5, r), a = int(1, 6, r); const f = [a]; for (let i = 1; i < 8; i++) f.push(i % 2 ? f[i - 1] + p : f[i - 1] * 2); return { seq: (i) => f[i], rule: `two steps taking turns: add ${p}, then double` }; } },
  { band: 2, name: 'cubes', make: (r) => { const s = int(1, 3, r); return { seq: (i) => (i + s) ** 3, rule: 'cube numbers: a number times itself times itself' }; } },
  { band: 2, name: 'primes', make: (r) => { const P = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43]; const s = int(0, 5, r); return { seq: (i) => P[i + s], rule: 'prime numbers: each can only be divided by 1 and itself' }; } },
  { band: 2, name: 'tri', make: () => ({ seq: (i) => ((i + 1) * (i + 2)) / 2, rule: 'triangle numbers: 1, then 1+2, then 1+2+3…' }) },
  { band: 2, name: 'dsq', make: (r) => { const s = int(1, 5, r); return { seq: (i) => (i + s) ** 2 + (i + s), rule: 'a number times the next number: 2×3, 3×4, 4×5…' }; } },
];

export function patternQuestion(lv = 1, r = Math.random) {
  const pool = RULES.filter((x) => x.band <= lv - 1);
  for (let t = 0; t < 50; t++) {
    const rule = pick(pool, r); const { seq, rule: why } = rule.make(r);
    const shown = [0, 1, 2, 3, 4].map(seq), next = seq(5);
    if (!shown.every((v) => Number.isInteger(v) && v >= 0) || next < 0 || next > 9999) continue;
    return { kind: 'pattern', rule: rule.name, text: shown.join(', ') + ', …', say: shown.join(', '), ans: next,
      explain: `The rule: ${why}. So the next one is ${next}.`, html: `<p class="pz-ask">What comes next?</p>` };
  }
  return patternQuestion(1, r);
}

/* ================================================================ scales */

const SHAPES = [
  { k: 'tri', s: '▲', c: 'var(--fix)' },
  { k: 'cir', s: '●', c: 'var(--action)' },
  { k: 'sq', s: '■', c: 'var(--mastered)' },
];

/* Every assignment of weights 1..12 that satisfies all the scales. */
export function solveScales(eqs, nShapes) {
  const sols = [];
  const w = new Array(nShapes).fill(1);
  (function go(i) {
    if (i === nShapes) { if (eqs.every((e) => e.counts.reduce((s, c, j) => s + c * w[j], 0) === e.total)) sols.push(w.slice()); return; }
    for (let v = 1; v <= 12; v++) { w[i] = v; go(i + 1); }
  })(0);
  return sols;
}

export function scalesQuestion(lv = 1, r = Math.random) {
  const n = lv === 1 ? 2 : 3;
  for (let t = 0; t < 400; t++) {
    const w = Array.from({ length: n }, () => int(1, 9, r));
    const eqs = [];
    const neq = n === 2 ? 2 : lv === 2 ? 3 : 3;
    for (let e = 0; e < neq; e++) {
      const counts = Array.from({ length: n }, () => int(0, lv === 1 ? 3 : 3, r));
      if (counts.reduce((a, b) => a + b, 0) < 1) continue;
      eqs.push({ counts, total: counts.reduce((s, c, j) => s + c * w[j], 0) });
    }
    if (eqs.length < 2) continue;
    const ask = int(0, n - 1, r);
    const sols = solveScales(eqs, n);
    if (!sols.length || new Set(sols.map((s) => s[ask])).size !== 1) continue;
    // every scale must matter: drop the puzzle if one scale alone gives it away
    if (lv > 1 && eqs.some((e) => e.counts[ask] && e.counts.every((c, j) => j === ask || !c))) continue;
    const sh = SHAPES.slice(0, n);
    return {
      kind: 'scales', text: `How much does one ${sh[ask].s} weigh?`, ans: w[ask], eqs, ask,
      html: `<div class="scales">${eqs.map((e) => scaleSVG(e, sh)).join('')}</div>`,
      explain: `Use one scale to swap shapes for numbers in another. Here ${sh.map((s, j) => `${s.s} = ${w[j]}`).join(', ')}.`,
    };
  }
  return scalesQuestion(1, r);
}

function scaleSVG(e, sh) {
  const items = e.counts.flatMap((c, j) => Array(c).fill(sh[j]));
  return `<div class="scale"><div class="pan left">${items.map((s) => `<span style="color:${s.c}">${s.s}</span>`).join('')}</div><div class="beam"></div><div class="pan right"><b class="mono">${e.total}</b></div></div>`;
}

/* ================================================================ more space */

/* Cube stacks: count every cube. The stack only ever steps DOWN towards the
   viewer, so every column's top is in sight and no cube can hide behind
   another — the answer is fixed by the drawing, not by a guess about the back. */
export function stackQuestion(lv = 1, r = Math.random) {
  const W = lv === 1 ? 2 : 3, D = lv === 3 ? 3 : 2, maxH = lv === 1 ? 2 : 3;
  const h = [];
  for (let x = 0; x < W; x++) { h.push([]); for (let y = 0; y < D; y++) {
    const cap = Math.min(x ? h[x - 1][y] : maxH, y ? h[x][y - 1] : maxH);
    h[x].push(int(x === 0 && y === 0 ? 1 : 0, cap, r));
  } }
  const total = h.flat().reduce((a, b) => a + b, 0);
  if (total < 3) return stackQuestion(lv, r);
  return { kind: 'stack', text: 'How many cubes are in this stack?', ans: total, heights: h,
    html: stackSVG(h), explain: `Count column by column, top to bottom: ${h.flat().filter(Boolean).join(' + ')} = ${total}. Every cube is resting on the floor or on another cube.` };
}

export function stackSVG(h) {
  const s = 26, c = 0.866;
  const P = (x, y, z) => [(x - y) * s * c, (x + y) * s * 0.5 - z * s];
  const polys = [];
  const cells = [];
  for (let x = 0; x < h.length; x++) for (let y = 0; y < h[0].length; y++) for (let z = 0; z < h[x][y]; z++) cells.push([x, y, z]);
  cells.sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[2] - b[2]);
  const pts = (arr) => arr.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
  for (const [x, y, z] of cells) {
    polys.push(`<polygon class="cb-t" points="${pts([P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)])}"/>`);
    polys.push(`<polygon class="cb-r" points="${pts([P(x + 1, y, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x + 1, y, z + 1)])}"/>`);
    polys.push(`<polygon class="cb-l" points="${pts([P(x, y + 1, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)])}"/>`);
  }
  const all = cells.flatMap(([x, y, z]) => [P(x, y, z + 1), P(x + 1, y + 1, z), P(x + 1, y, z), P(x, y + 1, z), P(x, y, z)]);
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  const x0 = Math.min(...xs) - 4, y0 = Math.min(...ys) - 4, w = Math.max(...xs) - x0 + 4, hh = Math.max(...ys) - y0 + 4;
  return `<svg class="stack" viewBox="${x0} ${y0} ${w} ${hh}" width="${w * 1.6}" height="${hh * 1.6}" aria-label="A stack of cubes">${polys.join('')}</svg>`;
}

/* Mirror and turn: a lopsided shape (it must be CHIRAL — its mirror image can
   never be reached by turning it — or two options would both be right). */
function chiralShape(r) {
  for (;;) {
    const hx = pick(HEXOMINOES.concat(HEXOMINOES), r);
    const turns = [0, 1, 2, 3].map((k) => { let x = hx; for (let i = 0; i < k; i++) x = rot(x); return sig(x); });
    // chiral (no turn reaches its mirror) AND no rotational symmetry (four
    // different turns) — otherwise two options would be the same picture
    if (!turns.includes(sig(flip(hx))) && new Set(turns).size === 4) return norm(hx);
  }
}
const turnBy = (cells, k) => { let x = cells; for (let i = 0; i < k; i++) x = rot(x); return norm(x); };

export function mirrorQuestion(lv = 1, r = Math.random) {
  const base = chiralShape(r);
  const right = norm(flip(base));
  const wrong = shuffle([turnBy(base, 1), turnBy(base, 2), turnBy(base, 3)], r).slice(0, lv === 1 ? 2 : 3);
  const opts = shuffle([right, ...wrong], r);
  const L = ['A', 'B', 'C', 'D'].slice(0, opts.length);
  return { kind: 'mirror', text: 'Which one is its reflection in the mirror?', html: `<div class="mirror-q">${gridShapeSVG(base, 'q')}<span class="mirror-line" aria-hidden="true"></span></div>`,
    choices: L, ans: L[opts.indexOf(right)], choiceHtml: opts.map((o) => gridShapeSVG(o)),
    explain: 'A mirror swaps left and right but keeps top and bottom. The other shapes are the same shape TURNED — and turning can never make a mirror image of a lopsided shape.', opts, base };
}

export function rotateQuestion(lv = 1, r = Math.random) {
  const base = chiralShape(r);
  const right = turnBy(base, int(1, 3, r));
  const wrong = shuffle([0, 1, 2, 3].map((k) => turnBy(flip(base), k)), r).filter((o) => sig(o) !== sig(right)).slice(0, lv === 1 ? 2 : 3);
  const opts = shuffle([right, ...wrong], r);
  const L = ['A', 'B', 'C', 'D'].slice(0, opts.length);
  return { kind: 'rotate', text: 'Which one is the same shape, just turned round?', html: gridShapeSVG(base, 'q'),
    choices: L, ans: L[opts.indexOf(right)], choiceHtml: opts.map((o) => gridShapeSVG(o)),
    explain: 'Turn it in your head a quarter at a time. The others are its mirror image — you would have to lift it off the page and flip it over to get those.', opts, base };
}

export function gridShapeSVG(cells, cls = '') {
  const u = 22, W = (Math.max(...cells.map((c) => c[1])) + 1) * u, H = (Math.max(...cells.map((c) => c[0])) + 1) * u;
  return `<svg class="gshape ${cls}" viewBox="-2 -2 ${W + 4} ${H + 4}" width="${W + 4}" height="${H + 4}" aria-hidden="true">${cells.map(([rr, c], i) =>
    `<rect x="${c * u}" y="${rr * u}" width="${u}" height="${u}" rx="3" class="${i === 0 ? 'gs gs0' : 'gs'}"/>`).join('')}</svg>`;
}

/* ================================================================ counting */

export const squaresIn = (n, m) => { let t = 0; for (let k = 1; k <= Math.min(n, m); k++) t += (n - k + 1) * (m - k + 1); return t; };

export function squaresQuestion(lv = 1, r = Math.random) {
  const sizes = lv === 1 ? [[2, 2], [2, 3]] : lv === 2 ? [[3, 3], [2, 4], [3, 4]] : [[4, 4], [3, 5], [4, 5]];
  const [n, m] = pick(sizes, r);
  const ans = squaresIn(n, m);
  const parts = []; for (let k = 1; k <= Math.min(n, m); k++) parts.push(`${(n - k + 1) * (m - k + 1)} of size ${k}`);
  const u = 30;
  const svg = `<svg class="sqgrid" viewBox="-2 -2 ${m * u + 4} ${n * u + 4}" width="${m * u + 4}" height="${n * u + 4}" aria-label="A ${n} by ${m} grid">${Array.from({ length: n * m }, (_, i) => `<rect x="${(i % m) * u}" y="${Math.floor(i / m) * u}" width="${u}" height="${u}"/>`).join('')}</svg>`;
  return { kind: 'squares', text: 'How many squares can you find — of every size?', html: svg, ans,
    explain: `Not just the small ones: ${parts.join(', ')}. Altogether ${ans}.` };
}

/* ================================================================ magic squares */

const LOSHU = [2, 7, 6, 9, 5, 1, 4, 3, 8];
export function magicQuestion(lv = 1, r = Math.random) {
  let g = LOSHU.slice();
  for (let t = int(0, 3, r); t > 0; t--) g = [g[6], g[3], g[0], g[7], g[4], g[1], g[8], g[5], g[2]];   // turn
  if (r() < 0.5) g = [g[2], g[1], g[0], g[5], g[4], g[3], g[8], g[7], g[6]];                      // mirror
  const mul = lv === 3 ? int(2, 5, r) : 1, add = lv === 1 ? 0 : int(1, 20, r);
  g = g.map((v) => v * mul + add);
  const sum = g[0] + g[1] + g[2];
  const blanks = shuffle([...Array(9).keys()], r).slice(0, lv === 1 ? 1 : lv === 2 ? 2 : 3);
  const ask = blanks[0];
  const cells = g.map((v, i) => (i === ask ? '<b class="ask">?</b>' : blanks.includes(i) ? '' : v));
  return { kind: 'magic', text: `Every row, column and diagonal adds up to ${sum}. What is the ?`, ans: g[ask], sum, grid: g, blanks,
    html: `<div class="magic">${cells.map((c) => `<span>${c}</span>`).join('')}</div>`,
    explain: `Find a line with only the ? missing, and take the other two from ${sum}. The full square: ${g.slice(0, 3).join(' ')} / ${g.slice(3, 6).join(' ')} / ${g.slice(6).join(' ')}.` };
}
/* the ? must always sit on some line whose other two numbers are showing */
export function magicSolvable(q) {
  const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const known = new Set([...Array(9).keys()].filter((i) => !q.blanks.includes(i)));
  let grew = true;
  while (grew) { grew = false; for (const l of lines) { const miss = l.filter((i) => !known.has(i)); if (miss.length === 1) { known.add(miss[0]); grew = true; } } }
  return known.has(q.blanks[0]);
}

/* ================================================================ the tower */

/* Five families of puzzle. Cube nets is not a game of its own: it is one of
   five kinds of Shapes & Space puzzle, and every floor of the tower mixes
   families, because a contest paper does. */
export const FAMILIES = [
  { id: 'space', name: 'Shapes & Space', glyph: '🧊', blurb: 'Cube nets, opposite faces, stacks of cubes, mirrors and turns.',
    make: (lv, r) => pick([netQuestion, netQuestion, stackQuestion, mirrorQuestion, rotateQuestion], r)(lv, r) },
  { id: 'logic', name: 'Logic', glyph: '🔢', blurb: 'Magic squares here; sudoku guards every fourth floor.',
    make: (lv, r) => { for (;;) { const q = magicQuestion(lv, r); if (magicSolvable(q)) return q; } } },
  { id: 'patterns', name: 'Patterns', glyph: '🌀', blurb: 'Find the rule, say what comes next.', make: (lv, r) => patternQuestion(lv, r) },
  { id: 'balance', name: 'Balance', glyph: '⚖️', blurb: 'Hidden weights on scales — algebra before it has a name.', make: (lv, r) => scalesQuestion(lv, r) },
  { id: 'counting', name: 'Counting', glyph: '🔍', blurb: 'How many squares are really in that grid?', make: (lv, r) => squaresQuestion(lv, r) },
];
export const famOf = (id) => FAMILIES.find((f) => f.id === id);

export const FLOORS = 12;
export const isBoss = (f) => f % 4 === 0;          // floors 4, 8, 12: a sudoku guards the stair
export const FLOOR_PASS = 4;                         // of 6

/* Level for a floor: the tower gets harder as you climb, starting lower for
   the youngest and higher for the oldest. */
export function floorLevel(floor, band) {
  const off = band === '6-7' ? -1 : band === '11-14' ? 1 : 0;
  return Math.max(1, Math.min(3, Math.ceil(floor / 4) + off));
}

/* Six puzzles for a floor: every family at least once, never two of the same
   kind back to back. */
export function floorSet(floor, band, r = Math.random) {
  const lv = floorLevel(floor, band);
  const fams = shuffle(FAMILIES.map((f) => f.id), r);
  fams.push(pick(['space', 'patterns', 'balance'], r));
  const out = [];
  for (const fid of fams) {
    let q, tries = 0;
    do { q = famOf(fid).make(lv, r); } while (tries++ < 10 && out.length && out.at(-1).kind === q.kind);
    out.push({ ...q, puzzle: fid });
  }
  return out;
}

export function familySet(fid, lv, n = 6, r = Math.random) {
  const out = [], seen = new Set();
  for (let i = 0; out.length < n && i < n * 12; i++) {
    const q = famOf(fid).make(lv, r); const k = q.text + (q.html || '');
    if (!seen.has(k)) { seen.add(k); out.push({ ...q, puzzle: fid }); }
  }
  return out;
}

export const bandLevel = (band) => ({ '6-7': 1, '8-10': 2, '11-14': 3 }[band] || 1);
export const sudokuSize = (band, lv) => (band === '6-7' ? 4 : band === '8-10' ? (lv >= 3 ? 9 : 6) : (lv === 1 ? 6 : 9));
