/* logic.js — The Logic Labyrinth: reasoning about what MUST be true.

   The second of the Contest Hall's strategy worlds (docs/PAPER-CONTRACT.md).
   Each stop is one tool for a problem that has no routine method: odd and
   even, boxes and pigeons, worst luck, knights and liars, listing in order,
   things that never change, the week's cycle, column sums, remainders and
   the divisibility tests.

   Every question is built so that it has exactly ONE answer. Where that is not
   obvious, gen proves it by brute force and re-rolls; `expr` then finds the
   answer a second, independent way (a search, a simulation, or the calendar
   itself) and returns NaN or 'none' if the answer is not unique — so a puzzle
   with two answers fails the test instead of reaching a child. */

import { int, pick, shuffle } from '../rand.js';
import * as kit from './kit.js';

export const WORLD = {
  id: 'logic', name: 'The Logic Labyrinth', short: 'Labyrinth', band: '8-10', track: 'contest',
  blurb: 'Puzzles where you prove what MUST be true — odd and even, socks in the dark, knights and liars.',
  tint: '#EEEAF8', ink: '#3B2A7A', glyph: '🧩',
};

/* ------------------------------------------------------------------ helpers */

const shows = (q) => !q.choices && String(q.ans).length > 1 && q.text.split(/[^0-9./]/).includes(String(q.ans));
function fresh(make) { let q; for (let i = 0; i < 80; i++) { q = make(); if (!shows(q)) return q; } return q; }
const E = kit.esc;
const M = (n) => (n < 0 ? `−${-n}` : `${n}`);                      // a real minus sign
const TX = (x, y, s, cls = 'dg-small', a = 'middle') => `<text x="${x}" y="${y}" class="${cls}" text-anchor="${a}">${E(s)}</text>`;
const YN = ['Yes', 'No'], OE = ['Odd', 'Even'];
const par = (n) => (Math.abs(n) % 2 ? 'Odd' : 'Even');
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a * b) / gcd(a, b);
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const listAnd = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
const listOr = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} or ${xs.at(-1)}`);

/* A row of cards; null is the empty box. */
function cards(items, label) {
  const u = 40, W = items.length * (u + 6) + 10; let s = '';
  items.forEach((d, i) => {
    const x = 6 + i * (u + 6);
    s += d === null ? `<rect x="${x}" y="8" width="${u}" height="48" rx="6" class="dg-fill2"/>${TX(x + u / 2, 40, '?', 'dg-accent')}`
      : `<rect x="${x}" y="8" width="${u}" height="48" rx="6" class="dg-blank"/>${TX(x + u / 2, 40, d, 'dg-text')}`;
  });
  return kit.svg(W, 64, s, label);
}
/* A row of k pigeonholes, optionally labelled. */
function holes(k, labels = []) {
  const n = Math.min(k, 15), u = Math.min(40, Math.floor(340 / n) - 4), W = n * (u + 4) + 8; let s = '';
  for (let i = 0; i < n; i++) {
    const x = 4 + i * (u + 4);
    s += `<rect x="${x}" y="8" width="${u}" height="${u}" rx="4" class="dg-blank"/>`;
    if (labels[i]) s += TX(x + u / 2, u + 26, labels[i]);
  }
  if (k > n) s += TX(W - 4, u + 26, `… ${k} in all`, 'dg-small', 'end');
  return kit.svg(W, u + 34, s, `${k} boxes`);
}

/* ================================================================== parity */

const frogExpr = (n, T, grow) => `(()=>{let s=new Set([0]);for(let i=1;i<=${n};i++){const t=new Set();for(const p of s){t.add(p+${grow ? 'i' : '1'});t.add(p-${grow ? 'i' : '1'});}s=t;}return s.has(${T})?'Yes':'No';})()`;

const parity = {
  id: 'parity', world: 'logic', band: '8-10', title: 'Odd and even decide it',
  hook: 'A frog starts on 0 and makes 7 jumps, each one step left or right. Can it end on 0?',
  idea: 'Forget how big the numbers are and ask only: odd or even? If the two sides cannot have the same parity, the answer is no — without trying a single way.',
  why: [
    'Every whole number is odd or even, and adding follows three rules: even + even = even, odd + odd = even, odd + even = odd. So a long sum is odd exactly when it holds an odd count of odd numbers. The even numbers never change anything.',
    'Now the frog. It starts on 0, which is even. Every one-step jump moves it from even to odd, or from odd to even — like a light switch. After 7 flips the switch is on "odd", so the frog can never be on 0, however it jumps. You did not try all 128 ways of jumping: parity said no to every one of them at once.',
    'When the jumps are 1, 2, 3, … steps long, turning one jump round (left instead of right) moves the landing spot by twice that jump — an even number. So the spot always has the same parity as 1 + 2 + 3 + …, the total if every jump went right. Wrong parity means no way at all; right parity (and near enough) means there is a way.',
  ],
  alg: 'odd + odd = even · odd + even = odd · a sum is odd ⇔ it has an odd count of odd terms',
  ex: { kind: 'frog1', n: 7, T: 0 },
  caseKey: 'kind',
  cases: [
    { label: 'Odd or even total', note: 'Count only the odd numbers. An even count of them makes an even total; an odd count makes an odd total.',
      ex: { kind: 'sum', xs: [13, 8, 21, 7, 4] } },
    { label: 'Steps of one', note: 'Each step flips the frog between odd and even, so after an odd number of steps it must stand on an odd number.',
      ex: { kind: 'frog1', n: 7, T: 0 } },
    { label: 'Jumps of 1, 2, 3, …', note: 'Turning a jump round moves the spot by an even amount, so the spot always has the parity of 1 + 2 + 3 + … .',
      ex: { kind: 'frog', n: 6, T: 4 } },
  ],
  gen(r, lv = 1) {
    if (r() < 0.35) {
      const k = lv === 1 ? int(4, 5, r) : lv === 2 ? int(6, 8, r) : int(8, 11, r), top = lv === 1 ? 30 : lv === 2 ? 99 : 999;
      return this.q({ kind: 'sum', xs: Array.from({ length: k }, () => int(1, top, r)) });
    }
    if (lv < 3) { const n = lv === 1 ? int(3, 9, r) : int(8, 20, r); return this.q({ kind: 'frog1', n, T: int(-n, n, r) }); }
    const n = int(4, 10, r), S = (n * (n + 1)) / 2;
    return this.q({ kind: 'frog', n, T: int(-Math.min(S, 30), Math.min(S, 30), r) });
  },
  q(o) {
    if (o.kind === 'sum') return { ...o, text: `Is ${o.xs.join(' + ')} odd or even?`, choices: OE,
      ans: o.xs.filter((x) => x % 2).length % 2 ? 'Odd' : 'Even', expr: `(${o.xs.join('+')})%2?'Odd':'Even'` };
    if (o.kind === 'frog1') return { ...o, text: `A frog starts on 0 and makes exactly ${o.n} jumps. Each jump is 1 step left or 1 step right. Can it end on ${M(o.T)}?`,
      choices: YN, ans: par(o.n) === par(o.T) ? 'Yes' : 'No', expr: frogExpr(o.n, o.T, false) };
    const S = (o.n * (o.n + 1)) / 2;
    return { ...o, text: `A frog starts on 0 and makes ${o.n} jumps: the 1st is 1 step long, the 2nd is 2 steps, and so on up to ${o.n} steps. Each jump goes left or right. Can it end on ${M(o.T)}?`,
      choices: YN, ans: par(S) === par(o.T) && Math.abs(o.T) <= S ? 'Yes' : 'No', expr: frogExpr(o.n, o.T, true) };
  },
  work(o) {
    if (o.kind === 'sum') return [{ t: 'How many of the numbers are odd?', v: o.xs.filter((x) => x % 2).length },
      { t: 'An even count of odd numbers makes even; an odd count makes odd. So the total is', v: o.ans, choices: OE }];
    if (o.kind === 'frog1') return [{ t: `Each jump flips odd ↔ even, starting on 0 (even). After ${o.n} jumps the frog is on a number that is`, v: par(o.n), choices: OE },
      { t: `${M(o.T)} is`, v: par(o.T), choices: OE }, { t: 'Do they match — can it end there?', v: o.ans, choices: YN }];
    const S = (o.n * (o.n + 1)) / 2;
    return [{ t: `If every jump went right: 1 + 2 + … + ${o.n}`, v: S },
      { t: 'Turning a jump round moves the spot by an even number, so the spot is always', v: par(S), choices: OE },
      { t: `${M(o.T)} is`, v: par(o.T), choices: OE }, { t: 'So can it end there?', v: o.ans, choices: YN }];
  },
  draw(o) {
    if (o.kind === 'sum') {
      const n = o.xs.length, u = Math.min(34, Math.floor(340 / n)); let s = '';
      o.xs.forEach((x, i) => { s += `<rect x="${4 + i * u}" y="6" width="${u - 4}" height="34" rx="5" class="dg-blank"/>` + TX(4 + i * u + (u - 4) / 2, 28, x); });
      return kit.svg(n * u + 8, 46, s, `The numbers ${o.xs.join(', ')}`);
    }
    const R = Math.max(Math.abs(o.T), 5), step = R <= 10 ? 1 : R <= 30 ? 5 : 10, a = -Math.ceil(R / step) * step;
    const marks = o.T === 0 ? { 0: 'start · ?' } : { 0: 'start', [o.T]: '?' };
    return kit.numberLine(a, -a, step, marks);
  },
};

/* ================================================================== worst case */

const COLS = ['red', 'blue', 'green', 'yellow', 'white', 'black'];
const worstExpr = (cs, bad) => `(()=>{const c=[${cs}];let best=0;const go=(i,x)=>{if(i===c.length){if(${bad})best=Math.max(best,x.reduce((a,b)=>a+b,0));return;}for(let v=0;v<=c[i];v++)go(i+1,[...x,v]);};go(0,[]);return best+1;})()`;

const worstCase = {
  id: 'worst-case', world: 'logic', band: '8-10', title: 'Worst luck first',
  hook: 'A drawer holds 5 red, 7 blue and 4 green socks. In the dark, how many must you take to be SURE of a pair?',
  idea: 'To be SURE, imagine the unluckiest draw there could be — every sock that does not help comes out first. Then one more is guaranteed to do it.',
  why: [
    '"Sure" is a strong word. Lucky draws do not count: two socks might match, but they might not. So ask the opposite question — how many socks could I take and STILL not have a pair? Then one more is enough, every time.',
    'With red, blue and green, the unluckiest start is one red, one blue, one green: three socks and no pair. The fourth sock has to be red, blue or green, and whichever it is, it matches. So 4 is sure, and 3 is not. Notice the 5, 7 and 4 did not matter at all!',
    'The same thinking works for any goal. Want 2 blue ones? Worst luck takes out every sock that is not blue first, then the blues. Want one of every colour? Worst luck empties the two biggest piles before the last colour shows up. Find the worst, then add one.',
  ],
  alg: 'sure = (the biggest draw that still fails) + 1',
  ex: { kind: 'pair', cs: [5, 7, 4] },
  caseKey: 'kind',
  cases: [
    { label: 'A pair of one colour', note: 'Worst luck is one of each colour. The next one must match — so it is the number of colours, plus one.',
      ex: { kind: 'pair', cs: [5, 7, 4] } },
    { label: 'Some of one colour', note: 'Worst luck brings out every one of the OTHER colours first. Only then do the ones you want arrive.',
      ex: { kind: 'colour', cs: [6, 3, 5], j: 1, k: 2 } },
    { label: 'Several of the same', note: 'Worst luck takes just under the target from each pile — but a small pile can only give what it has. Watch for it.',
      ex: { kind: 'ksame', cs: [8, 2, 6], k: 4 } },
    { label: 'One of every colour', note: 'Worst luck empties every pile except the smallest one first. The next marble has to be the colour still missing.',
      ex: { kind: 'each', cs: [6, 3, 5] } },
  ],
  gen(r, lv = 1) {
    return fresh(() => {
      if (lv === 1) { const c = int(2, 3, r); return this.q({ kind: 'pair', cs: Array.from({ length: c }, () => int(3, 9, r)) }); }
      if (lv === 2) {
        const c = int(3, 4, r), cs = Array.from({ length: c }, () => int(2, 10, r)), w = r();
        if (w < 0.25) return this.q({ kind: 'pair', cs });
        if (w < 0.65) { const j = int(0, c - 1, r); cs[j] = Math.max(cs[j], 3); return this.q({ kind: 'colour', cs, j, k: int(1, Math.min(3, cs[j]), r) }); }
        const k = 3, cs2 = cs.map((x) => Math.max(x, 2)); cs2[int(0, c - 1, r)] = int(k, 10, r); return this.q({ kind: 'ksame', cs: cs2, k });
      }
      const c = int(3, 4, r);
      if (r() < 0.6) {                                           // the trap: a pile too small to give k − 1
        const k = int(3, 5, r), cs = Array.from({ length: c }, () => int(k, 12, r));
        cs[int(0, c - 1, r)] = int(1, k - 2, r);
        return this.q({ kind: 'ksame', cs, k });
      }
      if (r() < 0.5) { const cs = Array.from({ length: c }, () => int(2, 12, r)), j = int(0, c - 1, r); cs[j] = Math.max(cs[j], 4); return this.q({ kind: 'colour', cs, j, k: int(2, Math.min(5, cs[j]), r) }); }
      return this.q({ kind: 'each', cs: Array.from({ length: c }, () => int(2, 12, r)) });
    });
  },
  q(o) {
    const { cs } = o, c = cs.length, tot = sum(cs);
    const thing = o.kind === 'pair' ? 'socks' : 'marbles', where = o.kind === 'pair' ? 'A drawer holds' : 'A bag holds';
    const have = `${where} ${listAnd(cs.map((x, i) => `${x} ${COLS[i]}`))} ${thing}.`;
    let goal, ans, bad;
    if (o.kind === 'pair') { goal = 'two of the same colour'; ans = c + 1; bad = 'x.every((v)=>v<=1)'; }
    else if (o.kind === 'ksame') { goal = `${o.k} of the same colour`; ans = sum(cs.map((x) => Math.min(x, o.k - 1))) + 1; bad = `x.every((v)=>v<=${o.k - 1})`; }
    else if (o.kind === 'colour') { goal = o.k === 1 ? `at least one ${COLS[o.j]} one` : `at least ${o.k} ${COLS[o.j]} ones`; ans = tot - cs[o.j] + o.k; bad = `x[${o.j}]<=${o.k - 1}`; }
    else { goal = 'at least one of every colour'; ans = tot - Math.min(...cs) + 1; bad = 'x.some((v)=>v===0)'; }
    return { ...o, text: `${have} In the dark, how many must you take out to be SURE of getting ${goal}?`, ans, expr: worstExpr(cs, bad) };
  },
  work(o) {
    const { cs } = o, c = cs.length, tot = sum(cs);
    if (o.kind === 'pair') return [{ t: 'Worst luck: one of each colour first. How many is that?', v: c }, { t: 'The next one must match one of them', v: c + 1 }];
    if (o.kind === 'ksame') {
      const w = sum(cs.map((x) => Math.min(x, o.k - 1)));
      return [{ t: `Worst luck: ${o.k - 1} of each colour — but a pile with fewer gives only what it has. How many altogether?`, v: w }, { t: 'One more must make it', v: w + 1 }];
    }
    if (o.kind === 'colour') return [{ t: `Worst luck: every marble that is not ${COLS[o.j]} comes out first. How many is that?`, v: tot - cs[o.j] }, { t: `Then ${o.k} ${COLS[o.j]}`, v: o.ans }];
    const mn = Math.min(...cs);
    return [{ t: 'Which pile is smallest? How many marbles are in it?', v: mn }, { t: 'Worst luck: every other marble comes out first', v: tot - mn }, { t: 'The next one has to be the missing colour', v: tot - mn + 1 }];
  },
  draw(o) {
    const u = 15; let s = '';
    o.cs.forEach((n, i) => {
      const x0 = 14 + i * 84;
      for (let j = 0; j < n; j++) s += `<circle cx="${x0 + (j % 4) * u + 8}" cy="${150 - Math.floor(j / 4) * u}" r="6" class="${o.kind === 'colour' && i === o.j ? 'dg-dot' : 'dg-dot2'}"/>`;
      s += TX(x0 + 30, 178, `${n} ${COLS[i]}`);
    });
    return kit.svg(o.cs.length * 84 + 14, 188, `<rect x="4" y="90" width="${o.cs.length * 84 + 6}" height="72" rx="8" class="dg-blank"/>` + s, `Piles of ${listAnd(o.cs.map((n, i) => `${n} ${COLS[i]}`))}`);
  },
};

/* ================================================================== pigeonhole */

const HOLE = [
  { k: 7, what: 'were born on the same day of the week', who: 'children', labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'] },
  { k: 12, what: 'have birthdays in the same month', who: 'people', labels: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] },
  { k: 6, what: 'rolled the same number on one ordinary dice', who: 'players', labels: ['1', '2', '3', '4', '5', '6'] },
  { k: 10, what: 'have house numbers ending in the same digit', who: 'friends', labels: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] },
  { k: 26, what: 'have first names starting with the same letter (A to Z)', who: 'pupils', labels: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'] },
];
const SHARE = [['apples', 'baskets', 'basket'], ['pupils', 'classrooms', 'classroom'], ['pigeons', 'holes', 'hole'], ['letters', 'postboxes', 'postbox'], ['books', 'shelves', 'shelf']];

const pigeonhole = {
  id: 'pigeonhole', world: 'logic', band: '8-10', title: 'Pigeons and holes',
  hook: 'How many children must be in a room to be SURE two were born on the same day of the week?',
  idea: 'Put things into boxes. If there are more things than boxes, some box must hold two — and to force m in one box you need (m − 1) in every box, plus one more.',
  why: [
    'Imagine 8 pigeons flying into 7 holes. Could every hole have at most one pigeon? Seven holes take only 7 pigeons that way — the 8th has nowhere to go but a hole that is already taken. So some hole MUST have two. Nobody said which hole; we only know it must happen.',
    'The days of the week are 7 holes. With 7 children, each could have a different day — so 7 is not enough to be sure. With 8, two must share. To be sure THREE share a day, fill every hole with 2 first (14 children, still no three) — then the 15th makes three.',
    'It works backwards too. Share 50 apples among 7 baskets as evenly as you can: 7 each is only 49, so one basket gets an 8th. However you share them, some basket holds at least 8 — the evenest sharing is the best you can do, and even that has a basket of 8.',
  ],
  alg: 'to force m in one of k boxes: k × (m − 1) + 1 things · n things in k boxes: some box has at least ⌈n ÷ k⌉',
  ex: { kind: 'sure', h: 0, m: 2 },
  caseKey: 'kind',
  cases: [
    { label: 'How many to be sure', note: 'Fill every box with one fewer than you want — the unluckiest spread. One more thing must tip a box over.',
      ex: { kind: 'sure', h: 0, m: 2 } },
    { label: 'How full must a box be', note: 'Share as evenly as you can. Anything left over has to go somewhere, so one box gets one more than the even share.',
      ex: { kind: 'most', s: 0, n: 50, k: 7 } },
  ],
  gen(r, lv = 1) {
    return fresh(() => {
      if (r() < 0.5) {
        const h = lv === 1 ? int(0, 2, r) : int(0, HOLE.length - 1, r), m = lv === 1 ? 2 : lv === 2 ? int(2, 4, r) : int(3, 9, r);
        return this.q({ kind: 'sure', h, m });
      }
      const k = lv === 1 ? int(3, 5, r) : lv === 2 ? int(3, 9, r) : int(6, 15, r);
      let n = lv === 1 ? int(10, 30, r) : lv === 2 ? int(20, 60, r) : int(50, 200, r); if (n % k === 0) n++;
      return this.q({ kind: 'most', s: int(0, SHARE.length - 1, r), n, k });
    });
  },
  q(o) {
    if (o.kind === 'sure') {
      const H = HOLE[o.h];
      return { ...o, text: `How many ${H.who} must there be to be SURE that at least ${o.m} of them ${H.what}?`, ans: H.k * (o.m - 1) + 1,
        expr: `(()=>{const b=Array(${H.k}).fill(0);let n=0;while(Math.max(...b)<${o.m}){b[b.indexOf(Math.min(...b))]++;n++;}return n;})()` };
    }
    const [things, boxes, box] = SHARE[o.s];
    return { ...o, text: `${o.n} ${things} go into ${o.k} ${boxes}. However they are shared out, some ${box} must get at least how many?`, ans: Math.ceil(o.n / o.k),
      expr: `(()=>{const b=Array(${o.k}).fill(0);for(let i=0;i<${o.n};i++)b[i%${o.k}]++;return Math.max(...b);})()` };
  },
  work(o) {
    if (o.kind === 'sure') {
      const H = HOLE[o.h];
      return [{ t: 'How many boxes are there (different ways to fall)?', v: H.k }, { t: `Worst luck: ${o.m - 1} in every box and still not ${o.m}. How many is that?`, v: H.k * (o.m - 1) }, { t: 'One more forces it', v: o.ans }];
    }
    return [{ t: `${o.n} ÷ ${o.k}: the even share`, v: Math.floor(o.n / o.k) }, { t: 'How many are left over?', v: o.n % o.k }, { t: 'A leftover has to go in some box, so some box has at least', v: o.ans }];
  },
  draw(o) {
    if (o.kind === 'sure') { const H = HOLE[o.h]; return holes(H.k, H.labels); }
    return holes(o.k);
  },
};

/* ================================================================== calendar */

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const mlen = (m, leap) => [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m];
const doyOf = (m, d, leap) => sum(Array.from({ length: m }, (_, i) => mlen(i, leap))) + d;
const SUNFIRST = "['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']";
const dayChoices = (ansIdx, opts) => opts.map((o) => (ansIdx + o + 70) % 7).sort((a, b) => a - b).map((i) => DAYS[i]);
const OPTS = [[0, 1, -1, 2], [0, -1, 1, -2], [0, 1, 2, 3], [0, -1, -2, 3], [0, 2, -2, 1], [0, 3, -3, 1]];

const calendar = {
  id: 'calendar-days', world: 'logic', band: '8-10', title: 'The week goes round',
  hook: 'Today is Tuesday. What day of the week will it be 100 days from today?',
  idea: 'Every 7 days the week comes back to the same day. Throw away whole weeks — only the remainder after ÷ 7 moves the day.',
  why: [
    'Seven days from Tuesday is Tuesday again. So is 14 days, 70 days, 98 days: any whole number of weeks lands you back where you started. That means you can throw whole weeks away and lose nothing.',
    '100 ÷ 7 is 14 weeks with 2 days left over. The 14 weeks bring you back to Tuesday; the 2 extra days take you to Thursday. A huge number of days is no harder than a small one — only the remainder counts.',
    'To find the day of the week of a date, first find its number in the year: add up the days of the months before it, then the date. (February has 28 days, or 29 in a leap year.) 1 January is day 1, so the date is (day number − 1) days after 1 January — and now it is the same question as before.',
  ],
  alg: 'day n days later = start day moved on by (n mod 7)',
  ex: { kind: 'later', d: 1, n: 100, opts: OPTS[0] },
  caseKey: 'kind',
  cases: [
    { label: 'Days later', note: 'Divide by 7 and keep only the remainder. Count that many days on from today.',
      ex: { kind: 'later', d: 1, n: 100, opts: OPTS[0] } },
    { label: 'Days ago', note: 'The same remainder, but count backwards — Monday comes before Tuesday.',
      ex: { kind: 'before', d: 4, n: 45, opts: OPTS[4] } },
    { label: 'Day of the year', note: 'Add up the whole months before the date, then add the date itself.',
      ex: { kind: 'doy', m: 2, day: 15, leap: false } },
    { label: 'Weekday of a date', note: 'Find its day number, so you know how many days after 1 January it is. Then throw away whole weeks.',
      ex: { kind: 'date', d: 0, m: 2, day: 1, leap: false, opts: OPTS[1] } },
  ],
  gen(r, lv = 1) {
    return fresh(() => {
      const opts = pick(OPTS, r), d = int(0, 6, r), w = r();
      if (lv === 1) {
        if (w < 0.6) return this.q({ kind: 'later', d, n: int(8, 40, r), opts });
        const m = int(1, 2, r); return this.q({ kind: 'doy', m, day: int(1, mlen(m, false), r), leap: false });
      }
      if (lv === 2) {
        if (w < 0.35) return this.q({ kind: 'later', d, n: int(30, 400, r), opts });
        if (w < 0.7) return this.q({ kind: 'before', d, n: int(10, 200, r), opts });
        const m = int(1, 11, r), leap = r() < 0.3; return this.q({ kind: 'doy', m, day: int(1, mlen(m, leap), r), leap });
      }
      if (w < 0.25) return this.q({ kind: r() < 0.5 ? 'later' : 'before', d, n: int(100, 1000, r), opts });
      const m = int(1, 11, r), leap = r() < 0.4;
      return this.q({ kind: 'date', d, m, day: int(1, mlen(m, leap), r), leap, opts });
    });
  },
  q(o) {
    const yr = (lp) => (lp ? 'In a leap year' : 'In a year that is not a leap year');
    const Y = (lp) => (lp ? 2024 : 2023);                       // 2024 is a leap year; 2023 is not
    if (o.kind === 'later' || o.kind === 'before') {
      const s = o.kind === 'later' ? 1 : -1, ai = (((o.d + s * o.n) % 7) + 7) % 7;
      return { ...o, text: o.kind === 'later' ? `Today is ${DAYS[o.d]}. What day of the week will it be ${o.n} days from today?` : `Today is ${DAYS[o.d]}. What day of the week was it ${o.n} days ago?`,
        choices: dayChoices(ai, o.opts), ans: DAYS[ai],
        // 1 January 2024 was a Monday, so day index d is 1 + d January 2024
        expr: `${SUNFIRST}[new Date(2024,0,${1 + o.d}${s > 0 ? '+' : '-'}${o.n},12).getDay()]` };
    }
    const doy = doyOf(o.m, o.day, o.leap), dayExpr = `Math.round((new Date(${Y(o.leap)},${o.m},${o.day},12)-new Date(${Y(o.leap)},0,1,12))/864e5)`;
    if (o.kind === 'doy') return { ...o, text: `${yr(o.leap)}, ${o.day} ${MONTHS[o.m]} is day number what of the year? (1 January is day 1.)`, ans: doy, expr: `${dayExpr}+1` };
    const ai = (o.d + doy - 1) % 7;
    return { ...o, text: `${yr(o.leap)}, 1 January is a ${DAYS[o.d]}. What day of the week is ${o.day} ${MONTHS[o.m]}?`, choices: dayChoices(ai, o.opts), ans: DAYS[ai],
      expr: `['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][(${o.d}+${dayExpr})%7]` };
  },
  work(o) {
    if (o.kind === 'later' || o.kind === 'before') return [{ t: `${o.n} ÷ 7 — what is the remainder?`, v: o.n % 7 },
      { t: `Whole weeks change nothing. Count ${o.kind === 'later' ? 'on' : 'back'} ${o.n % 7} from ${DAYS[o.d]}`, v: o.ans, choices: o.choices }];
    const doy = doyOf(o.m, o.day, o.leap), before = doy - o.day;
    if (o.kind === 'doy') return [{ t: `Days in the months before ${MONTHS[o.m]}`, v: before }, { t: `+ ${o.day}`, v: doy }];
    return [{ t: `Day number of ${o.day} ${MONTHS[o.m]}`, v: doy }, { t: 'So how many days after 1 January?', v: doy - 1 },
      { t: `${doy - 1} ÷ 7 — the remainder`, v: (doy - 1) % 7 }, { t: `Count on from ${DAYS[o.d]}`, v: o.ans, choices: o.choices }];
  },
  draw(o) {
    let s = '';
    if (o.kind === 'doy') {
      MONTHS.forEach((m, i) => { const x = 4 + i * 30; s += `<rect x="${x}" y="6" width="27" height="40" rx="4" class="${i < o.m ? 'dg-fill1' : i === o.m ? 'dg-fill2' : 'dg-blank'}"/>` + TX(x + 13.5, 22, m.slice(0, 3)) + TX(x + 13.5, 40, mlen(i, o.leap)); });
      return kit.svg(366, 52, s, 'The twelve months and how many days each has');
    }
    DAYS.forEach((dn, i) => { const x = 4 + i * 50; s += `<rect x="${x}" y="6" width="46" height="40" rx="5" class="${i === o.d ? 'dg-fill1' : 'dg-blank'}"/>` + TX(x + 23, 31, dn.slice(0, 3)); });
    return kit.svg(356, 52, s, `A week strip starting from ${DAYS[o.d]}`);
  },
};

/* ================================================================== missing digit */

const DIVX = { nine: 9, count3: 3, eleven: 11, six: 6 };
const numStr = (ds) => ds.map((d) => (d === null ? '▢' : d)).join('');
const fits = (ds, k) => { const out = []; for (let d = ds[0] === null ? 1 : 0; d <= 9; d++) if (Number(ds.map((x) => (x === null ? d : x)).join('')) % k === 0) out.push(d); return out; };

const missingDigit = {
  id: 'missing-digit-divisibility', world: 'logic', band: '8-10', title: 'The missing digit',
  hook: 'Which digit goes in the box so that 3▢72 divides exactly by 9?',
  idea: 'Use the divisibility test as a rule the missing digit must obey: for 9 and 3, the digit sum; for 11, the two alternating sums.',
  why: [
    'A number divides by 9 exactly when its digits add up to a multiple of 9. Why? 10 is 9 + 1, 100 is 99 + 1, 1000 is 999 + 1. So 3▢72 is a pile of 9s plus 3 + ▢ + 7 + 2. The 9s divide by 9 already — so only the digit sum decides.',
    'For 3▢72 the digits you can see add to 12. The next multiple of 9 is 18, so ▢ = 6 — and nothing else, because 12 + 15 = 27 would need a "digit" of 15. With 3, the multiples of 3 are closer together: several digits may work, and the question becomes how many.',
    'For 11, 10 is 11 − 1, 100 is 99 + 1, 1000 is 1001 − 1: the places from the right count +, −, +, −. So add the digits in the 1st, 3rd, 5th… places, add the 2nd, 4th…, and the two sums must differ by a multiple of 11 (0 counts). For 6, the number must divide by 2 AND by 3.',
  ],
  alg: '9 | N ⇔ 9 | digit sum · 11 | N ⇔ 11 | (odd-place sum − even-place sum) · 6 | N ⇔ 2 | N and 3 | N',
  ex: { kind: 'nine', ds: [3, null, 7, 2] },
  caseKey: 'kind',
  cases: [
    { label: 'Divides by 9', note: 'Add the digits you can see, then fill up to the next multiple of 9.',
      ex: { kind: 'nine', ds: [3, null, 7, 2] } },
    { label: 'How many work for 3', note: 'Multiples of 3 come every 3, so once one digit works, every third digit after it works too.',
      ex: { kind: 'count3', ds: [4, null, 5] } },
    { label: 'Divides by 11', note: 'Two sums, from the right: the 1st, 3rd, 5th… places and the 2nd, 4th… places. They must differ by a multiple of 11.',
      ex: { kind: 'eleven', ds: [5, 2, null, 8, 1] } },
    { label: 'Divides by 6', note: 'Six is 2 × 3: the number must be even AND have a digit sum that divides by 3. Both rules at once.',
      ex: { kind: 'six', ds: [7, 3, 4, null] } },
  ],
  gen(r, lv = 1) {
    for (let i = 0; ; i++) {
      const kind = lv === 1 ? 'nine' : lv === 2 ? pick(['nine', 'count3', 'nine', 'count3', 'eleven'], r) : pick(['eleven', 'six', 'nine'], r);
      const len = lv === 1 ? int(3, 4, r) : lv === 2 ? int(4, 5, r) : int(5, 7, r);
      const ds = Array.from({ length: len }, (_, j) => (j === 0 ? int(1, 9, r) : int(0, 9, r)));
      ds[kind === 'six' ? len - 1 : int(0, len - 1, r)] = null;
      const f = fits(ds, DIVX[kind]);
      if (kind === 'count3' ? f.length > 0 : f.length === 1) return this.q({ kind, ds });
      if (i > 200) throw new Error('missing-digit: no puzzle');
    }
  },
  q(o) {
    const k = DIVX[o.kind], n = numStr(o.ds), f = fits(o.ds, k);
    const pre = o.ds.slice(0, o.ds.indexOf(null)).join(''), post = o.ds.slice(o.ds.indexOf(null) + 1).join('');
    const search = `[0,1,2,3,4,5,6,7,8,9].filter((d)=>${o.ds[0] === null ? 'd>0&&' : ''}Number('${pre}'+d+'${post}')%${k}===0)`;
    if (o.kind === 'count3') return { ...o, text: `How many different digits could go in the box so that ${n} divides exactly by 3?`, ans: f.length, expr: `${search}.length` };
    return { ...o, text: `Which digit goes in the box so that ${n} divides exactly by ${k}?`, say: `Which digit goes in the gap so that ${n.replace('▢', ' blank ')} divides exactly by ${k}?`,
      ans: f.length === 1 ? f[0] : NaN, expr: `((x)=>x.length===1?x[0]:NaN)(${search})` };
  },
  work(o) {
    const seen = sum(o.ds.filter((d) => d !== null)), first = o.ds[0] === null;
    if (o.kind === 'nine') { let m = Math.ceil((seen + (first ? 1 : 0)) / 9) * 9; return [{ t: 'Add the digits you can see', v: seen }, { t: 'The next multiple of 9 a single digit can reach', v: m }, { t: `${m} − ${seen}`, v: m - seen }]; }
    if (o.kind === 'count3') {
      let d0 = first ? 1 : 0; while ((seen + d0) % 3) d0++;
      return [{ t: 'Add the digits you can see', v: seen }, { t: `The smallest digit${first ? ' (not 0 — it is the first digit)' : ''} that makes a multiple of 3`, v: d0 }, { t: 'Every third digit after it works too, up to 9. How many digits altogether?', v: Math.floor((9 - d0) / 3) + 1 }];
    }
    if (o.kind === 'six') {
      const c3 = []; for (let d = 0; d <= 9; d++) if ((seen + d) % 3 === 0) c3.push(d);
      return [{ t: 'Add the digits you can see', v: seen }, { t: 'How many digits make the digit sum a multiple of 3?', v: c3.length }, { t: 'It must also be even (the last digit). Which one is it?', v: c3.filter((d) => d % 2 === 0)[0] }];
    }
    const L = o.ds.length, pos = L - o.ds.indexOf(null);           // place counted from the right, 1 = ones
    let A = 0, B = 0; o.ds.forEach((d, i) => { if (d === null) return; if ((L - i) % 2) A += d; else B += d; });
    return [{ t: 'Add the digits in the 1st, 3rd, 5th… places from the right (the box counts as 0)', v: A }, { t: 'Add the digits in the 2nd, 4th… places', v: B },
      { t: `The box is in the ${pos % 2 ? 'odd' : 'even'} places. Which digit makes the two sums differ by a multiple of 11?`, v: pos % 2 ? (((B - A) % 11) + 11) % 11 : (((A - B) % 11) + 11) % 11 }];
  },
  draw(o) { return cards(o.ds, `The number ${numStr(o.ds)} with one digit missing`); },
};

/* ================================================================== list systematically */

const listSys = {
  id: 'list-systematically', world: 'logic', band: '8-10', title: 'List them in order',
  hook: 'How many 3-digit numbers have digits that add up to 5?',
  idea: 'Count by listing in an order that cannot miss one or count one twice — fix the first choice, list everything that goes with it, then move on.',
  why: [
    'If you write numbers down as they pop into your head, you will miss some and write some twice. A list in ORDER fixes that: start with the smallest first digit, list every number that begins with it, then go to the next first digit. Each number has exactly one place in the list.',
    'For 3-digit numbers whose digits add to 5: first digit 1, the other two add to 4 — 04, 13, 22, 31, 40, which is 5 ways. First digit 2: the others add to 3, 4 ways. Then 3, 2 and 1 ways. 5 + 4 + 3 + 2 + 1 = 15. The rows shrink by one each time, and that pattern is the shortcut.',
    'The same trick counts coins (fix how many 5s, then how many 2s, and 1s fill the rest) and numbers with different digits (find the GROUPS of digits first, then count the orders each group can make). Choose what to fix first so each row is easy.',
  ],
  alg: 'total = Σ over the first choice of (the ways to finish that row)',
  ex: { kind: 'three', s: 5 },
  caseKey: 'kind',
  cases: [
    { label: '2-digit numbers', note: 'Fix the first digit. The last digit is then forced, so count how many first digits give a last digit from 0 to 9.',
      ex: { kind: 'two', s: 12 } },
    { label: '3-digit numbers', note: 'Fix the first digit; count the ways for the last two. Each row is one fewer than the row before.',
      ex: { kind: 'three', s: 5 } },
    { label: 'Ways to pay', note: 'Fix the number of 5s first, then the number of 2s; the 1s fill whatever is left, so they never make a new way.',
      ex: { kind: 'coins', N: 12 } },
    { label: 'All digits different', note: 'Find the groups of three different digits first. A group without 0 makes 6 numbers; with 0 only 4, as 0 cannot lead.',
      ex: { kind: 'distinct', s: 9 } },
  ],
  gen(r, lv = 1) {
    return fresh(() => {
      if (lv === 1) return this.q({ kind: 'two', s: r() < 0.7 ? int(2, 9, r) : int(10, 17, r) });
      if (lv === 2) return r() < 0.55 ? this.q({ kind: 'three', s: int(2, 9, r) }) : this.q({ kind: 'coins', N: int(5, 16, r) });
      return r() < 0.6 ? this.q({ kind: 'distinct', s: int(6, 20, r) }) : this.q({ kind: 'coins', N: int(15, 30, r) });
    });
  },
  q(o) {
    const ds = (lo, hi, f) => `(()=>{let c=0;for(let n=${lo};n<=${hi};n++){const d=String(n).split('').map(Number);if(${f})c++;}return c;})()`;
    if (o.kind === 'two') return { ...o, text: `How many 2-digit numbers have digits that add up to ${o.s}?`, ans: Math.min(9, o.s) - Math.max(1, o.s - 9) + 1, expr: ds(10, 99, `d[0]+d[1]===${o.s}`) };
    if (o.kind === 'three') return { ...o, text: `How many 3-digit numbers have digits that add up to ${o.s}?`, ans: (o.s * (o.s + 1)) / 2, expr: ds(100, 999, `d[0]+d[1]+d[2]===${o.s}`) };
    if (o.kind === 'distinct') {
      let g0 = 0, g1 = 0; for (let a = 0; a <= 9; a++) for (let b = a + 1; b <= 9; b++) for (let c = b + 1; c <= 9; c++) if (a + b + c === o.s) { if (a === 0) g1++; else g0++; }
      return { ...o, g0, g1, text: `How many 3-digit numbers have three DIFFERENT digits that add up to ${o.s}?`, ans: 6 * g0 + 4 * g1,
        expr: ds(100, 999, `d[0]+d[1]+d[2]===${o.s}&&new Set(d).size===3`) };
    }
    const F = Math.floor(o.N / 5); let ways = 0; for (let f = 0; f <= F; f++) ways += Math.floor((o.N - 5 * f) / 2) + 1;
    return { ...o, text: `In how many ways can you make ${o.N} with coins worth 1, 2 and 5? (Use as many of each as you like; order does not matter.)`, ans: ways,
      expr: `(()=>{let c=0;for(let a=0;a<=${o.N};a++)for(let b=0;2*b<=${o.N};b++)for(let e=0;5*e<=${o.N};e++)if(a+2*b+5*e===${o.N})c++;return c;})()` };
  },
  work(o) {
    if (o.kind === 'two') { const lo = Math.max(1, o.s - 9), hi = Math.min(9, o.s); return [{ t: 'The smallest first digit that works (the last digit is at most 9)', v: lo }, { t: 'The biggest first digit that works', v: hi }, { t: 'Each first digit gives exactly one number. Count from smallest to biggest', v: hi - lo + 1 }]; }
    if (o.kind === 'three') return [{ t: `First digit 1: the last two digits add to ${o.s - 1}. How many ways (like 0${o.s - 1})?`, v: o.s },
      { t: `First digit 2: they add to ${o.s - 2}. How many ways?`, v: o.s - 1 }, { t: `Each row is one fewer, down to 1 (first digit ${o.s}). Add every row`, v: o.ans }];
    if (o.kind === 'distinct') return [{ t: 'Groups of three different digits from 1 to 9 that add up to it', v: o.g0 }, { t: 'Groups that use a 0', v: o.g1 },
      { t: `A group without 0 makes 6 numbers, a group with 0 makes 4: ${o.g0} × 6 + ${o.g1} × 4`, v: o.ans }];
    const F = Math.floor(o.N / 5);
    return [{ t: 'The most 5s you can use', v: F }, { t: 'Using no 5s: how many ways with 2s and 1s (count the 2s: 0, 1, 2, …)?', v: Math.floor(o.N / 2) + 1 },
      { t: `Do the same row for each number of 5s, from 0 up to ${F}, and add the rows`, v: o.ans }];
  },
};

/* ================================================================== truth-tellers */

const NAMES = ['Asha', 'Bilal', 'Chen', 'Dara'];
const NUMW = ['none', 'one', 'two', 'three', 'four'];
const truth = (st, i, a) => (st.t === 'is' ? a[st.x] === st.kn : st.t === 'same' ? a[st.x] === a[i] : st.t === 'diff' ? a[st.x] !== a[i]
  : st.t === 'exactly' ? a.filter(Boolean).length === st.k : a.filter((v) => !v).length >= st.k);
const assigns = (n) => Array.from({ length: 1 << n }, (_, m) => Array.from({ length: n }, (_, i) => !!((m >> i) & 1)));
const solve = (sts) => assigns(sts.length).filter((a) => sts.every((st, i) => truth(st, i, a) === a[i]));
function say(st, i) {
  if (st.t === 'is') return `${NAMES[st.x]} is a ${st.kn ? 'knight' : 'liar'}.`;
  if (st.t === 'same') return `${NAMES[st.x]} and I are the same kind.`;
  if (st.t === 'diff') return `${NAMES[st.x]} and I are different kinds.`;
  if (st.t === 'exactly') return st.k === 0 ? 'None of us is a knight.' : `Exactly ${NUMW[st.k]} of us ${st.k === 1 ? 'is a knight' : 'are knights'}.`;
  return `At least ${NUMW[st.k]} of us ${st.k === 1 ? 'is a liar' : 'are liars'}.`;
}
function code(st, i) {
  if (st.t === 'is') return `a[${st.x}]===${st.kn ? 1 : 0}`;
  if (st.t === 'same') return `a[${st.x}]===a[${i}]`;
  if (st.t === 'diff') return `a[${st.x}]!==a[${i}]`;
  if (st.t === 'exactly') return `a.reduce((s,v)=>s+v,0)===${st.k}`;
  return `a.filter((v)=>v===0).length>=${st.k}`;
}

const truthTellers = {
  id: 'truth-tellers', world: 'logic', band: '8-10', title: 'Knights and liars',
  hook: 'Asha says: "Bilal is a liar." Bilal says: "Asha and I are the same kind." Who is telling the truth?',
  idea: 'Suppose one person is a knight and follow what that forces. If it leads to a contradiction, they must be a liar. Check every possibility — the one that fits is the answer.',
  why: [
    'On this island a knight ALWAYS tells the truth and a liar ALWAYS lies. So if a knight says something, it is true; if a liar says something, it is false. That is all you know — and it is enough.',
    'Try a guess and follow it. Suppose Asha is a knight: then "Bilal is a liar" is true. Bilal, a liar, says "Asha and I are the same kind" — and that really is false, since they are different. Everything fits! Now suppose Asha is a liar: then Bilal is a knight, so his words are true, so Asha is a knight too. But we said she was a liar — a contradiction. So that guess is impossible.',
    'With two people there are only four ways to fill in knight or liar; with three, eight; with four, sixteen. Testing them all is a proof: if exactly one way fits, the answer is certain. Good contest solvers start with the person whose statement says the most.',
  ],
  alg: 'knight ⇒ statement true · liar ⇒ statement false · keep the assignments with no contradiction',
  ex: { kind: 'who', sts: [{ t: 'is', x: 1, kn: false }, { t: 'same', x: 0 }], ask: 0 },
  caseKey: 'kind',
  cases: [
    { label: 'Who is a knight?', note: 'Suppose the first speaker is a knight and follow it through; then suppose a liar. Only one of the two can fit.',
      ex: { kind: 'who', sts: [{ t: 'is', x: 1, kn: false }, { t: 'same', x: 0 }], ask: 0 } },
    { label: 'How many knights?', note: 'Statements about "how many of us" refer to the speaker too. Test each guess against every statement, and count the knights in the one that fits.',
      ex: { kind: 'count', sts: [{ t: 'exactly', k: 0 }, { t: 'exactly', k: 1 }, { t: 'exactly', k: 2 }] } },
  ],
  gen(r, lv = 1) {
    const n = lv === 1 ? 2 : lv === 2 ? 3 : int(3, 4, r);
    const kind = lv === 3 && r() < 0.6 ? 'count' : 'who';
    for (let i = 0; ; i++) {
      const sts = Array.from({ length: n }, (_, j) => {
        const other = () => { let x = int(0, n - 2, r); if (x >= j) x++; return x; };
        const w = r();
        if (w < 0.35) return { t: 'is', x: other(), kn: r() < 0.5 };
        if (w < 0.55) return { t: r() < 0.5 ? 'same' : 'diff', x: other() };
        if (w < 0.75 || lv === 1) return { t: 'liars', k: lv === 1 ? 1 : int(1, n - 1, r) };
        return { t: 'exactly', k: int(0, n, r) };
      });
      if (solve(sts).length === 1) return this.q({ kind, sts, ask: kind === 'who' ? int(0, n - 1, r) : undefined });
      if (i > 500) throw new Error('truth-tellers: no puzzle');
    }
  },
  q(o) {
    const n = o.sts.length, sol = solve(o.sts);
    const lines = o.sts.map((st, i) => `${NAMES[i]} says: "${say(st, i)}"`).join(' ');
    const conds = o.sts.map((st, i) => `((${code(st, i)})===(a[${i}]===1))`).join('&&');
    const search = `const S=[];for(let m=0;m<${1 << n};m++){const a=[${Array.from({ length: n }, (_, i) => `(m>>${i})&1`)}];if(${conds})S.push(a);}`;
    const head = `Knights always tell the truth and liars always lie. ${lines}`;
    if (o.kind === 'who') return { ...o, text: `${head} Is ${NAMES[o.ask]} a knight or a liar?`, choices: ['Knight', 'Liar'],
      ans: sol.length === 1 ? (sol[0][o.ask] ? 'Knight' : 'Liar') : 'none', expr: `(()=>{${search}return S.length===1?(S[0][${o.ask}]?'Knight':'Liar'):'none';})()` };
    return { ...o, text: `${head} How many of the ${NUMW[n]} are knights?`, ans: sol.length === 1 ? sol[0].filter(Boolean).length : NaN,
      expr: `(()=>{${search}return S.length===1?S[0].reduce((s,v)=>s+v,0):NaN;})()` };
  },
  work(o) {
    const sol = solve(o.sts), can = (kn) => (sol.some((a) => a[0] === kn) ? 'Yes' : 'No');
    const s = [{ t: `Suppose ${NAMES[0]} is a knight. Can everything fit?`, v: can(true), choices: YN }, { t: `Suppose ${NAMES[0]} is a liar. Can everything fit?`, v: can(false), choices: YN }];
    if (o.kind === 'who') s.push({ t: `So ${NAMES[o.ask]} is a`, v: o.ans, choices: ['Knight', 'Liar'] });
    else s.push({ t: 'In the only way that fits, how many are knights?', v: o.ans });
    return s;
  },
};

/* ================================================================== digit puzzles */

const LET = 'ABC';
const PLACE = ['Ones', 'Tens', 'Hundreds', 'Thousands'];
const fill = (w, d) => w.replace(/[ABC]/g, (c) => d[LET.indexOf(c)]);
const okLead = (w) => !/^0./.test(w);
function digitSolutions(o) {
  const L = o.nl, out = [];
  for (let m = 0; m < 10 ** L; m++) {
    const d = Array.from({ length: L }, (_, i) => Math.floor(m / 10 ** i) % 10);
    const a = fill(o.a, d), b = fill(o.b, d), c = fill(o.c, d);
    if (!okLead(a) || !okLead(b) || !okLead(c)) continue;
    if (o.kind === 'add' ? +a + +b === +c : +a * +b === +c) out.push(d);
  }
  return out;
}
/* Hide one digit of a written number: position from the right (0 = ones). */
const hide = (s, posR, letter) => { const i = s.length - 1 - posR; return s.slice(0, i) + letter + s.slice(i + 1); };

const digitPuzzles = {
  id: 'digit-puzzles', world: 'logic', band: '8-10', title: 'Letters in a column sum',
  hook: '4A + B7 = 82. Each letter is a digit. What is B?',
  idea: 'Work column by column from the ones, carrying as you go. Each column is a tiny puzzle with one unknown; when a column allows two digits, try each in the whole sum.',
  why: [
    'In 4A + B7 = 82, look at the ones first: A + 7 must end in 2. Only 5 does that (5 + 7 = 12), so A = 5 — and the 1 of the 12 is carried into the tens. Now the tens: 4 + B + 1 = 8, so B = 3. Check: 45 + 37 = 82.',
    'Why start on the right? Because the ones column has nothing carried INTO it — it is the only column you can finish without knowing anything else. Once it is done, you know the carry for the next column, and so on leftwards. Each column then has just one thing unknown.',
    'Multiplying is the same, with a twist. In 4A × 6 = 2B8, A × 6 must end in 8 — and both 3 (18) and 8 (48) do that. Two candidates! So try each in the WHOLE sum: 43 × 6 = 258 fits the pattern 2B8, and 48 × 6 = 288 fits it too — so that puzzle would have two answers, and a fair puzzle shows enough digits to rule one out. Proving there is only one answer is part of the solving.',
  ],
  alg: 'ones column first: (a + b) mod 10 = c, carry ⌊(a + b) ÷ 10⌋ into the next column',
  ex: { kind: 'add', a: '4A', b: 'B7', c: '82', nl: 2, ask: 1 },
  caseKey: 'kind',
  cases: [
    { label: 'A column addition', note: 'Ones column first, then carry. Each column has only one letter, so each is a small sum with one gap.',
      ex: { kind: 'add', a: '4A', b: 'B7', c: '82', nl: 2, ask: 1 } },
    { label: 'A times puzzle', note: 'The ones column can allow more than one digit. Try each candidate in the whole multiplication; only one fits the digits you can see.',
      ex: { kind: 'times', a: '2A', b: '4', c: 'B12', nl: 2, ask: 0 } },
  ],
  gen(r, lv = 1) {
    for (let i = 0; ; i++) {
      let o;
      if (lv < 3) {
        const dg = lv === 1 ? 2 : 3, a = int(10 ** (dg - 1), 10 ** dg - 1, r), b = int(10 ** (dg - 1), 10 ** dg - 1, r), c = a + b;
        const cols = shuffle(Array.from({ length: dg }, (_, j) => j), r).slice(0, lv === 1 ? 2 : 3).sort((x, y) => y - x);   // left to right
        const S = { a: String(a), b: String(b), c: String(c) };
        cols.forEach((col, li) => { const row = pick(['a', 'b', 'c'], r); S[row] = hide(S[row], col, LET[li]); });
        o = { kind: 'add', ...S, nl: cols.length, ask: 0 };
      } else {
        const k = pick([2, 4, 5, 6, 8], r), a = r() < 0.6 ? int(12, 99, r) : int(102, 333, r), p = a * k;
        if (p < 100) continue;
        const ps = String(p), mid = int(1, ps.length - 2, r);
        o = { kind: 'times', a: hide(String(a), 0, 'A'), b: String(k), c: hide(ps, mid, 'B'), nl: 2, ask: 0 };
      }
      const sols = digitSolutions(o);
      if (sols.length === 1 && (o.kind === 'add' || this.cands(o) >= 2)) return this.q(o);
      if (i > 400) throw new Error('digit-puzzles: no puzzle');
    }
  },
  cands(o) { const k = +o.b, want = +o.c.at(-1); let n = 0; for (let d = 0; d <= 9; d++) if ((d * k) % 10 === want) n++; return n; },
  q(o) {
    const sols = digitSolutions(o), L = LET[o.ask], op = o.kind === 'add' ? '+' : '×';
    const jsop = o.kind === 'add' ? '+a+ +b===+c' : '+a*+b===+c';
    return { ...o, text: `${o.a} ${op} ${o.b} = ${o.c}. Each letter stands for one digit${o.nl > 1 && o.kind === 'add' ? ' (two letters may be the same digit)' : ''}. What is ${L}?`,
      say: `${o.a.split('').join(' ')} ${o.kind === 'add' ? 'plus' : 'times'} ${o.b.split('').join(' ')} equals ${o.c.split('').join(' ')}. What is ${L}?`,
      ans: sols.length === 1 ? sols[0][o.ask] : NaN,
      expr: `(()=>{const S=[];for(let m=0;m<${10 ** o.nl};m++){const d=[${Array.from({ length: o.nl }, (_, i) => `Math.floor(m/${10 ** i})%10`)}];const f=(w)=>w.replace(/[ABC]/g,(x)=>d['ABC'.indexOf(x)]);const a=f('${o.a}'),b=f('${o.b}'),c=f('${o.c}');if(/^0./.test(a)||/^0./.test(b)||/^0./.test(c))continue;if(${jsop})S.push(d[${o.ask}]);}return S.length===1?S[0]:NaN;})()` };
  },
  work(o) {
    if (o.kind === 'times') return [{ t: `Ones column: how many digits A make A × ${o.b} end in ${o.c.at(-1)}?`, v: this.cands(o) }, { t: 'Try each one in the whole multiplication. Which A fits every digit you can see?', v: o.ans }];
    const sol = digitSolutions(o)[0], W = Math.max(o.a.length, o.b.length, o.c.length), dig = (s, p) => (p < s.length ? s[s.length - 1 - p] : '0');
    const steps = [];
    for (let p = 0; p < W; p++) {
      const here = [o.a, o.b, o.c].map((s) => dig(s, p)).find((ch) => LET.includes(ch));
      if (here) steps.push({ t: `${PLACE[p]} column (with any carry): ${here} = ?`, v: sol[LET.indexOf(here)] });
    }
    return steps;
  },
  draw(o) {
    const W = Math.max(o.a.length, o.b.length + 2, o.c.length), u = 30, x0 = 40 + W * u; let s = '';
    const row = (str, y, pre = '') => { str.split('').reverse().forEach((ch, i) => { s += TX(x0 - i * u - u / 2, y, ch, LET.includes(ch) ? 'dg-accent' : 'dg-big'); }); if (pre) s += TX(x0 - W * u - 4, y, pre, 'dg-big'); };
    row(o.a, 36); row(o.b, 72, o.kind === 'add' ? '+' : '×');
    s += `<line x1="${x0 - W * u - 20}" y1="84" x2="${x0 + 4}" y2="84" class="dg-line"/>`;
    row(o.c, 116);
    return kit.svg(x0 + 20, 128, s, `${o.a} ${o.kind === 'add' ? 'plus' : 'times'} ${o.b} equals ${o.c}, written in columns`);
  },
};

/* ================================================================== remainders */

const THINGS = ['eggs', 'marbles', 'sweets', 'stickers', 'beads'];
const DIVS = { 1: [[2, 3], [2, 5], [3, 4], [4, 5], [3, 5]], 2: [[3, 4, 5], [2, 3, 5], [4, 6], [5, 6], [3, 7], [4, 7]], 3: [[3, 4, 5], [4, 5, 6], [3, 5, 7], [5, 7], [7, 8], [6, 9, 4]] };
const lcmAll = (ds) => ds.reduce(lcm, 1);

const remainders = {
  id: 'remainder-puzzles', world: 'logic', band: '8-10', title: 'Left over every time',
  hook: 'Counting eggs in 3s, 4s or 5s, there are always 2 left over. What is the fewest eggs there could be (more than 2)?',
  idea: 'Take away the leftover and the rest shares out exactly — so it is a common multiple. When the leftovers differ, list the numbers that pass one test and step along until one passes the next.',
  why: [
    'If counting in 3s, 4s and 5s always leaves 2, take those 2 eggs away. What is left splits exactly into 3s, 4s AND 5s, so it is a common multiple of 3, 4 and 5. The smallest is 60. Put the 2 back: 62.',
    'If counting in 3s leaves 2, in 4s leaves 3 and in 5s leaves 4, each time you are ONE short of a full group. Add one more egg and every count comes out exact — so one more than the answer is 60, and the answer is 59.',
    'When the leftovers have no pattern, list. Numbers that leave 3 when divided by 5 are 3, 8, 13, 18, 23, … — step by 5. Walk along that list until you meet one that also leaves 2 when divided by 3: 3 no, 8 yes. The steps are big, so the walk is short.',
  ],
  alg: 'same remainder r: LCM + r · one short each time: LCM − 1 · otherwise step along one list',
  ex: { kind: 'same', ds: [3, 4, 5], r: 2, th: 0 },
  caseKey: 'kind',
  cases: [
    { label: 'The same leftover', note: 'Take the leftover away: the rest is a common multiple. Find the smallest, then put the leftover back.',
      ex: { kind: 'same', ds: [3, 4, 5], r: 2, th: 0 } },
    { label: 'One short every time', note: 'Each count is one short of a full group, so one more would share out exactly. Find that, then take the one away.',
      ex: { kind: 'short', ds: [3, 4, 5], th: 1 } },
    { label: 'Different leftovers', note: 'List the numbers that pass the biggest divisor’s test — they go up in big steps — and stop at the first that passes the others.',
      ex: { kind: 'mixed', ds: [3, 5], rs: [2, 3] } },
  ],
  gen(r, lv = 1) {
    return fresh(() => {
      const ds = pick(DIVS[lv], r), w = r(), th = int(0, THINGS.length - 1, r);
      if (lv === 1 && w < 0.55) return this.q({ kind: 'same', ds, r: int(1, Math.min(...ds) - 1, r), th });
      if (lv === 1) return this.q({ kind: 'short', ds, th });
      if (w < 0.25) return this.q({ kind: 'same', ds, r: int(1, Math.min(...ds) - 1, r), th });
      if (w < 0.45) return this.q({ kind: 'short', ds, th });
      const L = lcmAll(ds); let n, rs;
      for (let i = 0; i < 50; i++) {
        n = int(Math.max(...ds) + 1, L - 1, r); rs = ds.map((d) => n % d);
        if (!rs.every((x) => x === rs[0]) && !rs.every((x, j) => x === ds[j] - 1)) break;
      }
      return this.q({ kind: 'mixed', ds, rs });
    });
  },
  q(o) {
    const L = lcmAll(o.ds), test = (rs) => o.ds.map((d, i) => `n%${d}===${rs[i]}`).join('&&');
    const hunt = (from, rs) => `(()=>{for(let n=${from};n<100000;n++)if(${test(rs)})return n;return NaN;})()`;
    const ins = listOr(o.ds.map((d) => `${d}s`));
    if (o.kind === 'same') return { ...o, text: `Counting ${THINGS[o.th]} in ${ins}, there are always ${o.r} left over. There are more than ${o.r}. What is the fewest there could be?`,
      ans: L + o.r, expr: hunt(o.r + 1, o.ds.map(() => o.r)) };
    if (o.kind === 'short') return { ...o, text: `Counting ${THINGS[o.th]}: ${o.ds.map((d) => `in ${d}s, ${d - 1} are left over`).join('; ')}. What is the fewest there could be?`,
      ans: L - 1, expr: hunt(1, o.ds.map((d) => d - 1)) };
    let n = 1; while (!o.ds.every((d, i) => n % d === o.rs[i])) n++;
    return { ...o, text: `A number leaves ${listAnd(o.ds.map((d, i) => `remainder ${o.rs[i]} when divided by ${d}`))}. What is the smallest such number?`, ans: n, expr: hunt(1, o.rs) };
  },
  work(o) {
    const L = lcmAll(o.ds);
    if (o.kind === 'same') return [{ t: `Take the ${o.r} away: the rest shares exactly into ${listAnd(o.ds.map((d) => `${d}s`))}. The smallest number they all go into`, v: L }, { t: `Put the ${o.r} back`, v: L + o.r }];
    if (o.kind === 'short') return [{ t: 'One more would share out exactly every time. The smallest number they all go into', v: L }, { t: 'Take the one back off', v: L - 1 }];
    const idx = o.ds.map((_, i) => i).sort((a, b) => o.ds[b] - o.ds[a]);   // biggest divisor first
    const big = idx[0], first = o.rs[big] || o.ds[big];
    const steps = [{ t: `The first number that leaves ${o.rs[big]} when divided by ${o.ds[big]}`, v: first }];
    let x = first, stepBy = o.ds[big];
    for (const j of idx.slice(1)) {
      while (x % o.ds[j] !== o.rs[j]) x += stepBy;
      steps.push({ t: `Add ${stepBy} each time until it also leaves ${o.rs[j]} when divided by ${o.ds[j]}`, v: x });
      stepBy = lcm(stepBy, o.ds[j]);
    }
    return steps;
  },
};

/* ================================================================== invariants */

const invariants = {
  id: 'invariants', world: 'logic', band: '8-10', title: 'What never changes',
  hook: 'Start at 7. Each move you may add 6 or take away 9. Can you ever reach 50?',
  idea: 'Find something every move leaves alone — the parity of a count, a remainder, a total. If the start and the goal disagree about it, no number of moves can ever get you there.',
  why: [
    'Add 6 or take away 9: both are multiples of 3. So every move keeps the remainder when you divide by 3 exactly the same. 7 leaves 1 when divided by 3; 50 leaves 2. They disagree — so 50 can never be reached, not in ten moves, not in a million. Something that never changes is called an INVARIANT.',
    'The invariant is often hidden. Turn over exactly two coins at a time and the number of heads goes up by 2, down by 2, or stays the same — its parity never changes. Start with an odd number of heads and you can never reach 0 heads. Swap two numbers on a board for their difference, a − b, and the total drops by 2 × b — even — so the total keeps its parity right to the end.',
    'Sometimes the invariant tells you the answer exactly. Swap two numbers for their sum plus one, and the total grows by exactly 1 each move. Count the moves, and you know the last number without doing a single sum on the board.',
  ],
  alg: 'if every move keeps f(state) the same, then f(start) ≠ f(goal) ⇒ unreachable',
  ex: { kind: 'steps', s: 7, a: 6, b: 9, N: 50 },
  caseKey: 'kind',
  cases: [
    { label: 'Turning coins', note: 'Turning two coins changes the number of heads by 2 or by 0, so whether it is odd or even never changes.',
      ex: { kind: 'flip', n: 9, h: 5 } },
    { label: 'Adding and taking away', note: 'If both moves are multiples of some number, the remainder when you divide by it never changes.',
      ex: { kind: 'steps', s: 7, a: 6, b: 9, N: 50 } },
    { label: 'Swap for the difference', note: 'Replacing a and b by a − b lowers the total by 2 × b — an even amount — so the parity of the total never changes.',
      ex: { kind: 'diff', n: 10 } },
    { label: 'Swap for sum + 1', note: 'Each move joins two numbers and adds 1 to the total. Count the moves and the last number is known.',
      ex: { kind: 'plusone', n: 6 } },
  ],
  gen(r, lv = 1) {
    return fresh(() => {
      const w = r();
      const steps = (gs, top) => { const g = pick(gs, r); let a = g * int(1, 4, r), b = g * int(1, 5, r); if (a === b) b += g; const s = int(1, top, r); let N = int(top, top * 4, r); if (r() < 0.5) N = s + g * int(2, 12, r); if (N === s) N++; return this.q({ kind: 'steps', s, a, b, N }); };
      if (lv === 1) return w < 0.5 ? this.q({ kind: 'flip', n: int(4, 9, r), h: int(1, 3, r) }) : steps([2], 20);
      if (lv === 2) return w < 0.3 ? this.q({ kind: 'flip', n: int(8, 20, r), h: int(1, 7, r) }) : w < 0.65 ? steps([3, 4, 5], 30) : this.q({ kind: 'diff', n: int(5, 16, r) });
      return w < 0.35 ? this.q({ kind: 'plusone', n: int(5, 20, r) }) : w < 0.65 ? this.q({ kind: 'diff', n: int(17, 60, r) }) : steps([3, 4, 5, 6, 7], 60);
    });
  },
  q(o) {
    if (o.kind === 'flip') return { ...o, text: `${o.n} coins lie on a table: ${o.h} show heads, the rest show tails. A move is turning over exactly two coins. Can you make all ${o.n} show tails?`,
      choices: YN, ans: o.h % 2 ? 'No' : 'Yes',
      expr: `(()=>{const seen=new Set([${o.h}]),Q=[${o.h}];while(Q.length){const x=Q.pop();const nx=[];if(x>=2)nx.push(x-2);if(${o.n}-x>=2)nx.push(x+2);for(const y of nx)if(!seen.has(y)){seen.add(y);Q.push(y);}}return seen.has(0)?'Yes':'No';})()` };
    if (o.kind === 'steps') {
      const g = gcd(o.a, o.b), lo = Math.min(o.s, o.N) - o.a - o.b, hi = Math.max(o.s, o.N) + o.a * o.b + o.a + o.b;
      return { ...o, text: `Start at ${o.s}. Each move you may add ${o.a} or take away ${o.b}, as many times as you like. Can you ever reach ${o.N}?`,
        choices: YN, ans: (o.N - o.s) % g === 0 ? 'Yes' : 'No',
        expr: `(()=>{const seen=new Set([${o.s}]),Q=[${o.s}];while(Q.length){const x=Q.pop();for(const y of [x+${o.a},x-${o.b}])if(y>=${lo}&&y<=${hi}&&!seen.has(y)){seen.add(y);Q.push(y);}}return seen.has(${o.N})?'Yes':'No';})()` };
    }
    const S = (o.n * (o.n + 1)) / 2;
    if (o.kind === 'diff') return { ...o, text: `The numbers 1, 2, 3, …, ${o.n} are on a board. A move: rub out any two numbers and write their difference (bigger minus smaller). Keep going until one number is left. Is it odd or even?`,
      choices: OE, ans: par(S),
      expr: `(()=>{let b=Array.from({length:${o.n}},(_,i)=>i+1);while(b.length>1){b.sort((x,y)=>y-x);const [p,q]=b.splice(0,2);b.push(p-q);}return b[0]%2?'Odd':'Even';})()` };
    return { ...o, text: `The numbers 1, 2, 3, …, ${o.n} are on a board. A move: rub out any two numbers and write their sum plus 1. Keep going until one number is left. What is it?`,
      ans: S + o.n - 1, expr: `(()=>{let b=Array.from({length:${o.n}},(_,i)=>i+1);while(b.length>1){const p=b.pop(),q=b.shift();b.push(p+q+1);}return b[0];})()` };
  },
  work(o) {
    if (o.kind === 'flip') return [{ t: 'A move changes the number of heads by 2 or by 0. Right now, is the number of heads odd or even?', v: par(o.h), choices: OE },
      { t: 'All tails means 0 heads, which is even. Can you get there?', v: o.ans, choices: YN }];
    if (o.kind === 'steps') { const g = gcd(o.a, o.b); return [{ t: `The biggest number that divides both ${o.a} and ${o.b}`, v: g }, { t: `Every move keeps the remainder ÷ ${g}. What does ${o.s} leave?`, v: o.s % g },
      { t: `What does ${o.N} leave?`, v: o.N % g }, { t: 'Do they match — can you reach it?', v: o.ans, choices: YN }]; }
    const S = (o.n * (o.n + 1)) / 2;
    if (o.kind === 'diff') return [{ t: `The total to start: 1 + 2 + … + ${o.n}`, v: S }, { t: 'Each move lowers the total by an even amount, so its parity never changes. The last number is', v: o.ans, choices: OE }];
    return [{ t: `The total to start: 1 + 2 + … + ${o.n}`, v: S }, { t: 'Each move turns two numbers into one. How many moves until one is left?', v: o.n - 1 }, { t: 'Each move adds exactly 1 to the total', v: o.ans }];
  },
  draw(o) {
    if (o.kind === 'flip') {
      let s = ''; const u = Math.min(36, Math.floor(340 / o.n));
      for (let i = 0; i < o.n; i++) s += `<circle cx="${6 + u / 2 + i * u}" cy="24" r="${u / 2 - 3}" class="${i < o.h ? 'dg-dot' : 'dg-dot2'}"/>` + TX(6 + u / 2 + i * u, 29, i < o.h ? 'H' : 'T');
      return kit.svg(o.n * u + 12, 48, s, `${o.n} coins, ${o.h} heads`);
    }
    if (o.kind === 'steps') { const lo = Math.min(o.s, o.N), hi = Math.max(o.s, o.N), st = Math.max(1, Math.ceil((hi - lo + 10) / 100) * 10); const a = Math.floor((lo - 5) / st) * st, b = Math.ceil((hi + 5) / st) * st;
      return kit.numberLine(a, b, st, o.s === o.N ? { [o.s]: 'start' } : { [o.s]: 'start', [o.N]: '?' }); }
    const shown = o.n <= 12 ? Array.from({ length: o.n }, (_, i) => i + 1).join('  ') : `1  2  3  4  5  …  ${o.n - 1}  ${o.n}`;
    return kit.svg(360, 70, `<rect x="4" y="4" width="352" height="62" rx="8" class="dg-blank"/>${TX(180, 42, shown, 'dg-text')}`, `A board with the numbers 1 to ${o.n}`);
  },
};

/* ------------------------------------------------------------------ the road, easiest first */

export const TRICKS = [parity, worstCase, pigeonhole, calendar, missingDigit, listSys, truthTellers, digitPuzzles, remainders, invariants];

/* ------------------------------------------------------------------ stories */

