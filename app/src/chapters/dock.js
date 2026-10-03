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
    caseKey: 'kind',
    cases: [
      { label: 'What a digit is worth', note: 'Count the places after the point: one place is tenths, two is hundredths. A 7 two places along is only 7 hundredths.',
        ex: { kind: 'value', N: 347, dp: 2, pos: 2 } },
      { label: 'Build the number', note: 'Now the other way: ones before the point, then each place after it in turn — tenths first, then hundredths.',
        ex: { kind: 'build', o: 3, ds: [4, 7] } },
    ],
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
          { t: 'The ones go before the point', v: q.o, x: `Math.floor(${q.o}${q.ds.map((d, i) => `+${d}/${P10(i + 1)}`).join('')})` },
          ...q.ds.map((d, i) => ({ t: `${d} ${names[i]} — place ${i + 1} after the point`, v: d / P10(i + 1), x: `${d}*Math.pow(10,-${i + 1})` })),
          { t: 'Put them together', v: q.ans },
        ];
      }
      const d = Math.floor(q.N / P10(q.dp - q.pos)) % 10;
      return [{ t: `How many places after the point is the ${d}?`, v: q.pos, x: `(${q.N}/${P10(q.dp)}).toFixed(${q.dp}).split('.')[1].indexOf('${d}')+1` }, { t: `So it is worth`, v: q.ans }];
    },
    draw: (q) => (q.kind === 'build' ? between(q.o, q.o + 1, q.o + 0.5, '?') : pv([q.N / P10(q.dp)])),
  },
  {
    id: 'times-ten-decimals', world: 'dock', band: '8-10', title: '× and ÷ by 10, 100, 1000',
    hook: '3.47 × 100 — where does the point go?',
    idea: 'The point stays still; the digits move one place for every zero — left to multiply, right to divide.',
    why: [
      'Times 10 makes every digit worth ten times more, and "ten times more" is exactly one place to the left. So every digit slides one place left: 3.47 × 10 = 34.7.',
      '× 100 is × 10 twice, so the digits slide two places: 347. If the digits run out, zeros hold the empty places: 5.2 × 1000 = 5200. Dividing is the same slide the other way — 52 ÷ 1000 slides three places right, to 0.052, with zeros holding the empty places.',
      'People say "move the point", and on paper it looks the same. But it is really the digits that move: the point always sits just after the ones, and it is the ones that change.',
    ],
    alg: 'x × 10ᵏ shifts every digit k places left; x ÷ 10ᵏ shifts them k places right',
    ex: { N: 347, dp: 2, k: 2, op: '×' },
    caseKey: 'move',
    cases: [
      { label: 'Multiplying', note: 'Times makes every digit worth more, so they all slide left — one place for every zero.',
        ex: { N: 347, dp: 2, k: 2, op: '×' } },
      { label: 'Multiplying past the digits', note: 'When the digits slide further left than there are decimal places, zeros fill the empty places before the point.',
        ex: { N: 52, dp: 1, k: 3, op: '×' } },
      { label: 'Dividing', note: 'Divide makes every digit worth less, so they slide right — and zeros hold the empty places just after the point.',
        ex: { N: 52, dp: 0, k: 3, op: '÷' } },
    ],
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
      return { N, dp, k, op, move: op === '÷' ? '÷' : k > dp ? '× past' : '×', text: `${x} ${op} ${p}`, expr: `${x}${op === '×' ? '*' : '/'}${p}`, ans };
    },
    work(q) {
      return [
        { t: `How many zeros in ${P10(q.k)}?`, v: q.k, x: `String(${P10(q.k)}).length-1` },
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
      'The 5 in 3.5 is 5 tenths, which is 50 hundredths. So 3.5 is 350 hundredths and 1.27 is 127 hundredths. Now it is a sum of whole numbers: 477 hundredths, which is 4.77. Taking away works the same way: 5.2 − 1.45 is 520 − 145 = 375 hundredths, 3.75. The empty place in 5.2 is a zero, not a gap to skip.',
      'Adding 5 and 27 as if they were the same kind of thing (to get 1.62) is adding tenths to hundredths — like adding 5 metres to 27 centimetres and calling it 32. Lining up the point is what stops it.',
    ],
    alg: 'a + b = (a × 10ᵈ + b × 10ᵈ) ÷ 10ᵈ, d = the most decimal places',
    ex: { A: 35, da: 1, B: 127, db: 2, op: '+' },
    caseKey: ['op', 'places'],
    cases: [
      { label: 'Add, same places', note: 'Both have tenths only, so the points already line up. Add the tenths as whole numbers, then put the point back.',
        ex: { A: 24, da: 1, B: 18, db: 1, op: '+' } },
      { label: 'Add, different places', note: 'One number has hundredths and the other does not. Turn both into hundredths first, so tenths add to tenths.',
        ex: { A: 35, da: 1, B: 127, db: 2, op: '+' } },
      { label: 'Take away, same places', note: 'Line up the points and take tenths from tenths, just like whole numbers.',
        ex: { A: 52, da: 1, B: 37, db: 1, op: '−' } },
      { label: 'Take away, different places', note: 'The shorter number gets a zero in its empty place — 5.2 is 520 hundredths — then take away as whole numbers.',
        ex: { A: 52, da: 1, B: 145, db: 2, op: '−' } },
    ],
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
      return { A, da, B, db, op, places: da === db ? 'same' : 'different', text: `${a} ${op} ${b}`, expr: `${a}${op === '+' ? '+' : '-'}${b}`, ans: (op === '+' ? a2 + b2 : a2 - b2) / P10(D) };
    },
    work({ A, da, B, db, op }) {
      const D = Math.max(da, db), unit = D === 1 ? 'tenths' : 'hundredths', a2 = A * P10(D - da), b2 = B * P10(D - db);
      const s = op === '+' ? a2 + b2 : a2 - b2;
      return [
        { t: `${A / P10(da)} in ${unit}`, v: a2, x: `Math.round(${A / P10(da)}*${P10(D)})` },
        { t: `${B / P10(db)} in ${unit}`, v: b2, x: `Math.round(${B / P10(db)}*${P10(D)})` },
        { t: `${op === '+' ? 'Add' : 'Take away'} the ${unit}`, v: s, x: `Math.round((${A / P10(da)}${op === '+' ? '+' : '-'}${B / P10(db)})*${P10(D)})` },
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
    caseKey: ['place', 'dir'],
    cases: [
      { label: 'To a whole number: stay', note: 'Cut it off after the ones. The next digit is under 5, so the number is in the first half of the gap — it stays.',
        ex: { N: 73, dp: 1, to: 0 } },
      { label: 'To a whole number: up', note: 'The next digit is 5 — exactly halfway — and halfway always rounds up.',
        ex: { N: 65, dp: 1, to: 0 } },
      { label: 'To decimal places: up', note: 'Cut it off after the places you want. An 8 next means you are most of the way to the next one up.',
        ex: { N: 1268, dp: 2, to: 1 } },
      { label: 'To decimal places: stay', note: 'The next digit is under 5, so you stay — and the digits after it cannot pull you over halfway.',
        ex: { N: 4329, dp: 3, to: 1 } },
    ],
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
      const dec = Math.floor((N % s) / (s / 10));
      return { N, dp, to, place: to === 0 ? 'whole' : 'decimal', dir: dec >= 5 ? 'up' : 'stay', text: `Round ${x} to ${where}`,
        expr: `(${N}-${N}%${s}+(${N}%${s}>=${s / 2}?${s}:0))/${P10(dp)}`, ans: Math.round(N / s) / P10(to) };
    },
    work({ N, dp, to }) {
      const s = P10(dp - to), low = Math.floor(N / s) / P10(to), dec = Math.floor((N % s) / (s / 10));
      return [
        { t: `Cut it off after ${to === 0 ? 'the ones' : `${to} decimal place${to > 1 ? 's' : ''}`}`, v: low, x: `Number((${N / P10(dp)}).toFixed(${dp}).slice(0,${to === 0 ? -(dp + 1) : -(dp - to)}))` },
        { t: 'The very next digit', v: dec, x: `Number((${N / P10(dp)}).toFixed(${dp}).split('.')[1][${to}])` },
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
    caseKey: ['kind', 'per'],
    cases: [
      { label: 'Fraction to decimal', note: 'Make the bottom 100 with an equivalent fraction. The hundredths are the two places after the point.',
        ex: { kind: 'f2d', a: 3, b: 4 } },
      { label: 'Decimal to percentage', note: 'Read the decimal as hundredths — and per cent means hundredths, so that is the percentage.',
        ex: { kind: 'd2p', h: 36 } },
      { label: 'Percentage to fraction', note: 'Write it over 100, then simplify by dividing top and bottom by the same number.',
        ex: { kind: 'p2f', p: 35 } },
      { label: 'Fraction to percentage', note: 'Make the bottom 100, and the top IS the percentage.',
        ex: { kind: 'f2p', a: 2, b: 5 } },
      { label: 'Decimal via thousandths', note: 'Eighths do not go into 100, but they do go into 1000. Thousandths are three places after the point.',
        ex: { kind: 'f2d', a: 3, b: 8 } },
      { label: 'Percentage via thousandths', note: 'Make the bottom 1000, then divide by 10 to get hundredths — per cent can have a decimal too.',
        ex: { kind: 'f2p', a: 3, b: 8 } },
    ],
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
      if (kind === 'd2p') { const x = a.h / 100; return { ...a, per: 'hundredths', text: `${x} as a percentage`, expr: `${x}*100`, ans: a.h }; }
      if (kind === 'p2f') { const g = gcd(a.p, 100); return { ...a, per: 'hundredths', frac: true, text: `${a.p}% as a fraction`, expr: `${a.p}/100`, ans: F(a.p / g, 100 / g) }; }
      const base = 100 % a.b === 0 ? 100 : 1000, top = (a.a * base) / a.b;
      const per = base === 100 ? 'hundredths' : 'thousandths';
      if (kind === 'f2p') return { ...a, per, text: `${a.a}/${a.b} as a percentage`, expr: `${a.a}/${a.b}*100`, ans: (top * 100) / base };
      return { ...a, per, text: `${a.a}/${a.b} as a decimal`, expr: `${a.a}/${a.b}`, ans: top / base };
    },
    work(q) {
      if (q.kind === 'd2p') return [{ t: `${q.h / 100} is how many hundredths?`, v: q.h, x: `Math.round(${q.h / 100}*100)` }, { t: 'Per cent means hundredths', v: q.h }];
      if (q.kind === 'p2f') { const g = gcd(q.p, 100); return [{ t: `${q.p}% = ?/100`, v: q.p, x: `${q.p}/100*100` }, { t: `Divide top and bottom by`, v: g, x: `[...Array(101).keys()].filter((d) => d && ${q.p}%d===0 && 100%d===0).pop()` }, { t: 'The fraction', v: F(q.p / g, 100 / g) }]; }
      const base = 100 % q.b === 0 ? 100 : 1000, top = (q.a * base) / q.b, name = base === 100 ? 'hundredths' : 'thousandths';
      if (q.kind === 'f2p') return [{ t: `${q.a}/${q.b} = ?/${base}`, v: top, x: `${q.a}*${base}/${q.b}` }, { t: base === 100 ? 'Hundredths are per cent' : `÷ 10 for per cent`, v: (top * 100) / base }];
      return [{ t: `${q.a}/${q.b} = ?/${base}`, v: top, x: `${q.a}*${base}/${q.b}` }, { t: `${name} as a decimal`, v: top / base }];
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
    caseKey: 'build',
    cases: [
      { label: 'Just 10%', note: '10% is one tenth, so divide by 10. Every other percentage here is built from this one.',
        ex: { p: 10, n: 60 } },
      { label: 'Lots of 10%', note: '30% is three lots of 10%: find 10% first, then multiply by how many tens.',
        ex: { p: 30, n: 60 } },
      { label: 'Just 5%', note: '5% is half of 10%, so find 10% and halve it.',
        ex: { p: 5, n: 60 } },
      { label: 'Tens and a 5', note: 'Split it into tens and a five: 35% is 30% and 5%. Find both, then add.',
        ex: { p: 35, n: 60 } },
    ],
    keys: ['.'], decimals: true,
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) return this.q({ p: pick([10, 20, 30, 50], r), n: int(2, 30, r) * 10 });
        if (lv === 2) return this.q({ p: int(1, 19, r) * 5, n: int(1, 20, r) * 20 });
        return this.q({ p: int(1, 19, r) * 5, n: int(2, 99, r) * 10 });
      });
    },
    q({ p, n }) { return { p, n, build: p === 10 ? 'ten' : p === 5 ? 'five' : p % 10 === 0 ? 'tens' : 'tens and five', text: `${p}% of ${n}`, say: `${p} percent of ${n}`, expr: `${n}/100*${p}`, ans: (p * n) / 100 }; },
    work({ p, n }) {
      const tens = Math.floor(p / 10), five = p % 10 === 5, s = [];
      if (p === 10) return [{ t: 'How many tenths make the whole?', v: 10, x: `100/${p}` }, { t: `10% of ${n}: ${n} ÷ 10`, v: n / 10 }];
      s.push({ t: `10% of ${n}: ${n} ÷ 10`, v: n / 10, x: `${n}*10/100` });
      if (tens > 1) s.push({ t: `${tens * 10}%: ${tens} lots of 10%`, v: (tens * n) / 10, x: `${n}*${p - (p % 10)}/100` });
      if (five) s.push({ t: '5%: half of 10%', v: n / 20, x: `${n}*5/100` });
      if (five && tens > 0) s.push({ t: 'Add them', v: (p * n) / 100, x: `${n}*${p}/100` });
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
    oneIdea: true,
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
      return [{ t: `For 1: ${amount} ÷ ${n}`, v: per2 / 2, x: `${amount}/${n}` }, { t: `For ${m}: × ${m}`, v: (per2 * m) / 2 }];
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
    caseKey: ['dir', 'way'],
    cases: [
      { label: 'Money off', note: 'Find the percentage of the price, then take it away.',
        ex: { n: 60, p: 20, dir: 'off' } },
      { label: 'Money added', note: 'The same two steps upwards: find the percentage, then add it on.',
        ex: { n: 80, p: 15, dir: 'up', lv: 2 } },
      { label: 'Off, in one step', note: 'Think about what you DO pay: 35% off leaves 65%, so find 65% of the price straight away.',
        ex: { n: 120, p: 35, dir: 'off', lv: 3 } },
      { label: 'Added, in one step', note: 'A rise of 15% makes 115% of the old amount — find that directly.',
        ex: { n: 200, p: 15, dir: 'up', lv: 3 } },
    ],
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
      return { n, p, dir, lv, way: lv === 3 ? 'one step' : 'two steps', text: off ? `${n} with ${p}% off` : `${n} with ${p}% added`, say: off ? `${n} with ${p} percent off` : `${n} with ${p} percent added`,
        expr: `${n}*(1${off ? '-' : '+'}${p}/100)`, ans: (n * (off ? 100 - p : 100 + p)) / 100 };
    },
    work({ n, p, dir, lv = 1 }) {
      const off = dir === 'off', ans = (n * (off ? 100 - p : 100 + p)) / 100;
      if (lv === 3) return [{ t: off ? `Per cent you pay: 100 − ${p}` : `New per cent: 100 + ${p}`, v: off ? 100 - p : 100 + p, x: `100${off ? '-' : '+'}${p}` }, { t: `${off ? 100 - p : 100 + p}% of ${n}`, v: ans }];
      return [{ t: `${p}% of ${n}`, v: (p * n) / 100, x: `${n}*${p}/100` }, { t: off ? 'Take it off' : 'Add it on', v: ans }];
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
    caseKey: 'kind',
    cases: [
      { label: 'Share in a ratio', note: 'Add the parts to get one round of sharing. Find one part, then multiply by the share you want.',
        ex: { kind: 'share', a: 2, b: 5, n: 35, big: true } },
      { label: 'Simplify a ratio', note: 'Divide both sides by the same number, just like simplifying a fraction. The mix stays the same.',
        ex: { kind: 'simplify', a: 2, b: 3, g: 6 } },
    ],
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
      if (kind === 'simplify') return [{ t: `${a * q.g} ÷ what makes ${a}?`, v: q.g, x: `${a * q.g}/${a}` }, { t: `Same to the other side: ${b * q.g} ÷ ${q.g}`, v: b }];
      const part = q.big ? Math.max(a, b) : Math.min(a, b);
      return [
        { t: `Parts in one round: ${a} + ${b}`, v: a + b, x: `${a}+${b}` },
        { t: `One part: ${q.n} ÷ ${a + b}`, v: q.n / (a + b), x: `${q.n}/(${a}+${b})` },
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
    caseKey: 'kind',
    cases: [
      { label: 'How far?', note: 'Speed is the distance in one hour, so multiply it by the number of hours.',
        ex: { kind: 'd', s: 80, t: 3 } },
      { label: 'How fast?', note: 'Share the distance equally between the hours: that is the distance in one hour, the speed.',
        ex: { kind: 's', s: 80, t: 3 } },
      { label: 'How long?', note: 'Ask how many one-hour distances fit into the whole trip.',
        ex: { kind: 't', s: 80, t: 3 } },
      { label: 'Minutes, not hours', note: 'Turn the minutes into a piece of an hour first: 20 minutes is a third, so you go a third of the speed.',
        ex: { kind: 'min', mins: 20, s: 30 } },
    ],
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
      if (kind === 'min') return [{ t: `How many ${q.mins}-minute pieces make an hour?`, v: 60 / q.mins, x: `60/${q.mins}` }, { t: `Km in ${q.mins} minutes: ${s} ÷ ${60 / q.mins}`, v: (s * q.mins) / 60 }];
      if (kind === 's') return [{ t: 'Hours taken', v: t, x: `Number(${JSON.stringify(q.text)}.match(/in (\\d+) hours/)[1])` }, { t: `Km in one hour: ${d} ÷ ${t}`, v: s }];
      if (kind === 't') return [{ t: 'Km in one hour', v: s, x: `Number(${JSON.stringify(q.text)}.match(/at (\\d+) km\\/h/)[1])` }, { t: `How many ${s}s make ${d}?`, v: t }];
      return [{ t: 'Km in one hour', v: s, x: `Number(${JSON.stringify(q.text)}.match(/^(\\d+) km\\/h/)[1])` }, { t: `In ${t} hours: × ${t}`, v: d }];
    },
  },
];

