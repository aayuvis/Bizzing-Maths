/* carnival.js — The Data Carnival: reading data, weighing chance, and
   puzzling problems (docs/CHAPTER-CONTRACT.md).

   Every stop that shows data draws it with ./kit.js, and no drawing carries
   its own answer: the bars have no numbers on top, the line graph's points are
   unlabelled, and the function machine shows a "?" where the number goes. */

import { int, pick, shuffle, seeded } from '../rand.js';
import { svg, text, barChart, pictogram, grid } from './kit.js';

export const WORLD = {
  id: 'carnival', name: 'The Data Carnival', short: 'Carnival', band: '6-7',
  blurb: 'Read the charts, weigh up the chances, and crack the puzzling problems.',
  tint: '#FBE6F2', ink: '#6B1F57', glyph: '🎪',
};

/* ------------------------------------------------------------ helpers */

const sum = (a) => a.reduce((x, y) => x + y, 0);
/* The test's leaked-answer rule, applied before a question leaves gen(). */
const leaks = (q) => !q.choices && String(q.ans).length > 1 && q.text.split(/[^0-9./]/).map((w) => w.replace(/\.$/, '')).includes(String(q.ans));
function fresh(make) { let q; for (let i = 0; i < 400; i++) { q = make(); if (!leaks(q)) return q; } return q; }
const list = (a) => a.length < 2 ? String(a[0]) : `${a.slice(0, -1).join(', ')} and ${a.at(-1)}`;

/* A row of number cards, in the order given — the data, nothing more. */
function cards(vals) {
  const w = vals.some((v) => v > 99) ? 56 : 44, g = 8; let s = '';
  vals.forEach((v, i) => { const x = 4 + i * (w + g);
    s += `<rect x="${x}" y="4" width="${w}" height="52" rx="8" class="dg-fill2"/>` + text(x + w / 2, 37, v, 'dg-big'); });
  return svg(8 + vals.length * (w + g) - g, 60, s, `Cards: ${vals.join(', ')}`);
}
const COLOUR = { blue: 'dg-fill1', yellow: 'dg-fill2', green: 'dg-fill3' };
/* A bag of counters, drawn as a loose heap of coloured circles. */
function bag(counters) {
  const per = 6, u = 34; let s = `<path d="M20,30 Q14,${40 + Math.ceil(counters.length / per) * u} 40,${46 + Math.ceil(counters.length / per) * u} L${per * u + 10},${46 + Math.ceil(counters.length / per) * u} Q${per * u + 36},${40 + Math.ceil(counters.length / per) * u} ${per * u + 30},30 Z" class="dg-blank"/>`;
  counters.forEach((c, i) => { const r = Math.floor(i / per), k = i % per;
    s += `<circle cx="${42 + k * u + (r % 2) * 10}" cy="${50 + r * u}" r="13" class="${COLOUR[c]}"/>`; });
  return svg(per * u + 50, 60 + Math.ceil(counters.length / per) * u, s, 'A bag of coloured counters');
}
/* A spinner with equal slices, each coloured. */
function spinner(slices, r = 80) {
  const c = r + 6, n = slices.length; let s = '';
  slices.forEach((col, i) => {
    const a0 = (i / n) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
    s += `<path d="M${c},${c} L${(c + r * Math.cos(a0)).toFixed(2)},${(c + r * Math.sin(a0)).toFixed(2)} A${r},${r} 0 0 1 ${(c + r * Math.cos(a1)).toFixed(2)},${(c + r * Math.sin(a1)).toFixed(2)} Z" class="${COLOUR[col]}"/>`;
  });
  s += `<line x1="${c}" y1="${c}" x2="${c + r * 0.55}" y2="${c - r * 0.35}" class="dg-hand"/><circle cx="${c}" cy="${c}" r="5" class="dg-dot"/>`;
  return svg(2 * c, 2 * c, s, `A spinner with ${n} equal parts`);
}
/* The six faces of a dice, as numbered squares. */
function dieFaces() {
  let s = ''; for (let i = 0; i < 6; i++) s += `<rect x="${4 + i * 50}" y="4" width="42" height="42" rx="8" class="dg-blank"/>` + text(25 + i * 50, 32, i + 1, 'dg-big');
  return svg(304, 50, s, 'The six faces of a dice');
}

/* ------------------------------------------------------------ the line graph */

const HOURS = [['9 am', '9am'], ['10 am', '10'], ['11 am', '11'], ['12 noon', '12'], ['1 pm', '1pm'], ['2 pm', '2'], ['3 pm', '3']];
function lineChart(temps) {
  const lo = 12, hi = 34, H = 176, x0 = 44, y0 = 14, gap = 44, W = x0 + gap * (temps.length - 1) + 30;
  const Y = (v) => y0 + H - ((v - lo) / (hi - lo)) * H, X = (i) => x0 + 14 + i * gap;
  let s = '';
  for (let v = lo; v <= hi; v += 2) s += `<line x1="${x0}" y1="${Y(v)}" x2="${W - 6}" y2="${Y(v)}" class="dg-grid"/>` + (v % 4 === 0 ? text(x0 - 6, Y(v) + 4, v, 'dg-small', 'end') : '');
  s += `<line x1="${x0}" y1="${Y(lo)}" x2="${W - 6}" y2="${Y(lo)}" class="dg-line"/><line x1="${x0}" y1="${Y(lo)}" x2="${x0}" y2="${Y(hi)}" class="dg-line"/>`;
  s += `<polyline points="${temps.map((t, i) => `${X(i)},${Y(t)}`).join(' ')}" class="dg-line"/>`;
  temps.forEach((t, i) => { s += `<circle cx="${X(i)}" cy="${Y(t)}" r="4.5" class="dg-dot"/>` + text(X(i), Y(lo) + 18, HOURS[i][1], 'dg-small'); });
  s += text(10, 10, '°C', 'dg-small', 'start');
  return svg(W, y0 + H + 28, s, 'A line graph of the temperature through the day');
}

/* ------------------------------------------------------------ logic grids */

/* Elimination, the way a child does it with ticks and crosses. Returns the
   people in the order they get pinned down, or null if the clues do not settle it. */
function eliminate(n, clues) {
  const P = Array.from({ length: n }, () => Array(n).fill(true)), got = Array(n).fill(-1), order = [];
  for (const [p, i, yes] of clues) {
    if (yes) { for (let k = 0; k < n; k++) { if (k !== i) P[p][k] = false; if (k !== p) P[k][i] = false; } }
    else P[p][i] = false;
  }
  for (let changed = true; changed;) {
    changed = false;
    for (let p = 0; p < n; p++) {
      if (got[p] >= 0) continue;
      const open = P[p].flatMap((v, i) => (v ? [i] : []));
      if (open.length === 0) return null;
      if (open.length === 1) { got[p] = open[0]; order.push(p); for (let k = 0; k < n; k++) if (k !== p) P[k][open[0]] = false; changed = true; }
    }
    for (let i = 0; i < n; i++) {
      const who = P.flatMap((row, p) => (row[i] ? [p] : []));
      if (who.length === 1 && got[who[0]] < 0 && P[who[0]].filter(Boolean).length > 1) { P[who[0]].fill(false); P[who[0]][i] = true; changed = true; }
    }
  }
  return { got, order };
}
/* The independent route: try every way of handing out the prizes. */
const BRUTE = '(n,c,a,L)=>{const P=[];const g=(x)=>{if(x.length===n){P.push(x);return;}for(let i=0;i<n;i++)if(!x.includes(i))g([...x,i]);};g([]);const ok=P.filter((p)=>c.every(([q,i,t])=>(p[q]===i)===t));return ok.length===1?L[ok[0][a]]:"?";}';
const KIDS = ['Asha', 'Ben', 'Chen', 'Dev', 'Ela', 'Femi', 'Gita', 'Hugo', 'Jai', 'Kofi', 'Lena', 'Maya', 'Omar', 'Priya', 'Sami', 'Tara', 'Yusuf', 'Zoe'];
const PRIZES = ['kite', 'teddy', 'balloon', 'whistle', 'yo-yo', 'hat', 'puzzle'];

/* ------------------------------------------------------------ word problems */

const PLAN = {
  /* T tokens, n rides at p each: how many left? */
  left: ({ T, n, p }) => ({
    text: `You have ${T} tokens. You go on ${n} rides at ${p} tokens each. How many tokens are left?`,
    expr: `${T}` + Array(n).fill('-' + p).join(''), ans: T - n * p,
    steps: [{ t: `Spent on rides: ${n} × ${p}`, v: n * p }, { t: `${T} − ${n * p}`, v: T - n * p }] }),
  /* a snacks at p and b drinks at c: total? */
  total: ({ a, p, b, c }) => ({
    text: `Popcorn costs ${p} tokens and a drink costs ${c}. You buy ${a} popcorn and ${b} drinks. How many tokens altogether?`,
    expr: Array(a).fill(p).concat(Array(b).fill(c)).join('+'), ans: a * p + b * c,
    steps: [{ t: `${a} × ${p}`, v: a * p }, { t: `${b} × ${c}`, v: b * c }, { t: `${a * p} + ${b * c}`, v: a * p + b * c }] }),
  /* pay T for a at p and b at c: change? */
  change: ({ T, a, p, b, c }) => ({
    text: `Candy floss costs ${p} tokens and a lolly costs ${c}. You buy ${a} candy floss and ${b} lollies, and pay with ${T} tokens. What is your change?`,
    expr: `${T}` + Array(a).fill('-' + p).join('') + Array(b).fill('-' + c).join(''), ans: T - a * p - b * c,
    steps: [{ t: `${a} × ${p}`, v: a * p }, { t: `${b} × ${c}`, v: b * c }, { t: `Total: ${a * p} + ${b * c}`, v: a * p + b * c }, { t: `${T} − ${a * p + b * c}`, v: T - a * p - b * c }] }),
  /* k shows of m minutes with g-minute breaks between them: how long? */
  shows: ({ k, m, g }) => ({
    text: `There are ${k} puppet shows in a row. Each lasts ${m} minutes, with a ${g}-minute break between shows. How many minutes from the start of the first to the end of the last?`,
    expr: Array(k).fill(m).join('+') + Array(k - 1).fill('+' + g).join(''), ans: k * m + (k - 1) * g,
    steps: [{ t: `Show time: ${k} × ${m}`, v: k * m }, { t: `Breaks: there are ${k - 1}, so ${k - 1} × ${g}`, v: (k - 1) * g }, { t: `${k * m} + ${(k - 1) * g}`, v: k * m + (k - 1) * g }] }),
  /* N children queue, s ride at once, each ride t minutes: how long? */
  queue: ({ N, s, t }) => ({
    text: `${N} children are queuing for the dodgems. ${s} can ride at once, and each ride lasts ${t} minutes. How many minutes until everyone has had a go?`,
    expr: `Math.ceil(${N}/${s})*${t}`, ans: (N / s) * t,
    steps: [{ t: `How many rides? ${N} ÷ ${s}`, v: N / s }, { t: `${N / s} × ${t}`, v: (N / s) * t }] }),
  /* n packs of c sweets shared between k friends */
  share: ({ n, c, k }) => ({
    text: `${k} friends buy ${n} packs of sweets with ${c} in each pack. They share them equally. How many does each friend get?`,
    expr: `(${Array(n).fill(c).join('+')})/${k}`, ans: (n * c) / k,
    steps: [{ t: `All the sweets: ${n} × ${c}`, v: n * c }, { t: `${n * c} ÷ ${k}`, v: (n * c) / k }] }),
};
function planArgs(kind, r, lv) {
  const big = lv === 3;
  if (kind === 'left') { const n = int(2, big ? 9 : 5, r), p = int(2, big ? 15 : 9, r); return { T: n * p + int(1, big ? 60 : 20, r), n, p }; }
  if (kind === 'total') return { a: int(2, 6, r), p: int(2, big ? 15 : 9, r), b: int(2, 6, r), c: int(2, big ? 12 : 8, r) };
  if (kind === 'change') { const a = int(2, 5, r), p = int(3, 12, r), b = int(2, 5, r), c = int(2, 9, r); return { T: Math.ceil((a * p + b * c + 1) / 10) * 10 + pick([0, 10, 20], r), a, p, b, c }; }
  if (kind === 'shows') return { k: int(2, big ? 6 : 4, r), m: pick(big ? [15, 20, 25, 30, 35, 40, 45] : [10, 15, 20, 25, 30], r), g: pick([5, 10, 15], r) };
  if (kind === 'queue') { const s = int(2, big ? 12 : 6, r); return { N: s * int(2, big ? 9 : 5, r), s, t: int(2, big ? 8 : 5, r) }; }
  const k = int(2, big ? 8 : 5, r), c = k * int(1, 4, r); return { n: int(2, big ? 8 : 5, r), c, k };
}

/* ------------------------------------------------------------ counting orders and choices */

/* n! and the falling product n × (n − 1) × … (r factors). The drills keep every
   value well inside the safe integers: products to 9!, quotients from at most 18!. */
const fact = (n) => { let p = 1; for (let k = 2; k <= n; k++) p *= k; return p; };
const fall = (n, r) => { let p = 1; for (let k = 0; k < r; k++) p *= n - k; return p; };
const downFrom = (n, r) => Array.from({ length: r }, (_, k) => n - k);
/* The independent routes the test evaluates: a factorial built upwards, and
   Pascal's triangle — adding, never dividing — for a choice of r from n. */
const FACT_JS = (n) => `[...Array(${n}).keys()].reduce((p,i)=>p*(i+1),1)`;
const PASCAL_JS = (n, r) => `((n,r)=>{let row=[1];for(let i=0;i<n;i++)row=[...row,0].map((v,j)=>v+(j?row[j-1]:0));return row[r];})(${n},${r})`;
const SUPD = '⁰¹²³⁴⁵⁶⁷⁸⁹', SUBD = '₀₁₂₃₄₅₆₇₈₉';
const nP = (n, r) => `${[...String(n)].map((d) => SUPD[d]).join('')}P${[...String(r)].map((d) => SUBD[d]).join('')}`;
const NAMES = ['Asha', 'Ben', 'Chen', 'Dev', 'Ela', 'Femi', 'Gita', 'Hugo', 'Jai'];
const PLACE = ['first', 'second', 'third', 'fourth'];

/* A row of boxes joined by × — what a factorial MEANS, never what it comes to.
   A box marked `cut` is struck through: the part that cancels. */
function chain(items, label, below = null) {
  const w = 40, g = 22, x = (i) => 4 + i * (w + g); let s = '';
  items.forEach((v, i) => {
    s += `<rect x="${x(i)}" y="6" width="${w}" height="40" rx="7" class="${i % 2 ? 'dg-fill2' : 'dg-fill1'}"/>` + text(x(i) + w / 2, 32, v, 'dg-text');
    if (i < items.length - 1) s += text(x(i) + w + g / 2, 32, '×', 'dg-text');
  });
  if (below) {
    const i = items.length - 1;
    s += text(x(i) - g / 2, 84, '÷', 'dg-text') + `<rect x="${x(i)}" y="58" width="${w}" height="40" rx="7" class="dg-fill3"/>` + text(x(i) + w / 2, 84, below, 'dg-text');
    s += `<line x1="${x(i) - 2}" y1="100" x2="${x(i) + w + 2}" y2="4" class="dg-hand2"/>`;
  }
  return svg(8 + items.length * (w + g) - g, below ? 104 : 52, s, label);
}
/* The pattern walked downwards, 0! left for the child. */
function ladder() {
  const rows = [['4!', '24'], ['3!', '6'], ['2!', '2'], ['1!', '1'], ['0!', '?']]; let s = '';
  rows.forEach(([a, b], i) => {
    const y = 8 + i * 40;
    s += `<rect x="4" y="${y}" width="104" height="30" rx="6" class="${i === 4 ? 'dg-fill2' : 'dg-blank'}"/>` + text(56, y + 20, `${a} = ${b}`, 'dg-text');
    if (i < 4) s += text(116, y + 36, `÷ ${4 - i}`, 'dg-small', 'start');
  });
  return svg(170, 206, s, 'The factorials going down: 4! = 24, 3! = 6, 2! = 2, 1! = 1, and 0! is the question');
}
/* People as coloured tokens above a row of empty places. `fixed` puts one of
   them in the first place already; `first` marks who may take the first place. */
function lineup(n, { fixed = false, first = 0, slots = n } = {}) {
  const u = 46, W = Math.max(n, slots) * u + 12; let s = '';
  for (let i = 0; i < n; i++) {
    const cx = 28 + i * u, cls = first ? (i < first ? 'dg-fill3' : 'dg-fill1') : ['dg-fill1', 'dg-fill2', 'dg-fill3'][i % 3];
    if (!(fixed && i === 0)) s += `<circle cx="${cx}" cy="26" r="17" class="${cls}"/>` + text(cx, 31, NAMES[i][0], 'dg-text');
  }
  for (let i = 0; i < slots; i++) {
    const x = 8 + i * u;
    s += `<rect x="${x}" y="64" width="${u - 8}" height="38" rx="6" class="dg-blank" stroke-dasharray="5 4"/>`;
    if (i === 0 && fixed) s += `<circle cx="${x + (u - 8) / 2}" cy="83" r="15" class="dg-fill1"/>` + text(x + (u - 8) / 2, 88, NAMES[0][0], 'dg-text');
    else if (i === 0 && first) s += text(x + (u - 8) / 2, 88, '★', 'dg-accent');
  }
  return svg(W, 108, s, fixed ? `${n} people; the first place is taken already` : first ? `${n} people, ${first} of them may go first` : `${n} people and ${slots} places`);
}
/* Named places to fill (gold, silver…), each an empty box. */
function slotsPic(names, note) {
  const w = 96, g = 12; let s = '';
  names.forEach((nm, i) => { const x = 4 + i * (w + g);
    s += `<rect x="${x}" y="22" width="${w}" height="44" rx="8" class="dg-blank" stroke-dasharray="5 4"/>` + text(x + w / 2, 14, nm, 'dg-small') + text(x + w / 2, 50, '?', 'dg-accent'); });
  s += text(4, 90, note, 'dg-small', 'start');
  return svg(Math.max(8 + names.length * (w + g) - g, 230), 98, s, `${names.length} places to fill: ${names.join(', ')}`);
}
/* n people in a ring, and a loop that holds a group of r — no first, no last. */
function ringGroup(n, r) {
  const R = 64, C = 78; let s = '';
  for (let i = 0; i < n; i++) { const t = (i / n) * 2 * Math.PI - Math.PI / 2;
    s += `<circle cx="${(C + R * Math.cos(t)).toFixed(1)}" cy="${(C + R * Math.sin(t)).toFixed(1)}" r="10" class="dg-fill1"/>`; }
  s += `<ellipse cx="${2 * C + 70}" cy="${C}" rx="52" ry="40" class="dg-blank" stroke-dasharray="6 5"/>` + text(2 * C + 70, C + 5, `a group of ${r}`, 'dg-small');
  return svg(2 * C + 130, 2 * C, s, `${n} people, and a group of ${r} to choose`);
}

/* ------------------------------------------------------------ the stops */

const CHANCE = ['impossible', 'unlikely', 'even chance', 'likely', 'certain'];
const chanceWord = (k, n) => (k === 0 ? 'impossible' : k === n ? 'certain' : 2 * k === n ? 'even chance' : 2 * k < n ? 'unlikely' : 'likely');
const DICE = [
  ['a 7', 'd===7'], ['a number less than 7', 'd<7'], ['an even number', 'd%2===0'], ['an odd number', 'd%2===1'],
  ['a 6', 'd===6'], ['a 1 or a 2', 'd<3'], ['more than 1', 'd>1'], ['more than 2', 'd>2'], ['a 3', 'd===3'], ['more than 3', 'd>3'],
];
const diceCount = (test) => [1, 2, 3, 4, 5, 6].filter(Function('d', `return ${test}`)).length;
const STALLS = ['Hoopla', 'Darts', 'Ducks', 'Coconut', 'Skittles'];
const RIDES = ['Wheel', 'Cups', 'Train', 'Slide', 'Boats', 'Swing'];

export const TRICKS = [
  /* ================================================ READING DATA */
  {
    id: 'pictogram-total', world: 'carnival', band: '6-7', title: 'Reading a pictogram',
    hook: 'One star stands for 4 prizes. Half a star — how many is that?',
    idea: 'Count the whole symbols, times by what one is worth, then add a half for each half symbol.',
    why: [
      'A pictogram is a short way of drawing a lot of things. Instead of drawing 20 prizes, you draw 5 stars and write "one star = 4". Every star is a little bag holding 4.',
      'So counting stars is counting bags, and bags of 4 are counted in fours: 5 stars is 5 × 4. A half star is half a bag — half of 4 is 2 — which is why the key always matters more than the stars.',
      'Always read the key first. The same row of stars means 10 things if each star is 2, and 20 things if each star is 4.',
    ],
    alg: 'total = (whole symbols × key) + (half symbols × key ÷ 2)',
    ex: { labels: ['Hoopla', 'Darts', 'Ducks'], counts: [10, 6, 8], per: 2, ask: 1 },
    caseKey: 'idea',
    cases: [
      { label: 'Whole stars', note: 'Read the key first. Every star is worth the same, so count the stars and times by the key.',
        ex: { labels: ['Hoopla', 'Darts', 'Ducks'], counts: [10, 6, 8], per: 2, ask: 1 } },
      { label: 'A half star', note: 'A half star is half of what one star is worth. With 4 in a star, half a star is 2.',
        ex: { labels: ['Hoopla', 'Darts', 'Ducks'], counts: [18, 12, 8], per: 4, ask: 0 } },
      { label: 'The whole chart', note: 'Altogether means every row. Count all the whole stars, times by the key, then add the halves.',
        ex: { labels: ['Hoopla', 'Darts', 'Ducks', 'Coconut'], counts: [8, 6, 12, 4], per: 4, ask: -1 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const per = lv === 1 ? 2 : lv === 2 ? pick([2, 4], r) : pick([4, 10], r);
        const labels = shuffle(STALLS, r).slice(0, lv === 1 ? 3 : 4);
        const counts = labels.map(() => (per / 2) * int(2, lv === 1 ? 12 : 20, r));
        const ask = lv === 3 || (lv === 2 && r() < 0.5) ? -1 : int(0, labels.length - 1, r);
        return this.q({ labels, counts, per, ask });
      });
    },
    q({ labels, counts, per, ask }) {
      const sym = (c) => [Math.floor(c / per), c % per ? 1 : 0];
      const rows = ask < 0 ? counts : [counts[ask]];
      const F = sum(rows.map((c) => sym(c)[0])), H = sum(rows.map((c) => sym(c)[1]));
      return { labels, counts, per, ask, idea: ask < 0 ? 'all' : H ? 'half' : 'whole', text: ask < 0 ? `Each ★ is ${per} prizes. How many prizes were won altogether?` : `Each ★ is ${per} prizes. How many prizes were won at ${labels[ask]}?`,
        expr: rows.join('+'), ans: F * per + H * (per / 2) };
    },
    work({ counts, per, ask, labels }) {
      const rows = ask < 0 ? counts : [counts[ask]];
      const F = sum(rows.map((c) => Math.floor(c / per))), H = sum(rows.map((c) => (c % per ? 1 : 0)));
      const s = [{ t: ask < 0 ? 'Count every whole ★' : `Count the whole ★ at ${labels[ask]}`, v: F }, { t: `${F} × ${per}`, v: F * per }];
      if (H) { s.push({ t: 'How many half ★?', v: H }); s.push({ t: `Add ${H} × ${per / 2}`, v: F * per + H * (per / 2) }); }
      return s;
    },
    draw({ labels, counts, per }) { return pictogram(labels, counts, per, '★'); },
  },
  {
    id: 'bar-compare', world: 'carnival', band: '6-7', title: 'Bar charts: how many more?',
    hook: 'Which ride won the vote — and by how many?',
    idea: 'Read each bar across to the scale, then take the smaller from the bigger.',
    why: [
      'A bar chart turns numbers into heights. The taller bar is the bigger number, so you can see who won before you read anything.',
      '"How many more" is a gap. Read across from the top of each bar to the numbers on the side, and the gap between the two tops is the difference: bigger take away smaller.',
      'Check the scale before you read. If each line is worth 2, a bar that stops halfway between two lines is an odd number; if each line is worth 10, halfway is a 5.',
    ],
    alg: 'how many more = taller bar − shorter bar',
    ex: { labels: ['Wheel', 'Cups', 'Train', 'Slide'], values: [9, 4, 6, 7], step: 1, a: 0, b: 1 },
    caseKey: 'step',
    cases: [
      { label: 'Each line is 1', note: 'Read across from the top of each bar, then take the smaller from the bigger.',
        ex: { labels: ['Wheel', 'Cups', 'Train', 'Slide'], values: [9, 4, 6, 7], step: 1, a: 0, b: 1 } },
      { label: 'Each line is 2', note: 'Now the lines go up in twos, so count in twos from the bottom — not one for each line.',
        ex: { labels: ['Wheel', 'Cups', 'Train', 'Slide'], values: [16, 10, 12, 8], step: 2, a: 0, b: 3 } },
      { label: 'Each line is 10', note: 'The lines go up in tens. A bar that stops halfway between two lines is worth a 5 in the middle.',
        ex: { labels: ['Wheel', 'Cups', 'Train', 'Slide'], values: [65, 30, 45, 50], step: 10, a: 0, b: 2 } },
    ],
    gen(r, lv = 1) {
      const step = lv === 1 ? 1 : lv === 2 ? 2 : 10, unit = lv === 3 ? 5 : step;
      const labels = shuffle(RIDES, r).slice(0, lv === 1 ? 3 : int(4, 5, r));
      let values;
      do values = labels.map(() => unit * int(1, lv === 1 ? 10 : lv === 2 ? 10 : 18, r)); while (new Set(values).size < 2);
      let a, b; do { a = int(0, labels.length - 1, r); b = int(0, labels.length - 1, r); } while (values[a] <= values[b]);
      return this.q({ labels, values, step, a, b });
    },
    q({ labels, values, step, a, b }) {
      return { labels, values, step, a, b, text: `Votes for the best ride. How many more voted for ${labels[a]} than ${labels[b]}?`, expr: `${values[a]}-${values[b]}`, ans: values[a] - values[b] };
    },
    work({ labels, values, a, b }) {
      return [{ t: `Read the ${labels[a]} bar`, v: values[a] }, { t: `Read the ${labels[b]} bar`, v: values[b] }, { t: `${values[a]} − ${values[b]}`, v: values[a] - values[b] }];
    },
    draw({ labels, values, step }) { return barChart(labels, values, step, 'Votes'); },
  },

  /* ================================================ CHANCE, IN WORDS */
  {
    id: 'chance-words', world: 'carnival', band: '6-7', title: 'The words of chance',
    hook: 'A bag of 3 yellow and 5 blue. Will you pick blue? Maybe — but how likely?',
    idea: 'Count the ways it can happen out of all the ways: none is impossible, all is certain, half is an even chance.',
    why: [
      'You cannot know what you will pull out of a bag without looking. But you can know how the bag is made, and that tells you how the chance leans.',
      'If none of the counters are green, green cannot happen — impossible. If every counter is blue, blue must happen — certain. If exactly half are blue, blue and not-blue are equally matched — an even chance.',
      'Anything between: fewer than half is unlikely (it can happen, it just usually won\'t), more than half is likely. Counting the ways is the whole trick.',
    ],
    alg: 'k ways out of n: k = 0 impossible · k < n/2 unlikely · k = n/2 even · k > n/2 likely · k = n certain',
    ex: { kind: 'bag', bag: ['yellow', 'yellow', 'yellow', 'blue', 'blue', 'blue', 'blue', 'blue'], want: 'blue' },
    caseKey: 'ans',
    cases: [
      { label: 'Impossible', note: 'There are no green counters at all, so green cannot happen — not even once in a million tries.',
        ex: { kind: 'bag', bag: ['blue', 'yellow', 'blue', 'yellow', 'blue'], want: 'green' } },
      { label: 'Unlikely', note: 'Blue can happen, but fewer than half the counters are blue — so usually it won\'t.',
        ex: { kind: 'bag', bag: ['yellow', 'blue', 'yellow', 'yellow', 'blue', 'yellow'], want: 'blue' } },
      { label: 'Even chance', note: 'Exactly half the counters are blue, so blue and not-blue are equally matched.',
        ex: { kind: 'bag', bag: ['blue', 'yellow', 'yellow', 'blue'], want: 'blue' } },
      { label: 'Likely', note: 'More than half the counters are blue: 5 out of 8 is more than 4. Likely — but not certain.',
        ex: { kind: 'bag', bag: ['yellow', 'yellow', 'yellow', 'blue', 'blue', 'blue', 'blue', 'blue'], want: 'blue' } },
      { label: 'Certain', note: 'Every face of a dice is less than 7, so it must happen — every single time.',
        ex: { kind: 'dice', ev: 1 } },
    ],
    gen(r, lv = 1) {
      if (lv > 1 && r() < 0.4) return this.q({ kind: 'dice', ev: int(0, DICE.length - 1, r) });
      const target = pick(CHANCE, r), cols = lv === 1 ? ['blue', 'yellow'] : ['blue', 'yellow', 'green'];
      let n = int(2, lv === 1 ? 6 : 10, r); if (target === 'even chance' && n % 2) n++;
      if ((target === 'unlikely' || target === 'likely') && n < 3) n = 3;
      const want = pick(cols, r), others = cols.filter((c) => c !== want);
      const k = target === 'impossible' ? 0 : target === 'certain' ? n : target === 'even chance' ? n / 2
        : target === 'unlikely' ? int(1, Math.ceil(n / 2) - 1, r) : int(Math.floor(n / 2) + 1, n - 1, r);
      let fill = Array.from({ length: n - k }, () => pick(others, r));
      if (target === 'impossible' && lv === 1 && r() < 0.5) fill = fill.map(() => others[0]);
      const bagOf = shuffle([...Array(k).fill(want), ...fill], r);
      return this.q({ kind: 'bag', bag: bagOf, want: target === 'impossible' && lv === 1 ? (r() < 0.5 ? 'green' : want) : want });
    },
    q(a) {
      let text, expr, k, n;
      if (a.kind === 'dice') { const [say, test] = DICE[a.ev]; k = diceCount(test); n = 6;
        text = `Roll a dice. Getting ${say} is…`; expr = `((k)=>k===0?'impossible':k===6?'certain':k*2===6?'even chance':k*2<6?'unlikely':'likely')([1,2,3,4,5,6].filter((d)=>${test}).length)`; }
      else { const tally = ['blue', 'yellow', 'green'].map((c) => [c, a.bag.filter((x) => x === c).length]).filter(([, m]) => m);
        k = a.bag.filter((x) => x === a.want).length; n = a.bag.length;
        text = `A bag holds ${list(tally.map(([c, m]) => `${m} ${c}`))} counters. You pick one without looking. Getting ${a.want} is…`;
        expr = `((b)=>{const k=b.filter((c)=>c==='${a.want}').length;return k===0?'impossible':k===b.length?'certain':k*2===b.length?'even chance':k*2<b.length?'unlikely':'likely';})(${JSON.stringify(a.bag)})`; }
      const ans = chanceWord(k, n), drop = shuffle(CHANCE.filter((c) => c !== ans), seeded(text))[0];
      return { ...a, text, expr, ans, choices: CHANCE.filter((c) => c !== drop), say: text.replace('…', ' what?') };
    },
    work(q) {
      const n = q.kind === 'dice' ? 6 : q.bag.length, k = q.kind === 'dice' ? diceCount(DICE[q.ev][1]) : q.bag.filter((x) => x === q.want).length;
      return [{ t: q.kind === 'dice' ? `How many faces give ${DICE[q.ev][0]}?` : `How many ${q.want} counters?`, v: k },
        { t: q.kind === 'dice' ? 'How many faces altogether?' : 'How many counters altogether?', v: n },
        { t: `${k} out of ${n}, so it is…`, v: q.ans, choices: q.choices }];
    },
    draw(q) { return q.kind === 'dice' ? dieFaces() : bag(q.bag); },
  },

  /* ================================================ MORE DATA */
  {
    id: 'line-graph-read', world: 'carnival', band: '8-10', title: 'Reading a line graph',
    hook: 'The line climbs all morning. How warm was it at 11?',
    idea: 'Go up from the time to the line, then straight across to the scale.',
    why: [
      'A line graph shows something that changes over time. Time runs along the bottom; the amount goes up the side. Each dot is one reading, and the line joins them in order.',
      'To read a value, go up from the time until you hit the line, then across to the side. Count the small gaps from the nearest number you know — here each gap is 2 degrees.',
      'Because the line joins the dots, a temperature that rose steadily from 20 at 11 o\'clock to 24 at noon was about 22 at half past 11 — halfway along the line is halfway between the two readings.',
    ],
    alg: 'value between two readings a and b, halfway along = (a + b) ÷ 2',
    ex: { temps: [16, 18, 22, 24, 28, 26, 22], ask: 'at', i: 2, j: 2 },
    caseKey: 'ask',
    cases: [
      { label: 'Read one value', note: 'Go up from the time to the dot, then across to the side. Each small gap is 2 degrees.',
        ex: { temps: [16, 18, 22, 24, 28, 26, 22], ask: 'at', i: 2, j: 2 } },
      { label: 'How much warmer?', note: 'Read both times, then take the smaller from the bigger — the difference is the gap between the two dots.',
        ex: { temps: [16, 18, 22, 24, 28, 26, 22], ask: 'diff', i: 4, j: 0 } },
      { label: 'Halfway between', note: 'There is no dot there, but the line joins the two readings — halfway along is halfway between them.',
        ex: { temps: [16, 18, 22, 24, 28, 26, 22], ask: 'half', i: 1, j: 2 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const temps = [int(7, 10, r) * 2]; for (let i = 1; i < 7; i++) temps.push(Math.max(14, Math.min(32, temps[i - 1] + 2 * int(i < 5 ? -1 : -2, i < 5 ? 3 : 1, r))));
        if (Math.max(...temps) === Math.min(...temps)) temps[3] += 2;
        if (lv === 1) { const i = int(0, 6, r); return this.q({ temps, ask: 'at', i, j: i }); }
        if (lv === 2) { let i, j; do { i = int(0, 6, r); j = int(0, 6, r); } while (temps[i] <= temps[j]); return this.q({ temps, ask: 'diff', i, j }); }
        const i = int(0, 5, r); return this.q({ temps, ask: 'half', i, j: i + 1 });
      });
    },
    q({ temps, ask, i, j }) {
      const h = (k) => HOURS[k][0];
      const text = ask === 'at' ? `The line graph shows the temperature at the carnival. How warm was it at ${h(i)}, in °C?`
        : ask === 'diff' ? `The line graph shows the temperature at the carnival. How many degrees warmer was it at ${h(i)} than at ${h(j)}?`
          : `The line graph shows the temperature at the carnival. About how warm was it halfway between ${h(i)} and ${h(j)}?`;
      const ans = ask === 'at' ? temps[i] : ask === 'diff' ? temps[i] - temps[j] : (temps[i] + temps[j]) / 2;
      const expr = ask === 'at' ? `[${temps}][${i}]` : ask === 'diff' ? `Math.abs(${temps[i]}-${temps[j]})` : `${temps[i]}+(${temps[j]}-${temps[i]})/2`;
      return { temps, ask, i, j, text, expr, ans };
    },
    work({ temps, ask, i, j }) {
      if (ask === 'at') { const lab = Math.floor(temps[i] / 4) * 4; return [{ t: 'The numbered line at or just below the dot', v: lab }, { t: `Add 2 for each small gap above ${lab}`, v: temps[i] }]; }
      if (ask === 'diff') return [{ t: `At ${HOURS[i][0]}`, v: temps[i] }, { t: `At ${HOURS[j][0]}`, v: temps[j] }, { t: `${temps[i]} − ${temps[j]}`, v: temps[i] - temps[j] }];
      return [{ t: `At ${HOURS[i][0]}`, v: temps[i] }, { t: `At ${HOURS[j][0]}`, v: temps[j] }, { t: `Halfway: (${temps[i]} + ${temps[j]}) ÷ 2`, v: (temps[i] + temps[j]) / 2 }];
    },
    draw({ temps }) { return lineChart(temps); },
  },
  {
    id: 'mean-fair-share', world: 'carnival', band: '8-10', title: 'The mean: fair shares',
    hook: 'Four friends won 3, 7, 5 and 9 tickets. If they share them out fairly, how many each?',
    idea: 'Add everything up, then share it out equally: divide by how many numbers there are.',
    why: [
      'Imagine every friend tips their tickets into one pile. Nothing is lost — the pile holds all 24. Now deal the pile out again, one each, round and round, until it is gone. Everyone ends up with the same: 6. That fair share is the mean.',
      'Picture it as towers of blocks: the mean is what you get when you knock the tall towers down and use the spare blocks to build up the short ones until all the towers are level.',
      'That is why the mean needs both steps. Adding makes the pile; dividing by how many people deals it out. Divide by the wrong number and somebody gets cheated.',
    ],
    alg: 'mean = (x₁ + x₂ + … + xₙ) ÷ n',
    ex: { vals: [3, 7, 5, 9] },
    oneIdea: true,
    gen(r, lv = 1) {
      return fresh(() => {
        const n = lv === 1 ? 3 : lv === 2 ? int(4, 5, r) : int(5, 6, r), lo = 1, hi = lv === 1 ? 10 : lv === 2 ? 20 : 60;
        const vals = Array.from({ length: n - 1 }, () => int(lo, hi, r)), s = sum(vals);
        const opts = []; for (let v = lo; v <= hi; v++) if ((s + v) % n === 0) opts.push(v);
        vals.push(pick(opts, r));
        return this.q({ vals });
      });
    },
    q({ vals }) { return { vals, text: `The mean of ${vals.join(', ')}`, say: `the mean of ${list(vals)}`, expr: `(${vals.join('+')})/${vals.length}`, ans: sum(vals) / vals.length }; },
    work({ vals }) {
      const s = sum(vals);
      return [{ t: 'Add them all up', v: s }, { t: 'How many numbers?', v: vals.length }, { t: `${s} ÷ ${vals.length}`, v: s / vals.length }];
    },
    draw({ vals }) { const m = Math.max(...vals); return barChart(vals.map((_, i) => String.fromCharCode(65 + i)), vals, m <= 10 ? 1 : m <= 20 ? 2 : 10); },
  },
  {
    id: 'median-mode', world: 'carnival', band: '8-10', title: 'Median and mode',
    hook: 'Seven scores, all jumbled. Which one is right in the middle?',
    idea: 'The median is the middle number once they are in order. The mode is the number that turns up most.',
    why: [
      'The median is a middle, so it only makes sense once the numbers stand in a line from smallest to largest. Then half of them are on one side and half on the other — like the child in the middle of a line-up by height.',
      'With an even count there are two middle numbers, and the median is halfway between them — the point that still splits the line into two equal halves.',
      'The mode is the most popular: the number you see most often. It is the only "average" that works for things that are not numbers at all — the favourite ride, the most common colour.',
    ],
    alg: 'median = the ((n + 1) ÷ 2)th value in order · mode = the most frequent value',
    echo: true,
    ex: { vals: [12, 5, 9, 14, 7], stat: 'median' },
    caseKey: 'kind',
    cases: [
      { label: 'Median', note: 'Put them in order first. With an odd count there is one number right in the middle.',
        ex: { vals: [12, 5, 9, 14, 7], stat: 'median' } },
      { label: 'Median of an even count', note: 'With an even count, two numbers share the middle. The median is halfway between them.',
        ex: { vals: [12, 5, 9, 14, 7, 3], stat: 'median' } },
      { label: 'Mode', note: 'No ordering needed: the mode is simply the number that turns up most often.',
        ex: { vals: [4, 7, 4, 2, 9, 4], stat: 'mode' } },
    ],
    gen(r, lv = 1) {
      const stat = r() < 0.5 ? 'median' : 'mode';
      if (stat === 'mode') {
        const k = lv === 1 ? 4 : lv === 2 ? 5 : 6, pool = shuffle(Array.from({ length: lv === 1 ? 10 : 30 }, (_, i) => i + 1), r).slice(0, k);
        const vals = [...pool, pool[0], pool[0]]; if (lv === 3) vals.push(pool[1]);
        return this.q({ vals: shuffle(vals, r), stat });
      }
      const n = lv === 1 ? 5 : lv === 2 ? 7 : 6;
      let vals;
      do vals = Array.from({ length: n }, () => int(1, lv === 1 ? 20 : 50, r)); while (n % 2 === 0 && (() => { const s = [...vals].sort((a, b) => a - b); return (s[n / 2 - 1] + s[n / 2]) % 2; })());
      return this.q({ vals, stat });
    },
    q({ vals, stat }) {
      const s = [...vals].sort((a, b) => a - b), n = vals.length;
      const ans = stat === 'mode' ? +Object.entries(vals.reduce((m, v) => ({ ...m, [v]: (m[v] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1])[0][0]
        : n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
      const expr = stat === 'mode' ? `[${vals}].find((v,_,a)=>a.every((w)=>a.filter((x)=>x===w).length<a.filter((x)=>x===v).length||w===v))`
        : `((a)=>(a[Math.floor((a.length-1)/2)]+a[Math.ceil((a.length-1)/2)])/2)([${vals}].sort((x,y)=>x-y))`;
      return { vals, stat, kind: stat === 'mode' ? 'mode' : n % 2 ? 'odd' : 'even', text: `The ${stat} of ${vals.join(', ')}`, say: `the ${stat} of ${list(vals)}`, expr, ans };
    },
    work({ vals, stat, ans }) {
      const s = [...vals].sort((a, b) => a - b), n = vals.length;
      if (stat === 'mode') return [{ t: 'How many times does the most common number appear?', v: vals.filter((v) => v === ans).length }, { t: 'Which number is it?', v: ans }];
      if (n % 2) return [{ t: 'How many numbers?', v: n }, { t: 'Which place in the line is the middle?', v: (n + 1) / 2 }, { t: 'Put them in order and read that one', v: ans }];
      return [{ t: 'In order, the first of the two middle numbers', v: s[n / 2 - 1] }, { t: 'and the second', v: s[n / 2] }, { t: 'Halfway between them', v: ans }];
    },
    draw({ vals }) { return cards(vals); },
  },
  {
    id: 'data-range', world: 'carnival', band: '8-10', title: 'The range: how spread out?',
    hook: 'Scores of 14, 31, 25, 9 and 27. How far apart is the best from the worst?',
    idea: 'Find the largest and the smallest, and take one from the other.',
    why: [
      'Two teams can have the same mean and still be very different: one where everyone scores about 20, and one where some score 2 and some score 40. The range tells them apart.',
      'The range is the distance from the lowest number to the highest — the whole width the data is spread across, like the length of a line from the shortest child to the tallest.',
      'Only the two ends matter. Every other number sits somewhere in between, so it cannot make the spread any wider.',
    ],
    alg: 'range = largest − smallest',
    ex: { vals: [14, 31, 25, 9, 27] },
    oneIdea: true,
    gen(r, lv = 1) {
      return fresh(() => {
        const n = lv === 1 ? 4 : lv === 2 ? 6 : 8, hi = lv === 1 ? 20 : lv === 2 ? 60 : 150;
        return this.q({ vals: Array.from({ length: n }, () => int(1, hi, r)) });
      });
    },
    q({ vals }) { return { vals, text: `The range of ${vals.join(', ')}`, say: `the range of ${list(vals)}`, expr: `Math.max(${vals})-Math.min(${vals})`, ans: Math.max(...vals) - Math.min(...vals) }; },
    work({ vals }) {
      const a = [...vals].sort((x, y) => x - y), lo = a[0], hi = a.at(-1);
      return [{ t: 'The largest', v: hi }, { t: 'The smallest', v: lo }, { t: `${hi} − ${lo}`, v: hi - lo }];
    },
    draw({ vals }) { return cards(vals); },
  },

  /* ================================================ CHANCE, AS A NUMBER */
  {
    id: 'chance-fraction', world: 'carnival', band: '8-10', title: 'Chance as a fraction',
    hook: 'A spinner with 8 equal parts, 3 of them blue. What is the chance of blue — as a number?',
    idea: 'Probability = the ways it can happen ÷ all the equally likely ways. Write it as a fraction.',
    why: [
      'If every part of the spinner is the same size, every part is equally likely to be where the arrow stops. So each of the 8 parts gets exactly one eighth of the chance.',
      'Three of those eighths are blue, so the chance of blue is 3/8. The bottom of the fraction counts everything that could happen; the top counts the ones you want.',
      'That is why chance is always between 0 and 1: 0/8 is impossible, 8/8 is certain, and 4/8 — a half — is the even chance in the middle. The chance of NOT blue is whatever is left: 5/8.',
    ],
    alg: 'P(event) = ways it can happen ÷ all equally likely ways',
    frac: true, keys: ['/'],
    ex: { kind: 'spin', slices: ['blue', 'yellow', 'blue', 'yellow', 'yellow', 'blue', 'yellow', 'yellow'], want: 'blue', not: false },
    caseKey: 'ask',
    cases: [
      { label: 'The chance of it', note: 'The bottom of the fraction counts every equal part; the top counts the parts you want.',
        ex: { kind: 'spin', slices: ['blue', 'yellow', 'blue', 'yellow', 'yellow', 'blue', 'yellow', 'yellow'], want: 'blue', not: false } },
      { label: 'The chance of NOT', note: 'Count the parts that are anything else. The two chances always add up to a whole: 3/8 blue leaves 5/8 not blue.',
        ex: { kind: 'spin', slices: ['blue', 'yellow', 'blue', 'yellow', 'yellow', 'blue', 'yellow', 'yellow'], want: 'blue', not: true } },
    ],
    gen(r, lv = 1) {
      if (lv === 3 && r() < 0.4) { let ev; do ev = int(0, DICE.length - 1, r); while ([0, 1].includes(ev)); return this.q({ kind: 'dice', ev }); }
      const cols = lv === 1 ? ['blue', 'yellow'] : ['blue', 'yellow', 'green'];
      const n = lv === 1 ? int(3, 8, r) : int(5, 12, r), want = pick(cols, r);
      let items; do items = Array.from({ length: n }, () => pick(cols, r)); while (!items.includes(want) || items.every((c) => c === want));
      return this.q({ kind: lv === 1 || r() < 0.5 ? 'spin' : 'bag', slices: items, want, not: lv === 3 && r() < 0.5 });
    },
    q(a) {
      let text, expr, k, n;
      if (a.kind === 'dice') { const [say, test] = DICE[a.ev]; k = diceCount(test); n = 6;
        text = `Roll a dice. What is the chance of getting ${say}?`; expr = `[1,2,3,4,5,6].filter((d)=>${test}).length/6`; }
      else {
        const tally = ['blue', 'yellow', 'green'].map((c) => [c, a.slices.filter((x) => x === c).length]).filter(([, m]) => m);
        const has = a.slices.filter((x) => x === a.want).length; n = a.slices.length; k = a.not ? n - has : has;
        const what = a.not ? `anything but ${a.want}` : a.want;
        text = a.kind === 'spin' ? `A spinner has ${n} equal parts: ${list(tally.map(([c, m]) => `${m} ${c}`))}. What is the chance of ${what}?`
          : `A bag holds ${list(tally.map(([c, m]) => `${m} ${c}`))} counters. Pick one without looking. What is the chance of ${what}?`;
        expr = `${JSON.stringify(a.slices)}.filter((c)=>(c==='${a.want}')!==${a.not}).length/${JSON.stringify(a.slices)}.length`;
      }
      return { ...a, ask: a.not ? 'not' : 'is', text, expr, ans: `${k}/${n}`, frac: true };
    },
    work(q) {
      if (q.kind === 'dice') { const k = diceCount(DICE[q.ev][1]); return [{ t: `How many faces give ${DICE[q.ev][0]}?`, v: k }, { t: 'How many faces altogether?', v: 6 }, { t: 'The chance, as a fraction', v: `${k}/6` }]; }
      const n = q.slices.length, has = q.slices.filter((x) => x === q.want).length, k = q.not ? n - has : has;
      return [{ t: q.not ? `How many are NOT ${q.want}?` : `How many are ${q.want}?`, v: k }, { t: q.kind === 'spin' ? 'How many equal parts altogether?' : 'How many counters altogether?', v: n }, { t: 'The chance, as a fraction', v: `${k}/${n}` }];
    },
    draw(q) { return q.kind === 'dice' ? dieFaces() : q.kind === 'spin' ? spinner(q.slices) : bag(q.slices); },
  },
  {
    id: 'list-outcomes', world: 'carnival', band: '8-10', title: 'Counting all the ways',
    hook: '3 tops and 4 skirts for the parade. How many different outfits — without drawing them all?',
    idea: 'For every choice of the first thing, there are all the choices of the second: multiply.',
    why: [
      'List them in a system so none is missed: take the first top and try it with every skirt — that is 4 outfits. The second top makes 4 more, the third another 4. Three rows of 4 is 3 × 4.',
      'The same works for chance. A coin can land 2 ways and a dice 6 ways, and every coin result goes with every dice result: 2 × 6 = 12 outcomes, like a table with 2 rows and 6 columns.',
      'Handshakes are different, because two people shaking hands is ONE handshake, not two. Each of 6 people shakes 5 hands, which counts 6 × 5 = 30 — but every handshake was counted from both ends, so there are only 15.',
    ],
    alg: 'a choices then b choices: a × b · handshakes among n people: n(n − 1) ÷ 2',
    ex: { kind: 'wear', a: 3, b: 4 },
    caseKey: 'idea',
    cases: [
      { label: 'Two choices: multiply', note: 'Every top goes with every skirt, so it is rows of the same size: 3 rows of 4.',
        ex: { kind: 'wear', a: 3, b: 4 } },
      { label: 'Three choices', note: 'Every hat-and-mask pair goes with every cape, so multiply again for the third choice.',
        ex: { kind: 'three', a: 2, b: 3, c: 4 } },
      { label: 'Handshakes', note: 'A handshake between two people is ONE handshake, but counting from both ends counts it twice — so halve it.',
        ex: { kind: 'hands', a: 5, b: 0 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) { const kind = pick(['coins', 'coindie', 'coinspin', 'wear'], r); return this.q({ kind, a: 2, b: kind === 'coins' ? 2 : kind === 'coindie' ? 6 : kind === 'coinspin' ? int(3, 5, r) : int(2, 4, r) }); }
        if (lv === 2) return this.q({ kind: pick(['wear', 'cone'], r), a: int(2, 6, r), b: int(3, 7, r) });
        return r() < 0.5 ? this.q({ kind: 'hands', a: int(4, 12, r), b: 0 }) : this.q({ kind: 'three', a: int(2, 5, r), b: int(2, 5, r), c: int(2, 4, r) });
      });
    },
    q({ kind, a, b, c }) {
      const T = {
        coins: ['Toss two coins. How many different outcomes are there?', `${a}*${b}`],
        coindie: ['Toss a coin and roll a dice. How many different outcomes are there?', `${a}*${b}`],
        coinspin: [`Toss a coin and spin a spinner with ${b} equal parts. How many different outcomes?`, `${a}*${b}`],
        wear: [`${a} tops and ${b} skirts for the parade. How many different outfits?`, `${Array(a).fill(b).join('+')}`],
        cone: [`${a} ice-cream flavours and ${b} toppings. One of each — how many different cones?`, `${Array(a).fill(b).join('+')}`],
        hands: [`${a} friends meet at the carnival. Everyone shakes hands once with everyone else. How many handshakes?`, `${Array.from({ length: a - 1 }, (_, i) => i + 1).join('+')}`],
        three: [`${a} hats, ${b} masks and ${c} capes. One of each — how many different costumes?`, `${a}*${b}*${c}`],
      }[kind];
      const ans = kind === 'hands' ? (a * (a - 1)) / 2 : kind === 'three' ? a * b * c : a * b;
      return { kind, a, b, c, idea: kind === 'hands' ? 'pairs' : kind === 'three' ? 'three' : 'two', text: T[0], expr: T[1], ans };
    },
    work({ kind, a, b, c }) {
      if (kind === 'hands') return [{ t: 'How many hands does each person shake?', v: a - 1 }, { t: `${a} × ${a - 1}`, v: a * (a - 1) }, { t: 'Each handshake was counted twice — halve it', v: (a * (a - 1)) / 2 }];
      if (kind === 'three') return [{ t: `Hats and masks: ${a} × ${b}`, v: a * b }, { t: `With every one of those, ${c} capes: ${a * b} × ${c}`, v: a * b * c }];
      const first = { coins: 'the first coin', coindie: 'the coin', coinspin: 'the coin', wear: 'tops', cone: 'flavours' }[kind];
      const second = { coins: 'the second coin', coindie: 'the dice', coinspin: 'the spinner', wear: 'skirts', cone: 'toppings' }[kind];
      return [{ t: kind === 'wear' || kind === 'cone' ? `How many ${first}?` : `Ways ${first} can land`, v: a }, { t: kind === 'wear' || kind === 'cone' ? `How many ${second} go with each?` : `Ways for ${second}`, v: b }, { t: `${a} × ${b}`, v: a * b }];
    },
    draw({ kind, a, b }) {
      if (kind !== 'hands') return grid(b, a);
      let s = ''; const R = 70, C = 84;
      for (let i = 0; i < a; i++) { const t = (i / a) * 2 * Math.PI - Math.PI / 2; s += `<circle cx="${(C + R * Math.cos(t)).toFixed(1)}" cy="${(C + R * Math.sin(t)).toFixed(1)}" r="9" class="dg-dot"/>`; }
      return svg(2 * C, 2 * C, s, `${a} friends in a ring`);
    },
  },

  /* ================================================ PROBLEM SOLVING */
  {
    id: 'think-of-a-number', world: 'carnival', band: '8-10', title: 'Working backwards',
    hook: 'I think of a number, times it by 3, add 4, and get 19. What was my number?',
    idea: 'Start at the end and undo each step, last one first: undo + with −, and × with ÷.',
    why: [
      'Think of the number going through a machine: first × 3, then + 4, and out comes 19. To get back, walk the path the other way — the last thing done is the first thing undone.',
      'Every step has an opposite that cancels it. Adding 4 then taking 4 away leaves you where you were; times 3 then divide by 3 does too. So 19 − 4 = 15 undoes the adding, and 15 ÷ 3 = 5 undoes the multiplying.',
      'It is like taking off your shoes before your socks: you put the socks on first, so they come off last. Check by running 5 forwards: 5 × 3 = 15, 15 + 4 = 19.',
    ],
    alg: '((x × a) + b = c) ⇒ x = (c − b) ÷ a',
    ex: { x: 5, ops: [['×', 3], ['+', 4]] },
    oneIdea: true,
    gen(r, lv = 1) {
      return fresh(() => {
        const x = int(2, lv === 1 ? 10 : lv === 2 ? 15 : 25, r);
        const mul = ['×', int(2, lv === 1 ? 5 : 9, r)], add = [r() < 0.5 || lv === 1 ? '+' : '−', int(1, lv === 1 ? 10 : 20, r)];
        let ops = r() < 0.5 ? [mul, add] : [add, mul];
        if (ops.some((_, i) => ops.slice(0, i + 1).reduce(apply, x) <= 0)) ops = ops.map(([o, n]) => [o === '−' ? '+' : o, n]);
        if (lv === 3) {
          const v = ops.reduce(apply, x), ds = [2, 3, 4, 5, 6].filter((d) => v % d === 0);
          ops.push(ds.length ? ['÷', pick(ds, r)] : ['+', int(5, 30, r)]);
        }
        return this.q({ x, ops });
      });
    },
    q({ x, ops }) {
      const out = ops.reduce(apply, x);
      const js = ops.reduce((e, [o, n]) => `(${e}${{ '×': '*', '+': '+', '−': '-', '÷': '/' }[o]}${n})`, 'x');
      return { x, ops, text: `? → ${ops.map(([o, n]) => `${o} ${n}`).join(' → ')} → ${out}. What number went in?`,
        say: `I think of a number, ${ops.map(([o, n]) => `${{ '×': 'multiply by', '+': 'add', '−': 'take away', '÷': 'divide by' }[o]} ${n}`).join(', then ')}, and get ${out}. What was my number?`,
        expr: `[...Array(2000).keys()].find((x)=>${js}===${out})`, ans: x };
    },
    work({ x, ops }) {
      let v = ops.reduce(apply, x); const s = [];
      for (const [o, n] of [...ops].reverse()) {
        const inv = { '×': '÷', '÷': '×', '+': '−', '−': '+' }[o], nv = apply(v, [inv, n]);
        s.push({ t: `Undo ${o} ${n}: ${v} ${inv} ${n}`, v: nv }); v = nv;
      }
      return s;
    },
    draw({ x, ops }) {
      const boxes = ['?', ...ops.map(([o, n]) => `${o} ${n}`), String(ops.reduce(apply, x))], w = 58, g = 26; let s = '';
      boxes.forEach((b, i) => { const X = 4 + i * (w + g);
        s += `<rect x="${X}" y="8" width="${w}" height="44" rx="${i === 0 || i === boxes.length - 1 ? 22 : 6}" class="${i === 0 || i === boxes.length - 1 ? 'dg-fill2' : 'dg-fill1'}"/>` + text(X + w / 2, 36, b, 'dg-text');
        if (i < boxes.length - 1) s += `<line x1="${X + w + 4}" y1="30" x2="${X + w + g - 6}" y2="30" class="dg-line"/><path d="M${X + w + g - 10},25 L${X + w + g - 4},30 L${X + w + g - 10},35" class="dg-line"/>`; });
      return svg(8 + boxes.length * (w + g) - g, 60, s, 'A number machine');
    },
  },
  {
    id: 'multi-step-problems', world: 'carnival', band: '8-10', title: 'Problems in steps',
    hook: '50 tokens, 3 rides at 8 tokens each. What is left? Two sums hiding in one question.',
    idea: 'Find the question inside the question: work out the part you need first, then use it.',
    why: [
      'A long problem is a few short ones in a row. "How many tokens are left?" cannot be answered until you know how many were spent — so that is the first question, and its answer feeds the second.',
      'Write each step as its own little sum. 3 rides at 8 tokens is 3 × 8 = 24 spent; 50 − 24 = 26 left. Each sum is easy; the skill is putting them in the right order. Watch the gaps, too: 3 shows in a row have only 2 breaks between them, like 3 fence posts with 2 gaps.',
      'Then check the answer makes sense: you cannot have more tokens left than you started with, and a show cannot finish before it starts. A silly answer means a step was done the wrong way round.',
    ],
    alg: 'left = start − (number × price)',
    ex: { kind: 'left', T: 50, n: 3, p: 8 },
    caseKey: 'kind',
    cases: [
      { label: 'What is left?', note: 'You cannot take away until you know what was spent — so the times sum comes first.',
        ex: { kind: 'left', T: 50, n: 3, p: 8 } },
      { label: 'Two things bought', note: 'Two different prices make two little times sums. Work each one out, then add them.',
        ex: { kind: 'total', a: 3, p: 5, b: 2, c: 4 } },
      { label: 'Change from a payment', note: 'Cost the candy floss, cost the lollies, add them — and only then take the total from what you paid.',
        ex: { kind: 'change', T: 50, a: 2, p: 8, b: 3, c: 5 } },
      { label: 'Breaks between shows', note: 'There is a break between each pair of shows, not after the last — so one fewer break than shows.',
        ex: { kind: 'shows', k: 3, m: 20, g: 10 } },
      { label: 'Turns in a queue', note: 'First find how many rides it takes to fit everyone in, then times by how long each ride lasts.',
        ex: { kind: 'queue', N: 12, s: 4, t: 5 } },
      { label: 'Pool, then share', note: 'Put all the sweets in one pile first, then share the pile equally.',
        ex: { kind: 'share', n: 3, c: 8, k: 4 } },
    ],
    gen(r, lv = 1) {
      const kinds = lv === 1 ? ['left', 'queue', 'share'] : lv === 2 ? ['total', 'shows', 'share', 'left'] : ['change', 'shows', 'queue', 'total'];
      return fresh(() => { const kind = pick(kinds, r); return this.q({ kind, ...planArgs(kind, r, lv) }); });
    },
    q(a) { const p = PLAN[a.kind](a); return { ...a, text: p.text, expr: p.expr, ans: p.ans }; },
    work(a) { return PLAN[a.kind](a).steps; },
  },
  {
    id: 'who-has-which', world: 'carnival', band: '8-10', title: 'Who won which prize?',
    hook: 'Three friends, three prizes, two clues. Can you work out who won what?',
    idea: 'Cross out what the clues rule out. When someone has only one prize left, it is theirs — and nobody else can have it.',
    why: [
      'Draw a grid: people down the side, prizes along the top. Every clue puts a cross in a box ("Asha did not win the kite") or a tick ("Ben won the teddy").',
      'A tick does double work. If Ben has the teddy, nobody else can have the teddy, and Ben cannot have anything else — so a tick crosses out its whole row and its whole column.',
      'Then look for a row with only one empty box left. That person must have that prize, because everyone wins exactly one. Each answer you find crosses out more boxes, and the rest falls like dominoes.',
    ],
    alg: 'one per row, one per column: a row with one box left is that person\'s',
    ex: { names: ['Asha', 'Ben', 'Chen'], items: ['kite', 'teddy', 'yo-yo'], clues: [[0, 0, false], [1, 1, true]], ask: 0 },
    caseKey: 'clue',
    cases: [
      { label: 'A tick clue', note: 'A tick does double work: Ben has the teddy, so nobody else can — cross out his whole row and the teddy\'s whole column.',
        ex: { names: ['Asha', 'Ben', 'Chen'], items: ['kite', 'teddy', 'yo-yo'], clues: [[0, 0, false], [1, 1, true]], ask: 0 } },
      { label: 'Only crosses', note: 'No clue says who won what — but a row with one empty box left settles that person, and their prize is crossed out for everyone else.',
        ex: { names: ['Asha', 'Ben', 'Chen'], items: ['kite', 'teddy', 'yo-yo'], clues: [[0, 0, false], [0, 1, false], [1, 0, false]], ask: 2 } },
    ],
    gen(r, lv = 1) {
      const n = lv === 3 ? 4 : 3;
      for (let tries = 0; tries < 500; tries++) {
        const names = shuffle(KIDS, r).slice(0, n), items = shuffle(PRIZES, r).slice(0, n), perm = shuffle([...Array(n).keys()], r);
        const ask = int(0, n - 1, r);
        const facts = [];
        for (let p = 0; p < n; p++) for (let i = 0; i < n; i++) {
          if (i === perm[p]) { if (p !== ask && lv !== 2) facts.push([p, i, true]); } else facts.push([p, i, false]);
        }
        const pool = shuffle(facts, r), clues = [];
        for (const f of pool) {
          clues.push(f);
          const s = eliminate(n, clues);
          if (s && s.got.every((g) => g >= 0)) break;
        }
        const s = eliminate(n, clues);
        if (!s || s.got.some((g) => g < 0) || clues.length > n + 1 || s.order.indexOf(ask) < 1) continue;
        return this.q({ names, items, clues, ask });
      }
      return this.q(this.ex);
    },
    q({ names, items, clues, ask }) {
      const n = names.length, s = eliminate(n, clues), ans = items[s.got[ask]];
      const say = clues.map(([p, i, y]) => `${names[p]} ${y ? 'won' : 'did not win'} the ${items[i]}.`).join(' ');
      const text = `${list(names)} each won one prize: ${items.slice(0, -1).map((i) => 'the ' + i).join(', ')} or the ${items.at(-1)}. ${say} Which prize did ${names[ask]} win?`;
      return { names, items, clues, ask, clue: clues.some((c) => c[2]) ? 'tick' : 'crosses', text, expr: `(${BRUTE})(${n},${JSON.stringify(clues)},${ask},${JSON.stringify(items)})`, ans, choices: shuffle(items, seeded(text)) };
    },
    work({ names, items, clues, ask }) {
      const n = names.length, s = eliminate(n, clues), upto = s.order.slice(0, s.order.indexOf(ask) + 1).slice(-5);
      return upto.map((p) => ({ t: `${p === ask ? 'So' : 'First:'} which prize must ${names[p]} have?`, v: items[s.got[p]], choices: items }));
    },
    draw({ names, items, clues }) {
      const cw = 70, rh = 30, x0 = 70, y0 = 30; let s = '';
      items.forEach((it, i) => { s += text(x0 + i * cw + cw / 2, y0 - 10, it, 'dg-small'); });
      names.forEach((nm, p) => { s += text(x0 - 8, y0 + p * rh + 20, nm, 'dg-text', 'end');
        items.forEach((_, i) => { s += `<rect x="${x0 + i * cw}" y="${y0 + p * rh}" width="${cw}" height="${rh}" class="dg-blank"/>`; }); });
      return svg(x0 + items.length * cw + 6, y0 + names.length * rh + 6, s, `A logic grid: ${clues.length} clues`);
    },
  },

  /* ================================================ COUNTING ORDERS AND CHOICES
     list-outcomes multiplied the choices; these four count them when the
     choices run out one by one (orders) and when order stops mattering (groups). */
  {
    id: 'factorials', world: 'carnival', band: '11-14', title: 'Factorials',
    hook: 'How many ways can 5 friends line up for a photo? Now try 10 friends — without listing them.',
    idea: 'n! means n × (n − 1) × … × 2 × 1: multiply every whole number from n down to 1.',
    why: [
      'Line up 4 friends. Any of the 4 can stand first. Whoever is first, any of the 3 left can stand second, then either of the last 2, and the last friend has no choice at all. So there are 4 × 3 × 2 × 1 = 24 line-ups. That product turns up so often it has a short name: 4 factorial, written 4!.',
      'Every factorial holds the one below it: 5! = 5 × 4 × 3 × 2 × 1 = 5 × 4!. That is why 8! ÷ 6! is easy. 6! sits inside 8!, so it cancels, and only 8 × 7 = 56 is left. Never work out two huge numbers just to divide one by the other.',
      'Walk the pattern down: 4! = 24, and dividing by 4 gives 3! = 6; divide by 3 and 2! = 2; divide by 2 and 1! = 1. One more step, divide by 1, gives 0! = 1. It is not a rule someone made up — it is the only value that keeps the pattern going, and there really is exactly one way to line up nobody.',
    ],
    alg: 'n! = n × (n − 1) × … × 2 × 1 = n × (n − 1)! · 0! = 1',
    ex: { kind: 'fact', n: 5 },
    caseKey: 'kind',
    cases: [
      { label: 'Work out n!', note: 'Build it upwards: each factorial is the one before, times the next number. 2! = 2, 3! = 3 × 2!, 4! = 4 × 3!…',
        ex: { kind: 'fact', n: 5 } },
      { label: 'Divide: cancel first', note: '6! is hiding inside 8!, so it cancels. Only the numbers from 8 down to 7 are left to multiply.',
        ex: { kind: 'ratio', n: 8, m: 6 } },
      { label: 'Zero factorial', note: 'Walk the pattern down, dividing as you go: 1! ÷ 1 = 0!. So 0! is 1 — one way to line up nobody.',
        ex: { kind: 'zero', n: 3 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) return this.q({ kind: 'fact', n: int(3, 6, r) });
        if (lv === 2) { if (r() < 0.5) return this.q({ kind: 'fact', n: int(5, 8, r) }); const n = int(6, 11, r); return this.q({ kind: 'ratio', n, m: n - 2 }); }
        const k = pick(['fact', 'ratio', 'ratio', 'zero'], r);
        if (k === 'fact') return this.q({ kind: 'fact', n: int(6, 9, r) });
        if (k === 'zero') return this.q({ kind: 'zero', n: int(2, 6, r) });
        const n = int(8, 18, r); return this.q({ kind: 'ratio', n, m: n - int(2, 3, r) });
      });
    },
    q({ kind, n, m }) {
      if (kind === 'fact') return { kind, n, text: `Work out ${n}!`, say: `work out ${n} factorial`, expr: FACT_JS(n), ans: fact(n) };
      if (kind === 'ratio') return { kind, n, m, text: `Work out ${n}! ÷ ${m}!`, say: `${n} factorial divided by ${m} factorial`, expr: `${FACT_JS(n)}/${FACT_JS(m)}`, ans: fall(n, n - m) };
      return { kind, n, text: `Work out ${n}! + 0!`, say: `${n} factorial plus 0 factorial`, expr: `${FACT_JS(n)}+${FACT_JS(0)}`, ans: fact(n) + 1 };
    },
    work({ kind, n, m }) {
      const up = (to) => { const s = to > 5 ? [{ t: '5! = 5 × 4 × 3 × 2 × 1', v: 120 }] : [];
        for (let k = to > 5 ? 6 : 2; k <= to; k++) s.push({ t: k === 2 ? '2! = 2 × 1' : `${k}! = ${k} × ${k - 1}!`, v: fact(k) }); return s; };
      if (kind === 'fact') return up(n);
      if (kind === 'ratio') {
        const f = downFrom(n, n - m), s = [{ t: `${m}! cancels. How many numbers are left, counting down from ${n}?`, v: n - m }, { t: `${f[0]} × ${f[1]}`, v: f[0] * f[1] }];
        if (f.length > 2) s.push({ t: `${f[0] * f[1]} × ${f[2]}`, v: fall(n, 3) });
        return s;
      }
      return [...up(n).slice(-2), { t: '0! — walk the pattern down to it', v: 1 }, { t: `${fact(n)} + 1`, v: fact(n) + 1 }];
    },
    draw({ kind, n, m }) {
      if (kind === 'zero') return ladder();
      if (kind === 'ratio') return chain([...downFrom(n, n - m), `${m}!`], `${n}! written as ${downFrom(n, n - m).join(' × ')} × ${m}!, divided by ${m}!`, `${m}!`);
      return chain(downFrom(n, n), `${n}! = ${downFrom(n, n).join(' × ')}`);
    },
  },
  {
    id: 'arrange-all', world: 'carnival', band: '11-14', title: 'Putting things in order',
    hook: '6 friends queue for the Big Wheel. How many different orders — and what if Pip insists on going first?',
    idea: 'Fill the places one at a time: n choices for the first, n − 1 for the next, down to 1. A place that is already decided has only 1 choice.',
    why: [
      'Think of a row of empty places. The first place can take any of the n things. Once it is filled, the second place has n − 1 left — and that is true whichever thing went first, so every first choice brings the same number of second choices. Multiply all the way down: n × (n − 1) × … × 1 = n!.',
      'If Pip must be at the front, the first place has only 1 choice. Just the other n − 1 are free to move, so there are (n − 1)! orders. Check it with 3 friends: with Pip in front, only the other two can swap — 2 orders, and 2! = 2.',
      'If the first place must go to one of a few — say one of 2 sprinters in a team of 5 — the first place has 2 choices, and after it the other 4 can go in any order: 2 × 4! = 48. Always fill the fussy place first.',
    ],
    alg: 'n things in a row: n! · one place fixed: (n − 1)! · first place from k of them: k × (n − 1)!',
    ex: { kind: 'all', n: 4, c: 0 },
    caseKey: 'kind',
    cases: [
      { label: 'Everyone in a row', note: 'n choices for the first place, one fewer for each place after it, down to 1: that is n!.',
        ex: { kind: 'all', n: 4, c: 0 } },
      { label: 'One place fixed', note: 'Pip is at the front already, so that place has 1 choice. Only the others move: (n − 1)!.',
        ex: { kind: 'fixed', n: 5, c: 0 } },
      { label: 'First from a few', note: 'Fill the fussy place first: 2 sprinters could run first. Then the rest go in any order.',
        ex: { kind: 'first', n: 5, k: 2 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) return this.q({ kind: 'all', n: int(3, 5, r), c: int(0, 2, r) });
        if (lv === 2) return this.q({ kind: r() < 0.5 ? 'all' : 'fixed', n: int(4, 7, r), c: int(0, 2, r) });
        const kind = pick(['all', 'fixed', 'first'], r), n = int(5, 8, r);
        return this.q({ kind, n, c: int(0, 2, r), k: int(2, n - 2, r) });
      });
    },
    q({ kind, n, c = 0, k }) {
      if (kind === 'first') return { kind, n, k, text: `A relay team has ${n} runners, and ${k} of them are sprinters. A sprinter must run first. In how many different orders can the team run?`, expr: `${FACT_JS(n)}*${k}/${n}`, ans: k * fact(n - 1) };
      const T = kind === 'all'
        ? [`${n} friends queue for the Big Wheel. In how many different orders can they stand?`, `${n} different prizes go in a row on the hoopla shelf. In how many different orders can they go?`, `${n} different flags hang in a line over the carnival gate. In how many different orders can they hang?`]
        : [`${n} friends queue for the dodgems, and Pip must be at the front. In how many different orders can they stand?`, `${n} different prizes go in a row on the shelf, and the teddy must go at the left end. How many different orders?`, `${n} different flags hang in a line, and the red one must be first. How many different orders?`];
      return { kind, n, c, text: T[c], expr: kind === 'all' ? FACT_JS(n) : `${FACT_JS(n)}/${n}`, ans: kind === 'all' ? fact(n) : fact(n - 1) };
    },
    work({ kind, n, k }) {
      if (kind === 'fixed') return [{ t: 'The first place is decided. How many are left to arrange?', v: n - 1 }, { t: `Arrange them all: ${n - 1}! = ${downFrom(n - 1, n - 1).join(' × ')}`, v: fact(n - 1) }];
      if (kind === 'first') return [{ t: 'How many could run first?', v: k }, { t: `The other ${n - 1} in any order: ${n - 1}!`, v: fact(n - 1) }, { t: `${k} × ${fact(n - 1)}`, v: k * fact(n - 1) }];
      return [{ t: 'Choices for the first place', v: n }, { t: `The other ${n - 1} in any order: ${n - 1}!`, v: fact(n - 1) }, { t: `${n} × ${fact(n - 1)}`, v: fact(n) }];
    },
    draw({ kind, n, k }) { return lineup(n, { fixed: kind === 'fixed', first: kind === 'first' ? k : 0 }); },
  },
  {
    id: 'permutations', world: 'carnival', band: '11-14', title: 'Permutations: order matters',
    hook: '8 runners in the final. How many ways can gold, silver and bronze be given out?',
    idea: 'When order matters and nothing repeats, count the choices for each place and multiply: n × (n − 1) × … for r places.',
    why: [
      'Draw three places: gold, silver, bronze. Any of the 8 runners could win gold. Whoever does, 7 are left for silver, then 6 for bronze. So 8 × 7 × 6 = 336 ways. Stop after 3 places — the other 5 runners get no medal, so their order does not count.',
      'That is 8! with its tail cut off: 8 × 7 × 6 = 8! ÷ 5!. Choosing r things from n in order is written ⁿPᵣ = n! ÷ (n − r)!, and the ÷ (n − r)! simply removes the places nobody fills.',
      'Watch for repeats. A padlock with 3 dials, each 0 to 9, can show 777 — so every dial keeps all 10 choices: 10 × 10 × 10 = 1,000 codes. With no repeats allowed, each place has one fewer: 10 × 9 × 8 = 720. Always ask first: can a thing be used twice?',
    ],
    alg: 'ⁿPᵣ = n × (n − 1) × … (r factors) = n! ÷ (n − r)! · with repeats: n × n × … = nʳ',
    ex: { kind: 'order', n: 8, r: 3, c: 1 },
    caseKey: 'kind',
    cases: [
      { label: 'Order, no repeats', note: 'Gold, silver and bronze are different places, and nobody wins two medals: 8, then 7, then 6 choices.',
        ex: { kind: 'order', n: 8, r: 3, c: 1 } },
      { label: 'Repeats allowed', note: 'A digit can come back, so every place keeps ALL its choices: 10 × 10 × 10, not 10 × 9 × 8.',
        ex: { kind: 'repeat', n: 10, r: 3, c: 0 } },
      { label: 'The ⁿPᵣ shorthand', note: '⁷P₃ means "choose 3 of 7, in order": start at 7 and multiply 3 numbers going down.',
        ex: { kind: 'notation', n: 7, r: 3 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) return this.q({ kind: 'order', n: int(4, 9, r), r: 2, c: 0 });
        if (lv === 2) {
          if (r() < 0.3) return this.q({ kind: 'repeat', n: 10, r: int(2, 4, r), c: 0 });
          const c = int(1, 2, r); return this.q({ kind: 'order', n: c === 2 ? int(5, 9, r) : int(5, 10, r), r: 3, c });
        }
        const kind = pick(['order', 'repeat', 'notation'], r);
        if (kind === 'repeat') { const c = int(0, 2, r); return this.q({ kind, n: c === 0 ? 10 : int(3, 6, r), r: int(2, 4, r), c }); }
        if (kind === 'notation') { const n = int(6, 12, r); return this.q({ kind, n, r: int(2, 4, r) }); }
        const c = int(0, 2, r); return this.q({ kind, n: c === 2 ? int(6, 9, r) : int(6, 12, r), r: c === 0 ? 2 : c === 1 ? 3 : 4, c });
      });
    },
    q({ kind, n, r, c = 0 }) {
      if (kind === 'notation') return { kind, n, r, text: `Work out ${nP(n, r)}`, say: `${n} P ${r}: the number of ways to choose ${r} of ${n} in order`, expr: `${FACT_JS(n)}/${FACT_JS(n - r)}`, ans: fall(n, r) };
      if (kind === 'repeat') {
        const L = 'ABCDEF'.slice(0, n).split('').join(', ');
        const T = [`A padlock has ${r} dials, each showing the digits 0 to 9. How many different codes can it show?`,
          `A code is ${r} letters long, using only the letters ${L}. A letter may be used more than once. How many codes are there?`,
          `A ${r}-digit code uses only the digits 1 to ${n}, and a digit may be used more than once. How many codes are there?`];
        return { kind, n, r, c, text: T[c], expr: `Array(${r}).fill(${n}).reduce((a,b)=>a*b,1)`, ans: n ** r };
      }
      const T = [`${n} children are in the quiz club. How many ways can a captain and a vice-captain be chosen?`,
        `${n} runners are in the final. How many ways can the gold, silver and bronze medals be given out?`,
        `A ${r}-digit code uses only the digits 1 to ${n}, and no digit is used twice. How many codes are there?`];
      return { kind, n, r, c, text: T[c], expr: `${FACT_JS(n)}/${FACT_JS(n - r)}`, ans: fall(n, r) };
    },
    work({ kind, n, r, c }) {
      if (kind === 'repeat') return [{ t: 'Choices for each place — and a repeat is allowed', v: n }, { t: 'How many places?', v: r }, { t: `${Array(r).fill(n).join(' × ')}`, v: n ** r }];
      const names = kind === 'order' && c === 0 ? ['captain', 'vice-captain'] : kind === 'order' && c === 1 ? ['gold', 'silver', 'bronze'] : PLACE.map((p) => `the ${p} place`);
      const s = [{ t: `Choices for ${names[0]}`, v: n }];
      for (let i = 1; i < r; i++) s.push({ t: `Then ${names[i]}: one fewer to choose from`, v: n - i });
      s.push({ t: downFrom(n, r).join(' × '), v: fall(n, r) });
      return s;
    },
    draw({ kind, n, r, c }) {
      if (kind === 'order' && c === 0) return slotsPic(['captain', 'vice-captain'], `${n} to choose from · nobody twice`);
      if (kind === 'order' && c === 1) return slotsPic(['gold', 'silver', 'bronze'], `${n} runners · nobody wins twice`);
      if (kind === 'repeat') return slotsPic(PLACE.slice(0, r), 'repeats allowed');
      return slotsPic(PLACE.slice(0, r), `${n} to choose from · no repeats`);
    },
  },
  {
    id: 'combinations', world: 'carnival', band: '11-14', title: 'Combinations: order doesn\'t matter',
    hook: '7 players, a team of 3. How many different teams — and why are there fewer than ways to give out 3 medals?',
    idea: 'Count as if order mattered, then divide by r! — the number of orders each group was counted in.',
    why: [
      'A team of Asha, Ben and Chen is the same team whichever order you pick them in. Count as if order mattered: 7 × 6 × 5 = 210. But every team of 3 has been counted once for each of its orders — ABC, ACB, BAC, BCA, CAB, CBA: 3! = 6 of them. So there are 210 ÷ 6 = 35 teams.',
      'That is ⁿCᵣ = ⁿPᵣ ÷ r! = n! ÷ (r! × (n − r)!). Handshakes are the r = 2 case you have met before: n × (n − 1) counts every pair twice, once from each end, so halve it.',
      'Choosing who is IN also chooses who is OUT. Picking 8 of 10 for a team is the same as picking the 2 to leave out, so ¹⁰C₈ = ¹⁰C₂ = 10 × 9 ÷ 2 = 45. Count the smaller side. And a chance can be counted this way too: the pairs you want, out of all the pairs.',
    ],
    alg: 'ⁿCᵣ = ⁿPᵣ ÷ r! = n! ÷ (r! × (n − r)!) · ⁿCᵣ = ⁿCₙ₋ᵣ',
    ex: { kind: 'group', n: 7, r: 3, c: 0 },
    caseKey: 'kind',
    cases: [
      { label: 'Pairs: halve it', note: 'Picking Asha then Ben gives the same pair as Ben then Asha. Count in order, then halve.',
        ex: { kind: 'pairs', n: 6, c: 0 } },
      { label: 'A group: ÷ r!', note: 'Count in order, then divide by the number of orders one team can be picked in: 3! = 6.',
        ex: { kind: 'group', n: 7, r: 3, c: 0 } },
      { label: 'Choose who stays out', note: 'Picking 8 to play is picking 2 to sit out — the same number of ways, and far quicker to count.',
        ex: { kind: 'leave', n: 10, r: 8 } },
      { label: 'A chance, by counting', note: 'Count the pairs you want, then all the pairs. The chance is one over the other, as a fraction.',
        ex: { kind: 'prob', y: 4, b: 3 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) return this.q({ kind: 'pairs', n: int(4, 10, r), c: int(0, 2, r) });
        if (lv === 2) return r() < 0.35 ? this.q({ kind: 'pairs', n: int(8, 16, r), c: int(0, 2, r) }) : this.q({ kind: 'group', n: int(5, 9, r), r: 3, c: int(0, 2, r) });
        const kind = pick(['group', 'leave', 'prob'], r);
        if (kind === 'group') { const R = int(3, 4, r); return this.q({ kind, n: int(R + 3, 12, r), r: R, c: int(0, 2, r) }); }
        if (kind === 'leave') { const n = int(8, 15, r); return this.q({ kind, n, r: n - int(2, 3, r) }); }
        return this.q({ kind, y: int(2, 6, r), b: int(1, 6, r) });
      });
    },
    q({ kind, n, r, c = 0, y, b }) {
      if (kind === 'prob') {
        const N = y + b;
        return { kind, y, b, text: `A drawer holds ${y} yellow and ${b} blue socks. You pull out 2 without looking. What is the chance both are yellow?`,
          expr: `${y}/${N}*${y - 1}/${N - 1}`, ans: `${fall(y, 2) / 2}/${fall(N, 2) / 2}`, frac: true, keys: ['/'] };
      }
      if (kind === 'pairs') {
        const T = [`${n} friends want to enter the three-legged race. How many different pairs could they make?`,
          `${n} teams are in a football league, and every team plays every other team once. How many matches?`,
          `The ice-cream stall has ${n} flavours. You choose 2 different scoops for a cup. How many different cups?`];
        return { kind, n, c, text: T[c], expr: PASCAL_JS(n, 2), ans: fall(n, 2) / 2 };
      }
      if (kind === 'leave') return { kind, n, r, text: `${n} children want to play, but the team has ${r} places. How many different teams could be picked?`, expr: PASCAL_JS(n, r), ans: fall(n, n - r) / fact(n - r) };
      const T = [`How many different teams of ${r} can be picked from ${n} players?`,
        `A pizza has ${r} different toppings, chosen from ${n}. How many different pizzas can be made?`,
        `You have tokens for ${r} rides, and there are ${n} different rides. Each ride once — how many different choices of rides?`];
      return { kind, n, r, c, text: T[c], expr: PASCAL_JS(n, r), ans: fall(n, r) / fact(r) };
    },
    work({ kind, n, r, y, b }) {
      if (kind === 'prob') { const N = y + b, want = fall(y, 2) / 2, all = fall(N, 2) / 2;
        return [{ t: `Pairs of yellow socks: ${y} × ${y - 1} ÷ 2`, v: want }, { t: `All the pairs: ${N} × ${N - 1} ÷ 2`, v: all }, { t: 'The chance, as a fraction', v: `${want}/${all}` }]; }
      if (kind === 'pairs') return [{ t: `In order: ${n} × ${n - 1}`, v: fall(n, 2) }, { t: 'Each pair was counted twice — halve it', v: fall(n, 2) / 2 }];
      const k = kind === 'leave' ? n - r : r, s = [];
      if (kind === 'leave') s.push({ t: `Choosing ${r} to play is choosing who sits out. How many sit out?`, v: k });
      s.push({ t: `Pick ${k} in order: ${downFrom(n, k).join(' × ')}`, v: fall(n, k) });
      s.push({ t: `Orders of one group of ${k}: ${k}!`, v: fact(k) });
      s.push({ t: `${fall(n, k)} ÷ ${fact(k)}`, v: fall(n, k) / fact(k) });
      return s;
    },
    draw({ kind, n, r, y, b }) {
      if (kind === 'prob') return bag([...Array(y).fill('yellow'), ...Array(b).fill('blue')]);
      return ringGroup(n, kind === 'pairs' ? 2 : r);
    },
  },
];

function apply(v, [o, n]) { return o === '×' ? v * n : o === '÷' ? v / n : o === '+' ? v + n : v - n; }

/* ------------------------------------------------------------ stories */

