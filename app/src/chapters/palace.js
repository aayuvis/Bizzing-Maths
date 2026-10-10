/* palace.js — The Square Palace: square numbers, roots, powers and cubes.

   The first island already has three squaring tricks (ending in 5, near 100,
   the next square up) and one product trick (around a middle number). This
   world is where they come from: what a square IS, why the odd numbers build
   them, the (a + b)² picture that makes every square to 20 a two-second sum,
   and then the rest of the family — roots, powers, cubes, the index laws. */

import { int, pick, shuffle } from '../rand.js';
import * as kit from './kit.js';
import { explain } from '../geo3d.js';

export const WORLD = {
  id: 'palace', name: 'The Square Palace', short: 'Palace', band: '8-10',
  blurb: 'Every square to 20 in two seconds — and the picture that explains them all.',
  tint: '#EAF0FA', ink: '#1B2A6B', glyph: '👑',
};

/* ------------------------------------------------------------------ helpers */

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (n) => String(n).split('').map((d) => SUP[+d]).join('');
const shows = (q) => !q.choices && String(q.ans).length > 1 && q.text.split(/[^0-9./]/).includes(String(q.ans));
/* Re-draw until the prompt does not happen to contain its own answer. */
function fresh(make) { let q; for (let i = 0; i < 80; i++) { q = make(); if (!shows(q)) return q; } return q; }

const E = kit.esc;
const R = (x, y, w, h, cls) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${cls}"/>`;
const TX = (x, y, s, cls = 'dg-small', rot = false) =>
  `<text x="${x}" y="${y}" class="${cls}" text-anchor="middle"${rot ? ` transform="rotate(-90 ${x} ${y})"` : ''}>${E(s)}</text>`;

/* The (a + b)² picture: a big a-by-a square, two a-by-b strips, one small
   b-by-b corner. The strip is never thinner than 34px, so a 1 still shows. */
function splitSquare(a, b) {
  const S = 180, pb = Math.min(80, Math.max(36, Math.round((S * b) / (a + b)))), x0 = 36, y0 = 30;
  let s = R(x0, y0, S, S, 'dg-fill1') + R(x0 + S, y0, pb, S, 'dg-fill2') + R(x0, y0 + S, S, pb, 'dg-fill2') + R(x0 + S, y0 + S, pb, pb, 'dg-fill3');
  s += TX(x0 + S / 2, y0 + S / 2 + 6, `${a} × ${a}`, 'dg-text');
  s += TX(x0 + S + pb / 2 + 4, y0 + S / 2, `${a} × ${b}`, 'dg-small', true);
  s += TX(x0 + S / 2, y0 + S + pb / 2 + 5, `${a} × ${b}`);
  s += TX(x0 + S + pb / 2, y0 + S + pb / 2 + 5, `${b} × ${b}`);
  s += TX(x0 + S / 2, y0 - 10, a, 'dg-accent') + TX(x0 + S + pb / 2, y0 - 10, b, 'dg-accent');
  s += TX(x0 - 14, y0 + S / 2 + 5, a, 'dg-accent') + TX(x0 - 14, y0 + S + pb / 2 + 5, b, 'dg-accent');
  return kit.svg(x0 + S + pb + 10, y0 + S + pb + 10, s, `A square cut into a ${a} by ${a} square, two ${a} by ${b} strips and a ${b} by ${b} corner`);
}
/* The (T − d)² picture: a T-by-T square with a strip taken off two sides. The
   two strips overlap in a d-by-d corner, which is taken away twice. */
function minusSquare(T, d) {
  const S = 220, pd = Math.min(70, Math.max(34, Math.round((S * d) / T))), k = S - pd, x0 = 36, y0 = 30;
  let s = R(x0, y0, S, S, 'dg-blank') + R(x0, y0, k, k, 'dg-fill1') + R(x0 + k, y0, pd, S, 'dg-fill2') + R(x0, y0 + k, S, pd, 'dg-fill2') + R(x0 + k, y0 + k, pd, pd, 'dg-fill3');
  s += TX(x0 + k / 2, y0 + k / 2 + 6, `${T - d} × ${T - d}`, 'dg-text');
  s += TX(x0 + k + pd / 2 + 4, y0 + k / 2, `${T} × ${d}`, 'dg-small', true);
  s += TX(x0 + k / 2, y0 + k + pd / 2 + 5, `${T} × ${d}`);
  s += TX(x0 + k + pd / 2, y0 + k + pd / 2 + 5, `${d} × ${d}`);
  s += TX(x0 + S / 2, y0 - 10, `${T}`, 'dg-accent') + TX(x0 - 16, y0 + S / 2 + 5, `${T}`, 'dg-accent');
  return kit.svg(x0 + S + 10, y0 + S + 10, s, `A ${T} by ${T} square with a strip ${d} wide taken off two sides`);
}
/* m² − d²: an m-by-m square with a d-by-d corner missing. */
function cornerMissing(m, d) {
  const S = 200, pd = Math.min(80, Math.max(30, Math.round((S * d) / m))), x0 = 36, y0 = 30;
  let s = R(x0, y0, S, S, 'dg-fill1') + R(x0 + S - pd, y0 + S - pd, pd, pd, 'dg-blank');
  s += TX(x0 + (S - pd) / 2, y0 + (S - pd) / 2 + 6, `${m} × ${m}`, 'dg-text');
  s += TX(x0 + S - pd / 2, y0 + S - pd / 2 + 5, `${d} × ${d}`);
  s += TX(x0 + S / 2, y0 - 10, m, 'dg-accent') + TX(x0 - 14, y0 + S / 2 + 5, m, 'dg-accent');
  return kit.svg(x0 + S + 10, y0 + S + 10, s, `A ${m} by ${m} square with a ${d} by ${d} corner missing`);
}
/* a × a × … × a as boxes. */
function chain(groups) {
  let s = '', x = 6; const u = 30;
  groups.forEach((g, gi) => {
    if (gi) { s += TX(x + 10, 40, g.op || '×', 'dg-big'); x += 24; }
    const show = Math.min(g.n, 8);
    for (let i = 0; i < show; i++) {
      s += `<rect x="${x}" y="18" width="${u - 4}" height="${u}" rx="5" class="${g.cross && i >= show - Math.min(g.cross, show) ? 'dg-blank' : g.cls || 'dg-fill1'}"/>` + TX(x + (u - 4) / 2, 38, g.a, 'dg-text');
      x += u;
    }
    if (g.n > show) { s += TX(x + 10, 38, '…', 'dg-text'); x += 24; }
    if (g.label) s += TX(x - (show * u) / 2 - (g.n > show ? 12 : 0), 68, g.label);
  });
  return kit.svg(Math.max(x + 6, 120), 78, s, 'Numbers multiplied together, drawn as boxes');
}
/* the ten last digits, the asked-about ones marked */
function digitStrip(marks = []) {
  let s = ''; for (let d = 0; d < 10; d++) s += R(4 + d * 32, 8, 28, 32, marks.includes(d) ? 'dg-fill1' : 'dg-blank') + TX(18 + d * 32, 30, d, 'dg-text');
  return kit.svg(328, 48, s, 'The ten digits a number can end in');
}
const fmt = (n) => n.toLocaleString('en-GB');

/* ------------------------------------------------------------------ stops */

export const TRICKS = [
  {
    id: 'square-dots', world: 'palace', band: '8-10', title: 'What a square number is',
    hook: '7² — why is 49 called a SQUARE number?',
    idea: 'n² means n rows of n. Lay them out and they make a perfect square.',
    why: [
      'Put 7 counters in a row, then make 7 rows like it. The shape is exactly as tall as it is wide: a square. There are 7 × 7 = 49 counters, so 49 is a square number, and we write 7 × 7 as 7² — "seven squared".',
      'That is where the name comes from: a square number is a number of dots that can stand in a perfect square, with nothing left over. 12 cannot — 3 rows of 4 is a rectangle, not a square — but 16 can, as 4 rows of 4.',
      'The little 2 means "two of them multiplied": 7² is 7 × 7, not 7 × 2. Knowing the squares up to 20 by heart is worth it — every trick in this palace starts from them.',
    ],
    alg: 'n² = n × n',
    ex: { n: 7 },
    oneIdea: true,
    gen(r, lv = 1) { return this.q({ n: lv === 1 ? int(2, 10, r) : lv === 2 ? int(6, 15, r) : int(11, 20, r) }); },
    q({ n }) { return { n, text: `${n}²`, say: `${n} squared`, expr: `${n}*${n}`, ans: n ** 2 }; },
    work({ n }) {
      // counted off the dots drawn: the dots on the first row's line, and how many different rows there are
      return [{ t: 'Dots in each row', v: n, x: String.raw`H.count(SVG,'cy="'+SVG.match(/cy="([\d.]+)"/)[1]+'"')` }, { t: 'How many rows?', v: n, x: String.raw`new Set(SVG.match(/cy="[\d.]+"/g)).size` }, { t: `${n} rows of ${n}`, v: n * n }];
    },
    draw({ n }) { return kit.dots(n, n, null, n > 14 ? 13 : 16); },
  },
  {
    id: 'odd-staircase', world: 'palace', band: '8-10', title: 'The odd-number staircase',
    hook: '1 + 3 + 5 + 7 + 9 — add them, and look what you get.',
    idea: 'Add the odd numbers from 1, and you always land on a square: count how many you added, and square that.',
    why: [
      'Start with one dot. Wrap 3 dots round its corner and you have a 2-by-2 square. Wrap 5 round that and you have 3 by 3. Each new odd number is exactly the "L" that turns one square into the next one up.',
      'Why odd? To grow an n-by-n square to (n + 1) by (n + 1) you add a row of n, a column of n, and one dot in the corner: n + n + 1, which is always odd. So the first five odd numbers make 5 × 5 = 25. When the list is too long to write out, find how many odd numbers there are from the last one: add 1 and halve. 1 + 3 + … + 15 has (15 + 1) ÷ 2 = 8 of them, so it makes 8² = 64.',
      'It works the other way too: the gap between two squares next to each other is an odd number — 15² + 31 = 16². That is the same "next square up" idea you may meet in the Harbour.',
    ],
    alg: '1 + 3 + 5 + … + (2n − 1) = n²',
    ex: { kind: 'sum', n: 5 },
    caseKey: 'form',
    cases: [
      { label: 'Add the odd numbers', note: 'Count how many odd numbers you are adding, and square that count — each one is the L that grows the square.',
        ex: { kind: 'sum', n: 5 } },
      { label: 'A long list', note: 'You only see the last odd number. Add 1 and halve it to find how many there are, then square.',
        ex: { kind: 'sum', n: 8 } },
      { label: 'The gap to the next square', note: 'Now run it backwards: the L that turns one square into the next is a row, a column and one corner.',
        ex: { kind: 'gap', n: 10 } },
    ],
    gen(r, lv = 1) {
      if (lv === 3 && r() < 0.4) return this.q({ kind: 'gap', n: int(8, 25, r) });
      return this.q({ kind: 'sum', n: lv === 1 ? int(3, 6, r) : lv === 2 ? int(5, 12, r) : int(10, 25, r) });
    },
    q({ kind, n }) {
      if (kind === 'gap') return { kind, n, form: 'gap', text: `${n}² + ? = ${n + 1}²`, say: `${n} squared plus what makes ${n + 1} squared`, expr: `${n + 1}*${n + 1}-${n}*${n}`, ans: 2 * n + 1 };
      const last = 2 * n - 1;
      const text = n <= 5 ? Array.from({ length: n }, (_, i) => 2 * i + 1).join(' + ') : `1 + 3 + 5 + … + ${last}`;
      return { kind, n, form: n <= 5 ? 'listed' : 'long', text, say: `the odd numbers from 1 to ${last}, added`, expr: `Array.from({length:${n}},(_,i)=>2*i+1).reduce((a,b)=>a+b,0)`, ans: n * n };
    },
    work({ kind, n }) {
      if (kind === 'gap') return [{ t: `A row of ${n} and a column of ${n}`, v: 2 * n, x: `${n}+${n}` }, { t: 'And one for the corner', v: 2 * n + 1 }];
      return [{ t: `How many odd numbers? (${2 * n - 1} + 1) ÷ 2`, v: n, x: `Array.from({length:${2 * n - 1}},(_,i)=>i+1).filter((k)=>k%2===1).length` }, { t: `${n}²`, v: n * n }];
    },
    draw({ kind, n }) { const m = kind === 'gap' ? n + 1 : n; return kit.dots(m, m, (r, c) => Math.max(r, c) % 2 === 0, m > 14 ? 12 : 16); },
  },
  {
    id: 'teen-squares', world: 'palace', band: '8-10', title: 'Every square to 20',
    hook: '13² — without multiplying 13 by 13.',
    idea: 'Split 13 into 10 and 3. The square is 10², plus two 10-by-3 strips, plus 3².',
    why: [
      'Draw a square 13 wide. Cut it 10 along each side. You get four pieces: a 10-by-10 square (100), two strips 10 by 3 (30 each), and a little 3-by-3 corner (9). Together: 100 + 60 + 9 = 169.',
      'That is why every teen square is so quick: it is always 100, plus 20 lots of the ones digit, plus the ones digit squared. 17² = 100 + 140 + 49 = 289. Say it five times and the squares to 20 are yours for life.',
      'The same picture works for any number split into two parts, a and b: the big square a², two strips a × b, and the corner b². 34² = 900 + 240 + 16 = 1156. Mathematicians write it (a + b)² = a² + 2ab + b².',
    ],
    alg: '(a + b)² = a² + 2ab + b²   ·   (10 + b)² = 100 + 20b + b²',
    ex: { a: 13 },
    oneIdea: true,
    gen(r, lv = 1) {
      const a = lv === 1 ? 10 + int(1, 5, r) : lv === 2 ? 10 + int(1, 9, r) : int(2, 9, r) * 10 + int(1, 9, r);
      return this.q({ a });
    },
    q({ a }) { return { a, text: `${a}²`, say: `${a} squared`, expr: `${a}*${a}`, ans: a * a }; },
    work({ a }) {
      const t = a - (a % 10), b = a % 10;
      return [
        { t: `The big square: ${t}²`, v: t * t, x: `(${a}-${a}%10)**2` },
        { t: `Two strips: 2 × ${t} × ${b}`, v: 2 * t * b, x: `2*(${a}-${a}%10)*(${a}%10)` },
        { t: `The corner: ${b}²`, v: b * b, x: `(${a}%10)**2` },
        { t: `${t * t} + ${2 * t * b} + ${b * b}`, v: a * a },
      ];
    },
    draw({ a }) { return splitSquare(a - (a % 10), a % 10); },
  },
  {
    id: 'square-endings', world: 'palace', band: '8-10', title: 'How a square ends',
    hook: 'Could 5,847 be a square number? You can tell from one digit.',
    idea: 'The last digit of a square depends only on the last digit of the number — and squares can only end in 0, 1, 4, 5, 6 or 9.',
    why: [
      'When you multiply 47 by 47, the ones digit of the answer comes only from 7 × 7 = 49. The tens and hundreds never reach down into the ones column. So 47² ends in 9, just like 7² does.',
      'Now square the ten digits 0 to 9: 0, 1, 4, 9, 16, 25, 36, 49, 64, 81. Their last digits are 0, 1, 4, 9, 6, 5, 6, 9, 4, 1. Look which digits never turn up: 2, 3, 7 and 8. No square number ever ends in one of those — not one, however big.',
      'So 5,847 is not a square, instantly. Careful the other way round: ending in 1, 4, 5, 6, 9 or 0 only means it MIGHT be a square. 21 ends in 1 and is not one.',
    ],
    alg: 'last digit of n² = last digit of (last digit of n)²',
    ex: { kind: 'last', n: 47 },
    caseKey: 'kind',
    cases: [
      { label: 'The last digit of a square', note: 'Only the last digit of the number matters — the tens and hundreds never reach down into the ones column.',
        ex: { kind: 'last', n: 47 } },
      { label: 'Can a square end in…?', note: 'Squares can only end in 0, 1, 4, 5, 6 or 9. A 2, 3, 7 or 8 at the end means “not a square”, however big the number.',
        ex: { kind: 'can', d: 7 } },
      { label: 'Spot the square', note: 'Cross out every number ending in 2, 3, 7 or 8 — they cannot be squares. The one left standing is.',
        ex: { kind: 'which', opts: ['1163', '1156', '1098', '1152'], sq: '1156' } },
    ],
    gen(r, lv = 1) {
      if (lv === 1) return this.q({ kind: 'last', n: int(12, 99, r) });
      if (lv === 2) return r() < 0.5 ? this.q({ kind: 'can', d: int(0, 9, r) }) : this.q({ kind: 'last', n: int(101, 999, r) });
      const n = int(20, 99, r), bad = [2, 3, 7, 8];
      const others = [0, 1, 2].map(() => { const c = Math.floor(n * n / 10), x = int(Math.max(10, c - 60), c + 60, r); return String(x * 10 + pick(bad, r)); });
      const opts = [...new Set([String(n * n), ...others])];
      if (opts.length < 4) return this.q({ kind: 'last', n });
      return this.q({ kind: 'which', opts: shuffle(opts, r), sq: String(n * n) });
    },
    q(a) {
      if (a.kind === 'last') return { ...a, text: `The last digit of ${a.n}²`, say: `the last digit of ${a.n} squared`, expr: `(${a.n}*${a.n})%10`, ans: (a.n % 10) ** 2 % 10 };
      if (a.kind === 'can') {
        const yes = [0, 1, 4, 5, 6, 9].includes(a.d);
        return { ...a, text: `Can a square number end in ${a.d}?`, choices: ['Yes', 'No'], ans: yes ? 'Yes' : 'No',
          expr: `Array.from({length:10},(_,i)=>i*i%10).includes(${a.d})?'Yes':'No'` };
      }
      return { ...a, text: `Only one of these is a square number. Which? ${a.opts.join(' · ')}`, choices: a.opts, ans: a.sq,
        expr: `${JSON.stringify(a.opts).replace(/"/g, "'")}.find((x)=>Number.isInteger(Math.sqrt(+x)))` };
    },
    work(a) {
      if (a.kind === 'last') {
        const u = a.n % 10;
        return [{ t: `The last digit of ${a.n}`, v: u, x: `${a.n}-Math.floor(${a.n}/10)*10` }, { t: `${u} × ${u}`, v: u * u, x: `(${a.n}%10)*(${a.n}%10)` }, { t: 'Its last digit', v: (u * u) % 10 }];
      }
      if (a.kind === 'can') {
        return [{ t: 'How many of the ten digits can end a square? (0, 1, 4, 5, 6, 9)', v: 6, x: 'new Set(Array.from({length:10},(_,i)=>i*i%10)).size' },
          { t: `Is ${a.d} one of them?`, v: a.ans, choices: ['Yes', 'No'] }];
      }
      return [{ t: 'How many of them end in 2, 3, 7 or 8?', v: a.opts.filter((x) => [2, 3, 7, 8].includes(+x % 10)).length, x: `[${a.opts}].filter((v)=>!Number.isInteger(Math.sqrt(v))).length` },
        { t: 'The one left over', v: a.sq, choices: a.opts }];
    },
    draw(a) {
      if (a.kind === 'last') { const u = a.n % 10 || 10; return kit.dots(u, u, null, 14); }
      if (a.kind === 'can') return digitStrip([a.d]);
      return digitStrip(a.opts.map((x) => +x % 10));
    },
  },
  {
    id: 'root-of-square', world: 'palace', band: '8-10', title: 'Square roots',
    hook: '√196 — which number times itself makes 196?',
    idea: 'The square root undoes squaring. Find the tens digit from 10² and 20², then the ones digit from the last digit.',
    why: [
      'If 14 × 14 = 196, then the square root of 196 is 14: √196 = 14. The root is the side of the square; the square number is how many dots fill it.',
      '196 is between 100 (10²) and 400 (20²), so its root is between 10 and 20 — the tens digit is 1. It ends in 6, and only numbers ending in 4 or 6 have squares ending in 6. 14² = 196. Done.',
      'Most numbers are not perfect squares, and their roots are not whole. √200 is a little more than 14, because 14² = 196 is just under 200 and 15² = 225 is over it. So √200 lies between 14 and 15 — and that is often all you need to know.',
    ],
    alg: '√(n²) = n   ·   a² ≤ x < (a + 1)² ⇒ a ≤ √x < a + 1',
    ex: { kind: 'exact', x: 196 },
    caseKey: 'kind',
    cases: [
      { label: 'An exact square root', note: 'The tens digit comes from which squares of 10 it sits between; the ones digit from its last digit. Then check.',
        ex: { kind: 'exact', x: 196 } },
      { label: 'Between two whole numbers', note: 'Not a perfect square, so the root is not whole. Find the biggest square that is not over it — its root is the smaller neighbour.',
        ex: { kind: 'between', x: 200 } },
    ],
    gen(r, lv = 1) {
      if (lv === 1) return this.q({ kind: 'exact', x: int(2, 12, r) ** 2 });
      if (lv === 2) return this.q({ kind: 'exact', x: int(11, 20, r) ** 2 });
      if (r() < 0.3) return this.q({ kind: 'exact', x: int(4, 20, r) ** 2 });
      let x = int(5, 399, r); if (Number.isInteger(Math.sqrt(x))) x++;
      return this.q({ kind: 'between', x });
    },
    q({ kind, x }) {
      if (kind === 'exact') return { kind, x, text: `√${x}`, say: `the square root of ${x}`, expr: `Math.round(Math.sqrt(${x}))`, ans: Math.sqrt(x) };
      return { kind, x, text: `√${x} is between two whole numbers. Type the smaller one.`, say: `the square root of ${x} is between which two whole numbers`, expr: `Math.floor(Math.sqrt(${x}))`, ans: Math.floor(Math.sqrt(x)) };
    },
    work({ kind, x }) {
      const n = Math.floor(Math.sqrt(x));
      if (kind === 'between') return [{ t: `The biggest square not over ${x}`, v: n * n, x: `(()=>{let k=0;while((k+1)*(k+1)<=${x})k++;return k*k})()` }, { t: 'Its root', v: n }];
      return [
        { t: 'Tens digit of the root (10² = 100, 20² = 400)', v: Math.floor(n / 10), x: `Math.floor(Math.sqrt(${x})/10)` },
        { t: `Ones digit of the root: which digit, squared, ends in ${x % 10}? (then check)`, v: n % 10, x: `Math.sqrt(${x})%10` },
        { t: `So √${x}`, v: n },
      ];
    },
    draw({ x }) { return kit.numberLine(0, 400, 50, { [x]: `${x}` }); },
  },
  {
    id: 'powers-index', world: 'palace', band: '8-10', title: 'Powers: the little number',
    hook: '2⁵ — five twos, multiplied.',
    idea: 'The little raised number (the index) says how many of the big number to multiply together.',
    why: [
      '2⁵ means 2 × 2 × 2 × 2 × 2. Squared was the index 2; cubed is the index 3; the index can be anything. Work along: 2, 4, 8, 16, 32.',
      'Powers grow astonishingly fast, because each step multiplies what you already have. A pond weed that doubles every day covers 2 patches on day one, then 4, 8, 16… after only 20 doublings it is over a million. That is called exponential growth.',
      'For a big index, split it in half: 2¹⁰ is 2⁵ × 2⁵ = 32 × 32 = 1024. Two halves of the same power multiplied together make the whole power.',
    ],
    alg: 'aⁿ = a × a × … × a  (n of them)   ·   a²ᵏ = aᵏ × aᵏ',
    ex: { a: 2, e: 5 },
    caseKey: 'way',
    cases: [
      { label: 'Multiply along', note: 'A small index: just keep multiplying by the big number, one step for each.',
        ex: { a: 2, e: 5 } },
      { label: 'A big index: halve it', note: 'Too many to multiply one by one. Work out half the power, then multiply it by itself (and by one more if the index is odd).',
        ex: { a: 3, e: 7 } },
      { label: 'Doubling from 1', note: 'Doubling again and again is a power of 2 in words: double 8 times is 2 to the power 8.',
        ex: { a: 2, e: 8, grow: true } },
    ],
    gen(r, lv = 1) {
      if (lv === 1) return this.q({ a: pick([2, 3, 4, 5, 10], r), e: int(2, 4, r) });
      if (lv === 2) { const a = int(2, 9, r); let e = int(3, 5, r); while (a ** e > 100000) e--; return this.q({ a, e }); }
      const a = pick([2, 2, 3], r), e = a === 2 ? int(6, 19, r) : int(5, 12, r);
      return this.q({ a, e, grow: a === 2 && r() < 0.5 });
    },
    q({ a, e, grow = false }) {
      const text = grow ? `Start at 1 and double ${e} times` : `${a}${sup(e)}`;
      return { a, e, grow, way: grow ? 'double' : e <= 5 ? 'along' : 'halve', text, say: grow ? text : `${a} to the power ${e}`, expr: `Math.pow(${a},${e})`, ans: a ** e };
    },
    work({ a, e }) {
      const s = [{ t: `How many ${a}s are multiplied?`, v: e, x: `Math.round(Math.log(Math.pow(${a},${e}))/Math.log(${a}))` }];
      if (e <= 5) { for (let k = 2; k <= e; k++) s.push({ t: `${a ** (k - 1)} × ${a}`, v: a ** k, x: `Math.pow(${a},${k})` }); return s; }
      const h = Math.floor(e / 2);
      s.push({ t: `Half the index: ${a}${sup(h)}`, v: a ** h, x: `Math.pow(${a},Math.floor(${e}/2))` });
      s.push({ t: `${a ** h} × ${a ** h}`, v: a ** (2 * h), x: `Math.pow(${a},${e}-${e}%2)` });
      if (e % 2) s.push({ t: `One more × ${a}`, v: a ** e });
      return s;
    },
    draw({ a, e }) { return chain([{ a, n: e, label: `${e} of them` }]); },
  },
  {
    id: 'cube-and-root', world: 'palace', band: '8-10', title: 'Cubes and cube roots',
    hook: '4³ — and then: which number, cubed, makes 42,875?',
    idea: 'A cube is n × n × n. To undo it, the last digit gives the root\'s last digit, and the thousands give its tens.',
    why: [
      'Stack 4 layers of a 4-by-4 square and you get a cube of blocks: 4 × 4 × 4 = 64. That is 4³, "four cubed" — a length, a width and a height all the same.',
      'Cubes have a lovely secret. The last digits of 0³ to 9³ are 0, 1, 8, 7, 4, 5, 6, 3, 2, 9 — all ten different! So the last digit of a cube tells you EXACTLY the last digit of its root. 2 and 8 swap, 3 and 7 swap, the rest stay the same.',
      'For the tens digit, drop the last three digits: 42,875 → 42. The biggest cube not over 42 is 27 = 3³, so the tens digit is 3. The cube ends in 5, so the root ends in 5. ∛42,875 = 35. This works because the ones digits only ever affect the last three places… plus a little carrying, which never reaches past the next cube up.',
    ],
    alg: 'n³ = n × n × n   ·   ∛(n³) = n',
    ex: { kind: 'cube', n: 4 },
    caseKey: 'way',
    cases: [
      { label: 'Cubing a number', note: 'Three of the same number multiplied: a length, a width and a height all the same.',
        ex: { kind: 'cube', n: 4 } },
      { label: 'A small cube root', note: 'The last digit of a cube tells you exactly the last digit of its root — 2 and 8 swap, 3 and 7 swap.',
        ex: { kind: 'root', x: 343 } },
      { label: 'A big cube root', note: 'Two digits to find: drop the last three digits for the tens, and use the last digit for the ones.',
        ex: { kind: 'root', x: 42875 } },
    ],
    gen(r, lv = 1) {
      if (lv === 1) return this.q({ kind: 'cube', n: int(2, 6, r) });
      if (lv === 2) return r() < 0.5 ? this.q({ kind: 'cube', n: int(3, 10, r) }) : this.q({ kind: 'root', x: int(2, 10, r) ** 3 });
      return fresh(() => (r() < 0.25 ? this.q({ kind: 'cube', n: int(11, 20, r) }) : this.q({ kind: 'root', x: int(11, 99, r) ** 3 })));
    },
    q({ kind, n, x }) {
      if (kind === 'cube') return { kind, n, way: 'cube', text: `${n}³`, say: `${n} cubed`, expr: `Math.pow(${n},3)`, ans: n ** 3 };
      return { kind, x, way: Math.round(Math.cbrt(x)) <= 10 ? 'small root' : 'big root', text: `∛${fmt(x)}`, say: `the cube root of ${x}`, expr: `Math.round(Math.cbrt(${x}))`, ans: Math.round(Math.cbrt(x)) };
    },
    work({ kind, n, x }) {
      if (kind === 'cube') return [{ t: `${n} × ${n}`, v: n * n, x: `${n}**2` }, { t: `${n * n} × ${n}`, v: n ** 3 }];
      const root = Math.round(Math.cbrt(x)), last = x % 10, u = root % 10;
      const LX = `${x}-Math.floor(${x}/10)*10`, UX = `[0,1,2,3,4,5,6,7,8,9].find((d)=>d**3%10===${x}%10)`;
      if (root < 10 || root === 10) return [{ t: `The last digit of ${fmt(x)}`, v: last, x: LX }, { t: 'So the root ends in', v: u, x: UX }, { t: `∛${fmt(x)}`, v: root }];
      return [
        { t: `Drop the last three digits of ${fmt(x)}`, v: Math.floor(x / 1000), x: `(${x}-${x}%1000)/1000` },
        { t: 'Tens digit: the biggest cube not over that — its root', v: Math.floor(root / 10), x: `(()=>{let k=0;while((k+1)**3<=Math.floor(${x}/1000))k++;return k})()` },
        { t: `The last digit of ${fmt(x)}`, v: last, x: LX },
        { t: 'So the root ends in', v: u, x: UX },
        { t: `∛${fmt(x)}`, v: root },
      ];
    },
    geo({ kind, n }) { return kind === 'cube' ? { kind: 'cubes', l: n, w: n, h: n, cube: true } : null; },
    explain,
    draw({ kind, n, x }) {
      if (kind === 'cube') return kit.cuboid(n, n, n, '', Math.max(8, Math.round(110 / n)));
      return x <= 1000 ? kit.numberLine(0, 1000, 200, { [x]: `${x}` }) : digitStrip([x % 10]);
    },
  },
  {
    id: 'square-minus', world: 'palace', band: '11-14', title: 'Squaring just below a ten',
    hook: '19² — 19 is one short of 20.',
    idea: 'Square the round number, take away two strips, and put back the little corner.',
    why: [
      '19² = (20 − 1)². Start with a 20-by-20 square: 400. To shrink it to 19 by 19, cut a strip 1 wide off the right side and another off the bottom. Each strip is 20 by 1 = 20.',
      'But look at the corner where the two strips cross: that 1-by-1 square was in BOTH strips, so you took it away twice. Put it back once. 400 − 40 + 1 = 361.',
      'It is the (a + b)² picture run backwards. For any round number T and small gap d: (T − d)² = T² − 2 × T × d + d². 48² = 2500 − 200 + 4 = 2304.',
    ],
    alg: '(a − b)² = a² − 2ab + b²',
    ex: { a: 19 },
    oneIdea: true,
    gen(r, lv = 1) {
      const T = (lv === 1 ? int(2, 5, r) : int(2, 9, r)) * 10, d = lv === 1 ? 1 : int(1, lv === 2 ? 2 : 4, r);
      return this.q({ a: T - d });
    },
    q({ a }) { return { a, text: `${a}²`, say: `${a} squared`, expr: `${a}*${a}`, ans: a * a }; },
    work({ a }) {
      const T = Math.ceil(a / 10) * 10, d = T - a;
      return [
        { t: `The round square: ${T}²`, v: T * T, x: `(Math.ceil(${a}/10)*10)**2` },
        { t: `Two strips: 2 × ${T} × ${d}`, v: 2 * T * d, x: `2*Math.ceil(${a}/10)*10*(Math.ceil(${a}/10)*10-${a})` },
        { t: `The corner: ${d}²`, v: d * d, x: `(Math.ceil(${a}/10)*10-${a})**2` },
        { t: `${T * T} − ${2 * T * d} + ${d * d}`, v: a * a },
      ];
    },
    draw({ a }) { const T = Math.ceil(a / 10) * 10; return minusSquare(T, T - a); },
  },
  {
    id: 'square-near-50', world: 'palace', band: '11-14', title: 'Squares near fifty',
    hook: '47² — using only 50² = 2500.',
    idea: 'Start at 2500. Each step away from 50 adds (or takes) 100; then add the gap squared.',
    why: [
      '47 is 50 − 3. By the strips picture, 47² = 50² − 2 × 50 × 3 + 3² = 2500 − 300 + 9 = 2209. The strips are 50 long, so two of them are always 100 × the gap. That is what makes 50 so friendly.',
      'Above 50 the strips are added instead: 53² = 2500 + 300 + 9 = 2809.',
      'There is a shortcut hiding in it: 2500 is 25 hundreds, so (50 ± d)² is (25 ± d) hundreds, plus d². 56² is 31 hundreds and 36: 3136.',
    ],
    alg: '(50 ± d)² = 2500 ± 100d + d²',
    ex: { a: 47 },
    caseKey: 'side',
    cases: [
      { label: 'Just below 50', note: 'Below 50 the two strips are cut off, so take 100 × the gap away from 2500 — then put the corner back.',
        ex: { a: 47 } },
      { label: 'Just above 50', note: 'Above 50 the strips are added on, and so is the corner: 2500 + 100 × the gap + the gap squared.',
        ex: { a: 53 } },
    ],
    gen(r, lv = 1) {
      const d = int(1, lv === 1 ? 3 : lv === 2 ? 6 : 12, r);
      return this.q({ a: r() < 0.5 ? 50 - d : 50 + d });
    },
    q({ a }) { return { a, side: a > 50 ? 'above' : 'below', text: `${a}²`, say: `${a} squared`, expr: `${a}*${a}`, ans: a * a }; },
    work({ a }) {
      const d = Math.abs(a - 50), up = a > 50;
      return [
        { t: `How far from 50?${up ? ' (above)' : ' (below)'}`, v: d, x: `Math.abs(${a}-50)` },
        { t: `The two strips: 100 × ${d}`, v: 100 * d, x: `2*50*Math.abs(${a}-50)` },
        { t: `The corner: ${d}²`, v: d * d, x: `(${a}-50)**2` },
        { t: `2500 ${up ? '+' : '−'} ${100 * d} + ${d * d}`, v: a * a },
      ];
    },
    draw({ a }) { return a > 50 ? splitSquare(50, a - 50) : minusSquare(50, 50 - a); },
  },
  {
    id: 'either-side', world: 'palace', band: '11-14', title: 'Either side of a square',
    hook: '23 × 17 — both are 3 away from 20.',
    idea: 'Two numbers the same distance either side of a middle: square the middle, take away the distance squared.',
    why: [
      '23 × 17: the middle is 20, and each number is 3 away from it. 20² = 400 and 3² = 9, so 23 × 17 = 400 − 9 = 391.',
      'Picture the 23-by-17 rectangle. Cut a 3-wide strip off the long side and lay it along the short side. Now it is almost a 20-by-20 square — only a 3-by-3 corner is missing. So the rectangle is the square with the corner taken out.',
      'That is why knowing your squares to 20 pays twice: 14 × 16 = 15² − 1 = 224, and 12 × 18 = 15² − 9 = 216. Any two numbers with a friendly middle become one square and one small square.',
    ],
    alg: '(a + b)(a − b) = a² − b²',
    ex: { a: 23, b: 17 },
    oneIdea: true,
    gen(r, lv = 1) {
      let m, d;
      if (lv === 1) { m = int(11, 19, r); d = int(1, 3, r); }
      else if (lv === 2) { m = int(2, 9, r) * 10; d = int(1, 9, r); }
      else { m = int(1, 9, r) * 10 + 5; d = pick([1, 2, 3, 4, 6, 7], r); if (d >= m) d = 1; }
      return r() < 0.5 ? this.q({ a: m + d, b: m - d }) : this.q({ a: m - d, b: m + d });
    },
    q({ a, b }) { return { a, b, text: `${a} × ${b}`, expr: `${a}*${b}`, ans: a * b }; },
    work({ a, b }) {
      const m = (a + b) / 2, d = Math.abs(a - b) / 2;
      return [
        { t: 'The middle number', v: m, x: `(${a}+${b})/2` },
        { t: 'How far each is from it', v: d, x: `Math.abs(${a}-${b})/2` },
        { t: `${m}²`, v: m * m, x: `((${a}+${b})/2)**2` },
        { t: `${d}²`, v: d * d, x: `((${a}-${b})/2)**2` },
        { t: `${m * m} − ${d * d}`, v: a * b },
      ];
    },
    draw({ a, b }) { return cornerMissing((a + b) / 2, Math.abs(a - b) / 2); },
  },
  {
    id: 'index-laws', world: 'palace', band: '11-14', title: 'The index laws',
    hook: '2³ × 2⁴ as one power of 2 — without working either out.',
    idea: 'Multiplying powers of the same number adds the indices; dividing subtracts them.',
    why: [
      '2³ is three 2s multiplied, and 2⁴ is four more. Put them side by side and you have seven 2s multiplied: 2⁷. You never needed to know that 2³ is 8.',
      'Dividing cancels: 5⁶ ÷ 5² is six 5s on top and two underneath. Each 5 underneath cancels one on top, leaving four: 5⁴. So you take the indices away.',
      'This is exactly how scientists write huge numbers. 34,000 is 3.4 × 10,000 = 3.4 × 10⁴ — "standard form", one digit before the point and a power of ten. Multiply two of them and the indices add: (3 × 10⁴) × (2 × 10³) = 6 × 10⁷. If the front numbers make 10 or more, one more ten moves into the power: (4 × 10²) × (5 × 10³) = 20 × 10⁵ = 2 × 10⁶.',
    ],
    alg: 'aᵐ × aⁿ = aᵐ⁺ⁿ   ·   aᵐ ÷ aⁿ = aᵐ⁻ⁿ   ·   standard form: A × 10ⁿ, 1 ≤ A < 10',
    ex: { kind: 'mul', a: 2, m: 3, n: 4 },
    caseKey: 'rule',
    cases: [
      { label: 'Multiplying: add', note: 'Put the two lots side by side and count all the 2s together — so the indices add.',
        ex: { kind: 'mul', a: 2, m: 3, n: 4 } },
      { label: 'Dividing: take away', note: 'Each one underneath cancels one on top, so the indices take away.',
        ex: { kind: 'div', a: 5, m: 6, n: 2 } },
      { label: 'Standard form', note: 'One digit before the point, and the power of ten is how many places the point has to move — one fewer than the digits.',
        ex: { kind: 'std', N: 34000 } },
      { label: 'Multiplying in standard form', note: 'Multiply the front numbers, add the powers of ten.',
        ex: { kind: 'prod', p: 3, q: 2, m: 4, n: 3 } },
      { label: 'When the front goes past 10', note: 'If the front numbers make 10 or more, one ten slides into the power, so the index goes up by one more.',
        ex: { kind: 'prod', p: 4, q: 5, m: 2, n: 3 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) return this.q({ kind: 'mul', a: pick([2, 3, 10], r), m: int(2, 6, r), n: int(2, 6, r) });
        if (lv === 2) {
          const a = pick([2, 3, 5, 7, 10], r);
          if (r() < 0.5) return this.q({ kind: 'mul', a, m: int(2, 9, r), n: int(2, 9, r) });
          const m = int(4, 12, r); return this.q({ kind: 'div', a, m, n: int(1, m - 1, r) });
        }
        if (r() < 0.5) { let s = int(11, 99, r); if (s % 10 === 0) s++; return this.q({ kind: 'std', N: s * 10 ** int(1, 5, r) }); }
        return this.q({ kind: 'prod', p: int(2, 9, r), q: int(2, 9, r), m: int(2, 6, r), n: int(2, 6, r) });
      });
    },
    q(o) {
      const { kind, a, m, n } = o;
      if (kind === 'mul') return { ...o, rule: kind, text: `${a}${sup(m)} × ${a}${sup(n)} as one power of ${a} — the index?`, say: `${a} to the ${m} times ${a} to the ${n}, as one power of ${a}. What is the index?`, expr: `Math.round(Math.log(Math.pow(${a},${m})*Math.pow(${a},${n}))/Math.log(${a}))`, ans: m + n };
      if (kind === 'div') return { ...o, rule: kind, text: `${a}${sup(m)} ÷ ${a}${sup(n)} as one power of ${a} — the index?`, say: `${a} to the ${m} divided by ${a} to the ${n}, as one power of ${a}. What is the index?`, expr: `Math.round(Math.log(Math.pow(${a},${m})/Math.pow(${a},${n}))/Math.log(${a}))`, ans: m - n };
      if (kind === 'std') { const N = o.N, lead = String(N)[0] + '.' + String(N)[1]; return { ...o, lead, rule: kind, text: `${fmt(N)} = ${lead} × 10 to the power ? — the index?`, say: `${N} in standard form is ${lead} times ten to what power`, expr: `String(${N}).length-1`, ans: String(N).length - 1 }; }
      const { p, q } = o, pq = p * q, lead = pq >= 10 ? String(pq / 10) : String(pq);
      return { ...o, lead, rule: pq >= 10 ? 'prod-carry' : 'prod', text: `(${p} × 10${sup(m)}) × (${q} × 10${sup(n)}) = ${lead} × 10 to the power ? — the index?`, say: `${p} times ten to the ${m}, times ${q} times ten to the ${n}, in standard form. What is the power of ten?`, expr: `String(${p}*${q}*Math.pow(10,${m})*Math.pow(10,${n})).length-1`, ans: m + n + (pq >= 10 ? 1 : 0) };
    },
    work(o) {
      const { kind, a, m, n } = o;
      if (kind === 'mul') return [{ t: `How many ${a}s in ${a}${sup(m)}?`, v: m, x: `Math.round(Math.log(Math.pow(${a},${m}))/Math.log(${a}))` }, { t: `And in ${a}${sup(n)}?`, v: n, x: `Math.round(Math.log(Math.pow(${a},${n}))/Math.log(${a}))` }, { t: `${m} + ${n}`, v: m + n }];
      if (kind === 'div') return [{ t: `${a}s on top`, v: m, x: `Math.round(Math.log(Math.pow(${a},${m}))/Math.log(${a}))` }, { t: `${a}s underneath, to cancel`, v: n, x: `Math.round(Math.log(Math.pow(${a},${n}))/Math.log(${a}))` }, { t: `${m} − ${n}`, v: m - n }];
      if (kind === 'std') { const L = String(o.N).length; return [{ t: `How many digits in ${fmt(o.N)}?`, v: L, x: `Math.floor(Math.log10(${o.N}))+1` }, { t: 'The point moves one fewer places', v: L - 1 }]; }
      const pq = o.p * o.q;
      return [{ t: `${o.p} × ${o.q}`, v: pq, x: `${o.p}*${o.q}` }, { t: `${m} + ${n}`, v: m + n, x: `${m}+${n}` },
        { t: pq >= 10 ? `${pq} is ${pq / 10} × 10 — one more power` : `${pq} is under 10 — the index stays`, v: m + n + (pq >= 10 ? 1 : 0) }];
    },
    draw(o) {
      if (o.kind === 'mul') return chain([{ a: o.a, n: o.m, label: `${o.m} of them` }, { a: o.a, n: o.n, cls: 'dg-fill2', label: `${o.n} of them` }]);
      if (o.kind === 'div') return chain([{ a: o.a, n: o.m, cross: o.n, label: `${o.n} cancel` }]);
      if (o.kind === 'std') { let s = ''; String(o.N).split('').forEach((d, i) => { s += R(4 + i * 32, 8, 28, 32, i === 0 ? 'dg-fill1' : 'dg-blank') + TX(18 + i * 32, 30, d, 'dg-text'); }); s += `<circle cx="34" cy="44" r="3" class="dg-dot"/>`; return kit.svg(String(o.N).length * 32 + 8, 52, s, 'The digits of the number, the point after the first'); }
      return chain([{ a: 10, n: o.m, label: `${o.m} tens` }, { a: 10, n: o.n, cls: 'dg-fill2', label: `${o.n} tens` }]);
    },
  },
];

/* ------------------------------------------------------------------ stories */

