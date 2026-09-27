/* forest.js — The Factor Forest: what numbers are made of. Factors and
   multiples, the divisibility tests (each with the reason it works), primes,
   and the two ideas they build — the highest common factor and the lowest
   common multiple. Contract: docs/CHAPTER-CONTRACT.md. */

import { int, pick } from '../rand.js';
import { svg, text, venn } from './kit.js';

export const WORLD = {
  id: 'forest', name: 'The Factor Forest', short: 'Forest', band: '8-10',
  blurb: 'Every number is built from primes. Learn to see what a number is made of.',
  tint: '#E7F2E1', ink: '#2C5A1E', glyph: '🌳',
};

/* ---------------------------------------------------------------- helpers */

const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const leaks = (q) => !q.choices && String(q.ans).length > 1 && q.text.replace(/,/g, '').split(/[^0-9./]/).includes(String(q.ans));
function fresh(make) { let q; for (let i = 0; i < 80; i++) { q = make(); if (!leaks(q)) return q; } return q; }
const YN = ['Yes', 'No'];
const yn = (b) => (b ? 'Yes' : 'No');
const dsum = (n) => String(n).split('').reduce((a, b) => a + Number(b), 0);
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/* Prime factors, smallest first, by dividing out the smallest prime each time. */
function primeFactors(n) {
  const out = []; let m = n;
  for (let p = 2; p * p <= m; p++) while (m % p === 0) { out.push(p); m /= p; }
  if (m > 1) out.push(m);
  return out;
}
const smallestFactor = (n) => { for (let p = 2; p * p <= n; p++) if (n % p === 0) return p; return n; };
const isPrime = (n) => n > 1 && smallestFactor(n) === n;
const PRIMES = Array.from({ length: 300 }, (_, i) => i).filter(isPrime);

/* An array of dots, scaled so even a long row fits on a phone. */
function dotArray(rows, cols) {
  const u = Math.max(4, Math.min(18, Math.floor(340 / cols))), rad = Math.max(1.6, u * 0.32);
  let s = '';
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) s += `<circle cx="${(6 + x * u + u / 2).toFixed(1)}" cy="${(6 + y * u + u / 2).toFixed(1)}" r="${rad.toFixed(1)}" class="dg-dot"/>`;
  return svg(cols * u + 12, rows * u + 12, s, `${rows} rows of ${cols} dots`);
}

/* The top of a factor tree: the number, and one split into two factors. When
   either half is prime the split would give the answer away, so it shows ?. */
function treeTop(n) {
  let a = 1; for (let d = 2; d * d <= n; d++) if (n % d === 0) a = d;
  const b = n / a, show = a > 1 && !isPrime(a) && !isPrime(b);
  const L = show ? String(a) : '?', R = show ? String(b) : '?';
  let s = `<line x1="110" y1="36" x2="60" y2="92" class="dg-line"/><line x1="110" y1="36" x2="160" y2="92" class="dg-line"/>`;
  s += `<circle cx="110" cy="26" r="24" class="dg-fill3"/>` + text(110, 33, n, 'dg-big');
  s += `<circle cx="60" cy="104" r="22" class="dg-blank"/>` + text(60, 111, L, 'dg-big');
  s += `<circle cx="160" cy="104" r="22" class="dg-blank"/>` + text(160, 111, R, 'dg-big');
  if (show) for (const [x] of [[60], [160]]) s += `<line x1="${x}" y1="126" x2="${x - 22}" y2="150" class="dg-thin"/><line x1="${x}" y1="126" x2="${x + 22}" y2="150" class="dg-thin"/>` + text(x - 26, 166, '?', 'dg-accent') + text(x + 26, 166, '?', 'dg-accent');
  return svg(220, show ? 176 : 132, s, `The top of a factor tree for ${n}`);
}

/* The HCF ladder: divide both by a shared prime until they share nothing. */
function ladder(a, b) {
  const ps = []; let x = a, y = b;
  for (;;) { const p = PRIMES.find((q) => q <= Math.min(x, y) && x % q === 0 && y % q === 0); if (!p) break; ps.push({ p, x, y }); x /= p; y /= p; }
  return { ps, x, y, h: ps.reduce((m, st) => m * st.p, 1) };
}

/* The eleven test: alternate digits from the right. */
function elevenSums(n) {
  const d = String(n).split('').reverse().map(Number);
  const odd = d.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0), even = d.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0);
  return { odd, even, diff: Math.abs(odd - even) };
}

/* ================================================================ stops */

export const TRICKS = [
  {
    id: 'factor-pairs', world: 'forest', band: '8-10', title: 'Factors come in pairs',
    hook: 'How many numbers divide 36 exactly? Can you be sure you found them all?',
    idea: 'Find factors in pairs: test 1, 2, 3… and every one that divides gives you its partner too. Stop when the number times itself passes the target.',
    why: [
      'A factor of 36 is a number that divides it exactly. Every time one does, it comes with a partner: 36 ÷ 4 = 9, so 4 × 9 = 36, and 9 is a factor as well. Draw 36 dots in 4 rows and there are 9 in each row — one rectangle, two factors.',
      'The pairs meet in the middle. 1 × 36, 2 × 18, 3 × 12, 4 × 9, 6 × 6 — the small partner grows while the big one shrinks, and once you pass 6 (because 6 × 6 = 36) every pair would just be one you have already found, turned round. So you only ever test up to the number whose square is the target.',
      'That also tells you when the count is odd. Two factors per pair — unless the number is a square, where one pair is the same number twice, like 6 × 6. Square numbers are the only numbers with an odd number of factors.',
    ],
    alg: 'd | n ⇔ (n ÷ d) | n ; test d ≤ √n only',
    ex: { n: 36 },
    gen(r, lv = 1) {
      return fresh(() => this.q({ n: lv === 1 ? int(6, 30, r) : lv === 2 ? int(30, 100, r) : int(100, 200, r) }));
    },
    q({ n }) {
      let c = 0; for (let d = 1; d * d <= n; d++) if (n % d === 0) c += d * d === n ? 1 : 2;
      return { n, text: `How many factors does ${n} have?`, expr: `Array.from({length:${n}},(_,i)=>i+1).filter(d=>${n}%d===0).length`, ans: c };
    },
    work({ n }) {
      const root = Math.floor(Math.sqrt(n)); let pairs = 0;
      for (let d = 1; d <= root; d++) if (n % d === 0) pairs++;
      const sq = root * root === n;
      return [
        { t: `Test 1, 2, 3… only up to the number whose square is at most ${n}. Which number is that?`, v: root },
        { t: `How many of 1 to ${root} divide ${n} exactly? Each one starts a pair`, v: pairs },
        { t: sq ? `Two factors per pair — but ${root} × ${root} is one number twice, so count it once` : 'Two factors in every pair', v: sq ? 2 * pairs - 1 : 2 * pairs },
      ];
    },
    draw({ n }) { let a = 1; for (let d = 2; d * d <= n; d++) if (n % d === 0) a = d; return dotArray(a, n / a); },
  },
  {
    id: 'multiples', world: 'forest', band: '8-10', title: 'The next multiple',
    hook: 'Eggs come in boxes of 6. What is the smallest number of eggs over 50 you can buy in whole boxes?',
    idea: 'Divide to see how many whole groups fit, then take one group more.',
    why: [
      'The multiples of 6 are the 6 times table carried on for ever: 6, 12, 18, 24… They are exactly the numbers you can make from whole groups of 6.',
      'To find the first one past 50, you do not have to count up from 6. 50 ÷ 6 is 8, with some left over, so 8 boxes — 48 eggs — is the most that stays at or under 50. One more box is the first multiple past it: 9 × 6 = 54.',
      'Multiples and factors are two views of one fact. 54 is a multiple of 6 exactly because 6 is a factor of 54.',
    ],
    alg: 'first multiple of k above s = k × (⌊s ÷ k⌋ + 1)',
    ex: { k: 6, s: 50 },
    gen(r, lv = 1) {
      return fresh(() => {
        const k = lv === 1 ? int(2, 5, r) : lv === 2 ? int(6, 12, r) : int(13, 25, r);
        return this.q({ k, s: int(2 * k + 1, lv === 1 ? 50 : lv === 2 ? 120 : 500, r) });
      });
    },
    q({ k, s }) { return { k, s, text: `What is the first multiple of ${k} bigger than ${s}?`, expr: `${s}+${k}-${s}%${k}`, ans: k * (Math.floor(s / k) + 1) }; },
    work({ k, s }) {
      const g = Math.floor(s / k);
      return [
        { t: `${s} ÷ ${k} — how many whole ${k}s fit?`, v: g },
        { t: 'Take one group more', v: g + 1 },
        { t: `${g + 1} × ${k}`, v: k * (g + 1) },
      ];
    },
  },
  {
    id: 'divisible-2-5-10', world: 'forest', band: '8-10', title: 'Tests for 2, 5 and 10',
    hook: 'Does 3,475 split into fives? You only need to look at one digit.',
    idea: 'Look at the last digit only. Even for 2; 0 or 5 for 5; 0 for 10.',
    why: [
      'Split any number into its tens and its last digit: 3,475 is 3,470 + 5. The 3,470 is a whole number of tens, and every ten can be split into two fives, or five twos. So that big part always divides by 2, 5 and 10 — whatever it is.',
      'That leaves only the last digit to decide. 5 divides by 5, so 3,475 does too. It is odd, so 3,475 will not halve; and it is not 0, so it is not a whole number of tens.',
      'This is why the tests are so quick: the rest of the number is already taken care of, however long it is.',
    ],
    alg: 'n = 10a + b, and 2, 5, 10 all divide 10a ⇒ test b',
    ex: { a: 3475, b: 5 },
    gen(r, lv = 1) {
      const b = lv === 1 ? pick([2, 10], r) : pick([2, 5, 10], r);
      let a = lv === 1 ? int(10, 999, r) : lv === 2 ? int(100, 9999, r) : int(10000, 999999, r);
      if (r() < 0.5) a -= a % b;
      else if (b === 10 && r() < 0.5) a = a - (a % 10) + 5;          // ends in 5: a trap for 10
      return this.q({ a: Math.max(a, b), b });
    },
    q({ a, b }) {
      const last = a % 10, yes = b === 2 ? last % 2 === 0 : b === 5 ? last === 0 || last === 5 : last === 0;
      return { a, b, text: `Is ${fmt(a)} divisible by ${b}?`, say: `Is ${a} divisible by ${b}?`, choices: YN, ans: yn(yes), expr: `${a}%${b}===0?'Yes':'No'` };
    },
    work({ a, b }) {
      const last = a % 10, rule = b === 2 ? 'even' : b === 5 ? '0 or 5' : '0';
      return [
        { t: `The last digit of ${fmt(a)}`, v: last },
        { t: `The test for ${b}: is the last digit ${rule}?`, v: this.q({ a, b }).ans, choices: YN },
      ];
    },
  },
  {
    id: 'divisible-4-8', world: 'forest', band: '8-10', title: 'Tests for 4 and 8',
    hook: 'Is 73,516 in the 4 times table? No long division.',
    idea: 'For 4, test just the last two digits. For 8, the last three.',
    why: [
      '100 is 4 × 25, so every whole hundred divides by 4. 73,516 is 73,500 + 16, and the 73,500 is a whole number of hundreds — it takes care of itself. Only the 16 is left to check, and 16 = 4 × 4.',
      'For 8 you need one more digit, because 100 does not divide by 8 but 1000 does: 1000 = 8 × 125. So every whole thousand divides by 8, and only the last three digits decide.',
      'The pattern goes on: 2 needs the last digit, 4 the last two, 8 the last three — because 10 is 2 × 5, 100 is 4 × 25 and 1000 is 8 × 125.',
    ],
    alg: '4 | 100 ⇒ test n mod 100 ; 8 | 1000 ⇒ test n mod 1000',
    ex: { a: 73516, b: 4 },
    gen(r, lv = 1) {
      const b = lv === 1 ? 4 : pick([4, 8], r);
      let a = b === 8 ? int(1000, lv === 3 ? 999999 : 99999, r) : int(lv === 1 ? 100 : 1000, lv === 3 ? 999999 : 99999, r);
      if (r() < 0.5) a -= a % b;
      else if (b === 8 && r() < 0.5 && a % 4 !== 0) a -= a % 4;      // divides by 4 but maybe not 8
      return this.q({ a: Math.max(a, b), b });
    },
    q({ a, b }) {
      const tail = b === 4 ? a % 100 : a % 1000;
      return { a, b, text: `Is ${fmt(a)} divisible by ${b}?`, say: `Is ${a} divisible by ${b}?`, choices: YN, ans: yn(tail % b === 0), expr: `${a}%${b}===0?'Yes':'No'` };
    },
    work({ a, b }) {
      const tail = b === 4 ? a % 100 : a % 1000, ans = yn(tail % b === 0);
      return b === 4
        ? [{ t: `The last two digits of ${fmt(a)}`, v: tail }, { t: `Is ${tail} in the 4 times table?`, v: ans, choices: YN }]
        : [{ t: `The last three digits of ${fmt(a)}`, v: tail }, { t: `Is ${tail} in the 8 times table? (Can you halve it three times and stay whole?)`, v: ans, choices: YN }];
    },
  },
  {
    id: 'divisible-6-11', world: 'forest', band: '8-10', title: 'Tests for 6 and 11',
    hook: 'Is 4,158 divisible by 6? By 11? Two different tricks.',
    idea: 'For 6, it must pass the tests for 2 AND 3. For 11, add alternate digits and subtract the two totals: the number divides by 11 when the difference does.',
    why: [
      '6 is 2 × 3. A number that splits into twos and also into threes splits into sixes, and one that fails either cannot. So: is it even? Do its digits add to a multiple of 3? Both yes means yes.',
      'For 11, notice that 10 is one less than 11, 100 is one more than 99, 1000 is one less than 1001 — and 11, 99 and 1001 all divide by 11. So each digit, depending on its place, is "one more" or "one less" than a multiple of 11. Adding the digits in odd places and taking away the digits in even places adds up exactly those leftovers.',
      '4,158: from the right, 8 + 1 = 9 and 5 + 4 = 9. The difference is 0, so 4,158 divides by 11 (it is 11 × 378).',
    ],
    alg: '6 | n ⇔ 2 | n and 3 | n ; 11 | n ⇔ 11 | (d₀ − d₁ + d₂ − d₃ …)',
    ex: { a: 4158, b: 11 },
    gen(r, lv = 1) {
      const b = lv === 1 ? 6 : lv === 2 ? 11 : pick([6, 11], r);
      let a = int(lv === 1 ? 100 : 1000, lv === 3 ? 999999 : 9999, r);
      if (r() < 0.5) a -= a % b;
      else if (b === 6 && r() < 0.6) a -= a % (r() < 0.5 ? 2 : 3);    // passes one test only, often
      return this.q({ a: Math.max(a, b), b });
    },
    q({ a, b }) {
      const yes = b === 6 ? a % 2 === 0 && dsum(a) % 3 === 0 : elevenSums(a).diff % 11 === 0;
      return { a, b, text: `Is ${fmt(a)} divisible by ${b}?`, say: `Is ${a} divisible by ${b}?`, choices: YN, ans: yn(yes), expr: `${a}%${b}===0?'Yes':'No'` };
    },
    work({ a, b }) {
      if (b === 6) return [
        { t: `Is ${fmt(a)} even?`, v: yn(a % 2 === 0), choices: YN },
        { t: `Add its digits`, v: dsum(a) },
        { t: `Divisible by 6 needs both: even, and a digit sum in the 3 times table`, v: yn(a % 2 === 0 && dsum(a) % 3 === 0), choices: YN },
      ];
      const e = elevenSums(a);
      return [
        { t: 'Starting with the last digit, add every other digit', v: e.odd },
        { t: 'Add the digits you skipped', v: e.even },
        { t: 'The difference between the two totals', v: e.diff },
        { t: `Is ${e.diff} 0 or in the 11 times table?`, v: yn(e.diff % 11 === 0), choices: YN },
      ];
    },
  },
  {
    id: 'prime-or-not', world: 'forest', band: '8-10', title: 'Is it prime?',
    hook: '91 — odd, does not end in 5, digits do not add to a multiple of 3. Prime?',
    idea: 'Try dividing by the primes 2, 3, 5, 7… but only up to the number whose square passes it. If none divides, it is prime.',
    why: [
      'A prime has exactly two factors: 1 and itself. 7 is prime — seven dots only make one rectangle, a single row. 1 is not prime, because it has only one factor.',
      'Factors come in pairs that meet in the middle, so if a number has a factor bigger than its square root, the partner is smaller than it — and you would already have found the partner. For 91 you only need to try up to 9, because 10 × 10 is already 100. And 7 × 13 = 91, so 91 is not prime.',
      'You only need to try primes, because any other number is built from primes: if 6 divided 91, then 2 would too. This is the idea of the Sieve: write out the numbers, cross out every multiple of 2, then of 3, then of 5, of 7… Whatever is never crossed out is prime.',
    ],
    alg: 'n is prime ⇔ n > 1 and no prime p ≤ √n divides n',
    ex: { n: 91 },
    gen(r, lv = 1) {
      const [lo, hi] = lv === 1 ? [2, 30] : lv === 2 ? [31, 100] : [101, 250];
      const primes = PRIMES.filter((p) => p >= lo && p <= hi);
      const tricky = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((n) => !isPrime(n) && (lv === 1 || (n % 2 && n % 5)));
      return this.q({ n: r() < 0.5 ? pick(primes, r) : pick(tricky, r) });
    },
    q({ n }) {
      const C = ['Prime', 'Not prime'];
      return { n, text: `Is ${n} prime?`, choices: C, ans: isPrime(n) ? 'Prime' : 'Not prime', expr: `Array.from({length:${n}-2},(_,i)=>i+2).every(d=>${n}%d)?'Prime':'Not prime'` };
    },
    work({ n }) {
      const root = Math.floor(Math.sqrt(n)), sp = smallestFactor(n);
      return [
        { t: `Which whole number, times itself, is the last one at or below ${n}? Test only up to it`, v: root },
        { t: `The smallest number bigger than 1 that divides ${n} exactly`, v: sp },
        { t: sp === n ? 'Only itself — so is it prime?' : `${sp} divides it — so is it prime?`, v: sp === n ? 'Prime' : 'Not prime', choices: ['Prime', 'Not prime'] },
      ];
    },
  },
  {
    id: 'factor-tree', world: 'forest', band: '11-14', title: 'Factor trees',
    hook: '84 — which primes multiply to make it?',
    idea: 'Split the number into two factors, then split those, until every branch ends in a prime.',
    why: [
      'Primes are the atoms of multiplication: every whole number bigger than 1 is either prime or can be broken into smaller factors, and those into smaller ones again. The breaking has to stop, because the numbers keep getting smaller — and it stops at primes, which cannot be broken.',
      '84 splits as 2 × 42, then 42 as 2 × 21, then 21 as 3 × 7. The ends of the branches are 2, 2, 3 and 7, and 2 × 2 × 3 × 7 = 84.',
      'The surprising part: however you split — 84 = 4 × 21 or 12 × 7 — the branches always end in the same primes. Every number has exactly one set of prime factors, like a fingerprint. That is why the prime factors are called the number\'s building blocks.',
    ],
    alg: 'n = p₁ × p₂ × … × pₖ, the same primes however you split',
    ex: { n: 84, kind: 'largest' },
    gen(r, lv = 1) {
      return fresh(() => {
        const pool = lv === 1 ? [2, 3, 5, 7] : lv === 2 ? [2, 3, 5, 7, 11] : [2, 3, 5, 7, 11, 13];
        const k = lv === 1 ? int(2, 3, r) : lv === 2 ? int(3, 4, r) : int(4, 5, r), max = lv === 1 ? 60 : lv === 2 ? 200 : 1000;
        let n;
        do { n = 1; for (let i = 0; i < k; i++) n *= pick(pool, r); } while (n > max);
        return this.q({ n, kind: pick(['largest', 'count'], r) });
      });
    },
    q({ n, kind }) {
      const pf = primeFactors(n);
      if (kind === 'count') return { n, kind, text: `Write ${n} as a product of primes. How many primes are multiplied, counting repeats?`, say: `${n} as a product of primes: how many primes, counting repeats?`, expr: `(function(m){let c=0;for(let p=2;m>1;p++)while(m%p===0){m/=p;c++}return c})(${n})`, ans: pf.length };
      return { n, kind, text: `What is the largest prime factor of ${n}?`, expr: `Array.from({length:${n}},(_,i)=>i+1).filter(p=>${n}%p===0&&p>1&&Array.from({length:p-2},(_,j)=>j+2).every(d=>p%d)).pop()`, ans: pf.at(-1) };
    },
    work({ n, kind }) {
      const pf = primeFactors(n), s = []; let cur = n;
      for (const p of pf.slice(0, -1)) { s.push({ t: `${cur} = ${p} × ?`, v: cur / p }); cur /= p; }
      s.push(kind === 'count' ? { t: 'Count the primes at the ends of the branches', v: pf.length } : { t: 'The largest prime at the ends of the branches', v: pf.at(-1) });
      return s;
    },
    draw: ({ n }) => treeTop(n),
  },
  {
    id: 'hcf', world: 'forest', band: '11-14', title: 'Highest common factor',
    hook: '24 and 36 — what is the biggest number that divides both?',
    idea: 'Divide both numbers by a prime they share, again and again, until nothing is shared. Multiply the primes you took out.',
    why: [
      'A common factor divides both numbers. The highest one is useful whenever you want to cut two things into equal pieces with none left over — or to simplify a fraction in one go: 24/36 becomes 2/3 when you divide top and bottom by 12.',
      'Every factor of a number is made from its primes. 24 is 2 × 2 × 2 × 3 and 36 is 2 × 2 × 3 × 3. Any number that divides both can only use primes that both of them have, as many times as both have them: two 2s and one 3. The most you can take is all of those together: 2 × 2 × 3 = 12.',
      'Dividing both numbers by a shared prime, over and over, takes out exactly those shared primes, one at a time. When the two leftovers share nothing, you have taken them all.',
    ],
    alg: 'HCF(a, b) = product of the primes a and b share (with repeats)',
    ex: { a: 24, b: 36 },
    gen(r, lv = 1) {
      return fresh(() => {
        const h = lv === 1 ? pick([2, 3, 4, 5, 6], r) : lv === 2 ? pick([4, 6, 8, 9, 10, 12, 14, 15], r) : pick([12, 16, 18, 20, 24, 28, 30], r);
        const top = lv === 1 ? 7 : lv === 2 ? 9 : 11;
        let m1, m2;
        do { m1 = int(2, top, r); m2 = int(2, top, r); } while (m1 === m2 || gcd(m1, m2) !== 1);
        return this.q({ a: h * m1, b: h * m2 });
      });
    },
    q({ a, b }) {
      return { a, b, text: `HCF of ${a} and ${b}`, say: `the highest common factor of ${a} and ${b}`, expr: `(function g(a,b){return b?g(b,a%b):a})(${a},${b})`, ans: ladder(a, b).h };
    },
    work({ a, b }) {
      const L = ladder(a, b);
      return [
        ...L.ps.map((s) => ({ t: `${s.x} and ${s.y}: the smallest prime that divides both`, v: s.p })),
        { t: L.ps.length > 1 ? `No prime divides both ${L.x} and ${L.y}. Multiply the primes you took out: ${L.ps.map((s) => s.p).join(' × ')}` : `No prime divides both ${L.x} and ${L.y}, so the HCF is the one prime you took out`, v: L.h },
      ];
    },
    draw({ a, b }) {
      const h = gcd(a, b), side = (m) => (m === 1 ? '' : primeFactors(m).join('×'));
      return venn(`${a}`, `${b}`, side(a / h), '?', side(b / h));
    },
  },
  {
    id: 'lcm', world: 'forest', band: '11-14', title: 'Lowest common multiple',
    hook: 'One bus comes every 6 minutes, another every 8. They have just left together. When do they next leave together?',
    idea: 'Divide one number by the highest common factor, then multiply by the other.',
    why: [
      'The first bus leaves at 6, 12, 18, 24… minutes; the second at 8, 16, 24… They meet again at the first number in both lists — the lowest common multiple. You could write out both lists, but there is a shortcut.',
      '6 × 8 = 48 is certainly a time they both leave, but it is not the first: 6 and 8 share a factor of 2, so multiplying them counts that 2 twice. Take it out once — 48 ÷ 2 = 24 — and you have the smallest number both divide. Doing it as 6 ÷ 2 × 8 keeps the numbers small.',
      'In primes: 6 = 2 × 3 and 8 = 2 × 2 × 2. A common multiple must contain everything in each: three 2s and a 3. The fewest you can use is exactly that, 2 × 2 × 2 × 3 = 24. When two numbers share nothing, like 4 and 9, the LCM is just their product.',
    ],
    alg: 'LCM(a, b) = a ÷ HCF(a, b) × b',
    ex: { a: 6, b: 8, ctx: 'bus' },
    gen(r, lv = 1) {
      return fresh(() => {
        const hi = lv === 1 ? 10 : lv === 2 ? 15 : 30;
        let a, b;
        do { a = int(lv === 3 ? 6 : 2, hi, r); b = int(lv === 3 ? 6 : 2, hi, r); } while (a === b || a % b === 0 || b % a === 0);
        return this.q({ a, b, ctx: lv === 3 ? pick(['plain', 'plain', 'lights'], r) : pick(['bus', 'lights', 'plain'], r) });
      });
    },
    q({ a, b, ctx }) {
      const text = ctx === 'bus' ? `One bus comes every ${a} minutes, another every ${b}. They leave together. How many minutes until they next leave together?`
        : ctx === 'lights' ? `Two lights flash together. One flashes every ${a} seconds, the other every ${b}. After how many seconds do they next flash together?`
          : `LCM of ${a} and ${b}`;
      const q = { a, b, ctx, text, expr: `(function(a,b){let m=b;while(m%a)m+=b;return m})(${a},${b})`, ans: (a / gcd(a, b)) * b };
      if (ctx === 'plain') q.say = `the lowest common multiple of ${a} and ${b}`;
      return q;
    },
    work({ a, b }) {
      const h = gcd(a, b);
      return [{ t: `HCF of ${a} and ${b}`, v: h }, { t: `${a} ÷ ${h}`, v: a / h }, { t: `${a / h} × ${b}`, v: (a / h) * b }];
    },
  },
];

/* ================================================================ stories */

export const STORIES = {
  'factor-pairs': { title: 'Planting the orchard', scene: 'forest', cast: ['astro', 'pixel'], beats: [
    { who: null, say: 'The forest club has 36 saplings to plant in a neat rectangle. How many different rectangles could they make?' },
    { who: 'pixel', say: 'One long row of 36! Or 2 rows of 18…', add: { t: '2 × 18', v: 36 } },
    { who: 'astro', say: 'Keep going: 3 rows of 12, 4 rows of 9…', add: { t: '4 × 9', v: 36 } },
    { who: 'pixel', say: '5 rows doesn’t work. 6 rows of 6 — a square!', add: { t: '6 × 6', v: 36 } },
    { who: 'astro', say: 'Stop there. 7 rows would need fewer than 6 in a row, and we’ve met all of those already.' },
    { who: 'astro', say: 'Five pairs, but 6 × 6 is one number twice. So 36 has nine factors.', add: { t: '5 × 2 − 1', v: 9 } },
  ] },
  'multiples': { title: 'Boxes of eggs', scene: 'market', cast: ['koi', 'comet'], beats: [
    { who: null, say: 'Nova’s class needs more than 50 eggs for the baking day. Eggs come in boxes of 6.', add: { t: '50 ÷ 6' } },
    { who: 'comet', say: 'Six, twelve, eighteen… this will take ages.' },
    { who: 'koi', say: 'How many whole boxes fit in 50? Eight boxes is 48.', add: { t: '8 × 6', v: 48 } },
    { who: 'comet', say: 'That’s not more than 50, though.' },
    { who: 'koi', say: 'So one box more.', add: { t: '8 + 1', v: 9 } },
    { who: 'comet', say: 'Nine boxes: 54 eggs. The first multiple of 6 over 50.', add: { t: '9 × 6', v: 54 } },
  ] },
  'divisible-2-5-10': { title: 'Bracelets of five', scene: 'room', cast: ['melody', 'pixel'], beats: [
    { who: null, say: 'Pip has 3,475 beads, and wants to thread every one onto bracelets of 5 beads each.', add: { t: '3,475' } },
    { who: 'pixel', say: 'Will there be any left over? I’d have to divide the whole thing by 5.' },
    { who: 'melody', say: 'No need. 3,470 is a pile of tens, and every ten is two fives.', add: { t: '3470 ÷ 5', v: 694 } },
    { who: 'melody', say: 'So only the last digit matters. It’s a 5.' },
    { who: 'pixel', say: 'So none left over!', add: { t: '3475 ÷ 5', v: 695 } },
    { who: 'melody', say: 'Last digit 0 or 5: yes for five. Even: yes for two. A 0: yes for ten.' },
  ] },
  'divisible-4-8': { title: 'The seed packets', scene: 'garden', cast: ['beaker', 'panda'], beats: [
    { who: null, say: 'The seed library has 73,516 seeds to share into packets of 4.' },
    { who: 'beaker', say: 'Every hundred splits into four 25s, so all the hundreds are fine.', add: { t: '100 ÷ 4', v: 25 } },
    { who: 'panda', say: 'Then only the last two digits matter: 16.' },
    { who: 'beaker', say: '16 is four fours. So yes, it splits exactly.', add: { t: '16 ÷ 4', v: 4 } },
    { who: 'panda', say: 'For 8 you’d need the last three digits — 1000 is eight 125s.', add: { t: '1000 ÷ 8', v: 125 } },
    { who: 'beaker', say: 'And 73,516 in packets of 4 makes…', add: { t: '73516 ÷ 4', v: 18379 } },
  ] },
  'divisible-6-11': { title: 'Teams of eleven', scene: 'stadium', cast: ['samurai', 'comet'], beats: [
    { who: null, say: '4,158 children sign up for the district football festival. Can they make teams of exactly 11?' },
    { who: 'comet', say: 'I’ll do the long division…' },
    { who: 'samurai', say: 'Faster: from the right, add every other digit. 8 and 1.', add: { t: '8 + 1', v: 9 } },
    { who: 'samurai', say: 'Now the ones you skipped: 5 and 4.', add: { t: '5 + 4', v: 9 } },
    { who: 'comet', say: 'Nine take nine is zero!', add: { t: '9 − 9', v: 0 } },
    { who: 'samurai', say: 'A difference of 0 means 11 divides it.', add: { t: '4158 ÷ 11', v: 378 } },
  ] },
  'prime-or-not': { title: 'The sieve', scene: 'night', cast: ['goldlegend', 'scopey'], beats: [
    { who: null, say: 'On a camping night, Theo asks Vesper: is 91 prime? It is odd, it does not end in 5, and its digits add to 10.', add: { t: '9 + 1', v: 10 } },
    { who: 'scopey', say: 'So not 2, not 3, not 5. I think it’s prime.' },
    { who: 'goldlegend', say: 'Try 7.' },
    { who: 'scopey', say: 'Seven thirteens… that’s 91!', add: { t: '7 × 13', v: 91 } },
    { who: 'goldlegend', say: 'You only had to try up to 9, because 10 times 10 is already past it.', add: { t: '10 × 10', v: 100 } },
    { who: 'scopey', say: 'Next time I’ll try every prime up to there, and check them all.' },
  ] },
  'factor-tree': { title: 'The family tree of 84', scene: 'forest', cast: ['beaker', 'koi'], beats: [
    { who: null, say: 'Rafi carves 84 at the top of a trail sign and draws two branches under it.', add: { t: '84' } },
    { who: 'beaker', say: '84 is even, so one branch is 2.', add: { t: '84 ÷ 2', v: 42 } },
    { who: 'koi', say: '42 is even too: another 2.', add: { t: '42 ÷ 2', v: 21 } },
    { who: 'beaker', say: '21 is 3 times 7, and both of those are prime, so the branches stop.', add: { t: '21 ÷ 3', v: 7 } },
    { who: 'koi', say: 'Check: multiply all the ends back together.', add: { t: '2 × 2 × 3 × 7', v: 84 } },
    { who: 'beaker', say: 'Split it any way you like — the ends are always 2, 2, 3 and 7.' },
  ] },
  'hcf': { title: 'Sharing the fruit', scene: 'kitchen', cast: ['melody', 'panda'], beats: [
    { who: null, say: 'Ines has 24 oranges and 36 apples to pack into identical bags, with nothing left over. What is the most bags she can fill?' },
    { who: 'panda', say: 'Both are even. Halve both.', add: { t: '24 ÷ 2', v: 12 } },
    { who: 'melody', say: '12 and 18. Still both even. Halve again: 6 and 9.', add: { t: '12 ÷ 2', v: 6 } },
    { who: 'panda', say: '6 and 9 are both in the three times table: 2 and 3.', add: { t: '6 ÷ 3', v: 2 } },
    { who: 'melody', say: 'Nothing divides 2 and 3 both. So I took out 2, 2 and 3.', add: { t: '2 × 2 × 3', v: 12 } },
    { who: 'panda', say: 'Twelve bags, each with 2 oranges and 3 apples.' },
  ] },
  'lcm': { title: 'The two buses', scene: 'bus', cast: ['scopey', 'pixel'], beats: [
    { who: null, say: 'The number 6 bus comes every 6 minutes and the number 8 bus every 8. Both have just left the stop.' },
    { who: 'pixel', say: 'They’ll meet again in 48 minutes — six times eight!', add: { t: '6 × 8', v: 48 } },
    { who: 'scopey', say: 'Check the lists. The 6 bus: 6, 12, 18, 24. The 8 bus: 8, 16, 24.' },
    { who: 'pixel', say: '24 is in both! So 48 was too late?' },
    { who: 'scopey', say: '6 and 8 share a factor of 2, so multiplying counts it twice. Take it out once.', add: { t: '48 ÷ 2', v: 24 } },
    { who: 'pixel', say: 'Or 6 ÷ 2, then times 8 — smaller numbers.', add: { t: '6 ÷ 2 × 8', v: 24 } },
  ] },
};
