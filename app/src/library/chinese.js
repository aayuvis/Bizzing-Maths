/* chinese.js — the Chinese Maths Journey (docs/LIBRARY-CONTRACT.md, JOURNEY).

   A path of stepping stones through methods from the Chinese mathematical
   tradition: counting rods and the rod numerals, the empty place, the suanpan,
   multiplying on the counting board, the Lo Shu, four kinds of problem from
   the Nine Chapters (sharing in proportion, exchanging at a rate, excess and
   deficit, fangcheng arrays), the gougu rule, the Sunzi remainder problem and
   Yang Hui's triangle. Each stone: short cards (what the method is, where the
   sources say it appears, why it works, a worked example drawn), then ten
   try-it questions; eight of ten walks the child on.

   HISTORY RULE (CLAUDE.md rule 6): every date, book, person or origin claim on
   a stone is in that stone's `sources`, stated no more strongly than those
   works state it, and flagged `needsReview`. Traditions are never ranked, and
   nothing here says who was "first" — only where and when a thing appears in
   the sources.

   The maths rule is the Atlas's: every question is checked three ways, and
   selftest() proves the rods, the abacus, the Lo Shu, the triples, the
   remainders and the triangle over whole ranges. */

import { paintedRoad } from '../board.js';
import { avatarFile } from '../model.js';
import { int, pick, shuffle } from '../rand.js';
import { META } from './shelf.js';

export const TOOL = META.chinese;   // name, blurb and art live on the shelf (shelf.js), which loads without the tool

const P = 't-chinese';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PASS = 8, DRILL = 10;
const LV = { '6-7': 1, '8-10': 2, '11-14': 3 };
const LV_NAME = ['', 'Gentle', 'Steady', 'Stretch'];

/* Drawings also appear inside drills, where this tool's CSS is not on the page — so
   they colour themselves with inline styles, from the app's CSS variables only. */
const ST = {
  rod: 'stroke:var(--treasure-deep);stroke-width:4.5;stroke-linecap:round', hole: 'fill:none;stroke:var(--line);stroke-width:1.5;stroke-dasharray:4 4',
  board: 'fill:var(--surface2);stroke:var(--line)', frame: 'fill:var(--treasure-deep)', inner: 'fill:var(--surface2)', wire: 'stroke:var(--muted);stroke-width:3',
  beam: 'fill:var(--treasure-deep)', sel: 'fill:var(--action-tint)', bead: 'fill:var(--surface);stroke:var(--ink);stroke-width:1.5', beadOn: 'fill:var(--fix);stroke:var(--ink);stroke-width:1.5',
  dot1: 'fill:var(--surface);stroke:var(--ink);stroke-width:1.5', dot2: 'fill:var(--ink)',
};

/* ------------------------------------------------------------ sources */

const NINE = 'Shen Kangshen, John N. Crossley and Anthony W.-C. Lun, The Nine Chapters on the Mathematical Art: Companion and Commentary (Oxford University Press, 1999).';
const MARTZLOFF = 'Jean-Claude Martzloff, A History of Chinese Mathematics (Springer, 1997).';
const NEEDHAM = 'Joseph Needham, with the collaboration of Wang Ling, Science and Civilisation in China, Vol. 3: Mathematics and the Sciences of the Heavens and the Earth (Cambridge University Press, 1959).';
const LAM = 'Lam Lay Yong and Ang Tian Se, Fleeting Footsteps: Tracing the Conception of Arithmetic and Algebra in Ancient China (World Scientific, 1992; revised edition 2004).';
const CULLEN = 'Christopher Cullen, Astronomy and Mathematics in Ancient China: The Zhou Bi Suan Jing (Cambridge University Press, 1996).';

/* ------------------------------------------------------------ small maths */

const digitsOf = (n) => String(n).split('').map(Number);
const PLACE = ['units', 'tens', 'hundreds', 'thousands', 'ten-thousands'];
const SHORT = ['1s', '10s', '100s', '1000s', '10 000s'];
const leaks = (q) => !q.choices && String(q.ans).length > 1 && q.text.split(/[^0-9./]/).includes(String(q.ans));
const guard = (fn) => (r, lv = 1) => { let q; for (let i = 0; i < 80; i++) { q = fn(r, lv); if (!leaks(q)) break; } return q; };
const choose = (n, k) => { if (k < 0 || k > n) return 0; k = Math.min(k, n - k); let c = 1; for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i; return Math.round(c); };

/* Rod numerals. Place 0 (units) is upright, place 1 (tens) lies flat, and so
   on, taking turns. A digit 1–5 is that many rods; 6–9 is one crossing rod
   worth five, and 1–4 more. A zero is an empty place. */
export function rodEncode(n) {
  return digitsOf(n).map((d, i, a) => {
    const p = a.length - 1 - i, form = p % 2 === 0 ? 'upright' : 'flat';
    return d === 0 ? { p, form, empty: true } : { p, form, five: d > 5 ? 1 : 0, ones: d > 5 ? d - 5 : d };
  });
}
export function rodDecode(cells) {
  let n = 0;
  cells.forEach((c, i) => {
    const p = cells.length - 1 - i;
    if (c.p !== p || c.form !== (p % 2 === 0 ? 'upright' : 'flat')) n = NaN;   // a numeral read in the wrong form is not read
    n = n * 10 + (c.empty ? 0 : 5 * c.five + c.ones);
  });
  return n;
}
const rodExpr = (n) => rodEncode(n).map((c) => `(${c.empty ? 0 : `5*${c.five}+${c.ones}`})*${10 ** c.p}`).join('+');
const rodSays = (c) => (c.empty ? 'an empty place' : `${c.form}: ${c.five ? 'a crossing rod for five and ' : ''}${c.ones} rod${c.ones === 1 ? '' : 's'}`);

/* The suanpan: each rod has two beads above the beam (5 each) and five below
   (1 each). A digit is written with at most one upper and four lower. */
export const ROD_COUNT = 5;
export function abEncode(n, R = ROD_COUNT) {
  const d = String(n).padStart(R, '0').split('').map(Number);
  return { h: d.map((x) => (x >= 5 ? 1 : 0)), e: d.map((x) => x % 5) };
}
export const abRod = (ab, i) => 5 * ab.h[i] + ab.e[i];
export const abDecode = (ab) => ab.h.reduce((s, _, i) => s * 10 + abRod(ab, i), 0);
const abExpr = (n) => { const ab = abEncode(n); return ab.h.map((h, i) => `(5*${h}+${ab.e[i]})*${10 ** (ROD_COUNT - 1 - i)}`).join('+'); };

/* The Lo Shu, and the eight ways to turn and flip it. */
export const LOSHU = [[4, 9, 2], [3, 5, 7], [8, 1, 6]];
const turn = (m) => m[0].map((_, c) => m.map((row) => row[c]).reverse());
const flip = (m) => m.map((row) => row.slice().reverse());
export const LOSHU_ALL = (() => { const out = []; let m = LOSHU; for (let i = 0; i < 4; i++) { out.push(m, flip(m)); m = turn(m); } return out; })();
export const LINES = [[[0, 0], [0, 1], [0, 2]], [[1, 0], [1, 1], [1, 2]], [[2, 0], [2, 1], [2, 2]], [[0, 0], [1, 0], [2, 0]], [[0, 1], [1, 1], [2, 1]], [[0, 2], [1, 2], [2, 2]], [[0, 0], [1, 1], [2, 2]], [[0, 2], [1, 1], [2, 0]]];
export const isMagic = (m) => { const t = LINES.map((L) => L.reduce((s, [r, c]) => s + m[r][c], 0)); return t.every((x) => x === t[0]); };

/* Right triangles: gou, gu, xian. */
export const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [12, 35, 37], [9, 40, 41], [28, 45, 53]];

/* Sunzi: the smallest number above zero with all the given remainders. */
export function sunzi(ms, rs) { for (let n = 1; n <= ms.reduce((a, b) => a * b, 1); n++) if (ms.every((m, i) => n % m === rs[i])) return n; return null; }

/* ------------------------------------------------------------ questions */

const qRead = (n) => ({ kind: 'read', n, text: 'What number do these rods show?', expr: rodExpr(n), ans: n, html: rodSvg(n) });
const qForm = (p) => ({ kind: 'form', p, text: `In the ${PLACE[p]} place, how do the rods lie?`, choices: ['Upright', 'Lying flat'], expr: `(${p}%2===0)?'Upright':'Lying flat'`, ans: p % 2 === 0 ? 'Upright' : 'Lying flat' });
const qRodAdd = (a, b) => ({ kind: 'rodadd', a, b, text: 'Add the top number to the bottom number.', expr: `(${rodExpr(a)})+(${rodExpr(b)})`, ans: a + b, html: rodSvg(a) + rodSvg(b) });
const qAbRead = (n) => ({ kind: 'abread', n, text: 'What number is on the suanpan?', expr: abExpr(n), ans: n, html: abSvg(abEncode(n)) });
const qAbAdd = (a, b) => ({ kind: 'abadd', a, b, text: `The suanpan shows a number. Add ${b} to it.`, expr: `(${abExpr(a)})+${b}`, ans: a + b, html: abSvg(abEncode(a)) });
const qMul = (a, b) => ({ kind: 'mul', a, b, text: `${a} × ${b}`, expr: `${a}*${b}`, ans: a * b, html: boardSvg(a, b) });
const qShare = (w, u, i) => { const S = w.reduce((a, b) => a + b, 0), T = S * u; return { kind: 'share', w, u, i, T, S, text: `${T} measures of millet are shared in the ratio ${w.join(' : ')}. How many measures is the ${['first', 'second', 'third', 'fourth', 'fifth'][i]} share?`, expr: `${T}*${w[i]}/${S}`, ans: w[i] * u }; };
const qRate = (a, b, c) => ({ kind: 'rate', a, b, c, text: `${a} measures of millet can be exchanged for ${b} measures of rice. How much rice for ${c} measures of millet?`, expr: `${c}*${b}/${a}`, ans: (c * b) / a });
const qBuy = (n, p, a, b, ask) => { const e = a * n - p, d = p - b * n;
  return { kind: 'buy', n, p, a, b, e, d, ask, text: `Some people buy a thing together. If each pays ${a} coins, there are ${e} too many. If each pays ${b}, there are ${d} too few. ${ask === 'people' ? 'How many people are there?' : 'What does the thing cost?'}`,
    expr: ask === 'people' ? `(${e}+${d})/(${a}-${b})` : `(${a}*${d}+${b}*${e})/(${a}-${b})`, ans: ask === 'people' ? n : p }; };
const qGuess = (x, k, g1, g2) => { const e1 = k * (g1 - x), d2 = k * (x - g2);
  return { kind: 'guess', x, k, g1, g2, e1, d2, text: `Guess ${g1}, and the result comes out ${e1} too big. Guess ${g2}, and it comes out ${d2} too small. The result grows steadily with the guess. What is the true number?`,
    expr: `(${g1}*${d2}+${g2}*${e1})/(${e1}+${d2})`, ans: x }; };
const qArray = (a1, b1, a2, b2, x, y, ask) => { const c1 = a1 * x + b1 * y, c2 = a2 * x + b2 * y;
  return { kind: 'array', a1, b1, c1, a2, b2, c2, x, y, ask, text: `Right column: ${a1} bundles of top grain and ${b1} of low grain give ${c1} measures. Left column: ${a2} top and ${b2} low give ${c2}. How many measures does one bundle of ${ask === 'x' ? 'top' : 'low'} grain give?`,
    expr: ask === 'x' ? `(${c1}*${b2}-${c2}*${b1})/(${a1}*${b2}-${a2}*${b1})` : `(${a1}*${c2}-${a2}*${c1})/(${a1}*${b2}-${a2}*${b1})`, ans: ask === 'x' ? x : y, html: arraySvg(a1, b1, c1, a2, b2, c2) }; };
const qGougu = (a, b, c, ask) => ({ kind: 'gougu', a, b, c, ask,
  text: ask === 'xian' ? `A right-angled triangle has gou ${a} and gu ${b}. How long is the xian?` : `A right-angled triangle has gou ${a} and xian ${c}. How long is the gu?`,
  expr: ask === 'xian' ? `Math.sqrt(${a}*${a}+${b}*${b})` : `Math.sqrt(${c}*${c}-${a}*${a})`, ans: ask === 'xian' ? c : b, html: triSvg(a, b, c, ask) });
const qSunzi = (ms, rs) => ({ kind: 'sunzi', ms, rs,
  text: `A number leaves ${ms.map((m, i) => `${rs[i]} when divided by ${m}`).join(', ').replace(/, ([^,]*)$/, ', and $1')}. What is the smallest such number?`,
  expr: `(()=>{for(let n=1;;n++)if(${ms.map((m, i) => `n%${m}===${rs[i]}`).join('&&')})return n})()`, ans: sunzi(ms, rs) });
const prodExpr = (n, k) => { const kk = Math.min(k, n - k); if (kk === 0) return '1'; const top = [], bot = []; for (let i = 0; i < kk; i++) { top.push(n - i); bot.push(kk - i); } return `(${top.join('*')})/(${bot.join('*')})`; };
const qYang = (n, k) => ({ kind: 'yang', n, k, text: `Row ${n} of the triangle (the single 1 at the top is row 0): what is number ${k} along, counting the first 1 as number 0?`, expr: prodExpr(n, k), ans: choose(n, k), html: n <= 9 ? yangSvg(n, k) : '' });
const qYangSum = (n) => ({ kind: 'yangsum', n, text: `Add up every number in row ${n} of the triangle.`, expr: `2**${n}`, ans: 2 ** n, html: n <= 8 ? yangSvg(n - 1, -1) : '' });
const qLoshu = (m, k, c, holes, ask) => {
  const g = m.map((row) => row.map((v) => k * v + c)), T = 3 * (5 * k + c), [ar, ac] = ask;
  const line = LINES.find((L) => L.some(([r, cc]) => r === ar && cc === ac) && L.every(([r, cc]) => (r === ar && cc === ac) || !holes.some(([hr, hc]) => hr === r && hc === cc)));
  const others = line.filter(([r, cc]) => !(r === ar && cc === ac)).map(([r, cc]) => g[r][cc]);
  const full = LINES.find((L) => L.every(([r, cc]) => !holes.some(([hr, hc]) => hr === r && hc === cc)));
  return { kind: 'loshu', g, T, holes, ask, others, full: full.map(([r, cc]) => g[r][cc]), text: 'Every row, column and diagonal adds up to the same total. What number goes in the square marked ?',
    expr: `(${full.map(([r, cc]) => g[r][cc]).join('+')})-${others[0]}-${others[1]}`, ans: g[ar][ac], html: loshuSvg(g, holes, ask) };
};
const qLoshuTotal = (m, k, c) => { const g = m.map((row) => row.map((v) => k * v + c)); return { kind: 'lototal', g, T: 3 * (5 * k + c), text: 'What does every row, column and diagonal of this magic square add up to?', expr: `${g[0].join('+')}`, ans: 3 * (5 * k + c), html: loshuSvg(g, [], null) }; };

/* A number with at least one empty place. */
function withZero(r, len) {
  for (;;) { const d = [int(1, 9, r)]; for (let i = 1; i < len; i++) d.push(r() < 0.35 ? 0 : int(1, 9, r)); if (d.includes(0)) return Number(d.join('')); }
}

/* ------------------------------------------------------------ the path */

export const JOURNEY = [
  {
    id: 'rods', title: 'Counting with rods', kicker: 'The rod numerals',
    cards: [
      'In the Chinese mathematical books, sums were worked with counting rods: short sticks laid out on a table or a board. A number was made out of rods, and a calculation was a way of moving them.',
      'Each digit is a little bundle of rods. One to five are that many rods side by side. For six to nine, one rod lies across the top and stands for five, and the rods under it count on: six is five and one. Type a number to see it in rods.',
      'Places take turns. The units are upright, the tens lie flat, the hundreds are upright again, the thousands flat. The sources explain the turns this way: with no gaps between places, you can still see where one digit stops and the next begins.',
      'Why it works: it is place value, just like our numbers. 36 is not "3 and 6" — it is 3 tens and 6 units, and the flat 3 and the upright 6 say exactly that.',
    ],
    play: 'rods', playAt: 1,
    sources: [NEEDHAM, MARTZLOFF, LAM], needsReview: true,
    ex: qRead(36),
    gen: guard((r, lv) => {
      if (lv >= 2 && r() < 0.2) return qForm(int(0, lv === 2 ? 2 : 4, r));
      return qRead(lv === 1 ? int(1, 99, r) : lv === 2 ? int(10, 999, r) : int(100, 9999, r));
    }),
    work(q) {
      if (q.kind === 'form') return [{ t: `The ${PLACE[q.p]} place is place number ${q.p} from the right, counting the units as 0`, v: q.p }, { t: q.p % 2 === 0 ? 'Even places stand upright' : 'Odd places lie flat', v: q.ans }];
      const cells = rodEncode(q.n);
      return [...cells.map((c) => ({ t: `${PLACE[c.p][0].toUpperCase() + PLACE[c.p].slice(1)}: ${rodSays(c)}`, v: c.empty ? 0 : 5 * c.five + c.ones })), { t: 'Read the places together', v: q.n }];
    },
    fig: (q) => rodSvg(q.n, true),
  },
  {
    id: 'empty', title: 'The empty place', kicker: 'Place value and nothing',
    cards: [
      'What about a number like 405? On the counting board, a place with nothing in it was simply left empty. The 4 sits in the hundreds place, the tens place is bare, and the 5 sits in the units.',
      'Because every place has its own spot on the board, an empty spot is still a place — it means "none of these". That is exactly the job our 0 does. The sources say that later written books drew a small circle for the empty place.',
      'Why it matters: 405 and 45 use the same rods. Only the empty place between them tells them apart — 4 hundreds, no tens, 5 units, against 4 tens and 5 units.',
    ],
    play: 'rods', playAt: 0,
    sources: [MARTZLOFF, NEEDHAM], needsReview: true,
    ex: qRead(4005),
    gen: guard((r, lv) => {
      if (lv === 3 && r() < 0.4) return qRodAdd(withZero(r, 4), withZero(r, 3));
      if (lv === 2 && r() < 0.3) return qRodAdd(withZero(r, 3), int(11, 99, r));
      return qRead(withZero(r, lv === 1 ? 3 : lv === 2 ? 4 : 5));
    }),
    work(q) {
      if (q.kind === 'rodadd') {
        const s = [{ t: 'Top number', v: q.a }, { t: 'Bottom number', v: q.b }];
        const A = digitsOf(q.a).reverse(), B = digitsOf(q.b).reverse(); let carry = 0;
        for (let p = 0; p < Math.max(A.length, B.length); p++) { const t = (A[p] || 0) + (B[p] || 0) + carry; s.push({ t: `${PLACE[p]}: ${A[p] || 0} + ${B[p] || 0}${carry ? ' + 1 carried' : ''}, keep`, v: t % 10 }); carry = Math.floor(t / 10); }
        s.push({ t: 'Read the board', v: q.ans });
        return s;
      }
      return [...rodEncode(q.n).map((c) => ({ t: `${PLACE[c.p]}: ${rodSays(c)}`, v: c.empty ? 0 : 5 * c.five + c.ones })), { t: 'Read the places together', v: q.n }];
    },
    fig: (q) => rodSvg(q.n, true),
  },
  {
    id: 'suanpan', title: 'The suanpan', kicker: 'The Chinese abacus',
    cards: [
      'The suanpan is the Chinese abacus: a frame of rods with beads, and a beam across the middle. Each rod is one place — units on the right, then tens, hundreds and on.',
      'On a suanpan each rod has two beads above the beam and five below. A bead counts when it is pushed to the beam: an upper bead is worth 5, a lower bead 1. So 7 is one upper bead and two lower. Try it — tap the beads, or use the arrow keys.',
      'Adding is pushing beads: set the first number, then add the second rod by rod, starting from the left or the right. When a rod goes past 9, clear ten from it and push one bead on the next rod to the left — a carry you can see.',
      'Why it works: every rod is a place, and five-and-ones is just a quicker way to see a digit than ten beads in a row, the same idea as the rod numerals\' crossing rod.',
    ],
    play: 'abacus', playAt: 1,
    sources: [MARTZLOFF, NEEDHAM], needsReview: true,
    ex: qAbAdd(47, 38),
    gen: guard((r, lv) => {
      if (lv === 1) return r() < 0.7 ? qAbRead(int(1, 99, r)) : qAbAdd(int(1, 9, r), int(1, 9, r));
      if (lv === 2) return r() < 0.5 ? qAbRead(int(10, 9999, r)) : qAbAdd(int(10, 99, r), int(5, 99, r));
      return r() < 0.4 ? qAbRead(int(1000, 99999, r)) : qAbAdd(int(100, 9999, r), int(10, 999, r));
    }),
    work(q) {
      if (q.kind === 'abread') {
        const ab = abEncode(q.n), s = [];
        ab.h.forEach((h, i) => { const p = ROD_COUNT - 1 - i; if (p < String(q.n).length) s.push({ t: `${PLACE[p]} rod: ${h} upper bead${h === 1 ? '' : 's'} (${5 * h}) and ${ab.e[i]} lower`, v: abRod(ab, i) }); });
        return [...s, { t: 'Read the rods', v: q.n }];
      }
      const A = digitsOf(q.a).reverse(), B = digitsOf(q.b).reverse(), s = []; let carry = 0;
      for (let p = 0; p < Math.max(A.length, B.length) || carry; p++) { const t = (A[p] || 0) + (B[p] || 0) + carry; s.push({ t: `${PLACE[p]} rod: ${A[p] || 0} + ${B[p] || 0}${carry ? ' + 1 carried' : ''}${t > 9 ? ' — clear ten, carry one' : ''}`, v: t % 10 }); carry = Math.floor(t / 10); }
      return [...s, { t: 'Read the rods', v: q.ans }];
    },
    fig: (q) => abSvg(abEncode(q.a)) + `<p class="${P}-cap">${q.a} on the suanpan. Add ${q.b}, rod by rod.</p>`,
  },
  {
    id: 'board', title: 'Multiplying on the counting board', kicker: 'Top, middle and bottom rows',
    cards: [
      'The Sunzi suanjing — Master Sun\'s Mathematical Manual, usually dated to between the third and fifth centuries CE — describes multiplying with rods. One number goes in the top row, the other in the bottom row, and the answer grows in the middle row.',
      'Start with the highest digit of the top number. Multiply the whole bottom number by it, and lay the result in the middle, lined up under that digit\'s place. Then take the next digit, and add its product into the middle. When the top row is used up, the middle row is the answer.',
      'Why it works: 23 × 45 is 20 × 45 and 3 × 45, added. Each digit of the top number is a place value — the 2 means 2 tens — so each product lands in its own place, and the middle row adds them as it goes.',
    ],
    sources: [LAM, MARTZLOFF], needsReview: true,
    ex: qMul(23, 45),
    gen: guard((r, lv) => (lv === 1 ? qMul(int(11, 99, r), int(2, 9, r)) : lv === 2 ? qMul(int(11, 99, r), int(11, 99, r)) : qMul(int(101, 999, r), int(11, 99, r)))),
    work({ a, b }) {
      const d = digitsOf(a), s = [];
      d.forEach((x, i) => { const p = d.length - 1 - i; if (x) s.push({ t: `${x}${'0'.repeat(p)} × ${b}`, v: x * 10 ** p * b }); });
      return [...s, { t: 'Add them in the middle row', v: a * b }];
    },
    fig: (q) => boardSvg(q.a, q.b, q.a * q.b),
  },
  {
    id: 'loshu', title: 'The Lo Shu', kicker: 'A magic square',
    cards: [
      'The Lo Shu is a three-by-three square of the numbers 1 to 9 in which every row, every column and both diagonals add up to the same total. In the story as it is told, the pattern was seen on the shell of a turtle that came out of the Luo river.',
      'Yang Hui wrote about the Lo Shu, and built bigger magic squares of his own, in the thirteenth century.',
      'Why the total must be 15: 1 + 2 + … + 9 = 45, and the three rows share it out equally, so each row is 45 ÷ 3. The middle square must be 5 — the middle row, the middle column and both diagonals all pass through it.',
      'Make a new magic square: multiply every number by the same amount, or add the same amount to every number. Every line changes in the same way, so it stays magic.',
    ],
    sources: [NEEDHAM, MARTZLOFF], needsReview: true,
    ex: qLoshu(LOSHU, 1, 0, [[0, 1]], [0, 1]),
    gen: guard((r, lv) => {
      const m = pick(LOSHU_ALL, r), k = lv === 3 ? int(2, 5, r) : 1, c = lv === 3 ? int(0, 10, r) : 0;
      if (lv >= 2 && r() < 0.2) return qLoshuTotal(m, k, c);
      const cells = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8], r).slice(0, lv === 1 ? 1 : 2).map((x) => [Math.floor(x / 3), x % 3]);
      return qLoshu(m, k, c, cells, cells[0]);
    }),
    work(q) {
      if (q.kind === 'lototal') return [{ t: `Add the top row: ${q.g[0].join(' + ')}`, v: q.T }];
      return [
        { t: `A full line: ${q.full.join(' + ')}`, v: q.T },
        { t: `The line through ?: its other two, ${q.others[0]} + ${q.others[1]}`, v: q.others[0] + q.others[1] },
        { t: `${q.T} − ${q.others[0] + q.others[1]}`, v: q.ans },
      ];
    },
    fig: () => loshuSvg(LOSHU, [], null) + loshuDots(),
  },
  {
    id: 'sharing', title: 'Sharing in proportion', kicker: 'The Nine Chapters, chapter three',
    cards: [
      'The Nine Chapters on the Mathematical Art (Jiuzhang suanshu) is a book of 246 problems, each with its answer and a method, arranged in nine chapters. Scholars usually date it to around the first century CE, and some of its material may be older. Liu Hui wrote a commentary on it, usually dated to 263 CE.',
      'Its third chapter, Cuifen, is about sharing things out in proportion: when people have different claims, each gets a share in the same ratio.',
      'The method: add up the parts of the ratio. Divide the whole by that to find one part. Each share is its number of parts. 36 in the ratio 3 : 2 : 1 is 6 parts; one part is 6; the shares are 18, 12 and 6.',
      'Why it works: the ratio says "for every 3 the first gets, the second gets 2 and the third 1". Six measures go out in every round of sharing, so the number of rounds is the whole ÷ 6.',
    ],
    sources: [NINE, MARTZLOFF], needsReview: true,
    ex: qShare([3, 2, 1], 6, 0),
    gen: guard((r, lv) => {
      const w = pick(lv === 1 ? [[2, 1], [3, 1], [3, 2], [4, 1], [5, 3]] : lv === 2 ? [[3, 2, 1], [4, 3, 2], [5, 3, 2], [4, 2, 1]] : [[5, 4, 3, 2, 1], [4, 3, 2, 1], [6, 5, 4]], r);
      return qShare(w, int(2, lv === 1 ? 9 : lv === 2 ? 12 : 20, r), int(0, w.length - 1, r));
    }),
    work(q) {
      return [
        { t: `Add the parts: ${q.w.join(' + ')}`, v: q.S },
        { t: `One part: ${q.T} ÷ ${q.S}`, v: q.u },
        { t: `The ${['first', 'second', 'third', 'fourth', 'fifth'][q.i]} share: ${q.w[q.i]} parts`, v: q.ans },
      ];
    },
    fig: (q) => shareSvg(q.w, q.u),
  },
  {
    id: 'rate', title: 'Exchanging at a rate', kicker: 'The Nine Chapters, chapter two',
    cards: [
      'The second chapter of the Nine Chapters, Sumi ("millet and rice"), is about exchanging one grain for another at a fixed rate.',
      'Its method: multiply the amount you have by the rate of what you want, then divide by the rate of what you have. In English it is often called the rule of three, because three numbers are known and you find the fourth.',
      'If 5 measures of millet exchange for 3 of rice, 20 measures of millet give 20 × 3 ÷ 5 = 12 measures of rice.',
      'Why it works: 20 millet is 4 lots of 5 millet, and each lot of 5 brings 3 rice. Multiplying first and dividing last gives the same answer, and on the counting board it keeps every number whole for as long as possible.',
    ],
    sources: [NINE, MARTZLOFF], needsReview: true,
    ex: qRate(5, 3, 20),
    gen: guard((r, lv) => {
      for (;;) {
        const a = int(2, lv === 3 ? 15 : 9, r), b = int(2, lv === 3 ? 30 : 12, r);
        const c = lv === 1 ? a * int(2, 6, r) : int(2, lv === 2 ? 40 : 120, r);
        if ((c * b) % a === 0 && c !== a && b !== a) return qRate(a, b, c);
      }
    }),
    work: (q) => [{ t: `What you have × the rate you want: ${q.c} × ${q.b}`, v: q.c * q.b }, { t: `÷ the rate you have, ${q.a}`, v: q.ans }],
    fig: (q) => rateSvg(q.a, q.b, q.c),
  },
  {
    id: 'excess', title: 'Excess and deficit', kicker: 'Yíng bù zú · two guesses',
    cards: [
      'The seventh chapter of the Nine Chapters is called Ying buzu — "excess and deficit". It has problems like this: some people buy a thing together. If each pays 8 coins, there are 3 too many; if each pays 7, there are 4 too few. How many people, and what is the price?',
      'The method: add the excess and the deficit (3 + 4 = 7). Take the smaller payment from the bigger (8 − 7 = 1). The number of people is 7 ÷ 1 = 7. Then the price: 7 people × 8 coins is 56, less the 3 too many: 53.',
      'Why it works: paying one coin more each changes the total by one coin per person. Going from "4 too few" to "3 too many" is a change of 7 coins, so there must be 7 people.',
      'Two guesses: the same idea solves many other problems. Make one guess that is too big and one that is too small. Cross-multiply each guess by the OTHER one\'s error, add, and divide by the two errors added. When the result grows steadily with the guess, this lands exactly on the answer.',
    ],
    alg: 'people = (excess + deficit) ÷ (a − b)   ·   answer = (g₁ × d₂ + g₂ × e₁) ÷ (e₁ + d₂)',
    sources: [NINE, MARTZLOFF], needsReview: true,
    ex: qBuy(7, 53, 8, 7, 'people'),
    gen: guard((r, lv) => {
      if (lv === 3 && r() < 0.4) { const x = int(5, 40, r), k = int(1, 6, r); return qGuess(x, k, x + int(1, 8, r), x - int(1, Math.min(8, x - 1), r)); }
      const n = int(3, lv === 1 ? 9 : 15, r), b = int(2, lv === 1 ? 8 : 20, r), a = b + int(1, lv === 1 ? 2 : 4, r);
      const d = int(1, n * (a - b) - 1, r), p = b * n + d;
      return qBuy(n, p, a, b, lv === 1 || r() < 0.5 ? 'people' : 'price');
    }),
    work(q) {
      if (q.kind === 'guess') return [
        { t: `${q.g1} × ${q.d2} (first guess × second error)`, v: q.g1 * q.d2 },
        { t: `${q.g2} × ${q.e1} (second guess × first error)`, v: q.g2 * q.e1 },
        { t: 'Add them', v: q.g1 * q.d2 + q.g2 * q.e1 },
        { t: `÷ (${q.e1} + ${q.d2})`, v: q.ans },
      ];
      const s = [
        { t: `Excess + deficit: ${q.e} + ${q.d}`, v: q.e + q.d },
        { t: `Difference in what each pays: ${q.a} − ${q.b}`, v: q.a - q.b },
        { t: `People: ${q.e + q.d} ÷ ${q.a - q.b}`, v: q.n },
      ];
      if (q.ask === 'price') s.push({ t: `Price: ${q.n} × ${q.a} − ${q.e}`, v: q.p });
      return s;
    },
    fig: (q) => buySvg(q),
  },
  {
    id: 'fangcheng', title: 'Fangcheng: the counting-board array', kicker: 'Two unknowns at once',
    cards: [
      'The eighth chapter of the Nine Chapters, Fangcheng, solves problems with several unknowns at once. Each condition is set out as a column of rods on the board, and whole columns are combined until only one unknown is left. The same chapter gives rules for working with positive and negative numbers.',
      'Two kinds of grain: the right column says 3 bundles of top grain and 2 of low grain give 29 measures; the left says 2 top and 3 low give 26. Multiply the left column by 3 (the right column\'s top), then take away the right column twice. The top place empties.',
      'What is left in the left column is 5 low bundles giving 20 measures: one low bundle is 4. Back in the right column, 3 top bundles give 29 − 2 × 4 = 21, so one top bundle is 7.',
      'Why it works: doing the same thing to every number in a column keeps it true, and taking one true column from another leaves a true column. You choose the multiples so that one unknown disappears.',
    ],
    sources: [NINE, MARTZLOFF], needsReview: true,
    ex: qArray(3, 2, 2, 3, 7, 4, 'x'),
    gen: guard((r, lv) => {
      for (;;) {
        const hi = lv === 1 ? 3 : lv === 2 ? 5 : 8;
        let a1 = int(1, hi, r), b1 = int(1, hi, r), a2 = int(1, hi, r), b2 = int(1, hi, r);
        if (a1 * b2 - a2 * b1 === 0) continue;
        if (a1 * b2 - a2 * b1 < 0) [a1, b1, a2, b2] = [a2, b2, a1, b1];
        const top = lv === 1 ? 9 : lv === 2 ? 12 : 20;
        return qArray(a1, b1, a2, b2, int(1, top, r), int(1, top, r), lv === 1 || r() < 0.5 ? 'x' : 'y');
      }
    }),
    work(q) {
      const D = q.a1 * q.b2 - q.a2 * q.b1, E = q.a1 * q.c2 - q.a2 * q.c1, y = E / D;
      const s = [
        { t: `Left column × ${q.a1}, less right column × ${q.a2}: low bundles left, ${q.a1}×${q.b2} − ${q.a2}×${q.b1}`, v: D },
        { t: `Measures left: ${q.a1}×${q.c2} − ${q.a2}×${q.c1}`, v: E },
        { t: `One low bundle: ${E} ÷ ${D}`, v: y },
      ];
      if (q.ask === 'x') s.push({ t: `Right column: (${q.c1} − ${q.b1} × ${y}) ÷ ${q.a1}`, v: (q.c1 - q.b1 * y) / q.a1 });
      return s;
    },
    fig: (q) => arraySvg(q.a1, q.b1, q.c1, q.a2, q.b2, q.c2),
  },
  {
    id: 'gougu', title: 'The gougu rule', kicker: 'Right-angled triangles',
    cards: [
      'In a right-angled triangle, Chinese mathematics calls the shorter side by the right angle the gou, the longer one the gu, and the long slanting side the xian. The ninth chapter of the Nine Chapters is named Gougu, after them.',
      'The rule: gou × gou + gu × gu = xian × xian. With gou 3 and gu 4: 9 + 16 = 25, and 5 × 5 = 25, so the xian is 5. The Zhou bi suan jing discusses it too, and a picture proof like the one here goes with Zhao Shuang\'s commentary on that book.',
      'Why it works — look at the picture: the square on the xian is made of four copies of the triangle and a small square in the middle. Four triangles are 2 × gou × gu; the middle square is (gu − gou)². Add them and the 2 × gou × gu cancels, leaving gou² + gu².',
    ],
    alg: 'xian² = 4 × ½·gou·gu + (gu − gou)² = gou² + gu²',
    sources: [NINE, CULLEN, NEEDHAM], needsReview: true,
    ex: qGougu(3, 4, 5, 'xian'),
    gen: guard((r, lv) => {
      const [a, b, c] = lv === 1 ? [3, 4, 5] : pick(TRIPLES.slice(0, lv === 2 ? 4 : 8), r), k = int(1, lv === 1 ? 4 : lv === 2 ? 3 : 4, r);
      return qGougu(a * k, b * k, c * k, lv === 1 || r() < 0.5 ? 'xian' : 'gu');
    }),
    work(q) {
      return q.ask === 'xian'
        ? [{ t: `Gou × gou: ${q.a} × ${q.a}`, v: q.a * q.a }, { t: `Gu × gu: ${q.b} × ${q.b}`, v: q.b * q.b }, { t: 'Add: xian × xian', v: q.c * q.c }, { t: `Which number times itself makes ${q.c * q.c}?`, v: q.c }]
        : [{ t: `Xian × xian: ${q.c} × ${q.c}`, v: q.c * q.c }, { t: `Gou × gou: ${q.a} × ${q.a}`, v: q.a * q.a }, { t: 'Take away: gu × gu', v: q.b * q.b }, { t: `Which number times itself makes ${q.b * q.b}?`, v: q.b }];
    },
    fig: () => xianSvg(3, 4),
  },
  {
    id: 'sunzi', title: 'The Sunzi remainder problem', kicker: 'Counting by threes, fives and sevens',
    cards: [
      'The Sunzi suanjing (Master Sun\'s Mathematical Manual) asks: there are some things, and we do not know how many. Counted by threes, 2 are left over. Counted by fives, 3 are left. Counted by sevens, 2 are left. How many things are there? Its answer is 23.',
      'One way: list the numbers that leave 2 when counted by sevens — 2, 9, 16, 23, … — and find the first that leaves 3 by fives. That is 23. Check it by threes: 23 = 21 + 2. Done.',
      'The book gives a quicker rule, too: take 70 for each left over by threes, 21 for each left by fives, 15 for each left by sevens, add them, and take away 105 as often as you can. 140 + 63 + 30 = 233; 233 − 210 = 23. It works because 70 leaves 1 by threes but nothing by fives or sevens — and 21 and 15 do the same for fives and sevens.',
      'Why there is one smallest answer: 3, 5 and 7 share no factor, so the pattern of leftovers repeats only every 3 × 5 × 7 = 105 numbers. Between 1 and 105, exactly one number has the leftovers you want. Today this idea has a name: the Chinese remainder theorem.',
    ],
    sources: [LAM, MARTZLOFF, NEEDHAM], needsReview: true,
    ex: qSunzi([3, 5, 7], [2, 3, 2]),
    gen: guard((r, lv) => {
      const ms = lv === 1 ? pick([[2, 3], [3, 4], [3, 5], [4, 5]], r) : lv === 2 ? [3, 5, 7] : pick([[3, 5, 7], [3, 4, 5], [4, 5, 7], [5, 7, 9], [3, 7, 8]], r);
      let rs; do rs = ms.map((m) => int(0, m - 1, r)); while (rs.every((x) => x === 0));
      return qSunzi(ms, rs);
    }),
    work(q) {
      const ms = q.ms, i0 = ms.length - 1, M = ms[i0], start = q.rs[i0] || M, s = [];
      let x = start, step = M;
      s.push({ t: `Leaves ${q.rs[i0]} by ${M}s: start at`, v: start });
      for (let j = i0 - 1; j >= 0; j--) { while (x % ms[j] !== q.rs[j]) x += step; s.push({ t: `Step on by ${step} until it also leaves ${q.rs[j]} by ${ms[j]}s`, v: x }); step *= ms[j]; }
      s.push({ t: 'The smallest number with every leftover', v: q.ans });
      return s;
    },
    fig: () => sunziSvg(23),
  },
  {
    id: 'yanghui', title: 'Yang Hui\'s triangle', kicker: 'The number triangle',
    cards: [
      'Start with a 1 at the top. Each row begins and ends with 1, and every other number is the sum of the two just above it. Row by row the triangle grows: 1 · 1 1 · 1 2 1 · 1 3 3 1 · 1 4 6 4 1.',
      'Yang Hui showed this triangle in a book usually dated to 1261, and named an earlier mathematician, Jia Xian, as its source. The same triangle of numbers turns up in the mathematics of many places, under other names.',
      'The rows are the numbers you get when you multiply out (1 + x) again and again: (1 + x)³ = 1 + 3x + 3x² + x³. They also count choices: row 4, number 2 is 6, the number of ways to choose 2 things from 4.',
      'Patterns to find: each row adds up to double the row before (1, 2, 4, 8, …), because every number is used twice in the row below. The second diagonal counts 1, 2, 3, 4…; the third makes the triangle numbers 1, 3, 6, 10…',
    ],
    alg: 'row n, number k = row n−1, number k−1  +  row n−1, number k',
    sources: [MARTZLOFF, NEEDHAM], needsReview: true,
    ex: qYang(5, 2),
    gen: guard((r, lv) => {
      const n = lv === 1 ? int(4, 6, r) : lv === 2 ? int(4, 9, r) : int(6, 14, r);
      if (r() < 0.25) return qYangSum(lv === 1 ? int(2, 6, r) : n);
      return qYang(n, int(2, n - 2, r));   // never number 1: it is the row number itself, printed in the question
    }),
    work(q) {
      if (q.kind === 'yangsum') return [{ t: `Row ${q.n - 1} adds up to`, v: 2 ** (q.n - 1) }, { t: 'Every number is used twice in the row below: double it', v: q.ans }];
      return [{ t: `Above-left: row ${q.n - 1}, number ${q.k - 1}`, v: choose(q.n - 1, q.k - 1) }, { t: `Above-right: row ${q.n - 1}, number ${q.k}`, v: choose(q.n - 1, q.k) }, { t: 'Add them', v: q.ans }];
    },
    fig: () => yangSvg(6, -1, true),
  },
];

/* ------------------------------------------------------------ drawings */

function svg(w, h, inner, label, cls = '') { return `<svg class="dg ${P}-svg ${cls}" style="max-width:100%;height:auto;display:block;margin:6px auto" viewBox="0 0 ${w} ${h}" width="${w}" role="img" aria-label="${esc(label)}">${inner}</svg>`; }
function T(x, y, s, cls = 'dg-small', anchor = 'middle') { return `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${esc(s)}</text>`; }

/* One rod digit in a 40 × 60 cell at (x, y). */
function rodCell(c, x, y) {
  if (c.empty) return `<rect x="${x + 4}" y="${y + 4}" width="32" height="52" rx="4" style="${ST.hole}"/>`;
  let s = '';
  if (c.form === 'upright') {
    const top = c.five ? y + 20 : y + 6;
    for (let k = 0; k < c.ones; k++) { const xx = x + 20 + (k - (c.ones - 1) / 2) * 7; s += `<line x1="${xx}" y1="${top}" x2="${xx}" y2="${y + 56}" style="${ST.rod}"/>`; }
    if (c.five) s += `<line x1="${x + 4}" y1="${y + 12}" x2="${x + 36}" y2="${y + 12}" style="${ST.rod}"/>`;
  } else {
    for (let k = 0; k < c.ones; k++) { const yy = y + 54 - k * 8; s += `<line x1="${x + 5}" y1="${yy}" x2="${x + 35}" y2="${yy}" style="${ST.rod}"/>`; }
    if (c.five) s += `<line x1="${x + 20}" y1="${y + 4}" x2="${x + 20}" y2="${y + 54 - (c.ones - 1) * 8 - 6}" style="${ST.rod}"/>`;
  }
  return s;
}
function rodGroup(n, x, y) { return rodEncode(n).map((c, i) => rodCell(c, x + i * 44, y)).join(''); }
export function rodSvg(n, labels = false) {
  const cells = rodEncode(n), W = cells.length * 44 + 12, H = labels ? 90 : 68;
  let s = `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="8" style="${ST.board}"/>` + rodGroup(n, 8, 4);
  if (labels) cells.forEach((c, i) => { s += T(8 + i * 44 + 20, 82, SHORT[c.p]); });
  return svg(W, H, s, labels ? `The number ${n} in rod numerals` : 'A number in rod numerals');
}
export function abSvg(ab, sel = -1, live = false) {
  const R = ab.h.length, W = R * 50 + 20, H = 230, beam = 74;
  let s = `<rect x="4" y="4" width="${W - 8}" height="${H - 8}" rx="10" style="${ST.frame}"/><rect x="12" y="12" width="${W - 24}" height="${H - 24}" rx="4" style="${ST.inner}"/>`;
  for (let i = 0; i < R; i++) {
    const x = 35 + i * 50;
    if (i === sel) s += `<rect x="${x - 22}" y="12" width="44" height="${H - 24}" rx="6" style="${ST.sel}"/>`;
    s += `<line x1="${x}" y1="12" x2="${x}" y2="${H - 12}" style="${ST.wire}"/>`;
    for (let j = 0; j < 2; j++) {   // upper beads, j = 0 nearest the beam
      const on = j < ab.h[i], y = on ? beam - 4 - 16 * (j + 1) : 14 + 16 * (1 - j);
      s += bead(x, y, on, live ? `bead|${i}|u|${j}` : '');
    }
    for (let j = 0; j < 5; j++) {   // lower beads, j = 0 nearest the beam
      const on = j < ab.e[i], y = on ? beam + 5 + 16 * j : H - 14 - 16 * (5 - j);
      s += bead(x, y, on, live ? `bead|${i}|l|${j}` : '');
    }
  }
  s += `<rect x="12" y="${beam - 3}" width="${W - 24}" height="6" style="${ST.beam}"/>`;
  return svg(W, H, s, live ? 'A suanpan you can set: tap a bead, or use the arrow keys' : 'A number on a suanpan', live ? `${P}-live` : '');
}
function bead(x, y, on, arg) {
  const shape = `<path d="M${x - 20},${y + 8} Q${x - 18},${y} ${x - 8},${y} L${x + 8},${y} Q${x + 18},${y} ${x + 20},${y + 8} Q${x + 18},${y + 16} ${x + 8},${y + 16} L${x - 8},${y + 16} Q${x - 18},${y + 16} ${x - 20},${y + 8} Z" class="${P}-bead" style="${on ? ST.beadOn : ST.bead}"/>`;
  return arg ? `<g data-act="lib" data-arg="${arg}" class="${P}-tap">${shape}</g>` : shape;
}
function boardSvg(a, b, product = null) {
  const la = String(a).length, lb = String(b).length, lp = String(a * b).length, cols = Math.max(la + lb, lp), W = cols * 44 + 90, H = 230;
  const right = (len) => 76 + (cols - len) * 44;
  let s = `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="8" style="${ST.board}"/>`;
  for (let k = 0; k <= cols; k++) s += `<line x1="${74 + k * 44}" y1="6" x2="${74 + k * 44}" y2="${H - 6}" class="dg-grid"/>`;
  s += T(38, 42, 'top') + T(38, 118, 'middle') + T(38, 194, 'bottom');
  s += rodGroup(a, right(la), 8);   // every row lined up by place: units under units
  s += product != null ? rodGroup(product, right(lp), 84) : `<text x="${right(lp) + (lp * 44) / 2}" y="124" class="dg-accent" text-anchor="middle">?</text>`;
  s += rodGroup(b, right(lb), 160);
  return svg(W, H, s, `The counting board: ${a} on top, ${b} below, the answer growing in the middle`);
}
function loshuSvg(g, holes, ask) {
  const u = 56; let s = '';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const hole = holes.some(([hr, hc]) => hr === r && hc === c), isAsk = ask && ask[0] === r && ask[1] === c;
    s += `<rect x="${4 + c * u}" y="${4 + r * u}" width="${u}" height="${u}" class="${isAsk ? 'dg-fill2' : hole ? 'dg-blank' : 'dg-blank'}"/>`;
    s += `<text x="${4 + c * u + u / 2}" y="${4 + r * u + u / 2 + 8}" class="${isAsk ? 'dg-accent' : 'dg-big'}" text-anchor="middle">${isAsk ? '?' : hole ? '' : g[r][c]}</text>`;
  }
  return svg(3 * u + 8, 3 * u + 8, s, 'A three by three magic square');
}
function loshuDots() {
  const u = 56; let s = '';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const v = LOSHU[r][c], cx = 4 + c * u + u / 2, cy = 4 + r * u + u / 2;
    s += `<rect x="${4 + c * u}" y="${4 + r * u}" width="${u}" height="${u}" class="dg-blank"/>`;
    for (let k = 0; k < v; k++) { const a = (k / v) * Math.PI * 2 - Math.PI / 2, rr = v === 1 ? 0 : 16; s += `<circle cx="${(cx + rr * Math.cos(a)).toFixed(1)}" cy="${(cy + rr * Math.sin(a)).toFixed(1)}" r="4.5" style="${v % 2 ? ST.dot1 : ST.dot2}"/>`; }
  }
  return svg(3 * u + 8, 3 * u + 8, s, 'The Lo Shu drawn with dots: count the dots in each square') + `<p class="${P}-cap">The same square in dots. Count them: every line makes 15.</p>`;
}
function xianSvg(a, b) {
  const u = 26, o = 10, P2 = (x, y) => `${o + x * u},${o + y * u}`, S = a + b;
  let s = `<rect x="${o}" y="${o}" width="${S * u}" height="${S * u}" class="dg-grid" fill="none"/>`;
  const outer = [[a, 0], [S, a], [b, S], [0, b]], inner = [[a, a], [b, a], [b, b], [a, b]];
  for (let i = 0; i < 4; i++) s += `<polygon points="${P2(...outer[i])} ${P2(...inner[i])} ${P2(...outer[(i + 1) % 4])}" class="dg-fill2"/>`;
  s += `<polygon points="${inner.map((p) => P2(...p)).join(' ')}" class="dg-fill3"/>`;
  s += `<polygon points="${outer.map((p) => P2(...p)).join(' ')}" fill="none" class="dg-line"/>`;
  s += T(o + (a + S) / 2 * u + 12, o + (a / 2) * u, 'xian', 'dg-accent', 'start');
  s += T(o + ((a + b) / 2) * u, o + ((a + b) / 2) * u + 5, `${b - a}²`, 'dg-small');
  return svg(S * u + 2 * o + 40, S * u + 2 * o, s, 'The square on the xian: four copies of the triangle round a small middle square')
    + `<p class="${P}-cap">Gou ${a}, gu ${b}: four triangles of ${(a * b) / 2} and a middle square of ${(b - a) ** 2} make ${2 * a * b + (b - a) ** 2} = ${a + b > 0 ? `${Math.sqrt(a * a + b * b)} × ${Math.sqrt(a * a + b * b)}` : ''}.</p>`;
}
function triSvg(a, b, c, ask) {
  const k = 150 / Math.max(a, b), W = b * k + 90, H = a * k + 50, x0 = 40, y0 = 20 + a * k;
  let s = `<polygon points="${x0},${y0} ${x0 + b * k},${y0} ${x0},${y0 - a * k}" class="dg-fill1"/><rect x="${x0}" y="${y0 - 12}" width="12" height="12" class="dg-blank"/>`;
  s += T(x0 - 8, y0 - (a * k) / 2 + 5, ask === 'gou' ? '?' : `gou ${a}`, ask === 'gou' ? 'dg-accent' : 'dg-text', 'end');
  s += T(x0 + (b * k) / 2, y0 + 20, ask === 'gu' ? 'gu ?' : `gu ${b}`, ask === 'gu' ? 'dg-accent' : 'dg-text');
  s += T(x0 + (b * k) / 2 + 12, y0 - (a * k) / 2 - 6, ask === 'xian' ? 'xian ?' : `xian ${c}`, ask === 'xian' ? 'dg-accent' : 'dg-text', 'start');
  return svg(W + 60, H, s, 'A right-angled triangle with its gou, gu and xian');
}
function yangSvg(n, ask, full = false) {
  const rows = n + 1, u = 34, W = rows * u + 20, H = rows * 30 + 14; let s = '';
  for (let r = 0; r < rows; r++) for (let k = 0; k <= r; k++) {
    const x = W / 2 + (k - r / 2) * u, y = 20 + r * 30, isAsk = r === n && k === ask, show = full || r < n || ask < 0;
    s += `<circle cx="${x}" cy="${y}" r="14" class="${isAsk ? 'dg-fill2' : r === n && !show ? 'dg-blank' : 'dg-blank'}"/>`;
    s += T(x, y + 5, isAsk ? '?' : show ? choose(r, k) : '', isAsk ? 'dg-accent' : 'dg-small');
  }
  return svg(W, H, s, `Yang Hui's triangle, rows 0 to ${n}`);
}
function shareSvg(w, u) {
  const S = w.reduce((a, b) => a + b, 0), cw = Math.min(26, 300 / S); let s = '', x = 6;
  w.forEach((p, i) => { for (let j = 0; j < p; j++) { s += `<rect x="${x}" y="8" width="${cw - 2}" height="30" rx="4" class="dg-fill${(i % 3) + 1}"/>`; x += cw; } s += T(x - (p * cw) / 2 - 1, 56, `${p * u}`); x += 6; });
  return svg(x + 6, 64, s, 'The whole cut into equal parts, each share a run of parts') + `<p class="${P}-cap">${S} equal parts of ${u}; each share is its own run of parts.</p>`;
}
function rateSvg(a, b, c) {
  return `<div class="${P}-rate mono"><span>${a} millet</span><span>→</span><span>${b} rice</span><span>${c} millet</span><span>→</span><span>${c} × ${b} ÷ ${a}</span></div>`;
}
function buySvg(q) {
  if (q.kind === 'guess') return `<div class="${P}-rate mono"><span>guess ${q.g1}</span><span>→</span><span>${q.e1} too big</span><span>guess ${q.g2}</span><span>→</span><span>${q.d2} too small</span></div>`;
  return `<div class="${P}-rate mono"><span>${q.a} each</span><span>→</span><span>${q.e} too many</span><span>${q.b} each</span><span>→</span><span>${q.d} too few</span></div>`;
}
function arraySvg(a1, b1, c1, a2, b2, c2) {
  const colW = Math.max(String(c1).length, String(c2).length, 2) * 44 + 12, W = 2 * colW + 110, H = 3 * 72 + 30;
  let s = `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="8" style="${ST.board}"/>`;
  ['top', 'low', 'measures'].forEach((l, r) => { s += T(46, 50 + r * 72, l); s += `<line x1="90" y1="${14 + (r + 1) * 72}" x2="${W - 8}" y2="${14 + (r + 1) * 72}" class="dg-grid"/>`; });
  const col = (vals, x) => vals.map((v, r) => rodGroup(v, x + colW - String(v).length * 44 - 6, 18 + r * 72)).join('');
  s += col([a2, b2, c2], 94) + col([a1, b1, c1], 94 + colW);
  s += T(94 + colW / 2, H - 6, 'left column') + T(94 + colW + colW / 2, H - 6, 'right column');
  return svg(W, H, s, 'A fangcheng array: each condition is a column of rod numerals');
}
function sunziSvg(n) {
  let s = '', y = 16;
  for (const m of [3, 5, 7]) {
    s += T(24, y + 5, `by ${m}s`, 'dg-small');
    for (let i = 0; i < n; i++) { const g = Math.floor(i / m), left = i >= n - (n % m); s += `<circle cx="${60 + i * 11 + g * 5}" cy="${y}" r="4.2" style="${left ? ST.dot2 : ST.dot1}"/>`; }
    s += T(60 + n * 11 + Math.floor(n / m) * 5 + 14, y + 5, `${n % m} left`, 'dg-accent', 'start');
    y += 28;
  }
  return svg(60 + n * 11 + 20 * 5 + 50, y, s, `${n} counted in threes, fives and sevens`) + `<p class="${P}-cap">${n} things, counted three ways. The dark dots are the ones left over.</p>`;
}
function badge(done) {
  return `<svg class="${P}-badge${done ? ' on' : ''}" viewBox="0 0 120 120" role="img" aria-label="${done ? 'The Counting-Rod Traveller badge, earned' : 'The Counting-Rod Traveller badge, not yet earned'}">
    <circle cx="60" cy="60" r="54" class="${P}-b1"/><rect x="24" y="24" width="72" height="72" rx="6" class="${P}-b2"/>
    ${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${30 + c * 21}" y="${30 + r * 21}" width="18" height="18" rx="3" class="${P}-b3" opacity="${0.35 + LOSHU[r][c] / 15}"/>`).join('')).join('')}</svg>`;
}

/* ------------------------------------------------------------ play: rods and the suanpan */

const TASKS = [
  { say: 'Show 7', t: 7 }, { say: 'Show 38', t: 38 }, { say: 'Show 506', t: 506 }, { say: 'Show 4072', t: 4072 },
  { say: 'Show 8, then add 7 with the beads', t: 15 }, { say: 'Show 46, then add 27', t: 73 }, { say: 'Show 99999', t: 99999 },
];
function ab(ctx) { if (!ctx.ui.ab) ctx.ui.ab = { ...abEncode(0), sel: ROD_COUNT - 1, task: 0 }; return ctx.ui.ab; }
function setRod(A, i, v) { const x = Math.max(0, Math.min(9, v)); A.h[i] = x >= 5 ? 1 : 0; A.e[i] = x % 5; }
function abCheck(ctx) { const A = ab(ctx); if (abDecode(A) === TASKS[A.task].t && !A.hit) { A.hit = true; ctx.sfx.good(); ctx.toast('That is it.'); } else if (abDecode(A) !== TASKS[A.task].t) A.hit = false; }
function playView(ctx, kind) {
  if (kind === 'rods') {
    const raw = String(ctx.ui.rod ?? '405'), n = /^\d{1,5}$/.test(raw.trim()) ? Number(raw.trim()) : null;
    return `<div class="${P}-play"><label class="${P}-in"><span>Type a number (up to 99999):</span>
      <input id="${P}-rodin" data-lib-input="rod" inputmode="numeric" maxlength="5" value="${esc(raw)}" autocomplete="off"></label>
      ${n != null ? rodSvg(n, true) + `<p class="${P}-cap">${n === 0 ? 'Zero: an empty board.' : `${esc(n)} in rods: ${rodEncode(n).map((c) => `${PLACE[c.p]} ${c.empty ? 'empty' : c.form}`).join(' · ')}`}</p>` : `<p class="muted">Whole numbers only, up to five digits.</p>`}</div>`;
  }
  const A = ab(ctx), v = abDecode(A), task = TASKS[A.task];
  return `<div class="${P}-play">
    <p class="${P}-task"><b>${esc(task.say)}</b>${v === task.t ? ' <span class="chip">✓ Yes</span>' : ''}</p>
    <div class="${P}-abwrap">${abSvg(A, A.sel, true)}</div>
    <p class="${P}-read mono" aria-live="polite">${v}</p>
    <div class="${P}-rods">${A.h.map((_, i) => `<button class="btn small${i === A.sel ? ' primary' : ''}" data-act="lib" data-arg="rod|${i}" aria-label="Choose the ${PLACE[ROD_COUNT - 1 - i]} rod">${PLACE[ROD_COUNT - 1 - i]}</button>`).join('')}</div>
    <div class="row gap ${P}-abbtn"><button class="btn small" data-act="lib" data-arg="step|-1" aria-label="One less on the chosen rod">− 1</button><button class="btn small" data-act="lib" data-arg="step|1" aria-label="One more on the chosen rod">+ 1</button>
      <button class="btn small" data-act="lib" data-arg="tidy">Tidy (carry)</button><button class="btn small" data-act="lib" data-arg="clear">Clear</button><button class="btn small" data-act="lib" data-arg="task">Next task</button></div>
    <p class="${P}-keys muted">Keys on this card: ← → choose a rod · ↑ ↓ one more or less · 0–9 set the rod · [ ] turn the cards</p></div>`;
}

/* ------------------------------------------------------------ the journey engine */

function rec(ctx) { const d = ctx.data; if (!d.passed) d.passed = {}; if (!d.best) d.best = {}; return d; }
export const isPassed = (ctx, i) => !!rec(ctx).passed[JOURNEY[i].id];
export const isOpen = (ctx, i) => i >= 0 && i < JOURNEY.length && (!!ctx.tester || i === 0 || isPassed(ctx, i - 1));
const hereOf = (ctx) => { const i = JOURNEY.findIndex((_, k) => !isPassed(ctx, k)); return i < 0 ? JOURNEY.length : i; };
const level = (ctx) => ctx.ui.lv || LV[ctx.band] || 2;
const pages = (st) => st.cards.length + 1;
const onPlay = (ctx) => { const st = ctx.ui.step != null ? JOURNEY[ctx.ui.step] : null; return st && st.play === 'abacus' && (ctx.ui.card || 0) === st.playAt; };

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
    <div class="${P}-head"><b>The Counting-Rod Road</b><span class="${P}-prog"><b class="mono">${walked}/${n}</b><span class="${P}-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${walked}"><i style="width:${Math.round((walked / n) * 100)}%"></i></span><span class="muted small">stones</span></span></div>
    ${paintedRoad({ img: 'j-chinese', stops, here: here < n ? here : -1, sel, me: avatarImg(ctx), minWidth: 1100, aspect: '1920/620', band: [74, 6, 1.2] })}
    <div class="card pick ${P}-pick">
      <div class="pick-t"><p class="kicker">Stone ${sel + 1} of ${n}${isPassed(ctx, sel) ? ' · walked ✓' : ''}</p><h2>${esc(st.title)}</h2><p class="pick-hook">${esc(st.kicker || '')}</p></div>
      ${open ? `<button class="btn primary big" data-act="lib" data-arg="open|${sel}">${isPassed(ctx, sel) ? 'Walk it again' : 'Step onto the stone'}</button>` : '<p class="muted">Walk the stone before it to open this one.</p>'}
    </div>
    ${d.badge ? `<div class="card ${P}-won">${badge(true)}<div><p class="kicker">Journey complete</p><h3>Counting-Rod Traveller</h3><p>You walked every stone. Any stone can be walked again.</p></div></div>` : ''}
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
    if (st.play && c === st.playAt) body += playView(ctx, st.play);
    if (st.alg && c === Math.max(0, st.cards.length - 2)) body += `<div class="${P}-alg mono">${esc(st.alg)}</div>`;
    if (last && st.ex) {
      const w = st.work(st.ex);
      body += `<div class="${P}-ex"><p class="kicker">Worked example</p><p class="${P}-exq">${esc(st.ex.text)}</p>${st.fig ? st.fig(st.ex) : ''}
        <ol class="${P}-steps">${w.map((s) => `<li><span>${esc(s.t)}</span><b class="mono">${esc(s.v)}</b></li>`).join('')}</ol></div>`;
    }
  } else {
    const best = d.best[st.id];
    body = `<div class="${P}-try"><p class="kicker">Try it</p><h3>Ten questions. Eight right and you walk on.</h3>
      <p class="muted">Each answer you get wrong shows you the working.</p>
      <div class="seg">${[1, 2, 3].map((l) => `<button class="${l === lv ? 'on' : ''}" data-act="lib" data-arg="lv|${l}">${LV_NAME[l]}</button>`).join('')}</div>
      <button class="btn primary big" data-act="lib" data-arg="start">Start — ${LV_NAME[lv]}</button>
      ${best != null ? `<p class="muted">Your best here: ${best} of ${DRILL}${isPassed(ctx, i) ? ' — walked.' : '.'}</p>` : ''}</div>`;
  }
  const abacusCard = st.play === 'abacus' && c === st.playAt;
  return `<div class="${P}">
    <div class="${P}-top"><button class="btn small" data-act="lib" data-arg="path">← The path</button>
      <span class="chip">Stone ${i + 1} of ${JOURNEY.length}</span>${isPassed(ctx, i) ? '<span class="chip">✓ Walked</span>' : ''}</div>
    <div class="card ${P}-step">
      <div class="${P}-sh" style="background-image:url(art/lib-chinese.webp)"><p class="kicker">${esc(st.kicker)}</p><h2>${esc(st.title)}</h2></div>
      <div class="${P}-page" aria-live="polite">${body}</div>
      <div class="${P}-nav">
        <button class="btn" data-act="lib" data-arg="card|${c - 1}" ${c === 0 ? 'disabled' : ''} aria-label="Previous card">←</button>
        <div class="${P}-dots">${Array.from({ length: np }, (_, k) => `<button class="${k === c ? 'on' : ''}" data-act="lib" data-arg="card|${k}" aria-label="${k === np - 1 ? 'Try it' : `Card ${k + 1}`}"></button>`).join('')}</div>
        <button class="btn${onTry ? '' : ' primary'}" data-act="lib" data-arg="card|${c + 1}" ${onTry ? 'disabled' : ''} aria-label="Next card">→</button>
      </div>
      <p class="${P}-keys muted">${abacusCard ? 'Keys: [ ] turn the cards · Esc back to the path' : 'Keys: ← → turn the cards · Esc back to the path'}</p>
    </div>
    ${st.sources ? `<details class="${P}-src"><summary>Sources${st.needsReview ? ' · being checked by a second reader' : ''}</summary><ol>${st.sources.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></details>` : ''}
  </div>`;
}

export function view(ctx) {
  const i = ctx.ui.step;
  return i != null && isOpen(ctx, i) ? stepView(ctx, i) : pathView(ctx);
}

/* A deep link names a stone by its id (#/lib/chinese|<stone>): open it if the child has
   walked to it, else stand on it on the path, where the screen says what opens it. */
export function openItem(id, ctx) {
  const i = JOURNEY.findIndex((st) => st.id === id); if (i < 0) return;
  ctx.ui.sel = i;
  if (isOpen(ctx, i)) { ctx.ui.step = i; ctx.ui.card = 0; }
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
    const lv = level(ctx);
    ctx.startRun(st.title, drillItems(st, lv), { step: st.id, level: lv, sub: `Chinese Maths Journey · stone ${ui.step + 1} · ${LV_NAME[lv]}` });
    return;
  }
  // the suanpan
  const A = ab(ctx);
  if (name === 'bead') {
    const [i, deck, j] = arg.split('|'), r = +i, k = +j;
    if (!(r >= 0 && r < ROD_COUNT)) return;
    A.sel = r;
    if (deck === 'u' && k >= 0 && k < 2) A.h[r] = A.h[r] > k ? k : k + 1;
    if (deck === 'l' && k >= 0 && k < 5) A.e[r] = A.e[r] > k ? k : k + 1;
    ctx.sfx.click(); abCheck(ctx); return;
  }
  if (name === 'rod') { const r = +arg; if (r >= 0 && r < ROD_COUNT) A.sel = r; return; }
  if (name === 'step') { setRod(A, A.sel, abRod(A, A.sel) + (+arg || 0)); abCheck(ctx); return; }
  if (name === 'tidy') { const v = abDecode(A); Object.assign(A, abEncode(Math.min(v, 99999))); abCheck(ctx); return; }
  if (name === 'clear') { Object.assign(A, abEncode(0)); A.hit = false; return; }
  if (name === 'task') { A.task = (A.task + 1) % TASKS.length; A.hit = false; abCheck(ctx); }
}

export function key(e, ctx) {
  const ui = ctx.ui;
  if (ui.step == null || !isOpen(ctx, ui.step)) return false;
  const st = JOURNEY[ui.step], c = ui.card || 0;
  const turnCard = (dlt) => { ui.card = Math.max(0, Math.min(pages(st) - 1, c + dlt)); return true; };
  if (e.key === 'Escape') { ui.step = null; return true; }
  if (e.key === 'PageDown' || e.key === ']') return turnCard(1);
  if (e.key === 'PageUp' || e.key === '[') return turnCard(-1);
  if (onPlay(ctx)) {
    const A = ab(ctx);
    if (e.key === 'ArrowLeft') { A.sel = Math.max(0, A.sel - 1); return true; }
    if (e.key === 'ArrowRight') { A.sel = Math.min(ROD_COUNT - 1, A.sel + 1); return true; }
    if (e.key === 'ArrowUp') { setRod(A, A.sel, abRod(A, A.sel) + 1); abCheck(ctx); return true; }
    if (e.key === 'ArrowDown') { setRod(A, A.sel, abRod(A, A.sel) - 1); abCheck(ctx); return true; }
    if (/^\d$/.test(e.key)) { setRod(A, A.sel, +e.key); abCheck(ctx); return true; }
    return false;
  }
  if (e.key === 'ArrowRight') return turnCard(1);
  if (e.key === 'ArrowLeft') return turnCard(-1);
  return false;
}

export function done(run, ctx) {
  const sid = run.step ?? (run.extra && run.extra.step);
  const i = JOURNEY.findIndex((s) => s.id === sid);
  if (i < 0 || !isOpen(ctx, i)) return null;
  const st = JOURNEY[i], d = rec(ctx);
  const right = (run.results || []).filter((r) => r.right).length;
  d.best[sid] = Math.max(d.best[sid] || 0, right);
  const stars = right >= DRILL ? 3 : right >= 9 ? 2 : right >= PASS ? 1 : 0;
  const lines = [], buttons = [];
  if (right >= PASS) {
    const first = !d.passed[sid];
    d.passed[sid] = true;
    if (JOURNEY.every((s) => d.passed[s.id]) && !d.badge) {
      d.badge = true;
      lines.push('<b>The whole road is walked. You have earned the Counting-Rod Traveller badge.</b>');
      ctx.sfx.level(); ctx.confetti(80);
    } else if (first) {
      lines.push(i + 1 < JOURNEY.length ? `<b>${right} of ${DRILL} — stone ${i + 2} is open: ${esc(JOURNEY[i + 1].title)}.</b>` : `<b>${right} of ${DRILL}.</b>`);
      ctx.sfx.level(); ctx.confetti(40);
    } else lines.push(`${right} of ${DRILL} — walked again.`);
    ctx.ui.step = i + 1 < JOURNEY.length ? i + 1 : null; ctx.ui.card = 0;
    buttons.push(`<button class="btn primary" data-act="openTool" data-arg="chinese">${i + 1 < JOURNEY.length ? `Walk on to stone ${i + 2}` : 'See the road'}</button>`);
  } else {
    lines.push(`${PASS} of ${DRILL} walks you on — you got ${right}. Every one you missed showed its working; look at the worked example again, then try another ten.`);
    ctx.ui.step = i; ctx.ui.card = st.cards.length;
    buttons.push('<button class="btn primary" data-act="openTool" data-arg="chinese">Back to the stone</button>');
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
.${P}-bar{height:10px;border-radius:10px;background:color-mix(in srgb,var(--ink) 15%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ink) 22%,transparent);overflow:hidden}
.${P}-bar i{display:block;height:100%;background:var(--fix);border-radius:10px}
.${P}-count{font-size:var(--fs-label);color:var(--muted)!important;margin:6px 0 0!important}
.${P}-map{position:relative;margin:8px 0 18px;border-radius:var(--r-lg);background:radial-gradient(circle at 70% 15%,var(--fix-tint),transparent 55%),radial-gradient(circle at 20% 80%,var(--mastered-tint),transparent 55%),var(--surface2)}
.${P}-trail{position:absolute;inset:0;width:100%;height:100%}
.${P}-t0{fill:none;stroke:var(--line);stroke-width:10;stroke-linecap:round;vector-effect:non-scaling-stroke;stroke-dasharray:2 14}
.${P}-t1{fill:none;stroke:var(--fix);stroke-width:5;stroke-linecap:round;vector-effect:non-scaling-stroke}
.${P}-stone{position:absolute;transform:translate(-50%,-50%);width:50px;height:42px;border-radius:46% 52% 44% 50%/50% 56% 48% 46%;border:0;cursor:pointer;display:grid;place-items:center;font:800 16px var(--mono);box-shadow:0 4px 0 var(--line),var(--sh);background:var(--surface);color:var(--muted);padding:0;transition:transform .15s}
.${P}-stone:hover,.${P}-stone:focus-visible{transform:translate(-50%,-50%) scale(1.08)}
.${P}-stone.done{background:var(--mastered);color:var(--surface);box-shadow:0 4px 0 var(--mastered-tint),var(--sh)}
.${P}-stone.here{background:var(--fix);color:var(--surface);box-shadow:0 0 0 5px var(--fix-tint),0 4px 0 var(--line)}
.${P}-stone.locked{opacity:.75}
.${P}-you{position:absolute;top:-24px;left:50%;transform:translateX(-50%);font:700 11px var(--ui);background:var(--treasure);color:var(--ink);padding:2px 8px;border-radius:var(--r-pill);animation:${P}-bob 1.6s ease-in-out infinite}
@keyframes ${P}-bob{50%{transform:translate(-50%,-4px)}}
@media (prefers-reduced-motion:reduce){.${P}-you{animation:none}}
.${P}-lab{position:absolute;top:50%;transform:translateY(-50%);width:min(40vw,250px);font:600 13px/1.25 var(--ui);color:var(--ink);text-align:left;pointer-events:none}
.${P}-lab b{display:block;font-weight:700}.${P}-lab i{display:block;color:var(--muted);font-size:12px;font-style:normal}
.${P}-stone.lab-r .${P}-lab{left:60px}.${P}-stone.lab-l .${P}-lab{right:60px;text-align:right}
.${P}-next{text-align:center}.${P}-next h3{margin:2px 0}
.${P}-lv{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;margin-top:14px}.${P}-lv .seg{margin:0}
.${P}-won{display:flex;gap:16px;align-items:center}.${P}-won h3{margin:0 0 4px}
.${P}-badge{width:96px;height:96px;flex:none}.${P}-b1{fill:var(--fix)}.${P}-b2{fill:var(--surface)}.${P}-b3{fill:var(--treasure-deep)}
.${P}-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
.${P}-step{padding:0;overflow:hidden}
.${P}-sh{background-size:cover;background-position:center;padding:60px 20px 14px;position:relative}
.${P}-sh::before{content:"";position:absolute;inset:0;background:linear-gradient(to top,var(--surface) 30%,color-mix(in srgb,var(--surface) 10%,transparent))}
.${P}-sh>*{position:relative;margin:0}.${P}-sh h2{font-family:var(--display);font-size:var(--fs-h2)}
.${P}-page{padding:16px 20px 4px;min-height:150px}
.${P}-para{font-size:var(--fs-lead);line-height:1.55}
.${P}-alg{padding:10px 14px;border-radius:var(--r-md);background:var(--surface2);border:1px dashed var(--line);font-size:14px;overflow-x:auto}
.${P}-ex{margin-top:12px;padding:14px;border-radius:var(--r-md);background:var(--surface2)}
.${P}-exq{font:700 var(--fs-body) var(--ui)}
.${P}-svg{max-width:100%;height:auto;display:block;margin:6px auto}
.${P}-steps{margin:10px 0 0;padding-left:22px}.${P}-steps li{display:flex;justify-content:space-between;gap:12px;padding:5px 0;border-bottom:1px solid var(--line-soft)}
.${P}-steps b{color:var(--fix)}
.${P}-cap{font-size:var(--fs-label);color:var(--muted);margin:4px 0 8px;text-align:center}
.${P}-live .${P}-tap{cursor:pointer}.${P}-live .${P}-tap:hover .${P}-bead{stroke-width:3!important}
.${P}-play{margin:10px 0;padding:14px;border-radius:var(--r-md);background:var(--surface2);text-align:center}
.${P}-in{display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;margin-bottom:8px}
.${P}-in input{font:700 22px var(--mono);width:8ch;padding:6px 10px;border-radius:var(--r-md);border:2px solid var(--line);background:var(--surface);color:var(--ink);text-align:center}
.${P}-in input:focus{border-color:var(--action);outline:none}
.${P}-task{margin:0 0 6px}
.${P}-abwrap{touch-action:manipulation}
.${P}-read{font-size:28px;font-weight:800;margin:4px 0}
.${P}-rods{display:flex;gap:4px;justify-content:center;flex-wrap:wrap;margin:6px 0}
.${P}-abbtn{justify-content:center;flex-wrap:wrap;margin:6px 0}
.${P}-rate{display:grid;grid-template-columns:auto auto auto;gap:6px 12px;justify-content:center;align-items:center;font-size:18px;margin:8px auto}
.${P}-rate span{padding:4px 10px;border-radius:8px;background:var(--surface)}.${P}-rate span:nth-child(3n+2){background:none;color:var(--muted)}
.${P}-try{text-align:center;padding:10px 0}.${P}-try .seg{margin:12px auto}
.${P}-nav{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 20px}
.${P}-dots{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
.${P}-dots button{width:14px;height:14px;border-radius:50%;border:2px solid var(--line);background:var(--surface);padding:0;cursor:pointer}
.${P}-dots button.on{background:var(--fix);border-color:var(--fix)}
.${P}-dots button:last-child{border-radius:3px}
.${P}-keys{font-size:var(--fs-meta);text-align:center;margin:0 0 12px}
.${P}-src{font-size:var(--fs-label);color:var(--muted);margin-bottom:16px}.${P}-src summary{cursor:pointer;font-weight:650}
@media (max-width:560px){.${P}-lab{width:34vw;font-size:12px}.${P}-lab i{display:none}.${P}-hero{min-height:170px}}
`;

/* ------------------------------------------------------------ selftest */

export function selftest(ok, makeCtx) {
  const ev = (e) => Function(`return (${e})`)();
  let r0 = 7; const rand = () => { r0 = (r0 * 16807) % 2147483647; return r0 / 2147483647; };
  // every step, every level: ans, expr and the last step agree; nothing leaks
  for (const st of JOURNEY) {
    ok(st.cards.length >= 2 && st.cards.length <= 5, `chinese/${st.id}: 2–5 cards`);
    ok(st.sources && st.sources.length && st.needsReview === true, `chinese/${st.id}: history is sourced and flagged for review`);
    ok(st.ex && ev(st.ex.expr) === st.ex.ans && st.work(st.ex).at(-1).v === st.ex.ans, `chinese/${st.id}: worked example is true`);
    for (const lv of [1, 2, 3]) for (let k = 0; k < 150; k++) {
      const q = st.gen(rand, lv), w = st.work(q);
      ok(ev(q.expr) === q.ans, `chinese/${st.id}: ${q.text} expr says ${ev(q.expr)}, ans ${q.ans}`);
      ok(w.at(-1).v === q.ans, `chinese/${st.id}: ${q.text} steps end on ${w.at(-1).v}, ans ${q.ans}`);
      ok(!leaks(q), `chinese/${st.id}: ${q.text} leaks`);
      if (!q.choices) ok(Number.isInteger(q.ans) && q.ans > 0, `chinese/${st.id}: ${q.text} whole answer above zero`);
      ok(w.every((s) => s.v !== undefined && !Number.isNaN(s.v)), `chinese/${st.id}: every step has a value`);
      if (q.html) ok(!/undefined|NaN/.test(q.html), `chinese/${st.id}: drawing is clean`);
    }
  }
  ok(JOURNEY.length >= 10 && JOURNEY.length <= 12, 'chinese: 10–12 stones');
  ok(new Set(JOURNEY.map((s) => s.id)).size === JOURNEY.length, 'chinese: stone ids unique');
  // no ranking of traditions, no "first" claims, anywhere on the road
  const all = JOURNEY.flatMap((s) => s.cards).join(' ');
  ok(!/\b(first to|discovered|invented|before anyone|earliest|oldest|better than)\b/i.test(all), 'chinese: nothing claims who was first or ranks traditions');

  // rod numerals: encode/decode round trip for every number 0–99999, forms take turns
  let rodBad = 0, formBad = 0;
  for (let n = 0; n <= 99999; n++) {
    const cells = rodEncode(n);
    if (rodDecode(cells) !== n) rodBad++;
    for (const c of cells) if (c.form !== (c.p % 2 === 0 ? 'upright' : 'flat') || (!c.empty && !(c.ones >= 1 && c.ones <= 5 && (c.five === 0 || c.ones <= 4)))) formBad++;
  }
  ok(rodBad === 0, `chinese: rod numerals round-trip 0–99999 (${rodBad} failures)`);
  ok(formBad === 0, `chinese: every rod digit is 1–5 rods, or a five-rod and 1–4 (${formBad} failures)`);
  for (let n = 0; n <= 99999; n += 97) ok(ev(rodExpr(n)) === n && rodDecode(rodEncode(n)) === n, `chinese: rod ${n}`);
  ok(Number.isNaN(rodDecode([{ p: 0, form: 'flat', five: 0, ones: 3 }])), 'chinese: a units digit lying flat is refused');
  ok(!/undefined|NaN/.test(rodSvg(40506, true)) && (rodSvg(40506).match(/stroke-dasharray:4 4/g) || []).length === 2, 'chinese: 40506 draws two empty places');

  // the suanpan: round trip 0–99999; each digit uses at most one upper and four lower beads
  let abBad = 0;
  for (let n = 0; n <= 99999; n++) { const A = abEncode(n); if (abDecode(A) !== n || A.h.some((h) => h > 1) || A.e.some((e) => e > 4)) abBad++; }
  ok(abBad === 0, `chinese: suanpan round-trips 0–99999 (${abBad} failures)`);
  for (let n = 0; n <= 99999; n += 131) ok(ev(abExpr(n)) === n, `chinese: suanpan expression ${n}`);

  // the Lo Shu is magic, in all eight turnings, and stays magic when scaled
  ok(isMagic(LOSHU) && LINES.every((L) => L.reduce((s, [r, c]) => s + LOSHU[r][c], 0) === 15), 'chinese: the Lo Shu is magic with total 15');
  ok(LOSHU.flat().slice().sort((a, b) => a - b).join() === '1,2,3,4,5,6,7,8,9' && LOSHU[1][1] === 5, 'chinese: the Lo Shu uses 1–9 once, 5 in the middle');
  ok(new Set(LOSHU_ALL.map((m) => m.flat().join())).size === 8, 'chinese: eight different turnings');
  for (const m of LOSHU_ALL) { ok(isMagic(m), 'chinese: every turning is magic'); for (let k = 1; k <= 5; k++) for (let c = 0; c <= 10; c++) ok(isMagic(m.map((row) => row.map((v) => k * v + c))), `chinese: ${k}×Lo Shu + ${c} is magic`); }
  ok(!isMagic([[1, 2, 3], [4, 5, 6], [7, 8, 9]]), 'chinese: isMagic rejects a square that is not');

  // gougu: every triple is right-angled, and the xian picture adds up
  for (const [a, b, c] of TRIPLES) for (let k = 1; k <= 4; k++) {
    ok((a * k) ** 2 + (b * k) ** 2 === (c * k) ** 2, `chinese: ${a * k}, ${b * k}, ${c * k} is a gougu triple`);
    ok(4 * ((a * k * b * k) / 2) + (b * k - a * k) ** 2 === (c * k) ** 2, `chinese: the xian diagram adds up for ${a * k}, ${b * k}`);
  }
  ok(TRIPLES.every(([a, b]) => a < b), 'chinese: gou is the shorter side');

  // Sunzi: the book's 70-21-15 rule agrees with counting, for every set of leftovers
  ok(sunzi([3, 5, 7], [2, 3, 2]) === 23, 'chinese: the Sunzi problem gives 23');
  for (let a = 0; a < 3; a++) for (let b = 0; b < 5; b++) for (let c = 0; c < 7; c++) {
    if (!a && !b && !c) continue;
    const n = sunzi([3, 5, 7], [a, b, c]), rule = (70 * a + 21 * b + 15 * c) % 105 || 105;
    ok(n === rule && n % 3 === a && n % 5 === b && n % 7 === c, `chinese: Sunzi ${a},${b},${c} → ${n}`);
    let smaller = false; for (let m = 1; m < n; m++) if (m % 3 === a && m % 5 === b && m % 7 === c) smaller = true;
    ok(!smaller, `chinese: ${n} is the smallest for ${a},${b},${c}`);
  }
  ok(70 % 3 === 1 && 70 % 35 === 0 && 21 % 5 === 1 && 21 % 21 === 0 && 21 % 3 === 0 && 21 % 7 === 0 && 15 % 7 === 1 && 15 % 15 === 0, 'chinese: 70, 21, 15 each leave 1 for their own counter and 0 for the others');
  const sz = JOURNEY.find((s) => s.id === 'sunzi');
  for (const lv of [1, 2, 3]) for (let k = 0; k < 100; k++) {
    const q = sz.gen(rand, lv);
    ok(q.ms.every((m, i) => q.ans % m === q.rs[i]), `chinese: ${q.text} → ${q.ans} satisfies every leftover`);
    let smaller = false; for (let m = 1; m < q.ans; m++) if (q.ms.every((mm, i) => m % mm === q.rs[i])) smaller = true;
    ok(!smaller, `chinese: ${q.ans} is the smallest for ${q.text}`);
  }

  // Yang Hui: every row is the binomial coefficients, built only by adding
  let row = [1];
  for (let n = 0; n <= 25; n++) {
    let f = [1n]; for (let i = 1; i <= n; i++) f.push(f[i - 1] * BigInt(i));
    row.forEach((v, k) => ok(BigInt(v) === f[n] / (f[k] * f[n - k]) && v === choose(n, k), `chinese: Yang Hui row ${n}, number ${k}`));
    ok(row.reduce((a, b) => a + b, 0) === 2 ** n, `chinese: row ${n} adds to 2^${n}`);
    ok(row.every((v, k) => v === row[n - k]), `chinese: row ${n} reads the same both ways`);
    row = [1, ...row.slice(1).map((v, k) => v + row[k]), 1];
  }
  for (let n = 2; n <= 14; n++) for (let k = 0; k <= n; k++) ok(ev(prodExpr(n, k)) === choose(n, k), `chinese: product formula row ${n}, number ${k}`);

  // excess and deficit: the answers solve their problems
  const ex = JOURNEY.find((s) => s.id === 'excess');
  for (const lv of [1, 2, 3]) for (let k = 0; k < 150; k++) {
    const q = ex.gen(rand, lv);
    if (q.kind === 'buy') ok(q.a * q.n - q.p === q.e && q.p - q.b * q.n === q.d && q.e > 0 && q.d > 0, `chinese: ${q.n} people and price ${q.p} solve ${q.text}`);
    else ok(q.k * (q.g1 - q.ans) === q.e1 && q.k * (q.ans - q.g2) === q.d2 && q.e1 > 0 && q.d2 > 0, `chinese: two guesses land on ${q.ans}`);
  }
  ok(8 * 7 - 53 === 3 && 53 - 7 * 7 === 4, 'chinese: the worked example (7 people, 53 coins) solves its problem');

  // fangcheng, sharing and rates: the answers satisfy their conditions
  const fc = JOURNEY.find((s) => s.id === 'fangcheng'), sh = JOURNEY.find((s) => s.id === 'sharing'), rt = JOURNEY.find((s) => s.id === 'rate');
  for (const lv of [1, 2, 3]) for (let k = 0; k < 100; k++) {
    const q = fc.gen(rand, lv), w = fc.work(q), y = w[2].v, x = q.ask === 'x' ? w[3].v : q.x;
    ok(q.a1 * x + q.b1 * y === q.c1 && q.a2 * x + q.b2 * y === q.c2 && w[0].v > 0, `chinese: array answer satisfies both columns (${q.text})`);
    const s = sh.gen(rand, lv), shares = s.w.map((p) => p * s.u);
    ok(shares.reduce((a, b) => a + b, 0) === s.T && shares.every((v, i) => v * s.w[0] === shares[0] * s.w[i]), `chinese: shares add up and keep the ratio (${s.text})`);
    const t = rt.gen(rand, lv);
    ok(t.ans * t.a === t.c * t.b, `chinese: the rate is kept (${t.text})`);
  }
  // counting-board multiplication: the partial products add up
  for (let a = 11; a <= 999; a += 23) for (let b = 2; b <= 99; b += 11) { const w = JOURNEY.find((s) => s.id === 'board').work({ a, b }); ok(w.slice(0, -1).reduce((s, x) => s + x.v, 0) === a * b, `chinese: board ${a} × ${b}`); }

  // the suanpan you can touch, and by keys
  const cx = makeCtx('chinese', '8-10');
  cx.data.passed = { rods: true, empty: true };
  act('open', '2', cx); act('card', '1', cx);
  ok(onPlay(cx) && view(cx).includes(`${P}-live`), 'chinese: the suanpan card is live');
  act('bead', '4|l|2', cx); ok(abDecode(ab(cx)) === 3, 'chinese: tapping the third lower bead sets 3');
  act('bead', '4|l|2', cx); ok(abDecode(ab(cx)) === 2, 'chinese: tapping the third bead again pushes it away, leaving 2');
  act('bead', '4|l|0', cx); ok(abDecode(ab(cx)) === 0, 'chinese: tapping the bead at the beam pushes every lower bead away');
  act('bead', '4|l|1', cx); ok(abDecode(ab(cx)) === 2, 'chinese: tapping the second bead brings two up');
  act('bead', '4|u|0', cx); ok(abDecode(ab(cx)) === 7, 'chinese: an upper bead adds 5');
  act('bead', '3|l|1', cx); ok(abDecode(ab(cx)) === 27, 'chinese: two lower beads on the tens rod make 27');
  act('bead', '4|u|1', cx); act('bead', '4|l|4', cx); ok(abRod(ab(cx), 4) === 15 && abDecode(ab(cx)) === 35, 'chinese: a rod can hold 15 while you work');
  act('tidy', '', cx); ok(abDecode(ab(cx)) === 35 && ab(cx).h[4] <= 1 && ab(cx).e[4] <= 4, 'chinese: tidy carries and keeps the value');
  act('clear', '', cx); ok(abDecode(ab(cx)) === 0, 'chinese: clear empties the suanpan');
  ok(key({ key: 'ArrowUp' }, cx) && abDecode(ab(cx)) === 1, 'chinese: ↑ adds one on the chosen rod');
  ok(key({ key: 'ArrowLeft' }, cx) && ab(cx).sel === 3, 'chinese: ← chooses the next rod left');
  ok(key({ key: '7' }, cx) && abDecode(ab(cx)) === 71, 'chinese: a digit key sets the rod');
  ok(key({ key: 'ArrowDown' }, cx) && abDecode(ab(cx)) === 61, 'chinese: ↓ takes one off');
  for (let t = 0; t < TASKS.length; t++) { act('clear', '', cx); ab(cx).task = t; for (const [i, dd] of String(TASKS[t].t).padStart(5, '0').split('').entries()) { ab(cx).sel = i; key({ key: dd }, cx); } ok(abDecode(ab(cx)) === TASKS[t].t && ab(cx).hit, `chinese: task "${TASKS[t].say}" can be done by keys`); }
  ok(key({ key: ']' }, cx) && cx.ui.card === 2, 'chinese: ] turns the card on the suanpan card');
  ok(key({ key: 'ArrowRight' }, cx) && cx.ui.card === 3, 'chinese: → turns the card elsewhere');
  cx.ui.rod = '40506'; act('open', '0', cx); act('card', '1', cx); ok(view(cx).includes(`${P}-rodin`) && view(cx).includes('ten-thousands'), 'chinese: the rod card draws a typed number');
  cx.ui.rod = 'abc'; ok(!/undefined|NaN/.test(view(cx)) && view(cx).includes('Whole numbers only'), 'chinese: the rod card refuses a non-number');

  // the journey: every stone locked until the one before is passed through done()
  for (const band of ['6-7', '8-10', '11-14']) {
    const ctx = makeCtx('chinese', band);
    ok(isOpen(ctx, 0) && !isOpen(ctx, 1), `chinese (${band}): only the first stone opens at the start`);
    act('open', '3', ctx); ok(ctx.ui.step == null, `chinese (${band}): a locked stone does not open`);
    ok(done({ items: [], results: Array(10).fill({ right: true }), step: JOURNEY[3].id }, ctx) === null && !isPassed(ctx, 3), `chinese (${band}): a locked stone cannot be passed by a stray run`);
    for (let i = 0; i < JOURNEY.length; i++) {
      const st = JOURNEY[i];
      ok(i + 1 >= JOURNEY.length || !isOpen(ctx, i + 1), `chinese (${band}): stone ${i + 2} locked before ${i + 1} is passed`);
      act('open', String(i), ctx); ok(ctx.ui.step === i, `chinese (${band}): stone ${i + 1} opens`);
      for (let c = 0; c < pages(st); c++) { act('card', String(c), ctx); const h = view(ctx); ok(h.length > 200 && !/undefined|NaN|\[object Object\]/.test(h), `chinese (${band}): ${st.id} page ${c} renders`); }
      const n0 = ctx.runs.length; act('start', '', ctx);
      ok(ctx.runs.length === n0 + 1, `chinese (${band}): ${st.id} starts a drill`);
      const run = ctx.runs.at(-1);
      ok(run.items.length === DRILL && run.extra.step === st.id && run.extra.level === LV[band], `chinese (${band}): ${st.id} drill is ten at the band's level`);
      const r7 = done({ items: run.items, results: run.items.map((_, k) => ({ right: k < PASS - 1 })), step: st.id }, ctx);
      ok(!isPassed(ctx, i) && (i + 1 >= JOURNEY.length || !isOpen(ctx, i + 1)) && r7.stars === 0, `chinese (${band}): 7 of 10 does not pass ${st.id}`);
      ok(ctx.ui.step === i && ctx.ui.card === st.cards.length, `chinese (${band}): a miss returns to the try page`);
      const r8 = done({ items: run.items, results: run.items.map((_, k) => ({ right: k < PASS })), extra: { step: st.id } }, ctx);
      ok(isPassed(ctx, i) && r8.stars === 1 && r8.buttons.length, `chinese (${band}): 8 of 10 passes ${st.id}`);
      if (i + 1 < JOURNEY.length) ok(isOpen(ctx, i + 1) && ctx.ui.step === i + 1 && (i + 2 >= JOURNEY.length || !isOpen(ctx, i + 2)), `chinese (${band}): passing ${st.id} opens exactly the next stone`);
    }
    ok(rec(ctx).badge === true, `chinese (${band}): the badge is earned at the end`);
    ctx.ui.step = null; const h = view(ctx);
    ok(h.includes('Counting-Rod Traveller') && !/undefined|NaN/.test(h), `chinese (${band}): the finished road shows the badge`);
    ok(done({ items: [], results: Array(10).fill({ right: true }), step: 'nope' }, ctx) === null, `chinese (${band}): done ignores unknown steps`);
  }
}
