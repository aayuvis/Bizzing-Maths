/* papers/bank-young.js — the contest-style problem bank for the two youngest
   bands: g12 (grades 1–2) and g34 (grades 3–4).

   Every template follows docs/PAPER-CONTRACT.md: make(r, band) builds ONE
   problem with exactly one answer, and solve(params) finds every answer again
   by a different road — counting, simulating or trying every case — so a slip
   in make is caught by the test, never copied into it.

   make is wrapped in `guard`: a draw whose answer would show up in the text or
   the picture (as a separate number) is thrown away and drawn again, so a
   child can never pick the answer by spotting it on the page. */

import { int, pick, shuffle } from '../rand.js';
import { svg, text as T, clock } from '../chapters/kit.js';

/* ---------------------------------------------------------------- helpers */

const NAMES = ['Asha', 'Ben', 'Chen', 'Dev', 'Ella', 'Farid', 'Gita', 'Hugo', 'Isla', 'Jai', 'Kofi', 'Lena',
  'Mira', 'Noor', 'Omar', 'Priya', 'Ravi', 'Sara', 'Tom', 'Uma', 'Yusuf', 'Zara'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHAPES = ['triangle', 'circle', 'square', 'star', 'diamond'];
const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];
const f1 = (n) => +n.toFixed(1);
const ord = (n) => n + ((n % 100 >= 11 && n % 100 <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'));
const two = (r) => { const s = shuffle(NAMES, r); return [s[0], s[1]]; };

/* the answer as a separate number inside a string: 7 in "7 hens" but not in "17" or "0.7" */
const hasNum = (s, n) => new RegExp(`(^|[^0-9.])${String(n).replace('.', '\\.')}(?![0-9]|\\.[0-9])`).test(s);
const figWords = (f) => [...f.matchAll(/>([^<]+)</g)].map((m) => m[1]).concat([...f.matchAll(/aria-label="([^"]*)"/g)].map((m) => m[1])).join(' | ');
function leaks(p) {
  if (typeof p.ans === 'number' && !p.echo && hasNum(p.text, p.ans)) return true;
  if (p.fig) { const w = figWords(p.fig); if (typeof p.ans === 'number' ? hasNum(w, p.ans) : w.includes(String(p.ans))) return true; }
  return false;
}
function guard(build) {
  return function make(r, band) {
    for (let i = 0; i < 400; i++) { const p = build(r, band); if (p && !leaks(p)) return p; }
    throw new Error('no clean problem after 400 draws');
  };
}

/* wrong answers: the real mistakes first, then near misses; whole, ≥ 0, distinct, never the answer */
function wr(ans, cands) {
  const out = [], ok = (v) => Number.isInteger(v) && v >= 0 && v !== ans && !out.includes(v);
  for (const c of cands) if (ok(c)) out.push(c);
  for (let d = 1; out.length < 5; d++) { if (ok(ans + d)) out.push(ans + d); if (out.length < 5 && ok(ans - d)) out.push(ans - d); }
  return out.slice(0, 6);
}
function ws(ans, cands, pool) {
  const out = [];
  for (const c of cands.concat(pool)) if (c !== ans && !out.includes(c)) out.push(c);
  return out.slice(0, 6);
}

/* drawing pieces — all colour through .dg-* classes; labels carry no numbers */
const LBL = 'A picture for the question';
function shapeAt(k, x, y, s, cls) {
  if (k === 'triangle') return `<polygon points="${f1(x)},${f1(y - s)} ${f1(x + s * 0.95)},${f1(y + s * 0.7)} ${f1(x - s * 0.95)},${f1(y + s * 0.7)}" class="${cls}"/>`;
  if (k === 'circle') return `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(s * 0.8)}" class="${cls}"/>`;
  if (k === 'square') return `<rect x="${f1(x - s * 0.72)}" y="${f1(y - s * 0.72)}" width="${f1(s * 1.44)}" height="${f1(s * 1.44)}" class="${cls}"/>`;
  if (k === 'diamond') return `<polygon points="${f1(x)},${f1(y - s)} ${f1(x + s * 0.7)},${f1(y)} ${f1(x)},${f1(y + s)} ${f1(x - s * 0.7)},${f1(y)}" class="${cls}"/>`;
  const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? s * 0.42 : s; pts.push(`${f1(x + rr * Math.cos(a))},${f1(y + rr * Math.sin(a))}`); }
  return `<polygon points="${pts.join(' ')}" class="${cls}"/>`;
}
const line = (x1, y1, x2, y2, cls = 'dg-line', extra = '') => `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" class="${cls}"${extra}/>`;
function lattice(w, h, u, ox, oy, cls = 'dg-line') { let s = ''; for (let i = 0; i <= w; i++) s += line(ox + i * u, oy, ox + i * u, oy + h * u, cls); for (let j = 0; j <= h; j++) s += line(ox, oy + j * u, ox + w * u, oy + j * u, cls); return s; }
function cells(cols, rows, u, ox, oy, cls) { let s = ''; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) s += `<rect x="${ox + c * u}" y="${oy + r * u}" width="${u}" height="${u}" class="${cls(r, c)}"/>`; return s; }
const PIPS = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] };
function die(x, y, s, v) { let o = `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${f1(s / 7)}" class="dg-blank"/>`; for (const [a, b] of PIPS[v]) o += `<circle cx="${f1(x + s * (0.22 + a * 0.28))}" cy="${f1(y + s * (0.22 + b * 0.28))}" r="${f1(s / 11)}" class="dg-dot"/>`; return o; }
function matchstick(x1, y1, x2, y2) { const g = 3, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L; return line(x1 + ux * g, y1 + uy * g, x2 - ux * g, y2 - uy * g, 'dg-line') + `<circle cx="${f1(x2 - ux * (g + 2))}" cy="${f1(y2 - uy * (g + 2))}" r="3" class="dg-dot"/>`; }
/* unit edges of a set of unit cells: a Map key → number of cells that use the edge */
function edgesOf(cellList) {
  const m = new Map(), add = (k) => m.set(k, (m.get(k) || 0) + 1);
  for (const [x, y] of cellList) { add(`h${x},${y}`); add(`h${x},${y + 1}`); add(`v${x},${y}`); add(`v${x + 1},${y}`); }
  return m;
}
function perms(a) { if (a.length <= 1) return [a.slice()]; const out = []; a.forEach((x, i) => { for (const p of perms(a.slice(0, i).concat(a.slice(i + 1)))) out.push([x, ...p]); }); return out; }
const uniq = (a) => [...new Set(a)];
const fmtT = (t) => { t = ((t % 720) + 720) % 720; return `${Math.floor(t / 60) || 12}:${String(t % 60).padStart(2, '0')}`; };

/* =================================================================== TIER 3 */

const T3 = [
  {
    id: 'yc-count-the-shapes', bands: ['g12', 'g34'], tier: 3, topic: 'counting', strategy: 'list-systematically',
    make: guard((r, band) => {
      const kinds = ['triangle', 'circle', 'square', 'star'];
      const n = band === 'g12' ? int(8, 12, r) : int(14, 20, r);
      const items = Array.from({ length: n }, () => pick(kinds, r));
      const cnt = {}; for (const k of kinds) cnt[k] = 0; for (const k of items) cnt[k]++;
      const cols = band === 'g12' ? 6 : 7, u = 46;
      let s = ''; items.forEach((k, i) => { s += shapeAt(k, 30 + (i % cols) * u + int(-5, 5, r), 30 + Math.floor(i / cols) * u + int(-5, 5, r), 15, pick(['dg-fill1', 'dg-fill2', 'dg-fill3'], r)); });
      const fig = svg(cols * u + 14, Math.ceil(n / cols) * u + 14, s, 'Shapes scattered in a picture');
      if (band === 'g12') {
        const k = pick(kinds, r), ans = cnt[k]; if (ans < 2) return null;
        return { text: `How many ${k}s are in the picture?`, ans, wrong: wr(ans, [n, n - ans, ...kinds.map((o) => cnt[o]).filter((v) => v > 0)]),
          why: `Point at each ${k} once and count as you go, row by row so none is missed or counted twice.`, fig, params: { items, q: 'count', a: k } };
      }
      const [a, b] = shuffle(kinds, r); const ans = cnt[a] - cnt[b]; if (ans < 1) return null;
      return { text: `In the picture, how many more ${a}s are there than ${b}s?`, ans, wrong: wr(ans, [cnt[a], cnt[b], cnt[a] + cnt[b]]),
        why: `Count the ${a}s and the ${b}s separately, row by row, then take the smaller number from the bigger.`, fig, params: { items, q: 'more', a, b } };
    }),
    solve(p) { let c = 0; for (const k of p.items) { if (k === p.a) c++; if (p.q === 'more' && k === p.b) c--; } return [c]; },
  },
  {
    id: 'yc-legs-in-the-yard', bands: ['g12', 'g34'], tier: 3, topic: 'number', strategy: 'heads-and-legs',
    make: guard((r, band) => {
      const LEGS = { hens: 2, dogs: 4, beetles: 6, spiders: 8 };
      const kinds = band === 'g12' ? ['hens', 'dogs'] : shuffle(Object.keys(LEGS), r).slice(0, 3);
      const counts = kinds.map(() => (band === 'g12' ? int(1, 6, r) : int(2, 9, r)));
      const ans = kinds.reduce((t, k, i) => t + LEGS[k] * counts[i], 0), heads = counts.reduce((a, b) => a + b, 0);
      const list = kinds.map((k, i) => `${counts[i]} ${k}`), said = list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
      return { text: `In a yard there are ${said}. How many legs are there altogether?`, ans,
        wrong: wr(ans, [heads, heads * 4, heads * 2, ans - LEGS[kinds[0]] * counts[0], ans + 2]),
        why: `Find the legs for each kind of animal (${kinds.map((k) => `${k} have ${LEGS[k]}`).join(', ')}), then add the groups together.`,
        params: { animals: kinds.flatMap((k, i) => Array(counts[i]).fill(k)) } };
    }),
    solve(p) { const L = { hens: 2, dogs: 4, beetles: 6, spiders: 8 }; let t = 0; for (const a of p.animals) for (let i = 0; i < L[a]; i++) t++; return [t]; },
  },
  {
    id: 'yc-coins-in-the-purse', bands: ['g12', 'g34'], tier: 3, topic: 'measure', strategy: 'make-a-table',
    make: guard((r, band) => {
      const vals = band === 'g12' ? [1, 2, 5, 10] : [1, 2, 5, 10, 20, 50];
      const n = band === 'g12' ? int(4, 6, r) : int(5, 8, r);
      const coins = Array.from({ length: n }, () => pick(vals, r)).sort((a, b) => b - a);
      if (band === 'g12' && coins.reduce((a, b) => a + b, 0) > 45) return null;
      const ans = vals.reduce((t, v) => t + v * coins.filter((c) => c === v).length, 0);
      let s = ''; coins.forEach((c, i) => { const x = 34 + i * 58, rr = c >= 10 ? 25 : 21; s += `<circle cx="${x}" cy="34" r="${rr}" class="${c >= 10 ? 'dg-fill1' : 'dg-fill2'}"/>` + T(x, 40, c, 'dg-text'); });
      return { text: `Mia has the coins in the picture. How much money does she have altogether?`, ans,
        wrong: wr(ans, [n, ans - coins[0], ans - coins[n - 1], ans + coins[n - 1], ans + 10]),
        why: 'Add the biggest coins first, then the smaller ones, keeping a running total.',
        fig: svg(n * 58 + 12, 70, s, 'A row of coins with their values'), params: { coins } };
    }),
    solve(p) { let t = 0; for (const c of p.coins) for (let i = 0; i < c; i++) t++; return [t]; },
  },
  {
    id: 'yc-what-comes-next', bands: ['g12', 'g34'], tier: 3, topic: 'patterns', strategy: 'find-the-rule',
    make: guard((r, band) => {
      let seq, kind, ans, why, wrong;
      if (band === 'g12') {
        kind = 'add'; const a = int(1, 12, r), d = int(2, 5, r); seq = [0, 1, 2, 3, 4].map((i) => a + i * d); ans = a + 5 * d;
        wrong = [ans + 1, ans - 1, ans + d, seq[4] + 1, ans - d + 1]; why = `Each number is ${d} more than the one before, so add ${d} to the last one.`;
      } else {
        kind = pick(['grow', 'double'], r);
        if (kind === 'grow') { const a = int(1, 20, r), d = int(1, 6, r), e = int(1, 3, r); seq = [a]; for (let i = 0; i < 4; i++) seq.push(seq[i] + d + i * e); ans = seq[4] + d + 4 * e;
          wrong = [seq[4] + d + 3 * e, seq[4] + d + 5 * e, seq[4] + (seq[4] - seq[3]), ans + 1, ans - 1]; why = `The jumps grow by ${e} each time, so the next jump is ${e} more than the last one.`; }
        else { const a = int(1, 9, r); seq = [a, 2 * a, 4 * a, 8 * a, 16 * a]; ans = 32 * a; wrong = [24 * a, 16 * a + 8 * a + a, 16 * a + 16, ans + a, ans - a]; why = 'Each number is double the one before, so double the last one.'; }
      }
      return { text: `What number comes next? ${seq.join(', ')}, …`, ans, wrong: wr(ans, wrong), why, params: { seq, kind } };
    }),
    solve(p) {
      const out = [], s = p.seq;
      for (let x = 0; x < 1000; x++) {
        const t = s.concat(x), d = t.slice(1).map((v, i) => v - t[i]);
        if (p.kind === 'add' && d.every((v) => v === d[0])) out.push(x);
        if (p.kind === 'grow') { const d2 = d.slice(1).map((v, i) => v - d[i]); if (d2.every((v) => v === d2[0])) out.push(x); }
        if (p.kind === 'double' && t.slice(1).every((v, i) => v === 2 * t[i])) out.push(x);
      }
      return out;
    },
  },
  {
    id: 'yc-clock-later', bands: ['g12', 'g34'], tier: 3, topic: 'measure', strategy: 'work-backwards',
    make: guard((r, band) => {
      let t0, mins, dir, text;
      if (band === 'g12') {
        t0 = int(1, 12, r) * 60 + pick([0, 30], r); dir = 1; mins = pick([30, 60, 90, 120, 180, 240], r);
        const say = { 30: 'half an hour', 60: '1 hour', 90: 'an hour and a half', 120: '2 hours', 180: '3 hours', 240: '4 hours' }[mins];
        text = `The clock shows the time now. What time will it be in ${say}?`;
      } else {
        t0 = int(1, 12, r) * 60 + 5 * int(0, 11, r); dir = -1; mins = int(1, 3, r) * 60 + 5 * int(1, 11, r);
        text = `The clock shows the time a film ended. The film lasted ${Math.floor(mins / 60)} hour${mins >= 120 ? 's' : ''} and ${mins % 60} minutes. What time did it start?`;
      }
      const ans = fmtT(t0 + dir * mins);
      return { text, ans, wrong: ws(ans, [fmtT(t0 - dir * mins), fmtT(t0 + dir * mins + 60), fmtT(t0 + dir * mins - 60), fmtT(t0 + dir * (mins - 30)), fmtT(t0 + dir * mins + 30)], []),
        why: dir > 0 ? (mins % 60 ? 'Move the hands on: whole hours first, then the extra half hour.' : 'Move the hour hand on one hour at a time; the minute hand ends where it started.') : 'Work backwards from the end: take away the whole hours first, then the minutes.',
        fig: clock(Math.floor(t0 / 60), t0 % 60), params: { t0, mins, dir } };
    }),
    solve(p) { let h = Math.floor(p.t0 / 60) % 12, m = p.t0 % 60; for (let i = 0; i < p.mins; i++) { m += p.dir; if (m === 60) { m = 0; h = (h + 1) % 12; } if (m === -1) { m = 59; h = (h + 11) % 12; } } return [`${h || 12}:${String(m).padStart(2, '0')}`]; },
  },
  {
    // the answer is a name, and every name is in the clues — that is the problem, not a leak
    id: 'yc-who-is-tallest', bands: ['g12', 'g34'], tier: 3, topic: 'logic', strategy: 'list-systematically',
    make: guard((r, band) => {
      const order = shuffle(NAMES, r).slice(0, 5); // tallest first
      const clues = shuffle([0, 1, 2, 3].map((i) => [order[i], order[i + 1]]), r);
      const said = clues.map(([a, b]) => (r() < 0.5 ? `${a} is taller than ${b}.` : `${b} is shorter than ${a}.`)).join(' ');
      const ask = band === 'g12' ? pick([0, 4], r) : pick([1, 2, 3], r);
      const q = ['the tallest', 'second tallest', 'in the middle', 'second shortest', 'the shortest'][ask];
      const ans = order[ask];
      return { text: `${said} Who is ${q}?`, ans, wrong: ws(ans, order.filter((x) => x !== ans), []),
        why: 'Put the children in a line from tallest to shortest, adding one clue at a time, then read off the place asked for.',
        params: { names: shuffle(order, r), clues, ask } };
    }),
    solve(p) { const out = []; for (const o of perms(p.names)) if (p.clues.every(([a, b]) => o.indexOf(a) < o.indexOf(b))) out.push(o[p.ask]); return uniq(out); },
  },
  {
    id: 'yc-make-them-equal', bands: ['g12', 'g34'], tier: 3, topic: 'number', strategy: 'bar-model',
    make: guard((r, band) => {
      const a = band === 'g12' ? int(2, 15, r) : int(20, 150, r), diff = 2 * (band === 'g12' ? int(2, 6, r) : int(5, 40, r)), b = a + diff, ans = diff / 2;
      const [x, y] = two(r);
      return { text: `${x} has ${a} marbles and ${y} has ${b}. How many marbles must ${y} give to ${x} so that they both have the same number?`, ans,
        wrong: wr(ans, [diff, (a + b) / 2, ans + 1, ans - 1, b - a + 1]),
        why: `${y} has ${diff} more. Giving away half of that gap takes ${y} down and brings ${x} up by the same amount, so the gap closes.`,
        params: { a, b } };
    }),
    solve(p) { const out = []; for (let k = 0; k <= p.b; k++) if (p.a + k === p.b - k) out.push(k); return out; },
  },
  {
    id: 'yc-days-from-now', bands: ['g12', 'g34'], tier: 3, topic: 'measure', strategy: 'calendar-days',
    make: guard((r, band) => {
      const d0 = int(0, 6, r), n = band === 'g12' ? int(3, 20, r) : int(20, 100, r), dir = band === 'g12' ? 1 : pick([1, -1], r);
      const i = (((d0 + dir * n) % 7) + 7) % 7, ans = DAYS[i];
      return { text: dir > 0 ? `Today is ${DAYS[d0]}. What day of the week will it be in ${n} days?` : `Today is ${DAYS[d0]}. What day of the week was it ${n} days ago?`, ans,
        wrong: ws(ans, [DAYS[(i + 1) % 7], DAYS[(i + 6) % 7], DAYS[d0], DAYS[(((d0 - dir * n) % 7) + 7) % 7]], DAYS),
        why: 'Every 7 days it is the same day again, so skip whole weeks and count only the days left over.', params: { d0, n, dir } };
    }),
    solve(p) { let d = p.d0; for (let k = 0; k < p.n; k++) d = (d + p.dir + 7) % 7; return [DAYS[d]]; },
  },
  {
    id: 'yc-matchstick-grid', bands: ['g12', 'g34'], tier: 3, topic: 'counting', strategy: 'simpler-case',
    make: guard((r, band) => {
      const w = band === 'g12' ? int(1, 3, r) : int(2, 5, r), h = band === 'g12' ? int(1, 2, r) : int(2, 4, r);
      if (w * h < 2) return null;
      const ans = w * (h + 1) + h * (w + 1), u = 46, o = 12;
      let s = ''; for (let y = 0; y <= h; y++) for (let x = 0; x < w; x++) s += matchstick(o + x * u, o + y * u, o + (x + 1) * u, o + y * u);
      for (let x = 0; x <= w; x++) for (let y = 0; y < h; y++) s += matchstick(o + x * u, o + y * u, o + x * u, o + (y + 1) * u);
      return { text: 'This shape is made of matchsticks. How many matchsticks are there?', ans,
        wrong: wr(ans, [4 * w * h, (w + 1) * (h + 1), ans - w, ans + h, w * h]),
        why: `Count the rows of sticks lying flat (${h + 1} rows of ${w}) and the columns standing up (${w + 1} columns of ${h}), then add.`,
        fig: svg(w * u + 2 * o, h * u + 2 * o, s, 'A grid of squares made of matchsticks'), params: { w, h } };
    }),
    solve(p) { const c = []; for (let x = 0; x < p.w; x++) for (let y = 0; y < p.h; y++) c.push([x, y]); return [edgesOf(c).size]; },
  },
  {
    id: 'yc-birthday-ages', bands: ['g12', 'g34'], tier: 3, topic: 'number', strategy: 'age-problems',
    make: guard((r, band) => {
      const [n] = two(r);
      if (band === 'g12') {
        const a = int(4, 9, r), d = int(1, 5, r), older = r() < 0.6, k = int(1, 6, r), sis = older ? a + d : a - d; if (sis < 1) return null;
        const ans = sis + k;
        return { text: `${n} is ${a} years old. ${n}'s sister is ${d} years ${older ? 'older' : 'younger'}. How old will the sister be in ${k} years?`, ans,
          wrong: wr(ans, [a + k, older ? a - d + k : a + d + k, sis, a + d + k + 1]),
          why: `First find the sister's age now (${sis}), then count on ${k} years.`, params: { kind: 'sis', a, d, older, k } };
      }
      const M = int(22, 40, r), a = int(6, 12, r), T2 = a + int(2, 20, r), ans = M + T2;
      return { text: `${n}'s mum was ${M} when ${n} was born. ${n} is now ${a}. How old will Mum be when ${n} is ${T2}?`, ans,
        wrong: wr(ans, [M + a, T2 + a, M + T2 - a, M + T2 + a]),
        why: `The age gap never changes: Mum is always ${M} years older, so add ${M} to ${n}'s age then.`, params: { kind: 'mum', M, a, T: T2 } };
    }),
    solve(p) {
      const out = [];
      if (p.kind === 'sis') { for (let s = 0; s < 100; s++) if ((p.older ? s - p.a : p.a - s) === p.d) { let x = s; for (let i = 0; i < p.k; i++) x++; out.push(x); } }
      else { for (let m = 0; m < 150; m++) if (m - p.a === p.M) { let c = p.a, mm = m; while (c < p.T) { c++; mm++; } out.push(mm); } }
      return out;
    },
  },
  {
    id: 'yc-balance-boxes', bands: ['g12', 'g34'], tier: 3, topic: 'logic', strategy: 'guess-check-improve',
    make: guard((r, band) => {
      let n1, n2, x, c1, c2;
      if (band === 'g12') { n1 = int(2, 3, r); n2 = 0; x = int(2, 9, r); c1 = int(0, 5, r); c2 = n1 * x + c1; }
      else { n1 = int(3, 6, r); n2 = int(1, n1 - 1, r); x = int(5, 40, r); c1 = int(0, 20, r); c2 = (n1 - n2) * x + c1; }
      const side = (n, c, ox) => { let s = ''; for (let i = 0; i < n; i++) s += `<rect x="${ox + i * 30}" y="58" width="26" height="26" class="dg-fill2"/>` + T(ox + i * 30 + 13, 76, '?', 'dg-small');
        const ww = c >= 100 ? 66 : c >= 10 ? 56 : 48;
        if (c) s += `<polygon points="${ox + n * 30},84 ${ox + n * 30 + ww},84 ${ox + n * 30 + ww - 6},56 ${ox + n * 30 + 6},56" class="dg-fill1"/>` + T(ox + n * 30 + ww / 2, 76, `${c} kg`, 'dg-small'); return s; };
      const W = 2 * (Math.max(n1, n2) * 30 + 76) + 40, mid = W / 2;
      let s = line(10, 86, mid - 10, 86) + line(mid + 10, 86, W - 10, 86) + `<polygon points="${mid},92 ${mid - 16},124 ${mid + 16},124" class="dg-fill3"/>` + line(10, 92, W - 10, 92);
      s += side(n1, c1, 14) + side(n2, c2, mid + 14);
      const desc = (n, c) => [n ? `${n} box${n > 1 ? 'es' : ''}` : '', c ? `a ${c} kg weight` : ''].filter(Boolean).join(' and ');
      const ans = x;
      return { text: `The scale balances. One side has ${desc(n1, c1)}; the other side has ${desc(n2, c2)}. All the boxes weigh the same. How many kilograms does one box weigh?`, ans,
        wrong: wr(ans, [Math.floor(c2 / n1), c2 - c1, Math.floor(c2 / (n1 + n2)), Math.floor((c2 + c1) / (n1 - n2 || 1)), ans + 2]),
        why: n2 ? `Take ${n2} box${n2 > 1 ? 'es' : ''} off both sides and the ${c1 ? `${c1} kg` : 'weight'} too; what is left shows how much the remaining boxes weigh together.` : (c1 ? `Take the ${c1} kg weight away from both sides, then share what is left equally among the boxes.` : 'The boxes together weigh as much as the weight, so share it equally among the boxes.'),
        fig: svg(W, 130, s, 'A balance scale with boxes and weights'), params: { n1, n2, c1, c2 } };
    }),
    solve(p) { const out = []; for (let x = 1; x < 1000; x++) if (p.n1 * x + p.c1 === p.n2 * x + p.c2) out.push(x); return out; },
  },
  {
    id: 'yc-shortest-walk', bands: ['g12'], tier: 3, topic: 'geometry', strategy: 'grid-paths',
    make: guard((r) => {
      const w = int(3, 6, r), h = int(2, 4, r); const A = [int(0, w, r), int(0, h, r)], B = [int(0, w, r), int(0, h, r)];
      const ans = Math.abs(A[0] - B[0]) + Math.abs(A[1] - B[1]); if (A[0] === B[0] || A[1] === B[1]) return null;
      const u = 40, o = 20; let s = lattice(w, h, u, o, o);
      for (const [[x, y], l] of [[A, 'A'], [B, 'B']]) s += `<circle cx="${o + x * u}" cy="${o + y * u}" r="7" class="dg-dot"/>` + T(o + x * u + 12, o + y * u - 8, l, 'dg-accent', 'start');
      return { text: 'An ant walks along the lines of the grid from A to B. How many sides of small squares long is its shortest walk?', ans,
        wrong: wr(ans, [Math.abs(A[0] - B[0]) * Math.abs(A[1] - B[1]), Math.max(Math.abs(A[0] - B[0]), Math.abs(A[1] - B[1])), ans + 2, ans - 1]),
        why: 'Every shortest walk goes across the right number of sides and up or down the right number of sides, so add the two.',
        fig: svg(w * u + 2 * o + 20, h * u + 2 * o, s, 'A grid with two points marked A and B'), params: { w, h, A, B } };
    }),
    solve(p) {
      const key = (x, y) => x + ',' + y, dist = new Map([[key(...p.A), 0]]), q = [p.A];
      while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx > p.w || ny > p.h || dist.has(key(nx, ny))) continue; dist.set(key(nx, ny), dist.get(key(x, y)) + 1); q.push([nx, ny]); } }
      return [dist.get(key(...p.B))];
    },
  },
  {
    id: 'yc-even-between', bands: ['g12', 'g34'], tier: 3, topic: 'number', strategy: 'parity',
    make: guard((r, band) => {
      let a, b, kind;
      if (band === 'g12') { kind = 'even'; a = int(1, 15, r); b = a + int(6, 15, r); }
      else { kind = pick(['odd', 'five'], r); a = int(10, 200, r); b = a + int(20, 90, r); }
      const evens = Math.floor((b - 1) / 2) - Math.floor(a / 2);
      const ans = kind === 'even' ? evens : kind === 'odd' ? b - a - 1 - evens : Math.floor((b - 1) / 5) - Math.floor(a / 5);
      const what = { even: 'even numbers', odd: 'odd numbers', five: 'numbers that are multiples of 5' }[kind];
      return { text: `How many ${what} are there between ${a} and ${b}? (Do not count ${a} or ${b} themselves.)`, ans,
        wrong: wr(ans, [b - a, b - a - 1, ans + 1, ans - 1, Math.round((b - a) / 2)]),
        why: kind === 'five' ? 'Find the first and last multiple of 5 inside the gap, then count them in fives.' : `Every other number is ${kind}, so find the first and the last ${kind} number inside the gap and count in twos.`,
        params: { a, b, kind } };
    }),
    solve(p) { let c = 0; for (let x = p.a + 1; x < p.b; x++) if (p.kind === 'even' ? x % 2 === 0 : p.kind === 'odd' ? x % 2 === 1 : x % 5 === 0) c++; return [c]; },
  },
  {
    id: 'yc-digit-cards', bands: ['g12', 'g34'], tier: 3, topic: 'number', strategy: 'digit-puzzles',
    make: guard((r, band) => {
      const k = band === 'g12' ? 2 : 3, cards = shuffle(band === 'g12' ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], r).slice(0, k + 1);
      const big = r() < 0.5, desc = cards.slice().sort((a, b) => b - a), asc = cards.slice().sort((a, b) => a - b);
      const d = big ? desc.slice(0, k) : asc[0] === 0 ? [asc[1], 0, ...asc.slice(2, k)] : asc.slice(0, k);
      const num = (a) => +a.join(''), ans = num(d);
      const all = []; for (const pm of perms(cards)) if (pm[0] !== 0) all.push(num(pm.slice(0, k)));
      const ranked = uniq(all).sort((a, b) => (big ? b - a : a - b));
      const rev = num(d.slice().reverse()), asIs = num(cards.slice(0, k));
      let s = ''; cards.forEach((c, i) => { s += `<rect x="${10 + i * 56}" y="8" width="44" height="58" rx="6" class="dg-blank"/>` + T(32 + i * 56, 47, c, 'dg-big'); });
      return { text: `Use ${k === 2 ? 'two' : 'three'} of these cards to make the ${big ? 'biggest' : 'smallest'} ${k === 2 ? 'two' : 'three'}-digit number you can. What number is it?`, ans,
        wrong: wr(ans, [ranked[1], ranked[2], rev, asIs, ranked[3], ans + 1].filter((v) => String(v).length === k)),
        why: big ? 'The biggest digit must go in the place worth the most, then the next biggest, and so on.' : 'The smallest digit goes in the place worth the most, but a number cannot start with 0.',
        fig: svg(cards.length * 56 + 14, 74, s, 'Digit cards'), params: { cards, k, big } };
    }),
    solve(p) {
      const vals = [], go = (pre, rest) => { if (pre.length === p.k) { if (pre[0] !== 0) vals.push(+pre.join('')); return; } rest.forEach((c, i) => go(pre.concat(c), rest.filter((_, j) => j !== i))); };
      go([], p.cards); return [p.big ? Math.max(...vals) : Math.min(...vals)];
    },
  },
  {
    id: 'yc-dice-bottoms', bands: ['g12', 'g34'], tier: 3, topic: 'geometry', strategy: 'dice-faces',
    make: guard((r, band) => {
      const n = band === 'g12' ? 2 : int(3, 4, r), tops = Array.from({ length: n }, () => int(1, 6, r));
      const ans = tops.reduce((t, v) => t + 7 - v, 0), st = tops.reduce((a, b) => a + b, 0);
      let s = ''; tops.forEach((v, i) => { s += die(10 + i * 70, 10, 56, v); });
      return { text: `On a dice, the dots on opposite faces always add up to 7. These ${WORD[n]} dice lie on a table. What is the total number of dots on the faces touching the table?`, ans,
        wrong: wr(ans, [st, 7 * n, 6 * n, ans + 1, ans - 1]),
        why: 'Each bottom face is 7 take away the top face, so find each bottom and add them.',
        fig: svg(n * 70 + 6, 76, s, 'Dice seen from above'), params: { tops } };
    }),
    solve(p) { const PAIRS = [[1, 6], [2, 5], [3, 4]]; let t = 0; for (const v of p.tops) for (const [a, b] of PAIRS) { if (a === v) t += b; if (b === v) t += a; } return [t]; },
  },
  {
    id: 'yc-eggs-under-the-cloth', bands: ['g12', 'g34'], tier: 3, topic: 'counting', strategy: 'make-a-table',
    make: guard((r, band) => {
      const rows = band === 'g12' ? int(2, 4, r) : int(4, 7, r), cols = band === 'g12' ? int(3, 6, r) : int(5, 9, r);
      const ch = int(1, rows - 1, r), cw = int(2, cols - 1, r), r0 = int(0, rows - ch, r), c0 = int(0, cols - cw, r);
      const covered = (y, x) => y >= r0 && y < r0 + ch && x >= c0 && x < c0 + cw;
      const u = 36, o = 10; let s = `<rect x="${o - 4}" y="${o - 4}" width="${cols * u + 8}" height="${rows * u + 8}" rx="8" class="dg-blank"/>`;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (!covered(y, x)) s += `<ellipse cx="${o + x * u + u / 2}" cy="${o + y * u + u / 2}" rx="11" ry="14" class="dg-fill2"/>`;
      s += `<rect x="${o + c0 * u - 2}" y="${o + r0 * u - 2}" width="${cw * u + 4}" height="${ch * u + 4}" rx="6" class="dg-fill3"/>`;
      const fig = svg(cols * u + 2 * o, rows * u + 2 * o, s, 'A tray of eggs, partly covered by a cloth');
      const vis = rows * cols - ch * cw;
      if (band === 'g12') {
        const ans = rows * cols;
        return { text: 'The tray is full of eggs, but a cloth hides some of them. How many eggs are in the tray altogether?', ans,
          wrong: wr(ans, [vis, rows + cols, ans - rows, ans + cols, ch * cw]), why: 'Every row has the same number of eggs, so count one whole row and add it once for each row.', fig, params: { rows, cols, r0, c0, ch, cw, ask: 'all' } };
      }
      const ans = ch * cw;
      return { text: 'The tray was full of eggs in equal rows. How many eggs are hidden under the cloth?', ans,
        wrong: wr(ans, [vis, rows * cols, ans + ch, ans - cw, ch + cw]), why: 'Count the eggs in a whole row and the rows in a whole column, find the full tray, then take away the eggs you can see.', fig, params: { rows, cols, r0, c0, ch, cw, ask: 'hidden' } };
    }),
    solve(p) { let c = 0; for (let y = 0; y < p.rows; y++) for (let x = 0; x < p.cols; x++) { const hid = y >= p.r0 && y < p.r0 + p.ch && x >= p.c0 && x < p.c0 + p.cw; if (p.ask === 'all' || hid) c++; } return [c]; },
  },
  {
    id: 'yc-missing-number', bands: ['g12', 'g34'], tier: 3, topic: 'number', strategy: 'work-backwards',
    make: guard((r, band) => {
      const form = band === 'g12' ? pick(['x+a', 'a-x', 'x-a'], r) : pick(['x*a', 'x+a', 'x-a'], r);
      let x, a;
      if (form === 'x*a') { x = int(3, 40, r); a = int(3, 12, r); } else { x = band === 'g12' ? int(2, 30, r) : int(40, 400, r); a = band === 'g12' ? int(2, 20, r) : int(20, 300, r); }
      if (form === 'a-x' && a <= x) [a, x] = [x + a, x];
      const b = { 'x+a': x + a, 'a-x': a - x, 'x-a': x - a, 'x*a': x * a }[form]; if (b < 1) return null;
      const show = { 'x+a': `□ + ${a} = ${b}`, 'a-x': `${a} − □ = ${b}`, 'x-a': `□ − ${a} = ${b}`, 'x*a': `□ × ${a} = ${b}` }[form];
      const ans = x;
      return { text: `What number goes in the box? ${show}`, ans, wrong: wr(ans, [b + a, Math.abs(b - a), a + b + 1, ans + 10, ans - 10, b]),
        why: { 'x+a': `Work backwards: undo adding ${a} by taking ${a} away from ${b}.`, 'a-x': `The box is the gap between ${a} and ${b}.`, 'x-a': `Work backwards: undo taking away ${a} by adding ${a} to ${b}.`, 'x*a': `Work backwards: undo times ${a} by sharing ${b} into ${a} equal groups.` }[form],
        params: { form, a, b } };
    }),
    solve(p) { const out = []; for (let x = 0; x < 1000; x++) { const v = { 'x+a': x + p.a, 'a-x': p.a - x, 'x-a': x - p.a, 'x*a': x * p.a }[p.form]; if (v === p.b) out.push(x); } return out; },
  },
  {
    id: 'yc-cube-staircase', bands: ['g12', 'g34'], tier: 3, topic: 'counting', strategy: 'simpler-case',
    make: guard((r, band) => {
      const kind = band === 'g12' ? 'stair' : 'pyramid', n = band === 'g12' ? int(3, 6, r) : int(4, 7, r);
      const heights = kind === 'stair' ? Array.from({ length: n }, (_, i) => i + 1) : Array.from({ length: 2 * n - 1 }, (_, i) => n - Math.abs(n - 1 - i));
      const ans = kind === 'stair' ? (n * (n + 1)) / 2 : n * n;
      const u = 26, H = n * u + 14; let s = '';
      heights.forEach((h, i) => { for (let j = 0; j < h; j++) s += `<rect x="${8 + i * u}" y="${H - 6 - (j + 1) * u}" width="${u}" height="${u}" class="${(i + j) % 2 ? 'dg-fill1' : 'dg-fill2'}"/>`; });
      return { text: kind === 'stair' ? 'How many cubes are used to build this staircase?' : 'How many cubes are used to build this tower of steps, going up and back down?', ans,
        wrong: wr(ans, [heights.length, kind === 'stair' ? n * n : n * n + n, kind === 'stair' ? n * (n + 1) : n * (n - 1), ans + n, ans - n, ans + 1]),
        why: kind === 'stair' ? 'Count the cubes in each column, 1 then 2 then 3 and so on, and add them up.' : 'Count each column and add; notice the columns pair up nicely from the outside in.',
        fig: svg(heights.length * u + 16, H, s, 'Cubes stacked in columns'), params: { heights } };
    }),
    solve(p) { let c = 0; for (const h of p.heights) for (let j = 0; j < h; j++) c++; return [c]; },
  },
];

/* =================================================================== TIER 4 */

const T4 = [
  {
    id: 'yc-hens-and-rabbits', bands: ['g12', 'g34'], tier: 4, topic: 'number', strategy: 'heads-and-legs',
    make: guard((r, band) => {
      const kind = band === 'g12' ? 'farm' : pick(['farm', 'bikes'], r);
      const H = band === 'g12' ? int(3, 8, r) : int(10, 30, r), k = int(1, H - 1, r);
      const [big, small, bn, sn, part, whole] = kind === 'farm' ? ['rabbits', 'hens', 4, 2, 'heads', 'legs'] : ['tricycles', 'bicycles', 3, 2, 'seats', 'wheels'];
      const L = bn * k + sn * (H - k), ans = k;
      return { text: kind === 'farm' ? `On a farm there are only rabbits and hens. Altogether they have ${H} heads and ${L} legs. How many rabbits are there?` : `A shop has only bicycles and tricycles, each with one seat. Altogether there are ${H} seats and ${L} wheels. How many tricycles are there?`, ans,
        wrong: wr(ans, [H - k, Math.floor(L / bn), L - sn * H + 1, Math.floor(L / (bn + sn)), ans + 1]),
        why: `If all ${H} were ${small} there would be ${sn * H} ${whole}. Each of the ${big} adds ${bn - sn} more, so count how many extra ${whole} there are.`,
        params: { H, L, bn, sn } };
    }),
    solve(p) { const out = []; for (let g = 0; g <= p.H; g++) if (p.bn * g + p.sn * (p.H - g) === p.L) out.push(g); return out; },
  },
  {
    id: 'yc-matchstick-row', bands: ['g12', 'g34'], tier: 4, topic: 'patterns', strategy: 'find-the-rule',
    make: guard((r, band) => {
      const rows = band === 'g12' ? 1 : pick([1, 2], r), n = band === 'g12' ? int(5, 9, r) : rows === 1 ? int(10, 50, r) : int(5, 30, r);
      const ans = rows === 1 ? 3 * n + 1 : 5 * n + 2;
      const u = 26; let s = '', ox = 8;
      for (let f = 1; f <= 3; f++) {
        for (let y = 0; y <= rows; y++) for (let x = 0; x < f; x++) s += matchstick(ox + x * u, 8 + y * u, ox + (x + 1) * u, 8 + y * u);
        for (let x = 0; x <= f; x++) for (let y = 0; y < rows; y++) s += matchstick(ox + x * u, 8 + y * u, ox + x * u, 8 + (y + 1) * u);
        ox += f * u + 34;
      }
      return { text: `These shapes are made of matchsticks, with ${rows === 1 ? 'one row' : 'two rows'} of squares that grow by one square each time. How many matchsticks are needed for ${rows === 1 ? 'a row' : 'two rows'} of ${n} squares?`, ans,
        wrong: wr(ans, rows === 1 ? [4 * n, 3 * n, 3 * n + 3, 4 * n - 1] : [8 * n, 7 * n + 1, 6 * n + 2, 5 * n]),
        why: rows === 1 ? 'The first square needs 4 sticks, and each new square shares a side, so it needs only 3 more.' : 'The first column of two squares needs 7 sticks; each new column shares its left side, so it needs only 5 more.',
        fig: svg(ox, rows * u + 16, s, 'Growing rows of matchstick squares'), params: { n, rows } };
    }),
    solve(p) { const c = []; for (let x = 0; x < p.n; x++) for (let y = 0; y < p.rows; y++) c.push([x, y]); return [edgesOf(c).size]; },
  },
  {
    id: 'yc-handshakes', bands: ['g12', 'g34'], tier: 4, topic: 'counting', strategy: 'handshakes',
    make: guard((r, band) => {
      const n = band === 'g12' ? int(3, 6, r) : int(5, 14, r), kind = pick(['hands', 'games'], r), ans = (n * (n - 1)) / 2;
      return { text: kind === 'hands' ? `${n} friends meet at a party. Every two of them shake hands exactly once. How many handshakes are there?` : `${n} teams are in a league. Every team plays every other team exactly once. How many games are played?`, ans,
        wrong: wr(ans, [n * (n - 1), n * n, (n * (n + 1)) / 2, n - 1, ans + 1]),
        why: `The first ${kind === 'hands' ? 'friend' : 'team'} meets ${n - 1} others, the next meets ${n - 2} new ones, and so on down to 1, so add ${n - 1} + ${n - 2} + … + 1.`,
        params: { n } };
    }),
    solve(p) { let c = 0; for (let i = 0; i < p.n; i++) for (let j = i + 1; j < p.n; j++) c++; return [c]; },
  },
  {
    id: 'yc-socks-in-the-dark', bands: ['g12', 'g34'], tier: 4, topic: 'logic', strategy: 'pigeonhole',
    make: guard((r, band) => {
      const k = band === 'g12' ? int(2, 4, r) : int(3, 4, r), need = band === 'g12' ? 2 : int(3, 4, r);
      const cols = shuffle(['red', 'blue', 'green', 'yellow', 'white'], r).slice(0, k), counts = cols.map(() => int(need + 1, 8, r));
      const list = cols.map((c, i) => `${counts[i]} ${c}`), said = list.slice(0, -1).join(', ') + ' and ' + list[k - 1];
      const ans = k * (need - 1) + 1, total = counts.reduce((a, b) => a + b, 0);
      return { text: `A drawer holds ${said} socks, all mixed up. In the dark, what is the fewest socks you must take out to be sure of ${need === 2 ? 'two' : WORD[need]} socks of the same colour?`, ans,
        wrong: wr(ans, [k, need * k, total, ans - 1, Math.max(...counts) + 1, need + 1]),
        why: `In the unluckiest case you take ${need - 1} of every colour without getting ${WORD[need]} the same; the very next sock must make ${WORD[need]} of one colour.`,
        params: { counts, need } };
    }),
    solve(p) {
      let worst = 0;
      const go = (i, sum, okSoFar) => { if (i === p.counts.length) { if (okSoFar) worst = Math.max(worst, sum); return; } for (let x = 0; x <= p.counts[i]; x++) go(i + 1, sum + x, okSoFar && x < p.need); };
      go(0, 0, true); return [worst + 1];
    },
  },
  {
    id: 'yc-walk-round-the-wall', bands: ['g12', 'g34'], tier: 4, topic: 'geometry', strategy: 'grid-paths',
    make: guard((r, band) => {
      const cols = band === 'g12' ? 6 : 8, rows = band === 'g12' ? 4 : 5, nw = band === 'g12' ? 1 : 2;
      const wc = nw === 1 ? [int(2, cols - 3, r)] : [int(1, 3, r), int(5, cols - 2, r)], gaps = wc.map(() => int(0, rows - 1, r));
      const A = [int(0, wc[0] - 1, r), int(0, rows - 1, r)], B = [int(wc[wc.length - 1] + 1, cols - 1, r), int(0, rows - 1, r)];
      const wall = new Set(); wc.forEach((c, i) => { for (let y = 0; y < rows; y++) if (y !== gaps[i]) wall.add(c + ',' + y); });
      let ans = 0, at = A; for (let i = 0; i < wc.length; i++) { ans += Math.abs(at[0] - wc[i]) + Math.abs(at[1] - gaps[i]); at = [wc[i], gaps[i]]; } ans += Math.abs(at[0] - B[0]) + Math.abs(at[1] - B[1]);
      if (ans === Math.abs(A[0] - B[0]) + Math.abs(A[1] - B[1])) return null; // the wall must matter
      const u = 34, o = 6; let s = cells(cols, rows, u, o, o, (y, x) => (wall.has(x + ',' + y) ? 'dg-fill3' : 'dg-blank'));
      s += T(o + A[0] * u + u / 2, o + A[1] * u + u / 2 + 6, 'A', 'dg-accent') + T(o + B[0] * u + u / 2, o + B[1] * u + u / 2 + 6, 'B', 'dg-accent');
      return { text: 'A robot moves from square A to square B. Each step takes it to a square next door (not diagonally), and it cannot go through the dark wall squares. What is the fewest steps it needs?', ans,
        wrong: wr(ans, [Math.abs(A[0] - B[0]) + Math.abs(A[1] - B[1]), ans + 2, ans - 1, ans + 1, ans - 2]),
        why: 'The robot must pass through each gap in the wall, so find the shortest way to the gap, then from the gap onward, and add.',
        fig: svg(cols * u + 2 * o, rows * u + 2 * o, s, 'A grid with wall squares and two squares marked A and B'), params: { cols, rows, wall: [...wall], A, B } };
    }),
    solve(p) {
      const wall = new Set(p.wall), key = (x, y) => x + ',' + y, dist = new Map([[key(...p.A), 0]]), q = [p.A];
      while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = key(nx, ny); if (nx < 0 || ny < 0 || nx >= p.cols || ny >= p.rows || wall.has(k) || dist.has(k)) continue; dist.set(k, dist.get(key(x, y)) + 1); q.push([nx, ny]); } }
      return dist.has(key(...p.B)) ? [dist.get(key(...p.B))] : [];
    },
  },
  {
    id: 'yc-mirror-the-picture', bands: ['g12', 'g34'], tier: 4, topic: 'geometry', strategy: 'list-systematically',
    make: guard((r, band) => {
      const half = band === 'g12' ? int(2, 3, r) : int(3, 4, r), w = 2 * half, h = band === 'g12' ? int(3, 4, r) : int(4, 5, r);
      const sh = new Set(); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (r() < 0.32) sh.add(x + ',' + y);
      let ans = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!sh.has(x + ',' + y) && sh.has((w - 1 - x) + ',' + y)) ans++;
      if (ans < 2) return null;
      const u = 30, o = 8; let s = cells(w, h, u, o, o, (y, x) => (sh.has(x + ',' + y) ? 'dg-fill1' : 'dg-blank'));
      s += line(o + half * u, 2, o + half * u, h * u + 2 * o - 2, 'dg-hand2', ' stroke-dasharray="7 5"');
      return { text: 'Some squares are shaded. What is the fewest extra squares you must shade so the picture is the same on both sides of the dashed line?', ans,
        wrong: wr(ans, [sh.size, 2 * ans, w * h - sh.size, ans + 1, ans - 1]),
        why: 'Look at each shaded square and its mirror square across the line: wherever only one of the pair is shaded, the other one needs shading.',
        fig: svg(w * u + 2 * o, h * u + 2 * o, s, 'A grid with shaded squares and a dashed mirror line'), params: { w, h, shaded: [...sh] } };
    }),
    solve(p) { const s = new Set(p.shaded), all = new Set(p.shaded); for (const k of p.shaded) { const [x, y] = k.split(',').map(Number); all.add((p.w - 1 - x) + ',' + y); } return [all.size - s.size]; },
  },
  {
    id: 'yc-ages-together', bands: ['g12', 'g34'], tier: 4, topic: 'number', strategy: 'age-problems',
    make: guard((r, band) => {
      const [x, y] = two(r), d = int(1, 6, r);
      if (band === 'g12') {
        const a = int(2, 9, r), s = 2 * a + d, ans = a + d;
        return { text: `${x} and ${y} have ages that add up to ${s}. ${y} is ${d} years older than ${x}. How old is ${y}?`, ans,
          wrong: wr(ans, [a, Math.floor(s / 2), s - d, ans + 1, Math.ceil(s / 2) + d]),
          why: `Take the ${d} extra years away: what is left is two equal ages, one each. Then add the ${d} back for ${y}.`, params: { s, d, k: 0, ask: 'old' } };
      }
      const a = int(5, 40, r), k = int(2, 10, r), s = 2 * a + d + 2 * k, ans = a;
      return { text: `In ${k} years' time, the ages of ${x} and ${y} will add up to ${s}. ${y} is ${d} years older than ${x}. How old is ${x} now?`, ans,
        wrong: wr(ans, [a + k, Math.floor((s - d) / 2), Math.floor((s - k - d) / 2), a + d, ans - k]),
        why: `In ${k} years both will be ${k} older, so today their ages add to ${2 * k} less. Then take away ${y}'s extra ${d} and halve.`, params: { s, d, k, ask: 'young' } };
    }),
    solve(p) { const out = []; for (let x = 0; x < 200; x++) { const y = x + p.d; if (x + p.k + y + p.k === p.s) out.push(p.ask === 'old' ? y : x); } return out; },
  },
  {
    id: 'yc-date-in-month', bands: ['g12', 'g34'], tier: 4, topic: 'measure', strategy: 'calendar-days',
    make: guard((r, band) => {
      const d0 = int(0, 6, r);
      if (band === 'g12') {
        const D = int(8, 28, r), i = (d0 + D - 1) % 7, ans = DAYS[i];
        return { text: `The 1st of the month is a ${DAYS[d0]}. What day of the week is the ${ord(D)}?`, ans,
          wrong: ws(ans, [DAYS[(i + 1) % 7], DAYS[(i + 6) % 7], DAYS[(d0 + D) % 7]], DAYS),
          why: `The 8th, 15th, 22nd and 29th are all ${DAYS[d0]}s, one week apart; count on from the nearest one.`, params: { d0, ask: 'day', D } };
      }
      const W = int(0, 6, r), k = int(2, 4, r), first = 1 + ((W - d0 + 7) % 7), ans = first + 7 * (k - 1);
      return { text: `The 1st of the month is a ${DAYS[d0]}. On what date is the ${['', 'first', 'second', 'third', 'fourth'][k]} ${DAYS[W]} of the month?`, ans,
        wrong: wr(ans, [ans + 7, ans - 7, ans + 1, ans - 1, 7 * k]),
        why: `Find the first ${DAYS[W]} by counting on from the 1st, then add 7 for each week after it.`, params: { d0, ask: 'date', W, k } };
    }),
    solve(p) {
      let wd = p.d0, seen = 0;
      for (let date = 1; date <= 31; date++) { if (p.ask === 'day' && date === p.D) return [DAYS[wd]]; if (p.ask === 'date' && wd === p.W && ++seen === p.k) return [date]; wd = (wd + 1) % 7; }
      return [];
    },
  },
  {
    id: 'yc-squares-in-a-grid', bands: ['g12', 'g34'], tier: 4, topic: 'counting', strategy: 'count-rectangles',
    make: guard((r, band) => {
      const [w, h] = band === 'g12' ? pick([[2, 2], [3, 2], [4, 2], [3, 3]], r) : [int(3, 5, r), int(3, 5, r)];
      let ans = 0; for (let s = 1; s <= Math.min(w, h); s++) ans += (w - s + 1) * (h - s + 1);
      const u = 34, o = 6;
      return { text: 'How many squares of any size can you find in this picture? (Count the small ones and the bigger ones made of small squares.)', ans,
        wrong: wr(ans, [w * h, w * h + 1, ans - 1, ans + Math.min(w, h), ans + 2]),
        why: 'Count the squares of each size separately — all the 1-by-1 squares, then all the 2-by-2, and so on — then add.',
        fig: svg(w * u + 2 * o, h * u + 2 * o, cells(w, h, u, o, o, () => 'dg-blank'), 'A grid of small squares'), params: { w, h } };
    }),
    solve(p) { let c = 0; for (let x1 = 0; x1 <= p.w; x1++) for (let y1 = 0; y1 <= p.h; y1++) for (let x2 = x1 + 1; x2 <= p.w; x2++) for (let y2 = y1 + 1; y2 <= p.h; y2++) if (x2 - x1 === y2 - y1) c++; return [c]; },
  },
  {
    id: 'yc-ways-to-pay', bands: ['g12', 'g34'], tier: 4, topic: 'counting', strategy: 'list-systematically',
    make: guard((r, band) => {
      const coins = band === 'g12' ? pick([[2, 5], [1, 2]], r) : pick([[1, 2, 5], [2, 5, 10]], r);
      const A = band === 'g12' ? (coins[0] === 1 ? int(6, 12, r) : int(10, 24, r)) : (coins[0] === 1 ? int(10, 20, r) : int(20, 40, r));
      const ways = Array(A + 1).fill(0); ways[0] = 1; for (const c of coins) for (let v = c; v <= A; v++) ways[v] += ways[v - c];
      const ans = ways[A]; if (ans < 2) return null;
      const said = coins.slice(0, -1).join(', ') + ' and ' + coins[coins.length - 1];
      return { text: `Coins come in ${said}. In how many different ways can you pay exactly ${A} using these coins? (The order of the coins does not matter.)`, ans,
        wrong: wr(ans, [ans + 1, ans - 1, Math.floor(A / coins[coins.length - 1]), ans + 2, Math.floor(A / 2)]),
        why: `List the ways in order: start with as many ${coins[coins.length - 1]}s as fit, then one fewer each time, and see what the smaller coins can make.`, params: { coins, A } };
    }),
    solve(p) {
      let c = 0; const go = (i, left) => { if (i === p.coins.length) { if (left === 0) c++; return; } for (let n = 0; n * p.coins[i] <= left; n++) go(i + 1, left - n * p.coins[i]); };
      go(0, p.A); return [c];
    },
  },
  {
    id: 'yc-balance-chain', bands: ['g12', 'g34'], tier: 4, topic: 'logic', strategy: 'bar-model',
    make: guard((r, band) => {
      const links = band === 'g12' ? 2 : 3, chain = ['plum', 'pear', 'melon', 'pumpkin'].slice(0, links + 1);
      const mult = Array.from({ length: links }, () => (band === 'g12' ? int(2, 4, r) : int(2, 5, r)));
      const ans = mult.reduce((a, b) => a * b, 1); if (ans >= (band === 'g12' ? 20 : 100)) return null;
      const clues = mult.map((m, i) => `One ${chain[i + 1]} weighs the same as ${m} ${chain[i]}s.`).reverse().join(' ');
      return { text: `${clues} How many ${chain[0]}s weigh the same as one ${chain[links]}?`, ans,
        wrong: wr(ans, [mult.reduce((a, b) => a + b, 0), ans - mult[0], ans + mult[links - 1], mult[links - 1], ans + 1]),
        why: `Swap each fruit for the smaller ones it equals, one step at a time, until only ${chain[0]}s are left.`, params: { mult } };
    }),
    solve(p) {
      // weigh everything in plums by repeated adding, then count plums onto the other pan until it balances
      let w = 1; for (const m of p.mult) { let n = 0; for (let i = 0; i < m; i++) n += w; w = n; }
      const out = []; for (let k = 1; k < 1000; k++) if (k === w) out.push(k); return out;
    },
  },
  {
    id: 'yc-nth-shape', bands: ['g12', 'g34'], tier: 4, topic: 'patterns', strategy: 'find-the-rule',
    make: guard((r, band) => {
      const L = band === 'g12' ? int(2, 3, r) : int(3, 4, r), cyc = shuffle(SHAPES, r).slice(0, L), N = band === 'g12' ? int(8, 20, r) : int(25, 99, r);
      if (N <= 2 * L) return null;
      const ans = cyc[(N - 1) % L];
      let s = ''; for (let i = 0; i < 2 * L; i++) s += shapeAt(cyc[i % L], 24 + i * 44, 28, 15, ['dg-fill1', 'dg-fill2', 'dg-fill3'][SHAPES.indexOf(cyc[i % L]) % 3]);
      s += T(24 + 2 * L * 44, 34, '…', 'dg-big');
      return { text: `The shapes repeat in the same order, again and again. What is the ${ord(N)} shape?`, ans,
        wrong: ws(ans, [cyc[N % L], cyc[(N + L - 2) % L]], SHAPES),
        why: `The pattern repeats every ${L} shapes, so skip whole groups of ${L} and look at where the ${ord(N)} shape falls in its group.`,
        fig: svg(2 * L * 44 + 50, 56, s, 'A repeating pattern of shapes'), params: { cyc, N } };
    }),
    solve(p) { const seq = []; while (seq.length < p.N) for (const s of p.cyc) seq.push(s); return [seq[p.N - 1]]; },
  },
  {
    id: 'yc-write-the-digit', bands: ['g12', 'g34'], tier: 4, topic: 'counting', strategy: 'digit-puzzles',
    make: guard((r, band) => {
      const d = int(1, 9, r), N = band === 'g12' ? int(20, 60, r) : int(60, 200, r);
      let ans = 0, nums = 0; for (let n = 1; n <= N; n++) { const c = (n % 10 === d) + (n >= 10 && Math.floor(n / 10) % 10 === d) + (n >= 100 && Math.floor(n / 100) === d); ans += c; nums += c > 0; }
      if (ans < 2) return null;
      const [x] = two(r);
      return { text: `${x} writes all the numbers from 1 to ${N}. How many times does ${x} write the digit ${d}?`, ans,
        wrong: wr(ans, [nums, Math.floor(N / 10), ans + 10, ans + 1, ans - 1]),
        why: `Count the ${d}s in the ones place first (one in every ten), then the ${d}s in the tens place, and add them.`, params: { d, N } };
    }),
    solve(p) { let c = 0; for (let n = 1; n <= p.N; n++) for (const ch of String(n)) if (ch === String(p.d)) c++; return [c]; },
  },
  {
    id: 'yc-teams-left-over', bands: ['g12', 'g34'], tier: 4, topic: 'number', strategy: 'remainder-puzzles',
    make: guard((r, band) => {
      const t = band === 'g12' ? int(2, 5, r) : int(4, 12, r), c = band === 'g12' ? int(7, 30, r) : int(30, 300, r);
      if (c % t === 0) return null; const ans = t - (c % t);
      return { text: `${c} children want to play in teams of ${t}. How many more children are needed so that every child is in a full team?`, ans,
        wrong: wr(ans, [c % t, t, Math.floor(c / t), ans + 1, ans - 1]),
        why: `Make as many full teams of ${t} as you can; the children left over need enough friends to fill one more team.`, params: { c, t } };
    }),
    solve(p) { for (let k = 0; k < 1000; k++) { let left = p.c + k; while (left >= p.t) left -= p.t; if (left === 0) return [k]; } return []; },
  },
  {
    id: 'yc-staircase-perimeter', bands: ['g12', 'g34'], tier: 4, topic: 'geometry', strategy: 'staircase-perimeter',
    make: guard((r, band) => {
      const n = band === 'g12' ? int(2, 6, r) : int(3, 6, r), sw = band === 'g12' ? 1 : int(1, 4, r), sh = band === 'g12' ? 1 : int(1, 4, r);
      if (band === 'g34' && sw === sh) return null;
      const ans = 2 * n * (sw + sh), u = band === 'g12' ? 28 : 14, H = n * sh * u + 30;
      let s = ''; for (let i = 0; i < n; i++) s += `<rect x="${20 + i * sw * u}" y="${H - 10 - (i + 1) * sh * u}" width="${sw * u}" height="${(i + 1) * sh * u}" class="dg-fill2"/>`;
      if (band === 'g12') s += T(20 + u / 2, H + 6, '1 cm', 'dg-small'); else s += T(20 + (sw * u) / 2, H + 6, `${sw} cm`, 'dg-small') + T(14, H - 10 - (sh * u) / 2 + 4, `${sh} cm`, 'dg-small', 'end');
      const area = band === 'g12' ? (n * (n + 1)) / 2 : (sw * sh * n * (n + 1)) / 2;
      return { text: band === 'g12' ? `This staircase is made of squares with sides of 1 cm. What is the distance all the way around its outside (its perimeter), in cm?` : `This staircase has ${n} steps. Each step is ${sw} cm wide and ${sh} cm high. What is the perimeter of the whole shape, in cm?`, ans,
        wrong: wr(ans, [area, ans - 2, ans + 4, n * (sw + sh), ans + 2 * n]),
        why: 'Slide the little step edges outwards: the steps going up add up to the full height, and the steps going across add up to the full width, so the perimeter is the same as a rectangle round it.',
        fig: svg(n * sw * u + 40, H + 14, s, 'A staircase shape'), params: { n, sw, sh } };
    }),
    solve(p) {
      const c = []; for (let i = 0; i < p.n; i++) for (let x = i * p.sw; x < (i + 1) * p.sw; x++) for (let y = 0; y < (i + 1) * p.sh; y++) c.push([x, y]);
      let per = 0; for (const v of edgesOf(c).values()) if (v === 1) per++; return [per];
    },
  },
  {
    id: 'yc-cats-and-dogs-club', bands: ['g12', 'g34'], tier: 4, topic: 'logic', strategy: 'overlapping-groups',
    make: guard((r, band) => {
      const both = band === 'g12' ? int(1, 5, r) : int(3, 20, r), oa = band === 'g12' ? int(2, 8, r) : int(5, 30, r), ob = band === 'g12' ? int(2, 8, r) : int(5, 30, r);
      const a = oa + both, b = ob + both, n = oa + ob + both;
      if (band === 'g12') {
        const ans = n;
        return { text: `In a class, every child likes cats or dogs or both. ${a} children like cats, ${b} like dogs, and ${both} of them like both. How many children are in the class?`, ans,
          wrong: wr(ans, [a + b, a + b + both, a + b - 2 * both, ans + 1]), why: `Adding ${a} and ${b} counts the ${both} who like both twice, so take them away once.`, params: { a, b, both, ask: 'n' } };
      }
      const ans = both;
      return { text: `There are ${n} children in a class. Every child likes cats or dogs or both. ${a} like cats and ${b} like dogs. How many like both?`, ans,
        wrong: wr(ans, [a + b - n + 1, n - a, n - b, Math.abs(a - b), 2 * ans]), why: `${a} + ${b} is more than ${n} because the children who like both were counted twice; the extra is exactly them.`, params: { a, b, n, ask: 'both' } };
    }),
    solve(p) {
      const out = [];
      for (let oa = 0; oa <= p.a; oa++) { const both = p.a - oa, ob = p.b - both; if (ob < 0) continue;
        if (p.ask === 'n' && both === p.both) out.push(oa + ob + both);
        if (p.ask === 'both' && oa + ob + both === p.n) out.push(both); }
      return uniq(out);
    },
  },
  {
    id: 'yc-think-of-a-number', bands: ['g12', 'g34'], tier: 4, topic: 'number', strategy: 'work-backwards',
    make: guard((r, band) => {
      const steps = band === 'g12' ? 2 : 3, x = band === 'g12' ? int(2, 15, r) : int(3, 40, r);
      const ops = []; let v = x;
      for (let i = 0; i < steps; i++) {
        const kind = pick(band === 'g12' ? ['add', 'sub', 'double'] : ['add', 'sub', 'double', 'triple', 'half'], r);
        const k = band === 'g12' ? int(2, 9, r) : int(3, 25, r);
        if (kind === 'sub' && v - k < 1) return null; if (kind === 'half' && v % 2) return null;
        ops.push([kind, k]); v = { add: v + k, sub: v - k, double: 2 * v, triple: 3 * v, half: v / 2 }[kind];
      }
      if (v >= (band === 'g12' ? 60 : 900) || ops.every(([k]) => k === 'add' || k === 'sub')) return null;
      if (ops.some(([k], i) => i && (k === ops[i - 1][0] || (k === 'half' && ops[i - 1][0] === 'double') || (k === 'double' && ops[i - 1][0] === 'half')))) return null;
      const say = { add: (k) => `add ${k}`, sub: (k) => `take away ${k}`, double: () => 'double it', triple: () => 'multiply by 3', half: () => 'halve it' };
      const words = ops.map(([k, n]) => say[k](n)), ans = x;
      return { text: `I think of a number. I ${words.slice(0, -1).join(', then ')}, then ${words[words.length - 1]}. The answer is ${v}. What number did I think of?`, ans,
        wrong: wr(ans, [v, Math.floor(v / 2), ans * 2, ans + 1, ans - 1, v - ops[0][1]]),
        why: 'Work backwards from the answer, undoing the last step first: adding is undone by taking away, doubling by halving.', params: { ops, v } };
    }),
    solve(p) {
      const out = [];
      for (let x = 0; x < 1000; x++) { let v = x; for (const [k, n] of p.ops) v = { add: v + n, sub: v - n, double: v + v, triple: v + v + v, half: v / 2 }[k]; if (v === p.v) out.push(x); }
      return out;
    },
  },
  {
    id: 'yc-snails-meet', bands: ['g12', 'g34'], tier: 4, topic: 'measure', strategy: 'meeting-and-overtaking',
    make: guard((r, band) => {
      const kind = band === 'g12' ? 'toward' : pick(['toward', 'chase'], r);
      const u = band === 'g12' ? int(1, 3, r) : int(2, 9, r), v = band === 'g12' ? int(1, 3, r) : int(2, 9, r);
      const gap = kind === 'toward' ? u + v : v - u; if (gap < 1) return null;
      const ans = band === 'g12' ? int(2, 6, r) : int(3, 30, r), D = ans * gap;
      return { text: kind === 'toward' ? `Two snails are ${D} metres apart and crawl straight towards each other. One crawls ${u} m every minute and the other ${v} m every minute. After how many minutes do they meet?` : `A dog is ${D} metres behind a cat. The cat runs ${u} m every second and the dog runs ${v} m every second, along the same path. After how many seconds does the dog catch up?`, ans,
        wrong: wr(ans, [Math.floor(D / u), Math.floor(D / v), kind === 'toward' ? Math.floor(D / Math.max(1, v - u)) : Math.floor(D / (u + v)), ans + 1, ans - 1]),
        why: kind === 'toward' ? `Together they close the gap by ${u} + ${v} metres each minute, so count how many of those fit into ${D}.` : `Each second the dog gains ${v} − ${u} metres on the cat, so count how many of those fit into the ${D} metre gap.`,
        params: { kind, D, u, v } };
    }),
    solve(p) { let a = 0, b = p.D; for (let t = 1; t < 1000; t++) { if (p.kind === 'toward') { a += p.u; b -= p.v; } else { a += p.v; b += p.u; } if (a >= b) return a === b ? [t] : []; } return []; },
  },
  {
    id: 'yc-fence-posts', bands: ['g12', 'g34'], tier: 4, topic: 'measure', strategy: 'simpler-case',
    make: guard((r, band) => {
      const kind = band === 'g12' ? 'line' : pick(['line', 'square'], r), s = band === 'g12' ? int(2, 5, r) : int(2, 10, r);
      if (kind === 'line') {
        const L = s * (band === 'g12' ? int(3, 8, r) : int(5, 40, r)), ans = L / s + 1;
        return { text: `A straight fence is ${L} metres long. It has a post every ${s} metres, with a post at each end. How many posts are there?`, ans,
          wrong: wr(ans, [L / s, L / s + 2, ans + 1, ans - 2]), why: 'Count the gaps between posts first; a straight fence always has one more post than gaps.', params: { kind, L, s } };
      }
      const a = s * int(2, 12, r), ans = (4 * a) / s;
      return { text: `A square garden has sides ${a} metres long. A fence goes all the way round with a post every ${s} metres, and one post at each corner. How many posts are there?`, ans,
        wrong: wr(ans, [ans + 4, ans + 1, (4 * a) / s - 4, a / s + 1, 4 * (a / s + 1)]), why: 'When the fence goes all the way round and joins up, the number of posts is the same as the number of gaps.', params: { kind, a, s } };
    }),
    solve(p) {
      if (p.kind === 'line') { let c = 0; for (let x = 0; x <= p.L; x++) if (x % p.s === 0) c++; return [c]; }
      const pts = new Set(); for (let x = 0; x <= p.a; x++) for (let y = 0; y <= p.a; y++) if ((x === 0 || y === 0 || x === p.a || y === p.a) && ((x % p.s === 0 && (y === 0 || y === p.a)) || (y % p.s === 0 && (x === 0 || x === p.a)))) pts.add(x + ',' + y);
      return [pts.size];
    },
  },
];

/* =================================================================== TIER 5 */

const T5 = [
  {
    id: 'yc-snail-in-the-well', bands: ['g12', 'g34'], tier: 5, topic: 'number', strategy: 'simpler-case',
    make: guard((r, band) => {
      const u = band === 'g12' ? int(2, 4, r) : int(3, 9, r), d = int(1, u - 1, r), h = band === 'g12' ? int(u + 2, 14, r) : int(u + 6, 50, r);
      const ans = Math.ceil((h - u) / (u - d)) + 1;
      return { text: `A snail is at the bottom of a well ${h} metres deep. Every day it climbs up ${u} metres, but every night it slides back ${d} metre${d > 1 ? 's' : ''}. On which day does it first reach the top?`, ans,
        wrong: wr(ans, [Math.ceil(h / (u - d)), Math.floor(h / (u - d)), Math.ceil(h / u), ans + 1, ans - 1]),
        why: `Each full day and night it gains ${u - d} metre${u - d > 1 ? 's' : ''}, but on the last day it climbs out before it can slide, so look for the day it starts within ${u} metres of the top.`,
        params: { h, u, d } };
    }),
    solve(p) { let at = 0; for (let day = 1; day < 1000; day++) { at += p.u; if (at >= p.h) return [day]; at -= p.d; } return []; },
  },
  {
    id: 'yc-truth-island', bands: ['g34'], tier: 5, topic: 'logic', strategy: 'truth-tellers',
    make: guard((r) => {
      const names = shuffle(NAMES, r).slice(0, 5), n = 5, KW = ['None of us is a liar', 'Exactly one of us is a liar', 'Exactly two of us are liars', 'Exactly three of us are liars', 'Exactly four of us are liars'];
      const st = names.map((_, i) => { const t = pick(['liar', 'truth', 'count'], r); if (t === 'count') return { t, k: int(0, 4, r) }; let w; do w = int(0, n - 1, r); while (w === i); return { t, w }; });
      // make: try every way to label the five, keeping the labellings where each statement is true exactly for truth-tellers
      const fits = []; const go = (i, lab) => { if (i === n) { const liars = lab.filter((x) => !x).length;
        if (lab.every((tt, j) => { const s = st[j], said = s.t === 'liar' ? !lab[s.w] : s.t === 'truth' ? lab[s.w] : liars === s.k; return said === tt; })) fits.push(lab.slice()); return; }
        for (const v of [true, false]) { lab.push(v); go(i + 1, lab); lab.pop(); } };
      go(0, []); if (fits.length !== 1) return null;
      const ans = fits[0].filter(Boolean).length;
      const said = st.map((s, i) => `${names[i]}: "${s.t === 'liar' ? `${names[s.w]} is a liar.` : s.t === 'truth' ? `${names[s.w]} tells the truth.` : KW[s.k] + '.'}"`).join(' ');
      return { text: `On Truth Island everyone is either a truth-teller, who always tells the truth, or a liar, who always lies. Five islanders say: ${said} How many of the five are truth-tellers?`, ans,
        wrong: wr(ans, [0, 1, 2, 3, 4, 5]),
        why: 'Try one person as a truth-teller and follow what that forces for the others; if you reach a contradiction, they must be a liar instead.', params: { st } };
    }),
    solve(p) {
      const out = [];
      for (let m = 0; m < 32; m++) { const tt = (j) => ((m >> j) & 1) === 1; let liars = 0; for (let j = 0; j < 5; j++) if (!tt(j)) liars++;
        let ok = true; for (let j = 0; j < 5; j++) { const s = p.st[j]; const truth = s.t === 'liar' ? !tt(s.w) : s.t === 'truth' ? tt(s.w) : liars === s.k; if (truth !== tt(j)) ok = false; }
        if (ok) out.push(5 - liars); }
      return out;
    },
  },
  {
    id: 'yc-painted-cube', bands: ['g34'], tier: 5, topic: 'geometry', strategy: 'painted-cubes',
    make: guard((r) => {
      const n = int(3, 5, r), k = int(0, 3, r), c = n - 2;
      const by = [c * c * c, 6 * c * c, 12 * c, 8], ans = by[k];
      return { text: `A big cube is built from ${n * n * n} small cubes, ${n} along each edge. The outside of the big cube is painted red. Then it is taken apart. How many small cubes have ${k === 0 ? 'no painted faces at all' : `exactly ${WORD[k]} painted face${k > 1 ? 's' : ''}`}?`, ans,
        wrong: wr(ans, [...by, 6 * n * n, n * n, ans + 1]),
        why: k === 3 ? 'Only the corner cubes have three painted faces, and a cube has 8 corners.' : k === 2 ? `Two painted faces means on an edge but not a corner: each of the 12 edges has ${c} of them.` : k === 1 ? `One painted face means in the middle of a face: each of the 6 faces has a ${c} by ${c} square of them.` : `The unpainted cubes form a hidden ${c} by ${c} by ${c} cube inside.`,
        params: { n, k } };
    }),
    solve(p) { let c = 0; const e = (v) => (v === 0 || v === p.n - 1 ? 1 : 0); for (let x = 0; x < p.n; x++) for (let y = 0; y < p.n; y++) for (let z = 0; z < p.n; z++) if (e(x) + e(y) + e(z) === p.k) c++; return [c]; },
  },
  {
    id: 'yc-triangles-in-a-fan', bands: ['g12', 'g34'], tier: 5, topic: 'counting', strategy: 'count-triangles',
    make: guard((r, band) => {
      const p = band === 'g12' ? int(3, 6, r) : int(3, 5, r), h = band === 'g12' ? 0 : int(1, 2, r);
      const ans = ((p * (p - 1)) / 2) * (h + 1);
      const W = 260, top = 14, base = 170, X = (i) => 20 + (i * (W - 40)) / (p - 1); let s = '';
      for (let i = 0; i < p; i++) s += line(W / 2, top, X(i), base);
      for (let j = 1; j <= h + 1; j++) { const t = j / (h + 1), y = top + t * (base - top); s += line(W / 2 + (X(0) - W / 2) * t, y, W / 2 + (X(p - 1) - W / 2) * t, y); }
      return { text: 'How many triangles of any size can you find in this picture?', ans,
        wrong: wr(ans, [p - 1, (p - 1) * (h + 1), (p * (p - 1)) / 2, ans - 1, ans + p]),
        why: h ? 'Each across-line makes its own set of triangles with the lines from the top, so count the triangles for one across-line and multiply.' : 'Every triangle uses the top point and two of the lines from it, so count the pairs of lines.',
        fig: svg(W, base + 14, s, 'Lines from one point crossed by lines across'), params: { p, h } };
    }),
    solve(p) {
      const pts = ['A']; for (let i = 0; i < p.p; i++) for (let j = 1; j <= p.h + 1; j++) pts.push(i + ':' + j);
      const lines = []; for (let i = 0; i < p.p; i++) lines.push(new Set(['A', ...Array.from({ length: p.h + 1 }, (_, j) => i + ':' + (j + 1))]));
      for (let j = 1; j <= p.h + 1; j++) lines.push(new Set(Array.from({ length: p.p }, (_, i) => i + ':' + j)));
      const on = (a, b) => lines.some((L) => L.has(a) && L.has(b)), all3 = (a, b, c) => lines.some((L) => L.has(a) && L.has(b) && L.has(c));
      let c = 0; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) for (let k = j + 1; k < pts.length; k++) { const [a, b, d] = [pts[i], pts[j], pts[k]]; if (on(a, b) && on(b, d) && on(a, d) && !all3(a, b, d)) c++; }
      return [c];
    },
  },
  {
    id: 'yc-rectangles-in-a-strip', bands: ['g12', 'g34'], tier: 5, topic: 'counting', strategy: 'count-rectangles',
    make: guard((r, band) => {
      const w = band === 'g12' ? int(3, 6, r) : int(2, 5, r), h = band === 'g12' ? 1 : int(2, 3, r);
      const ans = ((w * (w + 1)) / 2) * ((h * (h + 1)) / 2); let sq = 0; for (let s = 1; s <= Math.min(w, h); s++) sq += (w - s + 1) * (h - s + 1);
      const u = 36, o = 6;
      return { text: 'How many rectangles of any size are in this picture? (A square counts as a rectangle too.)', ans,
        wrong: wr(ans, [w * h, sq, ans - 1, ans - w, (w * (w + 1)) / 2 + (h * (h + 1)) / 2]),
        why: h === 1 ? 'Count the rectangles that are 1 long, then 2 long, and so on, and add: the longer they are, the fewer there are.' : 'A rectangle is fixed by choosing two of the up-lines and two of the across-lines; count each choice and multiply.',
        fig: svg(w * u + 2 * o, h * u + 2 * o, cells(w, h, u, o, o, () => 'dg-blank'), 'A grid of small squares'), params: { w, h } };
    }),
    solve(p) { let c = 0; for (let x1 = 0; x1 <= p.w; x1++) for (let x2 = x1 + 1; x2 <= p.w; x2++) for (let y1 = 0; y1 <= p.h; y1++) for (let y2 = y1 + 1; y2 <= p.h; y2++) c++; return [c]; },
  },
  {
    id: 'yc-times-as-old', bands: ['g34'], tier: 5, topic: 'number', strategy: 'age-problems',
    make: guard((r) => {
      const c = int(3, 10, r), m = int(2, 4, r), n = int(1, 15, r), D = m * (c + n) - n;
      if (D - c < 20 || D > 60) return null;
      const [x] = two(r), times = ['', '', 'twice', 'three times', 'four times'][m];
      return { text: `${x}'s dad is ${D} and ${x} is ${c}. In how many years will Dad be exactly ${times} as old as ${x}?`, ans: n,
        wrong: wr(n, [D - m * c, Math.floor(D / m) - c, n + 1, n - 1, D - c]),
        why: `Try a number of years, add it to both ages, and check: the gap of ${D - c} years never changes, so when Dad is ${times} as old the gap is ${m - 1} times ${x}'s age.`,
        params: { D, c, m } };
    }),
    solve(p) { const out = []; for (let y = 0; y < 100; y++) if (p.D + y === p.m * (p.c + y)) out.push(y); return out; },
  },
  {
    id: 'yc-sum-and-difference', bands: ['g12', 'g34'], tier: 5, topic: 'number', strategy: 'guess-check-improve',
    make: guard((r, band) => {
      if (band === 'g12') {
        const a = int(1, 12, r), b = a + int(1, 9, r), s = a + b, d = b - a; if (s > 30) return null;
        return { text: `Two numbers add up to ${s}. One of them is ${d} more than the other. What is the bigger number?`, ans: b,
          wrong: wr(b, [a, Math.floor(s / 2), s - d, d, b + 1]), why: `Guess two numbers ${d} apart, check their total, and move both up or down until the total is ${s}.`, params: { kind: 'diff', s, d } };
      }
      const a = int(2, 25, r), b = int(a + 1, 30, r), s = a + b, p = a * b;
      return { text: `Two whole numbers add up to ${s} and multiply to make ${p}. What is the bigger number?`, ans: b,
        wrong: wr(b, [a, Math.floor(s / 2), b + 1, b - 1, s - 1]), why: 'Guess a pair that adds to the total, check the product, and improve: pairs further apart make a smaller product.', params: { kind: 'prod', s, p } };
    }),
    solve(p) { const out = []; for (let x = 0; x <= p.s; x++) { const y = p.s - x; if (y < x) continue; if (p.kind === 'diff' ? y - x === p.d : x * y === p.p) out.push(y); } return out; },
  },
  {
    id: 'yc-growing-dots', bands: ['g12', 'g34'], tier: 5, topic: 'patterns', strategy: 'find-the-rule',
    make: guard((r, band) => {
      const a = band === 'g12' ? int(1, 3, r) : int(1, 5, r), b = band === 'g12' ? int(1, 2, r) : int(2, 4, r), N = band === 'g12' ? int(6, 10, r) : int(10, 30, r);
      const ans = a + b * N, fig = (k) => { const d = []; for (let i = 0; i < a; i++) d.push([i, 0]); for (let y = 1; y <= b; y++) for (let x = 0; x < k; x++) d.push([x, y]); return d; };
      let s = '', ox = 10, u = 14;
      for (let k = 1; k <= 3; k++) { for (const [x, y] of fig(k)) s += `<circle cx="${ox + x * u + 6}" cy="${10 + y * u + 6}" r="5" class="${y ? 'dg-dot' : 'dg-dot2'}"/>`; s += T(ox + 10, (b + 1) * u + 30, `Figure ${k}`, 'dg-small', 'start'); ox += Math.max(a, k) * u + 60; }
      return { text: `The dot figures grow in the same way each time. How many dots are in Figure ${N}?`, ans,
        wrong: wr(ans, [b * N, ans - b, ans + b, (a + b) * N, ans + 1]),
        why: `The top row of ${a} never changes, and each figure adds ${b} more dot${b > 1 ? 's' : ''} below, so Figure ${N} has ${b} × ${N} dots below plus the ${a} on top.`,
        fig: svg(ox, (b + 1) * u + 40, s, 'Three growing dot figures'), params: { a, b, N } };
    }),
    solve(p) { let dots = []; for (let i = 0; i < p.a; i++) dots.push('top' + i); for (let k = 1; k <= p.N; k++) for (let y = 0; y < p.b; y++) dots.push(k + ',' + y); return [dots.length]; },
  },
  {
    id: 'yc-last-digit', bands: ['g34'], tier: 5, topic: 'number', strategy: 'units-digit-cycles',
    make: guard((r) => {
      const CYC = { 2: [2, 4, 8, 6], 3: [3, 9, 7, 1], 4: [4, 6], 7: [7, 9, 3, 1], 8: [8, 4, 2, 6], 9: [9, 1] };
      const b = pick([2, 3, 4, 7, 8, 9], r), n = int(10, 60, r), cyc = CYC[b], ans = cyc[(n - 1) % cyc.length];
      return { text: `${b} is multiplied by itself until there are ${n} of them: ${b} × ${b} × ${b} × … × ${b}. What is the last digit of the answer?`, ans,
        wrong: wr(ans, [...cyc, 0, 5, b].filter((v) => v < 10)),
        why: `Write the last digits of ${b}, ${b} × ${b}, ${b} × ${b} × ${b} and so on: they repeat in a cycle of ${cyc.length}, so find where number ${n} lands in the cycle.`, params: { b, n } };
    }),
    solve(p) { let d = 1; for (let i = 0; i < p.n; i++) d = (d * p.b) % 10; return [d]; },
  },
  {
    id: 'yc-sure-of-each-colour', bands: ['g12', 'g34'], tier: 5, topic: 'logic', strategy: 'worst-case',
    make: guard((r, band) => {
      const k = band === 'g12' ? 2 : 3, cols = ['red', 'blue', 'green'].slice(0, k), counts = cols.map(() => (band === 'g12' ? int(2, 9, r) : int(2, 12, r)));
      const ask = band === 'g12' ? pick(['each', 'reds'], r) : pick(['each', 'reds'], r), need = ask === 'reds' ? (band === 'g12' ? 2 : int(2, 4, r)) : 1;
      if (ask === 'reds' && counts[0] < need) return null;
      const total = counts.reduce((a, b) => a + b, 0);
      const ans = ask === 'each' ? total - Math.min(...counts) + 1 : total - counts[0] + need;
      if (new Set(counts).size < k) return null;
      const said = cols.map((c, i) => `${counts[i]} ${c}`); const list = said.slice(0, -1).join(', ') + ' and ' + said[k - 1];
      return { text: `A bag holds ${list} balls. Without looking, what is the fewest balls you must take out to be sure of getting ${ask === 'each' ? 'at least one ball of every colour' : `at least ${WORD[need]} red ball${need > 1 ? 's' : ''}`}?`, ans,
        wrong: wr(ans, [k + 1, total, ans - 1, Math.max(...counts) + 1, need + 1, counts[0] + 1]),
        why: ask === 'each' ? 'Imagine the unluckiest draw: every ball of the two biggest colours comes out first, and only then the missing colour.' : 'Imagine the unluckiest draw: every ball that is not red comes out first, then the reds you need.',
        params: { counts, ask, need } };
    }),
    solve(p) {
      let worst = 0;
      const go = (i, pick2) => { if (i === p.counts.length) { const bad = p.ask === 'each' ? pick2.some((x) => x === 0) : pick2[0] < p.need; if (bad) worst = Math.max(worst, pick2.reduce((a, b) => a + b, 0)); return; }
        for (let x = 0; x <= p.counts[i]; x++) go(i + 1, pick2.concat(x)); };
      go(0, []); return [worst + 1];
    },
  },
  {
    id: 'yc-shortest-routes', bands: ['g12', 'g34'], tier: 5, topic: 'counting', strategy: 'grid-paths',
    make: guard((r, band) => {
      const [w, h] = band === 'g12' ? pick([[1, 3], [2, 2], [2, 3], [3, 2], [1, 4], [3, 3]], r) : [int(3, 5, r), int(2, 4, r)];
      const puddle = band === 'g34' && r() < 0.6 ? [int(1, w - 1, r), int(1, h - 1, r)] : null;
      const N = []; for (let x = 0; x <= w; x++) { N.push([]); for (let y = 0; y <= h; y++) N[x][y] = puddle && x === puddle[0] && y === puddle[1] ? 0 : x === 0 && y === 0 ? 1 : (x ? N[x - 1][y] : 0) + (y ? N[x][y - 1] : 0); }
      const ans = N[w][h]; let full = 1; for (let i = 1; i <= h; i++) full = (full * (w + i)) / i;
      const u = 44, o = 22; let s = lattice(w, h, u, o, o);
      s += `<circle cx="${o}" cy="${o + h * u}" r="6" class="dg-dot"/>` + T(o - 10, o + h * u + 18, 'A', 'dg-accent') + `<circle cx="${o + w * u}" cy="${o}" r="6" class="dg-dot"/>` + T(o + w * u + 12, o - 8, 'B', 'dg-accent');
      if (puddle) s += `<circle cx="${o + puddle[0] * u}" cy="${o + (h - puddle[1]) * u}" r="11" class="dg-fill3"/>`;
      return { text: `Walking only along the lines, and always going right or up, how many different shortest routes are there from A to B${puddle ? ' that do not go through the puddle' : ''}?`, ans,
        wrong: wr(ans, [w + h, w * h, puddle ? full : ans + 2, ans - 1, ans + 1, 2 * (w + h)]),
        why: 'Write at each crossing how many ways there are to reach it: it is the number from the left plus the number from below. Work across to B.',
        fig: svg(w * u + 2 * o + 16, h * u + 2 * o + 10, s, 'A street grid from A to B'), params: { w, h, puddle } };
    }),
    solve(p) {
      let c = 0;
      for (let m = 0; m < 1 << (p.w + p.h); m++) { let ones = 0; for (let i = 0; i < p.w + p.h; i++) if ((m >> i) & 1) ones++; if (ones !== p.w) continue;
        let x = 0, y = 0, ok = true; for (let i = 0; i < p.w + p.h; i++) { if ((m >> i) & 1) x++; else y++; if (p.puddle && x === p.puddle[0] && y === p.puddle[1]) ok = false; } if (ok) c++; }
      return [c];
    },
  },
  {
    id: 'yc-five-of-a-day', bands: ['g34'], tier: 5, topic: 'logic', strategy: 'calendar-days',
    make: guard((r) => {
      const len = pick([29, 30, 31], r), s = int(0, 6, r), count = (st, w) => { let c = 0; for (let d = 0; d < len; d++) if ((st + d) % 7 === w) c++; return c; };
      const five = DAYS.map((_, w) => w).filter((w) => count(s, w) === 5), four = DAYS.map((_, w) => w).filter((w) => count(s, w) === 4);
      const w1 = pick(five, r), w2 = pick(four, r);
      const starts = [0, 1, 2, 3, 4, 5, 6].filter((st) => count(st, w1) === 5 && count(st, w2) === 4); if (starts.length !== 1) return null;
      const ans = DAYS[s];
      return { text: `A month has ${len} days. It has five ${DAYS[w1]}s but only four ${DAYS[w2]}s. On what day of the week does the month begin?`, ans,
        wrong: ws(ans, [DAYS[w1], DAYS[w2], DAYS[(s + 1) % 7], DAYS[(s + 6) % 7]], DAYS),
        why: `${len} days is 4 whole weeks and ${len - 28} extra day${len > 29 ? 's' : ''}; only the days at the very start of the month get a fifth turn, so line those up with the clue.`,
        params: { len, w1, w2 } };
    }),
    solve(p) { const out = []; for (let st = 0; st < 7; st++) { let a = 0, b = 0, d = st; for (let i = 0; i < p.len; i++) { if (d === p.w1) a++; if (d === p.w2) b++; d = (d + 1) % 7; } if (a === 5 && b === 4) out.push(DAYS[st]); } return out; },
  },
  {
    id: 'yc-missing-digits', bands: ['g12', 'g34'], tier: 5, topic: 'number', strategy: 'digit-puzzles',
    make: guard((r, band) => {
      // pattern: each number is a list of digits or null for a box
      let A, B;
      if (band === 'g12') { A = [int(1, 6, r), null]; B = [null, int(0, 9, r)]; }
      else { A = [int(1, 5, r), null, int(0, 9, r)]; B = [null, int(0, 9, r), null]; }
      const fill = { A: A.map((d) => (d === null ? int(0, 9, r) : d)), B: B.map((d, i) => (d === null ? int(i === 0 ? 1 : 0, 9, r) : d)) };
      const num = (a) => a.reduce((t, d) => t * 10 + d, 0), S = num(fill.A) + num(fill.B);
      if (S >= (band === 'g12' ? 100 : 1000)) return null;
      const ans = A.reduce((t, d, i) => t + (d === null ? fill.A[i] : 0), 0) + B.reduce((t, d, i) => t + (d === null ? fill.B[i] : 0), 0);
      const show = (a) => a.map((d) => (d === null ? '□' : d)).join('');
      return { text: `In the sum ${show(A)} + ${show(B)} = ${S}, each box hides one digit (the boxes can hide different digits). What do all the hidden digits add up to?`, ans,
        wrong: wr(ans, [ans + 1, ans - 1, ans + 10, ans - 9, S % 10, ans + 2]),
        why: 'Start with the ones place: it tells you a box straight away (watch for a carry), then move to the tens.', params: { A, B, S } };
    }),
    solve(p) {
      const boxes = [...p.A, ...p.B].filter((d) => d === null).length, out = [];
      for (let m = 0; m < 10 ** boxes; m++) {
        const ds = String(m).padStart(boxes, '0').split('').map(Number); let i = 0;
        const a = p.A.map((d) => (d === null ? ds[i++] : d)), b = p.B.map((d) => (d === null ? ds[i++] : d));
        if (a[0] === 0 || b[0] === 0) continue;
        if (+a.join('') + +b.join('') === p.S) out.push(ds.reduce((t, d) => t + d, 0));
      }
      return uniq(out);
    },
  },
  {
    id: 'yc-stickers-backwards', bands: ['g12', 'g34'], tier: 5, topic: 'number', strategy: 'work-backwards',
    make: guard((r, band) => {
      const steps = band === 'g12' ? 2 : int(3, 4, r), x = band === 'g12' ? int(4, 30, r) : int(10, 120, r);
      const ops = []; let v = x;
      for (let i = 0; i < steps; i++) {
        const kind = pick(['half', 'give', 'get'], r), k = band === 'g12' ? int(1, 6, r) : int(2, 15, r);
        if (kind === 'half' && v % 2) return null; if (kind === 'give' && v - k < 1) return null;
        ops.push([kind, k]); v = kind === 'half' ? v / 2 : kind === 'give' ? v - k : v + k;
      }
      if (!ops.some(([k]) => k === 'half') || ops.some(([k], i) => i && k === ops[i - 1][0])) return null;
      const [n] = two(r), say = { half: () => 'gave half of them away', give: (k) => `gave ${k} to a friend`, get: (k) => `was given ${k} more` };
      const w = ops.map(([k, m]) => say[k](m));
            const forward = ops.reduce((t, [k, m]) => (k === 'half' ? t * 2 : k === 'give' ? t + m : t - m), v);
      return { text: `${n} had some stickers. First ${n} ${w.slice(0, -1).join(', then ')}, then ${w[w.length - 1]}. Now ${n} has ${v}. How many stickers did ${n} have at the start?`, ans: x,
        wrong: wr(x, [forward, v * 2, x + 2, x - 2, x + 1, x - 1]),
        why: 'Work backwards from the end, undoing each step in reverse order: giving is undone by adding back, giving half by doubling.',
        params: { ops, v } };
    }),
    solve(p) { const out = []; for (let s = 1; s < 1000; s++) { let v = s, ok = true; for (const [k, m] of p.ops) { if (k === 'half') { if (v % 2) ok = false; v = v / 2; } else v = k === 'give' ? v - m : v + m; } if (ok && v === p.v) out.push(s); } return out; },
  },
  {
    id: 'yc-how-many-players', bands: ['g12', 'g34'], tier: 5, topic: 'counting', strategy: 'handshakes',
    make: guard((r, band) => {
      const n = band === 'g12' ? int(3, 8, r) : int(5, 15, r), G = (n * (n - 1)) / 2;
      return { text: `In a chess club, every two players played each other exactly once. ${G} games were played in all. How many players are in the club?`, ans: n,
        wrong: wr(n, [Math.floor(G / 2), n + 1, n - 1, 2 * n, Math.round(Math.sqrt(G))]),
        why: 'Try a number of players: with 4 players there are 3 + 2 + 1 games, with 5 there are 4 + 3 + 2 + 1. Keep going until the total matches.', params: { G } };
    }),
    solve(p) { const out = []; for (let n = 1; n < 60; n++) { let c = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) c++; if (c === p.G) out.push(n); } return out; },
  },
  {
    id: 'yc-half-squares-area', bands: ['g12', 'g34'], tier: 5, topic: 'geometry', strategy: 'area-cut-and-move',
    make: guard((r, band) => {
      const cols = band === 'g12' ? 5 : 6, rows = band === 'g12' ? 4 : 5;
      const nf = band === 'g12' ? int(2, 6, r) : int(4, 10, r), nh = 2 * (band === 'g12' ? int(1, 3, r) : int(2, 5, r));
      const spots = shuffle(Array.from({ length: cols * rows }, (_, i) => [i % cols, Math.floor(i / cols)]), r).slice(0, nf + nh);
      const pieces = spots.map(([x, y], i) => {
        if (i < nf) return [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
        const c = int(0, 3, r), sq = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]]; return sq.filter((_, j) => j !== c);
      });
      const ans = nf + nh / 2;
      const u = 36, o = 6; let s = cells(cols, rows, u, o, o, () => 'dg-blank');
      for (const pc of pieces) s += `<polygon points="${pc.map(([x, y]) => `${o + x * u},${o + y * u}`).join(' ')}" class="dg-fill1"/>`;
      return { text: 'Each small square of the grid is one square unit. How many square units are shaded altogether?', ans,
        wrong: wr(ans, [nf + nh, nf, nh, ans + 1, ans - 1]),
        why: 'Each shaded triangle is half a square, so pair the triangles up: two halves make one whole square. Then add the whole squares.',
        fig: svg(cols * u + 2 * o, rows * u + 2 * o, s, 'A grid with shaded squares and half squares'), params: { pieces } };
    }),
    solve(p) { let twice = 0; for (const pc of p.pieces) { let a = 0; for (let i = 0; i < pc.length; i++) { const [x1, y1] = pc[i], [x2, y2] = pc[(i + 1) % pc.length]; a += x1 * y2 - x2 * y1; } twice += Math.abs(a); } return [twice / 2]; },
  },
  {
    id: 'yc-jumping-hand', bands: ['g12', 'g34'], tier: 5, topic: 'patterns', strategy: 'units-digit-cycles',
    make: guard((r, band) => {
      const s = band === 'g12' ? 12 : int(1, 12, r), k = band === 'g12' ? int(2, 5, r) : int(2, 7, r), n = band === 'g12' ? int(4, 12, r) : int(20, 100, r);
      const at = (v) => (((v - 1) % 12) + 12) % 12 + 1, ans = at(s + k * n);
      return { text: `A clock has one hand, pointing at ${s}. Every minute the hand jumps forward ${k} numbers. Which number does it point at after ${n} jumps?`, ans,
        wrong: wr(ans, [at(ans + k), at(ans - k), at(ans + 1), at(ans - 1), at(s + n), at(ans + 6)]),
        why: `After every 12 jumps the hand is back where it started, so throw away whole sets of 12 jumps and only do the jumps left over.`, params: { s, k, n } };
    }),
    solve(p) { let h = p.s; for (let i = 0; i < p.n * p.k; i++) h = h === 12 ? 1 : h + 1; return [h]; },
  },
  {
    id: 'yc-multiples-of-either', bands: ['g34'], tier: 5, topic: 'counting', strategy: 'overlapping-groups',
    make: guard((r) => {
      const [a, b] = pick([[2, 3], [2, 5], [3, 5], [3, 4], [4, 5], [3, 7], [2, 7], [5, 7], [4, 6]], r), N = int(30, 100, r);
      const g = (x, y) => (y ? g(y, x % y) : x), l = (a * b) / g(a, b), ans = Math.floor(N / a) + Math.floor(N / b) - Math.floor(N / l);
      return { text: `How many of the numbers from 1 to ${N} are multiples of ${a} or of ${b} (or both)?`, ans,
        wrong: wr(ans, [Math.floor(N / a) + Math.floor(N / b), Math.floor(N / a), Math.floor(N / b), ans + 1, ans - 1]),
        why: `Count the multiples of ${a}, then of ${b}; the multiples of ${l} were counted twice, so take them away once.`, params: { a, b, N } };
    }),
    solve(p) { let c = 0; for (let x = 1; x <= p.N; x++) if (x % p.a === 0 || x % p.b === 0) c++; return [c]; },
  },
  {
    id: 'yc-fewest-coins', bands: ['g12', 'g34'], tier: 5, topic: 'measure', strategy: 'guess-check-improve',
    make: guard((r, band) => {
      const coins = band === 'g12' ? [1, 2, 5, 10] : [1, 2, 5, 10, 20, 50], A = band === 'g12' ? int(13, 49, r) : int(38, 199, r);
      let left = A, ans = 0, onlyBig = 0; for (const c of coins.slice().reverse()) { ans += Math.floor(left / c); left %= c; }
      onlyBig = Math.floor(A / coins[coins.length - 1]) + (A % coins[coins.length - 1]);
      const said = coins.slice(0, -1).join(', ') + ' and ' + coins[coins.length - 1];
      return { text: `Coins come in ${said}. What is the fewest number of coins that make exactly ${A}?`, ans,
        wrong: wr(ans, [onlyBig, ans + 1, ans - 1, ans + 2, Math.floor(A / 10)]),
        why: 'Use the biggest coin that still fits, as many times as it fits, then go down to the next coin, until nothing is left.', params: { coins, A } };
    }),
    solve(p) { const best = Array(p.A + 1).fill(Infinity); best[0] = 0; for (let v = 1; v <= p.A; v++) for (const c of p.coins) if (c <= v && best[v - c] + 1 < best[v]) best[v] = best[v - c] + 1; return [best[p.A]]; },
  },
  {
    id: 'yc-dice-tower', bands: ['g12', 'g34'], tier: 5, topic: 'geometry', strategy: 'dice-faces',
    make: guard((r, band) => {
      const n = band === 'g12' ? int(2, 3, r) : int(3, 5, r), t = int(1, 6, r), ans = 7 * n - t;
      const s0 = 54; let s = ''; for (let i = 0; i < n; i++) s += `<rect x="20" y="${30 + i * s0}" width="${s0}" height="${s0}" rx="7" class="dg-blank"/>`;
      s += line(20 + s0 + 10, 30 + s0 / 2, 20 + s0 + 40, 30 + s0 / 2, 'dg-thin') + die(20 + s0 + 44, 30, s0, t) + T(20 + s0 + 44 + s0 / 2, 22, 'top', 'dg-small');
      return { text: `${WORD[n][0].toUpperCase() + WORD[n].slice(1)} dice are stacked in a tower on a table. On every dice, opposite faces add up to 7. The top of the tower shows the face in the picture. What is the total number of dots on the faces you cannot see: where the dice touch each other, and underneath the bottom one?`, ans,
        wrong: wr(ans, [7 * n, 7 * (n - 1), ans - 7, 21 * n - t, ans + 1, 7 - t]),
        why: 'Each place where two dice touch hides one top face and one bottom face of a dice that add to 7 together; the bottom of the tower is 7 take away the top face.',
        fig: svg(20 + 2 * s0 + 60, 40 + n * s0, s, 'A tower of dice, with its top face shown'), params: { n, t } };
    }),
    solve(p) {
      const opp = (v) => [0, 6, 5, 4, 3, 2, 1][v], out = new Set();
      const go = (i, sum) => { if (i === p.n - 1) { out.add(sum + opp(p.t)); return; } for (let top = 1; top <= 6; top++) go(i + 1, sum + top + opp(top)); };
      go(0, 0); return [...out];
    },
  },
  {
    id: 'yc-number-wall', bands: ['g12', 'g34'], tier: 5, topic: 'number', strategy: 'work-backwards',
    make: guard((r, band) => {
      const k = band === 'g12' ? 3 : 4, bottom = Array.from({ length: k }, () => (band === 'g12' ? int(1, 12, r) : int(1, 60, r)));
      let row = bottom.slice(); while (row.length > 1) row = row.slice(1).map((v, i) => v + row[i]);
      const top = row[0]; if (top >= (band === 'g12' ? 100 : 1000)) return null;
      const miss = int(0, k - 1, r), ans = bottom[miss];
      const bw = 64, bh = 34, W = k * bw + 20; let s = '';
      for (let lvl = 0; lvl < k; lvl++) for (let i = 0; i < k - lvl; i++) { const x = 10 + i * bw + (lvl * bw) / 2, y = 10 + (k - 1 - lvl) * bh;
        s += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" class="${lvl === 0 ? 'dg-fill2' : 'dg-blank'}"/>`;
        const lab = lvl === 0 ? (i === miss ? '?' : bottom[i]) : lvl === k - 1 ? top : ''; if (lab !== '') s += T(x + bw / 2, y + bh / 2 + 6, lab, 'dg-text'); }
      const shown = bottom.filter((_, i) => i !== miss).reduce((a, b) => a + b, 0);
      return { text: 'In this number wall, each brick is the sum of the two bricks under it. What number goes in the brick marked ?', ans,
        wrong: wr(ans, [top - shown, Math.floor((top - shown) / 2), ans + 1, ans - 1, ans + 2]),
        why: 'Write the middle bricks using the missing number, notice how many times each bottom brick counts towards the top, then try values until the top is right.',
        fig: svg(W, k * bh + 20, s, 'A number wall with one bottom brick missing'), params: { bottom: bottom.map((v, i) => (i === miss ? null : v)), top } };
    }),
    solve(p) { const out = []; for (let x = 0; x < 1000; x++) { let row = p.bottom.map((v) => (v === null ? x : v)); while (row.length > 1) row = row.slice(1).map((v, i) => v + row[i]); if (row[0] === p.top) out.push(x); } return out; },
  },
];

export const TEMPLATES = [...T3, ...T4, ...T5];
