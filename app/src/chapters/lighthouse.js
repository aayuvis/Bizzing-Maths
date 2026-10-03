/* lighthouse.js — The Lighthouse: measuring what you cannot reach, steering
   by the compass, reading the sea's data, and planning for chance. A keeper
   cannot climb a tape measure up her own tower or wade out to a ship, so she
   measures with triangles: Pythagoras for the third side, then the ratios
   (sin, cos, tan) that tie an angle to its sides. She steers by three-figure
   bearings, logs pairs of readings on a scatter graph and draws a line of
   best fit through them, plans for two chancy things at once with a tree
   diagram, and solves the inequalities that say "at most" and "at least".
   Contract: docs/CHAPTER-CONTRACT.md.

   Every ratio a question uses is GIVEN in the prompt ("tan 35° ≈ 0.7"), and
   every given ratio is the true value correctly rounded to the places shown —
   the one fact about this file a reader cannot check by eye, so
   RATIOS_ARE_TRUE below is exported for the test to hold it to. The scatter
   graphs are generated to a correlation bound, and `expr` recomputes the
   correlation coefficient from the plotted points, so a graph labelled
   "positive" that is not strongly positive fails the build. */

import { int, pick, shuffle, seeded } from '../rand.js';
import { svg, text, pie, fracBar } from './kit.js';

export const WORLD = {
  id: 'lighthouse', name: 'The Lighthouse', short: 'Lighthouse', band: '11-14',
  blurb: 'Measure the tower with a triangle, steer by the compass, read the sea’s data and plan for chance.',
  tint: '#E6EEF5', ink: '#1B3550', glyph: '🗼',
};

/* ---------------------------------------------------------------- helpers */

const RAD = Math.PI / 180;
const R2 = (x) => Math.round(x * 100) / 100;
const N = (v) => (v < 0 ? '−' + Math.abs(v) : String(v));
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const fr = (a, b) => { const g = gcd(a, b); return `${a / g}/${b / g}`; };
const leaks = (q) => !q.choices && String(q.ans).length > 1 && q.text.replace(/,/g, '').split(/[^0-9./]/).map((w) => w.replace(/\.$/, '')).includes(String(q.ans));
function fresh(make) { let q; for (let i = 0; i < 200; i++) { q = make(); if (!leaks(q)) return q; } return q; }
const YN = ['Yes', 'No'];
const pad3 = (b) => String(b).padStart(3, '0');

/* A given ratio: the value as a fraction num/den (so answers are exact) and
   as the child sees it. `exact` says "=" rather than "≈". */
const rt = (num, den, show, exact = false) => ({ num, den, show, exact });
const TAN = [
  [11, rt(1, 5, '0.2')], [17, rt(3, 10, '0.3')], [22, rt(2, 5, '0.4')], [27, rt(1, 2, '0.5')], [31, rt(3, 5, '0.6')],
  [35, rt(7, 10, '0.7')], [37, rt(3, 4, '0.75')], [50, rt(6, 5, '1.2')], [56, rt(3, 2, '1.5')], [63, rt(2, 1, '2.0')],
];
const SINCOS = [
  [30, rt(1, 2, '0.5', true), rt(87, 100, '0.87')], [60, rt(87, 100, '0.87'), rt(1, 2, '0.5', true)],
  [37, rt(3, 5, '0.6'), rt(4, 5, '0.8')], [53, rt(4, 5, '0.8'), rt(3, 5, '0.6')],
  [24, rt(2, 5, '0.4'), rt(9, 10, '0.9')], [66, rt(9, 10, '0.9'), rt(2, 5, '0.4')],
  [44, rt(7, 10, '0.7'), rt(18, 25, '0.72')], [12, rt(1, 5, '0.2'), rt(49, 50, '0.98')],
];
/* Every given ratio is the true one, rounded correctly to the places shown. */
export const RATIOS_ARE_TRUE = () => {
  const ok = (f, deg, r) => { const dp = (r.show.split('.')[1] || '').length, t = f(deg * RAD);
    return r.exact ? Math.abs(t - r.num / r.den) < 1e-12 : Math.abs(t - Number(r.show)) <= 0.5 * 10 ** -dp + 1e-12 && Number(r.show) === r.num / r.den; };
  return TAN.every(([d, r]) => ok(Math.tan, d, r)) && SINCOS.every(([d, s, c]) => ok(Math.sin, d, s) && ok(Math.cos, d, c));
};
const say = (f, d, r) => `${f} ${d}° ${r.exact ? '=' : '≈'} ${r.show}`;

/* ------------------------------------------------------------ drawing: triangles */

/* A right triangle in screen units: P bottom-left, R the right angle
   (bottom-right), Q on top — then mirrored and/or flipped. Sides are named
   'base' (P–R), 'wall' (R–Q) and 'slope' (P–Q, the hypotenuse).
   o: { b, h (lengths), mirror, flip, ang: 'P'|'Q'|null, angLabel,
        labels: {base, wall, slope}, hi: side name, tower: true } */
function rtri(o) {
  const k = Math.min(230 / o.b, 170 / o.h), W = o.b * k, H = o.h * k, px = 56, py = 34;
  const T = ([x, y]) => [R2(px + (o.mirror ? W - x : x) + (o.tower && o.mirror ? 22 : 0)), R2(py + (o.flip ? H - y : y))];
  const P = T([0, H]), R = T([W, H]), Q = T([W, 0]), C = [(P[0] + R[0] + Q[0]) / 3, (P[1] + R[1] + Q[1]) / 3];
  const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; };
  let s = '';
  if (o.tower) { // the lighthouse stands along the wall, outside the triangle
    const out = unit(P, R); const x = R[0] + out[0] * 11;
    s += `<rect x="${R2(x - 10)}" y="${R2(Math.min(Q[1], R[1]))}" width="20" height="${R2(Math.abs(R[1] - Q[1]))}" rx="3" class="dg-fill2"/>`;
    s += `<circle cx="${R2(x)}" cy="${R2(Math.min(Q[1], R[1]) - 7)}" r="7" class="dg-dot"/>`;
  }
  s += `<polygon points="${[P, R, Q].map((p) => p.join(',')).join(' ')}" class="dg-fill1"/>`;
  const side = { base: [P, R], wall: [R, Q], slope: [P, Q] };
  if (o.hi) { const [a, b] = side[o.hi]; s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="dg-hand2"/>`; }
  // the right-angle box at R
  const u1 = unit(R, P), u2 = unit(R, Q), m = 12;
  s += `<polyline points="${R2(R[0] + u1[0] * m)},${R2(R[1] + u1[1] * m)} ${R2(R[0] + (u1[0] + u2[0]) * m)},${R2(R[1] + (u1[1] + u2[1]) * m)} ${R2(R[0] + u2[0] * m)},${R2(R[1] + u2[1] * m)}" class="dg-thin" fill="none"/>`;
  if (o.ang) {
    const V = o.ang === 'P' ? P : Q, a = unit(V, R), b = unit(V, o.ang === 'P' ? Q : P), rr = 30;
    const sweep = a[0] * b[1] - a[1] * b[0] > 0 ? 1 : 0;
    s += `<path d="M${R2(V[0] + a[0] * rr)},${R2(V[1] + a[1] * rr)} A${rr},${rr} 0 0 ${sweep} ${R2(V[0] + b[0] * rr)},${R2(V[1] + b[1] * rr)}" class="dg-arc"/>`;
    if (o.angLabel) { const mx = a[0] + b[0], my = a[1] + b[1], d = Math.hypot(mx, my) || 1;
      s += text(R2(V[0] + (mx / d) * (rr + 16)), R2(V[1] + (my / d) * (rr + 16) + 5), o.angLabel, 'dg-accent'); }
  }
  for (const [name, l] of Object.entries(o.labels || {})) {
    if (!l) continue; const [a, b] = side[name];
    let mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; const dx = mx - C[0], dy = my - C[1], d = Math.hypot(dx, dy) || 1;
    const push = name === 'wall' && o.tower ? 50 : name === 'slope' ? 30 : 20;
    mx += (dx / d) * push; my += (dy / d) * push;
    s += text(R2(mx), R2(my + 5), l, l === '?' ? 'dg-accent' : 'dg-text');
  }
  return svg(R2(W + 2 * px + (o.tower ? 22 : 0)), R2(H + 2 * py), s, o.label || 'A right-angled triangle');
}

/* Squares on the three sides of a right triangle, for Pythagoras. The legs
   are a (upright) and b (along the ground); each square carries its side. */
function squares(a, b, la, lb, lc) {
  // maths units: right angle at the origin, leg b along x, leg a up y
  const P = [0, 0], X = [b, 0], Y = [0, a];
  const sq = (A, B) => { const dx = B[0] - A[0], dy = B[1] - A[1]; return [A, B, [B[0] + dy, B[1] - dx], [A[0] + dy, A[1] - dx]]; };
  const S = [sq(P, X), sq(Y, P), sq(X, Y)];                          // P→X→Y runs anticlockwise, so each square sits outside: below, left, beyond the hypotenuse
  const all = [P, X, Y, ...S.flat()], xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  const k = 250 / Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)), x0 = Math.min(...xs), y1 = Math.max(...ys);
  const T = ([x, y]) => [R2(40 + (x - x0) * k), R2(34 + (y1 - y) * k)];
  const poly = (pts, cls) => `<polygon points="${pts.map((p) => T(p).join(',')).join(' ')}" class="${cls}"/>`;
  let s = poly(S[0], 'dg-fill3') + poly(S[1], 'dg-fill3') + poly(S[2], 'dg-fill2') + poly([P, X, Y], 'dg-fill1');
  // a label sits in its square; a square too small to hold it gets the label just outside, on the far side
  [[lb, b], [la, a], [lc, 0]].forEach(([l, side], i) => {
    let c = S[i].reduce((m, p) => [m[0] + p[0] / 4, m[1] + p[1] / 4], [0, 0]);
    if (side && side * k < 44) c = i === 0 ? [c[0], -side - 22 / k] : [-side - 26 / k, c[1]];
    const [x, y] = T(c); s += text(x, y + 6, l, l === '?' ? 'dg-accent' : 'dg-big');
  });
  const W = (Math.max(...xs) - x0) * k + 80, H = (y1 - Math.min(...ys)) * k + 68;
  return svg(R2(W), R2(H), s, 'A right-angled triangle with a square drawn on each side');
}

/* ------------------------------------------------------------ drawing: the compass */

function compass(out) {
  const c = 130, r = 96, a = out * RAD, ex = c + r * Math.sin(a), ey = c - r * Math.cos(a), ar = 40;
  let s = `<circle cx="${c}" cy="${c}" r="${r}" class="dg-blank"/>`;
  for (let d = 0; d < 360; d += 30) { const t = d * RAD; s += `<line x1="${R2(c + (r - 8) * Math.sin(t))}" y1="${R2(c - (r - 8) * Math.cos(t))}" x2="${R2(c + r * Math.sin(t))}" y2="${R2(c - r * Math.cos(t))}" class="dg-thin"/>`; }
  s += `<line x1="${c}" y1="${c}" x2="${c}" y2="${c - r - 14}" class="dg-line"/>` + text(c, c - r - 20, 'N', 'dg-text');
  s += `<path d="M${c},${c - ar} A${ar},${ar} 0 ${out > 180 ? 1 : 0} 1 ${R2(c + ar * Math.sin(a))},${R2(c - ar * Math.cos(a))}" class="dg-arc"/>`;
  s += `<line x1="${c}" y1="${c}" x2="${R2(ex)}" y2="${R2(ey)}" class="dg-hand2"/><circle cx="${R2(ex)}" cy="${R2(ey)}" r="7" class="dg-dot"/>`;
  s += `<rect x="${c - 8}" y="${c - 8}" width="16" height="16" rx="3" class="dg-fill2"/>`;
  const h = (out / 2) * RAD, lr = ar + 22;
  s += text(R2(c + lr * Math.sin(h)), R2(c - lr * Math.cos(h) + 5), `${pad3(out)}°`, 'dg-accent');
  return svg(2 * c, 2 * c, s, `A compass: a ship leaves the lighthouse on a bearing of ${pad3(out)} degrees`);
}

/* ------------------------------------------------------------ drawing: graphs */

/* Axes 0..n on both, points [[x,y]], an optional line {x1,y1,x2,y2} drawn
   across the whole grid, optional marked points [[x,y]]. */
function plot(pts, n = 10, lineThrough = null, marked = [], step = 2) {
  const u = 240 / n, x0 = 34, y0 = 12, X = (x) => R2(x0 + x * u), Y = (y) => R2(y0 + (n - y) * u);
  let s = '';
  for (let i = 0; i <= n; i += step) s += `<line x1="${X(i)}" y1="${Y(0)}" x2="${X(i)}" y2="${Y(n)}" class="dg-grid"/><line x1="${X(0)}" y1="${Y(i)}" x2="${X(n)}" y2="${Y(i)}" class="dg-grid"/>`
    + text(X(i), Y(0) + 16, i, 'dg-small') + text(X(0) - 6, Y(i) + 4, i, 'dg-small', 'end');
  s += `<line x1="${X(0)}" y1="${Y(0)}" x2="${X(n)}" y2="${Y(0)}" class="dg-line"/><line x1="${X(0)}" y1="${Y(0)}" x2="${X(0)}" y2="${Y(n)}" class="dg-line"/>`;
  s += text(X(n) + 4, Y(0) - 6, 'x', 'dg-small', 'start') + text(X(0) + 6, Y(n) + 4, 'y', 'dg-small', 'start');
  for (const [x, y] of pts) s += `<circle cx="${X(x)}" cy="${Y(y)}" r="4" class="dg-dot"/>`;
  if (lineThrough) {
    const { x1, y1, x2, y2 } = lineThrough, m = (y2 - y1) / (x2 - x1), f = (x) => y1 + m * (x - x1);
    // clip the line to the grid
    let a = 0, b = n;
    if (m !== 0) { const xa = x1 + (0 - y1) / m, xb = x1 + (n - y1) / m; a = Math.max(0, Math.min(xa, xb)); b = Math.min(n, Math.max(xa, xb)); }
    s += `<line x1="${X(a)}" y1="${Y(f(a))}" x2="${X(b)}" y2="${Y(f(b))}" class="dg-hand2"/>`;
  }
  for (const [x, y] of marked) s += `<circle cx="${X(x)}" cy="${Y(y)}" r="7" class="dg-blank"/><circle cx="${X(x)}" cy="${Y(y)}" r="3" class="dg-dot"/>`;
  return svg(x0 + n * u + 20, y0 + n * u + 26, s, lineThrough ? 'A scatter graph with a line of best fit' : 'A scatter graph');
}

/* Pearson's correlation coefficient, r. */
function corr(p) {
  const n = p.length, mx = p.reduce((a, q) => a + q[0], 0) / n, my = p.reduce((a, q) => a + q[1], 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const [x, y] of p) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy);
}
/* The same, written out for `expr`: an independent recomputation from the plotted points. */
const CORR = '((p)=>{const n=p.length;let a=0,b=0;for(const q of p){a+=q[0];b+=q[1];}a/=n;b/=n;let sxy=0,sxx=0,syy=0;for(const q of p){sxy+=(q[0]-a)*(q[1]-b);sxx+=(q[0]-a)**2;syy+=(q[1]-b)**2;}return sxy/Math.sqrt(sxx*syy);})';
export const BOUND = { strong: 0.7, none: 0.2 };
const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
/* Points for a scatter graph of the named kind; retried until |r| meets its bound. */
export function scatterPts(kind, r, lv = 2) {
  const n = lv === 3 ? int(9, 11, r) : int(11, 14, r), need = lv === 1 ? 0.85 : BOUND.strong;
  for (let tries = 0; ; tries++) {
    let pts;
    if (kind === 'none') pts = Array.from({ length: n }, () => [R1(0.5 + 9 * r()), R1(0.5 + 9 * r())]);
    else {
      const m = (kind === 'positive' ? 1 : -1) * (0.55 + 0.4 * r()), sd = lv === 1 ? 0.8 : 1.3;
      pts = Array.from({ length: n }, () => { const x = 0.5 + 9 * r(); return [R1(x), R1(Math.max(0.3, Math.min(9.7, 5 + m * (x - 5) + sd * gauss(r))))]; });
    }
    const c = corr(pts);
    if (kind === 'none' ? Math.abs(c) < BOUND.none : kind === 'positive' ? c > need : c < -need) return pts;
    if (tries > 500) throw new Error('scatterPts: no graph met the bound');
  }
}
function R1(x) { return Math.round(x * 10) / 10; }
const CORRS = ['positive', 'negative', 'none'];

/* A tree diagram for two events. p1, p2 are [num, den] for the "yes" branch. */
function tree(p1, p2, words, names) {
  const f = ([a, b], yes) => (yes ? fr(a, b) : fr(b - a, b));
  const root = [26, 120], mid = [[150, 62], [150, 178]], leaf = [[300, 30], [300, 94], [300, 146], [300, 210]];
  let s = text(88, 16, names[0], 'dg-small', 'middle');
  const br = (A, B, lab, up) => {
    const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
    return `<line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" class="dg-line"/>` + text(mx - 4, my + (up ? -8 : 18), lab, 'dg-accent', 'middle');
  };
  mid.forEach((M, i) => { s += br(root, M, f(p1, i === 0), i === 0) + text(M[0] + 6, M[1] - 10, words[i], 'dg-text', 'start'); });
  leaf.forEach((L, j) => { const M = mid[j >> 1]; s += br([M[0] + 62, M[1]], L, f(p2, j % 2 === 0), j % 2 === 0) + text(L[0] + 8, L[1] + 5, words[j % 2], 'dg-text', 'start'); });
  s += text(250, 16, names[1], 'dg-small', 'middle');
  s += `<circle cx="${root[0]}" cy="${root[1]}" r="5" class="dg-dot"/>`;
  return svg(380, 240, s, 'A tree diagram');
}

/* ------------------------------------------------------------ the tree contexts */

const EVENTS = [
  { names: ['morning ferry', 'evening ferry'], words: ['late', 'on time'], yes: 'is late', no: 'is on time',
    one: 'exactly one of the two ferries is late', same: 'both ferries do the same thing (both late, or both on time)' },
  { names: ['lamp bulb', 'spare bulb'], words: ['fails', 'works'], yes: 'fails', no: 'works',
    one: 'exactly one of the two bulbs fails', same: 'the two bulbs do the same thing (both fail, or both work)' },
  { names: ['first net', 'second net'], words: ['full', 'empty'], yes: 'comes up full', no: 'comes up empty',
    one: 'exactly one of the two nets comes up full', same: 'the two nets come up the same (both full, or both empty)' },
  { names: ['first night', 'second night'], words: ['fog', 'clear'], yes: 'is foggy', no: 'is clear',
    one: 'exactly one of the two nights is foggy', same: 'the two nights are the same (both foggy, or both clear)' },
];
function prob(r, maxDen) { const b = int(2, maxDen, r); let a; do a = int(1, b - 1, r); while (gcd(a, b) !== 1); return [a, b]; }

/* ------------------------------------------------------------ expected frequency */

/* A die outcome: how many of the six faces win, the rule as code (for `expr`), and the words. */
const DIE = [
  [1, 'f===6', 'a six'], [3, 'f%2===0', 'an even number'], [2, 'f>=5', 'a 5 or a 6'], [2, 'f<3', 'a number less than 3'],
  [3, 'f>3', 'a number bigger than 3'], [4, 'f>2', 'a number bigger than 2'], [2, 'f===1||f===6', 'a 1 or a 6'],
];
const LOGW = [['rain', 'rainy nights'], ['fog', 'foggy nights'], ['a gale', 'nights with a gale'], ['a calm sea', 'calm nights']];
const DEC = [5, 10, 15, 20, 25, 30, 35, 40, 45, 60, 65, 70, 75, 80, 90];   // chances in hundredths
/* Six die faces, the winning ones shaded. */
function faces(cond) {
  const win = Function('f', `return ${cond}`);
  let s = '';
  for (let f = 1; f <= 6; f++) { const x = 6 + (f - 1) * 52; s += `<rect x="${x}" y="6" width="44" height="44" rx="8" class="${win(f) ? 'dg-fill1' : 'dg-blank'}"/>` + text(x + 22, 35, f, 'dg-big'); }
  return svg(318, 56, s, 'The six faces of a die, the ones that count shaded');
}

/* ------------------------------------------------------------ inequalities */

const OPS = { '<': ['<', '<'], '<=': ['≤', '<='], '>': ['>', '>'], '>=': ['≥', '>='] };
const FLIP = { '<': '>', '<=': '>=', '>': '<', '>=': '<=' };
const lhs = (a, b) => `${a === 1 ? '' : a === -1 ? '−' : N(a)}x ${b < 0 ? '−' : '+'} ${Math.abs(b)}`;
const setLabel = (op, k) => `x ${OPS[op][0]} ${N(k)}`;

const EX_SCATTER = scatterPts('positive', seeded('lighthouse-ex'), 1);
const EX_SCATTER_NEG = scatterPts('negative', seeded('lighthouse-ex-neg'), 1);
const EX_SCATTER_NONE = scatterPts('none', seeded('lighthouse-ex-none'), 1);

/* ================================================================ stops */

export const TRICKS = [
  {
    id: 'pythagoras-side', world: 'lighthouse', band: '11-14', title: 'Pythagoras’ theorem',
    hook: 'A rope runs from the top of a 12 m mast to a ring 5 m from its foot. How long is the rope — without climbing up to measure it?',
    idea: 'In a right-angled triangle, square the two short sides and add: that is the square of the longest side.',
    why: [
      'Draw a square on each side of a right-angled triangle. The big square on the longest side — the hypotenuse, opposite the right angle — has exactly the same area as the two smaller squares put together. With sides 5 and 12, the small squares are 25 and 144, which make 169, and 169 is 13 × 13. So the rope is 13 m.',
      'Why must it be true? Draw a big square of side a + b and put four copies of the triangle in its corners. Arranged one way, the space left over is one tilted square, c². Arranged another way, it is two squares, a² and b². Same big square, same four triangles, so the space left is the same: a² + b² = c². The theorem carries the name of Pythagoras; a proof of it is Proposition 47 in Book I of Euclid’s Elements.',
      'It runs backwards too. If you know the longest side and one short side, take the small square away from the big one: 13² − 5² = 169 − 25 = 144, and 144 is 12². Sets of whole numbers that fit, like 3, 4, 5 and 5, 12, 13, are called Pythagorean triples — and any multiple of one (6, 8, 10) fits as well, because the whole triangle has just been scaled up.',
    ],
    alg: 'a² + b² = c² , where c is the side opposite the right angle',
    sources: ['Euclid, Elements, Book I, Proposition 47; in T. L. Heath (trans.), The Thirteen Books of Euclid’s Elements (Cambridge University Press, 1908).'],
    ex: { a: 12, b: 5, c: 13, find: 'c' },
    caseKey: 'side',
    cases: [
      { label: 'Find the longest side', note: 'Square the two short sides and ADD: the total is the square on the longest side.',
        ex: { a: 12, b: 5, c: 13, find: 'c' } },
      { label: 'Find a short side', note: 'Now the longest side is given, so its square is the big one. Take the small square AWAY from it instead of adding.',
        ex: { a: 8, b: 15, c: 17, find: 'a' } },
    ],
    gen(r, lv = 1) {
      const T = lv === 1 ? [[3, 4, 5], [6, 8, 10], [5, 12, 13]] : [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 40, 41]];
      return fresh(() => {
        const [p, q, c] = pick(T, r), k = lv === 1 ? 1 : int(1, lv === 2 ? 4 : 6, r);
        const [a, b] = r() < 0.5 ? [p * k, q * k] : [q * k, p * k];
        const find = lv === 3 && r() < 0.5 ? pick(['a', 'b'], r) : 'c';
        return this.q({ a, b, c: c * k, find });
      });
    },
    q({ a, b, c, find }) {
      const side = find === 'c' ? 'long' : 'short';
      if (find === 'c') return { a, b, c, find, side, text: `A right-angled triangle has short sides ${a} m and ${b} m. How long is the longest side?`, expr: `Math.sqrt(${a}*${a}+${b}*${b})`, ans: c };
      const known = find === 'a' ? b : a, want = find === 'a' ? a : b;
      return { a, b, c, find, side, text: `A right-angled triangle has a longest side of ${c} m and one short side of ${known} m. How long is the other short side?`, expr: `Math.sqrt(${c}*${c}-${known}*${known})`, ans: want };
    },
    work({ a, b, c, find }) {
      if (find === 'c') return [{ t: `${a}²`, v: a * a }, { t: `${b}²`, v: b * b }, { t: `${a * a} + ${b * b}`, v: c * c }, { t: `Which number squared makes ${c * c}?`, v: c }];
      const known = find === 'a' ? b : a, want = find === 'a' ? a : b;
      return [{ t: `${c}²`, v: c * c }, { t: `${known}²`, v: known * known }, { t: `${c * c} − ${known * known}`, v: want * want }, { t: `Which number squared makes ${want * want}?`, v: want }];
    },
    draw({ a, b, c, find }) { return squares(a, b, find === 'a' ? '?' : `${a}²`, find === 'b' ? '?' : `${b}²`, find === 'c' ? '?' : `${c}²`); },
  },
  {
    id: 'trig-sides', world: 'lighthouse', band: '11-14', title: 'Naming the sides',
    hook: 'The highlighted side: is it opposite the angle, next to it, or the hypotenuse? It depends which angle you are looking from.',
    idea: 'The hypotenuse is always opposite the right angle; of the other two, the opposite side does not touch the marked angle and the adjacent side does.',
    why: [
      'Every right-angled triangle has one side that never changes its name: the longest one, facing the right angle. It is the hypotenuse, wherever the triangle is turned.',
      'The other two names depend on which angle you stand at. Stand at the marked corner: one short side runs from your feet along to the right angle — it is next to you, so it is called adjacent (which means “lying next to”). The other short side is across the triangle from you, not touching your corner at all — it is opposite.',
      'Move to the other sharp corner and the two short sides swap names: the side that was opposite now touches you, so it is adjacent. That is why you always find the angle first, then name the sides. The names are the start of trigonometry: sin, cos and tan are just the three ways of dividing one of these sides by another.',
    ],
    alg: 'hypotenuse: opposite the right angle · opposite: across from θ · adjacent: touches θ (and is not the hypotenuse)',
    ex: { deg: 35, at: 'P', mirror: false, flip: false, hi: 'wall' },
    caseKey: 'ans',
    cases: [
      { label: 'Hypotenuse', note: 'Find the right angle first. The side facing it is the hypotenuse, whichever angle you look from.',
        ex: { deg: 35, at: 'P', mirror: false, flip: false, hi: 'slope' } },
      { label: 'Opposite', note: 'This side does not touch the marked angle at all — it is across the triangle from it.',
        ex: { deg: 35, at: 'P', mirror: false, flip: false, hi: 'wall' } },
      { label: 'Adjacent', note: 'The angle has moved to the top corner, so the same upright side now touches it: it is adjacent.',
        ex: { deg: 35, at: 'Q', mirror: false, flip: false, hi: 'wall' } },
    ],
    gen(r, lv = 1) {
      const deg = int(25, 65, r), hi = pick(['base', 'wall', 'slope', 'base', 'wall'], r);
      return this.q({ deg, at: lv === 3 && r() < 0.5 ? 'Q' : 'P', mirror: lv > 1 && r() < 0.5, flip: lv === 3 && r() < 0.5, hi });
    },
    q({ deg, at, mirror, flip, hi }) {
      const name = hi === 'slope' ? 'hypotenuse' : (at === 'P') === (hi === 'wall') ? 'opposite' : 'adjacent';
      return { deg, at, mirror, flip, hi, text: 'Look from the marked angle θ. What is the highlighted side called?', choices: ['opposite', 'adjacent', 'hypotenuse'], ans: name,
        expr: `(()=>{const V='${at}'==='P'?'P':'Q',ends={base:'PR',wall:'RQ',slope:'PQ'}['${hi}'];return !ends.includes('R')?'hypotenuse':ends.includes(V)?'adjacent':'opposite';})()` };
    },
    work({ hi, ans }) {
      const s = [{ t: 'Is it the side facing the right angle — the longest one?', v: hi === 'slope' ? 'Yes' : 'No', choices: YN }];
      if (hi !== 'slope') s.push({ t: 'Does it touch the marked angle θ?', v: ans === 'adjacent' ? 'Yes' : 'No', choices: YN });
      s.push({ t: 'So it is the', v: ans, choices: ['opposite', 'adjacent', 'hypotenuse'] });
      return s;
    },
    draw({ deg, at, mirror, flip, hi }) {
      const t = Math.tan(deg * RAD);
      return rtri({ b: 10, h: 10 * (at === 'P' ? t : 1 / t), mirror, flip, ang: at, angLabel: 'θ', hi, label: 'A right-angled triangle with one angle marked θ and one side highlighted' });
    },
  },
  {
    id: 'tan-height', world: 'lighthouse', band: '11-14', title: 'Tan: how tall is the tower?',
    hook: 'A boat is 40 m from the lighthouse. The angle up to the lamp is 35°. How tall is the tower — from the boat?',
    idea: 'tan of the angle = opposite ÷ adjacent, so the height is the distance × tan of the angle.',
    why: [
      'Draw the triangle: the boat, the foot of the tower, the lamp. The tower is opposite the 35° angle and the flat sea is adjacent to it. Now draw a smaller triangle with the same 35° angle — say 10 m along and however high it has to be. It is the same shape, just shrunk, so its height ÷ length is the same number as the big one’s.',
      'That number belongs to the angle, not to any one triangle. For 35° it is about 0.7: every right-angled triangle with a 35° angle is about 0.7 times as tall as it is long. The number is called the tangent of 35°, written tan 35°. Calculators know it; here you are given it.',
      'So the height is 40 × 0.7 = 28 m. To go the other way — from the height back to the distance — divide instead: distance = height ÷ tan. The answer is only as good as the given ratio: tan 35° is really 0.7002…, so 28 m is right to the nearest metre.',
    ],
    alg: 'tan θ = opposite ÷ adjacent ⇒ opposite = adjacent × tan θ',
    ex: { deg: 35, d: 40, find: 'h' },
    caseKey: 'find',
    cases: [
      { label: 'Find the height', note: 'The height is opposite and the distance adjacent, so height = distance × tan of the angle.',
        ex: { deg: 35, d: 40, find: 'h' } },
      { label: 'Find the distance', note: 'Going the other way, undo the times: distance = height ÷ tan of the angle.',
        ex: { deg: 27, d: 50, find: 'd' } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        // a real lighthouse: between 6 m and 80 m tall
        for (;;) {
          const [deg, t] = pick(lv === 1 ? TAN.filter(([, x]) => x.den <= 10 && x.num < x.den) : TAN, r);
          const d = t.den * int(lv === 1 ? 2 : 3, lv === 1 ? 10 : 30, r) * (t.den === 1 ? 5 : 1), h = (d * t.num) / t.den;
          if (h >= 6 && h <= 80) return this.q({ deg, d, find: lv === 3 && r() < 0.5 ? 'd' : 'h' });
        }
      });
    },
    q({ deg, d, find }) {
      const t = TAN.find(([x]) => x === deg)[1], h = (d * t.num) / t.den;
      if (find === 'd') return { deg, d, find, text: `The lighthouse is ${h} m tall. From a boat, the angle up to the top is ${deg}°. Using ${say('tan', deg, t)}, how far is the boat from the foot of the tower, in metres?`, expr: `${h}/${t.show}`, ans: d };
      return { deg, d, find, text: `A boat is ${d} m from the foot of the lighthouse. The angle up to the top is ${deg}°. Using ${say('tan', deg, t)}, how tall is the lighthouse, in metres?`, expr: `${d}*${t.show}`, ans: h };
    },
    work({ deg, d, find }) {
      const t = TAN.find(([x]) => x === deg)[1], h = (d * t.num) / t.den;
      const s = [{ t: 'Height is opposite the angle, distance is adjacent. Which ratio links them?', v: 'tan', choices: ['sin', 'cos', 'tan'] }];
      if (find === 'd') s.push({ t: `distance = height ÷ tan ${deg}° = ${h} ÷ ${t.show}`, v: d });
      else s.push({ t: `height = distance × tan ${deg}° = ${d} × ${t.show}`, v: h });
      return s;
    },
    draw({ deg, d, find }) {
      const t = TAN.find(([x]) => x === deg)[1], h = (d * t.num) / t.den;
      return rtri({ b: d, h, ang: 'P', angLabel: `${deg}°`, tower: true, labels: { base: find === 'd' ? '?' : `${d} m`, wall: find === 'h' ? '?' : `${h} m` }, label: 'A boat, the foot of the lighthouse and its lamp make a right-angled triangle' });
    },
  },
  {
    id: 'sin-cos-side', world: 'lighthouse', band: '11-14', title: 'Sin and cos: the ladder',
    hook: 'A 10 m ladder leans on the lighthouse wall at 53° to the ground. How high does it reach? How far out is its foot?',
    idea: 'With the hypotenuse known: opposite = hypotenuse × sin, adjacent = hypotenuse × cos.',
    why: [
      'The ladder is the hypotenuse. Just as with tan, every right-angled triangle with a 53° angle is the same shape, so the height ÷ ladder is the same number for all of them. That number is the sine of 53°, sin 53° — about 0.8. The foot’s distance ÷ ladder is the cosine, cos 53° — about 0.6.',
      'So height = 10 × 0.8 = 8 m, and the foot is 10 × 0.6 = 6 m out. Check with Pythagoras: 6² + 8² = 36 + 64 = 100 = 10². The three ratios all come from the same triangle, so they must agree.',
      'To remember which is which: sin goes with the opposite side, cos with the adjacent side, tan divides those two. Some people say SOH CAH TOA — Sin Opposite over Hypotenuse, Cos Adjacent over Hypotenuse, Tan Opposite over Adjacent. If you know a short side and want the ladder, divide instead: ladder = height ÷ sin.',
    ],
    alg: 'sin θ = opp ÷ hyp · cos θ = adj ÷ hyp ⇒ opp = hyp × sin θ , adj = hyp × cos θ',
    decimals: true, keys: ['.'],
    ex: { deg: 53, L: 10, want: 'up' },
    caseKey: 'want',
    cases: [
      { label: 'Height up the wall: sin', note: 'The height is opposite the angle at the ground, and the ladder is the hypotenuse: height = ladder × sin.',
        ex: { deg: 53, L: 10, want: 'up' } },
      { label: 'Foot from the wall: cos', note: 'The ground side touches the angle — it is adjacent — so use cos: distance = ladder × cos.',
        ex: { deg: 53, L: 10, want: 'out' } },
      { label: 'Ladder from height', note: 'Now the ladder is the unknown. Height = ladder × sin, so undo it: ladder = height ÷ sin.',
        ex: { deg: 30, L: 12, want: 'L-up' } },
      { label: 'Ladder from foot', note: 'The same undoing with the ground side: ladder = distance along the ground ÷ cos.',
        ex: { deg: 37, L: 15, want: 'L-out' } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        // level 1 keeps to the tenths, on a ladder that makes a whole answer;
        // after that any ladder from 2 m to 30 m, and the answer may be a decimal
        for (;;) {
          const [deg, sn, cs] = pick(SINCOS, r);
          const want = lv === 3 && r() < 0.5 ? pick(['L-up', 'L-out'], r) : pick(['up', 'out'], r);
          const den = want.endsWith('up') ? sn.den : cs.den;
          if (lv === 1 && den > 10) continue;
          const L = lv === 1 ? den * int(1, Math.floor(20 / den), r) : int(2, 30, r);
          if (L < 2) continue;
          return this.q({ deg, L, want });
        }
      });
    },
    q({ deg, L, want }) {
      const [, sn, cs] = SINCOS.find(([x]) => x === deg), up = (L * sn.num) / sn.den, out = (L * cs.num) / cs.den;
      const given = `${say('sin', deg, sn)} and ${say('cos', deg, cs)}`;
      if (want === 'up') return { deg, L, want, text: `A ${L} m ladder leans on the lighthouse wall, at ${deg}° to the ground. ${given}. How high up the wall does it reach, in metres?`, expr: `${L}*${sn.show}`, ans: up };
      if (want === 'out') return { deg, L, want, text: `A ${L} m ladder leans on the lighthouse wall, at ${deg}° to the ground. ${given}. How far is its foot from the wall, in metres?`, expr: `${L}*${cs.show}`, ans: out };
      if (want === 'L-up') return { deg, L, want, text: `A ladder leans on the lighthouse wall at ${deg}° to the ground and reaches ${up} m up the wall. ${given}. How long is the ladder, in metres?`, expr: `${up}/${sn.show}`, ans: L };
      return { deg, L, want, text: `A ladder leans on the lighthouse wall at ${deg}° to the ground, with its foot ${out} m from the wall. ${given}. How long is the ladder, in metres?`, expr: `${out}/${cs.show}`, ans: L };
    },
    work({ deg, L, want }) {
      const [, sn, cs] = SINCOS.find(([x]) => x === deg), up = (L * sn.num) / sn.den, out = (L * cs.num) / cs.den;
      const isUp = want.endsWith('up'), f = isUp ? 'sin' : 'cos', r = isUp ? sn : cs;
      const s = [{ t: `The ladder is the hypotenuse. The ${isUp ? 'height up the wall' : 'distance along the ground'} is the side…`, v: isUp ? 'opposite' : 'adjacent', choices: ['opposite', 'adjacent'] },
        { t: 'So the ratio to use is', v: f, choices: ['sin', 'cos'] }];
      if (want.startsWith('L')) s.push({ t: `ladder = ${isUp ? up : out} ÷ ${f} ${deg}° = ${isUp ? up : out} ÷ ${r.show}`, v: L });
      else s.push({ t: `${L} × ${f} ${deg}° = ${L} × ${r.show}`, v: isUp ? up : out });
      return s;
    },
    draw({ deg, L, want }) {
      const [, sn, cs] = SINCOS.find(([x]) => x === deg), up = (L * sn.num) / sn.den, out = (L * cs.num) / cs.den;
      const labels = want === 'up' ? { slope: `${L} m`, wall: '?' } : want === 'out' ? { slope: `${L} m`, base: '?' } : want === 'L-up' ? { slope: '?', wall: `${up} m` } : { slope: '?', base: `${out} m` };
      return rtri({ b: Math.cos(deg * RAD), h: Math.sin(deg * RAD), ang: 'P', angLabel: `${deg}°`, tower: true, labels, label: 'A ladder leaning on the lighthouse wall' });
    },
  },
  {
    id: 'special-angles', world: 'lighthouse', band: '11-14', title: 'The three special angles',
    hook: 'sin x = 1/2. Which angle is x — and can you know without a calculator?',
    idea: 'Two triangles hold the exact ratios: half a square (45°) and half an equilateral triangle (30° and 60°).',
    why: [
      'Cut a square of side 1 along its diagonal. Each half is a right-angled triangle with two sides of 1 and two angles of 45°. Its hypotenuse is √2, by Pythagoras (1² + 1² = 2). So tan 45° = 1 ÷ 1 = 1, and sin 45° = cos 45° = 1 ÷ √2.',
      'Now take an equilateral triangle of side 2 — all three angles are 60° — and cut it down the middle. Each half has a hypotenuse of 2, a bottom of 1, and a height of √3 (because 1² + 3 = 4 = 2²). The angles are 60° at the bottom, 30° at the top (half of 60°), and the right angle.',
      'Read the ratios off it. From the 30° corner, the side opposite is the short one, 1: sin 30° = 1/2. From the 60° corner, that same side of 1 is adjacent: cos 60° = 1/2. And tan 60° = √3 ÷ 1 = √3. Every one of these is exact, and every one is a proof you can draw on the back of an envelope.',
    ],
    alg: 'sin 30° = cos 60° = 1/2 · sin 45° = cos 45° = 1/√2 · tan 45° = 1 · sin 60° = cos 30° = √3/2 · tan 60° = √3 · tan 30° = 1/√3',
    ex: { f: 'sin', i: 0 },
    caseKey: 'f',
    cases: [
      { label: 'Sin: opposite ÷ hypotenuse', note: 'In the half-equilateral, the short side 1 over the hypotenuse 2 is a half — and 1 is opposite the 30° corner.',
        ex: { i: 0 } },
      { label: 'Cos: adjacent ÷ hypotenuse', note: 'The same 1 over 2 — but for cos the side must TOUCH the angle, and it touches the 60° corner.',
        ex: { i: 1 } },
      { label: 'Tan: opposite ÷ adjacent', note: 'Tan is 1 when the two short sides are equal — and that only happens in the half-square, at 45°.',
        ex: { i: 2 } },
    ],
    gen(r, lv = 1) {
      const pool = lv === 1 ? [0, 1, 2] : lv === 2 ? [0, 1, 2, 3, 4, 7] : [0, 1, 2, 3, 4, 5, 6, 7, 8];
      return this.q({ i: pick(pool, r) });
    },
    q({ i }) {
      const [f, show, val, deg, tri] = SPECIAL[i];
      return { i, f, text: `${f} x = ${show}, and x is between 0° and 90°. What is x?`, say: `${f} x equals ${show.replace('√', 'root ')}`, choices: ['30°', '45°', '60°'], ans: `${deg}°`,
        expr: `['30°','45°','60°'].find((s)=>Math.abs(Math.${f}(parseInt(s)*Math.PI/180)-(${val}))<1e-9)`, tri };
    },
    work({ i }) {
      const [f, show, , deg, tri] = SPECIAL[i];
      return [
        { t: `Which triangle has sides that give ${show}: the half-square (1, 1, √2) or the half-equilateral (1, √3, 2)?`, v: tri, choices: ['half-square', 'half-equilateral'] },
        { t: `In it, which angle has ${f} = ${show}?`, v: `${deg}°`, choices: ['30°', '45°', '60°'] },
      ];
    },
    draw() {
      const k = 90, sq = { P: [20, 150], R: [20 + k, 150], Q: [20 + k, 150 - k] }, h3 = Math.sqrt(3);
      const eq = { P: [190, 150], R: [190 + k * h3 * 0.9, 150], Q: [190 + k * h3 * 0.9, 150 - k * 0.9] };
      const tri = (t, cls) => `<polygon points="${[t.P, t.R, t.Q].map((p) => p.map(R2).join(',')).join(' ')}" class="${cls}"/>`
        + `<polyline points="${R2(t.R[0] - 11)},${t.R[1]} ${R2(t.R[0] - 11)},${t.R[1] - 11} ${R2(t.R[0])},${t.R[1] - 11}" class="dg-thin" fill="none"/>`;
      let s = tri(sq, 'dg-fill3') + tri(eq, 'dg-fill1');
      s += text(20 + k / 2, 170, '1', 'dg-text') + text(20 + k + 12, 150 - k / 2 + 5, '1', 'dg-text', 'start') + text(20 + k / 2 - 12, 150 - k / 2 - 6, '√2', 'dg-text', 'end');
      s += text(190 + (k * h3 * 0.9) / 2, 170, '√3', 'dg-text') + text(190 + k * h3 * 0.9 + 12, 150 - (k * 0.9) / 2 + 5, '1', 'dg-text', 'start') + text(190 + (k * h3 * 0.9) / 2 - 10, 150 - (k * 0.9) / 2 - 8, '2', 'dg-text', 'end');
      s += text(20 + k / 2, 22, 'half a square', 'dg-small') + text(190 + (k * h3 * 0.9) / 2, 22, 'half an equilateral triangle', 'dg-small');
      return svg(370, 182, s, 'Half a square with sides 1, 1 and root 2; half an equilateral triangle with sides 1, root 3 and 2');
    },
  },
  {
    id: 'bearings', world: 'lighthouse', band: '11-14', title: 'Bearings: the way back',
    hook: 'A ship leaves the lighthouse on a bearing of 065°. What bearing brings it straight home?',
    idea: 'A bearing is measured clockwise from north, in three figures; the way back is the way out ± 180°.',
    why: [
      'A bearing says which way to go by one number: stand facing north, turn clockwise, and say how many degrees you turned. East is 090°, south is 180°, west is 270°. Bearings are always written with three figures — 065°, not 65° — so a number shouted across a windy deck cannot be misheard as a different one.',
      'The way back is exactly the opposite direction: half a turn, 180°, from the way out. From 065°, turn another 180° and you face 245°. If the way out is already more than 180°, adding would go past a whole turn, so take 180 away instead: the way back from 300° is 120°.',
      'Check it with a picture: north and south are opposite, and so are east and west. 090° and 270° differ by 180°, and so must any bearing and its way back. The back bearing is always the other number of the pair.',
    ],
    alg: 'back bearing = bearing + 180° (if under 180°) , bearing − 180° (if over 180°)',
    ex: { out: 65 },
    caseKey: 'turn',
    cases: [
      { label: 'Out under 180°: add', note: 'Half a turn more still fits inside a whole turn, so add 180°.',
        ex: { out: 65 } },
      { label: 'Out over 180°: take away', note: 'Adding 180° would go past 360°, all the way round. Take 180° away instead to face the opposite way.',
        ex: { out: 300 } },
    ],
    gen(r, lv = 1) {
      const out = lv === 1 ? int(1, 35, r) * 5 : lv === 2 ? int(37, 71, r) * 5 : pick([int(1, 179, r), int(181, 359, r)], r);
      return this.q({ out });
    },
    q({ out }) {
      return { out, turn: out < 180 ? 'add' : 'take', text: `A ship leaves the lighthouse on a bearing of ${pad3(out)}°. What bearing takes it straight back? Type the number of degrees (a leading zero is fine either way).`,
        say: `A ship leaves on a bearing of ${pad3(out).split('').join(' ')} degrees. What bearing takes it straight back?`,
        expr: `(${out}+180)%360`, ans: out < 180 ? out + 180 : out - 180 };
    },
    work({ out }) {
      return [{ t: `Is ${pad3(out)}° less than 180°?`, v: out < 180 ? 'Yes' : 'No', choices: YN },
        out < 180 ? { t: `So add half a turn: ${out} + 180`, v: out + 180 } : { t: `So take half a turn away: ${out} − 180`, v: out - 180 }];
    },
    draw({ out }) { return compass(out); },
  },
  {
    id: 'scatter-correlation', world: 'lighthouse', band: '11-14', title: 'Scatter graphs and correlation',
    hook: 'Twelve nights of the keeper’s log, plotted as dots. Do the two readings rise together, fall together, or have nothing to do with each other?',
    idea: 'If the dots drift up to the right the correlation is positive; down to the right, negative; a shapeless cloud, none.',
    why: [
      'A scatter graph puts one reading along the bottom and another up the side, and each night becomes one dot. If nights with a big x tend to have a big y, the cloud of dots leans up to the right: positive correlation. If a big x tends to come with a small y, it leans down: negative correlation. If knowing x tells you nothing about y, the dots make a round, shapeless cloud: no correlation.',
      'The closer the dots crowd round a straight line, the stronger the correlation. Statisticians measure it with a number called r, between −1 and 1: near 1 is strong positive, near −1 strong negative, near 0 none. Every graph on this stop was checked: the strong ones have r beyond ±0.7 and the “none” ones have r between −0.2 and 0.2.',
      'Correlation is not cause. Ice-cream sales and sunburn rise together, but ice cream does not burn anyone — hot sunny days cause both. A scatter graph shows that two things move together; it can never, on its own, show that one makes the other happen.',
    ],
    alg: 'up to the right: positive · down to the right: negative · no lean: none (−1 ≤ r ≤ 1)',
    ex: { kind: 'positive', pts: EX_SCATTER },
    caseKey: 'ans',
    cases: [
      { label: 'Positive', note: 'The dots lean up to the right: the bigger one reading, the bigger the other tends to be.',
        ex: { kind: 'positive', pts: EX_SCATTER } },
      { label: 'Negative', note: 'The dots lean down to the right: as one reading grows, the other tends to shrink.',
        ex: { kind: 'negative', pts: EX_SCATTER_NEG } },
      { label: 'None', note: 'A round, shapeless cloud with no lean either way. Knowing one reading tells you nothing about the other.',
        ex: { kind: 'none', pts: EX_SCATTER_NONE } },
    ],
    gen(r, lv = 1) { const kind = pick(CORRS, r); return this.q({ kind, pts: scatterPts(kind, r, lv) }); },
    q({ kind, pts }) {
      return { kind, pts, text: `The keeper logs two readings on each of ${pts.length} nights and plots them. What correlation does the scatter graph show?`, choices: CORRS, ans: kind,
        expr: `((c)=>c>${BOUND.strong}?'positive':c<-${BOUND.strong}?'negative':Math.abs(c)<${BOUND.none}?'none':'too weak to call')(${CORR}(${JSON.stringify(pts)}))` };
    },
    work({ kind }) {
      return [{ t: 'Reading left to right, do the dots tend to go up, go down, or neither?', v: kind === 'positive' ? 'up' : kind === 'negative' ? 'down' : 'neither', choices: ['up', 'down', 'neither'] },
        { t: 'So the correlation is', v: kind, choices: CORRS }];
    },
    draw({ pts }) { return plot(pts, 10); },
  },
  {
    id: 'best-fit-estimate', world: 'lighthouse', band: '11-14', title: 'The line of best fit',
    hook: 'The line of best fit goes through (4, 6) and (12, 10). What does it say y is when x = 8?',
    idea: 'Find how much y changes for each 1 across, then walk along the line from a point you know.',
    why: [
      'When a scatter graph has a strong correlation, a single straight line drawn through the middle of the dots — with about as many dots above it as below — sums up the trend. It is called the line of best fit, and you can use it to estimate a y for an x you never measured.',
      'A straight line climbs by the same amount for every step across. From (4, 6) to (12, 10), x goes 8 across and y goes up 4, so y goes up 4 ÷ 8 = 0.5 for each 1 across. At x = 8 you are 4 across from x = 4, so y = 6 + 4 × 0.5 = 8.',
      'Estimating inside the data (interpolation) is fairly safe: the dots are right there around the line. Estimating outside the data (extrapolation) is risky: nobody measured there, and the trend may bend or stop. The arithmetic is the same, but trust the answer less — the line is a summary of the dots, not a law of nature.',
    ],
    alg: 'gradient m = (y₂ − y₁) ÷ (x₂ − x₁) ; y = y₁ + (x − x₁) × m',
    decimals: true, keys: ['.', '−'],
    ex: { x1: 4, y1: 6, x2: 12, y2: 10, x0: 8 },
    caseKey: 'idea',
    cases: [
      { label: 'Inside the data', note: 'Work out how much y climbs for each 1 across, then walk along from a point you know.',
        ex: { x1: 4, y1: 6, x2: 12, y2: 10, x0: 8 } },
      { label: 'A falling line', note: 'When the line goes down, y changes by a negative amount for each step across — so walking right makes y smaller.',
        ex: { x1: 2, y1: 16, x2: 10, y2: 12, x0: 6 } },
      { label: 'Beyond the data', note: 'The sum is the same, but nobody measured out here. That is extrapolation: the trend may bend or stop, so trust it less.',
        ex: { x1: 4, y1: 6, x2: 12, y2: 10, x0: 18 } },
    ],
    gen(r, lv = 1) {
      const ms = lv === 1 ? [0.5, 1, 2] : [0.5, 1, 1.5, 2, -0.5, -1, -1.5, -2];
      return fresh(() => {
        for (;;) {
          const m = pick(ms, r), x1 = 2 * int(0, 5, r), x2 = x1 + 2 * int(3, 6, r);
          if (x2 > 20) continue;
          const x0 = lv === 3 ? 2 * pick([...Array(11).keys()].filter((i) => 2 * i < x1 || 2 * i > x2), r) : 2 * int(x1 / 2 + 1, x2 / 2 - 1, r);
          if (!Number.isFinite(x0)) continue;
          const y1 = int(0, 20, r), f = (x) => y1 + m * (x - x1);
          if ([x1, x2, x0].some((x) => f(x) < 0 || f(x) > 20)) continue;
          return this.q({ x1, y1, x2, y2: f(x2), x0 });
        }
      });
    },
    q({ x1, y1, x2, y2, x0 }) {
      const out = x0 < x1 || x0 > x2;
      return { x1, y1, x2, y2, x0, idea: out ? 'beyond' : y2 < y1 ? 'falls' : 'rises', text: `A line of best fit passes through (${x1}, ${y1}) and (${x2}, ${y2}). Use the line to estimate y when x = ${x0}.${out ? ` The data only runs from x = ${x1} to x = ${x2}.` : ''}`,
        expr: `${y2}-(${y2}-(${y1}))*(${x2}-(${x0}))/(${x2}-(${x1}))`, ans: y1 + ((y2 - y1) * (x0 - x1)) / (x2 - x1) };
    },
    work({ x1, y1, x2, y2, x0 }) {
      const m = (y2 - y1) / (x2 - x1), dx = x0 - x1, out = x0 < x1 || x0 > x2;
      return [
        { t: `From x = ${x1} to x = ${x2}, how much does y change? (use − if it falls)`, v: y2 - y1 },
        { t: `So for each 1 across, y changes by ${N(y2 - y1)} ÷ ${x2 - x1}`, v: m },
        { t: `x = ${x0} is ${N(dx)} across from x = ${x1}: ${y1} + (${N(dx)}) × (${N(m)})${out ? ' — an extrapolation, so trust it less' : ''}`, v: y1 + dx * m },
      ];
    },
    draw({ x1, y1, x2, y2 }) {
      const r = seeded(`fit ${x1},${y1},${x2},${y2}`), m = (y2 - y1) / (x2 - x1), pts = [];
      for (let i = 0; i < 12; i++) { const x = x1 + (x2 - x1) * r(); pts.push([R1(x), R1(Math.max(0.2, Math.min(19.8, y1 + m * (x - x1) + 2.4 * (r() - 0.5))))]); }
      return plot(pts, 20, { x1, y1, x2, y2 }, [[x1, y1], [x2, y2]], 4);
    },
  },
  {
    id: 'tree-diagram', world: 'lighthouse', band: '11-14', title: 'Tree diagrams',
    hook: 'The morning ferry is late 1 time in 4, the evening ferry 2 times in 5. What is the chance both are late?',
    idea: 'Multiply along the branches for one path; add the paths when more than one path counts.',
    why: [
      'A tree diagram draws every way two chancy things can turn out. The first event splits into branches, each labelled with its chance, and every branch splits again for the second event. Each path from the root to a tip is one complete story — late then on time, say — and the paths cover everything that can happen.',
      'Why multiply? Think of 100 days. The morning ferry is late on 1/4 of them: 25 days. On 2/5 of those 25, the evening ferry is late as well: 10 days. So both are late on 10 days in 100 — 1/10 — and 1/4 × 2/5 = 2/20 = 1/10. Taking a fraction of a fraction is multiplying. (This works when the second chance is the same whatever the first did; here it is.)',
      'Why add? “Exactly one is late” can happen in two different ways — late then on time, or on time then late. Those paths never happen together, so their chances simply add. The chances on all four tips add up to 1, because between them they are everything that can happen.',
    ],
    alg: 'P(A and B) = P(A) × P(B) (independent) · P(one path or another) = sum of the paths',
    frac: true, keys: ['/'],
    ex: { e: 0, p1: [1, 4], p2: [2, 5], ask: 'yy' },
    caseKey: 'route',
    cases: [
      { label: 'One path: multiply', note: 'Follow the one path where both happen, and multiply the chances along it — a fraction of a fraction.',
        ex: { e: 0, p1: [1, 4], p2: [2, 5], ask: 'yy' } },
      { label: 'A "not" branch', note: 'The other branch is whatever is left of 1: late 1/4 means on time 3/4. Find it first, then multiply along.',
        ex: { e: 0, p1: [1, 4], p2: [2, 5], ask: 'yn' } },
      { label: 'Two paths: add', note: 'Exactly one late can happen two ways. Multiply along each path, then add the two, because either will do.',
        ex: { e: 0, p1: [1, 4], p2: [2, 5], ask: 'one' } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const p1 = prob(r, lv === 1 ? 6 : 10), p2 = prob(r, lv === 1 ? 6 : 10);
        const ask = lv === 1 ? 'yy' : lv === 2 ? pick(['yy', 'yn', 'ny', 'nn'], r) : pick(['one', 'same'], r);
        return this.q({ e: int(0, EVENTS.length - 1, r), p1, p2, ask });
      });
    },
    q({ e, p1, p2, ask }) {
      const E = EVENTS[e], [a, b] = p1, [c, d] = p2;
      const pa = (y) => (y ? a : b - a), pc = (y) => (y ? c : d - c);
      let num;
      const what = ask === 'one' ? E.one : ask === 'same' ? E.same : `the ${E.names[0]} ${ask[0] === 'y' ? E.yes : E.no} and the ${E.names[1]} ${ask[1] === 'y' ? E.yes : E.no}`;
      if (ask === 'one') num = pa(1) * pc(0) + pa(0) * pc(1);
      else if (ask === 'same') num = pa(1) * pc(1) + pa(0) * pc(0);
      else num = pa(ask[0] === 'y') * pc(ask[1] === 'y');
      // the independent route: count the cells of a b-by-d grid
      const cell = ask === 'one' ? '(i<A)!==(j<C)' : ask === 'same' ? '(i<A)===(j<C)' : `(i<A)===${ask[0] === 'y'}&&(j<C)===${ask[1] === 'y'}`;
      return { e, p1, p2, ask, route: ask === 'yy' ? 'path' : ask.length === 2 ? 'not' : 'add', frac: true, ans: fr(num, b * d),
        text: `The chance that the ${E.names[0]} ${E.yes} is ${fr(a, b)}. The chance that the ${E.names[1]} ${E.yes} is ${fr(c, d)}, whatever the first one does. What is the chance that ${what}?`,
        expr: `((A,B,C,D)=>{let k=0;for(let i=0;i<B;i++)for(let j=0;j<D;j++)if(${cell})k++;return k/(B*D);})(${a},${b},${c},${d})` };
    },
    work({ e, p1, p2, ask }) {
      const E = EVENTS[e], [a, b] = p1, [c, d] = p2, W = E.words;
      const f1 = (y) => fr(y ? a : b - a, b), f2 = (y) => fr(y ? c : d - c, d);
      const path = (y1, y2) => fr((y1 ? a : b - a) * (y2 ? c : d - c), b * d);
      if (ask === 'one' || ask === 'same') {
        const [p, q] = ask === 'one' ? [[1, 0], [0, 1]] : [[1, 1], [0, 0]];
        return [
          { t: `Path ${W[p[0] ? 0 : 1]} then ${W[p[1] ? 0 : 1]}: ${f1(p[0])} × ${f2(p[1])}`, v: path(p[0], p[1]) },
          { t: `Path ${W[q[0] ? 0 : 1]} then ${W[q[1] ? 0 : 1]}: ${f1(q[0])} × ${f2(q[1])}`, v: path(q[0], q[1]) },
          { t: 'Either path will do, so add them', v: fr((p[0] ? a : b - a) * (p[1] ? c : d - c) + (q[0] ? a : b - a) * (q[1] ? c : d - c), b * d) },
        ];
      }
      const y1 = ask[0] === 'y', y2 = ask[1] === 'y';
      return [
        { t: `The chance on the “${W[y1 ? 0 : 1]}” branch for the ${E.names[0]}`, v: f1(y1) },
        { t: `The chance on the “${W[y2 ? 0 : 1]}” branch for the ${E.names[1]}`, v: f2(y2) },
        { t: 'Multiply along the path', v: path(y1, y2) },
      ];
    },
    draw({ e, p1, p2 }) { const E = EVENTS[e]; return tree(p1, p2, E.words, E.names); },
  },
  {
    id: 'expected-frequency', world: 'lighthouse', band: '11-14', title: 'Expected frequency',
    hook: 'The logbook says it rains on 3 nights in every 10. How many wet nights should the keeper plan for in the next 60?',
    idea: 'Expected number = probability × number of trials: take that fraction of the trials.',
    why: [
      'A probability is a long-run share. A chance of rain of 3/10 means that, over many, many nights, about 3 in every 10 are wet. So in 60 nights you expect 3/10 of 60: split the 60 nights into tens — 6 of them — with 3 wet nights in each, 18 altogether. That is all expected frequency is: the probability × the number of trials.',
      'Expected does not mean promised. Toss a coin 60 times and you expect 30 heads, but you might easily get 27, or 34 — every toss is still chancy. Real counts wobble around the expected number, sometimes above and sometimes below. What you can count on is the middle they wobble round: the more trials, the closer the share of heads creeps to 1/2, even though the count is rarely exactly half.',
      'It works however the chance is written. On a die, count the faces that win first: “a 5 or a 6” is 2 faces out of 6, so the chance is 2/6 = 1/3. A decimal is a fraction too: 0.15 is 15 hundredths, or 3/20, so in 200 nights expect 200 ÷ 20 × 3 = 30. And for two things at once, multiply along the tree-diagram path first, then take that share of the trials: ferries late 1/4 and 2/5 of the time make both late 1/10 of the time — about 20 days in 200.',
    ],
    alg: 'expected frequency = P(event) × number of trials',
    keys: ['/', '.'],
    ex: { kind: 'log', k: 3, n: 10, T: 60, w: 0 },
    caseKey: 'given',
    cases: [
      { label: 'A fraction chance', note: 'Split the trials into equal groups — the bottom of the fraction — and take the top number of those groups.',
        ex: { kind: 'log', k: 3, n: 10, T: 60, w: 0 } },
      { label: 'Faces of a die', note: 'The chance is not written down: count the faces that win, out of 6, and simplify before you share.',
        ex: { kind: 'die', i: 2, T: 60 } },
      { label: 'A decimal chance', note: 'A decimal is a fraction in disguise: 0.15 is 15 hundredths, which is 3/20.',
        ex: { kind: 'dec', c: 15, ship: false, T: 200 } },
      { label: 'Two things at once', note: 'Multiply along the tree-diagram path first to get one chance, then take that share of the trials.',
        ex: { kind: 'tree', e: 0, p1: [1, 4], p2: [2, 5], ask: 'yy', T: 200 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const kind = lv === 1 ? pick(['spin', 'die', 'log'], r) : lv === 2 ? pick(['log', 'dec', 'dec', 'spin'], r) : pick(['tree', 'tree', 'dec'], r);
        if (kind === 'spin') { const n = int(3, 8, r), k = int(1, n - 1, r); return this.q({ kind, n, k, T: n * int(lv === 1 ? 2 : 5, lv === 1 ? 12 : 30, r) }); }
        if (kind === 'die') return this.q({ kind, i: int(0, DIE.length - 1, r), T: 6 * int(3, 20, r) });
        if (kind === 'log') { const n = pick([4, 5, 8, 10], r); let k; do k = int(1, n - 1, r); while (gcd(k, n) !== 1); return this.q({ kind, k, n, w: int(0, LOGW.length - 1, r), T: n * int(lv === 1 ? 3 : 6, lv === 1 ? 15 : 40, r) }); }
        if (kind === 'dec') { const c = pick(DEC, r), den = 100 / gcd(c, 100); return this.q({ kind, c, ship: r() < 0.5, T: den * int(2, Math.floor(400 / den), r) }); }
        const p1 = prob(r, 6), p2 = prob(r, 6);
        return this.q({ kind, e: pick([0, 2], r), p1, p2, ask: pick(['yy', 'yn', 'ny', 'nn'], r), T: p1[1] * p2[1] * int(2, 10, r) });
      });
    },
    q(o) {
      const { kind, T } = o;
      o = { ...o, given: kind === 'spin' || kind === 'log' ? 'fraction' : kind === 'die' ? 'faces' : kind === 'dec' ? 'decimal' : 'tree' };
      if (kind === 'spin') return { ...o, text: `A spinner has ${o.n} equal sections, and ${o.k} of them are shaded. It is spun ${T} times. How many times would you expect it to land on a shaded section?`,
        expr: `${T}*${o.k}/${o.n}`, ans: (T / o.n) * o.k };
      if (kind === 'die') { const [k, cond, say] = DIE[o.i]; return { ...o, text: `A fair die is rolled ${T} times. How many times would you expect to roll ${say}?`,
        expr: `${T}*[1,2,3,4,5,6].filter((f)=>${cond}).length/6`, ans: (T / 6) * k }; }
      if (kind === 'log') { const [w, nights] = LOGW[o.w]; return { ...o, text: `The keeper’s logbook shows ${w} on ${o.k} night${o.k > 1 ? 's' : ''} in every ${o.n}. How many ${nights} would you expect in the next ${T} nights?`,
        expr: `${T}*${o.k}/${o.n}`, ans: (T / o.n) * o.k }; }
      if (kind === 'dec') { const p = String(o.c / 100), den = 100 / gcd(o.c, 100), num = o.c / gcd(o.c, 100);
        return { ...o, text: o.ship ? `The chance that a passing ship signals to the lighthouse is ${p}. ${T} ships pass. How many would you expect to signal?`
          : `The chance of fog on any night is ${p}. How many foggy nights would you expect in ${T} nights?`, expr: `${T}*${p}`, ans: (T / den) * num }; }
      const E = EVENTS[o.e], [a, b] = o.p1, [c, d] = o.p2, pa = (y) => (y ? a : b - a), pc = (y) => (y ? c : d - c);
      const y1 = o.ask[0] === 'y', y2 = o.ask[1] === 'y', num = pa(y1) * pc(y2), trials = o.e === 0 ? 'days' : 'fishing trips';
      const cell = `(i<A)===${y1}&&(j<C)===${y2}`;
      return { ...o, text: `The chance that the ${E.names[0]} ${E.yes} is ${fr(a, b)}. The chance that the ${E.names[1]} ${E.yes} is ${fr(c, d)}, whatever the first one does. Over ${T} ${trials}, how many times would you expect this: the ${E.names[0]} ${y1 ? E.yes : E.no} and the ${E.names[1]} ${y2 ? E.yes : E.no}?`,
        expr: `${T}*((A,B,C,D)=>{let k=0;for(let i=0;i<B;i++)for(let j=0;j<D;j++)if(${cell})k++;return k/(B*D);})(${a},${b},${c},${d})`, ans: (T / (b * d)) * num };
    },
    work(o) {
      const { kind, T } = o;
      let num, den, first;
      if (kind === 'spin' || kind === 'log' || kind === 'die') {
        const [k, n] = kind === 'die' ? [DIE[o.i][0], 6] : [o.k, o.n];
        [num, den] = fr(k, n).split('/').map(Number);
        first = { t: kind === 'die' ? `The chance: winning faces out of 6, in its simplest form` : `The chance as a fraction: ${k} out of ${n}, in its simplest form`, v: fr(k, n) };
      } else if (kind === 'dec') {
        [num, den] = fr(o.c, 100).split('/').map(Number);
        first = { t: `${o.c / 100} as a fraction in its simplest form`, v: fr(o.c, 100) };
      } else {
        const [a, b] = o.p1, [c, d] = o.p2, y1 = o.ask[0] === 'y', y2 = o.ask[1] === 'y';
        const f1 = fr(y1 ? a : b - a, b), f2 = fr(y2 ? c : d - c, d), path = fr((y1 ? a : b - a) * (y2 ? c : d - c), b * d);
        [num, den] = path.split('/').map(Number);
        first = { t: `Multiply along the path: ${f1} × ${f2}`, v: path };
      }
      const s = [first, { t: `Share the ${T} trials into ${den} equal parts: ${T} ÷ ${den}`, v: T / den }];
      if (num > 1) s.push({ t: `Take ${num} of those parts: ${T / den} × ${num}`, v: (T / den) * num });
      return s;
    },
    draw(o) {
      if (o.kind === 'spin') return pie(o.n, o.k);
      if (o.kind === 'die') return faces(DIE[o.i][1]);
      if (o.kind === 'log') return fracBar(o.n, o.k);
      if (o.kind === 'dec') { const g = gcd(o.c, 100); return fracBar(100 / g, o.c / g); }
      const E = EVENTS[o.e]; return tree(o.p1, o.p2, E.words, E.names);
    },
  },
  {
    id: 'inequalities', world: 'lighthouse', band: '11-14', title: 'Inequalities',
    hook: '3x + 4 < 19. Not one answer this time — a whole range of them. What is the biggest whole number that works?',
    idea: 'Solve it like an equation, doing the same to both sides — but if you multiply or divide by a negative, turn the sign round.',
    why: [
      'An inequality is a balance that is tipped: 3x + 4 < 19 says the left pan is lighter. Take 4 off both pans and it is still lighter: 3x < 15. Share both pans into 3 and each third is still lighter: x < 5. So any number below 5 works — 4, 3, 0, −10, even 4.9 — and the biggest whole number that works is 4. Not 5: 3 × 5 + 4 is exactly 19, and 19 is not less than 19.',
      '< means “less than” and ≤ means “less than or equal to”. So 3x + 4 ≤ 19 gives x ≤ 5, and now 5 itself is allowed.',
      'The one trap: multiplying or dividing by a negative number flips the inequality round. On a number line, 2 < 6. Times both by −1 and you get −2 and −6 — and −2 is the higher one: −2 > −6. Multiplying by a negative mirrors the line, so the order reverses. That is why −2x < 6 means x > −3, not x < −3: try x = 0, and −2 × 0 = 0 is indeed less than 6.',
    ],
    alg: 'a·x + b < c ⇒ x < (c − b) ÷ a if a > 0 ; x > (c − b) ÷ a if a < 0',
    keys: ['−'],
    ex: { a: 3, b: 4, op: '<', k: 5, form: 'num' },
    caseKey: 'idea',
    cases: [
      { label: 'Less than: the largest', note: 'Solve it like an equation. x < 5 lets in 4 but not 5 itself, so the largest whole number is one below.',
        ex: { a: 3, b: 4, op: '<', k: 5, form: 'num' } },
      { label: 'More than: the smallest', note: 'Now the answers run upwards, so look for the smallest. x > 4 does not include 4, so start one above.',
        ex: { a: 2, b: 3, op: '>', k: 4, form: 'num' } },
      { label: 'Or equal to', note: '≤ and ≥ include the edge itself, so the boundary number is allowed this time.',
        ex: { a: 3, b: 4, op: '<=', k: 5, form: 'num' } },
      { label: 'The whole answer', note: 'The answer is a whole range, written like x ≥ 3. Dividing by a positive number, the sign stays the one you started with.',
        ex: { a: 4, b: -2, op: '>=', k: 3, form: 'set' } },
      { label: 'Dividing by a negative', note: 'Dividing both sides by a negative number mirrors the number line, so the sign turns round: < becomes >.',
        ex: { a: -2, b: 1, op: '<', k: -3, form: 'num' } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const a = lv === 3 ? -int(2, 9, r) : int(2, lv === 1 ? 6 : 9, r);
        const k = lv === 1 ? int(3, 12, r) : int(-9, 15, r), b = lv === 1 ? int(1, 20, r) : int(-20, 20, r) || 3;
        const op = lv === 1 ? pick(['<', '>'], r) : pick(['<', '<=', '>', '>='], r);
        return this.q({ a, b, op, k, form: lv === 1 ? 'num' : lv === 2 ? pick(['num', 'set'], r) : pick(['set', 'set', 'num'], r) });
      });
    },
    q({ a, b, op, k, form }) {
      const c = a * k + b, sol = a < 0 ? FLIP[op] : op, t = `${lhs(a, b)} ${OPS[op][0]} ${N(c)}`;
      const idea = a < 0 ? 'flip' : form === 'set' ? 'set' : op.length === 2 ? 'equal' : op === '<' ? 'below' : 'above';
      const test = `(x)=>${a}*x+(${b})${OPS[op][1]}${c}`;
      if (form === 'set') {
        return { a, b, op, k, form, idea, text: `Solve ${t}. Which of these is the answer?`, choices: ['<', '<=', '>', '>='].map((o) => setLabel(o, k)), ans: setLabel(sol, k),
          expr: `((f)=>{const s=(o)=>'x '+o+' ${N(k)}';return f(${k - 1})&&!f(${k + 1})?(f(${k})?s('≤'):s('<')):(f(${k})?s('≥'):s('>'));})(${test})` };
      }
      const big = sol === '<' || sol === '<=';
      return { a, b, op, k, form, idea, text: `${t}. What is the ${big ? 'largest' : 'smallest'} integer x that makes this true?`,
        ans: sol === '<' ? k - 1 : sol === '>' ? k + 1 : k,
        expr: `((f)=>{const ok=[];for(let x=-200;x<=200;x++)if(f(x))ok.push(x);return ${big ? 'ok[ok.length-1]' : 'ok[0]'};})(${test})` };
    },
    work({ a, b, op, k, form, ans, choices }) {
      const c = a * k + b, sol = a < 0 ? FLIP[op] : op;
      const s = [
        { t: b >= 0 ? `Take ${b} from both sides: ${N(c)} − ${b}` : `Add ${-b} to both sides: ${N(c)} + ${-b}`, v: c - b },
        { t: `Divide both sides by ${N(a)}: ${N(c - b)} ÷ ${a < 0 ? `(${N(a)})` : a}`, v: k },
        { t: `Did you divide by a negative number, so the sign turns round?`, v: a < 0 ? 'Yes' : 'No', choices: YN },
      ];
      if (form === 'set') s.push({ t: 'So the answer is', v: ans, choices });
      else s.push({ t: `${setLabel(sol, k)}, so the ${sol[0] === '<' ? 'largest' : 'smallest'} integer is`, v: ans });
      return s;
    },
  },
];

/* sin, cos or tan · the ratio as shown · its exact value · the angle · the triangle it comes from */
const SPECIAL = [
  ['sin', '1/2', '1/2', 30, 'half-equilateral'], ['cos', '1/2', '1/2', 60, 'half-equilateral'], ['tan', '1', '1', 45, 'half-square'],
  ['sin', '1/√2', '1/Math.SQRT2', 45, 'half-square'], ['cos', '1/√2', '1/Math.SQRT2', 45, 'half-square'],
  ['sin', '√3/2', 'Math.sqrt(3)/2', 60, 'half-equilateral'], ['cos', '√3/2', 'Math.sqrt(3)/2', 30, 'half-equilateral'],
  ['tan', '√3', 'Math.sqrt(3)', 60, 'half-equilateral'], ['tan', '1/√3', '1/Math.sqrt(3)', 30, 'half-equilateral'],
];

/* ================================================================ stories */

