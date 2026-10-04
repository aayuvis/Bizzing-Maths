/* test/lib/steps.mjs — every MIDDLE step is checked, not just the last (owner, 3 Oct 2026).

   The last step is held to q.ans and q.expr already. A middle step is what the child types on
   "Your turn" before it, and until now nothing checked it: an off-by-one there passed every test.
   So every step but the last carries `x` — the step's value as plain arithmetic on the question's
   own numbers (a JS expression, like q.expr) — and this evaluates it against `v`.

   - a number step: x evaluates to the same number (1e-9);
   - a fraction step ('3/4'): x evaluates to the fraction's value;
   - a choice or word step: x evaluates to the same string;
   - x must be arithmetic, not a copy of the value: a bare number is refused.
   x is written from the QUESTION's numbers by the step's plain meaning ("6 × 7" → `6*7`, "the remainder
   of 625 ÷ 9" → `625%9`), never from the trick's own running variables — it is the second route. */
import { parseNum } from '../../src/tricks.js';

/* What the child SEES is the strongest second route for a step that only reads a given: x may use
   TEXT (the prompt on screen), SVG (the stop's drawing) and H, which reads them:
     H.n(TEXT, k)       the k-th number printed in the prompt (1-based; − and decimals read)
     H.ns(TEXT)         every number printed in the prompt
     H.count(SVG, re)   how many times a pattern occurs in the drawing (dots, rods, tiles…)
     H.fact(name)       a fixed fact, derived once from a model rather than typed (see FACTS)
   "How many rows of dots?" is then counted off the dots drawn, and a picture that disagrees
   with its step fails — the check that found the rhombus with sides of 110 and 110.02. */
const NUM = /−?\d+(?:,\d{3})*(?:\.\d+)?/g;
// Each fact is MEASURED or DERIVED from a model, never typed: angles from real coordinates, units from the
// SI prefixes, a die from its faces. A reviewer reads this table once instead of forty steps.
const deg = (r) => r * 180 / Math.PI;
const angleAt = (P, A, B) => deg(Math.acos(((A[0] - P[0]) * (B[0] - P[0]) + (A[1] - P[1]) * (B[1] - P[1])) / (Math.hypot(A[0] - P[0], A[1] - P[1]) * Math.hypot(B[0] - P[0], B[1] - P[1]))));
const polygonAngles = (pts) => pts.reduce((s, P, i) => s + angleAt(P, pts[(i + pts.length - 1) % pts.length], pts[(i + 1) % pts.length]), 0);
const PREFIX = { mm: -3, cm: -2, m: 0, km: 3, mg: -3, g: 0, kg: 3, ml: -3, l: 0 };
const FACTS = {
  'straight-angle': () => Math.round(deg(Math.acos(-1))),                                             // the angle between opposite rays
  'full-turn': () => { const rays = [10, 75, 160, 230, 300].map((d) => d * Math.PI / 180); return Math.round(rays.reduce((s, r, i) => s + deg((rays[(i + 1) % rays.length] - r + 2 * Math.PI) % (2 * Math.PI)), 0)); },
  'triangle-angles': () => Math.round(polygonAngles([[0, 0], [7, 1], [2, 5]])),                    // measured on a scalene triangle
  'quad-angles': () => Math.round(polygonAngles([[0, 0], [8, 1], [9, 6], [1, 4]])),                 // measured on an irregular (convex) quadrilateral
  // a face is the four corners that share one coordinate: count the (axis, side) pairs that give four
  'cube-faces': () => { let f = 0; for (const ax of [0, 1, 2]) for (const side of [0, 1]) f += [0, 1, 2, 3, 4, 5, 6, 7].filter((c) => ((c >> ax) & 1) === side).length === 4 ? 1 : 0; return f; },
  'cube-edges': () => { let e = 0; for (let a = 0; a < 8; a++) for (let b = a + 1; b < 8; b++) if (((a ^ b) & ((a ^ b) - 1)) === 0) e++; return e; },
  'cube-corners': () => 2 ** 3,
  'die-total': () => { let s = 0; for (let f = 1; f <= 6; f++) s += f; return s; },
  'die-faces': () => new Set(Array.from({ length: 600 }, (_, i) => (i * 7) % 6 + 1)).size,
  'coin-sides': () => new Set(Array.from({ length: 50 }, (_, i) => (i % 2 ? 'heads' : 'tails'))).size,
  'days-in-week': () => new Set(Array.from({ length: 30 }, (_, d) => new Date(2024, 0, 1 + d).getDay())).size,
  'months-in-year': () => new Set(Array.from({ length: 40 }, (_, i) => new Date(2024, i, 1).getMonth())).size,
  'per': (small, big) => Math.round(10 ** (PREFIX[big] - PREFIX[small])),                           // how many small make one big
};
export const H = {
  ns: (t) => (String(t).match(NUM) || []).map((x) => +x.replace('−', '-').replace(/,/g, '')),
  n: (t, k) => H.ns(t)[k - 1],
  count: (svg, re) => (String(svg).match(re instanceof RegExp ? new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g') : new RegExp(re, 'g')) || []).length,
  fact: (name, ...a) => { if (!FACTS[name]) throw new Error('no fact ' + name); return FACTS[name](...a); },
};

/* The shapes of a check that only restates its own value — refused, so a step that reads a given
   must read it from TEXT or SVG, and a fixed fact must come from H.fact. */
const N = String.raw`\d+(?:\.\d+)?`;
const WEAK = [
  // the WHOLE x is a value with 0 added or taken away, or times / over 1 — a given restated, not worked out
  // (a loop's Math.floor(N/1)%10 for the units place is honest digit-reading and is not caught)
  [new RegExp(String.raw`^\s*(?:${N}|\(\s*-?${N}\s*\))\s*[-+]\s*0\s*$`), 'adds or takes away 0'],
  [new RegExp(String.raw`^\s*(?:${N}|\(\s*-?${N}\s*\))\s*[*/]\s*1\s*$`), 'multiplies or divides by 1'],
  [new RegExp(String.raw`^\s*\(?\s*(${N})\s*\*\s*(${N})\s*\)?\s*\/\s*\(?\s*\2\s*\)?\s*$`), 'multiplies then divides by the same number'],
  [new RegExp(String.raw`^\s*\(?\s*(${N})\s*\*\s*(${N})\s*\)?\s*\/\s*\(?\s*\1\s*\)?\s*$`), 'multiplies then divides by the same number'],
  [new RegExp(String.raw`Math\.sqrt\(\s*(${N})\s*\*\s*\1\s*\)`), 'square-roots a square it just made'],
  [new RegExp(String.raw`^\s*1\s*\/\s*\(\s*1\s*\/\s*${N}\s*\)\s*$`), 'takes 1 ÷ (1 ÷ n)'],
  [/^\s*\[\s*(?:(['"])[^'"]*\1\s*,?\s*)+\]\.length\s*$/, 'counts a list of words it typed'],
];
export const weakness = (x) => (WEAK.find(([re]) => re.test(x)) || [])[1] || null;
/* A step whose x is the same expression on every question, with no TEXT, SVG or H in it, is a fixed
   fact typed by hand: constReport() fails it once a stop has shown it on 20 different questions. */
const seen = new Map(), shapes = new Map();
/* …and a step whose x has a weak shape on nine questions in ten is restating, not working: a given that
   happens to be 0 or 1 on one question ("Tops: 3 × 1") is honest arithmetic and is not caught. */
export function constReport(ok) {
  for (const [key, r] of seen) {
    if (r.qs.size >= 20 && r.xs.size === 1 && !/TEXT|SVG|H\./.test([...r.xs][0]))
      ok(false, `${key}: x is the same typed constant (${[...r.xs][0]}) on every question — a fixed fact comes from H.fact(), a given from TEXT or SVG`);
  }
  for (const [key, r] of shapes) if (r.n >= 10 && r.weak >= 0.9 * r.n)
    ok(false, `${key}: x ${r.why} on ${r.weak} of ${r.n} questions (e.g. ${r.eg}) — read the given from TEXT or SVG, or a fact from H.fact()`);
}

const isWord = (v) => typeof v === 'string' && !Number.isFinite(parseNum(v));
export function checkSteps(id, q, w, ok, svg = '') {
  w.slice(0, -1).forEach((s, i) => {
    const where = `${id}: ${q.text} — step ${i + 1} "${s.t}"`;
    if (s.x === undefined || s.x === null || s.x === '') return ok(false, `${where} has no x (its plain arithmetic)`);
    const x = String(s.x).trim();
    ok(!/^-?\d+(\.\d+)?$/.test(x) && !/^'[^']*'$|^"[^"]*"$/.test(x), `${where}: x is a bare value (${x}) — write the arithmetic that makes it`);
    const key = `${id} step ${i + 1} (${String(s.t).replace(/[\d−.,]+/g, '#').slice(0, 40)})`;
    const r = seen.get(key) || seen.set(key, { qs: new Set(), xs: new Set(), n: 0, weak: 0, why: null, eg: '' }).get(key);
    const weak = weakness(x);
    r.qs.add(q.text); r.xs.add(x);
    // weakness is judged per SHAPE of x (its numbers blanked): `W-0` at one level is caught every time it is written
    const shape = `${key} [${x.replace(/\d+(\.\d+)?/g, '#').slice(0, 60)}]`;
    const sr = shapes.get(shape) || shapes.set(shape, { n: 0, weak: 0, why: null, eg: '' }).get(shape);
    sr.n++; if (weak) { sr.weak++; sr.why = weak; sr.eg = x; }
    let got;
    try { got = Function('TEXT', 'SVG', 'H', `return (${x})`)(q.text || '', svg || '', H); } catch (e) { return ok(false, `${where}: x does not evaluate (${x}: ${e.message})`); }
    if (s.choices || isWord(s.v)) return ok(got === s.v, `${where}: x says ${JSON.stringify(got)}, the step says ${JSON.stringify(s.v)}`);
    const want = typeof s.v === 'number' ? s.v : parseNum(s.v), g = typeof got === 'number' ? got : parseNum(String(got));
    ok(Number.isFinite(g) && Math.abs(g - want) < 1e-9, `${where}: x (${x}) says ${got}, the step says ${s.v}`);
  });
}
