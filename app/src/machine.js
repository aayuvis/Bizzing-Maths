/* machine.js — Beat the Machine's engine (games spec §2.3). Pure: no DOM, no storage, so
   test/machine.mjs can run thousands of matches in node.

   A MATCH is five HEATS against one opponent; a heat is four SUMS. For each sum the child picks
   the trick card that fits (or "Straight: no trick fits"), then answers on the slate while the
   opponent's paper tape works the same sum the long way, column by column. A sum is BEATEN when
   the card fits, the answer is right, and it lands before the tape's last line. A heat is WON
   when three of its four sums are beaten — so a lucky card pick wins nothing on its own (M1).

   Rule 1 holds the whole way down:
   · every trick sum is made by the stop's OWN gen, and its text, expr and ans are the stop's;
   · a card is right for a sum exactly when its PRECONDITION holds — a predicate on the numbers,
     written here once, which also writes the "why not" a child reads after a wrong pick;
   · a decoy is generated to tempt one card and is kept only when that card's precondition is
     FALSE and no card's holds, so "Straight" is honestly right (M2);
   · the slate shows the picked stop's own figure and work(q) — the stop's q() rebuilt from the
     sum's numbers by the card's `norm` — with the answer hidden (rule 3);
   · the machine's tape is plain long addition / subtraction / multiplication done digit by
     digit, a fourth route to the answer that test/machine.mjs holds to q.expr. */
import { byId } from './tricks.js';
import { fig } from './figs.js';
import { int, pick, shuffle } from './rand.js';
import { CARD_IDS, STRAIGHT, earnedIds, MIN_EARNED } from './machine-card.js';

export { CARD_IDS, STRAIGHT, earnedIds, MIN_EARNED };
export const GAME = 'machine';           // the key in k.gameLv (game-level.js): the level lives there, not in k.machine.lv
export const PER_HEAT = 4, HEATS = 5, SUMS = PER_HEAT * HEATS, HEAT_WIN = 3;
export const ANSWER_CAP = 10;            // answer coins a session (spec §5)
export const CONTEST_LV = 3, CONTEST_PCT = 0.8;
export const MAX_CARDS = 7;              // seven trick cards + Straight = keys 1–8 (M6)

/* The honest label (rule 5), for the stops that carry a sutra — and only those. */
export const VEDIC_LABEL = "From Bharati Krishna Tirtha's book (1965). Scholars have not found these in the Vedas themselves; the maths is real, and here is why it works.";
export const isVedic = (id) => !!(byId[id] && byId[id].sutra);

/* ------------------------------------------------------------------ levels */
/* The machine's speed IS the level (spec table). stepMs is one line of tape. */
export const LEVELS = [
  { lv: 1, speed: 'slow', stepMs: 4000, cards: 3, decoy: 0.20, nums: 'two-digit numbers' },
  { lv: 2, speed: 'slow', stepMs: 4000, cards: 4, decoy: 0.25, nums: 'two-digit numbers' },
  { lv: 3, speed: 'medium', stepMs: 2800, cards: 6, decoy: 0.30, nums: 'two-digit numbers and near 100' },
  { lv: 4, speed: 'fast', stepMs: 1900, cards: 7, decoy: 0.33, nums: 'three-digit numbers near a base' },
  { lv: 5, speed: 'fast', stepMs: 1900, cards: MAX_CARDS, decoy: 0.33, nums: 'everything, mixed' },
];
export const levelWords = (lv) => { const L = LEVELS[lv - 1]; return `Level ${lv} · ${L.speed} machine · ${L.cards === MAX_CARDS && lv === 5 ? 'all your' : L.cards} tricks · ${Math.round(L.decoy * 100)}% with no shortcut`; };
// which cards come first at each level: two-digit shapes low down, near-base shapes higher up
const PREF = {
  1: ['round-add', 'times-eleven', 'square-five', 'round-sub', 'crosswise', 'halve-double', 'diff-squares', 'nikhilam-100', 'square-near-100', 'above-100'],
  3: ['nikhilam-100', 'square-five', 'times-eleven', 'diff-squares', 'crosswise', 'round-add', 'square-near-100', 'halve-double', 'round-sub', 'above-100'],
  4: ['above-100', 'square-near-100', 'nikhilam-100', 'times-eleven', 'square-five', 'diff-squares', 'halve-double', 'crosswise', 'round-add', 'round-sub'],
};
PREF[2] = PREF[1];
// the stop's own gen level for a machine level (crosswise always 1: its card is for small digits)
const genLv = (id, lv, r) => (id === 'crosswise' ? 1 : lv <= 2 ? 1 : lv === 3 ? 2 : lv === 4 ? 3 : int(1, 3, r));

/* The tricks in play: the level's count, from the cards the child has EARNED (M4), never more. */
export function inPlay(ids, lv, r = Math.random) {
  const own = CARD_IDS.filter((id) => ids.includes(id)), n = LEVELS[lv - 1].cards;
  if (lv === 5) return shuffle(own.slice(), r).slice(0, n).sort((a, b) => CARD_IDS.indexOf(a) - CARD_IDS.indexOf(b));
  return PREF[lv].filter((id) => own.includes(id)).slice(0, n);
}

/* ---------------------------------------------------------------- opponents */
/* A season of three, all invented for this game and labelled so; none is a paid rival. */
const nearSquare = (q) => isSq(q) && q.a !== 100 && Math.abs(q.a - 100) <= 14;
export const FOES = [
  { id: 'machine', name: 'The Long-Way Machine', line: 'Never wrong and never fast: every sum, column by column.', factor: () => 1 },
  { id: 'twins', name: 'The Abacus Twins', line: 'Quick at adding and taking away, slow at times.', factor: (q) => (q.op === '+' || q.op === '−' ? 0.55 : 1.35) },
  { id: 'prof', name: 'Professor Logarithm', line: 'Quick at times, slow at squares near a hundred.', factor: (q) => (nearSquare(q) ? 1.6 : q.op === '×' || q.op === '²' ? 0.7 : 1) },
];
export const INVENTED = 'All three are invented for this game.';
export const lineMs = (q, lv, foe) => Math.round(LEVELS[lv - 1].stepMs * FOES[foe].factor(q));
export const START_MS = 1200;            // the crank turns once before the first line prints

/* ---------------------------------------------------------------- the cards */
const isSq = (q) => q.op === '²' || (q.op === '×' && q.a === q.b);
const mul = (q) => q.op === '×' || q.op === '²';
const opWord = (q) => ({ '+': 'an adding sum', '−': 'a taking-away sum', '×': 'a times sum', '²': 'a square' }[q.op]);
const below = (n) => n >= 80 && n <= 99, above = (n) => n >= 101 && n <= 125;
const nearTen = (n) => n >= 7 && [7, 8, 9].includes(n % 10);
const smallDigits = (n) => String(n).split('').every((d) => d >= '1' && d <= '4');
const two = (n) => n >= 11 && n <= 99;
const other11 = (q) => (q.a === 11 ? q.b : q.a);
const hdPair = (q) => { for (const [x, y] of [[q.a, q.b], [q.b, q.a]]) if (x % 2 === 0 && y % 10 === 5 && x !== y) return [x, y]; return null; };
const bigDigit = (n) => String(n).split('').find((d) => !(d >= '1' && d <= '4'));

/* Each card: a name, a short rule (shown on the card at levels 1–2), its PRECONDITION as clauses
   [holds(q), why-not(q)] — the first clause that fails is the reason a child reads — what it says
   when it fits, and `norm`: the arguments for the stop's own q(), so the slate shows the stop's
   own working on the sum's own numbers. */
export const CARDS = {
  'nikhilam-100': { name: 'Nikhilam · near 100', rule: 'both just below 100',
    clauses: [[mul, (q) => `Nikhilam is for multiplying, and ${q.text} is ${opWord(q)}.`],
      [(q) => below(q.a), (q) => `Nikhilam needs both numbers near the same base, just below 100. ${q.a} is not.`],
      [(q) => below(q.b), (q) => `Nikhilam needs both numbers near the same base, just below 100. ${q.b} is not.`]],
    fits: (q) => `${q.a} and ${q.b} are both just below 100.`, norm: (q) => ({ a: q.a, b: q.b }) },
  'above-100': { name: 'Nikhilam · above 100', rule: 'both just above 100',
    clauses: [[mul, (q) => `This Nikhilam is for multiplying, and ${q.text} is ${opWord(q)}.`],
      [(q) => above(q.a), (q) => `It needs both numbers just above 100, from 101 to 125. ${q.a} is not.`],
      [(q) => above(q.b), (q) => `It needs both numbers just above 100, from 101 to 125. ${q.b} is not.`]],
    fits: (q) => `${q.a} and ${q.b} are both just above 100.`, norm: (q) => ({ a: q.a, b: q.b }) },
  'square-near-100': { name: 'Squares near 100', rule: 'a square, close to 100',
    clauses: [[isSq, (q) => `This card squares one number, and ${q.text} is not a number times itself.`],
      [(q) => q.a !== 100 && Math.abs(q.a - 100) <= 14, (q) => `${q.a} is ${Math.abs(q.a - 100)} away from 100: too far for the gap to square in your head.`]],
    fits: (q) => `${q.a} is only ${Math.abs(q.a - 100)} ${q.a < 100 ? 'below' : 'above'} 100.`, norm: (q) => ({ a: q.a }) },
  'square-five': { name: 'Square ending in 5', rule: 'a square that ends in 5',
    clauses: [[isSq, (q) => `This card squares one number, and ${q.text} is not a number times itself.`],
      [(q) => q.a % 10 === 5 && q.a >= 15, (q) => `${q.a} does not end in 5, so the 25 on the end does not appear.`]],
    fits: (q) => `${q.a} ends in 5.`, norm: (q) => ({ a: q.a }) },
  'times-eleven': { name: 'Times eleven', rule: 'one number is 11',
    clauses: [[(q) => q.op === '×', (q) => `Times eleven multiplies by 11, and ${q.text} is ${opWord(q)}.`],
      [(q) => q.a === 11 || q.b === 11, (q) => `Neither ${q.a} nor ${q.b} is 11.`],
      [(q) => other11(q) >= 12 && other11(q) <= 999, (q) => `The other number, ${other11(q)}, is too small for the trick to help.`]],
    fits: (q) => `one number is 11.`, norm: (q) => ({ a: other11(q), b: 11 }) },
  'halve-double': { name: 'Halve and double', rule: 'an even number times one ending in 5',
    clauses: [[(q) => q.op === '×' && q.a !== q.b, (q) => `Halve and double needs two different numbers multiplied, and ${q.text} is ${opWord(q)}.`],
      [(q) => q.a % 10 === 5 || q.b % 10 === 5, (q) => `Halve and double needs a number ending in 5 to double into a round ten. Neither ${q.a} nor ${q.b} ends in 5.`],
      [(q) => !!hdPair(q), (q) => `The number to halve, ${q.a % 10 === 5 ? q.b : q.a}, is odd, so it does not halve into a whole number.`]],
    fits: (q) => { const [x, y] = hdPair(q); return `${x} halves cleanly and ${y} doubles to a round ten.`; }, norm: (q) => { const [x, y] = hdPair(q); return { a: x, b: y }; } },
  'diff-squares': { name: 'Difference of squares', rule: 'the same distance either side of a round ten',
    clauses: [[(q) => q.op === '×' && q.a !== q.b, (q) => `Difference of squares needs two different numbers multiplied, and ${q.text} is ${opWord(q)}.`],
      [(q) => (q.a + q.b) % 2 === 0, (q) => `${q.a} and ${q.b} have no whole number exactly in the middle.`],
      [(q) => ((q.a + q.b) / 2) % 10 === 0, (q) => `The middle of ${q.a} and ${q.b} is ${(q.a + q.b) / 2}, not a round ten, so its square is not quick.`],
      [(q) => Math.abs(q.a - q.b) / 2 <= 9, (q) => `${q.a} and ${q.b} are ${Math.abs(q.a - q.b) / 2} either side of ${(q.a + q.b) / 2}: too far apart.`]],
    fits: (q) => `${Math.min(q.a, q.b)} and ${Math.max(q.a, q.b)} are the same distance either side of ${(q.a + q.b) / 2}.`,
    norm: (q) => ({ a: Math.min(q.a, q.b), b: Math.max(q.a, q.b) }) },
  'crosswise': { name: 'Crosswise', rule: 'two two-digit numbers, small digits',
    clauses: [[mul, (q) => `Crosswise multiplies, and ${q.text} is ${opWord(q)}.`],
      [(q) => two(q.a) && two(q.b), (q) => `Crosswise here is for two two-digit numbers; ${two(q.a) ? q.b : q.a} is not one.`],
      [(q) => smallDigits(q.a) && smallDigits(q.b), (q) => { const n = smallDigits(q.a) ? q.b : q.a; return `Crosswise in your head needs small digits, 1 to 4, so no column carries far. ${n} has a ${bigDigit(n)}.`; }]],
    fits: (q) => `${q.a} and ${q.b} are two-digit numbers with small digits.`, norm: (q) => ({ a: q.a, b: q.b }) },
  'round-add': { name: 'Round and adjust', rule: 'adding a number just below a round ten',
    clauses: [[(q) => q.op === '+', (q) => `Round and adjust is for adding, and ${q.text} is ${opWord(q)}.`],
      [(q) => nearTen(q.a) || nearTen(q.b), (q) => `Neither ${q.a} nor ${q.b} is just below a round ten (ending in 7, 8 or 9).`]],
    fits: (q) => { const n = nearTen(q.b) ? q.b : q.a; return `${n} is just below ${Math.ceil(n / 10) * 10}.`; },
    norm: (q) => (nearTen(q.b) ? { a: q.a, b: q.b } : { a: q.b, b: q.a }) },
  'round-sub': { name: 'Take too much, give back', rule: 'taking away a number just below a round ten',
    clauses: [[(q) => q.op === '−', (q) => `This card is for taking away, and ${q.text} is ${opWord(q)}.`],
      [(q) => nearTen(q.b), (q) => `${q.b}, the number taken away, is not just below a round ten (ending in 7, 8 or 9).`]],
    fits: (q) => `${q.b} is just below ${Math.ceil(q.b / 10) * 10}.`, norm: (q) => ({ a: q.a, b: q.b }) },
};
export const cardName = (id) => (id === STRAIGHT ? 'Straight: no trick fits' : CARDS[id].name);

export const holds = (id, q) => CARDS[id].clauses.every(([ok]) => ok(q));
/* every card whose precondition holds — over the whole pool, or over a rail */
export const fits = (q, ids = CARD_IDS) => ids.filter((id) => id !== STRAIGHT && holds(id, q));
export function whyNot(id, q) { const c = CARDS[id].clauses.find(([ok]) => !ok(q)); return c ? c[1](q) : null; }
export const whyFits = (id, q) => CARDS[id].fits(q);
/* the right cards on this rail: those that fit, or Straight when none of the rail's fits */
export function rightCards(q, rail) { const f = fits(q, rail); return f.length ? f : [STRAIGHT]; }

/* The words after a pick that was not right. */
export function explain(pickId, q, rail) {
  const right = rightCards(q, rail);
  if (pickId === STRAIGHT) return `${q.text} has a shortcut: ${whyFits(right[0], q)} That is ${cardName(right[0])}.`;
  const no = whyNot(pickId, q);
  return right[0] === STRAIGHT ? `${no} No trick on your rail fits this one: Straight was right.` : `${no} But ${whyFits(right[0], q)} That is ${cardName(right[0])}.`;
}

/* ---------------------------------------------------------------- the sums */
const fromStop = (q) => ({ a: q.a, b: q.b, op: /²/.test(q.text) ? '²' : q.text.includes('×') ? '×' : q.text.includes('+') ? '+' : '−', text: q.text, expr: q.expr, ans: q.ans });
export function plain(op, a, b) {
  if (op === '²') return { a, b: a, op, text: `${a}²`, expr: `${a}*${a}`, ans: a * a };
  const sym = { '+': '+', '−': '-', '×': '*' }[op];
  return { a, b, op, text: `${a} ${op} ${b}`, expr: `${a}${sym}${b}`, ans: op === '+' ? a + b : op === '−' ? a - b : a * b };
}

/* A trick sum: the stop's own gen, kept only if its own card fits (it always does — the test proves it). */
export function trickSum(id, lv, r = Math.random) {
  for (let i = 0; i < 50; i++) {
    const q = fromStop(byId[id].gen(r, genLv(id, lv, r)));
    if (holds(id, q) && !leaks(q)) return { ...q, src: id, decoy: false };
  }
  throw new Error(`machine: ${id}'s own gen never fitted its card`);
}

/* A decoy TEMPTS one card: it looks like that card's shape, and is proved not to be. */
const sw = (r, a, b) => (r() < 0.5 ? [a, b] : [b, a]);
const notIn = (lo, hi, r, f = () => true) => { for (;;) { const n = int(lo, hi, r); if (f(n)) return n; } };
const TEMPT = {
  'nikhilam-100': (r) => plain('×', ...sw(r, int(91, 99, r), int(41, 69, r))),                       // 99 × 51
  'above-100': (r) => plain('×', ...sw(r, int(101, 109, r), int(31, 89, r))),                          // 104 × 57
  'square-near-100': (r) => plain('²', r() < 0.5 ? int(68, 84, r) : int(116, 132, r)),                 // 78²
  'square-five': (r) => plain('²', int(1, 9, r) * 10 + pick([4, 6], r)),                              // 46²
  'times-eleven': (r) => plain('×', ...sw(r, int(13, 89, r), pick([12, 21], r))),            // 63 × 12
  'halve-double': (r) => (r() < 0.5 ? plain('×', ...sw(r, int(3, 24, r) * 2 + 1, int(1, 9, r) * 10 + 5)) // 17 × 35
    : plain('×', ...sw(r, int(2, 24, r) * 2, int(1, 9, r) * 10 + pick([3, 7], r)))),                   // 16 × 37
  'diff-squares': (r) => { const m = int(2, 9, r) * 10, d = int(1, 7, r); return plain('×', ...sw(r, m - d, m + d + int(1, 2, r))); },   // 48 × 53
  'crosswise': (r) => plain('×', notIn(23, 89, r, (n) => !smallDigits(n)), notIn(13, 79, r, (n) => !smallDigits(n))),                    // 37 × 28
  'round-add': (r) => plain('+', int(1, 8, r) * 10 + int(1, 6, r), int(1, 6, r) * 10 + int(1, 6, r)),  // 46 + 35
  'round-sub': (r) => { const b = int(1, 6, r) * 10 + int(1, 6, r); return plain('−', b + int(11, 60, r), b); },   // 83 − 24
};
export function decoy(tempt, r = Math.random) {
  for (let i = 0; i < 400; i++) {
    const q = TEMPT[tempt](r);
    if (!holds(tempt, q) && fits(q).length === 0 && q.ans > 0) return { ...q, src: null, tempt, decoy: true };
  }
  throw new Error(`machine: no decoy for ${tempt}`);
}

/* A match: twenty sums, the level's share of decoys (rounded), the tricks in play taken in turn. */
export function newMatch(ids, lv, foe = 0, r = Math.random) {
  const play = inPlay(ids, lv, r);
  if (play.length < MIN_EARNED) throw new Error('machine: fewer than three earned tricks');
  const nDecoy = Math.round(SUMS * LEVELS[lv - 1].decoy);
  const kinds = shuffle([...Array(nDecoy).fill('d'), ...Array(SUMS - nDecoy).fill('t')], r);
  const deckT = [], deckD = [], seen = new Set(), sums = [];
  const next = (deck) => { if (!deck.length) deck.push(...shuffle(play.slice(), r)); return deck.shift(); };
  for (const k of kinds) {
    let q, tries = 0;
    do { q = k === 'd' ? decoy(next(deckD), r) : trickSum(next(deckT), lv, r); } while (seen.has(q.text) && ++tries < 30);
    seen.add(q.text); sums.push(q);
  }
  return { lv, foe, rail: [...play, STRAIGHT], sums, results: [] };
}

/* ---------------------------------------------------------------- the tape */
/* The machine's working: plain column arithmetic on the digits, one line per column step.
   The last line carries the answer, read off the digits the machine wrote. */
const COL = ['ones', 'tens', 'hundreds', 'thousands', 'ten-thousands', 'hundred-thousands'];
const rev = (n) => String(n).split('').reverse().map(Number);
const read = (ds) => Number(ds.slice().reverse().join('')) || 0;
function colAdd(rows) {
  const n = Math.max(...rows.map((x) => x.length)), out = []; let c = 0;
  for (let i = 0; i < n; i++) { const s = rows.reduce((t, x) => t + (x[i] || 0), 0) + c; out.push(s % 10); c = Math.floor(s / 10); }
  while (c) { out.push(c % 10); c = Math.floor(c / 10); }
  return out;
}
export function tape(q) {
  const L = [];
  if (q.op === '+') {
    const A = rev(q.a), B = rev(q.b), n = Math.max(A.length, B.length), out = []; let c = 0;
    for (let i = 0; i < n; i++) {
      const x = A[i] || 0, y = B[i] || 0, s = x + y + c;
      L.push({ t: `${COL[i]}: ${x} + ${y}${c ? ' + 1' : ''} = ${s}${s > 9 ? `, write ${s % 10}, carry 1` : ''}` });
      out.push(s % 10); c = s > 9 ? 1 : 0;
    }
    if (c) out.push(1);
    L.push({ t: 'read the digits', v: read(out) });
  } else if (q.op === '−') {
    const A = rev(q.a), B = rev(q.b), out = []; let br = 0;
    for (let i = 0; i < A.length; i++) {
      let x = A[i] - br; const y = B[i] || 0;
      if (x < y) { L.push({ t: `${COL[i]}: ${x} − ${y} will not go, borrow ten: ${x + 10} − ${y} = ${x + 10 - y}` }); x += 10; br = 1; }
      else { if (i < B.length || br) L.push({ t: `${COL[i]}: ${x} − ${y} = ${x - y}` }); br = 0; }
      out.push(x - y);
    }
    L.push({ t: 'read the digits', v: read(out) });
  } else {
    const A = rev(q.a), B = rev(q.op === '²' ? q.a : q.b), rows = [];
    B.forEach((d, j) => {
      if (d === 0) { L.push({ t: `${COL[j]} digit is 0: a row of zeros` }); rows.push([0]); return; }
      const row = Array(j).fill(0); let c = 0;
      A.forEach((x, i) => {
        const p = x * d + c;
        L.push({ t: `${x} × ${d}${c ? ` + ${c}` : ''} = ${p}${i < A.length - 1 && p > 9 ? `, write ${p % 10}, carry ${Math.floor(p / 10)}` : ''}` });
        row.push(i < A.length - 1 ? p % 10 : p % 10); c = Math.floor(p / 10);
      });
      while (c) { row.push(c % 10); c = Math.floor(c / 10); }
      rows.push(row);
      // the last row is never read out on its own: when every other row is zeros it IS the answer
      if (j < B.length - 1) L.push({ t: `row ${j + 1}: ${read(row)}` });
    });
    L.push({ t: rows.length > 1 ? 'add the rows' : 'read the row', v: read(colAdd(rows)) });
  }
  return L;
}

/* ---------------------------------------------------------------- judging */
/* One sum's outcome. `beat`: the card fits, the answer is right, before the tape's last line. */
export function judge(m, i, pickId, ok, beforeTape) {
  const q = m.sums[i], cardRight = rightCards(q, m.rail).includes(pickId);
  const res = { i, text: q.text, ans: q.ans, pick: pickId, right: rightCards(q, m.rail), cardRight, answerRight: !!(cardRight && ok), beat: !!(cardRight && ok && beforeTape) };
  m.results[i] = res;
  return res;
}
export const heatOf = (i) => Math.floor(i / PER_HEAT);
export function heatScore(m, h) {
  const rs = m.results.slice(h * PER_HEAT, h * PER_HEAT + PER_HEAT).filter(Boolean);
  const beat = rs.filter((x) => x.beat).length;
  return { beat, of: PER_HEAT, won: beat >= HEAT_WIN };
}
/* The whole match, settled: what it pays and what the level rule says. */
export function summary(m) {
  const heats = Array.from({ length: HEATS }, (_, h) => heatScore(m, h));
  const right = m.results.filter((x) => x && x.answerRight).length;
  const won = heats.filter((h) => h.won).length;
  const sweep = won === HEATS && m.lv >= CONTEST_LV && right / SUMS >= CONTEST_PCT;
  return { heats, won, right, total: SUMS, pct: right / SUMS, sweep };
}

/* rule 4: a trick recognised on a LATER day counts toward that trick's record; the same day does not */
export function noteSeen(k, id, day) {
  const mc = k.machine || (k.machine = { lv: 1, foe: 0, heats: 0, won: 0, seen: {} });
  const s = (mc.seen || (mc.seen = {}))[id];
  if (!s) { mc.seen[id] = { day, right: 0 }; return false; }
  if (s.day === day) return false;
  s.day = day; s.right++;
  return true;
}

/* ---------------------------------------------------------------- the slate */
/* What opens on the slate after a card is picked: the picked stop's own figure and steps, for
   THIS sum, with the answer nowhere (rule 3). Straight gets the column layout, empty. */
export function slateParts(q, id) {
  if (id === STRAIGHT) return { steps: ['Work it the straight way, column by column.'], fig: '' };
  const t = byId[id], tq = t.q(CARDS[id].norm(q)), w = t.work(tq);
  const spec = t.fig ? t.fig(tq) : null;
  return { tq, steps: w.slice(0, -1).map((s) => s.t), fig: spec ? fig(spec.kind === 'jumps' ? { ...spec, open: true } : spec) : '' };
}
/* A sum whose slate would show its own answer before it is typed — "37 − 20" on the way to 20 —
   is never dealt (trickSum retries); test/machine.mjs checks every dealt sum against the same rule. */
const numsIn = (html) => (String(html).replace(/<[^>]*>/g, ' ').match(/\d+/g) || []).map(Number);
export const leaks = (q) => fits(q).some((id) => { const s = slateParts(q, id); return numsIn(s.fig).includes(q.ans) || s.steps.some((x) => numsIn(x).includes(q.ans)); });
/* After each heat: one trick's algebra, with its why and its figure (the stop's own example). */
export function algebra(id) {
  const t = byId[id], ex = t.q(t.ex);
  const spec = t.fig ? t.fig(ex) : null;
  return { id, name: cardName(id), title: t.title, alg: t.alg, why: (t.why || []).slice(0, 2), ex: ex.text, fig: spec ? fig(spec) : '',
    steps: spec ? [] : t.work(ex).map((s) => `${s.t} → ${s.v}`), label: isVedic(id) ? VEDIC_LABEL : '' };
}

/* ---------------------------------------------------------------- pay */
/* answer 1 per heat won, ≤ ANSWER_CAP a session; contest 10 once a day for a clean sweep at
   level ≥ 3 with ≥ 80% right (summary().sweep). Coins go through main.js earn() only. */
export const payHeat = (won, paidSoFar) => (won && paidSoFar < ANSWER_CAP ? 1 : 0);
export const payContest = (k, s, day) => !!(s.sweep && (!k.payDay || k.payDay.machine !== day));
