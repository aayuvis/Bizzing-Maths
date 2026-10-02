/* working.js — Show Me the Working: type a sum, see it worked out.

   Two or three methods side by side (tabs on a phone), each set out the way it
   is written on paper: the grid and column long multiplication with its
   carries, vertically-and-crosswise and Nikhilam where they fit, column adding
   and taking away with carries and exchanges, the bus stop, fractions over a
   common bottom, percentages built from 10% and 1%, and BODMAS one operation
   per line.

   The rule this file keeps is the Atlas's: every method's last line IS the
   answer, reached by that method's own steps — never copied in from a plain
   evaluation. selftest() then runs thousands of random sums of every kind
   through every method and holds each final line (and, for BODMAS, every
   line) to a plain Function-evaluated answer. All the fraction and decimal
   arithmetic is exact (BigInt rationals), so 0.1 + 0.2 is 0.3 here. */

import * as kit from '../chapters/kit.js';
import { byId } from '../tricks.js';
import { seeded } from '../rand.js';
import { META } from './shelf.js';

export const TOOL = META.working;   // name, blurb and art live on the shelf (shelf.js), which loads without the tool

const esc = kit.esc;
const groupS = (s) => { const [i, f] = String(s).split('.'); return i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (f != null ? '.' + f : ''); };
const g = (n) => (n < 0 ? '−' + groupS(-n) : groupS(n));
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const digitsOf = (n) => String(n).split('').map(Number);

/* ------------------------------------------------------ exact rationals */

const B = BigInt;
const babs = (x) => (x < 0n ? -x : x);
const bgcd = (a, b) => { a = babs(a); b = babs(b); while (b) [a, b] = [b, a % b]; return a; };
export function Q(n, d = 1) {
  n = B(n); d = B(d);
  if (d === 0n) throw new RangeError('zero');
  if (d < 0n) { n = -n; d = -d; }
  const k = bgcd(n, d) || 1n;
  return { n: n / k, d: d / k };
}
const qadd = (a, b) => Q(a.n * b.d + b.n * a.d, a.d * b.d);
const qsub = (a, b) => Q(a.n * b.d - b.n * a.d, a.d * b.d);
const qmul = (a, b) => Q(a.n * b.n, a.d * b.d);
const qdiv = (a, b) => { if (b.n === 0n) throw new RangeError('zero'); return Q(a.n * b.d, a.d * b.n); };
export const qnum = (q) => Number(q.n) / Number(q.d);
const qdec = (s) => { const [i, f = ''] = s.split('.'); return Q(B((i || '0') + f), 10n ** B(f.length)); };
const qint = (q) => q.d === 1n;
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
const lcm = (a, b) => (a / gcd(a, b)) * b;

/* A terminating decimal as text (with −), or null if it never ends. */
function decText(q, max = 8, commas = true) {
  let d = q.d; while (d % 2n === 0n) d /= 2n; while (d % 5n === 0n) d /= 5n;
  if (d !== 1n) return null;
  const neg = q.n < 0n, n = babs(q.n), ip = n / q.d; let r = n % q.d, f = '';
  while (r && f.length < max) { r *= 10n; f += String(r / q.d); r %= q.d; }
  if (r) return null;
  return (neg ? '−' : '') + (commas ? groupS(String(ip)) : String(ip)) + (f ? '.' + f : '');
}
const fr = (n, d) => `<span class="t-working-fr"><span>${n}</span><span>${d}</span></span>`;
/* A value as a child would write it: whole, decimal, or (mixed) fraction. */
function qHtml(q, { mixed = true, preferFrac = false } = {}) {
  if (qint(q)) return groupS(String(q.n)).replace(/^-/, '−');
  const dec = preferFrac ? null : decText(q, 6);
  if (dec) return dec;
  const neg = q.n < 0n, n = babs(q.n);
  if (mixed && n > q.d) return `${neg ? '−' : ''}${groupS(String(n / q.d))}&thinsp;${fr(String(n % q.d), String(q.d))}`;
  return `${neg ? '−' : ''}${fr(String(n), String(q.d))}`;
}
const approx = (q) => { const v = qnum(q); return Math.abs(v) >= 1e6 ? v.toExponential(4) : String(+v.toFixed(4)); };

/* ------------------------------------------------------ parsing */

export function normalise(s) {
  return String(s == null ? '' : s).toLowerCase()
    .replace(/what\s+is|work\s+out|calculate|please|\?|=\s*$/g, ' ')
    .replace(/\bmultiplied\s+by\b|\btimes\b|\blots\s+of\b/g, '*')
    .replace(/\bdivided\s+by\b|\bshared\s+by\b/g, '÷')
    .replace(/\bplus\b|\badd\b/g, '+')
    .replace(/\bminus\b|\btake\s+away\b/g, '-')
    .replace(/\bpercent\b|\bper\s+cent\b/g, '%')
    .replace(/[×x✕✖*·∙]/g, '*')
    .replace(/[÷:]/g, '÷')
    .replace(/[−–—]/g, '-')
    .replace(/[[{]/g, '(').replace(/[\]}]/g, ')')
    .replace(/²/g, '^2').replace(/³/g, '^3')
    .replace(/(\d),(?=\d{3}(?!\d))/g, '$1')
    .replace(/\s+/g, ' ').trim()
    .replace(/(\d) (?=\d{3}(?![\d/]))/g, '$1')   // 1 000 000 — but not the 1 in a mixed number like 1 1/2
    .replace(/ ?([+\-*÷^()%]) ?/g, '$1')           // tidy spaces round operators (a slash keeps its spaces: 3/4 / 1/2)
    .replace(/\bof\b/g, ' of ').replace(/\s+/g, ' ').trim();
}

const TERM = '(\\d+ \\d+\\/\\d+|\\d+\\/\\d+|\\d+)';
const RE_PCT = /^(\d+(?:\.\d+)?|\.\d+)%(?: ?of ?|\*)(\d+(?:\.\d+)?|\.\d+)$/;
const RE_FDIV = /^(\d+)\/(\d+) \/ (\d+)\/(\d+)$/;
const RE_FRAC = new RegExp(`^${TERM} ?([+\\-*÷]|of) ?${TERM}$`);
const RE_BIN = /^(\d+) ?([+\-*÷/]) ?(\d+)$/;
const RE_ADDS = /^\d+(?:\+\d+){2,5}$/;
function fterm(s) {
  let m;
  if ((m = s.match(/^(\d+) (\d+)\/(\d+)$/))) return { w: +m[1], n: +m[2], d: +m[3], mixed: true };
  if ((m = s.match(/^(\d+)\/(\d+)$/))) return { w: 0, n: +m[1], d: +m[2] };
  return { w: +s, n: 0, d: 1, whole: true };
}

export const EXAMPLES = ['23 × 47', '96 × 97', '347 × 26', '4,508 + 2,796', '6,003 − 2,478', '1,234 ÷ 7', '3/4 + 2/5', '2/3 ÷ 4/9', '35% of 80', '3 + 4 × (10 − 2) ÷ 8'];
const FORMS = 'I can work out sums like 23 × 47, 4508 + 2796, 6003 − 2478, 1234 ÷ 7, 3/4 + 2/5, 35% of 80, or 3 + 4 × (10 − 2).';

/* solve(text) → { kind, title, sum (html), answer (html), methods: [{id, name, stop, html, value, data}], note, foot }
   or { error }. */
export function solve(text) {
  const t = normalise(text);
  if (!t) return { empty: true };
  let m;
  try {
    if ((m = t.match(RE_PCT))) return percent(m[1], m[2]);
    if ((m = t.match(RE_FDIV))) return fractions({ w: 0, n: +m[1], d: +m[2] }, '÷', { w: 0, n: +m[3], d: +m[4] });
    if ((m = t.match(RE_FRAC)) && (m[1].includes('/') || m[3].includes('/'))) {
      const a = fterm(m[1]), b = fterm(m[3]), op = m[2] === 'of' ? '*' : m[2];
      if ([a, b].some((x) => x.d === 0)) return { error: 'A fraction can’t have 0 on the bottom — there is no such thing as a zeroth.' };
      if ([a, b].some((x) => x.w > 9999 || x.n > 9999 || x.d > 9999)) return bodmas(t, 'Those fractions are too big to set out by hand, so here it is worked out directly.');
      return fractions(a, op, b);
    }
    if ((m = t.match(RE_BIN))) {
      const a = +m[1], b = +m[3], op = m[2], la = m[1].length, lb = m[3].length;
      if (op === '*') { if (Math.max(la, lb) <= 4 && Math.min(la, lb) <= 3) return multiply(a, b); return bodmas(t, 'That is bigger than 4-digit × 3-digit, so here is the answer without the columns.'); }
      if (op === '+') { if (Math.max(la, lb) <= 7) return addition([a, b]); return bodmas(t, 'Columns go up to 7 digits here.'); }
      if (op === '-') { if (Math.max(la, lb) <= 7) return subtraction(a, b); return bodmas(t, 'Columns go up to 7 digits here.'); }
      if (b === 0) return { error: 'You can’t share into 0 groups, so dividing by 0 has no answer.' };
      if (b <= 99 && la <= 7) return division(a, b);
      return bodmas(t, 'Short division here works for dividing by numbers up to 99.');
    }
    if (RE_ADDS.test(t) && t.split('+').every((x) => x.length <= 7)) return addition(t.split('+').map(Number));
    return bodmas(t);
  } catch (e) {
    if (e instanceof RangeError && e.message === 'zero') return { error: 'Somewhere in there is a divide by 0 — and dividing by 0 has no answer.' };
    if (e instanceof RangeError) return { error: e.message };
    throw e;
  }
}

/* ------------------------------------------------------ typesetting */

/* A column sum: rows of cells, right-aligned in a fixed number of columns. */
function colTable(rows, W) {
  return `<div class="t-working-scroll"><table class="t-working-col" role="presentation">${rows.map((r) => {
    const cells = r.cells || [], pad = Array(Math.max(0, W - cells.length)).fill('');
    return `<tr class="${r.cls || ''}"><td class="t-working-s">${r.sign || ''}</td>${[...pad, ...cells].map((c) => `<td>${c}</td>`).join('')}<td class="t-working-note">${r.note || ''}</td></tr>`;
  }).join('')}</table></div>`;
}
/* A {column-from-the-right: value} map as W cells. */
const fromRight = (map, W, f = (v) => v) => Array.from({ length: W }, (_, i) => (map[W - 1 - i] ? f(map[W - 1 - i]) : ''));
const steps = (lines) => `<ol class="t-working-steps">${lines.map((l) => `<li>${l}</li>`).join('')}</ol>`;
const final = (html) => `<p class="t-working-final"><span>=</span> ${html}</p>`;
const learn = (stop) => (byId[stop] ? `<button class="t-working-learn" data-act="openStop" data-arg="${stop}" title="${esc(byId[stop].title)}">Learn it in the Atlas →</button>` : '');
const parts = (n) => { const s = String(n), p = []; for (let i = 0; i < s.length; i++) if (+s[i]) p.push(+s[i] * 10 ** (s.length - 1 - i)); return p.length ? p : [0]; };
const droot = (n) => { let x = n; while (x > 9) x = digitsOf(x).reduce((a, b) => a + b, 0); return x; };
const rootChain = (n) => { const c = [n]; while (c.at(-1) > 9) c.push(digitsOf(c.at(-1)).reduce((a, b) => a + b, 0)); return c; };

/* ------------------------------------------------------ × */

function mulGrid(a, b) {
  const A = parts(a), Bs = parts(b), cells = A.map((x) => Bs.map((y) => x * y)), rows = cells.map((r) => r.reduce((s, v) => s + v, 0));
  const total = rows.reduce((s, v) => s + v, 0);
  const html = `<div class="t-working-scroll"><table class="t-working-grid"><tr><th class="t-working-corner">×</th>${Bs.map((y) => `<th>${g(y)}</th>`).join('')}${A.length > 1 || Bs.length > 1 ? '<th class="t-working-rt">row</th>' : ''}</tr>
    ${A.map((x, i) => `<tr><th>${g(x)}</th>${cells[i].map((c) => `<td>${g(c)}</td>`).join('')}${A.length > 1 || Bs.length > 1 ? `<td class="t-working-rt">${g(rows[i])}</td>` : ''}</tr>`).join('')}</table></div>
    ${steps([`Split ${g(a)} into ${A.map(g).join(' + ')}${Bs.length > 1 ? ` and ${g(b)} into ${Bs.map(g).join(' + ')}` : ''}.`, 'Multiply each pair — one box each.', rows.length > 1 ? `Add the rows: ${rows.map(g).join(' + ')}` : 'That one row is the answer.'])}`;
  return { id: 'grid', name: 'The grid method', stop: 'split-multiply', html: html + final(g(total)), value: Q(total), data: { A, Bs, cells, total } };
}

function mulColumn(a, b) {
  let top = a, bot = b;
  if (String(b).length > String(a).length) [top, bot] = [b, a];
  const td = digitsOf(top), bd = digitsOf(bot).reverse(), partials = [];
  bd.forEach((d, i) => {
    if (d === 0 && bd.length > 1) { partials.push({ i, d, skip: true, value: 0 }); return; }
    let carry = 0; const out = [], carries = {};
    for (let k = td.length - 1, col = i; k >= 0; k--, col++) { const t = td[k] * d + carry; out.unshift(t % 10); carry = Math.floor(t / 10); if (carry && k > 0) carries[col + 1] = carry; }
    if (carry) out.unshift(carry);
    let digits = out.join('').replace(/^0+(?=\d)/, '');
    const value = Number(digits) * 10 ** i;
    if (value === 0) digits = '0'; else digits += '0'.repeat(i);
    partials.push({ i, d, digits, carries, value });
  });
  const live = partials.filter((p) => !p.skip);
  let total, addCarries = {};
  if (live.length === 1) total = live[0].value;
  else {
    const W = Math.max(...live.map((p) => p.digits.length)), ds = live.map((p) => p.digits.padStart(W, '0').split('').map(Number).reverse()), out = [];
    let carry = 0;
    for (let col = 0; col < W; col++) { const s = ds.reduce((acc, r) => acc + r[col], 0) + carry; out.push(s % 10); carry = Math.floor(s / 10); if (carry && col + 1 < W) addCarries[col + 1] = carry; }
    while (carry) { out.push(carry % 10); carry = Math.floor(carry / 10); }
    total = Number(out.reverse().join(''));
  }
  const W = Math.max(String(top).length, String(bot).length + 1, ...live.map((p) => p.digits.length), String(total).length);
  const rows = [{ cells: digitsOf(top) }, { sign: '×', cells: digitsOf(bot) }];
  live.forEach((p, j) => {
    if (Object.keys(p.carries).length) rows.push({ cls: 't-working-carry' + (j === 0 ? ' t-working-ruled' : ''), cells: fromRight(p.carries, W) });
    const ds = p.digits.split(''), ph = p.value ? p.i : 0;
    rows.push({ cls: j === 0 && !Object.keys(p.carries).length ? 't-working-ruled' : '', cells: ds.map((c, k) => (k >= ds.length - ph ? `<span class="t-working-ph">${c}</span>` : c)), note: `${g(top)} × ${g(p.d * 10 ** p.i)}` });
  });
  if (live.length > 1) {
    if (Object.keys(addCarries).length) rows.push({ cls: 't-working-carry', cells: fromRight(addCarries, W) });
    rows.push({ cls: 't-working-ruled t-working-total', cells: digitsOf(total), note: 'add the rows' });
  } else rows[rows.length - 1].cls += ' t-working-total';
  const skipped = partials.filter((p) => p.skip);
  const html = colTable(rows, W) + (skipped.length ? `<p class="muted small">${skipped.length > 1 ? 'The 0s' : 'The 0'} in ${g(bot)} would only make ${skipped.length > 1 ? 'rows' : 'a row'} of zeros, so ${skipped.length > 1 ? 'they are' : 'it is'} left out.</p>` : '')
    + (live.some((p) => p.i) ? '<p class="muted small">The pale zeros hold the place: a tens digit multiplies by tens, so its row starts one place to the left.</p>' : '');
  return { id: 'column', name: 'Column long multiplication', stop: 'long-multiply', html: html + final(g(total)), value: Q(total), data: { top, bot, partials, total } };
}

function crossSvg(p, q, s, t) {
  const panel = (ox, kind) => {
    const X = [ox + 18, ox + 58], Y = [22, 70];
    let l = '';
    if (kind === 0) l = `<line x1="${X[1]}" y1="${Y[0] + 8}" x2="${X[1]}" y2="${Y[1] - 18}" class="dg-line"/>`;
    if (kind === 1) l = `<line x1="${X[0] + 6}" y1="${Y[0] + 6}" x2="${X[1] - 6}" y2="${Y[1] - 18}" class="dg-line"/><line x1="${X[1] - 6}" y1="${Y[0] + 6}" x2="${X[0] + 6}" y2="${Y[1] - 18}" class="dg-line"/>`;
    if (kind === 2) l = `<line x1="${X[0]}" y1="${Y[0] + 8}" x2="${X[0]}" y2="${Y[1] - 18}" class="dg-line"/>`;
    return l + kit.text(X[0], Y[0], p, 'dg-big') + kit.text(X[1], Y[0], q, 'dg-big') + kit.text(X[0], Y[1], s, 'dg-big') + kit.text(X[1], Y[1], t, 'dg-big') + kit.text(ox + 38, 96, ['1 · units', '2 · crosswise', '3 · tens'][kind], 'dg-small');
  };
  return kit.svg(300, 104, panel(0, 0) + panel(104, 1) + panel(208, 2), 'Vertically and crosswise: units, then crosswise, then tens');
}
function mulCross(a, b) {
  const [p, q] = digitsOf(a), [s, t] = digitsOf(b);
  const u = q * t, u0 = u % 10, k0 = Math.floor(u / 10);
  const c = p * t + q * s + k0, c0 = c % 10, k1 = Math.floor(c / 10);
  const h = p * s + k1, total = h * 100 + c0 * 10 + u0;
  const html = crossSvg(p, q, s, t) + steps([
    `<b>Vertically</b> (units): ${q} × ${t} = ${u}. Write <b>${u0}</b>${k0 ? `, carry ${k0}` : ''}.`,
    `<b>Crosswise</b>: ${p} × ${t} + ${q} × ${s}${k0 ? ` + ${k0}` : ''} = ${c}. Write <b>${c0}</b>${k1 ? `, carry ${k1}` : ''}.`,
    `<b>Vertically</b> (tens): ${p} × ${s}${k1 ? ` + ${k1}` : ''} = <b>${h}</b>.`,
    `Read it off: ${h} | ${c0} | ${u0}.`,
  ]);
  return { id: 'crosswise', name: 'Vertically and crosswise', stop: 'crosswise', html: html + final(g(total)), value: Q(total), data: { total } };
}
function mulNikhilam(a, b) {
  const da = a - 100, db = b - 100, left = a + db, right = da * db, total = left * 100 + right;
  const gap = (n, d) => `${g(n)} is ${Math.abs(d)} ${d < 0 ? 'below' : d > 0 ? 'above' : 'away from'} 100`;
  const sg = (d) => (d < 0 ? `(−${-d})` : `${d}`);
  const join = right >= 0 && right < 100 ? `Put them side by side: ${g(left)} | ${String(right).padStart(2, '0')}.`
    : right < 0 ? `The right part is below zero, so take it from the hundreds: ${g(left)} × 100 − ${-right} = ${g(total)}.`
      : `The right part has three digits, so carry: ${g(left)} × 100 + ${right} = ${g(total)}.`;
  const html = steps([
    `${gap(a, da)}; ${gap(b, db)}.`,
    `<b>Cross</b>: ${g(a)} ${db < 0 ? '−' : '+'} ${Math.abs(db)} = <b>${g(left)}</b> (or ${g(b)} ${da < 0 ? '−' : '+'} ${Math.abs(da)} — the same).`,
    `<b>Multiply the gaps</b>: ${sg(da)} × ${sg(db)} = <b>${right < 0 ? '−' + -right : right}</b>.`,
    join,
  ]);
  return { id: 'nikhilam', name: 'Nikhilam: near a hundred', stop: da > 0 && db > 0 ? 'above-100' : 'nikhilam-100', html: html + final(g(total)), value: Q(total), data: { left, right, total } };
}
function nines(a, b, ans) {
  const ca = rootChain(a), cb = rootChain(b), prod = droot(a) * droot(b), cp = rootChain(prod), cn = rootChain(ans);
  const ch = (c) => c.map(g).join(' → ');
  return { match: cp.at(-1) === cn.at(-1), html: `<div class="t-working-nines"><b>Check it with nines.</b> Add up digits until one is left: ${ch(ca)} and ${ch(cb)}. Multiply those: ${droot(a)} × ${droot(b)} = ${ch(cp)}. Now the answer: ${ch(cn)}. ${cp.at(-1) === cn.at(-1) ? '<b class="t-working-ok">They match ✓</b>' : '<b class="t-working-bad">They don’t match ✗</b>'} A slip almost always shows up here — though swapping two digits of the answer would sneak past. ${learn('digit-root')}</div>` };
}
function multiply(a, b) {
  const ms = [mulGrid(a, b), mulColumn(a, b)];
  if (a >= 10 && a <= 99 && b >= 10 && b <= 99) ms.push(mulCross(a, b));
  if (Math.abs(a - 100) <= 12 && Math.abs(b - 100) <= 12 && !(a === 100 && b === 100)) ms.push(mulNikhilam(a, b));
  const ans = a * b, n9 = nines(a, b, ans);
  return { kind: 'mul', label: 'Multiplication', sum: `${g(a)} × ${g(b)}`, answer: g(ans), methods: ms, foot: n9.html, nines: n9 };
}

/* ------------------------------------------------------ + and − */

function addColumn(nums) {
  const W = Math.max(...nums.map((n) => String(n).length)), ds = nums.map((n) => String(n).padStart(W, '0').split('').map(Number).reverse());
  const out = [], carries = {}; let carry = 0;
  for (let col = 0; col < W; col++) { const s = ds.reduce((acc, r) => acc + r[col], 0) + carry; out.push(s % 10); carry = Math.floor(s / 10); if (carry && col + 1 < W) carries[col + 1] = carry; }
  const tail = []; while (carry) { tail.push(carry % 10); carry = Math.floor(carry / 10); }
  const total = Number([...out, ...tail].reverse().join(''));
  const CW = Math.max(W, String(total).length);
  const rows = nums.map((n, i) => ({ sign: i === nums.length - 1 ? '+' : '', cells: digitsOf(n) }));
  if (Object.keys(carries).length) rows.push({ cls: 't-working-carry t-working-under', cells: fromRight(carries, CW) });
  rows.push({ cls: 't-working-ruled t-working-total', cells: digitsOf(total) });
  const html = colTable(rows, CW) + steps(['Line up the units, then add from the right.', Object.keys(carries).length ? 'When a column makes 10 or more, write the units and carry the tens into the next column (the small digits).' : 'No column reaches 10, so there is nothing to carry.']);
  return { id: 'column', name: 'Column addition', stop: 'column-add', html: html + final(g(total)), value: Q(total), data: { ds, out: [...out, ...tail], carries, total } };
}
function nearRound(b) {
  for (const p of [1000000, 100000, 10000, 1000, 100, 10]) {
    if (p > 10 && p > b * 2) continue;
    const up = Math.ceil(b / p) * p, d = up - b;
    if (d >= 1 && d <= 3) return { up, d };
  }
  return null;
}
function addMental(a, b) {
  let x = a, y = b, nr = nearRound(b);
  if (!nr && nearRound(a)) { x = b; y = a; nr = nearRound(a); }
  if (nr) {
    const s1 = x + nr.up, total = s1 - nr.d;
    return { id: 'mental', name: 'In your head: round and adjust', stop: 'round-add', value: Q(total), data: { total },
      html: steps([`${g(y)} is just ${nr.d} short of ${g(nr.up)}, which is easy to add.`, `${g(x)} + ${g(nr.up)} = ${g(s1)}`, `That added ${nr.d} too many, so take ${nr.d} back: ${g(s1)} − ${nr.d} = ${g(total)}`]) + final(g(total)) };
  }
  let cur = x; const lines = [];
  for (const p of parts(y)) { if (!p) continue; lines.push(`${g(cur)} + ${g(p)} = <b>${g(cur + p)}</b>`); cur += p; }
  if (!lines.length) lines.push(`${g(x)} + 0 = ${g(x)}`);
  return { id: 'mental', name: 'In your head: add it in parts', stop: 'tens-then-ones', value: Q(cur), data: { total: cur },
    html: `<p>Keep ${g(x)} whole and add ${g(y)} one place at a time${parts(y).length > 1 ? ` (${parts(y).map(g).join(' + ')})` : ''}:</p>` + steps(lines) + final(g(cur)) };
}
function addition(nums) {
  const col = addColumn(nums), ms = [col];
  if (nums.length === 2) ms.push(addMental(nums[0], nums[1]));
  else {
    let cur = 0; const lines = nums.map((n, i) => { cur += n; return i === 0 ? `Start with ${g(n)}` : `+ ${g(n)} → <b>${g(cur)}</b>`; });
    ms.push({ id: 'running', name: 'One at a time', stop: 'tens-then-ones', value: Q(cur), data: { total: cur }, html: steps(lines) + final(g(cur)) });
  }
  const total = nums.reduce((s, n) => s + n, 0);
  return { kind: 'add', label: 'Adding', sum: nums.map(g).join(' + '), answer: g(total), methods: ms };
}

function subColumn(a, b) {   // a ≥ b
  const W = String(a).length, top = digitsOf(a).reverse(), bot = String(b).padStart(W, '0').split('').map(Number).reverse(), cur = top.slice();
  let exchanges = 0;
  for (let i = 0; i < W; i++) {
    if (cur[i] >= bot[i]) continue;
    let j = i + 1; while (cur[j] === 0) j++;
    cur[j] -= 1; for (let k = j - 1; k > i; k--) cur[k] += 9;
    cur[i] += 10; exchanges++;
  }
  const out = cur.map((c, i) => c - bot[i]);
  const total = Number(out.slice().reverse().join(''));
  const changed = {}; cur.forEach((c, i) => { if (c !== top[i]) changed[i] = c; });
  const rows = [];
  if (exchanges) rows.push({ cls: 't-working-carry t-working-exch', cells: Array.from({ length: W }, (_, k) => { const i = W - 1 - k; return i in changed ? String(changed[i]) : ''; }) });
  rows.push({ cells: Array.from({ length: W }, (_, k) => { const i = W - 1 - k; return i in changed ? `<s>${top[i]}</s>` : String(top[i]); }) });
  rows.push({ sign: '−', cells: digitsOf(b) });
  rows.push({ cls: 't-working-ruled t-working-total', cells: digitsOf(total) });
  return { html: colTable(rows, W), total, data: { top, bot, cur, out, total }, exchanges };
}
function countUp(from, to) {
  const jumps = []; let cur = from;
  for (let p = 10; p <= 1000000; p *= 10) { if (cur % p === 0) continue; const nx = Math.ceil(cur / p) * p; if (nx > to) break; jumps.push([cur, nx]); cur = nx; }
  for (let p = 1000000; p >= 1; p /= 10) { const nx = Math.floor(to / p) * p; if (nx > cur) { jumps.push([cur, nx]); cur = nx; } }
  return jumps;
}
function jumpSvg(jumps) {
  const n = jumps.length, S = 96, W = n * S + 50; let s = `<line x1="14" y1="64" x2="${W - 14}" y2="64" class="dg-line"/>`;
  jumps.forEach(([x, y], i) => {
    const x0 = 25 + i * S, x1 = x0 + S;
    s += `<path d="M${x0},60 Q${(x0 + x1) / 2},${14} ${x1},60" class="dg-arc"/>` + kit.text((x0 + x1) / 2, 30, `+${g(y - x)}`, 'dg-accent');
    s += `<line x1="${x0}" y1="58" x2="${x0}" y2="70" class="dg-line"/>` + kit.text(x0, 88, g(x), 'dg-small');
  });
  const xe = 25 + n * S; s += `<line x1="${xe}" y1="58" x2="${xe}" y2="70" class="dg-line"/>` + kit.text(xe, 88, g(jumps.at(-1)[1]), 'dg-small');
  return kit.svg(W, 96, s, 'Counting up in jumps on an empty number line');
}
function subMental(a, b) {   // a ≥ b
  const nr = nearRound(b);
  if (nr && nr.up <= a) {
    const s1 = a - nr.up, total = s1 + nr.d;
    return { id: 'mental', name: 'In your head: take too much, give it back', stop: 'round-sub', value: Q(total), data: { total },
      html: steps([`${g(b)} is just ${nr.d} short of ${g(nr.up)}.`, `Take away ${g(nr.up)}: ${g(a)} − ${g(nr.up)} = ${g(s1)}`, `That took ${nr.d} too many, so give ${nr.d} back: ${g(s1)} + ${nr.d} = ${g(total)}`]) + final(g(total)) };
  }
  const jumps = countUp(b, a), total = jumps.reduce((s, [x, y]) => s + (y - x), 0);
  return { id: 'mental', name: 'In your head: count up', stop: 'count-up', value: Q(total), data: { total, jumps },
    html: (jumps.length ? `<p>Start at ${g(b)} and jump to friendly numbers until you reach ${g(a)}.</p>` + jumpSvg(jumps) + steps([`Add the jumps: ${jumps.map(([x, y]) => g(y - x)).join(' + ')}`])
      : `<p>${g(a)} and ${g(b)} are the same, so there is no gap at all.</p>`) + final(g(total)) };
}
function subtraction(a, b) {
  const neg = a < b, [x, y] = neg ? [b, a] : [a, b];
  const pre = neg ? `<p class="t-working-flip">${g(a)} is smaller than ${g(b)}, so the answer is below zero. Work out ${g(x)} − ${g(y)}, then put a minus sign in front.</p>` : '';
  const c = subColumn(x, y), sign = (v) => (neg && v ? -v : v);
  const col = { id: 'column', name: 'Column subtraction', stop: 'column-sub', value: Q(sign(c.total)), data: c.data,
    html: pre + c.html + steps(['Line up the units, then take away from the right.', c.exchanges ? 'When the top digit is too small, exchange: take 1 from the column to its left and make this one 10 bigger (the small digits show the new values).' : 'Every top digit is big enough, so there is nothing to exchange.']) + final(g(sign(c.total))) };
  const mm = subMental(x, y);
  const mental = { ...mm, value: Q(sign(qnum(mm.value))), html: pre + mm.html.replace(/<p class="t-working-final">[\s\S]*<\/p>$/, final(g(sign(qnum(mm.value))))) };
  return { kind: 'sub', label: 'Taking away', sum: `${g(a)} − ${g(b)}`, answer: g(a - b), methods: [col, mental] };
}

/* ------------------------------------------------------ ÷ */

function shortDiv(a, b) {
  const cols = []; let rem = 0;
  for (const x of digitsOf(a)) { const cur = rem * 10 + x; cols.push({ x, q: Math.floor(cur / b), c: rem, cur }); rem = cur % b; }
  const quot = Number(cols.map((c) => c.q).join(''));
  const seen = new Map(), dec = []; let r = rem;
  while (r !== 0 && !seen.has(r) && dec.length < 200) { seen.set(r, dec.length); const cur = r * 10; dec.push({ x: 0, q: Math.floor(cur / b), c: r, cur }); r = cur % b; }
  const start = r === 0 ? dec.length : seen.get(r);
  return { cols, quot, rem, dec, pre: dec.slice(0, start).map((d) => d.q).join(''), rep: dec.slice(start).map((d) => d.q).join('') };
}
function busTable(b, cols, remTxt = '') {
  // leading zeros in the answer are pale — except the last one before the point, which is the answer's units
  const dot = cols.findIndex((c) => c.x === '.'), lastInt = (dot < 0 ? cols.length : dot) - 1;
  const firstNZ = cols.findIndex((c) => c.x !== '.' && c.q !== 0);
  const qs = cols.map((c, i) => (c.x === '.' ? '.' : i < lastInt && (firstNZ < 0 || i < firstNZ) ? '<span class="t-working-ph">0</span>' : String(c.q)));
  return `<div class="t-working-scroll"><table class="t-working-bus" role="presentation">
    <tr><td></td>${qs.map((q) => `<td class="t-working-q">${q}</td>`).join('')}${remTxt ? `<td class="t-working-r">${remTxt}</td>` : ''}</tr>
    <tr><td class="t-working-dv">${b}</td>${cols.map((c, i) => `<td class="t-working-in${i === 0 ? ' first' : ''}">${c.x === '.' ? '.' : `${c.c ? `<sup>${c.c}</sup>` : ''}${c.x}`}</td>`).join('')}${remTxt ? '<td></td>' : ''}</tr></table></div>`;
}
export function decValue(ip, pre, rep) {
  const k = B(pre.length), base = Q(B(ip)), p = pre ? Q(B(pre), 10n ** k) : Q(0);
  if (!rep) return qadd(base, p);
  const m = B(rep.length);
  return qadd(qadd(base, p), Q(B(rep), 10n ** k * (10n ** m - 1n)));
}
function division(a, b) {
  const sd = shortDiv(a, b), { quot, rem } = sd;
  const lines = sd.cols.map((c) => (c.cur < b && c !== sd.cols.at(-1) ? `${b} into ${c.cur} won’t go: write 0${c.cur ? `, carry ${c.cur}` : ''}.` : `${b} into ${c.cur} goes <b>${c.q}</b>${c.cur % b ? `, remainder ${c.cur % b}${c === sd.cols.at(-1) ? '' : ' — carry it'}` : ''}.`));
  const short = { id: 'short', name: 'Short division (the bus stop)', stop: 'short-division', value: qadd(Q(quot), Q(rem, b)), data: sd,
    html: busTable(b, sd.cols, rem ? `r ${rem}` : '') + (sd.cols.length <= 8 ? steps(lines) : '') + `<p class="muted small">Check: ${g(quot)} × ${b}${rem ? ` + ${rem}` : ''} = ${g(quot * b + rem)}</p>` + final(`${g(quot)}${rem ? ` <span class="t-working-rem">remainder ${rem}</span>` : ''}`) };
  const k = gcd(rem, b), rn = rem / k, rd = b / k;
  const mixed = { id: 'mixed', name: 'As a mixed number', stop: 'mixed-numbers', value: qadd(Q(quot), rem ? Q(rn, rd) : Q(0)), data: { quot, rn, rd },
    html: steps(rem ? [`The remainder is ${rem} out of ${b} — a fraction of one more share: ${fr(rem, b)}.`, k > 1 ? `Simplify: ${fr(rem, b)} = ${fr(rn, rd)} (divide top and bottom by ${k}).` : `${fr(rem, b)} is already in its simplest form.`] : ['There is no remainder, so it is a whole number.'])
      + final(rem ? `${quot ? g(quot) + '&thinsp;' : ''}${fr(rn, rd)}` : g(quot)) };
  const show = Math.min(sd.dec.length, 8), cut = sd.dec.length > show;
  const dv = decValue(quot, sd.pre, sd.rep);
  const decTxt = !rem ? g(quot) : sd.rep && sd.pre.length + sd.rep.length <= 10
    ? `${g(quot)}.${sd.pre}<span class="t-working-rep">${sd.rep}</span>`
    : `${g(quot)}.${[...sd.pre, ...sd.rep].join('').slice(0, 10)}${sd.rep ? '…' : ''}`;
  const decNote = !rem ? 'No remainder, so no decimal places are needed.'
    : !sd.rep ? `Keep going past the point with zeros until nothing is left over: ${sd.dec.length} decimal place${sd.dec.length > 1 ? 's' : ''}.`
      : `Keep going past the point with zeros. The remainders start to repeat, so the digits${sd.rep.length === 1 ? ` ${sd.rep}` : ''} ${sd.rep.length > 1 ? `in a block of ${sd.rep.length} ` : ''}go on for ever${sd.pre.length + sd.rep.length <= 10 ? ' (the line on top marks them)' : ''}.`;
  const decimal = { id: 'decimal', name: 'As a decimal', stop: 'fraction-decimal-percent', value: dv, data: { ip: quot, pre: sd.pre, rep: sd.rep },
    html: (rem ? busTable(b, [...sd.cols, { x: '.', q: '.' }, ...sd.dec.slice(0, show)]) + (cut ? '<p class="muted small">…and on it goes.</p>' : '') : '') + steps([decNote]) + final(decTxt) };
  return { kind: 'div', label: 'Dividing', sum: `${g(a)} ÷ ${b}`, answer: rem ? `${g(quot)} r ${rem}` : g(quot), methods: [short, mixed, decimal] };
}

/* ------------------------------------------------------ fractions */

const fx = (t) => (t.whole ? g(t.w) : t.mixed ? `${t.w}&thinsp;${fr(t.n, t.d)}` : fr(t.n, t.d));
function simplify(n, d, lines) {
  const k = gcd(n, d) || 1;
  if (d < 0) { n = -n; d = -d; }
  if (k > 1 && n !== 0) lines.push(`Simplify: divide top and bottom by ${k} → ${fr(n / k, d / k)}`);
  else if (n === 0) lines.push('The top is 0, so the answer is 0.');
  else lines.push('That is already in its simplest form.');
  return n === 0 ? [0, 1] : [n / k, d / k];
}
function fracEnd(n, d) {
  if (d === 1 || n === 0) return g(n);
  const neg = n < 0, a = Math.abs(n), mix = a > d ? ` = ${neg ? '−' : ''}${Math.floor(a / d)}&thinsp;${fr(a % d, d)}` : '';
  const dec = decText(Q(n, d), 4);
  return `${neg ? '−' : ''}${fr(a, d)}${mix}${dec ? ` = ${dec}` : ''}`;
}
function fractions(a, op, b) {
  const N1 = a.w * a.d + a.n, D1 = a.d, N2 = b.w * b.d + b.n, D2 = b.d;
  if (op === '÷' && N2 === 0) throw new RangeError('zero');
  const prep = [];
  for (const t of [a, b]) {
    if (t.mixed) prep.push(`Make the mixed number improper: ${fx(t)} = ${fr(t.w * t.d + t.n, t.d)}`);
    if (t.whole) prep.push(`Write ${g(t.w)} as a fraction: ${fr(t.w, 1)}`);
  }
  const sym = { '+': '+', '-': '−', '*': '×', '÷': '÷' }[op], ms = [];
  const F1 = fr(N1, D1), F2 = fr(N2, D2);
  const mk = (id, name, stop, lines, n, d) => ({ id, name, stop, html: steps([...prep, ...lines]) + final(fracEnd(n, d)), value: Q(n, d), data: { n, d } });
  if (op === '+' || op === '-') {
    const L = lcm(D1, D2), k1 = L / D1, k2 = L / D2, A = N1 * k1, Bn = N2 * k2, top = op === '+' ? A + Bn : A - Bn, l1 = [];
    if (D1 === D2) l1.push(`The bottoms are the same already (${D1}), so the pieces are the same size.`);
    else {
      l1.push(`The smallest bottom both ${D1} and ${D2} go into is <b>${L}</b>.`);
      if (k1 > 1) l1.push(`${F1} = ${fr(`${N1} × ${k1}`, `${D1} × ${k1}`)} = ${fr(A, L)}`);
      if (k2 > 1) l1.push(`${F2} = ${fr(`${N2} × ${k2}`, `${D2} × ${k2}`)} = ${fr(Bn, L)}`);
    }
    l1.push(`${op === '+' ? 'Add' : 'Take away'} the tops: ${fr(A, L)} ${sym} ${fr(Bn, L)} = ${fr(top < 0 ? '−' + -top : top, L)}`);
    const [n1, d1] = simplify(top, L, l1);
    ms.push(mk('common', 'Make the bottoms the same', D1 === D2 ? 'add-same-bottom' : 'add-different-bottoms', l1, n1, d1));
    const X = op === '+' ? N1 * D2 + N2 * D1 : N1 * D2 - N2 * D1, Y = D1 * D2, l2 = [
      `Cross-multiply: ${N1} × ${D2} ${sym} ${N2} × ${D1} = ${X < 0 ? '−' + -X : X} (the new top)`,
      `Multiply the bottoms: ${D1} × ${D2} = ${Y}`, `So it is ${fr(X < 0 ? '−' + -X : X, Y)}`];
    const [n2, d2] = simplify(X, Y, l2);
    ms.push(mk('butterfly', 'The butterfly', 'add-different-bottoms', l2, n2, d2));
  } else {
    const [P1, P2] = op === '÷' ? [D2, N2] : [N2, D2];   // the second fraction, flipped for ÷
    const flip = op === '÷' ? [`Keep ${F1}, change ÷ to ×, flip ${F2} to ${fr(P1, P2)}.`] : [];
    const l1 = [...flip, `Tops times tops: ${N1} × ${P1} = ${N1 * P1}. Bottoms times bottoms: ${D1} × ${P2} = ${D1 * P2}.`, `So it is ${fr(N1 * P1, D1 * P2)}`];
    const [n1, d1] = simplify(N1 * P1, D1 * P2, l1);
    ms.push(mk(op === '÷' ? 'flip' : 'straight', op === '÷' ? 'Keep, change, flip' : 'Tops times tops', op === '÷' ? 'divide-fractions' : 'multiply-fractions', l1, n1, d1));
    if (op === '*') {
      const g1 = N1 ? gcd(N1, D2) : 1, g2 = N2 ? gcd(N2, D1) : 1, a1 = N1 / g1, b2 = D2 / g1, a2 = N2 / g2, b1 = D1 / g2, l2 = [];
      if (g1 > 1) l2.push(`${N1} (top) and ${D2} (bottom) share ${g1}: they become ${a1} and ${b2}.`);
      if (g2 > 1) l2.push(`${N2} (top) and ${D1} (bottom) share ${g2}: they become ${a2} and ${b1}.`);
      if (g1 === 1 && g2 === 1) l2.push('Nothing on top shares a factor with anything on the bottom across the ×.');
      l2.push(`Now multiply: ${fr(a1, b1)} × ${fr(a2, b2)} = ${fr(a1 * a2, b1 * b2)}`);
      const [n2, d2] = simplify(a1 * a2, b1 * b2, l2);
      ms.push(mk('cancel', 'Cancel first, then multiply', 'simplify-fractions', l2, n2, d2));
    } else {
      const L = lcm(D1, D2), A = N1 * (L / D1), Bn = N2 * (L / D2), l2 = [];
      if (D1 !== D2) l2.push(`Make the bottoms the same: ${F1} = ${fr(A, L)} and ${F2} = ${fr(Bn, L)}.`);
      l2.push(`Now both count pieces of the same size, so divide the tops: ${A} ÷ ${Bn} = ${fr(A, Bn)}`);
      const [n2, d2] = simplify(A, Bn, l2);
      ms.push(mk('samebottom', 'Same bottoms, divide the tops', 'divide-fractions', l2, n2, d2));
    }
  }
  const v = ms[0].value, pic = v.n > 0n && v.n <= v.d && v.d <= 24n ? `<div class="t-working-pic">${kit.fracBar(Number(v.d), Number(v.n), 288, 36)}</div>` : '';
  return { kind: 'frac', label: 'Fractions', sum: `${fx(a)} ${sym} ${fx(b)}`, answer: qHtml(v, { preferFrac: true }), methods: ms, foot: pic };
}

/* ------------------------------------------------------ percentages */

function percent(xs, ys) {
  const x = qdec(xs), y = qdec(ys), X = Number(xs), yv = qHtml(y), xv = qHtml(x);
  if (babs(y.n) > 10n ** 12n || X > 100000) throw new RangeError('Those numbers are too big for me to set out.');
  const ms = [], total = qmul(qdiv(x, Q(100)), y);
  const tenths = Math.round(X * 10);
  if (Math.abs(tenths - X * 10) < 1e-9 && X <= 1000) {
    let r = tenths; const H = Math.floor(r / 1000); r %= 1000;
    const fifty = r >= 500 ? 1 : 0; r -= fifty * 500;
    const tens = Math.floor(r / 100); r %= 100;
    const five = r >= 50 ? 1 : 0; r -= five * 50;
    const ones = Math.floor(r / 10), tth = r % 10;
    const P100 = y, P50 = qdiv(y, Q(2)), P10 = qdiv(y, Q(10)), P5 = qdiv(P10, Q(2)), P1 = qdiv(y, Q(100)), P01 = qdiv(P1, Q(10));
    const facts = [], bits = [], vals = [];
    if (H) { facts.push(`100% of ${yv} is all of it: ${yv}`); bits.push(H > 1 ? `${H} × 100%` : '100%'); vals.push(qmul(Q(H), P100)); }
    if (fifty) { facts.push(`50% is half: ${yv} ÷ 2 = ${qHtml(P50)}`); bits.push('50%'); vals.push(P50); }
    if (tens || five) facts.push(`10% is ${yv} ÷ 10 = ${qHtml(P10)}`);
    if (tens) { bits.push(tens > 1 ? `${tens} × 10%` : '10%'); vals.push(qmul(Q(tens), P10)); }
    if (five) { facts.push(`5% is half of 10%: ${qHtml(P5)}`); bits.push('5%'); vals.push(P5); }
    if (ones || tth) facts.push(`1% is ${yv} ÷ 100 = ${qHtml(P1)}`);
    if (ones) { bits.push(ones > 1 ? `${ones} × 1%` : '1%'); vals.push(qmul(Q(ones), P1)); }
    if (tth) { facts.push(`0.1% is 1% ÷ 10 = ${qHtml(P01)}`); bits.push(tth > 1 ? `${tth} × 0.1%` : '0.1%'); vals.push(qmul(Q(tth), P01)); }
    const sum = vals.reduce(qadd, Q(0));
    const lines = tenths === 0 ? ['0% of anything is nothing at all.'] : [...facts, `${xv}% = ${bits.join(' + ')}`, `So add: ${vals.map((v) => qHtml(v)).join(' + ')} = <b>${qHtml(sum)}</b>`];
    ms.push({ id: 'build', name: 'Build it from 10% and 1%', stop: 'percent-of-amount', value: sum, data: { H, fifty, tens, five, ones, tth, vals }, html: steps(lines) + final(qHtml(sum)) });
  }
  const easy = ['1', '2', '4', '5', '10', '20', '25', '50', '75', '100', '200'].includes(ys);
  const swap = qmul(qdiv(y, Q(100)), x);
  ms.push({ id: 'swap', name: 'Swap it round', stop: 'percent-swap', value: swap, data: {},
    html: steps([`${xv}% of ${yv} is the same as <b>${yv}% of ${xv}</b> — both are ${xv} × ${yv} ÷ 100.`, easy ? `${yv}% is an easy one to find.` : `Sometimes the swapped one is easier; here it is either way.`,
      `${yv}% of ${xv}: ${xv} ÷ 100 = ${qHtml(qdiv(x, Q(100)))}, then × ${yv} = <b>${qHtml(swap)}</b>`]) + final(qHtml(swap)) });
  const dx = qdiv(x, Q(100)), straight = qmul(dx, y);
  ms.push({ id: 'decimal', name: 'Straight to it', stop: 'fraction-decimal-percent', value: straight, data: {},
    html: steps([`Per cent means “out of 100”, so ${xv}% = ${xv} ÷ 100 = ${qHtml(dx)}.`, `${qHtml(dx)} × ${yv} = <b>${qHtml(straight)}</b>`]) + final(qHtml(straight)) });
  return { kind: 'pct', label: 'Percentages', sum: `${xv}% of ${yv}`, answer: qHtml(total), methods: ms };
}

/* ------------------------------------------------------ BODMAS */

function tokenise(t) {
  const s = t.replace(/\bof\b/g, '*'), out = [];
  for (let i = 0; i < s.length;) {
    const ch = s[i];
    if (ch === ' ') { i++; continue; }
    const m = s.slice(i).match(/^(\d+(?:\.\d+)?|\.\d+)/);
    if (m) { if (m[1].replace('.', '').length > 15) throw new RangeError('That number is too long for me.'); out.push({ t: 'n', v: m[1] }); i += m[1].length; continue; }
    if ('+-*/÷^()%'.includes(ch)) { out.push({ t: ch === '/' ? '÷' : ch }); i++; continue; }
    return null;
  }
  return out;
}
function parseExpr(toks) {
  let i = 0;
  const peek = () => toks[i] && toks[i].t, eat = (t) => { if (peek() !== t) throw new SyntaxError(t); i++; };
  const expr = () => { let a = term(); while (peek() === '+' || peek() === '-') { const op = toks[i++].t; a = { k: 'bin', op, a, b: term() }; } return a; };
  const term = () => {
    let a = unary();
    for (;;) {
      if (peek() === '*' || peek() === '÷') { const op = toks[i++].t; a = { k: 'bin', op, a, b: unary() }; } else if (peek() === '(') a = { k: 'bin', op: '*', a, b: unary() };
      else return a;
    }
  };
  const unary = () => { if (peek() === '-') { i++; return { k: 'neg', a: unary() }; } if (peek() === '+') { i++; return unary(); } return power(); };
  const power = () => { const a = postfix(); if (peek() === '^') { i++; return { k: 'bin', op: '^', a, b: unary() }; } return a; };
  const postfix = () => { let a = primary(); while (peek() === '%') { i++; a = { k: 'pct', a }; } return a; };
  const primary = () => {
    const tk = toks[i];
    if (!tk) throw new SyntaxError('end');
    if (tk.t === 'n') { i++; return { k: 'num', q: qdec(tk.v), lit: tk.v }; }
    if (tk.t === '(') { i++; const a = expr(); eat(')'); return { k: 'par', a }; }
    throw new SyntaxError(tk.t);
  };
  const root = expr();
  if (i !== toks.length) throw new SyntaxError('extra');
  return root;
}
const OPS = { '+': '+', '-': '−', '*': '×', '÷': '÷', '^': '^' };
/* mode 'html' draws the line for the child; mode 'js' writes the same tree as
   plain arithmetic, fully bracketed, so selftest can evaluate every line. */
function draw(node, mode, pos = 'lead') {
  if (node.k === 'num') {
    if (mode === 'js') return `(${node.q.n}/${node.q.d})`;
    const h = node.lit && !node.hi ? groupS(node.lit.replace(/^\./, '0.')) : qHtml(node.q);
    const neg = node.q.n < 0n && pos !== 'lead';
    const body = neg ? `(${h})` : h;
    return node.hi ? `<b class="t-working-hi">${body}</b>` : body;
  }
  if (node.k === 'par') return `(${draw(node.a, mode, 'lead')})`;
  if (node.k === 'neg') return mode === 'js' ? `(-${draw(node.a, mode)})` : (pos === 'lead' ? '−' : '(−') + draw(node.a, mode, 'in') + (pos === 'lead' ? '' : ')');
  if (node.k === 'pct') return mode === 'js' ? `(${draw(node.a, mode)}/100)` : `${draw(node.a, mode, 'in')}%`;
  if (mode === 'js') return `(${draw(node.a, mode)}${node.op === '^' ? '**' : node.op === '÷' ? '/' : node.op}${draw(node.b, mode)})`;
  if (node.op === '^') return `${draw(node.a, mode, 'in')}<sup>${draw(node.b, mode, 'lead')}</sup>`;
  return `${draw(node.a, mode, pos)} ${OPS[node.op]} ${draw(node.b, mode, 'in')}`;
}
function fold(node) {
  for (const c of ['a', 'b']) if (node[c]) fold(node[c]);
  if ((node.k === 'par' || node.k === 'neg') && node.a.k === 'num') {
    const q = node.k === 'neg' ? Q(-node.a.q.n, node.a.q.d) : node.a.q, hi = node.a.hi, lit = node.k === 'par' ? node.a.lit : null;
    for (const k of Object.keys(node)) delete node[k];
    Object.assign(node, { k: 'num', q, hi, lit });
  }
}
function redexes(node) {
  const out = []; let pos = 0;
  const walk = (n, depth, grp) => {
    if (n.k === 'num') { pos++; return; }
    if (n.k === 'par') { const gp = pos++; walk(n.a, depth + 1, gp); return; }
    if (n.k === 'neg') { pos++; walk(n.a, depth, grp); return; }
    if (n.k === 'pct') { walk(n.a, depth, grp); const p = pos++; if (n.a.k === 'num') out.push({ n, depth, grp, level: 5, p }); return; }
    walk(n.a, depth, grp); const p = pos++; walk(n.b, depth, grp);
    if (n.a.k === 'num' && n.b.k === 'num') out.push({ n, depth, grp, level: n.op === '^' ? 4 : n.op === '*' || n.op === '÷' ? 2 : 1, p });
  };
  walk(node, 0, -1);
  return out.sort((x, y) => y.depth - x.depth || x.grp - y.grp || y.level - x.level || x.p - y.p);
}
const big = (q) => q.n.toString().length > 60 || q.d.toString().length > 60;
function reduce(n) {
  if (n.k === 'pct') return qdiv(n.a.q, Q(100));
  const a = n.a.q, b = n.b.q;
  if (n.op === '+') return qadd(a, b);
  if (n.op === '-') return qsub(a, b);
  if (n.op === '*') return qmul(a, b);
  if (n.op === '÷') return qdiv(a, b);
  if (!qint(b) || b.n > 30n || b.n < -30n) throw new RangeError('I can only do whole-number powers up to 30 here.');
  if (a.n === 0n && b.n < 0n) throw new RangeError('zero');
  const e = b.n < 0n ? -b.n : b.n, r = Q(a.n ** e, a.d ** e);
  return b.n < 0n ? qdiv(Q(1), r) : r;
}
function leftToRight(toks) {
  if (!toks.every((t, i) => (i % 2 === 0 ? t.t === 'n' : '+-*÷'.includes(t.t))) || toks.length % 2 === 0 || toks.length < 5) return null;
  let v = qdec(toks[0].v);
  for (let i = 1; i < toks.length; i += 2) { const w = qdec(toks[i + 1].v), op = toks[i].t; if (op === '÷' && w.n === 0n) return null; v = op === '+' ? qadd(v, w) : op === '-' ? qsub(v, w) : op === '*' ? qmul(v, w) : qdiv(v, w); }
  return v;
}
function bodmas(t, note = '') {
  const toks = tokenise(t);
  if (!toks || !toks.length) return { error: FORMS };
  let root;
  try { root = parseExpr(toks); } catch (e) { if (e instanceof SyntaxError) return { error: `I couldn’t read that as a sum. ${FORMS}` }; throw e; }
  const lines = [{ html: draw(root, 'html'), js: draw(root, 'js'), note: 'The sum' }];
  const clearHi = (n) => { if (n.hi) delete n.hi; for (const c of ['a', 'b']) if (n[c]) clearHi(n[c]); };
  fold(root);
  if (root.k === 'num') return { error: `There is nothing to work out — ${qHtml(root.q)} is already a number. ${FORMS}` };
  let guard = 0;
  while (root.k !== 'num') {
    if (++guard > 40) throw new RangeError('That is too long a sum for me to set out — try a shorter one.');
    const [r] = redexes(root);
    const why = r.level === 5 ? 'Per cent means ÷ 100' : r.depth > 0 ? 'Brackets first' : r.level === 4 ? 'Powers (orders) next' : r.level === 2 ? '× and ÷, left to right' : '+ and −, left to right';
    clearHi(root);
    const mini = draw(r.n, 'html', 'lead');
    const q = reduce(r.n);
    if (big(q)) throw new RangeError('The numbers get too big to show exactly — try smaller ones.');
    for (const k of Object.keys(r.n)) delete r.n[k];
    Object.assign(r.n, { k: 'num', q, hi: true });
    fold(root);
    lines.push({ html: draw(root, 'html'), js: draw(root, 'js'), note: `${why}: ${mini} = ${qHtml(q)}` });
  }
  const value = root.q, ltr = leftToRight(toks);
  const trap = ltr && (ltr.n !== value.n || ltr.d !== value.d) ? `<p class="t-working-trap">If you just went left to right you would get ${qHtml(ltr)} — which is why the order matters.</p>` : '';
  const html = `<ol class="t-working-lines">${lines.map((l, i) => `<li><span class="t-working-eq">${i ? '=' : ''}</span><span class="t-working-expr">${l.html}</span><span class="t-working-why">${l.note}</span></li>`).join('')}</ol>`
    + (qint(value) || decText(value, 6) ? '' : `<p class="muted small">As a decimal that is about ${approx(value)}.</p>`) + trap + final(qHtml(value));
  return { kind: 'bodmas', label: 'Order of operations', sum: lines[0].html, answer: qHtml(value), note,
    methods: [{ id: 'bodmas', name: 'BODMAS, one step at a time', stop: 'order-of-operations', html, value, data: { lines } }] };
}

/* ------------------------------------------------------ the contract */

function remember(ctx, q) {
  const r = (Array.isArray(ctx.data.recent) ? ctx.data.recent : []).filter((x) => typeof x === 'string' && x !== q);
  ctx.data.recent = [q, ...r].slice(0, 6); ctx.save();
}
function showSum(ctx, q) {
  ctx.ui.q = q; ctx.ui.shown = q; ctx.ui.tab = 0;
  const res = solve(q);
  if (res && res.methods) remember(ctx, q);
}
export function act(name, arg, ctx) {
  if (name === 'go') { const q = String(ctx.ui.q || '').trim(); if (q) showSum(ctx, q); else ctx.ui.shown = ''; return; }
  if (name === 'ex') { showSum(ctx, arg); return; }
  if (name === 'tab') { ctx.ui.tab = Math.max(0, +arg || 0); return; }
  if (name === 'clear') { ctx.ui.q = ''; ctx.ui.shown = ''; return; }
  if (name === 'forget') { ctx.data.recent = []; ctx.save(); }
}
/* The host calls key() only when focus is not in the text box; inside it, the
   input's own onkeydown presses Show (Enter) or Clear (Escape). */
export function key(e, ctx) {
  if (e.metaKey || e.ctrlKey || e.altKey) return false;
  if (e.key === 'Enter') { act('go', '', ctx); return true; }
  if (e.key === 'Escape') { act('clear', '', ctx); return true; }
  const res = ctx.ui.shown ? solve(ctx.ui.shown) : null, n = res && res.methods ? res.methods.length : 0;
  if (n > 1 && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { ctx.ui.tab = ((ctx.ui.tab || 0) + (e.key === 'ArrowRight' ? 1 : n - 1)) % n; return true; }
  return false;
}
const ONKEY = `var m={Enter:'go',Escape:'clear'}[event.key];if(m){event.preventDefault();var b=document.getElementById('t-working-'+m);if(b)b.click();}`;
const exButtons = (list) => `<div class="t-working-ex">${list.map((e) => `<button class="chip t-working-chip" data-act="lib" data-arg="ex|${esc(e)}">${esc(e)}</button>`).join('')}</div>`;

export function view(ctx) {
  const text = ctx.ui.q != null ? String(ctx.ui.q) : '';
  const shown = ctx.ui.shown ? String(ctx.ui.shown) : '';
  const recent = (Array.isArray(ctx.data.recent) ? ctx.data.recent : []).filter((x) => typeof x === 'string');
  let body = '';
  if (!shown) body = `<div class="card t-working-empty"><p class="t-working-lead">Every answer has a story.</p><p class="muted">Type a sum above and press Enter — or try one of these:</p>${exButtons(EXAMPLES)}</div>`;
  else {
    const res = solve(shown);
    if (!res || res.error || res.empty) body = `<div class="card t-working-empty"><p class="t-working-err">${res && res.error ? res.error : FORMS}</p><p class="muted">You typed “${esc(shown)}”. Here are some I understand:</p>${exButtons(EXAMPLES)}</div>`;
    else {
      const ms = res.methods, tab = Math.min(ms.length - 1, Math.max(0, +ctx.ui.tab || 0));
      body = `<article class="t-working-page">
        <header class="t-working-head"><p class="kicker">${res.label} · ${ms.length === 1 ? 'step by step' : `${ms.length} ways`}</p>
          <div class="t-working-sum">${res.sum} <span class="t-working-ans">= ${res.answer}</span></div>
          ${res.note ? `<p class="muted small">${res.note}</p>` : ''}</header>
        ${ms.length > 1 ? `<div class="seg t-working-tabs" role="tablist">${ms.map((m, i) => `<button class="${i === tab ? 'on' : ''}" role="tab" aria-selected="${i === tab}" data-act="lib" data-arg="tab|${i}">${m.name}</button>`).join('')}</div>` : ''}
        <div class="t-working-panels n${ms.length}">${ms.map((m, i) => `<section class="t-working-panel${i === tab ? ' on' : ''}"><h3><span class="t-working-num">${i + 1}</span>${m.name}</h3>${m.html}${learn(m.stop)}</section>`).join('')}</div>
        ${res.foot || ''}
      </article>`;
    }
  }
  return `<div class="t-working">
    <div class="card t-working-ask">
      <div class="t-working-bar">
        <input id="t-working-q" class="t-working-input" data-lib-input="q" autocomplete="off" spellcheck="false" placeholder="23 × 47" value="${esc(text)}" aria-label="Type a sum" onkeydown="${ONKEY}">
        <button class="btn primary" id="t-working-go" data-act="lib" data-arg="go|">Show me</button>
        <button class="btn ghost" id="t-working-clear" data-act="lib" data-arg="clear|">Clear</button>
      </div>
    </div>
    ${body}
    ${recent.length ? `<div class="t-working-recent"><span class="muted small">Your recent sums:</span>${exButtons(recent)}<button class="btn small ghost" data-act="lib" data-arg="forget|">Forget them</button></div>` : ''}
    <p class="muted small t-working-hint">Use × or x or *, ÷ or /, + and −, brackets, fractions like 3/4, and “35% of 80”. Enter shows the working · Esc clears.</p>
  </div>`;
}

export const CSS = `
.t-working-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.t-working-input{font:700 24px var(--mono);padding:8px 14px;border:2px solid var(--line);border-radius:var(--r-md);background:var(--paper);color:var(--ink);flex:1 1 220px;min-width:0}
.t-working-input:focus{outline:none;border-color:var(--action);box-shadow:var(--focus)}
.t-working-hint{margin:6px 0 0;text-align:center}
.t-working-ex{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.t-working-chip{border:1px solid var(--line);cursor:pointer;font-family:var(--mono);color:var(--ink)}
.t-working-chip:hover{border-color:var(--action);background:var(--action-tint)}
.t-working-recent{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 6px}.t-working-recent .t-working-ex{margin:0}
.t-working-empty{text-align:center;padding:30px}.t-working-empty .t-working-ex{justify-content:center}
.t-working-lead{font:700 var(--fs-h2) var(--display);margin:0 0 6px}
.t-working-err{font:600 var(--fs-lead) var(--display);color:var(--fix);margin:0 0 8px}
.t-working-page{background:var(--paper);border:1px solid var(--line);border-radius:var(--r-xl);box-shadow:var(--sh-raised);padding:26px 28px;margin-bottom:16px}
.t-working-head{border-bottom:3px double var(--line);padding-bottom:14px;margin-bottom:16px}
.t-working-sum{font:700 clamp(24px,5vw,38px)/1.25 var(--mono);color:var(--ink);word-break:break-word}
.t-working-ans{color:var(--action);white-space:nowrap}
.t-working-tabs{display:none}
.t-working-panels{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px}
.t-working-panel{background:var(--surface);border:1px solid var(--line-soft);border-radius:var(--r-lg);padding:16px 18px;min-width:0;display:flex;flex-direction:column}
.t-working-panel h3{font:700 var(--fs-h3) var(--display);margin:0 0 10px;display:flex;align-items:center;gap:10px;color:var(--ink)}
.t-working-num{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--action-tint);color:var(--action);font:800 14px var(--mono);flex:none}
.t-working-scroll{overflow-x:auto;max-width:100%}
.t-working-col{border-collapse:collapse;margin:4px auto 10px}
.t-working-col td{font:600 24px/1.35 var(--mono);width:1.05em;text-align:center;padding:1px 2px;color:var(--ink)}
.t-working-col td.t-working-s{color:var(--muted);padding-right:8px}
.t-working-col td.t-working-note{width:auto;text-align:left;font:500 var(--fs-label) var(--ui);color:var(--muted);padding-left:14px;white-space:nowrap}
.t-working-col tr.t-working-carry td{font-size:13px;line-height:1;color:var(--medium);font-weight:800;height:14px;vertical-align:bottom}
.t-working-col tr.t-working-ruled td:not(.t-working-note){border-top:2px solid var(--ink)}
.t-working-col tr.t-working-total td:not(.t-working-note){border-bottom:4px double var(--ink);font-weight:800}
.t-working-col s{text-decoration-thickness:2px;color:var(--muted)}
.t-working-ph{opacity:.4}
.t-working-grid{border-collapse:collapse;margin:4px auto 10px;font-family:var(--mono)}
.t-working-grid th,.t-working-grid td{border:1.5px solid var(--line);padding:8px 12px;text-align:center;font-size:17px}
.t-working-grid th{background:var(--surface2);color:var(--muted);font-weight:700}
.t-working-grid td{background:var(--paper);font-weight:700;color:var(--ink)}
.t-working-grid .t-working-corner{color:var(--action)}
.t-working-grid .t-working-rt{background:var(--action-tint);color:var(--action)}
.t-working-steps{margin:6px 0;padding-left:22px;line-height:1.6}.t-working-steps li{margin:3px 0}
.t-working-final{margin:auto 0 8px;padding-top:10px;border-top:1px dashed var(--line);font:800 22px var(--mono);color:var(--ink)}
.t-working-final>span{color:var(--muted);margin-right:4px}
.t-working-rem{font:700 16px var(--ui);color:var(--medium)}
.t-working-learn{align-self:flex-start;border:0;background:none;padding:4px 0;color:var(--action);font-weight:700;font-size:var(--fs-label);cursor:pointer}
.t-working-learn:hover{text-decoration:underline}
.t-working-fr{display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;font-family:var(--mono);line-height:1.1;margin:0 2px}
.t-working-fr>span:first-child{border-bottom:2px solid currentColor;padding:0 3px}.t-working-fr>span:last-child{padding:0 3px}
.t-working-rep{text-decoration:overline;text-decoration-thickness:2px}
.t-working-bus{border-collapse:collapse;margin:6px auto 12px;font:600 24px/1.3 var(--mono)}
.t-working-bus td{padding:2px 4px;text-align:center;min-width:.9em;color:var(--ink)}
.t-working-bus .t-working-q{font-weight:800}
.t-working-bus .t-working-in{border-top:2.5px solid var(--ink)}
.t-working-bus .t-working-in.first{border-left:2.5px solid var(--ink);border-top-left-radius:6px}
.t-working-bus .t-working-dv{padding-right:8px;font-weight:800}
.t-working-bus sup{font-size:12px;color:var(--medium);font-weight:800;margin-right:1px}
.t-working-bus .t-working-r{font:700 16px var(--ui);color:var(--medium);padding-left:10px;white-space:nowrap}
.t-working-lines{list-style:none;padding:0;margin:4px 0}
.t-working-lines li{display:grid;grid-template-columns:22px 1fr;gap:2px 8px;padding:8px 0;border-bottom:1px solid var(--line-soft)}
.t-working-eq{font:800 20px var(--mono);color:var(--muted);grid-row:span 2}
.t-working-expr{font:600 21px/1.5 var(--mono);color:var(--ink);word-break:break-word}
.t-working-expr sup{font-size:.62em}
.t-working-why{font-size:var(--fs-label);color:var(--muted)}
.t-working-hi{color:var(--action);background:var(--action-tint);border-radius:5px;padding:0 3px}
.t-working-trap{background:var(--medium-tint);color:var(--ink);border-radius:var(--r-md);padding:10px 12px;margin:10px 0}
.t-working-flip{background:var(--surface2);border-radius:var(--r-md);padding:8px 12px;margin:0 0 8px}
.t-working-nines{margin-top:18px;padding:14px 16px;border-radius:var(--r-md);background:var(--surface2);line-height:1.6;font-size:var(--fs-body)}
.t-working-ok{color:var(--mastered)}.t-working-bad{color:var(--fix)}
.t-working-pic{margin-top:14px}
@media (max-width:720px){
  .t-working-tabs{display:flex}
  .t-working-panel:not(.on){display:none}
  .t-working-panels{grid-template-columns:1fr}
  .t-working-page{padding:18px 14px}
  .t-working-col td.t-working-note{display:none}
}
`;

/* ------------------------------------------------------ selftest */

export function selftest(ok, makeCtx) {
  const r = seeded('working-selftest');
  const int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  const pick = (a) => a[Math.floor(r() * a.length)];
  const digits = (k) => (k === 1 ? int(0, 9) : int(10 ** (k - 1), 10 ** k - 1));
  const close = (v, want) => Number.isFinite(v) && Math.abs(v - want) <= 1e-9 * Math.max(1, Math.abs(want));
  const plain = (s) => Function(`return (${s})`)();
  const qv = (q) => qnum(q);
  const allEqual = (res, want, what) => {
    ok(res && res.methods && res.methods.length >= 1, `working: ${what} did not solve (${res && res.error})`);
    if (!res || !res.methods) return;
    for (const m of res.methods) ok(close(qv(m.value), want), `working: ${what} — ${m.name} ends on ${qv(m.value)}, plain arithmetic says ${want}`);
  };
  const X = ['×', 'x', '*', 'X', ' × ', ' x ', ' * '];

  // × — thousands of products, each method ends on the product
  for (let i = 0; i < 1500; i++) {
    const a = digits(int(1, 4)), b = digits(int(1, 3)), sw = r() < 0.2, [p, q] = sw ? [b, a] : [a, b];
    const res = solve(`${p}${pick(X)}${q}`), want = plain(`${p}*${q}`);
    ok(res.kind === 'mul', `working: ${p} × ${q} read as multiplication`);
    allEqual(res, want, `${p} × ${q}`);
    const grid = res.methods.find((m) => m.id === 'grid').data;
    ok(grid.A.reduce((s, v) => s + v, 0) === p && grid.Bs.reduce((s, v) => s + v, 0) === q, `working: grid parts of ${p} × ${q} add back`);
    ok(grid.cells.every((row, i2) => row.every((c, j) => c === grid.A[i2] * grid.Bs[j])) && grid.cells.flat().reduce((s, v) => s + v, 0) === want, `working: partial products of ${p} × ${q} sum to the product`);
    const col = res.methods.find((m) => m.id === 'column').data;
    ok(col.partials.every((pt) => pt.value === col.top * pt.d * 10 ** pt.i) && col.partials.reduce((s, pt) => s + pt.value, 0) === want, `working: column rows of ${p} × ${q} are the right partial products`);
    ok(col.partials.every((pt) => pt.skip || Number(pt.digits) === pt.value), `working: column row digits of ${p} × ${q} read back`);
    ok(res.nines.match && droot(want) === droot(droot(p) * droot(q)), `working: nines check for ${p} × ${q}`);
    ok(res.methods.some((m) => m.id === 'crosswise') === (p >= 10 && p <= 99 && q >= 10 && q <= 99), `working: crosswise offered exactly for 2-digit pairs (${p} × ${q})`);
  }
  for (let a = 88; a <= 112; a++) for (let b = 88; b <= 112; b += 3) {
    const res = solve(`${a} x ${b}`), nk = res.methods.find((m) => m.id === 'nikhilam');
    ok(!!nk === !(a === 100 && b === 100), `working: Nikhilam offered for ${a} × ${b}`);
    allEqual(res, a * b, `${a} × ${b}`);
  }
  for (let i = 0; i < 400; i++) { const a = int(10, 99), b = int(10, 99), res = solve(`${a}*${b}`); allEqual(res, a * b, `${a} × ${b} (crosswise)`); }

  // + — two and several addends; each column obeys digit + carry-in = out + 10 × carry-out
  for (let i = 0; i < 1200; i++) {
    const k = r() < 0.15 ? int(3, 5) : 2, nums = Array.from({ length: k }, () => digits(int(1, 7)));
    if (r() < 0.2 && k === 2) nums[1] = pick([9, 98, 999, 1997, 49998, 7, 18, 299]);
    const res = solve(nums.join(pick(['+', ' + ', ' plus ']))), want = plain(nums.join('+'));
    ok(res.kind === 'add', `working: ${nums.join(' + ')} read as adding`);
    allEqual(res, want, nums.join(' + '));
    const d = res.methods[0].data, cin = (c) => d.carries[c] || 0;
    for (let c = 0; c < d.ds[0].length; c++) {
      const s = d.ds.reduce((acc, row) => acc + row[c], 0) + cin(c), out = d.out[c];
      ok(s % 10 === out && (c + 1 >= d.ds[0].length || Math.floor(s / 10) === cin(c + 1)), `working: column ${c} of ${nums.join(' + ')} carries correctly`);
    }
  }
  // − — including borrow chains across zeros and answers below zero
  const hard = [[1000000, 1], [100100, 99999], [5000, 4999], [1000, 999], [7, 9], [123, 123], [0, 45], [2003, 1998], [9000001, 8999999]];
  for (let i = 0; i < 1200 + hard.length; i++) {
    const [a, b] = i < hard.length ? hard[i] : [digits(int(1, 7)), digits(int(1, 7))];
    const res = solve(`${a}${pick(['-', ' − ', '–', ' minus '])}${b}`), want = a - b;
    ok(res.kind === 'sub', `working: ${a} − ${b} read as taking away`);
    allEqual(res, want, `${a} − ${b}`);
    const d = res.methods[0].data;
    ok(d.cur.reduce((s, v, j) => s + v * 10 ** j, 0) === Math.max(a, b) && d.cur.every((v, j) => v >= d.bot[j] && v <= 19 && v >= 0), `working: exchanges in ${a} − ${b} keep the top number's value`);
    const mm = res.methods[1].data;
    if (mm.jumps) ok(mm.jumps.every(([x, y], j) => y > x && (j === 0 || mm.jumps[j - 1][1] === x)) && (mm.jumps.length === 0 || mm.jumps.at(-1)[1] === Math.max(a, b)), `working: counting up for ${a} − ${b} lands on the top number`);
  }
  // ÷ — quotient and remainder, mixed number, decimal (recurring ones rebuilt exactly)
  for (let i = 0; i < 1500; i++) {
    const a = digits(int(1, 7)), b = int(1, 99), res = solve(`${a}${pick(['÷', '/', ' ÷ ', ' / ', ' divided by '])}${b}`), want = plain(`${a}/${b}`);
    ok(res.kind === 'div', `working: ${a} ÷ ${b} read as dividing`);
    allEqual(res, want, `${a} ÷ ${b}`);
    const sd = res.methods[0].data;
    ok(sd.quot * b + sd.rem === a && sd.rem >= 0 && sd.rem < b, `working: ${a} ÷ ${b} = ${sd.quot} r ${sd.rem} checks back`);
    const dv = res.methods[2].value;
    ok(dv.n * B(b) === B(a) * dv.d, `working: the decimal for ${a} ÷ ${b} is exactly ${a}/${b}`);
    const mx = res.methods[1].data; ok(gcd(mx.rn, mx.rd) === 1 || mx.rn === 0, `working: the mixed number for ${a} ÷ ${b} is simplified`);
  }
  // fractions — every op, proper/improper/mixed/whole, compared as values and in lowest terms
  const ft = () => { const k = r(); const d = int(1, 12); if (k < 0.15) { const w = int(0, 12); return [String(w), String(w)]; } if (k < 0.3) { const w = int(1, 5), n = int(1, Math.max(1, d - 1)); return [`${w} ${n}/${d}`, `(${w}+${n}/${d})`]; } const n = int(0, 20); return [`${n}/${d}`, `(${n}/${d})`]; };
  const FOPS = [['+', '+'], [' + ', '+'], ['-', '-'], [' − ', '-'], ['×', '*'], [' x ', '*'], ['*', '*'], [' ÷ ', '/'], ['÷', '/'], [' of ', '*']];
  let fracSeen = 0;
  for (let i = 0; i < 2000; i++) {
    const [s1, j1] = ft(), [s2, j2] = ft(), [op, jop] = pick(FOPS);
    if (!s1.includes('/') && !s2.includes('/')) continue;
    const want = plain(`${j1}${jop}${j2}`), res = solve(`${s1}${op}${s2}`);
    if (!Number.isFinite(want)) { ok(res.error, `working: ${s1}${op}${s2} should refuse (divide by zero)`); continue; }
    ok(res.kind === 'frac', `working: ${s1}${op}${s2} read as fractions (${res.kind || res.error})`);
    allEqual(res, want, `${s1}${op}${s2}`); fracSeen++;
    for (const m of res.methods || []) ok(gcd(m.data.n, m.data.d) === 1 && m.data.d > 0, `working: ${s1}${op}${s2} — ${m.name} ends in lowest terms (${m.data.n}/${m.data.d})`);
  }
  ok(fracSeen > 1000, `working: enough fraction sums were checked (${fracSeen})`);
  ok(solve('3/4 / 1/2').kind === 'frac' && close(qv(solve('3/4 / 1/2').methods[0].value), 1.5), 'working: “3/4 / 1/2” is one fraction divided by another');
  ok(solve('1/0 + 1/2').error && solve('1/2 ÷ 0/3').error, 'working: a zero bottom or a divide by zero is refused kindly');
  // percentages
  for (let i = 0; i < 1000; i++) {
    const x = r() < 0.8 ? String(int(0, 200)) : `${int(0, 99)}.${int(1, 9)}`, y = r() < 0.8 ? String(int(1, 1000000)) : `${int(0, 999)}.${int(1, 99)}`;
    const res = solve(`${x}${pick(['% of ', '%of', ' % of ', ' percent of ', '% × '])}${y}`), want = plain(`${x}/100*${y}`);
    ok(res.kind === 'pct', `working: ${x}% of ${y} read as a percentage`);
    allEqual(res, want, `${x}% of ${y}`);
    const bd = res.methods.find((m) => m.id === 'build');
    if (bd) { const d = bd.data; ok(Math.abs(d.H * 100 + d.fifty * 50 + d.tens * 10 + d.five * 5 + d.ones + d.tth / 10 - Number(x)) < 1e-9, `working: ${x}% is built from its parts`); }
  }
  // BODMAS — random expressions; EVERY line of the working has the same value as the sum
  const gen = (depth, div) => {
    if (depth <= 0 || r() < 0.3) {
      const k = r(); const v = k < 0.1 ? `${int(0, 9)}.${int(1, 9)}` : String(int(0, 20));
      return r() < 0.08 ? `−${v}` : v;
    }
    const op = pick(['+', '-', '*', '/', '+', '*', '^']);
    let a = gen(depth - 1, div), b = gen(depth - 1, div);
    if (op === '^') { a = String(int(1, 9)); b = String(int(0, 3)); }
    const shown = { '+': ' + ', '-': ' − ', '*': pick([' × ', ' x ', '*']), '/': div, '^': '^' }[op];
    const s = `${a}${shown}${b}`;
    return r() < 0.35 ? `(${s})` : s;
  };
  const toJs = (s) => s.replace(/×|x/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\^/g, '**');
  let bodSeen = 0, lineSeen = 0;
  for (let i = 0; i < 1500; i++) {
    const s = gen(int(1, 4), pick([' ÷ ', ' / ', '÷'])), j = toJs(s);
    let want; try { want = plain(j); } catch (e) { continue; }
    const res = solve(s);
    if (!Number.isFinite(want)) { ok(res.error, `working: ${s} should refuse (it divides by zero)`); continue; }
    if (res.error) { ok(/too big|too long|powers/.test(res.error) || (/divide by 0/.test(res.error) && /[÷/] ?[(−]*0(?![.\d])/.test(s)) || (/already a number/.test(res.error) && /^[(−]*[\d.]+\)*$/.test(s)), `working: ${s} refused: ${res.error}`); continue; }
    allEqual(res, want, s); bodSeen++;
    if (res.kind === 'bodmas') for (const l of res.methods[0].data.lines) { lineSeen++; ok(close(plain(l.js), want), `working: a line of ${s} is ${plain(l.js)}, not ${want}`); }
  }
  ok(bodSeen > 1000 && lineSeen > 3000, `working: enough expressions were checked (${bodSeen} sums, ${lineSeen} lines)`);
  const b1 = solve('3 + 4 × (10 − 2) ÷ 8');
  ok(b1.kind === 'bodmas' && b1.methods[0].data.lines.length === 5 && close(qv(b1.methods[0].value), 7), 'working: 3 + 4 × (10 − 2) ÷ 8 takes four steps and makes 7');
  ok(/t-working-trap/.test(solve('2 + 3 × 4').methods[0].html) && !/t-working-trap/.test(solve('2 × 3 + 4').methods[0].html), 'working: the left-to-right trap is pointed out');
  ok(close(qv(solve('0.1 + 0.2 + 0.3').methods[0].value), 0.6) && solve('0.1+0.2+0.3').answer === '0.6', 'working: decimals are exact');
  ok(close(qv(solve('2(3+4)').methods[0].value), 14) && close(qv(solve('-3 × -4').methods[0].value), 12) && close(qv(solve('50% of 30 + 2').methods[0].value), 17), 'working: implicit ×, negatives, % inside a sum');
  ok(close(qv(solve('2^10').methods[0].value), 1024) && close(qv(solve('3² + 4²').methods[0].value), 25), 'working: powers');

  // the parser accepts every notation it says it does
  const N = [['12 x 34', 408], ['12x34', 408], ['12*34', 408], ['12×34', 408], ['12 X 34', 408], ['12 times 34', 408], ['144÷12', 12], ['144 / 12', 12], ['144 divided by 12', 12],
    ['7 − 3', 4], ['7-3', 4], ['7 – 3', 4], ['7 minus 3', 4], ['4,508 + 2,796', 7304], ['1 000 + 1', 1001], ['20% of 50', 10], ['20 % of 50', 10], ['1/2 of 3/4', 0.375], ['3/4 of 20', 15],
    ['1 1/2 + 2 1/4', 3.75], ['[2 + 3] × {4}', 20], ['what is 6 x 7?', 42], ['6 × 7 =', 42], ['  12   ×   3 ', 36], ['2 × (3 + 4)', 14], ['10 ÷ 4', 2.5], ['3/4', 0.75]];
  for (const [s, v] of N) { const res = solve(s); ok(res.methods && res.methods.every((m) => close(qv(m.value), v)), `working: reads “${s}” as ${v} (${res.error || res.methods && qv(res.methods[0].value)})`); }
  for (const s of ['hello', '3 +', '(2 + 3', '12 ÷ 0', '5 / 0', '1/0', '42', '++', '']) { const res = solve(s); ok(res.error || res.empty, `working: refuses “${s}” kindly`); }

  // the page: renders cleanly for every kind, every tab, and escapes what was typed
  const clean = (h) => typeof h === 'string' && h.length > 200 && !/undefined|NaN|\[object Object\]|Infinity/.test(h);
  const cases = [...EXAMPLES, '', 'hello', '12 ÷ 0', '<img src=x onerror=alert(1)>', '96 x 104', '103 × 104', '100 x 100', '9999 × 999', '12345 × 678', '1234567 + 7654321', '12 + 34 + 56', '5 − 12',
    '100 ÷ 7', '1 ÷ 97', '22 ÷ 7', '1000000 ÷ 64', '5 ÷ 1000', '7 1/2 − 9 3/4', '0/5 × 3/4', '12.5% of 64.4', '150% of 30', '0% of 9', '2 + 3 × 4', '(1 + 2) × (3 + 4)', '2^3^2', '1 ÷ 3 × 3', '10 − (−3)', '42'];
  for (const band of ['6-7', '8-10', '11-14']) for (const s of cases) for (const tab of [undefined, 0, 1, 2, 3, 9, 'x']) {
    const ctx = makeCtx('working', band); ctx.ui.q = s; ctx.ui.shown = s; ctx.ui.tab = tab; const h = view(ctx);
    ok(clean(h), `working: view renders cleanly for “${s}” tab ${tab} (${band})`);
    if (s.includes('<')) ok(!h.includes('<img src=x') && h.includes('&lt;img'), 'working: escapes what the child typed');
    for (const m of h.matchAll(/data-act="openStop" data-arg="([^"]+)"/g)) ok(byId[m[1]], `working: links to a real stop (${m[1]})`);
    ok((h.match(/id="t-working-q"/g) || []).length === 1, 'working: one stable input id');
  }
  for (const s of EXAMPLES) { const res = solve(s); ok(res.methods && res.methods.length >= 1 && res.methods.every((m) => byId[m.stop]), `working: example “${s}” solves and every method links to a real stop`); }
  ok(solve('23 × 47').methods.length === 3 && solve('96 × 97').methods.length === 4 && solve('347 × 26').methods.length === 2, 'working: the right methods for each product');

  // the flows: Enter, Escape, examples, tabs, recent sums
  const ctx = makeCtx('working', '8-10');
  ok(clean(view(ctx)), 'working: fresh view');
  ctx.ui.q = '23 x 47'; ok(key({ key: 'Enter' }, ctx) && ctx.ui.shown === '23 x 47' && ctx.data.recent[0] === '23 x 47', 'working: Enter shows the working and remembers the sum');
  ok(key({ key: 'ArrowRight' }, ctx) && ctx.ui.tab === 1 && key({ key: 'ArrowLeft' }, ctx) && ctx.ui.tab === 0 && key({ key: 'ArrowLeft' }, ctx) && ctx.ui.tab === 2, 'working: arrows move between methods and wrap');
  act('tab', '1', ctx); ok(ctx.ui.tab === 1 && /t-working-panel on"><h3><span class="t-working-num">2/.test(view(ctx)), 'working: a tab picks the method shown on a phone');
  act('ex', '35% of 80', ctx); ok(ctx.ui.q === '35% of 80' && ctx.ui.shown === '35% of 80' && ctx.ui.tab === 0 && view(ctx).includes('= 28'), 'working: an example button shows its working');
  act('ex', 'hello', ctx); ok(ctx.data.recent[0] !== 'hello', 'working: a sum it cannot read is not remembered');
  for (let i = 0; i < 10; i++) act('ex', `${i} + ${i}`, ctx);
  ok(ctx.data.recent.length === 6, 'working: recent sums are capped at 6');
  ok(key({ key: 'Escape' }, ctx) && ctx.ui.q === '' && ctx.ui.shown === '', 'working: Escape clears');
  ok(!key({ key: 'q' }, ctx), 'working: other keys are left alone');
  act('forget', '', ctx); ok(ctx.data.recent.length === 0, 'working: forgets on request');
}
