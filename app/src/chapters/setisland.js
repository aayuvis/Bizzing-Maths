/* setisland.js — Set Island: sets, Venn diagrams, and the first steps of algebra.

   Two halves of one idea. A set is a collection you can ask "is it in?" of;
   algebra is a letter standing for a number you can ask "which one?" of. The
   island goes from belonging (∈), through counting overlaps honestly
   (inclusion–exclusion), to letters, balances, sequences and straight lines. */

import { int, pick, shuffle } from '../rand.js';
import * as kit from './kit.js';

export const WORLD = {
  id: 'setisland', name: 'Set Island', short: 'Set Island', band: '8-10',
  blurb: 'Circles that sort things, and letters that stand for numbers.',
  tint: '#E4F4EF', ink: '#105246', glyph: '⭕',
};

/* ------------------------------------------------------------------ helpers */

const shows = (q) => !q.choices && String(q.ans).length > 1 && q.text.split(/[^0-9./]/).includes(String(q.ans));
function fresh(make) { let q; for (let i = 0; i < 80; i++) { q = make(); if (!shows(q)) return q; } return q; }
const E = kit.esc;
const M = (n) => (n < 0 ? `−${-n}` : `${n}`);                      // a real minus sign
const js = (n) => `(${n})`;
const TX = (x, y, s, cls = 'dg-small') => `<text x="${x}" y="${y}" class="${cls}" text-anchor="middle">${E(s)}</text>`;
const setText = (xs) => `{${xs.join(', ')}}`;

/* One set, drawn as a ring with a name and up to three lines inside. */
function bubble(name, lines, outside = '') {
  let s = `<rect x="4" y="4" width="312" height="172" rx="10" class="dg-blank"/><circle cx="140" cy="92" r="76" class="dg-seta"/>`;
  s += TX(62, 30, name, 'dg-text');
  lines.forEach((l, i) => { s += TX(140, 82 + (i - (lines.length - 1) / 2) * 22, l, 'dg-small'); });
  if (outside !== '') s += TX(270, 96, outside, 'dg-big');
  return kit.svg(320, 180, s, `A set called ${name}`);
}
/* A balance: left pan and right pan, level. */
function balance(left, right) {
  let s = `<polygon points="180,112 164,146 196,146" class="dg-fill2"/><line x1="40" y1="112" x2="320" y2="112" class="dg-line"/>`;
  s += `<rect x="30" y="62" width="130" height="46" rx="8" class="dg-fill1"/><rect x="200" y="62" width="130" height="46" rx="8" class="dg-fill3"/>`;
  s += TX(95, 92, left, 'dg-big') + TX(265, 92, right, 'dg-big') + TX(180, 40, 'level: both sides weigh the same', 'dg-small');
  return kit.svg(360, 156, s, `A balance: ${left} on one side, ${right} on the other`);
}
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const term = (c, v) => (c === 1 ? v : c === -1 ? `−${v}` : `${M(c)}${v}`);
const ORD = (k) => `${k}${k % 100 >= 11 && k % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][k % 10] || 'th'}`;

/* ------------------------------------------------------------------ stops */

export const TRICKS = [
  {
    id: 'set-member', world: 'setisland', band: '8-10', title: 'In the set, or not?',
    hook: 'M = {multiples of 7}. Is 91 in M?',
    idea: 'A set is decided by its rule. Test the number against the rule: if it passes, it belongs (∈).',
    why: [
      'A set is a collection with a clear rule, so that for any thing at all you can say "in" or "not in". {multiples of 7} is a set; {big numbers} is not, because nobody can agree where "big" starts.',
      'We write 91 ∈ M for "91 is a member of M" and 90 ∉ M for "90 is not". You do not need to list the whole set — it may go on for ever — you only need to test the one number against the rule: 91 ÷ 7 = 13 with nothing left over, so 91 ∈ M.',
      'That is the power of a rule: one quick test answers the question for a set with infinitely many members.',
    ],
    alg: 'x ∈ A means x is a member of A;  x ∉ A means it is not',
    ex: { kind: 'mult', k: 7, x: 91 },
    gen(r, lv = 1) {
      const coin = r() < 0.5;
      if (lv === 1) { const k = pick([2, 5, 10], r); const x = coin ? k * int(3, 12, r) : k * int(3, 12, r) + int(1, k - 1, r); return this.q({ kind: 'mult', k, x }); }
      if (lv === 2) { const k = int(3, 9, r); const x = coin ? k * int(4, 15, r) : k * int(4, 15, r) + int(1, k - 1, r); return this.q({ kind: 'mult', k, x }); }
      if (r() < 0.5) { const n = int(4, 20, r); return this.q({ kind: 'sq', x: coin ? n * n : n * n + int(1, 2 * n, r) }); }
      const N = pick([24, 36, 48, 60, 72, 90, 100], r), fs = []; for (let d = 2; d < N; d++) if (N % d === 0) fs.push(d);
      let x = coin ? pick(fs, r) : int(3, Math.floor(N / 2), r); return this.q({ kind: 'fac', N, x });
    },
    q(o) {
      const { kind, x } = o, ch = ['Yes', 'No'];
      if (kind === 'mult') { const name = o.k === 2 ? 'even numbers' : `multiples of ${o.k}`; return { ...o, text: `M = {${name}}. Is ${x} ∈ M?`, say: `M is the set of ${name}. Is ${x} a member of M?`, choices: ch, ans: x % o.k === 0 ? 'Yes' : 'No', expr: `Number.isInteger(${x}/${o.k})?'Yes':'No'` }; }
      if (kind === 'sq') return { ...o, text: `S = {square numbers}. Is ${x} ∈ S?`, say: `S is the set of square numbers. Is ${x} a member of S?`, choices: ch, ans: Math.sqrt(x) % 1 === 0 ? 'Yes' : 'No', expr: `Array.from({length:30},(_,i)=>i*i).includes(${x})?'Yes':'No'` };
      return { ...o, text: `F = {factors of ${o.N}}. Is ${x} ∈ F?`, say: `F is the set of factors of ${o.N}. Is ${x} a member of F?`, choices: ch, ans: o.N % x === 0 ? 'Yes' : 'No', expr: `Number.isInteger(${o.N}/${x})?'Yes':'No'` };
    },
    work(o) {
      const ch = ['Yes', 'No'];
      if (o.kind === 'mult') return [{ t: `Remainder when ${o.x} ÷ ${o.k}`, v: o.x % o.k }, { t: 'No remainder means it passes the rule', v: o.ans, choices: ch }];
      if (o.kind === 'sq') { const n = Math.floor(Math.sqrt(o.x)); return [{ t: `The biggest whole number whose square is not over ${o.x}`, v: n }, { t: `${n}²`, v: n * n }, { t: `Is that exactly ${o.x}?`, v: o.ans, choices: ch }]; }
      return [{ t: `Remainder when ${o.N} ÷ ${o.x}`, v: o.N % o.x }, { t: 'No remainder means it is a factor', v: o.ans, choices: ch }];
    },
    draw(o) {
      const rule = o.kind === 'mult' ? (o.k === 2 ? 'even numbers' : `multiples of ${o.k}`) : o.kind === 'sq' ? 'square numbers' : `factors of ${o.N}`;
      return bubble(o.kind === 'mult' ? 'M' : o.kind === 'sq' ? 'S' : 'F', [rule], `${o.x} ?`);
    },
  },
  {
    id: 'set-count', world: 'setisland', band: '8-10', title: 'Counting a set — and the empty set',
    hook: 'A = {multiples of 6 up to 100}. How many members — without writing them all?',
    idea: 'n(A) is how many members A has. Count by a rule, not one by one — and a set with no members is still a set: the empty set, with n = 0.',
    why: [
      'Listing works for small sets: {red, amber, green} has 3 members, so n(A) = 3. Each member counts once — writing red twice does not make a fourth.',
      'For a bigger set, count with arithmetic. The multiples of 6 up to 100 are 6 × 1, 6 × 2, … 6 × 16 = 96 (6 × 17 = 102 is too far). They are numbered 1 to 16, so there are 16. The whole numbers from 12 to 30 are 30 − 12 + 1 = 19: take away, then add one for the fence post at the start.',
      'Sometimes the rule lets nothing in: {multiples of 10 between 41 and 49}. That is the empty set, written { } or ∅, and n(∅) = 0. It sounds like nothing — but it is the honest answer to "which ones?", and every set has it inside.',
    ],
    alg: 'n({k, 2k, …} up to N) = ⌊N ÷ k⌋   ·   n({a, …, b}) = b − a + 1   ·   n(∅) = 0',
    ex: { kind: 'mult', k: 6, N: 100 },
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) { const a = int(2, 30, r); return this.q({ kind: 'range', a, b: a + int(4, 20, r) }); }
        if (lv === 2) return this.q({ kind: 'mult', k: int(3, 9, r), N: int(30, 100, r) });
        if (r() < 0.3) { const k = pick([10, 20, 25], r), lo = k * int(2, 9, r) + 1; return this.q({ kind: 'between', k, a: lo, b: lo + k - 3 }); }
        if (r() < 0.5) { const k = int(3, 12, r), a = int(10, 60, r); return this.q({ kind: 'between', k, a, b: a + int(30, 120, r) }); }
        return this.q({ kind: 'mult', k: int(4, 15, r), N: int(100, 500, r) });
      });
    },
    q(o) {
      const range = (a, b, f) => `Array.from({length:${b}+1},(_,i)=>i).filter((i)=>i>=${a}&&${f}).length`;
      if (o.kind === 'range') return { ...o, text: `A = {whole numbers from ${o.a} to ${o.b}}. n(A)?`, say: `how many whole numbers from ${o.a} to ${o.b}`, expr: range(o.a, o.b, 'true'), ans: o.b - o.a + 1 };
      if (o.kind === 'mult') return { ...o, text: `A = {multiples of ${o.k} up to ${o.N}}. n(A)?`, say: `how many multiples of ${o.k} up to ${o.N}`, expr: range(1, o.N, `i%${o.k}===0`), ans: Math.floor(o.N / o.k) };
      return { ...o, text: `A = {multiples of ${o.k} from ${o.a} to ${o.b}}. n(A)?`, say: `how many multiples of ${o.k} from ${o.a} to ${o.b}`, expr: range(o.a, o.b, `i%${o.k}===0`), ans: Math.floor(o.b / o.k) - Math.floor((o.a - 1) / o.k) };
    },
    work(o) {
      if (o.kind === 'range') return [{ t: `${o.b} − ${o.a}`, v: o.b - o.a }, { t: 'Add one for the first number', v: o.ans }];
      if (o.kind === 'mult') { const c = Math.floor(o.N / o.k); return [{ t: `The last multiple of ${o.k} not over ${o.N}`, v: c * o.k }, { t: `${c * o.k} ÷ ${o.k}`, v: c }]; }
      const hi = Math.floor(o.b / o.k), lo = Math.floor((o.a - 1) / o.k);
      return [{ t: `Multiples of ${o.k} up to ${o.b}`, v: hi }, { t: `Multiples of ${o.k} below ${o.a}`, v: lo }, { t: `${hi} − ${lo}${hi === lo ? ' — the empty set' : ''}`, v: hi - lo }];
    },
    draw(o) {
      const rule = o.kind === 'range' ? `whole numbers ${o.a} to ${o.b}` : o.kind === 'mult' ? `multiples of ${o.k}` : `multiples of ${o.k}`;
      const lim = o.kind === 'mult' ? `up to ${o.N}` : o.kind === 'between' ? `from ${o.a} to ${o.b}` : '';
      return bubble('A', lim ? [rule, lim] : [rule], 'n = ?');
    },
  },
  {
    id: 'union-meet', world: 'setisland', band: '8-10', title: 'Union and intersection',
    hook: 'A = {2, 4, 6, 8, 10}, B = {3, 6, 9}. How many in A ∪ B?',
    idea: 'A ∪ B (union) is everything in A or B or both; A ∩ B (intersection) is only what is in both. Count the shared ones once.',
    why: [
      'The union A ∪ B pours both sets into one bag. But a set never holds the same member twice, so anything in BOTH sets goes in only once. For A = {2, 4, 6, 8, 10} and B = {3, 6, 9}, the 6 is shared: 5 + 3 = 8 names, but only 7 different members.',
      'The intersection A ∩ B keeps only what is in both — here just {6}, so n(A ∩ B) = 1. Think of ∪ as a cup that holds everything, and ∩ as a bridge: only what stands on both banks.',
      'So there is always a check: n(A ∪ B) = n(A) + n(B) − n(A ∩ B). The shared ones were counted twice by adding, so take them away once.',
    ],
    alg: 'n(A ∪ B) = n(A) + n(B) − n(A ∩ B)',
    ex: { kind: 'list', A: [2, 4, 6, 8, 10], B: [3, 6, 9], op: '∪' },
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 3 && r() < 0.6) { const a = int(2, 5, r); let b = int(2, 7, r); if (b === a) b++; return this.q({ kind: 'rule', a, b, N: int(20, 60, r), op: pick(['∩', '∪'], r) }); }
        const pool = shuffle(Array.from({ length: lv === 1 ? 12 : 20 }, (_, i) => i + 1), r);
        const shared = int(lv === 1 ? 1 : 0, lv === 1 ? 2 : 3, r), na = int(3, lv === 1 ? 5 : 7, r), nb = int(3, lv === 1 ? 5 : 7, r);
        const S = pool.slice(0, shared), A = [...S, ...pool.slice(shared, shared + na - shared)], B = [...S, ...pool.slice(shared + na, shared + na + nb - shared)];
        return this.q({ kind: 'list', A: A.sort((x, y) => x - y), B: B.sort((x, y) => x - y), op: pick(['∪', '∩'], r) });
      });
    },
    q(o) {
      if (o.kind === 'list') {
        const both = o.A.filter((x) => o.B.includes(x)).length, ans = o.op === '∪' ? o.A.length + o.B.length - both : both;
        return { ...o, text: `A = ${setText(o.A)}, B = ${setText(o.B)}. n(A ${o.op} B)?`, say: `how many members in A ${o.op === '∪' ? 'union' : 'intersection'} B`,
          expr: o.op === '∪' ? `new Set([${o.A},${o.B}]).size` : `[${o.A}].filter((x)=>[${o.B}].indexOf(x)>=0).length`, ans };
      }
      const L = (o.a * o.b) / gcd(o.a, o.b), nA = Math.floor(o.N / o.a), nB = Math.floor(o.N / o.b), nI = Math.floor(o.N / L);
      return { ...o, text: `A = {multiples of ${o.a} up to ${o.N}}, B = {multiples of ${o.b} up to ${o.N}}. n(A ${o.op} B)?`, say: `multiples of ${o.a} and of ${o.b} up to ${o.N}: how many in A ${o.op === '∪' ? 'union' : 'intersection'} B`,
        expr: `Array.from({length:${o.N}},(_,i)=>i+1).filter((i)=>${o.op === '∪' ? `i%${o.a}===0||i%${o.b}===0` : `i%${o.a}===0&&i%${o.b}===0`}).length`, ans: o.op === '∪' ? nA + nB - nI : nI };
    },
    work(o) {
      if (o.kind === 'list') {
        const both = o.A.filter((x) => o.B.includes(x)).length;
        const s = [{ t: 'How many are in both A and B?', v: both }];
        if (o.op === '∪') s.push({ t: `n(A) + n(B) = ${o.A.length} + ${o.B.length}`, v: o.A.length + o.B.length }, { t: `Take the shared ones once: − ${both}`, v: o.A.length + o.B.length - both });
        else s.push({ t: 'So n(A ∩ B)', v: both });
        return s;
      }
      const L = (o.a * o.b) / gcd(o.a, o.b), nA = Math.floor(o.N / o.a), nB = Math.floor(o.N / o.b), nI = Math.floor(o.N / L);
      const s = [{ t: `In both means a multiple of ${o.a} AND ${o.b}: the smallest is`, v: L }, { t: `How many multiples of ${L} up to ${o.N}?`, v: nI }];
      if (o.op === '∪') s.push({ t: `n(A) + n(B) = ${nA} + ${nB}`, v: nA + nB }, { t: `− ${nI}, counted twice`, v: nA + nB - nI });
      return s;
    },
    draw(o) { return o.op === '∪' ? kit.venn('A', 'B', '?', '?', '?') : kit.venn('A', 'B', '', '?', ''); },
  },
  {
    id: 'venn-count', world: 'setisland', band: '8-10', title: 'Venn diagrams that count',
    hook: '14 children play cricket, 11 play chess, 5 play both. How many play at least one?',
    idea: 'Add the two circles, then take away the overlap — it was counted twice.',
    why: [
      'Draw two overlapping circles. The 5 who play both stand in the middle, where the circles cross. Cricket-only is 14 − 5 = 9, chess-only is 11 − 5 = 6. Everybody in a circle: 9 + 5 + 6 = 20.',
      'Or quicker: 14 + 11 = 25 counts every child in the middle twice — once as a cricketer, once as a chess player. Take the 5 away once and 20 is left. That rule has a grand name, inclusion–exclusion: include both sets, exclude the overlap.',
      'It runs backwards too. In a class of 24 where 4 play neither, 20 children are inside the circles. Adding the circles gave 25 — five too many — and the only children counted twice are the ones in the middle. So 5 play both. Whichever number is missing, the same equation finds it.',
    ],
    alg: 'n(A ∪ B) = n(A) + n(B) − n(A ∩ B)',
    ex: { kind: 'union', la: 'Cricket', lb: 'Chess', A: 14, B: 11, I: 5 },
    gen(r, lv = 1) {
      const [la, lb] = pick([['Cricket', 'Chess'], ['Dogs', 'Cats'], ['Piano', 'Drums'], ['Swim', 'Run'], ['Apples', 'Mangoes'], ['Maths', 'Art']], r);
      return fresh(() => {
        const I = int(1, lv === 1 ? 6 : 12, r), A = I + int(1, lv === 1 ? 9 : 20, r), B = I + int(1, lv === 1 ? 9 : 20, r);
        if (lv === 1) return this.q({ kind: 'regions', la, lb, A, B, I });
        if (lv === 2) return this.q({ kind: 'union', la, lb, A, B, I });
        return this.q({ kind: 'both', la, lb, A, B, I, out: int(0, 8, r) });
      });
    },
    q(o) {
      const U = o.A + o.B - o.I;
      if (o.kind === 'regions') return { ...o, text: `The Venn diagram shows ${o.la} and ${o.lb}. How many are in at least one circle?`, expr: `${o.A - o.I}+${o.I}+${o.B - o.I}`, ans: U };
      if (o.kind === 'union') return { ...o, text: `${o.A} like ${o.la}, ${o.B} like ${o.lb}, ${o.I} like both. How many like at least one?`, expr: `${o.A - o.I}+${o.I}+${o.B - o.I}`, ans: U };
      const T = U + o.out;
      return { ...o, T, text: `A class of ${T}: ${o.A} like ${o.la}, ${o.B} like ${o.lb}, ${o.out} like neither. How many like both?`, expr: `${o.A}-(${T}-${o.out}-${o.B})`, ans: o.I };
    },
    work(o) {
      const U = o.A + o.B - o.I;
      if (o.kind === 'regions') return [{ t: `${o.A - o.I} + ${o.I}`, v: o.A }, { t: `+ ${o.B - o.I}`, v: U }];
      if (o.kind === 'union') return [{ t: `${o.A} + ${o.B}`, v: o.A + o.B }, { t: `Take the overlap once: − ${o.I}`, v: U }];
      return [{ t: `In the circles: ${o.T} − ${o.out}`, v: U }, { t: `${o.A} + ${o.B}`, v: o.A + o.B }, { t: `Counted twice: ${o.A + o.B} − ${U}`, v: o.I }];
    },
    draw(o) {
      if (o.kind === 'regions') return kit.venn(o.la, o.lb, o.A - o.I, o.I, o.B - o.I);
      if (o.kind === 'union') return kit.venn(`${o.la} ${o.A}`, `${o.lb} ${o.B}`, '', o.I, '');
      return kit.venn(`${o.la} ${o.A}`, `${o.lb} ${o.B}`, '', '?', '', o.out);
    },
  },
  {
    id: 'substitute', world: 'setisland', band: '8-10', title: 'Letters for numbers',
    hook: 'If n = 4, what is 3n + 2?',
    idea: 'A letter is a box holding a number. Put the number in the box, then do the sum — times before plus.',
    why: [
      '3n means 3 × n — in algebra we leave the × out so it does not get mixed up with the letter x. So when n = 4, 3n + 2 is 3 × 4 + 2 = 12 + 2 = 14.',
      'Why use a letter at all? Because one expression can describe a whole pattern. "Triangles in a row of n tiles use 3n + 2 matches" works for 4 tiles, for 40, for 400 — you only swap the number in the box.',
      'The order still matters: multiply before you add. And a number just outside brackets multiplies everything inside: 4(n − 2) with n = 6 is 4 × 4 = 16.',
    ],
    alg: 'an + b with n = k  →  a × k + b',
    ex: { kind: 'lin', a: 3, b: 2, n: 4 },
    keys: ['−'],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) return this.q({ kind: 'lin', a: int(2, 9, r), b: int(1, 12, r), n: int(2, 9, r) });
        if (lv === 2) {
          const f = pick(['lin', 'bra', 'sq'], r), n = int(2, 12, r);
          if (f === 'lin') return this.q({ kind: 'lin', a: int(2, 12, r), b: -int(1, 9, r), n });
          if (f === 'bra') return this.q({ kind: 'bra', a: int(2, 9, r), b: int(1, 6, r), n: n + 6 });
          return this.q({ kind: 'sq', a: 1, b: int(1, 20, r), n });
        }
        const a = int(2, 9, r), b = int(-9, -1, r);
        return pick([() => this.q({ kind: 'two', a: int(2, 6, r), c: int(2, 6, r), x: int(1, 9, r), y: b }), () => this.q({ kind: 'sq', a, b: int(-20, 20, r) || 7, n: b })], r)();
      });
    },
    q(o) {
      const { kind, a, b, n } = o;
      if (kind === 'lin') return { ...o, text: `If n = ${n}, what is ${a}n ${b < 0 ? '−' : '+'} ${Math.abs(b)}?`, expr: `${a}*${js(n)}+${js(b)}`, ans: a * n + b };
      if (kind === 'bra') return { ...o, text: `If n = ${n}, what is ${a}(n − ${b})?`, expr: `${a}*(${n}-${b})`, ans: a * (n - b) };
      if (kind === 'sq') return { ...o, text: `If n = ${M(n)}, what is ${a === 1 ? '' : a}n² ${b < 0 ? '−' : '+'} ${Math.abs(b)}?`, expr: `${a}*Math.pow(${js(n)},2)+${js(b)}`, ans: a * n * n + b };
      return { ...o, text: `If a = ${o.x} and b = ${M(o.y)}, what is ${o.a}a + ${o.c}b?`, expr: `${o.a}*${o.x}+${o.c}*${js(o.y)}`, ans: o.a * o.x + o.c * o.y };
    },
    work(o) {
      const { kind, a, b, n } = o;
      if (kind === 'lin') return [{ t: `${a} × ${M(n)}`, v: a * n }, { t: `${b < 0 ? 'Take' : 'Add'} ${Math.abs(b)}`, v: a * n + b }];
      if (kind === 'bra') return [{ t: `Brackets first: ${n} − ${b}`, v: n - b }, { t: `${a} × ${n - b}`, v: a * (n - b) }];
      if (kind === 'sq') return [{ t: `n² = ${M(n)} × ${M(n)}`, v: n * n }, ...(a === 1 ? [] : [{ t: `${a} × ${n * n}`, v: a * n * n }]), { t: `${b < 0 ? 'Take' : 'Add'} ${Math.abs(b)}`, v: a * n * n + b }];
      return [{ t: `${o.a} × ${o.x}`, v: o.a * o.x }, { t: `${o.c} × ${M(o.y)}`, v: o.c * o.y }, { t: 'Add them', v: o.a * o.x + o.c * o.y }];
    },
  },
  {
    id: 'subset-count', world: 'setisland', band: '11-14', title: 'How many subsets?',
    hook: '{a, b, c, d} — how many different smaller sets can you make from it (counting the empty one)?',
    idea: 'Every member is either in or out. Two choices each, so n members give 2 × 2 × … × 2 = 2ⁿ subsets.',
    why: [
      'A subset is any set made only from members of the big one — including the empty set and the whole set itself. From {a, b} you can make { }, {a}, {b} and {a, b}: four.',
      'To build a subset, walk past each member and decide: in, or out? For {a, b, c, d} that is four decisions, each with 2 answers, and every different set of decisions gives a different subset. So there are 2 × 2 × 2 × 2 = 16.',
      'Add one more member and every old subset splits in two — one without the new member, one with it. So each extra member doubles the count. Leave out the empty set and there are 2ⁿ − 1; insist a certain member is in and you have halved it: 2ⁿ⁻¹.',
    ],
    alg: 'a set with n members has 2ⁿ subsets',
    ex: { kind: 'all', n: 4 },
    gen(r, lv = 1) {
      if (lv === 1) return this.q({ kind: 'all', n: int(1, 4, r) });
      if (lv === 2) return this.q({ kind: 'all', n: int(3, 7, r) });
      return this.q({ kind: pick(['all', 'nonempty', 'with'], r), n: int(3, 8, r) });
    },
    q({ kind, n }) {
      const S = setText('abcdefgh'.slice(0, n).split(''));
      const count = `Array.from({length:${2 ** n}},(_,m)=>m)`;
      if (kind === 'all') return { kind, n, text: `How many subsets does ${S} have?`, expr: `${count}.length`, ans: 2 ** n };
      if (kind === 'nonempty') return { kind, n, text: `How many subsets of ${S} are NOT empty?`, expr: `${count}.filter((m)=>m>0).length`, ans: 2 ** n - 1 };
      return { kind, n, text: `How many subsets of ${S} contain a?`, expr: `${count}.filter((m)=>m%2===1).length`, ans: 2 ** (n - 1) };
    },
    work({ kind, n }) {
      if (kind === 'with') return [{ t: 'a is fixed in. How many members still to decide?', v: n - 1 }, { t: `2 choices each: ${Array(n - 1).fill(2).join(' × ') || '1'}`, v: 2 ** (n - 1) }];
      const s = [{ t: 'How many members?', v: n }, { t: `In or out for each: ${Array(n).fill(2).join(' × ')}`, v: 2 ** n }];
      if (kind === 'nonempty') s.push({ t: 'Leave out the empty set', v: 2 ** n - 1 });
      return s;
    },
    draw({ n }) { const L = 'abcdefgh'.slice(0, n).split(''); return bubble('S', [L.slice(0, 4).join('  '), L.slice(4).join('  ')].filter(Boolean), 'in or out?'); },
  },
  {
    id: 'like-terms', world: 'setisland', band: '11-14', title: 'Collecting like terms',
    hook: '3x + 2y + 4x + y — can it be shorter?',
    idea: 'Terms with the same letter are the same kind of thing: add their numbers. Different letters stay apart.',
    why: [
      'Think of x as an apple and y as a banana. 3 apples, 2 bananas, 4 more apples and 1 more banana: that is 7 apples and 3 bananas, 7x + 3y. You cannot add apples to bananas and call them 10 "applebananas" — so 10xy is wrong.',
      'This works because x is the same number every time it appears. 3x + 4x means 3 lots of that number and 4 more lots of it: 7 lots, whatever it is.',
      'Take-aways work the same way: 5x − 8x is 3 fewer lots than none, so −3x. The sign in front of a term belongs to it and travels with it.',
    ],
    alg: 'ax + bx = (a + b)x',
    ex: { kind: 'pick', a: 3, b: 2, c: 4, d: 1 },
    keys: ['−'],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) return this.q({ kind: 'coef', v: pick(['a', 'm', 'x', 'n'], r), cs: [int(2, 9, r), int(1, 9, r), int(1, 9, r)] });
        if (lv === 2) return this.q({ kind: 'pick', a: int(2, 9, r), b: int(1, 9, r), c: int(1, 9, r), d: int(1, 9, r) });
        const a = int(2, 9, r); let c = int(2, 12, r); if (c === a) c++;
        return this.q({ kind: 'neg', a, p: int(1, 9, r), c, q: int(1, 9, r) });
      });
    },
    q(o) {
      if (o.kind === 'coef') {
        const [p, q, s] = o.cs;
        return { ...o, text: `${term(p, o.v)} + ${term(q, o.v)} + ${term(s, o.v)} = □${o.v}. What goes in the box?`, expr: `[${o.cs}].reduce((x,y)=>x+y,0)`, ans: p + q + s };
      }
      if (o.kind === 'pick') {
        const { a, b, c, d } = o, X = a + c, Y = b + d;
        const right = `${term(X, 'x')} + ${term(Y, 'y')}`;
        const wrong = [`${X + Y}xy`, `${term(X, 'x')} + ${Y}`, `${term(a + b, 'x')} + ${term(c + d, 'y')}`, `${term(X + 1, 'x')} + ${term(Y, 'y')}`].filter((w) => w !== right);
        const choices = [right, ...[...new Set(wrong)].slice(0, 3)];
        return { ...o, text: `Simplify: ${term(a, 'x')} + ${term(b, 'y')} + ${term(c, 'x')} + ${term(d, 'y')}`, choices: choices.map((_, i) => choices[(i + a + b + c + d) % 4]), ans: right,
          expr: `[${a}+${c},${b}+${d}].map((n,i)=>(n===1?'':n)+'xy'[i]).join(' + ')` };
      }
      const { a, p, c, q } = o;
      return { ...o, text: `${term(a, 'x')} + ${p} − ${term(c, 'x')} + ${q}. The number in front of x?`, say: `${a}x plus ${p} minus ${c}x plus ${q}: what number goes in front of x`, expr: `${a}-${c}`, ans: a - c };
    },
    work(o) {
      if (o.kind === 'coef') { const [p, q, s] = o.cs; return [{ t: `${p} + ${q}`, v: p + q }, { t: `+ ${s}`, v: p + q + s }]; }
      if (o.kind === 'pick') return [{ t: `The x's: ${o.a} + ${o.c}`, v: o.a + o.c }, { t: `The y's: ${o.b} + ${o.d}`, v: o.b + o.d }, { t: 'So the short form is', v: o.ans, choices: o.choices }];
      return [{ t: `The plain numbers: ${o.p} + ${o.q}`, v: o.p + o.q }, { t: `The x's: ${o.a} − ${o.c}`, v: o.a - o.c }];
    },
  },
  {
    id: 'solve-balance', world: 'setisland', band: '11-14', title: 'Solving equations on a balance',
    hook: '3x + 4 = 19 — what is x?',
    idea: 'An equation is a level balance. Do the same to both sides, undoing the last thing first, until x stands alone.',
    why: [
      'Picture a balance: three bags of x sweets and 4 loose sweets on one side, 19 sweets on the other, perfectly level. Take 4 loose sweets off BOTH sides and it is still level: 3 bags balance 15 sweets.',
      'Now split both sides into three equal shares: one bag balances 5 sweets. So x = 5. Whatever you do to one side, you do to the other — that is the one rule, and it is why the answer is guaranteed to be right.',
      'The order is the building order backwards. To make 3x + 4 you multiplied by 3, then added 4; to unmake it, take the 4 away first, then divide by 3. That is also how a word puzzle becomes an equation: "I think of a number, times it by 3 and add 4, and get 19" IS 3x + 4 = 19.',
    ],
    alg: 'ax + b = c  ⇒  x = (c − b) ÷ a',
    ex: { kind: 'two', a: 3, b: 4, x: 5 },
    keys: ['−'],
    gen(r, lv = 1) {
      return fresh(() => {
        const x = int(2, lv === 1 ? 12 : 20, r);
        if (lv === 1) return r() < 0.5 ? this.q({ kind: 'add', b: int(3, 30, r), x }) : this.q({ kind: 'mul', a: int(2, 9, r), x });
        if (lv === 2) return this.q({ kind: 'two', a: int(2, 9, r), b: pick([-1, 1], r) * int(1, 20, r), x });
        return this.q({ kind: 'words', a: int(2, 9, r), b: pick([-1, 1], r) * int(1, 20, r), x });
      });
    },
    q(o) {
      const { kind, a, b, x } = o;
      if (kind === 'add') return { ...o, text: `x + ${b} = ${x + b}. What is x?`, expr: `${x + b}-${b}`, ans: x };
      if (kind === 'mul') return { ...o, text: `${a}x = ${a * x}. What is x?`, expr: `${a * x}/${a}`, ans: x };
      const c = a * x + b;
      if (kind === 'two') return { ...o, text: `${a}x ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${M(c)}. What is x?`, expr: `(${c}-(${b}))/${a}`, ans: x };
      return { ...o, text: `I think of a number. I multiply it by ${a}, then ${b < 0 ? `take away ${-b}` : `add ${b}`}, and I get ${M(c)}. What was my number?`, expr: `(${c}-(${b}))/${a}`, ans: x };
    },
    work(o) {
      const { kind, a, b, x } = o;
      if (kind === 'add') return [{ t: 'What has been added to x?', v: b }, { t: `Take ${b} off both sides: ${x + b} − ${b}`, v: x }];
      if (kind === 'mul') return [{ t: 'How many x\'s on the left?', v: a }, { t: `Share both sides into ${a}: ${a * x} ÷ ${a}`, v: x }];
      const c = a * x + b, s = [];
      if (kind === 'words') s.push({ t: `As an equation: ${a}x ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${M(c)}. What does ${a}x ${b < 0 ? '−' : '+'} ${Math.abs(b)} equal?`, v: c });
      s.push({ t: b < 0 ? `Add ${-b} to both sides` : `Take ${b} off both sides`, v: c - b });
      s.push({ t: `Share both sides into ${a}`, v: x });
      return s;
    },
    draw(o) {
      const { kind, a, b, x } = o, c = kind === 'add' ? x + b : kind === 'mul' ? a * x : a * x + b;
      const left = kind === 'add' ? `x + ${b}` : kind === 'mul' ? `${a}x` : `${a}x ${b < 0 ? '−' : '+'} ${Math.abs(b)}`;
      return balance(left, M(c));
    },
  },
  {
    id: 'nth-term', world: 'setisland', band: '11-14', title: 'The nth term',
    hook: '5, 8, 11, 14, … — what is the 20th number, without writing all twenty?',
    idea: 'Find the step. The nth term is the step × n, plus whatever fixes the first term.',
    why: [
      '5, 8, 11, 14 goes up by 3 each time. To reach the 20th term you start at the 1st and take 19 steps of 3: 5 + 19 × 3 = 62. Not 20 steps — the first term is already there before any step.',
      'For a rule that works for every n, compare with the 3 times table: 3, 6, 9, 12. Our sequence is always 2 more, so the nth term is 3n + 2. Check: n = 1 gives 5. n = 20 gives 62.',
      'A sequence that goes up by the same amount each time is called linear, because if you plot it the points lie on a straight line. The step is the slope of that line — the next stop on this island.',
    ],
    alg: 'nth term = d·n + (a − d),  a = first term, d = step',
    ex: { kind: 'kth', a: 5, d: 3, k: 20 },
    keys: ['−'],
    gen(r, lv = 1) {
      return fresh(() => {
        const a = int(1, 15, r), d = int(2, lv === 1 ? 5 : 9, r);
        if (lv === 1) return this.q({ kind: 'kth', a, d, k: pick([6, 8, 10], r) });
        if (lv === 2) return this.q({ kind: 'kth', a, d, k: pick([20, 20, 30, 50, 100], r) });
        return r() < 0.5 ? this.q({ kind: 'rule', a, d }) : this.q({ kind: 'which', a, d, k: int(8, 40, r) });
      });
    },
    q(o) {
      const { kind, a, d } = o, seq = [0, 1, 2, 3].map((i) => a + i * d).join(', ') + ', …';
      if (kind === 'kth') return { ...o, text: `${seq} What is the ${ORD(o.k)} term?`, expr: `Array.from({length:${o.k}},(_,i)=>${a}+i*${d}).pop()`, ans: a + (o.k - 1) * d };
      if (kind === 'rule') return { ...o, text: `${seq} The nth term is ${d}n + □. What is □?`, say: `the nth term is ${d} n plus what?`, expr: `${a + d}-2*${d}`, ans: a - d };
      const v = a + (o.k - 1) * d;
      return { ...o, text: `${seq} Which term is ${v}?`, say: `which term of the sequence is ${v}`, expr: `Array.from({length:200},(_,i)=>${a}+i*${d}).indexOf(${v})+1`, ans: o.k };
    },
    work(o) {
      const { kind, a, d } = o;
      if (kind === 'kth') return [{ t: 'The step', v: d }, { t: `Steps from the 1st to the ${ORD(o.k)}`, v: o.k - 1 }, { t: `${o.k - 1} × ${d}`, v: (o.k - 1) * d }, { t: `+ the first term, ${a}`, v: a + (o.k - 1) * d }];
      if (kind === 'rule') return [{ t: 'The step', v: d }, { t: `${d}n when n = 1`, v: d }, { t: `First term − ${d}: what fixes it?`, v: a - d }];
      const v = a + (o.k - 1) * d;
      return [{ t: 'The step', v: d }, { t: `Distance from the first term: ${v} − ${a}`, v: v - a }, { t: `Steps: ${v - a} ÷ ${d}`, v: o.k - 1 }, { t: 'Plus one for the first term', v: o.k }];
    },
    draw(o) { const v = [0, 1, 2, 3].map((i) => o.a + i * o.d); return kit.barChart(['1st', '2nd', '3rd', '4th'], v, Math.max(2, Math.ceil(Math.max(...v) / 5)), 'The first four terms'); },
  },
  {
    id: 'line-graph', world: 'setisland', band: '11-14', title: 'Straight-line graphs',
    hook: 'y = 2x + 1. When x = 3, where is the point?',
    idea: 'The rule turns every x into its y. m is how much y climbs for each step of x; c is where the line crosses the y-axis.',
    why: [
      'y = 2x + 1 is a machine: put in x, double it, add 1. x = 0 gives 1, x = 1 gives 3, x = 2 gives 5. Plot those points and they sit on one straight line.',
      'Why straight? Each step of 1 to the right always adds the same 2 to y — the same climb, every step, is exactly what "straight" means. That 2 is the gradient, m. The + 1 is where the line starts when x = 0: the crossing point, c.',
      'So from two points you can find m: how far it climbed, divided by how far it went across. From (1, 5) to (3, 11) it climbed 6 in 2 steps: m = 3. It is the nth-term step again, drawn as a picture.',
    ],
    alg: 'y = mx + c   ·   m = (y₂ − y₁) ÷ (x₂ − x₁)',
    ex: { kind: 'y', m: 2, c: 1, x: 3 },
    keys: ['−'],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) { const m = int(1, 2, r), c = int(0, 3, r); return this.q({ kind: 'y', m, c, x: int(1, Math.floor((10 - c) / m), r) }); }
        if (lv === 2) return this.q({ kind: 'y', m: int(2, 6, r), c: int(-5, 9, r), x: int(5, 15, r) });
        const m = int(1, 3, r), c = int(0, 3, r), x1 = int(0, 1, r), x2 = x1 + int(1, Math.floor((10 - c) / m) - x1, r);
        return this.q({ kind: 'm', m, c, x1, x2: Math.max(x2, x1 + 1) });
      });
    },
    q(o) {
      const { kind, m, c } = o, rule = `y = ${m === 1 ? '' : m}x${c ? (c < 0 ? ` − ${-c}` : ` + ${c}`) : ''}`;
      if (kind === 'y') return { ...o, text: `${rule}. What is y when x = ${o.x}?`, expr: `${m}*${o.x}+${js(c)}`, ans: m * o.x + c };
      const y1 = m * o.x1 + c, y2 = m * o.x2 + c;
      return { ...o, text: `A straight line goes through (${o.x1}, ${y1}) and (${o.x2}, ${y2}). What is its gradient m?`, say: `a line through ${o.x1} comma ${y1} and ${o.x2} comma ${y2}: what is its gradient`, expr: `(${y2}-${y1})/(${o.x2}-${o.x1})`, ans: m };
    },
    work(o) {
      const { kind, m, c } = o;
      if (kind === 'y') return [{ t: `${m} × ${o.x}`, v: m * o.x }, { t: c < 0 ? `Take ${-c}` : `Add ${c}`, v: m * o.x + c }];
      const y1 = m * o.x1 + c, y2 = m * o.x2 + c;
      return [{ t: `The climb: ${y2} − ${y1}`, v: y2 - y1 }, { t: `The steps across: ${o.x2} − ${o.x1}`, v: o.x2 - o.x1 }, { t: 'Climb ÷ steps', v: m }];
    },
    draw(o) {
      const pts = {};
      if (o.kind === 'y') { for (let x = 0; x <= 10; x++) { const y = o.m * x + o.c; if (x !== o.x && y >= 0 && y <= 10 && Object.keys(pts).length < 3) pts[`(${x}, ${y})`] = [x, y]; } }
      else { pts.P = [o.x1, o.m * o.x1 + o.c]; pts.Q = [o.x2, o.m * o.x2 + o.c]; }
      return kit.coords(10, pts, 22);
    },
  },
];

/* ------------------------------------------------------------------ stories */

export const STORIES = {
  'set-member': { title: 'The seven-step bridge', scene: 'beach', cast: ['scopey', 'pixel'], beats: [
    { who: null, say: 'On the beach at Set Island, a sign by the rock pools says: only numbers in M = {multiples of 7} may cross. Pip is holding 91.', add: { t: '91' } },
    { who: 'pixel', say: 'Is 91 allowed? I would have to list 7, 14, 21… all the way up. That takes for ever!' },
    { who: 'scopey', say: 'You do not need the list. The set has a rule. Just test your number against it.' },
    { who: 'pixel', say: 'Does 7 go into 91 with nothing left?', add: { t: '91 ÷ 7', v: 13 } },
    { who: 'scopey', say: 'Thirteen exactly. Check it back the other way.', add: { t: '13 × 7', v: 91 } },
    { who: 'pixel', say: 'So 91 is a member of M. I can cross! A rule answers it in one sum.', add: { t: '91 ÷ 7', v: 13 } },
  ] },
  'set-count': { title: 'Shells in a row', scene: 'beach', cast: ['beaker', 'koi'], beats: [
    { who: null, say: 'Rafi and Nova number 100 shells along the sand. Every 6th shell is a spotted one. How many spotted shells?', add: { t: '100 ÷ 6' } },
    { who: 'koi', say: 'Six, twelve, eighteen… I could count them all.' },
    { who: 'beaker', say: 'Find the last one instead. 6 × 16 is 96, and 6 × 17 is 102 — too far.', add: { t: '6 × 16', v: 96 } },
    { who: 'koi', say: 'So the spotted ones are 6 × 1 up to 6 × 16. They are numbered 1 to 16!' },
    { who: 'beaker', say: 'And how many spotted shells between 41 and 47? None — that is the empty set.', add: { t: '47 − 41', v: 6 } },
    { who: 'koi', say: 'Sixteen spotted shells, counted without counting.', add: { t: '96 ÷ 6', v: 16 } },
  ] },
  'union-meet': { title: 'Two teams, one bus', scene: 'bus', cast: ['panda', 'comet'], beats: [
    { who: null, say: 'Team A is shirts 2, 4, 6, 8 and 10. Team B is shirts 3, 6 and 9. Everybody in either team gets on the bus.', add: { t: '5 + 3' } },
    { who: 'comet', say: 'Five plus three — eight seats! Done!', add: { t: '5 + 3', v: 8 } },
    { who: 'panda', say: 'Look again, Dax. Shirt 6 is in both teams. Does one child need two seats?' },
    { who: 'comet', say: 'Oh. The overlap — A intersect B — has one child in it. I counted them twice.', add: { t: '1', v: 1 } },
    { who: 'panda', say: 'So take the double count away once.', add: { t: '5 + 3 − 1', v: 7 } },
    { who: 'comet', say: 'Seven seats for A union B. The shared ones go in once.', add: { t: '5 + 3 − 1', v: 7 } },
  ] },
  'venn-count': { title: 'The club list', scene: 'hall', cast: ['scopey', 'melody'], beats: [
    { who: null, say: 'In the island hall, 14 children sign up for cricket and 11 for chess. 5 signed up for both.', add: { t: '14 + 11' } },
    { who: 'melody', say: 'So 25 children came to sign up.', add: { t: '14 + 11', v: 25 } },
    { who: 'scopey', say: 'Check that. The 5 in both are on the cricket list AND the chess list. You counted them twice.' },
    { who: 'melody', say: 'Draw the circles: cricket only is 9, chess only is 6, and 5 in the middle.', add: { t: '14 − 5', v: 9 } },
    { who: 'scopey', say: 'Add the three parts.', add: { t: '9 + 5 + 6', v: 20 } },
    { who: 'melody', say: 'Twenty children. Add both circles, take the overlap once.', add: { t: '14 + 11 − 5', v: 20 } },
  ] },
  substitute: { title: 'The matchstick pattern', scene: 'room', cast: ['samurai', 'pixel'], beats: [
    { who: null, say: 'Pip builds a row of triangles out of matchsticks. Kwame writes on the board: matches = 3n + 2, for n triangles.', add: { t: '3 × 4 + 2' } },
    { who: 'pixel', say: 'What is n? It is a letter, not a number!' },
    { who: 'samurai', say: 'n is a box. Right now you have 4 triangles, so put 4 in the box.' },
    { who: 'pixel', say: '3n means 3 times n. So 3 times 4…', add: { t: '3 × 4', v: 12 } },
    { who: 'samurai', say: 'Then the plus 2.', add: { t: '12 + 2', v: 14 } },
    { who: 'pixel', say: 'Fourteen matches! And the same rule tells me 40 triangles would need 122.', add: { t: '3 × 4 + 2', v: 14 } },
  ] },
  'subset-count': { title: 'Toppings on the pizza', scene: 'kitchen', cast: ['goldlegend', 'comet'], beats: [
    { who: null, say: 'The island café has 4 toppings: olives, peppers, corn and mushroom. Dax wants to try every different pizza.', add: { t: '2 × 2 × 2 × 2' } },
    { who: 'comet', say: 'One topping, two toppings, three… I keep losing count!' },
    { who: 'goldlegend', say: 'Each topping: on or off. Two choices.', add: { t: '2', v: 2 } },
    { who: 'comet', say: 'Olives on or off, then peppers on or off… so it doubles for every topping!', add: { t: '2 × 2', v: 4 } },
    { who: 'goldlegend', say: 'Four toppings.', add: { t: '2 × 2 × 2 × 2', v: 16 } },
    { who: 'comet', say: 'Sixteen pizzas — and one of them is plain, with no topping at all. The empty set counts too!', add: { t: '2 × 2 × 2 × 2', v: 16 } },
  ] },
  'like-terms': { title: 'The fruit basket', scene: 'market', cast: ['melody', 'koi'], beats: [
    { who: null, say: 'Ines writes the market order in algebra: x for a crate of apples, y for bananas. 3x + 2y + 4x + y.', add: { t: '3 + 4' } },
    { who: 'koi', say: 'Three plus two plus four plus one — ten crates! So 10xy?' },
    { who: 'melody', say: 'Ten crates, yes, but not ten of one thing. Keep apples with apples.', add: { t: '3 + 4', v: 7 } },
    { who: 'koi', say: 'And bananas with bananas. The lone y means one crate.', add: { t: '2 + 1', v: 3 } },
    { who: 'melody', say: 'So it is 7x + 3y. Shorter, and still true for any crate size.' },
    { who: 'koi', say: 'Seven crates of apples and three of bananas. Like with like.', add: { t: '3 + 4', v: 7 } },
  ] },
  'solve-balance': { title: 'The weighing scale', scene: 'shop', cast: ['samurai', 'panda'], beats: [
    { who: null, say: 'On the shop scale: 3 bags of marbles and 4 loose marbles balance 19 loose marbles. Every bag holds the same.', add: { t: '19' } },
    { who: 'panda', say: 'So 3x + 4 = 19. How many marbles in a bag?' },
    { who: 'samurai', say: 'Take 4 loose marbles off both sides. Still level.', add: { t: '19 − 4', v: 15 } },
    { who: 'panda', say: 'Three bags balance fifteen. So share both sides into three.', add: { t: '15 ÷ 3', v: 5 } },
    { who: 'samurai', say: 'Check it on the scale.', add: { t: '3 × 5 + 4', v: 19 } },
    { who: 'panda', say: 'Five marbles in each bag. Same to both sides, always.', add: { t: '(19 − 4) ÷ 3', v: 5 } },
  ] },
  'nth-term': { title: 'Beach huts', scene: 'beach', cast: ['beaker', 'scopey'], beats: [
    { who: null, say: 'Beach hut 1 is 5 metres from the café, hut 2 is 8, hut 3 is 11, hut 4 is 14. How far is hut 20?', add: { t: '5 + 19 × 3' } },
    { who: 'scopey', say: 'Each hut is 3 metres further on. Twenty huts, so 20 steps of 3?' },
    { who: 'beaker', say: 'Careful — hut 1 is already there. From hut 1 to hut 20 is only 19 steps.', add: { t: '20 − 1', v: 19 } },
    { who: 'scopey', say: 'Nineteen steps of three.', add: { t: '19 × 3', v: 57 } },
    { who: 'beaker', say: 'Add the 5 metres to hut 1.', add: { t: '57 + 5', v: 62 } },
    { who: 'scopey', say: 'Sixty-two. And 3 × 20 + 2 agrees: the rule is 3n + 2.', add: { t: '3 × 20 + 2', v: 62 } },
  ] },
  'line-graph': { title: 'The tide post', scene: 'harbour', cast: ['astro', 'comet'], beats: [
    { who: null, say: 'At the harbour, a tide post starts 1 metre deep and the water rises 2 metres every hour: y = 2x + 1.', add: { t: '2 × 3 + 1' } },
    { who: 'comet', say: 'After 3 hours it has gone up… 3 metres? No wait!' },
    { who: 'astro', say: 'Two metres every hour. Three hours of that.', add: { t: '2 × 3', v: 6 } },
    { who: 'comet', say: 'And it started at 1 metre, where the line crosses the side.', add: { t: '6 + 1', v: 7 } },
    { who: 'astro', say: 'Plot the hours and the depths and the points line up straight — the same climb every hour.' },
    { who: 'comet', say: 'Seven metres deep after three hours.', add: { t: '2 × 3 + 1', v: 7 } },
  ] },
};
