/* bakery.js — The Fraction Bakery. Fractions from "half a pie" to dividing by
   two-thirds, every stop built on one idea: a fraction is a fair share, and
   the bottom number says how many EQUAL pieces the whole was cut into.
   Contract: docs/CHAPTER-CONTRACT.md. */

import { int, pick } from '../rand.js';
import { fracBar, pie, numberLine, grid, svg, text } from './kit.js';

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a / gcd(a, b)) * b;
const F = (n, d) => `${n}/${d}`;
/* Plain-arithmetic routes for the steps' x (test/lib/steps.mjs): the highest common factor and the
   lowest common multiple found by search, not by the trick's own gcd/lcm. */
const hcfX = (a, b) => `Math.max(...[...Array(${Math.min(a, b)})].map((_,i)=>i+1).filter(d=>${a}%d===0&&${b}%d===0))`;
const lcmX = (a, b) => `[...Array(${a * b})].map((_,i)=>i+1).find(m=>m%${a}===0&&m%${b}===0)`;
/* A proper fraction in lowest terms, bottom from lo to hi: [top, bottom]. */
function proper(r, lo, hi, minTop = 1) { let a, b; do { b = int(lo, hi, r); a = int(minTop, Math.max(minTop, b - 1), r); } while (a >= b || gcd(a, b) !== 1); return [a, b]; }

/* The prompt must never show its own answer (test/tricks.mjs). A generator
   that could land on one re-rolls rather than hoping. */
const leaks = (q) => !q.choices && String(q.ans).length > 1 && q.text.split(/[^0-9./]/).includes(String(q.ans));
function fresh(make) { let q; for (let i = 0; i < 80; i++) { q = make(); if (!leaks(q)) return q; } return q; }

/* Several fraction bars stacked, lined up at the same width so their pieces
   can be compared by eye. rows: [[parts, shaded], ...] */
function bars(rows, w = 300, h = 36, gap = 14) {
  let s = '';
  rows.forEach(([n, k], j) => {
    const u = w / n, y = 2 + j * (h + gap);
    for (let i = 0; i < n; i++) s += `<rect x="${(2 + i * u).toFixed(2)}" y="${y}" width="${u.toFixed(2)}" height="${h}" class="${i < k ? 'dg-fill1' : 'dg-blank'}"/>`;
  });
  return svg(w + 4, rows.length * (h + gap) - gap + 4, s, `${rows.length} fraction bars, one above the other`);
}
/* A row of pies: [[slices, shaded], ...] — for mixed numbers. */
function pies(list, r = 34) {
  const c = r + 4; let s = '';
  list.forEach(([n, k], j) => {
    const cx = c + j * (2 * c + 6);
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
      s += `<path d="M${cx},${c} L${(cx + r * Math.cos(a0)).toFixed(2)},${(c + r * Math.sin(a0)).toFixed(2)} A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${(cx + r * Math.cos(a1)).toFixed(2)},${(c + r * Math.sin(a1)).toFixed(2)} Z" class="${i < k ? 'dg-fill1' : 'dg-blank'}"/>`;
    }
  });
  return svg(list.length * (2 * c + 6), 2 * c, s, `${list.length} pies`);
}

export const WORLD = {
  id: 'bakery', name: 'The Fraction Bakery', short: 'Bakery', band: '6-7',
  blurb: 'Halves, quarters and thirds — sharing fairly, then sharing cleverly.',
  tint: '#FFF4D6', ink: '#7A4A12', glyph: '🥧',
};

export const TRICKS = [
  {
    id: 'fraction-parts', world: 'bakery', band: '6-7', title: 'Halves, quarters and thirds',
    hook: 'Half a pie, a quarter of a cake — what do those words really mean?',
    idea: 'Count all the equal pieces for the bottom number, and the shaded pieces for the top.',
    why: [
      'A fraction is a promise about fair shares. The bottom number says how many EQUAL pieces the whole was cut into. The top number says how many of those pieces you have.',
      'The pieces must be equal. Cut a cake into four pieces of different sizes and "one quarter" means nothing — somebody got the small one. A half is not just one of two pieces; it is one of two EQUAL pieces.',
      'So 3/4 reads as "three of four equal pieces". And the more pieces you cut, the smaller each one is: a quarter is smaller than a half, even though 4 is bigger than 2.',
    ],
    alg: 'k shaded out of n equal parts = k/n',
    ex: { n: 4, k: 3, shape: 'pie' },
    oneIdea: true,
    keys: ['/'],
    gen(r, lv = 1) {
      const n = lv === 1 ? pick([2, 4], r) : lv === 2 ? pick([2, 3, 4], r) : pick([3, 5, 6, 8], r);
      return this.q({ n, k: int(1, n - 1, r), shape: lv === 1 ? 'pie' : pick(['pie', 'bar'], r) });
    },
    q({ n, k, shape = 'pie' }) {
      return { n, k, shape, frac: true, text: `A ${shape === 'pie' ? 'pie' : 'cake'} cut into ${n} equal pieces. What fraction is shaded?`, expr: `${k}/${n}`, ans: F(k, n) };
    },
    work({ n, k }) {
      return [
        { t: 'How many equal pieces altogether?', v: n, x: `${k}+${n - k}` },
        { t: 'How many are shaded?', v: k, x: `${n}-${n - k}` },
        { t: 'Shaded over altogether', v: F(k, n) },
      ];
    },
    draw: ({ n, k, shape }) => (shape === 'pie' ? pie(n, k) : fracBar(n, k)),
  },
  {
    id: 'fraction-of-amount', world: 'bakery', band: '6-7', title: 'A fraction of an amount',
    hook: '3/4 of 20 — without drawing twenty things?',
    idea: 'Divide by the bottom to find one share, then multiply by the top.',
    why: [
      '1/4 of 20 means: share 20 fairly between 4. Each share is 20 ÷ 4 = 5. The bottom number of a fraction is always a sharing — a division.',
      '3/4 is three of those shares. One share is 5, so three shares are 15. The top number just counts how many shares you take.',
      'That is why the order is "divide, then multiply": you cannot know what three quarters is until you know what one quarter is.',
    ],
    alg: '(a/b) of n = (n ÷ b) × a',
    ex: { a: 3, b: 4, n: 20 },
    caseKey: 'share',
    cases: [
      { label: 'One share: 1/4 of', note: 'With a 1 on top you only need one share, so dividing by the bottom is the whole job.',
        ex: { a: 1, b: 4, n: 12 } },
      { label: 'Several shares: 3/4 of', note: 'Find one share first by dividing, then take as many shares as the top number says.',
        ex: { a: 3, b: 4, n: 20 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) { const b = pick([2, 3, 4], r); return this.q({ a: 1, b, n: b * int(2, 6, r) }); }
        if (lv === 2) { const [a, b] = proper(r, 2, 6); return this.q({ a, b, n: b * int(2, 10, r) }); }
        const [a, b] = proper(r, 3, 12, 2); return this.q({ a, b, n: b * int(3, 12, r) });
      });
    },
    q({ a, b, n }) { return { a, b, n, share: a === 1 ? 'one' : 'several', text: `${a}/${b} of ${n}`, expr: `${n}*${a}/${b}`, ans: (n / b) * a }; },
    work({ a, b, n }) {
      if (a === 1) return [{ t: 'How many equal shares?', v: b, x: `1/(1/${b})` }, { t: `${n} ÷ ${b}`, v: n / b }];
      return [{ t: `One share: ${n} ÷ ${b}`, v: n / b, x: `${n}/${b}` }, { t: `${a} shares: × ${a}`, v: (n / b) * a }];
    },
    draw: ({ a, b }) => fracBar(b, a),
  },
  {
    id: 'equivalent-fractions', world: 'bakery', band: '8-10', title: 'Same share, different pieces',
    hook: '3/4 = ?/12 — how many twelfths is three quarters?',
    idea: 'Whatever you do to the bottom, do the same to the top.',
    why: [
      'Cut each quarter of a pie into 3 smaller slices. Now the pie has 12 slices instead of 4 — and your 3 quarters have become 9 slices. You have exactly the same amount of pie; it is just cut smaller.',
      'Cutting every piece into 3 multiplies the number of pieces by 3 (the bottom) AND the number you have by 3 (the top). Both change together, so the fraction stays the same size.',
      'It works backwards too. 9/12 can be glued back into bigger pieces by dividing top and bottom by the same number. Multiply or divide — as long as it is the same number, top and bottom, the share never changes.',
    ],
    alg: 'a/b = (a × m)/(b × m)',
    ex: { a: 3, b: 4, m: 3, miss: 'top' },
    caseKey: 'miss',
    cases: [
      { label: 'Missing top', note: 'Work out what the bottom was multiplied by, then do the same to the top.',
        ex: { a: 3, b: 4, m: 3, miss: 'top' } },
      { label: 'Missing bottom', note: 'This time the tops tell you the multiplier. Do the same to the bottom.',
        ex: { a: 2, b: 3, m: 4, miss: 'bottom' } },
      { label: 'Going down: dividing', note: 'The new bottom is smaller, so the pieces are being glued back together: divide the top by the same number.',
        ex: { a: 2, b: 3, m: 5, miss: 'down' } },
    ],
    gen(r, lv = 1) {
      const miss = lv === 1 ? 'top' : lv === 2 ? pick(['top', 'bottom'], r) : pick(['top', 'bottom', 'down'], r);
      const b = miss === 'down' ? int(2, 8, r) : int(2, lv === 1 ? 5 : lv === 2 ? 8 : 12, r);
      const m = miss === 'down' ? int(2, Math.max(2, Math.floor(40 / b)), r) : int(2, lv === 1 ? 4 : lv === 2 ? 6 : 9, r);
      return this.q({ a: int(1, b - 1, r), b, m, miss });
    },
    q({ a, b, m, miss }) {
      if (miss === 'bottom') return { a, b, m, miss, text: `${a}/${b} = ${a * m}/?`, expr: `${a * m}*${b}/${a}`, ans: b * m };
      if (miss === 'down') return { a, b, m, miss, text: `${a * m}/${b * m} = ?/${b}`, expr: `${a * m}*${b}/${b * m}`, ans: a };
      return { a, b, m, miss, text: `${a}/${b} = ?/${b * m}`, expr: `${b * m}*${a}/${b}`, ans: a * m };
    },
    work({ a, b, m, miss }) {
      if (miss === 'bottom') return [{ t: `${a} × what makes ${a * m}?`, v: m, x: `${a * m}/${a}` }, { t: `Same to the bottom: ${b} × ${m}`, v: b * m }];
      if (miss === 'down') return [{ t: `${b * m} ÷ what makes ${b}?`, v: m, x: `${b * m}/${b}` }, { t: `Same to the top: ${a * m} ÷ ${m}`, v: a }];
      return [{ t: `${b} × what makes ${b * m}?`, v: m, x: `${b * m}/${b}` }, { t: `Same to the top: ${a} × ${m}`, v: a * m }];
    },
    draw: ({ a, b, m, miss }) => (miss === 'down' ? fracBar(b * m, a * m) : fracBar(b, a)),
  },
  {
    id: 'simplify-fractions', world: 'bakery', band: '8-10', title: 'Simplest form',
    hook: '12/16 — is there a simpler name for the same share?',
    idea: 'Find the biggest number that divides the top and the bottom, and divide both by it.',
    why: [
      'Simplifying is equivalent fractions run backwards: gluing small slices back into bigger ones. 12/16 of a tray of brownies is the same brownie as 3/4 — you have just stopped cutting so finely.',
      'Dividing the top and the bottom by the SAME number keeps the share the same, for the same reason multiplying does. You can do it in small steps (12/16 → 6/8 → 3/4), halving each time.',
      'Or in one step, with the biggest number that goes into both — here 4. When nothing but 1 divides both numbers, the fraction is in its simplest form: the biggest pieces that share can be cut into.',
    ],
    alg: 'a/b = (a ÷ g)/(b ÷ g), g = the highest common factor of a and b',
    ex: { a: 12, b: 16 },
    oneIdea: true,
    keys: ['/'],
    gen(r, lv = 1) {
      const qmax = lv === 1 ? 5 : lv === 2 ? 9 : 12, mmax = lv === 1 ? 3 : lv === 2 ? 6 : 12;
      let p, d;
      do { d = int(2, qmax, r); p = int(1, d - 1, r); } while (gcd(p, d) !== 1);
      const m = int(2, Math.max(2, Math.min(mmax, Math.floor(60 / d))), r);
      return this.q({ a: p * m, b: d * m });
    },
    q({ a, b }) { const g = gcd(a, b); return { a, b, frac: true, simplest: true, text: `Simplify ${a}/${b}`, expr: `${a}/${b}`, ans: F(a / g, b / g) }; },
    work({ a, b }) {
      const g = gcd(a, b);
      return [
        { t: `The biggest number that divides ${a} and ${b}`, v: g, x: hcfX(a, b) },
        { t: `${a} ÷ ${g}`, v: a / g, x: `${a}/(${hcfX(a, b)})` },
        { t: `${b} ÷ ${g}`, v: b / g, x: `${b}/(${hcfX(a, b)})` },
        { t: 'The simplest form', v: F(a / g, b / g) },
      ];
    },
    draw: ({ a, b }) => fracBar(b, a),
  },
  {
    id: 'compare-fractions', world: 'bakery', band: '8-10', title: 'Which slice is bigger?',
    hook: '3/5 or 4/7 — which is more cake?',
    idea: 'Same bottoms: compare the tops. Same tops: the smaller bottom wins. Otherwise cross-multiply.',
    why: [
      'If the bottoms match, the pieces are the same size, so whoever has more pieces has more: 5/8 is more than 3/8.',
      'If the tops match, you have the same NUMBER of pieces — so the bigger pieces win, and bigger pieces come from cutting into fewer. 2/5 is more than 2/7, because fifths are bigger than sevenths.',
      'If nothing matches, cut both into the same pieces. 3/5 and 4/7 both become thirty-fifths: 3/5 = 21/35 and 4/7 = 20/35. You never need the 35 — the two new tops, 3 × 7 and 4 × 5, are all you compare. That is cross-multiplying. If the two new tops come out the same, the fractions are equal: two names for one share, like 2/4 and 3/6.',
    ],
    alg: 'a/b > c/d  ⇔  a × d > c × b',
    ex: { a: 3, b: 5, c: 4, d: 7 },
    caseKey: 'rule',
    cases: [
      { label: 'Same bottoms', note: 'Same bottom, same size of piece — so whoever has more pieces has more.',
        ex: { a: 5, b: 8, c: 3, d: 8 } },
      { label: 'Same tops', note: 'The same number of pieces each, so the bigger pieces win — and fewer cuts make bigger pieces. The smaller bottom is more.',
        ex: { a: 2, b: 5, c: 2, d: 7 } },
      { label: 'Nothing matches', note: 'Cross-multiply: each top times the other bottom. Those are the tops you would get with a shared bottom.',
        ex: { a: 3, b: 5, c: 4, d: 7 } },
      { label: 'Equal after all', note: 'Different numbers can name the same share. When the cross-multiplied tops match, the answer is =.',
        ex: { a: 2, b: 4, c: 3, d: 6 } },
    ],
    gen(r, lv = 1) {
      if (lv === 1) { const b = int(3, 10, r), a = int(1, b - 1, r); let c; do c = int(1, b - 1, r); while (c === a); return this.q({ a, b, c, d: b }); }
      if (lv === 2) { const a = int(1, 5, r); const b = int(a + 1, 12, r); let d; do d = int(a + 1, 12, r); while (d === b); return this.q({ a, b, c: a, d }); }
      if (r() < 0.25) {
        let p, q; do { q = int(2, 6, r); p = int(1, q - 1, r); } while (gcd(p, q) !== 1);
        const m1 = int(1, 3, r); let m2; do m2 = int(1, 4, r); while (m2 === m1);
        return this.q({ a: p * m1, b: q * m1, c: p * m2, d: q * m2 });
      }
      const b = int(2, 12, r), d = int(2, 12, r);
      return this.q({ a: int(1, b - 1, r), b, c: int(1, d - 1, r), d });
    },
    q({ a, b, c, d }) {
      const x = a * d, y = c * b;
      return { a, b, c, d, rule: b === d ? 'bottoms' : a === c ? 'tops' : x === y ? 'equal' : 'cross', choices: ['<', '=', '>'], ans: x > y ? '>' : x < y ? '<' : '=',
        text: `${a}/${b}  ?  ${c}/${d}`, say: `${a}/${b} compared with ${c}/${d}`,
        expr: `(${a}/${b})>(${c}/${d})?'>':(${a}/${b})<(${c}/${d})?'<':'='` };
    },
    work(q) {
      const { a, b, c, d } = q, C = ['<', '=', '>'];
      if (b === d) return [{ t: `Same-size pieces. How many on the left?`, v: a, x: `${a}/${b}*${b}` }, { t: '…and on the right?', v: c, x: `${c}/${d}*${d}` }, { t: 'Compare', v: q.ans, choices: C }];
      if (a === c) return [{ t: `Same number of pieces. Which cut makes bigger pieces: ${b} or ${d}?`, v: Math.min(b, d), x: `1/${b}>1/${d}?${b}:${d}` }, { t: 'Compare', v: q.ans, choices: C }];
      return [{ t: `${a} × ${d}`, v: a * d, x: `${a}*${d}` }, { t: `${c} × ${b}`, v: c * b, x: `${c}*${b}` }, { t: 'Compare', v: q.ans, choices: C }];
    },
    draw: ({ a, b, c, d }) => bars([[b, a], [d, c]]),
  },
  {
    id: 'add-same-bottom', world: 'bakery', band: '8-10', title: 'Adding slices of the same size',
    hook: '2/7 + 3/7 — why is the answer not 5/14?',
    idea: 'When the bottoms match, add or take away the tops. The bottom stays.',
    why: [
      'Sevenths are a SIZE of slice, like "biscuits" is a kind of thing. Two biscuits and three biscuits are five biscuits — not five double-biscuits. Two sevenths and three sevenths are five sevenths.',
      'The bottom number names the size of the pieces, and adding more pieces does not make any piece smaller. So the bottom does not change; only the count on top does.',
      'Adding the bottoms too (5/14) would mean the pie had been cut into more pieces just because you put two plates together. It had not. Taking away works the same way: 5/9 − 2/9 is 3/9.',
    ],
    alg: 'a/b ± c/b = (a ± c)/b',
    ex: { a: 2, c: 3, b: 7, op: '+' },
    caseKey: 'op',
    cases: [
      { label: 'Adding', note: 'The bottom names the size of the slices, and adding more slices does not change their size. Add the tops only.',
        ex: { a: 2, c: 3, b: 7, op: '+' } },
      { label: 'Taking away', note: 'Same size of slice again, so take away the tops and keep the bottom just as it is.',
        ex: { a: 5, c: 2, b: 9, op: '−' } },
    ],
    keys: ['/'],
    gen(r, lv = 1) {
      return fresh(() => {
        const op = lv === 1 ? '+' : pick(['+', '−'], r);
        const b = int(op === '+' ? 3 : 4, lv === 1 ? 10 : lv === 2 ? 12 : 20, r);
        if (op === '+') {
          const a = int(1, b - 1, r), c = lv === 3 ? int(1, b - 1, r) : int(1, Math.max(1, b - a), r);
          return this.q({ a, c, b, op });
        }
        let a, c; do { a = int(3, lv === 3 ? 2 * b : b - 1, r); c = int(1, a - 1, r); } while (a === 2 * c);
        return this.q({ a, c, b, op });
      });
    },
    q({ a, c, b, op }) {
      const top = op === '+' ? a + c : a - c;
      return { a, c, b, op, frac: true, text: `${a}/${b} ${op} ${c}/${b}`, expr: `${a}/${b}${op === '+' ? '+' : '-'}${c}/${b}`, ans: F(top, b) };
    },
    work({ a, c, b, op }) {
      const top = op === '+' ? a + c : a - c;
      return [
        { t: op === '+' ? `Add the tops: ${a} + ${c}` : `Take the tops: ${a} − ${c}`, v: top, x: `(${a}/${b}${op === '+' ? '+' : '-'}${c}/${b})*${b}` },
        { t: 'Keep the bottom — the pieces are the same size', v: F(top, b) },
      ];
    },
    draw: ({ a, c, b }) => bars([[b, Math.min(a, b)], [b, c]]),
  },
  {
    id: 'mixed-numbers', world: 'bakery', band: '8-10', title: 'Mixed numbers and top-heavy fractions',
    hook: '2 3/4 pies — how many quarters is that?',
    idea: 'Each whole is as many pieces as the bottom number. Multiply, then add the extra pieces.',
    why: [
      'A whole pie cut into quarters is 4 quarters. So 2 whole pies are 2 × 4 = 8 quarters, and 3 more quarters make 11 quarters: 2 3/4 = 11/4.',
      'Going back, 11/4 asks: how many whole pies can I build from 11 quarters? Every 4 quarters make one pie, so 11 quarters make 2 pies with 3 quarters left over: 2 3/4.',
      'A "top-heavy" (improper) fraction is not wrong, just unfinished. Both names describe the same pile of pieces — one counts the pieces, the other counts whole pies first.',
    ],
    alg: 'w a/b = (w × b + a)/b',
    ex: { w: 2, a: 3, b: 4, dir: 'up' },
    caseKey: 'dir',
    cases: [
      { label: 'Mixed to top-heavy', note: 'Every whole is as many pieces as the bottom number. Multiply, then add the extra pieces.',
        ex: { w: 2, a: 3, b: 4, dir: 'up' } },
      { label: 'How many wholes?', note: 'Going back: how many whole groups of the bottom number fit into the top? That is the whole number.',
        ex: { w: 2, a: 3, b: 4, dir: 'wholes' } },
      { label: 'Pieces left over', note: 'Take away the pieces the wholes used up. What remains is the leftover fraction — always fewer than the bottom.',
        ex: { w: 2, a: 3, b: 5, dir: 'left' } },
    ],
    keys: ['/'],
    gen(r, lv = 1) {
      const dir = lv === 1 ? 'up' : pick(['up', 'wholes', 'left'], r);
      const b = int(lv === 3 ? 3 : 2, lv === 1 ? 5 : lv === 2 ? 8 : 12, r);
      return this.q({ w: int(lv === 3 ? 2 : 1, lv === 1 ? 3 : lv === 2 ? 5 : 9, r), a: int(1, b - 1, r), b, dir });
    },
    q({ w, a, b, dir }) {
      const n = w * b + a;
      if (dir === 'wholes') return { w, a, b, dir, frac: true, text: `${n}/${b} as a mixed number: how many whole ones?`, expr: `Math.floor(${n}/${b})`, ans: w };
      if (dir === 'left') return { w, a, b, dir, frac: true, text: `${n}/${b} = ${w} and ?/${b}`, expr: `${n}%${b}`, ans: a };
      return { w, a, b, dir, frac: true, text: `Write ${w} ${a}/${b} as an improper fraction`, say: `${w} and ${a}/${b} as an improper fraction`, expr: `${w}+${a}/${b}`, ans: F(n, b) };
    },
    work({ w, a, b, dir }) {
      const n = w * b + a;
      if (dir === 'wholes') return [{ t: 'How many pieces make one whole?', v: b, x: `1/(1/${b})` }, { t: `How many whole ${b}s fit in ${n}?`, v: w }];
      if (dir === 'left') return [{ t: `${w} wholes use ${w} × ${b} pieces`, v: w * b, x: `${n}-${n}%${b}` }, { t: `Pieces left over from ${n}`, v: a }];
      return [{ t: `Pieces in the wholes: ${w} × ${b}`, v: w * b, x: `${w}*${b}` }, { t: `Add the ${a} extra`, v: n, x: `(${w}+${a}/${b})*${b}` }, { t: `Over ${b}`, v: F(n, b) }];
    },
    draw: ({ w, a, b, dir }) => (dir === 'up' ? pies([...Array(w).fill([b, b]), [b, a]], w > 4 ? 24 : 34) : pie(b, 0, 50)),
  },
  {
    id: 'add-different-bottoms', world: 'bakery', band: '11-14', title: 'Adding different-sized slices',
    hook: '1/3 + 1/4 — the slices are different sizes. Now what?',
    idea: 'Re-cut both into the same size of piece, then add the tops.',
    why: [
      'You cannot add thirds and quarters straight away, any more than you can add 3 metres and 4 centimetres and call it 7. First make them the same kind of thing.',
      'Twelfths fit both: every third is 4 twelfths and every quarter is 3 twelfths (12 is a number both 3 and 4 go into). So 1/3 + 1/4 = 4/12 + 3/12 = 7/12.',
      'Changing to twelfths is only equivalent fractions — the same share, cut smaller — so nothing about the amounts has changed. Once the pieces match, it is the easy sum from the last stop, and taking away works the same way. Sometimes one bottom already goes into the other — thirds and sixths — and then only the thirds need re-cutting: 1/3 = 2/6.',
    ],
    alg: 'a/b ± c/d = (a × L/b ± c × L/d)/L, L a common multiple of b and d',
    ex: { a: 1, b: 3, c: 1, d: 4, op: '+' },
    caseKey: ['op', 'fit'],
    cases: [
      { label: 'Adding: one bottom fits', note: '3 goes into 6, so sixths already fit both. Only the thirds need cutting smaller.',
        ex: { a: 1, b: 3, c: 1, d: 6, op: '+' } },
      { label: 'Adding: re-cut both', note: 'Neither bottom goes into the other, so find a new bottom both go into and re-cut both fractions.',
        ex: { a: 1, b: 3, c: 1, d: 4, op: '+' } },
      { label: 'Taking away: one fits', note: 'Same first step as adding — make the pieces match — then take the tops away.',
        ex: { a: 3, b: 4, c: 1, d: 2, op: '−' } },
      { label: 'Taking away: re-cut both', note: 'Re-cut both into a shared size first; only then can one be taken from the other.',
        ex: { a: 2, b: 3, c: 1, d: 4, op: '−' } },
    ],
    keys: ['/'],
    gen(r, lv = 1) {
      return fresh(() => {
        let a, b, c, d, op = lv === 1 ? '+' : pick(['+', '−'], r);
        if (lv === 1) { b = int(2, 5, r); d = b * int(2, 3, r); }
        else { const hi = lv === 2 ? 6 : 12; b = int(2, hi, r); do d = int(2, hi, r); while (d === b); }
        a = int(1, b - 1, r); c = int(1, d - 1, r);
        if (op === '−') {
          if (a * d === c * b) { a = b - 1; c = 1; if (a * d === c * b) op = '+'; }
          if (a * d < c * b) [a, b, c, d] = [c, d, a, b];
        }
        return this.q({ a, b, c, d, op });
      });
    },
    q({ a, b, c, d, op }) {
      const L = lcm(b, d), A = (a * L) / b, C = (c * L) / d;
      return { a, b, c, d, op, fit: L === b || L === d ? 'one' : 'both', frac: true, text: `${a}/${b} ${op} ${c}/${d}`, expr: `${a}/${b}${op === '+' ? '+' : '-'}${c}/${d}`, ans: F(op === '+' ? A + C : A - C, L) };
    },
    work({ a, b, c, d, op }) {
      const L = lcm(b, d), A = (a * L) / b, C = (c * L) / d;
      return [
        { t: `A bottom that both ${b} and ${d} go into`, v: L, x: lcmX(b, d) },
        { t: `${a}/${b} = ?/${L}`, v: A, x: `${a}/${b}*(${lcmX(b, d)})` },
        { t: `${c}/${d} = ?/${L}`, v: C, x: `${c}/${d}*(${lcmX(b, d)})` },
        { t: op === '+' ? 'Add the tops, keep the bottom' : 'Take the tops, keep the bottom', v: F(op === '+' ? A + C : A - C, L) },
      ];
    },
    draw: ({ a, b, c, d }) => bars([[b, a], [d, c]]),
  },
  {
    id: 'multiply-fractions', world: 'bakery', band: '11-14', title: 'Multiplying fractions',
    hook: '2/3 × 3/4 — why do you just multiply straight across?',
    idea: 'Multiply the tops, multiply the bottoms.',
    why: [
      'A whole number times a fraction is just repeated adding: 3 × 2/5 is 2/5 + 2/5 + 2/5 = 6/5. The pieces stay fifths; you just have three times as many.',
      '"×" between two fractions means "of". 2/3 × 3/4 is two-thirds OF three-quarters. Picture a tray cut into 3 rows and 4 columns: 12 little squares, so each is 1/12 of the tray.',
      'Three-quarters of the tray is 3 columns. Two-thirds of that is 2 rows of those 3 columns: 2 × 3 = 6 squares out of 3 × 4 = 12. The tops multiply to count your squares; the bottoms multiply to count all the squares.',
    ],
    alg: 'a/b × c/d = (a × c)/(b × d)',
    ex: { a: 2, b: 3, c: 3, d: 4 },
    caseKey: 'kind',
    cases: [
      { label: 'Whole number × fraction', note: 'This is repeated adding of the same slice, so the slices stay the same size: multiply the top, keep the bottom.',
        ex: { w: 3, a: 2, b: 5 } },
      { label: 'Fraction × fraction', note: '× means "of" here: part of a part. Multiply the tops to count your squares, and the bottoms to count them all.',
        ex: { a: 2, b: 3, c: 3, d: 4 } },
    ],
    keys: ['/'],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) { const b = int(2, 8, r); return this.q({ w: int(2, 6, r), a: int(1, b - 1, r), b }); }
        const hi = lv === 2 ? 6 : 12, [a, b] = proper(r, 2, hi), [c, d] = proper(r, 2, hi);
        return this.q({ a, b, c, d });
      });
    },
    q({ w, a, b, c, d }) {
      if (w) return { w, a, b, kind: 'whole', frac: true, text: `${w} × ${a}/${b}`, expr: `${a}/${b}*${w}`, ans: F(w * a, b) };
      return { a, b, c, d, kind: 'frac', frac: true, text: `${a}/${b} × ${c}/${d}`, expr: `(${a}/${b})*(${c}/${d})`, ans: F(a * c, b * d) };
    },
    work({ w, a, b, c, d }) {
      if (w) return [{ t: `Tops: ${w} × ${a}`, v: w * a, x: `${w}*${a}` }, { t: 'The pieces are the same size — keep the bottom', v: F(w * a, b) }];
      return [{ t: `Tops: ${a} × ${c}`, v: a * c, x: `${a}*${c}` }, { t: `Bottoms: ${b} × ${d}`, v: b * d, x: `${b}*${d}` }, { t: 'Top over bottom', v: F(a * c, b * d) }];
    },
    draw: ({ w, a, b, d }) => {
      if (w) return fracBar(b, a);
      const sh = new Set(); for (let i = 0; i < a; i++) for (let j = 0; j < d; j++) sh.add(i + ',' + j);
      return grid(d, b, sh, Math.max(14, Math.min(30, Math.floor(240 / Math.max(b, d)))));
    },
  },
  {
    id: 'divide-fractions', world: 'bakery', band: '11-14', title: 'Dividing by a fraction',
    hook: '3 ÷ 1/2 — how many halves fit in 3?',
    idea: 'Keep the first, change ÷ to ×, flip the second.',
    why: [
      'Dividing asks "how many of these fit in that?" How many halves fit in 3 pies? Each pie holds 2 halves, so 3 pies hold 6. Dividing by 1/2 is the same as multiplying by 2 — the answer is BIGGER, because halves are small.',
      'Now 6 ÷ 2/3. First count thirds: 6 pies hold 6 × 3 = 18 thirds. But each helping is TWO thirds, so group them in twos: 18 ÷ 2 = 9 helpings. You multiplied by 3 and divided by 2 — which is multiplying by 3/2, the fraction flipped.',
      'That is all "keep, change, flip" is: the bottom of the divisor tells you how many pieces each whole breaks into, and the top tells you how many pieces make one helping.',
    ],
    alg: 'a/b ÷ c/d = a/b × d/c',
    ex: { w: 3, c: 1, d: 2, kind: 'unit' },
    caseKey: 'kind',
    cases: [
      { label: 'Whole ÷ a unit fraction', note: 'How many halves fit in 3? Each whole holds 2, so multiply the wholes by the bottom number.',
        ex: { w: 3, c: 1, d: 2, kind: 'unit' } },
      { label: 'Whole ÷ a bigger fraction', note: 'Count the pieces first, then group them into helpings the size of the top number: multiply, then divide.',
        ex: { w: 6, c: 2, d: 3, kind: 'whole' } },
      { label: 'Fraction ÷ fraction', note: 'Now both are fractions. Keep the first, change ÷ to ×, flip the second, and multiply straight across.',
        ex: { a: 2, b: 3, c: 3, d: 4, kind: 'frac' } },
    ],
    keys: ['/'],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) return this.q({ w: int(1, 6, r), c: 1, d: int(2, 5, r), kind: 'unit' });
        if (lv === 2) {
          if (r() < 0.4) return this.q({ w: int(2, 8, r), c: 1, d: int(2, 8, r), kind: 'unit' });
          const c = int(2, 4, r), d = int(c + 1, 8, r);
          return this.q({ w: c * int(1, 4, r), c, d, kind: 'whole' });
        }
        const [a, b] = proper(r, 2, 10), [c, d] = proper(r, 2, 10);
        return this.q({ a, b, c, d, kind: 'frac' });
      });
    },
    q({ w, a, b, c, d, kind }) {
      if (kind === 'unit') return { w, c, d, kind, frac: true, text: `${w} ÷ 1/${d}`, say: `how many 1/${d}s fit in ${w}`, expr: `${w}/(1/${d})`, ans: w * d };
      if (kind === 'whole') return { w, c, d, kind, frac: true, text: `${w} ÷ ${c}/${d}`, expr: `${w}/(${c}/${d})`, ans: (w * d) / c };
      return { a, b, c, d, kind, frac: true, text: `${a}/${b} ÷ ${c}/${d}`, expr: `(${a}/${b})/(${c}/${d})`, ans: F(a * d, b * c) };
    },
    work({ w, a, b, c, d, kind }) {
      if (kind === 'unit') return [{ t: `How many 1/${d}s fit in one whole?`, v: d, x: `1/(1/${d})` }, { t: `In ${w} wholes: ${w} × ${d}`, v: w * d }];
      if (kind === 'whole') return [{ t: `Pieces: ${w} × ${d}`, v: w * d, x: `${w}*${d}` }, { t: `Helpings of ${c} pieces: ÷ ${c}`, v: (w * d) / c }];
      return [
        { t: `Keep ${a}/${b}, change ÷ to ×, flip ${c}/${d}`, v: F(d, c), x: `1/(${c}/${d})` },
        { t: `Tops: ${a} × ${d}`, v: a * d, x: `${a}*${d}` },
        { t: `Bottoms: ${b} × ${c}`, v: b * c, x: `${b}*${c}` },
        { t: 'Top over bottom', v: F(a * d, b * c) },
      ];
    },
    draw: ({ w, a, b, c, d, kind }) => (kind === 'frac' ? bars([[b, a], [d, c]]) : numberLine(0, w, 1)),
  },
];

