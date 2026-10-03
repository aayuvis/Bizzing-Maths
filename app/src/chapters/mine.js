/* mine.js — The Deep Mine: numbers below zero. A mine has a lift, and the
   lift's buttons are a number line standing up: ground is 0, the levels
   under it are −1, −2, −3… Everything here is that one picture — a
   thermometer, a score, a bank balance that dips below zero (which is a
   number, not a failing). The Library's 'negative-numbers' stop meets
   below-zero once, on a thermometer; this world goes deeper: ordering,
   gaps, adding and taking away negatives, and the sign rules for × and ÷.
   Contract: docs/CHAPTER-CONTRACT.md. */

import { int, pick } from '../rand.js';
import { svg, text, numberLine } from './kit.js';

export const WORLD = {
  id: 'mine', name: 'The Deep Mine', short: 'Mine', band: '8-10',
  blurb: 'Ground is zero and the lift keeps going down — every level below is a negative number.',
  tint: '#EEE8E1', ink: '#3E2A1C', glyph: '⛏️',
};

/* ---------------------------------------------------------------- helpers */

const N = (v) => (v < 0 ? '−' + Math.abs(v) : String(v));          // −4
const B = (v) => (v < 0 ? `(−${Math.abs(v)})` : String(v));         // (−4), for a second operand
const sgn = (v) => (v < 0 ? -1 : 1);
/* The prompt must never show its answer — nor the answer's size, so "−12"
   in the prompt cannot hide an answer of 12 (or the other way round). */
const leaks = (q) => {
  if (q.choices) return false;
  const parts = q.text.replace(/,/g, '').split(/[^0-9./]/);
  return [String(q.ans), String(Math.abs(q.ans))].some((s) => s.length > 1 && parts.includes(s));
};
function fresh(make) { let q; for (let i = 0; i < 80; i++) { q = make(); if (!leaks(q)) return q; } return q; }
const nz = (lo, hi, r) => int(lo, hi, r) * pick([1, -1], r);          // a non-zero whole number either side of 0

/* A scale that holds every value given, plus zero, in round steps. */
function scale(vals) {
  const m = Math.max(1, ...vals.map(Math.abs));
  const step = m <= 10 ? 1 : m <= 20 ? 2 : m <= 50 ? 5 : 10;
  const lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
  return { lo: Math.floor(lo / step) * step - step, hi: Math.ceil(hi / step) * step + step, step };
}

/* The lift shaft: a number line standing up. Rock below ground, sky above,
   every level labelled on the left, marks {value: label} on the right. */
function shaft(vals, marks = {}) {
  const { lo, hi, step } = scale(vals);
  const n = (hi - lo) / step, u = Math.max(12, Math.min(24, 300 / n)), H = n * u, top = 14, X = 70, W = 220;
  const y = (v) => top + ((hi - v) / (hi - lo)) * H;
  let s = `<rect x="${X - 16}" y="${y(0)}" width="${W - X + 32}" height="${y(lo) - y(0)}" class="dg-fill2"/>`;
  s += `<rect x="${X - 16}" y="${top}" width="${W - X + 32}" height="${y(0) - top}" class="dg-blank"/>`;
  s += `<line x1="${X}" y1="${top}" x2="${X}" y2="${y(lo)}" class="dg-line"/>`;
  const every = n > 16 ? 2 : 1;
  for (let i = 0; i <= n; i++) {
    const v = lo + i * step, yy = y(v);
    s += `<line x1="${X - 6}" y1="${yy}" x2="${X + 6}" y2="${yy}" class="dg-thin"/>`;
    if (i % every === 0 || v === 0) s += text(X - 12, yy + 4, N(v), 'dg-small', 'end');
  }
  s += `<line x1="${X - 16}" y1="${y(0)}" x2="${W + 16}" y2="${y(0)}" class="dg-line"/>` + text(W + 12, y(0) - 6, 'ground', 'dg-small', 'end');
  let k = 0;
  for (const [v, l] of Object.entries(marks)) {
    const yy = y(+v), x = X + 34 + (k++ % 2) * 70;
    s += `<rect x="${X - 7}" y="${yy - 7}" width="14" height="14" rx="2" class="dg-fill1"/><line x1="${X + 8}" y1="${yy}" x2="${x - 4}" y2="${yy}" class="dg-thin"/>` + text(x, yy + 5, l, 'dg-accent', 'start');
  }
  return svg(W + 24, H + top * 2, s, 'A lift shaft: ground is 0, the levels below it are negative');
}

/* A horizontal number line wide enough for the values, marks {value: label}. */
function line(vals, marks = {}) {
  const m = Math.max(...vals.map(Math.abs)), R = m <= 10 ? 10 : m <= 20 ? 20 : Math.ceil(m / 10) * 10;
  return numberLine(-R, R, R === 10 ? 2 : R === 20 ? 5 : 10, marks);
}

/* The times-table pattern carried on below zero: the multiplier column is a
   little lift shaft (2, 1, 0, −1, −2), the rows below ground left as '?'. */
function pattern(b) {
  const rows = [2, 1, 0, -1, -2], u = 30, top = 10;
  let s = `<rect x="4" y="${top + 2.5 * u}" width="272" height="${2 * u + 6}" class="dg-fill2"/>`;
  s += `<line x1="4" y1="${top + 2.5 * u}" x2="276" y2="${top + 2.5 * u}" class="dg-line"/>`;
  rows.forEach((m, i) => {
    const yy = top + i * u + 20;
    s += text(60, yy, N(m), 'dg-big', 'end') + text(96, yy, `× ${B(b)}`, 'dg-text', 'start') + text(170, yy, '=', 'dg-text')
      + text(196, yy, m >= 0 ? N(m * b) : '?', m >= 0 ? 'dg-text' : 'dg-accent', 'start');
  });
  return svg(280, top + rows.length * u + 12, s, `The ${N(b)} times table, carried on below zero`);
}

/* One move along the line, as steps: stop at zero when you cross it. */
function move(s, m) {
  const end = s + m, dir = m > 0 ? 'up' : 'down', d = Math.abs(m);
  if (s === 0 || end === 0) return [{ t: `${N(s)} ${m > 0 ? '+' : '−'} ${d}`, v: end }];
  if (s * end < 0) return [
    { t: `From ${N(s)} ${dir} to 0 is`, v: Math.abs(s) },
    { t: `Still to go after 0: ${d} − ${Math.abs(s)}`, v: d - Math.abs(s) },
    { t: `Past zero, so you land on`, v: end },
  ];
  if (s < 0) return [
    { t: `How far below 0 is ${N(s)}?`, v: -s },
    { t: m < 0 ? `Down ${d} takes you further from 0: ${-s} + ${d}` : `Up ${d} brings you closer to 0: ${-s} − ${d}`, v: -end },
    { t: 'Still below zero, so you are at', v: end },
  ];
  return [{ t: `${s} ${m > 0 ? '+' : '−'} ${d}`, v: end }];
}

const C3 = ['<', '=', '>'];

/* ================================================================ stops */

export const TRICKS = [
  {
    id: 'compare-integers', world: 'mine', band: '8-10', title: 'Higher or lower?', keys: ['−'],
    hook: 'Level −7 or level −3 — which one is deeper? And which number is bigger?',
    idea: 'Picture the lift shaft: the number higher up the shaft is always the bigger one.',
    why: [
      'On a number line every number is bigger than all the numbers below it. Stand the line up and it is the lift shaft of a mine: ground is 0, and the levels under it are −1, −2, −3, going down. Going up means getting bigger — even when you are still underground.',
      'So −3 is bigger than −7. That feels backwards, because 7 is bigger than 3. But −7 is seven levels down and −3 is only three: −3 is higher up the shaft. Being further below zero makes a number smaller, not bigger. It is the same on a thermometer: −7 °C is colder than −3 °C.',
      'Any number above ground beats any number below it, and 0 sits between them: −1 is less than 0, and 0 is less than 1. When both numbers are negative, the one with the smaller distance from zero is the bigger number.',
    ],
    alg: 'a < b exactly when a is below b on the number line ; −7 < −3',
    ex: { a: -7, b: -3 },
    caseKey: 'side',
    cases: [
      { label: 'Both below ground', note: 'Both numbers are negative, so the one nearer to zero is higher up the shaft — and higher up means bigger, even though its digit looks smaller.',
        ex: { a: -7, b: -3 } },
      { label: 'One each side of ground', note: 'A number above ground beats every number below it, however big the digits underground look.',
        ex: { a: 4, b: -6 } },
      { label: 'Zero and a negative', note: 'Zero is ground level itself. Every negative number is below it, so every negative number is less than 0.',
        ex: { a: 0, b: -2 } },
    ],
    gen(r, lv = 1) {
      let a, b;
      do {
        if (lv === 1) { a = -int(1, 9, r); b = pick([int(0, 9, r), -int(1, 9, r)], r); }
        else if (lv === 2) { a = -int(1, 15, r); b = pick([-int(1, 15, r), -int(1, 15, r), int(0, 15, r)], r); }
        else { const t = int(1, 9, r), o = int(1, 9, r); a = -(10 * t + o); b = pick([-(10 * o + t), -int(10, 99, r), int(0, 99, r), -int(1, 9, r)], r); }
        if (r() < 0.5) [a, b] = [b, a];
      } while (a === b);
      return this.q({ a, b });
    },
    q({ a, b }) {
      const side = a < 0 && b < 0 ? 'both below' : a === 0 || b === 0 ? 'zero' : 'either side';
      return { a, b, side, choices: C3, ans: a > b ? '>' : a < b ? '<' : '=',
        text: `${N(a)}  ?  ${N(b)}`, say: `${N(a)} compared with ${N(b)}`,
        expr: `(${a})>(${b})?'>':(${a})<(${b})?'<':'='` };
    },
    work({ a, b, ans }) {
      return [{ t: `Which is higher up the shaft: ${N(a)} or ${N(b)}?`, v: Math.max(a, b) }, { t: 'So the sign between them is', v: ans, choices: C3 }];
    },
    draw: ({ a, b }) => shaft([a, b]),
  },
  {
    id: 'lift-moves', world: 'mine', band: '8-10', title: 'Riding the lift', keys: ['−'],
    hook: 'The lift is on level −4. It goes up 9 levels. Is it on level 13 now?',
    idea: 'Ride to ground level first, then carry on with what is left of the trip.',
    why: [
      'A lift trip that crosses ground level is really two trips. From −4 up to 0 is 4 levels. The trip was 9, so 4 of them are used just getting back to the surface, and 5 are left. Five above ground is level 5.',
      'Going down works the same way in the other direction. From level 3, going down 8: 3 levels bring you to ground, and the other 5 take you underground to −5. Zero is the stop in the middle that turns one hard sum into two easy ones.',
      'If the trip never reaches ground, count distance from zero. From −6, going down 3 more puts you 9 below: −9. From −6, going up 2 brings you closer, only 4 below: −4. Going up always makes the number bigger, even underground.',
    ],
    alg: 'start + change = end ; −4 + 9 = 5 , 3 − 8 = −5',
    ex: { s: -4, m: [9] },
    caseKey: 'trip',
    cases: [
      { label: 'Down, still above ground', note: 'The lift stays above ground, so this is an ordinary take-away — the numbers you already know.',
        ex: { s: 7, m: [-3] } },
      { label: 'Landing on ground', note: 'The trip is exactly as long as the distance to ground, so the lift stops on 0 — ground is a level too, neither above nor below.',
        ex: { s: -5, m: [5] } },
      { label: 'Up past ground', note: 'Ride up to 0 first, then carry on with what is left of the trip. Zero splits one hard sum into two easy ones.',
        ex: { s: -4, m: [9] } },
      { label: 'Down past ground', note: 'The same two trips the other way: down to 0, then the rest of the trip takes you underground.',
        ex: { s: 3, m: [-8] } },
      { label: 'Down, deeper underground', note: 'Already below ground and going down: you get further from zero, so the distances add — and the number gets smaller.',
        ex: { s: -6, m: [-3] } },
      { label: 'Up, still underground', note: 'Going up underground brings you closer to zero, so the distance below ground shrinks — the number gets bigger.',
        ex: { s: -6, m: [2] } },
      { label: 'Two trips in a row', note: 'Do one trip at a time: find where the first one ends, then start the second from there.',
        ex: { s: -3, m: [8, -12] } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 3) {
          const s = nz(1, 20, r), m1 = nz(3, 25, r), m2 = nz(3, 25, r);
          return this.q({ s, m: [m1, Math.sign(m1) === Math.sign(m2) ? -m2 : m2] });
        }
        const R = lv === 1 ? 9 : 20;
        const s = lv === 1 ? pick([-int(1, R, r), int(1, R, r)], r) : nz(1, R, r);
        const cross = r() < 0.6;
        let m;
        if (cross) m = s < 0 ? -s + int(1, R, r) : -(s + int(1, R, r));
        else m = s < 0 ? pick([-int(1, R, r), int(1, -s, r)], r) : -int(1, s, r);
        if (m === 0) m = s < 0 ? -1 : -s;
        return this.q({ s, m: [m] });
      });
    },
    q({ s, m }) {
      const say = (x) => `${x > 0 ? 'up' : 'down'} ${Math.abs(x)}`;
      const lv = (x) => (Math.abs(x) === 1 ? 'level' : 'levels');
      const say2 = m.length === 1 ? `It goes ${say(m[0])} ${lv(m[0])}.` : `It goes ${say(m[0])} ${lv(m[0])}, then ${say(m[1])}.`;
      let end = s; for (const x of m) end += x;
      const e1 = s + m[0];
      const trip = m.length > 1 ? 'two' : e1 === 0 ? 'to ground' : s * e1 < 0 ? (m[0] > 0 ? 'cross up' : 'cross down')
        : s < 0 ? (m[0] < 0 ? 'deeper' : 'closer') : 'above';
      return { s, m, trip, text: `The lift is on level ${N(s)}. ${say2} Which level is it on now?`,
        expr: `[${m.join(',')}].reduce((a,b)=>a+b,${s})`, ans: end };
    },
    work({ s, m }) {
      if (m.length === 1) return move(s, m[0]);
      const mid = s + m[0], d = (x) => `${x > 0 ? 'up' : 'down'} ${Math.abs(x)}`;
      return [{ t: `From ${N(s)}, ${d(m[0])}. Where does the first trip end?`, v: mid }, { t: `From ${N(mid)}, ${d(m[1])}`, v: mid + m[1] }];
    },
    draw: ({ s, m }) => shaft([s, s + m[0], s + m[0] + (m[1] || 0)], { [s]: 'lift' }),
  },
  {
    id: 'integer-gap', world: 'mine', band: '8-10', title: 'How far apart?',
    hook: 'One miner is on level −6, another is up on level 5. How many levels apart are they?',
    idea: 'Measure each number’s distance from zero; add them if zero is between, take away if it is not.',
    why: [
      'The distance of a number from zero is called its size, or absolute value, and is written with bars: |−6| = 6, because −6 is six levels below ground. Distance never has a minus sign — six levels is six levels whichever way you walk them.',
      'When zero sits between two numbers, the gap between them is two trips glued together: from −6 up to ground is 6, from ground up to 5 is 5, so they are 11 apart. Add the two distances.',
      'When both are underground, zero is not between them. −9 is 9 below ground and −4 is 4 below; the deeper miner is 9 − 4 = 5 levels further down. Take the distances away. Either way it is the higher number minus the lower one: 5 − (−6) = 11 and −4 − (−9) = 5.',
    ],
    alg: 'gap between a and b = |a − b| ; |−6| = 6',
    ex: { a: -6, b: 5, ctx: 'mine' },
    caseKey: 'zero',
    cases: [
      { label: 'Zero is between them', note: 'One is above ground and one below, so the gap is two trips glued together at 0 — add the two distances.',
        ex: { a: -6, b: 5, ctx: 'mine' } },
      { label: 'Both below ground', note: 'Zero is not between them, so do not add. The deeper one is further down by the difference of their distances — take away.',
        ex: { a: -9, b: -4, ctx: 'mine' } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const R = lv === 1 ? 9 : lv === 2 ? 20 : 60;
        const both = lv > 1 && r() < 0.45;
        let a = -int(1, R, r), b = both ? -int(1, R, r) : int(1, R, r);
        if (a === b) b = a + int(1, 5, r) * (a < -5 ? 1 : -1);
        if (r() < 0.5) [a, b] = [b, a];
        return this.q({ a, b, ctx: lv === 3 ? pick(['mine', 'cold', 'sea'], r) : lv === 2 ? pick(['mine', 'cold'], r) : 'mine' });
      });
    },
    q({ a, b, ctx }) {
      const base = { a, b, ctx, zero: Math.max(a, b) > 0 ? 'between' : 'below', expr: `Math.abs((${a})-(${b}))`, ans: Math.max(a, b) - Math.min(a, b) };
      if (ctx === 'cold') return { ...base, text: `One freezer is at ${N(a)} °C, another at ${N(b)} °C. How many degrees apart are they?` };
      if (ctx === 'sea') return { ...base, text: `A diver is at ${N(a)} m, a gull is at ${N(b)} m (0 is the surface of the sea). How many metres apart are they?` };
      return { ...base, text: `One miner is on level ${N(a)}, another on level ${N(b)}. How many levels apart are they?` };
    },
    work({ a, b }) {
      const lo = Math.min(a, b), hi = Math.max(a, b);
      if (hi > 0) return [{ t: `From ${N(lo)} up to 0`, v: -lo }, { t: `From 0 up to ${hi}`, v: hi }, { t: 'Zero is between them, so add', v: hi - lo }];
      return [{ t: `How far below 0 is ${N(lo)}?`, v: -lo }, { t: `How far below 0 is ${N(hi)}?`, v: -hi }, { t: `Both below zero, so take away: ${-lo} − ${-hi}`, v: hi - lo }];
    },
    draw: ({ a, b }) => shaft([a, b], { [a]: 'A', [b]: 'B' }),
  },
  {
    id: 'add-negative', world: 'mine', band: '8-10', title: 'Adding a negative', keys: ['−'],
    hook: '5 + (−8). Adding makes things bigger… doesn’t it?',
    idea: 'Adding a negative number is the same as taking away its size: 5 + (−8) = 5 − 8.',
    why: [
      'Think of a bank balance. Money in is a positive number, and a bill you owe is a negative one. If you have 5 coins and a bill for 8 arrives, adding the bill to your account takes 8 away: 5 + (−8) = 5 − 8. The account goes 3 below zero, −3. That is not a disaster; it is just a number that says “3 still owed”.',
      'On the lift, adding a positive number means going up and adding a negative means going down. So 5 + (−8) is: start on level 5, go down 8. Five of the levels bring you to ground, three more take you to −3.',
      'It works when you start underground too: −2 + (−6) is two below, then six more below — eight below, −8. Adding two negatives is like two bills: they add up to a bigger bill.',
    ],
    alg: 'a + (−b) = a − b',
    ex: { a: 5, b: 8 },
    caseKey: 'path',
    cases: [
      { label: 'Staying above ground', note: 'Adding a negative means going down. Here the start is high enough that you never pass ground — an ordinary take-away.',
        ex: { a: 9, b: 4 } },
      { label: 'Down past ground', note: 'Going down further than you are above ground: use up the levels to reach 0, then the rest take you below it.',
        ex: { a: 5, b: 8 } },
      { label: 'Starting below ground', note: 'Already underground and going down again: like two bills, the distances add up to a bigger bill.',
        ex: { a: -2, b: 6 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) return this.q({ a: int(1, 9, r), b: int(2, 12, r) });
        if (lv === 2) return this.q({ a: int(-12, 15, r), b: int(2, 15, r) });
        return this.q({ a: int(-45, 60, r), b: int(6, 70, r) });
      });
    },
    q({ a, b }) { return { a, b, path: a <= 0 ? 'below' : a >= b ? 'stay' : 'cross', text: `${N(a)} + (−${b})`, expr: `(${a})+(-${b})`, ans: a - b }; },
    work({ a, b }) { return [{ t: `Adding −${b} is the same as going down by`, v: b }, ...move(a, -b)]; },
    draw: ({ a, b }) => line([a, a - b], { [a]: 'start' }),
  },
  {
    id: 'subtract-negative', world: 'mine', band: '8-10', title: 'Taking away a negative', keys: ['−'],
    hook: '5 − (−3). How can taking something away make a number bigger?',
    idea: 'Taking away a negative is the same as adding its size: 5 − (−3) = 5 + 3.',
    why: [
      'Watch a pattern. 5 − 2 = 3. 5 − 1 = 4. 5 − 0 = 5. Each time you take away one less, the answer goes up by one. Carry the pattern on below zero: 5 − (−1) must be 6, 5 − (−2) must be 7, and 5 − (−3) must be 8. The pattern has no reason to stop at zero, and it does not.',
      'The bank balance says the same thing. A negative number in your account is a bill you owe. If someone takes a bill of 3 away — they pay it for you — you are 3 better off. Taking away a debt is the same as being given money.',
      'So whenever you see “minus a negative”, the two minuses together mean add. −4 − (−9) is −4 + 9: start 4 below ground, go up 9, and you land on level 5.',
    ],
    alg: 'a − (−b) = a + b',
    ex: { a: 5, b: 3 },
    caseKey: 'path',
    cases: [
      { label: 'Starting above ground', note: 'The two minuses together mean add, so the lift goes up — and from above ground it simply climbs higher.',
        ex: { a: 5, b: 3 } },
      { label: 'Below ground, up past 0', note: 'Turn it into an add first, then ride up: reach ground, and the rest of the trip takes you above it.',
        ex: { a: -4, b: 9 } },
      { label: 'Below ground, staying there', note: 'Still an add, so still going up — but not far enough to reach ground. The answer is negative, just nearer to zero.',
        ex: { a: -9, b: 4 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) return this.q({ a: int(1, 9, r), b: int(1, 9, r) });
        if (lv === 2) return this.q({ a: nz(1, 12, r), b: int(2, 12, r) });
        return this.q({ a: nz(5, 40, r), b: int(5, 40, r) });
      });
    },
    q({ a, b }) { return { a, b, path: a > 0 ? 'above' : a + b > 0 ? 'cross' : 'below', text: `${N(a)} − (−${b})`, expr: `(${a})-(-${b})`, ans: a + b }; },
    work({ a, b }) { return [{ t: `Taking away −${b} is the same as adding`, v: b }, ...move(a, b)]; },
    draw: ({ a, b }) => line([a, a + b], { [a]: 'start' }),
  },
  {
    id: 'ups-and-downs', world: 'mine', band: '8-10', title: 'A day of ups and downs', keys: ['−'],
    hook: '−5 + 8 − 9 + 3 − 6. Do you have to ride every trip one by one?',
    idea: 'Add up all the ups, add up all the downs, and then do one sum at the end.',
    why: [
      'A long string of pluses and minuses is a lift log: each number is a trip, up or down. You could ride every trip in turn, crossing ground level again and again. But the order of the trips does not change where the lift ends up — up 8 then down 9 lands in the same place as down 9 then up 8.',
      'So sort them. Put every up trip together and every down trip together. In −5 + 8 − 9 + 3 − 6 the ups are 8 and 3, which make 11. The downs are 5, 9 and 6, which make 20.',
      'Now there is only one sum left: up 11 and down 20. The downs win by 9, so the lift finishes 9 below ground, at −9. Two easy additions and one take-away, instead of five trips across zero.',
    ],
    alg: 'a₁ + a₂ + … = (sum of the positives) − (sum of the sizes of the negatives)',
    ex: { t: [-5, 8, -9, 3, -6] },
    oneIdea: true,
    gen(r, lv = 1) {
      return fresh(() => {
        const k = lv === 1 ? 3 : lv === 2 ? 4 : int(5, 6, r), R = lv === 1 ? 9 : lv === 2 ? 12 : 25;
        const t = Array.from({ length: k }, () => nz(1, R, r));
        if (t.every((x) => x > 0)) t[1] = -t[1];
        if (t.every((x) => x < 0)) t[0] = -t[0];
        return this.q({ t });
      });
    },
    q({ t }) {
      const text = t.map((x, i) => (i === 0 ? N(x) : `${x < 0 ? '−' : '+'} ${Math.abs(x)}`)).join(' ');
      return { t, text, expr: `[${t.join(',')}].reduce((a,b)=>a+b,0)`,
        ans: t.filter((x) => x > 0).reduce((a, b) => a + b, 0) - t.filter((x) => x < 0).reduce((a, b) => a - b, 0) };
    },
    work({ t }) {
      const U = t.filter((x) => x > 0).reduce((a, b) => a + b, 0), D = t.filter((x) => x < 0).reduce((a, b) => a - b, 0);
      return [{ t: `All the ups: ${t.filter((x) => x > 0).join(' + ')}`, v: U }, { t: `All the downs: ${t.filter((x) => x < 0).map((x) => -x).join(' + ')}`, v: D },
        { t: `Up ${U} and down ${D}: where do you finish?`, v: U - D }];
    },
    draw: ({ t }) => { let p = 0; const path = [0, ...t.map((x) => (p += x))]; return shaft(path, { 0: 'start' }); },
  },
  {
    id: 'multiply-signs', world: 'mine', band: '11-14', title: 'Multiplying negatives', keys: ['−'],
    hook: '−4 × (−8). Two negatives — why on earth is the answer positive?',
    idea: 'Multiply the sizes, then count the minus signs: an even number of them makes the answer positive, an odd number makes it negative.',
    why: [
      'Start with a positive times a negative: 3 × (−4) is three bills of 4, which is a bill of 12, so −12. Three lots of going down 4 takes you 12 below ground.',
      'Now write out the times table for −4 and walk the multiplier down the lift shaft: 2 × (−4) = −8, 1 × (−4) = −4, 0 × (−4) = 0. Each step down, the answer goes UP by 4. Carry on below ground and the pattern must hold: −1 × (−4) = 4, −2 × (−4) = 8. A negative times a negative is positive — the pattern leaves no other choice.',
      'So for any product, multiply the sizes and then count the negatives. Each pair of negatives cancels out to a positive. Two negatives: positive. Three: negative again. The size never depends on the signs — only which side of zero you land.',
    ],
    alg: '(−a) × b = −(ab) ; (−a) × (−b) = ab',
    ex: { f: [-4, -8] },
    caseKey: 'neg',
    cases: [
      { label: 'One negative', note: 'Lots of a bill is a bigger bill: one negative number in the product makes the answer negative.',
        ex: { f: [3, -4] } },
      { label: 'Two negatives', note: 'The pair of negatives cancels out, so the answer is positive — the times-table pattern leaves no other choice.',
        ex: { f: [-4, -8] } },
      { label: 'Three negatives', note: 'Two of them pair up and cancel; the third is left over on its own, so the answer is negative again.',
        ex: { f: [-2, -3, -5] } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) { const f = [int(3, 9, r), int(2, 9, r)]; f[r() < 0.5 ? 0 : 1] *= -1; return this.q({ f }); }
        if (lv === 2) return this.q({ f: [nz(3, 12, r), -int(2, 12, r)].sort(() => (r() < 0.5 ? -1 : 1)) });
        const f = [nz(2, 9, r), nz(2, 9, r), nz(2, 6, r)];
        if (f.every((x) => x > 0)) f[int(0, 2, r)] *= -1;
        return this.q({ f });
      });
    },
    q({ f }) {
      const neg = f.filter((x) => x < 0).length, size = f.reduce((a, b) => a * Math.abs(b), 1);
      return { f, neg, text: f.map((x, i) => (i ? B(x) : N(x))).join(' × '), expr: f.map((x) => `(${x})`).join('*'), ans: (neg % 2 ? -1 : 1) * size };
    },
    work({ f }) {
      const neg = f.filter((x) => x < 0).length, size = f.reduce((a, b) => a * Math.abs(b), 1);
      return [{ t: `Ignore the signs: ${f.map(Math.abs).join(' × ')}`, v: size }, { t: 'How many of the numbers are negative?', v: neg },
        { t: 'Each pair of negatives makes a positive. So the answer is', v: (neg % 2 ? -1 : 1) * size }];
    },
    draw: ({ f }) => pattern(f.at(-1)),
  },
  {
    id: 'divide-signs', world: 'mine', band: '11-14', title: 'Dividing negatives', keys: ['−'],
    hook: '−42 ÷ (−6). Positive or negative — and how would you know?',
    idea: 'Divide the sizes, then use the same sign rule as multiplying: same signs positive, different signs negative.',
    why: [
      'Division undoes multiplication. −42 ÷ (−6) asks: what times −6 makes −42? Try 7: 7 × (−6) = −42. So the answer is 7, a positive number, even though both numbers in the question were negative.',
      'That is why division follows exactly the same sign rule as multiplication — every division is a multiplication read backwards. Same signs give a positive answer; different signs give a negative one.',
      'Real life does this too. A freezer that cools by 24 degrees in 4 hours changes by −24 ÷ 4 = −6 degrees each hour: a negative change shared out stays negative. The size of the answer never depends on the signs; only the side of zero does.',
    ],
    alg: '(−a) ÷ b = −(a ÷ b) ; (−a) ÷ (−b) = a ÷ b',
    ex: { b: -6, c: 7 },
    caseKey: 'signs',
    cases: [
      { label: 'Negative ÷ positive', note: 'A negative shared out stays negative: different signs give a negative answer.',
        ex: { b: 6, c: -7 } },
      { label: 'Positive ÷ negative', note: 'Different signs again, just the other way round — still a negative answer. Check: what times −6 makes 42?',
        ex: { b: -6, c: -7 } },
      { label: 'Negative ÷ negative', note: 'Same signs, so the answer is positive — because a positive number times −6 is what makes −42.',
        ex: { b: -6, c: 7 } },
      { label: 'Positive ÷ positive', note: 'Same signs, positive answer: the ordinary division you already know. The rule just agrees with it.',
        ex: { b: 6, c: 7 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) { const b = int(2, 9, r), c = int(3, 9, r); return pick([() => this.q({ b: -b, c }), () => this.q({ b, c: -c }), () => this.q({ b: -b, c: -c })], r)(); }
        const R = lv === 2 ? 12 : 15;
        return this.q({ b: nz(2, 12, r), c: nz(3, R, r) });
      });
    },
    q({ b, c }) {
      const a = b * c;
      return { b, c, signs: `${a < 0 ? '−' : '+'}÷${b < 0 ? '−' : '+'}`, text: `${N(a)} ÷ ${B(b)}`, expr: `(${a})/(${b})`, ans: sgn(a) * sgn(b) * (Math.abs(a) / Math.abs(b)) };
    },
    work({ b, c }) {
      const a = b * c, same = sgn(a) === sgn(b);
      return [{ t: `Ignore the signs: ${Math.abs(a)} ÷ ${Math.abs(b)}`, v: Math.abs(c) },
        { t: `The signs are ${same ? 'the same' : 'different'}. So the answer is`, v: (same ? 1 : -1) * Math.abs(c) }];
    },
    draw: ({ b, c }) => line([b * c], { [b * c]: 'start', 0: '0' }),
  },
  {
    id: 'negative-squares', world: 'mine', band: '11-14', title: 'Squares and brackets', keys: ['−'],
    hook: '(−3)² and −3². Are they the same number?',
    idea: 'Powers come before the minus sign in front — unless brackets put the minus inside the square.',
    why: [
      '(−3)² means (−3) × (−3): the bracket says square the whole thing, minus and all. Two negatives multiplied make a positive, so (−3)² = 9. Any number squared, below zero or above, is never negative.',
      'But −3² has no brackets, and powers come before everything except brackets. So you square the 3 first, which is 9, and only then apply the minus: −3² = −9. It means “the negative of 3²”. Many calculators read it exactly this way.',
      'The same order runs whole sums: powers, then × and ÷, then + and −. In 10 − 4 × (−3), multiply first: 4 × (−3) = −12. Then 10 − (−12) is 10 + 12 = 22. Take each step on its own and the signs look after themselves.',
    ],
    alg: '(−a)² = a² ; −a² = −(a²) ; c − d × (−e) = c + de',
    ex: { kind: 'sq', a: 3 },
    caseKey: 'kind',
    cases: [
      { label: 'Square in brackets', note: 'The bracket puts the minus inside the square, so it is multiplied by itself too — and two negatives make a positive.',
        ex: { kind: 'sq', a: 3 } },
      { label: 'Minus, no brackets', note: 'No brackets, so the power goes first and the minus waits: square the number, then make it negative.',
        ex: { kind: 'negsq', a: 3 } },
      { label: 'Square, then take away', note: 'Powers come before take-away: square the bracket first, then subtract.',
        ex: { kind: 'sqsub', a: 4, b: 5 } },
      { label: 'Times a negative', note: 'Multiply before you take away. Then taking away a negative is the same as adding.',
        ex: { kind: 'mulneg', a: 3, b: 10, c: 4 } },
      { label: 'Minus square plus a product', note: 'Two jobs before the add: the power (square, then the minus) and the multiplication. Only then add.',
        ex: { kind: 'mix', a: 3, b: 5, c: 4 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const kind = lv === 1 ? pick(['sq', 'negsq'], r) : lv === 2 ? pick(['sq', 'negsq', 'sqsub', 'mulneg'], r) : pick(['sqsub', 'mulneg', 'mix'], r);
        return this.q({ kind, a: int(2, lv === 1 ? 9 : 12, r), b: int(2, lv === 3 ? 60 : 30, r), c: int(2, 9, r) });
      });
    },
    q({ kind, a, b = 0, c = 0 }) {
      const base = { kind, a, b, c };
      if (kind === 'sq') return { ...base, text: `(−${a})²`, expr: `Math.pow(-${a},2)`, ans: a * a };
      if (kind === 'negsq') return { ...base, text: `−${a}²`, expr: `-Math.pow(${a},2)`, ans: -(a * a) };
      if (kind === 'sqsub') return { ...base, text: `(−${a})² − ${b}`, expr: `Math.pow(-${a},2)-${b}`, ans: a * a - b };
      if (kind === 'mulneg') return { ...base, text: `${b} − ${c} × (−${a})`, expr: `${b}-${c}*(-${a})`, ans: b + c * a };
      return { ...base, text: `−${a}² + ${c} × ${b}`, expr: `-Math.pow(${a},2)+${c}*${b}`, ans: c * b - a * a };
    },
    work({ kind, a, b, c }) {
      if (kind === 'sq') return [{ t: `(−${a})² is (−${a}) × (−${a}). The sizes: ${a} × ${a}`, v: a * a }, { t: 'Two negatives multiplied make a positive, so', v: a * a }];
      if (kind === 'negsq') return [{ t: `No brackets, so the power goes first: ${a}²`, v: a * a }, { t: 'Then the minus in front', v: -(a * a) }];
      if (kind === 'sqsub') return [{ t: `Powers first: (−${a})²`, v: a * a }, { t: `${a * a} − ${b}`, v: a * a - b }];
      if (kind === 'mulneg') return [{ t: `Multiply first: ${c} × (−${a})`, v: -c * a }, { t: `${b} − (−${c * a}) is ${b} + ${c * a}`, v: b + c * a }];
      return [{ t: `Powers first: −${a}² (square, then the minus)`, v: -(a * a) }, { t: `Then multiply: ${c} × ${b}`, v: c * b }, { t: `${N(-(a * a))} + ${c * b}`, v: c * b - a * a }];
    },
    draw: ({ kind, a, b }) => (kind === 'mulneg' ? line([b, a], { [b]: 'start' }) : line([a], { [-a]: `−${a}`, [a]: String(a) })),
  },
];

/* ================================================================ stories */

