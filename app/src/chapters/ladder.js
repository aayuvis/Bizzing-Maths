/* ladder.js — The Sutra Ladder: the deep half of the Vedic methods.

   The Sutra Observatory teaches the party pieces: multiplying near a base,
   squaring numbers that end in 5, vertically and crosswise. This world climbs
   on from there, to the methods in Bharati Krishna Tirtha's book (1965) that
   do real work — dividing by 9, by numbers near a base and by any two- or
   three-digit number in one line; the duplex, and square and cube roots read
   off by sight or worked by duplex division; divisibility by osculators;
   recurring decimals by "one more than the one before"; and equations and
   quadratics. The last stop asks which method fits a sum, by a rule written
   in code.

   The honest label holds here as it does in the Observatory: the sutras come
   from a twentieth-century book, not from any Vedic text scholars have found.
   Every stop cites the book, is marked for a second reader, and shows the
   ordinary algebra that makes its method work. Contract: docs/CHAPTER-CONTRACT.md. */

import { int, pick, shuffle, seeded } from '../rand.js';

/* The same citation the Observatory and the Library's journey give. */
const TIRTHA = 'Bharati Krishna Tirtha, Vedic Mathematics (Motilal Banarsidass, 1965).';
const SRC = [TIRTHA];

export const WORLD = {
  id: 'ladder', name: 'The Sutra Ladder', short: 'Ladder', band: '8-10',
  blurb: 'Climb past the Observatory: dividing, roots, recurring decimals and equations, the Vedic way — and why each one works.',
  tint: '#F7ECE6', ink: '#6A2B48', glyph: '🪜',
};

/* ---------------------------------------------------------------- helpers */

const digits = (n) => String(n).split('').map(Number);
const dsum = (n) => digits(n).reduce((a, b) => a + b, 0);
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const leaks = (q) => !q.choices && String(q.ans).length > 1 && q.text.split(/[^0-9./]/).includes(String(q.ans));
/* Re-roll until the question is good: `make` returns null for a reject. */
function fresh(make) {
  let q = null;
  for (let i = 0; i < 400; i++) { q = make(); if (q && !q.reject && !leaks(q)) return q; }
  throw new Error('ladder: generator could not find a question');
}
const YN = ['Yes', 'No'];
const yn = (b) => (b ? 'Yes' : 'No');
const neg = (n) => (n < 0 ? '−' + Math.abs(n) : String(n));
const par = (n) => (n < 0 ? `(−${Math.abs(n)})` : String(n));
const ord = (k) => k + (k % 100 >= 11 && k % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][k % 10] || 'th');
/* "3x + 2y", "x − 4y" */
function lin(a, b) {
  const t = (c, v, first) => {
    const m = Math.abs(c) === 1 ? v : Math.abs(c) + v;
    return first ? (c < 0 ? '−' + m : m) : (c < 0 ? ' − ' : ' + ') + m;
  };
  return t(a, 'x', true) + t(b, 'y', false);
}
/* "x² − 5x + 6", "6x² + 7x + 2" */
function quad(a, b, c) {
  const lead = a === 1 ? 'x²' : `${a}x²`;
  const mid = b === 0 ? '' : (b < 0 ? ' − ' : ' + ') + (Math.abs(b) === 1 ? 'x' : Math.abs(b) + 'x');
  return lead + mid + (c < 0 ? ' − ' : ' + ') + Math.abs(c);
}

/* ---- dividing by 9: running totals of the digits */
function nineCols(N) {
  const d = digits(N), run = []; let s = 0;
  for (const x of d) { s += x; run.push(s); }
  return { cols: run.slice(0, -1), s };
}

/* ---- straight division (the flag). Divisor D: its first digit m does the
   dividing; the rest are the flag digits f. Column by column: gross = the
   remainder carried in front of the next digit, less flag × the quotient
   digits already found; quotient digit = gross ÷ m. A quotient digit is taken
   one less when the next column would otherwise go below zero. Returns null
   if the column method would need a digit over 9 (the generator re-rolls). */
function flagDiv(N, D) {
  const ds = digits(D), m = ds[0], f = ds.slice(1), k = f.length;
  const n = digits(N);
  if (n[0] < m) n.splice(0, 2, n[0] * 10 + n[1]);   // too small to divide: take the first two digits together
  const L = n.length, cols = L - k;
  if (cols < 1) return null;
  const Q = [], G = [], back = [], rin = [];
  let r = 0;
  const grossAt = (j, rr, QQ) => { let g = 10 * rr + n[j]; for (let i = 1; i <= k; i++) if (j - i >= 0) g -= f[i - 1] * QQ[j - i]; return g; };
  const remOf = (rr, QQ) => {   // the remainder zone, worked the same way, read as one number
    let R = rr;
    for (let c = cols; c < L; c++) {
      let g = n[c];
      for (let i = 1; i <= k; i++) { const j = c - i; if (j >= 0 && j < cols && i <= k) g -= f[i - 1] * QQ[j]; }
      R = R * 10 + g;
    }
    return R;
  };
  for (let j = 0; j < cols; j++) {
    const g = j === 0 ? n[0] : grossAt(j, r, Q);
    if (g < 0) return null;
    G.push(g); rin.push(r);
    let q = Math.floor(g / m), lowered = false;
    for (;;) {
      if (q < 0) return null;
      const QQ = [...Q, q], rr = g - m * q;
      const next = j + 1 < cols ? grossAt(j + 1, rr, QQ) : remOf(rr, QQ);
      if (next >= 0) break;
      q--; lowered = true;
    }
    if (q > 9) return null;
    Q.push(q); back.push(lowered); r = g - m * q;
  }
  const R = remOf(r, Q), Qn = Q.reduce((s, x) => s * 10 + x, 0);
  return { m, f, k, n, Q, G, back, rin, R, Qn, r };
}

/* ---- the duplex */
const duplex = (ds) => {
  let s = 0; const n = ds.length;
  for (let i = 0; i < Math.floor(n / 2); i++) s += 2 * ds[i] * ds[n - 1 - i];
  if (n % 2) s += ds[(n - 1) / 2] ** 2;
  return s;
};
const sqCols = (N) => { const d = digits(N), n = d.length, out = []; for (let t = 0; t <= 2 * n - 2; t++) out.push(duplex(d.slice(Math.max(0, t - n + 1), Math.min(t, n - 1) + 1))); return out; };

/* ---- square roots by sight */
const SQ_END = { 0: [0], 1: [1, 9], 4: [2, 8], 5: [5], 6: [4, 6], 9: [3, 7] };
const isqrt = (n) => { let t = Math.floor(Math.sqrt(n)); while (t * t > n) t--; while ((t + 1) * (t + 1) <= n) t++; return t; };
const icbrt = (n) => { let t = Math.floor(Math.cbrt(n)); while (t ** 3 > n) t--; while ((t + 1) ** 3 <= n) t++; return t; };

/* ---- square roots by duplex division, for a three-digit root. The first
   group gives the first digit a; the divisor is 2a; each later column brings
   down a digit and takes off the duplex of the root digits found after a.
   A digit is taken one less (or capped at 9) when the next column would go
   below zero. */
function rootLong(N) {
  const s = String(N), g1len = s.length % 2 ? 1 : 2;
  const g1 = Number(s.slice(0, g1len)), rest = digits(s.slice(g1len));
  if (rest.length !== 4) return null;
  const a = isqrt(g1), dv = 2 * a, r0 = g1 - a * a;
  const gross1 = 10 * r0 + rest[0];
  const after = (b, c) => {   // the columns after b (and c) — must never go below zero; the last must be zero
    const rem1 = gross1 - dv * b;
    const gross2 = 10 * rem1 + rest[1] - b * b;
    if (c === undefined) return { gross2 };
    const rem2 = gross2 - dv * c;
    const col3 = 10 * rem2 + rest[2] - 2 * b * c;
    const col4 = 10 * col3 + rest[3] - c * c;
    return { gross2, col3, col4 };
  };
  let b = Math.min(9, Math.floor(gross1 / dv)), backB = b < Math.floor(gross1 / dv);
  while (b >= 0 && after(b).gross2 < 0) { b--; backB = true; }
  if (b < 0) return null;
  const { gross2 } = after(b);
  let c = Math.min(9, Math.floor(gross2 / dv)), backC = c < Math.floor(gross2 / dv);
  while (c >= 0 && (after(b, c).col3 < 0 || after(b, c).col4 < 0)) { c--; backC = true; }
  if (c < 0) return null;
  const { col3, col4 } = after(b, c);
  return { g1, a, dv, r0, d: rest, gross1, b, rem1: gross1 - dv * b, gross2, c, col3, col4, back: backB || backC, root: 100 * a + 10 * b + c };
}

/* ---- cube roots by sight: the last digit of a cube names the last digit of its root */
const CUBE_END = { 0: 0, 1: 1, 2: 8, 3: 7, 4: 4, 5: 5, 6: 6, 7: 3, 8: 2, 9: 9 };

/* ---- osculators: p × k ends in 9, and one more than the digits before that 9 */
const toNine = (p) => [1, 3, 7, 9].find((k) => (p * k) % 10 === 9);
const oscOf = (p) => (p * toNine(p) + 1) / 10;
function osculate(N, p) {
  const m = oscOf(p), chain = [N];
  let x = N;
  while (x >= 100 && chain.length < 4) {
    const y = Math.floor(x / 10) + m * (x % 10);
    if (y >= x) break;
    chain.push(y); x = y;
  }
  return { m, chain };
}

/* ---- recurring decimals of 1 ÷ p, p ending in 9 */
const ekadhikaOf = (p) => (p + 1) / 10;
function periodOf(p) { let r = 10 % p, n = 1; while (r !== 1) { r = (r * 10) % p; n++; } return n; }
/* left to right: divide by the Ekādhika; each new dividend is the remainder in front of the digit just found */
function divDigits(p, k) {
  const m = ekadhikaOf(p), out = []; let x = 1;
  for (let j = 0; j < k; j++) { const d = Math.floor(x / m), r = x - m * d; out.push({ x, d, r }); x = 10 * r + d; }
  return out;
}
/* right to left: the block ends in 1; each digit to the left is m × the digit to its right, plus the carry */
function mulDigits(p, k) {
  const m = ekadhikaOf(p), out = [{ e: 1, carry: 0, from: null }]; let carry = 0, e = 1;
  for (let j = 1; j < k; j++) { const t = m * e + carry; out.push({ e: t % 10, from: e, carryIn: carry, t }); carry = Math.floor(t / 10); e = t % 10; }
  return out;
}
const PERIOD = { 19: 18, 29: 28, 39: 6, 49: 42, 59: 58 };

/* ---- the method that fits a product, by a rule */
const M_NIK = 'Nikhilam: near a base', M_TEN = 'Last digits make ten', M_UT = 'Vertically and crosswise';
const METHODS = [M_NIK, M_TEN, M_UT];
const sameFrontTen = (a, b) => Math.floor(a / 10) === Math.floor(b / 10) && (a % 10) + (b % 10) === 10;
const nearBase = (a, b) => [100, 1000].find((B) => Math.abs(a - B) * 10 <= B && Math.abs(b - B) * 10 <= B) || 0;

/* ================================================================ stops */

const STOPS = [
  /* ---------------------------------------------------------- 1. ÷ 9 */
  {
    id: 'nine-division', world: 'ladder', band: '8-10', title: 'Dividing by 9, digit by digit',
    sutra: { sa: 'Nikhilam Navataścaramaṁ Daśataḥ', en: 'all from nine and the last from ten' },
    sources: SRC, needsReview: true,
    hook: '1232 ÷ 9 — the answer and the remainder, with no times table at all.',
    idea: 'Keep a running total of the digits: the totals are the answer, and the total of ALL the digits is the remainder.',
    why: [
      '1232 ÷ 9. Running totals of the digits: 1, then 1 + 2 = 3, then 3 + 3 = 6. Those are the answer, 136. All four digits add to 8, and that is the remainder. Check: 136 × 9 = 1224, and 1224 + 8 = 1232.',
      'Why: every 10 is one 9 with 1 left over. So 1000 is 111 nines and 1, 200 is 22 nines and 2, 30 is 3 nines and 3. Add up the nines — 111 + 22 + 3 — and you get exactly the running totals read as a number; add up the leftovers — 1 + 2 + 3 + 2 — and you get the digit total.',
      'If the digit total is 9 or more, it still holds some nines. 1357: totals 1, 4, 9 make 149, and the digits add to 16. 16 is one more 9 and 7, so the answer is 150, remainder 7.',
    ],
    alg: 'N = 9 × (running totals, read with carries) + (sum of all the digits)',
    ex: { N: 1232, ask: 'quotient' },
    caseKey: ['ask', 'fix'],
    cases: [
      { label: 'The answer', note: 'The running totals of the digits, read as one number, are the answer.', ex: { N: 1232, ask: 'quotient' } },
      { label: 'The remainder', note: 'Add up every digit. While that total is under 9, it is the remainder.', ex: { N: 2104, ask: 'remainder' } },
      { label: 'A nine in the total', note: 'The digits add to 9 or more: that total holds another 9, so the answer goes up by one.', ex: { N: 1357, ask: 'quotient' } },
      { label: 'Fixing the remainder', note: 'The digits add to 9 or more: take out the nines, and what is left is the true remainder.', ex: { N: 4728, ask: 'remainder' } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const ask = r() < 0.5 ? 'quotient' : 'remainder';
        if (lv === 1) {
          const len = int(2, 3, r), d = [int(1, 4, r)];
          while (d.length < len) d.push(int(0, 3, r));
          const N = Number(d.join(''));
          return dsum(N) < 9 ? this.q({ N, ask }) : null;
        }
        return this.q({ N: lv === 2 ? int(102, 999, r) : int(1001, 9999, r), ask });
      });
    },
    q({ N, ask }) {
      const s = dsum(N);
      return { N, ask, fix: s >= 9 ? 'yes' : 'no', text: ask === 'quotient' ? `${N} ÷ 9: how many whole 9s?` : `${N} ÷ 9: the remainder?`,
        say: `${N} divided by 9: what is the ${ask === 'quotient' ? 'answer' : 'remainder'}?`,
        expr: ask === 'quotient' ? `Math.floor(${N}/9)` : `${N}%9`, ans: ask === 'quotient' ? Math.floor(N / 9) : N % 9 };
    },
    work({ N, ask }) {
      const { cols, s } = nineCols(N), Q0 = (N - s) / 9;
      const steps = [
        { t: cols.length > 1 ? `Running totals: ${cols.join(' | ')}. Read them as one number, carrying` : `The answer column is the first digit`, v: Q0 },
        { t: 'Add ALL the digits: the remainder column', v: s },
      ];
      const k = Math.floor(s / 9);
      if (k > 0) steps.push(ask === 'quotient' ? { t: `${s} holds ${k} more 9${k > 1 ? 's' : ''}: ${Q0} + ${k}`, v: Q0 + k } : { t: `${s} holds ${k} more 9${k > 1 ? 's' : ''}: ${s} − ${9 * k}`, v: s - 9 * k });
      else if (ask === 'quotient') steps.push({ t: `${s} is less than 9, so nothing moves. The answer`, v: Q0 });
      return steps;
    },
  },

  /* ---------------------------------------------------------- 2. near a base */
  {
    id: 'base-division', world: 'ladder', band: '8-10', title: 'Dividing near a base',
    sutra: { sa: 'Nikhilam Navataścaramaṁ Daśataḥ', en: 'all from nine and the last from ten' },
    sources: SRC, needsReview: true,
    hook: '2391 ÷ 98 — without a single trial multiplication.',
    idea: 'Each 100 holds one 98 with 2 to spare. Count the hundreds, collect the spares, and add on the end.',
    why: [
      '2391 ÷ 98. 98 is 2 short of 100, so every hundred holds one 98 with 2 spare. 2391 is 23 hundreds and 91. The 23 hundreds give 23 nines-and-eights — 23 lots of 98 — and 23 × 2 = 46 spare.',
      'Add the spare to the 91 on the end: 137. If that is less than 98, you are done. It is not — 137 holds one more 98, with 39 left. So the answer is 24, remainder 39. The book sets this out in columns (the divisor\'s "complement", 2, written under it); the columns are this same sum.',
      'It works for any divisor just under a base: ÷ 8 (2 short of 10), ÷ 97 (3 short of 100), ÷ 997 (3 short of 1000). The closer the divisor is to the base, the smaller the spares — which is why the method is quickest there.',
    ],
    alg: 'N = a·B + b = a·(B − c) + (a·c + b),  so  N ÷ (B − c) = a, remainder a·c + b (if that is less than B − c)',
    ex: { N: 1234, d: 98, ask: 'quotient' },
    caseKey: ['ask', 'fix'],
    cases: [
      { label: 'The answer', note: 'Count the hundreds (or tens, or thousands). If the spares plus the end stay under the divisor, that count is the answer.', ex: { N: 1234, d: 98, ask: 'quotient' } },
      { label: 'The remainder', note: 'The spares, plus the digits on the end, are the remainder.', ex: { N: 23, d: 8, ask: 'remainder' } },
      { label: 'One more fits (answer)', note: 'The spares plus the end make more than the divisor: one more fits, so the answer goes up by one.', ex: { N: 2391, d: 98, ask: 'quotient' } },
      { label: 'One more fits (remainder)', note: 'Too much left over: take one more divisor out of it to leave the true remainder.', ex: { N: 4987, d: 997, ask: 'remainder' } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const ask = r() < 0.5 ? 'quotient' : 'remainder';
        let d, B, a;
        if (lv === 1) { d = pick([7, 8], r); B = 10; a = int(1, 9, r); }
        else if (lv === 2) { d = int(95, 99, r); B = 100; a = int(2, 60, r); }
        else if (r() < 0.5) { d = int(88, 94, r); B = 100; a = int(10, 90, r); }
        else { d = int(991, 998, r); B = 1000; a = int(2, 99, r); }
        const N = a * B + int(0, B - 1, r), c = B - d;
        return a * c + (N % B) < 2 * d ? this.q({ N, d, ask }) : null;
      });
    },
    q({ N, d, ask }) {
      const B = 10 ** String(d).length, c = B - d, a = Math.floor(N / B), R1 = a * c + (N % B);
      return { N, d, ask, fix: R1 >= d ? 'yes' : 'no', text: ask === 'quotient' ? `${N} ÷ ${d}: how many whole ${d}s?` : `${N} ÷ ${d}: the remainder?`,
        say: `${N} divided by ${d}: what is the ${ask === 'quotient' ? 'answer' : 'remainder'}?`,
        expr: ask === 'quotient' ? `Math.floor(${N}/${d})` : `${N}%${d}`, ans: ask === 'quotient' ? Math.floor(N / d) : N % d };
    },
    work({ N, d, ask }) {
      const B = 10 ** String(d).length, c = B - d, a = Math.floor(N / B), b = N % B, R1 = a * c + b;
      const steps = [
        { t: `${d} is how far below ${B}?`, v: c },
        { t: `${N} is ${a} lot${a > 1 ? 's' : ''} of ${B} and ${b}. Spares: ${a} × ${c}`, v: a * c },
        { t: `Spares plus the end: ${a * c} + ${b}`, v: R1 },
      ];
      if (R1 >= d) steps.push(ask === 'quotient' ? { t: `${R1} holds one more ${d}: ${a} + 1`, v: a + 1 } : { t: `${R1} holds one more ${d}: ${R1} − ${d}`, v: R1 - d });
      else if (ask === 'quotient') steps.push({ t: `${R1} is less than ${d}, so the answer is the count`, v: a });
      return steps;
    },
  },

  /* ---------------------------------------------------------- 3. the flag */
  {
    id: 'flag-division', world: 'ladder', band: '11-14', title: 'Straight division: the flag',
    sutra: { sa: 'Ūrdhva-tiryagbhyām', en: 'vertically and crosswise' },
    sources: SRC, needsReview: true,
    hook: '1748 ÷ 23 — any two-digit divisor, in one line.',
    idea: 'Divide by the first digit only. The other digit is a "flag": before each step, take flag × the last answer digit away.',
    why: [
      '1748 ÷ 23: divide by 2 alone, and fly the 3 as a flag. 1 ÷ 2? No, so start with 17: 8, remainder 1 — but use 7, remainder 3, because the next step must not go below zero. Carry the 3 in front of the 4: 34, take away flag × 7 = 21, leaves 13. 13 ÷ 2 = 6, remainder 1. Carry it in front of the 8: 18, take away flag × 6 = 18: remainder 0. Answer 76.',
      'Why: 23 is 20 + 3. Dividing by the 2 shares out the twenties; every time you write an answer digit q, you have also promised q lots of 3, one column further on. Taking flag × q away in the next column pays that promise before you divide again — it is the crosswise step of vertically and crosswise, run backwards.',
      'The book calls the second digit the flag (dhvajāṅka) and the method straight division. With a three-digit divisor there are two flag digits, and each column pays for the last two answer digits. Every column must stay at zero or above: if it would not, take the answer digit before it one less.',
    ],
    alg: 'N = (10m + f)·Q + R: each column = (carried remainder)·10 + next digit − f × previous answer digit; answer digit = column ÷ m',
    ex: { N: 1748, D: 23 },
    caseKey: 'kind',
    cases: [
      { label: 'One flag', note: 'Each column: carry the remainder, take off flag × the last answer digit, then divide by the first digit.', ex: { N: 851, D: 37 } },
      { label: 'One flag, one less', note: 'A column would go below zero, so the answer digit before it is taken one less — and the remainder grows to pay for it.', ex: { N: 1748, D: 23 } },
      { label: 'Two flags', note: 'A three-digit divisor flies two flag digits. Each column pays for the last TWO answer digits: first flag × the newer one, second flag × the one before.', ex: { N: 26838, D: 213 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const D = lv === 3 ? int(2, 5, r) * 100 + int(11, 99, r) : int(lv === 1 ? 21 : 21, lv === 1 ? 49 : 89, r);
        if (D % 10 === 0) return null;
        const want = lv === 1 ? 3 : lv === 2 ? 4 : 5;
        const lo = Math.ceil(10 ** (want - 1) / D), hi = Math.floor((10 ** want - 1) / D);
        if (lo > hi) return null;
        const N = D * int(lo, hi, r) + int(0, D - 1, r);
        if (String(N).length !== want || flagDiv(N, D) === null || flagDiv(N, D).Q.length + 2 > 5) return null;
        if (Math.floor(N / D) < (lv === 1 ? 10 : lv === 2 ? 40 : 100)) return null;
        return this.q({ N, D });
      });
    },
    q({ N, D }) {
      const fd = flagDiv(N, D);
      // no check against the true answer here: the column method's own result is the trick's
      // last step, and test/tricks.mjs compares it with ans and expr — a wrong method must fail there
      const kind = !fd ? 'none' : fd.k === 2 ? 'two flags' : fd.back.some(Boolean) ? 'one less' : 'one flag';
      return { N, D, kind, text: `${N} ÷ ${D}: how many whole ${D}s?`, say: `${N} divided by ${D}: the whole-number answer?`,
        expr: `Math.floor(${N}/${D})`, ans: Math.floor(N / D), ...(fd ? {} : { reject: true }) };
    },
    work({ N, D }) {
      const fd = flagDiv(N, D), n = fd.n;
      const fl = fd.f.join(' and ');
      const steps = fd.Q.map((q, j) => {
        const g = fd.G[j];
        let prev = `${10 * fd.rin[j] + n[j]}`;
        for (let i = 1; i <= fd.k; i++) if (j - i >= 0) prev += ` − ${fd.f[i - 1]} × ${fd.Q[j - i]}`;
        const t = j === 0 ? `Divide by ${fd.m} (flag ${fl}): ${n[0]} ÷ ${fd.m}` : `Next column: ${prev} = ${g}. ${g} ÷ ${fd.m}`;
        return { t: t + (fd.back[j] ? ' — one less, or the next column goes below zero' : ''), v: q };
      });
      steps.push({ t: 'What is left in the last column: the remainder', v: fd.R });
      steps.push({ t: `Read the answer digits ${fd.Q.join(' ')}`, v: fd.Qn });
      return steps;
    },
  },

  /* ---------------------------------------------------------- 4. the duplex */
  {
    id: 'duplex', world: 'ladder', band: '11-14', title: 'The duplex, and any square',
    sutra: { sa: 'Ūrdhva-tiryagbhyām', en: 'vertically and crosswise' },
    sources: SRC, needsReview: true,
    hook: '473² — a three-digit square, written down left to right.',
    idea: 'The duplex of a row of digits is twice each outer-and-inner pair, plus the middle digit squared. A square is its duplexes, column by column.',
    why: [
      'The duplex of one digit is its square: D(7) = 49. Of two digits, twice their product: D(47) = 2 × 4 × 7 = 56. Of three, twice the outer pair plus the middle squared: D(473) = 2 × 4 × 3 + 7² = 73. Of four, twice the outer pair plus twice the inner pair.',
      'Why: square 473 by vertically and crosswise and look at each column. The hundreds column collects 4 × 3 + 7 × 7 + 3 × 4 — the same pair twice, and the middle once. That is the duplex. Every column of a square is a duplex, because both numbers are the same.',
      'So 473² is the duplexes of 4, 47, 473, 73 and 3: 16 | 56 | 73 | 42 | 9. Carry from the right: 9; 42 → 2 carry 4; 73 + 4 = 77 → 7 carry 7; 56 + 7 = 63 → 3 carry 6; 16 + 6 = 22. Answer 223729.',
    ],
    alg: '(100a + 10b + c)² = a²·10⁴ + 2ab·10³ + (2ac + b²)·10² + 2bc·10 + c²',
    ex: { n: 473, mode: 'square' },
    caseKey: 'idea',
    cases: [
      { label: 'Duplex of two digits', note: 'Two digits: multiply them, and double it.', ex: { n: 47, mode: 'duplex' } },
      { label: 'Duplex of three digits', note: 'Three digits: twice the outer pair, plus the middle digit squared.', ex: { n: 473, mode: 'duplex' } },
      { label: 'Duplex of four digits', note: 'Four digits: no middle digit, so twice the outer pair plus twice the inner pair.', ex: { n: 2315, mode: 'duplex' } },
      { label: 'A whole square', note: 'Write the duplex of each column, left to right, then carry from the right.', ex: { n: 473, mode: 'square' } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const nz = (n) => (String(n).includes('0') ? null : this.q({ n, mode: 'duplex' }));
        if (lv === 1) return nz(r() < 0.5 ? int(12, 98, r) : int(102, 989, r));
        if (lv === 2) return r() < 0.5 ? nz(r() < 0.5 ? int(102, 989, r) : int(1012, 9898, r)) : this.q({ n: int(101, 499, r), mode: 'square' });
        return this.q({ n: r() < 0.6 ? int(101, 999, r) : int(1001, 4999, r), mode: 'square' });
      });
    },
    q({ n, mode }) {
      const d = digits(n);
      if (mode === 'square') return { n, mode, idea: 'square', text: `${n}²`, say: `${n} squared`, expr: `${n}*${n}`, ans: n * n };
      const ex = d.length === 2 ? `2*${d[0]}*${d[1]}` : d.length === 3 ? `2*${d[0]}*${d[2]}+${d[1]}*${d[1]}` : `2*${d[0]}*${d[3]}+2*${d[1]}*${d[2]}`;
      return { n, mode, idea: `D${d.length}`, text: `The duplex of ${n}`, say: `the duplex of ${d.join(' ')}`, expr: ex, ans: duplex(d) };
    },
    work({ n, mode }) {
      const d = digits(n);
      if (mode === 'duplex') {
        if (d.length === 2) return [{ t: `${d[0]} × ${d[1]}`, v: d[0] * d[1] }, { t: 'Double it', v: 2 * d[0] * d[1] }];
        if (d.length === 3) return [{ t: `Twice the outer pair: 2 × ${d[0]} × ${d[2]}`, v: 2 * d[0] * d[2] }, { t: `The middle, squared: ${d[1]}²`, v: d[1] ** 2 }, { t: 'Add them', v: duplex(d) }];
        return [{ t: `Twice the outer pair: 2 × ${d[0]} × ${d[3]}`, v: 2 * d[0] * d[3] }, { t: `Twice the inner pair: 2 × ${d[1]} × ${d[2]}`, v: 2 * d[1] * d[2] }, { t: 'Add them', v: duplex(d) }];
      }
      const c = sqCols(n), s = d.join('');
      const mid = d.length === 3 ? [1, 2, 3] : [2, 3, 4];
      const seg = (t) => s.slice(Math.max(0, t - d.length + 1), Math.min(t, d.length - 1) + 1);
      return [
        ...mid.map((t) => ({ t: `Duplex of ${seg(t)}`, v: c[t] })),
        { t: `Columns ${c.join(' | ')}: carry from the right`, v: n * n },
      ];
    },
  },

  /* ---------------------------------------------------------- 5. √ by sight */
  {
    id: 'root-by-sight', world: 'ladder', band: '11-14', title: 'Square roots by sight',
    sutra: { sa: 'Vilokanam', en: 'by mere observation', sub: true },
    sources: SRC, needsReview: true,
    hook: '√5776 — in your head, in two looks.',
    idea: 'The last digit gives two possible endings; the first group gives the tens and decides which ending it is.',
    why: [
      'Squares can only end in 0, 1, 4, 5, 6 or 9, and each ending comes from just one or two last digits: a square ending in 6 has a root ending in 4 or 6, because 4² = 16 and 6² = 36. That is look one.',
      'Look two: cover the last two digits. 5776 leaves 57. The biggest square not over 57 is 49 = 7², so the root is in the seventies: 74 or 76. To choose, remember that 75² = 7 × 8 hundreds and 25 = 5625. 5776 is bigger, so it is 76.',
      'You never need 75² itself: 7 × 8 = 56, and 57 is at least 56, so take the higher ending. If the first group were below 56, the lower one. A root ending in 5 or 0 has only one choice.',
    ],
    alg: '(10t + 5)² = 100·t(t + 1) + 25, so the root is above 10t + 5 exactly when the first group is at least t(t + 1)',
    ex: { N: 5776 },
    caseKey: 'pick',
    cases: [
      { label: 'Only one ending', note: 'The square ends in 5 or 0, so the root has only one possible last digit.', ex: { N: 4225 } },
      { label: 'The lower ending', note: 'The first group is less than t × (t + 1), so the root is below t5: take the lower ending.', ex: { N: 2809 } },
      { label: 'The higher ending', note: 'The first group is at least t × (t + 1), so the root is above t5: take the higher ending.', ex: { N: 5776 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => { const x = lv === 1 ? int(11, 31, r) : lv === 2 ? int(32, 99, r) : int(11, 99, r); return this.q({ N: x * x }); });
    },
    q({ N }) {
      const root = isqrt(N), cands = SQ_END[N % 10], g = Math.floor(N / 100), t = isqrt(g);
      const pick2 = cands.length === 1 ? 'one' : root % 10 === Math.max(...cands) ? 'higher' : 'lower';
      return { N, pick: pick2, text: `√${N}`, say: `the square root of ${N}`, expr: `Math.round(Math.sqrt(${N}))`, ans: root };
    },
    work({ N }) {
      const cands = SQ_END[N % 10], g = Math.floor(N / 100), t = isqrt(g), root = isqrt(N);
      const s = [{ t: `${N} ends in ${N % 10}, so the root ends in ${cands.join(' or ')}. Cover the last two digits: ${g}. The biggest square not over it is ?²`, v: t }];
      if (cands.length === 1) { s.push({ t: `Tens ${t}, ending ${cands[0]}: the root`, v: root }); return s; }
      s.push({ t: `${t} × ${t + 1}`, v: t * (t + 1) });
      s.push({ t: `Is ${g} at least ${t * (t + 1)}? Yes: the higher ending (${t}${Math.max(...cands)}); no: the lower (${t}${Math.min(...cands)}). The root`, v: root });
      return s;
    },
  },

  /* ---------------------------------------------------------- 6. √ by duplex division */
  {
    id: 'root-long', world: 'ladder', band: '11-14', title: 'Square roots by the duplex',
    sutra: { sa: 'Ūrdhva-tiryagbhyām', en: 'vertically and crosswise' },
    sources: SRC, needsReview: true,
    hook: '√524176 — a six-digit square root, one digit at a time.',
    idea: 'Root the first group, then divide by twice that digit, taking off the duplex of the root digits found so far.',
    why: [
      '√524176. Split into pairs from the right: 52 | 41 | 76. The biggest square under 52 is 49, so the first digit is 7, with 3 left, and the divisor is 2 × 7 = 14. Bring down 4: 34 ÷ 14 = 2, remainder 6. Bring down 1: 61, take off the duplex of 2 (that is 4): 57 ÷ 14 = 4, remainder 1. The root is 724.',
      'Why: (700 + 10b + c)² = 490000 + 2 × 7 × (10b + c) × 100 + (10b + c)². The 2 × 7 is the divisor: it shares out the middle part. The leftover (10b + c)² is exactly the duplexes of b, of bc, and of c — which is why each column takes a duplex off before dividing.',
      'For a perfect square every column after the last root digit comes out at zero: here 10 + 7 − 2 × 2 × 4 = 1, then 10 + 6 − 4² = 0. A column must never go below zero — if it would, the root digit before it is one too big, so take one less.',
    ],
    alg: '(100a + 10b + c)² = 10⁴a² + 2a·(10b + c)·100 + (10b + c)²',
    ex: { N: 524176 },
    caseKey: 'back',
    cases: [
      { label: 'Straight through', note: 'Each division gives its digit straight away, and the last columns come out at zero.', ex: { N: 524176 } },
      { label: 'One less', note: 'A division would give a digit too big — the next column would go below zero — so take one less.', ex: { N: 20449 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const x = lv === 1 ? int(101, 316, r) : lv === 2 ? int(317, 999, r) : int(101, 999, r);
        const q = this.q({ N: x * x });
        return q.reject ? null : q;
      });
    },
    q({ N }) {
      const L = rootLong(N), root = isqrt(N);
      // as with the flag: the method's own root is the last step, checked against ans by the test
      return { N, back: L ? (L.back ? 'yes' : 'no') : 'none', text: `√${N}`, say: `the square root of ${N}`, expr: `Math.round(Math.sqrt(${N}))`, ans: root, ...(L ? {} : { reject: true }) };
    },
    work({ N }) {
      const L = rootLong(N);
      return [
        { t: `First group ${L.g1}: the biggest square not over it is ?²`, v: L.a },
        { t: `Divisor 2 × ${L.a} = ${L.dv}. ${L.r0} left, bring down ${L.d[0]}: ${L.gross1} ÷ ${L.dv}${L.b < Math.floor(L.gross1 / L.dv) ? ' — one less, or the next column goes below zero' : ''}`, v: L.b },
        { t: `${L.rem1} left, bring down ${L.d[1]}, take off the duplex ${L.b}²`, v: L.gross2 },
        { t: `${L.gross2} ÷ ${L.dv}${L.c < Math.floor(L.gross2 / L.dv) ? ' — one less, or a later column goes below zero' : ''}`, v: L.c },
        { t: 'The root', v: L.root },
      ];
    },
  },

  /* ---------------------------------------------------------- 7. ∛ by sight */
  {
    id: 'cube-root-sight', world: 'ladder', band: '11-14', title: 'Cube roots by sight',
    sutra: { sa: 'Vilokanam', en: 'by mere observation', sub: true },
    sources: SRC, needsReview: true,
    hook: 'The cube root of 54872 — in two looks.',
    idea: 'The last digit of a cube names the last digit of its root; the digits before the last three give the tens.',
    why: [
      'Cube the digits 0 to 9 and look only at the last digit: 1, 8, 27, 64, 125, 216, 343, 512, 729 end in 1, 8, 7, 4, 5, 6, 3, 2, 9. Every ending is different — so the last digit of a cube tells you the last digit of its root. Most stay the same; 2 and 8 swap, and 3 and 7 swap.',
      'Now cover the last three digits of 54872: 54 is left. 3³ = 27 and 4³ = 64, so 54 sits between them and the root is in the thirties. With the ending 8 (from the 2), the root is 38.',
      'Why the cover works: a cube in the thirties lies between 30³ = 27000 and 40³ = 64000, so its thousands are between 27 and 64. Why the ending works: the last digit of n³ depends only on the last digit of n, and the ten endings above are all different.',
    ],
    alg: '(10t + u)³ = 1000t³ + 300t²u + 30tu² + u³, so the last digit is the last digit of u³ and the thousands lie between t³ and (t + 1)³',
    ex: { N: 54872 },
    caseKey: 'ending',
    cases: [
      { label: 'The ending stays', note: 'Endings 0, 1, 4, 5, 6 and 9 come back as themselves.', ex: { N: 39304 } },
      { label: 'The ending swaps', note: 'A cube ending in 2 has a root ending in 8 (and the other way round); 3 and 7 swap too.', ex: { N: 54872 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => { const x = lv === 1 ? int(11, 29, r) : lv === 2 ? int(11, 59, r) : int(30, 99, r); return this.q({ N: x ** 3 }); });
    },
    q({ N }) {
      const u = CUBE_END[N % 10];
      return { N, ending: u === N % 10 ? 'same' : 'swapped', text: `The cube root of ${N}`, say: `the cube root of ${N}`, expr: `Math.round(Math.cbrt(${N}))`, ans: icbrt(N) };
    },
    work({ N }) {
      const u = CUBE_END[N % 10], g = Math.floor(N / 1000), t = icbrt(g);
      return [
        { t: `${N} ends in ${N % 10}. The root ends in`, v: u },
        { t: `Cover the last three digits: ${g}. The biggest cube not over it is ?³`, v: t },
        { t: `Tens ${t}, ending ${u}: the root`, v: icbrt(N) },
      ];
    },
  },

  /* ---------------------------------------------------------- 8. osculators */
  {
    id: 'osculator', world: 'ladder', band: '11-14', title: 'Divisibility by osculators',
    sutra: { sa: 'Ekādhikena Pūrvena', en: 'by one more than the one before' },
    sources: SRC, needsReview: true,
    hook: 'Is 4807 in the 19 times table? Is 9373 in the 7 times table? No long division.',
    idea: 'Find the osculator, then chop off the last digit, multiply it by the osculator and add it to what is left. Repeat until the number is small.',
    why: [
      'For 19, the osculator is one more than the digit before the 9: 1 + 1 = 2. To test 4807: chop the 7, double it, add it to 480: 494. Again: 49 + 2 × 4 = 57. And 57 = 3 × 19, so 4807 is in the 19 times table too.',
      'Why: 2 × 10 = 20 is one more than 19. Writing 4807 as 480 × 10 + 7, the step makes 480 + 2 × 7; times 10 that is 4800 + 140, which differs from 4807 by 7 × 19 — a multiple of 19. So the new number is in the 19 times table exactly when the old one was.',
      'A divisor that does not end in 9 is first multiplied until it does: 7 × 7 = 49, so the osculator for 7 is 5; 13 × 3 = 39 gives 4; 17 × 7 = 119 gives 12. The book uses this "one more than the one before" for 19, 29, 39 and on to any divisor that ends in 1, 3, 7 or 9.',
    ],
    alg: 'If p × k = 10m − 1, then 10a + b and a + m·b are both in the p times table or both not: 10(a + mb) − (10a + b) = b(10m − 1)',
    ex: { ask: 'test', p: 19, N: 4807 },
    caseKey: 'kind',
    cases: [
      { label: 'The osculator: ends in 9', note: 'A divisor ending in 9: one more than the digits before the 9.', ex: { ask: 'osc', p: 29 } },
      { label: 'The osculator: make a 9', note: 'Not ending in 9? Multiply it until it does, then take one more than the digits before the 9.', ex: { ask: 'osc', p: 13 } },
      { label: 'Testing a number', note: 'Chop, multiply by the osculator, add — and repeat — until the number is small enough to know.', ex: { ask: 'test', p: 19, N: 4807 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const ps = lv === 1 ? [19, 29, 7] : lv === 2 ? [7, 13, 19, 29] : [7, 13, 17, 19, 29];
        const p = pick(ps, r);
        if (r() < 0.25) return this.q({ ask: 'osc', p });
        const lo = lv === 1 ? 100 : lv === 2 ? 1000 : 10000, hi = lo * 10 - 1;
        const N = r() < 0.5 ? p * int(Math.ceil(lo / p), Math.floor(hi / p), r) : int(lo, hi, r);
        const { chain } = osculate(N, p);
        return chain.at(-1) <= 200 ? this.q({ ask: 'test', p, N }) : null;
      });
    },
    q({ ask, p, N }) {
      if (ask === 'osc') return { ask, p, kind: p % 10 === 9 ? 'osc direct' : 'osc via multiple', text: `The osculator for ${p}?`, say: `What is the osculator for ${p}?`,
        expr: `(${p}*[1,3,7,9].find((k)=>${p}*k%10===9)+1)/10`, ans: oscOf(p) };
      return { ask, p, N, kind: 'test', text: `Is ${N} divisible by ${p}?`, choices: YN, expr: `${N}%${p}===0?'Yes':'No'`, ans: yn(N % p === 0) };
    },
    work({ ask, p, N }) {
      if (ask === 'osc') {
        if (p % 10 === 9) return [{ t: `${p} ends in 9. The digits before the 9`, v: (p - 9) / 10 }, { t: 'One more than that', v: oscOf(p) }];
        const k = toNine(p);
        return [{ t: `${p} times what ends in 9?`, v: k }, { t: `${p} × ${k}`, v: p * k }, { t: 'One more than the digits before the 9', v: oscOf(p) }];
      }
      const { m, chain } = osculate(N, p);
      const s = [{ t: `The osculator for ${p}`, v: m }];
      for (let i = 1; i < chain.length; i++) { const x = chain[i - 1]; s.push({ t: `${Math.floor(x / 10)} + ${x % 10} × ${m}`, v: chain[i] }); }
      s.push({ t: `Is ${chain.at(-1)} in the ${p} times table?`, v: yn(N % p === 0), choices: YN });
      return s;
    },
  },

  /* ---------------------------------------------------------- 9. recurring decimals */
  {
    id: 'ekadhika-decimals', world: 'ladder', band: '8-10', title: 'Recurring decimals by one more',
    sutra: { sa: 'Ekādhikena Pūrvena', en: 'by one more than the one before' },
    sources: SRC, needsReview: true,
    hook: '1 ÷ 29 — its digits, one after another, dividing only by 3.',
    idea: 'For 1 ÷ 29, "one more than the one before" the 9 is 3. Divide by 3, and each remainder goes in front of the digit you just wrote.',
    why: [
      '1 ÷ 29: one more than 2 is 3. Start with 1: 1 ÷ 3 = 0, remainder 1. Put the remainder in front of the 0: 10 ÷ 3 = 3, remainder 1. In front of the 3: 13 ÷ 3 = 4, remainder 1. Then 14 ÷ 3 = 4, remainder 2. So 1 ÷ 29 = 0.0344…',
      'Why: call the answer x. 29 × x = 1, so 30 × x = 1 + x — x is (1 + x) ÷ 30. Dividing by 30 is dividing by 3 and moving one place right, and the "+ x" is why each digit you find is fed back in as the next one to divide. The digits run the other way too: the repeating block ends in 1, and each digit to its left is 3 × the digit on its right, plus the carry.',
      'For 19, 29 and 59 the block is as long as it can be — 18, 28 and 58 digits — and its second half is the first half taken from 9: digit 10 of 1 ÷ 19 is 9 − digit 1, and so on. That is because ten to the power of half the block leaves −1 when you divide by 19 (or 29, or 59).',
    ],
    alg: '1/(10m − 1) = x  ⇒  x = (1 + x) / (10m)',
    ex: { p: 29, kind: 'start', k: 4 },
    caseKey: 'kind',
    cases: [
      { label: 'From the start: divide', note: 'Divide by the Ekādhika; each remainder goes in front of the digit just found.', ex: { p: 29, kind: 'start', k: 4 } },
      { label: 'From the end: multiply', note: 'The repeating block ends in 1. Work leftwards: each digit is the Ekādhika × the digit on its right, plus the carry.', ex: { p: 19, kind: 'end', k: 4 } },
      { label: 'The second half', note: 'In the second half of the block, each digit is 9 minus the digit half a block earlier.', ex: { p: 19, kind: 'half', k: 3 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const kind = lv === 3 && r() < 0.4 ? 'half' : r() < 0.5 ? 'start' : 'end';
        if (kind === 'half') return this.q({ p: pick([19, 29, 59], r), kind, k: int(2, 4, r) });
        const p = lv === 1 ? 19 : lv === 2 ? pick([29, 39], r) : pick([29, 49, 59], r);
        return this.q({ p, kind, k: int(3, lv === 1 ? 4 : 5, r) });
      });
    },
    q({ p, kind, k }) {
      const P = PERIOD[p], H = P / 2;
      const pos = kind === 'start' ? k : kind === 'end' ? P - k + 1 : H + k;
      const ask = kind === 'end' ? `its repeating block is ${P} digits long and ends in 1. Which is the ${ord(k)} digit from the end of the block?`
        : kind === 'half' ? `its digits repeat every ${P}. Which is digit number ${pos} after the point?`
        : `which is the ${ord(k)} digit after the point?`;
      const dig = kind === 'end' ? mulDigits(p, k).at(-1).e : kind === 'start' ? divDigits(p, k).at(-1).d : 9 - divDigits(p, k).at(-1).d;
      return { p, kind, k, pos, text: `1 ÷ ${p}: ${ask}`, expr: `Number(10n**${pos}n/${p}n%10n)`, ans: dig };
    },
    work({ p, kind, k }) {
      const m = ekadhikaOf(p);
      if (kind === 'end') {
        return mulDigits(p, k).slice(1).map((s, i) => ({ t: `${ord(i + 2)} from the end: ${m} × ${s.from}${s.carryIn ? ` + carry ${s.carryIn}` : ''} = ${s.t}, keep the last digit`, v: s.e }));
      }
      const ds = divDigits(p, k).map((s, i) => ({ t: i === 0 ? `One more than ${(p - 9) / 10} is ${m}. Digit 1: 1 ÷ ${m}` : `Digit ${i + 1}: remainder in front of the last digit, ${s.x} ÷ ${m}`, v: s.d }));
      if (kind === 'half') ds.push({ t: `Half a block later, take it from 9: 9 − ${ds.at(-1).v}`, v: 9 - ds.at(-1).v });
      return ds;
    },
  },

  /* ---------------------------------------------------------- 10. simultaneous equations */
  {
    id: 'sutra-equations', world: 'ladder', band: '11-14', title: 'Two equations, crosswise',
    sutra: { sa: 'Saṅkalana-vyavakalanābhyām', en: 'by addition and by subtraction' },
    sources: SRC, needsReview: true,
    hook: '2x + 3y = 13 and 5x + 2y = 16 — x and y without rewriting a single equation.',
    idea: 'Swapped numbers: add and subtract. Any numbers: cross-multiply, always in the same cycle, and divide.',
    why: [
      'When the two equations swap their numbers — 5x + 3y = 21 and 3x + 5y = 19 — add them and subtract them: 8(x + y) = 40 and 2(x − y) = 2. So x + y = 5 and x − y = 1, and x = 3, y = 2. That is the sutra "by addition and by subtraction".',
      'For any two equations, the book uses its rule "transpose and apply" (parāvartya) as a cross-multiplying pattern. The bottom is y-number × x-number across, minus the other way: for 2x + 3y = 13 and 5x + 2y = 16 it is 3 × 5 − 2 × 2 = 11. The top for x swaps the x-numbers for the answers: 3 × 16 − 2 × 13 = 22, so x = 2. The top for y: 13 × 5 − 16 × 2 = 33, so y = 3.',
      'Why: multiply the first equation by 2 and the second by 3 and subtract, and y disappears, leaving 11x = 22. The crosswise products are exactly those multipliers, done all at once. If the bottom comes out negative, swap the two equations round so it is positive.',
    ],
    alg: 'a₁x + b₁y = c₁, a₂x + b₂y = c₂  ⇒  x = (b₁c₂ − b₂c₁) ÷ (b₁a₂ − b₂a₁),  y = (c₁a₂ − c₂a₁) ÷ (b₁a₂ − b₂a₁)',
    keys: ['−'],
    ex: { a1: 2, b1: 3, a2: 5, b2: 2, x: 2, y: 3, ask: 'x' },
    caseKey: 'kind',
    cases: [
      { label: 'Swapped numbers', note: 'The numbers swap places, so adding and subtracting give x + y and x − y at once.', ex: { a1: 5, b1: 3, a2: 3, b2: 5, x: 3, y: 2, ask: 'x' } },
      { label: 'Any numbers', note: 'Cross-multiply for the bottom and for each top, always in the same cycle, then divide.', ex: { a1: 2, b1: 3, a2: 5, b2: 2, x: 2, y: 3, ask: 'y' } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const ask = r() < 0.5 ? 'x' : 'y', top = lv === 3 ? 12 : 9;
        const x = int(1, top, r), y = int(1, top, r);
        if (lv === 1 && r() < 0.5) { const a = int(2, 9, r), b = int(1, 8, r); return a === b ? null : this.q({ a1: a, b1: b, a2: b, b2: a, x, y, ask }); }
        const c = lv === 1 ? 5 : 9, s = () => (lv === 3 && r() < 0.3 ? -1 : 1);
        const a1 = int(1, c, r) * s(), b1 = int(1, c, r) * s(), a2 = int(1, c, r), b2 = int(1, c, r);
        return a1 * b2 - a2 * b1 === 0 ? null : this.q({ a1, b1, a2, b2, x, y, ask });
      });
    },
    q({ a1, b1, a2, b2, x, y, ask }) {
      const c1 = a1 * x + b1 * y, c2 = a2 * x + b2 * y;
      return { a1, b1, a2, b2, x, y, c1, c2, ask, kind: a1 === b2 && b1 === a2 ? 'swapped' : 'general',
        text: `${lin(a1, b1)} = ${neg(c1)} and ${lin(a2, b2)} = ${neg(c2)}. What is ${ask}?`,
        expr: ask === 'x' ? `(${c1}*${b2}-${c2}*${b1})/(${a1}*${b2}-${a2}*${b1})` : `(${a1}*${c2}-${a2}*${c1})/(${a1}*${b2}-${a2}*${b1})`, ans: ask === 'x' ? x : y };
    },
    work(q) {
      if (q.kind === 'swapped') {
        const a = q.a1, b = q.b1, s = (q.c1 + q.c2) / (a + b), d = (q.c1 - q.c2) / (a - b);
        return [
          { t: `Add: ${a + b}(x + y) = ${q.c1 + q.c2}, so x + y`, v: s },
          { t: `Subtract: ${neg(a - b)}(x − y) = ${neg(q.c1 - q.c2)}, so x − y`, v: d },
          q.ask === 'x' ? { t: `x = (${s} + ${par(d)}) ÷ 2`, v: (s + d) / 2 } : { t: `y = (${s} − ${par(d)}) ÷ 2`, v: (s - d) / 2 },
        ];
      }
      let [A1, B1, C1, A2, B2, C2] = [q.a1, q.b1, q.c1, q.a2, q.b2, q.c2];
      if (B1 * A2 - B2 * A1 < 0) [A1, B1, C1, A2, B2, C2] = [A2, B2, C2, A1, B1, C1];
      const den = B1 * A2 - B2 * A1, nx = B1 * C2 - B2 * C1, ny = C1 * A2 - C2 * A1;
      return [
        { t: `Bottom: ${par(B1)} × ${par(A2)} − ${par(B2)} × ${par(A1)}`, v: den },
        q.ask === 'x' ? { t: `Top for x: ${par(B1)} × ${par(C2)} − ${par(B2)} × ${par(C1)}`, v: nx } : { t: `Top for y: ${par(C1)} × ${par(A2)} − ${par(C2)} × ${par(A1)}`, v: ny },
        { t: `${q.ask} = top ÷ bottom`, v: q.ask === 'x' ? nx / den : ny / den },
      ];
    },
  },

  /* ---------------------------------------------------------- 11. quadratics */
  {
    id: 'quadratic-split', world: 'ladder', band: '11-14', title: 'Factorising, proportionately',
    sutra: { sa: 'Ānurūpyeṇa', en: 'proportionately', sub: true },
    sources: SRC, needsReview: true,
    hook: '6x² + 7x + 2 — which two brackets multiply to make it?',
    idea: 'Split the middle number so the first two numbers are in the same ratio as the last two. That ratio IS one bracket.',
    why: [
      'x² − 7x + 12: two numbers that multiply to 12 and add to −7 are −3 and −4. So it is (x − 3)(x − 4), and it is zero when x is 3 or 4. The larger root is 4.',
      '6x² + 7x + 2: split 7 into two parts that multiply to 6 × 2 = 12 — that is 4 and 3. Now 6 : 3 is 2 : 1, and 4 : 2 is 2 : 1 too — the same proportion, which is the sutra. So one bracket is (2x + 1). The other comes from "the first by the first and the last by the last" (ādyam ādyena): 6x² ÷ 2x = 3x and 2 ÷ 1 = 2. So (2x + 1)(3x + 2).',
      'Why: (rx + p)(sx + q) = rs·x² + (rq + ps)·x + pq. The middle is made of two parts, rq and ps. And rs : ps = r : p — the first number and one part of the middle are always in the ratio of one bracket. The book\'s split is just reading that bracket back.',
    ],
    alg: '(rx + p)(sx + q) = rs·x² + (rq + ps)·x + pq,  and  rs : ps = rq : pq = r : p … s : q',
    keys: ['−'],
    ex: { kind: 'proportion', r: 2, p: 1, s: 3, q: 2 },
    caseKey: ['kind', 'sign'],
    cases: [
      { label: 'x²: last number positive', note: 'The two numbers multiply to a positive number, so they have the same sign — both + or both −.', ex: { kind: 'monic', p: -3, q: -4 } },
      { label: 'x²: last number negative', note: 'A negative product means one number is + and the other −; the bigger one takes the middle number\'s sign.', ex: { kind: 'monic', p: 5, q: -3 } },
      { label: 'A number before x²', note: 'Split the middle so the ratios match; the ratio is one bracket, and first-by-first, last-by-last gives the other.', ex: { kind: 'proportion', r: 2, p: 1, s: 3, q: 2 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 3 && r() < 0.6) {
          const rr = int(1, 5, r), s = int(2, 5, r), p = int(1, 9, r), q = int(1, 9, r);
          if (rr === s || gcd(rr, p) !== 1 || gcd(s, q) !== 1) return null;
          return this.q({ kind: 'proportion', r: rr, p, s, q });
        }
        const sg = () => (lv === 1 ? 1 : r() < 0.5 ? -1 : 1);
        const both = lv === 1 ? (r() < 0.5 ? 1 : -1) : 0;
        const p = int(1, lv === 3 ? 12 : 9, r) * (both || sg()), q = int(1, lv === 3 ? 12 : 9, r) * (both || sg());
        return p + q === 0 ? null : this.q({ kind: 'monic', p, q });
      });
    },
    q(o) {
      if (o.kind === 'proportion') {
        const { r, p, s, q } = o, a = r * s, b = r * q + p * s, c = p * q;
        return { ...o, kind: 'proportion', sign: '+c', a, b, c, text: `${quad(a, b, c)} = (${r === 1 ? '' : r}x + ?)(${s}x + ?). The number in the first bracket?`,
          expr: `[...Array(200).keys()].find((v)=>v>0&&${c}%v===0&&${r}*(${c}/v)+v*${s}===${b})`, ans: p };
      }
      const { p, q } = o, b = p + q, c = p * q;
      return { kind: 'monic', p, q, b, c, sign: c > 0 ? '+c' : '−c', text: `${quad(1, b, c)} = 0. The larger value of x?`,
        expr: `(-(${b})+Math.sqrt((${b})**2-4*(${c})))/2`, ans: -Math.min(p, q) };
    },
    work(o) {
      if (o.kind === 'proportion') {
        const { r, p, s, q, a, b, c } = o, u = r * q, v = p * s;
        return [
          { t: `Split ${b} into two parts that multiply to ${a} × ${c} = ${a * c}: the larger part`, v: Math.max(u, v) },
          { t: 'and the smaller part', v: Math.min(u, v) },
          { t: `${a} : part, in lowest terms, is ${r} : ? — for the part that gives ${r}`, v: p },
        ];
      }
      const { p, q, b, c } = o;
      return [
        { t: `Two numbers that multiply to ${neg(c)} and add to ${neg(b)}: the larger`, v: Math.max(p, q) },
        { t: 'and the smaller', v: Math.min(p, q) },
        { t: `So (x ${Math.max(p, q) < 0 ? '−' : '+'} ${Math.abs(Math.max(p, q))})(x ${Math.min(p, q) < 0 ? '−' : '+'} ${Math.abs(Math.min(p, q))}) = 0. The larger x is minus the smaller number`, v: -Math.min(p, q) },
      ];
    },
  },

  /* ---------------------------------------------------------- 12. which method? */
  {
    id: 'pick-the-sutra', world: 'ladder', band: '11-14', title: 'Pick the sutra',
    sources: SRC, needsReview: true,
    hook: '98 × 97, 46 × 44, 43 × 27 — three products, three different best methods.',
    idea: 'Ask two questions in order: do the fronts match with last digits making ten? Are both close to the same base? If neither, vertically and crosswise.',
    why: [
      'Every method on this hill is right; the point is to pick the one that is quickest for THIS sum. The rule this stop marks you by: first, if the front parts are the same and the last digits add up to 10 (46 × 44, 123 × 127), use "last digits make ten" — the front times one more, then the last digits multiplied. That is the sub-sutra Antyayordaśake\'pi.',
      'Second, if both numbers are within a tenth of the same base — 90 to 110 for 100, 900 to 1100 for 1000 — use Nikhilam: the gaps are small, so their product is small. 98 × 97 is gaps of 2 and 3.',
      'Otherwise, vertically and crosswise, which works for any two numbers at all (43 × 27). If a sum passes BOTH first tests, like 96 × 94, either quick method is fine — so this stop never asks about one.',
    ],
    alg: 'same front and last digits sum to 10 → last digits make ten; else both within B/10 of a base B → Nikhilam; else → vertically and crosswise',
    ex: { a: 98, b: 97 },
    caseKey: 'ans',
    cases: [
      { label: 'Near a base', note: 'Both numbers sit close to 100 (or 1000), so the gaps are small: Nikhilam.', ex: { a: 98, b: 97 } },
      { label: 'Last digits make ten', note: 'Same front part, and the last digits add to 10: one more than the front, then the last digits multiplied.', ex: { a: 46, b: 44 } },
      { label: 'Neither: crosswise', note: 'No base nearby and no tens to make — vertically and crosswise works for every pair.', ex: { a: 43, b: 27 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const want = pick(METHODS, r);
        let a, b;
        if (want === M_TEN) {
          const f = lv === 1 ? int(2, 8, r) : pick([int(2, 8, r), int(10, 19, r)], r), u = int(1, 9, r);
          a = 10 * f + u; b = 10 * f + 10 - u;
        } else if (want === M_NIK) {
          const B = lv === 1 ? 100 : pick([100, 1000], r), w = B / 10;
          const near = () => (lv === 1 || r() < 0.75 ? B - int(1, lv === 1 ? 9 : w, r) : B + int(1, w, r));
          a = near(); b = near();
        } else if (lv === 3 && r() < 0.6) {
          // near misses: one close to a base and one not, or a same front that does not make ten
          if (r() < 0.5) { a = 100 - int(1, 9, r); b = int(70, 89, r); } else { const f = int(2, 9, r), u = int(1, 9, r); a = 10 * f + u; b = 10 * f + int(1, 9, r); }
        } else { a = int(12, 89, r); b = int(12, 89, r); }
        if (sameFrontTen(a, b) && nearBase(a, b)) return null;
        return this.q({ a, b });
      });
    },
    q({ a, b }) {
      const ans = sameFrontTen(a, b) ? M_TEN : nearBase(a, b) ? M_NIK : M_UT, text = `${a} × ${b}: which method fits best?`;
      return { a, b, text, say: `${a} times ${b}: which method fits best?`, choices: shuffle(METHODS, seeded(text)), ans,
        expr: `(Math.floor(${a}/10)===Math.floor(${b}/10)&&${a}%10+${b}%10===10)?'${M_TEN}':([100,1000].some((B)=>Math.abs(${a}-B)*10<=B&&Math.abs(${b}-B)*10<=B)?'${M_NIK}':'${M_UT}')` };
    },
    work(q) {
      const ten = sameFrontTen(q.a, q.b), base = nearBase(q.a, q.b);
      return [
        { t: `Same front part, and last digits that add to 10?`, v: yn(ten), choices: YN },
        { t: `Both within a tenth of the same base (100 or 1000)?`, v: yn(!!base), choices: YN },
        { t: 'So the best method is', v: q.ans, choices: METHODS },
      ];
    },
  },
];

/* Teaching order, youngest first: the order a child first meets each stop on
   the level roads (levels.js) — ÷ 9 at Level 4, near-base division and 1 ÷ 19
   at Level 5, the flag, the duplex and roots by sight at Level 6, cube roots
   and osculators at 7, long roots and equations at 8, quadratics and picking
   a method at 9. */
const ORDER_IDS = ['nine-division', 'base-division', 'ekadhika-decimals', 'flag-division', 'duplex', 'root-by-sight',
  'cube-root-sight', 'osculator', 'root-long', 'sutra-equations', 'quadratic-split', 'pick-the-sutra'];
export const TRICKS = ORDER_IDS.map((id) => STOPS.find((t) => t.id === id));

/* ---------------------------------------------------------------- stories */

