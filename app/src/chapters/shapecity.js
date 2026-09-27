/* shapecity.js — Shape City: flat shapes, solid shapes, angles, symmetry,
   circles and coordinates. The contract is docs/CHAPTER-CONTRACT.md.

   Every picture here is drawn from the same numbers the question is built
   from, so the drawing can never disagree with the sum. Where a stop names a
   shape, `expr` works the name out from its properties (or, for symmetry,
   by actually reflecting the drawn corners), never from the name itself. */

import { int, pick, shuffle } from '../rand.js';
import { poly, angle, coords, svg, text } from './kit.js';

export const WORLD = {
  id: 'shapecity', name: 'Shape City', short: 'Shape City', band: '6-7',
  blurb: 'Sides, corners, angles and circles — and why every shape rule has to be true.',
  tint: '#E3F1FB', ink: '#16305E', glyph: '🔺',
};

/* ------------------------------------------------------------ helpers */

const nums = (s) => s.split(/[^0-9./]/);
const leaks = (q) => !q.choices && String(q.ans).length > 1 && nums(q.text).includes(String(q.ans));
/* Try a generator until its prompt does not show its own answer. */
function fresh(make) { let q; for (let i = 0; i < 60; i++) { q = make(); if (!leaks(q)) return q; } return q; }
/* The answer and up to three plausible others, in a random order. */
function options(ans, pool, r, n = 4) {
  const rest = shuffle([...new Set(pool)].filter((p) => p !== ans), r).slice(0, n - 1);
  return shuffle([ans, ...rest], r);
}
const R3 = (x) => Math.round(x * 1000) / 1000;
const RAD = Math.PI / 180;

/* A regular polygon with a flat bottom, centred on the origin. */
function regular(n, R = 70) {
  const start = -Math.PI / 2 + (n % 2 ? 0 : Math.PI / n);
  return Array.from({ length: n }, (_, i) => { const a = start + (i * 2 * Math.PI) / n; return [R3(R * Math.cos(a)), R3(R * Math.sin(a))]; });
}

/* Scale points (maths y-up) to fit `size` px, flipped for the screen. */
function fit(pts, size = 170) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const k = size / Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const x0 = Math.min(...xs), y1 = Math.max(...ys);
  return pts.map(([x, y]) => [R3((x - x0) * k), R3((y1 - y) * k)]);
}

/* A polygon with side labels AND corner labels (angles written inside each corner). */
function figure(pts, sides = [], corners = [], pad = 34) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad, w = Math.max(...xs) - x0 + pad, h = Math.max(...ys) - y0 + pad;
  const cx = xs.reduce((a, b) => a + b, 0) / pts.length, cy = ys.reduce((a, b) => a + b, 0) / pts.length;
  let s = `<polygon points="${pts.map((p) => `${R3(p[0] - x0)},${R3(p[1] - y0)}`).join(' ')}" class="dg-fill2"/>`;
  sides.forEach((l, i) => {
    if (!l) return; const a = pts[i], b = pts[(i + 1) % pts.length];
    let mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; const dx = mx - cx, dy = my - cy, d = Math.hypot(dx, dy) || 1;
    mx += (dx / d) * 16; my += (dy / d) * 16;
    s += text(R3(mx - x0), R3(my - y0 + 5), l);
  });
  corners.forEach((l, i) => {
    if (!l) return; const [x, y] = pts[i]; const dx = cx - x, dy = cy - y, d = Math.hypot(dx, dy) || 1;
    s += text(R3(x + (dx / d) * 30 - x0), R3(y + (dy / d) * 30 - y0 + 5), l, 'dg-accent');
  });
  return svg(R3(w), R3(h), s, 'A shape');
}

/* A triangle from its three sides: c along the bottom, then a, then b. */
function triFromSides(a, b, c) {
  const x = (b * b + c * c - a * a) / (2 * c), y = Math.sqrt(Math.max(0, b * b - x * x));
  return fit([[0, 0], [c, 0], [x, y]], 160);
}
/* A triangle from its three angles, in corner order. */
function triFromAngles(A, B, C) {
  const t = Math.sin(A * RAD) / Math.sin(C * RAD), d = (180 - B) * RAD;
  return fit([[0, 0], [1, 0], [1 + t * Math.cos(d), t * Math.sin(d)]], 170);
}
/* A four-sided shape from its four angles (convex, sum 360), in corner order. */
function quadFromAngles(A) {
  const dir = [0]; for (let i = 1; i < 4; i++) dir.push(dir[i - 1] + (180 - A[i]) * RAD);
  const u = dir.map((d) => [Math.cos(d), Math.sin(d)]);
  for (const k of [1, 0.8, 1.25, 0.6, 1.6, 0.45, 2.1, 0.3]) {
    const P1 = [1, 0], P2 = [1 + k * u[1][0], k * u[1][1]];
    // P2 + s·u2 + t·u3 = 0
    const det = u[2][0] * u[3][1] - u[2][1] * u[3][0]; if (Math.abs(det) < 1e-9) continue;
    const bx = -P2[0], by = -P2[1];
    const s = (bx * u[3][1] - by * u[3][0]) / det, t = (u[2][0] * by - u[2][1] * bx) / det;
    if (s > 0.3 && t > 0.3) return fit([[0, 0], P1, P2, [P2[0] + s * u[2][0], P2[1] + s * u[2][1]]], 170);
  }
  return fit([[0, 0], [1, 0], [1, 1], [0, 1]], 150);
}

/* How many mirror lines a set of corners has — found by reflecting every
   corner in every candidate line through the centre and checking it lands on
   a corner. The candidates are the lines to each corner and to each side's
   middle, because a fold line must leave the shape through one or the other. */
function mirrors(pts) {
  const n = pts.length, cx = pts.reduce((a, p) => a + p[0], 0) / n, cy = pts.reduce((a, p) => a + p[1], 0) / n;
  const cands = [];
  pts.forEach((p, i) => { const q = pts[(i + 1) % n]; cands.push(Math.atan2(p[1] - cy, p[0] - cx), Math.atan2((p[1] + q[1]) / 2 - cy, (p[0] + q[0]) / 2 - cx)); });
  const found = [];
  for (const t of cands) {
    const th = ((t % Math.PI) + Math.PI) % Math.PI;
    if (found.some((f) => Math.abs(f - th) < 1e-3 || Math.abs(Math.abs(f - th) - Math.PI) < 1e-3)) continue;
    const c = Math.cos(2 * th), s = Math.sin(2 * th);
    const fits = pts.every(([x, y]) => { const X = x - cx, Y = y - cy, rx = c * X + s * Y + cx, ry = s * X - c * Y + cy; return pts.some((p) => Math.hypot(p[0] - rx, p[1] - ry) < 0.05); });
    if (fits) found.push(th);
  }
  return found.length;
}

/* Rays from a point: parts [{d, l}] laid anticlockwise from 0°. */
function fan(parts, full) {
  const R = 100, cx = R + 24, cy = full ? R + 24 : R + 16;
  const P = (a, rr) => [R3(cx + rr * Math.cos(a * RAD)), R3(cy - rr * Math.sin(a * RAD))];
  let s = full ? '' : `<line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" class="dg-line"/>`;
  let a = 0;
  parts.forEach((p, i) => {
    if (full || i > 0) { const [x, y] = P(a, R); s += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" class="dg-line"/>`; }
    const [lx, ly] = P(a + p.d / 2, p.d < 40 ? 76 : 58);
    s += text(lx, R3(ly + 5), p.l, 'dg-accent');
    a += p.d;
  });
  s += `<circle cx="${cx}" cy="${cy}" r="4" class="dg-dot"/>`;
  return svg(2 * cx, full ? 2 * cy : cy + 14, s, full ? 'Angles around a point' : 'Angles on a straight line');
}

/* A prism or pyramid, seen from a little above. Hidden edges are dashed. */
function solid(kind, n, wide = 70, tall = 110) {
  const cx = wide + 24, ry = 24, by = tall + ry + 30, ty = by - tall, start = Math.PI / 2 + Math.PI / n;
  const V = Array.from({ length: n }, (_, i) => { const a = start + (i * 2 * Math.PI) / n; return [R3(cx + wide * Math.cos(a)), R3(ry * Math.sin(a))]; });
  const xs = V.map((v) => v[0]), minX = Math.min(...xs), maxX = Math.max(...xs);
  const far = (v) => v[1] < -1e-6 && v[0] > minX + 1e-6 && v[0] < maxX - 1e-6;
  const L = (x1, y1, x2, y2, hid) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${hid ? 'dg-thin' : 'dg-line'}"${hid ? ' stroke-dasharray="5 4"' : ''}/>`;
  let s = '';
  V.forEach((v, i) => {
    const w = V[(i + 1) % n], midFar = (v[1] + w[1]) / 2 < -1e-6;
    s += L(v[0], by + v[1], w[0], by + w[1], midFar);
    if (kind === 'prism') { s += L(v[0], ty + v[1], w[0], ty + w[1], false); s += L(v[0], by + v[1], v[0], ty + v[1], far(v)); }
    else s += L(v[0], by + v[1], cx, ty - 10, far(v));
  });
  return svg(2 * cx, by + ry + 16, s, kind === 'prism' ? 'A prism' : 'A pyramid');
}

/* ------------------------------------------------------------ names */

const POLY = ['triangle', 'square', 'pentagon', 'hexagon', 'heptagon', 'octagon', 'nonagon', 'decagon'];
const QUADS = ['square', 'rectangle', 'rhombus', 'parallelogram', 'trapezium', 'kite'];
/* Each four-sided shape by its properties: all sides equal (E), right angles (R), pairs of parallel sides (P). */
const QF = {
  square: { E: 1, R: 1, P: 2, pts: [[0, 0], [110, 0], [110, 110], [0, 110]],
    say: 'All four sides are the same length, and every corner is a right angle.' },
  rectangle: { E: 0, R: 1, P: 2, pts: [[0, 0], [170, 0], [170, 90], [0, 90]],
    say: 'Every corner is a right angle, and opposite sides are equal — but the sides are not all the same length.' },
  rhombus: { E: 1, R: 0, P: 2, pts: [[0, 0], [110, 0], [160, 98], [50, 98]],
    say: 'All four sides are the same length, but none of its corners is a right angle.' },
  parallelogram: { E: 0, R: 0, P: 2, pts: [[0, 0], [150, 0], [195, 90], [45, 90]],
    say: 'Two pairs of parallel sides, opposite sides equal, no right angles, and not all sides the same.' },
  trapezium: { E: 0, R: 0, P: 1, pts: [[40, 0], [130, 0], [170, 90], [0, 90]],
    say: 'It has exactly one pair of parallel sides.' },
  kite: { E: 0, R: 0, P: 0, pts: [[70, 0], [130, 50], [70, 160], [10, 50]],
    say: 'Two pairs of equal sides that sit next to each other, and no parallel sides at all.' },
};
/* Shapes for the symmetry stop, with the fold lines counted by hand: through a corner, and through no corner. */
const SYM = {
  reg3: { pts: regular(3), c: 3, o: 0 }, reg4: { pts: regular(4), c: 2, o: 2 }, reg5: { pts: regular(5), c: 5, o: 0 },
  reg6: { pts: regular(6), c: 3, o: 3 }, reg7: { pts: regular(7), c: 7, o: 0 }, reg8: { pts: regular(8), c: 4, o: 4 },
  rectangle: { pts: [[0, 0], [150, 0], [150, 80], [0, 80]], c: 0, o: 2 },
  rhombus: { pts: [[70, 0], [140, 50], [70, 100], [0, 50]], c: 2, o: 0 },
  kite: { pts: [[60, 0], [120, 40], [60, 140], [0, 40]], c: 1, o: 0 },
  isosceles: { pts: [[0, 110], [120, 110], [60, 0]], c: 1, o: 0 },
  trapezium: { pts: [[40, 0], [120, 0], [160, 80], [0, 80]], c: 0, o: 1 },
  parallelogram: { pts: [[40, 0], [170, 0], [130, 80], [0, 80]], c: 0, o: 0 },
  scalene: { pts: [[0, 90], [160, 90], [40, 0]], c: 0, o: 0 },
  rightiso: { pts: [[0, 0], [0, 110], [110, 110]], c: 1, o: 0 },
};
const SOLIDS = {
  cube: { kind: 'prism', n: 4, w: 58, h: 82 }, cuboid: { kind: 'prism', n: 4, w: 90, h: 62 },
  'triangular prism': { kind: 'prism', n: 3, w: 70, h: 100 }, 'pentagonal prism': { kind: 'prism', n: 5, w: 70, h: 100 },
  'hexagonal prism': { kind: 'prism', n: 6, w: 70, h: 100 }, 'octagonal prism': { kind: 'prism', n: 8, w: 70, h: 100 },
  'square-based pyramid': { kind: 'pyramid', n: 4, w: 70, h: 110 }, 'triangular pyramid': { kind: 'pyramid', n: 3, w: 70, h: 110 },
  'pentagonal pyramid': { kind: 'pyramid', n: 5, w: 70, h: 110 }, 'hexagonal pyramid': { kind: 'pyramid', n: 6, w: 70, h: 110 },
};
const count = (k, n) => (k === 'prism' ? { F: n + 2, E: 3 * n, V: 2 * n } : { F: n + 1, E: 2 * n, V: n + 1 });
const KINDS = ['acute', 'right', 'obtuse', 'reflex'];

/* ------------------------------------------------------------ stops */

export const TRICKS = [
  {
    id: 'sides-and-corners', world: 'shapecity', band: '6-7', title: 'Sides and corners',
    hook: 'A road sign has eight straight sides. What do you call a shape with six?',
    idea: 'Count the sides — the number of sides gives a flat shape its name, and it always has the same number of corners.',
    why: [
      'Walk round the edge of any flat shape with straight sides. Every time a side ends you turn a corner, and the next side begins. So sides and corners take turns all the way round, and when you get back to the start you have met exactly as many of each.',
      'That is why a shape is named by one number. The start of each name is an old counting word: tri- means three (like a tricycle), penta- five, hexa- six, octa- eight (like an octopus). A square is the special four-sided shape with equal sides and square corners.',
      'Size and turning do not change the name. A tiny hexagon and a huge one, standing up or tipped over, both have six sides — so count, do not guess from the look.',
    ],
    alg: 'sides = corners = n',
    ex: { n: 6, ask: 'name', opts: ['pentagon', 'hexagon', 'octagon', 'square'] },
    gen(r, lv = 1) {
      const n = lv === 1 ? int(3, 6, r) : lv === 2 ? int(3, 8, r) : int(5, 10, r);
      const ask = lv === 1 ? pick(['name', 'name', 'corners'], r) : pick(['name', 'corners', 'sides'], r);
      const near = POLY.filter((_, i) => Math.abs(i + 3 - n) <= 2 && i + 3 !== n);
      return this.q({ n, ask, opts: ask === 'name' ? options(POLY[n - 3], near, r) : null });
    },
    q({ n, ask, opts }) {
      if (ask === 'name') return { n, ask, opts, text: 'What is this shape called?', choices: opts, ans: POLY[n - 3],
        expr: `${JSON.stringify(POLY)}[(${(n - 2) * 180})/180-1]` };
      return { n, ask, opts, text: `How many ${ask} does this shape have?`, expr: `${(n - 2) * 180}/180+2`, ans: n };
    },
    work({ n, ask, opts }) {
      const s = [{ t: 'Count the sides', v: n }, { t: 'Count the corners', v: n }];
      if (ask === 'name') s.push({ t: 'A shape with that many sides is a…', v: POLY[n - 3], choices: opts });
      else if (ask === 'sides') s.reverse();
      return s;
    },
    draw({ n }) { return poly(regular(n)); },
  },
  {
    id: 'lines-of-symmetry', world: 'shapecity', band: '6-7', title: 'Lines of symmetry',
    hook: 'You can fold a square in half four different ways. How many ways can you fold a rectangle?',
    idea: 'A line of symmetry is a fold that lands one half exactly on the other — count every fold that works.',
    why: [
      'Fold along a line of symmetry and every corner lands on a corner, every side on a side. So a fold line always leaves the shape through a corner or through the exact middle of a side — those are the only places worth trying.',
      'A regular shape (all sides and corners equal) with n sides has exactly n fold lines. With an odd number of sides, each fold runs from a corner to the middle of the opposite side. With an even number, half the folds join opposite corners and half join the middles of opposite sides.',
      'A rectangle has only two. Fold it corner to corner and the long side lands on the short side, which does not fit — so the diagonal is not a line of symmetry, even though it cuts the rectangle into two equal halves.',
    ],
    alg: 'regular n-sided shape: n lines of symmetry',
    ex: { k: 'rectangle' },
    gen(r, lv = 1) {
      const pool = lv === 1 ? ['reg3', 'reg4', 'reg6', 'rectangle', 'isosceles']
        : lv === 2 ? ['reg4', 'reg5', 'reg6', 'reg8', 'rectangle', 'rhombus', 'kite', 'parallelogram', 'scalene']
          : ['reg5', 'reg7', 'reg8', 'rhombus', 'kite', 'trapezium', 'parallelogram', 'rightiso', 'isosceles', 'scalene'];
      return this.q({ k: pick(pool, r) });
    },
    q({ k }) {
      const S = SYM[k];
      return { k, text: `${k.startsWith('reg') ? 'All its sides and corners are equal. ' : ''}How many lines of symmetry does this shape have?`,
        expr: `${mirrors(S.pts)}`, ans: S.c + S.o };
    },
    work({ k }) {
      const S = SYM[k];
      return [
        { t: 'Fold lines that pass through a corner', v: S.c },
        { t: 'Fold lines that pass through no corner (middle of a side to middle of a side)', v: S.o },
        { t: 'Lines of symmetry altogether', v: S.c + S.o },
      ];
    },
    draw({ k }) { return poly(SYM[k].pts, [], 'dg-fill3'); },
  },
  {
    id: 'kinds-of-triangle', world: 'shapecity', band: '8-10', title: 'Kinds of triangle',
    hook: 'Sides of 5, 5 and 8 — what kind of triangle is that?',
    idea: 'Count the equal sides: three equal is equilateral, two is isosceles, none is scalene. Or look at the biggest angle: 90° is right-angled.',
    why: [
      'The names come from what is the same. Equilateral means "equal sides" — all three. Isosceles means "equal legs" — two sides match, and the two angles at the bottom of those sides match too, because the triangle is its own mirror image down the middle. Scalene means no two sides match.',
      'You can also sort triangles by their biggest angle. The three angles always add up to 180°, so only one of them can be 90° or more. If the biggest is exactly 90°, it is right-angled; bigger than 90°, obtuse-angled; if all three are smaller, acute-angled.',
      'That is why you only need to find the biggest angle: once you know two angles, the third is 180° take away the other two.',
    ],
    alg: 'a = b = c → equilateral; exactly two equal → isosceles; none equal → scalene',
    ex: { mode: 'sides', s: [5, 5, 8], opts: ['scalene', 'equilateral', 'isosceles'] },
    gen(r, lv = 1) {
      if (lv === 3 && r() < 0.6) {
        const type = pick(['right-angled', 'acute-angled', 'obtuse-angled'], r); let A;
        if (type === 'right-angled') { const a = int(20, 70, r); A = [a, 90 - a, 90]; }
        else if (type === 'acute-angled') { const c = int(62, 88, r), a = int(Math.max(180 - c - 88, 30), Math.min(88, 150 - c), r); A = [a, 180 - c - a, c]; }
        else { const c = int(95, 145, r), a = int(10, 180 - c - 10, r); A = [a, 180 - c - a, c]; }
        A = shuffle(A, r);
        return this.q({ mode: 'angles', s: A, opts: shuffle(['right-angled', 'acute-angled', 'obtuse-angled'], r) });
      }
      const type = pick(['equilateral', 'isosceles', 'scalene'], r); let s;
      if (type === 'equilateral') { const a = int(3, 12, r); s = [a, a, a]; }
      else if (type === 'isosceles') { const a = int(4, lv === 1 ? 9 : 14, r); let c = int(2, 2 * a - 2, r); if (c === a) c++; s = [a, a, c]; }
      else { let a, b, c; do { a = int(3, 12, r); b = int(3, 12, r); c = int(3, 14, r); } while (a === b || b === c || a === c || a + b <= c + 1 || a + c <= b + 1 || b + c <= a + 1); s = [a, b, c]; }
      return this.q({ mode: 'sides', s: shuffle(s, r), opts: shuffle(['equilateral', 'isosceles', 'scalene'], r) });
    },
    q({ mode, s, opts }) {
      if (mode === 'angles') {
        const [a, b, c] = s, big = Math.max(a, b, c);
        return { mode, s, opts, text: `A triangle has angles of ${a}° and ${b}°. What kind of triangle is it?`, choices: opts,
          ans: big === 90 ? 'right-angled' : big > 90 ? 'obtuse-angled' : 'acute-angled',
          expr: `(function(m){return m===90?'right-angled':m>90?'obtuse-angled':'acute-angled'})(Math.max(${a},${b},180-${a}-${b}))` };
      }
      const [a, b, c] = s, same = new Set(s).size;
      return { mode, s, opts, text: `A triangle has sides of ${a} cm, ${b} cm and ${c} cm. What kind of triangle is it?`, choices: opts,
        ans: same === 1 ? 'equilateral' : same === 2 ? 'isosceles' : 'scalene',
        expr: `(${a}===${b}&&${b}===${c})?'equilateral':(${a}===${b}||${b}===${c}||${a}===${c})?'isosceles':'scalene'` };
    },
    work(q) {
      const { mode, s, opts } = q;
      if (mode === 'angles') {
        const [a, b] = s, c = 180 - a - b;
        return [{ t: `The third angle: 180 − ${a} − ${b}`, v: c }, { t: 'The biggest of the three angles', v: Math.max(a, b, c) }, { t: 'So the triangle is', v: q.ans, choices: opts }];
      }
      const eq = new Set(s).size === 1 ? 3 : new Set(s).size === 2 ? 2 : 0;
      return [{ t: 'How many sides share a length with another side?', v: eq }, { t: 'So the triangle is', v: q.ans, choices: opts }];
    },
    draw({ mode, s }) {
      if (mode === 'angles') { const [a, b, c] = s; return figure(triFromAngles(a, b, c), [], [`${a}°`, `${b}°`, '?']); }
      const [a, b, c] = s; return figure(triFromSides(a, b, c), [`${c} cm`, `${a} cm`, `${b} cm`]);
    },
  },
  {
    id: 'four-sided-shapes', world: 'shapecity', band: '8-10', title: 'Four-sided shapes',
    hook: 'A square and a rhombus both have four equal sides. So what is the difference?',
    idea: 'Ask three questions — how many pairs of parallel sides, are all sides equal, are there right angles — and the answers name the shape.',
    why: [
      'Every four-sided shape is a quadrilateral, and the family is sorted by what it keeps. Two pairs of parallel sides make a parallelogram: slide the top edge along and it stays the same length and direction as the bottom.',
      'Then add rules. A parallelogram with right angles is a rectangle. A parallelogram with all four sides equal is a rhombus. Both rules at once — equal sides AND right angles — is a square. That is why a square is a special rectangle and a special rhombus at the same time.',
      'With only one pair of parallel sides it is a trapezium. With no parallel sides but two pairs of equal sides next to each other, it is a kite — fold it down the middle and the halves match.',
    ],
    alg: 'parallelogram + right angles = rectangle; + equal sides = rhombus; + both = square',
    ex: { k: 'rhombus', opts: ['square', 'rhombus', 'kite', 'rectangle'] },
    gen(r, lv = 1) {
      const pool = lv === 1 ? ['square', 'rectangle', 'kite', 'trapezium'] : QUADS;
      const k = pick(pool, r);
      return this.q({ k, opts: options(k, lv === 1 ? pool : QUADS, r) });
    },
    q({ k, opts }) {
      const { E, R, P, say } = QF[k];
      return { k, opts, text: `${say} Which shape is it?`, choices: opts, ans: k,
        expr: `(${E}&&${R})?'square':${R}?'rectangle':(${E}&&${P}===2)?'rhombus':${P}===2?'parallelogram':${P}===1?'trapezium':'kite'` };
    },
    work({ k, opts }) {
      const { E, R, P } = QF[k], yn = ['Yes', 'No'];
      return [
        { t: 'How many pairs of parallel sides?', v: P },
        { t: 'Are all four sides the same length?', v: E ? 'Yes' : 'No', choices: yn },
        { t: 'Are the corners right angles?', v: R ? 'Yes' : 'No', choices: yn },
        { t: 'So it is a…', v: k, choices: opts },
      ];
    },
    draw({ k }) { return poly(QF[k].pts, [], 'dg-fill1'); },
  },
  {
    id: 'faces-edges-vertices', world: 'shapecity', band: '8-10', title: 'Faces, edges and corners',
    hook: 'A hexagonal prism — how many edges, without losing count?',
    idea: 'Count by the ends: a prism has two matching ends joined by straight sides; a pyramid has one base and a point.',
    why: [
      'A prism is its end shape pulled straight out. If the end has n sides, there are n edges round the front end, n round the back end, and n running between them: 3n edges. It has 2n corners (called vertices) — n on each end — and n + 2 faces: one for each side, plus the two ends.',
      'A pyramid is its base shape pulled up to a single point. It has n edges round the base and n running up to the tip: 2n. It has n + 1 vertices (the base corners and the tip) and n + 1 faces (a triangle for every side of the base, and the base).',
      'For every solid like these, faces + vertices − edges = 2. That is Euler\'s rule, and it is the best check there is: count all three, and if the rule does not give 2, you have missed something.',
    ],
    alg: 'prism: F = n + 2, E = 3n, V = 2n · pyramid: F = V = n + 1, E = 2n · F + V − E = 2',
    ex: { name: 'hexagonal prism', ask: 'edges' },
    sources: ['L. Euler, "Elementa doctrinae solidorum", Novi Commentarii academiae scientiarum Petropolitanae 4 (1758) — the relation F + V − E = 2 for polyhedra.'],
    gen(r, lv = 1) {
      const names = Object.keys(SOLIDS);
      if (lv === 1) return this.q({ name: pick(['cube', 'cuboid', 'square-based pyramid', 'triangular prism'], r), ask: pick(['faces', 'edges', 'vertices'], r) });
      if (lv === 2) return this.q({ name: pick(names, r), ask: pick(['faces', 'edges', 'vertices'], r) });
      const kind = pick(['prism', 'pyramid'], r), n = int(5, 12, r);
      return this.q({ name: null, kind, n, ask: 'euler' });
    },
    q({ name, kind, n, ask }) {
      const S = name ? SOLIDS[name] : { kind, n }, C = count(S.kind, S.n);
      if (ask === 'euler') return { name, kind, n, ask, text: `A solid has ${C.F} faces and ${C.V} vertices (corners). Use Euler's rule: how many edges does it have?`,
        expr: `${S.kind === 'prism' ? `3*${S.n}` : `2*${S.n}`}`, ans: C.E };
      const word = ask === 'vertices' ? 'vertices (corners)' : ask;
      const other = ask === 'faces' ? `${C.E}-${C.V}+2` : ask === 'edges' ? `${C.F}+${C.V}-2` : `${C.E}-${C.F}+2`;
      return { name, kind, n, ask, text: `How many ${word} does a ${name} have?`, expr: other, ans: C[ask[0].toUpperCase()] };
    },
    work({ name, kind, n, ask }) {
      const S = name ? SOLIDS[name] : { kind, n }, C = count(S.kind, S.n), m = S.n;
      if (ask === 'euler') return [{ t: `Faces + vertices: ${C.F} + ${C.V}`, v: C.F + C.V }, { t: 'Edges are 2 fewer than that', v: C.E }];
      if (S.kind === 'prism') {
        if (ask === 'faces') return [{ t: 'The two ends', v: 2 }, { t: 'One flat side for each side of an end', v: m }, { t: 'Faces altogether', v: C.F }];
        if (ask === 'edges') return [{ t: 'Edges round the front end', v: m }, { t: 'Round the back end', v: m }, { t: 'Running from end to end', v: m }, { t: 'Edges altogether', v: C.E }];
        return [{ t: 'Corners on one end', v: m }, { t: 'Corners on both ends', v: C.V }];
      }
      if (ask === 'faces') return [{ t: 'The base', v: 1 }, { t: 'One triangle for each side of the base', v: m }, { t: 'Faces altogether', v: C.F }];
      if (ask === 'edges') return [{ t: 'Edges round the base', v: m }, { t: 'Edges up to the tip', v: m }, { t: 'Edges altogether', v: C.E }];
      return [{ t: 'Corners of the base', v: m }, { t: 'Add the tip', v: C.V }];
    },
    draw({ name, kind, n }) {
      const S = name ? SOLIDS[name] : { kind, n, w: 70, h: 100 };
      return solid(S.kind, S.n, S.w, S.h);
    },
  },
  {
    id: 'kinds-of-angle', world: 'shapecity', band: '8-10', title: 'Kinds of angle',
    hook: 'Is this corner sharp, square, wide, or more than half a turn?',
    idea: 'Compare the angle with a square corner (90°) and a straight line (180°).',
    why: [
      'An angle measures how far something turns. A whole turn is 360°, so half a turn — a straight line — is 180°, and a quarter turn — the corner of a page — is 90°, a right angle.',
      'Every angle names itself by where it sits against those two. Smaller than a right angle is acute (sharp). Exactly 90° is right. Between 90° and 180° is obtuse (blunt). More than a straight line, but less than a full turn, is reflex.',
      'So you never need a protractor to name an angle. Hold the corner of a page against it: if the angle fits inside the corner it is acute; if it pokes out, check whether it has gone past the straight line.',
    ],
    alg: 'acute < 90° = right < obtuse < 180° < reflex < 360°',
    ex: { d: 130, lv: 1, opts: ['acute', 'obtuse', 'right', 'reflex'] },
    gen(r, lv = 1) {
      const kind = lv === 1 ? pick(['acute', 'right', 'obtuse'], r) : pick(['acute', 'right', 'obtuse', 'reflex', 'acute', 'obtuse', 'reflex'], r);
      const d = kind === 'right' ? 90 : kind === 'acute' ? (lv === 1 ? int(4, 14, r) * 5 : int(10, 86, r))
        : kind === 'obtuse' ? (lv === 1 ? int(22, 32, r) * 5 : int(94, 172, r)) : int(195, 340, r);
      return this.q({ d, lv, opts: shuffle(KINDS, r) });
    },
    q({ d, lv, opts }) {
      return { d, lv, opts, text: lv === 3 ? `What kind of angle is ${d}°?` : 'What kind of angle is this?', choices: opts,
        ans: d < 90 ? 'acute' : d === 90 ? 'right' : d < 180 ? 'obtuse' : 'reflex',
        expr: `['acute','right','obtuse','reflex'][Math.sign(${d}-90)+1+(${d}>180?1:0)]` };
    },
    work({ d, opts }) {
      const c = d < 90 ? 'smaller' : d === 90 ? 'the same' : 'bigger';
      return [
        { t: 'Against a square corner (90°), is it smaller, the same or bigger?', v: c, choices: ['smaller', 'the same', 'bigger'] },
        { t: 'Has it gone past a straight line (180°)?', v: d > 180 ? 'Yes' : 'No', choices: ['Yes', 'No'] },
        { t: 'So it is', v: d < 90 ? 'acute' : d === 90 ? 'right' : d < 180 ? 'obtuse' : 'reflex', choices: opts },
      ];
    },
    draw({ d }) { return angle(d); },
  },
  {
    id: 'coordinates-and-moves', world: 'shapecity', band: '8-10', title: 'Coordinates and moves',
    hook: 'A treasure map says (3, 5). Do you go across first, or up?',
    idea: 'A point is (across, up): x first, then y. Moving right or left changes only x; up or down changes only y.',
    why: [
      'A coordinate is two instructions from the corner marked 0. The first number says how far across the bottom to walk; the second says how far to climb. Everyone agrees on the order — "along the corridor, then up the stairs" — so a point has exactly one address.',
      'Moving a point without turning it (a translation) is also two instructions. Going 3 to the right adds 3 to the across number and leaves the up number alone, because walking sideways does not make you any higher.',
      'So you can work out where a point lands without drawing it: add for right and up, take away for left and down. Going backwards, the gap between the across numbers is how far it moved sideways.',
    ],
    alg: '(x, y) moved a right and b up → (x + a, y + b)',
    ex: { lv: 2, x: 3, y: 2, dx: 4, dy: 1, ask: 'x' },
    gen(r, lv = 1) {
      const x = int(1, 8, r), y = int(1, 8, r);
      if (lv === 1) return this.q({ lv, x, y, dx: 0, dy: 0, ask: pick(['x', 'y'], r) });
      let dx, dy; do { dx = int(-x, 10 - x, r); dy = int(-y, 10 - y, r); } while ((lv === 2 && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) || (lv === 3 && (dx === 0 || dy === 0)) || (dx === 0 && dy === 0));
      return this.q({ lv, x, y, dx, dy, ask: lv === 3 ? pick(['right', 'up'], r) : pick(['x', 'y'], r) });
    },
    q({ lv, x, y, dx, dy, ask }) {
      const mv = (v, pos, neg) => (v === 0 ? '' : `${Math.abs(v)} ${v > 0 ? pos : neg}`);
      if (lv === 1) return { lv, x, y, dx, dy, ask, text: `What is the ${ask}-coordinate of point A?`, expr: ask === 'x' ? `${x}` : `${y}`, ans: ask === 'x' ? x : y };
      if (lv === 3) {
        const h = ask === 'right', v = h ? dx : dy, word = h ? (v > 0 ? 'right' : 'left') : (v > 0 ? 'up' : 'down');
        return { lv, x, y, dx, dy, ask, text: `Point A slides to point B. How many squares ${word} did it move?`,
          expr: h ? `Math.abs(${x + dx}-${x})` : `Math.abs(${y + dy}-${y})`, ans: Math.abs(v) };
      }
      const moves = [mv(dx, 'right', 'left'), mv(dy, 'up', 'down')].filter(Boolean).join(' and ');
      return { lv, x, y, dx, dy, ask, text: `Point A moves ${moves}. What is its new ${ask}-coordinate?`,
        expr: ask === 'x' ? `${x}+(${dx})` : `${y}+(${dy})`, ans: ask === 'x' ? x + dx : y + dy };
    },
    work({ lv, x, y, dx, dy, ask }) {
      if (lv === 1) return ask === 'x'
        ? [{ t: 'Across the bottom first: how many squares to get under A?', v: x }, { t: 'The x-coordinate is the across number', v: x }]
        : [{ t: 'Across the bottom first: how many squares to get under A?', v: x }, { t: 'Then up: how many squares to reach A?', v: y }];
      if (lv === 3) return ask === 'right'
        ? [{ t: 'The x-coordinate of B', v: x + dx }, { t: 'The x-coordinate of A', v: x }, { t: 'The gap between them', v: Math.abs(dx) }]
        : [{ t: 'The y-coordinate of B', v: y + dy }, { t: 'The y-coordinate of A', v: y }, { t: 'The gap between them', v: Math.abs(dy) }];
      const h = ask === 'x', v = h ? dx : dy, s0 = h ? x : y;
      return [{ t: `A starts with ${ask} =`, v: s0 }, { t: v === 0 ? `It does not move ${h ? 'sideways' : 'up or down'}, so ${ask} stays` : `${v > 0 ? 'Add' : 'Take away'} ${Math.abs(v)}`, v: s0 + v }];
    },
    draw({ lv, x, y, dx, dy }) { return coords(10, lv === 3 ? { A: [x, y], B: [x + dx, y + dy] } : { A: [x, y] }); },
  },
  {
    id: 'angles-on-a-line', world: 'shapecity', band: '8-10', title: 'Angles on a line and round a point',
    hook: 'Two angles sit side by side on a straight line. One is 125°. The other?',
    idea: 'Angles on a straight line add up to 180°; angles all the way round a point add up to 360°. Take away the ones you know.',
    why: [
      'A straight line is half a turn. Stand on the point facing along the line and turn until you face back the other way: that is 180°. Each angle on the line is one part of that same half-turn, so the parts must add up to 180°.',
      'All the way round a point is a whole turn — you end up facing where you started — and a whole turn is 360°. However many angles the rays cut it into, together they are the full 360°.',
      'So a missing angle is never a mystery: add the ones you know and see how much of the 180° or 360° is left over.',
    ],
    alg: 'a + b = 180° on a line · a + b + c + … = 360° round a point',
    ex: { full: false, known: [125], pos: 1 },
    gen(r, lv = 1) {
      const full = lv === 3, total = full ? 360 : 180, k = lv === 1 ? 1 : full ? pick([2, 3], r) : 2;
      let q;
      for (let tries = 0; tries < 200; tries++) {
        const known = []; let left = total;
        for (let i = 0; i < k; i++) { const room = left - 25 * (k - i); const a = int(3, Math.max(3, Math.floor(Math.min(room, full ? 150 : 160) / 5)), r) * 5; known.push(a); left -= a; }
        if (left < 15) continue;
        q = this.q({ full, known, pos: int(0, k, r) });
        if (!leaks(q)) return q;
      }
      return q;
    },
    q({ full, known, pos }) {
      const total = full ? 360 : 180, sum = known.reduce((a, b) => a + b, 0);
      const list = known.map((a) => `${a}°`).join(', ');
      return { full, known, pos, text: `${full ? 'Angles around a point' : 'Angles on a straight line'}: ${list} and ?. Find the missing angle.`,
        expr: `${total}-${known.join('-')}`, ans: total - sum };
    },
    work({ full, known }) {
      const total = full ? 360 : 180, sum = known.reduce((a, b) => a + b, 0);
      return [
        { t: full ? 'All the way round a point makes' : 'Angles on a straight line make', v: total },
        { t: known.length > 1 ? 'Add the angles you know' : 'The angle you know', v: sum },
        { t: `${total} − ${sum}`, v: total - sum },
      ];
    },
    draw({ full, known, pos }) {
      const total = full ? 360 : 180, parts = known.map((d) => ({ d, l: `${d}°` }));
      parts.splice(pos, 0, { d: total - known.reduce((a, b) => a + b, 0), l: '?' });
      return fan(parts, full);
    },
  },
  {
    id: 'angles-in-a-shape', world: 'shapecity', band: '11-14', title: 'Angles inside a shape',
    hook: 'A triangle has angles of 50° and 60°. What is the third — without measuring?',
    idea: 'The angles of any triangle add up to 180°; of any four-sided shape, 360°. Take away the ones you know.',
    why: [
      'Draw any triangle on paper and tear off its three corners. Put the three torn points together, side by side: they always make a straight line. A straight line is 180°, so the three angles of every triangle — tall, flat, big or tiny — add up to 180°.',
      'A four-sided shape can be cut corner to corner into two triangles. Every angle of the shape is shared out between the two triangles and nothing else is added, so its angles are two triangles\' worth: 2 × 180° = 360°.',
      'In an isosceles triangle the two base angles are equal (it is its own mirror image), so once you know the top angle, what is left of the 180° is split into two equal halves.',
    ],
    alg: 'triangle: a + b + c = 180° · quadrilateral: a + b + c + d = 360°',
    ex: { kind: 'tri', angles: [50, 60, 70], hide: 2 },
    gen(r, lv = 1) {
      return fresh(() => {
        const kind = lv === 1 ? 'tri' : lv === 2 ? pick(['tri', 'iso', 'right'], r) : pick(['quad', 'quad', 'iso'], r);
        if (kind === 'iso') return this.q({ kind, apex: int(10, 80, r) * 2 });
        if (kind === 'right') { const a = int(15, 75, r), A = shuffle([90, a, 90 - a], r); return this.q({ kind: 'tri', angles: A, hide: A.indexOf(90) === 0 ? 1 : 0 }); }
        if (kind === 'tri') { const a = int(lv === 1 ? 6 : 20, lv === 1 ? 18 : 120, r) * (lv === 1 ? 5 : 1), b = int(20, 160 - a, r); const A = [a, b, 180 - a - b]; return this.q({ kind, angles: A, hide: int(0, 2, r) }); }
        let A; do { A = [0, 0, 0].map(() => int(12, 28, r) * 5); } while (360 - A[0] - A[1] - A[2] < 55 || 360 - A[0] - A[1] - A[2] > 165);
        A.push(360 - A[0] - A[1] - A[2]);
        return this.q({ kind, angles: A, hide: int(0, 3, r) });
      });
    },
    q({ kind, angles, hide, apex }) {
      if (kind === 'iso') return { kind, apex, text: `An isosceles triangle has a top angle of ${apex}°. What is each of its two equal base angles?`, expr: `(180-${apex})/2`, ans: (180 - apex) / 2 };
      const total = kind === 'quad' ? 360 : 180, known = angles.filter((_, i) => i !== hide);
      const list = known.map((a) => `${a}°`).join(known.length === 3 ? ', ' : ' and ').replace(/, (?=[^,]*$)/, ' and ');
      return { kind, angles, hide, text: `A ${kind === 'quad' ? 'four-sided shape' : 'triangle'} has angles of ${list}. What is the ${kind === 'quad' ? 'fourth' : 'third'} angle?`,
        expr: `${total}-${known.join('-')}`, ans: angles[hide] };
    },
    work({ kind, angles, hide, apex }) {
      if (kind === 'iso') return [{ t: 'Angles in a triangle add up to', v: 180 }, { t: `180 − ${apex}`, v: 180 - apex }, { t: 'Shared between the two equal angles', v: (180 - apex) / 2 }];
      const total = kind === 'quad' ? 360 : 180, sum = angles.reduce((a, b, i) => (i === hide ? a : a + b), 0);
      return [
        { t: kind === 'quad' ? 'Angles in a four-sided shape add up to' : 'Angles in a triangle add up to', v: total },
        { t: `Add the ${kind === 'quad' ? 'three' : 'two'} you know`, v: sum },
        { t: `${total} − ${sum}`, v: total - sum },
      ];
    },
    draw({ kind, angles, hide, apex }) {
      if (kind === 'iso') { const b = (180 - apex) / 2; return figure(triFromAngles(b, b, apex), [], ['?', '?', `${apex}°`]); }
      const labels = angles.map((a, i) => (i === hide ? '?' : `${a}°`));
      return figure(kind === 'quad' ? quadFromAngles(angles) : triFromAngles(...angles), [], labels);
    },
  },
  {
    id: 'round-the-circle', world: 'shapecity', band: '11-14', title: 'Round the circle',
    hook: 'A bicycle wheel is 60 cm across. How far does it roll in one turn?',
    idea: 'The diameter is two radii. The distance round (the circumference) is about 3.14 × the diameter.',
    why: [
      'The radius goes from the centre to the edge. The diameter goes right across through the centre, so it is one radius out and another radius back: two radii.',
      'Every circle is a scaled-up or scaled-down copy of every other circle. So the distance round divided by the distance across is the same number for all of them. That number is called pi (π), and it is a little more than 3.14.',
      'You can see why it is a bit more than 3. Fit a hexagon inside the circle: its six sides are each one radius long, so its perimeter is 6 radii — exactly 3 diameters. The circle bulges outside the hexagon, so it must be a little longer than 3 diameters. A square drawn around the outside is 4 diameters, so π sits between 3 and 4.',
    ],
    alg: 'd = 2r · C = π × d ≈ 3.14 × d',
    decimals: true, keys: ['.'],
    ex: { ask: 'circ-d', v: 12 },
    gen(r, lv = 1) {
      if (lv === 1) return this.q({ ask: pick(['diam', 'rad'], r), v: int(2, 25, r) * (r() < 0.5 ? 1 : 2) });
      if (lv === 2) return this.q({ ask: 'circ-d', v: int(2, 20, r) });
      return this.q({ ask: pick(['circ-r', 'circ-d'], r), v: int(2, 15, r) * (r() < 0.3 ? 5 : 1) });
    },
    q({ ask, v }) {
      if (ask === 'diam') return { ask, v, text: `A circle has a radius of ${v} cm. What is its diameter, in cm?`, expr: `${v}+${v}`, ans: 2 * v };
      if (ask === 'rad') { const d = v % 2 ? v * 2 : v; return { ask, v: d, text: `A circle has a diameter of ${d} cm. What is its radius, in cm?`, expr: `${d}*0.5`, ans: d / 2 }; }
      const d = ask === 'circ-r' ? 2 * v : v, C = Math.round(314 * d) / 100;
      return { ask, v, text: ask === 'circ-r'
        ? `A circle has a radius of ${v} cm. Using π ≈ 3.14, how far is it round the edge, in cm?`
        : `A circle has a diameter of ${v} cm. Using π ≈ 3.14, how far is it round the edge, in cm?`,
      expr: `3.14*${d}`, ans: C };
    },
    work({ ask, v }) {
      if (ask === 'diam') return [{ t: 'The radius', v }, { t: 'Two radii end to end', v: 2 * v }];
      if (ask === 'rad') return [{ t: 'The diameter', v }, { t: 'Half of it', v: v / 2 }];
      const d = ask === 'circ-r' ? 2 * v : v, s = [];
      if (ask === 'circ-r') s.push({ t: `The diameter: 2 × ${v}`, v: d });
      s.push({ t: `3 × ${d}`, v: 3 * d }, { t: `0.14 × ${d}`, v: Math.round(14 * d) / 100 }, { t: 'Add them', v: Math.round(314 * d) / 100 });
      return s;
    },
    draw({ ask, v }) {
      const c = 96, R = 78; let s = `<circle cx="${c}" cy="${c}" r="${R}" class="dg-fill3"/><circle cx="${c}" cy="${c}" r="4" class="dg-dot"/>`;
      const across = ask === 'rad' || ask === 'circ-d';
      s += across ? `<line x1="${c - R}" y1="${c}" x2="${c + R}" y2="${c}" class="dg-line"/>` + text(c, c - 10, `${v} cm`)
        : `<line x1="${c}" y1="${c}" x2="${c + R}" y2="${c}" class="dg-line"/>` + text(c + R / 2, c - 10, `${v} cm`);
      return svg(2 * c, 2 * c, s, 'A circle');
    },
  },
];

/* ------------------------------------------------------------ stories */

export const STORIES = {
  'sides-and-corners': { title: 'The shape walk', scene: 'city', cast: ['astro', 'pixel'], beats: [
    { who: null, say: 'Mira and Pip walk home through the city, spotting shapes. A paving stone by the fountain has six sides.' },
    { who: 'pixel', say: 'It looks like a honeycomb cell. Is it a pentagon?' },
    { who: 'astro', say: 'Count before you name it. Put your finger on one side and go round.', add: { t: '1 + 1 + 1 + 1 + 1 + 1', v: 6 } },
    { who: 'pixel', say: 'Six sides. And the corners… six as well!' },
    { who: 'astro', say: 'Always. Every side ends at a corner and the next side starts there. Six sides is a hexagon; a pentagon has five.' },
    { who: 'pixel', say: 'So the stop sign over there, with one more side than two squares, is…', add: { t: '4 + 4', v: 8 } },
    { who: 'astro', say: 'Eight sides — an octagon. Octa means eight, like an octopus.', add: { t: '6 + 2', v: 8 } },
  ] },
  'lines-of-symmetry': { title: 'Folding the kite paper', scene: 'room', cast: ['koi', 'beaker'], beats: [
    { who: null, say: 'Nova and Rafi are cutting paper for a window display. Nova holds up a square and a long rectangle.' },
    { who: 'beaker', say: 'The square folds four ways: two straight across and two corner to corner.', add: { t: '2 + 2', v: 4 } },
    { who: 'koi', say: 'Then the rectangle must fold four ways too.' },
    { who: 'beaker', say: 'Try corner to corner.' },
    { who: 'koi', say: 'Oh — the long edge lands on the short edge. The corners stick out. That is not a fold line.' },
    { who: 'beaker', say: 'So only the two straight folds work: top to bottom, and side to side.', add: { t: '4 − 2', v: 2 } },
    { who: 'koi', say: 'Two lines of symmetry. Cutting it in equal halves is not enough — the halves must land on each other.', add: { t: '1 + 1', v: 2 } },
  ] },
  'kinds-of-triangle': { title: 'The garden frame', scene: 'garden', cast: ['scopey', 'panda'], beats: [
    { who: null, say: 'Theo and Suki are building a bean frame from three canes: 5, 5 and 8 hands long.', add: { t: '5 + 5 + 8', v: 18 } },
    { who: 'scopey', say: 'What kind of triangle will it be? I want to label the plan properly.' },
    { who: 'panda', say: 'Look for sides that match. The two 5s do.' },
    { who: 'scopey', say: 'Two equal sides — isosceles. And the angles at the bottom of those sides match too.' },
    { who: 'panda', say: 'If all three canes were 5, it would be equilateral. If none matched, scalene.', add: { t: '5 × 3', v: 15 } },
    { who: 'scopey', say: 'Two equal canes, one long one. Isosceles it is.', add: { t: '8 − 5', v: 3 } },
  ] },
  'four-sided-shapes': { title: 'The tile shop', scene: 'shop', cast: ['astro', 'melody'], beats: [
    { who: null, say: 'In a tile shop, Ines picks up a tile with four equal sides. It is leaning over like a pushed square.' },
    { who: 'melody', say: 'Four equal sides — so it is a square.' },
    { who: 'astro', say: 'Check the corners. Are they right angles?' },
    { who: 'melody', say: 'No — two are pointy and two are wide. Their sizes still add to a full turn.', add: { t: '60 + 120 + 60 + 120', v: 360 } },
    { who: 'astro', say: 'Four equal sides but no right angles makes a rhombus. A square is a rhombus that also has square corners.' },
    { who: 'melody', say: 'And two pairs of parallel sides, like every parallelogram.', add: { t: '1 + 1', v: 2 } },
  ] },
  'faces-edges-vertices': { title: 'The paper lanterns', scene: 'festival', cast: ['beaker', 'comet'], beats: [
    { who: null, say: 'Rafi and Dax are building a hexagonal prism lantern out of straws for the festival.' },
    { who: 'comet', say: 'How many straws do we need? Let me count the edges on the picture… I lost count.' },
    { who: 'beaker', say: 'Count by the ends. Round the front hexagon: 6 straws.', add: { t: '6', v: 6 } },
    { who: 'comet', say: 'Round the back one, another 6. Then 6 joining the ends.', add: { t: '6 + 6 + 6', v: 18 } },
    { who: 'beaker', say: 'Check with Euler: 8 faces and 12 corners, take away 2.', add: { t: '8 + 12 − 2', v: 18 } },
    { who: 'comet', say: 'Eighteen straws. The rule agrees — so we did not miss one.', add: { t: '3 × 6', v: 18 } },
  ] },
  'kinds-of-angle': { title: 'The opening door', scene: 'hall', cast: ['pixel', 'panda'], beats: [
    { who: null, say: 'The hall door swings open. Pip and Suki watch the angle between the door and the wall.' },
    { who: 'pixel', say: 'Just a little open — a sharp angle. That is acute!' },
    { who: 'panda', say: 'Now it is square to the wall, like the corner of a book. A right angle.', add: { t: '360 ÷ 4', v: 90 } },
    { who: 'pixel', say: 'Wider than that, but not flat against the wall yet — obtuse.' },
    { who: 'panda', say: 'Flat is a straight line, two right angles.', add: { t: '90 + 90', v: 180 } },
    { who: 'pixel', say: 'And if a door could swing past flat, that would be a reflex angle — more than 180° but less than a full turn.', add: { t: '180 + 90', v: 270 } },
  ] },
  'coordinates-and-moves': { title: 'The treasure grid', scene: 'beach', cast: ['comet', 'koi'], beats: [
    { who: null, say: 'On the beach, Nova draws a grid in the sand. The shell is buried at (3, 2).' },
    { who: 'comet', say: 'Three up, two across!' },
    { who: 'koi', say: 'Across first, then up — along the corridor, then up the stairs. Three across, two up.' },
    { who: null, say: 'The tide pushes the shell 4 squares right and 1 square up.' },
    { who: 'comet', say: 'Right only changes the across number.', add: { t: '3 + 4', v: 7 } },
    { who: 'koi', say: 'And up changes only the up number.', add: { t: '2 + 1', v: 3 } },
    { who: 'comet', say: 'Dig at (7, 3)! The across number is 7.', add: { t: '3 + 4', v: 7 } },
  ] },
  'angles-on-a-line': { title: 'The see-saw', scene: 'stadium', cast: ['scopey', 'melody'], beats: [
    { who: null, say: 'A ramp leans on a flat path by the stadium. On one side it makes an angle of 125° with the path.', add: { t: '125' } },
    { who: 'melody', say: 'What is the angle on the other side? I have no protractor.' },
    { who: 'scopey', say: 'You do not need one. The path is a straight line, and a straight line is half a turn.', add: { t: '360 ÷ 2', v: 180 } },
    { who: 'melody', say: 'So the two angles share the 180° between them.' },
    { who: 'scopey', say: 'Take away the one you know.', add: { t: '180 − 125', v: 55 } },
    { who: 'melody', say: 'Fifty-five degrees. And all the way round a point would be 360°.', add: { t: '125 + 55', v: 180 } },
    { who: 'scopey', say: 'So the missing angle is 55°.', add: { t: '180 − 125', v: 55 } },
  ] },
  'angles-in-a-shape': { title: 'Torn corners', scene: 'room', cast: ['samurai', 'astro'], beats: [
    { who: null, say: 'Kwame cuts out a paper triangle. Two of its angles are 50° and 60°.', add: { t: '50 + 60', v: 110 } },
    { who: 'astro', say: 'Tear off all three corners and put the points together.' },
    { who: 'samurai', say: 'They make a straight line. Every time, whatever triangle I cut.', add: { t: '90 + 90', v: 180 } },
    { who: 'astro', say: 'So the three angles fill 180°. Take away the two you know.', add: { t: '180 − 110', v: 70 } },
    { who: 'samurai', say: 'And a four-sided shape cuts into two triangles, corner to corner.' },
    { who: 'astro', say: 'So its angles make two lots of 180°.', add: { t: '2 × 180', v: 360 } },
    { who: 'samurai', say: 'The third angle of my triangle is 70°.', add: { t: '180 − 50 − 60', v: 70 } },
  ] },
  'round-the-circle': { title: 'The rolling wheel', scene: 'city', cast: ['goldlegend', 'comet'], beats: [
    { who: null, say: 'Dax and Vesper wheel a bike through the city. Its wheel is 60 cm across.', add: { t: '60' } },
    { who: 'comet', say: 'How far does it roll in one turn? About 60 cm?' },
    { who: 'goldlegend', say: 'More. The distance round is about 3.14 times the distance across.' },
    { who: 'comet', say: 'Three times first.', add: { t: '3 × 60', v: 180 } },
    { who: 'goldlegend', say: 'Then the small part.', add: { t: '0.14 × 60', v: 8.4 } },
    { who: 'comet', say: '188.4 cm every turn — nearly two metres!', add: { t: '180 + 8.4', v: 188.4 } },
  ] },
};
