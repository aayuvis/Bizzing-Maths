/* quarry.js — The Prime Quarry: what kinds of number there are, and the
   stones they are built from. The families (counting, whole, integers), odd
   and even, the shapes numbers make (square, triangular, cube), and then the
   big idea: every whole number is built from prime stones in exactly one way.
   Everything after that — coprime pairs, counting factors, which fractions
   end as decimals, which square roots are fractions at all — is read off the
   stones. The Factor Forest finds the stones (factor trees, HCF, LCM); the
   Quarry asks what the stones tell you. Contract: docs/CHAPTER-CONTRACT.md. */

import { int, pick } from '../rand.js';
import { svg, text } from './kit.js';

export const WORLD = {
  id: 'quarry', name: 'The Prime Quarry', short: 'Quarry', band: '8-10',
  blurb: 'Primes are the stones every number is built from. Learn to read a number by its stones.',
  tint: '#EEEAE3', ink: '#47392B', glyph: '🪨',
};

/* ---------------------------------------------------------------- helpers */

const leaks = (q) => !q.choices && String(q.ans).length > 1 && q.text.replace(/,/g, '').split(/[^0-9./]/).includes(String(q.ans));
function fresh(make) { let q; for (let i = 0; i < 80; i++) { q = make(); if (!leaks(q)) return q; } return q; }
const YN = ['Yes', 'No'];
const yn = (b) => (b ? 'Yes' : 'No');
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const neg = (n) => (n < 0 ? '−' + Math.abs(n) : String(n));
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (n) => String(n).split('').map((d) => SUP[+d]).join('');

/* Prime stones, smallest first. */
function stones(n) {
  const out = []; let m = n;
  for (let p = 2; p * p <= m; p++) while (m % p === 0) { out.push(p); m /= p; }
  if (m > 1) out.push(m);
  return out;
}
/* Stones grouped: [[prime, how many], ...] */
function powers(n) {
  const out = [];
  for (const p of stones(n)) { const last = out.at(-1); if (last && last[0] === p) last[1]++; else out.push([p, 1]); }
  return out;
}
const isPrime = (n) => n > 1 && stones(n).length === 1;
const isSquare = (n) => { const r = Math.round(Math.sqrt(n)); return r * r === n; };
const isCube = (n) => { const r = Math.round(Math.cbrt(n)); return r * r * r === n; };
const isTri = (n) => isSquare(8 * n + 1);
const unpaired = (n) => powers(n).filter(([, e]) => e % 2 === 1).length;

/* ================================================================ stops */

const FAM = ['counting number', 'whole number', 'integer', 'not an integer'];
const FAM3 = FAM.slice(0, 3);
function family(x) {
  if (!Number.isInteger(x)) return FAM[3];
  if (x < 0) return FAM[2];
  return x === 0 ? FAM[1] : FAM[0];
}

/* Three hoops, one inside the next: counting ⊂ whole ⊂ integers. */
function hoops() {
  let s = `<ellipse cx="180" cy="100" rx="172" ry="94" class="dg-blank"/>`;
  s += `<ellipse cx="200" cy="112" rx="124" ry="66" class="dg-setb"/>`;
  s += `<ellipse cx="218" cy="122" rx="74" ry="38" class="dg-seta"/>`;
  s += text(180, 24, 'integers  … −2, −1', 'dg-text');
  s += text(196, 62, 'whole numbers  0', 'dg-text');
  s += text(218, 118, 'counting', 'dg-text') + text(218, 138, '1, 2, 3 …', 'dg-small');
  return svg(360, 200, s, 'Three hoops, one inside the next: counting numbers inside whole numbers inside integers');
}

/* Pairs of dots: a number stood in twos. An odd number leaves one on its own. */
function pairs(n, x0, u = 14) {
  let s = '';
  for (let i = 0; i < n; i++) s += `<circle cx="${x0 + Math.floor(i / 2) * u + u / 2}" cy="${i % 2 === 0 ? 20 : 20 + u}" r="${u * 0.34}" class="${n % 2 && i === n - 1 ? 'dg-dot' : 'dg-dot2'}"/>`;
  return { s, w: Math.ceil(n / 2) * u };
}

/* Prime stones in a row, one of them possibly a ?. */
function stoneRow(list, total) {
  let s = '', x = 30;
  list.forEach((p, i) => {
    s += `<circle cx="${x}" cy="34" r="24" class="${p === '?' ? 'dg-blank' : 'dg-fill2'}"/>` + text(x, 41, p, p === '?' ? 'dg-accent' : 'dg-big');
    if (i < list.length - 1) s += text(x + 32, 40, '×', 'dg-text');
    x += 64;
  });
  s += text(x - 22, 40, '=', 'dg-text') + text(x + 14, 41, total, total === '?' ? 'dg-accent' : 'dg-big');
  return svg(x + 50, 70, s, 'Prime stones multiplied together');
}

export const TRICKS = [
  {
    id: 'number-families', world: 'quarry', band: '8-10', title: 'Number families', keys: ['−'],
    hook: '−4, 0 and 7 — are they all the same kind of number?',
    idea: 'Ask three questions in order: is it a whole amount? Is it below zero? Is it zero? The answers say which family it belongs to.',
    why: [
      'The counting numbers are the ones you count with: 1, 2, 3, and on for ever. Add zero — the number of sweets in an empty jar — and you have the whole numbers. Add the numbers below zero too, like −4 °C on a cold morning, and you have the integers. (Some books call the counting numbers "natural numbers". Books do not all agree on the names, so this Quarry says which one it means.)',
      'The families sit one inside the next, like hoops. 7 is a counting number, so it is also a whole number and an integer. 0 is not a counting number — you never start counting with "zero" — but it is whole. −4 is only an integer. So the useful question is the SMALLEST hoop a number fits in.',
      'A number with a part left over — 3.5, or 7 ÷ 2 — is in none of these hoops. It is still a perfectly good number, just not an integer. Sums can move a number between families: 7 − 12 starts with two counting numbers and lands outside that hoop, below zero.',
    ],
    alg: 'counting {1, 2, 3, …} ⊂ whole {0, 1, 2, …} ⊂ integers {…, −2, −1, 0, 1, 2, …}',
    ex: { js: '-4', show: '−4', lv: 2 },
    gen(r, lv = 1) {
      if (lv === 1) { const x = r() < 0.3 ? 0 : int(1, 40, r); return this.q({ js: String(x), show: String(x), lv }); }
      if (lv === 2) {
        const k = r();
        if (k < 0.35) { const x = -int(1, 50, r); return this.q({ js: `(${x})`, show: neg(x), lv }); }
        if (k < 0.5) return this.q({ js: '0', show: '0', lv });
        if (k < 0.75) { const x = int(1, 99, r); return this.q({ js: String(x), show: String(x), lv }); }
        const a = int(2, 20, r), b = int(2, 25, r); return this.q({ js: `${a}-${b}`, show: `the answer to ${a} − ${b}`, lv });
      }
      const k = r();
      if (k < 0.3) { const a = int(2, 20, r), b = int(2, 25, r); return this.q({ js: `${a}-${b}`, show: `the answer to ${a} − ${b}`, lv }); }
      if (k < 0.6) { const b = int(2, 9, r), a = r() < 0.5 ? b * int(1, 9, r) : b * int(1, 9, r) + int(1, b - 1, r); return this.q({ js: `${a}/${b}`, show: `the answer to ${a} ÷ ${b}`, lv }); }
      if (k < 0.8) { const x = int(1, 30, r) + pick([0.5, 0.25, 0.1], r); return this.q({ js: String(x), show: String(x), lv }); }
      const x = -int(1, 50, r); return this.q({ js: `(${x})`, show: neg(x), lv });
    },
    q({ js, show, lv = 2 }) {
      const x = Function(`return (${js})`)();
      const choices = lv === 3 ? FAM : FAM3;
      return { js, show, lv, x, text: `What is the smallest family ${show} belongs to?`, choices, ans: family(x),
        expr: `(function(v){if(v%1!==0)return 'not an integer';if(v>0)return 'counting number';return v===0?'whole number':'integer'})(${js})` };
    },
    work(q) {
      const { x, show, choices } = q, s = [];
      const sum = show.startsWith('the answer to ') ? show.slice(14) : null;
      if (sum && Number.isInteger(x)) s.push({ t: `Work it out: ${sum}`, v: x });
      if (!Number.isInteger(x)) {
        s.push({ t: sum ? `Does ${sum} come out exactly, with nothing left over?` : `Is ${show} a whole amount, with nothing after the point?`, v: 'No', choices: YN });
        s.push({ t: 'So which family?', v: FAM[3], choices });
        return s;
      }
      if (!sum) s.push({ t: `Is ${show} a whole amount, with nothing after the point?`, v: 'Yes', choices: YN });
      s.push({ t: 'Is it below zero?', v: yn(x < 0), choices: YN });
      if (x >= 0) s.push({ t: 'Is it zero?', v: yn(x === 0), choices: YN });
      s.push({ t: 'So the smallest family is', v: family(x), choices });
      return s;
    },
    draw: () => hoops(),
  },
  {
    id: 'odd-even-rules', world: 'quarry', band: '8-10', title: 'Odd and even rules',
    hook: '37 + 58 — odd or even? Answer before you add.',
    idea: 'Only whether each number is odd or even matters. Even ± even and odd ± odd are even; odd ± even is odd. A product is even if any number in it is even.',
    why: [
      'An even number is one that stands in pairs with nobody left over. An odd number is pairs and ONE extra. Picture 37 children in pairs: 18 pairs and one child alone. 58 children make 29 pairs and nobody alone.',
      'Put the two groups together and the pairs stay pairs. Only the lonely ones matter: odd + even has one lonely child, so the total is odd. Odd + odd has two lonely children — and they pair up with each other, so the total is even. Taking away works the same way.',
      'For times, 37 × 58 is 37 groups of 58, and every group of 58 is all pairs, so the whole lot is pairs: even. The only way a product is odd is if every number in it is odd — then you have an odd number of odd groups, and the lonely ones never all pair up. And you only ever need the LAST digit to tell odd from even.',
    ],
    alg: 'even ± even = even · odd ± odd = even · odd ± even = odd · odd × odd = odd, anything × even = even',
    ex: { a: 37, op: '+', b: 58 },
    gen(r, lv = 1) {
      const hi = lv === 1 ? 20 : lv === 2 ? 99 : 999;
      const op = lv === 1 ? pick(['+', '+', '−'], r) : pick(['+', '−', '×'], r);
      let a = int(3, hi, r), b = int(2, hi, r);
      if (op === '−' && b > a) [a, b] = [b, a];
      if (a === b) a++;
      return this.q({ a, op, b });
    },
    q({ a, op, b }) {
      const pa = a % 2, pb = b % 2, even = op === '×' ? !(pa && pb) : pa === pb;
      const js = op === '×' ? '*' : op === '−' ? '-' : '+';
      return { a, op, b, text: `${a} ${op} ${b} — odd or even?`, choices: ['odd', 'even'], ans: even ? 'even' : 'odd', expr: `(${a}${js}${b})%2===0?'even':'odd'` };
    },
    work(q) {
      const { a, op, b, ans } = q, pa = a % 2 ? 'odd' : 'even', pb = b % 2 ? 'odd' : 'even', c = ['odd', 'even'];
      return [
        { t: `Is ${a} odd or even? Look at its last digit`, v: pa, choices: c },
        { t: `And ${b}?`, v: pb, choices: c },
        { t: `${pa} ${op} ${pb} makes`, v: ans, choices: c },
      ];
    },
    draw({ a, op, b }) {
      const small = a <= 20 && b <= 20, na = small ? a : a % 10, nb = small ? b : b % 10;
      const A = pairs(na, 10), B = pairs(nb, 10 + A.w + 44);
      let s = A.s + B.s + text(10 + A.w + 22, 36, op, 'dg-big');
      if (!small) s += text(10 + A.w / 2, 70, `last digit of ${a}`, 'dg-small') + text(10 + A.w + 44 + B.w / 2, 70, `last digit of ${b}`, 'dg-small');
      const w = Math.max(10 + A.w + 44 + B.w + 10, 260);
      return svg(w, small ? 52 : 80, s, 'Two numbers stood in pairs of dots');
    },
  },
  {
    id: 'number-types', world: 'quarry', band: '8-10', title: 'Square, triangle, cube or prime',
    hook: '28 pebbles — can they make a square? A triangle? A cube? Or none of them?',
    idea: 'Test the shapes in turn: n rows of n for a square, rows of 1, 2, 3… for a triangle, n × n × n for a cube. A number that only makes a single line is prime.',
    why: [
      'Numbers have shapes. A square number of dots stands in a perfect square — 16 is 4 rows of 4. A triangular number stands in a triangle: a row of 1, then 2, then 3… so 10 is 1 + 2 + 3 + 4. A cube number stacks into a perfect cube: 27 is 3 layers of 3 × 3.',
      'A prime number refuses every rectangle. 7 dots can only stand in one long line of 7 — any other number of rows leaves some over. That is exactly what "its only factors are 1 and itself" means.',
      'Some numbers wear two shapes: 36 is a square AND a triangle, and 64 is a square AND a cube. The questions here only use numbers with exactly one of these four shapes, so test them in order and stop at the first one that fits.',
    ],
    alg: 'square n² · triangular 1 + 2 + … + n = n(n + 1) ÷ 2 · cube n³ · prime: factors only 1 and itself',
    ex: { n: 28 },
    gen(r, lv = 1) {
      const hi = lv === 1 ? 30 : lv === 2 ? 100 : 400;
      const pool = [];
      for (let n = 2; n <= hi; n++) if ([isSquare(n), isTri(n), isCube(n), isPrime(n)].filter(Boolean).length === 1) pool.push(n);
      // spread across the four shapes, or the primes would crowd the others out
      const kind = pick(['square', 'triangular', 'cube', 'prime'], r);
      const of = pool.filter((n) => this.q({ n }).ans === kind);
      return this.q({ n: pick(of.length ? of : pool, r) });
    },
    q({ n }) {
      const ans = isSquare(n) ? 'square' : isTri(n) ? 'triangular' : isCube(n) ? 'cube' : 'prime';
      return { n, text: `${n} dots — which shape can they make?`, choices: ['square', 'triangular', 'cube', 'prime'], ans,
        expr: `(function(n){for(let k=1;k*k<=n;k++)if(k*k===n)return 'square';for(let k=1,s=0;s<n;k++){s+=k;if(s===n)return 'triangular'}for(let k=1;k*k*k<=n;k++)if(k*k*k===n)return 'cube';for(let d=2;d<n;d++)if(n%d===0)return 'none';return 'prime'})(${n})` };
    },
    work({ n }) {
      const s = [], c = ['square', 'triangular', 'cube', 'prime'];
      const tests = [
        [`Is ${n} a square — some number times itself?`, isSquare(n), 'square'],
        [`Is ${n} triangular — 1 + 2 + 3 + … up to some number?`, isTri(n), 'triangular'],
        [`Is ${n} a cube — some number times itself, times itself again?`, isCube(n), 'cube'],
        [`Is ${n} prime — can it only stand in one straight line?`, isPrime(n), 'prime'],
      ];
      for (const [t, yes, kind] of tests) { s.push({ t, v: yn(yes), choices: YN }); if (yes) { s.push({ t: 'So its shape is', v: kind, choices: c }); break; } }
      return s;
    },
    draw() {
      // the shapes themselves, as a key: a triangle of 10 and a square of 9 — never the number asked
      let s = '';
      for (let row = 0; row < 4; row++) for (let i = 0; i <= row; i++) s += `<circle cx="${50 - row * 8 + i * 16}" cy="${18 + row * 16}" r="5.5" class="dg-dot2"/>`;
      for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) s += `<circle cx="${150 + x * 16}" cy="${34 + y * 16}" r="5.5" class="dg-dot2"/>`;
      s += `<polygon points="240,50 272,50 272,82 240,82" class="dg-fill2"/><polygon points="240,50 254,38 286,38 272,50" class="dg-fill1"/><polygon points="272,50 286,38 286,70 272,82" class="dg-fill3"/>`;
      s += text(50, 100, 'triangular', 'dg-small') + text(166, 100, 'square', 'dg-small') + text(262, 100, 'cube', 'dg-small');
      return svg(310, 108, s, 'A triangle of dots, a square of dots and a cube');
    },
  },
  {
    id: 'prime-stones', world: 'quarry', band: '8-10', title: 'Building with prime stones',
    hook: '2 × 2 × 3 × 5 — which number do these four stones build?',
    idea: 'Multiply the prime stones together one at a time. To find a missing stone, multiply the ones you have and divide.',
    why: [
      'A prime is a number bigger than 1 that cannot be split into smaller whole-number factors: 2, 3, 5, 7, 11… Every other number bigger than 1 can be split, and split again, until only primes are left. So the primes are the stones every number is built from.',
      '60 is built from 2, 2, 3 and 5. You can multiply them in any order — 2 × 2 is 4, 4 × 3 is 12, 12 × 5 is 60 — because the order of multiplying never changes the answer.',
      'The surprising part is that there is only ONE set of stones for each number. Split 60 as 6 × 10 or as 4 × 15 and you still end with two 2s, a 3 and a 5. That is why a missing stone can always be found: the stones you are shown, multiplied, leave exactly one prime to finish the number.',
    ],
    alg: 'every n > 1 = p₁ × p₂ × … × pₖ, one way only (apart from order)',
    ex: { list: [2, 2, 3, 5], miss: -1 },
    gen(r, lv = 1) {
      return fresh(() => {
        const pool = lv === 1 ? [2, 3, 5] : lv === 2 ? [2, 3, 5, 7] : [2, 3, 5, 7, 11, 13];
        const k = lv === 1 ? 3 : lv === 2 ? int(3, 4, r) : int(4, 5, r), max = lv === 1 ? 60 : lv === 2 ? 300 : 3000;
        let list;
        do { list = Array.from({ length: k }, () => pick(pool, r)).sort((a, b) => a - b); } while (list.reduce((a, b) => a * b, 1) > max);
        return this.q({ list, miss: lv === 1 || r() < 0.5 ? -1 : int(0, k - 1, r) });
      });
    },
    q({ list, miss }) {
      const n = list.reduce((a, b) => a * b, 1);
      if (miss < 0) return { list, miss, n, text: `${list.join(' × ')} = ?`, expr: `[${list}].reduce((a,b)=>a*b,1)`, ans: n };
      const shown = list.filter((_, i) => i !== miss), have = shown.reduce((a, b) => a * b, 1);
      return { list, miss, n, shown, text: `${n} = ${shown.join(' × ')} × ?`, say: `${n} is ${shown.join(' times ')} times which prime?`,
        expr: `(function(){for(let d=2;d<=${n};d++)if(${have}*d===${n})return d})()`, ans: list[miss] };
    },
    work(q) {
      const { list, miss, n } = q;
      if (miss < 0) {
        const s = []; let run = list[0];
        for (const p of list.slice(1)) { s.push({ t: `${run} × ${p}`, v: run * p }); run *= p; }
        return s;
      }
      const have = q.shown.reduce((a, b) => a * b, 1);
      return [{ t: `Multiply the stones you have: ${q.shown.join(' × ')}`, v: have }, { t: `${n} ÷ ${have}`, v: n / have }];
    },
    draw(q) { return q.miss < 0 ? stoneRow(q.list, '?') : stoneRow([...q.shown, '?'], q.n); },
  },
  {
    id: 'sieve-root', world: 'quarry', band: '8-10', title: 'How far to test a prime',
    hook: 'To check whether 187 is prime, must you try every number up to 186?',
    idea: 'Find the biggest whole number whose square is not more than your number. You only ever need to try the primes up to that one.',
    why: [
      'If a number is NOT prime, it splits into two factors: 187 = 11 × 17. The two factors cannot both be bigger than 13, because 14 × 14 is already 196 — more than 187. So one of them is always 13 or smaller. If no prime up to 13 divides 187, nothing bigger can, and the number is prime.',
      'And you only try primes, because every other number is built from prime stones: if 9 went into a number, 3 would go in too, and you would already have found it. That is the idea of the sieve: write out the numbers, cross out the multiples of 2, then of 3, then 5, then 7… Whatever is never crossed out is prime.',
      'So the job is: find the square just below your number, take its root, and the largest prime not bigger than that root is the last one you might need. For 187, 13 × 13 = 169 and 14 × 14 = 196, so the last prime to try is 13.',
    ],
    alg: 'n not prime ⇒ n has a prime factor p with p × p ≤ n',
    ex: { n: 187 },
    gen(r, lv = 1) {
      return fresh(() => this.q({ n: 2 * (lv === 1 ? int(10, 60, r) : lv === 2 ? int(60, 250, r) : int(250, 1000, r)) + 1 }));
    },
    q({ n }) {
      let root = Math.floor(Math.sqrt(n)); while (root * root > n) root--; while ((root + 1) * (root + 1) <= n) root++;
      let p = root; while (!isPrime(p)) p--;
      return { n, text: `To test whether ${n} is prime, what is the biggest prime you might have to try dividing by?`,
        say: `To test whether ${n} is prime, what is the biggest prime you might have to try?`,
        expr: `(function(n){let b=0;for(let p=2;p*p<=n;p++){let q=true;for(let d=2;d<p;d++)if(p%d===0)q=false;if(q)b=p}return b})(${n})`, ans: p };
    },
    work({ n }) {
      let root = Math.floor(Math.sqrt(n)); while (root * root > n) root--; while ((root + 1) * (root + 1) <= n) root++;
      let p = root; while (!isPrime(p)) p--;
      return [
        { t: `The biggest whole number whose square is not more than ${n}`, v: root },
        { t: `The biggest prime that is not more than ${root}`, v: p },
      ];
    },
  },
  {
    id: 'minus-pairs', world: 'quarry', band: '11-14', title: 'Minus signs come in pairs', keys: ['−'],
    hook: '(−3) × (−4) × (−2) — is the answer positive or negative?',
    idea: 'Multiply the sizes, then count the minus signs: an even count gives a positive answer, an odd count a negative one.',
    why: [
      'Think of a minus sign as "turn round". 3 × 4 is twelve steps forwards on the number line; (−3) × 4 is the same twelve steps facing the other way. A second minus turns you round again, back to facing forwards: (−3) × (−4) = 12.',
      'So the minus signs cancel in pairs, exactly like odd and even. Pair them off: if every minus has a partner, you end facing forwards and the answer is positive. If one is left over, you end facing backwards and the answer is negative.',
      'The sizes do not care about any of this. Multiply 3 × 4 × 2 = 24 as usual, then let the count of minus signs choose the sign. Three minuses is one pair and one left over, so (−3) × (−4) × (−2) = −24.',
    ],
    alg: '(−a) × (−b) = a × b · sign of a product = (−1)^(number of minus signs)',
    ex: { f: [-3, -4, -2] },
    gen(r, lv = 1) {
      const k = lv === 1 ? 2 : lv === 2 ? 3 : 4, hi = lv === 1 ? 12 : lv === 2 ? 9 : 6;
      const f = Array.from({ length: k }, () => int(2, hi, r) * (r() < 0.55 ? -1 : 1));
      if (f.every((x) => x > 0)) f[int(0, k - 1, r)] *= -1;
      return this.q({ f });
    },
    q({ f }) {
      const size = f.reduce((a, b) => a * Math.abs(b), 1), minus = f.filter((x) => x < 0).length;
      return { f, text: f.map((x) => (x < 0 ? `(${neg(x)})` : String(x))).join(' × '), expr: f.map((x) => `(${x})`).join('*'), ans: minus % 2 ? -size : size };
    },
    work({ f }) {
      const size = f.reduce((a, b) => a * Math.abs(b), 1), minus = f.filter((x) => x < 0).length;
      return [
        { t: `Multiply the sizes, ignoring the signs: ${f.map(Math.abs).join(' × ')}`, v: size },
        { t: 'How many minus signs are there?', v: minus },
        { t: minus % 2 ? 'An odd count — one minus is left without a partner. The answer is' : 'An even count — every minus pairs up. The answer is', v: minus % 2 ? -size : size },
      ];
    },
  },
  {
    id: 'coprime', world: 'quarry', band: '11-14', title: 'Coprime: no stone shared',
    hook: '35 and 48 — do they have any prime stone in common?',
    idea: 'Take the prime stones of the first number and test each one on the second. If none goes in, the two numbers are coprime.',
    why: [
      'Two numbers are coprime when they share no prime stone at all, so the only number that divides both is 1. 35 is 5 × 7; 48 is 2 × 2 × 2 × 2 × 3. No stone appears in both, so 35 and 48 are coprime — even though neither of them is prime.',
      'You do not need both lists of stones. Any number that divides both would be built from stones of the first, so it is enough to test the first number\'s stones on the second. If 5 does not go into 48 and 7 does not either, nothing built from them can.',
      'Coprime numbers are why a fraction like 35/48 cannot be simplified, and why two cogs with 35 and 48 teeth take a long time to line up again: sharing nothing, they only meet after 35 × 48 teeth have gone by.',
    ],
    alg: 'a, b coprime ⇔ HCF(a, b) = 1 ⇔ no prime p divides both',
    ex: { a: 35, b: 48 },
    gen(r, lv = 1) {
      const lo = lv === 1 ? 4 : lv === 2 ? 10 : 30, hi = lv === 1 ? 30 : lv === 2 ? 100 : 300;
      let a, b;
      do { a = int(lo, hi, r); b = int(lo, hi, r); } while (a === b || isPrime(a) || (r() < 0.5 && gcd(a, b) > 1) || (r() < 0.3 && gcd(a, b) === 1));
      return this.q({ a, b });
    },
    q({ a, b }) {
      return { a, b, text: `Are ${a} and ${b} coprime?`, say: `Are ${a} and ${b} coprime — sharing no prime stone?`, choices: YN, ans: yn(powers(a).every(([p]) => b % p !== 0)),
        expr: `(function g(x,y){return y?g(y,x%y):x})(${a},${b})===1?'Yes':'No'` };
    },
    work({ a, b }) {
      const ps = powers(a).map(([p]) => p), s = [];
      for (const [i, p] of ps.entries()) {
        const goes = b % p === 0;
        s.push({ t: `${i === 0 ? `${a} = ${stones(a).join(' × ')}. ` : ''}Does ${p} go into ${b}?`, v: yn(goes), choices: YN });
        if (goes) return [...s, { t: `They share the stone ${p}. Coprime?`, v: 'No', choices: YN }];
      }
      return [...s, { t: 'No stone shared. Coprime?', v: 'Yes', choices: YN }];
    },
  },
  {
    id: 'factor-count-stones', world: 'quarry', band: '11-14', title: 'Counting factors from the stones',
    hook: '2³ × 3² — how many factors does it have, without listing a single one?',
    idea: 'For each prime, count how many of it a factor could take — none, one, two… up to all of them. Multiply those counts.',
    why: [
      '2³ × 3² is 72. Every factor of 72 is built only from 72\'s own stones, and it cannot use more of a stone than 72 has. So a factor takes some of the three 2s — none, one, two or three of them: 4 choices — and some of the two 3s — none, one or two: 3 choices.',
      'Every choice of 2s can go with every choice of 3s, and each pairing builds a DIFFERENT factor, because a number has only one set of stones. Picture a table with 4 rows (1, 2, 4, 8) and 3 columns (1, 3, 9): each cell is one factor, and 4 × 3 = 12 cells.',
      'So the rule is: add one to each little power, and multiply. The "add one" is the choice of taking none of that stone — the factor 1 comes from taking none of anything.',
    ],
    alg: 'n = p^a × q^b × r^c ⇒ number of factors = (a + 1)(b + 1)(c + 1)',
    ex: { pw: [[2, 3], [3, 2]] },
    gen(r, lv = 1) {
      return fresh(() => {
        const k = lv === 3 ? 3 : 2, top = lv === 1 ? 3 : 4;
        const ps = [2, 3, 5, 7].map((p) => [p, r()]).sort((a, b) => a[1] - b[1]).slice(0, k).map(([p]) => p).sort((a, b) => a - b);
        return this.q({ pw: ps.map((p) => [p, int(1, lv === 3 ? 3 : top, r)]) });
      });
    },
    q({ pw }) {
      const n = pw.reduce((m, [p, e]) => m * p ** e, 1);
      return { pw, n, text: `${pw.map(([p, e]) => (e > 1 ? `${p}${sup(e)}` : String(p))).join(' × ')} — how many factors?`,
        say: `${pw.map(([p, e]) => (e > 1 ? `${p} to the power ${e}` : String(p))).join(' times ')}: how many factors?`,
        expr: `(function(n){let c=0;for(let d=1;d*d<=n;d++)if(n%d===0)c+=d*d===n?1:2;return c})(${n})`, ans: pw.reduce((m, [, e]) => m * (e + 1), 1) };
    },
    work({ pw }) {
      const s = pw.map(([p, e]) => ({ t: `How many ${p}s can a factor take? (none, one, … up to ${e})`, v: e + 1 }));
      s.push({ t: `Multiply the choices: ${pw.map(([, e]) => e + 1).join(' × ')}`, v: pw.reduce((m, [, e]) => m * (e + 1), 1) });
      return s;
    },
  },
  {
    id: 'ending-decimals', world: 'quarry', band: '11-14', title: 'Decimals that end',
    hook: '7/40 and 1/3 — one ends as a decimal, one goes on for ever. Can you tell which before dividing?',
    idea: 'Simplify the fraction, then look at the bottom\'s prime stones. Only 2s and 5s: the decimal ends. Any other stone: it goes on for ever.',
    why: [
      'A decimal that ends is a number of tenths, hundredths or thousandths: 0.175 is 175/1000. And 10, 100, 1000 are built from only two stones — 10 = 2 × 5, 100 = 2 × 2 × 5 × 5. So a fraction can end only if its bottom fits into some 10 × 10 × … — which means its bottom must be made of 2s and 5s only.',
      '40 = 2 × 2 × 2 × 5. Give it two more 5s and it becomes 1000, so 7/40 = 175/1000 = 0.175 — it ends. But 3 is a stone that no power of ten contains, so no number of tenths or hundredths is ever exactly 1/3. Divide it out and the 3s go on for ever.',
      'Simplify first, or you will be fooled. 3/12 has a 3 in its bottom, but 3/12 = 1/4, and 4 = 2 × 2 — so it ends, as 0.25. A stone that cancels away was never really there.',
    ],
    alg: 'a/b in lowest terms ends ⇔ b = 2^m × 5^n',
    ex: { a: 7, b: 40 },
    gen(r, lv = 1) {
      const hi = lv === 1 ? 20 : lv === 2 ? 60 : 200;
      const smooth = [], rough = [];
      for (let b = 2; b <= hi; b++) { let m = b; while (m % 2 === 0) m /= 2; while (m % 5 === 0) m /= 5; (m === 1 ? smooth : rough).push(b); }
      const endsWant = r() < 0.5;
      let b, a;
      if (lv >= 2 && r() < 0.35) {
        // a trap: a stone in the bottom that cancels away
        const base = pick(smooth.filter((x) => x * 3 <= hi * 2), r), c = pick([3, 7, 9], r);
        b = base * c; a = c * int(1, base - 1 || 1, r);
        if (a >= b) a = c;
      } else {
        b = pick(endsWant ? smooth : rough, r); a = int(1, b - 1, r);
      }
      return this.q({ a, b });
    },
    q({ a, b }) {
      const g = gcd(a, b); let m = b / g; while (m % 2 === 0) m /= 2; while (m % 5 === 0) m /= 5;
      return { a, b, text: `${a}/${b} as a decimal — does it end, or go on for ever?`, say: `${a} over ${b} as a decimal: does it end, or go on for ever?`,
        choices: ['it ends', 'goes on for ever'], ans: m === 1 ? 'it ends' : 'goes on for ever',
        expr: `(function(a,b){let r=a%b;for(let i=0;i<80;i++){if(r===0)return 'it ends';r=r*10%b}return 'goes on for ever'})(${a},${b})` };
    },
    work({ a, b }) {
      const g = gcd(a, b), bot = b / g; let m = bot; while (m % 2 === 0) m /= 2; while (m % 5 === 0) m /= 5;
      return [
        { t: `Simplify ${a}/${b}. What is the bottom now?`, v: bot },
        { t: `Take every 2 and every 5 out of ${bot}. What is left?`, v: m },
        { t: 'Left with 1: it ends. Anything else: it goes on for ever. So', v: m === 1 ? 'it ends' : 'goes on for ever', choices: ['it ends', 'goes on for ever'] },
      ];
    },
  },
  {
    id: 'rational-roots', world: 'quarry', band: '11-14', title: 'Which square roots are fractions',
    hook: '√49 is 7. Is √50 some fraction — one whole number over another?',
    idea: 'Write the number in prime stones. If every stone has a partner, the root is a whole number (or a fraction). If any stone is left alone, the root is irrational: no fraction is exactly it.',
    why: [
      'A rational number is one that can be written as one integer over another, like 7/1 or 99/14. Squaring a fraction squares its top and its bottom, and squaring doubles every stone: 6 = 2 × 3, so 6 × 6 has two 2s and two 3s. So a square number always has its stones in PAIRS. 50 = 2 × 5 × 5: the 5s pair up, but the 2 is alone. 50 is not a square.',
      'Now suppose √50 were a fraction, a/b. Then 50 × b × b = a × a. The right side has every stone in pairs. On the left, b × b has every stone in pairs too — so the lonely 2 from 50 is still lonely. One number, two different sets of stones: impossible, because every number has exactly one set. So √50 is not any fraction at all.',
      'It is still a real length — the diagonal of a square with sides 5 — and 99/14 gets very close: 99 × 99 = 9801, while 50 × 14 × 14 = 9800. Close is not equal. The same argument works for fractions: in lowest terms, √(p/q) is rational only when p and q are both squares.',
    ],
    alg: '√n is rational ⇔ n is a perfect square ⇔ every prime stone of n appears an even number of times',
    ex: { n: 50 },
    gen(r, lv = 1) {
      if (lv === 3 && r() < 0.5) {
        let p, q;
        do {
          p = r() < 0.5 ? int(1, 12, r) ** 2 : int(2, 60, r);
          q = r() < 0.5 ? int(2, 12, r) ** 2 : int(2, 60, r);
        } while (p === q || gcd(p, q) !== 1 || q === 1);
        return this.q({ n: p, d: q });
      }
      const hi = lv === 1 ? 50 : lv === 2 ? 200 : 1000;
      const n = r() < 0.45 ? int(2, Math.floor(Math.sqrt(hi)), r) ** 2 : int(2, hi, r);
      return this.q({ n });
    },
    q({ n, d }) {
      const c = ['rational', 'irrational'];
      if (d) return { n, d, text: `√(${n}/${d}) — rational or irrational?`, say: `the square root of ${n} over ${d}: rational or irrational?`, choices: c,
        ans: unpaired(n) + unpaired(d) === 0 ? 'rational' : 'irrational',
        expr: `Number.isInteger(Math.sqrt(${n}))&&Number.isInteger(Math.sqrt(${d}))?'rational':'irrational'` };
      return { n, text: `√${n} — rational or irrational?`, say: `the square root of ${n}: rational or irrational?`, choices: c,
        ans: unpaired(n) === 0 ? 'rational' : 'irrational', expr: `Number.isInteger(Math.sqrt(${n}))?'rational':'irrational'` };
    },
    work({ n, d }) {
      const c = ['rational', 'irrational'];
      if (d) {
        const u = unpaired(n) + unpaired(d);
        return [
          { t: `How many different stones of ${n} are left without a partner?`, v: unpaired(n) },
          { t: `And of ${d}?`, v: unpaired(d) },
          { t: u ? 'A lonely stone somewhere, so √ of this fraction is' : 'Every stone paired, top and bottom, so it is', v: u ? 'irrational' : 'rational', choices: c },
        ];
      }
      const u = unpaired(n);
      return [
        { t: `Write ${n} in prime stones. How many different stones are left without a partner?`, v: u },
        { t: u ? 'A lonely stone, so the root is' : 'Every stone has a partner, so the root is', v: u ? 'irrational' : 'rational', choices: c },
      ];
    },
  },
];

/* ================================================================ stories */

export const STORIES = {
  'number-families': { title: 'Hoops by the pond', scene: 'pond', cast: ['pixel', 'koi'], beats: [
    { who: null, say: 'On a frosty morning the thermometer by the pond reads −4 °C. Pip and Nova chalk three hoops, one inside another, on the path.', add: { t: '−4' } },
    { who: 'pixel', say: 'The little hoop is for counting numbers — 1, 2, 3. The ducks: 7. So 7 goes in the middle.' },
    { who: 'koi', say: 'The next hoop adds zero. How many ice skates do we own? None. Zero is still an amount.' },
    { who: 'pixel', say: 'But −4 isn’t something you can count. Where does it go?' },
    { who: 'koi', say: 'The biggest hoop, the integers. It holds numbers below zero: 4 degrees colder than zero.', add: { t: '0 − 4', v: -4 } },
    { who: 'pixel', say: 'So 7 is in all three hoops, 0 in two, and −4 only in the big one!' },
  ] },
  'odd-even-rules': { title: 'Partners for the dance', scene: 'hall', cast: ['beaker', 'comet'], beats: [
    { who: null, say: '37 children from one school and 58 from another meet in the hall for a partner dance. Will everyone have a partner?', add: { t: '37 + 58' } },
    { who: 'comet', say: 'I’ll add them first and then check… hang on, give me a minute.' },
    { who: 'beaker', say: 'No need. 58 stand in pairs with nobody over.', add: { t: '58 ÷ 2', v: 29 } },
    { who: 'beaker', say: '37 is 18 pairs and one child on their own.', add: { t: '18 × 2 + 1', v: 37 } },
    { who: 'comet', say: 'Put them together and the pairs stay pairs. Just that one child is left. Odd plus even is odd!', add: { t: '37 + 58', v: 95 } },
    { who: 'beaker', say: 'And if both groups were odd, the two lonely ones would dance with each other.' },
  ] },
  'number-types': { title: 'The pebble shapes', scene: 'garden', cast: ['astro', 'pixel'], beats: [
    { who: null, say: 'Mira has 28 smooth pebbles from the garden path. Can they make a square, a triangle or a cube?', add: { t: '28' } },
    { who: 'pixel', say: 'A square! 5 rows of 5 is 25… and 6 rows of 6 is 36. 28 falls between.', add: { t: '5 × 5', v: 25 } },
    { who: 'astro', say: 'A cube needs 3 × 3 × 3. That’s 27 — one pebble short of 28.', add: { t: '3 × 3 × 3', v: 27 } },
    { who: 'pixel', say: 'A triangle, then? A row of 1, a row of 2, a row of 3…' },
    { who: 'astro', say: 'Keep going, each row one longer, up to 7.', add: { t: '1 + 2 + 3 + 4 + 5 + 6 + 7', v: 28 } },
    { who: 'pixel', say: 'Every pebble used. 28 is triangular!' },
  ] },
  'prime-stones': { title: 'Towers of stones', scene: 'city', cast: ['beaker', 'koi'], beats: [
    { who: null, say: 'Rafi and Nova build number towers. The rule: only prime stones — 2, 3, 5, 7 and so on.' },
    { who: 'koi', say: 'My tower is 2, 2, 3 and 5. Multiply them to see what it builds.', add: { t: '2 × 2', v: 4 } },
    { who: 'beaker', say: 'Then 4 times 3 is 12, and 12 times 5 is 60.', add: { t: '4 × 3 × 5', v: 60 } },
    { who: 'koi', say: 'Can you build 60 with different prime stones?' },
    { who: 'beaker', say: '60 is 6 × 10… but 6 breaks into 2 × 3 and 10 into 2 × 5. The same four stones!', add: { t: '2 × 3 × 2 × 5', v: 60 } },
    { who: 'koi', say: 'Every number has exactly one set of prime stones. Only the order can change.' },
  ] },
  'sieve-root': { title: 'The library puzzle', scene: 'library', cast: ['scopey', 'panda'], beats: [
    { who: null, say: 'In the library, Theo finds a puzzle card: is 187 a prime number?', add: { t: '187' } },
    { who: 'scopey', say: 'I’ll try dividing by every number up to 186. Just to be sure.' },
    { who: 'panda', say: 'Only primes, and only up to 13. Look: 13 × 13 is 169.', add: { t: '13 × 13', v: 169 } },
    { who: 'panda', say: '14 × 14 is 196, past 187. So if it splits, one factor is 13 or smaller.', add: { t: '14 × 14', v: 196 } },
    { who: 'scopey', say: 'Then 2, 3, 5, 7, 11, 13 at most. 2 no, 3 no, 5 no, 7 no… 11!', add: { t: '11 × 17', v: 187 } },
    { who: 'panda', say: 'Not prime. And the biggest prime we could ever have needed was 13.', add: { t: '169 ÷ 13', v: 13 } },
  ] },
  'minus-pairs': { title: 'The turn-round cards', scene: 'room', cast: ['samurai', 'comet'], beats: [
    { who: null, say: 'Kwame and Dax play a number-line card game. Every minus card makes you turn round to face the other way.', add: { t: '(−3) × (−4) × (−2)' } },
    { who: 'comet', say: 'Three minus cards! So I turn, and turn, and… which way am I facing now?' },
    { who: 'samurai', say: 'Leave the signs for a moment. Multiply the sizes.', add: { t: '3 × 4 × 2', v: 24 } },
    { who: 'samurai', say: 'Now pair up the minus signs. Two turns put you back where you started.' },
    { who: 'comet', say: 'Three minuses: one pair, and one left over. So I end up facing backwards!' },
    { who: 'samurai', say: 'Minus 24. An odd number of minus signs gives a negative answer.', add: { t: '(−3) × (−4) × (−2)', v: -24 } },
  ] },
  'coprime': { title: 'The painted cogs', scene: 'fair', cast: ['melody', 'astro'], beats: [
    { who: null, say: 'At the fair, a machine has two cogs: one with 35 teeth, one with 48. A tooth on each is painted red, and the red teeth touch.', add: { t: '35 and 48' } },
    { who: 'melody', say: 'When do the red teeth meet again? Does it depend on what the numbers share?' },
    { who: 'astro', say: 'Let’s see their stones. 35 is 5 × 7.', add: { t: '5 × 7', v: 35 } },
    { who: 'astro', say: 'And 48 is 2 × 2 × 2 × 2 × 3. Does 5 go into 48? No. Does 7? No.', add: { t: '2 × 2 × 2 × 2 × 3', v: 48 } },
    { who: 'melody', say: 'Not one stone shared — they’re coprime. Only 1 divides both.' },
    { who: 'astro', say: 'So the red teeth only meet again after 35 × 48 teeth go by. Every tooth meets every tooth first.', add: { t: '35 × 48', v: 1680 } },
  ] },
  'factor-count-stones': { title: 'Bags of biscuits', scene: 'bakery', cast: ['panda', 'beaker'], beats: [
    { who: null, say: 'The bakery has 72 biscuits to pack into equal bags, none left over. How many different bag sizes could work?', add: { t: '2 × 2 × 2 × 3 × 3', v: 72 } },
    { who: 'beaker', say: 'I’ll list them: 1, 2, 3, 4, 6, 8… and hope I don’t miss any.' },
    { who: 'panda', say: 'Use the stones. 72 is three 2s and two 3s. A bag size takes some of the 2s and some of the 3s.' },
    { who: 'panda', say: 'Of the 2s it can take none, one, two or three: four choices.', add: { t: '3 + 1', v: 4 } },
    { who: 'beaker', say: 'Of the 3s: none, one or two. Three choices.', add: { t: '2 + 1', v: 3 } },
    { who: 'panda', say: 'Each pair of choices builds a different size. Twelve bag sizes.', add: { t: '4 × 3', v: 12 } },
  ] },
  'ending-decimals': { title: 'The calculator screen', scene: 'shop', cast: ['melody', 'scopey'], beats: [
    { who: null, say: 'At the shop, Theo divides on a calculator. 7 ÷ 40 stops neatly, but 1 ÷ 3 fills the screen with 3s.', add: { t: '7 ÷ 40', v: 0.175 } },
    { who: 'scopey', say: 'Why do some stop and some go on for ever? I checked it three times.' },
    { who: 'melody', say: 'Look at the stones on the bottom. 40 is 2 × 2 × 2 × 5 — only 2s and 5s.', add: { t: '2 × 2 × 2 × 5', v: 40 } },
    { who: 'melody', say: 'And 1,000 is made of 2s and 5s too, so 40 fits into it exactly.', add: { t: '1,000 ÷ 40', v: 25 } },
    { who: 'scopey', say: 'But 3 isn’t a 2 or a 5. No ten, hundred or thousand ever splits into threes.' },
    { who: 'melody', say: 'That’s why 1/3 never ends. And 7/40 is 175 thousandths.', add: { t: '25 × 7 ÷ 1,000', v: 0.175 } },
  ] },
  'rational-roots': { title: 'The lonely stone', scene: 'night', cast: ['samurai', 'goldlegend'], beats: [
    { who: null, say: 'Under the stars, Kwame asks Vesper: 7 × 7 is 49. Can √50 be written as one whole number over another?', add: { t: '7 × 7', v: 49 } },
    { who: 'samurai', say: 'Try 99/14. 99 × 99 is 9,801…', add: { t: '99 × 99', v: 9801 } },
    { who: 'samurai', say: '…and 50 × 14 × 14 is 9,800. So close!', add: { t: '50 × 14 × 14', v: 9800 } },
    { who: 'goldlegend', say: 'Look at the stones of 50.', add: { t: '2 × 5 × 5', v: 50 } },
    { who: 'goldlegend', say: 'A square has every stone in pairs. The 5s pair up. The 2 is alone.' },
    { who: 'samurai', say: 'And a fraction squared has its stones in pairs, top and bottom. It can never make a lonely 2.' },
    { who: 'goldlegend', say: 'So √50 is irrational. A real length — but no fraction is exactly it.' },
  ] },
};
