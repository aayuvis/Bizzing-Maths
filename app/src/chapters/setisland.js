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
    caseKey: 'kind',
    cases: [
      { label: 'Multiples', note: 'Divide by the number in the rule. Nothing left over means it is a member; any remainder at all means it is not.',
        ex: { kind: 'mult', k: 7, x: 91 } },
      { label: 'Square numbers', note: 'Find the whole number whose square is just under or on it. If that square lands exactly on the number, it is in.',
        ex: { kind: 'sq', x: 50 } },
      { label: 'Factors', note: 'The rule is turned round: now the number must go INTO the big one. 36 ÷ 8 leaves 4 over, so 8 is not a factor.',
        ex: { kind: 'fac', N: 36, x: 8 } },
    ],
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
    caseKey: ['kind', 'empty'],
    cases: [
      { label: 'A run of numbers', note: 'Take the first from the last, then add one — the first number is in the set too, like the first post of a fence.',
        ex: { kind: 'range', a: 12, b: 30 } },
      { label: 'Multiples up to a limit', note: 'Find the last multiple that fits under the limit. Its place in the times table is how many there are.',
        ex: { kind: 'mult', k: 6, N: 100 } },
      { label: 'Multiples between two', note: 'Count the multiples up to the top, then take away the ones that come before the bottom.',
        ex: { kind: 'between', k: 5, a: 23, b: 61 } },
      { label: 'The empty set', note: 'Sometimes the rule lets nothing in at all. That is still a set — the empty set, ∅ — and its count is 0.',
        ex: { kind: 'between', k: 10, a: 41, b: 48 } },
    ],
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
      o = { ...o, empty: o.kind === 'between' && Math.floor(o.b / o.k) === Math.floor((o.a - 1) / o.k) };
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
    caseKey: ['kind', 'op'],
    cases: [
      { label: 'Union of two lists', note: 'Pour both lists into one bag, but a shared member goes in only once: add the two counts, then take the shared ones away.',
        ex: { kind: 'list', A: [2, 4, 6, 8, 10], B: [3, 6, 9], op: '∪' } },
      { label: 'Intersection of two lists', note: 'Keep only what is in BOTH lists — walk along one list and tick each member that the other list has too.',
        ex: { kind: 'list', A: [1, 3, 5, 7, 9], B: [3, 4, 5, 6], op: '∩' } },
      { label: 'Intersection by rule', note: 'A multiple of 4 AND of 6 is a multiple of their lowest common multiple, 12 — so count the multiples of 12.',
        ex: { kind: 'rule', a: 4, b: 6, N: 50, op: '∩' } },
      { label: 'Union by rule', note: 'Count each rule on its own and add — but the common multiples were counted twice, so take them away once.',
        ex: { kind: 'rule', a: 3, b: 5, N: 40, op: '∪' } },
    ],
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
    caseKey: 'kind',
    cases: [
      { label: 'Add the three parts', note: 'When the diagram shows every part, each child is in exactly one part — so just add them up.',
        ex: { kind: 'regions', la: 'Cricket', lb: 'Chess', A: 14, B: 11, I: 5 } },
      { label: 'Add, then take the overlap', note: 'The totals for each circle both include the middle, so adding them counts the middle twice. Take it away once.',
        ex: { kind: 'union', la: 'Cricket', lb: 'Chess', A: 14, B: 11, I: 5 } },
      { label: 'Find the overlap', note: 'Backwards: the class minus "neither" is everyone in the circles. Adding the two circles overshoots — by exactly the ones in both.',
        ex: { kind: 'both', la: 'Cricket', lb: 'Chess', A: 14, B: 11, I: 5, out: 4 } },
    ],
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
      'The order still matters: multiply before you add. And a number just outside brackets multiplies everything inside: 4(n − 2) with n = 6 is 4 × 4 = 16. n² means n × n, so a negative in the box comes out positive: (−3) × (−3) = 9. And with two letters, each gets its own number.',
    ],
    alg: 'an + b with n = k  →  a × k + b',
    ex: { kind: 'lin', a: 3, b: 2, n: 4 },
    caseKey: 'kind',
    cases: [
      { label: 'Times, then add', note: '3n is 3 × n — the × is hidden. Do the multiplying first, then the adding or taking away.',
        ex: { kind: 'lin', a: 3, b: 2, n: 4 } },
      { label: 'Brackets first', note: 'A number outside brackets multiplies the whole bracket, so work out the inside first.',
        ex: { kind: 'bra', a: 4, b: 2, n: 6 } },
      { label: 'Squaring a negative', note: 'n² is n × n. With a negative in the box, negative times negative is positive — so the square is never below zero.',
        ex: { kind: 'sq', a: 2, b: 5, n: -3 } },
      { label: 'Two letters', note: 'Each letter has its own number. Fill both boxes, work out each term, then add — a negative term takes away.',
        ex: { kind: 'two', a: 3, c: 2, x: 4, y: -2 } },
    ],
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
    caseKey: 'kind',
    cases: [
      { label: 'All the subsets', note: 'Every member is in or out — two choices each — so double for every member. The empty set and the whole set both count.',
        ex: { kind: 'all', n: 4 } },
      { label: 'Not empty', note: 'Only one subset has every member out: the empty set. Count them all, then take away that one.',
        ex: { kind: 'nonempty', n: 4 } },
      { label: 'Must contain a', note: 'a has no choice now — it is in. Only the other members get in-or-out, so there are half as many.',
        ex: { kind: 'with', n: 5 } },
    ],
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
    caseKey: 'kind',
    cases: [
      { label: 'One letter', note: 'Every term is the same kind of thing, so just add the numbers in front. A letter on its own means 1 of it.',
        ex: { kind: 'coef', v: 'm', cs: [4, 1, 3] } },
      { label: 'Two letters', note: 'Keep x\'s with x\'s and y\'s with y\'s. The answer has two terms — you cannot add apples to bananas.',
        ex: { kind: 'pick', a: 3, b: 2, c: 4, d: 1 } },
      { label: 'Taking away x\'s', note: 'The minus sign belongs to the term after it. More x\'s taken than you had leaves a negative number in front.',
        ex: { kind: 'neg', a: 5, p: 3, c: 8, q: 2 } },
    ],
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
    caseKey: 'kind',
    cases: [
      { label: 'Undo an add', note: 'Something was added to x. Take the same amount off both sides and x stands alone.',
        ex: { kind: 'add', b: 7, x: 9 } },
      { label: 'Undo a times', note: '4x means four x\'s. Share both sides into four equal parts to find one x.',
        ex: { kind: 'mul', a: 4, x: 6 } },
      { label: 'Two steps', note: 'Undo the last thing first: take away the plain number, THEN share. Doing it the other way round breaks the balance sum.',
        ex: { kind: 'two', a: 3, b: 4, x: 5 } },
      { label: 'Words into an equation', note: 'Write the words as an equation first. Here a number was taken away, so undo it by adding to both sides.',
        ex: { kind: 'words', a: 4, b: -3, x: 7 } },
    ],
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
    caseKey: 'kind',
    cases: [
      { label: 'Find a far term', note: 'From the 1st term to the 20th is 19 steps, not 20 — the first term is there before any step.',
        ex: { kind: 'kth', a: 5, d: 3, k: 20 } },
      { label: 'The nth-term rule', note: 'The step is the times table. Compare the first term with the step: whatever you add (or take) to fix it is the number in the box.',
        ex: { kind: 'rule', a: 7, d: 4 } },
      { label: 'Which term is it?', note: 'Run it backwards: how far from the first term, how many steps is that, then add one for the first term.',
        ex: { kind: 'which', a: 5, d: 3, k: 15 } },
    ],
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
    caseKey: 'kind',
    cases: [
      { label: 'Find y from the rule', note: 'Put x into the rule: times by m, then add c. Every point on the line obeys it.',
        ex: { kind: 'y', m: 2, c: 1, x: 3 } },
      { label: 'Gradient from two points', note: 'The gradient is the climb divided by the steps across. Take the y\'s from each other, then the x\'s, then divide.',
        ex: { kind: 'm', m: 3, c: 2, x1: 1, x2: 3 } },
    ],
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

