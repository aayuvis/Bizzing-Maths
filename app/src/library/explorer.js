/* explorer.js — the Number Explorer: a dictionary page for any whole number.

   The child types a number (0 to a million) and gets its entry: how you say
   it, its factor pairs (as rectangles of dots while they are small enough to
   count), prime or not and its factor tree, the shapes it makes (square, cube,
   triangle), its root, its digit root and the divisibility tests it passes —
   each with the one-line reason — its Roman numerals, where it sits on a
   number line, and its neighbours. Every fact that an Atlas stop teaches links
   to that stop.

   Nothing here is typed in by hand: every line on the page is computed, and
   selftest() proves each kind of line true by a route that does not share the
   code that drew it (factor pairs multiply back, Roman numerals read back, a
   divisibility claim agrees with n % d, a word form reads back to its number). */

import { icon } from '../icons.js';
import * as kit from '../chapters/kit.js';
import { byId } from '../tricks.js';
import { META } from './shelf.js';

export const TOOL = META.explorer;   // name, blurb and art live on the shelf (shelf.js), which loads without the tool

const MAX = 1000000;
const esc = kit.esc;
const group = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (n) => String(n).split('').map((d) => SUP[+d]).join('');

/* ------------------------------------------------------------ the maths */

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const w100 = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : ''));
const w1000 = (n) => { const h = Math.floor(n / 100), r = n % 100; return h ? `${ONES[h]} hundred${r ? ' and ' + w100(r) : ''}` : w100(r); };
/* British English: "three hundred and sixty", "one thousand and one". */
export function words(n) {
  if (n === 0) return 'zero';
  if (n === MAX) return 'one million';
  const th = Math.floor(n / 1000), r = n % 1000;
  let s = th ? w1000(th) + ' thousand' : '';
  if (r) s += (th ? (r < 100 ? ' and ' : ' ') : '') + w1000(r);
  return s;
}

const RN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
export function roman(n) { let s = ''; for (const [v, r] of RN) while (n >= v) { s += r; n -= v; } return s; }
/* 1729 → [[1000,'M'],[700,'DCC'],[20,'XX'],[9,'IX']] — one piece per place. */
export function romanParts(n) {
  const out = [];
  for (const p of [1000, 100, 10, 1]) { const v = Math.floor(n / p) % 10 * p; if (v) out.push([v, roman(v)]); }
  return out;
}

export function isqrt(n) { let r = Math.floor(Math.sqrt(n)); while (r * r > n) r--; while ((r + 1) * (r + 1) <= n) r++; return r; }
export function icbrt(n) { let r = Math.round(Math.cbrt(n)); while (r * r * r > n) r--; while ((r + 1) ** 3 <= n) r++; return r; }
export function isPrime(n) {
  if (n < 2) return false; if (n % 2 === 0) return n === 2;
  for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false;
  return true;
}
export function pairs(n) { const p = []; for (let i = 1; i * i <= n; i++) if (n % i === 0) p.push([i, n / i]); return p; }
export function divisors(n) {
  const ps = pairs(n), big = ps.map((p) => p[1]).reverse();
  if (ps.length && ps.at(-1)[0] === ps.at(-1)[1]) big.shift();   // a square's middle pair counts once
  return [...ps.map((p) => p[0]), ...big];
}
export function primeFactors(n) {
  const f = []; let m = n;
  for (let p = 2; p * p <= m; p++) { let e = 0; while (m % p === 0) { m /= p; e++; } if (e) f.push([p, e]); }
  if (m > 1) f.push([m, 1]);
  return f;
}
/* A factor tree that splits each number into the pair nearest its square
   root — the way a child would split 360 into 18 × 20, not 2 × 180. */
export function tree(n) {
  if (n < 4 || isPrime(n)) return { v: n };
  let a = isqrt(n); while (n % a) a--;
  return { v: n, kids: [tree(a), tree(n / a)] };
}
const digitsOf = (n) => String(n).split('').map(Number);
export const digitSum = (n) => digitsOf(n).reduce((a, b) => a + b, 0);
/* The chain of digit sums down to one digit: 9875 → [9875, 29, 11, 2]. */
export function rootChain(n) { const c = [n]; while (c.at(-1) > 9) c.push(digitSum(c.at(-1))); return c; }
export const digitRoot = (n) => rootChain(n).at(-1);
export const isSquare = (n) => isqrt(n) ** 2 === n;
export const isCube = (n) => icbrt(n) ** 3 === n;
export const isTriangular = (n) => isSquare(8 * n + 1);
export const triIndex = (n) => (isqrt(8 * n + 1) - 1) / 2;
export const properSum = (n) => (n < 2 ? 0 : divisors(n).reduce((a, b) => a + b, 0) - n);
export const isPerfect = (n) => n > 0 && properSum(n) === n;
export function nextPrime(n) { let m = Math.max(2, n + 1); while (!isPrime(m)) m++; return m; }
export function prevPrime(n) { for (let m = n - 1; m >= 2; m--) if (isPrime(m)) return m; return null; }
/* Every way to write n as a³ + b³ with 1 ≤ a ≤ b. */
export function twoCubes(n) {
  const out = [];
  for (let a = 1; 2 * a ** 3 <= n; a++) { const r = n - a ** 3, b = icbrt(r); if (b ** 3 === r) out.push([a, b]); }
  return out;
}
export function roundTo(n, p) { const r = n % p; return r * 2 >= p ? n - r + p : n - r; }

/* The divisibility tests, decided by the RULE a child would use (digits),
   never by n % d — selftest then holds every rule to n % d. */
export function tests(n) {
  const s = String(n), d = digitsOf(n), last = d.at(-1), ds = digitSum(n);
  const l2 = s.slice(-2), l3 = s.slice(-3);
  const two = [0, 2, 4, 6, 8].includes(last), three = ds % 3 === 0;
  const alt = d.reduce((acc, x, i) => acc + ((d.length - 1 - i) % 2 === 0 ? x : -x), 0);
  const altExpr = d.slice().reverse().map((x, i) => (i === 0 ? String(x) : (i % 2 ? ' − ' : ' + ') + x)).join('');
  const lastTwo = s.length <= 2 ? `${s} itself is` : `its last two digits, ${l2}, are`;
  const lastThree = s.length <= 3 ? `${s} itself is` : `its last three digits, ${l3}, are`;
  const four = +l2 % 4 === 0, eight = +l3 % 8 === 0, five = last === 0 || last === 5, nine = ds % 9 === 0;
  return [
    { d: 2, pass: two, why: `it ends in ${last}, ${two ? 'an even' : 'an odd'} digit`, stop: 'divisible-2-5-10' },
    { d: 3, pass: three, why: `its digits add up to ${ds}, ${three ? 'a' : 'not a'} multiple of 3`, stop: 'divisible-3' },
    { d: 4, pass: four, why: `${lastTwo} ${four ? 'a' : 'not a'} multiple of 4`, stop: 'divisible-4-8' },
    { d: 5, pass: five, why: `it ends in ${last}${five ? '' : ', not 0 or 5'}`, stop: 'divisible-2-5-10' },
    { d: 6, pass: two && three, why: two && three ? 'it passes the tests for 2 and for 3' : !two && !three ? 'it fails the tests for 2 and for 3' : !two ? 'it is odd, so it fails the test for 2' : 'it fails the test for 3', stop: 'divisible-6-11' },
    { d: 8, pass: eight, why: `${lastThree} ${eight ? 'a' : 'not a'} multiple of 8`, stop: 'divisible-4-8' },
    { d: 9, pass: nine, why: `its digits add up to ${ds}, ${nine ? 'a' : 'not a'} multiple of 9`, stop: 'divisible-3' },
    { d: 10, pass: last === 0, why: `it ends in ${last}`, stop: 'divisible-2-5-10' },
    { d: 11, pass: alt % 11 === 0, why: d.length === 1 ? 'it is a single digit that is not 0' : `take and add its digits in turn from the right: ${altExpr} = ${alt < 0 ? '−' + -alt : alt}, ${alt % 11 === 0 ? 'a' : 'not a'} multiple of 11`, stop: 'divisible-6-11' },
  ].map((t) => (n === 0 ? { ...t, why: `0 shares into ${t.d} groups of nothing` } : d.length === 1 && t.d === 11 ? { ...t, why: 'a single digit (not 0) is never a multiple of 11' } : t));
}
/* A number line between two round numbers: [lo, hi], ticks every tenth. */
export function lineRange(n) {
  if (n < 10) return [0, 10];
  const p = 10 ** (String(n).length - 1);
  return n % p === 0 ? [n - p / 2, n + p / 2] : [n - (n % p), n - (n % p) + p];
}

export function parse(s) {
  const t = String(s == null ? '' : s).replace(/[\s,_'’]/g, '');
  if (!t) return { empty: true };
  if (!/^\d+$/.test(t)) return { err: 'Only whole numbers here — digits 0 to 9, like 360 or 1,729.' };
  const n = Number(t);
  if (n > MAX) return { err: 'That is past a million. Try a number up to 1,000,000.' };
  return { n };
}

/* ------------------------------------------------------------ drawings */

function treeSvg(t) {
  const W = (v) => Math.max(40, String(v).length * 10 + 18);
  let x = 0, depth = 0, s = '';
  const lay = (node, dep) => {
    depth = Math.max(depth, dep); node.y = 24 + dep * 58;
    if (!node.kids) { const w = W(node.v); node.x = x + w / 2; x += w; return; }
    node.kids.forEach((k) => lay(k, dep + 1));
    node.x = (node.kids[0].x + node.kids[1].x) / 2;
  };
  lay(t, 0);
  const draw = (node) => {
    if (node.kids) for (const k of node.kids) { s += `<line x1="${node.x.toFixed(1)}" y1="${node.y + 8}" x2="${k.x.toFixed(1)}" y2="${k.y - 18}" class="dg-thin"/>`; draw(k); }
    if (!node.kids) { const w = W(node.v) - 10; s += `<rect x="${(node.x - w / 2).toFixed(1)}" y="${node.y - 17}" width="${w}" height="26" rx="13" class="dg-blank"/>`; }
    s += kit.text(node.x.toFixed(1), node.y + 1, node.v, 'dg-text');
  };
  draw(t);
  return kit.svg(Math.max(x, 60), 24 + depth * 58 + 18, s, `A factor tree for ${t.v}`);
}

function lineSvg(n) {
  const [lo, hi] = lineRange(n), W = 340, P = 30, X = (v) => P + ((v - lo) / (hi - lo)) * (W - 2 * P), st = (hi - lo) / 10;
  let s = `<line x1="${P - 12}" y1="52" x2="${W - P + 12}" y2="52" class="dg-line"/>`;
  for (let i = 0; i <= 10; i++) {
    const v = lo + i * st, big = i % 5 === 0;
    s += `<line x1="${X(v).toFixed(1)}" y1="${big ? 42 : 46}" x2="${X(v).toFixed(1)}" y2="${big ? 62 : 58}" class="${big ? 'dg-line' : 'dg-thin'}"/>`;
    if (big) s += kit.text(X(v).toFixed(1), 82, group(v), 'dg-small');
  }
  s += `<circle cx="${X(n).toFixed(1)}" cy="52" r="7" class="dg-dot"/>` + kit.text(X(n).toFixed(1), 30, group(n), 'dg-accent');
  return kit.svg(W, 92, s, `${group(n)} on a number line from ${group(lo)} to ${group(hi)}`);
}

/* ------------------------------------------------------------ the page */

const learn = (stop, label = 'Learn it') => (byId[stop] ? `<button class="t-explorer-learn" data-act="openStop" data-arg="${stop}" title="${esc(byId[stop].title)}">${label} →</button>` : '');
const yes = (b, y = 'Yes', n = 'No') => `<b class="t-explorer-${b ? 'yes' : 'no'}">${b ? y : n}</b>`;
const num = (n) => `<span class="t-explorer-num">${group(n)}</span>`;
const jump = (n, label) => (n != null && n >= 0 && n <= MAX ? `<button class="chip t-explorer-jump" data-act="lib" data-arg="set|${n}">${label || group(n)}</button>` : `<span class="chip">${label || group(n)}</span>`);
const sec = (title, body, stop, wide = false) => `<section class="t-explorer-sec${wide ? ' t-explorer-wide' : ''}"><div class="t-explorer-sh"><h3>${title}</h3>${stop ? learn(stop) : ''}</div>${body}</section>`;

function zeroPage() {
  return `<article class="t-explorer-page">
    <header class="t-explorer-head"><div class="t-explorer-big">0</div><div class="t-explorer-words">zero</div>
      <div class="t-explorer-tags"><span class="chip">even</span><span class="chip">neither prime nor composite</span><span class="chip">a square: 0 × 0</span><span class="chip">a cube: 0 × 0 × 0</span></div></header>
    <div class="t-explorer-grid">
      ${sec('Nothing, exactly', '<p>Zero is the number of things in an empty box. It is <b>even</b>, because it shares into two equal groups of nothing.</p><p>Every whole number divides into 0, so it has no list of factor pairs — 0 × anything is 0.</p>', 'place-value')}
      ${sec('Doing sums with it', '<p>Add 0 and nothing changes. Times by 0 and everything becomes 0. You can never share <i>into</i> 0 groups, so dividing by 0 has no answer.</p><p>Its square root is 0, and so is its digit sum.</p>')}
      ${sec('In Roman numerals', '<p>The Romans had no numeral for zero, so there is nothing to write.</p>', 'roman-numerals')}
      ${sec('Neighbours', `<div class="t-explorer-chips">${jump(1, '1 — the next number')}${jump(2, '2 — the first prime')}${jump(1, '1 — the next square')}</div>`)}
    </div></article>`;
}

function page(n, band) {
  if (n === 0) return zeroPage();
  const fs = primeFactors(n), prime = isPrime(n), ps = pairs(n), nd = divisors(n).length;
  const r = isqrt(n), sq = r * r === n, c = icbrt(n), cube = c ** 3 === n, tri = isTriangular(n), perf = isPerfect(n);
  const tags = [
    n % 2 ? 'odd' : 'even',
    prime ? 'prime' : n === 1 ? 'neither prime nor composite' : 'composite',
    sq && `square: ${r}²`, cube && `cube: ${c}³`, tri && `triangular`, perf && 'perfect',
    String(n).length > 1 && String(n) === String(n).split('').reverse().join('') && 'palindrome',
  ].filter(Boolean);

  // factors: dots while they can be counted, a list after that
  const drawable = ps.filter(([a, b]) => n <= 144 && b <= 30);
  const dotted = drawable.map(([a, b]) => `<figure class="t-explorer-fig">${kit.dots(a, b, () => true, 14)}<figcaption>${a} × ${b}</figcaption></figure>`).join('');
  const listed = ps.filter((p) => !drawable.includes(p)).map(([a, b]) => `<span class="t-explorer-pair">${group(a)} × ${group(b)}</span>`).join('');
  const factorBody = `<p>${num(n)} has <b>${nd}</b> factor${nd === 1 ? '' : 's'}, in <b>${ps.length}</b> pair${ps.length === 1 ? '' : 's'}${sq ? ` (one pair is ${r} × ${r} — the same number twice, which is why a square has an odd number of factors)` : ''}.</p>
    ${dotted ? `<div class="t-explorer-dots">${dotted}</div>` : ''}${listed ? `<div class="t-explorer-pairs">${listed}</div>` : ''}
    <p class="muted small">Every factor: ${divisors(n).map(group).join(', ')}.</p>`;

  const fline = fs.map(([p, e]) => `${p}${e > 1 ? sup(e) : ''}`).join(' × ');
  const primeBody = n === 1
    ? '<p><b>1 is neither prime nor composite.</b> A prime has exactly two factors; 1 has only one.</p>'
    : prime
      ? `<p><b>${num(n)} is prime.</b> Its only factors are 1 and ${group(n)} — nothing else shares it exactly.</p>`
      : `<p><b>${num(n)} is not prime</b> — it has ${nd} factors. Split it until only primes are left:</p>${treeSvg(tree(n))}
         <p class="t-explorer-eq">${group(n)} = ${fline}</p>`;

  const shapeRows = [
    [`Square?`, sq ? `${yes(true)} — ${r} × ${r} = ${group(n)}` : `${yes(false)} — it sits between ${group(r * r)} (${r}²) and ${group((r + 1) ** 2)} (${r + 1}²)`, 'square-dots'],
    [`Square root`, sq ? `exactly <b>${r}</b>` : `between <b>${r}</b> and <b>${r + 1}</b>, nearer ${n - r * r <= (r + 1) ** 2 - n ? r : r + 1} (about ${Math.sqrt(n).toFixed(2)})`, sq ? 'root-of-square' : 'either-side'],
    [`Cube?`, cube ? `${yes(true)} — ${c} × ${c} × ${c} = ${group(n)}` : `${yes(false)} — between ${group(c ** 3)} (${c}³) and ${group((c + 1) ** 3)} (${c + 1}³)`, 'cube-and-root'],
    [`Triangular?`, tri ? `${yes(true)} — 1 + 2 + 3 + … + ${triIndex(n)} = ${group(n)}` : yes(false), null],
    [`Perfect?`, perf ? `${yes(true)} — its other factors add up to exactly ${group(n)}` : `${yes(false)} — its other factors add up to ${group(properSum(n))}, ${properSum(n) > n ? 'more' : 'less'} than ${group(n)}`, 'factor-pairs'],
  ];
  if (sq && r > 1) shapeRows.push(['Odd staircase', `${group(n)} = ${r <= 6 ? Array.from({ length: r }, (_, i) => 2 * i + 1).join(' + ') : `1 + 3 + 5 + … + ${2 * r - 1}`} — the first ${r} odd numbers`, 'odd-staircase']);
  const cubes = twoCubes(n);
  if (cubes.length) shapeRows.push(['Two cubes', cubes.map(([a, b]) => `${a}³ + ${b}³`).join(' = ') + (cubes.length > 1 ? ` — ${cubes.length} different ways!` : ''), 'cube-and-root']);
  const shapeBody = `<dl class="t-explorer-dl">${shapeRows.map(([k, v, st]) => `<dt>${k}</dt><dd>${v}${st ? ' ' + learn(st, 'How') : ''}</dd>`).join('')}</dl>`;

  const chain = rootChain(n);
  const digitBody = `<p>Digit sum: ${digitsOf(n).join(' + ')} = <b>${digitSum(n)}</b>.</p>
    <p>Digit root: ${chain.map(group).join(' → ')}${chain.length === 1 ? ' (already one digit)' : ''}, so <b>${digitRoot(n)}</b>.</p>`;

  const T = tests(n);
  const testBody = `<ul class="t-explorer-tests">${T.map((t) => `<li class="${t.pass ? 'pass' : 'fail'}"><span class="t-explorer-d">÷${t.d}</span><span class="t-explorer-mark">${t.pass ? '✓' : '✗'}</span><span>${t.pass ? 'Yes' : 'No'} — ${esc(t.why)}.</span></li>`).join('')}</ul>
    <p class="muted small">Tests you can do in your head: ${learn('divisible-2-5-10', '2, 5, 10')} ${learn('divisible-3', '3 and 9')} ${learn('divisible-4-8', '4 and 8')} ${learn('divisible-6-11', '6 and 11')}</p>`;

  const romanBody = n <= 3999
    ? `<p class="t-explorer-roman">${roman(n)}</p><p class="muted">${romanParts(n).map(([, s]) => s).join(' + ')} = ${romanParts(n).map(([v]) => v).join(' + ')}</p>`
    : '<p>Roman numerals stop at 3,999 (MMMCMXCIX). For bigger numbers the Romans drew a bar over a numeral to mean a thousand times it.</p>';

  const places = [10, 100, 1000, 10000, 100000].filter((p) => p <= n);
  const [lo, hi] = lineRange(n);
  const lineBody = `${lineSvg(n)}<p>${num(n)} is between ${num(lo)} and ${num(hi)}.</p>
    ${places.length ? `<ul class="t-explorer-round">${places.map((p) => `<li>to the nearest ${group(p)}: <b>${group(roundTo(n, p))}</b></li>`).join('')}</ul>` : ''}`;

  const pp = prevPrime(n), np = nextPrime(n);
  const nearSq = n - r * r <= (r + 1) ** 2 - n ? r : r + 1;
  const nb = [
    `<dt>Either side</dt><dd>${jump(n - 1)} ${n < MAX ? jump(n + 1) : ''}</dd>`,
    `<dt>Primes</dt><dd>${pp ? jump(pp, `${group(pp)} before`) : '<span class="muted">no prime before it</span>'} ${jump(np, `${group(np)} after`)}</dd>`,
    sq ? `<dt>Squares either side</dt><dd>${jump((r - 1) ** 2, `${group((r - 1) ** 2)} = ${r - 1}²`)} ${jump((r + 1) ** 2, `${group((r + 1) ** 2)} = ${r + 1}²`)}</dd>`
      : `<dt>Nearest square</dt><dd>${jump(nearSq ** 2, `${group(nearSq ** 2)} = ${nearSq}²`)}</dd>`,
    `<dt>Double and half</dt><dd>${jump(2 * n, `double: ${group(2 * n)}`)} ${n % 2 === 0 ? jump(n / 2, `half: ${group(n / 2)}`) : `<span class="chip">half: ${group(Math.floor(n / 2))}½</span>`}</dd>`,
  ];

  return `<article class="t-explorer-page">
    <header class="t-explorer-head">
      <div class="t-explorer-big">${group(n)}</div>
      <div class="t-explorer-words">${words(n)}</div>
      <div class="t-explorer-tags">${tags.map((t) => `<span class="chip">${t}</span>`).join('')}</div>
    </header>
    <div class="t-explorer-grid">
      ${sec('Factor pairs', factorBody, 'factor-pairs', n <= 144 && ps.length > 1)}
      ${sec(prime ? 'Prime' : 'Made of primes', primeBody, fs.length > 1 || (fs[0] && fs[0][1] > 1) ? 'factor-tree' : 'prime-or-not')}
      ${sec('Shapes it makes', shapeBody, null)}
      ${sec('Its digits', digitBody, 'digit-root')}
      ${sec('What it divides by', testBody, null, true)}
      ${sec('In Roman numerals', romanBody, 'roman-numerals')}
      ${sec('On the number line', lineBody, 'round-nearest')}
      ${sec('Neighbours', `<dl class="t-explorer-dl">${nb.join('')}</dl>`, null)}
    </div>
    ${band === '6-7' ? '<p class="muted small t-explorer-foot">Some of this page is for later in the Atlas. Tap a “Learn it” button to find the stop that teaches it.</p>' : ''}
  </article>`;
}

/* ------------------------------------------------------------ the contract */

const QUICK = [1729, 360, 100, 144, 6, 28, 97];
const SURPRISE = [1729, 496, 8128, 5040, 2520, 65536, 12321, 142857, 1001, 6174, 3999, 1000000, 999999, 4096, 7919, 8191, 3025, 153, 371, 1089, 5050, 720720, 111111, 40320, 2025, 1024, 999983];

function current(ctx) {
  const recent = Array.isArray(ctx.data.recent) ? ctx.data.recent : [];
  return ctx.ui.n != null ? String(ctx.ui.n) : recent.length ? String(recent[0]) : '';
}
function remember(ctx, n) {
  const r = (Array.isArray(ctx.data.recent) ? ctx.data.recent : []).filter((x) => x !== n);
  ctx.data.recent = [n, ...r].slice(0, 8); ctx.save();
}
function show(ctx, n) { ctx.ui.n = String(n); remember(ctx, n); }

/* A deep link names a number (#/lib/explorer|<n>): the Explorer opens on its page. */
export function openItem(n, ctx) { act('set', n, ctx); }

export function act(name, arg, ctx) {
  const p = parse(current(ctx));
  if (name === 'go') { if (p.n != null) { remember(ctx, p.n); ctx.ui.n = String(p.n); } else if (p.err) ctx.toast(p.err); return; }
  if (name === 'set') { const q = parse(arg); if (q.n != null) show(ctx, q.n); return; }
  if (name === 'step') { const base = p.n != null ? p.n : 0, m = Math.min(MAX, Math.max(0, base + (+arg || 0))); show(ctx, m); return; }
  if (name === 'random') { const top = ctx.band === '6-7' ? 200 : ctx.band === '8-10' ? 9999 : 99999; show(ctx, 1 + Math.floor(Math.random() * top)); return; }
  if (name === 'surprise') { const pool = SURPRISE.filter((x) => x !== p.n); show(ctx, pool[Math.floor(Math.random() * pool.length)]); return; }
  if (name === 'clear') { ctx.ui.n = ''; return; }
  if (name === 'forget') { ctx.data.recent = []; ctx.save(); }
}

/* The host passes keys here only when focus is NOT in a text box, so ← → step
   and Enter/Escape work after a tap on a chip. Inside the box, the input's own
   onkeydown presses the matching button (Enter, Escape, ↑ ↓). */
export function key(e, ctx) {
  const m = { ArrowLeft: ['step', '-1'], ArrowRight: ['step', '1'], Enter: ['go', ''], Escape: ['clear', ''] }[e.key];
  if (!m || e.metaKey || e.ctrlKey || e.altKey) return false;
  act(m[0], m[1], ctx); return true;
}

const ONKEY = `var m={Enter:'go',Escape:'clear',ArrowUp:'next',ArrowDown:'prev'}[event.key];if(m){event.preventDefault();var b=document.getElementById('t-explorer-'+m);if(b&&!b.disabled)b.click();}`;

export function view(ctx) {
  const text = current(ctx), p = parse(text);
  const recent = (Array.isArray(ctx.data.recent) ? ctx.data.recent : []).filter((x) => Number.isInteger(x));
  const body = p.n != null ? page(p.n, ctx.band)
    : p.err ? `<div class="card t-explorer-empty"><p class="t-explorer-err">${esc(p.err)}</p><p class="muted">You typed “${esc(text)}”.</p></div>`
      : `<div class="card t-explorer-empty"><p class="t-explorer-lead">Every number has a page.</p><p class="muted">Type one above, or tap a number to open its page. Try 1729 — it has a secret.</p></div>`;
  return `<div class="t-explorer">
    <div class="card t-explorer-ask">
      <div class="t-explorer-bar">
        <button class="btn t-explorer-step" id="t-explorer-prev" data-act="lib" data-arg="step|-1" aria-label="One less" ${p.n > 0 ? '' : 'disabled'}>←</button>
        <input id="t-explorer-n" class="t-explorer-input" data-lib-input="n" inputmode="numeric" autocomplete="off" spellcheck="false" placeholder="360" value="${esc(text)}" aria-label="Type a whole number, from 0 to 1,000,000" onkeydown="${ONKEY}">
        <button class="btn t-explorer-step" id="t-explorer-next" data-act="lib" data-arg="step|1" aria-label="One more" ${p.n != null && p.n < MAX ? '' : 'disabled'}>→</button>
        <button class="btn primary" id="t-explorer-go" data-act="lib" data-arg="go|">Look it up</button>
        <button class="btn ghost" id="t-explorer-clear" data-act="lib" data-arg="clear|">Clear</button>
      </div>
      <div class="t-explorer-chips">
        ${QUICK.map((q) => `<button class="chip t-explorer-jump${q === p.n ? ' on' : ''}" data-act="lib" data-arg="set|${q}">${group(q)}</button>`).join('')}
        <button class="chip t-explorer-jump" data-act="lib" data-arg="random|">${icon('dice', 18)} Random</button>
        <button class="chip t-explorer-jump t-explorer-gold" data-act="lib" data-arg="surprise|">${icon('sparkle', 18)} Surprise me</button>
      </div>
    </div>
    ${body}
    ${recent.length ? `<div class="t-explorer-recent"><span class="muted small">Your recent numbers:</span> ${recent.map((q) => `<button class="chip t-explorer-jump" data-act="lib" data-arg="set|${q}">${group(q)}</button>`).join('')} <button class="btn small ghost" data-act="lib" data-arg="forget|">Forget them</button></div>` : ''}
    <p class="muted small t-explorer-hint">Enter looks it up · Esc clears · ← → step to the next number.</p>
  </div>`;
}

export const CSS = `
.t-explorer-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.t-explorer-input{font:700 26px var(--mono);padding:8px 14px;border:2px solid var(--line);border-radius:var(--r-md);background:var(--paper);color:var(--ink);flex:1 1 150px;min-width:0;width:10ch;letter-spacing:.02em}
.t-explorer-input:focus{outline:none;border-color:var(--action);box-shadow:var(--focus)}
.t-explorer-step{min-width:48px;font:800 20px var(--mono)}
.t-explorer-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.t-explorer-jump{border:1px solid var(--line);cursor:pointer;font-family:var(--mono);color:var(--ink)}
.t-explorer-jump:hover,.t-explorer-jump.on{border-color:var(--action);background:var(--action-tint)}
.t-explorer-gold{background:var(--treasure-tint);color:var(--treasure-deep);font-family:var(--ui)}
.t-explorer-recent{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 6px}
.t-explorer-hint{margin:6px 0 0;text-align:center}
.t-explorer-empty{text-align:center;padding:32px}
.t-explorer-lead{font:700 var(--fs-h2) var(--display);margin:0 0 6px}
.t-explorer-err{font:700 var(--fs-lead) var(--display);color:var(--fix);margin:0 0 6px}
.t-explorer-page{background:var(--paper);border:1px solid var(--line);border-radius:var(--r-xl);box-shadow:var(--sh-raised);padding:28px 30px;margin-bottom:16px}
.t-explorer-head{border-bottom:3px double var(--line);padding-bottom:16px;margin-bottom:6px}
.t-explorer-big{font:800 clamp(40px,9vw,64px)/1.05 var(--mono);color:var(--ink);letter-spacing:-.01em;word-break:break-all}
.t-explorer-words{font:italic 500 clamp(18px,3.4vw,24px)/1.35 var(--display);color:var(--muted);margin:6px 0 12px}
.t-explorer-tags{display:flex;flex-wrap:wrap;gap:6px}
.t-explorer-tags .chip{background:var(--action-tint);color:var(--action)}
.t-explorer-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:4px 28px}
.t-explorer-sec{padding:16px 0 6px;border-top:1px solid var(--line-soft);min-width:0}
.t-explorer-wide{grid-column:1/-1}
.t-explorer-sh{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:6px}
.t-explorer-sec h3{font:700 var(--fs-h3) var(--display);margin:0;color:var(--ink)}
.t-explorer-sec p{margin:6px 0;line-height:1.55}
.t-explorer-num,.t-explorer-eq,.t-explorer-pair,.t-explorer-d{font-family:var(--mono)}
.t-explorer-eq{font-size:20px;font-weight:700;text-align:center;margin:4px 0 8px}
.t-explorer-learn{border:0;background:none;padding:4px 0;color:var(--action);font-weight:700;font-size:var(--fs-label);cursor:pointer;white-space:nowrap}
.t-explorer-learn:hover{text-decoration:underline}
.t-explorer-yes{color:var(--mastered)}.t-explorer-no{color:var(--muted)}
.t-explorer-dots{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:flex-end;margin:8px 0}
.t-explorer-fig{margin:0;text-align:center}.t-explorer-fig .dg{margin:0 auto 4px}
.t-explorer-fig figcaption{font:600 var(--fs-label) var(--mono);color:var(--muted)}
.t-explorer-pairs{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.t-explorer-pair{padding:3px 10px;border-radius:var(--r-sm);background:var(--surface2);font-size:var(--fs-label);font-weight:600}
.t-explorer-dl{display:grid;grid-template-columns:max-content 1fr;gap:8px 14px;margin:6px 0}
.t-explorer-dl dt{font-weight:700;color:var(--muted);font-size:var(--fs-label);padding-top:3px}
.t-explorer-dl dd{margin:0;line-height:1.55}
.t-explorer-dl dd .chip{margin:0 6px 6px 0}
.t-explorer-tests{list-style:none;padding:0;margin:4px 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:6px 22px}
.t-explorer-tests li{display:grid;grid-template-columns:42px 20px 1fr;gap:6px;align-items:baseline;line-height:1.45}
.t-explorer-d{font-weight:800}
.t-explorer-tests .pass .t-explorer-mark{color:var(--mastered);font-weight:800}
.t-explorer-tests .fail{color:var(--muted)}.t-explorer-tests .fail .t-explorer-mark{color:var(--fix)}
.t-explorer-roman{font:700 30px var(--display);letter-spacing:.08em;margin:4px 0;word-break:break-all}
.t-explorer-round{margin:6px 0;padding-left:18px;line-height:1.6}.t-explorer-round b{font-family:var(--mono)}
.t-explorer-foot{margin:14px 0 0}
@media (max-width:560px){.t-explorer-page{padding:18px 16px}.t-explorer-dl{grid-template-columns:1fr}.t-explorer-tests li{grid-template-columns:38px 18px 1fr}.t-explorer-grid{grid-template-columns:1fr}}
`;

/* ------------------------------------------------------------ selftest */

export function selftest(ok, makeCtx) {
  // independent helpers — none of them shares code with what the page uses
  const primeBrute = (n) => { if (n < 2) return false; for (let i = 2; i < n; i++) { if (i * i > n) break; if (n % i === 0) return false; } return true; };
  const VAL = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
  const unword = (s) => { let tot = 0, cur = 0; for (const w of s.replace(/-/g, ' ').split(' ')) { if (w === 'and') continue; if (w === 'hundred') cur *= 100; else if (w === 'thousand') { tot += cur * 1000; cur = 0; } else if (w === 'million') { tot += cur * 1e6; cur = 0; } else if (w in VAL) cur += VAL[w]; else return NaN; } return tot + cur; };
  const RV = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  const unroman = (s) => { let t = 0; for (let i = 0; i < s.length; i++) { const v = RV[s[i]], nx = RV[s[i + 1]] || 0; t += v < nx ? -v : v; } return t; };
  const CANON = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;

  // word forms: the tricky ones, by hand
  const W = { 0: 'zero', 11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen', 15: 'fifteen', 16: 'sixteen', 17: 'seventeen', 18: 'eighteen', 19: 'nineteen',
    21: 'twenty-one', 40: 'forty', 100: 'one hundred', 101: 'one hundred and one', 110: 'one hundred and ten', 115: 'one hundred and fifteen', 360: 'three hundred and sixty',
    1000: 'one thousand', 1001: 'one thousand and one', 1010: 'one thousand and ten', 1100: 'one thousand one hundred', 1729: 'one thousand seven hundred and twenty-nine',
    2024: 'two thousand and twenty-four', 10000: 'ten thousand', 100000: 'one hundred thousand', 100001: 'one hundred thousand and one', 110000: 'one hundred and ten thousand',
    999999: 'nine hundred and ninety-nine thousand nine hundred and ninety-nine', 1000000: 'one million' };
  for (const [n, w] of Object.entries(W)) ok(words(+n) === w, `explorer: ${n} in words is "${words(+n)}", want "${w}"`);
  // every number to a million reads back to itself, with no doubled or stray spaces
  let wordBad = null;
  for (let n = 0; n <= MAX; n++) { const w = words(n); if (unword(w) !== n || /\s\s|^\s|\s$|undefined/.test(w)) { wordBad = n; break; } }
  ok(wordBad === null, `explorer: ${wordBad} in words does not read back ("${wordBad != null && words(wordBad)}")`);

  // Roman numerals: every one from 1 to 3999 is canonical and reads back
  for (let n = 1; n <= 3999; n++) { const r = roman(n); ok(CANON.test(r) && unroman(r) === n, `explorer: roman(${n}) = ${r}`); }
  for (const n of [1729, 3999, 444, 90]) { const ps = romanParts(n); ok(ps.reduce((a, [v]) => a + v, 0) === n && ps.map(([, s]) => s).join('') === roman(n), `explorer: roman parts of ${n}`); }
  ok(roman(1729) === 'MDCCXXIX' && roman(3999) === 'MMMCMXCIX' && roman(4) === 'IV', 'explorer: roman spot checks');

  // factors, primes, trees — every number to 2000, then a spread to a million
  const sample = [];
  for (let n = 1; n <= 2000; n++) sample.push(n);
  let s = 12345;
  const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  for (let i = 0; i < 400; i++) sample.push(1 + Math.floor(rnd() * MAX));
  sample.push(720720, 524288, 999983, 999999, MAX, 65536, 8128, 1729);
  const leaves = (t) => (t.kids ? [...leaves(t.kids[0]), ...leaves(t.kids[1])] : [t.v]);
  const treeOk = (t) => !t.kids || (t.kids[0].v * t.kids[1].v === t.v && t.kids[0].v > 1 && t.kids[1].v > 1 && treeOk(t.kids[0]) && treeOk(t.kids[1]));
  for (const n of sample) {
    const ps = pairs(n);
    ok(ps.length > 0 && ps.every(([a, b]) => a * b === n && a <= b && Number.isInteger(a) && Number.isInteger(b)), `explorer: factor pairs of ${n} multiply back`);
    const ds = divisors(n);
    ok(ds.length === new Set(ds).size && ds.every((d, i) => n % d === 0 && (i === 0 || d > ds[i - 1])), `explorer: divisors of ${n} are distinct, ascending, and divide`);
    if (n <= 2000) { let c = 0; for (let d = 1; d <= n; d++) if (n % d === 0) c++; ok(c === ds.length, `explorer: ${n} has ${c} divisors, page says ${ds.length}`); }
    const fs = primeFactors(n);
    ok(fs.reduce((a, [p, e]) => a * p ** e, 1) === n && fs.every(([p, e], i) => primeBrute(p) && e >= 1 && (i === 0 || p > fs[i - 1][0])), `explorer: prime factorisation of ${n} multiplies back from primes`);
    ok(isPrime(n) === primeBrute(n), `explorer: isPrime(${n})`);
    if (n > 1) { const t = tree(n), L = leaves(t); ok(treeOk(t) && L.every(primeBrute) && L.reduce((a, b) => a * b, 1) === n, `explorer: factor tree of ${n}`); }
    const r = isqrt(n); ok(r * r <= n && (r + 1) * (r + 1) > n, `explorer: square root of ${n} lies between ${r} and ${r + 1}`);
    const c = icbrt(n); ok(c ** 3 <= n && (c + 1) ** 3 > n, `explorer: cube root of ${n}`);
    ok(isSquare(n) === Number.isInteger(Math.sqrt(n)), `explorer: square? ${n}`);
    ok(isTriangular(n) === (() => { let t = 0; for (let k = 1; t < n; k++) t += k; return t === n; })(), `explorer: triangular? ${n}`);
    if (isTriangular(n)) ok(triIndex(n) * (triIndex(n) + 1) / 2 === n, `explorer: triangle index of ${n}`);
    ok(digitRoot(n) === 1 + ((n - 1) % 9), `explorer: digit root of ${n}`);
    ok(digitSum(n) === String(n).split('').reduce((a, d) => a + +d, 0), `explorer: digit sum of ${n}`);
    for (const t of tests(n)) ok(t.pass === (n % t.d === 0), `explorer: ${n} ÷${t.d} claim ${t.pass} but ${n} % ${t.d} = ${n % t.d}`);
    for (const [a, b] of twoCubes(n)) ok(a ** 3 + b ** 3 === n, `explorer: ${a}³ + ${b}³ ≠ ${n}`);
    const np = nextPrime(n); ok(np > n && primeBrute(np), `explorer: next prime after ${n}`);
    const pp = prevPrime(n); ok(pp === null ? n <= 2 : pp < n && primeBrute(pp), `explorer: prime before ${n}`);
    if (n <= 2000) { let q = n + 1; while (!primeBrute(q)) q++; ok(q === np, `explorer: ${np} is the NEXT prime after ${n}`); }
    const [lo, hi] = lineRange(n); ok(lo <= n && n <= hi && lo < hi && (hi - lo) % 10 === 0, `explorer: ${n} sits on its number line [${lo}, ${hi}]`);
    for (const p of [10, 100, 1000]) { const q = roundTo(n, p); ok(q % p === 0 && Math.abs(q - n) <= p / 2 && (Math.abs(q - n) < p / 2 || q > n), `explorer: ${n} to the nearest ${p} is ${q}`); }
  }
  for (const t of tests(0)) ok(t.pass, `explorer: 0 is divisible by ${t.d}`);
  let perfect = []; for (let n = 1; n <= 10000; n++) if (isPerfect(n)) perfect.push(n);
  ok(perfect.join() === '6,28,496,8128', `explorer: perfect numbers to 10,000 are ${perfect}`);
  ok(twoCubes(1729).length === 2 && twoCubes(1728).length === 0, 'explorer: 1729 is two cubes two ways');

  // parsing
  for (const [t, n] of [['360', 360], [' 1,729 ', 1729], ['1 000 000', MAX], ['0', 0], ['007', 7], ['1_000', 1000]]) ok(parse(t).n === n, `explorer: parses "${t}"`);
  for (const t of ['abc', '-5', '3.5', '1000001', '12a']) ok(parse(t).err, `explorer: refuses "${t}"`);
  ok(parse('').empty, 'explorer: empty input');

  // the page renders cleanly for all kinds of input, and every stop it links to is real
  const clean = (h) => typeof h === 'string' && h.length > 200 && !/undefined|NaN|\[object Object\]|Infinity/.test(h);
  for (const band of ['6-7', '8-10', '11-14']) for (const n of ['', '0', '1', '2', '4', '6', '12', '97', '100', '144', '360', '1729', '3999', '4000', '65536', '720720', '999983', '999999', '1000000', 'abc', '99999999', '<b>7</b>']) {
    const ctx = makeCtx('explorer', band); ctx.ui.n = n; const h = view(ctx);
    ok(clean(h), `explorer: view renders cleanly for "${n}" (${band})`);
    if (n.includes('<')) ok(!h.includes(n) && h.includes('&lt;b&gt;7&lt;/b&gt;'), `explorer: escapes what the child typed`);
    for (const m of h.matchAll(/data-act="openStop" data-arg="([^"]+)"/g)) ok(byId[m[1]], `explorer: links to a real stop (${m[1]})`);
    ok((h.match(/id="t-explorer-n"/g) || []).length === 1, 'explorer: one stable input id');
  }
  const h360 = (() => { const c = makeCtx('explorer'); c.ui.n = '360'; return view(c); })();
  ok(h360.includes('three hundred and sixty') && h360.includes('2³ × 3² × 5') && h360.includes('between <b>18</b> and <b>19</b>') && h360.includes('CCCLX'), 'explorer: the 360 page says what it should');

  // the flows: buttons, keys, recent numbers
  const ctx = makeCtx('explorer', '8-10');
  ok(clean(view(ctx)), 'explorer: fresh view');
  act('set', '1729', ctx); ok(ctx.ui.n === '1729' && ctx.data.recent[0] === 1729, 'explorer: a quick number opens and is remembered');
  act('step', '1', ctx); ok(ctx.ui.n === '1730' && ctx.data.recent[0] === 1730, 'explorer: → steps up');
  ok(key({ key: 'ArrowLeft' }, ctx) && ctx.ui.n === '1729', 'explorer: ← key steps down');
  ok(key({ key: 'Escape' }, ctx) && ctx.ui.n === '', 'explorer: Escape clears');
  ctx.ui.n = '28'; ok(key({ key: 'Enter' }, ctx) && ctx.data.recent[0] === 28, 'explorer: Enter looks it up and remembers');
  ok(!key({ key: 'q' }, ctx), 'explorer: other keys are left alone');
  for (let i = 0; i < 12; i++) act('random', '', ctx);
  ok(ctx.data.recent.length === 8 && new Set(ctx.data.recent).size === 8, 'explorer: recent list is capped at 8, no repeats');
  for (let i = 0; i < 30; i++) { act('surprise', '', ctx); const p = parse(ctx.ui.n); ok(p.n != null && p.n <= MAX, 'explorer: surprise gives a real number'); }
  ctx.ui.n = String(MAX); act('step', '1', ctx); ok(ctx.ui.n === String(MAX), 'explorer: never steps past a million');
  ctx.ui.n = '0'; act('step', '-1', ctx); ok(ctx.ui.n === '0', 'explorer: never steps below 0');
  const fresh = makeCtx('explorer'); fresh.data.recent = [97]; ok(/97<\/span> is prime/.test(view(fresh)), 'explorer: reopens on the last number');
  act('forget', '', ctx); ok(ctx.data.recent.length === 0, 'explorer: forgets on request');
}
