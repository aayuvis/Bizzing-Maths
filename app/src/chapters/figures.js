/* figures.js — The Figure Fair: counting and shapes that need a second look.
   One of the Contest Hall's three strategy worlds (docs/PAPER-CONTRACT.md);
   the contract is docs/CHAPTER-CONTRACT.md.

   Every stop is a picture problem, so every stop draws its picture — and the
   picture is built from the very numbers (or the very line segments) the
   answer is proved from, so the drawing can never disagree with the sum.

   Each `expr` is a second route that does not share the trick's arithmetic:
   triangles are found by testing every three crossing points of the drawn
   lines, rectangles and routes by walking every one, handshakes by listing
   every pair, the painted cube by visiting every small cube, areas by the
   shoelace rule, angles by building the figure and measuring it. */

import { int, pick, shuffle } from '../rand.js';
import { svg, text } from './kit.js';
import { explain } from '../geo3d.js';

export const WORLD = {
  id: 'figures', name: 'The Figure Fair', short: 'Figure Fair', band: '8-10', track: 'contest',
  blurb: 'Count every triangle, every route and every hidden dot — and find the short cut in the shape.',
  tint: '#FCEFF5', ink: '#6E1A42', glyph: '🎡',
};

/* ------------------------------------------------------------------ helpers */

const shows = (q) => !q.choices && String(q.ans).length > 1 && q.text.split(/[^0-9./]/).includes(String(q.ans));
function fresh(make) { let q; for (let i = 0; i < 80; i++) { q = make(); if (!shows(q)) return q; } return q; }
const R2 = (x) => Math.round(x * 100) / 100;
const RAD = Math.PI / 180;
const C2 = (n) => (n * (n - 1)) / 2;
const plural = (n, one, many) => (n === 1 ? one : many);
const L = (x1, y1, x2, y2, cls = 'dg-line', extra = '') => `<line x1="${R2(x1)}" y1="${R2(y1)}" x2="${R2(x2)}" y2="${R2(y2)}" class="${cls}"${extra}/>`;
const PG = (pts, cls) => `<polygon points="${pts.map((p) => `${R2(p[0])},${R2(p[1])}`).join(' ')}" class="${cls}"/>`;
const T = (x, y, s, cls = 'dg-text', anchor = 'middle') => text(R2(x), R2(y), s, cls, anchor);
const DASH = ' stroke-dasharray="5 4"';

/* ---- the steps' x (test/lib/steps.mjs): second routes measured from the drawing itself ---- */
const pairsX = (p) => `Array.from({length:${p}},(_,i)=>i).reduce((s,i)=>s+i,0)`;   // 0 + 1 + … + (p − 1): the pairs, added up
/* every string of right/up moves to (X, Y), kept if it never lands on the rock */
const walkX = (X, Y, rock) => `(()=>{let c=0;for(let m=0;m<${1 << (X + Y)};m++){let x=0,y=0,ok=true;for(let i=0;i<${X + Y};i++){if(m>>i&1)x++;else y++;if(x>${X}||y>${Y}||(${rock ? `${rock[0]}===x&&${rock[1]}===y` : 'false'})){ok=false;break;}}if(ok&&x===${X}&&y===${Y})c++;}return c;})()`;
const shoeX = (P) => `((P)=>Math.abs(P.reduce((s,p,i)=>s+p[0]*P[(i+1)%P.length][1]-P[(i+1)%P.length][0]*p[1],0))/2)(${JSON.stringify(P)})`;
const boxX = (P) => `((P,c)=>(Math.max(...c(0))-Math.min(...c(0)))*(Math.max(...c(1))-Math.min(...c(1))))(0,(k)=>${JSON.stringify(P)}.map((p)=>p[k]))`;
const sideX = (V, k) => `((V)=>V.reduce((s,a,i)=>s+Math.abs(V[(i+1)%V.length][${k}]-a[${k}]),0))(${JSON.stringify(V)})`;   // walk the outline: k = 0 across, 1 up-and-down

/* ---- triangles in a drawing, found by brute force ----
   The figure is a list of straight segments. Every end and every crossing is
   a point; three points make a triangle when each pair lies along one drawn
   segment and the three are not in a straight line. No formula is used. */
export function trianglesIn(segs) {
  const P = [];
  const add = (x, y) => { if (!P.some((p) => Math.abs(p[0] - x) < 1e-4 && Math.abs(p[1] - y) < 1e-4)) P.push([x, y]); };
  for (const [x1, y1, x2, y2] of segs) { add(x1, y1); add(x2, y2); }
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
    const [a, b, c, d] = segs[i], [e, f, g, h] = segs[j];
    const rx = c - a, ry = d - b, sx = g - e, sy = h - f, den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((e - a) * sy - (f - b) * sx) / den, u = ((e - a) * ry - (f - b) * rx) / den;
    if (t > -1e-9 && t < 1 + 1e-9 && u > -1e-9 && u < 1 + 1e-9) add(a + t * rx, b + t * ry);
  }
  const on = segs.map(([x1, y1, x2, y2]) => P.map(([x, y]) => {
    const cr = (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1), len = Math.hypot(x2 - x1, y2 - y1);
    if (Math.abs(cr) / len > 1e-4) return false;
    const dt = (x - x1) * (x2 - x1) + (y - y1) * (y2 - y1);
    return dt > -1e-4 * len && dt < len * len + 1e-4 * len;
  }));
  const n = P.length, J = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i !== j && on.some((o) => o[i] && o[j])));
  let c = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (J[i][j]) for (let k = j + 1; k < n; k++) {
    if (!J[i][k] || !J[j][k]) continue;
    const area = (P[j][0] - P[i][0]) * (P[k][1] - P[i][1]) - (P[j][1] - P[i][1]) * (P[k][0] - P[i][0]);
    if (Math.abs(area) > 1e-2) c++;
  }
  return c;
}

/* The segments of a fan: a top corner joined to p points on the bottom, crossed by m lines. */
function fanSegs(p, m) {
  const top = [160, 16], y1 = 196, xL = 20, xR = 300, s = [];
  for (let i = 0; i < p; i++) s.push([top[0], top[1], xL + (i * (xR - xL)) / (p - 1), y1]);
  s.push([xL, y1, xR, y1]);
  for (let j = 1; j <= m; j++) {
    const t = j / (m + 1), y = top[1] + t * (y1 - top[1]);
    s.push([top[0] + t * (xL - top[0]), y, top[0] + t * (xR - top[0]), y]);
  }
  return s;
}
/* The segments of a triangle whose sides are cut into n equal parts, with every line of the grid. */
function triGridSegs(n) {
  const S = 270 / n, H = (S * Math.sqrt(3)) / 2, P = (a, b) => [20 + (a + b / 2) * S, 16 + (n - b) * H], s = [];
  for (let i = 0; i < n; i++) {
    s.push([...P(0, i), ...P(n - i, i)]);          // across
    s.push([...P(i, 0), ...P(i, n - i)]);          // up to the right
    s.push([...P(i + 1, 0), ...P(0, i + 1)]);      // up to the left
  }
  return s;
}
const segsDraw = (segs, w, h, label) => svg(w, h, segs.map(([a, b, c, d]) => L(a, b, c, d)).join(''), label);

/* A ring of people (or teams), with the lines from the first one drawn in as a hint. */
function ring(n, opts = {}) {
  const cx = 150, cy = 130, R = 100, pts = [];
  if (opts.couples) {
    for (let i = 0; i < n; i++) { const base = (i / n) * 2 * Math.PI - Math.PI / 2, d = Math.min(0.16, Math.PI / n / 2.2);
      pts.push([cx + R * Math.cos(base - d), cy + R * Math.sin(base - d)], [cx + R * Math.cos(base + d), cy + R * Math.sin(base + d)]); }
  } else for (let i = 0; i < n; i++) { const a = (i / n) * 2 * Math.PI - Math.PI / 2; pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
  let s = '';
  pts.forEach((p, j) => { if (j && !(opts.couples && j === 1)) s += L(pts[0][0], pts[0][1], p[0], p[1], 'dg-thin', DASH); });
  if (opts.couples) for (let i = 0; i < n; i++) s += L(pts[2 * i][0], pts[2 * i][1], pts[2 * i + 1][0], pts[2 * i + 1][1], 'dg-line');
  pts.forEach((p, j) => { s += `<circle cx="${R2(p[0])}" cy="${R2(p[1])}" r="${n > 16 ? 6 : 8}" class="${j ? 'dg-dot2' : 'dg-dot'}"/>`; });
  if (opts.caption) s += T(cx, 262, opts.caption, 'dg-small');
  return svg(300, opts.caption ? 272 : 250, s, opts.label || 'People in a ring');
}

/* A board of w × h squares for the route stop: S and E corners, an optional rock. */
function board(w, h, rock) {
  const u = Math.min(44, Math.floor(260 / Math.max(w, h))), x0 = 6, y0 = 6, X = (c) => x0 + c * u, Y = (r) => y0 + (h - 1 - r) * u;
  let s = '';
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    const isRock = rock && rock[0] === c && rock[1] === r;
    s += `<rect x="${X(c)}" y="${Y(r)}" width="${u}" height="${u}" class="${isRock ? 'dg-fill2' : 'dg-blank'}"/>`;
    if (isRock) s += `<circle cx="${X(c) + u / 2}" cy="${Y(r) + u / 2}" r="${u * 0.28}" class="dg-dot2"/>`;
  }
  s += T(X(0) + u / 2, Y(0) + u / 2 + 6, 'S', 'dg-accent') + T(X(w - 1) + u / 2, Y(h - 1) + u / 2 + 6, 'E', 'dg-accent');
  s += T(x0, y0 + h * u + 20, 'S start · E end · right or up only', 'dg-small', 'start');
  return svg(Math.max(w * u + 12, 300), h * u + 30, s, `A board ${w} squares wide and ${h} tall`);
}

/* Three overlapping club circles, the outside region asked about. */
function venn3(names) {
  let s = `<rect x="4" y="4" width="352" height="252" rx="10" class="dg-blank"/>`;
  s += `<circle cx="140" cy="96" r="70" class="dg-seta"/><circle cx="220" cy="96" r="70" class="dg-setb"/><circle cx="180" cy="160" r="70" class="dg-seta"/>`;
  s += T(78, 30, names[0]) + T(282, 30, names[1]) + T(180, 248, names[2]);
  s += T(326, 236, '?', 'dg-big');
  return svg(360, 260, s, `Three overlapping circles: ${names.join(', ')}`);
}

/* A rectilinear shape from its corners (units, y up), with labels on chosen sides. */
function outline(V, labels, u) {
  const xs = V.map((p) => p[0]), ys = V.map((p) => p[1]), Hh = Math.max(...ys), ox = 60, oy = 30;
  const X = (x) => ox + x * u, Y = (y) => oy + (Hh - y) * u;
  let s = PG(V.map(([x, y]) => [X(x), Y(y)]), 'dg-fill2');
  for (const { i, l, inside } of labels) {
    const [a, b] = [V[i], V[(i + 1) % V.length]], mx = (X(a[0]) + X(b[0])) / 2, my = (Y(a[1]) + Y(b[1])) / 2;
    // the outside of a side: walking the corners anticlockwise (maths), outside is on the right
    const dx = b[0] - a[0], dy = b[1] - a[1], k = inside ? -1 : 1, nx = k * Math.sign(dy), ny = k * Math.sign(dx);   // screen normal (y down), flipped for a label written inside
    if (dy === 0) s += T(mx, my + (ny > 0 ? 18 : -8), l);
    else s += T(mx + nx * 8, my + 5, l, 'dg-text', nx > 0 ? 'start' : 'end');
  }
  return svg(ox + Math.max(...xs) * u + 60, oy + Hh * u + 34, s, 'A shape with square corners');
}

/* A cuboid a wide, b deep, c tall, every face ruled into unit squares. */
function ruledBlock(a, b, c) {
  const u = Math.min(34, Math.floor(210 / Math.max(a + b * 0.5, c + b * 0.35))), dx = (b * u * 0.5) / b, dy = (b * u * 0.35) / b;
  const ox = 16, oy = 16 + b * dy, W = a * u, Hh = c * u, Dx = b * dx, Dy = b * dy;
  let s = PG([[ox, oy], [ox + W, oy], [ox + W, oy + Hh], [ox, oy + Hh]], 'dg-fill2');
  s += PG([[ox, oy], [ox + Dx, oy - Dy], [ox + W + Dx, oy - Dy], [ox + W, oy]], 'dg-fill1');
  s += PG([[ox + W, oy], [ox + W + Dx, oy - Dy], [ox + W + Dx, oy + Hh - Dy], [ox + W, oy + Hh]], 'dg-fill3');
  for (let i = 1; i < a; i++) s += L(ox + i * u, oy, ox + i * u, oy + Hh, 'dg-thin') + L(ox + i * u, oy, ox + i * u + Dx, oy - Dy, 'dg-thin');
  for (let i = 1; i < c; i++) s += L(ox, oy + i * u, ox + W, oy + i * u, 'dg-thin') + L(ox + W, oy + i * u, ox + W + Dx, oy + i * u - Dy, 'dg-thin');
  for (let j = 1; j < b; j++) s += L(ox + j * dx, oy - j * dy, ox + W + j * dx, oy - j * dy, 'dg-thin') + L(ox + W + j * dx, oy - j * dy, ox + W + j * dx, oy + Hh - j * dy, 'dg-thin');
  return svg(R2(ox + W + Dx + 16), R2(oy + Hh + 16), s, `A block ${a} by ${b} by ${c}, painted and cut into small cubes`);
}

/* Dice. Pips by position in a unit square. */
const PIPS = { 1: [[.5, .5]], 2: [[.25, .25], [.75, .75]], 3: [[.25, .25], [.5, .5], [.75, .75]], 4: [[.25, .25], [.75, .25], [.25, .75], [.75, .75]],
  5: [[.25, .25], [.75, .25], [.5, .5], [.25, .75], [.75, .75]], 6: [[.25, .25], [.75, .25], [.25, .5], [.75, .5], [.25, .75], [.75, .75]] };
function diceTower(tops, fronts) {
  const n = tops.length, s0 = n > 4 ? 44 : 56, dx = s0 * 0.42, dy = s0 * 0.3, ox = 40, base = 24 + n * s0 + dy;
  let s = L(10, base, ox + s0 + dx + 50, base, 'dg-line');
  for (let i = 0; i < n; i++) {
    const y = base - (i + 1) * s0;
    s += `<rect x="${ox}" y="${R2(y)}" width="${s0}" height="${s0}" rx="4" class="dg-blank"/>`;
    s += PG([[ox + s0, y], [ox + s0 + dx, y - dy], [ox + s0 + dx, y + s0 - dy], [ox + s0, y + s0]], 'dg-fill3');
    for (const [px, py] of PIPS[fronts[i]]) s += `<circle cx="${R2(ox + px * s0)}" cy="${R2(y + py * s0)}" r="${R2(s0 * 0.08)}" class="dg-dot"/>`;
    if (i === n - 1) {
      s += PG([[ox, y], [ox + dx, y - dy], [ox + s0 + dx, y - dy], [ox + s0, y]], 'dg-fill1');
      for (const [px, py] of PIPS[tops[i]]) s += `<ellipse cx="${R2(ox + px * s0 + (1 - py) * dx)}" cy="${R2(y - (1 - py) * dy)}" rx="${R2(s0 * 0.07)}" ry="${R2(s0 * 0.045)}" class="dg-dot"/>`;
    }
  }
  return svg(R2(ox + s0 + dx + 60), R2(base + 10), s, n === 1 ? 'A dice' : `A tower of ${n} dice on a table`);
}

/* Fit points (maths, y up) into a box, flipped for the screen. Returns a mapper. */
function fitter(pts, size = 230, pad = 40) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), x0 = Math.min(...xs), y1 = Math.max(...ys);
  const k = size / Math.max(Math.max(...xs) - x0, Math.max(...ys) - Math.min(...ys));
  const f = ([x, y]) => [pad + (x - x0) * k, pad + (y1 - y) * k];
  f.w = 2 * pad + (Math.max(...xs) - x0) * k; f.h = 2 * pad + (y1 - Math.min(...ys)) * k;
  return f;
}
/* The angle PVQ in degrees, measured from the coordinates. */
function measure(P, V, Q) {
  const a = [P[0] - V[0], P[1] - V[1]], b = [Q[0] - V[0], Q[1] - V[1]];
  return Math.acos((a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b))) / RAD;
}
/* An arc and a label inside the angle PVQ (screen points). */
function mark(P, V, Q, label, r = 26, cls = 'dg-accent') {
  const a1 = Math.atan2(P[1] - V[1], P[0] - V[0]), a2 = Math.atan2(Q[1] - V[1], Q[0] - V[0]);
  let d = a2 - a1; while (d <= -Math.PI) d += 2 * Math.PI; while (d > Math.PI) d -= 2 * Math.PI;
  const mid = a1 + d / 2, sweep = d > 0 ? 1 : 0, deg = Math.abs(d) / RAD, lr = deg < 40 ? r + 26 : r + 18;
  let s = `<path d="M${R2(V[0] + r * Math.cos(a1))},${R2(V[1] + r * Math.sin(a1))} A${r},${r} 0 0 ${sweep} ${R2(V[0] + r * Math.cos(a2))},${R2(V[1] + r * Math.sin(a2))}" class="dg-arc"/>`;
  s += T(V[0] + lr * Math.cos(mid), V[1] + lr * Math.sin(mid) + 5, label, cls);
  return s;
}
/* A small tick across the middle of a side: the sign for "these sides are equal". */
function tick(A, B) {
  const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, l = Math.hypot(B[0] - A[0], B[1] - A[1]), nx = -(B[1] - A[1]) / l * 8, ny = (B[0] - A[0]) / l * 8;
  return L(mx - nx, my - ny, mx + nx, my + ny, 'dg-line');
}
const vLabel = (P, C, l) => { const dx = P[0] - C[0], dy = P[1] - C[1], d = Math.hypot(dx, dy) || 1; return T(P[0] + (dx / d) * 18, P[1] + (dy / d) * 18 + 5, l); };

/* ------------------------------------------------------------------ data */

const CLUBS = [['Art', 'Band', 'Chess'], ['Drama', 'Football', 'Gardening'], ['Swimming', 'Cycling', 'Running'], ['Coding', 'Dance', 'Science']];
const LIKES = [['have a cat', 'have a dog', 'Cat', 'Dog'], ['play cricket', 'play football', 'Cricket', 'Football'], ['like mango', 'like guava', 'Mango', 'Guava'],
  ['can swim', 'can ride a bike', 'Swim', 'Bike'], ['learn music', 'learn a dance', 'Music', 'Dance']];
const OPP = { 1: 6, 6: 1, 2: 5, 5: 2, 3: 4, 4: 3 };         // a real dice's opposite faces, written as pairs
const sides = (u) => [1, 2, 3, 4, 5, 6].filter((v) => v !== u && v !== OPP[u]);

/* ------------------------------------------------------------------ stops */

export const TRICKS = [
  {
    id: 'count-triangles', world: 'figures', band: '8-10', title: 'Counting triangles',
    hook: 'Lines fan out from the top corner of a triangle. How many triangles can you see — all of them?',
    idea: 'Do not hunt for triangles one by one: sort them by what they are made of, then count each sort with a rule.',
    why: [
      'Your eye finds the small triangles and misses the big ones made of several pieces. So stop looking and start sorting. In a fan, every triangle has the top corner as one of its points, and its two slanting sides are two of the lines that leave the top. Choose any two of those lines and the bottom edge closes them into exactly one triangle. So the count is just "how many ways to choose two lines".',
      'With 5 lines leaving the top, the first line can pair with 4 others, the second with 3 new ones, then 2, then 1: 4 + 3 + 2 + 1 = 10. That is the same as 5 × 4 ÷ 2 — every pair is counted twice when each line names its partners, so halve it. Add a line straight across the fan and every pair of slanting lines makes a second triangle with it, so the count doubles.',
      'A triangle cut into a grid of small triangles is sorted a different way: by size, and by which way it points. Count the ones pointing up for each size, then the ones pointing down — the upside-down ones are the ones people forget, and the reason the answer is bigger than you think.',
    ],
    alg: 'fan with p lines from the top and m cross-lines: p(p − 1)/2 × (m + 1)',
    ex: { kind: 'fan', p: 5, m: 0 },
    caseKey: 'kind',
    cases: [
      { label: 'A fan from one corner', note: 'Every triangle uses the top corner and two of the lines leaving it, so count the pairs of lines: 5 × 4 ÷ 2.',
        ex: { kind: 'fan', p: 5, m: 0 } },
      { label: 'A fan with a cross-line', note: 'Each pair of slanting lines now makes a triangle with the bottom AND with the line across — so multiply the pairs by the number of across lines.',
        ex: { kind: 'cross', p: 4, m: 1 } },
      { label: 'A grid of triangles', note: 'Sort by size and by direction. Count up-pointing triangles of each size, then the down-pointing ones — the ones most people miss.',
        ex: { kind: 'grid', n: 3 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) return this.q({ kind: 'fan', p: int(3, 5, r), m: 0 });
        if (lv === 2) { const c = r(); if (c < 0.4) return this.q({ kind: 'fan', p: int(5, 7, r), m: 0 }); if (c < 0.8) return this.q({ kind: 'cross', p: int(3, 4, r), m: 1 }); return this.q({ kind: 'grid', n: 2 }); }
        if (r() < 0.55) return this.q({ kind: 'grid', n: int(3, 5, r) });
        return this.q({ kind: 'cross', p: int(4, 6, r), m: int(2, 3, r) });
      });
    },
    segs(o) { return o.kind === 'grid' ? triGridSegs(o.n) : fanSegs(o.p, o.m); },
    q(o) {
      const { kind } = o, segs = this.segs(o);
      if (kind === 'grid') {
        const n = o.n; let up = 0, dn = 0;
        for (let s = 1; s <= n; s++) up += C2(n - s + 2);
        for (let s = 1; n - 2 * s + 1 >= 1; s++) dn += C2(n - 2 * s + 2);
        return { ...o, up, dn, text: `Each side of the big triangle is cut into ${n} equal parts, and the lines make a grid of small triangles. How many triangles of any size are there?`,
          expr: `${trianglesIn(segs)}`, ans: up + dn };
      }
      const { p, m } = o;
      return { ...o, text: m ? `Lines run from the top corner to ${p} points on the bottom edge (the two ends count), and ${m} ${plural(m, 'line crosses', 'lines cross')} straight over the whole triangle. How many triangles are there?`
        : `Lines run from the top corner to ${p} points on the bottom edge (the two ends count). How many triangles are there altogether?`,
      expr: `${trianglesIn(segs)}`, ans: C2(p) * (m + 1) };
    },
    work(q) {
      if (q.kind === 'grid') return [{ t: 'Triangles pointing UP, of every size', v: q.up, x: `(()=>{let c=0;for(let s=1;s<=${q.n};s++)for(let r=0;r+s<=${q.n};r++)for(let i=0;i<=r;i++)c++;return c;})()` }, { t: 'Triangles pointing DOWN, of every size', v: q.dn, x: `(()=>{let c=0;for(let s=1;s<=${q.n};s++)for(let r=s;r+s<=${q.n};r++)for(let i=0;i+s<=r;i++)c++;return c;})()` }, { t: 'All the triangles', v: q.ans }];
      const S = JSON.stringify(this.segs(q));   // the drawn segments: the first starts at the top corner
      const s = [{ t: 'Lines leaving the top corner', v: q.p, x: `((S)=>S.filter((g)=>g[0]===S[0][0]&&g[1]===S[0][1]).length)(${S})` }, { t: `Ways to choose two of them: ${q.p} × ${q.p - 1} ÷ 2`, v: C2(q.p), x: pairsX(q.p) }];
      if (q.m) s.push({ t: 'Lines going across that can close a triangle (the bottom edge counts)', v: q.m + 1, x: `${S}.filter((g)=>g[1]===g[3]).length` }, { t: 'Triangles: pairs × across lines', v: q.ans });
      return s;
    },
    draw(q) {
      const segs = this.segs(q);
      if (q.kind === 'grid') return segsDraw(segs, 310, R2(16 + q.n * (270 / q.n) * Math.sqrt(3) / 2 + 16), 'A triangle cut into a grid of small triangles');
      return segsDraw(segs, 320, 212, 'Lines fanning out from the top corner of a triangle');
    },
  },
  {
    id: 'count-rectangles', world: 'figures', band: '8-10', title: 'Counting rectangles',
    hook: 'A chocolate bar is 4 pieces wide and 3 pieces tall. How many rectangles are hiding in it?',
    idea: 'A rectangle is fixed by choosing its two side lines and its two top-and-bottom lines — count the choices and multiply.',
    why: [
      'Look at the lines, not the squares. Every rectangle in the grid has a left side and a right side, and both lie on two of the upright lines. It has a top and a bottom on two of the across lines. Pick any two upright lines and any two across lines and you have drawn exactly one rectangle — and every rectangle comes from exactly one such choice.',
      'A grid 4 squares wide has 5 upright lines (one more than the squares, like fence posts). Two of 5 can be chosen in 5 × 4 ÷ 2 = 10 ways. A grid 3 tall has 4 across lines, and two of those can be chosen in 4 × 3 ÷ 2 = 6 ways. Every left-and-right choice goes with every top-and-bottom choice, so there are 10 × 6 = 60 rectangles.',
      'Squares are counted by size instead. In a 4 by 3 grid there are 4 × 3 one-by-one squares, 3 × 2 two-by-two squares and 2 × 1 three-by-three squares: each bigger size fits one fewer way across and one fewer way down.',
    ],
    alg: 'rectangles in a w × h grid = C(w + 1, 2) × C(h + 1, 2)',
    ex: { kind: 'grid', w: 4, h: 3 },
    caseKey: 'kind',
    cases: [
      { label: 'One row of squares', note: 'In a strip, a rectangle is just a choice of two of the dividing lines for its two ends: 6 lines give 6 × 5 ÷ 2 = 15.',
        ex: { kind: 'strip', w: 5, h: 1 } },
      { label: 'A grid of rectangles', note: 'Choose two upright lines and two across lines. Every left-right choice goes with every top-bottom choice, so multiply.',
        ex: { kind: 'grid', w: 4, h: 3 } },
      { label: 'Only the squares', note: 'Squares need equal sides, so count them size by size: each size up fits one fewer way across and one fewer way down.',
        ex: { kind: 'squares', w: 4, h: 3 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) return r() < 0.6 ? this.q({ kind: 'strip', w: int(3, 7, r), h: 1 }) : this.q({ kind: 'grid', w: int(2, 3, r), h: 2 });
        if (lv === 2) return r() < 0.6 ? this.q({ kind: 'grid', w: int(3, 5, r), h: int(2, 4, r) }) : this.q({ kind: 'squares', w: int(3, 4, r), h: int(2, 3, r) });
        return r() < 0.5 ? this.q({ kind: 'grid', w: int(4, 7, r), h: int(3, 5, r) }) : this.q({ kind: 'squares', w: int(4, 7, r), h: int(3, 4, r) });
      });
    },
    q(o) {
      const { kind, w, h } = o, sq = kind === 'squares';
      let ans = 0;
      if (sq) for (let s = 1; s <= Math.min(w, h); s++) ans += (w - s + 1) * (h - s + 1);
      else ans = C2(w + 1) * C2(h + 1);
      const text = kind === 'strip' ? `A strip of ${w} squares in a row. How many rectangles can you find? (A square counts as a rectangle.)`
        : sq ? `A grid ${w} squares wide and ${h} squares tall. How many squares of any size can you find?`
          : `A grid ${w} squares wide and ${h} squares tall. How many rectangles of any size can you find? (Squares count too.)`;
      // walk every possible rectangle: each starting square, each width, each height
      const expr = `(()=>{let c=0;for(let x=0;x<${w};x++)for(let y=0;y<${h};y++)for(let a=1;x+a<=${w};a++)for(let b=1;y+b<=${h};b++)if(${sq ? 'a===b' : 'true'})c++;return c;})()`;
      return { ...o, text, expr, ans };
    },
    work(q) {
      const { kind, w, h } = q;
      if (kind === 'strip') return [{ t: 'Dividing lines across the strip (both ends count)', v: w + 1, x: `${w}+1` }, { t: `Choose two of them for the ends: ${w + 1} × ${w} ÷ 2`, v: q.ans }];
      if (kind === 'grid') return [{ t: `Choose 2 of the ${w + 1} upright lines: ${w + 1} × ${w} ÷ 2`, v: C2(w + 1), x: pairsX(w + 1) }, { t: `Choose 2 of the ${h + 1} across lines: ${h + 1} × ${h} ÷ 2`, v: C2(h + 1), x: pairsX(h + 1) }, { t: 'Multiply: every pair of sides goes with every top and bottom', v: q.ans }];
      const s = [];
      for (let k = 1; k <= Math.min(w, h); k++) s.push({ t: `${k} by ${k} squares: ${w - k + 1} × ${h - k + 1}`, v: (w - k + 1) * (h - k + 1),
        x: `(()=>{let c=0;for(let x=0;x+${k}<=${w};x++)for(let y=0;y+${k}<=${h};y++)c++;return c;})()` });   // walk every place a k-square fits
      s.push({ t: 'All the squares', v: q.ans });
      return s;
    },
    draw({ w, h }) {
      const u = Math.min(40, Math.floor(280 / w)); let s = '';
      for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) s += `<rect x="${3 + c * u}" y="${3 + r * u}" width="${u}" height="${u}" class="dg-fill2"/>`;
      return svg(w * u + 6, h * u + 6, s, `A grid ${w} squares wide and ${h} tall`);
    },
  },
  {
    id: 'handshakes', world: 'figures', band: '8-10', title: 'Handshakes and matches',
    hook: 'Ten friends all shake hands with each other once. Is that 100 handshakes? 90? Fewer?',
    idea: 'Count from every person, then halve — because every handshake has two people in it and got counted by both.',
    why: [
      'Stand in the shoes of one person. With 10 friends, she shakes hands with the other 9. So does everyone else, so 10 people × 9 handshakes each = 90. But look at any one handshake: Ana shaking hands with Ben was counted once when we stood in Ana\'s shoes and again in Ben\'s. Every handshake was counted exactly twice, so the real number is 90 ÷ 2 = 45.',
      'A league where every team plays every other team twice — once at home, once away — is different. Now Ana-at-home-to-Ben and Ben-at-home-to-Ana really are two games. Count each team\'s home games and you are done, with nothing to halve: 10 teams × 9 home games = 90.',
      'The same picture runs backwards. If 45 handshakes happened, double it to 90 and ask: which number times the number one below it makes 90? 10 × 9 — so there were 10 people. And if partners do not shake hands with each other, count everyone\'s handshakes leaving out themselves AND their partner, then halve.',
    ],
    alg: 'n people, one handshake per pair: n(n − 1) ÷ 2',
    ex: { kind: 'once', n: 6 },
    caseKey: 'kind',
    cases: [
      { label: 'Everyone shakes once', note: 'Each of 6 people shakes 5 hands: 6 × 5 = 30 — but that counts every handshake from both ends, so halve it.',
        ex: { kind: 'once', n: 6 } },
      { label: 'Home and away', note: 'When every pair plays twice, the two games really are different. Count each team\'s home games and do not halve.',
        ex: { kind: 'twice', n: 5 } },
      { label: 'Working backwards', note: 'Double the handshakes, then find a number times the one just below it that makes that. The bigger number is the people.',
        ex: { kind: 'reverse', n: 8 } },
      { label: 'Couples skip partners', note: 'Each person shakes everyone except themselves and their own partner. Count from every person, then halve as before.',
        ex: { kind: 'couples', n: 4 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) return this.q({ kind: 'once', n: int(3, 7, r) });
        if (lv === 2) return r() < 0.55 ? this.q({ kind: 'once', n: int(7, 14, r) }) : this.q({ kind: 'twice', n: int(4, 9, r) });
        const c = r();
        if (c < 0.35) return this.q({ kind: 'reverse', n: int(6, 20, r) });
        if (c < 0.7) return this.q({ kind: 'couples', n: int(3, 8, r) });
        return c < 0.85 ? this.q({ kind: 'once', n: int(15, 30, r) }) : this.q({ kind: 'twice', n: int(10, 16, r) });
      });
    },
    q(o) {
      const { kind, n } = o;
      if (kind === 'once') return { ...o, text: `${n} friends meet, and every two of them shake hands once. How many handshakes are there?`,
        expr: `(()=>{let c=0;for(let i=0;i<${n};i++)for(let j=i+1;j<${n};j++)c++;return c;})()`, ans: (n * (n - 1)) / 2 };
      if (kind === 'twice') return { ...o, text: `${n} teams are in a league. Every team plays every other team twice: once at home and once away. How many games are played?`,
        expr: `(()=>{let c=0;for(let i=0;i<${n};i++)for(let j=0;j<${n};j++)if(i!==j)c++;return c;})()`, ans: n * (n - 1) };
      if (kind === 'reverse') { const H = (n * (n - 1)) / 2;
        return { ...o, H, text: `At a party, every two guests shook hands once — ${H} handshakes in all. How many guests were there?`,
          expr: `(()=>{for(let g=2;g<100;g++){let c=0;for(let i=0;i<g;i++)for(let j=i+1;j<g;j++)c++;if(c===${H})return g;}return -1;})()`, ans: n }; }
      return { ...o, text: `${n} couples meet. Everyone shakes hands once with everyone else — except their own partner. How many handshakes are there?`,
        expr: `(()=>{let c=0;for(let i=0;i<${2 * n};i++)for(let j=i+1;j<${2 * n};j++)if((i>>1)!==(j>>1))c++;return c;})()`, ans: (2 * n * (2 * n - 2)) / 2 };
    },
    work(q) {
      const { kind, n } = q;
      if (kind === 'once') return [{ t: 'Hands one person shakes', v: n - 1, x: `${n}-1` }, { t: `Counted from every person: ${n} × ${n - 1}`, v: n * (n - 1), x: `${n}*(${n}-1)` }, { t: 'Each handshake was counted twice — halve', v: q.ans }];
      if (kind === 'twice') return [{ t: 'Home games for one team (one against each other team)', v: n - 1, x: `${n}-1` }, { t: `Home games for all ${n} teams — every game is someone's home game`, v: q.ans }];
      if (kind === 'reverse') return [{ t: `Double the handshakes: ${q.H} × 2`, v: 2 * q.H, x: `${q.H}*2` }, { t: 'That is a number times the one just below it. The bigger number is', v: n }];
      return [{ t: 'People altogether', v: 2 * n, x: `${n}*2` }, { t: 'Hands one person shakes (not themselves, not their partner)', v: 2 * n - 2, x: `${n}*2-1-1` }, { t: `Counted from every person: ${2 * n} × ${2 * n - 2}`, v: 2 * n * (2 * n - 2), x: `${n}*2*(${n}*2-2)` }, { t: 'Halve: each handshake was counted twice', v: q.ans }];
    },
    draw(q) {
      if (q.kind === 'reverse') {
        let s = '';
        for (let i = 0; i < 9; i++) { const a = (i / 12) * 2 * Math.PI - Math.PI / 2; s += `<circle cx="${R2(150 + 100 * Math.cos(a))}" cy="${R2(130 + 100 * Math.sin(a))}" r="8" class="dg-dot2"/>`; }
        s += `<path d="M${R2(150 + 100 * Math.cos(1.25 * Math.PI))},${R2(130 + 100 * Math.sin(1.25 * Math.PI))} A100,100 0 0 1 ${R2(150 + 100 * Math.cos(1.45 * Math.PI))},${R2(130 + 100 * Math.sin(1.45 * Math.PI))}" class="dg-thin"${DASH} fill="none"/>`;
        s += T(150, 140, 'how many?', 'dg-accent') + T(150, 262, `${q.H} handshakes`, 'dg-small');
        return svg(300, 272, s, 'A ring of guests, with an unknown number of people');
      }
      if (q.kind === 'couples') return ring(q.n, { couples: true, caption: 'dashed: one person\'s handshakes', label: `${q.n} couples in a ring, partners side by side` });
      return ring(q.n, { caption: `dashed: ${q.kind === 'twice' ? 'one team\'s opponents' : 'one person\'s handshakes'}`, label: `${q.n} ${q.kind === 'twice' ? 'teams' : 'people'} in a ring` });
    },
  },
  {
    id: 'grid-paths', world: 'figures', band: '8-10', title: 'Counting routes',
    hook: 'A counter moves only right or up across a 4 by 4 board. How many different ways can it go from corner to corner?',
    idea: 'Write in each square how many ways reach it: the ways from the left plus the ways from below.',
    why: [
      'Listing routes goes wrong fast — there are too many, and they look alike. So ask a smaller question about each square instead: how many routes arrive here? A counter can only arrive from the square on its left or the square below it, because those are the only moves. So the routes into a square are the routes into its left neighbour plus the routes into the one below.',
      'Start at the corner. Every square along the bottom row can be reached in only one way (keep going right), and so can every square up the left side (keep going up). Write 1 in all of those. Then fill the board row by row, each square the sum of the one to its left and the one below. The number in the end square is the answer — you only ever added.',
      'A rock is easy now. No route may land on it, so write 0 there and carry on adding as before. The squares beyond the rock automatically lose exactly the routes that would have passed through it.',
    ],
    alg: 'routes(square) = routes(left) + routes(below);  a blocked square holds 0',
    ex: { w: 4, h: 3, rock: null },
    caseKey: 'blocked',
    cases: [
      { label: 'An open board', note: 'The edges are all 1. Each other square is the one on its left plus the one below; the end square holds the answer.',
        ex: { w: 4, h: 3, rock: null } },
      { label: 'A square you must avoid', note: 'Write 0 on the rock — no route arrives there — and keep adding. Routes that would have used it simply vanish.',
        ex: { w: 4, h: 4, rock: [1, 2] } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) { const [w, h] = pick([[3, 2], [2, 3], [3, 3], [4, 2], [2, 4]], r); return this.q({ w, h, rock: null }); }
        if (lv === 2) return this.q({ w: int(3, 5, r), h: int(3, 4, r), rock: null });
        const w = int(4, 6, r), h = int(4, 5, r);
        return r() < 0.8 ? this.q({ w, h, rock: [int(1, w - 2, r), int(1, h - 2, r)] }) : this.q({ w, h, rock: null });
      });
    },
    q(o) {
      const { w, h, rock } = o, f = [];
      for (let r = 0; r < h; r++) { f.push([]); for (let c = 0; c < w; c++) {
        f[r][c] = rock && rock[0] === c && rock[1] === r ? 0 : r === 0 && c === 0 ? 1 : (r ? f[r - 1][c] : 0) + (c ? f[r][c - 1] : 0); } }
      const mv = w + h - 2, rk = rock ? `${rock[0]}===x&&${rock[1]}===y` : 'false';
      // every string of right/up moves, kept if it has the right number of each and misses the rock
      const expr = `(()=>{let c=0;for(let m=0;m<${1 << mv};m++){let x=0,y=0,ok=true;for(let i=0;i<${mv};i++){if(m>>i&1)x++;else y++;if(x>=${w}||y>=${h}||(${rk})){ok=false;break;}}if(ok&&x===${w - 1}&&y===${h - 1})c++;}return c;})()`;
      return { ...o, blocked: !!rock, left: f[h - 1][w - 2], below: f[h - 2][w - 1],
        text: `A counter starts in the bottom-left square of a board ${w} squares wide and ${h} tall. Each move goes one square right or one square up.${rock ? ' It may never land on the rock.' : ''} How many different routes reach the top-right square?`,
        expr, ans: f[h - 1][w - 1] };
    },
    work(q) {
      return [
        q.rock ? { t: 'Routes that arrive on the rock', v: 0, x: walkX(q.rock[0], q.rock[1], q.rock) } : { t: 'Routes to any square on the bottom row or up the left side', v: 1, x: walkX(q.w - 1, 0, null) },
        { t: 'Routes to the square just LEFT of the end', v: q.left, x: walkX(q.w - 2, q.h - 1, q.rock) },
        { t: 'Routes to the square just BELOW the end', v: q.below, x: walkX(q.w - 1, q.h - 2, q.rock) },
        { t: 'Add them: every route comes in from the left or from below', v: q.ans },
      ];
    },
    draw(q) { return board(q.w, q.h, q.rock); },
  },
  {
    id: 'overlapping-groups', world: 'figures', band: '8-10', title: 'Overlapping groups',
    hook: '18 children have a cat, 15 have a dog, 5 have neither — and the class has 30. How many have both?',
    idea: 'Add the groups, and whoever is counted twice is in the overlap: add, then take away what was double-counted.',
    why: [
      'Ask each child with a cat to stand, then each child with a dog. A child with both stood up twice. So 18 + 15 = 33 is not 33 different children — it is the children with a pet, plus the both-children a second time. Add the 5 with neither and you get 38 "stand-ups" from a class of 30. The extra 8 are exactly the children counted twice: 8 have both.',
      'The same rule runs the other way. If you know the overlap, take it away once so nobody is counted twice: cat or dog is 18 + 15 − 8 = 25 children, and the rest of the class, 30 − 25 = 5, has neither.',
      'With three groups, add all three, then take away each pair\'s overlap. But a child in all three clubs was added three times and then taken away three times — gone completely! So add the all-three group back once. Add, take away, add back: that is the whole method.',
    ],
    alg: 'n(A or B) = n(A) + n(B) − n(A and B);  three sets: add the three, take the pairs, add back all three',
    ex: { mode: 'both', T: 30, a: 10, b: 7, x: 8, z: 5, names: LIKES[0] },
    caseKey: 'mode',
    cases: [
      { label: 'Find the overlap', note: 'Add both groups and the "neither" children. The total is too big by exactly the children counted twice — the ones in both.',
        ex: { mode: 'both', T: 30, a: 10, b: 7, x: 8, z: 5, names: LIKES[0] } },
      { label: 'Find who is outside', note: 'Take the overlap away once so nobody counts twice. That is everyone in a circle; the rest are outside.',
        ex: { mode: 'neither', T: 32, a: 9, b: 11, x: 6, z: 6, names: LIKES[1] } },
      { label: 'Three circles', note: 'Add the three, take away the three pair-overlaps, then add back the all-three group, which was taken away once too often.',
        ex: { mode: 'three', reg: [6, 5, 4, 3, 2, 2, 1], z: 5, names: CLUBS[0] } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv < 3 || r() < 0.25) {
          const big = lv === 1 ? 1 : lv === 2 ? 2 : 3, a = int(1, 6 * big, r), b = int(1, 6 * big, r), x = int(1, 5 * big, r), z = int(1, 4 * big, r);
          return this.q({ mode: pick(['both', 'neither'], r), T: a + b + x + z, a, b, x, z, names: pick(LIKES, r) });
        }
        // regions: A only, B only, C only, AB only, AC only, BC only, all three
        const reg = [int(2, 9, r), int(2, 9, r), int(2, 9, r), int(1, 5, r), int(1, 5, r), int(1, 5, r), int(1, 4, r)];
        return this.q({ mode: 'three', reg, z: int(1, 8, r), names: pick(CLUBS, r) });
      });
    },
    q(o) {
      const { mode, names } = o;
      if (mode === 'three') {
        const [a, b, c, ab, ac, bc, abc] = o.reg, T = a + b + c + ab + ac + bc + abc + o.z;
        const A = a + ab + ac + abc, B = b + ab + bc + abc, C = c + ac + bc + abc, AB = ab + abc, AC = ac + abc, BC = bc + abc;
        const [n1, n2, n3] = names;
        // build the class one child at a time from the regions, check every stated total, then count the children in no club
        const expr = `(()=>{const k=[];const put=(n,f)=>{for(let i=0;i<n;i++)k.push(f)};${o.reg.map((v, i) => `put(${v},${[1, 2, 4, 3, 5, 6, 7][i]});`).join('')}put(${o.z},0);
          const has=(m)=>k.filter((f)=>(f&m)===m).length;if(k.length!==${T}||has(1)!==${A}||has(2)!==${B}||has(4)!==${C}||has(3)!==${AB}||has(5)!==${AC}||has(6)!==${BC}||has(7)!==${abc})return -1;
          return k.filter((f)=>f===0).length;})()`;
        return { ...o, T, A, B, C, AB, AC, BC, ABC: abc,
          text: `${T} children were asked about three clubs. ${A} are in ${n1}, ${B} in ${n2} and ${C} in ${n3}. ${AB} are in both ${n1} and ${n2}, ${AC} in both ${n1} and ${n3}, ${BC} in both ${n2} and ${n3} — and ${abc} of them are in all three. How many children are in none of the clubs?`,
          expr: expr.replace(/\s*\n\s*/g, ''), ans: T - (A + B + C - AB - AC - BC + abc) };
      }
      const { T, a, b, x, z } = o, A = a + x, B = b + x, [va, vb] = names;
      if (mode === 'both') return { ...o, A, B,
        text: `In a class of ${T}, ${A} children ${va}, ${B} ${vb}, and ${z} do neither. How many children do both?`,
        // try every size of overlap; exactly one makes the class add up
        expr: `(()=>{const r=[];for(let y=0;y<=Math.min(${A},${B});y++)if((${A}-y)+(${B}-y)+y+${z}===${T})r.push(y);return r.length===1?r[0]:-1;})()`,
        ans: A + B + z - T };
      return { ...o, A, B,
        text: `In a class of ${T}, ${A} children ${va} and ${B} ${vb}. ${x} of them do both. How many children do neither?`,
        // seat the class in a row: the first A do the first thing, a run of B starting x before the end of them do the second
        expr: `(()=>{let c=0;for(let i=0;i<${T};i++){const p=i<${A},q=i>=${A - x}&&i<${A - x + B};if(!p&&!q)c++;}return c;})()`,
        ans: T - (A + B - x) };
    },
    work(q) {
      if (q.mode === 'three') {
        const s1 = q.A + q.B + q.C, s2 = s1 - q.AB - q.AC - q.BC, u = s2 + q.ABC;
        return [{ t: 'Add the three clubs', v: s1, x: `${q.A}+${q.B}+${q.C}` }, { t: 'Take away the three pair overlaps', v: s2, x: `${q.A}+${q.B}+${q.C}-${q.AB}-${q.AC}-${q.BC}` },
          { t: 'Add back the all-three group (taken away once too often): children in a club', v: u, x: `${q.A}+${q.B}+${q.C}-${q.AB}-${q.AC}-${q.BC}+${q.ABC}` }, { t: 'Take that from the whole group', v: q.ans }];
      }
      if (q.mode === 'both') return [{ t: `Add the two groups: ${q.A} + ${q.B}`, v: q.A + q.B, x: `${q.A}+${q.B}` }, { t: 'Add the children who do neither', v: q.A + q.B + q.z, x: `${q.A}+${q.B}+${q.z}` }, { t: `Take away the class of ${q.T}: the extra were counted twice`, v: q.ans }];
      return [{ t: `Add the two groups: ${q.A} + ${q.B}`, v: q.A + q.B, x: `${q.A}+${q.B}` }, { t: 'Take away the overlap once, so nobody counts twice', v: q.A + q.B - q.x, x: `${q.A}+${q.B}-${q.x}` }, { t: `Take that from the class of ${q.T}`, v: q.ans }];
    },
    draw(q) {
      if (q.mode === 'three') return venn3(q.names);
      const [, , la, lb] = q.names;
      let s = `<rect x="4" y="4" width="352" height="200" rx="10" class="dg-blank"/><circle cx="135" cy="110" r="78" class="dg-seta"/><circle cx="225" cy="110" r="78" class="dg-setb"/>`;
      s += T(95, 30, `${la}: ${q.A}`) + T(265, 30, `${lb}: ${q.B}`);
      s += T(180, 117, q.mode === 'both' ? '?' : String(q.x), 'dg-big') + T(330, 190, q.mode === 'both' ? String(q.z) : '?', 'dg-big');
      s += T(14, 196, `class of ${q.T}`, 'dg-small', 'start');
      return svg(360, 208, s, `Two overlapping circles: ${la} and ${lb}`);
    },
  },
  {
    id: 'staircase-perimeter', world: 'figures', band: '8-10', title: 'Staircase perimeters',
    hook: 'A staircase shape has lots of little steps and only two lengths marked. Can you still find its perimeter?',
    idea: 'Push the steps out to the corner: the across pieces add up to the width and the up pieces to the height, so the perimeter is the rectangle\'s.',
    why: [
      'Walk round the staircase. Every piece of the edge goes either across or up-and-down. Now imagine sliding each little across-piece of the steps straight up to the top: they line up end to end and fill the top edge of a rectangle exactly. Slide each little up-piece across to the side and they fill the right edge.',
      'So the steps are exactly as long as the top and right sides of the rectangle drawn round the shape. The perimeter of the staircase is the perimeter of that rectangle: 2 × (width + height). You never needed to know the size of a single step — which is why the question only told you two lengths.',
      'Careful with a slot cut into the middle of a side. Its two walls go down into the shape and back up, and they cannot slide out to the edge — nothing is there to fill. So a slot adds both of its walls to the rectangle\'s perimeter. Its width does not matter at all: the bottom of the slot simply replaces the piece of edge that was cut away.',
    ],
    alg: 'staircase: P = 2(W + H);  with a slot d deep: P = 2(W + H) + 2d',
    ex: { kind: 'stairs', W: 9, H: 7, ws: [3, 2, 4], hs: [2, 3, 2] },
    caseKey: 'kind',
    cases: [
      { label: 'The outside is marked', note: 'Only the width and the height are given — and that is all you need. The steps slide out to make the rectangle\'s other two sides.',
        ex: { kind: 'stairs', W: 9, H: 7, ws: [3, 2, 4], hs: [2, 3, 2] } },
      { label: 'Only the steps are marked', note: 'Add the step widths: together they are as wide as the bottom. Add the step heights: together they are as tall as the left side.',
        ex: { kind: 'pieces', W: 8, H: 7, ws: [3, 2, 3], hs: [2, 3, 2] } },
      { label: 'A slot in one side', note: 'The slot\'s two walls go in and out again, so they add to the rectangle\'s perimeter. Its width changes nothing.',
        ex: { kind: 'notch', W: 10, H: 6, nw: 3, d: 2, at: 4 } },
    ],
    gen(r, lv = 1) {
      const split = (total, k) => { const cut = shuffle(Array.from({ length: total - 1 }, (_, i) => i + 1), r).slice(0, k - 1).sort((a, b) => a - b); return [...cut, total].map((v, i, a) => v - (i ? a[i - 1] : 0)); };
      return fresh(() => {
        const kind = lv === 1 ? 'stairs' : lv === 2 ? pick(['stairs', 'pieces'], r) : pick(['pieces', 'notch', 'notch'], r);
        if (kind === 'notch') { const W = int(8, 14, r), H = int(5, 9, r), nw = int(2, W - 5, r); return this.q({ kind, W, H, nw, d: int(2, H - 2, r), at: int(2, W - nw - 2, r) }); }
        const k = lv === 1 ? int(2, 3, r) : int(3, 4, r);
        if (kind === 'pieces') { const W = int(2 * k, 10, r), H = int(2 * k, 9, r), two = (t) => split(t - k, k).map((v) => v + 1); return this.q({ kind, W, H, ws: two(W), hs: two(H) }); }
        const W = int(k + 3, 14, r), H = int(k + 2, 10, r);
        return this.q({ kind, W, H, ws: split(W, k), hs: split(H, k) });
      });
    },
    corners(o) {
      if (o.kind === 'notch') { const { W, H, nw, d, at } = o; return [[0, 0], [W, 0], [W, H], [at + nw, H], [at + nw, H - d], [at, H - d], [at, H], [0, H]]; }
      const V = [[0, 0], [o.W, 0]]; let x = o.W, y = 0;
      o.hs.forEach((h, i) => { y += h; V.push([x, y]); x -= o.ws[i]; V.push([x, y]); });
      return V;
    },
    q(o) {
      const V = this.corners(o);
      // walk the outline corner to corner, adding every side
      const expr = `(()=>{const V=${JSON.stringify(V)};let p=0;for(let i=0;i<V.length;i++){const a=V[i],b=V[(i+1)%V.length];p+=Math.abs(b[0]-a[0])+Math.abs(b[1]-a[1]);}return p;})()`;
      if (o.kind === 'notch') return { ...o, text: `A ${o.W} cm by ${o.H} cm rectangle has a slot ${o.nw} cm wide and ${o.d} cm deep cut into its top edge. What is the perimeter of the shape that is left, in cm?`,
        expr, ans: 2 * (o.W + o.H) + 2 * o.d };
      const k = o.ws.length;
      return { ...o, text: o.kind === 'stairs' ? `A staircase shape with ${k} steps is ${o.W} cm wide and ${o.H} cm tall. What is its perimeter, in cm?`
        : `Each of the ${k} steps of this staircase is marked in cm. What is the perimeter of the whole shape, in cm?`, expr, ans: 2 * (o.W + o.H) };
    },
    work(q) {
      const V = this.corners(q);
      if (q.kind === 'notch') return [{ t: 'Across pieces: top and bottom of the rectangle', v: 2 * q.W, x: sideX(V, 0) }, { t: 'Up-and-down pieces: the two sides', v: 2 * q.H, x: `${q.H}+${q.H}` }, { t: 'The slot\'s two walls', v: 2 * q.d, x: `${sideX(V, 1)}-2*${q.H}` }, { t: 'Perimeter', v: q.ans }];
      if (q.kind === 'pieces') return [{ t: 'Add the step widths: as wide as the bottom', v: q.W, x: `[${q.ws}].reduce((s,v)=>s+v,0)` }, { t: 'Add the step heights: as tall as the left side', v: q.H, x: `[${q.hs}].reduce((s,v)=>s+v,0)` }, { t: 'Perimeter: 2 × (width + height)', v: q.ans }];
      return [{ t: 'All the across pieces: the bottom, plus the steps that slide up to match it', v: 2 * q.W, x: sideX(V, 0) }, { t: 'All the up-and-down pieces', v: 2 * q.H, x: sideX(V, 1) }, { t: 'Perimeter', v: q.ans }];
    },
    geo(q) { return { kind: 'push', form: q.kind, W: q.W, H: q.H, V: this.corners(q), ws: q.ws || [], hs: q.hs || [], nw: q.nw || 0, d: q.d || 0, at: q.at || 0 }; },
    explain,
    draw(q) {
      const V = this.corners(q), u = Math.min(30, Math.floor(Math.min(260 / q.W, 200 / q.H)));
      let labels;
      if (q.kind === 'stairs') labels = [{ i: 0, l: `${q.W} cm` }, { i: V.length - 1, l: `${q.H} cm` }];
      else if (q.kind === 'pieces') labels = V.map((_, i) => i).filter((i) => i >= 1 && i < V.length - 1).map((i) => ({ i, l: `${i % 2 ? q.hs[(i - 1) / 2] : q.ws[i / 2 - 1]} cm`, inside: i % 2 === 1 }));
      else labels = [{ i: 0, l: `${q.W} cm` }, { i: 7, l: `${q.H} cm` }, { i: 3, l: `${q.d} cm`, inside: true }, { i: 4, l: `${q.nw} cm` }];
      return outline(V, labels, u);
    },
  },
  {
    id: 'area-cut-and-move', world: 'figures', band: '8-10', title: 'Area by cutting and moving',
    hook: 'A shape on squared paper has slanted edges. How can you count squares that are not whole?',
    idea: 'Cut and move: two half squares make one whole square — and a slanted triangle is its box minus the corner pieces.',
    why: [
      'Area does not change when you cut a shape up and move the pieces. A square cut along its diagonal gives two triangles that are each exactly half a square, so any two half squares can be slid together to fill one whole square. Count the whole squares, then pair up the halves.',
      'A triangle with slanted sides is harder to cut. So go the other way: draw the smallest rectangle around it, along the grid lines. The triangle fills the box except for some right-angled triangles in the corners — and each of those is exactly half of a little rectangle, which is easy to count.',
      'So the area of the slanted triangle is the box take away the corner pieces. No formula for slanted lines is needed, only rectangles and halves of rectangles — which is what cutting and moving always comes down to.',
    ],
    alg: 'shaded = whole squares + (half squares ÷ 2);  triangle = box − corner triangles',
    ex: { kind: 'halves', W: 6, H: 4, cells: [[1, 1, 0], [2, 1, 0], [3, 1, 0], [2, 2, 0], [1, 2, 3], [3, 2, 4], [0, 1, 2], [4, 1, 1]] },
    caseKey: 'kind',
    cases: [
      { label: 'Pair up half squares', note: 'Every diagonal cuts a square into two equal halves, so two shaded halves slide together into one whole square.',
        ex: { kind: 'halves', W: 6, H: 4, cells: [[1, 1, 0], [2, 1, 0], [3, 1, 0], [2, 2, 0], [1, 2, 3], [3, 2, 4], [0, 1, 2], [4, 1, 1]] } },
      { label: 'A slanted triangle', note: 'Draw the box round it along the grid lines. The corners left over are half-rectangles; take them away from the box.',
        ex: { kind: 'tri', W: 5, H: 4, a: 1, b: 2, gw: 7, gh: 6, ox: 1, oy: 1, fx: 0, fy: 0 } },
    ],
    gen(r, lv = 1) {
      if (lv === 1 || (lv === 2 && r() < 0.5)) {
        const W = int(5, 7, r), H = int(4, 6, r), want = lv === 1 ? int(4, 7, r) : int(7, 12, r), have = new Set([`${int(1, W - 2, r)},${int(1, H - 2, r)}`]);
        for (let i = 0; have.size < want && i < 400; i++) {
          const [c, rr] = pick([...have], r).split(',').map(Number), [dc, dr] = pick([[1, 0], [-1, 0], [0, 1], [0, -1]], r), nc = c + dc, nr = rr + dr;
          if (nc >= 0 && nc < W && nr >= 0 && nr < H) have.add(`${nc},${nr}`);
        }
        let cells = [...have].map((k) => [...k.split(',').map(Number), r() < (lv === 1 ? 0.35 : 0.5) ? int(1, 4, r) : 0]);
        if (cells.filter((c) => c[2]).length % 2) { const c = cells.find((x) => x[2]); c[2] = 0; }
        if (cells.filter((c) => c[2]).length < 2) { const full = cells.filter((c) => !c[2]); full[0][2] = int(1, 4, r); full[full.length - 1][2] = int(1, 4, r); }
        return this.q({ kind: 'halves', W, H, cells });
      }
      return fresh(() => {
        for (;;) {
          const W = int(3, 7, r), H = int(3, 6, r), a = lv === 2 ? 0 : int(1, H - 1, r), b = int(1, W - 1, r);
          if ((W * H - a * b) % 2) continue;
          const gw = W + int(1, 2, r), gh = H + int(1, 2, r);
          return this.q({ kind: 'tri', W, H, a, b, gw, gh, ox: int(0, gw - W, r), oy: int(0, gh - H, r), fx: int(0, 1, r), fy: int(0, 1, r) });
        }
      });
    },
    pieces(o) {
      if (o.kind === 'tri') {
        const P = [[0, 0], [o.W, o.a], [o.b, o.H]].map(([x, y]) => [o.ox + (o.fx ? o.W - x : x), o.oy + (o.fy ? o.H - y : y)]);
        return [P];
      }
      const halves = { 1: [[0, 0], [1, 0], [0, 1]], 2: [[0, 0], [1, 0], [1, 1]], 3: [[1, 0], [1, 1], [0, 1]], 4: [[0, 0], [1, 1], [0, 1]] };
      return o.cells.map(([c, r, t]) => (t ? halves[t] : [[0, 0], [1, 0], [1, 1], [0, 1]]).map(([x, y]) => [c + x, r + y]));
    },
    q(o) {
      // the shoelace rule over every shaded piece — a different route from counting squares
      const expr = `(()=>{const S=${JSON.stringify(this.pieces(o))};let A=0;for(const P of S){let s=0;for(let i=0;i<P.length;i++){const p=P[i],q=P[(i+1)%P.length];s+=p[0]*q[1]-q[0]*p[1];}A+=Math.abs(s)/2;}return A;})()`;
      if (o.kind === 'tri') {
        const box = o.W * o.H, corners = (o.W * o.a + o.b * o.H + (o.W - o.b) * (o.H - o.a)) / 2;
        return { ...o, box, corners, text: `A triangle has its corners where the lines of a ${o.gw} by ${o.gh} centimetre grid cross. What is its area, in square centimetres?`, expr, ans: box - corners };
      }
      const whole = o.cells.filter((c) => !c[2]).length, half = o.cells.length - whole;
      return { ...o, whole, half, text: `On a ${o.W} by ${o.H} grid of centimetre squares, some whole squares and some half squares are shaded. What is the total shaded area, in square centimetres?`,
        expr, ans: whole + half / 2 };
    },
    work(q) {
      const S = this.pieces(q);
      if (q.kind === 'tri') return [{ t: 'Area of the smallest rectangle round it (its box)', v: q.box, x: boxX(S[0]) }, { t: 'Add up the right-angled corner pieces of the box that are not shaded', v: q.corners, x: `${boxX(S[0])}-${shoeX(S[0])}` }, { t: 'The triangle: box take away the corners', v: q.ans }];
      const sq = S.filter((P) => P.length === 4), hf = S.filter((P) => P.length === 3);   // pieces as drawn: a square has 4 corners, a half 3
      return [{ t: 'Whole squares shaded', v: q.whole, x: `${JSON.stringify(sq)}.length` }, { t: 'Half squares shaded', v: q.half, x: `${JSON.stringify(hf)}.length` },
        { t: 'Pair the halves: whole squares they make', v: q.half / 2, x: hf.map(shoeX).join('+') }, { t: 'Area altogether', v: q.ans }];
    },
    geo(q) { return { kind: 'cutmove', form: q.kind, pieces: this.pieces(q), W: q.W, H: q.H, gw: q.gw || q.W, gh: q.gh || q.H }; },
    explain,
    draw(q) {
      const gw = q.kind === 'tri' ? q.gw : q.W, gh = q.kind === 'tri' ? q.gh : q.H, u = Math.min(36, Math.floor(Math.min(270 / gw, 220 / gh))), o = 6;
      const X = (x) => o + x * u, Y = (y) => o + (gh - y) * u;
      let s = `<rect x="${o}" y="${o}" width="${gw * u}" height="${gh * u}" class="dg-blank"/>`;
      for (let i = 1; i < gw; i++) s += L(X(i), Y(0), X(i), Y(gh), 'dg-grid');
      for (let j = 1; j < gh; j++) s += L(X(0), Y(j), X(gw), Y(j), 'dg-grid');
      for (const P of this.pieces(q)) s += PG(P.map(([x, y]) => [X(x), Y(y)]), 'dg-fill1');
      if (q.kind === 'tri') for (const [x, y] of this.pieces(q)[0]) s += `<circle cx="${X(x)}" cy="${Y(y)}" r="4" class="dg-dot"/>`;
      return svg(gw * u + 2 * o, gh * u + 2 * o, s, q.kind === 'tri' ? 'A triangle drawn on a centimetre grid' : 'A shape of whole and half squares on a grid');
    },
  },
  {
    id: 'dice-faces', world: 'figures', band: '8-10', title: 'Hidden dots on dice',
    hook: 'Four dice stand in a tower on a table. You can only see the top. How many dots are hidden?',
    idea: 'Opposite faces of a dice always add up to 7 — so every top-and-bottom pair is 7, whatever the dice shows.',
    why: [
      'A dice is made so that opposite faces add up to 7: 1 is opposite 6, 2 opposite 5, 3 opposite 4. So you never need to see the bottom. If the top shows 2, the bottom must be 5.',
      'In a tower, the hidden faces are the ones pressed together and the one on the table — the top and bottom of every dice except the very top face. Each dice\'s top and bottom make 7, so a tower of 4 dice has 4 × 7 = 28 dots on tops and bottoms. Only the top face is showing, so take it away: if it shows 3, then 28 − 3 = 25 dots are hidden. You did not need to know how any of the lower dice were turned.',
      'All six faces of one dice add up to 1 + 2 + 3 + 4 + 5 + 6 = 21. So walk round the tower and the dots you can see are the whole 21 for every dice, take away the hidden ones.',
    ],
    alg: 'top + bottom = 7;  hidden in a tower of n = 7n − top;  all faces of one dice = 21',
    ex: { mode: 'hidden', tops: [5, 1, 3], fronts: [1, 2, 5] },
    caseKey: 'mode',
    cases: [
      { label: 'Top and bottom', note: 'Opposite faces always make 7, so the bottom is 7 take away the top.',
        ex: { mode: 'bottom', tops: [2], fronts: [3] } },
      { label: 'Hidden in a tower', note: 'Every dice\'s top and bottom make 7. All of those are hidden except the one top face you can see.',
        ex: { mode: 'hidden', tops: [5, 1, 3], fronts: [1, 2, 5] } },
      { label: 'Seen from all round', note: 'Each dice has 21 dots in all. Take the hidden ones away from all the dots in the tower.',
        ex: { mode: 'visible', tops: [6, 4, 2, 5], fronts: [3, 1, 4, 3] } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const mode = lv === 1 ? 'bottom' : lv === 2 ? pick(['bottom', 'hidden', 'hidden'], r) : pick(['hidden', 'visible', 'visible'], r);
        const n = mode === 'bottom' ? 1 : lv === 2 ? int(2, 4, r) : int(3, 6, r);
        const tops = Array.from({ length: n }, () => int(1, 6, r));
        return this.q({ mode, tops, fronts: tops.map((t) => pick(sides(t), r)) });
      });
    },
    q(o) {
      const { mode, tops } = o, n = tops.length, t = tops[n - 1];
      // build every dice's six faces from the pairs table, then add the faces that are pressed together or on the table
      const build = `const D=${JSON.stringify(tops)}.map((u)=>{const O=${JSON.stringify(OPP)};return{top:u,bottom:O[u],side:[1,2,3,4,5,6].filter((v)=>v!==u&&v!==O[u])};});`;
      if (mode === 'bottom') return { ...o, text: `The top face of a dice shows ${t} ${plural(t, 'dot', 'dots')}. How many dots are on the bottom face?`, expr: `(()=>{${build}return D[0].bottom;})()`, ans: 7 - t };
      const hidden = `D.reduce((s,d,i)=>s+d.bottom+(i<D.length-1?d.top:0),0)`;
      if (mode === 'hidden') return { ...o, text: `${n} dice are stacked in a tower on a table. The top face shows ${t}. How many dots are hidden — on faces pressed together or against the table?`,
        expr: `(()=>{${build}return ${hidden};})()`, ans: 7 * n - t };
      return { ...o, text: `${n} dice are stacked in a tower on a table. The top face shows ${t}. Walking all the way round, how many dots can you see in total? (The faces pressed together, and the bottom, are hidden.)`,
        expr: `(()=>{${build}return D.reduce((s,d)=>s+d.side.reduce((a,b)=>a+b,0),0)+D[D.length-1].top;})()`, ans: 21 * n - (7 * n - t) };
    },
    work(q) {
      const n = q.tops.length, t = q.tops[n - 1];
      const pair = `${t}+${JSON.stringify(OPP)}[${t}]`;   // a face and the one opposite it, from the dice's own table
      if (q.mode === 'bottom') return [{ t: 'Opposite faces of a dice add up to', v: 7, x: pair }, { t: `The bottom: 7 − ${t}`, v: q.ans }];
      const tb = `${JSON.stringify(q.tops)}.reduce((s,u)=>s+u+${JSON.stringify(OPP)}[u],0)`;
      const h = [{ t: 'Top and bottom of any one dice add up to', v: 7, x: pair }, { t: `Tops and bottoms of all ${n} dice`, v: 7 * n, x: tb }, { t: 'Take away the top face you can see: hidden dots', v: 7 * n - t, x: `${tb}-${t}` }];
      if (q.mode === 'hidden') return h;
      return [{ t: 'All six faces of one dice: 1 + 2 + 3 + 4 + 5 + 6', v: 21, x: "H.fact('die-total')" }, { t: `All the faces of ${n} dice`, v: 21 * n, x: "H.n(TEXT,1)*H.fact('die-total')" }, h[2], { t: 'Dots you can see: all of them take away the hidden ones', v: q.ans }];
    },
    draw(q) { return diceTower(q.tops, q.fronts); },
  },
  {
    id: 'angle-chasing', world: 'figures', band: '8-10', title: 'Angle chasing',
    hook: 'A triangle has two equal sides and a 40° angle at the top. What are the other two angles — without a protractor?',
    idea: 'Chase from what you know: angles on a straight line make 180°, angles in a triangle make 180°, and equal sides face equal angles.',
    why: [
      'A straight line is half a turn, so the angles sitting along it add up to 180°. Tear the three corners off any paper triangle and they fit together along a straight line — so a triangle\'s angles add up to 180° too. Those two facts let you chase an unknown angle one step at a time.',
      'Stretch one side of a triangle past a corner. The outside angle and the inside angle next to it sit on a straight line, so they make 180° — and the inside three also make 180°. Take the same inside angle from both and you find a short cut: the outside angle equals the two far inside angles added together.',
      'A triangle with two equal sides (marked with little ticks) is its own mirror image down the middle, so the two angles at the ends of the third side are equal. If the top angle is 40°, the other two share 180° − 40° = 140°, so each is 70°. Put the facts in a chain and even a hard-looking diagram falls one angle at a time.',
    ],
    alg: 'line: a + b = 180°;  triangle: a + b + c = 180°;  outside angle = sum of the two far inside angles',
    ex: { kind: 'iso-base', a: 40 },
    caseKey: 'kind',
    cases: [
      { label: 'Along a straight line', note: 'The angles sitting on a straight line make 180°. Take away the ones you know.',
        ex: { kind: 'line', parts: [65, 0] } },
      { label: 'An outside angle', note: 'Find the third inside angle, then the angle beside it on the line. Or the short cut: add the two far inside angles.',
        ex: { kind: 'exterior', A: 70, B: 45 } },
      { label: 'Equal sides: base angles', note: 'The two bottom angles are equal. They share 180° minus the top angle, so halve what is left.',
        ex: { kind: 'iso-base', a: 40 } },
      { label: 'Equal sides: the top', note: 'Both bottom angles are given by one: double it, and the top angle is what is left of 180°.',
        ex: { kind: 'iso-apex', b: 65 } },
      { label: 'A chain of two steps', note: 'Use the equal sides to find a bottom angle, then the straight line to find the angle outside it.',
        ex: { kind: 'chain', a: 36 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) return this.q({ kind: 'line', parts: [int(25, 155, r), 0] });
        if (lv === 2) {
          const c = r();
          if (c < 0.3) { const a = int(30, 100, r); return this.q({ kind: 'line', parts: shuffle([a, int(20, 150 - a, r), 0], r) }); }
          if (c < 0.65) return this.q({ kind: 'iso-apex', b: int(30, 80, r) });
          return this.q({ kind: 'iso-base', a: 2 * int(15, 65, r) });
        }
        const c = r();
        if (c < 0.4) return this.q({ kind: 'chain', a: 2 * int(12, 60, r) });
        const A = int(30, 90, r); return this.q({ kind: 'exterior', A, B: int(25, Math.min(110, 155 - A), r) });
      });
    },
    /* the figure in maths coordinates (y up), built from the GIVEN angles only */
    shape(o) {
      if (o.kind === 'line') {
        const P = [[-1, 0], [1, 0]], O = [0, 0]; let a = 180; const rays = [];
        const parts = o.parts.map((p) => (p || 180 - o.parts.reduce((s, x) => s + x, 0)));
        parts.slice(0, -1).forEach((p) => { a -= p; rays.push([Math.cos(a * RAD), Math.sin(a * RAD)]); });
        return { O, P, rays, parts };
      }
      if (o.kind === 'exterior') {
        const A = o.A * RAD, B = o.B * RAD, Bp = [0, 0], Cp = [1, 0];
        const ab = Math.sin(Math.PI - A - B) / Math.sin(A);                    // side AB by the rule of sines
        const Ap = [ab * Math.cos(B), ab * Math.sin(B)];
        return { A: Ap, B: Bp, C: Cp, D: [1.55, 0] };
      }
      const apex = o.kind === 'iso-apex' ? 180 - 2 * o.b : o.a, h = 1 / Math.tan((apex / 2) * RAD) / 2;
      return { A: [0.5, h], B: [0, 0], C: [1, 0], D: [1.5, 0] };
    },
    q(o) {
      const S = this.shape(o);
      if (o.kind === 'line') {
        const given = o.parts.filter((p) => p), all = [S.P[0], ...S.rays, S.P[1]], i = o.parts.indexOf(0);
        const x = Math.round(measure(all[i], S.O, all[i + 1]));
        return { ...o, text: given.length === 1 ? `Two angles sit side by side on a straight line. One is ${given[0]}°. What is the other one, in degrees?`
          : `Three angles sit side by side on a straight line. Two of them are ${given[0]}° and ${given[1]}°. What is the third, in degrees?`,
        expr: `${x}`, ans: 180 - given.reduce((s, v) => s + v, 0) };
      }
      if (o.kind === 'exterior') return { ...o, text: `In triangle ABC, angle A is ${o.A}° and angle B is ${o.B}°. Side BC is stretched past C to D. What is angle ACD, in degrees?`,
        expr: `${Math.round(measure(S.A, S.C, S.D))}`, ans: o.A + o.B };
      if (o.kind === 'iso-base') return { ...o, text: `Triangle ABC has AB = AC, and the angle at A is ${o.a}°. What is the angle at B, in degrees?`,
        expr: `${Math.round(measure(S.A, S.B, S.C))}`, ans: (180 - o.a) / 2 };
      if (o.kind === 'iso-apex') return { ...o, text: `Triangle ABC has AB = AC, and the angle at B is ${o.b}°. What is the angle at A, in degrees?`,
        expr: `${Math.round(measure(S.B, S.A, S.C))}`, ans: 180 - 2 * o.b };
      return { ...o, text: `Triangle ABC has AB = AC, and angle A is ${o.a}°. Side BC is stretched past C to D. What is angle ACD, in degrees?`,
        expr: `${Math.round(measure(S.A, S.C, S.D))}`, ans: 180 - (180 - o.a) / 2 };
    },
    work(q) {
      if (q.kind === 'line') {
        const g = q.parts.filter((p) => p), s = [{ t: 'Angles on a straight line add up to', v: 180, x: "H.fact('straight-angle')" }];
        if (g.length > 1) s.push({ t: 'Add the angles you know', v: g[0] + g[1], x: `${g[0]}+${g[1]}` });
        s.push({ t: 'Take that from 180', v: q.ans });
        return s;
      }
      if (q.kind === 'exterior') return [{ t: `The third angle inside, at C: 180 − ${q.A} − ${q.B}`, v: 180 - q.A - q.B, x: `180-${q.A}-${q.B}` }, { t: 'Angle ACD is on a straight line with it: 180 − that', v: q.ans }];
      if (q.kind === 'iso-base') return [{ t: `The two bottom angles share 180 − ${q.a}`, v: 180 - q.a, x: `180-${q.a}` }, { t: 'They are equal, so halve it', v: q.ans }];
      if (q.kind === 'iso-apex') return [{ t: `The two equal bottom angles: ${q.b} × 2`, v: 2 * q.b, x: `${q.b}+${q.b}` }, { t: 'The top angle: 180 take away that', v: q.ans }];
      const b = (180 - q.a) / 2;
      return [{ t: `The two bottom angles share 180 − ${q.a}`, v: 180 - q.a, x: `180-${q.a}` }, { t: 'Each bottom angle (they are equal)', v: b, x: `(180-${q.a})/2` }, { t: 'Angle ACD is on a straight line with angle C: 180 − that', v: q.ans }];
    },
    draw(q) {
      const S = this.shape(q);
      if (q.kind === 'line') {
        const f = fitter([S.P[0], S.P[1], [0, 0.85]], 260, 30), O = f(S.O), ends = [S.P[0], ...S.rays.map(([x, y]) => [x * 0.85, y * 0.85]), S.P[1]].map(f);
        let s = L(...f(S.P[0]), ...f(S.P[1]));
        S.rays.forEach((_, i) => { s += L(...O, ...ends[i + 1]); });
        S.parts.forEach((p, i) => { s += mark(ends[i], O, ends[i + 1], q.parts[i] ? `${p}°` : '?', 22 + (i % 2) * 8, q.parts[i] ? 'dg-text' : 'dg-accent'); });
        s += `<circle cx="${R2(O[0])}" cy="${R2(O[1])}" r="4" class="dg-dot"/>`;
        return svg(R2(f.w), R2(f.h - 15), s, 'Angles on a straight line');
      }
      const pts = [S.A, S.B, S.C, ...(S.D && (q.kind === 'exterior' || q.kind === 'chain') ? [S.D] : [])], f = fitter(pts, 230, 44);
      const [A, B, C] = [S.A, S.B, S.C].map(f), cen = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
      let s = PG([A, B, C], 'dg-fill2');
      if (pts.length === 4) { const D = f(S.D); s += L(...C, ...D) + T(D[0] + 4, D[1] + 22, 'D'); }
      s += vLabel(A, cen, 'A') + vLabel(B, cen, 'B') + vLabel(C, cen, 'C');
      if (q.kind === 'exterior') { s += mark(B, A, C, `${q.A}°`, 26, 'dg-text') + mark(C, B, A, `${q.B}°`, 26, 'dg-text') + mark(A, C, f(S.D), '?', 24); }
      else {
        s += tick(A, B) + tick(A, C);
        if (q.kind === 'iso-base') s += mark(B, A, C, `${q.a}°`, 24, 'dg-text') + mark(C, B, A, '?', 24);
        if (q.kind === 'iso-apex') s += mark(C, B, A, `${q.b}°`, 24, 'dg-text') + mark(B, A, C, '?', 24);
        if (q.kind === 'chain') s += mark(B, A, C, `${q.a}°`, 24, 'dg-text') + mark(A, C, f(S.D), '?', 24);
      }
      return svg(R2(f.w), R2(f.h), s, 'A triangle with some angles marked');
    },
  },
  {
    id: 'painted-cubes', world: 'figures', band: '8-10', title: 'The painted cube',
    hook: 'A big cube is painted red, then cut into 64 little cubes. How many little cubes have paint on exactly two faces?',
    idea: 'Where a little cube sits decides its paint: corners have 3 faces painted, edges 2, the middle of a face 1, and the inside none.',
    why: [
      'Think about where each little cube was. A cube at a corner of the big cube touched three outside faces, so it has three painted faces — and a cube has 8 corners, so there are always exactly 8 of those, whatever the size.',
      'A cube along an edge, but not at its ends, touched two outside faces. Each edge of a 4 × 4 × 4 cube has 4 little cubes, and the two at the ends are corners, so 2 are left on each edge. A cube has 12 edges: 12 × 2 = 24 cubes with two painted faces. A cube in the middle of a face, away from every edge, has one painted face: a 2 by 2 square of them on each of the 6 faces, 6 × 4 = 24.',
      'The rest were hidden inside and have no paint at all. Peel one layer off every side of the big cube and they form a smaller cube, 2 less along each edge: 2 × 2 × 2 = 8. Check it: 8 + 24 + 24 + 8 = 64, every little cube counted once.',
    ],
    alg: 'n × n × n cube: 3 faces → 8;  2 faces → 12(n − 2);  1 face → 6(n − 2)²;  0 faces → (n − 2)³',
    ex: { a: 4, b: 4, c: 4, k: 2 },
    caseKey: 'k',
    cases: [
      { label: 'Three faces: corners', note: 'Only a corner cube touches three outside faces, and every cube has 8 corners — so the answer is 8 for any size.',
        ex: { a: 3, b: 3, c: 3, k: 3 } },
      { label: 'Two faces: edges', note: 'Edge cubes, but not the corner ones at each end: n − 2 on every edge, and a cube has 12 edges.',
        ex: { a: 4, b: 4, c: 4, k: 2 } },
      { label: 'One face: face middles', note: 'Cubes in the middle of a face, away from every edge: an (n − 2) by (n − 2) square on each of the 6 faces.',
        ex: { a: 4, b: 4, c: 4, k: 1 } },
      { label: 'No paint: the inside', note: 'Peel a layer off every side. What is left is a smaller cube, 2 shorter along every edge.',
        ex: { a: 5, b: 5, c: 5, k: 0 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) return this.q({ a: 3, b: 3, c: 3, k: int(0, 3, r) });
        if (lv === 2) { const n = int(4, 5, r); return this.q({ a: n, b: n, c: n, k: int(0, 3, r) }); }
        if (r() < 0.35) { const n = int(6, 8, r); return this.q({ a: n, b: n, c: n, k: int(0, 2, r) }); }
        const d = shuffle([int(3, 4, r), int(4, 6, r), int(5, 7, r)], r); return this.q({ a: d[0], b: d[1], c: d[2], k: int(0, 2, r) });
      });
    },
    q(o) {
      const { a, b, c, k } = o, cube = a === b && b === c, N = a * b * c, A = a - 2, B = b - 2, C = c - 2;
      const ans = k === 3 ? 8 : k === 2 ? 4 * (A + B + C) : k === 1 ? 2 * (A * B + B * C + A * C) : A * B * C;
      const what = k === 0 ? 'no paint at all' : `exactly ${k} painted ${plural(k, 'face', 'faces')}`;
      // visit every little cube and count how many outside faces it touched
      const expr = `(()=>{let n=0;for(let x=0;x<${a};x++)for(let y=0;y<${b};y++)for(let z=0;z<${c};z++){const f=(x===0)+(x===${a - 1})+(y===0)+(y===${b - 1})+(z===0)+(z===${c - 1});if(f===${k})n++;}return n;})()`;
      return { ...o, cube, text: cube ? `A ${a}×${a}×${a} cube is painted on the outside, then cut into ${N} little cubes. How many little cubes have ${what}?`
        : `A ${a}×${b}×${c} block is painted on the outside, then cut into ${N} little cubes. How many little cubes have ${what}?`, expr, ans };
    },
    work(q) {
      const { a, b, c, k, cube } = q, A = a - 2, B = b - 2, C = c - 2;
      const faceCorners = (p, r) => `(()=>{let n=0;for(let x=0;x<${p};x++)for(let y=0;y<${r};y++)if((x===0||x===${p - 1})&&(y===0||y===${r - 1}))n++;return n;})()`;   // visit the face's little cubes
      if (k === 3) return [{ t: 'Corners on the top face of the big block', v: 4, x: faceCorners(a, b) }, { t: 'Corners on the bottom face', v: 4, x: faceCorners(a, b) }, { t: 'Only corner cubes touch three faces', v: 8 }];
      if (cube) {
        const n = a, m = n - 2;
        // a cube's 8 corners are the numbers 0–7 in binary; an edge joins two that differ in one place
        const edges = '(()=>{let e=0;for(let i=0;i<8;i++)for(let j=i+1;j<8;j++){const d=i^j;if((d&(d-1))===0)e++;}return e;})()';
        if (k === 2) return [{ t: `Little cubes on one edge, leaving out the 2 corners: ${n} − 2`, v: m, x: `${n}-2` }, { t: 'Edges on a cube', v: 12, x: edges }, { t: `${m} × 12`, v: q.ans }];
        if (k === 1) return [{ t: `Away from the edges, one side of a face is ${n} − 2 long`, v: m, x: `${n}-2` }, { t: 'One-face cubes on one face', v: m * m, x: `(${n}-2)*(${n}-2)` }, { t: 'Faces on a cube', v: 6, x: '3*2' }, { t: `${m * m} × 6`, v: q.ans }];
        return [{ t: `Peel a layer off every side: the inside cube is ${n} − 2 long`, v: m, x: `${n}-2` }, { t: `${m} × ${m} × ${m}`, v: q.ans }];
      }
      if (k === 2) return [{ t: `4 edges are ${a} long: 4 × (${a} − 2)`, v: 4 * A, x: `4*(${a}-2)` }, { t: `4 edges are ${b} long: 4 × (${b} − 2)`, v: 4 * B, x: `4*(${b}-2)` }, { t: `4 edges are ${c} long: 4 × (${c} − 2)`, v: 4 * C, x: `4*(${c}-2)` }, { t: 'All the two-face cubes', v: q.ans }];
      if (k === 1) return [{ t: `Two faces ${a} by ${b}: 2 × ${A} × ${B}`, v: 2 * A * B, x: `2*(${a}-2)*(${b}-2)` }, { t: `Two faces ${b} by ${c}: 2 × ${B} × ${C}`, v: 2 * B * C, x: `2*(${b}-2)*(${c}-2)` }, { t: `Two faces ${a} by ${c}: 2 × ${A} × ${C}`, v: 2 * A * C, x: `2*(${a}-2)*(${c}-2)` }, { t: 'All the one-face cubes', v: q.ans }];
      return [{ t: `Peel a layer off: the inside block's bottom is ${A} by ${B}`, v: A * B, x: `(${a}-2)*(${b}-2)` }, { t: `Its height is ${c} − 2, so the inside block holds`, v: q.ans }];
    },
    geo(q) { return { kind: 'paint', a: q.a, b: q.b, c: q.c, k: q.k }; },
    explain,
    draw(q) { return ruledBlock(q.a, q.b, q.c); },
  },
];

/* ------------------------------------------------------------------ stories */

