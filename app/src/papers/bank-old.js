/* bank-old.js — the contest-style problem bank for the older bands:
   g56 (grades 5–6) and g78 (grades 7–8).

   Every template follows docs/PAPER-CONTRACT.md: make(r, band) builds one
   problem with exactly one answer, and solve(params) finds every answer again
   by an INDEPENDENT route — enumerating, simulating or counting — so a slip in
   make is caught by test/papers-bank-old.mjs rather than copied.

   These are our own problems, written in the style of the international
   middle-school contests; none is taken from a real paper. */
import { int, pick, shuffle } from '../rand.js';
import { svg, text as T, grid, cuboid, dots } from '../chapters/kit.js';
import { NETS, fold } from '../puzzles.js';

// ---------------------------------------------------------------- helpers
const I = (r, lo, hi) => int(lo, hi, r);
const P = (r, arr) => pick(arr, r);
const old = (band) => band === 'g78';
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const lcm = (a, b) => (a / gcd(a, b)) * b;
const C2 = (n) => (n * (n - 1)) / 2;
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const pow = (b, n) => `${b}${String(n).replace(/\d/g, (d) => SUP[d])}`;
const frac = (n, d) => { const g = gcd(n, d); return `${n / g}/${d / g}`; };
const fval = (s) => { const [n, d] = s.split('/').map(Number); return n / d; };
const r4 = (x) => Math.round(x * 1e4) / 1e4;
const ord = (n) => n + ((n % 100 >= 11 && n % 100 <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'));
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MLEN = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const NAMES = ['Asha', 'Ben', 'Chen', 'Dara', 'Eli', 'Farah', 'Gopal'];
const word = (n) => ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] ?? String(n);
const Word = (n) => { const w = word(n); return w[0].toUpperCase() + w.slice(1); };

/* Wrong answers: the plausible mistakes first, then near neighbours to make
   up at least five. Never the answer, never a repeat. */
function wrongs(ans, cands, { step = 1, min = 0, max = Infinity } = {}) {
  const out = []; const seen = new Set([r4(ans)]);
  const add = (v) => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return; v = r4(v);
    if (v < min || v > max || seen.has(v)) return;
    if (Number.isInteger(ans) && step >= 1 && !Number.isInteger(v)) return; // a whole answer gets whole distractors
    seen.add(v); out.push(v);
  };
  cands.forEach(add);
  for (let k = 1; out.length < 5 && k < 60; k++) { add(ans + k * step); add(ans - k * step); }
  return out.slice(0, 6);
}
function fwrongs(ans, cands) {
  const [an, ad] = ans.split('/').map(Number); const out = [], seen = new Set([ans]);
  const add = (n, d) => {
    if (!(Number.isInteger(n) && Number.isInteger(d) && n > 0 && d > 0 && n < d)) return;
    const s = frac(n, d); if (seen.has(s) || fval(s) === fval(ans)) return; seen.add(s); out.push(s);
  };
  cands.forEach(([n, d]) => add(n, d));
  for (let k = 1; out.length < 5 && k < 40; k++) { add(an + k, ad); add(an - k, ad); add(an, ad + k); add(an, ad - k); }
  return out.slice(0, 6);
}
const others = (ans, pool) => [...new Set(pool)].filter((x) => x !== ans);

/* Echo: does the answer appear as a number (or word) of its own? */
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
function echoes(hay, ans) {
  if (typeof ans === 'number') {
    const forms = [String(ans)]; if (Math.abs(ans) >= 1000) forms.push(ans.toLocaleString('en-US'));
    return forms.some((f) => new RegExp(`(^|[^\\d.,/])${escRe(f)}(?!\\d|[.,/]\\d)`).test(hay));
  }
  return new RegExp(`(^|[^\\w/])${escRe(ans)}(?![\\w/])`).test(hay);
}
const figText = (f) => [...f.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join(' | ') + ' | ' + ((f.match(/aria-label="([^"]*)"/) || [])[1] || '');

/* Each template's build() may return null (try again). make() retries until
   the problem is clean: no echo, at least four wrong answers. */
function tpl(o) {
  return {
    ...o,
    make(r, band) {
      for (let k = 0; k < 500; k++) {
        const q = o.build(r, band);
        if (!q) continue;
        if (!o.echo && echoes(q.text, q.ans)) continue;
        if (q.fig && !o.figEcho && echoes(figText(q.fig), q.ans)) continue;
        if (new Set(q.wrong.map(String)).size < 4 || q.wrong.some((w) => String(w) === String(q.ans))) continue;
        return q;
      }
      throw new Error(`${o.id}: no clean problem in 500 tries`);
    },
  };
}

// ---------------------------------------------------------------- shared solvers (brute force)
function perms(arr) {
  if (arr.length <= 1) return [arr.slice()];
  const out = [];
  arr.forEach((x, i) => { for (const p of perms([...arr.slice(0, i), ...arr.slice(i + 1)])) out.push([x, ...p]); });
  return out;
}
/* Area by Pick's theorem, counting lattice points one by one. */
function pickArea(pts) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  let B = 0, In = 0;
  const onSeg = (x, y, [ax, ay], [bx, by]) => (bx - ax) * (y - ay) === (by - ay) * (x - ax) && x >= Math.min(ax, bx) && x <= Math.max(ax, bx) && y >= Math.min(ay, by) && y <= Math.max(ay, by);
  for (let x = Math.min(...xs); x <= Math.max(...xs); x++) for (let y = Math.min(...ys); y <= Math.max(...ys); y++) {
    if (pts.some((a, i) => onSeg(x, y, a, pts[(i + 1) % pts.length]))) { B++; continue; }
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    if (inside) In++;
  }
  return In + B / 2 - 1;
}
/* Shortest lattice routes from (0,0) to (m,n): every string of m rights and n ups, checked. */
function routes(m, n, ok) {
  let count = 0;
  for (let mask = 0; mask < 1 << (m + n); mask++) {
    let x = 0, y = 0, good = true, rights = 0;
    for (let i = 0; i < m + n; i++) if (mask & (1 << i)) rights++;
    if (rights !== m) continue;
    const seen = [[0, 0]];
    for (let i = 0; i < m + n; i++) { if (mask & (1 << i)) x++; else y++; seen.push([x, y]); }
    if (ok(seen)) count++;
    void good;
  }
  return count;
}
const has = (path, [px, py]) => path.some(([x, y]) => x === px && y === py);
function cubesBy(a, b, c, test) {
  let n = 0;
  for (let x = 0; x < a; x++) for (let y = 0; y < b; y++) for (let z = 0; z < c; z++) if (test(x, y, z)) n++;
  return n;
}
const timeStr = (mins) => {
  mins = ((mins % 1440) + 1440) % 1440; const h = Math.floor(mins / 60), m = mins % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};

// ---------------------------------------------------------------- figures
function streetsFig(m, n, marks) {
  const u = 44, X = (x) => 34 + x * u, Y = (y) => 24 + (n - y) * u; let s = '';
  for (let x = 0; x <= m; x++) s += `<line x1="${X(x)}" y1="${Y(0)}" x2="${X(x)}" y2="${Y(n)}" class="dg-line"/>`;
  for (let y = 0; y <= n; y++) s += `<line x1="${X(0)}" y1="${Y(y)}" x2="${X(m)}" y2="${Y(y)}" class="dg-line"/>`;
  for (const k of marks) s += `<circle cx="${X(k.x)}" cy="${Y(k.y)}" r="8" class="${k.cls || 'dg-dot'}"/>` + T(X(k.x) + 14, Y(k.y) - 10, k.label, 'dg-accent', 'start');
  return svg(X(m) + 40, Y(0) + 24, s, 'A grid of streets');
}
function latticeFig(n, polys, u = 24) {
  const X = (x) => 10 + x * u, Y = (y) => 10 + (n - y) * u; let s = '';
  for (let i = 0; i <= n; i++) s += `<line x1="${X(i)}" y1="${Y(0)}" x2="${X(i)}" y2="${Y(n)}" class="dg-grid"/><line x1="${X(0)}" y1="${Y(i)}" x2="${X(n)}" y2="${Y(i)}" class="dg-grid"/>`;
  for (const { pts, cls } of polys) s += `<polygon points="${pts.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ')}" class="${cls}"/>`;
  return svg(X(n) + 10, Y(0) + 10, s, 'A shape on a square grid');
}
function fanGeom(k, h) {
  const ax = 150, ay = 10, base = 190, L = 10, R = 290, segs = [];
  for (let j = 0; j <= k + 1; j++) segs.push([[ax, ay], [L + ((R - L) * j) / (k + 1), base]]);
  for (let i = 1; i <= h + 1; i++) {
    const t = i / (h + 1), y = ay + (base - ay) * t;
    segs.push([[ax + (L - ax) * t, y], [ax + (R - ax) * t, y]]);
  }
  return segs;
}
function netFig(cells, letters) {
  const u = 40; let s = '';
  const W = Math.max(...cells.map((c) => c[1])) + 1, H = Math.max(...cells.map((c) => c[0])) + 1;
  cells.forEach(([r, c], i) => { s += `<rect x="${4 + c * u}" y="${4 + r * u}" width="${u}" height="${u}" class="dg-fill2"/>` + T(4 + c * u + u / 2, 4 + r * u + u / 2 + 7, letters[i], 'dg-big'); });
  return svg(W * u + 8, H * u + 8, s, 'A net of a cube');
}

// ================================================================= TIER 3
const TIER3 = [
  tpl({
    id: 'old-last-digit', bands: ['g56', 'g78'], tier: 3, topic: 'number', strategy: 'units-digit-cycles',
    echo: true, // the answer is a single digit 0–9 and the base is a number in the question: they sometimes coincide, which is no clue
    build(r, band) {
      const b = P(r, old(band) ? [3, 7, 8, 12, 13, 17, 18, 22, 23, 27] : [2, 3, 4, 7, 8, 9]);
      const n = old(band) ? I(r, 100, 2099) : I(r, 20, 99);
      const cyc = []; let d = b % 10; while (!cyc.includes(d)) { cyc.push(d); d = (d * b) % 10; }
      const ans = cyc[(n - 1) % cyc.length];
      return {
        text: `What is the last digit of ${pow(b, n)}?`, ans,
        wrong: wrongs(ans, [...cyc, b % 10, n % 10, (b * n) % 10, 0, 1, 5], { max: 9 }),
        why: `The last digits of the powers of ${b} repeat in a cycle of ${cyc.length}: ${cyc.join(', ')}. So ${pow(b, n)} ends the same way as ${pow(b, ((n - 1) % cyc.length) + 1)}, because ${n} and ${((n - 1) % cyc.length) + 1} leave the same remainder when divided by ${cyc.length}.`,
        params: { b, n },
      };
    },
    solve({ b, n }) { let d = 1; for (let i = 0; i < n; i++) d = (d * b) % 10; return [d]; },
  }),
  tpl({
    id: 'old-divisor-count', bands: ['g56', 'g78'], tier: 3, topic: 'number', strategy: 'list-systematically',
    build(r, band) {
      const N = old(band) ? I(r, 100, 999) : I(r, 24, 200);
      const fac = []; let m = N;
      for (let p = 2; p * p <= m; p++) { let e = 0; while (m % p === 0) { m /= p; e++; } if (e) fac.push([p, e]); }
      if (m > 1) fac.push([m, 1]);
      const ans = fac.reduce((a, [, e]) => a * (e + 1), 1);
      if (ans < 6) return null;
      const show = fac.map(([p, e]) => (e > 1 ? pow(p, e) : p)).join(' × ');
      return {
        text: `How many whole numbers divide ${N} exactly, counting 1 and ${N} itself?`, ans,
        wrong: wrongs(ans, [ans - 2, ans / 2, ans + 2, fac.length, ans - 1, ans + 1]),
        why: `${N} = ${show}. A divisor chooses how many of each prime to use, so there are ${fac.map(([, e]) => `(${e}+1)`).join(' × ')} = ${ans} divisors.`,
        params: { N },
      };
    },
    solve({ N }) { let c = 0; for (let d = 1; d <= N; d++) if (N % d === 0) c++; return [c]; },
  }),
  tpl({
    id: 'old-handshakes', bands: ['g56', 'g78'], tier: 3, topic: 'counting', strategy: 'handshakes',
    build(r, band) {
      const n = old(band) ? I(r, 12, 40) : I(r, 6, 16), ans = C2(n);
      return {
        text: `At a club meeting, each of the ${n} members shakes hands exactly once with every other member. How many handshakes are there?`, ans,
        wrong: wrongs(ans, [n * (n - 1), n * n, (n * (n + 1)) / 2, C2(n - 1), n * (n - 1) - 1]),
        why: `Each of the ${n} members shakes ${n - 1} hands, but that counts every handshake twice (once for each person). So there are ${n} × ${n - 1} ÷ 2 = ${ans}.`,
        params: { n },
      };
    },
    solve({ n }) { let c = 0; for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) c++; return [c]; },
  }),
  tpl({
    id: 'old-wheels', bands: ['g56', 'g78'], tier: 3, topic: 'number', strategy: 'heads-and-legs',
    build(r, band) {
      const g = old(band);
      const k = g ? 5 : 3, V = g ? I(r, 20, 60) : I(r, 10, 30), x = I(r, 2, V - 2), Wh = 2 * (V - x) + k * x;
      const text = g
        ? `A car park holds motorbikes and cars — ${V} vehicles in all. Every car carries a spare wheel in its boot, so each car has 5 wheels and each motorbike 2. Altogether there are ${Wh} wheels. How many cars are there?`
        : `A cycle shop has bicycles and tricycles — ${V} cycles in all, with ${Wh} wheels altogether. How many tricycles are there?`;
      return {
        text, ans: x,
        wrong: wrongs(x, [V - x, Wh - 2 * V, Math.round(Wh / k), Math.floor(Wh / 4), x + 2, x - 2]),
        why: `If all ${V} had 2 wheels there would be ${2 * V} wheels. Each ${g ? 'car' : 'tricycle'} adds ${k - 2} more, and the ${Wh - 2 * V} extra wheels make ${(Wh - 2 * V)} ÷ ${k - 2} = ${x}.`,
        params: { V, Wh, k },
      };
    },
    solve({ V, Wh, k }) { const out = []; for (let x = 0; x <= V; x++) if (2 * (V - x) + k * x === Wh) out.push(x); return out; },
  }),
  tpl({
    id: 'old-age-times', bands: ['g56', 'g78'], tier: 3, topic: 'number', strategy: 'age-problems',
    build(r, band) {
      const k = I(r, 3, old(band) ? 7 : 5), m = I(r, 2, k - 1), s = I(r, 3, 16);
      const y = (s * (k - m)) / (m - 1);
      if (!Number.isInteger(y) || y < 2 || y > 40) return null;
      const times = (t) => (t === 2 ? 'twice' : `${word(t)} times`);
      return {
        text: `A mother is ${times(k)} as old as her son. In ${y} years she will be ${times(m)} as old as he is then. How old is the son now?`, ans: s,
        wrong: wrongs(s, [k * s, s + y, y, m * s, s + 2, s - 2]),
        why: `Try the son at ${s}: the mother is ${k * s}. In ${y} years they are ${s + y} and ${k * s + y}, and ${k * s + y} = ${m} × ${s + y}, as it must be.`,
        params: { k, m, y },
      };
    },
    solve({ k, m, y }) { const out = []; for (let s = 1; s <= 120; s++) if (k * s + y === m * (s + y)) out.push(s); return out; },
  }),
  tpl({
    id: 'old-average-drop', bands: ['g56', 'g78'], tier: 3, topic: 'number', strategy: 'work-backwards',
    build(r, band) {
      const g = old(band), n = g ? I(r, 8, 15) : I(r, 5, 8), A = g ? I(r, 30, 90) : I(r, 12, 40);
      const x = I(r, 1, 3 * A), B = (n * A - x) / (n - 1);
      if (!Number.isInteger(B) || B <= 0 || B === A) return null;
      return {
        text: `The average of ${n} numbers is ${A}. When one of the numbers is taken away, the average of the other ${n - 1} is ${B}. Which number was taken away?`, ans: x,
        wrong: wrongs(x, [Math.abs(A - B), A + (A - B), n * A - n * B, n * A, (n - 1) * B, A + B]),
        why: `The ${n} numbers add up to ${n} × ${A} = ${n * A}. The ${n - 1} left add up to ${n - 1} × ${B} = ${(n - 1) * B}, so the missing one is ${n * A} − ${(n - 1) * B} = ${x}.`,
        params: { n, A, B },
      };
    },
    solve({ n, A, B }) { const out = []; for (let x = -2000; x <= 5000; x++) if ((n * A - x) === B * (n - 1)) out.push(x); return out; },
  }),
  tpl({
    id: 'old-staircase-perimeter', bands: ['g56', 'g78'], tier: 3, topic: 'geometry', strategy: 'staircase-perimeter',
    build(r, band) {
      const g = old(band), k = g ? I(r, 4, 6) : I(r, 3, 4);
      const steps = Array.from({ length: k }, () => [I(r, g ? 2 : 1, g ? 9 : 4), I(r, g ? 2 : 1, g ? 9 : 4)]);
      const W = steps.reduce((a, s) => a + s[0], 0), H = steps.reduce((a, s) => a + s[1], 0), ans = 2 * (W + H);
      const u = Math.min(240 / W, 160 / H); const pts = [[0, 0]]; let x = 0, y = 0;
      for (const [dx, dy] of steps) { x += dx; pts.push([x, y]); y += dy; pts.push([x, y]); }
      pts.push([0, H]);
      let s = `<polygon points="${pts.map(([a, b]) => `${(40 + a * u).toFixed(1)},${(14 + b * u).toFixed(1)}`).join(' ')}" class="dg-fill2"/>`;
      s += T((40 + (W * u) / 2).toFixed(1), (14 + H * u + 20).toFixed(1), `${W} cm`) + T(34, (14 + (H * u) / 2 + 5).toFixed(1), `${H} cm`, 'dg-text', 'end');
      return {
        text: `Every corner of this staircase shape is a right angle. Its bottom edge is ${W} cm and its left edge is ${H} cm. What is its perimeter, in centimetres?`, ans,
        wrong: wrongs(ans, [W + H, W * H, 2 * W + H, W + 2 * H, ans - 2 * k, ans + 2 * k]),
        why: `Slide every step's top edge up and every riser left: together they make a rectangle ${W} cm by ${H} cm. So the perimeter is 2 × (${W} + ${H}) = ${ans} cm.`,
        fig: svg(Math.ceil(60 + W * u), Math.ceil(44 + H * u), s, 'A staircase shape'), params: { steps },
      };
    },
    solve({ steps }) {
      const pts = [[0, 0]]; let x = 0, y = 0;
      for (const [dx, dy] of steps) { x += dx; pts.push([x, y]); y += dy; pts.push([x, y]); }
      pts.push([0, y]);
      let per = 0; pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; per += Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]); });
      return [per];
    },
  }),
  tpl({
    id: 'old-rect-strip', bands: ['g56', 'g78'], tier: 3, topic: 'counting', strategy: 'count-rectangles',
    build(r, band) {
      const R = old(band) ? P(r, [2, 3, 4]) : P(r, [1, 2]), C = old(band) ? I(r, 4, 9) : I(r, 3, 8);
      const ans = C2(R + 1) * C2(C + 1);
      return {
        text: `How many rectangles of any size can be traced along the lines of this ${R}-by-${C} grid? (Squares count as rectangles too.)`, ans,
        wrong: wrongs(ans, [R * C, C2(C + 1) * R, ans - R * C, (R + 1) * (C + 1), ans + C]),
        why: `A rectangle is fixed by choosing 2 of the ${C + 1} upright lines and 2 of the ${R + 1} flat lines. That is ${C2(C + 1)} × ${C2(R + 1)} = ${ans} ways.`,
        fig: grid(C, R, new Set(), 36), params: { R, C },
      };
    },
    solve({ R, C }) {
      let n = 0;
      for (let x1 = 0; x1 <= C; x1++) for (let x2 = x1 + 1; x2 <= C; x2++) for (let y1 = 0; y1 <= R; y1++) for (let y2 = y1 + 1; y2 <= R; y2++) n++;
      return [n];
    },
  }),
  tpl({
    id: 'old-triangle-angle', bands: ['g56', 'g78'], tier: 3, topic: 'geometry', strategy: 'angle-chasing',
    build(r, band) {
      const kind = P(r, old(band) ? ['ext', 'iso'] : ['int', 'ext']);
      let a, b, ans, s = '';
      const line = (x1, y1, x2, y2, c = 'dg-line') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${c}"/>`;
      if (kind === 'iso') {
        a = 2 * I(r, 10, 60); b = 0; ans = 90 + a / 2;
        s += `<polygon points="30,180 250,180 140,30" class="dg-fill2"/>` + line(250, 180, 340, 180);
        s += line(78, 100, 92, 110) + line(188, 110, 202, 100);
        s += T(140, 70, `${a}°`, 'dg-accent') + T(268, 172, '?', 'dg-accent');
      } else {
        a = I(r, 25, 80); b = I(r, 25, 80); if (a + b > 155 || a === b) return null;
        ans = kind === 'int' ? 180 - a - b : a + b;
        s += `<polygon points="30,180 250,180 110,30" class="dg-fill2"/>`;
        if (kind === 'ext') s += line(250, 180, 340, 180);
        s += T(64, 172, `${a}°`, 'dg-accent') + T(112, 70, `${b}°`, 'dg-accent') + T(kind === 'ext' ? 268 : 224, 172, '?', 'dg-accent');
      }
      const text = kind === 'iso'
        ? `The triangle has two equal sides (marked), and the angle between them is ${a}°. One side is extended. What is the angle marked ?, in degrees? (Not drawn to scale.)`
        : kind === 'ext'
          ? `Two angles of the triangle are ${a}° and ${b}°. One side is extended. What is the outside angle marked ?, in degrees? (Not drawn to scale.)`
          : `Two angles of the triangle are ${a}° and ${b}°. What is the third angle, marked ?, in degrees? (Not drawn to scale.)`;
      const why = kind === 'iso'
        ? `The two base angles are equal: (180 − ${a}) ÷ 2 = ${(180 - a) / 2}°. The outside angle makes a straight line with one of them, so it is 180 − ${(180 - a) / 2} = ${ans}°.`
        : kind === 'ext'
          ? `The angle inside next to ? is 180 − ${a} − ${b} = ${180 - a - b}°. The ? makes a straight line with it, so ? = 180 − ${180 - a - b} = ${ans}° — the two far angles added.`
          : `The angles of a triangle add to 180°, so ? = 180 − ${a} − ${b} = ${ans}°.`;
      return {
        text, ans, why,
        wrong: wrongs(ans, [180 - ans, 360 - ans, a + b, 180 - a, 90 + a, a], { max: 359 }),
        fig: svg(350, 200, s, 'A triangle with angles marked'), params: { kind, a, b },
      };
    },
    solve({ kind, a, b }) {
      const out = [];
      for (let x = 1; x < 360; x++) {
        if (kind === 'int' && a + b + x === 180) out.push(x);
        if (kind === 'ext' && (180 - x) + a + b === 180) out.push(x);
        if (kind === 'iso') { const y = 180 - x; if (2 * y + a === 180) out.push(x); }
      }
      return out;
    },
  }),
  tpl({
    id: 'old-calendar', bands: ['g56', 'g78'], tier: 3, topic: 'logic', strategy: 'calendar-days',
    build(r, band) {
      const g = old(band), m1 = I(r, 3, g ? 12 : 8), d1 = I(r, 1, MLEN[m1]), w1 = I(r, 0, 6);
      const next = g && r() < 0.6; if (!next && m1 === 12) return null;
      const m2 = next ? I(r, 1, 2) : I(r, m1 + 1, Math.min(12, m1 + 4)), d2 = I(r, 1, next && m2 === 2 ? 28 : MLEN[m2]);
      const doy = (m, d) => MLEN.slice(1, m).reduce((a, x) => a + x, 0) + d;
      const diff = next ? 365 - doy(m1, d1) + doy(m2, d2) : doy(m2, d2) - doy(m1, d1);
      const ans = DAYS[(w1 + diff) % 7];
      return {
        text: `${d1} ${MONTHS[m1]} is a ${DAYS[w1]}. What day of the week is ${d2} ${MONTHS[m2]}${next ? ' of the next year' : ' of the same year'}?`, ans,
        wrong: others(ans, DAYS),
        why: `From ${d1} ${MONTHS[m1]} to ${d2} ${MONTHS[m2]} is ${diff} days, and ${diff} = 7 × ${Math.floor(diff / 7)} + ${diff % 7}. Whole weeks change nothing, so move ${diff % 7} day${diff % 7 === 1 ? '' : 's'} on from ${DAYS[w1]}.`,
        params: { m1, d1, w1, m2, d2, next },
      };
    },
    solve({ m1, d1, w1, m2, d2, next }) {
      const out = new Set();
      for (let y = 2000; y <= 2030; y++) {
        if (new Date(Date.UTC(y, m1 - 1, d1)).getUTCDay() !== w1) continue;
        out.add(DAYS[new Date(Date.UTC(y + (next ? 1 : 0), m2 - 1, d2)).getUTCDay()]);
      }
      return [...out];
    },
  }),
  tpl({
    id: 'old-egg-remainders', bands: ['g56', 'g78'], tier: 3, topic: 'number', strategy: 'remainder-puzzles',
    build(r, band) {
      const mods = old(band) ? shuffle([3, 4, 5, 7, 11], r).slice(0, 3) : shuffle([3, 4, 5, 7], r).slice(0, 2);
      if (mods.some((a, i) => mods.some((b, j) => i < j && gcd(a, b) > 1))) return null;
      const L = mods.reduce((a, b) => a * b, 1); if (L > 400) return null;
      const x = I(r, Math.max(...mods) + 1, L - 1), rem = mods.map((m) => x % m);
      const parts = mods.map((m, i) => `in boxes of ${m} there ${rem[i] === 1 ? 'is 1 egg' : rem[i] === 0 ? 'are none' : `are ${rem[i]}`} left over`);
      return {
        text: `A farmer packs her eggs. ${parts[0][0].toUpperCase() + parts.slice(0, -1).join('; ').slice(1)}; and ${parts[parts.length - 1]}. She has fewer than ${L} eggs. How many eggs does she have?`, ans: x,
        wrong: wrongs(x, [x + mods[0], x - mods[0], L - x, x + mods[1], rem.reduce((a, b) => a + b, 0), x + 1]),
        why: `List the numbers that fit the boxes of ${mods[0]} (${x % mods[0]}, ${(x % mods[0]) + mods[0]}, ${(x % mods[0]) + 2 * mods[0]}, …) and test each against the other boxes. The only one below ${L} that fits every rule is ${x}.`,
        params: { mods, rem, L },
      };
    },
    solve({ mods, rem, L }) { const out = []; for (let x = 1; x < L; x++) if (mods.every((m, i) => x % m === rem[i])) out.push(x); return out; },
  }),
  tpl({
    id: 'old-sequence-term', bands: ['g56', 'g78'], tier: 3, topic: 'patterns', strategy: 'find-the-rule',
    build(r, band) {
      const g = old(band), a = g ? I(r, -20, 50) : I(r, 2, 20), d = g ? P(r, [-13, -11, -9, -7, 3, 6, 7, 9, 11, 13]) : I(r, 3, 9), n = g ? I(r, 50, 500) : I(r, 20, 100);
      const ans = a + (n - 1) * d;
      return {
        text: `The sequence ${a}, ${a + d}, ${a + 2 * d}, ${a + 3 * d}, … goes on in the same way. What is its ${ord(n)} term?`, ans,
        wrong: wrongs(ans, [a + n * d, n * d, a + (n - 2) * d, (n - 1) * d, a * n], { min: -Infinity, step: Math.abs(d) }),
        why: `Each term ${d > 0 ? `adds ${d}` : `goes down by ${-d}`}, and from the 1st term to the ${ord(n)} there are ${n - 1} steps. So the ${ord(n)} term is ${a} ${d > 0 ? '+' : '−'} ${n - 1} × ${Math.abs(d)} = ${ans}.`,
        params: { a, d, n },
      };
    },
    solve({ a, d, n }) { let t = a; for (let i = 1; i < n; i++) t += d; return [t]; },
  }),
  tpl({
    id: 'old-painted-cube', bands: ['g56', 'g78'], tier: 3, topic: 'geometry', strategy: 'painted-cubes',
    build(r, band) {
      const n = old(band) ? I(r, 4, 10) : I(r, 3, 6), kind = P(r, ['two', 'one']);
      const ans = kind === 'two' ? 12 * (n - 2) : 6 * (n - 2) ** 2;
      return {
        text: `A ${n} cm × ${n} cm × ${n} cm cube is painted on the outside, then cut into 1 cm cubes. How many of the small cubes have exactly ${kind} painted face${kind === 'one' ? '' : 's'}?`, ans,
        wrong: wrongs(ans, [12 * n, 8, 6 * (n - 2) ** 2, 12 * (n - 2), (n - 2) ** 3, 12 * (n - 1), 6 * n * n, 24 * (n - 2)]),
        why: kind === 'two'
          ? `Two painted faces means on an edge but not at a corner. Each of the 12 edges has ${n} − 2 = ${n - 2} such cubes, so 12 × ${n - 2} = ${ans}.`
          : `One painted face means in the middle of a face, away from every edge. Each of the 6 faces has a ${n - 2} × ${n - 2} square of them, so 6 × ${(n - 2) ** 2} = ${ans}.`,
        fig: cuboid(n, n, n, 'cm', n > 6 ? 16 : 24), params: { n, kind },
      };
    },
    solve({ n, kind }) {
      const want = kind === 'two' ? 2 : 1;
      return [cubesBy(n, n, n, (x, y, z) => [x, y, z].filter((v) => v === 0 || v === n - 1).length === want)];
    },
  }),
  tpl({
    id: 'old-venn-both', bands: ['g56', 'g78'], tier: 3, topic: 'counting', strategy: 'overlapping-groups',
    build(r, band) {
      const g = old(band), both = I(r, 2, g ? 40 : 10), oa = I(r, 2, g ? 60 : 15), ob = I(r, 2, g ? 60 : 15), ne = I(r, 1, g ? 30 : 8);
      const N = both + oa + ob + ne, A = oa + both, B = ob + both;
      const askNeither = g && r() < 0.5;
      const ans = askNeither ? ne : both;
      const text = askNeither
        ? `Of ${N} pupils, ${A} play chess, ${B} play cricket and ${both} play both. How many play neither?`
        : `Of ${N} pupils, ${A} play chess, ${B} play cricket and ${ne} play neither. How many play both?`;
      return {
        text, ans,
        wrong: wrongs(ans, askNeither ? [N - A - B, N - A - B + 2 * both, A + B - N, both, N - A] : [A + B - N, N - ne, A + B, A - both, B - both, ne]),
        why: askNeither
          ? `Chess or cricket or both: ${A} + ${B} − ${both} = ${A + B - both} (the ${both} were counted twice). So ${N} − ${A + B - both} = ${ne} play neither.`
          : `${N} − ${ne} = ${N - ne} play at least one game. Adding ${A} + ${B} = ${A + B} counts the players of both twice, so ${A + B} − ${N - ne} = ${both} play both.`,
        params: { N, A, B, both: askNeither ? both : null, ne: askNeither ? null : ne },
      };
    },
    solve({ N, A, B, both, ne }) {
      const out = [];
      for (let x = 0; x <= N; x++) {
        const b = both ?? x, n = ne ?? x;
        if (A - b >= 0 && B - b >= 0 && (A - b) + (B - b) + b + n === N) out.push(x);
      }
      return out;
    },
  }),
  tpl({
    id: 'old-ladder', bands: ['g78'], tier: 3, topic: 'geometry', strategy: 'area-cut-and-move',
    build(r) {
      const [p, q, c] = P(r, [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [6, 8, 10]]);
      const k = c <= 13 ? I(r, 1, 3) : 1, flip = r() < 0.5;
      const b = (flip ? q : p) * k, h = (flip ? p : q) * k, L = c * k;
      let s = `<line x1="40" y1="10" x2="40" y2="190" class="dg-line"/><line x1="40" y1="190" x2="250" y2="190" class="dg-line"/>`;
      const bx = 40 + Math.round((b / L) * 170), hy = 190 - Math.round((h / L) * 170);
      s += `<line x1="${bx}" y1="190" x2="40" y2="${hy}" class="dg-hand"/>` + T((bx + 40) / 2 + 22, (hy + 190) / 2, `${L} m`, 'dg-accent', 'start') + T((40 + bx) / 2, 208, `${b} m`) + T(30, (hy + 190) / 2, '?', 'dg-accent', 'end');
      return {
        text: `A ladder ${L} m long leans against an upright wall. Its foot is ${b} m from the wall. How high up the wall does the ladder reach, in metres?`, ans: h,
        wrong: wrongs(h, [L - b, L + b, Math.round(Math.sqrt(L * L + b * b)), L, (L + b) / 2, h + k]),
        why: `The wall, the ground and the ladder make a right-angled triangle, so height² = ${L}² − ${b}² = ${L * L} − ${b * b} = ${h * h}. The height is ${h} m, because ${h} × ${h} = ${h * h}.`,
        fig: svg(270, 216, s, 'A ladder against a wall'), params: { L, b },
      };
    },
    solve({ L, b }) { const out = []; for (let h = 1; h <= L; h++) if (h * h + b * b === L * L) out.push(h); return out; },
  }),
  tpl({
    id: 'old-dice-tower', bands: ['g56', 'g78'], tier: 3, topic: 'geometry', strategy: 'dice-faces',
    build(r, band) {
      const k = old(band) ? I(r, 3, 5) : 3, t = I(r, 1, 6), ans = 7 * k - t;
      let s = ''; const u = 44, x0 = 40, top = 30;
      s += `<polygon points="${x0},${top} ${x0 + 18},${top - 14} ${x0 + u + 18},${top - 14} ${x0 + u},${top}" class="dg-fill1"/>` + T(x0 + u / 2 + 9, top - 3, t, 'dg-small');
      for (let i = 0; i < k; i++) s += `<rect x="${x0}" y="${top + i * u}" width="${u}" height="${u}" class="dg-fill2"/><polygon points="${x0 + u},${top + i * u} ${x0 + u + 18},${top + i * u - 14} ${x0 + u + 18},${top + (i + 1) * u - 14} ${x0 + u},${top + (i + 1) * u}" class="dg-fill3"/>`;
      s += `<line x1="10" y1="${top + k * u}" x2="140" y2="${top + k * u}" class="dg-line"/>`;
      return {
        text: `${Word(k)} ordinary dice are stacked in a tower on a table. On every die, opposite faces add up to 7. The top face shows ${t}. What is the total of the hidden top and bottom faces — the ones pressed against another die or the table?`, ans,
        wrong: wrongs(ans, [7 * k, 7 * k + t, 7 * (k - 1), 7 * k - 2 * t, 6 * k, 7 * (k - 1) - t]),
        why: `Each die's top and bottom add to 7, so the ${k} dice have ${7 * k} on their tops and bottoms together. Only the very top face (${t}) is visible, leaving ${7 * k} − ${t} = ${ans}.`,
        fig: svg(160, top + k * u + 12, s, 'A tower of dice'), params: { k, t },
      };
    },
    solve({ k, t }) {
      const OPP = { 1: 6, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1 }, out = new Set();
      const go = (i, sum) => { if (i === k - 1) { out.add(sum + OPP[t]); return; } for (let f = 1; f <= 6; f++) go(i + 1, sum + f + OPP[f]); };
      go(0, 0); return [...out];
    },
  }),
  tpl({
    id: 'old-think-number', bands: ['g56', 'g78'], tier: 3, topic: 'number', strategy: 'work-backwards',
    build(r, band) {
      const g = old(band), x = I(r, 3, g ? 60 : 30);
      const ops = [['×', I(r, 2, 5)], [P(r, ['+', '−']), I(r, 3, 20)], ['÷', I(r, 2, 4)], ['+', I(r, 2, 15)]];
      if (g) ops.push(['×', I(r, 2, 3)]);
      let v = x;
      for (const [o, k] of ops) { if (o === '×') v *= k; if (o === '+') v += k; if (o === '−') v -= k; if (o === '÷') { if (v % k) return null; v /= k; } }
      if (v <= 0) return null;
      const say = { '×': (k) => `multiplies by ${k}`, '+': (k) => `adds ${k}`, '−': (k) => `subtracts ${k}`, '÷': (k) => `divides by ${k}` };
      const undo = { '×': (k) => `divide by ${k}`, '+': (k) => `subtract ${k}`, '−': (k) => `add ${k}`, '÷': (k) => `multiply by ${k}` };
      // a classic slip: undoing the steps in the ORDER they were done
      let s1 = v; for (const [o, k] of ops) { if (o === '×') s1 /= k; if (o === '+') s1 -= k; if (o === '−') s1 += k; if (o === '÷') s1 *= k; }
      return {
        text: `Meera thinks of a number. She ${ops.map(([o, k]) => say[o](k)).join(', then ')}. She ends with ${v}. What number did she think of?`, ans: x,
        wrong: wrongs(x, [Math.round(s1), x + 1, 2 * x, x - 2, Math.round(x / 2), x + 5]),
        why: `Work backwards from ${v}, undoing each step in reverse order: ${[...ops].reverse().map(([o, k]) => undo[o](k)).join(', ')}. That brings you back to ${x}.`,
        params: { ops, v },
      };
    },
    solve({ ops, v }) {
      const out = [];
      for (let y = -200; y <= 3000; y++) {
        let t = y, ok = true;
        for (const [o, k] of ops) { if (o === '×') t *= k; if (o === '+') t += k; if (o === '−') t -= k; if (o === '÷') { if (t % k) { ok = false; break; } t /= k; } }
        if (ok && t === v) out.push(y);
      }
      return out;
    },
  }),
  tpl({
    id: 'old-bar-ratio', bands: ['g56', 'g78'], tier: 3, topic: 'number', strategy: 'bar-model',
    build(r, band) {
      const g = old(band), q = I(r, 3, g ? 9 : 6), p = I(r, 1, q - 1); if (gcd(p, q) > 1) return null;
      const k = I(r, 3, g ? 25 : 12), A = p * k, B = q * k;
      if (g && r() < 0.5) {
        return {
          text: `Asha has ${p}/${q} as many shells as Ben. Ben has ${B - A} more shells than Asha. How many shells do they have altogether?`, ans: A + B,
          wrong: wrongs(A + B, [B, A, (B - A) * q, (B - A) * (q - p) , B - A + B, A + B + k]),
          why: `Draw Ben as ${q} equal bars and Asha as ${p}. The difference is ${q - p} bar${q - p > 1 ? 's' : ''} = ${B - A}, so one bar is ${k} and together they have ${p + q} bars = ${A + B}.`,
          params: { p, q, diff: B - A },
        };
      }
      return {
        text: `Asha has ${p}/${q} as many shells as Ben. Together they have ${A + B} shells. How many shells does Ben have?`, ans: B,
        wrong: wrongs(B, [A, (A + B) / 2, Math.round((A + B) / q), k, A + B - k, Math.round(((A + B) * p) / q)]),
        why: `Draw Ben as ${q} equal bars and Asha as ${p}: ${p + q} bars make ${A + B}, so one bar is ${k}. Ben has ${q} × ${k} = ${B}.`,
        params: { p, q, total: A + B },
      };
    },
    solve({ p, q, total, diff }) {
      const out = [];
      for (let B = 1; B <= 3000; B++) {
        if ((p * B) % q) continue; const A = (p * B) / q;
        if (total !== undefined && A + B === total) out.push(B);
        if (diff !== undefined && B - A === diff) out.push(A + B);
      }
      return out;
    },
  }),
  tpl({
    id: 'old-digit-sum-count', bands: ['g56', 'g78'], tier: 3, topic: 'counting', strategy: 'digit-puzzles',
    build(r, band) {
      const g = old(band), k = g ? I(r, 4, 24) : I(r, 3, 16);
      const cnt2 = (s) => (s < 0 || s > 18 ? 0 : s <= 9 ? s + 1 : 19 - s);
      let ans = 0;
      if (g) for (let a = 1; a <= 9; a++) ans += cnt2(k - a);
      else ans = Math.min(9, k) - Math.max(1, k - 9) + 1;
      return {
        text: `How many ${g ? 'three' : 'two'}-digit numbers have digits that add up to ${k}?`, ans,
        wrong: wrongs(ans, [ans + 1, ans - 1, k, k + 1, ans + 2, 10 - (k % 10)]),
        why: g
          ? `Take the hundreds digit from 1 to 9 one at a time, and count the ways the other two digits (0 to 9) can make up the rest. Adding the nine counts gives ${ans}.`
          : `The tens digit can be anything from ${Math.max(1, k - 9)} to ${Math.min(9, k)}, and then the units digit is fixed. That is ${ans} numbers.`,
        params: { k, digits: g ? 3 : 2 },
      };
    },
    solve({ k, digits }) {
      let c = 0;
      for (let n = 10 ** (digits - 1); n < 10 ** digits; n++) if ([...String(n)].reduce((a, d) => a + +d, 0) === k) c++;
      return [c];
    },
  }),
  tpl({
    id: 'old-head-on', bands: ['g56', 'g78'], tier: 3, topic: 'measure', strategy: 'meeting-and-overtaking',
    build(r, band) {
      const g = old(band), a = I(r, 8, 24), b = I(r, 8, 24), e = g ? P(r, [10, 15, 20, 30]) : 0, t = I(r, e + 10, e + 150);
      const tot = a * t + b * (t - e); if (tot % 60) return null;
      const D = tot / 60; if (D > 60 || D < 3) return null;
      return {
        text: g
          ? `Two towns are ${D} km apart. Ravi cycles from one towards the other at ${a} km/h. ${e} minutes later Sana sets off from the other town towards him at ${b} km/h. How many minutes after Ravi set off do they meet?`
          : `Two towns are ${D} km apart. Ravi and Sana cycle towards each other from the two towns, setting off at the same moment. Ravi rides at ${a} km/h and Sana at ${b} km/h. After how many minutes do they meet?`,
        ans: t,
        wrong: wrongs(t, [Math.round((60 * D) / a), Math.round((60 * D) / b), t + e + 5, Math.round((60 * D) / (a + b)) + (g ? 0 : 10), t - 10, Math.round((120 * D) / (a + b))], { step: 5 }),
        why: g
          ? `In the first ${e} minutes Ravi rides ${(a * e) / 60} km alone. After that the gap closes at ${a} + ${b} = ${a + b} km/h, so the rest takes ${t - e} minutes, ${t} in all.`
          : `Riding towards each other, they close the gap at ${a} + ${b} = ${a + b} km/h. ${D} km at ${a + b} km/h takes ${D}/${a + b} of an hour, which is ${t} minutes.`,
        params: { D, a, b, e },
      };
    },
    solve({ D, a, b, e }) {
      // distances in sixtieths of a km: each minute Ravi rides a of them, Sana b
      let ra = 0, sb = 0;
      for (let m = 1; m <= 1000; m++) { ra += a; if (m > e) sb += b; if (ra + sb === 60 * D) return [m]; if (ra + sb > 60 * D) return []; }
      return [];
    },
  }),
  tpl({
    id: 'old-grid-area', bands: ['g56', 'g78'], tier: 3, topic: 'geometry', strategy: 'area-cut-and-move',
    build(r, band) {
      const g = old(band), n = g ? 10 : 8, k = g ? P(r, [3, 4]) : 3;
      const pts = Array.from({ length: k }, () => [I(r, 0, n), I(r, 0, n)]);
      const cx = pts.reduce((a, p) => a + p[0], 0) / k, cy = pts.reduce((a, p) => a + p[1], 0) / k;
      pts.sort((p, q) => Math.atan2(p[1] - cy, p[0] - cx) - Math.atan2(q[1] - cy, q[0] - cx));
      let s2 = 0; pts.forEach((p, i) => { const q = pts[(i + 1) % k]; s2 += p[0] * q[1] - q[0] * p[1]; });
      const ans = Math.abs(s2) / 2;
      if (ans < 4) return null;
      // every vertex must be a true corner (no three in a line), and the shape convex
      for (let i = 0; i < k; i++) {
        const a = pts[i], b = pts[(i + 1) % k], c = pts[(i + 2) % k];
        if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) <= 0) return null;
      }
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), box = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
      return {
        text: `Each small square of the grid is 1 square unit. What is the area of the shaded ${k === 3 ? 'triangle' : 'shape'}, in square units?`, ans,
        wrong: wrongs(ans, [2 * ans, box, box - ans, ans + 0.5, ans - 0.5, ans + 1], { step: 0.5 }),
        why: `Draw the smallest rectangle round the shape along the grid lines: it is ${box} square units. Cut off the right-angled triangles${k === 4 ? ' (and any rectangles)' : ''} in its corners — each is half a rectangle — and ${ans} square units are left.`,
        fig: latticeFig(n, [{ pts, cls: 'dg-fill1' }]), params: { pts },
      };
    },
    solve({ pts }) { return [pickArea(pts)]; },
  }),
  tpl({
    id: 'old-socks', bands: ['g56', 'g78'], tier: 3, topic: 'logic', strategy: 'worst-case',
    build(r, band) {
      const cols = old(band) ? ['red', 'blue', 'green', 'black'] : ['red', 'blue', 'green'];
      const cnt = cols.map(() => I(r, 3, 11)), tot = cnt.reduce((a, b) => a + b, 0);
      const kind = P(r, ['twoOf', 'oneEach']), ci = I(r, 0, cols.length - 1);
      const ans = kind === 'twoOf' ? tot - cnt[ci] + 2 : tot - Math.min(...cnt) + 1;
      const list = cols.map((c, i) => `${cnt[i]} ${c}`).join(', ').replace(/, ([^,]*)$/, ' and $1');
      return {
        text: `A drawer holds ${list} socks. In the dark, how many socks must you take out to be certain of getting ${kind === 'twoOf' ? `two ${cols[ci]} socks` : 'at least one sock of every colour'}?`, ans,
        wrong: wrongs(ans, [tot, cols.length + 1, kind === 'twoOf' ? cnt[ci] + 2 : tot - Math.max(...cnt) + 1, ans - 1, ans + 1, 2 * cols.length]),
        why: kind === 'twoOf'
          ? `Unluckiest case: you take all ${tot - cnt[ci]} socks that are not ${cols[ci]}, then one ${cols[ci]}. The next sock is certain to make two ${cols[ci]}, so ${ans}.`
          : `Unluckiest case: you take every sock except the smallest colour (${tot - Math.min(...cnt)} socks). The next one must be the missing colour, so ${ans}.`,
        params: { cnt, kind, ci },
      };
    },
    solve({ cnt, kind, ci }) {
      // the biggest handful that still FAILS, plus one
      let worst = 0;
      const go = (i, take) => {
        if (i === cnt.length) {
          const fails = kind === 'twoOf' ? take[ci] < 2 : take.some((t) => t === 0);
          if (fails) worst = Math.max(worst, take.reduce((a, b) => a + b, 0)); return;
        }
        for (let t = 0; t <= cnt[i]; t++) go(i + 1, [...take, t]);
      };
      go(0, []); return [worst + 1];
    },
  }),
  tpl({
    id: 'old-sum-product', bands: ['g56', 'g78'], tier: 3, topic: 'number', strategy: 'guess-check-improve',
    build(r, band) {
      const a = I(r, 2, old(band) ? 30 : 12), b = I(r, a + 1, old(band) ? 60 : 25), S = a + b, Pr = a * b;
      return {
        text: `Two whole numbers add up to ${S} and multiply to make ${Pr}. What is the larger of the two numbers?`, ans: b,
        wrong: wrongs(b, [a, Math.round(S / 2), S - 1, Math.round(Pr / S), b + 1, b - 1]),
        why: `Guess, check and improve: try pairs that add to ${S}, moving outward from ${Math.floor(S / 2)} and ${Math.ceil(S / 2)}. The products shrink as the numbers spread apart, and ${a} × ${b} = ${Pr}.`,
        params: { S, Pr },
      };
    },
    solve({ S, Pr }) { const out = new Set(); for (let x = 0; x <= S; x++) if (x * (S - x) === Pr) out.add(Math.max(x, S - x)); return [...out]; },
  }),
  tpl({
    id: 'old-two-dice', bands: ['g56', 'g78'], tier: 3, topic: 'counting', strategy: 'make-a-table',
    build(r, band) {
      const kind = P(r, old(band) ? ['prime', 'evenProd', 'diff'] : ['sum', 'atLeast']);
      const k = kind === 'sum' ? I(r, 3, 11) : kind === 'atLeast' ? I(r, 7, 11) : kind === 'diff' ? I(r, 1, 4) : 0;
      const w = (s) => 6 - Math.abs(s - 7);
      const c = kind === 'sum' ? w(k) : kind === 'atLeast' ? [...Array(13 - k)].reduce((a, _, i) => a + w(k + i), 0)
        : kind === 'prime' ? [2, 3, 5, 7, 11].reduce((a, s) => a + w(s), 0) : kind === 'evenProd' ? 36 - 9 : 2 * (6 - k);
      const ans = frac(c, 36);
      const ask = { sum: `the total is exactly ${k}`, atLeast: `the total is ${k} or more`, prime: 'the total is a prime number', evenProd: 'the two numbers multiply to an even number', diff: `the two numbers differ by exactly ${k}` }[kind];
      return {
        text: `Two fair six-sided dice are rolled. What is the probability that ${ask}? Give your answer as a fraction.`, ans,
        wrong: fwrongs(ans, [[c, 11], [c + 1, 36], [c - 1, 36], [36 - c, 36], [c, 21], [c, 12]]),
        why: `Make a 6 × 6 table of the 36 equally likely rolls. ${c} of them work, so the probability is ${c}/36 = ${ans}.`,
        params: { kind, k },
      };
    },
    solve({ kind, k }) {
      let c = 0; const prime = (n) => n > 1 && [...Array(n - 2)].every((_, i) => n % (i + 2));
      for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) {
        if (kind === 'sum' && a + b === k) c++;
        if (kind === 'atLeast' && a + b >= k) c++;
        if (kind === 'prime' && prime(a + b)) c++;
        if (kind === 'evenProd' && (a * b) % 2 === 0) c++;
        if (kind === 'diff' && Math.abs(a - b) === k) c++;
      }
      return [frac(c, 36)];
    },
  }),
  tpl({
    id: 'old-clock-gain', bands: ['g56', 'g78'], tier: 3, topic: 'measure', strategy: 'make-a-table',
    build(r, band) {
      const g = old(band), gain = I(r, 2, 6), h0 = I(r, 6, 9), H = I(r, 3, 10);
      const start = h0 * 60, shown = start + (60 + gain) * H, real = start + 60 * H;
      if (g) {
        const ans = timeStr(real);
        return {
          text: `A clock gains ${gain} minutes every hour. It is set to the right time at ${timeStr(start)}. Later the clock shows ${timeStr(shown)}. What is the real time then?`, ans,
          wrong: others(ans, [timeStr(shown - gain * H - gain), timeStr(shown - gain), timeStr(real + gain), timeStr(real - 60), timeStr(shown + gain * H), timeStr(shown), timeStr(real + 2 * gain)]),
          why: `Each real hour the clock moves on ${60 + gain} minutes. It has moved ${(60 + gain) * H} minutes = ${H} lots of ${60 + gain}, so ${H} real hours have passed: the time is ${ans}.`,
          params: { gain, start, shown, ask: 'real' },
        };
      }
      const ans = timeStr(shown);
      return {
        text: `A clock gains ${gain} minutes every hour. It is set to the right time at ${timeStr(start)}. What time does the clock show when the real time is ${timeStr(real)}?`, ans,
        wrong: others(ans, [timeStr(real), timeStr(real + gain), timeStr(real - gain * H), timeStr(shown + gain), timeStr(real + 60), timeStr(shown - 60), timeStr(shown + 2 * gain)]),
        why: `${H} real hours pass, and the clock gains ${gain} minutes in each: ${H} × ${gain} = ${gain * H} minutes ahead. So it shows ${ans}.`,
        params: { gain, start, real, ask: 'shown' },
      };
    },
    solve({ gain, start, shown, real, ask }) {
      const out = []; let clockT = start, t = start;
      for (let h = 1; h <= 24; h++) { clockT += 60 + gain; t += 60; if (ask === 'shown' && t === real) out.push(timeStr(clockT)); if (ask === 'real' && clockT === shown) out.push(timeStr(t)); }
      return out;
    },
  }),
];

// ================================================================= TIER 4
const TIER4 = [
  tpl({
    id: 'old-units-sum', bands: ['g56', 'g78'], tier: 4, topic: 'number', strategy: 'units-digit-cycles',
    echo: true, // a one-digit answer can coincide with a base in the question; that is no clue
    build(r, band) {
      const g = old(band), terms = Array.from({ length: g ? 3 : 2 }, () => [P(r, [2, 3, 4, 7, 8, 9, 13, 17]), I(r, g ? 100 : 20, g ? 2099 : 199)]);
      const last = (b, n) => { const cyc = []; let d = b % 10; while (!cyc.includes(d)) { cyc.push(d); d = (d * b) % 10; } return cyc[(n - 1) % cyc.length]; };
      const ds = terms.map(([b, n]) => last(b, n)), ans = ds.reduce((a, b) => a + b, 0) % 10;
      return {
        text: `What is the last digit of ${terms.map(([b, n]) => pow(b, n)).join(' + ')}?`, ans,
        wrong: wrongs(ans, [...ds, ds.reduce((a, b) => a + b, 0) % 10 === 0 ? 1 : 0, (ds[0] * ds[1]) % 10, (ans + 5) % 10], { max: 9 }),
        why: `Only last digits matter. The powers end in ${ds.join(' and ')} (each from its own repeating cycle), and ${ds.join(' + ')} ends in ${ans}.`,
        params: { terms },
      };
    },
    solve({ terms }) { let s = 0; for (const [b, n] of terms) { let d = 1; for (let i = 0; i < n; i++) d = (d * b) % 10; s += d; } return [s % 10]; },
  }),
  tpl({
    id: 'old-trailing-zeros', bands: ['g56', 'g78'], tier: 4, topic: 'number', strategy: 'simpler-case',
    build(r, band) {
      const n = old(band) ? I(r, 50, 300) : I(r, 12, 60);
      let ans = 0; for (let p = 5; p <= n; p *= 5) ans += Math.floor(n / p);
      return {
        text: `The number ${n}! means ${n} × ${n - 1} × ${n - 2} × … × 2 × 1. How many zeros are at the end of ${n}!?`, ans,
        wrong: wrongs(ans, [Math.floor(n / 5), Math.floor(n / 10), Math.floor(n / 5) + Math.floor(n / 10), ans + 1, ans - 1, Math.floor(n / 2)]),
        why: `Each end zero needs a 10 = 2 × 5, and 2s are plentiful, so count the 5s. ${[5, 25, 125].filter((p) => p <= n).map((p) => `${Math.floor(n / p)} multiple${Math.floor(n / p) === 1 ? "" : "s"} of ${p}`).join(', ')} give ${ans} fives in all.`,
        params: { n },
      };
    },
    solve({ n }) { let f = 1n; for (let i = 2n; i <= BigInt(n); i++) f *= i; const s = f.toString(); return [s.length - s.replace(/0+$/, '').length]; },
  }),
  tpl({
    id: 'old-handshakes-back', bands: ['g56', 'g78'], tier: 4, topic: 'counting', strategy: 'handshakes',
    build(r, band) {
      const g = old(band), n = g ? I(r, 15, 45) : I(r, 8, 20), skip = g && r() < 0.5, H = C2(n) - (skip ? 1 : 0);
      return {
        text: skip
          ? `At a party, everyone shook hands once with everyone else — except two guests who had argued and did not shake hands with each other. There were ${H} handshakes. How many people were at the party?`
          : `At a party, everyone shook hands exactly once with everyone else. There were ${H} handshakes. How many people were at the party?`,
        ans: n,
        wrong: wrongs(n, [Math.round(Math.sqrt(2 * H)) + 1, Math.round(Math.sqrt(H)), n - 1, n + 1, Math.round(H / 2), n + 2]),
        why: `With n people there are n × (n − 1) ÷ 2 handshakes. ${n} × ${n - 1} ÷ 2 = ${C2(n)}${skip ? ', and one handshake is missing' : ''}, so there were ${n} people.`,
        params: { H, skip },
      };
    },
    solve({ H, skip }) {
      const out = [];
      for (let n = 2; n <= 200; n++) { let c = 0; for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (!(skip && a === 0 && b === 1)) c++; if (c === H) out.push(n); }
      return out;
    },
  }),
  tpl({
    id: 'old-paths-puddle', bands: ['g56', 'g78'], tier: 4, topic: 'counting', strategy: 'grid-paths',
    build(r, band) {
      const g = old(band), m = g ? I(r, 4, 6) : I(r, 3, 5), n = g ? I(r, 3, 5) : I(r, 2, 4);
      const px = I(r, 1, m - 1), py = I(r, 1, n - 1);
      const dp = (x1, y1, x2, y2, block) => {
        const W = []; for (let x = x1; x <= x2; x++) { W[x] = []; for (let y = y1; y <= y2; y++) {
          W[x][y] = block && x === block[0] && y === block[1] ? 0 : x === x1 && y === y1 ? 1 : (x > x1 ? W[x - 1][y] : 0) + (y > y1 ? W[x][y - 1] : 0);
        } }
        return W[x2][y2];
      };
      const total = dp(0, 0, m, n), through = dp(0, 0, px, py) * dp(px, py, m, n), ans = total - through;
      return {
        text: `Moving only right or up along the streets, how many different routes lead from A to B without passing the puddle at X?`, ans,
        wrong: wrongs(ans, [total, through, ans + 1, ans - 1, total - 1, m * n]),
        why: `Count the routes to every corner by adding the counts from the left and from below — with a 0 at the puddle. That gives ${total} routes in all, minus the ${through} through X, which is ${ans}.`,
        fig: streetsFig(m, n, [{ x: 0, y: 0, label: 'A' }, { x: m, y: n, label: 'B' }, { x: px, y: py, label: 'X', cls: 'dg-dot2' }]),
        params: { m, n, px, py },
      };
    },
    solve({ m, n, px, py }) { return [routes(m, n, (p) => !has(p, [px, py]))]; },
  }),
  tpl({
    id: 'old-fan-triangles', bands: ['g56', 'g78'], tier: 4, topic: 'geometry', strategy: 'count-triangles',
    build(r, band) {
      const g = old(band), k = g ? I(r, 2, 4) : I(r, 1, 3), h = g ? I(r, 1, 2) : I(r, 0, 1);
      const ans = (h + 1) * C2(k + 2);
      const s = fanGeom(k, h).map(([[x1, y1], [x2, y2]]) => `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="dg-line"/>`).join('');
      return {
        text: `How many triangles of any size can you find in this figure?`, ans,
        wrong: wrongs(ans, [C2(k + 2), (h + 1) * (k + 1), C2(k + 2) + h + 1, ans - (h + 1), ans + k + 1, (h + 1) * (k + 2)]),
        why: `Every triangle uses two of the ${k + 2} lines from the top corner and one of the ${h + 1} flat lines. That is ${C2(k + 2)} × ${h + 1} = ${ans}.`,
        fig: svg(300, 200, s, 'A triangle cut by lines'), params: { k, h },
      };
    },
    solve({ k, h }) {
      // every triple of drawn segments that meet pairwise in three different points is a triangle
      const segs = fanGeom(k, h), E = 1e-7;
      const meet = ([[x1, y1], [x2, y2]], [[x3, y3], [x4, y4]]) => {
        const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3); if (Math.abs(d) < E) return null;
        const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d, u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
        return t < -E || t > 1 + E || u < -E || u > 1 + E ? null : [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
      };
      const far = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-5;
      let c = 0;
      for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) for (let l = j + 1; l < segs.length; l++) {
        const a = meet(segs[i], segs[j]), b = meet(segs[i], segs[l]), d = meet(segs[j], segs[l]);
        if (a && b && d && far(a, b) && far(a, d) && far(b, d)) c++;
      }
      return [c];
    },
  }),
  tpl({
    id: 'old-painted-cuboid', bands: ['g56', 'g78'], tier: 4, topic: 'geometry', strategy: 'painted-cubes',
    build(r, band) {
      const g = old(band), a = I(r, g ? 3 : 2, g ? 9 : 6), b = I(r, g ? 3 : 2, g ? 9 : 6), c = I(r, 3, g ? 8 : 5);
      if (a === b && b === c) return null;
      const kind = P(r, ['none', 'one', 'two']), A = a - 2, B = b - 2, Cc = c - 2;
      const ans = kind === 'none' ? A * B * Cc : kind === 'one' ? 2 * (A * B + B * Cc + A * Cc) : 4 * (A + B + Cc);
      if (ans <= 0) return null;
      const say = { none: 'no painted face at all', one: 'exactly one painted face', two: 'exactly two painted faces' }[kind];
      return {
        text: `A ${a} cm × ${b} cm × ${c} cm block is painted on the outside and cut into 1 cm cubes. How many of the cubes have ${say}?`, ans,
        wrong: wrongs(ans, [A * B * Cc, 2 * (A * B + B * Cc + A * Cc), 4 * (A + B + Cc), a * b * c - ans, 8, 4 * (a + b + c)]),
        why: kind === 'none'
          ? `The unpainted cubes form the inside block, one layer smaller on every side: ${A} × ${B} × ${Cc} = ${ans}.`
          : kind === 'one'
            ? `One painted face means the middle of a face. The faces' middles are ${A}×${B}, ${B}×${Cc} and ${A}×${Cc}, each twice, which makes ${ans}.`
            : `Two painted faces means on an edge but not at a corner. The 12 edges, four of each length, hold 4 × (${A} + ${B} + ${Cc}) = ${ans}.`,
        fig: cuboid(a, c, b, 'cm', 18), params: { a, b, c, kind },
      };
    },
    solve({ a, b, c, kind }) {
      const want = { none: 0, one: 1, two: 2 }[kind];
      return [cubesBy(a, b, c, (x, y, z) => (x === 0) + (x === a - 1) + (y === 0) + (y === b - 1) + (z === 0) + (z === c - 1) === want)];
    },
  }),
  tpl({
    id: 'old-div-a-or-b', bands: ['g56', 'g78'], tier: 4, topic: 'number', strategy: 'overlapping-groups',
    build(r, band) {
      const g = old(band), N = g ? I(r, 300, 2000) : I(r, 100, 300);
      const [a, b] = shuffle(g ? [4, 6, 8, 9, 10, 12, 15] : [2, 3, 4, 5, 6, 7], r).slice(0, 2).sort((x, y) => x - y);
      const kind = g ? P(r, ['or', 'exactlyOne', 'neither']) : 'or';
      const A = Math.floor(N / a), B = Math.floor(N / b), AB = Math.floor(N / lcm(a, b));
      const ans = kind === 'or' ? A + B - AB : kind === 'exactlyOne' ? A + B - 2 * AB : N - A - B + AB;
      const say = { or: `divisible by ${a} or by ${b} (or both)`, exactlyOne: `divisible by exactly one of ${a} and ${b}`, neither: `divisible by neither ${a} nor ${b}` }[kind];
      return {
        text: `How many whole numbers from 1 to ${N} are ${say}?`, ans,
        wrong: wrongs(ans, [A + B, A + B - Math.floor(N / (a * b)), A + B - AB, A + B - 2 * AB, N - A - B, N - A - B + AB]),
        why: `There are ${A} multiples of ${a}, ${B} of ${b}, and ${AB} of both (multiples of ${lcm(a, b)}, the lowest common multiple). ${kind === 'or' ? `Counting the overlap once: ${A} + ${B} − ${AB} = ${ans}.` : kind === 'exactlyOne' ? `Remove the overlap from both groups: ${A} + ${B} − 2 × ${AB} = ${ans}.` : `${A} + ${B} − ${AB} = ${A + B - AB} are divisible by one or both, so ${N} − ${A + B - AB} = ${ans}.`}`,
        params: { N, a, b, kind },
      };
    },
    solve({ N, a, b, kind }) {
      let c = 0;
      for (let x = 1; x <= N; x++) { const p = x % a === 0, q = x % b === 0; if (kind === 'or' ? p || q : kind === 'exactlyOne' ? p !== q : !p && !q) c++; }
      return [c];
    },
  }),
  tpl({
    id: 'old-crt-above', bands: ['g56', 'g78'], tier: 4, topic: 'number', strategy: 'remainder-puzzles',
    build(r, band) {
      const g = old(band), mods = shuffle(g ? [3, 4, 5, 6, 7, 8, 9, 10, 11] : [2, 3, 4, 5, 6, 7], r).slice(0, g ? I(r, 3, 4) : 3).sort((a, b) => a - b);
      const M = mods.reduce(lcm, 1); if (M > (g ? 2000 : 500)) return null;
      const short = r() < 0.5;
      const x0 = short ? M - 1 : I(r, 1, M - 1), rem = mods.map((m) => x0 % m);
      const L = short ? 0 : I(r, 50, g ? 3000 : 600);
      const ans = x0 + M * Math.max(0, Math.ceil((L + 1 - x0) / M));
      return {
        text: short
          ? `What is the smallest positive whole number that leaves a remainder of one less than the divisor when divided by each of ${mods.join(', ')} — that is, remainder ${rem.join(', ')} respectively?`
          : `What is the smallest whole number greater than ${L} that leaves remainder ${rem[0]} when divided by ${mods[0]}, ${mods.slice(1).map((m, i) => `${rem[i + 1]} when divided by ${m}`).join(', and ')}?`,
        ans,
        wrong: wrongs(ans, [ans + M, ans - M, ans + 1, mods.reduce((a, b) => a * b, 1) - 1, ans - 1, ans + mods[0]]),
        why: short
          ? `One more than the number is divisible by every one of ${mods.join(', ')}. The smallest such is their lowest common multiple ${M}, so the number is ${M} − 1 = ${ans}.`
          : `Numbers that fit every rule are ${M} apart (the lowest common multiple of ${mods.join(', ')}). The smallest is ${x0}, and adding ${M}s gives the first one past ${L}: ${ans}.`,
        params: { mods, rem, L },
      };
    },
    solve({ mods, rem, L }) { for (let x = L + 1; x < L + 100000; x++) if (mods.every((m, i) => x % m === rem[i])) return [x]; return []; },
  }),
  tpl({
    id: 'old-missing-digits', bands: ['g56', 'g78'], tier: 4, topic: 'number', strategy: 'missing-digit-divisibility',
    build(r, band) {
      const g = old(band), D = P(r, g ? [24, 36, 44, 72, 99] : [6, 12, 15, 18, 45]);
      const digits = [I(r, 1, 9), I(r, 0, 9), I(r, 0, 9), I(r, 0, 9), I(r, 0, 9)];
      const [p1, p2] = shuffle([1, 2, 3, 4], r).slice(0, 2).sort();
      // the divisibility rules, digit by digit
      const rule = {
        2: (d) => d[4] % 2 === 0, 3: (d) => d.reduce((a, b) => a + b, 0) % 3 === 0, 4: (d) => (10 * d[3] + d[4]) % 4 === 0,
        5: (d) => d[4] % 5 === 0, 8: (d) => (100 * d[2] + 10 * d[3] + d[4]) % 8 === 0, 9: (d) => d.reduce((a, b) => a + b, 0) % 9 === 0,
        11: (d) => (d[0] - d[1] + d[2] - d[3] + d[4]) % 11 === 0,
      };
      const parts = { 6: [2, 3], 12: [3, 4], 15: [3, 5], 18: [2, 9], 45: [5, 9], 24: [3, 8], 36: [4, 9], 44: [4, 11], 72: [8, 9], 99: [9, 11] }[D];
      let ans = 0;
      for (let a = 0; a <= 9; a++) for (let b = 0; b <= 9; b++) { const d = digits.slice(); d[p1] = a; d[p2] = b; if (parts.every((q) => rule[q](d))) ans++; }
      if (ans < 1) return null;
      const shown = digits.map((d, i) => (i === p1 ? '□' : i === p2 ? '△' : d)).join('');
      return {
        text: `In the five-digit number ${shown}, each shape stands for one digit (they may be the same). The number is divisible by ${D}. In how many different ways can the two digits be chosen?`, ans,
        wrong: wrongs(ans, [ans + 1, ans - 1, ans + 2, 2 * ans, 0, 10]),
        why: `${D} = ${parts[0]} × ${parts[1]}, so the number must pass both tests: ${parts.map((q) => ({ 2: 'it ends in an even digit', 3: 'its digit sum is a multiple of 3', 4: 'its last two digits make a multiple of 4', 5: 'it ends in 0 or 5', 8: 'its last three digits make a multiple of 8', 9: 'its digit sum is a multiple of 9', 11: 'its alternating digit sum is a multiple of 11' })[q]).join(', and ')}. Trying each allowed digit for one shape and finding the other gives ${ans}.`,
        params: { digits, p1, p2, D },
      };
    },
    solve({ digits, p1, p2, D }) {
      let c = 0;
      for (let a = 0; a <= 9; a++) for (let b = 0; b <= 9; b++) { const d = digits.slice(); d[p1] = a; d[p2] = b; if (d[0] !== 0 && Number(d.join('')) % D === 0) c++; }
      return [c];
    },
  }),
  tpl({
    id: 'old-liars-exactly', bands: ['g56', 'g78'], tier: 4, topic: 'logic', strategy: 'truth-tellers',
    echo: true, // the islanders' statements are counts of liars, so the number of knights is often among them; that is the puzzle, not a clue
    build(r, band) {
      const n = old(band) ? I(r, 5, 7) : I(r, 4, 5), L = I(r, 1, n - 1), names = NAMES.slice(0, n);
      const says = shuffle([...Array(n - L).fill(L), ...Array.from({ length: L }, () => { let v; do v = I(r, 1, n); while (v === L); return v; })], r);
      const fits = []; for (let l = 0; l <= n; l++) if (says.filter((s) => s === l).length === n - l) fits.push(l);
      if (fits.length !== 1) return null;
      const ans = n - L;
      return {
        text: `On an island everyone is a knight, who always tells the truth, or a liar, who always lies. ${Word(n)} islanders meet. ${names.map((nm, i) => `${nm} says, "Exactly ${says[i]} of us ${says[i] === 1 ? 'is a liar' : 'are liars'}."`).join(' ')} How many of them are knights?`, ans,
        wrong: wrongs(ans, [...Array(n + 1).keys()], { max: n }),
        why: `If there are exactly L liars, then exactly the people who say L are telling the truth, so ${n} − L people must say L. Only L = ${L} works: ${n - L} people say "${L}", so there are ${ans} knights.`,
        params: { says },
      };
    },
    solve({ says }) {
      const n = says.length, out = new Set();
      for (let mask = 0; mask < 1 << n; mask++) {
        let liars = 0; for (let i = 0; i < n; i++) if (!(mask & (1 << i))) liars++;
        if (says.every((s, i) => ((mask >> i) & 1) === (s === liars ? 1 : 0))) out.add(n - liars);
      }
      return [...out];
    },
  }),
  tpl({
    id: 'old-tournament-draws', bands: ['g56', 'g78'], tier: 4, topic: 'logic', strategy: 'heads-and-legs',
    build(r, band) {
      const g = old(band), n = g ? I(r, 5, 8) : I(r, 4, 6), twice = g && r() < 0.5, G = C2(n) * (twice ? 2 : 1);
      const d = I(r, 1, G - 1), Pts = 3 * G - d;
      return {
        text: `In a football league each of the ${n} teams plays every other team ${twice ? 'twice' : 'once'}. A win scores 3 points, a draw 1 point to each team, a loss nothing. Altogether the teams scored ${Pts} points. How many games were draws?`, ans: d,
        wrong: wrongs(d, [G - d, 3 * G - Pts + 1, Math.round(Pts / 3), 3 * n * (n - 1) - Pts, G, Math.abs(2 * G - Pts)]),
        why: `There are ${G} games. A win gives out 3 points in total and a draw only 2, so if all were wins there would be ${3 * G} points. Each draw is 1 point fewer, and ${3 * G} − ${Pts} = ${d}.`,
        params: { n, twice, Pts },
      };
    },
    solve({ n, twice, Pts }) {
      let G = 0; for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) G += twice ? 2 : 1;
      const out = []; for (let d = 0; d <= G; d++) if (3 * (G - d) + 2 * d === Pts) out.push(d); return out;
    },
  }),
  tpl({
    id: 'old-height-order', bands: ['g56', 'g78'], tier: 4, topic: 'logic', strategy: 'list-systematically',
    echo: true, // the answer is one of the children named in the clues: naming them is the puzzle
    build(r, band) {
      const n = old(band) ? 6 : 5, names = shuffle(NAMES, r).slice(0, n), order = shuffle(names, r); // order[0] is the tallest
      const pos = P(r, [0, 1, 2, n - 1, n - 2]);
      const place = (o, x) => o.indexOf(x);
      const holds = (o, c) => c.t === 'gt' ? place(o, c.a) < place(o, c.b) : c.t === 'notTop' ? place(o, c.a) !== 0 : c.t === 'notBottom' ? place(o, c.a) !== n - 1 : place(o, c.a) + 1 === place(o, c.b);
      const all = perms(names), clues = [];
      for (let tries = 0; tries < 9; tries++) {
        const t = P(r, ['gt', 'gt', 'gt', 'next', 'notTop', 'notBottom']); let a = P(r, names), b = P(r, names);
        if (t === 'gt' && place(order, a) > place(order, b)) [a, b] = [b, a];
        const c = t === 'next' ? { t, a: order[Math.min(place(order, a), n - 2)], b: order[Math.min(place(order, a), n - 2) + 1] } : { t, a, b };
        if (c.a === c.b || !holds(order, c) || (t === 'notTop' && place(order, a) === n - 1) || (t === 'notBottom' && place(order, a) === 0)) continue;
        clues.push(c);
        const at = new Set(all.filter((o) => clues.every((k) => holds(o, k))).map((o) => o[pos]));
        if (at.size === 1) break;
      }
      const at = new Set(all.filter((o) => clues.every((k) => holds(o, k))).map((o) => o[pos]));
      if (at.size !== 1 || clues.length < 3) return null;
      const say = (c) => c.t === 'gt' ? `${c.a} is taller than ${c.b}.` : c.t === 'notTop' ? `${c.a} is not the tallest.` : c.t === 'notBottom' ? `${c.a} is not the shortest.` : `${c.b} comes straight after ${c.a} when they line up from tallest to shortest.`;
      const posName = ['the tallest', 'the second tallest', 'the third tallest'][pos] ?? (pos === n - 1 ? 'the shortest' : 'the second shortest');
      const ans = order[pos];
      return {
        text: `${Word(n)} friends — ${names.join(', ')} — are all different heights. ${clues.map(say).join(' ')} Who is ${posName}?`, ans,
        wrong: others(ans, names),
        why: `Line them up from tallest to shortest and place each clue in turn; only one name can ever land in that spot. The order the clues force is ${order.join(', ')} (or one like it), with ${ans} ${posName}.`,
        params: { names, clues, pos },
      };
    },
    solve({ names, clues, pos }) {
      const n = names.length;
      const ok = (o, c) => {
        const ia = o.indexOf(c.a), ib = o.indexOf(c.b);
        return c.t === 'gt' ? ia < ib : c.t === 'notTop' ? ia > 0 : c.t === 'notBottom' ? ia < n - 1 : ib === ia + 1;
      };
      return [...new Set(perms(names).filter((o) => clues.every((c) => ok(o, c))).map((o) => o[pos]))];
    },
  }),
  tpl({
    id: 'old-how-many-terms', bands: ['g56', 'g78'], tier: 4, topic: 'patterns', strategy: 'find-the-rule',
    build(r, band) {
      const g = old(band);
      if (g && r() < 0.5) {
        const k = I(r, 6, 19), lo = I(r, 50, 500), hi = I(r, lo + 200, 3000);
        const ans = Math.floor(hi / k) - Math.floor(lo / k);
        return {
          text: `How many multiples of ${k} are there between ${lo} and ${hi}? (Count ${hi} if it is a multiple, but not ${lo}.)`, ans,
          wrong: wrongs(ans, [Math.floor((hi - lo) / k) + 1, ans + 1, ans - 1, Math.round((hi - lo) / k) + 2, Math.floor(hi / k)]),
          why: `Up to ${hi} there are ${Math.floor(hi / k)} multiples of ${k}; up to ${lo} there are ${Math.floor(lo / k)}. The difference is ${ans}.`,
          params: { kind: 'mult', k, lo, hi },
        };
      }
      const a = g ? I(r, -50, 50) : I(r, 2, 20), d = g ? P(r, [-7, -6, -4, 3, 4, 6, 7, 8]) : I(r, 3, 9), n = g ? I(r, 30, 300) : I(r, 15, 80), last = a + (n - 1) * d;
      return {
        text: `How many numbers are in the list ${a}, ${a + d}, ${a + 2 * d}, …, ${last}, where each number is ${d > 0 ? `${d} more` : `${-d} less`} than the one before?`, ans: n,
        wrong: wrongs(n, [n - 1, n + 1, Math.round((last - a) / d), Math.round(last / d), Math.abs(last - a)]),
        why: `From ${a} to ${last} is ${Math.abs(last - a)}, which is ${n - 1} steps of ${Math.abs(d)}. Counting the first number too gives ${n - 1} + 1 = ${n} — like fence posts, one more than the gaps.`,
        params: { kind: 'list', a, d, last },
      };
    },
    solve({ kind, k, lo, hi, a, d, last }) {
      if (kind === 'mult') { let c = 0; for (let x = lo + 1; x <= hi; x++) if (x % k === 0) c++; return [c]; }
      let c = 0; for (let t = a; d > 0 ? t <= last : t >= last; t += d) c++; return [c];
    },
  }),
  tpl({
    id: 'old-polygon-angle', bands: ['g56', 'g78'], tier: 4, topic: 'geometry', strategy: 'angle-chasing',
    build(r, band) {
      const g = old(band), n = P(r, [5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36]), kind = P(r, g ? ['sum', 'diag', 'interior'] : ['interior', 'exterior']);
      const val = { interior: (180 * (n - 2)) / n, exterior: 360 / n, sum: 180 * (n - 2), diag: (n * (n - 3)) / 2 }[kind];
      const text = {
        interior: `Each inside angle of a regular polygon is ${val}°. How many sides does it have?`,
        exterior: `Walking round a regular polygon, you turn ${val}° at every corner. How many sides does it have?`,
        sum: `The inside angles of a polygon add up to ${val}°. How many sides does it have?`,
        diag: `A polygon has ${val} diagonals. How many sides does it have?`,
      }[kind];
      return {
        text, ans: n,
        wrong: wrongs(n, [n - 2, n + 2, n - 1, n + 1, Math.round(360 / Math.max(1, 180 - val)) + 1, 2 * n].filter((x) => x >= 3), { min: 3 }),
        why: {
          interior: `Each outside turn is 180 − ${val} = ${180 - val}°, and all the turns add to 360°. So there are 360 ÷ ${180 - val} = ${n} sides.`,
          exterior: `All the turns round a polygon add up to one full turn, 360°. So there are 360 ÷ ${val} = ${n} corners, and ${n} sides.`,
          sum: `A polygon with n sides splits into n − 2 triangles from one corner, so its angles add to 180 × (n − 2). ${val} ÷ 180 = ${n - 2}, so n = ${n}.`,
          diag: `Each of n corners joins to n − 3 others by a diagonal, and that counts each diagonal twice: n × (n − 3) ÷ 2. ${n} × ${n - 3} ÷ 2 = ${val}.`,
        }[kind],
        params: { kind, val },
      };
    },
    solve({ kind, val }) {
      const out = [];
      for (let n = 3; n <= 400; n++) {
        const angles = 180 * (n - 2);
        if (kind === 'interior' && angles === val * n) out.push(n);
        if (kind === 'exterior' && val * n === 360) out.push(n);
        if (kind === 'sum' && angles === val) out.push(n);
        if (kind === 'diag') { let c = 0; for (let a = 0; a < n; a++) for (let b = a + 2; b < n; b++) if (!(a === 0 && b === n - 1)) c++; if (c === val) out.push(n); }
      }
      return out;
    },
  }),
  tpl({
    id: 'old-rect-point', bands: ['g56', 'g78'], tier: 4, topic: 'geometry', strategy: 'area-cut-and-move',
    build(r, band) {
      const g = old(band), W = I(r, 6, 14), H = I(r, 4, 10), px = I(r, 1, W - 1), py = I(r, 1, H - 1);
      const u = Math.min(260 / W, 160 / H), X = (x) => (20 + x * u).toFixed(1), Y = (y) => (20 + (H - y) * u).toFixed(1);
      const tri = (pts, cls) => `<polygon points="${pts.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ')}" class="${cls}"/>`;
      const top = [[0, H], [W, H], [px, py]], bot = [[0, 0], [W, 0], [px, py]], left = [[0, 0], [0, H], [px, py]], right = [[W, 0], [W, H], [px, py]];
      const area = (t) => Math.abs((t[1][0] - t[0][0]) * (t[2][1] - t[0][1]) - (t[2][0] - t[0][0]) * (t[1][1] - t[0][1])) / 2;
      let s = tri(top, 'dg-fill1') + tri(bot, 'dg-fill1') + tri(left, 'dg-blank') + tri(right, 'dg-blank');
      if (g) {
        const [aT, aB, aL] = [area(top), area(bot), area(left)], ans = area(right);
        s += T(X(px), Y((H + py) / 2 + (H - py) / 6), aT, 'dg-small') + T(X(px), Y(py / 3), aB, 'dg-small') + T(X(px / 3), Y(py), aL, 'dg-small') + T(X((W + 2 * px) / 3 + (W - px) / 3), Y(py), '?', 'dg-accent');
        return {
          text: `A point inside a rectangle is joined to its four corners, making four triangles. Three of their areas are shown, in square cm. What is the area of the fourth triangle, marked ?, in square cm?`, ans,
          wrong: wrongs(ans, [aT + aB + aL, aT + aB, Math.abs(aT - aL), aL, (aT + aB) / 2, aT * aB / Math.max(1, aL)].map((x) => Math.round(x * 2) / 2), { step: 0.5 }),
          why: `The top and bottom triangles share the rectangle's width, and their heights add to its height, so together they are half the rectangle. The left and right ones are the other half, so ? = ${aT} + ${aB} − ${aL} = ${ans}.`,
          fig: svg(Math.ceil(40 + W * u), Math.ceil(40 + H * u), s, 'A rectangle cut into four triangles'), params: { areas: [aT, aB, aL], kind: 'fourth' },
        };
      }
      const ans = (W * H) / 2;
      s += T(X(W / 2), Y(0) * 1 + 18, `${W} cm`) + T(14, Y(H / 2), `${H} cm`, 'dg-text', 'end');
      return {
        text: `A point inside a ${W} cm by ${H} cm rectangle is joined to its four corners. What is the total area of the two shaded triangles, in square cm?`, ans,
        wrong: wrongs(ans, [W * H, W * H / 4, W + H, area(top), (W * H) / 3, 2 * (W + H)], { step: 0.5 }),
        why: `The two shaded triangles share the rectangle's width as their bases, and their heights add up to its height. So together they are half of ${W} × ${H}: ${ans} square cm, wherever the point is.`,
        fig: svg(Math.ceil(40 + W * u), Math.ceil(46 + H * u), s, 'A rectangle cut into four triangles'), params: { W, H, px, py, kind: 'half' },
      };
    },
    solve({ kind, W, H, px, py, areas }) {
      if (kind === 'half') return [pickArea([[0, H], [W, H], [px, py]]) + pickArea([[0, 0], [W, 0], [px, py]])];
      // every rectangle and point (to a fine half-unit grid) with these three areas: what is the fourth?
      const out = new Set(), [aT, aB, aL] = areas;
      for (let w = 1; w <= 30; w++) for (let h = 1; h <= 30; h++) {
        if (w * h / 2 !== aT + aB) continue;
        for (let x2 = 1; x2 < 2 * w; x2++) { const x = x2 / 2; if (h * x / 2 === aL) out.add(h * (w - x) / 2); }
      }
      return [...out];
    },
  }),
  tpl({
    id: 'old-polyomino-perimeter', bands: ['g56', 'g78'], tier: 4, topic: 'geometry', strategy: 'staircase-perimeter',
    build(r, band) {
      const g = old(band), n = g ? I(r, 9, 14) : I(r, 6, 9), side = g ? I(r, 2, 5) : I(r, 1, 3), C = 7, R = 5;
      const cells = new Set([`${I(r, 1, R - 2)},${I(r, 1, C - 2)}`]);
      while (cells.size < n) {
        const [cr, cc] = P(r, [...cells]).split(',').map(Number), [dr, dc] = P(r, [[0, 1], [0, -1], [1, 0], [-1, 0]]);
        const nr = cr + dr, nc = cc + dc; if (nr >= 0 && nr < R && nc >= 0 && nc < C) cells.add(`${nr},${nc}`);
      }
      // no holes: everything empty must reach the border
      const seen = new Set(), q = [];
      for (let rr = -1; rr <= R; rr++) for (let cc = -1; cc <= C; cc++) if (rr === -1 || cc === -1 || rr === R || cc === C) { seen.add(`${rr},${cc}`); q.push([rr, cc]); }
      while (q.length) { const [a, b] = q.pop(); for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const k = `${a + dr},${b + dc}`; if (a + dr < -1 || a + dr > R || b + dc < -1 || b + dc > C || seen.has(k) || cells.has(k)) continue; seen.add(k); q.push([a + dr, b + dc]); } }
      if (seen.size + cells.size !== (R + 2) * (C + 2)) return null;
      let adj = 0; for (const k of cells) { const [a, b] = k.split(',').map(Number); if (cells.has(`${a},${b + 1}`)) adj++; if (cells.has(`${a + 1},${b}`)) adj++; }
      const ans = side * (4 * n - 2 * adj);
      return {
        text: `The shaded shape is made of ${n} squares, each with sides of ${side} cm. What is the perimeter of the shaded shape, in cm?`, ans,
        wrong: wrongs(ans, [4 * n * side, n * side, ans - 2 * side, ans + 2 * side, 4 * n - 2 * adj, side * n * 2], { step: side }),
        why: `${n} separate squares would have ${4 * n} sides on the outside. Each of the ${adj} places where two squares touch hides 2 of them, leaving ${4 * n - 2 * adj} sides of ${side} cm: ${ans} cm.`,
        fig: grid(C, R, cells, 30), params: { cells: [...cells], side },
      };
    },
    solve({ cells, side }) {
      const S = new Set(cells); let edges = 0;
      for (let a = -1; a <= 6; a++) for (let b = -1; b <= 8; b++) {
        const here = S.has(`${a},${b}`);
        if (here !== S.has(`${a},${b + 1}`)) edges++;
        if (here !== S.has(`${a + 1},${b}`)) edges++;
      }
      return [edges * side];
    },
  }),
  tpl({
    id: 'old-net-opposite', bands: ['g56', 'g78'], tier: 4, topic: 'geometry', strategy: 'dice-faces',
    figEcho: true, // the net must show every letter, the answer's included; which one is opposite is the question
    build(r) {
      let cells = P(r, NETS).map((c) => c.slice());
      for (let k = I(r, 0, 3); k > 0; k--) cells = cells.map(([a, b]) => [b, -a]);
      if (r() < 0.5) cells = cells.map(([a, b]) => [a, -b]);
      const r0 = Math.min(...cells.map((c) => c[0])), c0 = Math.min(...cells.map((c) => c[1]));
      cells = cells.map(([a, b]) => [a - r0, b - c0]);
      const letters = shuffle(['P', 'Q', 'R', 'S', 'T', 'U'], r), f = fold(cells), ask = I(r, 0, 5);
      const ans = letters[f.findIndex((x) => x === (f[ask] ^ 1))];
      return {
        text: `This net is folded to make a cube. Which letter ends up on the face opposite ${letters[ask]}?`, ans,
        wrong: others(ans, letters).filter((x) => x !== letters[ask]),
        why: `Two squares in a straight row with one square between them always end up opposite; so do squares in a zigzag. Fold it in your head one square at a time and ${ans} lands on the far side from ${letters[ask]}.`,
        fig: netFig(cells, letters), params: { cells, letters, ask },
      };
    },
    solve({ cells, letters, ask }) {
      // roll a cube over the net: whichever face lands on a square is that square's face
      const key = (a, b) => a + ',' + b, idx = new Map(cells.map((c, i) => [key(...c), i]));
      const roll = (o, d) => d === 'E' ? { ...o, D: o.E, E: o.U, U: o.W, W: o.D } : d === 'W' ? { ...o, D: o.W, W: o.U, U: o.E, E: o.D }
        : d === 'S' ? { ...o, D: o.S, S: o.U, U: o.N, N: o.D } : { ...o, D: o.N, N: o.U, U: o.S, S: o.D };
      const at = new Map([[0, { D: 'd', U: 'u', N: 'n', S: 's', E: 'e', W: 'w' }]]), q = [0];
      while (q.length) {
        const i = q.shift(), [a, b] = cells[i];
        for (const [da, db, d] of [[0, 1, 'E'], [0, -1, 'W'], [1, 0, 'S'], [-1, 0, 'N']]) {
          const j = idx.get(key(a + da, b + db)); if (j !== undefined && !at.has(j)) { at.set(j, roll(at.get(i), d)); q.push(j); }
        }
      }
      const OPP = { d: 'u', u: 'd', n: 's', s: 'n', e: 'w', w: 'e' }, face = cells.map((_, i) => at.get(i).D);
      return cells.map((_, i) => i).filter((i) => face[i] === OPP[face[ask]]).map((i) => letters[i]);
    },
  }),
  tpl({
    id: 'old-coins', bands: ['g56', 'g78'], tier: 4, topic: 'counting', strategy: 'make-a-table',
    build(r, band) {
      const g = old(band), n = g ? I(r, 4, 6) : I(r, 3, 4), kind = P(r, g ? ['exact', 'atLeast', 'more', 'noTwo'] : ['exact', 'atLeast']), k = I(r, 1, n - 1);
      const C = (a, b) => { let x = 1; for (let i = 0; i < b; i++) x = (x * (a - i)) / (i + 1); return x; };
      let c;
      if (kind === 'exact') c = C(n, k);
      else if (kind === 'atLeast') { c = 0; for (let j = k; j <= n; j++) c += C(n, j); }
      else if (kind === 'more') { c = 0; for (let j = Math.floor(n / 2) + 1; j <= n; j++) c += C(n, j); }
      else { let a = 1, b = 2; for (let i = 2; i <= n; i++) [a, b] = [b, a + b]; c = b; }
      const N = 2 ** n, ans = frac(c, N);
      const ask = { exact: `exactly ${k} head${k > 1 ? 's' : ''}`, atLeast: `at least ${k} head${k > 1 ? 's' : ''}`, more: 'more heads than tails', noTwo: 'no two heads next to each other in the row' }[kind];
      return {
        text: `${Word(n)} fair coins are tossed in a row. What is the probability of getting ${ask}? Give your answer as a fraction.`, ans,
        wrong: fwrongs(ans, [[k, n], [c, 2 * n], [c + 1, N], [c - 1, N], [N - c, N], [1, 2]]),
        why: `There are 2 × 2 × … = ${N} equally likely rows of heads and tails. Listing them systematically, ${c} have ${ask}, so the probability is ${c}/${N} = ${ans}.`,
        params: { n, kind, k },
      };
    },
    solve({ n, kind, k }) {
      let c = 0;
      for (let m = 0; m < 2 ** n; m++) {
        const bits = [...Array(n)].map((_, i) => (m >> i) & 1), h = bits.reduce((a, b) => a + b, 0);
        if (kind === 'exact' ? h === k : kind === 'atLeast' ? h >= k : kind === 'more' ? h > n - h : !bits.some((b, i) => b && bits[i + 1])) c++;
      }
      return [frac(c, 2 ** n)];
    },
  }),
  tpl({
    id: 'old-taps', bands: ['g56', 'g78'], tier: 4, topic: 'measure', strategy: 'make-a-table',
    build(r, band) {
      const g = old(band), drain = g && r() < 0.5, a = I(r, 2, 30), b = I(r, a + 1, 3 * a + 10);
      const t = drain ? (a * b) / (b - a) : (a * b) / (a + b);
      if (!Number.isInteger(t) || t > 200) return null;
      return {
        text: drain
          ? `A tap fills a tank in ${a} minutes. A leak on its own would empty the full tank in ${b} minutes. The tank starts empty with the tap on and the leak open. How many minutes until it is full?`
          : `One tap fills a tank in ${a} minutes; a second tap fills it in ${b} minutes. Both taps are turned on together into the empty tank. How many minutes until it is full?`,
        ans: t,
        wrong: wrongs(t, drain ? [b - a, (a * b) / (a + b), a + b, b, Math.round((a + b) / 2)] : [a + b, Math.round((a + b) / 2), b - a, (a * b) / (b - a), a / 2]),
        why: drain
          ? `Think of a tank of ${lcm(a, b)} litres: the tap adds ${lcm(a, b) / a} a minute and the leak takes ${lcm(a, b) / b}, so it gains ${lcm(a, b) / a - lcm(a, b) / b} a minute. ${lcm(a, b)} ÷ ${lcm(a, b) / a - lcm(a, b) / b} = ${t} minutes.`
          : `Think of a tank of ${lcm(a, b)} litres: the taps add ${lcm(a, b) / a} and ${lcm(a, b) / b} a minute, ${lcm(a, b) / a + lcm(a, b) / b} together. ${lcm(a, b)} ÷ ${lcm(a, b) / a + lcm(a, b) / b} = ${t} minutes.`,
        params: { a, b, drain },
      };
    },
    solve({ a, b, drain }) {
      // a tank of a×b units: the first tap adds b units a minute, the second adds (or the leak removes) a units
      const V = a * b; let v = 0;
      for (let m = 1; m <= 1000; m++) { v += b + (drain ? -a : a); if (v === V) return [m]; if (v > V) return []; }
      return [];
    },
  }),
  tpl({
    id: 'old-lapping', bands: ['g56', 'g78'], tier: 4, topic: 'measure', strategy: 'meeting-and-overtaking',
    build(r, band) {
      const g = old(band), a = I(r, 40, 90), b = I(r, a + 4, 2 * a), t = (a * b) / (b - a);
      if (!Number.isInteger(t)) return null;
      const askLaps = g && r() < 0.5 && Number.isInteger(t / a);
      const ans = askLaps ? t / a : t;
      return {
        text: askLaps
          ? `Kiran runs a lap of the track in ${a} seconds and Lola in ${b} seconds. They start together and run the same way. How many laps has Kiran run when he first catches Lola from behind?`
          : `Kiran runs a lap of the track in ${a} seconds and Lola in ${b} seconds. They start together and run the same way. After how many seconds does Kiran first catch Lola up from behind, one lap ahead?`,
        ans,
        wrong: wrongs(ans, askLaps ? [t / b, ans + 1, ans - 1, Math.round(b / a), b - a] : [b - a, a + b, lcm(a, b) === t ? a * b : lcm(a, b), a * b / (a + b), 2 * t]),
        why: `Think of one lap as ${a * b} small steps: Kiran runs ${b} a second and Lola ${a}, so Kiran gains ${b - a} a second. Gaining a whole lap takes ${a * b} ÷ ${b - a} = ${t} seconds${askLaps ? `, in which Kiran runs ${t} ÷ ${a} = ${ans} laps` : ''}.`,
        params: { a, b, askLaps },
      };
    },
    solve({ a, b, askLaps }) {
      // a track of a×b units: Kiran runs b units a second, Lola a units
      const L = a * b;
      for (let s = 1; s <= 100000; s++) if (s * b - s * a === L) return [askLaps ? (s * b) / L : s];
      return [];
    },
  }),
  tpl({
    id: 'old-father-kids', bands: ['g56', 'g78'], tier: 4, topic: 'number', strategy: 'age-problems',
    build(r, band) {
      const c = old(band) ? 3 : 2, kids = Array.from({ length: c }, () => I(r, 2, 12)), K = kids.reduce((a, b) => a + b, 0), y = I(r, 4, 25);
      const F = K + (c - 1) * y; if (F < 26 || F > 60) return null;
      const S = F + K;
      return {
        text: `A father and his ${word(c)} children have ages that add up to ${S}. In ${y} years' time the father's age will equal his children's ages added together. How old is the father now?`, ans: F,
        wrong: wrongs(F, [Math.round(S / 2), Math.round((S + y) / 2), F - y, F + y, K, S - y]),
        why: `Each year the father gets 1 year older but his children together get ${c} years older, so the gap between his age and their total shrinks by ${c - 1} a year. It closes in ${y} years, so he is ${(c - 1) * y} more than their total now. Two numbers that add to ${S} and differ by ${(c - 1) * y} are ${F} and ${K}.`,
        params: { S, y, c },
      };
    },
    solve({ S, y, c }) { const out = []; for (let F = 1; F <= S; F++) { const K = S - F; if (F + y === K + c * y) out.push(F); } return out; },
  }),
  tpl({
    id: 'old-digit-product', bands: ['g56', 'g78'], tier: 4, topic: 'counting', strategy: 'digit-puzzles',
    build(r, band) {
      const len = old(band) ? 4 : 3, ds = Array.from({ length: len }, () => I(r, 2, 9)), Pr = ds.reduce((a, b) => a * b, 1);
      // count the digit multisets with this product, and the orders of each
      let ans = 0, sets = 0;
      const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
      const go = (from, left, chosen) => {
        if (chosen.length === len) { if (left === 1) { sets++; const cnt = {}; chosen.forEach((d) => (cnt[d] = (cnt[d] || 0) + 1)); ans += fact(len) / Object.values(cnt).reduce((a, k) => a * fact(k), 1); } return; }
        for (let d = from; d <= 9; d++) if (left % d === 0) go(d, left / d, [...chosen, d]);
      };
      go(1, Pr, []);
      return {
        text: `How many ${len === 3 ? 'three' : 'four'}-digit numbers have digits that multiply to make ${Pr}?`, ans,
        wrong: wrongs(ans, [sets, ans + 1, ans - 1, ans + len, 2 * ans, ans - len]),
        why: `First list the sets of ${len} digits whose product is ${Pr} (there are ${sets}, using 1s where needed). Then count the orders of each set, remembering that repeated digits give fewer orders: ${ans} in all.`,
        params: { len, Pr },
      };
    },
    solve({ len, Pr }) {
      let c = 0;
      for (let n = 10 ** (len - 1); n < 10 ** len; n++) if ([...String(n)].reduce((a, d) => a * +d, 1) === Pr) c++;
      return [c];
    },
  }),
  tpl({
    id: 'old-pigeon-months', bands: ['g56', 'g78'], tier: 4, topic: 'logic', strategy: 'pigeonhole',
    build(r, band) {
      const g = old(band), kind = P(r, g ? ['share', 'need'] : ['share', 'share', 'need']);
      const box = g ? P(r, [['month', 12], ['day of the week', 7]]) : ['month', 12];
      if (kind === 'share') {
        const N = I(r, g ? 60 : 30, g ? 400 : 150), ans = Math.ceil(N / box[1]);
        return {
          text: `A school has ${N} pupils. What is the largest number that can be sure to say: "At least this many of us were born in the same ${box[0]}"?`, ans,
          wrong: wrongs(ans, [Math.floor(N / box[1]), ans + 1, Math.round(N / 2), box[1], ans - 2]),
          why: `Spread the pupils as evenly as possible over the ${box[1]} ${box[0]}s: ${box[1]} × ${ans - 1} = ${box[1] * (ans - 1)} is fewer than ${N}, so some ${box[0]} must get ${ans}. An even spread shows no more is certain.`,
          params: { kind, N, B: box[1] },
        };
      }
      const k = I(r, 3, g ? 9 : 6), ans = box[1] * (k - 1) + 1;
      return {
        text: `How many people must be in a room to be certain that at least ${k} of them were born in the same ${box[0]}?`, ans,
        wrong: wrongs(ans, [box[1] * k, box[1] * (k - 1), box[1] * k + 1, k * 2, ans + box[1]]),
        why: `The unluckiest room has ${k - 1} people for each of the ${box[1]} ${box[0]}s — ${box[1] * (k - 1)} people with no ${k} sharing. One more person makes ${k} somewhere, so ${ans}.`,
        params: { kind, k, B: box[1] },
      };
    },
    solve({ kind, N, k, B }) {
      // place people one at a time into the emptiest box: the most even spread
      const fill = (m) => { const boxes = Array(B).fill(0); for (let i = 0; i < m; i++) { const j = boxes.indexOf(Math.min(...boxes)); boxes[j]++; } return Math.max(...boxes); };
      if (kind === 'share') return [fill(N)];
      for (let m = 1; m < 1000; m++) if (fill(m) >= k) return [m];
      return [];
    },
  }),
  tpl({
    id: 'old-erase-write', bands: ['g56', 'g78'], tier: 4, topic: 'logic', strategy: 'invariants',
    build(r, band) {
      const g = old(band), n = g ? I(r, 15, 40) : I(r, 8, 20), k = I(r, 1, g ? 3 : 2), sum = (n * (n + 1)) / 2, ans = sum - k * (n - 1);
      return {
        text: `The numbers 1, 2, 3, …, ${n} are written on a board. Again and again, two of the numbers are rubbed out and replaced by their sum minus ${k}. In the end only one number is left. What is it?`, ans,
        wrong: wrongs(ans, [sum, sum - k * n, sum - k, ans + k, ans - k, sum - k * (n - 2)]),
        why: `Each move cuts the board's total by ${k} and removes one number. Going from ${n} numbers to 1 takes ${n - 1} moves, so the last number is ${sum} − ${k} × ${n - 1} = ${ans} — whatever order you choose.`,
        params: { n, k },
      };
    },
    solve({ n, k }) {
      const out = new Set();
      const play = (pickPair) => { let b = [...Array(n)].map((_, i) => i + 1); while (b.length > 1) { const [i, j] = pickPair(b); const v = b[i] + b[j] - k; b = b.filter((_, x) => x !== i && x !== j); b.push(v); } return b[0]; };
      out.add(play(() => [0, 1]));
      out.add(play((b) => [0, b.length - 1]));
      out.add(play((b) => [b.length - 2, b.length - 1]));
      return [...out];
    },
  }),
  tpl({
    id: 'old-sign-parity', bands: ['g56', 'g78'], tier: 4, topic: 'logic', strategy: 'parity',
    build(r, band) {
      const n = old(band) ? I(r, 8, 12) : I(r, 6, 9), max = (n * (n + 1)) / 2;
      let ans = 1; for (let i = 2; i <= n; i++) ans += r() < 0.65 ? i : -i;
      const reach = (v) => { let c = 0; for (let m = 0; m < 1 << (n - 1); m++) { let s = 1; for (let i = 2; i <= n; i++) s += m & (1 << (i - 2)) ? i : -i; if (s === v) c++; } return c > 0; };
      if (ans <= 0 || !reach(ans)) return null;
      const bad = []; for (let v = ans - 9; v <= ans + 9; v++) if (v > 0 && (v - max) % 2 !== 0) bad.push(v);
      const opts = shuffle(bad, r).slice(0, 4).concat(max + 2).sort((a, b) => a - b);
      return {
        text: `Put a + or a − sign in every box: 1 □ 2 □ 3 □ … □ ${n}. Which of these totals is possible?`, ans,
        wrong: opts,
        why: `With every sign + the total is ${max}, which is ${max % 2 ? 'odd' : 'even'}. Changing a + to a − takes away twice that number, so the total always stays ${max % 2 ? 'odd' : 'even'}, and it can never be more than ${max}.`,
        params: { n, opts: [ans, ...opts] },
      };
    },
    solve({ n, opts }) {
      const can = new Set();
      for (let m = 0; m < 1 << (n - 1); m++) { let s = 1; for (let i = 2; i <= n; i++) s += m & (1 << (i - 2)) ? i : -i; can.add(s); }
      return opts.filter((v) => can.has(v));
    },
  }),
];

// ================================================================= TIER 5
const TIER5 = [
  tpl({
    id: 'old-last-two-digits', bands: ['g56', 'g78'], tier: 5, topic: 'number', strategy: 'units-digit-cycles',
    build(r, band) {
      const g = old(band), b = P(r, g ? [3, 7, 11, 13, 17, 19, 21, 23, 29] : [3, 7, 11, 9, 21]), n = g ? I(r, 100, 3000) : I(r, 20, 200);
      const seq = []; let v = b % 100; while (!seq.includes(v)) { seq.push(v); v = (v * b) % 100; }
      const start = seq.indexOf(v), len = seq.length - start;
      const ans = n <= seq.length ? seq[n - 1] : seq[start + ((n - 1 - start) % len)];
      return {
        text: `What number do the last two digits of ${pow(b, n)} make? (For example, the last two digits of 1307 make 7.)`, ans,
        wrong: wrongs(ans, [ans % 10, (ans + 10) % 100, 100 - ans, seq[(n) % seq.length], seq[(n + 1) % seq.length], (b * n) % 100], { max: 99 }),
        why: `Only the last two digits matter at each step. The powers of ${b} end in ${seq.slice(0, Math.min(seq.length, 6)).map((x) => String(x).padStart(2, '0')).join(', ')}${seq.length > 6 ? ', …' : ''}, repeating every ${len}; ${n} lands on ${String(ans).padStart(2, '0')}.`,
        params: { b, n },
      };
    },
    solve({ b, n }) { let d = 1; for (let i = 0; i < n; i++) d = (d * b) % 100; return [d]; },
  }),
  tpl({
    id: 'old-n-divisors', bands: ['g56', 'g78'], tier: 5, topic: 'number', strategy: 'list-systematically',
    build(r, band) {
      const g = old(band), kind = g ? P(r, ['three', 'four']) : 'three';
      const N = kind === 'three' ? I(r, g ? 300 : 50, g ? 3000 : 500) : I(r, 40, 120);
      const primes = []; for (let p = 2; p <= N; p++) if (primes.every((q) => p % q)) primes.push(p);
      let ans;
      if (kind === 'three') ans = primes.filter((p) => p * p <= N).length;
      else { ans = primes.filter((p) => p ** 3 <= N).length; for (let i = 0; i < primes.length; i++) for (let j = i + 1; j < primes.length; j++) if (primes[i] * primes[j] <= N) ans++; }
      return {
        text: `How many whole numbers from 1 to ${N} have exactly ${kind} divisors?`, ans,
        wrong: wrongs(ans, [Math.floor(Math.sqrt(N)), ans + 1, ans - 1, primes.length, Math.floor(Math.sqrt(N)) - 1, 2 * ans]),
        why: kind === 'three'
          ? `Divisors come in pairs, so an odd count means a square number; exactly 3 means the square of a prime (1, p, p²). The primes whose squares are at most ${N} number ${ans}.`
          : `Exactly 4 divisors means p × q for two different primes (1, p, q, pq) or a prime cubed (1, p, p², p³). Listing those up to ${N} gives ${ans}.`,
        params: { N, k: kind === 'three' ? 3 : 4 },
      };
    },
    solve({ N, k }) {
      let c = 0;
      for (let x = 1; x <= N; x++) { let d = 0; for (let i = 1; i * i <= x; i++) if (x % i === 0) d += i * i === x ? 1 : 2; if (d === k) c++; }
      return [c];
    },
  }),
  tpl({
    id: 'old-paths-via', bands: ['g56', 'g78'], tier: 5, topic: 'counting', strategy: 'grid-paths',
    build(r, band) {
      const g = old(band), m = g ? I(r, 5, 7) : I(r, 4, 5), n = g ? I(r, 4, 5) : I(r, 3, 4);
      const S = [I(r, 1, m - 1), I(r, 1, n - 1)], X = g ? [I(r, 1, m - 1), I(r, 1, n - 1)] : null;
      if (X && X[0] === S[0] && X[1] === S[1]) return null;
      const ways = (a, b) => {
        if (b[0] < a[0] || b[1] < a[1]) return 0;
        const W = {}; for (let x = a[0]; x <= b[0]; x++) for (let y = a[1]; y <= b[1]; y++) {
          W[`${x},${y}`] = X && x === X[0] && y === X[1] ? 0 : x === a[0] && y === a[1] ? 1 : (W[`${x - 1},${y}`] || 0) + (W[`${x},${y - 1}`] || 0);
        }
        return W[`${b[0]},${b[1]}`];
      };
      const ans = ways([0, 0], S) * ways(S, [m, n]); if (ans < 2) return null;
      const marks = [{ x: 0, y: 0, label: 'A' }, { x: m, y: n, label: 'B' }, { x: S[0], y: S[1], label: 'S' }];
      if (X) marks.push({ x: X[0], y: X[1], label: 'X', cls: 'dg-dot2' });
      return {
        text: `Moving only right or up along the streets, how many routes from A to B pass the shop at S${X ? ' but avoid the roadworks at X' : ''}?`, ans,
        wrong: wrongs(ans, [ways([0, 0], S) + ways(S, [m, n]), ans + 1, ans - 1, 2 * ans, ways([0, 0], S), ways(S, [m, n])]),
        why: `Split the journey at the shop: count the routes from A to S and from S to B${X ? ', with 0 routes through X' : ''}, adding the counts from the left and below at each corner. Any first half goes with any second half, so multiply: ${ways([0, 0], S)} × ${ways(S, [m, n])} = ${ans}.`,
        fig: streetsFig(m, n, marks), params: { m, n, S, X },
      };
    },
    solve({ m, n, S, X }) { return [routes(m, n, (p) => has(p, S) && !(X && has(p, X)))]; },
  }),
  tpl({
    id: 'old-rect-contain', bands: ['g56', 'g78'], tier: 5, topic: 'counting', strategy: 'count-rectangles',
    build(r, band) {
      const g = old(band), R = g ? I(r, 4, 6) : I(r, 3, 4), C = g ? I(r, 5, 7) : I(r, 4, 5), i = I(r, 0, R - 1), j = I(r, 0, C - 1);
      const kind = g ? P(r, ['contain', 'avoid']) : 'contain';
      const cont = (i + 1) * (R - i) * (j + 1) * (C - j), total = C2(R + 1) * C2(C + 1), ans = kind === 'contain' ? cont : total - cont;
      return {
        text: `How many rectangles drawn along the lines of this grid ${kind === 'contain' ? 'contain' : 'do not contain'} the shaded square? (Squares count as rectangles, and the shaded square itself ${kind === 'contain' ? 'counts' : 'is not counted'}.)`, ans,
        wrong: wrongs(ans, [total, kind === 'contain' ? total - cont : cont, (i + 1) * (j + 1), R * C, ans + 1, (R - i) * (C - j) * 2]),
        why: kind === 'contain'
          ? `A rectangle holds the shaded square when its left edge is on one of the ${j + 1} lines to its left and its right edge on one of the ${C - j} to its right, and the same for top (${i + 1}) and bottom (${R - i}). That is ${j + 1} × ${C - j} × ${i + 1} × ${R - i} = ${ans}.`
          : `There are ${total} rectangles in all. The ones containing the square choose an edge on each side of it: ${j + 1} × ${C - j} × ${i + 1} × ${R - i} = ${cont}, so ${total} − ${cont} = ${ans} do not.`,
        fig: grid(C, R, new Set([`${i},${j}`]), 32), params: { R, C, i, j, kind },
      };
    },
    solve({ R, C, i, j, kind }) {
      let c = 0;
      for (let x1 = 0; x1 <= C; x1++) for (let x2 = x1 + 1; x2 <= C; x2++) for (let y1 = 0; y1 <= R; y1++) for (let y2 = y1 + 1; y2 <= R; y2++) {
        const inside = x1 <= j && j < x2 && y1 <= i && i < y2; if (inside === (kind === 'contain')) c++;
      }
      return [c];
    },
  }),
  tpl({
    id: 'old-tilted-squares', bands: ['g56', 'g78'], tier: 5, topic: 'geometry', strategy: 'count-rectangles',
    build(r, band) {
      const n = old(band) ? I(r, 4, 6) : I(r, 3, 5), kind = P(r, ['all', 'tilted']);
      let all = 0, straight = 0; for (let k = 1; k < n; k++) { all += k * (n - k) ** 2; straight += (n - k) ** 2; }
      const ans = kind === 'all' ? all : all - straight;
      return {
        text: `The dots form a ${n} by ${n} square array. How many squares have all four corners on the dots? Count ${kind === 'all' ? 'every size, both upright and tilted' : 'only the TILTED ones, of every size'}.`, ans,
        wrong: wrongs(ans, [straight, all, all - straight, (n - 1) ** 2, ans + n, C2(n * n) / n]),
        why: `Upright squares number ${straight}. A tilted square sits snugly inside an upright one of side k, and an upright square of side k holds k − 1 tilted ones as well as itself — so count k squares per upright box of side k: ${kind === 'all' ? `${all} in total` : `${all} in total, ${ans} of them tilted`}.`,
        fig: dots(n, n, null, 30), params: { n, kind },
      };
    },
    solve({ n, kind }) {
      let c = 0; const ok = (x, y) => x >= 0 && y >= 0 && x < n && y < n;
      for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let dx = 0; dx < n; dx++) for (let dy = 0; dy < n; dy++) {
        if (dx === 0 && dy === 0) continue; if (dx <= 0 || dy < 0) continue; // one side direction per square: dx > 0, dy ≥ 0
        if (kind === 'tilted' && dy === 0) continue;
        if (ok(x + dx, y + dy) && ok(x + dx - dy, y + dy + dx) && ok(x - dy, y + dx)) c++;
      }
      return [c];
    },
  }),
  tpl({
    id: 'old-couples-handshakes', bands: ['g56', 'g78'], tier: 5, topic: 'counting', strategy: 'handshakes',
    build(r, band) {
      const g = old(band), n = g ? I(r, 4, 12) : I(r, 3, 8), kind = g ? P(r, ['twins', 'teachers']) : 'twins';
      const ans = kind === 'twins' ? C2(2 * n) - n : C2(n) + n * (n - 1);
      return {
        text: kind === 'twins'
          ? `${Word(n)} pairs of twins come to a party. Everyone shakes hands once with everyone else — except their own twin. How many handshakes are there?`
          : `${n} teachers each bring one pupil to a meeting. Each teacher shakes hands once with every other person except their own pupil. The pupils do not shake hands with each other. How many handshakes are there?`,
        ans,
        wrong: wrongs(ans, [C2(2 * n), C2(2 * n) - 2 * n, n * (2 * n - 2), 2 * n * (2 * n - 1) - n, C2(n) + n * n, n * (n - 1)]),
        why: kind === 'twins'
          ? `${2 * n} people could make ${2 * n} × ${2 * n - 1} ÷ 2 = ${C2(2 * n)} handshakes. Take away the ${n} between twins: ${ans}.`
          : `Teachers with teachers: ${n} × ${n - 1} ÷ 2 = ${C2(n)}. Each teacher with the other ${n - 1} pupils: ${n} × ${n - 1} = ${n * (n - 1)}. Together ${ans}.`,
        params: { n, kind },
      };
    },
    solve({ n, kind }) {
      // person i: pair i>>1; in 'teachers' even i is a teacher, odd i a pupil
      let c = 0;
      for (let a = 0; a < 2 * n; a++) for (let b = a + 1; b < 2 * n; b++) {
        if (a >> 1 === b >> 1) continue;
        if (kind === 'teachers' && a % 2 === 1 && b % 2 === 1) continue;
        c++;
      }
      return [c];
    },
  }),
  tpl({
    id: 'old-three-sets', bands: ['g56', 'g78'], tier: 5, topic: 'counting', strategy: 'overlapping-groups',
    build(r, band) {
      const g = old(band), trio = P(r, g ? [[2, 3, 7], [3, 4, 10], [4, 6, 9], [2, 5, 7], [6, 10, 15], [3, 5, 8]] : [[2, 3, 5], [2, 3, 7], [3, 4, 5], [2, 5, 7]]);
      const N = g ? I(r, 300, 2000) : I(r, 60, 300), kind = P(r, ['any', 'none']), [a, b, c] = trio;
      const f = (d) => Math.floor(N / d);
      const any = f(a) + f(b) + f(c) - f(lcm(a, b)) - f(lcm(a, c)) - f(lcm(b, c)) + f(lcm(lcm(a, b), c));
      const ans = kind === 'any' ? any : N - any;
      return {
        text: `How many whole numbers from 1 to ${N} are divisible by ${kind === 'any' ? `at least one of ${a}, ${b} and ${c}` : `none of ${a}, ${b} and ${c}`}?`, ans,
        wrong: wrongs(ans, [f(a) + f(b) + f(c), N - f(a) - f(b) - f(c), f(a) + f(b) + f(c) - f(a * b) - f(a * c) - f(b * c), kind === 'any' ? N - any : any, ans + f(lcm(lcm(a, b), c)), ans - 1]),
        why: `Add the multiples of each (${f(a)} + ${f(b)} + ${f(c)}), subtract those counted twice (multiples of ${lcm(a, b)}, ${lcm(a, c)}, ${lcm(b, c)}), and add back the multiples of ${lcm(lcm(a, b), c)}, which were taken away once too often. That gives ${any} divisible by at least one${kind === 'none' ? `, so ${N} − ${any} = ${ans} by none` : ''}.`,
        params: { N, trio, kind },
      };
    },
    solve({ N, trio, kind }) { let c = 0; for (let x = 1; x <= N; x++) { const hit = trio.some((d) => x % d === 0); if (hit === (kind === 'any')) c++; } return [c]; },
  }),
  tpl({
    id: 'old-round-liars', bands: ['g56', 'g78'], tier: 5, topic: 'logic', strategy: 'truth-tellers',
    build(r, band) {
      const n = old(band) ? I(r, 8, 14) : I(r, 6, 10), kind = P(r, ['most', 'fewest']);
      const ans = kind === 'most' ? Math.floor(n / 2) : Math.ceil(n / 3);
      return {
        text: `${n} people sit round a table. Each is a knight, who always tells the truth, or a liar, who always lies. Every one of them says: "Both people next to me are liars." What is the ${kind === 'most' ? 'largest' : 'smallest'} number of knights there could be?`, ans,
        wrong: wrongs(ans, [Math.floor(n / 2), Math.ceil(n / 3), Math.floor(n / 3), Math.ceil(n / 2), n - Math.ceil(n / 3), 0], { max: n }),
        why: kind === 'most'
          ? `Two knights can never sit side by side, so at most every other seat is a knight: ${ans} of ${n}. Alternating knight, liar works, because each liar then has a knight beside them.`
          : `A liar must have at least one knight beside them, so there can never be three liars in a row. Each knight can "cover" at most three seats (itself and two neighbours), so at least ${n} ÷ 3 rounded up = ${ans} knights.`,
        params: { n, kind },
      };
    },
    solve({ n, kind }) {
      const counts = [];
      for (let m = 0; m < 1 << n; m++) {
        const K = (i) => (m >> ((i + n) % n)) & 1;
        let ok = true;
        for (let i = 0; i < n && ok; i++) { const bothLiars = !K(i - 1) && !K(i + 1); if (K(i) ? !bothLiars : bothLiars) ok = false; }
        if (ok) { let k = 0; for (let i = 0; i < n; i++) k += K(i); counts.push(k); }
      }
      return [kind === 'most' ? Math.max(...counts) : Math.min(...counts)];
    },
  }),
  tpl({
    id: 'old-diagonal-perimeter', bands: ['g78'], tier: 5, topic: 'geometry', strategy: 'area-cut-and-move',
    build(r) {
      const [p, q, c] = P(r, [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 40, 41], [12, 35, 37]]);
      const k = c <= 17 ? I(r, 1, 4) : 1, a = p * k, b = q * k, d = c * k, per = 2 * (a + b), ans = a * b;
      return {
        text: `A rectangle has a perimeter of ${per} cm and a diagonal of ${d} cm. What is its area, in square cm?`, ans,
        wrong: wrongs(ans, [(per / 4) ** 2, d * d, (a + b) ** 2, ans / 2, d * (per / 4), ans + d]),
        why: `The sides add to ${per / 2} and, by Pythagoras, their squares add to ${d}² = ${d * d}. Since (a + b)² = a² + b² + 2ab, the area ab = (${(per / 2) ** 2} − ${d * d}) ÷ 2 = ${ans}.`,
        params: { per, d },
      };
    },
    solve({ per, d }) {
      const out = new Set();
      for (let w = 1; w < per / 2; w++) { const h = per / 2 - w; if (w * w + h * h === d * d) out.add(w * h); }
      return [...out];
    },
  }),
  tpl({
    id: 'old-cut-corners', bands: ['g56', 'g78'], tier: 5, topic: 'geometry', strategy: 'area-cut-and-move',
    build(r, band) {
      const g = old(band), a = I(r, 1, g ? 9 : 6), b = I(r, a + 1, g ? 15 : 9), s = a + b;
      const askLeg = g && r() < 0.5, inner = a * a + b * b;
      const u = 200 / s, X = (x) => (20 + x * u).toFixed(1), Y = (y) => (20 + (s - y) * u).toFixed(1);
      const sq = [[a, 0], [s, a], [b, s], [0, b]];
      let f = `<rect x="20" y="20" width="200" height="200" class="dg-blank"/><polygon points="${sq.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ')}" class="dg-fill1"/>`;
      f += T(X(a / 2), '238', askLeg ? '?' : `${a}`, 'dg-small') + T(X(a + b / 2), '238', `${b}`, 'dg-small');
      if (askLeg) {
        return {
          text: `A square of side ${s} cm has a right-angled triangle cut from each corner, all four the same, leaving a tilted shaded square of area ${inner} square cm. The longer leg of each triangle is ${b} cm. How long is the shorter leg, in cm?`, ans: a,
          wrong: wrongs(a, [s - b + 1, Math.round(Math.sqrt(inner)) - b, s / 2, b - a, Math.round(Math.sqrt(inner))].filter((x) => x > 0)),
          why: `The four triangles together have area ${s}² − ${inner} = ${s * s - inner}, so each is ${(s * s - inner) / 4}. Half of shorter × longer is ${(s * s - inner) / 4}, so shorter × ${b} = ${(s * s - inner) / 2} and the shorter leg is ${a} cm.`,
          fig: svg(240, 248, f, 'A square with its corners cut off'), params: { s, b, inner, ask: 'leg' },
        };
      }
      return {
        text: `A square of side ${s} cm has a right-angled triangle with legs ${a} cm and ${b} cm cut from each corner, as shown, leaving a tilted shaded square. What is the area of the shaded square, in square cm?`, ans: inner,
        wrong: wrongs(inner, [s * s - 2 * a * b + a * b, s * s - a * b, (b - a) ** 2, s * s / 2, s * s - 4 * a * b, 2 * a * b]),
        why: `The big square is ${s} × ${s} = ${s * s}. Each corner triangle is ${a} × ${b} ÷ 2 = ${(a * b) / 2}, four of them ${2 * a * b}, so the shaded square is ${s * s} − ${2 * a * b} = ${inner}.`,
        fig: svg(240, 248, f, 'A square with its corners cut off'), params: { a, b, ask: 'area' },
      };
    },
    solve({ ask, a, b, s, inner }) {
      if (ask === 'area') { const S = a + b; return [pickArea([[a, 0], [S, a], [b, S], [0, b]])]; }
      // every way to split the side into a shorter and a longer leg; keep the splits whose tilted square has this area and this longer leg
      const out = []; for (let x = 1; 2 * x < s; x++) { const y = s - x; if (y === b && pickArea([[x, 0], [s, x], [y, s], [0, y]]) === inner) out.push(x); }
      return out;
    },
  }),
  tpl({
    id: 'old-clock-angle', bands: ['g56', 'g78'], tier: 5, topic: 'measure', strategy: 'angle-chasing',
    build(r, band) {
      const h = I(r, 1, 12), m = old(band) ? I(r, 1, 59) : 5 * I(r, 1, 11);
      let ans = Math.abs(30 * (h % 12) - 5.5 * m); if (ans > 180) ans = 360 - ans;
      if (ans === 0 || ans === 180) return null;
      let raw = Math.abs(30 * (h % 12) - 6 * m); if (raw > 180) raw = 360 - raw;
      return {
        text: `What is the smaller angle between the hour hand and the minute hand of a clock at ${h}:${String(m).padStart(2, '0')}, in degrees?`, ans,
        wrong: wrongs(ans, [raw, 360 - ans, ans + m / 2, Math.abs(ans - m / 2), ans + 30, Math.abs(ans - 30)], { step: 0.5, max: 359.5 }),
        why: `The minute hand is at ${6 * m}° (6° a minute). The hour hand is at ${30 * (h % 12)}° plus half a degree for each of the ${m} minutes, ${30 * (h % 12) + m / 2}°. The difference, taken the short way round, is ${ans}°.`,
        params: { h, m },
      };
    },
    solve({ h, m }) {
      let mh = 0, hh = 0; for (let t = 0; t < (h % 12) * 60 + m; t++) { mh = (mh + 6) % 360; hh += 0.5; }
      let d = Math.abs(mh - hh) % 360; if (d > 180) d = 360 - d; return [d];
    },
  }),
  tpl({
    id: 'old-track-meet', bands: ['g56', 'g78'], tier: 5, topic: 'measure', strategy: 'meeting-and-overtaking',
    build(r, band) {
      const g = old(band), L = P(r, [200, 250, 300, 400]), a = 10 * I(r, 8, 25), b = 10 * I(r, 6, 20), T0 = I(r, 6, 30);
      const same = g && r() < 0.5; if (same && a === b) return null;
      const rel = same ? Math.abs(a - b) : a + b; if ((rel * T0) % L === 0) return null;
      const ans = Math.floor((rel * T0) / L); if (ans < 2) return null;
      return {
        text: same
          ? `Two runners start together on a ${L} m circular track and run the same way, at ${a} m and ${b} m per minute. How many times does the faster one overtake the slower in the first ${T0} minutes?`
          : `Two runners start together from the same point on a ${L} m circular track and run in opposite directions, at ${a} m and ${b} m per minute. How many times do they pass each other in the first ${T0} minutes?`,
        ans,
        wrong: wrongs(ans, [ans + 1, ans - 1, Math.floor(((same ? a + b : Math.abs(a - b)) * T0) / L), Math.floor((Math.max(a, b) * T0) / L), Math.ceil((rel * T0) / L) + 1]),
        why: same
          ? `The faster runner gains ${rel} m a minute, and every overtake means gaining one more full lap of ${L} m. In ${T0} minutes the gain is ${rel * T0} m, which holds ${ans} whole laps.`
          : `Running towards each other they close ${a} + ${b} = ${rel} m a minute, and they meet every time that adds up to another ${L} m. In ${T0} minutes that is ${rel * T0} m, holding ${ans} whole laps.`,
        params: { L, a, b, T0, same },
      };
    },
    solve({ L, a, b, T0, same }) {
      // second by second positions, in sixtieths of a metre round the track
      if (same && b > a) [a, b] = [b, a]; // put the faster runner first
      const U = 60 * L; let pa = 0, pb = 0, meets = 0, gapPrev = 0;
      for (let s = 1; s <= 60 * T0; s++) {
        pa = (pa + a) % U; pb = (pb + (same ? b : U - b)) % U;
        const gap = (pa - pb + U) % U;
        if (gap < gapPrev) meets++;
        gapPrev = gap;
      }
      return [meets];
    },
  }),
  tpl({
    id: 'old-factorial-remainder', bands: ['g56', 'g78'], tier: 5, topic: 'number', strategy: 'remainder-puzzles',
    build(r, band) {
      const g = old(band), m = P(r, g ? [7, 9, 11, 12, 13, 15, 20, 24] : [5, 6, 7, 9, 10, 12]), n = I(r, Math.max(m, 10), g ? 100 : 40);
      let s = 0, f = 1, stop = 0;
      for (let k = 1; k <= n; k++) { f = (f * k) % m; if (f === 0) { stop = k; break; } s = (s + f) % m; }
      return {
        text: `What is the remainder when 1! + 2! + 3! + … + ${n}! is divided by ${m}? (k! means k × (k − 1) × … × 2 × 1.)`, ans: s,
        wrong: wrongs(s, [1, n % m, m - s, (s + 1) % m, (s + 3) % m, 0], { max: m - 1 }),
        why: `From ${stop}! onwards every term is a multiple of ${m}, so those terms leave no remainder. Only 1! + … + ${stop - 1}! matters, and that leaves ${s}.`,
        params: { n, m },
      };
    },
    solve({ n, m }) { let f = 1n, s = 0n; for (let k = 1n; k <= BigInt(n); k++) { f *= k; s += f; } return [Number(s % BigInt(m))]; },
  }),
  tpl({
    id: 'old-dice-probability', bands: ['g56', 'g78'], tier: 5, topic: 'counting', strategy: 'make-a-table',
    build(r, band) {
      const g = old(band), kind = P(r, g ? ['sum3', 'allDiff', 'aSix'] : ['multK', 'square', 'multK']), k = kind === 'multK' ? P(r, [3, 4, 6]) : kind === 'sum3' ? I(r, 5, 16) : 0;
      let c, N = g ? 216 : 36;
      if (kind === 'multK') { c = 0; for (let a = 1; a <= 6; a++) { const need = k / gcd(a, k); c += Math.floor(6 / need); } }
      else if (kind === 'square') { c = 0; for (const s of [1, 4, 9, 16, 25, 36]) for (let a = 1; a <= 6; a++) if (s % a === 0 && s / a <= 6) c++; }
      else if (kind === 'sum3') { c = 0; for (let x = 1; x <= 6; x++) { const t = k - x; c += t < 2 || t > 12 ? 0 : 6 - Math.abs(t - 7); } }
      else if (kind === 'allDiff') c = 6 * 5 * 4;
      else c = 216 - 125;
      const ans = frac(c, N);
      const ask = { multK: `the two numbers multiply to a multiple of ${k}`, square: 'the two numbers multiply to a perfect square', sum3: `the total is ${k}`, allDiff: 'all three show different numbers', aSix: 'at least one die shows a 6' }[kind];
      return {
        text: `${g ? 'Three' : 'Two'} fair six-sided dice are rolled. What is the probability that ${ask}? Give your answer as a fraction.`, ans,
        wrong: fwrongs(ans, [[c + 1, N], [c - 1, N], [N - c, N], kind === 'aSix' ? [3, 6] : [c, N / 2], kind === 'aSix' ? [1, 6] : [c + 2, N]]),
        why: `There are ${N} equally likely results. Counting carefully${kind === 'aSix' ? ' (easiest as all results minus the 5 × 5 × 5 = 125 with no 6)' : kind === 'allDiff' ? ' (6 choices, then 5, then 4)' : ', die by die,'} ${c} of them work, so the probability is ${c}/${N} = ${ans}.`,
        params: { kind, k, dice: g ? 3 : 2 },
      };
    },
    solve({ kind, k, dice }) {
      let c = 0, N = 0; const sq = (x) => Number.isInteger(Math.sqrt(x));
      const go = (vals) => {
        if (vals.length < dice) { for (let f = 1; f <= 6; f++) go([...vals, f]); return; }
        N++; const pr = vals.reduce((a, b) => a * b, 1), sum = vals.reduce((a, b) => a + b, 0);
        if (kind === 'multK' && pr % k === 0) c++;
        if (kind === 'square' && sq(pr)) c++;
        if (kind === 'sum3' && sum === k) c++;
        if (kind === 'allDiff' && new Set(vals).size === dice) c++;
        if (kind === 'aSix' && vals.includes(6)) c++;
      };
      go([]); return [frac(c, N)];
    },
  }),
  tpl({
    id: 'old-row-arrangements', bands: ['g56', 'g78'], tier: 5, topic: 'counting', strategy: 'list-systematically',
    build(r, band) {
      const g = old(band), n = g ? I(r, 5, 7) : I(r, 4, 5), kind = P(r, g ? ['apart', 'notEnds', 'between'] : ['apart', 'together']);
      const f = (x) => (x <= 1 ? 1 : x * f(x - 1));
      const names = NAMES.slice(0, n);
      // 'between': the third friend stands somewhere between the first two (not necessarily next to them) → n!/3
      const ansB = { apart: f(n) - 2 * f(n - 1), together: 2 * f(n - 1), notEnds: f(n) - 2 * f(n - 1) + f(n - 2), between: f(n) / 3 }[kind];
      const say = {
        apart: `${names[0]} and ${names[1]} refuse to stand next to each other`,
        together: `${names[0]} and ${names[1]} insist on standing next to each other`,
        notEnds: `${names[0]} will not stand at the left end and ${names[1]} will not stand at the right end`,
        between: `${names[2]} must stand somewhere between ${names[0]} and ${names[1]} (not necessarily next to them)`,
      }[kind];
      return {
        text: `${Word(n)} friends — ${names.join(', ')} — line up for a photo. ${say[0].toUpperCase() + say.slice(1)}. In how many different orders can they stand?`, ans: ansB,
        wrong: wrongs(ansB, [f(n), f(n) - f(n - 1), 2 * f(n - 1), f(n) / 2, f(n) - 2 * f(n - 1), f(n) / 6, f(n - 1)]),
        why: {
          apart: `All orders: ${n}! = ${f(n)}. Glue the two together as one block: ${n - 1}! × 2 = ${2 * f(n - 1)} orders have them side by side. So ${f(n)} − ${2 * f(n - 1)} = ${ansB}.`,
          together: `Glue the two into one block: that makes ${n - 1} things to arrange, ${n - 1}! = ${f(n - 1)} ways, and the block can face either way. So ${f(n - 1)} × 2 = ${ansB}.`,
          notEnds: `All orders ${f(n)}; take away the ${f(n - 1)} with ${names[0]} at the left and the ${f(n - 1)} with ${names[1]} at the right, then add back the ${f(n - 2)} with both, taken away twice. That is ${ansB}.`,
          between: `Of the three named friends, each of the 3 can be the middle one of them equally often. ${names[2]} is in the middle in one third of all ${f(n)} orders: ${ansB}.`,
        }[kind],
        params: { n, kind },
      };
    },
    solve({ n, kind }) {
      let c = 0;
      for (const p of perms([...Array(n).keys()])) {
        const ia = p.indexOf(0), ib = p.indexOf(1), ic = p.indexOf(2);
        if (kind === 'apart' && Math.abs(ia - ib) !== 1) c++;
        if (kind === 'together' && Math.abs(ia - ib) === 1) c++;
        if (kind === 'notEnds' && ia !== 0 && ib !== n - 1) c++;
        if (kind === 'between' && ((ia < ic && ic < ib) || (ib < ic && ic < ia))) c++;
      }
      return [c];
    },
  }),
  tpl({
    id: 'old-digit-sum-range', bands: ['g56', 'g78'], tier: 5, topic: 'counting', strategy: 'digit-puzzles',
    build(r, band) {
      const g = old(band), N = g ? P(r, [999, 1500, 2026, 3000, 5000, 9999]) : P(r, [100, 200, 300, 500, 999]), k = I(r, g ? 5 : 3, g ? 25 : 18);
      // digit by digit: how many numbers 0..N have digit sum k (none of them is 0, since k ≥ 1)
      const ds = String(N).split('').map(Number), memo = new Map();
      const go = (i, left, tight) => {
        if (left < 0) return 0; if (i === ds.length) return left === 0 ? 1 : 0;
        const key = `${i},${left},${tight}`; if (memo.has(key)) return memo.get(key);
        let t = 0; for (let d = 0; d <= (tight ? ds[i] : 9); d++) t += go(i + 1, left - d, tight && d === ds[i]);
        memo.set(key, t); return t;
      };
      const ans = go(0, k, true); if (ans < 3) return null;
      return {
        text: `How many whole numbers from 1 to ${N} have digits that add up to ${k}?`, ans,
        wrong: wrongs(ans, [ans + 1, ans - 1, ans + k, 2 * ans, ans - Math.floor(k / 2), k + 1]),
        why: `Go place by place: fix the ${ds.length > 3 ? 'thousands' : 'hundreds'} digit, then count how the remaining digits can make up the rest of ${k}, never going past ${N}. The counts add up to ${ans}.`,
        params: { N, k },
      };
    },
    solve({ N, k }) { let c = 0; for (let x = 1; x <= N; x++) if ([...String(x)].reduce((a, d) => a + +d, 0) === k) c++; return [c]; },
  }),
  tpl({
    id: 'old-mixture', bands: ['g56', 'g78'], tier: 5, topic: 'measure', strategy: 'bar-model',
    build(r, band) {
      const g = old(band);
      if (g) {
        const a = 5 * I(r, 1, 8), b = 5 * I(r, 10, 19), c = 5 * I(r, a / 5 + 1, b / 5 - 1), x = I(r, 2, 30), y = (x * (c - a)) / (b - c);
        if (!Number.isInteger(y) || y > 60) return null;
        return {
          text: `${x} litres of a drink that is ${a}% juice are mixed with some of a drink that is ${b}% juice. The mixture is ${c}% juice. How many litres of the ${b}% drink were used?`, ans: y,
          wrong: wrongs(y, [x, Math.round((x * (b - c)) / (c - a)), Math.round((x * c) / b), x + y, Math.abs(c - a), y * 2]),
          why: `Each litre of the ${a}% drink is ${c - a} points below ${c}%, and each litre of the ${b}% is ${b - c} above; they must balance. ${x} × ${c - a} = ${x * (c - a)}, and ${x * (c - a)} ÷ ${b - c} = ${y} litres.`,
          params: { x, a, b, c },
        };
      }
      const a = 10 * I(r, 2, 9), c = 5 * I(r, 1, a / 5 - 1), x = I(r, 2, 20), w = (x * (a - c)) / c;
      if (!Number.isInteger(w) || w > 80) return null;
      return {
        text: `A jug holds ${x} litres of a drink that is ${a}% juice. How many litres of water must be added to make it ${c}% juice?`, ans: w,
        wrong: wrongs(w, [Math.round((x * a) / c), Math.round((x * c) / a), Math.round((x * (a - c)) / 100), a - c, x, 2 * w]),
        why: `The juice itself does not change: ${a}% of ${x} litres is ${(a * x) / 100} litres. For that to be ${c}% of the drink, the drink must be ${(a * x) / c} litres, so add ${(a * x) / c} − ${x} = ${w} litres of water.`,
        params: { x, a, c },
      };
    },
    solve({ x, a, b, c }) {
      // try every whole number of litres, comparing juice in hundredths of a litre
      const out = [];
      for (let y = 0; y <= 500; y++) { if (b === undefined ? a * x === c * (x + y) : a * x + b * y === c * (x + y)) out.push(y); }
      return out;
    },
  }),
  tpl({
    id: 'old-new-average', bands: ['g56', 'g78'], tier: 5, topic: 'number', strategy: 'work-backwards',
    build(r, band) {
      const g = old(band), two = g && r() < 0.5, n = I(r, 5, g ? 40 : 25), A = I(r, 40, 80), B = A + I(r, 1, 4);
      const tot = (n + (two ? 2 : 1)) * B - n * A;
      if (two) {
        const s1 = I(r, B, 100), s2 = tot - s1; if (s2 < B || s2 > 100) return null;
        return {
          text: `The average mark of a class was ${A}. Two new pupils joined, scoring ${s1} and ${s2}, and the class average rose to ${B}. How many pupils were in the class before?`, ans: n,
          wrong: wrongs(n, [Math.round((s1 + s2 - B) / (B - A)), Math.round((s1 + s2) / 2 - B) / (B - A), n + 2, n - 2, n + 1, Math.round((s1 + s2) / A)]),
          why: `The two newcomers bring ${s1 + s2 - 2 * B} marks above the new average ${B}. That surplus lifts each of the ${n} old pupils' share by ${B - A}: ${n} × ${B - A} = ${s1 + s2 - 2 * B}.`,
          params: { A, B, scores: [s1, s2] },
        };
      }
      if (tot > 100) return null;
      return {
        text: `The average mark of a class was ${A}. A new pupil joined, scoring ${tot}, and the class average rose to ${B}. How many pupils were in the class before?`, ans: n,
        wrong: wrongs(n, [Math.round((tot - A) / (B - A)), n + 1, n - 1, Math.round(tot / (B - A)), Math.round((tot - B) / A), 2 * n]),
        why: `The new pupil scored ${tot - B} above the new average ${B}. Shared among everyone, that lifted each of the ${n} old pupils' marks by ${B - A}, so ${n} × ${B - A} = ${tot - B}.`,
        params: { A, B, scores: [tot] },
      };
    },
    solve({ A, B, scores }) {
      const out = []; const s = scores.reduce((a, b) => a + b, 0);
      for (let n = 1; n <= 500; n++) if (n * A + s === B * (n + scores.length)) out.push(n);
      return out;
    },
  }),
  tpl({
    id: 'old-when-i-was', bands: ['g56', 'g78'], tier: 5, topic: 'number', strategy: 'age-problems',
    build(r, band) {
      const k = old(band) ? P(r, [2, 3, 4]) : 2, g0 = gcd(2 * k, k + 1), u = I(r, 1, 12);
      const M = (2 * k * u) / g0, Y = ((k + 1) * u) / g0; if (M < 16 || M > 80) return null;
      const d = M - Y, S = 2 * M + d;
      const times = k === 2 ? 'twice' : `${word(k)} times`;
      return {
        text: `I am ${times} as old as you were when I was as old as you are now. When you are as old as I am now, our ages will add up to ${S}. How old am I now?`, ans: M,
        wrong: wrongs(M, [Y, Math.round(S / 2), Math.round(S / 3), M + d, d, Y + d / 2]),
        why: `Call the age gap d. When I was your age, you were your age minus d; I am now ${k} times that. Trying ${M} for me and ${Y} for you: you were ${Y - d} when I was ${Y}, and ${M} = ${k} × ${Y - d}; in ${d} years we will be ${M + d} and ${M}, which add to ${S}.`,
        params: { k, S },
      };
    },
    solve({ k, S }) {
      const out = [];
      for (let M = 1; M <= 150; M++) for (let Y = 1; Y < M; Y++) {
        const d = M - Y; if (Y - d <= 0) continue;
        if (M === k * (Y - d) && (M + d) + M === S) out.push(M);
      }
      return out;
    },
  }),
  tpl({
    id: 'old-painted-except', bands: ['g56', 'g78'], tier: 5, topic: 'geometry', strategy: 'painted-cubes',
    build(r, band) {
      const g = old(band), a = I(r, 3, g ? 9 : 6), b = I(r, 3, g ? 9 : 6), c = I(r, 3, g ? 8 : 5), back = g && r() < 0.6;
      const ans = (a - 2) * (b - (back ? 1 : 2)) * (c - 1);
      const nope = (a - 2) * (b - 2) * (c - 2);
      return {
        text: `A ${a} cm wide, ${b} cm deep, ${c} cm tall block stands on a table against a wall. Every face you can reach is painted — that is, every face except the bottom${back ? ' and the back, which touches the wall' : ''}. It is then cut into 1 cm cubes. How many cubes have no paint at all?`, ans,
        wrong: wrongs(ans, [nope, (a - 2) * (b - 2) * (c - 1), (a - 1) * (b - 1) * (c - 1), (a - 2) * (b - 1) * (c - 2), a * b * c - ans, ans + a]),
        why: `A cube escapes paint if it is not on any painted face. Along the width both sides are painted (${a} − 2 = ${a - 2} rows are safe), along the depth ${back ? `only the front is painted (${b} − 1 = ${b - 1} safe)` : `both are painted (${b} − 2 = ${b - 2} safe)`}, and up the height only the top is (${c} − 1 = ${c - 1}). Multiply: ${ans}.`,
        fig: cuboid(a, c, b, 'cm', 16), params: { a, b, c, back },
      };
    },
    solve({ a, b, c, back }) {
      // x across the width, y from the front (0) to the back, z from the bottom (0) to the top
      return [cubesBy(a, b, c, (x, y, z) => !(x === 0 || x === a - 1 || y === 0 || (!back && y === b - 1) || z === c - 1))];
    },
  }),
  tpl({
    id: 'old-friday-13', bands: ['g56', 'g78'], tier: 5, topic: 'logic', strategy: 'calendar-days',
    build(r, band) {
      const g = old(band), Y = I(r, 2027, 2099), kind = g ? P(r, ['f13', 'sunStart']) : 'f13';
      const leap = Y % 4 === 0 && (Y % 100 !== 0 || Y % 400 === 0);
      const jan1 = (1 + 5 * ((Y - 1) % 4) + 4 * ((Y - 1) % 100) + 6 * ((Y - 1) % 400)) % 7;
      const lens = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      let first = jan1, ans = 0;
      for (let i = 0; i < 12; i++) { if (kind === 'f13' ? (first + 12) % 7 === 5 : first === 0) ans++; first = (first + lens[i]) % 7; }
      return {
        text: kind === 'f13'
          ? `In ${Y}, 1 January is a ${DAYS[jan1]}. How many times in ${Y} does the 13th of a month fall on a Friday?`
          : `In ${Y}, 1 January is a ${DAYS[jan1]}. How many months of ${Y} begin on a Sunday?`,
        ans,
        wrong: wrongs(ans, [0, 1, 2, 3, 4, 12], { max: 12 }),
        why: `Each month starts as many weekdays later as its length beyond 4 weeks (31 days: 3 on, 30: 2 on, ${leap ? '29: 1 on' : '28: none'}). Walking month by month from ${DAYS[jan1]}, ${ans} month${ans === 1 ? '' : 's'} match${ans === 1 ? 'es' : ''}.`,
        params: { Y, kind },
      };
    },
    solve({ Y, kind }) {
      let c = 0;
      for (let mo = 0; mo < 12; mo++) {
        if (kind === 'f13' && new Date(Date.UTC(Y, mo, 13)).getUTCDay() === 5) c++;
        if (kind === 'sunStart' && new Date(Date.UTC(Y, mo, 1)).getUTCDay() === 0) c++;
      }
      return [c];
    },
  }),
  tpl({
    id: 'old-period-six', bands: ['g56', 'g78'], tier: 5, topic: 'patterns', strategy: 'find-the-rule',
    build(r, band) {
      const g = old(band), a = I(r, 2, 15), b = I(r, 2, 15); if (a === b) return null;
      const k = I(r, g ? 500 : 50, g ? 3000 : 2026), sum = g && r() < 0.6;
      const cyc = [a, b, b - a, -a, -b, a - b], part = [a, a + b, 2 * b, 2 * b - a, b - a, 0];
      const ans = sum ? part[(k - 1) % 6] : cyc[(k - 1) % 6];
      return {
        text: `A sequence starts ${a}, ${b}. Every term after that is the term before it minus the one before that (so the third term is ${b} − ${a}). What is ${sum ? `the sum of the first ${k} terms` : `the ${ord(k)} term`}?`, ans,
        wrong: wrongs(ans, [...(sum ? part : cyc), -ans, ans + a, a + b], { min: -Infinity }),
        why: `Write out a few: ${cyc.join(', ')}, then ${a}, ${b} again — the pattern repeats every 6 terms${sum ? ', and each block of 6 adds up to 0' : ''}. ${k} = 6 × ${Math.floor((k - 1) / 6)} + ${((k - 1) % 6) + 1}, so the answer matches ${sum ? `the sum of the first ${((k - 1) % 6) + 1}` : `the ${ord(((k - 1) % 6) + 1)} term`}: ${ans}.`,
        params: { a, b, k, sum },
      };
    },
    solve({ a, b, k, sum }) {
      let p = a, q = b, s = a + (k >= 2 ? b : 0), t = k === 1 ? a : b;
      for (let i = 3; i <= k; i++) { const nx = q - p; p = q; q = nx; s += nx; t = nx; }
      return [sum ? s : t];
    },
  }),
  tpl({
    id: 'old-stairs', bands: ['g56', 'g78'], tier: 5, topic: 'patterns', strategy: 'simpler-case',
    build(r, band) {
      const g = old(band), kind = g ? P(r, ['three', 'noDouble']) : 'two', n = kind === 'three' ? I(r, 6, 10) : kind === 'noDouble' ? I(r, 7, 14) : I(r, 6, 12);
      const W = [1];
      for (let i = 1; i <= n; i++) {
        if (kind === 'two') W[i] = W[i - 1] + (i >= 2 ? W[i - 2] : 0);
        if (kind === 'three') W[i] = W[i - 1] + (i >= 2 ? W[i - 2] : 0) + (i >= 3 ? W[i - 3] : 0);
      }
      let ans = W[n];
      if (kind === 'noDouble') { // E[i]: ways ending in a 1-step (or none yet), D[i]: ending in a 2-step
        const E = [1], D = [0]; for (let i = 1; i <= n; i++) { E[i] = E[i - 1] + D[i - 1]; D[i] = i >= 2 ? E[i - 2] : 0; } ans = E[n] + D[n];
      }
      const say = { two: '1 or 2 stairs at each step', three: '1, 2 or 3 stairs at each step', noDouble: '1 or 2 stairs at each step, but never two 2-stair steps in a row' }[kind];
      return {
        text: `A staircase has ${n} stairs. Mo climbs it taking ${say}. In how many different ways can Mo climb to the top?`, ans,
        wrong: wrongs(ans, [n, 2 ** (n - 1), ans - 1, ans + 1, Math.round(ans * 0.62), n * (n - 1) / 2]),
        why: kind === 'noDouble'
          ? `Try small staircases first and keep two counts: climbs whose last step was 1 stair and those whose last was 2. A 1-step can follow either kind; a 2-step only a 1-step. Building up to ${n} stairs gives ${ans}.`
          : `Try smaller staircases first: the last step is ${kind === 'two' ? '1 or 2' : '1, 2 or 3'} stairs, so each count is the sum of the previous ${kind === 'two' ? 'two' : 'three'}. Building up to ${n} stairs gives ${ans}.`,
        params: { n, kind },
      };
    },
    solve({ n, kind }) {
      let c = 0; const steps = kind === 'three' ? [1, 2, 3] : [1, 2];
      const go = (left, last) => {
        if (left === 0) { c++; return; }
        for (const s of steps) if (s <= left && !(kind === 'noDouble' && s === 2 && last === 2)) go(left - s, s);
      };
      go(n, 0); return [c];
    },
  }),
  tpl({
    id: 'old-k-of-colour', bands: ['g56', 'g78'], tier: 5, topic: 'logic', strategy: 'worst-case',
    build(r, band) {
      const g = old(band), cols = g ? ['red', 'blue', 'green', 'yellow'] : ['red', 'blue', 'green'], cnt = cols.map(() => I(r, 2, 12)), k = I(r, 3, 6);
      if (Math.max(...cnt) < k || cnt.filter((c) => c < k - 1).length === 0) return null;
      const ans = cnt.reduce((a, c) => a + Math.min(c, k - 1), 0) + 1, tot = cnt.reduce((a, b) => a + b, 0);
      const list = cols.map((c, i) => `${cnt[i]} ${c}`).join(', ').replace(/, ([^,]*)$/, ' and $1');
      return {
        text: `A bag holds ${list} balls. Without looking, what is the smallest number of balls you must take to be sure of having ${k} balls of the same colour?`, ans,
        wrong: wrongs(ans, [cols.length * (k - 1) + 1, tot, ans + 1, ans - 1, cols.length * k, tot - k + 1]),
        why: `Unluckiest case: you take as many of each colour as you can without reaching ${k} — that is ${cnt.map((c) => Math.min(c, k - 1)).join(' + ')} = ${ans - 1} balls (a colour with fewer than ${k - 1} balls runs out early). The next ball must make ${k} of one colour, so ${ans}.`,
        params: { cnt, k },
      };
    },
    solve({ cnt, k }) {
      let worst = 0;
      const go = (i, take) => {
        if (i === cnt.length) { if (take.every((t) => t < k)) worst = Math.max(worst, take.reduce((a, b) => a + b, 0)); return; }
        for (let t = 0; t <= cnt[i]; t++) go(i + 1, [...take, t]);
      };
      go(0, []); return [worst + 1];
    },
  }),
  tpl({
    id: 'old-chameleons', bands: ['g56', 'g78'], tier: 5, topic: 'logic', strategy: 'invariants',
    build(r, band) {
      const g = old(band), c = [I(r, 1, g ? 12 : 7), I(r, 1, g ? 12 : 7), I(r, 1, g ? 12 : 7)];
      const names = ['red', 'green', 'blue'];
      // all X is possible exactly when the other two counts leave the same remainder when divided by 3
      const can = names.filter((_, i) => (c[(i + 1) % 3] - c[(i + 2) % 3]) % 3 === 0);
      const ans = can.length === 0 ? 'impossible' : can.length === 3 ? 'any colour' : `${can[0]} only`;
      return {
        text: `On an island live ${c[0]} red, ${c[1]} green and ${c[2]} blue chameleons. Whenever two chameleons of different colours meet, both change to the third colour. Could all the chameleons one day be the same colour? If so, which colour?`, ans,
        wrong: others(ans, ['red only', 'green only', 'blue only', 'impossible', 'any colour']),
        why: `A meeting takes 1 from two colours and adds 2 to the third, so the difference between any two counts changes by 0 or 3. All X needs the other two counts to reach 0 together, which can only happen if their difference is a multiple of 3 — here ${names.map((nm, i) => `${nm}: ${(((c[(i + 1) % 3] - c[(i + 2) % 3]) % 3) + 3) % 3 === 0 ? 'yes' : 'no'}`).join(', ')}.`,
        params: { c },
      };
    },
    solve({ c }) {
      // explore every reachable state
      const key = (s) => s.join(','), seen = new Set([key(c)]), q = [c], mono = new Set(), N = c[0] + c[1] + c[2];
      while (q.length) {
        const s = q.pop();
        s.forEach((v, i) => { if (v === N) mono.add(i); });
        for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
          if (!s[i] || !s[j]) continue; const t = s.slice(); t[i]--; t[j]--; t[3 - i - j] += 2;
          if (!seen.has(key(t))) { seen.add(key(t)); q.push(t); }
        }
      }
      const names = ['red', 'green', 'blue'];
      return [mono.size === 0 ? 'impossible' : mono.size === 3 ? 'any colour' : mono.size === 1 ? `${names[[...mono][0]]} only` : 'two colours'];
    },
  }),
];

export const TEMPLATES = [...TIER3, ...TIER4, ...TIER5];
