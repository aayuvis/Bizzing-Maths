/* tricks.js — the concept chapters. The Bee's concept-chapter model, for numbers.

   The deck's promise for this product is one sentence: a child who is fast and
   fearless with numbers, AND KNOWS WHY THE TRICK WORKS. Every mental-maths app
   has the first half. The second half is the product, so every chapter here
   carries the same five parts, in the same order:

     hook   — a question the child cannot yet do in their head
     idea   — the trick, in one sentence
     work   — the trick as STEPS, each with its own number. The steps are the
              working-out: "Watch it" plays them, "Your turn" asks the child to
              type each one. That is the working-out capture the deck said the
              word engine never needed.
     why    — why it works, in plain words, then the algebra for the child who
              wants it. A trick without its reason is a party piece.
     gen    — a generator for the drill, in three levels.

   THE RULE THIS FILE KEEPS: the trick and the arithmetic must agree on every
   question it can ever generate. `work(q)`'s last step, `q.ans`, and a plain
   evaluation of `q.expr` are three independent routes to the answer, and
   test/tricks.mjs runs thousands of generated questions through all three.
   A trick that is wrong one time in a thousand teaches a child that maths is
   unreliable, which is the one thing this app must never teach.

   Fields that exist here and must have an effect: `band` gates the stop by age
   band (atlas.js), `sutra` is shown on the chapter, `fig` draws the picture,
   `sources` is printed. Nothing is decoration. */

import { int, pick } from './rand.js';

const digits = (n) => String(n).split('').map(Number);
const dsum = (n) => digits(n).reduce((a, b) => a + b, 0);
// a step's x: the digit sum of an expression, as plain arithmetic on it (the second route)
const dsumX = (e, n = 7) => Array.from({ length: n }, (_, k) => `Math.floor((${e})/${10 ** k})%10`).join('+');
export const droot = (n) => { let x = n; while (x > 9) x = dsum(x); return x; };

/* ------------------------------------------------------------------ worlds */

const CORE_WORLDS = [
  { id: 'gardens', n: 1, name: 'The Ten Gardens', short: 'Gardens', band: '6-7',
    blurb: 'Adding and taking away, without counting on your fingers.',
    tint: '#E6F4EA', ink: '#1C6B3A', glyph: '🌱' },
  { id: 'market', n: 2, name: 'The Times Market', short: 'Market', band: '6-7',
    blurb: 'Every times table has a shortcut. Here are the good ones.',
    tint: '#FFF1DC', ink: '#8A4B00', glyph: '🧺' },
  { id: 'workshop', n: 3, name: 'The Mental Workshop', short: 'Workshop', band: '8-10',
    blurb: 'Round it, split it, move it — big sums in your head.',
    tint: '#E8EEFB', ink: '#23408E', glyph: '🛠️' },
  { id: 'observatory', n: 4, name: 'The Sutra Observatory', short: 'Observatory', band: '8-10',
    blurb: 'The Vedic methods — and the algebra that makes them work.',
    tint: '#EFE8FB', ink: '#4B2A8F', glyph: '🔭',
    intro: {
      title: 'Where the sutras come from',
      body: [
        'The short Sanskrit sayings in this part of the Atlas — the sutras — were set out by Bharati Krishna Tirtha in a book called Vedic Mathematics, published in 1965, five years after he died.',
        'He said they came from the Vedas. Scholars who have looked have not found them in any Vedic text, so the honest name is: methods from a twentieth-century Indian book, with Sanskrit names.',
        'That takes nothing away from them. They are quick, they are clever, and every one of them works for a reason you can check — ordinary algebra. That reason is what each stop here shows you.',
      ],
      sources: [
        'Bharati Krishna Tirtha, Vedic Mathematics (Motilal Banarsidass, 1965).',
        'S. G. Dani, "Myths and reality: on \'Vedic mathematics\'", Frontline, 1993.',
      ],
    } },
  { id: 'harbour', n: 5, name: 'The Number Harbour', short: 'Harbour', band: '11-14',
    blurb: 'Checks, divisibility, percentages and squares — number sense for contests.',
    tint: '#E2F1F4', ink: '#0E5A66', glyph: '⚓' },
];

/* ---------------------------------------------------------------- chapters */

const CORE = [
  /* ================================================ THE TEN GARDENS */
  {
    id: 'make-ten', world: 'gardens', band: '6-7', title: 'Make ten first',
    hook: '8 + 5 — can you do it without counting on?',
    idea: 'Give the big number enough to make 10, then add what is left.',
    why: [
      'Ten is the number our whole counting system is built on, so 10 + anything is easy: 10 + 3 is just "thirteen".',
      'Moving 2 from the 5 over to the 8 does not change the total — you have the same things, in different piles.',
      'Bigger numbers make the NEXT ten the same way. 47 + 6: 47 needs 3 to make 50, and the 6 has 3 left over, so 53.',
    ],
    alg: 'a + b = 10 + (b − (10 − a))',
    ex: { a: 8, b: 5 },
    caseKey: 'bridge',
    cases: [
      { label: 'Make ten', note: 'The big number borrows just enough from the small one to reach 10. Ten and a bit is easy to say.',
        ex: { a: 8, b: 5 } },
      { label: 'Make the next ten', note: 'With a bigger number the target is not 10 but the next ten up — for 47 that is 50. The move is exactly the same.',
        ex: { a: 47, b: 6 } },
    ],
    gen(r, lv = 1) {
      // level 3 makes the next ten, not ten itself; the ones digit stays 5–9 so
      // the gap is small enough to leave something of b over
      const a = lv === 1 ? int(6, 9, r) : lv === 2 ? int(5, 9, r) : int(1, 8, r) * 10 + int(5, 9, r);
      const top = lv === 3 ? Math.ceil((a + 1) / 10) * 10 : 10;
      const need = top - a;
      const b = int(Math.max(need + 1, 2), 9, r);
      return this.q({ a, b });
    },
    q({ a, b }) { return { a, b, bridge: a < 10 ? 'ten' : 'next ten', text: `${a} + ${b}`, expr: `${a}+${b}`, ans: a + b }; },
    work({ a, b }) {
      const top = Math.ceil((a + 1) / 10) * 10, need = top - a;
      return [
        { t: `How many does ${a} need to make ${top}?`, v: need, x: `10-${a}%10` },
        { t: `Take that from ${b}. What is left?`, v: b - need, x: `${a}+${b}-(${a}-${a}%10+10)` },
        { t: `${top} + ${b - need}`, v: a + b },
      ];
    },
    fig: ({ a, b }) => ({ kind: 'jumps', from: a, jumps: [Math.ceil((a + 1) / 10) * 10 - a, b - (Math.ceil((a + 1) / 10) * 10 - a)] }),
  },
  {
    id: 'near-doubles', world: 'gardens', band: '6-7', title: 'Near doubles',
    hook: '7 + 8 — two numbers next to each other.',
    idea: 'Double the smaller one, then add one more.',
    why: [
      'Doubles are the facts children remember first: 7 + 7 is fourteen.',
      '8 is just 7 and one more, so 7 + 8 is 7 + 7, and one more.',
    ],
    alg: 'n + (n + 1) = 2n + 1',
    ex: { a: 7, b: 8 },
    oneIdea: true,
    gen(r, lv = 1) {
      const a = lv === 1 ? int(3, 9, r) : lv === 2 ? int(6, 25, r) : int(15, 60, r);
      return this.q({ a, b: a + 1 });
    },
    q({ a, b }) { return { a, b, text: `${a} + ${b}`, expr: `${a}+${b}`, ans: a + b }; },
    work({ a, b }) {
      return [
        { t: `Double ${a}`, v: 2 * a, x: `${a}+${a}` },
        { t: 'Add one more', v: a + b },
      ];
    },
  },
  {
    id: 'plus-nine', world: 'gardens', band: '6-7', title: 'Adding nine',
    hook: '34 + 9 — nine is almost ten.',
    idea: 'Add ten instead, then take one away.',
    why: [
      'Adding ten is easy: only the tens digit changes.',
      'Nine is one less than ten, so if you add ten you have added one too many. Take it back.',
      'It is not only nine. 19 is one less than 20, 29 one less than 30, and 99 one less than 100. Add the round number, then take one away.',
    ],
    alg: 'n + 9 = n + 10 − 1',
    ex: { a: 34, b: 9 },
    caseKey: 'near',
    cases: [
      { label: 'Adding 9', note: 'Nine is ten take away one. Add ten — only the tens digit moves — then step back one.',
        ex: { a: 34, b: 9 } },
      { label: 'Adding 19 or 29', note: 'Round up to 20 or 30 instead. You still only added one too many, so you still take back just one.',
        ex: { a: 156, b: 29 } },
      { label: 'Adding 99', note: 'Ninety-nine is a hundred take away one. Add 100 — only the hundreds digit moves — then take one away.',
        ex: { a: 245, b: 99 } },
    ],
    gen(r, lv = 1) {
      const a = lv === 1 ? int(3, 29, r) : lv === 2 ? int(20, 89, r) : int(100, 899, r);
      const b = lv === 3 ? pick([9, 19, 29, 99], r) : 9;
      return this.q({ a, b });
    },
    q({ a, b }) { return { a, b, near: b === 9 ? 'ten' : b === 99 ? 'hundred' : 'tens', text: `${a} + ${b}`, expr: `${a}+${b}`, ans: a + b }; },
    work({ a, b }) {
      const up = b + 1;
      return [
        { t: `Add ${up} instead`, v: a + up, x: `${a}+${b}+1` },
        { t: 'Take one away', v: a + b },
      ];
    },
    fig: ({ a, b }) => ({ kind: 'jumps', from: a, jumps: [b + 1, -1] }),
  },
  {
    id: 'count-up', world: 'gardens', band: '6-7', title: 'Take away by counting up',
    hook: '13 − 8 — taking away across ten is where mistakes live.',
    idea: 'Count UP from the small number to the big one. The jumps are the answer.',
    why: [
      'Taking away asks "how far apart are these two numbers?" You can measure that from either end.',
      'Counting up from 8 lands on 10 first, and jumps to and from ten are the easiest jumps there are.',
      'Bigger numbers stop at the next ten instead. 45 − 38: from 38 up to 40 is 2, from 40 up to 45 is 5, so the gap is 7.',
    ],
    alg: 'a − b = (10 − b) + (a − 10)',
    ex: { a: 13, b: 8 },
    caseKey: 'bridge',
    cases: [
      { label: 'Up through ten', note: 'Stop at 10 on the way. The two little jumps — to ten, then past it — add up to the gap.',
        ex: { a: 13, b: 8 } },
      { label: 'Up through the next ten', note: 'When the numbers are bigger, stop at the next ten up — for 38 that is 40. The jumps are just as small.',
        ex: { a: 45, b: 38 } },
    ],
    gen(r, lv = 1) {
      if (lv === 3) { const b = int(12, 68, r); let a = Math.ceil((b + 1) / 10) * 10 + int(1, 9, r); if (a === 2 * b) a--; return this.q({ a, b }); }
      const b = int(lv === 1 ? 6 : 3, 9, r); let a = 10 + int(1, b - 1 || 1, r);
      if (a === 2 * b) a--;                  // 16 − 8 would show its own answer
      return this.q({ a, b });
    },
    q({ a, b }) { return { a, b, bridge: b < 10 ? 'ten' : 'next ten', text: `${a} − ${b}`, expr: `${a}-${b}`, ans: a - b }; },
    work({ a, b }) {
      const ten = Math.ceil((b + 1) / 10) * 10;
      return [
        { t: `From ${b} up to ${ten}`, v: ten - b, x: `10-${b}%10` },
        { t: `From ${ten} up to ${a}`, v: a - ten, x: `${a}-(${b}-${b}%10+10)` },
        { t: 'Add the two jumps', v: a - b },
      ];
    },
    fig: ({ a, b }) => { const ten = Math.ceil((b + 1) / 10) * 10; return { kind: 'jumps', from: b, jumps: [ten - b, a - ten] }; },
  },
  {
    id: 'tens-then-ones', world: 'gardens', band: '6-7', title: 'Tens, then ones',
    hook: '47 + 36 — two two-digit numbers, no paper.',
    idea: 'Add the tens, add the ones, then put them together.',
    why: [
      '47 is 40 and 7. 36 is 30 and 6. You can add the pieces in any order.',
      'Doing the tens first means the biggest part of the answer is fixed before you start worrying about the small part.',
      'Sometimes the ones make ten or more: 7 + 6 is 13. That is fine — 13 is one more ten and 3 ones, so 70 + 13 is 83.',
    ],
    alg: '(10a + b) + (10c + d) = 10(a + c) + (b + d)',
    ex: { a: 47, b: 36 },
    caseKey: 'carry',
    cases: [
      { label: 'The ones stay small', note: 'The ones add up to less than ten, so they just sit after the tens.',
        ex: { a: 42, b: 35 } },
      { label: 'The ones make a new ten', note: 'The ones add up to ten or more. Their extra ten joins the tens you already have, so the tens digit goes up by one.',
        ex: { a: 47, b: 36, input: 'blocks' } },
    ],
    gen(r, lv = 1) {
      const a = int(lv === 1 ? 12 : 23, lv === 3 ? 99 : 68, r), b = int(11, lv === 1 ? 29 : 89, r);
      // some answers are built with tens and ones blocks (widgets.js 'blocks')
      return this.q({ a, b, input: lv < 3 && r() < 0.3 ? 'blocks' : undefined });
    },
    q({ a, b, input }) { return { a, b, ...(input ? { input, how: 'Build the answer with tens and ones.' } : {}), carry: (a % 10) + (b % 10) > 9 ? 'yes' : 'no', text: `${a} + ${b}`, expr: `${a}+${b}`, ans: a + b }; },
    work({ a, b }) {
      const t = Math.floor(a / 10) * 10 + Math.floor(b / 10) * 10, o = (a % 10) + (b % 10);
      return [
        { t: `${Math.floor(a / 10) * 10} + ${Math.floor(b / 10) * 10}`, v: t, x: `${a}-${a}%10+${b}-${b}%10` },
        { t: `${a % 10} + ${b % 10}`, v: o, x: `${a}%10+${b}%10` },
        { t: `${t} + ${o}`, v: a + b },
      ];
    },
  },

  /* ================================================ THE TIMES MARKET */
  {
    id: 'double-double', world: 'market', band: '6-7', title: 'Double, double, double',
    hook: '7 × 8 — the one everybody forgets.',
    idea: 'Times 4 is double twice. Times 8 is double three times.',
    why: [
      '4 is 2 × 2, so multiplying by 4 is multiplying by 2 and then by 2 again.',
      '8 is 2 × 2 × 2. So 7 × 8 is 7, doubled, doubled, doubled: 14, 28, 56. You only ever need your two times table.',
    ],
    alg: 'n × 8 = ((n × 2) × 2) × 2',
    ex: { a: 7, b: 8 },
    caseKey: 'b',
    cases: [
      { label: 'Times 4: double twice', note: 'Four is two twos, so two doublings do it.',
        ex: { a: 6, b: 4 } },
      { label: 'Times 8: double 3 times', note: 'Eight is two times two times two — one more doubling than times 4. Count your doublings: three.',
        ex: { a: 7, b: 8 } },
    ],
    gen(r, lv = 1) {
      const a = lv === 1 ? int(3, 12, r) : lv === 2 ? int(6, 25, r) : int(13, 60, r);
      return this.q({ a, b: lv === 1 ? pick([4, 8], r) : 8 });
    },
    q({ a, b }) { return { a, b, text: `${a} × ${b}`, expr: `${a}*${b}`, ans: a * b }; },
    work({ a, b }) {
      const s = []; let v = a;
      for (let i = 0; i < Math.log2(b); i++) { v *= 2; s.push({ t: i === 0 ? `Double ${a}` : 'Double again', v, x: `${a}*2**${i + 1}` }); }
      return s;
    },
  },
  {
    id: 'times-five', world: 'market', band: '6-7', title: 'Times five is half of times ten',
    hook: '14 × 5 — try it without the five times table.',
    idea: 'Times it by ten, then halve it.',
    why: [
      'Five is half of ten. So five lots of anything is half of ten lots of it.',
      'Times ten is easy, halving is easy, and together they do the hard thing.',
      'An even number halves neatly: 14 × 10 is 140, and half of 140 is 70. An odd number leaves a half ten: 17 × 10 is 170, which is 160 and 10, so half is 80 and 5 — 85. An odd number times five always ends in 5.',
    ],
    alg: 'n × 5 = (n × 10) ÷ 2',
    ex: { a: 14, b: 5 },
    caseKey: 'odd',
    cases: [
      { label: 'An even number', note: 'Half of 140 is easy: half of 14 is 7, then put the 0 back. The answer ends in 0.',
        ex: { a: 14, b: 5 } },
      { label: 'An odd number', note: 'Half of 170 leaves an odd ten to split: half of 10 is 5. So the answer ends in 5.',
        ex: { a: 17, b: 5 } },
    ],
    gen(r, lv = 1) { return this.q({ a: lv === 1 ? int(3, 12, r) * 2 : int(11, lv === 2 ? 49 : 199, r), b: 5 }); },
    q({ a, b }) { return { a, b, odd: a % 2 ? 'odd' : 'even', text: `${a} × ${b}`, expr: `${a}*${b}`, ans: a * b }; },
    work({ a }) { return [{ t: `${a} × 10`, v: a * 10, x: `${a}*10` }, { t: 'Halve it', v: a * 5 }]; },
  },
  {
    id: 'times-nine', world: 'market', band: '6-7', title: 'Times nine',
    hook: '7 × 9 — nine is one short of ten.',
    idea: 'Ten lots, then take one lot away.',
    why: [
      'Nine lots of 7 is ten lots of 7 with one lot missing.',
      'Ten lots of 7 is 70. Take away one 7 and you have 63. (Look at the answers down the nine times table: the digits always add up to nine. That is the same reason, showing through.)',
    ],
    alg: 'n × 9 = n × 10 − n',
    ex: { a: 7, b: 9 },
    oneIdea: true,
    gen(r, lv = 1) { return this.q({ a: lv === 1 ? int(2, 12, r) : int(12, lv === 2 ? 30 : 99, r), b: 9 }); },
    q({ a, b }) { return { a, b, text: `${a} × ${b}`, expr: `${a}*${b}`, ans: a * b }; },
    work({ a }) { return [{ t: `${a} × 10`, v: a * 10, x: `${a}*10` }, { t: `Take away one ${a}`, v: a * 9 }]; },
  },
  {
    id: 'times-twelve', world: 'market', band: '6-7', title: 'Split the hard one',
    hook: '7 × 12 — twelve is the table nobody likes.',
    idea: 'Twelve is ten and two. Do each, then add.',
    why: [
      'Seven lots of 12 is seven lots of 10 and seven lots of 2, side by side.',
      'Draw it as a rectangle 7 tall and 12 wide, cut it at 10, and the two pieces are the two easy sums.',
    ],
    alg: 'n × 12 = n × 10 + n × 2',
    ex: { a: 7, b: 12 },
    oneIdea: true,
    gen(r, lv = 1) { return this.q({ a: lv === 1 ? int(3, 12, r) : int(11, lv === 2 ? 25 : 60, r), b: 12 }); },
    q({ a, b }) { return { a, b, text: `${a} × ${b}`, expr: `${a}*${b}`, ans: a * b }; },
    work({ a }) { return [{ t: `${a} × 10`, v: a * 10, x: `${a}*10` }, { t: `${a} × 2`, v: a * 2, x: `${a}+${a}` }, { t: 'Add them', v: a * 12 }]; },
    fig: ({ a }) => ({ kind: 'area', h: a, parts: [10, 2] }),
  },
  {
    id: 'times-eleven', world: 'market', band: '8-10', title: 'Eleven times a two-digit number',
    hook: '43 × 11 — in two seconds.',
    idea: 'Split the digits apart and put their sum in the middle.',
    why: [
      '43 × 11 is 43 × 10 plus 43: 430 + 43. Line them up and the middle column is 3 + 4 — the two digits added.',
      'If the two digits add up to 10 or more, the middle carries one into the hundreds: 78 × 11 is 7, then 15, then 8 — so 858.',
      'A three-digit number goes back to where the trick came from: times ten, then add the number once more. 234 × 11 = 2340 + 234 = 2574.',
    ],
    alg: '(10a + b) × 11 = 100a + 10(a + b) + b',
    ex: { a: 43, b: 11 },
    caseKey: 'way',
    cases: [
      { label: 'The digits add to under 10', note: 'Pull the two digits apart and drop their sum in the gap between them.',
        ex: { a: 43, b: 11 } },
      { label: 'The middle carries', note: 'When the two digits make 10 or more, only the ones of that sum go in the middle. The ten carries into the front digit.',
        ex: { a: 78, b: 11 } },
      { label: 'A three-digit number', note: 'The split-apart trick gets messy here, so use the reason behind it: eleven lots is ten lots and one more lot.',
        ex: { a: 234, b: 11 } },
    ],
    gen(r, lv = 1) {
      let a;
      if (lv === 1) { const t = int(1, 8, r); a = t * 10 + int(0, 9 - t, r); }   // no carry
      else a = int(lv === 2 ? 12 : 100, lv === 2 ? 99 : 999, r);
      return this.q({ a, b: 11 });
    },
    q({ a, b }) {
      const way = a >= 100 ? 'three digits' : Math.floor(a / 10) + (a % 10) > 9 ? 'carry' : 'plain';
      return { a, b, way, text: `${a} × ${b}`, expr: `${a}*${b}`, ans: a * b };
    },
    work({ a }) {
      if (a >= 100) return [{ t: `${a} × 10`, v: a * 10, x: `${a}*10` }, { t: `Add ${a}`, v: a * 11 }];
      const t = Math.floor(a / 10), o = a % 10;
      return [{ t: `${t} + ${o} — the middle`, v: t + o, x: `Math.floor(${a}/10)+${a}%10` }, { t: `${t} … ${t + o} … ${o}${t + o > 9 ? ' (carry the one)' : ''}`, v: a * 11 }];
    },
  },

  /* ================================================ THE MENTAL WORKSHOP */
  {
    id: 'round-add', world: 'workshop', band: '8-10', title: 'Round it, then fix it',
    hook: '47 + 38 — 38 is nearly 40.',
    idea: 'Add a round number instead, then give back what you added too much.',
    why: [
      '38 is 40 with 2 missing. Adding 40 is easy, but it adds 2 more than you wanted.',
      'So take those 2 back off at the end. This is called compensation, and people who are quick at sums do it without noticing.',
    ],
    alg: 'a + (10k − d) = (a + 10k) − d',
    ex: { a: 47, b: 38 },
    oneIdea: true,
    gen(r, lv = 1) {
      const b = int(lv === 1 ? 1 : 2, lv === 3 ? 29 : 9, r) * 10 - int(1, 3, r);
      return this.q({ a: int(lv === 1 ? 11 : 25, lv === 3 ? 499 : 89, r), b });
    },
    q({ a, b }) { return { a, b, text: `${a} + ${b}`, expr: `${a}+${b}`, ans: a + b }; },
    work({ a, b }) {
      const up = Math.ceil(b / 10) * 10;
      return [{ t: `${a} + ${up}`, v: a + up, x: `${a}+${b}+(10-${b}%10)` }, { t: `Give back ${up - b}`, v: a + b }];
    },
    fig: ({ a, b }) => { const up = Math.ceil(b / 10) * 10; return { kind: 'jumps', from: a, jumps: [up, b - up] }; },
  },
  {
    id: 'round-sub', world: 'workshop', band: '8-10', title: 'Take too much, give it back',
    hook: '83 − 29 — 29 is nearly 30.',
    idea: 'Take away the round number, then add back the extra you took.',
    why: [
      'Taking away 30 takes one more than 29. So you have taken too much — by exactly one.',
      'Put it back. This is the same trick as rounding when you add, run backwards.',
    ],
    alg: 'a − (10k − d) = (a − 10k) + d',
    ex: { a: 83, b: 29 },
    oneIdea: true,
    gen(r, lv = 1) {
      const b = int(lv === 1 ? 1 : 2, lv === 3 ? 19 : 6, r) * 10 - int(1, 3, r);
      let a = b + int(10, lv === 3 ? 400 : 60, r);
      if (a === 2 * b) a--;                  // a half shows its own answer
      return this.q({ a, b });
    },
    q({ a, b }) { return { a, b, text: `${a} − ${b}`, expr: `${a}-${b}`, ans: a - b }; },
    work({ a, b }) {
      const up = Math.ceil(b / 10) * 10;
      return [{ t: `${a} − ${up}`, v: a - up, x: `${a}-${b}-(10-${b}%10)` }, { t: `Add back ${up - b}`, v: a - b }];
    },
    fig: ({ a, b }) => { const up = Math.ceil(b / 10) * 10; return { kind: 'jumps', from: a, jumps: [-up, up - b] }; },
  },
  {
    id: 'split-multiply', world: 'workshop', band: '8-10', title: 'Split and multiply',
    hook: '7 × 46 — bigger than the times table.',
    idea: 'Split 46 into 40 and 6. Multiply each by 7, then add.',
    why: [
      'Seven lots of 46 is seven lots of 40 and seven lots of 6.',
      'As a picture it is a rectangle 7 by 46, cut into a 7-by-40 piece and a 7-by-6 piece. The areas add up to the whole.',
    ],
    alg: 'a × (10t + u) = a × 10t + a × u',
    ex: { a: 7, b: 46 },
    oneIdea: true,
    gen(r, lv = 1) {
      const a = int(3, 9, r), b = lv === 1 ? int(2, 5, r) * 10 + int(1, 5, r) : int(13, lv === 2 ? 98 : 998, r);
      return this.q({ a, b: b % 10 === 0 ? b + 3 : b });
    },
    q({ a, b }) { return { a, b, text: `${a} × ${b}`, expr: `${a}*${b}`, ans: a * b }; },
    work({ a, b }) {
      const big = b - (b % 10), u = b % 10;
      return [{ t: `${a} × ${big}`, v: a * big, x: `${a}*(${b}-${b}%10)` }, { t: `${a} × ${u}`, v: a * u, x: `${a}*(${b}%10)` }, { t: 'Add them', v: a * b }];
    },
    fig: ({ a, b }) => ({ kind: 'area', h: a, parts: [b - (b % 10), b % 10] }),
  },
  {
    id: 'times-25', world: 'workshop', band: '8-10', title: 'Times 25 is a quarter of 100',
    hook: '36 × 25 — think money.',
    idea: 'Divide by 4, then times by 100.',
    why: [
      'Four 25s make 100, like four quarters make a dollar.',
      'So 36 lots of 25 is 36 quarters — 9 whole hundreds.',
    ],
    alg: 'n × 25 = (n ÷ 4) × 100',
    ex: { a: 36, b: 25 },
    oneIdea: true,
    gen(r, lv = 1) { return this.q({ a: int(1, lv === 1 ? 12 : lv === 2 ? 25 : 99, r) * 4, b: 25 }); },
    q({ a, b }) { return { a, b, text: `${a} × ${b}`, expr: `${a}*${b}`, ans: a * b }; },
    work({ a }) { return [{ t: `${a} ÷ 4`, v: a / 4, x: `${a}/4` }, { t: '× 100', v: a * 25 }]; },
  },
  {
    id: 'halve-double', world: 'workshop', band: '8-10', title: 'Halve one, double the other',
    hook: '16 × 35 — neither number is friendly.',
    idea: 'Halve one number and double the other. The answer does not change — but the sum gets easier.',
    why: [
      'Picture a rectangle 16 wide and 35 tall. Cut it in half down the middle and stack the halves: now it is 8 wide and 70 tall. Same area.',
      'Keep going until one number is easy: 16 × 35 = 8 × 70 = 560.',
    ],
    alg: 'a × b = (a ÷ 2) × (b × 2)',
    ex: { a: 16, b: 35 },
    oneIdea: true,
    gen(r, lv = 1) {
      const a = int(2, lv === 1 ? 9 : 24, r) * 2, b = int(1, lv === 3 ? 19 : 9, r) * 10 + 5;
      return this.q({ a, b });
    },
    q({ a, b }) { return { a, b, text: `${a} × ${b}`, expr: `${a}*${b}`, ans: a * b }; },
    work({ a, b }) {
      return [{ t: `Halve ${a}`, v: a / 2, x: `${a}/2` }, { t: `Double ${b}`, v: b * 2, x: `${b}+${b}` }, { t: `${a / 2} × ${b * 2}`, v: a * b }];
    },
  },

  /* ================================================ THE SUTRA OBSERVATORY */
  {
    id: 'square-five', world: 'observatory', band: '8-10', title: 'Squaring numbers that end in 5',
    sutra: { sa: 'Ekādhikena Pūrvena', en: 'by one more than the one before' },
    hook: '35 × 35 — in your head, in three seconds.',
    idea: 'Take the front digit, multiply it by the next number up, and write 25 on the end.',
    why: [
      '35 × 35: the front digit is 3, one more than it is 4, and 3 × 4 = 12. Write 25 after it: 1225.',
      'It works for every number ending in 5, always. A number ending in 5 is ten lots of something, plus 5. Square it and the middle always lands exactly on a whole number of hundreds — n lots of (n + 1) hundreds — and the 5 × 5 on the end is always 25.',
    ],
    alg: '(10n + 5)² = 100·n(n + 1) + 25',
    ex: { a: 35 },
    oneIdea: true,
    gen(r, lv = 1) { return this.q({ a: int(1, lv === 1 ? 9 : lv === 2 ? 14 : 19, r) * 10 + 5 }); },
    q({ a }) { return { a, b: a, text: `${a}²`, say: `${a} squared`, expr: `${a}*${a}`, ans: a * a }; },
    work({ a }) {
      const n = Math.floor(a / 10);
      return [{ t: `${n} × ${n + 1}`, v: n * (n + 1), x: `(${a}*${a}-25)/100` }, { t: 'Write 25 on the end', v: a * a }];
    },
    fig: ({ a }) => ({ kind: 'area', h: a, parts: [a - 5, 5], vparts: [a - 5, 5] }),
  },
  {
    id: 'nikhilam-10', world: 'observatory', band: '8-10', title: 'Near ten: the cross',
    sutra: { sa: 'Nikhilam Navataścaramaṁ Daśataḥ', en: 'all from nine and the last from ten' },
    hook: '8 × 7 — using only how far each is from 10.',
    idea: 'Find how far each number is below 10. Cross-subtract for the tens; multiply the gaps for the ones.',
    why: [
      '8 is 2 below 10, and 7 is 3 below. Take 3 from 8 (or 2 from 7 — the same, always): 5 tens. Multiply the gaps: 2 × 3 = 6 ones. So 56.',
      'If the gaps multiply to 10 or more, carry: 6 × 7 → gaps 4 and 3, 6 − 3 = 3 tens, 4 × 3 = 12 ones, and 30 + 12 = 42.',
      'Why: multiplying (10 − x) by (10 − y) always leaves 10 lots of (10 − x − y), and x × y over. The cross IS 10 − x − y.',
    ],
    alg: '(10 − x)(10 − y) = 10(10 − x − y) + xy',
    ex: { a: 8, b: 7 },
    caseKey: 'carry',
    cases: [
      { label: 'The gaps make the ones', note: 'The gaps multiply to less than 10, so their product is simply the ones digit.',
        ex: { a: 8, b: 7 } },
      { label: 'The gaps make 10 or more', note: 'Now the gaps multiply to 10 or more. Do not squeeze two digits into the ones place — add them on: 3 tens and 12 is 42.',
        ex: { a: 6, b: 7 } },
    ],
    gen(r, lv = 1) { return this.q({ a: int(lv === 1 ? 7 : 5, 9, r), b: int(lv === 1 ? 7 : 5, 9, r) }); },
    q({ a, b }) { return { a, b, carry: (10 - a) * (10 - b) > 9 ? 'yes' : 'no', text: `${a} × ${b}`, expr: `${a}*${b}`, ans: a * b }; },
    work({ a, b }) {
      const x = 10 - a, y = 10 - b;
      return [
        { t: `How far is ${a} below 10?`, v: x, x: `10-${a}` },
        { t: `How far is ${b} below 10?`, v: y, x: `10-${b}` },
        { t: `Cross: ${a} − ${y} (tens)`, v: a - y, x: `${a}+${b}-10` },
        { t: `Multiply the gaps: ${x} × ${y}`, v: x * y, x: `${a}*${b}-10*(${a}+${b}-10)` },
        { t: `${a - y} tens and ${x * y}`, v: a * b },
      ];
    },
  },
  {
    id: 'nikhilam-100', world: 'observatory', band: '8-10', title: 'Near a hundred',
    sutra: { sa: 'Nikhilam Navataścaramaṁ Daśataḥ', en: 'all from nine and the last from ten' },
    hook: '97 × 96 — a four-digit answer, in your head.',
    idea: 'The same cross, around 100: cross-subtract for the hundreds, multiply the gaps for the last two digits.',
    why: [
      '97 is 3 below 100, 96 is 4 below. 97 − 4 = 93 hundreds. 3 × 4 = 12, written as two digits. Answer: 9312.',
      'The last part always gets TWO places, because the base is 100 — so a small one needs a 0 in front: 98 × 97 is 95 hundreds and 06, which is 9506. If the gaps multiply to 100 or more, the extra hundreds carry across: 88 × 87 → 75 hundreds and 12 × 13 = 156, so 7500 + 156 = 7656.',
    ],
    alg: '(100 − x)(100 − y) = 100(100 − x − y) + xy',
    ex: { a: 97, b: 96 },
    caseKey: 'fit',
    cases: [
      { label: 'The gaps make two digits', note: 'The gaps multiply to a two-digit number, which fills the last two places exactly.',
        ex: { a: 97, b: 96 } },
      { label: 'The gaps make under 10', note: 'The last part still needs two places, so write a 0 in front: 2 × 3 is 06, not 6.',
        ex: { a: 98, b: 97 } },
      { label: 'The gaps make 100 or more', note: 'Three digits will not fit in two places. The extra hundred carries across to join the hundreds.',
        ex: { a: 88, b: 87 } },
    ],
    gen(r, lv = 1) { const lo = lv === 1 ? 91 : lv === 2 ? 86 : 80; return this.q({ a: int(lo, 99, r), b: int(lo, 99, r) }); },
    q({ a, b }) { return { a, b, fit: (100 - a) * (100 - b) < 10 ? 'under 10' : (100 - a) * (100 - b) < 100 ? 'two digits' : '100 or more', text: `${a} × ${b}`, expr: `${a}*${b}`, ans: a * b }; },
    work({ a, b }) {
      const x = 100 - a, y = 100 - b;
      return [
        { t: `${a} is how far below 100?`, v: x, x: `100-${a}` },
        { t: `${b} is how far below 100?`, v: y, x: `100-${b}` },
        { t: `Cross: ${a} − ${y} (hundreds)`, v: a - y, x: `${a}+${b}-100` },
        { t: `Gaps: ${x} × ${y} (last two digits)`, v: x * y, x: `${a}*${b}-100*(${a}+${b}-100)` },
        { t: `${a - y} hundreds and ${x * y}`, v: a * b },
      ];
    },
  },
  {
    id: 'above-100', world: 'observatory', band: '8-10', title: 'Just above a hundred',
    sutra: { sa: 'Nikhilam', en: 'the same method, above the base' },
    hook: '104 × 107 — above the base works too.',
    idea: 'Add one number to the other one\'s surplus; then multiply the surpluses for the last two digits.',
    why: [
      '104 is 4 over, 107 is 7 over. 104 + 7 = 111 hundreds. 4 × 7 = 28. Answer: 11128.',
      'Below the base you subtract across; above it you add. It is the same algebra with the signs turned over.',
      'The last part still gets two places: 102 × 103 is 105 hundreds and 06, so 10506. And if the surpluses multiply to 100 or more, the extra hundreds carry: 112 × 115 is 127 hundreds and 180, so 12880.',
    ],
    alg: '(100 + x)(100 + y) = 100(100 + x + y) + xy',
    ex: { a: 104, b: 107 },
    caseKey: 'fit',
    cases: [
      { label: 'Surpluses make two digits', note: 'The surpluses multiply to a two-digit number, which fills the last two places exactly.',
        ex: { a: 104, b: 107 } },
      { label: 'Surpluses make under 10', note: 'The last part still needs two places, so write a 0 in front: 2 × 3 is 06, not 6.',
        ex: { a: 102, b: 103 } },
      { label: 'Surpluses make 100 or more', note: 'Three digits will not fit in two places. The extra hundred carries across to join the hundreds.',
        ex: { a: 112, b: 115 } },
    ],
    gen(r, lv = 1) { const hi = lv === 1 ? 109 : lv === 2 ? 115 : 125; return this.q({ a: int(101, hi, r), b: int(101, hi, r) }); },
    q({ a, b }) { return { a, b, fit: (a - 100) * (b - 100) < 10 ? 'under 10' : (a - 100) * (b - 100) < 100 ? 'two digits' : '100 or more', text: `${a} × ${b}`, expr: `${a}*${b}`, ans: a * b }; },
    work({ a, b }) {
      const x = a - 100, y = b - 100;
      return [
        { t: `${a} is how far above 100?`, v: x, x: `${a}-100` },
        { t: `${b} is how far above 100?`, v: y, x: `${b}-100` },
        { t: `Cross: ${a} + ${y} (hundreds)`, v: a + y, x: `${a}+${b}-100` },
        { t: `Surpluses: ${x} × ${y}`, v: x * y, x: `${a}*${b}-100*(${a}+${b}-100)` },
        { t: `${a + y} hundreds and ${x * y}`, v: a * b },
      ];
    },
  },
  {
    id: 'all-from-nine', world: 'observatory', band: '8-10', title: 'Taking from 1000',
    sutra: { sa: 'Nikhilam Navataścaramaṁ Daśataḥ', en: 'all from nine and the last from ten' },
    hook: '1000 − 357 — without a single borrow.',
    idea: 'Take every digit from 9, except the last one, which you take from 10.',
    why: [
      '1000 is 999 + 1. Taking a number from 999 never borrows, because no digit is bigger than 9: 999 − 357 = 642.',
      'Then add back the 1 — which is the same as taking the LAST digit from 10 instead of 9. 643.',
      'From 10000 it is the same with four digits: 10000 is 9999 + 1. If the number you take away is shorter, like 357, write it as 0357 first — that front 0 comes from 9 as a 9, so 10000 − 357 = 9643.',
    ],
    alg: '1000 − n = (999 − n) + 1',
    ex: { a: 1000, b: 357 },
    caseKey: ['a', 'short'],
    cases: [
      { label: 'From 1000', note: 'Three digits: the first two come from 9, the last one from 10. No borrowing anywhere.',
        ex: { a: 1000, b: 357 } },
      { label: 'From 10000', note: 'One more zero means one more digit. Still every digit from 9 except the last, which comes from 10.',
        ex: { a: 10000, b: 4618 } },
      { label: 'A shorter number', note: 'Only three digits to take from four places? Put a 0 in front first — 0357 — and that 0 from 9 gives a 9.',
        ex: { a: 10000, b: 357 } },
    ],
    gen(r, lv = 1) {
      const a = lv === 3 ? 10000 : 1000;
      let b = int(lv === 1 ? 111 : 101, lv === 3 ? 9999 : 999, r);
      if (b % 10 === 0) b += int(1, 9, r);
      return this.q({ a, b: Math.min(b, a - 1) });
    },
    q({ a, b }) { return { a, b, short: String(b).length < String(a).length - 1, text: `${a} − ${b}`, expr: `${a}-${b}`, ans: a - b }; },
    work({ a, b }) {
      const w = String(a).length - 1, d = String(b).padStart(w, '0').split('').map(Number);
      const s = d.slice(0, -1).map((x, i) => ({ t: `9 − ${x}${i === 0 ? ' (first digit)' : ''}`, v: 9 - x, x: `9-Math.floor(${b}/${10 ** (w - 1 - i)})%10` }));
      s.push({ t: `10 − ${d.at(-1)} (last digit)`, v: 10 - d.at(-1), x: `10-${b}%10` });
      s.push({ t: 'Read the digits', v: a - b });
      return s;
    },
  },
  {
    id: 'crosswise', world: 'observatory', band: '11-14', title: 'Vertically and crosswise',
    sutra: { sa: 'Ūrdhva-tiryagbhyām', en: 'vertically and crosswise' },
    hook: '23 × 41 — any two-digit numbers, one line.',
    idea: 'Multiply the units (vertically), then cross-multiply and add (crosswise), then the tens (vertically). Carry as you go.',
    why: [
      '23 × 41: units 3 × 1 = 3. Crosswise 2 × 1 + 3 × 4 = 14 — write 4, carry 1. Tens 2 × 4 = 8, plus the carried 1 = 9. Answer: 943.',
      'It is the long-multiplication grid with all four boxes added in your head, column by column, right to left. The crosswise step is the two boxes that both land in the tens column.',
      'The units can carry too. 27 × 34: units 7 × 4 = 28 — write 8, carry 2. Crosswise 2 × 4 + 7 × 3 = 29, plus the 2 is 31 — write 1, carry 3. Tens 2 × 3 = 6, plus 3 is 9. Answer: 918.',
    ],
    alg: '(10a + b)(10c + d) = 100ac + 10(ad + bc) + bd',
    ex: { a: 23, b: 41 },
    caseKey: 'carry',
    cases: [
      { label: 'No carrying', note: 'Every step gives a single digit, so the three answers are simply the three digits, read tens-first.',
        ex: { a: 21, b: 32 } },
      { label: 'The crosswise carries', note: 'The crosswise step makes 10 or more. Keep its ones digit and carry the ten into the next step.',
        ex: { a: 23, b: 41 } },
      { label: 'The units carry', note: 'Now the very first step makes 10 or more. Its tens join the crosswise sum before you write anything.',
        ex: { a: 27, b: 34 } },
    ],
    gen(r, lv = 1) {
      if (lv === 1) return this.q({ a: int(1, 4, r) * 10 + int(1, 4, r), b: int(1, 4, r) * 10 + int(1, 3, r) });
      return this.q({ a: int(11, 99, r), b: int(11, lv === 2 ? 59 : 99, r) });
    },
    q({ a, b }) {
      const u = (a % 10) * (b % 10), x = Math.floor(a / 10) * (b % 10) + (a % 10) * Math.floor(b / 10) + Math.floor(u / 10);
      return { a, b, carry: u > 9 ? 'units' : x > 9 ? 'crosswise' : 'none', text: `${a} × ${b}`, expr: `${a}*${b}`, ans: a * b };
    },
    work({ a, b }) {
      const [p, q] = [Math.floor(a / 10), a % 10], [s, t] = [Math.floor(b / 10), b % 10];
      return [
        { t: `Units: ${q} × ${t}`, v: q * t, x: `(${a}%10)*(${b}%10)` },
        { t: `Crosswise: ${p} × ${t} + ${q} × ${s}`, v: p * t + q * s, x: `Math.floor(${a}/10)*(${b}%10)+(${a}%10)*Math.floor(${b}/10)` },
        { t: `Tens: ${p} × ${s}`, v: p * s, x: `Math.floor(${a}/10)*Math.floor(${b}/10)` },
        { t: 'Carry and read', v: a * b },
      ];
    },
    fig: ({ a, b }) => ({ kind: 'grid', a, b }),
  },
  {
    id: 'square-near-100', world: 'observatory', band: '11-14', title: 'Squares near a hundred',
    sutra: { sa: 'Yāvadūnam', en: 'by however much it falls short' },
    hook: '96² — without multiplying 96 by 96.',
    idea: 'Take the number down by its own gap from 100; then square the gap for the last two digits.',
    why: [
      '96 is 4 short of 100. Go down another 4: 92. Square the gap: 16. Answer: 9216.',
      'Above works the same way, going up: 103 is 3 over, 103 + 3 = 106, 3² = 09, so 10609. It is the Near-a-hundred cross with both numbers the same.',
      'The squared gap always gets two places. If it is under 10, write a 0 in front (09). If it is 100 or more, the hundred carries: 88 is 12 short, 88 − 12 = 76, 12² = 144, so 7600 + 144 = 7744.',
    ],
    alg: '(100 − d)² = 100(100 − 2d) + d²',
    ex: { a: 96 },
    caseKey: 'way',
    cases: [
      { label: 'Short of 100', note: 'Below 100, go DOWN by the gap a second time, then write the gap squared on the end.',
        ex: { a: 96 } },
      { label: 'Over 100', note: 'Above 100, go UP by the gap a second time instead. The squared gap goes on the end just the same.',
        ex: { a: 104 } },
      { label: 'A tiny gap', note: 'The squared gap is a single digit, but it still takes two places: 2² is written 04.',
        ex: { a: 98 } },
      { label: 'A big gap', note: 'The squared gap is 100 or more — too big for two places — so its hundred carries across to join the rest.',
        ex: { a: 88 } },
    ],
    gen(r, lv = 1) {
      const d = int(1, lv === 1 ? 5 : lv === 2 ? 9 : 14, r);
      return this.q({ a: lv === 1 || r() < 0.6 ? 100 - d : 100 + d });
    },
    q({ a }) {
      const d = a - 100, way = d * d > 99 ? 'big gap' : d * d < 10 ? 'tiny gap' : d < 0 ? 'short' : 'over';
      return { a, b: a, way, text: `${a}²`, say: `${a} squared`, expr: `${a}*${a}`, ans: a * a };
    },
    work({ a }) {
      const d = a - 100;
      return [
        { t: `How far from 100?${d > 0 ? ' (over)' : ' (short)'}`, v: Math.abs(d), x: `Math.abs(${a}-100)` },
        { t: d > 0 ? `Go up again: ${a} + ${d}` : `Go down again: ${a} − ${-d}`, v: a + d, x: `2*${a}-100` },
        { t: `Square the gap: ${Math.abs(d)}²`, v: d * d, x: `(${a}-100)**2` },
        { t: `${a + d} hundreds and ${d * d}`, v: a * a },
      ];
    },
  },

  /* ================================================ THE NUMBER HARBOUR */
  {
    id: 'digit-root', world: 'harbour', band: '11-14', title: 'The nines check',
    hook: 'You worked out 47 × 23 = 1081. Is it right? Check in five seconds.',
    idea: 'Add a number\'s digits, and keep adding until one digit is left. Answers keep the same "digit root" as the sum that made them.',
    why: [
      '47 → 4 + 7 = 11 → 2. 23 → 5. 2 × 5 = 10 → 1. And 1081 → 10 → 1. They match, so the answer passes.',
      'This works because 10 is 9 + 1, so every number leaves the same remainder when you divide by 9 as its digits do. Mathematicians have called it "casting out nines" for more than a thousand years.',
      'It catches most slips but not all: it cannot see two digits swapped, because 1081 and 1801 have the same digits. It is a check, not a proof.',
    ],
    alg: 'n ≡ (sum of its digits) mod 9',
    ex: { a: 7384 },
    caseKey: 'rounds',
    cases: [
      { label: 'One round of adding', note: 'The digits add up to a single digit straight away, so that digit is the root.',
        ex: { a: 312 } },
      { label: 'Keep adding', note: 'The first sum still has two digits. Do not stop there — add ITS digits, and keep going until one is left.',
        ex: { a: 7384 } },
    ],
    gen(r, lv = 1) { return this.q({ a: int(lv === 1 ? 20 : 100, lv === 1 ? 99 : lv === 2 ? 9999 : 999999, r) }); },
    q({ a }) { return { a, rounds: dsum(a) > 9 ? 'again' : 'once', text: `Digit root of ${a}`, say: `the digit root of ${a}`, expr: `((${a}-1)%9)+1`, ans: droot(a) }; },
    work({ a }) {
      const s = []; let x = a, e = `${a}`;
      while (x > 9) { const y = dsum(x); e = `(${dsumX(e)})`; s.push({ t: `Add the digits of ${x}`, v: y, x: e }); x = y; }
      if (!s.length) s.push({ t: 'Already one digit', v: a });
      return s;
    },
  },
  {
    id: 'divisible-3', world: 'harbour', band: '11-14', title: 'Divisible by 3 or 9?',
    hook: 'Does 7,851 split into threes? No dividing allowed.',
    idea: 'Add up the digits. If the digit sum is in the 3 times table, so is the number. Same for 9.',
    why: [
      '7 + 8 + 5 + 1 = 21, and 21 is 3 × 7. So 7,851 is divisible by 3. (21 is not in the 9 times table, so 7,851 is not divisible by 9.)',
      'It is the nines check again: a number and its digit sum leave the same remainder when you divide by 9 — and so by 3 as well, because 9 is 3 × 3.',
    ],
    alg: '10ᵏ ≡ 1 (mod 9) ⇒ n ≡ digit sum (mod 9)',
    ex: { a: 7851, b: 3 },
    caseKey: ['b', 'ans'],
    cases: [
      { label: 'By 3: yes', note: 'The digit sum, 21, is in the 3 times table — so the whole number is too.',
        ex: { a: 7851, b: 3 } },
      { label: 'By 3: no', note: 'The digit sum, 10, is not in the 3 times table, so the number is not either. No dividing needed to say no.',
        ex: { a: 4321, b: 3 } },
      { label: 'By 9: yes', note: 'For 9 the digit sum must be in the 9 times table. 18 is, so the number is.',
        ex: { a: 5832, b: 9 } },
      { label: 'By 9: no', note: 'The same 7,851 as before: 21 is in the 3 times table but not the 9. Divisible by 3 does not mean divisible by 9.',
        ex: { a: 7851, b: 9 } },
    ],
    gen(r, lv = 1) {
      const b = lv === 1 ? 3 : pick([3, 9], r);
      let a = int(lv === 1 ? 100 : 1000, lv === 3 ? 999999 : 9999, r);
      if (r() < 0.5) a -= a % b;           // half of them are, so "no" is never a safe guess
      return this.q({ a: Math.max(a, b), b });
    },
    q({ a, b }) {
      const yes = a % b === 0;
      return { a, b, text: `Is ${a} divisible by ${b}?`, say: `is ${a} divisible by ${b}`, choices: ['Yes', 'No'], ans: yes ? 'Yes' : 'No', expr: `${a}%${b}===0?'Yes':'No'` };
    },
    work({ a, b }) {
      return [{ t: `Add the digits of ${a}`, v: dsum(a), x: dsumX(a) }, { t: `Is ${dsum(a)} in the ${b} times table?`, v: a % b === 0 ? 'Yes' : 'No', choices: ['Yes', 'No'] }];
    },
  },
  {
    id: 'percent-swap', world: 'harbour', band: '11-14', title: 'Percentages swap',
    hook: '8% of 50 — sounds hard. It isn\'t.',
    idea: 'x% of y is always the same as y% of x. Swap them if the other way round is easier.',
    why: [
      '8% of 50 means 8 hundredths of 50: 8 × 50 ÷ 100. And 50% of 8 means 50 × 8 ÷ 100. Multiplication does not care about order, so they are the same number.',
      '50% of 8 is half of 8: 4. That is the answer to both.',
      'The swap pays off when the new percentage is a friendly one. 50% is a half, 10% a tenth, 25% a quarter and 75% three quarters. 20% is a fifth, so 40% is two fifths and 60% three fifths.',
    ],
    alg: 'x% of y = xy ÷ 100 = y% of x',
    ex: { a: 8, b: 50 },
    caseKey: 'part',
    cases: [
      { label: 'Swap to 50%', note: '50% is a half. Half of 8 is 4.',
        ex: { a: 8, b: 50 } },
      { label: 'Swap to 10%', note: '10% is a tenth: divide by 10. A tenth of 30 is 3.',
        ex: { a: 30, b: 10 } },
      { label: 'Swap to 25%', note: '25% is a quarter: halve, then halve again. 12, then 6, then 3.',
        ex: { a: 12, b: 25 } },
      { label: 'Swap to 75%', note: '75% is three quarters. Find one quarter first — 16 ÷ 4 = 4 — then take three of them.',
        ex: { a: 16, b: 75 } },
      { label: 'Swap to 20%, 40% or 60%', note: '20% is a fifth. For 40% find a fifth and double it: a fifth of 15 is 3, so two fifths is 6.',
        ex: { a: 15, b: 40 } },
    ],
    gen(r, lv = 1) {
      const friendly = lv === 1 ? [50, 10] : lv === 2 ? [50, 25, 10, 20] : [25, 20, 75, 40, 60];
      const b = pick(friendly, r);
      const step = 100 / gcd(b, 100);            // a must be a multiple of this for a whole answer
      const a = step * int(1, Math.max(1, Math.floor((lv === 3 ? 96 : 48) / step)), r);
      return this.q({ a, b });
    },
    q({ a, b }) { return { a, b, part: { 50: 'half', 10: 'tenth', 25: 'quarter', 75: 'three quarters' }[b] || 'fifths', text: `${a}% of ${b}`, say: `${a} percent of ${b}`, expr: `${a}*${b}/100`, ans: a * b / 100 }; },
    work({ a, b }) { return [{ t: `Swap it: ${b}% of ${a}`, v: a * b / 100 }]; },
  },
  {
    id: 'diff-squares', world: 'harbour', band: '11-14', title: 'Around a middle number',
    hook: '48 × 52 — two numbers the same distance from 50.',
    idea: 'Square the middle number, then take away the square of the distance.',
    why: [
      '48 and 52 are both 2 away from 50. 50² is 2500. 2² is 4. 2500 − 4 = 2496.',
      'The picture: a 48-by-52 rectangle is a 50-by-50 square with a strip moved from one side to the other — and a tiny 2-by-2 corner that does not fit. That missing corner is the 4.',
    ],
    alg: '(m − d)(m + d) = m² − d²',
    ex: { a: 48, b: 52 },
    oneIdea: true,
    gen(r, lv = 1) {
      const m = int(lv === 1 ? 2 : 2, lv === 1 ? 5 : 9, r) * 10, d = int(1, lv === 3 ? 9 : 4, r);
      return this.q({ a: m - d, b: m + d });
    },
    q({ a, b }) { return { a, b, text: `${a} × ${b}`, expr: `${a}*${b}`, ans: a * b }; },
    work({ a, b }) {
      const m = (a + b) / 2, d = (b - a) / 2;
      return [
        { t: 'The middle number', v: m, x: `(${a}+${b})/2` },
        { t: 'The distance to it', v: d, x: `(${b}-${a})/2` },
        { t: `${m}²`, v: m * m, x: `((${a}+${b})/2)**2` },
        { t: `${d}²`, v: d * d, x: `((${a}+${b})/2)**2-${a}*${b}` },
        { t: `${m * m} − ${d * d}`, v: a * b },
      ];
    },
  },
  {
    id: 'square-up', world: 'harbour', band: '11-14', title: 'The next square up',
    hook: 'You know 30² is 900. What is 31²?',
    idea: 'To get from n² to (n + 1)², add n and n + 1.',
    why: [
      '31² is 30² plus 30 plus 31 = 900 + 61 = 961.',
      'Picture a 30-by-30 square of tiles. To make it 31 by 31 you add a row of 30 along one side and a column of 31 along the other. Those are the two numbers you add.',
    ],
    alg: '(n + 1)² = n² + n + (n + 1)',
    ex: { a: 31 },
    oneIdea: true,
    gen(r, lv = 1) { return this.q({ a: int(lv === 1 ? 1 : 2, lv === 1 ? 5 : 9, r) * 10 + 1 }); },
    q({ a }) { return { a, b: a, text: `${a}²`, say: `${a} squared`, expr: `${a}*${a}`, ans: a * a }; },
    work({ a }) {
      const n = a - 1;
      return [{ t: `${n}²`, v: n * n, x: `(${a}-1)**2` }, { t: `${n} + ${a}`, v: n + a, x: `2*${a}-1` }, { t: 'Add them', v: a * a }];
    },
  },
];

function gcd(a, b) { return b ? gcd(b, a % b) : a; }

/* ------------------------------------------------------------- the whole atlas */

/* The five worlds above are the first island. The rest of the Atlas lives in
   src/chapters/, one file per world, each exporting WORLD, TRICKS and
   STORIES to the same contract (docs/CHAPTER-CONTRACT.md). ORDER is the road:
   it interleaves the islands by age, so a six-year-old meets Time and Money
   long before the Sutra Observatory. */
import * as library from './chapters/library.js';
import * as clocktower from './chapters/clocktower.js';
import * as bakery from './chapters/bakery.js';
import * as shapecity from './chapters/shapecity.js';
import * as forest from './chapters/forest.js';
import * as palace from './chapters/palace.js';
import * as dock from './chapters/dock.js';
import * as setisland from './chapters/setisland.js';
import * as carnival from './chapters/carnival.js';
import * as quarry from './chapters/quarry.js';
import * as mine from './chapters/mine.js';
import * as coinstreet from './chapters/coinstreet.js';
import * as lighthouse from './chapters/lighthouse.js';
import * as strategy from './chapters/strategy.js';
import * as logic from './chapters/logic.js';
import * as figures from './chapters/figures.js';
import * as ladder from './chapters/ladder.js';
import * as court from './chapters/court.js';
export const CHAPTERS = [library, clocktower, bakery, shapecity, forest, palace, dock, setisland, carnival, quarry, mine, coinstreet, lighthouse, strategy, logic, figures, ladder, court];

export const ORDER = ['gardens', 'market', 'library', 'clocktower', 'bakery', 'coinstreet', 'shapecity', 'workshop', 'mine', 'forest',
  'quarry', 'observatory', 'palace', 'dock', 'setisland', 'harbour', 'ladder', 'court', 'lighthouse', 'carnival',
  'strategy', 'logic', 'figures'];   // the Contest Hall's strategy worlds (track: 'contest') come after the Atlas road
export const ISLAND = { gardens: 1, market: 1, workshop: 1, observatory: 1, harbour: 1, ladder: 1, court: 1, quarry: 3, mine: 3, coinstreet: 3, lighthouse: 3,
  strategy: 'hall', logic: 'hall', figures: 'hall' };   // everything else: island 2. 'hall': the Contest Hall's road, not an island

const ALL_WORLDS = [...CORE_WORLDS, ...CHAPTERS.map((c) => c.WORLD)];
export const WORLDS = ORDER.map((id, i) => ({ ...ALL_WORLDS.find((w) => w.id === id), n: i + 1, island: ISLAND[id] || 2 }));
const ALL = [...CORE, ...CHAPTERS.flatMap((c) => c.TRICKS)];
export const TRICKS = WORLDS.flatMap((w) => ALL.filter((t) => t.world === w.id));

/* ------------------------------------------------------------- lookups */

export const byId = Object.fromEntries(TRICKS.map((t) => [t.id, t]));
export const worldOf = (id) => WORLDS.find((w) => w.id === id);
export const tricksIn = (wid) => TRICKS.filter((t) => t.world === wid);

/* The worked example a chapter teaches from. */
/* A stop that teaches several ideas (three kinds of triangle, above and below
   100) carries `cases`: one worked example per idea, which Learn clicks through
   in order. `caseKey` names the question field(s) — or 'ans' — that tell the
   ideas apart, and test/tricks.mjs fails a stop whose drill can ask about an
   idea none of its cases shows. A stop that really is one idea says `oneIdea`. */
export const learnCases = (t) => (t.cases && t.cases.length
  ? t.cases.map((c) => ({ label: c.label, note: c.note || '', q: t.q(c.ex) }))
  : [{ label: '', note: '', q: t.q(t.ex) }]);
/* How hard test/tricks.mjs leans on every stop: this many generated questions at each
   difficulty, each checked three ways (the trick's steps, q.ans, plain arithmetic). One copy,
   read by the test and by the landing page, so the number a parent reads is the number run. */
export const CHECKED = { levels: [1, 2, 3], each: 700 };
export const checkedPerStop = () => CHECKED.levels.length * CHECKED.each;
export const example = (t) => learnCases(t)[0].q;
export const caseSig = (t, q) => [].concat(t.caseKey || []).map((k) => String(q[k])).join('|');

/* A drill of n questions at a level, never the same question twice in a row. */
/* A generated question made ready for the runner: its picture, and the extra
   keypad keys (. − /) its answer needs. Every path that puts a stop's question
   in front of a child goes through here — without it a fraction answer cannot
   be typed at all. */
export function dress(t, q) {
  if (t.draw && !q.html) q.html = t.draw(q);
  if (q.input === 'chart' && t.hits && !q.hits) q.hits = t.hits(q);   // where each answer can be tapped (widgets.js)
  if (t.keys && !q.keys) q.keys = t.keys;
  return q;
}

export function drill(t, n, lv, r = Math.random) {
  const out = []; let last = '';
  for (let i = 0; out.length < n && i < n * 20; i++) {
    const q = t.gen(r, lv);
    if (q.text === last) continue;
    last = q.text;
    out.push(dress(t, q));
  }
  return out;
}

/* Answers: a keypad sends text. Whole numbers, decimals ("0.75"), negatives
   ("−4", with either minus sign) and fractions ("3/4") are all read as the
   number they mean, so "01225" is still right and 2/4 equals 1/2 — unless
   the question asks for simplest form (q.simplest), when 2/4 is not the
   answer to "simplify 6/12". Choice questions compare the label exactly. */
export function parseNum(s) {
  const t = String(s).trim().replace(/[−–]/g, '-').replace(/\s+/g, '');
  if (/^-?\d+\/\d+$/.test(t)) { const [a, b] = t.split('/').map(Number); return b ? a / b : NaN; }
  if (/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return Number(t);
  return NaN;
}
export function correct(q, given) {
  if (q.choices) return given === q.ans;
  const g = String(given).trim();
  if (g === '') return false;
  const v = parseNum(g), want = typeof q.ans === 'number' ? q.ans : parseNum(q.ans);
  if (!Number.isFinite(v) || Math.abs(v - want) > 1e-9) return false;
  if (q.simplest && g.includes('/')) { const [a, b] = g.replace(/[−–]/g, '-').split('/').map((x) => Math.abs(Number(x))); if (gcd(a, b) !== 1) return false; }
  return true;
}
/* The same rule for one step of the working ("Your turn"). */
export function stepRight(s, given) {
  if (s.choices) return given === s.v;
  return correct({ ans: s.v }, given);
}
