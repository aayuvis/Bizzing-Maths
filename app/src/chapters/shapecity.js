/* shapecity.js — Shape City: flat shapes, solid shapes, angles, symmetry,
   circles and coordinates. The contract is docs/CHAPTER-CONTRACT.md.

   Every picture here is drawn from the same numbers the question is built
   from, so the drawing can never disagree with the sum. Where a stop names a
   shape, `expr` works the name out from its properties (or, for symmetry,
   by actually reflecting the drawn corners), never from the name itself. */

import { int, pick, shuffle } from '../rand.js';
import { poly, coords, svg, text } from './kit.js';

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

/* A polygon with side labels AND corner labels (angles written inside each corner).
   Side labels sit just outside each side, anchored away from it so they never cross a line. */
function figure(pts, sides = [], corners = [], fill = 'dg-fill2', padX = 56, padY = 30) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs) - padX, y0 = Math.min(...ys) - padY, w = Math.max(...xs) - x0 + padX, h = Math.max(...ys) - y0 + padY;
  const cx = xs.reduce((a, b) => a + b, 0) / pts.length, cy = ys.reduce((a, b) => a + b, 0) / pts.length;
  const area = pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0), sg = Math.sign(area) || 1;
  let s = `<polygon points="${pts.map((p) => `${R3(p[0] - x0)},${R3(p[1] - y0)}`).join(' ')}" class="${fill}"/>`;
  sides.forEach((l, i) => {
    if (!l) return; const a = pts[i], b = pts[(i + 1) % pts.length], ex = b[0] - a[0], ey = b[1] - a[1], len = Math.hypot(ex, ey) || 1;
    const nx = (ey / len) * sg, ny = (-ex / len) * sg;
    const anchor = nx > 0.45 ? 'start' : nx < -0.45 ? 'end' : 'middle', dy = ny > 0.45 ? 15 : ny < -0.45 ? -5 : 5;
    s += text(R3((a[0] + b[0]) / 2 + nx * 9 - x0), R3((a[1] + b[1]) / 2 + ny * 9 - y0 + dy), l, 'dg-text', anchor);
  });
  corners.forEach((l, i) => {
    if (!l) return; const [x, y] = pts[i]; const dx = cx - x, dy = cy - y, d = Math.hypot(dx, dy) || 1;
    s += text(R3(x + (dx / d) * 30 - x0), R3(y + (dy / d) * 30 - y0 + 5), l, 'dg-accent');
  });
  return svg(R3(w), R3(h), s, 'A shape');
}

/* An angle of d degrees: one arm along the bottom, the arc showing the turn. Room for reflex angles too. */
function angleFig(d) {
  const R = 100, ar = 30, cx = 120, cy = d > 180 ? 120 : 112, a = d * RAD;
  const x2 = R3(cx + R * Math.cos(a)), y2 = R3(cy - R * Math.sin(a));
  let s = `<line x1="${cx}" y1="${cy}" x2="${cx + R}" y2="${cy}" class="dg-line"/><line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" class="dg-line"/>`;
  s += `<path d="M${cx + ar},${cy} A${ar},${ar} 0 ${d > 180 ? 1 : 0} 0 ${R3(cx + ar * Math.cos(a))},${R3(cy - ar * Math.sin(a))}" class="dg-arc"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="4" class="dg-dot"/>`;
  return svg(240, d > 180 ? 240 : cy + 14, s, 'An angle');
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

/* A base AB drawn flat, with the compass radius to swing from each end
   written above it. No arcs: whether two arcs of those radii meet IS the
   answer, so the picture states the lengths and leaves the meeting to you. */
function baseFig(base, fromA, fromB) {
  const x1 = 60, x2 = 280, y = 96;
  let s = `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="dg-line"/><circle cx="${x1}" cy="${y}" r="5" class="dg-dot"/><circle cx="${x2}" cy="${y}" r="5" class="dg-dot"/>`;
  s += text(x1, y + 24, 'A', 'dg-text') + text(x2, y + 24, 'B', 'dg-text') + text((x1 + x2) / 2, y + 24, base, 'dg-text');
  s += text(x1, y - 22, `arc ${fromA}`, 'dg-accent') + text(x2, y - 22, `arc ${fromB}`, 'dg-accent');
  s += text((x1 + x2) / 2, 22, 'compass arcs from each end of the base', 'dg-small');
  return svg(340, y + 40, s, `A base of ${base}; arcs of ${fromA} from A and ${fromB} from B`);
}

/* An angle of d degrees with its bisector dashed in, a label in each half and a caption underneath. */
function bisectFig(d, l1, l2, caption) {
  const R = 110, cx = 140, cy = 146, P = (a, rr) => [R3(cx + rr * Math.cos(a * RAD)), R3(cy - rr * Math.sin(a * RAD))];
  const [x1, y1] = P(d, R), [bx, by] = P(d / 2, R + 8), [ax, ay] = P(d, 34);
  let s = `<line x1="${cx}" y1="${cy}" x2="${cx + R}" y2="${cy}" class="dg-line"/><line x1="${cx}" y1="${cy}" x2="${x1}" y2="${y1}" class="dg-line"/>`;
  s += `<line x1="${cx}" y1="${cy}" x2="${bx}" y2="${by}" class="dg-thin" stroke-dasharray="6 5"/>`;
  s += `<path d="M${cx + 34},${cy} A34,34 0 0 0 ${ax},${ay}" class="dg-arc"/><circle cx="${cx}" cy="${cy}" r="4" class="dg-dot"/>`;
  const lr = d / 2 < 24 ? 128 : 70;
  if (l1) { const [x, y] = P(d / 4, lr); s += text(x, R3(y + 5), l1, 'dg-accent'); }
  if (l2) { const [x, y] = P((3 * d) / 4, lr); s += text(x, R3(y + 5), l2, 'dg-accent'); }
  s += text(cx, cy + 32, caption, 'dg-text');
  return svg(300, cy + 44, s, 'An angle cut in two by its bisector');
}

/* Triangle ABC with the bisectors of B and C meeting at I (the centre of the circle that fits inside). */
function incentreFig(A, B, C) {
  const p = triFromAngles(A, B, C), d = (i, j) => Math.hypot(p[i][0] - p[j][0], p[i][1] - p[j][1]);
  const a = d(1, 2), b = d(0, 2), c = d(0, 1), w = a + b + c;
  const I = [(a * p[0][0] + b * p[1][0] + c * p[2][0]) / w, (a * p[0][1] + b * p[1][1] + c * p[2][1]) / w];
  const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]), x0 = Math.min(...xs) - 70, y0 = Math.min(...ys) - 34;
  const W = Math.max(...xs) - x0 + 70, H = Math.max(...ys) - y0 + 34, X = (v) => R3(v[0] - x0), Y = (v) => R3(v[1] - y0);
  const cx = (xs[0] + xs[1] + xs[2]) / 3, cy = (ys[0] + ys[1] + ys[2]) / 3;
  let s = `<polygon points="${p.map((q) => `${X(q)},${Y(q)}`).join(' ')}" class="dg-fill2"/>`;
  for (const k of [1, 2]) s += `<line x1="${X(p[k])}" y1="${Y(p[k])}" x2="${X(I)}" y2="${Y(I)}" class="dg-line" stroke-dasharray="6 5"/>`;
  s += `<circle cx="${X(I)}" cy="${Y(I)}" r="4" class="dg-dot"/>`;
  ['A', `B ${B}°`, `C ${C}°`].forEach((l, i) => {
    const dx = p[i][0] - cx, dy = p[i][1] - cy, n = Math.hypot(dx, dy) || 1;
    s += text(R3(p[i][0] + (dx / n) * 22 - x0), R3(p[i][1] + (dy / n) * 22 - y0 + 5), l, i ? 'dg-accent' : 'dg-text');
  });
  // I's label sits on the far side from BC, so it never lands inside the angle being asked about
  const mx = (p[1][0] + p[2][0]) / 2, my = (p[1][1] + p[2][1]) / 2, ux = I[0] - mx, uy = I[1] - my, un = Math.hypot(ux, uy) || 1;
  s += text(R3(I[0] + (ux / un) * 16 - x0), R3(I[1] + (uy / un) * 16 - y0 + 5), 'I ?', 'dg-accent');
  return svg(R3(W), R3(H), s, 'Triangle ABC with the bisectors of angles B and C meeting at I');
}

/* Heron's formula squared: positive for a real triangle, 0 for one lying flat, negative when the sides cannot meet.
   Written out for `expr`, so the construction's rule is checked against a different piece of mathematics. */
const HERON = '((a,b,c)=>{const s=(a+b+c)/2;return s*(s-a)*(s-b)*(s-c);})';
const pt = ([x, y]) => `(${x}, ${y})`;
const sq = (P, Q) => (P[0] - Q[0]) ** 2 + (P[1] - Q[1]) ** 2;
/* For a step's `x`: the i-th number written in the question, read back from its own text. */
const said = (text, i = 0) => `Number(${JSON.stringify(text)}.match(/\\d+(\\.\\d+)?/g)[${i}])`;
/* For a step's `x`: fold the drawn corners in every candidate line and count the folds that land,
   keeping those that do (thr = true) or do not (thr = false) pass through a corner. */
const foldX = (pts, thr) => `((P)=>{const n=P.length,cx=P.reduce((a,p)=>a+p[0],0)/n,cy=P.reduce((a,p)=>a+p[1],0)/n,seen=[];let c=0;P.forEach((p,i)=>{const q=P[(i+1)%n];for(const [x,y] of [p,[(p[0]+q[0])/2,(p[1]+q[1])/2]]){const th=((Math.atan2(y-cy,x-cx)%Math.PI)+Math.PI)%Math.PI;if(seen.some((f)=>Math.abs(f-th)<1e-3||Math.abs(Math.abs(f-th)-Math.PI)<1e-3))continue;seen.push(th);const C=Math.cos(2*th),S=Math.sin(2*th);if(!P.every(([X,Y])=>{const u=X-cx,v=Y-cy;return P.some((r)=>Math.hypot(r[0]-(C*u+S*v+cx),r[1]-(S*u-C*v+cy))<0.05);}))continue;if(P.some((r)=>Math.abs((r[0]-cx)*Math.sin(th)-(r[1]-cy)*Math.cos(th))<0.05)===${thr})c++;}});return c;})(${JSON.stringify(pts)})`;
/* For a step's `x`: the four sides of a drawn four-sided shape, as vectors. */
const sidesX = (pts) => `${JSON.stringify(pts)}.map((p,i,P)=>[P[(i+1)%4][0]-p[0],P[(i+1)%4][1]-p[1]])`;

/* ------------------------------------------------------------ names */

const POLY = ['triangle', 'square', 'pentagon', 'hexagon', 'heptagon', 'octagon', 'nonagon', 'decagon'];
const QUADS = ['square', 'rectangle', 'rhombus', 'parallelogram', 'trapezium', 'kite'];
/* Each four-sided shape by its properties: all sides equal (E), right angles (R), pairs of parallel sides (P). */
const QF = {
  square: { E: 1, R: 1, P: 2, pts: [[0, 0], [110, 0], [110, 110], [0, 110]],
    say: 'All four sides are the same length, and every corner is a right angle.' },
  rectangle: { E: 0, R: 1, P: 2, pts: [[0, 0], [170, 0], [170, 90], [0, 90]],
    say: 'Every corner is a right angle, and opposite sides are equal — but the sides are not all the same length.' },
  rhombus: { E: 1, R: 0, P: 2, pts: [[0, 0], [110, 0], [176, 88], [66, 88]],
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
      'That is why a shape is named by one number. The start of each name is an old counting word: tri- means three (like a tricycle), penta- five, hexa- six, hepta- seven, octa- eight (like an octopus), nona- nine and deca- ten. A square is the special four-sided shape with equal sides and square corners.',
      'Size and turning do not change the name. A tiny hexagon and a huge one, standing up or tipped over, both have six sides — so count, do not guess from the look.',
    ],
    alg: 'sides = corners = n',
    ex: { n: 6, ask: 'name', opts: ['pentagon', 'hexagon', 'octagon', 'square'] },
    caseKey: 'ask',
    cases: [
      { label: 'Name the shape', note: 'Count the sides, then turn the number into its name: hexa- means six, so six sides is a hexagon.',
        ex: { n: 6, ask: 'name', opts: ['pentagon', 'hexagon', 'octagon', 'square'] } },
      { label: 'Count the corners', note: 'You do not need to count the corners at all: every side ends at a corner, so there are just as many corners as sides.',
        ex: { n: 5, ask: 'corners', opts: null } },
      { label: 'Count the sides', note: 'Put your finger on one side and go round, so you never count a side twice. Starting at a corner you remember helps.',
        ex: { n: 8, ask: 'sides', opts: null } },
    ],
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
      const P = JSON.stringify(regular(n));   // the drawn shape: count its edges, and its corners
      const s = [{ t: 'Count the sides', v: n, x: `${P}.map((p,i,A)=>[p,A[(i+1)%A.length]]).filter(([a,b])=>a[0]!==b[0]||a[1]!==b[1]).length` }, { t: 'Count the corners', v: n, x: `${P}.length` }];
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
      'A rectangle has only two. Fold it corner to corner and the long side lands on the short side, which does not fit — so the diagonal is not a line of symmetry, even though it cuts the rectangle into two equal halves. Some shapes have none at all: a parallelogram or a scalene triangle looks balanced, but every fold leaves a corner hanging over the edge.',
    ],
    alg: 'regular n-sided shape: n lines of symmetry',
    ex: { k: 'rectangle' },
    caseKey: 'fold',
    cases: [
      { label: 'Folds through middles', note: 'A rectangle folds top to bottom and side to side. The diagonal is NOT a fold: the long side would land on the short side.',
        ex: { k: 'rectangle' } },
      { label: 'Regular, odd sides', note: 'With an odd number of equal sides, every fold runs from a corner to the middle of the opposite side — one fold for every corner.',
        ex: { k: 'reg5' } },
      { label: 'Regular, even sides', note: 'With an even number of equal sides, half the folds join opposite corners and half join the middles of opposite sides.',
        ex: { k: 'reg6' } },
      { label: 'Folds through corners', note: 'A kite folds only down its long middle, from corner to corner. Folding it across leaves the top and bottom not matching.',
        ex: { k: 'kite' } },
      { label: 'No fold at all', note: 'A parallelogram looks balanced, but try every fold and a corner always sticks out. Two equal halves are not enough — they must land on each other.',
        ex: { k: 'parallelogram' } },
    ],
    gen(r, lv = 1) {
      const pool = lv === 1 ? ['reg3', 'reg4', 'reg6', 'rectangle', 'isosceles']
        : lv === 2 ? ['reg4', 'reg5', 'reg6', 'reg8', 'rectangle', 'rhombus', 'kite', 'parallelogram', 'scalene']
          : ['reg5', 'reg7', 'reg8', 'rhombus', 'kite', 'trapezium', 'parallelogram', 'rightiso', 'isosceles', 'scalene'];
      return this.q({ k: pick(pool, r) });
    },
    q({ k }) {
      const S = SYM[k];
      const fold = k.startsWith('reg') ? (S.pts.length % 2 ? 'regular-odd' : 'regular-even') : S.c + S.o === 0 ? 'none' : S.o === 0 ? 'corners' : 'middles';
      return { k, fold, text: `${k.startsWith('reg') ? 'All its sides and corners are equal. ' : ''}How many lines of symmetry does this shape have?`,
        expr: `${mirrors(S.pts)}`, ans: S.c + S.o };
    },
    work({ k }) {
      const S = SYM[k];
      return [
        { t: 'Fold lines that pass through a corner', v: S.c, x: foldX(S.pts, true) },
        { t: 'Fold lines that pass through no corner (middle of a side to middle of a side)', v: S.o, x: foldX(S.pts, false) },
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
    caseKey: 'ans',
    cases: [
      { label: 'Equilateral', note: 'All three sides are the same length — and so all three angles are the same too: 180° ÷ 3 = 60° each.',
        ex: { mode: 'sides', s: [6, 6, 6], opts: ['isosceles', 'scalene', 'equilateral'] } },
      { label: 'Isosceles', note: 'Exactly two sides match. The two angles at the ends of the odd side match as well, because the triangle is its own mirror image.',
        ex: { mode: 'sides', s: [5, 5, 8], opts: ['scalene', 'equilateral', 'isosceles'] } },
      { label: 'Scalene', note: 'No two sides match, so no two angles match either. Most triangles you draw without trying are scalene.',
        ex: { mode: 'sides', s: [4, 6, 7], opts: ['equilateral', 'scalene', 'isosceles'] } },
      { label: 'Right-angled', note: 'Now sort by the biggest angle instead. One angle is exactly 90° — a square corner.',
        ex: { mode: 'angles', s: [35, 55, 90], opts: ['acute-angled', 'right-angled', 'obtuse-angled'] } },
      { label: 'Acute-angled', note: 'Every angle is smaller than 90°. Find the third angle first — it is the one people forget to check.',
        ex: { mode: 'angles', s: [50, 60, 70], opts: ['right-angled', 'obtuse-angled', 'acute-angled'] } },
      { label: 'Obtuse-angled', note: 'One angle is bigger than 90°. There can only ever be one, because the three angles share just 180°.',
        ex: { mode: 'angles', s: [25, 35, 120], opts: ['obtuse-angled', 'acute-angled', 'right-angled'] } },
    ],
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
        return [{ t: `The third angle: 180 − ${a} − ${b}`, v: c, x: `180-${a}-${b}` }, { t: 'The biggest of the three angles', v: Math.max(a, b, c), x: `Math.max(${a},${b},180-${a}-${b})` }, { t: 'So the triangle is', v: q.ans, choices: opts }];
      }
      const eq = new Set(s).size === 1 ? 3 : new Set(s).size === 2 ? 2 : 0;
      return [{ t: 'How many sides share a length with another side?', v: eq, x: `[${s}].filter((x,i,A)=>A.indexOf(x)!==A.lastIndexOf(x)).length` }, { t: 'So the triangle is', v: q.ans, choices: opts }];
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
    caseKey: 'k',
    cases: [
      { label: 'Square', note: 'Every rule at once: two pairs of parallel sides, all four sides equal, and every corner a right angle.',
        ex: { k: 'square', opts: ['rhombus', 'square', 'rectangle', 'kite'] } },
      { label: 'Rectangle', note: 'Right angles, but the sides are not all the same — two long, two short. A square is a rectangle whose sides happen to match.',
        ex: { k: 'rectangle', opts: ['square', 'parallelogram', 'rectangle', 'trapezium'] } },
      { label: 'Rhombus', note: 'All four sides equal, like a square — but pushed over, so no corner is a right angle.',
        ex: { k: 'rhombus', opts: ['square', 'rhombus', 'kite', 'rectangle'] } },
      { label: 'Parallelogram', note: 'Two pairs of parallel sides and nothing more: no right angles, and the sides are not all equal. A rectangle pushed over.',
        ex: { k: 'parallelogram', opts: ['rhombus', 'trapezium', 'parallelogram', 'rectangle'] } },
      { label: 'Trapezium', note: 'Only ONE pair of parallel sides. That single missing pair is what stops it being a parallelogram.',
        ex: { k: 'trapezium', opts: ['trapezium', 'kite', 'parallelogram', 'square'] } },
      { label: 'Kite', note: 'No parallel sides at all. The equal sides come in pairs that sit next to each other, not opposite.',
        ex: { k: 'kite', opts: ['rhombus', 'trapezium', 'square', 'kite'] } },
    ],
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
        // x measures the drawn corners: opposite sides parallel, side lengths, corner dot products
        { t: 'How many pairs of parallel sides?', v: P, x: `((v)=>[[0,2],[1,3]].filter(([i,j])=>Math.abs(v[i][0]*v[j][1]-v[i][1]*v[j][0])<1e-9).length)(${sidesX(QF[k].pts)})` },
        { t: 'Are all four sides the same length?', v: E ? 'Yes' : 'No', choices: yn, x: `((v)=>v.every((u)=>Math.abs(Math.hypot(...u)-Math.hypot(...v[0]))<1e-9)?'Yes':'No')(${sidesX(QF[k].pts)})` },
        { t: 'Are the corners right angles?', v: R ? 'Yes' : 'No', choices: yn, x: `((v)=>v.every((u,i)=>Math.abs(u[0]*v[(i+1)%4][0]+u[1]*v[(i+1)%4][1])<1e-9)?'Yes':'No')(${sidesX(QF[k].pts)})` },
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
    caseKey: 'idea',
    cases: [
      { label: 'Edges of a prism', note: 'Three rings of edges: round the front end, round the back end, and running between them. So 3 × the sides of an end.',
        ex: { name: 'hexagonal prism', ask: 'edges' } },
      { label: 'Faces of a prism', note: 'One flat side for every side of the end shape — and do not forget the two ends themselves.',
        ex: { name: 'pentagonal prism', ask: 'faces' } },
      { label: 'Corners of a prism', note: 'All the corners sit on the two ends, so it is twice the corners of one end.',
        ex: { name: 'triangular prism', ask: 'vertices' } },
      { label: 'Edges of a pyramid', note: 'One ring round the base, and one edge from each base corner up to the tip: 2 × the sides of the base.',
        ex: { name: 'square-based pyramid', ask: 'edges' } },
      { label: 'Faces of a pyramid', note: 'A triangle leans in from every side of the base — plus the base, which is easy to forget because it is underneath.',
        ex: { name: 'pentagonal pyramid', ask: 'faces' } },
      { label: 'Corners of a pyramid', note: 'The corners of the base, and then the tip on top: one more than the base has.',
        ex: { name: 'hexagonal pyramid', ask: 'vertices' } },
      { label: "Edges by Euler's rule", note: 'No picture and no name — just two counts. Faces + vertices − edges is always 2, so the edges are 2 fewer than faces + vertices.',
        ex: { name: null, kind: 'prism', n: 5, ask: 'euler' } },
    ],
    sources: ['L. Euler, "Elementa doctrinae solidorum", Novi Commentarii academiae scientiarum Petropolitanae 4 (1758) — the relation F + V − E = 2 for polyhedra.'],
    gen(r, lv = 1) {
      const names = Object.keys(SOLIDS);
      if (lv === 1) return this.q({ name: pick(['cube', 'cuboid', 'square-based pyramid', 'triangular prism'], r), ask: pick(['faces', 'edges', 'vertices'], r) });
      if (lv === 2) return this.q({ name: pick(names, r), ask: pick(['faces', 'edges', 'vertices'], r) });
      const kind = pick(['prism', 'pyramid'], r), n = int(5, 12, r);
      return this.q({ name: null, kind, n, ask: 'euler' });
    },
    q({ name, kind, n, ask }) {
      const S = name ? SOLIDS[name] : { kind, n }, C = count(S.kind, S.n), idea = ask === 'euler' ? 'euler' : `${S.kind} ${ask}`;
      if (ask === 'euler') return { name, kind, n, ask, idea, text: `A solid has ${C.F} faces and ${C.V} vertices (corners). Use Euler's rule: how many edges does it have?`,
        expr: `${S.kind === 'prism' ? `3*${S.n}` : `2*${S.n}`}`, ans: C.E };
      const word = ask === 'vertices' ? 'vertices (corners)' : ask;
      const other = ask === 'faces' ? `${C.E}-${C.V}+2` : ask === 'edges' ? `${C.F}+${C.V}-2` : `${C.E}-${C.F}+2`;
      return { name, kind, n, ask, idea, text: `How many ${word} does a ${name} have?`, expr: other, ans: C[ask[0].toUpperCase()] };
    },
    work({ name, kind, n, ask }) {
      const S = name ? SOLIDS[name] : { kind, n }, C = count(S.kind, S.n), m = S.n;
      if (ask === 'euler') return [{ t: `Faces + vertices: ${C.F} + ${C.V}`, v: C.F + C.V, x: `${C.F}+${C.V}` }, { t: 'Edges are 2 fewer than that', v: C.E }];
      // x: the sides of the end shape, read from the solid's own name (a cube and a cuboid have square ends)
      const end = /^cub/.test(name) ? 'square' : name.split(/[ -]/)[0];
      const mx = `['triangular','square','pentagonal','hexagonal','heptagonal','octagonal'].indexOf('${end}')+3`;
      if (S.kind === 'prism') {
        if (ask === 'faces') return [{ t: 'The two ends', v: 2, x: "['front','back'].length" }, { t: 'One flat side for each side of an end', v: m, x: mx }, { t: 'Faces altogether', v: C.F }];
        if (ask === 'edges') return [{ t: 'Edges round the front end', v: m, x: mx }, { t: 'Round the back end', v: m, x: mx }, { t: 'Running from end to end', v: m, x: mx }, { t: 'Edges altogether', v: C.E }];
        return [{ t: 'Corners on one end', v: m, x: mx }, { t: 'Corners on both ends', v: C.V }];
      }
      if (ask === 'faces') return [{ t: 'The base', v: 1, x: "['base'].length" }, { t: 'One triangle for each side of the base', v: m, x: mx }, { t: 'Faces altogether', v: C.F }];
      if (ask === 'edges') return [{ t: 'Edges round the base', v: m, x: mx }, { t: 'Edges up to the tip', v: m, x: mx }, { t: 'Edges altogether', v: C.E }];
      return [{ t: 'Corners of the base', v: m, x: mx }, { t: 'Add the tip', v: C.V }];
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
    caseKey: 'ans',
    cases: [
      { label: 'Acute', note: 'It fits inside the corner of a page with room to spare: smaller than a right angle. Acute means sharp.',
        ex: { d: 40, lv: 1, opts: ['acute', 'obtuse', 'right', 'reflex'] } },
      { label: 'Right', note: 'Exactly a quarter turn, 90° — the corner of a page fits it perfectly. Not a little more, not a little less.',
        ex: { d: 90, lv: 1, opts: ['reflex', 'right', 'acute', 'obtuse'] } },
      { label: 'Obtuse', note: 'It pokes out past the corner of a page, but has not yet opened as wide as a straight line. Obtuse means blunt.',
        ex: { d: 130, lv: 1, opts: ['acute', 'obtuse', 'right', 'reflex'] } },
      { label: 'Reflex', note: 'It has turned past a straight line (180°). Look at which side the arc is on — it is the big, outside angle.',
        ex: { d: 250, lv: 1, opts: ['obtuse', 'acute', 'reflex', 'right'] } },
    ],
    gen(r, lv = 1) {
      const kind = lv === 1 ? pick(['acute', 'right', 'obtuse'], r) : pick(['acute', 'right', 'obtuse', 'reflex', 'acute', 'obtuse', 'reflex'], r);
      const d = kind === 'right' ? 90 : kind === 'acute' ? (lv === 1 ? int(4, 14, r) * 5 : lv === 2 ? int(10, 80, r) : int(10, 88, r))
        : kind === 'obtuse' ? (lv === 1 ? int(22, 32, r) * 5 : lv === 2 ? int(100, 172, r) : int(92, 175, r)) : int(195, 340, r);
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
        { t: 'Against a square corner (90°), is it smaller, the same or bigger?', v: c, choices: ['smaller', 'the same', 'bigger'], x: `['smaller','the same','bigger'][Math.sign(${d}-90)+1]` },
        { t: 'Has it gone past a straight line (180°)?', v: d > 180 ? 'Yes' : 'No', choices: ['Yes', 'No'], x: `${d}-180>0?'Yes':'No'` },
        { t: 'So it is', v: d < 90 ? 'acute' : d === 90 ? 'right' : d < 180 ? 'obtuse' : 'reflex', choices: opts },
      ];
    },
    draw({ d }) { return angleFig(d); },
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
    caseKey: 'step',
    cases: [
      { label: 'Read the across number', note: 'The x-coordinate is always the FIRST number: how far you walk along the bottom before you climb.',
        ex: { lv: 1, x: 4, y: 6, dx: 0, dy: 0, ask: 'x' } },
      { label: 'Read the up number', note: 'The y-coordinate is the SECOND number: how far you climb once you are under the point.',
        ex: { lv: 1, x: 6, y: 3, dx: 0, dy: 0, ask: 'y' } },
      { label: 'Move right or up: add', note: 'Moving right makes the across number bigger, so add. Moving up would add to the up number instead.',
        ex: { lv: 2, x: 3, y: 2, dx: 4, dy: 1, ask: 'x' } },
      { label: 'Move left or down: take away', note: 'Moving left or down goes back towards 0, so take away.',
        ex: { lv: 2, x: 7, y: 5, dx: -3, dy: 2, ask: 'x' } },
      { label: 'A move that leaves it alone', note: 'Moving only up or down never changes the across number — walking up stairs does not move you sideways.',
        ex: { lv: 2, x: 4, y: 3, dx: 0, dy: 5, ask: 'x' } },
      { label: 'How far it moved', note: 'Working backwards: the gap between the two across numbers is how far it slid sideways (or the up numbers, for up and down).',
        ex: { lv: 3, x: 2, y: 3, dx: 5, dy: 4, ask: 'right' } },
    ],
    gen(r, lv = 1) {
      const x = int(1, 8, r), y = int(1, 8, r);
      if (lv === 1) return this.q({ lv, x, y, dx: 0, dy: 0, ask: pick(['x', 'y'], r) });
      let dx, dy; do { dx = int(-x, 10 - x, r); dy = int(-y, 10 - y, r); } while ((lv === 2 && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) || (lv === 3 && (dx === 0 || dy === 0)) || (dx === 0 && dy === 0));
      return this.q({ lv, x, y, dx, dy, ask: lv === 3 ? pick(['right', 'up'], r) : pick(['x', 'y'], r) });
    },
    q({ lv, x, y, dx, dy, ask }) {
      const mv = (v, pos, neg) => (v === 0 ? '' : `${Math.abs(v)} ${v > 0 ? pos : neg}`);
      const dv = ask === 'x' ? dx : dy, step = lv === 1 ? `read-${ask}` : lv === 3 ? 'gap' : dv > 0 ? 'add' : dv < 0 ? 'take' : 'stay';
      if (lv === 1) return { lv, x, y, dx, dy, ask, step, text: `What is the ${ask}-coordinate of point A?`, expr: ask === 'x' ? `${x}` : `${y}`, ans: ask === 'x' ? x : y };
      if (lv === 3) {
        const h = ask === 'right', v = h ? dx : dy, word = h ? (v > 0 ? 'right' : 'left') : (v > 0 ? 'up' : 'down');
        return { lv, x, y, dx, dy, ask, step, text: `Point A slides to point B. How many squares ${word} did it move?`,
          expr: h ? `Math.abs(${x + dx}-${x})` : `Math.abs(${y + dy}-${y})`, ans: Math.abs(v) };
      }
      const moves = [mv(dx, 'right', 'left'), mv(dy, 'up', 'down')].filter(Boolean).join(' and ');
      return { lv, x, y, dx, dy, ask, step, text: `Point A moves ${moves}. What is its new ${ask}-coordinate?`,
        expr: ask === 'x' ? `${x}+(${dx})` : `${y}+(${dy})`, ans: ask === 'x' ? x + dx : y + dy };
    },
    work({ lv, x, y, dx, dy, ask }) {
      // x reads the drawn point A = [x, y] (across first), and B as A moved by [dx, dy]
      const A = `[${x},${y}]`, B = `[${x}+(${dx}),${y}+(${dy})]`;
      if (lv === 1) return ask === 'x'
        ? [{ t: 'Across the bottom first: how many squares to get under A?', v: x, x: `${A}[0]` }, { t: 'The x-coordinate is the across number', v: x }]
        : [{ t: 'Across the bottom first: how many squares to get under A?', v: x, x: `${A}[0]` }, { t: 'Then up: how many squares to reach A?', v: y }];
      if (lv === 3) return ask === 'right'
        ? [{ t: 'The x-coordinate of B', v: x + dx, x: `${B}[0]` }, { t: 'The x-coordinate of A', v: x, x: `${A}[0]` }, { t: 'The gap between them', v: Math.abs(dx) }]
        : [{ t: 'The y-coordinate of B', v: y + dy, x: `${B}[1]` }, { t: 'The y-coordinate of A', v: y, x: `${A}[1]` }, { t: 'The gap between them', v: Math.abs(dy) }];
      const h = ask === 'x', v = h ? dx : dy, s0 = h ? x : y;
      return [{ t: `A starts with ${ask} =`, v: s0, x: `${A}[${h ? 0 : 1}]` }, { t: v === 0 ? `It does not move ${h ? 'sideways' : 'up or down'}, so ${ask} stays` : `${v > 0 ? 'Add' : 'Take away'} ${Math.abs(v)}`, v: s0 + v }];
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
    caseKey: 'full',
    cases: [
      { label: 'On a straight line', note: 'A straight line is half a turn, so the angles along it share 180° between them.',
        ex: { full: false, known: [125], pos: 1 } },
      { label: 'Round a point', note: 'All the way round is a whole turn, 360°. Add every angle you know first, then see what is left.',
        ex: { full: true, known: [100, 120, 60], pos: 2 } },
    ],
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
        { t: full ? 'All the way round a point makes' : 'Angles on a straight line make', v: total, x: full ? '4*90' : '2*90' },
        { t: known.length > 1 ? 'Add the angles you know' : 'The angle you know', v: sum, x: `[${known}].reduce((a,b)=>a+b,0)` },
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
    caseKey: 'kind',
    cases: [
      { label: 'A triangle', note: 'Three angles always fill 180° — tear the corners off and they make a straight line.',
        ex: { kind: 'tri', angles: [50, 60, 70], hide: 2 } },
      { label: 'An isosceles triangle', note: 'You know only ONE angle, but the other two are equal. Take the top angle from 180°, then halve what is left.',
        ex: { kind: 'iso', apex: 40 } },
      { label: 'A four-sided shape', note: 'Cut it corner to corner into two triangles: two lots of 180° make 360°.',
        ex: { kind: 'quad', angles: [70, 95, 110, 85], hide: 3 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const kind = lv === 1 ? 'tri' : lv === 2 ? pick(['tri', 'iso', 'right'], r) : pick(['quad', 'quad', 'iso'], r);
        if (kind === 'iso') return this.q({ kind, apex: int(10, 60, r) * 2 });
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
      if (kind === 'iso') return [{ t: 'Angles in a triangle add up to', v: 180, x: '2*90' }, { t: `180 − ${apex}`, v: 180 - apex, x: `180-${apex}` }, { t: 'Shared between the two equal angles', v: (180 - apex) / 2 }];
      const total = kind === 'quad' ? 360 : 180, sum = angles.reduce((a, b, i) => (i === hide ? a : a + b), 0);
      return [
        { t: kind === 'quad' ? 'Angles in a four-sided shape add up to' : 'Angles in a triangle add up to', v: total, x: kind === 'quad' ? '2*180' : '2*90' },
        { t: `Add the ${kind === 'quad' ? 'three' : 'two'} you know`, v: sum, x: `[${angles.filter((_, i) => i !== hide)}].reduce((a,b)=>a+b,0)` },
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
    caseKey: 'ask',
    cases: [
      { label: 'Radius to diameter', note: 'The diameter goes right across through the centre: one radius out and one radius back, so double it.',
        ex: { ask: 'diam', v: 6 } },
      { label: 'Diameter to radius', note: 'Going the other way, the radius is only halfway across — so halve the diameter.',
        ex: { ask: 'rad', v: 14 } },
      { label: 'Round, from the diameter', note: 'The distance round is a little more than 3 diameters: 3.14 × the diameter. Do the 3 × first, then add the small 0.14 ×.',
        ex: { ask: 'circ-d', v: 12 } },
      { label: 'Round, from the radius', note: 'π works with the diameter, so double the radius FIRST. Multiplying the radius by 3.14 gives only half the way round.',
        ex: { ask: 'circ-r', v: 5 } },
    ],
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
    work({ ask, v, text }) {
      if (ask === 'diam') return [{ t: 'The radius', v, x: said(text) }, { t: 'Two radii end to end', v: 2 * v }];
      if (ask === 'rad') return [{ t: 'The diameter', v, x: said(text) }, { t: 'Half of it', v: v / 2 }];
      const d = ask === 'circ-r' ? 2 * v : v, s = [], dx = ask === 'circ-r' ? `(${v}+${v})` : `${v}`;
      if (ask === 'circ-r') s.push({ t: `The diameter: 2 × ${v}`, v: d, x: `${v}+${v}` });
      s.push({ t: `3 × ${d}`, v: 3 * d, x: `${dx}+${dx}+${dx}` }, { t: `0.14 × ${d}`, v: Math.round(14 * d) / 100, x: `14*${dx}/100` }, { t: 'Add them', v: Math.round(314 * d) / 100 });
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
  {
    id: 'construct-triangle', world: 'shapecity', band: '11-14', title: 'Building a triangle from three sides',
    hook: 'Three sticks: 3 cm, 4 cm and 7 cm. Can they make a triangle? Build it with a ruler and compasses before you guess.',
    idea: 'Draw the longest side, then swing an arc from each end for the other two: a triangle is only possible if the two shorter sides add up to MORE than the longest.',
    why: [
      'Draw the longest side as the base, from A to B. The third corner must be 3 cm from A, and every point 3 cm from A lies on a circle round A — so open the compasses to 3 cm and swing an arc from A. Do the same from B with 4 cm. The third corner is wherever the two arcs cross.',
      'The arcs can only cross if the two shorter sides, laid end to end, reach further than the base. If they add up to less, the arcs never meet. If they add up to exactly the base — 3 + 4 = 7 — the arcs only touch, on the base line itself: the "triangle" lies flat and has no third corner. So the two shorter sides must add up to more than the longest one.',
      'When the arcs do cross, the triangle is fixed: any triangle with those three sides fits exactly on top of yours. That is why a frame of three rods is rigid when four rods wobble. It also tells you what a missing third side can be: longer than the difference of the other two, shorter than their sum, and never exactly either.',
    ],
    alg: 'sides a ≤ b ≤ c make a triangle only if a + b > c · third side x: (b − a) < x < (a + b)',
    ex: { mode: 'can', s: [3, 4, 7], opts: ['Yes', 'No'] },
    caseKey: 'sort',
    cases: [
      { label: 'The arcs cross', note: 'The two shorter sides together reach further than the base, so the arcs cross above it and the third corner is there.',
        ex: { mode: 'can', s: [5, 6, 8], opts: ['Yes', 'No'] } },
      { label: 'The arcs never meet', note: 'The two shorter sides together do not even reach across the base, so the arcs stop short of each other.',
        ex: { mode: 'can', s: [2, 3, 8], opts: ['Yes', 'No'] } },
      { label: 'The arcs only touch', note: 'The trap: the shorter sides add up to EXACTLY the base. The arcs meet on the base line, the triangle lies flat — so the answer is still no.',
        ex: { mode: 'can', s: [3, 4, 7], opts: ['Yes', 'No'] } },
      { label: 'Longest third side', note: 'The third side must be shorter than the other two laid end to end — so one less than their sum, as a whole number.',
        ex: { mode: 'max', s: [5, 8] } },
      { label: 'Shortest third side', note: 'The short side and the third side must reach past the long one — so the third side must be MORE than the difference.',
        ex: { mode: 'min', s: [5, 8] } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 3 && r() < 0.5) {
          const p = int(3, 15, r); let q = int(2, 15, r); if (q === p) q++;
          return this.q({ mode: pick(['max', 'min'], r), s: [p, q] });
        }
        // the longest side L, and two others that do (or do not) reach past it
        const L = int(lv === 1 ? 4 : 6, lv === 1 ? 10 : 15, r), x = int(1, L - 1, r), yes = r() < 0.5;
        const flat = lv > 1 ? 0.6 : 0.25;                        // how often a "No" is the exact, arcs-just-touch case
        const y = yes ? int(L - x + 1, L, r) : r() < flat ? L - x : int(1, L - x, r);
        return this.q({ mode: 'can', s: shuffle([x, y, L], r), opts: shuffle(['Yes', 'No'], r) });
      });
    },
    q({ mode, s, opts }) {
      if (mode === 'can') {
        const [a, b, c] = s, t = [...s].sort((u, v) => u - v), sort = t[0] + t[1] > t[2] ? 'cross' : t[0] + t[1] === t[2] ? 'touch' : 'short';
        return { mode, s, opts, sort, text: `Can a triangle be built with sides of ${a} cm, ${b} cm and ${c} cm?`, choices: opts,
          ans: t[0] + t[1] > t[2] ? 'Yes' : 'No', expr: `${HERON}(${a},${b},${c})>0?'Yes':'No'` };
      }
      const [p, q] = s, big = mode === 'max';
      return { mode, s, sort: mode, text: `Two sides of a triangle are ${p} cm and ${q} cm. The third side is a whole number of cm. What is the ${big ? 'longest' : 'shortest'} it can be, in cm?`,
        ans: big ? p + q - 1 : Math.abs(p - q) + 1,
        expr: `((ok)=>${big ? 'ok[ok.length-1]' : 'ok[0]'})([...Array(100).keys()].filter((x)=>${HERON}(${p},${q},x)>0))` };
    },
    work({ mode, s, opts, ans }) {
      if (mode === 'can') {
        const t = [...s].sort((u, v) => u - v);
        return [
          { t: 'The longest side — draw it as the base', v: t[2], x: `Math.max(${s})` },
          { t: 'Add the other two sides', v: t[0] + t[1], x: `${s.join('+')}-Math.max(${s})` },
          { t: `The arcs cross only if that is MORE than ${t[2]}. Can the triangle be built?`, v: ans, choices: opts },
        ];
      }
      const [p, q] = s;
      if (mode === 'max') return [{ t: `The two sides end to end: ${p} + ${q}`, v: p + q, x: `${p}+${q}` }, { t: 'The third side must be shorter than that. The longest whole number it can be', v: p + q - 1 }];
      const hi = Math.max(p, q), lo = Math.min(p, q);
      return [{ t: `The gap the short side cannot close: ${hi} − ${lo}`, v: hi - lo, x: `Math.abs(${p}-${q})` }, { t: 'The third side must be longer than that. The shortest whole number it can be', v: hi - lo + 1 }];
    },
    draw({ mode, s }) {
      if (mode === 'can') { const t = [...s].sort((u, v) => u - v); return baseFig(`${t[2]} cm`, `${t[0]} cm`, `${t[1]} cm`); }
      const [p, q] = s;
      return mode === 'max' ? baseFig('? cm', `${p} cm`, `${q} cm`) : baseFig(`${Math.max(p, q)} cm`, `${Math.min(p, q)} cm`, '? cm');
    },
  },
  {
    id: 'perpendicular-bisector', world: 'shapecity', band: '11-14', title: 'The perpendicular bisector',
    hook: 'Two friends live at A and B. Where could you stand to be exactly as far from one as from the other — and how many such places are there?',
    idea: 'Every point the same distance from A and B lies on one straight line: through the middle of AB, at right angles to it. Equal compass arcs from A and B find it.',
    why: [
      'Open the compasses to more than half of AB. Swing an arc from A, then — without changing the compasses — one from B. The arcs cross at two points, one above AB and one below. Each crossing is one compass-width from A and one compass-width from B, so each is the same distance from both.',
      'Join the two crossings. Now look at the four points A, the top crossing, B and the bottom crossing: all four sides between them are one compass-width, so they make a rhombus. The diagonals of a rhombus always cut each other in half at right angles. So the line you drew passes through the exact middle of AB, square to it: it bisects AB (cuts it in half) and is perpendicular to it.',
      'Fold the paper along that line and A lands exactly on B, so every point on the fold is as far from A as from B — there are endlessly many such places, all on one line. On a grid you can check a point without compasses: square its across-distance and its up-distance to A and add them, do the same for B, and see if the totals match. When A and B sit on the same row, the bisector is the upright line x = the halfway number; when they sit in the same column, it is the flat line y = the halfway number.',
    ],
    alg: 'P on the bisector ⇔ PA = PB ⇔ (x − x₁)² + (y − y₁)² = (x − x₂)² + (y − y₂)²',
    ex: { mode: 'line', A: [2, 1], B: [10, 1] },
    caseKey: 'sort',
    cases: [
      { label: 'A and B side by side', note: 'A and B are on the same row, so the bisector stands straight up through the middle: x = halfway between their across numbers.',
        ex: { mode: 'line', A: [2, 1], B: [10, 1] } },
      { label: 'A and B one above other', note: 'A and B are in the same column, so the bisector lies flat through the middle: y = halfway between their up numbers.',
        ex: { mode: 'line', A: [3, 2], B: [3, 8] } },
      { label: 'Pick a point: straight AB', note: 'The bisector is the upright line through the middle of AB. The right point sits exactly on it — every other one is off to a side.',
        ex: { mode: 'which', A: [2, 4], B: [8, 4], opts: ['(4, 7)', '(5, 7)', '(6, 6)', '(7, 5)'] } },
      { label: 'Pick a point: slanted AB', note: 'With a slanted AB the bisector slants too, so check each point: across² + up² to A must equal across² + up² to B.',
        ex: { mode: 'which', A: [2, 2], B: [6, 6], opts: ['(2, 7)', '(1, 7)', '(5, 4)', '(6, 3)'] } },
    ],
    gen(r, lv = 1) {
      const mode = lv === 1 ? 'line' : lv === 2 ? pick(['line', 'which'], r) : pick(['which', 'which', 'line'], r);
      const straight = () => {
        const c = int(0, 10, r), p = int(0, 8, r), q = p + 2 * int(1, 5, r); if (q > 10) return null;
        const [u, v] = r() < 0.5 ? [p, q] : [q, p];
        return r() < 0.5 ? [[u, c], [v, c]] : [[c, u], [c, v]];
      };
      for (;;) {
        let AB;
        if (mode === 'line' || lv === 2) AB = straight();
        else { const dx = 2 * int(-3, 3, r), dy = 2 * int(-3, 3, r); if (!dx || !dy) continue; const A = [int(0, 10, r), int(0, 10, r)], B = [A[0] + dx, A[1] + dy]; AB = B.every((v) => v >= 0 && v <= 10) ? [A, B] : null; }
        if (!AB) continue;
        const [A, B] = AB;
        if (mode === 'line') { const q = this.q({ mode, A, B }); if (!nums(q.text).includes(String(q.ans))) return q; continue; }
        const M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], on = [];
        for (let x = 0; x <= 10; x++) for (let y = 0; y <= 10; y++) if (sq([x, y], A) === sq([x, y], B) && (x !== M[0] || y !== M[1])) on.push([x, y]);
        if (!on.length) continue;
        const P = pick(on, r), near = [];
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1], [2, 0], [0, 2], [-2, 0], [0, -2]]) {
          const Q = [P[0] + ox, P[1] + oy];
          if (Q.every((v) => v >= 0 && v <= 10) && sq(Q, A) !== sq(Q, B)) near.push(pt(Q));
        }
        if (near.length < 3) continue;
        return this.q({ mode, A, B, opts: options(pt(P), near, r) });
      }
    },
    q({ mode, A, B, opts }) {
      const [ax, ay] = A, [bx, by] = B;
      if (mode === 'line') {
        const across = ay === by, v = across ? 'x' : 'y';
        return { mode, A, B, sort: `line-${v}`, text: `A is ${pt(A)} and B is ${pt(B)}. Their perpendicular bisector is the line ${v} = ?. What is the missing number?`,
          ans: across ? (ax + bx) / 2 : (ay + by) / 2,
          expr: across ? `[...Array(11).keys()].find((x)=>(x-${ax})**2+${ay}**2===(x-${bx})**2+${by}**2)` : `[...Array(11).keys()].find((y)=>${ax}**2+(y-${ay})**2===${bx}**2+(y-${by})**2)` };
      }
      return { mode, A, B, opts, sort: ax === bx || ay === by ? 'which-straight' : 'which-slant', text: `A is ${pt(A)} and B is ${pt(B)}. Which point is the same distance from A as from B — so it lies on the perpendicular bisector of AB?`, choices: opts,
        ans: opts.find((o) => { const [x, y] = o.slice(1, -1).split(', ').map(Number); return sq([x, y], A) === sq([x, y], B); }),
        expr: `${JSON.stringify(opts)}.find((s)=>{const [x,y]=s.replace(/[()]/g,'').split(',').map(Number);return (x-${ax})**2+(y-${ay})**2===(x-${bx})**2+(y-${by})**2;})` };
    },
    work({ mode, A, B, opts, ans }) {
      const [ax, ay] = A, [bx, by] = B, mx = (ax + bx) / 2, my = (ay + by) / 2;
      if (mode === 'line') return ay === by
        ? [{ t: `Halfway across from x = ${ax} to x = ${bx}: (${ax} + ${bx}) ÷ 2`, v: mx, x: `${ax}+(${bx}-${ax})/2` }, { t: 'AB runs across, so the bisector runs straight up through its middle: x =', v: mx }]
        : [{ t: `Halfway up from y = ${ay} to y = ${by}: (${ay} + ${by}) ÷ 2`, v: my, x: `${ay}+(${by}-${ay})/2` }, { t: 'AB runs up, so the bisector runs straight across through its middle: y =', v: my }];
      return [
        { t: `The middle of AB — its x: (${ax} + ${bx}) ÷ 2`, v: mx, x: `${ax}+(${bx}-${ax})/2` },
        { t: `Its y: (${ay} + ${by}) ÷ 2`, v: my, x: `${ay}+(${by}-${ay})/2` },
        { t: 'The bisector goes through that middle, square to AB. Which point is on it? (Check: across² + up² to A and to B must match.)', v: ans, choices: opts },
      ];
    },
    draw({ A, B }) { return coords(10, { A, B }); },
  },
  {
    id: 'angle-bisector', world: 'shapecity', band: '11-14', title: 'The angle bisector',
    hook: 'A path must split a corner of 84° into two equal angles. Where does it go — with compasses, and no protractor?',
    idea: 'The angle bisector cuts an angle into two equal halves, and every point on it is the same distance from both arms.',
    why: [
      'Put the compass point on the corner and swing one arc that cuts both arms, at M and N. Now, from M and from N, swing two arcs of the same size so they cross at P. Draw the line from the corner through P. That line is the bisector.',
      'Why are the two halves equal? Look at the two triangles corner–M–P and corner–N–P. The corner is the same distance from M and from N (one arc). P is the same distance from M and from N (two equal arcs). And the side from the corner to P is shared. Three sides the same means the triangles are the same triangle, just flipped — so the two angles at the corner match.',
      'Fold along the bisector and one arm lands on the other, so every point on it is the same distance from both arms. In a triangle the three bisectors meet at one point, the same distance from all three sides — the centre of the biggest circle that fits inside. And since each bisector takes exactly half of its angle, halving then using the 180° of a triangle finds the angles there.',
    ],
    alg: 'each half = θ ÷ 2 · in triangle ABC, the bisectors of B and C meet at I: ∠BIC = 180° − B/2 − C/2',
    ex: { mode: 'half', d: 84 },
    caseKey: 'mode',
    cases: [
      { label: 'Each half', note: 'The bisector cuts the angle into two equal halves, so each half is the whole angle ÷ 2.',
        ex: { mode: 'half', d: 84 } },
      { label: 'The whole angle', note: 'Backwards: you are given one half. The other half is the same size, so the whole angle is double.',
        ex: { mode: 'whole', h: 35 } },
      { label: 'Where bisectors meet', note: 'Halve angles B and C first, then use triangle IBC: its three angles make 180°, so angle BIC is whatever is left.',
        ex: { mode: 'tri', B: 70, C: 50 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const mode = lv === 1 ? 'half' : lv === 2 ? pick(['whole', 'whole', 'half'], r) : pick(['tri', 'tri', 'whole'], r);
        if (mode === 'half') return this.q({ mode, d: 2 * int(10, 89, r) });
        if (mode === 'whole') return this.q({ mode, h: int(11, 89, r) });
        let B, C; do { B = 2 * int(12, 60, r); C = 2 * int(12, 60, r); } while (B + C > 156);
        return this.q({ mode, B, C });
      });
    },
    q({ mode, d, h, B, C }) {
      if (mode === 'half') return { mode, d, text: `An angle of ${d}° is cut in two by its bisector. How big is each half, in degrees?`, expr: `${d}-${d}/2`, ans: d / 2 };
      if (mode === 'whole') return { mode, h, text: `The bisector of an angle makes ${h}° with one arm. How big is the whole angle, in degrees?`, expr: `${h}+${h}`, ans: 2 * h };
      return { mode, B, C, text: `In triangle ABC, angle B is ${B}° and angle C is ${C}°. The bisectors of angles B and C meet at I. How big is angle BIC, in degrees?`,
        expr: `90+(180-${B}-${C})/2`, ans: 180 - B / 2 - C / 2 };
    },
    work({ mode, d, h, B, C, text }) {
      if (mode === 'half') return [{ t: 'The whole angle', v: d, x: said(text) }, { t: `Two equal halves: ${d} ÷ 2`, v: d / 2 }];
      if (mode === 'whole') return [{ t: 'One half', v: h, x: said(text) }, { t: 'The other half is the same size', v: h, x: said(text) }, { t: 'Both halves together', v: 2 * h }];
      return [
        { t: `The bisector halves angle B: ${B} ÷ 2`, v: B / 2, x: `${B}/2` },
        { t: `And angle C: ${C} ÷ 2`, v: C / 2, x: `${C}/2` },
        { t: `Triangle IBC has 180° altogether: 180 − ${B / 2} − ${C / 2}`, v: 180 - B / 2 - C / 2 },
      ];
    },
    draw({ mode, d, h, B, C }) {
      if (mode === 'half') return bisectFig(d, '?', '?', `the whole angle: ${d}°`);
      if (mode === 'whole') return bisectFig(2 * h, `${h}°`, '', 'the whole angle: ?');
      return incentreFig(180 - B - C, B, C);
    },
  },
];

/* ------------------------------------------------------------ stories */

