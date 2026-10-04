/* library.js — The Number Library: how numbers are written, and the written
   methods that follow from it. Place value first, because every other stop
   in this world (rounding, comparing, column sums, long multiplication,
   short division) is place value doing its job. Contract: docs/CHAPTER-CONTRACT.md. */

import { int, pick } from '../rand.js';
import { svg, text, numberLine } from './kit.js';

export const WORLD = {
  id: 'library', name: 'The Number Library', short: 'Library', band: '6-7',
  blurb: 'Where a digit lives decides what it is worth — and every written method starts there.',
  tint: '#F7EFDC', ink: '#7A2E1F', glyph: '📚',
};

/* ---------------------------------------------------------------- helpers */

const fmt = (n) => (n < 0 ? '−' : '') + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const deg = (n) => (n < 0 ? '−' + Math.abs(n) : String(n));
/* The prompt must never show its answer — commas included, so 4,370 cannot hide 4370. */
const leaks = (q) => !q.choices && String(q.ans).length > 1 && q.text.replace(/,/g, '').split(/[^0-9./]/).includes(String(q.ans));
function fresh(make) { let q; for (let i = 0; i < 80; i++) { q = make(); if (!leaks(q)) return q; } return q; }

const PLACES = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands', 'millions'];
const COLS = ['Ones', 'Tens', 'Hundreds', 'Thousands', 'Ten thousands'];
const HEAD = ['O', 'T', 'H', 'Th', 'TTh', 'HTh', 'M'];
const digitAt = (n, p) => Math.floor(n / 10 ** p) % 10;
const len = (n) => String(n).length;

function distinctDigits(k, r) {
  const d = [];
  while (d.length < k) { const x = int(1, 9, r); if (!d.includes(x)) d.push(x); }
  return Number(d.join(''));
}

/* A place-value chart: one row per number, digits under their column heads. */
function pvChart(nums) {
  const L = Math.max(...nums.map(len)), u = 42;
  let s = '';
  for (let i = 0; i < L; i++) {
    const x = 4 + (L - 1 - i) * u;
    s += `<rect x="${x}" y="4" width="${u}" height="28" class="dg-fill2"/>` + text(x + u / 2, 23, HEAD[i], 'dg-small');
    nums.forEach((n, j) => {
      const str = String(n), c = str.length - 1 - i, y = 32 + j * u;
      s += `<rect x="${x}" y="${y}" width="${u}" height="${u}" class="dg-blank"/>` + (c >= 0 ? text(x + u / 2, y + 28, str[c], 'dg-big') : '');
    });
  }
  return svg(L * u + 8, 36 + nums.length * u + 4, s, 'A place-value chart');
}

/* A written column sum, digits lined up on the right. */
function columns(a, b, op) {
  const L = Math.max(len(a), len(b)) + 1, u = 26, W = 30 + L * u;
  const row = (n, y) => String(n).split('').reverse().map((d, i) => text(W - 16 - i * u, y, d, 'dg-big')).join('');
  let s = row(a, 30) + row(b, 62) + text(14, 62, op, 'dg-big');
  s += `<line x1="8" y1="74" x2="${W - 4}" y2="74" class="dg-line"/><line x1="8" y1="112" x2="${W - 4}" y2="112" class="dg-line"/>`;
  return svg(W, 118, s, `${a} ${op} ${b}, written in columns`);
}

/* ---------------------------------------------------------------- Roman numerals */

const R_ONES = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
const R_TENS = ['', 'X', 'XX', 'XXX', 'XL', 'L', 'LX', 'LXX', 'LXXX', 'XC'];
const R_HUNS = ['', 'C', 'CC', 'CCC', 'CD', 'D', 'DC', 'DCC', 'DCCC', 'CM'];
const roman = (n) => 'M'.repeat(Math.floor(n / 1000)) + R_HUNS[digitAt(n, 2)] + R_TENS[digitAt(n, 1)] + R_ONES[digitAt(n, 0)];
const additive = (n) => {           // the common slip: never subtracting (4 as IIII, 9 as VIIII)
  const h = digitAt(n, 2), t = digitAt(n, 1), o = digitAt(n, 0);
  return 'M'.repeat(Math.floor(n / 1000)) + (h >= 5 ? 'D' : '') + 'C'.repeat(h % 5) + (t >= 5 ? 'L' : '') + 'X'.repeat(t % 5) + (o >= 5 ? 'V' : '') + 'I'.repeat(o % 5);
};
const placeParts = (n) => [1000, 100, 10, 1].map((p) => Math.floor(n / p) % (p === 1000 ? 100 : 10) * p).filter((v) => v > 0);
const RVAL = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
/* Two independent routes for expr: read a numeral right to left, and write one greedily. */
/* x readers for test/lib/steps.mjs — what the child SEES. A dot on the number line is read against the
   numbered ticks drawn; a Roman letter's value is read off the letter chart drawn beside the question. */
const onLine = (label) => String.raw`(()=>{const t=[...SVG.matchAll(/<line x1="([\d.]+)" y1="33"[^>]*\/><text[^>]*>(-?[\d.]+)<\/text>/g)].map((m)=>[+m[1],+m[2]]),[x0,v0]=t[0],[x1,v1]=t[t.length-1],d=+SVG.match(/<circle cx="([\d.]+)"[^>]*\/><text[^>]*>${label}<\/text>/)[1];return Math.round((v0+(d-x0)*(v1-v0)/(x1-x0))*1e6)/1e6})()`;
const readDrawn = (s) => String.raw`(function(s){const V=Object.fromEntries([...SVG.matchAll(/>([IVXLCDM])<\/text><text[^>]*>(\d+)</g)].map((m)=>[m[1],+m[2]]));let t=0,p=0;for(const c of s.split('').reverse()){const v=V[c];t+=v<p?-v:v;p=Math.max(p,v);}return t})('${s}')`;
const readExpr = (s) => `(function(s){let t=0,p=0;for(const c of s.split('').reverse()){const v={I:1,V:5,X:10,L:50,C:100,D:500,M:1000}[c];t+=v<p?-v:v;p=Math.max(p,v);}return t})('${s}')`;
const writeExpr = (n) => `(function(n){let s='';for(const [a,b] of [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']])while(n>=a){s+=b;n-=a;}return s})(${n})`;
function romanChoices(n) {
  const out = [roman(n)];
  const cands = [additive(n), roman(n + (n % 2 ? 1 : 10)), n > 1 ? roman(n - 1) : null, roman(n + 1), n > 10 ? roman(n - 10) : roman(n + 5), roman(n + 2)];
  for (const c of cands) if (c && !out.includes(c) && out.length < 4) out.push(c);
  const k = n % out.length;                     // position from n: pure, and not always first
  return out.slice(k).concat(out.slice(0, k));
}

/* Short division, one place at a time from the left ("the bus stop"). */
function busStop(a, d) {
  const steps = []; let rem = 0, top = '', started = false, lastCur = 0, lastQ = 0;
  String(a).split('').forEach((ch, i, arr) => {
    const cur = rem * 10 + Number(ch), qd = Math.floor(cur / d);
    rem = cur % d; lastCur = cur; lastQ = qd;
    if (started || qd > 0 || i === arr.length - 1) { steps.push({ t: `${cur} ÷ ${d} — how many ${d}s fit?`, v: qd, x: `Math.floor(${a}/(${d}*${10 ** (arr.length - 1 - i)}))%10` }); top += qd; started = true; }
  });
  return { steps, quot: Number(top), rem, lastCur, lastQ };
}

/* ---------------------------------------------------------------- order of operations */

const OPS = {
  'add-mul': { lv: 1, rule: 'mul', make: (r) => [int(2, 20, r), int(2, 9, r), int(2, 9, r)], ok: () => true,
    text: ([a, b, c]) => `${a} + ${b} × ${c}`,
    steps: ([a, b, c]) => [{ t: `Multiply first: ${b} × ${c}`, v: b * c, x: `${b}*${c}` }, { t: `${a} + ${b * c}`, v: a + b * c }] },
  'sub-mul': { lv: 1, rule: 'mul', make: (r) => [int(30, 60, r), int(2, 6, r), int(2, 5, r)], ok: ([a, b, c]) => a > b * c,
    text: ([a, b, c]) => `${a} − ${b} × ${c}`,
    steps: ([a, b, c]) => [{ t: `Multiply first: ${b} × ${c}`, v: b * c, x: `${b}*${c}` }, { t: `${a} − ${b * c}`, v: a - b * c }] },
  'add-div': { lv: 1, rule: 'mul', make: (r) => { const c = int(2, 9, r); return [int(2, 30, r), c * int(2, 9, r), c]; }, ok: () => true,
    text: ([a, b, c]) => `${a} + ${b} ÷ ${c}`,
    steps: ([a, b, c]) => [{ t: `Divide first: ${b} ÷ ${c}`, v: b / c, x: `${b}/${c}` }, { t: `${a} + ${b / c}`, v: a + b / c }] },
  'brk-mul': { lv: 2, rule: 'brackets', make: (r) => [int(2, 12, r), int(2, 12, r), int(2, 9, r)], ok: () => true,
    text: ([a, b, c]) => `(${a} + ${b}) × ${c}`,
    steps: ([a, b, c]) => [{ t: `Brackets first: ${a} + ${b}`, v: a + b, x: `${a}+${b}` }, { t: `${a + b} × ${c}`, v: (a + b) * c }] },
  'mul-brk': { lv: 2, rule: 'brackets', make: (r) => { const c = int(2, 9, r); return [int(2, 9, r), c + int(2, 9, r), c]; }, ok: () => true,
    text: ([a, b, c]) => `${a} × (${b} − ${c})`,
    steps: ([a, b, c]) => [{ t: `Brackets first: ${b} − ${c}`, v: b - c, x: `${b}-${c}` }, { t: `${a} × ${b - c}`, v: a * (b - c) }] },
  'mul-add-mul': { lv: 2, rule: 'mul', make: (r) => [int(2, 9, r), int(2, 9, r), int(2, 9, r), int(2, 9, r)], ok: () => true,
    text: ([a, b, c, d]) => `${a} × ${b} + ${c} × ${d}`,
    steps: ([a, b, c, d]) => [{ t: `${a} × ${b}`, v: a * b, x: `${a}*${b}` }, { t: `${c} × ${d}`, v: c * d, x: `${c}*${d}` }, { t: `${a * b} + ${c * d}`, v: a * b + c * d }] },
  'brk-mul-sub': { lv: 3, rule: 'brackets', make: (r) => { const b = int(2, 9, r); return [b + int(2, 9, r), b, int(3, 9, r), int(2, 15, r)]; }, ok: ([a, b, c, d]) => (a - b) * c > d,
    text: ([a, b, c, d]) => `(${a} − ${b}) × ${c} − ${d}`,
    steps: ([a, b, c, d]) => [{ t: `Brackets first: ${a} − ${b}`, v: a - b, x: `${a}-${b}` }, { t: `${a - b} × ${c}`, v: (a - b) * c, x: `(${a}-${b})*${c}` }, { t: `${(a - b) * c} − ${d}`, v: (a - b) * c - d }] },
  'long': { lv: 3, rule: 'left to right', make: (r) => { const c = int(2, 6, r); return [int(20, 60, r), c * int(2, 9, r), c, int(2, 9, r), int(2, 9, r)]; }, ok: ([a, b, c]) => a > b / c,
    text: ([a, b, c, d, e]) => `${a} − ${b} ÷ ${c} + ${d} × ${e}`,
    steps: ([a, b, c, d, e]) => [{ t: `${b} ÷ ${c}`, v: b / c, x: `${b}/${c}` }, { t: `${d} × ${e}`, v: d * e, x: `${d}*${e}` }, { t: `Now left to right: ${a} − ${b / c}`, v: a - b / c, x: `${a}-${b}/${c}` }, { t: `${a - b / c} + ${d * e}`, v: a - b / c + d * e }] },
  'pow': { lv: 3, rule: 'powers', make: (r) => [int(2, 30, r), int(2, 6, r), int(2, 5, r)], ok: () => true,
    text: ([a, b, c]) => `${a} + ${b}² × ${c}`,
    steps: ([a, b, c]) => [{ t: `Powers first: ${b}²`, v: b * b, x: `${b}**2` }, { t: `${b * b} × ${c}`, v: b * b * c, x: `${b}**2*${c}` }, { t: `${a} + ${b * b * c}`, v: a + b * b * c }] },
};
const toJs = (s) => s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/(\d+)²/g, '($1**2)');

/* ================================================================ stops */

export const TRICKS = [
  {
    id: 'place-value', world: 'library', band: '6-7', title: 'What is a digit worth?',
    hook: 'In 4,372 there is a 3. Is it worth three?',
    idea: 'Count the places from the right — ones, tens, hundreds, thousands — and the place tells you what the digit is worth.',
    why: [
      'We only have ten digits, 0 to 9. To write bigger numbers we do not invent new digits — we use position. Each place to the left is worth ten times the place before: ten ones make a ten, ten tens make a hundred, ten hundreds make a thousand.',
      'So the 3 in 4,372 is not three things. It sits in the hundreds place, so it means three hundreds: 300. The same 3 in 4,732 would be three tens, 30. The digit says how many; the place says of what.',
      'That is why a number can be pulled apart into its places: 4,372 is 4000 + 300 + 70 + 2. Every written method in this Library — carrying, exchanging, long multiplication — is this one idea at work.',
    ],
    alg: 'digit in place p (counting 0 from the right) is worth digit × 10ᵖ',
    ex: { n: 4372, p: 2, kind: 'worth' },
    caseKey: 'kind',
    cases: [
      { label: 'What is a digit worth?', note: 'Find the digit\'s place first. The digit says how many; the place says of what.',
        ex: { n: 4372, p: 2, kind: 'worth' } },
      { label: 'The missing part', note: 'Now the number is pulled apart into its places, with one part hidden. What is missing is what that digit is worth.',
        ex: { n: 5847, p: 2, kind: 'expand' } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const n = distinctDigits(lv === 1 ? int(2, 3, r) : lv === 2 ? int(3, 4, r) : int(5, 6, r), r);
        const kind = lv === 1 ? 'worth' : pick(['worth', 'expand'], r);
        return this.q({ n, p: int(lv === 1 ? 0 : 1, len(n) - 1, r), kind });
      });
    },
    q({ n, p, kind }) {
      const d = digitAt(n, p), ans = Number(String(d) + '0'.repeat(p));
      if (kind === 'expand') {
        const parts = String(n).split('').map((x, i, a) => Number(x + '0'.repeat(a.length - 1 - i)));
        const shown = parts.map((v, i) => (i === parts.length - 1 - p ? '?' : v));
        const others = parts.filter((_, i) => i !== parts.length - 1 - p);
        return { n, p, kind, text: `${fmt(n)} = ${shown.join(' + ')}`, say: `${n} equals ${shown.join(' plus ').replace('?', 'what')}`, expr: `${n}-(${others.join('+')})`, ans };
      }
      return { n, p, kind, text: `In ${fmt(n)}, what is the ${d} worth?`, say: `In ${n}, what is the digit ${d} worth?`, expr: `Math.floor(${n}/${10 ** p})%10*${10 ** p}`, ans };
    },
    work({ n, p, kind }) {
      const d = digitAt(n, p);
      if (kind === 'expand') {
        const known = n - d * 10 ** p;
        const seen = String(n).split('').map((ch, i, all) => ch + '0'.repeat(all.length - 1 - i)).filter((_, i, all) => i !== all.length - 1 - p);
        return [{ t: 'Add up the parts you can see', v: known, x: seen.map(Number).join('+') }, { t: `${n} − ${known}`, v: d * 10 ** p }];
      }
      return [
        // both read off the number printed (its digits are distinct): where the digit sits, and a 1 with a 0 for every digit after it
        { t: `Count the places to the ${d}, from the right — the ones are place 1`, v: p + 1, x: '((n,d)=>n.length-n.indexOf(d))(String(H.n(TEXT,1)),String(H.n(TEXT,2)))' },
        { t: `That is the ${PLACES[p]} place. One of those is worth`, v: 10 ** p, x: "((n,d)=>+('1'+n.slice(n.indexOf(d)+1).replace(/\\d/g,'0')))(String(H.n(TEXT,1)),String(H.n(TEXT,2)))" },
        { t: `${d} × ${10 ** p}`, v: d * 10 ** p },
      ];
    },
    draw: ({ n }) => pvChart([n]),
  },
  {
    id: 'compare-big', world: 'library', band: '6-7', title: 'Bigger or smaller?',
    hook: '98,765 or 102,345 — which is bigger? The first has bigger digits…',
    idea: 'Count the digits first. If they tie, compare place by place from the left, and the first difference decides.',
    why: [
      'A number with more digits reaches a bigger place. 102,345 has a hundred-thousands digit and 98,765 does not — so however big 98,765\'s digits are, it has not even reached one hundred thousand.',
      'When two numbers have the same number of digits, the leftmost digit is worth the most. 4,372 and 4,327 both have 4 thousands and 3 hundreds; the tens are the first place they differ, and 7 tens beats 2 tens. Nothing to the right can catch up, because even 9 ones is less than one more ten.',
      'The signs point the same way every time: the open mouth of < or > faces the bigger number. 4,372 > 4,327 reads "is greater than"; 4,327 < 4,372 reads "is less than".',
    ],
    alg: 'compare digit counts; if equal, the first place where aₖ ≠ bₖ decides',
    ex: { a: 4372, b: 4327 },
    caseKey: 'how',
    cases: [
      { label: 'Same number of digits', note: 'Both have four digits, so go from the left. The first place that differs decides — here, the tens.',
        ex: { a: 4372, b: 4327 } },
      { label: 'More digits wins', note: 'Count the digits before you look at them. Five digits is smaller than six, however big they are — so this time the sign is <.',
        ex: { a: 98765, b: 102345 } },
      { label: 'Exactly the same', note: 'Every place matches, all the way to the ones. Neither is bigger, so the sign is =.',
        ex: { a: 5060, b: 5060 } },
    ],
    gen(r, lv = 1) {
      const L = lv === 1 ? int(2, 3, r) : lv === 2 ? int(4, 5, r) : int(6, 7, r);
      const a = int(10 ** (L - 1), 10 ** L - 1, r), roll = r();
      let b;
      if (roll < 0.12) b = a;
      else if (roll < 0.32) b = int(9 * 10 ** (L - 2), 10 ** (L - 1) - 1, r);     // fewer digits, big first digit
      else {
        const s = String(a).split(''), k = int(lv === 1 ? 0 : 1, L - 1, r);
        let d; do d = int(k === 0 ? 1 : 0, 9, r); while (String(d) === s[k]);
        s[k] = String(d);
        for (let i = k + 1; i < L; i++) s[i] = String(int(0, 9, r));
        b = Number(s.join(''));
      }
      return r() < 0.5 ? this.q({ a, b }) : this.q({ a: b, b: a });
    },
    q({ a, b }) {
      const sa = String(a), sb = String(b);
      let ans = '=';
      if (sa.length !== sb.length) ans = sa.length > sb.length ? '>' : '<';
      else for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) { ans = sa[i] > sb[i] ? '>' : '<'; break; }
      const how = sa.length !== sb.length ? 'digits' : ans === '=' ? 'same' : 'place';
      return { a, b, how, text: `${fmt(a)}  ☐  ${fmt(b)}`, say: `Which sign goes between ${a} and ${b}?`, choices: ['<', '=', '>'], ans, expr: `${a}>${b}?'>':${a}<${b}?'<':'='` };
    },
    work({ a, b }) {
      const sa = String(a), sb = String(b), C = ['<', '=', '>'];
      const ans = a > b ? '>' : a < b ? '<' : '=';
      if (sa.length !== sb.length) return [
        { t: `How many digits in ${fmt(a)}?`, v: sa.length, x: `Math.floor(Math.log10(${a}))+1` },
        { t: `How many digits in ${fmt(b)}?`, v: sb.length, x: `Math.floor(Math.log10(${b}))+1` },
        { t: 'More digits means a bigger number', v: ans, choices: C },
      ];
      const i = [...sa].findIndex((d, k) => d !== sb[k]);
      if (i < 0) return [{ t: 'How many digits in each?', v: sa.length, x: `Math.floor(Math.log10(${a}))+1` }, { t: 'Every place matches', v: '=', choices: C }];
      return [
        { t: `Both have ${sa.length} digits. Going from the left, the first place they differ — the digit in ${fmt(a)}`, v: Number(sa[i]), x: `Math.floor(${a}/10**${sa.length - 1 - i})%10` },
        { t: `…and in ${fmt(b)}`, v: Number(sb[i]), x: `Math.floor(${b}/10**${sb.length - 1 - i})%10` },
        { t: 'The bigger digit wins', v: ans, choices: C },
      ];
    },
    draw: ({ a, b }) => pvChart([a, b]),
  },
  {
    id: 'round-nearest', world: 'library', band: '6-7', title: 'Rounding', echo: true,
    hook: 'Round 4,372 to the nearest hundred — up to 4,400 or down to 4,300?',
    idea: 'Find the two round numbers either side, find halfway, and see which side of halfway you are on.',
    why: [
      'Rounding asks: which round number is closest? 4,372 sits between 4,300 and 4,400 on the number line. Halfway between them is 4,350, and 4,372 is past halfway, so it is closer to 4,400.',
      'You only need to look at one digit — the one just to the right of the place you are rounding to. For hundreds, that is the tens digit: 7 tens is past the halfway mark of 5 tens, so round up. Everything further right is too small to change the decision.',
      'Exactly halfway (like 4,350) is equally close to both. Mathematicians agreed a rule so that everybody gets the same answer: halfway rounds up.',
    ],
    alg: 'round(n, to) = to × ⌊n ÷ to + ½⌋',
    ex: { n: 4372, to: 100 },
    caseKey: 'dir',
    cases: [
      { label: 'Past halfway: round up', note: 'To the nearest hundred, look at the tens digit. 7 tens is past the halfway 5 tens, so up it goes.',
        ex: { n: 4372, to: 100 } },
      { label: 'Below halfway: round down', note: 'To the nearest ten, look at the ones digit. 3 is below halfway, so it rounds DOWN — the tens digit stays as it is.',
        ex: { n: 63, to: 10 } },
      { label: 'Exactly halfway', note: 'To the nearest thousand, look at the hundreds. 2,500 is exactly halfway — equally close to both — and the agreed rule is: halfway rounds up.',
        ex: { n: 2500, to: 1000 } },
    ],
    gen(r, lv = 1) {
      const to = lv === 1 ? 10 : lv === 2 ? pick([10, 100], r) : pick([100, 1000], r);
      const lo = to === 10 ? (lv === 1 ? 11 : 101) : to === 100 ? (lv === 2 ? 101 : 1001) : 1001;
      const hi = to === 10 ? (lv === 1 ? 99 : 999) : to === 100 ? (lv === 2 ? 999 : 9999) : 99999;
      let n = int(lo, hi, r);
      if (n % to === 0) n += int(1, to - 1, r);
      return this.q({ n, to });
    },
    q({ n, to }) {
      const lower = n - (n % to), ans = n % to >= to / 2 ? lower + to : lower;
      const dir = n % to === to / 2 ? 'halfway' : n % to > to / 2 ? 'up' : 'down';
      return { n, to, dir, text: `Round ${fmt(n)} to the nearest ${fmt(to)}`, say: `Round ${n} to the nearest ${to}`, expr: `Math.round(${n}/${to})*${to}`, ans };
    },
    work({ n, to }) {
      const lower = n - (n % to);
      return [
        { t: `The multiple of ${to} just below ${fmt(n)}`, v: lower, x: `Math.floor(${n}/${to})*${to}` },
        { t: 'The one just above', v: lower + to, x: `(Math.floor(${n}/${to})+1)*${to}` },
        { t: 'Halfway between them', v: lower + to / 2, x: `(Math.floor(${n}/${to})+0.5)*${to}` },
        { t: `Is ${fmt(n)} below halfway (round down), or at or past it (round up)?`, v: n % to >= to / 2 ? lower + to : lower },
      ];
    },
    draw: ({ n, to }) => { const lower = n - (n % to); return numberLine(lower, lower + to, to / 2, { [n]: fmt(n) }); },
  },
  {
    id: 'column-add', world: 'library', band: '6-7', title: 'Column addition',
    hook: '368 + 457 — too big for your fingers, and your head.',
    idea: 'Line the numbers up by place. Add each column from the right; when a column makes ten or more, carry the ten to the next column.',
    why: [
      'Lining up the digits puts ones with ones, tens with tens, hundreds with hundreds. You can only add things of the same kind — 8 ones and 7 ones make 15 ones.',
      'But a column can only hold one digit. 15 ones is 1 ten and 5 ones, so the 5 stays and the ten moves to the tens column, where it belongs. That is all carrying is: ten of one place swapped for one of the next.',
      'We start on the right because that is where carries come from. Each column might send one to its left neighbour, never to its right, so going right to left means nothing ever needs fixing afterwards.',
    ],
    alg: 'column k: aₖ + bₖ + carry = 10 × (next carry) + digitₖ',
    ex: { a: 368, b: 457 },
    caseKey: 'way',
    cases: [
      { label: 'One carry', note: 'Only the ones make ten or more. Their ten goes to the top of the tens column and is added in with the tens.',
        ex: { a: 246, b: 137 } },
      { label: 'Carry after carry', note: 'The carried one can make the next column reach ten too — then that column carries as well. Always add the carry in.',
        ex: { a: 368, b: 457 } },
      { label: 'A carry makes a new place', note: 'The last column carries too, and there is nothing to its left. The carried one starts a new place of its own at the front.',
        ex: { a: 68, b: 57 } },
    ],
    gen(r, lv = 1) {
      let a = lv === 1 ? int(12, 89, r) : lv === 2 ? int(102, 899, r) : int(1002, 8999, r);
      let b = lv === 1 ? int(12, 89, r) : lv === 2 ? int(102, 899, r) : int(102, 8999, r);
      if (a % 10 === 0) a += int(1, 9, r);
      if (a % 10 + b % 10 < 10) b = b - (b % 10) + int(10 - (a % 10), 9, r);
      return this.q({ a, b });
    },
    q({ a, b }) {
      let c = 0, out = '';
      let carries = 0;
      for (let i = 0; i < Math.max(len(a), len(b)); i++) { const s = digitAt(a, i) + digitAt(b, i) + c; out = (s % 10) + out; c = s >= 10 ? 1 : 0; carries += c; }
      const way = c ? 'new place' : carries > 1 ? 'several' : 'one';
      return { a, b, way, text: `${a} + ${b}`, expr: `${a}+${b}`, ans: Number((c ? '1' : '') + out) };
    },
    work({ a, b }) {
      const steps = []; let c = 0;
      for (let i = 0; i < Math.max(len(a), len(b)); i++) {
        const da = digitAt(a, i), db = digitAt(b, i), s = da + db + c;
        const parts = [i < len(a) ? da : null, i < len(b) ? db : null].filter((x) => x !== null);
        const P = 10 ** i;
        steps.push({ t: `${COLS[i]}: ${parts.join(' + ')}${c ? ' + 1 carried' : ''}`, v: s, x: `Math.floor(${a}/${P})%10+Math.floor(${b}/${P})%10+(${a}%${P}+${b}%${P}>=${P}?1:0)` });
        c = s >= 10 ? 1 : 0;
      }
      steps.push({ t: 'Keep the last digit of each column, carry the tens — read the answer', v: a + b });
      return steps;
    },
    draw: ({ a, b }) => columns(a, b, '+'),
  },
  {
    id: 'column-sub', world: 'library', band: '6-7', title: 'Column subtraction',
    hook: '532 − 178 — the top digit is smaller. Now what?',
    idea: 'Line up by place and subtract from the right. When the top digit is too small, exchange one from the next column: it arrives as ten.',
    why: [
      'You cannot take 8 ones from 2 ones. But the number has more in it than those 2 ones: it has tens next door. Break one ten open and it becomes ten ones, so now there are 12 ones, and 12 − 8 is fine.',
      'Nothing has been added or lost. 532 is 5 hundreds, 3 tens and 2 ones, and it is also 5 hundreds, 2 tens and 12 ones — the same amount, packed differently. The tens column just has one fewer to give.',
      'When the next column is a 0 it has nothing to lend, so it exchanges from its own neighbour first: 1 hundred becomes 10 tens, and then one of those tens goes on to the ones. That is why 0s in the top number turn into 9s.',
    ],
    alg: 'column k: if aₖ − borrow < bₖ, use aₖ − borrow + 10 and borrow 1 from column k + 1',
    ex: { a: 532, b: 178 },
    caseKey: 'way',
    cases: [
      { label: 'One exchange', note: 'Only the ones are too small. One ten from next door becomes ten ones, and the tens column has one fewer to give.',
        ex: { a: 72, b: 38 } },
      { label: 'Exchange after exchange', note: 'After lending, the tens are too small as well — so they exchange from the hundreds. Remember each column has one fewer after it lends.',
        ex: { a: 532, b: 178 } },
      { label: 'Across a zero', note: 'The next column is a 0 with nothing to lend, so it exchanges from ITS neighbour first. That is why the 0s turn into 9s.',
        ex: { a: 4003, b: 1257 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        let a, b, tries = 0;
        do {
          if (lv === 1) { a = int(30, 99, r); b = int(11, a - 5, r); }
          else if (lv === 2) { a = int(300, 999, r); b = int(101, a - 20, r); }
          else if (r() < 0.4) { a = int(2, 9, r) * 1000 + int(1, 9, r); b = int(1001, a - 100, r); }
          else { a = int(3000, 9999, r); b = int(1001, a - 200, r); }
          tries++;
        } while (tries < 40 && (a === 2 * b || !this.work({ a, b }).some((s) => /exchange/.test(s.t))));
        return this.q({ a, b });
      });
    },
    q({ a, b }) {
      let br = 0, out = '';
      let ex = 0, zero = false;
      for (let i = 0; i < len(a); i++) { if (digitAt(a, i) - br < 0) zero = true; let d = digitAt(a, i) - br - digitAt(b, i); br = d < 0 ? 1 : 0; ex += br; if (d < 0) d += 10; out = d + out; }
      const way = zero ? 'across zero' : ex > 1 ? 'several' : 'one';
      return { a, b, way, text: `${a} − ${b}`, expr: `${a}-${b}`, ans: Number(out) };
    },
    work({ a, b }) {
      const steps = []; let br = 0;
      for (let i = 0; i < len(a); i++) {
        const ta = digitAt(a, i), tb = digitAt(b, i), top = ta - br;
        let t, v;
        if (top < 0) { t = `${COLS[i]}: this 0 had to exchange from its left too, so it is now 9. 9 − ${tb}`; v = 9 - tb; br = 1; }
        else if (top < tb) { t = `${COLS[i]}: ${top} is less than ${tb} — exchange 1 from the left. ${top + 10} − ${tb}`; v = top + 10 - tb; br = 1; }
        else { t = `${COLS[i]}: ${top}${br ? ' (after lending 1)' : ''} − ${tb}`; v = top - tb; br = 0; }
        steps.push({ t, v, x: `Math.floor((${a}-${b})/${10 ** i})%10` });
      }
      steps.push({ t: 'Read the answer', v: a - b });
      return steps;
    },
    draw: ({ a, b }) => columns(a, b, '−'),
  },
  {
    id: 'negative-numbers', world: 'library', band: '8-10', title: 'Below zero', keys: ['−'],
    hook: 'It is −3 °C and it gets 8 degrees warmer. Is it 11 degrees?',
    idea: 'On a number line, count to zero first, then carry on past it.',
    why: [
      'A thermometer is a number line standing up. Zero is not the bottom — the numbers keep going down: −1, −2, −3. The further below zero, the colder, so −8 is colder than −3 even though 8 is bigger than 3.',
      'Getting warmer means moving up the line. From −3, the first 3 degrees only bring you back to zero; that uses up 3 of the 8. The 5 that are left take you above zero, to 5. Stopping at zero splits one hard jump into two easy ones.',
      'The gap between two temperatures works the same way. From −6 up to 4 is 6 to reach zero and 4 more — 10 degrees. Two distances from zero, added, because zero sits between them.',
      'Getting colder is moving down, and zero is the stop again: from 4, falling 7 uses 4 to reach zero and takes you 3 below, to −3. If you start below zero, colder just goes further below: −2, then 5 colder, is −7. And when both temperatures are below zero, zero is not between them, so the gap is one distance take away the other: −9 to −2 is 7 degrees.',
    ],
    alg: '−a + b = b − a ; the gap from −a to b is a + b',
    ex: { s: -3, c: 8, kind: 'rise' },
    caseKey: ['kind', 'zero'],
    cases: [
      { label: 'Warmer, past zero', note: 'Rising from below zero, the first few degrees only get you back to 0. What is left of the rise takes you above it.',
        ex: { s: -3, c: 8, kind: 'rise' } },
      { label: 'Warmer, still below zero', note: 'A small rise does not reach zero. It just brings you closer: 9 below, 4 warmer, is 5 below.',
        ex: { s: -9, c: 4, kind: 'rise' } },
      { label: 'Colder, past zero', note: 'Falling from above zero, the first degrees take you down to 0. The rest take you below it.',
        ex: { s: 4, c: 7, kind: 'fall' } },
      { label: 'Colder, further below', note: 'Already below zero? Colder takes you even further below, so the two distances add: 2 below, 5 colder, is 7 below.',
        ex: { s: -2, c: 5, kind: 'fall' } },
      { label: 'The gap across zero', note: 'Zero sits between the two temperatures, so add the two distances from zero.',
        ex: { s: -6, c: 4, kind: 'gap' } },
      { label: 'The gap below zero', note: 'Both are below zero, so zero is not between them. Take the smaller distance from the bigger one.',
        ex: { s: -9, c: -2, kind: 'gap' } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const R = lv === 1 ? 9 : lv === 2 ? 19 : 29;
        const kind = lv === 1 ? pick(['rise', 'fall'], r) : lv === 2 ? pick(['rise', 'fall', 'rise', 'fall', 'gap'], r) : pick(['rise', 'fall', 'gap'], r);
        if (kind === 'gap') {
          const lo = -int(2, R, r), hi = lv === 3 && r() < 0.3 ? lo + int(1, -lo - 1, r) : int(1, R, r);
          return this.q({ s: lo, c: hi, kind });
        }
        const s = kind === 'rise' ? -int(1, R, r) : lv === 1 ? int(1, R, r) : pick([int(1, R, r), -int(1, R, r)], r);
        let end;
        if (kind === 'rise') end = lv === 1 || r() < 0.6 ? int(0, R, r) : int(s + 1, -1, r);
        else end = -int(1, R, r) + (s < 0 ? s : 0);
        if (kind === 'rise' && end <= s) end = s + 1;
        return this.q({ s, c: Math.abs(end - s), kind });
      });
    },
    q({ s, c, kind }) {
      const zero = kind === 'gap' ? (c > 0 ? 'across' : 'below') : kind === 'rise' ? (s + c >= 0 ? 'across' : 'below') : (s > 0 ? 'across' : 'below');
      if (kind === 'gap') return { s, c, kind, zero, text: `The night was ${deg(s)} °C. The afternoon was ${deg(c)} °C. How many degrees warmer was the afternoon?`, expr: `(${c})-(${s})`, ans: c - s };
      const warm = kind === 'rise';
      return { s, c, kind, zero, text: `It is ${deg(s)} °C. It gets ${c} degrees ${warm ? 'warmer' : 'colder'}. What is the temperature now?`, expr: `(${s})${warm ? '+' : '-'}(${c})`, ans: warm ? s + c : s - c };
    },
    work({ s, c, kind }) {
      if (kind === 'gap') {
        if (c <= 0) return [{ t: `How far is ${deg(s)} below zero?`, v: -s, x: `Math.abs(${s})` }, { t: `And ${deg(c)}?`, v: -c, x: `Math.abs(${c})` }, { t: `The gap: ${-s} − ${-c}`, v: c - s }];
        return [{ t: `From ${deg(s)} up to 0`, v: -s, x: `0-${onLine('night')}` }, { t: `From 0 up to ${c}`, v: c, x: onLine('day') }, { t: 'Add the two jumps', v: c - s }];
      }
      if (kind === 'rise') {
        if (s + c >= 0) return [{ t: `From ${deg(s)} up to 0`, v: -s, x: `0-${onLine('now')}` }, { t: `Degrees still to rise after 0: ${c} − ${-s}`, v: c + s, x: `${c}-Math.abs(${s})` }, { t: 'So the temperature is', v: s + c }];
        return [{ t: `${deg(s)} is how far below zero?`, v: -s, x: `Math.abs(${s})` }, { t: `Warmer by ${c} brings it closer to zero: ${-s} − ${c}`, v: -s - c, x: `Math.abs((${s})+(${c}))` }, { t: 'Still below zero, so it is', v: s + c }];
      }
      if (s > 0) return [{ t: `From ${s} down to 0`, v: s, x: onLine('now') }, { t: `Degrees still to fall below 0: ${c} − ${s}`, v: c - s, x: `Math.abs((${s})-(${c}))` }, { t: 'Below zero, so it is', v: s - c }];
      return [{ t: `${deg(s)} is how far below zero?`, v: -s, x: `Math.abs(${s})` }, { t: `Colder by ${c} takes it further: ${-s} + ${c}`, v: c - s, x: `Math.abs((${s})-(${c}))` }, { t: 'Below zero, so it is', v: s - c }];
    },
    draw({ s, c, kind }) {
      const ends = kind === 'gap' ? [s, c] : [s, kind === 'rise' ? s + c : s - c];
      const m = Math.max(...ends.map(Math.abs)), R = m <= 10 ? 10 : m <= 20 ? 20 : Math.ceil(m / 10) * 10;
      return numberLine(-R, R, R === 10 ? 2 : R === 20 ? 5 : 10, kind === 'gap' ? { [s]: 'night', [c]: 'day' } : { [s]: 'now' });
    },
  },
  {
    id: 'roman-numerals', world: 'library', band: '8-10', title: 'Roman numerals',
    hook: 'MCMXLIV — a number written with letters. Which number?',
    idea: 'Read left to right and add — except when a smaller letter comes just before a bigger one, which means take it away.',
    why: [
      'Roman numerals use seven letters: I is 1, V is 5, X is 10, L is 50, C is 100, D is 500 and M is 1000. There is no zero and no place value: a letter is worth the same wherever it stands. So you build a number by adding letters up — XXVI is 10 + 10 + 5 + 1 = 26.',
      'To keep them short, the way they are usually written today never repeats a letter more than three times. Four is not IIII but IV: the I stands before the V, so it is taken away — one less than five. Only I, X and C are used like this, and only in front of the next two letters up: IV, IX, XL, XC, CD, CM.',
      'The easiest way to read a long one is to split it by our places. MCMXLIV is M (1000), CM (900), XL (40) and IV (4). Each part is one digit of our number, which is why the two systems can be translated place by place.',
    ],
    alg: 'value = Σ letters, with a letter subtracted when it stands before a larger one',
    ex: { n: 1944, kind: 'read' },
    caseKey: ['kind', 'minus'],
    cases: [
      { label: 'Read one that only adds', note: 'Every letter is the same size or smaller than the one before it, so just add them all up.',
        ex: { n: 26, kind: 'read' } },
      { label: 'Read one that takes away', note: 'A smaller letter just before a bigger one is taken away: CM is 900, XL is 40, IV is 4. Split it by place and add the parts.',
        ex: { n: 1944, kind: 'read' } },
      { label: 'Write one that only adds', note: 'Split the number by place and write each part, biggest first. No part here needs a take-away pair.',
        ex: { n: 27, kind: 'write' } },
      { label: 'Write one that takes away', note: 'A 4 or a 9 in any place is written as a take-away pair — 40 is XL and 9 is IX — never four of the same letter.',
        ex: { n: 49, kind: 'write' } },
    ],
    gen(r, lv = 1) {
      let n = lv === 1 ? int(1, 20, r) : lv === 2 ? int(21, 99, r) : int(101, 2000, r);
      if (lv >= 2 && r() < 0.5) n = n - (n % 10) + pick([4, 9], r);
      if (lv === 3 && r() < 0.4) n = n - (n % 100) + pick([40, 90], r) + (n % 10);
      return this.q({ n, kind: r() < 0.5 ? 'read' : 'write' });
    },
    q({ n, kind }) {
      const minus = /IV|IX|XL|XC|CD|CM/.test(roman(n)) ? 'takes away' : 'only adds';
      if (kind === 'write') return { n, kind, minus, text: `Which is ${n} in Roman numerals?`, choices: romanChoices(n), ans: roman(n), expr: writeExpr(n) };
      const s = roman(n);
      return { n, kind, minus, text: `What number is ${s}?`, say: `What number is ${s.split('').join(' ')}?`, expr: readExpr(s), ans: n };
    },
    work({ n, kind }) {
      const parts = placeParts(n);
      if (kind === 'write') {
        const s = parts.map((p, i) => { const P = 10 ** Math.floor(Math.log10(p)); return { t: i === 0 ? `Split ${n} by place — the biggest part` : 'The next part', v: p, x: `Math.floor(${n}/${P})%${P === 1000 ? 100 : 10}*${P}` }; });
        s.push({ t: 'Write each part as a numeral, biggest first', v: roman(n), choices: romanChoices(n) });
        return s;
      }
      if (parts.length === 1) { const f = roman(n)[0]; return [{ t: `What is ${f} worth?`, v: RVAL[f], x: readDrawn(f) }, { t: `So ${roman(n)} is`, v: n }]; }
      const s = parts.map((p) => ({ t: `Split by place: ${roman(p)} is`, v: p, x: readDrawn(roman(p)) }));
      s.push({ t: 'Add the parts', v: n });
      return s;
    },
    draw({ n }) {
      const keys = Object.entries(RVAL).filter(([, v]) => v <= Math.max(10, n * 2)), u = 48;
      let s = '';
      keys.forEach(([k, v], i) => { s += `<rect x="${4 + i * u}" y="4" width="${u}" height="56" class="dg-blank"/>` + text(4 + i * u + u / 2, 30, k, 'dg-big') + text(4 + i * u + u / 2, 50, v, 'dg-small'); });
      return svg(keys.length * u + 8, 64, s, 'The Roman letters and their values');
    },
  },
  {
    id: 'long-multiply', world: 'library', band: '8-10', title: 'Long multiplication',
    hook: '46 × 37 — both numbers too big for the tables.',
    idea: 'Split both numbers by place, multiply every part by every part in a grid, and add the boxes.',
    why: [
      '46 × 37 means 46 rows of 37. Split the 46 into 40 and 6, and the 37 into 30 and 7, and the rectangle cuts into four smaller rectangles: 40 × 30, 40 × 7, 6 × 30 and 6 × 7. Every one is a times-table fact with some zeros.',
      'The four boxes cover the whole rectangle exactly once — no gaps, no overlaps — so their areas add up to the whole: 1200 + 280 + 180 + 42 = 1702.',
      'The column method is the same grid folded up — and it is the quicker way once a number has three digits. The first row is the whole top number times the ones (46 × 7); the second row is it times the tens (46 × 30, which is why you write a 0 first). Add the two rows and you have added all the boxes.',
    ],
    alg: '(10a + b)(10c + d) = 100ac + 10ad + 10bc + bd',
    ex: { a: 46, b: 37 },
    caseKey: 'way',
    cases: [
      { label: 'Two-digit: the grid', note: 'Two parts each way make four boxes. Every box is a times-table fact with zeros, and the four add up to the whole.',
        ex: { a: 46, b: 37 } },
      { label: 'Three-digit: two rows', note: 'With a three-digit number, work in rows: the whole top number times the ones, then times the tens (write a 0 first). Add the two rows.',
        ex: { a: 234, b: 26 } },
    ],
    gen(r, lv = 1) {
      let a = lv === 1 ? int(11, 29, r) : lv === 2 ? int(21, 99, r) : int(101, 499, r);
      let b = lv === 1 ? int(11, 19, r) : lv === 2 ? int(21, 99, r) : int(12, 99, r);
      if (a % 10 === 0) a++;
      if (b % 10 === 0) b++;
      return this.q({ a, b });
    },
    q({ a, b }) {
      const pa = placeParts(a), pb = placeParts(b);
      return { a, b, way: a >= 100 ? 'rows' : 'grid', text: `${a} × ${b}`, expr: `${a}*${b}`, ans: pa.reduce((s, x) => s + pb.reduce((t, y) => t + x * y, 0), 0) };
    },
    work({ a, b }) {
      const bt = b - (b % 10), bo = b % 10;
      if (a >= 100) return [
        { t: `First row: ${a} × ${bo}`, v: a * bo, x: `${a}*(${b}%10)` },
        { t: `Second row: ${a} × ${bt} (write a 0, then × ${bt / 10})`, v: a * bt, x: `${a}*(${b}-${b}%10)` },
        { t: 'Add the two rows', v: a * b },
      ];
      const at = a - (a % 10), ao = a % 10;
      return [
        { t: `${at} × ${bt}`, v: at * bt, x: `(${a}-${a}%10)*(${b}-${b}%10)` }, { t: `${at} × ${bo}`, v: at * bo, x: `(${a}-${a}%10)*(${b}%10)` },
        { t: `${ao} × ${bt}`, v: ao * bt, x: `(${a}%10)*(${b}-${b}%10)` }, { t: `${ao} × ${bo}`, v: ao * bo, x: `(${a}%10)*(${b}%10)` },
        { t: 'Add all four boxes', v: a * b },
      ];
    },
    draw({ a, b }) {
      const pa = placeParts(a), pb = placeParts(b), w = 70, h = 44, x0 = 50, y0 = 30;
      let s = '';
      pa.forEach((x, i) => { s += text(x0 + i * w + w / 2, 20, x, 'dg-accent'); });
      pb.forEach((y, j) => { s += text(x0 - 8, y0 + j * h + h / 2 + 5, y, 'dg-accent', 'end'); });
      pa.forEach((_, i) => pb.forEach((_, j) => { s += `<rect x="${x0 + i * w}" y="${y0 + j * h}" width="${w}" height="${h}" class="${(i + j) % 2 ? 'dg-fill2' : 'dg-fill3'}"/>`; }));
      return svg(x0 + pa.length * w + 6, y0 + pb.length * h + 6, s, `A multiplication grid for ${a} × ${b}`);
    },
  },
  {
    id: 'short-division', world: 'library', band: '8-10', title: 'Short division',
    hook: '347 ÷ 5 — and it will not come out exactly.',
    idea: 'Divide one place at a time from the left. Whatever will not share carries into the next place as tens; whatever is left at the very end is the remainder.',
    why: [
      'Sharing 347 between 5 is sharing 3 hundreds, 4 tens and 7 ones. 3 hundreds will not go into 5 groups as whole hundreds, so break them into 30 tens. Now there are 34 tens, and 5 groups get 6 tens each, with 4 tens over.',
      'Those 4 tens become 40 ones, which join the 7 ones: 47. Each group gets 9 more, with 2 left over. The digits you wrote on top — 6 tens and 9 ones — are the answer, 69, and the 2 that could not be shared is the remainder.',
      'It is the same exchange as column subtraction, run from the left: what does not fit in one place is passed on, ten times bigger, to the place on its right. You can check it: 69 × 5 + 2 = 347.',
      'If a place is too small to share at all, the answer still needs a digit there: 823 ÷ 4 — 8 hundreds give 2, but 2 tens will not give 4 groups a ten each, so write 0 and pass on 20 ones. 23 ones give 5, with 3 over: 205, remainder 3.',
    ],
    alg: 'n = d × q + r, with 0 ≤ r < d',
    ex: { a: 347, d: 5, ask: 'q' },
    caseKey: 'way',
    cases: [
      { label: 'How many whole ones?', note: 'Divide place by place from the left, passing on what does not share. The digits along the top are the answer.',
        ex: { a: 347, d: 5, ask: 'q' } },
      { label: 'A place that will not share', note: 'Sometimes a place is too small to give every group even one. Write 0 on top — do not skip it — and pass it all on.',
        ex: { a: 823, d: 4, ask: 'q' } },
      { label: 'What is left over?', note: 'Now the question is the remainder: what is still left after the very last place has been shared.',
        ex: { a: 257, d: 6, ask: 'r' } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const d = lv === 1 ? int(2, 5, r) : int(3, 9, r);
        let a = lv === 1 ? int(11, 99, r) : lv === 2 ? int(102, 999, r) : int(1002, 9999, r);
        if (a % d === 0) a += int(1, d - 1, r);
        return this.q({ a, d, ask: pick(['q', 'r'], r) });
      });
    },
    q({ a, d, ask }) {
      const b = busStop(a, d), way = ask === 'r' ? 'remainder' : String(b.quot).includes('0') ? 'zero' : 'quotient';
      if (ask === 'r') return { a, d, ask, way, text: `${a} ÷ ${d}: what is the remainder?`, say: `${a} divided by ${d}. What is the remainder?`, expr: `${a}%${d}`, ans: b.rem };
      return { a, d, ask, way, text: `${a} ÷ ${d}: how many whole ${d}s? (leave out the remainder)`, say: `${a} divided by ${d}, not counting the remainder`, expr: `Math.floor(${a}/${d})`, ans: b.quot };
    },
    work({ a, d, ask }) {
      const b = busStop(a, d);
      return [...b.steps, ask === 'r'
        ? { t: `What is left at the end? ${b.lastCur} − ${d} × ${b.lastQ}`, v: b.rem }
        : { t: 'Read the digits along the top', v: b.quot }];
    },
    draw({ a, d }) {
      const W = 60 + len(a) * 26 + 20;
      const s = text(34, 66, d, 'dg-big') + `<path d="M50,40 L50,76 M50,40 L${W - 6},40" class="dg-line"/>` +
        String(a).split('').map((ch, i) => text(66 + i * 26, 66, ch, 'dg-big')).join('');
      return svg(W, 84, s, `${a} divided by ${d}, set out as short division`);
    },
  },
  {
    id: 'order-of-operations', world: 'library', band: '8-10', title: 'Which sum first?',
    hook: '2 + 3 × 4 — is it 20 or 14?',
    idea: 'Brackets first, then powers, then × and ÷, then + and −. Same-rank steps go left to right.',
    why: [
      'A calculation written in a line could be read more than one way. 2 + 3 × 4 is 20 if you add first and 14 if you multiply first. Maths only works if everyone gets the same answer, so everyone agrees an order. You may know it as BODMAS or BIDMAS in Britain and India, or PEMDAS in America — they are the same rule.',
      'Multiplying goes before adding because a multiplication is a bundle: 3 × 4 is "three fours", a single amount, 12. The 2 is added to that amount. If you want the 2 and 3 to go together first, you have to say so with brackets: (2 + 3) × 4.',
      '× and ÷ are the same rank, and so are + and −, so between those you just go left to right: 20 − 6 + 3 is 14 + 3 = 17, not 20 − 9.',
      'Powers come before × and ÷ because a power is a bundle of multiplications: 3² is 3 × 3, a single amount, 9. So 5 + 3² × 2 is 5 + 9 × 2 = 5 + 18 = 23.',
    ],
    alg: 'Brackets → Orders (powers) → × ÷ (left to right) → + − (left to right)',
    ex: { k: 'add-mul', n: [2, 3, 4] },
    caseKey: 'rule',
    cases: [
      { label: '× and ÷ before + and −', note: 'A multiplication is one bundle — three fours is 12 — so work it out before you add anything to it.',
        ex: { k: 'add-mul', n: [2, 3, 4] } },
      { label: 'Brackets first', note: 'Brackets change the order on purpose: whatever is inside them is done first, even an adding sum.',
        ex: { k: 'brk-mul', n: [2, 3, 4] } },
      { label: 'Powers before ×', note: 'A power like 3² is a bundle too — 3 × 3 — and it comes before multiplying or adding.',
        ex: { k: 'pow', n: [5, 3, 2] } },
      { label: 'Same rank: left to right', note: 'Do the × and ÷ bundles first. Then the + and − are the same rank, so go strictly left to right.',
        ex: { k: 'long', n: [30, 12, 4, 2, 5] } },
    ],
    gen(r, lv = 1) {
      const ks = Object.keys(OPS).filter((k) => OPS[k].lv === lv || (lv === 3 && OPS[k].lv === 2 && r() < 0.2));
      return fresh(() => {
        const k = pick(ks, r); let n, i = 0;
        do n = OPS[k].make(r); while (!OPS[k].ok(n) && ++i < 50);
        return this.q({ k, n });
      });
    },
    q({ k, n }) {
      const t = OPS[k].text(n);
      return { k, n, rule: OPS[k].rule, text: t, expr: toJs(t), ans: OPS[k].steps(n).at(-1).v };
    },
    work({ k, n }) { return OPS[k].steps(n); },
  },
];

/* ================================================================ stories */

