/* formulas.js — the Formula Book (docs/LIBRARY-CONTRACT.md).

   Collectable formula cards. Each card is a formula, a picture that SHOWS why
   it is true, the why in two paragraphs, a worked example, the Atlas stops that
   teach it, and a story: two of the Bee's ten rivals in an ordinary place using
   it, on the same stage the Atlas uses. Read the story to its last line and the
   card is yours; the album shows the rest as silhouettes. "Quiz me" starts five
   questions on the card with fresh numbers, each checked a second way (`expr`).

   Every number here is proved in selftest(): each worked example is computed
   twice, each quiz generator hundreds of times, each notepad line evaluated. */
import { icon } from '../icons.js';
import * as kit from '../chapters/kit.js';
import { TRICKS, parseNum, correct } from '../tricks.js';
import { RIVALS } from '../contest.js';
import { SCENES, evalSum } from '../stories.js';
import { int, pick, rnd, seeded } from '../rand.js';
import { META } from './shelf.js';

export const TOOL = META.formulas;   // name, blurb and art live on the shelf (shelf.js), which loads without the tool

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const S = kit.svg, T = kit.text;
const round2 = (x) => Math.round(x * 100) / 100;
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).split('').map((d) => SUP[d]).join('');
const range = (n, f) => Array.from({ length: n }, (_, i) => f(i));

/* ------------------------------------------------------------- drawing helpers */

const rad = (d) => (d * Math.PI) / 180;
const at = (cx, cy, r, deg) => [+(cx + r * Math.cos(rad(deg))).toFixed(1), +(cy - r * Math.sin(rad(deg))).toFixed(1)];
function sector(cx, cy, r, a0, a1, cls) {
  const [x0, y0] = at(cx, cy, r, a0), [x1, y1] = at(cx, cy, r, a1);
  return `<path d="M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 0 ${x1},${y1} Z" class="${cls}"/>`;
}
const R = (x, y, w, h, cls, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${cls}" ${extra}/>`;
const L = (x1, y1, x2, y2, cls = 'dg-line', extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}" ${extra}/>`;
const PG = (pts, cls, extra = '') => `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" class="${cls}" ${extra}/>`;
const DASH = 'stroke-dasharray="6 5" fill="none"';
const box = (x, y, t, cls) => R(x, y, 30, 30, cls, 'rx="4"') + T(x + 15, y + 20, t, 'dg-text');

function gridL(cols, rows, shade, u, top, left) {
  // the side label sits clear of the grid: "w = 4" once ran into the first column
  const m = 26 + 8 * String(left).length;
  let s = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) s += R(m + c * u, 26 + r * u, u, u, shade(r, c) ? 'dg-fill1' : 'dg-blank');
  s += T(m + (cols * u) / 2, 18, top, 'dg-accent') + T(m - 6, 30 + (rows * u) / 2, left, 'dg-accent', 'end');
  return S(cols * u + m + 10, rows * u + 34, s, `A ${cols} by ${rows} grid of unit squares`);
}

const PIC = {
  perimRect: () => S(260, 164, R(40, 30, 180, 100, 'dg-fill2') + `<path d="M40,30 H220 V130" class="dg-hand2" fill="none"/>`
    + T(130, 22, 'l', 'dg-accent') + T(232, 86, 'w', 'dg-accent', 'start') + T(130, 152, 'l') + T(28, 86, 'w', 'dg-text', 'end')
    + T(130, 86, 'l + w = half-way round', 'dg-small'), 'A rectangle; one long and one short side are half-way round'),
  areaRect: () => gridL(6, 4, (r) => r === 0, 26, 'l = 6', 'w = 4'),
  areaSquare: () => gridL(5, 5, () => true, 24, 's', 's'),
  areaTri: () => {
    const ox = 20, oy = 16, b = 200, h = 110, ax = ox + 70;
    return S(250, 160, R(ox, oy, b, h, 'dg-fill2') + PG([[ox, oy + h], [ox + b, oy + h], [ax, oy]], 'dg-fill1') + L(ax, oy, ax, oy + h, 'dg-hand2', 'stroke-dasharray="6 5"')
      + T(ox + b / 2, oy + h + 22, 'b') + T(ox + b + 12, oy + h / 2 + 4, 'h', 'dg-text', 'start') + T(ax - 26, oy + h - 20, 'half', 'dg-small') + T(ax + 40, oy + h - 20, 'half', 'dg-small'),
    'A triangle inside its rectangle, taking half of each part');
  },
  parallelogram: () => {
    const ox = 20, oy = 16, h = 100;
    return S(290, 150, PG([[ox + 50, oy], [ox + 210, oy], [ox + 160, oy + h], [ox, oy + h]], 'dg-fill2') + PG([[ox, oy + h], [ox + 50, oy], [ox + 50, oy + h]], 'dg-fill1')
      + PG([[ox + 160, oy + h], [ox + 210, oy], [ox + 210, oy + h]], 'dg-fill1', 'stroke-dasharray="6 5"') + L(ox + 50, oy, ox + 50, oy + h, 'dg-hand2', 'stroke-dasharray="6 5"')
      + T(ox + 105, oy + h + 22, 'b') + T(ox + 222, oy + h / 2 + 4, 'h', 'dg-text', 'start') + `<path d="M${ox + 30},${oy + h - 30} q90,-40 170,0" class="dg-arc" fill="none"/>`,
    'A parallelogram with its end triangle moved across to make a rectangle');
  },
  trapezium: () => {
    const u = 1, a = 60, b = 110, dx = 30, h = 80, ox = 16, oy = 20, X = (x) => ox + x * u, Y = (y) => oy + y;
    return S(ox * 2 + (a + b + dx) + 20, h + 60, PG([[X(0), Y(h)], [X(b), Y(h)], [X(dx + a), Y(0)], [X(dx), Y(0)]], 'dg-fill1')
      + PG([[X(b), Y(h)], [X(a + b), Y(h)], [X(dx + a + b), Y(0)], [X(dx + a), Y(0)]], 'dg-fill2')
      + T(X(dx + a / 2), Y(-6), 'a') + T(X(b / 2), Y(h + 18), 'b') + T(X(dx + a + b / 2), Y(-6), 'b', 'dg-small') + T(X(b + a / 2), Y(h + 18), 'a', 'dg-small')
      + T(X(a + b + dx) + 8, Y(h / 2 + 4), 'h', 'dg-text', 'start'),
    'Two copies of a trapezium, one upside down, making a parallelogram');
  },
  circumference: () => {
    const d = 56, c = 40, y = 120, x0 = 20;
    let s = `<circle cx="${c + 10}" cy="${c}" r="${d / 2}" class="dg-blank"/>` + L(c + 10 - d / 2, c, c + 10 + d / 2, c, 'dg-hand2') + T(c + 10, c - 6, 'd', 'dg-accent');
    s += L(x0, y, x0 + Math.PI * d, y, 'dg-arc');
    for (let i = 0; i <= 3; i++) s += L(x0 + i * d, y - 8, x0 + i * d, y + 8, 'dg-line') + (i < 3 ? T(x0 + i * d + d / 2, y - 12, 'd', 'dg-small') : '');
    s += T(x0 + Math.PI * d, y + 26, '≈ 3.14 d', 'dg-accent') + T(170, 44, 'unrolled:', 'dg-small', 'start');
    return S(230, 160, s, 'A circle unrolled: just over three diameters long');
  },
  areaCircle: () => {
    const r = 46, n = 12, w = (Math.PI * r) / 6, ox = 128, oy = 34;
    let s = '';
    for (let i = 0; i < n; i++) s += sector(60, 70, r, i * 30, (i + 1) * 30, i % 2 ? 'dg-fill1' : 'dg-fill2');
    for (let k = 0; k < 6; k++) {
      s += PG([[ox + k * w, oy + r], [ox + (k + 1) * w, oy + r], [ox + k * w + w / 2, oy]].map((p) => p.map((v) => +v.toFixed(1))), 'dg-fill2');
      s += PG([[ox + k * w + w / 2, oy], [ox + (k + 1) * w + w / 2, oy], [ox + (k + 1) * w, oy + r]].map((p) => p.map((v) => +v.toFixed(1))), 'dg-fill1');
    }
    s += T(ox + 3 * w, oy + r + 22, 'half way round = π × r') + T(ox - 8, oy + r / 2 + 5, 'r', 'dg-accent', 'end');
    return S(ox + 6.5 * w + 16, 140, s, 'A circle cut into slices and laid out as a near-rectangle');
  },
  volCuboid: () => kit.cuboid(4, 2, 3, 'cm', 24),
  surfCuboid: () => {
    const u = 20, l = 5, w = 3, h = 2, x0 = w * u + 4;
    const f = (x, y, ww, hh, cls, t) => R(x, y + 4, ww * u, hh * u, cls) + T(x + (ww * u) / 2, y + 4 + (hh * u) / 2 + 5, t, 'dg-small');
    return S((2 * w + l) * u + 8, (2 * w + 2 * h) * u + 8,
      f(x0, 0, l, w, 'dg-fill1', 'l × w') + f(x0, w * u, l, h, 'dg-fill2', 'l × h') + f(x0, (w + h) * u, l, w, 'dg-fill1', 'l × w') + f(x0, (2 * w + h) * u, l, h, 'dg-fill2', 'l × h')
      + f(4, w * u, w, h, 'dg-fill3', 'w × h') + f(x0 + l * u, w * u, w, h, 'dg-fill3', 'w × h'), 'The net of a box: three pairs of matching faces');
  },
  volCube: () => kit.cuboid(3, 3, 3, 'cm', 24),
  prism: () => {
    const A = [20, 130], B = [110, 130], C = [65, 60], d = [120, -34], m = (p) => [p[0] + d[0], p[1] + d[1]];
    return S(270, 150, PG([B, m(B), m(C), C], 'dg-fill2') + PG([A, C, m(C), m(A)], 'dg-fill3') + PG([A, B, C], 'dg-fill1')
      + L(...m(A), ...m(B), 'dg-thin', 'stroke-dasharray="4 4"') + T(65, 115, 'A', 'dg-accent') + T(185, 150 - 6, 'length', 'dg-small'),
    'A triangular prism: the same triangle all the way along');
  },
  cylinder: () => S(170, 190, R(30, 30, 110, 120, 'dg-fill2', 'stroke="none"') + L(30, 30, 30, 150) + L(140, 30, 140, 150)
    + `<path d="M30,150 A55,16 0 0 0 140,150" class="dg-line" fill="none"/><ellipse cx="85" cy="30" rx="55" ry="16" class="dg-fill1"/>`
    + L(85, 30, 140, 30, 'dg-hand2') + T(112, 24, 'r', 'dg-accent') + T(152, 94, 'h', 'dg-accent', 'start'), 'A cylinder: a circle stacked up to height h'),
  anglesLine: () => {
    const cx = 140, cy = 110, [x, y] = at(cx, cy, 100, 65);
    return S(290, 140, sector(cx, cy, 34, 0, 65, 'dg-fill1') + sector(cx, cy, 26, 65, 180, 'dg-fill2') + L(20, cy, 270, cy) + L(cx, cy, x, y)
      + T(...at(cx, cy, 50, 32), 'a', 'dg-accent') + T(...at(cx, cy, 44, 125), 'b', 'dg-accent') + T(cx, cy + 24, 'a + b = 180°', 'dg-small'), 'Two angles on a straight line');
  },
  anglesPoint: () => {
    const cx = 100, cy = 90, rays = [10, 110, 250];
    let s = sector(cx, cy, 30, 10, 110, 'dg-fill1') + sector(cx, cy, 24, 110, 250, 'dg-fill2') + sector(cx, cy, 30, 250, 370, 'dg-fill3');
    for (const a of rays) s += L(cx, cy, ...at(cx, cy, 80, a));
    return S(200, 180, s + `<circle cx="${cx}" cy="${cy}" r="4" class="dg-dot"/>` + T(cx, 176, 'a + b + c = 360°', 'dg-small'), 'Three angles filling the space round a point');
  },
  anglesTri: () => {
    const Lb = 130, tA = Math.tan(rad(50)), tB = Math.tan(rad(60)), ax = (Lb * tB) / (tA + tB), ay = ax * tA, ox = 16, oy = 130;
    const A = [ox, oy], B = [ox + Lb, oy], C = [+(ox + ax).toFixed(1), +(oy - ay).toFixed(1)];
    let s = PG([A, B, C], 'dg-blank') + sector(A[0], A[1], 20, 0, 50, 'dg-fill1') + sector(B[0], B[1], 20, 120, 180, 'dg-fill2') + sector(C[0], C[1], 20, 230, 300, 'dg-fill3');
    const px = 240, py = oy;
    s += L(170, py, 310, py) + sector(px, py, 34, 0, 50, 'dg-fill1') + sector(px, py, 34, 50, 120, 'dg-fill3') + sector(px, py, 34, 120, 180, 'dg-fill2');
    s += T(px, py + 22, 'together: 180°', 'dg-small') + T(150, 70, '→', 'dg-accent');
    return S(320, 160, s, 'The three corners of a triangle placed side by side on a straight line');
  },
  interiorSum: () => {
    const v = range(5, (k) => at(95, 92, 76, 90 + 72 * k));
    return S(190, 180, PG([v[0], v[1], v[2]], 'dg-fill1') + PG([v[0], v[2], v[3]], 'dg-fill2') + PG([v[0], v[3], v[4]], 'dg-fill3')
      + T(95, 176, '5 sides → 3 triangles', 'dg-small'), 'A pentagon cut into three triangles from one corner');
  },
  exterior: () => {
    const cx = 105, cy = 95, v = range(6, (k) => at(cx, cy, 58, 30 + 60 * k));
    let s = PG(v, 'dg-fill2');
    for (let k = 0; k < 6; k++) {
      const p = v[(k + 5) % 6], q = v[k], th = (Math.atan2(-(q[1] - p[1]), q[0] - p[0]) * 180) / Math.PI;
      s += sector(q[0], q[1], 16, th, th + 60, 'dg-fill1') + L(q[0], q[1], ...at(q[0], q[1], 30, th), 'dg-thin', 'stroke-dasharray="3 3"');
    }
    return S(210, 196, s + T(cx, 190, 'six turns make one full turn', 'dg-small'), 'A hexagon with the turn at each corner marked');
  },
  euler: () => {
    const f = [[20, 60], [80, 60], [80, 120], [20, 120]], b = f.map(([x, y]) => [x + 28, y - 26]);
    let s = PG(f, 'dg-fill2') + PG([f[0], b[0], b[1], f[1]], 'dg-fill1') + PG([f[1], b[1], b[2], f[2]], 'dg-fill3');
    s += T(210, 40, 'F + V − E', 'dg-accent') + T(210, 70, 'cube: 6 + 8 − 12 = 2', 'dg-small') + T(210, 94, 'pyramid: 5 + 5 − 8 = 2', 'dg-small') + T(210, 118, 'prism: 5 + 6 − 9 = 2', 'dg-small');
    return S(310, 140, s, 'A cube, and three solids whose faces plus corners minus edges make 2');
  },
  squareSum: () => {
    const a = 110, b = 44, o = 24;
    return S(a + b + 2 * o, a + b + 2 * o, R(o, o, a, a, 'dg-fill1') + R(o + a, o, b, a, 'dg-fill2') + R(o, o + a, a, b, 'dg-fill2') + R(o + a, o + a, b, b, 'dg-fill3')
      + T(o + a / 2, o + a / 2 + 6, 'a²', 'dg-big') + T(o + a + b / 2, o + a / 2 + 5, 'ab') + T(o + a / 2, o + a + b / 2 + 5, 'ab') + T(o + a + b / 2, o + a + b / 2 + 5, 'b²')
      + T(o + a / 2, o - 8, 'a', 'dg-accent') + T(o + a + b / 2, o - 8, 'b', 'dg-accent'), 'A square of side a + b cut into a², two ab rectangles and b²');
  },
  squareDiff: () => {
    const a = 150, b = 40, o = 24;
    return S(a + 2 * o, a + 2 * o, R(o, o + b, a - b, a - b, 'dg-fill1') + R(o + a - b, o + b, b, a - b, 'dg-fill2') + R(o, o, a - b, b, 'dg-fill2') + R(o + a - b, o, b, b, 'dg-fill3')
      + T(o + (a - b) / 2, o + b + (a - b) / 2 + 6, '(a − b)²', 'dg-big') + T(o + a - b / 2, o + b / 2 + 5, 'b²', 'dg-small')
      + T(o + (a - b) / 2, o + b / 2 + 5, 'strip', 'dg-small') + T(o + a - b / 2, o + b + (a - b) / 2, 'strip', 'dg-small') + T(o + a / 2, o - 8, 'a', 'dg-accent'),
    'A square a by a with two strips b wide taken off; the corner b² was in both strips');
  },
  diffSquares: () => {
    const a = 100, b = 36, o = 16, gx = 150;
    let s = R(o, o, a - b, b, 'dg-fill2') + R(o, o + b, a, a - b, 'dg-fill1') + R(o + a - b, o, b, b, 'dg-blank', 'stroke-dasharray="4 4"') + T(o + a - b / 2, o + b / 2 + 5, 'b²', 'dg-small');
    s += T(o + a / 2, o + a + 20, 'a² − b²', 'dg-small') + T(gx - 18, o + a / 2 + 4, '→', 'dg-accent');
    s += R(gx, o + b, a, a - b, 'dg-fill1') + R(gx + a, o + b, b, a - b, 'dg-fill2') + T(gx + (a + b) / 2, o + a + 20, '(a + b) × (a − b)', 'dg-small');
    return S(gx + a + b + 16, a + 2 * o + 16, s, 'An L-shape cut and rearranged into a rectangle');
  },
  indexMul: () => {
    let s = range(3, (i) => box(14 + i * 34, 36, '2', 'dg-fill1')).join('') + range(2, (i) => box(130 + i * 34, 36, '2', 'dg-fill2')).join('');
    s += T(64, 26, '2³', 'dg-accent') + T(162, 26, '2²', 'dg-accent') + T(110, 90, 'five 2s in a row → 2⁵', 'dg-small');
    return S(220, 100, s, 'Three twos and two twos make five twos');
  },
  indexPow: () => {
    let s = range(3, (i) => box(14 + i * 34, 36, '2', 'dg-fill1')).join('') + range(3, (i) => box(130 + i * 34, 36, '2', 'dg-fill2')).join('');
    s += T(64, 26, '2³', 'dg-accent') + T(180, 26, '2³', 'dg-accent') + T(122, 90, '(2³)² = six 2s → 2⁶', 'dg-small');
    return S(244, 100, s, 'Two copies of three twos make six twos');
  },
  nthTerm: () => {
    let s = '';
    for (let n = 1; n <= 4; n++) {
      const x = 20 + (n - 1) * 62;
      for (let j = 0; j < 3 * n + 2; j++) { const cls = j < 2 ? 'dg-dot2' : 'dg-dot'; s += `<circle cx="${x + (j % 3) * 14}" cy="${150 - Math.floor(j / 3) * 14}" r="5.5" class="${cls}"/>`; }
      s += T(x + 14, 176, `n = ${n}`, 'dg-small');
    }
    return S(260, 186, s + T(130, 16, '3 more each time: 3n + 2', 'dg-small'), 'A pattern of dots growing by three each step');
  },
  pythagoras: () => {
    const u = 15, px = 3 * u + 20, py = 7 * u + 16, P = (x, y) => [px + x * u, py - y * u];
    const sq = (pts, cls) => PG(pts.map(([x, y]) => P(x, y)), cls);
    let s = sq([[0, 0], [4, 0], [4, -4], [0, -4]], 'dg-fill2') + sq([[0, 0], [0, 3], [-3, 3], [-3, 0]], 'dg-fill3') + sq([[4, 0], [0, 3], [3, 7], [7, 4]], 'dg-fill1');
    for (let i = 1; i < 4; i++) s += L(...P(i, 0), ...P(i, -4), 'dg-thin') + L(...P(0, -i), ...P(4, -i), 'dg-thin');
    for (let i = 1; i < 3; i++) s += L(...P(-i, 0), ...P(-i, 3), 'dg-thin') + L(...P(0, i), ...P(-3, i), 'dg-thin');
    s += sq([[0, 0], [4, 0], [0, 3]], 'dg-blank');
    s += T(...P(2, -2), '16', 'dg-big') + T(...P(-1.5, 1.3), '9', 'dg-big') + T(...P(3.5, 3.8), '25', 'dg-big');
    return S(px + 7 * u + 20, py + 4 * u + 20, s, 'A 3, 4, 5 right-angled triangle with a square on each side: 9 + 16 = 25');
  },
  oddSquares: () => kit.dots(5, 5, (r, c) => Math.max(r, c) % 2 === 0, 22),
  subsets: () => {
    let s = ''; const X0 = 20, dx = 70;
    const node = (lv, i) => [X0 + lv * dx, 20 + ((i + 0.5) * 160) / 2 ** lv];
    for (let lv = 0; lv < 3; lv++) for (let i = 0; i < 2 ** lv; i++) for (const k of [0, 1]) {
      const [x1, y1] = node(lv, i), [x2, y2] = node(lv + 1, 2 * i + k);
      s += L(x1, y1, x2, y2, k ? 'dg-thin' : 'dg-line');
    }
    for (let i = 0; i < 8; i++) { const [x, y] = node(3, i); s += `<circle cx="${x}" cy="${y}" r="5" class="dg-dot"/>`; }
    s += T(55, 44, 'in', 'dg-small') + T(55, 150, 'out', 'dg-small') + T(X0 + 3 * dx + 16, 104, '2 × 2 × 2 = 8', 'dg-accent', 'start');
    return S(X0 + 3 * dx + 130, 200, s, 'A tree of in-or-out choices for three things: eight ends');
  },
  fractionOf: () => {
    let s = '';
    for (let i = 0; i < 4; i++) s += R(10 + i * 60, 30, 60, 44, i < 3 ? 'dg-fill1' : 'dg-blank') + T(40 + i * 60, 58, '5', 'dg-big');
    return S(260, 110, s + T(130, 20, '20 cut into 4 equal parts', 'dg-small') + T(100, 98, '3 parts: 3 × 5', 'dg-accent'), 'Twenty cut into four parts of five, three of them shaded');
  },
  percentOf: () => kit.grid(10, 10, new Set(range(15, (i) => `${Math.floor(i / 10)},${i % 10}`)), 15),
  percentChange: () => {
    const base = 150, u = 2;
    return S(250, 190, R(40, base - 50 * u + 30, 60, 50 * u, 'dg-fill2') + R(150, base - 60 * u + 30, 60, 10 * u, 'dg-fill1') + R(150, base - 50 * u + 30, 60, 50 * u, 'dg-fill2')
      + T(70, 176, 'before: 50', 'dg-small') + T(180, 176, 'after: 60', 'dg-small') + T(180, base - 60 * u + 22, '+10', 'dg-accent') + T(125, 20, '10 out of the 50 you started with', 'dg-small'),
    'A bar before and after a rise; the rise compared with the start');
  },
  simpleInterest: () => {
    let s = '';
    for (let y = 0; y < 4; y++) {
      const x = 30 + y * 56; s += R(x, 60, 40, 90, 'dg-fill2');
      for (let k = 0; k < y; k++) s += R(x, 60 - (k + 1) * 16, 40, 16, 'dg-fill1');
      s += T(x + 20, 168, `year ${y}`, 'dg-small');
    }
    return S(260, 180, s + T(50, 110, 'P', 'dg-text'), 'Savings growing by the same block of interest every year');
  },
  ratioShare: () => {
    let s = '';
    for (let i = 0; i < 5; i++) s += R(10 + i * 50, 30, 50, 44, i < 2 ? 'dg-fill1' : 'dg-fill2') + T(35 + i * 50, 58, '£4', 'dg-text');
    return S(270, 110, s + T(60, 20, '2 parts', 'dg-small') + T(185, 20, '3 parts', 'dg-small') + T(135, 98, '£20 ÷ 5 parts = £4 a part', 'dg-accent'), 'Twenty pounds shared 2 : 3 as five equal parts');
  },
  speed: () => S(220, 170, PG([[110, 14], [200, 150], [20, 150]], 'dg-fill2') + L(52, 96, 168, 96) + L(110, 96, 110, 150)
    + T(110, 76, 'D', 'dg-big') + T(80, 132, 'S', 'dg-big') + T(140, 132, 'T', 'dg-big') + T(110, 166, 'distance = speed × time', 'dg-small'), 'The distance, speed, time triangle'),
  density: () => {
    let s = '';
    for (let i = 0; i < 4; i++) { s += R(20 + (i % 2) * 36, 30 + Math.floor(i / 2) * 36, 36, 36, 'dg-fill3') + T(38 + (i % 2) * 36, 54 + Math.floor(i / 2) * 36, '1 g', 'dg-small'); }
    for (let i = 0; i < 4; i++) { s += R(150 + (i % 2) * 36, 30 + Math.floor(i / 2) * 36, 36, 36, 'dg-fill1') + T(168 + (i % 2) * 36, 54 + Math.floor(i / 2) * 36, '3 g', 'dg-small'); }
    return S(250, 140, s + T(56, 124, '4 g in 4 cm³', 'dg-small') + T(186, 124, '12 g in 4 cm³', 'dg-small'), 'Two blocks the same size with different masses in every cube');
  },
  mean: () => {
    const v = [9, 4, 8], u = 12;
    let s = '';
    v.forEach((x, i) => { s += R(30 + i * 60, 140 - x * u, 40, x * u, 'dg-fill2') + T(50 + i * 60, 158, x, 'dg-small'); });
    s += L(20, 140 - 7 * u, 200, 140 - 7 * u, 'dg-hand2', 'stroke-dasharray="6 5"') + T(206, 140 - 7 * u + 4, '7', 'dg-accent', 'start');
    return S(230, 170, s, 'Three bars and the level they share out to');
  },
  range: () => kit.numberLine(280, 350, 10, { 285: 'smallest', 342: 'biggest' }),
  probability: () => {
    let s = R(20, 20, 180, 110, 'dg-blank', 'rx="30"');
    const pos = [[60, 55], [100, 50], [140, 58], [70, 95], [110, 90], [150, 98], [85, 72], [128, 76]];
    pos.forEach(([x, y], i) => { s += `<circle cx="${x}" cy="${y}" r="10" class="${i < 3 ? 'dg-dot' : 'dg-dot2'}"/>`; });
    return S(220, 160, s + T(110, 152, '3 of the 8 are the colour you want', 'dg-small'), 'A bag of eight counters, three of one colour');
  },
};

/* ------------------------------------------------------------- the cards */

export const TOPICS = ['Area & perimeter', 'Circles', 'Volume & surface area', 'Angles & solids', 'Algebra & number', 'Money & rates', 'Data & chance'];

const SOLIDS = [['cube', 6, 8, 12], ['tetrahedron (triangle-based pyramid)', 4, 4, 6], ['square-based pyramid', 5, 5, 8], ['triangular prism', 5, 6, 9],
  ['pentagonal prism', 7, 10, 15], ['hexagonal prism', 8, 12, 18], ['octahedron', 8, 6, 12], ['pentagonal pyramid', 6, 6, 10], ['hexagonal pyramid', 7, 7, 12]];
const TRIPLES = [[3, 4, 5, 5], [5, 12, 13, 3], [8, 15, 17, 2], [7, 24, 25, 1], [20, 21, 29, 1], [9, 40, 41, 1]];

export const CARDS = [
  /* ------------------------------------------------ Area & perimeter */
  { id: 'perimeter-rectangle', title: 'Perimeter of a rectangle', formula: 'P = 2 × (l + w)', topic: 'Area & perimeter', band: '8-10', stops: ['perimeter'],
    picture: PIC.perimRect, caption: 'One long side and one short side take you exactly half-way round.',
    why: ['Walk once round a rectangle and you go along a long side, a short side, a long side and a short side. The two long sides are equal, and so are the two short ones.',
      'So one long side and one short side take you exactly half-way round. Add them, then double: P = 2 × (l + w). It is the same as l + w + l + w — just quicker.'],
    f: (l, w) => 2 * (l + w), example: { q: 'A rectangle 7 cm long and 4 cm wide.', args: [7, 4], lines: ['l + w = 7 + 4 = 11', 'P = 2 × 11 = 22 cm'], ans: 22, expr: '7+4+7+4' },
    gen(r) { const l = int(3, 25, r), w = int(2, l - 1, r); return { text: `Perimeter of a rectangle ${l} cm by ${w} cm (in cm)`, ans: this.f(l, w), expr: `${l}+${w}+${l}+${w}` }; },
    story: { title: 'Fencing the vegetable patch', scene: 'garden', cast: ['koi', 'pixel'], beats: [
      { who: null, say: 'Nova’s vegetable patch is a rectangle 9 metres long and 5 metres wide. Pip has to buy the fence.', add: { t: '2 × (9 + 5)' } },
      { who: 'pixel', say: 'I will walk all the way round and count every metre.' },
      { who: 'koi', say: 'You only need half of it. One long side and one short side get you half-way round.', add: { t: '9 + 5', v: 14 } },
      { who: 'pixel', say: 'And the other half is exactly the same!', add: { t: '14 × 2', v: 28 } },
      { who: 'koi', say: 'Twenty-eight metres of fence. Half the way round, then double.', add: { t: '2 × (9 + 5)', v: 28 } },
    ] } },
  { id: 'area-rectangle', title: 'Area of a rectangle', formula: 'A = l × w', topic: 'Area & perimeter', band: '8-10', stops: ['area-rectangles'],
    picture: PIC.areaRect, caption: 'Each row holds l squares, and there are w rows.',
    why: ['Cover the rectangle in centimetre squares. Each row along the length holds l squares, and there are w rows the same.',
      'Equal rows are exactly what multiplication counts, so the area is l × w square units — no counting one by one. That is why area is measured in cm²: it is a count of squares.'],
    f: (l, w) => l * w, example: { q: 'A rectangle 8 cm by 5 cm.', args: [8, 5], lines: ['A = 8 × 5', '= 40 cm²'], ans: 40, expr: '8+8+8+8+8' },
    gen(r) { const l = int(3, 15, r), w = int(2, 12, r); return { text: `Area of a rectangle ${l} cm by ${w} cm (in cm²)`, ans: this.f(l, w), expr: range(w, () => l).join('+') }; },
    story: { title: 'The kitchen floor', scene: 'kitchen', cast: ['astro', 'comet'], beats: [
      { who: null, say: 'Dax is tiling a kitchen floor. It is 6 tiles long and 4 tiles wide. How many tiles does he need?', add: { t: '6 × 4' } },
      { who: 'comet', say: 'One, two, three… I lost count behind the fridge.' },
      { who: 'astro', say: 'Look along one row. It holds 6. And there are 4 rows exactly the same.', add: { t: '6 + 6 + 6 + 6', v: 24 } },
      { who: 'comet', say: 'Four rows of six — that is just four times six!', add: { t: '6 × 4', v: 24 } },
      { who: 'astro', say: 'Twenty-four tiles. Length times width, every time.' },
    ] } },
  { id: 'area-square', title: 'Area of a square', formula: 'A = s × s = s²', topic: 'Area & perimeter', band: '8-10', stops: ['area-rectangles', 'square-dots'],
    picture: PIC.areaSquare, caption: 's rows of s squares: s², “s squared”.',
    why: ['A square is a rectangle whose length and width happen to be the same, so the rectangle rule l × w becomes s × s.',
      'That is why s × s is called “s squared”: it is how many unit squares tile a square with side s. 7² = 49 means a 7 by 7 square holds 49 little squares.'],
    f: (s) => s * s, example: { q: 'A square with 9 cm sides.', args: [9], lines: ['A = 9 × 9', '= 81 cm²'], ans: 81, expr: '9*10-9' },
    gen(r) { const s = int(3, 20, r); return { text: `Area of a square with ${s} cm sides (in cm²)`, ans: this.f(s), expr: `${s}*${s - 1}+${s}` }; },
    story: { title: 'The patchwork rug', scene: 'room', cast: ['astro', 'koi'], beats: [
      { who: null, say: 'Mira is sewing a square rug out of patches, 8 patches along each side.', add: { t: '8 × 8' } },
      { who: 'koi', say: 'Is that like the rectangle rule?' },
      { who: 'astro', say: 'It IS the rectangle rule. The length and the width just happen to match.' },
      { who: 'koi', say: 'So eight rows of eight.', add: { t: '8 + 8 + 8 + 8 + 8 + 8 + 8 + 8', v: 64 } },
      { who: 'astro', say: 'Sixty-four patches. Eight squared.', add: { t: '8 × 8', v: 64 } },
    ] } },
  { id: 'area-triangle', title: 'Area of a triangle', formula: 'A = ½ × b × h', topic: 'Area & perimeter', band: '8-10', stops: ['area-triangles'],
    picture: PIC.areaTri, caption: 'The triangle takes exactly half of each part of its rectangle.',
    why: ['Draw a rectangle round the triangle with the same base b and the same height h. The triangle’s top corner touches the top edge.',
      'Drop a line straight down from that corner. It cuts the rectangle into two smaller rectangles, and the triangle takes exactly half of each one. Half of each part is half of the whole: A = ½ × b × h.'],
    f: (b, h) => (b * h) / 2, example: { q: 'A triangle with base 10 cm and height 6 cm.', args: [10, 6], lines: ['b × h = 10 × 6 = 60', 'A = 60 ÷ 2 = 30 cm²'], ans: 30, expr: '10/2*6' },
    gen(r) { const b = int(3, 20, r), h = int(3, 16, r); return { text: `Area of a triangle with base ${b} cm and height ${h} cm (in cm²)`, ans: this.f(b, h), expr: `${b}/2*${h}` }; },
    story: { title: 'The sail', scene: 'harbour', cast: ['beaker', 'melody'], beats: [
      { who: null, say: 'Ines is sewing a triangle sail for a model boat. Its base is 40 cm and it stands 30 cm tall.', add: { t: '40 × 30 ÷ 2' } },
      { who: 'beaker', say: 'Triangles are awkward. Rectangles are easy.' },
      { who: 'melody', say: 'Then put the sail inside a rectangle, 40 by 30.', add: { t: '40 × 30', v: 1200 } },
      { who: 'beaker', say: 'And the sail fills exactly half of that box — half of each side of the middle line.' },
      { who: 'melody', say: 'Six hundred square centimetres of cloth.', add: { t: '40 × 30 ÷ 2', v: 600 } },
    ] } },
  { id: 'area-parallelogram', title: 'Area of a parallelogram', formula: 'A = b × h', topic: 'Area & perimeter', band: '8-10', stops: ['area-triangles'],
    picture: PIC.parallelogram, caption: 'Slide the end triangle across and it becomes a rectangle.',
    why: ['Slice a triangle off one slanted end of the parallelogram and slide it across to the other end. It fits exactly, because the two slanted sides are parallel and the same length.',
      'Now you have a rectangle with the same base and the same straight-up height. Nothing was added and nothing was lost, so A = b × h. The slanted side’s length is never used — only the height.'],
    f: (b, h) => b * h, example: { q: 'A parallelogram with base 9 cm and height 4 cm.', args: [9, 4], lines: ['A = 9 × 4', '= 36 cm²'], ans: 36, expr: '(9-1)*4+4' },
    gen(r) { const b = int(3, 15, r), h = int(2, 12, r); return { text: `Area of a parallelogram with base ${b} cm and height ${h} cm (in cm²)`, ans: this.f(b, h), expr: `(${b}-1)*${h}+${h}` }; },
    story: { title: 'The slanted flowerbed', scene: 'city', cast: ['astro', 'scopey'], beats: [
      { who: null, say: 'A flowerbed in the city square is a parallelogram: 7 metres along the bottom and 3 metres from bottom to top, measured straight up.', add: { t: '7 × 3' } },
      { who: 'scopey', say: 'The slanted edge is 4 metres. Do we need that?' },
      { who: 'astro', say: 'No. Snip the pointed end off and slide it round to the other side.' },
      { who: 'scopey', say: 'Then it is a rectangle, 7 by 3. I checked — nothing left over.', add: { t: '7 × 3', v: 21 } },
      { who: 'astro', say: 'Twenty-one square metres. Base times height; the slant never counts.' },
    ] } },
  { id: 'area-trapezium', title: 'Area of a trapezium', formula: 'A = ½ × (a + b) × h', topic: 'Area & perimeter', band: '11-14', stops: ['area-triangles', 'compound-area'],
    picture: PIC.trapezium, caption: 'Two trapeziums, one turned over, make a parallelogram with base a + b.',
    why: ['Take two copies of the trapezium and turn one upside down. Push them together and they make a parallelogram.',
      'Its base is a + b — the short side of one next to the long side of the other — and its height is h, so the pair covers (a + b) × h. One trapezium is half of the pair: A = ½ × (a + b) × h.'],
    f: (a, b, h) => ((a + b) * h) / 2, example: { q: 'Parallel sides 5 cm and 9 cm, height 4 cm.', args: [5, 9, 4], lines: ['a + b = 5 + 9 = 14', '14 × 4 = 56', 'A = 56 ÷ 2 = 28 cm²'], ans: 28, expr: '5*4+(9-5)*4/2' },
    gen(r) { const a = int(2, 10, r), b = a + int(1, 10, r), h = int(2, 12, r); return { text: `Area of a trapezium with parallel sides ${a} cm and ${b} cm, height ${h} cm (in cm²)`, ans: this.f(a, b, h), expr: `${a}*${h}+(${b}-${a})*${h}/2` }; },
    story: { title: 'The stage ramp', scene: 'hall', cast: ['samurai', 'comet'], beats: [
      { who: null, say: 'Kwame is painting the side of a stage ramp. It is 2 metres tall at one end, 4 metres at the other, and 5 metres long.', add: { t: '(2 + 4) × 5 ÷ 2' } },
      { who: 'comet', say: 'It isn’t a rectangle and it isn’t a triangle. I give up.' },
      { who: 'samurai', say: 'Picture a second ramp, upside down, pushed against this one. Together they make a parallelogram.' },
      { who: 'samurai', say: 'Its long side is both ends added.', add: { t: '2 + 4', v: 6 } },
      { who: 'comet', say: 'So the pair covers…', add: { t: '6 × 5', v: 30 } },
      { who: 'samurai', say: 'And our ramp is half of the pair: fifteen square metres of paint.', add: { t: '30 ÷ 2', v: 15 } },
    ] } },

  /* ------------------------------------------------ Circles */
  { id: 'circumference', title: 'Circumference of a circle', formula: 'C = π × d = 2 × π × r', topic: 'Circles', band: '11-14', stops: ['round-the-circle'],
    picture: PIC.circumference, caption: 'Unroll any circle: it is just over three diameters long.',
    why: ['Every circle, big or small, is the same shape — only its size changes. So the distance round it is always the same number of times the distance across.',
      'That number is π, a little more than 3: about 3.14. Wrap a string round a tin and it goes just over three times its width. So C = π × d — or 2 × π × r, because the diameter is two radii.'],
    f: (d) => round2(3.14 * d), example: { q: 'A circle 10 cm across (use π = 3.14).', args: [10], lines: ['C = 3.14 × 10', '= 31.4 cm'], ans: 31.4, expr: '10*314/100' },
    gen(r) { const d = int(2, 30, r); return { text: `Distance round a circle ${d} cm across (use π = 3.14; in cm)`, ans: this.f(d), expr: `${d}*314/100` }; },
    story: { title: 'The bicycle wheel', scene: 'city', cast: ['scopey', 'pixel'], beats: [
      { who: null, say: 'Pip’s bike wheel is 60 cm across. How far does the bike roll in one turn of the wheel?', add: { t: '3.14 × 60' } },
      { who: 'pixel', say: 'Easy — it is 60 across, so it rolls 60!' },
      { who: 'scopey', say: 'Across is not round. Round any circle is about 3.14 times across. Three widths first…', add: { t: '3 × 60', v: 180 } },
      { who: 'scopey', say: '…then the extra 0.14 of a width.', add: { t: '0.14 × 60', v: 8.4 } },
      { who: 'pixel', say: 'So one turn rolls nearly two metres!', add: { t: '180 + 8.4', v: 188.4 } },
    ] } },
  { id: 'area-circle', title: 'Area of a circle', formula: 'A = π × r²', topic: 'Circles', band: '11-14', stops: ['round-the-circle'],
    picture: PIC.areaCircle, caption: 'Slices laid top-to-tail make a near-rectangle, r tall and π × r long.',
    why: ['Cut a circle into many thin slices, like a pizza, and lay them in a row, pointing up and down in turn. They make a shape that is nearly a rectangle — and the thinner the slices, the straighter it gets.',
      'Its height is the radius r. Its length is half the way round the circle, π × r. So the area is π × r × r, written π r².'],
    f: (r) => round2(3.14 * r * r), example: { q: 'A circle with radius 5 cm (use π = 3.14).', args: [5], lines: ['r² = 5 × 5 = 25', 'A = 3.14 × 25 = 78.5 cm²'], ans: 78.5, expr: '314*25/100' },
    gen(r) { const rr = int(2, 12, r); return { text: `Area of a circle with radius ${rr} cm (use π = 3.14; in cm²)`, ans: this.f(rr), expr: `(3.14*${rr})*${rr}` }; },
    story: { title: 'The round pond', scene: 'pond', cast: ['astro', 'beaker'], beats: [
      { who: null, say: 'The park pond is a circle with a radius of 10 metres. Rafi wants its area for a school project.', add: { t: '3.14 × 10 × 10' } },
      { who: 'beaker', say: 'I could cut it into squares… but the edges are all curved.' },
      { who: 'astro', say: 'Cut it into thin slices instead and lay them top-to-tail. It becomes almost a rectangle, half the way round long.', add: { t: '3.14 × 10', v: 31.4 } },
      { who: 'astro', say: 'And one radius tall.' },
      { who: 'beaker', say: 'Then it is length times height!', add: { t: '31.4 × 10', v: 314 } },
      { who: 'astro', say: 'About 314 square metres. π r squared.', add: { t: '3.14 × 10 × 10', v: 314 } },
    ] } },

  /* ------------------------------------------------ Volume & surface area */
  { id: 'volume-cuboid', title: 'Volume of a cuboid', formula: 'V = l × w × h', topic: 'Volume & surface area', band: '8-10', stops: ['volume-cuboid'],
    picture: PIC.volCuboid, caption: 'One layer is l × w cubes; there are h layers.',
    why: ['Fill the bottom of the box with centimetre cubes: that is l × w cubes, one layer.',
      'Stack h layers like that and the box is full. So the volume is l × w × h cubic units — the floor’s area times the height.'],
    f: (l, w, h) => l * w * h, example: { q: 'A box 5 cm by 4 cm by 3 cm.', args: [5, 4, 3], lines: ['one layer: 5 × 4 = 20', 'V = 20 × 3 = 60 cm³'], ans: 60, expr: '5*4+5*4+5*4' },
    gen(r) { const l = int(2, 12, r), w = int(2, 10, r), h = int(2, 10, r); return { text: `Volume of a box ${l} cm by ${w} cm by ${h} cm (in cm³)`, ans: this.f(l, w, h), expr: range(h, () => `${l}*${w}`).join('+') }; },
    story: { title: 'Packing the sugar cubes', scene: 'shop', cast: ['koi', 'panda'], beats: [
      { who: null, say: 'Suki is filling a box with sugar cubes. It fits 5 cubes along, 4 across and 3 layers high.', add: { t: '5 × 4 × 3' } },
      { who: 'koi', say: 'Start with the bottom layer.', add: { t: '5 × 4', v: 20 } },
      { who: 'panda', say: 'Twenty in a layer. And every layer is the same, so we never count past the first.' },
      { who: 'koi', say: 'Three layers of twenty.', add: { t: '20 × 3', v: 60 } },
      { who: 'panda', say: 'Sixty cubes. The floor, times the height.', add: { t: '5 × 4 × 3', v: 60 } },
    ] } },
  { id: 'surface-area-cuboid', title: 'Surface area of a cuboid', formula: 'S = 2 × (lw + lh + wh)', topic: 'Volume & surface area', band: '11-14', stops: ['volume-cuboid'],
    picture: PIC.surfCuboid, caption: 'Unfold the box: three pairs of matching faces.',
    why: ['A box has six faces, and they come in three matching pairs: top and bottom, front and back, left and right.',
      'The pairs have areas l × w, l × h and w × h. Add one of each and double: S = 2 × (lw + lh + wh). Unfold the box into its net and you can see all six at once.'],
    f: (l, w, h) => 2 * (l * w + l * h + w * h), example: { q: 'A box 5 cm by 3 cm by 2 cm.', args: [5, 3, 2], lines: ['5 × 3 + 5 × 2 + 3 × 2 = 15 + 10 + 6 = 31', 'S = 2 × 31 = 62 cm²'], ans: 62, expr: '5*3+5*3+5*2+5*2+3*2+3*2' },
    gen(r) { const l = int(2, 10, r), w = int(2, 8, r), h = int(2, 8, r); return { text: `Surface area of a box ${l} cm by ${w} cm by ${h} cm (in cm²)`, ans: this.f(l, w, h), expr: `${l}*${w}+${l}*${w}+${l}*${h}+${l}*${h}+${w}*${h}+${w}*${h}` }; },
    story: { title: 'Wrapping the present', scene: 'festival', cast: ['melody', 'comet'], beats: [
      { who: null, say: 'Dax is wrapping a box 30 cm long, 20 cm wide and 10 cm tall. How much paper covers it exactly?', add: { t: '2 × (30 × 20 + 30 × 10 + 20 × 10)' } },
      { who: 'comet', say: 'Six sides! I will measure every one.' },
      { who: 'melody', say: 'They come in pairs. Top first — the bottom is the same.', add: { t: '30 × 20', v: 600 } },
      { who: 'melody', say: 'Then the front, and one end.', add: { t: '30 × 10 + 20 × 10', v: 500 } },
      { who: 'comet', say: 'One of each pair makes…', add: { t: '600 + 500', v: 1100 } },
      { who: 'melody', say: 'Double it: 2,200 square centimetres, before any overlap.', add: { t: '1100 × 2', v: 2200 } },
    ] } },
  { id: 'volume-cube', title: 'Volume of a cube', formula: 'V = s × s × s = s³', topic: 'Volume & surface area', band: '8-10', stops: ['cube-and-root', 'volume-cuboid'],
    picture: PIC.volCube, caption: 's × s in a layer, and s layers: s³, “s cubed”.',
    why: ['A cube is a cuboid whose length, width and height are all the same, so l × w × h becomes s × s × s.',
      'That is why s³ is called “s cubed”: it counts the little cubes in a big cube of side s. A 3 by 3 by 3 cube holds 9 in each layer and 3 layers: 27.'],
    f: (s) => s * s * s, example: { q: 'A cube with 4 cm edges.', args: [4], lines: ['4 × 4 = 16 in a layer', 'V = 16 × 4 = 64 cm³'], ans: 64, expr: '4**3' },
    gen(r) { const s = int(2, 12, r); return { text: `Volume of a cube with ${s} cm edges (in cm³)`, ans: this.f(s), expr: `${s}**3` }; },
    story: { title: 'The block tower', scene: 'room', cast: ['astro', 'pixel'], beats: [
      { who: null, say: 'Pip builds one big cube out of little wooden blocks, 4 blocks along every edge.', add: { t: '4 × 4 × 4' } },
      { who: 'pixel', say: 'How many blocks did I use? I will take it apart and count.' },
      { who: 'astro', say: 'Don’t! Count the top layer instead.', add: { t: '4 × 4', v: 16 } },
      { who: 'astro', say: 'There are 4 layers like that.', add: { t: '16 × 4', v: 64 } },
      { who: 'pixel', say: 'Sixty-four blocks. Four cubed!', add: { t: '4 × 4 × 4', v: 64 } },
    ] } },
  { id: 'volume-prism', title: 'Volume of a prism', formula: 'V = area of end × length', topic: 'Volume & surface area', band: '11-14', stops: ['volume-cuboid', 'area-triangles'],
    picture: PIC.prism, caption: 'Every slice is the same as the end, so stack the end along the length.',
    why: ['A prism is the same shape all the way through, like a loaf of bread: every slice is a copy of the end.',
      'So the end’s area tells you how much fills one slice 1 unit thick, and the length tells you how many slices there are. V = area of the end × length. A cuboid is simply a prism with a rectangle for its end.'],
    f: (b, h, l) => ((b * h) / 2) * l, example: { q: 'A prism whose end is a triangle, base 6 cm and height 4 cm, 10 cm long.', args: [6, 4, 10], lines: ['end: 6 × 4 ÷ 2 = 12 cm²', 'V = 12 × 10 = 120 cm³'], ans: 120, expr: '6*4*10/2' },
    gen(r) { const b = 2 * int(2, 6, r), h = int(2, 10, r), l = int(2, 15, r); return { text: `A prism’s end is a triangle, base ${b} cm and height ${h} cm. It is ${l} cm long. Volume (in cm³)?`, ans: this.f(b, h, l), expr: `${b}*${h}*${l}/2` }; },
    story: { title: 'The tent', scene: 'forest', cast: ['panda', 'scopey'], beats: [
      { who: null, say: 'Theo and Suki pitch a tent shaped like a triangular prism. The end is 2 m wide and 1.5 m tall; the tent is 3 m long.', add: { t: '2 × 1.5 ÷ 2 × 3' } },
      { who: 'scopey', say: 'How much air is inside? Is there room for two?' },
      { who: 'panda', say: 'Every slice of the tent is the same triangle. Find the end first.', add: { t: '2 × 1.5 ÷ 2', v: 1.5 } },
      { who: 'panda', say: 'Then it is 3 metres of that triangle.', add: { t: '1.5 × 3', v: 4.5 } },
      { who: 'scopey', say: 'Four and a half cubic metres. I worked it out twice — plenty of room.' },
    ] } },
  { id: 'volume-cylinder', title: 'Volume of a cylinder', formula: 'V = π × r² × h', topic: 'Volume & surface area', band: '11-14', stops: ['round-the-circle', 'volume-cuboid'],
    picture: PIC.cylinder, caption: 'A circle, stacked up to height h.',
    why: ['A cylinder is a prism with a circle at each end, so the prism rule still works: area of the end × length.',
      'The end is a circle with area π × r², so V = π × r² × h. A tin twice as tall holds twice as much; a tin twice as wide holds four times as much, because the radius is squared.'],
    f: (r, h) => round2(3.14 * r * r * h), example: { q: 'A tin with radius 5 cm and height 10 cm (use π = 3.14).', args: [5, 10], lines: ['end: 3.14 × 5 × 5 = 78.5 cm²', 'V = 78.5 × 10 = 785 cm³'], ans: 785, expr: '3.14*25*10' },
    gen(r) { const rr = int(1, 6, r), h = int(2, 20, r); return { text: `Volume of a cylinder, radius ${rr} cm and height ${h} cm (use π = 3.14; in cm³)`, ans: this.f(rr, h), expr: `3.14*${rr * rr}*${h}` }; },
    story: { title: 'The water tank', scene: 'garden', cast: ['samurai', 'koi'], beats: [
      { who: null, say: 'A round water tank in the garden has a radius of 1 metre and stands 2 metres tall.', add: { t: '3.14 × 1 × 1 × 2' } },
      { who: 'koi', say: 'How much rain can it hold?' },
      { who: 'samurai', say: 'Find the area of the circle at the bottom first.', add: { t: '3.14 × 1 × 1', v: 3.14 } },
      { who: 'samurai', say: 'Then stack that circle 2 metres high.', add: { t: '3.14 × 2', v: 6.28 } },
      { who: 'koi', say: 'About 6.28 cubic metres. That is a lot of rain.' },
    ] } },

  /* ------------------------------------------------ Angles & solids */
  { id: 'angles-on-a-line', title: 'Angles on a straight line', formula: 'a + b = 180°', topic: 'Angles & solids', band: '8-10', stops: ['angles-on-a-line'],
    picture: PIC.anglesLine, caption: 'A straight line is a half turn; the pieces share it.',
    why: ['A straight line is a half turn. Stand facing one way along it, turn to face the other way, and you have turned 180°.',
      'If another line splits that half turn into two angles, the two pieces still make the whole half turn between them. So angles on a straight line add to 180°, and a missing one is 180° take away the others.'],
    f: (a) => 180 - a, example: { q: 'One angle on a straight line is 65°.', args: [65], lines: ['180 − 65 = 115°'], ans: 115, expr: '90+(90-65)' },
    gen(r) { const a = int(15, 165, r); return { text: `Two angles sit on a straight line. One is ${a}°. The other (in °)?`, ans: this.f(a), expr: `90+(90-${a})` }; },
    story: { title: 'The leaning book', scene: 'library', cast: ['scopey', 'koi'], beats: [
      { who: null, say: 'On the library shelf a book has slipped. It leans at 70° to the shelf. What is the angle on its other side?', add: { t: '180 − 70' } },
      { who: 'koi', say: 'We need a protractor.' },
      { who: 'scopey', say: 'We don’t. The shelf is a straight line, and a straight line is a half turn: 180°. The two angles share it.', add: { t: '180 − 70', v: 110 } },
      { who: 'koi', say: 'Check: the two together make the whole line again.', add: { t: '70 + 110', v: 180 } },
      { who: 'scopey', say: 'So the other side is 110°. Checked.', add: { t: '180 − 70', v: 110 } },
    ] } },
  { id: 'angles-round-a-point', title: 'Angles round a point', formula: 'a + b + c = 360°', topic: 'Angles & solids', band: '8-10', stops: ['angles-on-a-line'],
    picture: PIC.anglesPoint, caption: 'However many pieces, together they are one full turn.',
    why: ['Turn all the way round on the spot and you face the way you started: a full turn is 360°.',
      'Lines coming out of one point cut that full turn into pieces. However many pieces there are, together they are still the one full turn, so they add to 360°.'],
    f: (a, b) => 360 - a - b, example: { q: 'Two of three angles round a point are 100° and 140°.', args: [100, 140], lines: ['100 + 140 = 240', '360 − 240 = 120°'], ans: 120, expr: '(180-100)+(180-140)' },
    gen(r) { const a = int(40, 170, r), b = int(40, 320 - a, r); return { text: `Three angles fill the space round a point. Two are ${a}° and ${b}°. The third (in °)?`, ans: this.f(a, b), expr: `(180-${a})+(180-${b})` }; },
    story: { title: 'The last slice', scene: 'kitchen', cast: ['pixel', 'melody'], beats: [
      { who: null, say: 'Pip cuts a round pizza from the middle. His slice has a 100° angle at the centre and Ines’s has 140°. The rest is saved for later.', add: { t: '360 − 100 − 140' } },
      { who: 'pixel', say: 'What angle is the piece that is left?' },
      { who: 'melody', say: 'Every slice meets at the centre, and all the way round the centre is a full turn. Ours use up…', add: { t: '100 + 140', v: 240 } },
      { who: 'melody', say: 'The last piece is whatever is left of 360.', add: { t: '360 − 240', v: 120 } },
      { who: 'pixel', say: 'A 120° slice — that is the biggest one!', add: { t: '360 − 100 − 140', v: 120 } },
    ] } },
  { id: 'angles-in-a-triangle', title: 'Angles in a triangle', formula: 'a + b + c = 180°', topic: 'Angles & solids', band: '8-10', stops: ['angles-in-a-shape'],
    picture: PIC.anglesTri, caption: 'Tear off the three corners: they fit together on a straight line.',
    why: ['Tear the three corners off a paper triangle and put their points together. They always fit side by side along a straight line.',
      'A straight line is 180°, so the three angles of any triangle add to 180°. Draw a line through the top corner parallel to the base and you can see why: the two new angles beside the top corner copy the two bottom corners exactly.'],
    f: (a, b) => 180 - a - b, example: { q: 'A triangle has angles of 50° and 60°.', args: [50, 60], lines: ['50 + 60 = 110', '180 − 110 = 70°'], ans: 70, expr: '(180-50)-60' },
    gen(r) { const a = int(20, 120, r), b = int(20, 160 - a, r); return { text: `A triangle has angles of ${a}° and ${b}°. The third angle (in °)?`, ans: this.f(a, b), expr: `180-(${a}+${b})` }; },
    story: { title: 'The bunting', scene: 'fair', cast: ['astro', 'comet'], beats: [
      { who: null, say: 'Dax is cutting triangle flags for the fair. The two corners along the top are 70° and 70°. What is the point at the bottom?', add: { t: '180 − 70 − 70' } },
      { who: 'comet', say: 'Every flag is the same, so I only need to measure one.' },
      { who: 'astro', say: 'You don’t need to measure at all. Tear the corners off any triangle and they line up along a straight edge: 180°.' },
      { who: 'astro', say: 'The top two use up…', add: { t: '70 + 70', v: 140 } },
      { who: 'comet', say: '…and the bottom point gets the rest.', add: { t: '180 − 140', v: 40 } },
      { who: 'astro', say: 'Forty degrees, on every flag.', add: { t: '180 − 70 − 70', v: 40 } },
    ] } },
  { id: 'interior-angles', title: 'Angles inside a polygon', formula: 'sum = (n − 2) × 180°', topic: 'Angles & solids', band: '11-14', stops: ['angles-in-a-shape'],
    picture: PIC.interiorSum, caption: 'From one corner, a shape with n sides splits into n − 2 triangles.',
    why: ['Stand at one corner of a shape with n sides and draw straight lines to every corner you cannot already reach along a side. The shape splits into triangles — always n − 2 of them.',
      'Each triangle holds 180°, and together their corners fill exactly the corners of the shape. So the angles inside add to (n − 2) × 180°. A hexagon: 4 triangles, 720°.'],
    f: (n) => (n - 2) * 180, example: { q: 'A pentagon (5 sides).', args: [5], lines: ['5 − 2 = 3 triangles', '3 × 180 = 540°'], ans: 540, expr: '180+180+180' },
    gen(r) { const n = int(4, 12, r); return { text: `The angles inside a shape with ${n} sides add up to how many degrees?`, ans: this.f(n), expr: `${n}*180-360` }; },
    story: { title: 'The hexagon tiles', scene: 'palace', cast: ['samurai', 'beaker'], beats: [
      { who: null, say: 'The palace courtyard is paved with six-sided tiles. Rafi wonders what all six corners of one tile add up to.', add: { t: '(6 − 2) × 180' } },
      { who: 'beaker', say: 'A triangle makes 180°, I know that. But a hexagon?' },
      { who: 'samurai', say: 'Stand on one corner and draw lines to the far corners. How many triangles?' },
      { who: 'beaker', say: 'Four! Two fewer than the sides.', add: { t: '6 − 2', v: 4 } },
      { who: 'samurai', say: 'Four triangles, 180° each.', add: { t: '4 × 180', v: 720 } },
      { who: 'beaker', say: 'Seven hundred and twenty. So each of the six equal corners is 120°.' },
    ] } },
  { id: 'exterior-angles', title: 'Exterior angle of a regular polygon', formula: 'each = 360° ÷ n', topic: 'Angles & solids', band: '11-14', stops: ['angles-in-a-shape'],
    picture: PIC.exterior, caption: 'Walk round the outside: all the turns together make one full turn.',
    why: ['Walk all the way round the outside of a shape. At each corner you turn a little, and by the time you are back at the start you face the way you began: one full turn, 360°.',
      'In a regular shape every corner turns the same amount, so each exterior angle is 360° ÷ n. The angle inside is what is left of a straight line: 180° minus that.'],
    f: (n) => 360 / n, example: { q: 'A regular octagon (8 sides).', args: [8], lines: ['360 ÷ 8 = 45°', 'inside: 180 − 45 = 135°'], ans: 45, expr: '180-(8-2)*180/8' },
    gen(r) { const n = pick([3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36], r); return { text: `Each exterior angle of a regular shape with ${n} sides (in °)?`, ans: this.f(n), expr: `180-(${n}-2)*180/${n}` }; },
    story: { title: 'The toy robot', scene: 'garden', cast: ['scopey', 'comet'], beats: [
      { who: null, say: 'Dax programs a toy robot to drive round a flowerbed shaped like a regular pentagon: five equal sides, five equal turns.', add: { t: '360 ÷ 5' } },
      { who: 'comet', say: 'How far should it turn at each corner?' },
      { who: 'scopey', say: 'When it gets back to the start it has turned right round once. That is 360°.' },
      { who: 'scopey', say: 'Five equal turns share that full turn.', add: { t: '360 ÷ 5', v: 72 } },
      { who: 'comet', say: 'Seventy-two degrees at every corner. Go, robot!' },
    ] } },
  { id: 'euler', title: 'Euler’s formula for solids', formula: 'F + V − E = 2', topic: 'Angles & solids', band: '8-10', stops: ['faces-edges-vertices'],
    picture: PIC.euler, caption: 'Faces plus corners take away edges: 2, for every solid like these.',
    why: ['Count the faces F, corners V and edges E of any solid with flat faces and no hole through it. Add the faces and the corners, take away the edges, and you always get 2.',
      'Here is a hint of why it cannot move. Slice one corner off a cube: you gain 1 new face and 3 new edges, and the 1 old corner becomes 3 new ones. F + V − E changes by 1 + 2 − 3 = 0. It carries the name of Leonhard Euler, who wrote about it.'],
    sources: ['L. Euler, "Elementa doctrinae solidorum", Novi Commentarii academiae scientiarum Petropolitanae 4 (1758) — the relation F + V − E = 2 for polyhedra.'],
    f: (F, V) => F + V - 2, example: { q: 'A cube has 6 faces and 8 corners. How many edges?', args: [6, 8], lines: ['E = F + V − 2', '= 6 + 8 − 2 = 12 edges'], ans: 12, expr: '4*3' },
    gen(r) {
      const [name, F, V, E] = pick(SOLIDS, r);
      if (r() < 0.5) return { text: `A ${name} has ${F} faces and ${V} corners. How many edges?`, ans: this.f(F, V), expr: `${E}` };
      return { text: `A ${name} has ${V} corners and ${E} edges. How many faces?`, ans: E - V + 2, expr: `${F}` };
    },
    story: { title: 'The chocolate box', scene: 'shop', cast: ['beaker', 'panda'], beats: [
      { who: null, say: 'Suki’s chocolate box is a triangular prism. Rafi counts 5 faces and 6 corners, then loses count of the edges.', add: { t: '5 + 6 − 2' } },
      { who: 'beaker', say: 'Edges are the hardest. They hide round the back.' },
      { who: 'panda', say: 'For any solid like this, faces plus corners take away edges is always 2. So the edges are 2 fewer than faces and corners together.', add: { t: '5 + 6', v: 11 } },
      { who: 'beaker', say: 'Eleven, take away two…', add: { t: '11 − 2', v: 9 } },
      { who: 'panda', say: 'Nine. Count them if you like: three on each triangle, three along the length.', add: { t: '3 + 3 + 3', v: 9 } },
    ] } },

  /* ------------------------------------------------ Algebra & number */
  { id: 'square-of-sum', title: 'Squaring a sum', formula: '(a + b)² = a² + 2ab + b²', topic: 'Algebra & number', band: '11-14', stops: ['square-up', 'split-multiply'],
    picture: PIC.squareSum, caption: 'A square of side a + b is a², b² and two a × b strips.',
    why: ['Draw a square with sides a + b and cut each side where a ends. The big square splits into four pieces: an a by a square, a b by b square, and two a by b rectangles.',
      'Add the pieces and you have a² + ab + ab + b², which is a² + 2ab + b². That is why 23² = 20² + 2 × 20 × 3 + 3² = 400 + 120 + 9 = 529.'],
    f: (a, b) => a * a + 2 * a * b + b * b, example: { q: '34², as (30 + 4)².', args: [30, 4], lines: ['30² = 900, 2 × 30 × 4 = 240, 4² = 16', '900 + 240 + 16 = 1156'], ans: 1156, expr: '34*34' },
    gen(r) { const a = 10 * int(1, 9, r), b = int(1, 9, r); return { text: `Use (a + b)²: ${a + b}² = (${a} + ${b})²`, ans: this.f(a, b), expr: `${a + b}*${a + b}` }; },
    story: { title: 'The herb garden grows', scene: 'garden', cast: ['astro', 'koi'], beats: [
      { who: null, say: 'Mira’s square herb garden is 20 by 20 tiles. She makes it 3 tiles bigger each way. How many tiles now?', add: { t: '23 × 23' } },
      { who: 'koi', say: 'Do we start again from nothing?' },
      { who: 'astro', say: 'No. Keep the old square…', add: { t: '20 × 20', v: 400 } },
      { who: 'astro', say: '…add two long strips, each 20 by 3…', add: { t: '2 × 20 × 3', v: 120 } },
      { who: 'astro', say: '…and the little corner square, 3 by 3.', add: { t: '3 × 3', v: 9 } },
      { who: 'koi', say: 'So all together:', add: { t: '400 + 120 + 9', v: 529 } },
    ] } },
  { id: 'square-of-difference', title: 'Squaring a difference', formula: '(a − b)² = a² − 2ab + b²', topic: 'Algebra & number', band: '11-14', stops: ['square-minus'],
    picture: PIC.squareDiff, caption: 'Take off two strips — and put back the corner you took twice.',
    why: ['Start with an a by a square. Cut a strip b wide off one side and another off the top. Each strip is a by b, so you take away 2ab.',
      'But the little b by b corner was in both strips, so it was taken away twice. Put it back once: (a − b)² = a² − 2ab + b². That is why 49² = 2500 − 100 + 1 = 2401.'],
    f: (a, b) => a * a - 2 * a * b + b * b, example: { q: '49², as (50 − 1)².', args: [50, 1], lines: ['50² = 2500, 2 × 50 × 1 = 100, 1² = 1', '2500 − 100 + 1 = 2401'], ans: 2401, expr: '49*49' },
    gen(r) { const a = 10 * int(2, 10, r), b = int(1, 4, r); return { text: `Use (a − b)²: ${a - b}² = (${a} − ${b})²`, ans: this.f(a, b), expr: `${a - b}*${a - b}` }; },
    story: { title: 'Fewer chairs', scene: 'hall', cast: ['samurai', 'pixel'], beats: [
      { who: null, say: 'The hall’s chairs stand in a square, 30 rows of 30. For the concert Kwame takes away one row and one column. How many are left?', add: { t: '29 × 29' } },
      { who: 'pixel', say: 'Thirty thirties is 900. Take away a row of 30 and a column of 30: 840!' },
      { who: 'samurai', say: 'Careful. The corner chair was in the row AND the column. Take away the row and the column…', add: { t: '900 − 30 − 30', v: 840 } },
      { who: 'samurai', say: '…then put that one corner chair back.', add: { t: '840 + 1', v: 841 } },
      { who: 'pixel', say: 'Eight hundred and forty-one. a², take away 2ab, add b²!', add: { t: '29 × 29', v: 841 } },
    ] } },
  { id: 'difference-of-squares', title: 'Difference of two squares', formula: 'a² − b² = (a + b)(a − b)', topic: 'Algebra & number', band: '11-14', stops: ['diff-squares'],
    picture: PIC.diffSquares, caption: 'Cut the L-shape and swing one piece round: a rectangle (a + b) by (a − b).',
    why: ['Take a square a by a and cut a small b by b square out of one corner. What is left is an L-shape with area a² − b².',
      'Slice the L into two rectangles and swing the smaller one round to the end of the bigger. Together they make one rectangle a + b long and a − b wide. So a² − b² = (a + b)(a − b) — and turned round, 52 × 48 = 50² − 2² = 2496.'],
    f: (a, b) => (a + b) * (a - b), example: { q: '52 × 48, as 50² − 2².', args: [50, 2], lines: ['50² = 2500, 2² = 4', '2500 − 4 = 2496'], ans: 2496, expr: '52*48' },
    gen(r) {
      if (r() < 0.5) { const m = 10 * int(2, 9, r), d = int(1, 6, r); return { text: `${m + d} × ${m - d}`, ans: m * m - d * d, expr: `${m + d}*${m - d}` }; }
      const a = int(11, 60, r), b = a - int(1, 5, r); return { text: `${a}² − ${b}²`, ans: this.f(a, b), expr: `${a}*${a}-${b}*${b}` };
    },
    story: { title: 'The cinema seats', scene: 'city', cast: ['goldlegend', 'melody'], beats: [
      { who: null, say: 'A cinema has 43 rows of 37 seats. Ines wants the total before the film starts.', add: { t: '43 × 37' } },
      { who: 'melody', say: 'Forty-three thirty-sevens. That needs paper.' },
      { who: 'goldlegend', say: 'Both are 3 from 40. Square the middle.', add: { t: '40 × 40', v: 1600 } },
      { who: 'goldlegend', say: 'Take away the gap, squared.', add: { t: '1600 − 3 × 3', v: 1591 } },
      { who: 'melody', say: 'One thousand five hundred and ninety-one seats. No paper.', add: { t: '43 × 37', v: 1591 } },
    ] } },
  { id: 'index-multiply', title: 'Multiplying powers', formula: 'aᵐ × aⁿ = aᵐ⁺ⁿ', topic: 'Algebra & number', band: '11-14', stops: ['index-laws', 'powers-index'],
    picture: PIC.indexMul, caption: 'Three 2s and two more 2s make a row of five 2s.',
    why: ['2³ means three 2s multiplied together, and 2² means two more. Multiply them and you just have a longer row of 2s: 2 × 2 × 2 × 2 × 2.',
      'Count the 2s: 3 + 2 = 5. So when the base is the same, multiplying powers adds the little numbers, and dividing takes them away: 2⁵ ÷ 2² = 2³, because two of the 2s cancel.'],
    f: (a, m, n) => a ** (m + n), example: { q: '2³ × 2⁴.', args: [2, 3, 4], lines: ['3 + 4 = 7, so 2⁷', '2⁷ = 128'], ans: 128, expr: '2*2*2*2*2*2*2' },
    gen(r) {
      const a = pick([2, 2, 3, 10], r), hi = a === 2 ? 5 : 3, m = int(1, hi, r), n = int(1, hi, r);
      if (r() < 0.5) return { text: `${a}${sup(m)} × ${a}${sup(n)}`, ans: this.f(a, m, n), expr: `${a ** m}*${a ** n}` };
      return { text: `${a}${sup(m)} × ${a}${sup(n)} is ${a} to the power of what?`, ans: m + n, expr: `Math.round(Math.log(${a ** m * a ** n})/Math.log(${a}))` };
    },
    story: { title: 'The folded paper', scene: 'library', cast: ['samurai', 'scopey'], beats: [
      { who: null, say: 'Theo folds a sheet of paper in half 3 times. Kwame takes it and folds it in half 2 more times. How many layers thick is it now?', add: { t: '2 × 2 × 2 × 2 × 2' } },
      { who: 'scopey', say: 'After my three folds…', add: { t: '2 × 2 × 2', v: 8 } },
      { who: 'samurai', say: 'Every fold doubles it. My two folds multiply by…', add: { t: '2 × 2', v: 4 } },
      { who: 'scopey', say: 'Eight times four…', add: { t: '8 × 4', v: 32 } },
      { who: 'samurai', say: 'Or just count the folds: 3 + 2 = 5 twos. Two to the fifth.', add: { t: '2 × 2 × 2 × 2 × 2', v: 32 } },
    ] } },
  { id: 'index-power', title: 'A power of a power', formula: '(aᵐ)ⁿ = aᵐˣⁿ', topic: 'Algebra & number', band: '11-14', stops: ['index-laws'],
    picture: PIC.indexPow, caption: 'Two copies of three 2s: six 2s.',
    why: ['(2³)² means 2³ written down twice and multiplied: (2 × 2 × 2) × (2 × 2 × 2).',
      'That is 2 copies of 3 twos — 6 twos in all. So a power of a power multiplies the little numbers: (aᵐ)ⁿ = aᵐˣⁿ. And a⁰ = 1, because dividing aᵐ by itself takes all m away and leaves 1.'],
    f: (a, m, n) => a ** (m * n), example: { q: '(3²)³.', args: [3, 2, 3], lines: ['2 × 3 = 6, so 3⁶', '3⁶ = 729'], ans: 729, expr: '9*9*9' },
    gen(r) {
      const a = pick([2, 3, 10], r), m = int(1, a === 2 ? 3 : 2, r), n = int(2, 3, r);
      if (r() < 0.5) return { text: `(${a}${sup(m)})${sup(n)}`, ans: this.f(a, m, n), expr: range(n, () => a ** m).join('*') };
      return { text: `(${a}${sup(m)})${sup(n)} is ${a} to the power of what?`, ans: m * n, expr: `Math.round(Math.log(${a ** (m * n)})/Math.log(${a}))` };
    },
    story: { title: 'The bakery trolley', scene: 'bakery', cast: ['beaker', 'goldlegend'], beats: [
      { who: null, say: 'At the bakery a tray holds cakes in a square, 3 by 3. A trolley holds trays in a square too, 3 by 3. How many cakes on a full trolley?', add: { t: '(3 × 3) × (3 × 3)' } },
      { who: 'beaker', say: 'One tray is three squared.', add: { t: '3 × 3', v: 9 } },
      { who: 'beaker', say: 'And there are nine trays, so nine lots of nine.', add: { t: '9 × 9', v: 81 } },
      { who: 'goldlegend', say: 'Or: two lots of two threes. Four threes.', add: { t: '3 × 3 × 3 × 3', v: 81 } },
      { who: 'beaker', say: 'Three squared, squared, is three to the fourth. The little numbers multiply!' },
    ] } },
  { id: 'nth-term', title: 'The nth term', formula: 'Tₙ = a + (n − 1) × d', topic: 'Algebra & number', band: '11-14', stops: ['nth-term'],
    picture: PIC.nthTerm, caption: 'Each step adds d; the nth term is n − 1 steps from the first.',
    why: ['In a sequence that goes up by the same step d each time, the first number is a. To reach the 2nd you take 1 step; to reach the 3rd you take 2 steps; to reach the nth you take n − 1 steps.',
      'So the nth term is a + (n − 1) × d. Tidied up, it is d × n + (a − d): for 5, 8, 11, 14, … that is 3n + 2. The number in front of n is always the step.'],
    f: (a, d, n) => a + (n - 1) * d, example: { q: 'The 20th term of 5, 8, 11, 14, …', args: [5, 3, 20], lines: ['19 steps of 3 = 57', '5 + 57 = 62'], ans: 62, expr: '3*20+2' },
    gen(r) {
      const a = int(1, 12, r), d = int(2, 9, r), n = int(10, 50, r);
      let t = a; for (let i = 1; i < n; i++) t += d;
      return { text: `${a}, ${a + d}, ${a + 2 * d}, ${a + 3 * d}, … What is term number ${n}?`, ans: t, expr: `${d}*${n}+(${a}-${d})` };
    },
    story: { title: 'The cup pyramid', scene: 'fair', cast: ['comet', 'samurai'], beats: [
      { who: null, say: 'At the fair Dax lines up rows of cups: 4 in the first row, 7 in the second, 10 in the third. How many would row 25 need?', add: { t: '4 + 24 × 3' } },
      { who: 'comet', say: 'I will just keep adding 3… 13, 16, 19…' },
      { who: 'samurai', say: 'You would be here till the fair closes. Row 25 is 24 steps after row 1.', add: { t: '25 − 1', v: 24 } },
      { who: 'samurai', say: 'Each step adds 3.', add: { t: '24 × 3', v: 72 } },
      { who: 'comet', say: 'Plus the 4 we started with!', add: { t: '4 + 72', v: 76 } },
      { who: 'samurai', say: 'Seventy-six cups. That is 3n + 1, with n = 25.', add: { t: '3 × 25 + 1', v: 76 } },
    ] } },
  { id: 'pythagoras', title: 'Pythagoras’ theorem', formula: 'a² + b² = c²', topic: 'Algebra & number', band: '11-14', note: 'For 13–14', stops: ['pythagoras-side', 'kinds-of-triangle', 'root-of-square', 'square-up'],
    picture: PIC.pythagoras, caption: 'The squares on the two short sides, 9 + 16, fill the square on the longest side, 25.',
    why: ['This card is for 13- and 14-year-olds. In a right-angled triangle, build a square on each side. The two squares on the shorter sides, a² and b², together have exactly the area of the square on the longest side, c².',
      'One way to see it: draw a big square of side a + b and put four copies of the triangle in its corners. Arranged one way, the space left is one tilted square, c². Arranged another way, it is two squares, a² and b². Same big square, same four triangles — so a² + b² = c². It carries the name of Pythagoras; a proof of it is Proposition 47 in Book I of Euclid’s Elements.'],
    sources: ['Euclid, Elements, Book I, Proposition 47; in T. L. Heath (trans.), The Thirteen Books of Euclid’s Elements (Cambridge University Press, 1908).'],
    f: (a, b) => Math.sqrt(a * a + b * b), example: { q: 'Shorter sides 6 cm and 8 cm. The longest side?', args: [6, 8], lines: ['6² + 8² = 36 + 64 = 100', 'c = √100 = 10 cm'], ans: 10, expr: '2*5' },
    gen(r) {
      const [a, b, c, kmax] = pick(TRIPLES, r), k = int(1, kmax, r);
      if (r() < 0.5) return { text: `A right-angled triangle has shorter sides of ${k * a} cm and ${k * b} cm. The longest side (in cm)?`, ans: this.f(k * a, k * b), expr: `${k}*${c}` };
      return { text: `A right-angled triangle has a longest side of ${k * c} cm and one shorter side of ${k * b} cm. The other shorter side (in cm)?`, ans: Math.sqrt((k * c) ** 2 - (k * b) ** 2), expr: `${k}*${a}` };
    },
    story: { title: 'The shortcut across the park', scene: 'city', cast: ['goldlegend', 'comet'], beats: [
      { who: null, say: 'Dax walks 30 m along one edge of a rectangular park, then 40 m up the side. Vesper cuts straight across the grass. How much shorter is her path?', add: { t: '30 + 40 − 50' } },
      { who: 'comet', say: 'I walked 70 metres. Yours can’t be much less.' },
      { who: 'goldlegend', say: 'Square each side and add.', add: { t: '30 × 30 + 40 × 40', v: 2500 } },
      { who: 'comet', say: 'So your path is the number that squares to 2,500. That is 50!', add: { t: '50 × 50', v: 2500 } },
      { who: 'goldlegend', say: 'Twenty metres shorter.', add: { t: '30 + 40 − 50', v: 20 } },
    ] } },
  { id: 'odd-numbers-square', title: 'Odd numbers make squares', formula: '1 + 3 + 5 + … + (2n − 1) = n²', topic: 'Algebra & number', band: '8-10', stops: ['odd-staircase', 'square-dots'],
    picture: PIC.oddSquares, caption: 'Each new L of dots is the next odd number and makes the next square.',
    why: ['Start with one dot. Wrap 3 dots round two of its sides and you have a 2 by 2 square. Wrap 5 more round that and you have 3 by 3.',
      'Each new L-shape is 2 dots longer than the last, so it is the next odd number — and each one grows the square by one. So the first n odd numbers always add up to n × n.'],
    f: (n) => n * n, example: { q: 'The first 6 odd numbers.', args: [6], lines: ['1 + 3 + 5 + 7 + 9 + 11', '= 6 × 6 = 36'], ans: 36, expr: '1+3+5+7+9+11' },
    gen(r) { const n = int(4, 20, r); return { text: `1 + 3 + 5 + … + ${2 * n - 1} (the first ${n} odd numbers). Total?`, ans: this.f(n), expr: range(n, (i) => 2 * i + 1).join('+') }; },
    story: { title: 'Pebbles on the beach', scene: 'beach', cast: ['panda', 'pixel'], beats: [
      { who: null, say: 'On the beach Pip lays pebbles in L-shapes round a first pebble: 1, then 3 round it, then 5, then 7, then 9.', add: { t: '1 + 3 + 5 + 7 + 9' } },
      { who: 'pixel', say: 'One, four, nine… it keeps making squares!' },
      { who: 'panda', say: 'Each L goes round two sides of the square you had. That makes the next square up. Five Ls make a square five wide.', add: { t: '5 × 5', v: 25 } },
      { who: 'pixel', say: 'And adding them up the long way…', add: { t: '1 + 3 + 5 + 7 + 9', v: 25 } },
      { who: 'panda', say: 'The first five odd numbers make five squared. Always.' },
    ] } },
  { id: 'subsets', title: 'How many subsets', formula: 'subsets of n things = 2ⁿ', topic: 'Algebra & number', band: '11-14', stops: ['subset-count'],
    picture: PIC.subsets, caption: 'Each thing is in or out: every new thing doubles the ways.',
    why: ['To make a subset, go through the things one at a time and decide: in, or out? Each thing doubles the number of ways, because every choice so far can go either way for the next thing.',
      'With n things that is 2 × 2 × … × 2, n times: 2ⁿ. The count includes the empty set (everything out) and the whole set (everything in).'],
    f: (n) => 2 ** n, example: { q: 'A set of 3 things: {a, b, c}.', args: [3], lines: ['2 × 2 × 2 = 8', '{ }, {a}, {b}, {c}, {a,b}, {a,c}, {b,c}, {a,b,c}: 8'], ans: 8, expr: '1+3+3+1' },
    gen(r) { const n = int(2, 9, r); return { text: `A set has ${n} things in it. How many subsets does it have, counting the empty set and the whole set?`, ans: this.f(n), expr: range(n, () => 2).join('*') }; },
    story: { title: 'Pizza toppings', scene: 'kitchen', cast: ['melody', 'koi'], beats: [
      { who: null, say: 'Nova’s pizza has 4 toppings to choose from. You can have any of them, all of them, or none. How many different pizzas is that?', add: { t: '2 × 2 × 2 × 2' } },
      { who: 'koi', say: 'Plain, cheese, cheese and olives… I will write a list.' },
      { who: 'melody', say: 'Take the toppings one at a time. Each is either on or off: two ways. Two toppings give…', add: { t: '2 × 2', v: 4 } },
      { who: 'koi', say: 'And every new topping doubles it. Four toppings:', add: { t: '2 × 2 × 2 × 2', v: 16 } },
      { who: 'melody', say: 'Sixteen pizzas — the plain one included.' },
    ] } },

  /* ------------------------------------------------ Money & rates */
  { id: 'fraction-of-amount', title: 'A fraction of an amount', formula: 'a/b of n = n ÷ b × a', topic: 'Money & rates', band: '8-10', stops: ['fraction-of-amount'],
    picture: PIC.fractionOf, caption: 'Cut into b equal parts, then take a of them.',
    why: ['The bottom number says how many equal parts to cut n into, so n ÷ b is the size of one part.',
      'The top number says how many of those parts you take, so multiply by a. 3/4 of 20: one quarter is 20 ÷ 4 = 5, and three quarters is 3 × 5 = 15.'],
    f: (a, b, n) => (n / b) * a, example: { q: '3/4 of 20.', args: [3, 4, 20], lines: ['20 ÷ 4 = 5', '5 × 3 = 15'], ans: 15, expr: '20*3/4' },
    gen(r) { const b = int(2, 10, r), a = int(1, b - 1, r), n = b * int(2, 12, r); return { text: `${a}/${b} of ${n}`, ans: this.f(a, b, n), expr: `${n}*${a}/${b}` }; },
    story: { title: 'The school trip', scene: 'bus', cast: ['koi', 'pixel'], beats: [
      { who: null, say: 'There are 32 seats on the school bus and 3/4 of them are full. How many children are on board?', add: { t: '32 ÷ 4 × 3' } },
      { who: 'pixel', say: 'Three quarters… I don’t know how to do quarters of seats.' },
      { who: 'koi', say: 'Cut the bus into 4 equal parts. How many seats in one part?', add: { t: '32 ÷ 4', v: 8 } },
      { who: 'pixel', say: 'Eight! And three of those parts are full.', add: { t: '8 × 3', v: 24 } },
      { who: 'koi', say: 'Twenty-four children. Divide by the bottom, times by the top.', add: { t: '32 ÷ 4 × 3', v: 24 } },
    ] } },
  { id: 'percent-of-amount', title: 'A percentage of an amount', formula: 'p% of x = x ÷ 100 × p', topic: 'Money & rates', band: '8-10', stops: ['percent-of-amount'],
    picture: PIC.percentOf, caption: '15% is 15 squares out of every 100.',
    why: ['Per cent means “out of every hundred”. Split the amount into 100 equal parts and each part is 1%: x ÷ 100. Then take p of those parts.',
      'Often it is quicker to find 10% (divide by 10) and build from it: 30% is three lots of 10%, 5% is half of 10%, 15% is 10% and 5% together.'],
    f: (p, x) => (x * p) / 100, example: { q: '15% of 80.', args: [15, 80], lines: ['10% = 8, 5% = 4', '15% = 8 + 4 = 12'], ans: 12, expr: '80/10+80/20' },
    gen(r) { const p = pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 75], r), x = 20 * int(1, 20, r); return { text: `${p}% of ${x}`, ans: this.f(p, x), expr: `${x}/10*${p}/10` }; },
    story: { title: 'The sale rail', scene: 'shop', cast: ['melody', 'comet'], beats: [
      { who: null, say: 'A jacket costs £60. The shop takes 15% off. How much is taken off?', add: { t: '15% of 60' } },
      { who: 'comet', say: 'Fifteen per cent… I need a calculator.' },
      { who: 'melody', say: 'Ten per cent is easy: divide by ten.', add: { t: '60 ÷ 10', v: 6 } },
      { who: 'melody', say: 'Five per cent is half of that.', add: { t: '6 ÷ 2', v: 3 } },
      { who: 'comet', say: 'So fifteen per cent is both together!', add: { t: '6 + 3', v: 9 } },
      { who: 'melody', say: 'Nine pounds off.', add: { t: '15% of 60', v: 9 } },
    ] } },
  { id: 'percent-change', title: 'Percentage change', formula: '% change = change ÷ original × 100', topic: 'Money & rates', band: '11-14', stops: ['percent-change'],
    picture: PIC.percentChange, caption: 'Compare the change with where it started.',
    why: ['A rise of 10 means a lot on a price of 20 and very little on a price of 1,000. So we compare the change with where it started: change ÷ original.',
      'That gives a fraction of the original; multiply by 100 to say it as a percentage. Always divide by the ORIGINAL amount, never the new one — the change is measured from the start.'],
    f: (o, n) => ((n - o) / o) * 100, example: { q: 'A price goes from £50 to £60.', args: [50, 60], lines: ['change: 60 − 50 = 10', '10 ÷ 50 × 100 = 20%'], ans: 20, expr: '(60/50-1)*100' },
    gen(r) {
      for (;;) {
        const o = pick([20, 25, 40, 50, 80, 100, 200, 250, 400, 500], r), p = pick([5, 10, 20, 25, 30, 40, 50, 60, 75], r), up = r() < 0.5;
        const nv = (o * (100 + (up ? p : -p))) / 100;
        if (Number.isInteger(nv)) return { text: `A price goes from £${o} to £${nv}. What is the percentage ${up ? 'rise' : 'fall'}?`, ans: p, expr: `Math.abs(${nv}-${o})/${o}*100` };
      }
    },
    story: { title: 'The sunflower', scene: 'garden', cast: ['melody', 'beaker'], beats: [
      { who: null, say: 'Rafi’s sunflower was 80 cm tall last week. Today it is 100 cm. By what percentage did it grow?', add: { t: '20 ÷ 80 × 100' } },
      { who: 'beaker', say: 'It grew 20 cm. So… 20 per cent?' },
      { who: 'melody', say: 'Twenty out of what? Compare the growth with where it started.', add: { t: '100 − 80', v: 20 } },
      { who: 'melody', say: 'Twenty out of eighty is a quarter.', add: { t: '20 ÷ 80', v: 0.25 } },
      { who: 'beaker', say: 'And a quarter is 25 per cent!', add: { t: '0.25 × 100', v: 25 } },
      { who: 'melody', say: 'Twenty-five per cent. Always divide by the start.', add: { t: '20 ÷ 80 × 100', v: 25 } },
    ] } },
  { id: 'simple-interest', title: 'Simple interest', formula: 'I = P × r × t ÷ 100', topic: 'Money & rates', band: '11-14', stops: ['interest-simple', 'percent-of-amount'],
    picture: PIC.simpleInterest, caption: 'The same block of interest is added every year.',
    why: ['Simple interest adds the same amount every year: r% of the starting money P. One year’s interest is P × r ÷ 100.',
      'After t years you have had t equal helpings, so I = P × r × t ÷ 100. (Many savings accounts use compound interest instead, where each year’s interest earns interest too, so they grow a little faster.)'],
    f: (P, r, t) => (P * r * t) / 100, example: { q: '£200 at 5% a year for 3 years.', args: [200, 5, 3], lines: ['one year: 5% of 200 = 10', 'I = 10 × 3 = £30'], ans: 30, expr: '(200*5/100)*3' },
    gen(r) { const P = pick([100, 200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000], r), rr = int(1, 8, r), t = int(1, 6, r); return { text: `Simple interest on £${P} at ${rr}% a year for ${t} years (in £)?`, ans: this.f(P, rr, t), expr: range(t, () => `${P}*${rr}/100`).join('+') }; },
    story: { title: 'The savings account', scene: 'city', cast: ['melody', 'koi'], beats: [
      { who: null, say: 'Nova’s aunt puts £300 in a savings account for her. It pays 4% simple interest a year. How much interest after 5 years?', add: { t: '300 × 4 × 5 ÷ 100' } },
      { who: 'koi', say: 'Does the interest get bigger every year?' },
      { who: 'melody', say: 'Not with simple interest. It is 4% of the £300 you started with, every single year.', add: { t: '4% of 300', v: 12 } },
      { who: 'koi', say: 'Twelve pounds a year, for five years.', add: { t: '12 × 5', v: 60 } },
      { who: 'melody', say: 'Sixty pounds. P times r times t, over a hundred.', add: { t: '300 × 4 × 5 ÷ 100', v: 60 } },
    ] } },
  { id: 'ratio-share', title: 'Sharing in a ratio', formula: 'a : b of x → x ÷ (a + b) × a', topic: 'Money & rates', band: '8-10', stops: ['ratio-share'],
    picture: PIC.ratioShare, caption: '2 : 3 means 5 equal parts; one share takes 2, the other 3.',
    why: ['A ratio of 2 : 3 means that for every 2 in one share there are 3 in the other — 5 equal parts in every group.',
      'So cut the whole amount into a + b equal parts. One part is x ÷ (a + b); one share gets a of them and the other gets b. Check: the two shares must add back to x.'],
    f: (x, a, b) => (x / (a + b)) * a, example: { q: '£40 shared in the ratio 3 : 5. The first share?', args: [40, 3, 5], lines: ['3 + 5 = 8 parts; 40 ÷ 8 = 5', '3 × 5 = £15 (and 5 × 5 = £25)'], ans: 15, expr: '40-40/8*5' },
    gen(r) {
      const a = int(1, 5, r); let b = int(1, 6, r); if (b === a) b = a + 1;
      const x = int(2, 15, r) * (a + b);
      return { text: `£${x} is shared in the ratio ${a} : ${b}. How much is the first share (in £)?`, ans: this.f(x, a, b), expr: `${x}-${x}/${a + b}*${b}` };
    },
    story: { title: 'Mixing green paint', scene: 'room', cast: ['beaker', 'panda'], beats: [
      { who: null, say: 'Suki is mixing green paint: blue and yellow in the ratio 2 : 3. She needs 20 litres of green.', add: { t: '20 ÷ 5 × 2' } },
      { who: 'beaker', say: 'Two and three. So 2 litres of blue and 3 of yellow… but that only makes 5.' },
      { who: 'panda', say: 'Right: every 5 litres has 2 blue and 3 yellow. How many lots of 5 in 20?', add: { t: '20 ÷ 5', v: 4 } },
      { who: 'beaker', say: 'Four lots. So blue is…', add: { t: '4 × 2', v: 8 } },
      { who: 'panda', say: 'And yellow is…', add: { t: '4 × 3', v: 12 } },
      { who: 'beaker', say: 'Eight and twelve. They add back to twenty — checked.', add: { t: '8 + 12', v: 20 } },
    ] } },
  { id: 'speed-distance-time', title: 'Speed, distance and time', formula: 'speed = distance ÷ time', topic: 'Money & rates', band: '11-14', stops: ['speed-distance-time'],
    picture: PIC.speed, caption: 'Cover the one you want; the other two tell you what to do.',
    why: ['Speed says how far you go in each hour (or each second). If a train goes 240 km in 3 hours at a steady speed, each hour carries it the same distance: 240 ÷ 3 = 80 km.',
      'The same fact turns round: distance = speed × time, and time = distance ÷ speed. Cover the one you want in the triangle — D on top, S and T below — and the other two tell you what to do.'],
    f: (d, t) => d / t, example: { q: '240 km in 3 hours.', args: [240, 3], lines: ['speed = 240 ÷ 3', '= 80 km/h'], ans: 80, expr: '240/6*2' },
    gen(r) {
      const s = 5 * int(2, 24, r), t = int(2, 6, r); let d = 0; for (let i = 0; i < t; i++) d += s;
      const k = int(0, 2, r);
      if (k === 0) return { text: `A car goes ${d} km in ${t} hours at a steady speed. Its speed (in km/h)?`, ans: this.f(d, t), expr: `${d}/${t}` };
      if (k === 1) return { text: `A train travels at ${s} km/h for ${t} hours. How far does it go (in km)?`, ans: d, expr: `${s}*${t}` };
      return { text: `A cyclist covers ${d} km at ${s} km/h. How many hours does it take?`, ans: t, expr: `${d}/${s}` };
    },
    story: { title: 'The train to the coast', scene: 'train', cast: ['scopey', 'comet'], beats: [
      { who: null, say: 'The train to the coast covers 180 km in 2 hours. Dax wants to know how fast it goes.', add: { t: '180 ÷ 2' } },
      { who: 'comet', say: 'The sign says 180! It goes 180 an hour!' },
      { who: 'scopey', say: 'The sign says 180 kilometres. That took 2 hours. Speed is how far in ONE hour.' },
      { who: 'scopey', say: 'Share the 180 km between the 2 hours.', add: { t: '180 ÷ 2', v: 90 } },
      { who: 'comet', say: 'Ninety kilometres in each hour. Distance divided by time.' },
    ] } },
  { id: 'density', title: 'Density', formula: 'density = mass ÷ volume', topic: 'Money & rates', band: '11-14', stops: ['speed-distance-time', 'volume-cuboid'],
    picture: PIC.density, caption: 'Same size, different mass in every cube: different density.',
    why: ['Density is a compound measure, like speed: it says how many grams are packed into each cubic centimetre. Share the mass equally over the volume: mass ÷ volume.',
      'A brick and a sponge of the same size have the same volume but very different masses, so very different densities. Like speed, it turns round: mass = density × volume.'],
    f: (m, v) => m / v, example: { q: 'A block of 600 g with a volume of 200 cm³.', args: [600, 200], lines: ['density = 600 ÷ 200', '= 3 g/cm³'], ans: 3, expr: '6/2' },
    gen(r) {
      const dn = int(1, 12, r), v = pick([10, 20, 25, 50, 100, 200], r), m = dn * v;
      if (r() < 0.5) return { text: `A block has a mass of ${m} g and a volume of ${v} cm³. Its density (in g/cm³)?`, ans: this.f(m, v), expr: `${m}/${v}` };
      return { text: `A metal has a density of ${dn} g/cm³. What is the mass of ${v} cm³ of it (in g)?`, ans: m, expr: `${v}*${dn}` };
    },
    story: { title: 'The mystery stone', scene: 'beach', cast: ['scopey', 'astro'], beats: [
      { who: null, say: 'Theo finds a smooth stone on the beach. It has a mass of 270 g. Dropped into a measuring jug, it pushes the water up by 100 cm³.', add: { t: '270 ÷ 100' } },
      { who: 'astro', say: 'So its volume is 100 cubic centimetres.' },
      { who: 'scopey', say: 'Density is grams in each cubic centimetre. Share the 270 grams over the 100 cubes.', add: { t: '270 ÷ 100', v: 2.7 } },
      { who: 'astro', say: 'Two point seven grams in every cubic centimetre.' },
      { who: 'scopey', say: 'Water is 1 gram in each. The stone is heavier for its size, so no wonder it sank.' },
    ] } },

  /* ------------------------------------------------ Data & chance */
  { id: 'mean', title: 'The mean', formula: 'mean = total ÷ how many', topic: 'Data & chance', band: '8-10', stops: ['mean-fair-share'],
    picture: PIC.mean, caption: 'Tall bars give to short ones until every bar is level.',
    why: ['The mean asks: if everything were shared out fairly, how much would each get? Put all the values together into one pile — that is the total.',
      'Then share the pile equally between all of them: total ÷ how many. Tall bars give some to short bars until every bar is the same height; that height is the mean.'],
    f: (...v) => v.reduce((a, b) => a + b, 0) / v.length, example: { q: 'The mean of 4, 7 and 10.', args: [4, 7, 10], lines: ['4 + 7 + 10 = 21', '21 ÷ 3 = 7'], ans: 7, expr: '(4+10)/2' },
    gen(r) {
      for (;;) {
        const n = int(3, 6, r), m = int(4, 20, r), dev = range(n - 1, () => pick([-3, -2, -1, 1, 2, 3], r)), last = -dev.reduce((a, b) => a + b, 0);
        if (last === 0 || Math.abs(last) >= m) continue;
        const vals = [...dev, last].map((d) => m + d);
        return { text: `The mean of ${vals.join(', ')}?`, ans: m, expr: `(${vals.join('+')})/${n}` };
      }
    },
    story: { title: 'Sharing the sweets', scene: 'festival', cast: ['koi', 'panda'], beats: [
      { who: null, say: 'At the festival Nova collects 9 sweets, Suki 4 and their friend 8. They agree to share them out fairly.', add: { t: '(9 + 4 + 8) ÷ 3' } },
      { who: 'koi', say: 'Put them all in one bowl first.', add: { t: '9 + 4 + 8', v: 21 } },
      { who: 'panda', say: 'Now share the bowl between the three of us.', add: { t: '21 ÷ 3', v: 7 } },
      { who: 'panda', say: 'Nova gives 2, our friend gives 1, and I get those 3. Fair.', add: { t: '2 + 1', v: 3 } },
      { who: 'koi', say: 'Seven each. The mean is the fair share.', add: { t: '(9 + 4 + 8) ÷ 3', v: 7 } },
    ] } },
  { id: 'range', title: 'The range', formula: 'range = biggest − smallest', topic: 'Data & chance', band: '8-10', stops: ['data-range'],
    picture: PIC.range, caption: 'Only the two ends matter.',
    why: ['The range tells you how spread out the data is: the distance from the smallest value to the biggest.',
      'Only the two ends matter, so hunt for the biggest and the smallest and take one from the other. A big range means the values are spread wide; a small one means they bunch together.'],
    f: (...v) => Math.max(...v) - Math.min(...v), example: { q: 'The range of 12, 5, 19 and 8.', args: [12, 5, 19, 8], lines: ['biggest 19, smallest 5', '19 − 5 = 14'], ans: 14, expr: '[12,5,19,8].sort((a,b)=>b-a)[0]-[12,5,19,8].sort((a,b)=>a-b)[0]' },
    gen(r) {
      const n = int(4, 7, r), s = new Set(); while (s.size < n) s.add(int(1, 60, r));
      const v = [...s];
      return { text: `The range of ${v.join(', ')}?`, ans: this.f(...v), expr: `[${v}].sort((a,b)=>b-a)[0]-[${v}].sort((a,b)=>a-b)[0]` };
    },
    story: { title: 'The long jump', scene: 'stadium', cast: ['comet', 'panda'], beats: [
      { who: null, say: 'Dax’s long jumps at sports day: 310 cm, 285 cm, 342 cm and 298 cm. How spread out are they?', add: { t: '342 − 285' } },
      { who: 'comet', say: 'My best was 342! That is all that matters.' },
      { who: 'panda', say: 'Your shortest matters too. The range is the best take away the shortest.' },
      { who: 'comet', say: 'Shortest was 285…', add: { t: '342 − 285', v: 57 } },
      { who: 'panda', say: 'Fifty-seven centimetres between them. A smaller range would mean steadier jumps.' },
    ] } },
  { id: 'probability', title: 'Probability', formula: 'P = ways it can happen ÷ all the ways', topic: 'Data & chance', band: '8-10', stops: ['chance-fraction', 'list-outcomes'],
    picture: PIC.probability, caption: 'Count what you want, over everything that could happen.',
    why: ['When every outcome is equally likely, count them all: that is the bottom of the fraction. Count the ones you want: that is the top.',
      'A bag with 3 red and 5 blue counters has 8 counters, so the chance of red is 3/8. The chances of everything that could happen always add up to 1 — here 3/8 + 5/8 = 1.'],
    f: (k, n) => k / n, example: { q: 'A bag of 3 red and 5 blue counters. The chance of red?', args: [3, 8], lines: ['all the ways: 3 + 5 = 8', 'P(red) = 3/8'], ans: '3/8', expr: '1-5/8' },
    gen(r) { const rd = int(1, 9, r), bl = int(1, 9, r); return { text: `A bag has ${rd} red and ${bl} blue counters. You pick one without looking. The chance it is red, as a fraction?`, ans: `${rd}/${rd + bl}`, frac: true, keys: ['/'], expr: `1-${bl}/${rd + bl}` }; },
    story: { title: 'The raffle', scene: 'carnival', cast: ['melody', 'pixel'], beats: [
      { who: null, say: 'The carnival raffle sold 50 tickets. Pip bought 5 of them. What is his chance of winning the prize?', add: { t: '5 ÷ 50' } },
      { who: 'pixel', say: 'Either I win or I don’t. So it’s fifty-fifty!' },
      { who: 'melody', say: 'Two outcomes, but not equally likely. Every TICKET is equally likely to be drawn, and there are 50.' },
      { who: 'melody', say: 'Five of them are yours: 5 out of 50.', add: { t: '5 ÷ 50', v: 0.1 } },
      { who: 'pixel', say: 'One in ten. Not fifty-fifty at all.', add: { t: '1 ÷ 10', v: 0.1 } },
    ] } },
  { id: 'factorial', title: 'Factorials', formula: 'n! = n × (n − 1) × … × 2 × 1, and 0! = 1', topic: 'Data & chance', band: '11-14', stops: ['factorials', 'arrange-all'],
    picture: () => {
      const rows = [['4!', '4 × 3 × 2 × 1', '24'], ['3!', '3 × 2 × 1', '6'], ['2!', '2 × 1', '2'], ['1!', '1', '1'], ['0!', '', '1']];
      let s = '';
      rows.forEach(([a, b, c], i) => {
        const y = 8 + i * 38;
        s += R(8, y, 210, 28, i === 4 ? 'dg-fill2' : 'dg-blank', 'rx="6"') + T(34, y + 19, a, 'dg-accent') + T(118, y + 19, b, 'dg-small') + T(196, y + 19, c, 'dg-text');
        if (i < 4) s += T(228, y + 34, `÷ ${4 - i}`, 'dg-small', 'start');
      });
      return S(270, 200, s, 'The factorials walked downwards, dividing by 4, 3, 2 and 1: the last step gives 0! = 1');
    },
    caption: 'Each step down divides by one less. The last step, ÷ 1, leaves 0! = 1.',
    why: ['n! counts the ways to put n different things in a row: n choices for the first place, n − 1 for the second, and so on down to 1 choice for the last. 4 books on a shelf can go in 4 × 3 × 2 × 1 = 24 orders.',
      'Every factorial holds the one below it — n! = n × (n − 1)! — so walking down the pattern means dividing: 4! ÷ 4 = 3!, and so on. One step past 1! is 1! ÷ 1 = 0!, which is why 0! = 1. It also cancels: 8! ÷ 6! = 8 × 7.'],
    f: (n) => range(n, (i) => i + 1).reduce((a, b) => a * b, 1),
    example: { q: 'How many ways can 5 friends stand in a line?', args: [5], lines: ['5 choices, then 4, then 3, then 2, then 1', '5! = 5 × 4 × 3 × 2 × 1 = 120'], ans: 120, expr: '(((1*2)*3)*4)*5' },
    gen(r) {
      if (r() < 0.4) { const n = int(6, 12, r), m = n - 2; return { text: `${n}! ÷ ${m}!`, ans: n * (n - 1), expr: `${this.f(n)}/${this.f(m)}` }; }
      const n = int(3, 8, r); return { text: `${n}!`, ans: this.f(n), expr: range(n, (i) => n - i).join('*') };
    },
    story: { title: 'Books on the shelf', scene: 'library', cast: ['beaker', 'koi'], beats: [
      { who: null, say: 'Rafi has 4 new books for his shelf. He wants to try every different order before he chooses one.', add: { t: '4 × 3 × 2 × 1' } },
      { who: 'koi', say: 'Any of the 4 can go at the left end. Then any of the 3 left next to it.', add: { t: '4 × 3', v: 12 } },
      { who: 'beaker', say: 'Then 2 choices, and the last book goes where it must.', add: { t: '12 × 2 × 1', v: 24 } },
      { who: 'koi', say: 'That is 4 factorial. A fifth book would make 5 times as many orders.', add: { t: '24 × 5', v: 120 } },
      { who: 'beaker', say: 'Then I will stop at 4 books. Twenty-four orders is plenty.', add: { t: '4 × 3 × 2 × 1', v: 24 } },
    ] } },
  { id: 'combinations', title: 'Permutations and combinations', formula: 'ⁿPᵣ = n! ÷ (n − r)!  ·  ⁿCᵣ = n! ÷ (r! × (n − r)!)', topic: 'Data & chance', band: '11-14', stops: ['permutations', 'combinations'],
    picture: () => {
      const orders = ['ABC', 'ACB', 'BAC', 'BCA', 'CAB', 'CBA'];
      let s = '';
      orders.forEach((o, i) => { const y = 10 + i * 26; s += R(10, y, 64, 22, 'dg-fill1', 'rx="5"') + T(42, y + 16, o, 'dg-text') + L(78, y + 11, 150, 88, 'dg-thin'); });
      s += `<circle cx="196" cy="88" r="42" class="dg-fill2"/>` + T(196, 84, 'A, B, C', 'dg-text') + T(196, 102, 'one team', 'dg-small');
      s += T(42, 180, '3! = 6 orders', 'dg-small');
      return S(250, 190, s, 'Six orders of A, B and C all make the same one team');
    },
    caption: 'In order, one team of 3 is counted 3! = 6 times. Divide by 3! to count teams.',
    why: ['When order matters — gold, silver, bronze — fill the places one at a time: n choices, then n − 1, for r places. That is ⁿPᵣ = n × (n − 1) × … (r numbers), which is n! with the tail (n − r)! cancelled off.',
      'When order does not matter — a team, a handful of toppings — every group of r was counted once for each of its r! orders. So divide: ⁿCᵣ = ⁿPᵣ ÷ r!. A team of 3 from 7 is 7 × 6 × 5 = 210 in order, and 210 ÷ 6 = 35 teams.'],
    f: (n, k) => range(k, (i) => n - i).reduce((a, b) => a * b, 1) / range(k, (i) => i + 1).reduce((a, b) => a * b, 1),
    example: { q: 'A team of 3 from 7 players.', args: [7, 3], lines: ['in order: 7 × 6 × 5 = 210', 'each team is counted 3! = 6 times', '210 ÷ 6 = 35'], ans: 35, expr: '[1,6,15,20,15,6,1].map((v,i,a)=>v+(i?a[i-1]:0))[3]' },
    gen(r) {
      const pascal = (n, k) => `((n,k)=>{let row=[1];for(let i=0;i<n;i++)row=[...row,0].map((v,j)=>v+(j?row[j-1]:0));return row[k];})(${n},${k})`;
      if (r() < 0.5) { const n = int(5, 10, r), k = int(2, 3, r), what = k === 2 ? 'a captain and a vice-captain' : 'gold, silver and bronze';
        return { text: `${n} in the final. How many ways to choose ${what}?`, ans: range(k, (i) => n - i).reduce((a, b) => a * b, 1), expr: `${pascal(n, k)}*${k === 2 ? 2 : 6}` }; }
      const n = int(5, 12, r), k = int(2, 4, r);
      return { text: `How many different teams of ${k} can be chosen from ${n} players?`, ans: this.f(n, k), expr: pascal(n, k) };
    },
    story: { title: 'Cone or cup?', scene: 'shop', cast: ['melody', 'scopey'], beats: [
      { who: null, say: 'The ice-cream shop has 5 flavours. Theo wants 2 different scoops stacked on a cone; Ines wants 2 in a cup.' },
      { who: 'scopey', say: 'On a cone the top scoop and the bottom scoop are different places: 5 choices, then 4.', add: { t: '5 × 4', v: 20 } },
      { who: 'melody', say: 'In a cup there is no top. Mint with lemon is the same cup as lemon with mint.' },
      { who: 'scopey', say: 'So every cup was counted twice in my 20.', add: { t: '20 ÷ 2', v: 10 } },
      { who: 'melody', say: 'Twenty cones, ten cups. Order matters on a cone, not in a cup.', add: { t: '5 × 4 ÷ 2', v: 10 } },
    ] } },
];
export const byId = Object.fromEntries(CARDS.map((c) => [c.id, c]));

/* ------------------------------------------------------------- quiz */

const leaks = (q) => !q.choices && String(q.ans).length > 1 && q.text.split(/[^0-9./]/).includes(String(q.ans));

/* One quiz question from a card, fresh numbers, never showing its own answer. */
export function quizQ(card, r = rnd) {
  let q = card.gen(r);
  for (let t = 0; t < 60 && leaks(q); t++) q = card.gen(r);
  const out = { ...q, html: `<p class="muted mono">${esc(card.formula)}</p>` };
  if (typeof q.ans === 'number' && !Number.isInteger(q.ans)) { out.keys = ['.']; out.decimals = true; }
  return out;
}
export const quiz = (card, r = rnd) => range(5, () => quizQ(card, r));

/* ------------------------------------------------------------- view */

const bandName = { '6-7': 'Ages 6–7', '8-10': 'Ages 8–10', '11-14': 'Ages 11–14' };
const stopTitle = Object.fromEntries(TRICKS.map((t) => [t.id, t.title]));
const rival = Object.fromEntries(RIVALS.map((b) => [b.id, b]));
const av = (id, size) => `<img class="av" src="avatars/${esc(id)}.webp" width="${size}" height="${size}" alt="" loading="lazy" decoding="async">`;
const got = (ctx, id) => !!(ctx.data.collected && ctx.data.collected[id]);
const count = (ctx) => CARDS.filter((c) => got(ctx, c.id)).length;

export function view(ctx) {
  const ui = ctx.ui, card = ui.card && byId[ui.card];
  return `<div class="t-formulas">${card ? cardView(card, ctx) : album(ctx)}</div>`;
}

function album(ctx) {
  const ui = ctx.ui, n = count(ctx), topic = ui.topic && TOPICS.includes(ui.topic) ? ui.topic : null;
  const pct = Math.round((n / CARDS.length) * 100);
  return `<div class="t-formulas-tools">
      <label class="t-formulas-pick"><span class="t-formulas-sr">Topic</span><select id="t-formulas-topic" data-lib-input="topic">
        <option value=""${topic ? '' : ' selected'}>All topics</option>
        ${TOPICS.map((t) => `<option value="${esc(t)}"${topic === t ? ' selected' : ''}>${esc(t)}</option>`).join('')}
      </select></label>
      <span class="t-formulas-got"><span class="t-formulas-count">★ <b class="mono">${n}</b> of <b class="mono">${CARDS.length}</b> collected</span>
        <span class="t-formulas-bar" role="progressbar" aria-label="Cards collected" aria-valuemin="0" aria-valuemax="${CARDS.length}" aria-valuenow="${n}"><i style="width:${pct}%"></i></span></span>
    </div>
    ${TOPICS.filter((t) => !topic || t === topic).map((t) => {
      const cs = CARDS.filter((c) => c.topic === t), k = cs.filter((c) => got(ctx, c.id)).length;
      return `<h3 class="t-formulas-th">${esc(t)} <span class="mono">${k}/${cs.length}</span></h3>
      <div class="t-formulas-grid">${cs.map((c) => tile(c, got(ctx, c.id))).join('')}</div>`;
    }).join('')}
    <p class="muted small t-formulas-how">Open a card and read its story to the last line — then it is yours. Locked cards show as silhouettes.</p>`;
}

function tile(c, have) {
  return `<button class="t-formulas-tile ${have ? 'got' : 'locked'}" data-act="lib" data-arg="open|${c.id}" aria-label="${esc(c.title)}${have ? ', collected' : ', not collected yet'}">
    <span class="t-formulas-tpic" aria-hidden="true">${c.picture()}</span>
    <span class="t-formulas-tf mono">${have ? esc(c.formula) : esc(c.formula.replace(/[^\s]/g, '•'))}</span>
    <span class="t-formulas-tt">${esc(c.title)}</span>
    <span class="t-formulas-tag">${have ? `${icon('star', 13)} Collected` : `${icon('lock', 13)} Read its story`}</span>
  </button>`;
}

function cardView(c, ctx) {
  const ui = ctx.ui, i = CARDS.indexOf(c), have = got(ctx, c.id), tab = ui.tab === 'story' ? 'story' : 'card';
  const prev = CARDS[(i - 1 + CARDS.length) % CARDS.length], next = CARDS[(i + 1) % CARDS.length];
  const best = ctx.data.best && ctx.data.best[c.id];
  const nav = `<div class="t-formulas-nav">
      <button class="btn small" data-act="lib" data-arg="album">← Album <kbd>Esc</kbd></button>
      <span class="t-formulas-pos mono">Card ${i + 1} of ${CARDS.length}</span>
      <span class="t-formulas-navr">
        <button class="btn small ghost" data-act="lib" data-arg="open|${prev.id}" aria-label="Previous card: ${esc(prev.title)}">‹</button>
        <button class="btn small ghost" data-act="lib" data-arg="open|${next.id}" aria-label="Next card: ${esc(next.title)}">›</button>
      </span>
    </div>
    <div class="seg" role="tablist" aria-label="This card">
      <button class="${tab === 'card' ? 'on' : ''}" role="tab" aria-selected="${tab === 'card'}" data-act="lib" data-arg="tab|card">The card</button>
      <button class="${tab === 'story' ? 'on' : ''}" role="tab" aria-selected="${tab === 'story'}" data-act="lib" data-arg="tab|story">${icon('book', 16)} The story${have ? ` ${icon('check', 14)}` : ''}</button>
    </div>`;
  if (tab === 'story') return nav + stage(c, ctx);
  return `${nav}
    <article class="card t-formulas-card ${have ? 'got' : 'locked'}">
      <div class="t-formulas-chips">
        <span class="chip">${esc(c.topic)}</span><span class="chip">${esc(bandName[c.band])}</span>${c.note ? `<span class="chip gold">${esc(c.note)}</span>` : ''}
        ${have ? `<span class="chip gold">${icon('star', 14)} Collected</span>` : `<span class="chip">${icon('lock', 14)} Read the story to collect</span>`}
        ${best != null ? `<span class="chip">Best quiz: ${best} of 5</span>` : ''}
      </div>
      <h2 class="t-formulas-title">${esc(c.title)}</h2>
      <p class="t-formulas-formula mono" aria-label="The formula">${esc(c.formula)}</p>
      <div class="t-formulas-two">
        <figure class="t-formulas-pic">${c.picture()}<figcaption>${esc(c.caption)}</figcaption></figure>
        <div class="t-formulas-why"><p class="kicker">Why it is true</p>${c.why.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
      </div>
      <div class="t-formulas-ex">
        <p class="kicker">Worked example</p>
        <p class="t-formulas-exq">${esc(c.example.q)}</p>
        <ol class="t-formulas-lines">${c.example.lines.map((l) => `<li class="mono">${esc(l)}</li>`).join('')}</ol>
      </div>
      <div class="t-formulas-stops"><p class="kicker">Learn it in the Atlas</p>
        <div class="row gap">${c.stops.map((s) => `<button class="btn small" data-act="lib" data-arg="stop|${s}">${icon('pin', 16)} ${esc(stopTitle[s] || s)}</button>`).join('')}</div>
      </div>
      ${c.sources ? `<details class="t-formulas-src"><summary>Sources</summary><ul>${c.sources.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></details>` : ''}
      <div class="row gap t-formulas-act">
        <button class="btn ${have ? '' : 'primary'}" data-act="lib" data-arg="tab|story">${icon('book', 16)} ${have ? 'Read the story again' : 'Read the story to collect it'}</button>
        <button class="btn ${have ? 'primary' : ''}" data-act="lib" data-arg="quiz">Quiz me on this card</button>
      </div>
    </article>`;
}

function stage(c, ctx) {
  const s = c.story, i = Math.min(ctx.ui.beat || 0, s.beats.length - 1), b = s.beats[i], last = i === s.beats.length - 1;
  const lines = s.beats.slice(0, i + 1).filter((x) => x.add).map((x) => x.add);
  const side = b.who ? (s.cast.indexOf(b.who) === 0 ? 'l' : 'r') : 'n';
  return `<div class="story t-formulas-story" data-act="lib" data-arg="next" role="group" aria-label="A story: ${esc(s.title)}">
    <img class="st-bg" src="art/s-${esc(s.scene)}.webp" alt="" width="1280" height="720">
    <div class="st-top"><span class="badge-story">${icon('book', 14)} A story</span><b>${esc(s.title)}</b></div>
    <div class="st-cast">${s.cast.map((id, ci) => `<figure class="actor ${ci ? 'r' : 'l'}${b.who === id ? ' talk' : ''}${b.who && b.who !== id ? ' quiet' : ''}">${av(id, 150)}<figcaption>${esc(rival[id].name)}</figcaption></figure>`).join('')}</div>
    <div class="bubble ${side}" aria-live="polite">${b.who ? `<b>${esc(rival[b.who].name)}</b>` : ''}${esc(b.say)}</div>
    ${lines.length ? `<div class="notepad" aria-label="Notepad">${lines.map((l, li) => `<p class="${li === lines.length - 1 && b.add ? 'new' : ''}"><span class="mono">${esc(l.t)}</span><b class="mono">= ${l.v !== undefined ? esc(l.v) : '?'}</b></p>`).join('')}</div>` : ''}
  </div>
  <div class="st-ctl">
    <button class="btn" data-act="lib" data-arg="back" ${i ? '' : 'disabled'} aria-label="Back a line">← <kbd>←</kbd></button>
    <span class="st-dots">${s.beats.map((_, j) => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}</span>
    ${last ? `<span class="chip gold t-formulas-won">★ Card collected</span><button class="btn primary" data-act="lib" data-arg="tab|card">See the card →</button><button class="btn" data-act="lib" data-arg="quiz">Quiz me</button>`
      : '<button class="btn primary" data-act="lib" data-arg="next">Next <kbd>→</kbd></button>'}
    <button class="tog-read${ctx.ui.read ? ' on' : ''}" data-act="lib" data-arg="read" aria-pressed="${!!ctx.ui.read}">${icon('speaker', 16)} Read it to me</button>
  </div>`;
}

/* ------------------------------------------------------------- actions */

function collect(c, ctx) {
  const d = ctx.data; d.collected = d.collected || {};
  if (d.collected[c.id]) return;
  d.collected[c.id] = true; ctx.save();
  ctx.sfx.level(); ctx.confetti(40);
  ctx.toast(`Card collected: ${c.title} — ${count(ctx)} of ${CARDS.length}`);
}
function sayBeat(c, ctx) { if (ctx.ui.read) { const b = c.story.beats[ctx.ui.beat || 0]; ctx.say(b.say); } }

export function act(name, arg, ctx) {
  const ui = ctx.ui, c = ui.card && byId[ui.card];
  if (name === 'open' && byId[arg]) { ui.card = arg; ui.tab = 'card'; ui.beat = 0; ctx.sfx.click(); }
  else if (name === 'album') { ui.card = null; ui.beat = 0; }
  else if (name === 'topic') ui.topic = TOPICS.includes(arg) ? arg : null;
  else if (name === 'tab' && c) { ui.tab = arg === 'story' ? 'story' : 'card'; if (ui.tab === 'story') { ui.beat = 0; sayBeat(c, ctx); } }
  else if (name === 'next' && c) {
    const n = c.story.beats.length, i = ui.beat || 0;
    if (ui.tab !== 'story') { ui.tab = 'story'; ui.beat = 0; return; }
    if (i < n - 1) { ui.beat = i + 1; ctx.sfx.click(); sayBeat(c, ctx); if (ui.beat === n - 1) collect(c, ctx); }
  }
  else if (name === 'back' && c) { if ((ui.beat || 0) > 0) { ui.beat--; sayBeat(c, ctx); } }
  else if (name === 'read') { ui.read = !ui.read; if (c && ui.tab === 'story') sayBeat(c, ctx); }
  else if (name === 'quiz' && c) ctx.startRun(`Quiz: ${c.title}`, quiz(c), { card: c.id });
  else if (name === 'stop') ctx.openStop(arg);
}

export function key(e, ctx) {
  const ui = ctx.ui, c = ui.card && byId[ui.card];
  if (!c) return false;
  if (e.key === 'Escape') { act('album', '', ctx); return true; }
  if (ui.tab === 'story') {
    if (e.key === 'ArrowRight' || e.key === ' ') { act('next', '', ctx); return true; }
    if (e.key === 'ArrowLeft') { act('back', '', ctx); return true; }
    return false;
  }
  const i = CARDS.indexOf(c);
  if (e.key === 'ArrowRight') { act('open', CARDS[(i + 1) % CARDS.length].id, ctx); return true; }
  if (e.key === 'ArrowLeft') { act('open', CARDS[(i - 1 + CARDS.length) % CARDS.length].id, ctx); return true; }
  return false;
}

export function done(run, ctx) {
  const c = byId[run.card]; if (!c) return null;
  const n = run.results.length, right = run.results.filter((r) => r.right).length;
  const best = ctx.data.best || (ctx.data.best = {});
  best[c.id] = Math.max(best[c.id] || 0, right); ctx.save();
  const stars = right === n ? 3 : right >= n - 1 ? 2 : right >= Math.ceil(n / 2) ? 1 : 0;
  return { stars, lines: [`<span class="mono">${esc(c.formula)}</span>`,
    right === n ? 'Every one. That formula is yours now.' : 'Read the card’s “why” again, then try five more — the numbers change every time.'] };
}

/* ------------------------------------------------------------- styles */

export const CSS = `
.t-formulas{display:flex;flex-direction:column;gap:8px}
.t-formulas-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.t-formulas-pick select{width:100%;font:inherit;font-weight:650;padding:6px 14px;cursor:pointer;border-radius:var(--r-pill);border:1.5px solid var(--line);background:var(--surface);color:var(--ink);box-shadow:var(--sh)}
.t-formulas-tools{display:flex;align-items:center;flex-wrap:wrap;gap:8px 16px}
.t-formulas-pick{flex:0 1 260px;min-width:180px}
.t-formulas-got{display:inline-flex;align-items:center;gap:10px;margin-left:auto}
.t-formulas-got .t-formulas-count{font-size:.9rem;font-weight:700;color:var(--ink);white-space:nowrap}
.t-formulas-count b{color:var(--treasure-deep)}
.t-formulas-bar{display:block;width:90px;height:8px;border-radius:var(--r-pill);background:color-mix(in srgb,var(--ink) 15%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ink) 22%,transparent);overflow:hidden}
.t-formulas-how{margin:0;text-align:center}
.t-formulas-bar i{display:block;height:100%;background:var(--treasure);border-radius:inherit}
.t-formulas-th{font-family:var(--display);font-size:1.15rem;line-height:1.3;margin:0 0 -2px;display:flex;align-items:baseline;gap:10px}
.t-formulas-th span{font-size:var(--fs-label);color:var(--muted)}
.t-formulas-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px}
@media (max-width:520px){.t-formulas-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.t-formulas-tpic{height:80px}.t-formulas-tpic svg{max-height:76px}.t-formulas-tt{font-size:15px}}
.t-formulas-tile{display:flex;flex-direction:column;align-items:stretch;gap:6px;text-align:left;border:1.5px solid var(--line);border-radius:var(--r-lg);background:var(--surface);color:var(--ink);padding:12px;cursor:pointer;box-shadow:var(--sh);transition:transform .15s,border-color .15s}
.t-formulas-tile:hover{transform:translateY(-2px);border-color:var(--action)}
.t-formulas-tile.got{border-color:var(--treasure);background:linear-gradient(180deg,var(--treasure-tint),var(--surface) 55%)}
.t-formulas-tpic{height:104px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.t-formulas-tpic svg{max-height:100px;width:auto;max-width:100%;margin:0}
/* the pictures wear the world's own colours (owner, 3 Oct 2026: "monochrome"): every fill is mixed from the
   theme's tokens over its surface, so a picture reads in light and dark and in all six worlds, and the three
   fills stay three different colours — the maths in these pictures is "this part matches that part". */
:is(.t-formulas-tpic,.t-formulas-pic) svg{--dg1:color-mix(in srgb,var(--action) 38%,var(--surface));--dg2:color-mix(in srgb,var(--treasure) 46%,var(--surface));--dg3:color-mix(in srgb,var(--mastered) 40%,var(--surface));--dgk:var(--sw2,var(--fix))}
:root :is(.t-formulas-tpic,.t-formulas-pic) .dg-fill1{fill:var(--dg1)}
:root :is(.t-formulas-tpic,.t-formulas-pic) .dg-fill2{fill:var(--dg2)}
:root :is(.t-formulas-tpic,.t-formulas-pic) .dg-fill3{fill:var(--dg3)}
:root :is(.t-formulas-tpic,.t-formulas-pic) .dg-blank{fill:var(--surface)}
:root :is(.t-formulas-tpic,.t-formulas-pic) :is(.dg-accent,.dg-sym){fill:var(--dgk)}
:root :is(.t-formulas-tpic,.t-formulas-pic) .dg-arc{stroke:var(--dgk)}
:root :is(.t-formulas-tpic,.t-formulas-pic) .dg-hand2{stroke:var(--action)}
:root :is(.t-formulas-tpic,.t-formulas-pic) .dg-dot{fill:var(--action)}
:root :is(.t-formulas-tpic,.t-formulas-pic) .dg-dot2{fill:var(--treasure)}
/* a locked card is a silhouette in the world's colour — one tint, no labels to read — never grey on grey */
.t-formulas-tile.locked .t-formulas-tpic svg{--dg1:color-mix(in srgb,var(--action) 22%,var(--surface));--dg2:var(--dg1);--dg3:var(--dg1);--dgk:transparent}
:root .t-formulas-tile.locked .t-formulas-tpic :is(.dg-fill1,.dg-fill2,.dg-fill3,.dg-blank){fill:var(--dg1);stroke:color-mix(in srgb,var(--action) 55%,var(--surface))}
:root .t-formulas-tile.locked .t-formulas-tpic :is(.dg-line,.dg-thin,.dg-hand2,.dg-arc){stroke:color-mix(in srgb,var(--action) 55%,var(--surface))}
:root .t-formulas-tile.locked .t-formulas-tpic :is(.dg-dot,.dg-dot2){fill:color-mix(in srgb,var(--action) 45%,var(--surface))}
.t-formulas-tile.locked .t-formulas-tpic text{display:none}
.t-formulas-tf{font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.t-formulas-tile.locked .t-formulas-tf{color:var(--line);letter-spacing:-.05em}
.t-formulas-tt{font-family:var(--display);font-size:17px;line-height:1.2}
.t-formulas-tag{font-size:var(--fs-meta);font-weight:700;color:var(--muted)}
.t-formulas-tile.got .t-formulas-tag{color:var(--treasure-deep)}
.t-formulas-nav{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.t-formulas-pos{color:var(--muted);font-size:var(--fs-label)}
.t-formulas-navr{margin-left:auto;display:flex;gap:4px}
.t-formulas-card.got{border-top:4px solid var(--treasure)}
.t-formulas-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
.t-formulas-title{font-family:var(--display);font-size:var(--fs-h1);margin:4px 0 6px}
.t-formulas-formula{font-size:clamp(24px,4.4vw,36px);font-weight:700;margin:0 0 16px;padding:14px 18px;border-radius:var(--r-md);background:var(--action-tint);color:var(--action);text-align:center;overflow-x:auto;white-space:nowrap}
.t-formulas-two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:18px;align-items:start}
@media (max-width:760px){.t-formulas-two{grid-template-columns:1fr}}
.t-formulas-pic{margin:0;background:var(--surface2);border-radius:var(--r-md);padding:12px}
.t-formulas-pic figcaption{font-size:var(--fs-label);color:var(--muted);text-align:center}
.t-formulas-why p{line-height:1.6;margin:0 0 10px}
.t-formulas-ex{margin-top:14px;background:var(--surface2);border-left:4px solid var(--treasure);border-radius:var(--r-sm);padding:12px 16px}
.t-formulas-exq{margin:0 0 6px;font-weight:650}
.t-formulas-lines{margin:0;padding-left:22px}
.t-formulas-lines li{font-size:var(--fs-lead);line-height:1.7}
.t-formulas-lines li:last-child{font-weight:800;color:var(--mastered)}
.t-formulas-stops{margin-top:14px}
.t-formulas-src{margin-top:12px;color:var(--muted);font-size:var(--fs-label)}
.t-formulas-act{margin-top:16px;flex-wrap:wrap}
.t-formulas-won{font-size:var(--fs-label)}
@media (max-width:520px){.t-formulas-pick{flex:1 1 150px;min-width:0}.t-formulas-bar{display:none}}
`;

/* ------------------------------------------------------------- selftest */

export function selftest(ok, makeCtx) {
  const stopIds = new Set(TRICKS.map((t) => t.id)), rivals = new Set(RIVALS.map((b) => b.id));
  const num = (x) => (typeof x === 'number' ? x : parseNum(x));
  const plain = (e) => Function(`return (${e})`)();
  ok(CARDS.length >= 30 && CARDS.length <= 40, `formulas: ${CARDS.length} cards, want 30–40`);
  ok(new Set(CARDS.map((c) => c.id)).size === CARDS.length, 'formulas: card ids are unique');
  for (const t of TOPICS) ok(CARDS.some((c) => c.topic === t), `formulas: topic ${t} has no cards`);
  const r = seeded('formulas-selftest');
  for (const c of CARDS) {
    const id = `formulas/${c.id}`;
    ok(c.title && c.formula && TOPICS.includes(c.topic) && bandName[c.band], `${id}: title, formula, topic and band`);
    const pic = c.picture();
    ok(typeof pic === 'string' && pic.startsWith('<svg') && !/undefined|NaN/.test(pic), `${id}: picture is clean SVG`);
    ok(c.caption, `${id}: picture needs a caption`);
    ok(Array.isArray(c.why) && c.why.length === 2 && c.why.every((p) => p.length > 60), `${id}: why is two real paragraphs`);
    ok(c.stops.length >= 1 && c.stops.every((s) => stopIds.has(s)), `${id}: stops must be real Atlas stops (${c.stops})`);
    if (c.sources) ok(c.sources.length >= 1, `${id}: empty sources`);
    if (/Pythagoras|Euler|Euclid/.test(c.why.join(' '))) ok(c.sources && c.sources.length, `${id}: names a person, so it needs sources`);
    // the worked example, twice: the formula and an independent expression
    const ex = c.example, want = num(ex.ans);
    ok(Math.abs(c.f(...ex.args) - want) < 1e-9, `${id}: example — the formula gives ${c.f(...ex.args)}, card says ${ex.ans}`);
    ok(Math.abs(plain(ex.expr) - want) < 1e-9, `${id}: example — ${ex.expr} gives ${plain(ex.expr)}, card says ${ex.ans}`);
    ok(ex.lines.at(-1).includes(String(ex.ans)), `${id}: the example’s last line must show the answer ${ex.ans}`);
    ok(ex.expr !== String(ex.ans), `${id}: the example’s check must be a calculation, not the answer pasted in`);
    // the quiz: hundreds of draws, each answer checked by its own expr
    for (let i = 0; i < 300; i++) {
      const q = quizQ(c, r), a = num(q.ans);
      ok(Number.isFinite(a) && Math.abs(plain(q.expr) - a) < 1e-9, `${id}: quiz “${q.text}” ans ${q.ans}, expr ${q.expr} says ${plain(q.expr)}`);
      ok(correct(q, String(q.ans)), `${id}: quiz rejects its own answer ${q.ans}`);
      ok(!leaks(q), `${id}: quiz shows its answer: ${q.text}`);
      ok(String(q.ans).length <= 9, `${id}: answer ${q.ans} too long for the keypad`);
      if (typeof q.ans === 'number' && !Number.isInteger(q.ans)) ok(q.keys && q.keys.includes('.'), `${id}: decimal answer needs the . key`);
      if (q.frac) ok(q.keys && q.keys.includes('/'), `${id}: a fraction answer needs the / key`);
      ok(!/undefined|NaN/.test(q.text), `${id}: quiz text is clean`);
    }
    ok(quiz(c).length === 5, `${id}: a quiz is five questions`);
    // the story, held to the Atlas's rules
    const s = c.story;
    ok(s && s.title && SCENES.includes(s.scene), `${id}: story needs a title and a real scene (${s && s.scene})`);
    ok(s.cast.length === 2 && s.cast.every((x) => rivals.has(x)) && s.cast[0] !== s.cast[1], `${id}: cast is two of the Bee's rivals`);
    ok(s.beats.length >= 4 && s.beats.length <= 7, `${id}: story has ${s.beats.length} beats, want 4–7`);
    ok(s.beats[0].who === null, `${id}: the first beat is the narrator`);
    for (const b of s.beats) {
      ok(b.who === null || s.cast.includes(b.who), `${id}: ${b.who} is not in the cast`);
      ok(b.say && b.say.length <= 170, `${id}: a line is too long (${b.say.length})`);
      if (b.add && b.add.v !== undefined) { let v = NaN; try { v = evalSum(b.add.t); } catch (e) { /* counted below */ } ok(Math.abs(v - b.add.v) < 1e-9, `${id}: notepad ${b.add.t} = ${v}, not ${b.add.v}`); }
      else if (b.add) { let fine = true; try { evalSum(b.add.t); } catch (e) { fine = false; } ok(fine, `${id}: notepad line ${b.add.t} is not a sum`); }
    }
    ok(s.beats.some((b) => b.add && b.add.v !== undefined), `${id}: the story works something out on the notepad`);
  }
  // the collect flow: a card is collected only when its story is read to the last line
  const ctx = makeCtx('formulas', '11-14');
  ok(view(ctx).includes('0</b> of <b class="mono">' + CARDS.length), 'formulas: a fresh album counts 0');
  for (const c of CARDS) {
    act('open', c.id, ctx);
    ok(ctx.ui.card === c.id && view(ctx).includes('t-formulas-formula'), `formulas/${c.id}: opens`);
    act('tab', 'story', ctx);
    ok(view(ctx).includes(`art/s-${c.story.scene}.webp`), `formulas/${c.id}: the story stage shows its scene`);
    for (let i = 0; i < c.story.beats.length - 1; i++) {
      ok(!got(ctx, c.id), `formulas/${c.id}: collected before the last line (beat ${i})`);
      act('next', '', ctx);
    }
    ok(got(ctx, c.id), `formulas/${c.id}: reading the story to the end collects the card`);
    const h = view(ctx); ok(h.includes('Card collected') && !/undefined|NaN/.test(h), `formulas/${c.id}: the last beat says so`);
    act('next', '', ctx); ok(ctx.ui.beat === c.story.beats.length - 1, `formulas/${c.id}: Next past the end stays put`);
  }
  act('album', '', ctx);
  ok(view(ctx).includes(`${CARDS.length}</b> of <b class="mono">${CARDS.length}`), 'formulas: the album counts every collected card');
  // back and keys
  const k = makeCtx('formulas', '8-10');
  act('open', CARDS[0].id, k);
  ok(key({ key: 'ArrowRight' }, k) && k.ui.card === CARDS[1].id, 'formulas: → on a card goes to the next card');
  ok(key({ key: 'ArrowLeft' }, k) && k.ui.card === CARDS[0].id, 'formulas: ← goes back');
  act('tab', 'story', k);
  key({ key: 'ArrowRight' }, k); key({ key: 'ArrowRight' }, k); ok(k.ui.beat === 2, 'formulas: → moves the story on');
  key({ key: 'ArrowLeft' }, k); ok(k.ui.beat === 1, 'formulas: ← moves it back');
  ok(!got(k, CARDS[0].id), 'formulas: half a story does not collect');
  ok(key({ key: 'Escape' }, k) && !k.ui.card, 'formulas: Escape returns to the album');
  ok(view(k).includes('0</b> of'), 'formulas: a second child starts with an empty album');
  act('topic', 'Circles', k); const hc = view(k);
  ok(hc.includes('Area of a circle') && !hc.includes('Area of a rectangle'), 'formulas: a topic filters the album');
  // quiz me: five questions via startRun, then done() scores it
  act('open', 'pythagoras', k); act('quiz', '', k);
  const run = k.runs.at(-1);
  ok(run && run.items.length === 5 && run.extra.card === 'pythagoras', 'formulas: Quiz me starts five questions on the card');
  ok(run.items.every((q) => Math.abs(plain(q.expr) - num(q.ans)) < 1e-9), 'formulas: quiz items check out');
  const d = done({ ...run, ...run.extra, results: [1, 1, 1, 1, 0].map((x) => ({ right: !!x })) }, k);
  ok(d.stars === 2 && k.data.best.pythagoras === 4, 'formulas: done() scores 4 of 5 as two stars and keeps the best');
  const d5 = done({ ...run, ...run.extra, results: [1, 1, 1, 1, 1].map(() => ({ right: true })) }, k);
  ok(d5.stars === 3 && k.data.best.pythagoras === 5, 'formulas: 5 of 5 is three stars');
  ok(view(k).includes('Best quiz: 5 of 5'), 'formulas: the card shows the best quiz');
  let opened = null; k.openStop = (s) => { opened = s; }; act('stop', 'nth-term', k); ok(opened === 'nth-term', 'formulas: an Atlas link opens the stop');
}
