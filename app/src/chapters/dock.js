/* dock.js — The Decimal Dock. Tenths and hundredths, percentages, ratio and
   rates: the numbers on price tags, recipes and timetables. Every decimal
   answer here is built from whole numbers and divided ONCE at the end, so the
   answer, the plain arithmetic and the last step agree to the last digit.
   Contract: docs/CHAPTER-CONTRACT.md. */

import { int, pick } from '../rand.js';
import { fracBar, grid, svg, text } from './kit.js';

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const P10 = (k) => 10 ** k;
const F = (n, d) => `${n}/${d}`;

/* The prompt must never show its own answer (test/tricks.mjs). */
const leaks = (q) => !q.choices && String(q.ans).length > 1 && q.text.split(/[^0-9./]/).includes(String(q.ans));
function fresh(make) { let q; for (let i = 0; i < 80; i++) { q = make(); if (!leaks(q)) return q; } return q; }
/* A whole number whose last digit is not 0, so N / 10^dp shows all dp places. */
const tidy = (lo, hi, r) => { let n = int(lo, hi, r); if (n % 10 === 0) n += int(1, 9, r); return n; };

/* A place-value chart, the numbers lined up on their decimal points. */
function pv(nums) {
  const parts = nums.map((x) => String(x).split('.'));
  const I = Math.max(...parts.map((p) => p[0].length)), D = Math.max(0, ...parts.map((p) => (p[1] || '').length));
  const iname = ['O', 'T', 'H', 'Th', 'TTh'], fname = ['t', 'h', 'th', 'tth', 'hth', 'mth'];
  const cw = 40, pw = 14, top = 22, rh = 40; let s = '', x = 2;
  const cols = [];
  for (let i = I - 1; i >= 0; i--) { cols.push({ x, h: iname[i] || '', f: (p) => p[0].padStart(I, ' ')[I - 1 - i] }); x += cw; }
  const px = x; x += D ? pw : 0;
  for (let j = 0; j < D; j++) { const jj = j; cols.push({ x, h: fname[j] || '', f: (p) => (p[1] || '')[jj] || '' }); x += cw; }
  cols.forEach((c) => { s += text(c.x + cw / 2, 15, c.h, 'dg-small'); });
  parts.forEach((p, r) => {
    const y = top + r * rh;
    cols.forEach((c) => { const d = c.f(p); s += `<rect x="${c.x}" y="${y}" width="${cw}" height="${rh}" class="dg-blank"/>` + (d && d !== ' ' ? text(c.x + cw / 2, y + 28, d, 'dg-big') : ''); });
    if (D) s += text(px + pw / 2, y + 28, '.', 'dg-big');
  });
  return svg(x + 2, top + parts.length * rh + 4, s, 'A place-value chart');
}
/* A short number line from lo to hi in ten steps, only the ends labelled, with x marked. */
function between(lo, hi, x, label) {
  const W = 360, X = (v) => 20 + ((v - lo) / (hi - lo)) * (W - 40);
  let s = `<line x1="14" y1="40" x2="${W - 14}" y2="40" class="dg-line"/>`;
  for (let i = 0; i <= 10; i++) { const v = 20 + (i / 10) * (W - 40); s += `<line x1="${v}" y1="${i % 5 ? 35 : 31}" x2="${v}" y2="${i % 5 ? 45 : 49}" class="dg-line"/>`; }
  s += text(20, 68, lo, 'dg-small') + text(W - 20, 68, hi, 'dg-small');
  s += `<circle cx="${X(x).toFixed(1)}" cy="40" r="6" class="dg-dot"/>` + text(X(x).toFixed(1), 22, label, 'dg-accent');
  return svg(W, 76, s, 'A number line');
}
/* A hundred square with the first k squares shaded, a column (10%) at a time. */
const hundred = (k) => { const sh = new Set(); for (let i = 0; i < Math.min(k, 100); i++) sh.add((i % 10) + ',' + Math.floor(i / 10)); return grid(10, 10, sh, 18); };

export const WORLD = {
  id: 'dock', name: 'The Decimal Dock', short: 'Dock', band: '8-10',
  blurb: 'Tenths, per cents and ratios — the numbers on every price tag and timetable.',
  tint: '#E7EEF9', ink: '#1D3F72', glyph: '🛳️',
};

export const TRICKS = [
  {
    id: 'decimal-places', world: 'dock', band: '8-10', title: 'Tenths and hundredths',
    hook: 'In 3.47, is the 7 worth seven? Seventy? Something much smaller?',
    idea: 'Each place after the point is worth a tenth of the place before it: tenths, then hundredths, then thousandths.',
    why: [
      'Moving one place left always makes a digit worth ten times more: ones, tens, hundreds. So moving one place RIGHT makes it worth ten times less — and the pattern does not stop at the ones.',
      'One step right of the ones is tenths: a whole cut into 10. One more step is hundredths: a whole cut into 100. The decimal point is just a marker that says "the ones are here".',
      'So 3.47 is 3 ones, 4 tenths and 7 hundredths. The 7 is worth 7 hundredths, 0.07 — less than one tenth, even though 7 looks bigger than 4.',
    ],
    alg: 'a.bcd = a + b/10 + c/100 + d/1000',
    ex: { kind: 'value', N: 347, dp: 2, pos: 2 },
    keys: ['.'], decimals: true,
    gen(r, lv = 1) {
      return fresh(() => {
        const dp = lv, kind = pick(['build', 'value'], r);
        if (kind === 'build') {
          const ds = []; for (let i = 0; i < dp; i++) ds.push(int(i === dp - 1 ? 1 : 0, 9, r));
          const o = int(lv === 3 ? 0 : 1, lv === 3 ? 20 : 9, r);
          return this.q({ kind, o, ds });
        }
        const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9];   // all different, so "the 7" means one digit
        for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
        const len = (lv === 3 ? 2 : 1) + dp, digs = pool.slice(0, len);
        return this.q({ kind, N: Number(digs.join('')), dp, pos: int(1, dp, r) });
      });
    },
    q(a) {
      if (a.kind === 'build') {
        const { o, ds } = a, names = ['tenths', 'hundredths', 'thousandths'];
        const N = ds.reduce((s, d) => s * 10 + d, o), dp = ds.length;
        const said = ds.map((d, i) => `${d} ${names[i]}`);
        return { ...a, text: `${o} ones, ${said.join(', ')}`, expr: `${o}${ds.map((d, i) => `+${d}/${P10(i + 1)}`).join('')}`, ans: N / P10(dp) };
      }
      const { N, dp, pos } = a, x = N / P10(dp), d = Math.floor(N / P10(dp - pos)) % 10;
      return { ...a, text: `What is the ${d} worth in ${x}?`, expr: `${d}*Math.pow(10,-${pos})`, ans: d / P10(pos) };
    },
    work(q) {
      if (q.kind === 'build') {
        const names = ['tenths', 'hundredths', 'thousandths'];
        return [
          { t: 'The ones go before the point', v: q.o },
          ...q.ds.map((d, i) => ({ t: `${d} ${names[i]} — place ${i + 1} after the point`, v: d / P10(i + 1) })),
          { t: 'Put them together', v: q.ans },
        ];
      }
      const d = Math.floor(q.N / P10(q.dp - q.pos)) % 10;
      return [{ t: `How many places after the point is the ${d}?`, v: q.pos }, { t: `So it is worth`, v: q.ans }];
    },
    draw: (q) => (q.kind === 'build' ? between(q.o, q.o + 1, q.o + 0.5, '?') : pv([q.N / P10(q.dp)])),
  },
  {
    id: 'times-ten-decimals', world: 'dock', band: '8-10', title: '× and ÷ by 10, 100, 1000',
    hook: '3.47 × 100 — where does the point go?',
    idea: 'The point stays still; the digits move one place for every zero — left to multiply, right to divide.',
    why: [
      'Times 10 makes every digit worth ten times more, and "ten times more" is exactly one place to the left. So every digit slides one place left: 3.47 × 10 = 34.7.',
      '× 100 is × 10 twice, so the digits slide two places: 347. Dividing is the same slide the other way — 52 ÷ 1000 slides three places right, to 0.052, with zeros holding the empty places.',
      'People say "move the point", and on paper it looks the same. But it is really the digits that move: the point always sits just after the ones, and it is the ones that change.',
    ],
    alg: 'x × 10ᵏ shifts every digit k places left; x ÷ 10ᵏ shifts them k places right',
    ex: { N: 347, dp: 2, k: 2, op: '×' },
    keys: ['.'], decimals: true,
    gen(r, lv = 1) {
      return fresh(() => {
        const dp = int(0, lv === 1 ? 1 : lv === 2 ? 2 : 3, r);
        const N = tidy(lv === 1 ? 2 : 11, lv === 3 ? 9999 : lv === 2 ? 999 : 99, r);
        return this.q({ N, dp, k: int(1, lv === 1 ? 2 : 3, r), op: pick(['×', '÷'], r) });
      });
    },
    q({ N, dp, k, op }) {
      const x = N / P10(dp), p = P10(k);
      const ans = op === '×' ? (k >= dp ? N * P10(k - dp) : N / P10(dp - k)) : N / P10(dp + k);
      return { N, dp, k, op, text: `${x} ${op} ${p}`, expr: `${x}${op === '×' ? '*' : '/'}${p}`, ans };
    },
    work(q) {
      return [
        { t: `How many zeros in ${P10(q.k)}?`, v: q.k },
        { t: `Slide every digit ${q.k} place${q.k > 1 ? 's' : ''} ${q.op === '×' ? 'left (bigger)' : 'right (smaller)'}`, v: q.ans },
      ];
    },
    draw: (q) => pv([q.N / P10(q.dp)]),
  },
  {
    id: 'add-decimals', world: 'dock', band: '8-10', title: 'Line up the point',
    hook: '3.5 + 1.27 — why is it not 1.62?',
    idea: 'Line the points up so tenths add to tenths — or turn both into hundredths and add whole numbers.',
    why: [
      'You can only add things of the same kind: ones to ones, tenths to tenths. Writing 3.5 and 1.27 with their points in a column puts every digit under a digit of the same value.',
      'The 5 in 3.5 is 5 tenths, which is 50 hundredths. So 3.5 is 350 hundredths and 1.27 is 127 hundredths. Now it is a sum of whole numbers: 477 hundredths, which is 4.77.',
      'Adding 5 and 27 as if they were the same kind of thing (to get 1.62) is adding tenths to hundredths — like adding 5 metres to 27 centimetres and calling it 32. Lining up the point is what stops it.',
    ],
    alg: 'a + b = (a × 10ᵈ + b × 10ᵈ) ÷ 10ᵈ, d = the most decimal places',
    ex: { A: 35, da: 1, B: 127, db: 2, op: '+' },
    keys: ['.'], decimals: true,
    gen(r, lv = 1) {
      return fresh(() => {
        const op = lv === 1 ? '+' : pick(['+', '−'], r);
        const da = lv === 1 ? 1 : int(1, 2, r), db = lv === 1 ? 1 : int(1, 2, r);
        const hi = (d) => (lv === 3 ? 99 : 9) * P10(d) + P10(d) - 1;
        let A = tidy(P10(da) + 1, hi(da), r), B = tidy(P10(db) + 1, hi(db), r), a = [A, da], b = [B, db];
        if (op === '−' && A / P10(da) < B / P10(db)) [a, b] = [b, a];
        if (op === '−' && a[0] * P10(b[1]) === b[0] * P10(a[1])) a = [a[0] + 1 + (a[0] % 10 === 9 ? 1 : 0), a[1]];
        return this.q({ A: a[0], da: a[1], B: b[0], db: b[1], op });
      });
    },
    q({ A, da, B, db, op }) {
      const D = Math.max(da, db), a2 = A * P10(D - da), b2 = B * P10(D - db);
      const a = A / P10(da), b = B / P10(db);
      return { A, da, B, db, op, text: `${a} ${op} ${b}`, expr: `${a}${op === '+' ? '+' : '-'}${b}`, ans: (op === '+' ? a2 + b2 : a2 - b2) / P10(D) };
    },
    work({ A, da, B, db, op }) {
      const D = Math.max(da, db), unit = D === 1 ? 'tenths' : 'hundredths', a2 = A * P10(D - da), b2 = B * P10(D - db);
      const s = op === '+' ? a2 + b2 : a2 - b2;
      return [
        { t: `${A / P10(da)} in ${unit}`, v: a2 },
        { t: `${B / P10(db)} in ${unit}`, v: b2 },
        { t: `${op === '+' ? 'Add' : 'Take away'} the ${unit}`, v: s },
        { t: `Back to a decimal: ÷ ${P10(D)}`, v: s / P10(D) },
      ];
    },
    draw: ({ A, da, B, db }) => pv([A / P10(da), B / P10(db)]),
  },
  {
    id: 'round-decimals', world: 'dock', band: '8-10', title: 'Rounding decimals',
    hook: '12.68 m of rope — about how much, to one decimal place?',
    idea: 'Cut the number where you want to stop, then look at the very next digit: 5 or more rounds up.',
    why: [
      'Rounding asks which of two neighbours a number is nearer. To one decimal place, 12.68 sits between 12.6 and 12.7 on the number line.',
      'The digit just after where you stop tells you how far along the gap you are. An 8 means eight tenths of the way from 12.6 to 12.7 — much nearer 12.7. A digit under 5 means you are in the first half, so you stay.',
      'Exactly 5 is exactly halfway, and the rule everyone agrees on is to round it up — so a number never has to argue about which side it belongs to. Only the one next digit counts; the digits after it cannot pull you back over halfway.',
    ],
    alg: 'round x to d places: look at digit d + 1; ≥ 5 → up, < 5 → stay',
    ex: { N: 1268, dp: 2, to: 1 },
    keys: ['.'], decimals: true,
    gen(r, lv = 1) {
      return fresh(() => {
        const dp = lv, to = lv === 1 ? 0 : int(0, dp - 1, r);
        return this.q({ N: tidy(P10(dp), (lv === 3 ? 99 : 29) * P10(dp) + P10(dp) - 1, r), dp, to });
      });
    },
    q({ N, dp, to }) {
      const s = P10(dp - to), x = N / P10(dp);
      const where = to === 0 ? 'the nearest whole number' : `${to} decimal place${to > 1 ? 's' : ''}`;
      return { N, dp, to, text: `Round ${x} to ${where}`,
        expr: `(${N}-${N}%${s}+(${N}%${s}>=${s / 2}?${s}:0))/${P10(dp)}`, ans: Math.round(N / s) / P10(to) };
    },
    work({ N, dp, to }) {
      const s = P10(dp - to), low = Math.floor(N / s) / P10(to), dec = Math.floor((N % s) / (s / 10));
      return [
        { t: `Cut it off after ${to === 0 ? 'the ones' : `${to} decimal place${to > 1 ? 's' : ''}`}`, v: low },
        { t: 'The very next digit', v: dec },
        { t: '5 or more goes up; 4 or less stays', v: Math.round(N / s) / P10(to) },
      ];
    },
    draw: ({ N, dp, to }) => { const s = P10(dp - to), lo = Math.floor(N / s) / P10(to); return between(lo, (Math.floor(N / s) + 1) / P10(to), N / P10(dp), String(N / P10(dp))); },
  },
  {
    id: 'fraction-decimal-percent', world: 'dock', band: '8-10', title: 'Fractions, decimals, per cents',
    hook: '3/4, 0.75 and 75% — are those three different numbers?',
    idea: 'Turn the fraction into hundredths. Hundredths ARE the decimal places, and "per cent" means hundredths.',
    why: [
      'Per cent means "out of a hundred" (cent is the old word for hundred, as in century). So 75% is just another way to write 75/100.',
      'And 75 hundredths as a decimal is 0.75 — the second place after the point is the hundredths place. So all three are one number wearing different clothes: 3/4 = 75/100 = 0.75 = 75%.',
      'To get from a fraction to hundredths, use equivalent fractions: 3/4 = 75/100 because 4 × 25 = 100, so 3 × 25 = 75. Some fractions need thousandths instead: 3/8 = 375/1000 = 0.375.',
    ],
    alg: 'a/b = (a × 100/b)/100 = (a × 100/b)% ',
    ex: { kind: 'f2d', a: 3, b: 4 },
    keys: ['.', '/'], decimals: true,
    gen(r, lv = 1) {
      return fresh(() => {
        const kind = lv === 1 ? pick(['f2d', 'd2p'], r) : pick(['f2d', 'd2p', 'p2f', 'f2p'], r);
        if (kind === 'd2p') return this.q({ kind, h: lv === 3 ? int(101, 250, r) : lv === 2 ? int(1, 99, r) : int(1, 9, r) * 10 + int(0, 9, r) });
        if (kind === 'p2f') { let p; do p = int(1, lv === 3 ? 39 : 19, r) * 5; while (p % 100 === 0); return this.q({ kind, p }); }
        const b = pick(lv === 1 ? [2, 4, 5, 10] : lv === 2 ? [2, 4, 5, 10, 20, 25] : [4, 5, 8, 20, 25, 8], r);
        return this.q({ kind, a: int(1, b - 1, r), b });
      });
    },
    q(a) {
      const { kind } = a;
      if (kind === 'd2p') { const x = a.h / 100; return { ...a, text: `${x} as a percentage`, expr: `${x}*100`, ans: a.h }; }
      if (kind === 'p2f') { const g = gcd(a.p, 100); return { ...a, frac: true, text: `${a.p}% as a fraction`, expr: `${a.p}/100`, ans: F(a.p / g, 100 / g) }; }
      const base = 100 % a.b === 0 ? 100 : 1000, top = (a.a * base) / a.b;
      if (kind === 'f2p') return { ...a, text: `${a.a}/${a.b} as a percentage`, expr: `${a.a}/${a.b}*100`, ans: (top * 100) / base };
      return { ...a, text: `${a.a}/${a.b} as a decimal`, expr: `${a.a}/${a.b}`, ans: top / base };
    },
    work(q) {
      if (q.kind === 'd2p') return [{ t: `${q.h / 100} is how many hundredths?`, v: q.h }, { t: 'Per cent means hundredths', v: q.h }];
      if (q.kind === 'p2f') { const g = gcd(q.p, 100); return [{ t: `${q.p}% = ?/100`, v: q.p }, { t: `Divide top and bottom by`, v: g }, { t: 'The fraction', v: F(q.p / g, 100 / g) }]; }
      const base = 100 % q.b === 0 ? 100 : 1000, top = (q.a * base) / q.b, name = base === 100 ? 'hundredths' : 'thousandths';
      if (q.kind === 'f2p') return [{ t: `${q.a}/${q.b} = ?/${base}`, v: top }, { t: base === 100 ? 'Hundredths are per cent' : `÷ 10 for per cent`, v: (top * 100) / base }];
      return [{ t: `${q.a}/${q.b} = ?/${base}`, v: top }, { t: `${name} as a decimal`, v: top / base }];
    },
    draw: (q) => (q.kind === 'p2f' ? hundred(q.p) : q.kind === 'd2p' ? between(Math.floor(q.h / 100), Math.floor(q.h / 100) + 1, q.h / 100, String(q.h / 100)) : fracBar(q.b, q.a)),
  },
  {
    id: 'percent-of-amount', world: 'dock', band: '8-10', title: 'Percentages of an amount',
    hook: '35% of 60 — no calculator on the dock.',
    idea: 'Find 10% by dividing by 10. Build everything else from 10% and its half, 5%.',
    why: [
      '10% means 10 out of every 100 — one tenth. So 10% of anything is that thing divided by 10: 10% of 60 is 6.',
      'Other percentages are made of tens. 30% is three lots of 10%: 18. And 5% is half of 10%: 3. So 35% of 60 is 18 + 3 = 21.',
      'The hundred square shows it: each column is 10%, so you can see 35% as three columns and half a column. You never need to know a rule for 35% — only for 10%, and how to double, halve and add.',
    ],
    alg: 'p% of n = (n ÷ 10) × (p ÷ 10)',
    ex: { p: 35, n: 60 },
    keys: ['.'], decimals: true,
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) return this.q({ p: pick([10, 20, 30, 50], r), n: int(2, 30, r) * 10 });
        if (lv === 2) return this.q({ p: int(1, 19, r) * 5, n: int(1, 20, r) * 20 });
        return this.q({ p: int(1, 19, r) * 5, n: int(2, 99, r) * 10 });
      });
    },
    q({ p, n }) { return { p, n, text: `${p}% of ${n}`, say: `${p} percent of ${n}`, expr: `${n}/100*${p}`, ans: (p * n) / 100 }; },
    work({ p, n }) {
      const tens = Math.floor(p / 10), five = p % 10 === 5, s = [];
      if (p === 10) return [{ t: 'How many tenths make the whole?', v: 10 }, { t: `10% of ${n}: ${n} ÷ 10`, v: n / 10 }];
      s.push({ t: `10% of ${n}: ${n} ÷ 10`, v: n / 10 });
      if (tens > 1) s.push({ t: `${tens * 10}%: ${tens} lots of 10%`, v: (tens * n) / 10 });
      if (five) s.push({ t: '5%: half of 10%', v: n / 20 });
      if (five && tens > 0) s.push({ t: 'Add them', v: (p * n) / 100 });
      return s;
    },
    draw: ({ p }) => hundred(p),
  },
  {
    id: 'unitary-method', world: 'dock', band: '8-10', title: 'Find one, then scale',
    hook: '4 pancakes need 200 g of flour. How much for 6?',
    idea: 'Work out the amount for ONE, then multiply up to as many as you need.',
    why: [
      'A recipe is a ratio: the flour grows exactly as the number of pancakes grows. But 4 and 6 are awkward to jump between — 6 is not a whole number of 4s.',
      'One is the easy stop in the middle. 200 g for 4 pancakes means 200 ÷ 4 = 50 g for one pancake. Then 6 pancakes need 6 × 50 = 300 g.',
      'It works for anything that goes up in step — prices, paint, petrol — which is why it is called the unitary method: go to one unit, then out again. Sometimes one unit is a decimal, like 2.5 g, and the method still holds.',
    ],
    alg: 'amount for m = (amount for n ÷ n) × m',
    ex: { n: 4, per2: 100, m: 6, thing: 0 },
    keys: ['.'], decimals: true,
    RECIPES: [['pancakes', 'g of flour'], ['cupcakes', 'g of sugar'], ['rotis', 'g of atta'], ['glasses of lassi', 'ml of yoghurt'], ['bowls of soup', 'ml of stock'], ['scones', 'g of butter']],
    gen(r, lv = 1) {
      return fresh(() => {
        const thing = int(0, this.RECIPES.length - 1, r);
        let n, m, per2;
        if (lv === 1) { n = int(2, 5, r); per2 = int(2, 10, r) * 10; m = int(2, 10, r); }
        else if (lv === 2) { n = int(3, 8, r); per2 = int(6, 40, r) * 2; m = int(2, 12, r); }
        else { n = int(1, 5, r) * 2; per2 = int(1, 20, r) * 2 + 1; m = int(3, 15, r); }
        if (m === n) m++;
        return this.q({ n, per2, m, thing });
      });
    },
    q({ n, per2, m, thing }) {
      const [what, unit] = this.RECIPES[thing], amount = (per2 * n) / 2;
      return { n, per2, m, thing, text: `${n} ${what} need ${amount} ${unit}. How much for ${m}?`, expr: `${amount}/${n}*${m}`, ans: (per2 * m) / 2 };
    },
    work({ n, per2, m, thing }) {
      const amount = (per2 * n) / 2;
      return [{ t: `For 1: ${amount} ÷ ${n}`, v: per2 / 2 }, { t: `For ${m}: × ${m}`, v: (per2 * m) / 2 }];
    },
    draw: ({ n }) => fracBar(n, 1),
  },
  {
    id: 'percent-change', world: 'dock', band: '11-14', title: 'Sales and rises',
    hook: 'A 60-coin jacket has 20% off. What do you pay?',
    idea: 'Find the percentage, then take it off or add it on — or go straight to what is left (80% of the price).',
    why: [
      '20% off means you do not pay 20 of every 100. So work out 20% of 60 — 12 — and take it away: 48.',
      'Or think about what you DO pay. If 20% is taken off, 80% is left, and 80% of 60 is 48. One step instead of two, and the same answer, because 60 − 20% of 60 is 80% of 60.',
      'Increases work the same way upwards: 15% more than 80 is 115% of 80, which is 92. Shops, wages and prices all move by per cents, and this is how to see where they land.',
    ],
    alg: 'n with p% off = n × (100 − p)/100; n with p% added = n × (100 + p)/100',
    ex: { n: 60, p: 20, dir: 'off' },
    keys: ['.'], decimals: true,
    gen(r, lv = 1) {
      return fresh(() => {
        const dir = lv === 1 ? 'off' : pick(['off', 'up'], r);
        const p = lv === 1 ? pick([10, 20, 25, 50], r) : lv === 2 ? int(1, 10, r) * 5 : int(1, dir === 'off' ? 18 : 12, r) * 5;
        return this.q({ n: int(1, lv === 1 ? 10 : 25, r) * 20, p, dir, lv });
      });
    },
    q({ n, p, dir, lv = 1 }) {
      const off = dir === 'off';
      return { n, p, dir, lv, text: off ? `${n} with ${p}% off` : `${n} with ${p}% added`, say: off ? `${n} with ${p} percent off` : `${n} with ${p} percent added`,
        expr: `${n}*(1${off ? '-' : '+'}${p}/100)`, ans: (n * (off ? 100 - p : 100 + p)) / 100 };
    },
    work({ n, p, dir, lv = 1 }) {
      const off = dir === 'off', ans = (n * (off ? 100 - p : 100 + p)) / 100;
      if (lv === 3) return [{ t: off ? `Per cent you pay: 100 − ${p}` : `New per cent: 100 + ${p}`, v: off ? 100 - p : 100 + p }, { t: `${off ? 100 - p : 100 + p}% of ${n}`, v: ans }];
      return [{ t: `${p}% of ${n}`, v: (p * n) / 100 }, { t: off ? 'Take it off' : 'Add it on', v: ans }];
    },
    draw: ({ p }) => fracBar(20, p / 5),
  },
  {
    id: 'ratio-share', world: 'dock', band: '11-14', title: 'Ratio: simplify and share',
    hook: 'Share 35 mangoes in the ratio 2 : 5. How many for each?',
    idea: 'Add the parts to find how many equal shares there are. Find one share, then multiply.',
    why: [
      'A ratio 2 : 5 says: for every 2 the first person gets, the second gets 5. Picture handing them out in rounds — each round uses 2 + 5 = 7 mangoes.',
      '35 mangoes is 35 ÷ 7 = 5 rounds. So the first person gets 2 × 5 = 10 and the second gets 5 × 5 = 25. Check: 10 + 25 = 35, none left over.',
      'Simplifying a ratio is dividing both sides by the same number, just like a fraction: 12 : 18 is 2 : 3, because every 6 in the first matches every 6 in the second. The mix is the same; the numbers are smaller.',
    ],
    alg: 'n shared in a : b → n ÷ (a + b) × a and n ÷ (a + b) × b',
    ex: { kind: 'share', a: 2, b: 5, n: 35, big: true },
    gen(r, lv = 1) {
      return fresh(() => {
        let a, b; do { a = int(1, lv === 1 ? 3 : lv === 2 ? 5 : 9, r); b = int(1, lv === 1 ? 4 : lv === 2 ? 7 : 11, r); } while (a === b || gcd(a, b) !== 1);
        if (lv > 1 && r() < 0.4) { const g = int(2, Math.max(2, Math.min(12, Math.floor(60 / (a + b)))), r); return this.q({ kind: 'simplify', a, b, g }); }
        return this.q({ kind: 'share', a, b, n: (a + b) * int(2, lv === 3 ? 25 : 10, r), big: lv === 1 || r() < 0.5 });
      });
    },
    q(q) {
      const { kind, a, b } = q;
      if (kind === 'simplify') return { ...q, text: `${a * q.g} : ${b * q.g} in simplest form is ${a} : ?`, expr: `${b * q.g}*${a}/${a * q.g}`, ans: b };
      const part = q.big ? Math.max(a, b) : Math.min(a, b);
      return { ...q, text: `Share ${q.n} in the ratio ${a} : ${b}. How much is the ${q.big ? 'larger' : 'smaller'} share?`, expr: `${q.n}*${part}/(${a}+${b})`, ans: (q.n / (a + b)) * part };
    },
    work(q) {
      const { kind, a, b } = q;
      if (kind === 'simplify') return [{ t: `${a * q.g} ÷ what makes ${a}?`, v: q.g }, { t: `Same to the other side: ${b * q.g} ÷ ${q.g}`, v: b }];
      const part = q.big ? Math.max(a, b) : Math.min(a, b);
      return [
        { t: `Parts in one round: ${a} + ${b}`, v: a + b },
        { t: `One part: ${q.n} ÷ ${a + b}`, v: q.n / (a + b) },
        { t: `The ${q.big ? 'larger' : 'smaller'} share: × ${part}`, v: (q.n / (a + b)) * part },
      ];
    },
    draw: (q) => (q.kind === 'share' ? fracBar(q.a + q.b, q.a) : fracBar((q.a + q.b) * Math.min(q.g, 4), q.a * Math.min(q.g, 4))),
  },
  {
    id: 'speed-distance-time', world: 'dock', band: '11-14', title: 'Speed, distance and time',
    hook: 'The ferry goes 240 km at 80 km/h. How long does the trip take?',
    idea: 'Speed is the distance in ONE hour. Distance = speed × time; to find either of the others, divide.',
    why: [
      '80 km/h means 80 kilometres in every hour. After 2 hours, 160 km; after 3 hours, 240 km. Distance is just the one-hour distance, taken as many times as there are hours.',
      'So the other two questions are division. How long for 240 km? How many 80s make 240 — 3 hours. How fast, if 240 km took 3 hours? Share 240 between 3 hours — 80 each hour.',
      'Minutes are pieces of an hour. 20 minutes is a third of an hour, so at 30 km/h you go a third of 30: 10 km. Change the time into hours (or pieces of one) before you multiply.',
    ],
    alg: 'd = s × t,  s = d ÷ t,  t = d ÷ s',
    ex: { kind: 't', s: 80, t: 3 },
    gen(r, lv = 1) {
      return fresh(() => {
        const kind = lv === 1 ? pick(['d', 's'], r) : lv === 2 ? pick(['d', 's', 't'], r) : pick(['s', 't', 'min'], r);
        if (kind === 'min') { const mins = pick([6, 10, 12, 15, 20, 30], r); return this.q({ kind, mins, s: (60 / mins) * int(1, 12, r) }); }
        return this.q({ kind, s: int(lv === 1 ? 2 : 3, lv === 1 ? 10 : 20, r) * (lv === 1 ? 5 : 10), t: int(2, lv === 1 ? 5 : 9, r) });
      });
    },
    q(q) {
      const { kind, s, t } = q, d = s * t;
      if (kind === 'min') return { ...q, text: `${s} km/h for ${q.mins} minutes. How far, in km?`, expr: `${s}*${q.mins}/60`, ans: (s * q.mins) / 60 };
      if (kind === 's') return { ...q, text: `${d} km in ${t} hours. What speed, in km/h?`, expr: `${d}/${t}`, ans: s };
      if (kind === 't') return { ...q, text: `${d} km at ${s} km/h. How many hours?`, expr: `${d}/${s}`, ans: t };
      return { ...q, text: `${s} km/h for ${t} hours. How far, in km?`, expr: `${t}*${s}`, ans: d };
    },
    work(q) {
      const { kind, s, t } = q, d = s * t;
      if (kind === 'min') return [{ t: `How many ${q.mins}-minute pieces make an hour?`, v: 60 / q.mins }, { t: `Km in ${q.mins} minutes: ${s} ÷ ${60 / q.mins}`, v: (s * q.mins) / 60 }];
      if (kind === 's') return [{ t: 'Hours taken', v: t }, { t: `Km in one hour: ${d} ÷ ${t}`, v: s }];
      if (kind === 't') return [{ t: 'Km in one hour', v: s }, { t: `How many ${s}s make ${d}?`, v: t }];
      return [{ t: 'Km in one hour', v: s }, { t: `In ${t} hours: × ${t}`, v: d }];
    },
  },
];

export const STORIES = {
  'decimal-places': { title: 'The ribbon stall', scene: 'market', cast: ['beaker', 'pixel'], beats: [
    { who: null, say: 'At the market, Pip buys 3.47 metres of blue ribbon for a kite tail.', add: { t: '3.47' } },
    { who: 'pixel', say: 'The 7 is the biggest digit after the point, so it must be worth the most.' },
    { who: 'beaker', say: 'Take it apart. Before the point: 3 whole metres.', add: { t: '3', v: 3 } },
    { who: 'beaker', say: 'First place after the point is tenths: 4 tenths of a metre.', add: { t: '4 ÷ 10', v: 0.4 } },
    { who: 'beaker', say: 'Second place is hundredths. The 7 is only 7 hundredths — a few centimetres.', add: { t: '7 ÷ 100', v: 0.07 } },
    { who: 'pixel', say: 'So the place matters more than the digit. 347 hundredths of a metre in all.', add: { t: '347 ÷ 100', v: 3.47 } },
  ] },
  'times-ten-decimals': { title: 'A hundred tickets', scene: 'harbour', cast: ['samurai', 'comet'], beats: [
    { who: null, say: 'A ferry ticket costs 2.35 coins. The school needs 100 tickets.', add: { t: '2.35 × 100' } },
    { who: 'comet', say: 'Put two zeros on the end! 2.3500.' },
    { who: 'samurai', say: 'That does not change anything — 2.3500 is still 2.35. Zeros after the point add nothing.' },
    { who: 'samurai', say: 'Times 100 makes every digit worth a hundred times more. Slide them two places left.' },
    { who: 'comet', say: 'The 2 goes to the hundreds, 3 to the tens, 5 to the ones: 235.', add: { t: '2.35 × 100', v: 235 } },
    { who: 'samurai', say: 'And back again: slide them two places right.', add: { t: '235 ÷ 100', v: 2.35 } },
  ] },
  'add-decimals': { title: 'Two bags of shopping', scene: 'shop', cast: ['scopey', 'koi'], beats: [
    { who: null, say: 'Nova buys bread for 3.5 coins and cheese for 1.27 coins.', add: { t: '3.5 + 1.27' } },
    { who: 'koi', say: 'Five and twenty-seven is thirty-two… so 1.62?' },
    { who: 'scopey', say: 'That cannot be right — the bread alone is more than 3. Line up the points.' },
    { who: 'scopey', say: 'In hundredths, 3.5 is 350 and 1.27 is 127.', add: { t: '350 + 127', v: 477 } },
    { who: 'koi', say: '477 hundredths. Back to coins…', add: { t: '477 ÷ 100', v: 4.77 } },
    { who: 'scopey', say: '4.77 coins. Tenths under tenths, every time.', add: { t: '3.5 + 1.27', v: 4.77 } },
  ] },
  'round-decimals': { title: 'The longest fish', scene: 'beach', cast: ['panda', 'comet'], beats: [
    { who: null, say: 'On the beach, Dax measures a piece of driftwood: 12.68 metres of rope would go round it.', add: { t: '12.68' } },
    { who: 'comet', say: 'Nobody wants two decimal places. What is it to one?' },
    { who: 'panda', say: 'Cut it after the first decimal place. That gives 12.6.', add: { t: '12.6', v: 12.6 } },
    { who: 'panda', say: 'Now the very next digit decides. It is 8 — well past halfway to 12.7.' },
    { who: 'comet', say: 'Five or more goes up. So about 12.7 metres.', add: { t: '12.6 + 0.1', v: 12.7 } },
    { who: 'panda', say: 'And to the nearest whole metre, the 6 decides: 13.', add: { t: '12 + 1', v: 13 } },
  ] },
  'fraction-decimal-percent': { title: 'Three signs, one discount', scene: 'shop', cast: ['melody', 'pixel'], beats: [
    { who: null, say: 'Three shops on the high street. One sign says 3/4 of the price. One says 0.75 of the price. One says 75%.' },
    { who: 'pixel', say: 'Which is the best deal?' },
    { who: 'melody', say: 'Turn 3/4 into hundredths. 4 goes into 100 this many times…', add: { t: '100 ÷ 4', v: 25 } },
    { who: 'melody', say: '…so 3 quarters is 75 hundredths.', add: { t: '3 × 25', v: 75 } },
    { who: 'pixel', say: '75 hundredths is 0.75. And per cent means hundredths, so it is 75%!', add: { t: '75 ÷ 100', v: 0.75 } },
    { who: 'melody', say: 'Three signs, one number. Pick the shop with the nicest cake.', add: { t: '3/4', v: 0.75 } },
  ] },
  'percent-of-amount': { title: 'The harbour tax', scene: 'harbour', cast: ['melody', 'beaker'], beats: [
    { who: null, say: 'The fishing boat brought in 60 kg of fish. 35% goes to the market in town.', add: { t: '35% of 60' } },
    { who: 'beaker', say: 'Thirty-five per cent. I only know how to do ten.' },
    { who: 'melody', say: 'Then start there. 10% is a tenth.', add: { t: '60 ÷ 10', v: 6 } },
    { who: 'beaker', say: '30% is three of those.', add: { t: '6 × 3', v: 18 } },
    { who: 'melody', say: '5% is half of 10%.', add: { t: '6 ÷ 2', v: 3 } },
    { who: 'beaker', say: 'Add them up: 21 kg to the market.', add: { t: '35% of 60', v: 21 } },
  ] },
  'unitary-method': { title: 'Pancakes for six', scene: 'kitchen', cast: ['koi', 'panda'], beats: [
    { who: null, say: 'The recipe makes 4 pancakes with 200 g of flour. Six people are coming for breakfast.', add: { t: '200' } },
    { who: 'koi', say: 'Four to six is not a doubling. How do I scale it?' },
    { who: 'panda', say: 'Go to one pancake first.', add: { t: '200 ÷ 4', v: 50 } },
    { who: 'koi', say: '50 g for each pancake. Then six of them…', add: { t: '50 × 6', v: 300 } },
    { who: 'panda', say: 'Find one, then scale. It works for the eggs and the milk too.' },
    { who: 'koi', say: '300 g of flour for six pancakes.', add: { t: '200 ÷ 4 × 6', v: 300 } },
  ] },
  'percent-change': { title: 'The jacket sale', scene: 'shop', cast: ['melody', 'comet'], beats: [
    { who: null, say: 'A jacket costs 60 coins. The sign says 20% off.', add: { t: '20% of 60' } },
    { who: 'comet', say: 'Twenty off — so 40 coins!' },
    { who: 'melody', say: 'Twenty PER CENT, not twenty coins. 20% of 60 is…', add: { t: '20% of 60', v: 12 } },
    { who: 'comet', say: 'Twelve off. So I pay…', add: { t: '60 − 12', v: 48 } },
    { who: 'melody', say: 'Or skip a step: if 20% is taken off, you pay 80%.', add: { t: '80% of 60', v: 48 } },
    { who: 'comet', say: '48 coins, both ways.' },
  ] },
  'ratio-share': { title: 'The mango crate', scene: 'market', cast: ['beaker', 'panda'], beats: [
    { who: null, say: 'Suki and Rafi fill a crate with 35 mangoes. Rafi picked 2 for every 5 Suki picked, so they share it 2 : 5.', add: { t: '35' } },
    { who: 'beaker', say: 'Hand them out in rounds: 2 for me, 5 for you. Each round uses…', add: { t: '2 + 5', v: 7 } },
    { who: 'panda', say: 'How many rounds in 35?', add: { t: '35 ÷ 7', v: 5 } },
    { who: 'beaker', say: 'Five rounds of 2 for me.', add: { t: '5 × 2', v: 10 } },
    { who: 'panda', say: 'Five rounds of 5 for me.', add: { t: '5 × 5', v: 25 } },
    { who: 'beaker', say: 'And 10 + 25 is all 35. Nothing left in the crate.', add: { t: '10 + 25', v: 35 } },
  ] },
  'speed-distance-time': { title: 'The coast train', scene: 'train', cast: ['astro', 'scopey'], beats: [
    { who: null, say: 'Mira and Theo take the train to the coast: 240 km, and the train runs at 80 km/h.', add: { t: '240 ÷ 80' } },
    { who: 'scopey', say: 'How long will it take? We have to catch the ferry.' },
    { who: 'astro', say: '80 km/h means 80 km in every hour. One hour, two hours…', add: { t: '80 × 2', v: 160 } },
    { who: 'astro', say: 'Three hours gets us all the way.', add: { t: '80 × 3', v: 240 } },
    { who: 'scopey', say: 'So time is distance divided by speed.', add: { t: '240 ÷ 80', v: 3 } },
    { who: 'astro', say: 'Three hours. Time for a sandwich.' },
  ] },
};
