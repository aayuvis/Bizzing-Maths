/* geo3d.js — the geometry explainers: area that moves and volume in 3D.

   A static picture says WHAT a shape is; these say WHY its rule holds, by doing the thing
   the stop's "why" describes — rows of squares filling a rectangle, a parallelogram's end
   sliding across, a triangle and its turned copy, a box filled layer by layer and turned
   round, a net unfolding, a wheel rolling one turn. Each is built from the stop's OWN
   question (q.a, q.b…), so the picture is always the question's, never a generic one.

   Pure: a spec in, SVG strings out. The DOM player (geo3d-play.js) only asks for the frame
   at time t; it arrives on first need, and this file travels with the stops' code
   (chapters/full.js) and the Formula Book — never the first screen (rule 30).

   Two modes, and the difference is rule 3. 'full' shows every count the animation makes.
   'ask' is the same motion with only the numbers the question already shows: anything the
   picture works out is a '?', so a child who has not answered yet is never handed the
   answer (test/geo3d.mjs reads every frame's text to hold it to that).

   Every model also MEASURES its answer from its own geometry — cells counted, cubes
   placed, pieces' areas by the shoelace rule, a rolled trail measured in diameters — and
   test/geo3d.mjs checks that number against q.ans and every step of work(q) (rule 1). */
import { icon } from './icons.js';

/* ------------------------------------------------------------ small helpers */

const R1 = (x) => Math.round(x * 10) / 10;
const R2 = (x) => Math.round(x * 100) / 100;
const R4 = (x) => Math.round(x * 1e4) / 1e4;
const fmt = (v) => (typeof v === 'number' ? String(R4(v)) : String(v));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const lerp = (a, b, p) => a + (b - a) * p;
const cl = (p) => (p < 0 ? 0 : p > 1 ? 1 : p);
const ease = (p) => { p = cl(p); return p * p * (3 - 2 * p); };
const seg = (p, a, b) => cl((p - a) / (b - a));          // progress of a sub-interval [a,b] of a step
const ptsS = (P) => P.map(([x, y]) => `${R1(x)},${R1(y)}`).join(' ');
const PG = (P, cls, extra = '') => `<polygon points="${ptsS(P)}" class="${cls}"${extra}/>`;
const LN = (a, b, cls, extra = '') => `<line x1="${R1(a[0])}" y1="${R1(a[1])}" x2="${R1(b[0])}" y2="${R1(b[1])}" class="${cls}"${extra}/>`;
const TX = (x, y, s, cls = 'g3-t', anchor = 'middle') => `<text x="${R1(x)}" y="${R1(y)}" class="${cls}" text-anchor="${anchor}">${esc(s)}</text>`;
const CIRC = (c, r, cls) => `<circle cx="${R1(c[0])}" cy="${R1(c[1])}" r="${R1(r)}" class="${cls}"/>`;
const shoe = (P) => Math.abs(P.reduce((a, p, i) => { const q = P[(i + 1) % P.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
const rotP = ([x, y], [cx, cy], a) => { const c = Math.cos(a), s = Math.sin(a), dx = x - cx, dy = y - cy; return [cx + dx * c - dy * s, cy + dx * s + dy * c]; };
const bbox = (Ps) => { const all = Ps.flat(); const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
const perim = (P) => P.reduce((a, p, i) => a + Math.hypot(P[(i + 1) % P.length][0] - p[0], P[(i + 1) % P.length][1] - p[1]), 0);
const inPoly = ([x, y], P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const sum = (a) => a.reduce((x, y) => x + y, 0);

/* the two voices of a label: a GIVEN number (the question shows it already) and a DERIVED one
   (the picture works it out) — which 'ask' mode hides */
function voice(mode) { const ask = mode === 'ask'; return { ask, g: fmt, d: (v) => (ask ? '?' : fmt(v)), c: (full, asked) => (ask ? asked : full) }; }

/* a 2D frame: model units into a box of at most mw × mh, with room round it for labels */
function fit([x0, y0, x1, y1], { mw = 320, mh = 210, l = 40, r = 30, t = 30, b = 30, flip = false, umax = 34 } = {}) {
  const u = Math.min(umax, mw / Math.max(1e-9, x1 - x0), mh / Math.max(1e-9, y1 - y0));
  const X = (x) => l + (x - x0) * u, Y = (y) => (flip ? t + (y1 - y) * u : t + (y - y0) * u);
  return { u, X, Y, P: (P) => P.map(([x, y]) => [X(x), Y(y)]), w: Math.ceil(l + (x1 - x0) * u + r), h: Math.ceil(t + (y1 - y0) * u + b) };
}
/* unit squares inside the box [x0,x1]×[y0,y1] (whole units) drawn as a light grid */
function unitGrid(F, x0, y0, x1, y1, cls = 'g3-grid') {
  let s = '';
  for (let x = Math.ceil(x0 + 1e-9); x < x1 - 1e-9; x++) s += LN([F.X(x), F.Y(y0)], [F.X(x), F.Y(y1)], cls);
  for (let y = Math.ceil(y0 + 1e-9); y < y1 - 1e-9; y++) s += LN([F.X(x0), F.Y(y)], [F.X(x1), F.Y(y)], cls);
  return s;
}

/* ------------------------------------------------------------ 3D */

/* y is up. yaw turns round the upright axis, pitch tips the top towards you. depth: larger is nearer. */
function camera(yaw, pitch, s, cx, cy, centre = [0, 0, 0]) {
  const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const rot = ([x, y, z]) => { x -= centre[0]; y -= centre[1]; z -= centre[2]; const x1 = x * cyw - z * syw, z1 = x * syw + z * cyw; return [x1, y * cp - z1 * sp, y * sp + z1 * cp]; };
  const dir = ([x, y, z]) => { const x1 = x * cyw - z * syw, z1 = x * syw + z * cyw; return [x1, y * cp - z1 * sp, y * sp + z1 * cp]; };
  return { rot, dir, P: (p) => { const r = rot(p); return [cx + r[0] * s, cy - r[1] * s, r[2]]; } };
}
/* painter's order: farthest face first; a face turned away is dropped when cull is set */
function paint(cam, faces) {
  const out = [];
  for (const f of faces) {
    if (f.n && cam.dir(f.n)[2] <= 1e-6) continue;
    const P = f.p.map(cam.P);
    out.push({ z: sum(P.map((q) => q[2])) / P.length + (f.dz || 0), s: PG(P.map((q) => [q[0], q[1]]), f.cls, f.extra || '') });
  }
  return out.sort((a, b) => a.z - b.z).map((x) => x.s).join('');
}
const N6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
/* the four corners of a unit cube's face along normal n, the cube's low corner at [x,y,z] */
function cubeFace([x, y, z], n) {
  const [a, b, c] = n, X = x + (a > 0 ? 1 : 0), Y = y + (b > 0 ? 1 : 0), Z = z + (c > 0 ? 1 : 0);
  if (a) return [[X, y, z], [X, y + 1, z], [X, y + 1, z + 1], [X, y, z + 1]];
  if (b) return [[x, Y, z], [x + 1, Y, z], [x + 1, Y, z + 1], [x, Y, z + 1]];
  return [[x, y, Z], [x + 1, y, Z], [x + 1, y + 1, Z], [x, y + 1, Z]];
}
const shade = (n) => (n[1] > 0 ? 't' : n[0] ? 's' : n[2] ? 'f' : 's');
/* cubes: [{c:[i,j,k], at:[x,y,z] (drawn position), g (group: a face shared within a group is hidden), cls}] */
function cubeFaces(cubes) {
  const key = (g, c) => `${g}|${c[0]},${c[1]},${c[2]}`, have = new Set(cubes.map((q) => key(q.g || 0, q.c)));
  const faces = [];
  for (const q of cubes) for (const n of N6) {
    if (have.has(key(q.g || 0, [q.c[0] + n[0], q.c[1] + n[1], q.c[2] + n[2]]))) continue;
    faces.push({ p: cubeFace(q.at || q.c, n), n, cls: `g3-f ${q.cls}-${shade(n)}` });
  }
  return faces;
}
/* the twelve edges of the box [0,l]×[0,h]×[0,w] */
function boxEdges(cam, l, h, w, cls) {
  const V = [[0, 0, 0], [l, 0, 0], [l, 0, w], [0, 0, w], [0, h, 0], [l, h, 0], [l, h, w], [0, h, w]], E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  return E.map(([a, b]) => LN(cam.P(V[a]), cam.P(V[b]), cls)).join('');
}
/* a label placed next to a 3D point, nudged on screen */
const label3 = (cam, p, s, dx = 0, dy = 0, cls = 'g3-t', anchor = 'middle') => { const q = cam.P(p); return TX(q[0] + dx, q[1] + dy, s, cls, anchor); };

/* ================================================================ the explainers */

/* --- rows: a rectangle filled row by row (area = rows × squares in a row) --- */
function rows(sp, mode) {
  const { W, H, find = 'area', unit = 'cm' } = sp, A = W * H, { g, d, c } = voice(mode), count = find === 'count';
  const gw = count ? sp.cols : W, gh = count ? sp.rows : H, c0 = count ? sp.c0 : 0, r0 = count ? sp.r0 : 0;
  const wv = count ? d : g, hv = find === 'area' ? g : d;
  const F = fit([0, 0, gw, gh], { mw: 290, mh: 200, l: count ? 30 : 58, r: 24, t: 30, b: 16, umax: 30 });
  const cells = []; for (let r = 0; r < H; r++) for (let k = 0; k < W; k++) cells.push([c0 + k, r0 + r]);
  const steps = [count ? c('Some squares are shaded. Count them a quicker way: in rows.', 'Some squares are shaded. Count them in rows.')
    : find === 'side' ? `An area of ${g(A)} ${unit}² and a length of ${g(W)} ${unit}. Fill it with rows of ${g(W)} squares.` : `A rectangle ${g(W)} ${unit} long and ${g(H)} ${unit} wide. Cover it with 1 ${unit} squares.`];
  for (let k = 1; k <= H; k++) {
    if (find === 'side') steps.push(c(`Row ${k}: ${k * W} of the ${A} squares used`, `Another row of ${g(W)}`));
    else steps.push(c(k === 1 ? `One row holds ${W} squares` : `${k} rows: ${k} × ${W} = ${k * W}`, k === 1 ? 'One row of squares' : 'Another row, just the same'));
  }
  steps.push(find === 'side' ? c(`${A} ÷ ${W} = ${H} rows, so it is ${H} ${unit} wide`, 'How many rows of the length fit?')
    : count ? c(`${H} rows of ${W}: ${W} × ${H} = ${A} squares`, 'How many squares altogether?')
      : c(`${H} rows of ${W}: ${W} × ${H} = ${A} ${unit}²`, `${g(H)} rows of ${g(W)}: how many squares?`));
  const answer = find === 'side' ? (() => { let k = 0, used = 0; while (used < A) { used += cells.slice(k * W, k * W + W).length; k++; } return k; })() : cells.length;
  const draw = (t) => {
    const i = Math.floor(t), p = t - i;
    let s = '';
    if (count) for (let r = 0; r < gh; r++) for (let k = 0; k < gw; k++) s += `<rect x="${R1(F.X(k))}" y="${R1(F.Y(r))}" width="${R1(F.u)}" height="${R1(F.u)}" class="g3-cell0"/>`;
    else s += `<rect x="${R1(F.X(0))}" y="${R1(F.Y(0))}" width="${R1(W * F.u)}" height="${R1(H * F.u)}" class="g3-cell0"/>` + unitGrid(F, 0, 0, W, H);
    const full = Math.min(H, i), part = i < H ? Math.ceil(ease(p) * W) : 0;
    if (count) for (const [x, y] of cells) s += `<rect x="${R1(F.X(x))}" y="${R1(F.Y(y))}" width="${R1(F.u)}" height="${R1(F.u)}" class="dg-fill2"/>`;
    cells.forEach(([x, y], n) => {
      const r = Math.floor(n / W), k = n % W;
      if (!(r < full || (r === full && k < part))) return;
      const hot = i <= H && (r === full || (!part && r === full - 1));
      s += `<rect x="${R1(F.X(x))}" y="${R1(F.Y(y))}" width="${R1(F.u)}" height="${R1(F.u)}" class="${hot ? 'g3-hot' : 'dg-fill1'}"/>`;
    });
    s += `<rect x="${R1(F.X(c0))}" y="${R1(F.Y(r0))}" width="${R1(W * F.u)}" height="${R1(H * F.u)}" class="g3-edge"/>`;
    // the rows, numbered as they fill — in full mode only: for some questions the number of rows IS the answer
    if (mode !== 'ask') for (let r = 0; r < Math.min(H, full + (part ? 1 : 0)); r++) s += TX(F.X(c0 + W) + 8, F.Y(r0 + r) + F.u / 2 + 5, String(r + 1), 'g3-small', 'start');
    if (!count) {
      s += TX(F.X(W / 2), F.Y(0) - 10, `${wv(W)} ${unit}`);
      s += TX(F.X(0) - 8, F.Y(H / 2) + 5, `${find === 'side' && i <= H ? '?' : hv(H)} ${unit}`, find === 'side' ? 'g3-ta' : 'g3-t', 'end');
    } else if (i > H || (i === H && p > 0)) s += TX(F.X(c0 + W / 2), F.Y(r0) - 8, d(W), 'g3-ta');
    return { w: F.w, h: F.h, s };
  };
  return { steps, draw, answer, counted: [...Array(H + 1).keys()].flatMap((k) => [k, k * W]) };
}

/* --- walk: round the edge, side by side (perimeter); an L-shape's corner pushed out --- */
function walk(sp, mode) {
  const { shape, W, H, w1 = 0, h1 = 0, unit = 'cm' } = sp, { g, d, c } = voice(mode), L = shape === 'L';
  const P0 = L ? [[0, 0], [w1, 0], [w1, H - h1], [W, H - h1], [W, H], [0, H]] : [[0, 0], [W, 0], [W, H], [0, H]];
  const len = P0.map((p, i) => Math.hypot(P0[(i + 1) % P0.length][0] - p[0], P0[(i + 1) % P0.length][1] - p[1]));
  const lab = L ? [g(w1), d(H - h1), d(W - w1), g(h1), g(W), g(H)] : shape === 'square' ? [g(W), g(W), g(W), g(W)] : [g(W), g(H), g(W), g(H)];
  const given = L ? [1, 0, 0, 1, 1, 1] : [1, 1, 1, 1];
  const n = P0.length, Ptot = sum(len);
  const steps = [L ? 'An L-shape. Two of its six sides are not marked.' : shape === 'square' ? `A square with sides of ${g(W)} ${unit}. Walk all the way round.` : `A rectangle ${g(W)} ${unit} by ${g(H)} ${unit}. Walk all the way round.`];
  let run = 0;
  len.forEach((x, i) => {
    run += x;
    if (L && i === 1) steps.push(c(`This side is ${H} − ${h1} = ${H - h1}`, 'This side is not marked: the full height take away the bottom strip'));
    else if (L && i === 2) steps.push(c(`This side is ${W} − ${w1} = ${W - w1}`, 'Neither is this one: the full width take away the top'));
    else if (!L && shape !== 'square' && i === 1) steps.push(c(`${W} + ${H} = ${W + H}: one length and one width is halfway round`, 'One length and one width: halfway round'));
    else if (!L && i === n - 1) steps.push(shape === 'square' ? c(`4 sides of ${W}: 4 × ${W} = ${4 * W} ${unit}`, `4 sides of ${g(W)}: how far round?`) : c(`Two of each: 2 × ${W + H} = ${2 * (W + H)} ${unit}`, 'The other half is the same again'));
    else steps.push(c(shape === 'square' ? `Side ${i + 1}: ${R4(run)} ${unit} so far` : `Along ${fmt(x)} ${unit}: ${R4(run)} ${unit} so far`, 'Along the next side'));
  });
  if (L) { steps.push(c(`All six sides: ${Ptot} ${unit}`, 'Add all six sides')); steps.push(c(`Push the cut corner out: a ${W} by ${H} rectangle, 2 × (${W} + ${H}) = ${2 * (W + H)}`, `Push the cut corner out: a ${g(W)} by ${g(H)} rectangle`)); }
  const F = fit([0, 0, W, H], { mw: 260, mh: 180, l: 64, r: 64, t: 32, b: 32, umax: 30 });
  const draw = (t) => {
    const i = Math.floor(t), p = t - i;
    const push = L ? (i >= n + 2 ? 1 : i === n + 1 ? ease(p) : 0) : 0;
    const X1 = lerp(w1, W, push), Y1 = lerp(H - h1, 0, push);
    const P = L ? [[0, 0], [X1, 0], [X1, Y1], [W, Y1], [W, H], [0, H]] : P0;
    let s = '';
    if (L && push > 0) s += PG(F.P([[0, 0], [W, 0], [W, H], [0, H]]), 'g3-ghost');
    s += PG(F.P(P), 'dg-fill2');
    const done = Math.min(n, i);
    for (let k = 0; k < done; k++) s += LN(F.P([P[k]])[0], F.P([P[(k + 1) % n]])[0], 'g3-trace');
    if (i < n && (i > 0 || p > 0)) { const a = P[i], b = P[(i + 1) % n], e = ease(p), m = [lerp(a[0], b[0], e), lerp(a[1], b[1], e)]; s += LN(F.P([a])[0], F.P([m])[0], 'g3-trace') + CIRC(F.P([m])[0], 7, 'g3-dot'); }
    if (push > 0) s += TX(F.X(W / 2), F.Y(0) - 9, `${g(W)} ${unit}`, 'g3-ta') + TX(F.X(W) + 9, F.Y(H / 2) + 5, `${g(H)} ${unit}`, 'g3-ta', 'start');
    if (push === 0) P.forEach((a, k) => {
      if (!given[k] && k >= done && !(k === i && p > 0.6)) return;
      const b = P[(k + 1) % n], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, horiz = a[1] === b[1];
      const out = horiz ? (my <= H / 2 + 1e-9 && !(L && k === 2) ? -1 : 1) : (mx >= W / 2 && !(L && k === 1) ? 1 : -1);
      const [sx, sy] = F.P([[mx, my]])[0];
      s += horiz ? TX(sx, sy + (out < 0 ? -9 : 20), `${lab[k]} ${unit}`, given[k] ? 'g3-t' : 'g3-ta') : TX(sx + out * 9, sy + 5, `${lab[k]} ${unit}`, given[k] ? 'g3-t' : 'g3-ta', out > 0 ? 'start' : 'end');
    });
    return { w: F.w, h: F.h, s };
  };
  return { steps, draw, answer: Ptot, counted: len.map((_, i) => R4(sum(len.slice(0, i + 1)))).concat([W + H]) };
}

/* --- push: a staircase's steps slid out to the corner (perimeter = the rectangle's) --- */
function push(sp, mode) {
  const { form: kind, W, H, V, unit = 'cm' } = sp, { g, d, c } = voice(mode), n = V.length, Ptot = perim(V);
  const sides = V.map((a, i) => [a, V[(i + 1) % n]]);
  const across = sides.map(([a, b], i) => ({ i, a, b })).filter(({ a, b }) => a[1] === b[1]);
  const up = sides.map(([a, b], i) => ({ i, a, b })).filter(({ a, b }) => a[0] === b[0]);
  const steps = [kind === 'notch' ? `A ${g(W)} by ${g(H)} rectangle with a slot cut into its top.` : kind === 'pieces' ? 'A staircase with every step marked.' : `A staircase ${g(W)} ${unit} wide and ${g(H)} ${unit} tall.`];
  if (kind === 'notch') {
    steps.push(c(`The slot's bottom slides up into the gap. Across: 2 × ${W} = ${2 * W}`, 'The slot\'s bottom slides up into the gap'));
    steps.push(c(`Up and down: the two sides, 2 × ${H} = ${2 * H}`, 'Up and down: the two sides'));
    steps.push(c(`The slot's two walls cannot slide out: 2 × ${sp.d} = ${2 * sp.d}`, 'The slot\'s two walls cannot slide out'));
    steps.push(c(`${2 * W} + ${2 * H} + ${2 * sp.d} = ${Ptot} ${unit}`, 'Add them all'));
  } else if (kind === 'pieces') {
    steps.push(c(`Slide the across pieces up: ${sp.ws.join(' + ')} = ${W}, as wide as the bottom`, `Slide the across pieces up: ${sp.ws.map(g).join(' + ')}`));
    steps.push(c(`Slide the up pieces across: ${sp.hs.join(' + ')} = ${H}, as tall as the left`, `Slide the up pieces across: ${sp.hs.map(g).join(' + ')}`));
    steps.push(c(`A ${W} by ${H} rectangle: 2 × (${W} + ${H}) = ${Ptot} ${unit}`, 'Now it is a rectangle: how far round?'));
  } else {
    steps.push(c(`Slide the across pieces up to the top: with the bottom, 2 × ${W} = ${2 * W}`, 'Slide the across pieces up to the top'));
    steps.push(c(`Slide the up pieces across: with the left side, 2 × ${H} = ${2 * H}`, 'Slide the up pieces across to the side'));
    steps.push(c(`${2 * W} + ${2 * H} = ${Ptot} ${unit}`, 'Now it is a rectangle: how far round?'));
  }
  const F = fit([0, 0, W, H], { mw: 260, mh: 180, l: 56, r: 56, t: 30, b: 30, flip: true, umax: 30 });
  const S = (p) => F.P([p])[0];
  const draw = (t) => {
    const i = Math.floor(t), p = t - i, e1 = i >= 1 ? 1 : ease(p), e2 = i >= 2 ? 1 : i === 1 ? ease(p) : 0;
    let s = PG(F.P([[0, 0], [W, 0], [W, H], [0, H]]), 'g3-ghost') + PG(F.P(V), 'dg-fill2');
    for (const { a, b } of across) {
      const edge = a[1] === 0 || a[1] === H, slot = kind === 'notch' && a[1] === H - sp.d && !edge;
      const y = edge ? a[1] : lerp(a[1], H, slot || kind !== 'notch' ? e1 : 0);
      s += LN(S([a[0], y]), S([b[0], y]), edge ? 'g3-trace' : e1 > 0 && (slot || kind !== 'notch') ? 'g3-move' : 'g3-line');
    }
    for (const { a, b } of up) {
      const edge = a[0] === 0 || a[0] === W, wall = kind === 'notch' && !edge;
      const x = edge || wall ? a[0] : lerp(a[0], W, e2);
      s += LN(S([x, a[1]]), S([x, b[1]]), wall ? (i >= 3 || (i === 2 && p > 0) ? 'g3-hotline' : 'g3-line') : edge ? 'g3-trace' : e2 > 0 ? 'g3-move' : 'g3-line');
    }
    s += TX(S([W / 2, 0])[0], S([0, 0])[1] + 20, `${kind === 'pieces' ? (i >= 1 ? d(W) : '?') : g(W)} ${unit}`, kind === 'pieces' ? 'g3-ta' : 'g3-t');
    s += TX(S([0, 0])[0] - 8, S([0, H / 2])[1] + 5, `${kind === 'pieces' ? (i >= 2 ? d(H) : '?') : g(H)} ${unit}`, kind === 'pieces' ? 'g3-ta' : 'g3-t', 'end');
    if (kind === 'pieces') {
      across.filter(({ a }) => a[1] !== 0).forEach(({ a, b }, k) => { if (k < sp.ws.length && e1 < 0.05) s += TX((S(a)[0] + S(b)[0]) / 2, S(a)[1] - 7, g(sp.ws[k]), 'g3-small'); });
      up.filter(({ a }) => a[0] !== 0).forEach(({ a, b }, k) => { if (k < sp.hs.length && e2 < 0.05) s += TX(S(a)[0] - 6, (S(a)[1] + S(b)[1]) / 2 + 4, g(sp.hs[k]), 'g3-small', 'end'); });
    }
    if (kind === 'notch') s += TX(S([sp.at + sp.nw, H - sp.d / 2])[0] + 6, S([0, H - sp.d / 2])[1] + 5, `${g(sp.d)} ${unit}`, 'g3-small', 'start');
    return { w: F.w, h: F.h, s };
  };
  return { steps, draw, answer: Ptot, counted: [] };
}

/* --- lsplit: an L cut into two rectangles (and checked as the big one less its corner) --- */
function lsplit(sp, mode) {
  const { W, H, w1, h1, unit = 'cm' } = sp, { g, d, c } = voice(mode), k = H - h1, A1 = W * h1, A2 = w1 * k, A = A1 + A2;
  const Lp = [[0, 0], [w1, 0], [w1, k], [W, k], [W, H], [0, H]];
  let cells = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inPoly([x + 0.5, y + 0.5], Lp)) cells++;
  const steps = ['An L-shape. Cut it with one straight line into two rectangles.',
    'Cut along the top of the bottom strip',
    c(`The bottom strip: ${W} × ${h1} = ${A1}`, `The bottom strip: ${g(W)} × ${g(h1)}`),
    c(`The part above stands ${H} − ${h1} = ${k} tall`, `The part above: ${g(H)} − ${g(h1)} tall`),
    c(`The part above: ${w1} × ${k} = ${A2}`, `The part above: ${g(w1)} wide`),
    c(`Add the two pieces: ${A1} + ${A2} = ${A} ${unit}²`, 'Add the two pieces'),
    c(`Check: the ${W} by ${H} rectangle, ${W * H}, less the missing corner, ${(W - w1) * k}: ${A}`, 'Check: the whole rectangle less the missing corner')];
  const F = fit([0, -1, W, H], { mw: 270, mh: 190, l: 60, r: 40, t: 24, b: 30, umax: 28 });
  const draw = (t) => {
    const i = Math.floor(t), p = t - i, gap = i === 4 ? ease(p) * 0.6 : i === 5 ? 0.6 * (1 - ease(p)) : 0;
    const bottom = [[0, k], [W, k], [W, H], [0, H]], top = [[0, -gap], [w1, -gap], [w1, k - gap], [0, k - gap]];
    let s = '';
    if (i >= 6 || (i === 5 && p > 0)) s += PG(F.P([[w1, 0], [W, 0], [W, k], [w1, k]]), 'g3-hatch');
    s += PG(F.P(bottom), i >= 2 || (i === 1 && p > 0.5) ? 'g3-hot' : 'dg-fill3') + unitGrid(F, 0, k, W, H);
    s += PG(F.P(top), i >= 4 || (i === 3 && p > 0.5) ? 'dg-fill1' : 'dg-fill3') + unitGrid(F, 0, -gap, w1, k - gap);
    if (i >= 1 || p > 0) { const e = i >= 1 ? 1 : ease(p); s += LN(F.P([[0, k]])[0], F.P([[lerp(0, w1, e), k]])[0], 'g3-cut'); }
    if (i >= 3 || (i === 2 && p > 0)) s += LN(F.P([[-0.35, -gap]])[0], F.P([[-0.35, k - gap]])[0], 'g3-dim') + TX(F.X(-0.35) - 6, F.Y(k / 2 - gap) + 5, d(k), 'g3-ta', 'end');
    s += TX(F.X(w1 / 2), F.Y(-gap) - 8, `${g(w1)} ${unit}`) + TX(F.X(W) + 7, F.Y(k + h1 / 2) + 5, `${g(h1)} ${unit}`, 'g3-t', 'start');
    s += TX(F.X(W / 2), F.Y(H) + 20, `${g(W)} ${unit}`) + TX(F.X(0) - (i >= 3 || (i === 2 && p > 0) ? 34 : 8), F.Y(H / 2) + 5, `${g(H)} ${unit}`, 'g3-t', 'end');
    if (i >= 2) s += TX(F.X(W / 2), F.Y((k + H) / 2) + 5, d(A1), 'g3-big');
    if (i >= 4) s += TX(F.X(w1 / 2), F.Y(k / 2 - gap) + 5, d(A2), 'g3-big');
    return { w: F.w, h: F.h, s };
  };
  return { steps, draw, answer: cells, counted: [W * H, (W - w1) * k] };
}

/* --- shear: a parallelogram's end slid across into a rectangle --- */
function shear(sp, mode) {
  const { b, h, o, sl = 0, unit = 'cm', tall = 'height' } = sp, { g, d, c } = voice(mode), A = b * h;
  const tri = [[0, h], [o, h], [o, 0]], body = [[o, h], [b, h], [b + o, 0], [o, 0]];
  const moved = tri.map(([x, y]) => [x + b, y]);
  const bb = bbox([body, moved]), fits = Math.abs(shoe(body) + shoe(moved) - (bb[2] - bb[0]) * (bb[3] - bb[1])) < 1e-9;
  const steps = [`A parallelogram: a base of ${g(b)} ${unit}, standing ${g(h)} ${unit} tall${sl ? ` (its sloping side is ${g(sl)} ${unit})` : ''}.`,
    'Cut along the straight-up height: the end triangle comes off',
    c(`Slide it to the other end. It fits exactly: a rectangle ${b} wide`, 'Slide it to the other end. It fits exactly.'),
    c(`and ${h} tall, straight up, not the slope: ${b} × ${h} = ${A} ${unit}²`, `A rectangle: ${g(b)} by ${g(h)}`)];
  const F = fit([0, 0, b + o, h], { mw: 290, mh: 170, l: 30, r: 60, t: 22, b: 34, umax: 28 });
  const draw = (t) => {
    const i = Math.floor(t), p = t - i, pr = (k) => cl(t - k + 1);    // how far step k has gone: 0 before it, 1 after
    const e = ease(pr(2)), lift = 0.25 * (ease(pr(1)) - e);
    const T = tri.map(([x, y]) => [x + b * e, y - lift]);
    let s = '';
    if (i >= 2 || (i === 1 && p > 0)) s += PG(F.P(moved), 'g3-ghost');
    s += PG(F.P(body), pr(3) > 0.5 ? 'dg-fill1' : 'dg-fill2');
    if (pr(3) > 0.5 && b <= 30 && h <= 30) s += unitGrid(F, o, 0, b + o, h);
    s += PG(F.P(T), i >= 1 || p > 0 ? 'g3-hot' : 'dg-fill2');
    s += LN(F.P([[o, 0]])[0], F.P([[o, h]])[0], 'g3-cut');
    s += TX(F.X(b / 2 + (e > 0.5 ? o : 0)), F.Y(h) + 22, `${g(b)} ${unit}`);
    s += TX(F.X(o) + 7, F.Y(h / 2) + 5, `${g(h)} ${unit}`, 'g3-ta', 'start');
    if (sl && e < 0.5) s += TX(F.X(b + o / 2) + 8, F.Y(h / 2) + 5, `${g(sl)} ${unit}`, 'g3-small', 'start');
    if (pr(3) > 0.5) s += TX(F.X(o + b / 2), F.Y(h / 2) - 8, d(A), 'g3-big');
    void tall;
    return { w: F.w, h: F.h, s };
  };
  return { steps, draw, answer: fits ? (bb[2] - bb[0]) * (bb[3] - bb[1]) : NaN, counted: [] };
}

/* --- halve: a shape and its copy turned half a turn make a parallelogram (triangle, trapezium) --- */
function halve(sp, mode) {
  const { P, j, unit = 'cm', shape = 'triangle' } = sp, { g, d, c } = voice(mode), n = P.length;
  const M = [(P[j][0] + P[(j + 1) % n][0]) / 2, (P[j][1] + P[(j + 1) % n][1]) / 2];
  const copy = P.map((q) => rotP(q, M, Math.PI).map(R4));
  const bb = bbox([P, copy]), base = (() => { const ys = [...P, ...copy].filter((q) => Math.abs(q[1] - bb[3]) < 1e-9).map((q) => q[0]); return Math.max(...ys) - Math.min(...ys); })();
  const height = R4(bb[3] - bb[1]), whole = R4(base * height), A = whole / 2;
  const rect = sp.right;
  const two = shape === 'trapezium' ? `${sp.a} + ${sp.c} = ${sp.a + sp.c}` : '';
  const steps = [shape === 'trapezium' ? `A trapezium: parallel sides ${g(sp.a)} and ${g(sp.c)}, ${g(sp.h)} tall.` : `A ${rect ? 'right-angled ' : ''}triangle: base ${g(sp.b)} ${unit}, height ${g(sp.h)} ${unit}.`,
    'Make a copy of it',
    'Turn the copy half a turn and fit it on the sloping side',
    shape === 'trapezium' ? c(`A parallelogram with base ${two}, ${sp.h} tall: ${base} × ${sp.h} = ${whole}`, 'Together they make a parallelogram')
      : c(`Together they make a ${rect ? 'rectangle' : 'parallelogram'}: ${sp.b} × ${sp.h} = ${whole}`, `Together they make a ${rect ? 'rectangle' : 'parallelogram'}: ${g(sp.b)} by ${g(sp.h)}`),
    c(`The ${shape} is half of it: ${whole} ÷ 2 = ${A} ${unit}²`, `The ${shape} is half of it`)];
  const F = fit(bb, { mw: 290, mh: 170, l: 40, r: 50, t: 22, b: 34, umax: 26 });
  const draw = (t) => {
    const i = Math.floor(t), p = t - i;
    const pr = (k) => cl(t - k + 1), show = t > 0, ang = ease(pr(2)), off = 0.6 * (ease(pr(1)) - ang);
    const C = P.map((q) => rotP(q, M, Math.PI * ang)).map(([x, y]) => [x + off, y - off]);
    let s = '';
    if (show) s += PG(F.P(copy), 'g3-ghost');
    s += PG(F.P(P), i >= 3 ? 'dg-fill1' : 'dg-fill2');
    if (show) s += PG(F.P(C), i >= 4 ? 'g3-fade' : 'g3-hot');
    if (sp.hx != null) s += LN(F.P([[sp.hx, bb[1]]])[0], F.P([[sp.hx, bb[3]]])[0], 'g3-cut');
    s += TX(F.X(sp.bx != null ? sp.bx : (bb[0] + bb[2]) / 2), F.Y(bb[3]) + 22, shape === 'trapezium' ? `${g(sp.a)} ${unit}` : `${g(sp.b)} ${unit}`);
    s += TX(F.X(sp.hx != null ? sp.hx : bb[0]) + (sp.hx != null ? 7 : -7), F.Y((bb[1] + bb[3]) / 2) + 5, `${g(sp.h)} ${unit}`, 'g3-ta', sp.hx != null ? 'start' : 'end');
    if (shape === 'trapezium') s += TX(F.X(sp.topx), F.Y(bb[1]) - 8, `${g(sp.c)} ${unit}`);
    if (i >= 3) s += TX(F.X((bb[0] + bb[2]) / 2), F.Y((bb[1] + bb[3]) / 2) + 5, i >= 4 ? d(A) : d(whole), 'g3-big');
    return { w: F.w, h: F.h, s };
  };
  return { steps, draw, answer: A, counted: [base, height] };
}

/* --- outin: the Nine Chapters' out-in principle — cut, turn, and make a rectangle --- */
function outin(sp, mode) {
  const { form: kind, h, unit = 'm' } = sp, { g, d, c } = voice(mode), ym = h / 2;
  let pieces, pivots, steps, answer, F, labels;
  if (kind === 'triangle') {
    const b = sp.b, ax = 0.45 * b, lx = ax / 2, rx = (ax + b) / 2;
    pieces = [[[0, h], [b, h], [rx, ym], [lx, ym]], [[ax, 0], [lx, ym], [ax, ym]], [[ax, 0], [ax, ym], [rx, ym]]];
    pivots = [null, [lx, ym, -1], [rx, ym, 1]];
    const end = [pieces[0], pieces[1].map((q) => rotP(q, [lx, ym], Math.PI)), pieces[2].map((q) => rotP(q, [rx, ym], Math.PI))], bb = bbox(end);
    const ok = Math.abs(sum(end.map(shoe)) - (bb[2] - bb[0]) * (bb[3] - bb[1])) < 1e-9;
    answer = ok ? R4((bb[2] - bb[0]) * (bb[3] - bb[1])) : NaN;
    steps = [`A triangle: base ${g(b)} ${unit}, height ${g(h)} ${unit}.`,
      c(`Cut across at half the height: ${h} ÷ 2 = ${h / 2}`, 'Cut across at half the height'),
      'Swing the left top piece down into the corner', 'Swing the right top piece down into the other corner',
      c(`A rectangle as wide as the base and half as tall: ${b} × ${h / 2} = ${answer} ${unit}²`, 'A rectangle as wide as the base and half as tall')];
    F = fit([0, 0, b, h], { mw: 290, mh: 170, l: 40, r: 50, t: 22, b: 34, umax: 24 });
    labels = (i) => TX(F.X(b / 2), F.Y(h) + 22, `${g(b)} ${unit}`) + TX(F.X(ax) + 6, F.Y(h * 0.75) + 5, `${g(h)} ${unit}`, 'g3-small', 'start') + (i >= 1 ? TX(F.X(b) + 8, F.Y(h * 0.75) + 5, d(h / 2), 'g3-ta', 'start') : '');
  } else {
    const a = sp.a, cc = sp.c, off = (a - cc) / 2, cx = a - off / 2;
    pieces = [[[0, h], [a, h], [cx, ym], [off / 2, ym]], [[off / 2, ym], [cx, ym], [off + cc, 0], [off, 0]]];
    pivots = [null, [cx, ym, 1]];
    const end = [pieces[0], pieces[1].map((q) => rotP(q, [cx, ym], Math.PI))];
    const xs = end.flat().filter((q) => Math.abs(q[1] - h) < 1e-9).map((q) => q[0]), length = R4(Math.max(...xs) - Math.min(...xs));
    const area = R4(sum(end.map(shoe))), tall = h - ym;
    const missing = kind === 'missing';
    answer = missing ? R4(length - a) : (Math.abs(area - length * tall) < 1e-6 ? area : NaN);
    const A = sp.A != null ? sp.A : ((a + cc) * h) / 2;
    steps = missing ? [`A trapezium: area ${g(A)} ${unit}², ${g(h)} ${unit} high, one parallel side ${g(a)} ${unit}.`,
      'Cut across at half the height', 'Turn the top half round beside the bottom half',
      c(`Double the area, ${2 * A}, and divide by the height, ${h}: the two sides together, ${a + cc}`, 'The two parallel sides now lie end to end'),
      c(`Take away the side you know: ${a + cc} − ${a} = ${cc} ${unit}`, `Take away the side you know, ${g(a)}`)]
      : [`A trapezium: parallel sides ${g(a)} ${unit} and ${g(cc)} ${unit}, ${g(h)} ${unit} high.`,
        c(`Cut across at half the height: ${h / 2}`, 'Cut across at half the height'), 'Turn the top half round beside the bottom half',
        c(`The two parallel sides lie end to end: ${a} + ${cc} = ${a + cc}`, 'The two parallel sides now lie end to end'),
        c(`A shape ${a + cc} long and ${h / 2} tall: ${a + cc} × ${h / 2} = ${area} ${unit}²`, 'Long and half as tall: square it off')];
    F = fit([0, 0, a + cc, h], { mw: 300, mh: 160, l: 40, r: 30, t: 24, b: 34, umax: 24 });
    labels = (i) => TX(F.X(a / 2), F.Y(h) + 22, `${g(a)} ${unit}`) + (i < 2 ? TX(F.X(off + cc / 2), F.Y(0) - 8, missing ? '? m' : `${g(cc)} ${unit}`, missing ? 'g3-ta' : 'g3-t') : TX(F.X(a + cc / 2), F.Y(h) + 22, missing ? `${d(cc)} ${unit}` : `${g(cc)} ${unit}`, 'g3-ta'))
      + TX(F.X(0) - 6, F.Y(ym) + 5, `${g(h)} ${unit}`, 'g3-small', 'end');
  }
  const draw = (t) => {
    const i = Math.floor(t), p = t - i;
    let s = '';
    pieces.forEach((P, k) => {
      let ang = 0;
      if (pivots[k]) {
        const at = kind === 'triangle' ? k : 1;     // the piece turns over t ∈ (at, at + 1): step at + 1
        ang = i > at ? 1 : i === at ? ease(p) : 0;
        s += PG(F.P(P.map((q) => rotP(q, [pivots[k][0], pivots[k][1]], Math.PI))), 'g3-ghost');
      }
      const Q = pivots[k] ? P.map((q) => rotP(q, [pivots[k][0], pivots[k][1]], pivots[k][2] * Math.PI * ang)) : P;
      s += PG(F.P(Q), k === 0 ? (i >= 4 ? 'dg-fill1' : 'dg-fill2') : i >= 4 ? 'dg-fill1' : 'g3-hot');
    });
    if (i >= 1 || p > 0) { const e = i >= 1 ? 1 : ease(p), [x0] = kind === 'triangle' ? [0.45 * sp.b / 2] : [(sp.a - sp.c) / 4], x1 = kind === 'triangle' ? (0.45 * sp.b + sp.b) / 2 : sp.a - (sp.a - sp.c) / 4; s += LN(F.P([[x0, ym]])[0], F.P([[lerp(x0, x1, e), ym]])[0], 'g3-cut'); }
    return { w: F.w, h: F.h, s: s + labels(i) };
  };
  return { steps, draw, answer, counted: [] };
}

/* --- cutmove: whole squares, then the halves paired up; or a slanted triangle as its box less the corners --- */
function cutmove(sp, mode) {
  const { g, d, c } = voice(mode);
  if (sp.form === 'tri') {
    const T = sp.pieces[0], bb = bbox([T]), box = (bb[2] - bb[0]) * (bb[3] - bb[1]);
    const corners = [];
    // the box's corners left over: each side of the triangle and the box make a right-angled piece (or nothing)
    for (let k = 0; k < 3; k++) {
      const a = T[k], b = T[(k + 1) % 3]; if (a[0] === b[0] || a[1] === b[1]) continue;
      const opts = [[a[0], b[1]], [b[0], a[1]]], C = opts.find((q) => !inPoly([(q[0] + (a[0] + b[0]) / 2) / 2, (q[1] + (a[1] + b[1]) / 2) / 2], T) && q[0] >= bb[0] - 1e-9 && q[0] <= bb[2] + 1e-9 && q[1] >= bb[1] - 1e-9 && q[1] <= bb[3] + 1e-9);
      corners.push([a, C, b]);
    }
    const cs = corners.map(shoe), cut = sum(cs), A = box - cut;
    const steps = [`A triangle with its corners on the grid of a ${g(sp.gw)} by ${g(sp.gh)} centimetre grid.`,
      c(`Draw the box round it along the grid lines: ${bb[2] - bb[0]} × ${bb[3] - bb[1]} = ${box}`, 'Draw the box round it along the grid lines'),
      c(`The corner pieces are half-rectangles: ${cs.join(' + ')} = ${cut}`, 'The corners left over are half-rectangles'),
      c(`Take them away: ${box} − ${cut} = ${A} cm²`, 'Take the corners away from the box')];
    const F = fit([0, 0, sp.gw, sp.gh], { mw: 260, mh: 190, l: 20, r: 20, t: 16, b: 16, flip: true, umax: 32 });
    const draw = (t) => {
      const i = Math.floor(t), p = t - i;
      let s = PG(F.P([[0, 0], [sp.gw, 0], [sp.gw, sp.gh], [0, sp.gh]]), 'g3-cell0') + unitGrid(F, 0, 0, sp.gw, sp.gh);
      if (i >= 1 || p > 0) s += PG(F.P([[bb[0], bb[1]], [bb[2], bb[1]], [bb[2], bb[3]], [bb[0], bb[3]]]), 'g3-boxline');
      s += PG(F.P(T), 'dg-fill1');
      corners.forEach((C, k) => {
        if (i < 2 && !(i === 1 && p > k / 3)) return;
        const fade = i < 2 ? 1 : i === 2 ? 1 - ease(p) : 0;
        if (fade <= 0.02) return;
        s += PG(F.P(C), 'g3-hot', ` style="opacity:${R2(fade)}"`);
        const m = [(C[0][0] + C[1][0] + C[2][0]) / 3, (C[0][1] + C[1][1] + C[2][1]) / 3];
        s += TX(F.X(m[0]), F.Y(m[1]) + 5, d(cs[k]), 'g3-small');
      });
      for (const q of T) s += CIRC(F.P([q])[0], 4, 'g3-dot');
      if (i >= 3) s += TX(F.X((bb[0] + bb[2]) / 2), F.Y((bb[1] + bb[3]) / 2) + 6, d(A), 'g3-big');
      return { w: F.w, h: F.h, s };
    };
    return { steps, draw, answer: A, counted: cs.concat([bb[2] - bb[0], bb[3] - bb[1]]) };
  }
  // halves: the shaded pieces exactly as the question draws them (y up)
  const pcs = sp.pieces, whole = pcs.filter((P) => P.length === 4), half = pcs.filter((P) => P.length === 3);
  const A = whole.length + sum(half.map(shoe));
  const steps = [`Whole squares and half squares on a ${g(sp.W)} by ${g(sp.H)} grid.`,
    c(`Whole squares: ${whole.length}`, 'Count the whole squares'),
    c(`Half squares: ${half.length}`, 'Find the half squares'),
    c(`Slide them together in pairs: ${half.length} halves make ${half.length / 2} whole squares`, 'Slide the halves together in pairs'),
    c(`${whole.length} + ${half.length / 2} = ${A} cm²`, 'Add the whole squares the pairs made')];
  const pairs = Math.ceil(half.length / 2), trayCols = Math.min(4, pairs), trayRows = Math.ceil(pairs / Math.max(1, trayCols));
  const gw = sp.W + (pairs ? trayCols + 1.2 : 0), gh = Math.max(sp.H, trayRows);
  const F = fit([0, 0, gw, gh], { mw: 300, mh: 190, l: 16, r: 16, t: 16, b: 16, flip: true, umax: 34 });
  // where each half goes: pair k fills tray square k; the first half turned to the lower-left triangle, its partner to the upper-right
  const typeOf = (P) => { const m = [Math.min(...P.map((q) => q[0])), Math.min(...P.map((q) => q[1]))]; const rel = P.map(([x, y]) => `${x - m[0]},${y - m[1]}`).sort().join(' ');
    return { '0,0 0,1 1,0': 1, '0,0 1,0 1,1': 2, '0,1 1,0 1,1': 3, '0,0 0,1 1,1': 4 }[rel]; };
  const moves = half.map((P, k) => {
    const pair = Math.floor(k / 2), want = k % 2 ? 3 : 1, ty = typeOf(P), turns = ((want - ty) % 4 + 4) % 4;
    const m = [Math.min(...P.map((q) => q[0])), Math.min(...P.map((q) => q[1]))], centre = [m[0] + 0.5, m[1] + 0.5];
    const to = [sp.W + 1.2 + (pair % trayCols) + 0.5, gh - 1 - Math.floor(pair / trayCols) + 0.5];
    return { P, centre, to, ang: (turns * Math.PI) / 2 };
  });
  const draw = (t) => {
    const i = Math.floor(t), p = t - i;
    let s = PG(F.P([[0, 0], [sp.W, 0], [sp.W, sp.H], [0, sp.H]]), 'g3-cell0') + unitGrid(F, 0, 0, sp.W, sp.H);
    if (pairs) for (let k = 0; k < pairs; k++) { const x = sp.W + 1.2 + (k % trayCols), y = gh - 1 - Math.floor(k / trayCols); s += PG(F.P([[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]]), 'g3-ghost'); }
    whole.forEach((P) => { s += PG(F.P(P), i >= 1 || (i === 0 && p > 0.5) ? 'dg-fill1' : 'dg-fill2'); });
    if (i >= 1) whole.forEach((P, k) => { if (mode !== 'ask') s += TX(F.X(P[0][0] + 0.5), F.Y(P[0][1] + 0.5) + 5, String(k + 1), 'g3-small'); });
    const e = i >= 3 ? 1 : i === 2 ? ease(p) : 0;
    moves.forEach(({ P, centre, to, ang }) => {
      if (e > 0) s += PG(F.P(P), 'g3-ghost');
      const Q = P.map((q) => rotP(q, centre, ang * e)).map(([x, y]) => [x + (to[0] - centre[0]) * e, y + (to[1] - centre[1]) * e]);
      s += PG(F.P(Q), i >= 2 || (i === 1 && p > 0.5) ? 'g3-hot' : 'dg-fill2');
    });
    return { w: F.w, h: F.h, s };
  };
  return { steps, draw, answer: A, counted: whole.map((_, k) => k + 1) };
}

/* --- cubes: a box filled layer by layer, the layers lifted apart, and turned round --- */
function cubes(sp, mode, view = {}) {
  const { l, w, h, unit = 'cm', cube = false } = sp, { g, d, c } = voice(mode), L = l * w, V = L * h;
  const cells = []; for (let y = 0; y < h; y++) for (let z = 0; z < w; z++) for (let x = 0; x < l; x++) cells.push([x, y, z]);
  // a tall stack is told in fewer steps: the bottom layer, the second, then the rest one after another in one step
  const many = h > 8, lift = V <= 1500;          // a big block is not lifted apart: thousands of faces would not move smoothly on a phone
  const steps = [cube ? `A cube ${g(l)} along every edge. Fill it with little cubes.` : `A box ${g(l)} ${unit} long, ${g(w)} ${unit} wide and ${g(h)} ${unit} tall. Fill it with 1 ${unit} cubes.`,
    c(`The bottom layer: ${l} × ${w} = ${L} cubes`, `The bottom layer: ${g(l)} by ${g(w)}`)];
  if (many) steps.push(c(`2 layers: 2 × ${L} = ${2 * L}`, 'Another layer, just the same'), c(`Keep stacking, layer on layer: ${h} layers of ${L}`, 'Keep stacking, layer on layer'));
  else for (let k = 2; k <= h; k++) steps.push(c(`${k} layers: ${k} × ${L} = ${k * L}`, 'Another layer, just the same'));
  const nL = steps.length - 1;                   // the last stacking step
  if (lift) steps.push(c(`Lift the layers apart: ${h} layers, each ${L}`, 'Lift the layers apart: every layer is the same'));
  steps.push('Turn it round: no gaps are hiding at the back');
  steps.push(c(`${L} × ${h} = ${V} ${cube ? 'little cubes' : `${unit}³`}`, `${g(h)} layers: how many cubes?`));
  const liftAt = lift ? nL + 1 : -9, turnAt = lift ? nL + 2 : nL + 1, endAt = turnAt + 1;
  /* when layer y drops in: [from, to] in t */
  const when = (y) => (y === 0 ? [0, 1] : !many ? [y, y + 1] : y === 1 ? [1, 2] : [2 + (y - 2) / (h - 2), 2 + (y - 1) / (h - 2)]);
  const s3 = 205 / Math.hypot(l, w, h * (lift ? 1.35 : 1) + 0.4), ms = steps.map((_, k) => (k === 1 ? Math.min(2600, 700 + L * 40) : many && k === 3 ? Math.min(4000, 300 * h) : k <= nL ? 650 : 1200));
  const draw = (t, vw = view) => {
    const pr = (k) => cl(t - k + 1), now = Math.ceil(t - 1e-9);
    const gapNow = 0.45 * (ease(pr(liftAt)) - ease(pr(endAt))) * (lift ? 1 : 0);
    const turn = ease(pr(turnAt)) * (Math.PI / 2);
    const cam = camera(-0.62 + turn + (vw.yaw || 0), 0.5, s3, 180, 140, [l / 2, (h + gapNow * (h - 1)) / 2, w / 2]);
    const list = [];
    for (const q of cells) {
      const [x, y, z] = q, n = z * l + x, [a, b] = when(y);
      if (y === 0 ? n >= Math.floor(ease(cl(t)) * L + 1e-9) : t <= a) continue;
      const dy = y > 0 ? (1 - ease(cl((t - a) / (b - a)))) * 2.2 : 0;
      const stepOf = y === 0 ? 1 : !many ? y + 1 : y === 1 ? 2 : 3;      // the step whose caption is about this layer
      list.push({ c: q, at: [x, y + y * gapNow + dy, z], g: dy > 1e-6 ? 1 : gapNow ? 2 + y : 0, cls: now === stepOf && now <= nL ? 'g3-ch' : 'g3-cc' });
    }
    let s = boxEdges(cam, l, h + gapNow * (h - 1), w, 'g3-wire') + paint(cam, cubeFaces(list));
    const hh = h + gapNow * (h - 1);
    s += label3(cam, [l / 2, 0, w], `${g(l)} ${cube ? '' : unit}`.trim(), 0, 22);
    s += label3(cam, [l, 0, w / 2], `${g(w)} ${cube ? '' : unit}`.trim(), 16, 16, 'g3-t', 'start');
    const left = [[0, 0], [l, 0], [l, w], [0, w]].map(([x, z]) => [x, z, cam.P([x, 0, z])[0]]).sort((m, q) => m[2] - q[2])[0];   // the leftmost upright edge, wherever it has turned
    s += label3(cam, [left[0], hh / 2, left[1]], `${g(h)} ${cube ? '' : unit}`.trim(), -10, 5, 'g3-t', 'end');
    if (list.length && mode !== 'ask') s += TX(340, 30, String(list.length), 'g3-big', 'end');   // the cubes in the picture, counted
    return { w: 360, h: 270, s };
  };
  return { steps, draw, answer: cells.length, counted: [...Array(h + 1).keys()].flatMap((k) => [k, k * L]), three: true, ms };
}

/* --- net: a box unfolded into its six faces, three matching pairs, and folded back --- */
function net(sp, mode, view = {}) {
  const { l, w, h, unit = 'cm' } = sp, { g, d, c } = voice(mode);
  const SA = 2 * (l * w + l * h + w * h);
  const steps = [`A box ${g(l)} by ${g(w)} by ${g(h)}. Its surface is six flat faces.`,
    'Unfold it flat: this is its net',
    c(`Front and back: 2 × ${l} × ${h} = ${2 * l * h}`, `Front and back: ${g(l)} by ${g(h)}, twice`),
    c(`Top and bottom: 2 × ${l} × ${w} = ${2 * l * w}`, `Top and bottom: ${g(l)} by ${g(w)}, twice`),
    c(`The two ends: 2 × ${w} × ${h} = ${2 * w * h}`, `The two ends: ${g(w)} by ${g(h)}, twice`),
    c(`All six: ${2 * l * h} + ${2 * l * w} + ${2 * w * h} = ${SA} ${unit}²`, 'Add the six faces'),
    'Fold it back up: the same six faces wrap the box'];
  // faces of the box [0,l]×[0,h]×[0,w] (y up) unfolded by u (0 closed, 1 flat); z = w is the front
  const facesAt = (u) => {
    const phi = (Math.PI / 2) * (1 - u), cp = Math.cos(phi), sph = Math.sin(phi);
    const F = [];
    F.push({ id: 'bottom', pair: 1, p: [[0, 0, 0], [l, 0, 0], [l, 0, w], [0, 0, w]], dims: [l, w] });
    F.push({ id: 'front', pair: 0, p: [[0, 0, w], [l, 0, w], [l, h * sph, w + h * cp], [0, h * sph, w + h * cp]], dims: [l, h] });
    const bk = [0, h * sph, -h * cp];
    F.push({ id: 'back', pair: 0, p: [[0, 0, 0], [l, 0, 0], [l, bk[1], bk[2]], [0, bk[1], bk[2]]], dims: [l, h] });
    F.push({ id: 'left', pair: 2, p: [[0, 0, 0], [0, 0, w], [-h * cp, h * sph, w], [-h * cp, h * sph, 0]], dims: [w, h] });
    F.push({ id: 'right', pair: 2, p: [[l, 0, 0], [l, 0, w], [l + h * cp, h * sph, w], [l + h * cp, h * sph, 0]], dims: [w, h] });
    const ab = phi + phi, td = [0, Math.sin(ab), -Math.cos(ab)];     // the lid hangs off the back's free edge and unfolds with it
    F.push({ id: 'top', pair: 1, p: [[0, bk[1], bk[2]], [l, bk[1], bk[2]], [l, bk[1] + w * td[1], bk[2] + w * td[2]], [0, bk[1] + w * td[1], bk[2] + w * td[2]]], dims: [l, w] });
    return F;
  };
  const area = (P) => { const a = P[1].map((v, k) => v - P[0][k]), b = P[3].map((v, k) => v - P[0][k]); return Math.hypot(a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]); };
  const flat = facesAt(1), answer = R4(sum(flat.map((f) => area(f.p))));
  const ext = bbox(flat.map((f) => f.p.map((q) => [q[0], q[2]])));
  const s3 = Math.min(300 / (ext[2] - ext[0]), 235 / (ext[3] - ext[1]), 200 / Math.hypot(l, w, h));
  const cls = ['g3-pf', 'g3-pt', 'g3-pe'];
  const draw = (t, vw = view) => {
    const i = Math.floor(t), p = t - i;
    // steps: 1 unfold · 2–4 a pair each · 5 all six · 6 fold back
    const uu = i === 0 ? ease(p) : i < 5 ? 1 : i === 5 ? 1 - ease(p) : 0, now = p > 0 ? i + 1 : i;
    const pitch = lerp(0.48, 1.25, uu), yaw = lerp(-0.6, -0.12, uu) + (vw.yaw || 0);
    const cen = [lerp(l / 2, (ext[0] + ext[2]) / 2, uu), lerp(h / 2, 0, uu), lerp(w / 2, (ext[1] + ext[3]) / 2, uu)];
    const cam = camera(yaw, pitch, s3, 180, 145, cen);
    const lit = now >= 2 && now <= 4 ? [now - 2] : now === 5 ? [0, 1, 2] : [];
    const fs = facesAt(uu).map((f) => ({ p: f.p, cls: 'g3-f ' + (lit.includes(f.pair) ? cls[f.pair] : 'g3-pn') }));
    let s = paint(cam, fs);
    if (uu > 0.98) for (const f of facesAt(1)) {
      const m = [0, 1, 2].map((k) => sum(f.p.map((q) => q[k])) / 4), q = cam.P(m);
      s += TX(q[0], q[1] + 5, `${g(f.dims[0])}×${g(f.dims[1])}`, 'g3-t');
    }
    if (uu < 0.02) s += label3(cam, [l / 2, 0, w], `${g(l)} ${unit}`, 0, 22) + label3(cam, [l, 0, w / 2], `${g(w)} ${unit}`, 16, 14, 'g3-t', 'start') + label3(cam, [0, h / 2, w], `${g(h)} ${unit}`, -12, 5, 'g3-t', 'end');
    return { w: 360, h: 280, s };
  };
  return { steps, draw, answer, counted: [], three: true, ms: steps.map((_, k) => (k === 0 || k === 6 ? 1800 : 1300)) };
}

/* --- paint: a painted block cut into little cubes, sorted by how many painted faces each has --- */
function paintCubes(sp, mode, view = {}) {
  const { a, b, c: cz, k } = sp, { g, d, c } = voice(mode), cube = a === b && b === cz;
  const cells = []; for (let y = 0; y < cz; y++) for (let z = 0; z < b; z++) for (let x = 0; x < a; x++) {
    const f = (x === 0) + (x === a - 1) + (y === 0) + (y === cz - 1) + (z === 0) + (z === b - 1); cells.push({ c: [x, y, z], f });
  }
  const N = [0, 1, 2, 3].map((f) => cells.filter((q) => q.f === f).length), A = a - 2, B = b - 2, C = cz - 2;
  const asked = (() => {
    if (k === 3) return c('Only the corners touch three faces: 4 on top and 4 underneath, 8', 'Only the corners touch three faces');
    if (cube) {
      const m = a - 2;
      if (k === 2) return c(`On each edge, leave out the 2 corners: ${a} − 2 = ${m}. A cube has 12 edges: ${m} × 12 = ${N[2]}`, 'On each edge, leave out the two corners');
      if (k === 1) return c(`Each face has a ${m} by ${m} middle: ${m * m}. Six faces: ${m * m} × 6 = ${N[1]}`, 'Each face has a square middle');
      return c(`Peel a layer off every side: ${m} × ${m} × ${m} = ${N[0]}`, 'Peel a layer off every side');
    }
    if (k === 2) return c(`Edges, less their corners: ${4 * A} + ${4 * B} + ${4 * C} = ${N[2]}`, 'Edges, less their corners');
    if (k === 1) return c(`Face middles: ${2 * A * B} + ${2 * B * C} + ${2 * A * C} = ${N[1]}`, 'Face middles, two of each');
    return c(`Peel a layer off: the inside block is ${A} by ${B} (${A * B}) and ${C} tall: ${N[0]}`, 'Peel a layer off every side');
  })();
  const steps = [cube ? `A ${g(a)}×${g(a)}×${g(a)} cube, painted, then cut into little cubes.` : `A ${g(a)}×${g(b)}×${g(cz)} block, painted, then cut into little cubes.`,
    c(`Corners: three painted faces — ${N[3]}`, 'Corners: three painted faces'),
    c(`Along the edges: two painted faces — ${N[2]}`, 'Along the edges: two painted faces'),
    c(`The middles of the faces: one painted face — ${N[1]}`, 'The middles of the faces: one painted face'),
    c(`Lift off the outside: the inside has no paint — ${N[0]}`, 'Lift off the outside: the inside has no paint'),
    asked];
  const s3 = 200 / Math.hypot(a, b, cz), ctr = [a / 2, cz / 2, b / 2];
  const draw = (t, vw = view) => {
    const i = Math.floor(t), p = t - i;
    // steps: 1 corners · 2 edges · 3 face middles · 4 the outside lifted off · 5 the one asked about
    const now = p > 0 ? i + 1 : i, show = now === 0 ? -1 : now <= 4 ? 4 - now : k;
    const lift = i < 3 ? 0 : i === 3 ? ease(p) : i === 4 ? (k === 0 ? 1 : 1 - ease(p)) : k === 0 ? 1 : 0;
    const spin = (vw.yaw || 0) + -0.62 + 0.35 * Math.min(t, 5);
    const cam = camera(spin, 0.5, s3 / (1 + lift * 0.35), 180, 140, ctr);
    const list = cells.map((q) => {
      const shell = q.f > 0, dir = q.c.map((v, n) => v + 0.5 - [a, cz, b][n] / 2);
      const at = shell && lift ? q.c.map((v, n) => v + dir[n] * lift * 0.9) : q.c;
      const cls = show < 0 ? (shell ? 'g3-cp' : 'g3-cc') : q.f === show ? 'g3-ch' : shell ? 'g3-cp' : 'g3-cc';
      return { c: q.c, at, g: shell && lift ? 1 + q.c.join('') : 0, cls: show >= 0 && q.f !== show && shell ? 'g3-cd' : cls, f: q.f };
    });
    // a shell lifted away shows each cube whole; in place, only the outside faces are drawn
    let s = paint(cam, cubeFaces(list));
    if (show >= 0 && mode !== 'ask') s += TX(340, 30, String(N[show]), 'g3-big', 'end');
    return { w: 360, h: 270, s };
  };
  return { steps, draw, answer: N[k], counted: N.concat([A, B, C, 4 * A, 4 * B, 4 * C, 2 * A * B, 2 * B * C, 2 * A * C, A * B, a - 2, (a - 2) ** 2]), three: true, ms: steps.map(() => 1500) };
}

/* --- solid: a prism or pyramid turning, its faces, edges or corners lit and counted --- */
function solid(sp, mode, view = {}) {
  const { form: kind, n, ask, cube } = sp, { g, d, c } = voice(mode);
  const R = 1, Z = kind === 'prism' ? (cube ? 2 * Math.sin(Math.PI / 4) : sp.long ? 2.4 : 2.3) : 1.5;
  const ring = (z) => [...Array(n).keys()].map((k) => { const a = (2 * Math.PI * k) / n + Math.PI / 2 + (n === 4 ? Math.PI / 4 : 0); return [R * Math.cos(a), R * Math.sin(a), z]; });
  let Vt, Fc;
  if (kind === 'prism') { Vt = [...ring(Z / 2), ...ring(-Z / 2)]; Fc = [[...Array(n).keys()], [...Array(n).keys()].map((k) => n + k).reverse(), ...[...Array(n).keys()].map((k) => [k, (k + 1) % n, n + (k + 1) % n, n + k].reverse())]; }
  else { Vt = [...ring(0).map(([x, y]) => [x, -0.75, y]), [0, 0.95, 0]]; Fc = [[...Array(n).keys()], ...[...Array(n).keys()].map((k) => [k, n, (k + 1) % n])]; }
  const ek = new Map(); Fc.forEach((f) => f.forEach((v, k) => { const u = f[(k + 1) % f.length], key = v < u ? `${v}-${u}` : `${u}-${v}`; ek.set(key, [Math.min(u, v), Math.max(u, v)]); }));
  const CEN = [0, 1, 2].map((m) => sum(Vt.map((q) => q[m])) / Vt.length);
  const E = [...ek.values()], CNT = { F: Fc.length, E: E.length, V: Vt.length };
  const ends = kind === 'prism' ? [0, 1] : [0];
  const front = (e) => kind === 'prism' && e[0] < n && e[1] < n, back = (e) => kind === 'prism' && e[0] >= n && e[1] >= n;
  const baseE = (e) => kind === 'pyramid' && e[1] < n;
  const groups = [];
  if (ask === 'euler') groups.push({ say: c(`Faces + vertices: ${CNT.F} + ${CNT.V} = ${CNT.F + CNT.V}`, `${g(CNT.F)} faces and ${g(CNT.V)} corners`), faces: Fc.map((_, k) => k), verts: Vt.map((_, k) => k) },
    { say: c(`Euler: the edges are 2 fewer: ${CNT.E}. Count them: ${CNT.E}`, 'Euler: the edges are 2 fewer'), edges: E.map((_, k) => k) });
  else if (kind === 'prism' && ask === 'edges') groups.push({ say: c(`Round the front end: ${n}`, 'Round the front end'), edges: E.map((e, k) => (front(e) ? k : -1)).filter((x) => x >= 0) },
    { say: c(`Round the back end: ${n}`, 'Round the back end'), edges: E.map((e, k) => (back(e) ? k : -1)).filter((x) => x >= 0) },
    { say: c(`Running from end to end: ${n}. Altogether ${CNT.E}`, 'Running from end to end'), edges: E.map((e, k) => (!front(e) && !back(e) ? k : -1)).filter((x) => x >= 0) });
  else if (kind === 'prism' && ask === 'faces') groups.push({ say: c('The two ends: 2', 'The two ends'), faces: ends }, { say: c(`One flat side for each side of an end: ${n}. Altogether ${CNT.F}`, 'One flat side for each side of an end'), faces: Fc.map((_, k) => k).slice(2) });
  else if (kind === 'prism') groups.push({ say: c(`Corners on one end: ${n}`, 'Corners on one end'), verts: [...Array(n).keys()] }, { say: c(`Corners on both ends: ${CNT.V}`, 'And the same on the other end'), verts: Vt.map((_, k) => k) });
  else if (ask === 'edges') groups.push({ say: c(`Round the base: ${n}`, 'Round the base'), edges: E.map((e, k) => (baseE(e) ? k : -1)).filter((x) => x >= 0) }, { say: c(`Up to the tip: ${n}. Altogether ${CNT.E}`, 'Up to the tip'), edges: E.map((e, k) => (!baseE(e) ? k : -1)).filter((x) => x >= 0) });
  else if (ask === 'faces') groups.push({ say: c('The base, underneath: 1', 'The base, underneath'), faces: [0] }, { say: c(`A triangle from every side of the base: ${n}. Altogether ${CNT.F}`, 'A triangle from every side of the base'), faces: Fc.map((_, k) => k).slice(1) });
  else groups.push({ say: c(`Corners of the base: ${n}`, 'Corners of the base'), verts: [...Array(n).keys()] }, { say: c(`Add the tip: ${CNT.V}`, 'Add the tip'), verts: Vt.map((_, k) => k) });
  const steps = [sp.name ? `A ${sp.name}. Turn it round and count.` : c(`A ${kind} whose ${kind === 'prism' ? 'ends have' : 'base has'} ${n} sides.`, `A ${kind}. Turn it round.`), ...groups.map((x) => x.say)];
  const answer = ask === 'euler' ? CNT.F + CNT.V - 2 : CNT[ask[0].toUpperCase()];
  const draw = (t, vw = view) => {
    const i = Math.floor(t), p = t - i, now = i + (p > 0.5 ? 1 : 0);
    const keep = (key) => { const s2 = new Set(); for (let k = 0; k < Math.min(groups.length, now); k++) for (const v of groups[k][key] || []) s2.add(v); return s2; };
    const litF = keep('faces'), litE = keep('edges'), litV = keep('verts');
    const cam = camera(-0.5 + 0.55 * t + (vw.yaw || 0), kind === 'pyramid' ? 0.35 : 0.42, 92, 180, 132, [0, 0, 0]);
    const faces = Fc.map((f, k) => { const P = f.map((v) => Vt[v]), a = P[1].map((x, m) => x - P[0][m]), b2 = P[2].map((x, m) => x - P[1][m]);
      let nrm = [a[1] * b2[2] - a[2] * b2[1], a[2] * b2[0] - a[0] * b2[2], a[0] * b2[1] - a[1] * b2[0]];
      const mid = [0, 1, 2].map((m) => sum(P.map((q) => q[m])) / P.length);
      if (sum(nrm.map((x, m) => x * (mid[m] - CEN[m]))) < 0) nrm = nrm.map((x) => -x);   // outward, whichever way the corners were listed
      return { p: P, cls: litF.has(k) ? 'g3-sh' : 'g3-sf', vis: cam.dir(nrm)[2] > 0, n: null }; });
    let s = paint(cam, faces.map((f) => ({ p: f.p, cls: f.cls + (f.vis ? '' : ' g3-back') })));
    const vis = (e) => Fc.some((f, k) => faces[k].vis && f.includes(e[0]) && f.includes(e[1]));
    E.forEach((e, k) => { s += LN(cam.P(Vt[e[0]]), cam.P(Vt[e[1]]), litE.has(k) ? 'g3-eh' : vis(e) ? 'g3-e' : 'g3-eb'); });
    Vt.forEach((v, k) => { if (litV.has(k)) s += CIRC(cam.P(v), 7, 'g3-vh'); });
    if (i >= 1 && mode !== 'ask' && ask !== 'euler') { const kk = litE.size || litF.size || litV.size; if (kk) s += TX(340, 30, String(kk), 'g3-big', 'end'); }
    return { w: 360, h: 260, s };
  };
  return { steps, draw, answer, counted: [CNT.F, CNT.E, CNT.V, CNT.F + CNT.V, n, 2, 1], three: true, ms: steps.map(() => 1700) };
}

/* --- roll: a radius doubled, or a wheel rolled one turn and measured in diameters --- */
function roll(sp, mode) {
  const { ask, v } = sp, { g, d, c } = voice(mode);
  if (ask === 'diam' || ask === 'rad') {
    const r = ask === 'diam' ? v : v / 2, D = 2 * r, Rs = 78, ctr = [180, 100];
    const steps = ask === 'diam' ? [`A circle with a radius of ${g(v)} cm.`, 'One radius from the centre out to the edge', 'Another radius, back across the other way', c(`Two radii end to end: ${v} + ${v} = ${D} cm`, 'Two radii end to end: the diameter')]
      : [`A circle ${g(v)} cm across.`, 'The diameter goes through the centre', c(`The centre cuts it in half: ${v} ÷ 2 = ${r} cm`, 'The centre cuts it in half: the radius')];
    const rods = ask === 'diam' ? [[ctr, [ctr[0] + Rs, ctr[1]]], [ctr, [ctr[0] - Rs, ctr[1]]]] : [[ctr, [ctr[0] + Rs, ctr[1]]]];
    const answer = R4(sum(rods.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]))) / Rs * r);
    const draw = (t) => {
      const i = Math.floor(t), p = t - i;
      let s = CIRC(ctr, Rs, 'dg-fill3') + CIRC(ctr, 4, 'g3-dot');
      if (ask === 'diam') {
        if (i >= 1 || p > 0) { const e = i >= 1 ? 1 : ease(p); s += LN(ctr, [ctr[0] + Rs * e, ctr[1]], 'g3-trace'); }
        if (i >= 2 || (i === 1 && p > 0)) { const a = Math.PI * (i >= 2 ? 1 : ease(p)); s += LN(ctr, [ctr[0] + Rs * Math.cos(a), ctr[1] - Rs * Math.sin(a)], 'g3-hotline'); }
        s += TX(ctr[0] + Rs / 2, ctr[1] - 10, `${g(v)} cm`);
        if (i >= 2) s += TX(ctr[0] - Rs / 2, ctr[1] - 10, `${g(v)} cm`);
        if (i >= 3) s += TX(ctr[0], ctr[1] + Rs + 24, `${d(D)} cm`, 'g3-ta');
      } else {
        s += LN([ctr[0] - Rs, ctr[1]], [ctr[0] + Rs, ctr[1]], 'g3-trace') + TX(ctr[0], ctr[1] + Rs + 24, `${g(v)} cm`);
        if (i >= 2 || (i === 1 && p > 0)) s += LN(ctr, [ctr[0] + Rs, ctr[1]], 'g3-hotline');
        if (i >= 2) s += TX(ctr[0] + Rs / 2, ctr[1] - 10, `${d(r)} cm`, 'g3-ta');
      }
      return { w: 360, h: 210, s };
    };
    return { steps, draw, answer: ask === 'diam' ? answer : R4(answer), counted: [] };
  }
  const D = ask === 'circ-r' ? 2 * v : v;
  // the trail is the true distance round; it is MEASURED in diameters, and π to two places is 3.14
  const trail = Math.PI * D, whole = Math.floor(trail / D + 1e-9), bit = R2(trail / D - whole), answer = R2(whole * D + bit * D);
  const steps = [ask === 'circ-r' ? `A wheel with a radius of ${g(v)} cm.` : `A wheel ${g(v)} cm across.`];
  if (ask === 'circ-r') steps.push(c(`First the diameter: 2 × ${v} = ${D} cm`, 'First the diameter: two radii'));
  steps.push('Roll it along the ground for exactly one turn',
    c(`Lay diameters along the track: 3 fit. 3 × ${D} = ${3 * D}`, 'Lay diameters along the track'),
    c(`And a little bit more: 0.14 of a diameter, 0.14 × ${D} = ${R2(0.14 * D)}`, 'And a little bit more'),
    c(`One turn: ${3 * D} + ${R2(0.14 * D)} = ${answer} cm`, 'How far is one turn?'));
  const off = ask === 'circ-r' ? 1 : 0, sc = 290 / (Math.PI * D + D), rr = (D * sc) / 2, y0 = 150, x0 = 30;
  const draw = (t) => {
    const i = Math.floor(t), p = t - i;
    const rl = i >= off + 1 ? 1 : i === off ? ease(p) : 0, cx = x0 + rr + Math.PI * D * sc * rl, ang = (Math.PI * D * sc * rl) / rr;
    let s = LN([x0 - 10, y0], [x0 + Math.PI * D * sc + 2 * rr + 10, y0], 'g3-ground');
    if (rl > 0) s += LN([x0 + rr, y0], [cx, y0], 'g3-trace');
    s += CIRC([cx, y0 - rr], rr, 'dg-fill3') + LN([cx, y0 - rr], [cx - rr * Math.sin(ang), y0 - rr + rr * Math.cos(ang)], 'g3-spoke') + CIRC([cx - rr * Math.sin(ang), y0 - rr + rr * Math.cos(ang)], 4.5, 'g3-dot');
    if (rl === 0) {
      if (ask === 'circ-r') { s += LN([cx, y0 - rr], [cx + rr, y0 - rr], 'g3-hotline') + TX(cx + rr / 2, y0 - rr - 8, `${g(v)}`, 'g3-small'); if (i >= 1 || p > 0) s += LN([cx - rr * (i >= 1 ? 1 : ease(p)), y0 - rr], [cx, y0 - rr], 'g3-hotline') + (i >= 1 ? TX(cx, y0 - 2 * rr - 8, `${d(D)} cm`, 'g3-ta') : ''); }
      else s += LN([cx - rr, y0 - rr], [cx + rr, y0 - rr], 'g3-hotline') + TX(cx, y0 - 2 * rr - 8, `${g(v)} cm`);
    }
    const pr = (k) => cl(t - k + 1), rodsAt = off + 2, n = Math.min(3, Math.floor(ease(pr(rodsAt)) * 3.2 + 1e-9));
    for (let k = 0; k < n; k++) { const a = x0 + rr + k * D * sc; s += `<rect x="${R1(a)}" y="${y0 + 6}" width="${R1(D * sc - 2)}" height="10" rx="3" class="g3-rod"/>` + TX(a + (D * sc) / 2, y0 + 34, (ask === 'circ-r' ? d : g)(D), 'g3-small'); }
    if (pr(rodsAt + 1) > 0.3) { const a = x0 + rr + 3 * D * sc; s += `<rect x="${R1(a)}" y="${y0 + 6}" width="${R1(Math.max(2, (Math.PI - 3) * D * sc))}" height="10" rx="2" class="g3-bit"/>` + TX(a + 8, y0 + 34, d(R2(0.14 * D)), 'g3-ta', 'start'); }
    if (pr(rodsAt + 2) > 0.5) s += TX(x0 + rr + (Math.PI * D * sc) / 2, y0 + 56, `${d(answer)} cm`, 'g3-big');
    return { w: 360, h: 220, s };
  };
  return { steps, draw, answer, counted: [3 * D, R2(0.14 * D)], ms: steps.map((_, k) => (k === off + 1 ? 2400 : 1300)) };
}

/* --- sectors: a circle cut into slices and laid top-to-tail: nearly a rectangle, πr by r --- */
function sectors(sp, mode) {
  const { r, unit = 'cm' } = sp, { g, d, c } = voice(mode), half = R2(3.14 * r), A = R2(half * r);
  const steps = [`A circle with a radius of ${g(r)} ${unit}.`, 'Cut it into 8 slices', 'Lay the slices top to tail', 'Thinner slices: 16, and the edge gets straighter',
    c(`Nearly a rectangle: half the way round, 3.14 × ${r} = ${half}, by the radius, ${r}`, 'Nearly a rectangle: half the way round, by the radius'),
    c(`${half} × ${r} = ${A} ${unit}²`, 'Long times tall')];
  const Rs = 46, cx = 70, cy = 92;
  const slicePath = (n, k, apex, rot) => {
    const a0 = rot - Math.PI / n, a1 = rot + Math.PI / n, P = [apex];
    for (let m = 0; m <= 6; m++) { const a = lerp(a0, a1, m / 6); P.push([apex[0] + Rs * Math.cos(a), apex[1] + Rs * Math.sin(a)]); }
    return PG(P, k % 2 ? 'dg-fill1' : 'dg-fill2');
  };
  const draw = (t) => {
    const i = Math.floor(t), p = t - i, pr = (k) => cl(t - k + 1), n = pr(3) > 0 ? 16 : 8;
    const chord = 2 * Rs * Math.sin(Math.PI / n), sx = 150, top = 70, bot = top + Rs;
    const e = ease(n === 8 ? pr(2) : pr(3));
    let s = '';
    if (i === 0 && p === 0) s += CIRC([cx, cy], Rs, 'dg-fill2');
    else for (let k = 0; k < n; k++) {
      const home = (2 * Math.PI * k) / n - Math.PI / 2, up = k % 2 === 0;
      const to = [sx + (k + 1) * chord / 2, up ? top : bot], rotTo = up ? Math.PI / 2 : -Math.PI / 2;
      let dr = rotTo - home; while (dr > Math.PI) dr -= 2 * Math.PI; while (dr < -Math.PI) dr += 2 * Math.PI;
      s += slicePath(n, k, [lerp(cx, to[0], e), lerp(cy, to[1], e)], home + dr * e);
    }
    if (pr(1) > 0 && pr(2) === 0) for (let k = 0; k < 8; k++) { const a = (2 * Math.PI * k) / 8 - Math.PI / 2 - Math.PI / 8; if (e < 0.01) s += LN([cx, cy], [cx + Rs * Math.cos(a), cy + Rs * Math.sin(a)], 'g3-cut'); }
    s += LN([cx, cy], [cx + Rs, cy], e < 0.01 ? 'g3-hotline' : 'g3-none') + (e < 0.01 ? TX(cx + Rs / 2, cy - 6, `${g(r)}`, 'g3-small') : '');
    if (pr(4) > 0.5) { const L = (n / 2) * chord; s += LN([sx + chord / 2, bot + 14], [sx + chord / 2 + L, bot + 14], 'g3-dim') + TX(sx + chord / 2 + L / 2, bot + 32, `${d(half)} ${unit}`, 'g3-ta') + TX(sx - 4, (top + bot) / 2 + 5, `${g(r)}`, 'g3-t', 'end'); }
    if (pr(5) > 0.5) s += TX(sx + 90, 40, `${d(A)} ${unit}²`, 'g3-big');
    return { w: 360, h: 190, s };
  };
  return { steps, draw, answer: A, counted: [half] };
}

/* --- pythag: squares on the sides, then four triangles moved inside one big square --- */
function pythag(sp, mode) {
  const { a, b, c: hyp, find, unit = 'm' } = sp, { g, d, c } = voice(mode), s = a + b;
  const T1 = [[[0, 0], [a, 0], [0, b]], [[s, 0], [s, a], [a, 0]], [[s, s], [b, s], [s, a]], [[0, s], [0, b], [b, s]]];
  const shift = [[0, a], [0, 0], [a - s, 0], [a, a - s]];       // arrangement two: each triangle only slides
  const gap1 = s * s - sum(T1.map(shoe)), cMeasured = Math.sqrt(gap1);
  const known = find === 'a' ? b : a, want = find === 'c' ? cMeasured : Math.sqrt(gap1 - known * known);
  const lab = (x, sq) => (find === x ? '?' : sq);
  const steps = find === 'c' ? [`A right-angled triangle with short sides ${g(a)} and ${g(b)}. A square on each side.`,
    c(`${a} × ${a} = ${a * a}`, `The square on the side ${g(a)}`), c(`${b} × ${b} = ${b * b}`, `The square on the side ${g(b)}`),
    `Four copies in a big square, ${g(a)} + ${g(b)} wide: the gap in the middle is the square on the longest side`,
    'Slide the triangles: now the gap is the two smaller squares. Same big square, same four triangles',
    c(`So ${a * a} + ${b * b} = ${hyp * hyp}`, 'So the two small squares make the big one'), c(`Which number squared makes ${hyp * hyp}? ${hyp} ${unit}`, 'Which number squared makes it?')]
    : [`A right-angled triangle: longest side ${g(hyp)}, one short side ${g(known)}.`,
      c(`${hyp} × ${hyp} = ${hyp * hyp}`, 'The square on the longest side'), c(`${known} × ${known} = ${known * known}`, `The square on the side ${g(known)}`),
      'Four copies in a big square: the gap in the middle is the square on the longest side',
      'Slide the triangles: now the gap is the two smaller squares',
      c(`So the missing square is ${hyp * hyp} − ${known * known} = ${want * want}`, 'Take the small square away from the big one'), c(`Which number squared makes ${want * want}? ${want} ${unit}`, 'Which number squared makes it?')];
  // scene one: the triangle with its squares (y up), right angle at the origin, a along x, b up
  const sqA = [[0, 0], [a, 0], [a, -a], [0, -a]], sqB = [[0, 0], [0, b], [-b, b], [-b, 0]];
  const nx = b / hyp, ny = a / hyp, sqC = [[a, 0], [0, b], [nx * hyp, b + ny * hyp], [a + nx * hyp, ny * hyp]];
  const F1 = fit(bbox([sqA, sqB, sqC]), { mw: 300, mh: 220, l: 30, r: 30, t: 14, b: 14, flip: true, umax: 30 });
  const F2 = fit([0, 0, s, s], { mw: 220, mh: 220, l: 70, r: 70, t: 14, b: 14, flip: true, umax: 30 });
  const grid = Math.max(a, b) <= 16;
  const draw = (t) => {
    const i = Math.floor(t), p = t - i;
    const now = p > 0 ? i + 1 : i;
    if (now < 3) {
      const F = F1;
      const litA = (find === 'c' && now >= 1) || (find === 'b' && now >= 2), litB = (find === 'c' && now >= 2) || (find === 'a' && now >= 2), litC = find !== 'c' && now >= 1;
      let o = PG(F.P(sqA), litA ? 'dg-fill1' : 'g3-cell0') + PG(F.P(sqB), litB ? 'dg-fill3' : 'g3-cell0') + PG(F.P(sqC), litC ? 'g3-hot' : 'g3-cell0');
      if (grid) o += unitGrid(F, 0, -a, a, 0) + unitGrid(F, -b, 0, 0, b);
      o += PG(F.P([[0, 0], [a, 0], [0, b]]), 'dg-fill2');
      const sa = find === 'a' ? '?' : litA ? d(a * a) : `${g(a)}²`, sb = find === 'b' ? '?' : litB ? d(b * b) : `${g(b)}²`, sc2 = find === 'c' ? '?' : litC ? d(hyp * hyp) : `${g(hyp)}²`;
      o += TX(F.X(a / 2), F.Y(-a / 2) + 6, sa, 'g3-big') + TX(F.X(-b / 2), F.Y(b / 2) + 6, sb, 'g3-big') + TX(F.X((a + nx * hyp) / 2 + 0), F.Y((b + ny * hyp) / 2) + 6, sc2, 'g3-big');
      o += TX(F.X(a / 2), F.Y(0) - 6, lab('a', g(a)), 'g3-small') + TX(F.X(0) + 6, F.Y(b / 2), lab('b', g(b)), 'g3-small', 'start');
      return { w: F.w, h: F.h, s: o };
    }
    const F = F2, e = i >= 4 ? 1 : i === 3 ? ease(p) : 0;
    let o = PG(F.P([[0, 0], [s, 0], [s, s], [0, s]]), e > 0.98 ? 'dg-fill3' : 'g3-hot');
    if (e > 0.98) o += PG(F.P([[0, 0], [a, 0], [a, a], [0, a]]), 'dg-fill1');
    T1.forEach((P, k) => { o += PG(F.P(P.map(([x, y]) => [x + shift[k][0] * e, y + shift[k][1] * e])), 'dg-fill2'); });
    if (e < 0.02) o += TX(F.X(s / 2), F.Y(s / 2) + 6, find === 'c' ? (now >= 5 ? d(hyp * hyp) : '?') : d(hyp * hyp), 'g3-big');
    if (e > 0.98) o += TX(F.X(a / 2), F.Y(a / 2) + 6, find === 'a' ? (now >= 5 ? d(a * a) : '?') : d(a * a), 'g3-big') + TX(F.X(a + b / 2), F.Y(a + b / 2) + 6, find === 'b' ? (now >= 5 ? d(b * b) : '?') : d(b * b), 'g3-big');
    o += TX(F.X(a / 2), F.Y(0) + 18, lab('a', g(a)), 'g3-small') + TX(F.X(a + b / 2), F.Y(0) + 18, lab('b', g(b)), 'g3-small');
    if (now >= 6) o += TX(F.X(s) + 10, F.Y(s / 2) + 6, `${d(want)}`, 'g3-big', 'start');
    return { w: F.w, h: F.h, s: o };
  };
  return { steps, draw, answer: R4(want), counted: [gap1, a * a, b * b, s] };
}

/* --- tear: a triangle's corners torn off and laid on a straight line --- */
function tear(sp, mode) {
  const { shape: kind, pts } = sp, { g, d, c } = voice(mode), n = pts.length;
  // the interior angle at each corner, measured from the drawing
  const angAt = (P, k) => { const o = P[k], a = P[(k + P.length - 1) % P.length], b = P[(k + 1) % P.length];
    let x = Math.atan2(a[1] - o[1], a[0] - o[0]) - Math.atan2(b[1] - o[1], b[0] - o[0]); x = Math.abs(x); if (x > Math.PI) x = 2 * Math.PI - x; return x; };
  const tris = kind === 'quad' ? [[0, 1, 2], [0, 2, 3]] : [[0, 1, 2]];
  const wedges = [];
  tris.forEach((tr, ti) => {
    const P = tr.map((k) => pts[k]);
    let cum = 0;
    tr.forEach((vk, m) => {
      const o = P[m], a = P[(m + 2) % 3], b = P[(m + 1) % 3], A = angAt(P, m);
      const s1 = Math.atan2(b[1] - o[1], b[0] - o[0]), s2 = Math.atan2(a[1] - o[1], a[0] - o[0]);
      let start = s1, span = s2 - s1; while (span > Math.PI) span -= 2 * Math.PI; while (span < -Math.PI) span += 2 * Math.PI;
      if (span < 0) { start = s2; span = -span; }
      wedges.push({ ti, vk, o, start, span: A, to: Math.PI + cum, cum }); cum += A;
    });
  });
  const total = tris.length * 180, hide = sp.hide;
  const measured = (k) => (180 / Math.PI) * angAt(pts, k);
  const answer = kind === 'iso' ? R2(measured(0)) : R2(measured(hide));
  const knownSum = kind === 'iso' ? null : sum(sp.angles.filter((_, k) => k !== hide));
  const steps = [kind === 'quad' ? 'A four-sided shape. Three of its angles are marked.' : kind === 'iso' ? `An isosceles triangle with a top angle of ${g(sp.apex)}°.` : 'A triangle. Two of its angles are marked.'];
  if (kind === 'quad') steps.push('Cut it corner to corner: two triangles');
  steps.push('Tear off the corners', kind === 'quad' ? 'Lay each triangle\'s corners side by side' : 'Lay them side by side, point to point');
  steps.push(c(kind === 'quad' ? `Each triangle makes a straight line: 2 × 180° = ${total}°` : 'They make a straight line: 180°', kind === 'quad' ? 'Each triangle makes a straight line' : 'They make a straight line'));
  if (kind === 'iso') steps.push(c(`180 − ${sp.apex} = ${180 - sp.apex}`, `180 − ${g(sp.apex)}`), c(`The two equal angles share it: ${180 - sp.apex} ÷ 2 = ${(180 - sp.apex) / 2}°`, 'The two equal angles share what is left'));
  else steps.push(c(`The ${kind === 'quad' ? 'three' : 'two'} you know: ${sp.angles.filter((_, k) => k !== hide).join(' + ')} = ${knownSum}`, `The ${kind === 'quad' ? 'three' : 'two'} you know`), c(`${total} − ${knownSum} = ${total - knownSum}°`, `${total} take away the ones you know`));
  const bb = bbox([pts]), lineY = bb[3] + (bb[3] - bb[1]) * 0.25 + 40;
  const F = fit([bb[0], bb[1], bb[2], lineY + 10], { mw: 300, mh: 230, l: 30, r: 30, t: 20, b: 20, umax: 4 });
  const cut = kind === 'quad' ? 1 : 0, tearAt = 1 + cut, layAt = 2 + cut, wr = 30;
  const Os = tris.map((_, ti) => [F.X(tris.length === 1 ? (bb[0] + bb[2]) / 2 : lerp(bb[0], bb[2], ti ? 0.78 : 0.22)), F.Y(lineY)]);
  const wedgePath = (o, start, span, cls, lab2) => {
    const P = [o]; for (let m = 0; m <= 10; m++) { const a = start + (span * m) / 10; P.push([o[0] + wr * Math.cos(a), o[1] + wr * Math.sin(a)]); }
    const mid = start + span / 2;
    return PG(P, cls) + (lab2 ? TX(o[0] + (wr + 13) * Math.cos(mid), o[1] + (wr + 13) * Math.sin(mid) + 5, lab2, 'g3-small') : '');
  };
  const lab = (k) => (kind === 'iso' ? (k === 2 ? `${g(sp.apex)}°` : '?') : k === hide ? '?' : `${g(sp.angles[k])}°`);
  const draw = (t) => {
    const i = Math.floor(t), p = t - i;
    let s = PG(F.P(pts), 'dg-fill2');
    if (kind === 'quad' && (i >= 1 || p > 0)) s += LN(F.P([pts[0]])[0], F.P([pts[2]])[0], 'g3-cut');
    const lift = i >= tearAt ? 1 : i === tearAt - 1 ? ease(p) : 0, lay = i >= layAt ? 1 : i === layAt - 1 ? ease(p) : 0;
    if (i >= layAt) tris.forEach((_, ti) => { s += LN([Os[ti][0] - wr - 16, Os[ti][1]], [Os[ti][0] + wr + 16, Os[ti][1]], 'g3-ground'); });
    wedges.forEach((w2, k) => {
      const o0 = F.P([w2.o])[0], cen = F.P([[(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2]])[0];
      const away = [o0[0] + (o0[0] - cen[0]) * 0.15 * lift, o0[1] + (o0[1] - cen[1]) * 0.15 * lift];
      const o = [lerp(away[0], Os[w2.ti][0], lay), lerp(away[1], Os[w2.ti][1], lay)];
      // the target fills the upper half-plane from the left: start angle π + cum (screen y is down, so going round is negative)
      let tgt = -(w2.cum + w2.span); while (tgt - w2.start > Math.PI) tgt -= 2 * Math.PI; while (tgt - w2.start < -Math.PI) tgt += 2 * Math.PI;
      const st = lerp(w2.start, tgt, lay);
      s += wedgePath(o, st, w2.span, ['g3-w1', 'g3-w2', 'g3-w3'][k % 3], kind === 'quad' ? '' : lift > 0.5 ? lab(w2.vk) : '');
    });
    if (!lift) pts.forEach((q, k) => { const o = F.P([q])[0], cen = F.P([[(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2]])[0], dx = cen[0] - o[0], dy = cen[1] - o[1], L = Math.hypot(dx, dy) || 1; s += TX(o[0] + (dx / L) * 34, o[1] + (dy / L) * 34 + 5, lab(k), k === hide || (kind === 'iso' && k < 2) ? 'g3-ta' : 'g3-t'); });
    if (i >= layAt + 1) tris.forEach((_, ti) => { s += TX(Os[ti][0], Os[ti][1] + 22, '180°', 'g3-ta'); });
    return { w: F.w, h: F.h, s };
  };
  return { steps, draw, answer, counted: [total, 180 - (sp.apex || 0)] };
}

/* --- turn: a ray turning half a turn (or a whole one), the known angles, then what is left --- */
function turnFan(sp, mode) {
  const { full, known, pos } = sp, { g, d, c } = voice(mode), total = full ? 360 : 180, ks = sum(known);
  const parts = known.map((x) => ({ x, k: true })); parts.splice(pos, 0, { x: total - ks, k: false });
  const measured = total - sum(parts.filter((q) => q.k).map((q) => q.x));
  const steps = [full ? 'Angles all the way round a point.' : 'Angles side by side on a straight line.',
    full ? 'Turn all the way round: a whole turn is 360°' : 'Turn from one side to the other: half a turn is 180°',
    c(known.length > 1 ? `The angles you know: ${known.join(' + ')} = ${ks}` : `The angle you know: ${ks}`, 'The angles you know'),
    c(`What is left: ${total} − ${ks} = ${measured}°`, `What is left of the ${total}°`)];
  const o = [180, full ? 120 : 150], R = full ? 92 : 120;
  const draw = (t) => {
    const i = Math.floor(t), p = t - i;
    let s = full ? '' : LN([o[0] - R - 20, o[1]], [o[0] + R + 20, o[1]], 'dg-line');
    let a0 = 0;
    parts.forEach((q, k) => {
      const a1 = a0 + q.x, P = [o]; for (let m = 0; m <= 18; m++) { const a = ((a0 + (q.x * m) / 18) * Math.PI) / 180; P.push([o[0] + R * 0.62 * Math.cos(a), o[1] - R * 0.62 * Math.sin(a)]); }
      const cls = !q.k ? (i >= 3 || (i === 2 && p > 0.5) ? 'g3-hot' : 'g3-cell0') : i >= 2 || (i === 1 && p > 0.6) ? 'dg-fill1' : 'g3-cell0';
      s += PG(P, cls);
      const mid = (((a0 + a1) / 2) * Math.PI) / 180;
      s += TX(o[0] + R * 0.82 * Math.cos(mid), o[1] - R * 0.82 * Math.sin(mid) + 5, q.k ? `${g(q.x)}°` : i >= 3 ? `${d(measured)}°` : '?', q.k ? 'g3-t' : 'g3-ta');
      s += LN(o, [o[0] + R * Math.cos((a1 * Math.PI) / 180), o[1] - R * Math.sin((a1 * Math.PI) / 180)], 'dg-line');
      if (k === 0) s += LN(o, [o[0] + R, o[1]], 'dg-line');
      a0 = a1;
    });
    if (i === 0 && p > 0 || i === 1) { const sw = (i >= 1 ? 1 : ease(p)) * total, P = []; for (let m = 0; m <= 30; m++) { const a = ((sw * m) / 30 * Math.PI) / 180; P.push([o[0] + R * 0.35 * Math.cos(a), o[1] - R * 0.35 * Math.sin(a)]); }
      s += `<polyline points="${ptsS(P)}" class="g3-arc"/>` + LN(o, [o[0] + R * Math.cos((sw * Math.PI) / 180), o[1] - R * Math.sin((sw * Math.PI) / 180)], 'g3-hotline'); }
    if (i >= 1) s += TX(o[0], o[1] + (full ? R + 30 : 30), `${total}°`, 'g3-ta');
    return { w: 360, h: full ? 250 : 200, s };
  };
  return { steps, draw, answer: measured, counted: [] };
}

/* --- liu: Liu Hui's polygons — a hexagon of radii, a side doubled by Pythagoras twice --- */
function liu(sp, mode) {
  const { form: kind, r } = sp, { g, d, c } = voice(mode);
  const V = (n, k) => [Math.cos((2 * Math.PI * k) / n - Math.PI / 2), Math.sin((2 * Math.PI * k) / n - Math.PI / 2)];
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  let steps, answer, counted = [];
  if (kind === 'hexagon') {
    const side = R4(dist(V(6, 0), V(6, 1)) * r);
    answer = R4(6 * side);
    steps = [`A circle of radius ${g(r)} cm.`, c('Six triangles meet at the centre: 360° ÷ 6 = 60° each', 'Six triangles meet at the centre'), c(`Each triangle is equilateral, so a side of the hexagon is a radius: ${side} cm`, 'Each triangle is equilateral: a side is a radius'), c(`Six sides: 6 × ${side} = ${answer} cm`, 'Six sides round the hexagon')];
  } else if (kind === 'double') {
    const a = V(6, 0), b = V(6, 1), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], ml = Math.hypot(...m), nw = [m[0] / ml, m[1] / ml];
    const half = R4((dist(a, b) * r) / 2), ap = R2(ml * r), gap = R2(r - ap);
    answer = R2(dist(a, nw) * r); counted = [half, ap, gap];
    steps = [`A hexagon inside a circle of radius ${g(r)} cm.`, c(`Half a side of the hexagon: ${half}`, 'Half a side of the hexagon'), c(`Centre to the middle of that side: ${ap}`, 'Centre to the middle of that side'),
      c(`The gap out to the circle: ${r} − ${ap} = ${gap}`, 'The gap out to the circle'), c(`New side: √(${half}² + ${gap}²) = ${answer} cm`, 'The new side, by Pythagoras'), 'Twelve sides hug the circle more tightly'];
  } else {
    const { n, s } = sp, P = R4(n * s); answer = R2(P / (2 * r)); counted = [P, 2 * r];
    const NAME = { 6: 'Six sides: a hexagon', 12: 'Double them: twelve sides', 24: 'Twenty-four sides', 48: 'Forty-eight sides', 96: 'Ninety-six sides' };
    steps = [`A circle of radius ${g(r)}.`, ...[6, 12, 24, 48, 96].filter((x) => x <= n).map((x) => NAME[x]),
      c(`${n} sides of ${s}: ${P}`, `${g(n)} sides of ${g(s)}`), c(`÷ the diameter, ${2 * r}: π is about ${answer}`, 'Divide by the diameter')];
  }
  const Rs = 92, o = [180, 112];
  const poly = (n) => [...Array(n).keys()].map((k) => { const v = V(n, k); return [o[0] + Rs * v[0], o[1] + Rs * v[1]]; });
  const draw = (t) => {
    const i = Math.floor(t), p = t - i;
    let s = CIRC(o, Rs, 'g3-cell0') + CIRC(o, 3.5, 'g3-dot');
    if (kind === 'hexagon') {
      const H6 = poly(6), shown = i >= 1 ? 6 : Math.floor(ease(p) * 6 + 1e-9);
      for (let k = 0; k < shown; k++) s += PG([o, H6[k], H6[(k + 1) % 6]], k % 2 ? 'dg-fill1' : 'dg-fill3');
      if (i >= 2 || (i === 1 && p > 0)) s += LN(H6[0], H6[1], 'g3-hotline') + LN(o, H6[0], 'g3-trace') + LN(o, H6[1], 'g3-trace');
      s += TX(o[0] + 10, o[1] - Rs / 2, `${g(r)}`, 'g3-small', 'start');
      if (i >= 3) s += TX(o[0], o[1] + Rs + 26, `${d(answer)} cm`, 'g3-ta');
    } else if (kind === 'double') {
      const H6 = poly(6), a = H6[0], b = H6[1], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], ml = Math.hypot(m[0] - o[0], m[1] - o[1]), nw = [o[0] + ((m[0] - o[0]) / ml) * Rs, o[1] + ((m[1] - o[1]) / ml) * Rs];
      s += PG(H6, 'dg-fill3');
      if (i >= 1 || p > 0) s += LN(a, m, 'g3-hotline');
      if (i >= 2 || (i === 1 && p > 0)) s += LN(o, m, 'g3-trace');
      if (i >= 3 || (i === 2 && p > 0)) s += LN(m, nw, 'g3-hotline') + CIRC(nw, 4, 'g3-dot');
      if (i >= 4 || (i === 3 && p > 0)) s += LN(a, nw, 'g3-trace');
      if (i >= 5 || (i === 4 && p > 0)) s += PG(poly(12), 'g3-ghost2');
      return { w: 360, h: 230, s: s + TX(o[0] - 10, o[1] - 20, `${g(r)}`, 'g3-small', 'end') };
    } else {
      const seq = [6, 12, 24, 48, 96].filter((x) => x <= sp.n), k = Math.min(seq.length - 1, Math.max(0, i - 1 + (p > 0.5 ? 1 : 0)));
      s += PG(poly(seq[k]), 'dg-fill3');
      if (i >= seq.length + 2) s += TX(o[0], o[1] + Rs + 26, `${d(answer)}`, 'g3-ta');
    }
    return { w: 360, h: 240, s };
  };
  return { steps, draw, answer, counted };
}

/* --- prism: an end swept along its length, slice by slice --- */
function prism(sp, mode, view = {}) {
  const { b, h, l, unit = 'cm' } = sp, { g, d, c } = voice(mode), tri = [[0, 0], [b, 0], [b / 2, h]], E = shoe(tri), V = R4(E * l);
  const steps = [`A prism whose end is a triangle, base ${g(b)}, height ${g(h)}, ${g(l)} long.`, c(`The end: ${b} × ${h} ÷ 2 = ${E} ${unit}²`, 'The end: half of base times height'), c(`Every slice 1 ${unit} thick is the same: ${l} slices`, 'Every slice is the same as the end'), c(`${E} × ${l} = ${V} ${unit}³`, 'The end times the length')];
  const s3 = 220 / Math.hypot(b, h, l);
  const draw = (t, vw = view) => {
    const i = Math.floor(t), p = t - i, len = i >= 2 ? l : i === 1 ? l * ease(p) : 0.02;
    const cam = camera(-0.7 + (vw.yaw || 0), 0.4, s3, 180, 140, [b / 2, h / 2, l / 2]);
    const P = (z) => tri.map(([x, y]) => [x, y, z]);
    const faces = [{ p: P(len), cls: 'g3-f g3-ht', n: [0, 0, 1] }, { p: P(0).reverse(), cls: 'g3-f g3-ct', n: [0, 0, -1] }];
    for (let k = 0; k < 3; k++) { const a = tri[k], q = tri[(k + 1) % 3]; faces.push({ p: [[a[0], a[1], 0], [q[0], q[1], 0], [q[0], q[1], len], [a[0], a[1], len]], cls: 'g3-f g3-cs', n: [q[1] - a[1], -(q[0] - a[0]), 0] }); }
    let s = paint(cam, faces);
    for (let z = 1; z < len - 1e-9; z++) s += PG(P(z).map(cam.P).map((q) => [q[0], q[1]]), 'g3-slice');
    s += label3(cam, [b / 2, 0, 0], `${g(b)}`, 0, 18) + label3(cam, [b / 2, h / 2, 0], `${g(h)}`, 0, 5, 'g3-small') + label3(cam, [b, 0, l / 2], `${g(l)} ${unit}`, 14, 12, 'g3-t', 'start');
    if (i >= 3) s += TX(340, 30, `${d(V)}`, 'g3-big', 'end');
    return { w: 360, h: 270, s };
  };
  return { steps, draw, answer: V, counted: [E], three: true };
}

/* --- discs: a cylinder as discs stacked up --- */
function discs(sp, mode, view = {}) {
  const { r, h, unit = 'cm' } = sp, { g, d, c } = voice(mode), E = R2(3.14 * r * r), V = R2(E * h);
  const steps = [`A tin with a radius of ${g(r)} ${unit}, ${g(h)} ${unit} tall.`, c(`The end is a circle: 3.14 × ${r} × ${r} = ${E} ${unit}²`, 'The end is a circle: π × r × r'), c(`Stack discs 1 ${unit} thick: ${h} of them`, 'Stack discs 1 unit thick'), c(`${E} × ${h} = ${V} ${unit}³`, 'The end times the height')];
  const s3 = 210 / Math.hypot(2 * r, h * 1.1, 2 * r), N = 28;
  const ring = (y) => [...Array(N).keys()].map((k) => [r * Math.cos((2 * Math.PI * k) / N), y, r * Math.sin((2 * Math.PI * k) / N)]);
  const draw = (t, vw = view) => {
    const i = Math.floor(t), pr = (k) => cl(t - k + 1), shown = Math.max(1, Math.ceil(ease(pr(2)) * h - 1e-9));
    const cam = camera(0.3 + (vw.yaw || 0), 0.45, s3, 180, 140, [0, h / 2, 0]);
    const faces = [];
    for (let k = 0; k < shown; k++) {
      const y0 = k, y1 = k + 0.94, A = ring(y0), B = ring(y1), top = k === shown - 1 && i < 3 ? 'g3-f g3-ht' : 'g3-f g3-ct';
      faces.push({ p: B, cls: top, n: [0, 1, 0], dz: 0 });
      for (let m = 0; m < N; m++) { const m2 = (m + 1) % N; faces.push({ p: [A[m], A[m2], B[m2], B[m]], cls: 'g3-f g3-cs', n: [Math.cos((2 * Math.PI * (m + 0.5)) / N), 0, Math.sin((2 * Math.PI * (m + 0.5)) / N)] }); }
    }
    let s = paint(cam, faces);
    if (i <= 1) s += LN(cam.P([0, shown, 0]), cam.P([r, shown, 0]), 'g3-hotline') + label3(cam, [r / 2, shown, 0], `${g(r)}`, 0, -6, 'g3-small');
    s += label3(cam, [-r, h / 2, 0], `${g(h)} ${unit}`, -10, 5, 'g3-t', 'end');
    if (i >= 3) s += TX(340, 30, `${d(V)}`, 'g3-big', 'end');
    return { w: 360, h: 280, s };
  };
  return { steps, draw, answer: V, counted: [E], three: true };
}

/* ================================================================ the API */

export const KINDS = { rows, walk, push, lsplit, shear, halve, outin, cutmove, cubes, net, paint: paintCubes, solid, roll, sectors, pythag, tear, turn: turnFan, liu, prism, discs };
const MEMO = new Map();
/* the model for a spec in a mode: { steps (captions), draw(t, view), answer, counted, three, ms } */
export function model(spec, mode = 'full') {
  const k = mode + '|' + JSON.stringify(spec);
  if (!MEMO.has(k)) { if (MEMO.size > 60) MEMO.clear(); MEMO.set(k, KINDS[spec.kind](spec, mode)); }
  return MEMO.get(k);
}
export const lastStep = (spec, mode = 'full') => model(spec, mode).steps.length - 1;
/* the frame at time t (0 … last step): the SVG and the caption a child reads */
export function frame(spec, t, mode = 'full', view = {}) {
  const M = model(spec, mode), n = M.steps.length - 1, tt = Math.max(0, Math.min(n, t));
  const f = M.draw(tt, view), i = Math.ceil(tt - 1e-9);
  return { svg: `<svg class="g3-svg" viewBox="0 0 ${f.w} ${f.h}" role="img" aria-label="${esc(M.steps[i])}">${f.s}</svg>`, cap: M.steps[i], i, n, three: !!M.three };
}
/* everything a child can read in a key frame: the caption and the words in the picture */
export function words(spec, i, mode = 'full') {
  const f = frame(spec, i, mode);
  return [f.cap, ...[...f.svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'))];
}

/* The explainer as markup: the first frame already drawn (it reads before the player arrives),
   and the controls the player wires. Every button is a real <button>, 44px, named. */
export function html(spec, { mode = 'full', key = '', title = 'See it move' } = {}) {
  if (!spec) return '';
  const f = frame(spec, 0, mode);
  const k = key || spec.kind + ':' + [...JSON.stringify(spec)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7).toString(36);
  const B = (act, ico, name, extra = '') => `<button type="button" class="g3-b" data-g3b="${act}" aria-label="${name}" title="${name}"${extra}>${icon(ico, 22)}</button>`;
  return `<figure class="g3d" data-g3spec="${esc(JSON.stringify(spec))}" data-g3mode="${mode}" data-g3key="${esc(k)}" tabindex="0" role="group" aria-label="${esc(title)}${mode === 'ask' ? '' : `: ${f.n + 1} steps`}. Arrow keys step, space plays.">
    <p class="g3-title">${icon(f.three ? 'cube' : 'play', 18)} ${esc(title)}</p>
    <div class="g3-stage">${f.svg}</div>
    <figcaption class="g3-cap" aria-live="polite">${esc(f.cap)}</figcaption>
    <div class="g3-bar">
      ${B('first', 'retry', 'Back to the start')}${B('prev', 'arrowLeft', 'Step back')}${B('play', 'play', 'Play')}${B('next', 'arrowRight', 'Next step')}${f.three ? B('turn', 'cube', 'Turn it round') : ''}
      <span class="g3-pos mono" aria-hidden="true">${mode === 'ask' ? 'Step 1' : `1 / ${f.n + 1}`}</span>
    </div>
  </figure>`;
}

/* A stop's explainer, as a method the stop carries (`explain,` beside its `geo(q)`): the stop's own
   question in, its picture's markup out — or nothing, for a question this stop has no picture for. */
export function explain(q, mode = 'full') {
  const sp = this.geo(q);
  return sp ? html(sp, { mode, title: sp.three || ['cubes', 'net', 'paint', 'solid', 'prism', 'discs'].includes(sp.kind) ? 'See it in 3D' : 'See it move' }) : '';
}
