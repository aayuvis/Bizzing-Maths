/* vedic.js — the Vedic Maths Journey (docs/LIBRARY-CONTRACT.md, JOURNEY).

   A path of stepping stones through the sutras of Bharati Krishna Tirtha's
   book Vedic Mathematics (1965). The first stone is the honest origin story,
   told in the Sutra Observatory's own words (imported, not copied, so the two
   can never drift apart). Every other stone is a method a child can use:
   the sutra with its English meaning, the method, WHY it works in ordinary
   algebra, a worked example drawn out, then ten try-it questions. Eight of ten
   walks the child on to the next stone; the last stone earns a badge.

   The rule this file keeps is the Atlas's: every question is checked three
   ways — `ans`, a plain evaluation of `expr`, and the last line of `work(q)`
   — and selftest() proves the algebra behind each method over whole ranges,
   not just the examples. */

import { paintedRoad } from '../board.js';
import { avatarFile } from '../model.js';
import { int, pick } from '../rand.js';
import { byId, WORLDS } from '../tricks.js';

export const TOOL = {
  id: 'vedic', name: 'Vedic Maths Journey',
  blurb: 'Walk the stepping stones of the sutras — each method, and the algebra that makes it work.',
  art: 'lib-vedic',
};

const P = 't-vedic';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PASS = 8, DRILL = 10;
const LV = { '6-7': 1, '8-10': 2, '11-14': 3 };
const LV_NAME = ['', 'Gentle', 'Steady', 'Stretch'];

/* The Observatory's own origin story and sources — one text, two places. */
const OBS = WORLDS.find((w) => w.id === 'observatory');
const ORIGIN = OBS.intro.body;
const OBS_SOURCES = OBS.intro.sources;
const TIRTHA = OBS_SOURCES.find((s) => /Tirtha/.test(s));

/* ------------------------------------------------------------ small maths */

const digits = (n) => String(n).split('').map(Number);
const dsum = (n) => digits(n).reduce((a, b) => a + b, 0);
const droot = (n) => { let x = n; while (x > 9) x = dsum(x); return x; };
const sgn = (v) => (v < 0 ? '−' : '+');
const leaks = (q) => !q.choices && String(q.ans).length > 1 && q.text.split(/[^0-9./]/).includes(String(q.ans));
/* A generator that never shows its own answer in the prompt: re-roll. */
const guard = (fn) => (r, lv = 1) => { let q; for (let i = 0; i < 80; i++) { q = fn(r, lv); if (!leaks(q)) break; } return q; };
const mul = (a, b, extra = {}) => ({ a, b, text: `${a} × ${b}`, expr: `${a}*${b}`, ans: a * b, ...extra });
const nearOf = (B, lo, hi, r, side) => (side < 0 ? B - int(lo, hi, r) : B + int(lo, hi, r));

/* The Nikhilam cross, for any base and either side of it. */
function nearBase(a, b, B) {
  const x = a - B, y = b - B, side = (v) => (v < 0 ? 'below' : 'above');
  return [
    { t: `${a} is ${side(x)} ${B} by`, v: Math.abs(x) },
    { t: `${b} is ${side(y)} ${B} by`, v: Math.abs(y) },
    { t: `Cross: ${a} ${sgn(y)} ${Math.abs(y)}`, v: a + y },
    { t: `Multiply the gaps: ${Math.abs(x)} × ${Math.abs(y)}`, v: x * y },
    { t: `${a + y} × ${B} + ${x * y}`, v: a * b },
  ];
}

/* The digits of 1/19, made by doubling from the right (Ekādhikena). */
function nineteenth() {
  const d = new Array(19); d[18] = 1; let carry = 0;
  for (let p = 17; p >= 1; p--) { const t = 2 * d[p + 1] + carry; d[p] = t % 10; carry = Math.floor(t / 10); }
  return d;   // d[1..18]
}
const R19 = nineteenth();

/* Paravartya: dividing by 10 + f, digit by digit (synthetic division at 10). */
function para(N, d) {
  const f = d - 10, a = digits(N), m = a.length - 1, c = [a[0]];
  for (let i = 1; i <= m; i++) c.push(a[i] - f * c[i - 1]);
  const Q = c.slice(0, m).reduce((s, x) => s * 10 + x, 0), R = c[m];
  return { f, a, c, Q, R };
}

/* Crosswise columns for any two numbers (right to left). */
function columns(a, b) {
  const x = digits(a).reverse(), y = digits(b).reverse(), cols = [];
  for (let k = 0; k < x.length + y.length - 1; k++) {
    let s = 0; const parts = [];
    for (let i = 0; i <= k; i++) if (x[i] !== undefined && y[k - i] !== undefined) { s += x[i] * y[k - i]; parts.push(`${x[i]}×${y[k - i]}`); }
    cols.push({ s, parts });
  }
  return cols;
}

/* ------------------------------------------------------------- questions */

const qSq5 = (a) => ({ kind: 'sq5', a, b: a, text: `${a}²`, say: `${a} squared`, expr: `${a}*${a}`, ans: a * a });
const q19 = (k) => ({ kind: 'r19', k, text: `1 ÷ 19 = 0.0526… — which digit is number ${k} after the point?`, expr: `Math.floor(10**${k}/19)%10`, ans: R19[k] });
const qSqNear = (a, B) => ({ kind: 'sqnear', a, B, text: `${a}²`, say: `${a} squared`, expr: `${a}*${a}`, ans: a * a });
const qDiv = (N, d) => ({ kind: 'div', N, d, text: `${N} ÷ ${d}`, expr: `${N}/${d}`, ans: N / d });
const qRoot = (a, b) => ({ kind: 'root', a, b, text: `The nines check: what is the digit root of ${a} × ${b}?`, expr: `((${a}*${b})-1)%9+1`, ans: droot(a * b) });
const CHOICE = ['Could be right', 'Must be wrong'];
const qClaim = (a, b, claim) => ({ kind: 'claim', a, b, claim, text: `Someone says ${a} × ${b} = ${claim}. What does the nines check say?`, choices: CHOICE,
  expr: `((${a}*${b})%9===(${claim})%9)?'${CHOICE[0]}':'${CHOICE[1]}'`, ans: (a * b - claim) % 9 === 0 ? CHOICE[0] : CHOICE[1] });
const qSim = (a, b, x, y, ask) => {
  const p = a * x + b * y, q = b * x + a * y;
  return { kind: 'sim', a, b, x, y, p, q, ask, text: `${a}x + ${b}y = ${p} and ${b}x + ${a}y = ${q}. What is ${ask}?`,
    expr: ask === 'x' ? `(${p}*${a}-${q}*${b})/(${a}*${a}-${b}*${b})` : `(${q}*${a}-${p}*${b})/(${a}*${a}-${b}*${b})`, ans: ask === 'x' ? x : y };
};

/* ------------------------------------------------------------- the path */

export const JOURNEY = [
  {
    id: 'origin', title: 'Where the sutras come from', kicker: 'The first stone',
    cards: [...ORIGIN,
      'The book gives sixteen short sutras, and some shorter sub-sutras that go with them. This path walks through the ones you can use with a pencil — or with no pencil at all. On every stone you will see the method, then the algebra that makes it work, then try it yourself.'],
    sources: OBS_SOURCES, needsReview: true,
    see: ['square-five'],
  },
  {
    id: 'ekadhika', title: 'One more than the one before', kicker: 'Squares ending in 5',
    sutra: { sa: 'Ekādhikena Pūrvena', en: 'by one more than the one before' }, stop: 'square-five',
    cards: [
      'To square a number that ends in 5, look at the digits in front of the 5. Multiply them by one more than themselves. Then write 25 on the end.',
      '65²: in front of the 5 is 6. One more than 6 is 7, and 6 × 7 = 42. Write 25 after it: 4225.',
      'Why it works: a number ending in 5 is 10n + 5. Squared, that is 100n² + 100n + 25, which is 100 × n(n + 1) + 25. The n(n + 1) is the "one more than the one before"; the 25 is 5 × 5.',
      'The same sutra makes the digits of 1 ÷ 19. The digit before the 9 in 19 is 1, and one more than it is 2 — so start from the right with 1, and keep doubling to the left, carrying as you go. You get all eighteen digits that repeat: 0.052631578947368421… (on the Stretch level you try this too).',
    ],
    alg: '(10n + 5)² = 100·n(n + 1) + 25   ·   20 ÷ 19 = 1 + 1 ÷ 19, so doubling the digits of 1/19 gives them back, one place over',
    sources: [TIRTHA], needsReview: true,
    ex: qSq5(65),
    gen: guard((r, lv) => (lv === 3 && r() < 0.3 ? q19(int(5, 15, r)) : qSq5(int(1, lv === 1 ? 9 : lv === 2 ? 14 : 19, r) * 10 + 5))),
    work(q) {
      if (q.kind === 'r19') {
        const s = [{ t: 'Digit 18, at the right-hand end, is', v: R19[18] }];
        for (let p = 17; p >= q.k; p--) s.push({ t: `Digit ${p}: double digit ${p + 1}, add any carry, keep the last digit`, v: R19[p] });
        s.push({ t: `So digit ${q.k} is`, v: q.ans });
        return s;
      }
      const n = Math.floor(q.a / 10);
      return [{ t: `One more than ${n} is ${n + 1}; ${n} × ${n + 1}`, v: n * (n + 1) }, { t: 'Write 25 on the end', v: q.ans }];
    },
    fig: (q, ctx) => sq5Fig(q.a) + (ctx && ctx.band === '11-14' ? r19Fig() : ''),
  },
  {
    id: 'nikhilam-10', title: 'All from nine, the last from ten', kicker: 'Multiplying near 10',
    sutra: { sa: 'Nikhilam Navataścaramaṁ Daśataḥ', en: 'all from nine and the last from ten' }, stop: 'nikhilam-10',
    cards: [
      'For two numbers close to 10, look at how far each one is from 10 — its gap.',
      'Cross: take one number\'s gap away from the other number. That gives the tens. Then multiply the two gaps: that gives the units. 8 × 7: gaps 2 and 3. 8 − 3 = 5 tens; 2 × 3 = 6. Answer 56.',
      'Why: (10 − x)(10 − y) = 10(10 − x − y) + xy. The cross, 10 − x − y, is the same whichever way you do it. If the gaps multiply to more than 9, the extra ten carries across.',
      'Above 10 works too — just add the gap instead: 12 × 13 is 12 + 3 = 15 tens, and 2 × 3 = 6, so 156.',
    ],
    alg: '(10 − x)(10 − y) = 10(10 − x − y) + xy',
    sources: [TIRTHA], needsReview: true,
    ex: mul(8, 7, { B: 10 }),
    gen: guard((r, lv) => {
      if (lv === 3 && r() < 0.5) return mul(int(11, 16, r), int(11, 16, r), { B: 10 });
      const lo = lv === 1 ? 6 : 5; return mul(int(lo, 9, r), int(lo, 9, r), { B: 10 });
    }),
    work: (q) => nearBase(q.a, q.b, q.B),
    fig: (q) => nikhilamFig(q.a, q.b, q.B),
  },
  {
    id: 'nikhilam-100', title: 'Near 100, near 1000', kicker: 'The same cross, bigger bases',
    sutra: { sa: 'Nikhilam Navataścaramaṁ Daśataḥ', en: 'all from nine and the last from ten' }, stop: 'nikhilam-100', see: ['above-100'],
    cards: [
      'The cross works around any base: 100, 1000, even 10 000. Near 100, the gaps multiply into the LAST TWO digits; near 1000, into the last three.',
      '97 × 96: gaps 3 and 4. 97 − 4 = 93 hundreds. 3 × 4 = 12. Answer 9312. Above: 104 × 107 is 104 + 7 = 111 hundreds and 4 × 7 = 28, so 11128.',
      'Why: (B − x)(B − y) = B(B − x − y) + xy, and (B + x)(B + y) = B(B + x + y) + xy. Same algebra, signs turned over. If the gaps multiply past the base, the extra carries.',
    ],
    alg: '(B ± x)(B ± y) = B(B ± x ± y) + xy',
    sources: [TIRTHA], needsReview: true,
    ex: mul(97, 96, { B: 100 }),
    gen: guard((r, lv) => {
      const side = lv === 1 ? -1 : r() < 0.5 ? -1 : 1;
      if (lv === 3 && r() < 0.5) return mul(nearOf(1000, 1, 15, r, side), nearOf(1000, 1, 15, r, side), { B: 1000 });
      const hi = lv === 1 ? 9 : 14; return mul(nearOf(100, 1, hi, r, side), nearOf(100, 1, hi, r, side), { B: 100 });
    }),
    work: (q) => nearBase(q.a, q.b, q.B),
    fig: (q) => nikhilamFig(q.a, q.b, q.B),
  },
  {
    id: 'all-from-nine', title: 'Taking away from 1000', kicker: 'Subtracting with no borrowing',
    sutra: { sa: 'Nikhilam Navataścaramaṁ Daśataḥ', en: 'all from nine and the last from ten' }, stop: 'all-from-nine',
    cards: [
      'To take a number from 1000 (or 10 000), take every digit from 9 — except the last one, which you take from 10.',
      '1000 − 357: 9 − 3 = 6, 9 − 5 = 4, 10 − 7 = 3. Answer 643. Not one borrow.',
      'Why: 1000 is 999 + 1. Taking any number from 999 never borrows, because no digit is bigger than 9. Adding back the 1 is the same as taking the last digit from 10 instead of 9.',
    ],
    alg: '1000 − n = (999 − n) + 1',
    sources: [TIRTHA], needsReview: true,
    ex: { a: 1000, b: 357, text: '1000 − 357', expr: '1000-357', ans: 643 },
    gen: guard((r, lv) => {
      const a = lv === 1 ? 1000 : lv === 2 ? pick([1000, 10000], r) : pick([10000, 100000], r);
      let b = int(Math.max(11, a / 10 + 1), a - 1, r); if (b % 10 === 0) b += int(1, 9, r); b = Math.min(b, a - 1);
      return { a, b, text: `${a} − ${b}`, expr: `${a}-${b}`, ans: a - b };
    }),
    work({ a, b }) {
      const w = String(a).length - 1, d = String(b).padStart(w, '0').split('').map(Number);
      const s = d.slice(0, -1).map((x) => ({ t: `9 − ${x}`, v: 9 - x }));
      s.push({ t: `10 − ${d.at(-1)} (the last digit)`, v: 10 - d.at(-1) });
      s.push({ t: 'Read the digits', v: a - b });
      return s;
    },
    fig: (q) => fromNineFig(q.a, q.b),
  },
  {
    id: 'ekanyunena', title: 'One less than the one before', kicker: 'Multiplying by 9, 99, 999',
    sutra: { sa: 'Ekanyūnena Pūrvena', en: 'by one less than the one before' },
    cards: [
      'To multiply a number by 9, 99 or 999 — with as many nines as the number has digits — write one less than the number, then what that takes from the nines.',
      '43 × 99: one less than 43 is 42. 99 − 42 = 57. Put them side by side: 4257.',
      'Why: 43 × 99 = 43 × 100 − 43 = 4300 − 43. Split that as 42 hundreds, plus 100 − 43 — and 100 − 43 is the same as 99 − 42. The two halves of the answer are those two numbers.',
    ],
    alg: 'n × (10ᵏ − 1) = (n − 1) × 10ᵏ + (10ᵏ − 1 − (n − 1))',
    sources: [TIRTHA], needsReview: true,
    ex: mul(43, 99),
    gen: guard((r, lv) => (lv === 1 ? mul(int(2, 9, r), 9) : lv === 2 ? mul(int(11, 98, r), 99) : r() < 0.5 ? mul(int(11, 98, r), 99) : mul(int(101, 998, r), 999))),
    work({ a, b }) {
      return [
        { t: `One less than ${a}`, v: a - 1 },
        { t: `${b} − ${a - 1}`, v: b - (a - 1) },
        { t: 'Side by side', v: a * b },
      ];
    },
    fig: (q) => slate([[`${q.a}`, '×', `${q.b}`], [`${q.a - 1}`, '|', String(q.b - (q.a - 1)).padStart(String(q.b).length, '0')]], [0], 'One less, then what it takes from the nines'),
  },
  {
    id: 'yavadunam', title: 'However much it falls short', kicker: 'Squares near a base',
    sutra: { sa: 'Yāvadūnam', en: 'by however much it falls short' }, stop: 'square-near-100',
    cards: [
      'To square a number near a base, go down by its gap once more — then square the gap for the end.',
      '96²: 96 is 4 short of 100. Go down another 4: 92. Square the gap: 16. Answer 9216. Above works going up: 103² → 106 and 09, so 10609.',
      'Why: (B − d)² = B(B − 2d) + d². It is the Nikhilam cross with both numbers the same. Near 100 the d² takes two places; near 10, one place (and any extra carries).',
    ],
    alg: '(B − d)² = B(B − 2d) + d²',
    sources: [TIRTHA], needsReview: true,
    ex: qSqNear(96, 100),
    gen: guard((r, lv) => {
      const side = r() < 0.6 ? -1 : 1;
      if (lv === 1) return qSqNear(nearOf(10, 1, 3, r, side), 10);
      if (lv === 2 || r() < 0.5) return qSqNear(nearOf(100, 1, lv === 2 ? 9 : 14, r, side), 100);
      return qSqNear(nearOf(1000, 1, 20, r, side), 1000);
    }),
    work({ a, B }) {
      const d = a - B;
      return [
        { t: `How far from ${B}? (${d > 0 ? 'over' : 'short'})`, v: Math.abs(d) },
        { t: d > 0 ? `Go up again: ${a} + ${d}` : `Go down again: ${a} − ${-d}`, v: a + d },
        { t: `Square the gap: ${Math.abs(d)}²`, v: d * d },
        { t: `${a + d} × ${B} + ${d * d}`, v: a * a },
      ];
    },
    fig: (q) => nikhilamFig(q.a, q.a, q.B),
  },
  {
    id: 'urdhva', title: 'Vertically and crosswise', kicker: 'Any two numbers, one line',
    sutra: { sa: 'Ūrdhva-tiryagbhyām', en: 'vertically and crosswise' }, stop: 'crosswise',
    cards: [
      'Write the two numbers one above the other. Work from the right: multiply the units vertically; then crosswise, and add; then the tens vertically. Carry as you go.',
      '23 × 41: units 3 × 1 = 3. Crosswise 2 × 1 + 3 × 4 = 14 — write 4, carry 1. Tens 2 × 4 = 8, and the 1 carried makes 9. Answer 943.',
      'Why: (10a + b)(10c + d) = 100ac + 10(ad + bc) + bd. The crosswise step is the two pieces that both land in the tens column.',
      'Three digits make five columns: vertical, crosswise, a "star" of three pairs in the middle, crosswise, vertical. It is the same idea, one column at a time (you meet it on the Stretch level).',
    ],
    alg: '(10a + b)(10c + d) = 100·ac + 10·(ad + bc) + bd',
    sources: [TIRTHA], needsReview: true,
    ex: mul(23, 41),
    gen: guard((r, lv) => {
      if (lv === 1) return mul(int(1, 4, r) * 10 + int(1, 4, r), int(1, 4, r) * 10 + int(1, 3, r));
      if (lv === 3 && r() < 0.5) return mul(int(101, 999, r), int(101, 399, r));
      return mul(int(11, 99, r), int(11, lv === 2 ? 59 : 99, r));
    }),
    work({ a, b }) {
      const cols = columns(a, b), names = cols.length === 3 ? ['Units, vertically', 'Crosswise', 'Tens, vertically'] : ['Units, vertically', 'Crosswise', 'The star (three pairs)', 'Crosswise', 'Hundreds, vertically'];
      return [...cols.map((c, i) => ({ t: `${names[i]}: ${c.parts.join(' + ')}`, v: c.s })), { t: 'Carry and read', v: a * b }];
    },
    fig: (q) => urdhvaFig(q.a, q.b),
  },
  {
    id: 'antyayor', title: 'When the last digits make ten', kicker: '43 × 47 in one breath',
    sutra: { sa: "Antyayordaśake'pi", en: 'when the last digits add up to ten', sub: true }, see: ['square-five'],
    cards: [
      'This is a sub-sutra that goes with "one more than the one before". It works when the front parts are the same and the last digits add up to 10 — like 43 × 47 (3 + 7 = 10).',
      'Multiply the front by one more than itself: 4 × 5 = 20. Multiply the last digits: 3 × 7 = 21. Side by side: 2021. If the last digits multiply to one digit, write a 0 first: 51 × 59 → 30 and 09 → 3009.',
      'Why: (10n + b)(10n + 10 − b) = 100 × n(n + 1) + b(10 − b). Squares ending in 5 are the special case where both last digits are 5.',
    ],
    alg: '(10n + b)(10n + 10 − b) = 100·n(n + 1) + b(10 − b)',
    sources: [TIRTHA], needsReview: true,
    ex: mul(43, 47),
    gen: guard((r, lv) => {
      const n = lv === 1 ? int(1, 5, r) : lv === 2 ? int(1, 9, r) : int(3, 19, r), b = int(1, 9, r);
      return mul(10 * n + b, 10 * n + 10 - b);
    }),
    work({ a, b }) {
      const n = Math.floor(a / 10), u = a % 10, v = b % 10;
      return [
        { t: `The front: ${n} × ${n + 1}`, v: n * (n + 1) },
        { t: `The last digits: ${u} × ${v} (two places)`, v: u * v },
        { t: 'Side by side', v: a * b },
      ];
    },
    fig: (q) => slate([[`${q.a}`, '', ''], [`${q.b}`, '', ''], [`${Math.floor(q.a / 10)} × ${Math.floor(q.a / 10) + 1}`, '|', `${q.a % 10} × ${q.b % 10}`], [`${Math.floor(q.a / 10) * (Math.floor(q.a / 10) + 1)}`, '|', String((q.a % 10) * (q.b % 10)).padStart(2, '0')]], [1], 'The front, then the last digits'),
  },
  {
    id: 'anurupyena', title: 'Proportionately: a working base of 50', kicker: 'When 100 is too far away',
    sutra: { sa: 'Ānurūpyeṇa', en: 'proportionately', sub: true },
    cards: [
      'Numbers near 50 are far from 100, so the gaps would be big. Use 50 as the base instead — it is half of 100.',
      '48 × 47: gaps 2 and 3 below 50. Cross: 48 − 3 = 45. With base 50, that is 45 × 50 = 2250 (half of 4500). Gaps: 2 × 3 = 6. Answer 2256.',
      'Why: (50 − x)(50 − y) = 50(50 − x − y) + xy — the Nikhilam cross, with a base of 50. Working "proportionately" means: do the cross as if near 100, then take half.',
    ],
    alg: '(50 ± x)(50 ± y) = 50(50 ± x ± y) + xy',
    sources: [TIRTHA], needsReview: true,
    ex: mul(48, 47, { B: 50 }),
    gen: guard((r, lv) => {
      const side = lv === 1 ? -1 : r() < 0.5 ? -1 : 1, hi = lv === 1 ? 5 : lv === 2 ? 8 : 12;
      return mul(nearOf(50, 1, hi, r, side), nearOf(50, 1, hi, r, side), { B: 50 });
    }),
    work({ a, b }) {
      const x = a - 50, y = b - 50;
      return [
        { t: `${a} is ${x < 0 ? 'below' : 'above'} 50 by`, v: Math.abs(x) },
        { t: `${b} is ${y < 0 ? 'below' : 'above'} 50 by`, v: Math.abs(y) },
        { t: `Cross: ${a} ${sgn(y)} ${Math.abs(y)}`, v: a + y },
        { t: `Base 50 is half of 100: ${a + y} × 100 ÷ 2`, v: (a + y) * 50 },
        { t: `Multiply the gaps: ${Math.abs(x)} × ${Math.abs(y)}`, v: x * y },
        { t: `${(a + y) * 50} + ${x * y}`, v: a * b },
      ];
    },
    fig: (q) => nikhilamFig(q.a, q.b, 50),
  },
  {
    id: 'paravartya', title: 'Transpose and apply', kicker: 'Dividing by 11, 12 and 13',
    sutra: { sa: 'Parāvartya Yojayet', en: 'transpose and apply' },
    cards: [
      'To divide by a number just over 10, like 12, split it into 10 and 2 — then turn the 2 into −2. Bring down the first digit. Each next digit: add the flag (−2) times the number you just wrote.',
      '156 ÷ 12: bring down 1. Next: 5 − 2 × 1 = 3. Last: 6 − 2 × 3 = 0. The last column is the remainder (0), the others are the answer: 13.',
      'Why: you are dividing by 10 + 2. Each time you write q, you have used q lots of 10 + 2, so you still owe −2 × q to the next column along. That is the "transpose": the + 2 moves across as − 2.',
      'Sometimes a column goes negative or grows past 9. That is fine — read the columns with carries (a −1 in the tens is −10), then share out whatever the remainder column holds.',
    ],
    alg: 'N = (10 + f)·Q + R: each digit of Q is next digit − f × the one before',
    sources: [TIRTHA], needsReview: true,
    ex: qDiv(156, 12),
    gen: guard((r, lv) => {
      const d = lv === 1 ? 11 : lv === 2 ? pick([11, 12], r) : pick([11, 12, 13], r);
      const Q = lv === 3 ? int(80, 769, r) : int(10, Math.floor(999 / d), r);
      return qDiv(d * Q, d);
    }),
    work({ N, d }) {
      const { f, a, c, Q, R } = para(N, d);
      const s = [{ t: `${d} is 10 + ${f}: the flag is −${f}. Bring down ${a[0]}`, v: c[0] }];
      for (let i = 1; i < c.length; i++) s.push({ t: `${a[i]} − ${f} × ${c[i - 1] < 0 ? `(${c[i - 1]})` : c[i - 1]}${i === c.length - 1 ? ' (the remainder column)' : ''}`, v: c[i] });
      s.push({ t: 'Read the answer columns, carries in', v: Q });
      s.push({ t: R === 0 ? 'Nothing left over, so the answer is' : `The remainder ${R} is ${R / d} lots of ${d}; so the answer is`, v: Q + R / d });
      return s;
    },
    fig: (q) => paraFig(q.N, q.d),
  },
  {
    id: 'check', title: 'The product of the sums', kicker: 'Checking with digit sums',
    sutra: { sa: 'Guṇitasamuccayaḥ', en: 'the product of the sum is the sum of the product' }, see: ['digit-root'],
    cards: [
      'Add up a number\'s digits, and keep adding until one digit is left: that is its digit root. 47 → 4 + 7 = 11 → 1 + 1 = 2.',
      'To check a multiplication, multiply the digit roots of the two numbers, and find the digit root of that. It must match the digit root of the answer. 47 × 23 = 1081? Roots 2 and 5; 2 × 5 = 10 → 1. And 1081 → 10 → 1. It matches, so it could be right.',
      'Why: a digit root is the remainder when you divide by 9 (with 9 for none left). Every 10 is 9 + 1, so 10, 100, 1000 all leave 1 — and remainders multiply just like the numbers do.',
      'Be careful: if the check fails, the answer is certainly wrong. If it passes, the answer COULD be right — swapping two digits, or being out by 9, slips past it.',
    ],
    alg: 'n ≡ digit sum of n (mod 9), and (a × b) mod 9 = ((a mod 9) × (b mod 9)) mod 9',
    sources: [TIRTHA], needsReview: true,
    ex: qRoot(47, 23),
    gen: guard((r, lv) => {
      const a = lv === 3 ? int(101, 999, r) : int(12, 99, r), b = int(12, lv === 1 ? 49 : 99, r);
      if (r() < 0.5) return qRoot(a, b);
      const t = a * b, kind = int(0, 3, r);
      const claim = kind === 0 ? t : kind === 1 ? t + pick([-1, 1], r) * int(1, 8, r) : kind === 2 ? t + pick([-9, 9, 18], r) : Number(String(t).split('').reverse().join('')) || t + 1;
      return qClaim(a, b, claim);
    }),
    work(q) {
      const ra = droot(q.a), rb = droot(q.b), rp = droot(ra * rb);
      const s = [{ t: `Digit root of ${q.a}`, v: ra }, { t: `Digit root of ${q.b}`, v: rb }, { t: `${ra} × ${rb} = ${ra * rb}, and its digit root`, v: rp }];
      if (q.kind === 'root') return s;
      s.push({ t: `Digit root of ${q.claim}`, v: droot(q.claim) });
      s.push({ t: rp === droot(q.claim) ? 'They match' : 'They do not match', v: q.ans });
      return s;
    },
    fig: (q) => slate([[`${q.a}`, '→', `${droot(q.a)}`], [`${q.b}`, '→', `${droot(q.b)}`], [`${droot(q.a)} × ${droot(q.b)}`, '→', `${droot(droot(q.a) * droot(q.b))}`], [`${q.a * q.b}`, '→', `${droot(q.a * q.b)}`]], [1], 'Digit roots on both sides must match'),
  },
  {
    id: 'sankalana', title: 'By adding and by subtracting', kicker: 'Two puzzles at once',
    sutra: { sa: 'Saṅkalana-vyavakalanābhyām', en: 'by addition and by subtraction' },
    cards: [
      'Sometimes two equations have their numbers swapped: 5x + 3y = 21 and 3x + 5y = 19. Add them, and subtract them.',
      'Add: 8x + 8y = 40, so x + y = 5. Subtract: 2x − 2y = 2, so x − y = 1. Now x is halfway between: (5 + 1) ÷ 2 = 3, and y = (5 − 1) ÷ 2 = 2.',
      'Why: adding gives (a + b)(x + y); subtracting gives (a − b)(x − y). Two easy divisions give the sum and the difference, and any two numbers are fixed by their sum and difference.',
    ],
    alg: '(a + b)(x + y) = p + q   ·   (a − b)(x − y) = p − q',
    sources: [TIRTHA], needsReview: true,
    ex: qSim(5, 3, 3, 2, 'x'),
    gen: guard((r, lv) => {
      const hi = lv === 1 ? 6 : lv === 2 ? 12 : 30, a = int(2, hi, r); let b = int(1, hi, r); if (b === a) b = a + 1;
      const x = int(1, lv === 3 ? 15 : 9, r), y = int(1, lv === 3 ? 15 : 9, r);
      return qSim(a, b, x, y, lv === 1 || r() < 0.5 ? 'x' : 'y');
    }),
    work(q) {
      const s = (q.p + q.q) / (q.a + q.b), d = (q.p - q.q) / (q.a - q.b);
      return [
        { t: `Add: ${q.a + q.b}(x + y) = ${q.p + q.q}, so x + y`, v: s },
        { t: `Subtract: ${q.a - q.b}(x − y) = ${q.p - q.q}, so x − y`, v: d },
        q.ask === 'x' ? { t: `x = (${s} + ${d}) ÷ 2`, v: (s + d) / 2 } : { t: `y = (${s} − ${d}) ÷ 2`, v: (s - d) / 2 },
      ];
    },
    fig: (q) => slate([[`${q.a}x + ${q.b}y`, '=', `${q.p}`], [`${q.b}x + ${q.a}y`, '=', `${q.q}`], [`${q.a + q.b}x + ${q.a + q.b}y`, '=', `${q.p + q.q}`], [`${q.a - q.b}x − ${q.a - q.b}y`, '=', `${q.p - q.q}`]], [1], 'Add, and subtract'),
  },
];

/* ------------------------------------------------------------- drawings */

function slate(rows, lineAfter = [], label = 'A worked layout') {
  return `<div class="${P}-slate" role="img" aria-label="${esc(label)}">${rows.map((r, i) => `<div class="${P}-srow${lineAfter.includes(i) ? ' ruled' : ''}">${r.map((c) => `<span>${esc(c)}</span>`).join('')}</div>`).join('')}</div>`;
}
function nikhilamFig(a, b, B) {
  const x = a - B, y = b - B, w = String(B).length - 1, tail = x * y;
  const pad = (v) => (B === 50 ? String(v) : String(v).padStart(w, '0'));
  return slate([[`${a}`, '|', `${sgn(x)}${Math.abs(x)}`], [`${b}`, '|', `${sgn(y)}${Math.abs(y)}`], [`${a + y}`, '|', tail >= 0 && tail < B ? pad(tail) : String(tail)]], [1], `${a} and ${b} with their gaps from ${B}`)
    + `<p class="${P}-cap">Base ${B}. Left: cross (${a} ${sgn(y)} ${Math.abs(y)}). Right: the gaps multiplied.${B === 50 ? ' The left side counts fifties.' : ''}</p>`;
}
function fromNineFig(a, b) {
  const w = String(a).length - 1, d = String(b).padStart(w, '0').split('');
  const top = d.map((_, i) => (i === w - 1 ? '10' : '9'));
  return slate([top, d, String(a - b).padStart(w, '0').split('')], [1], 'Each digit from 9, the last from 10');
}
function sq5Fig(a) {
  const n = Math.floor(a / 10), u = Math.min(4, 140 / a), A = (a - 5) * u, F = 5 * u, W = A + F + 150;
  const r = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${c}"/>`;
  const t = (x, y, s) => `<text x="${x}" y="${y}" class="dg-small" text-anchor="middle">${esc(s)}</text>`;
  let s = r(10, 10, A, A, 'dg-fill1') + r(10 + A, 10, F, A, 'dg-fill2') + r(10, 10 + A, A, F, 'dg-fill2') + r(10 + A, 10 + A, F, F, 'dg-fill3');
  s += t(10 + A / 2, 14 + A / 2, `${a - 5}×${a - 5}`) + t(10 + A / 2, 10 + A + F + 16, `${a} × ${a}`);
  const X = A + F + 40;
  s += r(X, 10, A, A, 'dg-fill1') + r(X, 10 + A, A, F, 'dg-fill2') + r(X, 10 + A + F, A, F, 'dg-fill2') + r(X + A + 6, 10 + A + F, F, F, 'dg-fill3');
  s += t(X + A / 2, 14 + A / 2, `${n * 10}×${n * 10}`) + t(X + A / 2, 10 + A + 2 * F + 16, `${n * 10} × ${(n + 1) * 10} + 25`);
  return `<svg class="dg" viewBox="0 0 ${X + A + F + 30} ${A + 2 * F + 34}" width="${Math.min(360, X + A + F + 30)}" role="img" aria-label="The square of ${a}, with one strip moved across to make a rectangle and a small square">${s}</svg>`
    + `<p class="${P}-cap">Move one strip across: the square becomes a ${n * 10} by ${(n + 1) * 10} rectangle, and a 5 by 5 square is left.</p>`;
}
function r19Fig() {
  const d = R19.slice(1);
  return `<p class="${P}-cap">1 ÷ 19, built from the right: each digit is double the one to its right, plus any carry.</p><div class="${P}-chain mono" role="img" aria-label="The eighteen repeating digits of one nineteenth">0.${d.map((x) => `<b>${x}</b>`).join('')}…</div>`;
}
function urdhvaFig(a, b) {
  if (a > 99 || b > 99) return slate([[...String(a)], [...String(b)]], [1], `${a} over ${b}`) + `<p class="${P}-cap">Five columns: vertical, crosswise, the star, crosswise, vertical.</p>`;
  const A = digits(a), B = digits(b), panel = (ox, pairs, label) => {
    let s = '';
    [0, 1].forEach((i) => { s += `<text x="${ox + 12 + i * 34}" y="24" class="dg-big" text-anchor="middle">${A[i]}</text><text x="${ox + 12 + i * 34}" y="78" class="dg-big" text-anchor="middle">${B[i]}</text>`; });
    for (const [i, j] of pairs) s += `<line x1="${ox + 12 + i * 34}" y1="32" x2="${ox + 12 + j * 34}" y2="60" class="dg-line"/>`;
    return s + `<text x="${ox + 29}" y="102" class="dg-small" text-anchor="middle">${label}</text>`;
  };
  const s = panel(8, [[1, 1]], 'units') + panel(100, [[0, 1], [1, 0]], 'crosswise') + panel(192, [[0, 0]], 'tens');
  return `<svg class="dg" viewBox="0 0 270 110" width="270" role="img" aria-label="Vertically, crosswise, vertically">${s}</svg>`;
}
function paraFig(N, d) {
  const { f, a, c } = para(N, d);
  return slate([[`${d}`, '|', ...a.map(String)], [`−${f}`, '|', '', ...c.slice(0, -1).map((v) => String(-f * v))], ['', '|', ...c.map(String)]], [1], `Dividing ${N} by ${d} with a flag of −${f}`)
    + `<p class="${P}-cap">Top: the digits of ${N}. Middle: −${f} times the column before. Bottom: the columns — the last one is the remainder.</p>`;
}
function badge(done) {
  return `<svg class="${P}-badge${done ? ' on' : ''}" viewBox="0 0 120 120" role="img" aria-label="${done ? 'The Sutra Walker badge, earned' : 'The Sutra Walker badge, not yet earned'}">
    <circle cx="60" cy="60" r="54" class="${P}-b1"/><circle cx="60" cy="60" r="44" class="${P}-b2"/>
    ${Array.from({ length: 16 }, (_, i) => { const t = (i / 16) * Math.PI * 2; return `<circle cx="${(60 + 49 * Math.cos(t)).toFixed(1)}" cy="${(60 + 49 * Math.sin(t)).toFixed(1)}" r="2.6" class="${P}-b3"/>`; }).join('')}
    <path d="M60 30 L68 52 L91 52 L72 66 L79 88 L60 74 L41 88 L48 66 L29 52 L52 52 Z" class="${P}-b3"/></svg>`;
}

/* ------------------------------------------------------------- the journey engine */

function rec(ctx) { const d = ctx.data; if (!d.passed) d.passed = {}; if (!d.best) d.best = {}; return d; }
export const isPassed = (ctx, i) => !!rec(ctx).passed[JOURNEY[i].id];
export const isOpen = (ctx, i) => i >= 0 && i < JOURNEY.length && (i === 0 || isPassed(ctx, i - 1));
const hereOf = (ctx) => { const i = JOURNEY.findIndex((_, k) => !isPassed(ctx, k)); return i < 0 ? JOURNEY.length : i; };
const level = (ctx) => ctx.ui.lv || LV[ctx.band] || 2;
const pages = (st) => st.cards.length + 1;   // the cards, then "Try it"

export function drillItems(st, lv, r = Math.random) {
  const out = [], seen = new Set();
  for (let i = 0; out.length < DRILL && i < 500; i++) {
    const q = st.gen(r, lv), k = q.text + '|' + q.expr;
    if (seen.has(k) && i < 300) continue;
    seen.add(k);
    const w = st.work(q), show = w.length > 6 ? [...w.slice(0, 2), { t: '…', v: '' }, ...w.slice(-2)] : w;
    q.explain = show.map((s) => (s.t === '…' ? '…' : `${s.t}: ${s.v}`)).join(' · ');
    out.push(q);
  }
  return out;
}

function pathView(ctx) {
  // the same painted road as every Atlas board (board.js): a painting, the dotted
  // road, a pin per stone, the child's avatar on the next one — tap to see, tap again to walk
  const d = rec(ctx), n = JOURNEY.length, here = hereOf(ctx), walked = JOURNEY.filter((_, i) => isPassed(ctx, i)).length;
  const sel = ctx.ui.sel != null ? ctx.ui.sel : Math.min(here, n - 1), st = JOURNEY[sel], lv = level(ctx);
  const stops = JOURNEY.map((s, i) => ({ label: `Stone ${i + 1}: ${s.title}`, state: isPassed(ctx, i) ? 'done' : isOpen(ctx, i) ? 'open' : 'locked', act: 'lib', arg: `pick|${i}` }));
  const open = isOpen(ctx, sel);
  return `<div class="${P}">
    <div class="card ${P}-head"><div><p class="kicker">A journey of ${n} stones</p><h2>The Sutra Path</h2><p class="muted">Short Sanskrit sayings from a 1965 book, and the algebra that makes every one of them work.</p></div>
      <div class="${P}-prog"><b class="mono">${walked}/${n}</b><div class="${P}-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${walked}"><i style="width:${Math.round((walked / n) * 100)}%"></i></div><span class="muted small">stones walked</span></div></div>
    ${d.badge ? `<div class="card ${P}-won">${badge(true)}<div><p class="kicker">Journey complete</p><h3>Sutra Walker</h3><p>You walked every stone. Any stone can be walked again.</p></div></div>` : ''}
    ${paintedRoad({ img: 'j-vedic', stops, here: here < n ? here : -1, sel, me: avatarImg(ctx), minWidth: 1280 })}
    <div class="card pick ${P}-pick">
      <div class="pick-t"><p class="kicker">Stone ${sel + 1} of ${n}${isPassed(ctx, sel) ? ' · walked ✓' : ''}</p><h2>${esc(st.title)}</h2><p class="pick-hook">${st.sutra ? esc(st.sutra.sa) : esc(st.kicker || '')}</p></div>
      ${open ? `<button class="btn primary big" data-act="lib" data-arg="open|${sel}">${isPassed(ctx, sel) ? 'Walk it again' : 'Step onto the stone'}</button>` : '<p class="muted">Walk the stone before it to open this one.</p>'}
    </div>
    <div class="${P}-lv"><span class="muted">Questions:</span><div class="seg">${[1, 2, 3].map((l) => `<button class="${l === lv ? 'on' : ''}" data-act="lib" data-arg="lv|${l}">${LV_NAME[l]}</button>`).join('')}</div></div>
  </div>`;
}
const avatarImg = (ctx) => `<img class="av" src="avatars/${esc(avatarFile(ctx.kid && ctx.kid.avatar))}.webp" width="34" height="34" alt="">`;

function stepView(ctx, i) {
  const st = JOURNEY[i], d = rec(ctx), np = pages(st), c = Math.max(0, Math.min(np - 1, ctx.ui.card || 0)), lv = level(ctx);
  const onTry = c === st.cards.length, last = c === st.cards.length - 1;
  let body;
  if (!onTry) {
    body = `<p class="${P}-para">${esc(st.cards[c])}</p>`;
    if (st.alg && c === Math.max(0, st.cards.length - 2)) body += `<div class="${P}-alg mono">${esc(st.alg)}</div>`;
    if (last && st.ex) {
      const w = st.work(st.ex);
      body += `<div class="${P}-ex"><p class="kicker">Worked example · ${esc(st.ex.text)}</p>${st.fig ? st.fig(st.ex, ctx) : ''}
        <ol class="${P}-steps">${w.map((s) => `<li><span>${esc(s.t)}</span><b class="mono">${esc(s.v)}</b></li>`).join('')}</ol></div>`;
    }
  } else if (st.gen) {
    const best = d.best[st.id];
    body = `<div class="${P}-try"><p class="kicker">Try it</p><h3>Ten questions. Eight right and you walk on.</h3>
      <p class="muted">Each answer you get wrong shows you the method, step by step.</p>
      <div class="seg">${[1, 2, 3].map((l) => `<button class="${l === lv ? 'on' : ''}" data-act="lib" data-arg="lv|${l}">${LV_NAME[l]}</button>`).join('')}</div>
      <button class="btn primary big" data-act="lib" data-arg="start">Start — ${LV_NAME[lv]}</button>
      ${best != null ? `<p class="muted">Your best here: ${best} of ${DRILL}${isPassed(ctx, i) ? ' — walked.' : '.'}</p>` : ''}</div>`;
  } else {
    body = `<div class="${P}-try"><p class="kicker">Walk on</p><h3>Now you know where the sutras come from.</h3>
      <p class="muted">The next stones are the methods themselves.</p>
      <button class="btn primary big" data-act="lib" data-arg="read">${isPassed(ctx, i) ? 'Back to the path' : 'Walk on to stone 2'}</button></div>`;
  }
  const links = [st.stop, ...(st.see || [])].filter((s) => s && byId[s]);
  return `<div class="${P}">
    <div class="${P}-top"><button class="btn small" data-act="lib" data-arg="path">← The path</button>
      <span class="chip">Stone ${i + 1} of ${JOURNEY.length}</span>${isPassed(ctx, i) ? '<span class="chip">✓ Walked</span>' : ''}</div>
    <div class="card ${P}-step">
      <div class="${P}-sh" style="background-image:url(art/lib-vedic.webp)"><p class="kicker">${esc(st.kicker || '')}</p><h2>${esc(st.title)}</h2></div>
      ${st.sutra ? `<div class="${P}-sutra"><span lang="sa-Latn">${esc(st.sutra.sa)}</span><em>“${esc(st.sutra.en)}”${st.sutra.sub ? ' · a sub-sutra' : ''}</em></div>` : ''}
      <div class="${P}-page" aria-live="polite">${body}</div>
      <div class="${P}-nav">
        <button class="btn" data-act="lib" data-arg="card|${c - 1}" ${c === 0 ? 'disabled' : ''} aria-label="Previous card">←</button>
        <div class="${P}-dots">${Array.from({ length: np }, (_, k) => `<button class="${k === c ? 'on' : ''}" data-act="lib" data-arg="card|${k}" aria-label="${k === np - 1 ? 'Try it' : `Card ${k + 1}`}"></button>`).join('')}</div>
        <button class="btn${onTry ? '' : ' primary'}" data-act="lib" data-arg="card|${c + 1}" ${onTry ? 'disabled' : ''} aria-label="Next card">→</button>
      </div>
      <p class="${P}-keys muted">Keys: ← → turn the cards · Esc back to the path</p>
    </div>
    ${links.length ? `<div class="${P}-links"><span class="muted">In the Atlas:</span> ${links.map((s) => `<button class="btn small" data-act="openStop" data-arg="${s}">${esc(byId[s].title)}</button>`).join('')}</div>` : ''}
    ${st.sources ? `<details class="${P}-src"><summary>Sources${st.needsReview ? ' · being checked by a second reader' : ''}</summary><ol>${st.sources.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></details>` : ''}
  </div>`;
}

export function view(ctx) {
  const i = ctx.ui.step;
  return i != null && isOpen(ctx, i) ? stepView(ctx, i) : pathView(ctx);
}

export function act(name, arg, ctx) {
  const ui = ctx.ui;
  if (name === 'pick') { const i = +arg; if (ctx.ui.sel === i && isOpen(ctx, i)) return act('open', arg, ctx); ctx.ui.sel = i; return; }
  if (name === 'open') {
    const i = +arg;
    if (!isOpen(ctx, i)) { ctx.toast('Walk the stones before this one first.'); ctx.sfx.bad(); return; }
    ui.step = i; ui.card = 0; ctx.sfx.click(); return;
  }
  if (name === 'path') { ui.step = null; return; }
  if (name === 'lv') { const l = +arg; if (l >= 1 && l <= 3) ui.lv = l; return; }
  if (ui.step == null || !isOpen(ctx, ui.step)) return;
  const st = JOURNEY[ui.step];
  if (name === 'card') { ui.card = Math.max(0, Math.min(pages(st) - 1, +arg || 0)); return; }
  if (name === 'start') {
    if (!st.gen) return;
    const lv = level(ctx);
    ctx.startRun(st.title, drillItems(st, lv), { step: st.id, level: lv, sub: `Vedic Maths Journey · stone ${ui.step + 1} · ${LV_NAME[lv]}` });
    return;
  }
  if (name === 'read') {
    if (st.gen) return;               // a stone with questions is walked only by passing them
    const d = rec(ctx), first = !d.passed[st.id];
    d.passed[st.id] = true; ctx.save();
    if (first) { ctx.sfx.good(); ctx.toast('Stone 2 is open.'); }
    ui.step = null; ui.card = 0;
  }
}

export function key(e, ctx) {
  const ui = ctx.ui;
  if (ui.step == null || !isOpen(ctx, ui.step)) return false;
  const st = JOURNEY[ui.step], c = ui.card || 0;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') { ui.card = Math.min(pages(st) - 1, c + 1); return true; }
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') { ui.card = Math.max(0, c - 1); return true; }
  if (e.key === 'Escape') { ui.step = null; return true; }
  return false;
}

export function done(run, ctx) {
  const sid = run.step ?? (run.extra && run.extra.step);
  const i = JOURNEY.findIndex((s) => s.id === sid);
  if (i < 0 || !isOpen(ctx, i)) return null;   // a stone that is not open cannot be walked
  const st = JOURNEY[i], d = rec(ctx);
  const right = (run.results || []).filter((r) => r.right).length;
  d.best[sid] = Math.max(d.best[sid] || 0, right);
  const stars = right >= DRILL ? 3 : right >= 9 ? 2 : right >= PASS ? 1 : 0;
  const lines = [], buttons = [];
  if (right >= PASS) {
    const first = !d.passed[sid];
    d.passed[sid] = true;
    const all = JOURNEY.every((s) => d.passed[s.id]);
    if (all && !d.badge) {
      d.badge = true;
      lines.push('<b>The whole path is walked. You have earned the Sutra Walker badge.</b>');
      ctx.sfx.level(); ctx.confetti(80);
    } else if (first) {
      lines.push(i + 1 < JOURNEY.length ? `<b>${right} of ${DRILL} — stone ${i + 2} is open: ${esc(JOURNEY[i + 1].title)}.</b>` : `<b>${right} of ${DRILL}.</b>`);
      ctx.sfx.level(); ctx.confetti(40);
    } else lines.push(`${right} of ${DRILL} — walked again.`);
    ctx.ui.step = i + 1 < JOURNEY.length ? i + 1 : null; ctx.ui.card = 0;
    buttons.push(`<button class="btn primary" data-act="openTool" data-arg="vedic">${i + 1 < JOURNEY.length ? `Walk on to stone ${i + 2}` : 'See the path'}</button>`);
  } else {
    lines.push(`${PASS} of ${DRILL} walks you on — you got ${right}. Every one you missed showed its working; look at the worked example again, then try another ten.`);
    ctx.ui.step = i; ctx.ui.card = st.cards.length;
    buttons.push('<button class="btn primary" data-act="openTool" data-arg="vedic">Back to the stone</button>');
  }
  ctx.save();
  return { stars, lines, buttons };
}

export const CSS = `
.${P}{max-width:760px;margin:0 auto}
.${P}-hero{border-radius:var(--r-lg);background-size:cover;background-position:center;min-height:210px;display:flex;align-items:flex-end;overflow:hidden;box-shadow:var(--sh-raised);margin-bottom:18px}
.${P}-hero-in{width:100%;padding:18px 20px;background:linear-gradient(to top,var(--surface) 55%,color-mix(in srgb,var(--surface) 0%,transparent))}
.${P}-hero-in h2{font-family:var(--display);font-size:var(--fs-h1);margin:0 0 4px;color:var(--ink)}
.${P}-hero-in p{margin:0 0 8px;color:var(--ink)}
.${P}-bar{height:10px;border-radius:10px;background:var(--line);overflow:hidden}
.${P}-bar i{display:block;height:100%;background:var(--treasure);border-radius:10px}
.${P}-count{font-size:var(--fs-label);color:var(--muted)!important;margin:6px 0 0!important}
.${P}-map{position:relative;margin:8px 0 18px;border-radius:var(--r-lg);background:radial-gradient(circle at 30% 20%,var(--action-tint),transparent 60%),radial-gradient(circle at 80% 70%,var(--treasure-tint),transparent 55%),var(--surface2)}
.${P}-trail{position:absolute;inset:0;width:100%;height:100%}
.${P}-t0{fill:none;stroke:var(--line);stroke-width:10;stroke-linecap:round;vector-effect:non-scaling-stroke;stroke-dasharray:2 14}
.${P}-t1{fill:none;stroke:var(--treasure);stroke-width:5;stroke-linecap:round;vector-effect:non-scaling-stroke}
.${P}-stone{position:absolute;transform:translate(-50%,-50%);width:50px;height:42px;border-radius:50% 46% 52% 44%/56% 50% 46% 48%;border:0;cursor:pointer;display:grid;place-items:center;font:800 16px var(--mono);box-shadow:0 4px 0 var(--line),var(--sh);background:var(--surface);color:var(--muted);padding:0;transition:transform .15s}
.${P}-stone:hover,.${P}-stone:focus-visible{transform:translate(-50%,-50%) scale(1.08)}
.${P}-stone.done{background:var(--mastered);color:var(--surface);box-shadow:0 4px 0 var(--mastered-tint),var(--sh)}
.${P}-stone.here{background:var(--action);color:var(--action-ink);box-shadow:0 0 0 5px var(--action-tint),0 4px 0 var(--action-deep)}
.${P}-stone.locked{opacity:.75}
.${P}-you{position:absolute;top:-24px;left:50%;transform:translateX(-50%);font:700 11px var(--ui);background:var(--treasure);color:var(--ink);padding:2px 8px;border-radius:var(--r-pill);animation:${P}-bob 1.6s ease-in-out infinite}
@keyframes ${P}-bob{50%{transform:translate(-50%,-4px)}}
@media (prefers-reduced-motion:reduce){.${P}-you{animation:none}}
.${P}-lab{position:absolute;top:50%;transform:translateY(-50%);width:min(40vw,250px);font:600 13px/1.25 var(--ui);color:var(--ink);text-align:left;pointer-events:none}
.${P}-lab b{display:block;font-weight:700}.${P}-lab i{display:block;color:var(--muted);font-size:12px}
.${P}-stone.lab-r .${P}-lab{left:60px}.${P}-stone.lab-l .${P}-lab{right:60px;text-align:right}
.${P}-next{text-align:center}.${P}-next h3{margin:2px 0}
.${P}-lv{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;margin-top:14px}.${P}-lv .seg{margin:0}
.${P}-won{display:flex;gap:16px;align-items:center}.${P}-won h3{margin:0 0 4px}
.${P}-badge{width:96px;height:96px;flex:none}.${P}-b1{fill:var(--treasure)}.${P}-b2{fill:var(--treasure-tint);stroke:var(--treasure-deep);stroke-width:2}.${P}-b3{fill:var(--treasure-deep)}
.${P}-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
.${P}-step{padding:0;overflow:hidden}
.${P}-sh{background-size:cover;background-position:center;padding:60px 20px 14px;position:relative}
.${P}-sh::before{content:"";position:absolute;inset:0;background:linear-gradient(to top,var(--surface) 30%,color-mix(in srgb,var(--surface) 10%,transparent))}
.${P}-sh>*{position:relative;margin:0}.${P}-sh h2{font-family:var(--display);font-size:var(--fs-h2)}
.${P}-sutra{margin:0 20px;padding:12px 16px;border-radius:var(--r-md);background:var(--action-tint);border-left:4px solid var(--action)}
.${P}-sutra span{display:block;font:700 var(--fs-h3) var(--display);color:var(--ink)}.${P}-sutra em{color:var(--muted)}
.${P}-page{padding:16px 20px 4px;min-height:150px}
.${P}-para{font-size:var(--fs-lead);line-height:1.55}
.${P}-alg{padding:10px 14px;border-radius:var(--r-md);background:var(--surface2);border:1px dashed var(--line);font-size:14px;overflow-x:auto}
.${P}-ex{margin-top:12px;padding:14px;border-radius:var(--r-md);background:var(--surface2)}
.${P}-ex .dg{max-width:100%;height:auto;display:block;margin:6px auto}
.${P}-steps{margin:10px 0 0;padding-left:22px}.${P}-steps li{display:flex;justify-content:space-between;gap:12px;padding:5px 0;border-bottom:1px solid var(--line-soft)}
.${P}-steps b{color:var(--action)}
.${P}-slate{display:inline-grid;gap:2px;margin:6px auto;padding:10px 14px;border-radius:var(--r-md);background:var(--surface);font:700 20px var(--mono)}
.${P}-srow{display:flex;gap:10px;justify-content:flex-end;padding:2px 0}.${P}-srow span{min-width:1.1em;text-align:center}
.${P}-srow.ruled{border-bottom:2px solid var(--ink);padding-bottom:6px;margin-bottom:4px}
.${P}-cap{font-size:var(--fs-label);color:var(--muted);margin:4px 0 8px}
.${P}-chain{display:flex;flex-wrap:wrap;gap:3px;font-size:18px;align-items:center}.${P}-chain b{padding:2px 5px;border-radius:6px;background:var(--surface);color:var(--ink)}
.${P}-try{text-align:center;padding:10px 0}.${P}-try .seg{margin:12px auto}
.${P}-nav{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 20px}
.${P}-dots{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
.${P}-dots button{width:14px;height:14px;border-radius:50%;border:2px solid var(--line);background:var(--surface);padding:0;cursor:pointer}
.${P}-dots button.on{background:var(--action);border-color:var(--action)}
.${P}-dots button:last-child{border-radius:3px}
.${P}-keys{font-size:var(--fs-meta);text-align:center;margin:0 0 12px}
.${P}-links{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 12px}
.${P}-src{font-size:var(--fs-label);color:var(--muted);margin-bottom:16px}.${P}-src summary{cursor:pointer;font-weight:650}
@media (max-width:560px){.${P}-lab{width:34vw;font-size:12px}.${P}-lab i{display:none}.${P}-hero{min-height:170px}}
`;

/* ------------------------------------------------------------- selftest */

export function selftest(ok, makeCtx) {
  const ev = (e) => Function(`return (${e})`)();
  // every step, every level: ans, expr and the last step agree; nothing leaks
  for (const st of JOURNEY) {
    ok(st.cards.length >= 2 && st.cards.length <= 5, `vedic/${st.id}: 2–5 cards`);
    if (st.needsReview) ok(st.sources && st.sources.length, `vedic/${st.id}: needsReview without sources`);
    if (st.stop) ok(byId[st.stop] && byId[st.stop].world === 'observatory', `vedic/${st.id}: stop ${st.stop} is an Observatory stop`);
    if (st.stop && byId[st.stop] && byId[st.stop].sutra) ok(st.sutra.sa.startsWith(byId[st.stop].sutra.sa), `vedic/${st.id}: sutra name agrees with the Observatory`);
    for (const s of st.see || []) ok(byId[s], `vedic/${st.id}: linked stop ${s} exists`);
    if (!st.gen) continue;
    ok(st.ex && ev(st.ex.expr) === (st.ex.choices ? st.ex.ans : +st.ex.ans), `vedic/${st.id}: worked example is true`);
    ok(st.work(st.ex).at(-1).v === st.ex.ans, `vedic/${st.id}: worked example's steps end on its answer`);
    let r = 1; const rand = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
    for (const lv of [1, 2, 3]) for (let k = 0; k < 150; k++) {
      const q = st.gen(rand, lv), w = st.work(q);
      ok(q.choices ? ev(q.expr) === q.ans : ev(q.expr) === q.ans, `vedic/${st.id}: ${q.text} expr`);
      ok(w.at(-1).v === q.ans, `vedic/${st.id}: ${q.text} steps end on ${w.at(-1).v}, ans ${q.ans}`);
      ok(!leaks(q), `vedic/${st.id}: ${q.text} leaks`);
      if (!q.choices) ok(Number.isInteger(q.ans) && q.ans >= 0, `vedic/${st.id}: ${q.text} whole answer`);
      ok(w.every((s) => s.v !== undefined && !Number.isNaN(s.v)), `vedic/${st.id}: every step has a value`);
    }
  }
  // the origin stone is the Observatory's own words and sources
  const origin = JOURNEY[0];
  ok(ORIGIN.every((p, i) => origin.cards[i] === p), 'vedic: origin cards are the Observatory intro, verbatim');
  ok(origin.sources.join() === OBS.intro.sources.join(), 'vedic: origin cites the Observatory sources');
  ok(/1965/.test(origin.cards.join(' ')) && /not found/.test(origin.cards.join(' ')), 'vedic: origin says 1965 and not found');
  ok(JOURNEY.length >= 10 && JOURNEY.length <= 14, 'vedic: 10–14 stones');
  ok(new Set(JOURNEY.map((s) => s.id)).size === JOURNEY.length, 'vedic: stone ids unique');
  // the algebra, proved over ranges (not just the examples)
  for (let n = 0; n <= 30; n++) ok((10 * n + 5) ** 2 === 100 * n * (n + 1) + 25, `vedic: (10n+5)² identity at n=${n}`);
  const big = (10n ** 18n / 19n).toString().padStart(18, '0');
  ok(R19.slice(1).join('') === big, `vedic: doubling chain gives 1/19 = 0.${big}`);
  for (let k = 1; k <= 15; k++) ok(Math.floor(10 ** k / 19) % 10 === R19[k], `vedic: digit ${k} of 1/19 by float matches`);
  for (const B of [10, 50, 100, 1000]) for (let x = -12; x <= 12; x++) for (let y = -12; y <= 12; y++) {
    if (x * y < 0) continue;
    const w = nearBase(B + x, B + y, B);
    ok(w[2].v * B + w[3].v === (B + x) * (B + y) && w.at(-1).v === (B + x) * (B + y), `vedic: cross at base ${B}, ${B + x} × ${B + y}`);
  }
  for (let n = 1; n <= 20; n++) for (let b = 1; b <= 9; b++) ok((10 * n + b) * (10 * n + 10 - b) === 100 * n * (n + 1) + b * (10 - b), `vedic: last-digits-ten identity ${n}, ${b}`);
  for (let a = 2; a <= 999; a += 7) { const nines = 10 ** String(a).length - 1; ok(Number(`${a - 1}${String(nines - (a - 1)).padStart(String(nines).length, '0')}`) === a * nines, `vedic: ${a} × ${nines} by one-less`); }
  for (const d of [11, 12, 13]) for (let N = 100; N <= 9999; N += 37) { const p = para(N, d); ok(d * p.Q + p.R === N, `vedic: Paravartya ${N} = ${d}·${p.Q} + ${p.R}`); }
  for (let a = 1; a <= 150; a += 3) for (let b = 1; b <= 150; b += 7) ok(droot(a * b) === droot(droot(a) * droot(b)) && droot(a) === ((a - 1) % 9) + 1, `vedic: digit roots multiply (${a}, ${b})`);
  for (let a = 11; a <= 99; a += 4) for (let b = 11; b <= 99; b += 6) { const c = columns(a, b); ok(c[2].s * 100 + c[1].s * 10 + c[0].s === a * b, `vedic: crosswise columns ${a} × ${b}`); }
  for (let a = 101; a <= 999; a += 83) for (let b = 101; b <= 999; b += 97) { const c = columns(a, b); ok(c.reduce((s, x, i) => s + x.s * 10 ** i, 0) === a * b, `vedic: five columns ${a} × ${b}`); }
  for (let t = 0; t < 60; t++) { const q = qSim(2 + (t % 7), 1 + (t % 5) + (t % 7 === t % 5 ? 3 : 0), 1 + (t % 9), 1 + ((t * 5) % 11), 'x'); ok(q.a * q.x + q.b * q.y === q.p && q.b * q.x + q.a * q.y === q.q, `vedic: simultaneous pair ${q.text}`); }

  // the journey: every stone locked until the one before is passed through done()
  for (const band of ['6-7', '8-10', '11-14']) {
    const ctx = makeCtx('vedic', band);
    ok(isOpen(ctx, 0) && !isOpen(ctx, 1), `vedic (${band}): only the first stone opens at the start`);
    act('open', '1', ctx);
    ok(ctx.ui.step == null, `vedic (${band}): a locked stone does not open`);
    act('open', '0', ctx);
    ok(ctx.ui.step === 0, `vedic (${band}): the first stone opens`);
    for (let c = 0; c < pages(JOURNEY[0]); c++) { ctx.ui.card = c; const h = view(ctx); ok(h.includes('Where the sutras') && !/undefined|NaN/.test(h), `vedic (${band}): origin card ${c} renders`); }
    act('start', '', ctx);
    ok(ctx.runs.length === 0, `vedic (${band}): the origin stone has no drill`);
    act('read', '', ctx);
    ok(isPassed(ctx, 0) && isOpen(ctx, 1) && !isOpen(ctx, 2), `vedic (${band}): reading the origin opens stone 2 only`);
    for (let i = 1; i < JOURNEY.length; i++) {
      const st = JOURNEY[i];
      ok(!isOpen(ctx, i + 1) || i + 1 >= JOURNEY.length, `vedic (${band}): stone ${i + 2} locked before ${i + 1} is passed`);
      act('open', String(i), ctx);
      ok(ctx.ui.step === i, `vedic (${band}): stone ${i + 1} opens`);
      for (let c = 0; c < pages(st); c++) { act('card', String(c), ctx); const h = view(ctx); ok(h.length > 200 && !/undefined|NaN|\[object Object\]/.test(h), `vedic (${band}): ${st.id} page ${c} renders`); }
      ok(key({ key: 'ArrowLeft' }, ctx) && ctx.ui.card === pages(st) - 2, `vedic (${band}): ← turns back a card`);
      ok(key({ key: 'ArrowRight' }, ctx) && ctx.ui.card === pages(st) - 1, `vedic (${band}): → turns a card`);
      act('read', '', ctx);
      ok(!isPassed(ctx, i), `vedic (${band}): ${st.id} cannot be passed by reading`);
      const n0 = ctx.runs.length; act('start', '', ctx);
      ok(ctx.runs.length === n0 + 1, `vedic (${band}): ${st.id} starts a drill`);
      const run = ctx.runs.at(-1);
      ok(run.items.length === DRILL && run.extra.step === st.id && run.extra.level === LV[band], `vedic (${band}): ${st.id} drill is ten at the band's level`);
      for (const q of run.items) ok(typeof q.explain === 'string' && q.explain.length > 3, `vedic (${band}): ${st.id} item explains itself`);
      // seven right: not enough
      const r7 = done({ items: run.items, results: run.items.map((_, k) => ({ right: k < PASS - 1 })), step: st.id }, ctx);
      ok(!isPassed(ctx, i) && (i + 1 >= JOURNEY.length || !isOpen(ctx, i + 1)), `vedic (${band}): 7 of 10 does not pass ${st.id}`);
      ok(r7.stars === 0 && r7.buttons.length && ctx.ui.step === i && ctx.ui.card === st.cards.length, `vedic (${band}): a miss returns to the try page`);
      // eight right, through extra (as the test harness passes it): passes
      const r8 = done({ items: run.items, results: run.items.map((_, k) => ({ right: k < PASS })), extra: { step: st.id } }, ctx);
      ok(isPassed(ctx, i) && r8.stars === 1, `vedic (${band}): 8 of 10 passes ${st.id}`);
      if (i + 1 < JOURNEY.length) ok(isOpen(ctx, i + 1) && ctx.ui.step === i + 1 && (i + 2 >= JOURNEY.length || !isOpen(ctx, i + 2)), `vedic (${band}): passing ${st.id} opens exactly the next stone`);
    }
    ok(rec(ctx).badge === true, `vedic (${band}): the badge is earned at the end`);
    ctx.ui.step = null;
    const h = view(ctx);
    ok(h.includes('Sutra Walker') && !/undefined|NaN/.test(h), `vedic (${band}): the finished path shows the badge`);
    act('lv', '9', ctx); ok(level(ctx) === LV[band], `vedic (${band}): a bad level is refused`);
    act('lv', '1', ctx); ok(level(ctx) === 1, `vedic (${band}): level can be chosen`);
  }
  // done() for someone else's run is not ours
  const c2 = makeCtx('vedic');
  ok(done({ items: [], results: [], step: 'nope' }, c2) === null, 'vedic: done ignores unknown steps');
  ok(done({ items: [], results: Array(10).fill({ right: true }), step: 'urdhva' }, c2) === null && !isPassed(c2, JOURNEY.findIndex((s) => s.id === 'urdhva')), 'vedic: a locked stone cannot be passed by a stray run');
}
